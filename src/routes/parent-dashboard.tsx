import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-code";
import { useAuth } from "../hooks/use-auth";
import { motion } from "framer-motion";
import { BookOpen, Award, MessageSquare, ClipboardList } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

export const Route = createFileRoute("/parent-dashboard")({
  component: ParentDashboard,
});

function ParentDashboard() {
  const { isAr } = useLanguage();
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [homework, setHomework] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [studentLevels, setStudentLevels] = useState<any[]>([]);
  const [currentModule, setCurrentModule] = useState<any>(null);
  const [examSubmissions, setExamSubmissions] = useState<any[]>([]);

  useEffect(() => {
    if (user) fetchLinkedStudents();
  }, [user]);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData(selectedStudent.id);
      fetchStudentProgress(selectedStudent.id);
      fetchExamSubmissions(selectedStudent.id);
    }
  }, [selectedStudent]);

  const fetchExamSubmissions = async (studentId: string) => {
    const { data } = await supabase
      .from("exam_submissions")
      .select("*, lectures(title)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    
    if (data) setExamSubmissions(data);
  };

  const fetchLinkedStudents = async () => {
    setLoading(true);
    const { data: links, error } = await supabase
      .from("parent_student_links")
      .select("student:profiles!parent_student_links_student_id_fkey(*)")
      .eq("parent_id", user?.id);

    if (!error && links) {
      setStudents(links.map((l) => l.student));
      if (links.length > 0) setSelectedStudent(links[0].student);
    }
    setLoading(false);
  };

  const fetchStudentProgress = async (studentId: string) => {
    const { data: access, error: accessError } = await supabase
      .from("level_access")
      .select("level_id, levels(title, level_order)")
      .eq("user_id", studentId);
    console.log("DEBUG: Access levels:", access, "Error:", accessError);
    setStudentLevels(access || []);

    // Get the most recent completed lecture with joined data
    const { data: progress, error: progressError } = await supabase
      .from("student_progress")
      .select(`
        lecture_id,
        lectures (
          title,
          slot_number,
          levels (
            title
          )
        )
      `)
      .eq("student_id", studentId)
      .order("completed_at", { ascending: false })
      .limit(1);
    console.log("DEBUG: Progress:", progress, "Error:", progressError);

    if (progress && progress.length > 0) {
      setCurrentModule(progress[0].lectures);
    } else if (access && access.length > 0) {
      // If no progress but access exists, try to get the first lecture of the first level
      const firstLevelId = access[0].level_id;
      const { data: firstLecture } = await supabase
        .from("lectures")
        .select("title, slot_number, levels(title)")
        .eq("level_id", firstLevelId)
        .order("slot_number", { ascending: true })
        .limit(1)
        .single();
      
      console.log("DEBUG: First lecture:", firstLecture);
      if (firstLecture) {
        setCurrentModule(firstLecture);
      } else {
        setCurrentModule(null);
      }
    } else {
      setCurrentModule(null);
    }
  };

  const fetchStudentData = async (studentId: string) => {
    const { data: hw } = await supabase
      .from("student_homework")
      .select("*")
      .eq("student_id", studentId);

    const { data: nts } = await supabase
      .from("moderator_notes")
      .select("*")
      .eq("student_id", studentId);

    if (hw) setHomework(hw);
    if (nts) setNotes(nts);
  };

  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    if (!message.trim() || !user) return;

    const { data: moderator } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "moderator")
      .limit(1)
      .single();

    if (!moderator) return;

    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: moderator.id,
      content: message,
    });

    if (!error) setMessage("");
  };

  if (loading) return <div className="p-10 text-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#030303] text-foreground p-10 pt-24">
      <h1 className="text-4xl font-black uppercase italic mb-8">
        {isAr ? "لوحة أولياء الأمور" : "Parent Dashboard"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1 space-y-4">
          <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">
            {isAr ? "طلابك" : "Your Students"}
          </h2>
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className={`w-full p-4 rounded-2xl text-left ${selectedStudent?.id === student.id ? "bg-primary text-black" : "bg-muted/50"}`}
            >
              {student.username}
            </button>
          ))}

          <div className="mt-8 pt-8 border-t border-border">
            <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">
              {isAr ? "مركز الرسائل" : "Message Hub"}
            </h2>
            <Link
              to="/messages"
              className="w-full bg-primary text-black font-black py-4 rounded-xl text-xs uppercase flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              {isAr ? "الانتقال للرسائل" : "Go to Messages"}
            </Link>
          </div>
        </aside>

        <main className="md:col-span-3 space-y-8">
          {selectedStudent ? (
            <>
              <div className="bg-muted/50 p-8 rounded-3xl border border-border">
                <h2 className="text-2xl font-black mb-6">
                  {selectedStudent.username}'s Status
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-xl">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold">
                      XP
                    </p>
                    <p className="text-2xl font-black">{selectedStudent.xp}</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-xl">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold">
                      Current Module
                    </p>
                    <p className="text-sm font-black">
                      {currentModule
                        ? `${Array.isArray(currentModule.levels) ? currentModule.levels[0]?.title : currentModule.levels?.title} - ${currentModule.title}`
                        : "Not started"}
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-black mt-8 mb-4">
                  Accessible Levels
                </h3>
                {console.log("DEBUG: Rendering studentLevels:", studentLevels)}
                <div className="flex flex-wrap gap-2">
                  {studentLevels.map((sl) => (
                    <span
                      key={sl.level_id}
                      className="bg-lime-500/20 text-lime-400 px-3 py-1 rounded-full text-xs font-bold"
                    >
                      Level {sl.levels?.level_order ?? '?'}: {Array.isArray(sl.levels) ? sl.levels[0]?.title : sl.levels?.title ?? 'Unknown Level'}
                    </span>
                  ))}
                </div>
              </div>

              <section className="bg-muted/50 p-8 rounded-3xl border border-border">
                <h3 className="text-xl font-black mb-4">
                  {isAr ? "نتائج الاختبارات" : "Exam Results"}
                </h3>
                {examSubmissions.map((sub) => (
                  <div key={sub.id} className="p-4 border-b border-border flex justify-between items-center">
                    <div>
                      <p className="font-bold">{sub.lectures?.title || "Exam"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-lime-400">
                        {sub.total_grade !== null ? `${sub.total_grade}%` : "Pending"}
                      </p>
                      {sub.moderator_feedback && (
                        <p className="text-[10px] text-muted-foreground italic">
                          {sub.moderator_feedback}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </section>

              <section className="bg-muted/50 p-8 rounded-3xl border border-border">
                <h3 className="text-xl font-black mb-4">
                  {isAr ? "الواجبات المنزلية" : "Homework"}
                </h3>
                {homework.map((hw) => (
                  <div key={hw.id} className="p-4 border-b border-border">
                    <p className="font-bold">{hw.title}</p>
                    <p className="text-xs text-muted-foreground">{hw.description}</p>
                  </div>
                ))}
              </section>

              <section className="bg-muted/50 p-8 rounded-3xl border border-border">
                <h3 className="text-xl font-black mb-4">
                  {isAr ? "ملاحظات المشرف" : "Moderator Notes"}
                </h3>
                {notes.map((note) => (
                  <div key={note.id} className="p-4 border-b border-border">
                    <p className="text-sm">{note.content}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </section>
            </>
          ) : (
            <p>{isAr ? "لا يوجد طلاب مرتبطون." : "No students linked."}</p>
          )}
        </main>
      </div>
    </div>
  );
}
