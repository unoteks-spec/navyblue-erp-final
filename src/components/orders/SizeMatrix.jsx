import React from 'react';
import { useWatch } from 'react-hook-form';
import { SIZE_GROUPS } from '../../constants/sizes';

const NAVY = '#1e3a5f';

export default function SizeMatrix({ register, watch, control }) {
  const [selectedGroup, setSelectedGroup] = React.useState(Object.keys(SIZE_GROUPS)[0]);
  const sizes = SIZE_GROUPS[selectedGroup];

  const currentValues = useWatch({ control, name: 'qtyBySize' }) || {};

  const total = React.useMemo(() => {
    return Object.values(currentValues).reduce((acc, curr) => {
      const val = parseFloat(curr);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [currentValues]);

  const getDisplayLabel = (size) => {
    const prefixes = ['B', 'K', 'S', 'Y', 'U', 'N'];
    return prefixes.includes(size.charAt(0)) && size.length > 1 ? size.substring(1) : size;
  };

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 space-y-6">
      <style>{`
        .no-spinner::-webkit-inner-spin-button, 
        .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spinner { -moz-appearance: textfield; }
      `}</style>

      {/* HEADER & TOPLAM SAYAÇ */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full" style={{ background: NAVY }}></div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Beden Dağılımı ve Adetler
          </h2>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-white px-6 py-2 rounded-xl text-sm font-black" style={{ background: NAVY }}>
            {total.toLocaleString('tr-TR')} ADET
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase mt-1 mr-1 tracking-tighter">
            Anlık Toplam Hesaplanan
          </span>
        </div>
      </div>

      {/* BEDEN GRUBU SEÇİMİ (TABLAR) */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 rounded-xl w-fit border border-slate-100">
        {Object.keys(SIZE_GROUPS).map(group => (
          <button
            key={group}
            type="button"
            onClick={() => setSelectedGroup(group)}
            className={`px-5 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all duration-300 ${
              selectedGroup === group 
              ? 'bg-white shadow-sm' 
              : 'text-slate-400 hover:text-slate-600'
            }`}
            style={selectedGroup === group ? { color: NAVY } : {}}
          >
            {group}
          </button>
        ))}
      </div>

      {/* BEDEN GİRİŞ GRİD'İ */}
      <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {sizes.map(size => {
          const displayLabel = getDisplayLabel(size);
          return (
            <div 
              key={size} 
              className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 hover:bg-white transition-all group"
            >
              <label className="text-[9px] font-black text-slate-400 text-center uppercase tracking-tighter">
                {displayLabel}
              </label>
              <input
                type="number"
                {...register(`qtyBySize.${size}`, { valueAsNumber: true })}
                placeholder="0"
                className="h-10 text-center rounded-lg border-none bg-white shadow-sm outline-none text-sm font-black text-slate-900 no-spinner"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}