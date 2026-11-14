import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPublishedProducts, type ProductRow } from "@/lib/marketplace-client";

export const Route = createFileRoute("/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace · Listingen" }, { name: "description", content: "Discover useful prompts and AI workflow products from independent creators." }] }),
  component: MarketplacePage,
});

const categories = ["All","AI Writing","AI Image","AI Video","Coding & Development","Apps & Games","Automation","Marketing & Business","Research & Education","Productivity","Other"];

function MarketplacePage() {
  const [products,setProducts] = useState<ProductRow[]>([]);
  const [search,setSearch] = useState("");
  const [category,setCategory] = useState("All");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  useEffect(()=>{let active=true;setLoading(true);setError("");getPublishedProducts(search,category).then(items=>{if(active)setProducts(items);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to load marketplace.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[search,category]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div><Link to="/" className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-primary">Listingen</Link><h1 className="mt-2 text-3xl font-black sm:text-4xl">Marketplace</h1><p className="mt-1 text-sm text-muted-foreground">Useful prompts, tested workflows and creator-built digital products.</p></div>
          <nav className="flex flex-wrap gap-3 text-sm"><Link to="/studio" className="text-muted-foreground hover:text-foreground">Creator Studio</Link><Link to="/login" className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground">Sign in / Join</Link></nav>
        </header>
        <section className="mt-7 rounded-2xl border border-border bg-card p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Discover and build</p>
          <h2 className="mt-2 max-w-2xl text-2xl font-black sm:text-3xl">Find the prompt that gets the work done.</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Explore creator-submitted products. Each listing shows its verification state honestly—documented is not the same as reproduced.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_240px]"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…" className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm" /><select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-3 text-sm">{categories.map(c=><option key={c}>{c}</option>)}</select></div>
        </section>
        <div className="mt-7 flex items-center justify-between"><h2 className="text-xl font-bold">Published products</h2><span className="text-xs text-muted-foreground">{products.length} shown</span></div>
        {error&&<p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
        {loading?<p className="mt-6 text-sm text-muted-foreground">Loading marketplace…</p>:products.length===0?<div className="mt-4 rounded-xl border border-dashed border-border p-10 text-center"><h3 className="font-bold">The marketplace is being prepared</h3><p className="mt-2 text-sm text-muted-foreground">No published products match this search yet. Creators can start preparing listings in Creator Studio.</p><Link to="/studio" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Open Creator Studio</Link></div>:<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map(product=><article key={product.id} className="flex flex-col rounded-xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{product.category}</span><span className="text-sm font-bold">{product.price_amount===0?"Free":`${(product.price_amount/100).toFixed(2)} ${product.currency}`}</span></div><h3 className="mt-4 text-lg font-bold">{product.title}</h3><p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{product.short_description}</p><div className="mt-4 flex flex-wrap gap-1.5">{product.tags.slice(0,4).map(tag=><span key={tag} className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">{tag}</span>)}</div><Link to="/product/$slug" params={{slug:product.slug}} className="mt-5 inline-flex justify-center rounded-lg border border-primary px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5">View product</Link></article>)}</div>}
      </div>
    </main>
  );
}
