import React, { useEffect, useState, useCallback } from 'react';
import { getDashboardStats } from '../api/orderService';
import { RefreshCcw, Scissors, AlertTriangle, Clock, Package, TrendingUp, ChevronRight, Layers, CheckCircle2 } from 'lucide-react';

const NAVY = '#1e3a5f';

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Yükleniyor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 pb-32">

        {/* BAŞLIK */}
        <div className="flex items-center justify-between pt-4">
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
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : 'text-slate-400'} style={loading ? { color: NAVY } : {}} />
          </button>
        </div>

        {/* ÖZET SAYAÇLAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-100">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Aktif Sipariş</p>
            <p className="text-4xl font-black leading-none" style={{ color: NAVY }}>{stats?.orderCount || 0}</p>
            <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">Üretim Hattında</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Planlanan</p>
            <p className="text-4xl font-black leading-none text-slate-900">{(stats?.totalPlanned || 0).toLocaleString()}</p>
            <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">Toplam Adet</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Kesilen</p>
            <p className="text-4xl font-black leading-none text-slate-900">{(stats?.totalActualCut || 0).toLocaleString()}</p>
            <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">Toplam Adet</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Kesim Verimi</p>
            <p className="text-4xl font-black leading-none text-slate-900">%{efficiency}</p>
            <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden max-w-24">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${efficiency}%`, background: NAVY }}
              />
            </div>
          </div>
        </div>

        {/* ANA İÇERİK: 2 KOLON */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* SOL: KESİME HAZIR */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: NAVY }}></div>
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Kesime Hazır</h2>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase">
                {readyToCut.length} Artikel
              </span>
            </div>

            <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
              {readyToCut.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 size={28} className="mx-auto text-slate-200 mb-2" />
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
                        <span className="text-[8px] font-bold text-slate-400 uppercase shrink-0">{o.customer}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{o.model} · {o.color}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{total.toLocaleString()}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase">adet</p>
                      </div>
                      {days !== null && (
                        <div className={`text-[9px] font-black px-2 py-1 rounded-lg ${days < 0 ? 'bg-red-50 text-red-600' : days <= 7 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
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
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-slate-400" />
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Termin Uyarıları</h2>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase">
                14 Gün İçi
              </span>
            </div>

            <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
              {urgentDeadlines.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 size={28} className="mx-auto text-slate-200 mb-2" />
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
                        <span className="text-[8px] font-bold text-slate-400 uppercase shrink-0">{o.customer}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{o.model} · {o.color}</p>
                    </div>
                    <div className={`shrink-0 ml-3 text-center px-3 py-1.5 rounded-lg font-black text-[10px] ${
                      isLate ? 'bg-red-600 text-white' :
                      isUrgent ? 'bg-amber-500 text-white' :
                      'bg-slate-50 text-slate-700'
                    }`}>
                      {isLate ? `${Math.abs(o.daysLeft)}g GEÇ` : o.daysLeft === 0 ? 'BUGÜN' : `${o.daysLeft} GÜN`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ALT SOL: KUMAŞ BEKLEYENLER */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={13} className="text-slate-400" />
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Kumaş Bekleyen</h2>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase">
                {waitingFabric.length} Artikel
              </span>
            </div>

            <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
              {waitingFabric.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tüm Kumaşlar Sipariş Edildi</p>
                </div>
              ) : waitingFabric.map(o => {
                const total = Object.values(o.qty_by_size || {}).reduce((a, b) => a + Number(b || 0), 0);
                const days = getDaysUntil(o.due);
                return (
                  <div key={o.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-900 text-sm uppercase truncate">{o.article}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{o.customer} · {o.color}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-sm font-black text-slate-900">{total.toLocaleString()}</span>
                      {days !== null && days <= 14 && (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${days < 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
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
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={13} className="text-slate-400" />
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Net Kumaş Eksiği</h2>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase">
                {stats?.fabrics?.length || 0} Kalem
              </span>
            </div>

            <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
              {!stats?.fabrics?.length ? (
                <div className="py-10 text-center">
                  <CheckCircle2 size={28} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Kumaş Eksiği Yok</p>
                </div>
              ) : stats.fabrics.map((f, i) => (
                <div key={i} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 text-sm uppercase truncate">{f.kind}</p>
                      <span className="text-[8px] font-bold text-slate-400 uppercase shrink-0">{f.color}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{f.poNo}</p>
                      {f.supplier && <p className="text-[9px] text-slate-400 font-bold uppercase truncate">· {f.supplier}</p>}
                    </div>
                    {/* Sipariş edilen vs gelen progress */}
                    <div className="mt-1.5 h-1 w-full bg-slate-100 rounded-full overflow-hidden max-w-32">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (f.received / f.ordered) * 100)}%`, background: NAVY }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 ml-4 text-right">
                    <p className="text-sm font-black" style={{ color: NAVY }}>{Number(f.netEksik || 0).toFixed(1)}</p>
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