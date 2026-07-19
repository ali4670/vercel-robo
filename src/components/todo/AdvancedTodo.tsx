import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase-code";
import { useAuth } from "../../hooks/use-auth";
import { useLanguage } from "../../lib/LanguageContext";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  RotateCcw,
  Zap,
  LayoutDashboard,
  Clock,
  Brain,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { HeroButton } from "../../funs/HeroButton";

type Priority = "low" | "medium" | "high" | "urgent";
type TimerMode = "work" | "shortBreak" | "longBreak";

interface Todo {
  id: string;
  task: string;
  description: string;
  priority: Priority;
  category: string;
  is_completed: boolean;
  due_date: string;
  time_limit?: number; // In minutes
}

export const AdvancedTodo: React.FC = () => {
  const { user, profile } = useAuth();
  const { isAr } = useLanguage();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [task, setTask] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState("Research");
  const [taskDuration, setTaskDuration] = useState<number>(25);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Pomodoro State
  const [mode, setTimerMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const timerSettings = {
    work: (profile?.work_duration || 25) * 60,
    shortBreak: (profile?.break_duration || 5) * 60,
    longBreak: 15 * 60,
  };

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(
        mode === "work"
          ? (profile?.work_duration || 25) * 60
          : (profile?.break_duration || 5) * 60,
      );
    }
  }, [profile?.work_duration, profile?.break_duration, mode, isActive]);

  useEffect(() => {
    if (user) {
      fetchTodos();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft <= 0 && isActive) {
      handleTimerComplete();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Industrial "bebebe" sound using Web Audio API
    const playBeep = () => {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const playSingleBeep = (time: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "square";
        osc.frequency.setValueAtTime(880, time);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.start(time);
        osc.stop(time + 0.1);
      };
      const now = audioCtx.currentTime;
      playSingleBeep(now);
      playSingleBeep(now + 0.2);
      playSingleBeep(now + 0.4);
    };

    playBeep();
    toast.success(isAr ? "اكتمل البرتوكول!" : "Protocol Complete!");

    if (mode === "work") {
      switchMode("shortBreak");
    } else {
      switchMode("work");
    }
  };

  const switchMode = (newMode: TimerMode) => {
    setIsActive(false);
    setTimerMode(newMode);
    setTimeLeft(timerSettings[newMode]);
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(timerSettings[mode]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setTodos(data || []);
    setLoading(false);
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Login to save tasks");

    const newTodo: any = {
      user_id: user.id,
      task,
      priority,
      category,
      is_completed: false,
    };

    let { error } = await supabase
      .from("todos")
      .insert([{ ...newTodo, time_limit: taskDuration }]);
    if (error && error.message?.includes("time_limit")) {
      ({ error } = await supabase.from("todos").insert([newTodo]));
    }
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!error) {
      toast.success(isAr ? "تمت إضافة المهمة" : "Mission Initialized");
      setTask("");
      setShowAdd(false);
      fetchTodos();
    }
  };

  const startTask = (todo: Todo) => {
    switchMode("work");
    if (todo.time_limit) {
      setTimeLeft(todo.time_limit * 60);
      setIsActive(true);
      toast.info(
        isAr ? `بدء المهمة: ${todo.task}` : `Deploying Mission: ${todo.task}`,
      );
    }
  };

  const toggleTodo = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("todos")
      .update({ is_completed: !current })
      .eq("id", id);
    if (!error) fetchTodos();
  };

  const deleteTodo = async (id: string) => {
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (!error) {
      toast.error(isAr ? "تم حذف المهمة" : "Mission Aborted");
      fetchTodos();
    }
  };

  return (
    <div className="min-h-fit w-full max-w-6xl mx-auto bg-foreground/20 border border-border rounded-[2rem] lg:rounded-[48px] overflow-hidden shadow-2xl backdrop-blur-3xl flex flex-col lg:flex-row relative group/os">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-80 bg-muted/30 border-r border-border p-8 flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.2)]">
            <Zap className="w-6 h-6 text-black fill-current" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tighter uppercase italic leading-none">
              ST-OS
            </h2>
            <p className="text-[7px] text-primary/40 font-bold uppercase tracking-[0.4em] mt-1">
              Control Unit
            </p>
          </div>
        </div>

        {/* Timer UI */}
        <div className="p-6 rounded-[32px] bg-muted/30 border border-border flex flex-col items-center gap-6">
          <div className="flex gap-2 p-1 bg-foreground/20 rounded-full border border-border w-full">
            {(["work", "shortBreak"] as TimerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-full transition-all ${mode === m ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
              >
                {m === "work"
                  ? isAr
                    ? "تركيز"
                    : "Work"
                  : isAr
                    ? "راحة"
                    : "Rest"}
              </button>
            ))}
          </div>

          <div className="relative flex items-center justify-center">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                className="text-muted-foreground"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={440}
                initial={{ strokeDashoffset: 440 }}
                animate={{
                  strokeDashoffset:
                    440 - (440 * (timeLeft || 0)) / (timerSettings[mode] || 1),
                }}
                className="text-primary"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-foreground tabular-nums tracking-tighter">
                {formatTime(timeLeft)}
              </span>
              <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">
                {isActive
                  ? isAr
                    ? "قيد العمل"
                    : "Active"
                  : isAr
                    ? "متوقف"
                    : "Standby"}
              </span>
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <HeroButton
              onClick={toggleTimer}
              variant="primary"
              className="flex-1 rounded-2xl h-12 p-0 bg-primary text-black"
            >
              {isActive ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-1" />
              )}
            </HeroButton>
            <HeroButton
              onClick={resetTimer}
              variant="outline"
              className="w-12 h-12 p-0 rounded-2xl border-border"
            >
              <RotateCcw className="w-5 h-5" />
            </HeroButton>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {[
            {
              icon: Brain,
              label: isAr ? "التركيز العصبي" : "Neural Focus",
              active: true,
            },
            { icon: LayoutDashboard, label: isAr ? "المهام" : "Module Queue" },
          ].map((item, i) => (
            <button
              key={i}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${item.active ? "bg-muted/50 text-foreground border border-border shadow-xl" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-grow p-8 lg:p-12 flex flex-col gap-8">
        <div className="flex justify-between items-end border-b border-border pb-8">
          <div>
            <h1 className="text-5xl font-black text-foreground italic tracking-tighter uppercase leading-none">
              {isAr ? "المهام البرمجية" : "System Missions"}
            </h1>
            <p className="text-primary/40 text-[10px] font-bold uppercase tracking-[0.4em] mt-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {todos.filter((t) => !t.is_completed).length} Priority Modules
              Online
            </p>
          </div>
          <HeroButton
            onClick={() => setShowAdd(!showAdd)}
            variant="primary"
            className="w-14 h-14 p-0 rounded-2xl bg-primary text-black shadow-[0_0_30px_rgba(204,255,0,0.2)]"
          >
            <Plus
              className={`w-8 h-8 transition-transform duration-500 ${showAdd ? "rotate-45" : ""}`}
            />
          </HeroButton>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={addTodo}
              className="bg-muted/30 border border-border rounded-[32px] p-8 space-y-6 overflow-hidden backdrop-blur-xl shadow-2xl"
            >
              <div className="space-y-2">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 text-left block">
                  Primary Objective
                </label>
                <input
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder={
                    isAr ? "أدخل المهمة..." : "Define Mission Parameters..."
                  }
                  className={`w-full bg-card/80 border border-border rounded-2xl px-6 py-5 text-foreground font-bold placeholder:text-white/10 focus:outline-none focus:border-primary/50 transition-all ${isAr ? "text-right" : "text-left"}`}
                  required
                />
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 text-left block">
                    Duration (Min)
                  </label>
                  <input
                    type="number"
                    value={taskDuration}
                    onChange={(e) => setTaskDuration(Number(e.target.value))}
                    className={`w-full bg-card/80 border border-border rounded-2xl px-6 py-4 text-foreground font-bold focus:outline-none focus:border-primary/50 transition-all ${isAr ? "text-right" : "text-left"}`}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 text-left block">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className={`w-full bg-card/80 border border-border rounded-2xl px-6 py-[18px] text-[10px] font-black uppercase tracking-widest text-foreground outline-none focus:border-primary/30 appearance-none ${isAr ? "text-right" : "text-left"}`}
                  >
                    <option value="low">Standard</option>
                    <option value="medium">Enhanced</option>
                    <option value="high">Critical</option>
                    <option value="urgent">Immediate</option>
                  </select>
                </div>
              </div>
              <HeroButton
                type="submit"
                className="w-full rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-widest py-5 shadow-[0_0_20px_rgba(204,255,0,0.1)]"
              >
                Deploy Mission
              </HeroButton>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex-grow space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[450px]">
          {loading ? (
            <div className="flex items-center justify-center h-full opacity-20">
              <Zap className="w-12 h-12 animate-pulse text-primary" />
            </div>
          ) : todos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 opacity-10">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-white flex items-center justify-center mb-6">
                <Clock className="w-8 h-8" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em]">
                Queue Empty
              </p>
            </div>
          ) : (
            todos.map((todo) => (
              <motion.div
                layout
                key={todo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group flex items-center gap-6 p-6 rounded-[32px] border transition-all duration-500 ${todo.is_completed ? "bg-foreground/10 border-border opacity-30" : "bg-muted/30 border-border hover:border-primary/30 shadow-xl"}`}
              >
                <button
                  onClick={() => toggleTodo(todo.id, todo.is_completed)}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl border-2 transition-all duration-500 ${todo.is_completed ? "bg-primary border-primary text-black" : "border-border text-transparent hover:border-primary"}`}
                >
                  <CheckCircle2 className="w-6 h-6" />
                </button>
                <div
                  className="flex-grow cursor-pointer"
                  onClick={() => !todo.is_completed && startTask(todo)}
                >
                  <h3
                    className={`font-black text-sm uppercase tracking-widest transition-all duration-500 ${todo.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                  >
                    {todo.task}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span
                      className={`text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg border ${todo.priority === "urgent" ? "text-red-500 border-red-500/20 bg-red-500/5" : "text-primary/50 border-border"}`}
                    >
                      {todo.priority}
                    </span>
                    {todo.time_limit && (
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {todo.time_limit} MIN
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-foreground"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
