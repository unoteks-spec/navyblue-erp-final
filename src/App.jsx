// v2.2.0 - Shipping & Packing Integration
import React, { useState } from 'react';
import Orders from './pages/Orders';
import OrderList from './pages/OrderList';
import Dashboard from './pages/Dashboard';
import ProductionReport from './pages/ProductionReport';
import ProductionTrack from './pages/ProductionTrack';
import ArchivedOrders from './pages/ArchivedOrders';
import PackingList from './pages/PackingList'; // 🛠️ YENİ EKLEDİK
import { 
  LayoutGrid, 
  PlusCircle, 
  PieChart, 
  FileBarChart, 
  Activity,
  Archive,
  Package // 🛠️ Çeki Listesi İkonu
} from 'lucide-react';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [editingOrder, setEditingOrder] = useState(null);

  // 🔄 Düzenleme İşlemini Başlat (Listeden Form'a geçiş)
  function handleEditOrder(order) {
    setEditingOrder(order); 
    setActivePage('create'); 
  }

  // ✅ İşlem Tamamlandığında (Form'dan Liste'ye dönüş)
  function handleComplete() {
    setEditingOrder(null); 
    setActivePage('list'); 
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      
      {/* Sayfa İçeriği Yönetimi */}
      <main className="animate-in fade-in duration-500">
        {activePage === 'dashboard' && <Dashboard />}
        
        {activePage === 'list' && (
          <OrderList onEditOrder={handleEditOrder} />
        )}
        
        {activePage === 'create' && (
          <Orders 
            editingOrder={editingOrder} 
            onComplete={handleComplete} 
          />
        )}

        {activePage === 'track' && <ProductionTrack />}

        {activePage === 'report' && <ProductionReport />}

        {activePage === 'archived' && <ArchivedOrders />}

        {/* 🛠️ ÇEKİ LİSTESİ SAYFASI */}
        {activePage === 'packing' && <PackingList />}
      </main>

      {/* Alt Menü (Modern Floating Navigation) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl px-5 py-4 rounded-[2.5rem] shadow-2xl flex items-center gap-4 md:gap-6 z-50 border border-white/10 max-w-[95vw] overflow-x-auto no-scrollbar">
        
        {/* 1. Dashboard */}
        <button 
          onClick={() => { setEditingOrder(null); setActivePage('dashboard'); }}
          className={`flex flex-col items-center gap-1 transition-all duration-300 shrink-0 ${
            activePage === 'dashboard' ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <PieChart size={18} strokeWidth={activePage === 'dashboard' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Panel</span>
        </button>

        <div className="w-px h-5 bg-slate-800 hidden sm:block"></div>

        {/* 2. Liste */}
        <button 
          onClick={() => { setEditingOrder(null); setActivePage('list'); }}
          className={`flex flex-col items-center gap-1 transition-all duration-300 shrink-0 ${
            activePage === 'list' ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <LayoutGrid size={18} strokeWidth={activePage === 'list' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Liste</span>
        </button>

        <div className="w-px h-5 bg-slate-800 hidden sm:block"></div>

        {/* 3. Akış */}
        <button 
          onClick={() => { setEditingOrder(null); setActivePage('track'); }}
          className={`flex flex-col items-center gap-1 transition-all duration-300 shrink-0 ${
            activePage === 'track' ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Activity size={18} strokeWidth={activePage === 'track' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Akış</span>
        </button>

        <div className="w-px h-5 bg-slate-800 hidden sm:block"></div>

        {/* 4. Arşiv (Eski Yerinde ✨) */}
        <button 
          onClick={() => { setEditingOrder(null); setActivePage('archived'); }}
          className={`flex flex-col items-center gap-1 transition-all duration-300 shrink-0 ${
            activePage === 'archived' ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Archive size={18} strokeWidth={activePage === 'archived' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Arşiv</span>
        </button>

        <div className="w-px h-5 bg-slate-800 hidden sm:block"></div>

        {/* 5. Rapor */}
        <button 
          onClick={() => { setEditingOrder(null); setActivePage('report'); }}
          className={`flex flex-col items-center gap-1 transition-all duration-300 shrink-0 ${
            activePage === 'report' ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <FileBarChart size={18} strokeWidth={activePage === 'report' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Rapor</span>
        </button>

        <div className="w-px h-5 bg-slate-800 hidden sm:block"></div>

        {/* 6. Çeki Listesi (YENİ 🛠️) */}
        <button 
          onClick={() => { setEditingOrder(null); setActivePage('packing'); }}
          className={`flex flex-col items-center gap-1 transition-all duration-300 shrink-0 ${
            activePage === 'packing' ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Package size={18} strokeWidth={activePage === 'packing' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Çeki</span>
        </button>

        <div className="w-px h-5 bg-slate-800 hidden sm:block"></div>

        {/* 7. Yeni Kayıt */}
        <button 
          onClick={() => { setEditingOrder(null); setActivePage('create'); }}
          className={`flex flex-col items-center gap-1 transition-all duration-300 shrink-0 ${
            activePage === 'create' ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <PlusCircle size={18} strokeWidth={activePage === 'create' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Yeni</span>
        </button>
      </div>
    </div>
  );
}

export default App;