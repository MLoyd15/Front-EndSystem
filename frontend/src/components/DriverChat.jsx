import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  X, 
  ArrowLeft,
  Navigation,
  Package
} from 'lucide-react';
import io from 'socket.io-client';
import { VITE_API_BASE, VITE_SOCKET_URL } from "../config";

const API_BASE_URL = VITE_API_BASE;
const SOCKET_URL = VITE_SOCKET_URL;

const DriverChat = ({ deliveryId, onClose }) => {
  const [socket, setSocket] = useState(null);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Get auth token from localStorage
  const getAuthToken = () => {
    try {
      const posToken = localStorage.getItem('pos-token');
      if (posToken) return posToken;
      
      const posUserStr = localStorage.getItem('pos-user');
      if (posUserStr) {
        const posUser = JSON.parse(posUserStr);
        if (posUser.token) return posUser.token;
      }
      
      const directToken = localStorage.getItem('token');
      if (directToken) return directToken;
      
      return null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  // Get driver info
  const getDriverInfo = () => {
    try {
      const driver = JSON.parse(localStorage.getItem("driver") || "{}");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return Object.keys(driver).length > 0 ? driver : user;
    } catch {
      return {};
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize socket connection
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError('Authentication required');
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('new_delivery_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('delivery_chat_closed', (data) => {
      if (data.chatId === chat?.chatId) {
        setChat(prev => ({ ...prev, status: 'closed' }));
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [chat?.chatId]);

  // Create or get delivery chat
  useEffect(() => {
    if (!deliveryId) return;

    const createChat = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/delivery-chat/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ deliveryId })
        });

        const data = await response.json();
        
        if (data.success) {
          setChat(data.chat);
          // Join the chat room
          socket?.emit('join_delivery_chat', data.chat.chatId);
          // Fetch messages
          fetchMessages(data.chat.chatId);
        } else {
          setError(data.message || 'Failed to create chat');
        }
      } catch (error) {
        console.error('Error creating chat:', error);
        setError('Failed to create chat');
      } finally {
        setLoading(false);
      }
    };

    createChat();
  }, [deliveryId, socket]);

  // Fetch chat messages
  const fetchMessages = async (chatId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/delivery-chat/${chatId}/messages`, {
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
    if (!messageText.trim() || !chat || sending) return;

    const messageToSend = messageText.trim();
    setSending(true);
    setMessageText('');

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/delivery-chat/${chat.chatId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageToSend,
          messageType: 'text'
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
      } else {
        setError(data.message || 'Failed to send message');
        setMessageText(messageToSend); // Restore message on error
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      setMessageText(messageToSend); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  // Send location
  const sendLocation = async () => {
    if (!chat || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/delivery-chat/${chat.chatId}/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            latitude,
            longitude,
            address: 'Current location'
          })
        });

        const data = await response.json();
        if (data.success) {
          // Location message will be added via socket
        } else {
          setError(data.message || 'Failed to send location');
        }
      } catch (error) {
        console.error('Error sending location:', error);
        setError('Failed to send location');
      }
    }, (error) => {
      console.error('Geolocation error:', error);
      setError('Unable to get location');
    });
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Render message
  const renderMessage = (message) => {
    const isDriver = message.senderType === 'driver';
    const isSystem = message.senderType === 'system' || message.messageType === 'system';

    if (isSystem) {
      return (
        <div key={message.id} className="flex justify-center my-2">
          <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
            {message.message}
          </div>
        </div>
      );
    }

    if (message.messageType === 'location') {
      return (
        <div key={message.id} className={`flex ${isDriver ? 'justify-end' : 'justify-start'} mb-3`}>
          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isDriver 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-800'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">Location Shared</span>
            </div>
            <p className="text-sm">{message.message}</p>
            <div className="text-xs opacity-75 mt-1">
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`flex ${isDriver ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isDriver 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-800'
        }`}>
          <p className="text-sm">{message.message}</p>
          <div className="text-xs opacity-75 mt-1">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3">Loading chat...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !chat) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <X className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chat Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md h-full max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-500 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 hover:bg-blue-600 rounded"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <div>
                <h3 className="font-medium">{chat?.customerName || 'Customer'}</h3>
                <p className="text-xs opacity-90">
                  Delivery #{deliveryId?.slice(-6)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {chat?.customerPhone && (
              <a
                href={`tel:${chat.customerPhone}`}
                className="p-2 hover:bg-blue-600 rounded"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={sendLocation}
              className="p-2 hover:bg-blue-600 rounded"
              title="Share location"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation with your customer</p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending || chat?.status === 'closed'}
            />
            <button
              onClick={sendMessage}
              disabled={!messageText.trim() || sending || chat?.status === 'closed'}
              className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          {chat?.status === 'closed' && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              This chat has been closed
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverChat;