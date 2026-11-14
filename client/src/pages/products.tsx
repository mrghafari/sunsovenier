import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertShowcaseProductSchema, type ShowcaseProduct, type InsertShowcaseProduct } from "@shared/showcase-schema";
import { z } from "zod";
import { Plus, Edit, Trash2, Package, DollarSign, Beaker, Droplet, LogOut, User, Upload, Image, FileText, X, AlertTriangle, CheckCircle, AlertCircle, XCircle, TrendingUp, TrendingDown, BarChart3, QrCode, Mail, Search, Factory, BookOpen, ArrowLeft, Wheat, Eye, EyeOff, HelpCircle, Info, Tag, Lock, RefreshCw, Sparkles, Flame } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import JsBarcode from "jsbarcode";
import VisualBarcode from "@/components/ui/visual-barcode";
import FIFOBatchDisplay from "@/components/ui/fifo-batch-display";
import ProductModel3DViewer from "@/components/ProductModel3DViewer";
import PackagingSpecificationsEditor, { PackagingSpecificationsView, hasPackagingSpecifications } from "@/components/products/PackagingSpecificationsEditor";
import { KardexFormSection, revealKardexSectionForField } from "@/components/products/KardexFormSection";

// Custom form schema that handles numeric inputs properly  
// Note: Validation messages will be handled in the form, not in schema
const formSchema = insertShowcaseProductSchema.extend({
  category: z.string().min(1),
  unitPrice: z.coerce.number().min(0),
  stockQuantity: z.coerce.number().min(0),
  minStockLevel: z.coerce.number().min(0),
  maxStockLevel: z.coerce.number().min(0),
  // Technical name/grade field for display
  technicalName: z.string().optional(),
  // Weight fields - Enhanced with net and gross weights
  netWeight: z.coerce.number().min(0).optional(),
  grossWeight: z.coerce.number().min(0).optional(),
  weightUnit: z.string().default("kg"),
  // Legacy weight field for backward compatibility
  weight: z.string().optional(),
  // Batch tracking (moved to newBatchNumber)
  batchNumber: z.string().optional(),
  // New inventory addition fields
  inventoryAddition: z.number().optional(),
  newBatchNumber: z.string().optional(),
  // Text fields for array handling
  features: z.string().optional(),
  applications: z.string().optional(),
  tags: z.string().optional(), // Tags as comma-separated string
  // Multiple images support (up to 3 images including GIF)
  imageUrls: z.array(z.string()).max(3).optional(),
  // Variant fields
  isVariant: z.boolean().default(false),
  parentProductId: z.number().optional(),
  variantType: z.string().optional(),
  variantValue: z.string().optional(),
  // MSDS fields
  msdsUrl: z.string().optional(),
  msdsFileName: z.string().optional(),
  showMsdsToCustomers: z.boolean().optional(),
  // Catalog fields
  pdfCatalogUrl: z.string().optional(),
  catalogFileName: z.string().optional(),
  showCatalogToCustomers: z.boolean().optional(),
  // Shop sync control
  syncWithShop: z.boolean().default(true),
  // Out of stock display control
  showWhenOutOfStock: z.boolean().default(false),
  contractOnly: z.boolean().default(false),
  // Non-chemical product flag
  isNonChemical: z.boolean().default(false),
  // Flammable product flag
  isFlammable: z.boolean().default(false),
  isBulkSale: z.boolean().default(false),
  // Transportation temperature
  transportationTemperature: z.string().optional(),
  // Display Mode fields
  displayMode: z.enum(['images', '3d_model']).default('images'),
  model3dKey: z.string().optional(),
  model3dFileName: z.string().optional(),
  model3dUploadDate: z.string().optional(),
  // Vendor assignment (admin mode only)
  vendorId: z.coerce.number().optional(),
});
import { useToast } from "@/hooks/use-toast";
import { getPersonalizedWelcome, getDashboardMotivation } from "@/utils/greetings";
import { generateEAN13Barcode, validateEAN13 } from "@shared/barcode-utils";

// Categories will be fetched from API

