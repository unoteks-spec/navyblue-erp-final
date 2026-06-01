import React, { useEffect, useState } from 'react';
import { getAllOrders } from '../api/orderService';
import { 
  MapPin, CheckCircle2, FileBarChart, Printer, Truck, 
  ChevronDown, ChevronUp, PackageCheck
} from 'lucide-react';

export default function ProductionReport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [customerFilter, setCustomerFilter] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const sizeOrder = [
    '3M', '6M', '9M', '12M', '18M', '24M', 
    '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 
    'XS', 'S', 'M', 'L', 
    '3Y', '4Y', '5Y', '6Y', 
    '3XS', '2XS', 'XXS', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', 
    '34', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60', '62'
  ];

  useEffect(() => {
    getAllOrders().then(data => {
      setOrders(data || []);
      setLoading(false);
    });
  }, []);

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

  const handlePrint = () => {
    window.print();
  };

  const filteredOrders = orders.filter(o => {
    const isArchived = o.status === 'archived' || o.is_archived === true;
    let statusMatch = true;
    if (filter === 'pending') statusMatch = !isArchived && o.status !== 'cut_completed';
    else if (filter === 'completed') statusMatch = o.status === 'cut_completed' && !isArchived;
    else if (filter === 'archived') statusMatch = isArchived;
    else if (filter === 'all') statusMatch = true;

    const customerMatch = !customerFilter || o.customer?.toLowerCase().includes(customerFilter.toLowerCase());
    const orderMatch = !orderFilter || o.order_no?.toLowerCase().includes(orderFilter.toLowerCase());
    return statusMatch && customerMatch && orderMatch;
  });

  const totalPlanned = filteredOrders.reduce((sum, o) => sum + Object.values(o.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0), 0);
  const totalCut = filteredOrders.reduce((sum, o) => sum + Object.values(o.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0), 0);
  const totalShipped = filteredOrders.reduce((sum, o) => sum + Object.values(o.shipped_qty || {}).reduce((a, b) => a + Number(b || 0), 0), 0);

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-[0.3em] text-[10px]">Veriler Hazırlanıyor...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32">
      
      <style>{`
        @media print {
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .print-area { border: none !important; box-shadow: none !important; width: 100% !important; margin: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border-bottom: 1px solid #eee !important; padding: 10px 5px !important; }
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>
      
      {/* KONTROL PANELİ */}
      <div className="bg-white p-5 rounded-4xl border border-slate-100 shadow-sm space-y-4 no-print">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0f172a] rounded-xl text-white shadow-lg"><FileBarChart size={20} /></div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#0f172a] tracking-tighter uppercase leading-none">Üretim Raporu</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-1">Navy Blue ERP Systems</p>
            </div>
          </div>
          <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-slate-900 rounded-xl font-black text-[10px] text-white transition-all uppercase tracking-widest shadow-lg">
            <Printer size={16} /> Yazdır / PDF Kaydet
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input type="text" placeholder="Müşteri..." value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-[10px] font-bold outline-none" />
          <input type="text" placeholder="Grup No..." value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-[10px] font-bold outline-none" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none cursor-pointer col-span-2">
            <option value="all">Tüm Siparişler</option>
            <option value="pending">Sadece Üretimde Olanlar</option>
            <option value="completed">Dikiş / Ütü Pakettekiler</option>
            <option value="archived">Sevkiyatı Bitenler (Arşiv)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-4xl border border-[#0f172a] overflow-hidden shadow-none print-area">
        {/* Başlık Kartı */}
        <div className="p-8 border-b-4 border-[#0f172a] flex justify-between items-end bg-white">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tighter uppercase text-[#0f172a]">NAVY BLUE</h2>
            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.4em]">Üretim Denge ve Sevkiyat Matrisi</p>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-black text-[#94a3b8] uppercase tracking-widest">Rapor Tarihi</div>
            <div className="text-sm font-black text-[#0f172a]">{new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-4 border-b border-[#f1f5f9] bg-white">
          <div className="p-6 text-center border-r border-[#f1f5f9]"><div className="text-[9px] font-black text-[#94a3b8] uppercase mb-1 tracking-widest">İş Adedi</div><div className="text-2xl font-black text-[#0f172a]">{filteredOrders.length}</div></div>
          <div className="p-6 text-center border-r border-[#f1f5f9]"><div className="text-[9px] font-black text-[#94a3b8] uppercase mb-1 tracking-widest">Planlanan</div><div className="text-2xl font-black text-blue-600">{totalPlanned.toLocaleString()}</div></div>
          <div className="p-6 text-center border-r border-[#f1f5f9]"><div className="text-[9px] font-black text-[#94a3b8] uppercase mb-1 tracking-widest">Kesilen</div><div className="text-2xl font-black text-emerald-600">{totalCut.toLocaleString()}</div></div>
          <div className="p-6 text-center"><div className="text-[9px] font-black text-[#94a3b8] uppercase mb-1 tracking-widest">Yüklenen</div><div className="text-2xl font-black text-indigo-600">{totalShipped.toLocaleString()}</div></div>
        </div>

        <div className="p-4 md:p-8 overflow-x-auto bg-white">
          <table className="w-full border-collapse min-w-250">
            <thead>
              <tr className="text-[9px] font-black text-[#94a3b8] uppercase tracking-widest border-b-2 border-[#0f172a]">
                <th className="py-4 px-2 no-print"></th>
                <th className="py-4 px-2 text-left">Artikel No</th>
                <th className="py-4 px-2 text-left">Model / Renk</th>
                <th className="py-4 px-2 text-left">Müşteri</th>
                <th className="py-4 px-2 text-left">Konum</th>
                <th className="py-4 px-2 text-right text-blue-600">Plan</th>
                <th className="py-4 px-2 text-right text-emerald-600">Kesim</th>
                <th className="py-4 px-2 text-right text-indigo-600">Yükleme</th>
                <th className="py-4 px-2 text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredOrders.map((o) => {
                const isExpanded = expandedId === o.id;
                const isArchived = o.status === 'archived' || o.is_archived === true;
                const pTotal = Object.values(o.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
                const cTotal = Object.values(o.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
                const sTotal = Object.values(o.shipped_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
                const diffTotal = sTotal - cTotal;

                const activeSizes = Object.keys(o.qty_by_size || {}).sort((a,b) => sizeOrder.indexOf(a.toUpperCase()) - sizeOrder.indexOf(b.toUpperCase()));

                return (
                  <React.Fragment key={o.id}>
                    <tr onClick={() => setExpandedId(isExpanded ? null : o.id)} className={`group cursor-pointer transition-all ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                      <td className="py-4 px-2 text-slate-300 no-print">{isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</td>
                      <td className="py-4 px-2 font-black text-[#0f172a] text-sm uppercase">{o.article}</td>
                      <td className="py-4 px-2">
                        <div className="text-[11px] font-bold text-[#1e293b] uppercase leading-none">{o.model}</div>
                        <div className="text-[9px] font-bold text-[#64748b] uppercase mt-1">{o.color}</div>
                      </td>
                      <td className="py-4 px-2 text-[10px] font-black text-[#1e293b] uppercase">{o.customer}</td>
                      <td className="py-4 px-2">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-black border uppercase ${isArchived ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-[#2563eb] border-[#2563eb]'}`}>
                           {isArchived ? <Truck size={10}/> : <MapPin size={10}/>} {isArchived ? 'SEVK EDİLDİ' : getStageLabel(o.current_stage)}
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right font-black text-slate-400 text-sm">{pTotal}</td>
                      <td className="py-4 px-2 text-right font-black text-emerald-600 text-sm">{cTotal || '-'}</td>
                      <td className="py-4 px-2 text-right font-black text-indigo-600 text-sm">{sTotal || '-'}</td>
                      <td className="py-4 px-2 text-center">{isArchived ? <Truck size={16} className="text-indigo-600 mx-auto" /> : <CheckCircle2 size={16} className={cTotal >= pTotal ? "text-emerald-500 mx-auto" : "text-slate-200 mx-auto"} />}</td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="9" className="p-6">
                          <div className="bg-white rounded-3xl border border-slate-200 shadow-inner overflow-hidden max-w-full overflow-x-auto">
                            <div className="bg-slate-900 px-6 py-3 flex items-center gap-2">
                              <PackageCheck size={14} className="text-blue-400" />
                              <h3 className="text-[10px] font-black text-white uppercase tracking-wider">Beden Dağılım Matrisi</h3>
                            </div>
                            
                            <table className="w-full text-center text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                                  <th className="py-3 px-4 text-left font-black bg-slate-100 sticky left-0 z-10 w-28 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">AŞAMA</th>
                                  {activeSizes.map(size => <th key={size} className="py-3 px-3 min-w-16 border-l border-slate-200/60 font-black text-slate-800">{size}</th>)}
                                  {/* 🛠️ YENİ TOPLAM SÜTUNU BAŞLIĞI */}
                                  <th className="py-3 px-4 text-right font-black bg-slate-800 text-white min-w-20">TOPLAM</th>
                                </tr>
                              </thead>
                              <tbody className="font-bold">
                                {/* KESİM SATIRI */}
                                <tr className="border-b border-slate-100">
                                  <td className="py-2.5 px-4 text-left font-black text-emerald-600 bg-slate-50/80 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-[10px]">KESİLEN</td>
                                  {activeSizes.map(size => <td key={size} className="py-2.5 px-3 border-l border-slate-100 text-emerald-700 font-black">{o.cutting_qty?.[size] || 0}</td>)}
                                  {/* 🛠️ KESİM TOPLAMI */}
                                  <td className="py-2.5 px-4 text-right font-black text-emerald-700 bg-emerald-50">{cTotal}</td>
                                </tr>
                                {/* SEVK SATIRI */}
                                <tr className="border-b border-slate-100">
                                  <td className="py-2.5 px-4 text-left font-black text-indigo-600 bg-slate-50/80 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-[10px]">SEVK EDİLEN</td>
                                  {activeSizes.map(size => <td key={size} className="py-2.5 px-3 border-l border-slate-100 text-indigo-700 font-black">{o.shipped_qty?.[size] || 0}</td>)}
                                  {/* 🛠️ SEVK TOPLAMI */}
                                  <td className="py-2.5 px-4 text-right font-black text-indigo-700 bg-indigo-50">{sTotal}</td>
                                </tr>
                                {/* FARK SATIRI */}
                                <tr className="bg-slate-50/30">
                                  <td className="py-2.5 px-4 text-left font-black text-slate-500 bg-slate-100/50 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-[10px]">FARK / FİRE</td>
                                  {activeSizes.map(size => {
                                    const c = Number(o.cutting_qty?.[size] || 0);
                                    const s = Number(o.shipped_qty?.[size] || 0);
                                    const diff = s - c;
                                    return (
                                      <td key={size} className={`py-2.5 px-3 border-l border-slate-100 font-black text-[11px] ${diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                        {diff > 0 ? `+${diff}` : diff}
                                      </td>
                                    );
                                  })}
                                  {/* 🛠️ GENEL FARK / FİRE TOPLAMI */}
                                  <td className={`py-2.5 px-4 text-right font-black text-[11px] bg-slate-100 ${diffTotal === 0 ? 'text-slate-500' : diffTotal > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                    {diffTotal > 0 ? `+${diffTotal}` : diffTotal}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Alt Bilgi */}
        <div className="p-8 border-t-2 border-[#0f172a] flex justify-between items-center text-[9px] font-black text-[#94a3b8] uppercase tracking-widest bg-white">
          <div>© NAVY BLUE ERP - PRECISION LOGISTICS</div>
          <div className="flex gap-10">
            <div>KESİM/SEVK FARKI: <span className={totalShipped - totalCut >= 0 ? 'text-emerald-600' : 'text-red-500'}>{totalShipped - totalCut} ADET</span></div>
            <div className="font-black text-[#0f172a]">ALFA SPOR GİYİM SAN. TİC. LTD. ŞTİ.</div>
          </div>
        </div>
      </div>
    </div>
  );
}