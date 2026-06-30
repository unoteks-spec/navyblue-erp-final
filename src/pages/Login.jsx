import React, { useState } from 'react';
import { supabase } from '../api/orderService';
import { Lock, Mail, Anchor, ArrowRight, ShieldCheck } from 'lucide-react';

const NAVY = '#1e3a5f';

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
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="border border-slate-100 rounded-2xl p-8 md:p-12">
          
          {/* Logo Bölümü */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: NAVY }}>
              <Anchor size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Navy Blue ERP</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Yönetim Paneli</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold">
              <ShieldCheck size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">E-Posta Adresi</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white text-sm font-bold transition-all"
                  placeholder="kaptan@navyblue.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white text-sm font-bold transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 group disabled:opacity-50"
              style={{ background: NAVY }}
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