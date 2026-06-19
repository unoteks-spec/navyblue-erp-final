import { supabase } from './supabaseClient';

export { supabase };

/**
 * 1. SİPARİŞ KAYDET VEYA GÜNCELLE
 */
export const saveOrder = async (formData, orderId = null, forceOrderNo = null) => {
  let finalOrderNo = forceOrderNo;
  if (!orderId && !finalOrderNo) {
    try {
      const year = new Date().getFullYear();
      const customerBase = String(formData.customer || "SIP").trim();
      let prefix = customerBase.substring(0, 3).toLocaleUpperCase('tr-TR').replace(/\s/g, 'X');
      if (prefix.length < 3) prefix = prefix.padEnd(3, '0');
      const { data: lastOrders } = await supabase.from('orders').select('order_no').ilike('order_no', `${prefix}-${year}-%`).order('order_no', { ascending: false }).limit(1);
      let sequence = 1;
      if (lastOrders && lastOrders.length > 0) {
        const lastNo = lastOrders[0].order_no;
        const lastSeq = parseInt(lastNo.split('-').pop());
        if (!isNaN(lastSeq)) sequence = lastSeq + 1;
      }
      finalOrderNo = `${prefix}-${year}-${String(sequence).padStart(3, '0')}`;
    } catch (err) { finalOrderNo = `ORD-${Date.now()}`; }
  }

  const dbPayload = {
    order_no: finalOrderNo,
    customer: (formData.customer || "").trim(),
    article: (formData.article || "").trim(),
    model: formData.model || "",
    color: formData.color || "",
    due: formData.due || null,
    extra_percent: Number(formData.extraPercent || 5),
    qty_by_size: formData.qtyBySize || {},
    fabrics: formData.fabrics || {},
    post_processes: formData.postProcesses || "",
    model_image: formData.modelImage || null,
    updated_at: new Date().toISOString()
  };

  const query = orderId
    ? supabase.from('orders').update(dbPayload).eq('id', orderId)
    : supabase.from('orders').insert([dbPayload]);
  const { data, error } = await query.select();
  if (error) throw error;
  return data?.[0];
};

/**
 * 2. KESİM İŞLEMLERİ
 */
export const updateCuttingDetails = async (orderId, details) => {
  const { error } = await supabase.from('orders').update({
    marker_width: Number(details.markerWidth),
    cutting_date: details.cuttingDate
  }).eq('id', orderId);
  if (error) throw error;
};

export const updateCuttingResults = async (orderId, results, details) => {
  const { error } = await supabase.from('orders').update({
    cutting_qty: results,
    cutting_date: details.cuttingDate,
    marker_width: details.markerWidth,
    status: 'cut_completed'
  }).eq('id', orderId);
  if (error) throw error;
};

// ✅ YENİ: Bir siparişin kumaşının tamamen geldi mi kontrolü
// Kesim sonucu girilmeden önce bu kontrol yapılmalı
export const checkFabricFullyReceived = async (orderId) => {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('fabrics')
    .eq('id', orderId)
    .single();
  if (orderError) throw orderError;

  const allFabKeys = Object.entries(order.fabrics || {})
    .filter(([key, fab]) => fab && fab.kind && fab.kind.trim() !== '')
    .map(([key]) => key);

  if (allFabKeys.length === 0) {
    return { ready: true, missing: [] }; // Kumaş tanımlanmamışsa engelleme
  }

  const { data: items, error: itemsError } = await supabase
    .from('fabric_order_items')
    .select('fab_key, fabric_orders(received_qty_kg, ordered_qty_kg)')
    .eq('order_id', orderId);
  if (itemsError) throw itemsError;

  const receivedFabKeys = new Set(
    (items || [])
      .filter(i => {
        const fo = Array.isArray(i.fabric_orders) ? i.fabric_orders[0] : i.fabric_orders;
        return fo && Number(fo.received_qty_kg || 0) > 0;
      })
      .map(i => i.fab_key)
  );

  const missing = allFabKeys.filter(k => !receivedFabKeys.has(k));
  return { ready: missing.length === 0, missing };
};

/**
 * 3. DASHBOARD İSTATİSTİKLERİ
 * Kumaş eksiği fabric_orders tablosundan PO bazlı hesaplanıyor.
 */
