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

/**
 * Check if a username already exists in Firestore
 */
export async function usernameExists(username: string, excludeUserId?: string): Promise<boolean> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const usernameLower = username.toLowerCase();
    let exists = false;
    
    snapshot.forEach((doc) => {
      // Skip excluded user
      if (excludeUserId && doc.id === excludeUserId) {
        return;
      }
      
      const userData = doc.data() as UserProfile;
      if (userData.username?.toLowerCase() === usernameLower) {
        exists = true;
      }
    });
    
    return exists;
  } catch (error: any) {
    console.error('Error checking username existence:', error);
    // On error, assume username exists to be safe
    return true;
  }
}

/**
 * Generate a unique username based on a base name
 * If the base name is taken, appends numbers (name1, name2, etc.) until unique
 */
export async function generateUniqueUsername(baseName: string, excludeUserId?: string): Promise<string> {
  // Clean the base name: lowercase, remove special chars except hyphens and underscores
  let baseUsername = baseName.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  
  // If base username is empty after cleaning, use a default
  if (!baseUsername) {
    baseUsername = 'user';
  }
  
  // Try the base username first
  let username = baseUsername;
  let counter = 1;
  
  // Keep trying until we find a unique username (max 1000 attempts to prevent infinite loops)
  while (await usernameExists(username, excludeUserId) && counter < 1000) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  if (counter >= 1000) {
    // Fallback: add timestamp to ensure uniqueness
    username = `${baseUsername}${Date.now().toString().slice(-6)}`;
  }
  
  return username;
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

// Listen to friends list changes in real-time
export function subscribeToFriends(
  userId: string,
  callback: (friends: Friend[]) => void
) {
  // Check if db is available (Firebase initialized)
  if (!db) {
    console.warn('Firestore not initialized, cannot set up friends listener');
    return () => {}; // Return empty unsubscribe function
  }

  try {
    const friendsRef = collection(db, 'users', userId, 'friends');
    console.log('Setting up friends listener for user:', userId, 'Collection path: users/', userId, '/friends');
    
    return onSnapshot(friendsRef, (snapshot: QuerySnapshot<DocumentData>) => {
      console.log('Friends snapshot received:', snapshot.size, 'friends');
      const friends: Friend[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Friend document:', doc.id, data);
        friends.push({
          id: doc.id,
          ...data,
        } as Friend);
      });
      console.log('Processed friends list:', friends);
      callback(friends);
    }, (error) => {
      console.error('Error listening to friends:', error);
      callback([]);
    });
  } catch (error) {
    console.error('Error setting up friends listener:', error);
    return () => {}; // Return empty unsubscribe function
  }
}

// Add a friend
export async function addFriend(userId: string, friend: Friend) {
  try {
    if (!db) {
      console.error('Firestore db not initialized');
      return { success: false, error: 'Firestore not initialized' };
    }
    
    if (!userId) {
      console.error('User ID is required');
      return { success: false, error: 'User ID is required' };
    }
    
    if (!friend.id) {
      console.error('Friend ID is required');
      return { success: false, error: 'Friend ID is required' };
    }
    
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
    
    console.log('Adding friend to Firestore - User:', userId, 'Friend ID:', friend.id, 'Data:', cleanedFriend);
    const friendDocRef = doc(friendsRef, friend.id);
    await setDoc(friendDocRef, {
      ...cleanedFriend,
      addedAt: serverTimestamp(),
    });
    console.log('Friend document created at path: users/', userId, '/friends/', friend.id);
    
    // Try to verify the friend was added (may fail due to read permissions, but write succeeded)
    try {
      const verifyDoc = await getDoc(friendDocRef);
      if (verifyDoc.exists()) {
        console.log('Friend added successfully to Firestore and verified. Path: users/', userId, '/friends/', friend.id);
      } else {
        console.warn('Friend document created but verification read failed - document may not exist or read permission denied');
        // Don't fail - the setDoc succeeded, verification is just a check
      }
    } catch (verifyError: any) {
      console.warn('Could not verify friend document (read permission may be denied):', verifyError.message);
      // Don't fail - the setDoc succeeded, verification is just a check
      console.log('Assuming friend was added successfully (setDoc completed without error)');
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error adding friend to Firestore:', error);
    return { success: false, error: error.message };
  }
}

// Remove a friend (bidirectional - removes from both users' friends lists)
export async function removeFriend(userId: string, friendId: string) {
  try {
    console.log('=== REMOVE FRIEND ===');
    console.log('User removing friend (userId):', userId);
    console.log('Friend to remove (friendId):', friendId);
    
    if (!userId || !friendId) {
      console.error('Missing user IDs - userId:', userId, 'friendId:', friendId);
      return { success: false, error: 'Missing user IDs' };
    }
    
    // Remove friend from user's friends list
    console.log('Step 1: Removing friend from user\'s friends list (users/', userId, '/friends/', friendId, ')');
    const friendRef = doc(db, 'users', userId, 'friends', friendId);
    await deleteDoc(friendRef);
    console.log('SUCCESS: Removed friend from user\'s friends list');
    
    // Remove user from friend's friends list (bidirectional)
    console.log('Step 2: Removing user from friend\'s friends list (users/', friendId, '/friends/', userId, ')');
    const userRef = doc(db, 'users', friendId, 'friends', userId);
    await deleteDoc(userRef);
    console.log('SUCCESS: Removed user from friend\'s friends list');
    
    console.log('=== FRIEND REMOVED SUCCESSFULLY (BIDIRECTIONAL) ===');
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error removing friend:', error);
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
      const data = doc.data();
      console.log('Friend request document:', doc.id, data);
      console.log('Friend request photoURL:', data.photoURL);
      // Ensure document ID (sender's user ID) takes precedence over any id field in data
      const { id: _, ...dataWithoutId } = data;
      requests.push({
        ...dataWithoutId,
        id: doc.id, // Document ID is the sender's user ID
      } as FriendRequest);
    });
    
    console.log('Loaded friend requests:', requests.length, 'requests with photoURLs:', requests.filter(r => r.photoURL).length);
    return { requests, error: null };
  } catch (error: any) {
    console.error('Error getting friend requests:', error);
    return { requests: [], error: error.message };
  }
}

