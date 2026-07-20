import React, { useState } from "react";
import { supabase } from "../lib/supabase-code";
import { useLanguage } from "../lib/LanguageContext";
import { X, Mail, Lock, Loader2, ArrowRight, Phone, User, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface HeroAuthProps {
  onClose: () => void;
}

export const HeroAuth: React.FC<HeroAuthProps> = ({ onClose }) => {
  const { isAr } = useLanguage();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedRole, setSelectedRole] = useState<"student" | "parent">("student");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        toast.success(isAr ? "تم إرسال رابط استعادة كلمة المرور" : "Reset link sent to your email");
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(isAr ? "مرحباً بك مرة أخرى!" : "Welcome back!");
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: fullName || email.split("@")[0],
              phone_number: phoneNumber,
              role: selectedRole,
            },
          },
        });
        if (error) throw error;
        toast.success(isAr ? "تم إنشاء الحساب! تحقق من بريدك" : "Account created! Check your email");
        onClose();
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const t = {
    loginTitle: isAr ? "مرحباً بعودتك" : "Welcome back",
    registerTitle: isAr ? "انضم إلينا" : "Create account",
    forgotTitle: isAr ? "استعادة الحساب" : "Reset password",
    loginSubtitle: isAr ? "ادخل للعب مع أصدقائك" : "Sign in to continue learning",
    registerSubtitle: isAr ? "أنشئ حساباً لبدء المنافسة" : "Start your learning journey",
    forgotSubtitle: isAr ? "أدخل بريدك الإلكتروني لاستلام الرابط" : "We'll send you a reset link",
    email: isAr ? "البريد الإلكتروني" : "Email",
    password: isAr ? "كلمة المرور" : "Password",
    name: isAr ? "الاسم الكامل" : "Full name",
    phone: isAr ? "رقم الهاتف" : "Phone number",
    student: isAr ? "طالب" : "Student",
    parent: isAr ? "ولي أمر" : "Parent",
    loginBtn: isAr ? "دخول" : "Sign in",
    registerBtn: isAr ? "إنشاء حساب" : "Create account",
    forgotBtn: isAr ? "إرسال الرابط" : "Send reset link",
    noAccount: isAr ? "ليس لديك حساب؟" : "Don't have an account?",
    hasAccount: isAr ? "لديك حساب بالفعل؟" : "Already have an account?",
    forgotLink: isAr ? "نسيت كلمة المرور؟" : "Forgot password?",
    backToLogin: isAr ? "العودة لتسجيل الدخول" : "Back to sign in",
    registerLink: isAr ? "سجل الآن" : "Sign up",
    loginLink: isAr ? "ادخل" : "Sign in",
    brand: isAr ? "منصة تعليمية" : "Learning Platform",
    brandSub: isAr ? "تعليم + تعلم = نجاح" : "Learn + Grow = Succeed",
  };

  const formTitle = mode === "forgot" ? t.forgotTitle : mode === "login" ? t.loginTitle : t.registerTitle;
  const formSubtitle = mode === "forgot" ? t.forgotSubtitle : mode === "login" ? t.loginSubtitle : t.registerSubtitle;

  return (
    <div className="relative min-h-screen w-full flex" dir={isAr ? "rtl" : "ltr"}>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-50 w-10 h-10 rounded-full bg-foreground/5 backdrop-blur-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Left panel — brand (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background-light to-background" />

        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />

        {/* Floating accent orbs */}
        <motion.div
          animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full bg-primary/8 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 15, 0], scale: [1, 0.95, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
        />

        {/* Brand content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-20">
          {/* Logo mark */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-12"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
              <span className="text-background text-xl font-black italic tracking-tighter">ST</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-black italic tracking-tighter text-foreground leading-none mb-3">
              ST-<span className="text-primary">ROBOTICS</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              {isAr
                ? "منصة تعليمية متكاملة تجمع بين الجمال والوظيفية، لإنشاء تجارب تعلم استثنائية"
                : "An integrated educational platform combining beauty with functionality, creating exceptional learning experiences."}
            </p>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex gap-8"
          >
            {[
              { value: "24/7", label: isAr ? "وصول" : "Access" },
              { value: "100+", label: isAr ? "محاضرة" : "Lessons" },
              { value: "5K+", label: isAr ? "طالب" : "Students" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-xl font-black text-foreground italic">{stat.value}</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-5 py-12 lg:px-0 bg-background relative">
        {/* Subtle bg accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-background text-sm font-black italic tracking-tighter">ST</span>
            </div>
            <span className="text-foreground font-black italic tracking-tight text-lg">ST-ROBOTICS</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <AnimatePresence mode="wait">
              <motion.h2
                key={mode}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                className="text-3xl md:text-4xl font-black italic tracking-tighter text-foreground leading-none"
              >
                {formTitle}
              </motion.h2>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.p
                key={mode + "-sub"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
                className="text-muted-foreground text-sm mt-2"
              >
                {formSubtitle}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "register" && (
                <motion.div
                  key="register-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      {t.name}
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                        placeholder={isAr ? "الاسم الكامل" : "John Doe"}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      {t.phone}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                        placeholder="050-000-0000"
                      />
                    </div>
                  </div>

                  {/* Role selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      {isAr ? "نوع الحساب" : "Account type"}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["student", "parent"] as const).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSelectedRole(role)}
                          className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                            selectedRole === role
                              ? "bg-primary text-background border-primary shadow-md shadow-primary/20"
                              : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                          }`}
                        >
                          {role === "student" ? t.student : t.parent}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                {t.email}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            {mode !== "forgot" && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t.password}
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    {t.forgotLink}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl py-3.5 pl-11 pr-11 text-foreground font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Terms checkbox (register only) */}
            {mode === "register" && (
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-primary accent-primary focus:ring-primary/30 shrink-0"
                />
                <span className="text-[11px] text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                  {isAr ? "أوافق على " : "I agree to the "}
                  <a href="/terms-of-service" target="_blank" onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">
                    {isAr ? "شروط الخدمة" : "Terms of Service"}
                  </a>
                  {isAr ? " و" : " and "}
                  <a href="/privacy-policy" target="_blank" onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">
                    {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
                  </a>
                </span>
              </label>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (mode === "register" && !agreedToTerms)}
                className="w-full py-3.5 bg-primary text-background rounded-xl font-bold text-sm tracking-wide hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/15"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {mode === "forgot" ? t.forgotBtn : mode === "login" ? t.loginBtn : t.registerBtn}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Mode switcher */}
          <div className="mt-8 text-center">
            {mode === "forgot" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.backToLogin}
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? t.noAccount : t.hasAccount}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setEmail("");
                    setPassword("");
                    setFullName("");
                    setPhoneNumber("");
                    setAgreedToTerms(false);
                  }}
                  className="text-primary hover:text-primary/80 font-bold transition-colors"
                >
                  {mode === "login" ? t.registerLink : t.loginLink}
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
