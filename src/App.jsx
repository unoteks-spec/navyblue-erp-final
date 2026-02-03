// v2.0.1 - Final Design Polish
import React, { useState } from 'react';
import Orders from './pages/Orders';
import OrderList from './pages/OrderList';
import Dashboard from './pages/Dashboard';
import ProductionReport from './pages/ProductionReport';
import ProductionTrack from './pages/ProductionTrack';
import { 
  LayoutGrid, 
  PlusCircle, 
  PieChart, 
  FileBarChart, 
  Activity 
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
      </main>

      {/* Alt Menü (Modern Floating Navigation) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl px-6 py-4 rounded-[2.5rem] shadow-2xl flex items-center gap-6 md:gap-8 z-50 border border-white/10">
        
        {/* 1. Dashboard Butonu */}
        <button 
          onClick={() => { setEditingOrder(null); setActivePage('dashboard'); }}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${
            activePage === 'dashboard' ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <PieChart size={20} strokeWidth={activePage === 'dashboard' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Panel</span>
        </button>

        <div className="w-px h-6 bg-slate-800 hidden sm:block"></div>

        {/* 2. Liste Butonu */}
        <button 
          onClick={() => { setEditingOrder(null); setActivePage('list'); }}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${
            activePage === 'list' ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <LayoutGrid size={20} strokeWidth={activePage === 'list' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Liste</span>
        </button>

        <div className="w-px h-6 bg-slate-800 hidden sm:block"></div>

        {/* 3. Üretim Akışı Butonu (YENİ) */}
        <button 
          onClick={() => { setEditingOrder(null); setActivePage('track'); }}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${
            activePage === 'track' ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Activity size={20} strokeWidth={activePage === 'track' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Akış</span>
        </button>

        <div className="w-px h-6 bg-slate-800 hidden sm:block"></div>

        {/* 4. Rapor Butonu */}
        <button 
          onClick={() => { setEditingOrder(null); setActivePage('report'); }}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${
            activePage === 'report' ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <FileBarChart size={20} strokeWidth={activePage === 'report' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Rapor</span>
        </button>

        <div className="w-px h-6 bg-slate-800 hidden sm:block"></div>

        {/* 5. Yeni Kayıt Butonu */}
        <button 
          onClick={() => { setEditingOrder(null); setActivePage('create'); }}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${
            activePage === 'create' ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <PlusCircle size={20} strokeWidth={activePage === 'create' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Yeni</span>
        </button>
      </div>
    </div>
  );
}

export default App;