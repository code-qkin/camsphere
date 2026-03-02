import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag01Icon, CustomerService01Icon, Home03Icon, UserGroupIcon, ArrowRight01Icon, Alert01Icon } from 'hugeicons-react';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { MarketItem, NestListing, Notification } from '../types';
import { VerificationModal } from '../components/modals/VerificationModal';

export const Home = () => {
  const { dbUser, user } = useAuth();
  const [trendingItems, setTrendingItems] = useState<MarketItem[]>([]);
  const [newLodges, setNewLodges] = useState<NestListing[]>([]);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [latestNotif, setLatestNotif] = useState<Notification | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setLatestNotif({ id: snap.docs[0].id, ...snap.docs[0].data() } as Notification);
      } else {
        setLatestNotif(null);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!dbUser?.university) return;

    const fetchHomeData = async () => {
      try {
        const marketRef = collection(db, 'market_items');
        const qMarket = query(
          marketRef, 
          where('university', '==', dbUser.university),
          where('isSold', '==', false),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const marketSnap = await getDocs(qMarket);
        setTrendingItems(marketSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketItem)));

        const nestRef = collection(db, 'nest_listings');
        const qNest = query(
          nestRef,
          where('university', '==', dbUser.university),
          where('isAvailable', '==', true),
          where('type', '==', 'lodge'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const nestSnap = await getDocs(qNest);
        setNewLodges(nestSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NestListing)));
      } catch (err) {
        console.error("Error fetching home data:", err);
      }
    };

    fetchHomeData();
  }, [dbUser]);

  const bentoCards = [
    { title: "Find an Item", subtitle: "Shop the Market", icon: ShoppingBag01Icon, link: "/market", image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=400" },
    { title: "Offer a Service", subtitle: "Freelance", icon: CustomerService01Icon, link: "/market?tab=services", image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=400" },
    { title: "Find a Lodge", subtitle: "Housing Nest", icon: Home03Icon, link: "/nest", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=400" },
    { title: "Need Roommate", subtitle: "Connect", icon: UserGroupIcon, link: "/nest?tab=roommates", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=400" }
  ];

  return (
    <div className="space-y-24 py-12 max-w-[1400px] mx-auto min-h-screen">
      <AnimatePresence>
        {latestNotif && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-black text-white p-8 border border-white/10 shadow-[8px_8px_0px_0px_rgba(177,169,255,1)] relative overflow-hidden mb-12"
          >
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="text-left flex items-start gap-6">
                  <Alert01Icon className="text-[#B1A9FF] mt-1 shrink-0" size={24} />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#B1A9FF] block mb-2">Message // Priority</span>
                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-4">{latestNotif.title}</h3>
                    <p className="text-sm font-medium text-gray-400 max-w-2xl leading-relaxed">
                      {latestNotif.message}
                    </p>
                  </div>
               </div>
               <button 
                 onClick={() => updateDoc(doc(db, 'notifications', latestNotif.id), { isRead: true })}
                 className="btn-editorial bg-[#B1A9FF] text-black border-black whitespace-nowrap"
               >
                 Acknowledge
               </button>
            </div>
          </motion.div>
        )}

        {dbUser?.verificationStatus === 'rejected' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#FF5A5F] text-black p-8 border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden mb-12"
          >
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="text-left">
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-60 block mb-2">Audit // Rejection</span>
                  <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-4">Identity Verification Denied</h3>
                  <p className="text-sm font-bold uppercase tracking-widest max-w-2xl border-l-2 border-black/20 pl-6 py-1">
                    Reason: {dbUser.rejectionReason}
                  </p>
               </div>
               <button 
                 onClick={() => setIsVerifyModalOpen(true)}
                 className="btn-editorial bg-white border-black whitespace-nowrap"
               >
                 RESUBMIT DOCUMENTS
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <header className="border-b border-black/10 dark:border-white/10 pb-12 relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-8"
        >
          <div className="flex-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-6 block border-l-2 border-[#B1A9FF] pl-4">
              Dashboard //
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-[5rem] lg:text-[6rem] font-black tracking-tighter uppercase leading-[0.9] text-black dark:text-white">
              Hello<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-500 dark:from-white dark:to-gray-500">{dbUser?.displayName?.split(' ')[0]}</span>
            </h1>
          </div>
          <div className="lg:w-1/3">
             <p className="text-sm font-bold uppercase tracking-widest leading-relaxed text-gray-500 border-l border-black/10 dark:border-white/10 pl-6">
               Curated listings, student essentials, and premium housing. What do you need on campus today?
             </p>
          </div>
        </motion.div>
      </header>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-black/10 dark:border-white/10">
          {bentoCards.map((card, i) => (
            <Link key={i} to={card.link} className="group block border-b sm:border-b-0 sm:border-r border-black/10 dark:border-white/10 last:border-0 relative h-[400px] overflow-hidden bg-gray-100 dark:bg-[#0a0a0a]">
              <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover transition-all duration-700 grayscale opacity-30 group-hover:opacity-10 group-hover:scale-105" />
              <div className="relative h-full p-8 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-[#B1A9FF] flex items-center justify-center text-black border border-black transition-transform duration-500 group-hover:scale-90">
                    <card.icon size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 border border-black dark:border-white bg-white dark:bg-black text-black dark:text-white group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors duration-300">
                    {card.subtitle}
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-3xl uppercase tracking-tighter text-black dark:text-white leading-[0.9] group-hover:text-[#B1A9FF] transition-colors duration-300">
                    {card.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-12 border-b border-black/10 dark:border-white/10 pb-6">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black dark:text-white">Trending</h2>
          <Link to="/market" className="text-xs font-bold uppercase tracking-[0.3em] text-black dark:text-white hover:text-[#B1A9FF] transition-colors flex items-center gap-2 group">
            View All <ArrowRight01Icon size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="flex overflow-x-auto gap-8 pb-12 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {trendingItems.length === 0 ? (
            <div className="w-full py-32 text-center border border-black/10 dark:border-white/10 text-gray-500 font-bold uppercase tracking-widest text-xs">
              No items yet. Be the first to list.
            </div>
          ) : (
            trendingItems.map(item => (
              <Link key={item.id} to={`/market/${item.id}`} className="min-w-[320px] max-w-[320px] shrink-0 group block">
                <div className="card-editorial h-full flex flex-col group-hover:-translate-y-2">
                  <div className="aspect-[4/5] bg-gray-100 dark:bg-[#0a0a0a] overflow-hidden relative border-b border-black/10 dark:border-white/10 p-4">
                    <div className="w-full h-full relative overflow-hidden">
                      {item.images[0] ? (
                        <img src={item.images[0]} alt={item.title} className="image-editorial w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold uppercase tracking-widest text-[10px] text-gray-400 border border-dashed border-gray-300 dark:border-gray-700">No Image</div>
                      )}
                    </div>
                    <div className="absolute top-8 left-8 bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] border border-black dark:border-white">
                      {item.category}
                    </div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col justify-between bg-white dark:bg-black">
                    <p className="font-black text-2xl uppercase tracking-tighter text-black dark:text-white line-clamp-2 leading-[0.9] mb-8 group-hover:text-[#B1A9FF] transition-colors duration-300">{item.title}</p>
                    <div className="flex items-end justify-between border-t border-black/10 dark:border-white/10 pt-6">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-1">Price</p>
                        <p className="font-black text-xl text-black dark:text-white tracking-tighter">₦{item.price.toLocaleString()}</p>
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                        {item.sellerName?.split(' ')[0]}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="pb-32">
        <div className="flex items-end justify-between mb-12 border-b border-black/10 dark:border-white/10 pb-6">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black dark:text-white">Lodges</h2>
          <Link to="/nest" className="text-xs font-bold uppercase tracking-[0.3em] text-black dark:text-white hover:text-[#B1A9FF] transition-colors flex items-center gap-2 group">
            View All <ArrowRight01Icon size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="flex overflow-x-auto gap-8 pb-12 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {newLodges.length === 0 ? (
            <div className="w-full py-32 text-center border border-black/10 dark:border-white/10 text-gray-500 font-bold uppercase tracking-widest text-xs">
              No lodges listed yet.
            </div>
          ) : (
            newLodges.map(lodge => (
              <Link key={lodge.id} to={`/nest/${lodge.id}`} className="min-w-[400px] max-w-[400px] shrink-0 group block">
                <div className="card-editorial h-full flex flex-col group-hover:-translate-y-2">
                  <div className="aspect-[16/10] bg-gray-100 dark:bg-[#0a0a0a] overflow-hidden relative border-b border-black/10 dark:border-white/10 p-4">
                    <div className="w-full h-full relative overflow-hidden">
                      {lodge.images[0] ? (
                        <img src={lodge.images[0]} alt={lodge.title} className="image-editorial w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold uppercase tracking-widest text-[10px] text-gray-400 border border-dashed border-gray-300 dark:border-gray-700">No Image</div>
                      )}
                    </div>
                    <div className="absolute top-8 left-8 bg-[#B1A9FF] text-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      ₦{lodge.rentPrice.toLocaleString()} / YR
                    </div>
                  </div>
                  <div className="p-8 pt-10 flex-1 flex flex-col bg-white dark:bg-black">
                    <p className="font-black text-2xl uppercase tracking-tighter text-black dark:text-white truncate mb-8 group-hover:text-[#B1A9FF] transition-colors duration-300">{lodge.title}</p>
                    <div className="flex flex-wrap gap-3 mt-auto border-t border-black/10 dark:border-white/10 pt-6">
                      {lodge.amenities.slice(0, 3).map((amenity, i) => (
                        <span key={i} className="text-[10px] font-black uppercase tracking-[0.2em] border border-black/10 dark:border-white/10 px-4 py-2 text-gray-500 dark:text-gray-400">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <VerificationModal isOpen={isVerifyModalOpen} onClose={() => setIsVerifyModalOpen(false)} />
    </div>
  );
};
