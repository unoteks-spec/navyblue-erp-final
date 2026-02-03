import React, { useEffect } from 'react';
import { Printer, X, Scissors, Ruler, Info, Calculator } from 'lucide-react';

export default function CuttingOrderPrint({ order, onClose }) {
  
  const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
  
  const sortedSizes = Object.keys(order.qty_by_size || {}).sort((a, b) => {
    return SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b);
  });

  const extraPercent = Number(order.extra_percent) || 0;
  const extraFactor = 1 + (extraPercent / 100);

  const totalSiparis = Object.values(order.qty_by_size || {}).reduce((a, b) => a + Number(b), 0);
  const totalPlanlanan = Math.ceil(totalSiparis * extraFactor);

  const fabrics = Object.values(order.fabrics || {}).filter(f => f.kind);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-200 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-0 md:p-8 overflow-y-auto">
      
      {/* ANA A4 SAYFA KONTEYNERI */}
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-2xl relative p-12 flex flex-col print:p-0 print:shadow-none print:m-0">
        
        {/* KONTROL PANELİ */}
        <div className="absolute top-4 right-4 flex gap-3 print:hidden z-50">
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 shadow-lg transition-all">
            <Printer size={18} /> YAZDIR
          </button>
          <button onClick={onClose} className="bg-white text-slate-500 px-4 py-2.5 rounded-xl font-bold border border-slate-200 hover:bg-red-50 shadow-md">
            <X size={20} />
          </button>
        </div>

        {/* ÜST İÇERİK (FLEX GROW İLE ALT KISMI İTER) */}
        <div className="grow">
          {/* Başlık */}
          <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900">KESİM EMRİ</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">ALFA SPOR GİYİM LTD. ŞTİ.</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold border-2 border-slate-900 px-4 py-1 inline-block">{order.order_no}</div>
              <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">SİPARİŞ NO</div>
            </div>
          </div>

          {/* Bilgi Kutuları */}
          <div className="grid grid-cols-12 gap-8 py-8 border-b border-slate-200">
            <div className="col-span-8 grid grid-cols-2 gap-y-4 gap-x-8">
              <InfoBox label="Müşteri" value={order.customer} />
              <InfoBox label="Renk" value={order.color} />
              <InfoBox label="Artikel" value={order.article} />
              <InfoBox label="Kesim Tarihi" value={order.cutting_date || '---'} />
              <InfoBox label="Model" value={order.model} />
              <InfoBox label="Çizim (Pastal) Eni" value={order.marker_width ? `${order.marker_width} CM` : '---'} />
            </div>
            <div className="col-span-4 border border-slate-200 rounded-xl flex items-center justify-center p-2 min-h-40 bg-slate-50/50">
              {order.model_image ? (
                <img src={order.model_image} alt="Model" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-slate-300 text-[10px] font-bold text-center uppercase">Model Resmi<br/>Yok</div>
              )}
            </div>
          </div>

          {/* Kumaş Tablosu */}
          <div className="py-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3 flex items-center gap-2">
              <Ruler size={14} /> Hammadde ve Kumaş Detayları
            </h3>
            <table className="w-full border-collapse border border-slate-200 text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 border border-slate-200 font-bold">Kumaş Cinsi</th>
                  <th className="p-2 border border-slate-200 font-bold">Renk / İçerik</th>
                  <th className="p-2 border border-slate-200 font-bold text-right">Birim Gider</th>
                </tr>
              </thead>
              <tbody>
                {fabrics.map((f, i) => (
                  <tr key={i}>
                    <td className="p-2 border border-slate-200 font-medium uppercase">{f.kind}</td>
                    <td className="p-2 border border-slate-200 uppercase">{f.color || order.color} {f.content && `- ${f.content}`}</td>
                    <td className="p-2 border border-slate-200 text-right font-bold">{f.perPieceKg} {f.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BEDEN TABLOSU (EŞİT SÜTUNLU) */}
          <div className="py-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3 flex items-center gap-2">
              <Calculator size={14} /> Beden ve Kesim Dağılımı
            </h3>
            <table className="w-full border-collapse border-2 border-slate-900 text-center table-fixed">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-2 border border-slate-300 font-bold text-[10px] w-24">AŞAMALAR</th>
                  {sortedSizes.map(s => <th key={s} className="p-2 border border-slate-300 font-bold text-sm">{s}</th>)}
                  <th className="p-2 border-l-2 border-slate-900 font-bold text-sm bg-slate-200 w-24">TOPLAM</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Satır: Sipariş Adetleri */}
                <tr>
                  <td className="p-2 border border-slate-300 text-[10px] font-bold bg-slate-50">SİPARİŞ</td>
                  {sortedSizes.map(s => <td key={s} className="p-3 border border-slate-300 text-sm font-medium">{order.qty_by_size[s]}</td>)}
                  <td className="p-3 border-l-2 border-slate-900 text-sm font-bold bg-slate-50">{totalSiparis}</td>
                </tr>
                {/* 2. Satır: Planlanan (+Fazlalık) */}
                <tr className="bg-blue-50/30">
                  <td className="p-2 border border-slate-300 text-[10px] font-black text-blue-700">PLANLANAN (+%{extraPercent})</td>
                  {sortedSizes.map(s => <td key={s} className="p-3 border border-slate-300 text-sm font-black text-blue-700 italic">
                    {Math.ceil(order.qty_by_size[s] * extraFactor)}
                  </td>)}
                  <td className="p-3 border-l-2 border-slate-900 text-sm font-black bg-blue-100 text-blue-700">{totalPlanlanan}</td>
                </tr>
                {/* 3. Satır: Gerçek Kesilen (BOŞ) */}
                <tr className="h-16">
                  <td className="p-2 border border-slate-300 text-[10px] font-black bg-slate-50">GERÇEK KESİM</td>
                  {sortedSizes.map(s => <td key={s} className="p-3 border border-slate-300 bg-white"></td>)}
                  <td className="p-3 border-l-2 border-slate-900 bg-slate-50"></td>
                </tr>
              </tbody>
            </table>
            <p className="text-[8px] text-slate-400 mt-2 italic">* Operatör Notu: Lütfen kesim sonrası masadan çıkan gerçek adetleri en alt satıra el yazısı ile işleyiniz.</p>
          </div>
        </div>

        {/* ALT KISIM (SAYFA SONUNA SABİTLENMİŞ) */}
        <div className="mt-auto pt-8 border-t border-slate-200">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-8">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Info size={12} /> Kesim Sonrası İşlemler ve Önemli Notlar
              </span>
              <div className="border border-slate-200 p-5 rounded-2xl min-h-25 text-xs font-bold text-slate-700 italic bg-slate-50/30">
                {order.post_processes || 'Özel bir işlem talimatı bulunmamaktadır.'}
              </div>
            </div>
            <div className="col-span-4 flex flex-col justify-end">
              <div className="space-y-12">
                <div className="flex justify-between text-[9px] font-bold text-slate-300">
                  <span>KESİM ŞEFİ</span>
                  <span>____ / ____ / 2026</span>
                </div>
                <div className="border-t-2 border-slate-900 pt-2 text-center">
                  <span className="text-[10px] font-black text-slate-900 uppercase">İMZA / ONAY</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.5em]">Navy Blue Production</p>
          </div>
        </div>

      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div>
      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</div>
      <div className="text-sm font-black text-slate-900 uppercase leading-none mt-1">{value || '---'}</div>
    </div>
  );
}