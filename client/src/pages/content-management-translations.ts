/**
 * Strings used by the content-management editor itself.  These are kept
 * separate from the public-site catalogue because this screen also edits the
 * catalogue and must not accidentally use the selected content language.
 */
export type ContentManagementLanguage = 'en' | 'fa' | 'ar' | 'ku' | 'tr';

type Dictionary = Record<string, string>;

const en: Dictionary = {
  'Back to Site Management': 'Back to Site Management', 'Content Management': 'Content Management',
  'Manage website content, images, and multilingual text': 'Manage website content, images, and multilingual text',
  'Text Content': 'Text Content', Images: 'Images', Translations: 'Translations', 'Theme Settings': 'Theme Settings',
  'Live Chat': 'Live Chat', 'Loading content...': 'Loading content...', 'No content found for this section and language': 'No content found for this section and language',
  Active: 'Active', Inactive: 'Inactive', Save: 'Save', Cancel: 'Cancel', Edit: 'Edit', Remove: 'Remove',
  Upload: 'Upload', 'Upload Image': 'Upload Image', 'Loading...': 'Loading...', 'No images found': 'No images found',
  'Language Settings': 'Language Settings', 'Save Settings': 'Save Settings', Enabled: 'Enabled', Disabled: 'Disabled',
  'Site Language Settings': 'Site Language Settings', 'Enable or disable languages shown in the site language menu. At least one language must remain enabled.': 'Enable or disable languages shown in the site language menu. At least one language must remain enabled.',
  'Language settings saved successfully': 'Language settings saved successfully', 'Saving...': 'Saving...',
  'Settings Control': 'Settings Control', 'Homepage Categories': 'Homepage Categories', 'Products Display': 'Products Display', 'Category Products': 'Category Products', 'Site Languages': 'Site Languages', 'Save Changes': 'Save Changes',
  'Image uploaded': 'Image uploaded', 'Image was saved to S3 and its link was updated.': 'Image was saved to S3 and its link was updated.', 'Upload error': 'Upload error', 'Category updated': 'Category updated', 'Changes saved successfully.': 'Changes saved successfully.', 'Error': 'Error', 'Changes could not be saved.': 'Changes could not be saved.', 'Content updated': 'Content updated', 'Content changes saved successfully.': 'Content changes saved successfully.', 'Content created': 'Content created', 'New content created successfully.': 'New content created successfully.', 'Image uploaded successfully.': 'Image uploaded successfully.', 'Image deleted': 'Image deleted', 'Image deleted successfully.': 'Image deleted successfully.', 'Image deletion error': 'Image deletion error', 'Image could not be deleted. Please try again.': 'Image could not be deleted. Please try again.', 'Category products updated': 'Category products updated', 'Product assignments saved successfully.': 'Product assignments saved successfully.', 'Update error': 'Update error', 'Could not save product assignments.': 'Could not save product assignments.', 'Tawk.to settings updated': 'Tawk.to settings updated', 'Live chat settings saved successfully.': 'Live chat settings saved successfully.', 'Update failed': 'Update failed', 'Failed to save Tawk.to settings.': 'Failed to save Tawk.to settings.', 'Invalid file': 'Invalid file', 'Please select an image file.': 'Please select an image file.',
};

