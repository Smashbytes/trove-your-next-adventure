import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { ArrowLeft, Plus, LifeBuoy, Send, MessageSquare, ImagePlus, X } from "lucide-react";
import { ResponsiveShell } from "@/components/desktop/ResponsiveShell";
import { useAuth } from "@/lib/auth";
import {
  useMyTickets,
  useTicketNotes,
  useCreateTicket,
  useAddTicketNote,
  useAttachmentLinks,
  MAX_ATTACHMENTS,
  SUPPORT_CATEGORIES,
  type SupportTicket,
} from "@/lib/support-api";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — TROVE" }] }),
  component: SupportPage,
});

function SupportPage() {
  const { isAuthenticated, openAuthModal } = useAuth();

  if (!isAuthenticated) {
    return (
      <ResponsiveShell title="Support">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface ring-1 ring-border">
            <LifeBuoy className="h-6 w-6 text-primary" />
          </div>
          <p className="max-w-[260px] text-sm text-muted-foreground">
            Sign in to contact the TROVE team and track your support requests.
          </p>
          <button
            onClick={openAuthModal}
            className="rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Sign in
          </button>
        </div>
      </ResponsiveShell>
    );
  }

  return <SupportInner />;
}

function SupportInner() {
  const { data: tickets = [], isLoading } = useMyTickets();
  const [view, setView] = useState<"list" | "new">("list");
  const [openId, setOpenId] = useState<string | null>(null);

  const openTicket = tickets.find((t) => t.id === openId) ?? null;

  if (openTicket) {
    return <TicketThread ticket={openTicket} onBack={() => setOpenId(null)} />;
  }

  if (view === "new") {
    return (
      <NewTicket
        onCancel={() => setView("list")}
        onCreated={(t) => {
          setView("list");
          setOpenId(t.id);
        }}
      />
    );
  }

  return (
    <ResponsiveShell
      title="Support"
      action={
        <button
          onClick={() => setView("new")}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow-soft"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface ring-1 ring-border">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold">No requests yet</p>
          <p className="max-w-[260px] text-xs text-muted-foreground">
            Need a hand with a booking, payment or your account? Start a conversation with us.
          </p>
          <button
            onClick={() => setView("new")}
            className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" /> New request
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setOpenId(t.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left ring-1 ring-border transition hover:ring-primary/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusDot status={t.status} />
                    <p className="truncate text-sm font-semibold">{t.title}</p>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    #{t.ticket_number} · {labelFor(t.category)} ·{" "}
                    {new Date(t.updated_at).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </ResponsiveShell>
  );
}

function NewTicket({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (t: SupportTicket) => void;
}) {
  const create = useCreateTicket();
  const [category, setCategory] = useState<string>(SUPPORT_CATEGORIES[0].value);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  async function submit() {
    if (title.trim().length < 4) {
      toast.error("Give your request a short subject.");
      return;
    }
    try {
      const t = await create.mutateAsync({ title, description, category, files });
      toast.success("Request sent — we'll be in touch.");
      onCreated(t);
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't send your request."));
    }
  }

  return (
    <ResponsiveShell title="New request">
      <button
        onClick={onCancel}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground lg:hidden"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="space-y-5 rounded-3xl bg-surface p-5 ring-1 ring-border">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What's it about?
          </label>
          <div className="flex flex-wrap gap-2">
            {SUPPORT_CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  category === c.value
                    ? "bg-gradient-brand text-primary-foreground shadow-glow-soft"
                    : "bg-surface-elevated text-muted-foreground ring-1 ring-border"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Subject
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. I was charged twice for my ticket"
            className="w-full rounded-2xl bg-surface-elevated px-4 py-3 text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Details
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Tell us what happened, with any booking reference if you have it."
            className="w-full resize-none rounded-2xl bg-surface-elevated px-4 py-3 text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Photos <span className="normal-case tracking-normal">(optional, up to {MAX_ATTACHMENTS})</span>
          </label>
          <PhotoPicker files={files} onChange={setFiles} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full bg-surface-elevated py-3 text-sm font-semibold text-muted-foreground ring-1 ring-border"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={create.isPending}
            className="flex-1 rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {create.isPending ? "Sending…" : "Send request"}
          </button>
        </div>
      </div>
    </ResponsiveShell>
  );
}

function TicketThread({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
  const { user } = useAuth();
  const { data: notes = [], isLoading } = useTicketNotes(ticket.id);
  const addNote = useAddTicketNote();
  const [reply, setReply] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  async function send() {
    const value = reply.trim();
    if (!value && files.length === 0) return;
    const sent = files;
    setReply("");
    setFiles([]);
    try {
      // A reply needs some text; a photo-only reply says what it is.
      const content = value || `Sent ${sent.length} photo${sent.length === 1 ? "" : "s"}`;
      await addNote.mutateAsync({ ticketId: ticket.id, content, files: sent });
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't send your message."));
      setReply(value);
      setFiles(sent);
    }
  }

  return (
    <ResponsiveShell title={`#${ticket.ticket_number}`}>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All requests
      </button>

      <div className="rounded-3xl bg-surface ring-1 ring-border">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/50 p-5">
          <div className="min-w-0">
            <h2 className="font-display text-lg leading-tight">{ticket.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{labelFor(ticket.category)}</p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        {/* Original message */}
        {ticket.description && (
          <div className="border-b border-border/50 p-5">
            <p className="whitespace-pre-wrap text-sm text-foreground/90">{ticket.description}</p>
          </div>
        )}
        {ticket.attachment_urls.length > 0 && (
          <div className="border-b border-border/50 p-5">
            <Attachments paths={ticket.attachment_urls} />
          </div>
        )}

        {/* Thread */}
        <div className="space-y-3 p-5">
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!isLoading && notes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Our team will reply here. You'll get a notification when they do.
            </p>
          )}
          {notes.map((n) => {
            const mine = n.author_id === user?.id;
            return (
              <div key={n.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? "bg-gradient-brand text-primary-foreground"
                      : "bg-surface-elevated text-foreground ring-1 ring-border"
                  }`}
                >
                  {!mine && (
                    <p className="mb-0.5 text-2xs font-semibold uppercase tracking-wide text-primary">
                      TROVE Support
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{n.content}</p>
                  {n.attachment_urls.length > 0 && (
                    <div className="mt-2">
                      <Attachments paths={n.attachment_urls} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply box */}
        {files.length > 0 && (
          <div className="border-t border-border/50 px-3 pt-3">
            <PhotoPicker files={files} onChange={setFiles} compact />
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-border/50 p-3">
          <PhotoButton files={files} onChange={setFiles} />
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Write a reply…"
            className="flex-1 rounded-full bg-surface-elevated px-4 py-2.5 text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
          />
          <button
            onClick={send}
            disabled={addNote.isPending || (!reply.trim() && files.length === 0)}
            aria-label="Send"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-soft disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </ResponsiveShell>
  );
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";

/** Adds picked images to `files`, keeping at most MAX_ATTACHMENTS. */
function usePhotoInput(files: File[], onChange: (f: File[]) => void) {
  const ref = useRef<HTMLInputElement>(null);
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    const images = picked.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (images.length < picked.length) toast.error("Only photos can be attached.");
    const next = [...files, ...images];
    if (next.length > MAX_ATTACHMENTS) toast.error(`Attach up to ${MAX_ATTACHMENTS} photos.`);
    onChange(next.slice(0, MAX_ATTACHMENTS));
  }
  const input = (
    <input ref={ref} type="file" accept={PHOTO_ACCEPT} multiple onChange={onPick} className="hidden" />
  );
  return { input, open: () => ref.current?.click(), full: files.length >= MAX_ATTACHMENTS };
}

function PhotoButton({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const { input, open, full } = usePhotoInput(files, onChange);
  return (
    <>
      {input}
      <button
        type="button"
        onClick={open}
        disabled={full}
        aria-label={`Add photos (up to ${MAX_ATTACHMENTS})`}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-elevated text-muted-foreground ring-1 ring-border transition hover:text-foreground disabled:opacity-40"
      >
        <ImagePlus className="h-4 w-4" />
      </button>
    </>
  );
}

/** Thumbnails of picked photos, each removable, plus an add tile. */
function PhotoPicker({ files, onChange, compact }: { files: File[]; onChange: (f: File[]) => void; compact?: boolean }) {
  const { input, open, full } = usePhotoInput(files, onChange);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const size = compact ? "h-14 w-14" : "h-20 w-20";
  return (
    <div className="flex flex-wrap gap-2">
      {input}
      {files.map((f, i) => (
        <div key={`${f.name}-${i}`} className={`relative ${size} overflow-hidden rounded-xl bg-surface-elevated ring-1 ring-border`}>
          {/* HEIC won't preview outside Safari: the file name shows through instead. */}
          <span className="absolute inset-0 grid place-items-center break-all p-1 text-center text-2xs text-muted-foreground">{f.name}</span>
          <img
            src={previews[i]}
            alt={f.name}
            className="relative h-full w-full object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <button
            type="button"
            onClick={() => onChange(files.filter((_, j) => j !== i))}
            aria-label={`Remove ${f.name}`}
            className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {!full && !compact && (
        <button
          type="button"
          onClick={open}
          className={`grid ${size} place-items-center rounded-xl border border-dashed border-border bg-surface-elevated text-muted-foreground transition hover:text-foreground`}
          aria-label={`Add photos (up to ${MAX_ATTACHMENTS})`}
        >
          <ImagePlus className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

/** Attached photos on a request or reply, opened full size in a new tab. */
function Attachments({ paths }: { paths: string[] }) {
  const { data: links = {} } = useAttachmentLinks(paths);
  return (
    <div className="flex flex-wrap gap-2">
      {paths.map((p, i) =>
        links[p] ? (
          <a key={p} href={links[p]} target="_blank" rel="noopener noreferrer" className="block h-16 w-16 overflow-hidden rounded-lg ring-1 ring-border">
            <img src={links[p]} alt={`Attachment ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
          </a>
        ) : (
          <div key={p} className="h-16 w-16 animate-pulse rounded-lg bg-surface-elevated" />
        ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bits
// ---------------------------------------------------------------------------

function labelFor(category: string): string {
  return SUPPORT_CATEGORIES.find((c) => c.value === category)?.label ?? "Support";
}

function statusTone(status: string): { label: string; cls: string; dot: string } {
  const s = status.toLowerCase();
  if (s === "resolved" || s === "closed")
    return { label: "Resolved", cls: "bg-success/15 text-success", dot: "bg-success" };
  if (s === "pending" || s === "waiting")
    return { label: "Waiting", cls: "bg-warning/15 text-warning", dot: "bg-warning" };
  return { label: "Open", cls: "bg-primary/15 text-primary", dot: "bg-primary" };
}

function StatusBadge({ status }: { status: string }) {
  const t = statusTone(status);
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-2xs font-semibold ${t.cls}`}>
      {t.label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const t = statusTone(status);
  return <span className={`h-2 w-2 shrink-0 rounded-full ${t.dot}`} />;
}
