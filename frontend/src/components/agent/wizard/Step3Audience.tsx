"use client";
import { motion } from "framer-motion";
import { ic, Field, Chips } from "./WizardPrimitives";

const GOALS = ["Increase Sales","Increase Local Awareness","Beat Competitors","Improve Retention","Increase Footfall","Launch New Product","Improve Online Presence"];
const POSITIONING = ["Budget","Premium","Handmade","Eco-Friendly","Luxury","Fast Delivery","Local Community Brand"];
const SPENDING = ["Low","Mid","High"];

interface P {
  targetAudience: string; setTargetAudience(v:string):void;
  ageGroup: string; setAgeGroup(v:string):void;
  incomeLevel: string; setIncomeLevel(v:string):void;
  spendingLevel: string; setSpendingLevel(v:string):void;
  businessGoal: string; setBusinessGoal(v:string):void;
  brandPositioning: string; setBrandPositioning(v:string):void;
  budget: number; setBudget(v:number):void;
}
export default function Step3Audience(p: P) {
  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target Audience" required>
          <input value={p.targetAudience} onChange={e=>p.setTargetAudience(e.target.value)} placeholder="e.g. College students" className={ic} />
        </Field>
        <Field label="Age Group">
          <input value={p.ageGroup} onChange={e=>p.setAgeGroup(e.target.value)} placeholder="e.g. 18–25" className={ic} />
        </Field>
        <Field label="Income Level">
          <input value={p.incomeLevel} onChange={e=>p.setIncomeLevel(e.target.value)} placeholder="e.g. Low-Mid" className={ic} />
        </Field>
        <Field label="Monthly Budget (₹)">
          <input type="number" min={0} value={p.budget||""} onChange={e=>p.setBudget(Number(e.target.value))} placeholder="e.g. 15000" className={ic} />
        </Field>
      </div>
      <Field label="Spending Level">
        <Chips options={SPENDING} value={p.spendingLevel} onChange={p.setSpendingLevel} />
      </Field>
      <Field label="Business Goal" required>
        <Chips options={GOALS} value={p.businessGoal} onChange={p.setBusinessGoal} />
      </Field>
      <Field label="Brand Positioning">
        <Chips options={POSITIONING} value={p.brandPositioning} onChange={p.setBrandPositioning} />
      </Field>
    </motion.div>
  );
}