const fa: Dictionary = {
  'Back to Site Management': 'بازگشت به مدیریت سایت', 'Content Management': 'مدیریت محتوا',
  'Manage website content, images, and multilingual text': 'مدیریت محتوای سایت، تصاویر و متن چندزبانه',
  'Text Content': 'محتوای متنی', Images: 'تصاویر', Translations: 'ترجمه‌ها', 'Theme Settings': 'تنظیمات قالب',
  'Live Chat': 'گفتگوی آنلاین', 'Loading content...': 'در حال بارگذاری محتوا...', 'No content found for this section and language': 'محتوایی برای این بخش و زبان یافت نشد',
  Active: 'فعال', Inactive: 'غیرفعال', Save: 'ذخیره', Cancel: 'لغو', Edit: 'ویرایش', Remove: 'حذف',
  Upload: 'آپلود', 'Upload Image': 'آپلود تصویر', 'Loading...': 'در حال بارگذاری...', 'No images found': 'تصویری یافت نشد',
  'Language Settings': 'تنظیمات زبان', 'Save Settings': 'ذخیره تنظیمات', Enabled: 'فعال', Disabled: 'غیرفعال',
  'Site Language Settings': 'مدیریت زبان‌های سایت', 'Enable or disable languages shown in the site language menu. At least one language must remain enabled.': 'زبان‌های نمایش‌داده‌شده در منوی زبان سایت را فعال یا غیرفعال کنید. حداقل یک زبان باید فعال باشد.',
  'Language settings saved successfully': 'تنظیمات زبان با موفقیت ذخیره شد', 'Saving...': 'در حال ذخیره...',
  'Settings Control': 'کنترل تنظیمات', 'Homepage Categories': 'دسته‌بندی‌های صفحه اصلی', 'Products Display': 'نمایش محصولات', 'Category Products': 'محصولات دسته‌بندی', 'Site Languages': 'زبان‌های سایت', 'Save Changes': 'ذخیره تغییرات',
  'Image uploaded': 'تصویر آپلود شد', 'Image was saved to S3 and its link was updated.': 'تصویر در S3 ذخیره و لینک آن به‌روز شد.', 'Upload error': 'خطا در آپلود', 'Category updated': 'دسته‌بندی به‌روزرسانی شد', 'Changes saved successfully.': 'تغییرات با موفقیت ذخیره شد.', 'Error': 'خطا', 'Changes could not be saved.': 'ذخیره‌سازی انجام نشد.', 'Content updated': 'محتوا به‌روزرسانی شد', 'Content changes saved successfully.': 'تغییرات محتوا با موفقیت ذخیره شد.', 'Content created': 'محتوا ایجاد شد', 'New content created successfully.': 'محتوای جدید با موفقیت ایجاد شد.', 'Image uploaded successfully.': 'تصویر با موفقیت آپلود شد.', 'Image deleted': 'تصویر حذف شد', 'Image deleted successfully.': 'تصویر با موفقیت حذف شد.', 'Image deletion error': 'خطا در حذف تصویر', 'Image could not be deleted. Please try again.': 'تصویر حذف نشد. لطفاً دوباره تلاش کنید.', 'Category products updated': 'محصولات دسته‌بندی به‌روزرسانی شد', 'Product assignments saved successfully.': 'اختصاص محصولات با موفقیت ذخیره شد.', 'Update error': 'خطا در به‌روزرسانی', 'Could not save product assignments.': 'خطا در ذخیره اختصاص محصولات.', 'Tawk.to settings updated': 'تنظیمات Tawk.to به‌روزرسانی شد', 'Live chat settings saved successfully.': 'تنظیمات گفتگوی آنلاین ذخیره شد.', 'Update failed': 'به‌روزرسانی ناموفق بود', 'Failed to save Tawk.to settings.': 'ذخیره تنظیمات Tawk.to ناموفق بود.', 'Invalid file': 'فایل غیرمجاز', 'Please select an image file.': 'لطفاً یک فایل تصویر انتخاب کنید',
};

