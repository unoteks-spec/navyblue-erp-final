import React, { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStage, supabase } from '../api/orderService';
import {
  Clock, User, Hash, Archive, PackageCheck, AlertCircle,
  ClipboardCheck, Truck, Pencil, Check, X, GripVertical, Calculator
} from 'lucide-react';
import ShipmentResultModal from '../components/orders/ShipmentResultModal';
import {
  DndContext, DragOverlay, closestCenter, useSensor, useSensors,
  PointerSensor, KeyboardSensor, TouchSensor
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';

const NAVY = '#1e3a5f';

const STAGES = [
  { key: 'kesimhanede', label: 'KESİMHANE', isFason: false },
  { key: 'baski', label: 'BASKIDA', isFason: true },
  { key: 'nakis', label: 'NAKIŞTA', isFason: true },
  { key: 'dikim', label: 'DİKİMDE', isFason: true },
  { key: 'ilik_dugme', label: 'İLİK-DÜĞME', isFason: true },
  { key: 'yikama_boyama', label: 'YIKAMA-BOYAMA', isFason: true },
  { key: 'utu_ambalaj', label: 'ÜTÜ AMBALAJ', isFason: true },
  { key: 'yuklendi', label: 'YÜKLENDİ', isFason: false }
];

// ───────────────────────── KART (minimal: resim + artikel + renk) ─────────────────────────
function OrderCard({ order, stage, onOpenDetail }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { order, fromStage: stage.key },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  const needsWaybill = order.waybill_tracking_active && !order.is_waybill_issued;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl shadow-sm border transition-all ${
        needsWaybill ? 'border-red-300 ring-1 ring-red-50' : 'border-slate-100'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-1.5 p-2">
        <div
          {...listeners}
          {...attributes}
          className="p-0.5 -ml-0.5 text-slate-300 cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <GripVertical size={13}/>
        </div>

        <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-100 shrink-0 bg-slate-50 flex items-center justify-center">
          {order.model_image
            ? <img src={order.model_image} className="w-full h-full object-cover" alt="model" draggable={false}/>
            : <Hash size={13} className="text-slate-200"/>}
        </div>

        <div
          className="min-w-0 flex-1 overflow-hidden cursor-pointer"
          onClick={() => onOpenDetail(order)}
          title={`${order.article}${order.color ? ' — ' + order.color : ''}`}
        >
          <div className="font-black text-[10.5px] text-slate-900 tracking-tighter uppercase truncate leading-tight">
            {order.article}
          </div>
          {order.color && (
            <div className="text-[8.5px] font-black uppercase truncate leading-tight mt-0.5" style={{ color: NAVY }}>
              {order.color}
            </div>
          )}
        </div>

        {needsWaybill && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" title="İrsaliye bekliyor"/>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── SÜTUN (drop alanı) ─────────────────────────
function StageColumn({ stage, index, orders, onOpenDetail }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });

  return (
    <div className="flex flex-col gap-3 min-w-64 snap-center h-full lg:min-w-0 lg:flex-1 lg:snap-none">
      <div className={`p-4 lg:p-3 rounded-xl border-b-2 transition-all shrink-0 ${
        stage.key === 'yuklendi' ? 'text-white' : 'bg-white border-slate-200 text-slate-800'
      }`} style={stage.key === 'yuklendi' ? { background: NAVY, borderColor: NAVY } : {}}>
        <div className="flex justify-between items-center mb-0.5">
          <div className="text-[8px] font-black opacity-60 uppercase tracking-widest">AŞAMA {index + 1}</div>
          <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stage.key === 'yuklendi' ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{orders.length}</div>
        </div>
        <h3 className="text-xs md:text-sm lg:text-[11px] xl:text-xs font-black tracking-widest lg:tracking-wider uppercase truncate">{stage.label}</h3>
      </div>

      <div ref={setNodeRef} className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-2 p-2 lg:p-1.5 rounded-2xl border transition-all duration-200 ${
        isOver
          ? 'bg-[#1e3a5f]/[0.06] border-[#1e3a5f]/40 shadow-inner'
          : 'bg-slate-50/70 border-slate-100'
      }`}>
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            stage={stage}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── DETAY MODALI ─────────────────────────
function OrderDetailModal({ order, onClose, onSaveWaybill, onArchive }) {
  const stage = STAGES.find(s => s.key === (order.current_stage || 'kesimhanede')) || STAGES[0];
  const totalQty = Object.values(order.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
  const entryDate = order.tracking?.[stage.key]
    ? new Date(order.tracking[stage.key]).toLocaleDateString('tr-TR')
    : '—';

  const [editingWaybill, setEditingWaybill] = useState(false);
  const [waybillInput, setWaybillInput] = useState('');
  const [workshopInput, setWorkshopInput] = useState('');

  const needsWaybill = order.waybill_tracking_active && !order.is_waybill_issued;
  const showWaybillForm = needsWaybill || editingWaybill;

  const handleSave = () => {
    const val = document.getElementById(`modal-waybill-input`)?.value;
    const workshopVal = document.getElementById(`modal-workshop-input`)?.value;
    if (!val) return;
    onSaveWaybill(order.id, val, workshopVal);
    setEditingWaybill(false);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="p-5 text-white flex items-center justify-between shrink-0" style={{ background: NAVY }}>
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-tight truncate">{order.article}</h2>
            <p className="text-[10px] text-white/60 uppercase truncate mt-0.5">{order.color || '—'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors shrink-0"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">

          {/* RESİM + BİLGİLER */}
          <div className="flex gap-4">
            <div className="w-24 h-28 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0">
              {order.model_image
                ? <img src={order.model_image} className="w-full h-full object-cover" alt="model"/>
                : <Hash size={24} className="text-slate-200"/>}
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              {[
                { label: 'Müşteri', value: order.customer || '—', icon: User },
                { label: 'Aşama', value: stage.label, icon: PackageCheck },
                { label: 'Giriş', value: entryDate, icon: Clock },
                { label: 'Kesilen', value: `${totalQty} Adet`, icon: Calculator },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2">
                  <f.icon size={12} className="text-slate-300 shrink-0"/>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest w-14 shrink-0">{f.label}</span>
                  <span className="text-xs font-black text-slate-800 uppercase truncate">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* İRSALİYE BÖLÜMÜ — sadece fason aşamalarda */}
          {stage.isFason && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Fason / İrsaliye Takibi</p>

              {!order.waybill_tracking_active ? (
                <button
                  onClick={() => onSaveWaybill(order.id, 'START_TRACKING')}
                  className="w-full py-3 bg-slate-50 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-100 transition-all"
                  style={{ color: NAVY }}
                >
                  <Truck size={14}/> Atölyeye Sevk Et (Fason)
                </button>
              ) : order.is_waybill_issued && !editingWaybill ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase">
                      <ClipboardCheck size={14}/> İrsaliye: {order.current_waybill_no}
                    </div>
                    <button
                      onClick={() => {
                        setWaybillInput(order.current_waybill_no || '');
                        setWorkshopInput(order.current_workshop_name || '');
                        setEditingWaybill(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors"
                      title="İrsaliye No / Atölye Düzelt"
                    >
                      <Pencil size={14}/>
                    </button>
                  </div>
                  {order.current_workshop_name && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                      <Truck size={11}/> {order.current_workshop_name}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-3 rounded-xl border border-dashed ${editingWaybill ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-100'} space-y-2`}>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase">
                    {editingWaybill
                      ? <span className="text-amber-600 flex items-center gap-1"><Pencil size={12}/> İrsaliye / Atölye Düzelt</span>
                      : <span className="text-red-600 flex items-center gap-1 animate-pulse"><AlertCircle size={12}/> İrsaliye Bekliyor</span>
                    }
                  </div>
                  <input
                    type="text"
                    autoFocus
                    defaultValue={editingWaybill ? waybillInput : ''}
                    placeholder="İrsaliye No"
                    id="modal-waybill-input"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-slate-300"
                  />
                  <input
                    type="text"
                    defaultValue={editingWaybill ? workshopInput : ''}
                    placeholder="Atölye Adı (opsiyonel)"
                    id="modal-workshop-input"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-slate-300"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-all">
                      <Check size={13}/> Kaydet
                    </button>
                    {editingWaybill && (
                      <button onClick={() => setEditingWaybill(false)} className="px-4 bg-slate-200 text-slate-600 py-2 rounded-lg text-[10px] font-black uppercase">
                        Vazgeç
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ARŞİVLE — sadece YÜKLENDİ aşamasında */}
          {stage.key === 'yuklendi' && (
            <div className="border-t border-slate-100 pt-4">
              <button
                onClick={() => onArchive(order)}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all tracking-widest"
              >
                SEVKİYATI TAMAMLA VE ARŞİVLE <Archive size={14}/>
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="w-full py-3 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity" style={{ background: NAVY }}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── ANA SAYFA ─────────────────────────
export default function ProductionTrack() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shipmentModalOrder, setShipmentModalOrder] = useState(null);
  const [detailOrderId, setDetailOrderId] = useState(null);
  const [activeDragOrder, setActiveDragOrder] = useState(null);
  const [hideEmpty, setHideEmpty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllOrders();
      setOrders(data || []);
    } catch (error) {
      console.error("Yükleme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaveWaybill = async (orderId, value, workshopName = '') => {
    try {
      const order = orders.find(o => o.id === orderId);

      if (value === 'START_TRACKING') {
        setOrders(prev => prev.map(o =>
          o.id === orderId
            ? { ...o, waybill_tracking_active: true, is_waybill_issued: false, current_waybill_no: null, current_workshop_name: null }
            : o
        ));
        const { error } = await supabase
          .from('orders')
          .update({ waybill_tracking_active: true, is_waybill_issued: false, current_waybill_no: null, current_workshop_name: null })
          .eq('id', orderId);
        if (error) {
          alert("Takip başlatılamadı.");
          setOrders(prev => prev.map(o => o.id === orderId ? order : o));
        }
        return;
      }

      if (!value) return;
      const stage = order?.current_stage || 'kesimhanede';

      setOrders(prev => prev.map(o =>
        o.id === orderId
          ? { ...o, current_waybill_no: value, is_waybill_issued: true, current_workshop_name: workshopName || null }
          : o
      ));

      const { error } = await supabase
        .from('orders')
        .update({ current_waybill_no: value, is_waybill_issued: true, current_workshop_name: workshopName || null })
        .eq('id', orderId);
      if (error) throw error;

      const { data: existingLog } = await supabase
        .from('waybill_logs')
        .select('id')
        .eq('order_id', orderId)
        .eq('stage', stage)
        .order('sent_at', { ascending: false })
        .limit(1);

      if (existingLog && existingLog.length > 0) {
        await supabase.from('waybill_logs').update({
          waybill_no: value,
          workshop_name: workshopName || null,
          sent_at: new Date().toISOString(),
        }).eq('id', existingLog[0].id);
      } else {
        await supabase.from('waybill_logs').insert([{
          order_id: orderId,
          article: order?.article || '',
          color: order?.color || '',
          customer: order?.customer || '',
          stage,
          waybill_no: value,
          workshop_name: workshopName || null,
          sent_at: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      alert("İrsaliye kaydedilemedi.");
      load();
    }
  };

  const handleArchive = (order) => {
    setDetailOrderId(null);
    setShipmentModalOrder(order);
  };

  const handleDragStart = (event) => {
    const order = orders.find(o => o.id === event.active.id);
    setActiveDragOrder(order);
  };

  const handleDragEnd = async (event) => {
    setActiveDragOrder(null);
    const { active, over } = event;
    if (!over) return;

    const order = orders.find(o => o.id === active.id);
    const targetStageKey = over.id;
    const fromStageKey = order?.current_stage || 'kesimhanede';
    if (!order || fromStageKey === targetStageKey) return;

    const newTracking = { ...(order.tracking || {}), [targetStageKey]: new Date().toISOString() };

    setOrders(prev => prev.map(o =>
      o.id === order.id
        ? {
            ...o,
            current_stage: targetStageKey,
            tracking: newTracking,
            waybill_tracking_active: false,
            is_waybill_issued: false,
            current_waybill_no: null,
            current_workshop_name: null,
          }
        : o
    ));

    try {
      // ✅ Hedef aşamaya daha önce irsaliye girilmişse geri yükle
      // (yanlışlıkla taşıyıp geri alma durumunda irsaliye kaybolmaz)
      const { data: prevLog } = await supabase
        .from('waybill_logs')
        .select('waybill_no, workshop_name')
        .eq('order_id', order.id)
        .eq('stage', targetStageKey)
        .order('sent_at', { ascending: false })
        .limit(1);

      const restored = prevLog && prevLog.length > 0 ? prevLog[0] : null;
      const waybillFields = restored
        ? {
            waybill_tracking_active: true,
            is_waybill_issued: true,
            current_waybill_no: restored.waybill_no,
            current_workshop_name: restored.workshop_name || null,
          }
        : {
            waybill_tracking_active: false,
            is_waybill_issued: false,
            current_waybill_no: null,
            current_workshop_name: null,
          };

      await supabase.from('orders').update(waybillFields).eq('id', order.id);
      await updateOrderStage(order.id, targetStageKey, order.tracking);

      // Eski irsaliye bulunduysa ekranda da göster
      if (restored) {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...waybillFields } : o));
      }
    } catch (err) {
      alert("Aşama değiştirilirken hata oluştu.");
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, current_stage: fromStageKey } : o));
    }
  };

  const visibleOrders = orders.filter(o => {
    const hasCutting = o.cutting_qty && Object.values(o.cutting_qty).some(v => Number(v) > 0);
    return hasCutting && !o.is_archived && o.status !== 'archived';
  });

  // Boş aşamaları gizle — ama kart sürüklenirken hepsi görünür (hedef olabilsin)
  const visibleStages = STAGES.filter(stage =>
    !hideEmpty || activeDragOrder ||
    visibleOrders.some(o => (o.current_stage || 'kesimhanede') === stage.key)
  );

  const detailOrder = orders.find(o => o.id === detailOrderId);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 mb-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sürükle-Bırak ile Aşama Yönetimi</p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none mt-1">Üretim Akışı</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2">
            <PackageCheck size={14} className="text-emerald-500"/>
            <span className="text-[10px] font-black text-slate-900 uppercase">Aktif İş: {visibleOrders.length}</span>
          </div>
          <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-600 animate-pulse"/>
            <span className="text-[10px] font-black text-red-600 uppercase">
              İrsaliye Bekleyen: {orders.filter(o => o.waybill_tracking_active && !o.is_waybill_issued).length}
            </span>
          </div>
          <button
            onClick={() => setHideEmpty(!hideEmpty)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${
              hideEmpty ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
            }`}
            style={hideEmpty ? { background: NAVY } : {}}
          >
            {hideEmpty ? '✓ Boşlar Gizli' : 'Boş Aşamaları Gizle'}
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        autoScroll={{ threshold: { x: 0.15, y: 0.2 } }}
      >
        <div
          className={`flex gap-4 lg:gap-1.5 overflow-x-auto lg:overflow-x-hidden overflow-y-hidden custom-scrollbar -mx-4 md:-mx-6 px-4 md:px-6 ${activeDragOrder ? '' : 'snap-x snap-mandatory lg:snap-none'}`}
          style={{ height: 'calc(100dvh - 245px)', minHeight: '420px' }}
        >
          {loading ? (
            <div className="py-20 text-center text-slate-300 font-black text-[10px] animate-pulse uppercase tracking-widest w-full">
              Veriler Alınıyor...
            </div>
          ) : (
            visibleStages.map((stage, index) => (
              <StageColumn
                key={stage.key}
                stage={stage}
                index={STAGES.indexOf(stage)}
                orders={visibleOrders.filter(o => (o.current_stage || 'kesimhanede') === stage.key)}
                onOpenDetail={(order) => setDetailOrderId(order.id)}
              />
            ))
          )}
        </div>

        <DragOverlay>
          {activeDragOrder && (
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-2 flex items-center gap-2 w-56 opacity-95">
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-100 shrink-0 bg-slate-50 flex items-center justify-center">
                {activeDragOrder.model_image
                  ? <img src={activeDragOrder.model_image} className="w-full h-full object-cover" alt="model"/>
                  : <Hash size={14} className="text-slate-200"/>}
              </div>
              <div className="min-w-0">
                <div className="font-black text-[10.5px] text-slate-900 uppercase truncate">{activeDragOrder.article}</div>
                <div className="text-[8.5px] font-black uppercase truncate" style={{ color: NAVY }}>{activeDragOrder.color || activeDragOrder.customer}</div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* DETAY MODALI */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrderId(null)}
          onSaveWaybill={handleSaveWaybill}
          onArchive={handleArchive}
        />
      )}

      {shipmentModalOrder && (
        <ShipmentResultModal
          order={shipmentModalOrder}
          onClose={() => setShipmentModalOrder(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}