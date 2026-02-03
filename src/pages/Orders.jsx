import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Save, Link2, CheckCircle, AlertCircle, Loader2, RefreshCcw, 
  UploadCloud, PlusCircle // 👈 PlusCircle eklendi
} from 'lucide-react';
import { Input, TextArea } from '../components/ui/Input';
import SizeMatrix from '../components/orders/SizeMatrix';
import AddOrderModal from '../components/orders/AddOrderModal';
import { saveOrder, uploadModelImage } from '../api/orderService';

// 🇹🇷 Türkçe Karakter Destekli Büyük Harf Fonksiyonu
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

export default function Orders({ editingOrder, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderNo, setSelectedOrderNo] = useState(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      extraPercent: 5,
      qtyBySize: { S: 0, M: 0, L: 0, XL: 0 },
      fabrics: {
        main: { unit: 'kg', type: 'Örme' },
        g1: { unit: 'kg', type: 'Örme' },
        g2: { unit: 'kg', type: 'Örme' },
        g3: { unit: 'kg', type: 'Örme' },
        g4: { unit: 'kg', type: 'Örme' }
      }
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
        extraPercent: editingOrder.extra_percent,
        qtyBySize: editingOrder.qty_by_size,
        fabrics: editingOrder.fabrics,
        postProcesses: editingOrder.post_processes,
        modelImage: editingOrder.model_image
      });
      setSelectedOrderNo(editingOrder.order_no);
    } else {
      reset({
        extraPercent: 5,
        qtyBySize: { S: 0, M: 0, L: 0, XL: 0 },
        fabrics: {
          main: { unit: 'kg', type: 'Örme' },
          g1: { unit: 'kg', type: 'Örme' },
          g2: { unit: 'kg', type: 'Örme' },
          g3: { unit: 'kg', type: 'Örme' },
          g4: { unit: 'kg', type: 'Örme' }
        }
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
      const result = await saveOrder(data, editingOrder?.id, selectedOrderNo);
      setStatus({ 
        type: 'success', 
        msg: editingOrder ? 'Sipariş Güncellendi!' : `Sipariş Kaydedildi! No: ${result.order_no}` 
      });
      if (editingOrder && onComplete) {
        setTimeout(() => onComplete(), 1500);
      } else if (!selectedOrderNo) {
        reset();
      }
    } catch (error) {
      setStatus({ type: 'error', msg: 'Kayıt sırasında hata oluştu.' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: '', msg: '' }), 4000);
    }
  };

  const FabricCard = ({ id, label, isMain = false }) => (
    <div className={`bg-white p-6 rounded-4xl border ${isMain ? 'border-2 border-blue-50 shadow-sm relative overflow-hidden' : 'border-slate-100 shadow-sm'} space-y-5`}>
      {isMain && <div className="absolute top-0 left-0 w-1.5 bg-blue-600 h-full"></div>}
      <span className={`font-black uppercase tracking-widest text-[10px] ${isMain ? 'text-blue-600' : 'text-slate-400'}`}>
        {label}
      </span>
      <div className={`grid grid-cols-1 md:grid-cols-4 ${isMain ? 'lg:grid-cols-7' : 'lg:grid-cols-3'} gap-4`}>
        <Input label="Cinsi" {...register(`fabrics.${id}.kind`)} onChange={(e) => handleCapitalize(e, `fabrics.${id}.kind`)} />
        <Input label="Renk" {...register(`fabrics.${id}.color`)} onChange={(e) => handleCapitalize(e, `fabrics.${id}.color`)} />
        <Input label="İçerik" {...register(`fabrics.${id}.content`)} onChange={(e) => handleCapitalize(e, `fabrics.${id}.content`)} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700 ml-1">Tip</label>
          <select {...register(`fabrics.${id}.type`)} className="h-10 px-2 rounded-xl border border-gray-200 bg-slate-50 text-[11px] font-bold outline-none cursor-pointer hover:bg-white transition-all">
            <option value="Örme">Örme</option>
            <option value="Dokuma">Dokuma</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700 ml-1">Birim Gider</label>
          <div className="flex bg-slate-50 rounded-xl border border-gray-200 focus-within:ring-4 focus-within:ring-blue-50 transition-all overflow-hidden h-10">
            <input type="number" step="0.001" {...register(`fabrics.${id}.perPieceKg`)} className="w-full px-3 bg-transparent outline-none text-sm font-medium" placeholder="0.000" />
            <div className="bg-white border-l border-gray-200 px-3 flex items-center text-[10px] font-black text-blue-600 uppercase">
              {watch(`fabrics.${id}.unit`)}
            </div>
          </div>
        </div>
        <Input label="GSM" type="number" {...register(`fabrics.${id}.gsm`)} />
        {isMain && <Input label="En (cm)" type="number" {...register(`fabrics.${id}.width`)} />}
      </div>
    </div>
  );

  return (
    // 1. STANDART GENİŞLİK (max-w-7xl)
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 pb-32">
      <AddOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSelect={(o) => { setValue("customer", o.customer); setSelectedOrderNo(o.order_no); setIsModalOpen(false); }} />

      {status.msg && (
        <div className={`fixed top-6 right-6 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-300 text-white font-black text-[11px] uppercase ${status.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {status.msg}
        </div>
      )}

      {/* 2. STANDART BAŞLIK YAPISI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-4xl shadow-sm border border-slate-100 sticky top-4 z-40 gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl text-white shadow-lg ${editingOrder ? 'bg-blue-600' : 'bg-slate-900'}`}>
            {editingOrder ? <RefreshCcw size={20} /> : <PlusCircle size={20} />}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase">
              {editingOrder ? 'Siparişi Güncelle' : 'Yeni İş Emri'}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
              {editingOrder ? `Grup: ${editingOrder.order_no}` : 'Üretim Kayıt Girişi'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          {!editingOrder && (
            <button type="button" onClick={() => setIsModalOpen(true)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase border transition-all ${selectedOrderNo ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
              <Link2 size={16} /> {selectedOrderNo ? 'Grubu Değiştir' : 'Siparişe Ekle'}
            </button>
          )}
          <button onClick={handleSubmit(onSubmit)} disabled={loading || uploading} className={`flex-1 md:flex-none flex items-center justify-center gap-2 text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all ${editingOrder ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            {editingOrder ? 'Kaydet' : 'Siparişi Oluştur'}
          </button>
        </div>
      </div>

      <form className="grid gap-8" onSubmit={handleSubmit(onSubmit)}>
        {/* TEMEL BİLGİLER */}
        <section className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
            <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Temel Bilgiler</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
            <Input label="Müşteri" {...register("customer", { required: true })} onChange={(e) => handleCapitalize(e, "customer")} readOnly={!!selectedOrderNo || !!editingOrder} />
            <Input label="Artikel" {...register("article")} onChange={(e) => handleCapitalize(e, "article")} />
            <Input label="Model" {...register("model")} onChange={(e) => handleCapitalize(e, "model")} />
            <Input label="Renk" {...register("color")} onChange={(e) => handleCapitalize(e, "color")} />
            <Input label="Termin" type="date" {...register("due")} />
            <Input label="Kesim Fazlalık (%)" type="number" {...register("extraPercent")} />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Model Resmi</label>
              <div className="relative h-10 bg-slate-50 rounded-xl border border-slate-200 flex items-center px-3 group hover:bg-white transition-all overflow-hidden cursor-pointer shadow-sm">
                {uploading ? (
                   <div className="flex items-center gap-2 text-blue-600 font-black text-[9px] uppercase">
                     <Loader2 size={14} className="animate-spin" /> Yükleniyor...
                   </div>
                ) : (
                  <>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-black text-slate-500 uppercase truncate">
                        {modelImageWatcher ? "Resim Hazır ✅" : "Resim Yükle"}
                      </span>
                      <UploadCloud size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <SizeMatrix register={register} watch={watch} />

        {/* KUMAŞLAR */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 ml-4">
            <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Kumaş Detayları</h2>
          </div>
          <FabricCard id="main" label="Ana Kumaş" isMain />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {GARNI_KEYS.map(g => <FabricCard key={g.id} id={g.id} label={g.label} />)}
          </div>
        </section>

        {/* İŞLEMLER */}
        <section className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <TextArea label="Kesim Sonrası İşlemler" {...register("postProcesses")} placeholder="Baskı, Nakış, Yıkama vb. detayları buraya yazınız..." />
        </section>
      </form>
    </div>
  );
}