"use client";
import { motion } from "framer-motion";
import { Navigation, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { ic, Field, Chips } from "./WizardPrimitives";

const NICHES = ["ecommerce","local_services","food_beverage","fashion","electronics","health_wellness","education","beauty_personal_care","real_estate","fitness"];
const NICHE_LABELS: Record<string,string> = { ecommerce:"E-Commerce", local_services:"Local Services", food_beverage:"Food & Beverage", fashion:"Fashion", electronics:"Electronics", health_wellness:"Health & Wellness", education:"Education", beauty_personal_care:"Beauty & Personal Care", real_estate:"Real Estate", fitness:"Fitness & Sports" };
const BIZ_TYPES = ["Local Retail","D2C","Franchise","Online","Service Provider","Hybrid"];
const STAGES = ["New","Growing","Established","Declining"];

interface P {
  businessName: string; setBusinessName(v:string):void;
  niche: string; setNiche(v:string):void;
  website: string; setWebsite(v:string):void;
  businessStage: string; setBusinessStage(v:string):void;
  businessType: string; setBusinessType(v:string):void;
  businessCategory: string; setBusinessCategory(v:string):void;
}
export default function Step1Business(p: P) {
  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Business Name" required>
            <input value={p.businessName} onChange={e=>p.setBusinessName(e.target.value)} placeholder="e.g. Nithish Coffee Shop" className={ic} />
          </Field>
        </div>
        <Field label="Category">
          <input value={p.businessCategory} onChange={e=>p.setBusinessCategory(e.target.value)} placeholder="e.g. Cafe, Retail" className={ic} />
        </Field>
        <Field label="Niche" required>
          <select value={p.niche} onChange={e=>p.setNiche(e.target.value)} className={`${ic} appearance-none`}>
            {NICHES.map(n=><option key={n} value={n}>{NICHE_LABELS[n]}</option>)}
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="Website URL">
            <input value={p.website} onChange={e=>p.setWebsite(e.target.value)} placeholder="https://yourbusiness.com" className={ic} />
          </Field>
        </div>
      </div>
      <Field label="Business Type">
        <Chips options={BIZ_TYPES} value={p.businessType} onChange={p.setBusinessType} />
      </Field>
      <Field label="Business Stage">
        <Chips options={STAGES} value={p.businessStage} onChange={p.setBusinessStage} />
      </Field>
    </motion.div>
  );
}