const ar: Dictionary = {
  'Back to Site Management': 'العودة إلى إدارة الموقع', 'Content Management': 'إدارة المحتوى',
  'Manage website content, images, and multilingual text': 'إدارة محتوى الموقع والصور والنصوص متعددة اللغات',
  'Text Content': 'المحتوى النصي', Images: 'الصور', Translations: 'الترجمات', 'Theme Settings': 'إعدادات المظهر',
  'Live Chat': 'المحادثة المباشرة', 'Loading content...': 'جارٍ تحميل المحتوى...', 'No content found for this section and language': 'لم يتم العثور على محتوى لهذا القسم واللغة',
  Active: 'نشط', Inactive: 'غير نشط', Save: 'حفظ', Cancel: 'إلغاء', Edit: 'تعديل', Remove: 'حذف',
  Upload: 'رفع', 'Upload Image': 'رفع صورة', 'Loading...': 'جارٍ التحميل...', 'No images found': 'لم يتم العثور على صور',
  'Language Settings': 'إعدادات اللغة', 'Save Settings': 'حفظ الإعدادات', Enabled: 'مفعّل', Disabled: 'معطّل',
  'Site Language Settings': 'إعدادات لغات الموقع', 'Enable or disable languages shown in the site language menu. At least one language must remain enabled.': 'فعّل أو عطّل اللغات المعروضة في قائمة لغات الموقع. يجب إبقاء لغة واحدة مفعّلة على الأقل.',
  'Language settings saved successfully': 'تم حفظ إعدادات اللغة بنجاح', 'Saving...': 'جارٍ الحفظ...',
  'Settings Control': 'التحكم بالإعدادات', 'Homepage Categories': 'فئات الصفحة الرئيسية', 'Products Display': 'عرض المنتجات', 'Category Products': 'منتجات الفئات', 'Site Languages': 'لغات الموقع', 'Save Changes': 'حفظ التغييرات',
  'Image uploaded': 'تم رفع الصورة', 'Image was saved to S3 and its link was updated.': 'تم حفظ الصورة في S3 وتحديث رابطها.', 'Upload error': 'خطأ في الرفع', 'Category updated': 'تم تحديث الفئة', 'Changes saved successfully.': 'تم حفظ التغييرات بنجاح.', 'Error': 'خطأ', 'Changes could not be saved.': 'تعذر حفظ التغييرات.', 'Content updated': 'تم تحديث المحتوى', 'Content changes saved successfully.': 'تم حفظ تغييرات المحتوى بنجاح.', 'Content created': 'تم إنشاء المحتوى', 'New content created successfully.': 'تم إنشاء المحتوى الجديد بنجاح.', 'Image uploaded successfully.': 'تم رفع الصورة بنجاح.', 'Image deleted': 'تم حذف الصورة', 'Image deleted successfully.': 'تم حذف الصورة بنجاح.', 'Image deletion error': 'خطأ في حذف الصورة', 'Image could not be deleted. Please try again.': 'تعذر حذف الصورة. حاول مرة أخرى.', 'Category products updated': 'تم تحديث منتجات الفئة', 'Product assignments saved successfully.': 'تم حفظ تعيينات المنتجات بنجاح.', 'Update error': 'خطأ في التحديث', 'Could not save product assignments.': 'تعذر حفظ تعيينات المنتجات.', 'Tawk.to settings updated': 'تم تحديث إعدادات Tawk.to', 'Live chat settings saved successfully.': 'تم حفظ إعدادات المحادثة المباشرة.', 'Update failed': 'فشل التحديث', 'Failed to save Tawk.to settings.': 'فشل حفظ إعدادات Tawk.to.', 'Invalid file': 'ملف غير صالح', 'Please select an image file.': 'يرجى اختيار ملف صورة.',
};

const tr: Dictionary = {
  'Back to Site Management': 'Site Yönetimine Dön', 'Content Management': 'İçerik Yönetimi',
  'Manage website content, images, and multilingual text': 'Web sitesi içeriğini, görselleri ve çok dilli metinleri yönetin',
  'Text Content': 'Metin İçeriği', Images: 'Görseller', Translations: 'Çeviriler', 'Theme Settings': 'Tema Ayarları',
  'Live Chat': 'Canlı Sohbet', 'Loading content...': 'İçerik yükleniyor...', 'No content found for this section and language': 'Bu bölüm ve dil için içerik bulunamadı',
  Active: 'Aktif', Inactive: 'Pasif', Save: 'Kaydet', Cancel: 'İptal', Edit: 'Düzenle', Remove: 'Kaldır',
  Upload: 'Yükle', 'Upload Image': 'Görsel Yükle', 'Loading...': 'Yükleniyor...', 'No images found': 'Görsel bulunamadı',
  'Language Settings': 'Dil Ayarları', 'Save Settings': 'Ayarları Kaydet', Enabled: 'Etkin', Disabled: 'Devre dışı',
  'Site Language Settings': 'Site Dil Ayarları', 'Enable or disable languages shown in the site language menu. At least one language must remain enabled.': 'Site dil menüsünde gösterilen dilleri etkinleştirin veya devre dışı bırakın. En az bir dil etkin kalmalıdır.',
  'Language settings saved successfully': 'Dil ayarları başarıyla kaydedildi', 'Saving...': 'Kaydediliyor...',
  'Settings Control': 'Ayar Kontrolü', 'Homepage Categories': 'Ana Sayfa Kategorileri', 'Products Display': 'Ürün Görünümü', 'Category Products': 'Kategori Ürünleri', 'Site Languages': 'Site Dilleri', 'Save Changes': 'Değişiklikleri Kaydet',
  'Image uploaded': 'Görsel yüklendi', 'Image was saved to S3 and its link was updated.': 'Görsel S3 üzerine kaydedildi ve bağlantısı güncellendi.', 'Upload error': 'Yükleme hatası', 'Category updated': 'Kategori güncellendi', 'Changes saved successfully.': 'Değişiklikler başarıyla kaydedildi.', 'Error': 'Hata', 'Changes could not be saved.': 'Değişiklikler kaydedilemedi.', 'Content updated': 'İçerik güncellendi', 'Content changes saved successfully.': 'İçerik değişiklikleri başarıyla kaydedildi.', 'Content created': 'İçerik oluşturuldu', 'New content created successfully.': 'Yeni içerik başarıyla oluşturuldu.', 'Image uploaded successfully.': 'Görsel başarıyla yüklendi.', 'Image deleted': 'Görsel silindi', 'Image deleted successfully.': 'Görsel başarıyla silindi.', 'Image deletion error': 'Görsel silme hatası', 'Image could not be deleted. Please try again.': 'Görsel silinemedi. Lütfen tekrar deneyin.', 'Category products updated': 'Kategori ürünleri güncellendi', 'Product assignments saved successfully.': 'Ürün atamaları başarıyla kaydedildi.', 'Update error': 'Güncelleme hatası', 'Could not save product assignments.': 'Ürün atamaları kaydedilemedi.', 'Tawk.to settings updated': 'Tawk.to ayarları güncellendi', 'Live chat settings saved successfully.': 'Canlı sohbet ayarları başarıyla kaydedildi.', 'Update failed': 'Güncelleme başarısız', 'Failed to save Tawk.to settings.': 'Tawk.to ayarları kaydedilemedi.', 'Invalid file': 'Geçersiz dosya', 'Please select an image file.': 'Lütfen bir görsel dosyası seçin.',
};

