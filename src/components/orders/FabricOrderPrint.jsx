import React, { useEffect, useState, useRef } from 'react';
// updateGroupFabricDeadlines fonksiyonunu orderService'e eklediğini varsayıyoruz
import { getFabricsByOrderNo, updateGroupFabricStatus, updateGroupFabricDeadlines } from '../../api/orderService';
import { X, CheckCircle, RotateCcw, FileDown, Loader2, Calendar, Save } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function FabricOrderPrint({ order, onClose, onSuccess }) {
  const [summary, setSummary] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 🛠️ TERMIN STATE'LERI
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

  // ✅ 1. TERMINLERI GRUP BAZINDA KAYDETME
  const handleSaveDeadlines = async () => {
    setUpdating(true);
    try {
      await updateGroupFabricDeadlines(orderNo, deadlines);
      if (onSuccess) onSuccess();
      alert("Termin tarihleri tüm grup için kaydedildi!");
    } catch (e) {
      alert("Hata: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

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
      const date = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
      const fileName = `AlfaSpor_Siparis_${orderNo}_${type.toUpperCase()}_${date}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      alert("PDF oluşturulurken bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleOrdered = async () => {
    setUpdating(true);
    try {
      await updateGroupFabricStatus(orderNo, !order.fabric_ordered);
      if (onSuccess) onSuccess();
    } catch (e) { alert("Hata: " + e.message); }
    finally { setUpdating(false); }
  };

  const knittedFabrics = summary.filter(f => f.type === 'Örme');
  const wovenFabrics = summary.filter(f => f.type === 'Dokuma');

  return (
    <div className="fixed inset-0 z-100 bg-slate-900/50 backdrop-blur-sm overflow-y-auto p-4 md:p-8">
      
      {/* ÜST KONTROL PANELİ */}
      <div className="max-w-4xl mx-auto mb-6 bg-white p-6 rounded-3xl shadow-2xl sticky top-0 z-10 no-print space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          
          {/* PDF Butonları */}
          <div className="flex gap-2">
            {knittedFabrics.length > 0 && (
              <button 
                onClick={() => handleDownloadPDF('orme', knittedRef)} 
                disabled={isGenerating}
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 transition-all uppercase"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <FileDown size={14} />} Örme PDF
              </button>
            )}
            {wovenFabrics.length > 0 && (
              <button 
                onClick={() => handleDownloadPDF('dokuma', wovenRef)} 
                disabled={isGenerating}
                className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-orange-600 disabled:opacity-50 transition-all uppercase"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <FileDown size={14} />} Dokuma PDF
              </button>
            )}
          </div>

          {/* Sipariş Durumu ve Kapatma */}
          <div className="flex items-center gap-3">
            <button 
              onClick={handleToggleOrdered}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${
                order.fabric_ordered ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {order.fabric_ordered ? <CheckCircle size={14} /> : <RotateCcw size={14} />}
              {order.fabric_ordered ? 'Grup Sipariş Edildi' : 'Grubu İşaretle'}
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={28} /></button>
          </div>
        </div>

        {/* 🛠️ TERMIN GIRIŞ ALANI */}
        <div className="flex flex-wrap items-end gap-4 pt-4 border-t border-slate-100">
           <div className="flex-1 min-w-37.5">
              <label className="block text-[9px] font-black text-emerald-600 uppercase mb-1 ml-1">Örme Kumaş Termini</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="date" 
                  value={deadlines.knitted}
                  onChange={(e) => setDeadlines({...deadlines, knitted: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
           </div>

           <div className="flex-1 min-w-37.5">
              <label className="block text-[9px] font-black text-orange-600 uppercase mb-1 ml-1">Dokuma Kumaş Termini</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="date" 
                  value={deadlines.woven}
                  onChange={(e) => setDeadlines({...deadlines, woven: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
           </div>

           <button 
             onClick={handleSaveDeadlines}
             disabled={updating}
             className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-blue-600 transition-all shadow-lg active:scale-95"
           >
             {updating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
             Tarihleri Kaydet
           </button>
        </div>
      </div>

      {/* PDF İÇERİKLERİ */}
      <div className="space-y-20">
        {knittedFabrics.length > 0 && (
          <div ref={knittedRef} className="max-w-4xl mx-auto bg-white p-16 rounded-sm">
             <PDFHeader title="Örme Kumaş" orderNo={orderNo} hex="#059669" />
             <FabricTable data={knittedFabrics} />
             <PDFFooter />
          </div>
        )}

        {wovenFabrics.length > 0 && (
          <div ref={wovenRef} className="max-w-4xl mx-auto bg-white p-16 rounded-sm">
             <PDFHeader title="Dokuma Kumaş" orderNo={orderNo} hex="#ea580c" />
             <FabricTable data={wovenFabrics} />
             <PDFFooter />
          </div>
        )}
      </div>
    </div>
  );
}

// PDF ALT BİLEŞENLERİ (Aynen korundu)
const PDFHeader = ({ title, orderNo, hex }) => (
  <div style={{ borderBottom: `4px solid #0f172a`, paddingBottom: '24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between' }}>
    <div>
      <h1 style={{ fontSize: '30px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Alfa Spor</h1>
      <p style={{ fontSize: '10px', fontWeight: '700', color: hex, textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>{title} TEDARİK FORMU</p>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>NO: {orderNo}</div>
      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>{new Date().toLocaleDateString('tr-TR')}</div>
    </div>
  </div>
);

const PDFFooter = () => (
  <div style={{ marginTop: '60px', paddingTop: '32px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
    <p style={{ fontSize: '9px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>
      * Bu miktar %5 kesim fazlalığı eklenerek hesaplanmıştır.<br/>
      * Alfa Spor Dijital Sipariş Formu.
    </p>
    <div style={{ textAlign: 'right' }}>
      <div style={{ width: '120px', height: '1px', backgroundColor: '#e2e8f0', marginBottom: '8px', marginLeft: 'auto' }}></div>
      <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Alfa Spor Onayı</p>
    </div>
  </div>
);

const FabricTable = ({ data }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
        <th style={{ padding: '12px 0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Cins / Renk</th>
        <th style={{ padding: '12px 0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Miktar</th>
      </tr>
    </thead>
    <tbody>
      {data.map((f, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
          <td style={{ padding: '16px 0' }}>
            <div style={{ fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', fontSize: '14px' }}>{f.kind} - {f.color}</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{f.content}</div>
          </td>
          <td style={{ padding: '16px 0', textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
              {Number(f.totalAmount || 0).toFixed(2)} 
              <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px' }}>{f.unit.toUpperCase()}</span>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);