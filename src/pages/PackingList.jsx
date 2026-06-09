import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Building2, 
  User, 
  FileSpreadsheet, 
  Tag, 
  Box, 
  ListFilter, 
  Package,
  Save
} from 'lucide-react';
import { supabase } from '../api/orderService';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import ShippingLabelModal from '../components/orders/ShippingLabelModal';
import { SIZE_ORDER } from '../constants/sizes';

export default function PackingList() {
  const [orders, setOrders] = useState([]);
  const [consignee, setConsignee] = useState({ name: '', address: '' });
  const [customers, setCustomers] = useState([]);
  const [unitWeights, setUnitWeights] = useState({});
  const [boxTare, setBoxTare] = useState(0.5); 
  const [defaultDims, setDefaultDims] = useState('60x40x40');
  const [activeRefOrderId, setActiveRefOrderId] = useState(''); 
  const [showLabels, setShowLabels] = useState(false);
  const [boxes, setBoxes] = useState([
    { 
      id: Date.now(), 
      orderId: '', 
      range: '1-1', 
      type: 'SINGLE', 
      size: '', 
      lotRatio: '', 
      lotSizes: 'S-M-L-XL', 
      qtyPerBox: '', 
      dimensions: '60x40x40' 
    }
  ]);

  // ✅ DÜZELTİLDİ: Akıllı label fonksiyonu — prefix varsa sil, yoksa aynen bırak
  // ✅ Kullanıcı "3M" yazınca "B3M" olarak eşleştir
  const normalizeSize = (input, orderSizes) => {
    if (!input) return input;
    const upper = input.toUpperCase().trim();
    // Direkt eşleşme var mı?
    if (orderSizes.includes(upper)) return upper;
    // Prefix ekleyerek ara
    const prefixes = ['B', 'K', 'S', 'Y', 'U', 'N'];
    for (const p of prefixes) {
      const candidate = p + upper;
      if (orderSizes.includes(candidate)) return candidate;
    }
    // Bulunamazsa olduğu gibi döndür
    return upper;
  };

  const getDisplayLabel = (s) => {
    const prefixes = ['B', 'K', 'S', 'Y', 'U', 'N'];
    return prefixes.includes(s.charAt(0)) && s.length > 1 ? s.substring(1) : s;
  };

  const today = new Date().toLocaleDateString('en-GB');

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .is('is_archived', false)
        .neq('status', 'archived')
        .order('order_no', { ascending: false });
      setOrders(data || []);
    };
    
    const savedCust = localStorage.getItem('navyblue_saved_customers');
    if (savedCust) setCustomers(JSON.parse(savedCust));

    fetchOrders();
  }, []);

  const handleSaveCustomer = () => {
    if (!consignee.name.trim()) return;
    const updated = [...customers.filter(c => c.name !== consignee.name), { name: consignee.name, address: consignee.address }];
    setCustomers(updated);
    localStorage.setItem('navyblue_saved_customers', JSON.stringify(updated));
    alert("Müşteri hızlı seçim listesine kaydedildi!");
  };

  const handleSelectCustomer = (e) => {
    const cust = customers.find(c => c.name === e.target.value);
    if (cust) {
      setConsignee({ name: cust.name, address: cust.address });
    }
  };

  const activeOrder = useMemo(() => orders.find(o => o.id === activeRefOrderId), [activeRefOrderId, orders]);

  // ✅ DÜZELTİLDİ: SIZE_ORDER prefix'li key'lerle eşleşiyor
  const activeOrderSizes = useMemo(() => {
    if (!activeOrder) return [];
    return Object.entries(activeOrder.qty_by_size || {})
      .filter(([size, qty]) => Number(qty) > 0)
      .map(([size]) => size)
      .sort((a, b) => {
        const indexA = SIZE_ORDER.indexOf(a);
        const indexB = SIZE_ORDER.indexOf(b);
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });
  }, [activeOrder]);

  const getBoxData = (box, index, allBoxes) => {
    const orderWeights = unitWeights[box.orderId] || {};
    let calcNet = 0;
    let calcQty = 0;

    if (box.type === 'LOT' && box.lotRatio) {
      const ratios = box.lotRatio.split('-').map(Number);
      const sizes = box.lotSizes.split('-').map(s => s.trim().toUpperCase());
      const ratioSum = ratios.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
      calcQty = ratioSum * Number(box.qtyPerBox || 0);
      ratios.forEach((r, i) => {
        const sz = normalizeSize(sizes[i], Object.keys(orderWeights));
        const uw = Number(orderWeights[sz] || 0);
        calcNet += (r * uw * Number(box.qtyPerBox || 0));
      });
    } else {
      calcQty = Number(box.qtyPerBox || 0);
      const normalizedSize = normalizeSize(box.size, Object.keys(orderWeights));
      const uw = Number(orderWeights[normalizedSize] || 0);
      calcNet = calcQty * uw;
    }

    const isShared = allBoxes.slice(0, index).some(prev => prev.range === box.range && box.range !== "");
    const calcGross = isShared ? calcNet : (Number(calcNet) + Number(boxTare));

    return { net: Number(calcNet).toFixed(2), gross: Number(calcGross).toFixed(2), totalPcs: calcQty };
  };

  // ✅ Renk bazında size breakdown
  const sizeTotalsByColor = useMemo(() => {
    const byColor = {}; // { color: { size: qty } }
    boxes.forEach((b) => {
      const ord = orders.find(o => o.id === b.orderId);
      const color = ord?.color || 'DİĞER';
      const rangeParts = b.range.split('-').map(Number);
      const start = rangeParts[0];
      const end = rangeParts[1] || start;
      if (isNaN(start)) return;
      const boxCount = (end - start + 1) || 1;
      if (!byColor[color]) byColor[color] = {};

      if (b.type === 'LOT' && b.lotRatio) {
        const ratios = b.lotRatio.split('-').map(Number);
        const sizes = b.lotSizes.split('-').map(s => s.trim().toUpperCase());
        ratios.forEach((r, i) => {
          const sz = sizes[i];
          if (!sz) return;
          const qty = r * Number(b.qtyPerBox || 0) * boxCount;
          byColor[color][sz] = (byColor[color][sz] || 0) + qty;
        });
      } else if (b.size) {
        const sz = b.size.toUpperCase().trim();
        const qty = Number(b.qtyPerBox || 0) * boxCount;
        byColor[color][sz] = (byColor[color][sz] || 0) + qty;
      }
    });
    return byColor;
  }, [boxes, orders]);

  // Geriye dönük uyumluluk için toplam
  const sizeTotals = useMemo(() => {
    const breakdown = {};
    Object.values(sizeTotalsByColor).forEach(colorBreakdown => {
      Object.entries(colorBreakdown).forEach(([sz, qty]) => {
        breakdown[sz] = (breakdown[sz] || 0) + qty;
      });
    });
    return breakdown;
  }, [sizeTotalsByColor]);

  const totals = useMemo(() => {
    const uniqueBoxNumbers = new Set();
    let tQty = 0; 
    let tNet = 0; 

    boxes.forEach((b, idx) => {
      const { net, totalPcs } = getBoxData(b, idx, boxes);
      const rangeParts = b.range.split('-').map(Number);
      const start = rangeParts[0];
      const end = rangeParts[1] || start;
      if (!isNaN(start)) {
        const boxCountInRow = (end - start + 1) || 1;
        for (let i = start; i <= end; i++) { uniqueBoxNumbers.add(i); }
        tQty += (totalPcs * boxCountInRow);
        tNet += (Number(net) * boxCountInRow);
      }
    });

    const tGross = Number(tNet) + (uniqueBoxNumbers.size * Number(boxTare));
    return { 
      totalQty: tQty, 
      totalNet: Number(tNet).toFixed(2), 
      totalGross: Number(tGross).toFixed(2), 
      totalBoxes: uniqueBoxNumbers.size 
    };
  }, [boxes, boxTare, unitWeights]);

  const mergedLabelsData = useMemo(() => {
    // range bazında grupla
    const grouped = {};
    boxes.forEach((b, idx) => {
      if (!b.range) return;
      const boxCalc = getBoxData(b, idx, boxes);
      const ord = orders.find(o => o.id === b.orderId);
      const articleKey = `${ord?.article || ''}__${ord?.color || ''}`;

      if (!grouped[b.range]) {
        grouped[b.range] = {
          range: b.range,
          dimensions: b.dimensions,
          net: 0,
          gross: 0,
          totalPcs: 0,
          // artikel+renk bazında gruplu içerik
          articleGroups: {}
        };
      }

      grouped[b.range].net += Number(boxCalc.net);
      grouped[b.range].gross += Number(boxCalc.gross);
      grouped[b.range].totalPcs += boxCalc.totalPcs;

      if (!grouped[b.range].articleGroups[articleKey]) {
        grouped[b.range].articleGroups[articleKey] = {
          article: ord?.article || '---',
          color:   ord?.color   || '---',
          qty: 0,
          items: []
        };
      }

      grouped[b.range].articleGroups[articleKey].qty += boxCalc.totalPcs;

      if (b.type === 'LOT') {
        grouped[b.range].articleGroups[articleKey].items.push({
          detail: `${b.lotSizes} (${b.lotRatio})`,
          qty: `${b.qtyPerBox} Lot`
        });
      } else {
        grouped[b.range].articleGroups[articleKey].items.push({
          detail: b.size,
          qty: b.qtyPerBox
        });
      }
    });

    return Object.values(grouped).map(g => ({
      ...g,
      net: g.net.toFixed(2),
      gross: g.gross.toFixed(2),
      articleGroups: Object.values(g.articleGroups)
    }));
  }, [boxes, orders, unitWeights]);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Packing List');
    
    worksheet.columns = [
      { width: 18 }, { width: 45 }, { width: 12 }, { width: 22 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 15 }
    ];

    worksheet.mergeCells('A1:H2');
    const mainTitle = worksheet.getCell('A1');
    mainTitle.value = 'PACKING LIST';
    mainTitle.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    mainTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    mainTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('G3:H3');
    const dateCell = worksheet.getCell('G3');
    dateCell.value = `DATE: ${today}`;
    dateCell.alignment = { horizontal: 'right' };
    dateCell.font = { bold: true };

    worksheet.mergeCells('G4:H4');
    const originCell = worksheet.getCell('G4');
    originCell.value = 'MADE IN TURKEY';
    originCell.alignment = { horizontal: 'right' };
    originCell.font = { bold: true, italic: true };

    worksheet.addRow(['EXPORTER', 'ALFA SPOR GİYİM SAN. TİC. LTD. ŞTİ.']).font = { bold: true };
    worksheet.addRow(['ADDRESS', 'Meriç Mh. 5746/3 Sk. N.21 Mtk Sit. 35090 Bornova İzmir Turkey']);
    worksheet.addRow(['CONSIGNEE', consignee.name || '---']).font = { bold: true };
    worksheet.addRow(['DELIVERY ADDRESS', consignee.address || '---']);
    worksheet.addRow([]);

    const header = worksheet.addRow(["Box No", "Description", "Type", "Details", "Qty", "Net (KG)", "Gross (KG)", "Dimensions"]);
    header.height = 25;
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    boxes.forEach((b, idx) => {
      const ord = orders.find(o => o.id === b.orderId);
      const { net, gross, totalPcs } = getBoxData(b, idx, boxes);
      const row = worksheet.addRow([
        b.range, 
        ord ? `${ord.model} / ${ord.article} / ${ord.color}` : '-',
        b.type,
        b.type === 'LOT' ? `${b.lotSizes} (${b.lotRatio}) x ${b.qtyPerBox} Lot` : b.size,
        totalPcs,
        Number(net),
        Number(gross),
        b.dimensions
      ]);
      row.eachCell((c, colNumber) => {
        c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        // Description (col 2) sola yaslı, diğerleri ortalı
        c.alignment = { horizontal: colNumber === 2 ? 'left' : 'center', vertical: 'middle' };
      });
    });

    worksheet.addRow([]);
    const footerRow = worksheet.addRow([
      'GRAND TOTALS', 
      `${totals.totalBoxes} BOXES`, 
      '', 
      '', 
      totals.totalQty, 
      Number(totals.totalNet), 
      Number(totals.totalGross), 
      ''
    ]);
    footerRow.height = 25;
    footerRow.font = { bold: true };
    footerRow.eachCell((c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      c.border = { top: {style:'medium'}, bottom: {style:'medium'} };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    worksheet.addRow([]);
    const sizeHeaderRow = worksheet.addRow(['SIZE BREAKDOWN GRAND TOTALS']);
    sizeHeaderRow.font = { bold: true, size: 11 };

    // Renk bazında yaz
    Object.entries(sizeTotalsByColor).forEach(([color, breakdown]) => {
      const colorRow = worksheet.addRow([`COLOR: ${color}`]);
      colorRow.font = { bold: true, italic: true, size: 10 };

      const activeSizeKeys = Object.keys(breakdown).sort((a, b) => {
        const indexA = SIZE_ORDER.indexOf(a);
        const indexB = SIZE_ORDER.indexOf(b);
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });

      activeSizeKeys.forEach(sz => {
        const szRow = worksheet.addRow([`  ${getDisplayLabel(sz)}`, `${breakdown[sz]} PCS`]);
        szRow.getCell(1).font = { bold: true };
        szRow.getCell(1).alignment = { horizontal: 'left' };
      });

      worksheet.addRow([]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const safeCustomerName = consignee.name.trim() ? consignee.name.trim().replace(/[^a-zA-Z0-9şŞçÇgGğĞüÜöÖıİ-]/g, '_') : 'Bilinmeyen-Musteri';
    const safeDate = today.replace(/\//g, '-');
    saveAs(new Blob([buffer]), `packing list - ${safeCustomerName} - ${safeDate}.xlsx`);
  };

  const addRow = () => setBoxes([...boxes, { id: Date.now(), orderId: '', range: '', type: 'SINGLE', size: '', lotRatio: '', lotSizes: 'S-M-L-XL', qtyPerBox: '', dimensions: defaultDims }]);
  const updateRow = (id, field, value) => setBoxes(boxes.map(b => b.id === id ? { ...b, [field]: value } : b));
  const removeRow = (id) => setBoxes(boxes.filter(b => b.id !== id));

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-10 pb-32 bg-white no-print">
      
      {/* ÜST MÜŞTERİ KARTI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-10 border-2 border-slate-50 rounded-[3rem] shadow-sm relative">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-blue-600">
            <Building2 size={20}/> 
            <span className="text-xs font-black uppercase tracking-widest">Exporter / Gönderen</span>
          </div>
          <div className="pl-8 space-y-2">
            <p className="font-black text-slate-900 text-lg uppercase italic">ALFA SPOR GİYİM SAN. TİC. LTD. ŞTİ.</p>
            <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-sm">Meriç Mh. 5746/3 Sk. N.21 Mtk Sit. 35090 Bornova İzmir Turkey</p>
          </div>
        </div>
        <div className="space-y-4 text-right">
          <div className="flex items-center justify-end gap-4 text-indigo-600">
            {customers.length > 0 && (
              <select onChange={handleSelectCustomer} className="text-[10px] font-black uppercase bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none cursor-pointer">
                <option value="">Kayıtlı Müşteriler...</option>
                {customers.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
              </select>
            )}
            <User size={20}/> 
            <span className="text-xs font-black uppercase tracking-widest">Consignee / Alıcı</span>
          </div>
          <div className="pr-8 space-y-3">
            <div className="flex gap-2 justify-end items-center">
              <button onClick={handleSaveCustomer} title="Bu müşteriyi listeye kaydet" className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-indigo-600 transition-colors border border-slate-200">
                <Save size={14}/>
              </button>
              <input type="text" placeholder="Buyer Name..." className="w-full text-right font-black text-slate-900 text-lg border-b-2 border-slate-100 outline-none" value={consignee.name} onChange={(e) => setConsignee({...consignee, name: e.target.value})} />
            </div>
            <textarea placeholder="Address..." className="w-full text-right text-xs font-bold text-slate-500 border-none outline-none resize-none h-16" value={consignee.address} onChange={(e) => setConsignee({...consignee, address: e.target.value})} />
          </div>
        </div>
      </div>

      <div className="bg-blue-600 p-10 rounded-[3.5rem] text-white shadow-2xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase opacity-70 tracking-widest">1. Select Model</label>
            <select className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm font-black outline-none focus:bg-white focus:text-slate-900" value={activeRefOrderId} onChange={(e) => setActiveRefOrderId(e.target.value)}>
              <option value="" className="text-slate-900">Choose Order...</option>
              {orders.map(o => <option key={o.id} value={o.id} className="text-slate-900">{o.article} - {o.color}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase opacity-70 tracking-widest text-center block">2. Box Tare (KG)</label>
            <input type="number" step="0.01" className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm font-black text-center outline-none focus:bg-white focus:text-slate-900" value={boxTare} onChange={(e) => setBoxTare(e.target.value)} />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase opacity-70 tracking-widest text-center block">3. Default Dims</label>
            <input type="text" className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm font-black text-center outline-none focus:bg-white focus:text-slate-900" value={defaultDims} onChange={(e) => setDefaultDims(e.target.value)} />
          </div>
        </div>

        {activeOrder && (
          <div className="pt-8 border-t border-white/10 flex flex-wrap gap-4">
            {activeOrderSizes.map(sz => (
              <div key={sz} className="flex-1 min-w-20 text-center">
                {/* ✅ DÜZELTİLDİ: prefix kaldırılarak temiz beden etiketi gösteriliyor */}
                <span className="text-[9px] font-black uppercase block opacity-60 mb-2">{getDisplayLabel(sz)}</span>
                <input type="number" step="0.001" className="w-full bg-white text-slate-900 rounded-2xl p-3 text-xs font-black text-center outline-none"
                  value={unitWeights[activeRefOrderId]?.[sz] || ''} 
                  onChange={(e) => setUnitWeights({...unitWeights, [activeRefOrderId]: {...unitWeights[activeRefOrderId], [sz]: e.target.value}})} 
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[3rem] border border-slate-100 shadow-xl bg-white">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="py-6 px-8 text-white">Model / Article</th>
              <th className="py-6 px-4 text-center">Type</th>
              <th className="py-6 px-4 text-center">Box No</th>
              <th className="py-6 px-4">Size / Lot Ratio</th>
              <th className="py-6 px-4 text-center">Qty / Lot</th>
              <th className="py-6 px-4 text-center text-blue-400">Net</th>
              <th className="py-6 px-4 text-center text-blue-400">Gross</th>
              <th className="py-6 px-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px] font-bold">
            {boxes.map((box, index) => {
              const { net, gross, totalPcs } = getBoxData(box, index, boxes);
              return (
                <tr key={box.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="py-4 px-8">
                    <select value={box.orderId} onChange={(e) => updateRow(box.id, 'orderId', e.target.value)} className="w-full bg-slate-100 rounded-xl p-2.5 text-[10px] font-black outline-none focus:bg-white">
                      <option value="">Select Order...</option>
                      {orders.map(o => <option key={o.id} value={o.id}>{o.article} — {o.color}</option>)}
                    </select>
                  </td>
                  <td className="text-center">
                    <select value={box.type} onChange={(e) => updateRow(box.id, 'type', e.target.value)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${box.type === 'LOT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      <option value="SINGLE">Single</option>
                      <option value="LOT">Lot</option>
                    </select>
                  </td>
                  <td className="text-center"><input value={box.range} onChange={(e) => updateRow(box.id, 'range', e.target.value)} className="w-20 bg-transparent text-center font-black outline-none border-b border-transparent focus:border-blue-400" /></td>
                  <td className="py-4 px-4">
                    {box.type === 'LOT' ? (
                      <div className="flex gap-2">
                        <input value={box.lotSizes} onChange={(e) => updateRow(box.id, 'lotSizes', e.target.value)} className="w-24 bg-slate-50 border p-2 rounded-lg text-[10px]" />
                        <input value={box.lotRatio} onChange={(e) => updateRow(box.id, 'lotRatio', e.target.value)} className="w-24 bg-blue-50 text-blue-700 p-2 rounded-lg text-[10px] font-black" />
                      </div>
                    ) : (
                      <input value={box.size} onChange={(e) => updateRow(box.id, 'size', e.target.value.toUpperCase())} className="w-20 bg-transparent font-black outline-none border-b border-transparent focus:border-blue-400" />
                    )}
                  </td>
                  <td className="text-center"><input type="number" value={box.qtyPerBox} onChange={(e) => updateRow(box.id, 'qtyPerBox', e.target.value)} className="w-14 bg-transparent text-center font-black outline-none" /></td>
                  <td className="text-center text-slate-500">{net}</td>
                  <td className="text-center font-black">{gross}</td>
                  <td className="px-8 text-right">
                    <button onClick={() => removeRow(box.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-900 text-white font-black text-[12px] uppercase">
            <tr>
              <td className="py-8 px-8 italic tracking-widest text-blue-400">Totals</td>
              <td className="text-center border-l border-slate-800">{totals.totalBoxes} Boxes</td>
              <td colSpan="2"></td>
              <td className="text-center border-l border-slate-800">{totals.totalQty} Pcs</td>
              <td className="text-center border-l border-slate-800">{totals.totalNet} Kg</td>
              <td className="text-center border-l border-slate-800 font-black text-blue-400">{totals.totalGross} Kg</td>
              <td className="bg-blue-600"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6">
        <button onClick={addRow} className="bg-blue-50 text-blue-600 px-12 py-5 rounded-4xl font-black text-xs uppercase shadow-sm hover:bg-blue-600 hover:text-white transition-all">+ Add Row</button>
        <div className="flex gap-4">
          <button onClick={exportToExcel} className="flex items-center gap-3 bg-emerald-50 text-emerald-600 px-10 py-5 rounded-4xl font-black text-xs uppercase border border-emerald-100 shadow-lg hover:bg-emerald-600 hover:text-white transition-all"><FileSpreadsheet size={20}/> Export Excel</button>
          <button onClick={() => setShowLabels(true)} className="flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-4xl font-black text-xs uppercase shadow-2xl hover:bg-blue-600 transition-all"><Tag size={20}/> PDF İndir (Argox)</button>
        </div>
      </div>

      {showLabels && (
        <ShippingLabelModal 
          boxes={mergedLabelsData} 
          consignee={consignee} 
          onClose={() => setShowLabels(false)} 
        />
      )}
    </div>
  );
}