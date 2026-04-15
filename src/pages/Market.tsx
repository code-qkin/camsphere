import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { ShoppingBag01Icon, ArrowLeft01Icon } from 'hugeicons-react';

export const Market = () => {
  const navigate = useNavigate();
  const { dbUser } = useAuth();
  
  return (
    <div className="py-12 max-w-[1400px] mx-auto min-h-[80vh] flex flex-col justify-center relative">
      <div className="space-y-8 mb-12">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-all group z-20 relative"
        >
          <ArrowLeft01Icon size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>

        <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-10 border-b border-black/10 dark:border-white/10 pb-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-4 md:mb-6 block border-l-2 border-[#B1A9FF] pl-4">
              Marketplace //
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-[5rem] font-black tracking-tighter uppercase leading-[0.9] text-black dark:text-white">
              Market
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center py-20 border border-black/10 dark:border-white/10 bg-gray-50/50 dark:bg-[#0a0a0a]/50 backdrop-blur-sm relative overflow-hidden group">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-5">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] border border-black dark:border-white rotate-45" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] border border-black dark:border-white rotate-45" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-px bg-black dark:bg-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-px bg-black dark:bg-white" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="w-32 h-32 flex items-center justify-center mx-auto text-black dark:text-white mb-12 border-2 border-black dark:border-white relative group-hover:bg-[#B1A9FF] group-hover:text-black transition-all duration-500">
            <ShoppingBag01Icon size={48} className="relative z-10" />
            <div className="absolute inset-0 bg-[#B1A9FF] translate-x-3 translate-y-3 -z-10 border-2 border-black dark:border-white group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500" />
          </div>

          <h3 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-black dark:text-white mb-6">
            Coming <span className="text-[#B1A9FF]">Soon</span>
          </h3>
          
          <div className="flex flex-col items-center gap-8">
            <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px] sm:text-xs max-w-lg mx-auto leading-relaxed border-t border-black/10 dark:border-white/10 pt-8">
              We're calibrating the campus economy. The peer-to-peer marketplace for {dbUser?.university} is currently under maintenance and will return with enhanced security and new features.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              {['Smart Escrow', 'Student Verification', 'Zero Fees', 'Instant Chat'].map((feat, i) => (
                <span key={i} className="px-4 py-2 border border-black/10 dark:border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400">
                  {feat} //
                </span>
              ))}
            </div>

            <button 
              onClick={() => navigate('/')}
              className="mt-8 px-12 py-4 bg-black text-white dark:bg-white dark:text-black font-black uppercase tracking-[0.4em] text-[10px] hover:bg-[#B1A9FF] hover:text-black transition-all border-2 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(177,169,255,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
            >
              Return to Safety
            </button>
          </div>
        </motion.div>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 border border-dashed border-black/10 dark:border-white/10 flex items-center justify-center opacity-30 grayscale">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Restoring Data Strip // 00{i}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
