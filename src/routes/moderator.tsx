import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../hooks/use-auth";
import { useLanguage } from "../lib/LanguageContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Video,
  FileText,
  Save,
  Trash2,
  ChevronRight,
  Layout,
  BookOpen,
  Settings,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileDown,
  PlusCircle,
  GripVertical,
  X,
  ListOrdered,
  ArrowLeft,
  Users,
  MessageSquare,
  Shield,
  Search,
  Send,
  MoreVertical,
  Type,
  Code,
  Image as ImageIcon,
  EyeOff,
  Trophy,
  Activity,
  Award,
  Download,
  Lock,
  FileUp,
  Check,
  Clock,
  Monitor,
  Loader2,
  Brain,
  ArrowRight,
  ShieldAlert,
  Zap,
  GraduationCap,
  Camera,
} from "lucide-react";
import { HeroButton } from "../funs/HeroButton";
import { MediaLibrary } from "../components/MediaLibrary";
import { GroupManager } from "../components/GroupManager";
import { supabase } from "../lib/supabase-code";
import { toast } from "sonner";
import { parseDocx, parseXlsx, ParsedLecture } from "../utils/file-parser";
import { validateFile, sanitizeFilename, safeStoragePath, getExt } from "../lib/upload-security";

export const Route = createFileRoute("/moderator")({
  component: ModeratorDashboard,
});

