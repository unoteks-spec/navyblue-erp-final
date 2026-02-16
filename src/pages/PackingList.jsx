import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Building2, User, FileSpreadsheet, Tag, Calendar, FileDown } from 'lucide-react';
import { supabase } from '../api/orderService';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js'; // 🛠️ Mutlaka: npm install html2pdf.js

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
  const today = new Date().toLocaleDateString('en-GB');

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

  // 🛠️ DİREKT İNDİRME: window.print() tamamen kaldırıldı
  const handleDownloadPDF = (e) => {
    e.preventDefault(); // Tarayıcı varsayılanını engelle
    const element = document.getElementById('packing-list-content');
    const opt = {
      margin: 10,
      filename: `PackingList_AlfaSpor_${new Date().getTime()}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const exportToExcel = () => {
    const headerInfo = [
      ["PACKING LIST"], ["DATE", today], [],
      ["EXPORTER", "ALFA SPOR GİYİM SAN. TİC. LTD. ŞTİ."],
      ["ADDRESS", "Meriç Mh. 5746/3 Sk. N.21 Mtk Sit. 35090 Bornova İzmir Turkey"], [],
      ["CONSIGNEE", consignee.name], ["DELIVERY ADDRESS", consignee.address], [],
      ["Box No", "Model", "Article", "Color", "Size", "Quantity", "Net Weight (KG)", "Gross Weight (KG)", "Dimensions"]
    ];
    const rowData = boxes.map(b => {
      const ord = orders.find(o => o.id === b.orderId);
      return [b.range, ord?.model || '-', ord?.article || '-', ord?.color || '-', b.size, b.qtyPerBox, b.net, b.gross, b.dimensions];
    });
    const footerInfo = [[], ["GRAND TOTALS", "", "", "", "", totals.totalQty, totals.totalNet, totals.totalGross, `${totals.totalBoxes} BOXES`], [], ["NAVY BLUE ERP SYSTEMS"]];
    const finalAOA = [...headerInfo, ...rowData, ...footerInfo];
    const ws = XLSX.utils.aoa_to_sheet(finalAOA);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PackingList");
    XLSX.writeFile(wb, `PackingList_Alfa_${new Date().getTime()}.xlsx`);
  };

  const addRow = () => setBoxes([...boxes, { id: Date.now(), orderId: '', range: '', size: '', qtyPerBox: '', net: '', gross: '', dimensions: defaultDims }]);
  const updateRow = (id, field, value) => setBoxes(boxes.map(b => b.id === id ? { ...b, [field]: value } : b));
  const removeRow = (id) => setBoxes(boxes.filter(b => b.id !== id));

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32 bg-white">
      
      {/* İNDİRİLECEK ALAN */}
      <div id="packing-list-content" className="p-4 bg-white rounded-4xl">
        {/* EXPORTER & CONSIGNEE SECTION */}
        <div className="grid grid-cols-2 gap-8 p-8 border-2 border-slate-50 rounded-[2.5rem]">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1"><Building2 size={18}/> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Exporter</span></div>
            <p className="font-black text-slate-900 text-sm leading-tight uppercase italic underline decoration-blue-500/30">ALFA SPOR GİYİM SAN. TİC. LTD. ŞTİ.</p>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed max-w-xs">
              Meriç Mh. 5746/3 Sk. N.21 Mtk Sit. 35090 Bornova İzmir Turkey
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600"><User size={18}/> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Consignee</span></div>
              <div className="flex items-center gap-2 text-slate-400">
                 <Calendar size={12}/>
                 <span className="text-[10px] font-black uppercase tracking-tighter">Date: {today}</span>
              </div>
            </div>
            <input type="text" placeholder="Buyer Name..." className="w-full font-black text-slate-900 border-b border-slate-100 outline-none" 
              value={consignee.name} onChange={(e) => setConsignee({...consignee, name: e.target.value})} />
            <textarea placeholder="Address..." className="w-full text-[11px] font-bold text-slate-500 border-none outline-none resize-none h-12" 
              value={consignee.address} onChange={(e) => setConsignee({...consignee, address: e.target.value})} />
          </div>
        </div>

        {/* TABLE */}
        <div className="mt-8 overflow-hidden rounded-[2.5rem] border border-slate-100 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b">
              <tr>
                <th className="py-5 px-6">Model / Article / Color</th>
                <th className="py-5 px-4 text-center">Box No</th>
                <th className="py-5 px-4 text-center">Dims</th>
                <th className="py-5 px-4 text-center">Size</th>
                <th className="py-5 px-4 text-center">Qty</th>
                <th className="py-5 px-4 text-center text-blue-600">Net</th>
                <th className="py-5 px-4 text-center text-blue-600">Gross</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[10px] font-bold">
              {boxes.map((box) => {
                const ord = orders.find(o => o.id === box.orderId);
                return (
                  <tr key={box.id}>
                    <td className="py-3 px-6">
                      <div className="flex flex-col">
                        <select value={box.orderId} onChange={(e) => updateRow(box.id, 'orderId', e.target.value)} className="w-full bg-slate-50/50 border-none rounded-lg p-1 text-[10px] font-black print-hidden">
                          <option value="">Select...</option>
                          {orders.map(o => <option key={o.id} value={o.id}>{o.article} - {o.color}</option>)}
                        </select>
                        <span className="hidden print-only-block uppercase">{ord?.article} / <span className="text-blue-600">{ord?.color}</span></span>
                      </div>
                    </td>
                    <td className="text-center"><input type="text" value={box.range} onChange={(e) => updateRow(box.id, 'range', e.target.value)} className="w-16 bg-transparent text-center outline-none font-black" /></td>
                    <td className="text-center"><input type="text" value={box.dimensions} onChange={(e) => updateRow(box.id, 'dimensions', e.target.value)} className="w-20 bg-transparent text-center text-slate-400 outline-none" /></td>
                    <td className="text-center uppercase"><input type="text" value={box.size} onChange={(e) => updateRow(box.id, 'size', e.target.value.toUpperCase())} className="w-12 bg-transparent text-center outline-none" /></td>
                    <td className="text-center"><input type="number" value={box.qtyPerBox} onChange={(e) => updateRow(box.id, 'qtyPerBox', e.target.value)} className="w-12 bg-transparent text-center outline-none" /></td>
                    <td className="text-center text-slate-500">{box.net}</td>
                    <td className="text-center font-black text-slate-900">{box.gross}</td>
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
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-12 text-center border-t border-slate-50 pt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900">Navy Blue ERP Systems</p>
        </div>
      </div>

      {/* MAVİ REFERANS ALANI */}
      <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase opacity-60">1. Select Article & Color</span>
            <select className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-bold outline-none cursor-pointer" value={activeRefOrderId} onChange={(e) => setActiveRefOrderId(e.target.value)}>
              <option value="" className="text-slate-900">Choose...</option>
              {orders.map(o => <option key={o.id} value={o.id} className="text-slate-900">{o.article} - {o.color}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase opacity-60">2. Box Tare (KG)</span>
            <input type="number" step="0.01" className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-bold outline-none text-center" value={boxTare} onChange={(e) => setBoxTare(e.target.value)} />
          </div>
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase opacity-60">3. Default Dims (cm)</span>
            <input type="text" className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-bold outline-none text-center" value={defaultDims} onChange={(e) => setDefaultDims(e.target.value)} />
          </div>
        </div>
        
        {activeOrder && (
          <div className="pt-4 border-t border-white/10 animate-in fade-in">
            <div className="flex items-center gap-2 mb-3"><Tag size={12}/> <span className="text-[10px] font-black uppercase tracking-widest">Weights for {activeOrder.color}:</span></div>
            <div className="flex flex-wrap gap-3">
              {activeOrderSizes.map(sz => (
                <div key={sz} className="flex-1 min-w-18.75 space-y-1">
                  <span className="text-[8px] font-black uppercase block text-center opacity-60">{sz}</span>
                  <input type="number" step="0.001" className="w-full bg-white text-slate-900 rounded-xl p-3 text-xs font-black text-center outline-none"
                    value={unitWeights[activeRefOrderId]?.[sz] || ''} onChange={(e) => setUnitWeights({...unitWeights, [activeRefOrderId]: {...unitWeights[activeRefOrderId], [sz]: e.target.value}})} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4">
        <button onClick={addRow} className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-8 py-4 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">+ ADD PACKING ROW</button>
        <div className="flex gap-3">
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-xl font-black text-[10px] border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all uppercase shadow-sm"><FileSpreadsheet size={16}/> Excel Export</button>
          <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] shadow-lg hover:bg-blue-600 transition-all uppercase"><FileDown size={16}/> Download PDF</button>
        </div>
      </div>
    </div>
  );
}