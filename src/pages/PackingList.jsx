import React, { useState, useEffect, useMemo } from 'react';
import { Printer, Plus, Trash2, Info, Scale, Building2, User, FileSpreadsheet, Tag, Box } from 'lucide-react';
import { supabase } from '../api/orderService';
import * as XLSX from 'xlsx';

export default function PackingList() {
  const [orders, setOrders] = useState([]);
  const [consignee, setConsignee] = useState({ name: '', address: '' });
  const [unitWeights, setUnitWeights] = useState({});
  const [boxTare, setBoxTare] = useState(0.5); 
  const [defaultDims, setDefaultDims] = useState('60x40x40');
  const [activeRefOrderId, setActiveRefOrderId] = useState(''); 
  const [boxes, setBoxes] = useState([
    { id: Date.now(), orderId: '', range: '1-1', size: '', qtyPerBox: '', net: '', gross: '', dimensions: '60x40x40' }
  ]);

  const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', '36', '38', '40', '42', '44', '46', '48', '50', '52'];

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('*').is('is_archived', false).neq('status', 'archived').order('order_no', { ascending: false });
      setOrders(data || []);
    };
    fetchOrders();
  }, []);

  const activeOrder = useMemo(() => orders.find(o => o.id === activeRefOrderId), [activeRefOrderId, orders]);

  const activeOrderSizes = useMemo(() => {
    if (!activeOrder) return [];
    return Object.keys(activeOrder.qty_by_size || {}).sort((a, b) => {
      const indexA = sizeOrder.indexOf(a.toUpperCase());
      const indexB = sizeOrder.indexOf(b.toUpperCase());
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }, [activeOrder]);

  const totals = useMemo(() => {
    const uniqueBoxNumbers = new Set();
    let tQty = 0; let tNet = 0; let tGross = 0;
    boxes.forEach(b => {
      const rangeParts = b.range.split('-').map(Number);
      const start = rangeParts[0];
      const end = rangeParts[1] || start;
      if (!isNaN(start)) {
        const boxCountInRow = (end - start + 1) || 1;
        for (let i = start; i <= end; i++) { uniqueBoxNumbers.add(i); }
        tQty += (Number(b.qtyPerBox) * boxCountInRow);
        tNet += (Number(b.net) * boxCountInRow);
        tGross += (Number(b.gross) * boxCountInRow);
      }
    });
    return { totalQty: tQty, totalNet: tNet.toFixed(2), totalGross: tGross.toFixed(2), totalBoxes: uniqueBoxNumbers.size };
  }, [boxes]);

  useEffect(() => {
    const updatedBoxes = boxes.map(box => {
      const orderWeights = unitWeights[box.orderId];
      const unitWeight = orderWeights ? (orderWeights[box.size.toUpperCase()] || 0) : 0;
      if (unitWeight > 0 && box.qtyPerBox > 0) {
        const n = (Number(box.qtyPerBox) * Number(unitWeight)).toFixed(2);
        const g = (Number(n) + Number(boxTare)).toFixed(2);
        if (box.net !== n || box.gross !== g) return { ...box, net: n, gross: g };
      }
      return box;
    });
    if (JSON.stringify(updatedBoxes) !== JSON.stringify(boxes)) setBoxes(updatedBoxes);
  }, [unitWeights, boxTare, boxes]);

  const exportToExcel = () => {
    const exportData = boxes.map(b => {
      const ord = orders.find(o => o.id === b.orderId);
      return { 'Box No': b.range, 'Model': ord?.model || '-', 'Article': ord?.article || '-', 'Color': ord?.color || '-', 'Size': b.size, 'Quantity': b.qtyPerBox, 'Net Weight': b.net, 'Gross Weight': b.gross, 'Dimensions': b.dimensions };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PackingList");
    XLSX.writeFile(wb, `PackingList_AlfaSpor.xlsx`);
  };

  const addRow = () => setBoxes([...boxes, { id: Date.now(), orderId: '', range: '', size: '', qtyPerBox: '', net: '', gross: '', dimensions: defaultDims }]);
  const updateRow = (id, field, value) => setBoxes(boxes.map(b => b.id === id ? { ...b, [field]: value } : b));
  const removeRow = (id) => setBoxes(boxes.filter(b => b.id !== id));

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32 bg-white print:p-0">
      
      {/* 1. HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 border-2 border-slate-50 rounded-[2.5rem] print:border-none print:p-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1"><Building2 size={18}/> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Exporter</span></div>
          <p className="font-black text-slate-900 text-sm leading-tight uppercase italic">ALFA SPOR GİYİM SAN. TİC. LTD. ŞTİ.</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Izmir, Turkey</p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 mb-1"><User size={18}/> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Consignee</span></div>
          <input type="text" placeholder="Buyer Name..." className="w-full font-black text-slate-900 border-b border-slate-100 outline-none print:border-none" 
            value={consignee.name} onChange={(e) => setConsignee({...consignee, name: e.target.value})} />
          <textarea placeholder="Address..." className="w-full text-[11px] font-bold text-slate-500 border-none outline-none resize-none h-12 print:h-auto" 
            value={consignee.address} onChange={(e) => setConsignee({...consignee, address: e.target.value})} />
        </div>
      </div>

      {/* 2. WEIGHT & DIMS REFERENCE (MAVİ ALAN - INPUTLAR GERİ GELDİ) */}
      <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl print:hidden space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase opacity-60">1. Select Article & Color</span>
            <select className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-bold outline-none cursor-pointer" value={activeRefOrderId} onChange={(e) => setActiveRefOrderId(e.target.value)}>
              <option value="" className="text-slate-900">Choose...</option>
              {orders.map(o => <option key={o.id} value={o.id} className="text-slate-900">{o.article} - {o.color}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase opacity-60">2. Box Tare (Empty Box KG)</span>
            <input type="number" step="0.01" className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-bold outline-none" 
              value={boxTare} onChange={(e) => setBoxTare(e.target.value)} />
          </div>
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase opacity-60">3. Default Dimensions (cm)</span>
            <input type="text" className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-bold outline-none" 
              value={defaultDims} onChange={(e) => setDefaultDims(e.target.value)} />
          </div>
        </div>
        
        {activeOrder && (
          <div className="pt-4 border-t border-white/10 animate-in fade-in">
            <div className="flex items-center gap-2 mb-3"><Tag size={12}/> <span className="text-[10px] font-black uppercase tracking-widest">Weight per Piece for {activeOrder.color}:</span></div>
            <div className="flex flex-wrap gap-3">
              {activeOrderSizes.map(sz => (
                <div key={sz} className="flex-1 min-w-18.75 space-y-1">
                  <span className="text-[8px] font-black uppercase opacity-60 block text-center">{sz}</span>
                  <input type="number" step="0.001" className="w-full bg-white text-slate-900 rounded-xl p-3 text-xs font-black text-center outline-none"
                    value={unitWeights[activeRefOrderId]?.[sz] || ''} onChange={(e) => setUnitWeights({...unitWeights, [activeRefOrderId]: {...unitWeights[activeRefOrderId], [sz]: e.target.value}})} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. MAIN TABLE (INPUTLAR GERİ GELDİ) */}
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 shadow-sm print:border-none print:shadow-none">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b">
            <tr>
              <th className="py-5 px-6">Article / Color</th>
              <th className="py-5 px-4 text-center">Box No</th>
              <th className="py-5 px-4 text-center">Dims</th>
              <th className="py-5 px-4 text-center">Size</th>
              <th className="py-5 px-4 text-center">Qty</th>
              <th className="py-5 px-4 text-center">Net</th>
              <th className="py-5 px-4 text-center text-blue-600">Gross</th>
              <th className="py-5 px-6 print:hidden"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-[10px] font-bold">
            {boxes.map((box) => {
              const ord = orders.find(o => o.id === box.orderId);
              const availableSizes = ord ? Object.keys(ord.qty_by_size || {}) : [];
              return (
                <tr key={box.id} className="group hover:bg-slate-50 transition-all">
                  <td className="py-3 px-6">
                    <div className="print:hidden">
                      <select value={box.orderId} onChange={(e) => updateRow(box.id, 'orderId', e.target.value)} className="w-full bg-slate-100/50 border-none rounded-lg p-1 text-[10px] font-black outline-none focus:ring-1 focus:ring-blue-200">
                        <option value="">Select...</option>
                        {orders.map(o => <option key={o.id} value={o.id}>{o.article} - {o.color}</option>)}
                      </select>
                    </div>
                    <div className="hidden print:block font-black uppercase">{ord?.article} / <span className="text-blue-600">{ord?.color}</span></div>
                  </td>
                  <td className="text-center">
                    <input type="text" value={box.range} onChange={(e) => updateRow(box.id, 'range', e.target.value)} 
                      className="w-16 bg-slate-50 border-none rounded-md px-2 py-1 text-center outline-none font-black" />
                  </td>
                  <td className="text-center">
                    <input type="text" value={box.dimensions} onChange={(e) => updateRow(box.id, 'dimensions', e.target.value)} 
                      className="w-20 bg-slate-50 border-none rounded-md px-2 py-1 text-center text-slate-400 outline-none" />
                  </td>
                  <td className="text-center uppercase">
                    {/* BEDEN INPUTU (Model seçiliyse dropdown, değilse input) */}
                    {availableSizes.length > 0 ? (
                      <select value={box.size} onChange={(e) => updateRow(box.id, 'size', e.target.value)} className="w-14 bg-blue-50 border-none rounded-md px-1 py-1 text-center font-black outline-none">
                        <option value="">-</option>
                        {availableSizes.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={box.size} onChange={(e) => updateRow(box.id, 'size', e.target.value.toUpperCase())} className="w-12 bg-slate-50 border-none rounded-md text-center" />
                    )}
                  </td>
                  <td className="text-center">
                    <input type="number" value={box.qtyPerBox} onChange={(e) => updateRow(box.id, 'qtyPerBox', e.target.value)} 
                      className="w-16 bg-blue-50 border-none rounded-md px-2 py-1 text-center font-black outline-none" />
                  </td>
                  <td className="text-center text-slate-500 font-medium">{box.net || '0.00'}</td>
                  <td className="text-center font-black text-slate-900">{box.gross || '0.00'}</td>
                  <td className="px-6 text-right print:hidden"><button onClick={() => removeRow(box.id)} className="text-slate-200 hover:text-red-500 transition-all"><Trash2 size={14}/></button></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-900 text-white font-black text-[10px] uppercase">
            <tr>
              <td className="py-6 px-6">TOTAL SHIPMENT</td>
              <td className="text-center">{totals.totalBoxes} BOXES</td>
              <td colSpan="2"></td>
              <td className="text-center">{totals.totalQty} PCS</td>
              <td className="text-center">{totals.totalNet} KG</td>
              <td className="text-center">{totals.totalGross} KG</td>
              <td className="print:hidden"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden pt-4">
        <button onClick={addRow} className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-8 py-4 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">+ ADD PACKING ROW</button>
        <div className="flex gap-3">
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-xl font-black text-[10px] border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"><FileSpreadsheet size={16}/> EXCEL</button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] shadow-lg hover:bg-blue-600 transition-all uppercase"><Printer size={16}/> PRINT PDF</button>
        </div>
      </div>

      <div className="mt-16 text-center border-t border-slate-50 pt-8 opacity-20 hidden print:block">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Navy Blue ERP Systems</p>
      </div>
    </div>
  );
}