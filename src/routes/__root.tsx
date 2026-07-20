import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Globe,
  User as UserIcon,
  LogOut,
  Shield,
  Moon,
  Sun,
  Menu,
  X,
  Home,
  BookOpen,
  MessageSquare,
  UserCircle,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { LanguageProvider, useLanguage } from "../lib/LanguageContext";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";
import { AuthProvider, useAuth } from "../hooks/use-auth";
import { AuthModal } from "../components/AuthModal";
import { ProfileEdit } from "../components/ProfileEdit";
import { HeroButton } from "../funs/HeroButton";
import { Component as Footer } from "../components/ui/footer-taped-design";

function MobileMenuOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { language, setLanguage, isAr } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut, isAdmin, isModerator } = useAuth();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl md:hidden"
        >
          <motion.div
            initial={{ x: isAr ? -100 : 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isAr ? -100 : 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 flex flex-col pt-20 pb-8 px-6 overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>

            <div className="space-y-2 mt-4">
              <Link to="/levels" onClick={onClose}>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-bold text-sm">{isAr ? "الدورات" : "COURSES"}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground ${isAr ? "rotate-180" : ""}`} />
                </div>
              </Link>

              {user && profile?.role === "parent" && (
                <Link to="/parent-dashboard" onClick={onClose}>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="font-bold text-sm">{isAr ? "لوحة أولياء الأمور" : "PARENT DASHBOARD"}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground ${isAr ? "rotate-180" : ""}`} />
                  </div>
                </Link>
              )}

              {user && isModerator && (
                <Link to="/moderator" onClick={onClose}>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-red-500" />
                      </div>
                      <span className="font-bold text-sm">{isAr ? "لوحة التحكم" : "ADMIN PANEL"}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground ${isAr ? "rotate-180" : ""}`} />
                  </div>
                </Link>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {isAr ? "الوضع" : "THEME"}
                </span>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border"
                >
                  {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-primary" />}
                  <span className="text-xs font-bold">{theme === "light" ? "Dark" : "Light"}</span>
                </button>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-border">
              {user ? (
                <div className="space-y-3">
                  <button
                    onClick={() => { onClose(); setIsProfileEditOpen(true); }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-muted/50 border border-border"
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
                        {(profile?.username || user.email?.split("@")[0] || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-bold text-sm">{profile?.username || user.email?.split("@")[0]}</p>
                      <p className="text-xs text-muted-foreground">{profile?.role || "student"}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { signOut(); onClose(); }}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-bold">{isAr ? "تسجيل الخروج" : "SIGN OUT"}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { onClose(); setIsProfileEditOpen(true); }}
                  className="w-full p-4 rounded-2xl bg-primary text-primary-foreground font-black text-sm"
                >
                  {isAr ? "دخول النظام" : "SIGN IN"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BottomNavBar() {
  const { isAr } = useLanguage();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { to: "/", icon: Home, label: isAr ? "الرئيسية" : "Home" },
    { to: "/levels", icon: BookOpen, label: isAr ? "الدورات" : "Courses" },
    { to: "/profile", icon: UserCircle, label: isAr ? "الملف" : "Profile" },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-background/90 backdrop-blur-xl border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}>
              <div className="flex flex-col items-center gap-1 px-3 py-1">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-[9px] font-bold text-muted-foreground">{item.label}</span>
              </div>
            </Link>
          ))}
          <button
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-1"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
            <span className="text-[9px] font-bold text-muted-foreground">{isAr ? "المزيد" : "More"}</span>
          </button>
        </div>
      </nav>
      <MobileMenuOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

function DesktopNav() {
  const { language, setLanguage, isAr } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut, isAdmin, isModerator } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

  return (
    <>
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-[100] items-center justify-between px-6 py-4 backdrop-blur-xl bg-background/80 border-b border-border transition-colors duration-300">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/logo-2026, 12_38_18 PM.png"
            alt="ROBOTICS-CLUB"
            className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/30"
          />
          <span className="text-2xl font-black text-foreground tracking-tighter italic">
            ROBOTICS-CLUB<span className="text-primary">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/levels">
            <HeroButton
              size="sm"
              variant="outline"
              className="px-4 border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
            >
              <Globe className="w-3.5 h-3.5 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isAr ? "الدورات" : "COURSES"}
              </span>
            </HeroButton>
          </Link>

          <button
            onClick={toggleTheme}
            className="relative flex items-center justify-center w-9 h-9 rounded-full border border-border bg-muted hover:bg-accent/10 transition-all duration-200 group"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === "light" ? (
                <motion.span key="moon" initial={{ rotate: -90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.2 }} className="flex items-center justify-center">
                  <Moon className="w-4 h-4 text-foreground" />
                </motion.span>
              ) : (
                <motion.span key="sun" initial={{ rotate: 90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: -90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.2 }} className="flex items-center justify-center">
                  <Sun className="w-4 h-4 text-primary" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="flex items-center gap-2 px-3 h-9 rounded-full border border-border bg-muted hover:bg-accent/10 transition-all duration-200 group"
          >
            <span className={`text-[9px] font-black transition-colors ${language === "en" && !isAr ? "text-primary" : "text-muted-foreground"}`}>EN</span>
            <div className="w-7 h-3.5 rounded-full bg-background border border-border relative overflow-hidden">
              <motion.div
                animate={{ x: language === "ar" ? 14 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(112,224,0,0.5)]"
              />
            </div>
            <span className={`text-[9px] font-black transition-colors ${language === "ar" ? "text-primary" : "text-muted-foreground"}`}>AR</span>
          </button>

          {user ? (
            <div className={`flex items-center gap-3 ${isAr ? "flex-row-reverse" : ""}`}>
              {profile?.role === "parent" && (
                <Link to="/parent-dashboard">
                  <HeroButton size="sm" variant="outline" className="px-4 border-border text-foreground hover:bg-muted transition-all duration-200">
                    <UserIcon className="w-4 h-4 mr-2" />
                    {isAr ? "لوحة أولياء الأمور" : "Parent"}
                  </HeroButton>
                </Link>
              )}
              {isModerator && (
                <Link to="/moderator">
                  <HeroButton size="sm" variant="outline" className="px-4 border-border text-foreground hover:bg-muted transition-all duration-200">
                    <Shield className="w-4 h-4 mr-2" />
                    {isAr ? "لوحة التحكم" : "Admin"}
                  </HeroButton>
                </Link>
              )}
              <Link to="/profile">
                <button className="w-9 h-9 rounded-full overflow-hidden border-2 border-border hover:border-primary transition-all duration-200">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
                      {(profile?.username || user.email?.split("@")[0] || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              </Link>
              <button
                onClick={() => signOut()}
                className="w-9 h-9 rounded-full flex items-center justify-center border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 transition-all duration-200"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <HeroButton onClick={() => setIsAuthModalOpen(true)} size="md" variant="primary">
              <UserIcon className="w-3.5 h-3.5" />
              {isAr ? "دخول النظام" : "Initialize"}
            </HeroButton>
          )}
        </div>
      </header>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}

function InnerLayout() {
  const { user, profile, isModerator } = useAuth();
  const { isAr } = useLanguage();
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/levels", icon: BookOpen, label: "Courses" },
  ];

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-3 backdrop-blur-xl bg-background/80 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/logo-2026, 12_38_18 PM.png"
            alt="ROBOTICS-CLUB"
            className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/30"
          />
          <span className="text-lg font-black text-foreground tracking-tighter italic">
            ROBOTICS-CLUB<span className="text-primary">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {!user && (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-background text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/15 active:scale-95 transition-all"
            >
              <UserIcon className="w-3.5 h-3.5" />
              {isAr ? "دخول" : "Sign In"}
            </button>
          )}
          <button
            onClick={() => { document.dispatchEvent(new CustomEvent('toggle-mobile-menu')); }}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-border bg-muted"
          >
            <Menu className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </header>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <DesktopNav />
      <BottomNavBar />
      <MobileMenuController />

      <ProfileEdit isOpen={isProfileEditOpen} onClose={() => setIsProfileEditOpen(false)} />
    </>
  );
}

function MobileMenuController() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen((prev) => !prev);
    document.addEventListener("toggle-mobile-menu", handler);
    return () => document.removeEventListener("toggle-mobile-menu", handler);
  }, []);

  return <MobileMenuOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} />;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemeContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ThemeContent() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
          <InnerLayout />
          <main className="pt-14 md:pt-24 pb-20 md:pb-0 min-h-screen bg-background transition-colors duration-300">
            <Outlet />
          </main>
          <Footer />
        </div>
        <Toaster position="bottom-right" theme="dark" richColors />
      </AuthProvider>
    </LanguageProvider>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});
