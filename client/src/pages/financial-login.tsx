import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const loginTranslations = {
  en: {
    title: "Financial Approval",
    description: "Sign in to the financial approval system",
    username: "Username",
    usernamePlaceholder: "Enter your username",
    usernameRequired: "Username is required",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    passwordRequired: "Password is required",
    showPassword: "Show password",
    hidePassword: "Hide password",
    submit: "Sign in to Financial Approval",
    loading: "Signing in...",
    successTitle: "Login Successful",
    successDescription: "Welcome to Financial Approval",
    loginError: "Login Error",
    invalidCredentials: "Incorrect username or password",
    connectionError: "Connection Error",
    connectionErrorDescription: "There was a problem connecting to the server",
  },
  fa: {
    title: "تأیید مالی",
    description: "ورود به سامانه تأیید مالی",
    username: "نام کاربری",
    usernamePlaceholder: "نام کاربری خود را وارد کنید",
    usernameRequired: "نام کاربری الزامی است",
    password: "رمز عبور",
    passwordPlaceholder: "رمز عبور خود را وارد کنید",
    passwordRequired: "رمز عبور الزامی است",
    showPassword: "نمایش رمز عبور",
    hidePassword: "پنهان کردن رمز عبور",
    submit: "ورود به تأیید مالی",
    loading: "در حال ورود...",
    successTitle: "ورود موفق",
    successDescription: "به تأیید مالی خوش آمدید",
    loginError: "خطا در ورود",
    invalidCredentials: "نام کاربری یا رمز عبور اشتباه است",
    connectionError: "خطای اتصال",
    connectionErrorDescription: "مشکلی در اتصال به سرور پیش آمد",
  },
  ar: {
    title: "الموافقة المالية",
    description: "تسجيل الدخول إلى نظام الموافقة المالية",
    username: "اسم المستخدم",
    usernamePlaceholder: "أدخل اسم المستخدم",
    usernameRequired: "اسم المستخدم مطلوب",
    password: "كلمة المرور",
    passwordPlaceholder: "أدخل كلمة المرور",
    passwordRequired: "كلمة المرور مطلوبة",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    submit: "تسجيل الدخول إلى الموافقة المالية",
    loading: "جارٍ تسجيل الدخول...",
    successTitle: "تم تسجيل الدخول بنجاح",
    successDescription: "مرحباً بك في الموافقة المالية",
    loginError: "خطأ في تسجيل الدخول",
    invalidCredentials: "اسم المستخدم أو كلمة المرور غير صحيحة",
    connectionError: "خطأ في الاتصال",
    connectionErrorDescription: "حدثت مشكلة أثناء الاتصال بالخادم",
  },
  tr: {
    title: "Finansal Onay",
    description: "Finansal onay yönetim sistemine giriş yapın",
    username: "Kullanıcı adı",
    usernamePlaceholder: "Kullanıcı adınızı girin",
    usernameRequired: "Kullanıcı adı gereklidir",
    password: "Şifre",
    passwordPlaceholder: "Şifrenizi girin",
    passwordRequired: "Şifre gereklidir",
    showPassword: "Şifreyi göster",
    hidePassword: "Şifreyi gizle",
    submit: "Finansal Onaya giriş yap",
    loading: "Giriş yapılıyor...",
    successTitle: "Giriş Başarılı",
    successDescription: "Finansal Onaya hoş geldiniz",
    loginError: "Giriş Hatası",
    invalidCredentials: "Kullanıcı adı veya şifre hatalı",
    connectionError: "Bağlantı Hatası",
    connectionErrorDescription: "Sunucuya bağlanırken bir sorun oluştu",
  },
} as const;

type LoginLanguage = keyof typeof loginTranslations;
type LoginFormData = {
  username: string;
  password: string;
};

export default function FinancialLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const currentLanguage = (language in loginTranslations ? language : "en") as LoginLanguage;
  const t = loginTranslations[currentLanguage];
  const loginSchema = useMemo(
    () =>
      z.object({
        username: z.string().min(1, t.usernameRequired),
        password: z.string().min(1, t.passwordRequired),
      }),
    [t],
  );

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/financial/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: t.successTitle,
          description: t.successDescription,
        });
        setLocation('/financial');
      } else {
        const serverMessage = typeof result?.message === "string" ? result.message : "";
        const description =
          serverMessage === "نام کاربری یا رمز عبور اشتباه است" ||
          serverMessage === "Invalid credentials"
            ? t.invalidCredentials
            : serverMessage === "خطا در ورود" || serverMessage === "Login Error"
              ? t.loginError
              : t.invalidCredentials;
        toast({
          title: t.loginError,
          description,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t.connectionError,
        description: t.connectionErrorDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir={direction}
      lang={currentLanguage}
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">{t.title}</CardTitle>
          <CardDescription className="text-gray-600">
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
                    <FormLabel>{t.username}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t.usernamePlaceholder}
                        autoComplete="username"
                        disabled={isLoading}
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
                    <FormLabel>{t.password}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder={t.passwordPlaceholder}
                          autoComplete="current-password"
                          disabled={isLoading}
                          className={direction === "rtl" ? "pl-10" : "pr-10"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={`absolute top-0 h-full px-3 py-2 hover:bg-transparent ${
                            direction === "rtl" ? "left-0" : "right-0"
                          }`}
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                          aria-label={showPassword ? t.hidePassword : t.showPassword}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? t.loading : t.submit}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}