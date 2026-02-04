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
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32">
      
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg">
          <Activity size={20} />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Üretim Akışı</h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-1">Canlı İstasyon Takibi</p>
        </div>
      </div>

      {/* 🛠️ DÜZENLEME 2: Sütunlar bir tık daraltıldı (min-w-64) */}
      <div className="flex gap-3 overflow-x-auto pb-10 snap-x snap-mandatory custom-scrollbar -mx-4 md:-mx-6 px-4 md:px-6">
        {STAGES.map((stage, index) => (
          <div key={stage.key} className="flex flex-col gap-3 min-w-64 md:min-w-70 snap-center">
            
            {/* 🛠️ DÜZENLEME 1: Başlıklar büyütüldü (text-sm/font-black) */}
            <div className={`p-4 rounded-2xl border-b-4 shadow-sm transition-all ${
              stage.key === 'yuklendi' 
              ? 'bg-emerald-600 border-emerald-800 text-white' 
              : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="text-[8px] font-black opacity-60 mb-0.5 uppercase tracking-widest">AŞAMA {index + 1}</div>
              <h3 className="text-xs md:text-sm font-black tracking-widest uppercase truncate">{stage.label}</h3>
            </div>

            <div className="flex flex-col gap-3 min-h-[65vh] bg-slate-50/50 p-2 rounded-4xl border-2 border-dashed border-slate-200/50">
              {loading ? (
                <div className="py-20 text-center text-slate-300 font-black text-[8px] animate-pulse uppercase tracking-widest">Yükleniyor...</div>
              ) : orders
                .filter(o => {
                  const hasCutting = o.cutting_qty && Object.values(o.cutting_qty).some(v => Number(v) > 0);
                  const inThisStage = (o.current_stage || 'kesimhanede') === stage.key;
                  return hasCutting && inThisStage;
                })
                .map(order => (
                  <div key={order.id} className="bg-white p-3.5 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-blue-400 hover:shadow-md transition-all">
                    
                    {/* 🛠️ DÜZENLEME 3: Tarih sağ üste alındı, büyütüldü ve yeşil yapıldı */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2 min-w-0">
                        {order.model_image && (
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-50 shrink-0">
                            <img src={order.model_image} className="w-full h-full object-cover" alt="model" />
                          </div>
                        )}
                        <div className="min-w-0 flex flex-col justify-center">
                          <div className="font-black text-[11px] text-slate-900 tracking-tighter uppercase truncate leading-none mb-1">
                            {order.order_no}
                          </div>
                          <div className="flex items-center gap-1 text-[7px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md w-fit uppercase">
                            <User size={7} /> {order.customer?.substring(0, 12)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                         <div className="flex items-center gap-1 text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase">
                            <Clock size={10} />
                            {order.tracking?.[stage.key] 
                              ? new Date(order.tracking[stage.key]).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
                              : 'GÜNCELLENMEDİ'
                            }
                         </div>
                         <div className="text-[7px] text-slate-300 font-bold mt-0.5 pr-1">İŞLEM TARİHİ</div>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-4 px-1 leading-tight line-clamp-1 border-b border-slate-50 pb-2">
                      {order.article} <span className="text-slate-200 mx-1">/</span> <span className="text-slate-600 font-black">{order.model}</span>
                    </div>

                    <div className="flex gap-2">
                      {index > 0 && (
                        <button 
                          onClick={() => handleBack(order, index)}
                          className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all border border-slate-100"
                          title="Geri Al"
                        >
                          <Undo2 size={12} />
                        </button>
                      )}
                      
                      {index < STAGES.length - 1 && (
                        <button 
                          onClick={() => handleMove(order, index + 1)}
                          className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-md active:scale-95 tracking-tighter"
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