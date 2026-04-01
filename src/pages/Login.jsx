import React, { useState } from 'react';
import { supabase } from '../api/orderService'; // Supabase client yolun
import { Lock, Mail, Anchor, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Giriş başarısız: Bilgilerinizi kontrol edin.");
      setLoading(false);
    }
    // Başarılı olursa App.jsx'teki onAuthStateChange tetiklenecek
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Arka Plan Dekorasyonu */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative">
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden p-8 md:p-12 border border-white/10">
          
          {/* Logo Bölümü */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 transform -rotate-6">
              <Anchor size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Navy Blue ERP</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Yönetim Paneli</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold">
              <ShieldCheck size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4">E-Posta Adresi</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-sm font-bold transition-all border border-slate-100"
                  placeholder="kaptan@navyblue.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-sm font-bold transition-all border border-slate-100"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? "Giriş Yapılıyor..." : (
                <>Giriş Yap <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <p className="text-center mt-10 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            Navy Blue ERP v3.0 — 2026
          </p>
        </div>
      </div>
    </div>
  );
}