export const getDashboardStats = async () => {
  const [ordersRes, fabricOrdersRes] = await Promise.all([
    supabase.from('orders')
      .select('*')
      .not('status', 'in', '("completed","archived")')
      .is('is_archived', false),
    supabase.from('fabric_orders')
      .select('*')
      .neq('status', 'completed')
  ]);

  if (ordersRes.error) throw ordersRes.error;

  const orders = ordersRes.data;
  const fabricOrders = fabricOrdersRes.data || [];

  const stats = {
    orderCount: orders.length,
    totalPlanned: 0,
    totalActualCut: 0,
    fabricOrderedCount: orders.filter(o => o.fabric_ordered).length,
    waitingFabricOrder: orders.filter(o => !o.fabric_ordered).length,

    fabrics: fabricOrders
      .map(po => ({
        kind: po.fabric_type,
        color: po.color,
        unit: 'KG',
        ordered: Number(po.ordered_qty_kg || 0),
        received: Number(po.received_qty_kg || 0),
        netEksik: Math.max(0, Number(po.ordered_qty_kg || 0) - Number(po.received_qty_kg || 0)),
        poNo: po.fabric_po_no,
        supplier: po.supplier_name,
      }))
      .filter(f => f.netEksik > 0.1),

    deadlines: orders
      .filter(o => o.due)
      .sort((a, b) => new Date(a.due) - new Date(b.due)),

    readyToCut: orders
      .filter(o => o.fabric_ordered && (o.current_stage === 'kesimhanede' || !o.current_stage))
      .sort((a, b) => new Date(a.due || '9999') - new Date(b.due || '9999')),

    waitingFabric: orders
      .filter(o => !o.fabric_ordered)
      .sort((a, b) => new Date(a.due || '9999') - new Date(b.due || '9999')),
  };

  orders.forEach(order => {
    stats.totalPlanned += Object.values(order.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
    stats.totalActualCut += Object.values(order.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0);
  });

  return stats;
};

/**
 * 4. GRUP BAZLI KUMAŞ İHTİYAÇLARI
 */
export const getFabricsByOrderNo = async (orderNo) => {
  const { data, error } = await supabase.from('orders').select('*').eq('order_no', orderNo);
  if (error) throw error;
  const combined = {};
  data.forEach(order => {
    const total = Math.round(
      Object.values(order.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0) *
      (1 + (Number(order.extra_percent || 5) / 100))
    );
    Object.entries(order.fabrics || {}).forEach(([k, f]) => {
      if (!f.kind) return;
      const key = `${f.kind}-${f.color}-${f.unit}`.toLowerCase().trim();
      if (!combined[key]) combined[key] = { ...f, totalAmount: 0, isMain: k === 'main' };
      combined[key].totalAmount += total * Number(f.perPieceKg || 0);
    });
  });
  return Object.values(combined).sort((a, b) => b.isMain - a.isMain);
};

/**
 * 5. DİĞER TÜM YARDIMCI İŞLEMLER
 */
export const getAllOrders = () =>
  supabase.from('orders')
    .select(`
      *,
      fabric_order_items (
        id,
        fab_key,
        allocated_qty_kg,
        fabric_orders (
          id,
          received_qty_kg,
          ordered_qty_kg,
          status
        )
      )
    `)
    .order('created_at', { ascending: false })
    .then(res => res.data);

// ✅ DÜZELTİLDİ: Silme öncesi kontrol — bağlı kumaş PO'su varsa engelle
// Kullanıcıya hangi PO'ya bağlı olduğunu bildirir, sessiz veri bozulmasını önler
export const checkOrderDeletable = async (orderId) => {
  const { data: items, error } = await supabase
    .from('fabric_order_items')
    .select('fabric_order_id, fabric_orders(fabric_po_no, status)')
    .eq('order_id', orderId);
  if (error) throw error;

  if (!items || items.length === 0) {
    return { deletable: true, linkedPos: [] };
  }

  const linkedPos = items
    .map(i => {
      const po = Array.isArray(i.fabric_orders) ? i.fabric_orders[0] : i.fabric_orders;
      return po ? { id: i.fabric_order_id, poNo: po.fabric_po_no, status: po.status } : null;
    })
    .filter(Boolean);

  // Aynı PO birden fazla kalemde geçebilir, tekilleştir
  const uniquePos = Array.from(new Map(linkedPos.map(p => [p.id, p])).values());

  return { deletable: false, linkedPos: uniquePos };
};

export const deleteOrder = (id) => supabase.from('orders').delete().eq('id', id);

export const addFabricDelivery = (data) => supabase.from('fabric_deliveries').insert([data]).select();
export const deleteFabricDelivery = (id) => supabase.from('fabric_deliveries').delete().eq('id', id);

export const uploadModelImage = async (file) => {
  const name = `${Math.random().toString(36).substring(2)}-${Date.now()}.${file.name.split('.').pop()}`;
  const { error } = await supabase.storage.from('models').upload(name, file);
  if (error) throw error;
  return supabase.storage.from('models').getPublicUrl(name).data.publicUrl;
};

export const getRecentOrders = async () => {
  const { data } = await supabase
    .from('orders')
    .select('order_no, customer')
    .order('created_at', { ascending: false })
    .limit(40);
  return Array.from(new Set(data.map(a => a.order_no))).map(no => data.find(a => a.order_no === no));
};

export const updateOrderStage = async (id, stage, tracking) => {
  const newTracking = { ...(tracking || {}), [stage]: new Date().toISOString() };
  await supabase.from('orders').update({ current_stage: stage, tracking: newTracking }).eq('id', id);
  return newTracking;
};

export const moveOrderBack = (id, stage) =>
  supabase.from('orders').update({ current_stage: stage }).eq('id', id);

export const updateGroupFabricStatus = async (orderNo, status) => {
  const { error } = await supabase.from('orders').update({ fabric_ordered: status }).eq('order_no', orderNo);
  if (error) throw error;
  return true;
};

export const updateGroupFabricDeadlines = async (orderNo, deadlines) => {
  const { error } = await supabase.from('orders').update({
    knitted_deadline: deadlines.knitted || null,
    woven_deadline: deadlines.woven || null
  }).eq('order_no', orderNo);
  if (error) throw error;
  return true;
};

export const archiveOrder = async (id) => {
  const { data, error } = await supabase.from('orders').update({ status: 'archived', is_archived: true }).eq('id', id);
  if (error) throw error;
  return data;
};

export const archiveOrderWithQty = async (id, shippedQty) => {
  const { data, error } = await supabase.from('orders').update({
    status: 'archived',
    is_archived: true,
    shipped_qty: shippedQty,
    completed_at: new Date().toISOString()
  }).eq('id', id);
  if (error) throw error;
  return data;
};

/**
 * 6. ÇEKİ LİSTESİ (PACKING LIST) İŞLEMLERİ
 */
export const savePackingList = async (orderNo, boxes, consignee) => {
  await supabase.from('packing_lists').delete().eq('order_no', orderNo);
  const { data, error } = await supabase.from('packing_lists').insert([
    {
      order_no: orderNo,
      consignee_name: consignee.name,
      consignee_address: consignee.address,
      boxes_data: boxes,
      updated_at: new Date().toISOString()
    }
  ]);
  if (error) throw error;
  return data;
};

export const getPackingList = async (orderNo) => {
  const { data } = await supabase.from('packing_lists').select('*').eq('order_no', orderNo).single();
  return data;
};

/**
 * 7. KUMAŞ YÖNETİM SİSTEMİ
 */
export const getOrdersWaitingForFabric = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .is('is_archived', false)
    .not('status', 'in', '("completed","archived")');
  if (error) throw error;
  return data || [];
};

