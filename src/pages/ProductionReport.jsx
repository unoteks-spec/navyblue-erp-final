import React, { useEffect, useState } from 'react';
import { getAllOrders } from '../api/orderService';
import { Printer, FileText, MapPin, CheckCircle2, FileBarChart } from 'lucide-react'; // 👈 FileBarChart eklendi

export default function ProductionReport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  const handlePrint = () => window.print();

  const filteredOrders = orders.filter(o => {
    if (filter === 'pending') return o.status !== 'cut_completed';
    if (filter === 'completed') return o.status === 'cut_completed';
    return true;
  });

  const totalPlanned = filteredOrders.reduce((sum, o) => {
    const qty = Object.values(o.qty_by_size || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    return sum + qty;
  }, 0);

  const totalCut = filteredOrders.reduce((sum, o) => {
    const qty = Object.values(o.cutting_qty || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    return sum + qty;
  }, 0);

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-[0.3em] text-[10px]">Rapor Hazırlanıyor...</div>;

  return (
    // 1. STANDART GENİŞLİK VE MOBİL UYUM (max-w-7xl)
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 pb-32">
      
      {/* 2. STANDART BAŞLIK YAPISI (İkonlu ve İtalik Olmayan) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-4xl border border-slate-100 shadow-sm no-print gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-lg">
            <FileBarChart size={20} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase">Üretim Raporu</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">Sipariş ve Kesim Dökümü</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select 
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-50 border-none rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="all">Tüm Siparişler</option>
            <option value="pending">Sadece Bekleyenler</option>
            <option value="completed">Sadece Kesilenler</option>
          </select>
          <button onClick={handlePrint} className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:scale-105 transition-all uppercase tracking-widest">
            <Printer size={16} /> Yazdır
          </button>
        </div>
      </div>

      {/* --- RAPOR SAYFASI (A4 FORMATI) --- */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-50 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        
        {/* Rapor Başlığı - Modern Siyah Şerit */}
        <div className="bg-slate-900 p-8 md:p-10 text-white flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter uppercase">NAVY BLUE</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Üretim Akış ve Sevkiyat Dökümü</p>
          </div>
          <div className="text-left md:text-right space-y-1">
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Rapor Tarihi</div>
            <div className="text-sm font-black">{new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>

        {/* Özet Veriler Şeridi */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
          <div className="p-6 md:p-8 text-center">
            <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Aktif İş Emri</div>
            <div className="text-3xl font-black text-slate-900">{filteredOrders.length}</div>
          </div>
          <div className="p-6 md:p-8 text-center">
            <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Planlanan Toplam</div>
            <div className="text-3xl font-black text-blue-600">{totalPlanned.toLocaleString()}</div>
          </div>
          <div className="p-6 md:p-8 text-center">
            <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Gerçekleşen Kesim</div>
            <div className="text-3xl font-black text-emerald-600">{totalCut.toLocaleString()}</div>
          </div>
        </div>

        {/* Tablo Alanı */}
        <div className="p-4 md:p-8 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="py-4 px-2 text-left">Sipariş No</th>
                <th className="py-4 px-2 text-left">Müşteri / Model</th>
                <th className="py-4 px-2 text-left text-blue-600">Konum</th>
                <th className="py-4 px-2 text-center">Termin</th>
                <th className="py-4 px-2 text-right">Plan</th>
                <th className="py-4 px-2 text-right">Kesim</th>
                <th className="py-4 px-2 text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
              {filteredOrders.map((o) => {
                const planned = Object.values(o.qty_by_size || {}).reduce((a, b) => a + (Number(b) || 0), 0);
                const cut = Object.values(o.cutting_qty || {}).reduce((a, b) => a + (Number(b) || 0), 0);
                const isCompleted = o.status === 'cut_completed';
                const currentStage = o.current_stage || 'kesimhanede';

                return (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-2">
                      <div className="font-black text-slate-900 tracking-tighter uppercase text-sm">{o.order_no}</div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="text-[11px] font-black text-slate-800 uppercase leading-none">{o.customer}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-tighter truncate max-w-37.5">
                        {o.article} <span className="text-slate-200">/</span> {o.model}
                      </div>
                    </td>
                    
                    <td className="py-4 px-2">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest border ${
                        currentStage === 'yuklendi' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        <MapPin size={10} />
                        {getStageLabel(currentStage)}
                      </div>
                    </td>

                    <td className="py-4 px-2 text-center font-bold text-[10px] text-slate-500">
                      {o.due ? new Date(o.due).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="py-4 px-2 text-right font-black text-slate-400 text-sm">{planned}</td>
                    <td className="py-4 px-2 text-right font-black text-slate-900 text-sm">{cut || '-'}</td>
                    <td className="py-4 px-2 text-center">
                      {isCompleted ? (
                        <div className="flex items-center justify-center text-emerald-500">
                          <CheckCircle2 size={16} />
                        </div>
                      ) : (
                        <span className="text-[8px] font-black text-amber-500 uppercase border border-amber-100 px-1.5 py-0.5 rounded">İşlemde</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rapor Alt Bilgi */}
        <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
          <div className="font-bold text-slate-400">* BU BELGE NAVY BLUE ERP ÜZERİNDEN OTOMATİK ÜRETİLMİŞTİR.</div>
          <div className="flex gap-6 md:gap-10">
            <div>KESİM FARKI: <span className={totalPlanned - totalCut > 0 ? "text-red-500" : "text-emerald-500"}>
              {totalPlanned - totalCut} ADET
            </span></div>
            <div className="text-slate-900">NAVY BLUE OPS</div>
          </div>
        </div>
      </div>
    </div>
  );
}