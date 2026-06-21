import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../api/orderService';
import { ClipboardList, Search } from 'lucide-react';

const STAGE_LABELS = {
  kesimhanede:   'KESİMHANE',
  baski:         'BASKI',
  nakis:         'NAKIŞ',
  dikim:         'DİKİM',
  ilik_dugme:    'İLİK-DÜĞME',
  yikama_boyama: 'YIKAMA-BOYAMA',
  utu_ambalaj:   'ÜTÜ AMBALAJ',
  yuklendi:      'YÜKLENDİ',
};

const STAGE_ORDER = ['kesimhanede','baski','nakis','dikim','ilik_dugme','yikama_boyama','utu_ambalaj','yuklendi'];

export default function WaybillHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // ✅ orders join'i eklendi — arşiv durumu kontrolü için
      const { data } = await supabase
        .from('waybill_logs')
        .select('*, orders(is_archived, status)')
        .order('sent_at', { ascending: false });
      setLogs(data || []);
      setLoading(false);
    };
    load();
  }, []);

  // ✅ Artikel + renk bazında grupla, her aşama bir sütun
  const grouped = useMemo(() => {
    const map = {};
    logs.forEach(log => {
      const key = `${log.article}__${log.color}`;
      if (!map[key]) {
        const ord = Array.isArray(log.orders) ? log.orders[0] : log.orders;
        map[key] = {
          article:  log.article,
          color:    log.color,
          customer: log.customer,
          isArchived: ord ? (ord.is_archived === true || ord.status === 'archived') : false,
          stages:   {},
        };
      }
      if (!map[key].stages[log.stage]) {
        map[key].stages[log.stage] = [];
      }
      const already = map[key].stages[log.stage].find(w => w.waybill_no === log.waybill_no);
      if (!already) {
        map[key].stages[log.stage].push({ waybill_no: log.waybill_no, sent_at: log.sent_at });
      }
    });
    return Object.values(map);
  }, [logs]);

  // ✅ Arşivli kayıtlar varsayılan olarak gizli
  const visibleGroups = useMemo(() => {
    return showArchived ? grouped : grouped.filter(g => !g.isArchived);
  }, [grouped, showArchived]);

  const activeStages = useMemo(() => {
    const stageSet = new Set();
    visibleGroups.forEach(row => Object.keys(row.stages).forEach(s => stageSet.add(s)));
    return STAGE_ORDER.filter(s => stageSet.has(s));
  }, [visibleGroups]);

  const filtered = useMemo(() => {
    if (!search.trim()) return visibleGroups;
    const q = search.toLocaleLowerCase('tr-TR');
    return visibleGroups.filter(row =>
      (row.article  || '').toLocaleLowerCase('tr-TR').includes(q) ||
      (row.color    || '').toLocaleLowerCase('tr-TR').includes(q) ||
      (row.customer || '').toLocaleLowerCase('tr-TR').includes(q) ||
      Object.values(row.stages).flat().some(w => (w.waybill_no || '').toLocaleLowerCase('tr-TR').includes(q))
    );
  }, [visibleGroups, search]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 pb-32 space-y-5">

      {/* BAŞLIK */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-lg"><ClipboardList size={20}/></div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">İrsaliye Geçmişi</h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-0.5">{filtered.length} Artikel</p>
        </div>
      </div>

      {/* ARAMA + ARŞİV TOGGLE */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm relative flex-1">
          <Search size={15} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Artikel, renk, müşteri veya irsaliye no ara..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl outline-none text-[11px] font-bold"/>
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${
            showArchived
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
          }`}
        >
          {showArchived ? '✓ Arşiv Dahil' : 'Sadece Aktif'}
        </button>
      </div>

      {/* TABLO */}
      {loading ? (
        <div className="text-center py-16 text-slate-300 font-black text-[10px] uppercase animate-pulse">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-200 font-black text-[10px] uppercase">Kayıt bulunamadı</div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="py-4 px-4 whitespace-nowrap">Artikel</th>
                <th className="py-4 px-4 whitespace-nowrap">Renk</th>
                {activeStages.map(s => (
                  <th key={s} className="py-4 px-4 whitespace-nowrap text-center">
                    {STAGE_LABELS[s] || s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row, i) => (
                <tr key={`${row.article}__${row.color}`} className={`hover:bg-slate-50/50 transition-colors ${row.isArchived ? 'opacity-60' : ''}`}>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-slate-900 uppercase">{row.article || '—'}</span>
                      {row.isArchived && (
                        <span className="text-[7px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">arşiv</span>
                      )}
                    </div>
                    {row.customer && <div className="text-[9px] text-slate-400 font-bold uppercase">{row.customer}</div>}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-[11px] font-bold text-slate-600 uppercase">{row.color || '—'}</span>
                  </td>
                  {activeStages.map(s => {
                    const entries = row.stages[s] || [];
                    return (
                      <td key={s} className="py-3 px-4 text-center">
                        {entries.length === 0 ? (
                          <span className="text-slate-200 text-[10px] font-black">—</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {entries.map((w, j) => (
                              <div key={j}>
                                <div className="text-[11px] font-black text-slate-900">{w.waybill_no}</div>
                                {w.sent_at && (
                                  <div className="text-[9px] text-slate-400 font-bold">
                                    {new Date(w.sent_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}