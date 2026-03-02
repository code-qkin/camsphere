import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  deleteUser, 
  signOut 
} from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { ArrowLeft01Icon, Mail01Icon } from 'hugeicons-react';
import { mapAuthErrorToMessage } from '../utils/errorMapping';
import type { University } from '../types';

export const AdminSignup = () => {
  const { createUserProfile, dbUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerifyNotice, setShowVerifyNotice] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'universities'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setUniversities(snap.docs.map(d => ({ id: d.id, ...d.data() } as University)));
    });
    return () => unsub();
  }, []);

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!university) {
      setError('PLEASE SELECT A UNIVERSITY.');
      return;
    }

    if (password !== confirmPassword) {
      setError('PASSWORDS DO NOT MATCH.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      try {
        // Attempt Firestore Creation
        await createUserProfile(user, { 
          role: 'pending_admin',
          university: university 
        });

        // Attempt Email Verification
        await sendEmailVerification(user);

        // Force sign out until verified
        await signOut(auth);
        setShowVerifyNotice(true);
      } catch (firestoreErr) {
        // Rollback orphaned user
        await deleteUser(user);
        throw firestoreErr;
      }
    } catch (err: any) {
      setError(mapAuthErrorToMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  if (showVerifyNotice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full border border-black dark:border-white p-12 lg:p-16 text-center shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)]"
        >
          <div className="w-20 h-20 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black mx-auto mb-10">
            <Mail01Icon size={40} />
          </div>
          <h2 className="text-4xl font-black tracking-tighter uppercase mb-6 leading-none text-black dark:text-white">Verify Admin Email</h2>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 leading-relaxed mb-10">
            A VERIFICATION LINK HAS BEEN SENT TO <span className="text-black dark:text-white font-black">{email}</span>. YOU MUST VERIFY YOUR EMAIL BEFORE STAFF APPROVAL CAN PROCEED. <span className="text-[#FF5A5F] block mt-4">CHECK YOUR RECENT EMAILS AND SPAM FOLDER.</span>
          </p>
          <button 
            onClick={() => navigate('/auth')}
            className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-sm border border-black dark:border-white transition-all hover:bg-gray-900 dark:hover:bg-gray-100"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  if (dbUser?.role === 'pending_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-6">
        <div className="max-w-md w-full border border-black dark:border-white p-12 text-center shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)]">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#B1A9FF] mb-8 block">Status // Pending</span>
          <h2 className="text-4xl font-black tracking-tighter uppercase leading-[0.9] mb-8 text-black dark:text-white">Awaiting Approval</h2>
          <p className="text-sm font-bold uppercase tracking-widest text-gray-500 border-l border-black/10 dark:border-white/10 pl-6 py-2 text-left">
            Your admin request for <span className="text-black dark:text-white font-black">{dbUser.university}</span> has been submitted. A senior staff member must approve your access before you can enter the dashboard.
          </p>
          <button 
            onClick={() => auth.signOut()}
            className="w-full py-5 mt-12 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-sm border border-black dark:border-white transition-all hover:bg-gray-900 dark:hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-6 relative">
      <button 
        onClick={() => navigate('/')}
        className="absolute top-12 left-12 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-colors group"
      >
        <ArrowLeft01Icon size={18} className="group-hover:-translate-x-1 transition-transform" /> Dashboard
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full border border-black dark:border-white p-12 lg:p-16 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)]"
      >
        <div className="mb-12 border-l-4 border-[#FF5A5F] pl-6">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 mb-4 block">Staff // Enrollment</span>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase text-black dark:text-white leading-[0.9]">
            Admin Signup
          </h2>
        </div>

        {error && (
          <div className="mb-8 p-4 text-[10px] font-black uppercase tracking-widest text-[#FF5A5F] border border-[#FF5A5F] bg-white dark:bg-black">
            {error}
          </div>
        )}

        <form onSubmit={handleAdminSignup} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Professional Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              className="w-full px-0 py-4 bg-transparent border-b-2 border-black/10 dark:border-white/10 text-black dark:text-white focus:border-black dark:focus:border-white outline-none transition-all font-bold uppercase tracking-widest text-sm placeholder:text-gray-300 dark:placeholder:text-gray-700"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Assign University</label>
            <select
              required
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="w-full px-0 py-4 bg-transparent border-b-2 border-black/10 dark:border-white/10 text-black dark:text-white focus:border-black dark:focus:border-white outline-none transition-all font-bold uppercase tracking-widest text-sm"
            >
              <option value="" disabled className="bg-white dark:bg-black">Select Campus</option>
              {universities.map((uni) => (
                <option key={uni.id} value={uni.name} className="bg-white dark:bg-black">
                  {uni.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Secure Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PASSWORD"
              className="w-full px-0 py-4 bg-transparent border-b-2 border-black/10 dark:border-white/10 text-black dark:text-white focus:border-black dark:focus:border-white outline-none transition-all font-bold uppercase tracking-widest text-sm placeholder:text-gray-300 dark:placeholder:text-gray-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="RE-ENTER PASSWORD"
              className="w-full px-0 py-4 bg-transparent border-b-2 border-black/10 dark:border-white/10 text-black dark:text-white focus:border-black dark:focus:border-white outline-none transition-all font-bold uppercase tracking-widest text-sm placeholder:text-gray-300 dark:placeholder:text-gray-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading || universities.length === 0}
            className="w-full py-6 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-sm transition-all border border-black disabled:opacity-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:bg-gray-900 dark:hover:bg-gray-100"
          >
            {loading ? 'PROCESSING...' : 'REQUEST ADMIN ACCESS'}
          </button>
          
          {universities.length === 0 && (
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
              No universities registered in network //
            </p>
          )}
        </form>
      </motion.div>
    </div>
  );
};
