import React from 'react';
import { Printer, X, Hash, Package, Scale } from 'lucide-react';

export default function ShippingLabelModal({ boxes, consignee, onClose }) {
  
  // 🛠️ KOLİ ARALIKLARINI TEKİL ETİKETLERE PARÇALAYAN FONKSİYON
  const generateLabels = () => {
    let allLabels = [];
    boxes.forEach(box => {
      const rangeParts = box.range.split('-').map(Number);
      const start = rangeParts[0];
      const end = rangeParts[1] || start;
      if (!isNaN(start)) {
        for (let i = start; i <= end; i++) {
          allLabels.push({ boxNo: i, ...box });
        }
      }
    });
    return allLabels;
  };

  const labels = generateLabels();

  return (
    <div className="fixed inset-0 z-100 bg-slate-900/90 backdrop-blur-xl overflow-y-auto p-4 md:p-10 no-print">
      <div className="max-w-6xl mx-auto">
        
        {/* KONTROL PANELİ */}
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl mb-10 flex justify-between items-center border border-slate-100">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-200">
              <Printer size={32}/>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Termal Baskı Hattı</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Argox 200mm x 100mm • Yatay (Landscape) • {labels.length} Etiket</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase shadow-2xl hover:bg-blue-600 transition-all active:scale-95">Yazdır (Argox)</button>
            <button onClick={onClose} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-colors"><X size={28}/></button>
          </div>
        </div>

        {/* EKRAN ÖNİZLEME (Yatayı temsil eder) */}
        <div className="grid grid-cols-1 gap-8 opacity-40">
           <div className="bg-white aspect-[2/1] w-full max-w-2xl mx-auto rounded-[3rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center">
              <Package size={64} className="text-slate-200 mb-4" />
              <p className="text-slate-300 font-black text-2xl uppercase italic">Yatay Etiket Önizleme</p>
           </div>
        </div>
      </div>

      {/* 🚢 GERÇEK ARGOX BASKI ALANI (Sadece Yazıcıda Görünür) */}
      <div className="hidden print:block bg-white">
        {labels.map((label, idx) => (
          <div key={idx} className="landscape-label">
            
            {/* SOL SÜTUN: MARKA & ADRESLER */}
            <div className="col-left">
              <div className="brand-section">
                <h1 className="brand-name">NAVY BLUE</h1>
                <p className="brand-motto">BORN FROM THE OCEAN</p>
              </div>
              <div className="address-section">
                <div className="addr-block">
                  <p className="mini-title">FROM / GÖNDEREN</p>
                  <p className="addr-text-bold">ALFA SPOR GİYİM LTD. ŞTİ.</p>
                  <p className="addr-text">MTK SITESI, IZMIR, TURKEY</p>
                </div>
                <div className="addr-block mt-4">
                  <p className="mini-title">TO / ALICI</p>
                  <p className="addr-text-bold uppercase">{consignee.name || '---'}</p>
                  <p className="addr-text uppercase line-clamp-2">{consignee.address || '---'}</p>
                </div>
              </div>
            </div>

            {/* ORTA SÜTUN: ÜRÜN DETAYI & MİKTAR */}
            <div className="col-mid">
              <div className="product-section">
                <p className="mini-title">ARTICLE / MODEL</p>
                <h2 className="product-val">
                  {label.orderId ? boxes.find(b => b.orderId === label.orderId)?.article || 'ART-' + label.boxNo : '---'}
                </h2>
                
                <p className="mini-title mt-4">SIZE / RATIO / ASORTİ</p>
                <h2 className="size-val">
                   {label.type === 'LOT' ? `${label.lotSizes} (${label.lotRatio})` : label.size}
                </h2>
              </div>
              <div className="qty-section">
                <p className="qty-label">TOTAL QUANTITY</p>
                <p className="qty-val">{label.actualQty} <span className="pcs">PCS</span></p>
              </div>
            </div>

            {/* SAĞ SÜTUN: KOLİ NO & LOJİSTİK */}
            <div className="col-right">
              <div className="box-no-section">
                <p className="mini-title">BOX NO</p>
                <h1 className="box-huge">{label.boxNo}</h1>
              </div>
              <div className="logistics-section">
                <div className="log-row"><span>NET:</span> <strong>{label.net} KG</strong></div>
                <div className="log-row"><span>GROSS:</span> <strong>{label.gross} KG</strong></div>
                <div className="log-row"><span>DIMS:</span> <strong>{label.dimensions}</strong></div>
              </div>
              <div className="origin-section">
                <p className="origin-val">MADE IN TURKEY</p>
              </div>
            </div>

          </div>
        ))}
      </div>

      <style>{`
        @media print {
          @page { size: 200mm 100mm; margin: 0; }
          body { margin: 0; padding: 0; background: #fff; }
          .no-print { display: none !important; }
          
          .landscape-label {
            width: 200mm;
            height: 100mm;
            padding: 5mm;
            display: grid;
            grid-template-columns: 75mm 75mm 40mm;
            gap: 2mm;
            border: 5px solid #000;
            page-break-after: always;
            box-sizing: border-box;
            background: #fff;
            overflow: hidden;
          }

          .mini-title { font-size: 7pt; font-weight: 900; margin-bottom: 1mm; border-bottom: 2px solid #000; display: inline-block; }
          
          .col-left { border-right: 3px solid #000; padding-right: 3mm; display: flex; flex-direction: column; justify-content: space-between; }
          .brand-name { font-size: 24pt; font-weight: 900; line-height: 1; margin: 0; }
          .brand-motto { font-size: 7pt; font-weight: 700; letter-spacing: 1.5mm; }
          .addr-text-bold { font-size: 9pt; font-weight: 900; line-height: 1.1; }
          .addr-text { font-size: 8pt; font-weight: 500; }

          .col-mid { border-right: 3px solid #000; padding: 0 3mm; display: flex; flex-direction: column; justify-content: space-between; }
          .product-val { font-size: 18pt; font-weight: 900; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .size-val { font-size: 16pt; font-weight: 900; line-height: 1.1; margin: 0; }
          .qty-section { background: #000; color: #fff; padding: 3mm; text-align: center; }
          .qty-label { font-size: 8pt; font-weight: 700; }
          .qty-val { font-size: 28pt; font-weight: 900; line-height: 1; }
          .pcs { font-size: 10pt; }

          .col-right { padding-left: 2mm; display: flex; flex-direction: column; justify-content: space-between; text-align: center; }
          .box-huge { font-size: 50pt; font-weight: 900; line-height: 0.9; margin: 0; }
          .logistics-section { font-size: 9pt; text-align: left; }
          .log-row { display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding: 1mm 0; }
          .origin-section { border: 2px solid #000; padding: 1mm; margin-top: 2mm; }
          .origin-val { font-size: 9pt; font-weight: 900; letter-spacing: 0.5mm; }
        }
      `}</style>
    </div>
  );
}