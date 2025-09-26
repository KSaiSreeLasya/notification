import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { signUpWithPassword, getCurrentSession } from "@/lib/supabase";
import { upsertProfile } from "@/services/profiles";
import { toast as sonnerToast } from "sonner";

export default function SignUpDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Sign up</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="signup-username">Username (optional)</Label>
            <Input id="signup-username" value={username} onChange={(e)=>setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input id="signup-email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input id="signup-password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button
              disabled={!email || !password || loading}
              onClick={async ()=>{
                try{
                  setLoading(true);
                  const res = await signUpWithPassword(email,password);
                  toast({ title: "Account created" });
                  sonnerToast.success(`Account created for ${email}`);
                  const s = await getCurrentSession();
                  const uid = s?.user.id;
                  if(uid){
                    if(username){ try{ await upsertProfile(uid, username);}catch{} }
                  } else {
                    // Likely email confirmation required; save username to apply after first sign-in
                    if (username) localStorage.setItem(`pending_profile_${email.toLowerCase()}`, username);
                    sonnerToast.message("Please verify the email if required, then sign in.");
                  }
                  setOpen(false);
                }catch(e:any){
                  toast({ title: "Sign-up failed", description: e.message, variant: "destructive" });
                  sonnerToast.error(`Sign-up failed: ${e.message}`);
                }finally{
                  setLoading(false);
                }
              }}
            >
              Create account
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
