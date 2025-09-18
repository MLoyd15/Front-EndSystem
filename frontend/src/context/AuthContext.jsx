// context/AuthContext.jsx
import { createContext, useState, useContext } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // 1) Prefer sessionStorage (non-persistent login across restarts)
    let storedUser = sessionStorage.getItem("pos-user");
    if (storedUser) return JSON.parse(storedUser);

    // 2) Only fall back to localStorage if "remember" flag is set
    const remembered = localStorage.getItem("remember") === "1";
    if (remembered) {
      storedUser = localStorage.getItem("pos-user");
      if (storedUser) return JSON.parse(storedUser);
    }
    return null;
  });

  const login = (userData, token, rememberMe = false) => {
    setUser(userData);

    if (rememberMe) {
      localStorage.setItem("remember", "1");
      localStorage.setItem("pos-user", JSON.stringify(userData));
      localStorage.setItem("pos-token", token);
      sessionStorage.removeItem("pos-user");
      sessionStorage.removeItem("pos-token");
    } else {
      localStorage.removeItem("remember");
      sessionStorage.setItem("pos-user", JSON.stringify(userData));
      sessionStorage.setItem("pos-token", token);
      localStorage.removeItem("pos-user");
      localStorage.removeItem("pos-token");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("remember");
    localStorage.removeItem("pos-user");
    localStorage.removeItem("pos-token");
    sessionStorage.removeItem("pos-user");
    sessionStorage.removeItem("pos-token");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthProvider;
