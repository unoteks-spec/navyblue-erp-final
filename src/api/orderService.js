import { supabase } from './supabaseClient';
import { toTitleCaseTR } from '../utils/stringUtils';

export { supabase };

/**
 * 1. SİPARİŞ KAYDET VEYA GÜNCELLE
 * Dinamik Sipariş No Üretimi: MÜŞ-YIL-SIRA (Örn: LCW-2026-001)
 */
export const saveOrder = async (formData, orderId = null, forceOrderNo = null) => {
  let finalOrderNo = forceOrderNo;

  // --- 🆕 OTOMATİK SİPARİŞ NO ÜRETİMİ (Sadece Yeni Kayıtlarda) ---
  if (!orderId && !forceOrderNo) {
    try {
      const year = new Date().getFullYear();
      // Müşteri isminin ilk 3 harfini al, Türkçe karakterleri büyüt, boşlukları temizle
      const customerBase = (formData.customer || "SIP").trim();
      let prefix = customerBase
        .substring(0, 3)
        .toLocaleUpperCase('tr-TR')
        .replace(/\s/g, 'X'); 
      
      if (prefix.length < 3) prefix = prefix.padEnd(3, 'X');

      // Veritabanında bu prefix ve yıla ait son numarayı bul
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
      console.error("Sipariş no üretim hatası:", err);
      finalOrderNo = `ORD-${Date.now()}`; // Hata durumunda yedek plan
    }
  }

  const dbPayload = {
    order_no: finalOrderNo,
    customer: toTitleCaseTR(formData.customer || "").trim(),
    article: toTitleCaseTR(formData.article || "").trim(),
    model: formData.model || "",
    color: formData.color || "",
    due: formData.due || null,
    extra_percent: Number(formData.extra_percent ?? formData.extraPercent ?? 0),
    qty_by_size: formData.qty_by_size ?? formData.qtyBySize ?? {},
    fabrics: formData.fabrics || {},
    post_processes: formData.post_processes ?? formData.postProcesses ?? [],
    model_image: formData.model_image ?? formData.modelImage ?? null
  };

  let query = orderId 
    ? supabase.from('orders').update(dbPayload).eq('id', orderId) 
    : supabase.from('orders').insert([dbPayload]);

  const { data, error } = await query.select();
  
  if (error) {
    console.error("Sipariş Kayıt/Güncelleme Hatası:", error.message);
    throw error;
  }
  return data[0];
};

/**
 * 2. KESİM ÖNCESİ DETAYLARI GÜNCELLE
 */
export const updateCuttingDetails = async (orderId, details) => {
  const { error } = await supabase
    .from('orders')
    .update({
      marker_width: details.markerWidth,
      cutting_date: details.cuttingDate
    })
    .eq('id', orderId);
  
  if (error) throw error;
};

/**
 * 3. KESİM SONUÇLARINI GÜNCELLE
 */
export const updateCuttingResults = async (orderId, results, details) => {
  const { error } = await supabase
    .from('orders')
    .update({ 
      cutting_qty: results,
      cutting_date: details.cuttingDate,
      marker_width: details.markerWidth,
      status: 'cut_completed'
    })
    .eq('id', orderId);
  
  if (error) throw error;
};

/**
 * 4. DASHBOARD İSTATİSTİKLERİ (Workflow V3)
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
    fabrics: [], // UI'da beklenen isim
    deadlines: orders
      .filter(o => o.due)
      .sort((a, b) => new Date(a.due) - new Date(b.due))
      .slice(0, 5)
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
        fabricMap[key] = { 
          kind: f.kind, color: f.color, unit: f.unit || 'kg', 
          needed: 0, received: 0, isOrdered: order.fabric_ordered 
        };
      }
      const extra = 1 + (Number(order.extra_percent || 5) / 100);
      fabricMap[key].needed += (plannedQty * extra * Number(f.perPieceKg));
      if (!order.fabric_ordered) fabricMap[key].isOrdered = false;
    });
  });

  deliveries.forEach(del => {
    const key = `${del.fabric_kind}-${del.color || ''}`.toLowerCase().trim();
    if (fabricMap[key]) {
      fabricMap[key].received += Number(del.amount_received || 0);
    }
  });

  // UI uyumluluğu için objeyi diziye çevir ve netEksik hesapla
  stats.fabrics = Object.values(fabricMap).map(f => ({
    ...f,
    netEksik: Math.max(0, f.needed - f.received)
  })).filter(f => f.netEksik > 0.1);

  // Dashboard StatCard'da "totalPieces" bekliyorsa:
  stats.totalPieces = stats.totalPlanned;

  return stats;
};

/**
 * 5. YAZDIRMA İÇİN KUMAŞ ÖZETİ
 */
export const getFabricsByOrderNo = async (orderNo) => {
  const { data, error } = await supabase.from('orders').select('*').eq('order_no', orderNo);
  if (error) throw error;
  
  const combinedFabrics = {};
  data.forEach(order => {
    const extra = 1 + (Number(order.extra_percent ?? order.extraPercent ?? 0) / 100);
    const qtyObj = order.qty_by_size ?? order.qtyBySize ?? {};
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

// orderService.js içine ekle:
export const updateOrderStage = async (orderId, stageKey, currentTracking) => {
  const now = new Date().toISOString();
  const updatedTracking = { 
    ...(currentTracking || {}), 
    [stageKey]: now 
  };

  

  const { error } = await supabase
    .from('orders')
    .update({ 
      current_stage: stageKey,
      tracking: updatedTracking 
    })
    .eq('id', orderId);

  if (error) throw error;
  return updatedTracking;


  
};

/**
 * 6. YARDIMCILAR
 */
export const getAllOrders = () => supabase.from('orders').select('*').order('created_at', { ascending: false }).then(res => res.data);

export const deleteOrder = async (id) => {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const addFabricDelivery = (data) => supabase.from('fabric_deliveries').insert([data]).select();
export const deleteFabricDelivery = (id) => supabase.from('fabric_deliveries').delete().eq('id', id);

export const uploadModelImage = async (file) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('models').upload(fileName, file);
    if (error) throw error;
    return supabase.storage.from('models').getPublicUrl(fileName).data.publicUrl;
  } catch (err) {
    throw err;
  }
};

export const getRecentOrders = async () => {
  const { data } = await supabase.from('orders').select('order_no, customer').order('created_at', { ascending: false }).limit(40);
  return Array.from(new Set(data.map(a => a.order_no))).map(no => data.find(a => a.order_no === no));
};

// orderService.js içine ekle:
export const moveOrderBack = async (orderId, prevStageKey) => {
  const { error } = await supabase
    .from('orders')
    .update({ 
      current_stage: prevStageKey
    })
    .eq('id', orderId);

  if (error) throw error;
  return true;
};