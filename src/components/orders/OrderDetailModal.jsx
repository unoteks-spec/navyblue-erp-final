import React, { useMemo } from 'react';
import { X, Printer, Calculator, Scissors, CheckCircle } from 'lucide-react';
import FabricRequirement from './FabricRequirement';

export default function OrderDetailModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  // 🛠️ Toplam Hesaplamaları
  const totals = useMemo(() => {
    const orderQty = Object.values(order.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
    const cutQty = Object.values(order.cut_qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
    return { orderQty, cutQty };
  }, [order]);

  const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', '36', '38', '40', '42', '44', '46', '48', '50', '52'];

  const sortedSizes = useMemo(() => {
    const allSizes = new Set([
      ...Object.keys(order.qty_by_size || {}),
      ...Object.keys(order.cut_qty_by_size || {})
    ]);
    
    return Array.from(allSizes).sort((a, b) => {
      const indexA = sizeOrder.indexOf(a.toUpperCase());
      const indexB = sizeOrder.indexOf(b.toUpperCase());
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }, [order]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{order.order_no}</h2>
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">{order.customer}</span>
            </div>
            <p className="text-sm text-slate-400 font-medium mt-1 uppercase italic">{order.article} - {order.model} / {order.color}</p>
          </div>
          <div className="flex gap-2">
            <button className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 border border-transparent hover:border-slate-200">
              <Printer size={20} />
            </button>
            <button onClick={onClose} className="p-3 bg-white shadow-sm rounded-2xl text-slate-400 hover:text-red-500 transition-all border border-slate-100">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          
          {/* 1. Genel Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-4xl flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                <Calculator size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş Toplamı</p>
                <p className="text-3xl font-black text-slate-900 leading-none mt-1">{totals.orderQty} <span className="text-sm text-slate-400">Pcs</span></p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-4xl flex items-center gap-6">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                <Scissors size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Kesim Toplamı</p>
                <p className="text-3xl font-black text-emerald-900 leading-none mt-1">{totals.cutQty} <span className="text-sm text-emerald-400">Pcs</span></p>
              </div>
            </div>
          </div>

          {/* 2. Kumaş İhtiyaç Analizi */}
          <FabricRequirement order={order} />

          {/* 3. Yan Yana Beden Kartları (Kaydırılabilir Satır) */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
               <CheckCircle className="text-blue-400" size={18} />
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Beden Denge Matrisi</h3>
            </div>
            
            {/* 🚀 KRİTİK ALAN: flex-nowrap ve overflow-x-auto yan yana dizilmeyi garantiler */}
            <div className="flex flex-row flex-nowrap gap-3 overflow-x-auto pb-4 custom-scrollbar">
              {sortedSizes.map(size => {
                const sQty = order.qty_by_size?.[size] || 0;
                const cQty = order.cut_qty_by_size?.[size] || 0;
                const diff = Number(cQty) - Number(sQty);
                
                return (
                  <div key={size} className="shrink-0 w-28 bg-slate-800/40 border border-slate-800 rounded-4xl overflow-hidden flex flex-col shadow-inner">
                    {/* Beden Başlığı */}
                    <div className="bg-slate-800 py-2.5 text-center">
                      <span className="text-xs font-black text-blue-400 uppercase">{size}</span>
                    </div>
                    
                    <div className="p-4 text-center space-y-4">
                      {/* Sipariş */}
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-500 uppercase block tracking-tighter">Sipariş</span>
                        <span className="text-lg font-black text-white">{sQty}</span>
                      </div>

                      <div className="h-px bg-slate-700/50 w-full" />

                      {/* Kesim */}
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-emerald-500 uppercase block tracking-tighter">Kesim</span>
                        <span className="text-lg font-black text-emerald-400">{cQty}</span>
                      </div>

                      {/* Fark Göstergesi */}
                      <div className={`text-[9px] font-black pt-1 border-t border-slate-800/50 ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}