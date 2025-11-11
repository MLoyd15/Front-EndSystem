import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, AlertCircle, Loader, Key, Shield } from 'lucide-react';
import axios from 'axios';
import { VITE_API_BASE } from '../config';

const API = VITE_API_BASE;

const SuperAdminLogin = () => {
  const [accessKey, setAccessKey] = useState('');
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accessKeyLoading, setAccessKeyLoading] = useState(false);
  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccessKeySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAccessKeyLoading(true);

    try {
      const response = await fetch(`${API}/auth/validate-access-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessKey })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid access key');
      }

      if (data.success) {
        setIsAccessGranted(true);
        setError('');
      } else {
        throw new Error('Access denied');
      }
      
    } catch (err) {
      console.error('Access key validation error:', err);
      setError(err.message || 'Invalid access key');
    } finally {
      setAccessKeyLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid email or password');
      }

      // If server indicates OTP is needed, switch to OTP stage
      if (data.requiresOtp) {
        setOtpStage(true);
        setError('');
      } else {
        if (!data.token || !data.user) {
          throw new Error('Invalid response from server');
        }
        if (data.user.role !== 'superadmin') {
          throw new Error('Access denied. Super admin privileges required.');
        }
        localStorage.setItem('pos-token', data.token);
        localStorage.setItem('pos-user', JSON.stringify(data.user));
        window.location.href = '/admin-dashboard';
      }
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setOtpLoading(true);
    try {
      const response = await fetch(`${API}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'OTP verification failed');
      }
      localStorage.setItem('pos-token', data.token);
      localStorage.setItem('pos-user', JSON.stringify(data.user));
      window.location.href = '/admin-dashboard';
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError(err.message || 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError('');
    try {
      const response = await fetch(`${API}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to resend OTP');
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
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
            Owner Access Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {!isAccessGranted ? 'Secure Access Required' : 'Welcome Back'}
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

          {!isAccessGranted ? (
            /* Access Key Form */
            <form onSubmit={handleAccessKeySubmit} className="space-y-5">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-600 text-sm">
                  Enter the secure access key to proceed to owner login
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Access Key
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
                    placeholder="Enter secure access key"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={accessKeyLoading}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:from-red-700 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {accessKeyLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Validate Access Key
                  </>
                )}
              </button>

              <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-red-800 text-center">
                  🔐 This portal requires a secure access key. Contact the system administrator if you don't have access.
                </p>
              </div>
            </form>
          ) : (
            /* Login or OTP Form */
            !otpStage ? (
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
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                  placeholder="owner@goagri.com"
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
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In as Owner'
              )}
            </button>

            {/* Divider */}
            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Owner Only</span>
              </div>
            </div>

            {/* Role Information */}
            <div className="mt-6">
              <div className="p-4 bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-900">Owner Access</p>
                    <p className="text-xs text-green-700">Full system control & maintenance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-800 text-center">
                🔒 This is a restricted access area. All login attempts are monitored and logged.
              </p>
            </div>
          </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none tracking-widest"
                  placeholder="6-digit code"
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {otpLoading ? (<><Loader className="w-5 h-5 animate-spin" /> Verifying...</>) : 'Verify OTP'}
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                  className="text-sm text-green-700 hover:text-green-800 font-semibold disabled:opacity-50"
                >
                  {resendLoading ? 'Resending…' : 'Resend code'}
                </button>
                <span className="text-xs text-gray-500">Code expires in 5 minutes</span>
              </div>
            </form>
          )
          )}
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
            Protected by enterprise-grade security
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

export default SuperAdminLogin;