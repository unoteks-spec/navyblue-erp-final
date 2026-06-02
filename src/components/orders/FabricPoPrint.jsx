import React, { useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FabricPoPrint({ po, poolItems, onClose }) {
  // 🚀 DÜZELTME: Çift indirmeyi tamamen bloke eden referans bayrağı
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
    // Eğer indirme işlemi zaten başladıysa fonksiyonu durdur (Çift tetiklenme kalkanı)
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
        
        // 1. SOL ÜST ANTET[cite: 9]
        doc.setFontSize(14);
        doc.text("ALFA SPOR GIYIM SAN. TIC. LTD. STI.", 14, 20); //[cite: 9]
        
        doc.setFontSize(9);
        doc.setFont("Helvetica", "normal");
        doc.text("Kumas Satin Alma ve Siparis Formu", 14, 25); //[cite: 9]
        
        // 2. SAĞ ÜST FORM BİLGİLERİ[cite: 9]
        const dateStr = new Date(po.order_date || po.created_at || new Date()).toLocaleDateString('tr-TR'); //[cite: 9]
        doc.text(`Siparis No: ${clearTurkishChars(po.fabric_po_no)}`, 145, 20); //[cite: 9]
        doc.text(`Tarih: ${dateStr}`, 145, 25); //[cite: 9]

        // Ayırıcı Siyah Çizgi
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.4);
        doc.line(14, 30, 196, 30);

        // 3. TEDARİKÇİ BAŞLIĞI[cite: 9]
        doc.setFont("Helvetica", "bold");
        doc.text("TEDARIKCI FIRMA:", 14, 39); //[cite: 9]
        doc.setFont("Helvetica", "normal");
        doc.text(clearTurkishChars(po.supplier_name || '..........').toUpperCase(), 50, 39); //[cite: 9]

        // 4. TABLO BAŞLIKLARI[cite: 9]
        const tableHeaders = [
          ["Customer / Musteri", "Kumas Cinsi / Kalitesi", "Icerik", "Gramaj (GSM)", "En (cm)", "Kumas Rengi", "Miktar"] //[cite: 9]
        ];

        // 5. SAF VERİ SATIRLARI DÖKÜM MOTORU[cite: 9]
        const tableRows = poolItems.map(item => [
          clearTurkishChars(item.customer).toUpperCase(),
          clearTurkishChars(item.fabricKind).toUpperCase(),
          clearTurkishChars(item.content).toUpperCase(),
          `${item.gsm}`,
          `${item.width}`,
          clearTurkishChars(item.fabricColor).toUpperCase(),
          `${item.allocatedQtyKg || item.neededKg || '0'} KG`
        ]);

        // Net Toplam Satırı[cite: 9]
        tableRows.push([
          { content: 'TOPLAM SIPARIS MIKTARI (TOTAL):', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } }, //[cite: 9]
          { content: `${po.ordered_qty_kg || 0} KG`, styles: { fontStyle: 'bold', textColor: [22, 101, 52], fillColor: [241, 245, 249], halign: 'right' } } //[cite: 9]
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
            1: { halign: 'left' },   
            3: { halign: 'center' }, 
            4: { halign: 'center' }, 
            5: { halign: 'left' },   
            6: { halign: 'right' }   
          },
          margin: { left: 14, right: 14 }
        });

        // 7. UYARI KUTUSU[cite: 9]
        const finalY = doc.lastAutoTable.finalY + 12;
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
        doc.setLineWidth(0.3);
        doc.rect(14, finalY, 182, 12, 'DF');
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(22, 101, 52);
        doc.text("ONEMLI TEDARIK VE SEVK SARTI:", 18, finalY + 7); //[cite: 9]
        doc.setFont("Helvetica", "normal");
        doc.text("Lutfen olasi renk/parti farklarina karsi gonderim oncesi numune onayi saglayiniz.", 68, finalY + 7); //[cite: 9]

        // 8. İMZA BLOKLARI[cite: 9]
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        
        doc.text("Siparisi Onaylayan", 14, finalY + 28); //[cite: 9]
        doc.text("Tedarikci Onayi", 145, finalY + 28); //[cite: 9]
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Alfa Spor Giyim Satin Alma", 14, finalY + 34); //[cite: 9]
        doc.text("Musteri Temsilcisi / Kase", 145, finalY + 34); //[cite: 9]

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