import React, { useState, useMemo } from 'react';
import { X, Truck, Save } from 'lucide-react';
import { archiveOrderWithQty } from '../../api/orderService';

export default function ShipmentResultModal({ order, onClose, onSuccess }) {
  const [shippedQty, setShippedQty] = useState(order.cutting_qty || {});
  const [loading, setLoading] = useState(false);

  // 🛠️ BEDEN SIRALAMA ANAHTARI
  const sizeOrder = [
    'XXS', 'XS', 'S', 'M', 'L', 'XL', 
    'XXL', '2XL', '3XL', '4XL', '5XL', 
    '36', '38', '40', '42', '44', '46', '48', '50', '52'
  ];

  // 🛠️ BEDENLERİ SIRALAYAN MOTOR
  const sortedSizes = useMemo(() => {
    return Object.keys(order.qty_by_size || {}).sort((a, b) => {
      const indexA = sizeOrder.indexOf(a.toUpperCase());
      const indexB = sizeOrder.indexOf(b.toUpperCase());
      // Eğer listede yoksa en sona at (99)
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }, [order.qty_by_size]);

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
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg">
              <Truck size={18} />
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Sevkiyat Onayı</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400"><X size={20}/></button>
        </div>
        
        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-900 leading-none uppercase">{order.article}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{order.model} / {order.color}</p>
          </div>

          <div className="space-y-2">
            <div className="flex text-[8px] font-black text-slate-400 uppercase px-4 mb-2">
              <span className="flex-1">Beden</span>
              <span className="w-20 text-center">Kesilen</span>
              <span className="w-24 text-center">Yüklenen</span>
            </div>
            
            {/* 🛠️ ARTIK SIRALI LİSTE DÖNÜYOR */}
            {sortedSizes.map(size => (
              <div key={size} className="flex items-center bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                <span className="flex-1 font-black text-slate-700 uppercase text-xs">{size}</span>
                <span className="w-20 text-center font-bold text-slate-400 text-xs">{order.cutting_qty?.[size] || 0}</span>
                <input 
                  type="number" 
                  className="w-24 p-2 bg-white border border-slate-200 rounded-xl text-center font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={shippedQty[size] || 0}
                  onChange={(e) => setShippedQty({...shippedQty, [size]: e.target.value})}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-white border-t border-slate-50">
          <button 
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-4 ${loading ? 'bg-slate-200' : 'bg-slate-900'} text-white rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all`}
          >
            {loading ? 'KAYDEDİLİYOR...' : <>SEVKİYATI TAMAMLA <Save size={16}/></>}
          </button>
        </div>
      </div>
    </div>
  );
}