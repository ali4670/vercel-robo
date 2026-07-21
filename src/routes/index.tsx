import { createFileRoute, Link } from "@tanstack/react-router";
import TicTacToeGame from "../components/TicTacToeGame";
import { FriendSearch } from "../components/FriendSearch";
import { Leaderboard } from "../components/Leaderboard";
import { RainingXO, ScrambledText } from "../components/RainingXO";
import { ProfileEdit } from "../components/ProfileEdit";
import { AdvancedTodo } from "../components/todo/AdvancedTodo";
import { useLanguage } from "../lib/LanguageContext";
import { useAuth } from "../hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Gamepad2,
  X,
  Check,
  ArrowUpRight,
  Cpu,
  Code2,
  Brain,
  ArrowRight,
} from "lucide-react";
import { supabase } from "../lib/supabase-code";
import { toast } from "sonner";
import { Component as NewHero } from "../components/ui/hero";
import { HeroButton } from "../funs/HeroButton";
import { SpotlightCard } from "../components/SpotlightCard";

export const Route = createFileRoute("/")({
  component: Index,
});

interface Level {
  id: string;
  title: string;
  level_order: number;
  image_url?: string;
  is_published: boolean;
}

function Index() {
  const { isAr } = useLanguage();
  const { user } = useAuth();
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [activeOnlineGame, setActiveOnlineGame] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [spotlight, setSpotlight] = useState<any>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<{
    id: string;
    player_x: string;
    challengerName: string;
  } | null>(null);

  useEffect(() => {
    setIsClient(true);
    fetchLevels();
    fetchSpotlight();
  }, []);

  const fetchLevels = async () => {
    const { data } = await supabase
      .from("level_templates")
      .select("id, title, description, image_url, level_order, is_published, drip_interval_days")
      .eq("is_published", true)
      .order("level_order", { ascending: true });
    if (data) setLevels(data);
  };

  const fetchSpotlight = async () => {
    const { data } = await supabase
      .from("spotlight")
      .select("*, profiles(username)")
      .single();
    if (data) setSpotlight(data);
  };

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_challenges_${user.id}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          table: "games",
          filter: `player_o=eq.${user.id}`,
        },
        async (payload: any) => {
          const { data: challenger } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", payload.new.player_x)
            .single();

          setIncomingChallenge({
            id: payload.new.id,
            player_x: payload.new.player_x,
            challengerName: challenger?.username || "Unknown",
          });
        },
      )
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          table: "games",
          filter: `player_x=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new.status === "active") {
            setActiveOnlineGame(payload.new.id);
            toast.success(isAr ? "تم قبول التحدي!" : "Challenge accepted!");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAr]);

  const acceptChallenge = async () => {
    if (!incomingChallenge) return;
    try {
      const { error } = await supabase
        .from("games")
        .update({ status: "active" })
        .eq("id", incomingChallenge.id);

      if (error) throw error;
      setActiveOnlineGame(incomingChallenge.id);
      setIncomingChallenge(null);
    } catch (err) {
      if (err instanceof Error) toast.error(err.message);
    }
  };

  if (!isClient) {
    return <div className="bg-background min-h-screen" />;
  }

  return (
    <main className="bg-background flex flex-col relative overflow-x-hidden text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,oklch(0.98_0.01_140/0.05)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.98_0.01_140/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0"></div>

      {/* Hero Section */}
      <div id="hero-section" className="relative">
        <NewHero />
      </div>

      {/* Mission Section */}
      <section className="py-8 md:py-16 relative bg-card/20 overflow-hidden border-y border-border flex flex-col items-center justify-center min-h-[20vh] md:min-h-[30vh]">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="text-center px-4 md:px-6 relative z-10"
        >
          <motion.h2
            className="text-2xl md:text-4xl lg:text-6xl font-black tracking-tighter italic mb-3 md:mb-4"
            style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
          >
            <ScrambledText
              phrases={
                isAr
                  ? [
                      "نحن نصنع المستقبل",
                      "نحن نبني الروبوتات",
                      "نحن نصنع التغيير",
                    ]
                  : [
                      "WE BUILD THE FUTURE",
                      "WE BUILD ROBOTS",
                      "WE BUILD CHANGE",
                    ]
              }
            />
          </motion.h2>
          <p className="text-muted-foreground text-xs md:text-sm font-black uppercase tracking-[0.3em]">
            {isAr
              ? "دورة الروبوتات للأعمار 7-13"
              : "Robotics Excellence for Ages 7-13"}
          </p>
        </motion.div>

        {/* Background Decorative Element */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-[800px] h-[800px] bg-primary rounded-full blur-[150px] animate-pulse" />
        </div>
      </section>

      {/* Arena Section */}
      <section
        id="arena-section"
        className="py-12 md:py-24 px-4 md:px-6 bg-background relative overflow-hidden border-t border-border"
      >
        {/* Raining X and O Background */}
        <div className="absolute inset-0 opacity-10">
          <RainingXO />
        </div>

        {/* Global Glowing Accents */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-chart-3/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between mb-8 md:mb-16 gap-4 md:gap-6">
            <div className="text-left">
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="text-3xl md:text-5xl lg:text-7xl font-black italic tracking-tighter leading-none mb-3"
              >
                {isAr ? "الدورات" : "OUR COURSES"}
              </motion.h2>
              <div className="flex items-center gap-4">
                <div className="h-0.5 w-12 bg-primary" />
                <p className="text-primary font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-[8px] md:text-[10px]">
                  {isAr
                    ? "مسارات المهندسين المبدعين"
                    : "Architecting the next generation of engineers"}
                </p>
              </div>
            </div>
            <Link to="/levels">
              <HeroButton
                variant="outline"
                className="border-border text-muted-foreground hover:text-foreground px-8 h-14 rounded-2xl"
              >
                {isAr ? "عرض كل المستويات" : "ACCESS ALL SECTORS"}
              </HeroButton>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {levels.map((level, idx) => (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Link
                  to="/levels"
                  className="group relative block aspect-[3/4] rounded-2xl md:rounded-3xl overflow-hidden border border-border bg-card hover:border-primary/30 transition-all duration-500 shadow-2xl"
                >
                  {/* Image with Parallax-like effect on hover */}
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
                    <img
                      src={
                        level.image_url ||
                        "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800"
                      }
                      className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-700 grayscale group-hover:grayscale-0"
                      alt={level.title}
                    />
                  </div>

                  {/* Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80" />
                  <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors" />

                  {/* Content */}
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 flex flex-col justify-end h-full">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <div className="flex items-center gap-3 mb-3 md:mb-4">
                        <span className="px-2 md:px-3 py-1 bg-primary text-primary-foreground text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-[0_0_20px_rgba(var(--primary),0.3)]">
                          {isAr
                            ? `المستوى ${level.level_order}`
                            : `UNIT-${String(level.level_order).padStart(2, "0")}`}
                        </span>
                        <div className="h-[1px] flex-1 bg-border" />
                      </div>
                      <h3 className="text-xl md:text-3xl font-black italic uppercase text-foreground tracking-tighter leading-tight mb-2 group-hover:text-primary transition-colors">
                        {level.title}
                      </h3>
                      <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">
                          {isAr ? "جاهز للبدء" : "READY FOR UPLOAD"}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center border border-border">
                          <ArrowUpRight className="w-5 h-5 text-foreground" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
            {levels.length === 0 && (
              <div className="col-span-full py-16 md:py-32 flex flex-col items-center justify-center gap-4 md:gap-6 border border-dashed border-border rounded-2xl md:rounded-4xl bg-card">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground font-black uppercase tracking-[0.5em] text-xs italic">
                  {isAr
                    ? "جاري مزامنة بيانات الدورات الاستراتيجية..."
                    : "SYNCING STRATEGIC COURSE DATA..."}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        id="missions-section"
        className="py-12 md:py-24 px-4 md:px-6 bg-muted/50 relative overflow-hidden border-y border-border"
      >
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-3 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-4 md:mb-6">
                <span className="text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em]">
                  {isAr ? "مجالات الخبرة" : "EXPERT DOMAINS"}
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl lg:text-7xl font-black italic tracking-[calc(-0.05em)] mb-4 md:mb-6 uppercase leading-[0.85] text-foreground">
                {isAr ? "الخدمات الجوهرية" : "CORE SERVICES"}
              </h2>
              <p className="text-muted-foreground font-bold uppercase tracking-[0.3em] md:tracking-[0.4em] text-[9px] md:text-[10px] mb-6 md:mb-8">
                {isAr
                  ? "تطوير الكفاءات التقنية المتقدمة"
                  : "ADVANCING TECHNICAL COMPETENCY AT SCALE"}
              </p>
              <div className="h-1 w-20 bg-primary/30 rounded-full"></div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              {[
                {
                  t: isAr ? "بناء الروبوتات" : "ROBOTICS CONSTRUCTION",
                  d: isAr
                    ? "تعلم هندسة الميكاترونيكس من الصفر"
                    : "Master mechatronics from the ground up",
                  icon: <Cpu className="w-6 h-6" />,
                  tag: "MECHATRONICS",
                },
                {
                  t: isAr ? "برمجة الأنظمة" : "SYSTEM CODING",
                  d: isAr
                    ? "إتقان لغات البرمجة المتقدمة"
                    : "Advanced software architectural training",
                  icon: <Code2 className="w-6 h-6" />,
                  tag: "ARCHITECTURE",
                },
                {
                  t: isAr ? "الذكاء الاصطناعي" : "NEURAL AI",
                  d: isAr
                    ? "تطوير عقول روبوتية ذكية"
                    : "Developing autonomous robotic intelligence",
                  icon: <Brain className="w-6 h-6" />,
                  tag: "COGNITIVE",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className="p-1 rounded-[2.5rem] bg-primary/5 border border-border hover:border-primary/40 transition-all duration-700 group"
                >
                  <div className="bg-card/60 backdrop-blur-3xl p-4 md:p-6 rounded-2xl md:rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                    <div className="flex items-center gap-4 md:gap-6 text-center md:text-left flex-col md:flex-row">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 shadow-2xl">
                        {s.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 md:gap-3 mb-2 justify-center md:justify-start">
                          <span className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                            {s.tag}
                          </span>
                          <div className="h-px w-6 bg-border"></div>
                        </div>
                        <h3 className="text-lg md:text-xl font-black italic tracking-tighter text-foreground uppercase leading-none">
                          {s.t}
                        </h3>
                        <p className="text-muted-foreground font-medium mt-2 text-xs md:text-sm">
                          {s.d}
                        </p>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shrink-0">
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Missions Tracker Section */}
      <section className="py-12 md:py-20 px-4 md:px-6 bg-card backdrop-blur-sm border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-5xl font-black italic uppercase tracking-tighter mb-2 md:mb-3">
              {isAr ? "متتبع المهمات" : "MISSION CONTROL"}
            </h2>
            <p className="text-muted-foreground text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em]">
              {isAr
                ? "تحكم في أهدافك اليومية"
                : "Command your daily objectives"}
            </p>
          </div>
          <AdvancedTodo />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-auto">
        {/* ── Desktop Footer (md+) ── */}
        <div className="hidden md:block py-12 px-8">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-4 gap-8 text-left">
              {/* Brand */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo-2026, 12_38_18 PM.png"
                    alt="ST-Company Logo"
                    className="w-28 h-20 rounded-full object-cover border-2 border-border shadow-lg p-0.5 bg-card"
                  />
                  <div>
                    <h3 className="text-2xl font-black italic tracking-tighter text-foreground">
                      ST<span className="text-primary">-</span>COMPANY<span className="text-primary">.</span>
                    </h3>
                  </div>
                </div>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                  {isAr ? "نحن نبني المستقبل" : "ENGINEERING THE UNKNOWN"}
                </p>
              </div>

              {/* Links */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">
                  {isAr ? "الروابط" : "NAVIGATION"}
                </h4>
                <nav className="flex flex-col gap-2">
                  {["Levels", "Profile"].map((link) => (
                    <Link
                      key={link}
                      to={`/${link.toLowerCase()}` as any}
                      className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Socials */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">
                  {isAr ? "تواصل" : "CONNECT"}
                </h4>
                <div className="flex gap-3">
                  {["IG", "TW", "LI", "FB"].map((s) => (
                    <button
                      key={s}
                      className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-[10px] font-black hover:bg-primary hover:text-background transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Copyright */}
              <div className="text-muted-foreground text-[9px] font-black uppercase tracking-widest flex flex-col justify-end gap-1">
                <p>© 2026 ST-COMPANY CORP.</p>
                <p>
                  Designed by{" "}
                  <a
                    href="https://www.instagram.com/aliahmed.sabry/"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    Ali El-hwashy
                  </a>
                </p>
                <div className="flex gap-2 text-[8px]">
                  <a
                    href="https://www.instagram.com/aliahmed.sabry/"
                    target="_blank"
                    className="hover:text-primary"
                  >
                    INSTAGRAM
                  </a>
                  <a
                    href="https://www.tiktok.com/@_codebyali"
                    target="_blank"
                    className="hover:text-primary"
                  >
                    TIKTOK
                  </a>
                </div>
                <p className="mt-1 opacity-50">
                  ALL RIGHTS RESERVED // UNIT-ST-OS
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile Footer ── */}
        <div className="md:hidden">
          {/* Brand + tagline */}
          <div className="px-5 pt-8 pb-6">
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/logo-2026, 12_38_18 PM.png"
                alt="ST-Company Logo"
                className="w-12 h-12 rounded-2xl object-cover border border-border bg-card"
              />
              <div>
                <h3 className="text-lg font-black italic tracking-tighter text-foreground">
                  ST<span className="text-primary">-</span>COMPANY<span className="text-primary">.</span>
                </h3>
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                  {isAr ? "نحن نبني المستقبل" : "ENGINEERING THE UNKNOWN"}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation pills */}
          <div className="px-5 pb-6">
            <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">
              {isAr ? "الروابط" : "NAVIGATION"}
            </h4>
            <div className="flex flex-wrap gap-2">
              {[
                { link: "Levels", label: isAr ? "الدورات" : "Courses" },
                { link: "Profile", label: isAr ? "الملف" : "Profile" },
              ].map((item) => (
                <Link
                  key={item.link}
                  to={`/${item.link.toLowerCase()}` as any}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Social row */}
          <div className="px-5 pb-6">
            <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">
              {isAr ? "تواصل" : "CONNECT"}
            </h4>
            <div className="flex gap-2">
              {["IG", "TW", "LI", "FB"].map((s) => (
                <button
                  key={s}
                  className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center text-[10px] font-black text-muted-foreground hover:bg-primary hover:text-background hover:border-primary transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="px-5 py-5 border-t border-border bg-background/50">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                © 2026 ST-COMPANY CORP.
              </p>
              <p className="text-[9px] font-bold text-muted-foreground">
                {isAr ? "تصميم" : "Designed by"}{" "}
                <a
                  href="https://www.instagram.com/aliahmed.sabry/"
                  target="_blank"
                  className="text-primary"
                >
                  Ali El-hwashy
                </a>
              </p>
              <div className="flex gap-3 text-[8px] font-bold uppercase tracking-wider">
                <a
                  href="https://www.instagram.com/aliahmed.sabry/"
                  target="_blank"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Instagram
                </a>
                <a
                  href="https://www.tiktok.com/@_codebyali"
                  target="_blank"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  TikTok
                </a>
              </div>
              <p className="text-[7px] text-muted-foreground/50 font-bold uppercase tracking-widest mt-1">
                ALL RIGHTS RESERVED // UNIT-ST-OS
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Challenge Modal */}
      <AnimatePresence>
        {incomingChallenge && (
          <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-[320px] z-[150]">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-card/90 border border-border backdrop-blur-2xl rounded-2xl md:rounded-4xl p-4 md:p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.4)]">
                  <Gamepad2 className="w-5 h-5 md:w-6 md:h-6 text-background" />
                </div>
                <div>
                  <h4 className="text-foreground font-bold">
                    {isAr ? "تحدي جديد!" : "New Challenge!"}
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    {incomingChallenge.challengerName}{" "}
                    {isAr ? "يدعوك للعب" : "invited you to play"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={acceptChallenge}
                  className="flex-1 py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  {isAr ? "قبول" : "Accept"}
                </button>
                <button
                  onClick={() => setIncomingChallenge(null)}
                  className="px-4 py-3 bg-muted border border-border text-foreground rounded-2xl hover:bg-border active:scale-95 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ProfileEdit
        isOpen={isProfileEditOpen}
        onClose={() => setIsProfileEditOpen(false)}
      />
    </main>
  );
}
