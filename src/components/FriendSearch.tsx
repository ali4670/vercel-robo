import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase-code";
import { useLanguage } from "../lib/LanguageContext";
import { useAuth } from "../hooks/use-auth";
import { Search, UserPlus, Loader2, Gamepad2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { HeroButton } from "../funs/HeroButton";

interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  score: number;
}

export const FriendSearch: React.FC = () => {
  const { isAr } = useLanguage();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const searchUsers = useCallback(
    async (val: string) => {
      if (!val || val.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .ilike("username", `%${val}%`)
          .neq("id", user?.id)
          .limit(5);

        if (error) throw error;
        setResults((data as Profile[]) || []);
      } catch (err) {
        if (err instanceof Error) {
          console.error(err.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchUsers]);

  const sendInvitation = async (targetId: string) => {
    if (!user) {
      toast.error(isAr ? "يجب تسجيل الدخول أولاً" : "Please login first");
      return;
    }
    setInvitingId(targetId);
    try {
      const { error } = await supabase.from("games").insert([
        {
          player_x: user.id,
          player_o: targetId,
          status: "pending",
        },
      ]);

      if (error) throw error;
      toast.success(isAr ? "تم إرسال التحدي!" : "Challenge dispatched!");
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      }
    } finally {
      setInvitingId(null);
    }
  };

  const t = {
    title: isAr ? "ابحث عن منافس" : "OPPONENT SEARCH",
    placeholder: isAr ? "ابحث باسم اللاعب..." : "Search identifiers...",
    invite: isAr ? "تحدي" : "Deploy",
    noResults: isAr ? "لا يوجد لاعبين بهذا الاسم" : "No matches found",
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8 relative group/search">
      <div
        className={`flex items-center gap-4 ${isAr ? "flex-row-reverse" : ""}`}
      >
        <div className="w-12 h-12 rounded-[20px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <Users className="w-6 h-6 text-emerald-400" />
        </div>
        <div className={isAr ? "text-right" : ""}>
          <h3 className="text-xl font-black text-foreground italic tracking-tighter uppercase">
            {t.title}
          </h3>
          <p className="text-emerald-500/40 text-[8px] font-black uppercase tracking-[0.4em] mt-1">
            Satellite Uplink Active
          </p>
        </div>
      </div>

      <div className="relative group">
        <Search
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-emerald-400 transition-colors ${isAr ? "right-6" : "left-6"}`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.placeholder}
          className={`w-full bg-foreground/20 border border-border rounded-[24px] py-5 text-foreground font-bold placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/30 focus:bg-muted/40 transition-all shadow-2xl ${isAr ? "pr-14 text-right" : "pl-14"}`}
        />
        {loading && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${isAr ? "left-6" : "right-6"}`}
          >
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {results.map((res) => (
            <motion.div
              key={res.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`flex items-center justify-between p-6 rounded-[32px] bg-muted/30 border border-border backdrop-blur-3xl hover:bg-muted/50 hover:border-emerald-500/30 transition-all duration-500 shadow-xl group/res ${isAr ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex items-center gap-4 ${isAr ? "flex-row-reverse" : ""}`}
              >
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-foreground/20 border border-border flex-shrink-0 relative group-hover/res:border-emerald-500/50 transition-colors duration-500">
                  {res.avatar_url ? (
                    <img
                      src={res.avatar_url}
                      alt=""
                      className="w-full h-full object-cover group-hover/res:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Users className="w-6 h-6" />
                    </div>
                  )}
                  {/* Digital overlay on avatar */}
                  <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:6px_6px]" />
                </div>
                <div className={isAr ? "text-right" : ""}>
                  <div className="font-black text-foreground text-xs uppercase tracking-widest">
                    {res.username}
                  </div>
                  <div className="text-[8px] text-emerald-500/40 font-black uppercase tracking-[0.3em] mt-1">
                    {res.score} PTS // RANKED
                  </div>
                </div>
              </div>
              <HeroButton
                onClick={() => sendInvitation(res.id)}
                disabled={invitingId === res.id}
                variant="secondary"
                size="md"
                className="px-6 py-3 rounded-xl shadow-emerald-500/10"
              >
                {invitingId === res.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Gamepad2 className="w-4 h-4" />
                )}
                {t.invite}
              </HeroButton>
            </motion.div>
          ))}
          {query.length >= 2 && !loading && results.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-white/10 text-[10px] font-black uppercase tracking-[0.4em] italic"
            >
              {t.noResults}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
