"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getCurrentUser } from "@/lib/firebase/auth";
import { getUserProfile, getUserPresence, UserProfile, UserPresence } from "@/lib/firebase/firestore";

export interface FriendWithProfile {
  id: string; // Friend's user ID
  name: string;
  username?: string;
  email: string;
  photoURL?: string;
  status: 'Online' | 'Offline';
  friendshipId?: string; // ID of the friendship document
}

/**
 * useFriends Hook
 * 
 * Listens to friendships collection in Firestore and hydrates with user profiles.
 * 
 * Query: Filters documents where:
 * - status == "accepted"
 * - participants array contains currentUser.uid
 * 
 * Data Hydration: Fetches user profile for the other participant
 */
export function useFriends(enabled: boolean = true) {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      setFriends([]);
      setIsLoading(false);
      return;
    }

    // Use friends subcollection directly (this is what's working in the app)
    const friendsRef = collection(db, 'users', currentUser.uid, 'friends');
    console.log('[useFriends] Setting up listener for user:', currentUser.uid, 'Collection path: users/', currentUser.uid, '/friends');
    
    const unsubscribe = onSnapshot(
      friendsRef,
      async (snapshot: QuerySnapshot<DocumentData>) => {
        console.log('[useFriends] SNAPSHOT CALLBACK FIRED - Snapshot received:', snapshot.size, 'documents');
        try {
          setIsLoading(true);
          const friendsList: FriendWithProfile[] = [];

          const hydratePromises = snapshot.docs.map(async (doc) => {
            try {
              const friendData = doc.data();
              const friendId = doc.id;
              console.log('[useFriends] Processing friend:', friendId, 'data:', friendData);

              // Skip if this is the current user (users shouldn't be able to message themselves)
              if (friendId === currentUser.uid) {
                console.log('[useFriends] Friend', friendId, 'filtered out - this is the current user');
                return null;
              }

              // Skip if friendship status exists and is not 'accepted'
              // Note: 'Online' and 'Offline' are presence statuses, not friendship statuses
              // Only filter out if status is explicitly set to something other than 'accepted' and is not a presence status
              const friendshipStatus = friendData.status;
              if (friendshipStatus && 
                  friendshipStatus !== 'accepted' && 
                  friendshipStatus !== 'Online' && 
                  friendshipStatus !== 'Offline') {
                console.log('[useFriends] Friend', friendId, 'filtered out due to friendship status:', friendshipStatus);
                return null;
              }

              // Fetch user profile
              console.log('[useFriends] Fetching profile for friend:', friendId);
              let profile: UserProfile | null = null;
              try {
                profile = await getUserProfile(friendId);
                console.log('[useFriends] Profile fetched for', friendId, ':', profile ? 'success' : 'failed');
              } catch (profileError) {
                console.error('[useFriends] Error fetching profile for', friendId, ':', profileError);
              }
              
              if (!profile) {
                // If profile fetch fails, use friendData as fallback
                console.log('[useFriends] Using fallback data for friend:', friendId);
                const fallbackFriend = {
                  id: friendId,
                  name: friendData.name || friendData.username || friendData.email || 'Unknown',
                  username: friendData.username,
                  email: friendData.email || '',
                  photoURL: friendData.photoURL || friendData.avatar,
                  status: 'Offline' as const,
                } as FriendWithProfile;
                console.log('[useFriends] Fallback friend created:', fallbackFriend);
                return fallbackFriend;
              }

              // Get user presence
              let presence = null;
              try {
                const presenceResult = await getUserPresence(friendId);
                presence = presenceResult.presence;
              } catch (presenceError) {
                console.error('[useFriends] Error fetching presence for', friendId, ':', presenceError);
              }

              const hydratedFriend = {
                id: friendId,
                name: friendData.name || profile.displayName || profile.username || profile.email,
                username: friendData.username || profile.username,
                email: friendData.email || profile.email,
                photoURL: friendData.photoURL || friendData.avatar || profile.photoURL,
                status: presence?.status === 'Online' ? 'Online' : 'Offline',
              } as FriendWithProfile;
              
              console.log('[useFriends] Hydrated friend:', hydratedFriend);
              return hydratedFriend;
            } catch (error) {
              console.error('[useFriends] Error processing friend document:', error);
              return null;
            }
          });

          const hydratedFriends = await Promise.all(hydratePromises);
          console.log('[useFriends] All friends hydrated:', hydratedFriends.length, hydratedFriends);
          
          const validFriends = hydratedFriends.filter(
            (friend): friend is FriendWithProfile => friend !== null
          );

          console.log('[useFriends] Valid friends after filtering:', validFriends.length, validFriends.map(f => ({ id: f.id, name: f.name, username: f.username })));
          setFriends(validFriends);
          setError(null);
        } catch (err: any) {
          console.error('Error in useFriends hook:', err);
          setError(err.message);
          setFriends([]);
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to friends in useFriends:', err);
        setError(err.message);
        setFriends([]);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [enabled]);

  return { friends, isLoading, error };
}

