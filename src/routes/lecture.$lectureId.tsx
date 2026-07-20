import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase-code";
import { useLanguage } from "../lib/LanguageContext";
import { useAuth } from "../hooks/use-auth";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Video,
  FileText,
  ArrowLeft,
  ArrowRight,
  Zap,
  Lock,
  Settings,
  FileDown,
  Monitor,
  Brain,
  Check,
  X,
  Play,
  GraduationCap,
  MessageSquare,
  Send,
  Loader2,
  FileUp,
  BookOpen,
  Maximize2,
  ShieldAlert,
} from "lucide-react";
import { HeroButton } from "../funs/HeroButton";
import { AcademicReviewer } from "../components/AcademicReviewer";
import { LectureExam } from "../components/LectureExam";
import { toast } from "sonner";
import { validateFile, sanitizeFilename, safeStoragePath } from "../lib/upload-security";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

export const Route = createFileRoute("/lecture/$lectureId")({
  component: LecturePage,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab === "chat" ? "chat" : "content") as "content" | "chat",
  }),
});

interface ContentBlock {
  id: string;
  type:
    | "text"
    | "code"
    | "image"
    | "pdf"
    | "download"
    | "word"
    | "canvas"
    | "quiz";
  content: string;
  metadata?: {
    filename?: string;
    filesize?: string;
    quiz?: {
      question: string;
      options: string[];
      correctOptionIndex: number;
    };
  };
}

interface Lecture {
  id: string;
  title: string;
  description: string;
  video_url: string;
  pdf_url?: string;
  level_id: string;
  slot_number: number;
  content_blocks?: ContentBlock[];
  quiz_data?: any[];
  is_big_exam?: boolean;
}

function WordDocumentViewer({ url }: { url: string }) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("mammoth").then((mammoth) => {
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
        .then((result) => {
          setHtml(result.value);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    });
  }, [url]);

  if (loading) return <div className="text-muted-foreground">Loading document...</div>;
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className="prose prose-invert max-w-none"
    />
  );
}

function SecurePdfViewer({ url, isAr }: { url: string; isAr: boolean }) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const res = await fetch(url);
        const data = await res.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;

        setTotalPages(pdf.numPages);
        const container = canvasContainerRef.current;
        if (!container) return;
        container.innerHTML = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const scale = 1.8;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "w-full h-auto mb-3 rounded-lg";
          canvas.style.maxHeight = "700px";
          canvas.style.objectFit = "contain";
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          container.appendChild(canvas);
        }
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) { setError(true); setLoading(false); }
      }
    };
    render();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (!loading) {
      const block = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
          if (["s", "p", "u", "j"].includes(e.key.toLowerCase())) {
            e.preventDefault();
            return false;
          }
        }
      };
      const ctx = (e: Event) => e.preventDefault();
      const drag = (e: Event) => e.preventDefault();
      document.addEventListener("keydown", block, true);
      document.addEventListener("contextmenu", ctx, true);
      document.addEventListener("dragstart", drag, true);
      return () => {
        document.removeEventListener("keydown", block, true);
        document.removeEventListener("contextmenu", ctx, true);
        document.removeEventListener("dragstart", drag, true);
      };
    }
  }, [loading]);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      if (wrapperRef.current?.requestFullscreen) {
        wrapperRef.current.requestFullscreen();
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-3">
        <ShieldAlert className="w-10 h-10 opacity-30" />
        <p className="text-xs font-bold uppercase tracking-widest">{isAr ? "فشل تحميل الملف" : "Failed to load document"}</p>
      </div>
    );
  }

  const viewerContent = (
    <>
      {loading && (
        <div className="flex flex-col items-center justify-center h-[400px] gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? "جارٍ التحميل..." : "LOADING DOCUMENT..."}</p>
        </div>
      )}
      <div
        ref={canvasContainerRef}
        className={`p-4 md:p-6 overflow-y-auto custom-scrollbar select-none ${isFullscreen ? "h-[calc(100vh-4rem)]" : "max-h-[70vh]"}`}
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
      />
    </>
  );

  if (isFullscreen) {
    return createPortal(
      <div
        ref={wrapperRef}
        className="fixed inset-0 z-[300] bg-background flex flex-col"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              {isAr ? "وثيقة الدراسة" : "STUDY MATERIAL"}
            </span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 border border-border transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {viewerContent}
      </div>,
      document.body
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <button
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 z-20 p-2 rounded-xl bg-muted/80 backdrop-blur-sm hover:bg-muted border border-border transition-colors"
        title={isAr ? "ملء الشاشة" : "Fullscreen"}
      >
        <Maximize2 className="w-3.5 h-3.5 text-foreground" />
      </button>
      {viewerContent}
      <div className="absolute inset-0 pointer-events-none z-10" />
    </div>
  );
}

function CodeBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-0.5 rounded-2xl bg-muted border border-border overflow-hidden group/code mb-6">
      <div className="bg-card rounded-[calc(1rem+4px)] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 bg-muted border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/40"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500/40"></div>
            <div className="w-2 h-2 rounded-full bg-green-500/40"></div>
          </div>
          <button
            onClick={copyToClipboard}
            className="p-2 rounded-lg bg-muted border border-border hover:bg-primary hover:text-primary-foreground transition-all"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <div className="p-6 overflow-x-auto custom-scrollbar">
          <pre className="text-sm font-mono text-primary selection:bg-primary/20">
            <code>{content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

function ContentRenderer({
  block,
  onQuizAnswer,
  quizAnswers,
  quizStatus,
  isAr,
}: {
  block: ContentBlock;
  onQuizAnswer: (id: string, idx: number, correct: number) => void;
  quizAnswers: Record<string, number>;
  quizStatus: Record<string, "correct" | "incorrect">;
  isAr: boolean;
}) {
  if (!block || !block.type) return null;

  try {
    switch (block.type) {
      case "text":
        return (
          <p className="text-lg text-foreground/70 leading-relaxed whitespace-pre-wrap selection:bg-primary/20">
            {block.content}
          </p>
        );
      case "code":
        return <CodeBlock content={block.content} />;
      case "image":
        return (
          <img
            src={block.content}
            className="w-full rounded-3xl border border-border shadow-2xl"
            alt=""
          />
        );
      case "pdf":
        return (
          <iframe
            src={block.content}
            className="w-full h-[400px] md:h-[600px] rounded-3xl"
            title="PDF"
          />
        );
      case "download":
        return (
          <a
            href={block.content}
            className="flex items-center gap-4 p-6 bg-primary/10 rounded-2xl border border-primary/20 text-primary hover:bg-primary/20"
            download
          >
            <FileDown className="w-8 h-8" />
            <div>
              <p className="font-black uppercase">
                {block.metadata?.filename || "Download File"}
              </p>
              <p className="text-xs text-muted-foreground">
                {block.metadata?.filesize || ""}
              </p>
            </div>
          </a>
        );
      case "canvas":
        return (
          <iframe
            src={block.content}
            className="w-full h-[300px] md:h-[500px] rounded-3xl"
            title="Interactive"
          />
        );
      case "word":
        return <WordDocumentViewer url={block.content} />;
      case "quiz":
        if (!block.metadata?.quiz) return null;
        return (
          <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl">
            <p className="font-bold mb-4">{block.metadata.quiz.question}</p>
            <div className="space-y-2">
              {block.metadata.quiz.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    onQuizAnswer(
                      block.id,
                      idx,
                      block.metadata!.quiz!.correctOptionIndex,
                    )
                  }
                  className={`w-full text-left p-3 rounded-lg border ${quizAnswers[block.id] === idx ? (quizStatus[block.id] === "correct" ? "bg-green-500/20 border-green-500" : "bg-red-500/20 border-red-500") : "bg-muted border-border hover:bg-muted/80"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="text-muted-foreground p-4 border border-dashed border-border rounded-xl">
            Unsupported block type: {block.type}
          </div>
        );
    }
  } catch (e) {
    console.error("Error rendering block:", e);
    return <div className="text-red-500 p-4">Error rendering content</div>;
  }
}

function LectureChat({ lectureId, levelId, isAr }: { lectureId: string; levelId: string; isAr: boolean }) {
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
    const { data } = await supabase
      .from("level_chats")
      .select("*, profiles(username, avatar_url, role)")
      .eq("lecture_id", lectureId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  }, [lectureId]);

  useEffect(() => {
    fetchMessages();
    const subscription = supabase
      .channel(`lecture_chat:${lectureId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "level_chats",
          filter: `lecture_id=eq.${lectureId}`,
        },
        () => fetchMessages(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [lectureId, fetchMessages]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
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
    const { error } = await supabase.from("level_chats").insert([
      {
        level_id: levelId,
        lecture_id: lectureId,
        sender_id: profile.id,
        content: newMessage,
      },
    ]);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile || !isAdmin) return;
    const v = validateFile(file, "chatFile", true);
    if (!v.valid) { toast.error(v.error); return; }
    setIsUploading(true);
    try {
      const filePath = safeStoragePath("lecture-chat", file.name, profile.id);
      const { error } = await supabase.storage.from("course_files").upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("course_files").getPublicUrl(filePath);
      const safeName = sanitizeFilename(file.name);
      const { error: insertError } = await supabase.from("level_chats").insert([
        {
          level_id: levelId,
          lecture_id: lectureId,
          sender_id: profile.id,
          content: `📎 ${isAr ? "ملف" : "FILE"}: ${safeName}\n${publicUrl}`,
        },
      ]);
      if (insertError) throw insertError;
      toast.success(isAr ? "تم رفع الملف" : "File uploaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card rounded-2xl md:rounded-4xl border border-border overflow-hidden backdrop-blur-xl">
      <header className="p-4 md:p-6 border-b border-border flex items-center gap-3 bg-card">
        <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        <h3 className="font-black italic uppercase tracking-widest text-xs md:text-sm">
          {isAr ? "محادثة الدرس" : "LECTURE COMM-LINK"}
        </h3>
      </header>
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 md:gap-4 ${m.sender_id === profile?.id ? "flex-row-reverse" : ""}`}>
            <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-muted overflow-hidden flex-shrink-0 border border-border">
              {m.profiles?.avatar_url ? (
                <img src={m.profiles.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground font-black">
                  {m.profiles?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={`max-w-[70%] ${m.sender_id === profile?.id ? "text-right" : ""}`}>
              <div className="flex items-center gap-2 mb-2 flex-wrap justify-inherit">
                <span className="font-black text-xs uppercase tracking-tight text-foreground">
                  {m.profiles?.username}
                </span>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                  m.profiles?.role === "admin"
                    ? "bg-destructive/20 text-destructive border border-destructive/30"
                    : m.profiles?.role === "moderator"
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground border border-border"
                }`}>
                  {m.profiles?.role}
                </span>
                <span className="text-[8px] text-muted-foreground font-bold uppercase">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className={`text-sm leading-relaxed p-5 rounded-3xl ${
                m.sender_id === profile?.id
                  ? "bg-primary/10 text-primary border border-primary/20 rounded-tr-none"
                  : "bg-muted text-foreground/70 border border-border rounded-tl-none"
              }`}>
                {m.content}
              </p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
            <MessageSquare className="w-16 h-16" />
            <p className="font-black uppercase tracking-[0.4em] text-xs">
              {isAr ? "في انتظار الرسائل..." : "AWAITING TRANSMISSION..."}
            </p>
          </div>
        )}
      </div>
      <div className="p-4 md:p-8 bg-card border-t border-border">
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
            placeholder={!canSend ? (isAr ? "في الانتظار..." : "On cooldown...") : (isAr ? "أرسل رسالة..." : "Transmit message...")}
            className="w-full bg-muted border border-border rounded-3xl py-4 md:py-6 pl-6 md:pl-8 pr-16 md:pr-20 font-bold focus:outline-none focus:border-primary focus:bg-muted/50 transition-all text-sm md:text-base"
          />
          <button
            onClick={sendMessage}
            disabled={isUploading || !canSend}
            className={`absolute ${isAr ? "left-2" : "right-2"} top-1/2 -translate-y-1/2 p-3 md:p-4 bg-primary text-primary-foreground rounded-xl md:rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50`}
          >
            <Send className={`w-4 h-4 md:w-5 md:h-5 ${isAr ? "rotate-180" : ""}`} />
          </button>
          {isAdmin && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.zip" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`absolute ${isAr ? "left-14" : "right-14"} top-1/2 -translate-y-1/2 p-3 md:p-4 bg-muted text-muted-foreground border border-border rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-border transition-all`}
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <FileUp className="w-5 h-5" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LecturePage() {
  const { lectureId } = Route.useParams();
  const { tab } = Route.useSearch();
  const { isAr } = useLanguage();
  const { user, profile, isApproved, isAdmin, isModerator, refreshProfile } =
    useAuth();
  const navigate = useNavigate();

  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLockedBySequence, setIsLockedBySequence] = useState(false);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [nextLectureId, setNextLectureId] = useState<string | null>(null);
  const [isExamOpen, setIsExamOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "chat">(tab);

  // Video player restrictions
  const [maxTimeWatched, setMaxTimeWatched] = useState(0);
  const [isVideoFinished, setIsVideoFinished] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubePlayerRef = useRef<any>(null);

  const contentScrollRef = useRef<HTMLDivElement>(null);

  const handleVideoEnded = useCallback(() => {
    setIsVideoFinished(true);
    toast.success(
      isAr
        ? "اكتمل الفيديو! يمكنك الآن إكمال المهمة"
        : "Video completed! You can now execute the mission",
    );
  }, [isAr]);

  // Load YouTube API
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      lecture?.video_url &&
      (lecture.video_url.includes("youtube.com") ||
        lecture.video_url.includes("youtu.be"))
    ) {
      // @ts-ignore
      if (!window.YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
    }
  }, [lecture?.video_url]);

  const fetchLecture = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .eq("id", lectureId)
        .single();

      if (error) throw error;
      if (data) {
        setLecture(data);
      }

      if (user) {
        const [progressDataRes, levelAccessRes, canAccessRes] =
          await Promise.all([
            supabase
              .from("student_progress")
              .select("*")
              .eq("student_id", user.id)
              .eq("lecture_id", lectureId)
              .single(),
            supabase
              .from("level_access")
              .select("level_id")
              .eq("user_id", user.id)
              .eq("level_id", data.level_id),
            supabase.rpc("can_student_access_level", {
              u_id: user.id,
              target_level_id: data.level_id,
            }),
          ]);

        setIsCompleted(!!progressDataRes.data);
        const manual = !!(levelAccessRes.data && levelAccessRes.data.length > 0);

        if (!manual && canAccessRes.data !== true && !isAdmin && !isModerator) {
          navigate({ to: "/levels" });
          return;
        }

        const { data: allLecturesInLevel } = await supabase
          .from("lectures")
          .select("id, slot_number")
          .eq("level_id", data.level_id)
          .order("slot_number", { ascending: true });

        if (allLecturesInLevel) {
          const idx = allLecturesInLevel.findIndex((l) => l.id === lectureId);
          if (idx < allLecturesInLevel.length - 1) {
            setNextLectureId(allLecturesInLevel[idx + 1].id);
          }
        }
      }
    } catch (err) {
      navigate({ to: "/levels" });
    } finally {
      setLoading(false);
    }
  }, [lectureId, user, isAdmin, isModerator, navigate]);

  useEffect(() => {
    fetchLecture();
    setMaxTimeWatched(0);
    setIsVideoFinished(false);
  }, [lectureId, user, fetchLecture]);

  useEffect(() => {
    const handleScroll = () => {
      if (contentScrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentScrollRef.current;
        if (scrollHeight - scrollTop <= clientHeight + 50) setHasScrolledToEnd(true);
      }
    };
    const currentRef = contentScrollRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
      if (currentRef.scrollHeight <= currentRef.clientHeight) setHasScrolledToEnd(true);
    }
    return () => currentRef?.removeEventListener("scroll", handleScroll);
  }, [lecture, loading]);

  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizStatus, setQuizStatus] = useState<Record<string, "correct" | "incorrect">>({});

  const handleQuizAnswer = (blockId: string, idx: number, correct: number) => {
    setQuizAnswers((p) => ({ ...p, [blockId]: idx }));
    setQuizStatus((p) => ({ ...p, [blockId]: idx === correct ? "correct" : "incorrect" }));
  };

  const handleCompleteRequest = () => {
    if (!hasScrolledToEnd && !isAdmin && !isModerator) {
      toast.error(isAr ? "يرجى قراءة المهمة بالكامل" : "Please read the full mission briefing");
      return;
    }
    if (!isVideoFinished && lecture?.video_url && !isAdmin && !isModerator) {
      toast.error(isAr ? "يرجى إنهاء الفيديو أولاً" : "Please finish the video first");
      return;
    }

    if (lecture?.quiz_data && lecture.quiz_data.length > 0 && !isCompleted) {
      setIsExamOpen(true);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const { error: rpcError } = await supabase.rpc("complete_lecture_secure", { p_lecture_id: lectureId });
      if (rpcError) throw rpcError;

      await supabase.from("profiles").update({
        xp: (profile?.xp || 0) + 50,
        score: (profile?.score || 0) + 10,
      }).eq("id", user?.id);

      setIsCompleted(true);
      refreshProfile();
      toast.success(isAr ? "تم إكمال المهمة! +50 XP" : "Mission accomplished! +50 XP");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !lecture) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden font-sans selection:bg-primary/30">
      <div className="fixed inset-0 bg-background z-0">
        <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full"></div>
      </div>

      <LectureExam
        isOpen={isExamOpen}
        onClose={() => setIsExamOpen(false)}
        lectureId={lectureId}
        questions={lecture?.quiz_data || []}
        isBigExam={lecture?.is_big_exam}
        onPassed={() => {
          setIsExamOpen(false);
          handleComplete();
        }}
      />

      <div ref={contentScrollRef} className="flex-1 relative z-20 pt-20 md:pt-32 pb-24 md:pb-32 px-4 md:px-6 max-w-[900px] mx-auto w-full overflow-y-auto h-screen">
        <header className="mb-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-6">
            <span className="text-primary text-[9px] font-black uppercase tracking-[0.3em]">Module {lecture.slot_number}</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black italic tracking-tighter mb-6 leading-[0.9] uppercase">{lecture.title}</motion.h1>
        </header>

        <div className="flex gap-2 md:gap-3 mb-6 md:mb-8 justify-center overflow-x-auto px-2">
          <button
            onClick={() => setActiveTab("content")}
            className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all whitespace-nowrap ${activeTab === "content" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {isAr ? "المحتوى" : "CONTENT"}
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all whitespace-nowrap ${activeTab === "chat" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {isAr ? "المحادثة" : "CHAT"}
          </button>
        </div>

        {activeTab === "chat" ? (
          <div className="h-[50dvh] md:h-[600px]">
            <LectureChat lectureId={lectureId} levelId={lecture.level_id} isAr={isAr} />
          </div>
        ) : (
        <div className="space-y-12">
          {lecture.video_url && (
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="p-1 rounded-[2.5rem] bg-muted border border-border shadow-2xl">
              <div
                className="aspect-video rounded-[calc(2.5rem-0.25rem)] bg-card overflow-hidden border border-border relative group"
                onContextMenu={(e) => e.preventDefault()}
              >
                {lecture.video_url.includes("youtube.com") || lecture.video_url.includes("youtu.be") ? (
                  <iframe
                    src={lecture.video_url.replace("watch?v=", "embed/") + (lecture.video_url.includes("?") ? "&" : "?") + "modestbranding=1&rel=0&showinfo=0&iv_load_policy=3"}
                    className="w-full h-full"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <video
                    src={lecture.video_url}
                    controls
                    controlsList="nodownload noduration"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </motion.div>
          )}

          {lecture.pdf_url && (
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="p-1 rounded-[2.5rem] bg-muted border border-border shadow-2xl">
              <div className="bg-card border border-border rounded-[calc(2.5rem-0.375rem)] overflow-hidden">
                <div className="flex items-center gap-3 px-8 py-4 border-b border-border bg-muted/50">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {isAr ? "وثيقة الدراسة" : "STUDY MATERIAL"}
                  </span>
                </div>
                <SecurePdfViewer url={lecture.pdf_url} isAr={isAr} />
              </div>
            </motion.div>
          )}

          <div className="space-y-8">
            {lecture.content_blocks?.map((block, i) => (
              <motion.div key={block.id || i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-1 rounded-[2.5rem] bg-muted border border-border hover:border-primary/30 transition-all group">
                <div className="bg-card border border-border rounded-[calc(2.5rem-0.375rem)] p-8 md:p-10">
                  <ContentRenderer block={block} onQuizAnswer={handleQuizAnswer} quizAnswers={quizAnswers} quizStatus={quizStatus} isAr={isAr} />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="pt-12">
            <AcademicReviewer title={lecture.title} content={lecture.description} isAr={isAr} />
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="p-1.5 rounded-[2.5rem] bg-muted border border-border shadow-2xl mt-24">
            <div className="bg-primary text-primary-foreground p-8 md:p-10 rounded-[calc(2.5rem-0.375rem)] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
              <div className="flex items-center gap-6 relative z-10">
                <div className="p-4 bg-primary-foreground/10 rounded-2xl border border-primary-foreground/5"><Zap className="w-6 h-6 text-primary-foreground" /></div>
                <div>
                  <p className="font-black uppercase tracking-[0.5em] text-[9px] opacity-60 mb-0.5">MISSION CLEARANCE</p>
                  <p className="font-black italic text-2xl md:text-3xl tracking-tighter leading-none">DATA SYNCHRONIZED</p>
                </div>
              </div>

              <div className="w-full md:w-auto relative z-10">
                <HeroButton
                  onClick={isCompleted ? () => (nextLectureId ? navigate({ to: `/lecture/${nextLectureId}` }) : navigate({ to: "/levels" })) : handleCompleteRequest}
                  disabled={isSubmitting || (!isCompleted && !hasScrolledToEnd && !isAdmin && !isModerator)}
                  className="w-full md:w-auto bg-background text-foreground px-10 h-16 rounded-2xl font-black uppercase tracking-widest italic"
                >
                  <span className="flex items-center gap-3">
                    {isCompleted ? (nextLectureId ? "NEXT MODULE" : "FINISH LEVEL") : (lecture.quiz_data?.length ? "START EXAM" : "COMPLETE MISSION")}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </HeroButton>
              </div>
            </div>
          </motion.div>
        </div>
        )}
      </div>
    </div>
  );
}
