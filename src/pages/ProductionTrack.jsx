import React, { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStage, supabase } from '../api/orderService';
import {
  Clock, Activity, User, Hash, Archive, PackageCheck, AlertCircle,
  ClipboardCheck, Truck, ChevronDown, Pencil, Check, X, GripVertical
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

// ───────────────────────── KART (sürüklenebilir + akordeon) ─────────────────────────
function OrderCard({ order, stage, isOpen, onToggle, onSaveWaybill, onEditWaybill }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { order, fromStage: stage.key },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  const totalQty = Object.values(order.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
  const needsWaybill = order.waybill_tracking_active && !order.is_waybill_issued;
  const entryDate = order.tracking?.[stage.key]
    ? new Date(order.tracking[stage.key]).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
    : 'GİRİŞ';

  const [editingWaybill, setEditingWaybill] = useState(false);
  const [waybillInput, setWaybillInput] = useState('');
  const [workshopInput, setWorkshopInput] = useState('');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-2xl shadow-sm border transition-all ${
        needsWaybill ? 'border-red-300 ring-1 ring-red-50' : 'border-slate-100'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      {/* KAPALI BAŞLIK */}
      <div className="flex items-center gap-2 p-3 lg:p-2 lg:gap-1.5">
        <div
          {...listeners}
          {...attributes}
          className="p-1 -ml-1 text-slate-300 cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <GripVertical size={14}/>
        </div>

        <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-100 shrink-0 bg-slate-50 flex items-center justify-center">
          {order.model_image
            ? <img src={order.model_image} className="w-full h-full object-cover" alt="model" draggable={false}/>
            : <Hash size={16} className="text-slate-200"/>}
        </div>

        <div
          className="min-w-0 flex-1 overflow-hidden cursor-pointer"
          onClick={() => onToggle(order.id)}
        >
          <div className="font-black text-[11px] text-slate-900 tracking-tighter uppercase truncate leading-tight" title={order.article}>
            {order.article}
          </div>
          {order.color && (
            <div className="text-[8.5px] font-black uppercase truncate leading-tight mt-0.5" style={{ color: NAVY }}>
              {order.color}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className={`flex lg:hidden xl:flex items-center gap-0.5 text-[7px] font-black px-1 py-0.5 rounded-md uppercase whitespace-nowrap ${
            stage.key === 'yuklendi' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
          }`}>
            <Clock size={7}/>{entryDate}
          </div>
          {needsWaybill && <AlertCircle size={12} className="text-red-500 animate-pulse"/>}
        </div>

        <button
          onClick={() => onToggle(order.id)}
          className="p-1 text-slate-300 hover:text-slate-600 transition-colors shrink-0"
        >
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
        </button>
      </div>

      {/* AÇIK AKORDEON İÇERİĞİ */}
      {isOpen && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-50 space-y-3">
          {/* Müşteri + Adet */}
          <div className="flex items-center justify-between pt-3">
            <span className="flex items-center gap-1 text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-lg uppercase border border-slate-100">
              <User size={9}/> {order.customer}
            </span>
            <div className="text-white px-2.5 py-1 rounded-lg text-[10px] font-black" style={{ background: NAVY }}>{totalQty} AD</div>
          </div>

          {/* İrsaliye bölümü — sadece fason aşamalarda */}
          {stage.isFason && (
            <div>
              {!order.waybill_tracking_active ? (
                <button
                  onClick={() => onSaveWaybill(order.id, 'START_TRACKING')}
                  className="w-full py-2 bg-slate-50 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 border border-slate-200 hover:opacity-90 transition-all"
                  style={{ color: NAVY }}
                >
                  <Truck size={13}/> Atölyeye Sevk Et (Fason)
                </button>
              ) : (
                <div className={`p-2.5 rounded-xl border border-dashed ${order.is_waybill_issued ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  {order.is_waybill_issued && !editingWaybill ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-600 font-black text-[9px] uppercase">
                          <ClipboardCheck size={13}/> İrsaliye: {order.current_waybill_no}
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
                          <Pencil size={13}/>
                        </button>
                      </div>
                      {order.current_workshop_name && (
                        <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-500 uppercase pl-0.5">
                          <Truck size={10}/> {order.current_workshop_name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase">
                        {editingWaybill
                          ? <span className="text-amber-600 flex items-center gap-1"><Pencil size={11}/> İrsaliye / Atölye Düzelt</span>
                          : <span className="text-red-600 flex items-center gap-1 animate-pulse"><AlertCircle size={11}/> İrsaliye Bekliyor</span>
                        }
                      </div>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          autoFocus
                          defaultValue={editingWaybill ? waybillInput : ''}
                          placeholder="İrsaliye No"
                          id={`waybill-input-${order.id}`}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:ring-1 focus:ring-slate-300"
                        />
                        <button
                          onClick={() => {
                            const val = document.getElementById(`waybill-input-${order.id}`).value;
                            const workshopVal = document.getElementById(`workshop-input-${order.id}`).value;
                            onSaveWaybill(order.id, val, workshopVal);
                            setEditingWaybill(false);
                          }}
                          className="bg-emerald-600 text-white p-2 rounded-lg"
                        >
                          <Check size={13}/>
                        </button>
                        {editingWaybill && (
                          <button
                            onClick={() => setEditingWaybill(false)}
                            className="bg-slate-200 text-slate-600 p-2 rounded-lg"
                          >
                            <X size={13}/>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        defaultValue={editingWaybill ? workshopInput : ''}
                        placeholder="Atölye Adı (opsiyonel)"
                        id={`workshop-input-${order.id}`}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:ring-1 focus:ring-slate-300"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = document.getElementById(`waybill-input-${order.id}`).value;
                            onSaveWaybill(order.id, val, e.target.value);
                            setEditingWaybill(false);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Arşivle butonu — sadece YÜKLENDİ aşamasında */}
          {stage.key === 'yuklendi' && (
            <button
              onClick={() => onEditWaybill(order)}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all tracking-widest"
            >
              ARŞİVLE <Archive size={14}/>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── SÜTUN (drop alanı) ─────────────────────────
function StageColumn({ stage, index, orders, openCardId, onToggle, onSaveWaybill, onArchive }) {
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

      <div ref={setNodeRef} className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-2.5 lg:gap-2 p-2 lg:p-1.5 rounded-2xl border transition-all duration-200 ${
        isOver
          ? 'bg-[#1e3a5f]/[0.06] border-[#1e3a5f]/40 shadow-inner'
          : 'bg-slate-50/70 border-slate-100'
      }`}>
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            stage={stage}
            isOpen={openCardId === order.id}
            onToggle={onToggle}
            onSaveWaybill={onSaveWaybill}
            onEditWaybill={onArchive}
          />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── ANA SAYFA ─────────────────────────
export default function ProductionTrack() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shipmentModalOrder, setShipmentModalOrder] = useState(null);
  const [openCardId, setOpenCardId] = useState(null);
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

  const toggleCard = (orderId) => {
    setOpenCardId(prev => prev === orderId ? null : orderId);
  };

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

  const handleArchive = (order) => setShipmentModalOrder(order);

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
          }
        : o
    ));

    try {
      await supabase
        .from('orders')
        .update({ waybill_tracking_active: false, is_waybill_issued: false, current_waybill_no: null })
        .eq('id', order.id);
      await updateOrderStage(order.id, targetStageKey, order.tracking);
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

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 mb-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sürükle-Bırak ile Aşama Yönetimi</p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none mt-1">Üretim Akışı</h1>
        </div>
        <div className="flex gap-2">
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
                index={index}
                orders={visibleOrders.filter(o => (o.current_stage || 'kesimhanede') === stage.key)}
                openCardId={openCardId}
                onToggle={toggleCard}
                onSaveWaybill={handleSaveWaybill}
                onArchive={handleArchive}
              />
            ))
          )}
        </div>

        <DragOverlay>
          {activeDragOrder && (
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 flex items-center gap-3 w-64 opacity-95">
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-100 shrink-0 bg-slate-50 flex items-center justify-center">
                {activeDragOrder.model_image
                  ? <img src={activeDragOrder.model_image} className="w-full h-full object-cover" alt="model"/>
                  : <Hash size={16} className="text-slate-200"/>}
              </div>
              <div className="min-w-0">
                <div className="font-black text-[11px] text-slate-900 uppercase truncate">{activeDragOrder.article}</div>
                <div className="text-[8px] font-black text-slate-400 uppercase">{activeDragOrder.customer}</div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

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