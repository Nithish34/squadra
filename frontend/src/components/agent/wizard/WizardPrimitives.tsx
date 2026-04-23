"use client";
/** Shared field primitives for the Mission Setup wizard */

export const ic = "w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition";
export const lc = "block text-xs font-medium text-muted-foreground mb-1";

interface FProps { label: string; required?: boolean; children: React.ReactNode }
export function Field({ label, required, children }: FProps) {
  return (
    <div>
      <label className={lc}>{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

interface ChipsProps { options: string[]; value: string; onChange: (v: string) => void }
export function Chips({ options, value, onChange }: ChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(value === o ? "" : o)}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${value === o ? "border-primary/50 bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/30"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

interface MultiChipsProps { options: string[]; value: string[]; onChange: (v: string[]) => void }
export function MultiChips({ options, value, onChange }: MultiChipsProps) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${value.includes(o) ? "border-primary/50 bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/30"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

interface ToggleProps { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }
export function Toggle({ label, sub, value, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${value ? "bg-primary" : "bg-border"}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${value ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
