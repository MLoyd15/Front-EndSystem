import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Clock, CheckCircle, XCircle, User, AlertCircle } from 'lucide-react';
import io from 'socket.io-client';

const API_BASE_URL = 'https://goat-agri-trading-backend.onrender.com/api';
const SOCKET_URL = 'https://goat-agri-trading-backend.onrender.com';

const SupportChat = () => {
  const [socket, setSocket] = useState(null);
  const [pendingChats, setPendingChats] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // IMPROVED: Get auth token with better error handling
  const getAuthToken = () => {
    try {
      // Method 1: Try pos-user object
      const posUserStr = localStorage.getItem('pos-user');
      if (posUserStr) {
        const posUser = JSON.parse(posUserStr);
        if (posUser.token) {
          console.log('✅ Token found in pos-user');
          return posUser.token;
        }
      }
      
      // Method 2: Try direct token
      const directToken = localStorage.getItem('token');
      if (directToken) {
        console.log('✅ Token found in localStorage.token');
        return directToken;
      }
      
      console.error('❌ No token found in localStorage');
      return null;
    } catch (error) {
      console.error('❌ Error reading token:', error);
      return null;
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch pending chats with error handling
  const fetchPendingChats = async () => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        setAuthError('Not authenticated. Please login.');
        return;
      }
      
      console.log('📡 Fetching pending chats...');
      
      const response = await fetch(`${API_BASE_URL}/support-chat/pending`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        setAuthError('Session expired. Please login again.');
        // Optional: Redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Pending chats:', data);
      
      if (data.success) {
        setPendingChats(data.chats);
      }
    } catch (error) {
      console.error('❌ Error fetching pending chats:', error);
      setAuthError('Failed to load chats');
    }
  };

  // Fetch active chats
  const fetchActiveChats = async () => {
    try {
      const token = getAuthToken();
      
      if (!token) return;
      
      const response = await fetch(`${API_BASE_URL}/support-chat/active`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActiveChats(data.chats);
        }
      }
    } catch (error) {
      console.error('Error fetching active chats:', error);
    }
  };

  // Initialize
  useEffect(() => {
    const token = getAuthToken();
    
    if (!token) {
      setAuthError('Please login to access support chat');
      return;
    }
    
    fetchPendingChats();
    fetchActiveChats();
    
    // Socket.IO connection
    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to socket server');
      setAuthError(null);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setAuthError('Connection failed');
    });

    newSocket.on('new_support_request', (data) => {
      console.log('New support request:', data);
      fetchPendingChats();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Support Request', {
          body: 'New customer needs assistance'
        });
      }
    });

    newSocket.on('support_chat_taken', ({ roomId }) => {
      setPendingChats(prev => prev.filter(chat => chat.roomId !== roomId));
    });

    newSocket.on('new_support_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('support_chat_closed', ({ roomId }) => {
      if (selectedChat?.roomId === roomId) {
        setSelectedChat(null);
        setMessages([]);
      }
      setActiveChats(prev => prev.filter(chat => chat.roomId !== roomId));
    });

    newSocket.on('user_typing_support', ({ userId, isTyping, isAdmin }) => {
      if (!isAdmin && selectedChat) {
        setIsTyping(isTyping);
      }
    });

    setSocket(newSocket);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      newSocket.close();
    };
  }, [selectedChat]);

  // Accept chat
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

  // Select chat
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

  // Send message
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

  // Handle typing
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

  // Show auth error
  if (authError) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">{authError}</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-100">
      {/* Rest of your UI code stays the same */}
      {/* ... */}
    </div>
  );
};

export default SupportChat;