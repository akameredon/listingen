import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/payment/return")({
  head: () => ({ meta: [{ title: "Payment status · Listingen" }] }),
  component: PaymentReturn,
});

type Purchase = { id:string; status:string; total_amount:number; currency:string; paid_at:string|null };
type DeliveredItem = { id:string; product_title_snapshot:string; version_id:string; prompt_content:string; instructions:string };

function PaymentReturn(){
  const navigate=useNavigate();
  const [purchase,setPurchase]=useState<Purchase|null>(null);
  const [items,setItems]=useState<DeliveredItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [copied,setCopied]=useState<string|null>(null);
  const [reference,setReference]=useState("");

  async function checkStatus(){
    setLoading(true);setError("");
    try{
      const ref=reference||new URLSearchParams(window.location.search).get("reference")||"";
      if(!ref)throw new Error("Payment reference is missing.");
      setReference(ref);
      const {data:userData,error:userError}=await supabase.auth.getUser();
      if(userError||!userData.user){await navigate({to:"/login"});return;}
      const {data:order,error:orderError}=await supabase.from("purchases")
        .select("id,status,total_amount,currency,paid_at")
        .eq("provider_checkout_id",ref).eq("buyer_id",userData.user.id).single();
      if(orderError)throw new Error("We could not find this purchase in your account.");
      setPurchase(order);
      if(order.status!=="paid"){setItems([]);return;}
      const {data:purchaseItems,error:itemError}=await supabase.from("purchase_items")
        .select("id,product_title_snapshot,version_id").eq("purchase_id",order.id);
      if(itemError)throw itemError;
      const versionIds=(purchaseItems??[]).map(item=>item.version_id);
      if(versionIds.length===0){setItems([]);return;}
      const {data:versions,error:versionError}=await supabase.from("product_versions")
        .select("id,prompt_content,instructions").in("id",versionIds);
      if(versionError)throw versionError;
      const byId=new Map((versions??[]).map(version=>[version.id,version]));
      setItems((purchaseItems??[]).flatMap(item=>{
        const version=byId.get(item.version_id);
        return version?[{...item,prompt_content:version.prompt_content,instructions:version.instructions}]:[];
      }));
    }catch(e){setError(e instanceof Error?e.message:"Unable to check payment status.");}
    finally{setLoading(false);}
  }

  useEffect(()=>{void checkStatus();},[]);

  async function copy(text:string,id:string){
    await navigator.clipboard.writeText(text);setCopied(id);window.setTimeout(()=>setCopied(null),1500);
  }

  return <main className="min-h-screen bg-background px-4 py-10 text-foreground"><div className="mx-auto max-w-3xl">
    <header className="flex items-center justify-between border-b border-border pb-5"><Link to="/" className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-primary">Listingen</Link><Link to="/marketplace" className="text-sm text-muted-foreground">Marketplace</Link></header>
    <section className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Order confirmation</p>
      <h1 className="mt-2 text-3xl font-black">Payment status</h1>
      <p className="mt-2 text-sm text-muted-foreground">The browser return page never marks an order as paid. Listingen waits for a verified Paystack webhook before releasing purchased prompts.</p>
      {error&&<p role="alert" className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
      {loading?<p className="mt-6 text-sm text-muted-foreground">Checking your order…</p>:purchase?<div className="mt-6 rounded-xl bg-muted p-4"><div className="flex flex-wrap items-center justify-between gap-3"><strong>Order {purchase.id.slice(0,8)}</strong><span className="rounded-full bg-background px-3 py-1 text-xs font-semibold">{purchase.status.replace("_"," ")}</span></div><p className="mt-2 text-lg font-bold">{(purchase.total_amount/100).toFixed(2)} {purchase.currency}</p>{purchase.paid_at&&<p className="mt-1 text-xs text-muted-foreground">Confirmed {new Date(purchase.paid_at).toLocaleString()}</p>}</div>:null}
      {!loading&&purchase?.status!=="paid"&&<div className="mt-5"><p className="text-sm text-muted-foreground">Your payment is not confirmed yet. This can take a short time while the payment provider notifies Listingen. Do not pay again until you check your provider receipt.</p><button onClick={()=>void checkStatus()} className="mt-4 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary">Check payment status again</button></div>}
    </section>
    {purchase?.status==="paid"&&<section className="mt-8"><h2 className="text-xl font-bold">Your purchased prompts</h2>{items.length===0?<p className="mt-3 text-sm text-muted-foreground">Payment is confirmed. Your secure prompt delivery is being prepared; refresh this page shortly.</p>:<div className="mt-4 space-y-4">{items.map(item=><article key={item.id} className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold">{item.product_title_snapshot}</h3><p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prompt</p><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs">{item.prompt_content}</pre><p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instructions</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.instructions}</p><button onClick={()=>void copy(item.prompt_content,item.id)} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{copied===item.id?"Copied":"Copy purchased prompt"}</button></article>)}</div>}</section>}
    <div className="mt-8 flex flex-wrap gap-4 text-sm"><Link to="/studio" className="text-primary underline">Creator Studio</Link><Link to="/marketplace" className="text-primary underline">Continue browsing</Link></div>
  </div></main>;
}
