import React, { useState } from 'react';
import { X, Scissors, Calendar, Ruler, Printer } from 'lucide-react';
import { updateCuttingDetails } from '../../api/orderService';

const NAVY = '#1e3a5f';

export default function CuttingOrderModal({ order, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    cuttingDate: new Date().toISOString().split('T')[0],
    markerWidth: order.marker_width || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateCuttingDetails(order.id, data);
      onConfirm({ 
        ...order, 
        cutting_date: data.cuttingDate, 
        marker_width: data.markerWidth 
      });
    } catch (err) {
      alert("Bilgiler kaydedilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-120 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        
        {/* MODAL HEADER */}
        <div className="p-6 text-white flex justify-between items-center" style={{ background: NAVY }}>
          <div className="flex items-center gap-3">
            <Scissors size={18} className="text-white/80" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight">Kesim Hazırlığı</h2>
              <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{order.order_no}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        
        {/* FORM BÖLÜMÜ */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar size={12} /> Kesim Tarihi
            </label>
            <input 
              type="date" 
              required 
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:bg-white transition-all"
              value={data.cuttingDate} 
              onChange={e => setData({...data, cuttingDate: e.target.value})} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Ruler size={12} /> Çizim (Pastal) Eni (cm)
            </label>
            <input 
              type="number" 
              required 
              placeholder="Örn: 185" 
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:bg-white transition-all"
              value={data.markerWidth} 
              onChange={e => setData({...data, markerWidth: e.target.value})} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full text-white h-13 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ background: NAVY }}
          >
            {loading ? "Kaydediliyor..." : <><Printer size={18} /> Emri Oluştur ve Yazdır</>}
          </button>
        </form>
      </div>
    </div>
  );
}