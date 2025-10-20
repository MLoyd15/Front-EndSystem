import React, { useState } from "react";
import { User, Lock, Eye, EyeOff, AlertCircle, Loader, Truck } from 'lucide-react';
import { VITE_API_BASE, VITE_SOCKET_URL } from "../config"

// ─── Config ────────────────────────────────────────────────────────────────────
const API = VITE_API_BASE;

// Mock functions - replace with your actual imports
const useAuth = () => ({
  login: async (user, token) => {
    localStorage.setItem('pos-token', token);
    localStorage.setItem('pos-user', JSON.stringify(user));
  }
});

const useNavigate = () => (path) => {
  window.location.href = path;
};

const Login = () => {
  const [activeTab, setActiveTab] = useState("admin");
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = activeTab === "driver" 
        ? `${API}/driver/login` 
        : `${API}/auth/login`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data?.success) {
        const who = activeTab === "driver" ? data.driver : data.user;
        await login(who, data.token);
        navigate(activeTab === "driver" ? "/driver-dashboard" : "/admin-dashboard");
      } else {
        setError(data?.message || "Login failed");
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError(null);
    setFormData({ email: '', password: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="https://res.cloudinary.com/dx9cjcodr/image/upload/v1759537836/logoAgriTrading_l1hp4e.png" 
              alt="GO AGRI TRADING"
              className="h-24 w-auto transform hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            GO AGRI TRADING
          </h1>
          <p className="text-gray-600 text-sm">
            {activeTab === "driver" ? "Driver Access Portal" : "Admin Access Portal"}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          {/* Tab Switcher */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => switchTab("admin")}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === "admin"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-200"
              }`}
            >
              👨‍💼 Admin
            </button>
            <button
              onClick={() => switchTab("driver")}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === "driver"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-200"
              }`}
            >
              🚚 Driver
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Welcome Back
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                  placeholder={activeTab === "driver" ? "driver@goagri.com" : "admin@goagri.com"}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full ${
                activeTab === "driver" 
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800" 
                  : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              } text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                `Sign In as ${activeTab === "driver" ? "Driver" : "Admin"}`
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                {activeTab === "driver" ? "Delivery Access" : "Administrative Access"}
              </span>
            </div>
          </div>

          {/* Role Information */}
          <div className="mt-6">
            <div className={`p-4 rounded-lg border-2 ${
              activeTab === "driver"
                ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200"
                : "bg-gradient-to-r from-green-50 to-yellow-50 border-green-200"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activeTab === "driver" ? "bg-blue-600" : "bg-green-600"
                }`}>
                  {activeTab === "driver" ? (
                    <Truck className="w-5 h-5 text-white" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-bold ${
                    activeTab === "driver" ? "text-blue-900" : "text-green-900"
                  }`}>
                    {activeTab === "driver" ? "Driver Access" : "Admin Access"}
                  </p>
                  <p className={`text-xs ${
                    activeTab === "driver" ? "text-blue-700" : "text-green-700"
                  }`}>
                    {activeTab === "driver" 
                      ? "Manage deliveries & orders" 
                      : "Full system management"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              Having trouble? Contact your administrator for assistance.
            </p>
          </div>
        </div>

        {/* Back to Website */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-gray-600 hover:text-green-600 transition-colors font-medium"
          >
            ← Back to Website
          </a>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} GO AGRI TRADING. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Secure login portal
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        
        .animate-shake {
          animation: shake 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Login;