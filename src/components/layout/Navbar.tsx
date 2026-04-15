import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun01Icon, Moon02Icon, Notification01Icon, ShoppingBag01Icon, Message01Icon } from 'hugeicons-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { NotificationDrawer } from './NotificationDrawer';
import { CartDrawer } from './CartDrawer';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, dbUser } = useAuth();
  const { cart } = useCart();
  const location = useLocation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Notifications unread
    const unsubNotifs = onSnapshot(query(collection(db, 'notifications'), where('userId', '==', user.uid), where('isRead', '==', false)), (snap) => {
      setUnreadNotifications(snap.size);
    }, (err) => console.error("Navbar notifications error:", err));

    // Chats unread
    const unsubChats = onSnapshot(query(collection(db, 'chats'), where('participants', 'array-contains', user.uid)), (snap) => {
      const count = snap.docs.filter(d => !d.data().isRead && d.data().lastSenderId !== user.uid).length;
      setUnreadChats(count);
    }, (err) => console.error("Navbar chats error:", err));

    return () => {
      unsubNotifs();
      unsubChats();
    };
  }, [user]);

  if (location.pathname === '/auth' || location.pathname === '/onboarding' || location.pathname.startsWith('/admin')) {
    return null;
  }

  const isLanding = location.pathname === '/' && !user;
  if (isLanding) return null;

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-black/10 dark:border-white/10 transition-colors duration-300">
        <div className="w-full px-6 lg:px-12 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 group transition-all">
            <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-black text-xl">
              C
            </div>
            <span className="text-xl font-black tracking-tighter uppercase text-black dark:text-white group-hover:opacity-50 transition-opacity">
              CamSphere
            </span>
          </Link>

          <div className="flex items-center gap-4 sm:gap-10">
            <div className="flex items-center gap-4 sm:gap-8 border-r border-black/10 dark:border-white/10 pr-4 sm:pr-10">
              <button
                onClick={toggleTheme}
                className="text-black dark:text-white hover:opacity-50 transition-opacity"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun01Icon size={20} /> : <Moon02Icon size={20} />}
              </button>
              
              <button 
                onClick={() => setIsNotifOpen(true)}
                className="relative text-black dark:text-white hover:opacity-50 transition-opacity"
              >
                <Notification01Icon size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF5A5F] rounded-full border border-white dark:border-black flex items-center justify-center text-[6px] font-black text-white">{unreadNotifications}</span>
                )}
              </button>

              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative text-black dark:text-white hover:opacity-50 transition-opacity"
              >
                <ShoppingBag01Icon size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#B1A9FF] rounded-full border border-white dark:border-black flex items-center justify-center text-[6px] font-black text-black">{cartCount}</span>
                )}
              </button>

              <Link 
                to="/chat" 
                className="hidden sm:block relative text-black dark:text-white hover:opacity-50 transition-opacity"
              >
                <Message01Icon size={20} />
                {unreadChats > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF5A5F] rounded-full border border-white dark:border-black flex items-center justify-center text-[6px] font-black text-white">{unreadChats}</span>
                )}
              </Link>
            </div>

            {(dbUser?.role === 'admin' || dbUser?.role === 'lead_admin') && (
              <Link 
                to="/admin/dashboard" 
                className="text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] px-3 sm:px-4 py-2 border border-black dark:border-white bg-[#B1A9FF] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5 transition-all whitespace-nowrap"
              >
                Admin
              </Link>
            )}

            <Link to="/profile" className="flex items-center gap-4 group shrink-0">
              <span className="hidden lg:block text-[10px] font-black uppercase tracking-[0.2em] text-black dark:text-white group-hover:opacity-50 transition-opacity">
                {dbUser?.displayName?.split(' ')[0] || 'Profile'}
              </span>
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-900 border border-black/10 dark:border-white/10 overflow-hidden">
                <img 
                  src={dbUser?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${user?.email || 'User'}&bg=000&color=fff&rounded=false`} 
                  alt="Profile" 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              </div>
            </Link>
          </div>
        </div>
      </header>

      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};