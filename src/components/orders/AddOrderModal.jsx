import React, { useEffect, useState } from 'react';
import { Search, X, Hash, User } from 'lucide-react';
import { getRecentOrders } from '../../api/orderService';

const NAVY = '#1e3a5f';

export default function AddOrderModal({ isOpen, onClose, onSelect }) {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      getRecentOrders().then(setOrders).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = orders.filter(o => 
    o.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="p-6 text-white flex justify-between items-center" style={{ background: NAVY }}>
          <h2 className="text-sm font-black uppercase tracking-tight">Mevcut Siparişe Ekle</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Sipariş No veya Müşteri Ara..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Order List */}
        <div className="max-h-87.5 overflow-y-auto p-2">
          {filtered.map(order => (
            <button
              key={order.order_no}
              onClick={() => onSelect(order)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all group border border-transparent hover:border-slate-200 mb-1"
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 font-bold text-slate-700 transition-colors">
                  <Hash size={14} /> {order.order_no}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <User size={12} /> {order.customer}
                </div>
              </div>
              <div className="font-bold text-xs opacity-0 group-hover:opacity-100 transition-all" style={{ color: NAVY }}>
                SEÇ →
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}