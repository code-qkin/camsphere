import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  orderBy,
  addDoc,
  getDocs,
  limit 
} from 'firebase/firestore';
import type { User, Verification, MarketItem, NestListing, Report, Notification, University, ActionLog } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cancel01Icon, 
  Search01Icon,
  Menu01Icon,
  Alert01Icon,
  InformationCircleIcon,
    CheckmarkCircle01Icon, 
    PlusSignIcon,
    ViewIcon
  } from 'hugeicons-react';import { AdminSidebar } from '../components/admin/AdminSidebar';
import { format, isValid } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';

type AdminTab = 'overview' | 'verifications' | 'students' | 'staff' | 'content' | 'reports' | 'requests' | 'notifications' | 'schools' | 'logs';

export const AdminDashboard = () => {
  const { user, dbUser } = useAuth();
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isLead = dbUser?.role === 'lead_admin';

  // Data States
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [nestListings, setNestListings] = useState<NestListing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingAdmins, setPendingAdmins] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [schools, setSchools] = useState<University[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);

  // Search/Filter States
  const [userSearch, setUserUsersSearch] = useState('');
  const [selectedVerify, setSelectedVerify] = useState<Verification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Add School State
  const [newSchoolName, setNewSchoolName] = useState('');
  const [isAddingSchool, setIsAddingSchool] = useState(false);

  // Broadcast State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Role Assignment (Lead Only)
  const [staffTargetRole, setStaffTargetRole] = useState<'admin' | 'lead_admin'>('admin');

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingVerifications: 0,
    activeMarket: 0,
    activeLodges: 0
  });

  const safeFormatDate = (timestamp: any) => {
    try {
      if (!timestamp) return '-- --- ----';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (!isValid(date)) return '-- --- ----';
      return format(date, 'dd MMM yyyy');
    } catch (e) {
      return '-- --- ----';
    }
  };

  useEffect(() => {
    const leadOnlyTabs: AdminTab[] = ['staff', 'schools', 'requests', 'logs'];
    if (dbUser && !isLead && leadOnlyTabs.includes(activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, isLead, dbUser]);

  useEffect(() => {
    if (!user) return;

    const unsubV = onSnapshot(query(collection(db, 'verifications'), where('status', '==', 'pending')), (snap) => {
      setVerifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Verification)));
      setStats(prev => ({ ...prev, pendingVerifications: snap.size }));
    });

    const unsubU = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as unknown as User)));
      setStats(prev => ({ ...prev, totalUsers: snap.size }));
    });

    const unsubM = onSnapshot(collection(db, 'market_items'), (snap) => {
      setMarketItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as MarketItem)));
      setStats(prev => ({ ...prev, activeMarket: snap.size }));
    });

    const unsubN = onSnapshot(collection(db, 'nest_listings'), (snap) => {
      setNestListings(snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as NestListing)));
      setStats(prev => ({ ...prev, activeLodges: snap.size }));
    });

    const unsubR = onSnapshot(query(collection(db, 'reports'), where('status', '==', 'open')), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Report)));
    });

    const unsubA = onSnapshot(query(collection(db, 'users'), where('role', '==', 'pending_admin')), (snap) => {
      setPendingAdmins(snap.docs.map(d => ({ uid: d.id, ...d.data() } as unknown as User)));
    });

    const unsubS = onSnapshot(query(collection(db, 'universities'), orderBy('createdAt', 'desc')), (snap) => {
      setSchools(snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as University)));
    });

    const unsubNotifs = onSnapshot(query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc')), (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Notification)));
    });

    let unsubLogs = () => {};
    if (isLead) {
      unsubLogs = onSnapshot(query(collection(db, 'action_logs'), orderBy('timestamp', 'desc'), limit(50)), (snap) => {
        setActionLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActionLog)));
      });
    }

    return () => {
      unsubV(); unsubU(); unsubM(); unsubN(); unsubR(); unsubA(); unsubS(); unsubNotifs(); unsubLogs();
    };
  }, [user, isLead]);

  const logAction = async (action: string, targetId: string) => {
    if (!user || !dbUser) return;
    try {
      await addDoc(collection(db, 'action_logs'), {
        adminId: user.uid,
        adminName: dbUser.displayName,
        action,
        targetId,
        timestamp: Date.now()
      });
    } catch (err) { console.error("Logging failed:", err); }
  };

  const handleVerify = async (v: Verification, approve: boolean) => {
    if (!approve && !rejectionReason) {
      setIsRejecting(true);
      return;
    }
    try {
      const status = approve ? 'approved' : 'rejected';
      await updateDoc(doc(db, 'verifications', v.id), { status });
      await updateDoc(doc(db, 'users', v.userId), { 
        verificationStatus: status,
        ...(approve ? {} : { rejectionReason })
      });
      await logAction(`${approve ? 'Approved' : 'Rejected'} verification`, v.userId);
      setSelectedVerify(null);
      setIsRejecting(false);
      setRejectionReason('');
    } catch (err) { console.error(err); }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage || !isLead) return;
    try {
      setLoading(true);
      const batch = writeBatch(db);
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));
      usersSnap.forEach(userDoc => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: userDoc.id,
          title: `[BROADCAST] ${broadcastTitle}`,
          message: broadcastMessage,
          type: 'warning',
          isRead: false,
          createdAt: Date.now()
        });
      });
      await batch.commit();
      await logAction(`Sent mass broadcast: ${broadcastTitle}`, 'all');
      setBroadcastTitle('');
      setBroadcastMessage('');
      showAlert({
        title: 'Broadcast Delivered',
        message: 'System announcement has been synchronized to all student dashboards.',
        type: 'success'
      });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleUserRole = async (uid: string, newRole: string) => {
    try {
      const isStaff = newRole === 'admin' || newRole === 'lead_admin';
      await updateDoc(doc(db, 'users', uid), { 
        role: newRole,
        ...(isStaff ? { verificationStatus: 'approved' } : {})
      });
    } catch (err) { console.error(err); }
  };

  const handleTakedown = async (id: string, type: 'market' | 'nest') => {
    showAlert({
      title: 'Authorize Takedown',
      message: 'This listing will be permanently purged for violation of policy. Confirm?',
      type: 'confirm',
      confirmText: 'Execute Takedown',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, type === 'market' ? 'market_items' : 'nest_listings', id));
          await logAction(`Takedown ${type} item`, id);
        } catch (err) { console.error(err); }
      }
    });
  };

  const handleResolveReport = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reports', id), { status: 'resolved' });
      await logAction(`Resolved report`, id);
    } catch (err) { console.error(err); }
  };

  const markAllNotifsRead = async () => {
    const batch = writeBatch(db);
    notifications.filter(n => !n.isRead).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { isRead: true });
    });
    await batch.commit();
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'warning': return <Alert01Icon className="text-[#FF5A5F]" size={18} />;
      case 'success': return <CheckmarkCircle01Icon className="text-green-500" size={18} />;
      default: return <InformationCircleIcon className="text-[#B1A9FF]" size={18} />;
    }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    try {
      await addDoc(collection(db, 'universities'), {
        name: newSchoolName.trim(),
        available: true,
        createdAt: Date.now()
      });
      await logAction(`Registered school: ${newSchoolName}`, 'network');
      setNewSchoolName('');
      setIsAddingSchool(false);
    } catch (err) { console.error(err); }
  };

  const handleDeleteSchool = async (id: string) => {
    showAlert({
      title: 'Decommission School',
      message: 'This institution will be removed from the active network. No new listings can be created under this campus. Confirm?',
      type: 'confirm',
      confirmText: 'Remove School',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'universities', id));
          await logAction(`Removed school`, id);
        } catch (err) { console.error(err); }
      }
    });
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const studentsList = filteredUsers.filter(u => u.role === 'student' || u.role === 'suspended');
  const staffList = filteredUsers.filter(u => u.role === 'admin' || u.role === 'lead_admin');

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-500 overflow-x-hidden pt-20">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto h-[calc(100vh-80px)] no-scrollbar">
        {/* Mobile Header */}
        <div className="sm:hidden flex items-center justify-between p-6 border-b border-black/10 dark:border-white/10 sticky top-0 bg-white/90 dark:bg-black/90 backdrop-blur-md z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-black text-xl">C</div>
            <span className="font-black tracking-tighter uppercase text-xs">Admin Hub</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 border border-black dark:border-white"><Menu01Icon size={20} /></button>
        </div>

        <div className="p-6 sm:p-8 lg:p-16">
          <header className="mb-12 sm:mb-16">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 mb-4 block">Access // Global Control</span>
            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.85]">{activeTab}</h1>
          </header>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
              
              {activeTab === 'overview' && (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a]">
                    {[
                      { label: 'Verified Network', value: stats.totalUsers, accent: 'text-black dark:text-white' },
                      { label: 'Pending Audit', value: stats.pendingVerifications, accent: 'text-[#FF5A5F]' },
                      { label: 'Market Volume', value: stats.activeMarket, accent: 'text-[#B1A9FF]' },
                      { label: 'Active Nesting', value: stats.activeLodges, accent: 'text-black dark:text-white' }
                    ].map((stat, i) => (
                      <div key={i} className="p-8 sm:p-10 border-b sm:border-b-0 sm:border-r border-black/10 dark:border-white/10 last:border-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-6">{stat.label}</p>
                        <p className={`text-4xl sm:text-6xl font-black tracking-tighter leading-none ${stat.accent}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {isLead && (
                      <div className="lg:col-span-2 border-2 border-black dark:border-white p-10 bg-white dark:bg-black">
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF5A5F] mb-6 block">Mass Communication // Broadcast</span>
                        <form onSubmit={handleBroadcast} className="space-y-8">
                          <input required type="text" placeholder="ANNOUNCEMENT TITLE..." value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} className="w-full bg-transparent border-b-2 border-black/10 dark:border-white/10 px-0 py-4 outline-none focus:border-[#FF5A5F] transition-all font-black uppercase tracking-widest text-lg" />
                          <textarea required placeholder="ENTER GLOBAL MESSAGE..." rows={3} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 p-6 outline-none focus:border-[#FF5A5F] transition-all font-bold uppercase tracking-widest text-xs" />
                          <button disabled={loading} type="submit" className="btn-editorial bg-[#FF5A5F] text-black border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full lg:w-fit px-12 py-5">{loading ? 'TRANSMITTING...' : 'DELIVER BROADCAST'}</button>
                        </form>
                      </div>
                    )}
                    <div className="border border-black dark:border-white p-10 bg-white dark:bg-black">
                      <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF5A5F] mb-6 block">Critical // Reports</span>
                      <h3 className="text-3xl font-black uppercase tracking-tighter mb-6">Pending Disputes</h3>
                      <p className="text-sm font-medium text-gray-500 mb-8 leading-relaxed">There are currently {reports.length} unresolved reports requiring immediate mediation.</p>
                      <button onClick={() => setActiveTab('reports')} className="btn-editorial">View Reports</button>
                    </div>
                    <div className="border border-black dark:border-white p-10 bg-white dark:bg-black">
                      <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#B1A9FF] mb-6 block">Access // Security</span>
                      <h3 className="text-3xl font-black uppercase tracking-tighter mb-6">Staff Enrollment</h3>
                      <p className="text-sm font-medium text-gray-500 mb-8 leading-relaxed">{pendingAdmins.length} prospective staff members are awaiting clearance.</p>
                      <button disabled={!isLead} onClick={() => setActiveTab('requests')} className="btn-editorial disabled:opacity-30">Review Requests</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'verifications' && (
                <div className="border border-black/10 dark:border-white/10 overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#0a0a0a] border-b border-black/10 dark:border-white/10">
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest">Identification</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest">Campus</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifications.map(v => (
                        <tr key={v.id} className="border-b border-black/5 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                          <td className="p-6"><p className="font-black uppercase tracking-tight text-lg">{v.displayName}</p><p className="text-[10px] font-mono opacity-40">{v.userId}</p></td>
                          <td className="p-6"><span className="text-xs font-bold uppercase tracking-widest">{v.university}</span></td>
                          <td className="p-6 text-right"><button onClick={() => setSelectedVerify(v)} className="btn-editorial inline-flex items-center gap-2">Review <ViewIcon size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'students' && (
                <div className="space-y-8">
                  <div className="flex gap-4 border-b border-black dark:border-white pb-4">
                    <Search01Icon size={24} className="text-gray-400" />
                    <input type="text" placeholder="SEARCH STUDENTS..." value={userSearch} onChange={e => setUserUsersSearch(e.target.value)} className="flex-1 bg-transparent outline-none font-black uppercase tracking-widest text-lg" />
                  </div>
                  <div className="border border-black/10 dark:border-white/10 overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-[#0a0a0a] border-b border-black/10 dark:border-white/10">
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest">Account</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest">Status</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentsList.map(u => (
                          <tr key={u.uid} className="border-b border-black/5 dark:border-white/5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                            <td className="p-6"><p className="font-black uppercase tracking-tight">{u.displayName}</p><p className="text-[10px] opacity-40">{u.email}</p></td>
                            <td className="p-6"><span className={`text-[10px] font-black uppercase px-3 py-1 border ${u.verificationStatus === 'approved' ? 'border-green-500 text-green-500' : 'border-gray-300 text-gray-400'}`}>{u.verificationStatus}</span></td>
                            <td className="p-6 text-right">
                              <div className="flex justify-end gap-4">
                                <button onClick={() => handleUserRole(u.uid, u.role === 'suspended' ? 'student' : 'suspended')} className="text-[10px] font-black uppercase border border-black/10 px-4 py-2 hover:bg-black hover:text-white">
                                  {u.role === 'suspended' ? 'Reactivate' : 'Suspend'}
                                </button>
                                {isLead && (
                                  <button 
                                    onClick={() => {
                                      showAlert({
                                        title: 'Authorize Termination',
                                        message: `Are you sure you want to permanently remove ${u.displayName} from the network? This action is irreversible.`,
                                        type: 'confirm',
                                        confirmText: 'Execute Termination',
                                        onConfirm: async () => {
                                          try {
                                            await deleteDoc(doc(db, 'users', u.uid));
                                            await logAction(`Terminated user account`, u.uid);
                                          } catch (err) { console.error(err); }
                                        }
                                      });
                                    }} 
                                    className="text-[10px] font-black uppercase border border-[#FF5A5F] text-[#FF5A5F] px-4 py-2 hover:bg-[#FF5A5F] hover:text-white"
                                  >
                                    Terminate
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'staff' && isLead && (
                <div className="space-y-8">
                  <div className="flex gap-4 border-b border-black dark:border-white pb-4">
                    <Search01Icon size={24} className="text-gray-400" />
                    <input type="text" placeholder="SEARCH STAFF..." value={userSearch} onChange={e => setUserUsersSearch(e.target.value)} className="flex-1 bg-transparent outline-none font-black uppercase tracking-widest text-lg" />
                  </div>
                  <div className="border border-black/10 dark:border-white/10 overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-[#0a0a0a] border-b border-black/10 dark:border-white/10">
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest">Authority</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Rank</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest">Status</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffList.map(u => (
                          <tr key={u.uid} className="border-b border-black/5 dark:border-white/5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                            <td className="p-6"><p className="font-black uppercase tracking-tight">{u.displayName}</p><p className="text-[10px] opacity-40">{u.email}</p></td>
                            <td className="p-6 text-center">
                              <select value={u.role} onChange={e => handleUserRole(u.uid, e.target.value)} className="bg-white dark:bg-black border border-black/20 p-2 font-black uppercase text-[10px]">
                                <option value="admin">Admin</option>
                                <option value="lead_admin">Lead Admin</option>
                              </select>
                            </td>
                            <td className="p-6"><span className="text-[10px] font-black uppercase px-3 py-1 border border-green-500 text-green-500">Approved</span></td>
                            <td className="p-6 text-right">
                              <div className="flex justify-end gap-4">
                                <button onClick={() => handleUserRole(u.uid, 'student')} className="text-[10px] font-black uppercase border border-black/10 px-4 py-2 hover:bg-black hover:text-white">Demote</button>
                                <button 
                                  onClick={() => {
                                    showAlert({
                                      title: 'Terminate Account',
                                      message: `Are you sure you want to permanently remove ${u.displayName} from the network? This action is irreversible.`,
                                      type: 'confirm',
                                      confirmText: 'Execute Termination',
                                      onConfirm: async () => {
                                        try {
                                          await deleteDoc(doc(db, 'users', u.uid));
                                          await logAction(`Terminated staff account`, u.uid);
                                        } catch (err) { console.error(err); }
                                      }
                                    });
                                  }} 
                                  className="text-[10px] font-black uppercase border border-[#FF5A5F] text-[#FF5A5F] px-4 py-2 hover:bg-[#FF5A5F] hover:text-white"
                                >
                                  Terminate
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'content' && (
                <div className="border border-black/10 dark:border-white/10 overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#0a0a0a] border-b border-black/10 dark:border-white/10">
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest">Asset</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest">Origin</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...marketItems.map(i => ({...i, sourceType: 'market'})), ...nestListings.map(i => ({...i, sourceType: 'nest'}))].map((item: any) => (
                        <tr key={item.id} className="border-b border-black/5 dark:border-white/5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="p-6"><p className="font-black uppercase tracking-tight">{item.title}</p><span className="text-[9px] font-black uppercase text-[#B1A9FF]">{item.sourceType} //</span></td>
                          <td className="p-6"><p className="text-xs font-bold uppercase text-gray-500">{item.university}</p></td>
                          <td className="p-6 text-right">
                            <div className="flex justify-end gap-6 items-center">
                              <Link to={`/${item.sourceType}/${item.id}`} target="_blank" className="text-[10px] font-black uppercase hover:underline flex items-center gap-2">Review <ViewIcon size={14} /></Link>
                              <button onClick={() => handleTakedown(item.id, item.sourceType)} className="text-[10px] font-black uppercase text-[#FF5A5F] hover:underline">Permanent Takedown</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="border border-black/10 dark:border-white/10 overflow-x-auto no-scrollbar">
                  {reports.length === 0 ? <div className="p-24 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">Zero unresolved reports //</div> : (
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-[#0a0a0a] border-b border-black/10 dark:border-white/10">
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest">Reason</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest">Target</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Resolution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map(r => (
                          <tr key={r.id} className="border-b border-black/5 dark:border-white/5">
                            <td className="p-6"><p className="font-black uppercase text-[#FF5A5F]">{r.reason}</p><p className="text-[9px] opacity-40">Reporter: {r.reporterId}</p></td>
                            <td className="p-6 font-mono text-[10px] opacity-40">
                              <div className="flex flex-col gap-2">
                                <span>Target: {r.targetId}</span>
                                {r.type === 'item' && r.itemType && (
                                  <Link 
                                    to={`/${r.itemType}/${r.targetId}`} 
                                    target="_blank"
                                    className="text-black dark:text-white font-black uppercase text-[9px] hover:underline flex items-center gap-2 w-fit"
                                  >
                                    Review Target <ViewIcon size={12} />
                                  </Link>
                                )}
                                {r.type === 'user' && (
                                  <Link 
                                    to={`/profile/${r.targetId}`} 
                                    target="_blank"
                                    className="text-black dark:text-white font-black uppercase text-[9px] hover:underline flex items-center gap-2 w-fit"
                                  >
                                    View Profile <ViewIcon size={12} />
                                  </Link>
                                )}
                              </div>
                            </td>
                            <td className="p-6 text-right"><button onClick={() => handleResolveReport(r.id)} className="btn-editorial text-green-600 border-green-600 py-2 px-4 text-[10px]">Resolve</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-10">
                  <div className="flex justify-between items-center border-b border-black dark:border-white pb-6">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">System Notifications</h3>
                    {notifications.some(n => !n.isRead) && <button onClick={markAllNotifsRead} className="text-[10px] font-black uppercase underline underline-offset-4">Mark All Read</button>}
                  </div>
                  <div className="grid grid-cols-1 gap-0 border border-black/10 dark:border-white/10">
                    {notifications.length === 0 ? <div className="p-24 text-center text-gray-400 font-bold uppercase text-[10px]">No historical alerts //</div> : notifications.map(n => (
                      <div key={n.id} className={`p-8 border-b border-black/5 dark:border-white/5 flex gap-6 ${!n.isRead ? 'bg-[#B1A9FF]/5' : ''}`}>
                        <div className="mt-1">{getNotifIcon(n.type)}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2"><h4 className="font-black text-lg uppercase">{n.title}</h4><span className="text-[10px] font-black opacity-40">{safeFormatDate(n.createdAt)}</span></div>
                          <p className="text-sm font-medium text-gray-500 leading-relaxed">{n.message}</p>
                          {!n.isRead && <button onClick={() => updateDoc(doc(db, 'notifications', n.id), { isRead: true })} className="btn-editorial mt-6 py-2 px-4 text-[10px]">Acknowledge</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'schools' && (
                <div className="space-y-12">
                  <div className="flex justify-between items-center border-b border-black dark:border-white pb-6">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Network Matrix</h3>
                    <button onClick={() => setIsAddingSchool(!isAddingSchool)} className="btn-editorial inline-flex items-center gap-2">{isAddingSchool ? 'Cancel' : 'Add New'} <PlusSignIcon size={14} /></button>
                  </div>
                  <AnimatePresence>
                    {isAddingSchool && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-12">
                        <form onSubmit={handleAddSchool} className="p-8 border border-black dark:border-white bg-gray-50 dark:bg-[#0a0a0a] flex gap-4">
                          <input required type="text" value={newSchoolName} onChange={e => setNewSchoolName(e.target.value)} placeholder="ENTER UNIVERSITY NAME..." className="flex-1 bg-white dark:bg-black border border-black/10 p-4 font-black uppercase text-xs" />
                          <button type="submit" className="btn-editorial bg-[#B1A9FF] text-black border-black">Register</button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="border border-black/10 dark:border-white/10 overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead><tr className="bg-gray-50 dark:bg-[#0a0a0a] border-b border-black/10"><th className="p-6 text-[10px] font-black uppercase">Institution</th><th className="p-6 text-[10px] font-black uppercase text-right">Action</th></tr></thead>
                      <tbody>
                        {schools.map(s => (
                          <tr key={s.id} className="border-b border-black/5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                            <td className="p-6"><p className="font-black uppercase text-lg">{s.name}</p><p className="text-[10px] opacity-40">{s.id}</p></td>
                            <td className="p-6 text-right"><button onClick={() => handleDeleteSchool(s.id)} className="text-[10px] font-black uppercase text-[#FF5A5F] hover:underline">Remove</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'requests' && (
                <div className="border border-black/10 dark:border-white/10 overflow-x-auto no-scrollbar">
                  {pendingAdmins.length === 0 ? <div className="p-24 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">No pending requests //</div> : (
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead><tr className="bg-gray-50 dark:bg-[#0a0a0a] border-b border-black/10"><th className="p-6 text-[10px] font-black uppercase">Candidate</th><th className="p-6 text-[10px] font-black uppercase text-center">Authority</th><th className="p-6 text-[10px] font-black uppercase text-right">Decision</th></tr></thead>
                      <tbody>
                        {pendingAdmins.map(u => (
                          <tr key={u.uid} className="border-b border-black/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <td className="p-6"><p className="font-black uppercase">{u.displayName}</p><p className="text-[10px] opacity-40">{u.email}</p></td>
                            <td className="p-6 text-center"><select value={staffTargetRole} onChange={e => setStaffTargetRole(e.target.value as any)} className="bg-white dark:bg-black border border-black/10 p-2 font-black uppercase text-[10px]"><option value="admin">Admin</option><option value="lead_admin">Lead Admin</option></select></td>
                            <td className="p-6 text-right">
                              <div className="flex justify-end gap-4">
                                <button 
                                  onClick={() => {
                                    handleUserRole(u.uid, staffTargetRole);
                                    logAction(`Promoted staff`, u.uid);
                                  }} 
                                  className="text-green-600 font-black text-[10px] uppercase hover:underline"
                                >
                                  Grant
                                </button>
                                <button 
                                  onClick={() => {
                                    showAlert({
                                      title: 'Deny Access',
                                      message: `Reject staff request and purge account for ${u.displayName}?`,
                                      type: 'confirm',
                                      confirmText: 'Deny & Purge',
                                      onConfirm: async () => {
                                        try {
                                          await logAction(`Denied staff request`, u.uid);
                                          await deleteDoc(doc(db, 'users', u.uid));
                                        } catch (err) { console.error(err); }
                                      }
                                    });
                                  }}
                                  className="text-[#FF5A5F] font-black text-[10px] uppercase hover:underline"
                                >
                                  Deny
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="border border-black/10 dark:border-white/10 overflow-x-auto no-scrollbar">
                  {actionLogs.length === 0 ? <div className="p-24 text-center text-gray-400 font-bold uppercase text-[10px]">No historical logs //</div> : (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead><tr className="bg-gray-50 dark:bg-[#0a0a0a] border-b border-black/10"><th className="p-6 text-[10px] font-black uppercase">Authority</th><th className="p-6 text-[10px] font-black uppercase">Event</th><th className="p-6 text-[10px] font-black uppercase">Target</th><th className="p-6 text-[10px] font-black uppercase text-right">Timestamp</th></tr></thead>
                      <tbody>
                        {actionLogs.map(log => (
                          <tr key={log.id} className="border-b border-black/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <td className="p-6"><p className="font-black text-xs uppercase">{log.adminName}</p><p className="text-[9px] opacity-40 font-mono">{log.adminId}</p></td>
                            <td className="p-6"><span className="text-[10px] font-black uppercase bg-black text-white dark:bg-white dark:text-black px-3 py-1">{log.action}</span></td>
                            <td className="p-6 font-mono text-[10px] opacity-40">{log.targetId}</td>
                            <td className="p-6 text-right font-mono text-[10px] opacity-40 uppercase">{format(log.timestamp, 'dd/MM HH:mm:ss')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Review Side Drawer */}
      <AnimatePresence>
        {selectedVerify && (
          <div className="fixed inset-0 z-[400] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedVerify(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="relative w-full max-w-2xl bg-white dark:bg-black h-full border-l border-black/10 dark:border-white/10 overflow-y-auto p-8 lg:p-20 no-scrollbar shadow-2xl">
              <button onClick={() => setSelectedVerify(null)} className="absolute top-8 right-8 text-black dark:text-white hover:opacity-50 transition-opacity"><Cancel01Icon size={32} /></button>
              <div className="mb-12 lg:mb-16 border-l-4 border-[#B1A9FF] pl-6 lg:pl-8 mt-12 sm:mt-0">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 mb-4 block">Audit // Sub-01</span>
                <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none">{selectedVerify.displayName}</h3>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mt-4 font-mono truncate">{selectedVerify.userId}</p>
              </div>
              <div className="space-y-12 lg:space-y-16">
                <div className="space-y-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] border-b border-black/10 dark:border-white/10 pb-4 block">01 // Face Identification</span>
                  <div className="aspect-square border border-black/10 dark:border-white/10 bg-gray-100 dark:bg-[#0a0a0a] overflow-hidden"><img src={selectedVerify.selfieUrl} className="w-full h-full object-cover grayscale transition-all duration-1000" /></div>
                </div>
                <div className="space-y-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] border-b border-black/10 dark:border-white/10 pb-4 block">02 // Institutional Proof</span>
                  <div className="aspect-[16/10] border border-black/10 dark:border-white/10 bg-gray-100 dark:bg-[#0a0a0a] overflow-hidden"><img src={selectedVerify.idCardUrl} className="w-full h-full object-contain grayscale transition-all duration-1000" /></div>
                </div>
              </div>
              <div className="mt-16 sm:mt-20 pt-12 sm:pt-16 border-t border-black/10 dark:border-white/10">
                {isRejecting ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                    <div><label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF5A5F] mb-4 block">Formal Rejection Reason</label><textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="w-full px-6 py-4 bg-gray-50 dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 outline-none font-bold uppercase tracking-widest text-xs min-h-[150px] placeholder:text-gray-300" placeholder="SPECIFY CLEARLY // BLURRY DOCUMENTS, MISMATCHED DATA" /></div>
                    <div className="flex flex-col sm:flex-row gap-4"><button onClick={() => handleVerify(selectedVerify, false)} className="btn-editorial bg-[#FF5A5F] text-black border-black flex-1 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">REJECT</button><button onClick={() => setIsRejecting(false)} className="btn-editorial flex-1">CANCEL</button></div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-6"><button onClick={() => handleVerify(selectedVerify, true)} className="btn-editorial bg-[#B1A9FF] text-black border-black flex-1 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">APPROVE IDENTITY</button><button onClick={() => setIsRejecting(true)} className="btn-editorial bg-white dark:bg-black text-[#FF5A5F] border-[#FF5A5F] flex-1 hover:bg-[#FF5A5F] hover:text-black">REJECT</button></div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
