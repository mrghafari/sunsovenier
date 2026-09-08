import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Store, Loader2, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const vendorLoginTranslations = {
  en: {
    title: "Vendor Login",
    description: "Login to your store management panel",
    usernameLabel: "Email / Username",
    usernamePlaceholder: "vendor@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    loginButton: "Login to Panel",
    loggingIn: "Logging in...",
    notRegistered: "Not registered yet?",
    registerButton: "Register as a Vendor",
    backToHome: "Back to Home",
    loginSuccess: "Login Successful",
    welcomeMessage: "Welcome",
    loginError: "Login Error",
    invalidCredentials: "Invalid email or password",
    usernameRequired: "Please enter username or email",
    passwordRequired: "Password must be at least 6 characters",
    forgotPassword: "Forgot password?",
  },
  ar: {
    title: "دخول البائع",
    description: "سجّل الدخول إلى لوحة إدارة متجرك",
    usernameLabel: "البريد الإلكتروني / اسم المستخدم",
    usernamePlaceholder: "vendor@example.com",
    passwordLabel: "كلمة المرور",
    passwordPlaceholder: "••••••••",
    loginButton: "الدخول إلى اللوحة",
    loggingIn: "جاري الدخول...",
    notRegistered: "لم تسجل بعد؟",
    registerButton: "سجّل كبائع",
    backToHome: "العودة إلى الصفحة الرئيسية",
    loginSuccess: "تم الدخول بنجاح",
    welcomeMessage: "مرحباً",
    loginError: "خطأ في الدخول",
    invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    usernameRequired: "الرجاء إدخال اسم المستخدم أو البريد الإلكتروني",
    passwordRequired: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    forgotPassword: "نسيت كلمة المرور؟",
  },
  ku: {
    title: "چوونەژوورەوەی فرۆشیار",
    description: "بچۆرە ناو پانێڵی بەڕێوەبردنی فرۆشگاکەت",
    usernameLabel: "ئیمەیڵ / ناوی بەکارهێنەر",
    usernamePlaceholder: "vendor@example.com",
    passwordLabel: "وشەی نهێنی",
    passwordPlaceholder: "••••••••",
    loginButton: "چوونەژوورەوە بۆ پانێڵ",
    loggingIn: "چوونەژوورەوە...",
    notRegistered: "هێشتا تۆمار نەکراویت؟",
    registerButton: "وەک فرۆشیار تۆمار بکە",
    backToHome: "گەڕانەوە بۆ ماڵەوە",
    loginSuccess: "چوونەژوورەوە سەرکەوتوو بوو",
    welcomeMessage: "بەخێربێیت",
    loginError: "هەڵەی چوونەژوورەوە",
    invalidCredentials: "ئیمەیڵ یان وشەی نهێنی هەڵەیە",
    usernameRequired: "تکایە ناوی بەکارهێنەر یان ئیمەیڵ بنووسە",
    passwordRequired: "وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت",
    forgotPassword: "وشەی نهێنیت لەبیر کردووە؟",
  },
  tr: {
    title: "Satıcı Girişi",
    description: "Mağaza yönetim panelinize giriş yapın",
    usernameLabel: "E-posta / Kullanıcı Adı",
    usernamePlaceholder: "vendor@example.com",
    passwordLabel: "Şifre",
    passwordPlaceholder: "••••••••",
    loginButton: "Panele Giriş",
    loggingIn: "Giriş yapılıyor...",
    notRegistered: "Henüz kayıt olmadınız mı?",
    registerButton: "Satıcı Olarak Kayıt Ol",
    backToHome: "Ana Sayfaya Dön",
    loginSuccess: "Giriş Başarılı",
    welcomeMessage: "Hoş geldiniz",
    loginError: "Giriş Hatası",
    invalidCredentials: "E-posta veya şifre yanlış",
    usernameRequired: "Kullanıcı adı veya e-posta girin",
    passwordRequired: "Şifre en az 6 karakter olmalıdır",
    forgotPassword: "Şifrenizi mi unuttunuz?",
  },
  fa: {
    title: "ورود فروشنده",
    description: "به پنل مدیریت فروشگاه خود وارد شوید",
    usernameLabel: "ایمیل / نام کاربری",
    usernamePlaceholder: "vendor@example.com",
    passwordLabel: "رمز عبور",
    passwordPlaceholder: "••••••••",
    loginButton: "ورود به پنل",
    loggingIn: "در حال ورود...",
    notRegistered: "هنوز ثبت نام نکرده‌اید؟",
    registerButton: "ثبت نام به عنوان فروشنده",
    backToHome: "بازگشت به صفحه اصلی",
    loginSuccess: "ورود موفق",
    welcomeMessage: "خوش آمدید",
    loginError: "خطا در ورود",
    invalidCredentials: "ایمیل یا رمز عبور اشتباه است",
    usernameRequired: "نام کاربری یا ایمیل را وارد کنید",
    passwordRequired: "رمز عبور باید حداقل 6 کاراکتر باشد",
    forgotPassword: "رمز عبور را فراموش کرده‌اید؟",
  },
};

type LoginForm = z.infer<ReturnType<typeof createLoginSchema>>;

function createLoginSchema(t: typeof vendorLoginTranslations.en) {
  return z.object({
    username: z.string().min(3, t.usernameRequired),
    password: z.string().min(6, t.passwordRequired),
  });
}

export default function VendorLogin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language, direction } = useLanguage();
  
  const t = vendorLoginTranslations[language as keyof typeof vendorLoginTranslations] || vendorLoginTranslations.en;
  const loginSchema = createLoginSchema(t);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      return apiRequest("/api/vendors/auth/login", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: (data) => {
      toast({
        title: `✅ ${t.loginSuccess}`,
        description: `${t.welcomeMessage} ${data.vendor?.vendorName || ''}`,
        variant: "default",
      });
      setLocation("/vendor/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: `❌ ${t.loginError}`,
        description: error.message || t.invalidCredentials,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4"
      dir={direction}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <CardTitle className="text-2xl">{t.title}</CardTitle>
          <CardDescription>
            {t.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.usernameLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={t.usernamePlaceholder}
                        {...field}
                        data-testid="input-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.passwordLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t.passwordPlaceholder}
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className={direction === "rtl" ? "text-left" : "text-right"}>
                <Link href="/vendor/forgot-password" className="text-sm text-purple-700 hover:underline">
                  {t.forgotPassword}
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.loggingIn}
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    {t.loginButton}
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {t.notRegistered}
            </p>
            <Link href="/vendor-registration">
              <Button variant="outline" className="w-full" data-testid="link-register">
                {t.registerButton}
              </Button>
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t text-center">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-home">
                {t.backToHome}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
