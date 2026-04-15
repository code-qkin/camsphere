import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ArrowLeft01Icon } from 'hugeicons-react';

export const LifestyleQuiz = () => {
  const { user, refreshDbUser, dbUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Quiz State
  const [sleepSchedule, setSleepSchedule] = useState<'early' | 'night'>(dbUser?.lifestyleQuiz?.sleepSchedule || 'early');
  const [cleanliness, setCleanliness] = useState<number>(dbUser?.lifestyleQuiz?.cleanliness || 3);
  const [guests, setGuests] = useState<'never' | 'occasional' | 'frequent'>(dbUser?.lifestyleQuiz?.guests || 'occasional');
  const [studyHabit, setStudyHabit] = useState<'quiet' | 'background'>(dbUser?.lifestyleQuiz?.studyHabit || 'quiet');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        lifestyleQuiz: {
          sleepSchedule,
          cleanliness,
          guests,
          studyHabit
        }
      });
      await refreshDbUser();
      navigate('/nest?tab=roommate');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black p-6 sm:p-12 lg:p-24">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-colors mb-16"
      >
        <ArrowLeft01Icon size={18} /> Cancel Quiz
      </button>

      <div className="max-w-3xl">
        <div className="mb-16 border-l-4 border-[#B1A9FF] pl-8">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 mb-4 block">Roommate // Compatibility</span>
          <h2 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase text-black dark:text-white leading-[0.9]">
            Lifestyle<br />Profile.
          </h2>
          <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mt-8 max-w-md leading-relaxed">
            Your preferences will be used to calculate compatibility with potential roommates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-16">
          {/* Sleep Schedule */}
          <div className="space-y-8">
            <label className="text-xs font-black text-black dark:text-white uppercase tracking-[0.4em]">01 // Sleep Schedule</label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'early', label: 'Early Bird', sub: 'Up before dawn' },
                { id: 'night', label: 'Night Owl', sub: 'Active late night' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSleepSchedule(opt.id as any)}
                  className={`p-8 border text-left transition-all ${sleepSchedule === opt.id ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(177,169,255,1)]' : 'border-black/10 dark:border-white/10 hover:border-black dark:hover:border-white'}`}
                >
                  <p className="font-black uppercase tracking-widest mb-1">{opt.label}</p>
                  <p className="text-[10px] opacity-50 uppercase font-bold">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cleanliness */}
          <div className="space-y-8">
            <label className="text-xs font-black text-black dark:text-white uppercase tracking-[0.4em]">02 // Cleanliness Level (1-5)</label>
            <div className="flex justify-between items-center gap-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCleanliness(num)}
                  className={`flex-1 py-6 border font-black transition-all ${cleanliness === num ? 'bg-[#B1A9FF] text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'border-black/10 dark:border-white/10 hover:border-black'}`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest">
              <span>Relaxed</span>
              <span>Obsessive</span>
            </div>
          </div>

          {/* Guests */}
          <div className="space-y-8">
            <label className="text-xs font-black text-black dark:text-white uppercase tracking-[0.4em]">03 // Guest Preference</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'never', label: 'No Guests' },
                { id: 'occasional', label: 'Occasional' },
                { id: 'frequent', label: 'Frequent' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGuests(opt.id as any)}
                  className={`p-6 border text-center transition-all ${guests === opt.id ? 'bg-black text-white dark:bg-white dark:text-black border-black shadow-[8px_8px_0px_0px_rgba(177,169,255,1)]' : 'border-black/10 dark:border-white/10 hover:border-black'}`}
                >
                  <p className="font-black uppercase tracking-widest text-[10px]">{opt.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Study Habit */}
          <div className="space-y-8">
            <label className="text-xs font-black text-black dark:text-white uppercase tracking-[0.4em]">04 // Environment</label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'quiet', label: 'Pin Drop Silence', sub: 'Absolute quiet' },
                { id: 'background', label: 'Ambient Noise', sub: 'Music/TV allowed' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStudyHabit(opt.id as any)}
                  className={`p-8 border text-left transition-all ${studyHabit === opt.id ? 'bg-black text-white dark:bg-white dark:text-black border-black shadow-[8px_8px_0px_0px_rgba(177,169,255,1)]' : 'border-black/10 dark:border-white/10 hover:border-black'}`}
                >
                  <p className="font-black uppercase tracking-widest mb-1">{opt.label}</p>
                  <p className="text-[10px] opacity-50 uppercase font-bold">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-8 bg-[#B1A9FF] text-black font-black uppercase tracking-[0.3em] text-sm border-2 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
          >
            {loading ? 'CALIBRATING...' : 'SAVE PROFILE & CALCULATE MATCHES'}
          </button>
        </form>
      </div>
    </div>
  );
};