// Inventory status helper functions
const getInventoryStatusColor = (status: string) => {
  switch (status) {
    case 'in_stock':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'low_stock':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'out_of_stock':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'discontinued':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getInventoryStatusIcon = (status: string) => {
  switch (status) {
    case 'in_stock':
      return <CheckCircle className="w-4 h-4" />;
    case 'low_stock':
      return <AlertTriangle className="w-4 h-4" />;
    case 'out_of_stock':
      return <XCircle className="w-4 h-4" />;
    case 'discontinued':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};

// Smart inventory status detection based on actual stock quantities
const getActualInventoryStatus = (stockQuantity: number | null | undefined, minStockLevel: number | null | undefined): string => {
  const stock = stockQuantity || 0;
  const minLevel = minStockLevel || 0;

  if (stock <= 0) return 'out_of_stock';
  if (stock <= minLevel) return 'low_stock';
  return 'in_stock';
};

// Removed - now defined inside component to access translation context

const getStockLevelIndicator = (current: number, min: number, max: number) => {
  const percentage = (current / max) * 100;
  
  if (current === 0) {
    return { color: 'bg-red-500', width: 0, status: 'empty' };
  } else if (current <= min) {
    return { color: 'bg-yellow-500', width: Math.max(percentage, 10), status: 'low' };
  } else if (percentage >= 80) {
    return { color: 'bg-green-500', width: percentage, status: 'high' };
  } else {
    return { color: 'bg-blue-500', width: percentage, status: 'normal' };
  }
};

export default function ProductsPage() {
  const { t, direction,language } = useLanguage();
  
  // Check if vendor mode (from URL path)
  const isVendorMode = window.location.pathname.startsWith('/vendor/');
  
  // Inventory status label helper - uses translation context
  const getInventoryStatusLabel = (status: string) => {
    switch (status) {
      case 'in_stock':
        return t.productManagement.inStock;
      case 'low_stock':
        return t.productManagement.lowStock;
      case 'out_of_stock':
        return t.productManagement.outOfStock;
      case 'discontinued':
        return t.productManagement.discontinued;
      default:
        return t.productManagement.unknown;
    }
  };
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedInventoryStatus, setSelectedInventoryStatus] = useState<string>("all");
  const [selectedVisibilityFilter, setSelectedVisibilityFilter] = useState<string>("all");
  const [editingProduct, setEditingProduct] = useState<ShowcaseProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null); // Legacy single image preview
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]); // Multiple image previews
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0); // Track which image is primary
  const [catalogPreview, setCatalogPreview] = useState<string | null>(null);
  const [msdsPreview, setMsdsPreview] = useState<string | null>(null);
  const [model3dPreview, setModel3dPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false); // Legacy single image upload
  const [uploadingImages, setUploadingImages] = useState<boolean[]>([false, false, false]); // Multiple image uploads
  const [uploadingCatalog, setUploadingCatalog] = useState(false);
  const [uploadingMsds, setUploadingMsds] = useState(false);
  const [uploadingModel3d, setUploadingModel3d] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingProduct, setDeletingProduct] = useState<ShowcaseProduct | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [availableBatches, setAvailableBatches] = useState<Array<{id: number; batchNumber: string; stockQuantity: number}>>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | 'new'>('new');
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const keepDialogOpenAfterUpdateRef = useRef(false);

  useEffect(() => {
    if (!dialogOpen) return;
    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLDetailsElement>('[data-testid^="kardex-section-"]').forEach((section) => {
        section.open = false;
      });
      document.querySelectorAll<HTMLDetailsElement>('details[data-testid^="packaging-section-"], details[data-testid="packaging-editor-panel"]').forEach((section) => {
        section.open = false;
      });
    });
  }, [dialogOpen]);
  
  // Fetch vendor session if in vendor mode
  const { data: vendorSession, isLoading: isLoadingVendorSession } = useQuery<{ vendorId: number; vendorName: string }>({
    queryKey: ["/api/vendors/session"],
    enabled: isVendorMode,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch approved vendors for admin mode (to assign products to vendors)
  type VendorOption = { id: number; vendorName: string };
  const { data: vendorsData } = useQuery<{ vendors: VendorOption[] }>({
    queryKey: ["/api/admin/vendors/approved"],
    enabled: !isVendorMode && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const vendors = vendorsData?.vendors || [];

  // Fetch categories from API
  const { data: categoriesData = [] } = useQuery({
    queryKey: ["/api/admin/categories"],
    queryFn: async () => {
      const response = await fetch("/api/admin/categories");
      if (!response.ok) {
        throw new Error(t.dataLoadFailed);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  type CategoryOption = {
    value: string;
    label: string;
    icon: React.ReactNode;
  };

  // Function to get icon based on category name
  function getIconForCategory(categoryName: string): React.ReactNode {
    const name = categoryName.toLowerCase();
    if (name.includes('water') || name.includes('treatment')) return <Droplet className="w-4 h-4" />;
    if (name.includes('fuel') || name.includes('additive')) return <Beaker className="w-4 h-4" />;
    if (name.includes('paint') || name.includes('solvent')) return <Package className="w-4 h-4" />;
    if (name.includes('fertilizer') || name.includes('agricultural')) return <Package className="w-4 h-4" />;
    if (name.includes('chemical') || name.includes('industrial')) return <Package className="w-4 h-4" />;
    if (name.includes('equipment') || name.includes('technical')) return <Package className="w-4 h-4" />;
    if (name.includes('commercial') || name.includes('goods')) return <Package className="w-4 h-4" />;
    return <Package className="w-4 h-4" />; // Default icon
  }

  // Convert API categories to dropdown options with fallback
  const categories: CategoryOption[] = categoriesData && categoriesData.length > 0 
    ? categoriesData.map((cat: any) => ({
        value: cat.name, // Use the actual category name
        label: cat.name,
        icon: getIconForCategory(cat.name)
      }))
    : [
        // Fallback categories if API fails
        { value: "Water Treatment", label: t.waterTreatment, icon: <Droplet className="w-4 h-4" /> },
        { value: "Fuel Additives", label: t.fuelAdditives, icon: <Beaker className="w-4 h-4" /> },
        { value: "Paint & Solvents", label: t.paintSolvents, icon: <Package className="w-4 h-4" /> },
        { value: "Agricultural Fertilizers", label: t.agriculturalFertilizers, icon: <Package className="w-4 h-4" /> },
        { value: "Industrial Chemicals", label: t.industrialChemicals, icon: <Package className="w-4 h-4" /> },
        { value: "Technical equipment", label: t.technicalEquipment, icon: <Package className="w-4 h-4" /> },
        { value: "Commercial goods", label: t.commercialGoods, icon: <Package className="w-4 h-4" /> },
      ];

  // Use vendor API endpoint when in vendor mode to get only vendor's products
  const productsEndpoint = isVendorMode ? "/api/vendors/products" : "/api/products";
  
  const { data: products, isLoading, refetch } = useQuery<ShowcaseProduct[]>({
    queryKey: [productsEndpoint],
    staleTime: 0, // Always refetch for real-time updates
    gcTime: 0, // Don't cache data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  const mainShopBatch = editingProduct?.barcode
    ? products?.filter(p =>
        p.barcode?.trim() === editingProduct.barcode?.trim() && p.syncWithShop !== false
      ).reduce<ShowcaseProduct | null>((main, p) => !main || p.id < main.id ? p : main, null)
    : null;

  // Force refresh every time component mounts
  useEffect(() => {
    queryClient.removeQueries({ queryKey: [productsEndpoint] });
    refetch();
  }, [refetch, productsEndpoint]);

  // Consolidate products by barcode for batch management
  const consolidateProductsByBarcode = (products: ShowcaseProduct[]) => {
    const barcodeMap = new Map<string, {
      mainProduct: ShowcaseProduct;
      batches: Array<{
        id: number;
        batchNumber: string;
        stockQuantity: number;
        createdAt: Date;
        isActive: boolean;
      }>;
      totalStock: number;
      currentSellingBatch: string;
    }>();

    // Group products by barcode
    for (const product of products) {
      if (!product.barcode) {
        // Products without barcodes are shown individually
        barcodeMap.set(`no-barcode-${product.id}`, {
          mainProduct: product,
          batches: [{
            id: product.id,
            batchNumber: product.batchNumber || t.productManagement.noBarcode,
            stockQuantity: product.stockQuantity || 0,
            createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
            isActive: true
          }],
          totalStock: product.stockQuantity || 0,
          currentSellingBatch: product.batchNumber || t.productManagement.noBarcode
        });
        continue;
      }

      if (!barcodeMap.has(product.barcode)) {
        barcodeMap.set(product.barcode, {
          mainProduct: product,
          batches: [],
          totalStock: 0,
          currentSellingBatch: ''
        });
      }

      const group = barcodeMap.get(product.barcode)!;
      const currentMain = group.mainProduct;
      if (
        (currentMain.syncWithShop === false && product.syncWithShop !== false) ||
        ((currentMain.syncWithShop === false) === (product.syncWithShop === false) && product.id < currentMain.id)
      ) {
        group.mainProduct = product;
      }
      group.batches.push({
        id: product.id,
        batchNumber: product.batchNumber || t.productManagement.noBarcode,
        stockQuantity: product.stockQuantity || 0,
        createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
        isActive: false
      });
      group.totalStock += (product.stockQuantity || 0);
    }

    // Determine active batch for each group (FIFO - oldest with stock > 0)
    for (const [barcode, group] of Array.from(barcodeMap.entries())) {
      // Sort batches by creation date (oldest first - FIFO)
      group.batches.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Find the first batch with stock > 0 (oldest = FIFO)
      const activeBatch = group.batches.find(batch => batch.stockQuantity > 0);
      
      if (activeBatch) {
        activeBatch.isActive = true;
        group.currentSellingBatch = activeBatch.batchNumber;
      }
    }

    return Array.from(barcodeMap.values());
  };

  // Immediate Kardex sync function
  const triggerKardexSync = async () => {
    try {
      console.log("🔄 [INSTANT-SYNC] Triggering immediate kardex synchronization...");
      await apiRequest("/api/kardex/sync", { method: "POST" });
      console.log("✅ [INSTANT-SYNC] Kardex synchronization completed");
    } catch (error) {
      console.log("⚠️ [INSTANT-SYNC] Kardex sync failed:", error);
    }
  };

  // Delete batch function
  const handleDeleteBatch = async (batchId: number, batchNumber: string) => {
    if (!confirm(t.productManagement.confirmBatchDelete.replace('{batchNumber}', batchNumber))) {
      return;
    }

    try {
      console.log(`🗑️ [DELETE-BATCH] Deleting batch ${batchNumber} (ID: ${batchId})`);
      
      await apiRequest(`/api/batches/${batchId}`, { 
        method: "DELETE" 
      });
      
      toast({
        title: t.productManagement.batchDeleted,
        description: t.productManagement.batchDeletedDesc.replace('{batchNumber}', batchNumber),
      });

      // Refresh products list
      queryClient.invalidateQueries({ queryKey: [productsEndpoint] });
      
    } catch (error: any) {
      console.error("❌ [DELETE-BATCH] Error deleting batch:", error);
      toast({
        title: t.productManagement.batchDeleteError,
        description: error?.message || t.productManagement.batchDeleteErrorDesc,
        variant: "destructive",
      });
    }
  };

  const { mutate: createProduct } = useMutation({
    mutationFn: (data: any) => {
      setIsSubmitting(true);
      // Use vendor API endpoint when in vendor mode
      const endpoint = isVendorMode ? "/api/vendors/products" : "/api/products";
      return apiRequest(endpoint, { method: "POST", body: data });
    },
    onSuccess: async () => {
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: [productsEndpoint] });
      setDialogOpen(false);
      setImagePreview(null);
      setImagePreviews([null, null, null]); // Reset multiple image previews
      setCatalogPreview(null);
      setMsdsPreview(null);
      form.reset();
      toast({
        title: t.productManagement.productUpdated,
        description: t.productManagement.productUpdated,
      });
      // Immediate kardex sync after product creation
      await triggerKardexSync();
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: t.productManagement.productUpdateError,
        description: error.message || t.productManagement.productUpdateError,
        variant: "destructive",
      });
    },
  });

  const { mutate: updateProduct } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      setIsSubmitting(true);
      // Use vendor API endpoint when in vendor mode
      const endpoint = isVendorMode ? `/api/vendors/products/${id}` : `/api/products/${id}`;
      const method = isVendorMode ? "PATCH" : "PUT";
      const result = await apiRequest(endpoint, { method, body: data });
      if (result?.success === false) throw new Error(result.message || t.productManagement.productUpdateError);
      return result;
    },
    onSuccess: async (result, variables) => {
      console.log('✅ [DEBUG] Update mutation successful, result:', result);
      setIsSubmitting(false);
      keepDialogOpenAfterUpdateRef.current = false;

      // Every successful product update closes and clears the form.
      setDialogOpen(false);
      setEditingProduct(null);
      setImagePreview(null);
      setImagePreviews([null, null, null]);
      form.reset();
      
      // Refresh products list to ensure UI is in sync
      queryClient.invalidateQueries({ queryKey: [productsEndpoint] });
      
      const weightChanged = ['netWeight', 'grossWeight', 'weightUnit']
        .some(field => variables.data[field] !== undefined);
      toast(weightChanged && result?.shopWeightUpdated !== true
        ? { title: t.productManagement.shopWeightSyncFailed, variant: "destructive" }
        : { title: t.productManagement.productUpdated, description: t.productManagement.productUpdated });
      // Immediate kardex sync after product update
      await triggerKardexSync();
    },
    onError: (error: any) => {
      console.error('❌ [DEBUG] Update mutation failed:', error);
      setIsSubmitting(false);
      keepDialogOpenAfterUpdateRef.current = false;
      
      // Show user-friendly error message
      let errorMessage = t.productManagement.productUpdateError;
      if (error.message?.includes("already exists")) {
        errorMessage = t.productManagement.duplicateSKU;
      } else if (error.message?.includes("authentication") || error.message?.includes("احراز هویت")) {
        errorMessage = t.productManagement.productUpdateError;
      }
      
      toast({
        title: t.productManagement.productUpdateError,
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteProduct } = useMutation({
    mutationFn: (id: number) => {
      console.log(`🗑️ [DELETE] Starting delete for product ID: ${id}`);
      return apiRequest(`/api/products/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      console.log(`✅ [DELETE] Product deleted successfully`);
      queryClient.invalidateQueries({ queryKey: [productsEndpoint] });
      setDeletingProduct(null); // Close the confirmation dialog
      toast({
        title: t.productManagement.productDeleted,
        description: t.productManagement.productDeleted,
      });
      // Immediate kardex sync after product deletion
      await triggerKardexSync();
    },
    onError: (error: any) => {
      console.error(`❌ [DELETE] Delete failed:`, error);
      setDeletingProduct(null); // Close the confirmation dialog
      toast({
        title: t.productManagement.productDeleteError,
        description: error.message || t.productManagement.productDeleteError,
        variant: "destructive",
      });
    },
  });

  // Handle delete product with confirmation
  const handleDeleteProduct = (product: ShowcaseProduct) => {
    console.log(`🗑️ [DELETE] Opening delete confirmation for product:`, product.name);
    setDeletingProduct(product);
  };

  // Confirm delete product
  const confirmDeleteProduct = () => {
    if (deletingProduct) {
      console.log(`🗑️ [DELETE] Confirming delete for product:`, deletingProduct.name, `ID: ${deletingProduct.id}`);
      deleteProduct(deletingProduct.id);
    } else {
      console.warn(`⚠️ [DELETE] No product selected for deletion`);
    }
  };

  // Quick sync toggle mutation
  const { mutate: toggleSync } = useMutation({
    mutationFn: ({ id, syncWithShop }: { id: number; syncWithShop: boolean }) => {
      console.log(`🔄 [DEBUG] Toggling syncWithShop for product ${id} to:`, syncWithShop);
      return apiRequest(`/api/products/${id}`, { method: "PUT", body: { syncWithShop } });
    },
    onSuccess: (result) => {
      console.log('✅ [DEBUG] Toggle sync successful:', result);
      queryClient.invalidateQueries({ queryKey: [productsEndpoint] });
      toast({
        title: t.productManagement.productUpdated,
        description: t.productManagement.productUpdated,
      });
    },
    onError: (error: any) => {
      console.error('❌ [DEBUG] Toggle sync failed:', error);
      toast({
        title: t.productManagement.productUpdateError,
        description: error.message || t.productManagement.productUpdateError,
        variant: "destructive",
      });
    },
  });

  // AI SKU Generation Mutation
  const generateSKUMutation = useMutation({
    mutationFn: (productData: any) => apiRequest("/api/products/generate-sku", { method: "POST", body: productData }),
    onSuccess: (result) => {
      form.setValue("sku", result.data.sku);
      toast({
        title: t.productManagement.productUpdated,
        description: `SKU: ${result.data.sku}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.productManagement.productUpdateError,
        description: error.message || t.productManagement.productUpdateError,
        variant: "destructive",
      });
    },
  });

  const generateSmartSKU = () => {
    const formValues = form.getValues();
    const productData = {
      name: formValues.name,
      category: formValues.category,
      description: formValues.description,
      specifications: formValues.specifications,
      features: formValues.features,
      applications: formValues.applications,
      unitPrice: formValues.unitPrice,
      stockUnit: formValues.stockUnit,
      supplier: formValues.supplier,
      variantType: formValues.variantType,
      variantValue: formValues.variantValue
    };

    if (!productData.name || !productData.category) {
      toast({
        title: t.productManagement.enterNameCategory,
        description: t.productManagement.enterNameCategory,
        variant: "destructive",
      });
      return;
    }

    generateSKUMutation.mutate(productData);
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      shortDescription: "",
      priceRange: "",
      imageUrl: "", // Legacy single image field
      imageUrls: [], // Multiple images array
      specifications: "",
      features: "",
      applications: "",
      barcode: "",
      sku: "",
      stockQuantity: 0,
      minStockLevel: 0,
      maxStockLevel: 0,
      unitPrice: 0,
      currency: "IQD",
      isActive: true,
      // Fields that caused controlled/uncontrolled warnings
      technicalName: "",
      weight: "",
      stockUnit: "",
      netWeight: 0,
      grossWeight: 0,
      weightUnit: "kg",
      packagingSpecifications: null,
      batchNumber: "",
      tags: "",
      // Variant fields
      isVariant: false,
      parentProductId: undefined,
      variantType: "",
      variantValue: "",
      // MSDS fields
      msdsUrl: "",
      msdsFileName: "",
      showMsdsToCustomers: false,
      // Catalog fields
      pdfCatalogUrl: "",
      catalogFileName: "",
      showCatalogToCustomers: false,
      // Shop visibility control
      syncWithShop: true,
      showWhenOutOfStock: false,
      contractOnly: false,
      // Non-chemical product flag
      isNonChemical: false,
      // Flammable product flag
      isFlammable: false,
      isBulkSale: false,
      // Transportation temperature
      transportationTemperature: "none",
      // Display Mode fields
      displayMode: "images" as const,
      model3dKey: "",
      model3dFileName: "",
      model3dUploadDate: "",
      // New inventory addition fields
      inventoryAddition: 0,
      newBatchNumber: "",
    },
  });

  // Always show original product images - even when adding new batch
  const displayImageUrls = useMemo(() => {
    if (editingProduct) {
      return Array.isArray(editingProduct.imageUrls) ? 
        editingProduct.imageUrls : 
        (editingProduct.imageUrl ? [editingProduct.imageUrl] : []);
    }
    return [];
  }, [editingProduct]);

  const displayImagePreviews = useMemo(() => {
    const previews: (string | null)[] = [null, null, null];
    displayImageUrls.forEach((url: string, index: number) => {
      if (index < 3) previews[index] = url;
    });
    return previews;
  }, [displayImageUrls]);

  const displayPrimaryImageIndex = useMemo(() => {
    if (editingProduct?.imageUrl && displayImageUrls.includes(editingProduct.imageUrl)) {
      return displayImageUrls.indexOf(editingProduct.imageUrl);
    }
    return 0;
  }, [editingProduct?.imageUrl, displayImageUrls]);

  // Function to validate fields and set errors
  const validateRequiredFields = (data: z.infer<typeof formSchema>) => {
    const errors: Record<string, string> = {};
    
    // Validate category - MUST be selected
    if (!data.category?.trim()) errors.category = t.productManagement.categoryRequired;
    
    // Validate Pricing & Inventory section
    if (!data.sku?.trim()) errors.sku = t.productManagement.barcodeRequired;
    if (!data.barcode?.trim()) errors.barcode = t.productManagement.barcodeRequired;
    if (!data.unitPrice || Number(data.unitPrice) <= 0) errors.unitPrice = t.productManagement.unitPriceRequired;
    if (data.stockQuantity === undefined || data.stockQuantity === null || Number(data.stockQuantity) < 0) errors.stockQuantity = t.productManagement.stockRequired;
    if (data.minStockLevel === undefined || data.minStockLevel === null || Number(data.minStockLevel) < 0) errors.minStockLevel = t.productManagement.minStockRequired;
    if (data.maxStockLevel === undefined || data.maxStockLevel === null || Number(data.maxStockLevel) < 0) errors.maxStockLevel = t.productManagement.maxStockRequired;
    
    // Check if this is a batch addition
    const isBatchAddition = data.inventoryAddition && Number(data.inventoryAddition) > 0 && data.newBatchNumber?.trim();
    
    // Check if this is editing an existing product (read-only weights)
    const isEditingExistingProduct = !!editingProduct;
    
    // Validate Weights & Batch section - only for NEW products, skip for non-chemical products, batch additions, and existing product edits
    if (!data.isNonChemical && !isBatchAddition && !isEditingExistingProduct) {
      if (!data.netWeight || Number(data.netWeight) <= 0) errors.netWeight = t.productManagement.netWeightRequired;
    }
    
    // For chemical products, if there's inventory addition AND creating NEW batch, batch number is required
    if (!data.isNonChemical && data.inventoryAddition && Number(data.inventoryAddition) > 0 && selectedBatchId === 'new') {
      if (!data.newBatchNumber?.trim()) {
        errors.newBatchNumber = t.productManagement.newBatchNumberRequired;
      }
    }
    
    // Gross weight is required for NEW products only - skip batch additions and existing product edits
    if (!isBatchAddition && !isEditingExistingProduct && (!data.grossWeight || Number(data.grossWeight) <= 0)) {
      errors.grossWeight = t.productManagement.grossWeightRequired;
    }
    
    // Logical consistency validation (only if both weights exist)
    if (data.grossWeight && data.netWeight && Number(data.grossWeight) < Number(data.netWeight)) {
      errors.grossWeight = t.productManagement.grossWeightMinError;
    }
    
    if (data.minStockLevel && data.maxStockLevel && Number(data.minStockLevel) > Number(data.maxStockLevel)) {
      errors.minStockLevel = t.productManagement.minMaxStockError;
    }
    
    return errors;
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log('🔍 [DEBUG] Form submission - Raw form data:', data);
    console.log('🔍 [DEBUG] Tags in form data:', data.tags, 'Type:', typeof data.tags);
    console.log('🔍 [DEBUG] Description in form data:', data.description);
    console.log('🔍 [DEBUG] editingProduct state:', editingProduct?.id);

    // Check if this is a batch addition for processing
    // Only consider it a new batch if selectedBatchId is 'new'
    const isBatchAddition = data.inventoryAddition && Number(data.inventoryAddition) > 0 && selectedBatchId === 'new' && data.newBatchNumber?.trim();

    // Complete validation for both create and update operations
    const errors = validateRequiredFields(data);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      revealKardexSectionForField(Object.keys(errors)[0]);
      keepDialogOpenAfterUpdateRef.current = false;
      toast({
        title: t.productManagement.enterNameCategory,
        description: t.productManagement.enterNameCategory,
        variant: "destructive",
      });
      return;
    }
    
    // Unchanged legacy weights may be empty; do not clear them during unrelated edits.
    const { netWeight: _netWeight, grossWeight: _grossWeight, weightUnit: _weightUnit, ...dataWithoutWeights } = data;
    const dirtyWeights = form.formState.dirtyFields;
    // Convert numeric fields to strings for API compatibility
    const processedData = {
      ...dataWithoutWeights,
      unitPrice: data.unitPrice ? data.unitPrice.toString() : "0",
      stockQuantity: Number(data.stockQuantity) || 0,
      minStockLevel: Number(data.minStockLevel) || 0,
      maxStockLevel: Number(data.maxStockLevel) || 0,
      // For batch additions, keep weight fields but preserve image fields
      ...(!editingProduct || dirtyWeights.netWeight
        ? { netWeight: isBatchAddition ? null : (data.netWeight ? data.netWeight.toString() : null) }
        : {}),
      ...(!editingProduct || dirtyWeights.grossWeight
        ? { grossWeight: isBatchAddition ? null : (data.grossWeight ? data.grossWeight.toString() : null) }
        : {}),
      ...(!editingProduct || dirtyWeights.weightUnit
        ? { weightUnit: data.weightUnit }
        : {}),
      imageUrl: data.imageUrl, // Always include images (whether batch addition or not)
      imageUrls: data.imageUrls, // Always include images (whether batch addition or not)
      batchNumber: selectedBatchId === 'new'
        ? (data.newBatchNumber?.trim() || null)
        : (data.batchNumber?.trim() || editingProduct?.batchNumber || null),
      // New inventory addition fields
      inventoryAddition: Number(data.inventoryAddition) || 0,
      // This edit applies to the Kardex product; newly inserted batch rows use
      // the database default and shop sync reads the base product's restriction.
      contractOnly: data.contractOnly,
      // CRITICAL: Only send newBatchNumber if creating a NEW batch, not updating existing one
      newBatchNumber: (selectedBatchId === 'new' && data.newBatchNumber?.trim()) ? data.newBatchNumber.trim() : null,
      // Auto-inject vendorId if in vendor mode
      vendorId: isVendorMode && vendorSession ? vendorSession.vendorId : (data as any).vendorId,
      // Convert string fields to arrays for backend compatibility
      features: typeof data.features === 'string' && data.features.trim() 
        ? data.features.split('\n').map(f => f.trim()).filter(f => f.length > 0)
        : [],
      applications: typeof data.applications === 'string' && data.applications.trim()
        ? data.applications.split('\n').map(a => a.trim()).filter(a => a.length > 0)
        : [],
      tags: typeof data.tags === 'string' && data.tags.trim()
        ? data.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : [t.productManagement.chemical],
      // Handle specifications - try to parse as JSON if possible, otherwise keep as string
      specifications: (() => {
        if (!data.specifications || typeof data.specifications !== 'string') return {};
        const trimmed = data.specifications.trim();
        if (!trimmed) return {};
        
        try {
          return JSON.parse(trimmed);
        } catch {
          // If not valid JSON, return as string
          return trimmed;
        }
      })(),
    };
    
    console.log('🚀 [DEBUG] Final processed data being sent to API:', JSON.stringify(processedData, null, 2));
    
    if (editingProduct) {
      console.log('📝 [DEBUG] Calling updateProduct with ID:', editingProduct.id);
      console.log('📝 [DEBUG] updateProduct function exists:', typeof updateProduct);
      updateProduct({ id: editingProduct.id, data: processedData });
    } else {
      console.log('➕ [DEBUG] Calling createProduct');
      console.log('➕ [DEBUG] createProduct function exists:', typeof createProduct);
      createProduct(processedData);
    }
  };

  const applyStockWithoutClosing = form.handleSubmit(
    (data) => {
      const amount = Number(data.inventoryAddition) || 0;
      if (!editingProduct || amount <= 0) {
        toast({
          title: t.productManagement.addStock,
          description: t.productManagement.stockAdditionHelp,
          variant: "destructive",
        });
        return;
      }
      keepDialogOpenAfterUpdateRef.current = true;
      onSubmit(data);
    },
    (errors) => {
      keepDialogOpenAfterUpdateRef.current = false;
      const firstError = Object.keys(errors)[0];
      if (firstError) revealKardexSectionForField(firstError);
    }
  );

  const persistUploadedFields = async (fields: Partial<ShowcaseProduct>) => {
    if (!editingProduct?.id) return;

    const endpoint = isVendorMode
      ? `/api/vendors/products/${editingProduct.id}`
      : `/api/products/${editingProduct.id}`;

    await apiRequest(endpoint, { method: "PATCH", body: fields });
    setEditingProduct((current) => current ? { ...current, ...fields } : current);
    await queryClient.invalidateQueries({ queryKey: [productsEndpoint] });
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t.productManagement.fileTooLargeTitle,
        description: t.productManagement.imageTooLargeDesc,
        variant: "destructive",
      });
      return;
    }

    // Validate file format
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t.productManagement.invalidFormat,
        description: t.productManagement.invalidImageFormatDesc,
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t.productManagement.uploadFailed);
      }

      const { url } = await response.json();
      form.setValue('imageUrl', url);
      setImagePreview(url);
      await persistUploadedFields({ imageUrl: url });
      
      toast({
        title: t.productManagement.success,
        description: t.productManagement.imageUploadSuccess,
      });
    } catch (error) {
      toast({
        title: t.productManagement.uploadErrorTitle,
        description: error instanceof Error ? error.message : t.productManagement.imageUploadFailed,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Multiple image upload handler (supports up to 3 images including GIF)
  const handleMultipleImageUpload = async (file: File, index: number) => {
    if (!file || index < 0 || index > 2) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t.productManagement.fileTooLargeTitle,
        description: t.productManagement.imageTooLargeDesc,
        variant: "destructive",
      });
      return;
    }

    // Validate file format - now includes GIF support
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t.productManagement.invalidFormat,
        description: t.productManagement.invalidImageFormatsDesc,
        variant: "destructive",
      });
      return;
    }

    // Set uploading state for specific index
    const newUploadingImages = [...uploadingImages];
    newUploadingImages[index] = true;
    setUploadingImages(newUploadingImages);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t.productManagement.uploadFailed);
      }

      const { url } = await response.json();
      
      // Update image previews
      const newPreviews = [...imagePreviews];
      newPreviews[index] = url;
      setImagePreviews(newPreviews);
      
      // Update form imageUrls array
      const currentUrls = form.getValues('imageUrls') || [];
      const newUrls = [...currentUrls];
      newUrls[index] = url;
      // Remove empty strings and update form
      const savedUrls = newUrls.filter(url => url);
      form.setValue('imageUrls', savedUrls);
      
      // Update legacy imageUrl field with primary image for backward compatibility
      const primaryImageUrl = index === primaryImageIndex
        ? url
        : form.getValues('imageUrl');
      if (index === primaryImageIndex) {
        form.setValue('imageUrl', url);
        setImagePreview(url);
        console.log('Set primary image URL:', url, 'at index:', index);
      }
      await persistUploadedFields({
        imageUrls: savedUrls,
        ...(primaryImageUrl ? { imageUrl: primaryImageUrl } : {}),
      });
      
      toast({
        title: t.productManagement.imageUploaded.replace('{index}', String(index + 1)),
        description: t.productManagement.imageUploaded.replace('{index}', String(index + 1)),
      });
    } catch (error) {
      toast({
        title: t.productManagement.imageUploadError,
        description: error instanceof Error ? error.message : t.productManagement.imageUploadError,
        variant: "destructive",
      });
    } finally {
      // Reset uploading state
      const newUploadingImages = [...uploadingImages];
      newUploadingImages[index] = false;
      setUploadingImages(newUploadingImages);
    }
  };

  const handleCatalogUpload = async (file: File) => {
    if (!file) return;

    setUploadingCatalog(true);
    const formData = new FormData();
    formData.append('catalog', file);

    try {
      const response = await fetch('/api/upload/catalog', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(t.productManagement.uploadFailed);
      }

      const { url, originalName } = await response.json();
      form.setValue('pdfCatalogUrl', url);
      form.setValue('catalogFileName', originalName);
      setCatalogPreview(url);
      await persistUploadedFields({
        pdfCatalogUrl: url,
        catalogFileName: originalName,
      });
      
      toast({
        title: t.productManagement.productUpdated,
        description: t.productManagement.productUpdated,
      });
    } catch (error) {
      toast({
        title: t.productManagement.productUpdateError,
        description: t.productManagement.productUpdateError,
        variant: "destructive",
      });
    } finally {
      setUploadingCatalog(false);
    }
  };

  const handleMsdsUpload = async (file: File) => {
    if (!file) return;

    setUploadingMsds(true);
    const formData = new FormData();
    formData.append('msds', file);

    try {
      const response = await fetch('/api/upload/msds', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(t.productManagement.uploadFailed);
      }

      const { url, originalName } = await response.json();
      form.setValue('msdsUrl', url);
      form.setValue('msdsFileName', originalName);
      setMsdsPreview(url);
      await persistUploadedFields({
        msdsUrl: url,
        msdsFileName: originalName,
      });
      
      toast({
        title: t.productManagement.productUpdated,
        description: t.productManagement.productUpdated,
      });
    } catch (error) {
      toast({
        title: t.productManagement.productUpdateError,
        description: t.productManagement.productUpdateError,
        variant: "destructive",
      });
    } finally {
      setUploadingMsds(false);
    }
  };

  const handleModel3dUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'];
    const validExtensions = ['.glb', '.gltf'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: t.productManagement.invalidFormat,
        description: t.productManagement.invalidModel3dFormat,
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t.productManagement.fileTooLarge,
        description: t.productManagement.model3dTooLarge,
        variant: "destructive",
      });
      return;
    }

    setUploadingModel3d(true);
    const formData = new FormData();
    formData.append('model3d', file);

    try {
      const response = await fetch('/api/upload/model3d', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(t.productManagement.uploadFailed);
      }

      const { key, originalName } = await response.json();
      const model3dUploadDate = new Date();
      const displayMode = '3d_model' as const;
      form.setValue('model3dKey', key);
      form.setValue('model3dFileName', originalName);
      form.setValue('model3dUploadDate', model3dUploadDate.toISOString());
      form.setValue('displayMode', displayMode);
      setModel3dPreview(key);
      await persistUploadedFields({
        model3dKey: key,
        model3dFileName: originalName,
        model3dUploadDate,
        displayMode,
      });
      
      toast({
        title: t.productManagement.success,
        description: t.productManagement.model3dUploaded,
      });
    } catch (error) {
      toast({
        title: t.productManagement.uploadError,
        description: t.productManagement.uploadFailed,
        variant: "destructive",
      });
    } finally {
      setUploadingModel3d(false);
    }
  };



  const openCreateDialog = () => {
    setEditingProduct(null);
    setImagePreview(null);
    setImagePreviews([null, null, null]); // Reset multiple image previews
    setPrimaryImageIndex(0); // Reset primary image to first
    setCatalogPreview(null);
    setMsdsPreview(null);
    setModel3dPreview(null);
    setManualBarcodeEntered(false); // Reset manual barcode flag
    form.reset();
    setDialogOpen(true);
  };

  const openEditDialog = async (product: ShowcaseProduct) => {
    setEditingProduct(product);
    setValidationErrors({}); // Clear validation errors
    setManualBarcodeEntered(false); // Reset manual barcode flag
    setCatalogPreview(product.pdfCatalogUrl || null);
    setMsdsPreview(product.msdsUrl || null);
    
    // Auto-fix legacy URL values in model3dKey (should be key only, not full URL)
    let model3dKeyValue = product.model3dKey || null;
    if (model3dKeyValue && (model3dKeyValue.startsWith('http') || model3dKeyValue.includes('/uploads/3d-models/'))) {
      // Extract just the filename from URL
      const parts = model3dKeyValue.split('/');
      model3dKeyValue = parts[parts.length - 1];
    }
    setModel3dPreview(model3dKeyValue);
    
    // Fetch all products with same barcode (different batches)
    if (product.barcode && products) {
      const sameBarcodeProducts = products.filter(p => p.barcode === product.barcode);
      const batchList = sameBarcodeProducts.map(p => ({
        id: p.id,
        batchNumber: p.batchNumber || `ID-${p.id}`,
        stockQuantity: p.stockQuantity || 0
      }));
      setAvailableBatches(batchList);
      setSelectedBatchId(product.id);
      console.log(`📦 Found ${batchList.length} batches for barcode ${product.barcode}`);
    } else {
      setAvailableBatches([]);
      setSelectedBatchId('new');
    }
    
    // Calculate total stock quantity across all batches for this product
    const totalStockQuantity = products && product.barcode 
      ? products
          .filter(p => p.barcode === product.barcode)
          .reduce((total, p) => total + (Number(p.stockQuantity) || 0), 0)
      : Number(product.stockQuantity) || 0;
    
    // Prepare image data BEFORE form reset
    const existingImageUrls = Array.isArray(product.imageUrls) ? product.imageUrls : (product.imageUrl ? [product.imageUrl] : []);
    
    form.reset({
      name: product.name,
      description: product.description || "",
      category: product.category,
      shortDescription: product.shortDescription || "",
      features: Array.isArray(product.features) ? product.features.join('\n') : String(product.features || ""),
      applications: Array.isArray(product.applications) ? product.applications.join('\n') : String(product.applications || ""),
      specifications: typeof product.specifications === 'object' && product.specifications !== null ? JSON.stringify(product.specifications, null, 2) : String(product.specifications || ""),
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : String(product.tags || ""),
      barcode: product.barcode || "",
      sku: product.sku || "",
      stockQuantity: totalStockQuantity,
      minStockLevel: Number(product.minStockLevel) ?? 0,
      maxStockLevel: Number(product.maxStockLevel) ?? 0,
      unitPrice: Number(product.unitPrice || 0),
      currency: product.currency || "IQD",
      priceRange: product.priceRange || "",
      weight: product.weight || "",
      weightUnit: product.weightUnit || "kg",
      packagingSpecifications: product.packagingSpecifications ?? null,
      netWeight: Number(product.netWeight) || 0,
      grossWeight: Number(product.grossWeight) || 0,
      batchNumber: product.batchNumber || "",
      imageUrl: product.imageUrl || "", // Legacy single image field
      imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls : (product.imageUrl ? [product.imageUrl] : []), // Multiple images array
      pdfCatalogUrl: product.pdfCatalogUrl || "",
      msdsUrl: product.msdsUrl || "",
      msdsFileName: product.msdsFileName || "",
      showMsdsToCustomers: product.showMsdsToCustomers || false,
      catalogFileName: (product as any).catalogFileName || "",
      showCatalogToCustomers: product.showCatalogToCustomers || false,
      displayMode: (product.displayMode as "images" | "3d_model") || "images",
      model3dKey: model3dKeyValue || "",
      model3dFileName: product.model3dFileName || "",
      syncWithShop: product.syncWithShop !== null && product.syncWithShop !== undefined ? product.syncWithShop : true,
      showWhenOutOfStock: product.showWhenOutOfStock ?? false,
      contractOnly: product.contractOnly ?? false,
      isNonChemical: product.isNonChemical ?? false,
      isFlammable: product.isFlammable ?? false,
      isBulkSale: product.isBulkSale ?? false,
      transportationTemperature: product.transportationTemperature || "",
      isActive: product.isActive !== false,
    });
    
    // Set image previews AFTER form reset - always reset when opening any product
    // This ensures batch switches show correct images for the selected batch
    setImagePreview(product.imageUrl || null);
    const newPreviews: (string | null)[] = [null, null, null];
    existingImageUrls.forEach((url: string, index: number) => {
      if (index < 3) newPreviews[index] = url;
    });
    setImagePreviews(newPreviews);
    
    // Set primary image index based on legacy imageUrl or default to 0
    let primaryIndex = 0;
    if (product.imageUrl && existingImageUrls.includes(product.imageUrl)) {
      primaryIndex = existingImageUrls.indexOf(product.imageUrl);
    }
    setPrimaryImageIndex(primaryIndex);
    
    setDialogOpen(true);
  };

  // Handle batch selection change
  const handleBatchChange = async (batchIdOrNew: string) => {
    if (batchIdOrNew === 'new') {
      setSelectedBatchId('new');
      // Reset form for new batch creation - clear the batch number field
      form.setValue('newBatchNumber', '');
      form.setValue('inventoryAddition', 0);
      return;
    }

    const batchId = parseInt(batchIdOrNew);
    setSelectedBatchId(batchId);

    // Find and load the selected batch product
    const selectedBatch = products?.find(p => p.id === batchId);
    if (selectedBatch) {
      // Load the batch product data into the form
      openEditDialog(selectedBatch);
      // For existing batch, show batch number but don't set newBatchNumber
      // This way backend knows to add to existing stock instead of creating new batch
      form.setValue('newBatchNumber', ''); // Clear this so backend adds to existing
      form.setValue('inventoryAddition', 0); // Reset addition field
    }
  };

  // Get consolidated products by barcode
  const consolidatedProducts = (products ? consolidateProductsByBarcode(products) : []).filter(
    ({ mainProduct }) => !isVendorMode || !vendorSession || mainProduct.vendorId === vendorSession.vendorId
  );
  const formatProductCount = (count: number) => new Intl.NumberFormat(language).format(count);
  const inventoryCounts = {
    in_stock: consolidatedProducts.filter(group => getActualInventoryStatus(group.totalStock, group.mainProduct.minStockLevel) === "in_stock").length,
    low_stock: consolidatedProducts.filter(group => getActualInventoryStatus(group.totalStock, group.mainProduct.minStockLevel) === "low_stock").length,
    out_of_stock: consolidatedProducts.filter(group => getActualInventoryStatus(group.totalStock, group.mainProduct.minStockLevel) === "out_of_stock").length,
    hidden: consolidatedProducts.filter(group => group.mainProduct.syncWithShop === false).length,
  };

  // Filter consolidated products based on category, inventory status, visibility, search, and vendor
  const filteredProducts = consolidatedProducts.filter((productGroup) => {
    const product = productGroup.mainProduct;
    
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check inventory status based on total stock
    const inventoryStatus = getActualInventoryStatus(productGroup.totalStock, product.minStockLevel);
    const matchesInventoryStatus = selectedInventoryStatus === "all" || inventoryStatus === selectedInventoryStatus;
    
    // Check visibility status
    const matchesVisibility = selectedVisibilityFilter === "all" || 
      (selectedVisibilityFilter === "hidden" && product.syncWithShop === false) ||
      (selectedVisibilityFilter === "visible" && product.syncWithShop !== false);
    
    return matchesCategory && matchesSearch && matchesInventoryStatus && matchesVisibility;
  });

  // State to track if barcode was manually entered
  const [manualBarcodeEntered, setManualBarcodeEntered] = useState(false);

  // Auto-generate barcode for new products when name and category are available
  useEffect(() => {
    const productName = form.watch("name");
    const category = form.watch("category");
    const currentBarcode = form.watch("barcode");
    
    // Auto-generate barcode only if:
    // 1. Product name and category exist
    // 2. No current barcode exists
    // 3. Not editing an existing product
    // 4. Barcode was not manually entered by user
    if (productName && category && !currentBarcode && !editingProduct && !manualBarcodeEntered) {
      const autoGenerateBarcode = async () => {
        try {
          const generatedBarcode = await generateEAN13Barcode(productName, category);
          form.setValue("barcode", generatedBarcode);
          
          toast({
            title: t.productManagement.barcodeGenerated,
            description: t.productManagement.barcodeGeneratedDesc.replace('{barcode}', generatedBarcode),
            variant: "default"
          });
        } catch (error) {
          console.error('Auto-generate barcode error:', error);
        }
      };
      
      autoGenerateBarcode();
    }
  }, [form.watch("name"), form.watch("category"), editingProduct, manualBarcodeEntered]);

  // Generate barcode image when barcode value changes or dialog opens
  useEffect(() => {
    const currentBarcode = form.watch("barcode");
    console.log('Barcode effect triggered:', currentBarcode, 'Canvas ref:', barcodeCanvasRef.current);
    
    // Wait for next tick to ensure DOM is updated
    const timer = setTimeout(() => {
      if (currentBarcode && currentBarcode.length === 13 && barcodeCanvasRef.current) {
        try {
          console.log('Attempting to generate barcode:', currentBarcode);
          
          // Clear canvas first and set dimensions
          const canvas = barcodeCanvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          
          canvas.width = 200;
          canvas.height = 100;
          
          // Only generate EAN-13 format barcodes
          JsBarcode(canvas, currentBarcode, {
            format: "EAN13",
            width: 2,
            height: 80,
            displayValue: false, // We'll show the number separately
            fontSize: 12,
            textMargin: 5,
            marginTop: 5,
            marginBottom: 5,
            marginLeft: 5,
            marginRight: 5,
          });
          console.log('EAN-13 barcode generated successfully');
        } catch (error) {
          console.error('EAN-13 barcode generation error:', error);
        }
      } else if (barcodeCanvasRef.current) {
        // Clear canvas if no valid barcode
        const ctx = barcodeCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, barcodeCanvasRef.current.width, barcodeCanvasRef.current.height);
        }
      }
    }, 200); // Increased timeout for better DOM readiness
    
    return () => clearTimeout(timer);
  }, [form.watch("barcode"), dialogOpen]); // Added dialogOpen dependency

  // Redirect if not authenticated (admin or vendor)
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isVendorMode) {
      setLocation("/admin/login");
    }
    if (isVendorMode && !isLoadingVendorSession && !vendorSession) {
      setLocation("/vendor/login");
    }
  }, [authLoading, isAuthenticated, isVendorMode, vendorSession, isLoadingVendorSession, setLocation]);

  if (authLoading || (isVendorMode && isLoadingVendorSession)) {
    return <div className="flex items-center justify-center min-h-screen">{t.loading}</div>;
  }

  // Allow both admin and vendor access
  if (!isAuthenticated && !isVendorMode) {
    return null;
  }
  
  if (isVendorMode && !vendorSession) {
    return null;
  }

  return (
    <div dir={direction} className="container mx-auto p-6 space-y-8 bg-white dark:bg-gray-900 min-h-screen">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {user?.id === 1 && (
              <Button
                variant="outline"
                onClick={() => setLocation("/admin")}
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4 me-2" />
                {t.productManagement.backToAdmin}
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.productManagement.pageTitle}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{t.productManagement.pageSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span className="text-sm">{user?.username}</span>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                logout();
                setLocation("/admin/login");
              }}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 me-2" />
              {t.productManagement.logout}
            </Button>
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t.productManagement.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 pe-4 py-2"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={t.productManagement.clearSearch}
                className="absolute end-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {(selectedInventoryStatus !== "all" || selectedCategory !== "all" || selectedVisibilityFilter !== "all" || searchQuery) && (
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700">{t.productManagement.activeFilters}</span>
            {selectedInventoryStatus !== "all" && (
              <Badge variant="secondary" className="cursor-pointer hover:bg-gray-300" onClick={() => setSelectedInventoryStatus("all")}>
                {t.productManagement.statusLabel}: {getInventoryStatusLabel(selectedInventoryStatus)}
                <X className="w-3 h-3 ms-1" />
              </Badge>
            )}
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="cursor-pointer hover:bg-gray-300" onClick={() => setSelectedCategory("all")}>
                {t.productManagement.categoryLabel}: {categories.find(c => c.value === selectedCategory)?.label || selectedCategory}
                <X className="w-3 h-3 ms-1" />
              </Badge>
            )}
            {selectedVisibilityFilter !== "all" && (
              <Badge variant="secondary" className="cursor-pointer hover:bg-gray-300" onClick={() => setSelectedVisibilityFilter("all")}>
                {t.productManagement.visibilityLabel}: {selectedVisibilityFilter === "hidden" ? t.productManagement.hiddenProducts : t.productManagement.visibleProducts}
                <X className="w-3 h-3 ms-1" />
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="cursor-pointer hover:bg-gray-300" onClick={() => setSearchQuery("")}>
                {t.productManagement.searchLabel}: {searchQuery}
                <X className="w-3 h-3 ms-1" />
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSelectedInventoryStatus("all");
                setSelectedCategory("all");
                setSelectedVisibilityFilter("all");
                setSearchQuery("");
              }}
              className="h-6 text-xs"
            >
              {t.productManagement.clearAll}
            </Button>
          </div>
        )}

        {/* Management Actions */}
        <div className="mb-6 flex gap-3">
          <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 h-12 text-sm">
            <Plus className="w-4 h-4 me-2" />
            {t.addProduct}
          </Button>
          
        </div>
      </div>

      {/* Inventory Dashboard Summary */}
      {products && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedInventoryStatus('in_stock')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">{t.productManagement.inStock}</p>
                  <p className="text-2xl font-bold text-green-800">
                    <span data-testid="product-count-in-stock">{formatProductCount(inventoryCounts.in_stock)}</span>
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedInventoryStatus('low_stock')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">{t.productManagement.lowStock}</p>
                  <p className="text-2xl font-bold text-yellow-800">
                    <span data-testid="product-count-low-stock">{formatProductCount(inventoryCounts.low_stock)}</span>
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedInventoryStatus('out_of_stock')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">{t.productManagement.outOfStock}</p>
                  <p className="text-2xl font-bold text-red-800">
                    <span data-testid="product-count-out-of-stock">{formatProductCount(inventoryCounts.out_of_stock)}</span>
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedVisibilityFilter('hidden')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t.productManagement.hiddenProducts}</p>
                  <p className="text-2xl font-bold text-gray-800">
                    <span data-testid="product-count-hidden">{formatProductCount(inventoryCounts.hidden)}</span>
                  </p>
                </div>
                <EyeOff className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedInventoryStatus('all')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">{t.productManagement.totalProducts}</p>
                  <p className="text-2xl font-bold text-blue-800" data-testid="product-count-total">{formatProductCount(consolidatedProducts.length)}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
        <TabsList className="flex flex-wrap w-full gap-1 h-auto min-h-[40px] p-1 bg-muted">
          <TabsTrigger value="all" className="flex-shrink-0 whitespace-nowrap gap-2" data-testid="product-category-all">
            {t.productManagement.allProducts}
            <Badge variant="secondary" className="tabular-nums">{formatProductCount(consolidatedProducts.length)}</Badge>
          </TabsTrigger>
          {categories.map((category: CategoryOption) => (
            <TabsTrigger key={category.value} value={category.value} className="flex-shrink-0 whitespace-nowrap" data-testid={`product-category-${category.value}`}>
              <span className="flex items-center gap-1 text-xs sm:text-sm">
                <span className="w-3 h-3 sm:w-4 sm:h-4">{category.icon}</span>
                <span className="hidden sm:inline">{category.label}</span>
                <span className="sm:hidden">{category.label.split(' ')[0]}</span>
                <Badge variant="secondary" className="tabular-nums ms-1">{formatProductCount(consolidatedProducts.filter(group => group.mainProduct.category === category.value).length)}</Badge>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory}>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? t.productManagement.noProductsFound : t.productManagement.noProductsAvailable}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery 
                  ? t.productManagement.noProductsMatch.replace('{query}', searchQuery)
                  : t.productManagement.addFirstProduct
                }
              </p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  onClick={() => setSearchQuery("")}
                  className="me-2"
                >
                  {t.productManagement.clearSearch}
                </Button>
              )}
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 me-2" />
                {t.addProduct}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((productGroup) => {
                const product = productGroup.mainProduct;
                return (
                  <Card key={`${product.barcode || product.id}`} className="hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      {/* Product Thumbnail */}
                      <div className="flex-shrink-0">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                              if (nextElement) {
                                nextElement.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center ${product.imageUrl ? 'hidden' : 'flex'}`}
                        >
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold mb-1 text-gray-900 dark:text-white truncate">
                          {product.name}
                        </CardTitle>
                        {product.technicalName && (
                          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                            {product.technicalName}
                          </div>
                        )}
                        {product.contractOnly && (
                          <Badge variant="outline" className="mb-1 border-violet-200 bg-violet-50 text-violet-700">
                            {t.productManagement.contractOnlyBadge}
                          </Badge>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          {categories.find((c: CategoryOption) => c.value === product.category)?.icon}
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {categories.find((c: CategoryOption) => c.value === product.category)?.label}
                          </span>
                          {product.isVariant && (
                            <Badge variant="secondary" className="text-xs">
                              {t.productManagement.variant}: {product.variantValue}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSync({ id: product.id, syncWithShop: !product.syncWithShop })}
                          className={`h-8 w-16 p-0 text-xs font-medium ${product.syncWithShop ? 'hover:bg-red-50 hover:text-red-600 bg-green-50 text-green-700' : 'hover:bg-green-50 hover:text-green-600 bg-gray-50 text-gray-700'}`}
                          title={product.syncWithShop ? t.productManagement.hideFromShop : t.productManagement.showInShop}
                        >
                          {product.syncWithShop ? t.productManagement.hidden : t.productManagement.showInShop}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t.edit}
                          onClick={() => openEditDialog(product)}
                          className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {/* Batch Management Button - Only show if product has barcode */}
                        {product.barcode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLocation(`/admin/batch-management?barcode=${product.barcode}`);
                            }}
                            className="h-8 w-8 p-0 hover:bg-purple-50 hover:text-purple-600"
                            title={t.productManagement.manageBatches}
                          >
                            <Package className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t.delete}
                          onClick={() => handleDeleteProduct(product)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                      {/* Inventory Status */}
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 cursor-pointer hover:shadow-md transition-shadow ${getInventoryStatusColor(getActualInventoryStatus(product.stockQuantity, product.minStockLevel))}`}
                          onClick={() => setSelectedInventoryStatus(getActualInventoryStatus(product.stockQuantity, product.minStockLevel))}
                        >
                          {getInventoryStatusIcon(getActualInventoryStatus(product.stockQuantity, product.minStockLevel))}
                          {getInventoryStatusLabel(getActualInventoryStatus(product.stockQuantity, product.minStockLevel))}
                        </Badge>
                      </div>

                      {/* Current Selling Batch (FIFO) - Show only for chemical products with batches */}
                      {!productGroup.mainProduct.isNonChemical && productGroup.currentSellingBatch && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-green-700">{t.productManagement.activeBatch}</span>
                            <Badge variant="default" className="bg-green-600 text-white">
                              {productGroup.currentSellingBatch}
                            </Badge>
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            {t.productManagement.fifoSystem}
                          </div>
                        </div>
                      )}

                      {/* Batch Summary - Show only for chemical products */}
                      {!productGroup.mainProduct.isNonChemical && productGroup.batches.some(batch => batch.stockQuantity > 0) && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{t.productManagement.allBatchesCount.replace('{count}', productGroup.batches.filter(batch => batch.stockQuantity > 0).length.toString())}</span>
                            <span className="text-sm text-gray-600">{t.productManagement.totalStockLabel.replace('{stock}', productGroup.totalStock.toString())}</span>
                          </div>
                          <div className="space-y-1">
                            {productGroup.batches
                              .filter(batch => batch.stockQuantity > 0)
                              .map((batch, index) => (
                              <div key={index} className={`flex justify-between items-center p-2 rounded text-xs ${
                                batch.isActive ? 'bg-green-100 border border-green-300' : 'bg-gray-50'
                              }`}>
                                <span className="font-medium">{t.productManagement.batchNum.replace('{number}', batch.batchNumber)}</span>
                                <div className="flex items-center gap-2">
                                  <span>{batch.stockQuantity} {t.productManagement.units}</span>
                                  {batch.isActive && (
                                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                      {t.productManagement.sellingNow}
                                    </Badge>
                                  )}
                                  {!batch.isActive && batch.stockQuantity > 0 && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {t.productManagement.inQueue}
                                    </Badge>
                                  )}
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-xs"
                                    onClick={() => handleDeleteBatch(batch.id, batch.batchNumber)}
                                    title={t.productManagement.deleteBatch}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}


                      {/* Product Weight Information */}
                      {(product.netWeight || product.grossWeight || (product.weight && parseFloat(product.weight) > 0)) && (
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          {product.netWeight && Number(product.netWeight) > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{t.productManagement.netWeightLabel}</span>
                              <span>{Number(product.netWeight).toFixed(1)} {product.weightUnit || 'kg'}</span>
                            </div>
                          )}
                          {product.grossWeight && Number(product.grossWeight) > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{t.productManagement.grossWeightLabel}</span>
                              <span>{Number(product.grossWeight).toFixed(1)} {product.weightUnit || 'kg'}</span>
                            </div>
                          )}
                          {!product.netWeight && !product.grossWeight && product.weight && parseFloat(product.weight) > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{t.productManagement.weightLabel}</span>
                              <span>{parseFloat(product.weight).toFixed(1)} {product.weightUnit || 'kg'}</span>
                            </div>
                          )}
                          {product.transportationTemperature && product.transportationTemperature !== 'none' && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{t.productManagement.temperatureLabel}</span>
                              <span>
                                {product.transportationTemperature === 'frozen' && `🧊 ${t.productManagement.temperatureFrozen}`}
                                {product.transportationTemperature === 'chilled' && `❄️ ${t.productManagement.temperatureChilled}`}
                                {product.transportationTemperature === 'cool' && `🌡️ ${t.productManagement.temperatureCool}`}
                                {product.transportationTemperature === 'dry' && `🌤️ ${t.productManagement.temperatureDry}`}
                              </span>
                            </div>
                          )}
                          {/* Vendor Company Tag */}
                          {(product as any).vendorName && (
                            <div className="flex items-center gap-1">
                              <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-md px-3 py-1 text-xs font-semibold">
                                <span className="me-1">🏢</span>
                                {(product as any).vendorName}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}

                      {hasPackagingSpecifications(product.packagingSpecifications) && (
                        <details className="my-3 rounded-lg border border-amber-500 bg-amber-100 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50" data-testid={`packaging-summary-${product.id}`}>
                          <summary className="cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                            {language === "fa" ? "مشخصات فنی بسته‌بندی" : language === "ar" ? "المواصفات الفنية للتعبئة" : language === "tr" ? "Ambalaj teknik özellikleri" : "Container packaging specifications"}
                          </summary>
                          <div className="mt-3"><PackagingSpecificationsView language={language} value={product.packagingSpecifications} /></div>
                        </details>
                      )}
                      {/* FIFO Batch Information - Enhanced Display */}
                      <FIFOBatchDisplay 
                        productName={product.name}
                        className="my-2"
                        showDetails={true}
                      />

                      {/* Product Info */}
                      {product.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {product.description}
                        </p>
                      )}

                      {/* Product Codes */}
                      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {product.sku && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            SKU: {product.sku}
                          </span>
                        )}
                        {product.barcode && (
                          <div className="space-y-2">
                            <span className="flex items-center gap-1">
                              <QrCode className="w-3 h-3" />
                              {product.barcode}
                            </span>
                            {product.barcode && (
                              <div className="flex justify-center">
                                <VisualBarcode 
                                  value={product.barcode}
                                  width={1.2}
                                  height={35}
                                  fontSize={8}
                                  className="bg-white p-1 border rounded"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>



                      {/* Product Variants Section */}
                      {products && Array.isArray(products) && 
                        products.filter((p: any) => p.parentProductId === product.id).length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold text-sm text-blue-800 mb-2">
                            Variants ({products.filter((p: any) => p.parentProductId === product.id).length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {products
                              .filter((p: any) => p.parentProductId === product.id)
                              .map((variant: any) => (
                                <div key={variant.id} className="flex items-center gap-1 bg-white rounded-md px-2 py-1 border text-xs">
                                  <span className="text-gray-600">{variant.variantType}:</span>
                                  <span className="font-medium">{variant.variantValue}</span>
                                  {variant.unitPrice && (
                                    <Badge variant="outline" className="text-xs ms-1">
                                      {variant.unitPrice} {variant.currency || 'IQD'}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Document Availability Indicators - Bottom Right */}
                      <div className="flex justify-end mt-3">
                        <div className="flex gap-2">
                          {/* Catalog Indicator */}
                          {product.showCatalogToCustomers && product.pdfCatalogUrl && (
                            <div 
                              className="bg-green-500 rounded-full p-1.5 shadow-lg border-2 border-white cursor-pointer hover:bg-green-600 transition-colors" 
                              title={t.productManagement.clickToOpenCatalog}
                              onClick={() => product.pdfCatalogUrl && window.open(product.pdfCatalogUrl, '_blank')}
                            >
                              <Eye className="w-3 h-3 text-white" />
                            </div>
                          )}
                          
                          {/* MSDS Indicator */}
                          {product.showMsdsToCustomers && product.msdsUrl && (
                            <div 
                              className="bg-blue-500 rounded-full p-1.5 shadow-lg border-2 border-white cursor-pointer hover:bg-blue-600 transition-colors" 
                              title={t.productManagement.clickToOpenMSDS}
                              onClick={() => product.msdsUrl && window.open(product.msdsUrl, '_blank')}
                            >
                              <FileText className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-bold text-center text-blue-700 flex items-center justify-center gap-2">
              <Package className="h-6 w-6" />
              {editingProduct ? t.productManagement.editProduct : t.productManagement.addNewProduct}
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              {editingProduct ? t.productManagement.editProduct : t.productManagement.addNewProduct}
            </DialogDescription>
            {/* Vendor Company Tag in Edit Dialog */}
            {editingProduct && (editingProduct as any).vendorName && (
              <div className="flex justify-center mt-3">
                <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-lg px-4 py-2 text-sm font-semibold">
                  <span className="me-2">🏢</span>
                  {t.productManagement.companyLabel}: {(editingProduct as any).vendorName}
                </Badge>
              </div>
            )}
          </DialogHeader>
          
          <TooltipProvider>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => {
                keepDialogOpenAfterUpdateRef.current = false;
                onSubmit(data);
              }, (errors) => {
                keepDialogOpenAfterUpdateRef.current = false;
                console.log('❌ [DEBUG] Form validation failed:', errors);
                const firstError = Object.keys(errors)[0];
                if (firstError) revealKardexSectionForField(firstError);
              })} onInvalidCapture={(event) => {
                const field = event.target as HTMLInputElement;
                if (field.name) revealKardexSectionForField(field.name);
              }} className="space-y-4">
                
                <KardexFormSection
                  id="classification"
                  title={language === "fa" ? "دسته‌بندی و ویژگی‌های محصول" : language === "ar" ? "تصنيف المنتج وخصائصه" : language === "tr" ? "Ürün sınıflandırması ve özellikleri" : "Product classification & handling"}
                  icon={<Package className="h-4 w-4 text-muted-foreground" />}
                >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="isNonChemical"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-amber-50 border-amber-200">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium text-amber-700">{t.productManagement.nonChemicalProduct}</FormLabel>
                          <div className="text-xs text-amber-500">{t.productManagement.nonChemicalDesc}</div>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-amber-400"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isFlammable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-orange-50 border-orange-200">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium text-orange-700 flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {t.productManagement.flammableProduct}
                          </FormLabel>
                          <div className="text-xs text-orange-500">{t.productManagement.flammableDesc}</div>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-orange-400"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contractOnly"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-violet-50 border-violet-200">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium text-violet-700">{t.productManagement.contractOnlyLabel}</FormLabel>
                          <div className="text-xs text-violet-500">{t.productManagement.contractOnlyDesc}</div>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            className="border-violet-400"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="isBulkSale" render={({field})=>(
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-blue-50">
                      <div className="space-y-0.5">
                        <FormLabel>{language==="fa"?"فروش فله‌ای":language==="ar"?"بيع سائب":language==="tr"?"Dökme satış":"Bulk transport sale"}</FormLabel>
                        <p className="text-xs text-slate-600">{language==="fa"?"در فروش قراردادی، خودروهای دستهٔ فله‌ای انتخاب می‌شوند؛ قیمت کالا همان قیمت قرارداد است. این ویژگی برای بچ‌های دارای بارکد مشترک یکسان است.":language==="ar"?"للبيع التعاقدي تُستخدم مركبات الفئة السائبة، ويبقى سعر العقد. يشترك هذا الخيار بين دفعات الباركود نفسه.":language==="tr"?"Sözleşmeli satışta dökme araçlar kullanılır; sözleşme fiyatı değişmez. Aynı barkodlu partiler bu özelliği paylaşır.":"Contract sales use bulk-category vehicles and retain contract prices. Batches sharing a barcode share this setting."}</p>
                      </div><FormControl><Checkbox checked={field.value} onCheckedChange={value=>field.onChange(value===true)}/></FormControl>
                    </FormItem>
                  )}/>

                  <FormField
                    control={form.control}
                    name="transportationTemperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">{t.productManagement.temperatureLabel}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                            <SelectValue placeholder={t.productManagement.temperatureNone} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">⚪ {t.productManagement.temperatureNone}</SelectItem>
                            <SelectItem value="frozen">🧊 {t.productManagement.temperatureFrozen}</SelectItem>
                            <SelectItem value="chilled">❄️ {t.productManagement.temperatureChilled}</SelectItem>
                            <SelectItem value="cool">🌡️ {t.productManagement.temperatureCool}</SelectItem>
                            <SelectItem value="dry">🌤️ {t.productManagement.temperatureDry}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                </KardexFormSection>

                <KardexFormSection id="basic" title={t.productManagement.baseInfo} icon={<Package className="h-4 w-4 text-muted-foreground" />}>
                <div className={`p-4 rounded-lg border ${form.watch('isNonChemical') ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
                  <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${form.watch('isNonChemical') ? 'text-green-800' : 'text-blue-800'}`}>
                    <Package className="h-5 w-5" />
                    {t.productManagement.baseInfo}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            {t.productManagement.productName}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.productNameHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t.productManagement.productNamePlaceholder} 
                              className="h-9"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem data-kardex-field="category">
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            {t.productManagement.categoryLabel}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.categoryHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder={t.productManagement.categoryPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category: CategoryOption) => (
                                <SelectItem key={category.value} value={category.value}>
                                  <div className="flex items-center gap-2">
                                    {category.icon}
                                    {category.label}
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

                  {/* Vendor Assignment (Admin Mode Only) */}
                  {!isVendorMode && vendors.length > 0 && (
                    <div className="mt-3">
                      <FormField
                        control={form.control}
                        name="vendorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium flex items-center gap-2">
                              <Factory className="h-4 w-4" />
                              {t.productManagement.assignVendor}
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t.productManagement.assignVendorHelp}</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} 
                              value={field.value ? String(field.value) : "none"}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9">
                                <SelectValue placeholder={t.productManagement.selectVendor} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">
                                  <div className="flex items-center gap-2 text-gray-500">
                                    {t.productManagement.noVendor}
                                  </div>
                                </SelectItem>
                                {vendors.map((vendor) => (
                                  <SelectItem key={vendor.id} value={String(vendor.id)}>
                                    <div className="flex items-center gap-2">
                                      <Factory className="h-4 w-4" />
                                      {vendor.vendorName}
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
                  )}

                  <div className="mt-3">
                    <FormField
                      control={form.control}
                      name="technicalName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            {t.productManagement.technicalName}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.technicalNameHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t.productManagement.technicalNamePlaceholder} 
                              className="h-9"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-3 space-y-3">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            {t.productManagement.description}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.descriptionHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={t.productManagement.descriptionPlaceholder} 
                              className="min-h-[80px] resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="specifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            {t.productManagement.technicalSpecifications}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.technicalSpecificationsHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={t.productManagement.technicalSpecificationsPlaceholder} 
                              className="min-h-[80px] resize-none font-mono text-xs"
                              {...field}
                              value={typeof field.value === 'string' ? field.value : (field.value ? JSON.stringify(field.value, null, 2) : '')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="features"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            {t.productManagement.productFeatures}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.productFeaturesHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={t.productManagement.productFeaturesPlaceholder} 
                              className="min-h-[80px] resize-none"
                              {...field}
                              value={typeof field.value === 'string' ? field.value : (Array.isArray(field.value) ? (field.value as string[]).join('\n') : '')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="applications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            {t.productManagement.productApplications}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.productApplicationsHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={t.productManagement.productApplicationsPlaceholder} 
                              className="min-h-[80px] resize-none"
                              {...field}
                              value={typeof field.value === 'string' ? field.value : (Array.isArray(field.value) ? (field.value as string[]).join('\n') : '')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                </KardexFormSection>

                <KardexFormSection id="pricing" title={t.productManagement.identificationPricing} icon={<QrCode className="h-4 w-4 text-muted-foreground" />}>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    {t.productManagement.identificationPricing}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`flex items-center gap-2 text-sm font-medium ${validationErrors.sku ? 'text-red-600' : ''}`}>
{t.productSku}
                            {editingProduct && <Lock className="h-3 w-3 text-gray-400" />}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{editingProduct ? t.productManagement.skuHelpView : t.productManagement.skuHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                placeholder={editingProduct ? t.productManagement.skuPlaceholderView : t.productManagement.skuPlaceholder} 
                                className={`h-9 ${editingProduct ? "bg-gray-50 text-gray-500" : ""} ${validationErrors.sku ? "border-red-500 focus:border-red-500" : ""}`}
                                {...field}
                                value={field.value || ""}
                                readOnly={!!editingProduct}
                              />
                              {!editingProduct && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-9 px-3 bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                                  onClick={async () => {
                                    const productName = form.getValues('name');
                                    const category = form.getValues('category');
                                    
                                    if (!productName || !category) {
                                      toast({
                                        title: t.productManagement.incompleteInfo,
                                        description: t.productManagement.enterNameCategoryFirst,
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    try {
                                      const response = await fetch('/api/products/generate-sku', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          name: productName,
                                          category: category,
                                          description: form.getValues('description') || ''
                                        })
                                      });

                                      if (!response.ok) {
                                        throw new Error(t.productManagement.productUpdateError);
                                      }

                                      const result = await response.json();
                                      form.setValue('sku', result.data.sku);
                                      
                                      // Generate barcode automatically after SKU
                                      try {
                                        const barcodeResponse = await fetch('/api/products/generate-barcode', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            name: productName,
                                            category: category
                                          })
                                        });

                                        if (barcodeResponse.ok) {
                                          const barcodeResult = await barcodeResponse.json();
                                          form.setValue('barcode', barcodeResult.data.barcode);
                                          
                                          toast({
                                            title: t.productManagement.productUpdated,
                                            description: `SKU: ${result.data.sku} | ${t.productManagement.barcode}: ${barcodeResult.data.barcode}`,
                                          });
                                        } else {
                                          form.setValue('barcode', '');
                                          toast({
                                            title: t.productManagement.productUpdated,
                                            description: `SKU: ${result.data.sku}`,
                                          });
                                        }
                                      } catch (barcodeError) {
                                        console.error('Error generating barcode:', barcodeError);
                                        form.setValue('barcode', '');
                                        toast({
                                          title: t.productManagement.productUpdated,
                                          description: `SKU: ${result.data.sku}`,
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Error generating SKU:', error);
                                      toast({
                                        title: t.productManagement.productUpdateError,
                                        description: t.productManagement.productUpdateError,
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  <Sparkles className="h-4 w-4 me-1" />
                                  {t.productManagement.aiGenerate}
                                </Button>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                          {validationErrors.sku && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.sku}</p>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`flex items-center gap-2 text-sm font-medium ${validationErrors.barcode ? 'text-red-600' : ''}`}>
{t.productBarcode}
                            {/* Subtle barcode visualization next to label */}
                            <svg width="120" height="24" viewBox="0 0 120 24" className="opacity-30 ms-1">
                              <rect x="0" y="0" width="3" height="24" fill="#333"/>
                              <rect x="6" y="0" width="3" height="24" fill="#333"/>
                              <rect x="12" y="0" width="6" height="24" fill="#333"/>
                              <rect x="21" y="0" width="3" height="24" fill="#333"/>
                              <rect x="27" y="0" width="3" height="24" fill="#333"/>
                              <rect x="33" y="0" width="6" height="24" fill="#333"/>
                              <rect x="42" y="0" width="3" height="24" fill="#333"/>
                              <rect x="48" y="0" width="3" height="24" fill="#333"/>
                              <rect x="54" y="0" width="3" height="24" fill="#333"/>
                              <rect x="60" y="0" width="6" height="24" fill="#333"/>
                              <rect x="69" y="0" width="3" height="24" fill="#333"/>
                              <rect x="75" y="0" width="3" height="24" fill="#333"/>
                              <rect x="81" y="0" width="6" height="24" fill="#333"/>
                              <rect x="90" y="0" width="3" height="24" fill="#333"/>
                              <rect x="96" y="0" width="3" height="24" fill="#333"/>
                              <rect x="102" y="0" width="6" height="24" fill="#333"/>
                              <rect x="111" y="0" width="3" height="24" fill="#333"/>
                              <rect x="117" y="0" width="3" height="24" fill="#333"/>
                            </svg>
                            {manualBarcodeEntered && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md">{t.productManagement.manualMode}</span>
                            )}
                            {(editingProduct || field.value) && <Lock className="h-3 w-3 text-gray-400" />}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.standard13Barcode}. {t.productManagement.manualInputPreventsAuto}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          
                          <FormControl>
                            <Input 
                              placeholder={t.productManagement.barcode13Placeholder} 
                              className={`h-9 ${(editingProduct || field.value) ? "bg-gray-50 text-gray-500" : ""} ${validationErrors.barcode ? "border-red-500 focus:border-red-500" : ""}`}
                              {...field}
                              value={field.value || ""}
                              readOnly={!!(editingProduct || field.value)}
                              onChange={(e) => {
                                // Detect manual input
                                if (e.target.value && !editingProduct) {
                                  setManualBarcodeEntered(true);
                                  console.log('📝 [MANUAL BARCODE] User manually entered barcode:', e.target.value);
                                }
                                field.onChange(e);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                          {validationErrors.barcode && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.barcode}</p>
                          )}
                        </FormItem>
                      )}
                    />

                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <FormField
                      control={form.control}
                      name="unitPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`text-sm font-medium flex items-center gap-2 ${validationErrors.unitPrice ? 'text-red-600' : ''}`}>
{t.unitPrice}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.pricePerUnit}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00" 
                              className={`h-9 ${validationErrors.unitPrice ? "border-red-500 focus:border-red-500" : ""}`}
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            />
                          </FormControl>
                          <FormMessage />
                          {validationErrors.unitPrice && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.unitPrice}</p>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">{t.currency}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "IQD"}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="IQD">{t.productManagement.currencyIQD}</SelectItem>
                              <SelectItem value="USD">{t.productManagement.currencyUSD}</SelectItem>
                              <SelectItem value="EUR">{t.productManagement.currencyEUR}</SelectItem>
                               <SelectItem value="IRR">{t.productManagement.currencyIRR}</SelectItem>
                              <SelectItem value="TRY">{t.productManagement.currencyTRY}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                </KardexFormSection>

                <KardexFormSection id="inventory" title={t.productManagement.stockManagement} icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}>
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                  <h3 className="text-lg font-semibold text-orange-800 mb-3 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t.productManagement.stockManagement}
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <FormField
                      control={form.control}
                      name="stockQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`text-sm font-medium flex items-center gap-2 ${validationErrors.stockQuantity ? 'text-red-600' : ''}`}>
                            {t.productManagement.currentStock}
                            {editingProduct && <Lock className="h-3 w-3 text-gray-400" />}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{editingProduct ? t.productManagement.stockNotEditable : t.productManagement.initialStockHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className={`h-9 ${editingProduct ? "bg-gray-50 text-gray-600" : ""} ${validationErrors.stockQuantity ? "border-red-500 focus:border-red-500" : ""}`}
                              {...field}
                              value={field.value || ''}
                              readOnly={!!editingProduct}
                              onChange={(e) => {
                                if (!editingProduct) {
                                  field.onChange(e.target.value ? parseInt(e.target.value) : 0);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                          {validationErrors.stockQuantity && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.stockQuantity}</p>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="inventoryAddition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            {t.productManagement.addStock}
                            {editingProduct && (
                              <Badge variant="secondary" className="text-xs">
                                {t.productManagement.onlyForEdit}
                              </Badge>
                            )}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.stockAdditionHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder={editingProduct ? "0" : t.productManagement.editOnlyPlaceholder}
                                className={`h-9 ${!editingProduct ? "bg-gray-100 text-gray-400" : ""}`}
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                                disabled={!editingProduct || isSubmitting}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!form.watch('isNonChemical') && (
                      <>
                        {editingProduct && (
                          <div className="col-span-3 mb-3 bg-orange-50 p-3 rounded-lg border border-orange-200">
                            <FormLabel className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              {t.productManagement.selectBatchForEdit}
                            </FormLabel>
                            <Select value={selectedBatchId.toString()} onValueChange={handleBatchChange}>
                              <SelectTrigger className="w-full h-9 bg-white border-orange-300 hover:border-orange-400">
                                <SelectValue placeholder={t.productManagement.selectBatchPlaceholderText} />
                              </SelectTrigger>
                              <SelectContent>
                                {availableBatches.length > 0 ? (
                                  <>
                                    {availableBatches.map((batch) => (
                                      <SelectItem key={batch.id} value={batch.id.toString()}>
                                        {t.productManagement.batchOption.replace('{batchNumber}', batch.batchNumber).replace('{stock}', batch.stockQuantity.toString())}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="new" className="bg-green-50 font-medium">
                                      {t.productManagement.addNewBatch}
                                    </SelectItem>
                                  </>
                                ) : (
                                  <SelectItem value="new">{t.productManagement.addNewBatch}</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-orange-600 mt-1.5">
                              {availableBatches.length > 1 
                                ? t.productManagement.batchesAvailable.replace('{count}', availableBatches.length.toString()).replace('{barcode}', editingProduct?.barcode || '')
                                : t.productManagement.selectNewBatch}
                            </p>
                          </div>
                        )}
                        
                        <FormField
                          control={form.control}
                          name="newBatchNumber"
                          render={({ field }) => {
                            const isAddingNewBatch = selectedBatchId === 'new';
                            const currentProduct = editingProduct;
                            const currentBatchNumber = currentProduct?.batchNumber || `ID-${currentProduct?.id || ''}`;
                            
                            return (
                            <FormItem>
                              <FormLabel className="text-sm font-medium flex items-center gap-2">
                                {isAddingNewBatch ? t.productManagement.newBatchNumber : t.productManagement.currentBatchNumber}
                                {!isAddingNewBatch && <Lock className="h-3 w-3 text-gray-400" />}
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-3 w-3 text-gray-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{isAddingNewBatch ? t.productManagement.batchNumberHelp : t.productManagement.batchNumberHelpCurrent}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={isAddingNewBatch ? t.productManagement.batchNumberPlaceholder : currentBatchNumber}
                                  className={`h-9 ${!isAddingNewBatch ? "bg-gray-100 text-gray-600" : ""} ${validationErrors.newBatchNumber ? "border-red-500 focus:border-red-500" : ""}`}
                                  {...field}
                                  value={isAddingNewBatch ? (field.value || '') : currentBatchNumber}
                                  readOnly={!isAddingNewBatch}
                                  disabled={!isAddingNewBatch}
                                />
                              </FormControl>
                              <FormMessage />
                              {validationErrors.newBatchNumber && isAddingNewBatch && (
                                <p className="text-sm text-red-600 mt-1">{validationErrors.newBatchNumber}</p>
                              )}
                              {!isAddingNewBatch && (
                                <p className="text-xs text-orange-600 mt-1">
                                  {t.productManagement.stockWillBeAdded}
                                </p>
                              )}
                            </FormItem>
                            );
                          }}
                        />
                      </>
                    )}

                    <FormField
                      control={form.control}
                      name="minStockLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`text-sm font-medium flex items-center gap-2 ${validationErrors.minStockLevel ? 'text-red-600' : ''}`}>
{t.minStockLevel}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.minStockHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className={`h-9 ${validationErrors.minStockLevel ? "border-red-500 focus:border-red-500" : ""}`}
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                            />
                          </FormControl>
                          <FormMessage />
                          {validationErrors.minStockLevel && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.minStockLevel}</p>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxStockLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`text-sm font-medium flex items-center gap-2 ${validationErrors.maxStockLevel ? 'text-red-600' : ''}`}>
{t.maxStockLevel}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.maxStockHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className={`h-9 ${validationErrors.maxStockLevel ? "border-red-500 focus:border-red-500" : ""}`}
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                            />
                          </FormControl>
                          <FormMessage />
                          {validationErrors.maxStockLevel && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.maxStockLevel}</p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Weight row */}
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="netWeight"
                      render={({ field }) => {
                        const isBatchAddition = !!((form.watch('inventoryAddition') || 0) > 0 && form.watch('newBatchNumber')?.trim());
                         const isDisabled = isBatchAddition || (!editingProduct && !!form.watch('isNonChemical'));
                        const originalNetWeight = editingProduct?.netWeight || 0;
                        const weightUnit = editingProduct?.weightUnit || 'kg';
                        return (
                        <FormItem>
                          <FormLabel className={`text-sm font-medium flex items-center gap-2 ${validationErrors.netWeight ? 'text-red-600' : ''} ${isDisabled ? 'text-gray-400' : ''}`}>
{t.netWeight}
                             {isBatchAddition && (
                              <Badge variant="secondary" className="text-xs">
                                 {`${originalNetWeight} ${weightUnit}`}
                              </Badge>
                            )}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{isDisabled ? t.productManagement.netWeightHelpView : t.productManagement.netWeightHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder={isDisabled ? (isBatchAddition ? `${originalNetWeight} ${weightUnit}` : t.productManagement.fixedValue) : t.productManagement.netWeightPlaceholder} 
                              className={`h-9 ${validationErrors.netWeight ? "border-red-500 focus:border-red-500" : ""} ${isDisabled ? 'bg-gray-100 text-gray-400' : ''}`}
                              {...field}
                              value={isBatchAddition ? originalNetWeight : (field.value || '')}
                              readOnly={isDisabled}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                              disabled={isDisabled}
                            />
                          </FormControl>
                          <FormMessage />
                          {validationErrors.netWeight && !isDisabled && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.netWeight}</p>
                          )}
                        </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="grossWeight"
                      render={({ field }) => {
                        const isBatchAddition = !!((form.watch('inventoryAddition') || 0) > 0 && form.watch('newBatchNumber')?.trim());
                         const isDisabled = isBatchAddition || (!editingProduct && !!form.watch('isNonChemical'));
                        const originalGrossWeight = editingProduct?.grossWeight || 0;
                        const weightUnit = editingProduct?.weightUnit || 'kg';
                        return (
                        <FormItem>
                          <FormLabel className={`text-sm font-medium flex items-center gap-2 ${validationErrors.grossWeight ? 'text-red-600' : ''} ${isDisabled ? 'text-gray-400' : ''}`}>
{t.grossWeight}
                             {isBatchAddition && (
                              <Badge variant="secondary" className="text-xs">
                                 {`${originalGrossWeight} ${weightUnit}`}
                              </Badge>
                            )}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{isDisabled ? t.productManagement.grossWeightHelpView : t.productManagement.grossWeightHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder={isDisabled ? (isBatchAddition ? `${originalGrossWeight} ${weightUnit}` : t.productManagement.fixedValue) : t.productManagement.grossWeightPlaceholder} 
                              className={`h-9 ${validationErrors.grossWeight ? "border-red-500 focus:border-red-500" : ""} ${isDisabled ? 'bg-gray-100 text-gray-400' : ''}`}
                              {...field}
                              value={isBatchAddition ? originalGrossWeight : (field.value || '')}
                              readOnly={isDisabled}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                              disabled={isDisabled}
                            />
                          </FormControl>
                          <FormMessage />
                          {validationErrors.grossWeight && !isBatchAddition && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.grossWeight}</p>
                          )}
                        </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="weightUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">{t.weightUnit}</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value || "kg"}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder={t.productManagement.selectWeightUnit} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="kg">{t.productManagement.weightUnitKg}</SelectItem>
                              <SelectItem value="g">{t.productManagement.weightUnitG}</SelectItem>
                              <SelectItem value="lb">{t.productManagement.weightUnitLb}</SelectItem>
                              <SelectItem value="oz">{t.productManagement.weightUnitOz}</SelectItem>
                              <SelectItem value="t">{t.productManagement.weightUnitT}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {editingProduct && (
                    <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                      <p>{t.productManagement.shopGrossWeightHint}</p>
                      {mainShopBatch && mainShopBatch.id !== editingProduct.id && (
                        <div className="mt-2">
                          <p>{t.productManagement.batchWeightOnlyHint}</p>
                          <Button type="button" variant="link" className="h-auto px-0 text-blue-900 underline"
                            onClick={() => handleBatchChange(String(mainShopBatch.id))}>
                            {t.productManagement.editShopWeightBatch} ({mainShopBatch.batchNumber || `ID-${mainShopBatch.id}`})
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </KardexFormSection>

                <KardexFormSection
                  id="packaging"
                  title={language === "fa" ? "مشخصات بسته‌بندی" : language === "ar" ? "مواصفات العبوة" : language === "tr" ? "Ambalaj özellikleri" : "Packaging specifications"}
                  icon={<Package className="h-4 w-4 text-amber-800 dark:text-amber-300" />}
                  className="!border-amber-500 !bg-amber-100 !text-amber-950 dark:!border-amber-700 dark:!bg-amber-950 dark:!text-amber-50"
                >
                  <FormField control={form.control} name="packagingSpecifications" render={({ field }) => (
                    <FormItem data-testid="kardex-packaging-block">
                      <PackagingSpecificationsEditor
                        key={editingProduct?.id ?? "new-product"}
                        embedded
                        language={language} value={field.value} onChange={field.onChange}
                        disabled={!!((form.watch("inventoryAddition") || 0) > 0 && form.watch("newBatchNumber")?.trim())}
                      />
                      {!!((form.watch("inventoryAddition") || 0) > 0 && form.watch("newBatchNumber")?.trim()) && (
                        <p className="text-sm">{language === "fa"
                          ? "برای تغییر مشخصات ظرف، محصول را ویرایش کنید؛ افزودن بچ فقط موجودی و اطلاعات بچ را ثبت می‌کند."
                          : language === "ar" ? "لتعديل مواصفات الوعاء، حرر المنتج؛ إضافة دفعة تسجل المخزون وبيانات الدفعة فقط."
                          : language === "tr" ? "Kap özelliklerini değiştirmek için ürünü düzenleyin; parti eklemek yalnızca stok ve parti bilgilerini kaydeder."
                          : "Edit the product to change container specifications; adding a batch records stock and batch information only."}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                </KardexFormSection>

                {/* Tags and additional settings */}
                <KardexFormSection id="display" title={t.shopSettings} icon={<Tag className="h-4 w-4 text-muted-foreground" />}>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Tag className="h-5 w-5" />
{t.shopSettings}
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium flex items-center gap-2">
{t.productTags}
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-3 w-3 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t.productManagement.tagsHelp}</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t.productManagement.tagsPlaceholder} 
                            className="h-9"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              console.log('Tags input changed:', e.target.value);
                              field.onChange(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <FormField
                      control={form.control}
                      name="syncWithShop"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">{t.syncWithShop}</FormLabel>
                            <div className="text-xs text-gray-500">{t.productManagement.showInShop}</div>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="showWhenOutOfStock"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">{t.showWhenOutOfStock}</FormLabel>
                            <div className="text-xs text-gray-500">{t.productManagement.showWhenOutOfStockDesc}</div>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                </KardexFormSection>

                {/* File and document management */}
                <KardexFormSection id="media" title={t.productManagement.fileManagement} icon={<FileText className="h-4 w-4 text-muted-foreground" />}>
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
                  <h3 className="text-lg font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t.productManagement.fileManagement}
                  </h3>
                  
                  {/* Display Mode Selection */}
                  <div className="mb-6 p-4 bg-white rounded-lg border border-indigo-300 shadow-sm">
                    <FormField
                      control={form.control}
                      name="displayMode"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            {t.productManagement.displayMode}
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.productManagement.displayModeHelp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                              dir={direction}
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="images" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {t.productManagement.displayModeImages}
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="3d_model" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {t.productManagement.displayMode3D}
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Product images upload (max 3 images) - Conditional rendering based on displayMode */}
                  {form.watch('displayMode') === 'images' && (
                  <KardexFormSection id="images" title={t.productManagement.productImages} icon={<Image className="h-4 w-4 text-muted-foreground" />}>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        {(() => {
                          const isBatchAddition = (form.watch('inventoryAddition') || 0) > 0 && form.watch('newBatchNumber')?.trim();
                          return isBatchAddition ? t.productManagement.productImagesMain : t.productManagement.productImages;
                        })()}
                      </FormLabel>
                      
                      <div className="space-y-4">
                        {/* Image upload section */}
                        <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 text-sm text-blue-700">
                            <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                            <span className="font-medium">
                              {(() => {
                                const isBatchAddition = (form.watch('inventoryAddition') || 0) > 0 && form.watch('newBatchNumber')?.trim();
                                return isBatchAddition ? t.productManagement.imageFromMain + ':' : t.productManagement.selectPrimaryImageTitle + ':';
                              })()}
                            </span>
                            <span>
                              {(() => {
                                const isBatchAddition = (form.watch('inventoryAddition') || 0) > 0 && form.watch('newBatchNumber')?.trim();
                                return isBatchAddition 
                                  ? t.productManagement.imagesFetchedFromDB.replace('{index}', (primaryImageIndex + 1).toString())
                                  : t.productManagement.clickCircleButton.replace('{index}', (primaryImageIndex + 1).toString());
                              })()}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[0, 1, 2].map((index) => (
                            <div key={index} className="space-y-2">
                              <div className="text-xs text-gray-500 text-center font-medium">{t.productManagement.imageNumber.replace('{index}', (index + 1).toString())}</div>
                              <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-3 text-center flex flex-col justify-center">
                                {(imagePreviews[index] || (editingProduct && displayImagePreviews[index])) ? (
                                  <div className="relative w-full aspect-square">
                                    <img 
                                      src={(imagePreviews[index] || displayImagePreviews[index]) || ''} 
                                      alt={t.productManagement.imagePreview.replace('{index}', (index + 1).toString())} 
                                      className={`w-full h-full object-cover rounded-lg transition-all ${
                                        primaryImageIndex === index ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                                      }`}
                                    />
                                    {/* Primary image indicator */}
                                    {(editingProduct ? displayPrimaryImageIndex : primaryImageIndex) === index && (
                                      <div className="absolute -top-1 -start-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full text-[10px] font-bold">
                                        {t.productManagement.primaryImageLabel}
                                      </div>
                                    )}
                                    {/* Primary image selection radio button */}
                                    <div className="absolute bottom-1 start-1 z-10">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          console.log('Primary button clicked for index:', index);
                                          setPrimaryImageIndex(index);
                                          // Update legacy imageUrl field with new primary image
                                          const currentUrls = form.getValues('imageUrls') || [];
                                          if (currentUrls[index]) {
                                            form.setValue('imageUrl', currentUrls[index]);
                                            setImagePreview(currentUrls[index]);
                                          }
                                        }}
                                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${
                                          primaryImageIndex === index 
                                            ? 'bg-blue-500 border-blue-500 shadow-lg' 
                                            : 'bg-white border-gray-400 hover:border-blue-400 shadow-md'
                                        }`}
                                        title={t.productManagement.setPrimaryImage.replace('{selected}', primaryImageIndex === index ? `(${t.productManagement.selected})` : '')}
                                      >
                                        {primaryImageIndex === index && (
                                          <div className="w-2 h-2 bg-white rounded-full"></div>
                                        )}
                                      </button>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      aria-label={t.delete}
                                      className="absolute -top-2 -end-2 h-6 w-6 p-0 bg-white shadow-md z-10"
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log(`🗑️ [IMAGE DELETE] Deleting image at index ${index}`);
                                        
                                        // Get current URLs
                                        const currentUrls = form.getValues('imageUrls') || [];
                                        const newUrls = [...currentUrls];
                                        newUrls[index] = '';
                                        const filteredUrls = newUrls.filter(url => url);
                                        
                                        // Optimistic update: Update form and editing product state immediately
                                        form.setValue('imageUrls', filteredUrls);
                                        
                                        // Update editingProduct to trigger UI refresh
                                        if (editingProduct) {
                                          setEditingProduct({
                                            ...editingProduct,
                                            imageUrls: filteredUrls,
                                            imageUrl: filteredUrls.length > 0 ? filteredUrls[0] : ''
                                          } as any);
                                        }
                                        
                                        // Update local previews for new products
                                        const newPreviews = [...imagePreviews];
                                        newPreviews[index] = null;
                                        setImagePreviews(newPreviews);
                                        
                                        // If removing the primary image, set first available image as primary
                                        if (primaryImageIndex === index) {
                                          const remainingImages = newUrls.filter((url, i) => i !== index && url);
                                          if (remainingImages.length > 0) {
                                            const newPrimaryIndex = newUrls.findIndex((url, i) => i !== index && url);
                                            setPrimaryImageIndex(newPrimaryIndex);
                                            form.setValue('imageUrl', newUrls[newPrimaryIndex]);
                                            setImagePreview(newUrls[newPrimaryIndex]);
                                          } else {
                                            setPrimaryImageIndex(0);
                                            form.setValue('imageUrl', '');
                                            setImagePreview(null);
                                          }
                                        }
                                        
                                        // Then update the database if editing existing product
                                        if (editingProduct) {
                                          try {
                                            await apiRequest(`/api/products/${editingProduct.id}`, {
                                              method: 'PATCH',
                                              body: {
                                                imageUrls: filteredUrls,
                                                imageUrl: filteredUrls.length > 0 ? filteredUrls[0] : ''
                                              }
                                            });
                                            console.log('✅ [IMAGE DELETE] Image removed from database');
                                            queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                                          } catch (error) {
                                            console.error('❌ [IMAGE DELETE] Failed to remove image:', error);
                                            toast({
                                              variant: "destructive",
                                          title: t.error,
                                          description: t.productManagement.removeImageError
                                            });
                                          }
                                        }
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="py-2">
                                    <Image className="mx-auto h-8 w-8 text-gray-400" />
                                    <p className="mt-1 text-xs text-gray-600">{t.productManagement.selectImage}</p>
                                    <p className="text-xs text-gray-500">{t.productManagement.imageFileTypes}</p>
                                  </div>
                                )}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleMultipleImageUpload(file, index);
                                  }}
                                />
                              </div>
                              {uploadingImages[index] && (
                                <div className="flex items-center justify-center text-xs text-blue-600">
                                    <RefreshCw className="h-3 w-3 animate-spin me-1" />
                                  {t.productManagement.uploadImage}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Display image URLs */}
                        <div className="space-y-2">
                          <FormField
                            control={form.control}
                            name="imageUrls"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm text-gray-600">{t.productManagement.imageUrlsLabel}</FormLabel>
                                <FormControl>
                                  <div className="space-y-1">
                                    {(field.value || []).map((url: string, index: number) => (
                                      <Input 
                                        key={index}
                                        placeholder={t.productManagement.imageUrlPlaceholder.replace('{index}', (index + 1).toString())}
                                        className="h-8 text-xs"
                                        value={url || ''}
                                        readOnly
                                      />
                                    ))}
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          {/* Backward compatibility with single imageUrl */}
                          <FormField
                            control={form.control}
                            name="imageUrl"
                            render={({ field }) => (
                              <FormItem className="hidden">
                                <FormControl>
                                  <Input {...field} value={field.value || ''} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  </KardexFormSection>
                  )}

                  {/* 3D Model upload section - Conditional rendering based on displayMode */}
                  {form.watch('displayMode') === '3d_model' && (
                    <KardexFormSection id="model3d" title={t.productManagement.model3dFile} icon={<Package className="h-4 w-4 text-muted-foreground" />}>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <FormLabel className="text-sm font-medium flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          {t.productManagement.model3dFile}
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-3 w-3 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t.productManagement.model3dHelp}</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        
                        <div className="space-y-4">
                          {/* 3D Model file drop zone */}
                          <div className="space-y-2">
                            <div className="relative border-2 border-dashed border-purple-300 rounded-lg p-4 text-center bg-purple-50">
                              {model3dPreview ? (
                                <div className="relative">
                                  <ProductModel3DViewer
                                    model3dKey={model3dPreview}
                                    productName={form.getValues('name') || t.productManagement.model3dPreview}
                                    className="w-full h-[300px]"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    aria-label={t.productManagement.deleteModel3d}
                                    className="absolute top-2 end-2 h-8 w-8 p-0 bg-white/90 hover:bg-white"
                                    onClick={() => {
                                      setModel3dPreview(null);
                                      form.setValue('model3dKey', '');
                                      form.setValue('model3dFileName', '');
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="py-4">
                                  <Package className="mx-auto h-12 w-12 text-purple-400" />
                                  <p className="mt-2 text-sm text-gray-600">{t.productManagement.uploadModel3d}</p>
                                  <p className="text-xs text-gray-500">{t.productManagement.model3dFileTypes}</p>
                                </div>
                              )}
                              <input
                                type="file"
                                accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleModel3dUpload(file);
                                }}
                              />
                            </div>
                            {uploadingModel3d && (
                              <div className="flex items-center justify-center text-sm text-purple-600">
                                <RefreshCw className="h-4 w-4 animate-spin me-2" />
                                {t.productManagement.uploadingFile}
                              </div>
                            )}
                          </div>

                          {/* 3D Model settings */}
                          <div className="space-y-3">
                            <FormField
                              control={form.control}
                              name="model3dKey"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm text-gray-600">{t.productManagement.model3dFile}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="https://..." 
                                      className="h-9 text-sm"
                                      {...field}
                                      value={field.value || ''}
                                      readOnly
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            {/* 3D Model action buttons */}
                            <div className="flex items-center gap-2">
                              {form.watch('model3dKey') && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  aria-label={t.productManagement.deleteModel3d}
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                  onClick={() => window.open(form.getValues('model3dKey'), '_blank')}
                                >
                                  <Eye className="w-4 h-4 me-1" />
                                  {t.productManagement.viewModel3d}
                                </Button>
                              )}
                              
                              <div className="relative">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                  onClick={() => {
                                    const fileInput = document.querySelector('#model3d-upload-btn') as HTMLInputElement;
                                    fileInput?.click();
                                  }}
                                >
                                  <Upload className="w-4 h-4 me-1" />
                                  {t.productManagement.uploadModel3d}
                                </Button>
                                <input
                                  id="model3d-upload-btn"
                                  type="file"
                                  accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleModel3dUpload(file);
                                      e.target.value = ''; // Reset input
                                    }
                                  }}
                                />
                              </div>
                              
                              {form.watch('model3dKey') && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  onClick={() => {
                                    setModel3dPreview(null);
                                    form.setValue('model3dKey', '');
                                    form.setValue('model3dFileName', '');
                                  }}
                                >
                                  <X className="w-4 h-4 me-1" />
                                  {t.productManagement.deleteModel3d}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    </KardexFormSection>
                  )}

                  <div className="space-y-4">
                    {/* Catalog PDF upload */}
                    <KardexFormSection id="catalog" title={t.productCatalog} icon={<Eye className="h-4 w-4 text-muted-foreground" />}>
                    <div className="space-y-3 border-t pt-4">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        {t.productCatalog}
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t.productManagement.catalogHelp}</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {/* Catalog upload */}
                        <div className="space-y-2">
                          <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            {catalogPreview ? (
                              <div className="relative">
                                <div className="bg-red-50 p-4 rounded-lg">
                                  <FileText className="mx-auto h-12 w-12 text-red-600" />
                                  <p className="mt-2 text-sm text-gray-700">{form.getValues('catalogFileName') || t.productManagement.catalogFilename}</p>

                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  aria-label={t.delete}
                                  className="absolute top-2 end-2 h-6 w-6 p-0 z-10"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    // Optimistic update: Remove from UI immediately
                                    setCatalogPreview(null);
                                    form.setValue('pdfCatalogUrl', '');
                                    form.setValue('catalogFileName', '');
                                    
                                    // Update editingProduct to trigger UI refresh
                                    if (editingProduct) {
                                      setEditingProduct({
                                        ...editingProduct,
                                        pdfCatalogUrl: '',
                                        catalogFileName: ''
                                      } as any);
                                      
                                      // Then update the database
                                      try {
                                        await apiRequest(`/api/products/${editingProduct.id}`, {
                                          method: 'PATCH',
                                          body: {
                                            pdfCatalogUrl: '',
                                            catalogFileName: ''
                                          }
                                        });
                                        console.log('✅ [CATALOG DELETE] Catalog removed from database');
                                        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                                      } catch (error) {
                                        console.error('❌ [CATALOG DELETE] Failed to remove catalog:', error);
                                        toast({
                                          variant: "destructive",
                                          title: t.error,
                                          description: t.productManagement.removeCatalogError
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="py-4">
                                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600">{t.productManagement.clickToSelectCatalog}</p>
                                <p className="text-xs text-gray-500">{t.productManagement.onlyPDF}</p>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="application/pdf"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCatalogUpload(file);
                              }}
                            />
                          </div>
                          {uploadingCatalog && (
                            <div className="flex items-center justify-center text-sm text-blue-600">
                              <RefreshCw className="h-4 w-4 animate-spin me-2" />
                              {t.productManagement.uploadingFile}
                            </div>
                          )}
                        </div>

                        {/* Catalog settings */}
                        <div className="space-y-3">
                          <FormField
                            control={form.control}
                            name="showCatalogToCustomers"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm font-medium">{t.productManagement.showToCustomersLabel}</FormLabel>
                                  <div className="text-xs text-gray-500">{t.productManagement.catalogDownloadable}</div>
                                </div>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="pdfCatalogUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm text-gray-600">{t.productManagement.catalogURL}</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="https://..." 
                                    className="h-9 text-sm"
                                    {...field}
                                    value={field.value || ''}
                                    readOnly
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {/* Catalog action buttons */}
                          <div className="flex items-center gap-2">
                            {form.watch('pdfCatalogUrl') && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                onClick={() => window.open(form.getValues('pdfCatalogUrl'), '_blank')}
                              >
                                <Eye className="w-4 h-4 me-1" />
                                {t.productManagement.viewCatalog}
                              </Button>
                            )}
                            
                            <div className="relative">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() => {
                                  const fileInput = document.querySelector('#catalog-upload-btn') as HTMLInputElement;
                                  fileInput?.click();
                                }}
                              >
                                <Upload className="w-4 h-4 me-1" />
                                {t.productManagement.uploadCatalog}
                              </Button>
                              <input
                                id="catalog-upload-btn"
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleCatalogUpload(file);
                                    e.target.value = ''; // Reset input
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    </KardexFormSection>

                    {/* MSDS upload - hidden for non-chemical products */}
                    {!form.watch('isNonChemical') && (
                    <KardexFormSection id="msds" title={t.msdsDocument} icon={<FileText className="h-4 w-4 text-muted-foreground" />}>
                    <div className="space-y-3 border-t pt-4">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t.msdsDocument}
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t.productManagement.msdsHelp}</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {/* MSDS upload */}
                        <div className="space-y-2">
                          <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            {msdsPreview ? (
                              <div className="relative">
                                <div className="bg-orange-50 p-4 rounded-lg">
                                  <FileText className="mx-auto h-12 w-12 text-orange-600" />
                                  <p className="mt-2 text-sm text-gray-700">{form.getValues('msdsFileName') || t.productManagement.msdsFilename}</p>

                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  aria-label={t.delete}
                                  className="absolute top-2 end-2 h-6 w-6 p-0 z-10"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    // Optimistic update: Remove from UI immediately
                                    setMsdsPreview(null);
                                    form.setValue('msdsUrl', '');
                                    form.setValue('msdsFileName', '');
                                    
                                    // Update editingProduct to trigger UI refresh
                                    if (editingProduct) {
                                      setEditingProduct({
                                        ...editingProduct,
                                        msdsUrl: '',
                                        msdsFileName: ''
                                      } as any);
                                      
                                      // Then update the database
                                      try {
                                        await apiRequest(`/api/products/${editingProduct.id}`, {
                                          method: 'PATCH',
                                          body: {
                                            msdsUrl: '',
                                            msdsFileName: ''
                                          }
                                        });
                                        console.log('✅ [MSDS DELETE] MSDS removed from database');
                                        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                                      } catch (error) {
                                        console.error('❌ [MSDS DELETE] Failed to remove MSDS:', error);
                                        toast({
                                          variant: "destructive",
                                          title: t.error,
                                          description: t.productManagement.removeMsdsError
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="py-4">
                                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600">{t.productManagement.clickToSelectMSDS}</p>
                                <p className="text-xs text-gray-500">{t.productManagement.onlyPDF}</p>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="application/pdf"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleMsdsUpload(file);
                              }}
                            />
                          </div>
                          {uploadingMsds && (
                            <div className="flex items-center justify-center text-sm text-blue-600">
                              <RefreshCw className="h-4 w-4 animate-spin me-2" />
                              {t.productManagement.uploadingFile}
                            </div>
                          )}
                        </div>

                        {/* MSDS settings */}
                        <div className="space-y-3">
                          <FormField
                            control={form.control}
                            name="showMsdsToCustomers"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm font-medium">{t.productManagement.showToCustomersLabel}</FormLabel>
                                  <div className="text-xs text-gray-500">{t.productManagement.msdsDownloadable}</div>
                                </div>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="msdsUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm text-gray-600">{t.productManagement.msdsURL}</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="https://..." 
                                    className="h-9 text-sm"
                                    {...field}
                                    value={field.value || ''}
                                    readOnly
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {/* MSDS action buttons */}
                          <div className="flex items-center gap-2">
                            {form.watch('msdsUrl') && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                onClick={() => window.open(form.getValues('msdsUrl'), '_blank')}
                              >
                                <Eye className="w-4 h-4 me-1" />
                                {t.productManagement.viewMSDS}
                              </Button>
                            )}
                            
                            <div className="relative">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                onClick={() => {
                                  const fileInput = document.querySelector('#msds-upload-btn') as HTMLInputElement;
                                  fileInput?.click();
                                }}
                              >
                                <FileText className="w-4 h-4 me-1" />
                                {t.productManagement.uploadMSDS}
                              </Button>
                              <input
                                id="msds-upload-btn"
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleMsdsUpload(file);
                                    e.target.value = ''; // Reset input
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    </KardexFormSection>
                    )}
                  </div>
                </div>
                </KardexFormSection>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    size="sm"
                    onClick={applyStockWithoutClosing}
                    disabled={!editingProduct || isSubmitting || Number(form.watch("inventoryAddition") || 0) <= 0}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : t.apply}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingProduct(null);
                      form.reset();
                    }}
                    className="px-6"
                  >
                    {t.productManagement.cancel}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-6 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting && <RefreshCw className="me-2 h-4 w-4 animate-spin" />}
                    {editingProduct ? t.productManagement.updateProduct : t.productManagement.addProduct}
                  </Button>
                </div>
              </form>
            </Form>
          </TooltipProvider>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.productManagement.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.productManagement.confirmDeleteDesc.replace('{name}', deletingProduct?.name || '')}
              <br />
              <span className="text-red-600 font-medium">
                {t.productManagement.confirmDeleteWarning}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingProduct(null)}>
              {t.productManagement.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProduct}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 me-2" />
              {t.productManagement.deleteProduct}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
