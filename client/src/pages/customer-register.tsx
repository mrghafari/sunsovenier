import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertCustomerSchema } from "@shared/customer-schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { OtpVerificationModal } from "@/components/OtpVerificationModal";
import { useLanguage } from "@/contexts/LanguageContext";

const registerPageCopy = {
  en: {
    title: "Create Account", subtitle: "Join Momtazchem to access exclusive products and services",
    personal: "Personal Information", firstName: "First Name", firstNamePh: "Enter your first name",
    lastName: "Last Name", lastNamePh: "Enter your last name", email: "Email Address", emailPh: "Enter your email",
    company: "Company", companyPh: "Enter your company name", contact: "Contact Information", phone: "Phone Number",
    geoTitle: "Iraqi Geographical Address", country: "Country", selectCountry: "Select country",
    province: "Province", selectProvince: "Select province", city: "City/Region", selectCity: "Select city/region",
    selectProvinceFirst: "Select a province first", distanceInfo: "Logistics distance information",
    distanceDesc: "Distances are calculated from Erbil to improve delivery and shipping costs", distanceFromErbil: "Distance from Erbil",
    kilometer: "km", address: "Address", addressPh: "Enter your full address", postalCode: "Postal Code",
    postalCodePh: "Enter postal code", security: "Account Security", password: "Password",
    passwordPh: "Create a password", confirmPassword: "Confirm Password", confirmPasswordPh: "Confirm your password",
    preferences: "Communication Preferences", preferredCommunication: "Preferred Communication",
    preferredLanguage: "Preferred Language", emailOption: "Email", phoneOption: "Phone",
    creating: "Creating Account...", create: "Create Account", hasAccount: "Already have an account?", login: "Login",
    codeSent: "Verification Code Sent", checkCode: "Check your selected channels for the verification code",
    codeFailed: "Failed to Send Code", registrationSuccess: "Registration Successful",
    accountCreated: "Your account has been created. You can now log in.", registrationFailed: "Registration Failed",
    requestFailed: "The operation failed. Please try again.",
  },
  fa: {
    title: "ایجاد حساب کاربری", subtitle: "برای دسترسی به محصولات و خدمات ممتازکم حساب کاربری ایجاد کنید",
    personal: "اطلاعات شخصی", firstName: "نام", firstNamePh: "نام خود را وارد کنید",
    lastName: "نام خانوادگی", lastNamePh: "نام خانوادگی خود را وارد کنید", email: "نشانی ایمیل", emailPh: "ایمیل خود را وارد کنید",
    company: "شرکت", companyPh: "نام شرکت را وارد کنید", contact: "اطلاعات تماس", phone: "شماره تلفن",
    geoTitle: "نشانی جغرافیایی", country: "کشور", selectCountry: "کشور را انتخاب کنید",
    province: "استان", selectProvince: "استان را انتخاب کنید", city: "شهر/منطقه", selectCity: "شهر یا منطقه را انتخاب کنید",
    selectProvinceFirst: "ابتدا استان را انتخاب کنید", distanceInfo: "اطلاعات فاصله برای خدمات لجستیک",
    distanceDesc: "فاصله‌ها برای بهبود تحویل و محاسبه هزینه ارسال از اربیل محاسبه شده‌اند", distanceFromErbil: "فاصله از اربیل",
    kilometer: "کیلومتر", address: "نشانی", addressPh: "نشانی کامل خود را وارد کنید", postalCode: "کد پستی",
    postalCodePh: "کد پستی را وارد کنید", security: "امنیت حساب کاربری", password: "رمز عبور",
    passwordPh: "یک رمز عبور ایجاد کنید", confirmPassword: "تکرار رمز عبور", confirmPasswordPh: "رمز عبور را دوباره وارد کنید",
    preferences: "تنظیمات ارتباطی", preferredCommunication: "روش ارتباط ترجیحی",
    preferredLanguage: "زبان ترجیحی", emailOption: "ایمیل", phoneOption: "تلفن",
    creating: "در حال ایجاد حساب...", create: "ایجاد حساب", hasAccount: "قبلاً حساب ساخته‌اید؟", login: "ورود",
    codeSent: "کد تأیید ارسال شد", checkCode: "کد تأیید را در روش‌های ارتباطی انتخاب‌شده بررسی کنید",
    codeFailed: "ارسال کد تأیید ناموفق بود", registrationSuccess: "ثبت‌نام موفق",
    accountCreated: "حساب شما ایجاد شد و اکنون می‌توانید وارد شوید.", registrationFailed: "ثبت‌نام ناموفق بود",
    requestFailed: "عملیات انجام نشد. لطفاً دوباره تلاش کنید.",
  },
  ar: {
    title: "إنشاء حساب", subtitle: "انضم إلى ممتاز للكيماويات للوصول إلى المنتجات والخدمات",
    personal: "المعلومات الشخصية", firstName: "الاسم الأول", firstNamePh: "أدخل اسمك الأول",
    lastName: "اسم العائلة", lastNamePh: "أدخل اسم العائلة", email: "البريد الإلكتروني", emailPh: "أدخل بريدك الإلكتروني",
    company: "الشركة", companyPh: "أدخل اسم الشركة", contact: "معلومات الاتصال", phone: "رقم الهاتف",
    geoTitle: "العنوان الجغرافي", country: "البلد", selectCountry: "اختر البلد",
    province: "المحافظة", selectProvince: "اختر المحافظة", city: "المدينة/المنطقة", selectCity: "اختر المدينة أو المنطقة",
    selectProvinceFirst: "اختر المحافظة أولاً", distanceInfo: "معلومات المسافة للخدمات اللوجستية",
    distanceDesc: "تُحسب المسافات من أربيل لتحسين التوصيل وتكاليف الشحن", distanceFromErbil: "المسافة من أربيل",
    kilometer: "كم", address: "العنوان", addressPh: "أدخل عنوانك الكامل", postalCode: "الرمز البريدي",
    postalCodePh: "أدخل الرمز البريدي", security: "أمان الحساب", password: "كلمة المرور",
    passwordPh: "أنشئ كلمة مرور", confirmPassword: "تأكيد كلمة المرور", confirmPasswordPh: "أعد إدخال كلمة المرور",
    preferences: "تفضيلات الاتصال", preferredCommunication: "وسيلة الاتصال المفضلة",
    preferredLanguage: "اللغة المفضلة", emailOption: "البريد الإلكتروني", phoneOption: "الهاتف",
    creating: "جارٍ إنشاء الحساب...", create: "إنشاء حساب", hasAccount: "لديك حساب بالفعل؟", login: "تسجيل الدخول",
    codeSent: "تم إرسال رمز التحقق", checkCode: "تحقق من وسائل الاتصال المحددة للحصول على رمز التحقق",
    codeFailed: "تعذر إرسال رمز التحقق", registrationSuccess: "تم التسجيل بنجاح",
    accountCreated: "تم إنشاء حسابك ويمكنك الآن تسجيل الدخول.", registrationFailed: "فشل التسجيل",
    requestFailed: "تعذر إكمال العملية. يرجى المحاولة مرة أخرى.",
  },
  tr: {
    title: "Hesap Oluştur", subtitle: "Özel ürün ve hizmetlere erişmek için Momtazchem'e katılın",
    personal: "Kişisel Bilgiler", firstName: "Ad", firstNamePh: "Adınızı girin",
    lastName: "Soyad", lastNamePh: "Soyadınızı girin", email: "E-posta Adresi", emailPh: "E-postanızı girin",
    company: "Şirket", companyPh: "Şirket adını girin", contact: "İletişim Bilgileri", phone: "Telefon Numarası",
    geoTitle: "Coğrafi Adres", country: "Ülke", selectCountry: "Ülke seçin",
    province: "İl", selectProvince: "İl seçin", city: "Şehir/Bölge", selectCity: "Şehir veya bölge seçin",
    selectProvinceFirst: "Önce bir il seçin", distanceInfo: "Lojistik mesafe bilgileri",
    distanceDesc: "Teslimat ve nakliye maliyetlerini iyileştirmek için mesafeler Erbil'den hesaplanır", distanceFromErbil: "Erbil'den uzaklık",
    kilometer: "km", address: "Adres", addressPh: "Tam adresinizi girin", postalCode: "Posta Kodu",
    postalCodePh: "Posta kodunu girin", security: "Hesap Güvenliği", password: "Şifre",
    passwordPh: "Bir şifre oluşturun", confirmPassword: "Şifreyi Onayla", confirmPasswordPh: "Şifrenizi tekrar girin",
    preferences: "İletişim Tercihleri", preferredCommunication: "Tercih Edilen İletişim",
    preferredLanguage: "Tercih Edilen Dil", emailOption: "E-posta", phoneOption: "Telefon",
    creating: "Hesap oluşturuluyor...", create: "Hesap Oluştur", hasAccount: "Zaten hesabınız var mı?", login: "Giriş Yap",
    codeSent: "Doğrulama Kodu Gönderildi", checkCode: "Doğrulama kodu için seçtiğiniz iletişim kanallarını kontrol edin",
    codeFailed: "Doğrulama Kodu Gönderilemedi", registrationSuccess: "Kayıt Başarılı",
    accountCreated: "Hesabınız oluşturuldu. Şimdi giriş yapabilirsiniz.", registrationFailed: "Kayıt Başarısız",
    requestFailed: "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
  },
};

