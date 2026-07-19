import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../hooks/use-auth";
import { useLanguage } from "../lib/LanguageContext";
import { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import { HeroButton } from "../funs/HeroButton";
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
  const [activeTab, setActiveTab] = useState<"levels" | "users" | "messaging" | "progress" | "tasks" | "analytics" | "spotlight" | "failed_exams" | "directory">(
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
      .from("levels")
      .select("*")
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
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden font-sans selection:bg-primary/30">
      {/* Cinematic Background */}
      <div className="fixed inset-0 bg-background z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-primary/10 blur-[100px] rounded-full"></div>
      </div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-10 opacity-20"></div>

      <div className="flex-1 flex flex-col md:flex-row relative z-20 pt-12 px-6 max-w-[1400px] mx-auto w-full gap-12">
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

        <main className="flex-1 pb-32">
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
                className="bg-primary text-black px-8 h-12 rounded-[1.5rem] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="font-black italic uppercase tracking-widest text-xs">DEPLOY LEVEL</span>
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
                className="grid gap-5"
              >
                {levels.map((level) => (
                  <div
                    key={level.id}
                    className="p-1 rounded-[2rem] bg-muted border border-border hover:border-border transition-all group"
                  >
                    <div className="bg-muted/50 border border-border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-[calc(2rem-0.25rem)] p-6 flex items-center justify-between">
                      <div className="flex items-center gap-8">
                        <div className="text-4xl font-black italic text-muted-foreground w-16 leading-none">
                          {String(level.level_order).padStart(2, "0")}
                        </div>
                        <div>
                          <h3 className="text-lg font-black uppercase tracking-tight mb-1 group-hover:text-primary transition-colors">
                            {level.title}
                          </h3>
                          <div className="flex items-center gap-4">
                            <span
                              className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${level.is_published ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-muted/50 border-border text-muted-foreground"}`}
                            >
                              {level.is_published ? "LIVE STATUS" : "DRAFT ARCHIVE"}
                            </span>
                            <div className="h-0.5 w-0.5 rounded-full bg-muted"></div>
                            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">ID: {level.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedLevelId(level.id);
                            setIsEditing(true);
                          }}
                          className="p-3 rounded-full bg-muted/50 border border-border hover:bg-primary hover:text-black transition-all duration-500 hover:scale-110"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                            <button
                              onClick={async () => {
                                if (!confirm("Are you sure?")) return;
                                const { error } = await supabase.from("levels").delete().eq("id", level.id);
                                if (error) toast.error("Failed to delete level");
                                else {
                                    toast.success("Level deleted");
                                    fetchLevels();
                                }
                              }}
                              className="p-3 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-foreground transition-all duration-500 hover:scale-110 text-red-500"
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
    <div className="space-y-8">
      <div className="bg-muted/50 border border-border rounded-[32px] p-8">
        <div className="relative group mb-8">
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
      .select("*, profiles(username, id), levels(title)")
      .lt("score", 70);

    if (data) setFailedAttempts(data);
  };

  const approveProgression = async (studentId: string, levelId: string) => {
    await supabase.from("level_access").insert([{ user_id: studentId, level_id: levelId }]);
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
                {attempt.levels?.title} - Score: {attempt.score}%
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
    const { data } = await supabase.from("exams").select("questions").eq("level_id", levelId).single();
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
    <div className="space-y-8">
      <h2 className="text-3xl font-black italic uppercase tracking-tighter">
        {isAr ? "إدارة بطاقة التميز" : "HERO CARD CONTROL"}
      </h2>
      <div className="bg-muted/50 border border-border p-10 rounded-[40px] space-y-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap className="w-32 h-32 text-primary" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
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
  const [levels, setLevels] = useState<Level[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "parent" | "moderator" | "admin">("all");
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserAccess] = useState<string | null>(null);
  const [userAccess, setUserAccess] = useState<string[]>([]);
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
    fetchLevels();
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

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase.from("levels").select("*").order("level_order", { ascending: true });
      if (error) throw error;
      setLevels(data);
    } catch (err) {
      console.error("Error fetching levels:", err);
    }
  };

  const fetchLinks = async () => {
    const { data } = await supabase.from("parent_student_links").select("*");
    if (data) setParentStudentLinks(data);
  };

  const fetchUserAccess = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("level_access").select("level_id").eq("user_id", userId);
      if (error) throw error;
      setUserAccess(data.map((a) => a.level_id));
    } catch (err) {
      console.error("Error fetching access:", err);
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

  const toggleLevelAccess = async (userId: string, levelId: string, hasAccess: boolean) => {
    if (hasAccess) {
      await supabase.from("level_access").delete().eq("user_id", userId).eq("level_id", levelId);
    } else {
      await supabase.from("level_access").insert([{ user_id: userId, level_id: levelId }]);
    }
    fetchUserAccess(userId);
    toast.success(isAr ? "تم تحديث الصلاحيات" : "Access privileges updated");
  };

  const grantAllAccess = async (userId: string) => {
    const accessToInsert = levels
      .filter(level => !userAccess.includes(level.id))
      .map(level => ({ user_id: userId, level_id: level.id }));
    if (accessToInsert.length > 0) {
      await supabase.from("level_access").insert(accessToInsert);
      fetchUserAccess(userId);
      toast.success(isAr ? "تم منح الوصول لجميع المستويات" : "All levels access granted");
    }
  };

  const revokeAllAccess = async (userId: string) => {
    await supabase.from("level_access").delete().eq("user_id", userId);
    fetchUserAccess(userId);
    toast.success(isAr ? "تم إلغاء الوصول لجميع المستويات" : "All levels access revoked");
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
    } catch (err: any) {
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
    <div className="space-y-12">
      <div className="flex flex-col gap-6">
        <div className="flex gap-4">
            <div className="relative group flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
                type="text"
                placeholder={isAr ? "البحث عن عميل (الاسم/الهاتف)..." : "Search for agent (Name/Phone)..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-muted border border-border rounded-2xl py-5 pl-16 pr-6 font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border0 transition-all"
            />
            </div>
        </div>

        {/* Tab-based Role Filter */}
        <div className="flex bg-muted/50 p-1 rounded-2xl border border-border w-fit">
            {(["all", "student", "parent", "moderator", "admin"] as const).map((role) => (
                <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${roleFilter === role ? "bg-primary text-black shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                >
                    {role}
                </button>
            ))}
        </div>
      </div>

      {/* Top 3 Leaderboard */}
      <section className="space-y-6">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-muted-foreground">{isAr ? "أعلى 3 طلاب" : "TOP 3 AGENTS"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {top3.map((user, i) => (
                  <div key={user.id} className="relative p-0.5 rounded-[2.5rem] bg-gradient-to-br from-white/20 to-white/5 overflow-hidden">
                      <div className="bg-muted backdrop-blur-3xl p-8 rounded-[calc(2.5rem-0.125rem)] text-center">
                          <div className="absolute top-4 right-8 text-4xl font-black italic text-muted-foreground/30">#{i + 1}</div>
                          <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center border-2 border-border overflow-hidden">
                              {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <Users className="w-10 h-10 text-muted-foreground" />}
                          </div>
                          <h3 className="text-xl font-black uppercase tracking-tight text-foreground mb-2">{user.username}</h3>
                          <div className="flex flex-col items-center gap-2">
                              <span className="px-3 py-1 bg-muted rounded-full text-[10px] font-black text-foreground">{user.xp} XP</span>
                              <span className="text-[8px] font-black uppercase text-muted-foreground">{user.role}</span>
                          </div>

                          <div className="mt-8 flex flex-col gap-2">
                              <div className="flex gap-2">
                                <button
                                    onClick={() => toggleApproval(user.id, user.is_approved)}
                                    className={`flex-1 h-10 rounded-xl text-[9px] font-black uppercase transition-all ${user.is_approved ? "bg-green-500 text-black" : "bg-muted text-foreground border border-border"}`}
                                >
                                    {user.is_approved ? (isAr ? "معتمد" : "APPROVED") : (isAr ? "غير معتمد" : "PENDING")}
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={() => deleteUser(user.id)}
                                        className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-red-500 hover:text-foreground transition-all flex items-center justify-center"
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
                                    className="flex-1 bg-foreground/20 border border-border rounded-xl p-2 text-[10px] text-foreground disabled:opacity-50"
                                >
                                    <option value="student">Student</option>
                                    <option value="parent">Parent</option>
                                    <option value="moderator">Moderator</option>
                                    {isAdmin && <option value="admin">Admin</option>}
                                </select>
                                <button
                                    onClick={() => {
                                        setSelectedUserAccess(selectedUserId === user.id ? null : user.id);
                                        if (selectedUserId !== user.id) fetchUserAccess(user.id);
                                    }}
                                    className={`w-10 h-10 rounded-xl bg-muted/50 border border-border hover:bg-muted text-foreground hover:text-foreground transition-all flex items-center justify-center ${selectedUserId === user.id ? "bg-primary text-primary-foreground" : ""}`}
                                >
                                    <Lock className="w-4 h-4" />
                                </button>
                              </div>

                              <HeroButton 
                                onClick={() => {
                                    setSelectedUserAccess(selectedUserId === user.id ? null : user.id);
                                    if (selectedUserId !== user.id) fetchUserAccess(user.id);
                                }}
                                className="w-full bg-primary text-primary-foreground h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest mt-2"
                              >
                                {isAr ? "إدارة الصلاحيات" : "MANAGE ACCESS"}
                              </HeroButton>
                          </div>

                          <AnimatePresence>
                            {selectedUserId === user.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-border mt-6 pt-6 text-left"
                              >
                                <div className="grid grid-cols-1 gap-3">
                                  <div className="flex gap-2 mb-2">
                                    <HeroButton onClick={() => grantAllAccess(user.id)} variant="outline" size="sm" className="flex-1 border-green-500/20 text-green-500 hover:bg-green-500/10 h-8 text-[8px]">
                                      {isAr ? "منح الكل" : "GRANT ALL"}
                                    </HeroButton>
                                    <HeroButton onClick={() => revokeAllAccess(user.id)} variant="outline" size="sm" className="flex-1 border-red-500/20 text-red-500 hover:bg-red-500/10 h-8 text-[8px]">
                                      {isAr ? "إلغاء الكل" : "REVOKE ALL"}
                                    </HeroButton>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {levels.map((level) => {
                                      const hasAccess = userAccess.includes(level.id);
                                      return (
                                        <button
                                          key={level.id}
                                          onClick={() => toggleLevelAccess(user.id, level.id, hasAccess)}
                                          className={`p-2 rounded-xl border text-left transition-all group ${hasAccess ? "bg-lime-500/10 border-lime-500/50 text-lime-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]" : "bg-muted/50 border-border text-muted-foreground hover:border-border"}`}
                                        >
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-[8px] font-black uppercase tracking-tighter">
                                              L{level.level_order}
                                            </span>
                                            {hasAccess ? (
                                              <CheckCircle2 className="w-2.5 h-2.5" />
                                            ) : (
                                              <Lock className="w-2.5 h-2.5 opacity-20" />
                                            )}
                                          </div>
                                          <p className="text-[8px] font-bold truncate">
                                            {level.title}
                                          </p>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                      </div>
                  </div>
              ))}
          </div>
      </section>

      {/* Rest of Students */}
      <section className="space-y-6">
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-muted-foreground">{isAr ? "بقية الطلاب" : "OPERATIVE ROSTER"}</h2>
          <div className="grid gap-3">
            {rest.map((user) => {
              const currentLinks = user.role === 'parent' 
                ? parentStudentLinks.filter(l => l.parent_id === user.id)
                : parentStudentLinks.filter(l => l.student_id === user.id);

              return (
              <div
                key={user.id}
                className="bg-muted/50 backdrop-blur-xl border border-border rounded-3xl p-5 flex flex-col gap-6 group hover:bg-muted transition-all"
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
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-muted border border-border overflow-hidden flex items-center justify-center">
                            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">{user.username}</h3>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{user.xp} XP • {user.role}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {currentLinks.map(link => {
                                    const linkedUser = users.find(u => u.id === (user.role === 'parent' ? link.student_id : link.parent_id));
                                    return linkedUser ? (
                                        <div key={link.id} className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-[7px] font-black text-muted-foreground">
                                            {linkedUser.username}
                                            <button onClick={() => unlinkStudentFromParent(user.role === 'parent' ? linkedUser.id : user.id, user.role === 'parent' ? user.id : linkedUser.id)}>
                                                <X className="w-2 h-2 hover:text-red-500" />
                                            </button>
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleApproval(user.id, user.is_approved)}
                          className={`px-4 h-10 rounded-xl text-[9px] font-black uppercase transition-all ${user.is_approved ? "bg-green-500 text-black" : "bg-muted text-foreground border border-border"}`}
                        >
                          {user.is_approved ? "APPROVED" : "PENDING"}
                        </button>
                        <button
                            onClick={() => {
                                setSelectedUserAccess(selectedUserId === user.id ? null : user.id);
                                if (selectedUserId !== user.id) fetchUserAccess(user.id);
                            }}
                            className={`p-3 rounded-2xl bg-muted/50 border border-border hover:bg-muted text-foreground hover:text-foreground transition-all ${selectedUserId === user.id ? "bg-primary text-primary-foreground" : ""}`}
                        >
                            <Lock className="w-4 h-4" />
                        </button>

                        <select
                            value={user.role}
                            onChange={(e) => changeRole(user.id, e.target.value)}
                            disabled={user.id === profile?.id || (!isAdmin && user.role === 'admin')}
                            className="bg-foreground/20 border border-border rounded-xl p-2 text-[10px] text-foreground disabled:opacity-50"
                        >
                            <option value="student">Student</option>
                            <option value="parent">Parent</option>
                            <option value="moderator">Moderator</option>
                            {isAdmin && <option value="admin">Admin</option>}
                        </select>

                        {user.role === 'student' && (
                            <div className="flex flex-col gap-2 w-full">
                                <div className="flex flex-col gap-1">
                                    <input
                                        type="text"
                                        placeholder={isAr ? "ربط ولي أمر (اسم/هاتف)" : "Link Parent (Name/Phone)"}
                                        className="bg-foreground/20 border border-border rounded-xl p-1 text-[8px] text-foreground w-32"
                                        onChange={(e) => {
                                            const val = e.target.value.toLowerCase();
                                            const parentSelect = e.target.nextSibling as HTMLSelectElement;
                                            Array.from(parentSelect.options).forEach(opt => {
                                                const text = opt.text.toLowerCase();
                                                opt.style.display = text.includes(val) || opt.value === "" ? "" : "none";
                                            });
                                        }}
                                        onKeyDown={(e) => e.stopPropagation()}
                                    />
                                    <select
                                        className="bg-foreground/20 border border-border rounded-xl p-1 text-[8px] text-foreground w-32"
                                        onChange={(e) => {
                                            if (e.target.value) linkStudentToParent(user.id, e.target.value);
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="">{isAr ? "اختر ولي الأمر" : "Select Parent"}</option>
                                        {users.filter(u => u.role === 'parent').map(parent => (
                                            <option key={parent.id} value={parent.id}>{parent.username} {parent.phone_number ? `(${parent.phone_number})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <textarea
                                        placeholder={isAr ? "أضف ملاحظة لولي الأمر..." : "Add note for parent..."}
                                        className="bg-foreground/20 border border-border rounded-xl p-2 text-[8px] text-foreground w-full h-16"
                                        onBlur={(e) => {
                                            if(e.target.value) {
                                                supabase.from("moderator_notes").insert({
                                                    student_id: user.id,
                                                    moderator_id: profile?.id,
                                                    content: e.target.value
                                                }).then(() => toast.success("Note added"));
                                                e.target.value = "";
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {user.role === 'parent' && (
                            <div className="flex flex-col gap-2 w-full">
                                <div className="flex flex-col gap-1">
                                    <input
                                        type="text"
                                        placeholder={isAr ? "ربط طالب (اسم/هاتف)" : "Link Student (Name/Phone)"}
                                        className="bg-foreground/20 border border-border rounded-xl p-1 text-[8px] text-foreground w-32"
                                        onChange={(e) => {
                                            const val = e.target.value.toLowerCase();
                                            const studentSelect = e.target.nextSibling as HTMLSelectElement;
                                            Array.from(studentSelect.options).forEach(opt => {
                                                const text = opt.text.toLowerCase();
                                                opt.style.display = text.includes(val) || opt.value === "" ? "" : "none";
                                            });
                                        }}
                                        onKeyDown={(e) => e.stopPropagation()}
                                    />
                                    <select
                                        className="bg-foreground/20 border border-border rounded-xl p-1 text-[8px] text-foreground w-32"
                                        onChange={(e) => {
                                            if (e.target.value) linkStudentToParent(e.target.value, user.id);
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="">{isAr ? "اختر الطالب" : "Select Student"}</option>
                                        {users.filter(u => u.role === 'student').map(student => (
                                            <option key={student.id} value={student.id}>{student.username} {student.phone_number ? `(${student.phone_number})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">
                                    {isAr ? "اربط الطلاب لرؤية بياناتهم" : "Link students to see info"}
                                </div>
                            </div>
                        )}

                        {isAdmin && (
                            <button
                                onClick={() => deleteUser(user.id)}
                                className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-red-500 hover:text-foreground transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                  {selectedUserId === user.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border pt-6"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="col-span-2 md:col-span-4 flex gap-2 mb-2">
                          <HeroButton onClick={() => grantAllAccess(user.id)} variant="outline" size="sm" className="flex-1 border-green-500/20 text-green-500 hover:bg-green-500/10">
                            {isAr ? "منح الكل" : "GRANT ALL"}
                          </HeroButton>
                          <HeroButton onClick={() => revokeAllAccess(user.id)} variant="outline" size="sm" className="flex-1 border-red-500/20 text-red-500 hover:bg-red-500/10">
                            {isAr ? "إلغاء الكل" : "REVOKE ALL"}
                          </HeroButton>
                        </div>
                        {levels.map((level) => {
                          const hasAccess = userAccess.includes(level.id);
                          return (
                            <button
                              key={level.id}
                              onClick={() => toggleLevelAccess(user.id, level.id, hasAccess)}
                              className={`p-4 rounded-2xl border text-left transition-all group ${hasAccess ? "bg-lime-500/10 border-lime-500/50 text-lime-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]" : "bg-muted/50 border-border text-muted-foreground hover:border-border"}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-tighter">
                                  Level {level.level_order}
                                </span>
                                {hasAccess ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <Lock className="w-3 h-3 opacity-20" />
                                )}
                              </div>
                              <p className="text-[10px] font-bold truncate group-hover:whitespace-normal group-hover:break-words">
                                {level.title}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
  const [selectedChatType, setSelectedChatType] = useState<"dm" | "level" | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);
  const [levelLectures, setLevelLectures] = useState<Record<string, { id: string; title: string; slot_number: number }[]>>({});
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const { profile: myProfile } = useAuth();
  const chatContainerRef = useRef<HTMLDivElement>(null); // Ref for scrolling

  useEffect(() => {
    fetchProfilesAndLevels();
  }, []);

  useEffect(() => {
    let subscription: any;
    if (selectedChatType === "dm" && selectedUserId) {
      // Direct Message Subscription
      fetchMessages();
      subscription = supabase
        .channel(`direct_message:${selectedUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_messages",
            filter: `receiver_id=eq.${myProfile?.id}`,
          },
          () => {
            fetchMessages();
          },
        )
        .subscribe();
    } else if (selectedChatType === "level" && selectedLevelId) {
      // Level Chat Subscription
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
    }
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [selectedChatType, selectedUserId, selectedLevelId, selectedLectureId, myProfile?.id]);

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

    const { data: levelsData } = await supabase
      .from("levels")
      .select("*")
      .order("level_order", { ascending: true });
    if (levelsData) {
      setLevels(levelsData);
      const lecMap: Record<string, { id: string; title: string; slot_number: number }[]> = {};
      for (const lv of levelsData) {
        const { data: lecs } = await supabase
          .from("lectures")
          .select("id, title, slot_number")
          .eq("level_id", lv.id)
          .order("slot_number", { ascending: true });
        if (lecs) lecMap[lv.id] = lecs;
      }
      setLevelLectures(lecMap);
    }
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
      console.log("Fetching Level messages...");
      let query = supabase
        .from("level_chats")
        .select("*, profiles(username, avatar_url, role)")
        .eq("level_id", selectedLevelId)
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
      const insertData: any = {
        level_id: selectedLevelId,
        sender_id: myProfile.id,
        content: newMessage,
      };
      if (selectedLectureId) insertData.lecture_id = selectedLectureId;
      const { error } = await supabase.from("level_chats").insert([insertData]);
      if (error) {
        console.error("Chat Send error:", error);
        toast.error(isAr ? "فشل إرسال رسالة الفصل" : "Failed to send classroom message.");
      } else {
        console.log("Chat message sent");
        fetchMessages(); // Force immediate refresh
      }
    }
    setNewMessage("");
  };

  const selectChat = (type: "dm" | "level", id: string) => {
    setSelectedChatType(type);
    setSelectedLectureId(null);
    if (type === "dm") {
      setSelectedUserId(id);
      setSelectedLevelId(null);
    } else {
      setSelectedLevelId(id);
      setSelectedUserId(null);
    }
    setMessages([]); // Clear messages when switching chat
    setNewMessage("");
  };

  const selectLecture = (levelId: string, lectureId: string) => {
    setSelectedChatType("level");
    setSelectedLevelId(levelId);
    setSelectedLectureId(lectureId);
    setSelectedUserId(null);
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
    const table = selectedChatType === "dm" ? "direct_messages" : "level_chats";
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

  return (
    <div className="h-[700px] flex gap-6">
      <aside className="w-96 bg-foreground/20 border border-border rounded-[32px] overflow-hidden flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
            {isAr ? "قنوات التواصل" : "COMMUNICATION CHANNELS"}
          </h3>

          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            {isAr ? "رسائل مباشرة" : "DIRECT MESSAGES"}
          </h4>
          <div className="space-y-2 mb-4 custom-scrollbar overflow-y-auto max-h-40">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => selectChat("dm", p.id)}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${selectedChatType === "dm" && selectedUserId === p.id ? "bg-primary text-black shadow-lg shadow-primary/10" : "bg-muted/50 hover:bg-muted"}`}
              >
                <div className="w-8 h-8 rounded-full bg-foreground/10 overflow-hidden flex-shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-3 h-3 m-auto opacity-20" />
                  )}
                </div>
                <div className="text-left overflow-hidden">
                  <p className="font-bold text-sm truncate">{p.username}</p>
                </div>
              </button>
            ))}
          </div>

          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            {isAr ? "فصول المستوى" : "LEVEL CLASSROOMS"}
          </h4>
          <div className="space-y-2 custom-scrollbar overflow-y-auto max-h-[400px]">
            {levels.map((level) => {
              const lectures = levelLectures[level.id] || [];
              const isExpanded = expandedLevels.has(level.id);
              const isActiveLevel = selectedChatType === "level" && selectedLevelId === level.id;
              return (
                <div key={level.id}>
                  <div className={`flex items-center gap-2 rounded-3xl transition-all border ${isActiveLevel && !selectedLectureId ? "bg-lime-500/10 border-lime-500/30 text-foreground" : "bg-muted/50 hover:bg-muted border-border"}`}>
                    <button
                      onClick={() => selectChat("level", level.id)}
                      className="flex-1 flex items-center gap-4 p-4 text-left"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-foreground/10 overflow-hidden flex-shrink-0 border border-border">
                        {level.image_url ? (
                            <img src={level.image_url} className="w-full h-full object-cover" />
                        ) : (
                          <MessageSquare className="w-4 h-4 m-auto opacity-20" />
                        )}
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="font-black text-sm truncate uppercase tracking-wider">{level.title}</p>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest italic">
                          {lectures.length > 0 ? `${lectures.length} UNITS` : "CLASSROOM CHANNEL"}
                        </p>
                      </div>
                    </button>
                    {lectures.length > 0 && (
                      <button
                        onClick={() => toggleLevelExpand(level.id)}
                        className="pr-4 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>
                    )}
                  </div>
                  {isExpanded && lectures.length > 0 && (
                    <div className="ml-8 mt-1 space-y-1">
                      {lectures.map((lec) => (
                        <button
                          key={lec.id}
                          onClick={() => selectLecture(level.id, lec.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                            selectedLectureId === lec.id
                              ? "bg-primary/10 border border-primary/30 text-foreground"
                              : "hover:bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full bg-primary/40 flex-shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-widest truncate">
                            {isAr ? `الدرس ${lec.slot_number}` : `UNIT ${lec.slot_number}`}: {lec.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-foreground/20 border border-border rounded-[40px] flex flex-col overflow-hidden">
        {selectedChatType && (selectedUserId || selectedLevelId) ? (
          <>
            <header className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted/50 overflow-hidden flex-shrink-0">
                  {(() => {
                    const selectedLevel = levels.find((l) => l.id === selectedLevelId);
                    console.log("DEBUG: Selected level in header:", selectedLevel);
                    
                    if (selectedChatType === "dm") {
                       const profile = profiles.find((p) => p.id === selectedUserId);
                       return profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <MessageSquare className="w-5 h-5 m-auto text-muted-foreground" />;
                    } else if (selectedChatType === "level") {
                       return selectedLevel?.image_url ? <img src={selectedLevel.image_url} className="w-full h-full object-cover" /> : <MessageSquare className="w-5 h-5 m-auto text-muted-foreground" />;
                    }
                    return <MessageSquare className="w-5 h-5 m-auto text-muted-foreground" />;
                  })()}
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {selectedChatType === "dm"
                      ? profiles.find((p) => p.id === selectedUserId)?.username
                      : selectedLectureId
                        ? (() => {
                            const lecs = levelLectures[selectedLevelId || ""] || [];
                            const lec = lecs.find((l) => l.id === selectedLectureId);
                            return lec ? `${isAr ? `الدرس ${lec.slot_number}` : `UNIT ${lec.slot_number}`}: ${lec.title}` : levels.find((l) => l.id === selectedLevelId)?.title;
                          })()
                        : levels.find((l) => l.id === selectedLevelId)?.title}
                  </h3>
                  <p className="text-[8px] font-black text-primary uppercase tracking-widest">
                    {selectedLectureId ? (isAr ? "محادثة الدرس" : "LECTURE CHAT") : "Connected"}
                  </p>
                </div>
              </div>
            </header>
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
            >
              {messages.map((m, i) => {
                  const sender = m.sender || m.profiles;
                  return (
                    <div
                      key={i}
                      className={`flex ${m.sender_id === myProfile?.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`relative group max-w-[70%] p-5 rounded-[24px] ${m.sender_id === myProfile?.id ? "bg-primary text-black rounded-tr-none shadow-lg shadow-primary/10" : "bg-muted/50 border border-border rounded-tl-none"}`}
                      >
                        <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                        <p className="text-[10px] font-bold mt-1 opacity-50">
                          {sender?.username || "Unknown"}
                        </p>
                        <p
                          className={`text-[8px] font-black uppercase mt-1 opacity-40 ${m.sender_id === myProfile?.id ? "text-black" : "text-foreground"}`}
                        >
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>

                        {/* Delete button for Admins (any message) or original sender */}
                        {(isAdmin || m.sender_id === myProfile?.id) && (
                          <button
                            onClick={() => deleteMessage(m.id)}
                            className={`absolute ${m.sender_id === myProfile?.id ? "-left-10" : "-right-10"} top-1/2 -translate-y-1/2 p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-6 bg-muted/30 border-t border-border">
              <div className="relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type secure message..."
                  className="w-full bg-foreground/20 border border-border rounded-2xl py-5 pl-8 pr-16 font-bold focus:outline-none focus:border-primary/50 transition-all"
                />
                <button
                  onClick={sendMessage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-primary text-black rounded-xl hover:scale-105 transition-all shadow-lg shadow-primary/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col p-8 gap-6">
            <h3 className="font-black italic uppercase tracking-widest text-lg">
              {isAr ? "اختيار غرفة محادثة" : "SELECT CLASSROOM CHANNEL"}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {levels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => selectChat("level", level.id)}
                  className="bg-muted/50 border border-border p-6 rounded-3xl hover:bg-muted transition-all text-left flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-foreground/10 overflow-hidden flex-shrink-0">
                    {level.image_url ? (
                      <img src={level.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <MessageSquare className="w-6 h-6 m-auto opacity-20" />
                    )}
                  </div>
                  <p className="font-bold text-sm">{level.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
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
      .from("levels")
      .select("level_order")
      .order("level_order", { ascending: false })
      .limit(1);
    if (data && data.length > 0) setLevelOrder(data[0].level_order + 1);
  };

  const loadLevelData = async () => {
    setLoading(true);
    const { data: level, error: levelError } = await supabase
      .from("levels")
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
        .from("lectures")
        .select("*")
        .eq("level_id", levelId)
        .order("slot_number", { ascending: true });
      if (lects) {
        setLectures(lects.map((l) => ({ ...l, content_blocks: l.content_blocks || [] })));
        if (lects.length > 0) setSelectedLectureIdx(0);
      }

      const { data: exam } = await supabase
        .from("exams")
        .select("questions")
        .eq("level_id", levelId)
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
          .from("levels")
          .insert([levelPayload])
          .select()
          .single();
        if (error) throw error;
        currentLevelId = data.id;
      } else {
        const { error } = await supabase
          .from("levels")
          .update(levelPayload)
          .eq("id", levelId);
        if (error) throw error;
      }

      const { data: existingLectures } = await supabase
        .from("lectures")
        .select("id")
        .eq("level_id", currentLevelId);

      const existingIds = existingLectures?.map((l) => l.id) || [];
      const lecturesToSave = lectures
        .filter((l) => l.title.trim() !== "")
        .map((l, index) => ({
          id: l.id || uuidv4(),
          title: l.title,
          description: l.description,
          video_url: l.video_url,
          pdf_url: l.pdf_url,
          slot_number: index + 1,
          level_id: currentLevelId,
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
        await supabase.from("lectures").delete().in("id", idsToDelete);
      }

      // Upsert lectures
      if (lecturesToSave.length > 0) {
        const { error: upsertError } = await supabase.from("lectures").upsert(lecturesToSave);
        if (upsertError) throw upsertError;
      }

      // Save exam
      if (examQuestions.length > 0) {
        const { data: existingExam, error: fetchError } = await supabase
          .from("exams")
          .select("id")
          .eq("level_id", currentLevelId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingExam) {
          const { error: updateError } = await supabase
            .from("exams")
            .update({ 
              title: `Exam for ${levelTitle}`, 
              questions: examQuestions 
            })
            .eq("id", existingExam.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from("exams")
            .insert([
              {
                level_id: currentLevelId,
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="h-20 bg-card/90 backdrop-blur-xl border-b border-border px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest">
              {levelId ? "EDIT MODE" : "CREATION MODE"}
            </h2>
            <h1 className="text-xl font-bold tracking-tight">{levelTitle || "Untitled Course"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 mr-4 px-4 py-2 bg-muted/50 rounded-full border border-border">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              Status:
            </span>
            <select
              value={isPublished ? "true" : "false"}
              onChange={(e) => setIsPublished(e.target.value === "true")}
              className="bg-transparent text-[9px] font-black uppercase text-lime-400 outline-none"
            >
              <option value="true">Live</option>
              <option value="false">Draft</option>
            </select>
          </div>
          <HeroButton
            onClick={handleSave}
            loading={isSubmitting}
            variant="primary"
            className="bg-primary text-black px-10 h-12 rounded-xl"
          >
            <Save className="w-4 h-4 mr-2" />
            {isAr ? "حفظ ونشر" : "DEPLOY"}
          </HeroButton>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-black border-r border-border flex flex-col overflow-y-auto no-scrollbar">
          <div className="p-6">
            <button
              onClick={() => {
                setActiveTab("info");
                setSelectedLectureIdx(null);
              }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all mb-8 ${activeTab === "info" ? "bg-primary text-black shadow-lg shadow-primary/10" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isAr ? "معلومات الكورس" : "Course Info"}
              </span>
            </button>

            <div className="space-y-1 mb-8">
              <div className="flex items-center justify-between px-6 mb-4">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                  {isAr ? "المنهج الدراسي" : "Syllabus"}
                </span>
                <HeroButton
                  onClick={addLecture}
                  size="sm"
                  variant="outline"
                  className="px-3 h-8 border-lime-500/20 text-lime-500 hover:bg-lime-500/10"
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
                <div key={l.id || `new-lec-${i}`} className="flex items-center gap-2">
                  <button
                    onClick={() => moveLecture(i, i - 1)}
                    disabled={i === 0}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveLecture(i, i + 1)}
                    disabled={i === lectures.length - 1}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                  <div
                    onClick={() => {
                      setActiveTab("curriculum");
                      setSelectedLectureIdx(i);
                    }}
                    className={`flex-1 flex items-center gap-4 px-6 py-3 rounded-xl transition-all text-left cursor-pointer ${activeTab === "curriculum" && selectedLectureIdx === i ? "bg-muted text-foreground border border-border" : "text-muted-foreground hover:text-foreground/60 hover:bg-muted/50"}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${l.title ? "bg-lime-500/20 text-lime-500" : "bg-muted/50 text-muted-foreground"}`}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[10px] font-bold truncate flex-1">
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
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border mb-4 ${activeTab === "exam" ? "bg-yellow-500 text-black border-yellow-400" : "text-muted-foreground border-border hover:text-foreground"}`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isAr ? "الاختبار النهائي" : "Final Exam"}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("bulk_upload");
                setSelectedLectureIdx(null);
              }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border mb-4 ${activeTab === "bulk_upload" ? "bg-purple-500 text-black border-purple-400" : "text-muted-foreground border-border hover:text-foreground"}`}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isAr ? "تحميل جماعي" : "BULK UPLOAD"}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("chat" as any);
                setSelectedLectureIdx(null);
              }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border ${activeTab === "chat" ? "bg-lime-500 text-black border-lime-400" : "text-muted-foreground border-border hover:text-foreground"}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isAr ? "غرفة المحادثة" : "LEVEL CHAT"}
              </span>
            </button>
          </div>
        </aside>

        <main className="flex-1 bg-foreground/20 p-12 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === "info" && (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-3xl space-y-10"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase">
                    {isAr ? "إعدادات المستوى" : "Level Settings"}
                  </h2>
                  <p className="text-muted-foreground text-xs font-bold">
                    {isAr
                      ? "المعلومات الأساسية للمسار التعليمي"
                      : "Define the core parameters for this educational track"}
                  </p>
                </div>
                <div className="grid gap-8 bg-muted/30 border border-border p-10 rounded-[40px]">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {isAr ? "صورة الغلاف" : "Cover Media"}
                    </label>
                    <div className="flex gap-6 items-center">
                        <div className="w-40 h-40 rounded-3xl bg-black border border-border overflow-hidden flex-shrink-0">
                            {levelImage ? (
                                <img src={levelImage} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <Layout className="w-12 h-12" />
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
                      className="w-full bg-card/80 border border-border rounded-2xl px-8 py-5 text-lg font-bold outline-none focus:border-lime-500/50 transition-all"
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
                      className="w-full bg-card/80 border border-border rounded-2xl px-8 py-5 text-lg font-bold outline-none focus:border-lime-500/50 transition-all"
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
                      className="w-full bg-card/80 border border-border rounded-2xl px-8 py-5 text-lg font-bold outline-none focus:border-lime-500/50 transition-all"
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
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
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
                        className="w-full bg-muted/50 border border-border rounded-[32px] px-8 py-6 text-xl font-bold outline-none focus:border-lime-500/50"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Description
                      </label>
                      <textarea
                        value={lectures[selectedLectureIdx].description}
                        onChange={(e) => {
                          const newLects = [...lectures];
                          newLects[selectedLectureIdx].description = e.target.value;
                          setLectures(newLects);
                        }}
                        className="w-full bg-muted/50 border border-border rounded-[32px] px-8 py-6 text-sm font-bold outline-none focus:border-lime-500/50 resize-none"
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
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
                          className="w-full bg-muted/50 border border-border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-lime-500/50"
                        />
                      </div>
                      <div className="flex items-center justify-between p-6 bg-muted/50 border border-border rounded-2xl">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <Video className="w-3 h-3" /> Video Source (URL or Upload)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={lectures[selectedLectureIdx].video_url}
                            onChange={(e) => {
                              const newLects = [...lectures];
                              newLects[selectedLectureIdx].video_url = e.target.value;
                              setLectures(newLects);
                            }}
                            placeholder="YouTube Link or Upload Video"
                            className="flex-1 bg-muted/50 border border-border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-lime-500/50"
                          />
                          <button
                            onClick={() => videoInputRef.current?.click()}
                            disabled={uploadingFile}
                            className="px-6 rounded-2xl bg-lime-500 text-black font-black uppercase text-[10px] hover:scale-105 transition-all disabled:opacity-50"
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
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <FileText className="w-3 h-3" /> PDF Source (URL)
                        </label>
                        <input
                          type="text"
                          value={lectures[selectedLectureIdx].pdf_url}
                          onChange={(e) => {
                            const newLects = [...lectures];
                            newLects[selectedLectureIdx].pdf_url = e.target.value;
                            setLectures(newLects);
                          }}
                          placeholder="PDF Link"
                          className="w-full bg-muted/50 border border-border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-lime-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Advanced Content Blocks
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {["text", "code", "image", "pdf", "download", "word", "quiz", "canvas"].map(type => (
                            <button
                              key={type}
                              onClick={() => addBlock(type as any, selectedLectureIdx)}
                              className="p-2 bg-muted/50 rounded-lg hover:bg-primary hover:text-black transition-colors text-[10px] font-black uppercase"
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
                            className="relative group p-6 bg-muted/30 border border-border rounded-3xl"
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
                            <div className="flex items-center gap-4 mb-4">
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
                    className="p-10 rounded-[40px] bg-muted/30 border border-border space-y-6 relative group"
                  >
                    <button
                      onClick={() => setExamQuestions((prev) => prev.filter((_, i) => i !== qIdx))}
                      className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Question {qIdx + 1}
                      </label>
                      <textarea
                        value={q.text}
                        onChange={(e) => {
                          const newQ = [...examQuestions];
                          newQ[qIdx].text = e.target.value;
                          setExamQuestions(newQ);
                        }}
                        className="w-full bg-card/80 border border-border rounded-2xl px-8 py-5 text-lg font-bold outline-none resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Options
                      </label>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-4">
                          <input
                            type="radio"
                            name={`question-${qIdx}`}
                            checked={q.correct === optIdx}
                            onChange={() => {
                              const newQ = [...examQuestions];
                              newQ[qIdx].correct = optIdx;
                              setExamQuestions(newQ);
                            }}
                            className="h-5 w-5 accent-primary"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newQ = [...examQuestions];
                              newQ[qIdx].options[optIdx] = e.target.value;
                              setExamQuestions(newQ);
                            }}
                            className="flex-1 bg-card/80 border border-border rounded-2xl px-6 py-4 text-sm font-bold outline-none"
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
                  className="w-full h-12 border-border text-muted-foreground hover:text-primary hover:border-primary/50"
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
                <div className="grid gap-8 bg-muted/30 border border-border p-10 rounded-[40px]">
                  <div className="space-y-4">
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
      const [profilesRes, levelsRes, lecturesRes, studentProgressRes, levelAccessRes] =
        await Promise.all([
          supabase.from("profiles").select("*"),
          supabase.from("levels").select("*"),
          supabase.from("lectures").select("id, level_id, slot_number, is_live"),
          supabase.from("student_progress").select("student_id, lecture_id"),
          supabase.from("level_access").select("user_id, level_id"),
        ]);

      const allProfiles: Profile[] = (profilesRes.data || []).filter(p => p.role === 'student');
      const allLevels: Level[] = levelsRes.data || [];
      const allLectures: FullLecture[] = lecturesRes.data || [];
      const allStudentProgress: { student_id: string; lecture_id: string }[] =
        studentProgressRes.data || [];
      const allLevelAccess: { user_id: string; level_id: string }[] = levelAccessRes.data || [];

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

          // Determine which levels this user has access to
          const accessibleLevelIds = allLevelAccess
            .filter((la) => la.user_id === profile.id)
            .map((la) => la.level_id);

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
          <div className="bg-foreground/20 backdrop-blur-xl border border-border rounded-[48px] p-8 space-y-6">
            <h2 className="text-xl font-black italic uppercase text-muted-foreground">
              {isAr ? "أفضل 3 عملاء" : "TOP 3 AGENTS"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {top3.map((user, index) => (
                <div
                  key={user.id}
                  className="relative p-6 rounded-[32px] bg-muted/50 border border-border flex items-center gap-4"
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
          <div className="bg-foreground/20 backdrop-blur-xl border border-border rounded-[48px] p-8 space-y-6">
            <h2 className="text-xl font-black italic uppercase text-muted-foreground">
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
            className={`p-6 rounded-[32px] bg-muted/50 border border-border flex items-center justify-between group hover:bg-muted transition-all ${sub.total_grade !== null ? "opacity-60" : ""}`}
          >
            <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center font-black text-muted-foreground">
                    {sub.profiles?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-bold text-foreground">{sub.profiles?.username}</h3>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {sub.lectures?.title} // {new Date(sub.created_at).toLocaleDateString()}
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
                    className="bg-background border border-border p-10 rounded-[48px] max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                    <header className="flex justify-between items-start mb-10">
                        <div>
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-1">
                                {isAr ? "تصحيح الإجابات" : "EXAMINATION FILE"}
                            </h3>
                            <p className="text-emerald-400/60 text-[10px] font-black uppercase tracking-widest">
                                AGENT: {selectedSub.profiles?.username} // MODULE: {selectedSub.lectures?.title}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-muted/50 border border-border rounded-[32px]">
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