export const createFabricPurchaseOrder = async (poData, selectedItems) => {
  const year = new Date().getFullYear();
  const timeStamp = String(Date.now()).slice(-4);
  const finalPoNo = `K-${year}-${timeStamp}`;

  const { data: newPo, error: poError } = await supabase
    .from('fabric_orders')
    .insert([{
      fabric_po_no: finalPoNo,
      supplier_name: poData.supplierName,
      fabric_type: poData.fabricType,
      color: poData.color,
      ordered_qty_kg: Number(poData.orderedQtyKg || 0),
      status: 'pending'
    }])
    .select();

  if (poError) throw poError;
  const fabricOrderId = newPo[0].id;

  const itemRows = selectedItems.map(item => ({
    fabric_order_id: fabricOrderId,
    order_id: item.orderId,
    fab_key: item.fabKey,
    allocated_qty_kg: Number(item.allocatedQty || 0)
  }));

  const { error: itemsError } = await supabase.from('fabric_order_items').insert(itemRows);
  if (itemsError) throw itemsError;

  const orderFabKeyMap = {};
  selectedItems.forEach(({ orderId, fabKey }) => {
    if (!orderFabKeyMap[orderId]) orderFabKeyMap[orderId] = [];
    orderFabKeyMap[orderId].push(fabKey);
  });

  const orderIds = Object.keys(orderFabKeyMap);
  const { data: existingItems } = await supabase
    .from('fabric_order_items')
    .select('order_id, fab_key')
    .in('order_id', orderIds);

  const { data: orders } = await supabase
    .from('orders')
    .select('id, fabrics')
    .in('id', orderIds);

  for (const order of (orders || [])) {
    const allFabKeys = Object.keys(order.fabrics || {});
    const orderedFabKeys = (existingItems || [])
      .filter(i => i.order_id === order.id)
      .map(i => i.fab_key);
    const allOrdered = allFabKeys.every(k => orderedFabKeys.includes(k));
    if (allOrdered) {
      await supabase.from('orders').update({ fabric_ordered: true }).eq('id', order.id);
    }
  }

  return newPo[0];
};

