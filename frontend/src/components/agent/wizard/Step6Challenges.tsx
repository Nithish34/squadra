"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X, ShieldCheck } from "lucide-react";
import { ic, Field, Toggle } from "./WizardPrimitives";

interface P {
  challenges: string[]; setChallenges(v:string[]):void;
  keywords: string; setKeywords(v:string):void;
  instagram: string; setInstagram(v:string):void;
  facebook: string; setFacebook(v:string):void;
  hitl: boolean; setHitl(v:boolean):void;
}
export default function Step6Challenges(p: P) {
  const [draft, setDraft] = useState("");

  const addChallenge = () => {
    const t = draft.trim();
    if (t && !p.challenges.includes(t)) { p.setChallenges([...p.challenges, t]); setDraft(""); }
  };

  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-4">
      <Field label="Current Business Challenges">
        <div className="flex gap-2">
          <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addChallenge())}
            placeholder="e.g. Weak Instagram presence" className={`${ic} flex-1`}/>
          <button type="button" onClick={addChallenge} className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition flex-shrink-0">
            <Plus className="w-4 h-4"/>
          </button>
        </div>
        {p.challenges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {p.challenges.map((c,i)=>(
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-2 py-1">
                {c}
                <button type="button" onClick={()=>p.setChallenges(p.challenges.filter((_,j)=>j!==i))}><X className="w-3 h-3"/></button>
              </span>
            ))}
          </div>
        )}
      </Field>

      <Field label="Keywords (comma-separated)">
        <input value={p.keywords} onChange={e=>p.setKeywords(e.target.value)} placeholder="e.g. cold brew, student cafe" className={ic}/>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Instagram Handle">
          <input value={p.instagram} onChange={e=>p.setInstagram(e.target.value)} placeholder="@yourbrand" className={ic}/>
        </Field>
        <Field label="Facebook Page URL">
          <input value={p.facebook} onChange={e=>p.setFacebook(e.target.value)} placeholder="facebook.com/page" className={ic}/>
        </Field>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600"/>
          <div>
            <p className="text-sm font-medium text-foreground">Scout HITL Mode</p>
            <p className="text-xs text-muted-foreground">Pause after Scout for human review</p>
          </div>
        </div>
        <button type="button" id="hitl-toggle" onClick={()=>p.setHitl(!p.hitl)}
          className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${p.hitl?"bg-primary":"bg-border"}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${p.hitl?"left-6":"left-1"}`}/>
        </button>
      </div>
    </motion.div>
  );
}
