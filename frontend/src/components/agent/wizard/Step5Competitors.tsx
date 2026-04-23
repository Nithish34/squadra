"use client";
import { motion } from "framer-motion";
import { Plus, Trash2, Globe } from "lucide-react";
import { ic } from "./WizardPrimitives";

export interface Competitor { id: string; name: string; url: string; notes: string; }
export const emptyComp = (): Competitor => ({ id: crypto.randomUUID(), name:"", url:"", notes:"" });

interface P { competitors: Competitor[]; setCompetitors: React.Dispatch<React.SetStateAction<Competitor[]>>; }
export default function Step5Competitors({ competitors, setCompetitors }: P) {
  const add = () => setCompetitors(c=>[...c, emptyComp()]);
  const remove = (id:string) => setCompetitors(c=>c.length>1?c.filter(x=>x.id!==id):c);
  const upd = (id:string, f:keyof Competitor, v:string) => setCompetitors(c=>c.map(x=>x.id===id?{...x,[f]:v}:x));
  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-3">
      <p className="text-xs text-muted-foreground">Add at least one competitor with a URL. Notes are optional.</p>
      {competitors.map(c=>(
        <div key={c.id} className="p-3 rounded-xl border border-border bg-muted/10 space-y-2">
          <div className="flex gap-2 items-center">
            <input value={c.name} onChange={e=>upd(c.id,"name",e.target.value)} placeholder="Brand name" className={`${ic} flex-1`}/>
            <button type="button" onClick={()=>remove(c.id)} disabled={competitors.length===1} className="text-muted-foreground hover:text-red-500 transition p-1.5 disabled:opacity-30">
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          </div>
          <div className="relative">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"/>
            <input value={c.url} onChange={e=>upd(c.id,"url",e.target.value)} placeholder="https://competitor.com" className={`${ic} pl-8`}/>
          </div>
          <input value={c.notes} onChange={e=>upd(c.id,"notes",e.target.value)} placeholder="Optional notes (e.g. strong Instagram presence)" className={`${ic} text-xs`}/>
        </div>
      ))}
      <button type="button" onClick={add} disabled={competitors.length>=10}
        className="w-full py-2 rounded-xl border-2 border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-1.5 disabled:opacity-40">
        <Plus className="w-3.5 h-3.5"/> Add Competitor
      </button>
    </motion.div>
  );
}
