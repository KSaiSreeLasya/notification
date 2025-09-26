import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signInWithPassword, getCurrentSession } from "@/lib/supabase";
import { upsertProfile } from "@/services/profiles";
import { toast as sonnerToast } from "sonner";

export default function SignInDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Sign in</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              disabled={!email || !password || loading}
              onClick={async () => {
                try {
                  setLoading(true);
                  await signInWithPassword(email, password);
                  toast({ title: "Signed in" });
                  sonnerToast.success(`Welcome ${email}`);
                  const s = await getCurrentSession();
                  const uid = s?.user.id;
                  const pendingKey = `pending_profile_${email.toLowerCase()}`;
                  const pendingUsername = localStorage.getItem(pendingKey);
                  if (uid && pendingUsername) {
                    try {
                      await upsertProfile(uid, pendingUsername);
                    } catch {}
                    localStorage.removeItem(pendingKey);
                  }
                  setOpen(false);
                } catch (e: any) {
                  toast({
                    title: "Sign-in failed",
                    description: e.message,
                    variant: "destructive",
                  });
                  sonnerToast.error(`Sign-in failed: ${e.message}`);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Sign in
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
