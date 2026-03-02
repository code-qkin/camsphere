import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { doc, updateDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft01Icon, Cancel01Icon } from 'hugeicons-react';
import type { University } from '../types';

export const Onboarding = () => {
  const { user, refreshDbUser } = useAuth();
  const { theme } = useTheme();
  const [university, setUniversity] = useState('');
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUnis, setFetchingUnis] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'universities'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setUniversities(snap.docs.map(d => ({ id: d.id, ...d.data() } as University)));
      setFetchingUnis(false);
    });
    return () => unsub();
  }, []);

  const handleBack = () => {
    auth.signOut();
    navigate('/auth');
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !university) return;

    setLoading(true);
    setError('');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        university: university.trim(),
      });
      const updatedUser = await refreshDbUser();
      if (updatedUser?.university) {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to synchronize preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingUnis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative bg-white dark:bg-black transition-colors duration-500 overflow-y-auto no-scrollbar">
      <button 
        onClick={handleBack}
        className="absolute top-8 left-8 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-colors group"
      >
        <ArrowLeft01Icon size={18} className="group-hover:-translate-x-1 transition-transform" /> Sign Out
      </button>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white dark:bg-black p-12 lg:p-20 border border-black/10 dark:border-white/10 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)] relative z-10"
      >
        <div className="mb-16">
          <div className="w-12 h-12 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-black text-xl mb-12">
            C
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#B1A9FF] mb-6 block border-l-4 border-[#B1A9FF] pl-6">
            Step 01 // Identification
          </span>
          <h2 className="text-6xl lg:text-7xl font-black tracking-tighter uppercase text-black dark:text-white leading-[0.85]">
            Define Your<br />Campus.
          </h2>
          <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mt-8 border-l border-black/10 dark:border-white/10 pl-6 py-2 max-w-md">
            The CamSphere network is scaling. Select your institution to synchronize data.
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#FF5A5F] border border-[#FF5A5F] bg-[#FF5A5F]/5 flex items-center justify-between"
            >
              <span>{error}</span>
              <button onClick={() => setError('')} className="p-1 hover:bg-[#FF5A5F]/10 transition-colors">
                <Cancel01Icon size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleComplete} className="space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {universities.length === 0 ? (
              <div className="col-span-full py-12 border border-dashed border-black/10 dark:border-white/10 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No institutions active in your region //</p>
              </div>
            ) : (
              universities.map((uni) => (
                <label 
                  key={uni.id}
                  className={`flex flex-col p-8 border transition-all duration-500 relative group ${
                    !uni.available 
                      ? 'opacity-30 cursor-not-allowed border-black/5 dark:border-white/5 grayscale' 
                      : (university === uni.name 
                          ? 'border-black bg-black text-white dark:bg-white dark:text-black dark:border-white cursor-pointer' 
                          : 'border-black/10 dark:border-white/10 hover:border-black dark:hover:border-white bg-gray-50 dark:bg-[#0a0a0a] text-black dark:text-white cursor-pointer')
                  }`}
                >
                  <input
                    type="radio"
                    name="university"
                    value={uni.name}
                    disabled={!uni.available}
                    checked={university === uni.name}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="hidden"
                  />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-40 group-hover:opacity-100 transition-opacity">
                    {uni.available ? 'University //' : 'Coming Soon //'}
                  </span>
                  <span className={`text-sm font-black uppercase tracking-widest leading-tight ${university === uni.name ? 'text-white dark:text-black' : 'text-black dark:text-white'}`}>
                    {uni.name}
                  </span>
                  {university === uni.name && (
                    <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-black' : 'bg-white'}`} />
                  )}
                </label>
              ))
            )}
          </div>

          <div className="pt-8">
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!university || loading}
              className="w-full py-6 bg-[#B1A9FF] text-black font-black uppercase tracking-[0.2em] text-sm hover:opacity-90 transition-all border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
            >
              {loading ? 'SYNCHRONIZING...' : 'ENTER NETWORK'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
