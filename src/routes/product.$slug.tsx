import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getProductBySlug, type ProductRow } from "@/lib/marketplace-client";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({ meta: [{ title: "Product · Listingen" }] }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = useParams({ from: "/product/$slug" });
  const [product,setProduct] = useState<ProductRow|null>(null);
  const [prompt,setPrompt] = useState("");
  const [creator,setCreator] = useState<{slug:string;headline:string|null;about:string|null}|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [checkoutBusy,setCheckoutBusy] = useState(false);
  const [checkoutError,setCheckoutError] = useState("");

  useEffect(()=>{
    let active=true;
    async function load(){
      try{
        const item=await getProductBySlug(slug);
        if(!active)return;
        setProduct(item);
        if(item?.current_version_id){
          const {data,error:versionError}=await supabase.from("product_versions").select("prompt_content,verification_state").eq("id",item.current_version_id).maybeSingle();
          if(versionError)throw versionError;
          if(active)setPrompt(data?.prompt_content??"");
        }
        if(item){
          const {data}=await supabase.from("creator_profiles").select("slug,headline,about").eq("user_id",item.creator_id).maybeSingle();
          if(active)setCreator(data);
        }
      }catch(e){if(active)setError(e instanceof Error?e.message:"Unable to load product.");}
      finally{if(active)setLoading(false);}
    }
    void load();return()=>{active=false;};
  },[slug]);

  async function startCheckout(){
    if(!product)return;
    setCheckoutBusy(true);setCheckoutError("");
    try{
      const {data:userData}=await supabase.auth.getUser();
      if(!userData.user){
        window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const action=product.price_amount===0?"claim_free":"initialize_checkout";
      const params=new URLSearchParams(window.location.search);
      const {data,error:invokeError}=await supabase.functions.invoke("marketplace-finance",{body:{
        action,productId:product.id,referralCode:params.get("ref"),
        utmSource:params.get("utm_source"),utmMedium:params.get("utm_medium"),
        utmCampaign:params.get("utm_campaign"),landingPath:window.location.pathname
      }});
      if(invokeError)throw new Error(invokeError.message);
      if(data?.error)throw new Error(data.error);
      if(data?.authorization_url){window.location.assign(data.authorization_url);return;}
      if(data?.reference){window.location.assign(`/payment/return?reference=${encodeURIComponent(data.reference)}`);return;}
      throw new Error("The payment provider returned an unexpected response.");
    }catch(e){setCheckoutError(e instanceof Error?e.message:"Could not start checkout.");}
    finally{setCheckoutBusy(false);}
  }

  if(loading)return <main className="min-h-screen bg-background p-8 text-muted-foreground">Loading product…</main>;
  if(error||!product)return <main className="min-h-screen bg-background px-4 py-12 text-foreground"><div className="mx-auto max-w-xl rounded-xl border border-border p-6"><h1 className="text-2xl font-bold">Product unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error||"This product may have been unpublished or removed."}</p><Link to="/marketplace" className="mt-5 inline-flex text-primary underline">Back to marketplace</Link></div></main>;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between border-b border-border pb-5"><Link to="/" className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-primary">Listingen</Link><Link to="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">Marketplace</Link></header>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
          <section>
            <span className="rounded-full bg-muted px-3 py-1 text-xs">{product.category}</span>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">{product.title}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{product.short_description}</p>
            <div className="prose prose-sm mt-7 max-w-none whitespace-pre-wrap text-foreground">{product.description}</div>
            <section className="mt-8 rounded-xl border border-border bg-card p-5">
              <h2 className="font-bold">What's included</h2>
              <p className="mt-2 text-sm text-muted-foreground">A versioned prompt package and usage instructions are delivered after a verified purchase.</p>
              {prompt&&<div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prompt preview</p><pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs">{prompt.slice(0,900)}{prompt.length>900?"…":""}</pre></div>}
              <p className="mt-4 text-xs text-muted-foreground">Verification status: documented. This label does not claim independent reproduction unless evidence is attached and verified.</p>
            </section>
            {creator&&<section className="mt-6 rounded-xl border border-border p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Created by</p><h2 className="mt-1 font-bold">{creator.headline||"Listingen creator"}</h2>{creator.about&&<p className="mt-2 text-sm text-muted-foreground">{creator.about}</p>}</section>}
          </section>
          <aside className="h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">One-time purchase</p>
            <p className="mt-2 text-3xl font-black">{product.price_amount===0?"Free":`${(product.price_amount/100).toFixed(2)} ${product.currency}`}</p>
            <p className="mt-3 text-sm text-muted-foreground">Secure checkout and automatic delivery will activate when the payment provider and commission policy are configured.</p>
            {checkoutError&&<p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">{checkoutError}</p>}
            <button disabled={checkoutBusy} onClick={()=>void startCheckout()} className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{checkoutBusy?"Preparing…":product.price_amount===0?"Claim free product":"Buy now"}</button>
            <p className="mt-3 text-xs text-muted-foreground">We never mark an order paid from a browser redirect alone. Payment confirmation must come from a verified provider webhook.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
