import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, deleteDoc, query, where, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, sendMatchRequest, respondToMatchRequest } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useAlert } from '../contexts/AlertContext';
import type { MarketItem, NestListing } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft01Icon, FavouriteIcon, Location01Icon, Message01Icon, ShoppingBag01Icon, Alert01Icon, Cancel01Icon, Search01Icon, UserCheck01Icon, Tick02Icon, Cancel02Icon } from 'hugeicons-react';
import { VerificationModal } from '../components/modals/VerificationModal';

interface Props {
  type: 'market' | 'nest';
}

export const ItemDetails: React.FC<Props> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, dbUser } = useAuth();
  const { addToCart } = useCart();
  const { showAlert } = useAlert();
  const [item, setItem] = useState<MarketItem | NestListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  // New Features States
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [pendingAlert, setPendingAlert] = useState(false);

  // Match Request States
  const [matchRequest, setMatchRequest] = useState<any>(null);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!id || !user || type !== 'nest') return;

    // Check for my own request to this listing
    const q = query(
      collection(db, 'match_requests'),
      where('listingId', '==', id),
      where('senderId', '==', user.uid)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setMatchRequest({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setMatchRequest(null);
      }
    });

    // If I am the lister, check for incoming requests
    let unsubIncoming: any;
    if (isLister) {
      const qIncoming = query(
        collection(db, 'match_requests'),
        where('listingId', '==', id),
        where('status', '==', 'pending')
      );
      unsubIncoming = onSnapshot(qIncoming, (snap) => {
        setIncomingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    return () => {
      unsub();
      if (unsubIncoming) unsubIncoming();
    };
  }, [id, user, type, isLister]);

  const handleMatchRequest = async () => {
    if (!item || !user || !dbUser) return;

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
      await sendMatchRequest(item, user);
      showAlert({
        title: 'Request Sent',
        message: 'Your match request has been transmitted. You will be notified if they accept.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResponse = async (requestId: string, status: 'accepted' | 'rejected', senderId: string) => {
    if (!item || !user) return;
    try {
      await respondToMatchRequest(requestId, status, item, senderId, (item as NestListing).listerName);
      showAlert({
        title: status === 'accepted' ? 'Match Confirmed' : 'Request Declined',
        message: status === 'accepted' ? 'Connection established. You can now start messaging.' : 'The request has been removed.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMessage = () => {
    if (!item) return;
    const listerId = type === 'market' ? (item as MarketItem).sellerId : (item as NestListing).listerId;
    if (listerId === user?.uid) return;

    navigate('/chat', {
      state: {
        receiverId: listerId,
        receiverName: type === 'market' ? (item as MarketItem).sellerName : (item as NestListing).listerName,
        taggedItem: {
          id: item.id,
          title: item.title,
          price: type === 'market' ? (item as MarketItem).price : (item as NestListing).rentPrice,
          image: item.images[0],
          source: type
        }
      }
    });
  };

  const deleteItem = async () => {
    if (!item) return;
    showAlert({
      title: 'Authorize Deletion',
      message: 'This listing will be purged from the university database. Proceed?',
      type: 'confirm',
      confirmText: 'Purge Listing',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, type === 'market' ? 'market_items' : 'nest_listings', item.id));
          navigate(-1);
        } catch (err) { console.error(err); }
      }
    });
  };

  const toggleReserved = async () => {
    if (!item || type !== 'market') return;
    try {
      await updateDoc(doc(db, 'market_items', item.id), {
        isReserved: !(item as MarketItem).isReserved
      });
      setItem({ ...item, isReserved: !(item as MarketItem).isReserved } as any);
    } catch (err) { console.error(err); }
  };

  const handleBump = async () => {
    if (!item || type !== 'market') return;
    const lastBump = (item as MarketItem).lastBumpedAt || 0;
    const cooldown = 24 * 60 * 60 * 1000;
    if (Date.now() - lastBump < cooldown) {
      showAlert({
        title: 'Bumping Restricted',
        message: 'You can only elevate this listing to the grid apex once every 24 hours.',
        type: 'info'
      });
      return;
    }

    try {
      await updateDoc(doc(db, 'market_items', item.id), {
        lastBumpedAt: Date.now(),
        createdAt: Date.now() // Actual bumping logic
      });
      showAlert({
        title: 'Grid Elevation',
        message: 'Listing successfully bumped to the network apex.',
        type: 'success'
      });
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="min-h-[80vh] flex items-center justify-center bg-white dark:bg-black"><div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent animate-spin rounded-full"></div></div>;
  }

  if (!item) {
    return <div className="min-h-[80vh] flex items-center justify-center text-black dark:text-white font-black uppercase tracking-widest text-xl">Item not found</div>;
  }

  const isLister = user?.uid === (type === 'market' ? (item as MarketItem).sellerId : (item as NestListing).listerId);
  const accentColor = type === 'market' ? 'bg-[#B1A9FF]' : 'bg-[#FF5A5F]';

  return (
    <div className="max-w-[1400px] mx-auto pb-32 sm:px-6">
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-colors group"
        >
          <ArrowLeft01Icon size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Discover
        </button>
        {!isLister && (
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-red-500 hover:opacity-50 transition-opacity"
          >
            <Alert01Icon size={14} /> Report
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-0 border border-black/10 dark:border-white/10 bg-white dark:bg-black">
        {/* Left Side: Images */}
        <div className="lg:w-2/3 border-b lg:border-b-0 lg:border-r border-black/10 dark:border-white/10 flex flex-col">
          <div className="aspect-square sm:aspect-[4/3] relative bg-gray-100 dark:bg-[#0a0a0a] p-6 sm:p-10 group/img">
            <div className="w-full h-full relative overflow-hidden border border-black/10 dark:border-white/10">
              {item.images.length > 0 ? (
                <>
                  <img src={item.images[activeImage]} alt={item.title} className="w-full h-full object-cover transition-all duration-700 group-hover/img:scale-105" />
                  <button 
                    onClick={() => setIsZoomOpen(true)}
                    className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-all duration-300"
                  >
                    <div className="bg-white text-black px-6 py-3 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-xl">
                      <Search01Icon size={16} /> Inspect
                    </div>
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold uppercase tracking-[0.3em] text-xs">No Image Available</div>
              )}
            </div>
            
            <button 
              onClick={toggleFavorite}
              className={`absolute top-12 right-12 w-16 h-16 flex items-center justify-center border-2 border-black dark:border-white transition-all duration-300 hover:scale-105 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] z-20 ${isFavorite ? accentColor : 'bg-white dark:bg-black'}`}
            >
              <FavouriteIcon size={28} className={isFavorite ? 'text-black' : 'text-black dark:text-white'} />
            </button>
          </div>

          {item.images.length > 1 && (
            <div className="flex gap-0 border-t border-black/10 dark:border-white/10 overflow-x-auto no-scrollbar">
              {item.images.map((img, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveImage(i)}
                  className={`w-32 h-32 shrink-0 border-r border-black/10 dark:border-white/10 overflow-hidden relative ${activeImage === i ? '' : 'grayscale opacity-60 hover:opacity-100 hover:grayscale-0'} transition-all duration-300`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  {activeImage === i && <div className={`absolute bottom-0 inset-x-0 h-1 ${accentColor}`} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Details */}
        <div className="lg:w-1/3 flex flex-col">
          <div className="p-8 sm:p-12 flex-1">
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className={`px-4 py-2 ${accentColor} text-black text-[10px] font-black uppercase tracking-[0.3em] border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                {type === 'market' ? (item as MarketItem).category : (item as NestListing).type}
              </span>
              <span className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-widest">
                <Location01Icon size={16} />
                {item.university}
              </span>
              {type === 'market' && (item as MarketItem).condition && (
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-black dark:text-white text-[9px] font-black uppercase tracking-[0.2em] border border-black/10">
                  {(item as MarketItem).condition}
                </span>
              )}
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-black text-black dark:text-white leading-[0.9] tracking-tighter uppercase mb-8 lg:mb-12">
              {item.title}
            </h1>

            {/* Seller Controls */}
            {isLister && type === 'market' && (
              <div className="flex flex-wrap gap-4 mb-12">
                <button 
                  onClick={handleBump}
                  className="px-6 py-3 border border-black dark:border-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                >
                  Bump Listing
                </button>
                <button 
                  onClick={toggleReserved}
                  className={`px-6 py-3 border border-black dark:border-white text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                    (item as MarketItem).isReserved ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  {(item as MarketItem).isReserved ? 'Unreserve' : 'Mark Reserved'}
                </button>
                <button 
                  onClick={deleteItem}
                  className="px-6 py-3 border border-[#FF5A5F] text-[#FF5A5F] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#FF5A5F] hover:text-white transition-all"
                >
                  Delete
                </button>
              </div>
            )}

            <div className="mb-10 lg:mb-12 border-l-2 border-black/20 dark:border-white/20 pl-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2">
                {type === 'market' ? 'Purchase Price' : 'Annual Rent'}
              </p>
              <p className="text-4xl sm:text-5xl font-black text-black dark:text-white tracking-tighter">
                ₦{type === 'market' ? (item as MarketItem).price.toLocaleString() : (item as NestListing).rentPrice.toLocaleString()}
              </p>
            </div>

            <div className="space-y-10">
              <div>
                <h3 className="text-xs font-black text-black dark:text-white mb-4 uppercase tracking-[0.3em] border-b border-black/10 dark:border-white/10 pb-4">
                  Description
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium text-sm whitespace-pre-wrap">
                  {item.description}
                </p>
              </div>

              {type === 'nest' && (item as NestListing).distanceToCampus && (
                <div>
                  <h3 className="text-xs font-black text-black dark:text-white mb-4 uppercase tracking-[0.3em] border-b border-black/10 dark:border-white/10 pb-4">
                    Proximity
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF5A5F]">
                      { (item as NestListing).distanceToCampus }
                    </span>
                  </div>
                </div>
              )}

              {type === 'nest' && (item as NestListing).landmarks && (item as NestListing).landmarks!.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-black dark:text-white mb-4 uppercase tracking-[0.3em] border-b border-black/10 dark:border-white/10 pb-4">
                    Landmarks
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(item as NestListing).landmarks!.map((lm, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 flex flex-col justify-between">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2">{lm.name}</span>
                        <span className="text-sm font-black uppercase tracking-tighter text-black dark:text-white">{lm.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {type === 'nest' && (item as NestListing).amenities?.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-black dark:text-white mb-4 uppercase tracking-[0.3em] border-b border-black/10 dark:border-white/10 pb-4">
                    Amenities
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {(item as NestListing).amenities.map(amenity => (
                      <span key={amenity} className="px-5 py-2.5 bg-gray-50 dark:bg-[#0a0a0a] text-black dark:text-white text-[10px] font-black uppercase tracking-[0.2em] border border-black/10 dark:border-white/10">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {type === 'nest' && (item as NestListing).lifestylePrefs?.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-black dark:text-white mb-4 uppercase tracking-[0.3em] border-b border-black/10 dark:border-white/10 pb-4">
                    Lifestyle Preferences
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {(item as NestListing).lifestylePrefs.map(pref => (
                      <span key={pref} className="px-5 py-2.5 bg-gray-50 dark:bg-[#0a0a0a] text-black dark:text-white text-[10px] font-black uppercase tracking-[0.2em] border border-black/10 dark:border-white/10">
                        {pref}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-black/10 dark:border-white/10 p-8 sm:p-12 bg-gray-50 dark:bg-[#0a0a0a] mt-auto">
            {/* Incoming Requests for Lister */}
            {isLister && type === 'nest' && (item as NestListing).type === 'roommate' && incomingRequests.length > 0 && (
              <div className="mb-10 space-y-6">
                <h3 className="text-xs font-black text-[#FF5A5F] uppercase tracking-[0.3em] border-b border-[#FF5A5F]/20 pb-4">
                  Incoming Match Requests ({incomingRequests.length})
                </h3>
                <div className="space-y-4">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="p-6 bg-white dark:bg-black border border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center font-black text-xs border border-black/10">
                          {req.senderPhoto ? <img src={req.senderPhoto} alt="" className="w-full h-full rounded-full object-cover" /> : req.senderName?.[0]}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">{req.senderName}</p>
                          <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Wants to match</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleResponse(req.id, 'accepted', req.senderId)}
                          className="flex-1 py-2 bg-black text-white dark:bg-white dark:text-black text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#B1A9FF] hover:text-black transition-colors"
                        >
                          <Tick02Icon size={14} /> Accept
                        </button>
                        <button 
                          onClick={() => handleResponse(req.id, 'rejected', req.senderId)}
                          className="px-4 py-2 border border-black/10 dark:border-white/10 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Cancel02Icon size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link 
              to={`/profile/${type === 'market' ? (item as MarketItem).sellerId : (item as NestListing).listerId}`}
              className="flex items-center gap-6 mb-8 group/seller"
            >
              <div className="w-16 h-16 bg-black dark:bg-white flex items-center justify-center font-black text-2xl text-white dark:text-black uppercase border border-black dark:border-white group-hover/seller:bg-[#B1A9FF] group-hover/seller:text-black transition-colors">
                {(type === 'market' ? (item as MarketItem).sellerName : (item as NestListing).listerName)?.[0] || '?'}
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mb-1">Listed by</p>
                <p className="font-black text-xl text-black dark:text-white tracking-tighter uppercase group-hover/seller:text-[#B1A9FF] transition-colors">
                  {type === 'market' ? (item as MarketItem).sellerName : (item as NestListing).listerName}
                </p>
              </div>
            </Link>

                            {!isLister && (
                              <div className="space-y-4 mt-8 relative z-20">
                                {type === 'market' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        if (item) {
                                          addToCart({
                                            itemId: item.id,
                                            title: item.title,
                                            price: (item as MarketItem).price,
                                            image: item.images[0] || '',
                                            sellerId: (item as MarketItem).sellerId
                                          });
                                        }
                                      }}
                                      className="w-full py-5 bg-[#B1A9FF] text-black border border-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all cursor-pointer"
                                    >
                                      <ShoppingBag01Icon size={20} />
                                      Add to Bag
                                    </button>
            
                                    {(item as MarketItem).allowOffers && (
                                      <button
                                        onClick={() => {
                                          showAlert({
                                            title: 'Formal Offer',
                                            message: `Enter your proposed price for this item. This will initiate a negotiation with ${ (item as MarketItem).sellerName }.`,
                                            type: 'prompt',
                                            placeholder: 'ENTER AMOUNT (₦)...',
                                            confirmText: 'Send Offer',
                                            onConfirm: (amount) => {
                                              if (amount && !isNaN(Number(amount))) {
                                                navigate('/chat', {
                                                  state: {
                                                    receiverId: (item as MarketItem).sellerId,
                                                    receiverName: (item as MarketItem).sellerName,
                                                    taggedItem: {
                                                      id: item.id,
                                                      title: item.title,
                                                      price: (item as MarketItem).price,
                                                      image: item.images[0],
                                                      source: 'market'
                                                    },
                                                    offerAmount: Number(amount)
                                                  }
                                                });
                                              }
                                            }
                                          });
                                        }}
                                        className="w-full py-5 bg-white dark:bg-black text-black dark:text-white border-2 border-black dark:border-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all cursor-pointer"
                                      >
                                        <span className="text-[#FF5A5F]">⚡</span> Make Offer
                                      </button>
                                    )}
                                  </>
                                )}

                                {type === 'nest' && (item as NestListing).type === 'roommate' ? (
                                  <>
                                    {!matchRequest ? (
                                      <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleMatchRequest}
                                        className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-colors hover:bg-[#B1A9FF] hover:text-black border border-black dark:border-white cursor-pointer shadow-[8px_8px_0px_0px_rgba(177,169,255,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                                      >
                                        <UserCheck01Icon size={20} />
                                        Send Match Request
                                      </motion.button>
                                    ) : matchRequest.status === 'pending' ? (
                                      <button
                                        disabled
                                        className="w-full py-5 bg-gray-100 dark:bg-gray-800 text-gray-400 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 border border-black/10 cursor-not-allowed"
                                      >
                                        Request Pending
                                      </button>
                                    ) : matchRequest.status === 'accepted' ? (
                                      <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleMessage}
                                        className="w-full py-5 bg-[#B1A9FF] text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-colors hover:opacity-80 border border-black cursor-pointer shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                                      >
                                        <Message01Icon size={20} />
                                        Start Chatting
                                      </motion.button>
                                    ) : (
                                      <button
                                        disabled
                                        className="w-full py-5 bg-red-50 text-red-500 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 border border-red-200 cursor-not-allowed"
                                      >
                                        Request Declined
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleMessage}
                                    className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-colors hover:opacity-80 border border-black dark:border-white cursor-pointer relative z-30"
                                  >
                                    <Message01Icon size={20} />
                                    Message
                                  </motion.button>
                                )}
                              </div>
                            )}          </div>
        </div>
      </div>

      {/* Fullscreen Lightroom Modal */}
      <AnimatePresence>
        {isZoomOpen && item.images.length > 0 && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-md">
            <button 
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-8 right-8 z-[1010] text-white hover:opacity-50 transition-opacity"
            >
              <Cancel01Icon size={32} />
            </button>
            
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 z-[1010] pointer-events-none">
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveImage(prev => prev > 0 ? prev - 1 : item.images.length - 1); }}
                className="pointer-events-auto w-12 h-12 flex items-center justify-center bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
              >
                <ArrowLeft01Icon size={24} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveImage(prev => prev < item.images.length - 1 ? prev + 1 : 0); }}
                className="pointer-events-auto w-12 h-12 flex items-center justify-center bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
              >
                <ArrowLeft01Icon size={24} className="rotate-180" />
              </button>
            </div>

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-5xl max-h-screen p-12 flex flex-col items-center"
            >
              <img 
                src={item.images[activeImage]} 
                alt="Zoomed" 
                className="max-w-full max-h-[80vh] object-contain border border-white/20 shadow-2xl" 
              />
              <div className="mt-8 flex gap-4 overflow-x-auto no-scrollbar max-w-full pb-4">
                {item.images.map((img, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 shrink-0 border border-white/20 transition-all ${activeImage === i ? 'opacity-100 ring-2 ring-[#B1A9FF]' : 'opacity-40 hover:opacity-100'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsReportModalOpen(false)}
            />
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-black p-8 sm:p-12 border border-black dark:border-white shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)]"
            >
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="absolute top-6 right-6 text-black dark:text-white hover:opacity-50"
              >
                <Cancel01Icon size={24} />
              </button>
              
              <div className="mb-8 border-l-4 border-[#FF5A5F] pl-6">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF5A5F] block mb-2">Safety // Audit</span>
                <h3 className="text-3xl font-black uppercase tracking-tighter">Report Listing</h3>
              </div>

              <form onSubmit={submitReport} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Reason for Report</label>
                  <textarea 
                    required
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    placeholder="DESCRIBE WHY THIS LISTING VIOLATES CAMPUS POLICY..."
                    rows={4}
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 outline-none text-black dark:text-white font-bold uppercase tracking-widest text-xs resize-none focus:border-black dark:focus:border-white transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isReporting || !reportReason.trim()}
                  className="w-full py-5 bg-[#FF5A5F] text-black border border-black font-black uppercase tracking-widest text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all hover:-translate-y-1"
                >
                  {isReporting ? 'SUBMITTING...' : 'FLAG FOR REVIEW'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <VerificationModal isOpen={isVerifyModalOpen} onClose={() => setIsVerifyModalOpen(false)} />
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
    </div>
  );
};