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

      const { data: lastOrders } = await supabase
        .from('orders')
        .select('order_no')
        .ilike('order_no', `${prefix}-${year}-%`)
        .order('order_no', { ascending: false })
        .limit(1);

      let sequence = 1;
      if (lastOrders && lastOrders.length > 0) {
        const lastNo = lastOrders[0].order_no;
        const parts = lastNo.split('-');
        const lastSeq = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastSeq)) sequence = lastSeq + 1;
      }
      finalOrderNo = `${prefix}-${year}-${String(sequence).padStart(3, '0')}`;
    } catch (err) {
      finalOrderNo = `ORD-${Date.now()}`;
    }
  }

  const dbPayload = {
    order_no: finalOrderNo,
    customer: String(formData.customer || "").trim(),
    article: String(formData.article || "").trim(),
    model: String(formData.model || ""),
    color: String(formData.color || ""),
    due: formData.due || null,
    extra_percent: Number(formData.extra_percent ?? 5),
    qty_by_size: formData.qty_by_size || {},
    fabrics: formData.fabrics || {},
    post_processes: formData.post_processes || "",
    model_image: formData.model_image || null,
    updated_at: new Date().toISOString()
  };

  const query = orderId 
    ? supabase.from('orders').update(dbPayload).eq('id', orderId) 
    : supabase.from('orders').insert([dbPayload]);

  const result = await query.select();
  if (result.error) throw result.error;
  return result.data?.[0];
};

/**
 * 2. KESİM ÖNCESİ VE SONRASI GÜNCELLEMELER
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
 * 3. DASHBOARD VE LİSTE SORGULARI
 */
export const getDashboardStats = async () => {
  const [ordersRes, deliveriesRes] = await Promise.all([
    supabase.from('orders').select('*').neq('status', 'completed'),
    supabase.from('fabric_deliveries').select('*')
  ]);
  if (ordersRes.error) throw ordersRes.error;
  
  const orders = ordersRes.data;
  const deliveries = deliveriesRes.data || [];
  let stats = {
    orderCount: orders.length,
    totalPlanned: 0,
    totalActualCut: 0,
    fabricOrderedCount: 0, 
    waitingFabricOrder: 0,
    fabrics: [],
    deadlines: orders.filter(o => o.due).sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 5)
  };

  const fabricMap = {};
  orders.forEach(order => {
    const plannedQty = Object.values(order.qty_by_size || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    const actualQty = Object.values(order.cutting_qty || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    stats.totalPlanned += plannedQty;
    stats.totalActualCut += actualQty;
    if (order.fabric_ordered) stats.fabricOrderedCount++;
    else stats.waitingFabricOrder++;
  });
  return stats;
};

/**
 * 4. VERCEL'İN HATA VERDİĞİ EKSİK FONKSİYONLAR (GERİ GELDİ)
 */
export const getFabricsByOrderNo = async (orderNo) => {
  const { data, error } = await supabase.from('orders').select('*').eq('order_no', orderNo);
  if (error) throw error;
  
  const combinedFabrics = {};
  data.forEach(order => {
    const extra = 1 + (Number(order.extra_percent || 0) / 100);
    const qtyObj = order.qty_by_size || {};
    const totalPieces = Math.ceil(Object.values(qtyObj).reduce((a, b) => a + (Number(b) || 0), 0) * extra);

    Object.entries(order.fabrics || {}).forEach(([key, f]) => {
      if (!f.kind) return; 
      const fabricKey = `${f.kind}-${f.color}-${f.unit}`.toLowerCase().trim();
      if (!combinedFabrics[fabricKey]) {
        combinedFabrics[fabricKey] = { ...f, totalAmount: 0, isMain: key === 'main' };
      }
      combinedFabrics[fabricKey].totalAmount += totalPieces * (Number(f.perPieceKg) || 0);
    });
  });
  return Object.values(combinedFabrics).sort((a, b) => b.isMain - a.isMain);
};

export const updateOrderStage = async (orderId, stageKey, currentTracking) => {
  const updatedTracking = { ...(currentTracking || {}), [stageKey]: new Date().toISOString() };
  const { error } = await supabase.from('orders').update({ 
    current_stage: stageKey,
    tracking: updatedTracking 
  }).eq('id', orderId);
  if (error) throw error;
  return updatedTracking;
};

export const moveOrderBack = async (orderId, prevStageKey) => {
  const { error } = await supabase.from('orders').update({ current_stage: prevStageKey }).eq('id', orderId);
  if (error) throw error;
  return true;
};

export const getAllOrders = () => supabase.from('orders').select('*').order('created_at', { ascending: false }).then(res => res.data);

export const getRecentOrders = async () => {
  const { data } = await supabase.from('orders').select('order_no, customer').order('created_at', { ascending: false }).limit(40);
  return Array.from(new Set(data.map(a => a.order_no))).map(no => data.find(a => a.order_no === no));
};

export const deleteOrder = async (id) => {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw error;
  return true;
};

/**
 * 5. KUMAŞ TESLİMAT VE RESİM
 */
export const addFabricDelivery = (data) => supabase.from('fabric_deliveries').insert([data]).select();
export const deleteFabricDelivery = (id) => supabase.from('fabric_deliveries').delete().eq('id', id);

export const uploadModelImage = async (file) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage.from('models').upload(fileName, file);
  if (error) throw error;
  return supabase.storage.from('models').getPublicUrl(fileName).data.publicUrl;
};