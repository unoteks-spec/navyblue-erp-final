import React, { useEffect, useState } from 'react';
import { Archive, Hash, User, RotateCcw, Search, LayoutGrid } from 'lucide-react';
import { supabase } from '../api/orderService';

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
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-400 rounded-xl text-white shadow-lg"><Archive size={20} /></div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Sipariş Arşivi</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-1">Geçmiş Sevkiyatlar</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          type="text" placeholder="Arşivde ara..." 
          className="w-full pl-11 pr-4 py-2 bg-slate-50 rounded-xl outline-none text-[11px] font-bold"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {loading ? <div className="text-center py-20 text-slate-300 font-black animate-pulse uppercase tracking-[0.3em]">Yükleniyor...</div> : 
          filtered.map(order => (
            <div key={order.id} className="bg-white p-5 rounded-4xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-80 hover:opacity-100 transition-all">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                  {order.model_image ? <img src={order.model_image} className="w-full h-full object-cover rounded-xl" /> : <Hash size={18}/>}
                </div>
                <div>
                  <div className="font-black text-slate-900 uppercase tracking-tighter">{order.article}</div>
                  <div className="text-[9px] font-black text-blue-600 uppercase">{order.order_no} / {order.customer}</div>
                </div>
              </div>
              <button 
                onClick={() => handleRestore(order.id)}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
              >
                <RotateCcw size={14} /> Geri Yükle
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
}