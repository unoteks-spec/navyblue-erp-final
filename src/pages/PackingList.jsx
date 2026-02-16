import React, { useState, useEffect, useMemo } from 'react';
import { Printer, Plus, Trash2, Info, Scale, Building2, BoxSelect } from 'lucide-react';
import { supabase } from '../api/orderService';

export default function PackingList() {
  const [orders, setOrders] = useState([]);
  const [unitWeights, setUnitWeights] = useState({}); // { orderId: { size: weight } }
  const [boxTare, setBoxTare] = useState(0.5); 
  const [activeRefOrderId, setActiveRefOrderId] = useState(''); 
  const [boxes, setBoxes] = useState([
    { id: Date.now(), orderId: '', range: '1-1', size: '', qtyPerBox: '', net: '', gross: '', dimensions: '60x40x40' }
  ]);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .is('is_archived', false)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });
      setOrders(data || []);
    };
    fetchOrders();
  }, []);

  // 🛠️ OTOMATİK AĞIRLIK HESAPLAMA
  useEffect(() => {
    const updatedBoxes = boxes.map(box => {
      const orderWeights = unitWeights[box.orderId];
      const unitWeight = orderWeights ? (orderWeights[box.size.toUpperCase()] || 0) : 0;
      
      if (unitWeight > 0 && box.qtyPerBox > 0) {
        const netWeight = (Number(box.qtyPerBox) * Number(unitWeight)).toFixed(2);
        const grossWeight = (Number(netWeight) + Number(boxTare)).toFixed(2);
        
        if (box.net !== netWeight || box.gross !== grossWeight) {
          return { ...box, net: netWeight, gross: grossWeight };
        }
      }
      return box;
    });

    if (JSON.stringify(updatedBoxes) !== JSON.stringify(boxes)) {
      setBoxes(updatedBoxes);
    }
  }, [unitWeights, boxTare, boxes]);

  const addRow = () => setBoxes([...boxes, { id: Date.now(), orderId: '', range: '', size: '', qtyPerBox: '', net: '', gross: '', dimensions: '60x40x40' }]);
  const removeRow = (id) => setBoxes(boxes.filter(b => b.id !== id));
  const updateRow = (id, field, value) => setBoxes(boxes.map(b => b.id === id ? { ...b, [field]: value } : b));

  const updateUnitWeight = (size, weight) => {
    if (!activeRefOrderId) return;
    setUnitWeights(prev => ({
      ...prev,
      [activeRefOrderId]: { ...prev[activeRefOrderId], [size.toUpperCase()]: weight }
    }));
  };

  const totals = useMemo(() => boxes.reduce((acc, b) => {
    const rangeParts = b.range.split('-').map(Number);
    const boxCount = rangeParts.length === 2 ? (rangeParts[1] - rangeParts[0] + 1) : 1;
    const vCount = isNaN(boxCount) || boxCount <= 0 ? 0 : boxCount;
    return { 
      totalQty: acc.totalQty + (Number(b.qtyPerBox) * vCount), 
      totalNet: acc.totalNet + (Number(b.net) * vCount), 
      totalGross: acc.totalGross + (Number(b.gross) * vCount),
      totalBoxes: acc.totalBoxes + vCount 
    };
  }, { totalQty: 0, totalNet: 0, totalGross: 0, totalBoxes: 0 }), [boxes]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32 print:p-0">
      
      {/* EXPORTER HEADER */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between gap-6 print:shadow-none print:border-none">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-blue-600">
            <Building2 size={24} />
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">PACKING LIST</h1>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Exporter</span>
            <p className="font-black text-slate-900 text-sm italic">ALFA SPOR GİYİM SAN. TİC. LTD. ŞTİ.</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Izmir, Turkey</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
           <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-blue-600 transition-all shadow-xl print:hidden">
            <Printer size={18} className="inline mr-2" /> Print PDF
          </button>
          <div className="text-right">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Shipment Date</span>
            <span className="text-sm font-black text-slate-900">{new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>
      </div>

      {/* WEIGHT REFERENCE SECTION (Mavi Alan) */}
      <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl print:hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Scale size={20} />
            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Unit Weight Reference (KG)</h2>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black uppercase opacity-60">Box Tare (Empty Box KG)</span>
            <input type="number" step="0.01" className="w-20 bg-white/20 border-none rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white/30" 
              value={boxTare} onChange={(e) => setBoxTare(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="md:col-span-1 space-y-2">
            <label className="text-[9px] font-black uppercase opacity-60">1. Select Model</label>
            <select 
              className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-bold outline-none cursor-pointer hover:bg-white/20"
              value={activeRefOrderId}
              onChange={(e) => setActiveRefOrderId(e.target.value)}
            >
              <option value="" className="text-slate-900">Select Model to Define Weights...</option>
              {orders.map(o => <option key={o.id} value={o.id} className="text-slate-900">{o.article} - {o.model}</option>)}
            </select>
          </div>

          <div className="md:col-span-3">
             <div className="flex flex-wrap gap-3">
                {['S', 'M', 'L', 'XL', '2XL', '3XL'].map(sz => (
                  <div key={sz} className="flex-1 min-w-17.5 space-y-1">
                    <span className="text-[8px] font-black uppercase opacity-60 block text-center">{sz}</span>
                    <input 
                      type="number" step="0.001" placeholder="0.000" 
                      disabled={!activeRefOrderId}
                      className={`w-full bg-white text-slate-900 rounded-xl p-3 text-xs font-black text-center outline-none transition-all ${!activeRefOrderId ? 'opacity-30' : 'focus:ring-4 focus:ring-blue-400'}`}
                      value={unitWeights[activeRefOrderId]?.[sz] || ''}
                      onChange={(e) => updateUnitWeight(sz, e.target.value)}
                    />
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* MAIN PACKING TABLE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th className="py-5 px-6">Model / Article</th>
              <th className="py-5 px-4">Color</th>
              <th className="py-5 px-4 text-center">Box No</th>
              <th className="py-5 px-4 text-center">Dimensions (cm)</th> {/* 🛠️ EBAT ALANI EKLENDİ */}
              <th className="py-5 px-4 text-center">Size</th>
              <th className="py-5 px-4 text-center">Qty / Box</th>
              <th className="py-5 px-4 text-center text-blue-600">Net (KG)</th>
              <th className="py-5 px-4 text-center text-blue-600">Gross (KG)</th>
              <th className="py-5 px-6 text-right print:hidden"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold text-xs">
            {boxes.map((box) => {
              const currentOrder = orders.find(o => o.id === box.orderId);
              return (
                <tr key={box.id} className="group hover:bg-slate-50 transition-all">
                  <td className="py-4 px-6">
                    <select value={box.orderId} onChange={(e) => updateRow(box.id, 'orderId', e.target.value)}
                      className="w-full p-2 bg-slate-100/50 border-none rounded-xl text-[10px] font-black outline-none focus:ring-2 focus:ring-blue-100">
                      <option value="">Choose...</option>
                      {orders.map(o => <option key={o.id} value={o.id}>{o.article} - {o.model}</option>)}
                    </select>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase">
                      {currentOrder?.color || '-'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <input type="text" placeholder="1-10" value={box.range} onChange={(e) => updateRow(box.id, 'range', e.target.value)}
                      className="w-16 mx-auto block bg-slate-100/50 border-none rounded-xl px-2 py-2 text-[11px] font-black text-center outline-none" />
                  </td>
                  <td className="py-4 px-4 text-center"> {/* 🛠️ EBAT INPUT ALANI */}
                    <input type="text" placeholder="60x40x40" value={box.dimensions} onChange={(e) => updateRow(box.id, 'dimensions', e.target.value)}
                      className="w-24 mx-auto block bg-slate-100/50 border-none rounded-xl px-2 py-2 text-[10px] font-black text-center outline-none" />
                  </td>
                  <td className="py-4 px-4 text-center uppercase">
                    <input type="text" placeholder="M" value={box.size} onChange={(e) => updateRow(box.id, 'size', e.target.value.toUpperCase())}
                      className="w-12 mx-auto block bg-slate-100/50 border-none rounded-xl px-2 py-2 text-[11px] font-black text-center outline-none" />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <input type="number" value={box.qtyPerBox} onChange={(e) => updateRow(box.id, 'qtyPerBox', e.target.value)}
                      className="w-16 mx-auto block bg-slate-100/50 border-none rounded-xl px-2 py-2 text-[11px] font-black text-center outline-none" />
                  </td>
                  <td className="py-4 px-4 text-center text-slate-600">
                    {box.net || '0.00'}
                  </td>
                  <td className="py-4 px-4 text-center text-slate-900 font-black">
                    {box.gross || '0.00'}
                  </td>
                  <td className="py-4 px-6 text-right print:hidden">
                    <button onClick={() => removeRow(box.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-900 text-white">
            <tr className="font-black text-[10px] uppercase">
              <td className="py-6 px-6" colSpan="2">TOTAL SHIPMENT</td>
              <td className="py-6 px-4 text-center">{totals.totalBoxes} BOXES</td>
              <td className="py-6 px-4 text-center">-</td>
              <td className="py-6 px-4 text-center">-</td>
              <td className="py-6 px-4 text-center">{totals.totalQty} PCS</td>
              <td className="py-6 px-4 text-center">{totals.totalNet.toFixed(2)} KG</td>
              <td className="py-6 px-4 text-center">{totals.totalGross.toFixed(2)} KG</td>
              <td className="print:hidden"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col items-center gap-4 print:hidden">
        <button onClick={addRow} className="flex items-center gap-2 bg-slate-900 text-white px-12 py-4 rounded-4xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">
          <Plus size={16} /> Add Packing Row
        </button>
      </div>

    </div>
  );
}