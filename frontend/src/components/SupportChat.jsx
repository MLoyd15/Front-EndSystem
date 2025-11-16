import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [allChats, setAllChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [unreadCounts, setUnreadCounts] = useState({});
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedChatRef = useRef(null);
  const currentRoomIdRef = useRef(null);

  // Helper function to get display name for chat user
  const getChatDisplayName = (chat) => {
    if (!chat || !chat.user) {
      return 'Anonymous User';
    }
    
    const user = chat.user;
    
    if (user.name && user.name !== 'undefined' && user.name.trim() !== '') {
      return user.name;
    }
    if (user.fullName && user.fullName !== 'undefined' && user.fullName.trim() !== '') {
      return user.fullName;
    }
    if (user.firstName && user.lastName) {
      const fullName = `${user.firstName} ${user.lastName}`.trim();
      if (fullName !== 'undefined undefined' && fullName !== '' && !fullName.includes('undefined')) {
        return fullName;
      }
    }
    if (user.firstName && user.firstName !== 'undefined' && user.firstName.trim() !== '') {
      return user.firstName;
    }
    if (user.username && user.username !== 'undefined' && user.username.trim() !== '') {
      return user.username;
    }
    if (user.email && user.email !== 'undefined' && user.email.trim() !== '') {
      const emailName = user.email.split('@')[0];
      const displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      return displayName;
    }
    
    return 'Customer';
  };

  // Get auth token from localStorage
  const getAuthToken = () => {
    try {
      const posToken = localStorage.getItem('pos-token');
      if (posToken) {
        console.log('✅ Token found in pos-token');
        return posToken;
      }
      
      const posUserStr = localStorage.getItem('pos-user');
      if (posUserStr) {
        const posUser = JSON.parse(posUserStr);
        if (posUser.token) {
          console.log('✅ Token found in pos-user.token');
          return posUser.token;
        }
      }
      
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

  // Load/save unread counts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('support-unread-counts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') setUnreadCounts(parsed);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('support-unread-counts', JSON.stringify(unreadCounts));
    } catch (_) {}
  }, [unreadCounts]);

  const incrementUnread = (roomId, amount = 1) => {
    if (!roomId) return;
    setUnreadCounts(prev => ({ ...prev, [roomId]: (prev[roomId] || 0) + amount }));
  };

  const clearUnread = (roomId) => {
    if (!roomId) return;
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
  };

  // Fetch pending chats
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

  const fetchActiveChats = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/support-chat/active`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setActiveChats(data.chats);
      }
    } catch (error) {
      console.error('Error fetching active chats:', error);
    }
  };

  // Fetch all chats (history)
  const fetchAllChats = async (page = 1) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/support-chat/all?page=${page}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAllChats(data.chats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching all chats:', error);
    }
  };

  // Compute history-only chats on the client (exclude active/waiting)
  const historyChats = useMemo(() => {
    return (allChats || []).filter((chat) => chat.status === 'closed');
  }, [allChats]);

  // Socket initialization
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const newSocket = io(SOCKET_URL, { auth: { token } });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err?.message || err);
    });

    newSocket.on('new_support_request', (data) => {
      fetchPendingChats();
      const roomId = data?.roomId || data?.chat?.roomId || data?.room?.id;
      if (roomId) incrementUnread(roomId, 1);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Support Request', { body: 'New customer needs assistance' });
      }
    });
  
    newSocket.on('support_chat_taken', ({ roomId }) => {
      setPendingChats(prev => prev.filter(chat => chat.roomId !== roomId));
      clearUnread(roomId);
    });
  
    newSocket.on('new_support_message', (message) => {
      const isFromUser = message?.senderType && message.senderType !== 'admin';
      if (isFromUser) {
        setActiveTab('active');
        fetchActiveChats();
      }
      const currentRoom = currentRoomIdRef.current;
      if (message?.roomId && currentRoom && message.roomId === currentRoom) {
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === message.id);
          return exists ? prev : [...prev, message];
        });
      } else if (message?.roomId) {
        incrementUnread(message.roomId, 1);
      }
    });
  
    newSocket.on('support_chat_closed', ({ roomId }) => {
      if (selectedChatRef.current?.roomId === roomId) {
        setSelectedChat(null);
        selectedChatRef.current = null;
        currentRoomIdRef.current = null;
        setMessages([]);
      }
      setActiveChats(prev => prev.filter(chat => chat.roomId !== roomId));
      clearUnread(roomId);
    });
  
    newSocket.on('user_typing_support', ({ isTyping, isAdmin }) => {
      if (!isAdmin && selectedChatRef.current) {
        setIsTyping(isTyping);
      }
    });
  
    setSocket(newSocket);
    return () => newSocket.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch chats on mount and tab change
  useEffect(() => {
    fetchPendingChats();
    fetchActiveChats();
    if (activeTab === 'history') {
      fetchAllChats();
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 1-second polling for active list and messages
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (activeTab === 'active') {
          await fetchActiveChats();
        }
        if (selectedChat) {
          const token = getAuthToken();
          const response = await fetch(`${API_BASE_URL}/support-chat/${selectedChat.roomId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (data.success && Array.isArray(data.messages)) {
            setMessages(data.messages);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, activeTab]);

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
        clearUnread(roomId);
      }
    } catch (error) {
      console.error('Error accepting chat:', error);
    } finally {
      setLoading(false);
    }
  };

  // Select a chat to view messages
  const selectChat = async (chat) => {
    if (currentRoomIdRef.current) {
      socket?.emit('leave_support_room', currentRoomIdRef.current);
    }
  
    setSelectedChat(chat);
    selectedChatRef.current = chat;
    currentRoomIdRef.current = chat.roomId;
    socket?.emit('join_support_room', chat.roomId);
    clearUnread(chat.roomId);
  
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

    const messageToSend = messageText.trim();
    const tempMessageId = `temp_${Date.now()}`;
    
    const tempMessage = {
      id: tempMessageId,
      message: messageToSend,
      senderType: 'admin',
      sender: {
        id: 'current_admin',
        name: 'You',
        role: 'admin'
      },
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setMessageText('');

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/support-chat/${selectedChat.roomId}/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: messageToSend })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessageId ? data.message : msg
        ));
        try {
          await fetchActiveChats();
          const token2 = getAuthToken();
          const resp2 = await fetch(`${API_BASE_URL}/support-chat/${selectedChat.roomId}/messages`, {
            headers: { 'Authorization': `Bearer ${token2}` }
          });
          const data2 = await resp2.json();
          if (data2.success && Array.isArray(data2.messages)) {
            setMessages(data2.messages);
          }
        } catch (_) {}
      } else {
        setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
        setMessageText(messageToSend);
        console.error('Failed to send message:', data.message);
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      setMessageText(messageToSend);
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
        headers: { 'Authorization': `Bearer ${token}` }
      });
  
      if (response.ok) {
        socket?.emit('leave_support_room', selectedChat.roomId);
        setActiveChats(prev => prev.filter(chat => chat.roomId !== selectedChat.roomId));
        setSelectedChat(null);
        selectedChatRef.current = null;
        currentRoomIdRef.current = null;
        setMessages([]);
        setActiveTab('active');
        fetchActiveChats();
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

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button 
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'pending' 
                ? 'bg-yellow-50 text-yellow-800 border-b-2 border-yellow-500' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('pending')}
          >
            <Clock size={16} className="inline mr-2" />
            Pending ({pendingChats.length})
          </button>
          <button 
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'active' 
                ? 'bg-green-50 text-green-800 border-b-2 border-green-500' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('active')}
          >
            <CheckCircle size={16} className="inline mr-2" />
            Active ({activeChats.length})
          </button>
          <button 
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'history' 
                ? 'bg-blue-50 text-blue-800 border-b-2 border-blue-500' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>

        {/* Chat Lists */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'pending' && (
            <div>
              {pendingChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No pending chats
                </div>
              ) : (
                pendingChats.map((chat) => (
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
                            {getChatDisplayName(chat)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(chat.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      {unreadCounts[chat.roomId] > 0 && (
                        <span className="mr-2 px-2 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                          {unreadCounts[chat.roomId]}
                        </span>
                      )}
                      <button className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600">
                        Accept
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'active' && (
            <div>
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
                          {getChatDisplayName(chat)}
                        </p>
                        <p className="text-xs text-gray-500">Active chat</p>
                      </div>
                      {unreadCounts[chat.roomId] > 0 && (
                        <span className="ml-auto px-2 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full">
                          {unreadCounts[chat.roomId]}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {historyChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No chat history
                </div>
              ) : (
                <>
                  {historyChats.map((chat) => (
                    <div
                      key={chat.roomId}
                      className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        selectedChat?.roomId === chat.roomId ? 'bg-blue-50' : ''
                      } ${chat.status === 'closed' ? 'opacity-75' : ''}`}
                      onClick={() => selectChat(chat)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User size={20} className="text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-gray-800">
                              {getChatDisplayName(chat)}
                            </p>
                            <span className={`px-2 py-1 text-xs rounded ${
                              chat.status === 'closed' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {chat.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(chat.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="p-4 flex items-center justify-between border-t border-gray-200">
                      <button 
                        onClick={() => fetchAllChats(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                      <button 
                        onClick={() => fetchAllChats(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
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
                    {getChatDisplayName(selectedChat)}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedChat.user?.email || 'No email provided'}
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