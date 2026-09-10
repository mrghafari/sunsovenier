import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertContactSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useMultilingualToast } from "@/hooks/use-multilingual-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MapPin, Phone, Mail, Clock, Briefcase } from "lucide-react";
import OpenGraphTags from "@/components/seo/OpenGraphTags";
import CanonicalUrl from "@/components/seo/CanonicalUrl";

interface ContentItem {
  id: number;
  section: string;
  key: string;
  content: string;
  language: string;
  contentType: string;
}

interface PublicCompanyInfo {
  businessHoursWeekdays?: string;
  businessHoursSaturday?: string;
}

const Contact = () => {
  const { toast } = useMultilingualToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { language, t, direction } = useLanguage();
  const fa = language === 'fa';
  const copy = fa ? {
    seoTitle: 'تماس با ممتازکم | پشتیبانی و مشاوره تخصصی مواد شیمیایی',
    seoDescription: 'برای استعلام محصولات شیمیایی، پشتیبانی فنی، دریافت قیمت و مشاوره تخصصی با ممتازکم تماس بگیرید.',
    heroTitle: 'با ما در تماس باشید',
    heroSubtitle: 'برای بررسی نیازهای شیمیایی مجموعه خود آماده‌اید؟ کارشناسان ما برای یافتن بهترین راهکار متناسب با صنعت شما همراهتان هستند.',
    formTitle: 'برای ما پیام بفرستید',
    headquarters: 'دفتر مرکزی',
    companyName: 'شرکت ممتازکم',
    erbil: 'اربیل',
    facility: 'مجموعه تولید مواد شیمیایی',
    phoneTitle: 'تلفن و واتساپ',
    whatsappAvailable: 'پاسخ‌گویی در واتساپ',
    email: 'ایمیل',
    hours: 'ساعات کاری',
    weekdays: 'دوشنبه تا جمعه: ۸ صبح تا ۶ عصر',
    saturday: 'شنبه: ۹ صبح تا ۱ بعدازظهر',
    careers: 'فرصت‌های شغلی',
    joinTeam: 'به تیم در حال رشد ما بپیوندید',
    careerRoles1: 'مهندسان شیمی و کارشناسان آزمایشگاه',
    careerRoles2: 'کارشناسان فروش و کنترل کیفیت',
    whatsapp: 'واتساپ',
    mapTitle: 'موقعیت ممتازکم در اربیل',
    region: 'اربیل، اقلیم کردستان، عراق',
  } : language === 'tr' ? {
    seoTitle: 'Momtazchem ile İletişime Geçin | Kimyasal Çözümler ve Destek',
    seoDescription: 'Kimyasal ürün talepleri, teknik destek, fiyat teklifi ve uzman danışmanlık için Momtazchem ile iletişime geçin.',
    heroTitle: 'Bizimle İletişime Geçin',
    heroSubtitle: 'Kimyasal çözüm ihtiyaçlarınızı görüşmeye hazır mısınız? Uzman ekibimiz, sektörünüze en uygun çözümü bulmanıza yardımcı olmaya hazır.',
    formTitle: 'Bize Mesaj Gönderin',
    headquarters: 'Genel Merkez',
    companyName: 'Momtazchem Şirketi',
    erbil: 'Erbil',
    facility: 'Kimyasal Üretim Tesisi',
    phoneTitle: 'Telefon ve WhatsApp',
    whatsappAvailable: 'WhatsApp üzerinden ulaşabilirsiniz',
    email: 'E-posta',
    hours: 'Çalışma Saatleri',
    weekdays: 'Pazartesi - Cuma: 08:00 - 18:00',
    saturday: 'Cumartesi: 09:00 - 13:00',
    careers: 'Kariyer Fırsatları',
    joinTeam: 'Büyüyen ekibimize katılın',
    careerRoles1: 'Kimya Mühendisleri ve Laboratuvar Teknisyenleri',
    careerRoles2: 'Satış Temsilcileri ve Kalite Kontrol Uzmanları',
    whatsapp: 'WhatsApp',
    mapTitle: 'Momtazchem Konumu - Erbil',
    region: 'Erbil, Kürdistan Bölgesi, Irak',
  } : {
    seoTitle: 'Contact Momtazchem - Get Expert Chemical Solutions Support',
    seoDescription: 'Reach out to Momtazchem for chemical product inquiries, technical support, quotes, and consultations. Available 24/7. Email, phone, and office locations in Iraq and worldwide.',
    heroTitle: 'Get In Touch', heroSubtitle: 'Ready to discuss your chemical solution needs? Our team of experts is here to help you find the perfect solution for your industry.',
    formTitle: 'Send Us a Message', headquarters: 'Headquarters', companyName: 'Momtazchem Company',
    erbil: 'Erbil', facility: 'Chemical Manufacturing Facility', phoneTitle: 'Phone & WhatsApp',
    whatsappAvailable: 'Available on WhatsApp', email: 'Email', hours: 'Business Hours',
    weekdays: 'Monday - Friday: 8:00 AM - 6:00 PM', saturday: 'Saturday: 9:00 AM - 1:00 PM',
    careers: 'Career Opportunities', joinTeam: 'Join our growing team',
    careerRoles1: 'Chemical Engineers, Lab Technicians', careerRoles2: 'Sales Representatives, Quality Control',
    whatsapp: 'WhatsApp', mapTitle: 'Momtazchem Location - Erbil', region: 'Erbil, Kurdistan Region, Iraq',
  };

  // Map language codes to content management language codes
  const getLanguageCode = () => {
    switch(language) {
      case 'ar': return 'ar';
      case 'ku': return 'ku';
      case 'fa': return 'fa';
      case 'tr': return 'tr';
      default: return 'en';
    }
  };

  // Fetch content from Content Management
  const { data: contentResponse, isLoading } = useQuery<{success: boolean, data: ContentItem[]}>({
    queryKey: ['/api/content-management/items'],
    queryFn: async () => {
      const response = await fetch('/api/content-management/items');
      if (!response.ok) throw new Error('Failed to fetch content');
      return response.json();
    }
  });

  const contentItems = contentResponse?.data || [];

  const { data: companyInfo } = useQuery<PublicCompanyInfo | null>({
    queryKey: ['/api/company-information'],
    queryFn: async () => {
      const response = await fetch('/api/company-information');
      if (!response.ok) throw new Error('Failed to fetch company information');
      const result = await response.json();
      return result.data || null;
    }
  });

  // Filter content for contact section
  const contactContent = contentItems.filter(item => 
    item.section === 'contact' && item.language === getLanguageCode()
  );

  const getContent = (key: string, fallback: string = '') => {
    const item = contactContent.find(item => item.key === key);
    return item?.content || fallback;
  };

  const localizeBusinessHours = (value: string | undefined, fallback: string) => {
    if (!value) return fallback;
    if (language !== 'tr') return value;

    return value
      .replace(/Monday\s*-\s*Friday:\s*8:00\s*AM\s*-\s*6:00\s*PM/gi, 'Pazartesi - Cuma: 08:00 - 18:00')
      .replace(/Saturday:\s*9:00\s*AM\s*-\s*(?:1|2):00\s*PM/gi, (match) =>
        match.includes('2:00') ? 'Cumartesi: 09:00 - 14:00' : 'Cumartesi: 09:00 - 13:00'
      )
      .replace(/Monday\s*-\s*Friday/gi, 'Pazartesi - Cuma')
      .replace(/Saturday/gi, 'Cumartesi')
      .replace(/\bAM\b/gi, '')
      .replace(/\bPM\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const form = useForm({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      productInterest: "",
      message: "",
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/contact", { method: "POST", body: data });
    },
    onSuccess: () => {
      toast({
        title: 'contactPage.messageSent' as any,
        description: 'contactPage.messageSentDesc' as any,
      });
      form.reset();
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      toast({
        title: 'contactPage.errorTitle' as any,
        description: 'contactPage.errorDesc' as any,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    contactMutation.mutate(data);
  };

  const contactInfo = [
    {
      icon: <MapPin className="h-6 w-6 text-white" />,
       title: getContent('address_title', copy.headquarters),
      content: [
         getContent('address_line1', copy.companyName),
         getContent('address_line2', copy.erbil),
         getContent('address_line3', copy.facility)
      ],
      bgColor: "bg-primary-blue",
      link: getContent('address_map_link', 'https://maps.app.goo.gl/umCmoKpmaovSkTJ96')
    },
    {
      icon: <Phone className="h-6 w-6 text-white" />,
       title: getContent('phone_title', copy.phoneTitle),
      content: [
        getContent('phone_number', '+9647709996771'),
         getContent('phone_availability', copy.whatsappAvailable)
      ],
      bgColor: "bg-primary-green"
    },
    {
      icon: <Mail className="h-6 w-6 text-white" />,
       title: getContent('email_title', copy.email),
      content: [
        getContent('email_info', 'info@momtazchem.com'),
        getContent('email_sales', 'sales@momtazchem.com'),
        getContent('email_support', 'support@momtazchem.com')
      ],
      bgColor: "bg-accent-orange"
    },
    {
      icon: <Clock className="h-6 w-6 text-white" />,
       title: getContent('hours_title', copy.hours),
      content: [
          localizeBusinessHours(companyInfo?.businessHoursWeekdays, getContent('hours_weekdays', copy.weekdays)),
          localizeBusinessHours(companyInfo?.businessHoursSaturday, getContent('hours_saturday', copy.saturday))
      ],
      bgColor: "bg-primary-blue"
    },
    {
      icon: <Briefcase className="h-6 w-6 text-white" />,
       title: getContent('career_title', copy.careers),
      content: [
         getContent('career_line1', copy.joinTeam),
         getContent('career_line2', copy.careerRoles1),
         getContent('career_line3', copy.careerRoles2)
      ],
      bgColor: "bg-green-600",
      link: getContent('career_email', 'mailto:careers@momtazchem.com')
    }
  ];

  return (
    <div className="pt-20" dir={direction}>
      <OpenGraphTags
        title={copy.seoTitle}
        description={copy.seoDescription}
        type="website"
        image="https://momtazchem.com/og-contact.jpg"
        locale="en_US"
      />
      <CanonicalUrl path="/contact" />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {getContent('hero_title', copy.heroTitle)}
            </h1>
            <p className="text-xl max-w-3xl mx-auto">
              {getContent('hero_subtitle', copy.heroSubtitle)}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-gray-50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                 {getContent('form_title', copy.formTitle)}
              </h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.contactPage.firstName}</FormLabel>
                          <FormControl>
                            <Input placeholder={t.contactPage.firstNamePlaceholder} {...field} />
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
                          <FormLabel>{t.contactPage.lastName}</FormLabel>
                          <FormControl>
                            <Input placeholder={t.contactPage.lastNamePlaceholder} {...field} />
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
                        <FormLabel>{t.contactPage.emailAddress}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t.contactPage.emailPlaceholder} {...field} />
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
                        <FormLabel>{t.contactPage.company}</FormLabel>
                        <FormControl>
                          <Input placeholder={t.contactPage.companyPlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="productInterest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.contactPage.productInterest}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t.contactPage.productInterestPlaceholder} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="water-treatment">{t.contactPage.waterTreatment}</SelectItem>
                            <SelectItem value="fuel-additives">{t.contactPage.fuelAdditives}</SelectItem>
                            <SelectItem value="paint-thinner">{t.contactPage.paintThinner}</SelectItem>
                            <SelectItem value="agricultural-fertilizers">{t.contactPage.agriculturalFertilizers}</SelectItem>
                            <SelectItem value="industrial-chemicals">{t.contactPage.industrialChemicals}</SelectItem>
                            <SelectItem value="technical-equipment">{t.contactPage.technicalEquipment}</SelectItem>
                            <SelectItem value="commercial-goods">{t.contactPage.commercialGoods}</SelectItem>
                            <SelectItem value="custom-solutions">{t.contactPage.customSolutions}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.contactPage.message}</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={4} 
                            placeholder={t.contactPage.messagePlaceholder} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary-blue hover:bg-primary-blue-dark" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t.contactPage.sending : t.contactPage.sendMessage}
                  </Button>
                </form>
              </Form>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.contactPage.contactInformation}</h2>
                
                <div className="space-y-6">
                  {contactInfo.map((info, index) => (
                    <div key={index} className="flex items-start">
                      <div className={`w-12 h-12 ${info.bgColor} rounded-lg flex items-center justify-center ${direction === 'rtl' ? 'ml-4' : 'mr-4'} flex-shrink-0`}>
                        {info.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{info.title}</h3>
                        {info.content.map((line, lineIndex) => (
                          <div key={lineIndex} className="text-gray-600">
                            {index === 1 ? (
                              line.includes("+9647709996771") ? (
                                <div className="flex items-center gap-2">
                                  <a 
                                    href={`tel:${line.replace(/\s+/g, '')}`}
                                    className="hover:text-primary transition-colors duration-200 cursor-pointer"
                                  >
                                    {line}
                                  </a>
                                  <a
                                    href="https://wa.me/9647709996771"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors duration-200"
                                  >
                                    <i className="fab fa-whatsapp mr-1"></i>
                                    {copy.whatsapp}
                                  </a>
                                </div>
                              ) : (
                                <span>{line}</span>
                              )
                            ) : index === 2 ? (
                              <a 
                                href={`mailto:${line}`}
                                className="hover:text-primary transition-colors duration-200 cursor-pointer"
                              >
                                {line}
                              </a>
                            ) : index === 4 && info.link ? (
                              <a 
                                href={info.link}
                                className="hover:text-primary transition-colors duration-200 cursor-pointer"
                              >
                                {line}
                              </a>
                            ) : index === 0 && info.link ? (
                              <a 
                                href={info.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors duration-200 cursor-pointer"
                              >
                                {line}
                              </a>
                            ) : (
                              line
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t.contactPage.findUs}</h2>
            <p className="text-xl text-gray-600">{t.contactPage.visitHeadquarters}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="relative">
              <div className="h-96 rounded-lg overflow-hidden shadow-lg">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d12885.5!2d43.882198296180086!3d36.15782506411755!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzbCsDA5JzI4LjEiTiA0M8KwNTInNTUuOSJF!5e0!3m2!1sen!2s!4v1649123456789"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={copy.mapTitle}
                ></iframe>

                
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-6 w-6 text-red-500" />
                    <div>
                       <h3 className="font-semibold text-gray-900">{copy.companyName}</h3>
                       <p className="text-sm text-gray-600">{copy.facility}</p>
                      <p className="text-xs text-gray-500">36.1578°N, 43.8822°E</p>
                       <p className="text-xs text-gray-400">{copy.region}</p>
                      <a
                        href="https://maps.app.goo.gl/umCmoKpmaovSkTJ96"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-blue hover:text-primary-blue-dark text-sm font-medium"
                      >
                        {t.contactPage.viewInMaps} {direction === 'rtl' ? '←' : '→'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-lg font-semibold text-gray-900 mb-2">{fa ? 'دفتر مرکزی ممتازکم' : 'Momtazchem Headquarters'}</h3>
                   <p className="text-gray-600">{copy.erbil}</p>
                </div>
                <a
                  href="https://maps.app.goo.gl/ngapesxcH4XiT4L26"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary-blue hover:bg-primary-blue-dark text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  {t.contactPage.getDirections}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