// Send friend request
export async function sendFriendRequest(userId: string, receiverId: string, request: FriendRequest) {
  try {
    console.log('=== SEND FRIEND REQUEST ===');
    console.log('Sender (userId):', userId);
    console.log('Receiver (receiverId):', receiverId);
    console.log('Request data:', request);
    console.log('Request photoURL:', request.photoURL);
    
    // Clean the request data to remove undefined values
    // Don't store 'id' field since document ID already serves as the ID
    const cleanedRequest = removeUndefined({
      name: request.name,
      username: request.username,
      email: request.email,
      avatar: request.avatar,
      photoURL: request.photoURL,
      status: request.status,
    });
    
    console.log('Cleaned request data:', cleanedRequest);
    console.log('Cleaned request photoURL:', cleanedRequest.photoURL);

    // Add to receiver's incoming requests
    // Path: users/{receiverId}/friendRequests/{userId}
    // Where userId (sender) is the document ID, receiverId is the collection owner
    const receiverRequestsRef = collection(db, 'users', receiverId, 'friendRequests');
    const receiverRequestDoc = doc(receiverRequestsRef, userId);
    console.log('Creating document at path: users/', receiverId, '/friendRequests/', userId);
    console.log('Authenticated user:', userId, 'Document ID:', userId, 'Match:', userId === userId);
    try {
      await setDoc(receiverRequestDoc, {
        ...cleanedRequest,
        sentAt: serverTimestamp(),
      });
      console.log('Document created successfully');
    } catch (error: any) {
      console.error('Error creating friend request document:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }
    
    // Verify the request was saved with photoURL
    // Note: This might fail if sender doesn't have read permission, but that's okay
    try {
      const verifyDoc = await getDoc(receiverRequestDoc);
      if (verifyDoc.exists()) {
        const savedData = verifyDoc.data();
        console.log('Request saved successfully. Saved data:', savedData);
        console.log('Saved photoURL:', savedData.photoURL);
      } else {
        console.warn('Request was not saved - document does not exist after setDoc');
      }
    } catch (verifyError: any) {
      console.warn('Could not verify document (may not have read permission):', verifyError.message);
      // This is okay - the document was created, we just can't verify it
    }
    
    // Add to sender's sent requests
    // We need to store the RECEIVER's profile data, not the sender's
    console.log('Adding to sender\'s sent requests: users/', userId, '/sentRequests/', receiverId);
    const senderSentRef = collection(db, 'users', userId, 'sentRequests');
    
    // Fetch receiver's profile to get their data
    const receiverProfile = await getUserProfile(receiverId);
    if (!receiverProfile) {
      console.warn('Could not fetch receiver profile, using minimal data');
    }
    
    // Use receiver's profile data for sent requests
    const receiverData = receiverProfile ? {
      id: receiverId,
      name: receiverProfile.displayName || receiverProfile.email || 'User',
      email: receiverProfile.email,
      ...removeUndefined({
        username: receiverProfile.username,
        avatar: (receiverProfile.displayName || receiverProfile.email || 'U').charAt(0).toUpperCase(),
        photoURL: receiverProfile.photoURL,
      }),
    } : {
      id: receiverId,
      name: 'User',
    };
    
    try {
      await setDoc(doc(senderSentRef, receiverId), {
        ...receiverData,
        sentAt: serverTimestamp(),
      });
      console.log('Added to sender\'s sent requests successfully with receiver data:', receiverData);
    } catch (sentError: any) {
      console.error('Error adding to sender\'s sent requests:', sentError);
      console.error('Error code:', sentError.code);
      console.error('Error message:', sentError.message);
      throw sentError;
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Accept friend request
export async function acceptFriendRequest(userId: string, requesterId: string, requesterData: Friend) {
  try {
    console.log('=== ACCEPT FRIEND REQUEST ===');
    console.log('User accepting (userId):', userId);
    console.log('Requester (requesterId):', requesterId);
    console.log('Requester data:', requesterData);
    
    if (!userId || !requesterId) {
      console.error('Missing user IDs - userId:', userId, 'requesterId:', requesterId);
      return { success: false, error: 'Missing user IDs' };
    }
    
    // Check requester's presence status before adding
    const { presence: requesterPresence } = await getUserPresence(requesterId);
    const requesterStatus = requesterPresence?.status || 'Offline';
    console.log('Requester presence status:', requesterStatus);
    
    // Update requester data with current status
    const requesterDataWithStatus = {
      ...requesterData,
      status: requesterStatus,
    };
    
    // Add requester to user's friends (the one accepting)
    console.log('Step 1: Adding requester to user\'s friends list');
    console.log('  Path: users/', userId, '/friends/', requesterId);
    console.log('  Authenticated user:', userId);
    console.log('  Collection owner (userId in path):', userId);
    console.log('  Document ID (friendId):', requesterId);
    console.log('  Rule check: request.auth.uid == userId?', userId === userId, '(should be true)');
    console.log('  Rule check: request.auth.uid == friendId?', userId === requesterId, '(should be false)');
    
    const addRequesterResult = await addFriend(userId, requesterDataWithStatus);
    if (!addRequesterResult.success) {
      console.error('FAILED: Could not add requester to user\'s friends:', addRequesterResult.error);
      return { success: false, error: `Failed to add friend: ${addRequesterResult.error}` };
    }
    console.log('SUCCESS: Requester added to user\'s friends list');
    
    // Add user to requester's friends (bidirectional)
    console.log('Step 2: Adding user to requester\'s friends list');
    console.log('  Path: users/', requesterId, '/friends/', userId);
    console.log('  Authenticated user:', userId);
    console.log('  Collection owner (userId in path):', requesterId);
    console.log('  Document ID (friendId):', userId);
    console.log('  Rule check: request.auth.uid == userId?', userId === requesterId, '(should be false)');
    console.log('  Rule check: request.auth.uid == friendId?', userId === userId, '(should be true)');
    
    const currentUser = await getUserProfile(userId);
    if (!currentUser) {
      console.error('FAILED: Could not get current user profile');
      return { success: false, error: 'Could not get current user profile' };
    }
    
    // Check current user's presence status
    const { presence: userPresence } = await getUserPresence(userId);
    const userStatus = userPresence?.status || 'Offline';
    console.log('Current user presence status:', userStatus);
    
    const userAsFriend: Friend = {
      id: userId,
      name: currentUser.displayName || currentUser.email || 'User',
      email: currentUser.email,
      ...removeUndefined({
        username: currentUser.username,
        photoURL: currentUser.photoURL,
      }),
      status: userStatus,
    };
    
    console.log('User data to add to requester\'s friends:', userAsFriend);
    const addUserResult = await addFriend(requesterId, userAsFriend);
    let bidirectionalWarning = false;
    if (!addUserResult.success) {
      console.error('FAILED: Could not add user to requester\'s friends:', addUserResult.error);
      console.error('  This means User B cannot add themselves to User A\'s friends list');
      console.error('  The friendship is incomplete - User A will not see User B as a friend');
      // Don't fail the whole operation - at least User B has the friend
      // But log it as a warning
      console.warn('WARNING: Bidirectional friendship incomplete. User A will need to refresh or the real-time listener should update.');
      bidirectionalWarning = true;
    } else {
      console.log('SUCCESS: User added to requester\'s friends list');
    }
    
    // Remove from user's incoming requests
    console.log('Step 3: Removing from user\'s incoming requests');
    try {
      const requestRef = doc(db, 'users', userId, 'friendRequests', requesterId);
      await deleteDoc(requestRef);
      console.log('SUCCESS: Removed from user\'s incoming requests');
    } catch (error: any) {
      console.error('FAILED: Could not remove from user\'s incoming requests:', error.message);
      console.error('  Error code:', error.code);
      // Continue anyway - the friend was added
    }
    
    // Remove from requester's sent requests
    console.log('Step 4: Removing from requester\'s sent requests');
    try {
      const sentRequestRef = doc(db, 'users', requesterId, 'sentRequests', userId);
      await deleteDoc(sentRequestRef);
      console.log('SUCCESS: Removed from requester\'s sent requests');
    } catch (error: any) {
      console.error('FAILED: Could not remove from requester\'s sent requests:', error.message);
      console.error('  Error code:', error.code);
      // Continue anyway - the friend was added
    }
    
    console.log('=== FRIEND REQUEST ACCEPTED SUCCESSFULLY ===');
    if (bidirectionalWarning) {
      return { success: true, error: 'Friendship created but bidirectional sync incomplete. User A may need to refresh.' };
    }
    return { success: true, error: null };
  } catch (error: any) {
    console.error('ERROR accepting friend request:', error);
    return { success: false, error: error.message };
  }
}

// Decline friend request (removes from both sides)
export async function declineFriendRequest(userId: string, requesterId: string) {
  try {
    console.log('=== DECLINE FRIEND REQUEST ===');
    console.log('User declining (userId):', userId);
    console.log('Requester (requesterId):', requesterId);
    
    if (!userId || !requesterId) {
      console.error('Missing user IDs - userId:', userId, 'requesterId:', requesterId);
      return { success: false, error: 'Missing user IDs' };
    }
    
    // Remove from user's incoming requests
    console.log('Step 1: Removing from user\'s incoming requests');
    const requestRef = doc(db, 'users', userId, 'friendRequests', requesterId);
    await deleteDoc(requestRef);
    console.log('SUCCESS: Removed from user\'s incoming requests');
    
    // Remove from requester's sent requests
    console.log('Step 2: Removing from requester\'s sent requests');
    const sentRequestRef = doc(db, 'users', requesterId, 'sentRequests', userId);
    await deleteDoc(sentRequestRef);
    console.log('SUCCESS: Removed from requester\'s sent requests');
    
    console.log('=== FRIEND REQUEST DECLINED SUCCESSFULLY ===');
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error declining friend request:', error);
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
      const data = doc.data();
      console.log('Sent request document:', doc.id, data);
      console.log('Sent request photoURL:', data.photoURL);
      requests.push({
        id: doc.id,
        ...data,
      } as FriendRequest);
    });
    
    console.log('Loaded sent requests:', requests.length, 'requests with photoURLs:', requests.filter(r => r.photoURL).length);
    return { requests, error: null };
  } catch (error: any) {
    console.error('Error getting sent requests:', error);
    return { requests: [], error: error.message };
  }
}

// Listen to friend requests changes in real-time
export function subscribeToFriendRequests(
  userId: string,
  callback: (requests: FriendRequest[]) => void
) {
  if (typeof window === 'undefined' || !db) {
    console.warn('Firestore DB not initialized for subscribeToFriendRequests during SSR or invalid config.');
    callback([]);
    return () => {};
  }
  const requestsRef = collection(db, 'users', userId, 'friendRequests');
  return onSnapshot(requestsRef, (snapshot: QuerySnapshot<DocumentData>) => {
    const requests: FriendRequest[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Ensure document ID (sender's user ID) takes precedence over any id field in data
      const { id: _, ...dataWithoutId } = data;
      requests.push({
        ...dataWithoutId,
        id: doc.id, // Document ID is the sender's user ID
      } as FriendRequest);
    });
    callback(requests);
  }, (error) => {
    console.error('Error listening to friend requests:', error);
    callback([]);
  });
}

// Listen to sent requests changes in real-time
export function subscribeToSentRequests(
  userId: string,
  callback: (requests: FriendRequest[]) => void
) {
  if (typeof window === 'undefined' || !db) {
    console.warn('Firestore DB not initialized for subscribeToSentRequests during SSR or invalid config.');
    callback([]);
    return () => {};
  }
  const sentRef = collection(db, 'users', userId, 'sentRequests');
  return onSnapshot(sentRef, (snapshot: QuerySnapshot<DocumentData>) => {
    const requests: FriendRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data(),
      } as FriendRequest);
    });
    callback(requests);
  }, (error) => {
    console.error('Error listening to sent requests:', error);
    callback([]);
  });
}

