import React, { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStage, moveOrderBack, supabase } from '../api/orderService';
import { 
  Clock, ChevronRight, Activity, User, Undo2, Hash, Archive, PackageCheck, AlertCircle, ClipboardCheck, Truck
} from 'lucide-react';

// 🛠️ SEVKİYAT SONUÇ MODALI
import ShipmentResultModal from '../components/orders/ShipmentResultModal';

const STAGES = [
  { key: 'kesimhanede', label: 'KESİMHANE', isFason: false },
  { key: 'baski', label: 'BASKIDA', isFason: true },
  { key: 'nakis', label: 'NAKIŞTA', isFason: true },
  { key: 'dikim', label: 'DİKİMDE', isFason: true },
  { key: 'ilik_dugme', label: 'İLİK-DÜĞME', isFason: true },
  { key: 'yikama_boyama', label: 'YIKAMA-BOYAMA', isFason: true },
  { key: 'utu_ambalaj', label: 'ÜTÜ AMBALAJ', isFason: true }, // ✅ ARTIK TAKİP EDİLEBİLİR
  { key: 'yuklendi', label: 'YÜKLENDİ', isFason: false }
];

export default function ProductionTrack() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shipmentModalOrder, setShipmentModalOrder] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllOrders();
      setOrders(data || []);
    } catch (error) {
      console.error("Yükleme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // 🛠️ SEVKİYATI BAŞLAT (Fason takibi tetikler)
  const startWaybillTracking = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          waybill_tracking_active: true,
          is_waybill_issued: false,
          current_waybill_no: null 
        })
        .eq('id', orderId);
      
      if (!error) load();
    } catch (err) {
      alert("Takip başlatılamadı.");
    }
  };

  // 🛠️ QNB İRSALİYE NO KAYDET
  const handleSaveWaybill = async (orderId, waybillNo) => {
    if (!waybillNo) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          current_waybill_no: waybillNo,
          is_waybill_issued: true 
        })
        .eq('id', orderId);
      
      if (!error) load();
    } catch (err) {
      alert("İrsaliye kaydedilemedi.");
    }
  };

  // 🛠️ İLERİ TAŞIMA (Yeni durağa geçerken eski irsaliye takibi sıfırlanır)
  const handleMove = async (order, stageIndex) => {
    const nextStage = STAGES[stageIndex];
    if (!nextStage) return;

    try {
      await supabase
        .from('orders')
        .update({ 
          waybill_tracking_active: false, 
          is_waybill_issued: false, 
          current_waybill_no: null 
        })
        .eq('id', order.id);

      await updateOrderStage(order.id, nextStage.key, order.tracking);
      await load();
    } catch (err) {
      alert("İlerleme sırasında hata oluştu.");
    }
  };

  const handleBack = async (order, stageIndex) => {
    const prevStage = STAGES[stageIndex - 1];
    if (!prevStage) return;
    try {
      await moveOrderBack(order.id, prevStage.key);
      await load();
    } catch (err) {
      alert("Geri alma sırasında hata oluştu.");
    }
  };

  const handleArchive = (order) => {
    setShipmentModalOrder(order);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32">
      
      {/* ÜST PANEL: BAŞLIK VE İSTATİSTİK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-lg">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Üretim Akışı</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-1">Navy Blue Canlı İstasyon Takibi</p>
          </div>
        </div>
        
        <div className="flex gap-2">
            <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
                <PackageCheck size={14} className="text-emerald-500"/>
                <span className="text-[10px] font-black text-slate-900 uppercase">Aktif İş: {orders.filter(o => !o.is_archived && o.status !== 'archived').length}</span>
            </div>
            <div className="bg-red-50 px-4 py-2 rounded-2xl border border-red-100 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-600 animate-pulse"/>
                <span className="text-[10px] font-black text-red-600 uppercase">İrsaliye Bekleyen: {orders.filter(o => o.waybill_tracking_active && !o.is_waybill_issued).length}</span>
            </div>
        </div>
      </div>

      {/* ANA AKIŞ SÜTUNLARI */}
      <div className="flex gap-4 overflow-x-auto pb-10 snap-x snap-mandatory custom-scrollbar -mx-4 md:-mx-6 px-4 md:px-6">
        {STAGES.map((stage, index) => (
          <div key={stage.key} className="flex flex-col gap-3 min-w-64 md:min-w-72 snap-center">
            
            <div className={`p-4 rounded-3xl border-b-4 shadow-sm transition-all ${
              stage.key === 'yuklendi' 
              ? 'bg-blue-600 border-blue-800 text-white' 
              : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex justify-between items-center mb-0.5">
                <div className="text-[8px] font-black opacity-60 uppercase tracking-widest">AŞAMA {index + 1}</div>
                <div className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full">
                  {orders.filter(o => (o.current_stage || 'kesimhanede') === stage.key && !o.is_archived && o.status !== 'archived').length}
                </div>
              </div>
              <h3 className="text-xs md:text-sm font-black tracking-widest uppercase truncate">{stage.label}</h3>
            </div>

            <div className="flex flex-col gap-3 min-h-[65vh] bg-slate-100/30 p-2 rounded-[2.5rem] border-2 border-dashed border-slate-200/50">
              {loading ? (
                <div className="py-20 text-center text-slate-300 font-black text-[8px] animate-pulse uppercase tracking-widest">Veriler Alınıyor...</div>
              ) : orders
                .filter(o => {
                  const hasCutting = o.cutting_qty && Object.values(o.cutting_qty).some(v => Number(v) > 0);
                  const inThisStage = (o.current_stage || 'kesimhanede') === stage.key;
                  return hasCutting && inThisStage && !o.is_archived && o.status !== 'archived';
                })
                .map(order => {
                  const totalQty = Object.values(order.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
                  const needsWaybill = order.waybill_tracking_active && !order.is_waybill_issued;

                  return (
                    <div key={order.id} className={`bg-white p-4 rounded-4xl shadow-sm border transition-all ${needsWaybill ? 'border-red-400 ring-2 ring-red-50' : 'border-slate-100'} group hover:shadow-md`}>
                      
                      {/* MODEL VE MÜŞTERİ BİLGİSİ */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-50 shrink-0 bg-slate-50 flex items-center justify-center shadow-inner">
                            {order.model_image ? <img src={order.model_image} className="w-full h-full object-cover" alt="model" /> : <Hash size={18} className="text-slate-200" />}
                          </div>
                          <div className="min-w-0 flex flex-col justify-center">
                            <div className="font-black text-[12px] text-slate-900 tracking-tighter uppercase truncate leading-none mb-1.5">
                              {order.article}
                            </div>
                            <div className="flex items-center gap-1 text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg w-fit uppercase border border-blue-100">
                              <User size={8} /> {order.customer?.substring(0, 15)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                           <div className={`flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-xl border uppercase ${
                             stage.key === 'yuklendi' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                           }`}>
                              <Clock size={10} />
                              {order.tracking?.[stage.key] 
                                ? new Date(order.tracking[stage.key]).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
                                : 'GİRİŞ'
                              }
                           </div>
                        </div>
                      </div>

                      {/* ARA DETAYLAR */}
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-3 px-1 leading-tight flex items-center justify-between border-b border-slate-50 pb-3">
                        <div className="flex items-center gap-1.5">
                            <span className="text-blue-600">{order.order_no}</span>
                            <span className="text-slate-200">/</span>
                            <span className="text-slate-700 font-black">{order.model}</span>
                        </div>
                        <div className="bg-slate-900 text-white px-2 py-0.5 rounded-md text-[9px]">{totalQty} AD</div>
                      </div>

                      {/* 🛠️ KONTROLLÜ SEVKİYAT BÖLÜMÜ */}
                      {stage.isFason && (
                        <div className="mb-4">
                          {!order.waybill_tracking_active ? (
                            <button 
                              onClick={() => startWaybillTracking(order.id)}
                              className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            >
                              <Truck size={14} /> Atölyeye Sevk Et (Fason)
                            </button>
                          ) : (
                            <div className={`p-2 rounded-2xl ${order.is_waybill_issued ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} border border-dashed`}>
                              {order.is_waybill_issued ? (
                                <div className="flex items-center gap-2 text-emerald-600 font-black text-[9px] uppercase">
                                  <ClipboardCheck size={14} /> Resmi İrsaliye: {order.current_waybill_no}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-1.5 text-red-600 font-black text-[9px] uppercase animate-pulse">
                                    <AlertCircle size={12} /> İrsaliye Bekliyor (QNB)
                                  </div>
                                  <div className="flex gap-1">
                                    <input 
                                      type="text" 
                                      placeholder="QNB İrs No" 
                                      id={`waybill-input-${order.id}`}
                                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:ring-1 focus:ring-blue-400"
                                      onKeyDown={(e) => {
                                        if(e.key === 'Enter') handleSaveWaybill(order.id, e.target.value);
                                      }}
                                    />
                                    <button 
                                      onClick={() => {
                                        const val = document.getElementById(`waybill-input-${order.id}`).value;
                                        handleSaveWaybill(order.id, val);
                                      }}
                                      className="bg-red-600 text-white px-2 rounded-lg text-[8px] font-black uppercase"
                                    >
                                      ONAYLA
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* AKSİYON BUTONLARI */}
                      <div className="flex gap-2">
                        {index > 0 && (
                          <button 
                            onClick={() => handleBack(order, index)}
                            className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all border border-slate-100 active:scale-90"
                            title="Geri Al"
                          >
                            <Undo2 size={14} />
                          </button>
                        )}
                        
                        {stage.key === 'yuklendi' ? (
                          <button 
                            onClick={() => handleArchive(order)} 
                            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-lg active:scale-95 tracking-widest"
                          >
                            ARŞİVLE <Archive size={14} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleMove(order, index + 1)}
                            className="flex-1 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg active:scale-95 tracking-tighter"
                          >
                            İLERLET <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL KONTROLÜ */}
      {shipmentModalOrder && (
        <ShipmentResultModal 
          order={shipmentModalOrder} 
          onClose={() => setShipmentModalOrder(null)} 
          onSuccess={load} 
        />
      )}
    </div>
  );
}