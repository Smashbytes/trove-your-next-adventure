// Guest-facing support: the user's own tickets + the public (non-internal)
// message thread on each. Backed by the shared `support_tickets` / `support_notes`
// tables that HQ agents work from. Guests only ever see their own rows and the
// notes flagged `is_internal = false`.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { toJpeg } from "./image";

export interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  related_booking_id: string | null;
  /** Storage paths in the private support-attachments bucket. */
  attachment_urls: string[];
}

export interface SupportNote {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  created_at: string;
  attachment_urls: string[];
}

export const SUPPORT_CATEGORIES = [
  { value: "booking", label: "Booking" },
  { value: "payment", label: "Payment & refunds" },
  { value: "account", label: "My account" },
  { value: "technical", label: "Something's broken" },
  { value: "other", label: "Other" },
] as const;

const TICKET_FIELDS =
  "id, ticket_number, title, description, category, status, priority, created_at, updated_at, related_booking_id, attachment_urls";

export const supportKeys = {
  all: ["support"] as const,
  tickets: (uid?: string) => ["support", "tickets", uid] as const,
  notes: (id?: string) => ["support", "notes", id] as const,
};

/** The signed-in user's tickets, newest activity first. */
export function useMyTickets() {
  const { user } = useAuth();
  return useQuery<SupportTicket[]>({
    queryKey: supportKeys.tickets(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(TICKET_FIELDS)
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Public conversation on a ticket (internal agent notes are filtered out). */
export function useTicketNotes(ticketId: string | undefined) {
  return useQuery<SupportNote[]>({
    queryKey: supportKeys.notes(ticketId),
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_notes")
        .select("id, ticket_id, author_id, content, created_at, attachment_urls")
        .eq("ticket_id", ticketId!)
        .eq("is_internal", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Attachments (D-048): guests attach up to 5 images to a request or a reply.
// The database refuses a 6th and any path outside the sender's own folder.
// ---------------------------------------------------------------------------

export const MAX_ATTACHMENTS = 5;
const BUCKET = "support-attachments";

const ATTACHMENT_ERRORS: Record<string, string> = {
  TOO_MANY_ATTACHMENTS: `Attach up to ${MAX_ATTACHMENTS} photos.`,
  ATTACHMENT_NOT_YOURS: "One of those photos couldn't be attached. Please add it again.",
};

function supportError(error: { message?: string }): Error {
  const code = Object.keys(ATTACHMENT_ERRORS).find((k) => (error.message ?? "").includes(k));
  return new Error(code ? ATTACHMENT_ERRORS[code] : (error.message ?? "Something went wrong"));
}

/**
 * Upload photos into the guest's own folder and return their storage paths.
 * Each is re-encoded as a JPEG (longest side 2000px) so an iPhone HEIC opens
 * for the support team and stays well under the bucket's 10 MB.
 */
async function uploadImages(userId: string, scope: string, files: File[]): Promise<string[]> {
  if (files.length > MAX_ATTACHMENTS) throw new Error(ATTACHMENT_ERRORS.TOO_MANY_ATTACHMENTS);
  // Convert all first, so an unreadable file doesn't leave the others uploaded.
  const jpegs = await Promise.all(files.map((f) => toJpeg(f, 2000)));
  const paths: string[] = [];
  try {
    for (const jpeg of jpegs) {
      const path = `${userId}/${scope}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, jpeg, { contentType: "image/jpeg" });
      if (error) throw error;
      paths.push(path);
    }
  } catch (e) {
    await removeUploads(paths);
    throw e;
  }
  return paths;
}

async function removeUploads(paths: string[]) {
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
}

/** Short-lived links to view attachments (the bucket is private). */
export function useAttachmentLinks(paths: string[]) {
  return useQuery<Record<string, string>>({
    queryKey: ["support", "attachments", paths],
    enabled: paths.length > 0,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      if (error) throw error;
      const out: Record<string, string> = {};
      for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
      return out;
    },
  });
}

export interface NewTicketInput {
  title: string;
  description: string;
  category: string;
  relatedBookingId?: string | null;
  files?: File[];
}

export function useCreateTicket() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<SupportTicket, Error, NewTicketInput>({
    mutationFn: async (input) => {
      if (!user) throw new Error("Sign in to contact support.");
      const paths = await uploadImages(user.id, "new", input.files ?? []);
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          created_by: user.id,
          title: input.title.trim(),
          description: input.description.trim() || null,
          category: input.category,
          // status, priority and the ticket number are set by the server
          // (trove_support_ticket_guard, GST-L02-06).
          related_booking_id: input.relatedBookingId ?? null,
          attachment_urls: paths,
        })
        .select(TICKET_FIELDS)
        .single();
      if (error) {
        await removeUploads(paths);
        throw supportError(error);
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.all }),
  });
}

/** Post a reply onto a ticket as a public (guest-visible) note. */
export function useAddTicketNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, { ticketId: string; content: string; files?: File[] }>({
    mutationFn: async ({ ticketId, content, files = [] }) => {
      if (!user) throw new Error("Not authenticated");
      const paths = await uploadImages(user.id, ticketId, files);
      const { error } = await supabase.from("support_notes").insert({
        ticket_id: ticketId,
        author_id: user.id,
        content: content.trim(),
        is_internal: false,
        attachment_urls: paths,
      });
      if (error) {
        await removeUploads(paths);
        throw supportError(error);
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: supportKeys.notes(vars.ticketId) });
      qc.invalidateQueries({ queryKey: ["support", "tickets"] });
    },
  });
}
