import React from "react";

const stylesByType = {
  success: {
    panel: "bg-green-50 border-green-200",
    iconBg: "bg-green-100",
    icon: "text-green-700",
    title: "text-green-800",
  },
  error: {
    panel: "bg-red-50 border-red-200",
    iconBg: "bg-red-100",
    icon: "text-red-700",
    title: "text-red-800",
  },
  warning: {
    panel: "bg-amber-50 border-amber-200",
    iconBg: "bg-amber-100",
    icon: "text-amber-700",
    title: "text-amber-800",
  },
  info: {
    panel: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-100",
    icon: "text-blue-700",
    title: "text-blue-800",
  },
};

export default function AlertModal({ open, onClose, title, message, type = "info" }) {
  if (!open) return null;
  const s = stylesByType[type] || stylesByType.info;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[480px] max-w-[90vw] rounded-2xl bg-white shadow-xl p-6">
        <div className={`rounded-xl border p-4 ${s.panel}`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.iconBg}`}>
              <span className={`text-lg ${s.icon}`}>{type === "success" ? "✓" : type === "error" ? "!" : type === "warning" ? "!" : "i"}</span>
            </div>
            <div className="flex-1">
              <div className={`font-semibold ${s.title}`}>{title || (type === "success" ? "Success" : type === "error" ? "Error" : type === "warning" ? "Warning" : "Notice")}</div>
              <div className="text-slate-700 mt-1">{message}</div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-slate-900 text-white py-3 font-semibold hover:bg-slate-800"
        >
          OK
        </button>
      </div>
    </div>
  );
}