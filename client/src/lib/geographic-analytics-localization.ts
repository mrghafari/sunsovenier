import type { Language } from "@/lib/i18n";

export type GeographicAnalyticsCopy = {
  title: string; subtitle: string; totalRevenue: string; totalOrders: string;
  customers: string; regions: string; avgOrderValue: string; export: string;
  loading: string; last7Days: string; last30Days: string; last3Months: string;
  lastYear: string; regionalAnalysis: string; productPerformance: string;
  productsByRegion: string; trends: string; gpsTracking: string;
  revenueByRegion: string; ordersByRegion: string; topRegions: string;
  productSales: string; revenueDistribution: string; topProducts: string;
  salesTrends: string; orders: string; revenue: string; unitsSold: string;
  completeBreakdown: string; selectedPeriodHint: string; detailedAnalysis: string;
  noData: string; noRegionalData: string; loadingOrders: string;
  noOrders: string; order: string; customer: string; contact: string;
  status: string; payment: string; amount: string; date: string; category: string;
  country: string; city: string; productName: string; salesByRegion: string;
  quantity: string; chemicalProduct: string; summary: string; countries: string;
  cities: string; deliveryStaff: string; recentGps: string; latestGps: string;
  orderId: string; deliveryPerson: string; location: string; gpsCoordinates: string;
  accuracy: string; addressMatch: string; verificationTime: string; match: string;
  noMatch: string; noGpsData: string; gpsWillAppear: string; gpsPerformance: string;
  successByRegion: string; noGpsAnalytics: string; generateAnalytics: string;
  accuracyDistribution: string; accuracyByCity: string; noAccuracy: string;
  accuracyWillAppear: string; heatmap: string; heatmapSubtitle: string;
  gpsPoints: string; highAccuracy: string; needsReview: string; uniqueAreas: string;
  note: string; mapAll: string; gpsDetails: string; noHeatmap: string;
  heatmapWillAppear: string; all: string; showMore: string; hideMore: string;
  ordersIn: string; id: string; generatedAt: string; period: string;
  noProductTrends: string; overallProductComparison: string; productsSoldByRegion: string;
  detailedRevenueView: string; dailySales: string; dailyRevenue: string; successful: string;
  successRate: string; totalDeliveries: string; averageAccuracy: string; accuracyMeters: string;
  zoomIn: string; zoomOut: string; resetMap: string; mapGuide: string; denseAreas: string;
  bankTransfer: string; onlinePayment: string; cashPayment: string;
  showLess: string; rowsFirst: string; distributionMap: string; fullscreenMap: string;
  deliveryArea: string; pointCount: string; averageAccuracyShort: string; clickMap: string;
};

