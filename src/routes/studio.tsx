import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createProductFromListing, getMyListings, getMyProducts, submitProductForReview,
  type ListingRow, type ProductRow,
} from "@/lib/marketplace-client";

export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [{ title: "Creator Studio · Listingen" }, { name: "description", content: "Manage prompt drafts, marketplace products and creator earnings." }] }),
  component: CreatorStudio,
});

const categories = ["AI Writing","AI Image","AI Video","Coding & Development","Apps & Games","Automation","Marketing & Business","Research & Education","Productivity","Other"];

function CreatorStudio() {
  const navigate = useNavigate();
  const [listings,setListings] = useState<ListingRow[]>([]);
  const [products,setProducts] = useState<ProductRow[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [creating,setCreating] = useState<string|null>(null);
  const [price,setPrice] = useState("4.99");
  const [category,setCategory] = useState(categories[0]!);
  const [shortDescription,setShortDescription] = useState("");\n  const [creatorSlug,setCreatorSlug] = useState("");\n  const [headline,setHeadline] = useState("");\n  const [about,setAbout] = useState("");\n  const [profileSaved,setProfileSaved] = useState(false);

  async function refresh() {
    setLoading(true); setError("");
    try {
      const [drafts,items] = await Promise.all([getMyListings(),getMyProducts()]);
      setListings(drafts); setProducts(items);
    } catch (e) {
      if (e instanceof Error && e.message.includes("Sign in")) await navigate({to:"/login"});
      else setError(e instanceof Error ? e.message : "Unable to load your studio.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange((_event,session) => {
      if (!session) void navigate({to:"/login"});
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function saveCreatorProfile(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");setNotice("");
    const slug=creatorSlug.toLowerCase().trim().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"");
    if(slug.length<3){setError("Choose a storefront URL with at least 3 letters or numbers.");return;}
    try{
      const {data,error:authError}=await supabase.auth.getUser();
      if(authError||!data.user)throw new Error("Sign in to continue.");
      const {error:saveError}=await supabase.from("creator_profiles").upsert({
        user_id:data.user.id,slug,headline:headline.trim(),about:about.trim(),is_public:true
      });
      if(saveError)throw saveError;
      setCreatorSlug(slug);setProfileSaved(true);setNotice("Your public creator storefront has been saved.");
    }catch(e){setError(e instanceof Error?e.message:"Could not save creator profile.");}
  }

  async function createProduct(listing: ListingRow) {
    setError(""); setNotice("");
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount < 0) { setError("Enter a valid price in USD."); return; }
    if (shortDescription.trim().length < 12) { setError("Add a short buyer-focused description of at least 12 characters."); return; }
    try {
      const product = await createProductFromListing({ listing, priceAmount: Math.round(amount*100), currency:"USD", category, shortDescription });
      setCreating(null); setShortDescription("");
      setNotice(`Created “${product.title}” as a draft product. It is not published yet.`);
      await refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Could not create product."); }
  }

  async function submit(product: ProductRow) {
    if (!product.current_version_id) { setError("This product needs a saved prompt version before review."); return; }
    try {
      await submitProductForReview(product.id,product.current_version_id);
      setNotice(`“${product.title}” has been submitted for review. It is not published yet.`);
      await refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Could not submit product."); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({to:"/"});
  }

  const published = products.filter(p=>p.status==="published").length;
  const inReview = products.filter(p=>p.status==="in_review").length;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div><Link to="/" className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-primary">Listingen</Link><h1 className="mt-2 text-3xl font-black">Creator Studio</h1><p className="mt-1 text-sm text-muted-foreground">Turn your saved prompts into products buyers can discover.</p></div>
          <nav className="flex flex-wrap items-center gap-3 text-sm"><Link to="/marketplace" className="text-muted-foreground hover:text-foreground">Marketplace</Link><button onClick={signOut} className="rounded-lg border border-border px-3 py-2">Sign out</button></nav>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Saved prompt drafts</p><p className="mt-2 text-3xl font-black">{listings.length}</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Marketplace products</p><p className="mt-2 text-3xl font-black">{products.length}</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Published · In review</p><p className="mt-2 text-3xl font-black">{published} · {inReview}</p></div>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Your public creator storefront</h2><p className="mt-1 text-sm text-muted-foreground">Create a profile buyers can visit to discover your published products.</p></div>{profileSaved&&creatorSlug&&<Link to="/creators/$slug" params={{slug:creatorSlug}} className="text-sm font-semibold text-primary underline">View storefront</Link>}</div>
          <form onSubmit={saveCreatorProfile} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium">Storefront URL slug<input value={creatorSlug} onChange={e=>{setCreatorSlug(e.target.value);setProfileSaved(false);}} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="your-creator-name" /></label>
            <label className="block text-sm font-medium">Creator headline<input value={headline} onChange={e=>setHeadline(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="AI workflow designer and prompt creator" /></label>
            <label className="block text-sm font-medium md:col-span-2">About your work<textarea value={about} onChange={e=>setAbout(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Explain what you create and who your products help." /></label>
            <button className="w-fit rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Save storefront profile</button>
          </form>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Your prompt library</h2><Link to="/" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Create a prompt</Link></div>
        {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{notice}</p>}
        {loading ? <p className="mt-6 text-sm text-muted-foreground">Loading your creator workspace…</p> : listings.length===0 ? <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center"><h3 className="font-bold">Your library is ready</h3><p className="mt-2 text-sm text-muted-foreground">Generate a prompt and save it to your library. You can then prepare it for marketplace review.</p><Link to="/" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Open prompt generator</Link></div> : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {listings.map(listing=><article key={listing.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{listing.title}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{listing.idea}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{listing.status}</span></div>
              <p className="mt-3 text-xs text-muted-foreground">Saved {new Date(listing.created_at).toLocaleDateString()}</p>
              {creating===listing.id ? <div className="mt-4 space-y-3 border-t border-border pt-4">
                <label className="block text-sm font-medium">Marketplace category<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2">{categories.map(c=><option key={c}>{c}</option>)}</select></label>
                <label className="block text-sm font-medium">Price (USD)<input inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="4.99" /></label>
                <label className="block text-sm font-medium">Buyer-focused summary<textarea value={shortDescription} onChange={e=>setShortDescription(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="What problem does this prompt solve for buyers?" /></label>
                <div className="flex gap-2"><button onClick={()=>void createProduct(listing)} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Create product draft</button><button onClick={()=>setCreating(null)} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button></div>
              </div> : <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>{setCreating(listing.id);setShortDescription("");}} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Prepare marketplace product</button><button onClick={()=>navigator.clipboard.writeText(listing.output)} className="rounded-lg border border-border px-3 py-2 text-sm">Copy full prompt package</button></div>}
            </article>)}
          </div>
        )}

        <section className="mt-10"><h2 className="text-xl font-bold">Marketplace products</h2><p className="mt-1 text-sm text-muted-foreground">Every product moves through draft, review and publication. Saving or submitting never publishes automatically.</p>
          {products.length===0 ? <p className="mt-4 rounded-xl border border-border p-5 text-sm text-muted-foreground">No products yet. Prepare a product from one of your saved prompts above.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{products.map(product=><article key={product.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{product.title}</h3><p className="mt-1 text-sm text-muted-foreground">{product.category} · {(product.price_amount/100).toFixed(2)} {product.currency}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{product.status.replace("_"," ")}</span></div>{product.status==="draft"||product.status==="rejected" ? <button onClick={()=>void submit(product)} className="mt-3 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary">Submit for review</button> : null}</article>)}</div>}
        </section>
      </div>
    </main>
  );
}