const countryNames = {
  en: { Iraq: "Iraq", Iran: "Iran", Turkey: "Turkey", Syria: "Syria", Jordan: "Jordan", Lebanon: "Lebanon", Kuwait: "Kuwait", "Saudi Arabia": "Saudi Arabia", UAE: "United Arab Emirates", Other: "Other" },
  fa: { Iraq: "عراق", Iran: "ایران", Turkey: "ترکیه", Syria: "سوریه", Jordan: "اردن", Lebanon: "لبنان", Kuwait: "کویت", "Saudi Arabia": "عربستان سعودی", UAE: "امارات متحده عربی", Other: "سایر کشورها" },
  ar: { Iraq: "العراق", Iran: "إيران", Turkey: "تركيا", Syria: "سوريا", Jordan: "الأردن", Lebanon: "لبنان", Kuwait: "الكويت", "Saudi Arabia": "السعودية", UAE: "الإمارات العربية المتحدة", Other: "دولة أخرى" },
  tr: { Iraq: "Irak", Iran: "İran", Turkey: "Türkiye", Syria: "Suriye", Jordan: "Ürdün", Lebanon: "Lübnan", Kuwait: "Kuveyt", "Saudi Arabia": "Suudi Arabistan", UAE: "Birleşik Arap Emirlikleri", Other: "Diğer" },
};

