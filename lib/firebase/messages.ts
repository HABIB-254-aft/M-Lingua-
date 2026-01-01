// Firebase functions for direct messages/conversations between users

import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import { getCurrentUser } from './auth';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: Timestamp | Date;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[]; // Array of user IDs
  lastMessage?: string;
  lastMessageTime?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * Start a conversation with a target user
 * Checks if conversation exists, creates if not
 * Returns the conversation ID (format: userId1_userId2 sorted alphabetically)
 */
export async function startConversation(
  currentUserId: string,
  targetUserId: string
): Promise<{ conversationId: string | null; error: string | null }> {
  return createConversation(currentUserId, targetUserId);
}

/**
 * Create a new conversation between two users
 * Returns the conversation ID (format: userId1_userId2 sorted alphabetically)
 */
export async function createConversation(
  userId1: string,
  userId2: string
): Promise<{ conversationId: string | null; error: string | null }> {
  try {
    // Prevent users from starting conversations with themselves
    if (userId1 === userId2) {
      console.error('[createConversation] Cannot create conversation: users cannot message themselves');
      return { conversationId: null, error: 'Cannot start a conversation with yourself' };
    }

    // Create consistent conversation ID (sorted user IDs)
    const participants = [userId1, userId2].sort();
    const conversationId = `${participants[0]}_${participants[1]}`;

    console.log('[createConversation] Creating conversation:', {
      conversationId,
      participants,
      userId1,
      userId2,
    });

    // Check if conversation already exists
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      console.log('[createConversation] Conversation already exists:', conversationId);
      // Conversation already exists, return its ID
      return { conversationId, error: null };
    }

    // Get current user for verification
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Verify participants array before creating
    if (!participants || participants.length !== 2) {
      throw new Error('Participants array must contain exactly 2 user IDs');
    }
    if (!Array.isArray(participants)) {
      throw new Error('Participants must be an array');
    }
    if (!participants.includes(userId1) || !participants.includes(userId2)) {
      throw new Error('Participants array must include both user IDs');
    }
    if (!participants.includes(currentUser.uid)) {
      throw new Error('Current user must be in participants array');
    }
    
    // Create new conversation
    // Ensure participants array is explicitly set and contains both user IDs
    // IMPORTANT: Make sure participants is a plain array, not an object
    const conversationData = {
      participants: [...participants], // Create a new array to ensure it's a proper array
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    console.log('[createConversation] Creating new conversation with data:', {
      conversationId,
      participants: participants,
      participantsArray: Array.isArray(participants) ? participants : 'NOT AN ARRAY!',
      participantsType: typeof participants,
      participantsSize: participants.length,
      userId1,
      userId2,
      currentUserId: currentUser.uid,
      currentUserInParticipants: participants.includes(currentUser.uid),
      conversationData: {
        participants: conversationData.participants,
        participantsIsArray: Array.isArray(conversationData.participants),
        participantsSize: conversationData.participants.length,
      },
    });
    
    console.log('[createConversation] About to call setDoc with:', {
      path: `conversations/${conversationId}`,
      data: conversationData,
      participantsCheck: {
        isArray: Array.isArray(conversationData.participants),
        size: conversationData.participants.length,
        containsUser1: conversationData.participants.includes(userId1),
        containsUser2: conversationData.participants.includes(userId2),
        containsCurrentUser: conversationData.participants.includes(currentUser.uid),
        currentUserUid: currentUser.uid,
        participant0: conversationData.participants[0],
        participant1: conversationData.participants[1],
        matches0: currentUser.uid === conversationData.participants[0],
        matches1: currentUser.uid === conversationData.participants[1],
      },
    });
    
    // Ensure participants is a plain array of strings (not objects)
    const finalData = {
      participants: conversationData.participants.map((id: string) => String(id)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    console.log('[createConversation] Final data being sent:', {
      currentUserUid: currentUser.uid,
      participants: finalData.participants,
      participantsType: typeof finalData.participants,
      participantsIsArray: Array.isArray(finalData.participants),
      participant0: finalData.participants[0],
      participant1: finalData.participants[1],
      participant0Type: typeof finalData.participants[0],
      participant1Type: typeof finalData.participants[1],
      matches0: currentUser.uid === finalData.participants[0],
      matches1: currentUser.uid === finalData.participants[1],
    });
    
    await setDoc(conversationRef, finalData);
    console.log('[createConversation] Conversation created successfully:', conversationId);

    return { conversationId, error: null };
  } catch (error: any) {
    console.error('[createConversation] Error creating conversation:', error);
    console.error('[createConversation] Error code:', error.code);
    console.error('[createConversation] Error message:', error.message);
    return { conversationId: null, error: error.message };
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  receiverId: string,
  text: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    
    await setDoc(doc(messagesRef), {
      senderId,
      receiverId,
      text,
      read: false,
      timestamp: serverTimestamp(),
    });

    // Update conversation's last message and timestamp
    const conversationRef = doc(db, 'conversations', conversationId);
    await setDoc(
      conversationRef,
      {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all conversations for a user
 * 
 * Note: Requires Firestore composite index on:
 * - Collection: conversations
 * - Fields: participants (Array), updatedAt (Descending)
 * 
 * Create index at: Firebase Console > Firestore > Indexes
 * Or click the link in the console error message
 */
export async function getUserConversations(
  userId: string
): Promise<{ conversations: Conversation[]; error: string | null }> {
  try {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const conversations: Conversation[] = [];

    snapshot.forEach((doc) => {
      conversations.push({
        id: doc.id,
        ...doc.data(),
      } as Conversation);
    });

    return { conversations, error: null };
  } catch (error: any) {
    // Check if it's an index error
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      console.warn(
        '⚠️ Firestore index is building or not yet created.\n' +
        'If you just created the index, please wait 1-5 minutes for it to finish building.\n' +
        'You can check the status in Firebase Console > Firestore > Indexes.\n' +
        'Once the index shows "Enabled", refresh the page and the error will be resolved.\n\n' +
        'Index details:\n' +
        '- Collection: conversations\n' +
        '- Fields: participants (Array), updatedAt (Descending)'
      );
      return { 
        conversations: [], 
        error: 'Index is building. Please wait a few minutes and refresh. Check Firebase Console for index status.' 
      };
    }
    console.error('Error getting conversations:', error);
    return { conversations: [], error: error.message };
  }
}

/**
 * Listen to conversations for a user in real-time
 * 
 * Note: Requires Firestore composite index on:
 * - Collection: conversations
 * - Fields: participants (Array), updatedAt (Descending)
 * 
 * Create index at: Firebase Console > Firestore > Indexes
 * Or click the link in the console error message
 */
export function subscribeToConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void
): () => void {
  const conversationsRef = collection(db, 'conversations');
  const q = query(
    conversationsRef,
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const conversations: Conversation[] = [];
      snapshot.forEach((doc) => {
        conversations.push({
          id: doc.id,
          ...doc.data(),
        } as Conversation);
      });
      callback(conversations);
    },
    (error) => {
      // Handle index error gracefully
      if (error.code === 'failed-precondition' && error.message?.includes('index')) {
        console.warn(
          '⚠️ Firestore index is building or not yet created.\n' +
          'If you just created the index, please wait 1-5 minutes for it to finish building.\n' +
          'You can check the status in Firebase Console > Firestore > Indexes.\n' +
          'Once the index shows "Enabled", refresh the page and the error will be resolved.\n\n' +
          'Index details:\n' +
          '- Collection: conversations\n' +
          '- Fields: participants (Array), updatedAt (Descending)'
        );
        // Return empty array as fallback while index is building
        callback([]);
      } else {
        console.error('Error in conversations subscription:', error);
        callback([]);
      }
    }
  );
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string
): Promise<{ messages: Message[]; error: string | null }> {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const snapshot = await getDocs(q);
    const messages: Message[] = [];

    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data(),
      } as Message);
    });

    return { messages, error: null };
  } catch (error: any) {
    console.error('Error getting messages:', error);
    return { messages: [], error: error.message };
  }
}

/**
 * Listen to messages in a conversation in real-time
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): () => void {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data(),
      } as Message);
    });
    callback(messages);
  });
}

