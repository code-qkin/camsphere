import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { NestListing } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusSignIcon, Home03Icon, UserGroupIcon, Location01Icon, ArrowLeft01Icon, ZapIcon, DropletIcon, Shield01Icon, StarIcon, CheckmarkBadge01Icon, AlertCircleIcon } from 'hugeicons-react';
import { NestPostModal } from '../components/modals/NestPostModal';
import { VerificationModal } from '../components/modals/VerificationModal';

const AmenityIcon = ({ name }: { name: string }) => {
  const iconSize = 12;
  const lower = name.toLowerCase();
  if (lower.includes('power') || lower.includes('light')) return <ZapIcon size={iconSize} className="text-[#FFD700]" />;
  if (lower.includes('water')) return <DropletIcon size={iconSize} className="text-blue-400" />;
  if (lower.includes('security') || lower.includes('gate')) return <Shield01Icon size={iconSize} className="text-green-500" />;
  return null;
};

const RatingStars = ({ rating, count }: { rating?: number, count?: number }) => {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon 
            key={star} 
            size={10} 
            fill={star <= rating ? "#FFD700" : "transparent"}
            className={star <= rating ? "text-[#FFD700]" : "text-gray-300"} 
          />
        ))}
      </div>
      <span className="text-[9px] font-black text-gray-400">({count})</span>
    </div>
  );
};

