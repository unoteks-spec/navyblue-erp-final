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

  const query = orderId ? supabase.from('orders').update(dbPayload).eq('id', orderId) : supabase.from('orders').insert([dbPayload]);
  const { data, error } = await query.select();
  if (error) throw error;
  return data?.[0];
};

/**
 * 2. KESİM İŞLEMLERİ (Vercel'in hata verdiği yer)
 */
export const updateCuttingDetails = async (orderId, details) => {
  const { error } = await supabase.from('orders').update({
    marker_width: details.markerWidth,
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

/**
 * 3. DASHBOARD İSTATİSTİKLERİ
 */
export const getDashboardStats = async () => {
  const [ordersRes, deliveriesRes] = await Promise.all([
    supabase.from('orders').select('*').neq('status', 'completed'),
    supabase.from('fabric_deliveries').select('*')
  ]);
  if (ordersRes.error) throw ordersRes.error;
  
  const orders = ordersRes.data;
  const deliveries = deliveriesRes.data || [];
  const stats = {
    orderCount: orders.length,
    totalPlanned: 0,
    totalActualCut: 0,
    fabricOrderedCount: orders.filter(o => o.fabric_ordered).length,
    waitingFabricOrder: orders.filter(o => !o.fabric_ordered).length,
    fabrics: [],
    deadlines: orders.filter(o => o.due).sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 5)
  };

  const fabricMap = {};
  orders.forEach(order => {
    const planned = Object.values(order.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
    stats.totalPlanned += planned;
    stats.totalActualCut += Object.values(order.cutting_qty || {}).reduce((a, b) => a + Number(b || 0), 0);

    Object.values(order.fabrics || {}).forEach(f => {
      if (!f.kind || !f.perPieceKg) return;
      const key = `${f.kind}-${f.color}`.toLowerCase().trim();
      if (!fabricMap[key]) fabricMap[key] = { kind: f.kind, color: f.color, unit: f.unit || 'kg', needed: 0, received: 0 };
      fabricMap[key].needed += (planned * (1 + (Number(order.extra_percent || 5) / 100)) * Number(f.perPieceKg));
    });
  });

  deliveries.forEach(d => {
    const key = `${d.fabric_kind}-${d.color || ''}`.toLowerCase().trim();
    if (fabricMap[key]) fabricMap[key].received += Number(d.amount_received || 0);
  });

  stats.fabrics = Object.values(fabricMap).map(f => ({
    ...f, netEksik: Math.max(0, f.needed - f.received)
  })).filter(f => f.netEksik > 0.1);

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
    const total = Math.ceil(Object.values(order.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0) * (1 + (Number(order.extra_percent || 5) / 100)));
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
export const getAllOrders = () => supabase.from('orders').select('*').order('created_at', { ascending: false }).then(res => res.data);
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
  const { data } = await supabase.from('orders').select('order_no, customer').order('created_at', { ascending: false }).limit(40);
  return Array.from(new Set(data.map(a => a.order_no))).map(no => data.find(a => a.order_no === no));
};

export const updateOrderStage = async (id, stage, tracking) => {
  const newTracking = { ...(tracking || {}), [stage]: new Date().toISOString() };
  await supabase.from('orders').update({ current_stage: stage, tracking: newTracking }).eq('id', id);
  return newTracking;
};

export const moveOrderBack = (id, stage) => supabase.from('orders').update({ current_stage: stage }).eq('id', id);