const en: GeographicAnalyticsCopy = {
  title:"Geographic Analytics", subtitle:"Track sales performance by region and product",
  totalRevenue:"Total Revenue", totalOrders:"Total Orders", customers:"Customers", regions:"Regions",
  avgOrderValue:"Average Order Value", export:"Export", loading:"Loading analytics data...",
  last7Days:"Last 7 Days", last30Days:"Last 30 Days", last3Months:"Last 3 Months", lastYear:"Last Year",
  regionalAnalysis:"Regional Analysis", productPerformance:"Product Performance", productsByRegion:"Products by Region",
  trends:"Trends", gpsTracking:"GPS Delivery Tracking", revenueByRegion:"Revenue by Region",
  ordersByRegion:"Orders by Region", topRegions:"Top Performing Regions", productSales:"Product Sales",
  revenueDistribution:"Revenue Distribution", topProducts:"Top Products", salesTrends:"Sales Trends Over Time",
  orders:"Orders", revenue:"Revenue", unitsSold:"Units Sold", completeBreakdown:"Complete Breakdown",
  selectedPeriodHint:"Track product sales during the selected period", detailedAnalysis:"Detailed analysis of product performance across regions",
  noData:"No data available for the selected period", noRegionalData:"No regional data available",
  loadingOrders:"Loading orders...", noOrders:"No orders found for this region.", order:"Order", customer:"Customer",
  contact:"Contact", status:"Status", payment:"Payment", amount:"Amount", date:"Date", category:"Category",
  country:"Country", city:"City", productName:"Product Name", salesByRegion:"Sales by Region", quantity:"Quantity",
  chemicalProduct:"Chemical Product", summary:"Product Performance Summary", countries:"Countries", cities:"Cities",
  deliveryStaff:"Delivery Staff", recentGps:"Recent GPS Delivery Confirmations", latestGps:"Latest delivery location confirmations with GPS coordinates",
  orderId:"Order ID", deliveryPerson:"Delivery Person", location:"Location", gpsCoordinates:"GPS Coordinates",
  accuracy:"Accuracy", addressMatch:"Address Match", verificationTime:"Verification Time", match:"Match", noMatch:"No Match",
  noGpsData:"No GPS delivery data available", gpsWillAppear:"GPS tracking data will appear here when delivery confirmations are made",
  gpsPerformance:"GPS Delivery Performance", successByRegion:"Success rate and accuracy by region", noGpsAnalytics:"No GPS Analytics Data",
  generateAnalytics:"Generate analytics to view performance charts", accuracyDistribution:"GPS Accuracy Distribution",
  accuracyByCity:"Delivery accuracy by city", noAccuracy:"No Accuracy Data", accuracyWillAppear:"GPS accuracy data will appear here",
  heatmap:"GPS Delivery Heatmap", heatmapSubtitle:"Geographic distribution of delivery confirmations", gpsPoints:"GPS Points",
  highAccuracy:"High Accuracy", needsReview:"Needs Review", uniqueAreas:"Unique Areas", note:"Note",
  mapAll:"Show all in Google Maps", gpsDetails:"GPS Coordinate Details", noHeatmap:"No GPS Heatmap Data",
  heatmapWillAppear:"GPS delivery locations will appear here when confirmations are made", all:"All",
  showMore:"Show more deliveries", hideMore:"Hide remaining deliveries", ordersIn:"Orders in", id:"ID",
  generatedAt:"Generated At", period:"Period", noProductTrends:"No product trends data available for the selected period",
  overallProductComparison:"Overall sales comparison across all products", productsSoldByRegion:"Which products sold how much in which regions",
  detailedRevenueView:"Detailed view of which products sold where and how much revenue was generated", dailySales:"Daily Sales",
  dailyRevenue:"Daily Revenue", successful:"Successful", successRate:"Success Rate", totalDeliveries:"Total Deliveries",
  averageAccuracy:"Average Accuracy", accuracyMeters:"Accuracy (meters)", zoomIn:"Zoom in", zoomOut:"Zoom out", resetMap:"Reset map",
  mapGuide:"Map guide", denseAreas:"High-density areas", bankTransfer:"Bank transfer", onlinePayment:"Online payment", cashPayment:"Cash payment",
  showLess:"Show less", rowsFirst:"first 20 rows", distributionMap:"Delivery distribution map", fullscreenMap:"Delivery distribution map — full screen",
  deliveryArea:"Delivery area", pointCount:"Points", averageAccuracyShort:"Average accuracy", clickMap:"Open in Google Maps"
};

