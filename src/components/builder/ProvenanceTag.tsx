'use client';

/**
 * "Where does this number come from?"
 *
 * The pipeline stamps every field with the layer and source it came from, and
 * the build fails on any field that cannot say. That guarantee is the reason
 * this data can be trusted after an audit found 97% of the old statlines wrong
 * — and until now nothing put it in front of a player.
 *
 * Fetched on demand for one entity: the full map is ~915 KB and the question is
 * always about the model on screen.
 */
import React, { useState } from 'react';
import { HelpCircle, Loader2, ShieldCheck, X } from 'lucide-react';

interface FieldSource {
  layer: string;
  source: string;
  /** Set when a second source was checked and agreed. */
  verified?: string;
}

interface Props {
  /** e.g. `unit:5fad-8b9c-8d6a-a2f0` */
  entity: string;
  rulesetId: string;
  /** Show only these fields, in this order. Omit for everything. */
  fields?: string[];
  label?: string;
}

/** `battlescribe:Iron Sultanate.cat@1b463a8` -> something a person can read. */
function describe(s: FieldSource): { where: string; detail: string } {
  const [kind, rest = ''] = s.source.split(/:(.+)/);
  if (kind === 'battlescribe') {
    const [file, commit] = rest.split('@');
    return { where: 'BattleScribe catalogue', detail: `${file}${commit ? ` @${commit}` : ''}` };
  }
  if (kind === 'rulebook') return { where: 'Official rulebook', detail: rest.replace('#', ' — ') };
  if (s.layer !== 'base') return { where: `Layer: ${s.layer}`, detail: rest || s.source };
  return { where: s.layer, detail: rest || s.source };
}

export const ProvenanceTag: React.FC<Props> = ({ entity, rulesetId, fields, label = 'Why?' }) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Record<string, FieldSource> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = async () => {
    setOpen(true);
    if (data || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dataset/provenance?ruleset=${encodeURIComponent(rulesetId)}` +
        `&entity=${encodeURIComponent(entity)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setData(body.fields as Record<string, FieldSource>);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const shown = data
    ? Object.entries(data).filter(([k]) => !fields || fields.includes(k))
        .sort(([a], [b]) => (fields ? fields.indexOf(a) - fields.indexOf(b) : a.localeCompare(b)))
    : [];

  return (
    <>
      <button
        onClick={show}
        className="inline-flex items-center gap-1 text-[10px] font-mono text-[#8E95A5] hover:text-[#D4AF37] transition-colors"
        title="Where these values came from"
      >
        <HelpCircle className="w-3 h-3" />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full sm:max-w-lg max-h-[80dvh] bg-[#161920] border border-[#323846] sm:rounded-md flex flex-col overflow-hidden">
            <header className="flex items-start justify-between gap-3 px-4 py-3 bg-[#20242E] border-b border-[#323846]">
              <div>
                <h3 className="font-gothic font-bold text-sm text-[#ECEFF4]">Where this comes from</h3>
                <p className="text-[10px] font-mono text-[#8E95A5] mt-0.5 break-all">{entity}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center text-[#8E95A5] hover:text-[#ECEFF4]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="overflow-y-auto p-4 space-y-2">
              {busy && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#8E95A5]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking it up…
                </div>
              )}

              {error && (
                <p className="text-[11px] font-mono text-[#E53935] leading-relaxed">{error}</p>
              )}

              {shown.map(([field, src]) => {
                const { where, detail } = describe(src);
                return (
                  <div key={field} className="p-2.5 rounded-sm bg-[#0C0E12] border border-[#323846]">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-[#ECEFF4]">{field}</span>
                      {src.verified && (
                        <span
                          className="inline-flex items-center gap-1 text-[9px] font-mono text-[#4E9A6E]"
                          title={`Cross-checked against ${src.verified}`}
                        >
                          <ShieldCheck className="w-3 h-3" /> verified
                        </span>
                      )}
                      {src.layer !== 'base' && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37]">
                          {src.layer}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[10px] font-mono text-[#8E95A5]">{where}</div>
                    <div className="text-[10px] font-mono text-[#8E95A5] break-all">{detail}</div>
                  </div>
                );
              })}

              {!busy && !error && shown.length === 0 && (
                <p className="text-[11px] font-mono text-[#8E95A5]">Nothing recorded for those fields.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProvenanceTag;
