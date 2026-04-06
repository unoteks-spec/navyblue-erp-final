import React, { useEffect, useRef, useState } from 'react';
import { X, FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function CuttingOrderPrint({ order, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef(); 
  
  const SIZE_ORDER = ['3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'I', 'II', 'STD'];
  
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
  
  const plannedQtys = {};
  let sumOfPlanned = 0;

  sortedSizes.forEach(size => {
    const qty = Number(order.qty_by_size[size] || 0);
    const planned = Math.ceil(Number((qty * extraFactor).toFixed(4))); 
    plannedQtys[size] = planned;
    sumOfPlanned += planned; 
  });

  // 🛠️ 2. DEĞİŞİKLİK: KUMAŞ SIRALAMA (KESİN ÇÖZÜM)
  // Metin araması yerine veritabanındaki "main" anahtarını (key) baz alıyoruz.
  const fabrics = Object.entries(order.fabrics || {})
    .filter(([_, f]) => f && f.kind) // Sadece cinsi yazılmış olanları al
    .sort(([keyA], [keyB]) => {
      if (keyA === 'main') return -1; // "main" olan her zaman en üste
      if (keyB === 'main') return 1;
      return 0;
    })
    .map(([_, f]) => f); // Sadece kumaş verisini geri döndür

  // 🛠️ 1. DEĞİŞİKLİK: TARİH FORMATLAMA (GG.AA.YYYY)
  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    // YYYY-MM-DD formatını ayırıp tersine diziyoruz
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      return `${day}.${month}.${year}`;
    }
    return dateStr;
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          const el = clonedDoc.querySelector('[data-print-area]');
          if (el) el.style.fontFamily = 'monospace';
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      pdf.save(`ALFA_KESIM_${order.order_no}.pdf`);
    } catch (error) {
      console.error("PDF Hatası:", error);
      alert("Hata oluştu. Lütfen tekrar deneyin.");
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
    <div className="fixed inset-0 z-500 bg-black/70 flex items-start justify-center p-0 md:p-8 overflow-y-auto no-print">
      
      <div className="fixed top-4 right-4 flex gap-2 z-510 no-print">
        <button 
          onClick={handleDownloadPDF} 
          disabled={isGenerating}
          style={{ backgroundColor: '#000000', color: '#ffffff', border: '2px solid #ffffff' }}
          className="px-8 py-3 font-bold flex items-center gap-2 shadow-2xl"
        >
          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />} 
          PDF İNDİR
        </button>
        <button onClick={onClose} style={{ backgroundColor: '#ffffff', color: '#000000', border: '2px solid #000000' }} className="p-3 font-bold">
          <X size={24} />
        </button>
      </div>

      <div 
        ref={printRef} 
        data-print-area
        style={{ 
          backgroundColor: '#ffffff', 
          color: '#000000', 
          width: '210mm', 
          minHeight: '297mm',
          fontFamily: 'monospace',
          padding: '12mm'
        }}
        // 🛠️ 3. DEĞİŞİKLİK: Sayfanın en dışındaki siyah border kaldırıldı
        className="relative flex flex-col"
      >
        {/* ÜST BÖLÜM: BİLGİLER VE SAĞ ÜST RESİM */}
        <div style={{ borderBottom: '4px solid #000000', display: 'table', width: '100%', paddingBottom: '20px' }} className="pb-6">
          <div style={{ display: 'table-cell', verticalAlign: 'top' }} className="flex-1">
            <h1 style={{ margin: '0', fontSize: '36px', fontWeight: '900' }} className="tracking-tighter uppercase leading-none">KESİM EMRİ</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '11px', fontWeight: 'bold' }} className="uppercase tracking-[0.2em]">ALFA SPOR GİYİM TEKSTİL LTD. ŞTİ.</p>
            
            <table style={{ marginTop: '30px', borderSpacing: '0 8px', borderCollapse: 'separate' }} className="text-[13px] font-bold uppercase">
              <tbody>
                <tr><td style={{ width: '130px', color: '#666666' }}>MÜŞTERİ:</td><td>{order.customer}</td></tr>
                <tr><td style={{ color: '#666666' }}>ARTİKEL:</td><td>{order.article}</td></tr>
                <tr><td style={{ color: '#666666' }}>MODEL ADI:</td><td>{order.model}</td></tr>
                <tr><td style={{ color: '#666666' }}>RENK:</td><td>{order.color}</td></tr>
                {/* 🛠️ Tarih formatı uygulandı */}
                <tr><td style={{ color: '#666666' }}>TARİH:</td><td>{formatDate(order.cutting_date)}</td></tr>
                <tr><td style={{ color: '#666666' }}>PASTAL ENİ:</td><td>{order.marker_width ? `${order.marker_width} CM` : '---'}</td></tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'table-cell', verticalAlign: 'top', width: '250px', textAlign: 'right' }}>
            <div style={{ border: '3px solid #000000', padding: '10px', textAlign: 'center', marginBottom: '15px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '4px' }}>SİPARİŞ NO</span>
              <span style={{ fontSize: '22px', fontWeight: '900' }}>{order.order_no}</span>
            </div>
            <div style={{ border: '2px solid #000000', width: '100%', height: '180px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
               {order.model_image ? (
                 <img src={order.model_image} style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }} alt="Model" />
               ) : (
                 <span style={{ fontSize: '10px', fontWeight: 'bold', italic: true, opacity: '0.3' }}>RESİM YOK</span>
               )}
            </div>
          </div>
        </div>

        {/* 1. KUMAŞ DETAYLARI */}
        <div className="mt-8">
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', textDecoration: 'underline' }} className="uppercase">1. KUMAŞ VE MALZEME DETAYLARI</div>
          <table style={{ width: '100%', border: '2.5px solid #000000', borderCollapse: 'collapse' }} className="text-xs font-bold">
            <thead style={{ backgroundColor: '#eeeeee' }}>
              <tr style={{ borderBottom: '2.5px solid #000000', textAlign: 'left' }}>
                <th style={{ padding: '8px', borderRight: '2px solid #000000' }}>CİNS</th>
                <th style={{ padding: '8px', borderRight: '2px solid #000000' }}>RENK / VARYANT</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>SARFİYAT (KG/MT)</th>
              </tr>
            </thead>
            <tbody>
              {fabrics.map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #000000' }}>
                  <td style={{ padding: '8px', borderRight: '2px solid #000000' }} className="uppercase">{f.kind}</td>
                  <td style={{ padding: '8px', borderRight: '2px solid #000000' }} className="uppercase">{f.color || order.color}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{f.perPieceKg} {f.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2. BEDEN DAĞILIMI */}
        <div className="mt-8">
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', textDecoration: 'underline' }} className="uppercase">2. BEDEN DAĞILIM MATRİSİ</div>
          <table style={{ width: '100%', border: '2.5px solid #000000', borderCollapse: 'collapse', tableLayout: 'fixed' }} className="text-center font-bold">
            <thead>
              <tr style={{ backgroundColor: '#eeeeee', borderBottom: '2.5px solid #000000' }}>
                <th style={{ padding: '8px', borderRight: '2px solid #000000', width: '110px', fontSize: '10px' }}>AŞAMA</th>
                {sortedSizes.map(s => <th key={s} style={{ padding: '8px', borderRight: '2px solid #000000', fontSize: '12px' }}>{s}</th>)}
                <th style={{ padding: '8px', backgroundColor: '#000000', color: '#ffffff', width: '90px', fontSize: '12px' }}>TOPLAM</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '12px' }} className="uppercase">
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '8px', borderRight: '2px solid #000000', textAlign: 'left', fontSize: '10px' }}>SİPARİŞ</td>
                {sortedSizes.map(s => <td key={s} style={{ padding: '8px', borderRight: '2px solid #000000' }}>{order.qty_by_size[s]}</td>)}
                <td style={{ backgroundColor: '#eeeeee' }}>{totalSiparis}</td>
              </tr>
              <tr style={{ borderBottom: '2.5px solid #000000', fontWeight: '900' }}>
                <td style={{ padding: '8px', borderRight: '2px solid #000000', textAlign: 'left', fontSize: '10px' }}>PLAN (+%{extraPercent})</td>
                {sortedSizes.map(s => <td key={s} style={{ padding: '8px', borderRight: '2px solid #000000' }}>{plannedQtys[s]}</td>)}
                <td style={{ backgroundColor: '#000000', color: '#ffffff' }}>{sumOfPlanned}</td>
              </tr>
              <tr style={{ height: '60px' }}>
                <td style={{ padding: '8px', borderRight: '2px solid #000000', textAlign: 'left', fontSize: '10px', opacity: '0.4' }}>GERÇEKLEŞEN KESİM</td>
                {sortedSizes.map(s => <td key={s} style={{ padding: '8px', borderRight: '2px solid #000000' }}></td>)}
                <td style={{ backgroundColor: '#eeeeee' }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ALT BÖLÜM: TALİMAT VE ONAY */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '2.5px solid #000' }}>
          <div style={{ display: 'table', width: '100%' }}>
            <div style={{ display: 'table-cell', width: '55%', verticalAlign: 'top', paddingRight: '20px' }}>
              <span style={{ fontSize: '10px', fontWeight: '900', display: 'block', marginBottom: '8px' }}>ÖZEL KESİM TALİMATLARI:</span>
              <div style={{ border: '2px solid #000000', padding: '12px', minHeight: '140px', fontSize: '11px', fontWeight: 'bold', lineHeight: 'relaxed' }} className="uppercase italic">
                {order.post_processes || 'BELİRTİLMİŞ ÖZEL BİR TALİMAT BULUNMAMAKTADIR.'}
              </div>
            </div>
            <div style={{ display: 'table-cell', width: '45%', verticalAlign: 'top' }}>
              <div style={{ display: 'table', width: '100%', textAlign: 'center', marginTop: '10px' }}>
                <div style={{ display: 'table-cell', width: '48%', borderBottom: '1.5px solid #000', paddingBottom: '40px', fontSize: '10px', fontWeight: 'bold' }}>KESİM ŞEFİ</div>
                <div style={{ display: 'table-cell', width: '4%' }}></div>
                <div style={{ display: 'table-cell', width: '48%', borderBottom: '1.5px solid #000', paddingBottom: '40px', fontSize: '10px', fontWeight: 'bold' }}>ÜRETİM MÜDÜRÜ</div>
              </div>
              <div style={{ marginTop: '30px', border: '3.5px solid #000000', padding: '15px', textAlign: 'center' }}>
                 <p style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '3px', margin: '0' }}>ÜRETİM ONAYI</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '30px', textAlign: 'center', opacity: '0.3', fontSize: '9px', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '10px' }}>
          ALFA SPOR ERP / NAVY BLUE LOJİSTİK SİSTEMİ - 2026
        </div>

      </div>
    </div>
  );
}