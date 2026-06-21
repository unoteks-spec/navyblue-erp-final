import React, { useEffect, useState, useCallback } from 'react';
import { 
  Search, Hash, CheckCircle, LayoutGrid, RefreshCcw, X, Calendar, Activity, Copy, Calculator, Scissors, Edit3, Trash2
} from 'lucide-react';
import { getAllOrders, deleteOrder, checkOrderDeletable, checkFabricFullyReceived, supabase } from "../api/orderService";
import { SIZE_ORDER } from '../constants/sizes';

import CuttingOrderModal from '../components/orders/CuttingOrderModal';
import CuttingOrderPrint from '../components/orders/CuttingOrderPrint';
import CuttingResultModal from '../components/orders/CuttingResultModal';

export default function OrderList({ onEditOrder }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [preparingOrder, setPreparingOrder] = useState(null);
  const [printCuttingOrder, setPrintCuttingOrder] = useState(null);
  const [cuttingResultOrder, setCuttingResultOrder] = useState(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  // ✅ DÜZELTİLDİ: Merkezi constants/sizes'dan geliyor
  // ✅ DÜZELTİLDİ: Akıllı label fonksiyonu — prefix varsa sil, yoksa aynen bırak
  const getDisplayLabel = (s) => {
    const prefixes = ['B', 'K', 'S', 'Y', 'U', 'N'];
    return prefixes.includes(s.charAt(0)) && s.length > 1 ? s.substring(1) : s;
  };

  useEffect(() => {
    if (selectedOrderDetail) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedOrderDetail]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const ordersData = await getAllOrders();
      setOrders(ordersData || []);
    } catch (error) {
      console.error("Siparişler yüklenirken hata oluştu:", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ✅ Kesim sonucu girmeden önce kumaşın tamamen gelmiş olduğunu kontrol et
  const handleOpenCuttingResult = async (order) => {
    try {
      const { ready, missing } = await checkFabricFullyReceived(order.id);
      if (!ready) {
        const missingLabels = missing.map(k => k === 'main' ? 'Ana Kumaş' : `Garni (${k})`).join(', ');
        const proceed = window.confirm(
          `⚠️ Bu siparişin kumaşı henüz tam gelmemiş!\n\nEksik: ${missingLabels}\n\nKumaş gelmeden kesim sonucu girmek riskli olabilir.\n\nYine de devam etmek istiyor musunuz?`
        );
        if (!proceed) return;
      }
      setCuttingResultOrder(order);
    } catch (err) {
      console.error("Kumaş kontrolü hatası:", err.message);
      setCuttingResultOrder(order); // Kontrol başarısız olursa engelleme, normal akışa devam et
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      // ✅ Önce bağlı kumaş PO'su var mı kontrol et
      const { deletable, linkedPos } = await checkOrderDeletable(orderId);
      if (!deletable) {
        const poList = linkedPos.map(p => `• ${p.poNo} (${p.status === 'completed' ? 'tamamlandı' : 'bekliyor'})`).join('\n');
        alert(`⚠️ Bu sipariş silinemiyor!\n\nAşağıdaki kumaş siparişine/siparişlerine bağlı:\n${poList}\n\nÖnce bu PO'yu Kumaş Yönetimi sayfasından silin ya da kumaş kalemini çıkarın, sonra siparişi silebilirsiniz.`);
        return;
      }
    } catch (err) {
      console.error("Kontrol hatası:", err.message);
      alert("Sipariş kontrolü yapılırken bir hata oluştu, lütfen tekrar deneyin.");
      return;
    }

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

  const calculateProgress = (order) => {
    // ✅ Sadece kind dolu olan fabKey'leri say — boş g2/g3/g4 hariç
    const allFabKeys = Object.entries(order.fabrics || {})
      .filter(([key, fab]) => fab && fab.kind && fab.kind.trim() !== '')
      .map(([key]) => key);

    const totalFabrics = allFabKeys.length;
    if (totalFabrics === 0) return { percent: 0, label: 'Kumaş Tanımsız' };

    const orderItems = order.fabric_order_items || [];
    const orderedFabKeys = new Set(orderItems.map(i => i.fab_key || 'main'));
    
    const receivedFabKeys = new Set(
      orderItems
        .filter(i => {
          const fo = Array.isArray(i.fabric_orders) ? i.fabric_orders[0] : i.fabric_orders;
          return fo && Number(fo.received_qty_kg || 0) > 0;
        })
        .map(i => i.fab_key || 'main')
    );

    const orderedCount  = allFabKeys.filter(k => orderedFabKeys.has(k)).length;
    const receivedCount = allFabKeys.filter(k => receivedFabKeys.has(k)).length;

    // ✅ DÜZELTİLDİ: Bar kumaş geliş durumunu gösterir, kesim durumunu değil.
    // Kesim adedi burada hiç kontrol edilmemeli.

    // Tümü geldi → %100
    if (receivedCount === totalFabrics) return { percent: 100, label: 'Tümü Geldi' };

    // Bir kısmı geldi → %75
    if (receivedCount > 0) return { percent: 75, label: `${receivedCount}/${totalFabrics} Kumaş Geldi` };

    // Tümü sipariş edildi → %50
    if (orderedCount === totalFabrics) return { percent: 50, label: 'Tümü Sipariş Edildi' };

    // Bir kısmı sipariş edildi → %25
    if (orderedCount > 0) return { percent: 25, label: `${orderedCount}/${totalFabrics} Sipariş Edildi` };

    // Hiç sipariş yok → %0
    return { percent: 0, label: 'Kumaş Bekleniyor' };
  };

  const getStageLabel = (key) => {
    const stageMap = {
      'kesimhanede': 'KESİMHANE',
      'baski': 'BASKI / NAKIŞ',
      'nakis': 'NAKIŞ',
      'dikim': 'DİKİM HATTI',
      'ilik_dugme': 'İLİK-DÜĞME',
      'yikama_boyama': 'YIKAMA-BOYAMA',
      'utu_ambalaj': 'ÜTÜ-PAKET',
      'yuklendi': 'YÜKLENDİ'
    };
    return stageMap[key] || 'KESİM BEKLİYOR';
  };

  const filteredOrders = orders
    .filter(o => {
      const isArchived = o.status === 'archived' || o.is_archived === true;
      if (isArchived) return false;
      return (
        o.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.article?.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
        <button onClick={loadData} className="p-2.5 bg-white border border-slate-100 rounded-xl hover:bg-slate-50">
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
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
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stats.label || 'Kumaş Durumu'}</span>
                    <span className={`text-[10px] font-black ${stats.percent === 100 ? 'text-emerald-500' : stats.percent >= 75 ? 'text-blue-500' : stats.percent >= 50 ? 'text-amber-500' : stats.percent > 0 ? 'text-orange-400' : 'text-slate-300'}`}>%{stats.percent}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${
                      stats.percent === 100 ? 'bg-emerald-500' :
                      stats.percent >= 75 ? 'bg-blue-500' :
                      stats.percent >= 50 ? 'bg-amber-400' :
                      stats.percent > 0  ? 'bg-orange-400' : 'bg-slate-200'
                    }`} style={{ width: `${stats.percent}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setPreparingOrder(order)} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg hover:bg-blue-600 transition-colors">Kesim Emri</button>
                  <button onClick={() => handleOpenCuttingResult(order)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border tracking-tighter transition-all ${isCut ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white'}`}>
                    {isCut ? <CheckCircle size={14} /> : <Scissors size={14} />} {isCut ? 'Kesildi' : 'Sonuç Gir'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: DETAY KARTI */}
      {selectedOrderDetail && (() => {
        const od = selectedOrderDetail;
        const orderQty = Object.values(od.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
        const cutQty = Object.values(od.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
        // cutting_qty key'lerini qty_by_size ile eşleştir
        // Örn: "2" → "K2Y", "8" → "U8" gibi display label tersine çevrilir
        const qtyKeys = Object.keys(od.qty_by_size || {});
        const getDisplayLabelLocal = (s) => {
          const prefixes = ['B', 'K', 'S', 'Y', 'U', 'N'];
          return prefixes.includes(s.charAt(0)) && s.length > 1 ? s.substring(1) : s;
        };
        const labelToKey = {};
        qtyKeys.forEach(k => { labelToKey[getDisplayLabelLocal(k)] = k; });
        const normalizedCutQty = {};
        Object.entries(od.cutting_qty || {}).forEach(([k, v]) => {
          let normKey = qtyKeys.includes(k) ? k : (labelToKey[k] || k);
          normalizedCutQty[normKey] = (Number(normalizedCutQty[normKey] || 0) + Number(v || 0));
        });

        const sortedSizesModal = Object.keys({ ...(od.qty_by_size || {}), ...normalizedCutQty })
          .filter(s => Number(od.qty_by_size?.[s] || 0) > 0 || Number(normalizedCutQty[s] || 0) > 0)
          .sort((a, b) => {
            const iA = SIZE_ORDER.indexOf(a), iB = SIZE_ORDER.indexOf(b);
            return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB);
          });
        return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedOrderDetail(null)}>
          <div className="relative bg-white w-full max-w-3xl h-full md:h-auto md:max-h-[92vh] rounded-none md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* HEADER */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş Detayı</span>
              <button onClick={() => setSelectedOrderDetail(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-5">

                {/* 1. BİLGİLER + MODEL RESMİ */}
                <div className="flex gap-5">
                  {/* Sol: Bilgiler */}
                  <div className="flex-1 space-y-1">
                    <div className="space-y-2">
                      {[
                        { label: 'Artikel', value: od.article },
                        { label: 'Renk',    value: od.color },
                        { label: 'Model',   value: od.model },
                        { label: 'Müşteri', value: od.customer },
                        { label: 'Termin',  value: od.due ? new Date(od.due).toLocaleDateString('tr-TR') : '-' },
                        { label: 'Konum',   value: getStageLabel(od.current_stage) },
                      ].map(f => (
                        <div key={f.label} className="flex items-baseline gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest w-16 shrink-0">{f.label}</span>
                          <span className="text-sm font-black text-slate-800 uppercase">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Sağ: Model Resmi */}
                  <div className="w-32 h-40 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {od.model_image
                      ? <img src={od.model_image} className="w-full h-full object-cover" alt="model"/>
                      : <Hash size={28} className="text-slate-200"/>}
                  </div>
                </div>

                {/* 2. ANA KUMAŞ */}
                {od.fabrics?.main?.kind && (
                  <div className="border border-slate-100 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Ana Kumaş</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: 'Cinsi',   value: od.fabrics.main.kind },
                        { label: 'Renk',    value: od.fabrics.main.color },
                        { label: 'İçerik',  value: od.fabrics.main.content },
                        { label: 'GSM',     value: od.fabrics.main.gsm ? `${od.fabrics.main.gsm} gr` : null },
                      ].filter(f => f.value).map(f => (
                        <div key={f.label} className="bg-slate-50 rounded-xl px-3 py-2">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{f.label}</p>
                          <p className="text-xs font-black text-slate-800">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. SİPARİŞ + KESİM TOPLAMI */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><Calculator size={20}/></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sipariş Toplamı</p>
                      <p className="text-2xl font-black text-slate-900 leading-none mt-0.5">{orderQty} <span className="text-xs text-slate-400">Pcs</span></p>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0"><Scissors size={20}/></div>
                    <div>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Kesim Toplamı</p>
                      <p className="text-2xl font-black text-emerald-800 leading-none mt-0.5">{cutQty} <span className="text-xs text-emerald-400">Pcs</span></p>
                    </div>
                  </div>
                </div>

                {/* 4. BEDEN DENGE MATRİSİ */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <div className="bg-slate-900 px-4 py-2.5 flex items-center gap-2">
                    <CheckCircle size={12} className="text-blue-400"/>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Beden Denge Matrisi</span>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-800 text-[9px] font-black text-slate-400 uppercase">
                          <td className="py-2 px-3 text-left sticky left-0 bg-slate-800 w-20">Beden</td>
                          {sortedSizesModal.map(s => (
                            <td key={s} className="py-2 px-2 border-l border-slate-700 font-black text-slate-200">{getDisplayLabel(s)}</td>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'Sipariş', key: 'qty_by_size',  cls: 'text-slate-700' },
                          { label: 'Kesilen',  key: 'cutting_qty', cls: 'text-blue-600 font-black' },
                        ].map(row => (
                          <tr key={row.label} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-left font-black text-[9px] text-slate-400 uppercase sticky left-0 bg-white">{row.label}</td>
                            {sortedSizesModal.map(s => (
                              <td key={s} className={`py-2.5 px-2 border-l border-slate-100 ${row.cls}`}>
                                {row.key === 'cutting_qty' ? (normalizedCutQty[s] || 0) : (od[row.key]?.[s] || 0)}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td className="py-2.5 px-3 text-left font-black text-[9px] text-slate-400 uppercase sticky left-0 bg-slate-50">Fark</td>
                          {sortedSizesModal.map(s => {
                            const diff = Number(normalizedCutQty[s] || 0) - Number(od.qty_by_size?.[s] || 0);
                            return (
                              <td key={s} className={`py-2.5 px-2 border-l border-slate-100 font-black text-[11px] ${diff === 0 ? 'text-slate-300' : diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {diff > 0 ? `+${diff}` : diff}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

            {/* KAPAT */}
            <div className="p-4 border-t border-slate-100 shrink-0">
              <button onClick={() => setSelectedOrderDetail(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-colors">Kapat</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* DİĞER MODALLAR */}
      {preparingOrder && <CuttingOrderModal order={preparingOrder} onClose={() => setPreparingOrder(null)} onConfirm={(upd) => { setPreparingOrder(null); setPrintCuttingOrder(upd); loadData(); }} />}
      {printCuttingOrder && <CuttingOrderPrint order={printCuttingOrder} onClose={() => setPrintCuttingOrder(null)} />}
      {cuttingResultOrder && <CuttingResultModal order={cuttingResultOrder} onClose={() => setCuttingResultOrder(null)} onSuccess={loadData} />}
    </div>
  );
}