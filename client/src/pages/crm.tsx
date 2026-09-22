import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Search, Plus, Users, TrendingUp, DollarSign, ShoppingCart, Eye, Edit, Activity, Trash2, Download, FileText, UserCog, ArrowUpDown, ArrowUp, ArrowDown, Shield, Settings, MessageCircle, Mail, UserCheck, MapPin, Globe } from "lucide-react";
import UnifiedCustomerProfile from "@/components/unified-customer-profile";
import { PasswordManagement } from "@/components/PasswordManagement";

import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { crmCurrency, crmDate, crmEnum, crmText } from "@/lib/crm-localization";

// Province and City components for Iraq geographical data

// Verification Settings Panel Component
function VerificationSettingsPanel() {
  const { language, direction } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current verification settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/customer/verification-settings"],
  });

  const settings = (settingsData as any)?.settings || {
    smsVerificationEnabled: false,
    emailVerificationEnabled: true,
    whatsappVerificationEnabled: false,
    requireBothVerifications: false,
    allowSkipVerification: false,
  };

  // Update verification settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      return await apiRequest("/api/customer/verification-settings", { method: "PUT", body: newSettings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/verification-settings"] });
      toast({
        title: crmText(language, "success"),
        description: crmText(language, "verificationUpdated"),
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: crmText(language, "error"),
        description: error.message || crmText(language, "failedUpdateSettings"),
      });
    },
  });

  const handleToggle = (field: string, value: boolean) => {
    let newSettings = { ...settings, [field]: value };
    
    // Mutual exclusivity logic:
    // If Allow Skip Verification is enabled -> disable all channels
    // If any channel is enabled -> disable Allow Skip Verification
    if (field === "allowSkipVerification" && value === true) {
      newSettings = {
        ...newSettings,
        smsVerificationEnabled: false,
        emailVerificationEnabled: false,
        whatsappVerificationEnabled: false,
        requireBothVerifications: false,
      };
    } else if (
      (field === "smsVerificationEnabled" || 
       field === "emailVerificationEnabled" || 
       field === "whatsappVerificationEnabled") && 
      value === true
    ) {
      newSettings = {
        ...newSettings,
        allowSkipVerification: false,
      };
    }
    
    updateSettingsMutation.mutate(newSettings);
  };

  if (settingsLoading) {
    return <div className="text-center py-4" dir={direction}>{crmText(language, "loadingSettings")}</div>;
  }

  return (
    <div className="space-y-4" dir={direction}>
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label htmlFor="email-verification" className="font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {crmText(language, "emailVerification")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {crmText(language, "emailVerificationDesc")}
          </p>
        </div>
        <Switch
          id="email-verification"
          checked={settings.emailVerificationEnabled}
          onCheckedChange={(checked) => handleToggle("emailVerificationEnabled", checked)}
          disabled={updateSettingsMutation.isPending}
        />
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label htmlFor="sms-verification" className="font-medium flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            {crmText(language, "smsVerification")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {crmText(language, "smsVerificationDesc")}
          </p>
        </div>
        <Switch
          id="sms-verification"
          checked={settings.smsVerificationEnabled}
          onCheckedChange={(checked) => handleToggle("smsVerificationEnabled", checked)}
          disabled={updateSettingsMutation.isPending}
        />
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label htmlFor="whatsapp-verification" className="font-medium flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            {crmText(language, "whatsappVerification")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {crmText(language, "whatsappVerificationDesc")}
          </p>
        </div>
        <Switch
          id="whatsapp-verification"
          checked={settings.whatsappVerificationEnabled}
          onCheckedChange={(checked) => handleToggle("whatsappVerificationEnabled", checked)}
          disabled={updateSettingsMutation.isPending}
        />
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
        <div>
          <Label htmlFor="skip-verification" className="font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {crmText(language, "allowSkip")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {crmText(language, "allowSkipDesc")}
          </p>
        </div>
        <Switch
          id="skip-verification"
          checked={settings.allowSkipVerification}
          onCheckedChange={(checked) => handleToggle("allowSkipVerification", checked)}
          disabled={updateSettingsMutation.isPending}
        />
      </div>

      {updateSettingsMutation.isPending && (
        <p className="text-sm text-muted-foreground text-center">{crmText(language, "saving")}</p>
      )}
    </div>
  );
}

const geographyCountryCode = (country?: string) => {
  const value = (country || "").trim().toLowerCase();
  if (["iraq", "عراق", "العراق"].includes(value)) return "IQ";
  if (["iran", "ایران", "إيران"].includes(value)) return "IR";
  if (["turkey", "ترکیه", "تركيا"].includes(value)) return "TR";
  return "";
};

