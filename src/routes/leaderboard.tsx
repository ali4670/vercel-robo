import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-code";
import { motion } from "framer-motion";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("xp", { ascending: false });
    if (data) setStudents(data);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-foreground p-10 pt-24">
      <h1 className="text-4xl font-black uppercase italic mb-8">
        Student Leaderboard
      </h1>
      <div className="space-y-4">
        {students.map((student, i) => (
          <div
            key={student.id}
            className="bg-muted/50 p-4 rounded-2xl flex items-center gap-4"
          >
            <span className="text-xl font-black text-primary">#{i + 1}</span>
            <span className="font-bold flex-1">{student.username}</span>
            <span className="font-black text-primary">{student.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}
