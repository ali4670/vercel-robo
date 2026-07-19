import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { validateFile, safeStoragePath } from "../lib/upload-security";
import {
  X,
  Check,
  Brain,
  ArrowRight,
  Loader2,
  Trophy,
  AlertCircle,
  FileText,
} from "lucide-react";
import { supabase } from "../lib/supabase-code";
import { HeroButton } from "../funs/HeroButton";
import { toast } from "sonner";

interface Question {
  id: string;
  type: "mcq" | "written" | "file";
  question: string;
  options?: string[];
  correctOptionIndex?: number;
}

interface LectureExamProps {
  isOpen: boolean;
  onClose: () => void;
  lectureId: string;
  questions: Question[];
  isBigExam?: boolean;
  onPassed: () => void;
}

export function LectureExam({
  isOpen,
  onClose,
  lectureId,
  questions,
  isBigExam = false,
  onPassed,
}: LectureExamProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    needsGrading: boolean;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;

  const handleNext = () => {
    if (isLast) {
      submitExam();
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const v = validateFile(file, "examFile", false);
    if (!v.valid) { toast.error(v.error); return; }

    setSubmitting(true);
    try {
        const filePath = safeStoragePath("submissions", file.name);

        const { error: uploadError } = await supabase.storage.from("submissions").upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("submissions").getPublicUrl(filePath);
        setAnswers(prev => ({ ...prev, [questionId]: publicUrl }));
    } catch (err: any) {
        toast.error("File upload failed: " + err.message);
    } finally {
        setSubmitting(false);
    }
  };

  const submitExam = async () => {
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let mcqScore = 0;
      let mcqCount = 0;
      const formattedAnswers = questions.map((q) => {
        const answer = answers[q.id];
        let score = null;

        if (q.type === "mcq") {
          mcqCount++;
          if (answer === q.correctOptionIndex) {
            mcqScore++;
            score = 100;
          } else {
            score = 0;
          }
        }

        return {
          question_id: q.id,
          type: q.type,
          question: q.question,
          answer,
          score,
        };
      });

      const mcqPercentage = mcqCount > 0 ? (mcqScore / mcqCount) * 100 : 100;
      const needsGrading = questions.some((q) => q.type === "written" || q.type === "file");

      const { error } = await supabase.from("exam_submissions").insert({
        student_id: user.id,
        lecture_id: lectureId,
        answers: formattedAnswers,
        mcq_score: Math.round(mcqPercentage),
        total_grade: needsGrading ? null : Math.round(mcqPercentage),
      });

      if (error) throw error;

      setResult({
        score: Math.round(mcqPercentage),
        passed: mcqPercentage >= 50,
        needsGrading,
      });

      if (!needsGrading && mcqPercentage >= 50) {
        onPassed();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-card/90 backdrop-blur-xl"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-muted border border-border rounded-[40px] overflow-hidden shadow-2xl backdrop-blur-3xl"
      >
        <div className="p-8 md:p-12">
          {!result ? (
            <>
              <header className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tight">
                      {isBigExam ? "Big Exam Unit" : "Module Certification"}
                    </h2>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                      Question {currentIdx + 1} of {questions.length}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>

              <div className="space-y-8 min-h-[300px]">
                <h3 className="text-2xl font-black italic tracking-tighter leading-tight">
                  {currentQuestion.question}
                </h3>

                {currentQuestion.type === "mcq" ? (
                  <div className="grid grid-grid-cols-1 gap-3">
                    {currentQuestion.options?.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [currentQuestion.id]: idx }))
                        }
                        className={`p-6 rounded-2xl border transition-all text-left font-bold ${
                          answers[currentQuestion.id] === idx
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                            : "bg-muted/50 border-border hover:border-border"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] ${
                            answers[currentQuestion.id] === idx ? "bg-emerald-500 border-emerald-500 text-black" : "border-border text-muted-foreground"
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          {opt}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : currentQuestion.type === "file" ? (
                  <div className="space-y-4">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-48 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-emerald-500/50 transition-colors"
                    >
                        <FileText className="w-10 h-10 text-muted-foreground" />
                        <span className="font-bold text-muted-foreground">
                            {answers[currentQuestion.id] ? "File Selected" : "Click to Upload File"}
                        </span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, currentQuestion.id)} className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                  </div>
                ) : (
                  <textarea
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                    }
                    placeholder="Provide your detailed response..."
                    className="w-full h-48 p-6 bg-foreground/20 border border-border rounded-3xl outline-none focus:border-emerald-500/50 transition-all text-foreground font-medium resize-none"
                  />
                )}
              </div>

              <footer className="mt-12 flex justify-end gap-4">
                <HeroButton
                  onClick={handleNext}
                  disabled={answers[currentQuestion.id] === undefined || submitting}
                  className="px-10 h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest italic"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isLast ? (
                    "Finalize Sync"
                  ) : (
                    <div className="flex items-center gap-2">
                      Next Vector <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </HeroButton>
              </footer>
            </>
          ) : (
            <div className="text-center py-12 space-y-8">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ${
                result.passed ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
              }`}>
                {result.passed ? (
                  <Trophy className="w-12 h-12 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-red-400" />
                )}
              </div>
              <h2 className="text-4xl font-black italic tracking-tighter uppercase">
                {result.needsGrading ? "Submission Pending" : result.passed ? "Certification Approved" : "Sync Failed"}
              </h2>
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm max-w-sm mx-auto">
                {result.needsGrading 
                  ? "Your written responses have been sent to the moderator for manual evaluation."
                  : result.passed 
                    ? `Knowledge vector synchronized with ${result.score}% accuracy.` 
                    : `Accuracy of ${result.score}% is below threshold. Please review the module data.`
                }
              </p>
              <HeroButton
                onClick={onClose}
                variant="primary"
                className="mt-8 bg-primary text-black"
              >
                {result.passed || result.needsGrading ? "Return to Interface" : "Retry Sync"}
              </HeroButton>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
