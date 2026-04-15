import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, sendMatchRequest, respondToMatchRequest } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { NestPostModal } from '../components/modals/NestPostModal';
import { VerificationModal } from '../components/modals/VerificationModal';
import type { NestListing } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusSignIcon, Home03Icon, UserGroupIcon, Location01Icon, ArrowLeft01Icon, ZapIcon, DropletIcon, Shield01Icon, StarIcon, CheckmarkBadge01Icon, AlertCircleIcon, UserCheck01Icon } from 'hugeicons-react';

const RatingStars = ({ rating, count }: { rating: number, count: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon 
          key={star} 
          size={12} 
          className={star <= Math.round(rating) ? 'fill-[#FF5A5F] text-[#FF5A5F]' : 'text-gray-300'} 
        />
      ))}
    </div>
    <span className="text-[10px] font-bold text-gray-400">({count})</span>
  </div>
);

const AmenityIcon = ({ name }: { name: string }) => {
  const iconSize = 14;
  if (name.toLowerCase().includes('wifi') || name.toLowerCase().includes('internet')) return <ZapIcon size={iconSize} />;
  if (name.toLowerCase().includes('water')) return <DropletIcon size={iconSize} />;
  if (name.toLowerCase().includes('security')) return <Shield01Icon size={iconSize} />;
  return <PlusSignIcon size={iconSize} />;
};

const CompatibilityMeter = ({ listing, currentUser }: { listing: NestListing, currentUser: any }) => {
  if (listing.type !== 'roommate' || !currentUser?.lifestyleQuiz || !listing.lifestyleQuiz) return null;

  let score = 0;
  let total = 4;

  if (listing.lifestyleQuiz.sleepSchedule === currentUser.lifestyleQuiz.sleepSchedule) score++;
  if (listing.lifestyleQuiz.guests === currentUser.lifestyleQuiz.guests) score++;
  if (listing.lifestyleQuiz.studyHabit === currentUser.lifestyleQuiz.studyHabit) score++;
  if (Math.abs(listing.lifestyleQuiz.cleanliness - currentUser.lifestyleQuiz.cleanliness) <= 1) score++;

  const percentage = Math.round((score / total) * 100);
  const color = percentage > 70 ? 'text-green-500' : percentage > 40 ? 'text-[#B1A9FF]' : 'text-orange-500';

  return (
    <div className="mb-6 p-4 bg-gray-50 dark:bg-[#0a0a0a] border border-black/5 dark:border-white/5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Match Compatibility</span>
        <span className={`text-xs font-black ${color}`}>{percentage}%</span>
      </div>
      <div className="h-1 w-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${percentage > 70 ? 'bg-green-500' : percentage > 40 ? 'bg-[#B1A9FF]' : 'bg-orange-500'}`}
        />
      </div>
    </div>
  );
};

