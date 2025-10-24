import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Clock, CheckCircle, XCircle, User } from 'lucide-react';
import io from 'socket.io-client';
import { VITE_API_BASE, VITE_SOCKET_URL } from "../config";

// API Configuration - Update these URLs to match your backend
const API_BASE_URL = VITE_API_BASE;
const SOCKET_URL = VITE_SOCKET_URL;

const AdminChatSystem = () => {
  const [socket, setSocket] = useState(null);
  const [pendingChats, setPendingChats] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Get auth token from localStorage
 const getAuthToken = () => {
  try {
    // Method 1: Try 'pos-token' (your actual token key)
    const posToken = localStorage.getItem('pos-token');
    if (posToken) {
      console.log('✅ Token found in pos-token');
      return posToken;
    }
    
    // Method 2: Try 'pos-user' object (fallback)
    const posUserStr = localStorage.getItem('pos-user');
    if (posUserStr) {
      const posUser = JSON.parse(posUserStr);
      if (posUser.token) {
        console.log('✅ Token found in pos-user.token');
        return posUser.token;
      }
    }
    
    // Method 3: Try direct 'token'
    const directToken = localStorage.getItem('token');
    if (directToken) {
      console.log('✅ Token found in token');
      return directToken;
    }
    
    console.error('❌ No token found');
    return null;
  } catch (error) {
    console.error('❌ Error getting token:', error);
    return null;
  }
};
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    // Listen for new support requests
    newSocket.on('new_support_request', (data) => {
      fetchPendingChats();
      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Support Request', {
          body: 'New customer needs assistance'
        });
      }
    });

    // Listen for support chat taken by another admin
    newSocket.on('support_chat_taken', ({ roomId }) => {
      setPendingChats(prev => prev.filter(chat => chat.roomId !== roomId));
    });

    // Listen for new messages
    newSocket.on('new_support_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for chat closed
    newSocket.on('support_chat_closed', ({ roomId }) => {
      if (selectedChat?.roomId === roomId) {
        setSelectedChat(null);
        setMessages([]);
      }
      setActiveChats(prev => prev.filter(chat => chat.roomId !== roomId));
    });

    // Listen for typing indicators
    newSocket.on('user_typing_support', ({ userId, isTyping, isAdmin }) => {
      if (!isAdmin && selectedChat) {
        setIsTyping(isTyping);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [selectedChat]);

  // Fetch pending chats on mount
  useEffect(() => {
    fetchPendingChats();
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch pending support chats
  const fetchPendingChats = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/support-chat/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPendingChats(data.chats);
      }
    } catch (error) {
      console.error('Error fetching pending chats:', error);
    }
  };

  // Accept a support chat
  const acceptChat = async (roomId) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/support-chat/${roomId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setPendingChats(prev => prev.filter(chat => chat.roomId !== roomId));
        setActiveChats(prev => [...prev, data.chatRoom]);
        selectChat(data.chatRoom);
        socket?.emit('join_support_room', roomId);
      }
    } catch (error) {
      console.error('Error accepting chat:', error);
    } finally {
      setLoading(false);
    }
  };

  // Select a chat to view messages
  const selectChat = async (chat) => {
    setSelectedChat(chat);
    socket?.emit('join_support_room', chat.roomId);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/support-chat/${chat.roomId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/support-chat/${selectedChat.roomId}/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: messageText })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessageText('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!selectedChat) return;
    
    socket?.emit('typing_support', {
      roomId: selectedChat.roomId,
      isTyping: true
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing_support', {
        roomId: selectedChat.roomId,
        isTyping: false
      });
    }, 1000);
  };

  // Close chat
  const closeChat = async () => {
    if (!selectedChat) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/support-chat/${selectedChat.roomId}/close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        socket?.emit('leave_support_room', selectedChat.roomId);
        setActiveChats(prev => prev.filter(chat => chat.roomId !== selectedChat.roomId));
        setSelectedChat(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Chat List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <MessageSquare className="mr-2" size={24} />
            Support Chats
          </h2>
        </div>

        {/* Pending Chats */}
        {pendingChats.length > 0 && (
          <div className="border-b border-gray-200">
            <div className="p-3 bg-yellow-50">
              <h3 className="text-sm font-semibold text-yellow-800 flex items-center">
                <Clock size={16} className="mr-2" />
                Pending ({pendingChats.length})
              </h3>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {pendingChats.map((chat) => (
                <div
                  key={chat.roomId}
                  className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => acceptChat(chat.roomId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <User size={20} className="text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">
                          {chat.user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(chat.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600">
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Chats */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 bg-green-50">
            <h3 className="text-sm font-semibold text-green-800 flex items-center">
              <CheckCircle size={16} className="mr-2" />
              Active ({activeChats.length})
            </h3>
          </div>
          {activeChats.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No active chats
            </div>
          ) : (
            activeChats.map((chat) => (
              <div
                key={chat.roomId}
                className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  selectedChat?.roomId === chat.roomId ? 'bg-blue-50' : ''
                }`}
                onClick={() => selectChat(chat)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">
                      {chat.user?.name || 'Customer'}
                    </p>
                    <p className="text-xs text-gray-500">Active chat</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {selectedChat.user?.name || 'Customer'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedChat.user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 flex items-center"
              >
                <XCircle size={16} className="mr-2" />
                Close Chat
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.senderType === 'admin' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.senderType === 'admin'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.senderType === 'admin'
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Select a chat to start messaging</p>
              <p className="text-sm mt-2">
                {pendingChats.length > 0
                  ? `${pendingChats.length} customer(s) waiting`
                  : 'No pending requests'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChatSystem;