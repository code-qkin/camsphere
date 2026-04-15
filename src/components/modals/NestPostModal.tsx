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
  defaultType: 'lodge' | 'roommate';
}

const COMMON_AMENITIES = ["WiFi", "Water", "Generator", "Security", "Furnished", "En-suite"];
const LIFESTYLE_PREFS = ["Introvert", "Extrovert", "Reads Late", "Early Bird", "Neat", "No Parties", "Cooks Often"];

export const NestPostModal: React.FC<Props> = ({ isOpen, onClose, defaultType }) => {
  const { user, dbUser } = useAuth();
  const [type, setType] = useState<'lodge' | 'roommate'>(defaultType);
  const [title, setTitle] = useState('');
  const [rentPrice, setRentPrice] = useState('');
  const [description, setDescription] = useState('');
  const [distanceToCampus, setDistanceToCampus] = useState('');
  const [landmarks, setLandmarks] = useState<{name: string, time: string}[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [lifestylePrefs, setLifestylePrefs] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Compatibility Quiz State
  const [sleepSchedule, setSleepSchedule] = useState<'early' | 'night'>('early');
  const [cleanliness, setCleanliness] = useState<1|2|3|4|5>(3);
  const [guests, setGuests] = useState<'never' | 'occasional' | 'frequent'>('occasional');
  const [studyHabit, setStudyHabit] = useState<'quiet' | 'background'>('quiet');

  if (!isOpen) return null;

  const toggleArrayItem = (item: string, stateArray: string[], setState: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (stateArray.includes(item)) {
      setState(stateArray.filter(i => i !== item));
    } else {
      setState([...stateArray, item]);
    }
  };

  const addLandmark = () => {
    if (landmarks.length < 4) {
      setLandmarks([...landmarks, { name: '', time: '' }]);
    }
  };

  const updateLandmark = (index: number, field: 'name' | 'time', value: string) => {
    const newLandmarks = [...landmarks];
    newLandmarks[index][field] = value;
    setLandmarks(newLandmarks);
  };

  const removeLandmark = (index: number) => {
    setLandmarks(landmarks.filter((_, i) => i !== index));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImages(prev => [...prev, ...filesArray].slice(0, 5));
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

      const validLandmarks = landmarks.filter(l => l.name.trim() && l.time.trim());

      const imageUrls = await Promise.all(
        images.map(img => uploadToCloudinary(img))
      );

      await addDoc(collection(db, 'nest_listings'), {
        type,
        title,
        rentPrice: Number(rentPrice),
        description,
        distanceToCampus,
        landmarks: validLandmarks,
        amenities,
        lifestylePrefs: type === 'roommate' ? lifestylePrefs : [],
        lifestyleQuiz: type === 'roommate' ? {
          sleepSchedule,
          cleanliness,
          guests,
          studyHabit
        } : null,
        images: imageUrls,
        listerId: user.uid,
        listerName: dbUser.displayName || 'Student',
        university: dbUser.university,
        isAvailable: true,
        isVerified: false,
        rating: 0,
        reviewCount: 0,
        createdAt: Date.now()
      });

      onClose();
      setTitle('');
      setRentPrice('');
      setDescription('');
      setAmenities([]);
      setLifestylePrefs([]);
      setImages([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to list property. Check your network.');
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
          className="relative w-full h-[95vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white dark:bg-black flex flex-col sm:border sm:border-black sm:dark:border-white sm:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] sm:dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)] overflow-hidden"
        >
          {/* Subtle Background Pattern for Polish */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-[0.03] dark:opacity-[0.05] -z-10">
            <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          </div>

          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 sm:top-8 sm:right-8 text-black dark:text-white hover:opacity-50 transition-all active:scale-90 z-[110] bg-white dark:bg-black sm:bg-transparent p-3 sm:p-0 border-2 border-black dark:border-white sm:border-0 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-none"
          >
            <Cancel01Icon size={20} />
          </button>
          
          {/* Header Section - Always Visible */}
          <div className="p-6 sm:p-12 pb-0 sm:pb-0 z-20 bg-white dark:bg-black">
            <div className="mb-8 border-l-4 border-[#FF5A5F] pl-6">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF5A5F] mb-2 block">Request // 002</span>
              <h2 className="text-3xl sm:text-5xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">List on Nest</h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/10 dark:border-white/10">
              <div className="flex border border-black dark:border-white w-fit bg-gray-50 dark:bg-[#0a0a0a] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <button
                  type="button"
                  onClick={() => setType('lodge')}
                  className={`px-6 sm:px-8 py-3 sm:py-4 font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px] transition-all ${type === 'lodge' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                >
                  Lodge
                </button>
                <button
                  type="button"
                  onClick={() => setType('roommate')}
                  className={`px-6 sm:px-8 py-3 sm:py-4 font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px] transition-all ${type === 'roommate' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                >
                  Need Roommate
                </button>
              </div>
              
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-400">Selected //</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-[#FF5A5F] text-black border border-black">{type}</span>
              </div>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-12 pt-10 sm:pt-10">
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

            <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Title</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-black border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none text-black dark:text-white transition-all font-black uppercase tracking-widest text-xs placeholder:text-gray-400" placeholder="E.G. SPACIOUS STUDIO" />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Rent Price (₦/year)</label>
                  <input required type="number" min="0" value={rentPrice} onChange={e => setRentPrice(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-black border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none text-black dark:text-white transition-all font-black uppercase tracking-widest text-xs placeholder:text-gray-400" placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Description</label>
                <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-black border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none text-black dark:text-white transition-all resize-none font-bold uppercase tracking-widest text-[10px] placeholder:text-gray-400 leading-relaxed" placeholder="PROVIDE DETAILS..." />
              </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Proximity to Landmarks</label>
              <input value={distanceToCampus} onChange={e => setDistanceToCampus(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-black border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none text-black dark:text-white transition-all font-black uppercase tracking-widest text-xs placeholder:text-gray-400" placeholder="E.G. 5 MINS TO MAIN GATE" />
              
              <div className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Specific Landmarks (Max 4)</span>
                  {landmarks.length < 4 && (
                    <button type="button" onClick={addLandmark} className="text-[#FF5A5F] text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-50 transition-opacity">
                      + Add Target
                    </button>
                  )}
                </div>
                
                {landmarks.map((lm, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <input 
                      value={lm.name} 
                      onChange={e => updateLandmark(index, 'name', e.target.value)} 
                      placeholder="TARGET // E.G. SUB" 
                      className="flex-1 px-4 py-3 bg-white dark:bg-black border border-black/20 dark:border-white/20 outline-none font-bold uppercase tracking-widest text-[10px]" 
                    />
                    <input 
                      value={lm.time} 
                      onChange={e => updateLandmark(index, 'time', e.target.value)} 
                      placeholder="TIME // E.G. 5 MINS" 
                      className="flex-1 px-4 py-3 bg-white dark:bg-black border border-black/20 dark:border-white/20 outline-none font-bold uppercase tracking-widest text-[10px]" 
                    />
                    <button type="button" onClick={() => removeLandmark(index)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Cancel01Icon size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Amenities Available</label>
              <div className="flex flex-wrap gap-4">
                {COMMON_AMENITIES.map(amenity => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleArrayItem(amenity, amenities, setAmenities)}
                    className={`px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] border transition-all duration-300 ${
                      amenities.includes(amenity)
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]'
                        : 'border-black/20 dark:border-white/20 text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white bg-white dark:bg-black'
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>

            {type === 'roommate' && (
              <>
                <div className="space-y-6">
                  <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Lifestyle Preferences</label>
                  <div className="flex flex-wrap gap-4">
                    {LIFESTYLE_PREFS.map(pref => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => toggleArrayItem(pref, lifestylePrefs, setLifestylePrefs)}
                        className={`px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] border transition-all duration-300 ${
                          lifestylePrefs.includes(pref)
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]'
                            : 'border-black/20 dark:border-white/20 text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white bg-white dark:bg-black'
                        }`}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-10 border-t border-black/10 dark:border-white/10 space-y-8">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-[#FF5A5F] uppercase tracking-[0.4em]">Compatibility Profile //</span>
                    <h4 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-black dark:text-white">Roommate Quiz</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Sleep Schedule</label>
                      <div className="flex gap-2">
                        {['early', 'night'].map((s) => (
                          <button key={s} type="button" onClick={() => setSleepSchedule(s as any)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border transition-all ${sleepSchedule === s ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(255,90,95,1)]' : 'border-black/10 text-gray-400 hover:border-black'}`}>{s}</button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Cleanliness (1-5)</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <button key={lvl} type="button" onClick={() => setCleanliness(lvl as any)} className={`flex-1 py-4 text-[10px] font-black border transition-all ${cleanliness === lvl ? 'bg-[#FF5A5F] text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'border-black/10 text-gray-400'}`}>{lvl}</button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Guests Policy</label>
                      <div className="flex gap-2">
                        {['never', 'occasional', 'frequent'].map((g) => (
                          <button key={g} type="button" onClick={() => setGuests(g as any)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border transition-all ${guests === g ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(255,90,95,1)]' : 'border-black/10 text-gray-400 hover:border-black'}`}>{g}</button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Study Habit</label>
                      <div className="flex gap-2">
                        {['quiet', 'background'].map((h) => (
                          <button key={h} type="button" onClick={() => setStudyHabit(h as any)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border transition-all ${studyHabit === h ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(255,90,95,1)]' : 'border-black/10 text-gray-400 hover:border-black'}`}>{h}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

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
              disabled={loading || !title || !rentPrice || images.length === 0}
              className="w-full py-6 bg-[#FF5A5F] text-black font-black text-xl uppercase tracking-tighter transition-all disabled:opacity-50 mt-12 border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            >
              {loading ? 'SAVING...' : 'LIST PROPERTY'}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
  );
};