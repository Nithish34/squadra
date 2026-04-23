"use client";
import { motion } from "framer-motion";
import { ic, Field, Chips, MultiChips, Toggle } from "./WizardPrimitives";

const PLATFORMS = ["Swiggy","Zomato","Dunzo","Porter","Blinkit","Self-Delivery"];

interface P {
  productName: string; setProductName(v:string):void;
  priceRange: string; setPriceRange(v:string):void;
  avgPrice: string; setAvgPrice(v:string):void;
  discountRange: string; setDiscountRange(v:string):void;
  currentPrice: string; setCurrentPrice(v:string):void;
  usp: string; setUsp(v:string):void;
  delivery: boolean; setDelivery(v:boolean):void;
  deliveryRadius: number; setDeliveryRadius(v:number):void;
  deliveryPlatforms: string[]; setDeliveryPlatforms(v:string[]):void;
}
export default function Step2Products(p: P) {
  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Product / Service Name" required>
            <input value={p.productName} onChange={e=>p.setProductName(e.target.value)} placeholder="e.g. Cold Coffee" className={ic} />
          </Field>
        </div>
        <Field label="Price Range">
          <input value={p.priceRange} onChange={e=>p.setPriceRange(e.target.value)} placeholder="e.g. ₹120–₹180" className={ic} />
        </Field>
        <Field label="Average Price">
          <input value={p.avgPrice} onChange={e=>p.setAvgPrice(e.target.value)} placeholder="e.g. ₹150" className={ic} />
        </Field>
        <Field label="Current Price">
          <input value={p.currentPrice} onChange={e=>p.setCurrentPrice(e.target.value)} placeholder="e.g. ₹140" className={ic} />
        </Field>
        <Field label="Discount Range">
          <input value={p.discountRange} onChange={e=>p.setDiscountRange(e.target.value)} placeholder="e.g. 10%–20%" className={ic} />
        </Field>
        <div className="col-span-2">
          <Field label="Unique Selling Point (USP)">
            <input value={p.usp} onChange={e=>p.setUsp(e.target.value)} placeholder="e.g. Fast delivery near colleges" className={ic} />
          </Field>
        </div>
      </div>
      <Toggle label="Delivery Available" sub="Enable if you offer home delivery" value={p.delivery} onChange={p.setDelivery} />
      {p.delivery && (
        <div className="space-y-3">
          <Field label={`Delivery Radius — ${p.deliveryRadius} km`}>
            <input type="range" min={1} max={30} value={p.deliveryRadius} onChange={e=>p.setDeliveryRadius(Number(e.target.value))} className="w-full accent-primary cursor-pointer mt-2" />
          </Field>
          <Field label="Delivery Platforms">
            <MultiChips options={PLATFORMS} value={p.deliveryPlatforms} onChange={p.setDeliveryPlatforms} />
          </Field>
        </div>
      )}
    </motion.div>
  );
}
