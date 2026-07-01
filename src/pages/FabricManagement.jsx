import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, CheckSquare, Square, Truck, FilePlus, AlertCircle, Package, Edit, Trash2
} from 'lucide-react';
import { 
  getOrdersWaitingForFabric, 
  createFabricPurchaseOrder, 
  getFabricOrders, 
  receiveFabricDelivery,
  updateFabricPurchaseOrder,
  deleteFabricPurchaseOrder
} from '../api/orderService';
import FabricPoPrint from '../components/orders/FabricPoPrint';
import { supabase } from '../api/orderService';

const NAVY = '#1e3a5f';

export default function FabricManagement() {
  const [activeTab, setActiveTab] = useState('pool');
  const [waitingOrders, setWaitingOrders] = useState([]);
  const [fabricOrders, setFabricOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [orderedKeys, setOrderedKeys] = useState(new Set());

  const [filterKind, setFilterKind] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [summarySearch, setSummarySearch] = useState('');
  const [showArchivedFabric, setShowArchivedFabric] = useState(false);
  const [showArchivedPos, setShowArchivedPos] = useState(false);
  const [showPoModal, setShowPoModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [printPo, setPrintPo] = useState(null);

  const [poForm, setPoForm] = useState({ supplierName: '', customQtyKg: '' });
  const [receiveForm, setReceiveForm] = useState({ receivedKg: '', receivedRolls: '' });
  const [editForm, setEditForm] = useState({ supplierName: '', orderedQtyKg: '', fabricType: '', color: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [waiting, pos] = await Promise.all([
        getOrdersWaitingForFabric(),
        getFabricOrders()
      ]);
      setWaitingOrders(waiting || []);
      setFabricOrders(pos || []);

      const { data: orderedItems } = await supabase
        .from('fabric_order_items')
        .select('order_id, fab_key');
      
      const keys = new Set((orderedItems || []).map(i => `${i.order_id}_${i.fab_key}`));
      setOrderedKeys(keys);

    } catch (err) {
      console.error("Veri yükleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const flattenedFabricPool = useMemo(() => {
    const pool = [];
    if (!waitingOrders.length) return pool;

    waitingOrders.forEach(order => {
      const isArchived = order.is_archived || order.status === 'archived';
      if (isArchived) return;

      const plannedPcs = Object.values(order.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
      
      if (order.fabrics && Object.keys(order.fabrics).length > 0) {
        Object.entries(order.fabrics).forEach(([fabKey, fab]) => {
          if (!fab.kind) return;

          const compositeKey = `${order.id}_${fabKey}`;
          if (orderedKeys.has(compositeKey)) return;
          
          const extraMultiplier = 1 + (Number(order.extra_percent || 5) / 100);
          const neededQty = Math.ceil(plannedPcs * extraMultiplier * Number(fab.perPieceKg || 0));

          pool.push({
            uniqueKey: compositeKey,
            orderId: order.id,
            fabKey: fabKey,
            orderNo: order.order_no,
            customer: order.customer || '—',
            article: order.article,
            model: order.model,
            color: order.color,
            plannedPcs,
            fabricKind: fab.kind,
            fabricColor: fab.color || order.color,
            neededQty,
            unit: fab.unit || 'KG',
            gsm: fab.gsm || '—',
            width: fab.width || fab.widthCm || '190',
            content: fab.content || '%100 Pamuk',
          });
        });
      }
    });
    return pool;
  }, [waitingOrders, orderedKeys]);

  const allKinds = useMemo(() => [...new Set(flattenedFabricPool.map(i => i.fabricKind))].sort(), [flattenedFabricPool]);
  const allColors = useMemo(() => [...new Set(flattenedFabricPool.map(i => i.fabricColor))].sort(), [flattenedFabricPool]);

  const filteredPool = useMemo(() => {
    return flattenedFabricPool.filter(item => {
      if (filterKind && item.fabricKind !== filterKind) return false;
      if (filterColor && item.fabricColor !== filterColor) return false;
      return true;
    });
  }, [flattenedFabricPool, filterKind, filterColor]);

  const toggleSelect = (uniqueKey) => {
    if (selectedItems.includes(uniqueKey)) {
      setSelectedItems(selectedItems.filter(k => k !== uniqueKey));
    } else {
      const clickedItem = flattenedFabricPool.find(i => i.uniqueKey === uniqueKey);
      const firstSelectedItem = flattenedFabricPool.find(i => selectedItems.includes(i.uniqueKey));

      if (firstSelectedItem && (firstSelectedItem.fabricColor !== clickedItem.fabricColor)) {
        alert("🚨 Farklı renkteki kumaşları tek bir toplu siparişte birleştiremezsiniz! Lütfen sadece aynı renkleri seçin.");
        return;
      }
      if (firstSelectedItem && (firstSelectedItem.fabricKind !== clickedItem.fabricKind)) {
        alert(`🚨 Farklı kumaş türlerini tek bir toplu siparişte birleştiremezsiniz!\n\nSeçili: ${firstSelectedItem.fabricKind}\nTıklanan: ${clickedItem.fabricKind}\n\nLütfen sadece aynı kumaş türünü seçin.`);
        return;
      }
      setSelectedItems([...selectedItems, uniqueKey]);
    }
  };

  const autoTotalCalculatedQty = useMemo(() => {
    return flattenedFabricPool
      .filter(i => selectedItems.includes(i.uniqueKey))
      .reduce((sum, item) => sum + item.neededQty, 0);
  }, [selectedItems, flattenedFabricPool]);

  const selectedUnit = useMemo(() => {
    const first = flattenedFabricPool.find(i => selectedItems.includes(i.uniqueKey));
    return first?.unit || 'KG';
  }, [selectedItems, flattenedFabricPool]);

  const summaryRows = useMemo(() => {
    const rows = [];
    fabricOrders.forEach(po => {
      (po.fabric_order_items || []).forEach(item => {
        const rOrd = item.orders;
        const ord = Array.isArray(rOrd) ? rOrd[0] : (rOrd || {});
        const fab = (ord.fabrics || {})[item.fab_key] || {};

        const poOrdered = Number(po.ordered_qty_kg || 0);
        const poReceived = Number(po.received_qty_kg || 0);
        const itemAllocated = Number(item.allocated_qty_kg || 0);
        const ratio = poOrdered > 0 ? itemAllocated / poOrdered : 0;
        const itemReceived = poReceived * ratio;

        rows.push({
          id: item.id,
          poNo: po.fabric_po_no,
          customer: ord.customer || '—',
          article: ord.article || '—',
          orderNo: ord.order_no || '—',
          color: fab.color || ord.color || po.color || '—',
          fabricKind: fab.kind || po.fabric_type || '—',
          fabKey: item.fab_key,
          isMain: item.fab_key === 'main',
          isArchived: ord.is_archived === true || ord.status === 'archived',
          orderedKg: itemAllocated,
          receivedKg: itemReceived,
          remainingKg: Math.max(0, itemAllocated - itemReceived),
          status: po.status,
          supplier: po.supplier_name,
        });
      });
    });

    const byArticle = {};
    rows.forEach(r => {
      const key = `${r.customer}__${r.article}__${r.orderNo}`;
      if (!byArticle[key]) byArticle[key] = [];
      byArticle[key].push(r);
    });

    Object.values(byArticle).forEach(group => {
      group.sort((a, b) => {
        if (a.isMain && !b.isMain) return -1;
        if (!a.isMain && b.isMain) return 1;
        return (a.fabKey || '').localeCompare(b.fabKey || '');
      });
    });

    const sortedGroups = Object.entries(byArticle).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

    const flatRows = [];
    sortedGroups.forEach(([key, group]) => {
      group.forEach((row, idx) => {
        flatRows.push({ ...row, groupKey: key, isFirstInGroup: idx === 0, groupSize: group.length });
      });
    });

    return flatRows;
  }, [fabricOrders]);

  const filteredSummaryRows = useMemo(() => {
    let rows = summaryRows;
    if (!showArchivedFabric) {
      rows = rows.filter(r => !r.isArchived);
    }

    if (!summarySearch.trim()) return rows;
    const q = summarySearch.toLocaleLowerCase('tr-TR');

    const matchingGroupKeys = new Set(
      rows
        .filter(r =>
          (r.article || '').toLocaleLowerCase('tr-TR').includes(q) ||
          (r.customer || '').toLocaleLowerCase('tr-TR').includes(q) ||
          (r.color || '').toLocaleLowerCase('tr-TR').includes(q) ||
          (r.fabricKind || '').toLocaleLowerCase('tr-TR').includes(q) ||
          (r.orderNo || '').toLocaleLowerCase('tr-TR').includes(q)
        )
        .map(r => r.groupKey)
    );

    return rows.filter(r => matchingGroupKeys.has(r.groupKey));
  }, [summaryRows, summarySearch, showArchivedFabric]);

  const summaryTotals = useMemo(() => {
    return filteredSummaryRows.reduce((acc, r) => ({
      ordered: acc.ordered + r.orderedKg,
      received: acc.received + r.receivedKg,
      remaining: acc.remaining + r.remainingKg,
    }), { ordered: 0, received: 0, remaining: 0 });
  }, [filteredSummaryRows]);

  // ✅ Geçilen Siparişler sekmesi için filtre
  const filteredFabricOrders = useMemo(() => {
    if (showArchivedPos) return fabricOrders;
    return fabricOrders.filter(po => {
      // PO'nun bağlı olduğu siparişlerden en az biri aktif ise göster
      const items = po.fabric_order_items || [];
      if (items.length === 0) return true; // bağlı sipariş yoksa göster
      const hasActive = items.some(item => {
        const ord = Array.isArray(item.orders) ? item.orders[0] : item.orders;
        return ord && !ord.is_archived && ord.status !== 'archived';
      });
      return hasActive;
    });
  }, [fabricOrders, showArchivedPos]);

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;
    
    const selectedPoolItems = flattenedFabricPool.filter(i => selectedItems.includes(i.uniqueKey));
    const sample = selectedPoolItems[0];
    const uniqueFabricKinds = [...new Set(selectedPoolItems.map(i => i.fabricKind))].join(' + ');

    const poData = {
      supplierName: poForm.supplierName,
      fabricType: uniqueFabricKinds,
      color: sample.fabricColor,
      orderedQtyKg: poForm.customQtyKg || autoTotalCalculatedQty,
    };

    const itemsForPo = selectedPoolItems.map(item => ({
      orderId: item.orderId,
      fabKey: item.fabKey,
      allocatedQty: item.neededQty,
    }));

    try {
      await createFabricPurchaseOrder(poData, itemsForPo);
      alert("Kumaş siparişi başarıyla oluşturuldu!");
      setShowPoModal(false);
      setSelectedItems([]);
      setPoForm({ supplierName: '', customQtyKg: '' });
      loadData();
    } catch (err) {
      alert("Hata: " + err.message);
    }
  };

  const handleReceiveDelivery = async (e) => {
    e.preventDefault();
    if (!selectedPo) return;
    try {
      await receiveFabricDelivery(selectedPo.id, receiveForm.receivedKg, receiveForm.receivedRolls);
      alert("Kumaş girişi yapıldı! İlgili artikeller otomatik olarak KESİM aşamasına aktarıldı.");
      setShowReceiveModal(false);
      setReceiveForm({ receivedKg: '', receivedRolls: '' });
      setSelectedPo(null);
      loadData();
    } catch (err) {
      alert("Hata: " + err.message);
    }
  };

  const handleOpenEditModal = (po) => {
    setSelectedPo(po);
    setEditForm({
      supplierName: po.supplier_name,
      orderedQtyKg: po.ordered_qty_kg,
      fabricType: po.fabric_type,
      color: po.color
    });
    setShowEditModal(true);
  };

  const handleUpdatePo = async (e) => {
    e.preventDefault();
    if (!selectedPo) return;
    try {
      await updateFabricPurchaseOrder(selectedPo.id, editForm);
      alert("Kumaş siparişi başarıyla güncellendi!");
      setShowEditModal(false);
      setSelectedPo(null);
      loadData();
    } catch (err) {
      alert("Güncelleme hatası: " + err.message);
    }
  };

  const handleDeletePo = async (poId, poNo) => {
    if (window.confirm(`⚠️ ${poNo} numaralı kumaş siparişini tamamen silmek istediğinize emin misiniz?\n\nBu siparişe bağlı kumaş kalemleri serbest kalacak ve tekrar havuza dönecektir.`)) {
      try {
        await deleteFabricPurchaseOrder(poId);
        alert("Kumaş siparişi iptal edildi ve kalemler havuza geri gönderildi.");
        loadData();
      } catch (err) {
        alert("Silme hatası: " + err.message);
      }
    }
  };

  const preparedPrintItems = useMemo(() => {
    if (!printPo || !printPo.fabric_order_items) return [];
    
    const itemsList = [];
    printPo.fabric_order_items.forEach(item => {
      const rawOrder = item.orders;
      const dbOrder = Array.isArray(rawOrder) ? rawOrder[0] : (rawOrder || {});
      const dbFabrics = dbOrder.fabrics || {};
      
      if (dbFabrics && typeof dbFabrics === 'object' && Object.keys(dbFabrics).length > 0) {
        Object.entries(dbFabrics).forEach(([key, fab]) => {
          if (!fab || !fab.kind) return;
          const isKindMatch = String(printPo.fabric_type).toLowerCase().includes(String(fab.kind).toLowerCase());
          const currentFabricColor = fab.color || dbOrder.color || printPo.color || '—';
          const isColorMatch = String(printPo.color).toLowerCase().trim() === String(currentFabricColor).toLowerCase().trim();
          if (isKindMatch && isColorMatch) {
            itemsList.push({
              customer: dbOrder.customer || '—',
              fabricKind: fab.kind || '—',
              gsm: fab.gsm || '—',
              width: fab.width || fab.widthCm || '190',
              content: fab.content || '%100 Pamuk',
              fabricColor: currentFabricColor,
              allocatedQtyKg: item.allocated_qty_kg
            });
          }
        });
      }
    });

    if (itemsList.length === 0 && printPo.fabric_order_items.length > 0) {
      printPo.fabric_order_items.forEach(item => {
        const rawOrder = item.orders;
        const dbOrder = Array.isArray(rawOrder) ? rawOrder[0] : (rawOrder || {});
        itemsList.push({
          customer: dbOrder.customer || '—',
          fabricKind: printPo.fabric_type || '—',
          gsm: '—',
          width: '190',
          content: '%100 Pamuk',
          fabricColor: printPo.color || '—',
          allocatedQtyKg: item.allocated_qty_kg
        });
      });
    }
    return itemsList;
  }, [printPo]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-32">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Örme, Dokuma ve Aksesuar Takip Merkezi</p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none mt-1">Kumaş ve Garni Yönetimi</h1>
        </div>

        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button onClick={() => setActiveTab('pool')}
            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'pool' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
            Kumaş Bekleyenler ({flattenedFabricPool.length})
          </button>
          <button onClick={() => setActiveTab('pos')}
            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'pos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
            Geçilen Siparişler ({fabricOrders.length})
          </button>
          <button onClick={() => setActiveTab('summary')}
            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
            Genel Kumaş Tablosu
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-32 text-slate-300 font-black animate-pulse uppercase tracking-[0.3em]">Kumaş Deposu Yükleniyor...</div>
      ) : activeTab === 'pool' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center border border-slate-100 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-slate-500">
              <AlertCircle size={16} className="text-slate-400"/>
              <p className="text-[11px] font-bold">Aynı kumaş türü ve renkteki satırları seçerek kumaşçıya tek bir toplu sipariş (PO) geçebilirsiniz.</p>
            </div>
            {selectedItems.length > 0 && (
              <button onClick={() => setShowPoModal(true)}
                className="text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity" style={{ background: NAVY }}>
                {selectedItems.length} Satır İçin Toplu Kumaş Siparişi Geç
              </button>
            )}
          </div>

          {/* KUMAŞ TÜRÜ FİLTRESİ */}
          {(allKinds.length > 0 || allColors.length > 0) && (
            <div className="border border-slate-100 rounded-xl p-4 space-y-3">
              {allKinds.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Kumaş Türü:</span>
                  <button onClick={() => setFilterKind('')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${!filterKind ? 'text-white border-transparent' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400'}`}
                    style={!filterKind ? { background: NAVY } : {}}>
                    Tümü
                  </button>
                  {allKinds.map(kind => (
                    <button key={kind} onClick={() => setFilterKind(filterKind === kind ? '' : kind)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${filterKind === kind ? 'text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'}`}
                      style={filterKind === kind ? { background: NAVY } : {}}>
                      {kind}
                    </button>
                  ))}
                </div>
              )}
              {allColors.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Renk:</span>
                  <button onClick={() => setFilterColor('')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${!filterColor ? 'text-white border-transparent' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400'}`}
                    style={!filterColor ? { background: NAVY } : {}}>
                    Tümü
                  </button>
                  {allColors.map(color => (
                    <button key={color} onClick={() => setFilterColor(filterColor === color ? '' : color)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${filterColor === color ? 'text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'}`}
                      style={filterColor === color ? { background: NAVY } : {}}>
                      {color}
                    </button>
                  ))}
                </div>
              )}
              {(filterKind || filterColor) && (
                <div className="text-[9px] font-black text-slate-400 uppercase">
                  {filteredPool.length} / {flattenedFabricPool.length} satır gösteriliyor
                  {selectedItems.length > 0 && <span className="ml-2" style={{ color: NAVY }}>· {selectedItems.length} satır seçili (filtre dışındakiler dahil)</span>}
                </div>
              )}
            </div>
          )}

          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="py-4 px-6 w-12 text-center">Seç</th>
                    <th className="py-4 px-4">Sipariş No / Müşteri</th>
                    <th className="py-4 px-4">Artikel / Model</th>
                    <th className="py-4 px-4">Kumaş Kırılımı (Tür)</th>
                    <th className="py-4 px-4 text-left">Kumaş Rengi</th>
                    <th className="py-4 px-4 text-center">İş Adeti</th>
                    <th className="py-4 px-6 text-right">Hesaplanan İhtiyaç</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                  {flattenedFabricPool.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-20 text-slate-300 uppercase tracking-widest font-black">Kumaş bekleyen yeni artikel bulunamadı.</td></tr>
                  ) : (
                    filteredPool.map(item => {
                      const isChecked = selectedItems.includes(item.uniqueKey);
                      return (
                        <tr key={item.uniqueKey} className={`hover:bg-slate-50/60 transition-colors ${isChecked ? 'bg-slate-50' : ''}`}>
                          <td className="py-4 text-center">
                            <button onClick={() => toggleSelect(item.uniqueKey)} className="text-slate-400 transition-colors" style={isChecked ? { color: NAVY } : {}}>
                              {isChecked ? <CheckSquare size={20}/> : <Square size={20} />}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-black text-slate-900 uppercase">{item.orderNo}</div>
                            <div className="text-[9px] text-slate-400 uppercase mt-0.5">{item.customer}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold uppercase text-slate-800">{item.article}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-medium">{item.model}</div>
                          </td>
                          <td className="py-4 px-4 font-black uppercase text-[11px]" style={{ color: NAVY }}>{item.fabricKind}</td>
                          <td className="py-4 px-4 text-left">
                            <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] uppercase font-black text-slate-600 inline-block">{item.fabricColor}</span>
                          </td>
                          <td className="py-4 px-4 text-center text-slate-500">{item.plannedPcs} Pcs</td>
                          <td className="py-4 px-6 text-right font-black text-sm" style={{ color: NAVY }}>
                            {item.neededQty} <span className="text-[10px] font-bold text-slate-400">{item.unit}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'pos' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowArchivedPos(!showArchivedPos)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${
                showArchivedPos ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
              style={showArchivedPos ? { background: NAVY } : {}}
            >
              {showArchivedPos ? '✓ Arşiv Dahil' : 'Sadece Aktif'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4">
          {filteredFabricOrders.length === 0 ? (
            <div className="border p-20 text-center rounded-2xl text-slate-300 font-black uppercase tracking-widest">Henüz geçilmiş bir kumaş satın alma siparişi yok.</div>
          ) : (
            filteredFabricOrders.map(po => (
              <div key={po.id} className="border border-slate-100 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-white text-[11px] font-black px-3 py-1 rounded-lg tracking-wider" style={{ background: NAVY }}>{po.fabric_po_no}</span>
                    <span className="text-base font-black text-slate-900 uppercase tracking-tight">{po.supplier_name}</span>
                    {po.received_rolls > 0 && (
                      <span className="bg-slate-50 text-slate-600 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tight border border-slate-100">📦 {po.received_rolls} Top Kumaş</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div><span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">KUMAŞ / GARNİ</span><span className="text-xs font-black uppercase" style={{ color: NAVY }}>{po.fabric_type}</span></div>
                    <div><span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">RENK</span><span className="text-xs font-black text-slate-700 uppercase">{po.color}</span></div>
                    <div><span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">SİPARİŞ EDİLEN</span><span className="text-xs font-black text-slate-900">{po.ordered_qty_kg} KG</span></div>
                    <div><span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">FİİLEN GELEN</span><span className="text-xs font-black text-emerald-600">{po.received_qty_kg || 0} / {po.ordered_qty_kg} KG</span></div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1"><Package size={10}/> Bağlı Artikeller:</span>
                    {po.fabric_order_items?.map(item => {
                      const rOrd = item.orders;
                      const singleOrd = Array.isArray(rOrd) ? rOrd[0] : (rOrd || {});
                      return (
                        <span key={item.id} className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-[9px] font-black text-slate-700 uppercase">
                          {singleOrd?.order_no || '—'} <span className="font-bold" style={{ color: NAVY }}>({singleOrd?.article || 'Tanımsız'})</span>
                          {item.fab_key && item.fab_key !== 'main' && <span className="text-slate-400"> · {item.fab_key}</span>}
                          {' '}- {item.allocated_qty_kg} Kg
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
                  {po.status !== 'completed' && (
                    <button onClick={() => { setSelectedPo(po); setShowReceiveModal(true); }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                      <Truck size={14}/> İrsaliye Girişi
                    </button>
                  )}
                  <button onClick={() => setPrintPo(po)}
                    className="flex-1 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:opacity-90" style={{ background: NAVY }}>
                    Formu PDF İndir
                  </button>
                  <button onClick={() => handleOpenEditModal(po)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 transition-all">
                    Düzenle
                  </button>
                  <button onClick={() => handleDeletePo(po.id, po.fabric_po_no)}
                    className="flex-1 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-red-200 transition-all">
                    İptal / Sil
                  </button>
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Arama + Arşiv Toggle */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="border border-slate-100 rounded-xl p-3 relative flex-1">
              <Package size={15} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                type="text"
                value={summarySearch}
                onChange={e => setSummarySearch(e.target.value)}
                placeholder="Artikel, müşteri, renk veya kumaş ara..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-lg outline-none text-[11px] font-bold"
              />
            </div>
            <button
              onClick={() => setShowArchivedFabric(!showArchivedFabric)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${
                showArchivedFabric ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
              style={showArchivedFabric ? { background: NAVY } : {}}
            >
              {showArchivedFabric ? '✓ Arşiv Dahil' : 'Sadece Aktif'}
            </button>
          </div>

          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="py-4 px-4">Müşteri / Artikel</th>
                    <th className="py-4 px-4">Renk</th>
                    <th className="py-4 px-4">Kumaş / Garni</th>
                    <th className="py-4 px-4">Tedarikçi</th>
                    <th className="py-4 px-4 text-right">Geçilen (KG)</th>
                    <th className="py-4 px-4 text-right text-emerald-600">Gelen (KG)</th>
                    <th className="py-4 px-4 text-right text-amber-600">Kalan (KG)</th>
                    <th className="py-4 px-6 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                  {filteredSummaryRows.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-20 text-slate-300 uppercase tracking-widest font-black">
                      {summarySearch ? 'Eşleşen kayıt bulunamadı.' : 'Henüz kumaş siparişi geçilmemiş.'}
                    </td></tr>
                  ) : (
                    filteredSummaryRows.map(row => (
                      <tr key={row.id} className={`hover:bg-slate-50/60 transition-colors ${row.isFirstInGroup ? 'border-t-2 border-t-slate-200' : ''}`}>
                        <td className="py-3 px-4">
                          {row.isFirstInGroup ? (
                            <>
                              <div className="font-black uppercase text-slate-900">{row.article}</div>
                              <div className="text-[9px] text-slate-400 uppercase mt-0.5">{row.customer} · {row.orderNo}</div>
                            </>
                          ) : (
                            <div className="text-[9px] text-slate-300 uppercase pl-3">└ devamı</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] uppercase font-black text-slate-600">{row.color}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-black uppercase text-[11px]" style={{ color: NAVY }}>{row.fabricKind}</span>
                          {!row.isMain && (
                            <span className="ml-1.5 text-[8px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase border border-slate-100">{row.fabKey}</span>
                          )}
                          {row.isMain && (
                            <span className="ml-1.5 text-[8px] font-black text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded uppercase border border-slate-200">ana</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 uppercase text-[10px]">{row.supplier}</td>
                        <td className="py-3 px-4 text-right">{row.orderedKg.toFixed(1)}</td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-black">{row.receivedKg.toFixed(1)}</td>
                        <td className={`py-3 px-4 text-right font-black ${row.remainingKg > 0.1 ? 'text-amber-600' : 'text-slate-300'}`}>
                          {row.remainingKg.toFixed(1)}
                        </td>
                        <td className="py-3 px-6 text-center">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                            row.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {row.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredSummaryRows.length > 0 && (
                  <tfoot className="text-white font-black text-[11px] uppercase" style={{ background: NAVY }}>
                    <tr>
                      <td colSpan="4" className="py-5 px-4 tracking-widest text-white/70">Genel Toplam</td>
                      <td className="py-5 px-4 text-right">{summaryTotals.ordered.toFixed(1)} KG</td>
                      <td className="py-5 px-4 text-right text-emerald-300">{summaryTotals.received.toFixed(1)} KG</td>
                      <td className="py-5 px-4 text-right text-amber-300">{summaryTotals.remaining.toFixed(1)} KG</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SİPARİŞ OLUŞTURMA */}
      {showPoModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-900">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-white flex items-center gap-2" style={{ background: NAVY }}>
              <FilePlus size={16}/> <h2 className="text-sm font-black uppercase tracking-tight">Satın Alma Siparişi (PO) Hazırla</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2 font-bold text-slate-600">
                <p>Kumaş Türü: <span className="font-black uppercase" style={{ color: NAVY }}>{[...new Set(flattenedFabricPool.filter(i => selectedItems.includes(i.uniqueKey)).map(i => i.fabricKind))].join(' + ')}</span></p>
                <p>Kumaş Rengi: <span className="text-slate-900 font-black uppercase">{flattenedFabricPool.find(i => selectedItems.includes(i.uniqueKey))?.fabricColor}</span></p>
                <p>Otomatik Hesaplanan Toplam: <span className="text-emerald-600 font-black">{autoTotalCalculatedQty} {selectedUnit}</span></p>
              </div>
              <form onSubmit={handleCreatePo} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Kumaşçı / Tedarikçi Adı</label>
                  <input required type="text" className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none uppercase" placeholder="Örn: MONNALISA" value={poForm.supplierName} onChange={e => setPoForm({...poForm, supplierName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Sipariş Miktarı (Opsiyonel)</label>
                  <input type="number" className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none" style={{ color: NAVY }} placeholder={`Boş bırakılırsa ${autoTotalCalculatedQty} ${selectedUnit} yazılır`} value={poForm.customQtyKg} onChange={e => setPoForm({...poForm, customQtyKg: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowPoModal(false)} className="flex-1 h-12 bg-slate-100 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors">İptal</button>
                  <button type="submit" className="flex-1 h-12 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all hover:opacity-90" style={{ background: NAVY }}>Siparişi Onayla</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: İRSALİYE GİRİŞİ */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-900">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-white flex items-center gap-2" style={{ background: NAVY }}>
              <Truck size={16}/> <h2 className="text-sm font-black uppercase tracking-tight">Fabrikaya Kumaş Girişi</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2 font-bold text-slate-600">
                <p>PO No: <span className="text-slate-900 font-black">{selectedPo?.fabric_po_no}</span></p>
                <p>Tedarikçi: <span className="text-slate-900 font-black uppercase">{selectedPo?.supplier_name}</span></p>
                <p>Kumaş / Renk: <span className="font-black uppercase" style={{ color: NAVY }}>{selectedPo?.fabric_type} / {selectedPo?.color}</span></p>
                <p>Beklenen Miktar: <span className="text-emerald-600 font-black">{selectedPo?.ordered_qty_kg} KG</span></p>
              </div>
              <form onSubmit={handleReceiveDelivery} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Gelen Net İrsaliye Kilosu (KG)</label>
                  <input required type="number" step="0.01" className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-center text-emerald-600 outline-none" placeholder="0.00" value={receiveForm.receivedKg} onChange={e => setReceiveForm({...receiveForm, receivedKg: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Gelen Top / Rulo Sayısı</label>
                  <input required type="number" className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-center outline-none" style={{ color: NAVY }} placeholder="Örn: 15" value={receiveForm.receivedRolls} onChange={e => setReceiveForm({...receiveForm, receivedRolls: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowReceiveModal(false); setSelectedPo(null); }} className="flex-1 h-11 bg-slate-100 rounded-xl font-black text-xs uppercase hover:bg-slate-200 transition-colors">Vazgeç</button>
                  <button type="submit" className="flex-1 h-11 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase hover:bg-emerald-700 transition-all">Depoya Kabul Et</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SİPARİŞ DÜZENLEME */}
      {showEditModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-900">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-white flex items-center gap-2" style={{ background: NAVY }}>
              <Edit size={16}/> <h2 className="text-sm font-black uppercase tracking-tight">Kumaş Siparişini Düzenle ({selectedPo?.fabric_po_no})</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdatePo} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Kumaşçı / Tedarikçi</label>
                  <input required type="text" className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none" value={editForm.supplierName} onChange={e => setEditForm({...editForm, supplierName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Kumaş Türü</label>
                    <input required type="text" className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none" value={editForm.fabricType} onChange={e => setEditForm({...editForm, fabricType: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Kumaş Rengi</label>
                    <input required type="text" className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Sipariş Kilosu (KG)</label>
                  <input required type="number" className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none" style={{ color: NAVY }} value={editForm.orderedQtyKg} onChange={e => setEditForm({...editForm, orderedQtyKg: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowEditModal(false); setSelectedPo(null); }} className="flex-1 h-12 bg-slate-100 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors">Vazgeç</button>
                  <button type="submit" className="flex-1 h-12 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all hover:opacity-90" style={{ background: NAVY }}>Değişiklikleri Kaydet</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {printPo && (
        <FabricPoPrint po={printPo} onClose={() => setPrintPo(null)} poolItems={preparedPrintItems} />
      )}
    </div>
  );
}