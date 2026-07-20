import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "../lib/LanguageContext";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  const { isAr } = useLanguage();

  const sections = isAr ? [
    { title: "1. مقدمة", content: "نحن في ST-ROBOTICS نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح سياسة الخصوصية هذه كيف نجمع معلوماتك واستخدامها ونحميها عند استخدامك لمنصتنا التعليمية." },
    { title: "2. المعلومات التي نجمعها", content: "نجمع المعلومات التي تقدمها مباشرة عند إنشاء الحساب: الاسم الكامل والبريد الإلكتروني ورقم الهاتف والدور (طالب أو ولي أمر). كما نجمع معلومات الاستخدام مثل الصفحات التي تزورها والمدة التي تقضيها على المنصة والتقدم في الدورات." },
    { title: "3. كيف نستخدم معلوماتك", content: "نستخدم معلوماتك لإدارة حسابك وتوفير المحتوى التعليمي وتتبع تقدمك في التعلم. كما نستخدمها لتحسين المنصة والتواصل معك بشأن تحديثات الدورات والإشعارات المهمة." },
    { title: "4. مشاركة المعلومات", content: "لا نبيع معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك فقط في الحالات التالية: عند الطلب من الجهات الحكومية المختصة، أو عند الحاجة لحماية حقوقنا القانونية، أو مع مزودي الخدمات الذين يساعدون في تشغيل المنصة ويلتزمون بسرية البيانات." },
    { title: "5. أمن البيانات", content: "نتخذ إجراءات أمنية صارمة لحماية معلوماتك من الوصول غير المصرح به أو الاستخدام أو التغيير أو الإتلاف. نستخدم التشفير القياسي في الصناعات وأنظمة الحماية المناسبة." },
    { title: "6. ملفات تعريف الارتباط", content: "نستخدم ملفات تعريف الارتباط لتحسين تجربتك على المنصة. يمكنك التحكم في ملفات تعريف الارتباط من خلال إعدادات المتصفح الخاص بك." },
    { title: "7. حقوقك", content: "لديك الحق في الوصول إلى معلوماتك الشخصية وتصحيحها وحذفها. يمكنك أيضًا طلب نسخة من بياناتك أو طلب توقف معالجتها. لتمارسة هذه الحقوق، تواصل معنا عبر البريد الإلكتروني support@st-robotics.com" },
    { title: "8. الاحتفاظ بالبيانات", content: "نحتفظ بمعلوماتك طالما كان حسابك نشطًا أو حتى نحتاجها لتوفير الخدمات لك. عند حذف الحساب، نحذف معلوماتك الشخصية خلال 30 يومًا ما عدا المعلومات المطلوب الاحتفاظ بها قانونيًا." },
    { title: "9. خصوصية الأطفال", content: "المنصة مخصصة للمستخدمين بعمر 13 عامًا أو أكثر. لا نجمع معلومات شخصية من الأطفال دون إذن من ولي الأمر. إذا علمنا بجمع معلومات من طفل دون إذن، سنحذفها فورًا." },
    { title: "10. التغييرات على السياسة", content: "قد نحدّث سياسة الخصوصية هذه من وقت لآخر. سننشر أي تغييرات جوهرية على هذه الصفحة ون notifies you عبر البريد الإلكتروني." },
    { title: "11. معلومات الاتصال", content: "لأي استفسارات حول سياسة الخصوصية أو لتمارسة حقوقك، يرجى التواصل معنا عبر البريد الإلكتروني support@st-robotics.com" },
  ] : [
    { title: "1. Introduction", content: "At ST-ROBOTICS, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and protect your information when you use our educational platform." },
    { title: "2. Information We Collect", content: "We collect information you provide when creating an account: full name, email address, phone number, and role (student or parent). We also collect usage information such as pages visited, time spent on the platform, and course progress." },
    { title: "3. How We Use Your Information", content: "We use your information to manage your account, provide educational content, and track your learning progress. We also use it to improve the platform and communicate with you about course updates and important notifications." },
    { title: "4. Information Sharing", content: "We do not sell your personal information to third parties. We may share your information only in the following cases: when requested by competent government authorities, when necessary to protect our legal rights, or with service providers who help operate the platform and are bound by confidentiality." },
    { title: "5. Data Security", content: "We implement strict security measures to protect your information from unauthorized access, use, alteration, or destruction. We use industry-standard encryption and appropriate protection systems." },
    { title: "6. Cookies", content: "We use cookies to improve your experience on the platform. You can control cookies through your browser settings." },
    { title: "7. Your Rights", content: "You have the right to access, correct, and delete your personal information. You may also request a copy of your data or request to stop processing it. To exercise these rights, contact us at support@st-robotics.com" },
    { title: "8. Data Retention", content: "We retain your information as long as your account is active or until we need it to provide services to you. When you delete your account, we delete your personal information within 30 days except for information required to be retained by law." },
    { title: "9. Children's Privacy", content: "The platform is intended for users aged 13 or older. We do not collect personal information from children without parental consent. If we learn that we have collected information from a child without consent, we will delete it immediately." },
    { title: "10. Changes to This Policy", content: "We may update this Privacy Policy from time to time. We will post any material changes on this page and notify you via email." },
    { title: "11. Contact Information", content: "For any inquiries about this Privacy Policy or to exercise your rights, please contact us at support@st-robotics.com" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-12 md:py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            {isAr ? "العودة" : "Back"}
          </a>
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter mb-2">
            {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
          </h1>
          <p className="text-muted-foreground text-sm mb-10">{isAr ? "آخر تحديث: يوليو 2026" : "Last updated: July 2026"}</p>
          <div className="space-y-8">
            {sections.map((section, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <h2 className="text-lg font-bold mb-2">{section.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{section.content}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
