import React, { useState, useMemo, useEffect } from 'react';
import { X, Truck, Package, User, FileText, CheckCircle2, Trash2, History, Hash, Info } from 'lucide-react';
import { supabase, deleteFabricDelivery } from '../../api/orderService';

export default function FabricIntakeModal({ order, allOrders, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeBatches, setActiveBatches] = useState([]); // 🚀 Aktif tedarik partileri
  const [formData, setFormData] = useState({
    fabric_kind: '',
    batch_no: '', // 🚀 Hangi partiye ait olduğu
    amount_received: '',
    roll_count: '',
    receiver_name: '',
    supplier_note: ''
  });

  // --- 🔄 VERİLERİ YÜKLE ---
  const loadData = async () => {
    try {
      // 1. Giriş Geçmişini Yükle
      const { data: historyData } = await supabase
        .from('fabric_deliveries')
        .select('*')
        .eq('order_no', order.order_no)
        .order('created_at', { ascending: false });
      
      setHistory(historyData || []);

      // 2. Bu siparişe ait Kumaş Tedarik Partilerini (Batches) Yükle
      const { data: batchesData } = await supabase
        .from('fabric_procurements')
        .select('*')
        .eq('order_no', order.order_no)
        .order('created_at', { ascending: false });

      setActiveBatches(batchesData || []);
    } catch (err) {
      console.error("Yükleme hatası:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [order.order_no]);

  // --- 🗑 FİŞ SİLME ---
  const handleDeleteEntry = async (id) => {
    if (!window.confirm("Bu kumaş giriş kaydını silmek istediğinize emin misiniz?")) return;
    try {
      await deleteFabricDelivery(id);
      await loadData();
      onSuccess();
    } catch (err) {
      alert("Silme işlemi başarısız oldu.");
    }
  };

  const availableFabrics = order?.fabrics ? Object.values(order.fabrics).filter(f => f.kind) : [];

  // 🛠️ ZEKİ HEDEF HESAPLAMA: Seçilen Batch'e göre hedefi belirle
  const targetInfo = useMemo(() => {
    if (!formData.fabric_kind || !formData.batch_no) return null;

    // Seçilen partideki (batch) bu kumaşın planlanan miktarını bul
    const currentBatchFabric = activeBatches.find(b => 
      b.batch_no === formData.batch_no && 
      b.fabric_kind === formData.fabric_kind
    );

    if (currentBatchFabric) {
      return { 
        total: currentBatchFabric.planned_amount, 
        unit: currentBatchFabric.unit || 'kg' 
      };
    }
    return null;
  }, [formData.fabric_kind, formData.batch_no, activeBatches]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedFabric = availableFabrics.find(f => f.kind === formData.fabric_kind);
    if (!selectedFabric) return alert("Lütfen kumaş seçin");
    if (!formData.batch_no) return alert("Lütfen tedarik partisini (Batch) seçin");

    setLoading(true);
    try {
      const { error } = await supabase
        .from('fabric_deliveries')
        .insert([{
          order_no: order.order_no,
          batch_no: formData.batch_no, // 🚀 Girişi partiye bağla
          fabric_kind: formData.fabric_kind,
          amount_received: Number(formData.amount_received),
          roll_count: Number(formData.roll_count) || 0,
          receiver_name: formData.receiver_name,
          supplier_note: formData.supplier_note,
          color: selectedFabric.color || '',
          unit: selectedFabric.unit || 'kg'
        }]);

      if (error) throw error;
      
      setFormData({ ...formData, amount_received: '', roll_count: '' }); 
      await loadData();
      onSuccess();
    } catch (error) {
      alert("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-slate-900 p-6 text-white shrink-0">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-all"><X size={24} /></button>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"><Truck size={20} /></div>
            <div>
              <h2 className="text-lg font-black tracking-tighter uppercase italic">Kumaş Giriş ve Takip</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.order_no} — PARTİ BAZLI TAKİP</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-8 pt-6 space-y-8 custom-scrollbar">
          {/* FORM ALANI */}
          <form onSubmit={handleSubmit} className="space-y-5 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* PARTİ SEÇİMİ (KRİTİK ALAN) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-blue-600 uppercase ml-1 flex items-center gap-1">
                  <Hash size={10}/> Tedarik Partisi (Batch)
                </label>
                <select required className="w-full h-11 px-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                  value={formData.batch_no} onChange={(e) => setFormData({...formData, batch_no: e.target.value})}>
                  <option value="">Parti Seçin...</option>
                  {[...new Set(activeBatches.map(b => b.batch_no))].map((bNo) => (
                    <option key={bNo} value={bNo}>{bNo}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Kumaş Cinsi</label>
                <select required className="w-full h-11 px-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                  value={formData.fabric_kind} onChange={(e) => setFormData({...formData, fabric_kind: e.target.value})}>
                  <option value="">Kumaş Seçin...</option>
                  {availableFabrics.map((f, i) => <option key={i} value={f.kind}>{f.kind} ({f.color})</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Gelen Miktar</label>
                  {targetInfo && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-tighter">Parti Hedefi: {targetInfo.total} {targetInfo.unit}</span>}
                </div>
                <input type="number" step="0.01" required className="w-full px-4 h-11 bg-white border border-slate-200 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500/20"
                  value={formData.amount_received} onChange={(e) => setFormData({...formData, amount_received: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Top Sayısı</label>
                <input type="number" className="w-full px-4 h-11 bg-white border border-slate-200 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500/20"
                  value={formData.roll_count} onChange={(e) => setFormData({...formData, roll_count: e.target.value})} />
              </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Teslim Alan</label>
                <input type="text" className="w-full px-4 h-11 bg-white border border-slate-200 rounded-2xl outline-none font-bold capitalize focus:ring-2 focus:ring-blue-500/20"
                  value={formData.receiver_name} onChange={(e) => setFormData({...formData, receiver_name: e.target.value})} />
            </div>

            <button type="submit" disabled={loading || !formData.batch_no} className="w-full bg-slate-900 text-white h-12 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-600 transition-all disabled:opacity-50">
              {loading ? "Kaydediliyor..." : "Parti Girişini Onayla"}
            </button>
          </form>

          {/* GEÇMİŞ LİSTESİ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <History size={16} className="text-slate-400" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Parti Bazlı Giriş Geçmişi</h3>
              </div>
            </div>
            
            <div className="space-y-2">
              {history.length > 0 ? history.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 group hover:border-blue-100 transition-all shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600 shadow-inner font-black text-[10px]">
                      {item.roll_count || 0}T
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 uppercase">{item.fabric_kind}</span>
                        <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">{item.batch_no}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                        {item.amount_received} {item.unit} — {new Date(item.created_at).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-[9px] font-black text-slate-500 uppercase">{item.receiver_name || '—'}</div>
                    </div>
                    <button onClick={() => handleDeleteEntry(item.id)} className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-300 italic text-[10px] uppercase tracking-widest">Henüz giriş kaydı bulunmuyor.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}