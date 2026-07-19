import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../../hooks/use-auth";
import { useLanguage } from "../../../lib/LanguageContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../../lib/supabase-code";
import {
  MessageSquare,
  ArrowLeft,
  Send,
  Loader2,
  FileUp,
  BookOpen,
} from "lucide-react";
import { AcademicReviewer } from "../../../components/AcademicReviewer";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { validateFile, sanitizeFilename, safeStoragePath } from "../../../lib/upload-security";

export const Route = createFileRoute("/levels/classroom/$levelId")({
  component: LevelClassroomPage,
});

function LevelClassroomPage() {
  const params = Route.useParams();
  const { levelId } = params;
  const { isAr } = useLanguage();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [levelTitle, setLevelTitle] = useState("");
  const [levelContent, setLevelContent] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "review">("chat");
  const [selectedChatTab, setSelectedChatTab] = useState<string>("general");
  const [lectures, setLectures] = useState<{ id: string; title: string; slot_number: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccessToLevel, setHasAccessToLevel] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLevelDetailsAndAccess = useCallback(async () => {
    if (!user) {
      toast.error("Please log in");
      navigate({ to: "/levels" });
      return;
    }

    setLoading(true);
    try {
      const [levelRes, lecturesRes] = await Promise.all([
        supabase.from("levels").select("title").eq("id", levelId).single(),
        supabase
          .from("lectures")
          .select("id, title, description, slot_number")
          .eq("level_id", levelId)
          .order("slot_number", { ascending: true }),
      ]);

      if (levelRes.error) throw levelRes.error;

      setLevelTitle(levelRes.data?.title || "Unknown Level");
      setLectures(lecturesRes.data || []);

      const aggregatedContent =
        lecturesRes.data
          ?.map((l) => `${l.title}\n${l.description}`)
          .join("\n\n") || "";
      setLevelContent(aggregatedContent);

      setHasAccessToLevel(true);
      setLoading(false);
    } catch (error) {
      console.error("DEBUG: Failed to fetch level details:", error);
      setLoading(false);
      navigate({ to: "/levels" });
    }
  }, [levelId, user, navigate]);

  useEffect(() => {
    fetchLevelDetailsAndAccess();
  }, [fetchLevelDetailsAndAccess]);

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!hasAccessToLevel) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,oklch(0.98_0.01_110/0.05)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.98_0.01_110/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0"></div>

      <div className="container mx-auto max-w-7xl relative z-10 pt-10 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-12">
          <button
            onClick={() => navigate({ to: "/levels" })}
            className="group flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center group-hover:border-primary">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">
              {isAr ? "العودة" : "RETURN"}
            </span>
          </button>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            {isAr ? `فصل: ${levelTitle}` : `CLASSROOM: ${levelTitle}`}
          </h1>
          <div className="w-20"></div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest ${activeTab === "chat" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
          >
            <MessageSquare className="w-4 h-4" />
            {isAr ? "المحادثة" : "CHAT"}
          </button>
          <button
            onClick={() => setActiveTab("review")}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest ${activeTab === "review" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
          >
            <BookOpen className="w-4 h-4" />
            {isAr ? "المراجعة" : "STUDY REVIEW"}
          </button>
        </div>

        {activeTab === "chat" && lectures.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
            <button
              onClick={() => setSelectedChatTab("general")}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${
                selectedChatTab === "general"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {isAr ? "عام" : "GENERAL"}
            </button>
            {lectures.map((lec) => (
              <button
                key={lec.id}
                onClick={() => setSelectedChatTab(lec.id)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${
                  selectedChatTab === lec.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {isAr ? `الدرس ${lec.slot_number}` : `UNIT ${lec.slot_number}`}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1">
          {activeTab === "chat" ? (
            <LevelChat
              levelId={levelId}
              lectureId={selectedChatTab !== "general" ? selectedChatTab : undefined}
              isAr={isAr}
            />
          ) : (
            <div className="h-full overflow-y-auto custom-scrollbar">
              <AcademicReviewer
                title={levelTitle}
                content={levelContent}
                isAr={isAr}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LevelChat({ levelId, lectureId, isAr }: { levelId: string; lectureId?: string; isAr: boolean }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const { profile, isAdmin, isModerator } = useAuth();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const lastSentAtRef = useRef<number>(0);
  const COOLDOWN_MS = 10 * 60 * 1000;

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      const elapsed = Date.now() - lastSentAtRef.current;
      const remaining = Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000));
      setCooldownRemaining(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const canSend = isAdmin || isModerator || cooldownRemaining <= 0;

  const fetchMessages = useCallback(async () => {
    let query = supabase
      .from("level_chats")
      .select("*, profiles(username, avatar_url, role)")
      .eq("level_id", levelId)
      .order("created_at", { ascending: true });

    if (lectureId) {
      query = query.eq("lecture_id", lectureId);
    } else {
      query = query.is("lecture_id", null);
    }

    const { data } = await query;
    if (data) setMessages(data);
  }, [levelId, lectureId]);

  useEffect(() => {
    fetchMessages();
    const channelName = lectureId ? `lecture_chat:${lectureId}` : `level:${levelId}`;
    const filter = lectureId
      ? `lecture_id=eq.${lectureId}`
      : `level_id=eq.${levelId}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "level_chats",
          filter,
        },
        () => fetchMessages(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [levelId, lectureId, fetchMessages]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile) return;
    if (!canSend) {
      const mins = Math.ceil(cooldownRemaining / 60);
      const secs = cooldownRemaining % 60;
      toast.error(isAr ? `انتظر ${mins}د ${secs}ث` : `Wait ${mins}m ${secs}s`);
      return;
    }
    const insertData: any = {
      level_id: levelId,
      sender_id: profile.id,
      content: newMessage,
    };
    if (lectureId) insertData.lecture_id = lectureId;
    const { error } = await supabase.from("level_chats").insert([insertData]);

    if (error) {
      toast.error(isAr ? "فشل إرسال الرسالة" : "Failed to send message");
    } else {
      setNewMessage("");
      if (!isAdmin && !isModerator) {
        lastSentAtRef.current = Date.now();
        setCooldownRemaining(Math.ceil(COOLDOWN_MS / 1000));
      }
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !profile || !isAdmin) return;
    const v = validateFile(file, "chatFile", true);
    if (!v.valid) { toast.error(v.error); return; }

    setIsUploading(true);
    try {
      const filePath = safeStoragePath("classroom", file.name, profile.id);
      const { error } = await supabase.storage
        .from("course_files")
        .upload(filePath, file);
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("course_files").getPublicUrl(filePath);

      const safeName = sanitizeFilename(file.name);
      const insertData: any = {
        level_id: levelId,
        sender_id: profile.id,
        content: `📎 ${isAr ? "ملف" : "FILE"}: ${safeName}\n${publicUrl}`,
      };
      if (lectureId) insertData.lecture_id = lectureId;
      const { error: insertError } = await supabase.from("level_chats").insert([insertData]);
      if (insertError) throw insertError;
      toast.success(isAr ? "تم رفع الملف" : "File uploaded to comm-link");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card rounded-4xl border border-border overflow-hidden backdrop-blur-xl">
      <header className="p-6 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-black italic uppercase tracking-widest text-sm">
            {lectureId
              ? (isAr ? "محادثة الدرس" : "LECTURE COMM-LINK")
              : (isAr ? "غرفة محادثة المستوى" : "LEVEL COMM-LINK")}
          </h3>
        </div>
      </header>
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-4 ${m.sender_id === profile?.id ? "flex-row-reverse" : ""}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-muted overflow-hidden flex-shrink-0 border border-border">
              {m.profiles?.avatar_url ? (
                <img
                  src={m.profiles.avatar_url}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground font-black">
                  {m.profiles?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div
              className={`max-w-[70%] ${m.sender_id === profile?.id ? "text-right" : ""}`}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap justify-inherit">
                <span className="font-black text-xs uppercase tracking-tight text-foreground">
                  {m.profiles?.username}
                </span>
                <span
                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    m.profiles?.role === "admin"
                      ? "bg-destructive/20 text-destructive border border-destructive/30"
                      : m.profiles?.role === "moderator"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {m.profiles?.role}
                </span>
                <span className="text-[8px] text-muted-foreground font-bold uppercase">
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p
                className={`text-sm leading-relaxed p-5 rounded-3xl ${
                  m.sender_id === profile?.id
                    ? "bg-primary/10 text-primary border border-primary/20 rounded-tr-none"
                    : "bg-muted text-foreground/70 border border-border rounded-tl-none"
                }`}
              >
                {m.content}
              </p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
            <MessageSquare className="w-16 h-16" />
            <p className="font-black uppercase tracking-[0.4em] text-xs">
              Awaiting Transmission...
            </p>
          </div>
        )}
      </div>
      <div className="p-8 bg-card border-t border-border">
        {!canSend && cooldownRemaining > 0 && (
          <div className="text-center text-xs text-muted-foreground mb-2 font-mono">
            {isAr ? `انتظر ${Math.ceil(cooldownRemaining / 60)}:${String(cooldownRemaining % 60).padStart(2, "0")}` : `Cooldown ${Math.ceil(cooldownRemaining / 60)}:${String(cooldownRemaining % 60).padStart(2, "0")}`}
          </div>
        )}
        <div className="relative max-w-4xl mx-auto group">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={
              !canSend
                ? (isAr ? "في الانتظار..." : "On cooldown...")
                : (isAr ? "أرسل تحديثات المهمة..." : "Transmit mission updates...")
            }
            className="w-full bg-muted border border-border rounded-3xl py-6 pl-8 pr-20 font-bold focus:outline-none focus:border-primary focus:bg-muted/50 transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={isUploading || !canSend}
            className={`absolute ${isAr ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 p-4 bg-primary text-primary-foreground rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50`}
          >
            <Send className={`w-5 h-5 ${isAr ? "rotate-180" : ""}`} />
          </button>

          {isAdmin && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.zip"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`absolute ${isAr ? "left-20" : "right-20"} top-1/2 -translate-y-1/2 p-4 bg-muted text-muted-foreground border border-border rounded-2xl flex items-center justify-center hover:bg-border transition-all`}
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <FileUp className="w-5 h-5" />
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
