import React, { useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

        doc.setFont("Helvetica", "bold");

        // 1. SOL ÜST ANTET
        doc.setFontSize(14);
        doc.text("ALFA SPOR GIYIM SAN. TIC. LTD. STI.", 14, 20);

        doc.setFontSize(9);
        doc.setFont("Helvetica", "normal");
        doc.text("Kumas Satin Alma ve Siparis Formu", 14, 25);

        // 2. SAĞ ÜST FORM BİLGİLERİ
        const dateStr = new Date(po.order_date || po.created_at || new Date()).toLocaleDateString('tr-TR');
        doc.text(`Siparis No: ${clearTurkishChars(po.fabric_po_no)}`, 145, 20);
        doc.text(`Tarih: ${dateStr}`, 145, 25);

        // Ayırıcı Siyah Çizgi
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.4);
        doc.line(14, 30, 196, 30);

        // 3. TEDARİKÇİ BAŞLIĞI
        doc.setFont("Helvetica", "bold");
        doc.text("TEDARIKCI FIRMA:", 14, 39);
        doc.setFont("Helvetica", "normal");
        doc.text(clearTurkishChars(po.supplier_name || '..........').toUpperCase(), 50, 39);

        // 4. TABLO BAŞLIKLARI — Customer kaldırıldı, kumaşçının bilmesine gerek yok
        const tableHeaders = [
          ["Kumas Cinsi / Kalitesi", "Icerik", "Gramaj (GSM)", "En (cm)", "Kumas Rengi", "Miktar"]
        ];

        // 5. AYNI CİNS+RENK+İÇERİK+GSM+EN KALEMLERİNİ TEK SATIRDA TOPLA
        // Kumaşçıya kaç ayrı artikel için sipariş edildiği önemli değil, sadece toplam KG önemli
        const grouped = {};
        poolItems.forEach(item => {
          const key = `${item.fabricKind}__${item.fabricColor}__${item.content}__${item.gsm}__${item.width}`;
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

        // Net Toplam Satırı
        tableRows.push([
          { content: 'TOPLAM SIPARIS MIKTARI (TOTAL):', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
          { content: `${po.ordered_qty_kg || 0} KG`, styles: { fontStyle: 'bold', textColor: [22, 101, 52], fillColor: [241, 245, 249], halign: 'right' } }
        ]);

        // 6. Tabloyu PDF Sayfasına Sabitleme
        autoTable(doc, {
          startY: 45,
          head: tableHeaders,
          body: tableRows,
          theme: 'grid',
          styles: { font: 'Helvetica', fontStyle: 'normal' },
          headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', halign: 'left' },
          bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
          columnStyles: {
            0: { halign: 'left' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'left' },
            5: { halign: 'right' }
          },
          margin: { left: 14, right: 14 }
        });

        // 7. UYARI KUTUSU
        const finalY = doc.lastAutoTable.finalY + 12;
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
        doc.setLineWidth(0.3);
        doc.rect(14, finalY, 182, 12, 'DF');

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(22, 101, 52);
        doc.text("ONEMLI TEDARIK VE SEVK SARTI:", 18, finalY + 7);
        doc.setFont("Helvetica", "normal");
        doc.text("Lutfen olasi renk/parti farklarina karsi gonderim oncesi numune onayi saglayiniz.", 68, finalY + 7);

        // 8. İMZA BLOKLARI
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);

        doc.text("Siparisi Onaylayan", 14, finalY + 28);
        doc.text("Tedarikci Onayi", 145, finalY + 28);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Alfa Spor Giyim Satin Alma", 14, finalY + 34);
        doc.text("Musteri Temsilcisi / Kase", 145, finalY + 34);

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