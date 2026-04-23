"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Rocket, ChevronLeft, ChevronRight, Loader2, CheckCircle2, AlertCircle, X, Zap, ShieldCheck, Package } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAgentStore } from "@/store/agentStore";
import { apiCreateMission } from "@/lib/api";
import Step1Business from "./wizard/Step1Business";
import Step2Products from "./wizard/Step2Products";
import Step3Audience from "./wizard/Step3Audience";
import Step4Geo from "./wizard/Step4Geo";
import Step5Competitors, { emptyComp, type Competitor } from "./wizard/Step5Competitors";
import Step6Challenges from "./wizard/Step6Challenges";

const STEPS = ["Business","Products","Audience","Location","Competitors","Launch"];

export default function MissionPanel() {
  const profile = useAuthStore(s=>s.profile);
  const { connectStream, reset } = useAgentStore();

  // Step
  const [step, setStep] = useState(0);

  // Step 1
  const [businessName, setBusinessName] = useState(profile?.companyName ?? "");
  const [businessCategory, setBusinessCategory] = useState("");
  const [niche, setNiche] = useState("ecommerce");
  const [website, setWebsite] = useState("");
  const [businessStage, setBusinessStage] = useState("");
  const [businessType, setBusinessType] = useState("");

  // Step 2
  const [productName, setProductName] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [discountRange, setDiscountRange] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [usp, setUsp] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [deliveryRadius, setDeliveryRadius] = useState(4);
  const [deliveryPlatforms, setDeliveryPlatforms] = useState<string[]>([]);

  // Step 3
  const [targetAudience, setTargetAudience] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [incomeLevel, setIncomeLevel] = useState("");
  const [spendingLevel, setSpendingLevel] = useState("");
  const [businessGoal, setBusinessGoal] = useState("");
  const [brandPositioning, setBrandPositioning] = useState("");
  const [budget, setBudget] = useState(0);

  // Step 4
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [serviceRadius, setServiceRadius] = useState(5);
  const [lat, setLat] = useState<number|null>(null);
  const [lng, setLng] = useState<number|null>(null);

  // Step 5
  const [competitors, setCompetitors] = useState<Competitor[]>([emptyComp()]);

  // Step 6
  const [challenges, setChallenges] = useState<string[]>([]);
  const [keywords, setKeywords] = useState(profile?.products.map(p=>p.name).join(", ") ?? "");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [hitl, setHitl] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Launch
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string|null>(null);

  const validComps = competitors.filter(c=>c.name.trim()&&c.url.trim());
  const stepValid = [
    !!businessName.trim(),
    !!productName.trim(),
    !!businessGoal,
    !!city.trim(),
    validComps.length > 0,
    true,
  ];
  const canLaunch = stepValid.every(Boolean);

  const handleLaunch = async () => {
    setLaunching(true); setError(null); setResult(null); reset();
    try {
      const socialLinks = [instagram, facebook].filter(Boolean);
      const data = await apiCreateMission({
        business_name: businessName.trim(), niche, city: city.trim(), country:"IN",
        competitors: validComps.map(({name,url,notes})=>({name,url,social_handle:undefined})),
        keywords: keywords.split(",").map(k=>k.trim()).filter(Boolean),
        shopify_product_ids: selectedProductIds, instagram_post: true, enable_scout_hitl: hitl,
        business_category: businessCategory, business_type: businessType,
        address, service_radius_km: serviceRadius, latitude: lat, longitude: lng,
        product_name: productName, price_range: priceRange, avg_price: avgPrice,
        discount_range: discountRange, current_price: currentPrice, usp,
        target_audience: targetAudience, age_group: ageGroup, income_level: incomeLevel,
        spending_level: spendingLevel, business_goal: businessGoal,
        brand_positioning: brandPositioning, monthly_budget: budget,
        website, social_links: socialLinks,
        delivery_enabled: delivery, delivery_radius_km: deliveryRadius,
        delivery_platforms: deliveryPlatforms, business_challenges: challenges,
      });
      setResult(data);
      connectStream(data.mission_id);
    } catch(err) {
      const msg = err instanceof Error ? err.message : "Unknown error.";
      setError(msg.includes("401") ? "Session expired — sign in again." : msg.includes("422") ? "Invalid config. Check competitor URLs." : msg);
    } finally { setLaunching(false); }
  };

  return (
    <div className="glass rounded-2xl border border-border/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-soft">
            <Rocket className="w-4 h-4 text-primary-foreground"/>
          </div>
          <div>
            <h2 className="font-display font-semibold text-foreground text-sm leading-tight">Mission Setup</h2>
            <p className="text-xs text-muted-foreground">Business Intelligence Intake</p>
          </div>
        </div>
        {result && <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Live</span>}
      </div>

      {/* Step indicator */}
      <div className="px-5 pt-4">
        <div className="flex items-center gap-1">
          {STEPS.map((s,i)=>(
            <button key={s} type="button" onClick={()=>setStep(i)} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${i===step ? "gradient-primary text-primary-foreground shadow-soft" : i<step ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                {i < step ? "✓" : i+1}
              </div>
              <span className={`text-[9px] font-medium hidden sm:block ${i===step?"text-primary":i<step?"text-emerald-600":"text-muted-foreground"}`}>{s}</span>
            </button>
          ))}
        </div>
        <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
          <motion.div className="h-full gradient-primary rounded-full" animate={{width:`${((step+1)/STEPS.length)*100}%`}} transition={{duration:0.3}}/>
        </div>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto max-h-[65vh]">
        {/* Alerts */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"/>
              <div className="flex-1"><p className="text-sm font-semibold text-green-800">Mission launched!</p><p className="text-xs text-green-700 font-mono break-all mt-0.5">ID: {result.mission_id} · {result.mode}</p></div>
              <button onClick={()=>setResult(null)}><X className="w-4 h-4 text-green-500"/></button>
            </motion.div>
          )}
          {error && (
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>
              <div className="flex-1"><p className="text-sm font-semibold text-red-700">Launch failed</p><p className="text-xs text-red-600 mt-0.5">{error}</p></div>
              <button onClick={()=>setError(null)}><X className="w-4 h-4 text-red-400"/></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step content */}
        <AnimatePresence mode="wait">
          {step===0 && <Step1Business key="s1" businessName={businessName} setBusinessName={setBusinessName} niche={niche} setNiche={setNiche} website={website} setWebsite={setWebsite} businessStage={businessStage} setBusinessStage={setBusinessStage} businessType={businessType} setBusinessType={setBusinessType} businessCategory={businessCategory} setBusinessCategory={setBusinessCategory}/>}
          {step===1 && <Step2Products key="s2" productName={productName} setProductName={setProductName} priceRange={priceRange} setPriceRange={setPriceRange} avgPrice={avgPrice} setAvgPrice={setAvgPrice} discountRange={discountRange} setDiscountRange={setDiscountRange} currentPrice={currentPrice} setCurrentPrice={setCurrentPrice} usp={usp} setUsp={setUsp} delivery={delivery} setDelivery={setDelivery} deliveryRadius={deliveryRadius} setDeliveryRadius={setDeliveryRadius} deliveryPlatforms={deliveryPlatforms} setDeliveryPlatforms={setDeliveryPlatforms}/>}
          {step===2 && <Step3Audience key="s3" targetAudience={targetAudience} setTargetAudience={setTargetAudience} ageGroup={ageGroup} setAgeGroup={setAgeGroup} incomeLevel={incomeLevel} setIncomeLevel={setIncomeLevel} spendingLevel={spendingLevel} setSpendingLevel={setSpendingLevel} businessGoal={businessGoal} setBusinessGoal={setBusinessGoal} brandPositioning={brandPositioning} setBrandPositioning={setBrandPositioning} budget={budget} setBudget={setBudget}/>}
          {step===3 && <Step4Geo key="s4" city={city} setCity={setCity} address={address} setAddress={setAddress} serviceRadius={serviceRadius} setServiceRadius={setServiceRadius} lat={lat} setLat={setLat} lng={lng} setLng={setLng}/>}
          {step===4 && <Step5Competitors key="s5" competitors={competitors} setCompetitors={setCompetitors}/>}
          {step===5 && <Step6Challenges key="s6" challenges={challenges} setChallenges={setChallenges} keywords={keywords} setKeywords={setKeywords} instagram={instagram} setInstagram={setInstagram} facebook={facebook} setFacebook={setFacebook} hitl={hitl} setHitl={setHitl}/>}
        </AnimatePresence>

        {/* Products (step 5 extra) */}
        {step===4 && profile?.products && profile.products.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Your Products <span className="font-normal text-muted-foreground/60">(select to track)</span></p>
            <div className="grid grid-cols-2 gap-2">
              {profile.products.map(p=>{
                const sel = selectedProductIds.includes(p.id);
                return <button key={p.id} type="button" onClick={()=>setSelectedProductIds(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs transition-all ${sel?"border-primary/50 bg-primary/8 text-primary font-medium":"border-border bg-background text-foreground hover:border-primary/30"}`}>
                  <Package className={`w-3 h-3 flex-shrink-0 ${sel?"text-primary":"text-muted-foreground"}`}/><span className="truncate">{p.name}</span>
                </button>;
              })}
            </div>
          </div>
        )}

        {/* Validation hint */}
        {step < STEPS.length-1 && !stepValid[step] && (
          <p className="text-xs text-amber-600 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0"/>
            {[
              "Business name is required.",
              "Product name is required.",
              "Please select a business goal.",
              "City is required.",
              "Add at least one competitor with a URL.",
              "",
            ][step]}
          </p>
        )}
      </div>

      {/* Navigation footer */}
      <div className="px-5 pb-5 flex items-center gap-3 border-t border-border/40 pt-4">
        <button type="button" onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition disabled:opacity-30 px-3 py-2 rounded-xl border border-border hover:bg-muted/30">
          <ChevronLeft className="w-4 h-4"/> Back
        </button>
        <div className="flex-1"/>
        {step < STEPS.length-1 ? (
          <button type="button" onClick={()=>setStep(s=>Math.min(STEPS.length-1,s+1))}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary-foreground gradient-primary px-4 py-2 rounded-xl shadow-soft hover:opacity-90 transition">
            Next <ChevronRight className="w-4 h-4"/>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${hitl?"bg-amber-50 border-amber-200 text-amber-700":"bg-blue-50 border-blue-200 text-blue-700"}`}>
              {hitl?<ShieldCheck className="w-3 h-3"/>:<Zap className="w-3 h-3"/>}
              {hitl?"Scout HITL":"Autonomous"}
            </div>
            <button id="launch-mission-btn" type="button" onClick={handleLaunch} disabled={!canLaunch||launching}
              className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl shadow-soft hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              {launching?<><Loader2 className="w-4 h-4 animate-spin"/>Launching…</>:<><Rocket className="w-4 h-4"/>Launch Mission</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
