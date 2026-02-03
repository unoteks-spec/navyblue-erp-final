import React, { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStage, moveOrderBack } from '../api/orderService';
import { Clock, ChevronRight, Activity, User, Undo2 } from 'lucide-react';

const STAGES = [
  { key: 'kesimhanede', label: 'KESİMHANEDE' },
  { key: 'baski', label: 'BASKIDA' },
  { key: 'nakis', label: 'NAKIŞTA' },
  { key: 'dikim', label: 'DİKİMDE' },
  { key: 'ilik_dugme', label: 'İLİK-DÜĞME' },
  { key: 'yikama_boyama', label: 'YIKAMA-BOYAMA' },
  { key: 'utu_ambalaj', label: 'ÜTÜ AMBALAJ' },
  { key: 'yuklendi', label: 'YÜKLENDİ' }
];

export default function ProductionTrack() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await getAllOrders();
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleMove = async (order, stageIndex) => {
    const nextStage = STAGES[stageIndex];
    if (!nextStage) return;
    await updateOrderStage(order.id, nextStage.key, order.tracking);
    load();
  };

  const handleBack = async (order, stageIndex) => {
    const prevStage = STAGES[stageIndex - 1];
    if (!prevStage) return;
    await moveOrderBack(order.id, prevStage.key);
    load();
  };

  return (
    // 1. STANDART KONTEYNER (Başlık diğer sayfalarla aynı hizada başlasın diye)
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 pb-32">
      
      {/* 2. STANDART BAŞLIK YAPISI */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg">
          <Activity size={20} />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase">Üretim Akışı</h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">Canlı İstasyon Takibi</p>
        </div>
      </div>

      {/* 3. SÜTUNLAR - Konteyner dışına taşabilen yatay alan */}
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-10 snap-x snap-mandatory custom-scrollbar -mx-4 md:-mx-6 px-4 md:px-6">
        {STAGES.map((stage, index) => (
          <div key={stage.key} className="flex flex-col gap-3 min-w-70 md:min-w-[320px] snap-center">
            
            {/* Stage Header - Standart Görünüm */}
            <div className={`p-4 rounded-2xl border-b-4 shadow-sm transition-all ${
              stage.key === 'yuklendi' 
              ? 'bg-emerald-600 border-emerald-800 text-white' 
              : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="text-[8px] font-black opacity-60 mb-0.5 uppercase tracking-widest">AŞAMA {index + 1}</div>
              <h3 className="text-[11px] font-black tracking-widest uppercase truncate">{stage.label}</h3>
            </div>

            {/* Kart Alanı */}
            <div className="flex flex-col gap-3 min-h-[60vh] bg-slate-50/50 p-2 rounded-4xl border-2 border-dashed border-slate-200/50">
              {loading ? (
                <div className="py-20 text-center text-slate-300 font-black text-[8px] animate-pulse uppercase tracking-widest">Yükleniyor...</div>
              ) : orders
                .filter(o => {
                  const hasCutting = o.cutting_qty && Object.values(o.cutting_qty).some(v => Number(v) > 0);
                  const inThisStage = (o.current_stage || 'kesimhanede') === stage.key;
                  return hasCutting && inThisStage;
                })
                .map(order => (
                  <div key={order.id} className="bg-white p-4 rounded-4xl shadow-sm border border-slate-100 group hover:border-blue-400 hover:shadow-md transition-all">
                    
                    <div className="flex gap-3 mb-3">
                      {order.model_image && (
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-50 shrink-0">
                          <img src={order.model_image} className="w-full h-full object-cover" alt="model" />
                        </div>
                      )}
                      <div className="min-w-0 flex flex-col justify-center">
                        <div className="font-black text-xs text-slate-900 tracking-tighter uppercase truncate leading-none mb-1">
                          {order.order_no}
                        </div>
                        <div className="flex items-center gap-1 text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md w-fit uppercase tracking-tighter">
                          <User size={8} /> {order.customer?.substring(0, 15)}
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-3 px-1 leading-tight line-clamp-2">
                      {order.article} <span className="text-slate-200 mx-1">/</span> <span className="text-slate-600 font-black">{order.model}</span>
                    </div>
                    
                    {/* Alt Bilgi & Zaman */}
                    <div className="flex items-center justify-between text-[8px] text-slate-400 font-black mb-4 border-t border-slate-50 pt-3">
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-blue-400" />
                        {order.tracking?.[stage.key] 
                          ? new Date(order.tracking[stage.key]).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : 'GİRİŞ YAPILDI'
                        }
                      </div>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex gap-2">
                      {index > 0 && (
                        <button 
                          onClick={() => handleBack(order, index)}
                          className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 border border-slate-100"
                          title="Geri Al"
                        >
                          <Undo2 size={14} />
                        </button>
                      )}
                      
                      {index < STAGES.length - 1 && (
                        <button 
                          onClick={() => handleMove(order, index + 1)}
                          className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-md active:scale-95 tracking-widest"
                        >
                          İLERLET <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}