import React, { useMemo } from 'react';
import { SIZE_GROUPS } from '../../constants/sizes';

export default function SizeMatrix({ register, watch }) {
  const [selectedGroup, setSelectedGroup] = React.useState('STANDART');
  const sizes = SIZE_GROUPS[selectedGroup];

  // 🔄 watch("qtyBySize") ile tüm bedenlerin değerlerini anlık izliyoruz
  const currentValues = watch("qtyBySize") || {};

  // 📊 Toplam Adet Hesaplama (Daha kararlı bir mantıkla)
  const total = useMemo(() => {
    return Object.values(currentValues).reduce((acc, curr) => {
      // Eğer değer boşsa veya sayı değilse 0 kabul et
      const val = parseFloat(curr);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    // currentValues içeriği her değiştiğinde (string bazlı kontrolle) tetiklenir
  }, [JSON.stringify(currentValues)]);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
      {/* no-spinner CSS: Ok tuşlarını gizler, modern görünüm sağlar */}
      <style>{`
        .no-spinner::-webkit-inner-spin-button, 
        .no-spinner::-webkit-outer-spin-button { 
          -webkit-appearance: none; margin: 0; 
        }
        .no-spinner { -moz-appearance: textfield; }
      `}</style>

      {/* HEADER & TOPLAM SAYAÇ */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Beden Dağılımı ve Adetler
          </h2>
        </div>
        <div className="flex flex-col items-end">
          <div className="bg-slate-900 text-white px-6 py-2 rounded-2xl text-sm font-black italic shadow-lg shadow-slate-200">
            {total.toLocaleString('tr-TR')} ADET
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase mt-1 mr-1 tracking-tighter">
            Anlık Toplam Hesaplanan
          </span>
        </div>
      </div>

      {/* BEDEN GRUBU SEÇİMİ (TABLAR) */}
      <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl w-fit border border-slate-100">
        {Object.keys(SIZE_GROUPS).map(group => (
          <button
            key={group}
            type="button"
            onClick={() => setSelectedGroup(group)}
            className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 ${
              selectedGroup === group 
              ? 'bg-white shadow-md text-blue-600 scale-105' 
              : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* BEDEN GİRİŞ GRID'İ */}
      <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {sizes.map(size => (
          <div 
            key={size} 
            className="flex flex-col gap-2 p-3 bg-slate-50 rounded-3xl border border-transparent hover:border-blue-200 hover:bg-white transition-all group"
          >
            <span className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter group-hover:text-blue-600">
              {size}
            </span>
            <input
              type="number"
              // valueAsNumber: true -> Verinin veritabanına her zaman sayı gitmesini sağlar
              {...register(`qtyBySize.${size}`, { valueAsNumber: true })}
              placeholder="0"
              className="h-10 text-center rounded-xl border-none bg-white shadow-sm focus:ring-4 focus:ring-blue-50 outline-none text-sm font-black text-slate-900 no-spinner"
            />
          </div>
        ))}
      </div>
    </div>
  );
}