// Kurdish currently shares the Sorani script with the Persian UI for the
// editor controls.  Content values themselves are never translated here.
const ku: Dictionary = {
  ...en,
  'Back to Site Management': 'گەڕانەوە بۆ بەڕێوەبردنی ماڵپەڕ',
  'Content Management': 'بەڕێوەبردنی ناوەڕۆک',
  'Manage website content, images, and multilingual text': 'بەڕێوەبردنی ناوەڕۆک و وێنە و دەقی فرەزمانی ماڵپەڕ',
  'Text Content': 'ناوەڕۆکی دەقی', Images: 'وێنەکان', Translations: 'وەرگێڕانەکان', 'Theme Settings': 'ڕێکخستنەکانی ڕووکار',
  'Live Chat': 'گفتوگۆی ڕاستەوخۆ', 'Loading content...': 'ناوەڕۆک بار دەکرێت...', 'No content found for this section and language': 'هیچ ناوەڕۆکێک بۆ ئەم بەش و زمانە نەدۆزرایەوە',
  Active: 'چالاک', Inactive: 'ناچالاک', Save: 'پاشەکەوتکردن', Cancel: 'هەڵوەشاندنەوە', Edit: 'دەستکاریکردن', Remove: 'سڕینەوە',
  Upload: 'بارکردن', 'Upload Image': 'بارکردنی وێنە', 'Loading...': 'بار دەکرێت...', 'No images found': 'هیچ وێنەیەک نەدۆزرایەوە',
  'Language Settings': 'ڕێکخستنەکانی زمان', 'Save Settings': 'پاشەکەوتکردنی ڕێکخستنەکان', Enabled: 'چالاکە', Disabled: 'ناچالاکە',
  'Site Language Settings': 'ڕێکخستنەکانی زمانی ماڵپەڕ', 'Language settings saved successfully': 'ڕێکخستنەکانی زمان بە سەرکەوتوویی پاشەکەوت کران', 'Saving...': 'پاشەکەوت دەکرێت...',
  'Settings Control': 'کۆنترۆڵی ڕێکخستنەکان', 'Homepage Categories': 'پۆلەکانی پەڕەی سەرەکی', 'Products Display': 'پیشاندانی بەرهەمەکان', 'Category Products': 'بەرهەمەکانی پۆل', 'Site Languages': 'زمانەکانی ماڵپەڕ', 'Save Changes': 'پاشەکەوتکردنی گۆڕانکارییەکان',
  'Image uploaded': 'وێنەکە بارکرا', 'Upload error': 'هەڵەی بارکردن', 'Category updated': 'پۆلەکە نوێکرایەوە', 'Changes saved successfully.': 'گۆڕانکارییەکان بە سەرکەوتوویی پاشەکەوت کران.', Error: 'هەڵە',
  'Changes could not be saved.': 'نەتوانرا گۆڕانکارییەکان پاشەکەوت بکرێن.', 'Content updated': 'ناوەڕۆک نوێکرایەوە', 'Content created': 'ناوەڕۆک دروستکرا', 'Image deleted': 'وێنەکە سڕایەوە',
  'Image deletion error': 'هەڵەی سڕینەوەی وێنە', 'Category products updated': 'بەرهەمەکانی پۆل نوێکرانەوە', 'Update error': 'هەڵەی نوێکردنەوە',
  'Tawk.to settings updated': 'ڕێکخستنەکانی Tawk.to نوێکرانەوە', 'Update failed': 'نوێکردنەوە سەرکەوتوو نەبوو', 'Invalid file': 'فایلی نادروست',
  'Please select an image file.': 'تکایە فایلێکی وێنە هەڵبژێرە',
};

