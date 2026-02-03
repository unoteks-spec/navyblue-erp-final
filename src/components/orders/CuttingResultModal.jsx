import React, { useState, useEffect, useMemo } from 'react';
import { X, Scissors, Calculator, Calendar, Ruler } from 'lucide-react';
import { updateCuttingResults } from '../../api/orderService';

export default function CuttingResultModal({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
  const sortedSizes = Object.keys(order.qty_by_size || {}).sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));

  const [results, setResults] = useState({});
  const [details, setDetails] = useState({ cuttingDate: "", markerWidth: "" });

  // ✅ VERİYİ ZORLA TAZELE: Modal açıldığında DB'den gelen veriyi state'e yazar
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
  }, [order.id]);

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
      <div className="bg-white w-full max-w-md rounded-4xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2 text-white"><Scissors size={18} /><h2 className="text-xs font-black uppercase italic tracking-tighter">Kesim Girişi: {order.order_no}</h2></div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-900 rounded-2xl p-4 flex justify-between items-center">
            <div className="flex items-center gap-3"><Calculator className="text-emerald-400" size={20} />
              <div><p className="text-[8px] font-black text-slate-500 uppercase">Toplam Üretim</p><div className="text-xl font-black text-white italic">{currentTotal} ADET</div></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Kesim Tarihi</label>
              <input type="date" className="w-full h-10 px-3 bg-white border rounded-xl text-xs font-bold outline-none text-slate-900" value={details.cuttingDate} onChange={e => setDetails({...details, cuttingDate: e.target.value})} />
            </div>
            <div className="space-y-1"><label className="text-[9px] font-black uppercase ml-1 text-slate-400">En (cm)</label>
              <input type="number" className="w-full h-10 px-3 bg-white border rounded-xl text-xs font-bold outline-none text-slate-900" value={details.markerWidth} onChange={e => setDetails({...details, markerWidth: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {sortedSizes.map(size => (
              <div key={size} className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                <label className="text-[8px] font-black text-slate-400 uppercase block mb-1 text-center">{size}</label>
                <input type="number" className="w-full bg-white rounded-lg p-2 font-black text-center text-sm outline-none text-slate-900" value={results[size] ?? ""} onChange={e => setResults({...results, [size]: e.target.value})} />
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white h-12 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-slate-900 transition-all">
            {loading ? "GÜNCELLENİYOR..." : "KAYDET VE KAPAT"}
          </button>
        </form>
      </div>
    </div>
  );
}