// Search users in Firestore
export interface SearchUserResult {
  id: string;
  email: string;
  displayName?: string;
  username?: string;
  photoURL?: string;
}

/**
 * Search users by displayName or email
 * Excludes the currently logged-in user from results
 */
export async function searchUsers(
  searchQuery: string,
  searchFilter: 'all' | 'name' | 'username' | 'email' = 'all',
  limitCount: number = 50,
  excludeUserId?: string
): Promise<{ users: SearchUserResult[]; error: string | null }> {
  try {
    const usersRef = collection(db, 'users');
    const searchLower = searchQuery.toLowerCase().trim();
    
    if (!searchLower) {
      return { users: [], error: null };
    }

    // Firestore doesn't support full-text search, so we'll fetch users and filter client-side
    // For better performance, we could use Firestore's prefix matching, but for now
    // we'll fetch a reasonable number and filter
    const allUsersSnapshot = await getDocs(usersRef);
    
    const users: SearchUserResult[] = [];
    allUsersSnapshot.forEach((doc) => {
      // Exclude current user if provided
      if (excludeUserId && doc.id === excludeUserId) {
        return;
      }

      const userData = doc.data() as UserProfile;
      const user: SearchUserResult = {
        id: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        username: userData.username,
        photoURL: userData.photoURL,
      };

      // Apply search filter - search by displayName or email
      let matches = false;
      if (searchFilter === 'name') {
        matches = userData.displayName?.toLowerCase().includes(searchLower) || false;
      } else if (searchFilter === 'username') {
        matches = userData.username?.toLowerCase().includes(searchLower) || false;
      } else if (searchFilter === 'email') {
        matches = userData.email?.toLowerCase().includes(searchLower) || false;
      } else {
        // 'all' - search in displayName, username, or email
        matches = (
          userData.displayName?.toLowerCase().includes(searchLower) ||
          userData.username?.toLowerCase().includes(searchLower) ||
          userData.email?.toLowerCase().includes(searchLower)
        ) || false;
      }

      if (matches) {
        users.push(user);
      }
    });

    // Sort by relevance (exact matches first, then partial)
    users.sort((a, b) => {
      const aName = (a.displayName || "").toLowerCase();
      const bName = (b.displayName || "").toLowerCase();
      const aUsername = (a.username || "").toLowerCase();
      const bUsername = (b.username || "").toLowerCase();
      
      // Exact match at start gets priority
      const aStarts = aName.startsWith(searchLower) || aUsername.startsWith(searchLower);
      const bStarts = bName.startsWith(searchLower) || bUsername.startsWith(searchLower);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Then sort alphabetically
      return aName.localeCompare(bName);
    });

    // Limit results
    return { users: users.slice(0, limitCount), error: null };
  } catch (error: any) {
    console.error('Error searching users:', error);
    return { users: [], error: error.message };
  }
}