export const Nest = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'lodge';
  const { dbUser } = useAuth();
  const [items, setItems] = useState<NestListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [pendingAlert, setPendingAlert] = useState(false);

  useEffect(() => {
    if (!dbUser?.university) return;

    const q = query(
      collection(db, 'nest_listings'),
      where('university', '==', dbUser.university),
      where('type', '==', currentTab),
      where('isAvailable', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NestListing)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dbUser, currentTab]);

  const handlePostClick = () => {
    const isStaff = dbUser?.role === 'admin' || dbUser?.role === 'lead_admin';
    if (dbUser?.verificationStatus === 'approved' || isStaff) {
      setIsModalOpen(true);
    } else if (dbUser?.verificationStatus === 'pending') {
      setPendingAlert(true);
      setTimeout(() => setPendingAlert(false), 4000);
    } else {
      setIsVerifyModalOpen(true);
    }
  };

  return (
    <div className="py-12 max-w-[1400px] mx-auto min-h-[80vh] relative space-y-12">
      <AnimatePresence>
        {pendingAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] bg-black text-white px-8 py-4 border border-white/20 shadow-2xl text-[10px] font-black uppercase tracking-[0.3em]"
          >
            Verification // Pending Review
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-all group z-20 relative"
        >
          <ArrowLeft01Icon size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>

        <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-10 border-b border-black/10 dark:border-white/10 pb-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-4 md:mb-6 block border-l-2 border-[#FF5A5F] pl-4">
              Housing Hub //
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-[5rem] font-black tracking-tighter uppercase leading-[0.9] text-black dark:text-white">
              The Nest
            </h1>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-500 mt-4 md:mt-6 border-l border-black/10 dark:border-white/10 pl-6">
              Find lodges and roommates in {dbUser?.university}
            </p>
          </div>

          <div className="flex border border-black/10 dark:border-white/10 p-1 bg-gray-50 dark:bg-[#0a0a0a] overflow-x-auto no-scrollbar max-w-full shrink-0">
            <button
              onClick={() => setSearchParams({ tab: 'lodge' })}
              className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors duration-300 whitespace-nowrap ${
                currentTab === 'lodge' 
                  ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white' 
                  : 'text-gray-500 hover:text-black dark:hover:text-white border border-transparent'
              }`}
            >
              <Home03Icon size={16} />
              Lodges
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'roommate' })}
              className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors duration-300 whitespace-nowrap ${
                currentTab === 'roommate' 
                  ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white' 
                  : 'text-gray-500 hover:text-black dark:hover:text-white border border-transparent'
              }`}
            >
              <UserGroupIcon size={16} />
              Roommates
            </button>
          </div>
        </div>

        {/* View Toggle Strategy */}
        <div className="flex justify-end">
          <div className="inline-flex items-center border border-black/10 dark:border-white/10 p-1 bg-gray-50 dark:bg-[#0a0a0a]">
            <button className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black text-[9px] font-black uppercase tracking-widest">List</button>
            <button className="px-4 py-2 text-gray-400 hover:text-black dark:hover:text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              <Location01Icon size={12} />
              Map (Soon)
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-[#0a0a0a] aspect-[4/3] border border-black/10 dark:border-white/10" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-40 border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a] relative overflow-hidden">
          <div className="w-24 h-24 flex items-center justify-center mx-auto text-black dark:text-white mb-8 border border-black dark:border-white">
            {currentTab === 'lodge' ? <Home03Icon size={40} /> : <UserGroupIcon size={40} />}
          </div>
          <h3 className="text-4xl font-black uppercase tracking-tighter text-black dark:text-white">No {currentTab}s found</h3>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-6 max-w-md mx-auto leading-relaxed border-t border-black/10 dark:border-white/10 pt-6">
            Be the first to list a {currentTab} for your campus.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
          <AnimatePresence>
            {items.map(item => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                key={item.id}
              >
                <Link to={`/nest/${item.id}`} className="block h-full group">
                  <motion.div 
                    className="card-editorial h-full flex flex-col group-hover:-translate-y-2"
                  >
                    <div className="aspect-[16/10] bg-gray-100 dark:bg-[#0a0a0a] overflow-hidden relative border-b border-black/10 dark:border-white/10 p-4">
                      <div className="w-full h-full relative overflow-hidden">
                        {item.images[0] ? (
                          <img src={item.images[0]} alt={item.title} className="image-editorial w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold uppercase tracking-widest text-[10px] text-gray-400 border border-dashed border-gray-300 dark:border-gray-700">No Image</div>
                        )}
                      </div>
                      <div className="absolute top-8 left-8 flex flex-col gap-2">
                        <div className="bg-[#FF5A5F] text-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          ₦{item.rentPrice.toLocaleString()} / YR
                        </div>
                        {item.isVerified && (
                          <div className="bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.2em] border border-black dark:border-white flex items-center gap-2 w-fit">
                            <CheckmarkBadge01Icon size={12} className="text-[#B1A9FF]" /> Verified Listing
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-8 flex-1 flex flex-col bg-white dark:bg-black">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-black text-2xl uppercase tracking-tighter text-black dark:text-white line-clamp-1 leading-[0.9] group-hover:text-[#FF5A5F] transition-colors duration-300">
                          {item.title}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between mb-6">
                        <RatingStars rating={item.rating || 4.5} count={item.reviewCount || 12} />
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Implementation for reporting
                          }}
                          className="text-gray-400 hover:text-[#FF5A5F] transition-colors"
                          title="Report Scam"
                        >
                          <AlertCircleIcon size={14} />
                        </button>
                      </div>

                      <div className="flex flex-col gap-3 mb-8 border-b border-black/10 dark:border-white/10 pb-6">
                        <div className="flex items-center gap-3 text-gray-500">
                          <div className="w-8 h-8 border border-black/10 dark:border-white/10 flex items-center justify-center">
                            <Location01Icon size={14} className="text-black dark:text-white" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest truncate">{dbUser?.university}</span>
                        </div>
                        {item.distanceToCampus && (
                          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#B1A9FF] pl-11">
                            {item.distanceToCampus}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {(currentTab === 'lodge' ? item.amenities : item.lifestylePrefs).slice(0, 4).map((tag, i) => (
                          <span key={i} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] border border-black/10 dark:border-white/10 px-4 py-2 text-gray-500 dark:text-gray-400">
                            {currentTab === 'lodge' && <AmenityIcon name={tag} />}
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handlePostClick}
        className="fixed bottom-24 sm:bottom-10 right-6 sm:right-10 w-16 h-16 bg-[#FF5A5F] text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center z-40 border-2 border-black dark:border-white transition-all hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
      >
        <PlusSignIcon size={24} />
      </motion.button>

      <NestPostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} defaultType={currentTab as 'lodge'|'roommate'} />
      <VerificationModal isOpen={isVerifyModalOpen} onClose={() => setIsVerifyModalOpen(false)} />
    </div>
  );
};
