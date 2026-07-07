import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../api/orderService';
import { uploadModelImage } from '../api/orderService';
import { Plus, Trash2, Download, Save, X, Ruler, UploadCloud, Loader2 } from 'lucide-react';
import { SIZE_GROUPS } from '../constants/sizes';
import * as ExcelJS from 'exceljs';

const NAVY = '#1e3a5f';

const GARMENT_TYPES = {
  top: {
    label: 'Üst Giysi / Top',
    measurements: [
      { tr: 'Boy', en: 'Length' },
      { tr: 'Göğüs (1/2)', en: 'Chest (1/2)' },
      { tr: 'Bel (1/2)', en: 'Waist (1/2)' },
      { tr: 'Alt Etek (1/2)', en: 'Bottom Hem (1/2)' },
      { tr: 'Omuz', en: 'Shoulder' },
      { tr: 'Kol Boyu', en: 'Sleeve Length' },
      { tr: 'Kol Ağzı (1/2)', en: 'Sleeve Opening (1/2)' },
      { tr: 'Kol Evi', en: 'Armhole' },
      { tr: 'Yaka Açıklığı', en: 'Neck Opening' },
      { tr: 'Yaka Yüksekliği', en: 'Collar Height' },
    ]
  },
  bottom: {
    label: 'Alt Giysi / Bottom',
    measurements: [
      { tr: 'Boy', en: 'Length' },
      { tr: 'Bel (1/2)', en: 'Waist (1/2)' },
      { tr: 'Kalça (1/2)', en: 'Hip (1/2)' },
      { tr: 'Ön Yükselti', en: 'Front Rise' },
      { tr: 'Arka Yükselti', en: 'Back Rise' },
      { tr: 'İç Bacak', en: 'Inseam' },
      { tr: 'Dış Bacak', en: 'Outseam' },
      { tr: 'Paça Ağzı (1/2)', en: 'Leg Opening (1/2)' },
      { tr: 'Kasık (1/2)', en: 'Thigh (1/2)' },
    ]
  },
  dress: {
    label: 'Elbise / Dress',
    measurements: [
      { tr: 'Boy', en: 'Length' },
      { tr: 'Göğüs (1/2)', en: 'Chest (1/2)' },
      { tr: 'Bel (1/2)', en: 'Waist (1/2)' },
      { tr: 'Kalça (1/2)', en: 'Hip (1/2)' },
      { tr: 'Omuz', en: 'Shoulder' },
      { tr: 'Kol Boyu', en: 'Sleeve Length' },
      { tr: 'Alt Etek (1/2)', en: 'Bottom Hem (1/2)' },
      { tr: 'Yaka Açıklığı', en: 'Neck Opening' },
      { tr: 'Yaka Yüksekliği', en: 'Collar Height' },
    ]
  },
  jacket: {
    label: 'Ceket / Mont / Jacket',
    measurements: [
      { tr: 'Boy', en: 'Length' },
      { tr: 'Göğüs (1/2)', en: 'Chest (1/2)' },
      { tr: 'Bel (1/2)', en: 'Waist (1/2)' },
      { tr: 'Alt Etek (1/2)', en: 'Bottom Hem (1/2)' },
      { tr: 'Omuz', en: 'Shoulder' },
      { tr: 'Kol Boyu', en: 'Sleeve Length' },
      { tr: 'Kol Ağzı (1/2)', en: 'Sleeve Opening (1/2)' },
      { tr: 'Kol Evi', en: 'Armhole' },
      { tr: 'Yaka Açıklığı', en: 'Neck Opening' },
      { tr: 'Yaka Yüksekliği', en: 'Collar Height' },
    ]
  },
  swimwear: {
    label: 'Mayo / Bikini / Swimwear',
    measurements: [
      { tr: 'Boy', en: 'Length' },
      { tr: 'Göğüs (1/2)', en: 'Chest (1/2)' },
      { tr: 'Bel (1/2)', en: 'Waist (1/2)' },
      { tr: 'Kalça (1/2)', en: 'Hip (1/2)' },
      { tr: 'İç Bacak', en: 'Inseam' },
      { tr: 'Askı Boyu', en: 'Strap Length' },
    ]
  },
};

