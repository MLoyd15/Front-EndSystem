import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import axios from "axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSumbit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      if (response.data.success) {
        // Let AuthContext decide where to store based on rememberMe
        await login(response.data.user, response.data.token, rememberMe);

        if (response.data.user.role === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/customer/dashboard");
        }
      } else {
        alert(response.data.error);
      }
    } catch (error) {
      if (error.response) {
        setError(error.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl ring-1 ring-slate-200">
          <div className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-slate-800">Login</h1>
              <p className="text-sm text-slate-500 mt-1">
                Enter your credentials to continue.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSumbit} className="space-y-4">
              {/* Email */}
              <div className="flex flex-col space-y-1">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder-slate-400 outline-none transition focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col space-y-1">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-12 text-slate-900 placeholder-slate-400 outline-none transition focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    title={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? (
                      // Eye-off (plain SVG)
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                           fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M3 3l18 18M10.477 10.477A3 3 0 0113.5 13.5m-.618-4.905A9.953 9.953 0 0012 7.5c-4.497 0-8.472 2.82-10.5 6.75a11.14 11.14 0 002.331 3.27M17.741 17.741A9.953 9.953 0 0021 12.75a11.14 11.14 0 00-2.331-3.27 9.953 9.953 0 00-3.51-2.025" />
                      </svg>
                    ) : (
                      // Eye (plain SVG)
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                           fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M2.036 12.322C3.423 8.943 7.332 6.75 12 6.75c4.668 0 8.577 2.193 9.964 5.572a.75.75 0 010 .556C20.577 16.257 16.668 18.45 12 18.45c-4.668 0-8.577-2.193-9.964-5.572a.75.75 0 010-.556z" />
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Remember me
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-white font-medium shadow-lg shadow-indigo-600/20 outline-none transition hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Signing you in..." : "Login"}
              </button>
            </form>
          </div>
        </div>

        {/* Mobile-only brand strip */}
        <div className="lg:hidden mt-4 text-center text-slate-300 text-sm">
          Secure Admin Portal
        </div>
      </div>
    </div>
  );
};

export default Login;
