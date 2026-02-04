 import React, { useEffect, useRef, useState } from 'react';
import { X, Scissors, Ruler, Info, Calculator, FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function CuttingOrderPrint({ order, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef(); 
  
  // 🛠️ BEDEN SIRALAMASI: Orders.jsx ile %100 Uyumlu
  const SIZE_ORDER = ['3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'I', 'II', 'STD'];
  
  // Bedenleri bu anahtara göre sıralıyoruz ve sadece adet girilenleri alıyoruz
  const sortedSizes = Object.keys(order.qty_by_size || {})
    .filter(s => (order.qty_by_size[s] || 0) > 0)
    .sort((a, b) => {
      const indexA = SIZE_ORDER.indexOf(a.toUpperCase());
      const indexB = SIZE_ORDER.indexOf(b.toUpperCase());
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

  const extraPercent = Number(order.extra_percent) || 0;
  const extraFactor = 1 + (extraPercent / 100);

  const totalSiparis = Object.values(order.qty_by_size || {}).reduce((a, b) => a + Number(b), 0);
  const totalPlanlanan = Math.ceil(totalSiparis * extraFactor);

  const fabrics = Object.values(order.fabrics || {}).filter(f => f.kind);

  // ✅ PDF ÜRETME FONKSİYONU
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);

    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          const noPrintElements = clonedDoc.querySelectorAll('.no-print');
          noPrintElements.forEach(el => el.style.display = 'none');
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const date = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
      const fileName = `AlfaSpor_Kesim_${order.order_no}_${date}.pdf`;
      
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF Üretim Hatası:", error);
      alert("PDF renk uyumsuzluğu nedeniyle oluşturulamadı. Lütfen bu sürümü kaydedip tekrar deneyin.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-200 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-0 md:p-8 overflow-y-auto">
      
      <div 
        ref={printRef} 
        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
        className="w-full max-w-[210mm] min-h-[297mm] shadow-2xl relative p-12 flex flex-col"
      >
        
        <div className="absolute top-4 right-4 flex gap-3 no-print z-50">
          <button 
            onClick={handleDownloadPDF} 
            disabled={isGenerating}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 shadow-lg transition-all"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />} 
            PDF İNDİR
          </button>
          <button onClick={onClose} className="bg-white text-slate-500 px-4 py-2.5 rounded-xl font-bold border border-slate-200 hover:bg-red-50 shadow-md">
            <X size={20} />
          </button>
        </div>

        <div className="grow">
          <div style={{ borderBottom: '2px solid #0f172a' }} className="pb-6 flex justify-between items-end">
            <div>
              <h1 style={{ color: '#0f172a' }} className="text-4xl font-black tracking-tighter uppercase">KESİM EMRİ</h1>
              <p style={{ color: '#64748b' }} className="text-[10px] font-bold uppercase tracking-[0.3em] mt-1">ALFA SPOR GİYİM LTD. ŞTİ.</p>
            </div>
            <div className="text-right">
              <div style={{ border: '2px solid #0f172a', color: '#0f172a' }} className="text-xl font-bold px-4 py-1 inline-block">{order.order_no}</div>
              <div style={{ color: '#94a3b8' }} className="text-[9px] font-bold mt-1 uppercase tracking-widest">SİPARİŞ NO</div>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid #e2e8f0' }} className="grid grid-cols-12 gap-8 py-8">
            <div className="col-span-8 grid grid-cols-2 gap-y-4 gap-x-8">
              <InfoBox label="Müşteri" value={order.customer} />
              <InfoBox label="Renk" value={order.color} />
              <InfoBox label="Artikel" value={order.article} />
              <InfoBox label="Kesim Tarihi" value={order.cutting_date || '---'} />
              <InfoBox label="Model" value={order.model} />
              <InfoBox label="Çizim (Pastal) Eni" value={order.marker_width ? `${order.marker_width} CM` : '---'} />
            </div>
            <div style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }} className="col-span-4 border rounded-xl flex items-center justify-center p-2 min-h-40">
              {order.model_image ? (
                <img src={order.model_image} alt="Model" className="max-w-full max-h-full object-contain" />
              ) : (
                <div style={{ color: '#cbd5e1' }} className="text-[10px] font-bold text-center uppercase">Resim Yok</div>
              )}
            </div>
          </div>

          <div className="py-6">
            <h3 style={{ color: '#475569' }} className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <Ruler size={14} /> Hammadde Detayları
            </h3>
            <table style={{ borderColor: '#e2e8f0' }} className="w-full border-collapse border text-left text-xs">
              <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                  <th style={{ borderColor: '#e2e8f0', color: '#0f172a' }} className="p-2 border font-bold">Kumaş Cinsi</th>
                  <th style={{ borderColor: '#e2e8f0', color: '#0f172a' }} className="p-2 border font-bold">Renk / İçerik</th>
                  <th style={{ borderColor: '#e2e8f0', color: '#0f172a' }} className="p-2 border font-bold text-right">Birim Gider</th>
                </tr>
              </thead>
              <tbody>
                {fabrics.map((f, i) => (
                  <tr key={i}>
                    <td style={{ borderColor: '#e2e8f0', color: '#1e293b' }} className="p-2 border font-medium uppercase">{f.kind}</td>
                    <td style={{ borderColor: '#e2e8f0', color: '#475569' }} className="p-2 border uppercase">{f.color || order.color} {f.content && `- ${f.content}`}</td>
                    <td style={{ borderColor: '#e2e8f0', color: '#0f172a' }} className="p-2 border text-right font-bold">{f.perPieceKg} {f.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="py-6">
            <h3 style={{ color: '#475569' }} className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <Calculator size={14} /> Beden Dağılımı
            </h3>
            <table style={{ borderColor: '#0f172a' }} className="w-full border-collapse border-2 text-center table-fixed">
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ borderColor: '#cbd5e1', color: '#0f172a' }} className="p-2 border font-bold text-[9px] w-24">AŞAMALAR</th>
                  {sortedSizes.map(s => <th key={s} style={{ borderColor: '#cbd5e1', color: '#0f172a' }} className="p-2 border font-bold text-sm">{s}</th>)}
                  <th style={{ borderColor: '#0f172a', backgroundColor: '#e2e8f0', color: '#0f172a' }} className="p-2 border-l-2 font-bold text-sm w-24">TOPLAM</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }} className="p-2 border text-[9px] font-bold uppercase">Sipariş</td>
                  {sortedSizes.map(s => <td key={s} style={{ borderColor: '#cbd5e1', color: '#1e293b' }} className="p-3 border text-sm font-medium">{order.qty_by_size[s]}</td>)}
                  <td style={{ backgroundColor: '#f8fafc', borderColor: '#0f172a', color: '#0f172a' }} className="p-3 border-l-2 text-sm font-bold">{totalSiparis}</td>
                </tr>
                <tr style={{ backgroundColor: '#eff6ff' }}>
                  <td style={{ borderColor: '#cbd5e1', color: '#1d4ed8' }} className="p-2 border text-[9px] font-black uppercase">Planlanan (+%{extraPercent})</td>
                  {sortedSizes.map(s => <td key={s} style={{ borderColor: '#cbd5e1', color: '#1d4ed8' }} className="p-3 border text-sm font-black italic">
                    {Math.ceil(order.qty_by_size[s] * extraFactor)}
                  </td>)}
                  <td style={{ backgroundColor: '#dbeafe', borderColor: '#0f172a', color: '#1d4ed8' }} className="p-3 border-l-2 text-sm font-black">{totalPlanlanan}</td>
                </tr>
                <tr className="h-16">
                  <td style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }} className="p-2 border text-[9px] font-black uppercase">Gerçek Kesim</td>
                  {sortedSizes.map(s => <td key={s} style={{ borderColor: '#cbd5e1', backgroundColor: '#ffffff' }} className="p-3 border"></td>)}
                  <td style={{ backgroundColor: '#f8fafc', borderColor: '#0f172a' }} className="p-3 border-l-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0' }} className="mt-auto pt-8">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-8">
              <span style={{ color: '#94a3b8' }} className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <Info size={12} /> Kesim Talimatları ve Notlar
              </span>
              <div style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#334155' }} className="border p-5 rounded-2xl min-h-25 text-xs font-bold italic">
                {order.post_processes || 'Özel bir talimat bulunmamaktadır.'}
              </div>
            </div>
            <div className="col-span-4 flex flex-col justify-end">
              <div className="space-y-12">
                <div style={{ color: '#cbd5e1' }} className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                  <span>KESİM ŞEFİ</span>
                  <span>____ / ____ / 2026</span>
                </div>
                <div style={{ borderTop: '2px solid #0f172a' }} className="pt-2 text-center">
                  <span style={{ color: '#0f172a' }} className="text-[10px] font-black uppercase">Alfa Spor Onayı</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <p style={{ color: '#cbd5e1' }} className="text-[8px] font-bold uppercase tracking-[0.5em]">Alfa Spor Üretim Sistemi</p>
          </div>
        </div>

      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div>
      <div style={{ color: '#94a3b8' }} className="text-[9px] font-bold uppercase tracking-widest">{label}</div>
      <div style={{ color: '#0f172a' }} className="text-sm font-black uppercase mt-1 leading-none">{value || '---'}</div>
    </div>
  );
}