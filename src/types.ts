export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  coverUrl?: string;
  university: string;
  whatsapp: string;
  joinedAt: number;
  lastActive?: number;
  role: 'student' | 'pending_admin' | 'admin' | 'lead_admin' | 'suspended';
  verificationStatus: 'unverified' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  stats?: {
    itemsSold: number;
    listingsCreated: number;
  };
  lifestyleQuiz?: {
    sleepSchedule: 'early' | 'night';
    cleanliness: 1 | 2 | 3 | 4 | 5;
    guests: 'never' | 'occasional' | 'frequent';
    studyHabit: 'quiet' | 'background';
  };
}

export interface Verification {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  university: string;
  selfieUrl: string;
  idCardUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
}

export interface MarketItem {
  id: string;
  type: 'goods' | 'service';
  title: string;
  description: string;
  price: number;
  category: string;
  condition?: 'Mint' | 'Near Mint' | 'Used';
  images: string[];
  sellerId: string;
  sellerName: string;
  university: string;
  isSold: boolean;
  isReserved: boolean;
  allowOffers: boolean;
  lastBumpedAt?: number;
  createdAt: number;
}

export interface Landmark {
  name: string;
  time: string;
}

export interface NestListing {
  id: string;
  type: 'lodge' | 'roommate';
  title: string;
  description: string;
  rentPrice: number;
  amenities: string[];
  lifestylePrefs: string[];
  lifestyleQuiz?: {
    sleepSchedule: 'early' | 'night';
    cleanliness: 1 | 2 | 3 | 4 | 5;
    guests: 'never' | 'occasional' | 'frequent';
    studyHabit: 'quiet' | 'background';
  };
  distanceToCampus?: string;
  landmarks?: Landmark[];
  images: string[];
  listerId: string;
  listerName: string;
  university: string;
  isAvailable: boolean;
  isVerified?: boolean;
  rating?: number;
  reviewCount?: number;
  createdAt: number;
}

export interface ChatUser {
  uid: string;
  name: string;
  avatar: string;
}

export interface Chat {
  id: string;
  participants: string[];
  users: ChatUser[];
  lastMessage: string;
  lastUpdated: number;
  isRead: boolean;
  lastSenderId: string;
}

export interface TaggedItem {
  id: string;
  title: string;
  price: number;
  image: string;
  source: 'market' | 'nest';
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: number;
  taggedItem?: TaggedItem;
  imageUrl?: string;
  offerAmount?: number;
  offerStatus?: 'pending' | 'accepted' | 'rejected';
}

export interface Favorite {
  id: string;
  userId: string;
  itemId: string;
  itemType: 'market' | 'nest';
  itemData: MarketItem | NestListing;
  createdAt: number;
}

export interface Report {
  id: string;
  targetId: string;
  type: 'user' | 'item';
  itemType?: 'market' | 'nest';
  reason: string;
  reporterId: string;
  status: 'open' | 'resolved';
  createdAt: number;
}

export interface ActionLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetId: string;
  timestamp: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  isRead: boolean;
  createdAt: number;
  link?: string;
}

export interface CartItem {
  itemId: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  sellerId: string;
}

export interface University {
  id: string;
  name: string;
  available: boolean;
  createdAt: number;
}
