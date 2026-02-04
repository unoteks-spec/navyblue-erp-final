import React, { useEffect, useState, useCallback } from 'react';
import { getDashboardStats } from '../api/orderService';
import { 
  Package, Ruler, Calendar, ArrowUpRight, Droplet, 
  CheckCircle2, Scissors, Printer, AlertTriangle,
  LayoutGrid, PieChart, RefreshCcw
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    // Küçük bir püf noktası: Kullanıcıyı çok bekletmemek için 
    // sadece ilk yüklemede tam ekran loading gösterelim.
    if (!stats) setLoading(true); 
    
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Dashboard veri hatası:", error);
    } finally {
      setLoading(false);
    }
  }, [stats]);

  useEffect(() => {
    // 1. Sayfa ilk açıldığında yükle
    loadStats();

    // 2. Sayfaya her geri dönüldüğünde (focus olduğunda) veriyi tazele
    // Bu, telefonunda uygulamayı açtığında veya sekmeler arası geçtiğinde çalışır.
    window.addEventListener('focus', loadStats);
    
    // Temizlik
    return () => window.removeEventListener('focus', loadStats);
  }, [loadStats]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Veriler Analiz Ediliyor...</p>
        </div>
      </div>
    );
  }

  // ... (Geri kalan StatCard ve Render kısımları aynı kalabilir, sadece yukarıdaki loadStats ve useEffect değişti)
  // Devamını senin kodunla aynı şekilde bırakıyorum:
  
  const efficiency = stats?.totalPlanned > 0 
    ? Math.round((stats.totalActualCut / stats.totalPlanned) * 100) 
    : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 pb-32">
      {/* BAŞLIK */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-lg">
            <PieChart size={20} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase">NAVY BLUE</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">Üretim Kontrol Paneli</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Sistem Çevrimiçi</span>
        </div>
      </div>

      {/* ÖZET KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Package className="text-blue-600" size={24} />} 
          label="Bekleyen Sipariş" 
          value={stats?.orderCount} 
          subValue="Aktif Üretim Hattı" 
        />
        <StatCard 
          icon={<Scissors className="text-emerald-600" size={24} />} 
          label="Kesim Verimi" 
          value={`%${efficiency}`} 
          subValue={`${stats?.totalActualCut?.toLocaleString()} / ${stats?.totalPlanned?.toLocaleString()}`} 
        />
        <StatCard 
          icon={<Printer className="text-indigo-600" size={24} />} 
          label="Kumaş Tedarik" 
          value={stats?.fabricOrderedCount} 
          subValue={`${stats?.waitingFabricOrder} Sipariş Bekliyor`}
          isAlert={stats?.waitingFabricOrder > 0}
        />
        <StatCard 
          icon={<Droplet className="text-purple-600" size={24} />} 
          label="Kumaş Kalemi" 
          value={stats?.fabrics?.length} 
          subValue="Eksik Kumaş Türü" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* KRİTİK TERMİNLER */}
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-slate-400" size={18} />
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Kritik Terminler</h2>
            </div>
            <button 
              onClick={loadStats} 
              className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              title="Yenile"
            >
              <RefreshCcw size={12} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
            </button>
          </div>
          
          <div className="space-y-4">
            {stats?.deadlines?.length > 0 ? stats.deadlines.map(d => (
              <div key={d.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all group cursor-default">
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors truncate">{d.customer}</div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 truncate">
                    {d.article} <span className="text-slate-300 mx-1">/</span> {d.order_no}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 ml-4">
                  <div className={`text-[10px] font-black ${new Date(d.due) < new Date() ? 'text-red-500' : 'text-slate-800'}`}>
                    {new Date(d.due).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center text-slate-300 italic text-xs font-medium uppercase tracking-widest">Kritik plan bulunmuyor.</div>
            )}
          </div>
        </div>

        {/* KUMAŞ İHTİYACI */}
        <div className="bg-slate-900 p-6 md:p-8 rounded-[3rem] text-white space-y-6 shadow-2xl relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <Ruler className="text-blue-400" size={18} />
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Net Kumaş İhtiyacı</h2>
            </div>
          </div>

          <div className="space-y-5 max-h-96 overflow-y-auto pr-3 custom-scrollbar">
            {stats?.fabrics?.length > 0 ? stats.fabrics.map((f, i) => (
              <div key={i} className="flex justify-between items-center group border-b border-white/5 pb-4 last:border-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-black text-white uppercase group-hover:text-blue-400 transition-colors">{f.kind}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-blue-400 font-black uppercase tracking-widest">{f.color}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="text-xl font-black text-emerald-400 tracking-tighter">
                      {Number(f.netEksik || 0).toFixed(1)}
                    </div>
                    <span className="text-[9px] text-slate-500 font-black uppercase">{f.unit}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center space-y-3">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500/20" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kumaş eksiği bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// StatCard bileşeni aynı kalıyor...
function StatCard({ icon, label, value, subValue, isAlert }) {
  return (
    <div className={`bg-white p-5 rounded-[2.5rem] border ${isAlert ? 'border-indigo-100 shadow-indigo-50' : 'border-slate-100'} shadow-sm flex items-center gap-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden`}>
      <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shrink-0 text-slate-600">
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] truncate">{label}</p>
        <p className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter mt-0.5 truncate">{value || 0}</p>
        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter truncate opacity-70">{subValue}</p>
      </div>
    </div>
  );
}