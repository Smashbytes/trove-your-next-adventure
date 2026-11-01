// The password rule Supabase enforces (SHR-L04-06): at least 8 characters with
// a letter and a number. Checked here first so guests get the message before
// the request (GST-L04-05); the server's own wording maps to the same copy in
// errors.ts. Same rule as the Engine's src/lib/password.ts.

export const PASSWORD_HINT = "At least 8 characters, with a letter and a number";

/** Null when the password meets the rule, else what to fix. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return "Password needs at least one letter and one number.";
  }
  return null;
}
