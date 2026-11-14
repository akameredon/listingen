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
            <button disabled className="mt-5 w-full cursor-not-allowed rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground opacity-50">Checkout not enabled yet</button>
            <p className="mt-3 text-xs text-muted-foreground">We never mark an order paid from a browser redirect alone. Payment confirmation must come from a verified provider webhook.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
