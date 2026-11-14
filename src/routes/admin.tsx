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
  const [supportTickets,setSupportTickets]=useState<Array<{id:string;requester_id:string;subject:string;message:string;status:string;priority:string;created_at:string}>>([]);
  const [buyerReviews,setBuyerReviews]=useState<Array<{id:string;product_id:string;rating:number;review_text:string;status:string;created_at:string}>>([]);
  const [financeBusy,setFinanceBusy]=useState(false);
  const [verificationNotes,setVerificationNotes]=useState<Record<string,string>>({});
  const [verificationEvidence,setVerificationEvidence]=useState<Record<string,string>>({});
  const [paidOrders,setPaidOrders]=useState<Array<{id:string;provider:string;status:string;total_amount:number;currency:string;created_at:string}>>([]);
  const [platformRevenue,setPlatformRevenue]=useState<Array<{id:string;amount:number;currency:string;entry_type:string;created_at:string}>>([]);
  const [attributions,setAttributions]=useState<Array<{id:string;campaign_source:string|null;campaign_medium:string|null;campaign_name:string|null;product_id:string|null;purchase_id:string|null;created_at:string}>>([]);
  const [appConfig,setAppConfig]=useState<Array<{key:string;value:unknown;is_public:boolean;updated_at:string}>>([]);
  const [configDrafts,setConfigDrafts]=useState<Record<string,string>>({});
  const [userDirectory,setUserDirectory]=useState<Array<{id:string;email:string|null;created_at:string;last_sign_in_at:string|null;role:string}>>([]);
  const [userFilter,setUserFilter]=useState("");
  const [roleDrafts,setRoleDrafts]=useState<Record<string,string>>({});
  const [newConfigKey,setNewConfigKey]=useState("");
  const [newConfigValue,setNewConfigValue]=useState('""');
  const [newConfigPublic,setNewConfigPublic]=useState(true);
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
      const [q,r,p,accounts,tickets,reviews,orders,revenue,campaigns,config]=await Promise.all([
        supabase.from("review_submissions").select("id,product_id,version_id,submitted_by,status,submitted_at,quality_score,completeness_report,originality_report,compliance_report,reproducibility_report,marketplace_products(title,slug),product_versions(prompt_content,verification_state,verification_evidence)").in("status",["pending","in_progress"]).order("submitted_at",{ascending:true}),
        supabase.from("commission_rules").select("id,name,currency,platform_fee_bps,creator_share_bps,is_active").order("created_at",{ascending:false}),
        supabase.from("payout_requests").select("id,user_id,amount,currency,status,requested_at,provider_transfer_ref,payout_accounts(id,account_label,provider_account_ref,status)").in("status",["requested","processing","failed"]).order("requested_at",{ascending:true}),
        supabase.from("payout_accounts").select("id,user_id,account_label,provider_account_ref,status").eq("status","pending").order("created_at",{ascending:true}),
        supabase.from("support_tickets").select("id,requester_id,subject,message,status,priority,created_at").in("status",["open","in_progress"]).order("created_at",{ascending:true}),
        supabase.from("product_reviews").select("id,product_id,rating,review_text,status,created_at").eq("status","pending").order("created_at",{ascending:true}),
        supabase.from("purchases").select("id,provider,status,total_amount,currency,created_at").in("status",["paid","refund_pending","refunded"]).order("created_at",{ascending:false}).limit(500),
        supabase.from("platform_revenue_entries").select("id,amount,currency,entry_type,created_at").order("created_at",{ascending:false}).limit(500),
        supabase.from("campaign_attributions").select("id,campaign_source,campaign_medium,campaign_name,product_id,purchase_id,created_at").order("created_at",{ascending:false}).limit(100),
        supabase.from("app_config").select("key,value,is_public,updated_at").order("key",{ascending:true})
      ]);
      if(q.error)throw q.error;if(r.error)throw r.error;if(p.error)throw p.error;if(accounts.error)throw accounts.error;if(tickets.error)throw tickets.error;if(reviews.error)throw reviews.error;if(orders.error)throw orders.error;if(revenue.error)throw revenue.error;if(campaigns.error)throw campaigns.error;if(config.error)throw config.error;
      setQueue((q.data??[]) as unknown as QueueItem[]);setRules(r.data??[]);
      setPayoutQueue((p.data??[]) as unknown as typeof payoutQueue);setPendingAccounts(accounts.data??[]);
      setSupportTickets(tickets.data??[]);setBuyerReviews(reviews.data??[]);
      setPaidOrders(orders.data??[]);setPlatformRevenue(revenue.data??[]);setAttributions(campaigns.data??[]);
      setAppConfig(config.data??[]);setConfigDrafts(Object.fromEntries((config.data??[]).map(row=>[row.key,JSON.stringify(row.value,null,2)])));
      if(currentRole==="admin"){
        const {data:userData,error:userError}=await supabase.functions.invoke("marketplace-finance",{body:{action:"list_users"}});
        if(userError)throw userError;if(userData?.error)throw new Error(userData.error);
        setUserDirectory(userData.users??[]);
        setRoleDrafts(Object.fromEntries((userData.users??[]).map((account:{id:string;role:string})=>[account.id,account.role])));
      }
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

  async function recordManualVerification(item:QueueItem,status:"passed"|"failed"|"blocked"){
    setError("");setNotice("");
    const notes=verificationNotes[item.id]?.trim()??"";
    const evidence=verificationEvidence[item.id]?.trim()??"";
    if(notes.length<10){setError("Add at least 10 characters of expected/actual test notes.");return;}
    if(status==="passed"&&!evidence){setError("A passed manual test requires an evidence URL or artifact reference.");return;}
    try{
      const {data:userData,error:userError}=await supabase.auth.getUser();if(userError||!userData.user)throw new Error("Sign in to continue.");
      const {error:runError}=await supabase.from("verification_runs").insert({
        product_id:item.product_id,version_id:item.version_id,runner_type:"manual",status,
        test_input:{method:"reviewer_manual_test"},expected_result:"Reviewer-defined expected behavior",actual_result:notes,
        evidence_url:evidence||null,started_by:userData.user.id
      });
      if(runError)throw runError;
      if(status==="passed"){
        const {error:updateError}=await supabase.from("product_versions").update({verification_state:"tested",verification_evidence:{method:"manual",evidence_url:evidence,notes,verified_at:new Date().toISOString()}}).eq("id",item.version_id);
        if(updateError)throw updateError;
      }
      setNotice(status==="passed"?"Manual test passed; version marked tested (not reproduced).":"Verification run recorded.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not record verification run.");}
  }

  async function refundPurchase(purchaseId:string){
    if(!window.confirm("Issue a full refund through Paystack? The order will remain pending until Paystack confirms the refund webhook."))return;
    setFinanceBusy(true);setError("");setNotice("");
    try{
      const {data,error:invokeError}=await supabase.functions.invoke("marketplace-finance",{body:{action:"request_refund",purchaseId,reason:"Full refund approved by Listingen support."}});
      if(invokeError)throw new Error(invokeError.message);
      if(data?.error)throw new Error(data.error);
      setNotice("Paystack refund request submitted. Creator and platform ledger reversals will occur only after the signed refund webhook.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not request refund.");}
    finally{setFinanceBusy(false);}
  }

  async function updateTicket(ticketId:string,status:"in_progress"|"resolved"|"closed"){
    const {error:updateError}=await supabase.from("support_tickets").update({status}).eq("id",ticketId);
    if(updateError){setError(updateError.message);return;}
    setNotice("Support ticket status updated.");await load();
  }

  async function moderateBuyerReview(reviewId:string,status:"published"|"hidden"){
    const {error:updateError}=await supabase.from("product_reviews").update({status}).eq("id",reviewId);
    if(updateError){setError(updateError.message);return;}
    setNotice(status==="published"?"Buyer review published.":"Buyer review hidden.");await load();
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

  async function updateUserRole(userId:string){
    const role=roleDrafts[userId]??"buyer";
    setFinanceBusy(true);setError("");setNotice("");
    try{
      const {data,error:invokeError}=await supabase.functions.invoke("marketplace-finance",{body:{action:"set_user_role",userId,role}});
      if(invokeError)throw new Error(invokeError.message);if(data?.error)throw new Error(data.error);
      setNotice(`User role updated to ${role}.`);await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not update user role.");}
    finally{setFinanceBusy(false);}
  }

  async function saveConfig(key:string,valueText:string,isPublic:boolean){
    setError("");setNotice("");
    try{
      const parsed=JSON.parse(valueText);
      const {data}=await supabase.auth.getUser();if(!data.user)throw new Error("Sign in to continue.");
      const {error:saveError}=await supabase.from("app_config").upsert({key,value:parsed,is_public:isPublic,updated_by:data.user.id});
      if(saveError)throw saveError;
      setNotice(`Configuration “${key}” saved.`);await load();
    }catch(e){setError(e instanceof Error?e.message:"Configuration value must be valid JSON.");}
  }

  async function createConfig(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!/^[a-z0-9_.-]{2,80}$/.test(newConfigKey)){setError("Use a 2–80 character lowercase key with letters, numbers, dots, underscores or hyphens.");return;}
    await saveConfig(newConfigKey,newConfigValue,newConfigPublic);
    setNewConfigKey("");setNewConfigValue('""');
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
          {role==="admin"&&<section className="mt-8"><h2 className="text-xl font-bold">Marketplace analytics</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">
            {["USD","NGN","GBP","EUR"].map(currency=>{const gross=paidOrders.filter(o=>o.currency===currency).reduce((sum,o)=>sum+o.total_amount,0);const net=platformRevenue.filter(o=>o.currency===currency).reduce((sum,o)=>sum+o.amount,0);return <div key={currency} className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{currency} volume</p><p className="mt-2 text-2xl font-black">{(gross/100).toFixed(2)}</p><p className="mt-1 text-xs text-muted-foreground">Platform net: {(net/100).toFixed(2)}</p></div>;})}
          </div><div className="mt-3 rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between"><h3 className="font-bold">Recent orders & refunds</h3><span className="text-xs text-muted-foreground">{paidOrders.length} records</span></div>{paidOrders.length===0?<p className="mt-2 text-sm text-muted-foreground">No paid orders yet.</p>:<div className="mt-3 space-y-2">{paidOrders.slice(0,20).map(order=><div key={order.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-xs"><span>{(order.total_amount/100).toFixed(2)} {order.currency} · {order.provider} · {order.status}</span>{order.status==="paid"&&order.provider==="paystack"&&<button disabled={financeBusy} onClick={()=>void refundPurchase(order.id)} className="rounded border border-destructive/50 px-2 py-1 text-destructive disabled:opacity-50">Issue full refund</button>}</div>)}</div>}</div>
<div className="mt-3 rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between"><h3 className="font-bold">Recent campaign attribution</h3><span className="text-xs text-muted-foreground">{attributions.length} records</span></div>{attributions.length===0?<p className="mt-2 text-sm text-muted-foreground">Campaign attribution will appear when tracked referral links generate purchases or free claims.</p>:<div className="mt-3 space-y-2">{attributions.slice(0,10).map(a=><div key={a.id} className="flex flex-wrap justify-between gap-2 border-t border-border pt-2 text-xs"><span>{a.campaign_source||"referral"} / {a.campaign_medium||"—"} / {a.campaign_name||"—"}</span><span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span></div>)}</div>}</div></section>}
          <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Review queue</h2><span className="text-xs text-muted-foreground">{queue.length} awaiting review</span></div>
            {queue.length===0?<p className="mt-4 rounded-xl border border-border p-5 text-sm text-muted-foreground">The review queue is clear.</p>:<div className="mt-4 space-y-4">{queue.map(item=><article key={item.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{item.marketplace_products?.title??"Untitled product"}</h3><p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(item.submitted_at).toLocaleString()} · {item.status}</p></div><Link to="/product/$slug" params={{slug:item.marketplace_products?.slug??""}} className="text-sm text-primary underline">Open listing</Link></div>
              <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs">{item.product_versions?.prompt_content??"No prompt version found."}</pre>
              <div className="mt-4 rounded-lg border border-border p-3"><p className="text-sm font-semibold">Record manual verification</p><p className="mt-1 text-xs text-muted-foreground">A manual pass marks this version “tested”. Only an isolated runner can mark it “reproduced”.</p><textarea value={verificationNotes[item.id]??""} onChange={e=>setVerificationNotes(v=>({...v,[item.id]:e.target.value}))} className="mt-2 min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs" placeholder="Expected behavior, actual result and test steps…" /><input value={verificationEvidence[item.id]??""} onChange={e=>setVerificationEvidence(v=>({...v,[item.id]:e.target.value}))} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs" placeholder="Evidence URL or artifact reference (required for pass)" /><div className="mt-2 flex flex-wrap gap-2"><button onClick={()=>void recordManualVerification(item,"passed")} className="rounded border border-primary px-2.5 py-1.5 text-xs text-primary">Pass manual test</button><button onClick={()=>void recordManualVerification(item,"failed")} className="rounded border border-destructive/50 px-2.5 py-1.5 text-xs text-destructive">Fail</button><button onClick={()=>void recordManualVerification(item,"blocked")} className="rounded border border-border px-2.5 py-1.5 text-xs">Blocked</button></div></div>
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
          {role==="admin"&&<section className="mt-10"><h2 className="text-xl font-bold">User access & roles</h2><p className="mt-1 text-sm text-muted-foreground">Manage roles through protected Supabase Auth app metadata. User-editable profile metadata is never used for authorization.</p><input value={userFilter} onChange={e=>setUserFilter(e.target.value)} className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Filter users by email…" /><div className="mt-3 space-y-2">{userDirectory.filter(account=>(account.email??"").toLowerCase().includes(userFilter.toLowerCase())).slice(0,100).map(account=><div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"><div><p className="text-sm font-semibold">{account.email??"No email"}</p><p className="text-xs text-muted-foreground">Joined {new Date(account.created_at).toLocaleDateString()} · {account.id.slice(0,8)}</p></div><div className="flex items-center gap-2"><select value={roleDrafts[account.id]??account.role} onChange={e=>setRoleDrafts(v=>({...v,[account.id]:e.target.value}))} className="rounded-lg border border-input bg-background px-2 py-2 text-xs"><option value="buyer">Buyer</option><option value="creator">Creator</option><option value="reviewer">Reviewer</option><option value="admin">Admin</option></select><button disabled={financeBusy||roleDrafts[account.id]===account.role} onClick={()=>void updateUserRole(account.id)} className="rounded-lg border border-primary px-2.5 py-2 text-xs font-semibold text-primary disabled:opacity-40">Save role</button></div></div>)}</div></section>}
          {role==="admin"&&<section className="mt-10"><h2 className="text-xl font-bold">Platform configuration</h2><p className="mt-1 text-sm text-muted-foreground">Manage JSON configuration values without changing application code. Never store API secrets here.</p>
            <form onSubmit={createConfig} className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[1fr_1.5fr_auto]"><label className="block text-sm font-medium">Key<input value={newConfigKey} onChange={e=>setNewConfigKey(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="homepage.hero.title" /></label><label className="block text-sm font-medium">JSON value<textarea value={newConfigValue} onChange={e=>setNewConfigValue(e.target.value)} className="mt-1 min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs" /></label><div className="flex flex-col justify-end gap-2"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={newConfigPublic} onChange={e=>setNewConfigPublic(e.target.checked)} /> Public</label><button className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Add / save key</button></div></form>
            <div className="mt-4 space-y-3">{appConfig.map(row=><div key={row.key} className="rounded-xl border border-border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{row.key}</strong><span className="text-xs text-muted-foreground">{row.is_public?"Public":"Admin only"}</span></div><textarea value={configDrafts[row.key]??""} onChange={e=>setConfigDrafts(v=>({...v,[row.key]:e.target.value}))} className="mt-3 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs" /><button onClick={()=>void saveConfig(row.key,configDrafts[row.key]??"null",row.is_public)} className="mt-2 rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary">Save JSON</button></div>)}</div>
          </section>}
          {role==="admin"&&<section className="mt-10"><h2 className="text-xl font-bold">Customer support & review moderation</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold">Open support tickets</h3>{supportTickets.length===0?<p className="mt-3 text-sm text-muted-foreground">No open tickets.</p>:<div className="mt-3 space-y-3">{supportTickets.map(ticket=><div key={ticket.id} className="rounded-lg border border-border p-3"><div className="flex justify-between gap-2"><strong className="text-sm">{ticket.subject}</strong><span className="text-xs text-muted-foreground">{ticket.priority}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{ticket.message}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>void updateTicket(ticket.id,"in_progress")} className="rounded border border-border px-2 py-1 text-xs">In progress</button><button onClick={()=>void updateTicket(ticket.id,"resolved")} className="rounded border border-primary px-2 py-1 text-xs text-primary">Resolve</button><button onClick={()=>void updateTicket(ticket.id,"closed")} className="rounded border border-border px-2 py-1 text-xs">Close</button></div></div>)}</div>}</div>
              <div className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold">Pending buyer reviews</h3>{buyerReviews.length===0?<p className="mt-3 text-sm text-muted-foreground">No reviews awaiting moderation.</p>:<div className="mt-3 space-y-3">{buyerReviews.map(review=><div key={review.id} className="rounded-lg border border-border p-3"><p className="text-sm font-semibold">{review.rating}/5 stars</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{review.review_text||"No written comment."}</p><div className="mt-3 flex gap-2"><button onClick={()=>void moderateBuyerReview(review.id,"published")} className="rounded border border-primary px-2 py-1 text-xs text-primary">Publish</button><button onClick={()=>void moderateBuyerReview(review.id,"hidden")} className="rounded border border-border px-2 py-1 text-xs">Hide</button></div></div>)}</div>}</div>
            </div>
          </section>}
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
