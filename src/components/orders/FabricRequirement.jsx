import React from 'react';
import { Pipette, Scale, Boxes } from 'lucide-react';

const NAVY = '#1e3a5f';

export default function FabricRequirement({ order }) {
  const extraPercent = Number(order.extra_percent) || 0;
  
  const baseTotal = Object.values(order.qty_by_size || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalPieces = Math.ceil(baseTotal * (1 + extraPercent / 100));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Boxes size={16} /> Satın Alma Hesaplaması
        </h3>
        <span className="text-[10px] bg-slate-50 px-2 py-1 rounded-lg font-bold border border-slate-200" style={{ color: NAVY }}>
          +{extraPercent}% Kesim Fazlası Dahil
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(order.fabrics || {}).map(([key, fabric]) => {
          if (!fabric.kind || !fabric.perPieceKg) return null;
          
          const requirement = (totalPieces * Number(fabric.perPieceKg)).toFixed(2);

          return (
            <div key={key} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-slate-200 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={key === 'main' ? { background: NAVY, color: '#fff' } : { background: '#e2e8f0', color: '#64748b' }}>
                  <Pipette size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                    {key === 'main' ? 'ANA KUMAŞ' : `GARNİ ${key.replace('g', '')}`}
                  </div>
                  <div className="text-sm font-black text-slate-700">{fabric.kind}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Gereken Miktar</div>
                <div className="text-lg font-black tracking-tight" style={{ color: NAVY }}>
                  {requirement} <span className="text-xs">KG</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}