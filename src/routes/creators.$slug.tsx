import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProductRow } from "@/lib/marketplace-client";

export const Route = createFileRoute("/creators/$slug")({
  head: () => ({ meta: [{ title: "Creator storefront · Listingen" }] }),
  component: CreatorStorefront,
});

function CreatorStorefront(){
  const {slug}=useParams({from:"/creators/$slug"});
  const [profile,setProfile]=useState<{user_id:string;slug:string;headline:string|null;about:string|null}|null>(null);
  const [products,setProducts]=useState<ProductRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    async function load(){
      try{
        const {data:creator,error:creatorError}=await supabase.from("creator_profiles").select("user_id,slug,headline,about").eq("slug",slug).eq("is_public",true).maybeSingle();
        if(creatorError)throw creatorError;
        if(!creator){if(active){setProfile(null);setProducts([]);}return;}
        const {data:items,error:itemsError}=await supabase.from("marketplace_products").select("id,creator_id,slug,title,short_description,description,category,tags,preview_content,price_amount,compare_at_price_amount,discount_starts_at,discount_ends_at,currency,status,current_version_id,created_at,updated_at").eq("creator_id",creator.user_id).eq("status","published").order("published_at",{ascending:false});
        if(itemsError)throw itemsError;
        if(active){setProfile(creator);setProducts((items??[]) as ProductRow[]);}
      }catch(e){if(active)setError(e instanceof Error?e.message:"Could not load creator storefront.");}
      finally{if(active)setLoading(false);}
    }
    void load();return()=>{active=false;};
  },[slug]);

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6"><div className="mx-auto max-w-5xl">
    <header className="flex items-center justify-between border-b border-border pb-5"><Link to="/" className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-primary">Listingen</Link><Link to="/marketplace" className="text-sm text-muted-foreground">Marketplace</Link></header>
    {loading?<p className="mt-8 text-sm text-muted-foreground">Loading creator…</p>:error?<p role="alert" className="mt-8 rounded-lg border border-destructive/40 p-4 text-sm">{error}</p>:!profile?<section className="mt-10 rounded-xl border border-border p-8 text-center"><h1 className="text-2xl font-black">Creator not found</h1><p className="mt-2 text-sm text-muted-foreground">This storefront is unavailable or private.</p></section>:<>
      <section className="mt-8 rounded-2xl border border-border bg-card p-7"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Creator storefront</p><h1 className="mt-3 text-3xl font-black">{profile.headline||"Independent creator"}</h1>{profile.about&&<p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm text-muted-foreground">{profile.about}</p>}<p className="mt-4 text-xs text-muted-foreground">{products.length} published products</p></section>
      <section className="mt-8"><h2 className="text-xl font-bold">Published products</h2>{products.length===0?<p className="mt-4 rounded-xl border border-border p-5 text-sm text-muted-foreground">No published products yet.</p>:<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map(p=><article key={p.id} className="rounded-xl border border-border bg-card p-5"><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{p.category}</span><h3 className="mt-4 font-bold">{p.title}</h3><p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.short_description}</p><p className="mt-4 text-sm font-bold">{p.price_amount===0?"Free":p.compare_at_price_amount!=null&&(!p.discount_starts_at||new Date(p.discount_starts_at)<=new Date())&&(!p.discount_ends_at||new Date(p.discount_ends_at)>=new Date())?<><span className="mr-2 text-xs text-muted-foreground line-through">{(p.compare_at_price_amount/100).toFixed(2)} {p.currency}</span>{(p.price_amount/100).toFixed(2)} {p.currency}</>:`${(p.price_amount/100).toFixed(2)} ${p.currency}`}</p><Link to="/product/$slug" params={{slug:p.slug}} className="mt-4 inline-flex text-sm font-semibold text-primary underline">View product</Link></article>)}</div>}</section>
    </>}
  </div></main>;
}
