import React, { useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Ortak marka kimliği — Unoteks tarzı kurumsal estetik
const NAVY = [30, 58, 95];        // #1e3a5f
const NAVY_DARK = [15, 31, 61];   // #0f1f3d
const GRAY_TEXT = [55, 65, 81];   // #374151
const GRAY_LIGHT = [156, 163, 175]; // #9ca3af
const LIGHT_BG = [248, 249, 250]; // #f8f9fa

export default function FabricPoPrint({ po, poolItems, onClose }) {
  const downloadStarted = useRef(false);

  const clearTurkishChars = (str) => {
    if (!str) return '—';
    return String(str)
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ç/g, 'c').replace(/Ç/g, 'C');
  };

  useEffect(() => {
    if (downloadStarted.current) return;
    downloadStarted.current = true;

    const handleAutoDownloadPdf = () => {
      try {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        // ── BAŞLIK ──────────────────────────────
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...GRAY_LIGHT);
        doc.text("ALFA SPOR GIYIM SAN. TIC. LTD. STI.", 14, 18);

        doc.setFontSize(22);
        doc.setTextColor(17, 24, 39);
        doc.text("Kumas Satin Alma Formu", 14, 28);

        const dateStr = new Date(po.order_date || po.created_at || new Date()).toLocaleDateString('tr-TR');
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_TEXT);
        doc.text(`Siparis No: ${clearTurkishChars(po.fabric_po_no)}`, 14, 35);

        // Sağ üst tarih
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...NAVY);
        doc.text(dateStr, 196, 18, { align: 'right' });
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...GRAY_LIGHT);
        doc.text("TARIH", 196, 22, { align: 'right' });

        // İnce ayraç çizgisi
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.line(14, 41, 196, 41);

        // ── TEDARİKÇİ BİLGİSİ ──────────────────
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...GRAY_LIGHT);
        doc.text("TEDARIKCI FIRMA", 14, 50);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(...NAVY);
        doc.text(clearTurkishChars(po.supplier_name || '..........').toUpperCase(), 14, 57);

        // ── TABLO ───────────────────────────────
        const tableHeaders = [
          ["Kumas Cinsi / Kalitesi", "Icerik", "Gramaj (GSM)", "En (cm)", "Kumas Rengi", "Miktar"]
        ];

        // Sadece kumaş türü + renk bazında grupla
        const normalizeKey = (s) => String(s || '')
          .toLocaleUpperCase('tr-TR')
          .replace(/\s+/g, ' ')
          .trim();

        const grouped = {};
        poolItems.forEach(item => {
          const key = `${normalizeKey(item.fabricKind)}__${normalizeKey(item.fabricColor)}`;
          if (!grouped[key]) {
            grouped[key] = {
              fabricKind: item.fabricKind,
              content: item.content,
              gsm: item.gsm,
              width: item.width,
              fabricColor: item.fabricColor,
              totalKg: 0,
            };
          }
          grouped[key].totalKg += Number(item.allocatedQtyKg || item.neededKg || 0);
        });

        const tableRows = Object.values(grouped).map(g => [
          clearTurkishChars(g.fabricKind).toUpperCase(),
          clearTurkishChars(g.content).toUpperCase(),
          `${g.gsm}`,
          `${g.width}`,
          clearTurkishChars(g.fabricColor).toUpperCase(),
          `${g.totalKg} KG`
        ]);

        // Toplam, gerçek kalem toplamından hesaplanıyor
        const grandTotal = Object.values(grouped).reduce((sum, g) => sum + g.totalKg, 0);

        tableRows.push([
          { content: 'TOPLAM SIPARIS MIKTARI', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: LIGHT_BG, textColor: GRAY_TEXT } },
          { content: `${grandTotal} KG`, styles: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT_BG, halign: 'right', fontSize: 10 } }
        ]);

        autoTable(doc, {
          startY: 67,
          head: tableHeaders,
          body: tableRows,
          theme: 'plain',
          styles: { font: 'Helvetica', fontStyle: 'normal', lineColor: [229, 231, 235], lineWidth: 0.2 },
          headStyles: {
            fillColor: false,
            textColor: GRAY_LIGHT,
            fontSize: 7.5,
            fontStyle: 'bold',
            halign: 'left',
            lineWidth: { bottom: 0.4 },
            lineColor: NAVY,
            cellPadding: { top: 0, bottom: 6, left: 0, right: 0 },
          },
          bodyStyles: {
            fontSize: 9,
            textColor: GRAY_TEXT,
            lineWidth: { bottom: 0.2 },
            lineColor: [229, 231, 235],
            cellPadding: { top: 7, bottom: 7, left: 0, right: 0 },
          },
          columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', textColor: [17, 24, 39] },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'left' },
            5: { halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: 14, right: 14 }
        });

        // ── BİLGİ NOTU ──────────────────────────
        const finalY = doc.lastAutoTable.finalY + 14;
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.line(14, finalY, 196, finalY);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...GRAY_LIGHT);
        doc.text("ONEMLI TEDARIK VE SEVK SARTI", 14, finalY + 9);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_TEXT);
        doc.text("Lutfen olasi renk/parti farklarina karsi gonderim oncesi numune onayi saglayiniz.", 14, finalY + 16);

        // ── İMZA BLOKLARI ───────────────────────
        const sigY = finalY + 36;
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.line(14, sigY, 90, sigY);
        doc.line(120, sigY, 196, sigY);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39);
        doc.text("Siparisi Onaylayan", 14, sigY + 6);
        doc.text("Tedarikci Onayi", 120, sigY + 6);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...GRAY_LIGHT);
        doc.text("Alfa Spor Giyim Satin Alma", 14, sigY + 11);
        doc.text("Musteri Temsilcisi / Kase", 120, sigY + 11);

        const saveName = `${po.fabric_po_no || 'Kumas_Siparisi'}_ALFA_SPOR.pdf`;
        doc.save(saveName);

        onClose();
      } catch (error) {
        console.error("PDF Hazırlama Hatası:", error);
        alert("PDF dökümü indirilirken teknik bir sorun oluştu.");
        onClose();
      }
    };

    handleAutoDownloadPdf();
  }, [po, poolItems, onClose]);

  return null;
}