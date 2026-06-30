import React, { useEffect, useState } from 'react';
import { Archive, Hash, RotateCcw, Search } from 'lucide-react';
import { supabase } from '../api/orderService';

const NAVY = '#1e3a5f';

export default function ArchivedOrders() {
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadArchived = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('is_archived', true)
      .order('updated_at', { ascending: false });
    setArchived(data || []);
    setLoading(false);
  };

  useEffect(() => { loadArchived(); }, []);

  const handleRestore = async (id) => {
    if (window.confirm("Bu siparişi tekrar üretim akışına geri almak istiyor musunuz?")) {
      await supabase.from('orders').update({ is_archived: false, status: 'active' }).eq('id', id);
      loadArchived();
    }
  };

  const filtered = archived.filter(o =>
    o.article?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.order_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 pb-32">
      <div className="flex items-center justify-between pt-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Geçmiş Sevkiyatlar</p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none mt-1">Sipariş Arşivi</h1>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200">
          <Archive size={18} />
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text" placeholder="Arşivde ara..."
            className="w-full pl-11 pr-4 py-3 bg-transparent rounded-xl outline-none text-[12px] font-medium"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-20 text-slate-300 font-black animate-pulse uppercase tracking-[0.3em]">Yükleniyor...</div>
        ) : (
          filtered.map(order => {
            const totalPlanned = Object.values(order.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
            const totalShipped = Object.values(order.shipped_qty || {}).reduce((a, b) => a + Number(b || 0), 0);

            return (
              <div key={order.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-90 hover:opacity-100 transition-all">
                <div className="flex items-center gap-4 flex-1 w-full">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0 overflow-hidden border border-slate-100">
                    {order.model_image ? <img src={order.model_image} className="w-full h-full object-cover rounded-xl" /> : <Hash size={18} />}
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between flex-1 gap-4">
                    <div>
                      <div className="font-black text-slate-900 uppercase tracking-tighter text-base">{order.article}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{order.order_no} / {order.customer}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="border border-slate-100 px-4 py-2 rounded-xl text-center min-w-24">
                        <span className="block text-[7px] font-black text-slate-400 uppercase tracking-widest">SİPARİŞ (PLAN)</span>
                        <span className="text-sm font-black text-slate-700">{totalPlanned.toLocaleString()} <span className="text-[9px] font-bold text-slate-400">Pcs</span></span>
                      </div>
                      <div className="border border-slate-100 px-4 py-2 rounded-xl text-center min-w-24">
                        <span className="block text-[7px] font-black text-slate-400 uppercase tracking-widest">YÜKLENEN (SEVK)</span>
                        <span className="text-sm font-black" style={{ color: NAVY }}>{totalShipped.toLocaleString()} <span className="text-[9px] font-bold text-slate-400">Pcs</span></span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(order.id)}
                  className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity w-full md:w-auto justify-center shrink-0"
                  style={{ background: NAVY }}
                >
                  <RotateCcw size={14} /> Geri Yükle
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}