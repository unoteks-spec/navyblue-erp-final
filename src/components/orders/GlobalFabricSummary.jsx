import React, { useEffect, useState } from 'react';
import { getFabricsByOrderNo } from '../../api/orderService';
import { ShoppingCart, CheckCircle2 } from 'lucide-react';

export default function GlobalFabricSummary({ orderNo }) {
  const [summary, setSummary] = useState([]);

  useEffect(() => {
    if (orderNo) getFabricsByOrderNo(orderNo).then(setSummary);
  }, [orderNo]);

  return (
    <div className="bg-blue-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl shadow-blue-200">
      <div className="flex justify-between items-center border-b border-blue-800 pb-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="text-blue-400" size={24} />
          <h3 className="text-xl font-black tracking-tight">Kolektif Kumaş Siparişi</h3>
        </div>
        <span className="bg-blue-800 px-4 py-1 rounded-full text-[10px] font-bold uppercase">
          Grup No: {orderNo}
        </span>
      </div>

      <div className="grid gap-3">
        {summary.map((fabric, idx) => (
          <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center hover:bg-white/10 transition-all">
            <div>
              <div className="text-sm font-black tracking-tight">{fabric.kind}</div>
              <div className="text-[10px] text-blue-300 font-bold uppercase mt-0.5">
                {fabric.color} — {fabric.content}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-blue-400 leading-none">
                {fabric.totalKg.toFixed(1)} <span className="text-xs">KG</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}