import { useState } from "react";
import { Link } from "wouter";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const copy = {
  en: { title: "Forgot your password?", description: "Enter your vendor account email and we’ll send you a reset link.", email: "Email address", send: "Send reset link", sending: "Sending...", sent: "Check your email", sentText: "If a vendor account exists for this email, a reset link has been sent.", back: "Back to vendor login", invalid: "Enter a valid email address", error: "Unable to send the reset link. Please try again." },
  ar: { title: "هل نسيت كلمة المرور؟", description: "أدخل بريد حساب البائع وسنرسل إليك رابط إعادة التعيين.", email: "البريد الإلكتروني", send: "إرسال رابط الاستعادة", sending: "جارٍ الإرسال...", sent: "تحقق من بريدك", sentText: "إذا كان هناك حساب بائع بهذا البريد، فقد تم إرسال رابط الاستعادة.", back: "العودة إلى دخول البائع", invalid: "أدخل بريداً إلكترونياً صالحاً", error: "تعذر إرسال الرابط. يرجى المحاولة مرة أخرى." },
  tr: { title: "Şifrenizi mi unuttunuz?", description: "Satıcı hesabınızın e-posta adresini girin; sıfırlama bağlantısı gönderelim.", email: "E-posta adresi", send: "Sıfırlama bağlantısı gönder", sending: "Gönderiliyor...", sent: "E-postanızı kontrol edin", sentText: "Bu e-postaya ait bir satıcı hesabı varsa sıfırlama bağlantısı gönderildi.", back: "Satıcı girişine dön", invalid: "Geçerli bir e-posta adresi girin", error: "Bağlantı gönderilemedi. Lütfen tekrar deneyin." },
  fa: { title: "رمز عبور را فراموش کرده‌اید؟", description: "ایمیل حساب وندر را وارد کنید تا لینک بازیابی برایتان ارسال شود.", email: "آدرس ایمیل", send: "ارسال لینک بازیابی", sending: "در حال ارسال...", sent: "ایمیل خود را بررسی کنید", sentText: "اگر حساب وندری با این ایمیل وجود داشته باشد، لینک بازیابی ارسال شده است.", back: "بازگشت به ورود وندر", invalid: "یک ایمیل معتبر وارد کنید", error: "ارسال لینک ممکن نشد. دوباره تلاش کنید." },
};

export default function VendorForgotPassword() {
  const { language, direction } = useLanguage();
  const t = copy[language];
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t.invalid);
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/vendors/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setSent(true);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir={direction} className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {sent ? <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /> : <Mail className="mx-auto h-12 w-12 text-purple-600" />}
          <CardTitle>{sent ? t.sent : t.title}</CardTitle>
          <CardDescription>{sent ? t.sentText : t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {!sent && <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium">{t.email}</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-testid="input-vendor-reset-email" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={loading} data-testid="button-vendor-reset-request">
              {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{loading ? t.sending : t.send}
            </Button>
          </form>}
          <Link href="/vendor/login"><Button variant="ghost" className="mt-4 w-full">{t.back}</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}