const validationCopy = {
  en: { email: "Please enter a valid email address", password: "Password must be at least 8 characters", firstName: "First name is required", lastName: "Last name is required", phone: "Phone number is required", country: "Country is required", province: "Province is required", city: "City/Region is required", address: "Address is required", language: "Preferred language is required", match: "Passwords don't match" },
  fa: { email: "لطفاً یک ایمیل معتبر وارد کنید", password: "رمز عبور باید حداقل ۸ کاراکتر باشد", firstName: "نام الزامی است", lastName: "نام خانوادگی الزامی است", phone: "شماره تلفن الزامی است", country: "انتخاب کشور الزامی است", province: "انتخاب استان الزامی است", city: "انتخاب شهر یا منطقه الزامی است", address: "نشانی الزامی است", language: "انتخاب زبان ترجیحی الزامی است", match: "رمزهای عبور یکسان نیستند" },
  ar: { email: "يرجى إدخال بريد إلكتروني صالح", password: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل", firstName: "الاسم الأول مطلوب", lastName: "اسم العائلة مطلوب", phone: "رقم الهاتف مطلوب", country: "اختيار البلد مطلوب", province: "اختيار المحافظة مطلوب", city: "اختيار المدينة أو المنطقة مطلوب", address: "العنوان مطلوب", language: "اختيار اللغة المفضلة مطلوب", match: "كلمتا المرور غير متطابقتين" },
  tr: { email: "Lütfen geçerli bir e-posta adresi girin", password: "Şifre en az 8 karakter olmalıdır", firstName: "Ad gereklidir", lastName: "Soyad gereklidir", phone: "Telefon numarası gereklidir", country: "Ülke seçimi gereklidir", province: "İl seçimi gereklidir", city: "Şehir veya bölge seçimi gereklidir", address: "Adres gereklidir", language: "Tercih edilen dil gereklidir", match: "Şifreler eşleşmiyor" },
};

const createCustomerRegistrationSchema = (language: keyof typeof validationCopy) => {
  const v = validationCopy[language];
  return z.object({
    email: z.string().min(1, v.email).email(v.email),
    password: z.string().min(8, v.password),
    confirmPassword: z.string(),
    firstName: z.string().min(1, v.firstName),
    lastName: z.string().min(1, v.lastName),
    company: z.string().optional(),
    phone: z.string().min(1, v.phone),
    country: z.string().min(1, v.country),
    province: z.string().min(1, v.province),
    cityRegion: z.string().min(1, v.city),
    address: z.string().min(1, v.address),
    postalCode: z.string().optional(),
    communicationPreference: z.string().default("email"),
    preferredLanguage: z.enum(["en", "fa", "ar", "tr"], { required_error: v.language }),
    marketingConsent: z.boolean().default(false),
  }).refine((data) => data.password === data.confirmPassword, {
    message: v.match,
    path: ["confirmPassword"],
  });
};

type CustomerRegistrationData = z.infer<ReturnType<typeof createCustomerRegistrationSchema>>;

const CustomerRegister = () => {
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const copy = registerPageCopy[language];
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingRegistrationData, setPendingRegistrationData] = useState<any>(null);
  const [sentVia, setSentVia] = useState<{ whatsapp: boolean; sms: boolean; email: boolean }>({
    whatsapp: false,
    sms: false,
    email: false,
  });

  // Fetch verification settings to check if skip verification is enabled
  const { data: verificationSettings, isLoading: isLoadingSettings } = useQuery<any>({
    queryKey: ["/api/customer/verification-settings"],
    queryFn: async () => {
      const response = await fetch("/api/customer/verification-settings");
      const data = await response.json();
      console.log("🔐 [SETTINGS LOADED] Verification settings:", data);
      return data;
    },
    staleTime: 60000,
  });

  // Fetch provinces data
  const { data: provinces = [] } = useQuery({
    queryKey: ["/api/logistics/provinces"],
    enabled: true,
  });

  // Find selected province ID 
  const selectedProvinceData = Array.isArray(provinces) ? provinces.find((p: any) => p.nameArabic === selectedProvince) : null;
  
  // Fetch cities based on selected province
  const { data: cities = [] } = useQuery({
    queryKey: ["/api/logistics/cities", selectedProvinceData?.id],
    queryFn: () => 
      fetch(`/api/logistics/cities?provinceId=${selectedProvinceData?.id}`)
        .then(res => res.json())
        .then(data => data.data),
    enabled: !!selectedProvinceData?.id,
  });

  const form = useForm<CustomerRegistrationData>({
    resolver: zodResolver(createCustomerRegistrationSchema(language)),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      company: "",
      phone: "",
      country: "",
      province: "",
      cityRegion: "",
      address: "",
      postalCode: "",
      password: "",
      confirmPassword: "",
      communicationPreference: "email",
      preferredLanguage: language,
      marketingConsent: false,
    },
  });

  useEffect(() => {
    if (!form.formState.dirtyFields.preferredLanguage) {
      form.setValue("preferredLanguage", language, { shouldValidate: true });
    }
  }, [language, form]);

  // Mutation to send OTP
  const sendOtpMutation = useMutation({
    mutationFn: async (data: CustomerRegistrationData) => {
      const { confirmPassword, ...registerData } = data;
      const registrationPayload = {
        ...registerData,
        passwordHash: registerData.password,
        customerSource: "website",
        customerType: "retail",
        whatsappNumber: registerData.phone,
      };
      
      return await apiRequest("/api/customers/send-otp", {
        method: "POST",
        body: {
          phone: registerData.phone,
          email: registerData.email,
          registrationData: registrationPayload,
        },
      });
    },
    onSuccess: (response, variables) => {
      const { confirmPassword, ...registerData } = variables;
      const registrationPayload = {
        ...registerData,
        passwordHash: registerData.password,
        customerSource: "website",
        customerType: "retail",
        whatsappNumber: registerData.phone,
      };
      
      // Check if verification is skipped - register directly without OTP
      if (response.skipVerification === true) {
        console.log("🔐 [REGISTRATION] Skip verification enabled - registering directly");
        registerMutation.mutate({
          ...registrationPayload,
          skipOtpVerification: true,
        });
        return;
      }
      
      setPendingRegistrationData(registrationPayload);
      
      // Store sentVia info from response
      if (response.sentVia) {
        setSentVia(response.sentVia);
      }
      
      setShowOtpModal(true);
      setIsSubmitting(false);
      
      const channels = [];
      if (response.sentVia?.email) channels.push("Email");
      if (response.sentVia?.whatsapp) channels.push("WhatsApp");
      if (response.sentVia?.sms) channels.push("SMS");
      
      toast({
        title: copy.codeSent,
        description: channels.length ? `${copy.checkCode}: ${channels.join(", ")}` : copy.checkCode,
      });
    },
    onError: (error: any) => {
      toast({
        title: copy.codeFailed,
        description: error.message || copy.requestFailed,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Mutation to complete registration after OTP verification
  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/customers/register", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: copy.registrationSuccess,
        description: copy.accountCreated,
      });
      setShowOtpModal(false);
      setIsSubmitting(false);
      setLocation("/customer/login");
    },
    onError: (error: any) => {
      toast({
        title: copy.registrationFailed,
        description: error.message || copy.requestFailed,
        variant: "destructive",
      });
      setShowOtpModal(false);
      setIsSubmitting(false);
    },
  });

  // Handler called when OTP is verified
  const handleOtpVerified = (registrationData: any) => {
    if (pendingRegistrationData) {
      registerMutation.mutate(pendingRegistrationData);
    }
  };

  const onSubmit = async (data: CustomerRegistrationData) => {
    setIsSubmitting(true);
    
    // Always try direct registration - backend will check if OTP is needed
    const { confirmPassword, ...registerData } = data;
    const registrationPayload = {
      ...registerData,
      passwordHash: registerData.password,
      customerSource: "website",
      customerType: "retail",
      whatsappNumber: registerData.phone,
      skipOtpVerification: true,
    };
    
    console.log("🔐 [REGISTRATION] Attempting direct registration...");
    registerMutation.mutate(registrationPayload);
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50" dir={direction} lang={language}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{copy.title}</h1>
            <p className="text-gray-600">
              {copy.subtitle}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                   {copy.personal}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{copy.firstName} *</FormLabel>
                        <FormControl>
                          <Input placeholder={copy.firstNamePh} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{copy.lastName} *</FormLabel>
                        <FormControl>
                          <Input placeholder={copy.lastNamePh} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.email} *</FormLabel>
                      <FormControl>
                        <Input type="email" dir="ltr" placeholder={copy.emailPh} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.company}</FormLabel>
                      <FormControl>
                        <Input placeholder={copy.companyPh} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                   {copy.contact}
                </h2>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.phone} *</FormLabel>
                      <FormControl>
                        <Input dir="ltr" placeholder="+964 XXX XXX XXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                {/* Iraqi Geographical Format Section */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                     {copy.geoTitle}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                             🌍 {copy.country} *
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                 <SelectValue placeholder={copy.selectCountry} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(countryNames[language]).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                             🏛️ {copy.province} *
                          </FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedProvince(value);
                              form.setValue("cityRegion", ""); // Reset city when province changes
                            }} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                 <SelectValue placeholder={copy.selectProvince} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.isArray(provinces) && provinces.map((province: any) => (
                                <SelectItem key={province.id} value={province.nameArabic}>
                                  {province.nameArabic} ({province.nameEnglish})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cityRegion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                             🏙️ {copy.city} *
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedProvince}>
                            <FormControl>
                              <SelectTrigger>
                                 <SelectValue placeholder={selectedProvince ? copy.selectCity : copy.selectProvinceFirst} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.isArray(cities) && cities.map((city: any) => (
                                <SelectItem key={city.id} value={city.nameArabic}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{city.nameArabic}</span>
                                    <span className="text-xs text-gray-500">
                                       {city.nameEnglish} • {copy.distanceFromErbil}: {city.distanceFromErbilKm || 0} {copy.kilometer}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Distance Information Display */}
                  {selectedProvince && cities.length > 0 && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 text-green-800">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                         <span className="text-sm font-medium">{copy.distanceInfo}</span>
                      </div>
                      <p className="text-xs text-green-700 mt-1">
                         {copy.distanceDesc}
                      </p>
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.address} *</FormLabel>
                      <FormControl>
                        <Input placeholder={copy.addressPh} {...field} required />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.postalCode}</FormLabel>
                      <FormControl>
                        <Input placeholder={copy.postalCodePh} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Account Security */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                   {copy.security}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{copy.password} *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder={copy.passwordPh} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{copy.confirmPassword} *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder={copy.confirmPasswordPh} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                   {copy.preferences}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="communicationPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{copy.preferredCommunication}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email">{copy.emailOption}</SelectItem>
                            <SelectItem value="phone">{copy.phoneOption}</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferredLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{copy.preferredLanguage} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="fa">فارسی</SelectItem>
                            <SelectItem value="ar">العربية</SelectItem>
                            <SelectItem value="tr">Türkçe</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full bg-primary-blue hover:bg-primary-blue-dark text-white py-3"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? copy.creating : copy.create}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                     {copy.hasAccount}{" "}
                    <Link href="/customer/login" className="text-primary-blue hover:underline font-medium">
                       {copy.login}
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <OtpVerificationModal
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          phone={form.getValues("phone")}
          email={form.getValues("email")}
          onVerified={handleOtpVerified}
          initialSentVia={sentVia}
        />
      )}
    </div>
  );
};

export default CustomerRegister;