// Presence operations - track user online/offline status
export interface UserPresence {
  userId: string;
  status: 'Online' | 'Offline';
  lastSeen: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// Set user presence status
// This only updates the current user's own presence document
// Other users' presence is not affected - they have their own independent presence documents
export async function setUserPresence(userId: string, status: 'Online' | 'Offline') {
  try {
    if (!db) {
      return { success: false, error: 'Firestore not initialized' };
    }
    
    console.log(`Setting presence for user ${userId} to ${status}`);
    const presenceRef = doc(db, 'presence', userId);
    await setDoc(presenceRef, {
      userId,
      status,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log(`Successfully set presence for user ${userId} to ${status}`);
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error setting user presence:', error);
    return { success: false, error: error.message };
  }
}

// Get user presence status
export async function getUserPresence(userId: string): Promise<{ presence: UserPresence | null; error: string | null }> {
  try {
    if (!db) {
      return { presence: null, error: 'Firestore not initialized' };
    }
    
    const presenceRef = doc(db, 'presence', userId);
    const presenceSnap = await getDoc(presenceRef);
    
    if (presenceSnap.exists()) {
      return { presence: presenceSnap.data() as UserPresence, error: null };
    }
    
    return { presence: null, error: null };
  } catch (error: any) {
    console.error('Error getting user presence:', error);
    return { presence: null, error: error.message };
  }
}

// Listen to user presence changes
export function subscribeToUserPresence(
  userId: string,
  callback: (presence: UserPresence | null) => void
) {
  if (typeof window === 'undefined' || !db) {
    console.warn('Firestore DB not initialized for subscribeToUserPresence during SSR or invalid config.');
    callback(null);
    return () => {};
  }
  
  const presenceRef = doc(db, 'presence', userId);
  
  return onSnapshot(presenceRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as UserPresence);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error listening to user presence:', error);
    callback(null);
  });
}

