import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Chat as ChatType, Message, TaggedItem } from '../types';
import { ArrowLeft01Icon, Cancel01Icon, Image01Icon, Shield01Icon } from 'hugeicons-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadToCloudinary } from '../services/cloudinary';
import { useAlert } from '../contexts/AlertContext';

const Send01Icon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"/>
  </svg>
);

const QUICK_ACTIONS = [
  "Is this still available?",
  "Where can we meet?",
  "Can I see more photos?",
  "What is your last price?",
  "Is it in good condition?",
  "I'm interested, let's talk."
];

export const Chat = () => {
  const { id: chatIdParams } = useParams<{ id: string }>();
  const { user, dbUser } = useAuth();
  const { showAlert } = useAlert();
  const location = useLocation();
  const navigate = useNavigate();

  const [chats, setChats] = useState<ChatType[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [taggedItem, setTaggedItem] = useState<TaggedItem | null>(null);
  const [receiverInfo, setReceiverInfo] = useState<{ id: string, name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hasInitialized = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const safeFormatDate = (timestamp: any) => {
    try {
      if (!timestamp) return '--:--';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'HH:mm');
    } catch (e) {
      return '--:--';
    }
  };

  const getChatTime = (timestamp: any) => {
    try {
      if (!timestamp) return 0;
      if (timestamp.toMillis) return timestamp.toMillis();
      if (typeof timestamp === 'number') return timestamp;
      return new Date(timestamp).getTime();
    } catch (e) {
      return 0;
    }
  };

  // Sync activeChatId with URL params
  useEffect(() => {
    if (chatIdParams) {
      setActiveChatId(chatIdParams);
    } else if (activeChatId !== 'new') {
      setActiveChatId(null);
    }
  }, [chatIdParams]);

  // Initialize from location state
  useEffect(() => {
    const state = location.state as any;
    if (state?.receiverId && user && !hasInitialized.current) {
      hasInitialized.current = true;
      const initChat = async () => {
        setLoading(true);
        try {
          const { receiverId, receiverName, taggedItem: item } = state;
          
          if (item) {
            setTaggedItem(item);
            setInputText(`Hi, I'm interested in this ${item.source === 'market' ? 'item' : 'space'}.`);
          }

          const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', user.uid)
          );
          const snap = await getDocs(q);
          let existingChatId = null;
          
          snap.forEach(doc => {
            const data = doc.data();
            if (data.participants && Array.isArray(data.participants) && data.participants.includes(receiverId)) {
              existingChatId = doc.id;
            }
          });

          if (existingChatId) {
            setActiveChatId(existingChatId);
            // Preserve state when redirecting to existing chat
            navigate(`/chat/${existingChatId}`, { 
              replace: true, 
              state: { ...state } 
            });
          } else {
            setReceiverInfo({ id: receiverId, name: receiverName });
            setActiveChatId('new');
          }
        } catch (err) {
          console.error("Init chat error:", err);
        } finally {
          setLoading(false);
          window.history.replaceState({}, document.title);
        }
      };
      initChat();
    } else {
      setLoading(false);
    }
  }, [location.state, user, navigate]);

  // Fetch all chats for user
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatType));
      chatList.sort((a, b) => getChatTime(b.lastUpdated) - getChatTime(a.lastUpdated));
      setChats(chatList);
    }, (error) => {
      console.error("Chats listener error:", error);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Fetch messages for active chat
  useEffect(() => {
    if (!activeChatId || activeChatId === 'new') {
      setMessages([]);
      return;
    }
    
    const q = query(
      collection(db, `chats/${activeChatId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
      
      // Mark as read
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        const activeChat = chats.find(c => c.id === activeChatId);
        if (activeChat && !activeChat.isRead && lastMsg.senderId !== user?.uid) {
          updateDoc(doc(db, 'chats', activeChatId), { isRead: true });
        }
      }
    }, (error) => {
      console.error("Messages listener error:", error);
    });
    return () => unsubscribe();
  }, [activeChatId, user?.uid, chats]);

  const handleSend = async (e?: React.FormEvent, customText?: string, imageUrl?: string, offerAmount?: number) => {
    if (e) e.preventDefault();
    const textToSend = customText !== undefined ? customText : inputText;
    if (!textToSend.trim() && !taggedItem && !imageUrl && !offerAmount) return;
    if (!user || !dbUser) return;

    let targetChatId = activeChatId;

    try {
      if (targetChatId === 'new' && receiverInfo) {
        const newChatRef = doc(collection(db, 'chats'));
        const chatData = {
          participants: [user.uid, receiverInfo.id],
          users: [
            { uid: user.uid, name: dbUser.displayName || 'Me', avatar: dbUser.photoURL || '' },
            { uid: receiverInfo.id, name: receiverInfo.name || 'Student', avatar: '' }
          ],
          lastMessage: offerAmount ? `Sent an offer: ₦${offerAmount.toLocaleString()}` : (textToSend || 'Sent an attachment'),
          lastUpdated: serverTimestamp(),
          isRead: false,
          lastSenderId: user.uid
        };
        await setDoc(newChatRef, chatData);
        targetChatId = newChatRef.id;
        setActiveChatId(targetChatId);
        navigate(`/chat/${targetChatId}`, { replace: true });
      }

      if (!targetChatId || targetChatId === 'new') return;

      const messageData = {
        text: textToSend,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        ...(taggedItem && { taggedItem }),
        ...(imageUrl && { imageUrl }),
        ...(offerAmount && { offerAmount, offerStatus: 'pending' })
      };

      await addDoc(collection(db, `chats/${targetChatId}/messages`), messageData);

      await updateDoc(doc(db, 'chats', targetChatId), {
        lastMessage: offerAmount ? `Sent an offer: ₦${offerAmount.toLocaleString()}` : (imageUrl ? 'Shared an image' : (textToSend || 'Sent an attachment')),
        lastUpdated: serverTimestamp(),
        isRead: false,
        lastSenderId: user.uid
      });

      if (!customText && !offerAmount) setInputText('');
      setTaggedItem(null);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      console.error("Send message error:", err);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleOfferResponse = async (msgId: string, status: 'accepted' | 'rejected', amount: number, taggedItemData?: any) => {
    if (!activeChatId || !user) return;
    try {
      await updateDoc(doc(db, `chats/${activeChatId}/messages`, msgId), {
        offerStatus: status
      });
      
      const responseText = status === 'accepted' ? `Offer of ₦${amount.toLocaleString()} Accepted. Let's trade.` : `Offer of ₦${amount.toLocaleString()} Declined.`;
      await handleSend(undefined, responseText);

      // If accepted and there's a tagged item, mark it as reserved automatically
      if (status === 'accepted' && taggedItemData?.source === 'market') {
        await updateDoc(doc(db, 'market_items', taggedItemData.id), { isReserved: true });
      }
    } catch (err) {
      console.error("Offer response failed", err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const url = await uploadToCloudinary(file);
      await handleSend(undefined, '', url);
    } catch (err) {
      console.error(err);
      setError('Image upload failed.');
    }
  };

  const getOtherUser = (chat?: ChatType) => {
    if (!chat || !chat.users || !Array.isArray(chat.users)) return undefined;
    return chat.users.find(u => u.uid !== user?.uid);
  };

  const activeChat = chats.find(c => c.id === activeChatId);
  const otherUser = activeChatId === 'new' ? receiverInfo : getOtherUser(activeChat);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-white dark:bg-black">
        <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-24 pb-12 h-[calc(100dvh-20px)] sm:h-[calc(100vh-40px)]">
      <div className="flex bg-white dark:bg-black border border-black/10 dark:border-white/10 h-full overflow-hidden relative shadow-2xl">
        
        {/* Sidebar - Contacts */}
        <div className={`w-full sm:w-80 lg:w-[400px] border-r border-black/10 dark:border-white/10 flex flex-col ${activeChatId ? 'hidden sm:flex' : 'flex'} h-full bg-white dark:bg-black`}>
          <div className="p-6 lg:p-10 border-b border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a] flex-shrink-0">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-colors group mb-8"
            >
              <ArrowLeft01Icon size={18} className="group-hover:-translate-x-1 transition-transform" /> Dashboard
            </button>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF5A5F] mb-4 block">Archive // 01</span>
            <h2 className="text-3xl lg:text-5xl font-black tracking-tighter text-black dark:text-white uppercase leading-[0.85]">Messages</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar py-2">
            {!chats || chats.length === 0 ? (
              <div className="p-10 text-gray-500 font-bold uppercase tracking-widest text-[10px] leading-relaxed opacity-60">
                No active threads found. // Start a conversation from the market or housing feed.
              </div>
            ) : (
              chats.map(chat => {
                const chatOtherUser = getOtherUser(chat);
                const isUnread = !chat.isRead && chat.lastSenderId !== user?.uid;
                return (
                  <div 
                    key={chat.id} 
                    onClick={() => { setActiveChatId(chat.id); navigate(`/chat/${chat.id}`); }}
                    className={`p-6 lg:p-8 border-b border-black/5 dark:border-white/5 cursor-pointer transition-all duration-500 ${activeChatId === chat.id ? 'bg-gray-50 dark:bg-[#0a0a0a]' : 'hover:bg-gray-50 dark:hover:bg-[#0a0a0a]'}`}
                  >
                    <div className="flex items-start gap-4 lg:gap-5">
                      <div className={`w-12 h-12 lg:w-14 lg:h-14 flex-shrink-0 flex items-center justify-center font-black text-xl border-2 ${activeChatId === chat.id ? 'border-black dark:border-white bg-[#B1A9FF] text-black' : 'border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white'}`}>
                        {chatOtherUser?.name ? chatOtherUser.name[0] : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className={`font-black truncate uppercase tracking-tighter text-base lg:text-lg ${isUnread ? 'text-[#FF5A5F]' : 'text-black dark:text-white'}`}>
                            {chatOtherUser?.name || 'Unknown'}
                          </h4>
                          <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                            {safeFormatDate(chat.lastUpdated)}
                          </span>
                        </div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${isUnread ? 'text-black dark:text-white opacity-100' : 'opacity-40'}`}>
                          {chat.lastMessage}
                        </p>
                      </div>
                      {isUnread && <div className="w-2 h-2 bg-[#FF5A5F] flex-shrink-0 mt-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col ${!activeChatId ? 'hidden sm:flex' : 'flex'} h-full bg-white dark:bg-black overflow-hidden relative`}>
          {!activeChatId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 font-bold uppercase tracking-[0.5em] text-[10px] gap-8">
              <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a] grayscale opacity-20">
                 NULL_SELECT
              </div>
              Select a thread to engage.
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-24 lg:h-32 p-6 lg:p-10 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-white dark:bg-black z-10 flex-shrink-0">
                <div className="flex items-center gap-4 lg:gap-6 min-w-0">
                  <button 
                    onClick={() => { setActiveChatId(null); navigate('/chat'); }}
                    className="sm:hidden flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-all group mr-1"
                  >
                    <ArrowLeft01Icon size={18} className="group-hover:-translate-x-1 transition-transform" />
                  </button>
                  <div className="w-10 h-10 lg:w-14 lg:h-14 flex items-center justify-center font-black text-white dark:text-black bg-black dark:bg-white border border-black dark:border-white text-base lg:text-2xl flex-shrink-0">
                     {otherUser?.name ? otherUser.name[0] : '?'}
                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#B1A9FF] mb-0.5 lg:mb-1 block">Live Thread //</span>
                                    <div className="flex items-center gap-3">
                                      <h3 className="font-black text-xl lg:text-3xl uppercase tracking-tighter text-black dark:text-white leading-none truncate">
                                        {otherUser?.name || 'Unknown'}
                                      </h3>
                                      <Shield01Icon size={14} className="text-[#B1A9FF] shrink-0" />
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="hidden lg:block text-right">
                                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 block mb-1">Status // Verified</span>
                                   <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Peer Since {format(new Date(), 'yyyy')}</span>
                                </div>
                              </div>
                  
                              {/* Messages Area */}
                              <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-8 no-scrollbar bg-white dark:bg-black relative">
                                <AnimatePresence>
                                  {error && (
                                    <motion.div 
                                      initial={{ opacity: 0, y: -20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -20 }}
                                      className="sticky top-0 left-0 right-0 z-20 p-4 bg-[#FF5A5F] text-black border border-black font-black uppercase tracking-widest text-[10px] flex items-center justify-between shadow-xl"
                                    >
                                      <span>Error: {error}</span>
                                      <button onClick={() => setError('')} className="p-1 hover:bg-black/10 transition-colors">
                                        <Cancel01Icon size={14} />
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                
                                {messages.map((msg) => {
                                  const isMe = msg.senderId === user?.uid;
                                  return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[90%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                                        {msg.taggedItem && (
                                          <div className={`p-4 border mb-2 flex flex-col sm:flex-row items-center gap-4 w-full ${isMe ? 'bg-gray-50 dark:bg-[#0a0a0a] border-black/10 dark:border-white/10' : 'bg-white dark:bg-black border-black/10 dark:border-white/10'}`}>
                                             <div className="w-full sm:w-16 h-16 flex-shrink-0 overflow-hidden border border-black/10 dark:border-white/10">
                                               <img src={msg.taggedItem.image} alt="" className="w-full h-full object-cover grayscale" />
                                             </div>
                                             <div className="flex-1 min-w-0 text-center sm:text-left">
                                               <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Context //</p>
                                               <p className="text-sm font-black uppercase tracking-tighter text-black dark:text-white truncate">{msg.taggedItem.title}</p>
                                               <p className="text-xs font-black text-[#B1A9FF] tracking-tighter">₦{msg.taggedItem.price.toLocaleString()}</p>
                                             </div>
                                          </div>
                                        )}
                                        
                                                              {(msg as any).imageUrl && (
                                                                <div className="p-2 border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a] mb-2">
                                                                  <img src={(msg as any).imageUrl} alt="Shared" className="max-w-full max-h-[300px] object-contain grayscale hover:grayscale-0 transition-all duration-500" />
                                                                </div>
                                                              )}
                                        
                                                              {(msg as any).offerAmount && (
                                                                <div className={`p-4 border mb-2 w-full ${isMe ? 'bg-gray-50 dark:bg-[#0a0a0a] border-black/10 dark:border-white/10' : 'bg-white dark:bg-black border-black/10 dark:border-white/10'}`}>
                                                                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#B1A9FF] mb-2">Formal Offer //</p>
                                                                  <p className="text-2xl font-black uppercase tracking-tighter text-black dark:text-white mb-4">₦{(msg as any).offerAmount.toLocaleString()}</p>
                                                                  
                                                                  {(msg as any).offerStatus === 'pending' ? (
                                                                    isMe ? (
                                                                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Awaiting Response...</span>
                                                                    ) : (
                                                                      <div className="flex gap-3">
                                                                        <button 
                                                                          onClick={() => handleOfferResponse(msg.id, 'accepted', (msg as any).offerAmount, msg.taggedItem)}
                                                                          className="flex-1 py-3 bg-black text-white dark:bg-white dark:text-black font-black text-[10px] uppercase tracking-widest hover:opacity-80 transition-all"
                                                                        >
                                                                          Accept
                                                                        </button>
                                                                        <button 
                                                                          onClick={() => handleOfferResponse(msg.id, 'rejected', (msg as any).offerAmount, msg.taggedItem)}
                                                                          className="flex-1 py-3 bg-white text-[#FF5A5F] dark:bg-black border border-[#FF5A5F] font-black text-[10px] uppercase tracking-widest hover:bg-[#FF5A5F] hover:text-black transition-all"
                                                                        >
                                                                          Decline
                                                                        </button>
                                                                      </div>
                                                                    )
                                                                  ) : (
                                                                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 border ${
                                                                      (msg as any).offerStatus === 'accepted' ? 'border-green-500 text-green-500' : 'border-[#FF5A5F] text-[#FF5A5F]'
                                                                    }`}>
                                                                      {(msg as any).offerStatus}
                                                                    </span>
                                                                  )}
                                                                </div>
                                                              )}
                                        
                                                              {msg.text && (                                          <div className={`px-6 py-4 text-xs font-bold uppercase tracking-widest leading-relaxed border ${isMe ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white' : 'bg-white text-black dark:bg-black dark:text-white border-black/10 dark:border-white/10'}`}>
                                            {msg.text}
                                          </div>
                                        )}
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] px-2">
                                          {safeFormatDate(msg.createdAt)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div ref={messagesEndRef} />
                              </div>
                  
                                          {/* Input Area */}
                                          <div className="p-6 lg:p-10 bg-gray-50 dark:bg-[#0a0a0a] border-t border-black/10 dark:border-white/10 flex-shrink-0">
                                                          {/* Quick Actions */}
                                                          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 -mx-2 px-2">
                                                            <button
                                                              onClick={() => {
                                                                showAlert({
                                                                  title: 'Create Formal Offer',
                                                                  message: 'Enter your proposed price for this item. This will be sent as a binding inquiry.',
                                                                  type: 'prompt',
                                                                  placeholder: 'ENTER AMOUNT (₦)...',
                                                                  confirmText: 'Send Offer',
                                                                  onConfirm: (amount) => {
                                                                    if (amount && !isNaN(Number(amount))) {
                                                                      handleSend(undefined, `I would like to make an offer of ₦${Number(amount).toLocaleString()}`, undefined, Number(amount));
                                                                    }
                                                                  }
                                                                });
                                                              }}
                                                              className="whitespace-nowrap px-4 py-2 bg-[#B1A9FF] text-black border border-black font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                            >
                                                              Make Offer
                                                            </button>                                              {QUICK_ACTIONS.map((action, i) => (
                                                <button
                                                  key={i}
                                                  onClick={() => handleSend(undefined, action)}
                                                  className="whitespace-nowrap px-4 py-2 bg-white dark:bg-black border border-black/10 dark:border-white/10 text-[9px] font-black uppercase tracking-widest hover:border-black dark:hover:border-white transition-all"
                                                >
                                                  {action}
                                                </button>
                                              ))}
                                            </div>                  
                                {taggedItem && (
                                  <div className="mb-4 px-6 py-3 bg-white dark:bg-black flex items-center justify-between border border-black/10 dark:border-white/10">
                                    <span className="text-[9px] font-black text-gray-400 flex items-center gap-3 uppercase tracking-[0.3em]">
                                      <div className="w-1 h-4 bg-[#FF5A5F]" />
                                      Context: <span className="text-black dark:text-white truncate max-w-[150px]">{taggedItem.title}</span>
                                    </span>
                                    <button onClick={() => setTaggedItem(null)} className="text-gray-400 hover:text-black dark:hover:text-white text-xl">×</button>
                                  </div>
                                )}
                                <form onSubmit={(e) => handleSend(e)} className="flex items-center gap-4">
                                  <label className="w-14 h-14 border border-black/10 dark:border-white/10 flex items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-black transition-all">
                                    <Image01Icon size={20} className="text-gray-400" />
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                  </label>
                                  <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="TYPE MESSAGE //"
                                    className="flex-1 px-0 py-4 bg-transparent border-b-2 border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white outline-none text-black dark:text-white transition-all font-black uppercase tracking-[0.2em] text-xs placeholder:text-gray-300 dark:placeholder:text-gray-700"
                                  />
                                  <button
                                    type="submit"
                                    disabled={!inputText.trim() && !taggedItem}
                                    className="w-14 h-14 bg-[#B1A9FF] text-black flex items-center justify-center disabled:opacity-50 transition-all hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-shrink-0"
                                  >
                                    <Send01Icon size={24} />
                                  </button>
                                </form>
                              </div>
                            </>
                          )}
                        </div>      </div>
    </div>
  );
};