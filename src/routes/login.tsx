import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Listingen" }, { name: "description", content: "Sign in or create a Listingen account." }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function goAfterAuth() {
    const returnTo = new URLSearchParams(window.location.search).get("redirect");
    if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      window.location.assign(returnTo);
      return;
    }
    await navigate({ to: "/studio" });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
        if (resetError) throw resetError;
        setMessage("If an account exists for this email, a password reset link has been sent.");
      } else if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password, options: { data: { display_name: name.trim() } },
        });
        if (signUpError) throw signUpError;
        if (data.user && data.session) {
          await supabase.from("profiles").upsert({ id: data.user.id, display_name: name.trim() || email.split("@")[0] });
          await navigate({ to: "/studio" });
        } else {
          setMessage("Your account has been created. Check your email to confirm your address, then sign in.");
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (data.user) {
          await supabase.from("profiles").upsert({ id: data.user.id, display_name: data.user.user_metadata?.display_name || email.split("@")[0] });
          await navigate({ to: "/studio" });
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <section className="w-full max-w-md">
        <Link to="/" className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-primary">Listingen</Link>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{mode === "signup" ? "Join the marketplace" : mode === "reset" ? "Account recovery" : "Welcome back"}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{mode === "signup" ? "Create your account" : mode === "reset" ? "Reset password" : "Sign in to Listingen"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{mode === "signup" ? "Create, publish and sell your own prompt products." : mode === "reset" ? "We'll send a secure password reset link if your account exists." : "Continue creating and managing your digital products."}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && <label className="block text-sm font-medium">Display name<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5" autoComplete="name" /></label>}
            <label className="block text-sm font-medium">Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5" /></label>
            {mode !== "reset" && <label className="block text-sm font-medium">Password<input required minLength={8} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5" /><span className="mt-1 block text-xs text-muted-foreground">Use at least 8 characters.</span></label>}
            {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
            {message && <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{message}</p>}
            <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}</button>
          </form>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            {mode === "signin" ? <><button onClick={()=>{setMode("signup");setError("");setMessage("");}} className="text-primary underline">Create an account</button><button onClick={()=>{setMode("reset");setError("");setMessage("");}} className="text-muted-foreground underline">Forgot password?</button></> : <button onClick={()=>{setMode("signin");setError("");setMessage("");}} className="text-primary underline">Back to sign in</button>}
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">By continuing, you agree to use Listingen responsibly and only publish content you have the right to sell.</p>
      </section>
    </main>
  );
}
