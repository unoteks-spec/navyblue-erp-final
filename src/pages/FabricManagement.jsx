import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, 
  CheckSquare, 
  Square, 
  Truck, 
  FilePlus, 
  AlertCircle, 
  Package,
  Edit,
  Trash2
} from 'lucide-react';
import { 
  getOrdersWaitingForFabric, 
  createFabricPurchaseOrder, 
  getFabricOrders, 
  receiveFabricDelivery,
  updateFabricPurchaseOrder,
  deleteFabricPurchaseOrder
} from '../api/orderService';

export default function FabricManagement() {
  const [activeTab, setActiveTab] = useState('pool'); // pool | pos
  const [waitingOrders, setWaitingOrders] = useState([]);
  const [fabricOrders, setFabricOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Seçilen Kumaş Satırlarının State'i
  const [selectedItems, setSelectedItems] = useState([]);

  // Modal State'leri
  const [showPoModal, setShowPoModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);

  // Form State'leri
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
      setWaitingOrders(waiting);
      setFabricOrders(pos);
    } catch (err) {
      console.error("Veri yükleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Kumaş Kırılım Motoru
  const flattenedFabricPool = useMemo(() => {
    const pool = [];
    waitingOrders.forEach(order => {
      const plannedPcs = Object.values(order.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
      
      if (order.fabrics && Object.keys(order.fabrics).length > 0) {
        Object.entries(order.fabrics).forEach(([fabKey, fab]) => {
          if (!fab.kind) return;
          
          const extraMultiplier = 1 + (Number(order.extra_percent || 5) / 100);
          const neededKg = Math.ceil(plannedPcs * extraMultiplier * Number(fab.perPieceKg || 0));

          pool.push({
            uniqueKey: `${order.id}_${fabKey}`,
            orderId: order.id,
            orderNo: order.order_no,
            customer: order.customer,
            article: order.article,
            model: order.model,
            color: order.color,
            plannedPcs,
            fabricKey: fabKey,
            fabricKind: fab.kind,
            fabricColor: fab.color || order.color,
            neededKg,
            isOrdered: order.fabric_ordered
          });
        });
      }
    });
    return pool.filter(item => !item.isOrdered);
  }, [waitingOrders]);

  const toggleSelect = (uniqueKey) => {
    if (selectedItems.includes(uniqueKey)) {
      setSelectedItems(selectedItems.filter(k => k !== uniqueKey));
    } else {
      const clickedItem = flattenedFabricPool.find(i => i.uniqueKey === uniqueKey);
      const firstSelectedItem = flattenedFabricPool.find(i => selectedItems.includes(i.uniqueKey));
      
      if (firstSelectedItem && (firstSelectedItem.fabricKind !== clickedItem.fabricKind || firstSelectedItem.fabricColor !== clickedItem.fabricColor)) {
        alert("🚨 Farklı türde veya farklı renkteki kumaşları tek bir toplu siparişte birleştiremezsiniz! Lütfen sadece aynı kumaş ve renkleri seçin.");
        return;
      }
      setSelectedItems([...selectedItems, uniqueKey]);
    }
  };

  const autoTotalCalculatedKg = useMemo(() => {
    return flattenedFabricPool
      .filter(i => selectedItems.includes(i.uniqueKey))
      .reduce((sum, item) => sum + item.neededKg, 0);
  }, [selectedItems, flattenedFabricPool]);

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;
    
    const selectedPoolItems = flattenedFabricPool.filter(i => selectedItems.includes(i.uniqueKey));
    const sample = selectedPoolItems[0];

    const allocatedMap = {};
    selectedPoolItems.forEach(item => {
      allocatedMap[item.orderId] = item.neededKg;
    });

    const poData = {
      supplierName: poForm.supplierName,
      fabricType: sample.fabricKind,
      color: sample.fabricColor,
      orderedQtyKg: poForm.customQtyKg || autoTotalCalculatedKg,
      allocatedMap
    };

    const orderIds = [...new Set(selectedPoolItems.map(i => i.orderId))];

    try {
      await createFabricPurchaseOrder(poData, orderIds);
      alert("Kumaş siparişi başarıyla oluşturuldu ve artikeller mühürlendi!");
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
    if (window.confirm(`⚠️ ${poNo} numaralı kumaş siparişini tamamen silmek istediğinize emin misiniz?\n\nBu siparişe bağlı tüm artikeller serbest kalacak ve tekrar "Kumaş Bekleyenler" havuzuna dönecektir.`)) {
      try {
        await deleteFabricPurchaseOrder(poId);
        alert("Kumaş siparişi iptal edildi ve artikeller havuza geri gönderildi.");
        loadData();
      } catch (err) {
        alert("Silme hatası: " + err.message);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-32">
      
      {/* Üst Başlık Paneli */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl"><Layers size={24} /></div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Kumaş ve Garni Yönetimi</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-1">Örme, Dokuma ve Aksesuar Takip Merkezi</p>
          </div>
        </div>

        {/* Tab Butonları */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          <button 
            onClick={() => setActiveTab('pool')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'pool' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
          >
            Kumaş Bekleyenler ({flattenedFabricPool.length})
          </button>
          <button 
            onClick={() => setActiveTab('pos')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'pos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
          >
            Geçilen Siparişler / Yoldakiler ({fabricOrders.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-32 text-slate-300 font-black animate-pulse uppercase tracking-[0.3em]">Kumaş Deposu Yükleniyor...</div>
      ) : activeTab === 'pool' ? (
        
        /* ------------------ SEKME 1: KUMAŞ BEKLEYENLER HAVUZU ------------------ */
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <AlertCircle size={16} className="text-blue-500"/>
              <p className="text-[11px] font-bold">Aynı kumaş türü ve renkteki satırları seçerek kumaşçıya tek bir toplu sipariş (PO) geçebilirsiniz.</p>
            </div>
            {selectedItems.length > 0 && (
              <button 
                onClick={() => setShowPoModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all"
              >
                {selectedItems.length} Satır İçin Toplu Kumaş Siparişi Geç
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="py-5 px-6 w-12 text-center">Seç</th>
                    <th className="py-5 px-4">Sipariş No / Müşteri</th>
                    <th className="py-5 px-4">Artikel / Model</th>
                    <th className="py-5 px-4 text-blue-400">Kumaş Kırılımı (Tür)</th>
                    <th className="py-5 px-4 text-blue-400 text-center">Kumaş Rengi</th>
                    <th className="py-5 px-4 text-center">İş Adeti</th>
                    <th className="py-5 px-6 text-right text-emerald-400">Hesaplanan İhtiyaç</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {flattenedFabricPool.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-20 text-slate-300 uppercase tracking-widest font-black">Kumaş bekleyen yeni artikel bulunamadı.</td></tr>
                  ) : (
                    flattenedFabricPool.map(item => {
                      const isChecked = selectedItems.includes(item.uniqueKey);
                      return (
                        <tr key={item.uniqueKey} className={`hover:bg-blue-50/40 transition-colors ${isChecked ? 'bg-blue-50/70' : ''}`}>
                          <td className="py-4 text-center">
                            <button onClick={() => toggleSelect(item.uniqueKey)} className="text-slate-400 hover:text-blue-600 transition-colors">
                              {isChecked ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
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
                          <td className="py-4 px-4 font-black text-blue-600 uppercase text-[11px]">{item.fabricKind}</td>
                          <td className="py-4 px-4 text-center"><span className="px-2.5 py-1 bg-slate-100 border rounded-lg text-[10px] uppercase font-black text-slate-600">{item.fabricColor}</span></td>
                          <td className="py-4 px-4 text-center text-slate-500">{item.plannedPcs} Pcs</td>
                          <td className="py-4 px-6 text-right font-black text-emerald-600 text-sm italic">{item.neededKg} <span className="text-[10px] font-bold text-slate-400">KG</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        
        /* ------------------ SEKME 2: GEÇİLEN SİPARİŞLER ------------------ */
        <div className="grid grid-cols-1 gap-4">
          {fabricOrders.length === 0 ? (
            <div className="bg-white border p-20 text-center rounded-[2.5rem] text-slate-300 font-black uppercase tracking-widest">Henüz geçilmiş bir kumaş satın alma siparişi yok.</div>
          ) : (
            fabricOrders.map(po => {
              return (
                <div key={po.id} className="bg-white border border-slate-100 p-6 rounded-4xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-900 text-white text-[11px] font-black px-3 py-1 rounded-xl tracking-wider">{po.fabric_po_no}</span>
                      <span className="text-base font-black text-slate-900 uppercase italic tracking-tight">{po.supplier_name}</span>
                      {po.received_rolls > 0 && (
                        <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tight">📦 {po.received_rolls} Top Kumaş</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                      <div><span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">KUMAŞ / GARNİ</span><span className="text-xs font-black text-blue-600 uppercase">{po.fabric_type}</span></div>
                      <div><span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">RENK</span><span className="text-xs font-black text-slate-700 uppercase">{po.color}</span></div>
                      <div><span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">SİPARİŞ EDİLEN</span><span className="text-xs font-black text-slate-900 italic">{po.ordered_qty_kg} KG</span></div>
                      <div><span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">FİELEN GELEN</span><span className="text-xs font-black text-emerald-600 italic">{po.received_qty_kg || 0} / {po.ordered_qty_kg} KG</span></div>
                    </div>

                    {/* 🛠️ GÜNCELLENEN ROZET ALANI: Sipariş No yanına Artikel İsmi de eklendi */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1"><Package size={10}/> Bağlı Artikeller:</span>
                      {po.fabric_order_items?.map(item => (
                        <span key={item.id} className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-[9px] font-black text-slate-700 uppercase shadow-sm">
                          {item.orders?.order_no} <span className="text-blue-600 font-bold">({item.orders?.article || 'Tanımsız'})</span> - {item.allocated_qty_kg} Kg
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
                    {po.status !== 'completed' && (
                      <button 
                        onClick={() => { setSelectedPo(po); setShowReceiveModal(true); }}
                        className="flex-1 bg-emerald-600 hover:bg-slate-900 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all"
                      >
                        <Truck size={14}/> İrsaliye Girişi
                      </button>
                    )}
                    <button 
                      onClick={() => handleOpenEditModal(po)}
                      className="flex-1 bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 transition-all"
                    >
                      <Edit size={14}/> Düzenle
                    </button>
                    <button 
                      onClick={() => handleDeletePo(po.id, po.fabric_po_no)}
                      className="flex-1 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-red-200 transition-all"
                    >
                      <Trash2 size={14}/> İptal / Sil
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL 1: SİPARİŞ OLUŞTURMA */}
      {showPoModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-900">
          <div className="bg-white w-full max-w-md rounded-4xl shadow-2xl p-6 space-y-6">
            <h2 className="text-sm font-black uppercase border-b pb-3 flex items-center gap-2 text-blue-600"><FilePlus size={16}/> Satın Alma Siparişi (PO) Hazırla</h2>
            
            <div className="bg-slate-50 p-4 rounded-2xl border text-xs space-y-2 font-bold text-slate-600">
              <p>Kumaş Türü: <span className="text-blue-600 font-black uppercase">{flattenedFabricPool.find(i => selectedItems.includes(i.uniqueKey))?.fabricKind}</span></p>
              <p>Kumaş Rengi: <span className="text-slate-900 font-black uppercase">{flattenedFabricPool.find(i => selectedItems.includes(i.uniqueKey))?.fabricColor}</span></p>
              <p>Otomatik Hesaplanan Toplam: <span className="text-emerald-600 font-black italic">{autoTotalCalculatedKg} KG</span></p>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Kumaşçı / Tedarikçi Adı</label>
                <input required type="text" className="w-full h-11 px-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none" placeholder="Örn: Örme Tekstil A.Ş." value={poForm.supplierName} onChange={e => setPoForm({...poForm, supplierName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Sipariş Kilosu (Elle Müdahale - Opsiyonel)</label>
                <input type="number" className="w-full h-11 px-3 bg-slate-50 border rounded-xl text-xs font-black text-blue-600 outline-none" placeholder={`Boş bırakılırsa ${autoTotalCalculatedKg} KG yazılır`} value={poForm.customQtyKg} onChange={e => setPoForm({...poForm, customQtyKg: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPoModal(false)} className="flex-1 h-12 bg-slate-100 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors">İptal</button>
                <button type="submit" className="flex-1 h-12 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-900 transition-all shadow-lg">Siparişi Onayla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: İRSALİYE GİRİŞİ */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-900">
          <div className="bg-white w-full max-w-sm rounded-4xl shadow-2xl p-6 space-y-6">
            <h2 className="text-sm font-black uppercase border-b pb-3 flex items-center gap-2 text-emerald-600"><Truck size={16}/> Fabrikaya Kumaş Girişi</h2>
            
            <div className="bg-slate-50 p-4 rounded-2xl border text-xs space-y-1 font-bold text-slate-600">
              <p>Sipariş No: <span className="text-slate-900 font-black">{selectedPo?.fabric_po_no}</span></p>
              <p>Tedarikçi: <span className="text-slate-900 font-black uppercase">{selectedPo?.supplier_name}</span></p>
              <p>Beklenen Kilo: <span className="text-blue-600 font-black italic">{selectedPo?.ordered_qty_kg} KG</span></p>
            </div>

            <form onSubmit={handleReceiveDelivery} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Gelen Net İrsaliye Kilosu (KG)</label>
                <input required type="number" step="0.01" className="w-full h-11 px-4 bg-slate-50 border rounded-xl text-sm font-black text-center text-emerald-600 outline-none" placeholder="0.00" value={receiveForm.receivedKg} onChange={e => setReceiveForm({...receiveForm, receivedKg: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Gelen Top / Rulo Sayısı</label>
                <input required type="number" className="w-full h-11 px-4 bg-slate-50 border rounded-xl text-sm font-black text-center text-blue-600 outline-none" placeholder="Örn: 15" value={receiveForm.receivedRolls} onChange={e => setReceiveForm({...receiveForm, receivedRolls: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowReceiveModal(false); setSelectedPo(null); }} className="flex-1 h-11 bg-slate-100 rounded-xl font-black text-xs uppercase hover:bg-slate-200 transition-colors">Vazgeç</button>
                <button type="submit" className="flex-1 h-11 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase hover:bg-slate-900 transition-all shadow-lg">Depoya Kabul Et</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SİPARİŞ DÜZENLEME */}
      {showEditModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-900">
          <div className="bg-white w-full max-w-md rounded-4xl shadow-2xl p-6 space-y-6">
            <h2 className="text-sm font-black uppercase border-b pb-3 flex items-center gap-2 text-amber-600"><Edit size={16}/> Kumaş Siparişini Düzenle ({selectedPo?.fabric_po_no})</h2>
            
            <form onSubmit={handleUpdatePo} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Kumaşçı / Tedarikçi</label>
                <input required type="text" className="w-full h-11 px-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none" value={editForm.supplierName} onChange={e => setEditForm({...editForm, supplierName: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Kumaş Türü</label>
                  <input required type="text" className="w-full h-11 px-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none" value={editForm.fabricType} onChange={e => setEditForm({...editForm, fabricType: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Kumaş Rengi</label>
                  <input required type="text" className="w-full h-11 px-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Sipariş Kilosu (KG)</label>
                <input required type="number" className="w-full h-11 px-3 bg-slate-50 border rounded-xl text-xs font-black text-amber-600 outline-none" value={editForm.orderedQtyKg} onChange={e => setEditForm({...editForm, orderedQtyKg: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedPo(null); }} className="flex-1 h-12 bg-slate-100 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors">Vazgeç</button>
                <button type="submit" className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg">Değişiklikleri Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}