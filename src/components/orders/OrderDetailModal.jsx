import React, { useMemo } from 'react';
import { X, Printer, Calculator, Scissors, CheckCircle } from 'lucide-react';
import FabricRequirement from './FabricRequirement';
import { SIZE_ORDER } from '../../constants/sizes';

export default function OrderDetailModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  const getDisplayLabel = (s) => {
    const prefixes = ['B', 'K', 'S', 'Y', 'U', 'N'];
    return prefixes.includes(s.charAt(0)) && s.length > 1 ? s.substring(1) : s;
  };

  const totals = useMemo(() => {
    const orderQty = Object.values(order.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
    const cutQty = Object.values(order.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
    const diffQty = cutQty - orderQty;
    return { orderQty, cutQty, diffQty };
  }, [order]);

  const sortedSizes = useMemo(() => {
    const allSizes = new Set([
      ...Object.keys(order.qty_by_size || {}),
      ...Object.keys(order.cutting_qty || {})
    ]);
    return Array.from(allSizes).sort((a, b) => {
      const indexA = SIZE_ORDER.indexOf(a);
      const indexB = SIZE_ORDER.indexOf(b);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }, [order]);

  const mainFabric = order.fabrics?.main;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{order.order_no}</h2>
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">{order.customer}</span>
            </div>
            <p className="text-sm text-slate-400 font-medium mt-1 uppercase italic">{order.article} - {order.model} / {order.color}</p>
          </div>
          <div className="flex gap-2">
            <button className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 border border-transparent hover:border-slate-200">
              <Printer size={20} />
            </button>
            <button onClick={onClose} className="p-3 bg-white shadow-sm rounded-2xl text-slate-400 hover:text-red-500 transition-all border border-slate-100">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">

          {/* 1. Genel Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-4xl flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                <Calculator size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş Toplamı</p>
                <p className="text-3xl font-black text-slate-900 leading-none mt-1">{totals.orderQty} <span className="text-sm text-slate-400">Pcs</span></p>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-4xl flex items-center gap-6">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                <Scissors size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Kesim Toplamı</p>
                <p className="text-3xl font-black text-emerald-900 leading-none mt-1">{totals.cutQty} <span className="text-sm text-slate-400">Pcs</span></p>
              </div>
            </div>
          </div>

          {/* 2. Ana Kumaş Bilgisi */}
          {mainFabric && (
            <div className="bg-white border border-slate-100 rounded-4xl p-6 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ana Kumaş</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Cinsi',   value: mainFabric.kind },
                  { label: 'Renk',    value: mainFabric.color },
                  { label: 'İçerik',  value: mainFabric.content },
                  { label: 'GSM',     value: mainFabric.gsm ? `${mainFabric.gsm} gr` : null },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} className="bg-slate-50 rounded-2xl px-4 py-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</p>
                    <p className="text-sm font-black text-slate-800">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Kumaş İhtiyaç Analizi */}
          <FabricRequirement order={order} />

          {/* 4. Beden Dağılım Matrisi */}
          <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 bg-slate-950 flex items-center gap-3">
              <CheckCircle className="text-blue-400" size={18} />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Beden Dağılım Matrisi</h3>
            </div>
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-center text-xs border-collapse min-w-180">
                <thead>
                  <tr className="bg-slate-800/40 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase">
                    <th className="py-4 px-6 text-left font-black bg-slate-900 sticky left-0 z-10 w-28 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] text-[10px]">AŞAMA</th>
                    {sortedSizes.map(size => (
                      <th key={size} className="py-4 px-3 min-w-16 border-l border-slate-800/60 font-black text-slate-200">
                        {getDisplayLabel(size)}
                      </th>
                    ))}
                    <th className="py-4 px-6 text-right font-black bg-slate-950 text-blue-400 min-w-24">TOPLAM</th>
                  </tr>
                </thead>
                <tbody className="font-bold text-white">
                  <tr className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-6 text-left font-black text-blue-400 bg-slate-900/90 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] text-[10px]">SİPARİŞ</td>
                    {sortedSizes.map(size => (
                      <td key={size} className="py-3 px-3 border-l border-slate-800/30 text-slate-300 font-bold">
                        {order.qty_by_size?.[size] || 0}
                      </td>
                    ))}
                    <td className="py-3 px-6 text-right font-black text-blue-400 bg-slate-950/40">{totals.orderQty}</td>
                  </tr>
                  <tr className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-6 text-left font-black text-emerald-400 bg-slate-900/90 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] text-[10px]">KESİLEN</td>
                    {sortedSizes.map(size => (
                      <td key={size} className="py-3 px-3 border-l border-slate-800/30 text-emerald-400 font-black">
                        {order.cutting_qty?.[size] || 0}
                      </td>
                    ))}
                    <td className="py-3 px-6 text-right font-black text-emerald-400 bg-slate-950/40">{totals.cutQty}</td>
                  </tr>
                  <tr className="bg-slate-950/20 hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-6 text-left font-black text-slate-400 bg-slate-900/90 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] text-[10px]">FARK / FİRE</td>
                    {sortedSizes.map(size => {
                      const sQty = Number(order.qty_by_size?.[size] || 0);
                      const cQty = Number(order.cutting_qty?.[size] || 0);
                      const diff = cQty - sQty;
                      return (
                        <td key={size} className={`py-3 px-3 border-l border-slate-800/30 font-black text-[11px] ${diff === 0 ? 'text-slate-500' : diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                      );
                    })}
                    <td className={`py-3 px-6 text-right font-black text-[11px] bg-slate-950/60 ${totals.diffQty === 0 ? 'text-slate-400' : totals.diffQty > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {totals.diffQty > 0 ? `+${totals.diffQty}` : totals.diffQty}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}