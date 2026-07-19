import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase-code";
import { useLanguage } from "../lib/LanguageContext";
import {
  X,
  User,
  Loader2,
  Save,
  Camera,
  Key,
  Zap,
  Clock,
  ShieldCheck,
  Activity,
  ArrowLeft,
  Phone,
  Timer,
  Coffee,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "../hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";

interface ProfileEditProps {
  isOpen: boolean;
  onClose: () => void;
  fullPage?: boolean;
  targetProfile?: {
    id: string;
    username: string;
    avatar_url: string;
    score: number;
    work_duration?: number;
    break_duration?: number;
  };
  onUpdate?: () => void;
}

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 100);
}

export const ProfileEdit: React.FC<ProfileEditProps> = ({
  isOpen,
  onClose,
  fullPage = false,
  targetProfile,
  onUpdate,
}) => {
  const { isAr } = useLanguage();
  const { user, profile: myProfile, isAdmin, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const currentProfile = targetProfile || myProfile;

  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [score, setScore] = useState(0);
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if ((isOpen || fullPage) && currentProfile) {
      setUsername(currentProfile.username || "");
      setPhoneNumber(currentProfile.phone_number || "");
      setAvatarUrl(currentProfile.avatar_url || "");
      setScore(currentProfile.score || 0);
      setWorkDuration(currentProfile.work_duration || 25);
      setBreakDuration(currentProfile.break_duration || 5);
      setNewPassword("");
    }
  }, [isOpen, fullPage, currentProfile]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      if (!user) throw new Error("Authentication required");

      const file = event.target.files[0];

      if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
        toast.error(isAr ? "نوع الملف غير مدعوم" : "Unsupported file type. Use JPG, PNG, WebP, or GIF.");
        return;
      }
      if (file.size > MAX_AVATAR_SIZE) {
        toast.error(isAr ? "الملف كبير جداً" : "File too large. Maximum 5MB.");
        return;
      }

      const safeName = sanitizeFilename(file.name);
      const fileExt = safeName.split(".").pop() || "jpg";
      const filePath = `${user.id}/${user.id}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
      toast.success(isAr ? "تم تحديث الصورة" : "Avatar updated");
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = targetProfile?.id || myProfile?.id || user?.id;
    if (!targetId) {
      toast.error(isAr ? "فشل تحديد الهوية" : "Identity resolution failed");
      return;
    }

    setLoading(true);
    try {
      const baseUpdates: any = {
        id: targetId,
        username: username.trim(),
        phone_number: phoneNumber.trim(),
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      if (workDuration !== undefined) baseUpdates.work_duration = workDuration;
      if (breakDuration !== undefined) baseUpdates.break_duration = breakDuration;
      if (isAdmin && targetProfile) baseUpdates.score = score;

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(baseUpdates, { onConflict: "id" });

      if (profileError) {
        if (profileError.message?.includes("column") && profileError.message?.includes("not found")) {
          throw new Error(isAr ? "يجب تشغيل كود SQL المحدث" : "Schema mismatch. Run the updated SQL.");
        }
        throw profileError;
      }

      if (newPassword && !targetProfile) {
        const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
        if (authError) throw authError;
      }

      toast.success(isAr ? "تم حفظ الإعدادات" : "Settings saved");
      await refreshProfile();
      if (onUpdate) onUpdate();
      setTimeout(() => onClose(), 500);
    } catch (error: any) {
      const msg = error?.message || error?.error_description || "Connection interrupted";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const t = {
    title: isAr ? "إعدادات النظام" : "SYSTEM CONFIG",
    subtitle: isAr ? "إدارة حسابك وتفضيلاتك" : "Manage your account and preferences",
    identity: isAr ? "الهوية" : "IDENTITY",
    username: isAr ? "اسم المستخدم" : "USERNAME",
    phone: isAr ? "رقم الهاتف" : "PHONE NUMBER",
    password: isAr ? "كلمة المرور الجديدة" : "NEW PASSWORD",
    protocols: isAr ? "بروتوكولات العمل" : "WORK PROTOCOLS",
    work: isAr ? "مدة التركيز" : "FOCUS DURATION",
    breakTime: isAr ? "مدة الراحة" : "BREAK DURATION",
    save: isAr ? "حفظ الإعدادات" : "SAVE SETTINGS",
    stats: isAr ? "الإحصائيات" : "STATISTICS",
    xp: isAr ? "نقاط الخبرة" : "EXPERIENCE POINTS",
    upload: isAr ? "تغيير الصورة" : "CHANGE AVATAR",
    back: isAr ? "العودة" : "BACK",
    mins: isAr ? "دقيقة" : "min",
  };

  const content = (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/30">
      {/* Background decoration */}
      <div className="fixed inset-0 bg-background z-0">
        <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] bg-primary/5 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] bg-primary/3 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        {!fullPage && (
          <button
            onClick={onClose}
            className="group flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center group-hover:border-primary">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">{t.back}</span>
          </button>
        )}

        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none mb-3">
            {t.title}
          </h1>
          <p className="text-muted-foreground text-sm">{t.subtitle}</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-8">
          {/* Avatar Section */}
          <div className="bg-card border border-border rounded-3xl p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div
                className="relative group cursor-pointer flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-28 h-28 rounded-3xl overflow-hidden border-2 border-border group-hover:border-primary/50 transition-all duration-500 shadow-xl">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <User className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-card/90 flex items-center justify-center backdrop-blur-md">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-2.5 rounded-xl shadow-lg">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" />

              <div className="flex-1 text-center sm:text-left">
                <p className="font-black text-lg uppercase tracking-tight mb-1">{currentProfile?.username || "Agent"}</p>
                <p className="text-muted-foreground text-xs mb-3">{currentProfile?.email || user?.email}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-muted border border-border text-xs font-black uppercase tracking-widest hover:bg-muted/80 transition-all"
                >
                  {t.upload}
                </button>
              </div>

              {/* Stats Card */}
              <div className="bg-muted/50 border border-border rounded-2xl p-5 min-w-[140px]">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{t.stats}</span>
                </div>
                <p className="text-2xl font-black italic text-primary tabular-nums">{score}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{t.xp}</p>
              </div>
            </div>
          </div>

          {/* Identity Section */}
          <div className="bg-card border border-border rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-black uppercase tracking-widest text-sm">{t.identity}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">{t.username}</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-muted border border-border rounded-2xl py-3.5 pl-11 pr-4 text-foreground font-bold text-sm focus:outline-none focus:border-primary focus:bg-muted/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">{t.phone}</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-muted border border-border rounded-2xl py-3.5 pl-11 pr-4 text-foreground font-bold text-sm focus:outline-none focus:border-primary focus:bg-muted/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">{t.password}</label>
                <div className="relative group">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={isAr ? "اترك فارغاً للاحتفاظ بالحالي" : "Leave blank to keep current"}
                    className="w-full bg-muted border border-border rounded-2xl py-3.5 pl-11 pr-4 text-foreground font-bold text-sm focus:outline-none focus:border-primary focus:bg-muted/50 transition-all placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Work Protocols Section */}
          <div className="bg-card border border-border rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <Timer className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-black uppercase tracking-widest text-sm">{t.protocols}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">{t.work}</label>
                  <span className="text-primary font-black text-sm tabular-nums">{workDuration} {t.mins}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={workDuration}
                  onChange={(e) => setWorkDuration(Number(e.target.value))}
                  className="w-full accent-primary h-2"
                />
                <div className="flex justify-between text-[8px] text-muted-foreground font-bold">
                  <span>1 {t.mins}</span>
                  <span>60 {t.mins}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">{t.breakTime}</label>
                  <span className="text-muted-foreground font-black text-sm tabular-nums">{breakDuration} {t.mins}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(Number(e.target.value))}
                  className="w-full accent-primary h-2"
                />
                <div className="flex justify-between text-[8px] text-muted-foreground font-bold">
                  <span>1 {t.mins}</span>
                  <span>30 {t.mins}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full bg-primary text-primary-foreground py-5 rounded-3xl font-black uppercase tracking-widest text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {t.save}
          </button>
        </form>
      </div>
    </div>
  );

  if (fullPage) return content;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 md:p-10 bg-background/80 backdrop-blur-3xl overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="w-full"
          >
            {content}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
