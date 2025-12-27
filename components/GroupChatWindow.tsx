"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface GroupChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  group: any; // Group object with id, name, members, etc.
  currentUser: any; // Current logged-in user
}

interface GroupMessage {
  id: string;
  senderId: string;
  groupId: string;
  text: string;
  timestamp: string;
  reactions?: Record<string, string[]>;
  attachments?: Array<{
    id: string;
    type: 'image' | 'file';
    name: string;
    data: string;
    mimeType: string;
    size?: number;
  }>;
}

export default function GroupChatWindow({ isOpen, onClose, group, currentUser }: GroupChatWindowProps) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Get group chat storage key
  const getGroupChatKey = (groupId: string) => {
    return `mlingua_group_chat_${groupId}`;
  };

  // Load messages from localStorage
  const loadMessages = useCallback(() => {
    if (!group?.id) return;

    try {
      const chatKey = getGroupChatKey(group.id);
      const messagesData = localStorage.getItem(chatKey);
      if (messagesData) {
        const loadedMessages = JSON.parse(messagesData);
        setMessages(loadedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Error loading group messages:", error);
      setMessages([]);
    }
  }, [group?.id]);

  // Save messages to localStorage
  const saveMessages = useCallback((msgs: GroupMessage[]) => {
    if (!group?.id) return;

    try {
      const chatKey = getGroupChatKey(group.id);
      localStorage.setItem(chatKey, JSON.stringify(msgs));
    } catch (error) {
      console.error("Error saving group messages:", error);
    }
  }, [group?.id]);

  // Convert file to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Send message with file support
  const sendMessage = useCallback(async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !currentUser || !group) return;

    // Convert files to base64
    const attachments = await Promise.all(
      selectedFiles.map(async (file) => {
        const base64Data = await convertFileToBase64(file);
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: file.type.startsWith('image/') ? 'image' as const : 'file' as const,
          name: file.name,
          data: base64Data,
          mimeType: file.type,
          size: file.size,
        };
      })
    );

    const message: GroupMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      groupId: group.id,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      reactions: {},
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setNewMessage("");
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [newMessage, selectedFiles, currentUser, group, messages, saveMessages]);

  // Load messages when group changes
  useEffect(() => {
    if (isOpen && group?.id) {
      loadMessages();
    }
  }, [isOpen, group?.id, loadMessages]);

  // Auto-refresh messages
  useEffect(() => {
    if (!isOpen || !group?.id) return;
    
    const interval = setInterval(() => {
      loadMessages();
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, group?.id, loadMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!isOpen) return null;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Get sender name
  const getSenderName = (senderId: string) => {
    if (senderId === currentUser?.id) return "You";
    const member = group?.members?.find((m: any) => m.id === senderId);
    return member?.name || member?.displayName || "Unknown";
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[70] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Chat Window */}
      <div className="fixed right-0 bottom-0 w-full max-w-md h-[600px] bg-white dark:bg-gray-900 shadow-2xl z-[70] flex flex-col transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-600 dark:bg-blue-700">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg flex-shrink-0">
              👥
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold truncate">
                {group?.name || "Group Chat"}
              </h3>
              <p className="text-blue-100 text-xs">
                {group?.members?.length || 0} members
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.senderId === currentUser?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[75%]">
                    {!isOwnMessage && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-1">
                        {getSenderName(message.senderId)}
                      </p>
                    )}
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? "bg-blue-600 text-white"
                          : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mb-2 space-y-2">
                          {message.attachments.map((attachment) => {
                            if (attachment.type === 'image') {
                              return (
                                <div key={attachment.id} className="rounded-lg overflow-hidden">
                                  <img
                                    src={`data:${attachment.mimeType};base64,${attachment.data}`}
                                    alt={attachment.name}
                                    className="max-w-full max-h-64 object-contain rounded-lg"
                                    loading="lazy"
                                  />
                                </div>
                              );
                            } else {
                              return (
                                <div
                                  key={attachment.id}
                                  className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-600 rounded-lg"
                                >
                                  <span className="text-2xl">📎</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                                    {attachment.size && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {(attachment.size / 1024).toFixed(1)} KB
                                      </p>
                                    )}
                                  </div>
                                  <a
                                    href={`data:${attachment.mimeType};base64,${attachment.data}`}
                                    download={attachment.name}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  >
                                    Download
                                  </a>
                                </div>
                              );
                            }
                          })}
                        </div>
                      )}
                      {/* Message Text */}
                      {message.text && (
                        <p className="text-sm break-words">{message.text}</p>
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  {file.type.startsWith('image/') ? (
                    <>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">📎</span>
                      <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    aria-label="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Select files"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Attach file"
              title="Attach file"
            >
              📎
            </button>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 resize-none"
              aria-label="Message input"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!newMessage.trim() && selectedFiles.length === 0}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:visible:outline-none focus:visible:ring-2 focus:visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

