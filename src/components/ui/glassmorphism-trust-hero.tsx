import React from "react";
import {
  ArrowRight,
  Play,
  Target,
  Crown,
  Star,
  // Brand Icons
  Hexagon,
  Triangle,
  Command,
  Ghost,
  Gem,
  Cpu,
} from "lucide-react";
import { ScrambledText } from "../RainingXO";

// --- MOCK BRANDS ---
const CLIENTS = [
  { name: "Acme Corp", icon: Hexagon },
  { name: "Quantum", icon: Triangle },
  { name: "Command+Z", icon: Command },
  { name: "Phantom", icon: Ghost },
  { name: "Ruby", icon: Gem },
  { name: "Chipset", icon: Cpu },
];

// --- SUB-COMPONENTS ---
const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center p-3 rounded-2xl bg-muted/50 border border-border backdrop-blur-md">
    <span className="text-xl font-bold text-foreground">{value}</span>
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
      {label}
    </span>
  </div>
);

// --- MAIN COMPONENT ---
export default function HeroSection({ isAr = false }: { isAr?: boolean }) {
  const content = {
    en: {
      badge: "Award-Winning Design",
      headingLine1: "Crafting Digital",
      headingLine2: "Experiences",
      headingLine3: "That Matter",
      description:
        "We design interfaces that combine beauty with functionality, creating seamless experiences that users love and businesses thrive on.",
      ctaPrimary: "View Our Courses",
      ctaSecondary: "Watch Showreel",
      statsTitle: "Projects Delivered",
      clientSat: "Client Satisfaction",
      trustedBy: "Trusted by Industry Leaders",
      active: "ACTIVE",
      premium: "PREMIUM",
    },
    ar: {
      badge: "تصميم حائز على جوائز",
      headingLine1: "نصنع تجارب",
      headingLine2: "رقمية",
      headingLine3: "ذات قيمة",
      description:
        "نحن نصمم واجهات تجمع بين الجمال والوظيفة، مما يخلق تجارب سلسة يحبها المستخدمون وتزدهر بها الأعمال.",
      ctaPrimary: "عرض الأعمال",
      ctaSecondary: "شاهد العرض",
      statsTitle: "مشروع تم تسليمه",
      clientSat: "رضا العملاء",
      trustedBy: "موثوق به من قبل قادة الصناعة",
      active: "نشط",
      premium: "مميز",
    },
  };

  const t = isAr ? content.ar : content.en;

  const phrases = isAr
    ? ["نبتكر للمستقبل", "تصميم بلا حدود", "تقنية متطورة", "شريكك الرقمي"]
    : [
        "Innovating for Future",
        "Design without limits",
        "Advanced Technology",
        "Your Digital Partner",
      ];

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-[#030303] py-20 px-4 md:px-0">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-fade-in {
          animation: fadeSlideIn 0.8s ease-out forwards;
          opacity: 0;
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
      `}</style>

      {/* Background Image with Gradient Mask */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop"
          alt="Office background"
          className="w-full h-full object-cover opacity-20 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-transparent to-[#030303]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-transparent to-[#030303]" />
      </div>

      <div className="relative z-10 container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* --- LEFT COLUMN --- */}
          <div
            className={`flex flex-col space-y-8 animate-fade-in delay-100 ${isAr ? "text-right" : "text-left"}`}
          >
            {/* Badge */}
            <div className={`flex ${isAr ? "justify-end" : "justify-start"}`}>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-muted/50 border border-border backdrop-blur-md">
                <div className="flex -space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full bg-muted border border-border flex items-center justify-center"
                    >
                      <Star className="w-2 h-2 text-yellow-500 fill-yellow-500" />
                    </div>
                  ))}
                </div>
                <span className="text-xs font-medium text-white/80 uppercase tracking-widest">
                  {t.badge}
                </span>
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-[1.1] tracking-tight">
              {t.headingLine1} <br />
              <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-lime-400 bg-clip-text text-transparent">
                {t.headingLine2}
              </span>{" "}
              <br />
              {t.headingLine3}
            </h1>

            {/* Description & Scrambled Text */}
            <div className="space-y-4">
              <p className="max-w-lg text-lg text-muted-foreground leading-relaxed font-light">
                {t.description}
              </p>
              <div
                className={`h-8 flex items-center ${isAr ? "justify-end" : "justify-start"}`}
              >
                <ScrambledText
                  phrases={phrases}
                  className="text-emerald-400 font-mono text-sm tracking-widest uppercase"
                />
              </div>
            </div>

            {/* CTA Buttons */}
            <div
              className={`flex flex-wrap gap-4 pt-4 ${isAr ? "flex-row-reverse" : ""}`}
            >
              <button className="group relative flex items-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-full transition-all hover:pr-10">
                {t.ctaPrimary}
                <ArrowRight
                  className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isAr ? "rotate-180" : ""}`}
                />
              </button>

              <button className="flex items-center gap-2 px-8 py-4 bg-muted/50 text-foreground font-semibold rounded-full border border-border backdrop-blur-md transition-colors hover:bg-muted">
                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted">
                  <Play
                    className={`w-2.5 h-2.5 fill-white ml-0.5 ${isAr ? "rotate-180" : ""}`}
                  />
                </div>
                {t.ctaSecondary}
              </button>
            </div>
          </div>

          {/* --- RIGHT COLUMN --- */}
          <div className="relative group animate-fade-in delay-300">
            {/* Stats Card */}
            <div className="relative p-8 md:p-12 rounded-[40px] bg-muted/50 border border-border backdrop-blur-2xl shadow-2xl">
              {/* Card Glow Effect */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-green-500/20 rounded-full blur-[120px] pointer-events-none" />

              <div className="relative space-y-8">
                <div
                  className={`flex items-center gap-4 ${isAr ? "flex-row-reverse text-right" : ""}`}
                >
                  <div className="w-16 h-16 flex items-center justify-center rounded-3xl bg-emerald-500/20 border border-emerald-400/30">
                    <Target className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-foreground tracking-tight">
                      150+
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                      {t.statsTitle}
                    </p>
                  </div>
                </div>

                {/* Progress Bar Section */}
                <div className="space-y-3">
                  <div
                    className={`flex justify-between text-sm ${isAr ? "flex-row-reverse" : ""}`}
                  >
                    <span className="text-muted-foreground">{t.clientSat}</span>
                    <span className="text-white font-bold">98%</span>
                  </div>
                  <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border">
                    <div className="h-full w-[98%] bg-gradient-to-r from-emerald-500 to-lime-500 rounded-full" />
                  </div>
                </div>

                {/* Mini Stats Grid */}
                <div
                  className={`grid grid-cols-3 gap-3 ${isAr ? "flex-row-reverse" : ""}`}
                >
                  <StatItem value="12" label="Awards" />
                  <StatItem value="24" label="Experts" />
                  <StatItem value="9" label="Years" />
                </div>

                {/* Tag Pills */}
                <div className={`flex gap-3 ${isAr ? "justify-end" : ""}`}>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    {t.active}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-400">
                    <Crown className="w-3 h-3" />
                    {t.premium}
                  </span>
                </div>
              </div>
            </div>

            {/* Marquee Card */}
            <div className="mt-8 overflow-hidden rounded-3xl bg-muted/50 border border-border backdrop-blur-md py-6">
              <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
                {t.trustedBy}
              </p>
              <div className="relative flex overflow-hidden">
                <div className="flex animate-marquee gap-12 items-center whitespace-nowrap px-6">
                  {[...CLIENTS, ...CLIENTS, ...CLIENTS].map((client, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 group/brand cursor-default"
                    >
                      <client.icon className="w-6 h-6 text-muted-foreground group-hover/brand:text-white transition-colors" />
                      <span className="text-lg font-bold text-muted-foreground group-hover/brand:text-muted-foreground transition-colors uppercase tracking-tight">
                        {client.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
