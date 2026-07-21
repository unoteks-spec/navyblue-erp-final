import React, { useEffect, useRef, useState } from 'react';
import { X, FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SIZE_ORDER } from '../../constants/sizes';

// Ortak marka kimliği — Unoteks tarzı kurumsal estetik
const NAVY = '#1e3a5f';
const NAVY_DARK = '#0f1f3d';
const GRAY = '#6b7280';
const LIGHT_GRAY = '#9ca3af';
const BORDER = '#e5e7eb';
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function CuttingOrderPrint({ order, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef();

  const getDisplayLabel = (s) => {
    const prefixes = ['B', 'K', 'C', 'S', 'Y', 'U', 'N'];
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
    if (!dateStr) return '—';
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
            background: NAVY,
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 26px',
            fontFamily: FONT,
            fontWeight: '700',
            fontSize: '13px',
            letterSpacing: '0.03em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(30,58,95,0.35)',
          }}
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
          PDF İndir
        </button>
        <button
          onClick={onClose}
          style={{
            background: '#fff',
            color: '#374151',
            border: '1.5px solid #e5e7eb',
            borderRadius: '10px',
            padding: '12px 14px',
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
          color: '#1f2937',
          width: '210mm',
          minHeight: '297mm',
          fontFamily: FONT,
          padding: '16mm 16mm 12mm 16mm',
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
          paddingBottom: '18px',
          borderBottom: `1px solid ${BORDER}`,
          marginBottom: '18px',
        }}>
          {/* Sol: Marka + Başlık + Bilgi tablosu */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              color: GRAY,
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}>
              ALFA SPOR GİYİM TEKSTİL LTD. ŞTİ.
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '800',
              letterSpacing: '-0.02em',
              lineHeight: '1.05',
              color: '#111827',
              marginBottom: '4px',
            }}>
              Kesim Emri
            </div>
            <div style={{
              fontSize: '12px',
              fontWeight: '500',
              color: GRAY,
              marginBottom: '14px',
            }}>
              Sipariş No: <span style={{ fontWeight: '700', color: '#111827' }}>{order.order_no}</span>
            </div>

            {/* Bilgi tablosu — eski konumu */}
            <table style={{ borderCollapse: 'separate', borderSpacing: '0 6px' }}>
              <tbody>
                {[
                  ['MÜŞTERİ', order.customer],
                  ['MODEL ADI', order.model],
                  ['RENK', order.color],
                  ['TARİH', formatDate(order.cutting_date)],
                  ['PASTAL ENİ', order.marker_width ? `${order.marker_width} CM` : '—'],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{
                      fontSize: '9px',
                      fontWeight: '700',
                      letterSpacing: '0.06em',
                      color: LIGHT_GRAY,
                      textTransform: 'uppercase',
                      paddingRight: '16px',
                      whiteSpace: 'nowrap',
                    }}>{label}</td>
                    <td style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#111827',
                    }}>{value || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sağ: ARTİKEL + Model Resim */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', marginLeft: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: NAVY, lineHeight: '1' }}>
                {order.article}
              </div>
              <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', color: LIGHT_GRAY, textTransform: 'uppercase', marginTop: '4px' }}>
                ARTİKEL NO
              </div>
            </div>
            <div style={{ width: '150px', height: '150px', border: `1px solid ${BORDER}`, borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
              {order.model_image ? (
                <img src={order.model_image} style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }} alt="Model" />
              ) : (
                <span style={{ fontSize: '10px', fontWeight: '600', color: LIGHT_GRAY, textTransform: 'uppercase' }}>Resim Yok</span>
              )}
            </div>
          </div>
        </div>

        {/* 1. KUMAŞ DETAYLARI */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '0.1em',
            color: NAVY,
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            Kumaş ve Malzeme Detayları
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['CİNS', 'RENK / VARYANT', 'SARFİYAT'].map(h => (
                  <th key={h} style={{
                    padding: '8px 0',
                    fontSize: '9px',
                    fontWeight: '700',
                    color: LIGHT_GRAY,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    textAlign: h === 'SARFİYAT' ? 'right' : 'left',
                    borderBottom: `1px solid ${BORDER}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fabrics.map((f, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '10px 0', fontSize: '12px', fontWeight: '600', color: '#111827' }}>{f.kind}</td>
                  <td style={{ padding: '10px 0', fontSize: '12px', fontWeight: '500', color: '#374151' }}>{f.color || order.color}</td>
                  <td style={{ padding: '10px 0', fontSize: '12px', fontWeight: '700', color: NAVY, textAlign: 'right' }}>{f.perPieceKg} {f.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2. BEDEN DAĞILIMI */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '0.1em',
            color: NAVY,
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            Beden Dağılım Matrisi
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: `1px solid ${BORDER}` }}>
            <thead>
              <tr>
                <th style={{
                  padding: '9px 8px',
                  fontSize: '9px',
                  fontWeight: '700',
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: LIGHT_GRAY,
                  width: '110px',
                  border: `1px solid ${BORDER}`,
                  background: '#fafafa',
                }}>Aşama</th>
                {sortedSizes.map(s => (
                  <th key={s} style={{
                    padding: '9px 4px',
                    fontSize: '10px',
                    fontWeight: '700',
                    textAlign: 'center',
                    color: '#111827',
                    border: `1px solid ${BORDER}`,
                    background: '#fafafa',
                  }}>{getDisplayLabel(s)}</th>
                ))}
                <th style={{
                  padding: '9px 8px',
                  fontSize: '9px',
                  fontWeight: '700',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#fff',
                  width: '70px',
                  border: `1px solid ${NAVY}`,
                  background: NAVY,
                }}>Toplam</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '12px' }}>
              <tr>
                <td style={{ padding: '10px 8px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#374151', border: `1px solid ${BORDER}` }}>Sipariş</td>
                {sortedSizes.map(s => (
                  <td key={s} style={{ padding: '10px 4px', textAlign: 'center', fontWeight: '500', color: '#374151', border: `1px solid ${BORDER}` }}>{order.qty_by_size[s]}</td>
                ))}
                <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '700', color: '#111827', border: `1px solid ${BORDER}` }}>{totalSiparis}</td>
              </tr>
              <tr>
                <td style={{ padding: '10px 8px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#374151', border: `1px solid ${BORDER}` }}>Plan (+%{extraPercent})</td>
                {sortedSizes.map(s => (
                  <td key={s} style={{ padding: '10px 4px', textAlign: 'center', fontWeight: '700', color: '#111827', border: `1px solid ${BORDER}` }}>{plannedQtys[s]}</td>
                ))}
                <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '800', color: '#fff', fontSize: '13px', background: NAVY, border: `1px solid ${NAVY}` }}>{sumOfPlanned}</td>
              </tr>
              <tr style={{ height: '64px' }}>
                <td style={{ padding: '10px 8px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: LIGHT_GRAY, verticalAlign: 'top', border: `1px solid ${BORDER}` }}>Gerçekleşen</td>
                {sortedSizes.map(s => (
                  <td key={s} style={{ border: `1px solid ${BORDER}` }}></td>
                ))}
                <td style={{ border: `1px solid ${BORDER}` }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PASTAL PLANI İÇİN BOŞ ALAN */}
        <div style={{ minHeight: '120px' }}></div>

        {/* ALT BÖLÜM */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.08em', color: LIGHT_GRAY, textTransform: 'uppercase', marginBottom: '8px' }}>
                Özel Kesim Talimatları
              </div>
              <div style={{
                border: `1px solid ${BORDER}`,
                borderRadius: '8px',
                padding: '12px 14px',
                minHeight: '70px',
                fontSize: '11.5px',
                fontWeight: '500',
                color: '#374151',
                lineHeight: '1.5',
              }}>
                {order.post_processes || 'Belirtilmiş özel bir talimat bulunmamaktadır.'}
              </div>
            </div>

            <div style={{ width: '200px', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                {['KESİM ŞEFİ', 'ÜRETİM MÜDÜRÜ'].map(label => (
                  <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: '36px', borderBottom: `1px solid ${BORDER}`, marginBottom: '6px' }}></div>
                    <div style={{ fontSize: '8.5px', fontWeight: '700', letterSpacing: '0.05em', color: LIGHT_GRAY, textTransform: 'uppercase' }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: NAVY, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', color: '#fff', textTransform: 'uppercase' }}>Üretim Onayı</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '8.5px',
          fontWeight: '500',
          color: LIGHT_GRAY,
          letterSpacing: '0.08em',
          borderTop: `1px solid ${BORDER}`,
          paddingTop: '10px',
        }}>
          ALFA SPOR ERP — NAVY BLUE LOJİSTİK SİSTEMİ
        </div>
      </div>
    </div>
  );
}