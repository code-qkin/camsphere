import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  sendEmailVerification, 
  sendPasswordResetEmail,
  deleteUser,
  signOut
} from 'firebase/auth';
import { auth, db, googleProvider } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft01Icon, Cancel01Icon, Mail01Icon } from 'hugeicons-react';
import { mapAuthErrorToMessage } from '../utils/errorMapping';

type AuthView = 'auth' | 'forgot' | 'verify-notice';

export const Auth = () => {
  const { createUserProfile } = useAuth();
  const [view, setView] = useState<AuthView>('auth');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Login Gate: Email Verification Check
        if (!user.emailVerified) {
          await signOut(auth);
          throw { code: 'auth/email-not-verified' };
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        let userData = userDoc.data() as User;
        
        // If account exists in Auth but Firestore was wiped, recreate profile
        if (!userDoc.exists()) {
          userData = await createUserProfile(user);
        }
        
        if (userData?.role === 'admin' || userData?.role === 'lead_admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (!userData?.university) {
          navigate('/onboarding');
        } else {
          navigate('/');
        }
      } else {
        // Signup Validation
        if (password !== confirmPassword) {
          throw { code: 'auth/passwords-do-not-match' };
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        try {
          // Attempt Firestore Creation
          await createUserProfile(user);
          
          // Attempt Email Verification
          await sendEmailVerification(user);
          
          // Force sign out until verified
          await signOut(auth);
          setView('verify-notice');
        } catch (firestoreErr) {
          // Rollback orphaned user
          await deleteUser(user);
          throw firestoreErr;
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/email-not-verified') {
        setError('PLEASE VERIFY YOUR EMAIL ADDRESS BEFORE LOGGING IN.');
      } else if (err.code === 'auth/passwords-do-not-match') {
        setError('PASSWORDS DO NOT MATCH.');
      } else {
        setError(mapAuthErrorToMessage(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('PASSWORD RESET LINK SENT. CHECK YOUR INBOX.');
      setTimeout(() => {
        setSuccess('');
        setView('auth');
      }, 3000);
    } catch (err: any) {
      setError(mapAuthErrorToMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await signInWithPopup(auth, googleProvider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!userDoc.exists()) {
        await createUserProfile(result.user);
        navigate('/onboarding');
      } else {
        const userData = userDoc.data() as User;
        if (userData.role === 'admin' || userData.role === 'lead_admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (!userData.university) {
          navigate('/onboarding');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(mapAuthErrorToMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  if (view === 'verify-notice') {
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
          <h2 className="text-4xl font-black tracking-tighter uppercase mb-6 leading-none text-black dark:text-white">Check Your Inbox</h2>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 leading-relaxed mb-10">
            WE HAVE SENT A VERIFICATION LINK TO <span className="text-black dark:text-white font-black">{email}</span>. YOU MUST VERIFY YOUR EMAIL TO JOIN THE NETWORK. <span className="text-[#FF5A5F] block mt-4">CHECK YOUR RECENT EMAILS AND SPAM FOLDER.</span>
          </p>
          <button 
            onClick={() => {
              setIsLogin(true);
              setView('auth');
            }}
            className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-sm border border-black dark:border-white transition-all hover:bg-gray-900 dark:hover:bg-gray-100"
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-black transition-colors duration-500 overflow-hidden">
      
      {/* Left: Branding/Imagery (Editorial Side) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-100 dark:bg-[#0a0a0a] border-r border-black/10 dark:border-white/10 items-center justify-center overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1200" 
          alt="Students" 
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-40" 
        />
        <div className="relative z-10 p-20 text-center">
           <div className="w-24 h-24 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-black text-5xl mb-12 mx-auto">
             C
           </div>
           <h1 className="text-6xl font-black tracking-tighter uppercase text-black dark:text-white leading-[0.9] mb-8 text-black dark:text-white">
             University<br />Network
           </h1>
           <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-500 max-w-xs mx-auto leading-relaxed border-t border-black/20 dark:border-white/20 pt-8">
             Curated commerce and housing for the academic elite. 2026 Forecast.
           </p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex flex-col p-6 lg:p-24 bg-white dark:bg-black overflow-y-auto no-scrollbar relative">
        <button 
          onClick={() => view === 'forgot' ? setView('auth') : navigate('/')}
          className="absolute top-8 left-8 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-colors group"
        >
          <ArrowLeft01Icon size={18} className="group-hover:-translate-x-1 transition-transform" /> Back
        </button>

        <motion.div 
          key={view}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md m-auto"
        >
          <div className="lg:hidden text-center mb-12">
            <div className="w-16 h-16 bg-black dark:bg-white mx-auto flex items-center justify-center text-white dark:text-black font-black text-3xl border border-black dark:border-white">
              C
            </div>
          </div>

          <div className="mb-12 border-l-4 border-[#B1A9FF] pl-6">
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase text-black dark:text-white leading-[0.9]">
              {view === 'forgot' ? 'Reset // Key' : (isLogin ? 'Access // Account' : 'Join // Network')}
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-4">
              {view === 'forgot' ? 'Enter email to receive reset link.' : 'Enter your credentials to continue.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-10 p-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#FF5A5F] border border-[#FF5A5F] bg-[#FF5A5F]/5 flex items-center justify-between"
              >
                <span>{error}</span>
                <button onClick={() => setError('')} className="p-1 hover:bg-[#FF5A5F]/10 transition-colors">
                  <Cancel01Icon size={14} />
                </button>
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-10 p-5 text-[10px] font-black uppercase tracking-[0.2em] text-green-500 border border-green-500 bg-green-500/5 flex items-center justify-between"
              >
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {view === 'auth' ? (
            <form onSubmit={handleAuth} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">01 // Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="UNIVERSITY EMAIL"
                  className="w-full px-0 py-4 bg-transparent border-b-2 border-black/10 dark:border-white/10 text-black dark:text-white focus:border-black dark:focus:border-white outline-none transition-all font-bold uppercase tracking-widest text-sm placeholder:text-gray-300 dark:placeholder:text-gray-700"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">02 // Secure Password</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="PASSWORD"
                  className="w-full px-0 py-4 bg-transparent border-b-2 border-black/10 dark:border-white/10 text-black dark:text-white focus:border-black dark:focus:border-white outline-none transition-all font-bold uppercase tracking-widest text-sm placeholder:text-gray-300 dark:placeholder:text-gray-700"
                />
              </div>

              {!isLogin && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">03 // Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="RE-ENTER PASSWORD"
                    className="w-full px-0 py-4 bg-transparent border-b-2 border-black/10 dark:border-white/10 text-black dark:text-white focus:border-black dark:focus:border-white outline-none transition-all font-bold uppercase tracking-widest text-sm placeholder:text-gray-300 dark:placeholder:text-gray-700"
                  />
                </div>
              )}
              
              <div className="pt-6">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-sm hover:bg-gray-900 dark:hover:bg-gray-100 transition-all border border-black dark:border-white disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                </motion.button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">01 // Recovery Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ENTER REGISTERED EMAIL"
                  className="w-full px-0 py-4 bg-transparent border-b-2 border-black/10 dark:border-white/10 text-black dark:text-white focus:border-black dark:focus:border-white outline-none transition-all font-bold uppercase tracking-widest text-sm placeholder:text-gray-300 dark:placeholder:text-gray-700"
                />
              </div>
              <div className="pt-6">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-sm hover:bg-gray-900 dark:hover:bg-gray-100 transition-all border border-black dark:border-white disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Send Reset Link'}
                </motion.button>
              </div>
            </form>
          )}

          {view === 'auth' && (
            <>
              <div className="mt-12 flex items-center gap-6">
                <div className="h-[1px] flex-1 bg-black/10 dark:bg-white/10" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Third-Party</span>
                <div className="h-[1px] flex-1 bg-black/10 dark:bg-white/10" />
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full mt-10 py-5 bg-white dark:bg-black text-black dark:text-white font-black uppercase tracking-widest text-xs border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white transition-all flex items-center justify-center gap-4 group"
              >
                <svg className="w-5 h-5 group-hover:grayscale-0 grayscale transition-all" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </motion.button>

              <p className="mt-16 text-center text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <button 
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-black dark:text-white font-black hover:opacity-50 transition-opacity ml-2 border-b-2 border-[#B1A9FF] pb-0.5"
                >
                  {isLogin ? 'Join Network' : 'Access Account'}
                </button>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};