const getDisplayLabel = (s) => {
  const prefixes = ['B', 'K', 'S', 'Y', 'U', 'N'];
  return prefixes.includes(s.charAt(0)) && s.length > 1 ? s.substring(1) : s;
};

const buildEmptyMeasurements = (garmentType, selectedSizes) => {
  return GARMENT_TYPES[garmentType]?.measurements.map(m => ({
    tr: m.tr, en: m.en, tol: '',
    values: Object.fromEntries(selectedSizes.map(s => [s, ''])),
  })) || [];
};

export default function SizeCharts() {
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [customer, setCustomer] = useState('');
  const [modelName, setModelName] = useState('');
  const [garmentType, setGarmentType] = useState('top');
  const [sizeGroup, setSizeGroup] = useState(Object.keys(SIZE_GROUPS)[0]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [notes, setNotes] = useState('');
  const [modelImage, setModelImage] = useState(null);
  const [approvedAt, setApprovedAt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('size_charts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('Yükleme hatası:', error);
    setCharts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSizeGroupChange = (group) => {
    setSizeGroup(group);
    setSelectedSizes([]);
    setMeasurements(buildEmptyMeasurements(garmentType, []));
  };

  const toggleSize = (size) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter(s => s !== size)
      : [...selectedSizes, size];
    const ordered = SIZE_GROUPS[sizeGroup].filter(s => next.includes(s));
    setSelectedSizes(ordered);
    setMeasurements(prev => prev.map(m => ({
      ...m,
      values: Object.fromEntries(ordered.map(s => [s, m.values[s] || '']))
    })));
  };

  const handleGarmentTypeChange = (type) => {
    setGarmentType(type);
    setMeasurements(buildEmptyMeasurements(type, selectedSizes));
  };

  const updateValue = (mIdx, size, val) => {
    setMeasurements(prev => prev.map((m, i) =>
      i === mIdx ? { ...m, values: { ...m.values, [size]: val } } : m
    ));
  };

  const updateTol = (mIdx, val) => {
    setMeasurements(prev => prev.map((m, i) =>
      i === mIdx ? { ...m, tol: val } : m
    ));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadModelImage(file);
      setModelImage(url);
    } catch (err) {
      alert('Resim yüklenemedi.');
    } finally {
      setUploading(false);
    }
  };

  const startNew = () => {
    setEditingId(null);
    setCustomer('');
    setModelName('');
    setGarmentType('top');
    setSizeGroup(Object.keys(SIZE_GROUPS)[0]);
    setSelectedSizes([]);
    setMeasurements(buildEmptyMeasurements('top', []));
    setNotes('');
    setModelImage(null);
    setApprovedAt('');
    setShowForm(true);
  };

  const startEdit = (chart) => {
    setEditingId(chart.id);
    setCustomer(chart.customer);
    setModelName(chart.model_name);
    setGarmentType(chart.garment_type);
    setSizeGroup(chart.size_group);
    setSelectedSizes(chart.selected_sizes);
    setMeasurements(chart.measurements);
    setNotes(chart.notes || '');
    setModelImage(chart.model_image || null);
    setApprovedAt(chart.approved_at ? chart.approved_at.substring(0, 10) : '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!customer || !modelName || selectedSizes.length === 0) {
      alert('Müşteri, model adı ve en az bir beden seçmelisiniz.');
      return;
    }
    setSaving(true);
    const payload = {
      customer, model_name: modelName, garment_type: garmentType,
      size_group: sizeGroup, selected_sizes: selectedSizes,
      measurements, notes,
      model_image: modelImage || null,
      approved_at: approvedAt || null,
      updated_at: new Date().toISOString(),
    };
    if (editingId) {
      await supabase.from('size_charts').update(payload).eq('id', editingId);
    } else {
      await supabase.from('size_charts').insert([payload]);
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu ölçü tablosunu silmek istediğinizden emin misiniz?')) return;
    await supabase.from('size_charts').delete().eq('id', id);
    load();
  };

  // ── EXCEL EXPORT ──────────────────────────────────────────────
  const exportExcel = async (chart) => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Size Chart');

    const sizes = chart.selected_sizes;
    const ROW_H = 18;
    const NAVY_HEX = 'FF1E3A5F';
    const WHITE = 'FFFFFFFF';
    const LIGHT = 'FFF8F9FA';
    const BORDER_COLOR = 'FF000000';

    ws.pageSetup.orientation = 'landscape';
    ws.pageSetup.paperSize = 9;
    ws.pageSetup.fitToPage = true;
    ws.pageSetup.fitToWidth = 1;
    ws.pageSetup.fitToHeight = 0;
    ws.pageSetup.horizontalCentered = true;

    const allThin = { style: 'thin', color: { argb: BORDER_COLOR } };
    const allBorder = { top: allThin, bottom: allThin, left: allThin, right: allThin };

    // Sütun sayısı: TR + EN + bedenler + TOL
    const colCount = 2 + sizes.length + 1;

    // ── BAŞLIK ──
    ws.mergeCells(1, 1, 1, colCount);
    const t = ws.getCell('A1');
    t.value = 'SIZE CHART / ÖLÇÜ TABLOSU';
    t.font = { name: 'Arial', size: 14, bold: true, color: { argb: WHITE } };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEX } };
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = ROW_H;

    // ── BİLGİ SATIRLARI ──
    ws.addRow([]);
    ws.getCell(2, 1).value = `Customer / Müşteri:`;
    ws.getCell(2, 1).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(2, 2).value = chart.customer;
    ws.getCell(2, 2).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(2, colCount).value = chart.approved_at
      ? new Date(chart.approved_at).toLocaleDateString('tr-TR')
      : new Date(chart.created_at).toLocaleDateString('tr-TR');
    ws.getCell(2, colCount).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(2, colCount).alignment = { horizontal: 'right' };
    ws.getRow(2).height = ROW_H;

    ws.addRow([]);
    ws.getCell(3, 1).value = `Style / Model:`;
    ws.getCell(3, 1).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(3, 2).value = chart.model_name;
    ws.getCell(3, 2).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(3, colCount - 1).value = 'Approval / Onay:';
    ws.getCell(3, colCount - 1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B7280' } };
    ws.getCell(3, colCount).value = chart.approved_at
      ? new Date(chart.approved_at).toLocaleDateString('tr-TR')
      : '—';
    ws.getCell(3, colCount).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(3, colCount).alignment = { horizontal: 'right' };
    ws.getRow(3).height = ROW_H;

    ws.addRow([]);
    ws.getCell(4, 1).value = GARMENT_TYPES[chart.garment_type]?.label || '';
    ws.getCell(4, 1).font = { name: 'Arial', size: 9, color: { argb: 'FF6B7280' } };
    ws.getRow(4).height = ROW_H;

    // Model resmi varsa ekle
    if (chart.model_image) {
      try {
        const response = await fetch(chart.model_image);
        const buffer = await response.arrayBuffer();
        const ext = chart.model_image.split('.').pop().toLowerCase().replace(/\?.*/, '');
        const imageType = ['jpg', 'jpeg'].includes(ext) ? 'jpeg' : 'png';
        const imageId = wb.addImage({ buffer, extension: imageType });
        ws.addImage(imageId, {
          tl: { col: colCount - 1.8, row: 0.2 },
          br: { col: colCount, row: 4 },
        });
      } catch (e) {
        console.warn('Resim eklenemedi:', e);
      }
    }

    ws.addRow([]); ws.getRow(5).height = ROW_H;

    // ── TABLO BAŞLIĞI ──
    const headerVals = ['Ölçü / Measurement', 'TR / EN', ...sizes.map(s => getDisplayLabel(s)), 'TOL (±cm)'];
    const headerRow = ws.addRow(headerVals);
    headerRow.height = ROW_H;
    headerRow.eachCell((cell, ci) => {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEX } };
      cell.alignment = { horizontal: ci <= 2 ? 'left' : 'center', vertical: 'middle' };
      cell.border = allBorder;
    });

    // ── ÖLÇÜ SATIRLARI ──
    chart.measurements.forEach((m, idx) => {
      const isAlt = idx % 2 === 1;
      const rowVals = [
        m.tr, m.en,
        ...sizes.map(s => {
          const v = m.values[s];
          // ✅ Sayısal değerleri Number olarak kaydet (metin uyarısı kalkıyor)
          const num = parseFloat(v);
          return (!v || v === '') ? '' : isNaN(num) ? v : num;
        }),
        m.tol ? parseFloat(m.tol) || m.tol : '',
      ];
      const row = ws.addRow(rowVals);
      row.height = ROW_H;
      row.eachCell((cell, ci) => {
        cell.font = { name: 'Arial', size: 9, bold: ci === 1 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? LIGHT : WHITE } };
        cell.alignment = { horizontal: ci <= 2 ? 'left' : 'center', vertical: 'middle' };
        cell.border = allBorder; // ✅ Full kenarlık
        if (ci > 2 && ci < colCount + 1 && typeof cell.value === 'number') {
          cell.numFmt = '0.0';
        }
        if (ci === colCount) {
          cell.font = { name: 'Arial', size: 9, color: { argb: 'FFEF4444' } };
        }
      });
    });

    if (chart.notes) {
      ws.addRow([]); ws.getRow(ws.lastRow.number).height = ROW_H;
      const noteRow = ws.addRow([`Notes / Notlar: ${chart.notes}`]);
      ws.mergeCells(noteRow.number, 1, noteRow.number, colCount);
      noteRow.getCell(1).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF6B7280' } };
      noteRow.height = ROW_H;
    }

    // ── SÜTUN GENİŞLİKLERİ ──
    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 22;
    for (let i = 3; i <= 2 + sizes.length; i++) {
      ws.getColumn(i).width = 8;
    }
    ws.getColumn(colCount).width = 10;

    // ✅ .xlsx olarak kaydet (buffer → Blob → link tıklama)
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = `${chart.customer}-${chart.model_name}-size-chart.xlsx`
      .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 pb-32">

      <div className="flex items-center justify-between pt-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Teknik Paket</p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none mt-1">Ölçü Tabloları</h1>
        </div>
        <button onClick={startNew}
          className="flex items-center gap-2 px-6 py-3 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity"
          style={{ background: NAVY }}>
          <Plus size={16}/> Yeni Ölçü Tablosu
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-300 font-black text-[10px] uppercase animate-pulse">Yükleniyor...</div>
      ) : charts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl text-slate-300 font-black text-[10px] uppercase">
          Henüz ölçü tablosu eklenmemiş
        </div>
      ) : (
        <div className="grid gap-4">
          {charts.map(chart => (
            <div key={chart.id} className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 shrink-0 bg-slate-50 flex items-center justify-center"
                  style={!chart.model_image ? { background: NAVY } : {}}>
                  {chart.model_image
                    ? <img src={chart.model_image} className="w-full h-full object-cover" alt="model"/>
                    : <Ruler size={18} className="text-white"/>}
                </div>
                <div>
                  <div className="font-black text-slate-900 uppercase tracking-tight">{chart.model_name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{chart.customer}</span>
                    <span className="text-slate-200">·</span>
                    <span className="text-[9px] font-bold uppercase" style={{ color: NAVY }}>{GARMENT_TYPES[chart.garment_type]?.label}</span>
                    <span className="text-slate-200">·</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{chart.size_group}</span>
                    <span className="text-slate-200">·</span>
                    <span className="text-[9px] font-bold text-slate-400">
                      {chart.selected_sizes.map(s => getDisplayLabel(s)).join(' / ')}
                    </span>
                    {chart.approved_at && (
                      <>
                        <span className="text-slate-200">·</span>
                        <span className="text-[9px] font-bold text-emerald-600">✓ Onay: {new Date(chart.approved_at).toLocaleDateString('tr-TR')}</span>
                      </>
                    )}
                  </div>
                  <div className="text-[8px] text-slate-300 mt-1">
                    {new Date(chart.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => exportExcel(chart)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all">
                  <Download size={14}/> Excel
                </button>
                <button onClick={() => startEdit(chart)}
                  className="px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase border border-slate-200 hover:bg-slate-100 transition-all">
                  Düzenle
                </button>
                <button onClick={() => handleDelete(chart.id)}
                  className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl my-6">
            <div className="p-6 text-white flex items-center justify-between rounded-t-2xl" style={{ background: NAVY }}>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tight">
                  {editingId ? 'Ölçü Tablosunu Düzenle' : 'Yeni Ölçü Tablosu'}
                </h2>
                <p className="text-[10px] text-white/60 mt-0.5 uppercase">2 Dilli — TR / EN</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={20}/></button>
            </div>

            <div className="p-6 space-y-6">
              {/* TEMEL BİLGİLER */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Müşteri</label>
                  <input type="text" value={customer} onChange={e => setCustomer(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none uppercase"
                    placeholder="MONNALISA" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Model Adı</label>
                  <input type="text" value={modelName} onChange={e => setModelName(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                    placeholder="Oversized T-shirt" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Giysi Türü</label>
                  <select value={garmentType} onChange={e => handleGarmentTypeChange(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                    {Object.entries(GARMENT_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MODEL RESMİ + ONAY TARİHİ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Model Resmi (Opsiyonel)</label>
                  <div className="flex items-center gap-3">
                    {modelImage && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                        <img src={modelImage} className="w-full h-full object-cover" alt="model"/>
                      </div>
                    )}
                    <div className="relative flex-1 h-11 bg-slate-50 border border-slate-200 rounded-xl flex items-center px-3 cursor-pointer hover:bg-white transition-all overflow-hidden">
                      {uploading ? (
                        <div className="flex items-center gap-2 font-black text-[9px] uppercase" style={{ color: NAVY }}>
                          <Loader2 size={14} className="animate-spin"/> Yükleniyor...
                        </div>
                      ) : (
                        <>
                          <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10"/>
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] font-black text-slate-500 uppercase">
                              {modelImage ? 'Resim Hazır ✅' : 'Resim Yükle'}
                            </span>
                            <UploadCloud size={16} className="text-slate-400"/>
                          </div>
                        </>
                      )}
                    </div>
                    {modelImage && (
                      <button onClick={() => setModelImage(null)} className="p-2 text-red-400 hover:text-red-600">
                        <X size={16}/>
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Onay Tarihi (Opsiyonel)</label>
                  <input type="date" value={approvedAt} onChange={e => setApprovedAt(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"/>
                </div>
              </div>

              {/* BEDEN GRUBU */}
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Beden Grubu</label>
                <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 rounded-xl w-fit border border-slate-100">
                  {Object.keys(SIZE_GROUPS).map(group => (
                    <button key={group} type="button" onClick={() => handleSizeGroupChange(group)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${sizeGroup === group ? 'bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      style={sizeGroup === group ? { color: NAVY } : {}}>
                      {group}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {SIZE_GROUPS[sizeGroup].map(size => {
                    const isSelected = selectedSizes.includes(size);
                    return (
                      <button key={size} type="button" onClick={() => toggleSize(size)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${isSelected ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                        style={isSelected ? { background: NAVY } : {}}>
                        {getDisplayLabel(size)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ÖLÇÜ TABLOSU */}
              {selectedSizes.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ölçü Değerleri (cm)</label>
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="text-[9px] font-black text-white uppercase" style={{ background: NAVY }}>
                          <th className="py-3 px-4 text-left w-36">Ölçü / TR</th>
                          <th className="py-3 px-4 text-left w-36">Measurement / EN</th>
                          {selectedSizes.map(s => (
                            <th key={s} className="py-3 px-3 text-center min-w-14">{getDisplayLabel(s)}</th>
                          ))}
                          <th className="py-3 px-3 text-center w-16 text-red-300">TOL ±</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {measurements.map((m, mIdx) => (
                          <tr key={mIdx} className={mIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="py-2 px-4 font-black text-slate-700 text-[10px]">{m.tr}</td>
                            <td className="py-2 px-4 text-slate-400 text-[10px]">{m.en}</td>
                            {selectedSizes.map(s => (
                              <td key={s} className="py-1.5 px-1">
                                <input type="number" step="0.1"
                                  value={m.values[s] || ''}
                                  onChange={e => updateValue(mIdx, s, e.target.value)}
                                  className="w-full h-8 text-center rounded-lg bg-white border border-slate-200 outline-none text-xs font-bold"
                                  style={{ color: NAVY }} placeholder="—"/>
                              </td>
                            ))}
                            <td className="py-1.5 px-1">
                              <input type="number" step="0.5"
                                value={m.tol || ''}
                                onChange={e => updateTol(mIdx, e.target.value)}
                                className="w-full h-8 text-center rounded-lg bg-red-50 border border-red-100 outline-none text-xs font-bold text-red-500"
                                placeholder="1"/>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notlar</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none"/>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors">
                  İptal
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: NAVY }}>
                  <Save size={16}/> {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}