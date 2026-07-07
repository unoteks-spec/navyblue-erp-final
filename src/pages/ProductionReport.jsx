import React, { useEffect, useState } from 'react';
import { getAllOrders } from '../api/orderService';
import { 
  MapPin, CheckCircle2, FileBarChart, Truck, 
  ChevronDown, ChevronUp, PackageCheck, FileSpreadsheet
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { SIZE_ORDER } from '../constants/sizes';

const NAVY = '#1e3a5f';

export default function ProductionReport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [customerFilter, setCustomerFilter] = useState('');
  const [articleFilter, setArticleFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const getDisplayLabel = (s) => {
    const prefixes = ['B', 'K', 'S', 'Y', 'U', 'N'];
    return prefixes.includes(s.charAt(0)) && s.length > 1 ? s.substring(1) : s;
  };

  useEffect(() => {
    getAllOrders().then(data => {
      setOrders(data || []);
      setLoading(false);
    });
  }, []);

  const getStageLabel = (key) => {
    const stageMap = {
      'kesimhanede': 'KESİMHANE',
      'baski': 'BASKI / NAKIŞ',
      'nakis': 'NAKIŞ',
      'dikim': 'DİKİM HATTI',
      'ilik_dugme': 'İLİK-DÜĞME',
      'yikama_boyama': 'YIKAMA-BOYAMA',
      'utu_ambalaj': 'ÜTÜ-PAKET',
      'yuklendi': 'YÜKLENDİ'
    };
    return stageMap[key] || 'KESİM BEKLİYOR';
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Siparis Listesi');

    const getDisplayLabelLocal = (s) => {
      const prefixes = ['B', 'K', 'S', 'Y', 'U', 'N'];
      return prefixes.includes(s.charAt(0)) && s.length > 1 ? s.substring(1) : s;
    };

    // Aktif bedenleri topla (sadece qty_by_size > 0 olanlar)
    const allSizes = new Set();
    filteredOrders.forEach(o => {
      SIZE_ORDER.forEach(s => {
        if (Number(o.qty_by_size?.[s] || 0) > 0) allSizes.add(s);
      });
    });
    const sortedSizes = SIZE_ORDER.filter(s => allSizes.has(s));

    const colCount = 3 + sortedSizes.length + 1; // Artikel + Model + Renk + bedenler + Toplam
    const dateStr = new Date().toLocaleDateString('tr-TR');
    const customers = [...new Set(filteredOrders.map(o => o.customer).filter(Boolean))];
    const orderNos = [...new Set(filteredOrders.map(o => o.order_no).filter(Boolean))];

    // ── BAŞLIK — orijinal dosya formatı ──
    // Satır 1: Lacivert dolgu başlık
    worksheet.mergeCells(1, 1, 1, colCount);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `SIPARIS LISTESI — ${customers.join(', ').toUpperCase()}`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 28;

    // Satır 2: Boş
    worksheet.addRow([]);
    worksheet.getRow(2).height = 4;

    // Satır 3: Müşteri sola, Tarih sağa
    const row3 = worksheet.addRow([]);
    worksheet.getCell(3, 1).value = 'Müşteri: ';
    worksheet.getCell(3, 1).font = { name: 'Arial', size: 9, bold: true };
    worksheet.getCell(3, 2).value = customers.join(', ');
    worksheet.getCell(3, 2).font = { name: 'Arial', size: 9, bold: true };
    worksheet.getCell(3, colCount).value = dateStr;
    worksheet.getCell(3, colCount).font = { name: 'Arial', size: 9, bold: true };
    worksheet.getCell(3, colCount).alignment = { horizontal: 'right' };
    worksheet.getRow(3).height = 14;

    // Satır 4: Order No
    worksheet.addRow([]);
    worksheet.getCell(4, 1).value = 'Order No:';
    worksheet.getCell(4, 1).font = { name: 'Arial', size: 9, bold: true };
    worksheet.getCell(4, 2).value = orderNos.map(n => '#' + n).join('  ');
    worksheet.getCell(4, 2).font = { name: 'Arial', size: 9, bold: true };
    worksheet.getRow(4).height = 14;

    // Satır 5: Termin (boş)
    worksheet.addRow([]);
    worksheet.getCell(5, 1).value = 'Termin:';
    worksheet.getCell(5, 1).font = { name: 'Arial', size: 9, bold: true };
    worksheet.getRow(5).height = 14;

    // Satır 6-8: Boş
    worksheet.addRow([]); worksheet.getRow(6).height = 4;
    worksheet.addRow([]); worksheet.getRow(7).height = 4;
    worksheet.addRow([]); worksheet.getRow(8).height = 4;

    // ── TABLO BAŞLIĞI — 4 taraflı thin border ──────────────────────
    const allThin = { style: 'thin', color: { argb: 'FF000000' } };
    const allThinBorder = { top: allThin, bottom: allThin, left: allThin, right: allThin };

    const headerRow = worksheet.addRow([
      'Artikel', 'Model', 'Renk',
      ...sortedSizes.map(s => getDisplayLabelLocal(s)),
      'Toplam'
    ]);
    headerRow.height = 16;
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      cell.font = { name: 'Arial', bold: true, size: 9 };
      cell.border = allThinBorder;
      cell.alignment = { horizontal: colNumber <= 3 ? 'left' : 'center', vertical: 'middle' };
    });

    // ── VERİ SATIRLARI — 4 taraflı thin border ──────────────────────
    filteredOrders.forEach(o => {
      const total = sortedSizes.reduce((sum, s) => sum + Number(o.qty_by_size?.[s] || 0), 0);
      const rowData = [
        o.article || '',
        o.model || '',
        o.color || '',
        ...sortedSizes.map(s => {
          const val = Number(o.qty_by_size?.[s] || 0);
          return val > 0 ? val : '';
        }),
        total,
      ];

      const row = worksheet.addRow(rowData);
      row.height = 16;
      row.eachCell((cell, colNumber) => {
        cell.border = allThinBorder;
        cell.font = { name: 'Arial', size: 11, bold: colNumber === colCount };
        cell.alignment = { horizontal: colNumber <= 3 ? 'left' : 'center', vertical: 'middle' };
      });
    });

    // ── GENEL TOPLAM SATIRI — border yok ──────────────────
    const totalRow = worksheet.addRow([
      'GENEL TOPLAM', '', '',
      ...sortedSizes.map(s =>
        filteredOrders.reduce((sum, o) => sum + Number(o.qty_by_size?.[s] || 0), 0)
      ),
      filteredOrders.reduce((sum, o) =>
        sum + sortedSizes.reduce((s2, sz) => s2 + Number(o.qty_by_size?.[sz] || 0), 0), 0
      ),
    ]);
    totalRow.height = 16;
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', bold: true, size: 11 };
      cell.alignment = { horizontal: colNumber <= 3 ? 'left' : 'center', vertical: 'middle' };
    });

    // ── SÜTUN GENİŞLİKLERİ ──────────────────
    worksheet.getColumn(1).width = 18;
    worksheet.getColumn(2).width = 22;
    worksheet.getColumn(3).width = 16;
    for (let i = 4; i <= 3 + sortedSizes.length; i++) {
      worksheet.getColumn(i).width = 7;
    }
    worksheet.getColumn(colCount).width = 9;

    const buffer = await workbook.xlsx.writeBuffer();
    const customerSlug = customers.join('-').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    saveAs(new Blob([buffer]), `${customerSlug}-siparis-listesi-${dateStr.replace(/\./g, '-')}.xlsx`);
  };

  const filteredOrders = orders.filter(o => {
    const isArchived = o.status === 'archived' || o.is_archived === true;
    const statusMatch = showArchived ? true : !isArchived;

    const customerMatch = !customerFilter || 
      String(o.customer || "").toLowerCase().includes(customerFilter.toLowerCase().trim());
    
    const articleMatch = !articleFilter || 
      String(o.article || "").toLowerCase().includes(articleFilter.toLowerCase().trim());
      
    return statusMatch && customerMatch && articleMatch;
  });

  const totalPlanned = filteredOrders.reduce((sum, o) => sum + Object.values(o.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0), 0);
  const totalCut = filteredOrders.reduce((sum, o) => sum + Object.values(o.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0), 0);
  const totalShipped = filteredOrders.reduce((sum, o) => sum + Object.values(o.shipped_qty || {}).reduce((a, b) => a + Number(b || 0), 0), 0);

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-[0.3em] text-[10px]">Veriler Hazırlanıyor...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32">
      <style>{`
        @media print {
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .print-area { border: none !important; box-shadow: none !important; width: 100% !important; margin: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border-bottom: 1px solid #eee !important; padding: 10px 5px !important; }
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>

      <div className="flex items-center justify-between pt-4 no-print">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Navy Blue ERP Systems</p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none mt-1">Üretim Raporu</h1>
        </div>
        <button onClick={exportToExcel} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all">
          <FileSpreadsheet size={16} /> Excel İndir
        </button>
      </div>

      <div className="border border-slate-100 rounded-xl p-4 space-y-3 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input type="text" placeholder="Müşteri..." value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none" />
          <input type="text" placeholder="Artikel..." value={articleFilter} onChange={(e) => setArticleFilter(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none" />
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
              showArchived ? 'text-white border-transparent' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
            style={showArchived ? { background: NAVY } : {}}
          >
            {showArchived ? '✓ Arşiv Dahil (Tümü)' : 'Sadece Aktif Siparişler'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden print-area">
        <div className="p-8 border-b border-slate-200 flex justify-between items-end bg-white">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900">NAVY BLUE</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Üretim Denge ve Sevkiyat Matrisi</p>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rapor Tarihi</div>
            <div className="text-sm font-black text-slate-900">{new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 border-b border-slate-100 bg-white">
          <div className="p-6 text-center border-r border-slate-100"><div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">İş Adedi</div><div className="text-2xl font-black text-slate-900">{filteredOrders.length}</div></div>
          <div className="p-6 text-center border-r border-slate-100"><div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Planlanan</div><div className="text-2xl font-black text-slate-700">{totalPlanned.toLocaleString()}</div></div>
          <div className="p-6 text-center border-r border-slate-100"><div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Kesilen</div><div className="text-2xl font-black text-emerald-600">{totalCut.toLocaleString()}</div></div>
          <div className="p-6 text-center"><div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Yüklenen</div><div className="text-2xl font-black" style={{ color: NAVY }}>{totalShipped.toLocaleString()}</div></div>
        </div>

        <div className="p-4 md:p-8 overflow-x-auto bg-white">
          <table className="w-full border-collapse min-w-250">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                <th className="py-4 px-2 no-print"></th>
                <th className="py-4 px-2 text-left">Artikel No</th>
                <th className="py-4 px-2 text-left">Model / Renk</th>
                <th className="py-4 px-2 text-left">Müşteri</th>
                <th className="py-4 px-2 text-left">Konum</th>
                <th className="py-4 px-2 text-right">Plan</th>
                <th className="py-4 px-2 text-right text-emerald-600">Kesim</th>
                <th className="py-4 px-2 text-right" style={{ color: NAVY }}>Yükleme</th>
                <th className="py-4 px-2 text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((o) => {
                const isExpanded = expandedId === o.id;
                const isArchived = o.status === 'archived' || o.is_archived === true;
                const pTotal = Object.values(o.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
                const cTotal = Object.values(o.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
                const sTotal = Object.values(o.shipped_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
                const diffTotal = sTotal - cTotal;

                const qtyKeys2 = Object.keys(o.qty_by_size || {});
                const getDisplayLabelLocal = (s) => {
                  const prefixes = ['B', 'K', 'S', 'Y', 'U', 'N'];
                  return prefixes.includes(s.charAt(0)) && s.length > 1 ? s.substring(1) : s;
                };
                const labelToKey = {};
                qtyKeys2.forEach(k => { labelToKey[getDisplayLabelLocal(k)] = k; });
                const normCut = {};
                Object.entries(o.cutting_qty || {}).forEach(([k, v]) => {
                  let normKey = qtyKeys2.includes(k) ? k : (labelToKey[k] || k);
                  normCut[normKey] = (Number(normCut[normKey] || 0) + Number(v || 0));
                });

                const activeSizes = SIZE_ORDER.filter(s => 
                  Number(o.qty_by_size?.[s] || 0) > 0 || Number(normCut[s] || 0) > 0
                );

                return (
                  <React.Fragment key={o.id}>
                    <tr onClick={() => setExpandedId(isExpanded ? null : o.id)} className={`group cursor-pointer transition-all ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                      <td className="py-4 px-2 text-slate-300 no-print">{isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</td>
                      <td className="py-4 px-2 font-black text-slate-900 text-sm uppercase">{o.article}</td>
                      <td className="py-4 px-2">
                        <div className="text-[11px] font-bold text-slate-700 uppercase leading-none">{o.model}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">{o.color}</div>
                      </td>
                      <td className="py-4 px-2 text-[10px] font-black text-slate-700 uppercase">{o.customer}</td>
                      <td className="py-4 px-2">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-black border uppercase ${isArchived ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200'}`} style={isArchived ? { background: NAVY } : {}}>
                           {isArchived ? <Truck size={10}/> : <MapPin size={10}/>} {isArchived ? 'SEVK EDİLDİ' : getStageLabel(o.current_stage)}
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right font-black text-slate-400 text-sm">{pTotal}</td>
                      <td className="py-4 px-2 text-right font-black text-emerald-600 text-sm">{cTotal || '-'}</td>
                      <td className="py-4 px-2 text-right font-black text-sm" style={{ color: NAVY }}>{sTotal || '-'}</td>
                      <td className="py-4 px-2 text-center">{isArchived ? <Truck size={16} className="mx-auto" style={{ color: NAVY }} /> : <CheckCircle2 size={16} className={cTotal >= pTotal ? "text-emerald-500 mx-auto" : "text-slate-200 mx-auto"} />}</td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="9" className="p-6">
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-full overflow-x-auto">
                            <div className="px-6 py-3 flex items-center gap-2" style={{ background: NAVY }}>
                              <PackageCheck size={14} className="text-white/70" />
                              <h3 className="text-[10px] font-black text-white/90 uppercase tracking-wider">Beden Dağılım Matrisi</h3>
                            </div>
                            
                            <table className="w-full text-center text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                                  <th className="py-3 px-4 text-left font-black bg-slate-50 sticky left-0 z-10 w-28">AŞAMA</th>
                                  {activeSizes.map(s => (
                                    <th key={s} className="py-3 px-3 min-w-16 border-l border-slate-100 font-black text-slate-600">
                                      {getDisplayLabel(s)}
                                    </th>
                                  ))}
                                  <th className="py-3 px-4 text-right font-black text-white min-w-20" style={{ background: NAVY }}>TOPLAM</th>
                                </tr>
                              </thead>
                              <tbody className="font-bold">
                                <tr className="border-b border-slate-100">
                                  <td className="py-2.5 px-4 text-left font-black text-slate-600 bg-slate-50/80 sticky left-0 text-[10px]">SİPARİŞ</td>
                                  {activeSizes.map(s => <td key={s} className="py-2.5 px-3 border-l border-slate-100 text-slate-700 font-bold">{o.qty_by_size?.[s] || 0}</td>)}
                                  <td className="py-2.5 px-4 text-right font-black text-slate-700 bg-slate-50">{pTotal}</td>
                                </tr>
                                <tr className="border-b border-slate-100">
                                  <td className="py-2.5 px-4 text-left font-black text-slate-500 bg-slate-50/80 sticky left-0 text-[10px]">PLANLANAN</td>
                                  {activeSizes.map(s => {
                                    const planned = Math.ceil(Number(o.qty_by_size?.[s] || 0) * (1 + Number(o.extra_percent || 5) / 100));
                                    return <td key={s} className="py-2.5 px-3 border-l border-slate-100 text-slate-500 font-bold">{planned || 0}</td>;
                                  })}
                                  <td className="py-2.5 px-4 text-right font-black text-slate-500 bg-slate-50">
                                    {Math.ceil(pTotal * (1 + Number(o.extra_percent || 5) / 100))}
                                  </td>
                                </tr>
                                <tr className="border-b border-slate-100">
                                  <td className="py-2.5 px-4 text-left font-black text-emerald-600 bg-slate-50/80 sticky left-0 text-[10px]">KESİLEN</td>
                                  {activeSizes.map(s => <td key={s} className="py-2.5 px-3 border-l border-slate-100 text-emerald-700 font-black">{normCut[s] || 0}</td>)}
                                  <td className="py-2.5 px-4 text-right font-black text-emerald-700 bg-emerald-50">{cTotal}</td>
                                </tr>
                                <tr className="border-b border-slate-100">
                                  <td className="py-2.5 px-4 text-left font-black bg-slate-50/80 sticky left-0 text-[10px]" style={{ color: NAVY }}>SEVK EDİLEN</td>
                                  {activeSizes.map(s => <td key={s} className="py-2.5 px-3 border-l border-slate-100 font-black" style={{ color: NAVY }}>{o.shipped_qty?.[s] || 0}</td>)}
                                  <td className="py-2.5 px-4 text-right font-black bg-slate-50" style={{ color: NAVY }}>{sTotal}</td>
                                </tr>
                                <tr className="bg-slate-50/30">
                                  <td className="py-2.5 px-4 text-left font-black text-slate-500 bg-slate-100/50 sticky left-0 text-[10px]">FARK / FİRE</td>
                                  {activeSizes.map(s => {
                                    const diff = (Number(o.shipped_qty?.[s] || 0) - Number(normCut[s] || 0));
                                    return (
                                      <td key={s} className={`py-2.5 px-3 border-l border-slate-100 font-black text-[11px] ${diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {diff > 0 ? `+${diff}` : diff}
                                      </td>
                                    );
                                  })}
                                  <td className={`py-2.5 px-4 text-right font-black text-[11px] bg-slate-100 ${diffTotal === 0 ? 'text-slate-500' : diffTotal > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {diffTotal > 0 ? `+${diffTotal}` : diffTotal}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-8 border-t border-slate-200 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white">
          <div>© NAVY BLUE ERP — PRECISION LOGISTICS</div>
        </div>
      </div>
    </div>
  );
}