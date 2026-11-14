import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Command Centre · Listingen" }] }),
  component: AdminPage,
});

type QueueItem = {
  id: string; product_id: string; version_id: string; submitted_by: string;
  status: string; submitted_at: string; quality_score: number | null;
  completeness_report: unknown; originality_report: unknown; compliance_report: unknown; reproducibility_report: unknown;
  marketplace_products: { title: string; slug: string } | null;
  product_versions: { prompt_content: string; verification_state: string; verification_evidence: unknown } | null;
};

function AdminPage() {
  const navigate=useNavigate();
  const [role,setRole]=useState("");
  const [queue,setQueue]=useState<QueueItem[]>([]);
  const [rules,setRules]=useState<Array<{id:string;name:string;currency:string;platform_fee_bps:number|null;creator_share_bps:number|null;is_active:boolean}>>([]);
  const [payoutQueue,setPayoutQueue]=useState<Array<{id:string;user_id:string;amount:number;currency:string;status:string;requested_at:string;provider_transfer_ref:string|null;payout_accounts:{id:string;account_label:string|null;provider_account_ref:string|null;status:string}|null}>>([]);
  const [pendingAccounts,setPendingAccounts]=useState<Array<{id:string;user_id:string;account_label:string|null;provider_account_ref:string|null;status:string}>>([]);
  const [financeBusy,setFinanceBusy]=useState(false);
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
      const [q,r,p,accounts]=await Promise.all([
        supabase.from("review_submissions").select("id,product_id,version_id,submitted_by,status,submitted_at,quality_score,completeness_report,originality_report,compliance_report,reproducibility_report,marketplace_products(title,slug),product_versions(prompt_content,verification_state,verification_evidence)").in("status",["pending","in_progress"]).order("submitted_at",{ascending:true}),
        supabase.from("commission_rules").select("id,name,currency,platform_fee_bps,creator_share_bps,is_active").order("created_at",{ascending:false}),
        supabase.from("payout_requests").select("id,user_id,amount,currency,status,requested_at,provider_transfer_ref,payout_accounts(id,account_label,provider_account_ref,status)").in("status",["requested","processing","failed"]).order("requested_at",{ascending:true}),
        supabase.from("payout_accounts").select("id,user_id,account_label,provider_account_ref,status").eq("status","pending").order("created_at",{ascending:true})
      ]);
      if(q.error)throw q.error;if(r.error)throw r.error;if(p.error)throw p.error;if(accounts.error)throw accounts.error;
      setQueue((q.data??[]) as unknown as QueueItem[]);setRules(r.data??[]);
      setPayoutQueue((p.data??[]) as unknown as typeof payoutQueue);setPendingAccounts(accounts.data??[]);
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

  async function verifyAccount(accountId:string){
    setFinanceBusy(true);setError("");setNotice("");
    try{
      const {data,error:invokeError}=await supabase.functions.invoke("marketplace-finance",{body:{action:"verify_payout_account",accountId}});
      if(invokeError)throw new Error(invokeError.message);
      if(data?.error)throw new Error(data.error);
      setNotice(`Payout recipient verified. Bank: ${data.bank_name??"confirmed"} · ending ${data.account_last4??"—"}.`);
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not verify payout recipient.");}
    finally{setFinanceBusy(false);}
  }

  async function processPayout(payoutId:string){
    setFinanceBusy(true);setError("");setNotice("");
    try{
      const {data,error:invokeError}=await supabase.functions.invoke("marketplace-finance",{body:{action:"execute_payout",payoutId}});
      if(invokeError)throw new Error(invokeError.message);
      if(data?.error)throw new Error(data.error);
      setNotice("Payout transfer submitted to Paystack. Final settlement will be recorded from its signed webhook.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not process payout.");}
    finally{setFinanceBusy(false);}
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
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-muted p-3"><p className="text-xs font-semibold">Automated quality score</p><p className="mt-1 text-2xl font-black">{item.quality_score??"—"}<span className="text-xs font-normal text-muted-foreground"> / 100</span></p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xs font-semibold">Assessment reports</p><pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">{JSON.stringify({completeness:item.completeness_report,originality:item.originality_report,compliance:item.compliance_report,reproducibility:item.reproducibility_report},null,2)}</pre></div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium">Verification classification<select value={verification[item.id]??item.product_versions?.verification_state??"documented"} onChange={e=>setVerification(v=>({...v,[item.id]:e.target.value}))} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"><option value="documented">Documented — instructions reviewed</option><option value="tested">Tested — executed with evidence</option><option value="reproduced">Reproduced — independently reproduced</option></select></label>
                <label className="block text-sm font-medium">Evidence / test notes<textarea value={evidence[item.id]??""} onChange={e=>setEvidence(v=>({...v,[item.id]:e.target.value}))} className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Describe the tools, inputs, output and test evidence. Required for tested/reproduced." /></label>
              </div>
              <label className="mt-3 block text-sm font-medium">Reviewer notes<textarea value={reviewNotes[item.id]??""} onChange={e=>setReviewNotes(v=>({...v,[item.id]:e.target.value}))} className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Explain quality, originality, compliance and any changes needed." /></label>
              <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>void review(item,"approved")} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Approve{role==="admin"?" & publish":""}</button><button onClick={()=>void review(item,"changes_requested")} className="rounded-lg border border-border px-3 py-2 text-sm">Request changes</button><button onClick={()=>void review(item,"rejected")} className="rounded-lg border border-destructive/50 px-3 py-2 text-sm text-destructive">Reject</button></div>
            </article>)}</div>}
          </section>
          {role==="admin"&&<section className="mt-10"><h2 className="text-xl font-bold">Payout operations</h2><p className="mt-1 text-sm text-muted-foreground">Verify recipient references before processing creator payouts. Transfers are initiated only by an administrator and marked paid only after Paystack's signed webhook.</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold">Pending payout accounts</h3>{pendingAccounts.length===0?<p className="mt-3 text-sm text-muted-foreground">No recipient accounts await verification.</p>:<div className="mt-3 space-y-3">{pendingAccounts.map(account=><div key={account.id} className="rounded-lg border border-border p-3"><p className="font-semibold">{account.account_label||"Paystack recipient"}</p><p className="mt-1 break-all text-xs text-muted-foreground">{account.provider_account_ref}</p><button disabled={financeBusy} onClick={()=>void verifyAccount(account.id)} className="mt-3 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50">Verify with Paystack</button></div>)}</div>}</div>
              <div className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold">Payout requests</h3>{payoutQueue.length===0?<p className="mt-3 text-sm text-muted-foreground">No payout requests await processing.</p>:<div className="mt-3 space-y-3">{payoutQueue.map(payout=><div key={payout.id} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between gap-2"><strong>{(payout.amount/100).toFixed(2)} {payout.currency}</strong><span className="rounded-full bg-muted px-2 py-1 text-xs">{payout.status}</span></div><p className="mt-1 text-xs text-muted-foreground">{payout.payout_accounts?.account_label||payout.payout_accounts?.provider_account_ref||"No recipient"} · {new Date(payout.requested_at).toLocaleString()}</p>{payout.status==="requested"&&<button disabled={financeBusy} onClick={()=>void processPayout(payout.id)} className="mt-3 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Approve & send payout</button>}</div>)}</div>}</div>
            </div>
          </section>}
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
