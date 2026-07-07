import React, { useEffect, useState } from 'react';
import { supabase } from './api/orderService';
import Login from './pages/Login';

import Orders from './pages/Orders';
import OrderList from './pages/OrderList';
import Dashboard from './pages/Dashboard';
import ProductionReport from './pages/ProductionReport';
import ProductionTrack from './pages/ProductionTrack';
import ArchivedOrders from './pages/ArchivedOrders';
import PackingList from './pages/PackingList';
import FabricManagement from './pages/FabricManagement';
import WaybillHistory from './pages/WaybillHistory';
import SizeCharts from './pages/SizeCharts';

import { 
  LayoutGrid, PlusCircle, PieChart, FileBarChart, Activity,
  Archive, Package, Layers, LogOut, ClipboardList
, Ruler } from 'lucide-react';

function App() {
  const [session, setSession]       = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  function handleEditOrder(order) { setEditingOrder(order); setActivePage('create'); }
  function handleComplete()       { setEditingOrder(null);  setActivePage('list'); }

  const handleLogout = async () => {
    if (window.confirm("Oturumu kapatmak istediğinize emin misiniz?")) {
      await supabase.auth.signOut();
    }
  };

  if (!session) return <Login/>;

  const navItems = [
    { key: 'dashboard', label: 'Panel',  icon: PieChart },
    { key: 'list',      label: 'Liste',  icon: LayoutGrid },
    { key: 'track',     label: 'Akış',   icon: Activity },
    { key: 'archived',  label: 'Arşiv',  icon: Archive },
    { key: 'report',    label: 'Rapor',  icon: FileBarChart },
    { key: 'fabric',    label: 'Kumaş',  icon: Layers },
    { key: 'packing',   label: 'Çeki',   icon: Package },
    { key: 'waybills',  label: 'İrsaliye', icon: ClipboardList },
    { key: 'create',    label: 'Yeni',   icon: PlusCircle },
    { key: 'sizecharts', label: 'Ölçü',  icon: Ruler },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <main className="animate-in fade-in duration-500">
        {activePage === 'dashboard' && <Dashboard/>}
        {activePage === 'list'      && <OrderList onEditOrder={handleEditOrder}/>}
        {activePage === 'create'    && <Orders editingOrder={editingOrder} onComplete={handleComplete}/>}
        {activePage === 'track'     && <ProductionTrack/>}
        {activePage === 'report'    && <ProductionReport/>}
        {activePage === 'archived'  && <ArchivedOrders/>}
        {activePage === 'packing'   && <PackingList/>}
        {activePage === 'fabric'    && <FabricManagement/>}
        {activePage === 'waybills'  && <WaybillHistory/>}
        {activePage === 'sizecharts' && <SizeCharts/>}
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl px-5 py-4 rounded-[2.5rem] shadow-2xl flex items-center gap-4 md:gap-5 z-50 border border-white/10 max-w-[95vw] overflow-x-auto no-scrollbar">
        {navItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = activePage === item.key;
          return (
            <React.Fragment key={item.key}>
              <button
                onClick={() => { setEditingOrder(null); setActivePage(item.key); }}
                className={`flex flex-col items-center gap-1 transition-all duration-300 shrink-0 ${isActive ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2}/>
                <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
              </button>
              {i < navItems.length - 1 && <div className="w-px h-5 bg-slate-800 shrink-0"></div>}
            </React.Fragment>
          );
        })}
        <div className="w-px h-5 bg-slate-800/50 shrink-0"></div>
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-500 hover:text-red-400 transition-all duration-300 shrink-0">
          <LogOut size={18}/>
          <span className="text-[8px] font-black uppercase tracking-tighter">Çıkış</span>
        </button>
      </div>
    </div>
  );
}

export default App;