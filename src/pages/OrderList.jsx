import React, { useEffect, useState, useCallback } from 'react';
import { 
  Search, Hash, Printer, Truck, Trash2, Edit3, Scissors, CheckCircle, LayoutGrid, RefreshCcw, X, Calendar, Activity, Copy, Calculator
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
  const [procurements, setProcurements] = useState([]); 
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

  // 🔄 VERİLERİ YÜKLE
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const ordersData = await getAllOrders();
      setOrders(ordersData || []);

      const { data: dData } = await supabase.from('fabric_deliveries').select('*');
      if (dData) setDeliveries(dData);

      const { data: pData } = await supabase.from('fabric_procurements').select('*');
      if (pData) setProcurements(pData);
      
    } catch (error) {
      console.error("Dashboard yükleme hatası:", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 🛠️ SİPARİŞİ SİL
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Bu iş emrini silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      alert('Sipariş başarıyla silindi.');
    } catch (err) {
      console.error("Silme hatası:", err.message);
      alert("Sipariş silinirken bir hata oluştu.");
      loadData();
    }
  };

  // 🛠️ SİPARİŞİ KLONLA
  const handleCloneOrder = async (originalOrder) => {
    try {
      const { id, created_at, updated_at, ...clonedData } = originalOrder;
      const finalData = {
        ...clonedData,
        order_no: `${originalOrder.order_no}-KOPYA`,
        status: 'draft', 
        is_archived: false,
        fabric_ordered: false,
        cutting_qty: {}, 
        current_stage: 'kesim_bekliyor'
      };
      const { error } = await supabase.from('orders').insert([finalData]);
      if (error) throw error;
      alert('Sipariş başarıyla kopyalandı! Listeden düzenleyebilirsiniz.');
      loadData(); 
    } catch (err) {
      console.error("Klonlama hatası:", err.message);
      alert("Kopyalama sırasında bir sorun oluştu.");
    }
  };

  // 🛠️ İLERLEME HESAPLAMA (ORİJİNAL - HİÇ DOKUNULMADI)
  const calculateProgress = (order) => {
    const orderProcurements = procurements.filter(p => p.order_no === order.order_no);

    if (orderProcurements.length > 0) {
      const latestProcurement = orderProcurements.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
      const latestBatchNo = latestProcurement.batch_no;

      const batchNeeded = orderProcurements
        .filter(p => p.batch_no === latestBatchNo)
        .reduce((sum, p) => sum + Number(p.planned_amount || 0), 0);

      const batchReceived = deliveries
        .filter(d => d.order_no === order.order_no && d.batch_no === latestBatchNo)
        .reduce((sum, d) => sum + Number(d.amount_received || 0), 0);

      if (batchNeeded === 0) return { percent: 0, batch: latestBatchNo };
      return { 
        percent: Math.round(Math.min(100, (batchReceived / batchNeeded) * 100)),
        batch: latestBatchNo 
      };
    }

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

  const filteredOrders = orders
    .filter(o => {
      const isArchived = o.status === 'archived' || o.is_archived === true;
      if (isArchived) return false;
      const matchesSearch = 
        o.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.article?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => (a.due ? new Date(a.due) : new Date('9999-12-31')) - (b.due ? new Date(b.due) : new Date('9999-12-31')));

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32">
      
      {/* 1. ÜST BAR */}
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

      {/* 2. ARAMA */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Grup, Müşteri veya Artikel Ara..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-transparent rounded-xl outline-none focus:bg-white text-[11px] font-bold transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 3. ANA LİSTE */}
      <div className="grid gap-6">
        {filteredOrders.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-slate-300 font-black uppercase tracking-widest text-xs">
            Görüntülenecek aktif iş emri bulunamadı
          </div>
        ) : filteredOrders.map(order => {
          const stats = calculateProgress(order);
          const totalCut = Object.values(order.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
          const isCut = order.status === 'cut_completed' || totalCut > 0;

          return (
            <div key={order.id} className={`bg-white p-5 md:p-6 rounded-[2.5rem] border transition-all group relative ${isCut ? 'border-emerald-500/30 bg-emerald-50/5' : 'border-slate-100'} hover:shadow-xl`}>
              <div className="absolute -top-3 -right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-30">
                <button onClick={(e) => { e.stopPropagation(); handleCloneOrder(order); }} className="w-10 h-10 bg-white text-indigo-500 hover:text-indigo-700 rounded-xl shadow-lg border border-slate-100 flex items-center justify-center hover:scale-110" title="Kopyala"><Copy size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); onEditOrder(order); }} className="w-10 h-10 bg-white text-blue-500 hover:text-blue-700 rounded-xl shadow-lg border border-slate-100 flex items-center justify-center hover:scale-110" title="Düzenle"><Edit3 size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }} className="w-10 h-10 bg-white text-red-500 hover:text-red-700 rounded-xl shadow-lg border border-slate-100 flex items-center justify-center hover:scale-110" title="Sil"><Trash2 size={16} /></button>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div onClick={() => setSelectedOrderDetail(order)} className="flex items-start gap-4 flex-1 cursor-pointer hover:opacity-80">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ${isCut ? 'bg-emerald-600' : 'bg-slate-900'} text-white shadow-inner`}>
                    {order.model_image ? <img src={order.model_image} className="w-full h-full object-cover" /> : <Hash size={20} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-black text-slate-900 tracking-tighter text-lg md:text-xl uppercase leading-none">{order.article}</span>
                      <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase shrink-0">{order.customer}</span>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase shrink-0 ${new Date(order.due) < new Date() ? 'bg-red-50 text-red-500 border-red-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                        <Calendar size={10} />
                        {order.due ? new Date(order.due).toLocaleDateString('tr-TR') : 'BELİRSİZ'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                      <span className="text-blue-600">{order.order_no}</span>
                      <span className="text-slate-200">/</span>
                      <span className="truncate">{order.model}</span>
                      <span className="text-indigo-500 shrink-0">{order.color}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 w-full lg:max-w-60">
                  <div className="flex justify-between items-end mb-1.5">
                    {/* ✅ Parti Kodu Buradaki Stats İçinde Saklanıyor */}
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Kumaş Girişi {stats.batch && <span className="text-blue-600 ml-1">({stats.batch})</span>}
                    </span>
                    <span className={`text-[10px] font-black ${stats.percent === 100 ? 'text-emerald-500' : 'text-blue-600'}`}>%{stats.percent}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${stats.percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${stats.percent}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setPrintOrder(order)} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border tracking-tighter ${order.fabric_ordered ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>Kumaş Sip. Formu</button>
                  <button onClick={() => setIntakeOrder(order)} className="bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border border-blue-100">Gelen Kumaş Bilgisi</button>
                  <button onClick={() => setPreparingOrder(order)} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg hover:bg-blue-600 transition-colors">Kesim Emri</button>
                  <button onClick={() => setCuttingResultOrder(order)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border tracking-tighter transition-all ${isCut ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white'}`}>
                    {isCut ? <CheckCircle size={14} /> : <Scissors size={14} />} {isCut ? 'Kesildi' : 'Sonuç Gir'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🚀 MODAL: DETAY KARTI (GÜNCELLENMİŞ VERSİYON) */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedOrderDetail(null)}>
          <div className="relative bg-white w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-20 bg-white border-b border-slate-100 p-4 md:p-6 flex justify-between items-center">
              <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black rounded-lg uppercase tracking-widest">Sipariş Detayı</span>
              <button onClick={() => setSelectedOrderDetail(null)} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 shadow-lg transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* ÜST BİLGİ */}
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

              <div className="p-8 md:p-10 space-y-10">
                
                {/* 🚀 TOPLAM ÖZET KARTLARI (YENİ) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-100 p-6 rounded-4xl flex items-center gap-6 shadow-sm">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner"><Calculator size={28} /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş Toplamı</p>
                      <p className="text-3xl font-black text-slate-900 leading-none mt-1">
                        {Object.values(selectedOrderDetail.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0)} <span className="text-sm text-slate-400">Pcs</span>
                      </p>
                    </div>
                  </div>
                  <div className="bg-white border border-emerald-100 p-6 rounded-4xl flex items-center gap-6 shadow-sm">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner"><Scissors size={28} /></div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Kesim Toplamı</p>
                      <p className="text-3xl font-black text-emerald-900 leading-none mt-1">
                        {Object.values(selectedOrderDetail.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0)} <span className="text-sm text-emerald-400">Pcs</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><CheckCircle size={14}/> Beden Denge Matrisi</h3>
                </div>

                {/* 🚀 YATAY BEDEN KARTLARI (GÜNCELLENDİ) */}
                <div className="flex gap-3 overflow-x-auto pb-6 custom-scrollbar min-w-full">
                  {Object.entries(selectedOrderDetail.qty_by_size || {})
                    .filter(([size, qty]) => Number(qty) > 0 || Number(selectedOrderDetail.cutting_qty?.[size] || 0) > 0)
                    .sort((a, b) => {
                      const indexA = sizeOrder.indexOf(a[0].toUpperCase());
                      const indexB = sizeOrder.indexOf(b[0].toUpperCase());
                      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
                    })
                    .map(([size, qty]) => {
                      const cut = selectedOrderDetail.cutting_qty?.[size] || 0;
                      const diff = Number(cut) - Number(qty);
                      return (
                        <div key={size} className="flex-shrink-0 w-28 bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col transition-all hover:border-blue-200">
                          <div className="bg-slate-900 py-2.5 text-center text-[10px] font-black text-white uppercase">{size}</div>
                          <div className="p-4 text-center space-y-3">
                            <div className="space-y-0.5"><span className="text-[8px] font-bold text-slate-400 uppercase block">Sipariş</span><span className="text-lg font-black text-slate-900">{qty}</span></div>
                            <div className="h-px bg-slate-50 w-full" />
                            <div className="space-y-0.5"><span className="text-[8px] font-bold text-blue-400 uppercase block">Kesilen</span><span className="text-lg font-black text-blue-600">{cut}</span></div>
                            <div className={`pt-1 text-[9px] font-black uppercase border-t border-slate-50 ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{diff > 0 ? `+${diff}` : diff}</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 bg-white border-t border-slate-100">
               <button onClick={() => setSelectedOrderDetail(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-blue-600 transition-colors">Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* DİĞER MODALLAR */}
      {printOrder && <FabricOrderPrint order={printOrder} onClose={() => setPrintOrder(null)} onSuccess={loadData} />}
      {intakeOrder && <FabricIntakeModal order={intakeOrder} allOrders={orders} onClose={() => setIntakeOrder(null)} onSuccess={loadData} />}
      {preparingOrder && <CuttingOrderModal order={preparingOrder} onClose={() => setPreparingOrder(null)} onConfirm={(upd) => { setPreparingOrder(null); setPrintCuttingOrder(upd); loadData(); }} />}
      {printCuttingOrder && <CuttingOrderPrint order={printCuttingOrder} onClose={() => setPrintCuttingOrder(null)} />}
      {cuttingResultOrder && <CuttingResultModal order={cuttingResultOrder} onClose={() => setCuttingResultOrder(null)} onSuccess={loadData} />}
    </div>
  );
}