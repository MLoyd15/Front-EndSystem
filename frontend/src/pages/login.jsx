import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import axios from "axios";

import { VITE_API_BASE, VITE_SOCKET_URL } from "../config"

// ─── Config ────────────────────────────────────────────────────────────────────
const API = VITE_API_BASE;
const SOCKET_URL = VITE_SOCKET_URL;

const Login = () => {
  const [activeTab, setActiveTab] = useState("admin"); // "admin" | "driver"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint =
        activeTab === "driver"
          ? "http://localhost:5000/api/driver/login"
          : "http://localhost:5000/api/auth/login";

      const res = await axios.post(endpoint, { email, password });

      if (res.data?.success) {
        // driver payload: { driver, token } | admin payload: { user, token }
        const who = activeTab === "driver" ? res.data.driver : res.data.user;
        await login(who, res.data.token);

        navigate(activeTab === "driver" ? "/driver-dashboard" : "/admin-dashboard");
      } else {
        setError(res.data?.message || "Login failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const TabButton = ({ id, label }) => {
    const isActive = activeTab === id;
    return (
      <button
        role="tab"
        aria-selected={isActive}
        onClick={() => {
          setActiveTab(id);
          setError(null);
          setEmail("");
          setPassword("");
        }}
        className={[
          "flex-1 py-2.5 text-sm font-medium rounded-xl transition",
          isActive
            ? "bg-blue-600 text-white shadow"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white shadow-lg rounded-2xl p-6">
          {/* Tabs */}
          <div
            role="tablist"
            className="flex gap-2 bg-slate-100 p-1 rounded-xl mb-6"
          >
            <TabButton id="admin" label="Admin" />
            <TabButton id="driver" label="Driver" />
          </div>

          <h1 className="text-xl font-semibold text-gray-800 text-center mb-4">
            {activeTab === "driver" ? "Driver Login" : "Admin Login"}
          </h1>

          {error && (
            <div className="bg-red-100 text-red-700 border border-red-200 p-2 mb-4 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={activeTab === "driver" ? "current-password" : "current-password"}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Login"}
            </button>
          </form>
        </div>

        {/* Tiny helper links (optional) */}
        <div className="text-center mt-3 text-xs text-slate-500">
          Having trouble? Contact your administrator.
        </div>
      </div>
    </div>
  );
};

export default Login;
