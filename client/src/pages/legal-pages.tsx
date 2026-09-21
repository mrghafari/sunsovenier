import { Link } from "wouter";
import { FileText, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type LegalSection = { title: string; body: string };
type LegalCopy = {
  title: string;
  updated: string;
  intro: string;
  contact: string;
  contactLink: string;
  sections: LegalSection[];
};

const privacy: Record<string, LegalCopy> = {
  en: {
    title: "Privacy Policy", updated: "Last updated: September 21, 2026",
    intro: "Momtazchem respects your privacy. This policy explains what information we collect, why we use it, and the choices available to you.",
    contact: "Questions about this policy?", contactLink: "Contact Momtazchem",
    sections: [
      { title: "1. Information we collect", body: "We may collect account and identity information, contact details, order and delivery information, business details, payment status and transaction references, messages and support requests, and technical information such as IP address, browser, device, cookies, and website activity." },
      { title: "2. How we use information", body: "We use information to provide accounts, process orders and payments, arrange delivery, provide support, communicate service and order updates, maintain inventory, prevent fraud, secure the website, comply with legal obligations, and improve our services. We send optional marketing only where permitted." },
      { title: "3. Cookies", body: "We use essential cookies for sign-in, preferences, security, and shopping functions. We may use analytics to understand website performance. Browser settings can control cookies, but disabling essential cookies may affect website functions." },
      { title: "4. Sharing information", body: "We may share necessary information with providers that support hosting, payments, delivery, communications, analytics, and fraud prevention, or when required by law. We do not sell personal information for money." },
      { title: "5. Retention and security", body: "We retain information as needed to provide services, maintain transaction records, resolve disputes, prevent fraud, and meet legal obligations. We use reasonable safeguards, but no online system can guarantee absolute security." },
      { title: "6. Your rights", body: "Depending on applicable law, you may request access, correction, or deletion of your information, object to certain processing, or unsubscribe from marketing. Some records must be retained for legal, accounting, or security purposes." },
      { title: "7. International processing and children", body: "Information may be processed in other countries with appropriate safeguards where required. Our commercial services are not directed to children who cannot legally enter into a purchase agreement." },
      { title: "8. Changes", body: "We may update this policy when our services or legal obligations change. The date above identifies the latest version." },
    ],
  },
  fa: {
    title: "سیاست حفظ حریم خصوصی", updated: "آخرین به‌روزرسانی: ۳۰ شهریور ۱۴۰۵",
    intro: "ممتازکم به حریم خصوصی شما احترام می‌گذارد. این سیاست توضیح می‌دهد چه اطلاعاتی جمع‌آوری می‌کنیم، چرا از آن‌ها استفاده می‌کنیم و چه انتخاب‌هایی در اختیار شماست.",
    contact: "درباره این سیاست پرسشی دارید؟", contactLink: "با ممتازکم تماس بگیرید",
    sections: [
      { title: "۱. اطلاعاتی که جمع‌آوری می‌کنیم", body: "ممکن است اطلاعات حساب و هویت، راه‌های تماس، اطلاعات سفارش و تحویل، مشخصات تجاری، وضعیت پرداخت و شناسه تراکنش، پیام‌ها و درخواست‌های پشتیبانی و اطلاعات فنی مانند نشانی IP، مرورگر، دستگاه، کوکی‌ها و فعالیت وب‌سایت را جمع‌آوری کنیم." },
      { title: "۲. نحوه استفاده از اطلاعات", body: "از اطلاعات برای ایجاد حساب، پردازش سفارش و پرداخت، هماهنگی تحویل، پشتیبانی، ارسال اطلاعیه‌های سفارش و خدمات، مدیریت موجودی، جلوگیری از تقلب، امنیت وب‌سایت، رعایت الزامات قانونی و بهبود خدمات استفاده می‌کنیم. پیام‌های بازاریابی اختیاری فقط در صورت مجاز بودن ارسال می‌شوند." },
      { title: "۳. کوکی‌ها", body: "از کوکی‌های ضروری برای ورود، تنظیمات، امنیت و امکانات خرید استفاده می‌کنیم. ممکن است برای سنجش عملکرد سایت از ابزارهای تحلیلی استفاده شود. تنظیمات مرورگر امکان کنترل کوکی‌ها را می‌دهد، اما غیرفعال‌کردن کوکی‌های ضروری ممکن است عملکرد سایت را محدود کند." },
      { title: "۴. اشتراک‌گذاری اطلاعات", body: "ممکن است اطلاعات لازم را با ارائه‌دهندگان میزبانی، پرداخت، تحویل، ارتباطات، تحلیل و جلوگیری از تقلب یا در موارد الزام قانونی به اشتراک بگذاریم. اطلاعات شخصی شما را در برابر پول نمی‌فروشیم." },
      { title: "۵. نگهداری و امنیت", body: "اطلاعات را به‌اندازه لازم برای ارائه خدمات، نگهداری سوابق تراکنش، حل اختلاف، جلوگیری از تقلب و اجرای الزامات قانونی حفظ می‌کنیم. تدابیر امنیتی متعارف اعمال می‌شود، اما هیچ سامانه آنلاین امنیت مطلق را تضمین نمی‌کند." },
      { title: "۶. حقوق شما", body: "بر اساس قانون قابل اجرا، ممکن است حق دسترسی، اصلاح یا حذف اطلاعات، اعتراض به برخی پردازش‌ها و لغو دریافت پیام‌های بازاریابی را داشته باشید. برخی سوابق باید به دلایل قانونی، حسابداری یا امنیتی نگهداری شوند." },
      { title: "۷. پردازش بین‌المللی و کودکان", body: "ممکن است اطلاعات با تدابیر حفاظتی لازم در کشورهای دیگر پردازش شود. خدمات تجاری ما برای کودکانی که توان قانونی انعقاد قرارداد خرید ندارند ارائه نشده است." },
      { title: "۸. تغییرات", body: "ممکن است این سیاست با تغییر خدمات یا الزامات قانونی به‌روزرسانی شود. تاریخ بالا آخرین نسخه را نشان می‌دهد." },
    ],
  },
  ar: {
    title: "سياسة الخصوصية", updated: "آخر تحديث: 21 سبتمبر 2026",
    intro: "تحترم ممتازكم خصوصيتك. توضح هذه السياسة المعلومات التي نجمعها وأسباب استخدامها والخيارات المتاحة لك.",
    contact: "هل لديك أسئلة حول هذه السياسة؟", contactLink: "تواصل مع ممتازكم",
    sections: [
      { title: "1. المعلومات التي نجمعها", body: "قد نجمع معلومات الحساب والهوية وبيانات الاتصال ومعلومات الطلب والتوصيل وبيانات الأعمال وحالة الدفع ومراجع المعاملات والرسائل وطلبات الدعم ومعلومات تقنية مثل عنوان IP والمتصفح والجهاز وملفات تعريف الارتباط ونشاط الموقع." },
      { title: "2. كيفية استخدام المعلومات", body: "نستخدم المعلومات لإنشاء الحسابات ومعالجة الطلبات والمدفوعات وترتيب التوصيل وتقديم الدعم وإرسال تحديثات الخدمة والطلبات وإدارة المخزون ومنع الاحتيال وتأمين الموقع والامتثال للقانون وتحسين خدماتنا. لا نرسل التسويق الاختياري إلا حيث يسمح القانون." },
      { title: "3. ملفات تعريف الارتباط", body: "نستخدم ملفات ضرورية لتسجيل الدخول والتفضيلات والأمان ووظائف التسوق، وقد نستخدم التحليلات لفهم أداء الموقع. يمكنك التحكم بها من المتصفح، لكن تعطيل الملفات الضرورية قد يؤثر في وظائف الموقع." },
      { title: "4. مشاركة المعلومات", body: "قد نشارك المعلومات اللازمة مع مزودي الاستضافة والدفع والتوصيل والاتصالات والتحليلات ومنع الاحتيال أو عندما يطلب القانون ذلك. نحن لا نبيع المعلومات الشخصية مقابل المال." },
      { title: "5. الاحتفاظ والأمان", body: "نحتفظ بالمعلومات بقدر الحاجة لتقديم الخدمات وحفظ سجلات المعاملات وحل النزاعات ومنع الاحتيال والوفاء بالالتزامات القانونية. نطبق ضمانات معقولة، لكن لا يوجد نظام إلكتروني يضمن أماناً مطلقاً." },
      { title: "6. حقوقك", body: "وفقاً للقانون المعمول به، قد يحق لك طلب الوصول أو التصحيح أو الحذف أو الاعتراض على بعض المعالجة أو إلغاء الرسائل التسويقية. قد نحتفظ ببعض السجلات لأسباب قانونية أو محاسبية أو أمنية." },
      { title: "7. المعالجة الدولية والأطفال", body: "قد تعالج المعلومات في دول أخرى مع تطبيق الضمانات المطلوبة. خدماتنا التجارية غير موجهة للأطفال غير القادرين قانوناً على إبرام اتفاق شراء." },
      { title: "8. التغييرات", body: "قد نحدّث هذه السياسة عند تغير خدماتنا أو التزاماتنا القانونية. يوضح التاريخ أعلاه أحدث نسخة." },
    ],
  },
  tr: {
    title: "Gizlilik Politikası", updated: "Son güncelleme: 21 Eylül 2026",
    intro: "Momtazchem gizliliğinize saygı duyar. Bu politika hangi bilgileri topladığımızı, neden kullandığımızı ve seçimlerinizi açıklar.",
    contact: "Bu politika hakkında sorunuz mu var?", contactLink: "Momtazchem ile iletişime geçin",
    sections: [
      { title: "1. Topladığımız bilgiler", body: "Hesap ve kimlik bilgileri, iletişim bilgileri, sipariş ve teslimat bilgileri, işletme bilgileri, ödeme durumu ve işlem referansları, mesajlar ve destek talepleri ile IP adresi, tarayıcı, cihaz, çerezler ve site etkinliği gibi teknik bilgileri toplayabiliriz." },
      { title: "2. Bilgileri nasıl kullanırız", body: "Bilgileri hesap sağlamak, sipariş ve ödemeleri işlemek, teslimatı düzenlemek, destek sunmak, hizmet bildirimleri göndermek, envanteri yönetmek, dolandırıcılığı önlemek, siteyi korumak, yasal yükümlülüklere uymak ve hizmetleri geliştirmek için kullanırız." },
      { title: "3. Çerezler", body: "Oturum açma, tercihler, güvenlik ve alışveriş işlevleri için zorunlu çerezler kullanırız. Site performansı için analiz araçları kullanabiliriz. Tarayıcı ayarları çerezleri kontrol eder; zorunlu çerezlerin kapatılması bazı işlevleri etkileyebilir." },
      { title: "4. Bilgi paylaşımı", body: "Gerekli bilgileri barındırma, ödeme, teslimat, iletişim, analiz ve dolandırıcılık önleme sağlayıcılarıyla veya kanunen gerektiğinde paylaşabiliriz. Kişisel bilgileri para karşılığında satmayız." },
      { title: "5. Saklama ve güvenlik", body: "Bilgileri hizmet sunmak, işlem kayıtlarını tutmak, anlaşmazlıkları çözmek, dolandırıcılığı önlemek ve yasal yükümlülükleri yerine getirmek için gerekli süre boyunca saklarız. Makul güvenlik önlemleri uygularız; ancak hiçbir çevrimiçi sistem mutlak güvenlik sağlayamaz." },
      { title: "6. Haklarınız", body: "Uygulanabilir hukuka göre bilgilerinize erişme, düzeltme veya silme, belirli işlemlere itiraz etme ve pazarlama mesajlarından çıkma hakkınız olabilir. Bazı kayıtların yasal, muhasebe veya güvenlik nedenleriyle tutulması gerekebilir." },
      { title: "7. Uluslararası işleme ve çocuklar", body: "Bilgiler gerekli güvencelerle başka ülkelerde işlenebilir. Ticari hizmetlerimiz, satın alma sözleşmesi yapma yasal ehliyetine sahip olmayan çocuklara yönelik değildir." },
      { title: "8. Değişiklikler", body: "Hizmetlerimiz veya yasal yükümlülüklerimiz değiştiğinde bu politikayı güncelleyebiliriz. Yukarıdaki tarih en son sürümü gösterir." },
    ],
  },
};

const terms: Record<string, LegalCopy> = {
  en: {
    title: "Terms of Service", updated: "Last updated: September 21, 2026",
    intro: "These terms govern your use of the Momtazchem website, accounts, shopping services, and related features. By using the services, you agree to these terms.",
    contact: "Questions about these terms?", contactLink: "Contact Momtazchem",
    sections: [
      { title: "1. Eligibility and accounts", body: "You must have legal capacity to enter an agreement and provide accurate information. You are responsible for your account credentials and activity and must notify us promptly of unauthorized use." },
      { title: "2. Products and orders", body: "We aim to present products, prices, specifications, and availability accurately. Submitting an order is an offer to purchase; acceptance occurs when we confirm processing or shipment. We may reject or cancel orders for legitimate operational, legal, payment, availability, pricing-error, or fraud-prevention reasons." },
      { title: "3. Payments and invoices", body: "Checkout prices, currencies, taxes, delivery charges, discounts, and payment options apply subject to correction of clear errors. You authorize the selected provider to process payment. A proforma is not a final tax invoice unless identified or converted as such." },
      { title: "4. Delivery, returns, and refunds", body: "Delivery dates are estimates unless expressly guaranteed. You must provide accurate delivery details and inspect deliveries promptly. Returns and refunds depend on product condition and type, safety requirements, applicable law, and the terms communicated for the order." },
      { title: "5. Acceptable use and intellectual property", body: "You must not use the services unlawfully, fraudulently, infringe rights, disrupt security, submit false information, gain unauthorized access, or commercially exploit site content without permission. Website content and branding belong to Momtazchem or its licensors." },
      { title: "6. Third parties and liability", body: "Third-party payment, delivery, and communication services may have separate terms. To the extent permitted by law, services are provided as available. We do not exclude liability that cannot legally be excluded; other liability is limited to the amount paid for the relevant transaction." },
      { title: "7. Suspension, changes, and disputes", body: "We may restrict access to protect users, comply with law, prevent abuse, or enforce these terms. We may update these terms and will show the latest date above. Please contact us first so we can try to resolve any dispute; mandatory legal rights remain unaffected." },
    ],
  },
  fa: {
    title: "شرایط استفاده از خدمات", updated: "آخرین به‌روزرسانی: ۳۰ شهریور ۱۴۰۵",
    intro: "این شرایط بر استفاده شما از وب‌سایت، حساب‌ها، خدمات خرید و قابلیت‌های مرتبط ممتازکم حاکم است. با استفاده از خدمات، این شرایط را می‌پذیرید.",
    contact: "درباره این شرایط پرسشی دارید؟", contactLink: "با ممتازکم تماس بگیرید",
    sections: [
      { title: "۱. صلاحیت و حساب‌ها", body: "باید توان قانونی انعقاد قرارداد داشته و اطلاعات صحیح ارائه کنید. مسئول حفاظت از اطلاعات ورود و فعالیت حساب خود هستید و باید استفاده غیرمجاز را سریعاً به ما اطلاع دهید." },
      { title: "۲. محصولات و سفارش‌ها", body: "تلاش می‌کنیم محصولات، قیمت‌ها، مشخصات و موجودی را دقیق نمایش دهیم. ثبت سفارش پیشنهاد خرید است و پس از تأیید پردازش یا ارسال پذیرفته می‌شود. ممکن است سفارش را به دلایل عملیاتی، قانونی، پرداخت، موجودی، خطای آشکار قیمت یا جلوگیری از تقلب رد یا لغو کنیم." },
      { title: "۳. پرداخت و فاکتور", body: "قیمت، ارز، مالیات، هزینه تحویل، تخفیف و روش پرداخت نمایش‌داده‌شده در تسویه، با امکان اصلاح خطای آشکار، معتبر است. شما به ارائه‌دهنده انتخابی اجازه پردازش پرداخت می‌دهید. پیش‌فاکتور تا زمانی که تبدیل یا به‌عنوان فاکتور نهایی مشخص نشود، فاکتور مالیاتی نهایی نیست." },
      { title: "۴. تحویل، مرجوعی و بازپرداخت", body: "زمان تحویل تخمینی است مگر صراحتاً تضمین شده باشد. باید اطلاعات تحویل دقیق ارائه و کالا را به‌موقع بررسی کنید. مرجوعی و بازپرداخت به وضعیت و نوع محصول، الزامات ایمنی، قانون قابل اجرا و شرایط اعلام‌شده برای سفارش بستگی دارد." },
      { title: "۵. استفاده مجاز و مالکیت فکری", body: "نباید از خدمات به‌صورت غیرقانونی یا متقلبانه استفاده کنید، حقوق دیگران یا امنیت سایت را نقض کنید، اطلاعات نادرست بدهید، دسترسی غیرمجاز بگیرید یا بدون مجوز از محتوای سایت بهره‌برداری تجاری کنید. محتوا و علائم سایت متعلق به ممتازکم یا مجوزدهندگان آن است." },
      { title: "۶. خدمات ثالث و مسئولیت", body: "خدمات پرداخت، تحویل و ارتباطی اشخاص ثالث ممکن است شرایط جداگانه داشته باشند. در حدود قانون، خدمات بر مبنای وضعیت موجود ارائه می‌شوند. مسئولیت‌هایی که قانوناً قابل حذف نیستند مستثنا نمی‌شوند و سایر مسئولیت‌ها به مبلغ پرداخت‌شده برای تراکنش مربوط محدود است." },
      { title: "۷. تعلیق، تغییرات و اختلاف‌ها", body: "برای حفاظت از کاربران، رعایت قانون، جلوگیری از سوءاستفاده یا اجرای این شرایط ممکن است دسترسی را محدود کنیم. آخرین تاریخ شرایط در بالا درج می‌شود. لطفاً برای حل اختلاف ابتدا با ما تماس بگیرید؛ حقوق الزامی قانونی شما محفوظ است." },
    ],
  },
  ar: {
    title: "شروط الخدمة", updated: "آخر تحديث: 21 سبتمبر 2026",
    intro: "تحكم هذه الشروط استخدامك لموقع ممتازكم والحسابات وخدمات التسوق والميزات المرتبطة. باستخدام الخدمات فإنك توافق عليها.",
    contact: "هل لديك أسئلة حول هذه الشروط؟", contactLink: "تواصل مع ممتازكم",
    sections: [
      { title: "1. الأهلية والحسابات", body: "يجب أن تكون مؤهلاً قانونياً للتعاقد وأن تقدم معلومات دقيقة. أنت مسؤول عن بيانات الدخول ونشاط الحساب وعليك إبلاغنا فوراً عن أي استخدام غير مصرح به." },
      { title: "2. المنتجات والطلبات", body: "نسعى لعرض المنتجات والأسعار والمواصفات والتوفر بدقة. تقديم الطلب هو عرض للشراء ويقبل عند تأكيد المعالجة أو الشحن. قد نرفض أو نلغي الطلب لأسباب تشغيلية أو قانونية أو متعلقة بالدفع أو التوفر أو خطأ واضح في السعر أو منع الاحتيال." },
      { title: "3. المدفوعات والفواتير", body: "تطبق الأسعار والعملات والضرائب ورسوم التوصيل والخصومات وخيارات الدفع الظاهرة عند إتمام الطلب مع حق تصحيح الأخطاء الواضحة. أنت تفوض المزود المختار لمعالجة الدفع. الفاتورة الأولية ليست فاتورة ضريبية نهائية إلا إذا حُوّلت أو وُصفت كذلك." },
      { title: "4. التوصيل والإرجاع والاسترداد", body: "مواعيد التوصيل تقديرية ما لم تضمن صراحة. يجب تقديم تفاصيل صحيحة وفحص الشحنة سريعاً. يعتمد الإرجاع والاسترداد على حالة المنتج ونوعه ومتطلبات السلامة والقانون والشروط المعلنة للطلب." },
      { title: "5. الاستخدام المقبول والملكية الفكرية", body: "يحظر الاستخدام غير القانوني أو الاحتيالي أو انتهاك الحقوق أو الأمن أو تقديم معلومات كاذبة أو الوصول غير المصرح أو الاستغلال التجاري للمحتوى بلا إذن. محتوى الموقع وعلاماته ملك لممتازكم أو مرخصيها." },
      { title: "6. الأطراف الثالثة والمسؤولية", body: "قد تخضع خدمات الدفع والتوصيل والاتصال لشروط منفصلة. تقدم الخدمات حسب توفرها في حدود القانون. لا نستبعد مسؤولية لا يجوز استبعادها قانوناً، وتقتصر المسؤولية الأخرى على المبلغ المدفوع للمعاملة المعنية." },
      { title: "7. التعليق والتغييرات والنزاعات", body: "قد نقيد الوصول لحماية المستخدمين أو الامتثال للقانون أو منع الإساءة أو تنفيذ الشروط. قد نحدّثها وسيظهر أحدث تاريخ أعلاه. يرجى التواصل معنا أولاً لمحاولة حل النزاع، وتبقى الحقوق القانونية الإلزامية محفوظة." },
    ],
  },
  tr: {
    title: "Hizmet Şartları", updated: "Son güncelleme: 21 Eylül 2026",
    intro: "Bu şartlar Momtazchem web sitesi, hesapları, alışveriş hizmetleri ve ilgili özelliklerin kullanımını düzenler. Hizmetleri kullanarak şartları kabul edersiniz.",
    contact: "Bu şartlar hakkında sorunuz mu var?", contactLink: "Momtazchem ile iletişime geçin",
    sections: [
      { title: "1. Uygunluk ve hesaplar", body: "Sözleşme yapma yasal ehliyetine sahip olmalı ve doğru bilgi vermelisiniz. Hesap bilgilerinizden ve etkinliğinizden siz sorumlusunuz; yetkisiz kullanımı hemen bildirmelisiniz." },
      { title: "2. Ürünler ve siparişler", body: "Ürünleri, fiyatları, özellikleri ve stok durumunu doğru sunmaya çalışırız. Sipariş bir satın alma teklifidir; işleme veya gönderim onayıyla kabul edilir. Operasyonel, yasal, ödeme, stok, açık fiyat hatası veya dolandırıcılık önleme nedenleriyle siparişi reddedebilir ya da iptal edebiliriz." },
      { title: "3. Ödemeler ve faturalar", body: "Ödeme sırasında gösterilen fiyat, para birimi, vergi, teslimat ücreti, indirim ve ödeme seçenekleri açık hataların düzeltilmesi kaydıyla geçerlidir. Seçilen sağlayıcıya ödemeyi işleme yetkisi verirsiniz. Proforma, dönüştürülmedikçe veya bu şekilde belirtilmedikçe nihai vergi faturası değildir." },
      { title: "4. Teslimat, iade ve geri ödeme", body: "Açıkça garanti edilmedikçe teslimat tarihleri tahminidir. Doğru teslimat bilgisi vermeli ve teslimatı zamanında incelemelisiniz. İade ve geri ödeme ürün durumu ve türüne, güvenlik gereklerine, hukuka ve sipariş için bildirilen şartlara bağlıdır." },
      { title: "5. Kabul edilebilir kullanım ve fikri mülkiyet", body: "Hizmetleri hukuka aykırı veya hileli kullanamaz, hakları ya da güvenliği ihlal edemez, yanlış bilgi veremez, yetkisiz erişim sağlayamaz veya site içeriğini izinsiz ticari olarak kullanamazsınız. İçerik ve markalar Momtazchem veya lisans verenlerine aittir." },
      { title: "6. Üçüncü taraflar ve sorumluluk", body: "Ödeme, teslimat ve iletişim hizmetleri ayrı şartlara tabi olabilir. Hizmetler kanunun izin verdiği ölçüde mevcut haliyle sunulur. Yasal olarak kaldırılamayan sorumlulukları dışlamayız; diğer sorumluluk ilgili işlem için ödenen tutarla sınırlıdır." },
      { title: "7. Askıya alma, değişiklikler ve uyuşmazlıklar", body: "Kullanıcıları korumak, hukuka uymak, kötüye kullanımı önlemek veya şartları uygulamak için erişimi kısıtlayabiliriz. Güncel tarih yukarıda gösterilir. Uyuşmazlığı çözmeye çalışabilmemiz için önce bizimle iletişime geçin; zorunlu yasal haklarınız saklıdır." },
    ],
  },
};

privacy.ku = {
  title: "سیاسەتی تایبەتمەندی", updated: "دوا نوێکردنەوە: ٢١ی ئەیلوولی ٢٠٢٦",
  intro: "مومتازکیم ڕێز لە تایبەتمەندی تۆ دەگرێت. ئەم سیاسەتە ڕوون دەکاتەوە چ زانیارییەک کۆدەکەینەوە، بۆچی بەکاری دەهێنین و چ هەڵبژاردنێکت هەیە.",
  contact: "پرسیارت دەربارەی ئەم سیاسەتە هەیە؟", contactLink: "پەیوەندی بە مومتازکیمەوە بکە",
  sections: [
    { title: "١. زانیارییە کۆکراوەکان", body: "لەوانەیە زانیاری هەژمار و ناسنامە، زانیاری پەیوەندی، داواکاری و گەیاندن، زانیاری بازرگانی، دۆخی پارەدان و ژمارەی مامەڵە، پەیام و داواکاری پشتگیری، و زانیاری تەکنیکی وەک IP و وێبگەڕ و ئامێر و کوکی کۆبکەینەوە." },
    { title: "٢. چۆنیەتی بەکارهێنانی زانیاری", body: "زانیاری بۆ دروستکردنی هەژمار، جێبەجێکردنی داواکاری و پارەدان، ڕێکخستنی گەیاندن، پشتگیری، ئاگادارکردنەوە، بەڕێوەبردنی کۆگا، ڕێگری لە فێڵ، پاراستنی ماڵپەڕ و باشترکردنی خزمەتگوزاری بەکاردەهێنین." },
    { title: "٣. کوکییەکان", body: "کوکی پێویست بۆ چوونەژوورەوە، هەڵبژاردەکان، ئاسایش و کڕین بەکاردەهێنین. لەوانەیە شیکاری بۆ تێگەیشتن لە کارایی ماڵپەڕ بەکاربهێنین. ناچالاککردنی کوکی پێویست دەکرێت کاری ماڵپەڕ سنووردار بکات." },
    { title: "٤. هاوبەشکردنی زانیاری", body: "لەوانەیە زانیاری پێویست لەگەڵ دابینکەرانی میوانداری، پارەدان، گەیاندن، پەیوەندی، شیکاری و ڕێگری لە فێڵ یان کاتێک یاسا داوای دەکات هاوبەش بکەین. زانیاری کەسی بەرامبەر پارە نافرۆشین." },
    { title: "٥. هەڵگرتن و ئاسایش", body: "زانیاری بە ئەندازەی پێویست بۆ خزمەتگوزاری، تۆماری مامەڵە، چارەسەری ناکۆکی، ڕێگری لە فێڵ و پابەندبوون بە یاسا هەڵدەگرین. پارێزگاری گونجاو بەکاردەهێنین، بەڵام هیچ سیستەمێکی ئۆنلاین ئاسایشی تەواو دڵنیاناکات." },
    { title: "٦. مافەکانی تۆ", body: "بەپێی یاسای کارپێکراو، لەوانەیە مافی دەستگەیشتن، ڕاستکردنەوە یان سڕینەوەی زانیاری و وەستاندنی پەیامی بازاڕگەری هەبێت. هەندێک تۆمار دەبێت بۆ هۆکاری یاسایی، ژمێریاری یان ئاسایش بپارێزرێت." },
    { title: "٧. پرۆسەکردنی نێودەوڵەتی و منداڵان", body: "لەوانەیە زانیاری لە وڵاتانی تر بە پارێزگاری پێویست پرۆسە بکرێت. خزمەتگوزاری بازرگانی ئێمە بۆ منداڵانی بێ توانای یاسایی بۆ گرێبەستی کڕین نییە." },
    { title: "٨. گۆڕانکاری", body: "لەگەڵ گۆڕانی خزمەتگوزاری یان پابەندی یاسایی، لەوانەیە ئەم سیاسەتە نوێ بکەینەوە. ڕێکەوتی سەرەوە نوێترین وەشان پیشان دەدات." },
  ],
};

terms.ku = {
  title: "مەرجەکانی خزمەتگوزاری", updated: "دوا نوێکردنەوە: ٢١ی ئەیلوولی ٢٠٢٦",
  intro: "ئەم مەرجانە بەکارهێنانی ماڵپەڕ، هەژمار، خزمەتگوزاری کڕین و تایبەتمەندییە پەیوەندیدارەکانی مومتازکیم ڕێکدەخەن. بە بەکارهێنانی خزمەتگوزاری، ڕازی بە ئەم مەرجانە دەبیت.",
  contact: "پرسیارت دەربارەی ئەم مەرجانە هەیە؟", contactLink: "پەیوەندی بە مومتازکیمەوە بکە",
  sections: [
    { title: "١. شایستەیی و هەژمار", body: "دەبێت توانای یاسایی بۆ گرێبەستت هەبێت و زانیاری دروست بدەیت. تۆ بەرپرسی پاراستنی زانیاری چوونەژوورەوە و چالاکی هەژمارەکەتیت و دەبێت بەکارهێنانی بێ مۆڵەت زوو ڕابگەیەنیت." },
    { title: "٢. بەرهەم و داواکاری", body: "هەوڵدەدەین بەرهەم، نرخ، تایبەتمەندی و بەردەستبوون بە دروستی پیشان بدەین. ناردنی داواکاری پێشنیاری کڕینە و کاتێک پرۆسەکردن یان ناردن پشتڕاست دەکرێتەوە وەردەگیرێت. دەکرێت بۆ هۆکاری کارگێڕی، یاسایی، پارەدان، نەبوونی کاڵا، هەڵەی ڕوونی نرخ یان ڕێگری لە فێڵ ڕەت یان هەڵبوەشێنینەوە." },
    { title: "٣. پارەدان و پسوڵە", body: "نرخ، دراو، باج، کرێی گەیاندن، داشکاندن و شێوازی پارەدان لە کاتی تەواوکردنی کڕین کارپێدەکرێت، بە مافی ڕاستکردنەوەی هەڵەی ڕوون. پێش‌پسوڵە پسوڵەی باجی کۆتایی نییە تا بگۆڕدرێت یان وەک ئەوە دیاری بکرێت." },
    { title: "٤. گەیاندن، گەڕاندنەوە و پارەدانەوە", body: "ڕێکەوتی گەیاندن خەمڵاندنە مەگەر بە ڕوونی دڵنیایی بدرێت. دەبێت زانیاری گەیاندنی دروست بدەیت و کاڵا زوو بپشکنیت. گەڕاندنەوە و پارەدانەوە بە دۆخ و جۆری بەرهەم، پێداویستی ئاسایش، یاسا و مەرجی داواکاری پەیوەستە." },
    { title: "٥. بەکارهێنانی ڕێپێدراو و خاوەندارێتی هزری", body: "نابێت خزمەتگوزاری بە نایاسایی یان فێڵکارانە بەکاربهێنیت، ماف یان ئاسایش پێشێل بکەیت، زانیاری هەڵە بدەیت، دەستگەیشتنی بێ مۆڵەت بکەیت یان ناوەڕۆکی ماڵپەڕ بێ مۆڵەت بۆ بازرگانی بەکاربهێنیت." },
    { title: "٦. لایەنی سێیەم و بەرپرسیارێتی", body: "خزمەتگوزاری پارەدان، گەیاندن و پەیوەندی دەکرێت مەرجی جیاوازیان هەبێت. خزمەتگوزاری تا ئەو ڕادەیەی یاسا ڕێگەدەدات بە دۆخی بەردەست پێشکەش دەکرێت. بەرپرسیارێتی تر بە بڕی پارەی مامەڵەی پەیوەندیدار سنووردارە." },
    { title: "٧. ڕاگرتن، گۆڕانکاری و ناکۆکی", body: "بۆ پاراستنی بەکارهێنەر، پابەندبوون بە یاسا، ڕێگری لە خراپ بەکارهێنان یان جێبەجێکردنی مەرجەکان دەکرێت دەستگەیشتن سنووردار بکەین. تکایە بۆ چارەسەری ناکۆکی سەرەتا پەیوەندیمان پێوە بکە؛ مافە یاساییە ناچارییەکانت پارێزراون." },
  ],
};

function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { language, direction } = useLanguage();
  const copies = kind === "privacy" ? privacy : terms;
  const copy = copies[language] || copies.en;

  return (
    <div className="min-h-screen bg-slate-50 py-12" dir={direction}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-900 px-6 py-10 text-white sm:px-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              {kind === "privacy" ? <ShieldCheck className="h-7 w-7" /> : <FileText className="h-7 w-7" />}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-3 text-sm text-slate-300">{copy.updated}</p>
          </header>
          <main className="space-y-8 px-6 py-8 text-slate-700 sm:px-10 sm:py-10">
            <p className="text-base leading-8">{copy.intro}</p>
            {copy.sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                <p className="leading-8">{section.body}</p>
              </section>
            ))}
            <div className="border-t border-slate-200 pt-6 text-sm text-slate-600">
              {copy.contact}{" "}
              <Link href="/contact">
                <span className="cursor-pointer font-medium text-emerald-700 hover:underline">{copy.contactLink}</span>
              </Link>
            </div>
          </main>
        </article>
      </div>
    </div>
  );
}

export function PrivacyPolicy() {
  return <LegalPage kind="privacy" />;
}

export function TermsOfService() {
  return <LegalPage kind="terms" />;
}