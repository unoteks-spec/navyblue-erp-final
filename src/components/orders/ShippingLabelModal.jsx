import React, { useRef, useState } from 'react';
import { X, FileDown, Loader2, Package } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ShippingLabelModal({ boxes, consignee, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const labelRefs = useRef([]);

  const generateLabels = () => {
    let allLabels = [];
    boxes.forEach(box => {
      const rangeParts = String(box.range).split('-').map(Number);
      const start = rangeParts[0];
      const end = rangeParts[1] || start;
      if (!isNaN(start)) {
        for (let i = start; i <= end; i++) {
          allLabels.push({ boxNo: i, ...box });
        }
      }
    });
    return allLabels;
  };

  const labels = generateLabels();

  const downloadPDF = async () => {
    if (labels.length === 0) return;
    setIsGenerating(true);
    
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [200, 100],
      compress: true
    });

    try {
      for (let i = 0; i < labels.length; i++) {
        const element = labelRefs.current[i];
        if (element) {
          const canvas = await html2canvas(element, { 
            scale: 2.5, // Netlik için optimize edildi
            useCORS: true, 
            backgroundColor: "#ffffff",
            logging: false,
            onclone: (clonedDoc) => {
              const el = clonedDoc.body.querySelector(`[data-label-id="${i}"]`);
              if (el) {
                el.style.width = '200mm';
                el.style.height = '100mm';
              }
            }
          });
          const imgData = canvas.toDataURL('image/png');
          if (i > 0) pdf.addPage([200, 100], 'landscape');
          pdf.addImage(imgData, 'PNG', 0, 0, 200, 100);
        }
      }
      pdf.save(`Argox_Etiketleri_${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF Hatası:", err);
      alert("Hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderLabelContent = (label, index) => (
    <div 
      data-label-id={index}
      style={{
        width: '200mm',
        height: '100mm',
        backgroundColor: '#ffffff',
        color: '#000000',
        border: '12px solid #000000',
        padding: '20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        gap: '0px', // Gap kaldırıldı, padding ile kontrol edilecek
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* SOL: CONSIGNEE - Daha dar ve kontrollü font */}
      <div style={{ flex: '2.5', borderRight: '5px solid #000000', paddingRight: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: '900', borderBottom: '3px solid #000000', display: 'inline-block', marginBottom: '6px' }}>CONSIGNEE / ALICI</p>
          <h1 style={{ fontSize: '28px', fontWeight: '900', lineHeight: '1', textTransform: 'uppercase', marginBottom: '8px' }}>
            {consignee.name || '---'}
          </h1>
          <p style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2' }}>
            {consignee.address || '---'}
          </p>
        </div>
        <div style={{ borderTop: '3px solid #000000', paddingTop: '6px' }}>
          <p style={{ fontSize: '9px', fontWeight: '900', opacity: '0.6' }}>SENDER / GÖNDEREN</p>
          <p style={{ fontSize: '10px', fontWeight: '900' }}>ALFA SPOR GİYİM SAN. TİC. LTD. ŞTİ.</p>
          <p style={{ fontSize: '9px', fontWeight: '700' }}>Bornova, İzmir, Turkey</p>
        </div>
      </div>

      {/* ORTA: MODEL & RENK - Yazılar küçültüldü */}
      <div style={{ flex: '1.5', borderRight: '5px solid #000000', paddingLeft: '15px', paddingRight: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '900', borderBottom: '3px solid #000000', display: 'inline-block' }}>MODEL</p>
            <h2 style={{ fontSize: '18px', fontWeight: '900', marginTop: '4px' }}>{label.article || '---'}</h2>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '900', borderBottom: '3px solid #000000', display: 'inline-block', color: '#0000FF' }}>COLOR / RENK</p>
            <h2 style={{ fontSize: '16px', fontWeight: '900', fontStyle: 'italic', marginTop: '4px' }}>{label.color || '---'}</h2>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '900', borderBottom: '3px solid #000000', display: 'inline-block' }}>SIZE / RATIO</p>
            <h2 style={{ fontSize: '12px', fontWeight: '900', marginTop: '4px' }}>{label.type === 'LOT' ? `${label.lotSizes}` : label.size}</h2>
          </div>
        </div>
        <div style={{ backgroundColor: '#000000', color: '#ffffff', padding: '8px', textAlign: 'center' }}>
          <p style={{ fontSize: '9px', fontWeight: '700' }}>TOTAL PCS</p>
          <p style={{ fontSize: '38px', fontWeight: '900', lineHeight: '1' }}>{label.totalPcs}</p>
        </div>
      </div>

      {/* SAĞ: KOLİ & AĞIRLIK - En kritik alan */}
      <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center', paddingLeft: '10px' }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: '900', borderBottom: '3px solid #000000', display: 'inline-block' }}>BOX NO</p>
          <h1 style={{ fontSize: '80px', fontWeight: '900', lineHeight: '0.8', margin: '10px 0' }}>{label.boxNo}</h1>
        </div>
        <div style={{ borderTop: '4px solid #000000', borderBottom: '4px solid #000000', padding: '6px 0', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '900' }}><span>NET:</span><span>{label.net} KG</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '900' }}><span>GRS:</span><span>{label.gross} KG</span></div>
        </div>
        <div style={{ border: '4px solid #000000', padding: '5px 0', fontSize: '11px', fontWeight: '900', fontStyle: 'italic', backgroundColor: '#ffffff' }}>
          MADE IN TURKEY
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-9999 bg-slate-900/95 backdrop-blur-2xl overflow-y-auto p-4 md:p-10 no-print">
      <div className="max-w-350 mx-auto">
        <div className="bg-white p-10 rounded-[4rem] shadow-2xl mb-12 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-blue-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl"><Package size={40}/></div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Lojistik Baskı Hattı</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Argox 200x100mm • {labels.length} Etiket</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={downloadPDF} 
              disabled={isGenerating}
              className="bg-slate-900 text-white px-12 py-5 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl hover:bg-blue-600 transition-all flex items-center gap-3 disabled:bg-slate-400"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={20}/> : <FileDown size={20}/>}
              {isGenerating ? 'PDF Hazırlanıyor...' : 'PDF İndir'}
            </button>
            <button onClick={onClose} className="p-5 bg-slate-50 text-slate-400 rounded-[2.5rem] hover:text-red-500 shadow-sm"><X size={32}/></button>
          </div>
        </div>

        <div className="space-y-24 pb-48 flex flex-col items-center">
          {labels.map((label, idx) => (
            <div key={idx} className="relative group animate-in fade-in zoom-in-95 duration-500">
              <div className="absolute -top-6 left-12 bg-blue-600 text-white px-8 py-3 rounded-full text-xs font-black uppercase z-10 shadow-xl tracking-widest italic">Koli #{label.boxNo}</div>
              
              {/* PDF için gizli render alanı */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <div ref={(el) => (labelRefs.current[idx] = el)}>
                  {renderLabelContent(label, idx)}
                </div>
              </div>

              {/* Ekran ön izlemesi */}
              <div className="bg-white shadow-2xl overflow-hidden rounded-sm transform hover:scale-[1.02] transition-all duration-500">
                 {renderLabelContent(label, idx)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}