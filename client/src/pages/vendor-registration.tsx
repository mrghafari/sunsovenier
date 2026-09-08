import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Store, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { countries } from "@shared/countries";
import { useLanguage } from "@/contexts/LanguageContext";
import { vendorRegistrationCopy } from "./vendor-registration-copy";

const createVendorRegistrationSchema = (c: Record<string, string>) => z.object({
  // Vendor Information
  vendorName: z.string().min(2, c.nameMin),
  vendorNameEn: z.string().optional(),
  vendorNameAr: z.string().optional(),
  vendorNameKu: z.string().optional(),
  vendorNameTr: z.string().optional(),
  contactEmail: z.string().email(c.emailInvalid),
  contactPhone: z.string().min(10, c.phoneInvalid),
  businessLicense: z.string().optional(),
  taxId: z.string().optional(),
  description: z.string().min(20, c.descriptionMin),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  descriptionKu: z.string().optional(),
  descriptionTr: z.string().optional(),
  address: z.string().min(10, c.addressInvalid),
  city: z.string().min(2, c.cityInvalid),
  country: z.string().min(1, c.countryRequired),
  postalCode: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  iban: z.string().optional(),
  
  // User Account Information
  username: z.string().min(3, c.usernameMin),
  password: z.string().min(6, c.passwordMin),
  firstName: z.string().min(2, c.firstNameMin),
  lastName: z.string().min(2, c.lastNameMin),
});

type VendorRegistrationForm = z.infer<ReturnType<typeof createVendorRegistrationSchema>>;

