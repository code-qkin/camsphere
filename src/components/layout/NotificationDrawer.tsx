import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Notification } from '../../types';
import { Cancel01Icon, Alert01Icon, InformationCircleIcon, CheckmarkCircle01Icon } from 'hugeicons-react';
import { format, isValid } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
      }, (err) => {
        console.error("Notifications listener error:", err);
      });
    } catch (err) {
      console.error("Notifications query error:", err);
    }
  }, [user]);

  const markAllRead = async () => {
    const toUpdate = notifications.filter(n => !n.isRead);
    if (toUpdate.length === 0) return;

    try {
      const batch = writeBatch(db);
      toUpdate.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { isRead: true });
      });
      await batch.commit();
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <Alert01Icon className="text-[#FF5A5F]" size={18} />;
      case 'success': return <CheckmarkCircle01Icon className="text-green-500" size={18} />;
      default: return <InformationCircleIcon className="text-[#B1A9FF]" size={18} />;
    }
  };

  const safeFormatDate = (timestamp: any) => {
    try {
      if (!timestamp) return '-- ---';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (!isValid(date)) return '-- ---';
      return format(date, 'dd MMM');
    } catch (e) {
      return '-- ---';
    }
  };

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
            <div className="p-6 sm:p-8 lg:p-10 border-b border-black/10 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-[#0a0a0a]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF5A5F] mb-2 block">Alerts // System</span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter">Notifications</h2>
              </div>
              <button onClick={onClose} className="text-black dark:text-white hover:opacity-50 transition-opacity">
                <Cancel01Icon size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">No new alerts //</div>
              ) : (
                notifications.map((n) => {
                  if (!n) return null;
                  return (
                    <div 
                      key={n.id} 
                      className={`p-6 sm:p-8 border-b border-black/5 dark:border-white/5 transition-colors ${!n.isRead ? 'bg-[#B1A9FF]/5 dark:bg-[#B1A9FF]/5' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1 shrink-0">{getIcon(n.type || 'info')}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2 gap-4">
                            <h4 className="font-black text-sm uppercase tracking-tight truncate">{n.title || 'Notification'}</h4>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">{safeFormatDate(n.createdAt)}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{n.message || 'No details available.'}</p>
                          {!n.isRead && (
                            <button 
                              onClick={() => {
                                if (n.id) updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                              }}
                              className="text-[10px] font-black uppercase tracking-[0.2em] underline underline-offset-4"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {notifications.some(n => n && !n.isRead) && (
              <div className="p-6 sm:p-8 border-t border-black/10 dark:border-white/10">
                <button 
                  onClick={markAllRead}
                  className="btn-editorial w-full py-4 text-[10px]"
                >
                  Clear All Alerts
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
