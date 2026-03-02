import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Store01Icon, 
  Home03Icon, 
  Shield01Icon, 
  ArrowRight01Icon
} from 'hugeicons-react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun01Icon, Moon02Icon } from 'hugeicons-react';

export const Landing = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-500 overflow-x-hidden relative text-black dark:text-white font-sans">
      
      {/* Landing Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-black/10 dark:border-white/10 transition-colors duration-300">
        <div className="w-full mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-black text-xl">
              C
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">
              CamSphere
            </span>
          </div>

          <div className="flex items-center gap-6 sm:gap-10">
            <button
              onClick={toggleTheme}
              className="hover:opacity-50 transition-opacity"
            >
              {theme === 'dark' ? <Sun01Icon size={20} /> : <Moon02Icon size={20} />}
            </button>
            <Link 
              to="/auth" 
              className="hidden sm:block text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-50 transition-opacity"
            >
              Log in
            </Link>
            <Link 
              to="/auth" 
              className="btn-editorial bg-black text-white dark:bg-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white"
            >
              Join Network
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Full Bleed */}
      <section className="relative min-h-screen flex items-center border-b border-black/10 dark:border-white/10 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000" 
            alt="Architecture" 
            className="w-full h-full object-cover grayscale opacity-20 dark:opacity-30" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-black dark:via-black/80 dark:to-transparent" />
        </div>

        <div className="w-full px-6 lg:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-8 flex flex-col justify-center"
          >
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.5em] mb-6 lg:mb-8 text-[#B1A9FF] border-l-4 border-[#B1A9FF] pl-6">
              Establish // 2026
            </span>
            <h1 className="text-5xl sm:text-7xl md:text-[8rem] lg:text-[10rem] font-black tracking-tighter uppercase leading-[0.85] mb-8 lg:mb-12">
              Your Campus.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-black via-gray-500 to-transparent dark:from-white dark:via-gray-400 dark:to-transparent">Unified.</span>
            </h1>
            <div className="max-w-2xl">
              <p className="text-lg md:text-2xl font-medium mb-10 lg:mb-12 leading-tight text-gray-600 dark:text-gray-400 border-l border-black/10 dark:border-white/10 pl-6 lg:pl-8 py-2">
                The ultimate super-app for university life. Buy, sell, and find your next space in one seamless network. <strong className="text-black dark:text-white">Exclusively for Students.</strong>
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6">
                <Link 
                  to="/auth" 
                  className="w-full sm:w-auto btn-editorial-primary text-center flex items-center justify-center gap-4 text-sm md:text-base py-4 lg:py-5 px-8 lg:px-12"
                >
                  Get Started <ArrowRight01Icon size={20} />
                </Link>
                <button className="w-full sm:w-auto btn-editorial text-center text-sm md:text-base py-4 lg:py-5 px-8 lg:px-12">
                  View Manifesto
                </button>
              </div>
            </div>
          </motion.div>
          
          <div className="lg:col-span-4 hidden lg:flex flex-col justify-end pb-24 items-end text-right">
             <div className="space-y-8">
                <div className="border-r-4 border-[#FF5A5F] pr-6">
                   <p className="text-4xl font-black tracking-tighter uppercase leading-none">24/7</p>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">Active Student Network</p>
                </div>
                <div className="border-r-4 border-[#B1A9FF] pr-6">
                   <p className="text-4xl font-black tracking-tighter uppercase leading-none">100%</p>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">Verified University Data</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Feature Split - Full Width */}
      <section className="flex flex-col lg:flex-row border-b border-black/10 dark:border-white/10 h-auto lg:h-[800px]">
        {/* Left Split: The Market */}
        <div className="flex-1 border-b lg:border-b-0 lg:border-r border-black/10 dark:border-white/10 relative group overflow-hidden flex flex-col">
          <div className="absolute inset-0 z-0 bg-gray-100 dark:bg-[#0a0a0a]">
            <img 
              src="https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=1200" 
              alt="Market" 
              className="w-full h-full object-cover transition-all duration-1000 grayscale opacity-40 group-hover:scale-105 group-hover:opacity-20" 
            />
          </div>
          <div className="relative z-10 p-12 lg:p-20 flex-1 flex flex-col justify-between">
            <div>
              <div className="w-16 h-16 bg-[#B1A9FF] flex items-center justify-center text-black border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-12">
                <Store01Icon size={32} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-4 block">Section 01 // Commerce</span>
              <h2 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-8">The Market</h2>
              <p className="max-w-md text-lg font-medium text-gray-600 dark:text-gray-400 border-l border-black/20 dark:border-white/20 pl-6 py-2">
                Curated student trading. From hardware to high-end services. Fast, local, secure.
              </p>
            </div>
            <div className="mt-12">
              <Link to="/auth" className="btn-editorial bg-black text-white dark:bg-white dark:text-black">Enter Marketplace</Link>
            </div>
          </div>
        </div>

        {/* Right Split: The Nest */}
        <div className="flex-1 relative group overflow-hidden flex flex-col">
          <div className="absolute inset-0 z-0 bg-gray-100 dark:bg-[#0a0a0a]">
            <img 
              src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1200" 
              alt="Nest" 
              className="w-full h-full object-cover transition-all duration-1000 grayscale opacity-40 group-hover:scale-105 group-hover:opacity-20" 
            />
          </div>
          <div className="relative z-10 p-12 lg:p-20 flex-1 flex flex-col justify-between">
            <div>
              <div className="w-16 h-16 bg-[#FF5A5F] flex items-center justify-center text-black border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-12">
                <Home03Icon size={32} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-4 block">Section 02 // Housing</span>
              <h2 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-8">The Nest</h2>
              <p className="max-w-md text-lg font-medium text-gray-600 dark:text-gray-400 border-l border-black/20 dark:border-white/20 pl-6 py-2">
                Find your architectural sanctuary. Verified student lodges and roommate matching.
              </p>
            </div>
            <div className="mt-12">
              <Link to="/auth" className="btn-editorial bg-black text-white dark:bg-white dark:text-black">Explore Housing</Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Us - Section 03 */}
      <section className="py-24 lg:py-48 px-6 lg:px-12 border-b border-black/10 dark:border-white/10 bg-white dark:bg-black">
        <div className="w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
          <div className="lg:col-span-5">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#B1A9FF] mb-6 lg:mb-8 block">Section 03 // The Collective</span>
            <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.85] mb-8 lg:mb-12">
              Beyond the<br />Standard.
            </h2>
          </div>
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-xl sm:text-2xl md:text-3xl font-medium leading-tight text-black dark:text-white mb-10 lg:mb-12 border-l-4 border-black dark:border-white pl-6 lg:pl-10 py-4">
              CamSphere isn't just an app; it's a digital ecosystem engineered for the modern student. We've removed the noise of public marketplaces to create a curated, high-trust environment where the academic community thrives.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mt-8 lg:mt-12">
               <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-4 text-[#FF5A5F]">Our Mission</h4>
                  <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed">
                    To unify the fragmented student experience into a single, cohesive interface that prioritizes safety, speed, and aesthetic excellence.
                  </p>
               </div>
               <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-4 text-[#B1A9FF]">The Vision</h4>
                  <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed">
                    Defining the future of campus commerce and residential discovery through data-driven matching and verified networks.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Section 04 */}
      <section className="py-24 lg:py-48 px-6 lg:px-12 border-b border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="w-full mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 lg:mb-24 gap-8">
            <div className="max-w-2xl">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 mb-6 block">Section 04 // Strategy</span>
              <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.85]">
                The Seamless<br />Process.
              </h2>
            </div>
            <div className="lg:pb-4 text-left lg:text-right">
               <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">How CamSphere Operates //</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-black/10 dark:border-white/10">
            {[
              { num: "01", title: "Verify Authenticity", desc: "Gain access through your university credentials. A closed-loop system ensuring 100% student density." },
              { num: "02", title: "Curate Listings", desc: "Browse a refined feed of goods, services, and lodges tailored specifically to your campus geography." },
              { num: "03", title: "Execute Connection", desc: "Direct real-time messaging with integrated item tagging for frictionless transactions and agreements." }
            ].map((step, i) => (
              <div key={i} className={`p-8 lg:p-16 border-b md:border-b-0 ${i !== 2 ? 'md:border-r' : ''} border-black/10 dark:border-white/10 group hover:bg-white dark:hover:bg-black transition-colors duration-500`}>
                <span className="text-6xl lg:text-9xl font-black text-black/5 dark:text-white/5 block mb-8 lg:mb-12 group-hover:text-[#B1A9FF] transition-colors duration-500 leading-none">{step.num}</span>
                <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tighter mb-4 lg:mb-6 group-hover:text-black dark:group-hover:text-white transition-colors">{step.title}</h3>
                <p className="text-sm lg:text-base text-gray-500 font-medium leading-relaxed border-l-2 border-transparent group-hover:border-[#FF5A5F] pl-6 transition-all">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto - Section 05 */}
      <section className="py-24 lg:py-64 px-6 lg:px-12 border-b border-black/10 dark:border-white/10 bg-white dark:bg-black overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none flex items-center justify-center">
           <span className="text-[10rem] lg:text-[20rem] font-black uppercase tracking-tighter text-black/5 dark:text-white/5 rotate-12">MANIFESTO</span>
        </div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF5A5F] mb-8 lg:mb-12 block">Section 05 // Philosophy</span>
          <h2 className="text-2xl sm:text-4xl md:text-6xl lg:text-[6rem] font-black uppercase tracking-tighter leading-[0.9] mb-12 lg:mb-16">
            We are redefining the architectural landscape of student life. No more fragmentation. No more noise. Just pure, unadulterated focus.
          </h2>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-8 lg:gap-12 pt-12 border-t border-black/10 dark:border-white/10">
             <div className="text-center">
                <p className="text-3xl lg:text-4xl font-black tracking-tighter">15K+</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">Active Students</p>
             </div>
             <div className="text-center">
                <p className="text-3xl lg:text-4xl font-black tracking-tighter">50+</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">Verified Campuses</p>
             </div>
             <div className="text-center">
                <p className="text-3xl lg:text-4xl font-black tracking-tighter">₦200M+</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">Volume Traded</p>
             </div>
          </div>
        </div>
      </section>

      {/* Trust Quote Section */}
      <section className="py-24 lg:py-48 px-6 lg:px-12 bg-black text-white text-center border-b border-white/10">
         <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           whileInView={{ opacity: 1, scale: 1 }}
           className="max-w-5xl mx-auto"
         >
            <Shield01Icon size={40} className="mx-auto mb-8 lg:mb-12 text-[#FF5A5F]" />
            <h2 className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-8 lg:mb-12 px-4">
              "No strangers. Just students. A closed-loop network built on absolute trust."
            </h2>
            <div className="flex justify-center gap-3 lg:gap-4">
               {[1,2,3,4,5].map(i => (
                 <div key={i} className="w-10 h-10 lg:w-12 lg:h-12 border border-white/20 overflow-hidden grayscale">
                    <img src={`https://ui-avatars.com/api/?name=U${i}&bg=fff&color=000&rounded=false`} alt="" />
                 </div>
               ))}
            </div>
         </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 lg:px-12 bg-white dark:bg-black border-t border-black/10 dark:border-white/10">
        <div className="w-full mx-auto flex flex-col md:flex-row justify-between items-start gap-16">
          <div className="max-w-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-black text-2xl">
                C
              </div>
              <span className="text-2xl font-black tracking-tighter uppercase">
                CamSphere
              </span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 leading-relaxed border-l-2 border-black dark:border-white pl-6 py-2">
              Elevating the student experience through seamless connection, commerce, and community. 2026 Global Trend Forecast.
            </p>
          </div>
          <div className="flex flex-wrap gap-16 md:gap-32">
            <div className="space-y-8">
              <h4 className="font-black uppercase tracking-[0.4em] text-[10px] text-gray-400 border-b border-black/10 dark:border-white/10 pb-4">Network</h4>
              <div className="flex flex-col gap-4 text-xs font-black uppercase tracking-widest">
                <Link to="/auth" className="hover:text-[#B1A9FF] transition-colors">Marketplace</Link>
                <Link to="/auth" className="hover:text-[#B1A9FF] transition-colors">Housing Nest</Link>
                <Link to="/auth" className="hover:text-[#B1A9FF] transition-colors">Student Chat</Link>
              </div>
            </div>
            <div className="space-y-8">
              <h4 className="font-black uppercase tracking-[0.4em] text-[10px] text-gray-400 border-b border-black/10 dark:border-white/10 pb-4">Legal</h4>
              <div className="flex flex-col gap-4 text-xs font-black uppercase tracking-widest">
                <button className="hover:text-[#B1A9FF] transition-colors text-left">Privacy Policy</button>
                <button className="hover:text-[#B1A9FF] transition-colors text-left">Terms of Service</button>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full mx-auto mt-24 pt-8 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">
            © 2026 CamSphere Global.
          </p>
          <div className="flex gap-10">
             <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">Instagram</span>
             <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">LinkedIn</span>
          </div>
        </div>
      </footer>
    </div>
  );
};