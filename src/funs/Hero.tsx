import React from "react";
import { motion } from "framer-motion";
import {
  Gamepad2,
  Zap,
  Globe,
  Target,
  Crown,
  Star,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { HeroButton } from "./HeroButton";
import { ScrambledText, RainingXO } from "../components/RainingXO";
import { Link } from "@tanstack/react-router";

export const Hero: React.FC = () => {
  const { isAr } = useLanguage();

  const phrases = isAr
    ? ["نبتكر للمستقبل", "تحدي بلا حدود", "تقنية متطورة", "شريكك في اللعب"]
    : [
        "Innovating the Future",
        "Gaming without limits",
        "Advanced Tactical OS",
        "Your Mission Partner",
      ];

  const t = {
    badge: isAr ? "نظام معتمد v4.0" : "Certified OS v4.0",
    headingLine1: isAr ? "مركز" : "Mission",
    headingLine2: isAr ? "التحكم" : "Control",
    headingLine3: isAr ? "التكتيكي" : "System",
    description: isAr
      ? "نحن نصمم واجهات تجمع بين الجمال والوظيفة، مما يخلق تجارب سلسة يحبها اللاعبون وتزدهر بها المنافسة."
      : "We design interfaces that combine beauty with functionality, creating seamless experiences that players love and competition thrives on.",
    ctaPrimary: isAr ? "ابدأ اللعب" : "Deploy to Arena",
    ctaSecondary: isAr ? "استكشف المهام" : "View Missions",
    statsTitle: isAr ? "تحدي تم إكماله" : "Challenges Completed",
    clientSat: isAr ? "رضا المستخدمين" : "User Satisfaction",
    active: isAr ? "نشط" : "ACTIVE",
    premium: isAr ? "مميز" : "PREMIUM",
    scroll: isAr ? "انزل لأسفل" : "Scroll to deploy",
  };

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-[#030303]">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <RainingXO />
        <img
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop"
          alt="Office background"
          className="w-full h-full object-cover opacity-10 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-transparent to-[#030303]" />
      </div>

      {/* Floating Animated Shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />

      <div className="relative z-10 container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* LEFT COLUMN */}
          <div
            className={`flex flex-col space-y-8 ${isAr ? "text-right" : "text-left"}`}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isAr ? "justify-end" : "justify-start"}`}
            >
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-muted/50 border border-border backdrop-blur-md">
                <Zap className="w-3 h-3 text-lime-400 fill-lime-400" />
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">
                  {t.badge}
                </span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.9]"
            >
              {t.headingLine1} <br />
              <span className="text-lime-500">{t.headingLine2}</span> <br />
              {t.headingLine3}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <p className="max-w-lg text-lg text-muted-foreground leading-relaxed font-light">
                {t.description}
              </p>
              <div
                className={`h-8 flex items-center ${isAr ? "justify-end" : "justify-start"}`}
              >
                <ScrambledText
                  phrases={phrases}
                  className="text-lime-400 font-mono text-xs tracking-[0.3em] uppercase"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`flex flex-wrap gap-4 pt-4 ${isAr ? "flex-row-reverse" : ""}`}
            >
              <HeroButton
                size="xl"
                variant="secondary"
                onClick={() =>
                  document
                    .getElementById("arena-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <Gamepad2 className="w-5 h-5" />
                {t.ctaPrimary}
              </HeroButton>

              <Link to="/levels">
                <HeroButton size="xl" variant="outline" className="w-full">
                  <BookOpen className="w-5 h-5" />
                  {isAr ? "الدورات التعليمية" : "Educational Courses"}
                </HeroButton>
              </Link>

              <HeroButton
                size="xl"
                variant="outline"
                onClick={() =>
                  document
                    .getElementById("missions-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <Globe className="w-5 h-5" />
                {t.ctaSecondary}
              </HeroButton>
            </motion.div>
          </div>

          {/* RIGHT COLUMN - DESKTOP */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative group hidden lg:block"
          >
            <div className="relative p-12 rounded-[64px] bg-muted/30 border border-border backdrop-blur-3xl shadow-2xl">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-lime-500/20 rounded-full blur-[120px] pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />

              <div className="relative space-y-10">
                {/* Employee of the Month Card */}
                <div
                  className={`p-6 rounded-3xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center gap-4 ${isAr ? "flex-row-reverse text-right" : ""}`}
                >
                  <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center border-2 border-yellow-500/40">
                    <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-black italic uppercase tracking-tighter">
                      alikilerahmed
                    </h4>
                    <p className="text-yellow-400 text-[10px] font-black uppercase tracking-widest">
                      Employee of the Month
                    </p>
                    <p className="text-muted-foreground text-[8px] font-bold uppercase tracking-widest">
                      WORLD CHAMPION
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-6 ${isAr ? "flex-row-reverse text-right" : ""}`}
                >
                  <div className="w-20 h-20 flex items-center justify-center rounded-[32px] bg-lime-500/20 border border-lime-400/30">
                    <Target className="w-10 h-10 text-lime-400" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-foreground italic tracking-tighter uppercase">
                      2.4M+
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
                      {t.statsTitle}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div
                    className={`flex justify-between text-[10px] font-black uppercase tracking-widest ${isAr ? "flex-row-reverse" : ""}`}
                  >
                    <span className="text-muted-foreground">{t.clientSat}</span>
                    <span className="text-lime-500">99.9%</span>
                  </div>
                  <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "99.9%" }}
                      transition={{ duration: 2, delay: 1 }}
                      className="h-full bg-gradient-to-r from-lime-500 to-emerald-500 rounded-full"
                    />
                  </div>
                </div>

                <div
                  className={`grid grid-cols-3 gap-4 ${isAr ? "flex-row-reverse" : ""}`}
                >
                  {[
                    { v: "150", l: "Levels" },
                    { v: "42", l: "Units" },
                    { v: "24/7", l: "Ops" },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center p-4 rounded-3xl bg-muted/50 border border-border backdrop-blur-md"
                    >
                      <span className="text-lg font-black text-foreground italic">
                        {stat.v}
                      </span>
                      <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-black">
                        {stat.l}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={`flex gap-3 ${isAr ? "justify-end" : ""}`}>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] font-black text-green-400 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    {t.active}
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[9px] font-black text-yellow-400 uppercase tracking-widest">
                    <Crown className="w-3.5 h-3.5" />
                    {t.premium}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN - MOBILE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative group lg:hidden mt-8"
          >
            <div className="p-6 rounded-3xl bg-muted/30 border border-border backdrop-blur-3xl">
              {/* Employee of the Month Card (Simplified) */}
              <div
                className={`p-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center gap-3 ${isAr ? "flex-row-reverse text-right" : ""}`}
              >
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/40">
                  <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                </div>
                <div>
                  <h4 className="text-white text-sm font-black italic uppercase">
                    alikilerahmed
                  </h4>
                  <p className="text-yellow-400 text-[9px] font-black uppercase">
                    Employee of the Month
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-12 flex flex-col items-center gap-2 text-muted-foreground z-20"
      >
        <span className="text-[10px] font-black uppercase tracking-widest">
          {t.scroll}
        </span>
        <ChevronDown className="w-4 h-4" />
      </motion.div>
    </section>
  );
};
