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
      // ✅ DÜZELTİLDİ: Dosya adında artikel no kullanılıyor
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
            background: '#0f172a',
            color: '#fff',
            border: '1.5px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '10px 24px',
            fontFamily: 'monospace',
            fontWeight: '900',
            fontSize: '11px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
          PDF İndir
        </button>
        <button
          onClick={onClose}
          style={{
            background: '#fff',
            color: '#0f172a',
            border: '1.5px solid rgba(0,0,0,0.1)',
            borderRadius: '12px',
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
          color: '#0f172a',
          width: '210mm',
          minHeight: '297mm',
          fontFamily: "'DM Mono', 'Courier New', monospace",
          padding: '14mm 14mm 10mm 14mm',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* Sol kenar aksanı */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '5px',
          height: '100%',
          background: '#0f172a',
        }} />

        {/* ÜST BÖLÜM */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: '16px',
          borderBottom: '2px solid #0f172a',
          marginBottom: '20px',
        }}>
          {/* Sol: Başlık + Bilgiler */}
          <div style={{ flex: 1 }}>
            {/* Başlık */}
            <div style={{ marginBottom: '4px' }}>
              <div style={{
                fontSize: '9px',
                fontWeight: '700',
                letterSpacing: '0.3em',
                color: '#94a3b8',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}>
                ALFA SPOR GİYİM TEKSTİL LTD. ŞTİ.
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: '900',
                letterSpacing: '-0.02em',
                lineHeight: '1',
                textTransform: 'uppercase',
                color: '#0f172a',
              }}>
                KESİM EMRİ
              </div>
              {/* Sipariş no başlığın altında küçük */}
              <div style={{
                fontSize: '9px',
                fontWeight: '700',
                letterSpacing: '0.2em',
                color: '#94a3b8',
                marginTop: '6px',
                textTransform: 'uppercase',
              }}>
                SİPARİŞ: {order.order_no}
              </div>
            </div>

            {/* Bilgi tablosu */}
            <table style={{
              marginTop: '20px',
              borderCollapse: 'separate',
              borderSpacing: '0 6px',
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
                      fontSize: '8px',
                      fontWeight: '700',
                      letterSpacing: '0.2em',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      paddingRight: '20px',
                      whiteSpace: 'nowrap',
                    }}>{label}:</td>
                    <td style={{
                      fontSize: '11px',
                      fontWeight: '900',
                      color: '#0f172a',
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
            {/* ✅ DÜZELTİLDİ: Artikel kutusu */}
            <div style={{
              border: '2.5px solid #0f172a',
              borderRadius: '4px',
              padding: '10px 16px',
              textAlign: 'center',
              minWidth: '160px',
            }}>
              <div style={{
                fontSize: '7px',
                fontWeight: '900',
                letterSpacing: '0.25em',
                color: '#94a3b8',
                textTransform: 'uppercase',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '5px',
                marginBottom: '5px',
              }}>ARTİKEL NO</div>
              <div style={{
                fontSize: '20px',
                fontWeight: '900',
                letterSpacing: '0.05em',
                color: '#0f172a',
              }}>{order.article}</div>
            </div>

            {/* Model resim */}
            <div style={{
              width: '160px',
              height: '160px',
              border: '2px solid #e2e8f0',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8fafc',
            }}>
              {order.model_image ? (
                <img
                  src={order.model_image}
                  style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }}
                  alt="Model"
                />
              ) : (
                <span style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>RESİM YOK</span>
              )}
            </div>
          </div>
        </div>

        {/* 1. KUMAŞ DETAYLARI */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '8px',
            fontWeight: '900',
            letterSpacing: '0.25em',
            color: '#64748b',
            textTransform: 'uppercase',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#0f172a' }}></span>
            1. KUMAŞ VE MALZEME DETAYLARI
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '2px solid #0f172a',
          }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['CİNS', 'RENK / VARYANT', 'SARFİYAT (KG/MT)'].map(h => (
                  <th key={h} style={{
                    padding: '7px 10px',
                    fontSize: '7px',
                    fontWeight: '900',
                    letterSpacing: '0.2em',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    textAlign: h === 'SARFİYAT (KG/MT)' ? 'right' : 'left',
                    borderRight: h !== 'SARFİYAT (KG/MT)' ? '1px solid #1e293b' : 'none',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fabrics.map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '7px 10px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', borderRight: '1px solid #e2e8f0' }}>{f.kind}</td>
                  <td style={{ padding: '7px 10px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', borderRight: '1px solid #e2e8f0' }}>{f.color || order.color}</td>
                  <td style={{ padding: '7px 10px', fontSize: '10px', fontWeight: '900', textAlign: 'right' }}>{f.perPieceKg} {f.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2. BEDEN DAĞILIMI */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '8px',
            fontWeight: '900',
            letterSpacing: '0.25em',
            color: '#64748b',
            textTransform: 'uppercase',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#0f172a' }}></span>
            2. BEDEN DAĞILIM MATRİSİ
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '2px solid #0f172a',
            tableLayout: 'fixed',
          }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #0f172a' }}>
                <th style={{
                  padding: '7px 8px',
                  fontSize: '7px',
                  fontWeight: '900',
                  letterSpacing: '0.15em',
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  width: '90px',
                  borderRight: '1px solid #cbd5e1',
                }}>AŞAMA</th>
                {sortedSizes.map(s => (
                  <th key={s} style={{
                    padding: '7px 4px',
                    fontSize: '9px',
                    fontWeight: '900',
                    textAlign: 'center',
                    borderRight: '1px solid #cbd5e1',
                  }}>{getDisplayLabel(s)}</th>
                ))}
                <th style={{
                  padding: '7px 8px',
                  fontSize: '7px',
                  fontWeight: '900',
                  letterSpacing: '0.1em',
                  textAlign: 'center',
                  background: '#0f172a',
                  color: '#ffffff',
                  width: '70px',
                }}>TOPLAM</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '10px', fontWeight: '700' }}>
              {/* SİPARİŞ */}
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{
                  padding: '7px 8px',
                  fontSize: '7px',
                  fontWeight: '900',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#64748b',
                  borderRight: '1px solid #e2e8f0',
                }}>SİPARİŞ</td>
                {sortedSizes.map(s => (
                  <td key={s} style={{ padding: '7px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                    {order.qty_by_size[s]}
                  </td>
                ))}
                <td style={{ padding: '7px 8px', textAlign: 'center', background: '#f8fafc', fontWeight: '900' }}>
                  {totalSiparis}
                </td>
              </tr>
              {/* PLAN */}
              <tr style={{ borderBottom: '2px solid #0f172a', fontWeight: '900' }}>
                <td style={{
                  padding: '7px 8px',
                  fontSize: '7px',
                  fontWeight: '900',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#64748b',
                  borderRight: '1px solid #e2e8f0',
                }}>PLAN (+%{extraPercent})</td>
                {sortedSizes.map(s => (
                  <td key={s} style={{ padding: '7px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                    {plannedQtys[s]}
                  </td>
                ))}
                <td style={{ padding: '7px 8px', textAlign: 'center', background: '#0f172a', color: '#ffffff', fontWeight: '900' }}>
                  {sumOfPlanned}
                </td>
              </tr>
              {/* GERÇEKLEŞEN */}
              <tr style={{ height: '50px' }}>
                <td style={{
                  padding: '7px 8px',
                  fontSize: '7px',
                  fontWeight: '900',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#cbd5e1',
                  borderRight: '1px solid #e2e8f0',
                }}>GERÇEKLEŞEN KESİM</td>
                {sortedSizes.map(s => (
                  <td key={s} style={{ borderRight: '1px solid #e2e8f0' }}></td>
                ))}
                <td style={{ background: '#f8fafc' }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ALT BÖLÜM */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '2px solid #0f172a' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* Talimatlar */}
            <div style={{ flex: '1' }}>
              <div style={{
                fontSize: '7px',
                fontWeight: '900',
                letterSpacing: '0.2em',
                color: '#94a3b8',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}>ÖZEL KESİM TALİMATLARI:</div>
              <div style={{
                border: '1.5px solid #e2e8f0',
                borderRadius: '4px',
                padding: '10px 12px',
                minHeight: '100px',
                fontSize: '10px',
                fontWeight: '700',
                fontStyle: 'italic',
                textTransform: 'uppercase',
                color: '#334155',
                lineHeight: '1.6',
              }}>
                {order.post_processes || 'BELİRTİLMİŞ ÖZEL BİR TALİMAT BULUNMAMAKTADIR.'}
              </div>
            </div>

            {/* İmza */}
            <div style={{ width: '200px', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                {['KESİM ŞEFİ', 'ÜRETİM MÜDÜRÜ'].map(label => (
                  <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      height: '40px',
                      borderBottom: '1.5px solid #0f172a',
                      marginBottom: '6px',
                    }}></div>
                    <div style={{
                      fontSize: '7px',
                      fontWeight: '900',
                      letterSpacing: '0.1em',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                    }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{
                border: '2.5px solid #0f172a',
                borderRadius: '4px',
                padding: '10px',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: '900',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}>ÜRETİM ONAYI</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '7px',
          fontWeight: '700',
          color: '#cbd5e1',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '8px',
        }}>
          ALFA SPOR ERP / NAVY BLUE LOJİSTİK SİSTEMİ — 2026
        </div>
      </div>
    </div>
  );
}