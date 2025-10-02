import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import dayjs from "dayjs";
import axios from "axios";
import { VITE_API_BASE, VITE_SOCKET_URL} from "../config"

const API = VITE_SOCKET_URL

export default function ChatPanel({ orderId, role = "driver", onClose }) {
  const token = localStorage.getItem("pos-token") || "";
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const socketRef = useRef(null);
  const listRef = useRef(null);

  // Load history
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/chat/history`, {
          params: { orderId, limit: 100 },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!live) return;
        setMessages(data?.messages || []);
      } catch (e) {
        console.error("history error", e);
      }
    })();
    return () => { live = false; };
  }, [API, orderId, token]);

  // Connect socket
  useEffect(() => {
    const s = io(API, { auth: { token, orderId } });
    socketRef.current = s;

    s.on("connect", () => setConnecting(false));
    s.on("message", (msg) => setMessages((m) => [...m, msg]));
    s.on("typing", ({ isTyping }) => setPeerTyping(!!isTyping));
    s.on("disconnect", () => setConnecting(true));

    return () => s.disconnect();
  }, [API, orderId, token]);

  // Auto scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, peerTyping]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    socketRef.current?.emit("message", { orderId, text: t });
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="text-sm font-semibold">
          Order Chat • <span className="text-slate-500">{String(orderId).slice(-6)}</span>
          {connecting && <span className="ml-2 text-xs text-amber-600">connecting…</span>}
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
        {messages.map((m) => {
          const mine = m.from === role; // "driver" or "customer"
          return (
            <div key={m._id || m.createdAt + Math.random()} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm
                ${mine ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                <div className="whitespace-pre-wrap">{m.text}</div>
                <div className={`text-[10px] mt-1 opacity-70 ${mine ? "text-white" : "text-slate-500"}`}>
                  {dayjs(m.createdAt).format("MMM D, HH:mm")}
                </div>
              </div>
            </div>
          );
        })}
        {peerTyping && <div className="text-xs text-slate-500 px-2">…typing</div>}
      </div>

      {/* Composer */}
      <div className="p-3 border-t flex gap-2 bg-white">
        <input
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            socketRef.current?.emit("typing", { orderId, isTyping: !!v });
          }}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message"
          className="flex-1 px-3 py-2 rounded-xl ring-1 ring-slate-200 outline-none"
        />
        <button onClick={send} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">
          Send
        </button>
      </div>
    </div>
  );
}
