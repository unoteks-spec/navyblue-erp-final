import React, { useEffect, useRef, useState } from 'react';
import { X, FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SIZE_ORDER } from '../../constants/sizes';

export default function CuttingOrderPrint({ order, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef();

  const getDisplayLabel = (s) => {
    const prefixes = ['B', 'K', 'S', 'Y', 'U', 'N'];
    return prefixes.includes(s.charAt(0)) && s.length > 1 ? s.substring(1) : s;
  };

  const sortedSizes = Object.keys(order.qty_by_size || {})
    .filter(s => (order.qty_by_size[s] || 0) > 0)
    .sort((a, b) => {
      const indexA = SIZE_ORDER.indexOf(a);
      const indexB = SIZE_ORDER.indexOf(b);
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

  const fabrics = Object.entries(order.fabrics || {})
    .filter(([_, f]) => f && f.kind)
    .sort(([keyA], [keyB]) => {
      if (keyA === 'main') return -1;
      if (keyB === 'main') return 1;
      return 0;
    })
    .map(([_, f]) => f);

  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
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
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      pdf.save(`ALFA_KESIM_${order.article || order.order_no}.pdf`);
    } catch (error) {
      console.error('PDF Hatası:', error);
      alert('Hata oluştu. Lütfen tekrar deneyin.');
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
    <div className="fixed inset-0 z-500 bg-black/80 flex items-start justify-center p-0 md:p-8 overflow-y-auto no-print">

      {/* Kontrol Butonları */}
      <div className="fixed top-4 right-4 flex gap-2 z-510 no-print">
        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          style={{
            background: '#000',
            color: '#fff',
            border: '1.5px solid #000',
            borderRadius: '8px',
            padding: '10px 24px',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 'bold',
            fontSize: '13px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
          PDF İndir
        </button>
        <button
          onClick={onClose}
          style={{
            background: '#fff',
            color: '#000',
            border: '1.5px solid #000',
            borderRadius: '8px',
            padding: '10px 14px',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* A4 BELGE */}
      <div
        ref={printRef}
        style={{
          backgroundColor: '#ffffff',
          color: '#000000',
          width: '210mm',
          minHeight: '297mm',
          fontFamily: "'Helvetica', 'Arial', sans-serif",
          padding: '14mm 14mm 10mm 14mm',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* ÜST BÖLÜM */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: '16px',
          borderBottom: '2px solid #000000',
          marginBottom: '20px',
        }}>
          {/* Sol: Başlık + Bilgiler */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '4px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                color: '#000000',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}>
                ALFA SPOR GİYİM TEKSTİL LTD. ŞTİ.
              </div>
              <div style={{
                fontSize: '36px',
                fontWeight: 'bold',
                letterSpacing: '-0.02em',
                lineHeight: '1',
                textTransform: 'uppercase',
                color: '#000000',
              }}>
                KESİM EMRİ
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                color: '#000000',
                marginTop: '10px',
                textTransform: 'uppercase',
              }}>
                SİPARİŞ: {order.order_no}
              </div>
            </div>

            {/* Bilgi tablosu */}
            <table style={{
              marginTop: '20px',
              borderCollapse: 'separate',
              borderSpacing: '0 8px',
            }}>
              <tbody>
                {[
                  ['MÜŞTERİ', order.customer],
                  ['MODEL ADI', order.model],
                  ['RENK', order.color],
                  ['TARİH', formatDate(order.cutting_date)],
                  ['PASTAL ENİ', order.marker_width ? `${order.marker_width} CM` : '---'],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      letterSpacing: '0.05em',
                      color: '#000000',
                      textTransform: 'uppercase',
                      paddingRight: '20px',
                      whiteSpace: 'nowrap',
                    }}>{label}:</td>
                    <td style={{
                      fontSize: '13px',
                      fontWeight: 'normal',
                      color: '#000000',
                      textTransform: 'uppercase',
                    }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sağ: ARTİKEL KUTUSU + Model Resim */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '12px',
            marginLeft: '20px',
          }}>
            <div style={{
              border: '2px solid #000000',
              borderRadius: '4px',
              padding: '10px 16px',
              textAlign: 'center',
              minWidth: '160px',
            }}>
              <div style={{
                fontSize: '9px',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                color: '#000000',
                textTransform: 'uppercase',
                borderBottom: '1px solid #000000',
                paddingBottom: '5px',
                marginBottom: '5px',
              }}>ARTİKEL NO</div>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                letterSpacing: '0.05em',
                color: '#000000',
              }}>{order.article}</div>
            </div>

            <div style={{
              width: '160px',
              height: '160px',
              border: '1px solid #000000',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
            }}>
              {order.model_image ? (
                <img
                  src={order.model_image}
                  style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }}
                  alt="Model"
                />
              ) : (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#000000',
                  textTransform: 'uppercase',
                }}>RESİM YOK</span>
              )}
            </div>
          </div>
        </div>

        {/* 1. KUMAŞ DETAYLARI */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            color: '#000000',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            1. KUMAŞ VE MALZEME DETAYLARI
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '2px solid #000000',
          }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                {['CİNS', 'RENK / VARYANT', 'SARFİYAT (KG/MT)'].map(h => (
                  <th key={h} style={{
                    padding: '8px 10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#000000',
                    textTransform: 'uppercase',
                    textAlign: h === 'SARFİYAT (KG/MT)' ? 'right' : 'left',
                    border: '1px solid #000000',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fabrics.map((f, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px 10px', fontSize: '12px', fontWeight: 'normal', color: '#000000', border: '1px solid #000000' }}>{f.kind}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', fontWeight: 'normal', color: '#000000', border: '1px solid #000000' }}>{f.color || order.color}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', fontWeight: 'bold', color: '#000000', textAlign: 'right', border: '1px solid #000000' }}>{f.perPieceKg} {f.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2. BEDEN DAĞILIMI */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            color: '#000000',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            2. BEDEN DAĞILIM MATRİSİ
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '2px solid #000000',
            tableLayout: 'fixed',
          }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{
                  padding: '8px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  width: '120px',
                  border: '1px solid #000000',
                }}>AŞAMA</th>
                {sortedSizes.map(s => (
                  <th key={s} style={{
                    padding: '8px 4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    border: '1px solid #000000',
                  }}>{getDisplayLabel(s)}</th>
                ))}
                <th style={{
                  padding: '8px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  background: '#000000',
                  color: '#ffffff',
                  width: '70px',
                }}>TOPLAM</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '12px', fontWeight: 'normal' }}>
              <tr>
                <td style={{ padding: '8px 8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', border: '1px solid #000000' }}>SİPARİŞ</td>
                {sortedSizes.map(s => (
                  <td key={s} style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid #000000' }}>
                    {order.qty_by_size[s]}
                  </td>
                ))}
                <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #000000' }}>
                  {totalSiparis}
                </td>
              </tr>
              <tr style={{ fontWeight: 'bold' }}>
                <td style={{ padding: '8px 8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', border: '1px solid #000000' }}>PLAN (+%{extraPercent})</td>
                {sortedSizes.map(s => (
                  <td key={s} style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid #000000' }}>
                    {plannedQtys[s]}
                  </td>
                ))}
                <td style={{ padding: '8px 8px', textAlign: 'center', background: '#000000', color: '#ffffff', border: '1px solid #000000' }}>
                  {sumOfPlanned}
                </td>
              </tr>
              <tr style={{ height: '60px' }}>
                <td style={{ padding: '8px 8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', border: '1px solid #000000' }}>GERÇEKLEŞEN KESİM</td>
                {sortedSizes.map(s => (
                  <td key={s} style={{ border: '1px solid #000000' }}></td>
                ))}
                <td style={{ border: '1px solid #000000' }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ALT BÖLÜM */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '2px solid #000000' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: '1' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#000000',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}>ÖZEL KESİM TALİMATLARI:</div>
              <div style={{
                border: '1.5px solid #000000',
                borderRadius: '4px',
                padding: '10px 12px',
                minHeight: '80px',
                fontSize: '12px',
                fontWeight: 'normal',
                textTransform: 'uppercase',
                color: '#000000',
                lineHeight: '1.4',
              }}>
                {order.post_processes || 'BELİRTİLMİŞ ÖZEL BİR TALİMAT BULUNMAMAKTADIR.'}
              </div>
            </div>

            <div style={{ width: '220px', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                {['KESİM ŞEFİ', 'ÜRETİM MÜDÜRÜ'].map(label => (
                  <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: '40px', borderBottom: '1.5px solid #000000', marginBottom: '6px' }}></div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: '2px solid #000000', borderRadius: '4px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>ÜRETİM ONAYI</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '9px',
          fontWeight: 'bold',
          color: '#000000',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          borderTop: '1px solid #000000',
          paddingTop: '8px',
        }}>
          ALFA SPOR ERP / NAVY BLUE LOJİSTİK SİSTEMİ — 2026
        </div>
      </div>
    </div>
  );
}