const fa: GeographicAnalyticsCopy = {
  ...en, title:"تحلیل جغرافیایی", subtitle:"عملکرد فروش را بر اساس منطقه و محصول پیگیری کنید",
  totalRevenue:"مجموع درآمد", totalOrders:"مجموع سفارش‌ها", customers:"مشتریان", regions:"مناطق",
  avgOrderValue:"میانگین ارزش سفارش", export:"خروجی", loading:"در حال بارگذاری داده‌های تحلیل...",
  last7Days:"۷ روز گذشته", last30Days:"۳۰ روز گذشته", last3Months:"۳ ماه گذشته", lastYear:"سال گذشته",
  regionalAnalysis:"تحلیل منطقه‌ای", productPerformance:"عملکرد محصولات", productsByRegion:"محصولات بر اساس منطقه",
  trends:"روندها", gpsTracking:"رهگیری تحویل GPS", revenueByRegion:"درآمد بر اساس منطقه", ordersByRegion:"سفارش‌ها بر اساس منطقه",
  topRegions:"مناطق برتر", productSales:"فروش محصولات", revenueDistribution:"توزیع درآمد", topProducts:"محصولات برتر",
  salesTrends:"روند فروش در طول زمان", orders:"سفارش‌ها", revenue:"درآمد", unitsSold:"واحد فروخته‌شده",
  completeBreakdown:"جزئیات کامل", selectedPeriodHint:"فروش محصول در دوره انتخاب‌شده", detailedAnalysis:"تحلیل جزئی عملکرد محصولات در مناطق مختلف",
  noData:"داده‌ای برای دوره انتخاب‌شده موجود نیست", noRegionalData:"داده منطقه‌ای موجود نیست", loadingOrders:"در حال بارگذاری سفارش‌ها...",
  noOrders:"سفارشی برای این منطقه پیدا نشد.", order:"سفارش", customer:"مشتری", contact:"تماس", status:"وضعیت", payment:"پرداخت",
  amount:"مبلغ", date:"تاریخ", category:"دسته‌بندی", country:"کشور", city:"شهر", productName:"نام محصول", salesByRegion:"فروش بر اساس منطقه",
  quantity:"تعداد", chemicalProduct:"محصول شیمیایی", summary:"خلاصه عملکرد محصولات", countries:"کشورها", cities:"شهرها", deliveryStaff:"پرسنل تحویل",
  recentGps:"تأییدیه‌های اخیر تحویل GPS", latestGps:"آخرین تأییدیه‌های موقعیت تحویل با مختصات GPS", orderId:"شناسه سفارش",
  deliveryPerson:"تحویل‌دهنده", location:"موقعیت", gpsCoordinates:"مختصات GPS", accuracy:"دقت", addressMatch:"تطابق آدرس",
  verificationTime:"زمان تأیید", match:"مطابقت دارد", noMatch:"مطابقت ندارد", noGpsData:"داده تحویل GPS موجود نیست",
  gpsWillAppear:"داده رهگیری GPS پس از ثبت تأییدیه‌های تحویل نمایش داده می‌شود", gpsPerformance:"عملکرد تحویل GPS",
  successByRegion:"نرخ موفقیت و دقت بر اساس منطقه", noGpsAnalytics:"داده تحلیل GPS موجود نیست", generateAnalytics:"برای مشاهده نمودارهای عملکرد تحلیل ایجاد کنید",
  accuracyDistribution:"توزیع دقت GPS", accuracyByCity:"دقت تحویل بر اساس شهر", noAccuracy:"داده دقت موجود نیست", accuracyWillAppear:"داده دقت GPS اینجا نمایش داده می‌شود",
  heatmap:"نقشه حرارتی تحویل GPS", heatmapSubtitle:"توزیع جغرافیایی تأییدیه‌های تحویل", gpsPoints:"نقاط GPS", highAccuracy:"دقت بالا",
  needsReview:"نیازمند بررسی", uniqueAreas:"مناطق یکتا", note:"یادداشت", mapAll:"نمایش همه در Google Maps", gpsDetails:"جزئیات مختصات GPS",
  noHeatmap:"داده نقشه حرارتی GPS موجود نیست", heatmapWillAppear:"موقعیت‌های تحویل GPS پس از ثبت تأییدیه‌ها نمایش داده می‌شوند",
  all:"همه", showMore:"نمایش تحویل‌های بیشتر", hideMore:"مخفی کردن تحویل‌های باقی‌مانده", ordersIn:"سفارش‌های", id:"شناسه", generatedAt:"زمان ایجاد", period:"دوره",
  noProductTrends:"روندی برای دوره انتخاب‌شده موجود نیست", overallProductComparison:"مقایسه کلی فروش همه محصولات",
  productsSoldByRegion:"میزان فروش محصولات در مناطق مختلف", detailedRevenueView:"نمایش جزئیات محل فروش محصولات و درآمد ایجادشده",
  dailySales:"فروش روزانه", dailyRevenue:"درآمد روزانه", successful:"موفق", successRate:"نرخ موفقیت", totalDeliveries:"مجموع تحویل‌ها",
  averageAccuracy:"میانگین دقت", accuracyMeters:"دقت (متر)", zoomIn:"بزرگ‌نمایی", zoomOut:"کوچک‌نمایی", resetMap:"بازنشانی نقشه",
  mapGuide:"راهنمای نقشه", denseAreas:"مناطق پرتراکم", bankTransfer:"انتقال بانکی", onlinePayment:"پرداخت آنلاین", cashPayment:"پرداخت نقدی",
  showLess:"نمایش کمتر", rowsFirst:"۲۰ ردیف اول", distributionMap:"نقشه پراکندگی تحویل‌ها", fullscreenMap:"نقشه پراکندگی تحویل‌ها — تمام‌صفحه",
  deliveryArea:"منطقه تحویل", pointCount:"تعداد نقاط", averageAccuracyShort:"میانگین دقت", clickMap:"باز کردن در Google Maps"
};

