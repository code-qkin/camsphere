import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home01Icon, Store01Icon, Home03Icon, Message01Icon, UserIcon } from 'hugeicons-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || location.pathname === '/auth' || location.pathname === '/onboarding' || location.pathname.startsWith('/admin')) {
    return null;
  }

  const navItems = [
    { name: 'Home', path: '/', icon: Home01Icon },
    { name: 'Market', path: '/market', icon: Store01Icon },
    { name: 'Nest', path: '/nest', icon: Home03Icon },
    { name: 'Chat', path: '/chat', icon: Message01Icon },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-black border-t border-black/10 dark:border-white/10 sm:hidden h-20 transition-colors duration-300">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`relative flex flex-col items-center justify-center w-full h-full gap-2 transition-all duration-300 ${
                isActive ? 'text-black dark:text-white' : 'text-gray-400'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="bottom-nav-active"
                  className="absolute top-0 inset-x-0 h-[2px] bg-black dark:bg-white z-0"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <item.icon size={24} />
                <span className="text-[10px] font-bold tracking-widest uppercase">{item.name}</span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};