Object.assign(en, {
  'Could not save language settings. Please try again.': 'Could not save language settings. Please try again.',
  'Language settings could not be loaded.': 'Language settings could not be loaded.',
  'The server returned an unexpected response.': 'The server returned an unexpected response.',
  'Try again': 'Try again',
  'The latest language settings could not be refreshed. Your current edits are still available.': 'The latest language settings could not be refreshed. Your current edits are still available.',
  'Enable language': 'Enable language',
  'First-visit language policy': 'First-visit language policy',
  'Choose which language a visitor sees when they first arrive. Their saved manual language choice always takes priority on later visits.': 'Choose which language a visitor sees when they first arrive. Their saved manual language choice always takes priority on later visits.',
  'Initial language method': 'Initial language method',
  'Use visitor country (IP)': 'Use visitor country (IP)',
  'Always use selected language': 'Always use selected language',
  'IP mode uses the visitor’s country for the first visit. If unavailable or that language is disabled, the selected language is used.': 'IP mode uses the visitor’s country for the first visit. If unavailable or that language is disabled, the selected language is used.',
  'Fixed mode shows the selected language on a visitor’s first visit.': 'Fixed mode shows the selected language on a visitor’s first visit.',
  'Fallback language': 'Fallback language',
  'Selected initial language': 'Selected initial language',
  'This language is used when country detection cannot choose an enabled language, and as the fixed first-visit language.': 'This language is used when country detection cannot choose an enabled language, and as the fixed first-visit language.',
});

Object.assign(fa, {
  'Could not save language settings. Please try again.': 'ذخیره تنظیمات زبان انجام نشد. لطفاً دوباره تلاش کنید.',
  'Language settings could not be loaded.': 'بارگذاری تنظیمات زبان انجام نشد.',
  'The server returned an unexpected response.': 'پاسخ غیرمنتظره‌ای از سرور دریافت شد.',
  'Try again': 'تلاش دوباره',
  'The latest language settings could not be refreshed. Your current edits are still available.': 'تنظیمات زبان به‌روز نشد. ویرایش‌های فعلی شما حفظ شده‌اند.',
  'Enable language': 'فعال‌سازی زبان',
  'First-visit language policy': 'سیاست زبان در نخستین بازدید',
  'Choose which language a visitor sees when they first arrive. Their saved manual language choice always takes priority on later visits.': 'زبان نمایش‌داده‌شده به بازدیدکننده در ورود نخست را انتخاب کنید. انتخاب دستی ذخیره‌شدهٔ او در بازدیدهای بعدی همیشه اولویت دارد.',
  'Initial language method': 'روش انتخاب زبان اولیه',
  'Use visitor country (IP)': 'استفاده از کشور بازدیدکننده (IP)',
  'Always use selected language': 'همیشه استفاده از زبان انتخاب‌شده',
  'IP mode uses the visitor’s country for the first visit. If unavailable or that language is disabled, the selected language is used.': 'در حالت IP، کشور بازدیدکننده برای تعیین زبان نخستین بازدید استفاده می‌شود. اگر اطلاعات در دسترس نباشد یا آن زبان غیرفعال باشد، زبان انتخاب‌شده به‌کار می‌رود.',
  'Fixed mode shows the selected language on a visitor’s first visit.': 'در حالت ثابت، زبان انتخاب‌شده در نخستین بازدید نمایش داده می‌شود.',
  'Fallback language': 'زبان جایگزین',
  'Selected initial language': 'زبان اولیه انتخاب‌شده',
  'This language is used when country detection cannot choose an enabled language, and as the fixed first-visit language.': 'اگر تشخیص کشور نتواند زبان فعالی را تعیین کند، و نیز در حالت ثابت برای نخستین بازدید، از این زبان استفاده می‌شود.',
});

