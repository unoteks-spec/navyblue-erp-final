import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import FabricRequirement from './FabricRequirement';

export default function OrderDetailModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{order.order_no}</h2>
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">{order.customer}</span>
            </div>
            <p className="text-sm text-slate-400 font-medium mt-1">{order.article} - {order.model} / {order.color}</p>
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
        <div className="p-8 overflow-y-auto space-y-8">
          {/* 1. Kumaş İhtiyaç Analizi */}
          <FabricRequirement order={order} />

          {/* 2. Beden Dağılımı Özeti */}
          <div className="bg-slate-900 rounded-4xl p-6 text-white">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Beden Dağılım Adetleri</h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(order.qty_by_size || {}).map(([size, qty]) => (
                <div key={size} className="flex flex-col items-center min-w-12.5 border-r border-slate-800 last:border-0 pr-4">
                  <span className="text-[10px] font-bold text-blue-400">{size}</span>
                  <span className="text-lg font-black">{qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}