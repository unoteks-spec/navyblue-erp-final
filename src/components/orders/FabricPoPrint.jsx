import React, { useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const NAVY = [30, 58, 95];
const GRAY_TEXT = [55, 65, 81];
const GRAY_LIGHT = [156, 163, 175];
const LIGHT_BG = [248, 249, 250];
const HEADER_BG = [241, 245, 249];

export default function FabricPoPrint({ pos, onClose }) {
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

  const normalizeKey = (s) => String(s || '').toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim();

  useEffect(() => {
    if (downloadStarted.current) return;
    downloadStarted.current = true;

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const supplierName = pos[0]?.supplier_name || '—';
      const dateStr = new Date().toLocaleDateString('tr-TR');

      // ── BAŞLIK ──────────────────────────────
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...GRAY_LIGHT);
      doc.text("ALFA SPOR GIYIM SAN. TIC. LTD. STI.", 14, 18);

      // ✅ Önce tanımla, sonra kullan
      const poNos = pos.map(p => clearTurkishChars(p.fabric_po_no)).join(' / ');

      // Bağlı üretim sipariş numaraları
      const orderNos = [...new Set(
        pos.flatMap(po =>
          (po.fabric_order_items || []).map(item => {
            const ord = Array.isArray(item.orders) ? item.orders[0] : item.orders;
            return ord?.order_no || null;
          }).filter(Boolean)
        )
      )].join(', ');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(17, 24, 39);
      doc.text(`Kumas Satin Alma Formu  #${orderNos || poNos}`, 14, 28);

      // Kumaş PO numaraları küçük yazı ile altında
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY_TEXT);
      doc.text(`Kumas PO: ${poNos}`, 14, 34);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text(dateStr, 196, 18, { align: 'right' });


      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.line(14, 37, 196, 37);

      // ── TEDARİKÇİ ───────────────────────────
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY_LIGHT);
      doc.text("TEDARIKCI FIRMA", 14, 46);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...NAVY);
      doc.text(clearTurkishChars(supplierName).toUpperCase(), 14, 53);

      // ── GRUPLAMA: Kalite → Renkler ──────────
      // Önce kalite bazında grupla
      const byKind = {};
      pos.forEach(po => {
        const items = po._poolItems || [];
        items.forEach(item => {
          const kindKey = normalizeKey(item.fabricKind);
          if (!byKind[kindKey]) {
            byKind[kindKey] = {
              fabricKind: item.fabricKind,
              content: item.content,
              gsm: item.gsm,
              width: item.width,
              colors: {},
              totalKg: 0,
            };
          }
          const colorKey = normalizeKey(item.fabricColor);
          if (!byKind[kindKey].colors[colorKey]) {
            byKind[kindKey].colors[colorKey] = {
              fabricColor: item.fabricColor,
              totalKg: 0,
              // ✅ Her rengin kendi PO fiyatını sakla
              unitPrice: po.unit_price || null,
              currency: po.price_currency || 'EUR',
            };
          }
          byKind[kindKey].colors[colorKey].totalKg += Number(item.allocatedQtyKg || 0);
          byKind[kindKey].totalKg += Number(item.allocatedQtyKg || 0);
        });
      });

      // Kaliteleri toplam kg'a göre büyükten küçüğe sırala
      const sortedKinds = Object.values(byKind).sort((a, b) => b.totalKg - a.totalKg);

      // ── TABLO SATIRLARI ───────────────────────
      const tableHeaders = [
        ["Kumas Cinsi / Kalitesi", "Icerik", "Gramaj", "En (cm)", "Kumas Rengi", "Miktar", "Birim Fiyat"]
      ];

      const tableRows = [];

      sortedKinds.forEach(kind => {
        const colorEntries = Object.values(kind.colors).sort((a, b) => b.totalKg - a.totalKg);

        if (colorEntries.length === 1) {
          // Tek renk — tek satır, fiyat bu satırda
          const ce = colorEntries[0];
          const priceStr = ce.unitPrice
            ? `${Number(ce.unitPrice).toFixed(2)} ${ce.currency}/KG`
            : '—';
          tableRows.push([
            { content: clearTurkishChars(kind.fabricKind).toUpperCase(), styles: { fontStyle: 'bold', textColor: [17, 24, 39] } },
            clearTurkishChars(kind.content).toUpperCase(),
            `${kind.gsm}`,
            `${kind.width}`,
            clearTurkishChars(ce.fabricColor).toUpperCase(),
            { content: `${kind.totalKg} KG`, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: priceStr, styles: { halign: 'right' } },
          ]);
        } else {
          // Birden fazla renk — kalite başlık satırı (fiyatsız) + renk satırları (fiyatlı)
          tableRows.push([
            { content: clearTurkishChars(kind.fabricKind).toUpperCase(), styles: { fontStyle: 'bold', textColor: [17, 24, 39], fillColor: HEADER_BG } },
            { content: clearTurkishChars(kind.content).toUpperCase(), styles: { fillColor: HEADER_BG } },
            { content: `${kind.gsm}`, styles: { fillColor: HEADER_BG, halign: 'center' } },
            { content: `${kind.width}`, styles: { fillColor: HEADER_BG, halign: 'center' } },
            { content: `${colorEntries.length} Renk`, styles: { fillColor: HEADER_BG, textColor: GRAY_LIGHT, fontStyle: 'bold' } },
            { content: `${kind.totalKg} KG`, styles: { fontStyle: 'bold', halign: 'right', fillColor: HEADER_BG, textColor: NAVY } },
            { content: '', styles: { fillColor: HEADER_BG } },
          ]);

          // Her renk için alt satır — fiyat burada
          colorEntries.forEach(ce => {
            const priceStr = ce.unitPrice
              ? `${Number(ce.unitPrice).toFixed(2)} ${ce.currency}/KG`
              : '—';
            tableRows.push([
              '',
              '',
              '',
              '',
              { content: `  > ${clearTurkishChars(ce.fabricColor).toUpperCase()}`, styles: { textColor: GRAY_TEXT } },
              { content: `${ce.totalKg} KG`, styles: { halign: 'right', textColor: GRAY_TEXT } },
              { content: priceStr, styles: { halign: 'right', textColor: GRAY_TEXT } },
            ]);
          });
        }
      });

      // Toplam satırı
      const grandTotal = pos.reduce((sum, po) => sum + Number(po.ordered_qty_kg || 0), 0);
      tableRows.push([
        { content: 'TOPLAM SIPARIS MIKTARI', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: LIGHT_BG, textColor: GRAY_TEXT } },
        { content: `${grandTotal} KG`, styles: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT_BG, halign: 'right', fontSize: 10 } },
        { content: '', styles: { fillColor: LIGHT_BG } }
      ]);

      // Toplam tutar renk bazında hesapla
      const totalAmounts = {};
      sortedKinds.forEach(kind => {
        Object.values(kind.colors).forEach(ce => {
          if (!ce.unitPrice) return;
          const cur = ce.currency;
          if (!totalAmounts[cur]) totalAmounts[cur] = 0;
          totalAmounts[cur] += ce.totalKg * Number(ce.unitPrice);
        });
      });

      Object.entries(totalAmounts).forEach(([cur, amount]) => {
        tableRows.push([
          { content: `TOPLAM TUTAR (${cur})`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: LIGHT_BG, textColor: GRAY_TEXT } },
          { content: `${amount.toFixed(2)} ${cur}`, colSpan: 2, styles: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT_BG, halign: 'right', fontSize: 10 } },
        ]);
      });

      autoTable(doc, {
        startY: 62,
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
          cellPadding: { top: 0, bottom: 4, left: 0, right: 0 },
        },
        bodyStyles: {
          fontSize: 9,
          textColor: GRAY_TEXT,
          lineWidth: { bottom: 0.2 },
          lineColor: [229, 231, 235],
          cellPadding: { top: 3, bottom: 3, left: 0, right: 0 },
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 40 },
          1: { halign: 'left', cellWidth: 30 },
          2: { halign: 'center', cellWidth: 16 },
          3: { halign: 'center', cellWidth: 16 },
          4: { halign: 'left', cellWidth: 'auto' },
          5: { halign: 'right', cellWidth: 22 },
          6: { halign: 'right', cellWidth: 28 },
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

      const saveName = `${clearTurkishChars(supplierName).replace(/\s+/g, '_')}_KUMAS_SIPARISI_${dateStr.replace(/\./g, '-')}.pdf`;
      doc.save(saveName);
      onClose();
    } catch (error) {
      console.error("PDF Hatası:", error);
      alert("PDF oluşturulurken hata oluştu.");
      onClose();
    }
  }, [pos, onClose]);

  return null;
}