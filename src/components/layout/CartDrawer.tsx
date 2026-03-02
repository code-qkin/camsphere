import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../contexts/CartContext';
import { Cancel01Icon, Delete01Icon, ShoppingBag01Icon, ArrowRight01Icon } from 'hugeicons-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { cart, removeFromCart, total, clearCart } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-black h-full border-l border-black/10 dark:border-white/10 flex flex-col shadow-2xl"
          >
            <div className="p-8 lg:p-10 border-b border-black/10 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-[#0a0a0a]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#B1A9FF] mb-2 block">Archive // Cart</span>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Shopping Bag</h2>
              </div>
              <button onClick={onClose} className="text-black dark:text-white hover:opacity-50 transition-opacity">
                <Cancel01Icon size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                  <ShoppingBag01Icon size={48} className="text-gray-200 dark:text-gray-800 mb-6" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Your bag is empty //</p>
                  <button onClick={onClose} className="btn-editorial mt-8 w-full">Continue Shopping</button>
                </div>
              ) : (
                <div className="divide-y divide-black/5 dark:divide-white/5">
                  {cart.map((item) => (
                    <div key={item.itemId} className="p-8 flex gap-6 group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <div className="w-24 h-24 border border-black/10 dark:border-white/10 flex-shrink-0 overflow-hidden bg-gray-100">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-sm uppercase tracking-tight truncate mb-1">{item.title}</h4>
                        <p className="text-[#B1A9FF] font-black text-sm tracking-tighter mb-4">₦{item.price.toLocaleString()}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Qty: {item.quantity}</span>
                          <button 
                            onClick={() => removeFromCart(item.itemId)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                          >
                            <Delete01Icon size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-8 border-t-2 border-black dark:border-white bg-white dark:bg-black space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Subtotal //</span>
                  <span className="text-3xl font-black tracking-tighter leading-none">₦{total.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <button className="btn-editorial-primary flex items-center justify-center gap-3 w-full py-5 text-sm">
                    Checkout <ArrowRight01Icon size={18} />
                  </button>
                  <button 
                    onClick={clearCart}
                    className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Clear All Items
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
