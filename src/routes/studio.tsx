import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createProductFromListing, createProductVersion, duplicateListingDraft, getMyListings, getMyProducts, submitProductForReview, updateListingDraft, updateProductDetails,
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
  const [shortDescription,setShortDescription] = useState("");
  const [creatorSlug,setCreatorSlug] = useState("");
  const [headline,setHeadline] = useState("");
  const [about,setAbout] = useState("");
  const [profileSaved,setProfileSaved] = useState(false);
  const [ledger,setLedger] = useState<Array<{id:string;amount:number;currency:string;entry_type:string;created_at:string}>>([]);
  const [payoutAccounts,setPayoutAccounts] = useState<Array<{id:string;provider:string;provider_account_ref:string|null;account_label:string|null;status:string}>>([]);
  const [payouts,setPayouts] = useState<Array<{id:string;amount:number;currency:string;status:string;requested_at:string}>>([]);
  const [recipientCode,setRecipientCode] = useState("");
  const [accountLabel,setAccountLabel] = useState("");
  const [payoutAmount,setPayoutAmount] = useState("");
  const [payoutCurrency,setPayoutCurrency] = useState("USD");
  const [payoutAccountId,setPayoutAccountId] = useState("");
  const [financeBusy,setFinanceBusy] = useState(false);
  const [referralCodes,setReferralCodes] = useState<Array<{id:string;code:string;is_active:boolean}>>([]);
  const [versionHistory,setVersionHistory] = useState<Record<string,Array<{id:string;version_number:number;verification_state:string;created_at:string;prompt_content:string;instructions:string}>>>({});
  const [editingVersion,setEditingVersion] = useState<string|null>(null);
  const [versionPrompt,setVersionPrompt] = useState("");
  const [versionInstructions,setVersionInstructions] = useState("");
  const [versionChangelog,setVersionChangelog] = useState("");
  const [editingListingId,setEditingListingId] = useState<string|null>(null);
  const [draftTitle,setDraftTitle] = useState("");
  const [draftIdea,setDraftIdea] = useState("");
  const [draftOutput,setDraftOutput] = useState("");
  const [draftFolder,setDraftFolder] = useState("Uncategorized");
  const [draftTags,setDraftTags] = useState("");
  const [editingProductId,setEditingProductId] = useState<string|null>(null);
  const [productTitle,setProductTitle] = useState("");
  const [productSummary,setProductSummary] = useState("");
  const [productDescription,setProductDescription] = useState("");
  const [productPrice,setProductPrice] = useState("");
  const [productCategory,setProductCategory] = useState(categories[0]!);
  const [productCurrency,setProductCurrency] = useState("USD");
  const [productTags,setProductTags] = useState("");

  async function refresh() {
    setLoading(true); setError("");
    try {
      const {data:userData,error:userError}=await supabase.auth.getUser();
      if(userError||!userData.user)throw new Error("Sign in to continue.");
      const [drafts,items,profileResult,ledgerResult,accountResult,payoutResult,referralResult] = await Promise.all([
        getMyListings(),getMyProducts(),
        supabase.from("creator_profiles").select("slug,headline,about").eq("user_id",userData.user.id).maybeSingle(),
        supabase.from("ledger_entries").select("id,amount,currency,entry_type,created_at").order("created_at",{ascending:false}).limit(100),
        supabase.from("payout_accounts").select("id,provider,provider_account_ref,account_label,status").order("created_at",{ascending:false}),
        supabase.from("payout_requests").select("id,amount,currency,status,requested_at").order("requested_at",{ascending:false}).limit(50),
        supabase.from("referral_codes").select("id,code,is_active").order("created_at",{ascending:false}),
      ]);
      if(profileResult.error)throw profileResult.error;
      if(ledgerResult.error)throw ledgerResult.error;
      if(accountResult.error)throw accountResult.error;
      if(payoutResult.error)throw payoutResult.error;
      if(referralResult.error)throw referralResult.error;
      setListings(drafts); setProducts(items);
      setCreatorSlug(profileResult.data?.slug??`creator-${userData.user.id.slice(0,8)}`);
      setHeadline(profileResult.data?.headline??"");
      setAbout(profileResult.data?.about??"");
      setProfileSaved(Boolean(profileResult.data));
      setLedger(ledgerResult.data??[]);
      setPayoutAccounts(accountResult.data??[]);
      setPayouts(payoutResult.data??[]);
      setReferralCodes(referralResult.data??[]);
      if(items.length){
        const {data:versions,error:versionError}=await supabase.from("product_versions")
          .select("id,product_id,version_number,verification_state,created_at,prompt_content,instructions")
          .in("product_id",items.map(item=>item.id)).order("version_number",{ascending:false});
        if(versionError)throw versionError;
        const grouped:Record<string,Array<{id:string;version_number:number;verification_state:string;created_at:string;prompt_content:string;instructions:string}>>={};
        for(const version of versions??[]){(grouped[version.product_id]??=[]).push(version);}
        setVersionHistory(grouped);
      }else setVersionHistory({});
      if(!payoutAccountId&&accountResult.data?.length)setPayoutAccountId(accountResult.data.find(a=>a.status==="verified")?.id??"");
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

  async function createReferralCode(){
    setError("");setNotice("");
    try{
      const {data,error:authError}=await supabase.auth.getUser();if(authError||!data.user)throw new Error("Sign in to continue.");
      const code=`LIST-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
      const {error:insertError}=await supabase.from("referral_codes").insert({owner_id:data.user.id,code,is_active:true});
      if(insertError)throw insertError;
      setNotice("Referral code created. Use it in your product links to attribute sales.");
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Could not create referral code.");}
  }

  async function copyShareLink(product:ProductRow,kind:"link"|"social"){
    const code=referralCodes.find(r=>r.is_active)?.code;
    if(!code){setError("Create a referral code before sharing tracked links.");return;}
    const url=`${window.location.origin}/product/${product.slug}?ref=${encodeURIComponent(code)}&utm_source=creator&utm_medium=social&utm_campaign=listingen`;
    const text=kind==="link"?url:`I created “${product.title}” to help with ${product.short_description.toLowerCase()} Explore it on Listingen: ${url}`;
    await navigator.clipboard.writeText(text);
    setNotice(kind==="link"?"Tracked product link copied.":"Social caption and tracked link copied.");
  }

  async function addPayoutAccount(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");setNotice("");
    if(!recipientCode.trim()||!accountLabel.trim()){setError("Enter the Paystack recipient code and a label.");return;}
    setFinanceBusy(true);
    try{
      const {data,error:authError}=await supabase.auth.getUser();if(authError||!data.user)throw new Error("Sign in to continue.");
      const {error:insertError}=await supabase.from("payout_accounts").insert({
        user_id:data.user.id,provider:"paystack",provider_account_ref:recipientCode.trim(),account_label:accountLabel.trim(),status:"pending",metadata:{}
      });
      if(insertError)throw insertError;
      setRecipientCode("");setAccountLabel("");setNotice("Payout account submitted. It must be verified by an administrator before use.");
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Could not add payout account.");}
    finally{setFinanceBusy(false);}
  }

  async function requestCreatorPayout(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");setNotice("");
    const amount=Number(payoutAmount);
    if(!Number.isFinite(amount)||amount<=0||!payoutAccountId){setError("Enter a valid payout amount and choose a verified account.");return;}
    setFinanceBusy(true);
    try{
      const {data,error:invokeError}=await supabase.functions.invoke("marketplace-finance",{body:{
        action:"request_payout",amount:Math.round(amount*100),currency:payoutCurrency,payoutAccountId
      }});
      if(invokeError)throw new Error(invokeError.message);
      if(data?.error)throw new Error(data.error);
      setPayoutAmount("");setNotice("Payout request submitted and reserved against your available balance.");
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Could not request payout.");}
    finally{setFinanceBusy(false);}
  }

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

  function beginEditListing(listing:ListingRow){
    setEditingListingId(listing.id);setDraftTitle(listing.title);setDraftIdea(listing.idea);
    setDraftOutput(listing.output);setDraftFolder(listing.folder||"Uncategorized");setDraftTags((listing.tags??[]).join(", "));
  }

  async function saveEditedListing(listing:ListingRow){
    setError("");setNotice("");
    try{
      await updateListingDraft({id:listing.id,title:draftTitle,idea:draftIdea,output:draftOutput,folder:draftFolder,tags:draftTags.split(",").map(t=>t.trim()).filter(Boolean)});
      setEditingListingId(null);setNotice("Prompt draft updated.");await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Could not update draft.");}
  }

  async function duplicateDraft(listing:ListingRow){
    setError("");setNotice("");
    try{await duplicateListingDraft(listing);setNotice("Prompt draft duplicated.");await refresh();}
    catch(e){setError(e instanceof Error?e.message:"Could not duplicate draft.");}
  }

  function beginEditProduct(product:ProductRow){
    setEditingProductId(product.id);setProductTitle(product.title);setProductSummary(product.short_description);
    setProductDescription(product.description);setProductPrice((product.price_amount/100).toFixed(2));
    setProductCategory(product.category);setProductCurrency(product.currency);setProductTags(product.tags.join(", "));
  }

  async function saveProductDetails(product:ProductRow){
    setError("");setNotice("");
    const amount=Number(productPrice);
    if(!Number.isFinite(amount)||amount<0){setError("Enter a valid product price.");return;}
    try{
      await updateProductDetails({productId:product.id,title:productTitle,shortDescription:productSummary,description:productDescription,category:productCategory,priceAmount:Math.round(amount*100),currency:productCurrency,tags:productTags.split(",").map(t=>t.trim()).filter(Boolean)});
      setEditingProductId(null);setNotice("Product details saved as a draft. Submit it for review before republishing.");await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Could not update product details.");}
  }

  function beginNewVersion(product:ProductRow){
    const current=versionHistory[product.id]?.[0];
    setEditingVersion(product.id);
    setVersionPrompt(current?.prompt_content??"");
    setVersionInstructions(current?.instructions??"");
    setVersionChangelog("");
  }

  async function saveNewVersion(product:ProductRow){
    setError("");setNotice("");
    try{
      const version=await createProductVersion({productId:product.id,promptContent:versionPrompt,instructions:versionInstructions,changelog:versionChangelog});
      setEditingVersion(null);setNotice(`Version ${version.version_number} saved as a new draft. Submit it for review before it can be published.`);
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Could not create product version.");}
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
          <nav className="flex flex-wrap items-center gap-3 text-sm"><Link to="/marketplace" className="text-muted-foreground hover:text-foreground">Marketplace</Link><Link to="/account" className="text-muted-foreground hover:text-foreground">My account</Link><Link to="/admin" className="text-muted-foreground hover:text-foreground">Admin</Link><button onClick={signOut} className="rounded-lg border border-border px-3 py-2">Sign out</button></nav>
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

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Earnings & payouts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Earnings are credited only after a verified payment webhook. Requested payouts reserve your available balance.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <form onSubmit={addPayoutAccount} className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="font-semibold">Add Paystack recipient</h3>
              <label className="block text-sm font-medium">Account label<input value={accountLabel} onChange={e=>setAccountLabel(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="My primary bank account" /></label>
              <label className="block text-sm font-medium">Paystack recipient code<input value={recipientCode} onChange={e=>setRecipientCode(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="RCP_…" /></label>
              <button disabled={financeBusy} className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50">Submit recipient for verification</button>
              <div className="space-y-1">{payoutAccounts.map(a=><p key={a.id} className="text-xs text-muted-foreground">{a.account_label||a.provider_account_ref} · {a.status}</p>)}</div>
            </form>
            <form onSubmit={requestCreatorPayout} className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="font-semibold">Request a payout</h3>
              <label className="block text-sm font-medium">Verified payout account<select value={payoutAccountId} onChange={e=>setPayoutAccountId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"><option value="">Select account</option>{payoutAccounts.filter(a=>a.status==="verified").map(a=><option key={a.id} value={a.id}>{a.account_label||a.provider_account_ref}</option>)}</select></label>
              <div className="grid grid-cols-[1fr_100px] gap-2"><label className="block text-sm font-medium">Amount<input value={payoutAmount} onChange={e=>setPayoutAmount(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="25.00" /></label><label className="block text-sm font-medium">Currency<select value={payoutCurrency} onChange={e=>setPayoutCurrency(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"><option>USD</option><option>NGN</option><option>GBP</option><option>EUR</option></select></label></div>
              <button disabled={financeBusy||!payoutAccounts.some(a=>a.status==="verified")} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Request payout</button>
              <div className="space-y-1">{payouts.slice(0,5).map(p=><p key={p.id} className="text-xs text-muted-foreground">{(p.amount/100).toFixed(2)} {p.currency} · {p.status}</p>)}</div>
            </form>
          </div>
          <div className="mt-4 rounded-lg bg-muted p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ledger balance</p><div className="mt-2 flex flex-wrap gap-4">{["USD","NGN","GBP","EUR"].map(currency=>{const total=ledger.filter(x=>x.currency===currency).reduce((sum,x)=>sum+x.amount,0);const reserved=payouts.filter(x=>x.currency===currency&&["requested","approved","processing"].includes(x.status)).reduce((sum,x)=>sum+x.amount,0);return <p key={currency} className="text-sm"><strong>{(total-reserved)/100}</strong> {currency}</p>;})}</div></div>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Marketing & distribution</h2><p className="mt-1 text-sm text-muted-foreground">Create tracked referral links and copy social captions for published products.</p></div><button onClick={()=>void createReferralCode()} className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary">Create referral code</button></div>
          <div className="mt-3 flex flex-wrap gap-2">{referralCodes.map(code=><span key={code.id} className="rounded-full bg-muted px-3 py-1.5 text-xs">{code.code} · {code.is_active?"Active":"Inactive"}</span>)}</div>
          {products.filter(p=>p.status==="published").length===0?<p className="mt-4 text-sm text-muted-foreground">Published products will appear here with share links.</p>:<div className="mt-4 space-y-2">{products.filter(p=>p.status==="published").map(product=><div key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"><div><p className="font-semibold">{product.title}</p><p className="text-xs text-muted-foreground">{product.category}</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>void copyShareLink(product,"link")} className="rounded border border-border px-2.5 py-1.5 text-xs">Copy tracked link</button><button onClick={()=>void copyShareLink(product,"social")} className="rounded border border-primary px-2.5 py-1.5 text-xs text-primary">Copy social caption</button></div></div>)}</div>}
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Your prompt library</h2><Link to="/" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Create a prompt</Link></div>
        {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{notice}</p>}
        {loading ? <p className="mt-6 text-sm text-muted-foreground">Loading your creator workspace…</p> : listings.length===0 ? <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center"><h3 className="font-bold">Your library is ready</h3><p className="mt-2 text-sm text-muted-foreground">Generate a prompt and save it to your library. You can then prepare it for marketplace review.</p><Link to="/" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Open prompt generator</Link></div> : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {listings.map(listing=><article key={listing.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{listing.title}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{listing.idea}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{listing.status}</span></div>
              <p className="mt-3 text-xs text-muted-foreground">Folder: {listing.folder||"Uncategorized"} · Saved {new Date(listing.created_at).toLocaleDateString()}</p>
              {listing.tags?.length>0&&<div className="mt-2 flex flex-wrap gap-1">{listing.tags.map(tag=><span key={tag} className="rounded bg-muted px-2 py-1 text-[11px]">{tag}</span>)}</div>}
              {editingListingId===listing.id?<div className="mt-4 space-y-3 border-t border-border pt-4">
                <label className="block text-sm font-medium">Title<input value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
                <label className="block text-sm font-medium">Idea<textarea value={draftIdea} onChange={e=>setDraftIdea(e.target.value)} className="mt-1 min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
                <label className="block text-sm font-medium">Full prompt package<textarea value={draftOutput} onChange={e=>setDraftOutput(e.target.value)} className="mt-1 min-h-48 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs" /></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Folder<input value={draftFolder} onChange={e=>setDraftFolder(e.target.value)} maxLength={60} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" /></label><label className="block text-sm font-medium">Tags (comma separated)<input value={draftTags} onChange={e=>setDraftTags(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" /></label></div>
                <div className="flex gap-2"><button onClick={()=>void saveEditedListing(listing)} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Save changes</button><button onClick={()=>setEditingListingId(null)} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button></div>
              </div>:null}
              {creating===listing.id ? <div className="mt-4 space-y-3 border-t border-border pt-4">
                <label className="block text-sm font-medium">Marketplace category<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2">{categories.map(c=><option key={c}>{c}</option>)}</select></label>
                <label className="block text-sm font-medium">Price (USD)<input inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="4.99" /></label>
                <label className="block text-sm font-medium">Buyer-focused summary<textarea value={shortDescription} onChange={e=>setShortDescription(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="What problem does this prompt solve for buyers?" /></label>
                <div className="flex gap-2"><button onClick={()=>void createProduct(listing)} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Create product draft</button><button onClick={()=>setCreating(null)} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button></div>
              </div> : <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>{setCreating(listing.id);setShortDescription("");}} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Prepare marketplace product</button><button onClick={()=>beginEditListing(listing)} className="rounded-lg border border-border px-3 py-2 text-sm">Edit / organize</button><button onClick={()=>void duplicateDraft(listing)} className="rounded-lg border border-border px-3 py-2 text-sm">Duplicate</button><button onClick={()=>navigator.clipboard.writeText(listing.output)} className="rounded-lg border border-border px-3 py-2 text-sm">Copy full prompt package</button></div>}
            </article>)}
          </div>
        )}

        <section className="mt-10"><h2 className="text-xl font-bold">Marketplace products</h2><p className="mt-1 text-sm text-muted-foreground">Every product moves through draft, review and publication. Saving or submitting never publishes automatically.</p>
          {products.length===0 ? <p className="mt-4 rounded-xl border border-border p-5 text-sm text-muted-foreground">No products yet. Prepare a product from one of your saved prompts above.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{products.map(product=><article key={product.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{product.title}</h3><p className="mt-1 text-sm text-muted-foreground">{product.category} · {(product.price_amount/100).toFixed(2)} {product.currency}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{product.status.replace("_"," ")}</span></div>
              {editingProductId===product.id?<div className="mt-4 space-y-3 border-t border-border pt-4">
                <label className="block text-sm font-medium">Product title<input value={productTitle} onChange={e=>setProductTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
                <label className="block text-sm font-medium">Buyer summary<textarea value={productSummary} onChange={e=>setProductSummary(e.target.value)} className="mt-1 min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
                <label className="block text-sm font-medium">Product description<textarea value={productDescription} onChange={e=>setProductDescription(e.target.value)} className="mt-1 min-h-36 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
                <div className="grid gap-3 sm:grid-cols-3"><label className="block text-sm font-medium">Category<select value={productCategory} onChange={e=>setProductCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2">{categories.map(x=><option key={x}>{x}</option>)}</select></label><label className="block text-sm font-medium">Price<input value={productPrice} onChange={e=>setProductPrice(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" /></label><label className="block text-sm font-medium">Currency<select value={productCurrency} onChange={e=>setProductCurrency(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"><option>USD</option><option>NGN</option><option>GBP</option><option>EUR</option></select></label></div>
                <label className="block text-sm font-medium">Tags (comma separated)<input value={productTags} onChange={e=>setProductTags(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
                <div className="flex gap-2"><button onClick={()=>void saveProductDetails(product)} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Save product draft</button><button onClick={()=>setEditingProductId(null)} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button></div>
              </div>:null}
              <div className="mt-3 flex flex-wrap gap-2">{(versionHistory[product.id]??[]).map(v=><span key={v.id} className="rounded bg-muted px-2 py-1 text-[11px]">v{v.version_number} · {v.verification_state}</span>)}</div>
              {editingVersion===product.id?<div className="mt-4 space-y-3 border-t border-border pt-4">
                <label className="block text-sm font-medium">New prompt version<textarea value={versionPrompt} onChange={e=>setVersionPrompt(e.target.value)} className="mt-1 min-h-36 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
                <label className="block text-sm font-medium">Usage instructions<textarea value={versionInstructions} onChange={e=>setVersionInstructions(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
                <label className="block text-sm font-medium">Change log<textarea value={versionChangelog} onChange={e=>setVersionChangelog(e.target.value)} className="mt-1 min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="What changed in this version?" /></label>
                <div className="flex gap-2"><button onClick={()=>void saveNewVersion(product)} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Save new version</button><button onClick={()=>setEditingVersion(null)} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button></div>
              </div>:<div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>beginEditProduct(product)} className="rounded-lg border border-border px-3 py-2 text-sm">Edit product details</button><button onClick={()=>beginNewVersion(product)} className="rounded-lg border border-border px-3 py-2 text-sm">Create new version</button>{product.status==="draft"||product.status==="rejected"?<button onClick={()=>void submit(product)} className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary">Submit for review</button>:null}</div>}
            </article>)}</div>}
        </section>
      </div>
    </main>
  );
}
