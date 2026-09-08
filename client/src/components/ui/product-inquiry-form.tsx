import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ShowcaseProduct } from "@shared/showcase-schema";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/lib/i18n";

const INQUIRY_T: Record<Language, Record<string, string>> = {
  en: { product:"Product", subjectPrefix:"Inquiry about", messagePrefix:"I am interested in learning more about", messageSuffix:"Please provide pricing, specifications, and availability.", submitted:"Inquiry Submitted", submittedDesc:"Thank you! We'll get back to you within 24 hours.", error:"Error", errorDesc:"Failed to submit inquiry. Please try again.", title:"Product Inquiry", success:"Inquiry Submitted Successfully!", successDesc:"We'll get back to you within 24 hours with detailed information.", category:"Agricultural Products", email:"Email Address", phone:"Phone Number", company:"Company", companyPlaceholder:"Your company name", type:"Inquiry Type", productInfo:"Product Information", quote:"Request Quote", support:"Technical Support", general:"General Inquiry", priority:"Priority", normal:"Normal", high:"High", urgent:"Urgent", subject:"Subject", subjectPlaceholder:"Brief description of your inquiry", message:"Message", messagePlaceholder:"Please provide details about your requirements, quantities, timeline, or questions...", cancel:"Cancel", submitting:"Submitting...", submit:"Submit Inquiry" },
  ar: { product:"المنتج", subjectPrefix:"استفسار عن", messagePrefix:"أرغب في معرفة المزيد عن", messageSuffix:"يرجى تزويدي بالأسعار والمواصفات ومدى التوفر.", submitted:"تم إرسال الاستفسار", submittedDesc:"شكرًا لك! سنتواصل معك خلال 24 ساعة.", error:"خطأ", errorDesc:"تعذر إرسال الاستفسار. يرجى المحاولة مرة أخرى.", title:"استفسار عن المنتج", success:"تم إرسال الاستفسار بنجاح", successDesc:"سنتواصل معك خلال 24 ساعة بالمعلومات التفصيلية.", category:"المنتجات الزراعية", email:"البريد الإلكتروني", phone:"رقم الهاتف", company:"الشركة", companyPlaceholder:"اسم شركتك", type:"نوع الاستفسار", productInfo:"معلومات المنتج", quote:"طلب عرض سعر", support:"الدعم الفني", general:"استفسار عام", priority:"الأولوية", normal:"عادية", high:"عالية", urgent:"عاجلة", subject:"الموضوع", subjectPlaceholder:"وصف مختصر للاستفسار", message:"الرسالة", messagePlaceholder:"اذكر المتطلبات والكميات والمدة الزمنية أو أي أسئلة محددة...", cancel:"إلغاء", submitting:"جارٍ الإرسال...", submit:"إرسال الاستفسار" },
  tr: { product:"Ürün", subjectPrefix:"Ürün hakkında bilgi", messagePrefix:"Şu ürün hakkında daha fazla bilgi almak istiyorum:", messageSuffix:"Lütfen fiyat, teknik özellik ve stok bilgilerini paylaşın.", submitted:"Talep gönderildi", submittedDesc:"Teşekkürler! 24 saat içinde size dönüş yapacağız.", error:"Hata", errorDesc:"Talep gönderilemedi. Lütfen tekrar deneyin.", title:"Ürün Talebi", success:"Talebiniz başarıyla gönderildi", successDesc:"Ayrıntılı bilgilerle 24 saat içinde size döneceğiz.", category:"Tarım Ürünleri", email:"E-posta Adresi", phone:"Telefon Numarası", company:"Şirket", companyPlaceholder:"Şirketinizin adı", type:"Talep Türü", productInfo:"Ürün Bilgisi", quote:"Fiyat Teklifi", support:"Teknik Destek", general:"Genel Talep", priority:"Öncelik", normal:"Normal", high:"Yüksek", urgent:"Acil", subject:"Konu", subjectPlaceholder:"Talebinizin kısa açıklaması", message:"Mesaj", messagePlaceholder:"Gereksinim, miktar, zamanlama veya sorularınızı yazın...", cancel:"İptal", submitting:"Gönderiliyor...", submit:"Talebi Gönder" },
  fa: { product:"محصول", subjectPrefix:"استعلام درباره", messagePrefix:"مایلم اطلاعات بیشتری درباره این محصول دریافت کنم:", messageSuffix:"لطفاً قیمت، مشخصات و وضعیت موجودی را اعلام کنید.", submitted:"درخواست ارسال شد", submittedDesc:"سپاسگزاریم؛ حداکثر تا ۲۴ ساعت آینده با شما تماس می‌گیریم.", error:"خطا", errorDesc:"ارسال درخواست انجام نشد؛ دوباره تلاش کنید.", title:"استعلام محصول", success:"درخواست با موفقیت ارسال شد", successDesc:"حداکثر تا ۲۴ ساعت آینده اطلاعات کامل را برای شما ارسال می‌کنیم.", category:"محصولات کشاورزی", email:"ایمیل", phone:"شماره تلفن", company:"شرکت", companyPlaceholder:"نام شرکت", type:"نوع درخواست", productInfo:"اطلاعات محصول", quote:"درخواست قیمت", support:"پشتیبانی فنی", general:"درخواست عمومی", priority:"اولویت", normal:"عادی", high:"بالا", urgent:"فوری", subject:"موضوع", subjectPlaceholder:"شرح کوتاه درخواست", message:"پیام", messagePlaceholder:"نیازمندی‌ها، مقدار، زمان‌بندی یا پرسش‌های خود را بنویسید...", cancel:"انصراف", submitting:"در حال ارسال...", submit:"ارسال درخواست" },
};

// Form validation schema
const inquiryFormSchema = z.object({
  contactEmail: z.string().email("Please enter a valid email address"),
  contactPhone: z.string().optional(),
  company: z.string().optional(),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  type: z.enum(["product_info", "quote_request", "technical_support", "general"]),
  priority: z.enum(["normal", "high", "urgent"]).default("normal"),
});

type InquiryFormData = z.infer<typeof inquiryFormSchema>;

interface ProductInquiryFormProps {
  product?: ShowcaseProduct;
  productName?: string;
  triggerText?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerSize?: "default" | "sm" | "lg";
  className?: string;
  triggerClassName?: string;
}

export function ProductInquiryForm({ 
  product, 
  productName,
  triggerText = "Inquire About Product",
  triggerVariant = "default",
  triggerSize = "default",
  className = "",
  triggerClassName = ""
}: ProductInquiryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const it = INQUIRY_T[language];

  const displayProductName = product?.name || productName || it.product;
  
  const form = useForm<InquiryFormData>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      contactEmail: "",
      contactPhone: "",
      company: "",
      subject: `${it.subjectPrefix} ${displayProductName}`,
      message: `${it.messagePrefix} ${displayProductName}. ${it.messageSuffix}`,
      type: "product_info",
      priority: "normal",
    },
  });

  const submitInquiryMutation = useMutation({
    mutationFn: async (data: InquiryFormData) => {
      const inquiryData = {
        ...data,
        category: product?.category || "agricultural-fertilizers",
        productIds: product ? [product.id] : [],
        customerId: null, // Guest inquiry
      };
      
      return apiRequest("/api/inquiries", "POST", inquiryData);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      form.reset();
      toast({
        title: it.submitted,
        description: it.submittedDesc,
      });
      
      // Auto-close dialog after 3 seconds
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
      }, 3000);
    },
    onError: () => {
      toast({
        title: it.error,
        description: it.errorDesc,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InquiryFormData) => {
    submitInquiryMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={triggerVariant} 
          size={triggerSize}
          className={triggerClassName || className}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {it.title}
          </DialogTitle>
        </DialogHeader>

        {isSubmitted ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {it.success}
            </h3>
            <p className="text-gray-600">
              {it.successDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Product Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                {product?.imageUrl && (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{displayProductName}</h4>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {product?.category?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || it.category}
                  </Badge>
                  {product?.priceRange && (
                    <p className="text-sm text-gray-600 mt-1">{product.priceRange}</p>
                  )}
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{it.email} *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="your@email.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{it.phone}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1 (555) 123-4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{it.company}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={it.companyPlaceholder} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{it.type}</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="product_info">{it.productInfo}</SelectItem>
                              <SelectItem value="quote_request">{it.quote}</SelectItem>
                              <SelectItem value="technical_support">{it.support}</SelectItem>
                              <SelectItem value="general">{it.general}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{it.priority}</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">{it.normal}</SelectItem>
                              <SelectItem value="high">{it.high}</SelectItem>
                              <SelectItem value="urgent">{it.urgent}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{it.subject} *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={it.subjectPlaceholder} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{it.message} *</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={it.messagePlaceholder}
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsOpen(false)}
                  >
                    {it.cancel}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitInquiryMutation.isPending}
                  >
                    {submitInquiryMutation.isPending ? (
                      it.submitting
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {it.submit}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}