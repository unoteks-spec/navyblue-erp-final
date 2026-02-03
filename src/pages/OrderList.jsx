import React, { useEffect, useState, useCallback } from 'react';
import { 
  Search, Hash, Printer, Truck, Trash2, Edit3, Scissors, CheckCircle, LayoutGrid // 👈 LayoutGrid eklendi
} from 'lucide-react';
import { getAllOrders, deleteOrder, supabase } from "../api/orderService";
import FabricOrderPrint from '../components/orders/FabricOrderPrint';
import FabricIntakeModal from '../components/orders/FabricIntakeModal';
import CuttingOrderModal from '../components/orders/CuttingOrderModal';
import CuttingOrderPrint from '../components/orders/CuttingOrderPrint';
import CuttingResultModal from '../components/orders/CuttingResultModal';

export default function OrderList({ onEditOrder }) {
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [printOrder, setPrintOrder] = useState(null);
  const [intakeOrder, setIntakeOrder] = useState(null);
  const [preparingOrder, setPreparingOrder] = useState(null);
  const [printCuttingOrder, setPrintCuttingOrder] = useState(null);
  const [cuttingResultOrder, setCuttingResultOrder] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const ordersData = await getAllOrders();
      const { data: deliveriesData, error: dError } = await supabase.from('fabric_deliveries').select('*');
      if (dError) throw dError;
      
      setOrders(ordersData || []);
      setDeliveries(deliveriesData || []);
    } catch (error) {
      console.error("Yükleme hatası:", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteOrder = async (id, orderNo) => {
    if (window.confirm(`${orderNo} numaralı siparişi silmek istediğinize emin misiniz?`)) {
      try {
        const result = await deleteOrder(id);
        if (result) {
          setOrders(prevOrders => prevOrders.filter(order => order.id !== id));
        }
      } catch (error) {
        alert("Hata: Sipariş silinemedi.");
      }
    }
  };

  const calculateProgress = (order) => {
    const qtyByOrder = order.qty_by_size || order.qtyBySize || {};
    const baseTotal = Object.values(qtyByOrder).reduce((a, b) => a + (Number(b) || 0), 0);
    const extraFactor = 1 + (Number(order.extra_percent || 5) / 100);
    const totalPieces = Math.ceil(baseTotal * extraFactor);

    let needed = 0;
    Object.values(order.fabrics || {}).forEach(f => {
      needed += totalPieces * (Number(f.perPieceKg || f.per_piece_kg || 0));
    });

    if (needed === 0) return { percent: 0 };
    const received = deliveries
      .filter(d => d.order_no === order.order_no)
      .reduce((sum, d) => sum + Number(d.amount_received || 0), 0);

    return { percent: Math.round(Math.min(100, (received / needed) * 100)) };
  };

  const filteredOrders = orders.filter(o => 
    o.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.article?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    // 1. STANDART GENİŞLİK (max-w-7xl)
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32">
      
      {/* 2. STANDART BAŞLIK YAPISI */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-lg">
            <LayoutGrid size={20} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase">Sipariş Listesi</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">Mevcut Üretim Planları</p>
          </div>
        </div>
      </div>

      {/* ARAMA ÇUBUĞU STANDARTLAŞTIRILDI */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Sipariş, Müşteri veya Artikel Ara..."
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border-transparent rounded-xl outline-none focus:bg-white text-[11px] font-bold transition-all placeholder:text-slate-400"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-20 text-slate-300 font-black animate-pulse uppercase text-[10px] tracking-[0.3em]">Sistem Senkronize Ediliyor...</div>
        ) : filteredOrders.map(order => {
          const stats = calculateProgress(order);
          const cutQty = order.cutting_qty || {};
          const totalCut = Object.values(cutQty).reduce((a, b) => a + Number(b || 0), 0);
          const isCut = order.status === 'cut_completed' || totalCut > 0;

          return (
            <div 
              key={order.id} 
              className={`bg-white p-5 md:p-6 rounded-[2.5rem] border transition-all group relative overflow-visible ${
                isCut ? 'border-emerald-500/30 bg-emerald-50/5 shadow-emerald-50/50' : 'border-slate-100' 
              } hover:shadow-xl hover:border-blue-200 shadow-sm`}
            >
              {/* Düzenle/Sil Butonları */}
              <div className="absolute -top-3 -right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30">
                <button onClick={() => onEditOrder(order)} className="w-9 h-9 bg-white text-slate-400 hover:text-blue-600 rounded-xl shadow-lg border border-slate-100 flex items-center justify-center transition-all hover:scale-110"><Edit3 size={14} /></button>
                <button onClick={() => handleDeleteOrder(order.id, order.order_no)} className="w-9 h-9 bg-white text-slate-400 hover:text-red-600 rounded-xl shadow-lg border border-slate-100 flex items-center justify-center transition-all hover:scale-110"><Trash2 size={14} /></button>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                {/* SOL BÖLÜM */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-500 shrink-0 ${isCut ? 'bg-emerald-600 text-white shadow-inner' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white'}`}>
                    {order.model_image ? (
                      <img src={order.model_image} alt="Model" className="w-full h-full object-cover" />
                    ) : (
                      <Hash size={20} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 tracking-tighter text-lg md:text-xl uppercase truncate leading-none">{order.order_no || 'TASLAK'}</span>
                      <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest">{order.customer}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider flex items-center gap-2">
                      <span className="truncate">{order.article}</span>
                      <span className="text-slate-200">/</span>
                      <span className="text-slate-600 font-black truncate">{order.model}</span>
                      <span className="text-slate-200">/</span>
                      <span className="truncate shrink-0">{order.color}</span>
                    </div>
                  </div>
                </div>

                {/* ORTA: İLERLEME ÇUBUĞU */}
                <div className="flex-1 w-full lg:max-w-60">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kumaş Durumu</span>
                    <span className={`text-[10px] font-black ${stats.percent === 100 ? 'text-emerald-500' : 'text-blue-600'}`}>%{stats.percent}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${stats.percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${stats.percent}%` }} />
                  </div>
                </div>

                {/* SAĞ: AKSİYON BUTONLARI */}
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => setPrintOrder(order)} 
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] transition-all border uppercase tracking-tighter ${
                      order.fabric_ordered 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                      : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white'
                    }`}
                  >
                    <Printer size={14} /> Sipariş
                  </button>

                  <button onClick={() => setIntakeOrder(order)} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl font-black text-[9px] hover:bg-blue-600 hover:text-white transition-all border border-blue-100 uppercase tracking-tighter"><Truck size={14} /> Giriş</button>
                  <button onClick={() => setPreparingOrder(order)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-[9px] hover:bg-blue-600 transition-all shadow-lg uppercase tracking-tighter"><Scissors size={14} /> Emre Git</button>
                  <button 
                    onClick={() => setCuttingResultOrder(order)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] transition-all border uppercase tracking-tighter ${isCut ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white'}`}
                  >
                    {isCut ? <CheckCircle size={14} /> : <Scissors size={14} />}
                    {isCut ? 'Kesildi' : 'Sonuç Gir'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODALLAR DEĞİŞMEDİ */}
      {printOrder && <FabricOrderPrint order={printOrder} onClose={() => setPrintOrder(null)} onSuccess={loadData} />}
      {intakeOrder && <FabricIntakeModal order={intakeOrder} allOrders={orders} onClose={() => setIntakeOrder(null)} onSuccess={loadData} />}
      {preparingOrder && <CuttingOrderModal order={preparingOrder} onClose={() => setPreparingOrder(null)} onConfirm={(upd) => { setPreparingOrder(null); setPrintCuttingOrder(upd); loadData(); }} />}
      {printCuttingOrder && <CuttingOrderPrint order={printCuttingOrder} onClose={() => setPrintCuttingOrder(null)} />}
      {cuttingResultOrder && <CuttingResultModal key={cuttingResultOrder.id + (cuttingResultOrder.status || 'v1')} order={cuttingResultOrder} onClose={() => setCuttingResultOrder(null)} onSuccess={loadData} />}
    </div>
  );
}