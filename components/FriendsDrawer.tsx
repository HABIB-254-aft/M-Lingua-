"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChatWindow from "./ChatWindow";
import GroupChatWindow from "./GroupChatWindow";
import { getCurrentUser } from "@/lib/firebase/auth";
import { 
  getFriends, 
  getFriendRequests, 
  getSentRequests,
  addFriend,
  removeFriend,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
} from "@/lib/firebase/firestore";

interface FriendsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendsDrawer({ isOpen, onClose }: FriendsDrawerProps) {
  const router = useRouter();
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);
  const [chatFriend, setChatFriend] = useState<any | null>(null);
  const [friendFilter, setFriendFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [friendSort, setFriendSort] = useState<'name' | 'recent' | 'status'>('name');
  const [searchFilter, setSearchFilter] = useState<'all' | 'name' | 'username' | 'email'>('all');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  // Voice navigation refs
  const voiceRecognitionRef = useRef<any | null>(null);
  const isVoiceListeningRef = useRef(false);
  const isVoiceSpeakingRef = useRef(false);
  const spokenRef = useRef(false);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);

  // Voice navigation functions
  const speakMessage = useCallback((message: string) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    try {
      synth.cancel();
      isVoiceSpeakingRef.current = true;
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "en-US";
      utterance.onend = () => {
        isVoiceSpeakingRef.current = false;
        if (isOpen && isVoiceListeningRef.current === false) {
          startVoiceRecognition();
        }
      };
      utterance.onerror = () => {
        isVoiceSpeakingRef.current = false;
        if (isOpen && isVoiceListeningRef.current === false) {
          startVoiceRecognition();
        }
      };
      synth.speak(utterance);
    } catch {
      isVoiceSpeakingRef.current = false;
    }
  }, [isOpen]);

  const stopVoiceRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.onresult = null;
          voiceRecognitionRef.current.onend = null;
          voiceRecognitionRef.current.onerror = null;
          voiceRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    } finally {
      voiceRecognitionRef.current = null;
      isVoiceListeningRef.current = false;
    }
  }, []);

  const startVoiceRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isOpen) return;
    if (isVoiceListeningRef.current) return;
    if (isVoiceSpeakingRef.current) return;
    if (isTypingRef.current) return;

    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode !== "blind") return;

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) return;

      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        try {
          const transcript = (event.results && event.results[0] && event.results[0][0] && event.results[0][0].transcript) || "";
          handleVoiceCommand(transcript.trim().toLowerCase());
        } catch {
          // ignore
        }
      };

      recognition.onerror = () => {
        isVoiceListeningRef.current = false;
        voiceRecognitionRef.current = null;
      };

      recognition.onend = () => {
        isVoiceListeningRef.current = false;
        voiceRecognitionRef.current = null;
        if (isOpen && !isVoiceSpeakingRef.current && !isTypingRef.current) {
          setTimeout(() => {
            if (isOpen && !isVoiceSpeakingRef.current && !isTypingRef.current) {
              startVoiceRecognition();
            }
          }, 500);
        }
      };

      voiceRecognitionRef.current = recognition;
      isVoiceListeningRef.current = true;
      recognition.start();
    } catch {
      isVoiceListeningRef.current = false;
      voiceRecognitionRef.current = null;
    }
  }, [isOpen]);

  const clearTypingTimer = useCallback(() => {
    if (typingTimerRef.current !== null) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  const scheduleRecognitionRestartAfterIdle = useCallback(() => {
    clearTypingTimer();
    isTypingRef.current = true;
    typingTimerRef.current = window.setTimeout(() => {
      isTypingRef.current = false;
      typingTimerRef.current = null;
      if (isOpen && !isVoiceSpeakingRef.current) {
        startVoiceRecognition();
      }
    }, 2000);
  }, [clearTypingTimer, startVoiceRecognition, isOpen]);

  const handleVoiceCommand = useCallback((command: string) => {
    stopVoiceRecognition();
    const cmd = command.toLowerCase().trim();

    // If profile is open, handle profile-specific commands first
    if (selectedFriend) {
      if (cmd.includes("close") || cmd.includes("back") || cmd.includes("go back")) {
        speakMessage("Closing profile.");
        setSelectedFriend(null);
        return;
      }
      if (cmd.includes("remove") || cmd.includes("unfriend")) {
        speakMessage(`Removing ${selectedFriend.name || selectedFriend.displayName} from friends.`);
        setSelectedFriend(null);
        handleRemoveFriend(selectedFriend);
        return;
      }
      // For other commands, close profile first
      setSelectedFriend(null);
    }

    // Close/Back command
    if (cmd.includes("close") || cmd.includes("back") || cmd.includes("go back")) {
      speakMessage("Closing friends.");
      onClose();
      return;
    }

    // Add friend command
    if (cmd.includes("add friend") || cmd.includes("add") || cmd.includes("search")) {
      setShowAddFriend(true);
      speakMessage("Add friend section opened. Use the search box to find users.");
      return;
    }

    // View friend profile by name
    if (cmd.includes("view profile") || cmd.includes("show profile") || cmd.includes("profile")) {
      const nameMatch = friends.find((f: any) => {
        const name = f.name.toLowerCase();
        const searchTerm = cmd.split("profile")[1]?.trim() || cmd.split("view")[1]?.trim() || "";
        return cmd.includes(name) || name.includes(searchTerm);
      });
      
      if (nameMatch) {
        try {
          const usersData = localStorage.getItem("mlingua_users");
          const allUsers = usersData ? JSON.parse(usersData) : [];
          const fullFriendData = allUsers.find((u: any) => u.id === nameMatch.id) || nameMatch;
          setSelectedFriend(fullFriendData);
          speakMessage(`Opening profile for ${nameMatch.name}.`);
        } catch {
          setSelectedFriend(nameMatch);
          speakMessage(`Opening profile for ${nameMatch.name}.`);
        }
        return;
      } else if (friends.length > 0) {
        speakMessage(`Please specify which friend's profile to view. Your friends are: ${friends.map((f: any) => f.name).join(", ")}.`);
        return;
      } else {
        speakMessage("You have no friends to view profiles for.");
        return;
      }
    }

    // View friends list
    if (cmd.includes("show friends") || cmd.includes("list friends") || (cmd.includes("friends") && !cmd.includes("request") && !cmd.includes("profile"))) {
      if (friends.length > 0) {
        const friendsList = friends.slice(0, 5).map((f: any) => f.name).join(", ");
        const moreText = friends.length > 5 ? ` and ${friends.length - 5} more` : "";
        speakMessage(`You have ${friends.length} friend${friends.length !== 1 ? "s" : ""}: ${friendsList}${moreText}. Say 'view profile' followed by a name to see their details.`);
      } else {
        speakMessage("You have no friends yet. Say 'add friend' to search for users.");
      }
      return;
    }

    // View friend requests
    if (cmd.includes("show requests") || cmd.includes("friend requests") || cmd.includes("requests") || cmd.includes("incoming requests")) {
      if (friendRequests.length > 0) {
        const requestsList = friendRequests.slice(0, 3).map((r: any) => r.name).join(", ");
        const moreText = friendRequests.length > 3 ? ` and ${friendRequests.length - 3} more` : "";
        speakMessage(`You have ${friendRequests.length} friend request${friendRequests.length !== 1 ? "s" : ""} from: ${requestsList}${moreText}. Say 'accept' followed by the name to accept, or 'decline' followed by the name to decline.`);
      } else {
        speakMessage("You have no friend requests.");
      }
      return;
    }

    // View sent requests
    if (cmd.includes("sent requests") || cmd.includes("pending requests") || cmd.includes("outgoing requests")) {
      if (sentRequests.length > 0) {
        const sentList = sentRequests.slice(0, 3).map((r: any) => r.name).join(", ");
        const moreText = sentRequests.length > 3 ? ` and ${sentRequests.length - 3} more` : "";
        speakMessage(`You have ${sentRequests.length} pending request${sentRequests.length !== 1 ? "s" : ""} sent to: ${sentList}${moreText}.`);
      } else {
        speakMessage("You have no sent requests.");
      }
      return;
    }

    // Accept request by name
    if (cmd.includes("accept")) {
      const nameMatch = friendRequests.find((r: any) => {
        const name = r.name.toLowerCase();
        return cmd.includes(name) || name.includes(cmd.split("accept")[1]?.trim() || "");
      });
      
      if (nameMatch) {
        handleAcceptRequest(nameMatch);
        return;
      } else if (friendRequests.length > 0) {
        speakMessage(`Please specify which request to accept. You have requests from: ${friendRequests.map((r: any) => r.name).join(", ")}.`);
        return;
      } else {
        speakMessage("You have no friend requests to accept.");
        return;
      }
    }

    // Decline request by name
    if (cmd.includes("decline") || cmd.includes("reject")) {
      const nameMatch = friendRequests.find((r: any) => {
        const name = r.name.toLowerCase();
        return cmd.includes(name) || name.includes(cmd.split("decline")[1]?.trim() || cmd.split("reject")[1]?.trim() || "");
      });
      
      if (nameMatch) {
        handleDeclineRequest(nameMatch);
        return;
      } else if (friendRequests.length > 0) {
        speakMessage(`Please specify which request to decline. You have requests from: ${friendRequests.map((r: any) => r.name).join(", ")}.`);
        return;
      } else {
        speakMessage("You have no friend requests to decline.");
        return;
      }
    }

    // Remove friend by name
    if (cmd.includes("remove friend") || cmd.includes("unfriend") || cmd.includes("delete friend")) {
      const nameMatch = friends.find((f: any) => {
        const name = f.name.toLowerCase();
        const searchTerm = cmd.split("remove")[1]?.trim() || cmd.split("unfriend")[1]?.trim() || cmd.split("delete")[1]?.trim() || "";
        return cmd.includes(name) || name.includes(searchTerm);
      });
      
      if (nameMatch) {
        // For voice commands, skip confirmation and remove directly
        try {
          const updatedFriends = friends.filter((f: any) => f.id !== nameMatch.id);
          setFriends(updatedFriends);
          localStorage.setItem("mlingua_friends", JSON.stringify(updatedFriends));
          showNotification(`${nameMatch.name} removed from friends list`, 'success');
          speakMessage(`${nameMatch.name} removed from your friends list.`);
        } catch {
          showNotification("Error removing friend", 'error');
          speakMessage("Error removing friend.");
        }
        return;
      } else if (friends.length > 0) {
        speakMessage(`Please specify which friend to remove. Your friends are: ${friends.map((f: any) => f.name).join(", ")}.`);
        return;
      } else {
        speakMessage("You have no friends to remove.");
        return;
      }
    }

    // Cancel sent request by name
    if (cmd.includes("cancel request") || cmd.includes("cancel")) {
      const nameMatch = sentRequests.find((r: any) => {
        const name = r.name.toLowerCase();
        return cmd.includes(name) || name.includes(cmd.split("cancel")[1]?.trim() || "");
      });
      
      if (nameMatch) {
        handleCancelSentRequest(nameMatch);
        return;
      } else if (sentRequests.length > 0) {
        speakMessage(`Please specify which request to cancel. You have sent requests to: ${sentRequests.map((r: any) => r.name).join(", ")}.`);
        return;
      } else {
        speakMessage("You have no sent requests to cancel.");
        return;
      }
    }

    // Help/Repeat command
    if (cmd.includes("help") || cmd.includes("repeat") || cmd.includes("what can i say")) {
      const friendsCount = friends.length;
      const requestsCount = friendRequests.length;
      const sentCount = sentRequests.length;
      const helpMessage = `Friends page. You have ${friendsCount} friend${friendsCount !== 1 ? "s" : ""}, ${requestsCount} incoming request${requestsCount !== 1 ? "s" : ""}, and ${sentCount} sent request${sentCount !== 1 ? "s" : ""}. Available commands: Say 'show friends' to list your friends, 'view profile' followed by a name to see friend details, 'show requests' to see incoming requests, 'sent requests' to see pending requests, 'add friend' to search for users, 'accept' or 'decline' followed by a name to manage requests, 'remove friend' followed by a name to unfriend, or 'close' to close. Say 'help' or 'repeat' to hear this again.`;
      speakMessage(helpMessage);
      return;
    }

    // Unrecognized command
    speakMessage("Command not recognized. Say 'help' to hear all available commands.");
  }, [friends, friendRequests, sentRequests, selectedFriend, onClose, stopVoiceRecognition, speakMessage]);

  // Define initializeMockFriends first (used by loadFriendsData)
  const initializeMockFriends = () => {
    try {
      // Get existing friends first
      const friendsData = localStorage.getItem("mlingua_friends");
      const existingFriends = friendsData ? JSON.parse(friendsData) : [];
      
      // If friends already exist, skip initialization
      if (existingFriends.length > 0) {
        return; // Already has friends
      }

      // Check if mock friends already initialized
      const mockFriendsInitialized = localStorage.getItem("mlingua_mock_friends_initialized");
      if (mockFriendsInitialized === "true" && existingFriends.length > 0) {
        return; // Already initialized and friends exist, skip
      }
      
      // If flag is set but no friends exist, reset flag to allow re-initialization
      if (mockFriendsInitialized === "true" && existingFriends.length === 0) {
        localStorage.removeItem("mlingua_mock_friends_initialized");
        console.log("🔄 Reset initialization flag - no friends found");
      }

      // Get or create users list
      const usersStr = localStorage.getItem("mlingua_users");
      let users = usersStr ? JSON.parse(usersStr) : [];

      // Mock friends data
      const mockFriends = [
        {
          id: "mock_friend_1",
          email: "sarah.johnson@example.com",
          displayName: "Sarah Johnson",
          username: "sarahj",
          birthday: "1995-03-15",
          gender: "female",
          createdAt: new Date("2023-01-15").toISOString(),
          preferences: {},
          history: [],
          status: "Online",
        },
        {
          id: "mock_friend_2",
          email: "michael.chen@example.com",
          displayName: "Michael Chen",
          username: "michaelc",
          birthday: "1992-07-22",
          gender: "male",
          createdAt: new Date("2023-02-20").toISOString(),
          preferences: {},
          history: [],
          status: "Offline",
        },
        {
          id: "mock_friend_3",
          email: "emma.williams@example.com",
          displayName: "Emma Williams",
          username: "emmaw",
          birthday: "1998-11-08",
          gender: "female",
          createdAt: new Date("2023-03-10").toISOString(),
          preferences: {},
          history: [],
          status: "Online",
        },
      ];

      // Add mock users to users list if they don't exist
      mockFriends.forEach((mockFriend) => {
        const existingUser = users.find((u: any) => u.id === mockFriend.id || u.email === mockFriend.email);
        if (!existingUser) {
          users.push(mockFriend);
        }
      });
      localStorage.setItem("mlingua_users", JSON.stringify(users));

      // Get current user to avoid adding them as their own friend
      const currentUserData = localStorage.getItem("mlingua_auth");
      const currentUser = currentUserData ? JSON.parse(currentUserData) : null;
      const currentUserId = currentUser?.id;

      // Add mock friends if they're not already in the list and not the current user
      const friendsToAdd = mockFriends
        .filter((friend) => {
          // Don't add if already a friend
          if (existingFriends.find((f: any) => f.id === friend.id)) return false;
          // Don't add if it's the current user
          if (currentUserId && friend.id === currentUserId) return false;
          return true;
        })
        .map((friend) => ({
          id: friend.id,
          name: friend.displayName,
          username: friend.username,
          email: friend.email,
          avatar: friend.displayName.charAt(0).toUpperCase(),
          status: friend.status || "Offline",
        }));

      if (friendsToAdd.length > 0) {
        const updatedFriends = [...existingFriends, ...friendsToAdd];
        localStorage.setItem("mlingua_friends", JSON.stringify(updatedFriends));
        console.log("✅ Mock friends added:", friendsToAdd.length, updatedFriends);
        
        // Mark as initialized only after successful addition
        localStorage.setItem("mlingua_mock_friends_initialized", "true");
      } else {
        console.log("⚠️ No mock friends to add - all filtered out or already exist");
      }
    } catch (error) {
      console.error("Error initializing mock friends:", error);
      // ignore errors
    }
  };

  // Define loadUnreadCounts and loadFriendsData before useEffect that uses them
  const loadUnreadCounts = useCallback(() => {
    if (!currentUser?.id) return;
    try {
      const unreadKey = `mlingua_unread_${currentUser.id}`;
      const unreadData = localStorage.getItem(unreadKey);
      if (unreadData) {
        setUnreadCounts(JSON.parse(unreadData));
      }
    } catch {
      // ignore
    }
  }, [currentUser?.id]);

  const loadFriendsData = useCallback(async () => {
    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser?.id;
      
      if (!userId) {
        // Fallback to localStorage only
        const friendsDataStr = localStorage.getItem("mlingua_friends");
        const loadedFriends = friendsDataStr ? JSON.parse(friendsDataStr) : [];
        setFriends(loadedFriends);
        return;
      }

      if (firebaseUser) {
        // Load from Firestore
        const { friends: firestoreFriends, error: friendsError } = await getFriends(userId);
        if (!friendsError && firestoreFriends.length > 0) {
          setFriends(firestoreFriends);
        } else {
          // Fallback to localStorage
          const friendsDataStr = localStorage.getItem("mlingua_friends");
          const loadedFriends = friendsDataStr ? JSON.parse(friendsDataStr) : [];
          setFriends(loadedFriends);
        }

        // Load friend requests
        const { requests: firestoreRequests, error: requestsError } = await getFriendRequests(userId);
        if (!requestsError) {
          setFriendRequests(firestoreRequests);
        } else {
          // Fallback to localStorage
          const requestsData = localStorage.getItem(`mlingua_friend_requests_${userId}`);
          setFriendRequests(requestsData ? JSON.parse(requestsData) : []);
        }

        // Load sent requests
        const { requests: firestoreSentRequests, error: sentError } = await getSentRequests(userId);
        if (!sentError) {
          setSentRequests(firestoreSentRequests);
        } else {
          // Fallback to localStorage
          const sentData = localStorage.getItem(`mlingua_sent_requests_${userId}`);
          setSentRequests(sentData ? JSON.parse(sentData) : []);
        }
      } else {
        // Fallback to localStorage only
        initializeMockFriends();
        const friendsDataStr = localStorage.getItem("mlingua_friends");
        const loadedFriends = friendsDataStr ? JSON.parse(friendsDataStr) : [];
        setFriends(loadedFriends);

        const requestsData = localStorage.getItem(`mlingua_friend_requests_${userId}`);
        setFriendRequests(requestsData ? JSON.parse(requestsData) : []);

        const sentData = localStorage.getItem(`mlingua_sent_requests_${userId}`);
        setSentRequests(sentData ? JSON.parse(sentData) : []);
      }

      // Load unread message counts
      loadUnreadCounts();

      // Load groups (still using localStorage for now)
      if (userId) {
        const groupsData = localStorage.getItem(`mlingua_groups_${userId}`);
        const loadedGroups = groupsData ? JSON.parse(groupsData) : [];
        setGroups(loadedGroups);
      }
    } catch (error) {
      console.error("Error loading friends data:", error);
      // Fallback to localStorage
      try {
        const friendsDataStr = localStorage.getItem("mlingua_friends");
        const loadedFriends = friendsDataStr ? JSON.parse(friendsDataStr) : [];
        setFriends(loadedFriends);
      } catch {
        // ignore
      }
    }
  }, [currentUser?.id, loadUnreadCounts]);

  // Create new group
  const handleCreateGroup = () => {
    if (!currentUser?.id || !newGroupName.trim() || selectedGroupMembers.length === 0) {
      showNotification("Group name and at least one member required", 'error');
      return;
    }

    try {
      // Get selected member details
      const members = [
        {
          id: currentUser.id,
          name: currentUser.displayName || currentUser.email,
          email: currentUser.email,
        },
        ...selectedGroupMembers.map((memberId) => {
          const friend = friends.find((f) => f.id === memberId);
          return friend ? {
            id: friend.id,
            name: friend.name,
            email: friend.email,
          } : null;
        }).filter(Boolean),
      ];

      const newGroup = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: newGroupName.trim(),
        members: members,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
      };

      const updatedGroups = [...groups, newGroup];
      setGroups(updatedGroups);
      localStorage.setItem(`mlingua_groups_${currentUser.id}`, JSON.stringify(updatedGroups));

      // Clear form
      setNewGroupName("");
      setSelectedGroupMembers([]);
      setShowCreateGroup(false);
      showNotification(`Group "${newGroup.name}" created!`, 'success');
    } catch {
      showNotification("Error creating group", 'error');
    }
  };

  // Toggle member selection for group creation
  const toggleGroupMember = (memberId: string) => {
    setSelectedGroupMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  useEffect(() => {
    if (!isOpen) {
      stopVoiceRecognition();
      spokenRef.current = false;
      return;
    }

    // Load current user
    const loadCurrentUser = async () => {
      try {
        // Check Firebase auth first
        const firebaseUser = getCurrentUser();
        if (firebaseUser) {
          setCurrentUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
          return;
        }
        
        // Fallback to localStorage
        const authData = localStorage.getItem("mlingua_auth");
        if (authData) {
          setCurrentUser(JSON.parse(authData));
        } else {
          onClose();
          router.push("/login");
        }
      } catch (error) {
        console.error("Error loading current user:", error);
        // Fallback to localStorage
        try {
          const authData = localStorage.getItem("mlingua_auth");
          if (authData) {
            setCurrentUser(JSON.parse(authData));
          } else {
            onClose();
            router.push("/login");
          }
        } catch {
          onClose();
          router.push("/login");
        }
      }
    };
    
    loadCurrentUser();

    // Load friends data
    loadFriendsData();

    // Listen for unread count updates
    const handleUnreadUpdate = () => {
      loadUnreadCounts();
    };
    window.addEventListener('unreadCountUpdated', handleUnreadUpdate);

    // Announce drawer opening and start voice recognition if blind mode is enabled
    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode === "blind" && !spokenRef.current) {
        spokenRef.current = true;
        const friendsCount = friends.length;
        const requestsCount = friendRequests.length;
        const sentCount = sentRequests.length;
        const message = `Friends page. You have ${friendsCount} friend${friendsCount !== 1 ? "s" : ""}, ${requestsCount} incoming request${requestsCount !== 1 ? "s" : ""}, and ${sentCount} sent request${sentCount !== 1 ? "s" : ""}. Say 'help' to hear all available commands, or 'close' to close.`;
        speakMessage(message);
      }
    } catch {
      // ignore
    }

    return () => {
      clearTypingTimer();
      stopVoiceRecognition();
      window.removeEventListener('unreadCountUpdated', handleUnreadUpdate);
      if (typeof window !== "undefined") {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, onClose, router, speakMessage, stopVoiceRecognition, clearTypingTimer, friends.length, friendRequests.length, sentRequests.length, loadUnreadCounts, loadFriendsData]);

  // Announce when profile opens
  useEffect(() => {
    if (selectedFriend && isOpen) {
      try {
        const mode = localStorage.getItem("accessibilityMode");
        if (mode === "blind") {
          const profileMessage = `Profile for ${selectedFriend.name || selectedFriend.displayName || "Friend"}. ${selectedFriend.email ? `Email: ${selectedFriend.email}. ` : ""}${selectedFriend.birthday ? `Birthday: ${new Date(selectedFriend.birthday).toLocaleDateString()}. ` : ""}${selectedFriend.gender ? `Gender: ${selectedFriend.gender}. ` : ""}Say 'close' to close the profile, or 'remove' to unfriend.`;
          speakMessage(profileMessage);
        }
      } catch {
        // ignore
      }
    }
  }, [selectedFriend, isOpen, speakMessage]);


  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const usersData = localStorage.getItem("mlingua_users");
      const allUsers = usersData ? JSON.parse(usersData) : [];
      const currentUserId = currentUser?.id;

      // Filter out current user and existing friends
      const friendsIds = friends.map((f: any) => f.id);
      const sentRequestIds = sentRequests.map((r: any) => r.id);

      const searchLower = query.toLowerCase();
      
      const filtered = allUsers.filter((user: any) => {
        if (user.id === currentUserId) return false;
        if (friendsIds.includes(user.id)) return false;
        if (sentRequestIds.includes(user.id)) return false;

        // Apply search filter
        if (searchFilter === 'name') {
          return user.displayName?.toLowerCase().includes(searchLower);
        } else if (searchFilter === 'username') {
          return user.username?.toLowerCase().includes(searchLower);
        } else if (searchFilter === 'email') {
          return user.email?.toLowerCase().includes(searchLower);
        } else {
          // 'all' - search in all fields
          return (
            user.displayName?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.username?.toLowerCase().includes(searchLower)
          );
        }
      });

      // Sort search results by relevance (exact matches first, then partial)
      const sorted = filtered.sort((a: any, b: any) => {
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

      setSearchResults(sorted);
    } catch {
      setSearchResults([]);
    }
  };

  // Filter and sort friends list
  const getFilteredAndSortedFriends = () => {
    let filtered = [...friends];

    // Apply status filter
    if (friendFilter === 'online') {
      filtered = filtered.filter((f: any) => f.status === 'Online');
    } else if (friendFilter === 'offline') {
      filtered = filtered.filter((f: any) => f.status === 'Offline' || !f.status);
    }

    // Apply sort
    filtered.sort((a: any, b: any) => {
      if (friendSort === 'name') {
        return (a.name || "").localeCompare(b.name || "");
      } else if (friendSort === 'recent') {
        // For recent, we'd need a timestamp - for now, sort by name
        return (a.name || "").localeCompare(b.name || "");
      } else if (friendSort === 'status') {
        // Online first, then offline
        if (a.status === 'Online' && b.status !== 'Online') return -1;
        if (a.status !== 'Online' && b.status === 'Online') return 1;
        return (a.name || "").localeCompare(b.name || "");
      }
      return 0;
    });

    return filtered;
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddFriend = async (user: any) => {
    if (!currentUser?.id) return;
    
    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser.id;
      
      const newRequest = {
        id: currentUser.id,
        name: currentUser.displayName || currentUser.email,
        username: currentUser.username,
        email: currentUser.email,
        avatar: (currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase(),
        photoURL: currentUser.photoURL,
        timestamp: new Date().toISOString(),
      };

      if (firebaseUser) {
        // Use Firestore
        const { success, error } = await sendFriendRequest(
          userId,
          user.id,
          {
            id: currentUser.id,
            name: currentUser.displayName || currentUser.email,
            username: currentUser.username,
            email: currentUser.email,
            avatar: (currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase(),
            photoURL: currentUser.photoURL,
          }
        );

        if (!success) {
          showNotification(`Error sending friend request: ${error}`, 'error');
          return;
        }

        // Update local state
        const sent = [...sentRequests, {
          id: user.id,
          name: user.displayName || user.email,
          username: user.username,
          email: user.email,
          avatar: (user.displayName || user.email || "U").charAt(0).toUpperCase(),
          timestamp: new Date().toISOString(),
        }];
        setSentRequests(sent);
      } else {
        // Fallback to localStorage
        const sent = [...sentRequests, {
          id: user.id,
          name: user.displayName || user.email,
          username: user.username,
          email: user.email,
          avatar: (user.displayName || user.email || "U").charAt(0).toUpperCase(),
          timestamp: new Date().toISOString(),
        }];
        setSentRequests(sent);
        localStorage.setItem(`mlingua_sent_requests_${userId}`, JSON.stringify(sent));

        // Add to receiver's incoming requests (simulate bidirectional)
        const receiverRequestsKey = `mlingua_friend_requests_${user.id}`;
        const receiverRequestsData = localStorage.getItem(receiverRequestsKey);
        const receiverRequests = receiverRequestsData ? JSON.parse(receiverRequestsData) : [];
        
        if (!receiverRequests.find((r: any) => r.id === currentUser.id)) {
          receiverRequests.push(newRequest);
          localStorage.setItem(receiverRequestsKey, JSON.stringify(receiverRequests));
        }
      }

      // Remove from search results
      setSearchResults(searchResults.filter((u: any) => u.id !== user.id));
      setSearchQuery("");
      showNotification(`Friend request sent to ${user.displayName || user.email}`, 'success');
    } catch (error) {
      console.error("Error sending friend request:", error);
      showNotification("Error sending friend request", 'error');
    }
  };

  const handleAcceptRequest = async (request: any) => {
    if (!currentUser?.id) return;
    
    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser.id;

      const newFriend = {
        id: request.id,
        name: request.name,
        username: request.username,
        email: request.email,
        avatar: request.avatar,
        photoURL: request.photoURL,
        status: "Offline",
      };

      if (firebaseUser) {
        // Use Firestore
        const { success, error } = await acceptFriendRequest(userId, request.id, newFriend);
        
        if (!success) {
          showNotification(`Error accepting friend request: ${error}`, 'error');
          return;
        }

        // Update local state
        const updatedFriends = [...friends, newFriend];
        setFriends(updatedFriends);
        
        const updatedRequests = friendRequests.filter((r: any) => r.id !== request.id);
        setFriendRequests(updatedRequests);
      } else {
        // Fallback to localStorage
        const updatedFriends = [...friends, newFriend];
        setFriends(updatedFriends);
        localStorage.setItem("mlingua_friends", JSON.stringify(updatedFriends));

        const updatedRequests = friendRequests.filter((r: any) => r.id !== request.id);
        setFriendRequests(updatedRequests);
        localStorage.setItem(`mlingua_friend_requests_${userId}`, JSON.stringify(updatedRequests));

        // Also add current user to requester's friends list (bidirectional)
        const requesterFriendsKey = "mlingua_friends";
        const requesterFriendsData = localStorage.getItem(requesterFriendsKey);
        const requesterFriends = requesterFriendsData ? JSON.parse(requesterFriendsData) : [];
        
        if (!requesterFriends.find((f: any) => f.id === currentUser.id)) {
          requesterFriends.push({
            id: currentUser.id,
            name: currentUser.displayName || currentUser.email,
            username: currentUser.username,
            email: currentUser.email,
            avatar: (currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase(),
            status: "Offline",
          });
          localStorage.setItem(requesterFriendsKey, JSON.stringify(requesterFriends));
        }

        // Remove from requester's sent requests
        const requesterSentKey = `mlingua_sent_requests_${request.id}`;
        const requesterSentData = localStorage.getItem(requesterSentKey);
        if (requesterSentData) {
          const requesterSent = JSON.parse(requesterSentData);
          const updatedRequesterSent = requesterSent.filter((r: any) => r.id !== currentUser.id);
          localStorage.setItem(requesterSentKey, JSON.stringify(updatedRequesterSent));
        }
      }

      showNotification(`${request.name} added to your friends list`, 'success');
    } catch (error) {
      console.error("Error accepting friend request:", error);
      showNotification("Error accepting friend request", 'error');
    }
  };

  const handleDeclineRequest = async (request: any) => {
    if (!currentUser?.id) return;
    
    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser.id;

      if (firebaseUser) {
        // Use Firestore
        const { success, error } = await declineFriendRequest(userId, request.id);
        
        if (!success) {
          showNotification(`Error declining friend request: ${error}`, 'error');
          return;
        }

        // Update local state
        const updatedRequests = friendRequests.filter((r: any) => r.id !== request.id);
        setFriendRequests(updatedRequests);
      } else {
        // Fallback to localStorage
        const updatedRequests = friendRequests.filter((r: any) => r.id !== request.id);
        setFriendRequests(updatedRequests);
        localStorage.setItem(`mlingua_friend_requests_${userId}`, JSON.stringify(updatedRequests));
        
        // Remove from requester's sent requests
        const requesterSentKey = `mlingua_sent_requests_${request.id}`;
        const requesterSentData = localStorage.getItem(requesterSentKey);
        if (requesterSentData) {
          const requesterSent = JSON.parse(requesterSentData);
          const updatedRequesterSent = requesterSent.filter((r: any) => r.id !== currentUser.id);
          localStorage.setItem(requesterSentKey, JSON.stringify(updatedRequesterSent));
        }
      }
      
      showNotification(`Friend request from ${request.name} declined`, 'success');
    } catch (error) {
      console.error("Error declining friend request:", error);
      showNotification("Error declining friend request", 'error');
    }
  };

  const handleRemoveFriend = async (friend: any) => {
    if (!confirm(`Are you sure you want to remove ${friend.name} from your friends list?`)) {
      return;
    }

    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser?.id;

      if (firebaseUser && userId) {
        // Use Firestore
        const { success, error } = await removeFriend(userId, friend.id);
        
        if (!success) {
          showNotification(`Error removing friend: ${error}`, 'error');
          return;
        }

        // Update local state
        const updatedFriends = friends.filter((f: any) => f.id !== friend.id);
        setFriends(updatedFriends);
      } else {
        // Fallback to localStorage
        const updatedFriends = friends.filter((f: any) => f.id !== friend.id);
        setFriends(updatedFriends);
        localStorage.setItem("mlingua_friends", JSON.stringify(updatedFriends));
      }

      showNotification(`${friend.name} removed from friends list`, 'success');
    } catch (error) {
      console.error("Error removing friend:", error);
      showNotification("Error removing friend", 'error');
    }
  };

  const handleCancelSentRequest = async (request: any) => {
    if (!currentUser?.id) return;
    
    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser.id;

      if (firebaseUser) {
        // Use Firestore
        const { success, error } = await cancelFriendRequest(userId, request.id);
        
        if (!success) {
          showNotification(`Error cancelling friend request: ${error}`, 'error');
          return;
        }

        // Update local state
        const updated = sentRequests.filter((r: any) => r.id !== request.id);
        setSentRequests(updated);
      } else {
        // Fallback to localStorage
        const updated = sentRequests.filter((r: any) => r.id !== request.id);
        setSentRequests(updated);
        localStorage.setItem(`mlingua_sent_requests_${userId}`, JSON.stringify(updated));
        
        // Remove from receiver's incoming requests
        const receiverRequestsKey = `mlingua_friend_requests_${request.id}`;
        const receiverRequestsData = localStorage.getItem(receiverRequestsKey);
        if (receiverRequestsData) {
          const receiverRequests = JSON.parse(receiverRequestsData);
          const updatedReceiverRequests = receiverRequests.filter((r: any) => r.id !== currentUser.id);
          localStorage.setItem(receiverRequestsKey, JSON.stringify(updatedReceiverRequests));
        }
      }
      
      showNotification(`Friend request to ${request.name} cancelled`, 'success');
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      showNotification("Error cancelling friend request", 'error');
    }
  };

  if (!isOpen) return null;

  if (!currentUser) {
    return null; // Will redirect to login
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-[60] animate-fade-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transform transition-all ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <span className="text-lg">{notification.type === 'success' ? '✓' : '✕'}</span>
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto transform transition-transform duration-300 ease-out">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl">
                👥
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Friends</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {friends.length} friend{friends.length !== 1 ? 's' : ''} • {friendRequests.length} request{friendRequests.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close friends"
            >
              <span className="text-lg">✕</span>
            </button>
          </div>

          {/* Create Group Button */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowCreateGroup(true)}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>👥</span>
              <span>Create Group</span>
            </button>
          </div>

          {/* Search and Add Friend Section */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400 text-lg">🔍</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim()) {
                    setShowAddFriend(true);
                    handleSearch(e.target.value);
                  } else {
                    setShowAddFriend(false);
                    setSearchResults([]);
                  }
                }}
                onFocus={() => {
                  try {
                    stopVoiceRecognition();
                  } catch {
                    // ignore
                  }
                  isTypingRef.current = true;
                  clearTypingTimer();
                }}
                onBlur={() => {
                  try {
                    scheduleRecognitionRestartAfterIdle();
                  } catch {
                    // ignore
                  }
                }}
                onInput={() => {
                  try {
                    isTypingRef.current = true;
                    scheduleRecognitionRestartAfterIdle();
                  } catch {
                    // ignore
                  }
                }}
                placeholder="Search by name, username, or email..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setShowAddFriend(false);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <span className="text-lg">✕</span>
                </button>
              )}
              {/* Search Filter */}
              {searchQuery.trim() && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Search in:</span>
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchFilter('all');
                        handleSearch(searchQuery);
                      }}
                      className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                        searchFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchFilter('name');
                        handleSearch(searchQuery);
                      }}
                      className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                        searchFilter === 'name'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Name
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchFilter('username');
                        handleSearch(searchQuery);
                      }}
                      className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                        searchFilter === 'username'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Username
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchFilter('email');
                        handleSearch(searchQuery);
                      }}
                      className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                        searchFilter === 'email'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Email
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {showAddFriend && searchQuery.trim() && (
              <div className="mt-3">
                {searchResults.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map((user: any) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {user.displayName || user.email}
                            </div>
                            {user.username && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                @{user.username}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddFriend(user)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors shadow-sm"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <p>No users found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Friends List */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Friends
                {friends.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                    {getFilteredAndSortedFriends().length}
                  </span>
                )}
              </h3>
            </div>
            
            {/* Filter and Sort Controls */}
            {friends.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setFriendFilter('all')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      friendFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFriendFilter('online')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      friendFilter === 'online'
                        ? 'bg-green-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setFriendFilter('offline')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      friendFilter === 'offline'
                        ? 'bg-gray-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    Offline
                  </button>
                </div>

                {/* Sort Dropdown */}
                <select
                  value={friendSort}
                  onChange={(e) => setFriendSort(e.target.value as 'name' | 'recent' | 'status')}
                  className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="name">Sort: Name</option>
                  <option value="status">Sort: Status</option>
                  <option value="recent">Sort: Recent</option>
                </select>
              </div>
            )}

            {friends.length > 0 ? (
              getFilteredAndSortedFriends().length > 0 ? (
                <div className="space-y-2">
                  {getFilteredAndSortedFriends().map((friend: any) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        // Load full user data from localStorage
                        try {
                          const usersData = localStorage.getItem("mlingua_users");
                          const allUsers = usersData ? JSON.parse(usersData) : [];
                          const fullFriendData = allUsers.find((u: any) => u.id === friend.id) || friend;
                          setSelectedFriend(fullFriendData);
                        } catch {
                          setSelectedFriend(friend);
                        }
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                          {friend.avatar || (friend.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                          friend.status === 'Online' ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {friend.name}
                        </div>
                        {friend.username && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            @{friend.username}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {friend.status || 'Offline'}
                        </div>
                      </div>
                      {unreadCounts[friend.id] > 0 && (
                        <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadCounts[friend.id] > 9 ? '9+' : unreadCounts[friend.id]}
                        </span>
                      )}
                    </button>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatFriend(friend);
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors"
                        title="Chat"
                      >
                        💬
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFriend(friend);
                        }}
                        className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">No friends match your filter</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Try changing the filter or sort options</p>
                </div>
              )
            ) : (
              <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-4xl mb-2">👥</div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">No friends yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Add friends to get started!</p>
              </div>
            )}
          </section>

          {/* Friend Requests */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Friend Requests
                {friendRequests.length > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-xs font-medium rounded-full">
                    {friendRequests.length}
                  </span>
                )}
              </h3>
            </div>
            {friendRequests.length > 0 ? (
              <div className="space-y-2">
                {friendRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                        {request.avatar || (request.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {request.name}
                        </div>
                        {request.username && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            @{request.username}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(request)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors shadow-sm"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineRequest(request)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-3xl mb-2">📬</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">No friend requests</p>
              </div>
            )}
          </section>

          {/* Groups Section */}
          {groups.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  Groups
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                    {groups.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => setSelectedGroup(group)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                        👥
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {group.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {group.members?.length || 0} members
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroup(group);
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                      aria-label={`Open group chat ${group.name}`}
                    >
                      💬 Chat
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Sent Requests */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Sent Requests
                {sentRequests.length > 0 && (
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                    {sentRequests.length}
                  </span>
                )}
              </h3>
            </div>
            {sentRequests.length > 0 ? (
              <div className="space-y-2">
                {sentRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                        {request.avatar || (request.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {request.name}
                        </div>
                        {request.username && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            @{request.username}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Pending
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelSentRequest(request)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2 transition-colors flex-shrink-0 ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-3xl mb-2">📤</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">No sent requests</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Friend Profile Modal */}
      {selectedFriend && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[60] transition-opacity duration-300"
            onClick={() => setSelectedFriend(null)}
            aria-hidden="true"
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-[60] overflow-y-auto transform transition-transform duration-300 ease-out">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Friend Profile</h2>
                <button
                  type="button"
                  onClick={() => setSelectedFriend(null)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Close profile"
                >
                  <span className="text-lg">✕</span>
                </button>
              </div>

              {/* Profile Content */}
              <div className="space-y-6">
                {/* Avatar and Basic Info */}
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-4xl shadow-lg mb-4">
                    {selectedFriend.avatar || (selectedFriend.name || selectedFriend.displayName || "U").charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {selectedFriend.name || selectedFriend.displayName || "Unknown"}
                  </h3>
                  {selectedFriend.username && (
                    <p className="text-gray-500 dark:text-gray-400 mb-2">@{selectedFriend.username}</p>
                  )}
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{selectedFriend.status || 'Offline'}</span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Contact Information</h4>
                    <div className="space-y-2">
                      {selectedFriend.email && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📧</span>
                          <span className="text-gray-900 dark:text-gray-100">{selectedFriend.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedFriend.birthday && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Birthday</h4>
                      <p className="text-gray-900 dark:text-gray-100">{new Date(selectedFriend.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  )}

                  {selectedFriend.gender && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Gender</h4>
                      <p className="text-gray-900 dark:text-gray-100 capitalize">{selectedFriend.gender}</p>
                    </div>
                  )}

                  {selectedFriend.createdAt && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Member Since</h4>
                      <p className="text-gray-900 dark:text-gray-100">
                        {new Date(selectedFriend.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFriend(null);
                      setChatFriend(selectedFriend);
                    }}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>💬</span>
                    <span>Start Chat</span>
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFriend(null);
                        handleRemoveFriend(selectedFriend);
                      }}
                      className="flex-1 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 transition-colors"
                    >
                      Remove Friend
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFriend(null)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create New Group</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setNewGroupName("");
                    setSelectedGroupMembers([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Members ({selectedGroupMembers.length} selected)
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 space-y-2">
                  {friends.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No friends to add. Add friends first!
                    </p>
                  ) : (
                    friends.map((friend) => (
                      <label
                        key={friend.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupMembers.includes(friend.id)}
                          onChange={() => toggleGroupMember(friend.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                            {friend.avatar || friend.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {friend.name}
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setNewGroupName("");
                    setSelectedGroupMembers([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || selectedGroupMembers.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups Section */}
      {groups.length > 0 && (
        <section className="mb-6 px-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Groups
              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                {groups.length}
              </span>
            </h3>
          </div>
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => setSelectedGroup(group)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                    👥
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {group.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {group.members?.length || 0} members
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroup(group);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  aria-label={`Open group chat ${group.name}`}
                >
                  💬 Chat
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chat Window */}
      {chatFriend && currentUser && (
        <ChatWindow
          isOpen={!!chatFriend}
          onClose={() => setChatFriend(null)}
          friend={chatFriend}
          currentUser={currentUser}
        />
      )}

      {/* Group Chat Window */}
      {selectedGroup && currentUser && (
        <GroupChatWindow
          isOpen={!!selectedGroup}
          onClose={() => setSelectedGroup(null)}
          group={selectedGroup}
          currentUser={currentUser}
        />
      )}
    </>
  );
}

