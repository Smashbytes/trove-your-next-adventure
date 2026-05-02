import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';

type View = 'signin' | 'signup' | 'forgot';

export function AuthModal({ open, onClose }: { open: boolean; onClose?: () => void }) {
  const { signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [view, setView] = useState<View>('signin');
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  function handleTabChange(v: 'signin' | 'signup') {
    setTab(v);
    setView(v);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await signInWithEmail(email, password);
    setBusy(false);
    if (error) toast.error(error);
    else { toast.success('Welcome back!'); onClose?.(); }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await signUpWithEmail(email, password, fullName);
    setBusy(false);
    if (error) toast.error(error);
    else toast.success('Check your email to confirm your account.');
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await resetPassword(email);
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success('Password reset email sent — check your inbox.');
      setView('signin');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {view === 'signin' ? 'Welcome back' : view === 'signup' ? 'Join TROVE' : 'Reset password'}
          </DialogTitle>
        </DialogHeader>

        {view === 'forgot' ? (
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="fp-email">Email</Label>
                <Input id="fp-email" type="email" required value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </Button>
              <button type="button" onClick={() => setView('signin')}
                className="text-xs text-muted-foreground underline w-full text-center">
                Back to sign in
              </button>
            </form>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => handleTabChange(v as 'signin' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3 pt-3">
                <div className="space-y-1">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" required value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
                </div>
                <div className="space-y-1">
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
                  {busy ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3 pt-3">
                <div className="space-y-1">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" required value={fullName}
                    onChange={e => setFullName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" type="password" required minLength={8} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Creating account…' : 'Create account'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  By signing up you agree to TROVE's Terms and Privacy Policy.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
