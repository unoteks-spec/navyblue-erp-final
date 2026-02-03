import React, { useEffect, useState } from 'react';
import { getFabricsByOrderNo, supabase } from '../../api/orderService';
import { Printer, MessageCircle, X, CheckCircle, RotateCcw } from 'lucide-react';

export default function FabricOrderPrint({ order, onClose, onSuccess }) {
  const [summary, setSummary] = useState([]);
  const [updating, setUpdating] = useState(false);
  
  // order objesi içindeki order_no'yu kullanıyoruz
  const orderNo = order?.order_no;

  useEffect(() => {
    if (orderNo) {
      getFabricsByOrderNo(orderNo).then(data => {
        const sortedData = [...data].sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));
        setSummary(sortedData);
      });
    }
  }, [orderNo]);

  // ✅ SİPARİŞ DURUMUNU GÜNCELLEME (SUPABASE)
  const handleToggleOrdered = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ fabric_ordered: !order.fabric_ordered })
        .eq('id', order.id);
      
      if (error) throw error;
      
      // Ana listeyi yenilemesi için callback çağırıyoruz
      if (onSuccess) onSuccess();
    } catch (e) {
      alert("Hata: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const sendToWhatsApp = (type) => {
    const filtered = summary.filter(f => f.type === type);
    if (filtered.length === 0) return alert(`${type} kumaş bulunamadı!`);

    let message = `*NAVY BLUE - Kumaş Tedarik Listesi (${type.toUpperCase()})*\n`;
    message += `*Sipariş No:* ${orderNo}\n`;
    message += `----------------------------\n`;
    
    filtered.forEach(f => {
      const amount = Number(f.totalAmount || 0).toFixed(2);
      message += `• *${amount} ${f.unit.toUpperCase()}* - ${f.kind} (${f.color})\n`;
      if (f.content) message += `  _İçerik: ${f.content}_\n`;
    });

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-60 bg-white overflow-y-auto p-8 print:p-0">
      {/* Yazdırma Öncesi Kontrol Barı */}
      <div className="max-w-4xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center no-print bg-slate-50 p-6 rounded-4xl border border-slate-200 gap-4 shadow-sm">
        <div className="flex gap-2">
          <button onClick={() => sendToWhatsApp('Örme')} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-700 transition-all">
            <MessageCircle size={16} /> Örme
          </button>
          <button onClick={() => sendToWhatsApp('Dokuma')} className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-orange-600 transition-all">
            <MessageCircle size={16} /> Dokuma
          </button>
        </div>

        {/* ✅ SİPARİŞ VERİLDİ İŞARETLEME ALANI */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Sipariş Durumu:</span>
          <button 
            onClick={handleToggleOrdered}
            disabled={updating}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-black text-[10px] uppercase transition-all ${
              order.fabric_ordered 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
            }`}
          >
            {updating ? '...' : (order.fabric_ordered ? <CheckCircle size={14} /> : <RotateCcw size={14} />)}
            {order.fabric_ordered ? 'Sipariş Verildi' : 'Verildi Olarak İşaretle'}
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-xl font-black text-sm shadow-lg hover:bg-blue-600 transition-all">
            <Printer size={18} /> Yazdır / PDF
          </button>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-all">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* A4 GÖRÜNÜMÜ */}
      <div className="max-w-4xl mx-auto border border-slate-100 p-12 rounded-4xl shadow-2xl bg-white print:border-none print:shadow-none print:p-0">
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">NAVY BLUE</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Fabric Purchase Order</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-slate-900 uppercase">Sipariş: {orderNo}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">{new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="py-4">Tip</th>
              <th className="py-4">Kumaş Cinsi / İçerik</th>
              <th className="py-4">Renk</th>
              <th className="py-4 text-right">Miktar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summary.map((fabric, idx) => (
              <tr key={idx} className={`${fabric.isMain ? 'bg-blue-50/30' : ''}`}>
                <td className="py-4">
                   <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${fabric.type === 'Örme' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                    {fabric.type}
                   </span>
                </td>
                <td className="py-4">
                  <div className="font-black text-slate-800 uppercase text-sm">
                    {fabric.isMain && <span className="text-blue-600 mr-1">[ANA]</span>}
                    {fabric.kind}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">{fabric.content}</div>
                </td>
                <td className="py-4">
                  <span className="text-xs font-bold text-slate-600 uppercase">{fabric.color}</span>
                </td>
                <td className="py-4 text-right">
                  <div className="text-lg font-black text-slate-900">
                    {Number(fabric.totalAmount || 0).toFixed(2)} 
                    <span className="text-[10px] ml-1 text-slate-400 uppercase">{fabric.unit}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-20 pt-8 border-t border-slate-100 grid grid-cols-2 gap-10">
          <p className="text-xs text-slate-500 italic">
            * Bu miktar %5 kesim fazlalığı eklenerek hesaplanmıştır.<br/>
            * Lütfen termin onayı veriniz.
          </p>
          <div className="text-right flex flex-col items-end">
            <div className="w-32 h-px bg-slate-200 mb-2"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Navy Blue Operasyon Onayı</p>
          </div>
        </div>
      </div>
    </div>
  );
}