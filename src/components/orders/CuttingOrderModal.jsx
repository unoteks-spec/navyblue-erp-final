import React, { useState } from 'react';
import { X, Scissors, Calendar, Ruler, Printer } from 'lucide-react';
import { updateCuttingDetails } from '../../api/orderService';

export default function CuttingOrderModal({ order, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    cuttingDate: new Date().toISOString().split('T')[0], // Varsayılan bugün
    markerWidth: order.marker_width || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Önce veritabanını güncelliyoruz (En ve Tarih bilgilerini kaydediyoruz)
      await updateCuttingDetails(order.id, data);
      
      // 2. Başarılıysa, güncel veriyi yazdırma şablonuna (Print) gönderiyoruz
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
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Scissors size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tighter">Kesim Hazırlığı</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{order.order_no}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
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
              className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
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
              className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
              value={data.markerWidth} 
              onChange={e => setData({...data, markerWidth: e.target.value})} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white h-14 rounded-3xl font-black text-xs uppercase shadow-xl shadow-blue-200 hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Kaydediliyor..." : <><Printer size={18} /> Emri Oluştur ve Yazdır</>}
          </button>
        </form>
      </div>
    </div>
  );
}