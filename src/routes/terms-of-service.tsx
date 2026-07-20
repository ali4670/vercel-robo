import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "../lib/LanguageContext";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/terms-of-service")({
  component: TermsOfService,
});

function TermsOfService() {
  const { isAr } = useLanguage();

  const sections = isAr ? [
    {
      title: "1. قبول الشروط",
      content: "باستخدامك لمنصة ST-ROBOTICS، فإنك توافق على هذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام المنصة. نحتفظ بحق تعديل هذه الشروط في أي وقت دون إشعار مسبق."
    },
    {
      title: "2. استخدام المنصة",
      content: "المنصة مخصصة للاستخدام التعليمي الشخصي فقط. يُمنع استخدام المنصة لأي غرض غير قانوني أو ضار. أنت مسؤول عن الحفاظ على سرية بيانات حسابك وجميع الأنشطة التي تحدث تحت حسابك."
    },
    {
      title: "3. الحسابات",
      content: "يجب أن يكون عمرك 13 عاماً أو أكثر لإنشاء حساب. الحسابات متعددة ممنوعة. نحتفظ بحق تعليق أو حذف الحسابات التي تنتهك هذه الشروط. أنت مسؤول عن تحديث معلومات حسابك."
    },
    {
      title: "4. المحتوى التعليمي",
      content: "جميع الدورات والمحتوى التعليمي محمي بحقوق الملكية الفكرية. يُمنَع نسخ أو توزيع أو إعادة بيع المحتوى التعليمي دون إذن كتابي مسبق. الوصول إلى المحتوى مقيد بالاشتراكات والصلاحيات الممنوحة لك."
    },
    {
      title: "5. الدفع والاسترداد",
      content: "جميع المدفوعات نهائية ولا يمكن استردادها إلا في الحالات المنصوص عليها في سياسة الاسترداد. الأسعار قابلة للتغيير دون إشعار مسبق. يحق لنا تعليق الوصول في حالة عدم الدفع."
    },
    {
      title: "6. سلوك المستخدم",
      content: "يُمنع قلّة الاحترام أو التحرش أو التمييز أو العنف بأي شكل. يُمنع مشاركة محتوى مسيء أو غير قانوني. يُمنع محاولة اختراق النظام أو الوصول غير المصرح به. نحتفظ بحق حذف أي محتوى ينتهك هذه القواعد."
    },
    {
      title: "7. الخصوصية",
      content: "جمعنا واستخدامنا لمعلوماتك موثق في سياسة الخصوصية الخاصة بنا. باستخدامك للمنصة، فإنك توافق على جمع واستخدام هذه المعلومات كما هو موضح في سياسة الخصوصية."
    },
    {
      title: "8. حدود المسؤولية",
      content: "المنصة مقدمة \"كما هي\" دون ضمانات من أي نوع. لا نتحمل المسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام المنصة. لا نضمن دقة المحتوى التعليمي أو نتائج التعلم."
    },
    {
      title: "9. تعليق أو إنهاء الحساب",
      content: "نحتفظ بحق تعليق أو إنهاء حسابك في أي وقت دون إشعار مسبق إذا انتهكت هذه الشروط. يمكنك إنهاء حسابك في أي من خلال إعدادات الحساب. التعليق أو الإنهاء لا يخليك من التزاماتك السابقة."
    },
    {
      title: "10. التغييرات على الشروط",
      content: "نحتفظ بحق تعديل هذه الشروط في أي وقت. الاستمرار في استخدام المنصة بعد التغييرات يعتبر قبولاً لها. سننشر أي تغييرات جوهرية على هذه الصفحة."
    },
    {
      title: "11. القانون الحاكم",
      content: "تخضع هذه الشروط لقوانين المملكة العربية السعودية. أي نزاع ينشأ عن استخدام المنصة يخضع لاختصاص المحاكم المختصة في الرياض."
    },
    {
      title: "12. معلومات الاتصال",
      content: "لأي استفسارات حول هذه الشروط، يرجى التواصل معنا عبر البريد الإلكتروني support@st-robotics.com"
    },
  ] : [
    {
      title: "1. Acceptance of Terms",
      content: "By using the ST-ROBOTICS platform, you agree to these Terms and Conditions. If you do not agree to any part of these terms, please do not use the platform. We reserve the right to modify these terms at any time without prior notice."
    },
    {
      title: "2. Platform Usage",
      content: "The platform is intended for personal educational use only. Using the platform for any illegal or harmful purpose is prohibited. You are responsible for maintaining the confidentiality of your account credentials and all activities that occur under your account."
    },
    {
      title: "3. Accounts",
      content: "You must be 13 years or older to create an account. Multiple accounts are prohibited. We reserve the right to suspend or delete accounts that violate these terms. You are responsible for keeping your account information up to date."
    },
    {
      title: "4. Educational Content",
      content: "All courses and educational content are protected by intellectual property rights. Copying, distributing, or reselling educational content without prior written permission is prohibited. Access to content is restricted to subscriptions and permissions granted to you."
    },
    {
      title: "5. Payments and Refunds",
      content: "All payments are final and non-refundable except as outlined in our refund policy. Prices are subject to change without notice. We reserve the right to suspend access in case of non-payment."
    },
    {
      title: "6. User Conduct",
      content: "Disrespectful behavior, harassment, discrimination, or violence in any form is prohibited. Sharing offensive or illegal content is prohibited. Attempting to hack the system or gain unauthorized access is prohibited. We reserve the right to delete any content that violates these rules."
    },
    {
      title: "7. Privacy",
      content: "Our collection and use of your information is documented in our Privacy Policy. By using the platform, you agree to the collection and use of this information as described in the Privacy Policy."
    },
    {
      title: "8. Limitation of Liability",
      content: "The platform is provided \"as is\" without warranties of any kind. We are not liable for any direct or indirect damages arising from the use of the platform. We do not guarantee the accuracy of educational content or learning outcomes."
    },
    {
      title: "9. Account Suspension or Termination",
      content: "We reserve the right to suspend or terminate your account at any time without prior notice if you violate these terms. You may terminate your account at any time through account settings. Suspension or termination does not release you from previous obligations."
    },
    {
      title: "10. Changes to Terms",
      content: "We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance. We will post any material changes on this page."
    },
    {
      title: "11. Governing Law",
      content: "These terms are governed by the laws of the Kingdom of Saudi Arabia. Any dispute arising from the use of the platform is subject to the jurisdiction of the competent courts in Riyadh."
    },
    {
      title: "12. Contact Information",
      content: "For any inquiries regarding these terms, please contact us at support@st-robotics.com"
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {isAr ? "العودة" : "Back"}
          </a>

          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter mb-2">
            {isAr ? "شروط الاستخدام" : "Terms of Service"}
          </h1>
          <p className="text-muted-foreground text-sm mb-10">
            {isAr ? "آخر تحديث: يوليو 2026" : "Last updated: July 2026"}
          </p>

          <div className="space-y-8">
            {sections.map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
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
