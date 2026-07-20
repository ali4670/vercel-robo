import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "../../lib/supabase-code";
import { useLanguage } from "../../lib/LanguageContext";
import { useAuth } from "../../hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import {
  Play,
  CheckCircle2,
  Lock,
  MessageSquare,
  ShieldAlert,
  GraduationCap,
  ChevronDown,
  ArrowRight,
  Search,
  X,
} from "lucide-react";
import { HeroButton } from "../../funs/HeroButton";
import { AuthModal } from "../../components/AuthModal";
import { LogIn } from "lucide-react";

export const Route = createFileRoute("/levels/")({
  component: LevelsPage,
});

interface Level {
  id: string;
  title: string;
  level_order: number;
  image_url?: string;
  drip_interval_days: number;
}

interface Lecture {
  id: string;
  level_id: string;
  title: string;
  slot_number: number;
  is_live?: boolean;
  drip_days: number;
  is_big_exam: boolean;
  quiz_required: boolean;
}

interface Submission {
  lecture_id: string;
  total_grade: number | null;
  graded_at: string | null;
}

function LevelsPage() {
  const { isAr } = useLanguage();
  const { user, isApproved, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();
  const [levels, setLevels] = useState<Level[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [exams, setExams] = useState<{ level_id: string }[]>([]);
  const [progress, setProgress] = useState<string[]>([]);
  const [access, setAccess] = useState<{ level_id: string; granted_at: string }[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      let levelsQuery = supabase
        .from("levels")
        .select("*")
        .order("level_order", { ascending: true });

      if (!isAdmin && !isModerator) {
        levelsQuery = levelsQuery.eq("is_published", true);
      }

      const [levelsRes, lecturesRes, examsRes] = await Promise.all([
        levelsQuery,
        supabase
          .from("lectures")
          .select("*")
          .order("slot_number", { ascending: true }),
        supabase.from("exams").select("level_id"),
      ]);

      if (levelsRes.data) setLevels(levelsRes.data);
      if (lecturesRes.data) setLectures(lecturesRes.data);
      setExams(examsRes.data || []);

      if (user) {
        const [progressRes, accessRes, submissionsRes] = await Promise.all([
          supabase
            .from("student_progress")
            .select("lecture_id")
            .eq("student_id", user.id),
          supabase
            .from("level_access")
            .select("level_id, granted_at")
            .eq("user_id", user.id),
          supabase
            .from("exam_submissions")
            .select("lecture_id, total_grade, graded_at")
            .eq("student_id", user.id),
        ]);

        if (progressRes.data)
          setProgress(progressRes.data.map((p) => p.lecture_id));
        setAccess(accessRes.data || []);
        setSubmissions(submissionsRes.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, isModerator]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const getDripUnlockDate = (levelId: string, slotNumber: number) => {
    const accessInfo = access.find((a) => a.level_id === levelId);
    if (!accessInfo) return null;

    const grantedAt = new Date(accessInfo.granted_at);
    const level = levels.find((l) => l.id === levelId);
    const interval = level?.drip_interval_days ?? 7;

    // slot_number starts from 1. Module 1 is immediate (Day 0).
    const daysToAdd = (slotNumber - 1) * interval;
    const unlockDate = new Date(grantedAt);
    unlockDate.setDate(unlockDate.getDate() + daysToAdd);
    return unlockDate;
  };

  const isLectureUnlocked = (lecture: Lecture) => {
    if (isAdmin || isModerator) return true;

    // 1. Time-based Drip Check
    const unlockDate = getDripUnlockDate(lecture.level_id, lecture.slot_number);
    if (!unlockDate || unlockDate > new Date()) return false;

    // 2. Sequential Exam Prerequisite
    if (lecture.slot_number > 1) {
      const prevLecture = lectures.find(
        (l) => l.level_id === lecture.level_id && l.slot_number === lecture.slot_number - 1
      );
      if (prevLecture) {
        const isPrevCompleted = progress.includes(prevLecture.id);
        const submission = submissions.find((s) => s.lecture_id === prevLecture.id);
        const isExamPassed = submission && submission.total_grade !== null && submission.total_grade >= 50; // Assuming 50 is passing

        if (!isPrevCompleted || (prevLecture.quiz_required && !isExamPassed)) {
          return false;
        }
      }
    }

    return true;
  };

  const isLevelAccessible = (level: Level) => {
    if (isAdmin || isModerator) return true;
    if (access.some((a) => a.level_id === level.id)) return true;
    return level.level_order === 1 && isApproved;
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-3 md:p-6 pb-24 md:pb-20 relative overflow-hidden font-sans">
      <div className="fixed inset-0 bg-background z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-muted blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-muted/50 blur-[100px] rounded-full"></div>
      </div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-10 opacity-20"></div>

      <div className="container mx-auto max-w-5xl relative z-10 pt-4 md:pt-8">
        <header className="mb-6 md:mb-12 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-4xl lg:text-6xl font-black italic tracking-tighter mb-2 md:mb-3 uppercase"
          >
            {isAr ? "مسار المهمات" : "MISSION TRACK"}
          </motion.h1>
          <div className="flex items-center justify-center gap-6 text-muted-foreground">
            <div className="h-[1px] w-20 bg-muted" />
            <p className="font-black uppercase tracking-[0.5em] text-[10px] italic">
              {isAr ? "النظام جاهز للتشغيل" : "SYSTEM OPERATIONAL"}
            </p>
            <div className="h-[1px] w-20 bg-muted" />
          </div>
        </header>

        {/* Sign-in prompt for guests */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 md:mb-8 p-4 md:p-5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <LogIn className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-bold text-foreground text-center sm:text-left">
                {isAr
                  ? "سجّل دخولك للوصول إلى جميع الدورات والمحتوى التعليمي"
                  : "Sign in to access all courses and learning content"}
              </p>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-primary text-background text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/15 active:scale-95 transition-all"
            >
              {isAr ? "تسجيل الدخول" : "Sign In"}
            </button>
          </motion.div>
        )}

        {/* Search + Module Picker */}
        <div className="mb-6 md:mb-8 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? "ابحث عن محاضرة..." : "Search lectures..."}
              className="w-full bg-muted/50 border border-border rounded-xl md:rounded-2xl py-3 md:py-4 pl-10 md:pl-12 pr-10 md:pr-12 text-sm font-bold outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Module chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedLevelId(null)}
              className={`shrink-0 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border transition-all ${
                selectedLevelId === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              {isAr ? "الكل" : "ALL"}
            </button>
            {levels
              .filter((l) => isLevelAccessible(l))
              .map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevelId(selectedLevelId === level.id ? null : level.id)}
                  className={`shrink-0 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border transition-all ${
                    selectedLevelId === level.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  {level.title}
                </button>
              ))}
          </div>
        </div>

        <div className="space-y-6 md:space-y-10">
          {levels
            .filter((level) => {
              if (selectedLevelId && level.id !== selectedLevelId) return false;
              return isLevelAccessible(level);
            })
            .map((level) => {
              const levelLectures = lectures
                .filter((l) => {
                  const belongsToLevel = l.level_id === level.id;
                  const canSee = l.is_live !== false || isAdmin || isModerator;
                  const matchesSearch = !searchQuery || l.title.toLowerCase().includes(searchQuery.toLowerCase());
                  return belongsToLevel && canSee && matchesSearch;
                })
                .sort((a, b) => a.slot_number - b.slot_number);
              const hasExam = exams.some((e) => e.level_id === level.id);
              const completedCount = levelLectures.filter((l) =>
                progress.includes(l.id),
              ).length;

              if (levelLectures.length === 0) return null;

              return (
                <motion.section
                  key={level.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className={`relative bg-muted backdrop-blur-xl border border-border rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 overflow-hidden shadow-2xl transition-all duration-500`}
                >
                  <>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4 mb-4 md:mb-6">
                      <div className="flex items-end gap-3 md:gap-4">
                        <div className="text-4xl md:text-6xl lg:text-8xl font-black italic text-muted-foreground/20 leading-none select-none">
                          {String(level.level_order).padStart(2, "0")}
                        </div>
                        <div className="mb-2 text-left">
                          <h2 className="text-lg md:text-2xl lg:text-3xl font-black italic uppercase tracking-tight text-foreground">
                            {level.title}
                          </h2>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                              {levelLectures.length} {isAr ? "وحدة مفعلة" : "LIVE UNITS"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-64">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-foreground">
                            {Math.round(
                              (completedCount / (levelLectures.length || 1)) * 100,
                            )}
                            %
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(completedCount / (levelLectures.length || 1)) * 100}%`,
                            }}
                            className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {levelLectures.map((lecture, lectureIndex) => {
                        const isCompleted = progress.includes(lecture.id);
                        const isUnlocked = isLectureUnlocked(lecture);
                        const unlockDate = getDripUnlockDate(lecture.level_id, lecture.slot_number);

                        return (
                          <div
                            key={lecture.id}
                            className={`group h-full block ${!isUnlocked ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <Link
                              to={isUnlocked ? `/lecture/${lecture.id}` : "#"}
                              disabled={!isUnlocked}
                              className={`h-full block`}
                            >
                              <div
                                className={`h-full p-4 md:p-6 rounded-xl md:rounded-2xl border transition-all duration-300 ${
                                  !isUnlocked
                                    ? "bg-foreground/10 border-border"
                                    : isCompleted
                                      ? "bg-muted border-border"
                                      : "bg-muted/50 border-border hover:border-border"
                                }`}
                              >
                                <div className="flex justify-between items-start mb-6">
                                  <div
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
                                      !isUnlocked
                                        ? "bg-muted/50 text-muted-foreground/30 border-border"
                                        : isCompleted
                                          ? "bg-white text-emerald-600 border-white"
                                          : "bg-muted/50 border-border text-muted-foreground"
                                    }`}
                                  >
                                    {!isUnlocked ? (
                                      <Lock className="w-6 h-6" />
                                    ) : isCompleted ? (
                                      <CheckCircle2 className="w-6 h-6" />
                                    ) : (
                                      <Play className="w-6 h-6" />
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}
                                  >
                                    {!isUnlocked
                                      ? unlockDate?.toLocaleDateString()
                                      : isCompleted
                                        ? "SYNCED"
                                        : (lecture.is_live === false
                                          ? (isAr ? "مسودة" : "DRAFT")
                                          : (isAr ? "وحدة " : "UNIT ") + lecture.slot_number)}
                                  </span>
                                </div>
                                <h3 className="font-black text-sm uppercase tracking-wider mb-2 text-left flex items-center gap-2">
                                  {lecture.title}
                                  {!isUnlocked && (
                                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                      LOCKED
                                    </span>
                                  )}
                                  {lecture.is_live === false && (isAdmin || isModerator) && (
                                    <span className="bg-red-500 text-foreground text-[8px] px-2 py-0.5 rounded-full">
                                      OFFLINE
                                    </span>
                                  )}
                                </h3>
                                {lecture.is_big_exam && (
                                  <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-400">
                                    <GraduationCap className="w-3 h-3" />
                                    {isAr ? "اختبار شامل" : "BIG EXAM"}
                                  </div>
                                )}
                                {isUnlocked && (
                                  <div className="mt-4 flex justify-end">
                                    <Link
                                      to={`/lecture/${lecture.id}`}
                                      search={{ tab: "chat" }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all"
                                      title={isAr ? "محادثة الدرس" : "Lecture Chat"}
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                    </Link>
                                  </div>
                                )}
                              </div>
                            </Link>
                          </div>
                        );
                      })}

                      <div className="md:col-span-full mt-3 flex flex-col sm:flex-row gap-2 md:gap-3">
                        <Link
                          to="/levels/classroom/$levelId"
                          params={{ levelId: level.id }}
                          className={`flex-1`}
                        >
                          <HeroButton className="w-full bg-white text-black h-10 md:h-12 rounded-xl md:rounded-2xl uppercase font-black tracking-widest italic flex items-center justify-center gap-2 text-[10px] md:text-xs">
                            <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
                            {isAr ? "دخول غرفة المحادثة" : "ENTER CLASSROOM"}
                          </HeroButton>
                        </Link>
                        {hasExam && (
                          <Link to={`/exam/${level.id}`} className={`flex-1`}>
                            <HeroButton className="w-full bg-muted border-border text-foreground h-10 md:h-12 rounded-xl md:rounded-2xl uppercase font-black tracking-widest italic flex items-center justify-center gap-2 text-[10px] md:text-xs">
                              <GraduationCap className="w-5 h-5" />
                              {isAr ? "بدء الاختبار" : "INITIATE EXAM"}
                            </HeroButton>
                          </Link>
                        )}
                      </div>
                    </div>
                  </>
                </motion.section>
              );
            })}
          {levels.filter((l) => isLevelAccessible(l)).length > 0 && searchQuery && (
            <div className="text-center py-12 md:py-20">
              <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-bold text-sm">
                {isAr ? "لا توجد نتائج" : "No lectures found"}
              </p>
            </div>
          )}
        </div>
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
