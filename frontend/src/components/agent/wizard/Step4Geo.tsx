"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { Navigation, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { ic, Field } from "./WizardPrimitives";

interface P {
  city: string; setCity(v:string):void;
  address: string; setAddress(v:string):void;
  serviceRadius: number; setServiceRadius(v:number):void;
  lat: number|null; setLat(v:number|null):void;
  lng: number|null; setLng(v:number|null):void;
}
export default function Step4Geo(p: P) {
  const [locStatus, setLocStatus] = useState<"idle"|"loading"|"ok"|"error">("idle");

  const handleLocate = () => {
    if (!navigator.geolocation) { setLocStatus("error"); return; }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: la, longitude: lo } = pos.coords;
        p.setLat(la); p.setLng(lo);
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json`);
          const d = await r.json();
          const a = d.address ?? {};
          p.setCity(a.city ?? a.town ?? a.county ?? a.state_district ?? "");
          p.setAddress(d.display_name?.split(",").slice(0,3).join(",").trim() ?? "");
          setLocStatus("ok");
        } catch { setLocStatus("error"); }
      },
      () => setLocStatus("error"),
      { timeout: 10000 }
    );
  };

  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-4">
      <button type="button" onClick={handleLocate} disabled={locStatus==="loading"}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-all ${locStatus==="ok" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : locStatus==="error" ? "border-red-300 bg-red-50 text-red-600" : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"}`}>
        {locStatus==="loading" ? <Loader2 className="w-4 h-4 animate-spin"/> : locStatus==="ok" ? <CheckCircle2 className="w-4 h-4"/> : locStatus==="error" ? <AlertCircle className="w-4 h-4"/> : <Navigation className="w-4 h-4"/>}
        {locStatus==="loading" ? "Detecting your location…" : locStatus==="ok" ? `📍 Detected: ${p.city}` : locStatus==="error" ? "Could not detect — please enter manually" : "📍 Use Current Location (GPS)"}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" required>
          <input value={p.city} onChange={e=>p.setCity(e.target.value)} placeholder="e.g. Chennai" className={ic} />
        </Field>
        <Field label={`Service Radius — ${p.serviceRadius} km`}>
          <input type="range" min={1} max={50} value={p.serviceRadius} onChange={e=>p.setServiceRadius(Number(e.target.value))} className="w-full accent-primary cursor-pointer mt-3" />
        </Field>
      </div>
      <Field label="Shop Address">
        <input value={p.address} onChange={e=>p.setAddress(e.target.value)} placeholder="e.g. 12, Anna Nagar, Chennai" className={ic} />
      </Field>
      {p.lat && p.lng && (
        <p className="text-xs text-muted-foreground">📡 Coordinates: {p.lat.toFixed(5)}, {p.lng.toFixed(5)}</p>
      )}
    </motion.div>
  );
}
