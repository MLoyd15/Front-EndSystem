import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AlertContext = createContext({ showAlert: (message, options = {}) => window.alert(message) });

export const AlertProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Notification");
  const [type, setType] = useState("info"); // info | success | error | warning

  const inferType = (msg) => {
    const m = (msg || "").toLowerCase();
    if (m.includes("failed") || m.includes("error")) return "error";
    if (m.includes("success")) return "success";
    if (m.includes("warning")) return "warning";
    return "info";
  };

  const showAlert = (msg, opts = {}) => {
    setMessage(String(msg ?? ""));
    setTitle(opts.title || (opts.type === "success" ? "Success" : opts.type === "error" ? "Error" : opts.type === "warning" ? "Warning" : "Notification"));
    setType(opts.type || inferType(msg));
    setOpen(true);
  };

  useEffect(() => {
    const original = window.alert;
    window.alert = (msg) => showAlert(msg);
    return () => {
      window.alert = original;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctx = useMemo(() => ({ showAlert }), []);

  const icon = type === "success" ? "✅" : type === "error" ? "❌" : type === "warning" ? "⚠️" : "ℹ️";
  const color = type === "success" ? "green" : type === "error" ? "red" : type === "warning" ? "amber" : "blue";

  return (
    <AlertContext.Provider value={ctx}>
      {children}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-[90%] max-w-sm rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800">
            <div className={`px-5 pt-5 flex items-center gap-3`}>
              <span className={`text-${color}-400 text-2xl`}>{icon}</span>
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
            <div className="px-5 py-3 text-sm text-slate-200">
              {message}
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium"
                onClick={() => setOpen(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);