function ProvinceSelect({ editingCustomer, setEditingCustomer }: {
  editingCustomer: CrmCustomer | null;
  setEditingCustomer: (customer: CrmCustomer | null) => void;
}) {
  const { language } = useLanguage();
  const countryCode = geographyCountryCode(editingCustomer?.country);
  const usesCentralRegions = countryCode === "IQ" || countryCode === "IR";
  
  const { data: provincesData } = useQuery({
    queryKey: ["/api/geography/regions", countryCode],
    queryFn: () => fetch(`/api/geography/regions?country=${countryCode}`).then(res => res.json()),
    enabled: usesCentralRegions,
    retry: 1,
  });

  const provinces = (provincesData && typeof provincesData === 'object' && 'data' in provincesData) ? provincesData.data : [];
  const selectedProvince = (provinces as any[]).find((province: any) =>
    province.nameEnglish === editingCustomer?.province ||
    province.nameArabic === editingCustomer?.province ||
    province.namePersian === editingCustomer?.province
  );

  if (!usesCentralRegions) {
    return (
      <div>
        <Label htmlFor="editProvince">{crmText(language, "provinceState")}</Label>
        <Input
          id="editProvince"
          placeholder={crmText(language, "enterProvince")}
          value={editingCustomer?.province || ""}
          onChange={(e) => setEditingCustomer({ ...editingCustomer!, province: e.target.value })}
        />
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor="editProvince">{crmText(language, "province")}</Label>
      <Select 
        value={selectedProvince ? String(selectedProvince.id) : ""}
        onValueChange={(value) => {
          const selectedProvince = (provinces as any[]).find((province: any) => String(province.id) === value);
          setEditingCustomer({
            ...editingCustomer!,
            province: selectedProvince?.namePersian || selectedProvince?.nameArabic || selectedProvince?.nameEnglish || "",
            cityRegion: "",
          });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={crmText(language, "selectProvince")} />
        </SelectTrigger>
        <SelectContent>
          {(provinces as any[]).map((province: any) => (
            <SelectItem key={province.id} value={String(province.id)}>
              {province.namePersian} / {province.nameEnglish}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CitySelect({ editingCustomer, setEditingCustomer }: {
  editingCustomer: CrmCustomer | null;
  setEditingCustomer: (customer: CrmCustomer | null) => void;
}) {
  const { language } = useLanguage();
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const countryCode = geographyCountryCode(editingCustomer?.country);
  const usesCentralRegions = countryCode === "IQ" || countryCode === "IR";
  
  // Get province ID when province changes
  const { data: provincesData } = useQuery({
    queryKey: ["/api/geography/regions", countryCode],
    queryFn: () => fetch(`/api/geography/regions?country=${countryCode}`).then(res => res.json()),
    enabled: usesCentralRegions,
    retry: 1,
  });

  const provinces = (provincesData && typeof provincesData === 'object' && 'data' in provincesData) ? provincesData.data : [];

  // Update selectedProvinceId when province changes
  useEffect(() => {
    if (editingCustomer?.province && Array.isArray(provinces) && provinces.length > 0) {
      const selectedProvince = (provinces as any[]).find((p: any) => 
        p.nameEnglish === editingCustomer.province ||
        p.nameArabic === editingCustomer.province ||
        p.namePersian === editingCustomer.province
      );
      if (selectedProvince) {
        setSelectedProvinceId(selectedProvince.id);
      }
    }
  }, [editingCustomer?.province, provinces]);

  // Fetch cities data based on selected province
  const { data: citiesData } = useQuery({
    queryKey: ["/api/geography/cities", selectedProvinceId],
    queryFn: () => {
      const url = selectedProvinceId 
        ? `/api/geography/cities?regionId=${selectedProvinceId}`
        : '';
      return fetch(url).then(res => res.json());
    },
    enabled: usesCentralRegions && selectedProvinceId !== null,
    retry: 1,
  });

  const cities = (citiesData && typeof citiesData === 'object' && 'data' in citiesData) ? citiesData.data : [];

  if (!usesCentralRegions) {
    return (
      <div>
        <Label htmlFor="editCity">{crmText(language, "cityRequired")}</Label>
        <Input
          id="editCity"
          placeholder={crmText(language, "enterCity")}
          value={editingCustomer?.cityRegion || ""}
          onChange={(e) => setEditingCustomer({ ...editingCustomer!, cityRegion: e.target.value })}
        />
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor="editCityRegion">{crmText(language, "cityRegion")}</Label>
      <Select 
        value={editingCustomer?.cityRegion || ""} 
        onValueChange={(value) => setEditingCustomer({ ...editingCustomer!, cityRegion: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder={crmText(language, "selectCity")} />
        </SelectTrigger>
        <SelectContent>
          {cities.map((city: any) => (
            <SelectItem key={city.id} value={city.namePersian}>
              {city.namePersian} / {city.nameEnglish}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface CrmCustomer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  country?: string;
  province?: string;
  cityRegion?: string;
  address?: string;
  secondaryAddress?: string;
  postalCode?: string;
  alternatePhone?: string;
  customerType: string;
  customerStatus: string;
  customerSource?: string;
  leadSource?: string;
  preferredLanguage: string;
  communicationPreference: string;
  // Business Information
  industry?: string;
  businessType?: string;
  companySize?: string;
  website?: string;
  taxId?: string;
  registrationNumber?: string;
  // Customer Management
  preferredPaymentMethod?: string;
  creditLimit?: string;
  assignedSalesRep?: string;
  marketingConsent?: boolean;
  notes?: string;
  // CRM Fields
  annualRevenue?: string;
  priceRange?: string;
  orderFrequency?: string;
  creditStatus?: string;
  // Statistics
  totalOrdersCount: number;
  totalSpent: string;
  averageOrderValue: string;
  lastOrderDate?: string;
  createdAt: string;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
}

interface CustomerActivity {
  id: number;
  activityType: string;
  description: string;
  performedBy: string;
  customerName?: string;
  createdAt: string;
  activityData?: any;
}

interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  totalRevenue: number;
  averageOrderValue: number;
  topCustomers: Array<{
    id: number;
    name: string;
    email: string;
    totalSpent: number;
    totalOrders: number;
  }>;
  customersByType: Array<{
    type: string;
    count: number;
  }>;
  recentActivities: CustomerActivity[];
}

export default function CRM() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomer | null>(null);
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);
  const [isCustomerDetailDialogOpen, setIsCustomerDetailDialogOpen] = useState(false);
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CrmCustomer | null>(null);
  const [originalEditingEmail, setOriginalEditingEmail] = useState("");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [bulkActionsLoading, setBulkActionsLoading] = useState(false);
  const [selectedCustomerForAuth, setSelectedCustomerForAuth] = useState<CrmCustomer | null>(null);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [authMethod, setAuthMethod] = useState<"sms" | "email">("email");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    email: "",
    firstName: "",
    lastName: "",
    company: "",
    phone: "",
    country: "",
    province: "",
    cityRegion: "",
    address: "",
    secondaryAddress: "",
    postalCode: "",
    password: "",
    customerType: "retail",
    customerSource: "website",
    customerStatus: "active",
    preferredLanguage: "fa",
    communicationPreference: "email",
    internalNotes: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { language, direction } = useLanguage();
  const [newCustomerRegionId, setNewCustomerRegionId] = useState("");
  const { data: geographyCountriesData } = useQuery({
    queryKey: ["/api/geography/countries"],
    queryFn: () => fetch("/api/geography/countries").then(res => res.json()),
  });
  const geographyCountries = (geographyCountriesData as any)?.data || [];
  const newCustomerCountryCode = geographyCountryCode(newCustomer.country);
  const newCustomerUsesCentralRegions = ["IQ", "IR"].includes(newCustomerCountryCode);
  const { data: newCustomerRegionsData } = useQuery({
    queryKey: ["/api/geography/regions", newCustomerCountryCode],
    queryFn: () => fetch(`/api/geography/regions?country=${newCustomerCountryCode}`).then(res => res.json()),
    enabled: newCustomerUsesCentralRegions,
  });
  const newCustomerRegions = (newCustomerRegionsData as any)?.data || [];
  const { data: newCustomerCitiesData } = useQuery({
    queryKey: ["/api/geography/cities", newCustomerRegionId],
    queryFn: () => fetch(`/api/geography/cities?regionId=${newCustomerRegionId}`).then(res => res.json()),
    enabled: newCustomerUsesCentralRegions && !!newCustomerRegionId,
  });
  const newCustomerCities = (newCustomerCitiesData as any)?.data || [];
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Fetch dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/crm/dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/crm/dashboard", {
        credentials: 'include',
      });
      const result = await response.json();
      return result.data;
    },
    enabled: isAuthenticated,
  });

  // Fetch customers with search and sorting
  const { data: customers = [], isLoading: customersLoading } = useQuery<CrmCustomer[]>({
    queryKey: ["/api/crm/customers", { search: searchTerm, sortField, sortDirection }],
    queryFn: async () => {
      if (searchTerm.length >= 2) {
        const response = await fetch(`/api/crm/customers/search?q=${encodeURIComponent(searchTerm)}`, {
          credentials: 'include',
        });
        const result = await response.json();
        return result.data || [];
      } else {
        const response = await fetch("/api/crm/customers?limit=50", {
          credentials: 'include',
        });
        const result = await response.json();
        return result.data || [];
      }
    },
    enabled: isAuthenticated,
  });

  // Sort customers locally
  const sortedCustomers = customers.slice().sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case "name":
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case "email":
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
        break;
      case "company":
        aValue = (a.company || "").toLowerCase();
        bValue = (b.company || "").toLowerCase();
        break;
      case "totalSpent":
        aValue = parseFloat(a.totalSpent) || 0;
        bValue = parseFloat(b.totalSpent) || 0;
        break;
      case "totalOrdersCount":
        aValue = a.totalOrdersCount || 0;
        bValue = b.totalOrdersCount || 0;
        break;
      case "createdAt":
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
        break;
      case "customerStatus":
        aValue = a.customerStatus.toLowerCase();
        bValue = b.customerStatus.toLowerCase();
        break;
      default:
        aValue = a.createdAt;
        bValue = b.createdAt;
    }
    
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Handle sort click
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sort icon
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? 
      <ArrowUp className="h-4 w-4 text-blue-600" /> : 
      <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const response = await fetch("/api/crm/customers", {
        method: "POST",
        body: JSON.stringify(customerData),
        headers: { "Content-Type": "application/json" },
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.message || "Failed to create customer");
        (error as any).response = { data: errorData };
        throw error;
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: crmText(language, "success"), description: crmText(language, "customerCreated") });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/dashboard"] });
      setIsNewCustomerDialogOpen(false);
      setNewCustomer({
        email: "",
        firstName: "",
        lastName: "",
        company: "",
        phone: "",
        country: "",
        province: "",
        cityRegion: "",
        address: "",
        secondaryAddress: "",
        postalCode: "",
        password: "",
        customerType: "retail",
        customerSource: "website",
        customerStatus: "active",
        preferredLanguage: "persian",
        communicationPreference: "email",
        internalNotes: ""
      });
    },
    onError: (error: any) => {
      // Extract error message from response
      const errorMessage = error?.response?.data?.message || error?.message || "خطا در ایجاد مشتری جدید";
      
      toast({ 
        title: crmText(language, "error"),
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/crm/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.message || "Failed to update customer");
        (error as any).response = { data: errorData };
        throw error;
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log("🔧 [FRONTEND UPDATE SUCCESS] Response data:", data);
      toast({ title: crmText(language, "success"), description: crmText(language, "customerUpdated") });
      
      // AGGRESSIVE CACHE CLEARING - Clear all related caches
      queryClient.clear(); // Nuclear option - clear all cache
      
      // Wait a bit then refetch main data
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/crm/customers"] });
        queryClient.refetchQueries({ queryKey: ["/api/crm/dashboard"] });
        
        // Force a full page refresh if still not working
        if (editingCustomer && data.data) {
          console.log("🔄 [FORCE REFRESH] Triggering window reload to ensure UI updates");
          window.location.reload();
        }
      }, 100);
      
      setIsEditCustomerDialogOpen(false);
      setEditingCustomer(null);
    },
    onError: (error: any) => {
      // Extract error message from response
      const errorMessage = error?.response?.data?.message || error?.message || "خطا در به‌روزرسانی اطلاعات مشتری";
      
      toast({ 
        title: crmText(language, "error"),
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/crm/customers/${id}`, {
        method: "DELETE",
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to delete customer");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: crmText(language, "success"), description: crmText(language, "customerDeleted") });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/dashboard"] });
    },
    onError: (error) => {
      toast({ 
        title: crmText(language, "error"),
        description: crmText(language, "failedDeleteCustomer"),
        variant: "destructive" 
      });
    }
  });

  const handleCreateCustomer = () => {
    if (!newCustomer.email || !newCustomer.firstName || !newCustomer.lastName) {
      toast({
        title: crmText(language, "error"),
        description: crmText(language, "requiredFields"),
        variant: "destructive"
      });
      return;
    }
    createCustomerMutation.mutate(newCustomer);
  };

  const handleEditCustomer = (customer: CrmCustomer) => {
    // Open CRM edit dialog instead of navigating to customer portal
    setEditingCustomer(customer);
    setOriginalEditingEmail(customer.email);
    setIsEditCustomerDialogOpen(true);
  };

  const handleUpdateCustomer = () => {
    if (!editingCustomer || !editingCustomer.firstName || !editingCustomer.lastName) {
      toast({
        title: crmText(language, "error"),
        description: crmText(language, "requiredFields"),
        variant: "destructive"
      });
      return;
    }

    console.log("Frontend editingCustomer secondaryAddress value:", editingCustomer.secondaryAddress);

    // Keep the same customer ID so orders and activity history remain linked.
    // Include all fields even if they are null/undefined to ensure they get updated
    const updateData = {
      email: editingCustomer.email,
      firstName: editingCustomer.firstName,
      lastName: editingCustomer.lastName,
      company: editingCustomer.company || null,
      country: editingCustomer.country,
      province: editingCustomer.province || null,
      cityRegion: editingCustomer.cityRegion,
      address: editingCustomer.address,
      secondaryAddress: editingCustomer.secondaryAddress || null,
      postalCode: editingCustomer.postalCode || null,
      alternatePhone: editingCustomer.alternatePhone || null,
      // Business Information
      industry: editingCustomer.industry || null,
      businessType: editingCustomer.businessType || null,
      companySize: editingCustomer.companySize || null,
      website: editingCustomer.website || null,
      taxId: editingCustomer.taxId || null,
      registrationNumber: editingCustomer.registrationNumber || null,
      // Customer Management
      preferredPaymentMethod: editingCustomer.preferredPaymentMethod || null,
      creditLimit: editingCustomer.creditLimit || null,
      leadSource: editingCustomer.leadSource || null,
      marketingConsent: editingCustomer.marketingConsent || false,
      notes: editingCustomer.notes || null,
      // CRM Fields
      annualRevenue: editingCustomer.annualRevenue || null,
      priceRange: editingCustomer.priceRange || null,
      orderFrequency: editingCustomer.orderFrequency || null,
      creditStatus: editingCustomer.creditStatus || null,
      // Communication Preferences
      communicationPreference: editingCustomer.communicationPreference,
      preferredLanguage: editingCustomer.preferredLanguage,
      // Customer Status
      customerType: editingCustomer.customerType,
      customerStatus: editingCustomer.customerStatus,
      customerSource: editingCustomer.customerSource,
      // Authentication Settings
      smsEnabled: editingCustomer.smsEnabled ?? true,
      emailEnabled: editingCustomer.emailEnabled ?? true,
    };

    console.log("🔧 [FRONTEND UPDATE] Customer ID:", editingCustomer.id);
    console.log("🔧 [FRONTEND UPDATE] Current cityRegion:", editingCustomer.cityRegion);
    console.log("🔧 [FRONTEND UPDATE] Current province:", editingCustomer.province);
    console.log("🔧 [FRONTEND UPDATE] UpdateData being sent:", updateData);
    updateCustomerMutation.mutate({ id: editingCustomer.id, data: updateData });
  };

  const handleDeleteCustomer = (id: number) => {
    if (confirm(crmText(language, "confirmDelete"))) {
      deleteCustomerMutation.mutate(id);
    }
  };

  const handleBulkToggleVerification = async (type: 'sms' | 'email', enabled: boolean) => {
    setBulkActionsLoading(true);
    try {
      const response = await fetch('/api/crm/customers/bulk-toggle-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type,
          enabled
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update verification settings');
      }

      // Refresh customers data
      await queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] });

      const actionText = enabled ? 'فعال' : 'غیرفعال';
      const typeText = type === 'sms' ? 'SMS' : 'ایمیل';
      
      toast({
        title: crmText(language, "success"),
        description: `ارسال کد تایید ${typeText} برای ${result.updatedCount} مشتری ${actionText} شد`,
      });
    } catch (error) {
      console.error('Error bulk toggling verification:', error);
      toast({
        title: crmText(language, "error"),
        description: error instanceof Error ? error.message : "خطا در تغییر تنظیمات",
        variant: "destructive"
      });
    } finally {
      setBulkActionsLoading(false);
    }
  };

  const handleExportAnalytics = async () => {
    try {
      const response = await fetch('/api/crm/analytics/export-pdf', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `customer-analytics-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: crmText(language, "success"),
        description: crmText(language, "exportAnalytics")
      });
    } catch (error) {
      toast({
        title: crmText(language, "error"),
        description: crmText(language, "failedExport"),
        variant: "destructive"
      });
    }
  };

  const handleExportCustomer = async (customerId: number) => {
    try {
      const response = await fetch(`/api/crm/customers/${customerId}/export-pdf`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate customer PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `customer-report-${customerId}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: crmText(language, "success"),
        description: crmText(language, "exportReport"),
      });
    } catch (error) {
      toast({
        title: crmText(language, "error"),
        description: crmText(language, "failedExport"),
        variant: "destructive"
      });
    }
  };

  const handleCustomerAuthentication = async () => {
    if (!selectedCustomerForAuth) return;

    setIsAuthenticating(true);
    try {
      const response = await fetch('/api/crm/customer-authentication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customerId: selectedCustomerForAuth.id,
          method: authMethod,
          customerEmail: selectedCustomerForAuth.email,
          customerPhone: selectedCustomerForAuth.phone,
          customerName: `${selectedCustomerForAuth.firstName} ${selectedCustomerForAuth.lastName}`
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'خطا در ارسال کد احراز هویت');
      }

      toast({
        title: crmText(language, "success"),
        description: `کد احراز هویت ${authMethod === 'sms' ? 'SMS' : 'ایمیل'} برای ${selectedCustomerForAuth.firstName} ${selectedCustomerForAuth.lastName} ارسال شد`,
      });

      // Refresh activities if needed
      await queryClient.invalidateQueries({ queryKey: ["/api/crm/dashboard"] });

      setIsAuthDialogOpen(false);
      setSelectedCustomerForAuth(null);
    } catch (error) {
      console.error('Error sending authentication:', error);
      toast({
        title: crmText(language, "error"),
        description: error instanceof Error ? error.message : "خطا در ارسال کد احراز هویت",
        variant: "destructive"
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const formatCurrency = (amount: string | number, currency: string = 'IQD') => {
    const validCurrencies = ['USD', 'EUR', 'IQD', 'IRR'];
    return crmCurrency(amount, language, validCurrencies.includes(currency) ? currency : 'IQD');
  };

  const formatDate = (dateString: string) => {
    return crmDate(dateString, language);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-purple-100 text-purple-800';
      case 'blacklisted': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'retail': return 'bg-blue-100 text-blue-800';
      case 'wholesale': return 'bg-orange-100 text-orange-800';
      case 'b2b': return 'bg-green-100 text-green-800';
      case 'distributor': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen" dir={direction}>{crmText(language, "loading")}</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir={direction}>
      <div className="flex justify-between items-center">
        <div>
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {crmText(language, "crmTitle")}
            </h1>
            <p className="text-lg text-blue-600 mt-1">
              {crmText(language, "crmSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => handleExportAnalytics()}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {crmText(language, "exportAnalytics")}
          </Button>
          <Button onClick={() => setLocation('/customer-profile-edit?mode=create')}>
            <Plus className="h-4 w-4 mr-2" />
            {crmText(language, "newCustomer")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">{crmText(language, "dashboard")}</TabsTrigger>
          <TabsTrigger value="customers">{crmText(language, "customers")}</TabsTrigger>
          <TabsTrigger value="activities">{crmText(language, "activities")}</TabsTrigger>
          <TabsTrigger value="settings">{crmText(language, "settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {statsLoading ? (
            <div className="text-center py-8">{crmText(language, "loadingStats")}</div>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{crmText(language, "totalCustomers")}</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardStats?.totalCustomers || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{crmText(language, "activeCustomers")}</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardStats?.activeCustomers || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{crmText(language, "newThisMonth")}</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardStats?.newCustomersThisMonth || 0}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Customers Card - Full Width */}
              <Card>
                <CardHeader>
                  <CardTitle>{crmText(language, "topCustomers")}</CardTitle>
                  <CardDescription>{crmText(language, "highestPurchase")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{crmText(language, "name")}</TableHead>
                        <TableHead>{crmText(language, "email")}</TableHead>
                        <TableHead>{crmText(language, "totalSpent")}</TableHead>
                        <TableHead>{crmText(language, "orders")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardStats?.topCustomers?.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.email}</TableCell>
                          <TableCell>{formatCurrency(customer.totalSpent)}</TableCell>
                          <TableCell>{customer.totalOrders}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={crmText(language, "search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Bulk SMS & Email Settings */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {crmText(language, "bulkVerificationTitle")}
              </CardTitle>
              <CardDescription>
                {crmText(language, "bulkVerificationDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  onClick={() => handleBulkToggleVerification('sms', true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  disabled={bulkActionsLoading}
                >
                  <MessageCircle className="h-4 w-4" />
                  {crmText(language, "enableForAll", { channel: crmEnum("sms", language) })}
                </Button>
                
                <Button
                  onClick={() => handleBulkToggleVerification('sms', false)}
                  variant="outline"
                  className="flex items-center gap-2 border-red-500 text-red-600 hover:bg-red-50"
                  disabled={bulkActionsLoading}
                >
                  <MessageCircle className="h-4 w-4" />
                  {crmText(language, "disableForAll", { channel: crmEnum("sms", language) })}
                </Button>
                
                <Button
                  onClick={() => handleBulkToggleVerification('email', true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  disabled={bulkActionsLoading}
                >
                  <Mail className="h-4 w-4" />
                  {crmText(language, "enableForAll", { channel: crmEnum("email", language) })}
                </Button>
                
                <Button
                  onClick={() => handleBulkToggleVerification('email', false)}
                  variant="outline"
                  className="flex items-center gap-2 border-red-500 text-red-600 hover:bg-red-50"
                  disabled={bulkActionsLoading}
                >
                  <Mail className="h-4 w-4" />
                  {crmText(language, "disableForAll", { channel: crmEnum("email", language) })}
                </Button>
                
                {bulkActionsLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    {crmText(language, "processing")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customers Table */}
          <Card>
            <CardHeader>
              <CardTitle>{crmText(language, "customerList")}</CardTitle>
              <CardDescription>{crmText(language, "manageCustomers")}</CardDescription>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="text-center py-8">{crmText(language, "loading")}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none py-2 px-3"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-2">
                          Name
                          {getSortIcon("name")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none py-2 px-3"
                        onClick={() => handleSort("email")}
                      >
                        <div className="flex items-center gap-2">
                          Email
                          {getSortIcon("email")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none py-2 px-3"
                        onClick={() => handleSort("company")}
                      >
                        <div className="flex items-center gap-2">
                          Company
                          {getSortIcon("company")}
                        </div>
                      </TableHead>
                      <TableHead className="py-2 px-3">{crmText(language, "type")}</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none py-2 px-3"
                        onClick={() => handleSort("customerStatus")}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {getSortIcon("customerStatus")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none py-2 px-3"
                        onClick={() => handleSort("totalSpent")}
                      >
                        <div className="flex items-center gap-2">
                          Total Purchases
                          {getSortIcon("totalSpent")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none py-2 px-3"
                        onClick={() => handleSort("createdAt")}
                      >
                        <div className="flex items-center gap-2">
                          Registration Date
                          {getSortIcon("createdAt")}
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[140px] py-2 px-3">{crmText(language, "actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCustomers.map((customer) => (
                      <TableRow key={customer.id} className="h-12">
                        <TableCell className="font-medium py-2 px-3">
                          <div className="truncate max-w-[120px]">
                            {customer.firstName} {customer.lastName}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="truncate max-w-[150px]">
                            {customer.email}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="truncate max-w-[100px]">
                            {customer.company || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <Badge className={`${getTypeBadgeColor(customer.customerType)} text-xs px-2 py-1`}>
                            {crmEnum(customer.customerType, language)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <Badge className={`${getStatusBadgeColor(customer.customerStatus)} text-xs px-2 py-1`}>
                            {crmEnum(customer.customerStatus, language)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="truncate max-w-[100px]">
                            {formatCurrency(customer.totalSpent)}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="truncate max-w-[100px] text-sm">
                            {formatDate(customer.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[140px] py-2 px-3">
                          <div className="flex items-center gap-1 justify-start">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCustomer(customer)}
                              title={crmText(language, "editCustomer")}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setIsCustomerDetailDialogOpen(true);
                              }}
                              title={crmText(language, "manageCustomerPassword")}
                              className="text-blue-600 hover:text-blue-700 h-8 w-8 p-0"
                            >
                              <Shield className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCustomerForAuth(customer);
                                setIsAuthDialogOpen(true);
                              }}
                              title="ارسال کد احراز هویت (SMS/Email)"
                              className="text-green-600 hover:text-green-700 h-8 w-8 p-0"
                            >
                              <UserCheck className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportCustomer(customer.id)}
                              title={crmText(language, "exportCustomerReport")}
                              className="h-8 w-8 p-0"
                            >
                              <FileText className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCustomer(customer.id)}
                              className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                              title={crmText(language, "deleteCustomer")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{crmText(language, "recentActivities")}</CardTitle>
              <CardDescription>{crmText(language, "latestActivities")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardStats?.recentActivities?.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{crmEnum(activity.activityType, language)}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.customerName && (
                          <span className="font-medium text-blue-600">{activity.customerName} - </span>
                        )}
                        {crmText(language, "by")} {crmEnum(activity.performedBy, language)}{" "}
                        {crmText(language, "on")} {formatDate(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {(!dashboardStats?.recentActivities || dashboardStats.recentActivities.length === 0) && (
                  <div className="py-6 text-center text-muted-foreground">
                    {crmText(language, "noActivities")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {crmText(language, "customerVerificationSettings")}
              </CardTitle>
              <CardDescription>
                {crmText(language, "verificationMethodsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerificationSettingsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Customer Dialog */}
      <Dialog open={isNewCustomerDialogOpen} onOpenChange={setIsNewCustomerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{crmText(language, "newCustomer")}</DialogTitle>
            <DialogDescription>{crmText(language, "enterCustomer")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">{crmText(language, "firstName")}</Label>
                <Input
                  id="firstName"
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">{crmText(language, "lastName")}</Label>
                <Input
                  id="lastName"
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">{crmText(language, "email")} *</Label>
              <Input
                id="email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="company">{crmText(language, "company")}</Label>
              <Input
                id="company"
                value={newCustomer.company}
                onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="phone">{crmText(language, "mobilePhone")} *</Label>
              <Input
                id="phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerType">{crmText(language, "customerType")}</Label>
                <Select value={newCustomer.customerType} onValueChange={(value) => setNewCustomer({ ...newCustomer, customerType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["retail", "wholesale", "b2b", "distributor"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="customerSource">{crmText(language, "source")}</Label>
                <Select value={newCustomer.customerSource} onValueChange={(value) => setNewCustomer({ ...newCustomer, customerSource: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["website", "referral", "marketing", "cold_call", "trade_show"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preferredLanguage">{crmText(language, "preferredLanguage")}</Label>
                <Select value={newCustomer.preferredLanguage} onValueChange={(value) => setNewCustomer({ ...newCustomer, preferredLanguage: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["fa", "en", "ar", "ku", "tr"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="communicationPreference">{crmText(language, "communicationPreference")}</Label>
                <Select value={newCustomer.communicationPreference} onValueChange={(value) => setNewCustomer({ ...newCustomer, communicationPreference: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["email", "sms", "phone", "whatsapp"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="country">{crmText(language, "countryRequired")}</Label>
                <Select
                  value={newCustomer.country}
                  onValueChange={(value) => {
                    setNewCustomer({ ...newCustomer, country: value, province: "", cityRegion: "" });
                    setNewCustomerRegionId("");
                  }}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder={crmText(language, "selectCountry")} />
                  </SelectTrigger>
                  <SelectContent>
                    {geographyCountries.map((country: any) => (
                      <SelectItem key={country.code} value={country.nameEnglish}>
                        {country.namePersian} / {country.nameEnglish}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="province">{crmText(language, "provinceState")}</Label>
                {newCustomerUsesCentralRegions ? (
                  <Select
                    value={newCustomerRegionId}
                    onValueChange={(value) => {
                      const region = newCustomerRegions.find((item: any) => String(item.id) === value);
                      setNewCustomerRegionId(value);
                      setNewCustomer({
                        ...newCustomer,
                        province: region?.namePersian || region?.nameArabic || region?.nameEnglish || "",
                        cityRegion: "",
                      });
                    }}
                  >
                    <SelectTrigger id="province">
                      <SelectValue placeholder={crmText(language, "selectProvince")} />
                    </SelectTrigger>
                    <SelectContent>
                      {newCustomerRegions.map((region: any) => (
                        <SelectItem key={region.id} value={String(region.id)}>
                          {region.namePersian} / {region.nameEnglish}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="province"
                    required
                    placeholder={crmText(language, "enterProvince")}
                    value={newCustomer.province}
                    onChange={(e) => setNewCustomer({ ...newCustomer, province: e.target.value })}
                  />
                )}
              </div>
              <div>
                <Label htmlFor="cityRegion">{crmText(language, "cityRegion")}</Label>
                {newCustomerUsesCentralRegions ? (
                  <Select
                    value={newCustomer.cityRegion}
                    onValueChange={(value) => setNewCustomer({ ...newCustomer, cityRegion: value })}
                    disabled={!newCustomerRegionId}
                  >
                    <SelectTrigger id="cityRegion">
                      <SelectValue placeholder={crmText(language, "selectCity")} />
                    </SelectTrigger>
                    <SelectContent>
                      {newCustomerCities.map((city: any) => (
                        <SelectItem key={city.id} value={city.namePersian}>
                          {city.namePersian} / {city.nameEnglish}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="cityRegion"
                    required
                    placeholder={crmText(language, "cityRegion")}
                    value={newCustomer.cityRegion}
                    onChange={(e) => setNewCustomer({ ...newCustomer, cityRegion: e.target.value })}
                  />
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="address">{crmText(language, "streetAddressRequired")}</Label>
              <Input
                id="address"
                required
                placeholder={crmText(language, "streetAddressRequired")}
                value={newCustomer.address || ""}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="secondaryAddress">{crmText(language, "secondaryAddress")}</Label>
                <Input
                  id="secondaryAddress"
                  placeholder={crmText(language, "secondaryAddress")}
                  value={newCustomer.secondaryAddress || ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, secondaryAddress: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="postalCode">{crmText(language, "postalCode")}</Label>
                <Input
                  id="postalCode"
                  placeholder={crmText(language, "postalCode")}
                  value={newCustomer.postalCode || ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, postalCode: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">{crmText(language, "password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={crmText(language, "optional")}
                value={newCustomer.password || ""}
                onChange={(e) => setNewCustomer({ ...newCustomer, password: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="internalNotes">{crmText(language, "internalNotes")}</Label>
              <Textarea
                id="internalNotes"
                value={newCustomer.internalNotes}
                onChange={(e) => setNewCustomer({ ...newCustomer, internalNotes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsNewCustomerDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCustomer} disabled={createCustomerMutation.isPending}>
                {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog open={isCustomerDetailDialogOpen} onOpenChange={setIsCustomerDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{crmText(language, "customerDetails")}</DialogTitle>
            <DialogDescription>{crmText(language, "customerInformation")}</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">{crmText(language, "customerDetails")}</TabsTrigger>
                <TabsTrigger value="password">{crmText(language, "passwordManagement")}</TabsTrigger>
                <TabsTrigger value="profile">{crmText(language, "overview")}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{crmText(language, "name")}</Label>
                    <p className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                  </div>
                  <div>
                    <Label>{crmText(language, "email")}</Label>
                    <p className="font-medium">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <Label>{crmText(language, "company")}</Label>
                    <p className="font-medium">{selectedCustomer.company || '-'}</p>
                  </div>
                  <div>
                    <Label>{crmText(language, "phone")}</Label>
                    <p className="font-medium">{selectedCustomer.phone || '-'}</p>
                  </div>
                  <div>
                    <Label>{crmText(language, "totalPurchases")}</Label>
                    <p className="font-medium">{formatCurrency(selectedCustomer.totalSpent)}</p>
                  </div>
                  <div>
                    <Label>{crmText(language, "orders")}</Label>
                    <p className="font-medium">{selectedCustomer.totalOrdersCount}</p>
                  </div>
                  <div>
                    <Label>{crmText(language, "avgOrderValue")}</Label>
                    <p className="font-medium">{formatCurrency(selectedCustomer.averageOrderValue)}</p>
                  </div>
                  <div>
                    <Label>{crmText(language, "registrationDate")}</Label>
                    <p className="font-medium">{formatDate(selectedCustomer.createdAt)}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="password" className="space-y-4">
                <PasswordManagement
                  customerId={selectedCustomer.id}
                  customerEmail={selectedCustomer.email}
                  customerName={`${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
                  customerPhone={selectedCustomer.phone}
                />
              </TabsContent>
              
              <TabsContent value="profile" className="space-y-4">
                <UnifiedCustomerProfile customerId={selectedCustomer.id} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditCustomerDialogOpen} onOpenChange={setIsEditCustomerDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{crmText(language, "editCustomer")}</DialogTitle>
            <DialogDescription>{crmText(language, "editDescription")}</DialogDescription>
          </DialogHeader>
          {editingCustomer && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editFirstName">{crmText(language, "firstNameRequired")}</Label>
                    <Input
                      id="editFirstName"
                      placeholder={crmText(language, "firstName")}
                      value={editingCustomer.firstName}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editLastName">{crmText(language, "lastNameRequired")}</Label>
                    <Input
                      id="editLastName"
                      placeholder={crmText(language, "lastName")}
                      value={editingCustomer.lastName}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editEmail">{crmText(language, "emailAddressRequired")}</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  />
                  {editingCustomer.email !== originalEditingEmail && (
                    <p className="mt-1 text-sm text-amber-700">
                      ایمیل ورود تغییر می‌کند؛ سفارش‌ها و سوابق مشتری با همان شناسه حفظ می‌شوند.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="editCompany">{crmText(language, "company")}</Label>
                  <Input
                    id="editCompany"
                    placeholder={crmText(language, "companyNamePlaceholder")}
                    value={editingCustomer.company || ""}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, company: e.target.value })}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {crmText(language, "contactInformation")}
                </h3>

                <div>
                  <Label htmlFor="editPhone">{crmText(language, "primaryPhoneRequired")}</Label>
                  <Input
                    id="editPhone"
                    placeholder="+964 XXX XXX XXXX"
                    value={editingCustomer.phone || ""}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                  <Label htmlFor="editCountry">{crmText(language, "countryRequired")}</Label>
                    <Select
                      value={editingCustomer.country || ""}
                      onValueChange={(value) => setEditingCustomer({
                        ...editingCustomer,
                        country: value,
                        province: "",
                        cityRegion: "",
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={crmText(language, "selectCountry")} />
                      </SelectTrigger>
                      <SelectContent>
                          {geographyCountries.map((country: any) => (
                            <SelectItem key={country.code} value={country.nameEnglish}>
                              {country.namePersian} / {country.nameEnglish}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <ProvinceSelect 
                    editingCustomer={editingCustomer}
                    setEditingCustomer={setEditingCustomer}
                  />

                  <CitySelect 
                    editingCustomer={editingCustomer}
                    setEditingCustomer={setEditingCustomer}
                  />
                </div>

                <div>
                  <Label htmlFor="editAddress">{crmText(language, "streetAddressRequired")}</Label>
                  <Input
                    id="editAddress"
                    placeholder={crmText(language, "fullAddress")}
                    value={editingCustomer.address || ""}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editSecondaryAddress">{crmText(language, "secondaryAddress")}</Label>
                    <Input
                      id="editSecondaryAddress"
                      placeholder={crmText(language, "secondaryAddressPlaceholder")}
                      value={editingCustomer.secondaryAddress || ""}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, secondaryAddress: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="editPostalCode">{crmText(language, "postalCode")}</Label>
                    <Input
                      id="editPostalCode"
                      placeholder={crmText(language, "postalCodePlaceholder")}
                      value={editingCustomer.postalCode || ""}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, postalCode: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {crmText(language, "additionalContactInformation")}
                </h3>
                
                <div>
                  <Label htmlFor="editAlternatePhone">{crmText(language, "alternatePhone")}</Label>
                  <Input
                    id="editAlternatePhone"
                    placeholder={crmText(language, "secondaryPhonePlaceholder")}
                    value={editingCustomer.alternatePhone || ""}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, alternatePhone: e.target.value })}
                  />
                </div>
              </div>

              {/* Communication Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {crmText(language, "communicationPreferences")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editCommunicationPreference">{crmText(language, "communicationPreference")}</Label>
                    <Select value={editingCustomer.communicationPreference || "email"} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, communicationPreference: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["email", "phone", "whatsapp"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="editPreferredLanguage">{crmText(language, "preferredLanguage")}</Label>
                    <Select value={editingCustomer.preferredLanguage || "en"} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, preferredLanguage: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["en", "fa", "ar"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {crmText(language, "businessInformation")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editIndustry">{crmText(language, "industry")}</Label>
                    <Select value={editingCustomer.industry || ""} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, industry: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={crmText(language, "selectIndustry")} />
                      </SelectTrigger>
                      <SelectContent>
                        {["chemical", "petrochemical", "pharmaceutical", "agriculture", "construction", "automotive", "textile", "food", "water_treatment", "paint", "other"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="editBusinessType">{crmText(language, "businessType")}</Label>
                    <Select value={editingCustomer.businessType || ""} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, businessType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={crmText(language, "selectBusinessType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {["manufacturer", "distributor", "retailer", "service_provider", "research", "consultant", "end_user"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editCompanySize">{crmText(language, "companySize")}</Label>
                    <Select value={editingCustomer.companySize || ""} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, companySize: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={crmText(language, "selectCompanySize")} />
                      </SelectTrigger>
                      <SelectContent>
                        {["1-10", "11-50", "51-200", "201-500", "500+"].map((value) => (
                          <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="editWebsite">{crmText(language, "website")}</Label>
                    <Input
                      id="editWebsite"
                      placeholder="https://www.example.com"
                      value={editingCustomer.website || ""}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, website: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editTaxId">{crmText(language, "taxId")}</Label>
                    <Input
                      id="editTaxId"
                      placeholder={crmText(language, "taxIdPlaceholder")}
                      value={editingCustomer.taxId || ""}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, taxId: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="editRegistrationNumber">{crmText(language, "registrationNumber")}</Label>
                    <Input
                      id="editRegistrationNumber"
                      placeholder={crmText(language, "registrationNumberPlaceholder")}
                      value={editingCustomer.registrationNumber || ""}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, registrationNumber: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Customer Management */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {crmText(language, "customerManagement")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editCustomerType">{crmText(language, "customerType")}</Label>
                    <Select value={editingCustomer.customerType || ""} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, customerType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={crmText(language, "selectCustomerType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {["regular", "vip", "wholesale", "retail", "industrial"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="editPreferredPaymentMethod">{crmText(language, "paymentMethod")}</Label>
                    <Select value={editingCustomer.preferredPaymentMethod || ""} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, preferredPaymentMethod: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={crmText(language, "selectPaymentMethod")} />
                      </SelectTrigger>
                      <SelectContent>
                        {["cash", "bank_transfer", "check", "credit", "installments"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                  <Label htmlFor="editCreditLimit">{crmText(language, "creditLimit")}</Label>
                    <Input
                      id="editCreditLimit"
                      placeholder={crmText(language, "creditLimitPlaceholder")}
                      value={editingCustomer.creditLimit || ""}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, creditLimit: e.target.value })}
                    />
                  </div>

                  <div>
                  <Label htmlFor="editLeadSource">{crmText(language, "source")}</Label>
                    <Select value={editingCustomer.leadSource || ""} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, leadSource: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={crmText(language, "selectLeadSource")} />
                      </SelectTrigger>
                      <SelectContent>
                        {["website", "referral", "social_media", "advertising", "trade_show", "cold_call", "other"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="editCustomerStatus">{crmText(language, "status")}</Label>
                  <Select value={editingCustomer.customerStatus || ""} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, customerStatus: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={crmText(language, "selectStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                        {["active", "inactive", "vip", "blacklisted"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* CRM Fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {crmText(language, "crmInformation")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editAnnualRevenue">{crmText(language, "annualRevenue")}</Label>
                    <Select value={editingCustomer.annualRevenue || ""} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, annualRevenue: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={crmText(language, "selectAnnualRevenue")} />
                      </SelectTrigger>
                      <SelectContent>
                        {["under_100m", "100m_500m", "500m_1b", "1b_5b", "over_5b"].map((value) => (
                          <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="editPriceRange">{crmText(language, "priceRange")}</Label>
                    <Select value={editingCustomer.priceRange || ""} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, priceRange: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={crmText(language, "selectPriceRange")} />
                      </SelectTrigger>
                      <SelectContent>
                        {["budget", "mid_range", "premium", "enterprise"].map((value) => (
                          <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editOrderFrequency">{crmText(language, "orderFrequency")}</Label>
                    <Select value={editingCustomer.orderFrequency || ""} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, orderFrequency: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={crmText(language, "selectOrderFrequency")} />
                      </SelectTrigger>
                      <SelectContent>
                        {["weekly", "monthly", "quarterly", "yearly", "as_needed", "seasonal"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="editCreditStatus">{crmText(language, "creditStatus")}</Label>
                    <Select value={editingCustomer.creditStatus || ""} onValueChange={(value) => setEditingCustomer({ ...editingCustomer, creditStatus: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={crmText(language, "selectCreditStatus")} />
                      </SelectTrigger>
                      <SelectContent>
                        {["excellent", "good", "fair", "poor", "no_credit", "pending"].map((value) => <SelectItem key={value} value={value}>{crmEnum(value, language)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                    <Label htmlFor="editNotes">{crmText(language, "notes")}</Label>
                  <Input
                    id="editNotes"
                    placeholder={crmText(language, "additionalNotes")}
                    value={editingCustomer.notes || ""}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  />
                </div>
              </div>

              {/* Authentication Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Authentication Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="sms-auth" className="font-medium">{crmText(language, "smsAuth")}</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable SMS verification for this customer
                      </p>
                    </div>
                    <Switch
                      id="sms-auth"
                      checked={editingCustomer.smsEnabled ?? true}
                      onCheckedChange={(checked) => setEditingCustomer({ ...editingCustomer, smsEnabled: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="email-auth" className="font-medium">{crmText(language, "emailAuth")}</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable email verification for this customer
                      </p>
                    </div>
                    <Switch
                      id="email-auth"
                      checked={editingCustomer.emailEnabled ?? true}
                      onCheckedChange={(checked) => setEditingCustomer({ ...editingCustomer, emailEnabled: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditCustomerDialogOpen(false)}>
                  {crmText(language, "cancel")}
                </Button>
                <Button 
                  onClick={handleUpdateCustomer}
                  disabled={updateCustomerMutation.isPending}
                >
                  {updateCustomerMutation.isPending ? crmText(language, "saving") : crmText(language, "saveChanges")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Authentication Dialog */}
      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">{crmText(language, "authenticateCustomer")}</DialogTitle>
            <DialogDescription className="text-right">
              احراز هویت برای: {selectedCustomerForAuth?.firstName} {selectedCustomerForAuth?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4" dir="rtl">
            <div>
              <Label className="text-right">{crmText(language, "chooseAuthMethod")}</Label>
              <Select value={authMethod} onValueChange={(value: "sms" | "email") => setAuthMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {crmText(language, "authByEmail")}
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      {crmText(language, "authBySms")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              <p className="font-medium">{crmText(language, "customerInformation")}:</p>
              <p>{crmText(language, "email")}: {selectedCustomerForAuth?.email}</p>
              <p>{crmText(language, "phone")}: {selectedCustomerForAuth?.phone}</p>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse">
              <Button variant="outline" onClick={() => setIsAuthDialogOpen(false)}>
                {crmText(language, "cancel")}
              </Button>
              <Button 
                onClick={handleCustomerAuthentication}
                disabled={isAuthenticating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isAuthenticating ? crmText(language, "sending") : crmText(language, "sendCode", { channel: crmEnum(authMethod, language) })}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}