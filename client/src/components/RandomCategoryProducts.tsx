import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ShoppingCart, ArrowRight, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/lib/i18n";

const RANDOM_PRODUCTS_COPY: Record<Language, {
  productsTitle: (category: string) => string;
  subtitle: (category: string) => string;
  emptyTitle: (category: string) => string;
  emptyDescription: string;
  contact: string;
  available: string;
  category: string;
  viewShop: string;
  viewAll: string;
}> = {
  en: {
    productsTitle: category => `Our ${category} Products`,
    subtitle: category => `Discover our comprehensive range of premium ${category} solutions`,
    emptyTitle: category => `No ${category} Products Yet`,
    emptyDescription: "Our product catalog is being updated. Please check back soon.",
    contact: "Contact Us for Information",
    available: "Available in Shop",
    category: "Category:",
    viewShop: "View in Shop",
    viewAll: "View All Shop Products",
  },
  ar: {
    productsTitle: category => `منتجات ${category}`,
    subtitle: category => `اكتشف مجموعتنا المتكاملة من حلول ${category} عالية الجودة`,
    emptyTitle: category => `لا توجد منتجات ضمن ${category} حتى الآن`,
    emptyDescription: "يجري تحديث كتالوج منتجاتنا. يرجى العودة قريبًا.",
    contact: "تواصل معنا للحصول على المعلومات",
    available: "متوفر في المتجر",
    category: "الفئة:",
    viewShop: "عرض في المتجر",
    viewAll: "عرض جميع منتجات المتجر",
  },
  tr: {
    productsTitle: category => `${category} Ürünlerimiz`,
    subtitle: category => `Üstün kaliteli ${category} çözümlerimizi keşfedin`,
    emptyTitle: category => `Henüz ${category} Ürünü Bulunmuyor`,
    emptyDescription: "Ürün kataloğumuz güncelleniyor. Lütfen yakında tekrar kontrol edin.",
    contact: "Bilgi İçin Bize Ulaşın",
    available: "Mağazada Mevcut",
    category: "Kategori:",
    viewShop: "Mağazada Görüntüle",
    viewAll: "Tüm Mağaza Ürünlerini Görüntüle",
  },
  fa: {
    productsTitle: category => `محصولات ${category}`,
    subtitle: category => `مجموعه کامل راهکارهای باکیفیت ${category} را مشاهده کنید`,
    emptyTitle: category => `هنوز محصولی در دسته ${category} موجود نیست`,
    emptyDescription: "کاتالوگ محصولات ما در حال به‌روزرسانی است. لطفاً به‌زودی دوباره مراجعه کنید.",
    contact: "تماس با ما برای اطلاعات بیشتر",
    available: "موجود در فروشگاه",
    category: "دسته‌بندی:",
    viewShop: "مشاهده در فروشگاه",
    viewAll: "مشاهده همه محصولات فروشگاه",
  },
};

interface Product {
  id: number;
  name: string;
  description: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  category: string;
  price?: string;
  priceUnit?: string;
}

interface RandomCategoryProductsProps {
  category: string;
  title?: string;
  categoryDisplayName?: string;
  hideTitle?: boolean;
}

export function RandomCategoryProducts({ category, title, categoryDisplayName, hideTitle = false }: RandomCategoryProductsProps) {
  const [, navigate] = useLocation();
  const { language, direction } = useLanguage();
  const copy = RANDOM_PRODUCTS_COPY[language];
  const isRTL = direction === 'rtl';
  
  const { data: productsResponse, isLoading, error } = useQuery({
    queryKey: ['/api/products/random', category],
    queryFn: async () => {
      const response = await fetch(`/api/products/random/${category}?limit=2`);
      if (!response.ok) {
        throw new Error('Failed to fetch random products');
      }
      return response.json();
    },
    enabled: !!category,
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (was cacheTime in v4)
  });

  const products = productsResponse?.data || [];
  
  // Ensure unique products and limit to exactly 2
  const uniqueProducts = (products as Product[]).reduce((acc: Product[], product: Product) => {
    const exists = acc.find(p => p.id === product.id);
    if (!exists && acc.length < 2) {
      acc.push(product);
    }
    return acc;
  }, []);

  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-br from-blue-50 to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-8 bg-gray-200 rounded w-80 mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="bg-white animate-pulse">
                <div className="aspect-video bg-gray-200"></div>
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const displayCategory = categoryDisplayName || category;
  const displayTitle = title || copy.productsTitle(displayCategory);
  
  const displaySubtitle = copy.subtitle(displayCategory);
  
  // Empty state when no products available
  if (error || !uniqueProducts || uniqueProducts.length === 0) {
    return (
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!hideTitle && (
            <div className={`text-center mb-12 ${isRTL ? 'rtl' : 'ltr'}`}>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {displayTitle}
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                {displaySubtitle}
              </p>
            </div>
          )}
          
          {/* Empty State */}
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
               {copy.emptyTitle(displayCategory)}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
               {copy.emptyDescription}
            </p>
            <Button 
              onClick={() => navigate('/contact')}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              data-testid="button-contact-for-information"
            >
               {copy.contact}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!hideTitle && (
          <div className={`text-center mb-12 ${isRTL ? 'rtl' : 'ltr'}`}>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {displayTitle}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {displaySubtitle}
            </p>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {uniqueProducts.map((product) => {
            const productImage = product.thumbnailUrl || product.imageUrl;
            return (
              <Card 
                key={product.id} 
                className="bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                onClick={() => navigate('/shop')}
                data-testid={`random-product-card-${product.id}`}
              >
                {productImage && (
                  <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
                    <img 
                      src={productImage} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'}`}>
                      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                         {copy.available}
                      </div>
                    </div>
                  </div>
                )}
                <CardContent className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                       {copy.category}{' '}
                      <span className="font-medium">{product.category}</span>
                    </div>
                    <div className={`flex items-center text-green-600 font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                       {copy.viewShop}
                      <ArrowRight className={`h-4 w-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Button 
            size="lg"
            onClick={() => navigate('/shop')}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold"
            data-testid="button-view-all-shop-products"
          >
            <ShoppingCart className={`h-5 w-5 ${isRTL ? 'mr-2' : 'ml-2'}`} />
             {copy.viewAll}
          </Button>
        </div>
      </div>
    </section>
  );
}