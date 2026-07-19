import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { useState } from "react";
import {
  Globe,
  User as UserIcon,
  LogOut,
  Shield,
  Moon,
  Sun,
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

function InnerLayout() {
  const { language, setLanguage, isAr } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut, isAdmin, isModerator } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 md:px-6 py-3 md:py-4 backdrop-blur-xl bg-background/80 border-b border-border transition-colors duration-300">
        <Link
          to="/"
          className="flex items-center gap-2"
        >
          <img
            src="/logo-2026, 12_38_18 PM.png"
            alt="ROBOTICS-CLUB"
            className="h-9 w-9 md:h-10 md:w-10 rounded-full object-cover ring-2 ring-primary/30"
          />
          <span className="text-xl md:text-2xl font-black text-foreground tracking-tighter italic">
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

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="relative flex items-center justify-center w-9 h-9 rounded-full border border-border bg-muted hover:bg-accent/10 transition-all duration-200 group"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === "light" ? (
                <motion.span
                  key="moon"
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  <Moon className="w-4 h-4 text-foreground" />
                </motion.span>
              ) : (
                <motion.span
                  key="sun"
                  initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  <Sun className="w-4 h-4 text-primary" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="flex items-center gap-2 px-3 h-9 rounded-full border border-border bg-muted hover:bg-accent/10 transition-all duration-200 group"
          >
            <span
              className={`text-[9px] font-black transition-colors ${language === "en" && !isAr ? "text-primary" : "text-muted-foreground"}`}
            >
              EN
            </span>
            <div className="w-7 h-3.5 rounded-full bg-background border border-border relative overflow-hidden">
              <motion.div
                animate={{ x: language === "ar" ? 14 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(112,224,0,0.5)]"
              />
            </div>
            <span
              className={`text-[9px] font-black transition-colors ${language === "ar" ? "text-primary" : "text-muted-foreground"}`}
            >
              AR
            </span>
          </button>

          {user ? (
            <div
              className={`flex items-center gap-3 ${isAr ? "flex-row-reverse" : ""}`}
            >
              {profile?.role === "parent" && (
                <Link to="/parent-dashboard">
                  <HeroButton
                    size="sm"
                    variant="outline"
                    className="px-4 border-border text-foreground hover:bg-muted transition-all duration-200"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    {isAr ? "لوحة أولياء الأمور" : "Parent"}
                  </HeroButton>
                </Link>
              )}
              {isModerator && (
                <Link to="/moderator">
                  <HeroButton
                    size="sm"
                    variant="outline"
                    className="px-4 border-border text-foreground hover:bg-muted transition-all duration-200"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {isAr ? "لوحة التحكم" : "Admin"}
                  </HeroButton>
                </Link>
              )}
              <button
                onClick={() => setIsProfileEditOpen(true)}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-border hover:border-primary transition-all duration-200"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
                    {(profile?.username || user.email?.split("@")[0] || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </button>
              <button
                onClick={() => signOut()}
                className="w-9 h-9 rounded-full flex items-center justify-center border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 transition-all duration-200"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <HeroButton
              onClick={() => setIsAuthModalOpen(true)}
              size="md"
              variant="primary"
            >
              <UserIcon className="w-3.5 h-3.5" />
              {isAr ? "دخول النظام" : "Initialize"}
            </HeroButton>
          )}
        </div>
      </header>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <ProfileEdit
        isOpen={isProfileEditOpen}
        onClose={() => setIsProfileEditOpen(false)}
      />
    </>
  );
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
          <main className="pt-20 md:pt-24 min-h-screen bg-background transition-colors duration-300">
            <Outlet />
          </main>
          <Footer />
        </div>
        <Toaster position="bottom-right" theme="dark" richColors />
      </AuthProvider>
    </LanguageProvider>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    component: RootComponent,
    errorComponent: ({ error }) => <div>Error: {error.message}</div>,
  },
);
