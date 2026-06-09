import React, { useRef, useState } from 'react';
import { X, FileDown, Loader2, Package } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ShippingLabelModal({ boxes, consignee, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const labelRefs = useRef([]);

  // Her range için bireysel kutu etiketleri oluştur, her birinden 2 kopya
  const generateLabels = () => {
    const allLabels = [];
    boxes.forEach(box => {
      const rangeParts = String(box.range).split('-').map(Number);
      const start = rangeParts[0];
      const end = rangeParts[1] || start;
      if (!isNaN(start)) {
        for (let i = start; i <= end; i++) {
          // Her etiketten 2 kopya
          allLabels.push({ boxNo: i, ...box, _copy: 1 });
          allLabels.push({ boxNo: i, ...box, _copy: 2 });
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
            backgroundColor: '#ffffff',
            logging: false,
          });
          const imgData = canvas.toDataURL('image/png');
          if (i > 0) pdf.addPage([200, 100], 'landscape');
          pdf.addImage(imgData, 'PNG', 0, 0, 200, 100);
        }
      }
      pdf.save(`Argox_Etiketler_${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF Hatası:', err);
      alert('Hata oluştu.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderLabel = (label, index) => {
    const groups = label.articleGroups || [];
    const groupCount = groups.length;

    // Artikel sayısına göre dinamik font
    const articleFontSize = groupCount <= 1 ? '13px' : groupCount <= 2 ? '12px' : groupCount <= 3 ? '11px' : '10px';
    const colorFontSize  = groupCount <= 1 ? '12px' : groupCount <= 2 ? '11px' : '10px';
    const itemFontSize   = groupCount <= 1 ? '10px' : groupCount <= 2 ? '9px'  : '8px';

    return (
      <div
        ref={el => labelRefs.current[index] = el}
        style={{
          width: '200mm',
          height: '100mm',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ÜST BANT: CONSIGNEE + BOX NO */}
        <div style={{
          display: 'flex',
          borderBottom: '3px solid #000',
          flexShrink: 0,
        }}>
          {/* Consignee */}
          <div style={{
            flex: 1,
            padding: '8px 12px',
            borderRight: '3px solid #000',
          }}>
            <div style={{ fontSize: '8px', fontWeight: '900', letterSpacing: '0.1em', marginBottom: '3px' }}>CONSIGNEE / ALICI</div>
            <div style={{ fontSize: '16px', fontWeight: '900', textTransform: 'uppercase', lineHeight: '1.1' }}>
              {consignee.name || '---'}
            </div>
            <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2', marginTop: '2px' }}>
              {consignee.address || '---'}
            </div>
          </div>
          {/* Box No */}
          <div style={{
            width: '80px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
          }}>
            <div style={{ fontSize: '8px', fontWeight: '900', letterSpacing: '0.1em' }}>BOX NO</div>
            <div style={{ fontSize: '52px', fontWeight: '900', lineHeight: '1' }}>{label.boxNo}</div>
          </div>
        </div>

        {/* ORTA: İÇERİK */}
        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          borderBottom: '3px solid #000',
        }}>
          {/* Artikel grupları */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: groupCount <= 2 ? 'row' : 'row',
            flexWrap: 'wrap',
            overflow: 'hidden',
          }}>
            {groups.map((grp, gi) => (
              <div key={gi} style={{
                flex: groupCount <= 2 ? 1 : `0 0 ${groupCount <= 4 ? '50%' : '33%'}`,
                borderRight: gi < groups.length - 1 ? '2px solid #000' : 'none',
                padding: '6px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                overflow: 'hidden',
              }}>
                {/* Artikel + Renk */}
                <div>
                  <div style={{ fontSize: '8px', fontWeight: '700', letterSpacing: '0.05em', color: '#555' }}>ARTICLE</div>
                  <div style={{ fontSize: articleFontSize, fontWeight: '900', textTransform: 'uppercase', lineHeight: '1.1' }}>
                    {grp.article}
                  </div>
                  <div style={{ fontSize: '7px', fontWeight: '700', color: '#555', marginTop: '1px' }}>COLOR</div>
                  <div style={{ fontSize: colorFontSize, fontWeight: '900', fontStyle: 'italic', lineHeight: '1.1' }}>
                    {grp.color}
                  </div>
                </div>

                {/* Beden/içerik listesi */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '7px', fontWeight: '700', color: '#555', marginBottom: '2px' }}>CONTENT</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {grp.items.map((item, ii) => (
                      <div key={ii} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: itemFontSize,
                        fontWeight: '900',
                        lineHeight: '1.3',
                        borderBottom: '1px dashed #ddd',
                      }}>
                        <span style={{ textTransform: 'uppercase' }}>{item.detail}:</span>
                        <span style={{ marginLeft: '6px' }}>{item.qty} Pcs</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grup toplamı */}
                <div style={{
                  borderTop: '1.5px solid #000',
                  paddingTop: '2px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '8px', fontWeight: '700' }}>TOTAL</span>
                  <span style={{ fontSize: groupCount <= 2 ? '18px' : '14px', fontWeight: '900' }}>{grp.qty} PCS</span>
                </div>
              </div>
            ))}
          </div>

          {/* TOPLAM ALAN */}
          <div style={{
            width: '65px',
            borderLeft: '3px solid #000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            textAlign: 'center',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '7px', fontWeight: '900', letterSpacing: '0.05em' }}>TOTAL PCS</div>
            <div style={{ fontSize: groupCount <= 2 ? '28px' : '22px', fontWeight: '900', lineHeight: '1' }}>{label.totalPcs}</div>
          </div>
        </div>

        {/* ALT BANT: AĞIRLIK + SENDER + MADE IN TURKEY */}
        <div style={{
          display: 'flex',
          flexShrink: 0,
          height: '26px',
        }}>
          {/* Ağırlık */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '0 12px',
            borderRight: '2px solid #000',
          }}>
            <div style={{ fontSize: '11px', fontWeight: '900' }}>
              NET: <span>{label.net} KG</span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: '900' }}>
              GRS: <span>{label.gross} KG</span>
            </div>
          </div>
          {/* Sender */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            borderRight: '2px solid #000',
          }}>
            <span style={{ fontSize: '8px', fontWeight: '700', textTransform: 'uppercase' }}>
              ALFA SPOR GİYİM SAN. TİC. LTD. ŞTİ. — BORNOVA, İZMİR, TURKEY
            </span>
          </div>
          {/* Made in Turkey */}
          <div style={{
            width: '90px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '10px', fontWeight: '900', fontStyle: 'italic' }}>MADE IN TURKEY</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-9999 bg-slate-900/95 backdrop-blur-2xl overflow-y-auto p-4 md:p-10 no-print">
      <div className="max-w-5xl mx-auto">
        {/* Başlık */}
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl mb-10 flex justify-between items-center sticky top-0 z-50 border border-slate-100">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl">
              <Package size={32}/>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Koli Etiketleri</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Argox 200×100mm · {labels.length} etiket ({labels.length / 2} koli × 2 kopya)
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={downloadPDF} disabled={isGenerating}
              className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-600 transition-all flex items-center gap-3 disabled:bg-slate-400">
              {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>}
              {isGenerating ? 'Hazırlanıyor...' : 'PDF İndir'}
            </button>
            <button onClick={onClose} className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:text-red-500 transition-colors">
              <X size={24}/>
            </button>
          </div>
        </div>

        {/* Etiket önizlemeleri — her 2'li grup için çift kopya birlikte göster */}
        <div className="space-y-4 pb-32">
          {labels.map((label, idx) => (
            <div key={idx} className={`shadow-lg border border-slate-200 overflow-hidden ${label._copy === 2 ? 'mb-10 border-b-4 border-b-slate-400' : ''}`}>
              {renderLabel(label, idx)}
              {label._copy === 1 && (
                <div className="bg-slate-100 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest py-1">
                  KOPYA 1 / 2
                </div>
              )}
              {label._copy === 2 && (
                <div className="bg-slate-200 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest py-1">
                  KOPYA 2 / 2
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}