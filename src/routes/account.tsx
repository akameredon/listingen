import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My account · Listingen" }] }),
  component: BuyerAccount,
});

type Purchase={id:string;provider_checkout_id:string|null;status:string;total_amount:number;currency:string;created_at:string;paid_at:string|null};
type Item={id:string;purchase_id:string;product_id:string;product_title_snapshot:string;unit_amount:number;currency:string};
type Ticket={id:string;subject:string;status:string;priority:string;created_at:string};

function BuyerAccount(){
  const navigate=useNavigate();
  const [purchases,setPurchases]=useState<Purchase[]>([]);
  const [items,setItems]=useState<Item[]>([]);
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [ratings,setRatings]=useState<Record<string,string>>({});
  const [reviews,setReviews]=useState<Record<string,string>>({});
  const [subject,setSubject]=useState("");
  const [message,setMessage]=useState("");
  const [selectedPurchase,setSelectedPurchase]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  async function load(){
    setLoading(true);setError("");
    try{
      const {data:userData,error:userError}=await supabase.auth.getUser();
      if(userError||!userData.user){await navigate({to:"/login"});return;}
      const [purchaseResult,ticketResult]=await Promise.all([
        supabase.from("purchases").select("id,provider_checkout_id,status,total_amount,currency,created_at,paid_at").order("created_at",{ascending:false}),
        supabase.from("support_tickets").select("id,subject,status,priority,created_at").order("created_at",{ascending:false})
      ]);
      if(purchaseResult.error)throw purchaseResult.error;if(ticketResult.error)throw ticketResult.error;
      const orders=purchaseResult.data??[];setPurchases(orders);setTickets(ticketResult.data??[]);
      if(orders.length){
        const {data:itemData,error:itemError}=await supabase.from("purchase_items").select("id,purchase_id,product_id,product_title_snapshot,unit_amount,currency").in("purchase_id",orders.map(x=>x.id));
        if(itemError)throw itemError;setItems(itemData??[]);
      }else setItems([]);
    }catch(e){setError(e instanceof Error?e.message:"Could not load your account.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  async function submitReview(item:Item){
    setError("");setNotice("");const rating=Number(ratings[item.id]);const reviewText=reviews[item.id]??"";
    if(!Number.isInteger(rating)||rating<1||rating>5){setError("Choose a rating from 1 to 5.");return;}
    setBusy(true);
    try{
      const {data:userData}=await supabase.auth.getUser();if(!userData.user)throw new Error("Sign in to continue.");
      const {error:reviewError}=await supabase.from("product_reviews").insert({
        product_id:item.product_id,buyer_id:userData.user.id,purchase_item_id:item.id,rating,review_text:reviewText,status:"pending"
      });
      if(reviewError)throw reviewError;
      setNotice("Your verified-purchase review was submitted for moderation.");
    }catch(e){setError(e instanceof Error?e.message:"Could not submit review.");}
    finally{setBusy(false);}
  }

  async function submitTicket(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");setNotice("");
    if(subject.trim().length<4||message.trim().length<10){setError("Enter a subject and a message with at least 10 characters.");return;}
    setBusy(true);
    try{
      const {data:userData}=await supabase.auth.getUser();if(!userData.user)throw new Error("Sign in to continue.");
      const {error:ticketError}=await supabase.from("support_tickets").insert({
        requester_id:userData.user.id,purchase_id:selectedPurchase||null,subject:subject.trim(),message:message.trim(),status:"open",priority:"normal"
      });
      if(ticketError)throw ticketError;
      setSubject("");setMessage("");setSelectedPurchase("");setNotice("Support ticket created.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not create support ticket.");}
    finally{setBusy(false);}
  }

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6"><div className="mx-auto max-w-5xl">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5"><div><Link to="/" className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-primary">Listingen</Link><h1 className="mt-2 text-3xl font-black">My account</h1></div><nav className="flex gap-3 text-sm"><Link to="/marketplace" className="text-muted-foreground">Marketplace</Link><Link to="/studio" className="text-muted-foreground">Creator Studio</Link></nav></header>
    {error&&<p role="alert" className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}{notice&&<p role="status" className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{notice}</p>}
    {loading?<p className="mt-8 text-sm text-muted-foreground">Loading your account…</p>:<>
      <section className="mt-8"><h2 className="text-xl font-bold">Purchases</h2>{purchases.length===0?<p className="mt-3 rounded-xl border border-border p-5 text-sm text-muted-foreground">Your purchases will appear here.</p>:<div className="mt-4 space-y-3">{purchases.map(order=><article key={order.id} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">Order {order.id.slice(0,8)}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p></div><div className="text-right"><p className="font-bold">{(order.total_amount/100).toFixed(2)} {order.currency}</p><p className="text-xs text-muted-foreground">{order.status}</p></div></div>{order.status==="paid"&&order.provider_checkout_id&&<Link to="/payment/return" search={{reference:order.provider_checkout_id} as never} className="mt-3 inline-flex text-sm text-primary underline">View purchased delivery</Link>}{items.filter(i=>i.purchase_id===order.id).map(item=><div key={item.id} className="mt-4 border-t border-border pt-4"><p className="font-semibold">{item.product_title_snapshot}</p>{order.status==="paid"&&<div className="mt-3 grid gap-2 sm:grid-cols-[140px_1fr_auto]"><select value={ratings[item.id]??""} onChange={e=>setRatings(v=>({...v,[item.id]:e.target.value}))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="">Rating</option><option value="5">5 · Excellent</option><option value="4">4 · Good</option><option value="3">3 · Okay</option><option value="2">2 · Poor</option><option value="1">1 · Bad</option></select><input value={reviews[item.id]??""} onChange={e=>setReviews(v=>({...v,[item.id]:e.target.value}))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Share your experience (optional)" /><button disabled={busy} onClick={()=>void submitReview(item)} className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50">Submit review</button></div>}</div>)}</article>)}</div>}</section>
      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <form onSubmit={submitTicket} className="rounded-xl border border-border bg-card p-5"><h2 className="text-xl font-bold">Contact support</h2><p className="mt-1 text-sm text-muted-foreground">Ask for help with a purchase, product or refund.</p><label className="mt-4 block text-sm font-medium">Related purchase<select value={selectedPurchase} onChange={e=>setSelectedPurchase(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"><option value="">General enquiry</option>{purchases.map(p=><option key={p.id} value={p.id}>Order {p.id.slice(0,8)}</option>)}</select></label><label className="mt-3 block text-sm font-medium">Subject<input value={subject} onChange={e=>setSubject(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" /></label><label className="mt-3 block text-sm font-medium">Message<textarea value={message} onChange={e=>setMessage(e.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2" /></label><button disabled={busy} className="mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">Create support ticket</button></form>
        <section className="rounded-xl border border-border bg-card p-5"><h2 className="text-xl font-bold">Support history</h2>{tickets.length===0?<p className="mt-3 text-sm text-muted-foreground">No support tickets yet.</p>:<div className="mt-3 space-y-3">{tickets.map(ticket=><div key={ticket.id} className="rounded-lg border border-border p-3"><div className="flex justify-between gap-2"><strong className="text-sm">{ticket.subject}</strong><span className="text-xs text-muted-foreground">{ticket.status}</span></div><p className="mt-1 text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleString()}</p></div>)}</div>}</section>
      </section>
    </>}
  </div></main>;
}