export default function VendorRegistration() {
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const c = vendorRegistrationCopy[language];
  const vendorRegistrationSchema = useMemo(() => createVendorRegistrationSchema(c), [c]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<VendorRegistrationForm>({
    resolver: zodResolver(vendorRegistrationSchema),
    defaultValues: {
      vendorName: "",
      vendorNameEn: "",
      vendorNameAr: "",
      vendorNameKu: "",
      vendorNameTr: "",
      contactEmail: "",
      contactPhone: "",
      businessLicense: "",
      taxId: "",
      description: "",
      descriptionEn: "",
      descriptionAr: "",
      descriptionKu: "",
      descriptionTr: "",
      address: "",
      city: "",
      country: "IQ",
      postalCode: "",
      bankName: "",
      bankAccountNumber: "",
      bankAccountName: "",
      iban: "",
      // User account fields
      username: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: VendorRegistrationForm) => {
      // Separate vendor data from user data
      const vendorData = {
        vendorName: data.vendorName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        businessLicense: data.businessLicense,
        taxId: data.taxId,
        description: data.description,
        address: data.address,
        city: data.city,
        country: data.country,
      };

      const userData = {
        username: data.username,
        email: data.contactEmail, // استفاده از ایمیل شرکت
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.contactPhone, // استفاده از شماره تماس شرکت
      };

      return apiRequest("/api/vendors/register", {
        method: "POST",
        body: { vendorData, userData },
      });
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: `✅ ${c.successTitle}`,
        description: c.successMessage,
        variant: "default",
      });
      form.reset();
      setLogoFile(null);
      setLogoPreview("");
    },
    onError: (error: any) => {
      toast({
        title: `❌ ${c.errorTitle}`,
        description: error.message || c.retry,
        variant: "destructive",
      });
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: `⚠️ ${c.fileTooLarge}`,
          description: c.fileLimit,
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: VendorRegistrationForm) => {
    registerMutation.mutate(data);
  };

  if (isSuccess) {
    return (
      <div dir={direction} className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">{c.successTitle}</CardTitle>
            <CardDescription className="text-base mt-2">
              {c.successMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                📧 {c.emailSent} {form.watch("contactEmail")}
              </p>
              <Link href="/">
                <Button className="w-full" variant="outline">
                  {c.home}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div dir={direction} className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
            <Store className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {c.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {c.subtitle}
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>{c.companyInfo}</CardTitle>
            <CardDescription>
              {c.requiredNote}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{c.companyLogo}</label>
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="cursor-pointer"
                        data-testid="input-vendor-logo"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.logoLimit}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Company Name - Multilingual Tabs */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{c.companyName} <span className="text-red-500">*</span></label>
                  <Tabs defaultValue="main" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="main">{c.main}</TabsTrigger>
                      <TabsTrigger value="en">English</TabsTrigger>
                      <TabsTrigger value="ar">العربية</TabsTrigger>
                      <TabsTrigger value="ku">کوردی</TabsTrigger>
                      <TabsTrigger value="tr">Türkçe</TabsTrigger>
                    </TabsList>
                    <TabsContent value="main">
                      <FormField
                        control={form.control}
                        name="vendorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder={c.mainNamePlaceholder} {...field} data-testid="input-vendor-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="en">
                      <FormField
                        control={form.control}
                        name="vendorNameEn"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Company Name (English)" {...field} data-testid="input-vendor-name-en" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="ar">
                      <FormField
                        control={form.control}
                        name="vendorNameAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="اسم الشركة (العربية)" {...field} data-testid="input-vendor-name-ar" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="ku">
                      <FormField
                        control={form.control}
                        name="vendorNameKu"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="ناوی کۆمپانیا (کوردی)" {...field} data-testid="input-vendor-name-ku" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="tr">
                      <FormField
                        control={form.control}
                        name="vendorNameTr"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Şirket Adı (Türkçe)" {...field} data-testid="input-vendor-name-tr" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{c.contactEmail} <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="info@company.com" {...field} data-testid="input-contact-email" />
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
                        <FormLabel>{c.contactPhone} <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="+964 XXX XXX XXXX" {...field} data-testid="input-contact-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Business Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="businessLicense"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{c.businessLicense} <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="BL-XXXXX" {...field} data-testid="input-business-license" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{c.taxId} <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="TAX-XXXXX" {...field} data-testid="input-tax-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description - Multilingual Tabs */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{c.description} <span className="text-red-500">*</span></label>
                  <Tabs defaultValue="main" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="main">{c.main}</TabsTrigger>
                      <TabsTrigger value="en">English</TabsTrigger>
                      <TabsTrigger value="ar">العربية</TabsTrigger>
                      <TabsTrigger value="ku">کوردی</TabsTrigger>
                      <TabsTrigger value="tr">Türkçe</TabsTrigger>
                    </TabsList>
                    <TabsContent value="main">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder={c.mainDescriptionPlaceholder}
                                rows={4} 
                                {...field}
                                data-testid="textarea-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="en">
                      <FormField
                        control={form.control}
                        name="descriptionEn"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="Write about your company..." 
                                rows={4} 
                                {...field}
                                data-testid="textarea-description-en"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="ar">
                      <FormField
                        control={form.control}
                        name="descriptionAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="اكتب عن شركتك..." 
                                rows={4} 
                                {...field}
                                data-testid="textarea-description-ar"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="ku">
                      <FormField
                        control={form.control}
                        name="descriptionKu"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="دەربارەی کۆمپانیاکەت بنووسە..." 
                                rows={4} 
                                {...field}
                                data-testid="textarea-description-ku"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="tr">
                      <FormField
                        control={form.control}
                        name="descriptionTr"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="Şirketiniz hakkında yazın..." 
                                rows={4} 
                                {...field}
                                data-testid="textarea-description-tr"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Address Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{c.address} <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder={c.addressPlaceholder} {...field} data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{c.city} <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder={c.cityPlaceholder} {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{c.country} <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-country">
                              <SelectValue placeholder={c.selectCountry} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px]">
                            {countries.map((country) => (
                              <SelectItem key={country.value} value={country.value}>
                                {country.label}
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
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{c.postalCode}</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} data-testid="input-postal-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Bank Information */}
                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-lg font-semibold">{c.bankInfo}</h3>
                  <p className="text-sm text-muted-foreground">
                    {c.bankNote}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{c.bankName}</FormLabel>
                          <FormControl>
                            <Input placeholder={c.bankPlaceholder} {...field} data-testid="input-bank-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bankAccountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{c.accountHolder}</FormLabel>
                          <FormControl>
                            <Input placeholder={c.fullName} {...field} data-testid="input-bank-account-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bankAccountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{c.accountNumber}</FormLabel>
                          <FormControl>
                            <Input placeholder="XXXX-XXXX-XXXX" {...field} data-testid="input-bank-account-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="iban"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{c.iban}</FormLabel>
                          <FormControl>
                            <Input placeholder="IQ XX XXXX XXXX XXXX XXXX" {...field} data-testid="input-iban" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* User Account Information */}
                <div className="space-y-4 pt-6 border-t">
                  <h3 className="text-lg font-semibold">{c.accountInfo} <span className="text-red-500">*</span></h3>
                  <p className="text-sm text-muted-foreground">
                    {c.accountNote}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{c.username} <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder={c.usernamePlaceholder} {...field} data-testid="input-username" />
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
                          <FormLabel>{c.password} <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="password" placeholder={c.passwordPlaceholder} {...field} data-testid="input-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{c.firstName} <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder={c.firstName} {...field} data-testid="input-first-name" />
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
                          <FormLabel>{c.lastName} <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder={c.lastName} {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-6">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={registerMutation.isPending}
                    data-testid="button-submit-registration"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {c.submitting}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {c.submit}
                      </>
                    )}
                  </Button>
                  <Link href="/">
                    <Button type="button" variant="outline" data-testid="button-cancel">
                      {c.cancel}
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="mt-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📝 {c.important}</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>{c.note1}</li>
              <li>{c.note2}</li>
              <li>{c.note3}</li>
              <li>{c.note4}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