export const getFabricOrders = async () => {
  const { data, error } = await supabase
    .from('fabric_orders')
    .select(`
      *,
      fabric_order_items (
        id,
        allocated_qty_kg,
        order_id,
        orders (id, order_no, customer, article, model, color, qty_by_size, fabrics)
      )
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const updateFabricPurchaseOrder = async (poId, updatedData) => {
  const { data, error } = await supabase
    .from('fabric_orders')
    .update({
      supplier_name: updatedData.supplierName,
      ordered_qty_kg: Number(updatedData.orderedQtyKg || 0),
      fabric_type: updatedData.fabricType,
      color: updatedData.color
    })
    .eq('id', poId)
    .select();
  if (error) throw error;
  return data[0];
};

export const receiveFabricDelivery = async (fabricOrderId, receivedKg, receivedRolls) => {
  const { data: currentPo, error: fetchError } = await supabase
    .from('fabric_orders')
    .select('received_qty_kg, received_rolls')
    .eq('id', fabricOrderId)
    .single();
  if (fetchError) throw fetchError;

  const newTotalReceived = Number(currentPo.received_qty_kg || 0) + Number(receivedKg);
  const newTotalRolls = Number(currentPo.received_rolls || 0) + Number(receivedRolls || 0);

  const { error: poUpdateError } = await supabase
    .from('fabric_orders')
    .update({
      received_qty_kg: newTotalReceived,
      received_rolls: newTotalRolls,
      status: 'completed'
    })
    .eq('id', fabricOrderId);
  if (poUpdateError) throw poUpdateError;

  const { data: items, error: itemsError } = await supabase
    .from('fabric_order_items')
    .select('order_id')
    .eq('fabric_order_id', fabricOrderId);
  if (itemsError) throw itemsError;

  const orderIdsToUpdate = items.map(i => i.order_id);
  if (orderIdsToUpdate.length > 0) {
    await supabase.from('orders').update({ current_stage: 'kesimhanede' }).in('id', orderIdsToUpdate);
  }

  return true;
};

export const deleteFabricPurchaseOrder = async (fabricOrderId) => {
  const { data: items, error: itemsError } = await supabase
    .from('fabric_order_items')
    .select('order_id, fab_key')
    .eq('fabric_order_id', fabricOrderId);
  if (itemsError) throw itemsError;

  const connectedOrderIds = [...new Set(items.map(i => i.order_id))];
  if (connectedOrderIds.length > 0) {
    await supabase.from('orders').update({ fabric_ordered: false }).in('id', connectedOrderIds);
  }

  const { error: deleteError } = await supabase.from('fabric_orders').delete().eq('id', fabricOrderId);
  if (deleteError) throw deleteError;
  return true;
};