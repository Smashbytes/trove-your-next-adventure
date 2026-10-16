// Turn raw Supabase / Postgres / network / edge-function errors into copy a
// guest can act on. The original error is still logged for debugging.

const RULES: Array<[RegExp, string]> = [
  [/failed to fetch|networkerror|network request failed|load failed|failed to send a request/i,
    "We couldn't reach TROVE. Check your connection and try again."],
  [/invalid login credentials/i, "That email and password don't match. Try again or reset your password."],
  [/email not confirmed/i, "Confirm your email first. Check your inbox for your 6-digit code."],
  [/user already registered|already been registered/i,
    "There's already a TROVE account with this email. Log in instead."],
  [/token has expired|otp.*(expired|invalid)|invalid.*otp/i, "That code is wrong or has expired. Send a new one."],
  [/password should be|weak password|password.*(at least|characters)/i,
    "Choose a stronger password: at least 8 characters."],
  [/same.*password|new password should be different/i, "Choose a password you haven't used before."],
  [/jwt expired|invalid jwt|refresh token|session.*(expired|missing)|auth session missing/i,
    "Your session has expired. Sign in again to continue."],
  [/row-level security|permission denied|not authori[sz]ed/i, "You don't have permission to do that."],
  [/duplicate key|already exists|unique constraint/i, "That's already taken. Try something different."],
  [/violates check constraint|invalid input syntax|out of range/i,
    "Some of the details aren't valid. Check them and try again."],
  [/rate limit|too many requests|over_email_send_rate_limit|security purposes/i,
    "Too many attempts. Wait a minute and try again."],
];

// Messages that read like database/driver internals rather than sentences
// written for a person. Anything else (e.g. an edge function's own "This
// event is sold out") is shown as-is.
const TECHNICAL =
  /relation|column|constraint|syntax|function |PGRST|null value|schema|uuid|operator|duplicate|violates|undefined|TypeError|JSON|status code|fetch|non-2xx|edge function/i;
// Postgres SQLSTATE codes such as 23505, 42501, P0001 (case-sensitive).
const SQLSTATE = /\b(?:[0-9]{2}[0-9A-Z]{3}|P0[0-9]{3})\b/;

export function friendlyError(error: unknown, fallback: string): string {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : "";
  if (error) console.error("[trove]", fallback, error);
  for (const [pattern, copy] of RULES) {
    if (pattern.test(message)) return copy;
  }
  if (message && message.length <= 160 && !TECHNICAL.test(message) && !SQLSTATE.test(message)) {
    return message;
  }
  return fallback;
}
