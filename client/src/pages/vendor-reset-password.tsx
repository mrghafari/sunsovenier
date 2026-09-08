import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const copy = {
  en: { title: "Set a new password", description: "Choose a new password for your vendor account.", password: "New password", confirm: "Confirm password", save: "Update password", saving: "Updating...", success: "Password updated", successText: "You can now sign in with your new password.", login: "Go to vendor login", invalid: "This reset link is invalid or has expired.", mismatch: "Passwords do not match.", short: "Password must be at least 6 characters.", error: "Unable to update the password." },
  ar: { title: "تعيين كلمة مرور جديدة", description: "اختر كلمة مرور جديدة لحساب البائع.", password: "كلمة المرور الجديدة", confirm: "تأكيد كلمة المرور", save: "تحديث كلمة المرور", saving: "جارٍ التحديث...", success: "تم تحديث كلمة المرور", successText: "يمكنك الآن الدخول باستخدام كلمة المرور الجديدة.", login: "الذهاب إلى دخول البائع", invalid: "رابط الاستعادة غير صالح أو منتهي الصلاحية.", mismatch: "كلمتا المرور غير متطابقتين.", short: "يجب ألا تقل كلمة المرور عن 6 أحرف.", error: "تعذر تحديث كلمة المرور." },
  tr: { title: "Yeni şifre belirleyin", description: "Satıcı hesabınız için yeni bir şifre seçin.", password: "Yeni şifre", confirm: "Şifreyi doğrulayın", save: "Şifreyi güncelle", saving: "Güncelleniyor...", success: "Şifre güncellendi", successText: "Artık yeni şifrenizle giriş yapabilirsiniz.", login: "Satıcı girişine git", invalid: "Bu sıfırlama bağlantısı geçersiz veya süresi dolmuş.", mismatch: "Şifreler eşleşmiyor.", short: "Şifre en az 6 karakter olmalıdır.", error: "Şifre güncellenemedi." },
  fa: { title: "تعیین رمز عبور جدید", description: "برای حساب وندر خود یک رمز عبور جدید انتخاب کنید.", password: "رمز عبور جدید", confirm: "تکرار رمز عبور", save: "تغییر رمز عبور", saving: "در حال تغییر...", success: "رمز عبور تغییر کرد", successText: "اکنون می‌توانید با رمز جدید وارد شوید.", login: "رفتن به ورود وندر", invalid: "این لینک بازیابی نامعتبر است یا منقضی شده است.", mismatch: "رمزهای عبور یکسان نیستند.", short: "رمز عبور باید حداقل ۶ کاراکتر باشد.", error: "تغییر رمز عبور ممکن نشد." },
};

export default function VendorResetPassword() {
  const { language, direction } = useLanguage();
  const t = copy[language];
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/vendors/auth/password-reset-verify?token=${encodeURIComponent(token)}`)
      .then((r) => r.json().then((body) => r.ok && body.success))
      .then(setValid).catch(() => setValid(false));
  }, [token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (password.length < 6) return setError(t.short);
    if (password !== confirm) return setError(t.mismatch);
    setLoading(true);
    try {
      const response = await fetch("/api/vendors/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword: password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setSuccess(true);
    } catch {
      setError(t.error);
    } finally { setLoading(false); }
  }

  return (
    <div dir={direction} className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {success ? <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /> : <LockKeyhole className="mx-auto h-12 w-12 text-purple-600" />}
          <CardTitle>{success ? t.success : t.title}</CardTitle>
          <CardDescription>{success ? t.successText : t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {valid === null && <Loader2 className="mx-auto h-8 w-8 animate-spin" />}
          {valid === false && <p className="text-center text-destructive">{t.invalid}</p>}
          {valid && !success && <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium">{t.password}</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <label className="block text-sm font-medium">{t.confirm}</label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={loading}>{loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{loading ? t.saving : t.save}</Button>
          </form>}
          {(success || valid === false) && <Link href="/vendor/login"><Button className="mt-4 w-full">{t.login}</Button></Link>}
        </CardContent>
      </Card>
    </div>
  );
}