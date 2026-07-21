import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase-code";
import { useAuth } from "../hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Award, MessageSquare, ClipboardList, Camera, CheckCircle,
  Bell, Calendar, FolderOpen, BarChart3, Clock, Users, TrendingUp,
  TrendingDown, AlertCircle, ChevronRight, ChevronDown, ChevronUp,
  Star, Target, Flame, Trophy, Download, Send, Search, Filter,
  X, Loader2, GraduationCap, PlayCircle, FileText, Eye,
  MessageCircle, Phone, Mail, Lock, Unlock, CheckSquare,
  XCircle, AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownRight,
  Minus, Image, Paperclip, Smile
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend
} from "recharts";

export const Route = createFileRoute("/parent-dashboard")({
  component: ParentDashboard,
});

type Tab = "dashboard" | "courses" | "assignments" | "grades" | "activity" | "messages" | "calendar" | "files" | "feedback";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#06b6d4"];

function ParentDashboard() {
  const { isAr } = useLanguage();
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  useEffect(() => {
    if (user) fetchLinkedStudents();
  }, [user]);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchLinkedStudents = async () => {
    setLoading(true);
    const { data: links, error } = await supabase
      .from("parent_student_links")
      .select("student:profiles!parent_student_links_student_id_fkey(*)")
      .eq("parent_id", user?.id);

    if (!error && links) {
      const studs = links.map((l: any) => l.student).filter(Boolean);
      setStudents(studs);
      if (studs.length > 0 && !selectedStudent) setSelectedStudent(studs[0]);
    }
    setLoading(false);
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user?.id)
      .eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030303] text-foreground">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#030303]/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-black uppercase tracking-widest text-primary">
              {isAr ? "لوحة أولياء الأمور" : "PARENT PORTAL"}
            </h1>
            {selectedStudent && (
              <span className="text-xs text-muted-foreground hidden md:block">
                {isAr ? "المتابع:" : "Monitoring:"} <span className="font-bold text-foreground">{selectedStudent.username}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative p-2 rounded-xl bg-muted/50 hover:bg-muted transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-black flex items-center justify-center text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-16 flex min-h-screen">
        {/* Student Sidebar */}
        <aside className="w-64 border-r border-border bg-card/30 hidden lg:block overflow-y-auto">
          <div className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 px-2">
              {isAr ? "الطلاب" : "STUDENTS"}
            </p>
            <div className="space-y-2">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => { setSelectedStudent(student); setActiveTab("dashboard"); }}
                  className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                    selectedStudent?.id === student.id
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black ${
                    selectedStudent?.id === student.id ? "bg-primary-foreground/20" : "bg-muted"
                  }`}>
                    {student.avatar_url ? (
                      <img src={student.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      student.username?.charAt(0)?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{student.username}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{student.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile student selector */}
          {students.length > 1 && (
            <div className="lg:hidden p-4 border-b border-border bg-card/30">
              <select
                value={selectedStudent?.id || ""}
                onChange={(e) => {
                  const s = students.find(s => s.id === e.target.value);
                  if (s) { setSelectedStudent(s); setActiveTab("dashboard"); }
                }}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.username}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-border bg-card/20 sticky top-16 z-40">
            <div className="max-w-[1200px] mx-auto px-4 md:px-8 overflow-x-auto">
              <div className="flex gap-1 py-2">
                {([
                  { key: "dashboard", icon: BarChart3, label: isAr ? "نظرة عامة" : "OVERVIEW" },
                  { key: "courses", icon: BookOpen, label: isAr ? "المقررات" : "COURSES" },
                  { key: "assignments", icon: ClipboardList, label: isAr ? "المهام" : "ASSIGNMENTS" },
                  { key: "grades", icon: GraduationCap, label: isAr ? "الدرجات" : "GRADES" },
                  { key: "activity", icon: Clock, label: isAr ? "النشاط" : "ACTIVITY" },
                  { key: "messages", icon: MessageSquare, label: isAr ? "الرسائل" : "MESSAGES" },
                  { key: "calendar", icon: Calendar, label: isAr ? "التقويم" : "CALENDAR" },
                  { key: "files", icon: FolderOpen, label: isAr ? "الملفات" : "FILES" },
                  { key: "feedback", icon: MessageCircle, label: isAr ? "الملاحظات" : "FEEDBACK" },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      activeTab === tab.key
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-[1200px] mx-auto p-4 md:p-8">
            <AnimatePresence mode="wait">
              {!selectedStudent ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground font-bold">
                    {isAr ? "لا يوجد طلاب مرتبطون بحسابك" : "No students linked to your account"}
                  </p>
                </motion.div>
              ) : (
                <>
                  {activeTab === "dashboard" && <DashboardTab student={selectedStudent} isAr={isAr} />}
                  {activeTab === "courses" && <CoursesTab student={selectedStudent} isAr={isAr} />}
                  {activeTab === "assignments" && <AssignmentsTab student={selectedStudent} isAr={isAr} />}
                  {activeTab === "grades" && <GradesTab student={selectedStudent} isAr={isAr} />}
                  {activeTab === "activity" && <ActivityTab student={selectedStudent} isAr={isAr} />}
                  {activeTab === "messages" && <MessagesTab student={selectedStudent} isAr={isAr} userId={user?.id || ""} />}
                  {activeTab === "calendar" && <CalendarTab student={selectedStudent} isAr={isAr} />}
                  {activeTab === "files" && <FilesTab student={selectedStudent} isAr={isAr} />}
                  {activeTab === "feedback" && <FeedbackTab student={selectedStudent} isAr={isAr} />}
                </>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            onClick={() => setShowNotifPanel(false)}
          >
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-black uppercase tracking-tight">
                    {isAr ? "الإشعارات" : "NOTIFICATIONS"}
                  </h2>
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="px-3 py-1.5 rounded-lg bg-muted text-[10px] font-bold hover:bg-muted/80 transition-all"
                      >
                        {isAr ? "تحديد الكل كمقروء" : "MARK ALL READ"}
                      </button>
                    )}
                    <button onClick={() => setShowNotifPanel(false)} className="p-2 rounded-lg bg-muted hover:bg-muted/80">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">{isAr ? "لا إشعارات" : "No notifications"}</p>
                  ) : (
                    notifications.map(n => (
                      <NotificationItem key={n.id} notification={n} isAr={isAr} />
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// NOTIFICATION ITEM
// ═══════════════════════════════════════════════════════

function NotificationItem({ notification: n, isAr }: { notification: any; isAr: boolean }) {
  const typeColors: Record<string, string> = {
    success: "bg-green-500/15 text-green-500",
    warning: "bg-yellow-500/15 text-yellow-500",
    error: "bg-red-500/15 text-red-500",
    info: "bg-blue-500/15 text-blue-500",
    message: "bg-purple-500/15 text-purple-500",
  };
  const typeIcons: Record<string, any> = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Bell,
    message: MessageSquare,
  };
  const Icon = typeIcons[n.type] || Bell;

  const markRead = async () => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
  };

  return (
    <div
      onClick={markRead}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        n.is_read ? "border-border bg-card/50" : "border-primary/30 bg-primary/5"
      }`}
    >
      <div className="flex gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[n.type] || typeColors.info}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold">{n.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
          <p className="text-[9px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
        </div>
        {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════

function StatCard({ label, value, icon: Icon, color = "text-primary", sub }: { label: string; value: string | number; icon: any; color?: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color.replace("text-", "bg-")}/10`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl md:text-3xl font-black tracking-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════

function DashboardTab({ student, isAr }: { student: any; isAr: boolean }) {
  const [summary, setSummary] = useState<any>(null);
  const [courseProgress, setCourseProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [student?.id]);

  const fetchData = async () => {
    setLoading(true);
    const [sumRes, cpRes] = await Promise.all([
      supabase.rpc("get_parent_student_summary", { p_student_id: student.id }),
      supabase.rpc("get_student_course_progress", { p_student_id: student.id }),
    ]);
    if (sumRes.data?.[0]) setSummary(sumRes.data[0]);
    if (cpRes.data) setCourseProgress(cpRes.data);
    setLoading(false);
  };

  if (loading) return <LoadingState />;
  if (!summary) return <EmptyState message={isAr ? "لا توجد بيانات" : "No data available"} />;

  const completionPct = summary.total_lectures > 0
    ? Math.round((Number(summary.completed_lectures) / Number(summary.total_lectures)) * 100)
    : 0;

  return (
    <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Student Header Card */}
      <div className="bg-card border border-border rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black overflow-hidden">
            {student.avatar_url ? (
              <img src={student.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              student.username?.charAt(0)?.toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-black tracking-tight">{student.username}</h2>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
              {student.group_name && <span>{isAr ? "المجموعة" : "Group"}: <b className="text-foreground">{student.group_name}</b></span>}
              {student.age && <span>{isAr ? "العمر" : "Age"}: <b className="text-foreground">{student.age}</b></span>}
            </div>
          </div>
          <div className="text-right hidden md:block">
            <div className="w-20 h-20 relative">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/50" />
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none"
                  className="text-primary" strokeDasharray={`${completionPct * 2.64} 264`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-black">{completionPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard label={isAr ? "الدروس المكتملة" : "COMPLETED"} value={`${summary.completed_lectures}/${summary.total_lectures}`} icon={CheckCircle} color="text-green-500" />
        <StatCard label={isAr ? "متوسط الدرجات" : "AVG GRADE"} value={summary.average_grade ? `${summary.average_grade}%` : "—"} icon={Target} color="text-blue-500" />
        <StatCard label={isAr ? "ساعات الدراسة" : "STUDY HOURS"} value={summary.total_study_hours || "0"} icon={Clock} color="text-purple-500" />
        <StatCard label={isAr ? "المهام المكتملة" : "ASSIGNMENTS"} value={`${summary.approved_assignments}/${summary.total_assignments}`} icon={ClipboardList} color="text-amber-500" />
      </div>

      {/* Second Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard label={isAr ? "مهام بانتظار المراجعة" : "PENDING"} value={summary.pending_assignments || "0"} icon={Clock} color="text-yellow-500" />
        <StatCard label={isAr ? "مهام مرفوضة" : "REJECTED"} value={summary.rejected_assignments || "0"} icon={XCircle} color="text-red-500" />
        <StatCard label={isAr ? "متوسط الاختبارات" : "EXAM AVG"} value={summary.average_exam_score ? `${summary.average_exam_score}%` : "—"} icon={GraduationCap} color="text-cyan-500" />
        <StatCard label={isAr ? "المستويات المتاحة" : "LEVELS"} value={`${summary.accessible_levels}/${summary.total_levels}`} icon={Unlock} color="text-orange-500" />
      </div>

      {/* Course Progress */}
      {courseProgress.length > 0 && (
        <div className="bg-card border border-border rounded-3xl p-6">
          <h3 className="text-sm font-black uppercase tracking-widest mb-4">{isAr ? "تقدم المقررات" : "COURSE PROGRESS"}</h3>
          <div className="space-y-4">
            {courseProgress.map((cp: any) => (
              <div key={cp.level_id} className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{cp.level_title} (L{cp.level_order})</span>
                    <span className="text-[10px] text-muted-foreground">{cp.completed_lectures}/{cp.total_lectures}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${Number(cp.progress_pct || 0)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-black text-primary w-12 text-right">{Number(cp.progress_pct || 0).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// COURSES TAB
// ═══════════════════════════════════════════════════════

function CoursesTab({ student, isAr }: { student: any; isAr: boolean }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [lessonDetails, setLessonDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { fetchData(); }, [student?.id]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_student_course_progress", { p_student_id: student.id });
    if (data) setCourses(data);
    setLoading(false);
  };

  const expandLevel = async (levelId: string) => {
    if (expandedLevel === levelId) { setExpandedLevel(null); return; }
    setExpandedLevel(levelId);
    setDetailLoading(true);
    const { data } = await supabase.rpc("get_student_lesson_detail", { p_student_id: student.id, p_level_id: levelId });
    if (data) setLessonDetails(data);
    setDetailLoading(false);
  };

  if (loading) return <LoadingState />;

  return (
    <motion.div key="courses" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <h2 className="text-lg font-black uppercase tracking-tight">{isAr ? "المقررات والدروس" : "COURSES & LESSONS"}</h2>
      {courses.length === 0 ? <EmptyState message={isAr ? "لا توجد مقررات" : "No courses found"} /> : (
        <div className="space-y-3">
          {courses.map((c: any) => {
            const pct = Number(c.progress_pct || 0);
            const isExpanded = expandedLevel === c.level_id;
            return (
              <div key={c.level_id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => expandLevel(c.level_id)}
                  className="w-full p-5 flex items-center gap-4 hover:bg-muted/30 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                    L{c.level_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black truncate">{c.level_title}</p>
                      {c.has_access ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-500 text-[8px] font-black uppercase">{isAr ? "متاح" : "ACTIVE"}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 text-[8px] font-black uppercase">{isAr ? "مقفل" : "LOCKED"}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[200px]">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{c.completed_lectures}/{c.total_lectures} {isAr ? "درس" : "lessons"}</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-primary">{pct.toFixed(0)}%</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border overflow-hidden"
                    >
                      {detailLoading ? (
                        <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                      ) : (
                        <div className="p-4 space-y-2">
                          {lessonDetails.map((l: any) => (
                            <div key={l.lecture_id} className={`flex items-center gap-3 p-3 rounded-xl ${
                              l.is_completed ? "bg-green-500/5 border border-green-500/20" : l.is_locked ? "bg-muted/30 opacity-60" : "bg-muted/30"
                            }`}>
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                l.is_completed ? "bg-green-500/15 text-green-500" : l.is_locked ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
                              }`}>
                                {l.is_completed ? <CheckCircle className="w-3.5 h-3.5" /> : l.is_locked ? <Lock className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">
                                  <span className="text-muted-foreground mr-2">#{l.slot_number}</span>
                                  {l.lecture_title}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {l.assignment_required && (
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      l.assignment_status === "approved" ? "bg-green-500/15 text-green-500"
                                      : l.assignment_status === "rejected" ? "bg-red-500/15 text-red-500"
                                      : l.assignment_status === "pending" ? "bg-yellow-500/15 text-yellow-500"
                                      : "bg-muted text-muted-foreground"
                                    }`}>
                                      {l.assignment_status === "not_submitted" ? (isAr ? "غير مقدم" : "NOT SUBMITTED") : l.assignment_status.toUpperCase()}
                                    </span>
                                  )}
                                  {l.quiz_passed && (
                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-500">
                                      {isAr ? "اجتاز الاختبار" : "QUIZ PASSED"}
                                    </span>
                                  )}
                                  {l.lock_reason && (
                                    <span className="text-[8px] text-muted-foreground">{l.lock_reason}</span>
                                  )}
                                </div>
                              </div>
                              {l.assignment_grade !== null && (
                                <span className="text-xs font-black text-primary">{l.assignment_grade}%</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// ASSIGNMENTS TAB
// ═══════════════════════════════════════════════════════

function AssignmentsTab({ student, isAr }: { student: any; isAr: boolean }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  useEffect(() => { fetchData(); }, [student?.id]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_student_assignments", { p_student_id: student.id });
    if (data) setAssignments(data);
    setLoading(false);
  };

  const statusColors: Record<string, string> = {
    approved: "bg-green-500/15 text-green-500",
    pending: "bg-yellow-500/15 text-yellow-500",
    rejected: "bg-red-500/15 text-red-500",
    not_submitted: "bg-muted text-muted-foreground",
  };
  const statusLabels: Record<string, string> = {
    approved: isAr ? "تمت الموافقة" : "APPROVED",
    pending: isAr ? "قيد المراجعة" : "PENDING REVIEW",
    rejected: isAr ? "مرفوض" : "REJECTED",
    not_submitted: isAr ? "غير مقدم" : "NOT SUBMITTED",
  };

  const filtered = assignments.filter(a => filter === "all" || a.status === filter);

  if (loading) return <LoadingState />;

  return (
    <motion.div key="assignments" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <h2 className="text-lg font-black uppercase tracking-tight">{isAr ? "المهام والتقديمات" : "ASSIGNMENTS & SUBMISSIONS"}</h2>

      <div className="flex gap-2 flex-wrap">
        {["all", "approved", "pending", "rejected", "not_submitted"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "all" ? (isAr ? "الكل" : "ALL") : statusLabels[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? <EmptyState message={isAr ? "لا توجد مهام" : "No assignments found"} /> : (
        <div className="space-y-3">
          {filtered.map((a: any) => (
            <div
              key={a.submission_id || a.lecture_id}
              onClick={() => setSelectedAssignment(a)}
              className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black">{a.lecture_title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isAr ? "المستوى" : "Level"} {a.level_order}: {a.level_title} • {isAr ? "درس" : "Slot"} #{a.slot_number}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusColors[a.status] || statusColors.not_submitted}`}>
                  {statusLabels[a.status] || a.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-muted-foreground">
                {a.grade !== null && <span>{isAr ? "الدرجة" : "Grade"}: <b className="text-primary">{a.grade}%</b></span>}
                {a.feedback && <span className="line-clamp-1 flex-1">{isAr ? "ملاحظات" : "Feedback"}: {a.feedback}</span>}
                <span>{isAr ? "التاريخ" : "Date"}: {new Date(a.created_at).toLocaleDateString()}</span>
                {Number(a.submission_count) > 1 && <span>{isAr ? "المحاولات" : "Attempts"}: {a.submission_count}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedAssignment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedAssignment(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-lg">{selectedAssignment.lecture_title}</h3>
                <button onClick={() => setSelectedAssignment(null)} className="p-2 rounded-xl bg-muted hover:bg-muted/80">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-muted-foreground text-[9px] font-black uppercase">{isAr ? "المستوى" : "LEVEL"}</p>
                    <p className="font-bold mt-1">{selectedAssignment.level_title}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-muted-foreground text-[9px] font-black uppercase">{isAr ? "الدرجة" : "GRADE"}</p>
                    <p className="font-bold mt-1 text-primary">{selectedAssignment.grade !== null ? `${selectedAssignment.grade}%` : "—"}</p>
                  </div>
                </div>

                {selectedAssignment.assignment_description && (
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">{isAr ? "الوصف" : "DESCRIPTION"}</p>
                    <p className="text-xs">{selectedAssignment.assignment_description}</p>
                  </div>
                )}

                {selectedAssignment.feedback && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-[9px] font-black uppercase text-primary mb-2">{isAr ? "ملاحظات المشرف" : "MODERATOR FEEDBACK"}</p>
                    <p className="text-xs">{selectedAssignment.feedback}</p>
                    {selectedAssignment.graded_by_name && (
                      <p className="text-[9px] text-muted-foreground mt-2">— {selectedAssignment.graded_by_name}</p>
                    )}
                  </div>
                )}

                {selectedAssignment.image_url && (
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">{isAr ? "الملف المرفق" : "SUBMITTED FILE"}</p>
                    {selectedAssignment.image_url.match(/\.(pdf|doc|docx)$/i) ? (
                      <a href={selectedAssignment.image_url} target="_blank" rel="noopener"
                        className="flex items-center gap-3 p-4 bg-muted rounded-xl hover:bg-muted/80 transition-all">
                        <FileText className="w-6 h-6 text-primary" />
                        <div>
                          <p className="text-xs font-bold">{isAr ? "عرض الملف" : "View File"}</p>
                          <p className="text-[9px] text-muted-foreground">{isAr ? "افتح في نافذة جديدة" : "Opens in new tab"}</p>
                        </div>
                      </a>
                    ) : (
                      <img src={selectedAssignment.image_url} alt="" className="w-full max-h-[300px] object-contain rounded-xl border border-border" />
                    )}
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground space-y-1">
                  <p>{isAr ? "تاريخ التقديم" : "Submitted"}: {new Date(selectedAssignment.created_at).toLocaleString()}</p>
                  {selectedAssignment.graded_at && (
                    <p>{isAr ? "تاريخ التقييم" : "Graded"}: {new Date(selectedAssignment.graded_at).toLocaleString()}</p>
                  )}
                  <p>{isAr ? "عدد المحاولات" : "Attempts"}: {selectedAssignment.submission_count}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// GRADES TAB
// ═══════════════════════════════════════════════════════

function GradesTab({ student, isAr }: { student: any; isAr: boolean }) {
  const [summary, setSummary] = useState<any>(null);
  const [courseProgress, setCourseProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [student?.id]);

  const fetchData = async () => {
    setLoading(true);
    const [sumRes, cpRes] = await Promise.all([
      supabase.rpc("get_parent_student_summary", { p_student_id: student.id }),
      supabase.rpc("get_student_course_progress", { p_student_id: student.id }),
    ]);
    if (sumRes.data?.[0]) setSummary(sumRes.data[0]);
    if (cpRes.data) setCourseProgress(cpRes.data);
    setLoading(false);
  };

  if (loading) return <LoadingState />;
  if (!summary) return <EmptyState message={isAr ? "لا توجد درجات" : "No grades data"} />;

  const gradeData = courseProgress.map((c: any) => ({
    name: c.level_title,
    progress: Number(c.progress_pct || 0),
  }));

  return (
    <motion.div key="grades" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <h2 className="text-lg font-black uppercase tracking-tight">{isAr ? "الدرجات والأداء" : "GRADES & PERFORMANCE"}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={isAr ? "متوسط المهام" : "ASSIGNMENT AVG"} value={summary.average_grade ? `${summary.average_grade}%` : "—"} icon={ClipboardList} color="text-primary" />
        <StatCard label={isAr ? "متوسط الاختبارات" : "EXAM AVG"} value={summary.average_exam_score ? `${summary.average_exam_score}%` : "—"} icon={GraduationCap} color="text-cyan-500" />
        <StatCard label={isAr ? "إجمالي الاختبارات" : "EXAM ATTEMPTS"} value={summary.total_exam_attempts || "0"} icon={Target} color="text-purple-500" />
        <StatCard label={isAr ? "المهام المكتملة" : "COMPLETED"} value={summary.completed_assignments || "0"} icon={CheckCircle} color="text-green-500" />
      </div>

      {gradeData.length > 0 && (
        <div className="bg-card border border-border rounded-3xl p-6">
          <h3 className="text-sm font-black uppercase tracking-widest mb-4">{isAr ? "التقدم حسب المستوى" : "PROGRESS BY LEVEL"}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#888", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#888", fontSize: 10 }} width={120} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 12, fontSize: 11 }}
                  formatter={(val: number) => [`${val}%`, isAr ? "التقدم" : "Progress"]}
                />
                <Bar dataKey="progress" fill="#22c55e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {summary.average_grade && (
        <div className="bg-card border border-border rounded-3xl p-6">
          <h3 className="text-sm font-black uppercase tracking-widest mb-4">{isAr ? "ملخص الأداء" : "PERFORMANCE SUMMARY"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <p className="text-3xl font-black text-green-500">{summary.average_grade}%</p>
              <p className="text-[10px] font-black uppercase text-muted-foreground mt-1">{isAr ? "متوسط المهام" : "Assignment Average"}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <p className="text-3xl font-black text-cyan-500">{summary.average_exam_score || "—"}%</p>
              <p className="text-[10px] font-black uppercase text-muted-foreground mt-1">{isAr ? "متوسط الاختبارات" : "Exam Average"}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <p className="text-3xl font-black text-primary">{summary.total_lectures > 0 ? Math.round((Number(summary.completed_lectures) / Number(summary.total_lectures)) * 100) : 0}%</p>
              <p className="text-[10px] font-black uppercase text-muted-foreground mt-1">{isAr ? "نسبة الإنجاز" : "Completion Rate"}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// ACTIVITY TAB
// ═══════════════════════════════════════════════════════

function ActivityTab({ student, isAr }: { student: any; isAr: boolean }) {
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [student?.id]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_student_activity", { p_student_id: student.id });
    if (data?.[0]) setActivity(data[0]);
    setLoading(false);
  };

  if (loading) return <LoadingState />;
  if (!activity) return <EmptyState message={isAr ? "لا يوجد نشاط" : "No activity data"} />;

  const dailyData = Array.isArray(activity.daily_activity)
    ? activity.daily_activity.map((d: any) => ({
        day: new Date(d.date).toLocaleDateString("en", { weekday: "short" }),
        minutes: d.minutes,
      }))
    : [];

  const weeklyData = Array.isArray(activity.weekly_activity)
    ? activity.weekly_activity.map((w: any) => ({
        week: new Date(w.week).toLocaleDateString("en", { month: "short", day: "numeric" }),
        minutes: w.minutes,
      }))
    : [];

  return (
    <motion.div key="activity" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <h2 className="text-lg font-black uppercase tracking-tight">{isAr ? "النشاط والحضور" : "ACTIVITY & ATTENDANCE"}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={isAr ? "إجمالي ساعات الدراسة" : "TOTAL HOURS"} value={activity.total_study_hours || "0"} icon={Clock} color="text-primary" />
        <StatCard label={isAr ? "ساعات هذا الأسبوع" : "THIS WEEK"} value={activity.study_hours_this_week || "0"} icon={Flame} color="text-orange-500" />
        <StatCard label={isAr ? "ساعات هذا الشهر" : "THIS MONTH"} value={activity.study_hours_this_month || "0"} icon={TrendingUp} color="text-green-500" />
        <StatCard label={isAr ? "إجمالي تسجيلات الدخول" : "TOTAL LOGINS"} value={activity.total_logins || "0"} icon={Users} color="text-blue-500" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label={isAr ? "دخول هذا الأسبوع" : "LOGINS/WEEK"} value={activity.logins_this_week || "0"} icon={ArrowUpRight} color="text-cyan-500" />
        <StatCard label={isAr ? "مشاهدات الدروس" : "LESSON VIEWS"} value={activity.total_lesson_views || "0"} icon={Eye} color="text-purple-500" />
        <StatCard label={isAr ? "آخر نشاط" : "LAST ACTIVE"} value={activity.last_login ? new Date(activity.last_login).toLocaleDateString() : "—"} icon={Clock} color="text-amber-500" />
      </div>

      {/* Daily Activity Chart */}
      {dailyData.length > 0 && (
        <div className="bg-card border border-border rounded-3xl p-6">
          <h3 className="text-sm font-black uppercase tracking-widest mb-4">{isAr ? "النشاط اليومي (آخر 14 يوم)" : "DAILY ACTIVITY (Last 14 Days)"}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="day" tick={{ fill: "#888", fontSize: 9 }} />
                <YAxis tick={{ fill: "#888", fontSize: 9 }} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 12, fontSize: 11 }} formatter={(v: number) => [`${v} min`, isAr ? "الوقت" : "Time"]} />
                <Area type="monotone" dataKey="minutes" stroke="#22c55e" fill="#22c55e20" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weekly Activity Chart */}
      {weeklyData.length > 0 && (
        <div className="bg-card border border-border rounded-3xl p-6">
          <h3 className="text-sm font-black uppercase tracking-widest mb-4">{isAr ? "النشاط الأسبوعي" : "WEEKLY ACTIVITY"}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="week" tick={{ fill: "#888", fontSize: 9 }} />
                <YAxis tick={{ fill: "#888", fontSize: 9 }} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 12, fontSize: 11 }} formatter={(v: number) => [`${v} min`, isAr ? "الوقت" : "Time"]} />
                <Bar dataKey="minutes" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// MESSAGES TAB (Parent ↔ Moderator)
// ═══════════════════════════════════════════════════════

function MessagesTab({ student, isAr, userId }: { student: any; isAr: boolean; userId: string }) {
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchThreads(); }, [student?.id]);

  const fetchThreads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("parent_moderator_threads")
      .select(`
        *,
        moderator:profiles!parent_moderator_threads_moderator_id_fkey (id, username, avatar_url)
      `)
      .eq("parent_id", userId)
      .eq("student_id", student.id)
      .order("last_message_at", { ascending: false });
    if (data) setThreads(data);
    setLoading(false);
  };

  const openThread = async (thread: any) => {
    setActiveThread(thread);
    const { data } = await supabase
      .from("parent_moderator_messages")
      .select("*, sender:profiles!parent_moderator_messages_sender_id_fkey (id, username, avatar_url)")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
    await supabase.rpc("mark_thread_read", { p_thread_id: thread.id, p_user_id: userId });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeThread) return;
    setSending(true);
    await supabase.rpc("send_parent_message", {
      p_thread_id: activeThread.id,
      p_sender_id: userId,
      p_content: newMessage.trim(),
    });
    setNewMessage("");
    await openThread(activeThread);
    setSending(false);
  };

  const startNewThread = async (moderatorId: string) => {
    const { data } = await supabase.rpc("get_or_create_parent_thread", {
      p_parent_id: userId,
      p_moderator_id: moderatorId,
      p_student_id: student.id,
      p_subject: `Regarding ${student.username}`,
    });
    if (data) {
      await fetchThreads();
      const thread = threads.find(t => t.id === data);
      if (thread) openThread(thread);
    }
  };

  // Get all moderators for new thread
  const [moderators, setModerators] = useState<any[]>([]);
  useEffect(() => {
    const fetchMods = async () => {
      const { data } = await supabase.from("profiles").select("id, username, avatar_url").eq("role", "moderator");
      if (data) setModerators(data);
    };
    fetchMods();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <motion.div key="messages" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black uppercase tracking-tight">{isAr ? "الرسائل" : "MESSAGES WITH MODERATOR"}</h2>
      </div>

      {activeThread ? (
        <div className="bg-card border border-border rounded-3xl overflow-hidden flex flex-col" style={{ height: "calc(100vh - 280px)" }}>
          {/* Thread Header */}
          <div className="p-4 border-b border-border flex items-center gap-3">
            <button onClick={() => { setActiveThread(null); setMessages([]); }} className="p-2 rounded-xl bg-muted hover:bg-muted/80">
              <X className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xs font-black">
              {activeThread.moderator?.avatar_url ? (
                <img src={activeThread.moderator.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
              ) : (
                activeThread.moderator?.username?.charAt(0)?.toUpperCase() || "M"
              )}
            </div>
            <div>
              <p className="text-xs font-bold">{activeThread.moderator?.username || "Moderator"}</p>
              <p className="text-[9px] text-muted-foreground">{isAr ? "مشرف" : "Moderator"} • {student.username}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-10">{isAr ? "ابدأ المحادثة" : "Start the conversation"}</p>
            )}
            {messages.map((msg: any) => {
              const isMe = msg.sender_id === userId;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl text-xs ${
                    isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-[8px] mt-1 ${isMe ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {msg.is_read && isMe ? " ✓✓" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder={isAr ? "اكتب رسالة..." : "Type a message..."}
                className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-xs outline-none focus:border-primary"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-4 py-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 transition-all"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Thread List */}
          {threads.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">{isAr ? "لا توجد محادثات بعد" : "No conversations yet"}</p>
              {moderators.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {moderators.map(mod => (
                    <button
                      key={mod.id}
                      onClick={() => startNewThread(mod.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary transition-all text-xs font-bold"
                    >
                      <span>{mod.username}</span>
                      <MessageCircle className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread: any) => (
                <button
                  key={thread.id}
                  onClick={() => openThread(thread)}
                  className="w-full p-4 bg-card border border-border rounded-2xl flex items-center gap-4 hover:border-primary/30 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xs font-black">
                    {thread.moderator?.avatar_url ? (
                      <img src={thread.moderator.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      thread.moderator?.username?.charAt(0)?.toUpperCase() || "M"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold">{thread.moderator?.username || "Moderator"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{thread.subject || student.username}</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    {thread.last_message_at ? new Date(thread.last_message_at).toLocaleDateString() : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// CALENDAR TAB
// ═══════════════════════════════════════════════════════

function CalendarTab({ student, isAr }: { student: any; isAr: boolean }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => { fetchEvents(); }, [student?.id, currentMonth]);

  const fetchEvents = async () => {
    setLoading(true);
    const from = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split("T")[0];
    const to = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split("T")[0];
    const { data } = await supabase.rpc("get_student_calendar", { p_student_id: student.id, p_from: from, p_to: to });
    if (data) setEvents(data);
    setLoading(false);
  };

  const eventTypeColors: Record<string, string> = {
    assignment_due: "bg-amber-500/15 text-amber-500",
    exam: "bg-red-500/15 text-red-500",
    live_class: "bg-blue-500/15 text-blue-500",
    parent_meeting: "bg-purple-500/15 text-purple-500",
    milestone: "bg-green-500/15 text-green-500",
    badge_earned: "bg-cyan-500/15 text-cyan-500",
    level_unlocked: "bg-orange-500/15 text-orange-500",
    custom: "bg-muted text-muted-foreground",
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const monthName = currentMonth.toLocaleString(isAr ? "ar" : "en", { month: "long", year: "numeric" });

  return (
    <motion.div key="calendar" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <h2 className="text-lg font-black uppercase tracking-tight">{isAr ? "التقويم" : "CALENDAR"}</h2>

      <div className="bg-card border border-border rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 rounded-xl bg-muted hover:bg-muted/80">
            <ChevronRight className="w-4 h-4" style={{ transform: "scaleX(-1)" }} />
          </button>
          <h3 className="text-sm font-black uppercase tracking-widest">{monthName}</h3>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 rounded-xl bg-muted hover:bg-muted/80">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {(isAr ? ["ح", "ن", "ث", "أ", "ث", "ج", "س"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map(d => (
            <div key={d} className="text-center text-[9px] font-black uppercase text-muted-foreground py-2">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = events.filter(e => new Date(e.starts_at).toISOString().split("T")[0] === dateStr);
            const isToday = new Date().toISOString().split("T")[0] === dateStr;
            return (
              <div key={day} className={`relative p-2 rounded-xl min-h-[40px] ${isToday ? "bg-primary/10 border border-primary/30" : dayEvents.length > 0 ? "bg-muted/50" : ""}`}>
                <span className={`text-[10px] font-bold ${isToday ? "text-primary" : ""}`}>{day}</span>
                {dayEvents.slice(0, 2).map((ev, j) => (
                  <div key={j} className={`text-[7px] font-bold mt-0.5 px-1 py-0.5 rounded ${eventTypeColors[ev.event_type] || eventTypeColors.custom} truncate`}>
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 2 && <span className="text-[7px] text-muted-foreground">+{dayEvents.length - 2}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-card border border-border rounded-3xl p-6">
        <h3 className="text-sm font-black uppercase tracking-widest mb-4">{isAr ? "الأحداث القادمة" : "UPCOMING EVENTS"}</h3>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-5">{isAr ? "لا أحداث هذا الشهر" : "No events this month"}</p>
        ) : (
          <div className="space-y-2">
            {events.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()).map((ev: any) => (
              <div key={ev.event_id} className={`flex items-center gap-3 p-3 rounded-xl ${ev.is_completed ? "opacity-50" : ""}`}>
                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${eventTypeColors[ev.event_type] || eventTypeColors.custom}`}>
                  {ev.event_type.replace("_", " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{ev.title}</p>
                  <p className="text-[9px] text-muted-foreground">{new Date(ev.starts_at).toLocaleString()}</p>
                </div>
                {ev.is_completed && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// FILES TAB
// ═══════════════════════════════════════════════════════

function FilesTab({ student, isAr }: { student: any; isAr: boolean }) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchData(); }, [student?.id]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("student_files")
      .select("*, uploader:profiles!student_files_uploaded_by_fkey (username)")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false });
    if (data) setFiles(data);
    setLoading(false);
  };

  const typeIcons: Record<string, any> = {
    submission: FileText,
    certificate: Award,
    report: BarChart3,
    resource: BookOpen,
    moderator_attachment: Paperclip,
    portfolio: FolderOpen,
  };
  const typeLabels: Record<string, string> = {
    submission: isAr ? "تقديم" : "Submission",
    certificate: isAr ? "شهادة" : "Certificate",
    report: isAr ? "تقرير" : "Report",
    resource: isAr ? "مورد" : "Resource",
    moderator_attachment: isAr ? "مرفق المشرف" : "Moderator Attachment",
    portfolio: isAr ? "محفظة" : "Portfolio",
  };

  const filtered = files.filter(f => filter === "all" || f.file_type === filter);

  if (loading) return <LoadingState />;

  return (
    <motion.div key="files" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <h2 className="text-lg font-black uppercase tracking-tight">{isAr ? "الملفات والمستندات" : "FILES & DOCUMENTS"}</h2>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          {isAr ? "الكل" : "ALL"}
        </button>
        {Object.keys(typeLabels).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${filter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {typeLabels[t]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={isAr ? "لا توجد ملفات" : "No files found"} />
      ) : (
        <div className="space-y-2">
          {filtered.map((f: any) => {
            const Icon = typeIcons[f.file_type] || FileText;
            return (
              <a
                key={f.id}
                href={f.file_url}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{f.file_name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {typeLabels[f.file_type]} • {new Date(f.created_at).toLocaleDateString()}
                    {f.uploader?.username && ` • ${f.uploader.username}`}
                  </p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </a>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// FEEDBACK TAB
// ═══════════════════════════════════════════════════════

function FeedbackTab({ student, isAr }: { student: any; isAr: boolean }) {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchData(); }, [student?.id]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_student_feedback", { p_student_id: student.id });
    if (data) setFeedbacks(data);
    setLoading(false);
  };

  const categoryColors: Record<string, string> = {
    assignment_review: "bg-blue-500/15 text-blue-500",
    exam_review: "bg-purple-500/15 text-purple-500",
    moderator_note: "bg-amber-500/15 text-amber-500",
  };
  const categoryLabels: Record<string, string> = {
    assignment_review: isAr ? "مراجعة مهمة" : "Assignment Review",
    exam_review: isAr ? "مراجعة اختبار" : "Exam Review",
    moderator_note: isAr ? "ملاحظة مشرف" : "Moderator Note",
  };

  const filtered = feedbacks.filter(f => {
    if (filter !== "all" && f.source !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!f.feedback_text?.toLowerCase().includes(q) && !f.lecture_title?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) return <LoadingState />;

  return (
    <motion.div key="feedback" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <h2 className="text-lg font-black uppercase tracking-tight">{isAr ? "ملاحظات المشرف" : "MODERATOR FEEDBACK"}</h2>

      <div className="flex gap-2 flex-wrap items-center">
        {["all", "assignment", "exam", "note"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {f === "all" ? (isAr ? "الكل" : "ALL") : categoryLabels[f]}
          </button>
        ))}
        <input
          type="text"
          placeholder={isAr ? "بحث..." : "Search..."}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-muted border border-border text-xs outline-none focus:border-primary ml-auto"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={isAr ? "لا توجد ملاحظات" : "No feedback found"} />
      ) : (
        <div className="space-y-3">
          {filtered.map((f: any) => (
            <div key={f.feedback_id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${categoryColors[f.category] || categoryColors.moderator_note}`}>
                    {categoryLabels[f.category] || f.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleString()}</span>
                </div>
                {f.grade !== null && (
                  <span className="text-sm font-black text-primary">{f.grade}%</span>
                )}
              </div>
              <p className="text-xs mb-2">{f.feedback_text}</p>
              <div className="flex flex-wrap gap-3 text-[9px] text-muted-foreground">
                {f.lecture_title && <span>{isAr ? "الدرس" : "Lesson"}: {f.lecture_title}</span>}
                {f.level_title && <span>{isAr ? "المستوى" : "Level"}: {f.level_title}</span>}
                {f.created_by_name && <span>{isAr ? "بواسطة" : "By"}: {f.created_by_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-20">
      <p className="text-sm text-muted-foreground font-bold">{message}</p>
    </div>
  );
}
