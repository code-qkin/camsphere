import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { uploadToCloudinary } from '../../services/cloudinary';
import { Cancel01Icon, Image01Icon, Camera01Icon } from 'hugeicons-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const VerificationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, dbUser, refreshDbUser } = useAuth();
  const [selfie, setSelfie] = useState<File | null>(null);
  const [idCard, setIdCard] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dbUser || !selfie || !idCard) return;
    setLoading(true);
    setError('');

    try {
      const [selfieUrl, idCardUrl] = await Promise.all([
        uploadToCloudinary(selfie),
        uploadToCloudinary(idCard)
      ]);

      await addDoc(collection(db, 'verifications'), {
        userId: user.uid,
        email: dbUser.email,
        displayName: dbUser.displayName,
        university: dbUser.university,
        selfieUrl,
        idCardUrl,
        status: 'pending',
        submittedAt: Date.now()
      });

      await updateDoc(doc(db, 'users', user.uid), {
        verificationStatus: 'pending',
        rejectionReason: ""
      });

      await refreshDbUser();
      onClose();
    } catch (err: any) {
      setError('Verification submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white/90 dark:bg-black/90 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="relative w-full h-full sm:h-auto sm:max-w-2xl bg-white dark:bg-black p-8 sm:p-16 overflow-y-auto no-scrollbar sm:border sm:border-black sm:dark:border-white sm:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] sm:dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)]"
        >
          <button 
            onClick={onClose} 
            className="fixed sm:absolute top-8 right-8 text-black dark:text-white hover:opacity-50 transition-all active:scale-90 z-50 bg-white dark:bg-black sm:bg-transparent p-2 sm:p-0 border border-black dark:border-white sm:border-0"
          >
            <Cancel01Icon size={24} />
          </button>
          
          <div className="mb-12 border-l-4 border-[#B1A9FF] pl-6 sm:pl-0 sm:border-0">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 mb-2 block sm:hidden">Verification // 01</span>
            <h2 className="text-4xl sm:text-5xl font-black text-black dark:text-white uppercase tracking-tighter">Student Identity</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-4 border-l border-black/10 dark:border-white/10 pl-4">
              To list items or housing, you must verify your student status.
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-[#FF5A5F] text-black border border-black font-bold uppercase tracking-widest text-[10px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">01 // Live Selfie</label>
                <label className="block w-full aspect-square border-2 border-dashed border-black/20 dark:border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                  {selfie ? (
                    <img src={URL.createObjectURL(selfie)} className="w-full h-full object-cover grayscale" />
                  ) : (
                    <>
                      <Camera01Icon size={32} className="text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest mt-4">Upload Selfie</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => setSelfie(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">02 // School ID Card</label>
                <label className="block w-full aspect-square border-2 border-dashed border-black/20 dark:border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                  {idCard ? (
                    <img src={URL.createObjectURL(idCard)} className="w-full h-full object-cover grayscale" />
                  ) : (
                    <>
                      <Image01Icon size={32} className="text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest mt-4">Upload ID Front</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => setIdCard(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selfie || !idCard}
              className="w-full py-6 bg-black dark:bg-white text-white dark:text-black font-black text-xl uppercase tracking-tighter transition-all disabled:opacity-50 mt-12 border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]"
            >
              {loading ? 'UPLOADING...' : 'SUBMIT FOR REVIEW'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
