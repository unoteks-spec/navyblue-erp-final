import React, { useEffect, useState, useMemo } from 'react';
import { X, Scissors, Calculator } from 'lucide-react';
import { updateCuttingResults } from '../../api/orderService';
import { SIZE_ORDER } from '../../constants/sizes';

const NAVY = '#1e3a5f';

export default function CuttingResultModal({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const getDisplayLabel = (s) => {
    const prefixes = ['B', 'K', 'S', 'Y', 'U', 'N'];
    const firstChar = s.charAt(0);
    return prefixes.includes(firstChar) && s.length > 1 ? s.substring(1) : s;
  };

  const sortedSizes = useMemo(() => {
    return Object.keys(order.qty_by_size || {})
      .filter(key => Number(order.qty_by_size[key] || 0) > 0)
      .sort((a, b) => {
        const indexA = SIZE_ORDER.indexOf(a);
        const indexB = SIZE_ORDER.indexOf(b);
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });
  }, [order.qty_by_size]);

  const [results, setResults] = useState({});
  const [details, setDetails] = useState({ cuttingDate: "", markerWidth: "" });

  useEffect(() => {
    if (order) {
      const saved = order.cutting_qty || {};
      const init = {};
      sortedSizes.forEach(s => init[s] = saved[s] ?? order.qty_by_size[s] ?? 0);
      setResults(init);
      setDetails({
        cuttingDate: order.cutting_date || new Date().toISOString().split('T')[0],
        markerWidth: order.marker_width || ""
      });
    }
  }, [order, sortedSizes]);

  const currentTotal = useMemo(() => Object.values(results).reduce((a, b) => a + (Number(b) || 0), 0), [results]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateCuttingResults(order.id, results, details);
      onSuccess();
      onClose();
    } catch (err) { alert("Hata: " + err.message); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-200 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 text-slate-900">
      <div className="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">

        <div className="px-6 py-4 flex justify-between items-center text-white shrink-0" style={{ background: NAVY }}>
          <div className="flex items-center gap-2 text-white">
            <Scissors size={16} />
            <h2 className="text-xs font-black uppercase tracking-tight">Kesim Girişi: {order.order_no}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <form id="cutting-form" onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="border border-slate-100 rounded-xl p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Calculator size={18} style={{ color: NAVY }} />
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Toplam Kesim</p>
                <div className="text-xl font-black text-slate-900">{currentTotal} ADET</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border border-slate-100 p-4 rounded-xl">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Kesim Tarihi</label>
              <input type="date" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none text-slate-900" value={details.cuttingDate} onChange={e => setDetails({...details, cuttingDate: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase ml-1 text-slate-400 tracking-widest">En (cm)</label>
              <input type="number" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none text-slate-900" value={details.markerWidth} onChange={e => setDetails({...details, markerWidth: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {sortedSizes.map(size => (
              <div key={size} className="p-2 border border-slate-100 rounded-lg">
                <label className="text-[8px] font-black text-slate-400 uppercase block mb-1 text-center tracking-widest">
                  {getDisplayLabel(size)}
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 rounded-lg p-2 font-black text-center text-sm outline-none text-slate-900 border border-slate-200"
                  value={results[size] ?? ""}
                  onChange={e => setResults({...results, [size]: e.target.value})}
                />
              </div>
            ))}
          </div>
        </form>

        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
          <button
            type="submit"
            form="cutting-form"
            disabled={loading}
            className="w-full text-white h-12 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
            style={{ background: NAVY }}
          >
            {loading ? "GÜNCELLENİYOR..." : "KAYDET VE KAPAT"}
          </button>
        </div>
      </div>
    </div>
  );
}