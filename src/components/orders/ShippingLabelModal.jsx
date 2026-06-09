import React, { useState } from 'react';
import { X, FileDown, Loader2, Package } from 'lucide-react';
import jsPDF from 'jspdf';

export default function ShippingLabelModal({ boxes, consignee, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateLabels = () => {
    const allLabels = [];
    boxes.forEach(box => {
      const rangeParts = String(box.range).split('-').map(Number);
      const start = rangeParts[0];
      const end = rangeParts[1] || start;
      if (!isNaN(start)) {
        for (let i = start; i <= end; i++) {
          allLabels.push({ boxNo: i, ...box, _copy: 1 });
          allLabels.push({ boxNo: i, ...box, _copy: 2 });
        }
      }
    });
    return allLabels;
  };

  const labels = generateLabels();

  // 200mm x 100mm landscape
  const W = 200, H = 100;
  const rightW = 32;   // sağ sütun genişliği
  const leftW = W - rightW;
  const topH = 28;     // üst bant yüksekliği
  const botH = 14;     // alt bant yüksekliği
  const midH = H - topH - botH;  // 58mm

  const trToLatin = (str) => {
    if (!str) return str;
    return str
      .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
      .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c');
  };

  const drawLabel = (pdf, label) => {
    const groups = label.articleGroups || [];
    const gc = groups.length || 1;

    pdf.setDrawColor(0, 0, 0);

    // Dış çerçeve
    pdf.setLineWidth(0.5);
    pdf.rect(0, 0, W, H);

    // ─── ÜST BANT ───────────────────────────────
    // Alt yatay çizgi
    pdf.setLineWidth(0.5);
    pdf.line(0, topH, W, topH);
    // Sağ sütun dikey
    pdf.line(leftW, 0, leftW, H);

    // Consignee başlık
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('CONSIGNEE / ALICI', 3, 7);

    // Consignee isim
    const name = trToLatin((consignee.name || '---').toUpperCase());
    const nameFS = name.length > 25 ? 11 : name.length > 18 ? 13 : 15;
    pdf.setFontSize(nameFS);
    const nameLines = pdf.splitTextToSize(name, leftW - 6);
    pdf.text(nameLines.slice(0, 2), 3, 13);

    // Consignee adres
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const addr = trToLatin((consignee.address || '').toUpperCase());
    const addrLines = pdf.splitTextToSize(addr, leftW - 6);
    const nameEnd = 13 + (nameLines.slice(0,2).length * nameFS * 0.38);
    pdf.text(addrLines.slice(0, 2), 3, nameEnd + 2);

    // BOX NO (sağ üst)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setFontSize(8);
    pdf.text('BOX NO', leftW + rightW / 2, 7, { align: 'center' });
    pdf.setFontSize(34);
    pdf.text(String(label.boxNo), leftW + rightW / 2, topH - 2, { align: 'center' });

    // ─── ORTA ALAN ───────────────────────────────
    // Sağ sütun: TOTAL PCS büyük alan, MADE IN TURKEY alt bantla eşit yükseklik
    const botYr = H - botH;
    // MADE IN TURKEY için çizgi — alt band başlangıcında
    pdf.setLineWidth(0.4);
    pdf.line(leftW, botYr, W, botYr);

    // TOTAL PCS — topH'dan botYr'ye kadar tüm alanın ortası
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('TOTAL PCS', leftW + rightW / 2, topH + 7, { align: 'center' });
    pdf.setFontSize(32);
    const totalMidY = topH + (botYr - topH) / 2 + 6;
    pdf.text(String(label.totalPcs), leftW + rightW / 2, totalMidY, { align: 'center' });

    // MADE IN TURKEY — alt bantta ortalı
    pdf.setFont('helvetica', 'bolditalic');
    pdf.setFontSize(9);
    pdf.text('MADE IN TURKEY', leftW + rightW / 2, botYr + botH / 2 + 3, { align: 'center' });

    // Artikel grupları
    const colW = leftW / gc;
    groups.forEach((grp, gi) => {
      const cx = gi * colW;

      // Dikey ayırıcı
      if (gi > 0) {
        pdf.setLineWidth(0.3);
        pdf.line(cx, topH, cx, topH + midH);
      }

      let cy = topH + 5;

      // Article
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('ARTICLE', cx + 3, cy);
      cy += 5.5;

      const artFS = gc === 1 ? 17 : gc === 2 ? 15 : gc <= 4 ? 12 : 11;
      pdf.setFontSize(artFS);
      pdf.text(trToLatin((grp.article || '---').toUpperCase()), cx + 3, cy);
      cy += artFS * 0.42 + 2;

      // Color
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text('COLOR', cx + 3, cy);
      cy += 4;

      const colFS = gc === 1 ? 14 : gc === 2 ? 13 : 11;
      pdf.setFont('helvetica', 'bolditalic');
      pdf.setFontSize(colFS);
      const colorLines = pdf.splitTextToSize(grp.color || '---', colW - 6);
      pdf.text(colorLines.slice(0, 2), cx + 3, cy);
      cy += colorLines.slice(0, 2).length * colFS * 0.42 + 3;

      // Content başlık
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('CONTENT', cx + 3, cy);
      cy += 4;

      // Items
      const itemFS = gc === 1 ? 12 : gc === 2 ? 11 : 10;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(itemFS);
      const maxItemY = topH + midH - 10;
      grp.items.forEach(item => {
        if (cy >= maxItemY) return;
        pdf.text(`${(item.detail || '').toUpperCase()}:`, cx + 3, cy);
        pdf.text(`${item.qty} Pcs`, cx + colW - 3, cy, { align: 'right' });
        cy += itemFS * 0.42 + 1;
      });

      // Grup toplam çizgisi
      const totLineY = topH + midH - 8;
      pdf.setLineWidth(0.3);
      pdf.line(cx + 2, totLineY, cx + colW - 2, totLineY);

      // Grup toplamı
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text('TOTAL', cx + 3, topH + midH - 3);
      const totFS = gc <= 2 ? 17 : 13;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(totFS);
      pdf.text(`${grp.qty} PCS`, cx + colW - 3, topH + midH - 2, { align: 'right' });
    });

    // ─── ALT BANT ───────────────────────────────
    const botY = H - botH;
    pdf.setLineWidth(0.5);
    pdf.line(0, botY, leftW, botY);

    // Ağırlık / gönderici ayırıcı
    pdf.setLineWidth(0.3);
    pdf.line(42, botY, 42, H);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(`NET: ${label.net} KG`, 3, botY + 6);
    pdf.text(`GRS: ${label.gross} KG`, 3, botY + 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('ALFA SPOR GIYIM SAN. TIC. LTD. STI.', 45, botY + 6);
    pdf.text('BORNOVA, IZMIR, TURKEY', 45, botY + 11);
  };

  const downloadPDF = async () => {
    if (labels.length === 0) return;
    setIsGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] });
      labels.forEach((label, i) => {
        if (i > 0) pdf.addPage([W, H], 'landscape');
        drawLabel(pdf, label);
      });
      pdf.save(`Argox_Etiketler_${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
      alert('PDF hatası: ' + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Önizleme
  const PreviewLabel = ({ label }) => {
    const groups = label.articleGroups || [];
    const gc = groups.length || 1;
    return (
      <div style={{ width: '100%', aspectRatio: '200/100', border: '2px solid #000', fontFamily: 'Arial, sans-serif', display: 'grid', gridTemplateColumns: `1fr ${rightW / W * 100}%`, backgroundColor: '#fff', color: '#000', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateRows: `${topH}px 1fr ${botH}px`, borderRight: '2px solid #000' }}>
          <div style={{ padding: '4px 6px', borderBottom: '2px solid #000', overflow: 'hidden' }}>
            <div style={{ fontSize: 7, fontWeight: 700, marginBottom: 2 }}>CONSIGNEE / ALICI</div>
            <div style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.1, overflow: 'hidden' }}>{(consignee.name || '---').toUpperCase()}</div>
            <div style={{ fontSize: 8, lineHeight: 1.2, overflow: 'hidden' }}>{(consignee.address || '').toUpperCase()}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gc}, 1fr)`, overflow: 'hidden' }}>
            {groups.map((grp, gi) => (
              <div key={gi} style={{ borderRight: gi < gc - 1 ? '1.5px solid #000' : 'none', padding: '3px 5px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 6, fontWeight: 700, color: '#555' }}>ARTICLE</div>
                <div style={{ fontSize: gc <= 2 ? 12 : 9, fontWeight: 900, lineHeight: 1 }}>{(grp.article||'').toUpperCase()}</div>
                <div style={{ fontSize: 6, fontWeight: 700, color: '#555', marginTop: 1 }}>COLOR</div>
                <div style={{ fontSize: gc <= 2 ? 10 : 8, fontWeight: 900, fontStyle: 'italic' }}>{grp.color}</div>
                <div style={{ fontSize: 6, fontWeight: 700, color: '#555', marginTop: 2 }}>CONTENT</div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {grp.items.map((item, ii) => (
                    <div key={ii} style={{ display: 'flex', justifyContent: 'space-between', fontSize: gc <= 2 ? 8 : 7, fontWeight: 700, borderBottom: '1px dashed #ddd' }}>
                      <span>{(item.detail||'').toUpperCase()}:</span><span>{item.qty} Pcs</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1.5px solid #000', paddingTop: 1, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 6, fontWeight: 700 }}>TOTAL</span>
                  <span style={{ fontSize: gc <= 2 ? 12 : 9, fontWeight: 900 }}>{grp.qty} PCS</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '2px solid #000', display: 'flex', alignItems: 'center', padding: '0 6px', gap: 10, fontSize: 8 }}>
            <span style={{ fontWeight: 900 }}>NET: {label.net} KG</span>
            <span style={{ fontWeight: 900 }}>GRS: {label.gross} KG</span>
            <span style={{ fontSize: 7 }}>ALFA SPOR GIYIM — BORNOVA, IZMIR</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr 1fr' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1.5px solid #000' }}>
            <div style={{ fontSize: 6, fontWeight: 700 }}>BOX NO</div>
            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{label.boxNo}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1.5px solid #000' }}>
            <div style={{ fontSize: 6, fontWeight: 700 }}>TOTAL PCS</div>
            <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{label.totalPcs}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 7, fontWeight: 900, fontStyle: 'italic', textAlign: 'center' }}>MADE IN TURKEY</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-9999 bg-slate-900/95 overflow-y-auto p-4 md:p-8 no-print">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-5 rounded-2xl shadow-xl mb-6 flex justify-between items-center sticky top-0 z-50 border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center"><Package size={20}/></div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">Koli Etiketleri</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">200×100mm · {labels.length / 2} koli × 2 kopya</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadPDF} disabled={isGenerating}
              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-blue-600 transition-all flex items-center gap-2 disabled:bg-slate-400">
              {isGenerating ? <Loader2 className="animate-spin" size={14}/> : <FileDown size={14}/>}
              {isGenerating ? 'Hazırlanıyor...' : 'PDF İndir'}
            </button>
            <button onClick={onClose} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:text-red-500 transition-colors"><X size={18}/></button>
          </div>
        </div>
        <div className="space-y-2 pb-24">
          {labels.map((label, idx) => (
            <div key={idx}>
              <div className="shadow overflow-hidden"><PreviewLabel label={label}/></div>
              <div className={`text-center text-[9px] font-black uppercase tracking-widest py-1 ${label._copy === 2 ? 'bg-slate-200 text-slate-500 mb-6' : 'bg-slate-100 text-slate-400'}`}>
                Kopya {label._copy} / 2
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}