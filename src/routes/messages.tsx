import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase-code";
import { useAuth } from "../hooks/use-auth";
import { useLanguage } from "../lib/LanguageContext";
import { Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/messages")({
  component: StudentMessagingPage,
});

function StudentMessagingPage() {
  const { user } = useAuth();
  const { isAr } = useLanguage();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
      const subscription = supabase
        .channel("student_dm")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "direct_messages" },
          () => fetchMessages(),
        )
        .subscribe();
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("direct_messages")
      .select(
        "*, sender:profiles!sender_id(username, avatar_url), receiver:profiles!receiver_id(username, avatar_url)",
      )
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "moderator"])
      .limit(1);
    const adminId = admins?.[0]?.id;

    if (!adminId) {
      toast.error(isAr ? "لم يتم العثور على مدير" : "No administrator found.");
      return;
    }

    const { error } = await supabase
      .from("direct_messages")
      .insert([
        { sender_id: user.id, receiver_id: adminId, content: newMessage },
      ]);
    if (error)
      toast.error(isAr ? "فشل إرسال الرسالة" : "Failed to send message.");
    else setNewMessage("");
  };

  return (
    <div className="h-screen bg-[#030303] text-foreground flex flex-col font-sans selection:bg-primary/30">
      {/* Sleek Compact Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-[#0A0A0A] border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center">
            <span className="font-black text-lime-400 text-[10px] italic">
              ADM
            </span>
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight">
              {isAr ? "غرفة الإدارة" : "ADMINISTRATION"}
            </h1>
            <div className="flex items-center gap-1.5 text-[8px] text-green-500 font-bold uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {isAr ? "متصل" : "SECURE CHANNEL"}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area - Compact Scrollable */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
        ref={chatContainerRef}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 gap-2">
            <Send className="w-10 h-10 opacity-20" />
            <p className="font-bold text-[10px] tracking-widest uppercase">
              {isAr ? "لا توجد رسائل بعد" : "Awaiting Transmission"}
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.sender_id === user?.id;
            const sender = isMe ? m.receiver : m.sender;

            return (
              <div
                key={i}
                className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"} mb-2`}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-muted/50 overflow-hidden flex-shrink-0 border border-border">
                    {sender?.avatar_url ? (
                      <img
                        src={sender.avatar_url}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-lime-900 text-lime-200 font-bold text-[10px]">
                        {sender?.username?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-xs ${isMe ? "bg-primary text-black rounded-tr-none" : "bg-muted/50 text-foreground rounded-tl-none border border-border"}`}
                >
                  <p className="font-medium leading-relaxed">{m.content}</p>
                  <p
                    className={`text-[8px] mt-1 font-black uppercase tracking-widest opacity-40 ${isMe ? "text-black" : "text-foreground"}`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compact Input Area */}
      <div className="p-3 bg-[#0A0A0A] border-t border-border">
        <div className="relative flex items-center gap-2">
          <input
            className="flex-1 bg-[#111] p-3 rounded-xl outline-none border border-border focus:border-primary/50 transition-all font-bold text-xs placeholder:text-muted-foreground"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={isAr ? "اكتب رسالة..." : "Type your mission update..."}
          />
          <button
            onClick={sendMessage}
            className="p-3 bg-primary text-black rounded-xl hover:scale-105 transition-all font-black uppercase tracking-widest text-[10px]"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