const ar: GeographicAnalyticsCopy = { ...fa, title:"التحليلات الجغرافية", subtitle:"تتبع أداء المبيعات حسب المنطقة والمنتج", totalRevenue:"إجمالي الإيرادات", totalOrders:"إجمالي الطلبات", customers:"العملاء", regions:"المناطق", avgOrderValue:"متوسط قيمة الطلب", export:"تصدير", loading:"جارٍ تحميل بيانات التحليلات...", last7Days:"آخر 7 أيام", last30Days:"آخر 30 يوماً", last3Months:"آخر 3 أشهر", lastYear:"العام الماضي", regionalAnalysis:"التحليل الإقليمي", productPerformance:"أداء المنتجات", productsByRegion:"المنتجات حسب المنطقة", trends:"الاتجاهات", gpsTracking:"تتبع تسليم GPS", revenueByRegion:"الإيرادات حسب المنطقة", ordersByRegion:"الطلبات حسب المنطقة", topRegions:"أفضل المناطق أداءً", productSales:"مبيعات المنتجات", revenueDistribution:"توزيع الإيرادات", topProducts:"أفضل المنتجات", salesTrends:"اتجاهات المبيعات بمرور الوقت", orders:"الطلبات", revenue:"الإيرادات", unitsSold:"الوحدات المباعة", completeBreakdown:"التفصيل الكامل", selectedPeriodHint:"تتبع مبيعات المنتج خلال الفترة المحددة", detailedAnalysis:"تحليل مفصل لأداء المنتجات عبر المناطق", noData:"لا توجد بيانات للفترة المحددة", noRegionalData:"لا توجد بيانات إقليمية", loadingOrders:"جارٍ تحميل الطلبات...", noOrders:"لم يتم العثور على طلبات لهذه المنطقة.", order:"الطلب", customer:"العميل", contact:"جهة الاتصال", status:"الحالة", payment:"الدفع", amount:"المبلغ", date:"التاريخ", category:"الفئة", country:"الدولة", city:"المدينة", productName:"اسم المنتج", salesByRegion:"المبيعات حسب المنطقة", quantity:"الكمية", chemicalProduct:"منتج كيميائي", summary:"ملخص أداء المنتجات", countries:"الدول", cities:"المدن", deliveryStaff:"موظفو التسليم", recentGps:"أحدث تأكيدات تسليم GPS", latestGps:"أحدث تأكيدات مواقع التسليم مع إحداثيات GPS", orderId:"معرّف الطلب", deliveryPerson:"موظف التسليم", location:"الموقع", gpsCoordinates:"إحداثيات GPS", accuracy:"الدقة", addressMatch:"مطابقة العنوان", verificationTime:"وقت التحقق", match:"مطابق", noMatch:"غير مطابق", noGpsData:"لا توجد بيانات تسليم GPS", gpsWillAppear:"ستظهر بيانات تتبع GPS عند تسجيل التأكيدات", gpsPerformance:"أداء تسليم GPS", successByRegion:"معدل النجاح والدقة حسب المنطقة", noGpsAnalytics:"لا توجد بيانات تحليلات GPS", generateAnalytics:"أنشئ تحليلات لعرض مخططات الأداء", accuracyDistribution:"توزيع دقة GPS", accuracyByCity:"دقة التسليم حسب المدينة", noAccuracy:"لا توجد بيانات دقة", accuracyWillAppear:"ستظهر بيانات دقة GPS هنا", heatmap:"الخريطة الحرارية لتسليم GPS", heatmapSubtitle:"التوزيع الجغرافي لتأكيدات التسليم", gpsPoints:"نقاط GPS", highAccuracy:"دقة عالية", needsReview:"تحتاج مراجعة", uniqueAreas:"المناطق الفريدة", note:"ملاحظة", mapAll:"عرض الكل في Google Maps", gpsDetails:"تفاصيل إحداثيات GPS", noHeatmap:"لا توجد بيانات للخريطة الحرارية", heatmapWillAppear:"ستظهر مواقع تسليم GPS عند تسجيل التأكيدات", all:"الكل", showMore:"عرض المزيد من التسليمات", hideMore:"إخفاء التسليمات المتبقية", ordersIn:"الطلبات في", id:"المعرّف", generatedAt:"وقت الإنشاء", period:"الفترة" };
const tr: GeographicAnalyticsCopy = { ...en, title:"Coğrafi Analitik", subtitle:"Bölge ve ürüne göre satış performansını takip edin", totalRevenue:"Toplam Gelir", totalOrders:"Toplam Sipariş", customers:"Müşteriler", regions:"Bölgeler", avgOrderValue:"Ortalama Sipariş Değeri", export:"Dışa Aktar", loading:"Analiz verileri yükleniyor...", last7Days:"Son 7 Gün", last30Days:"Son 30 Gün", last3Months:"Son 3 Ay", lastYear:"Geçen Yıl", regionalAnalysis:"Bölgesel Analiz", productPerformance:"Ürün Performansı", productsByRegion:"Bölgeye Göre Ürünler", trends:"Trendler", gpsTracking:"GPS Teslimat Takibi", revenueByRegion:"Bölgeye Göre Gelir", ordersByRegion:"Bölgeye Göre Siparişler", topRegions:"En İyi Bölgeler", productSales:"Ürün Satışları", revenueDistribution:"Gelir Dağılımı", topProducts:"En İyi Ürünler", salesTrends:"Zaman İçinde Satış Trendleri", orders:"Siparişler", revenue:"Gelir", unitsSold:"Satılan Birimler", completeBreakdown:"Tam Ayrıntı", selectedPeriodHint:"Seçilen dönemde ürün satışlarını takip edin", detailedAnalysis:"Bölgelerde ürün performansının ayrıntılı analizi", noData:"Seçilen dönem için veri yok", noRegionalData:"Bölgesel veri yok", loadingOrders:"Siparişler yükleniyor...", noOrders:"Bu bölge için sipariş bulunamadı.", order:"Sipariş", customer:"Müşteri", contact:"İletişim", status:"Durum", payment:"Ödeme", amount:"Tutar", date:"Tarih", category:"Kategori", country:"Ülke", city:"Şehir", productName:"Ürün Adı", salesByRegion:"Bölgeye Göre Satış", quantity:"Miktar", chemicalProduct:"Kimyasal Ürün", summary:"Ürün Performansı Özeti", countries:"Ülkeler", cities:"Şehirler", deliveryStaff:"Teslimat Personeli", recentGps:"Son GPS Teslimat Onayları", latestGps:"GPS koordinatlarıyla son teslimat konumu onayları", orderId:"Sipariş Kimliği", deliveryPerson:"Teslimat Personeli", location:"Konum", gpsCoordinates:"GPS Koordinatları", accuracy:"Doğruluk", addressMatch:"Adres Eşleşmesi", verificationTime:"Doğrulama Zamanı", match:"Eşleşti", noMatch:"Eşleşmedi", noGpsData:"GPS teslimat verisi yok", gpsWillAppear:"Teslimat onayları yapıldığında GPS takip verileri burada görünür", gpsPerformance:"GPS Teslimat Performansı", successByRegion:"Bölgeye göre başarı oranı ve doğruluk", noGpsAnalytics:"GPS analitik verisi yok", generateAnalytics:"Performans grafiklerini görmek için analiz oluşturun", accuracyDistribution:"GPS Doğruluk Dağılımı", accuracyByCity:"Şehre göre teslimat doğruluğu", noAccuracy:"Doğruluk verisi yok", accuracyWillAppear:"GPS doğruluk verileri burada görünür", heatmap:"GPS Teslimat Isı Haritası", heatmapSubtitle:"Teslimat onaylarının coğrafi dağılımı", gpsPoints:"GPS Noktaları", highAccuracy:"Yüksek Doğruluk", needsReview:"İnceleme Gerekli", uniqueAreas:"Benzersiz Alanlar", note:"Not", mapAll:"Tümünü Google Maps'te göster", gpsDetails:"GPS Koordinat Ayrıntıları", noHeatmap:"GPS ısı haritası verisi yok", heatmapWillAppear:"Onaylar yapıldığında GPS teslimat konumları burada görünür", all:"Tümü", showMore:"Daha fazla teslimat göster", hideMore:"Kalan teslimatları gizle", ordersIn:"Siparişler:", id:"Kimlik", generatedAt:"Oluşturulma zamanı", period:"Dönem" };

