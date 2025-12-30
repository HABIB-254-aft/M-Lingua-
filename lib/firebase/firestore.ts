// Firestore utilities for M-Lingua

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';

// User profile operations
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  username?: string;
  photoURL?: string;
  birthday?: string;
  gender?: string;
  preferences?: {
    darkMode?: boolean;
    outputFormats?: {
      text?: boolean;
      sign?: boolean;
      audio?: boolean;
      translation?: boolean;
    };
    accessibilityMode?: string;
    signLanguage?: string;
  };
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// Create or update user profile
export async function saveUserProfile(uid: string, profileData: Partial<UserProfile>) {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(
      userRef,
      {
        ...profileData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get user profile
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// Conversation operations
export interface ConversationMessage {
  id?: string;
  text: string;
  mode: string;
  timestamp: Timestamp | Date;
  isLocal: boolean;
  userId: string;
  roomCode?: string;
  signAnimation?: string;
  translation?: string;
  audioUrl?: string;
}

export interface Conversation {
  id: string;
  roomCode: string;
  participants: string[];
  messages: ConversationMessage[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// Create a new conversation
export async function createConversation(roomCode: string, userId: string) {
  try {
    const conversationRef = doc(db, 'conversations', roomCode);
    await setDoc(conversationRef, {
      roomCode,
      participants: [userId],
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Add message to conversation
export async function addMessageToConversation(
  roomCode: string,
  message: Omit<ConversationMessage, 'id' | 'timestamp'>
) {
  try {
    const conversationRef = doc(db, 'conversations', roomCode);
    const messagesRef = collection(conversationRef, 'messages');
    
    await addDoc(messagesRef, {
      ...message,
      timestamp: serverTimestamp(),
    });
    
    // Update conversation updatedAt
    await updateDoc(conversationRef, {
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Listen to conversation messages in real-time
export function subscribeToConversation(
  roomCode: string,
  callback: (messages: ConversationMessage[]) => void
) {
  const conversationRef = doc(db, 'conversations', roomCode);
  const messagesRef = collection(conversationRef, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const messages: ConversationMessage[] = [];
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data(),
      } as ConversationMessage);
    });
    callback(messages);
  });
}

// Translation history operations
export interface TranslationHistory {
  id?: string;
  userId: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  provider: string;
  timestamp: Timestamp | Date;
}

// Save translation to history
export async function saveTranslationHistory(
  userId: string,
  translation: Omit<TranslationHistory, 'id' | 'userId' | 'timestamp'>
) {
  try {
    const historyRef = collection(db, 'users', userId, 'translationHistory');
    await addDoc(historyRef, {
      ...translation,
      userId,
      timestamp: serverTimestamp(),
    });
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get user's translation history
export async function getTranslationHistory(userId: string, limitCount: number = 100) {
  try {
    const historyRef = collection(db, 'users', userId, 'translationHistory');
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    const history: TranslationHistory[] = [];
    snapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data(),
      } as TranslationHistory);
    });
    
    return { history, error: null };
  } catch (error: any) {
    return { history: [], error: error.message };
  }
}

// Friends operations
export interface Friend {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  photoURL?: string;
  status?: string;
  addedAt?: Timestamp | Date;
}

export interface FriendRequest {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  photoURL?: string;
  status?: string;
  sentAt?: Timestamp | Date;
}

// Helper function to remove undefined values (Firestore doesn't allow undefined)
const removeUndefined = (obj: any): any => {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};

// Get user's friends list
export async function getFriends(userId: string): Promise<{ friends: Friend[]; error: string | null }> {
  try {
    const friendsRef = collection(db, 'users', userId, 'friends');
    const snapshot = await getDocs(friendsRef);
    
    const friends: Friend[] = [];
    snapshot.forEach((doc) => {
      friends.push({
        id: doc.id,
        ...doc.data(),
      } as Friend);
    });
    
    return { friends, error: null };
  } catch (error: any) {
    return { friends: [], error: error.message };
  }
}

// Add a friend
export async function addFriend(userId: string, friend: Friend) {
  try {
    const friendsRef = collection(db, 'users', userId, 'friends');
    // Clean the friend data to remove undefined values
    const cleanedFriend = removeUndefined({
      id: friend.id,
      name: friend.name,
      username: friend.username,
      email: friend.email,
      avatar: friend.avatar,
      photoURL: friend.photoURL,
      status: friend.status,
    });
    
    await setDoc(doc(friendsRef, friend.id), {
      ...cleanedFriend,
      addedAt: serverTimestamp(),
    });
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Remove a friend
export async function removeFriend(userId: string, friendId: string) {
  try {
    const friendRef = doc(db, 'users', userId, 'friends', friendId);
    await deleteDoc(friendRef);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get friend requests (incoming)
export async function getFriendRequests(userId: string): Promise<{ requests: FriendRequest[]; error: string | null }> {
  try {
    const requestsRef = collection(db, 'users', userId, 'friendRequests');
    const snapshot = await getDocs(requestsRef);
    
    const requests: FriendRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data(),
      } as FriendRequest);
    });
    
    return { requests, error: null };
  } catch (error: any) {
    return { requests: [], error: error.message };
  }
}

// Send friend request
export async function sendFriendRequest(userId: string, receiverId: string, request: FriendRequest) {
  try {
    // Clean the request data to remove undefined values
    const cleanedRequest = removeUndefined({
      id: request.id,
      name: request.name,
      username: request.username,
      email: request.email,
      avatar: request.avatar,
      photoURL: request.photoURL,
      status: request.status,
    });

    // Add to receiver's incoming requests
    const receiverRequestsRef = collection(db, 'users', receiverId, 'friendRequests');
    await setDoc(doc(receiverRequestsRef, userId), {
      ...cleanedRequest,
      sentAt: serverTimestamp(),
    });
    
    // Add to sender's sent requests
    const senderSentRef = collection(db, 'users', userId, 'sentRequests');
    await setDoc(doc(senderSentRef, receiverId), {
      id: receiverId,
      name: request.name,
      ...removeUndefined({
        username: request.username,
        email: request.email,
        avatar: request.avatar,
        photoURL: request.photoURL,
      }),
      sentAt: serverTimestamp(),
    });
    
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Accept friend request
export async function acceptFriendRequest(userId: string, requesterId: string, requesterData: Friend) {
  try {
    // Add requester to user's friends
    await addFriend(userId, requesterData);
    
    // Add user to requester's friends
    const currentUser = await getUserProfile(userId);
    if (currentUser) {
      await addFriend(requesterId, {
        id: userId,
        name: currentUser.displayName || currentUser.email || 'User',
        email: currentUser.email,
        ...removeUndefined({
          username: currentUser.username,
          photoURL: currentUser.photoURL,
        }),
        status: 'Offline',
      });
    }
    
    // Remove from user's incoming requests
    const requestRef = doc(db, 'users', userId, 'friendRequests', requesterId);
    await deleteDoc(requestRef);
    
    // Remove from requester's sent requests
    const sentRequestRef = doc(db, 'users', requesterId, 'sentRequests', userId);
    await deleteDoc(sentRequestRef);
    
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Decline friend request
export async function declineFriendRequest(userId: string, requesterId: string) {
  try {
    // Remove from user's incoming requests
    const requestRef = doc(db, 'users', userId, 'friendRequests', requesterId);
    await deleteDoc(requestRef);
    
    // Remove from requester's sent requests
    const sentRequestRef = doc(db, 'users', requesterId, 'sentRequests', userId);
    await deleteDoc(sentRequestRef);
    
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Cancel sent friend request
export async function cancelFriendRequest(userId: string, receiverId: string) {
  try {
    // Remove from receiver's incoming requests
    const receiverRequestRef = doc(db, 'users', receiverId, 'friendRequests', userId);
    await deleteDoc(receiverRequestRef);
    
    // Remove from sender's sent requests
    const senderSentRef = doc(db, 'users', userId, 'sentRequests', receiverId);
    await deleteDoc(senderSentRef);
    
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get sent friend requests
export async function getSentRequests(userId: string): Promise<{ requests: FriendRequest[]; error: string | null }> {
  try {
    const sentRef = collection(db, 'users', userId, 'sentRequests');
    const snapshot = await getDocs(sentRef);
    
    const requests: FriendRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data(),
      } as FriendRequest);
    });
    
    return { requests, error: null };
  } catch (error: any) {
    return { requests: [], error: error.message };
  }
}

