import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Save, Link2, CheckCircle, AlertCircle, Loader2, RefreshCcw, 
  UploadCloud, PlusCircle 
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import SizeMatrix from '../components/orders/SizeMatrix';
import AddOrderModal from '../components/orders/AddOrderModal';
import { saveOrder, uploadModelImage } from '../api/orderService';
import { DEFAULT_QTY_BY_SIZE } from '../constants/sizes';

const NAVY = '#1e3a5f';

// --- YARDIMCI FONKSİYONLAR ---
const capitalizeTR = (str) => {
  if (!str) return "";
  return str
    .split(' ')
    .map(word => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR'))
    .join(' ');
};

const GARNI_KEYS = [
  { id: 'g1', label: 'Garni Kumaş 1' },
  { id: 'g2', label: 'Garni Kumaş 2' },
  { id: 'g3', label: 'Garni Kumaş 3' },
  { id: 'g4', label: 'Garni Kumaş 4' },
];

const DEFAULT_FABRICS = {
  main: { unit: 'Kg', type: 'Örme' },
  g1: { unit: 'Kg', type: 'Örme' },
  g2: { unit: 'Kg', type: 'Örme' },
  g3: { unit: 'Kg', type: 'Örme' },
  g4: { unit: 'Kg', type: 'Örme' }
};

// --- KUMAŞ KARTI BİLEŞENİ ---
const FabricCard = ({ id, label, isMain, register, watch, setValue, handleCapitalize }) => {
  const unitValue = watch(`fabrics.${id}.unit`) || 'Kg';

  return (
    <div className={`bg-white p-6 rounded-2xl border ${isMain ? 'relative overflow-hidden' : 'border-slate-100'} space-y-5`} style={isMain ? { borderColor: '#e5e7eb', borderWidth: 1 } : {}}>
      {isMain && <div className="absolute top-0 left-0 w-1 h-full" style={{ background: NAVY }}></div>}
      <span className="font-black uppercase tracking-widest text-[10px] text-slate-400" style={isMain ? { color: NAVY } : {}}>
        {label}
      </span>
      <div className={`grid grid-cols-1 md:grid-cols-4 ${isMain ? 'lg:grid-cols-7' : 'lg:grid-cols-3'} gap-4`}>
        <Input label="Cinsi" {...register(`fabrics.${id}.kind`)} onChange={(e) => handleCapitalize(e, `fabrics.${id}.kind`)} />
        <Input label="Renk" {...register(`fabrics.${id}.color`)} onChange={(e) => handleCapitalize(e, `fabrics.${id}.color`)} />
        <Input label="İçerik" {...register(`fabrics.${id}.content`)} onChange={(e) => handleCapitalize(e, `fabrics.${id}.content`)} />
        
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700 ml-1">Tip</label>
          <select 
            {...register(`fabrics.${id}.type`)} 
            onChange={(e) => {
              const val = e.target.value;
              setValue(`fabrics.${id}.type`, val);
              setValue(`fabrics.${id}.unit`, val === 'Dokuma' ? 'Mt' : 'Kg');
            }}
            className="h-10 px-2 rounded-lg border border-gray-200 bg-slate-50 text-[11px] font-bold outline-none cursor-pointer hover:bg-white transition-all"
          >
            <option value="Örme">Örme</option>
            <option value="Dokuma">Dokuma</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700 ml-1">Birim Gider</label>
          <div className="flex bg-slate-50 rounded-lg border border-gray-200 transition-all overflow-hidden h-10">
            <input type="number" step="0.001" {...register(`fabrics.${id}.perPieceKg`)} className="w-full px-3 bg-transparent outline-none text-sm font-medium" placeholder="0.000" />
            <div className="bg-white border-l border-gray-200 px-3 flex items-center text-[10px] font-black uppercase" style={{ color: NAVY }}>
              {unitValue}
            </div>
          </div>
          <input type="hidden" {...register(`fabrics.${id}.unit`)} />
        </div>
        
        <Input label="GSM" type="number" {...register(`fabrics.${id}.gsm`)} />
        {isMain && <Input label="En (cm)" type="number" {...register(`fabrics.${id}.width`)} />}
      </div>
    </div>
  );
};

// --- ANA BİLEŞEN ---
export default function Orders({ editingOrder, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderNo, setSelectedOrderNo] = useState(null);

  const { register, handleSubmit, watch, setValue, reset, control, formState: { errors } } = useForm({
    defaultValues: {
      extraPercent: 5,
      qtyBySize: DEFAULT_QTY_BY_SIZE,
      fabrics: DEFAULT_FABRICS
    }
  });

  const modelImageWatcher = watch("modelImage");

  useEffect(() => {
    if (editingOrder) {
      reset({
        customer: editingOrder.customer,
        article: editingOrder.article,
        model: editingOrder.model,
        color: editingOrder.color,
        due: editingOrder.due,
        extraPercent: editingOrder.extra_percent || 5,
        qtyBySize: { ...DEFAULT_QTY_BY_SIZE, ...editingOrder.qty_by_size },
        fabrics: editingOrder.fabrics || DEFAULT_FABRICS,
        postProcesses: editingOrder.post_processes || "",
        modelImage: editingOrder.model_image || null
      });
      setSelectedOrderNo(editingOrder.order_no);
    } else {
      reset({
        extraPercent: 5,
        qtyBySize: DEFAULT_QTY_BY_SIZE,
        fabrics: DEFAULT_FABRICS
      });
      setSelectedOrderNo(null);
    }
  }, [editingOrder, reset]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadModelImage(file);
      setValue("modelImage", publicUrl); 
      setStatus({ type: 'success', msg: 'Resim başarıyla yüklendi!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Resim yüklenemedi.' });
    } finally {
      setUploading(false);
      setTimeout(() => setStatus({ type: '', msg: '' }), 3000);
    }
  };

  const handleCapitalize = (e, name) => {
    const val = capitalizeTR(e.target.value);
    setValue(name, val);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await saveOrder(data, editingOrder?.id, selectedOrderNo);
      setStatus({ type: 'success', msg: 'İşlem Başarılı!' });
      if (onComplete) {
        setTimeout(() => {
          onComplete(); 
          if (!editingOrder) reset();
        }, 1500);
      }
    } catch (error) {
      alert("SİSTEM HATASI: " + (error.message || "Bilinmeyen bir hata oluştu"));
      setStatus({ type: 'error', msg: 'Hata oluştu!' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 pb-32">
      <AddOrderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSelect={(o) => { 
          setValue("customer", o.customer); 
          setSelectedOrderNo(o.order_no);
          setIsModalOpen(false); 
        }} 
      />

      {status.msg && (
        <div className={`fixed top-6 right-6 flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg z-50 text-white font-black text-[11px] uppercase ${status.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {status.msg}
        </div>
      )}

      {/* BAŞLIK + AKSİYON ÇUBUĞU */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl border border-slate-100 sticky top-4 z-40 gap-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            {selectedOrderNo ? `Grup: ${selectedOrderNo}` : (editingOrder ? `Grup: ${editingOrder.order_no}` : 'Üretim Kayıt Girişi')}
          </p>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase mt-1">
            {editingOrder ? 'Siparişi Güncelle' : 'Yeni İş Emri'}
          </h1>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          {!editingOrder && (
            <button type="button" onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase border transition-all bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100">
              <Link2 size={16} /> {selectedOrderNo ? 'Grubu Değiştir' : 'Siparişe Ekle'}
            </button>
          )}
          <button type="submit" form="order-form" disabled={loading || uploading} className={`flex-1 md:flex-none flex items-center justify-center gap-2 text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all hover:opacity-90 ${!editingOrder ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} style={editingOrder ? { background: NAVY } : {}}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            {editingOrder ? 'Kaydet' : 'Siparişi Oluştur'}
          </button>
        </div>
      </div>

      <form id="order-form" className="grid gap-8" onSubmit={handleSubmit(onSubmit)}>
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-3 text-red-600 font-black text-[10px] uppercase tracking-widest">
            <AlertCircle size={18} />
            Lütfen şu alanları kontrol edin: {Object.keys(errors).join(", ")}
          </div>
        )}

        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
            <div className="w-1 h-4 rounded-full" style={{ background: NAVY }}></div>
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Temel Bilgiler</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
            <Input label="Müşteri" {...register("customer")} onChange={(e) => handleCapitalize(e, "customer")} readOnly={!!selectedOrderNo || !!editingOrder} />
            <Input label="Artikel" {...register("article")} onChange={(e) => handleCapitalize(e, "article")} />
            <Input label="Model" {...register("model")} onChange={(e) => handleCapitalize(e, "model")} />
            <Input label="Renk" {...register("color")} onChange={(e) => handleCapitalize(e, "color")} />
            <Input label="Termin" type="date" {...register("due")} />
            <Input label="Kesim Fazlalık (%)" type="number" {...register("extraPercent")} />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Model Resmi</label>
              <div className="relative h-10 bg-slate-50 rounded-lg border border-slate-200 flex items-center px-3 group hover:bg-white transition-all overflow-hidden cursor-pointer">
                {uploading ? (
                   <div className="flex items-center gap-2 font-black text-[9px] uppercase" style={{ color: NAVY }}>
                     <Loader2 size={14} className="animate-spin" /> Yükleniyor...
                   </div>
                ) : (
                  <>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-black text-slate-500 uppercase truncate">
                        {modelImageWatcher ? "Resim Hazır ✅" : "Resim Yükle"}
                      </span>
                      <UploadCloud size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <SizeMatrix register={register} watch={watch} control={control} />

        <section className="space-y-6">
          <div className="flex items-center gap-2 ml-4">
            <div className="w-1 h-4 rounded-full" style={{ background: NAVY }}></div>
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Kumaş Detayları</h2>
          </div>
          <FabricCard id="main" label="Ana Kumaş" isMain={true} register={register} watch={watch} setValue={setValue} handleCapitalize={handleCapitalize} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {GARNI_KEYS.map(g => (
              <FabricCard key={g.id} id={g.id} label={g.label} isMain={false} register={register} watch={watch} setValue={setValue} handleCapitalize={handleCapitalize} />
            ))}
          </div>
        </section>

        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100">
          <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Notlar</label>
              <textarea
                {...register("postProcesses")}
                rows={5}
                placeholder="Notlarınızı buraya yazınız..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.stopPropagation();
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white transition-all text-sm font-medium resize-none leading-relaxed"
              />
            </div>
        </section>
      </form>
    </div>
  );
}