interface ContentBlock {
  id: string;
  type: "text" | "code" | "image" | "pdf" | "download" | "word" | "canvas" | "quiz";
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

interface LectureInput {
  id?: string;
  title: string;
  description: string;
  video_url: string;
  pdf_url: string;
  slot_number: number;
  is_live?: boolean;
  content_blocks?: ContentBlock[];
  quiz_data?: any[];
  is_big_exam?: boolean;
  drip_days?: number;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correct: number;
}

interface Level {
  id: string;
  title: string;
  level_order: number;
  is_published: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  username: string;
  role: string;
  is_approved: boolean;
  avatar_url?: string;
  score: number;
  xp: number;
  phone_number?: string;
}

interface InternalTask {
  id: string;
  admin_id: string;
  assigned_to_id?: string;
  title: string;
  section: string;
  timeline: string;
  course_time: string;
  description: string;
  is_completed: boolean;
  created_at: string;
  profiles?: { username: string } | null; 
}


function ModeratorDashboard() {
  const { isAr } = useLanguage();
  const { isAdmin, isModerator, user, profile } = useAuth(); // Get current user and profile
  const [activeTab, setActiveTab] = useState<"levels" | "users" | "messaging" | "progress" | "tasks" | "analytics" | "spotlight" | "failed_exams" | "directory" | "assignments" | "grading" | "leaderboard" | "media" | "groups">(
    "levels",
  );
  const [levels, setLevels] = useState<Level[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadChatNotifications, setUnreadChatNotifications] = useState<{
    [levelId: string]: number;
  }>({});
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  useEffect(() => {
    fetchLevels();
  }, []);

  useEffect(() => {
    let chatSubscription: any;
    if (user) {
      chatSubscription = supabase
        .channel("moderator_level_chats")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "level_chats" },
          (payload) => {
            const newMsg = payload.new;
            if (newMsg.sender_id !== user.id) {
              // Only notify for messages from other users
              setUnreadChatNotifications((prev) => {
                const newCount = (prev[newMsg.level_id] || 0) + 1;
                return { ...prev, [newMsg.level_id]: newCount };
              });
              setTotalUnreadMessages((prev) => prev + 1);
              toast.info(
                isAr ? `رسالة جديدة في مستوى ${newMsg.level_id}` : `New message in level chat!`,
              ); // Generic toast for now
            }
          },
        )
        .subscribe();
    }

    return () => {
      if (chatSubscription) {
        supabase.removeChannel(chatSubscription);
      }
    };
  }, [user, isAr]);

  useEffect(() => {
    if (activeTab === "messaging") {
      // Clear notifications when messaging tab is active
      setUnreadChatNotifications({});
      setTotalUnreadMessages(0);
    }
  }, [activeTab]);

  const fetchLevels = async () => {
    const { data } = await supabase
      .from("level_templates")
      .select("id, title, level_order, is_published, created_at")
      .order("level_order", { ascending: true });
    if (data) setLevels(data);
    setLoading(false);
  };

  if (!isModerator) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Shield className="w-20 h-20 mx-auto text-red-500 opacity-50" />
          <h1 className="text-4xl font-black italic uppercase">Access Denied</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
            Security Clearance Level 4 Required
          </p>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <CourseBuilder
        levelId={selectedLevelId}
        onBack={() => {
          setIsEditing(false);
          fetchLevels();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-x-hidden font-sans selection:bg-primary/30">
      {/* Cinematic Background */}
      <div className="fixed inset-0 bg-background z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-primary/10 blur-[100px] rounded-full"></div>
      </div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-10 opacity-20"></div>

      <div className="flex-1 flex flex-col md:flex-row relative z-20 pt-16 md:pt-12 px-2 md:px-6 max-w-[1400px] mx-auto w-full gap-3 md:gap-12">
        {/* Floating Glass Sidebar - Horizontal on Mobile */}
        <aside className="w-full md:w-64 sticky top-12 h-fit space-y-1.5 p-1.5 bg-muted border border-border backdrop-blur-3xl rounded-[2rem] shadow-2xl flex md:flex-col overflow-x-auto md:overflow-visible custom-scrollbar">
          <div className="hidden md:block px-5 py-3 border-b border-border mb-1">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Moderator OS</p>
          </div>
          <button
            onClick={() => setActiveTab("levels")}
            className={`group flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] whitespace-nowrap ${activeTab === "levels" ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "levels" ? "bg-foreground/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                <Layout className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isAr ? "المستويات" : "LEVELS"}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab("users")}
            className={`group flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] whitespace-nowrap ${activeTab === "users" ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "users" ? "bg-foreground/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                <Users className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isAr ? "المستخدمين" : "USERS"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("messaging")}
            className={`group flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] relative whitespace-nowrap ${activeTab === "messaging" ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "messaging" ? "bg-foreground/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isAr ? "الرسائل" : "MESSAGING"}
            </span>
            {totalUnreadMessages > 0 && (
              <span className="absolute top-3 right-5 flex items-center justify-center w-4 h-4 bg-red-500 text-foreground text-[9px] font-bold rounded-full ring-2 ring-black/20">
                {totalUnreadMessages}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`group flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] whitespace-nowrap ${activeTab === "analytics" ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "analytics" ? "bg-foreground/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                <Activity className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isAr ? "التحليلات" : "ANALYTICS"}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab("tasks")}
            className={`group flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] whitespace-nowrap ${activeTab === "tasks" ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "tasks" ? "bg-foreground/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                <ListOrdered className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isAr ? "المهام" : "INTERNAL TASKS"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("failed_exams")}
            className={`group flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] whitespace-nowrap ${activeTab === "failed_exams" ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "failed_exams" ? "bg-foreground/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isAr ? "الاختبارات الفاشلة" : "FAILED EXAMS"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("grading")}
            className={`group flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] whitespace-nowrap ${activeTab === "grading" ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "grading" ? "bg-foreground/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isAr ? "التصحيح" : "GRADING"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("assignments")}
            className={`group flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] whitespace-nowrap ${activeTab === "assignments" ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "assignments" ? "bg-foreground/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isAr ? "المهام" : "ASSIGNMENTS"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("media")}
            className={`group flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] whitespace-nowrap ${activeTab === "media" ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "media" ? "bg-foreground/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                <Video className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isAr ? "المكتبة" : "MEDIA LIB"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("groups")}
            className={`group flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] whitespace-nowrap ${activeTab === "groups" ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "groups" ? "bg-foreground/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                <Users className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isAr ? "المجموعات" : "GROUPS"}
            </span>
          </button>

          {isAdmin && (
            <>
                <button
                onClick={() => setActiveTab("directory")}
                className={`group flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] whitespace-nowrap ${activeTab === "directory" ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
                >
                <div className={`p-1.5 rounded-lg ${activeTab === "directory" ? "bg-foreground/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                    <FileDown className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {isAr ? "دليل الهاتف" : "USER DIRECTORY"}
                </span>
                </button>

                <button
                onClick={() => setActiveTab("spotlight")}
                className={`group flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] whitespace-nowrap ${activeTab === "spotlight" ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
                >
                <div className={`p-1.5 rounded-lg ${activeTab === "spotlight" ? "bg-foreground/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                    <Zap className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {isAr ? "تحكم بطاقة التميز" : "HERO CARD CONTROL"}
                </span>
                </button>
            </>
          )}
        </aside>

        <main className="flex-1 pb-24 overflow-x-hidden">
          <header className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
            <div className={isAr ? "text-right" : "text-left"}>
              <div className="flex items-center gap-3 mb-3">
                  <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.2em] rounded-full">
                      Section {activeTab.toUpperCase()}
                  </span>
                  <div className="h-px w-10 bg-muted"></div>
              </div>
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter mb-3 leading-none">
                {activeTab === "levels"
                  ? isAr ? "إدارة المحتوى" : "CONTENT CONTROL"
                  : activeTab === "users"
                    ? isAr ? "إدارة المستخدمين" : "USER CONTROL"
                  : activeTab === "spotlight"
                    ? isAr ? "إدارة التميز" : "SPOTLIGHT MANAGEMENT"
                  : activeTab === "progress"
                    ? isAr ? "تتبع تقدم الدورة" : "COURSE PROGRESS"
                  : activeTab === "directory"
                    ? isAr ? "دليل المستخدمين" : "USER DIRECTORY"
                  : isAr ? "مركز الرسائل" : "MESSAGING HUB"}
              </h1>
              <p className="text-muted-foreground font-bold uppercase tracking-[0.4em] text-[9px]">
                {isAr ? "نظام إدارة المنهج المتطور" : "ADVANCED PEDAGOGICAL OPERATING SYSTEM"}
              </p>
            </div>
            {activeTab === "levels" && (
              <HeroButton
                onClick={() => {
                  setSelectedLevelId(null);
                  setIsEditing(true);
                }}
                className="bg-primary text-black px-4 md:px-6 h-9 md:h-10 rounded-xl md:rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span className="font-black italic uppercase tracking-widest text-[10px] md:text-xs">DEPLOY LEVEL</span>
              </HeroButton>
            )}
          </header>

          <AnimatePresence mode="wait">
            {activeTab === "levels" && (
              <motion.div
                key="levels"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid gap-2 md:gap-3"
              >
                {levels.map((level) => (
                  <div
                    key={level.id}
                    className="p-0.5 rounded-xl md:rounded-2xl bg-muted border border-border hover:border-border transition-all group"
                  >
                    <div className="bg-muted/50 border border-border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-[calc(1.5rem-0.125rem)] md:rounded-[calc(2rem-0.25rem)] p-3 md:p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3 md:gap-6">
                        <div className="text-2xl md:text-4xl font-black italic text-muted-foreground w-10 md:w-16 leading-none">
                          {String(level.level_order).padStart(2, "0")}
                        </div>
                        <div>
                          <h3 className="text-sm md:text-base font-black uppercase tracking-tight mb-0.5 group-hover:text-primary transition-colors">
                            {level.title}
                          </h3>
                          <div className="flex items-center gap-2 md:gap-3">
                            <span
                              className={`text-[7px] md:text-[8px] font-black uppercase px-1.5 md:px-2 py-0.5 rounded-full border ${level.is_published ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-muted/50 border-border text-muted-foreground"}`}
                            >
                              {level.is_published ? "LIVE STATUS" : "DRAFT ARCHIVE"}
                            </span>
                            <div className="h-0.5 w-0.5 rounded-full bg-muted"></div>
                            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">ID: {level.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <button
                          onClick={() => {
                            setSelectedLevelId(level.id);
                            setIsEditing(true);
                          }}
                          className="p-2 md:p-2.5 rounded-full bg-muted/50 border border-border hover:bg-primary hover:text-black transition-all duration-500 hover:scale-110"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                            <button
                              onClick={async () => {
                                if (!confirm("Are you sure?")) return;
                                const { error } = await supabase.from("level_templates").delete().eq("id", level.id);
                                if (error) toast.error("Failed to delete level");
                                else {
                                    toast.success("Level deleted");
                                    fetchLevels();
                                }
                              }}
                              className="p-2 md:p-2.5 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-foreground transition-all duration-500 hover:scale-110 text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === "users" && <UserManagement isAr={isAr} />}
            {activeTab === "progress" && <CourseProgress isAr={isAr} />}
            {activeTab === "messaging" && <MessagingHub isAr={isAr} isModerator={isModerator} isAdmin={isAdmin} />}
            {activeTab === "tasks" && <InternalTasks isAr={isAr} />}
            {activeTab === "failed_exams" && <FailedExams isAr={isAr} />}
            {activeTab === "grading" && <GradingHub isAr={isAr} />}
            {activeTab === "assignments" && <AssignmentsHub isAr={isAr} />}
            {activeTab === "media" && (
              <motion.div key="media" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="mb-4">
                  <h2 className="text-lg font-black uppercase">{isAr ? "مكتبة المحتوى" : "Content Library"}</h2>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">{isAr ? "ارفع مرة واحدة، استخدم في كل مكان" : "Upload once, reference everywhere"}</p>
                </div>
                <MediaLibrary mode="browse" />
              </motion.div>
            )}
            {activeTab === "groups" && (
              <motion.div key="groups" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="mb-4">
                  <h2 className="text-lg font-black uppercase">{isAr ? "المجموعات والتعيينات" : "Groups & Assignments"}</h2>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">{isAr ? "أنشئ مجموعات وعيّن مستويات لكل مجموعة" : "Create groups and assign level templates"}</p>
                </div>
                <GroupManager />
              </motion.div>
            )}
            {activeTab === "spotlight" && <SpotlightManagement isAr={isAr} />}
            {activeTab === "analytics" && <AnalyticsTab levelId={selectedLevelId} isAr={isAr} />}
            {activeTab === "directory" && <UserDirectory isAr={isAr} />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function UserDirectory({ isAr }: { isAr: boolean }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("username", { ascending: true });
    if (data) setUsers(data);
    setLoading(false);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.phone_number && u.phone_number.includes(searchTerm))
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isAr ? "تم النسخ" : "Copied to clipboard");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-muted/50 border border-border rounded-2xl md:rounded-3xl p-4 md:p-6">
        <div className="relative group mb-4 md:mb-6">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
                type="text"
                placeholder={isAr ? "بحث بالاسم أو الهاتف..." : "Search by name or phone..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-foreground/20 border border-border rounded-2xl py-5 pl-16 pr-6 font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
            />
        </div>

        <div className="overflow-hidden border border-border rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">{isAr ? "المستخدم" : "USER"}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">{isAr ? "الرتبة" : "ROLE"}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">{isAr ? "رقم الهاتف" : "PHONE NUMBER"}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">{isAr ? "XP" : "EXPERIENCE"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted/50 overflow-hidden flex-shrink-0 border border-border">
                        {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <Users className="w-3 h-3 m-auto opacity-20" />}
                      </div>
                      <span className="font-bold text-sm">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${u.role === 'admin' ? "bg-red-500/10 border-red-500/20 text-red-500" : u.role === 'moderator' ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/50 border-border text-muted-foreground"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{u.phone_number || "---"}</span>
                      {u.phone_number && (
                        <button onClick={() => copyToClipboard(u.phone_number!)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-all">
                          <Download className="w-3 h-3 rotate-180" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-black text-xs text-primary">{u.xp} XP</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-20 text-center text-muted-foreground uppercase font-black text-[10px] tracking-widest">
              No matching records found in central database
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FailedExams({ isAr }: { isAr: boolean }) {
  const [failedAttempts, setFailedAttempts] = useState<any[]>([]);

  useEffect(() => {
    fetchFailedAttempts();
  }, []);

  const fetchFailedAttempts = async () => {
    const { data } = await supabase
      .from("exam_attempts")
      .select("*, profiles(username, id)")
      .lt("score", 70);

    if (data) setFailedAttempts(data);
  };

  const approveProgression = async (studentId: string, levelId: string) => {
    const { data: sgData } = await supabase.from("student_groups").select("group_id").eq("student_id", studentId);
    const groupIds = sgData?.map((sg) => sg.group_id) || [];
    if (groupIds.length === 0) {
      const { data: profile } = await supabase.from("profiles").select("group_id").eq("id", studentId).single();
      if (profile?.group_id) groupIds.push(profile.group_id);
    }
    for (const gid of groupIds) {
      await supabase.from("group_level_assignments").insert({ group_id: gid, level_template_id: levelId }).select();
    }
    toast.success("Progression approved");
    fetchFailedAttempts();
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black italic uppercase tracking-tighter">
        {isAr ? "محاولات الاختبار الفاشلة" : "FAILED EXAM ATTEMPTS"}
      </h2>
      <div className="grid gap-4">
        {failedAttempts.map((attempt) => (
          <div
            key={attempt.id}
            className="bg-muted/50 border border-border p-6 rounded-2xl flex justify-between items-center"
          >
            <div>
              <p className="font-bold">{attempt.profiles?.username}</p>
              <p className="text-xs text-muted-foreground">
                {attempt.level_id?.slice(0,8)} - Score: {attempt.score}%
              </p>
            </div>
            <button
              onClick={() => approveProgression(attempt.student_id, attempt.level_id)}
              className="bg-primary text-black px-4 py-2 rounded-xl font-black text-xs uppercase"
            >
              {isAr ? "تجاوز" : "Approve Progression"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab({ levelId, isAr }: { levelId: string | null; isAr: boolean }) {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);

  useEffect(() => {
    fetchAttempts();
    if (levelId) fetchExamQuestions();
  }, [levelId]);

  const fetchAttempts = async () => {
    const query = supabase
      .from("exam_attempts")
      .select("*, profiles(username), exam_responses(*)")
      .order("completed_at", { ascending: false });
    
    if (levelId) query.eq("level_id", levelId);
    
    const { data } = await query;
    if (data) setAttempts(data);
  };

  const fetchExamQuestions = async () => {
    const { data } = await supabase.from("exam_templates").select("questions").eq("level_template_id", levelId).single();
    if (data) setExamQuestions(data.questions as any[]);
  };

  const [moderatorStats, setModeratorStats] = useState<any[]>([]);

  useEffect(() => {
    fetchAttempts();
    if (levelId) fetchExamQuestions();
    fetchModeratorStats();

    const sub = supabase.channel('tasks_sync').on('postgres_changes' as any, { event: '*', table: 'internal_tasks' }, fetchModeratorStats).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [levelId]);

  const fetchModeratorStats = async () => {
    const { data } = await supabase
        .from("internal_tasks")
        .select("assigned_to_id, profiles(username)")
        .eq("is_completed", true);
    
    if (data) {
        const stats: Record<string, { username: string, count: number }> = {};
        data.forEach(task => {
            const uid = task.assigned_to_id;
            const profile = Array.isArray(task.profiles) ? task.profiles[0] : task.profiles;
            if (uid) {
                if (!stats[uid]) stats[uid] = { username: profile?.username || "Unknown", count: 0 };
                stats[uid].count++;
            }
        });
        const sorted = Object.values(stats).sort((a, b) => b.count - a.count).slice(0, 3);
        setModeratorStats(sorted);
    }
  };

  return (
    <div className="space-y-12">
      {/* Leaderboard */}
      <div className="bg-card border border-border p-8 rounded-3xl">
        <h3 className="font-black italic uppercase tracking-tighter text-xl mb-6">{isAr ? "أفضل المشرفين" : "TOP MODERATORS"}</h3>
        <div className="space-y-4">
            {moderatorStats.map((mod, i) => (
                <div key={i} className="flex justify-between items-center bg-muted p-4 rounded-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center font-black bg-primary rounded-lg text-black">{i + 1}</div>
                        <p className="font-bold">{mod.username}</p>
                    </div>
                    <p className="font-black">{mod.count} Tasks</p>
                </div>
            ))}
        </div>
      </div>

      <div className="space-y-8">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">
          {isAr ? "تحليلات الاختبارات" : "EXAM ANALYTICS"}
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {attempts.map((a) => (
            <div key={a.id} className="bg-card border border-border p-6 rounded-3xl">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => setSelectedAttempt(selectedAttempt?.id === a.id ? null : a)}>
                <div>
                  <p className="font-bold">{a.profiles?.username || "Unknown Student"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.completed_at).toLocaleString()}</p>
                </div>
                <div className={`text-xl font-black ${a.score >= 70 ? "text-green-500" : "text-destructive"}`}>
                  {a.score}%
                </div>
              </div>
              
              {selectedAttempt?.id === a.id && (
                <div className="mt-6 pt-6 border-t border-border space-y-4">
                  {a.exam_responses.map((r: any, idx: number) => {
                    const q = examQuestions.find(exQ => exQ.id === r.question_id);
                    return (
                      <div key={r.id} className={`p-4 rounded-xl ${r.is_correct ? "bg-green-500/10" : "bg-destructive/10"}`}>
                        <p className="font-bold mb-2">{idx + 1}. {q?.text || "Unknown Question"}</p>
                        <p className="text-sm">Student Answer: {q?.options[r.selected_option]}</p>
                        {!r.is_correct && <p className="text-sm text-destructive">Correct Answer: {q?.options[q.correct]}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpotlightManagement({ isAr }: { isAr: boolean }) {
  const [spotlight, setSpotlight] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [title, setTitle] = useState("Employee of the Month");
  const [description, setDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSpotlight();
    fetchUsers();
  }, []);

  const fetchSpotlight = async () => {
    const { data } = await supabase.from("spotlight").select("*, profiles(username)").single();
    if (data) {
        setSpotlight(data);
        setTitle(data.title);
        setDescription(data.description || "");
        setAvatarUrl(data.avatar_override_url || "");
        setSelectedUserId(data.user_id);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("id, username, phone_number");
    if (data) setUsers(data);
  };

  const filteredUsers = users.filter(u => 
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.phone_number && u.phone_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const v = validateFile(file, "avatar", true);
    if (!v.valid) { toast.error(v.error); return; }
    setUploading(true);
    try {
      const filePath = safeStoragePath("spotlight", file.name);
      const { error } = await supabase.storage.from("avatars").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      toast.success("Avatar uploaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const updateSpotlight = async () => {
    try {
      await supabase.from("spotlight").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("spotlight").insert([{ 
          user_id: selectedUserId, 
          title, 
          description, 
          avatar_override_url: avatarUrl 
      }]);
      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }
      toast.success(isAr ? "تم تحديث بطاقة التميز" : "Hero Card updated successfully");
      fetchSpotlight();
    } catch (err) {
      console.error("Update spotlight error:", err);
      toast.error("Failed to update spotlight");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">
        {isAr ? "إدارة بطاقة التميز" : "HERO CARD CONTROL"}
      </h2>
      <div className="bg-muted/50 border border-border p-5 md:p-8 rounded-2xl md:rounded-3xl space-y-5 md:space-y-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
            <Zap className="w-24 h-24 text-primary" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-10">
            <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] px-2">{isAr ? "اختيار العميل المميز" : "SELECT ELITE AGENT"}</label>
                <div className="flex flex-col gap-2">
                    <input 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full bg-foreground/20 border border-border rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50" 
                        placeholder={isAr ? "ابحث بالاسم أو الهاتف..." : "Search by name or phone..."} 
                    />
                    <select 
                        value={selectedUserId} 
                        onChange={(e) => setSelectedUserId(e.target.value)} 
                        className="w-full bg-foreground/20 border border-border rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 text-foreground"
                    >
                        <option value="">{filteredUsers.length > 0 ? (isAr ? "اختر من القائمة" : "Select from list") : (isAr ? "لا يوجد نتائج" : "No agents found")}</option>
                        {filteredUsers.map(u => <option key={u.id} value={u.id} className="bg-neutral-900">{u.username} {u.phone_number ? `(${u.phone_number})` : ''}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] px-2">{isAr ? "المسمى الوظيفي / التكريم" : "MOTIVATIONAL TITLE"}</label>
                <input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="w-full bg-foreground/20 border border-border rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50" 
                    placeholder="e.g. Employee of the Month" 
                />
                
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] px-2 pt-4">{isAr ? "الإنجاز / اللقب" : "ELITE ACHIEVEMENT"}</label>
                <input 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="w-full bg-foreground/20 border border-border rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50" 
                    placeholder="e.g. WORLD CHAMPION" 
                />
            </div>
        </div>
        
        <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] px-2">{isAr ? "صورة التميز (اختياري)" : "HERO OVERRIDE AVATAR (OPTIONAL)"}</label>
            <div className="flex gap-4">
                <input 
                    value={avatarUrl} 
                    onChange={(e) => setAvatarUrl(e.target.value)} 
                    className="flex-1 bg-foreground/20 border border-border rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50" 
                    placeholder="Custom Image URL" 
                />
                <HeroButton onClick={() => fileInputRef.current?.click()} variant="outline" className="h-14 px-8 border-border">
                    <FileUp className="w-4 h-4 mr-2" />
                    {isAr ? "رفع صورة" : "UPLOAD"}
                </HeroButton>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            </div>
        </div>

        <HeroButton 
            onClick={updateSpotlight} 
            disabled={uploading || !selectedUserId} 
            className="w-full bg-primary text-black h-20 rounded-[2rem] font-black text-lg italic tracking-tighter uppercase shadow-[0_20px_50px_rgba(204,255,0,0.2)] hover:scale-[1.02] active:scale-95 transition-all"
        >
            {uploading ? (isAr ? "جاري الرفع..." : "TRANSMITTING...") : (isAr ? "تحديث بطاقة التميز" : "DEPLOY HERO STATUS")}
        </HeroButton>

        {spotlight && (
            <div className="pt-10 mt-10 border-t border-border">
                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest text-center mb-4">LIVE PREVIEW ON SYSTEM</p>
                <div className="flex items-center gap-6 justify-center grayscale opacity-40 scale-90">
                    <div className="w-16 h-16 rounded-full border-2 border-primary overflow-hidden">
                        <img src={avatarUrl || spotlight.profiles?.avatar_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left">
                        <p className="font-black italic text-xl leading-none">{spotlight.profiles?.username}</p>
                        <p className="text-[10px] font-black uppercase text-primary">{title}</p>
                        <p className="text-[8px] font-black uppercase text-muted-foreground">{description}</p>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

function UserManagement({ isAr }: { isAr: boolean }) {
  const { isAdmin, profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "parent" | "moderator" | "admin">("all");
  const [loading, setLoading] = useState(true);
  const [parentStudentLinks, setParentStudentLinks] = useState<any[]>([]);

  const deleteUser = async (userId: string) => {
    if (!window.confirm(isAr ? "هل أنت متأكد من حذف هذا المستخدم؟" : "Are you sure you want to delete this user?")) return;
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
      toast.success(isAr ? "تم حذف المستخدم" : "User deleted");
      fetchUsers();
    } catch (err) {
      console.error("Delete user error:", err);
      toast.error("Failed to delete user");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGroups();
    fetchLinks();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("xp", { ascending: false });
      if (error) throw error;
      setUsers(data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to fetch users");
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase.from("groups").select("id, name").order("name");
      if (error) throw error;
      setGroups(data || []);
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  };

  const fetchLinks = async () => {
    const { data } = await supabase.from("parent_student_links").select("*");
    if (data) setParentStudentLinks(data);
  };

  const assignToGroup = async (userId: string, groupId: string | null) => {
    const { error } = await supabase.from("profiles").update({ group_id: groupId || null }).eq("id", userId);
    if (!error) {
      if (groupId) {
        await supabase.from("student_groups").upsert({ student_id: userId, group_id: groupId }, { onConflict: "student_id,group_id" });
      } else {
        await supabase.from("student_groups").delete().eq("student_id", userId);
      }
      toast.success(isAr ? "تم تحديث المجموعة" : "Group updated");
      fetchUsers();
    }
  };

  const toggleApproval = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_approved: !currentStatus }).eq("id", userId);
    if (!error) {
      toast.success(isAr ? "تم تحديث الحالة" : "Status updated");
      fetchUsers();
    }
  };

  const changeRole = async (userId: string, role: string) => {
    if (!isAdmin && role === "admin") {
      toast.error(isAr ? "لا يمكنك ترقية شخص إلى Admin" : "Cannot promote to Admin");
      return;
    }
    if (userId === profile?.id) {
      toast.error(isAr ? "لا يمكنك تغيير رتبتك" : "Cannot change your own role");
      return;
    }
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if (!error) {
      toast.success(isAr ? "تم تحديث الرتبة" : "Role updated");
      fetchUsers();
    }
  };

  // Linking functionality
  const linkStudentToParent = async (studentId: string, parentId: string) => {
    try {
        const { error } = await supabase.from("parent_student_links").insert({
            student_id: studentId,
            parent_id: parentId
        });

        if (error) throw error;
        toast.success(isAr ? "تم ربط الطالب بولي الأمر" : "Student linked to parent successfully");
        fetchLinks();
    } catch (err: any) {
        console.error("Linking error:", err);
        toast.error(err.message || "Failed to link student");
    }
  };

  const unlinkStudentFromParent = async (studentId: string, parentId: string) => {
    try {
        const { error } = await supabase.from("parent_student_links").delete().eq("student_id", studentId).eq("parent_id", parentId);
        if (error) throw error;
        toast.success(isAr ? "تم إلغاء الربط" : "Unlinked successfully");
        fetchLinks();
    } catch (err) {
        toast.error("Failed to unlink");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (u.phone_number && u.phone_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const top3 = filteredUsers.filter(u => u.role === 'student').slice(0, 3);
  const rest = filteredUsers;

  return (
    <div className="space-y-5 md:space-y-8">
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex gap-3">
            <div className="relative group flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
                type="text"
                placeholder={isAr ? "بحث بالاسم أو الهاتف..." : "Search by name or phone..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl md:rounded-2xl py-3 md:py-4 pl-10 md:pl-12 pr-4 md:pr-6 font-bold text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
            />
            </div>
        </div>

        {/* Tab-based Role Filter */}
        <div className="flex bg-muted/50 p-1 rounded-xl md:rounded-2xl border border-border w-fit overflow-x-auto scrollbar-hide">
            {(["all", "student", "parent", "moderator", "admin"] as const).map((role) => (
                <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${roleFilter === role ? "bg-primary text-black shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                >
                    {role}
                </button>
            ))}
        </div>
      </div>

      {/* Top 3 Leaderboard */}
      <section className="space-y-4 md:space-y-6">
          <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-muted-foreground">{isAr ? "أعلى 3 طلاب" : "TOP 3 AGENTS"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
              {top3.map((user, i) => (
                  <div key={user.id} className="relative p-0.5 rounded-xl md:rounded-2xl bg-gradient-to-br from-white/20 to-white/5 overflow-hidden">
                      <div className="bg-muted backdrop-blur-3xl p-3 md:p-6 rounded-[calc(2rem-0.125rem)] text-center">
                          <div className="absolute top-3 right-6 text-3xl font-black italic text-muted-foreground/30">#{i + 1}</div>
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-muted mx-auto mb-3 md:mb-4 flex items-center justify-center border-2 border-border overflow-hidden">
                              {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <Users className="w-7 h-7 text-muted-foreground" />}
                          </div>
                          <h3 className="text-sm md:text-base font-black uppercase tracking-tight text-foreground mb-1">{user.username}</h3>
                          <div className="flex flex-col items-center gap-1">
                              <span className="px-2 py-0.5 bg-muted rounded-full text-[9px] font-black text-foreground">{user.xp} XP</span>
                              <span className="text-[8px] font-black uppercase text-muted-foreground">{user.role}</span>
                          </div>

                          <div className="mt-3 md:mt-6 flex flex-col gap-1.5 md:gap-2">
                              <div className="flex gap-2">
                                <button
                                    onClick={() => toggleApproval(user.id, user.is_approved)}
                                    className={`flex-1 h-8 md:h-9 rounded-lg text-[8px] md:text-[9px] font-black uppercase transition-all ${user.is_approved ? "bg-green-500 text-black" : "bg-muted text-foreground border border-border"}`}
                                >
                                    {user.is_approved ? (isAr ? "معتمد" : "APPROVED") : (isAr ? "غير معتمد" : "PENDING")}
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={() => deleteUser(user.id)}
                                        className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-red-500 hover:text-foreground transition-all flex items-center justify-center"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <select
                                    value={user.role}
                                    onChange={(e) => changeRole(user.id, e.target.value)}
                                    disabled={user.id === profile?.id || (!isAdmin && user.role === 'admin')}
                                    className="flex-1 bg-foreground/20 border border-border rounded-lg p-1.5 text-[9px] text-foreground disabled:opacity-50"
                                >
                                    <option value="student">Student</option>
                                    <option value="parent">Parent</option>
                                    <option value="moderator">Moderator</option>
                                    {isAdmin && <option value="admin">Admin</option>}
                                </select>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-muted-foreground shrink-0" />
                                <select
                                    value={(user as any).group_id || ""}
                                    onChange={(e) => assignToGroup(user.id, e.target.value || null)}
                                    className="flex-1 bg-foreground/20 border border-border rounded-lg p-1.5 text-[9px] text-foreground"
                                >
                                    <option value="">{isAr ? "بدون مجموعة" : "No Group"}</option>
                                    {groups.map((g) => (
                                      <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                              </div>
                              </div>
                          </div>
                      </div>
              ))}
          </div>
      </section>

      {/* Rest of Students */}
      <section className="space-y-3 md:space-y-4">
          <h2 className="text-sm md:text-base font-black italic uppercase tracking-tighter text-muted-foreground">{isAr ? "بقية الطلاب" : "OPERATIVE ROSTER"}</h2>
          <div className="grid gap-2 md:gap-3">
            {rest.map((user) => {
              const currentLinks = user.role === 'parent' 
                ? parentStudentLinks.filter(l => l.parent_id === user.id)
                : parentStudentLinks.filter(l => l.student_id === user.id);

              return (
              <div
                key={user.id}
                className="bg-muted/50 backdrop-blur-xl border border-border rounded-xl md:rounded-2xl p-2 md:p-4 flex flex-col gap-1.5 md:gap-4 group hover:bg-muted transition-all"
              >
                {user.role === 'student' && (
                    <div className="px-2">
                        {(() => {
                            const link = parentStudentLinks.find(l => l.student_id === user.id);
                            const parent = users.find(u => u.id === link?.parent_id);
                            return parent ? (
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">
                                    {isAr ? "ولي الأمر: " : "PARENT: "} {parent.username}
                                </p>
                            ) : (
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">
                                    {isAr ? "لا يوجد ولي أمر مرتبط" : "NO PARENT LINKED"}
                                </p>
                            );
                        })()}
                    </div>
                )}
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <Users className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-xs md:text-sm text-foreground truncate">{user.username}</h3>
                            <p className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest">{user.xp} XP · {user.role}</p>
                            <div className="flex flex-wrap gap-0.5 md:gap-1 mt-0.5 md:mt-1">
                                {currentLinks.map(link => {
                                    const linkedUser = users.find(u => u.id === (user.role === 'parent' ? link.student_id : link.parent_id));
                                    return linkedUser ? (
                                        <div key={link.id} className="flex items-center gap-0.5 bg-muted rounded-full px-1.5 py-0.5 text-[6px] md:text-[7px] font-black text-muted-foreground">
                                            {linkedUser.username}
                                            <button onClick={() => unlinkStudentFromParent(user.role === 'parent' ? linkedUser.id : user.id, user.role === 'parent' ? user.id : linkedUser.id)}>
                                                <X className="w-1.5 h-1.5 md:w-2 md:h-2 hover:text-red-500" />
                                            </button>
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
                        <button
                          onClick={() => toggleApproval(user.id, user.is_approved)}
                          className={`px-1.5 md:px-3 h-7 md:h-9 rounded-md md:rounded-lg text-[7px] md:text-[9px] font-black uppercase transition-all ${user.is_approved ? "bg-green-500 text-black" : "bg-muted text-foreground border border-border"}`}
                        >
                          {user.is_approved ? "OK" : "PEND"}
                        </button>

                        <div className="flex items-center gap-1 bg-foreground/20 border border-border rounded-md md:rounded-lg h-7 md:h-9 px-1.5">
                          <Users className="w-3 h-3 text-muted-foreground shrink-0" />
                          <select
                              value={(user as any).group_id || ""}
                              onChange={(e) => assignToGroup(user.id, e.target.value || null)}
                              className="bg-transparent text-[8px] md:text-[9px] text-foreground focus:outline-none max-w-[60px] md:max-w-[100px]"
                          >
                              <option value="">{isAr ? "بدون" : "None"}</option>
                              {groups.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                          </select>
                        </div>

                        <select
                            value={user.role}
                            onChange={(e) => changeRole(user.id, e.target.value)}
                            disabled={user.id === profile?.id || (!isAdmin && user.role === 'admin')}
                            className="bg-foreground/20 border border-border rounded-md md:rounded-lg p-1 text-[8px] md:text-[9px] text-foreground disabled:opacity-50 max-w-[60px] md:max-w-none"
                        >
                            <option value="student">Stu</option>
                            <option value="parent">Par</option>
                            <option value="moderator">Mod</option>
                            {isAdmin && <option value="admin">Adm</option>}
                        </select>

                        {isAdmin && (
                            <button
                                onClick={() => deleteUser(user.id)}
                                className="p-1.5 md:p-3 rounded-lg md:rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-red-500 hover:text-foreground transition-all"
                            >
                                <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {user.role === 'student' && (
                    <div className="flex flex-col gap-1 px-1">
                        <input
                            type="text"
                            placeholder={isAr ? "ربط ولي أمر" : "Link Parent"}
                            className="bg-foreground/20 border border-border rounded-lg p-1.5 text-[8px] text-foreground w-full"
                            onChange={(e) => {
                                const val = e.target.value.toLowerCase();
                                const parentSelect = e.target.nextElementSibling as HTMLSelectElement;
                                if (parentSelect) Array.from(parentSelect.options).forEach(opt => {
                                    opt.style.display = opt.text.toLowerCase().includes(val) || opt.value === "" ? "" : "none";
                                });
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                        <select
                            className="bg-foreground/20 border border-border rounded-lg p-1.5 text-[8px] text-foreground w-full"
                            onChange={(e) => { if (e.target.value) linkStudentToParent(user.id, e.target.value); }}
                            defaultValue=""
                        >
                            <option value="">{isAr ? "ولي الأمر" : "Parent"}</option>
                            {users.filter(u => u.role === 'parent').map(parent => (
                                <option key={parent.id} value={parent.id}>{parent.username}</option>
                            ))}
                        </select>
                    </div>
                )}

                {user.role === 'parent' && (
                    <div className="flex flex-col gap-1 px-1">
                        <input
                            type="text"
                            placeholder={isAr ? "ربط طالب" : "Link Student"}
                            className="bg-foreground/20 border border-border rounded-lg p-1.5 text-[8px] text-foreground w-full"
                            onChange={(e) => {
                                const val = e.target.value.toLowerCase();
                                const studentSelect = e.target.nextElementSibling as HTMLSelectElement;
                                if (studentSelect) Array.from(studentSelect.options).forEach(opt => {
                                    opt.style.display = opt.text.toLowerCase().includes(val) || opt.value === "" ? "" : "none";
                                });
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                        <select
                            className="bg-foreground/20 border border-border rounded-lg p-1.5 text-[8px] text-foreground w-full"
                            onChange={(e) => { if (e.target.value) linkStudentToParent(e.target.value, user.id); }}
                            defaultValue=""
                        >
                            <option value="">{isAr ? "طالب" : "Student"}</option>
                            {users.filter(u => u.role === 'student').map(student => (
                                <option key={student.id} value={student.id}>{student.username}</option>
                            ))}
                        </select>
                    </div>
                )}
              </div>
            );
          })}
          </div>
      </section>
    </div>
  );
}



function MessagingHub({ isAr, isModerator, isAdmin }: { isAr: boolean; isModerator: boolean; isAdmin: boolean }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedChatType, setSelectedChatType] = useState<"dm" | "level" | "group" | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [levelChatGroupId, setLevelChatGroupId] = useState<string | null>(null);
  const [levelGroups, setLevelGroups] = useState<{ id: string; name: string }[]>([]);
  const [levelLectures, setLevelLectures] = useState<Record<string, { id: string; title: string; slot_number: number }[]>>({});
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const { profile: myProfile } = useAuth();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfilesAndLevels();
  }, []);

  useEffect(() => {
    let subscription: any;
    if (selectedChatType === "dm" && selectedUserId) {
      fetchMessages();
      subscription = supabase
        .channel(`direct_message:${selectedUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_messages",
          },
          (payload: any) => {
            const msg = payload.new;
            const involved =
              (msg.sender_id === myProfile?.id && msg.receiver_id === selectedUserId) ||
              (msg.sender_id === selectedUserId && msg.receiver_id === myProfile?.id);
            if (involved) fetchMessages();
          },
        )
        .subscribe();
    } else if (selectedChatType === "level" && selectedLevelId && levelChatGroupId) {
      fetchMessages();
      const channelName = selectedLectureId
        ? `lecture_chat:${selectedLectureId}`
        : `level_chat:${selectedLevelId}`;
      const filter = selectedLectureId
        ? `lecture_id=eq.${selectedLectureId}`
        : `level_id=eq.${selectedLevelId}`;
      subscription = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "level_chats",
            filter,
          },
          () => {
            fetchMessages();
          },
        )
        .subscribe();
    } else if (selectedChatType === "group" && selectedGroupId) {
      fetchMessages();
      subscription = supabase
        .channel(`group_messages:${selectedGroupId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "group_messages",
            filter: `group_id=eq.${selectedGroupId}`,
          },
          () => {
            fetchMessages();
          },
        )
        .subscribe();
    }
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [selectedChatType, selectedUserId, selectedLevelId, selectedLectureId, selectedGroupId, levelChatGroupId, myProfile?.id]);

  useEffect(() => {
    // Scroll to bottom on new message
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchProfilesAndLevels = async () => {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", myProfile?.id);
    if (profilesData) setProfiles(profilesData);

    const [levelsRes, groupsRes] = await Promise.all([
      supabase
        .from("level_templates")
        .select("id, title, level_order, is_published")
        .order("level_order", { ascending: true }),
      supabase
        .from("groups")
        .select("id, name")
        .order("name"),
    ]);

    if (levelsRes.data) {
      setLevels(levelsRes.data);
      const lecMap: Record<string, { id: string; title: string; slot_number: number }[]> = {};
      for (const lv of levelsRes.data) {
        const { data: lecs } = await supabase
          .from("lecture_templates")
          .select("id, title, slot_number")
          .eq("level_template_id", lv.id)
          .order("slot_number", { ascending: true });
        if (lecs) lecMap[lv.id] = lecs;
      }
      setLevelLectures(lecMap);
    }
    if (groupsRes.data) setGroups(groupsRes.data);
  };

  const fetchMessages = async () => {
    if (selectedChatType === "dm" && selectedUserId && myProfile) {
      console.log("Fetching DM messages...");
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*, sender:profiles!sender_id(username, avatar_url, role)")
        .or(
          `and(sender_id.eq.${myProfile.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${myProfile.id})`,
        )
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("DM Fetch error:", error);
      } else {
        console.log("Fetched DM messages:", data);
        setMessages(data || []);
      }
    } else if (selectedChatType === "level" && selectedLevelId) {
      if (!levelChatGroupId) { setMessages([]); return; }
      console.log("Fetching Level messages...");
      let query = supabase
        .from("level_chats")
        .select("*, profiles(username, avatar_url, role)")
        .eq("level_id", selectedLevelId)
        .eq("group_id", levelChatGroupId)
        .order("created_at", { ascending: true });

      if (selectedLectureId) {
        query = query.eq("lecture_id", selectedLectureId);
      } else {
        query = query.is("lecture_id", null);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Level Chat Fetch error:", error);
      } else {
        console.log("Fetched Level messages:", data);
        setMessages(data || []);
      }
    } else if (selectedChatType === "group" && selectedGroupId) {
      const { data, error } = await supabase
        .from("group_messages")
        .select("*, profiles!sender_id(username, avatar_url, role)")
        .eq("group_id", selectedGroupId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Group Chat Fetch error:", error);
      } else {
        setMessages(data || []);
      }
    } else {
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !myProfile) return;

    console.log("Sending message...", { selectedChatType, selectedUserId, selectedLevelId });
    if (selectedChatType === "dm" && selectedUserId) {
      const { error } = await supabase.from("direct_messages").insert([
        {
          sender_id: myProfile.id,
          receiver_id: selectedUserId,
          content: newMessage,
        },
      ]);
      if (error) {
        console.error("DM Send error:", error);
        toast.error(isAr ? "فشل إرسال الرسالة" : "Failed to send message.");
      } else {
        console.log("DM sent successfully");
        fetchMessages(); // Force immediate refresh
      }
    } else if (selectedChatType === "level" && selectedLevelId) {
      if (!levelChatGroupId) { toast.error(isAr ? "اختر مجموعة أولاً" : "Select a group first"); return; }
      const insertData: any = {
        level_id: selectedLevelId,
        sender_id: myProfile.id,
        content: newMessage,
        group_id: levelChatGroupId,
      };
      if (selectedLectureId) insertData.lecture_id = selectedLectureId;
      const { error } = await supabase.from("level_chats").insert([insertData]);
      if (error) {
        console.error("Chat Send error:", error);
        toast.error(isAr ? "فشل إرسال رسالة الفصل" : "Failed to send classroom message.");
      } else {
        console.log("Chat message sent");
        fetchMessages();
      }
    } else if (selectedChatType === "group" && selectedGroupId) {
      const { error } = await supabase.from("group_messages").insert([{
        group_id: selectedGroupId,
        sender_id: myProfile.id,
        content: newMessage,
      }]);
      if (error) {
        toast.error(isAr ? "فشل إرسال الرسالة" : "Failed to send message.");
      } else {
        fetchMessages();
      }
    }
    setNewMessage("");
  };

  const selectChat = async (type: "dm" | "level" | "group", id: string) => {
    setSelectedChatType(type);
    setSelectedLectureId(null);
    setLevelChatGroupId(null);
    setLevelGroups([]);
    if (type === "dm") {
      setSelectedUserId(id);
      setSelectedLevelId(null);
      setSelectedGroupId(null);
    } else if (type === "group") {
      setSelectedGroupId(id);
      setSelectedUserId(null);
      setSelectedLevelId(null);
    } else {
      setSelectedLevelId(id);
      setSelectedUserId(null);
      setSelectedGroupId(null);
      const { data: gla } = await supabase
        .from("group_level_assignments")
        .select("group_id, groups:group_id(id, name)")
        .eq("level_template_id", id);
      if (gla && gla.length > 0) {
        const lvlGroups = gla.map((g: any) => ({ id: g.group_id, name: g.groups?.name || g.group_id }));
        setLevelGroups(lvlGroups);
        if (lvlGroups.length === 1) setLevelChatGroupId(lvlGroups[0].id);
      }
    }
    setMessages([]);
    setNewMessage("");
  };

  const selectLecture = async (levelId: string, lectureId: string) => {
    setSelectedChatType("level");
    setSelectedLevelId(levelId);
    setSelectedLectureId(lectureId);
    setSelectedUserId(null);
    setLevelChatGroupId(null);
    setLevelGroups([]);
    const { data: gla } = await supabase
      .from("group_level_assignments")
      .select("group_id, groups:group_id(id, name)")
      .eq("level_template_id", levelId);
    if (gla && gla.length > 0) {
      const lvlGroups = gla.map((g: any) => ({ id: g.group_id, name: g.groups?.name || g.group_id }));
      setLevelGroups(lvlGroups);
      if (lvlGroups.length === 1) setLevelChatGroupId(lvlGroups[0].id);
    }
    setMessages([]);
    setNewMessage("");
  };

  const toggleLevelExpand = (levelId: string) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(levelId)) next.delete(levelId);
      else next.add(levelId);
      return next;
    });
  };

  const deleteMessage = async (messageId: string) => {
    const table = selectedChatType === "dm" ? "direct_messages" : selectedChatType === "group" ? "group_messages" : "level_chats";
    console.log(`Attempting to delete message ${messageId} from ${table}`);
    const { error } = await supabase.from(table).delete().eq("id", messageId);
    
    if (error) {
      console.error("Delete error:", error);
      toast.error(isAr ? "فشل حذف الرسالة" : "Failed to delete message.");
    } else {
      console.log("Message deleted in DB, refreshing...");
      toast.success(isAr ? "تم حذف الرسالة" : "Message deleted");
      await fetchMessages(); // Ensure refresh completes
      console.log("Messages refreshed");
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.username?.toLowerCase().includes(chatSearch.toLowerCase()) ||
    p.phone_number?.includes(chatSearch)
  );

  const hasChatOpen = selectedChatType && (selectedUserId || selectedLevelId || selectedGroupId);

  return (
    <div className="h-[calc(100dvh-200px)] md:h-[600px] lg:h-[700px] flex flex-col md:flex-row gap-0 md:gap-4 relative">
      {/* Sidebar */}
      <aside className={`${hasChatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-72 lg:w-80 bg-foreground/20 border border-border rounded-xl md:rounded-2xl overflow-hidden flex-col shrink-0 ${hasChatOpen ? '' : 'flex-1 md:flex-none'}`}>
        <div className="p-2 md:p-4 flex flex-col h-full overflow-hidden">
          <h3 className="text-[9px] md:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">
            {isAr ? "قنوات التواصل" : "CHATS"}
          </h3>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder={isAr ? "بحث بالاسم أو الرقم..." : "Search name or number..."}
              className="w-full bg-background/50 border border-border rounded-lg py-1.5 pl-8 pr-3 text-xs font-bold focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground"
            />
            {chatSearch && (
              <button onClick={() => setChatSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
            <h4 className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
              {isAr ? "فصول المستوى" : "LEVELS"}
            </h4>
            {levels.map((level) => {
              const lectures = levelLectures[level.id] || [];
              const isExpanded = expandedLevels.has(level.id);
              const isActiveLevel = selectedChatType === "level" && selectedLevelId === level.id;
              return (
                <div key={level.id}>
                  <div className={`flex items-center gap-2 rounded-xl transition-all border ${isActiveLevel && !selectedLectureId ? "bg-primary/10 border-primary/30 text-foreground" : "hover:bg-muted border-transparent"}`}>
                    <button
                      onClick={() => selectChat("level", level.id)}
                      className="flex-1 flex items-center gap-2.5 p-2 text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-foreground/10 overflow-hidden flex-shrink-0 border border-border">
                        {level.image_url ? (
                            <img src={level.image_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="text-left overflow-hidden flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{level.title}</p>
                        <p className="text-[8px] text-muted-foreground">
                          {lectures.length > 0 ? `${lectures.length} units` : "Channel"}
                        </p>
                      </div>
                    </button>
                    {lectures.length > 0 && (
                      <button
                        onClick={() => toggleLevelExpand(level.id)}
                        className="pr-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>
                    )}
                  </div>
                  {isExpanded && lectures.length > 0 && (
                    <div className="ml-8 mt-0.5 space-y-0.5">
                      {lectures.map((lec) => (
                        <button
                          key={lec.id}
                          onClick={() => selectLecture(level.id, lec.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all ${
                            selectedLectureId === lec.id
                              ? "bg-primary/10 text-foreground"
                              : "hover:bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                          <span className="text-[11px] font-bold truncate">
                            {lec.slot_number}: {lec.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <h4 className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-3 mb-1">
              {isAr ? "مجموعات" : "GROUPS"}
            </h4>
            {groups.filter(g => g.name?.toLowerCase().includes(chatSearch.toLowerCase())).map((group) => (
              <button
                key={group.id}
                onClick={() => selectChat("group", group.id)}
                className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all ${selectedChatType === "group" && selectedGroupId === group.id ? "bg-primary text-black shadow-lg shadow-primary/10" : "hover:bg-muted"}`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex-shrink-0 border border-border flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary/60" />
                </div>
                <div className="text-left overflow-hidden flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{group.name}</p>
                  <p className="text-[9px] text-muted-foreground">{isAr ? "محادثة جماعية" : "Group chat"}</p>
                </div>
              </button>
            ))}

            <h4 className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-3 mb-1">
              {isAr ? "رسائل مباشرة" : "DIRECT MESSAGES"}
            </h4>
            {filteredProfiles.map((p) => (
              <button
                key={p.id}
                onClick={() => selectChat("dm", p.id)}
                className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all ${selectedChatType === "dm" && selectedUserId === p.id ? "bg-primary text-black shadow-lg shadow-primary/10" : "hover:bg-muted"}`}
              >
                <div className="w-10 h-10 rounded-full bg-foreground/10 overflow-hidden flex-shrink-0 border border-border">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[14px] font-black text-muted-foreground/40 uppercase">
                      {p.username?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="text-left overflow-hidden flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{p.username}</p>
                  {p.phone_number && <p className="text-[9px] text-muted-foreground truncate">{p.phone_number}</p>}
                </div>
              </button>
            ))}
            {filteredProfiles.length === 0 && chatSearch && (
              <p className="text-[10px] text-muted-foreground text-center py-3">{isAr ? "لا نتائج" : "No results"}</p>
            )}
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <div className={`${hasChatOpen ? 'flex' : 'hidden md:flex'} flex-1 bg-foreground/20 border border-border rounded-xl md:rounded-2xl flex-col overflow-hidden min-w-0`}>
        {selectedChatType && (selectedUserId || selectedLevelId) ? (
          <>
            {/* WhatsApp-style header */}
            <header className="bg-muted/80 backdrop-blur-md px-3 py-2.5 border-b border-border flex items-center gap-3">
              <button
                onClick={() => { setSelectedChatType(null); setSelectedUserId(null); setSelectedLevelId(null); setSelectedLectureId(null); setMessages([]); }}
                className="md:hidden p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-foreground/10 overflow-hidden flex-shrink-0 border border-border">
                {(() => {
                  if (selectedChatType === "dm") {
                    const profile = profiles.find((p) => p.id === selectedUserId);
                    return profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-black text-muted-foreground/40">{profile?.username?.charAt(0)}</div>;
                  }
                  if (selectedChatType === "group") {
                    return <div className="w-full h-full flex items-center justify-center"><Users className="w-4 h-4 text-primary/60" /></div>;
                  }
                  const selectedLevel = levels.find((l) => l.id === selectedLevelId);
                  return selectedLevel?.image_url ? <img src={selectedLevel.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><MessageSquare className="w-4 h-4 text-muted-foreground/30" /></div>;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">
                  {selectedChatType === "dm"
                    ? profiles.find((p) => p.id === selectedUserId)?.username
                    : selectedChatType === "group"
                      ? groups.find((g) => g.id === selectedGroupId)?.name
                      : selectedLectureId
                        ? (() => {
                            const lecs = levelLectures[selectedLevelId || ""] || [];
                            const lec = lecs.find((l) => l.id === selectedLectureId);
                            return lec ? `Unit ${lec.slot_number}: ${lec.title}` : levels.find((l) => l.id === selectedLevelId)?.title;
                          })()
                        : levels.find((l) => l.id === selectedLevelId)?.title}
                </h3>
                <p className="text-[10px] text-muted-foreground truncate">
                  {selectedChatType === "dm" ? "online" : selectedChatType === "group" ? "group chat" : selectedLectureId ? "lecture chat" : "classroom"}
                </p>
              </div>
            </header>

            {/* Group selector for level chats */}
            {selectedChatType === "level" && levelGroups.length > 1 && (
              <div className="flex gap-1.5 px-3 py-2 border-b border-border bg-muted/40 overflow-x-auto">
                {levelGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { setLevelChatGroupId(g.id); setMessages([]); }}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                      levelChatGroupId === g.id
                        ? "bg-primary text-black"
                        : "bg-foreground/10 text-muted-foreground hover:bg-foreground/20"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
            {selectedChatType === "level" && levelGroups.length === 0 && (
              <div className="px-3 py-2 border-b border-border bg-muted/40">
                <p className="text-[11px] text-muted-foreground text-center">
                  {isAr ? "لا توجد مجموعات مخصصة لهذا المستوى" : "No groups assigned to this level"}
                </p>
              </div>
            )}

            {/* Messages area */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar"
              style={{ background: 'linear-gradient(to bottom, rgba(15,15,15,0.3), rgba(10,10,10,0.5))' }}
            >
              {messages.map((m, i) => {
                  const sender = m.sender || m.profiles;
                  const isMe = m.sender_id === myProfile?.id;
                  const showSender = !isMe && (i === 0 || messages[i - 1]?.sender_id !== m.sender_id);
                  return (
                    <div
                      key={i}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} ${showSender ? "mt-3" : "mt-0.5"}`}
                    >
                      <div
                        className={`relative group max-w-[85%] md:max-w-[65%] ${isMe ? "bg-primary text-black rounded-2xl rounded-br-md shadow-md" : "bg-muted border border-border/50 rounded-2xl rounded-bl-md"} px-3 py-2`}
                      >
                        {!isMe && showSender && (
                          <p className="text-[10px] font-black text-primary/80 mb-0.5">{sender?.username}</p>
                        )}
                        <p className="text-[13px] leading-relaxed">{m.content}</p>
                        <div className={`flex items-center justify-end gap-1.5 mt-0.5 ${isMe ? "text-black/50" : "text-muted-foreground"}`}>
                          <span className="text-[9px]">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isMe && <Check className="w-3 h-3" />}
                        </div>

                        {(isAdmin || isMe) && (
                          <button
                            onClick={() => deleteMessage(m.id)}
                            className="absolute -bottom-4 right-0 p-1.5 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{isAr ? "ابدأ المحادثة" : "Start chatting"}</p>
                </div>
              )}
            </div>

            {/* WhatsApp-style input bar */}
            <div className="bg-muted/60 backdrop-blur-md px-2 py-2 border-t border-border flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={isAr ? "رسالة..." : "Message..."}
                className="flex-1 bg-background border border-border rounded-full py-2.5 px-4 text-sm focus:outline-none focus:border-primary/50 transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || (selectedChatType === "level" && !levelChatGroupId)}
                className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-lg shadow-primary/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-4">
            <MessageSquare className="w-12 h-12 text-muted-foreground/20" />
            <h3 className="font-black italic uppercase tracking-widest text-sm text-muted-foreground">
              {isAr ? "اختر محادثة" : "Select a chat"}
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to generate UUIDs (consider a utility if used elsewhere)
const uuidv4 = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function TaskSubmissionsGrid({ lectureId, levelId, isAr }: { lectureId: string; levelId: string; isAr: boolean }) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingModal, setGradingModal] = useState<any>(null);
  const [gradeValue, setGradeValue] = useState<number>(50);
  const [feedbackValue, setFeedbackValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lectureId) return;
    loadData();
  }, [lectureId]);

  const loadData = async () => {
    setLoading(true);
    const [subsRes, studentsRes] = await Promise.all([
      supabase.from("lecture_task_submissions").select("*, profiles:student_id(username, avatar_url)").eq("lecture_id", lectureId),
      supabase.from("profiles").select("id, username, avatar_url").eq("role", "student"),
    ]);
    setSubmissions(subsRes.data || []);
    setStudents(studentsRes.data || []);
    setLoading(false);
  };

  const handleGrade = async () => {
    if (!gradingModal) return;
    setSaving(true);
    const { error } = await supabase.from("lecture_task_submissions").update({
      grade: gradeValue,
      graded_by: user?.id,
      graded_at: new Date().toISOString(),
    }).eq("id", gradingModal.id);
    setSaving(false);
    if (!error) {
      loadData();
      toast.success(isAr ? "تم التقييم" : "Grade saved");
    }
  };

  const handleApprove = async () => {
    if (!gradingModal) return;
    setSaving(true);
    const { error } = await supabase.rpc("approve_assignment", {
      p_submission_id: gradingModal.id,
      p_moderator_id: user?.id,
      p_feedback: feedbackValue || null,
      p_grade: gradeValue,
    });
    setSaving(false);
    if (!error) {
      setGradingModal(null);
      setFeedbackValue("");
      loadData();
      toast.success(isAr ? "تمت الموافقة على المهمة" : "Assignment approved");
    }
  };

  const handleReject = async () => {
    if (!gradingModal) return;
    setSaving(true);
    const { error } = await supabase.rpc("reject_assignment", {
      p_submission_id: gradingModal.id,
      p_moderator_id: user?.id,
      p_feedback: feedbackValue || null,
      p_grade: gradeValue,
    });
    setSaving(false);
    if (!error) {
      setGradingModal(null);
      setFeedbackValue("");
      loadData();
      toast.success(isAr ? "تم رفض المهمة" : "Assignment rejected");
    }
  };

  const getStudentStatus = (studentId: string) => submissions.find(s => s.student_id === studentId);

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <Camera className="w-3 h-3" /> Task Submissions ({submissions.length}/{students.length})
      </label>

      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {students.map((student) => {
          const sub = getStudentStatus(student.id);
          return (
            <button
              key={student.id}
              onClick={() => sub && setGradingModal(sub)}
              className={`relative p-2 rounded-xl border transition-all text-center ${sub ? "bg-muted/50 border-primary/20 hover:border-primary/40 cursor-pointer" : "bg-muted/30 border-border opacity-50"}`}
            >
              {sub ? (
                <>
                  <img src={sub.image_url} className="w-full h-12 rounded-lg object-cover mb-1" alt="" />
                  {sub.grade !== null && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${sub.grade >= 80 ? "bg-primary/20 text-primary" : sub.grade >= 50 ? "bg-yellow-500/20 text-yellow-500" : "bg-destructive/20 text-destructive"}`}>
                      {sub.grade}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="w-full h-12 rounded-lg bg-muted flex items-center justify-center mb-1">
                    <X className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                  <span className="text-[7px] font-bold text-muted-foreground uppercase">{isAr ? "لم يرسل" : "MISSING"}</span>
                </>
              )}
              <p className="text-[7px] font-bold text-muted-foreground truncate mt-0.5">{student.username}</p>
            </button>
          );
        })}
      </div>

      {gradingModal && (
        <div className="fixed inset-0 z-[250] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setGradingModal(null)}>
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest">{isAr ? "تقييم المهمة" : "GRADE TASK"}</h3>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${gradingModal.status === 'approved' ? 'bg-green-500/20 text-green-500' : gradingModal.status === 'rejected' ? 'bg-red-500/20 text-red-500' : gradingModal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-muted text-muted-foreground'}`}>
                  {gradingModal.status?.toUpperCase()}
                </span>
                <button onClick={() => setGradingModal(null)} className="p-2 rounded-xl bg-muted hover:bg-muted/80"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <img src={gradingModal.image_url} className="w-full max-h-[50vh] object-contain rounded-2xl border border-border" alt="" />
            <div className="flex items-center gap-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? "الدرجة" : "GRADE"}</label>
              <input
                type="range" min={0} max={100} value={gradeValue}
                onChange={(e) => setGradeValue(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-lg font-black text-primary w-12 text-right">{gradeValue}</span>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">{isAr ? "ملاحظات" : "FEEDBACK"}</label>
              <textarea
                value={feedbackValue}
                onChange={(e) => setFeedbackValue(e.target.value)}
                placeholder={isAr ? "اكتب ملاحظات..." : "Write feedback..."}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-muted/30 resize-none"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleGrade}
                disabled={saving}
                className="py-3 bg-muted text-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isAr ? "حفظ الدرجة" : "SAVE GRADE"}
              </button>
              <button
                onClick={handleApprove}
                disabled={saving}
                className="py-3 bg-green-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isAr ? "موافقة" : "APPROVE"}
              </button>
              <button
                onClick={handleReject}
                disabled={saving}
                className="py-3 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                {isAr ? "رفض" : "REJECT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CourseBuilder({ levelId, onBack }: { levelId: string | null; onBack: () => void }) {
  const { isAr } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"info" | "curriculum" | "exam" | "bulk_upload" | "analytics" | "chat">(
    "info",
  );
  const [selectedLectureIdx, setSelectedLectureIdx] = useState<number | null>(0); // Can be null if no lecture selected

  // Level Info State
  const [levelTitle, setLevelTitle] = useState("");
  const [levelOrder, setLevelOrder] = useState<number>(1);
  const [isPublished, setIsPublished] = useState(true);
  const [levelImage, setLevelImage] = useState<string | null>(null);
  const [dripInterval, setDripInterval] = useState<number>(7);

  // Lectures State
  const [lectures, setLectures] = useState<LectureInput[]>([]);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);

  // Form Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Bulk Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedLectures, setParsedLectures] = useState<ParsedLecture[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [loading, setLoading] = useState(true); // Added for CourseBuilder itself

  useEffect(() => {
    if (levelId) loadLevelData();
    else {
      fetchNextOrder();
      setLoading(false); // No need to load if creating new
    }
  }, [levelId]);

  const fetchNextOrder = async () => {
    const { data } = await supabase
      .from("level_templates")
      .select("level_order")
      .order("level_order", { ascending: false })
      .limit(1);
    if (data && data.length > 0) setLevelOrder(data[0].level_order + 1);
  };

  const loadLevelData = async () => {
    setLoading(true);
    const { data: level, error: levelError } = await supabase
      .from("level_templates")
      .select("*")
      .eq("id", levelId)
      .single();
    if (levelError) {
      toast.error(isAr ? "فشل تحميل بيانات المستوى" : "Failed to load level data");
      onBack();
      return;
    }

    if (level) {
      setLevelTitle(level.title);
      setLevelOrder(level.level_order);
      setIsPublished(level.is_published);
      setLevelImage(level.image_url);
      setDripInterval(level.drip_interval_days || 7);

      const { data: lects } = await supabase
        .from("lecture_templates")
        .select("*")
        .eq("level_template_id", levelId)
        .order("slot_number", { ascending: true });
      if (lects) {
        setLectures(lects.map((l) => ({ ...l, content_blocks: l.content_blocks || [] })));
        if (lects.length > 0) setSelectedLectureIdx(0);
      }

      const { data: exam } = await supabase
        .from("exam_templates")
        .select("questions")
        .eq("level_template_id", levelId)
        .single();
      if (exam && exam.questions) setExamQuestions(exam.questions as Question[]);
    }
    setLoading(false);
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      if (!user) {
        toast.error(isAr ? "الرجاء تسجيل الدخول للتحميل" : "Please log in to upload.");
        return;
      }
      const file = event.target.files[0];
      const v = validateFile(file, "video", true);
      if (!v.valid) { toast.error(v.error); return; }
      setUploadingFile(true);
      const filePath = safeStoragePath("lectures", file.name, user.id);

      const { error: uploadError } = await supabase.storage.from("videos").upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(filePath);

      if (selectedLectureIdx !== null) {
        const newLects = [...lectures];
        newLects[selectedLectureIdx].video_url = publicUrl;
        setLectures(newLects);
        toast.success(isAr ? "تم رفع الفيديو بنجاح" : "Video uploaded successfully");
      }
    } catch (err: any) {
      toast.error(err.message || (isAr ? "فشل رفع الفيديو" : "Video upload failed"));
    } finally {
      setUploadingFile(false);
    }
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      if (!user) {
        toast.error(isAr ? "الرجاء تسجيل الدخول للتحميل" : "Please log in to upload.");
        return;
      }
      const file = event.target.files[0];
      const v = validateFile(file, "pdf", true);
      if (!v.valid) { toast.error(v.error); return; }
      setUploadingFile(true);
      const filePath = safeStoragePath("lectures", file.name, user.id);

      const { error: uploadError } = await supabase.storage.from("videos").upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(filePath);

      if (selectedLectureIdx !== null) {
        const newLects = [...lectures];
        newLects[selectedLectureIdx].pdf_url = publicUrl;
        setLectures(newLects);
        toast.success(isAr ? "تم رفع الملف بنجاح" : "PDF uploaded successfully");
      }
    } catch (err: any) {
      toast.error(err.message || (isAr ? "فشل رفع الملف" : "PDF upload failed"));
    } finally {
      setUploadingFile(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadedFile(event.target.files[0]);
      setParsedLectures([]); // Clear previous parsed data
    }
  };

  const handleParseFile = async () => {
    if (!uploadedFile) {
      toast.error(isAr ? "الرجاء تحديد ملف للتحميل" : "Please select a file to upload.");
      return;
    }

    setIsParsing(true);
    setParsedLectures([]); // Clear previous results
    try {
      let parsed: ParsedLecture[] = [];
      if (uploadedFile.name.endsWith(".docx")) {
        parsed = await parseDocx(uploadedFile);
      } else if (uploadedFile.name.endsWith(".xlsx")) {
        parsed = await parseXlsx(uploadedFile);
      } else {
        throw new Error(isAr ? "نوع الملف غير مدعوم" : "Unsupported file type.");
      }
      setParsedLectures(parsed);
      toast.success(isAr ? "تم تحليل الملف بنجاح" : "File parsed successfully!");
    } catch (error: any) {
      console.error("File parsing error:", error);
      toast.error(error.message || (isAr ? "فشل تحليل الملف" : "File parsing failed."));
    } finally {
      setIsParsing(false);
    }
  };

  const importParsedLectures = () => {
    const newLectures = [...lectures];
    let currentSlotNumber =
      newLectures.length > 0 ? Math.max(...newLectures.map((l) => l.slot_number || 0)) : 0;

    parsedLectures.forEach((parsedLec) => {
      currentSlotNumber++;
      newLectures.push({
        ...parsedLec,
        id: uuidv4(), // Generate ID for new lecture
        slot_number: currentSlotNumber,
        content_blocks: parsedLec.content_blocks.map((block) => ({
          ...block,
          id: uuidv4(),
        })) as ContentBlock[],
      });
    });
    setLectures(newLectures);
    setParsedLectures([]); // Clear parsed data after import
    setUploadedFile(null);
    setActiveTab("curriculum"); // Switch to curriculum to review
    if (newLectures.length > 0) setSelectedLectureIdx(newLectures.length - 1);
    toast.success(isAr ? "تم استيراد المحاضرات" : "Lectures imported successfully!");
  };

  const handleLevelImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const v = validateFile(file, "image", true);
      if (!v.valid) { toast.error(v.error); return; }
      setUploadingFile(true);
      const filePath = safeStoragePath("levels", file.name);

      const { error: uploadError } = await supabase.storage.from("course_files").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("course_files").getPublicUrl(filePath);
      setLevelImage(publicUrl);
      toast.success(isAr ? "تم رفع صورة المستوى" : "Level image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileUpload = async (file: File, lectureIdx: number, blockIdx: number) => {
    try {
      const blockType = lectures[lectureIdx]?.content_blocks?.[blockIdx]?.type || "download";
      const ctx: UploadContext = blockType === "image" ? "image" : blockType === "pdf" || blockType === "word" ? "document" : "chatFile";
      const v = validateFile(file, ctx, true);
      if (!v.valid) { toast.error(v.error); return; }
      setUploadingFile(true);
      const filePath = safeStoragePath("blocks", file.name);

      const { error: uploadError } = await supabase.storage.from("course_files").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("course_files").getPublicUrl(filePath);

      const newLects = [...lectures];
      if (newLects[lectureIdx].content_blocks) {
        newLects[lectureIdx].content_blocks![blockIdx].content = publicUrl;
        setLectures(newLects);
        toast.success(isAr ? "تم رفع الملف بنجاح" : "File uploaded successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSave = async () => {
    if (!levelTitle) return toast.error(isAr ? "العنوان مطلوب" : "Title is required");
    setIsSubmitting(true);

    try {
      let currentLevelId = levelId;
      const levelPayload: any = { 
          title: levelTitle, 
          level_order: levelOrder, 
          is_published: !!isPublished,
          image_url: levelImage,
          drip_interval_days: dripInterval
      };

      if (!currentLevelId) {
        const { data, error } = await supabase
          .from("level_templates")
          .insert([{ ...levelPayload, created_by: user?.id }])
          .select()
          .single();
        if (error) throw error;
        currentLevelId = data.id;
      } else {
        const { error } = await supabase
          .from("level_templates")
          .update(levelPayload)
          .eq("id", levelId);
        if (error) throw error;
      }

      const { data: existingLectures } = await supabase
        .from("lecture_templates")
        .select("id")
        .eq("level_template_id", currentLevelId);

      const existingIds = existingLectures?.map((l) => l.id) || [];
      const lecturesToSave = lectures
        .filter((l) => l.title.trim() !== "")
        .map((l, index) => ({
          id: l.id || uuidv4(),
          title: l.title,
          description: l.description || null,
          video_url: l.video_url || null,
          pdf_url: l.pdf_url || null,
          slot_number: index + 1,
          level_template_id: currentLevelId,
          is_live: l.is_live !== false,
          content_blocks: l.content_blocks || [],
          is_big_exam: !!l.is_big_exam,
          drip_days: l.drip_days || 7,
          quiz_data: l.quiz_data || []
        }));

      const currentIds = lecturesToSave.map((l) => l.id);
      const idsToDelete = existingIds.filter((id) => !currentIds.includes(id));

      // Delete lectures that were removed
      if (idsToDelete.length > 0) {
        await supabase.from("lecture_templates").delete().in("id", idsToDelete);
      }

      // Upsert lectures
      if (lecturesToSave.length > 0) {
        const { error: upsertError } = await supabase.from("lecture_templates").upsert(lecturesToSave);
        if (upsertError) throw upsertError;
      }

      // Save exam
      if (examQuestions.length > 0) {
        const { data: existingExam, error: fetchError } = await supabase
          .from("exam_templates")
          .select("id")
          .eq("level_template_id", currentLevelId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingExam) {
          const { error: updateError } = await supabase
            .from("exam_templates")
            .update({ 
              title: `Exam for ${levelTitle}`, 
              questions: examQuestions 
            })
            .eq("id", existingExam.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from("exam_templates")
            .insert([
              {
                level_template_id: currentLevelId,
                title: `Exam for ${levelTitle}`,
                questions: examQuestions,
              },
            ]);
          if (insertError) throw insertError;
        }
      }

      toast.success(isAr ? "تم الحفظ بنجاح" : "System Deployed Successfully");
      onBack();
    } catch (err: any) {
      toast.error(err.message || (isAr ? "فشل الحفظ" : "Save failed."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBlock = (type: "text" | "code" | "image" | "pdf" | "download" | "word" | "quiz" | "canvas", lectureIndex: number) => {
    const newLects = [...lectures];
    if (!newLects[lectureIndex]) {
      toast.error(isAr ? "الرجاء اختيار محاضرة أولاً" : "Please select a lecture first.");
      return;
    }
    if (!newLects[lectureIndex].content_blocks) newLects[lectureIndex].content_blocks = [];
    
    const newBlock: ContentBlock = {
      id: uuidv4(),
      type,
      content: "",
    };

    if (type === "quiz") {
      newBlock.metadata = { quiz: { question: "", options: [""], correctOptionIndex: 0 } };
    }

    newLects[lectureIndex].content_blocks!.push(newBlock);
    setLectures(newLects);
  };

  const addLecture = () => {
    setLectures((prev) => [
      ...prev,
      {
        id: uuidv4(),
        title: "",
        description: "",
        video_url: "",
        pdf_url: "",
        slot_number: prev.length + 1,
        is_live: false, // Default to draft
        content_blocks: [],
      },
    ]);
    setSelectedLectureIdx(lectures.length);
    setActiveTab("curriculum");
  };

  const moveLecture = (fromIndex: number, toIndex: number) => {
    const updatedLectures = [...lectures];
    const [movedLecture] = updatedLectures.splice(fromIndex, 1);
    updatedLectures.splice(toIndex, 0, movedLecture);
    setLectures(updatedLectures.map((lec, idx) => ({ ...lec, slot_number: idx + 1 })));
    setSelectedLectureIdx(toIndex);
  };

  const deleteLecture = (indexToDelete: number) => {
    const newLectures = lectures.filter((_, idx) => idx !== indexToDelete);
    setLectures(newLectures.map((lec, idx) => ({ ...lec, slot_number: idx + 1 })));
    if (selectedLectureIdx !== null && selectedLectureIdx === indexToDelete) {
      setSelectedLectureIdx(null); // Deselect if the current one is deleted
    } else if (selectedLectureIdx !== null && selectedLectureIdx > indexToDelete) {
      setSelectedLectureIdx(selectedLectureIdx - 1); // Adjust index if lecture before it was deleted
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <div className="h-12 md:h-16 bg-card/90 backdrop-blur-xl border-b border-border px-2 md:px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={onBack}
            className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-[9px] md:text-xs font-black text-muted-foreground uppercase tracking-widest">
              {levelId ? "EDIT MODE" : "CREATION MODE"}
            </h2>
            <h1 className="text-sm md:text-base font-bold tracking-tight truncate max-w-[120px] md:max-w-none">{levelTitle || "Untitled Course"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center gap-2 mr-4 px-3 py-1.5 bg-muted/50 rounded-full border border-border">
            <span className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              Status:
            </span>
            <select
              value={isPublished ? "true" : "false"}
              onChange={(e) => setIsPublished(e.target.value === "true")}
              className="bg-transparent text-[8px] md:text-[9px] font-black uppercase text-lime-400 outline-none"
            >
              <option value="true">Live</option>
              <option value="false">Draft</option>
            </select>
          </div>
          <HeroButton
            onClick={handleSave}
            loading={isSubmitting}
            variant="primary"
            className="bg-primary text-black px-5 md:px-8 h-9 md:h-10 rounded-xl md:rounded-2xl text-[10px] md:text-xs"
          >
            <Save className="w-4 h-4 mr-2" />
            {isAr ? "حفظ ونشر" : "DEPLOY"}
          </HeroButton>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
        <aside className="w-full md:w-64 lg:w-80 bg-card border-b md:border-b-0 md:border-r border-border flex flex-col overflow-y-auto no-scrollbar max-h-[140px] md:max-h-none shrink-0">
          <div className="p-3 md:p-4 lg:p-6">
            <button
              onClick={() => {
                setActiveTab("info");
                setSelectedLectureIdx(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 md:py-3.5 rounded-xl md:rounded-2xl transition-all mb-4 md:mb-6 ${activeTab === "info" ? "bg-primary text-black shadow-lg shadow-primary/10" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                {isAr ? "معلومات الكورس" : "Course Info"}
              </span>
            </button>

            <div className="space-y-0.5 md:space-y-1 mb-4 md:mb-6">
              <div className="flex items-center justify-between px-4 mb-2 md:mb-3">
                <span className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                  {isAr ? "المنهج الدراسي" : "Syllabus"}
                </span>
                <HeroButton
                  onClick={addLecture}
                  size="sm"
                  variant="outline"
                  className="px-2 md:px-3 h-7 md:h-8 border-lime-500/20 text-lime-500 hover:bg-lime-500/10"
                >
                  <Plus className="w-3 h-3" />
                </HeroButton>
              </div>
              {lectures.length === 0 && (
                <p className="text-muted-foreground text-xs text-center px-4 py-2">
                  {isAr
                    ? "لا توجد محاضرات. استخدم 'إضافة محاضرة' أو 'تحميل جماعي'"
                    : "No lectures. Use 'Add Lecture' or 'Bulk Upload'"}
                </p>
              )}
              {lectures.map((l, i) => (
                <div key={l.id || `new-lec-${i}`} className="flex items-center gap-1">
                  <button
                    onClick={() => moveLecture(i, i - 1)}
                    disabled={i === 0}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30"
                  >
                    <GripVertical className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => moveLecture(i, i + 1)}
                    disabled={i === lectures.length - 1}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30"
                  >
                    <GripVertical className="w-3 h-3" />
                  </button>
                  <div
                    onClick={() => {
                      setActiveTab("curriculum");
                      setSelectedLectureIdx(i);
                    }}
                    className={`flex-1 flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-lg md:rounded-xl transition-all text-left cursor-pointer ${activeTab === "curriculum" && selectedLectureIdx === i ? "bg-muted text-foreground border border-border" : "text-muted-foreground hover:text-foreground/60 hover:bg-muted/50"}`}
                  >
                    <div
                      className={`w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center text-[8px] md:text-[9px] font-black ${l.title ? "bg-lime-500/20 text-lime-500" : "bg-muted/50 text-muted-foreground"}`}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold truncate flex-1">
                      {l.title || (isAr ? `محاضرة ${i + 1}` : `Lecture ${i + 1}`)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const nl = [...lectures];
                        const currentlyLive = nl[i].is_live !== false;
                        nl[i].is_live = !currentlyLive;
                        setLectures(nl);
                      }}
                      className={`px-2 py-0.5 rounded text-[7px] font-black uppercase transition-all ${l.is_live !== false ? "bg-green-500/20 text-green-500 border border-green-500/20" : "bg-red-500/20 text-red-500 border border-red-500/20"}`}
                    >
                      {l.is_live !== false ? "LIVE" : "DRAFT"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLecture(i);
                      }}
                      className="p-1 rounded-md text-red-500/50 hover:text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setActiveTab("exam");
                setSelectedLectureIdx(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl md:rounded-2xl transition-all border mb-3 md:mb-4 ${activeTab === "exam" ? "bg-yellow-500 text-black border-yellow-400" : "text-muted-foreground border-border hover:text-foreground"}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                {isAr ? "الاختبار النهائي" : "Final Exam"}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("bulk_upload");
                setSelectedLectureIdx(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl md:rounded-2xl transition-all border mb-3 md:mb-4 ${activeTab === "bulk_upload" ? "bg-purple-500 text-black border-purple-400" : "text-muted-foreground border-border hover:text-foreground"}`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                {isAr ? "تحميل جماعي" : "BULK UPLOAD"}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("chat" as any);
                setSelectedLectureIdx(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl md:rounded-2xl transition-all border ${activeTab === "chat" ? "bg-lime-500 text-black border-lime-400" : "text-muted-foreground border-border hover:text-foreground"}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                {isAr ? "غرفة المحادثة" : "LEVEL CHAT"}
              </span>
            </button>
          </div>
        </aside>

        <main className="flex-1 bg-foreground/20 p-3 md:p-8 lg:p-12 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === "info" && (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-3xl space-y-6 md:space-y-8"
              >
                <div className="space-y-1.5">
                  <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase">
                    {isAr ? "إعدادات المستوى" : "Level Settings"}
                  </h2>
                  <p className="text-muted-foreground text-[10px] md:text-xs font-bold">
                    {isAr
                      ? "المعلومات الأساسية للمسار التعليمي"
                      : "Define the core parameters for this educational track"}
                  </p>
                </div>
                <div className="grid gap-3 md:gap-6 bg-muted/30 border border-border p-3 md:p-6 rounded-xl md:rounded-3xl">
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {isAr ? "صورة الغلاف" : "Cover Media"}
                    </label>
                    <div className="flex gap-4 md:gap-6 items-center">
                        <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl md:rounded-3xl bg-muted border border-border overflow-hidden flex-shrink-0">
                            {levelImage ? (
                                <img src={levelImage} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <Layout className="w-8 h-8 md:w-10 md:h-10" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-3">
                            <input 
                                type="file" 
                                id="level-image-upload" 
                                hidden 
                                accept="image/*"
                                onChange={handleLevelImageUpload}
                            />
                            <HeroButton 
                                onClick={() => document.getElementById('level-image-upload')?.click()}
                                disabled={uploadingFile}
                                size="sm" 
                                variant="primary"
                                className="bg-lime-500 border-lime-400 text-black px-8"
                            >
                                {uploadingFile ? <Loader2 className="animate-spin w-4 h-4" /> : (isAr ? "رفع صورة" : "Upload Image")}
                            </HeroButton>
                            <p className="text-[8px] text-muted-foreground uppercase font-black">
                                Recommended: 16:9 Aspect Ratio (800x450px)
                            </p>
                        </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Level Title
                    </label>
                    <input
                      type="text"
                      value={levelTitle}
                      onChange={(e) => setLevelTitle(e.target.value)}
                      className="w-full bg-card/80 border border-border rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 text-sm md:text-lg font-bold outline-none focus:border-lime-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Level Order
                    </label>
                    <input
                      type="number"
                      value={levelOrder}
                      onChange={(e) => setLevelOrder(parseInt(e.target.value))}
                      className="w-full bg-card/80 border border-border rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 text-sm md:text-lg font-bold outline-none focus:border-lime-500/50 transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Published
                    </label>
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="h-5 w-5 accent-primary"
                    />
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t border-border">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Clock className="w-3 h-3 text-emerald-400" /> Global Drip Interval (Days)
                    </label>
                    <input
                      type="number"
                      value={dripInterval}
                      onChange={(e) => setDripInterval(parseInt(e.target.value))}
                      className="w-full bg-card/80 border border-border rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 text-sm md:text-lg font-bold outline-none focus:border-lime-500/50 transition-all"
                      placeholder="e.g. 7"
                    />
                    <p className="text-[8px] text-muted-foreground uppercase font-black px-2">
                        Controls how many days between each module release. 
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "curriculum" &&
              selectedLectureIdx !== null &&
              lectures[selectedLectureIdx] && (
                <motion.div
                  key="curriculum"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-4xl space-y-10"
                >
                  <div className="flex justify-between items-end border-b border-border pb-10">
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black italic tracking-tighter uppercase">
                        {isAr
                          ? `المحاضرة ${lectures[selectedLectureIdx].slot_number}`
                          : `Lecture Module ${lectures[selectedLectureIdx].slot_number}`}
                      </h2>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-lime-500/60 text-[10px] font-black uppercase tracking-[0.4em]">
                          CONTENT ARCHITECT
                        </p>
                        <div className="h-4 w-px bg-muted"></div>
                        <button
                          onClick={() => {
                            const nl = [...lectures];
                            const currentlyLive = nl[selectedLectureIdx].is_live !== false;
                            nl[selectedLectureIdx].is_live = !currentlyLive;
                            setLectures(nl);
                          }}
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${lectures[selectedLectureIdx].is_live !== false ? "bg-green-500/20 text-green-500 border border-green-500/20" : "bg-red-500/20 text-red-500 border border-red-500/20"}`}
                        >
                          {lectures[selectedLectureIdx].is_live !== false ? (isAr ? "مباشر" : "LIVE STATUS") : (isAr ? "مسودة" : "DRAFT MODE")}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-10">
                    <div className="space-y-2 md:space-y-4">
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Lecture Headline
                      </label>
                      <input
                        type="text"
                        value={lectures[selectedLectureIdx].title}
                        onChange={(e) => {
                          const newLects = [...lectures];
                          newLects[selectedLectureIdx].title = e.target.value;
                          setLectures(newLects);
                        }}
                        className="w-full bg-muted/50 border border-border rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 text-sm md:text-xl font-bold outline-none focus:border-lime-500/50"
                      />
                    </div>
                    <div className="space-y-2 md:space-y-4">
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Description
                      </label>
                      <textarea
                        value={lectures[selectedLectureIdx].description}
                        onChange={(e) => {
                          const newLects = [...lectures];
                          newLects[selectedLectureIdx].description = e.target.value;
                          setLectures(newLects);
                        }}
                        className="w-full bg-muted/50 border border-border rounded-2xl md:rounded-[32px] px-4 md:px-8 py-3 md:py-6 text-xs md:text-sm font-bold outline-none focus:border-lime-500/50 resize-none"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                      <div className="space-y-2 md:space-y-4">
                        <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <Clock className="w-3 h-3" /> Module Drip Duration (Days)
                        </label>
                        <input
                          type="number"
                          value={lectures[selectedLectureIdx].drip_days || 7}
                          onChange={(e) => {
                            const newLects = [...lectures];
                            newLects[selectedLectureIdx].drip_days = parseInt(e.target.value);
                            setLectures(newLects);
                          }}
                          className="w-full bg-muted/50 border border-border rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold outline-none focus:border-lime-500/50"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 md:p-6 bg-muted/50 border border-border rounded-xl md:rounded-2xl">
                        <div className="flex items-center gap-3">
                            <GraduationCap className="w-5 h-5 text-emerald-400" />
                            <div>
                                <p className="text-[10px] font-black uppercase text-foreground">Big Exam Unit</p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase">Marks this as a milestone exam</p>
                            </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!lectures[selectedLectureIdx].is_big_exam}
                          onChange={(e) => {
                            const newLects = [...lectures];
                            newLects[selectedLectureIdx].is_big_exam = e.target.checked;
                            setLectures(newLects);
                          }}
                          className="h-5 w-5 accent-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                      <div className="space-y-2 md:space-y-4">
                        <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <Video className="w-3 h-3" /> Video Source (URL or Upload)
                        </label>
                        <div className="flex gap-1.5 md:gap-2">
                          <input
                            type="text"
                            value={lectures[selectedLectureIdx].video_url}
                            onChange={(e) => {
                              const newLects = [...lectures];
                              newLects[selectedLectureIdx].video_url = e.target.value;
                              setLectures(newLects);
                            }}
                            placeholder="YouTube Link or Upload Video"
                            className="flex-1 bg-muted/50 border border-border rounded-xl md:rounded-2xl px-3 md:px-6 py-2.5 md:py-4 text-xs md:text-sm font-bold outline-none focus:border-lime-500/50"
                          />
                          <button
                            onClick={() => videoInputRef.current?.click()}
                            disabled={uploadingFile}
                            className="px-3 md:px-6 rounded-xl md:rounded-2xl bg-lime-500 text-black font-black uppercase text-[9px] md:text-[10px] hover:scale-105 transition-all disabled:opacity-50"
                          >
                            {uploadingFile ? <Plus className="w-4 h-4 animate-spin" /> : "Upload"}
                          </button>
                          <input
                            type="file"
                            ref={videoInputRef}
                            onChange={handleVideoUpload}
                            className="hidden"
                            accept="video/*"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 md:space-y-4">
                        <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <FileText className="w-3 h-3" /> PDF Source (URL or Upload)
                        </label>
                        <div className="flex gap-1.5 md:gap-2">
                          <input
                            type="text"
                            value={lectures[selectedLectureIdx].pdf_url}
                            onChange={(e) => {
                              const newLects = [...lectures];
                              newLects[selectedLectureIdx].pdf_url = e.target.value;
                              setLectures(newLects);
                            }}
                            placeholder="PDF Link or Upload PDF"
                            className="flex-1 bg-muted/50 border border-border rounded-xl md:rounded-2xl px-3 md:px-6 py-2.5 md:py-4 text-xs md:text-sm font-bold outline-none focus:border-lime-500/50"
                          />
                          <button
                            onClick={() => pdfInputRef.current?.click()}
                            disabled={uploadingFile}
                            className="px-3 md:px-6 rounded-xl md:rounded-2xl bg-lime-500 text-black font-black uppercase text-[9px] md:text-[10px] hover:scale-105 transition-all disabled:opacity-50"
                          >
                            {uploadingFile ? <Plus className="w-4 h-4 animate-spin" /> : "Upload"}
                          </button>
                          <input
                            type="file"
                            ref={pdfInputRef}
                            onChange={handlePdfUpload}
                            className="hidden"
                            accept=".pdf"
                          />
                        </div>
                      </div>

                      {/* Task Submissions Grid */}
                      <TaskSubmissionsGrid
                        lectureId={lectures[selectedLectureIdx]?.id || ""}
                        levelId={levelId || ""}
                        isAr={isAr}
                      />

                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Advanced Content Blocks
                        </label>
                        <div className="flex gap-1 md:gap-2 flex-wrap">
                          {["text", "code", "image", "pdf", "download", "word", "quiz", "canvas"].map(type => (
                            <button
                              key={type}
                              onClick={() => addBlock(type as any, selectedLectureIdx)}
                              className="p-1.5 md:p-2 bg-muted/50 rounded-md md:rounded-lg hover:bg-primary hover:text-black transition-colors text-[8px] md:text-[10px] font-black uppercase"
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {lectures[selectedLectureIdx]?.content_blocks?.map((block, bIdx) => {
                          if (!block || !block.id) {
                            console.error("Invalid block detected at index", bIdx);
                            return null;
                          }
                          return (
                          <div
                            key={block.id}
                            className="relative group p-3 md:p-6 bg-muted/30 border border-border rounded-xl md:rounded-3xl"
                          >
                            <button
                              onClick={() => {
                                const nl = [...lectures];
                                nl[selectedLectureIdx].content_blocks!.splice(bIdx, 1);
                                setLectures(nl);
                              }}
                              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
                              <span className="text-[8px] font-black uppercase text-primary">
                                {block.type} BLOCK
                              </span>
                            </div>
                            
                            {/* Editor based on type */}
                            {block.type === "text" && (
                              <textarea
                                value={block.content || ""}
                                onChange={(e) => {
                                  const nl = [...lectures];
                                  if (nl[selectedLectureIdx].content_blocks) {
                                    nl[selectedLectureIdx].content_blocks![bIdx].content = e.target.value;
                                    setLectures(nl);
                                  }
                                }}
                                placeholder="Enter text..."
                                className="w-full bg-foreground/20 p-4 rounded-xl outline-none text-sm"
                                rows={4}
                              />
                            )}
                            
                            {block.type === "code" && (
                              <textarea
                                value={block.content || ""}
                                onChange={(e) => {
                                  const nl = [...lectures];
                                  if (nl[selectedLectureIdx].content_blocks) {
                                    nl[selectedLectureIdx].content_blocks![bIdx].content = e.target.value;
                                    setLectures(nl);
                                  }
                                }}
                                placeholder="Enter code..."
                                className="w-full bg-muted/50 border border-border p-4 rounded-xl outline-none text-sm font-mono text-lime-400"
                                rows={8}
                              />
                            )}

                            {(block.type === "image" || block.type === "pdf" || block.type === "word" || block.type === "canvas" || block.type === "download") && (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={block.content || ""}
                                  onChange={(e) => {
                                    const nl = [...lectures];
                                    if (nl[selectedLectureIdx].content_blocks) {
                                      nl[selectedLectureIdx].content_blocks![bIdx].content = e.target.value;
                                      setLectures(nl);
                                    }
                                  }}
                                  placeholder={`${block.type} URL...`}
                                  className="flex-1 bg-foreground/20 p-4 rounded-xl outline-none text-sm"
                                />
                                <button
                                  onClick={() => {
                                      const input = document.createElement("input");
                                      input.type = "file";
                                      input.accept = block.type === "image" ? "image/*" : block.type === "pdf" ? ".pdf" : block.type === "word" ? ".docx" : "*";
                                      input.onchange = (e) => {
                                          const file = (e.target as HTMLInputElement).files?.[0];
                                          if (file) handleFileUpload(file, selectedLectureIdx, bIdx);
                                      };
                                      input.click();
                                  }}
                                  className="p-4 bg-lime-500 rounded-xl"
                                >
                                  {uploadingFile ? <Plus className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                                </button>
                              </div>
                            )}

                            {block.type === "quiz" && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={block.metadata?.quiz?.question || ""}
                                  onChange={(e) => {
                                    const nl = [...lectures];
                                    // Robust initialization
                                    if(!nl[selectedLectureIdx].content_blocks![bIdx].metadata) 
                                        nl[selectedLectureIdx].content_blocks![bIdx].metadata = {quiz: {question: "", options: [""], correctOptionIndex: 0}};
                                    if(!nl[selectedLectureIdx].content_blocks![bIdx].metadata!.quiz)
                                        nl[selectedLectureIdx].content_blocks![bIdx].metadata!.quiz = {question: "", options: [""], correctOptionIndex: 0};
                                        
                                    nl[selectedLectureIdx].content_blocks![bIdx].metadata!.quiz!.question = e.target.value;
                                    setLectures(nl);
                                  }}
                                  placeholder="Question..."
                                  className="w-full bg-foreground/20 p-4 rounded-xl outline-none text-sm mb-2"
                                />
                                {(block.metadata?.quiz?.options || [""]).map((opt, oIdx) => (
                                  <div key={oIdx} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={opt} 
                                        onChange={(e) => {
                                            const nl = [...lectures];
                                            nl[selectedLectureIdx].content_blocks![bIdx].metadata!.quiz!.options[oIdx] = e.target.value;
                                            setLectures(nl);
                                        }}
                                        className="flex-1 bg-foreground/20 p-2 rounded-lg"
                                    />
                                    <input 
                                        type="radio" 
                                        checked={block.metadata?.quiz?.correctOptionIndex === oIdx}
                                        onChange={() => {
                                            const nl = [...lectures];
                                            nl[selectedLectureIdx].content_blocks![bIdx].metadata!.quiz!.correctOptionIndex = oIdx;
                                            setLectures(nl);
                                        }}
                                    />
                                  </div>
                                ))}
                                <button 
                                  onClick={() => {
                                      const nl = [...lectures];
                                      // Robust initialization
                                      if(!nl[selectedLectureIdx].content_blocks![bIdx].metadata) nl[selectedLectureIdx].content_blocks![bIdx].metadata = {quiz: {question: "", options: [""], correctOptionIndex: 0}};
                                      if(!nl[selectedLectureIdx].content_blocks![bIdx].metadata!.quiz) nl[selectedLectureIdx].content_blocks![bIdx].metadata!.quiz = {question: "", options: [""], correctOptionIndex: 0};
                                      
                                      nl[selectedLectureIdx].content_blocks![bIdx].metadata!.quiz!.options.push("");
                                      setLectures(nl);
                                  }}
                                  className="text-[10px] text-primary"
                                >+ Add Option</button>
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            {activeTab === "exam" && (
              <motion.div
                key="exam"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl space-y-10"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase">
                    {isAr ? "أسئلة الاختبار" : "Exam Questions"}
                  </h2>
                  <p className="text-muted-foreground text-xs font-bold">
                    {isAr
                      ? "إدارة أسئلة الاختبار التقييمي"
                      : "Manage questions for the evaluative exam"}
                  </p>
                </div>
                {examQuestions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-muted/30 border border-border space-y-4 md:space-y-6 relative group"
                  >
                    <button
                      onClick={() => setExamQuestions((prev) => prev.filter((_, i) => i !== qIdx))}
                      className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="space-y-3 md:space-y-4">
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Question {qIdx + 1}
                      </label>
                      <textarea
                        value={q.text}
                        onChange={(e) => {
                          const newQ = [...examQuestions];
                          newQ[qIdx].text = e.target.value;
                          setExamQuestions(newQ);
                        }}
                        className="w-full bg-card/80 border border-border rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 text-sm md:text-lg font-bold outline-none resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Options
                      </label>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2 md:gap-4">
                          <input
                            type="radio"
                            name={`question-${qIdx}`}
                            checked={q.correct === optIdx}
                            onChange={() => {
                              const newQ = [...examQuestions];
                              newQ[qIdx].correct = optIdx;
                              setExamQuestions(newQ);
                            }}
                            className="h-4 w-4 md:h-5 md:w-5 accent-primary"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newQ = [...examQuestions];
                              newQ[qIdx].options[optIdx] = e.target.value;
                              setExamQuestions(newQ);
                            }}
                            className="flex-1 bg-card/80 border border-border rounded-xl md:rounded-2xl px-3 md:px-6 py-2 md:py-4 text-xs md:text-sm font-bold outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <HeroButton
                  onClick={() =>
                    setExamQuestions((prev) => [
                      ...prev,
                      { id: uuidv4(), text: "", options: ["", "", "", ""], correct: 0 },
                    ])
                  }
                  variant="outline"
                  className="w-full h-10 md:h-12 border-border text-muted-foreground hover:text-primary hover:border-primary/50"
                >
                  <Plus className="w-4 h-4 mr-2" /> {isAr ? "إضافة سؤال" : "Add Question"}
                </HeroButton>
              </motion.div>
            )}

            {activeTab === "bulk_upload" && (
              <motion.div
                key="bulk_upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-3xl space-y-10"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase">
                    {isAr ? "تحميل المحاضرات دفعة واحدة" : "Bulk Upload Lectures"}
                  </h2>
                  <p className="text-muted-foreground text-xs font-bold">
                    {isAr
                      ? "استورد المحاضرات من ملفات Word أو Excel"
                      : "Import lectures from Word or Excel files"}
                  </p>
                </div>
                <div className="grid gap-4 md:gap-6 bg-muted/30 border border-border p-5 md:p-8 rounded-2xl md:rounded-3xl">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      اختر ملف
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="w-full text-muted-foreground bg-card/80 border border-border rounded-2xl px-6 py-4 outline-none focus:border-purple-500/50 transition-all"
                      accept=".docx, .xlsx"
                    />
                  </div>
                  <HeroButton
                    onClick={handleParseFile}
                    loading={isParsing}
                    variant="primary"
                    className="bg-purple-500 text-black px-10 h-12 rounded-xl"
                    disabled={!uploadedFile}
                  >
                    {isParsing ? (
                      <Plus className="w-4 h-4 animate-spin" />
                    ) : (
                      <BookOpen className="w-4 h-4 mr-2" />
                    )}
                    {isAr ? "تحليل الملف" : "PARSE FILE"}
                  </HeroButton>

                  {parsedLectures.length > 0 && (
                    <div className="space-y-6 mt-8">
                      <h3 className="text-xl font-black italic uppercase text-muted-foreground">
                        {isAr ? "المحاضرات المحللة (معاينة)" : "Parsed Lectures (Preview)"}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {isAr
                          ? "سيتم إضافة هذه المحاضرات إلى المنهج الحالي."
                          : "These lectures will be added to the current curriculum."}
                      </p>
                      {parsedLectures.map((lec, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-muted/50 border border-border rounded-2xl"
                        >
                          <p className="font-bold text-lg">
                            {lec.title || (isAr ? "بدون عنوان" : "Untitled")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lec.description
                              ? lec.description.substring(0, 100) +
                                (lec.description.length > 100 ? "..." : "")
                              : isAr
                                ? "لا يوجد وصف"
                                : "No description"}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {lec.content_blocks.length > 0 &&
                              lec.content_blocks.map((block, bIdx) => (
                                <span
                                  key={bIdx}
                                  className="px-2 py-1 bg-muted rounded-lg text-xs"
                                >
                                  {block.type}
                                </span>
                              ))}
                          </div>
                        </div>
                      ))}
                      <HeroButton
                        onClick={importParsedLectures}
                        variant="primary"
                        className="bg-lime-500 text-black px-10 h-12 rounded-xl"
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        {isAr ? "استيراد الكل للمنهج" : "IMPORT ALL TO CURRICULUM"}
                      </HeroButton>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {(activeTab as any) === "chat" && <LectureChat levelId={levelId!} isAr={isAr} />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function LectureChat({ levelId, isAr }: { levelId: string; isAr: boolean }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const { profile } = useAuth();

  useEffect(() => {
    fetchMessages();
    const subscription = supabase
      .channel(`lecture:${levelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "level_chats",
          filter: `level_id=eq.${levelId}`,
        },
        () => fetchMessages(),
      )
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [levelId]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("level_chats")
      .select("*, profiles(username, avatar_url, role)")
      .eq("level_id", levelId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile) return;
    await supabase
      .from("level_chats")
      .insert([{ level_id: levelId, sender_id: profile.id, content: newMessage }]);
    setNewMessage("");
  };

  return (
    <div className="h-full flex flex-col bg-foreground/20 rounded-[40px] border border-border overflow-hidden">
      <header className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MessageSquare className="w-5 h-5 text-lime-400" />
          <h3 className="font-black italic uppercase tracking-widest text-sm">
            {isAr ? "المحادثة التكتيكية" : "TACTICAL COMM-LINK"}
          </h3>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted/50 overflow-hidden flex-shrink-0">
              {m.profiles?.avatar_url && (
                <img src={m.profiles.avatar_url} className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm">{m.profiles?.username}</span>
                <span
                  className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${m.profiles?.role === "admin" ? "bg-red-500/20 text-red-500" : "bg-muted/50 text-muted-foreground"}`}
                >
                  {m.profiles?.role}
                </span>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-2xl rounded-tl-none">
                {m.content}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-6 bg-foreground/20 border-t border-border">
        <div className="relative max-w-4xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Transmit mission updates..."
            className="w-full bg-muted/50 border border-border rounded-2xl py-5 pl-8 pr-16 font-bold focus:outline-none"
          />
          <button
            onClick={sendMessage}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-lime-500 text-black rounded-xl hover:scale-105 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProgressUser extends Profile {
  totalLectures: number;
  completedLectures: number;
  completionPercentage: number;
}

interface FullLecture {
  id: string;
  level_id: string;
  slot_number: number;
}

interface FullLevel extends Level {
  lectures: FullLecture[];
}

function InternalTasks({ isAr }: { isAr: boolean }) {
  const { user, isAdmin, isModerator, refreshProfile } = useAuth();
  const [tasks, setTasks] = useState<InternalTask[]>([]);
  const [moderators, setModerators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTask, setSelectedTask] = useState<InternalTask | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    section: "",
    timeline: "",
    course_time: "",
    description: "",
    assigned_to_id: "",
  });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("internal_tasks")
        .select("*, profiles:assigned_to_id(username)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error("Fetch tasks error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModerators = async () => {
    const { data } = await supabase.from("profiles").select("id, username, phone_number").in("role", ["admin", "moderator"]);
    if (data) setModerators(data as any);
  };

  useEffect(() => {
    fetchTasks();
    fetchModerators();
    const sub = supabase.channel('tasks_sync').on('postgres_changes' as any, { event: '*', table: 'internal_tasks' }, fetchTasks).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const { error } = await supabase.from("internal_tasks").insert([{
        admin_id: user.id,
        ...newTask,
        assigned_to_id: newTask.assigned_to_id || null
      }]);
      if (error) throw error;
      toast.success(isAr ? "تمت إضافة المهمة" : "Task added successfully");
      setIsAdding(false);
      setNewTask({ title: "", section: "", timeline: "", course_time: "", description: "", assigned_to_id: "" });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleTaskCompletion = async (taskId: string, current: boolean, assignedToId: string | null) => {
    try {
      const { error } = await supabase.from("internal_tasks").update({ is_completed: !current }).eq("id", taskId);
      if (error) throw error;
      
      // Award XP if completing
      if (!current && assignedToId) {
          const { data: profile } = await supabase.from("profiles").select("xp, id").eq("id", assignedToId).single();
          if (profile) {
              await supabase.from("profiles").update({ xp: profile.xp + 50 }).eq("id", assignedToId);
              toast.success("XP Awarded: +50");
              
              // If the task was completed by the current user, refresh their profile
              if (user && user.id === assignedToId) {
                  refreshProfile();
              }
          }
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const { error } = await supabase.from("internal_tasks").delete().eq("id", taskId);
      if (error) throw error;
      toast.success("Task deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase">{isAr ? "المهام الداخلية" : "INTERNAL TASKS"}</h2>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em]">{isAr ? "تنسيق العمل بين المشرفين" : "STAFF COORDINATION HUB"}</p>
        </div>
        {isAdmin && (
          <HeroButton onClick={() => setIsAdding(!isAdding)} variant="primary" size="sm">
            {isAdding ? (isAr ? "إلغاء" : "CANCEL") : (isAr ? "إضافة مهمة" : "CREATE TASK")}
          </HeroButton>
        )}
      </div>

      {isAdding && isAdmin && (
        <motion.form 
          initial={{ height: 0, opacity: 0 }} 
          animate={{ height: "auto", opacity: 1 }} 
          onSubmit={handleAddTask}
          className="bg-muted/50 border border-border rounded-[40px] p-8 space-y-6 overflow-hidden shadow-2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-4">Task Title</label>
              <input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full bg-foreground/20 border border-border rounded-2xl p-4 text-sm font-bold outline-none focus:border-lime-500/50" placeholder="e.g. Update Level 4 Content" />
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-4">Section / Category</label>
              <input value={newTask.section} onChange={e => setNewTask({...newTask, section: e.target.value})} className="w-full bg-foreground/20 border border-border rounded-2xl p-4 text-sm font-bold outline-none focus:border-lime-500/50" placeholder="e.g. Curriculum" />
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-4">Timeline / Deadline</label>
              <input value={newTask.timeline} onChange={e => setNewTask({...newTask, timeline: e.target.value})} className="w-full bg-foreground/20 border border-border rounded-2xl p-4 text-sm font-bold outline-none focus:border-lime-500/50" placeholder="e.g. June 15th" />
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-4">Course Time / Effort</label>
              <input value={newTask.course_time} onChange={e => setNewTask({...newTask, course_time: e.target.value})} className="w-full bg-foreground/20 border border-border rounded-2xl p-4 text-sm font-bold outline-none focus:border-lime-500/50" placeholder="e.g. 2 Hours" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-4">Assign To (Search & Select)</label>
              <div className="relative">
                <input 
                    type="text"
                    placeholder={isAr ? "ابحث بالاسم أو الهاتف..." : "Search by name or phone..."}
                    className="w-full bg-foreground/20 border border-border rounded-t-2xl p-4 text-sm font-bold outline-none focus:border-lime-500/50 mb-0.5"
                    onChange={e => {
                        const searchTerm = e.target.value.toLowerCase();
                        const firstMatch = moderators.find(m => 
                            m.username.toLowerCase().includes(searchTerm) ||
                            (m.phone_number && m.phone_number.toLowerCase().includes(searchTerm))
                        );
                        if(firstMatch) setNewTask({...newTask, assigned_to_id: firstMatch.id});
                    }}
                />
                <select value={newTask.assigned_to_id} onChange={e => setNewTask({...newTask, assigned_to_id: e.target.value})} className="w-full bg-foreground/20 border border-border rounded-b-2xl p-4 text-sm font-bold outline-none focus:border-lime-500/50">
                    <option value="">Select Moderator</option>
                    {moderators.map(mod => <option key={mod.id} value={mod.id}>{mod.username} {mod.phone_number ? `(${mod.phone_number})` : ''}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-4">Detailed Instructions</label>
            <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full bg-foreground/20 border border-border rounded-2xl p-4 text-sm font-bold outline-none focus:border-lime-500/50 h-32 resize-none" placeholder="Enter full task details..." />
          </div>
          <HeroButton type="submit" className="w-full">DISPATCH TASK</HeroButton>
        </motion.form>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="h-40 flex items-center justify-center bg-muted/50 rounded-[40px] animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin opacity-20" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-20 text-center bg-muted/50 rounded-[40px] border border-border">
            <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">All tasks completed. System synchronized.</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className={`bg-foreground/20 border rounded-[32px] p-6 flex items-center justify-between transition-all ${task.is_completed ? "border-green-500/30 opacity-50 grayscale" : "border-border"}`}>
                  <div className="flex items-center gap-6">
                <button
                  disabled={!isAdmin && !isModerator}
                  onClick={() => toggleTaskCompletion(task.id, task.is_completed, task.assigned_to_id || null)}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${task.is_completed ? "bg-green-500 border-green-400 text-black" : "bg-muted/50 border-border text-muted-foreground/30 hover:bg-muted"}`}
                >
                  <Check className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg leading-none">{task.title}</h3>
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-lime-500/10 text-lime-400 rounded border border-lime-500/20">{task.section}</span>
                    {task.profiles && (
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-muted/50 text-muted-foreground rounded border border-border">
                        Assigned to: {task.profiles.username}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.timeline}</span>
                    <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {task.course_time}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <button onClick={() => deleteTask(task.id)} className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-foreground transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="w-px h-8 bg-muted/50" />
                <button 
                  onClick={() => setSelectedTask(task)}
                  className="text-[10px] font-black uppercase tracking-widest text-lime-500 hover:text-lime-400"
                >
                  {isAr ? "عرض التفاصيل" : "View Details"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-card/90 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#111] border border-border p-8 rounded-[40px] max-w-lg w-full shadow-2xl"
          >
            <h3 className="text-2xl font-black italic uppercase mb-2">{selectedTask.title}</h3>
            <p className="text-muted-foreground text-sm mb-6">{selectedTask.description}</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="p-4 bg-foreground/20 rounded-2xl border border-border">
                 <p className="text-[8px] font-black uppercase text-muted-foreground">Timeline</p>
                 <p className="text-sm font-bold">{selectedTask.timeline}</p>
               </div>
               <div className="p-4 bg-foreground/20 rounded-2xl border border-border">
                 <p className="text-[8px] font-black uppercase text-muted-foreground">Effort</p>
                 <p className="text-sm font-bold">{selectedTask.course_time}</p>
               </div>
            </div>
            <HeroButton onClick={() => setSelectedTask(null)} className="w-full">
              {isAr ? "إغلاق" : "CLOSE"}
            </HeroButton>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function CourseProgress({ isAr }: { isAr: boolean }) {
  const [processedUsers, setProcessedUsers] = useState<ProgressUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseData();
  }, []);

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const [profilesRes, levelsRes, lecturesRes, studentProgressRes, groupLevelRes, sgRes] =
        await Promise.all([
          supabase.from("profiles").select("*"),
          supabase.from("level_templates").select("id, title, level_order, is_published"),
          supabase.from("lecture_templates").select("id, level_template_id, slot_number, is_live"),
          supabase.from("student_progress").select("student_id, lecture_id"),
          supabase.from("group_level_assignments").select("group_id, level_template_id"),
          supabase.from("student_groups").select("student_id, group_id"),
        ]);

      const allProfiles: Profile[] = (profilesRes.data || []).filter(p => p.role === 'student');
      const allLevels: Level[] = levelsRes.data || [];
      const allLectures: FullLecture[] = (lecturesRes.data || []).map(l => ({ ...l, level_id: l.level_template_id }));
      const allStudentProgress: { student_id: string; lecture_id: string }[] =
        studentProgressRes.data || [];
      const allGroupLevelAccess: { group_id: string; level_template_id: string }[] = groupLevelRes.data || [];
      const sgData: { student_id: string; group_id: string }[] = sgRes.data || [];

      const studentGroupsMap = new Map<string, Set<string>>();
      for (const sg of sgData) {
        const existing = studentGroupsMap.get(sg.student_id) || new Set<string>();
        existing.add(sg.group_id);
        studentGroupsMap.set(sg.student_id, existing);
      }

      // Map lectures to their levels
      const levelsWithLectures = allLevels.map((level) => ({
        ...level,
        lectures: allLectures
          .filter((lec) => lec.level_id === level.id)
          .sort((a, b) => a.slot_number - b.slot_number),
      }));

      const usersWithProgress: ProgressUser[] = allProfiles
        .map((profile) => {
          let totalLecturesForUser = 0;
          let completedLecturesForUser = 0;

          // Determine which levels this user's group has access to
          const studentGroupIds = studentGroupsMap.get(profile.id) || new Set<string>();
          if ((profile as any).group_id) studentGroupIds.add((profile as any).group_id);
          const accessibleLevelIds = allGroupLevelAccess
            .filter((la) => studentGroupIds.has(la.group_id))
            .map((la) => la.level_template_id);

          // For admins/moderators, they have access to all levels
          const userAccessibleLevels =
            profile.role === "admin" || profile.role === "moderator"
              ? levelsWithLectures
              : levelsWithLectures.filter((level) => accessibleLevelIds.includes(level.id));

          userAccessibleLevels.forEach((level) => {
            const activeLectures = level.lectures.filter(l => l.is_live !== false);
            totalLecturesForUser += activeLectures.length;
            activeLectures.forEach((lecture) => {
              if (
                allStudentProgress.some(
                  (sp) => sp.student_id === profile.id && sp.lecture_id === lecture.id,
                )
              ) {
                completedLecturesForUser++;
              }
            });
          });

          const completionPercentage =
            totalLecturesForUser > 0 ? (completedLecturesForUser / totalLecturesForUser) * 100 : 0;

          return {
            ...profile,
            totalLectures: totalLecturesForUser,
            completedLectures: completedLecturesForUser,
            completionPercentage: parseFloat(completionPercentage.toFixed(2)),
          };
        })
        .sort((a, b) => b.completedLectures - a.completedLectures); // Sort by completed lectures for leaderboard

      setProcessedUsers(usersWithProgress);
    } catch (error) {
      console.error("Error fetching course data:", error);
      toast.error(isAr ? "فشل تحميل بيانات الدورة" : "Failed to load course data");
    } finally {
      setLoading(false);
    }
  };

  const top3 = processedUsers.slice(0, 3);

  return (
    <div className="space-y-8">
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top 3 Leaderboard */}
          <div className="bg-foreground/20 backdrop-blur-xl border border-border rounded-2xl md:rounded-3xl p-5 md:p-8 space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-black italic uppercase text-muted-foreground">
              {isAr ? "أفضل 3 عملاء" : "TOP 3 AGENTS"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {top3.map((user, index) => (
                <div
                  key={user.id}
                  className="relative p-4 md:p-6 rounded-2xl bg-muted/50 border border-border flex items-center gap-3 md:gap-4"
                >
                  <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-primary text-black flex items-center justify-center font-black text-xl shadow-lg shadow-primary/20">
                    {index + 1}
                  </div>
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/50 flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-8 h-8 text-muted-foreground m-auto" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{user.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Trophy className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase text-muted-foreground">
                        {user.completedLectures} {isAr ? "مهمة مكتملة" : "MISSIONS COMPLETED"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Users Progress */}
          <div className="bg-foreground/20 backdrop-blur-xl border border-border rounded-2xl md:rounded-3xl p-5 md:p-8 space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-black italic uppercase text-muted-foreground">
              {isAr ? "تقرير تقدم العميل" : "AGENT PROGRESS REPORT"}
            </h2>
            <div className="space-y-4">
              {processedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-border flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-muted-foreground m-auto" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base">{user.username}</p>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                      <span>
                        {user.completedLectures} / {user.totalLectures} {isAr ? "مهمة" : "MISSIONS"}
                      </span>
                      <span className="text-primary">{user.completionPercentage}%</span>
                    </div>
                  </div>
                  <div className="w-32 h-1.5 bg-muted rounded-full">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${user.completionPercentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GradingHub({ isAr }: { isAr: boolean }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [grade, setGrade] = useState<number>(0);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("exam_submissions")
      .select("*, profiles(username), lectures(title, level_id)")
      .order("created_at", { ascending: false });
    if (data) setSubmissions(data);
    setLoading(false);
  };

  const handleGrade = async () => {
    if (!selectedSub) return;
    try {
      const { error } = await supabase
        .from("exam_submissions")
        .update({
          total_grade: grade,
          moderator_feedback: feedback,
          graded_at: new Date().toISOString(),
          graded_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", selectedSub.id);

      if (error) throw error;
      toast.success(isAr ? "تم رصد الدرجة بنجاح" : "Grade applied successfully");
      setSelectedSub(null);
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">
          {isAr ? "مركز التصحيح" : "GRADING HUB"}
        </h2>
        <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                {submissions.filter(s => s.total_grade === null).length} PENDING SUBMISSIONS
            </span>
        </div>
      </div>

      <div className="grid gap-4">
        {submissions.map((sub) => (
          <div
            key={sub.id}
            className={`p-4 md:p-6 rounded-xl md:rounded-2xl bg-muted/50 border border-border flex items-center justify-between group hover:bg-muted transition-all ${sub.total_grade !== null ? "opacity-60" : ""}`}
          >
            <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center font-black text-muted-foreground">
                    {sub.profiles?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-bold text-foreground">{sub.profiles?.username}</h3>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {sub.lecture_templates?.title} // {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {sub.total_grade !== null ? (
                    <div className="text-right">
                        <p className="text-2xl font-black italic text-emerald-400 leading-none">{sub.total_grade}%</p>
                        <p className="text-[8px] font-black uppercase text-muted-foreground mt-1">GRADED</p>
                    </div>
                ) : (
                    <HeroButton 
                        onClick={() => {
                            setSelectedSub(sub);
                            setGrade(sub.mcq_score || 0);
                            setFeedback("");
                        }}
                        size="sm" 
                        variant="primary"
                        className="bg-primary text-black px-6"
                    >
                        {isAr ? "بدء التصحيح" : "OPEN FILE"}
                    </HeroButton>
                )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedSub && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-card/95 backdrop-blur-md">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-background border border-border p-5 md:p-8 rounded-2xl md:rounded-3xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                    <header className="flex justify-between items-start mb-10">
                        <div>
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-1">
                                {isAr ? "تصحيح الإجابات" : "EXAMINATION FILE"}
                            </h3>
                            <p className="text-emerald-400/60 text-[10px] font-black uppercase tracking-widest">
                                AGENT: {selectedSub.profiles?.username} // MODULE: {selectedSub.lecture_templates?.title}
                            </p>
                        </div>
                        <button onClick={() => setSelectedSub(null)} className="p-3 rounded-full bg-muted/50 hover:bg-red-500 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </header>

                    <div className="space-y-8 mb-10">
                        {selectedSub.answers.map((ans: any, idx: number) => (
                            <div key={idx} className="p-6 bg-muted/50 border border-border rounded-3xl">
                                <p className="text-[9px] font-black uppercase text-muted-foreground mb-3">QUESTION {idx + 1} // {ans.type.toUpperCase()}</p>
                                <p className="text-lg font-bold mb-4 italic tracking-tight leading-tight">{ans.question}</p>
                                <div className="p-4 bg-foreground/20 rounded-2xl border border-border">
                                    <p className="text-[9px] font-black uppercase text-emerald-400/40 mb-2">STUDENT RESPONSE:</p>
                                    <p className="text-sm font-medium leading-relaxed">{ans.answer || "No response provided"}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-5 md:p-8 bg-muted/50 border border-border rounded-2xl md:rounded-3xl">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assign Final Grade (%)</label>
                            <input 
                                type="number" 
                                value={grade} 
                                onChange={e => setGrade(parseInt(e.target.value))}
                                className="w-full bg-card/80 border border-border rounded-2xl px-6 py-4 text-2xl font-black text-primary outline-none"
                            />
                            <p className="text-[8px] font-black uppercase text-muted-foreground px-2">MCQ AUTOMATED BASE: {selectedSub.mcq_score}%</p>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Moderator Feedback</label>
                            <textarea 
                                value={feedback} 
                                onChange={e => setFeedback(e.target.value)}
                                className="w-full bg-card/80 border border-border rounded-2xl px-6 py-4 text-sm font-bold outline-none h-32 resize-none"
                                placeholder="Strategic guidance for the agent..."
                            />
                        </div>
                        <HeroButton onClick={handleGrade} className="md:col-span-2 bg-emerald-500 text-black h-16 rounded-2xl font-black text-sm uppercase tracking-widest italic">
                            AUTHORIZE SYNCHRONIZATION
                        </HeroButton>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ASSIGNMENTS HUB — Pending Reviews Dashboard
// ═══════════════════════════════════════════════════════

function AssignmentsHub({ isAr }: { isAr: boolean }) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [grade, setGrade] = useState<number | "">("");
  const [processing, setProcessing] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lecture_task_submissions")
        .select(`
          id, student_id, lecture_id, image_url, file_url, status, feedback, grade, created_at, updated_at,
          profiles:student_id (id, username, phone_number, email),
          lecture_templates:lecture_id (id, title, level_template_id, slot_number, assignment_required, assignment_description,
            level_templates:level_template_id (id, title, level_order)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const filtered = submissions.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = s.profiles?.username?.toLowerCase() || "";
      const phone = s.profiles?.phone_number?.toLowerCase() || "";
      const lesson = s.lecture_templates?.title?.toLowerCase() || "";
      if (!name.includes(q) && !phone.includes(q) && !lesson.includes(q)) return false;
    }
    return true;
  });

  const handleApprove = async (sub: any) => {
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("approve_assignment", {
        p_submission_id: sub.id,
        p_moderator_id: user?.id,
        p_feedback: feedback || null,
        p_grade: grade !== "" ? grade : null,
      });
      if (error) throw error;
      toast.success(isAr ? "تمت الموافقة على المهمة" : "Assignment approved");
      setSelectedSub(null);
      setFeedback("");
      setGrade("");
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (sub: any) => {
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("reject_assignment", {
        p_submission_id: sub.id,
        p_moderator_id: user?.id,
        p_feedback: feedback || null,
        p_grade: grade !== "" ? grade : null,
      });
      if (error) throw error;
      toast.success(isAr ? "تم رفض المهمة" : "Assignment rejected");
      setSelectedSub(null);
      setFeedback("");
      setGrade("");
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleGrantAccess = async (sub: any) => {
    const reason = prompt(isAr ? "سبب المنح:" : "Reason for override:");
    if (reason === null) return;
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("grant_lecture_access", {
        p_student_id: sub.student_id,
        p_lecture_id: sub.lecture_id,
        p_moderator_id: user?.id,
        p_reason: reason || "Manual override by moderator",
      });
      if (error) throw error;
      toast.success(isAr ? "تم منح الصلاحية" : "Access granted");
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-500",
    approved: "bg-green-500/15 text-green-500",
    rejected: "bg-red-500/15 text-red-500",
  };

  const statusLabels: Record<string, Record<string, string>> = {
    pending: { en: "PENDING", ar: "قيد المراجعة" },
    approved: { en: "APPROVED", ar: "تمت الموافقة" },
    rejected: { en: "REJECTED", ar: "مرفوض" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter">
            {isAr ? "مراجعة المهام" : "ASSIGNMENT REVIEWS"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {pendingCount} {isAr ? "بانتظار المراجعة" : "pending review"}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "all" ? (isAr ? "الكل" : "ALL") : statusLabels[f]?.[isAr ? "ar" : "en"]}
          </button>
        ))}
        <input
          type="text"
          placeholder={isAr ? "بحث..." : "Search..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl bg-muted border border-border text-sm outline-none focus:border-primary ml-auto"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm font-bold">{isAr ? "لا توجد مهام" : "No submissions found"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-4 md:p-6 hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => { setSelectedSub(sub); setFeedback(sub.feedback || ""); setGrade(sub.grade ?? ""); }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                    {sub.profiles?.username?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{sub.profiles?.username || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{sub.profiles?.phone_number || sub.profiles?.email}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusColors[sub.status] || ""}`}>
                  {statusLabels[sub.status]?.[isAr ? "ar" : "en"]}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>{isAr ? "المستوى" : "Level"}: {sub.lecture_templates?.level_templates?.title || "—"}</span>
                <span>{isAr ? "الدرس" : "Lesson"}: {sub.lecture_templates?.title || "—"}</span>
                <span>{isAr ? "الدورة" : "Slot"}: #{sub.lecture_templates?.slot_number}</span>
                <span>{isAr ? "التاريخ" : "Date"}: {new Date(sub.created_at).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {selectedSub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedSub(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-lg">{isAr ? "مراجعة المهمة" : "REVIEW ASSIGNMENT"}</h3>
                <button onClick={() => setSelectedSub(null)} className="p-2 rounded-xl bg-muted hover:bg-muted/80">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                    {selectedSub.profiles?.username?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{selectedSub.profiles?.username}</p>
                    <p className="text-xs text-muted-foreground">{selectedSub.profiles?.phone_number} | {selectedSub.profiles?.email}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>{isAr ? "الدرس" : "Lesson"}: {selectedSub.lecture_templates?.title}</p>
                  <p>{isAr ? "المستوى" : "Level"}: {selectedSub.lecture_templates?.level_templates?.title}</p>
                  {selectedSub.lecture_templates?.assignment_description && (
                    <p className="mt-2 p-3 bg-muted rounded-xl">{selectedSub.lectures.assignment_description}</p>
                  )}
                </div>
              </div>

              {/* Submission preview */}
              {selectedSub.image_url && (
                <div className="mb-6">
                  {selectedSub.image_url.match(/\.(pdf|doc|docx)$/i) || selectedSub.image_url.includes("application/pdf") ? (
                    <a href={selectedSub.image_url} target="_blank" rel="noopener" className="flex items-center gap-3 p-4 bg-muted rounded-2xl border border-border hover:bg-muted/80 transition-all">
                      <FileText className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-bold text-sm">{isAr ? "عرض الملف" : "View File"}</p>
                        <p className="text-xs text-muted-foreground">{isAr ? "افتح في نافذة جديدة" : "Opens in new tab"}</p>
                      </div>
                    </a>
                  ) : (
                    <img src={selectedSub.image_url} alt="Submission" className="w-full max-h-[300px] object-contain rounded-2xl border border-border" />
                  )}
                </div>
              )}

              {/* Feedback */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                    {isAr ? "ملاحظات" : "FEEDBACK"}
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full bg-muted border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary h-24 resize-none"
                    placeholder={isAr ? "اكتب ملاحظاتك..." : "Write your feedback..."}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                    {isAr ? "الدرجة" : "GRADE"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value ? parseInt(e.target.value) : "")}
                    className="w-full bg-muted border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary"
                    placeholder="0-100"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleApprove(selectedSub)}
                  disabled={processing}
                  className="py-3 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-500 font-black text-xs uppercase tracking-widest hover:bg-green-500/20 transition-all disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isAr ? "موافقة" : "APPROVE")}
                </button>
                <button
                  onClick={() => handleReject(selectedSub)}
                  disabled={processing}
                  className="py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isAr ? "رفض" : "REJECT")}
                </button>
                <button
                  onClick={() => handleGrantAccess(selectedSub)}
                  disabled={processing}
                  className="py-3 rounded-2xl bg-primary/10 border border-primary/30 text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/20 transition-all disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isAr ? "منح صلاحية" : "GRANT ACCESS")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
