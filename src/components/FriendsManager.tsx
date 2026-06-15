import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Check, X } from "lucide-react";
import {
  useFriends,
  useAddFriend,
  useRespondFriend,
  useRemoveFriend,
} from "@/lib/friends-api";

/** Self-contained friends list + lookup. Drop in anywhere (Profile, Settings). */
export function FriendsManager({ heading = true }: { heading?: boolean }) {
  const { data: friends = [] } = useFriends();
  const addFriend = useAddFriend();
  const respond = useRespondFriend();
  const remove = useRemoveFriend();
  const [email, setEmail] = useState("");

  const accepted = friends.filter((f) => f.status === "accepted");
  const incoming = friends.filter((f) => f.status === "pending" && !f.requestedByMe);
  const outgoing = friends.filter((f) => f.status === "pending" && f.requestedByMe);

  async function add() {
    const value = email.trim();
    if (!value) return;
    try {
      const { name } = await addFriend.mutateAsync(value);
      toast.success(`Friend request sent to ${name}.`);
      setEmail("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send request.");
    }
  }

  return (
    <section className="space-y-4">
      {heading && (
        <h2 className="font-display text-lg inline-flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" /> Friends
        </h2>
      )}

      {/* Add / look up by email */}
      <div className="flex items-stretch gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          type="email"
          placeholder="Add a friend by email"
          className="flex-1 rounded-full bg-surface-elevated px-4 py-2.5 text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
        />
        <button
          onClick={add}
          disabled={addFriend.isPending}
          className="rounded-full bg-gradient-brand px-5 text-sm font-semibold text-primary-foreground shadow-glow-soft disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Requests</p>
          {incoming.map((f) => (
            <div key={f.friendId} className="flex items-center gap-3 rounded-2xl bg-surface-elevated p-2.5">
              <Avatar name={f.name} url={f.avatarUrl} />
              <p className="flex-1 truncate text-sm font-medium">{f.name}</p>
              <button
                onClick={() => respond.mutate({ friendId: f.friendId, accept: true })}
                className="grid h-8 w-8 place-items-center rounded-full bg-success/20 text-success"
                aria-label="Accept"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => respond.mutate({ friendId: f.friendId, accept: false })}
                className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted-foreground"
                aria-label="Decline"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Accepted friends */}
      {accepted.length > 0 ? (
        <div className="space-y-2">
          {accepted.map((f) => (
            <div key={f.friendId} className="flex items-center gap-3 rounded-2xl bg-surface-elevated p-2.5">
              <Avatar name={f.name} url={f.avatarUrl} />
              <p className="flex-1 truncate text-sm font-medium">{f.name}</p>
              <button
                onClick={() => remove.mutate(f.friendId)}
                className="text-[11px] text-muted-foreground transition hover:text-destructive"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        incoming.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No friends yet — add a few by email to see who's going out.
          </p>
        )
      )}

      {/* Outgoing (pending) */}
      {outgoing.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending</p>
          {outgoing.map((f) => (
            <div key={f.friendId} className="flex items-center gap-3 rounded-2xl bg-surface-elevated/60 p-2.5">
              <Avatar name={f.name} url={f.avatarUrl} />
              <p className="flex-1 truncate text-sm font-medium text-muted-foreground">{f.name}</p>
              <span className="text-[11px] text-muted-foreground">Requested</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-brand text-sm font-display text-primary-foreground">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </div>
  );
}
