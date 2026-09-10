import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';

type LoginForm = {
  email: string;
  password: string;
};

const loginCopy = {
  en: {
    backHome: 'Back to home',
    title: 'Customer Login',
    subtitle: 'Welcome to the Momtaz Chem customer portal',
    email: 'Email',
    invalidEmail: 'Please enter a valid email address',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    passwordRequired: 'Password is required',
    login: 'Login',
    loggingIn: 'Logging in...',
    success: 'Login successful',
    successDescription: 'You have successfully logged in',
    error: 'Login error',
    invalidCredentials: 'Email or password is incorrect',
    serverError: 'Unable to connect to the server. Please try again',
    forgotPassword: 'Forgot your password?',
    noAccount: "Don't have an account?",
    register: 'Register',
    support: 'For help and support, contact us:',
  },
  ar: {
    backHome: 'العودة إلى الصفحة الرئيسية',
    title: 'تسجيل دخول العملاء',
    subtitle: 'مرحباً بك في بوابة عملاء Momtaz Chem',
    email: 'البريد الإلكتروني',
    invalidEmail: 'يرجى إدخال بريد إلكتروني صالح',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    passwordRequired: 'كلمة المرور مطلوبة',
    login: 'تسجيل الدخول',
    loggingIn: 'جارٍ تسجيل الدخول...',
    success: 'تم تسجيل الدخول',
    successDescription: 'تم تسجيل دخولك بنجاح',
    error: 'خطأ في تسجيل الدخول',
    invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    serverError: 'تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى',
    forgotPassword: 'هل نسيت كلمة المرور؟',
    noAccount: 'ليس لديك حساب؟',
    register: 'إنشاء حساب',
    support: 'للمساعدة والدعم، تواصل معنا:',
  },
  tr: {
    backHome: 'Ana sayfaya dön',
    title: 'Müşteri Girişi',
    subtitle: 'Momtaz Chem müşteri portalına hoş geldiniz',
    email: 'E-posta',
    invalidEmail: 'Lütfen geçerli bir e-posta adresi girin',
    password: 'Şifre',
    passwordPlaceholder: 'Şifrenizi girin',
    passwordRequired: 'Şifre gereklidir',
    login: 'Giriş Yap',
    loggingIn: 'Giriş yapılıyor...',
    success: 'Giriş başarılı',
    successDescription: 'Başarıyla giriş yaptınız',
    error: 'Giriş hatası',
    invalidCredentials: 'E-posta veya şifre yanlış',
    serverError: 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin',
    forgotPassword: 'Şifrenizi mi unuttunuz?',
    noAccount: 'Hesabınız yok mu?',
    register: 'Kayıt Ol',
    support: 'Yardım ve destek için bize ulaşın:',
  },
  fa: {
    backHome: 'بازگشت به صفحه اصلی',
    title: 'ورود مشتریان',
    subtitle: 'به پنل مشتریان Momtaz Chem خوش آمدید',
    email: 'ایمیل',
    invalidEmail: 'لطفاً ایمیل معتبر وارد کنید',
    password: 'رمز عبور',
    passwordPlaceholder: 'رمز عبور خود را وارد کنید',
    passwordRequired: 'رمز عبور الزامی است',
    login: 'ورود',
    loggingIn: 'در حال ورود...',
    success: 'ورود موفق',
    successDescription: 'شما با موفقیت وارد شده‌اید',
    error: 'خطا در ورود',
    invalidCredentials: 'ایمیل یا رمز عبور اشتباه است',
    serverError: 'خطا در اتصال به سرور. لطفاً دوباره تلاش کنید',
    forgotPassword: 'رمز عبور خود را فراموش کرده‌اید؟',
    noAccount: 'حساب کاربری ندارید؟',
    register: 'ثبت‌نام کنید',
    support: 'برای کمک و راهنمایی با ما تماس بگیرید:',
  },
};

export default function CustomerLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const copy = loginCopy[language];
  const loginSchema = z.object({
    email: z.string().email(copy.invalidEmail),
    password: z.string().min(1, copy.passwordRequired),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setLoginError(null);

    try {
      const response = await apiRequest('/api/customers/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.success) {
        toast({
          title: copy.success,
          description: copy.successDescription,
        });
        
        // Redirect to customer profile
        setLocation('/customer/profile');
      } else {
        setLoginError(copy.invalidCredentials);
        toast({
          title: copy.error,
          description: copy.invalidCredentials,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = copy.serverError;
      setLoginError(errorMessage);
      toast({
        title: copy.error,
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error when user starts typing
  useEffect(() => {
    if (loginError) {
      setLoginError(null);
    }
  }, [form.watch('email'), form.watch('password')]);

  return (
    <div dir={direction} className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2 text-blue-600 hover:text-blue-700">
              <ArrowLeft className={`w-4 h-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
              {copy.backHome}
            </Button>
          </Link>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {copy.title}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {copy.subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Error Display */}
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-center">
                  <p className="text-red-600 text-sm">{loginError}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="block text-start">
                  {copy.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  {...form.register('email')}
                  className="text-start"
                  dir="ltr"
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-sm text-start">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="block text-start">
                  {copy.password}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={copy.passwordPlaceholder}
                    {...form.register('password')}
                    className="text-start px-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute ${direction === 'rtl' ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600`}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-red-500 text-sm text-start">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                disabled={isLoading}
              >
                {isLoading ? copy.loggingIn : copy.login}
              </Button>

              {/* Links */}
              <div className="space-y-3 text-center">
                <Link href="/customer/forgot-password">
                  <Button variant="link" className="text-blue-600 hover:text-blue-700 p-0">
                    {copy.forgotPassword}
                  </Button>
                </Link>
                
                <div className="text-gray-600 text-sm">
                  {copy.noAccount}{' '}
                  <Link href="/customer/register">
                    <span className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                      {copy.register}
                    </span>
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <div className="text-center mt-6 text-gray-600 text-sm">
          <p>{copy.support}</p>
          <p className="font-medium">support@momtazchem.com</p>
        </div>
      </div>
    </div>
  );
}