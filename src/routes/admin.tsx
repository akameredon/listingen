import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Command Centre · Listingen" }] }),
  component: AdminPage,
});

type QueueItem = {
  id: string; product_id: string; version_id: string; submitted_by: string;
  status: string; submitted_at: string;
  marketplace_products: { title: string; slug: string } | null;
  product_versions: { prompt_content: string; verification_state: string; verification_evidence: unknown } | null;
};

function AdminPage() {
  const navigate=useNavigate();
  const [role,setRole]=useState("");
  const [queue,setQueue]=useState<QueueItem[]>([]);
  const [rules,setRules]=useState<Array<{id:string;name:string;currency:string;platform_fee_bps:number|null;creator_share_bps:number|null;is_active:boolean}>>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({});
  const [verification,setVerification]=useState<Record<string,string>>({});
  const [evidence,setEvidence]=useState<Record<string,string>>({});
  const [ruleName,setRuleName]=useState("");
  const [currency,setCurrency]=useState("USD");
  const [platformPercent,setPlatformPercent]=useState("");
  const [activating,setActivating]=useState(false);

  async function load(){
    setLoading(true);setError("");
    try{
      const {data,error:authError}=await supabase.auth.getUser();
      if(authError||!data.user){await navigate({to:"/login"});return;}
      const currentRole=String(data.user.app_metadata?.role??"");
      setRole(currentRole);
      if(!["admin","reviewer"].includes(currentRole)){setLoading(false);return;}
      const [q,r]=await Promise.all([
        supabase.from("review_submissions").select("id,product_id,version_id,submitted_by,status,submitted_at,marketplace_products(title,slug),product_versions(prompt_content,verification_state,verification_evidence)").in("status",["pending","in_progress"]).order("submitted_at",{ascending:true}),
        supabase.from("commission_rules").select("id,name,currency,platform_fee_bps,creator_share_bps,is_active").order("created_at",{ascending:false})
      ]);
      if(q.error)throw q.error;if(r.error)throw r.error;
      setQueue((q.data??[]) as unknown as QueueItem[]);setRules(r.data??[]);
    }catch(e){setError(e instanceof Error?e.message:"Unable to load admin workspace.");}
    finally{setLoading(false);}
  }

  useEffect(()=>{void load();},[]);

  async function review(item:QueueItem,decision:"approved"|"rejected"|"changes_requested"){
    setError("");setNotice("");
    const notes=reviewNotes[item.id]?.trim()??"";
    if(notes.length<8){setError("Add review notes that explain the decision (at least 8 characters).");return;}
    try{
      const {data}=await supabase.auth.getUser();
      if(!data.user)throw new Error("Your session has expired.");
      const state=verification[item.id]??"documented";
      const proof=evidence[item.id]?.trim()??"";
      if(decision==="approved"&&state!=="documented"&&proof.length<20)throw new Error("Add meaningful evidence before marking a prompt tested or reproduced.");
      if(decision==="approved"){
        const {error:versionError}=await supabase.from("product_versions").update({
          verification_state:state,
          verification_evidence:{state,note:proof,reviewed_by:data.user.id,reviewed_at:new Date().toISOString()}
        }).eq("id",item.version_id);
        if(versionError)throw versionError;
      }
      const {error:submissionError}=await supabase.from("review_submissions").update({
        status:decision,reviewer_id:data.user.id,reviewer_notes:notes,reviewed_at:new Date().toISOString()
      }).eq("id",item.id);
      if(submissionError)throw submissionError;
      if(role==="admin"){
        const nextStatus=decision==="approved"?"published":decision==="rejected"?"rejected":"draft";
        const {error:productError}=await supabase.from("marketplace_products").update({
          status:nextStatus,published_at:decision==="approved"?new Date().toISOString():null
        }).eq("id",item.product_id);
        if(productError)throw productError;
      }
      await supabase.from("review_events").insert({
        submission_id:item.id,actor_id:data.user.id,event_type:decision,details:{notes,verification_state:state}
      });
      setNotice(role==="admin"&&decision==="approved"?"Product approved and published.":"Review decision saved. An administrator must complete publication if required.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not save review decision.");}
  }

  async function saveCommission(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");setNotice("");
    const fee=Number(platformPercent);
    if(!ruleName.trim()||!Number.isFinite(fee)||fee<0||fee>100){setError("Enter a rule name and a platform fee between 0 and 100 percent.");return;}
    setActivating(true);
    try{
      const {data}=await supabase.auth.getUser();if(!data.user)throw new Error("Your session has expired.");
      const now=new Date().toISOString();
      const {error:deactivateError}=await supabase.from("commission_rules").update({is_active:false,effective_until:now}).eq("currency",currency).eq("is_active",true);
      if(deactivateError)throw deactivateError;
      const {error:insertError}=await supabase.from("commission_rules").insert({
        name:ruleName.trim(),currency,platform_fee_bps:Math.round(fee*100),
        creator_share_bps:10000-Math.round(fee*100),is_active:true,created_by:data.user.id
      });
      if(insertError)throw insertError;
      setRuleName("");setPlatformPercent("");setNotice("Commission rule activated. Future transactions will snapshot this split; existing ledger entries remain unchanged.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not save commission rule.");}
    finally{setActivating(false);}
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5"><div><Link to="/" className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-primary">Listingen</Link><h1 className="mt-2 text-3xl font-black">Admin Command Centre</h1><p className="mt-1 text-sm text-muted-foreground">Review products, manage quality decisions and configure marketplace economics.</p></div><nav className="flex gap-3 text-sm"><Link to="/marketplace" className="text-muted-foreground">Marketplace</Link><Link to="/studio" className="text-muted-foreground">Creator Studio</Link></nav></header>
        {error&&<p role="alert" className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
        {notice&&<p role="status" className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{notice}</p>}
        {loading?<p className="mt-8 text-sm text-muted-foreground">Loading admin workspace…</p>:!["admin","reviewer"].includes(role)?<div className="mt-8 rounded-xl border border-border p-6"><h2 className="text-xl font-bold">Restricted workspace</h2><p className="mt-2 text-sm text-muted-foreground">This account does not currently have an administrator or reviewer role in Supabase app metadata. Admin access is never granted from a client-side profile field.</p></div>:<>
          <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Review queue</h2><span className="text-xs text-muted-foreground">{queue.length} awaiting review</span></div>
            {queue.length===0?<p className="mt-4 rounded-xl border border-border p-5 text-sm text-muted-foreground">The review queue is clear.</p>:<div className="mt-4 space-y-4">{queue.map(item=><article key={item.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{item.marketplace_products?.title??"Untitled product"}</h3><p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(item.submitted_at).toLocaleString()} · {item.status}</p></div><Link to="/product/$slug" params={{slug:item.marketplace_products?.slug??""}} className="text-sm text-primary underline">Open listing</Link></div>
              <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs">{item.product_versions?.prompt_content??"No prompt version found."}</pre>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium">Verification classification<select value={verification[item.id]??item.product_versions?.verification_state??"documented"} onChange={e=>setVerification(v=>({...v,[item.id]:e.target.value}))} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"><option value="documented">Documented — instructions reviewed</option><option value="tested">Tested — executed with evidence</option><option value="reproduced">Reproduced — independently reproduced</option></select></label>
                <label className="block text-sm font-medium">Evidence / test notes<textarea value={evidence[item.id]??""} onChange={e=>setEvidence(v=>({...v,[item.id]:e.target.value}))} className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Describe the tools, inputs, output and test evidence. Required for tested/reproduced." /></label>
              </div>
              <label className="mt-3 block text-sm font-medium">Reviewer notes<textarea value={reviewNotes[item.id]??""} onChange={e=>setReviewNotes(v=>({...v,[item.id]:e.target.value}))} className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Explain quality, originality, compliance and any changes needed." /></label>
              <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>void review(item,"approved")} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Approve{role==="admin"?" & publish":""}</button><button onClick={()=>void review(item,"changes_requested")} className="rounded-lg border border-border px-3 py-2 text-sm">Request changes</button><button onClick={()=>void review(item,"rejected")} className="rounded-lg border border-destructive/50 px-3 py-2 text-sm text-destructive">Reject</button></div>
            </article>)}</div>}
          </section>
          {role==="admin"&&<section className="mt-10"><h2 className="text-xl font-bold">Commission configuration</h2><p className="mt-1 text-sm text-muted-foreground">No revenue split is assumed. Configure the platform fee and creator share per currency. Each sale will preserve its own commission snapshot.</p>
            <form onSubmit={saveCommission} className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-4">
              <label className="block text-sm font-medium md:col-span-2">Rule name<input value={ruleName} onChange={e=>setRuleName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Standard marketplace split" /></label>
              <label className="block text-sm font-medium">Currency<select value={currency} onChange={e=>setCurrency(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"><option>USD</option><option>NGN</option><option>GBP</option><option>EUR</option></select></label>
              <label className="block text-sm font-medium">Platform fee (%)<input type="number" min="0" max="100" step="0.01" value={platformPercent} onChange={e=>setPlatformPercent(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Enter percentage" /></label>
              <div className="text-sm text-muted-foreground md:col-span-4">Creator share: {platformPercent!==""&&Number.isFinite(Number(platformPercent))&&Number(platformPercent)>=0&&Number(platformPercent)<=100?(100-Number(platformPercent)).toFixed(2)+"%":"—"}</div>
              <button disabled={activating} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 md:col-span-4">{activating?"Saving…":"Activate commission rule"}</button>
            </form>
            <div className="mt-4 space-y-2">{rules.map(rule=><div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"><div><strong>{rule.name}</strong><p className="text-xs text-muted-foreground">{rule.currency} · Platform {(rule.platform_fee_bps??0)/100}% · Creator {(rule.creator_share_bps??0)/100}%</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{rule.is_active?"Active":"Historical"}</span></div>)}</div>
          </section>}
        </>}
      </div>
    </main>
  );
}
