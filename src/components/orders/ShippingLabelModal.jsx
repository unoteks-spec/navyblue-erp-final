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
          const labelData = { boxNo: i, ...box };
          allLabels.push(labelData);
          allLabels.push(labelData);
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
            scale: 2.5, 
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
      pdf.save(`Argox_Final_Etiketler_${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF Hatası:", err);
      alert("Hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderLabelContent = (label, index) => {
    let sizeRatioText = "";
    
    if (label.type === 'LOT') {
      const sizes = label.lotSizes || "";
      const ratios = label.lotRatio || "";
      sizeRatioText = sizes && ratios ? `${sizes} / ${ratios}` : (sizes || ratios || "---");
    } else {
      sizeRatioText = label.size || "---";
    }

    return (
      <div 
        data-label-id={index}
        style={{
          width: '200mm',
          height: '100mm',
          backgroundColor: '#ffffff',
          color: '#000000',
          padding: '25px',
          boxSizing: 'border-box',
          display: 'table',
          tableLayout: 'fixed',
          overflow: 'hidden',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        {/* SOL SÜTUN */}
        <div style={{ display: 'table-cell', width: '48%', borderRight: '5px solid #000000', paddingRight: '15px', verticalAlign: 'top' }}>
          <div style={{ height: '185px' }}>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: '900', marginBottom: '8px', lineHeight: '1' }}>CONSIGNEE / ALICI</p>
            <h1 style={{ margin: '5px 0', fontSize: '28px', fontWeight: '900', lineHeight: '1.1', textTransform: 'uppercase' }}>
              {consignee.name || '---'}
            </h1>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.3' }}>
              {consignee.address || '---'}
            </p>
          </div>
          <div style={{ borderTop: '3px solid #000000', paddingTop: '8px' }}>
            <p style={{ margin: 0, fontSize: '9px', fontWeight: '900', opacity: '0.6', lineHeight: '1' }}>SENDER / GÖNDEREN</p>
            <p style={{ margin: '2px 0', fontSize: '10px', fontWeight: '900', lineHeight: '1' }}>ALFA SPOR GİYİM SAN. TİC. LTD. ŞTİ.</p>
            <p style={{ margin: 0, fontSize: '9px', fontWeight: '700', lineHeight: '1' }}>Bornova, İzmir, Turkey</p>
          </div>
        </div>

        {/* ORTA SÜTUN */}
        <div style={{ display: 'table-cell', width: '30%', borderRight: '5px solid #000000', paddingLeft: '15px', paddingRight: '15px', verticalAlign: 'top' }}>
          <div style={{ height: '175px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: '900', lineHeight: '1' }}>MODEL</p>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '900', lineHeight: '1.1' }}>{label.article || '---'}</h2>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: '900', color: '#0000FF', lineHeight: '1' }}>COLOR / RENK</p>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '900', fontStyle: 'italic', lineHeight: '1.1' }}>{label.color || '---'}</h2>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: '900', lineHeight: '1' }}>SIZE / RATIO</p>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: '900', lineHeight: '1.2' }}>
                {sizeRatioText}
              </h2>
            </div>
          </div>
          {/* ✅ Kutu kaldırıldı, zemin beyaz, yazı siyah ve font büyük */}
          <div style={{ backgroundColor: '#ffffff', color: '#000000', padding: '10px 5px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '9px', fontWeight: '700', lineHeight: '1' }}>TOTAL PCS</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '48px', fontWeight: '900', lineHeight: '1' }}>{label.totalPcs}</p>
          </div>
        </div>

        {/* SAĞ SÜTUN */}
        <div style={{ display: 'table-cell', width: '22%', textAlign: 'center', paddingLeft: '15px', verticalAlign: 'top' }}>
          <div style={{ height: '155px' }}>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: '900', lineHeight: '1' }}>BOX NO</p>
            <h1 style={{ margin: '15px 0', fontSize: '80px', fontWeight: '900', lineHeight: '0.7' }}>{label.boxNo}</h1>
          </div>
          <div style={{ borderTop: '4px solid #000000', borderBottom: '4px solid #000000', padding: '10px 0', textAlign: 'left', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '900', lineHeight: '1' }}><span>NET:</span><span>{label.net} KG</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '900', lineHeight: '1', marginTop: '4px' }}><span>GRS:</span><span>{label.gross} KG</span></div>
          </div>
          <div style={{ border: '4px solid #000000', padding: '6px 0', fontSize: '11px', fontWeight: '900', fontStyle: 'italic', backgroundColor: '#ffffff', lineHeight: '1' }}>
            MADE IN TURKEY
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-9999 bg-slate-900/95 backdrop-blur-2xl overflow-y-auto p-4 md:p-10 no-print">
      <div className="max-w-350 mx-auto">
        <div className="bg-white p-10 rounded-[4rem] shadow-2xl mb-12 flex justify-between items-center sticky top-0 z-50 border border-slate-100">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-blue-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl"><Package size={40}/></div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Lojistik Baskı Hattı</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Argox 200x100mm • {labels.length} Toplam Etiket</p>
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
            <button onClick={onClose} className="p-5 bg-slate-50 text-slate-400 rounded-[2.5rem] hover:text-red-500 shadow-sm transition-colors"><X size={32}/></button>
          </div>
        </div>

        <div className="space-y-24 pb-48 flex flex-col items-center">
          {labels.map((label, idx) => (
            <div key={idx} className="bg-white shadow-2xl overflow-hidden rounded-sm transform border border-slate-100">
               {renderLabelContent(label, idx)}
               <div ref={(el) => (labelRefs.current[idx] = el)} style={{ position: 'absolute', left: '-9999px' }}>
                 {renderLabelContent(label, idx)}
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}