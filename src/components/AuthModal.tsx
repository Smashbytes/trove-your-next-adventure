import { useState } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

type View = 'signin' | 'forgot' | 'sent';

export function AuthModal({ open, onClose }: { open: boolean; onClose?: () => void }) {
  const { signInWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [view, setView] = useState<View>('signin');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchView(next: View) {
    setError(null);
    setView(next);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await signInWithEmail(email.trim(), password);
      if (error) {
        setError(friendlyError(error, "We couldn't sign you in. Try again."));
        return;
      }
      toast.success('Welcome back!');
      onClose?.();
      // Land returning users on the home feed — never strand them on the page
      // the modal happened to open over (e.g. profile or onboarding). Checkout,
      // spot and split pages are the exceptions: stay so the booking can continue.
      if (!/^\/(checkout|spot|split)\//.test(pathname)) {
        navigate({ to: '/' });
      }
    } catch (err) {
      setError(friendlyError(err, "We couldn't sign you in. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await resetPassword(email.trim());
      if (error) setError(friendlyError(error, "We couldn't send the reset link. Try again."));
      else setView('sent');
    } catch (err) {
      setError(friendlyError(err, "We couldn't send the reset link. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const errorBox = error && (
    <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose?.();
          switchView('signin');
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center gap-1 pb-1">
          <Logo size={28} />
          <DialogTitle className="font-display text-2xl">
            {view === 'signin' ? 'Welcome back' : view === 'forgot' ? 'Reset password' : 'Check your inbox'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {view === 'signin'
              ? 'Log in to book and see your tickets.'
              : view === 'forgot'
                ? "Enter your email and we'll send you a reset link."
                : `If there's a TROVE account for ${email.trim()}, a reset link is on its way. It works once.`}
          </DialogDescription>
        </DialogHeader>

        {view === 'sent' ? (
          <Button type="button" className="w-full" onClick={() => switchView('signin')}>
            Back to sign in
          </Button>
        ) : view === 'forgot' ? (
          <form onSubmit={handleResetPassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">Email</Label>
              <Input id="fp-email" type="email" required autoComplete="email" value={email}
                aria-invalid={!!error || undefined}
                onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
            </div>
            {errorBox}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
            <button type="button" onClick={() => switchView('signin')}
              className="block w-full py-2 text-center text-sm text-muted-foreground underline">
              Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="si-email">Email</Label>
              <Input id="si-email" type="email" required autoComplete="email" value={email}
                aria-invalid={!!error || undefined}
                onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="si-pw">Password</Label>
                <button type="button" onClick={() => switchView('forgot')}
                  className="py-1 text-sm text-muted-foreground underline hover:text-foreground">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input id="si-pw" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} aria-invalid={!!error || undefined} className="pr-11"
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw}
                  className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-muted-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {errorBox}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-background px-2 text-muted-foreground">New to TROVE?</span>
              </div>
            </div>

            <Link
              to="/onboarding"
              onClick={() => onClose?.()}
              className="flex items-center justify-center w-full rounded-full bg-gradient-brand py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Create your account
            </Link>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
