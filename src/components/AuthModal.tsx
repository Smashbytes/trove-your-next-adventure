import { useState } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth';

type View = 'signin' | 'forgot';

export function AuthModal({ open, onClose }: { open: boolean; onClose?: () => void }) {
  const { signInWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [view, setView] = useState<View>('signin');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await signInWithEmail(email, password);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Welcome back!');
    onClose?.();
    // Land returning users on the home feed — never strand them on the page
    // the modal happened to open over (e.g. profile). Checkout is the one
    // exception: stay so the in-progress booking can complete.
    if (!pathname.startsWith('/checkout')) {
      navigate({ to: '/' });
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await resetPassword(email);
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success('Password reset link sent. Check your inbox.');
      setView('signin');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center gap-1 pb-1">
          <Logo size={28} />
          <DialogTitle className="font-display text-2xl">
            {view === 'signin' ? 'Welcome back' : 'Reset password'}
          </DialogTitle>
        </DialogHeader>

        {view === 'forgot' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fp-email">Email</Label>
                <Input id="fp-email" type="email" required value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Sending...' : 'Send reset link'}
              </Button>
              <button type="button" onClick={() => setView('signin')}
                className="text-xs text-muted-foreground underline w-full text-center">
                Back to sign in
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="si-email">Email</Label>
              <Input id="si-email" type="email" required value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="si-pw">Password</Label>
                <button type="button" onClick={() => setView('forgot')}
                  className="text-xs text-muted-foreground hover:text-foreground underline">
                  Forgot password?
                </button>
              </div>
              <Input id="si-pw" type="password" required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Signing in...' : 'Sign in'}
            </Button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
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
