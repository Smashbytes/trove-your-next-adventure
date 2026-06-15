import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, LifeBuoy, Send, MessageSquare } from "lucide-react";
import { ResponsiveShell } from "@/components/desktop/ResponsiveShell";
import { useAuth } from "@/lib/auth";
import {
  useMyTickets,
  useTicketNotes,
  useCreateTicket,
  useAddTicketNote,
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

  async function submit() {
    if (title.trim().length < 4) {
      toast.error("Give your request a short subject.");
      return;
    }
    try {
      const t = await create.mutateAsync({ title, description, category });
      toast.success("Request sent — we'll be in touch.");
      onCreated(t);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send your request.");
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

  async function send() {
    const value = reply.trim();
    if (!value) return;
    setReply("");
    try {
      await addNote.mutateAsync({ ticketId: ticket.id, content: value });
    } catch {
      toast.error("Couldn't send your message.");
      setReply(value);
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
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      TROVE Support
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{n.content}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply box */}
        <div className="flex items-center gap-2 border-t border-border/50 p-3">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Write a reply…"
            className="flex-1 rounded-full bg-surface-elevated px-4 py-2.5 text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
          />
          <button
            onClick={send}
            disabled={addNote.isPending || !reply.trim()}
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
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${t.cls}`}>
      {t.label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const t = statusTone(status);
  return <span className={`h-2 w-2 shrink-0 rounded-full ${t.dot}`} />;
}
