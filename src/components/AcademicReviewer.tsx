import React, { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Brain, Zap, GitBranch, Loader2 } from "lucide-react";
import { HeroButton } from "../funs/HeroButton";

interface AcademicReviewProps {
  content: string;
  title: string;
  isAr: boolean;
}

export const AcademicReviewer = ({
  content,
  title,
  isAr,
}: AcademicReviewProps) => {
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateReview = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "user",
                content: `Analyze the following academic content and provide a summary, a blueprint of 2 key concepts with definitions/mechanisms/pitfalls, an explanation of their interconnectivity, and 3 practical application scenarios. Return the response in JSON format.
            Content: ${content}`,
              },
            ],
            response_format: { type: "json_object" },
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to generate review");

      const data = await response.json();
      const reviewData = JSON.parse(data.choices[0].message.content);
      setReview(reviewData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-1 rounded-[2.5rem] bg-muted border border-border group overflow-hidden">
      <div className="bg-muted/50 border border-border rounded-[calc(2.5rem-0.25rem)] p-8 md:p-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.3em] rounded-full">
                Cognitive Suite
              </span>
              <div className="h-px w-6 bg-muted"></div>
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
              {isAr ? "المراجع الأكاديمي" : "Academic Context Reviewer"}
            </h2>
          </div>
          <HeroButton
            onClick={generateReview}
            disabled={loading || !!review}
            className="w-full md:w-auto flex items-center gap-3 px-8 h-14 bg-muted/50 border border-border text-foreground rounded-[1.25rem] font-black uppercase tracking-widest italic hover:bg-primary hover:text-black hover:scale-105 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Brain className="w-4 h-4" />{" "}
                {isAr ? "إنشاء المراجعة" : "SYNTHESIZE CONTENT"}
              </>
            )}
          </HeroButton>
        </div>

        {review && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-10"
          >
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground">
                  {isAr ? "الملخص التنفيذي" : "EXECUTIVE SUMMARY"}
                </h3>
              </div>
              <p className="text-lg md:text-xl text-foreground/80 leading-relaxed font-medium selection:bg-primary/40 italic tracking-tight">
                {review.summary}
              </p>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground">
                  {isAr ? "هيكلية المعلومات" : "CORE INFORMATION HIERARCHY"}
                </h3>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {review.blueprint.map((c: any, i: number) => (
                  <div
                    key={i}
                    className="p-0.5 rounded-[2rem] bg-muted border border-border group/card"
                  >
                    <div className="bg-muted/50 p-6 rounded-[calc(2rem-0.125rem)] h-full border border-border transition-colors group-hover/card:border-border">
                      <p className="font-black uppercase tracking-widest text-primary text-xs mb-3">
                        {c.name}
                      </p>
                      <p className="text-xs text-foreground/60 leading-relaxed mb-4">
                        {c.definition}
                      </p>
                      <div className="pt-3 border-t border-border">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">
                          Pitfall:
                        </p>
                        <p className="text-[9px] font-bold text-red-400/60">
                          {c.pitfall}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}
      </div>
    </div>
  );
};