Object.assign(ar, {
  'Could not save language settings. Please try again.': 'تعذر حفظ إعدادات اللغة. يُرجى المحاولة مرة أخرى.',
  'Language settings could not be loaded.': 'تعذر تحميل إعدادات اللغة.',
  'The server returned an unexpected response.': 'أعاد الخادم استجابة غير متوقعة.',
  'Try again': 'حاول مرة أخرى',
  'The latest language settings could not be refreshed. Your current edits are still available.': 'تعذر تحديث إعدادات اللغة الأخيرة. لا تزال تعديلاتك الحالية متاحة.',
  'Enable language': 'تفعيل اللغة',
  'First-visit language policy': 'سياسة اللغة في الزيارة الأولى',
  'Choose which language a visitor sees when they first arrive. Their saved manual language choice always takes priority on later visits.': 'اختر اللغة التي يراها الزائر عند دخوله لأول مرة. يظل اختياره اليدوي المحفوظ هو الأولوية في الزيارات اللاحقة.',
  'Initial language method': 'طريقة تحديد اللغة الأولية',
  'Use visitor country (IP)': 'استخدام بلد الزائر (IP)',
  'Always use selected language': 'استخدام اللغة المحددة دائماً',
  'IP mode uses the visitor’s country for the first visit. If unavailable or that language is disabled, the selected language is used.': 'يستخدم وضع IP بلد الزائر لتحديد اللغة في الزيارة الأولى. إذا تعذر تحديد البلد أو كانت لغته معطلة، تُستخدم اللغة المحددة.',
  'Fixed mode shows the selected language on a visitor’s first visit.': 'يعرض الوضع الثابت اللغة المحددة في الزيارة الأولى للزائر.',
  'Fallback language': 'اللغة الاحتياطية',
  'Selected initial language': 'اللغة الأولية المحددة',
  'This language is used when country detection cannot choose an enabled language, and as the fixed first-visit language.': 'تُستخدم هذه اللغة عندما يتعذر على تحديد البلد اختيار لغة مفعّلة، وكذلك كلغة الزيارة الأولى في الوضع الثابت.',
});

Object.assign(tr, {
  'Could not save language settings. Please try again.': 'Dil ayarları kaydedilemedi. Lütfen tekrar deneyin.',
  'Language settings could not be loaded.': 'Dil ayarları yüklenemedi.',
  'The server returned an unexpected response.': 'Sunucu beklenmeyen bir yanıt verdi.',
  'Try again': 'Tekrar deneyin',
  'The latest language settings could not be refreshed. Your current edits are still available.': 'Dil ayarları yenilenemedi. Mevcut düzenlemeleriniz korunuyor.',
  'Enable language': 'Dili etkinleştir',
  'First-visit language policy': 'İlk ziyaret dili politikası',
  'Choose which language a visitor sees when they first arrive. Their saved manual language choice always takes priority on later visits.': 'Ziyaretçinin ilk gelişinde göreceği dili seçin. Sonraki ziyaretlerde kaydedilmiş manuel dil tercihi her zaman önceliklidir.',
  'Initial language method': 'İlk dil belirleme yöntemi',
  'Use visitor country (IP)': 'Ziyaretçinin ülkesini kullan (IP)',
  'Always use selected language': 'Her zaman seçilen dili kullan',
  'IP mode uses the visitor’s country for the first visit. If unavailable or that language is disabled, the selected language is used.': 'IP modu, ilk ziyarette ziyaretçinin ülkesini kullanır. Ülke belirlenemezse veya ilgili dil devre dışıysa seçilen dil kullanılır.',
  'Fixed mode shows the selected language on a visitor’s first visit.': 'Sabit mod, ziyaretçinin ilk ziyaretinde seçilen dili gösterir.',
  'Fallback language': 'Yedek dil',
  'Selected initial language': 'Seçilen ilk dil',
  'This language is used when country detection cannot choose an enabled language, and as the fixed first-visit language.': 'Ülke tespiti etkin bir dil seçemediğinde ve sabit modda ilk ziyaret dili olarak bu dil kullanılır.',
});

export const contentManagementTranslations: Record<ContentManagementLanguage, Dictionary> = { en, fa, ar, ku, tr };

