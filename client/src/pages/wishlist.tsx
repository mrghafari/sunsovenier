import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Heart, ShoppingCart, Trash2, ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { usePersistentCart } from "@/hooks/usePersistentCart";
import { apiRequest } from "@/lib/queryClient";
import { formatIQDAmount } from "@/lib/currency-utils";
import { useMultilingualToast } from "@/hooks/use-multilingual-toast";

interface WishlistItem {
  id: number;
  customerId: number;
  productId: number;
  createdAt: string;
  product?: {
    id: number;
    name: string;
    price: string;
    imageUrl?: string;
    imageUrls?: string[];
    inStock?: boolean;
    contractOnly?: boolean;
    priceUnit?: string;
    shortDescription?: string;
    description?: string;
  };
}

export default function WishlistPage() {
  const { t, direction } = useLanguage();
  const { isAuthenticated } = useCustomerAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useMultilingualToast();
  const { addToCart } = usePersistentCart();
  
  const COMPANY_LOGO = '/attached_assets/company-logo.png';

  const { data: wishlistItems = [], isLoading } = useQuery<WishlistItem[]>({
    queryKey: ["/api/customer/wishlist"],
    enabled: isAuthenticated,
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest(`/api/customer/wishlist/${productId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/wishlist"] });
      toast({
        title: t.shop?.removedFromWishlist || "Removed from wishlist",
        variant: "default",
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/customer/wishlist/all", {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/wishlist"] });
      toast({
        title: t.shop?.wishlistCleared || "Wishlist cleared",
        variant: "default",
      });
    },
  });

  const handleAddToCart = (product: WishlistItem['product']) => {
    if (!product) return;
    if (product.contractOnly) {
      toast({ title: "errorOccurred", description: "این کالا فقط از طریق قرارداد در چک‌اوت قابل افزودن است.", variant: "destructive" });
      return;
    }
    addToCart(product.id, 1);
    toast({
      title: t.shop?.addedToCart || "Added to cart",
      variant: "default",
    });
  };

  const getProductImage = (product: WishlistItem['product']) => {
    if (!product) return COMPANY_LOGO;
    if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
      return product.imageUrls[0];
    }
    return product.imageUrl || COMPANY_LOGO;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={direction}>
        <Card className="p-8 max-w-md text-center">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {t.shop?.loginToViewWishlist || "Please log in to view your wishlist"}
          </h2>
          <p className="text-gray-500 mb-4">
            {t.shop?.loginWishlistDescription || "Save your favorite products and access them anytime"}
          </p>
          <Button onClick={() => navigate("/shop")}>
            {t.shop?.goToShop || "Go to Shop"}
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8" dir={direction}>
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-5 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={direction}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/shop")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.shop?.backToShop || "Back to Shop"}
            </Button>
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500 fill-current" />
              <h1 className="text-2xl font-bold">
                {t.shop?.myWishlist || "My Wishlist"}
              </h1>
              <Badge variant="secondary" className="ml-2">
                {wishlistItems.length} {t.shop?.items || "items"}
              </Badge>
            </div>
          </div>
          
          {wishlistItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t.shop?.clearAll || "Clear All"}
            </Button>
          )}
        </div>

        {wishlistItems.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-600">
              {t.shop?.wishlistEmpty || "Your wishlist is empty"}
            </h2>
            <p className="text-gray-500 mb-6">
              {t.shop?.wishlistEmptyDescription || "Browse our products and add your favorites here"}
            </p>
            <Button onClick={() => navigate("/shop")}>
              <Package className="w-4 h-4 mr-2" />
              {t.shop?.browseProducts || "Browse Products"}
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((item) => (
              <Card key={item.id} className="group overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  <img
                    src={getProductImage(item.product)}
                    alt={item.product?.name || "Product"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = COMPANY_LOGO;
                      e.currentTarget.classList.add('object-contain', 'p-4');
                      e.currentTarget.classList.remove('object-cover');
                    }}
                  />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 p-1.5 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm shadow-lg text-red-500 hover:bg-red-50 hover:scale-110 transition-all duration-200"
                    onClick={() => removeFromWishlistMutation.mutate(item.productId)}
                    disabled={removeFromWishlistMutation.isPending}
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </Button>

                  {item.product && !item.product.inStock && (
                    <Badge variant="destructive" className="absolute bottom-2 left-2">
                      {t.shop?.outOfStock || "Out of Stock"}
                    </Badge>
                  )}
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                    {item.product?.name || "Unknown Product"}
                  </h3>
                  
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                    {item.product?.shortDescription || item.product?.description || ""}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xl font-bold text-green-600">
                        {item.product?.price ? formatIQDAmount(parseFloat(item.product.price)) : "0 IQD"}
                      </span>
                      {item.product?.priceUnit && (
                        <span className="text-sm text-gray-500 ml-1">
                          / {item.product.priceUnit}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleAddToCart(item.product)}
                      disabled={!item.product?.inStock || item.product.contractOnly}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {t.shop?.addToCart || "Add to Cart"}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeFromWishlistMutation.mutate(item.productId)}
                      disabled={removeFromWishlistMutation.isPending}
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
