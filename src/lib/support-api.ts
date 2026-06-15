// Guest-facing support: the user's own tickets + the public (non-internal)
// message thread on each. Backed by the shared `support_tickets` / `support_notes`
// tables that HQ agents work from. Guests only ever see their own rows and the
// notes flagged `is_internal = false`.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

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
}

export interface SupportNote {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export const SUPPORT_CATEGORIES = [
  { value: "booking", label: "Booking" },
  { value: "payment", label: "Payment & refunds" },
  { value: "account", label: "My account" },
  { value: "technical", label: "Something's broken" },
  { value: "other", label: "Other" },
] as const;

const TICKET_FIELDS =
  "id, ticket_number, title, description, category, status, priority, created_at, updated_at, related_booking_id";

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
      return (data ?? []) as SupportTicket[];
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
        .select("id, ticket_id, author_id, content, created_at")
        .eq("ticket_id", ticketId!)
        .eq("is_internal", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SupportNote[];
    },
  });
}

export interface NewTicketInput {
  title: string;
  description: string;
  category: string;
  relatedBookingId?: string | null;
}

export function useCreateTicket() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<SupportTicket, Error, NewTicketInput>({
    mutationFn: async (input) => {
      if (!user) throw new Error("Sign in to contact support.");
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          created_by: user.id,
          title: input.title.trim(),
          description: input.description.trim() || null,
          category: input.category,
          status: "open",
          priority: "normal",
          related_booking_id: input.relatedBookingId ?? null,
        })
        .select(TICKET_FIELDS)
        .single();
      if (error) throw error;
      return data as SupportTicket;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.all }),
  });
}

/** Post a reply onto a ticket as a public (guest-visible) note. */
export function useAddTicketNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, { ticketId: string; content: string }>({
    mutationFn: async ({ ticketId, content }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("support_notes").insert({
        ticket_id: ticketId,
        author_id: user.id,
        content: content.trim(),
        is_internal: false,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: supportKeys.notes(vars.ticketId) });
      qc.invalidateQueries({ queryKey: ["support", "tickets"] });
    },
  });
}