export const Nest = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'lodge';
  const { dbUser } = useAuth();
  const [items, setItems] = useState<NestListing[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [pendingAlert, setPendingAlert] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  useEffect(() => {
    if (!dbUser?.university) return;

    if (currentTab === 'matches') {
      setLoading(true);
      // Fetch incoming and outgoing match requests
      const qIncoming = query(collection(db, 'match_requests'), where('listerId', '==', dbUser.uid));
      const qOutgoing = query(collection(db, 'match_requests'), where('senderId', '==', dbUser.uid));

      const unsubIncoming = onSnapshot(qIncoming, (snapI) => {
        const incoming = snapI.docs.map(d => ({ id: d.id, ...d.data(), type: 'incoming' }));
        const unsubOutgoing = onSnapshot(qOutgoing, (snapO) => {
          const outgoing = snapO.docs.map(d => ({ id: d.id, ...d.data(), type: 'outgoing' }));
          setRequests([...incoming, ...outgoing].sort((a, b) => b.createdAt - a.createdAt));
          setLoading(false);
        });
        return () => unsubOutgoing();
      });

      return () => unsubIncoming();
    } else {
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
    }
  }, [dbUser, currentTab]);

  const handleMatchRequest = async (e: React.MouseEvent, item: NestListing) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dbUser) return;
    
    // Safety check: Only verified or staff can send match requests
    const isStaff = dbUser.role === 'admin' || dbUser.role === 'lead_admin';
    if (dbUser.verificationStatus !== 'approved' && !isStaff) {
      if (dbUser.verificationStatus === 'pending') {
        setPendingAlert(true);
        setTimeout(() => setPendingAlert(false), 4000);
      } else {
        setIsVerifyModalOpen(true);
      }
      return;
    }

    try {
      await sendMatchRequest(item, dbUser);
      setRequestSuccess(true);
      setTimeout(() => setRequestSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResponse = async (req: any, status: 'accepted' | 'rejected') => {
    // We need the listing title for the notification
    const listingRef = doc(db, 'nest_listings', req.listingId);
    const listingSnap = await getDoc(listingRef);
    const listingData = listingSnap.exists() ? listingSnap.data() : { title: 'Unknown Listing' };

    await respondToMatchRequest(req.id, status, { id: req.listingId, ...listingData }, req.senderId, dbUser?.displayName || 'Someone');
  };

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
        {requestSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] bg-[#B1A9FF] text-black px-8 py-4 border border-black shadow-2xl text-[10px] font-black uppercase tracking-[0.3em]"
          >
            Match Request // Sent Successfully
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
            <button
              onClick={() => setSearchParams({ tab: 'matches' })}
              className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors duration-300 whitespace-nowrap ${
                currentTab === 'matches' 
                  ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white' 
                  : 'text-gray-500 hover:text-black dark:hover:text-white border border-transparent'
              }`}
            >
              <ZapIcon size={16} />
              Matches
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

      {currentTab === 'roommate' && !dbUser?.lifestyleQuiz && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black text-white p-8 sm:p-12 border-2 border-black shadow-[12px_12px_0px_0px_rgba(177,169,255,1)] relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 text-center sm:text-left">
            <div className="max-w-xl">
              <h4 className="text-3xl font-black uppercase tracking-tighter mb-4">Calculate Compatibility //</h4>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 leading-relaxed">
                Complete your lifestyle profile to see how well you match with active listings.
              </p>
            </div>
            <button 
              onClick={() => navigate('/onboarding')}
              className="bg-white text-black px-10 py-4 font-black uppercase tracking-[0.3em] text-[10px] hover:bg-[#B1A9FF] transition-all whitespace-nowrap shadow-[6px_6px_0px_0px_rgba(177,169,255,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
            >
              Finish Quiz
            </button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#B1A9FF] opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-[#0a0a0a] aspect-[4/3] border border-black/10 dark:border-white/10" />
          ))}
        </div>
      ) : currentTab === 'matches' ? (
        <div className="space-y-8">
          {requests.length === 0 ? (
            <div className="text-center py-40 border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a]">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-black dark:text-white">No active matches</h3>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-4">Outgoing and incoming match requests will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
              {requests.map((req) => (
                <div key={req.id} className="p-8 bg-white dark:bg-black border border-black dark:border-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest border ${req.type === 'incoming' ? 'bg-[#FF5A5F] border-black text-black' : 'bg-black text-white dark:bg-white dark:text-black border-black'}`}>
                        {req.type}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-widest ${req.status === 'accepted' ? 'text-green-500' : req.status === 'rejected' ? 'text-red-500' : 'text-[#B1A9FF]'}`}>
                        {req.status}
                      </span>
                    </div>
                    <h4 className="text-xl font-black uppercase tracking-tighter mb-2 line-clamp-1">{req.senderName || 'Anonymous User'}</h4>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Match Request // Roommate</p>
                  </div>

                  <div className="space-y-4">
                    {req.type === 'incoming' && req.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleResponse(req, 'accepted')}
                          className="flex-1 py-3 bg-black text-white dark:bg-white dark:text-black text-[9px] font-black uppercase tracking-widest border border-black hover:bg-[#B1A9FF] hover:text-black transition-colors"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleResponse(req, 'rejected')}
                          className="px-4 py-3 border border-black/10 dark:border-white/10 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    <Link to={`/nest/${req.listingId}`} className="block w-full py-3 border border-black dark:border-white text-[9px] font-black uppercase tracking-widest text-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      View Listing
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
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

                      <CompatibilityMeter listing={item} currentUser={dbUser} />
                      
                      <div className="space-y-6">
                        {item.type === 'roommate' ? (
                          <button 
                            onClick={(e) => handleMatchRequest(e, item)}
                            className="w-full py-4 bg-black text-white dark:bg-white dark:text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#B1A9FF] hover:text-black transition-all flex items-center justify-center gap-3 border border-black dark:border-white group/btn"
                          >
                            <UserCheck01Icon size={16} className="group-hover/btn:scale-110 transition-transform" /> Send Match Request
                          </button>
                        ) : (
                          <button 
                            onClick={() => navigate(`/nest/${item.id}`)}
                            className="w-full py-4 border border-black dark:border-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                          >
                            View Details
                          </button>
                        )}

                        <div className="flex flex-wrap gap-2 mt-auto">
                          {(currentTab === 'lodge' ? item.amenities : item.lifestylePrefs).slice(0, 4).map((tag, i) => (
                            <span key={i} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] border border-black/10 dark:border-white/10 px-4 py-2 text-gray-500 dark:text-gray-400">
                              {currentTab === 'lodge' && <AmenityIcon name={tag} />}
                              {tag}
                            </span>
                          ))}
                        </div>
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
