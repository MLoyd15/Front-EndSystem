import React from 'react'

export default function ChatModal({ open, children, onClose, title = "Chat" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-xl">
        {children}
      </div>
    </div>
  );
}