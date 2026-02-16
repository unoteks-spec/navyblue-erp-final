import React, { useEffect, useState, useCallback } from 'react';
import { 
  Search, Hash, Printer, Truck, Trash2, Edit3, Scissors, CheckCircle, LayoutGrid, RefreshCcw, X, Calendar, Activity
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
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  const sizeOrder = [
    'XXS', 'XS', 'S', 'M', 'L', 'XL', 
    'XXL', '2XL', 
    '3XL', '4XL', '5XL', 
    '36', '38', '40', '42', '44', '46', '48'
  ];

  useEffect(() => {
    if (selectedOrderDetail) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedOrderDetail]);

  const loadData = useCallback(async () => {
    if (orders.length === 0) setLoading(true);
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
  }, [orders.length]);

  useEffect(() => { loadData(); }, [loadData]);

  const calculateProgress = (order) => {
    const qtyByOrder = order.qty_by_size || order.qtyBySize || {};
    const baseTotal = Object.values(qtyByOrder).reduce((a, b) => a + (Number(b) || 0), 0);
    const extraFactor = 1 + (Number(order.extra_percent || 5) / 100);
    const totalPieces = Math.ceil(baseTotal * extraFactor);
    let needed = 0;
    const orderFabricKeys = new Set();
    Object.values(order.fabrics || {}).forEach(f => {
      if (!f.kind || !f.color) return;
      needed += totalPieces * (Number(f.perPieceKg || 0));
      orderFabricKeys.add(`${f.kind.toLowerCase()}-${f.color.toLowerCase()}`);
    });
    if (needed === 0) return { percent: 0 };
    const received = deliveries.filter(d => d.order_no === order.order_no && orderFabricKeys.has(`${(d.fabric_kind || '').toLowerCase()}-${(d.color || '').toLowerCase()}`)).reduce((sum, d) => sum + Number(d.amount_received || 0), 0);
    return { percent: Math.round(Math.min(100, (received / needed) * 100)) };
  };

  const getStageLabel = (key) => {
    const stageMap = { 'kesimhanede': 'KESİMHANE', 'baski': 'BASKI / NAKIŞ', 'nakis': 'NAKIŞ', 'dikim': 'DİKİM HATTI', 'ilik_dugme': 'İLİK-DÜĞME', 'yikama_boyama': 'YIKAMA-BOYAMA', 'utu_ambalaj': 'ÜTÜ-PAKET', 'yuklendi': 'YÜKLENDİ' };
    return stageMap[key] || 'KESİM BEKLİYOR';
  };

  const filteredOrders = orders.filter(o => 
    o.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.article?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32">
      
      {/* ÜST PANEL */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-lg"><LayoutGrid size={20} /></div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">İş Emirleri</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-1">Navy Blue ERP</p>
          </div>
        </div>
        <button onClick={loadData} className="p-2.5 bg-white border border-slate-100 rounded-xl hover:bg-slate-50"><RefreshCcw size={18} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {/* ARAMA */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Grup, Müşteri veya Artikel Ara..."
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border-transparent rounded-xl outline-none focus:bg-white text-[11px] font-bold transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* LİSTE */}
      <div className="grid gap-6">
        {filteredOrders.map(order => {
          const stats = calculateProgress(order);
          const totalCut = Object.values(order.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
          
          // 🛠️ ISCUT & ISSHIPPED MANTIĞI
          const isCut = order.status === 'cut_completed' || totalCut > 0;
          const isShipped = order.status === 'archived' || order.is_archived;

          return (
            <div key={order.id} className={`bg-white p-5 md:p-6 rounded-[2.5rem] border transition-all group relative ${isShipped ? 'border-blue-500/20 bg-blue-50/5' : isCut ? 'border-emerald-500/30 bg-emerald-50/5' : 'border-slate-100'} hover:shadow-xl`}>
              <div className="absolute -top-3 -right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-30">
                <button onClick={(e) => { e.stopPropagation(); onEditOrder(order); }} className="w-9 h-9 bg-white text-slate-400 hover:text-blue-600 rounded-xl shadow-lg border border-slate-100 flex items-center justify-center hover:scale-110"><Edit3 size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Emin misiniz?')) { deleteOrder(order.id); loadData(); } }} className="w-9 h-9 bg-white text-slate-400 hover:text-red-600 rounded-xl shadow-lg border border-slate-100 flex items-center justify-center hover:scale-110"><Trash2 size={14} /></button>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div onClick={() => setSelectedOrderDetail(order)} className="flex items-start gap-4 flex-1 cursor-pointer hover:opacity-80">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ${isShipped ? 'bg-blue-600' : isCut ? 'bg-emerald-600' : 'bg-slate-900'} text-white`}>
                    {order.model_image ? <img src={order.model_image} className="w-full h-full object-cover" /> : <Hash size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 tracking-tighter text-lg md:text-xl uppercase leading-none">{order.article}</span>
                      <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">{order.customer}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase flex items-center gap-2">
                      <span className="text-blue-600">{order.order_no}</span>
                      <span className="text-slate-200">/</span>
                      <span>{order.model}</span>
                      <span className="text-indigo-500">{order.color}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 w-full lg:max-w-60">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kumaş Girişi</span>
                    <span className={`text-[10px] font-black ${stats.percent === 100 ? 'text-emerald-500' : 'text-blue-600'}`}>%{stats.percent}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${stats.percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${stats.percent}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setPrintOrder(order)} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border tracking-tighter ${order.fabric_ordered ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>Sipariş Formu</button>
                  <button onClick={() => setIntakeOrder(order)} className="bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border">Giriş Yap</button>
                  <button onClick={() => setPreparingOrder(order)} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg">Kesim Emri</button>
                  
                  {/* 🛠️ ARŞİVLEME ENTEGRELİ BUTON MANTIĞI */}
                  <button 
                    onClick={() => setCuttingResultOrder(order)} 
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border tracking-tighter transition-all ${
                      isShipped 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' 
                        : isCut 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white'
                    }`}
                  >
                    {isShipped ? <Truck size={14} /> : (isCut ? <CheckCircle size={14} /> : <Scissors size={14} />)}
                    {isShipped ? 'Yüklendi' : (isCut ? 'Kesildi' : 'Sonuç Gir')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: DETAY KARTI */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setSelectedOrderDetail(null)}></div>
          <div className="relative bg-white w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
            <div className="sticky top-0 z-20 bg-white border-b border-slate-100 p-4 md:p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black rounded-lg uppercase tracking-widest">Sipariş Detayı</span>
              </div>
              <button onClick={() => setSelectedOrderDetail(null)} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 shadow-lg">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-8 md:p-10 bg-slate-50/50 flex flex-col md:flex-row gap-8 border-b border-slate-100">
                <div className="w-32 h-44 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-inner shrink-0 mx-auto md:mx-0">
                  {selectedOrderDetail.model_image ? <img src={selectedOrderDetail.model_image} className="w-full h-full object-cover" /> : <Hash size={30} className="text-slate-100 m-auto mt-16" />}
                </div>
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">{selectedOrderDetail.model}</h2>
                  <p className="text-lg font-bold text-blue-600 uppercase mt-1">{selectedOrderDetail.article}</p>
                  <div className="grid grid-cols-3 gap-4 py-4 border-t border-slate-200/50 text-left">
                    <div><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Müşteri</span><span className="text-xs font-black text-slate-700 uppercase">{selectedOrderDetail.customer}</span></div>
                    <div><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Termin</span><span className="text-xs font-black text-slate-900 uppercase flex items-center justify-center md:justify-start gap-1"><Calendar size={12}/> {selectedOrderDetail.due ? new Date(selectedOrderDetail.due).toLocaleDateString('tr-TR') : '-'}</span></div>
                    <div><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Konum</span><span className="text-[10px] font-black text-blue-600 uppercase flex items-center justify-center md:justify-start gap-1"><Activity size={10}/> {getStageLabel(selectedOrderDetail.current_stage)}</span></div>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-10 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Scissors size={14}/> Beden Denge Matrisi</h3>
                   <div className="flex gap-2">
                      <div className="text-[9px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">SIP: {Object.values(selectedOrderDetail.qty_by_size || {}).reduce((a,b) => a + Number(b||0), 0)}</div>
                      <div className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">KES: {Object.values(selectedOrderDetail.cutting_qty || {}).reduce((a,b) => a + Number(b||0), 0)}</div>
                   </div>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-6 custom-scrollbar min-w-full">
                  {Object.entries(selectedOrderDetail.qty_by_size || {})
                    .sort((a, b) => {
                      const indexA = sizeOrder.indexOf(a[0].toUpperCase());
                      const indexB = sizeOrder.indexOf(b[0].toUpperCase());
                      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
                    })
                    .map(([size, qty]) => {
                      const cut = selectedOrderDetail.cutting_qty?.[size] || 0;
                      const diff = Number(cut) - Number(qty);
                      return (
                        <div key={size} className="w-28 bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm flex flex-col shrink-0">
                          <div className="bg-slate-900 py-2 text-center text-[10px] font-black text-white uppercase">{size}</div>
                          <div className="p-4 text-center space-y-3">
                            <div className="space-y-0.5"><span className="text-[8px] font-bold text-slate-400 uppercase block">Sipariş</span><span className="text-lg font-black text-slate-900">{qty}</span></div>
                            <div className="h-px bg-slate-50 w-full" />
                            <div className="space-y-0.5"><span className="text-[8px] font-bold text-blue-400 uppercase block">Kesilen</span><span className="text-lg font-black text-blue-600">{cut}</span></div>
                            <div className={`pt-1 text-[9px] font-black uppercase ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{diff > 0 ? `+${diff}` : diff}</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 bg-white border-t border-slate-100">
               <button onClick={() => setSelectedOrderDetail(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em]">Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALLAR */}
      {printOrder && <FabricOrderPrint order={printOrder} onClose={() => setPrintOrder(null)} onSuccess={loadData} />}
      {intakeOrder && <FabricIntakeModal order={intakeOrder} allOrders={orders} onClose={() => setIntakeOrder(null)} onSuccess={loadData} />}
      {preparingOrder && <CuttingOrderModal order={preparingOrder} onClose={() => setPreparingOrder(null)} onConfirm={(upd) => { setPreparingOrder(null); setPrintCuttingOrder(upd); loadData(); }} />}
      {printCuttingOrder && <CuttingOrderPrint order={printCuttingOrder} onClose={() => setPrintCuttingOrder(null)} />}
      {cuttingResultOrder && <CuttingResultModal order={cuttingResultOrder} onClose={() => setCuttingResultOrder(null)} onSuccess={loadData} />}
    </div>
  );
}