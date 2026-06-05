import React, { useEffect, useState, useCallback } from 'react';
import { getDashboardStats } from '../api/orderService';
import { RefreshCcw, Scissors, AlertTriangle, Clock, Package, TrendingUp, ChevronRight, Layers, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const loadStats = useCallback(async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Dashboard veri hatası:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => setNow(new Date()), 60000);
    window.addEventListener('focus', loadStats);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', loadStats);
    };
  }, [loadStats]);

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const readyToCut = stats?.deadlines?.filter(o => o.fabric_ordered && o.current_stage === 'kesimhanede') || [];
  const waitingFabric = stats?.deadlines?.filter(o => !o.fabric_ordered) || [];

  const urgentDeadlines = (stats?.deadlines || [])
    .map(o => ({ ...o, daysLeft: getDaysUntil(o.due) }))
    .filter(o => o.daysLeft !== null && o.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const efficiency = stats?.totalPlanned > 0
    ? Math.round((stats.totalActualCut / stats.totalPlanned) * 100)
    : 0;

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Yükleniyor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-32">

        {/* BAŞLIK */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              {now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none mt-1">
              Üretim Paneli
            </h1>
          </div>
          <button
            onClick={loadStats}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin text-blue-600' : 'text-slate-400'} />
          </button>
        </div>

        {/* ÖZET SAYAÇLAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900 text-white p-5 rounded-3xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Aktif Sipariş</p>
            <p className="text-3xl font-black mt-1 leading-none">{stats?.orderCount || 0}</p>
            <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase">Üretim Hattında</p>
          </div>
          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Planlanan</p>
            <p className="text-3xl font-black mt-1 leading-none text-slate-900">{(stats?.totalPlanned || 0).toLocaleString()}</p>
            <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">Toplam Adet</p>
          </div>
          <div className="bg-emerald-600 text-white p-5 rounded-3xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-200">Kesilen</p>
            <p className="text-3xl font-black mt-1 leading-none">{(stats?.totalActualCut || 0).toLocaleString()}</p>
            <p className="text-[9px] text-emerald-200 mt-2 font-bold uppercase">Toplam Adet</p>
          </div>
          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Kesim Verimi</p>
            <p className="text-3xl font-black mt-1 leading-none text-slate-900">%{efficiency}</p>
            <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${efficiency}%` }}
              />
            </div>
          </div>
        </div>

        {/* ANA İÇERİK: 2 KOLON */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* SOL: KESİME HAZIR */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Kesime Hazır</h2>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-emerald-100">
                {readyToCut.length} Artikel
              </span>
            </div>

            <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
              {readyToCut.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 size={28} className="mx-auto text-slate-100 mb-2" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Kesim Bekleyen Yok</p>
                </div>
              ) : readyToCut.map(o => {
                const days = getDaysUntil(o.due);
                const total = Object.values(o.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
                return (
                  <div key={o.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm uppercase truncate">{o.article}</span>
                        <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100 shrink-0">{o.customer}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{o.model} · {o.color}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{total.toLocaleString()}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase">adet</p>
                      </div>
                      {days !== null && (
                        <div className={`text-[9px] font-black px-2 py-1 rounded-lg ${days < 0 ? 'bg-red-50 text-red-600 border border-red-100' : days <= 7 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                          {days < 0 ? `${Math.abs(days)}g gecikti` : days === 0 ? 'Bugün!' : `${days}g`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SAĞ: TERMİN UYARILARI */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-amber-500" />
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Termin Uyarıları</h2>
              </div>
              <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-amber-100">
                14 Gün İçi
              </span>
            </div>

            <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
              {urgentDeadlines.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 size={28} className="mx-auto text-slate-100 mb-2" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Kritik Termin Yok</p>
                </div>
              ) : urgentDeadlines.map(o => {
                const isLate = o.daysLeft < 0;
                const isUrgent = o.daysLeft >= 0 && o.daysLeft <= 3;
                return (
                  <div key={o.id} className={`px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors ${isLate ? 'bg-red-50/30' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isLate && <AlertTriangle size={11} className="text-red-500 shrink-0" />}
                        <span className="font-black text-slate-900 text-sm uppercase truncate">{o.article}</span>
                        <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md shrink-0">{o.customer}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{o.model} · {o.color}</p>
                    </div>
                    <div className={`shrink-0 ml-3 text-center px-3 py-1.5 rounded-xl border font-black text-[10px] ${
                      isLate ? 'bg-red-600 text-white border-red-600' :
                      isUrgent ? 'bg-amber-500 text-white border-amber-500' :
                      'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {isLate ? `${Math.abs(o.daysLeft)}g GEÇ` : o.daysLeft === 0 ? 'BUGÜN' : `${o.daysLeft} GÜN`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ALT SOL: KUMAŞ BEKLEYENLEr */}
          <div className="bg-slate-900 rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-blue-400" />
                <h2 className="text-[11px] font-black text-white uppercase tracking-widest">Kumaş Bekleyen</h2>
              </div>
              <span className="bg-white/10 text-slate-300 text-[10px] font-black px-2.5 py-1 rounded-lg">
                {waitingFabric.length} Artikel
              </span>
            </div>

            <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
              {waitingFabric.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tüm Kumaşlar Sipariş Edildi</p>
                </div>
              ) : waitingFabric.map(o => {
                const total = Object.values(o.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
                const days = getDaysUntil(o.due);
                return (
                  <div key={o.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-white text-sm uppercase truncate">{o.article}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{o.customer} · {o.color}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-sm font-black text-slate-300">{total.toLocaleString()}</span>
                      {days !== null && days <= 14 && (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${days < 0 ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/30 text-amber-400'}`}>
                          {days < 0 ? `${Math.abs(days)}g GEÇ` : `${days}g`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ALT SAĞ: NET KUMAŞ EKSİKLERİ */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-blue-500" />
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Net Kumaş Eksiği</h2>
              </div>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-blue-100">
                {stats?.fabrics?.length || 0} Kalem
              </span>
            </div>

            <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
              {!stats?.fabrics?.length ? (
                <div className="py-10 text-center">
                  <CheckCircle2 size={28} className="mx-auto text-slate-100 mb-2" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Kumaş Eksiği Yok</p>
                </div>
              ) : stats.fabrics.map((f, i) => (
                <div key={i} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 text-sm uppercase truncate">{f.kind}</p>
                      <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md shrink-0 uppercase">{f.color}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{f.poNo}</p>
                      {f.supplier && <p className="text-[9px] text-blue-500 font-bold uppercase truncate">· {f.supplier}</p>}
                    </div>
                    {/* Sipariş edilen vs gelen progress */}
                    <div className="mt-1.5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, (f.received / f.ordered) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 ml-4 text-right">
                    <p className="text-sm font-black text-blue-600">{Number(f.netEksik || 0).toFixed(1)}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">{f.unit || 'KG'} eksik</p>
                    <p className="text-[8px] text-slate-300 font-bold uppercase">{f.received}/{f.ordered} geldi</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}