const additionalTranslations: Record<string, Dictionary> = {
  fa: {
    'Discount Banner Control': 'کنترل بنر تخفیف', 'AI Settings Control': 'کنترل تنظیمات هوش مصنوعی', 'Saving changes...': 'در حال ذخیره تغییرات...', 'Discount banner status': 'وضعیت بنر تخفیف', 'Discount banner text': 'متن بنر تخفیف', 'AI status': 'وضعیت هوش مصنوعی', 'AI message': 'پیام هوش مصنوعی', 'OpenAI API key': 'کلید API اوپن‌ای‌آی', 'Select category': 'انتخاب دسته‌بندی', 'Random display enabled': 'نمایش تصادفی فعال', 'Display products randomly in this category': 'نمایش تصادفی محصولات در این دسته‌بندی', 'Available store products': 'محصولات موجود فروشگاه', 'Selected': 'انتخاب شده', Select: 'انتخاب', 'Selected products': 'محصولات انتخاب شده', 'How to use:': 'نحوه استفاده:', 'Settings are saved automatically': 'تنظیمات به‌صورت خودکار ذخیره می‌شوند', 'Upload New Image': 'آپلود تصویر جدید', 'Choose Image': 'انتخاب تصویر', 'Uploading...': 'در حال آپلود...', 'Loading images...': 'در حال بارگذاری تصاویر...', View: 'مشاهده', 'No images found for this section': 'تصویری برای این بخش یافت نشد', 'Translation Management': 'مدیریت ترجمه‌ها', 'Manage multilingual content across all languages': 'مدیریت محتوای چندزبانه در همه زبان‌ها', 'Edit Homepage Categories': 'ویرایش دسته‌بندی‌های صفحه اصلی', 'Loading categories...': 'در حال بارگذاری دسته‌بندی‌ها...', 'No categories found.': 'دسته‌بندی‌ای یافت نشد.', 'Category name': 'نام دسته‌بندی', Description: 'توضیحات', 'Category image': 'تصویر دسته‌بندی', 'Upload new image': 'آپلود تصویر جدید', 'No description provided': 'توضیحی ثبت نشده است', 'In stock': 'موجود', 'Low stock': 'کمبود موجودی', 'Out of stock': 'ناموجود', 'No products found in this category': 'محصولی در این دسته‌بندی یافت نشد', 'Add products to this category first': 'ابتدا محصولات را به این دسته‌بندی اضافه کنید', 'Random display preview': 'پیش‌نمایش نمایش تصادفی', 'Example of how products appear on a category page': 'نمونه نمایش محصولات در صفحه دسته‌بندی',
  },
  ar: {
    'Discount Banner Control': 'التحكم في شريط الخصم', 'AI Settings Control': 'إعدادات الذكاء الاصطناعي', 'Saving changes...': 'جارٍ حفظ التغييرات...', 'Discount banner status': 'حالة شريط الخصم', 'Discount banner text': 'نص شريط الخصم', 'AI status': 'حالة الذكاء الاصطناعي', 'AI message': 'رسالة الذكاء الاصطناعي', 'OpenAI API key': 'مفتاح OpenAI API', 'Select category': 'اختر الفئة', 'Random display enabled': 'العرض العشوائي مفعّل', 'Display products randomly in this category': 'عرض المنتجات عشوائياً في هذه الفئة', 'Available store products': 'منتجات المتجر المتاحة', Selected: 'محدد', Select: 'اختيار', 'Selected products': 'المنتجات المحددة', 'How to use:': 'طريقة الاستخدام:', 'Settings are saved automatically': 'تُحفظ الإعدادات تلقائياً', 'Upload New Image': 'رفع صورة جديدة', 'Choose Image': 'اختر صورة', 'Uploading...': 'جارٍ الرفع...', 'Loading images...': 'جارٍ تحميل الصور...', View: 'عرض', 'No images found for this section': 'لم يتم العثور على صور لهذا القسم', 'Translation Management': 'إدارة الترجمة', 'Manage multilingual content across all languages': 'إدارة المحتوى متعدد اللغات', 'Edit Homepage Categories': 'تعديل فئات الصفحة الرئيسية', 'Loading categories...': 'جارٍ تحميل الفئات...', 'No categories found.': 'لم يتم العثور على فئات.', 'Category name': 'اسم الفئة', Description: 'الوصف', 'Category image': 'صورة الفئة', 'Upload new image': 'رفع صورة جديدة', 'No description provided': 'لا يوجد وصف',
  },
  tr: {
    'Discount Banner Control': 'İndirim Bandı Kontrolü', 'AI Settings Control': 'Yapay Zeka Ayarları', 'Saving changes...': 'Değişiklikler kaydediliyor...', 'Discount banner status': 'İndirim bandı durumu', 'Discount banner text': 'İndirim bandı metni', 'AI status': 'Yapay zeka durumu', 'AI message': 'Yapay zeka mesajı', 'OpenAI API key': 'OpenAI API anahtarı', 'Select category': 'Kategori seçin', 'Random display enabled': 'Rastgele gösterim etkin', 'Display products randomly in this category': 'Ürünleri bu kategoride rastgele göster', 'Available store products': 'Mevcut mağaza ürünleri', Selected: 'Seçildi', Select: 'Seç', 'Selected products': 'Seçili ürünler', 'How to use:': 'Kullanım:', 'Settings are saved automatically': 'Ayarlar otomatik kaydedilir', 'Upload New Image': 'Yeni Görsel Yükle', 'Choose Image': 'Görsel Seç', 'Uploading...': 'Yükleniyor...', 'Loading images...': 'Görseller yükleniyor...', View: 'Görüntüle', 'No images found for this section': 'Bu bölüm için görsel bulunamadı', 'Translation Management': 'Çeviri Yönetimi', 'Manage multilingual content across all languages': 'Tüm dillerde çok dilli içeriği yönetin', 'Edit Homepage Categories': 'Ana Sayfa Kategorilerini Düzenle', 'Loading categories...': 'Kategoriler yükleniyor...', 'No categories found.': 'Kategori bulunamadı.', 'Category name': 'Kategori adı', Description: 'Açıklama', 'Category image': 'Kategori görseli', 'Upload new image': 'Yeni görsel yükle', 'No description provided': 'Açıklama sağlanmadı',
  },
  ku: {
    'Discount Banner Control': 'کۆنترۆڵی بەنەری داشکاندن', 'AI Settings Control': 'ڕێکخستنەکانی زیرەکی دەستکرد', 'Saving changes...': 'گۆڕانکارییەکان پاشەکەوت دەکرێن...', 'Discount banner status': 'دۆخی بەنەری داشکاندن', 'Discount banner text': 'دەقی بەنەری داشکاندن', 'AI status': 'دۆخی زیرەکی دەستکرد', 'AI message': 'پەیامی زیرەکی دەستکرد', 'OpenAI API key': 'کلیلی APIی OpenAI', 'Select category': 'پۆل هەڵبژێرە', 'Random display enabled': 'پیشاندانی هەڕەمەکی چالاکە', 'Display products randomly in this category': 'بەرهەمەکان بە هەڕەمەکی لەم پۆلەدا پیشان بدە', 'Available store products': 'بەرهەمە بەردەستەکانی کۆگا', Selected: 'هەڵبژێردراوە', Select: 'هەڵبژێرە', 'Selected products': 'بەرهەمە هەڵبژێردراوەکان', 'How to use:': 'شێوازی بەکارهێنان:', 'Settings are saved automatically': 'ڕێکخستنەکان خۆکارانە پاشەکەوت دەکرێن', 'Upload New Image': 'وێنەی نوێ بار بکە', 'Choose Image': 'وێنە هەڵبژێرە', 'Uploading...': 'بار دەکرێت...', 'Loading images...': 'وێنەکان بار دەکرێن...', View: 'بینین', 'No images found for this section': 'هیچ وێنەیەک بۆ ئەم بەشە نەدۆزرایەوە', 'Translation Management': 'بەڕێوەبردنی وەرگێڕان', 'Manage multilingual content across all languages': 'بەڕێوەبردنی ناوەڕۆکی فرەزمانی بە هەموو زمانەکان', 'Edit Homepage Categories': 'دەستکاریکردنی پۆلەکانی پەڕەی سەرەکی', 'Loading categories...': 'پۆلەکان بار دەکرێن...', 'No categories found.': 'هیچ پۆلێک نەدۆزرایەوە.', 'Category name': 'ناوی پۆل', Description: 'وەسف', 'Category image': 'وێنەی پۆل', 'Upload new image': 'وێنەی نوێ بار بکە', 'No description provided': 'هیچ وەسفێک نییە',
  },
};

export function translateContentManagement(language: string, value: string): string {
  const dictionary = contentManagementTranslations[language as ContentManagementLanguage] || en;
  const translated = dictionary[value] || additionalTranslations[language]?.[value] || en[value];
  if (translated && (language === 'en' || translated !== value)) return translated;
  // Keep an untranslated editor key from silently leaking English into a
  // localized administration screen. This also provides a visible,
  // language-specific cue for newly added strings until their editorial
  // translation is added to the catalogue.
  const pendingLabel: Record<string, string> = {
    fa: 'ترجمه فارسی',
    ar: 'ترجمة عربية',
    ku: 'وەرگێڕانی کوردی',
    tr: 'Türkçe çeviri',
  };
  return language === 'en' ? value : `${pendingLabel[language] || 'Translation'}: ${value}`;
}