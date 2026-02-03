import React, { useState, useMemo, useEffect } from 'react';
import { X, Truck, Package, User, FileText, CheckCircle2, Trash2, History } from 'lucide-react';
import { supabase, deleteFabricDelivery } from '../../api/orderService';

export default function FabricIntakeModal({ order, allOrders, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]); // 👈 Giriş geçmişini tutacak state
  const [formData, setFormData] = useState({
    fabric_kind: '',
    amount_received: '',
    roll_count: '',
    receiver_name: '',
    supplier_note: ''
  });

  // --- 🔄 GEÇMİŞİ YÜKLE ---
  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('fabric_deliveries')
        .select('*')
        .eq('order_no', order.order_no)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Geçmiş yüklenemedi:", err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [order.order_no]);

  // --- 🗑 FİŞ SİLME ---
  const handleDeleteEntry = async (id) => {
    if (!window.confirm("Bu kumaş giriş kaydını silmek istediğinize emin misiniz?")) return;
    try {
      await deleteFabricDelivery(id);
      await loadHistory(); // Modal içindeki listeyi tazele
      onSuccess(); // Ana listedeki (OrderList) ilerleme çubuklarını tazele
    } catch (err) {
      alert("Silme işlemi başarısız oldu.");
    }
  };

  const availableFabrics = order?.fabrics ? Object.values(order.fabrics).filter(f => f.kind) : [];

  const targetAmount = useMemo(() => {
    if (!formData.fabric_kind || !order || !allOrders) return null;
    const groupItems = allOrders.filter(o => o.order_no === order.order_no);
    let totalNeededForGroup = 0;
    let unit = 'kg';

    groupItems.forEach(item => {
      const fabric = Object.values(item.fabrics || {}).find(f => f.kind === formData.fabric_kind);
      if (fabric) {
        const qty = Object.values(item.qty_by_size || {}).reduce((a, b) => a + (Number(b) || 0), 0);
        const extra = 1 + (Number(item.extra_percent || 5) / 100);
        totalNeededForGroup += (Math.ceil(qty * extra) * Number(fabric.perPieceKg || 0));
        unit = fabric.unit || 'kg';
      }
    });

    return { total: totalNeededForGroup.toFixed(2), unit: unit };
  }, [formData.fabric_kind, order, allOrders]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedFabric = availableFabrics.find(f => f.kind === formData.fabric_kind);
    if (!selectedFabric) return alert("Lütfen kumaş seçin");

    setLoading(true);
    try {
      const { error } = await supabase
        .from('fabric_deliveries')
        .insert([{
          order_no: order.order_no,
          fabric_kind: formData.fabric_kind,
          amount_received: Number(formData.amount_received),
          roll_count: Number(formData.roll_count) || 0,
          receiver_name: formData.receiver_name,
          supplier_note: formData.supplier_note,
          color: selectedFabric.color || '',
          unit: selectedFabric.unit || 'kg'
        }]);

      if (error) throw error;
      
      setFormData({ ...formData, amount_received: '', roll_count: '' }); // Formu kısmen sıfırla
      await loadHistory(); // Listeyi güncelle
      onSuccess(); // Ana sayfayı güncelle
    } catch (error) {
      alert("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <style>{`.no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }`}</style>
      
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-slate-900 p-6 text-white shrink-0">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-all"><X size={24} /></button>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"><Truck size={20} /></div>
            <div>
              <h2 className="text-lg font-black tracking-tighter uppercase italic">Kumaş Giriş ve Takip</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{order.order_no}</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-8 pt-6 space-y-8 custom-scrollbar">
          {/* FORM ALANI */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Kumaş Cinsi</label>
                <select required className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm"
                  value={formData.fabric_kind} onChange={(e) => setFormData({...formData, fabric_kind: e.target.value})}>
                  <option value="">Seçiniz...</option>
                  {availableFabrics.map((f, i) => <option key={i} value={f.kind}>{f.kind} ({f.color})</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Miktar</label>
                  {targetAmount && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">GRUP HEDEF: {targetAmount.total}</span>}
                </div>
                <input type="number" step="0.01" required className="no-spinner w-full px-4 h-11 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
                  value={formData.amount_received} onChange={(e) => setFormData({...formData, amount_received: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Top Sayısı</label>
                <input type="number" className="no-spinner w-full px-4 h-11 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
                  value={formData.roll_count} onChange={(e) => setFormData({...formData, roll_count: e.target.value})} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Teslim Alan</label>
                <input type="text" className="w-full px-4 h-11 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold capitalize"
                  value={formData.receiver_name} onChange={(e) => setFormData({...formData, receiver_name: e.target.value})} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white h-12 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-600 transition-all">
              {loading ? "İşleniyor..." : "Yeni Girişi Kaydet"}
            </button>
          </form>

          {/* GEÇMİŞ LİSTESİ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <History size={16} className="text-slate-400" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Grup Giriş Geçmişi</h3>
            </div>
            
            <div className="space-y-2">
              {history.length > 0 ? history.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm font-black text-xs">
                      {item.roll_count || 0}T
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800 uppercase">{item.fabric_kind}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                        {item.amount_received} {item.unit} — {new Date(item.created_at).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-[9px] font-black text-slate-500 uppercase">{item.receiver_name || 'Belirtilmedi'}</div>
                      <div className="text-[8px] text-slate-300 font-bold">{item.supplier_note || '-'}</div>
                    </div>
                    <button 
                      onClick={() => handleDeleteEntry(item.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6 text-slate-300 italic text-[10px]">Henüz kumaş girişi yapılmamış.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}