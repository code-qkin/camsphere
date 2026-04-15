import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const sendMatchRequest = async (listing: any, sender: any) => {
  // Prevent self-matching
  if (listing.listerId === sender.uid) {
    throw new Error('SELF_MATCH_ATTEMPT');
  }

  // Check for existing request
  const q = query(
    collection(db, 'match_requests'),
    where('listingId', '==', listing.id),
    where('senderId', '==', sender.uid)
  );
  
  const existing = await getDocs(q);
  if (!existing.empty) {
    throw new Error('DUPLICATE_REQUEST');
  }

  // 1. Create the formal request record
  const requestRef = collection(db, 'match_requests');
  const requestDoc = await addDoc(requestRef, {
    listingId: listing.id,
    listerId: listing.listerId,
    senderId: sender.uid,
    senderName: sender.displayName,
    senderPhoto: sender.photoURL,
    status: 'pending',
    createdAt: Date.now()
  });

  // 2. Notify the lister
  const notificationRef = collection(db, 'notifications');
  await addDoc(notificationRef, {
    userId: listing.listerId,
    title: 'New Match Request!',
    message: `${sender.displayName} wants to match as a roommate for "${listing.title}".`,
    type: 'success',
    isRead: false,
    link: `/nest/${listing.id}?requestId=${requestDoc.id}`,
    createdAt: Date.now()
  });
};

export const respondToMatchRequest = async (requestId: string, status: 'accepted' | 'rejected', listing: any, senderId: string, listerName: string) => {
  await updateDoc(doc(db, 'match_requests', requestId), { 
    status,
    respondedAt: Date.now() 
  });

  // Notify the sender
  await addDoc(collection(db, 'notifications'), {
    userId: senderId,
    title: status === 'accepted' ? 'Match Request Accepted!' : 'Match Request Update',
    message: status === 'accepted' 
      ? `${listerName} accepted your match request for ${listing.title}. You can now start chatting!` 
      : `${listerName} declined the match request for ${listing.title}.`,
    type: status === 'accepted' ? 'success' : 'info',
    isRead: false,
    link: status === 'accepted' ? `/nest/${listing.id}` : '/nest',
    createdAt: Date.now()
  });
};
