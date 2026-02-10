import React, { useEffect, useState, useRef } from 'react';
import { getAllOrders } from '../api/orderService';
import { MapPin, CheckCircle2, FileBarChart, Download, Search } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ProductionReport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const reportRef = useRef(null);

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

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      setExporting(true);
      const element = reportRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { color-scheme: light !important; border-color: #e2e8f0 !important; }
            .pdf-text-black { color: #0f172a !important; }
            .pdf-text-blue { color: #2563eb !important; }
            .pdf-text-emerald { color: #10b981 !important; }
          `;
          clonedDoc.head.appendChild(style);
          // PDF dökümünde kaydırma çubuğu çıkmasın diye genişliği zorluyoruz
          const table = clonedDoc.querySelector('table');
          if(table) table.style.minWidth = 'auto';
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`NavyBlue_Rapor_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Hatası:", error);
    } finally {
      setExporting(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const statusMatch = filter === 'all' || 
                       (filter === 'pending' && o.status !== 'cut_completed') || 
                       (filter === 'completed' && o.status === 'cut_completed');
    const customerMatch = !customerFilter || o.customer?.toLowerCase().includes(customerFilter.toLowerCase());
    const orderMatch = !orderFilter || o.order_no?.toLowerCase().includes(orderFilter.toLowerCase());
    return statusMatch && customerMatch && orderMatch;
  });

  const totalPlanned = filteredOrders.reduce((sum, o) => sum + Object.values(o.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0), 0);
  const totalCut = filteredOrders.reduce((sum, o) => sum + Object.values(o.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0), 0);

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-[0.3em] text-[10px]">Veriler Hazırlanıyor...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32">
      
      {/* ÜST PANEL */}
      <div className="bg-white p-5 rounded-4xl border border-slate-100 shadow-sm space-y-4 no-print">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-lg">
              <FileBarChart size={20} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Üretim Raporu</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-1">Navy Blue ERP</p>
            </div>
          </div>
          <button 
            onClick={downloadPDF} 
            disabled={exporting}
            style={{ backgroundColor: exporting ? '#e2e8f0' : '#2563eb' }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] text-white transition-all uppercase tracking-widest shadow-lg"
          >
            {exporting ? 'Hazırlanıyor...' : <><Download size={16} /> PDF İndir</>}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" placeholder="Müşteri Filtresi..." value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-[10px] font-bold outline-none" />
          <input type="text" placeholder="Grup (Order) No..." value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-[10px] font-bold outline-none" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none cursor-pointer">
            <option value="all">Tüm Siparişler</option>
            <option value="pending">İşlemde</option>
            <option value="completed">Bitenler</option>
          </select>
        </div>
      </div>

      {/* --- RAPOR KONTEYNERI --- */}
      <div ref={reportRef} data-report-container className="bg-white rounded-4xl border border-[#0f172a] overflow-hidden shadow-none">
        
        <div style={{ backgroundColor: '#ffffff', borderBottom: '4px solid #0f172a' }} className="p-8 text-[#0f172a] flex justify-between items-end">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter uppercase">NAVY BLUE</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Üretim Akış ve Sevkiyat Dökümü</p>
          </div>
          <div className="text-right space-y-1">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Döküm Tarihi</div>
            <div className="text-sm font-black">{new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>

        {/* Özet Veriler */}
        <div className="grid grid-cols-3 border-b border-[#f1f5f9]">
          <div className="p-6 text-center border-r border-[#f1f5f9]">
            <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Sipariş Sayısı</div>
            <div className="text-2xl font-black text-[#0f172a]">{filteredOrders.length}</div>
          </div>
          <div className="p-6 text-center border-r border-[#f1f5f9]">
            <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Planlanan</div>
            <div className="text-2xl font-black text-[#2563eb]">{totalPlanned.toLocaleString()}</div>
          </div>
          <div className="p-6 text-center">
            <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Kesilen</div>
            <div className="text-2xl font-black text-[#10b981]">{totalCut.toLocaleString()}</div>
          </div>
        </div>

        {/* 🛠️ MOBİL KAYDIRMA DÜZELTMESİ (overflow-x-auto + min-w) */}
        <div className="p-4 md:p-8 overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-250">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-[#0f172a]">
                <th className="py-4 px-2 text-left">Artikel No</th>
                <th className="py-4 px-2 text-left">Model</th>
                <th className="py-4 px-2 text-left">Renk</th>
                <th className="py-4 px-2 text-left">Müşteri / Grup</th>
                <th className="py-4 px-2 text-left" style={{ color: '#2563eb' }}>Konum</th>
                <th className="py-4 px-2 text-center">Termin</th>
                <th className="py-4 px-2 text-right">Plan</th>
                <th className="py-4 px-2 text-right">Kesim</th>
                <th className="py-4 px-2 text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredOrders.map((o) => {
                const planned = Object.values(o.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
                const cut = Object.values(o.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
                return (
                  <tr key={o.id}>
                    <td className="py-4 px-2 font-black text-[#0f172a] text-sm uppercase">{o.article}</td>
                    <td className="py-4 px-2 text-[11px] font-bold text-[#1e293b] uppercase">{o.model || '-'}</td>
                    <td className="py-4 px-2 text-[11px] font-bold text-[#64748b] uppercase">{o.color || '-'}</td>
                    <td className="py-4 px-2">
                      <div className="text-[11px] font-black text-[#1e293b] uppercase leading-none">{o.customer}</div>
                      <div className="text-[9px] font-bold uppercase mt-1" style={{ color: '#2563eb' }}>Grup: {o.order_no}</div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-black border uppercase" style={{ backgroundColor: '#ffffff', color: '#2563eb', borderColor: '#2563eb' }}>
                        <MapPin size={10} /> {getStageLabel(o.current_stage || 'kesimhanede')}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center font-bold text-[10px] text-slate-500">{o.due ? new Date(o.due).toLocaleDateString('tr-TR') : '-'}</td>
                    <td className="py-4 px-2 text-right font-black text-slate-400 text-sm">{planned}</td>
                    <td className="py-4 px-2 text-right font-black text-[#0f172a] text-sm">{cut || '-'}</td>
                    <td className="py-4 px-2 text-center">
                      {o.status === 'cut_completed' ? (
                        <CheckCircle2 size={16} style={{ color: '#10b981', margin: '0 auto' }} />
                      ) : (
                        <span className="text-[8px] font-black uppercase border px-1.5 py-0.5 rounded" style={{ color: '#f59e0b', borderColor: '#f59e0b' }}>İşlemde</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-8 border-t-2 border-[#0f172a] flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
          <div>© NAVY BLUE ERP - MADE FOR SEABORNS</div>
          <div className="flex gap-10">
            <div>TOPLAM FARK: <span style={{ color: (totalPlanned - totalCut > 0) ? '#ef4444' : '#10b981' }}>{totalPlanned - totalCut} ADET</span></div>
            <div className="text-[#0f172a] font-black">NAVY BLUE PRODUCTION</div>
          </div>
        </div>
      </div>
    </div>
  );
}