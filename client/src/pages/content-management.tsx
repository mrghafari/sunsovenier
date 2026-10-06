import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Image, Type, Globe, Palette, Save, RefreshCw, Trash2, Eye, Edit3, Package, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateContentManagement } from "./content-management-translations";
import {
  normalizeSiteLanguageSettings,
  siteLanguages,
  type SiteLanguage,
  type SiteLanguageSettings,
} from "@shared/site-language-settings";

interface ContentItem {
  id: number;
  key: string;
  content: string;
  contentType: 'text' | 'html' | 'image' | 'json';
  language: 'en' | 'ar' | 'ku' | 'tr' | 'fa';
  section: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ImageAsset {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  alt: string;
  section: string;
  isActive: boolean;
  createdAt: string;
}

interface ShowcaseProduct {
  id: number;
  name: string;
  technicalName?: string;
  description?: string;
  category: string;
  features?: string[];
  applications?: string[];
  inventoryStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  imageUrl?: string;
  pdfCatalogUrl?: string;
  isActive: boolean;
}

interface CategoryProductSettings {
  category: string;
  randomDisplayEnabled: boolean;
  maxDisplayCount: number;
  selectedProductIds: number[];
}

interface TawkSettings {
  id: number;
  isEnabled: boolean;
  scriptCode: string;
  propertyId?: string;
  widgetId?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

function getCategoryFallbackImage(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('fuel') || n.includes('additive') || n.includes('سوخت'))
    return 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&q=80';
  if (n.includes('water') || n.includes('treatment') || n.includes('آب'))
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80';
  if (n.includes('paint') || n.includes('thinner') || n.includes('رنگ'))
    return 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?auto=format&fit=crop&w=800&q=80';
  if (n.includes('agri') || n.includes('fertiliz') || n.includes('کشاورزی') || n.includes('کود'))
    return 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80';
  if (n.includes('industrial') || n.includes('chemical') || n.includes('صنعتی') || n.includes('شیمی'))
    return 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80';
  if (n.includes('factory') || n.includes('equipment') || n.includes('تجهیز'))
    return 'https://images.unsplash.com/photo-1565715101917-9474fc0ff03c?auto=format&fit=crop&w=800&q=80';
  return 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80';
}

export default function ContentManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  // This is the interface language. selectedLanguage below intentionally
  // remains the language of the content being edited.
  const { language: interfaceLanguage, direction } = useLanguage();
  const tx = (value: string) => translateContentManagement(interfaceLanguage, value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ar' | 'ku' | 'tr' | 'fa'>('en');
  const [selectedSection, setSelectedSection] = useState<string>('product_display');
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>('content');
  const [selectedCategory, setSelectedCategory] = useState<string>('agricultural-fertilizers');
  
  // State for Tawk.to Support Chat
  const [editingTawk, setEditingTawk] = useState<TawkSettings | null>(null);

  // Check URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'settings-control') {
      setActiveTab('settings-control');
    }
  }, []);

  // Check if user is super admin (id = 1)
  const isSuperAdmin = user?.id === 1;

  // Query for content items using admin API
  const { data: contentItems, isLoading: loadingContent } = useQuery({
    queryKey: ['/api/admin/content', selectedLanguage, selectedSection],
    queryFn: () => 
      fetch(`/api/admin/content?language=${selectedLanguage}&section=${selectedSection}`)
        .then(res => res.json())
        .then(data => data.success ? data.data : [])
  });

  // Query for public content settings (for non-authenticated toggle state display)
  const { data: publicContentItems, isLoading: loadingPublicContent } = useQuery({
    queryKey: ['/api/public/content-settings', selectedLanguage, selectedSection],
    queryFn: () => 
      fetch(`/api/public/content-settings?language=${selectedLanguage}&section=${selectedSection}`)
        .then(res => res.json())
        .then(data => data.success ? data.data : [])
  });

  // Query for image assets
  const { data: imageAssets, isLoading: loadingImages } = useQuery({
    queryKey: ['/api/admin/content/images', selectedSection],
    queryFn: () => 
      fetch(`/api/admin/content/images?section=${selectedSection}`)
        .then(res => res.json())
        .then(data => data.success ? data.data : [])
  });

  // Query for products by category
  const { data: categoryProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['/api/products', selectedCategory],
    queryFn: () => 
      fetch(`/api/products?category=${selectedCategory}`)
        .then(res => res.json())
        .then(data => Array.isArray(data) ? data : [])
  });

  // Query for category product assignments
  const { data: categoryProductAssignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['/api/content-management/category-products'],
    queryFn: () => 
      fetch(`/api/content-management/category-products`)
        .then(res => res.json())
        .then(data => data.success ? data.data : [])
  });

  // Query for available shop products
  const { data: availableProducts, isLoading: loadingAvailableProducts } = useQuery({
    queryKey: ['/api/content-management/available-products', selectedCategory],
    queryFn: () => 
      fetch(`/api/content-management/available-products?category=${selectedCategory}&limit=100`)
        .then(res => res.json())
        .then(data => data.success ? data.data : [])
  });

  // Query for Tawk.to support chat settings
  const { data: tawkSettings, isLoading: loadingTawk, refetch: refetchTawk } = useQuery<TawkSettings>({
    queryKey: ['/api/admin/tawk-support'],
    queryFn: () => 
      fetch('/api/admin/tawk-support')
        .then(res => res.json())
        .then(data => data.success ? data.data : null),
    enabled: activeTab === 'tawk-support'
  });

  // Initialize editing state when tawk settings load
  useEffect(() => {
    if (tawkSettings && !editingTawk) {
      setEditingTawk(tawkSettings);
    }
  }, [tawkSettings]);

  // Query for homepage categories management
  interface HomepageCategory {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    isActive: boolean;
    displayOrder: number;
  }
  const { data: homepageCategories, isLoading: loadingHomepageCategories, refetch: refetchHomepageCategories } = useQuery<HomepageCategory[]>({
    queryKey: ['/api/admin/categories'],
    queryFn: () =>
      fetch('/api/admin/categories')
        .then(res => res.json())
        .then(data => Array.isArray(data) ? data : []),
    enabled: activeTab === 'homepage-categories'
  });

  const [editingCategory, setEditingCategory] = useState<HomepageCategory | null>(null);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<number, Partial<HomepageCategory>>>({});
  const [categoryImageUploading, setCategoryImageUploading] = useState<number | null>(null);
  const categoryImageInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const uploadCategoryImageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`/api/admin/categories/${id}/image`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'آپلود ناموفق بود');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({ title: tx("Image uploaded"), description: tx("Image was saved to S3 and its link was updated.") });
      setCategoryDrafts(prev => ({ ...prev, [variables.id]: { ...prev[variables.id], imageUrl: data.url } }));
      refetchHomepageCategories();
      queryClient.invalidateQueries({ queryKey: ['/api/public/categories'] });
      setCategoryImageUploading(null);
    },
    onError: (error: Error) => {
      toast({ title: tx("Upload error"), description: error.message, variant: "destructive" });
      setCategoryImageUploading(null);
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<HomepageCategory> & { id: number }) => {
      return apiRequest(`/api/admin/categories/${id}`, {
        method: 'PUT',
        body: data
      });
    },
    onSuccess: () => {
      toast({ title: tx("Category updated"), description: tx("Changes saved successfully.") });
      refetchHomepageCategories();
      queryClient.invalidateQueries({ queryKey: ['/api/public/categories'] });
    },
    onError: () => {
      toast({ title: tx("Error"), description: tx("Changes could not be saved."), variant: "destructive" });
    }
  });

  // Mutation for updating content
  const updateContentMutation = useMutation({
    mutationFn: async (data: { id: number; content: string; isActive: boolean }) => {
      return apiRequest(`/api/admin/content/${data.id}`, {
        method: 'PUT',
        body: {
          content: data.content,
          isActive: data.isActive
        }
      });
    },
    onSuccess: () => {
      toast({
        title: tx("Content updated"),
        description: tx("Content changes saved successfully.")
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content'] });
    }
  });

  // Mutation for creating content
  const createContentMutation = useMutation({
    mutationFn: async (data: { key: string; content: string; contentType: string; language: string; section: string; isActive?: boolean }) => {
      return apiRequest('/api/admin/content', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: tx("Content created"),
        description: tx("New content created successfully.")
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content'] });
    }
  });

  // Mutation for uploading images
  const uploadImageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/admin/content/images/upload', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: tx("Image uploaded"),
        description: tx("Image uploaded successfully.")
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/images'] });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  });

  // Mutation for deleting images
  const deleteImageMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/content/images/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: tx("Image deleted"),
        description: tx("Image deleted successfully.")
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/images'] });
    },
    onError: () => {
      toast({ 
        title: tx("Image deletion error"), 
        variant: "destructive",
        description: tx("Image could not be deleted. Please try again.")
      });
    }
  });

  // Mutation for updating category product assignments
  const updateCategoryProductsMutation = useMutation({
    mutationFn: async (data: { category: string; productIds: number[]; isActive?: boolean }) => {
      return apiRequest(`/api/content-management/category-products/${data.category}`, {
        method: 'PUT',
        body: {
          productIds: data.productIds,
          isActive: data.isActive !== undefined ? data.isActive : true
        }
      });
    },
    onSuccess: () => {
      toast({
        title: tx("Category products updated"),
        description: tx("Product assignments saved successfully.")
      });
      queryClient.invalidateQueries({ queryKey: ['/api/content-management/category-products'] });
    },
    onError: () => {
      toast({
        title: tx("Update error"),
        description: tx("Could not save product assignments."),
        variant: "destructive"
      });
    }
  });

  // Mutation for updating Tawk.to support chat settings
  const updateTawkMutation = useMutation({
    mutationFn: async (data: { isEnabled: boolean; scriptCode: string; notes?: string }) => {
      return apiRequest('/api/admin/tawk-support', {
        method: 'PUT',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: tx("Tawk.to settings updated"),
        description: tx("Live chat settings saved successfully.")
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tawk-support'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tawk-support'] });
      refetchTawk();
      
      // Dispatch custom event to notify TawkToChat component
      window.dispatchEvent(new CustomEvent('tawk-settings-updated'));
      console.log('✅ Dispatched tawk-settings-updated event');
    },
    onError: () => {
      toast({
        title: tx("Update failed"),
        description: tx("Failed to save Tawk.to settings."),
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ 
        title: tx("Invalid file"), 
        description: tx("Please select an image file."),
        variant: "destructive" 
      });
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('section', selectedSection);
    formData.append('alt', file.name.split('.')[0]);

    uploadImageMutation.mutate(formData);
  };

  const handleContentEdit = (item: ContentItem) => {
    setEditingContent(item);
  };

  const handleContentSave = () => {
    if (!editingContent) return;
    
    updateContentMutation.mutate({
      id: editingContent.id,
      content: editingContent.content,
      isActive: editingContent.isActive
    });
  };

  const sections = [
    { value: 'contact', label: 'Contact Page (104 آیتم)' },
    { value: 'services', label: 'Services Page (52 آیتم)' },
    { value: 'home', label: 'Home Page (47 آیتم)' },
    { value: 'about', label: 'About Page (40 آیتم)' },
    { value: 'technical_equipment', label: 'Technical Equipment (34 آیتم)' },
    { value: 'admin_dashboard', label: 'Admin Dashboard (34 آیتم)' },
    { value: 'industrial_chemicals', label: 'Industrial Chemicals (30 آیتم)' },
    { value: 'paint_solvents', label: 'Paint & Solvents (30 آیتم)' },
    { value: 'commercial_goods', label: 'Commercial Goods (30 آیتم)' },
    { value: 'social_media', label: 'Social Media Links (24 آیتم)' },
    { value: 'homepage', label: 'Homepage (4 آیتم)' },
    { value: 'footer', label: 'Footer (1 آیتم)' },
    { value: 'products', label: 'Products' },
    { value: 'navigation', label: 'Navigation' },
    { value: 'hero', label: 'Hero Section' },
    { value: 'testimonials', label: 'Testimonials' },
    { value: 'discount_banner', label: 'بنر تخفیف (Discount Banner)' },
    { value: 'ai_settings', label: 'تنظیمات AI (AI Settings)' }
  ];

  const languages = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'ar', label: 'Arabic', flag: '🇮🇶' },
    { value: 'ku', label: 'Kurdish', flag: '🏳️' },
    { value: 'tr', label: 'Turkish', flag: '🇹🇷' },
    { value: 'fa', label: 'Persian', flag: '🇮🇷' }
  ];

  return (
    <div dir={direction} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <Button
                variant="ghost"
                onClick={() => setLocation("/admin/site-management")}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {tx("Back to Site Management")}
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {tx("Content Management")}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {tx("Manage website content, images, and multilingual text")}
              </p>
            </div>
          </div>
          
          {/* Language and Section Selectors */}
          <div className="flex items-center gap-4">
            <Select value={selectedLanguage} onValueChange={(value: 'en' | 'ar' | 'ku' | 'tr' | 'fa') => setSelectedLanguage(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <div className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map(section => (
                  <SelectItem key={section.value} value={section.value}>
                    {section.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap w-full h-auto gap-1 p-1">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              {tx("Text Content")}
            </TabsTrigger>
            <TabsTrigger value="settings-control" className="flex items-center gap-2">
              <Switch className="w-4 h-4" />
              {tx("Settings Control")}
            </TabsTrigger>
            <TabsTrigger value="homepage-categories" className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              {tx("Homepage Categories")}
            </TabsTrigger>
            <TabsTrigger value="products-display" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {tx("Products Display")}
            </TabsTrigger>
            <TabsTrigger value="category-products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {tx("Category Products")}
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              {tx("Images")}
            </TabsTrigger>
            <TabsTrigger value="translations" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {tx("Translations")}
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              {tx("Theme Settings")}
            </TabsTrigger>
            <TabsTrigger value="tawk-support" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              {tx("Live Chat")}
            </TabsTrigger>
            <TabsTrigger value="language-settings" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {tx("Site Languages")}
            </TabsTrigger>
          </TabsList>

          {/* Text Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <div className="grid gap-6">
              {loadingContent ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">{tx("Loading content...")}</span>
                </div>
              ) : (
                <>
                  {contentItems && contentItems.length > 0 ? (
                    contentItems.map((item: ContentItem) => (
                      <Card key={item.id} className="relative">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{item.key}</CardTitle>
                            <CardDescription>
                              Section: {item.section} | Type: {item.contentType} | Language: {item.language.toUpperCase()}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={item.isActive ? "default" : "secondary"}>
                              {item.isActive ? tx("Active") : tx("Inactive")}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleContentEdit(item)}
                              aria-label={tx("Edit")}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {editingContent?.id === item.id ? (
                            <div className="space-y-4">
                              <Textarea
                                value={editingContent.content}
                                onChange={(e) => setEditingContent({
                                  ...editingContent,
                                  content: e.target.value
                                })}
                                rows={6}
                                className="font-mono text-sm"
                              />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={editingContent.isActive}
                                    onCheckedChange={(checked) => setEditingContent({
                                      ...editingContent,
                                      isActive: checked
                                    })}
                                  />
                                  <Label>{tx("Active")}</Label>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => setEditingContent(null)}
                                  >
                                    {tx("Cancel")}
                                  </Button>
                                  <Button
                                    onClick={handleContentSave}
                                    disabled={updateContentMutation.isPending}
                                  >
                                    <Save className="w-4 h-4 mr-2" />
                                    {tx("Save Changes")}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                              <pre className="text-sm whitespace-pre-wrap font-mono">
                                {item.content.length > 200 
                                  ? `${item.content.substring(0, 200)}...` 
                                  : item.content
                                }
                              </pre>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <Type className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">{tx("No content found for this section and language")}</p>
                        <p className="text-sm text-gray-400 mt-2">
                          Content will be automatically created when you update text in the website interface
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Settings Control Tab */}
          <TabsContent value="settings-control" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Discount Banner Control */}
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    {tx("Discount Banner Control")}
                  </CardTitle>
                  <CardDescription>
                    {tx("Enable or disable the discount banner on the homepage")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(updateContentMutation.isPending || createContentMutation.isPending) && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-md">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {tx("Saving changes...")}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{tx("Discount banner status")}</h4>
                      <p className="text-sm text-gray-600">{tx("Show the discount banner at the top of the page")}</p>
                    </div>
                    <Switch
                      checked={contentItems?.find((item: ContentItem) => item.key === 'discount_banner_enabled')?.isActive || false}
                      disabled={updateContentMutation.isPending || createContentMutation.isPending}
                      onCheckedChange={(checked) => {
                        console.log('🎛️ [TOGGLE] Discount banner toggle clicked:', checked);
                        const existingItem = contentItems?.find((item: ContentItem) => item.key === 'discount_banner_enabled');
                        if (existingItem) {
                          console.log('🎛️ [TOGGLE] Updating existing discount banner item:', existingItem.id);
                          updateContentMutation.mutate({
                            id: existingItem.id,
                            content: checked ? 'true' : 'false',
                            isActive: checked
                          });
                        } else {
                          console.log('🎛️ [TOGGLE] Creating new discount banner item');
                          createContentMutation.mutate({
                            key: 'discount_banner_enabled',
                            content: checked ? 'true' : 'false',
                            contentType: 'text',
                            language: selectedLanguage,
                            section: 'discount_banner',
                            isActive: checked
                          });
                        }
                      }}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label>{tx("Discount banner text")}</Label>
                    <Textarea
                      placeholder={tx("Enter discount banner text...")}
                      value={contentItems?.find((item: ContentItem) => item.key === 'discount_banner_text')?.content || ''}
                      disabled={updateContentMutation.isPending || createContentMutation.isPending}
                      onChange={(e) => {
                        console.log('🎛️ [TEXT] Discount banner text changed:', e.target.value);
                        const existingItem = contentItems?.find((item: ContentItem) => item.key === 'discount_banner_text');
                        if (existingItem) {
                          console.log('🎛️ [TEXT] Updating existing discount banner text item:', existingItem.id);
                          updateContentMutation.mutate({
                            id: existingItem.id,
                            content: e.target.value,
                            isActive: existingItem.isActive
                          });
                        } else {
                          console.log('🎛️ [TEXT] Creating new discount banner text item');
                          createContentMutation.mutate({
                            key: 'discount_banner_text',
                            content: e.target.value,
                            contentType: 'text',
                            language: selectedLanguage,
                            section: 'discount_banner',
                            isActive: true
                          });
                        }
                      }}
                      className="min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* AI Settings Control */}
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    {tx("AI Settings Control")}
                  </CardTitle>
                  <CardDescription>
                    {tx("Enable or disable artificial intelligence features")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(updateContentMutation.isPending || createContentMutation.isPending) && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-md">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {tx("Saving changes...")}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{tx("AI status")}</h4>
                      <p className="text-sm text-gray-600">{tx("Enable artificial intelligence features")}</p>
                    </div>
                    <div>
                      <Switch
                        checked={contentItems?.find((item: ContentItem) => item.key === 'ai_enabled')?.isActive || false}
                        disabled={updateContentMutation.isPending || createContentMutation.isPending}
                        onCheckedChange={(checked) => {
                          console.log('🎛️ [TOGGLE] AI toggle clicked:', checked);
                          const existingItem = contentItems?.find((item: ContentItem) => item.key === 'ai_enabled');
                          if (existingItem) {
                            console.log('🎛️ [TOGGLE] Updating existing AI item:', existingItem.id);
                            updateContentMutation.mutate({
                              id: existingItem.id,
                              content: checked ? 'true' : 'false',
                              isActive: checked
                            });
                          } else {
                            console.log('🎛️ [TOGGLE] Creating new AI item');
                            createContentMutation.mutate({
                              key: 'ai_enabled',
                              content: checked ? 'true' : 'false',
                              contentType: 'text',
                              language: selectedLanguage,
                              section: 'ai_settings',
                              isActive: checked
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>{tx("AI message")}</Label>
                    <Textarea
                      placeholder={tx("Enter an AI message or description...")}
                      value={contentItems?.find((item: ContentItem) => item.key === 'ai_message')?.content || ''}
                      disabled={updateContentMutation.isPending || createContentMutation.isPending}
                      onChange={(e) => {
                        console.log('🎛️ [TEXT] AI message changed:', e.target.value);
                        const existingItem = contentItems?.find((item: ContentItem) => item.key === 'ai_message');
                        if (existingItem) {
                          console.log('🎛️ [TEXT] Updating existing AI message item:', existingItem.id);
                          updateContentMutation.mutate({
                            id: existingItem.id,
                            content: e.target.value,
                            isActive: existingItem.isActive
                          });
                        } else {
                          console.log('🎛️ [TEXT] Creating new AI message item');
                          createContentMutation.mutate({
                            key: 'ai_message',
                            content: e.target.value,
                            contentType: 'text',
                            language: selectedLanguage,
                            section: 'ai_settings',
                            isActive: true
                          });
                        }
                      }}
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label>{tx("OpenAI API key")}</Label>
                    <Input
                      type="password"
                      placeholder="OpenAI API Key..."
                      value={contentItems?.find((item: ContentItem) => item.key === 'openai_api_key')?.content || ''}
                      disabled={updateContentMutation.isPending || createContentMutation.isPending}
                      onChange={(e) => {
                        console.log('🎛️ [TEXT] OpenAI API Key changed');
                        const existingItem = contentItems?.find((item: ContentItem) => item.key === 'openai_api_key');
                        if (existingItem) {
                          console.log('🎛️ [TEXT] Updating existing OpenAI API Key item:', existingItem.id);
                          updateContentMutation.mutate({
                            id: existingItem.id,
                            content: e.target.value,
                            isActive: existingItem.isActive
                          });
                        } else {
                          console.log('🎛️ [TEXT] Creating new OpenAI API Key item');
                          createContentMutation.mutate({
                            key: 'openai_api_key',
                            content: e.target.value,
                            contentType: 'text',
                            language: selectedLanguage,
                            section: 'ai_settings',
                            isActive: true
                          });
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Display Tab */}
          <TabsContent value="products-display" className="space-y-6">
            <div className="grid gap-6">
              {/* Category Selection */}
              <Card className="border-purple-200 bg-purple-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <Package className="w-5 h-5" />
                    {tx("Product display by category")}
                  </CardTitle>
                  <CardDescription>
                    {tx("Configure random product display on category pages")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Category Selector */}
                  <div className="space-y-3">
                    <Label>{tx("Select category")}</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agricultural-fertilizers">
                          <div className="flex items-center gap-2">
                            <span>🌾</span>
                            <span>{tx("Agricultural Fertilizers")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="industrial-chemicals">
                          <div className="flex items-center gap-2">
                            <span>⚗️</span>
                            <span>{tx("Industrial Chemicals")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="paint-solvents">
                          <div className="flex items-center gap-2">
                            <span>🎨</span>
                            <span>{tx("Paint Solvents")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="fuel-additives">
                          <div className="flex items-center gap-2">
                            <span>⛽</span>
                            <span>{tx("Fuel Additives")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="water-treatment">
                          <div className="flex items-center gap-2">
                            <span>💧</span>
                            <span>{tx("Water Treatment")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="other">
                          <div className="flex items-center gap-2">
                            <span>📦</span>
                            <span>{tx("Other Products")}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Random Display Settings */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                      <div>
                        <h4 className="font-medium text-gray-900">{tx("Random display enabled")}</h4>
                        <p className="text-sm text-gray-600">{tx("Display products randomly in this category")}</p>
                      </div>
                      <Switch
                        checked={(() => {
                          // Wait for data to load before checking
                          if (loadingContent && loadingPublicContent) {
                            console.log('🔄 [LOADING] Still loading content and public data...');
                            return false;
                          }
                          
                          // Debug: Let's see what data we have
                          console.log('🔍 [DEBUG] contentItems loaded:', !!contentItems, contentItems?.length);
                          console.log('🔍 [DEBUG] publicContentItems loaded:', !!publicContentItems, publicContentItems?.length);
                          console.log('🔍 [DEBUG] Looking for key:', `random_display_${selectedCategory}`);
                          
                          // Use admin authenticated data if available, fallback to public data
                          const adminItem = contentItems?.find((item: ContentItem) => item.key === `random_display_${selectedCategory}`);
                          const publicItem = Array.isArray(publicContentItems) ? publicContentItems.find((item: ContentItem) => item.key === `random_display_${selectedCategory}`) : null;
                          const isChecked = adminItem?.isActive || publicItem?.isActive || false;
                          
                          console.log('🎛️ [TOGGLE STATE] Random display switch:', { 
                            category: selectedCategory, 
                            adminItem: adminItem?.isActive, 
                            publicItem: publicItem?.isActive, 
                            final: isChecked 
                          });
                          return isChecked;
                        })()}
                        disabled={loadingContent || loadingPublicContent || updateContentMutation.isPending || createContentMutation.isPending}
                        onCheckedChange={(checked) => {
                          console.log('🎛️ [TOGGLE] Random display toggle clicked:', { category: selectedCategory, checked });
                          const existingItem = contentItems?.find((item: ContentItem) => item.key === `random_display_${selectedCategory}`);
                          if (existingItem) {
                            console.log('🎛️ [TOGGLE] Updating existing item:', existingItem.id);
                            updateContentMutation.mutate({
                              id: existingItem.id,
                              content: checked ? 'true' : 'false',
                              isActive: checked
                            });
                          } else {
                            console.log('🎛️ [TOGGLE] Creating new item');
                            createContentMutation.mutate({
                              key: `random_display_${selectedCategory}`,
                              content: checked ? 'true' : 'false',
                              contentType: 'text',
                              language: selectedLanguage,
                              section: 'product_display',
                              isActive: checked
                            });
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>{tx("Display product count")}</Label>
                      <Select
                        value={(() => {
                          const adminItem = contentItems?.find((item: ContentItem) => item.key === `max_display_${selectedCategory}`);
                          const publicItem = Array.isArray(publicContentItems) ? publicContentItems.find((item: ContentItem) => item.key === `max_display_${selectedCategory}`) : null;
                          return adminItem?.content || publicItem?.content || '3';
                        })()}
                        onValueChange={(value) => {
                          console.log('🎛️ [MAX DISPLAY] Value changed:', { category: selectedCategory, value });
                          const existingItem = contentItems?.find((item: ContentItem) => item.key === `max_display_${selectedCategory}`);
                          if (existingItem) {
                            console.log('🎛️ [MAX DISPLAY] Updating existing item:', existingItem.id);
                            updateContentMutation.mutate({
                              id: existingItem.id,
                              content: value,
                              isActive: existingItem.isActive
                            });
                          } else {
                            console.log('🎛️ [MAX DISPLAY] Creating new item');
                            createContentMutation.mutate({
                              key: `max_display_${selectedCategory}`,
                              content: value,
                              contentType: 'text',
                              language: selectedLanguage,
                              section: 'product_display',
                              isActive: true
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 {tx("product")}</SelectItem>
                          <SelectItem value="2">2 {tx("product")}</SelectItem>
                          <SelectItem value="3">3 {tx("product")}</SelectItem>
                          <SelectItem value="4">4 {tx("product")}</SelectItem>
                          <SelectItem value="5">5 {tx("product")}</SelectItem>
                          <SelectItem value="6">6 {tx("product")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products List for Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {tx("Products available in category")} {selectedCategory}
                  </CardTitle>
                  <CardDescription>
                    {categoryProducts?.length || 0} {tx("products available in this category")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingProducts ? (
                    <div className="flex items-center justify-center p-8">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      <span className="ml-2">{tx("Loading products...")}</span>
                    </div>
                  ) : categoryProducts && categoryProducts.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryProducts.map((product: ShowcaseProduct) => (
                        <div
                          key={product.id}
                          className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                        >
                          {product.imageUrl && (
                            <div className="aspect-video w-full mb-3 bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <h3 className="font-medium text-gray-900 mb-2">{product.name}</h3>
                          {product.technicalName && (
                            <p className="text-sm text-gray-600 mb-2">{product.technicalName}</p>
                          )}
                          {product.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <Badge 
                              variant={product.inventoryStatus === 'in_stock' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {product.inventoryStatus === 'in_stock' ? `✅ ${tx("In stock")}` : 
                               product.inventoryStatus === 'low_stock' ? `⚠️ ${tx("Low stock")}` : `❌ ${tx("Out of stock")}`}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              ID: {product.id}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">{tx("No products found in this category")}</p>
                      <p className="text-sm text-gray-400 mt-2">
                        {tx("Add products to this category first")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Preview Section */}
              {categoryProducts && categoryProducts.length > 0 && (
                <Card className="border-green-200 bg-green-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <Eye className="w-5 h-5" />
                      {tx("Random display preview")}
                    </CardTitle>
                    <CardDescription>
                      {tx("Example of how products appear on a category page")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white p-6 rounded-lg border-2 border-dashed border-green-300">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        محصولات پیشنهادی {selectedCategory}
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        {categoryProducts
                          .sort(() => Math.random() - 0.5)
                          .slice(0, parseInt(contentItems?.find((item: ContentItem) => item.key === `max_display_${selectedCategory}`)?.content || '3'))
                          .map((product: ShowcaseProduct) => (
                            <div
                              key={product.id}
                              className="p-3 bg-gray-50 rounded-lg border text-center"
                            >
                              {product.imageUrl && (
                                <div className="aspect-square w-16 h-16 mx-auto mb-2 bg-gray-200 rounded-lg overflow-hidden">
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <h4 className="font-medium text-sm text-gray-900">{product.name}</h4>
                              <Badge variant="outline" className="text-xs mt-1">
                                Get Quote
                              </Badge>
                            </div>
                          ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        * محصولات هر بار به صورت تصادفی انتخاب و نمایش داده می‌شوند
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Category Products Management Tab */}
          <TabsContent value="category-products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  مدیریت محصولات کتگوری‌های صفحات
                </CardTitle>
                <CardDescription>
                  محصولات فروشگاه را به کتگوری‌های صفحات مختلف اختصاص دهید تا در آن‌ها نمایش داده شوند
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-6">
              {[
                { key: 'fuel-additives', label: 'افزودنی سوخت', count: availableProducts?.filter((p: any) => p.category?.toLowerCase().includes('fuel')).length || 0 },
                { key: 'water-treatment', label: 'تصفیه آب', count: availableProducts?.filter((p: any) => p.category?.toLowerCase().includes('water')).length || 0 },
                { key: 'paint-solvents', label: 'رنگ و حلال', count: availableProducts?.filter((p: any) => p.category?.toLowerCase().includes('paint') || p.category?.toLowerCase().includes('solvent')).length || 0 },
                { key: 'agricultural-fertilizers', label: 'کود کشاورزی', count: availableProducts?.filter((p: any) => p.category?.toLowerCase().includes('agricultural') || p.category?.toLowerCase().includes('fertilizer')).length || 0 },
                { key: 'industrial-chemicals', label: 'مواد شیمیایی صنعتی', count: availableProducts?.filter((p: any) => p.category?.toLowerCase().includes('industrial') || p.category?.toLowerCase().includes('chemical')).length || 0 },
                { key: 'paint-thinner', label: 'تینر', count: availableProducts?.filter((p: any) => p.category?.toLowerCase().includes('thinner')).length || 0 },
                { key: 'technical-equipment', label: 'تجهیزات فنی', count: availableProducts?.filter((p: any) => p.category?.toLowerCase().includes('technical') || p.category?.toLowerCase().includes('equipment')).length || 0 },
                { key: 'commercial-goods', label: 'کالاهای تجاری', count: availableProducts?.filter((p: any) => p.category?.toLowerCase().includes('commercial')).length || 0 }
              ].map((category) => {
                const currentAssignment = categoryProductAssignments?.find((assignment: any) => assignment.category === category.key);
                const selectedProductIds = currentAssignment?.productIds || [];
                
                return (
                  <Card key={category.key} className="relative">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{category.label}</CardTitle>
                        <CardDescription>
                          کلید: {category.key} | محصولات انتخاب شده: {selectedProductIds.length} | موجود در فروشگاه: {category.count}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={currentAssignment?.isActive ? "default" : "secondary"}>
                          {currentAssignment?.isActive ? "فعال" : "غیرفعال"}
                        </Badge>
                        <Switch
                          checked={currentAssignment?.isActive || false}
                          disabled={updateCategoryProductsMutation.isPending}
                          onCheckedChange={(checked) => {
                            updateCategoryProductsMutation.mutate({
                              category: category.key,
                              productIds: selectedProductIds,
                              isActive: checked
                            });
                          }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Available Products Section */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">{tx("Available store products")}</Label>
                          {loadingAvailableProducts ? (
                            <div className="flex items-center justify-center py-4">
                              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                              {tx("Loading...")}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2 max-h-60 overflow-y-auto border rounded p-3 bg-gray-50">
                              {availableProducts && availableProducts.length > 0 ? (
                                availableProducts
                                  .filter((product: any) => 
                                    product.category?.toLowerCase().includes(category.key.split('-')[0]) ||
                                    (category.key === 'fuel-additives' && product.category?.toLowerCase().includes('fuel')) ||
                                    (category.key === 'paint-thinner' && product.category?.toLowerCase().includes('thinner')) ||
                                    (category.key === 'agricultural-fertilizers' && product.category?.toLowerCase().includes('fertilizer'))
                                  )
                                  .map((product: any) => {
                                    const isSelected = selectedProductIds.includes(product.id);
                                    return (
                                      <div
                                        key={product.id}
                                        className={`p-3 border rounded cursor-pointer transition-all ${
                                          isSelected 
                                            ? 'bg-blue-100 border-blue-500 shadow-md' 
                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}
                                        onClick={() => {
                                          const newProductIds = isSelected 
                                            ? selectedProductIds.filter((id: number) => id !== product.id)
                                            : [...selectedProductIds, product.id];
                                          
                                          updateCategoryProductsMutation.mutate({
                                            category: category.key,
                                            productIds: newProductIds,
                                            isActive: currentAssignment?.isActive || true
                                          });
                                        }}
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                                              {product.name}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                              SKU: {product.sku} | موجودی: {product.stock_quantity}
                                            </p>
                                          </div>
                                          <div className="ml-2">
                                            {isSelected ? (
                                              <Badge className="text-xs bg-blue-600">{tx("Selected")}</Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-xs">{tx("Select")}</Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                              ) : (
                                <div className="col-span-full text-center py-4 text-gray-500">
                                  {tx("No products found in this category")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Selected Products Preview */}
                        {selectedProductIds.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-green-700">{tx("Selected products")} ({selectedProductIds.length})</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 p-3 bg-green-50 border border-green-200 rounded">
                              {selectedProductIds.map((productId: number) => {
                                const product = availableProducts?.find((p: any) => p.id === productId);
                                return product ? (
                                  <div key={productId} className="flex items-center justify-between bg-white p-2 rounded border">
                                    <span className="text-sm font-medium">{product.name}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newProductIds = selectedProductIds.filter((id: number) => id !== productId);
                                        updateCategoryProductsMutation.mutate({
                                          category: category.key,
                                          productIds: newProductIds,
                                          isActive: currentAssignment?.isActive || true
                                        });
                                      }}
                                      className="h-6 w-6 p-0 hover:bg-red-100"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}

                        {updateCategoryProductsMutation.isPending && (
                          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-md">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            در حال ذخیره تغییرات...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Instructions */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm text-blue-800">
                  <h4 className="font-medium">{tx("How to use:")}</h4>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>{tx("Select products from the store for each category")}</li>
                    <li>{tx("Settings are saved automatically")}</li>
                    <li>{tx("Selected products will appear on category pages")}</li>
                    <li>{tx("Use the switch to disable product display")}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  {tx("Upload New Image")}
                </CardTitle>
                <CardDescription>
                  {tx("Upload images for the selected section")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadImageMutation.isPending}
                    className="mb-4"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadImageMutation.isPending ? tx("Uploading...") : tx("Choose Image")}
                  </Button>
                  <p className="text-sm text-gray-500">
                    {tx("Supported formats: JPEG, PNG, WebP, SVG")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Image Gallery */}
            {loadingImages ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="ml-2">{tx("Loading images...")}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {imageAssets && imageAssets.length > 0 ? (
                  imageAssets.map((image: ImageAsset) => (
                    <Card key={image.id} className="overflow-hidden">
                      <div className="aspect-video relative bg-gray-100 dark:bg-gray-800">
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Badge variant={image.isActive ? "default" : "secondary"} className="text-xs">
                            {image.isActive ? tx("Active") : tx("Inactive")}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium truncate">{image.originalName}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {(image.size / 1024).toFixed(1)} KB • {image.mimeType}
                        </p>
                        <div className="flex justify-between mt-3">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            {tx("View")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteImageMutation.mutate(image.id)}
                            disabled={deleteImageMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {tx("Remove")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="text-center py-8">
                        <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">{tx("No images found for this section")}</p>
                        <p className="text-sm text-gray-400 mt-2">
                          {tx("Upload images using the form above")}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Translations Tab */}
          <TabsContent value="translations" className="space-y-6">
            <Card>
              <CardHeader>
              <CardTitle>{tx("Translation Management")}</CardTitle>
                <CardDescription>
                  {tx("Manage multilingual content across all languages")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {languages.map(lang => (
                    <div key={lang.value} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{lang.flag}</span>
                          <h3 className="font-medium">{lang.label}</h3>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLanguage(lang.value as 'en' | 'ar' | 'ku' | 'tr' | 'fa')}
                        >
                          Edit Content
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Switch to this language to edit content items
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Theme Settings Tab */}
          <TabsContent value="theme" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{tx("Theme & Visual Settings")}</CardTitle>
                <CardDescription>
                  Customize the appearance and styling of your website
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">{tx("Color Scheme")}</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                        <div className="w-full h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded mb-2"></div>
                        <p className="text-sm font-medium">{tx("Default Blue")}</p>
                      </div>
                      <div className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                        <div className="w-full h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded mb-2"></div>
                        <p className="text-sm font-medium">{tx("Green Theme")}</p>
                      </div>
                      <div className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                        <div className="w-full h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded mb-2"></div>
                        <p className="text-sm font-medium">{tx("Purple Theme")}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">{tx("Typography")}</Label>
                    <div className="space-y-3 mt-2">
                      <div className="flex items-center justify-between">
                        <span>{tx("Primary Font Family")}</span>
                        <Select defaultValue="inter">
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inter">Inter</SelectItem>
                            <SelectItem value="roboto">Roboto</SelectItem>
                            <SelectItem value="opensans">Open Sans</SelectItem>
                            <SelectItem value="lato">Lato</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{tx("Font Size Scale")}</span>
                        <Select defaultValue="medium">
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">{tx("Small")}</SelectItem>
                            <SelectItem value="medium">{tx("Medium")}</SelectItem>
                            <SelectItem value="large">{tx("Large")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">{tx("Layout Settings")}</Label>
                    <div className="space-y-3 mt-2">
                      <div className="flex items-center justify-between">
                        <span>{tx("Container Width")}</span>
                        <Select defaultValue="xl">
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lg">{tx("Large (1024px)")}</SelectItem>
                            <SelectItem value="xl">{tx("Extra Large (1280px)")}</SelectItem>
                            <SelectItem value="2xl">{tx("2X Large (1536px)")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{tx("Rounded Corners")}</span>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{tx("Drop Shadows")}</span>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tawk.to Support Chat Tab */}
          <TabsContent value="tawk-support" className="space-y-6">
            {loadingTawk ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="ml-2">{tx("Loading Tawk.to settings...")}</span>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        {tx("Tawk.to Live Chat Configuration")}
                      </CardTitle>
                      <CardDescription>
                        {tx("Manage your Tawk.to live chat widget settings. Enable or disable chat and configure the script code.")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{tx("Chat Status:")}</span>
                      <Badge variant={editingTawk?.isEnabled ? "default" : "secondary"}>
                        {editingTawk?.isEnabled ? tx("Enabled") : tx("Disabled")}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {editingTawk && (
                    <>
                      {/* Enable/Disable Toggle */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <Label htmlFor="tawk-enabled" className="text-base font-medium">
                            {tx("Enable Live Chat")}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {tx("Turn the Tawk.to chat widget on or off on your website")}
                          </p>
                        </div>
                        <Switch
                          id="tawk-enabled"
                          checked={editingTawk.isEnabled}
                          onCheckedChange={(checked) => 
                            setEditingTawk({ ...editingTawk, isEnabled: checked })
                          }
                          data-testid="switch-tawk-enabled"
                        />
                      </div>

                      {/* Script Code Input */}
                      <div className="space-y-2">
                        <Label htmlFor="tawk-script" className="text-base font-medium">
                          {tx("Tawk.to Script Code")}
                        </Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          {tx("Paste your complete Tawk.to script code here (including script tags)")}
                        </p>
                        <Textarea
                          id="tawk-script"
                          value={editingTawk.scriptCode}
                          onChange={(e) => 
                            setEditingTawk({ ...editingTawk, scriptCode: e.target.value })
                          }
                          placeholder="<script>
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement('script'),s0=document.getElementsByTagName('script')[0];
s1.async=true;
s1.src='https://embed.tawk.to/YOUR_PROPERTY_ID/YOUR_WIDGET_ID';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();
</script>"
                          className="font-mono text-sm min-h-[200px]"
                          data-testid="textarea-tawk-script"
                        />
                      </div>

                      {/* Auto-extracted IDs (read-only display) */}
                      {editingTawk.propertyId && editingTawk.widgetId && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{tx("Property ID")}</Label>
                            <Input
                              value={editingTawk.propertyId}
                              readOnly
                              className="bg-muted font-mono text-sm"
                              data-testid="input-property-id"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{tx("Widget ID")}</Label>
                            <Input
                              value={editingTawk.widgetId}
                              readOnly
                              className="bg-muted font-mono text-sm"
                              data-testid="input-widget-id"
                            />
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label htmlFor="tawk-notes" className="text-base font-medium">
                          {tx("Notes (Optional)")}
                        </Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          {tx("Add notes or instructions for managing this integration")}
                        </p>
                        <Textarea
                          id="tawk-notes"
                          value={editingTawk.notes || ''}
                          onChange={(e) => 
                            setEditingTawk({ ...editingTawk, notes: e.target.value })
                          }
                          placeholder="e.g., Contact support@tawk.to if widget stops working..."
                          className="min-h-[100px]"
                          data-testid="textarea-tawk-notes"
                        />
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                          onClick={() => {
                            updateTawkMutation.mutate({
                              isEnabled: editingTawk.isEnabled,
                              scriptCode: editingTawk.scriptCode,
                              notes: editingTawk.notes
                            });
                          }}
                          disabled={updateTawkMutation.isPending}
                          className="min-w-[120px]"
                          data-testid="button-save-tawk"
                        >
                          {updateTawkMutation.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              {tx("Saving...")}
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              {tx("Save Settings")}
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Information Box */}
                      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                          {tx("How to get your Tawk.to script:")}
                        </h4>
                        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                          <li>{tx("Log in to your")} <a href="https://dashboard.tawk.to" target="_blank" rel="noopener noreferrer" className="underline">Tawk.to Dashboard</a></li>
                          <li>{tx("Navigate to Administration > Channels > Chat Widget")}</li>
                          <li>{tx("Copy the complete script code provided")}</li>
                          <li>{tx('Paste it in the "Script Code" field above')}</li>
                          <li>{tx("Enable the chat and save your settings")}</li>
                        </ol>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Homepage Categories Tab */}
          <TabsContent value="homepage-categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  {tx("Edit Homepage Categories")}
                </CardTitle>
                <CardDescription>
                  {tx("Edit the name, description, and image shown for each category in the homepage product portfolio.")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHomepageCategories ? (
                  <div className="flex items-center justify-center p-10">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                    <span className="mr-2 text-gray-500">{tx("Loading categories...")}</span>
                  </div>
                ) : !homepageCategories || homepageCategories.length === 0 ? (
                  <p className="text-center text-gray-400 py-10">{tx("No categories found.")}</p>
                ) : (
                  <div className="space-y-4">
                    {homepageCategories.map((cat) => {
                      const draft = categoryDrafts[cat.id] ?? {};
                      const isEditing = editingCategory?.id === cat.id;
                      const currentName = isEditing ? (draft.name ?? cat.name) : cat.name;
                      const currentDesc = isEditing ? (draft.description ?? cat.description ?? '') : (cat.description ?? '');
                      const currentImage = isEditing ? (draft.imageUrl ?? cat.imageUrl ?? '') : (cat.imageUrl ?? '');

                      return (
                        <Card key={cat.id} className={`border ${isEditing ? 'border-blue-400 shadow-md' : 'border-gray-200'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              {/* Preview image */}
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                <img
                                  src={currentImage || getCategoryFallbackImage(cat.name)}
                                  alt={currentName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.src = getCategoryFallbackImage(cat.name); }}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <div className="space-y-3">
                                    <div>
                                      <Label className="text-xs font-medium text-gray-600 mb-1 block">{tx("Category name")}</Label>
                                      <Input
                                        value={currentName}
                                        onChange={(e) => setCategoryDrafts(prev => ({ ...prev, [cat.id]: { ...prev[cat.id], name: e.target.value } }))}
                                        className="h-8 text-sm"
                                        placeholder={tx("Category name")}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-medium text-gray-600 mb-1 block">{tx("Description")}</Label>
                                      <Textarea
                                        value={currentDesc}
                                        onChange={(e) => setCategoryDrafts(prev => ({ ...prev, [cat.id]: { ...prev[cat.id], description: e.target.value } }))}
                                        className="text-sm min-h-[60px] resize-none"
                                        placeholder={tx("Short description of this category...")}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-medium text-gray-600 mb-1 block">{tx("Category image")}</Label>
                                      {/* Hidden file input */}
                                      <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        className="hidden"
                                        ref={(el) => { categoryImageInputRefs.current[cat.id] = el; }}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setCategoryImageUploading(cat.id);
                                            uploadCategoryImageMutation.mutate({ id: cat.id, file });
                                          }
                                          e.target.value = '';
                                        }}
                                      />
                                      {/* Two-column: controls left, thumbnail right */}
                                      <div className="flex gap-4 items-start">
                                        {/* Left: upload button + hints */}
                                        <div className="flex-1 min-w-0">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 mb-2"
                                            disabled={categoryImageUploading === cat.id}
                                            onClick={() => categoryImageInputRefs.current[cat.id]?.click()}
                                          >
                                            {categoryImageUploading === cat.id ? (
                                              <><RefreshCw className="w-3 h-3 ml-1 animate-spin" />{tx("Uploading...")}</>
                                            ) : (
                                              <><Upload className="w-3 h-3 ml-1" />{tx("Upload new image")}</>
                                            )}
                                          </Button>
                                          {/* Dimension hint */}
                                          <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 flex items-start gap-2">
                                            <Image className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-xs text-blue-700 leading-relaxed">
                                              <span className="font-semibold">{tx("Recommended dimensions: 800 × 300 pixels")}</span>
                                              <span className="text-blue-500"> {tx("(8:3 ratio)")}</span>
                                              <br />
                                              <span className="text-blue-500">{tx("Format: JPG, PNG or WebP — maximum 2MB")}</span>
                                            </div>
                                          </div>
                                          {currentImage && (
                                            <p className="text-xs text-blue-500 truncate mt-1" dir="ltr">{currentImage}</p>
                                          )}
                                        </div>
                                        {/* Right: current image thumbnail */}
                                        {(() => {
                                          const thumbSrc = currentImage || getCategoryFallbackImage(cat.name);
                                          const isCustom = !!currentImage;
                                          return (
                                            <div className="flex-shrink-0 w-48">
                                              <p className="text-xs text-gray-400 mb-1 text-center">
                                                {isCustom ? tx("Current image (S3)") : tx("Default image")}
                                              </p>
                                              <div className="w-48 rounded-lg overflow-hidden border shadow-sm" style={{ height: '72px' }}>
                                                <img
                                                  src={thumbSrc}
                                                  alt={currentName}
                                                  className="w-full h-full object-cover"
                                                  onError={(e) => {
                                                    e.currentTarget.src = getCategoryFallbackImage(cat.name);
                                                  }}
                                                />
                                              </div>
                                              {isCustom && (
                                                <p className="text-xs text-green-600 text-center mt-1">✓ {tx("Custom image")}</p>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                      <Button
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                        disabled={updateCategoryMutation.isPending}
                                        onClick={() => {
                                          const d = categoryDrafts[cat.id] ?? {};
                                          updateCategoryMutation.mutate({
                                            id: cat.id,
                                            name: d.name ?? cat.name,
                                            slug: cat.slug,
                                            description: d.description !== undefined ? d.description : cat.description,
                                            imageUrl: d.imageUrl !== undefined ? d.imageUrl : cat.imageUrl,
                                            isActive: cat.isActive,
                                            displayOrder: cat.displayOrder,
                                          }, {
                                            onSuccess: () => {
                                              setEditingCategory(null);
                                              setCategoryDrafts(prev => { const n = { ...prev }; delete n[cat.id]; return n; });
                                            }
                                          });
                                        }}
                                      >
                                        <Save className="w-3 h-3 ml-1" />
                                        ذخیره
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingCategory(null);
                                          setCategoryDrafts(prev => { const n = { ...prev }; delete n[cat.id]; return n; });
                                        }}
                                      >
                                        انصراف
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={cat.isActive ? "default" : "secondary"} className="text-xs">
                                          {cat.isActive ? "فعال" : "غیرفعال"}
                                        </Badge>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEditingCategory(cat)}
                                          className="h-7 px-2"
                                          aria-label={tx("Edit")}
                                        >
                                          <Edit3 className="w-3 h-3 ml-1" />
                                          ویرایش
                                        </Button>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-500 line-clamp-2">
                                      {cat.description || <span className="italic text-gray-400">{tx("No description provided")}</span>}
                                    </p>
                                    {cat.imageUrl && (
                                      <p className="text-xs text-blue-500 truncate mt-1" dir="ltr">{cat.imageUrl}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="language-settings" className="space-y-6">
            <LanguageSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LanguageSettingsTab() {
  const { language: interfaceLanguage, direction } = useLanguage();
  const tx = (value: string) => translateContentManagement(interfaceLanguage, value);
  const { data: langData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['/api/public/language-settings'],
    staleTime: 0,
  });

  const [settings, setSettings] = useState<SiteLanguageSettings | null>(null);

  useEffect(() => {
    if (!settings && (langData as any)?.success === true && (langData as any)?.data) {
      setSettings(normalizeSiteLanguageSettings((langData as any).data));
    }
  }, [langData, settings]);

  const mutation = useMutation({
    mutationFn: async (data: SiteLanguageSettings): Promise<SiteLanguageSettings> => {
      const res = await fetch('/api/admin/language-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.data) {
        throw new Error(json?.message || tx('Could not save language settings. Please try again.'));
      }
      return normalizeSiteLanguageSettings(json.data);
    },
    onSuccess: (savedSettings) => {
      setSettings(savedSettings);
      queryClient.invalidateQueries({ queryKey: ['/api/public/language-settings'] });
    },
  });

  const LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English', flag: 'EN' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: 'AR' },
    { code: 'ku', name: 'Kurdish', nativeName: 'کوردی', flag: 'KU' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: 'TR' },
    { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: 'FA' },
  ] as const;

  const enabledRuntimeLanguages = settings
    ? siteLanguages.filter((code) => settings[code])
    : [];

  const handleToggle = (code: string, checked: boolean) => {
    if (!settings || mutation.isPending) return;
    const next = { ...settings, [code]: checked };
    const remainingRuntimeLanguages = siteLanguages.filter((language) => next[language]);
    if (remainingRuntimeLanguages.length === 0) return;
    if (code === settings.defaultLanguage && !checked) {
      next.defaultLanguage = remainingRuntimeLanguages[0];
    }
    setSettings(next);
    mutation.reset();
  };

  const handleSave = () => {
    if (settings && !mutation.isPending) mutation.mutate(settings);
  };

  const hasSettingsData=(langData as any)?.success===true&&Boolean((langData as any)?.data);
  if (isLoading || (!settings && (isFetching || hasSettingsData))) {
    return (
      <div dir={direction} className="space-y-4 rounded-lg border p-6" aria-busy="true">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!settings || (langData && (langData as any).success !== true && !isError)) {
    return (
      <div dir={direction} className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <p className="font-medium">{tx('Language settings could not be loaded.')}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isError ? (error as Error)?.message : tx('The server returned an unexpected response.')}
        </p>
        <Button className="mt-4" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? tx('Loading...') : tx('Try again')}
        </Button>
      </div>
    );
  }

  const editingDisabled = mutation.isPending;

  return (
    <Card dir={direction}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          {tx('Site Language Settings')}
        </CardTitle>
        <CardDescription>
          {tx('Enable or disable languages shown in the site language menu. At least one language must remain enabled.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isError && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {tx('The latest language settings could not be refreshed. Your current edits are still available.')}
          </p>
        )}
        {LANGUAGES.map(lang => {
          const isEnabled = settings[lang.code] !== false;
          const isLastRuntimeLanguage = siteLanguages.includes(lang.code as SiteLanguage)
            && enabledRuntimeLanguages.length === 1 && isEnabled;
          return (
            <div key={lang.code} className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs font-semibold tracking-wide text-muted-foreground">{lang.flag}</span>
                <div>
                  <p className="font-medium">{lang.nativeName}</p>
                  <p className="text-sm text-gray-500">{lang.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {isEnabled ? tx('Enabled') : tx('Disabled')}
                </span>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleToggle(lang.code, checked)}
                  disabled={editingDisabled || isLastRuntimeLanguage}
                  aria-label={`${tx('Enable language')}: ${lang.name}`}
                />
              </div>
            </div>
          );
        })}

        <section className="space-y-4 rounded-lg border border-border/80 bg-muted/30 p-4 sm:p-5">
          <div>
            <h3 className="font-semibold">{tx('First-visit language policy')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {tx('Choose which language a visitor sees when they first arrive. Their saved manual language choice always takes priority on later visits.')}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="initial-language-mode">{tx('Initial language method')}</Label>
              <Select
                value={settings.initialLanguageMode}
                onValueChange={(value: 'ip' | 'fixed') => {
                  setSettings((current) => current ? { ...current, initialLanguageMode: value } : current);
                  mutation.reset();
                }}
                disabled={editingDisabled}
              >
                <SelectTrigger id="initial-language-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ip">{tx('Use visitor country (IP)')}</SelectItem>
                  <SelectItem value="fixed">{tx('Always use selected language')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {settings.initialLanguageMode === 'ip'
                  ? tx('IP mode uses the visitor’s country for the first visit. If unavailable or that language is disabled, the selected language is used.')
                  : tx('Fixed mode shows the selected language on a visitor’s first visit.')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial-default-language">
                {settings.initialLanguageMode === 'ip' ? tx('Fallback language') : tx('Selected initial language')}
              </Label>
              <Select
                value={settings.defaultLanguage}
                onValueChange={(value: SiteLanguage) => {
                  setSettings((current) => current ? { ...current, defaultLanguage: value } : current);
                  mutation.reset();
                }}
                disabled={editingDisabled || enabledRuntimeLanguages.length === 0}
              >
                <SelectTrigger id="initial-default-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.filter(({ code }) => siteLanguages.includes(code as SiteLanguage) && settings[code])
                    .map(({ code, name, nativeName }) => (
                      <SelectItem key={code} value={code}>{nativeName} · {name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {tx('This language is used when country detection cannot choose an enabled language, and as the fixed first-visit language.')}
              </p>
            </div>
          </div>
        </section>

        {mutation.isError && (
          <p role="alert" className="text-sm text-destructive text-center">
            {(mutation.error as Error).message || tx('Could not save language settings. Please try again.')}
          </p>
        )}
        {mutation.isSuccess && (
          <p role="status" className="text-sm text-green-700 text-center">{tx('Language settings saved successfully')}</p>
        )}

        <Button onClick={handleSave} disabled={editingDisabled} className="w-full mt-2">
          {mutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin ml-2" />{tx('Saving...')}</> : <><Save className="w-4 h-4 ml-2" />{tx('Save Settings')}</>}
        </Button>
      </CardContent>
    </Card>
  );
}