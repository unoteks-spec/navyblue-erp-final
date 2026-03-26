import React, { useEffect, useState, useRef } from 'react';
import { 
  getFabricsByOrderNo, 
  updateGroupFabricStatus, 
  updateGroupFabricDeadlines, 
  supabase 
} from '../../api/orderService';
import { X, CheckCircle, RotateCcw, FileDown, Loader2, Calendar, Save, Hash } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function FabricOrderPrint({ order, onClose, onSuccess }) {
  const [summary, setSummary] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 🚀 BATCH (PARTİ) YÖNETİMİ
  // Her açılışta yeni bir parti kodu üretir, istersen elle de değiştirebilirsin
  const [batchNo, setBatchNo] = useState(`BATCH-${new Date().toISOString().slice(0,10)}-${Math.floor(Math.random()*1000)}`);
  const [isOrderFinalized, setIsOrderFinalized] = useState(false);

  const [deadlines, setDeadlines] = useState({
    knitted: order.knitted_deadline || '',
    woven: order.woven_deadline || ''
  });

  const knittedRef = useRef();
  const wovenRef = useRef();
  const orderNo = order?.order_no;

  useEffect(() => {
    if (orderNo) {
      getFabricsByOrderNo(orderNo).then(data => setSummary(data));
    }
  }, [orderNo]);

  // ✅ 1. TEDARİK PARTİSİNİ KAYDETME (RPT Karışıklığını Önleyen Kısım)
  const handleFinalizeFabricOrder = async () => {
    if (!window.confirm(`${batchNo} kodlu yeni bir tedarik partisi oluşturulacak. Emin misiniz?`)) return;
    
    setUpdating(true);
    try {
      // 1. Mevcut kumaş ihtiyacını 'fabric_procurements' tablosuna parti bazlı ekle
      // Not: Veritabanında bu tablonun olması gerekir.
      const { error } = await supabase.from('fabric_procurements').insert(
        summary.map(f => ({
          order_no: orderNo,
          batch_no: batchNo,
          fabric_kind: f.kind,
          fabric_color: f.color,
          planned_amount: f.totalAmount,
          unit: f.unit,
          status: 'ordered',
          created_at: new Date()
        }))
      );

      if (error) throw error;

      // 2. Ana sipariş kartını "Sipariş Edildi" (Mavi Renk) olarak işaretle
      await updateGroupFabricStatus(orderNo, true);
      
      setIsOrderFinalized(true);
      if (onSuccess) onSuccess();
      alert(`Tebrikler! ${batchNo} nolu tedarik partisi başarıyla oluşturuldu.`);
    } catch (e) {
      alert("Hata: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  // ✅ 2. TERMİNLERİ KAYDETME
  const handleSaveDeadlines = async () => {
    setUpdating(true);
    try {
      await updateGroupFabricDeadlines(orderNo, deadlines);
      if (onSuccess) onSuccess();
      alert("Termin tarihleri tüm grup için güncellendi.");
    } catch (e) {
      alert("Hata: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  // ✅ 3. PDF OLUŞTURMA
  const handleDownloadPDF = async (type, elementRef) => {
    if (!elementRef.current) return;
    setIsGenerating(true);
    try {
      const element = elementRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: "#ffffff"
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
      pdf.save(`Alfa_${orderNo}_${batchNo}_${type.toUpperCase()}_${dateStr}.pdf`);
    } catch (error) {
      alert("PDF oluşturulurken bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  const knittedFabrics = summary.filter(f => f.type === 'Örme');
  const wovenFabrics = summary.filter(f => f.type === 'Dokuma');

  return (
    <div className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-md overflow-y-auto p-4 md:p-8">
      
      {/* ÜST KONTROL PANELİ */}
      <div className="max-w-4xl mx-auto mb-6 bg-white p-6 rounded-[2.5rem] shadow-2xl sticky top-0 z-10 no-print border border-slate-100">
        <div className="flex flex-wrap justify-between items-center gap-4">
          
          {/* Parti Kodu Girişi */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Aktif Tedarik Partisi (Batch)</span>
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
               <Hash size={14} className="text-blue-600" />
               <input 
                 value={batchNo} 
                 onChange={(e) => setBatchNo(e.target.value.toUpperCase())}
                 className="bg-transparent border-none outline-none text-[11px] font-black text-slate-900 w-48"
                 placeholder="BATCH KODU..."
               />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleFinalizeFabricOrder}
              disabled={updating || isOrderFinalized}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all shadow-lg active:scale-95 ${
                isOrderFinalized || order.fabric_ordered 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {updating ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
              {isOrderFinalized || order.fabric_ordered ? 'Parti Onaylandı' : 'Siparişi Batch Olarak Kaydet'}
            </button>
            <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={32} /></button>
          </div>
        </div>

        {/* TERMIN VE PDF ALANI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-50 mt-4 items-end">
           <div className="space-y-1.5">
              <label className="text-[9px] font-black text-emerald-600 uppercase ml-1">Örme Termini</label>
              <input type="date" value={deadlines.knitted} onChange={(e) => setDeadlines({...deadlines, knitted: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" />
           </div>
           <div className="space-y-1.5">
              <label className="text-[9px] font-black text-orange-600 uppercase ml-1">Dokuma Termini</label>
              <input type="date" value={deadlines.woven} onChange={(e) => setDeadlines({...deadlines, woven: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-orange-500" />
           </div>
           <div className="flex gap-2">
              <button onClick={handleSaveDeadlines} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-[9px] uppercase hover:bg-slate-800 transition-all">Tarihleri İşle</button>
              {knittedFabrics.length > 0 && <button onClick={() => handleDownloadPDF('orme', knittedRef)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"><FileDown size={18}/></button>}
              {wovenFabrics.length > 0 && <button onClick={() => handleDownloadPDF('dokuma', wovenRef)} className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-100 hover:bg-orange-600 hover:text-white transition-all"><FileDown size={18}/></button>}
           </div>
        </div>
      </div>

      {/* PDF TASLAKLARI */}
      <div className="space-y-20 pb-20">
        {knittedFabrics.length > 0 && (
          <div ref={knittedRef} className="max-w-4xl mx-auto bg-white p-16 shadow-2xl">
             <PDFHeader title="Örme Kumaş" orderNo={orderNo} batchNo={batchNo} hex="#059669" />
             <FabricTable data={knittedFabrics} />
             <PDFFooter />
          </div>
        )}

        {wovenFabrics.length > 0 && (
          <div ref={wovenRef} className="max-w-4xl mx-auto bg-white p-16 shadow-2xl">
             <PDFHeader title="Dokuma Kumaş" orderNo={orderNo} batchNo={batchNo} hex="#ea580c" />
             <FabricTable data={wovenFabrics} />
             <PDFFooter />
          </div>
        )}
      </div>
    </div>
  );
}

// PDF YARDIMCI BİLEŞENLERİ
const PDFHeader = ({ title, orderNo, batchNo, hex }) => (
  <div style={{ borderBottom: `4px solid #0f172a`, paddingBottom: '24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-1px' }}>Alfa Spor</h1>
      <p style={{ fontSize: '11px', fontWeight: '800', color: hex, textTransform: 'uppercase', letterSpacing: '3px', marginTop: '4px' }}>{title} TEDARİK FORMU</p>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>REF: {orderNo}</div>
      <div style={{ fontSize: '11px', fontWeight: '900', color: '#3b82f6', marginTop: '4px' }}>PARTİ: {batchNo}</div>
      <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', marginTop: '2px' }}>{new Date().toLocaleDateString('tr-TR')}</div>
    </div>
  </div>
);

const PDFFooter = () => (
  <div style={{ marginTop: '80px', paddingTop: '32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
    <div style={{ maxWidth: '300px' }}>
      <p style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic', margin: 0, lineHeight: '1.5' }}>
        * Bu form dijital olarak Alfa Spor ERP üzerinden oluşturulmuştur.<br/>
        * Sipariş miktarlarına %5 kesim payı ilave edilmiştir.<br/>
        * Belirtilen parti numarası (Batch) tüm sevkiyat evraklarında belirtilmelidir.
      </p>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ width: '150px', height: '1px', backgroundColor: '#e2e8f0', marginBottom: '12px', marginLeft: 'auto' }}></div>
      <p style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px' }}>Alfa Spor Yetkili Onayı</p>
    </div>
  </div>
);

const FabricTable = ({ data }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
        <th style={{ padding: '16px 0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Kumaş Cinsi ve Renk Detayı</th>
        <th style={{ padding: '16px 0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Sipariş Miktarı</th>
      </tr>
    </thead>
    <tbody>
      {data.map((f, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
          <td style={{ padding: '20px 0' }}>
            <div style={{ fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', fontSize: '15px' }}>{f.kind}</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#3b82f6', marginTop: '4px', textTransform: 'uppercase' }}>Renk: {f.color}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>İçerik: {f.content || 'Standart'}</div>
          </td>
          <td style={{ padding: '20px 0', textAlign: 'right' }}>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>
              {Number(f.totalAmount || 0).toFixed(2)} 
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px', fontWeight: '700' }}>{f.unit.toUpperCase()}</span>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);