import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../services/firebase';
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc, getDoc, addDoc } from 'firebase/firestore';
import type { MarketItem, NestListing, Favorite, User } from '../types';
import { Logout01Icon, Edit02Icon, Delete01Icon, CheckmarkCircle01Icon, ArrowLeft01Icon, Shield01Icon, Share01Icon, Camera01Icon, Alert01Icon, Cancel01Icon } from 'hugeicons-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { VerificationModal } from '../components/modals/VerificationModal';
import { uploadToCloudinary } from '../services/cloudinary';
import { formatDistanceToNow } from 'date-fns';
import { useAlert } from '../contexts/AlertContext';
import { motion, AnimatePresence } from 'framer-motion';

export const Profile = () => {
  const { user, dbUser, refreshDbUser } = useAuth();
  const { showAlert } = useAlert();
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'market' | 'nest' | 'favorites'>('market');
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(dbUser?.displayName || '');
  const [editWhatsapp, setEditWhatsapp] = useState(dbUser?.whatsapp || '');
  const [newCover, setNewCover] = useState<File | null>(null);
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [shouldRemoveCover, setShouldRemoveCover] = useState(false);

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [nestItems, setNestItems] = useState<NestListing[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    const initProfile = async () => {
      setLoading(true);
      const targetUid = uid || user?.uid;
      
      if (!targetUid) {
        setLoading(false);
        return;
      }

      const ownProfile = targetUid === user?.uid;
      setIsOwnProfile(ownProfile);

      if (ownProfile && dbUser) {
        setProfileUser(dbUser);
        setEditName(dbUser.displayName);
        setEditWhatsapp(dbUser.whatsapp);
      } else {
        try {
          const userDoc = await getDoc(doc(db, 'users', targetUid));
          if (userDoc.exists()) {
            setProfileUser({ uid: userDoc.id, ...userDoc.data() } as User);
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
        }
      }
      setLoading(false);
    };

    initProfile();
  }, [uid, user, dbUser]);

  useEffect(() => {
    const targetUid = uid || user?.uid;
    if (targetUid) {
      fetchUserData(targetUid);
    }
  }, [uid, user, activeTab]);

  const fetchUserData = async (targetUid: string) => {
    try {
      if (activeTab === 'market') {
        const q = query(
          collection(db, 'market_items'), 
          where('university', '==', dbUser?.university || ''),
          where('sellerId', '==', targetUid)
        );
        const snap = await getDocs(q);
        setMarketItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketItem)));
      } else if (activeTab === 'nest') {
        const q = query(
          collection(db, 'nest_listings'), 
          where('university', '==', dbUser?.university || ''),
          where('listerId', '==', targetUid)
        );
        const snap = await getDocs(q);
        setNestItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as NestListing)));
      } else if (activeTab === 'favorites' && isOwnProfile) {
        const q = query(
          collection(db, 'favorites'), 
          where('university', '==', dbUser?.university || ''),
          where('userId', '==', targetUid)
        );
        const snap = await getDocs(q);
        setFavorites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Favorite)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profileUser || !reportReason.trim()) return;
    setIsReporting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        targetId: profileId,
        type: 'user',
        reason: reportReason.trim(),
        reporterId: user.uid,
        university: dbUser.university,
        status: 'open',
        createdAt: Date.now()
      });
      setIsReportModalOpen(false);
      setReportReason('');
      showAlert({
        title: 'Report Received',
        message: 'Security staff will audit this account within 24 hours. Thank you for securing the network.',
        type: 'success'
      });
    } catch (err) {
      console.error("Report failed:", err);
    } finally {
      setIsReporting(false);
    }
  };

  const handleShareStorefront = () => {
    const url = `${window.location.origin}/profile/${profileUser?.uid}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      let coverUrl = profileUser?.coverUrl || '';
      if (newCover) {
        coverUrl = await uploadToCloudinary(newCover);
      } else if (shouldRemoveCover) {
        coverUrl = '';
      }

      let photoURL = profileUser?.photoURL || '';
      if (newAvatar) {
        photoURL = await uploadToCloudinary(newAvatar);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editName,
        whatsapp: editWhatsapp,
        coverUrl,
        photoURL
      });
      await refreshDbUser();
      setIsEditing(false);
      setNewCover(null);
      setNewAvatar(null);
      setShouldRemoveCover(false);
      showAlert({
        title: 'Profile Updated',
        message: 'Your professional profile has been synchronized.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      showAlert({
        title: 'Update Failed',
        message: 'Failed to synchronize profile data. Check your connection.',
        type: 'warning'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleItemStatus = async (id: string, collectionName: string, currentStatus: boolean, field: string) => {
    try {
      await updateDoc(doc(db, collectionName, id), {
        [field]: !currentStatus
      });
      if (uid || user?.uid) fetchUserData(uid || user!.uid);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteItem = async (id: string, collectionName: string) => {
    showAlert({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to permanently remove this from the network? This action cannot be reversed.',
      type: 'confirm',
      confirmText: 'Delete Permanently',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, collectionName, id));
          if (uid || user?.uid) fetchUserData(uid || user!.uid);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const getVerificationBadge = () => {
    const isStaff = profileUser?.role === 'admin' || profileUser?.role === 'lead_admin';
    if (isStaff) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 border border-[#B1A9FF] text-[#B1A9FF] text-[10px] font-black uppercase tracking-[0.2em] bg-[#B1A9FF]/5">
          <Shield01Icon size={14} /> Verified Staff
        </div>
      );
    }

    const status = profileUser?.verificationStatus || 'unverified';
    const isMerchant = (profileUser?.stats?.itemsSold || 0) >= 5;

    switch (status) {
      case 'approved':
        return isMerchant ? (
          <div className="flex items-center gap-2 px-4 py-2 border border-[#B1A9FF] text-[#B1A9FF] text-[10px] font-black uppercase tracking-[0.2em] bg-[#B1A9FF]/5">
            <CheckmarkCircle01Icon size={14} /> Verified Merchant
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 border border-green-500 text-green-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <CheckmarkCircle01Icon size={14} /> Verified Student
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2 px-4 py-2 border border-[#B1A9FF] text-[#B1A9FF] text-[10px] font-black uppercase tracking-[0.2em]">
            <Shield01Icon size={14} /> Review Pending
          </div>
        );
      case 'rejected':
        return isOwnProfile ? (
          <button 
            onClick={() => setIsVerifyModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[#FF5A5F] text-[#FF5A5F] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#FF5A5F] hover:text-black transition-colors"
          >
            Verification Denied - Retry?
          </button>
        ) : null;
      default:
        return isOwnProfile ? (
          <button 
            onClick={() => setIsVerifyModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-80 transition-opacity"
          >
            Verify Identity
          </button>
        ) : null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black p-6 text-center">
        <h2 className="text-4xl font-black uppercase tracking-tighter mb-6">User Not Found</h2>
        <button onClick={() => navigate('/')} className="btn-editorial">Back to Network</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-4 sm:px-6 min-h-screen relative space-y-12">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-all group z-20 relative"
          >
            <ArrowLeft01Icon size={18} className="group-hover:-translate-x-1 transition-transform" /> Back
          </button>
          {!isOwnProfile && (
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-red-500 hover:opacity-50 transition-opacity"
            >
              <Alert01Icon size={14} /> Report User
            </button>
          )}
        </div>

        {/* Profile Header */}
        <div className="relative border border-black/10 dark:border-white/10 overflow-hidden flex flex-col lg:flex-row shadow-xl min-h-[400px] bg-white dark:bg-black">
          <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {isEditing ? (
              newCover ? (
                <img src={URL.createObjectURL(newCover)} alt="Preview" className="w-full h-full object-cover grayscale opacity-60" />
              ) : (profileUser.coverUrl && !shouldRemoveCover) ? (
                <img src={profileUser.coverUrl} alt="Cover" className="w-full h-full object-cover grayscale opacity-60" />
              ) : (
                <div className="w-full h-full bg-[#B1A9FF]" />
              )
            ) : (
              profileUser.coverUrl ? (
                <img src={profileUser.coverUrl} alt="Cover" className="w-full h-full object-cover grayscale opacity-60" />
              ) : (
                <div className="w-full h-full bg-[#B1A9FF]" />
              )
            )}
            {/* Editorial Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-transparent via-white/40 to-white dark:via-black/40 dark:to-black" />
          </div>
          
          <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-black/10 dark:border-white/10 p-8 lg:p-12 flex flex-col items-center justify-center relative group text-black z-10">
            {isOwnProfile && (
              <button 
                onClick={() => auth.signOut()}
                className="absolute top-6 left-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-black dark:text-white hover:opacity-50 transition-opacity z-20"
              >
                <Logout01Icon size={16} /> Logout
              </button>
            )}
            
            <div className="w-32 h-32 sm:w-48 sm:h-48 border-4 border-black flex-shrink-0 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden transition-transform duration-500 group">
               {isEditing ? (
                 <label className="cursor-pointer w-full h-full relative block group/avatar">
                   <img src={newAvatar ? URL.createObjectURL(newAvatar) : (profileUser.photoURL || `https://ui-avatars.com/api/?name=${profileUser.displayName}&bg=fff&color=000&rounded=false&size=512`)} alt="Profile" className="w-full h-full object-cover grayscale group-hover/avatar:opacity-50 transition-opacity" />
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity text-white">
                     <Camera01Icon size={24} />
                     <span className="text-[8px] font-black uppercase tracking-widest mt-1">Change Photo</span>
                   </div>
                   <input type="file" accept="image/*" onChange={e => setNewAvatar(e.target.files?.[0] || null)} className="hidden" />
                 </label>
               ) : (
                 <img src={profileUser.photoURL || `https://ui-avatars.com/api/?name=${profileUser.displayName}&bg=fff&color=000&rounded=false&size=512`} alt="Profile" className="w-full h-full object-cover grayscale" />
               )}
            </div>
          </div>

          <div className="lg:w-2/3 p-8 lg:p-24 flex flex-col justify-center relative z-10">
            <div className="flex-1 text-center sm:text-left w-full space-y-10">
              {isEditing ? (
                <div className="space-y-6 w-full max-w-xl mx-auto sm:mx-0">
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Feature Spread (Cover Image)</label>
                      {(newCover || (profileUser.coverUrl && !shouldRemoveCover)) && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setNewCover(null);
                            setShouldRemoveCover(true);
                          }}
                          className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF5A5F] hover:opacity-50 transition-opacity"
                        >
                          Remove Cover
                        </button>
                      )}
                    </div>
                    <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-black/20 dark:border-white/20 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors relative overflow-hidden bg-white/50 dark:bg-black/50">
                      {newCover ? (
                        <img src={URL.createObjectURL(newCover)} alt="Preview" className="w-full h-full object-cover grayscale" />
                      ) : (profileUser.coverUrl && !shouldRemoveCover) ? (
                        <img src={profileUser.coverUrl} alt="Current Cover" className="w-full h-full object-cover grayscale opacity-50" />
                      ) : (
                        <div className="flex flex-col items-center text-gray-400">
                          <Camera01Icon size={24} className="mb-2" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Upload Cover</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e => {
                          setNewCover(e.target.files?.[0] || null);
                          setShouldRemoveCover(false);
                        }} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Full Name</label>
                    <input 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="w-full px-6 py-5 bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white outline-none text-black dark:text-white font-black uppercase tracking-widest text-sm"
                      placeholder="FULL NAME"
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">WhatsApp Contact</label>
                    <input 
                      value={editWhatsapp} 
                      onChange={e => setEditWhatsapp(e.target.value)} 
                      className="w-full px-6 py-5 bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white outline-none text-black dark:text-white font-black uppercase tracking-widest text-sm"
                      placeholder="WHATSAPP NUMBER"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={handleSaveProfile} disabled={isSaving} className="btn-editorial-primary flex-1">{isSaving ? 'UPLOADING...' : 'Save Changes'}</button>
                    <button onClick={() => { setIsEditing(false); setNewCover(null); setNewAvatar(null); }} className="btn-editorial">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4 border-l-4 border-[#B1A9FF] pl-6 text-left">
                    <div className="flex flex-wrap items-center gap-4 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">{isOwnProfile ? 'My Profile' : 'Peer Profile'}</span>
                      {getVerificationBadge()}
                      {profileUser.lastActive && (
                        <span className="flex items-center gap-2 text-[9px] font-mono text-gray-400 uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          {formatDistanceToNow(profileUser.lastActive, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    
                    {isOwnProfile && profileUser.verificationStatus === 'rejected' && profileUser.rejectionReason && (
                      <div className="bg-[#FF5A5F]/10 border-l-4 border-[#FF5A5F] p-4 mb-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF5A5F] mb-1">Reason for Rejection //</p>
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">{profileUser.rejectionReason}</p>
                      </div>
                    )}

                    <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black text-black dark:text-white tracking-tighter uppercase leading-[0.9]">{profileUser.displayName}</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] pt-2">{profileUser.email}</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-6 border-t border-black/10 dark:border-white/10">
                    <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 text-black dark:text-white text-[10px] font-black uppercase tracking-[0.3em]">
                      {profileUser.university}
                    </div>
                    {profileUser.whatsapp && (
                      <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 text-black dark:text-white text-[10px] font-black uppercase tracking-[0.3em]">
                        WA: {profileUser.whatsapp}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-12 py-8 border-y border-black/10 dark:border-white/10">
                    <div className="text-center sm:text-left">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Total Sold</p>
                      <p className="text-3xl font-black tracking-tighter text-black dark:text-white">{profileUser.stats?.itemsSold || 0}</p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Active Listings</p>
                      <p className="text-3xl font-black tracking-tighter text-black dark:text-white">{marketItems.length + nestItems.length}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-8 mx-auto sm:mx-0">
                    {isOwnProfile ? (
                      <>
                        <button onClick={() => setIsEditing(true)} className="btn-editorial flex items-center gap-3">
                          <Edit02Icon size={16} /> Edit Profile
                        </button>
                        <button onClick={handleShareStorefront} className="btn-editorial flex items-center gap-3 border-[#B1A9FF] text-[#B1A9FF]">
                          <Share01Icon size={16} /> {copySuccess ? 'Copied //' : 'Share Storefront'}
                        </button>
                      </>
                    ) : (
                      <Link 
                        to="/chat" 
                        state={{ receiverId: profileUser.uid, receiverName: profileUser.displayName }}
                        className="btn-editorial bg-black text-white dark:bg-white dark:text-black flex items-center gap-3"
                      >
                        Message Peer
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <VerificationModal isOpen={isVerifyModalOpen} onClose={() => setIsVerifyModalOpen(false)} />

      {/* Tabs */}
      <div className="flex border-b border-black/10 dark:border-white/10 overflow-x-auto no-scrollbar">
        {[
          { id: 'market', label: isOwnProfile ? 'My Market Items' : 'Market Items' },
          { id: 'nest', label: isOwnProfile ? 'My Nest Listings' : 'Nest Listings' },
          ...(isOwnProfile ? [{ id: 'favorites', label: 'Favorites' }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[200px] px-8 py-6 font-black uppercase tracking-[0.2em] text-xs transition-all border-b-2 ${
              activeTab === tab.id 
                ? 'border-black text-black dark:border-white dark:text-white bg-gray-50 dark:bg-[#0a0a0a]' 
                : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-0 border border-black/10 dark:border-white/10 bg-white dark:bg-black">
        {activeTab === 'market' && (
          marketItems.length === 0 ? <div className="py-32 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">No active items.</div> :
          marketItems.map((item, index) => (
            <div key={item.id} className={`group flex flex-col sm:flex-row items-center gap-8 p-8 ${index !== marketItems.length - 1 ? 'border-b border-black/10 dark:border-white/10' : ''} hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors`}>
              <div className="w-full sm:w-32 h-32 overflow-hidden bg-gray-100 dark:bg-[#0a0a0a] flex-shrink-0 border border-black/10 dark:border-white/10">
                <img src={item.images[0] || ''} alt="" className="w-full h-full object-cover transition-transform duration-700 grayscale" />
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h4 className="font-black text-2xl uppercase tracking-tighter text-black dark:text-white truncate mb-2">{item.title}</h4>
                <p className="text-[#B1A9FF] font-black text-xl tracking-tighter">₦{item.price.toLocaleString()}</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
                  <span className={`px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] border ${item.isSold ? 'border-[#FF5A5F] text-[#FF5A5F]' : 'border-green-500 text-green-500'}`}>
                    {item.isSold ? 'Sold' : 'Active'}
                  </span>
                </div>
              </div>
              <div className="flex sm:flex-col gap-4 w-full sm:w-auto">
                {isOwnProfile ? (
                  <>
                    <button 
                      onClick={() => toggleItemStatus(item.id, 'market_items', item.isSold, 'isSold')} 
                      className="flex-1 sm:flex-none p-4 bg-white dark:bg-black border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all flex items-center justify-center gap-2" 
                    >
                      <CheckmarkCircle01Icon size={20} />
                    </button>
                    <button 
                      onClick={() => deleteItem(item.id, 'market_items')} 
                      className="flex-1 sm:flex-none p-4 bg-white dark:bg-black border border-black/10 dark:border-white/10 text-[#FF5A5F] hover:bg-[#FF5A5F] hover:text-black transition-all flex items-center justify-center gap-2"
                    >
                      <Delete01Icon size={20} />
                    </button>
                  </>
                ) : (
                  <Link to={`/market/${item.id}`} className="btn-editorial">View Item</Link>
                )}
              </div>
            </div>
          ))
        )}

        {activeTab === 'nest' && (
          nestItems.length === 0 ? <div className="py-32 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">No active properties.</div> :
          nestItems.map((item, index) => (
            <div key={item.id} className={`group flex flex-col sm:flex-row items-center gap-8 p-8 ${index !== nestItems.length - 1 ? 'border-b border-black/10 dark:border-white/10' : ''} hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors`}>
              <div className="w-full sm:w-32 h-32 overflow-hidden bg-gray-100 dark:bg-[#0a0a0a] flex-shrink-0 border border-black/10 dark:border-white/10">
                <img src={item.images[0] || ''} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 grayscale" />
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h4 className="font-black text-2xl uppercase tracking-tighter text-black dark:text-white truncate mb-2">{item.title}</h4>
                <p className="text-[#FF5A5F] font-black text-xl tracking-tighter">₦{item.rentPrice.toLocaleString()}</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
                  <span className={`px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] border ${!item.isAvailable ? 'border-[#FF5A5F] text-[#FF5A5F]' : 'border-green-500 text-green-500'}`}>
                    {item.isAvailable ? 'Available' : 'Taken'}
                  </span>
                </div>
              </div>
              <div className="flex sm:flex-col gap-4 w-full sm:w-auto">
                {isOwnProfile ? (
                  <>
                    <button 
                      onClick={() => toggleItemStatus(item.id, 'nest_listings', item.isAvailable, 'isAvailable')} 
                      className="flex-1 sm:flex-none p-4 bg-white dark:bg-black border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all flex items-center justify-center gap-2" 
                    >
                      <CheckmarkCircle01Icon size={20} />
                    </button>
                    <button 
                      onClick={() => deleteItem(item.id, 'nest_listings')} 
                      className="flex-1 sm:flex-none p-4 bg-white dark:bg-black border border-black/10 dark:border-white/10 text-[#FF5A5F] hover:bg-[#FF5A5F] hover:text-black transition-all flex items-center justify-center gap-2"
                    >
                      <Delete01Icon size={20} />
                    </button>
                  </>
                ) : (
                  <Link to={`/nest/${item.id}`} className="btn-editorial">View Space</Link>
                )}
              </div>
            </div>
          ))
        )}

        {activeTab === 'favorites' && isOwnProfile && (
          favorites.length === 0 ? <div className="py-32 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">No favorites yet.</div> :
          favorites.map((fav, index) => (
            <div key={fav.id} className={`group flex flex-col sm:flex-row items-center gap-8 p-8 ${index !== favorites.length - 1 ? 'border-b border-black/10 dark:border-white/10' : ''} hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors`}>
              <div className="w-full sm:w-32 h-32 overflow-hidden bg-gray-100 dark:bg-[#0a0a0a] flex-shrink-0 border border-black/10 dark:border-white/10">
                <img src={fav.itemData.images[0] || ''} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 grayscale" />
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] block mb-2">{fav.itemType}</span>
                <h4 className="font-black text-2xl uppercase tracking-tighter text-black dark:text-white truncate mb-2">{fav.itemData.title}</h4>
                <p className={`${fav.itemType === 'market' ? 'text-[#B1A9FF]' : 'text-[#FF5A5F]'} font-black text-xl tracking-tighter`}>
                  ₦{'price' in fav.itemData ? fav.itemData.price.toLocaleString() : fav.itemData.rentPrice.toLocaleString()}
                </p>
              </div>
              <div className="flex sm:flex-col gap-4 w-full sm:w-auto">
                <Link 
                  to={`/${fav.itemType}/${fav.itemId}`} 
                  className="flex-1 sm:flex-none p-4 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white transition-all flex items-center justify-center text-[10px] font-black uppercase tracking-[0.3em]"
                >
                  View
                </Link>
                <button 
                  onClick={() => deleteItem(fav.id, 'favorites')} 
                  className="flex-1 sm:flex-none p-4 bg-white dark:bg-black border border-black/10 dark:border-white/10 text-[#FF5A5F] hover:bg-[#FF5A5F] hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  <Delete01Icon size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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
                <h3 className="text-3xl font-black uppercase tracking-tighter">Report User</h3>
              </div>

              <form onSubmit={submitReport} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Reason for Report</label>
                  <textarea 
                    required
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    placeholder="DESCRIBE WHY THIS USER VIOLATES CAMPUS POLICY..."
                    rows={4}
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 outline-none text-black dark:text-white font-bold uppercase tracking-widest text-xs resize-none focus:border-black dark:focus:border-white transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isReporting || !reportReason.trim()}
                  className="w-full py-5 bg-[#FF5A5F] text-black border border-black font-black uppercase tracking-widest text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all hover:-translate-y-1"
                >
                  {isReporting ? 'SUBMITTING...' : 'FLAG ACCOUNT'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <VerificationModal isOpen={isVerifyModalOpen} onClose={() => setIsVerifyModalOpen(false)} />
    </div>
  );
};
