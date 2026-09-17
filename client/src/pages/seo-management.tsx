import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Search, BarChart3, Globe, Link, Settings, Languages, Target, Bot, Wand2, Brain, Lightbulb, Zap, FileText, Loader2, Sparkles, Cpu, Key, BookOpen, Eye, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { seoText, seoLocale, seoValue } from "@/lib/seo-management-localization";

// Types
interface SeoSetting {
  id: number;
  pageType: string;
  pageIdentifier?: string;
  language: string;
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  robots: string;
  schema?: any;
  isActive: boolean;
  priority: number;
  hreflangUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface SupportedLanguage {
  id: number;
  code: string;
  name: string;
  nativeName: string;
  direction: string;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
  googleAnalyticsCode?: string;
  searchConsoleProperty?: string;
  createdAt: string;
  updatedAt: string;
}

interface MultilingualKeyword {
  id: number;
  seoSettingId: number;
  keyword: string;
  language: string;
  searchVolume: number;
  difficulty: number;
  currentPosition?: number;
  targetPosition: number;
  isTracking: boolean;
  lastChecked?: string;
  createdAt: string;
  updatedAt: string;
}

interface SitemapEntry {
  id: number;
  url: string;
  priority: number;
  changeFreq: string;
  lastModified: string;
  isActive: boolean;
  pageType?: string;
}

interface Redirect {
  id: number;
  fromUrl: string;
  toUrl: string;
  statusCode: number;
  isActive: boolean;
  hitCount: number;
  createdAt: string;
}

// Form schemas
const createSeoSettingFormSchema = (l: (value: string) => string) => z.object({
  pageType: z.string().min(1, l("Page type is required")),
  pageIdentifier: z.string().optional(),
  language: z.string().min(1, l("Language is required")),
  title: z.string().min(10, l("Title must be at least 10 characters")).max(60, l("Title should not exceed 60 characters")),
  description: z.string().min(50, l("Description must be at least 50 characters")).max(160, l("Description should not exceed 160 characters")),
  keywords: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().url().optional().or(z.literal("")),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().optional(),
  twitterImage: z.string().url().optional().or(z.literal("")),
  canonicalUrl: z.string().url().optional().or(z.literal("")),
  hreflangUrl: z.string().url().optional().or(z.literal("")),
  robots: z.string().default("index,follow"),
  isActive: z.boolean().default(true),
  priority: z.number().min(0).max(100).default(0),
});

const createKeywordFormSchema = (l: (value: string) => string) => z.object({
  seoSettingId: z.number().min(1, l("SEO setting is required")),
  keyword: z.string().min(1, l("Keyword is required")),
  language: z.string().min(1, l("Language is required")),
  searchVolume: z.number().min(0).default(0),
  difficulty: z.number().min(0).max(100).default(0),
  targetPosition: z.number().min(1).max(100).default(1),
  isTracking: z.boolean().default(true),
});

const createRedirectFormSchema = (l: (value: string) => string) => z.object({
  fromUrl: z.string().min(1, l("From URL is required")),
  toUrl: z.string().url(l("To URL must be a valid URL")),
  statusCode: z.number().min(300).max(399).default(301),
  isActive: z.boolean().default(true),
});

export default function SeoManagement() {
  const { language, direction } = useLanguage();
  const l = (value: string) => seoText(language, value);
  const locale = seoLocale(language);
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const date = (value: string | Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
  const localizedBlogField = (post: any, field: "title" | "excerpt" | "tags") => {
    const suffix = language === "fa" ? "Fa" : language === "ar" ? "Ar" : language === "tr" ? "Tr" : "En";
    return post[`${field}${suffix}`] ?? post[`${field}En`] ?? post[`${field}Ar`] ?? post[field];
  };
  const [activeTab, setActiveTab] = useState("settings");
  const [selectedSetting, setSelectedSetting] = useState<SeoSetting | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("fa");
  
  // AI SEO states
  const [aiPageType, setAiPageType] = useState("");
  const [aiLanguage, setAiLanguage] = useState("");
  const [selectedAiProvider, setSelectedAiProvider] = useState<string>("openai");
  
  // API Settings states
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  
  const [aiTargetKeywords, setAiTargetKeywords] = useState("");
  const [aiBusinessContext, setAiBusinessContext] = useState("");
  const [aiSeedKeywords, setAiSeedKeywords] = useState("");
  const [aiIndustry, setAiIndustry] = useState("");
  const [aiContentToOptimize, setAiContentToOptimize] = useState("");
  const [aiOptimizeKeywords, setAiOptimizeKeywords] = useState("");
  const [aiAnalyzeUrl, setAiAnalyzeUrl] = useState("");
  const [aiAnalyzeKeywords, setAiAnalyzeKeywords] = useState("");
  const [aiResults, setAiResults] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: seoSettings = [], isLoading: isLoadingSettings } = useQuery<SeoSetting[]>({
    queryKey: ["/api/admin/seo/settings", selectedLanguage],
    queryFn: async () => {
      const url = selectedLanguage === "all" ? 
        "/api/admin/seo/settings" : 
        `/api/admin/seo/settings?language=${selectedLanguage}`;
      const res = await fetch(url);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: supportedLanguages = [], isLoading: isLoadingLanguages } = useQuery<SupportedLanguage[]>({
    queryKey: ["/api/admin/seo/languages"],
  });

  const { data: multilingualAnalytics, isLoading: isLoadingMultilingualAnalytics } = useQuery({
    queryKey: ["/api/admin/seo/multilingual-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/seo/multilingual-analytics");
      const data = await res.json();
      return data || {};
    },
  });

  const { data: keywordPerformance, isLoading: isLoadingKeywordPerformance } = useQuery({
    queryKey: ["/api/admin/seo/keywords/performance", selectedLanguage],
    queryFn: async () => {
      const res = await fetch(`/api/admin/seo/keywords/performance?language=${selectedLanguage}`);
      const data = await res.json();
      return data || { totalKeywords: 0, averagePosition: 0, topKeywords: [] };
    },
  });

  const { data: seoAnalytics, isLoading: isLoadingAnalytics } = useQuery<{
    totalImpressions: number;
    totalClicks: number;
    averageCtr: number;
    averagePosition: number;
    topPages: Array<{
      pageUrl: string;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
    }>;
  }>({
    queryKey: ["/api/admin/seo/analytics"],
  });

  const { data: sitemapEntries = [], isLoading: isLoadingSitemap } = useQuery<SitemapEntry[]>({
    queryKey: ["/api/admin/seo/sitemap"],
  });

  const { data: redirects = [], isLoading: isLoadingRedirects } = useQuery<Redirect[]>({
    queryKey: ["/api/admin/seo/redirects"],
  });

  // Blog posts query
  const { data: blogPosts = [], isLoading: isLoadingBlogPosts } = useQuery({
    queryKey: ["/api/admin/blog"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog");
      if (!res.ok) throw new Error('Failed to fetch blog posts');
      const data = await res.json();
      return data.posts || [];
    },
  });

  // Blog stats query
  const { data: blogStats } = useQuery({
    queryKey: ["/api/admin/blog/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog/stats");
      if (!res.ok) return { total: 0, published: 0, totalViews: 0 };
      return res.json();
    },
  });

  // Forms
  const seoSettingFormSchema = createSeoSettingFormSchema(l);
  const keywordFormSchema = createKeywordFormSchema(l);
  const redirectFormSchema = createRedirectFormSchema(l);
  const seoForm = useForm<z.infer<typeof seoSettingFormSchema>>({
    resolver: zodResolver(seoSettingFormSchema),
    defaultValues: {
      pageType: "",
      language: selectedLanguage,
      title: "",
      description: "",
      robots: "index,follow",
      isActive: true,
      priority: 0,
    },
  });

  const keywordForm = useForm<z.infer<typeof keywordFormSchema>>({
    resolver: zodResolver(keywordFormSchema),
    defaultValues: {
      seoSettingId: 0,
      keyword: "",
      language: selectedLanguage,
      searchVolume: 0,
      difficulty: 0,
      targetPosition: 1,
      isTracking: true,
    },
  });

  const redirectForm = useForm<z.infer<typeof redirectFormSchema>>({
    resolver: zodResolver(redirectFormSchema),
    defaultValues: {
      fromUrl: "",
      toUrl: "",
      statusCode: 301,
      isActive: true,
    },
  });

  // Mutations
  const createSeoSetting = useMutation({
    mutationFn: (data: z.infer<typeof seoSettingFormSchema>) =>
      apiRequest("/api/admin/seo/settings", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/settings"] });
      setIsDialogOpen(false);
      seoForm.reset();
      toast({ title: l("SEO setting created successfully") });
    },
    onError: (error: any) => {
      toast({
        title: l("Error creating SEO setting"),
        description: error.message || l("An error occurred"),
        variant: "destructive",
      });
    },
  });

  const updateSeoSetting = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof seoSettingFormSchema> }) =>
      apiRequest(`/api/admin/seo/settings/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/settings"] });
      setIsDialogOpen(false);
      setSelectedSetting(null);
      seoForm.reset();
      toast({ title: l("SEO setting updated successfully") });
    },
    onError: (error: any) => {
      toast({
        title: l("Error updating SEO setting"),
        description: error.message || l("An error occurred"),
        variant: "destructive",
      });
    },
  });

  const deleteSeoSetting = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/seo/settings/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/settings"] });
      toast({ title: l("SEO setting deleted successfully") });
    },
    onError: (error: any) => {
      toast({
        title: l("Error deleting SEO setting"),
        description: error.message || l("An error occurred"),
        variant: "destructive",
      });
    },
  });

  const createRedirect = useMutation({
    mutationFn: (data: z.infer<typeof redirectFormSchema>) =>
      apiRequest("/api/admin/seo/redirects", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/redirects"] });
      redirectForm.reset();
      toast({ title: l("Redirect created successfully") });
    },
    onError: (error: any) => {
      toast({
        title: l("Error creating redirect"),
        description: error.message || l("An error occurred"),
        variant: "destructive",
      });
    },
  });

  // API Keys management queries and mutations
  const { data: apiKeysData } = useQuery({
    queryKey: ['/api/admin/seo/api-keys'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/seo/api-keys');
      return response;
    }
  });

  const saveApiKey = useMutation({
    mutationFn: async (data: { provider: string; apiKey: string; description?: string }) => {
      return apiRequest('/api/admin/seo/api-keys', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/seo/api-keys'] });
      toast({
        title: l("API key saved"),
        description: l("The API key was saved successfully")
      });
    },
    onError: () => {
      toast({
        title: l("Save failed"),
        description: l("Could not save the API key"),
        variant: "destructive"
      });
    }
  });

  const testApiKey = useMutation({
    mutationFn: async (data: { provider: string; apiKey: string }) => {
      return apiRequest('/api/admin/seo/api-keys/test', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? l("API key is valid") : l("API key is invalid"),
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: () => {
      toast({
        title: l("Test failed"),
        description: l("Could not test the API key"),
        variant: "destructive"
      });
    }
  });

  // AI SEO mutations
  const generateAiContent = useMutation({
    mutationFn: (data: any) => apiRequest("/api/ai/seo/generate", "POST", data),
    onSuccess: (result) => {
      setAiResults({ type: 'generate', data: result.data });
      toast({ 
        title: l("AI content generated"),
        description: l("SEO content has been generated successfully")
      });
    },
    onError: (error: any) => {
      toast({
        title: l("Error generating AI content"),
        description: error.message || l("Failed to generate content"),
        variant: "destructive",
      });
    },
  });

  const researchKeywords = useMutation({
    mutationFn: (data: any) => apiRequest("/api/ai/seo/keywords", "POST", data),
    onSuccess: (result) => {
      setAiResults({ type: 'keywords', data: result.data });
      toast({ 
        title: l("Keywords researched"),
        description: l("Keyword suggestions have been generated")
      });
    },
    onError: (error: any) => {
      toast({
        title: l("Error researching keywords"),
        description: error.message || l("Failed to research keywords"),
        variant: "destructive",
      });
    },
  });

  const optimizeContent = useMutation({
    mutationFn: (data: any) => apiRequest("/api/ai/seo/optimize", "POST", data),
    onSuccess: (result) => {
      setAiResults({ type: 'optimize', data: result.data });
      toast({ 
        title: l("Content optimized"),
        description: l("Content has been optimized for SEO")
      });
    },
    onError: (error: any) => {
      toast({
        title: l("Error optimizing content"),
        description: error.message || l("Failed to optimize content"),
        variant: "destructive",
      });
    },
  });

  const analyzePerformance = useMutation({
    mutationFn: (data: any) => apiRequest("/api/ai/seo/analyze", "POST", data),
    onSuccess: (result) => {
      setAiResults({ type: 'analyze', data: result.data });
      toast({ 
        title: l("Analysis complete"),
        description: l("SEO performance analysis completed")
      });
    },
    onError: (error: any) => {
      toast({
        title: l("Error analyzing performance"),
        description: error.message || l("Failed to analyze performance"),
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreateSeoSetting = (data: z.infer<typeof seoSettingFormSchema>) => {
    createSeoSetting.mutate(data);
  };

  const handleUpdateSeoSetting = (data: z.infer<typeof seoSettingFormSchema>) => {
    if (selectedSetting) {
      updateSeoSetting.mutate({ id: selectedSetting.id, data });
    }
  };

  const handleEditSetting = (setting: SeoSetting) => {
    setSelectedSetting(setting);
    seoForm.reset({
      pageType: setting.pageType,
      pageIdentifier: setting.pageIdentifier || "",
      title: setting.title,
      description: setting.description,
      keywords: setting.keywords || "",
      ogTitle: setting.ogTitle || "",
      ogDescription: setting.ogDescription || "",
      ogImage: setting.ogImage || "",
      twitterTitle: setting.twitterTitle || "",
      twitterDescription: setting.twitterDescription || "",
      twitterImage: setting.twitterImage || "",
      canonicalUrl: setting.canonicalUrl || "",
      robots: setting.robots,
      isActive: setting.isActive,
      priority: setting.priority,
    });
    setIsDialogOpen(true);
  };

  const handleCreateRedirect = (data: z.infer<typeof redirectFormSchema>) => {
    createRedirect.mutate(data);
  };

  // AI SEO handlers
  const handleGenerateAiContent = () => {
    if (!aiPageType || !aiLanguage) {
      toast({
        title: l("Missing required fields"),
        description: l("Please select page type and language"),
        variant: "destructive",
      });
      return;
    }
    
    const keywords = aiTargetKeywords.split(',').map(k => k.trim()).filter(k => k);
    generateAiContent.mutate({
      pageType: aiPageType,
      language: aiLanguage,
      targetKeywords: keywords,
      businessContext: aiBusinessContext,
      aiProvider: selectedAiProvider
    });
  };

  const handleResearchKeywords = () => {
    if (!aiSeedKeywords) {
      toast({
        title: l("Missing seed keywords"),
        description: l("Please enter seed keywords"),
        variant: "destructive",
      });
      return;
    }
    
    const keywords = aiSeedKeywords.split(',').map(k => k.trim()).filter(k => k);
    researchKeywords.mutate({
      seedKeywords: keywords,
      language: aiLanguage || 'fa',
      industry: aiIndustry || 'chemical',
      aiProvider: selectedAiProvider
    });
  };

  const handleOptimizeContent = () => {
    if (!aiContentToOptimize || !aiOptimizeKeywords) {
      toast({
        title: l("Missing required fields"),
        description: l("Please enter content and target keywords"),
        variant: "destructive",
      });
      return;
    }
    
    const keywords = aiOptimizeKeywords.split(',').map(k => k.trim()).filter(k => k);
    optimizeContent.mutate({
      content: aiContentToOptimize,
      targetKeywords: keywords,
      language: aiLanguage || 'fa',
      aiProvider: selectedAiProvider
    });
  };

  const handleAnalyzePerformance = () => {
    if (!aiAnalyzeUrl || !aiAnalyzeKeywords) {
      toast({
        title: l("Missing required fields"),
        description: l("Please enter URL and target keywords"),
        variant: "destructive",
      });
      return;
    }
    
    const keywords = aiAnalyzeKeywords.split(',').map(k => k.trim()).filter(k => k);
    analyzePerformance.mutate({
      url: aiAnalyzeUrl,
      targetKeywords: keywords,
      aiProvider: selectedAiProvider
    });
  };

  const handleKeywordResearch = async () => {
    if (!aiIndustry || !aiSeedKeywords) {
      toast({
        title: l("Required fields are missing"),
        description: l("Enter the industry and seed keywords"),
        variant: "destructive",
      });
      return;
    }

    setIsAiLoading(true);
    
    try {
      const response = await apiRequest("/api/ai/seo/keyword-research", "POST", {
        industry: aiIndustry,
        businessContext: aiBusinessContext,
        seedKeywords: aiSeedKeywords,
        language: aiLanguage || 'fa',
        pageType: aiPageType || 'homepage',
      });
      
      setAiResults(response);
      toast({
        title: l("Keywords generated"),
        description: l("Smart keyword suggestions were generated successfully"),
      });
    } catch (error: any) {
      console.error("Error generating keywords:", error);
      toast({
        title: l("Keyword generation failed"),
        description: error.message || l("Could not generate keyword suggestions"),
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredSettings = Array.isArray(seoSettings) ? 
    seoSettings.filter((setting: SeoSetting) =>
      setting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.pageType.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

  return (
    <div dir={direction} lang={language} className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{l('SEO Management')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {l("Manage your website's search engine optimization settings")}
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {l("Add SEO Setting")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {l("SEO Settings")}
          </TabsTrigger>
          <TabsTrigger value="blog" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {l("Blog")}
          </TabsTrigger>
          <TabsTrigger value="ai-seo" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            {l("AI SEO")}
          </TabsTrigger>
          <TabsTrigger value="api-config" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            {l("API Settings")}
          </TabsTrigger>
          <TabsTrigger value="languages" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            {l("Languages")}
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            {l("Keywords")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {l("Analytics")}
          </TabsTrigger>
          <TabsTrigger value="sitemap" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {l("Sitemap")}
          </TabsTrigger>
          <TabsTrigger value="redirects" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            {l("Redirects")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{l('Multilingual SEO Settings')}</CardTitle>
              <CardDescription>
                {l("Configure meta tags, Open Graph data, and SEO settings for different languages and pages")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={l('Search SEO settings...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ps-8"
                  />
                </div>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={l('Select Language')} />
                  </SelectTrigger>
                  <SelectContent dir={direction}>
                    <SelectItem value="all">{l('All Languages')}</SelectItem>
                    {supportedLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.nativeName} ({lang.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoadingSettings ? (
                <div className="text-center py-8">{l('Loading SEO settings...')}</div>
              ) : (
                <div className="space-y-4">
                  {filteredSettings.map((setting: SeoSetting) => (
                    <Card key={setting.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{setting.title}</h3>
                            <Badge variant={setting.isActive ? "default" : "secondary"}>
                              {setting.isActive ? l("Active") : l("Inactive")}
                            </Badge>
                            <Badge variant="outline">{seoValue(language, setting.pageType)}</Badge>
                            <Badge variant="secondary">{seoValue(language, setting.language)}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {setting.description}
                          </p>
                          {setting.keywords && (
                            <p className="text-xs text-gray-500">
                              {l("Keywords")}: {setting.keywords}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={l("Edit")}
                            onClick={() => handleEditSetting(setting)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={l("Delete")}
                            onClick={() => deleteSeoSetting.mutate(setting.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {filteredSettings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {l("No SEO settings found. Create your first SEO setting to get started.")}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blog" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{l('Total Blog Posts')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{number(blogStats?.total || 0)}</div>
                <p className="text-xs text-gray-500 mt-1">{l('All blog posts')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{l('Published Posts')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{number(blogStats?.published || 0)}</div>
                <p className="text-xs text-gray-500 mt-1">{l('Live on website')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{l('Total Views')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{number(blogStats?.totalViews || 0)}</div>
                <p className="text-xs text-gray-500 mt-1">{l('Across all posts')}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{l('Blog Posts Management')}</CardTitle>
                  <CardDescription>
                    {l("Recent blog posts with quick actions")}
                  </CardDescription>
                </div>
                <Button asChild>
                  <a href="/admin/blog-management" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {l("Full Blog Management")}
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingBlogPosts ? (
                <div className="text-center py-8">{l('Loading blog posts...')}</div>
              ) : blogPosts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {l("No blog posts found. Create your first blog post to get started.")}
                </div>
              ) : (
                <div className="space-y-4">
                  {blogPosts.slice(0, 10).map((post: any) => (
                    <Card key={post.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{localizedBlogField(post, "title")}</h3>
                              <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                                {post.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {localizedBlogField(post, "excerpt")}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {post.views || 0} views
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {date(post.createdAt)}
                              </span>
                              {localizedBlogField(post, "tags") && (
                                <span className="flex gap-1">
                                  {localizedBlogField(post, "tags").slice(0, 3).map((tag: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={`/admin/blog-management?edit=${post.id}`}>
                                <Edit2 className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-seo" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI SEO Content Generator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-purple-600" />
                  {l("AI Content Generator")}
                </CardTitle>
                <CardDescription>
                  {l("Generate optimized titles, descriptions, and keywords using AI")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Provider Selection */}
                <div className="space-y-2">
                  <Label>{l('AI provider')}</Label>
                  <Select value={selectedAiProvider} onValueChange={setSelectedAiProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder={l("Select AI provider")} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      <SelectItem value="openai">
                        OpenAI GPT-5 ({l('Advanced')})
                      </SelectItem>
                      <SelectItem value="deepseek">
                        DeepSeek AI ({l('Analytical')})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-gray-500">
                    {selectedAiProvider === 'openai' ? 
                      `🔵 OpenAI GPT-5 — ${l('Best for content generation and analysis')}` :
                      `🟣 DeepSeek AI — ${l('Suitable for research and deep analysis')}`
                    }
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pageType">{l('Page Type')}</Label>
                    <Select value={aiPageType} onValueChange={setAiPageType}>
                      <SelectTrigger>
                        <SelectValue placeholder={l('Select page type')} />
                      </SelectTrigger>
                      <SelectContent dir={direction}>
                        <SelectItem value="home">{l('Home Page')}</SelectItem>
                        <SelectItem value="product">{l('Product Page')}</SelectItem>
                        <SelectItem value="category">{l('Category Page')}</SelectItem>
                        <SelectItem value="about">{l('About Page')}</SelectItem>
                        <SelectItem value="contact">{l('Contact Page')}</SelectItem>
                        <SelectItem value="blog">{l('Blog Post')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="language">{l('Language')}</Label>
                    <Select value={aiLanguage} onValueChange={setAiLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder={l('Select language')} />
                      </SelectTrigger>
                      <SelectContent dir={direction}>
                        <SelectItem value="fa">{l('Persian')}</SelectItem>
                        <SelectItem value="ar">{l('Arabic')}</SelectItem>
                        <SelectItem value="ku">{l('Kurdish')}</SelectItem>
                        <SelectItem value="en">{l('English')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="targetKeywords">{l('Target Keywords (comma-separated)')}</Label>
                  <Input 
                    placeholder={l('chemical products, water treatment, industrial solutions')}
                    value={aiTargetKeywords}
                    onChange={(e) => setAiTargetKeywords(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="businessContext">{l('Business Context (optional)')}</Label>
                  <Textarea 
                    placeholder={l('Brief description of your business, products, or services...')}
                    rows={3}
                    value={aiBusinessContext}
                    onChange={(e) => setAiBusinessContext(e.target.value)}
                  />
                </div>
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleGenerateAiContent}
                  disabled={generateAiContent.isPending}
                >
                  <Brain className="h-4 w-4 me-2" />
                  {generateAiContent.isPending ? "Generating..." : "Generate AI Content"}
                </Button>
              </CardContent>
            </Card>

            {/* Keyword Research */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  {l("AI Keyword Research")}
                </CardTitle>
                <CardDescription>
                  {l("Discover high-performing keywords for your industry")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="seedKeywords">{l('Seed Keywords')}</Label>
                  <Input 
                    placeholder={l('chemical, industrial, water treatment')}
                    value={aiSeedKeywords}
                    onChange={(e) => setAiSeedKeywords(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="industry">{l('Industry')}</Label>
                    <Select value={aiIndustry} onValueChange={setAiIndustry}>
                      <SelectTrigger>
                        <SelectValue placeholder={l('Select industry')} />
                      </SelectTrigger>
                      <SelectContent dir={direction}>
                        <SelectItem value="chemical">{l('Chemical Industry')}</SelectItem>
                        <SelectItem value="manufacturing">{l('Manufacturing')}</SelectItem>
                        <SelectItem value="agricultural">{l('Agricultural')}</SelectItem>
                        <SelectItem value="industrial">{l('Industrial Supplies')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="keywordLanguage">{l('Language')}</Label>
                    <Select value={aiLanguage} onValueChange={setAiLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder={l('Select language')} />
                      </SelectTrigger>
                      <SelectContent dir={direction}>
                        <SelectItem value="fa">{l('Persian')}</SelectItem>
                        <SelectItem value="ar">{l('Arabic')}</SelectItem>
                        <SelectItem value="ku">{l('Kurdish')}</SelectItem>
                        <SelectItem value="en">{l('English')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleResearchKeywords}
                  disabled={researchKeywords.isPending}
                >
                  <Lightbulb className="h-4 w-4 me-2" />
                  {researchKeywords.isPending ? "Researching..." : "Research Keywords"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Content Optimizer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                {l("Content Optimizer")}
              </CardTitle>
              <CardDescription>
                {l("Optimize existing content for better SEO performance")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <Label htmlFor="content">{l('Content to Optimize')}</Label>
                  <Textarea 
                    placeholder={l('Paste your content here to optimize for SEO...')}
                    rows={6}
                    className="min-h-[150px]"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="optimizeKeywords">{l('Target Keywords')}</Label>
                    <Input placeholder={l('primary, secondary, keywords')} />
                  </div>
                  <div>
                    <Label htmlFor="contentLanguage">{l('Language')}</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={l('Select language')} />
                      </SelectTrigger>
                      <SelectContent dir={direction}>
                        <SelectItem value="fa">{l('Persian')}</SelectItem>
                        <SelectItem value="ar">{l('Arabic')}</SelectItem>
                        <SelectItem value="ku">{l('Kurdish')}</SelectItem>
                        <SelectItem value="en">{l('English')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full bg-yellow-600 hover:bg-yellow-700">
                    <FileText className="h-4 w-4 me-2" />
                    {l("Optimize Content")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEO Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                {l("AI SEO Analysis")}
              </CardTitle>
              <CardDescription>
                {l("Analyze your pages for SEO performance and get recommendations")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="analyzeUrl">{l('Page URL')}</Label>
                  <Input placeholder="https://example.com/page" />
                </div>
                <div>
                  <Label htmlFor="analyzeKeywords">{l('Target Keywords')}</Label>
                  <Input placeholder={l('keyword1, keyword2, keyword3')} />
                </div>
              </div>
              
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <BarChart3 className="h-4 w-4 me-2" />
                {l("Analyze SEO Performance")}
              </Button>
              
              {/* Results placeholder */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-semibold mb-2">{l('Analysis Results')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click "Analyze SEO Performance" to see detailed analysis results including:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                  <li>{l('• Title optimization score')}</li>
                  <li>{l('• Meta description effectiveness')}</li>
                  <li>{l('• Keyword density analysis')}</li>
                  <li>{l('• Content structure recommendations')}</li>
                  <li>{l('• Technical SEO suggestions')}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-green-600" />
                {l('AI API Settings')}
              </CardTitle>
              <CardDescription>
                {l('Manage OpenAI and DeepSeek keys for SEO services — securely stored in the database')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OpenAI API Settings */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">{l('OpenAI GPT-5')}</h3>
                  <Badge variant="secondary">{l('Content and analysis')}</Badge>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="openai-key">{l('OpenAI API key:')}</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="openai-key"
                        type={showOpenaiKey ? "text" : "password"}
                        placeholder="sk-..."
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                        className="pe-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute end-0 top-0 h-full px-3"
                        aria-label={l(showOpenaiKey ? "Hide password" : "Show password")}
                        onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (openaiApiKey.trim()) {
                          testApiKey.mutate({
                            provider: 'openai',
                            apiKey: openaiApiKey.trim()
                          });
                        }
                      }}
                      disabled={!openaiApiKey.trim() || testApiKey.isPending}
                    >
                      {testApiKey.isPending ? (
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 me-2" />
                      )}
                      {l('Test')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* DeepSeek API Settings */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">{l('DeepSeek AI')}</h3>
                  <Badge variant="secondary">{l('Research and analysis')}</Badge>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="deepseek-key">{l('DeepSeek API key:')}</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="deepseek-key"
                        type={showDeepseekKey ? "text" : "password"}
                        placeholder="sk-..."
                        value={deepseekApiKey}
                        onChange={(e) => setDeepseekApiKey(e.target.value)}
                        className="pe-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute end-0 top-0 h-full px-3"
                        aria-label={l(showDeepseekKey ? "Hide password" : "Show password")}
                        onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (deepseekApiKey.trim()) {
                          testApiKey.mutate({
                            provider: 'deepseek',
                            apiKey: deepseekApiKey.trim()
                          });
                        }
                      }}
                      disabled={!deepseekApiKey.trim() || testApiKey.isPending}
                    >
                      {testApiKey.isPending ? (
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 me-2" />
                      )}
                      {l('Test')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Save Settings */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setOpenaiApiKey('');
                    setDeepseekApiKey('');
                    toast({
                      title: l("Fields cleared"),
                      description: l("Input fields were cleared")
                    });
                  }}
                >
                  {l('Clear fields')}
                </Button>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={() => {
                      if (openaiApiKey.trim()) {
                        saveApiKey.mutate({
                          provider: 'openai',
                          apiKey: openaiApiKey.trim(),
                          description: 'OpenAI GPT-5 API Key'
                        });
                      }
                    }}
                    disabled={!openaiApiKey.trim() || saveApiKey.isPending}
                  >
                    {saveApiKey.isPending ? (
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    ) : (
                      <Settings className="h-4 w-4 me-2" />
                    )}
                    {l('Save OpenAI')}
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      if (deepseekApiKey.trim()) {
                        saveApiKey.mutate({
                          provider: 'deepseek',
                          apiKey: deepseekApiKey.trim(),
                          description: 'DeepSeek AI API Key'
                        });
                      }
                    }}
                    disabled={!deepseekApiKey.trim() || saveApiKey.isPending}
                  >
                    {saveApiKey.isPending ? (
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    ) : (
                      <Settings className="h-4 w-4 me-2" />
                    )}
                    {l('Save DeepSeek')}
                  </Button>
                </div>
              </div>

              {/* Current Stored Keys */}
              {apiKeysData?.data && apiKeysData.data.length > 0 && (
                <div className="bg-gray-50 border rounded-lg p-4 mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">{l('Saved API keys')}</h4>
                  <div className="space-y-2">
                    {apiKeysData.data.map((key: any) => (
                      <div key={key.id} className="flex justify-between items-center p-2 bg-white rounded border">
                        <div>
                          <span className="font-medium">{key.provider}</span>
                          <span className="text-sm text-gray-500 ms-2">
                            {date(key.createdAt)}
                          </span>
                        </div>
                        <Badge variant={key.isActive ? "default" : "secondary"}>
                          {l(key.isActive ? "Active" : "Inactive")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* API Usage Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-blue-900 mb-2">{l('Important information')}</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>{l("Security:")}</strong> {l("API keys are stored encrypted in the database")}</li>
                  <li>• <strong>{l('Portability:')}</strong> {l('The system can run on any server')}</li>
                  <li>• <strong>{l('OpenAI GPT-5:')}</strong> {l('Best for content generation and analysis')}</li>
                  <li>• <strong>{l('DeepSeek AI:')}</strong> {l('Suitable for research and deep analysis')}</li>
                    <li>• <strong>{l("Testing:")}</strong> {l("Always test keys before saving")}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Keyword Research & Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  {l('AI keyword research')}
                </CardTitle>
                <CardDescription className="text-start">
                  {l('Generate effective keywords to improve search rankings')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="businessType" className="text-start">{l("Business type")}</Label>
                    <Input
                      id="businessType"
                      value={aiIndustry}
                      onChange={(e) => setAiIndustry(e.target.value)}
                      placeholder={l('Example: chemical sales, oil and gas industries')}
                      className="text-start"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="targetMarket" className="text-start">{l("Target market")}</Label>
                    <Input
                      id="targetMarket"
                      value={aiBusinessContext}
                      onChange={(e) => setAiBusinessContext(e.target.value)}
                      placeholder={l('Example: Iraq, Middle East, industrial customers')}
                      className="text-start"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="seedKeywords" className="text-start">{l('Seed Keywords')}</Label>
                    <Textarea
                      id="seedKeywords"
                      value={aiSeedKeywords}
                      onChange={(e) => setAiSeedKeywords(e.target.value)}
                      placeholder={l('Example: chemicals, solvents, fertilizer, petrochemicals')}
                      rows={3}
                      className="text-start"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="language" className="text-start">{l('Language')}</Label>
                      <Select value={aiLanguage} onValueChange={setAiLanguage}>
                        <SelectTrigger>
                          <SelectValue placeholder={l('Select Language')} />
                        </SelectTrigger>
                        <SelectContent dir={direction}>
                          <SelectItem value="fa">{l('Persian')}</SelectItem>
                          <SelectItem value="ar">{l('Arabic')}</SelectItem>
                          <SelectItem value="en">{l('English')}</SelectItem>
                          <SelectItem value="ku">{l('Kurdish')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="pageType" className="text-start">{l('Page Type')}</Label>
                      <Select value={aiPageType} onValueChange={setAiPageType}>
                        <SelectTrigger>
                          <SelectValue placeholder={l('Select page type')} />
                        </SelectTrigger>
                        <SelectContent dir={direction}>
                          <SelectItem value="homepage">{l('Home page')}</SelectItem>
                          <SelectItem value="product">{l('Product page')}</SelectItem>
                          <SelectItem value="category">{l('Category')}</SelectItem>
                          <SelectItem value="about">{l('About us')}</SelectItem>
                          <SelectItem value="service">{l('Services')}</SelectItem>
                          <SelectItem value="blog">{l('Blog')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={handleKeywordResearch}
                  disabled={isAiLoading || !aiIndustry || !aiSeedKeywords}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      {l('Generating keywords...')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 me-2" />
                      {l('Generate smart keywords')}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Keyword Performance Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  {l('Keyword performance')}
                </CardTitle>
                <CardDescription className="text-start">
                  {l('Track and analyze current keyword performance')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingKeywordPerformance ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-600" />
                    <p className="text-gray-600">{l("Loading keyword statistics...")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {keywordPerformance?.totalKeywords || 0}
                        </div>
                        <div className="text-sm text-gray-600">{l("Total keywords")}</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {keywordPerformance?.averagePosition ? 
                            number(keywordPerformance.averagePosition) : l('N/A')}
                        </div>
                        <div className="text-sm text-gray-600">{l("Average ranking")}</div>
                      </div>
                    </div>
                    
                    {keywordPerformance?.topKeywords && keywordPerformance.topKeywords.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-start">{l("Top keywords")}</h4>
                        {keywordPerformance.topKeywords.map((keyword: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <Badge variant={keyword.position <= 10 ? "default" : "secondary"}>
                                {l('Position')} {number(keyword.position)}
                              </Badge>
                              <span className="text-sm text-gray-600">
                                {number(keyword.clicks)} {l('Clicks')}
                              </span>
                            </div>
                            <span className="font-medium text-start">{keyword.keyword}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>{l("No keywords registered yet")}</p>
                        <p className="text-sm mt-1">{l('Use the keyword generation section')}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Results Display */}
          {aiResults && aiResults.type === 'keywords' && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  {l('Suggested keywords')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiResults.data.primary && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-purple-600 text-start">{l('Primary keywords')}</h4>
                      <div className="space-y-1">
                        {aiResults.data.primary.map((keyword: string, index: number) => (
                          <Badge key={index} variant="default" className="me-1 mb-1">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {aiResults.data.longTail && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-blue-600 text-start">{l('Long-tail keywords')}</h4>
                      <div className="space-y-1">
                        {aiResults.data.longTail.map((keyword: string, index: number) => (
                          <Badge key={index} variant="secondary" className="me-1 mb-1">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {aiResults.data.semantic && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-green-600 text-start">{l('Related keywords')}</h4>
                      <div className="space-y-1">
                        {aiResults.data.semantic.map((keyword: string, index: number) => (
                          <Badge key={index} variant="outline" className="me-1 mb-1">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {aiResults.data.recommendations && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2 text-start">
                      {l('Optimization recommendations')}
                    </h4>
                    <ul className="space-y-1 text-sm text-yellow-700 text-start">
                      {aiResults.data.recommendations.map((rec: string, index: number) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{l('Multilingual SEO Analytics')}</CardTitle>
              <CardDescription>
                Track your website's search engine performance across different languages and countries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMultilingualAnalytics ? (
                <div className="text-center py-8">{l('Loading multilingual analytics...')}</div>
              ) : multilingualAnalytics ? (
                <div className="space-y-6">
                  {multilingualAnalytics?.byLanguage && multilingualAnalytics.byLanguage.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">{l('Performance by Language')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {multilingualAnalytics.byLanguage.map((lang: any) => (
                          <div key={lang.language} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium">{lang.language.toUpperCase()}</h5>
                              <Badge variant="outline">{supportedLanguages.find(l => l.code === lang.language)?.nativeName}</Badge>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>{l('Impressions:')}</span>
                                <span className="font-medium">{lang.totalImpressions.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>{l('Clicks:')}</span>
                                <span className="font-medium">{lang.totalClicks.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>{l('Avg Position:')}</span>
                                <span className="font-medium">{number(lang.averagePosition)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {multilingualAnalytics?.byCountry && multilingualAnalytics.byCountry.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">{l('Performance by Country')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {multilingualAnalytics.byCountry.slice(0, 8).map((country: any) => (
                          <div key={country.country} className="border rounded-lg p-4">
                            <h5 className="font-medium mb-2">{country.country}</h5>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>{l('Impressions:')}</span>
                                <span className="font-medium">{country.totalImpressions.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>{l('Clicks:')}</span>
                                <span className="font-medium">{country.totalClicks.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!multilingualAnalytics?.byLanguage || multilingualAnalytics.byLanguage.length === 0) && 
                   (!multilingualAnalytics?.byCountry || multilingualAnalytics.byCountry.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      No multilingual analytics data available yet. Data will appear once you start getting traffic from different languages and countries.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No analytics data available yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sitemap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{l('Sitemap Management')}</CardTitle>
              <CardDescription>
                {l("Manage your website's XML sitemap entries")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button asChild>
                  <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
                    {l("View XML Sitemap")}
                  </a>
                </Button>
              </div>

              {isLoadingSitemap ? (
                <div className="text-center py-8">{l('Loading sitemap entries...')}</div>
              ) : (
                <div className="space-y-2">
                  {(sitemapEntries as SitemapEntry[]).map((entry: SitemapEntry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{entry.url}</p>
                        <p className="text-sm text-gray-500">
                          {l('Priority')}: {number(entry.priority)} | {l('Frequency')}: {l(entry.changeFreq)}
                        </p>
                      </div>
                      <Badge variant={entry.isActive ? "default" : "secondary"}>
                        {entry.isActive ? l("Active") : l("Inactive")}
                      </Badge>
                    </div>
                  ))}

                  {(sitemapEntries as SitemapEntry[]).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No sitemap entries found.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redirects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{l('URL Redirects')}</CardTitle>
              <CardDescription>
                {l("Manage URL redirects for better SEO and user experience")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...redirectForm}>
                <form onSubmit={redirectForm.handleSubmit(handleCreateRedirect)} className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={redirectForm.control}
                      name="fromUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{l('From URL')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="/old-page" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={redirectForm.control}
                      name="toUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{l('To URL')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://example.com/new-page" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={redirectForm.control}
                      name="statusCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{l('Status Code')}</FormLabel>
                          <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent dir={direction}>
                              <SelectItem value="301">{l('301 - Permanent')}</SelectItem>
                              <SelectItem value="302">{l('302 - Temporary')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={createRedirect.isPending}>
                    {createRedirect.isPending ? l("Creating...") : l("Add Redirect")}
                  </Button>
                </form>
              </Form>

              {isLoadingRedirects ? (
                <div className="text-center py-8">{l('Loading redirects...')}</div>
              ) : (
                <div className="space-y-2">
                  {(redirects as Redirect[]).map((redirect: Redirect) => (
                    <div key={redirect.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{redirect.fromUrl} → {redirect.toUrl}</p>
                        <p className="text-sm text-gray-500">
                          {l('Status')}: {number(redirect.statusCode)} | {l('Hits')}: {number(redirect.hitCount)}
                        </p>
                      </div>
                      <Badge variant={redirect.isActive ? "default" : "secondary"}>
                          {redirect.isActive ? l("Active") : l("Inactive")}
                      </Badge>
                    </div>
                  ))}

                  {(redirects as Redirect[]).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No redirects configured.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* SEO Setting Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir={direction} lang={language} className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSetting ? l("Edit SEO Setting") : l("Create SEO Setting")}
            </DialogTitle>
            <DialogDescription>
              {l("Configure SEO metadata for your website pages")}
            </DialogDescription>
          </DialogHeader>

          <Form {...seoForm}>
            <form onSubmit={seoForm.handleSubmit(selectedSetting ? handleUpdateSeoSetting : handleCreateSeoSetting)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={seoForm.control}
                  name="pageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{l('Page Type')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={l('Select page type')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent dir={direction}>
                          <SelectItem value="global">{l('Global')}</SelectItem>
                          <SelectItem value="home">{l('Home')}</SelectItem>
                          <SelectItem value="products">{l('Products')}</SelectItem>
                          <SelectItem value="category">{l('Category')}</SelectItem>
                          <SelectItem value="about">{l('About')}</SelectItem>
                          <SelectItem value="contact">{l('Contact')}</SelectItem>
                          <SelectItem value="blog">{l('Blog')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={seoForm.control}
                  name="pageIdentifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{l('Page Identifier (Optional)')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={l('e.g., category-1, product-123')} />
                      </FormControl>
                      <FormDescription>
                        {l("Use for specific pages like categories or products")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={seoForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{l('Title')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={l('Page title for search engines')} />
                    </FormControl>
                    <FormDescription>
                      {number(field.value?.length || 0)}/{number(60)} {l("characters. Keep under 60 for best results.")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={seoForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{l('Description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={l('Meta description for search engines')} rows={3} />
                    </FormControl>
                    <FormDescription>
                      {number(field.value?.length || 0)}/{number(160)} {l("characters. Keep under 160 for best results.")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={seoForm.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{l('Keywords')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={l('keyword1, keyword2, keyword3')} />
                      </FormControl>
                      <FormDescription>
                        {l("Comma-separated keywords (optional, less important for modern SEO)")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={seoForm.control}
                  name="hreflangUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{l('Hreflang URL')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://example.com/page" />
                      </FormControl>
                      <FormDescription>
                        {l("URL for this language version (for hreflang tags)")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={seoForm.control}
                  name="ogTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{l('Open Graph Title')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={l('Title for social media sharing')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={seoForm.control}
                  name="ogImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{l('Open Graph Image')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://example.com/image.jpg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={seoForm.control}
                name="ogDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{l('Open Graph Description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={l('Description for social media sharing')} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={seoForm.control}
                  name="robots"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{l('Robots')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent dir={direction}>
                          <SelectItem value="index,follow">{l('Index, Follow')}</SelectItem>
                          <SelectItem value="noindex,nofollow">{l('No Index, No Follow')}</SelectItem>
                          <SelectItem value="index,nofollow">{l('Index, No Follow')}</SelectItem>
                          <SelectItem value="noindex,follow">{l('No Index, Follow')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={seoForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{l('Priority')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={seoForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>{l('Active')}</FormLabel>
                        <FormDescription>
                          {l("Enable this SEO setting")}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {l("Cancel")}
                </Button>
                <Button type="submit" disabled={createSeoSetting.isPending || updateSeoSetting.isPending}>
                  {createSeoSetting.isPending || updateSeoSetting.isPending
                    ? l("Saving...")
                    : selectedSetting
                    ? l("Update Setting")
                    : l("Create Setting")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}