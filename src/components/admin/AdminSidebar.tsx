import React from 'react';
import { 
  DashboardSquare01Icon, 
  Shield01Icon, 
  UserGroupIcon, 
  PackageIcon, 
  Alert01Icon, 
  UserAdd01Icon,
  Logout01Icon,
  ArrowLeft01Icon,
  Cancel01Icon,
  LibraryIcon,
  Sorting05Icon
} from 'hugeicons-react';
import { Link } from 'react-router-dom';
import { auth } from '../../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Sun01Icon, Moon02Icon } from 'hugeicons-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const AdminSidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { theme, toggleTheme } = useTheme();
  const { dbUser } = useAuth();
  const isLead = dbUser?.role === 'lead_admin';

  const menuItems = [
    { id: 'overview', name: 'Overview', icon: DashboardSquare01Icon, access: 'all' },
    { id: 'verifications', name: 'Verifications', icon: Shield01Icon, access: 'all' },
    { id: 'students', name: 'Student Matrix', icon: UserGroupIcon, access: 'all' },
    { id: 'content', name: 'Moderation', icon: PackageIcon, access: 'all' },
    { id: 'reports', name: 'Reports', icon: Alert01Icon, access: 'all' },
    { id: 'notifications', name: 'Notifications', icon: Alert01Icon, access: 'all' },
    // Restricted Tabs
    { id: 'staff', name: 'Staff Matrix', icon: UserGroupIcon, access: 'lead' },
    { id: 'schools', name: 'Network', icon: LibraryIcon, access: 'lead' },
    { id: 'requests', name: 'Staffing', icon: UserAdd01Icon, access: 'lead' },
    { id: 'logs', name: 'Platform Logs', icon: Sorting05Icon, access: 'lead' },
  ].filter(item => item.access === 'all' || isLead);

  const sidebarContent = (
    <div className="h-full bg-white dark:bg-black flex flex-col">
      <div className="p-8 lg:p-12 border-b border-black/10 dark:border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-black">
            C
          </div>
          <span className="font-black tracking-tighter uppercase text-black dark:text-white">Admin Hub</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="sm:hidden text-black dark:text-white hover:opacity-50">
            <Cancel01Icon size={24} />
          </button>
        )}
      </div>

      <div className="p-8 lg:p-12 border-b border-black/10 dark:border-white/10">
        <Link 
          to="/"
          className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-colors group"
        >
          <ArrowLeft01Icon size={16} className="group-hover:-translate-x-1 transition-transform" /> Main Site
        </Link>
      </div>

      <nav className="flex-1 py-8 overflow-y-auto no-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              if (onClose) onClose();
            }}
            className={`w-full flex items-center gap-4 px-8 lg:px-12 py-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${
              activeTab === item.id 
                ? 'bg-black text-white dark:bg-white dark:text-black' 
                : 'text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <item.icon size={20} />
            {item.name}
          </button>
        ))}
      </nav>

      <div className="p-8 lg:p-12 border-t border-black/10 dark:border-white/10 space-y-6">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-black dark:text-white hover:opacity-50 transition-opacity"
        >
          {theme === 'dark' ? <Sun01Icon size={20} /> : <Moon02Icon size={20} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button 
          onClick={() => auth.signOut()}
          className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-[#FF5A5F] hover:opacity-50 transition-opacity w-full"
        >
          <Logout01Icon size={20} /> Terminate Session
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 lg:w-80 h-screen sticky top-0 border-r border-black/10 dark:border-white/10 hidden sm:flex flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[300] sm:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 bottom-0 left-0 w-[300px] border-r border-black/10 dark:border-white/10"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
