import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { MarketItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusSignIcon, ShoppingBag01Icon, CustomerService01Icon, ArrowLeft01Icon, Search01Icon } from 'hugeicons-react';
import { MarketPostModal } from '../components/modals/MarketPostModal';
import { VerificationModal } from '../components/modals/VerificationModal';
import { useCart } from '../contexts/CartContext';

export const Market = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') || 'goods') as 'goods' | 'service';
  const { dbUser } = useAuth();
  
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [pendingAlert, setPendingAlert] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState<'all' | 'under5k' | 'under20k' | 'over20k'>('all');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'Mint' | 'Near Mint' | 'Used'>('all');

  useEffect(() => {
    if (!dbUser?.university) return;

    const q = query(
      collection(db, 'market_items'),
      where('university', '==', dbUser.university),
      where('type', '==', currentTab),
      where('isSold', '==', false),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketItem)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dbUser, currentTab]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesPrice = true;
    if (priceFilter === 'under5k') matchesPrice = item.price < 5000;
    else if (priceFilter === 'under20k') matchesPrice = item.price < 20000;
    else if (priceFilter === 'over20k') matchesPrice = item.price >= 20000;

    const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;

    return matchesSearch && matchesPrice && matchesCondition;
  });

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
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-4 md:mb-6 block border-l-2 border-[#B1A9FF] pl-4">
              Marketplace //
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-[5rem] font-black tracking-tighter uppercase leading-[0.9] text-black dark:text-white">
              Market
            </h1>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-500 mt-4 md:mt-6 border-l border-black/10 dark:border-white/10 pl-6">
              Buy and sell within {dbUser?.university}
            </p>
          </div>

          <div className="flex border border-black/10 dark:border-white/10 p-1 bg-gray-50 dark:bg-[#0a0a0a] overflow-x-auto no-scrollbar max-w-full shrink-0">
            <button
              onClick={() => setSearchParams({ tab: 'goods' })}
              className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors duration-300 whitespace-nowrap ${
                currentTab === 'goods' 
                  ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white' 
                  : 'text-gray-500 hover:text-black dark:hover:text-white border border-transparent'
              }`}
            >
              <ShoppingBag01Icon size={16} />
              Goods
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'service' })}
              className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors duration-300 whitespace-nowrap ${
                currentTab === 'service' 
                  ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white' 
                  : 'text-gray-500 hover:text-black dark:hover:text-white border border-transparent'
              }`}
            >
              <CustomerService01Icon size={16} />
              Services
            </button>
          </div>
        </div>

        {/* Dynamic Search & Filter Matrix */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b-2 border-black dark:border-white pb-4 group focus-within:border-[#B1A9FF] transition-colors">
            <Search01Icon size={24} className="text-gray-400 group-focus-within:text-[#B1A9FF]" />
            <input 
              type="text" 
              placeholder="SEARCH THE GRID // PRODUCT, CATEGORY, KEYWORD"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none font-black uppercase tracking-[0.2em] text-sm sm:text-lg placeholder:text-gray-300 dark:placeholder:text-gray-800 text-black dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <select 
              value={priceFilter}
              onChange={e => setPriceFilter(e.target.value as any)}
              className="bg-white dark:bg-black border border-black/10 dark:border-white/10 px-6 py-3 font-black uppercase tracking-widest text-[10px] outline-none focus:border-black dark:focus:border-white"
            >
              <option value="all">Price: All</option>
              <option value="under5k">Under ₦5,000</option>
              <option value="under20k">Under ₦20,000</option>
              <option value="over20k">₦20,000+</option>
            </select>

            {currentTab === 'goods' && (
              <select 
                value={conditionFilter}
                onChange={e => setConditionFilter(e.target.value as any)}
                className="bg-white dark:bg-black border border-black/10 dark:border-white/10 px-6 py-3 font-black uppercase tracking-widest text-[10px] outline-none focus:border-black dark:focus:border-white"
              >
                <option value="all">Condition: All</option>
                <option value="Mint">Mint</option>
                <option value="Near Mint">Near Mint</option>
                <option value="Used">Used</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-[#0a0a0a] aspect-[3/4] border border-black/10 dark:border-white/10" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-40 border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a] relative overflow-hidden">
          <div className="w-24 h-24 flex items-center justify-center mx-auto text-black dark:text-white mb-8 border border-black dark:border-white">
            {currentTab === 'goods' ? <ShoppingBag01Icon size={40} /> : <CustomerService01Icon size={40} />}
          </div>
          <h3 className="text-4xl font-black uppercase tracking-tighter text-black dark:text-white">No items match criteria</h3>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-6 max-w-md mx-auto leading-relaxed border-t border-black/10 dark:border-white/10 pt-6">
            Adjust your search or filters to discover other active listings on campus.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-32">
          <AnimatePresence>
            {filteredItems.map(item => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                key={item.id}
              >
                <Link to={`/market/${item.id}`} className="block h-full group">
                  <motion.div 
                    className="card-editorial h-full flex flex-col group-hover:-translate-y-2"
                  >
                    <div className="aspect-[4/5] bg-gray-100 dark:bg-[#0a0a0a] overflow-hidden relative border-b border-black/10 dark:border-white/10 p-4">
                      <div className="w-full h-full relative overflow-hidden">
                        {item.images[0] ? (
                          <img src={item.images[0]} alt={item.title} className="image-editorial w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold uppercase tracking-widest text-[10px] text-gray-400 border border-dashed border-gray-300 dark:border-gray-700">No Image</div>
                        )}
                      </div>
                      <div className="absolute top-8 left-8 flex flex-col gap-2">
                        <div className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] border border-black dark:border-white w-fit">
                          {item.category}
                        </div>
                        {item.isReserved && (
                          <div className="bg-[#B1A9FF] text-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] border border-black w-fit">
                            Reserved //
                          </div>
                        )}
                      </div>
                      {item.condition && (
                        <div className="absolute bottom-8 right-8 bg-white/90 dark:bg-black/90 text-black dark:text-white px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] border border-black/10">
                          {item.condition}
                        </div>
                      )}
                    </div>
                    <div className="p-8 flex-1 flex flex-col justify-between bg-white dark:bg-black">
                      <p className="font-black text-2xl uppercase tracking-tighter text-black dark:text-white line-clamp-2 leading-[0.9] mb-8 group-hover:text-[#B1A9FF] transition-colors duration-300">{item.title}</p>
                      
                      <div className="space-y-6">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addToCart({
                              itemId: item.id,
                              title: item.title,
                              price: item.price,
                              image: item.images[0] || '',
                              sellerId: item.sellerId
                            });
                          }}
                          className="w-full py-3 border border-black dark:border-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#B1A9FF] hover:text-black hover:border-[#B1A9FF] transition-all"
                        >
                          Add to Bag
                        </button>

                        <div className="flex items-end justify-between border-t border-black/10 dark:border-white/10 pt-6">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-1">Price</p>
                            <p className="font-black text-xl text-black dark:text-white tracking-tighter">₦{item.price.toLocaleString()}</p>
                          </div>
                          <Link 
                            to={`/profile/${item.sellerId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-[#B1A9FF] transition-colors"
                          >
                            {item.sellerName?.split(' ')[0]}
                          </Link>
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
        className="fixed bottom-24 sm:bottom-10 right-6 sm:right-10 w-16 h-16 bg-[#B1A9FF] text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center z-40 border-2 border-black dark:border-white transition-all hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
      >
        <PlusSignIcon size={24} />
      </motion.button>

      <MarketPostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} defaultType={currentTab as 'goods'|'services'} />
      <VerificationModal isOpen={isVerifyModalOpen} onClose={() => setIsVerifyModalOpen(false)} />
    </div>
  );
};
