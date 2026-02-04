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
        const parts = lastNo.split('-');
        const lastSeq = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastSeq)) sequence = lastSeq + 1;
      }
      finalOrderNo = `${prefix}-${year}-${String(sequence).padStart(3, '0')}`;
    } catch (err) { finalOrderNo = `ORD-${Date.now()}`; }
  }

  const dbPayload = {
    order_no: finalOrderNo,
    customer: String(formData.customer || "").trim(),
    article: String(formData.article || "").trim(),
    model: String(formData.model || ""),
    color: String(formData.color || ""),
    due: formData.due || null,
    extra_percent: Number(formData.extraPercent ?? 5), // 'extraPercent' frontend'den geliyor
    qty_by_size: formData.qtyBySize || {}, // 'qtyBySize' frontend'den geliyor
    fabrics: formData.fabrics || {},
    post_processes: formData.postProcesses || "", // 'postProcesses' frontend'den geliyor
    model_image: formData.modelImage || null, // 'modelImage' frontend'den geliyor
    updated_at: new Date().toISOString()
  };

  const query = orderId ? supabase.from('orders').update(dbPayload).eq('id', orderId) : supabase.from('orders').insert([dbPayload]);
  const result = await query.select();
  if (result.error) throw result.error;
  return result.data?.[0];
};

/**
 * 2. DASHBOARD VE KUMAŞ İHTİYAÇ HESAPLAMA (TÜM GRUPLAR)
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

    Object.values(order.fabrics || {}).forEach(f => {
      if (!f.kind || !f.perPieceKg) return;
      const key = `${f.kind}-${f.color}`.toLowerCase().trim();
      if (!fabricMap[key]) {
        fabricMap[key] = { kind: f.kind, color: f.color, unit: f.unit || 'kg', needed: 0, received: 0 };
      }
      const extra = 1 + (Number(order.extra_percent || 5) / 100);
      fabricMap[key].needed += (plannedQty * extra * Number(f.perPieceKg));
    });
  });

  deliveries.forEach(del => {
    const key = `${del.fabric_kind}-${del.color || ''}`.toLowerCase().trim();
    if (fabricMap[key]) fabricMap[key].received += Number(del.amount_received || 0);
  });

  stats.fabrics = Object.values(fabricMap).map(f => ({
    ...f,
    netEksik: Math.max(0, f.needed - f.received)
  })).filter(f => f.netEksik > 0.1);

  return stats;
};

/**
 * 3. GRUP BAZLI KUMAŞ İHTİYACI (LİSTE İÇİN)
 */
export const getFabricsByOrderNo = async (orderNo) => {
  // Bu grup altındaki TÜM artikelleri çekiyoruz
  const { data, error } = await supabase.from('orders').select('*').eq('order_no', orderNo);
  if (error) throw error;
  
  const combinedFabrics = {};
  data.forEach(order => {
    const extra = 1 + (Number(order.extra_percent || 5) / 100);
    const orderQty = Object.values(order.qty_by_size || {}).reduce((a, b) => a + (Number(b) || 0), 0);

    Object.entries(order.fabrics || {}).forEach(([fKey, f]) => {
      if (!f.kind || !f.perPieceKg) return;
      const fabricUniqueKey = `${f.kind}-${f.color}-${f.unit}`.toLowerCase().trim();
      
      if (!combinedFabrics[fabricUniqueKey]) {
        combinedFabrics[fabricUniqueKey] = { ...f, totalAmount: 0, isMain: fKey === 'main' };
      }
      combinedFabrics[fabricUniqueKey].totalAmount += (orderQty * extra * Number(f.perPieceKg));
    });
  });
  return Object.values(combinedFabrics).sort((a, b) => b.isMain - a.isMain);
};

export const getAllOrders = () => supabase.from('orders').select('*').order('created_at', { ascending: false }).then(res => res.data);
export const deleteOrder = (id) => supabase.from('orders').delete().eq('id', id);
export const addFabricDelivery = (data) => supabase.from('fabric_deliveries').insert([data]).select();
export const uploadModelImage = async (file) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage.from('models').upload(fileName, file);
  if (error) throw error;
  return supabase.storage.from('models').getPublicUrl(fileName).data.publicUrl;
};
export const getRecentOrders = async () => {
  const { data } = await supabase.from('orders').select('order_no, customer').order('created_at', { ascending: false }).limit(40);
  return Array.from(new Set(data.map(a => a.order_no))).map(no => data.find(a => a.order_no === no));
};