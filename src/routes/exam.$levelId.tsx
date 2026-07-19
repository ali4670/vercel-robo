import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-code";
import { useLanguage } from "../lib/LanguageContext";
import { useAuth } from "../hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import { HeroButton } from "../funs/HeroButton";
import { toast } from "sonner";

export const Route = createFileRoute("/exam/$levelId")({
  component: ExamPage,
});

interface Question {
  id: string;
  text: string;
  options: string[];
  correct: number;
}

interface Exam {
  id: string;
  title: string;
  questions: Question[];
}

function ExamPage() {
  const { levelId } = Route.useParams();
  const { isAr } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (user) fetchExam();
  }, [levelId, user]);

  const fetchExam = async () => {
    try {
      // 1. Check attempt count (Limit 2)
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("id")
        .eq("student_id", user!.id)
        .eq("level_id", levelId);

      const attemptCount = attempts?.length || 0;
      if (attemptCount >= 2) {
        setAlreadyTaken(true);
        setLoading(false);
        return;
      }

      // 2. Fetch Exam
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("level_id", levelId)
        .single();

      if (error || !data || (data.questions as Question[]).length !== 3) {
        toast.error(
          "Exam requires exactly 3 questions. Please contact an admin.",
        );
        setLoading(false);
        return;
      }

      setExam({
        id: data.id,
        title: data.title,
        questions: data.questions as Question[],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < (exam?.questions.length || 0) - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      finishExam();
    }
  };

  const finishExam = async () => {
    if (!exam || !user) return;

    let correctCount = 0;
    const responses = exam.questions.map((q, i) => {
      const isCorrect = answers[i] === q.correct;
      if (isCorrect) correctCount++;
      return {
        question_id: q.id,
        selected_option: answers[i],
        is_correct: isCorrect,
      };
    });

    const finalScore = Math.round((correctCount / exam.questions.length) * 100);
    setScore(finalScore);
    setIsFinished(true);

    try {
      // 1. Insert Attempt
      const { data: attempt, error: attemptError } = await supabase
        .from("exam_attempts")
        .insert([
          {
            student_id: user.id,
            level_id: levelId,
            score: finalScore,
            total_questions: exam.questions.length,
          },
        ])
        .select("id")
        .single();

      if (attemptError) throw attemptError;

      // 2. Insert Responses
      const responsesToInsert = responses.map((r) => ({
        ...r,
        attempt_id: attempt.id,
      }));

      const { error: responseError } = await supabase
        .from("exam_responses")
        .insert(responsesToInsert);

      if (responseError) throw responseError;

      if (finalScore >= 70) {
        toast.success(
          isAr
            ? "مبروك! لقد اجتزت التقييم."
            : "Congratulations! You passed the evaluation.",
        );
      } else {
        toast.error(
          isAr
            ? "لم تجتز التقييم. حاول مرة أخرى."
            : "Evaluation failed. Please try again.",
        );
      }
    } catch (err: any) {
      console.error("Save failed:", err);
      toast.error(
        isAr ? "فشل حفظ النتيجة" : "Failed to save evaluation results.",
      );
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#0a2610] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (alreadyTaken)
    return (
      <div className="min-h-screen bg-[#0a2610] text-foreground flex items-center justify-center p-6 text-center">
        <div className="bg-foreground/20 backdrop-blur-2xl border border-border rounded-[48px] p-16 shadow-2xl">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-8" />
          <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">
            {isAr ? "تم إجراء الاختبار مسبقاً" : "EVALUATION ALREADY COMPLETED"}
          </h2>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm mb-8">
            {isAr
              ? "لا يمكنك إجراء الاختبار أكثر من مرة واحدة."
              : "You cannot take the evaluation more than once."}
          </p>
          <HeroButton
            onClick={() => navigate({ to: "/levels" })}
            className="bg-white text-black px-10 h-14"
          >
            {isAr ? "العودة للمسار" : "BACK TO PATH"}
          </HeroButton>
        </div>
      </div>
    );

  if (!exam) return null;

  return (
    <div className="min-h-screen bg-[#0a2610] text-foreground p-6 relative overflow-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0"></div>

      <div className="container mx-auto max-w-4xl relative z-10 pt-10">
        <header className="mb-12 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">
              {exam.title}
            </h1>
          </div>
          <div className="h-[2px] w-32 bg-primary/30 mx-auto" />
        </header>

        <AnimatePresence mode="wait">
          {!isFinished ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-foreground/20 backdrop-blur-2xl border border-border rounded-[48px] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-lime-500">
                  QUESTION {currentQuestion + 1} OF {exam.questions.length}
                </span>
                <div className="h-1 flex-grow mx-8 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-lime-500"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((currentQuestion + 1) / exam.questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-10 leading-relaxed">
                {exam.questions[currentQuestion].text}
              </h2>

              <div className="grid gap-4">
                {exam.questions[currentQuestion].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={`w-full p-6 rounded-3xl border text-left transition-all duration-300 font-bold flex items-center gap-4 ${
                      answers[currentQuestion] === idx
                        ? "bg-lime-500 border-lime-400 text-black shadow-[0_0_20px_rgba(163,230,53,0.3)]"
                        : "bg-muted/50 border-border hover:border-border"
                    } ${isAr ? "flex-row-reverse text-right" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs ${
                        answers[currentQuestion] === idx
                          ? "border-black/20 bg-foreground/10"
                          : "border-border bg-muted/50"
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </div>
                    {option}
                  </button>
                ))}
              </div>

              <div className="flex justify-between mt-12 pt-8 border-t border-border">
                <HeroButton
                  onClick={() =>
                    setCurrentQuestion((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentQuestion === 0}
                  variant="outline"
                  className="px-8"
                >
                  {isAr ? "السابق" : "PREVIOUS"}
                </HeroButton>
                <HeroButton
                  onClick={nextQuestion}
                  disabled={answers[currentQuestion] === undefined}
                  variant="primary"
                  className="px-10 bg-primary text-black"
                >
                  {currentQuestion === exam.questions.length - 1
                    ? isAr
                      ? "إنهاء"
                      : "FINISH"
                    : isAr
                      ? "التالي"
                      : "NEXT"}
                </HeroButton>
              </div>
            </motion.div>
          ) : !isReviewing ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-foreground/20 backdrop-blur-2xl border border-border rounded-[48px] p-16 text-center shadow-2xl"
            >
              <div
                className={`w-32 h-32 rounded-[40px] mx-auto mb-10 flex items-center justify-center ${
                  score >= 70
                    ? "bg-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]"
                    : "bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]"
                }`}
              >
                {score >= 70 ? (
                  <Trophy className="w-16 h-16 text-foreground" />
                ) : (
                  <ShieldAlert className="w-16 h-16 text-foreground" />
                )}
              </div>

              <h2 className="text-5xl font-black italic tracking-tighter mb-4">
                {score}% {isAr ? "النتيجة" : "SCORE"}
              </h2>

              <p className="text-muted-foreground font-bold uppercase tracking-[0.4em] mb-12">
                {score >= 70
                  ? isAr
                    ? "تم إكمال التقييم بنجاح"
                    : "EVALUATION PROTOCOL PASSED"
                  : isAr
                    ? "لم يتم استيفاء معايير النجاح"
                    : "BENCHMARK NOT REACHED"}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <HeroButton
                  onClick={() => navigate({ to: "/levels" })}
                  variant="primary"
                  className="px-10 bg-white text-black h-14"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {isAr ? "العودة للمسار" : "BACK TO PATH"}
                </HeroButton>
                <HeroButton
                  onClick={() => setIsReviewing(true)}
                  variant="outline"
                  className="px-10 h-14"
                >
                  {isAr ? "مراجعة الإجابات" : "REVIEW ANSWERS"}
                </HeroButton>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-foreground/20 backdrop-blur-2xl border border-border rounded-[48px] p-10 shadow-2xl"
            >
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8">
                {isAr ? "مراجعة الاختبار" : "EXAM REVIEW"}
              </h2>
              <div className="grid gap-6">
                {exam.questions.map((q, i) => {
                  const isCorrect = answers[i] === q.correct;
                  const questionText = q.text || `Question ${i + 1}`;
                  const options = q.options || [];
                  return (
                    <div
                      key={q.id || i}
                      className={`p-6 rounded-3xl border ${isCorrect ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}
                    >
                      <p className="font-bold mb-4">
                        {i + 1}. {questionText}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border ${
                              optIdx === q.correct
                                ? "bg-green-500/20 border-green-500"
                                : answers[i] === optIdx
                                  ? "bg-red-500/20 border-red-500"
                                  : "bg-muted/50 border-border"
                            }`}
                          >
                            {opt || `Option ${optIdx + 1}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <HeroButton
                onClick={() => setIsReviewing(false)}
                className="mt-10 w-full"
                variant="outline"
              >
                {isAr ? "إغلاق المراجعة" : "CLOSE REVIEW"}
              </HeroButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