Object.assign(ar, {
  noProductTrends:"لا توجد اتجاهات للمنتجات للفترة المحددة", overallProductComparison:"مقارنة إجمالي المبيعات بين المنتجات",
  productsSoldByRegion:"ما المنتجات المباعة وبأي كمية في المناطق", detailedRevenueView:"عرض مفصل لمواضع بيع المنتجات والإيرادات الناتجة",
  dailySales:"المبيعات اليومية", dailyRevenue:"الإيرادات اليومية", successful:"ناجح", successRate:"معدل النجاح", totalDeliveries:"إجمالي التسليمات",
  averageAccuracy:"متوسط الدقة", accuracyMeters:"الدقة (بالمتر)", zoomIn:"تكبير", zoomOut:"تصغير", resetMap:"إعادة ضبط الخريطة",
  mapGuide:"دليل الخريطة", denseAreas:"المناطق عالية الكثافة", bankTransfer:"تحويل مصرفي", onlinePayment:"دفع إلكتروني", cashPayment:"دفع نقدي",
  showLess:"عرض أقل", rowsFirst:"أول 20 صفاً", distributionMap:"خريطة توزيع التسليمات", fullscreenMap:"خريطة توزيع التسليمات — ملء الشاشة",
  deliveryArea:"منطقة التسليم", pointCount:"النقاط", averageAccuracyShort:"متوسط الدقة", clickMap:"فتح في Google Maps"
});
Object.assign(tr, {
  noProductTrends:"Seçilen dönem için ürün trendi verisi yok", overallProductComparison:"Tüm ürünlerde genel satış karşılaştırması",
  productsSoldByRegion:"Bölgelerde hangi ürünlerin ne kadar satıldığı", detailedRevenueView:"Ürünlerin nerede satıldığını ve oluşan geliri ayrıntılı gösterir",
  dailySales:"Günlük Satışlar", dailyRevenue:"Günlük Gelir", successful:"Başarılı", successRate:"Başarı Oranı", totalDeliveries:"Toplam Teslimat",
  averageAccuracy:"Ortalama Doğruluk", accuracyMeters:"Doğruluk (metre)", zoomIn:"Yakınlaştır", zoomOut:"Uzaklaştır", resetMap:"Haritayı sıfırla",
  mapGuide:"Harita açıklaması", denseAreas:"Yoğun bölgeler", bankTransfer:"Banka havalesi", onlinePayment:"Çevrimiçi ödeme", cashPayment:"Nakit ödeme",
  showLess:"Daha az göster", rowsFirst:"ilk 20 satır", distributionMap:"Teslimat dağılım haritası", fullscreenMap:"Teslimat dağılım haritası — tam ekran",
  deliveryArea:"Teslimat alanı", pointCount:"Noktalar", averageAccuracyShort:"Ortalama doğruluk", clickMap:"Google Maps'te aç"
});

export const geographicAnalyticsLocalization: Record<Language, GeographicAnalyticsCopy> = { en, fa, ar, tr };