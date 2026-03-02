import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cancel01Icon, CheckmarkCircle01Icon, Alert01Icon, InformationCircleIcon } from 'hugeicons-react';

type AlertType = 'info' | 'success' | 'warning' | 'confirm' | 'prompt';

interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeAlert, setActiveAlert] = useState<AlertOptions | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const showAlert = (options: AlertOptions) => {
    setActiveAlert({ ...options, type: options.type || 'info' });
    setPromptValue('');
  };

  const closeAlert = () => {
    setActiveAlert(null);
  };

  const handleConfirm = () => {
    if (activeAlert?.onConfirm) {
      activeAlert.onConfirm(activeAlert.type === 'prompt' ? promptValue : undefined);
    }
    closeAlert();
  };

  const handleCancel = () => {
    if (activeAlert?.onCancel) {
      activeAlert.onCancel();
    }
    closeAlert();
  };

  const getIcon = (type?: AlertType) => {
    switch (type) {
      case 'success': return <CheckmarkCircle01Icon className="text-green-500" size={32} />;
      case 'warning': return <Alert01Icon className="text-[#FF5A5F]" size={32} />;
      case 'confirm': return <InformationCircleIcon className="text-[#B1A9FF]" size={32} />;
      case 'prompt': return <InformationCircleIcon className="text-[#B1A9FF]" size={32} />;
      default: return <InformationCircleIcon className="text-gray-400" size={32} />;
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AnimatePresence>
        {activeAlert && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-black border border-black dark:border-white p-8 sm:p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)]"
            >
              <button 
                onClick={handleCancel}
                className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <Cancel01Icon size={24} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="mb-6">
                  {getIcon(activeAlert.type)}
                </div>
                
                {activeAlert.title && (
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 leading-none">
                    {activeAlert.title}
                  </h3>
                )}
                
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500 leading-relaxed mb-8">
                  {activeAlert.message}
                </p>

                {activeAlert.type === 'prompt' && (
                  <input 
                    autoFocus
                    type="text"
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    placeholder={activeAlert.placeholder || "TYPE HERE //"}
                    className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 px-6 py-4 outline-none font-black uppercase tracking-widest text-xs mb-8 focus:border-black dark:focus:border-white transition-colors"
                  />
                )}

                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  {(activeAlert.type === 'confirm' || activeAlert.type === 'prompt') && (
                    <button 
                      onClick={handleCancel}
                      className="flex-1 px-8 py-4 border border-black dark:border-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-gray-100 dark:hover:bg-white/5 transition-all order-2 sm:order-1"
                    >
                      {activeAlert.cancelText || 'Cancel'}
                    </button>
                  )}
                  <button 
                    onClick={handleConfirm}
                    className={`flex-1 px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.3em] text-[10px] border border-black dark:border-white transition-all order-1 sm:order-2 ${activeAlert.type === 'warning' ? 'bg-[#FF5A5F] text-black border-black' : ''}`}
                  >
                    {activeAlert.confirmText || (activeAlert.type === 'confirm' || activeAlert.type === 'prompt' ? 'Proceed' : 'Dismiss')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within an AlertProvider');
  return context;
};
