import React, { useState, useMemo, useEffect } from 'react';
import { X, Truck, Save } from 'lucide-react';
import { archiveOrderWithQty } from '../../api/orderService';
import { SIZE_ORDER } from '../../constants/sizes';

const NAVY = '#1e3a5f';

export default function ShipmentResultModal({ order, onClose, onSuccess }) {
  const [shippedQty, setShippedQty] = useState({});
  const [loading, setLoading] = useState(false);

  const getDisplayLabel = (s) => {
    const prefixes = ['B', 'K', 'C', 'S', 'Y', 'U', 'N'];
    return prefixes.includes(s.charAt(0)) && s.length > 1 ? s.substring(1) : s;
  };

  const normalizedCuttingQty = useMemo(() => {
    const qtyKeys = Object.keys(order.qty_by_size || {});
    const labelToKey = {};
    qtyKeys.forEach(k => { labelToKey[getDisplayLabel(k)] = k; });

    const result = {};
    Object.entries(order.cutting_qty || {}).forEach(([k, v]) => {
      const normKey = qtyKeys.includes(k) ? k : (labelToKey[k] || k);
      result[normKey] = (Number(result[normKey] || 0) + Number(v || 0));
    });
    return result;
  }, [order.cutting_qty, order.qty_by_size]);

  const sortedSizes = useMemo(() => {
    return Object.keys(normalizedCuttingQty)
      .filter(size => Number(normalizedCuttingQty[size] || 0) > 0)
      .sort((a, b) => {
        const indexA = SIZE_ORDER.indexOf(a);
        const indexB = SIZE_ORDER.indexOf(b);
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });
  }, [normalizedCuttingQty]);

  useEffect(() => {
    setShippedQty(normalizedCuttingQty);
  }, [normalizedCuttingQty]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await archiveOrderWithQty(order.id, shippedQty);
      onSuccess();
      onClose();
    } catch (err) {
      alert("Hata oluştu, lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

        {/* MODAL HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0" style={{ background: NAVY }}>
          <div className="flex items-center gap-3">
            <Truck size={18} className="text-white/80" />
            <h2 className="text-sm font-black text-white uppercase tracking-tight">Sevkiyat Onayı</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"><X size={18}/></button>
        </div>

        {/* MODAL İÇERİK (BEDENLER) */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-900 leading-none uppercase">{order.article}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{order.model} / {order.color}</p>
          </div>

          <div className="space-y-2">
            <div className="flex text-[8px] font-black text-slate-400 uppercase px-4 mb-2 tracking-widest">
              <span className="flex-1">Beden</span>
              <span className="w-20 text-center">Kesilen</span>
              <span className="w-24 text-center">Yüklenen</span>
            </div>

            {sortedSizes.map(size => (
              <div key={size} className="flex items-center border border-slate-100 p-3 rounded-xl">
                <span className="flex-1 font-black text-slate-700 uppercase text-xs">{getDisplayLabel(size)}</span>
                <span className="w-20 text-center font-bold text-slate-400 text-xs">{normalizedCuttingQty[size] || 0}</span>
                <input
                  type="number"
                  className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-black outline-none focus:ring-1 transition-all"
                  style={{ color: NAVY }}
                  value={shippedQty[size] || 0}
                  onChange={(e) => setShippedQty({...shippedQty, [size]: e.target.value})}
                />
              </div>
            ))}
          </div>
        </div>

        {/* MODAL FOOTER (KAYDET BUTONU) */}
        <div className="p-8 bg-white border-t border-slate-100 shrink-0">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-4 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all hover:opacity-90"
            style={{ background: loading ? '#94a3b8' : NAVY }}
          >
            {loading ? 'KAYDEDİLİYOR...' : <>SEVKİYATI TAMAMLA <Save size={16}/></>}
          </button>
        </div>
      </div>
    </div>
  );
}