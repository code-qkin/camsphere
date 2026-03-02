import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { uploadToCloudinary } from '../../services/cloudinary';
import { Cancel01Icon, Image01Icon } from 'hugeicons-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultType: 'goods' | 'services';
}

export const MarketPostModal: React.FC<Props> = ({ isOpen, onClose, defaultType }) => {
  const { user, dbUser } = useAuth();
  const [type, setType] = useState<'goods' | 'services'>(defaultType);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState<'Mint' | 'Near Mint' | 'Used'>('Mint');
  const [description, setDescription] = useState('');
  const [allowOffers, setAllowOffers] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImages(prev => [...prev, ...filesArray].slice(0, 5)); // max 5 images
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dbUser) return;
    setLoading(true);
    setError('');

    try {
      if (images.length === 0) {
        throw new Error('Please select at least one image.');
      }

      const imageUrls = await Promise.all(
        images.map(img => uploadToCloudinary(img))
      );

      await addDoc(collection(db, 'market_items'), {
        type,
        title,
        price: Number(price),
        category: category || 'General',
        condition: type === 'goods' ? condition : null,
        description,
        allowOffers,
        images: imageUrls,
        sellerId: user.uid,
        sellerName: dbUser.displayName || 'Student',
        university: dbUser.university,
        isSold: false,
        isReserved: false,
        lastBumpedAt: Date.now(),
        createdAt: Date.now()
      });

      onClose();
      // Reset form
      setTitle('');
      setPrice('');
      setCategory('');
      setDescription('');
      setImages([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to post item. Check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex sm:items-center sm:justify-center overflow-y-auto no-scrollbar bg-white/90 dark:bg-black/90 sm:bg-transparent backdrop-blur-md sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white/90 dark:bg-black/90 backdrop-blur-md transition-opacity hidden sm:block -z-10"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="relative w-full h-fit sm:h-auto sm:max-w-2xl bg-white dark:bg-black p-8 sm:p-16 sm:border sm:border-black sm:dark:border-white sm:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] sm:dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)]"
        >
          <button 
            onClick={onClose} 
            className="fixed sm:absolute top-8 right-8 text-black dark:text-white hover:opacity-50 transition-all active:scale-90 z-50 bg-white dark:bg-black sm:bg-transparent p-2 sm:p-0 border border-black dark:border-white sm:border-0"
          >
            <Cancel01Icon size={24} />
          </button>
          
          <div className="mb-12 border-l-4 border-[#B1A9FF] pl-6 sm:pl-0 sm:border-0">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 mb-2 block sm:hidden">Form // 01</span>
            <h2 className="text-4xl sm:text-5xl font-black text-black dark:text-white uppercase tracking-tighter">List Item</h2>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 p-4 bg-[#FF5A5F] text-black border border-black font-bold uppercase tracking-widest text-[10px] flex items-center justify-between overflow-hidden"
              >
                <span>{error}</span>
                <button onClick={() => setError('')} className="p-1 hover:bg-black/10 transition-colors">
                  <Cancel01Icon size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
            <div className="flex border border-black/10 dark:border-white/10 w-fit bg-gray-50 dark:bg-[#0a0a0a]">
              <button
                type="button"
                onClick={() => setType('goods')}
                className={`px-8 py-4 font-black uppercase tracking-[0.2em] text-[10px] transition-all ${type === 'goods' ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
              >
                Goods
              </button>
              <button
                type="button"
                onClick={() => setType('services')}
                className={`px-8 py-4 font-black uppercase tracking-[0.2em] text-[10px] transition-all ${type === 'services' ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
              >
                Services
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Title</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-black border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none text-black dark:text-white transition-all font-black uppercase tracking-widest text-xs placeholder:text-gray-400" placeholder="E.G. IPHONE 13 PRO" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Price (₦)</label>
                <input required type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-black border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none text-black dark:text-white transition-all font-black uppercase tracking-widest text-xs placeholder:text-gray-400" placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Category</label>
                <input value={category} onChange={e => setCategory(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-black border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none text-black dark:text-white transition-all font-black uppercase tracking-widest text-xs placeholder:text-gray-400" placeholder="E.G. ELECTRONICS" />
              </div>
              {type === 'goods' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Condition</label>
                  <select 
                    value={condition} 
                    onChange={e => setCondition(e.target.value as any)} 
                    className="w-full px-6 py-5 bg-white dark:bg-black border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none text-black dark:text-white transition-all font-black uppercase tracking-widest text-xs"
                  >
                    <option value="Mint" className="bg-white dark:bg-black text-black dark:text-white">Mint (New)</option>
                    <option value="Near Mint" className="bg-white dark:bg-black text-black dark:text-white">Near Mint</option>
                    <option value="Used" className="bg-white dark:bg-black text-black dark:text-white">Used</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Description</label>
              <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-black border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none text-black dark:text-white transition-all resize-none font-bold uppercase tracking-widest text-[10px] placeholder:text-gray-400 leading-relaxed" placeholder="PROVIDE DETAILS..." />
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setAllowOffers(!allowOffers)}
                className={`w-6 h-6 border-2 flex items-center justify-center transition-all ${allowOffers ? 'bg-[#B1A9FF] border-black' : 'border-black/20'}`}
              >
                {allowOffers && <div className="w-2.5 h-2.5 bg-black" />}
              </button>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Allow buyers to make price offers //</span>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Images (Max 5)</label>
              <div className="flex flex-wrap gap-4">
                {images.map((file, i) => (
                  <div key={i} className="w-28 h-28 bg-gray-100 relative border border-black/20 dark:border-white/20 overflow-hidden">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover grayscale" />
                    <button type="button" onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-white p-1 text-[#FF5A5F] border border-black">
                      <Cancel01Icon size={16} />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <label className="w-28 h-28 border border-dashed border-black/20 dark:border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-all text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white group bg-white dark:bg-black">
                    <Image01Icon size={24} className="transition-transform" />
                    <span className="text-[10px] font-black mt-3 uppercase tracking-[0.3em]">Add</span>
                    <input type="file" multiple accept="image/*" onChange={handleImageSelect} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !title || !price || images.length === 0}
              className="w-full py-6 bg-[#B1A9FF] text-black font-black text-xl uppercase tracking-tighter transition-all disabled:opacity-50 mt-12 border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            >
              {loading ? 'POSTING...' : 'LIST ITEM'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};