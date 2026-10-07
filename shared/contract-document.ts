import type { ShopContractDraftData, ContractDraftLanguage } from "@shared/contract-draft";
import type { IncotermCode } from "@shared/incoterms";
import { packagingTermsText, type ContractPackaging } from "./contract-packaging";

export type ContractDocumentItem = {
  productId: number | string;
  productName: string;
  maxQuantity: number | string;
  unitPrice: number | string;
};

export type ContractDocumentContext = {
  customerName: string;
  customerCode?: string | null;
  contractNumber: string;
  deliveryTerm: IncotermCode | null;
  items: ContractDocumentItem[];
  packaging?: ContractPackaging | null;
};

const filled = (text: string | number | undefined | null) => String(text ?? "").trim() || "[—]";
const text = (language: ContractDraftLanguage, values: Record<ContractDraftLanguage, string>) => values[language];
const render = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");

const copy = {
  fa: {
    title: "قرارداد فروش محصولات پتروشیمی", number: "شماره قرارداد", date: "تاریخ", type: "نوع معامله",
    domesticIran: "فروش داخلی ایران", domesticIraq: "فروش داخلی عراق", iraqExport: "صادرات به عراق",
    international: "فروش بین‌المللی", seller: "فروشنده", buyer: "خریدار", registration: "شناسه / ثبت",
    tax: "شناسه مالیاتی", address: "نشانی", country: "کشور", city: "شهر", postal: "کد پستی",
    representative: "نماینده و سمت", contact: "اطلاعات تماس", website: "وب‌سایت", customer: "مشتری",
    grade: "گرید / استاندارد", tolerance: "تلورانس کیفیت محصول", packaging: "بسته‌بندی / حمل", max: "حداکثر تعداد",
    weightAllowance: "سقف اضافه‌وزن کل سفارش",
    weightAllowanceUnknown: "در قرارداد مشخص نشده",
    price: "قیمت واحد (IQD)", unit: "واحد", quality: "کیفیت", quantityPackaging: "مقدار و بسته‌بندی",
    payment: "پرداخت", priceTitle: "قیمت", delivery: "تحویل و حمل", incoterm: "اینکوترم",
    location: "محل تحویل", deliveryDate: "تاریخ تحویل", law: "قانون حاکم و حل اختلاف",
    review: "این متن پیش‌نویس است و پیش از استفاده یا امضا باید توسط مشاور حقوقی بازبینی شود. هیچ‌یک از شروط، تضمین حقوقی یا تأیید نهایی طرفین تلقی نمی‌شود.",
    signature: "وضعیت: در انتظار بازبینی و امضای طرفین.", sellerSignature: "امضای فروشنده",
    buyerSignature: "امضای خریدار", paymentDays: "مهلت پرداخت", paymentMethod: "روش پرداخت",
    daysSuffix: "روز", terms: ["تعاریف", "موضوع قرارداد", "کیفیت و بازرسی", "مقدار و بسته‌بندی", "سقف اضافه‌وزن کل سفارش", "قیمت و ارز",
      "روش و مهلت پرداخت", "تحویل و حمل", "انتقال مالکیت و ریسک", "بیمه", "بازرسی و اعلام ایراد",
      "تعهدات فروشنده", "تعهدات خریدار", "ضمانت و حدود مسئولیت", "فورس‌ماژور", "تحریم‌ها و انطباق قانونی",
      "محرمانگی", "خسارت قراردادی", "فسخ", "قانون حاکم و حل اختلاف", "زبان قرارداد",
      "عدم واگذاری", "اطلاعیه‌ها", "کامل بودن قرارداد", "بازبینی و امضا", "وضعیت امضا"],
    methods: { advance: "پیش‌پرداخت و مانده", lc: "اعتبار اسنادی (LC)", tt: "حواله بانکی (TT)", credit: "فروش اعتباری" },
    clauses: [
      "در این قرارداد، «محصول» و «محموله» به اقلام مادهٔ ۲، «روز کاری» به روز کاری محل انجام تعهد و «COA» به گواهی تحلیل هر محموله گفته می‌شود.",
      "فروشنده متعهد به فروش و خریدار متعهد به خرید محصولات زیر، در حدود سقف‌ها و قیمت‌های توافق‌شده، است:\n{items}",
      "محصول باید با مشخصات و تلورانس درج‌شده در مادهٔ ۲ منطبق باشد. فروشنده COA ارائه می‌کند و خریدار می‌تواند پیش از بارگیری بازرسی مستقل ترتیب دهد.",
      "سقف تعداد هر محصول حداکثر مقدار مجاز قرارداد است؛ سفارش‌های قطعی قبلی از ظرفیت باقیمانده کسر می‌شوند. بسته‌بندی مطابق مشخصات مادهٔ ۲ است.",
      "سقف اضافه‌وزن تجمیعی کل سفارش نسبت به وزن سفارش‌شده: {weightAllowance}. این شرط مستقل از تلورانس کیفیت محصولات است.",
      "ارز فروش دینار عراق (IQD) است. قیمت واحد و حداکثر تعداد هر قلم در مادهٔ ۲ درج شده‌اند؛ هر تعدیل فقط با توافق کتبی طرفین معتبر است.",
      "روش پرداخت {method} و مهلت آن {days} روز است. جزئیات هر مرحله، زمان سررسید و تضمین‌های لازم باید پیش از امضا به‌طور روشن میان طرفین توافق شود.",
      "اینکوترم {incoterm}، محل تحویل {location} و تاریخ برنامه‌ریزی‌شدهٔ تحویل {deliveryDate} است. اسناد حمل و تحویل طبق توافق کتبی طرفین ارائه می‌شوند.",
      "انتقال مالکیت و ریسک مطابق اینکوترم انتخاب‌شده و مقررات لازم‌الاجرا انجام می‌شود؛ طرفین باید هر تفاوت را پیش از امضا صریحاً تعیین کنند.",
      "مسئولیت تهیه و هزینهٔ بیمه بر عهدهٔ طرفی است که طبق اینکوترم منتخب متصدی آن است؛ نوع پوشش و ذی‌نفع باید در اسناد معامله تعیین شود.",
      "خریدار باید مغایرت‌های قابل مشاهده را پس از دریافت در مهلت کتبی توافق‌شده اعلام کند. روش نمونه‌برداری و مرجع آزمون باید پیش از امضا تعیین شود.",
      "فروشنده محصول و اسناد توافق‌شده را طبق قرارداد آماده و تحویل می‌کند و اطلاعات صحیح مربوط به محموله را در اختیار خریدار می‌گذارد.",
      "خریدار بهای کالا را در موعد مقرر می‌پردازد، اطلاعات لازم برای حمل را ارائه می‌کند و مجوزهای واردات و استفاده را حسب مورد اخذ می‌کند.",
      "راهکار جبران خسارت، سقف مسئولیت و هر استثنا فقط در حدودی اعمال می‌شود که کتبی توافق و طبق قانون حاکم معتبر باشد؛ این بند جایگزین بررسی حقوقی نیست.",
      "طرفی که بر اثر واقعهٔ خارج از کنترل معقول خود قادر به اجرا نیست، باید بدون تأخیر طرف دیگر را مطلع و برای کاهش آثار و ازسرگیری اجرا اقدام کند.",
      "هر طرف مسئول رعایت قوانین صادرات، واردات، تحریم‌ها و مجوزهای قابل اعمال بر خود و معامله است؛ امکان اجرای معامله باید پیش از امضا بررسی شود.",
      "طرفین اطلاعات محرمانهٔ دریافتی را فقط برای اجرای این قرارداد به‌کار می‌برند و جز با رضایت کتبی یا الزام قانونی در اختیار ثالث نمی‌گذارند.",
      "هر خسارت قراردادی، روش محاسبه، سقف و موعد پرداخت آن باید به‌صورت روشن و کتبی میان طرفین توافق شود.",
      "شرایط فسخ، اخطار، مهلت رفع نقض و آثار فسخ باید در چارچوب قانون حاکم به‌طور کتبی تعیین شود.",
      "{law}",
      "زبان معتبر قرارداد {language} است. در صورت تهیهٔ نسخه‌های چندزبانه، نسخهٔ حاکم و روش حل اختلاف ترجمه‌ها باید پیش از امضا صریحاً تعیین شود.",
      "هیچ‌یک از طرفین بدون رضایت کتبی طرف دیگر، حقوق یا تعهدات خود را واگذار نمی‌کند، مگر آن‌که قانون حاکم ترتیب دیگری مقرر کرده باشد.",
      "اخطارها به نشانی‌ها و راه‌های تماس درج‌شده در قرارداد ارسال می‌شوند. تغییر نشانی باید به‌صورت کتبی به طرف دیگر اعلام شود.",
      "این قرارداد و پیوست‌های امضاشده، توافق طرفین دربارهٔ موضوع خود را تشکیل می‌دهند؛ هر اصلاح باید کتبی و به امضای طرفین برسد.",
      "این سند پیش‌نویس است. طرفین باید همهٔ شروط، ارقام و پیوست‌ها را بازبینی و نسخهٔ نهایی را پیش از اجرا امضا کنند.",
      "این پیش‌نویس امضاشده نیست و تا تکمیل بازبینی و امضای طرفین نباید قرارداد نهایی یا مجوز تحویل تلقی شود.",
    ],
  },
  en: {
    title: "Petrochemical Products Sales Agreement", number: "Contract number", date: "Date", type: "Transaction type",
    domesticIran: "Domestic sale in Iran", domesticIraq: "Domestic sale in Iraq", iraqExport: "Export to Iraq",
    international: "International sale", seller: "Seller", buyer: "Buyer", registration: "Registration",
    tax: "Tax ID", address: "Address", country: "Country", city: "City", postal: "Postal code",
    representative: "Representative and title", contact: "Contact details", website: "Website", customer: "Customer",
    grade: "Grade / standard", tolerance: "Product quality tolerance", packaging: "Packaging / transport", max: "Maximum quantity",
    weightAllowance: "Aggregate order overweight allowance",
    weightAllowanceUnknown: "Not specified in the contract",
    price: "Unit price (IQD)", unit: "units", quality: "Quality", quantityPackaging: "Quantity and packaging",
    payment: "Payment", priceTitle: "Price", delivery: "Delivery and transport", incoterm: "Incoterm",
    location: "Delivery location", deliveryDate: "Delivery date", law: "Governing law and dispute resolution",
    review: "This document is a draft and must be reviewed by qualified counsel before use or signature. No term is represented as legally validated or finally approved by the parties.",
    signature: "Status: pending review and signature by both parties.", sellerSignature: "Seller signature",
    buyerSignature: "Buyer signature", paymentDays: "Payment period", paymentMethod: "Payment method",
    daysSuffix: "days", terms: ["Definitions", "Subject matter", "Quality and inspection", "Quantity and packaging",
      "Aggregate order overweight allowance", "Price and currency", "Payment method and period", "Delivery and transport", "Title and risk", "Insurance",
      "Inspection and notice of defects", "Seller obligations", "Buyer obligations", "Warranty and liability",
      "Force majeure", "Sanctions and compliance", "Confidentiality", "Contractual damages", "Termination",
      "Governing law and disputes", "Contract language", "Assignment", "Notices", "Entire agreement",
      "Review and signature", "Signature status"],
    methods: { advance: "advance payment and balance", lc: "letter of credit (LC)", tt: "bank transfer (TT)", credit: "credit sale" },
    clauses: [
      "In this agreement, “Product” and “Shipment” mean the items in Article 2, “Business Day” means a business day at the place of performance, and “COA” means a shipment certificate of analysis.",
      "The Seller agrees to sell and the Buyer agrees to purchase the following Products, subject to the agreed caps and prices:\n{items}",
      "Products must meet the specifications and tolerances in Article 2. The Seller will provide a COA; the Buyer may arrange an independent pre-shipment inspection.",
      "Each product cap is the maximum quantity permitted under this agreement; completed prior orders reduce the remaining capacity. Packaging follows Article 2.",
      "Aggregate overweight allowance for the entire order, measured against ordered weight: {weightAllowance}. This is separate from product quality tolerances.",
      "The sale currency is Iraqi dinars (IQD). Unit prices and maximum quantities appear in Article 2. Any adjustment is effective only by written agreement.",
      "The payment method is {method}, with a period of {days} days. Installments, due dates, and required security must be expressly agreed before signature.",
      "The selected Incoterm is {incoterm}, the delivery location is {location}, and the scheduled delivery date is {deliveryDate}. Shipping documents follow the parties’ written agreement.",
      "Title and risk transfer under the selected Incoterm and applicable law. The parties must expressly resolve any divergence before signing.",
      "Insurance responsibility and cost rest with the party assigned that duty under the selected Incoterm. Coverage and beneficiary must be specified in the transaction documents.",
      "The Buyer must notify the Seller of observable non-conformities within the period agreed in writing after receipt. Sampling and testing procedures should be settled before signature.",
      "The Seller will prepare and deliver conforming Products and agreed documents and provide accurate shipment information.",
      "The Buyer will pay when due, provide information needed for transport, and obtain applicable import and use permits.",
      "Remedies, liability caps, and exclusions apply only to the extent expressly agreed and permitted by governing law; this clause is not a substitute for legal review.",
      "A party prevented from performing by an event beyond its reasonable control must promptly notify the other party and take reasonable steps to mitigate and resume performance.",
      "Each party is responsible for export, import, sanctions, and permit requirements applicable to it and the transaction. The transaction’s legal feasibility must be checked before signing.",
      "Each party will use confidential information only to perform this agreement and will not disclose it to a third party without written consent unless legally required.",
      "Any contractual damages, calculation method, cap, and due date must be clearly agreed in writing.",
      "Termination grounds, notice, cure periods, and consequences must be stated in writing consistently with governing law.",
      "{law}",
      "The contract language is {language}. If translated versions are prepared, the controlling version and interpretation of translations must be expressly agreed before signing.",
      "Neither party may assign its rights or obligations without the other party’s written consent, except as otherwise required by governing law.",
      "Notices must be sent to the addresses and contact channels stated in this agreement. A change of address must be notified in writing.",
      "This agreement and its signed appendices state the parties’ agreement on its subject matter. Amendments must be written and signed by both parties.",
      "This document is a draft. The parties must review all terms, figures, and appendices and sign a final version before performance.",
      "This draft is unsigned and must not be treated as a final contract or delivery authorization until review and signature by both parties.",
    ],
  },
  ar: {
    title: "اتفاقية بيع المنتجات البتروكيماوية", number: "رقم العقد", date: "التاريخ", type: "نوع المعاملة",
    domesticIran: "بيع محلي في إيران", domesticIraq: "بيع محلي في العراق", iraqExport: "تصدير إلى العراق",
    international: "بيع دولي", seller: "البائع", buyer: "المشتري", registration: "التسجيل",
    tax: "الرقم الضريبي", address: "العنوان", country: "البلد", city: "المدينة", postal: "الرمز البريدي",
    representative: "الممثل وصفته", contact: "بيانات الاتصال", website: "الموقع الإلكتروني", customer: "العميل",
    grade: "الدرجة / المعيار", tolerance: "سماحية جودة المنتج", packaging: "التعبئة / النقل", max: "الكمية القصوى",
    weightAllowance: "حد زيادة وزن الطلب الإجمالي",
    weightAllowanceUnknown: "غير محدد في العقد",
    price: "سعر الوحدة (IQD)", unit: "وحدة", quality: "الجودة", quantityPackaging: "الكمية والتعبئة",
    payment: "الدفع", priceTitle: "السعر", delivery: "التسليم والنقل", incoterm: "شرط إنكوترمز",
    location: "مكان التسليم", deliveryDate: "تاريخ التسليم", law: "القانون الحاكم وتسوية النزاعات",
    review: "هذه الوثيقة مسودة ويجب مراجعتها من مستشار قانوني مؤهل قبل استخدامها أو توقيعها. ولا يُفترض أن أي شرط مصدّق قانونياً أو معتمد نهائياً من الطرفين.",
    signature: "الحالة: بانتظار المراجعة والتوقيع من الطرفين.", sellerSignature: "توقيع البائع",
    buyerSignature: "توقيع المشتري", paymentDays: "مهلة الدفع", paymentMethod: "طريقة الدفع",
    daysSuffix: "أيام", terms: ["التعريفات", "موضوع العقد", "الجودة والفحص", "الكمية والتعبئة", "حد زيادة وزن الطلب الإجمالي", "السعر والعملة",
      "طريقة الدفع ومدته", "التسليم والنقل", "الملكية والمخاطر", "التأمين", "الفحص والإبلاغ عن العيوب",
      "التزامات البائع", "التزامات المشتري", "الضمان والمسؤولية", "القوة القاهرة", "العقوبات والامتثال",
      "السرية", "التعويضات التعاقدية", "الإنهاء", "القانون وتسوية النزاعات", "لغة العقد", "التنازل",
      "الإشعارات", "الاتفاق الكامل", "المراجعة والتوقيع", "حالة التوقيع"],
    methods: { advance: "دفعة مقدمة ورصيد", lc: "اعتماد مستندي (LC)", tt: "تحويل مصرفي (TT)", credit: "بيع آجل" },
    clauses: [
      "لأغراض هذه الاتفاقية، تعني «المنتجات» و«الشحنة» الأصناف الواردة في المادة ٢، ويعني «يوم العمل» يوم العمل في مكان تنفيذ الالتزام، وتعني «COA» شهادة تحليل الشحنة.",
      "يوافق البائع على بيع المنتجات التالية ويوافق المشتري على شرائها ضمن الحدود والأسعار المتفق عليها:\n{items}",
      "يجب أن تطابق المنتجات المواصفات والسماحيات في المادة ٢. يقدم البائع شهادة تحليل، ويجوز للمشتري ترتيب فحص مستقل قبل الشحن.",
      "الحد الأقصى لكل منتج هو الكمية القصوى المسموح بها؛ وتُخصم الطلبات السابقة المؤكدة من السعة المتبقية. تكون التعبئة وفق المادة ٢.",
      "حد زيادة الوزن الإجمالي للطلب، مقارنةً بالوزن المطلوب: {weightAllowance}. وهذا الشرط مستقل عن سماحيات جودة المنتجات.",
      "عملة البيع هي الدينار العراقي (IQD). ترد أسعار الوحدات والكميات القصوى في المادة ٢. ولا يسري أي تعديل إلا باتفاق خطي.",
      "طريقة الدفع هي {method} ومدته {days} يوماً. ويجب الاتفاق صراحةً قبل التوقيع على الدفعات ومواعيد الاستحقاق والضمانات المطلوبة.",
      "شرط إنكوترمز المختار هو {incoterm}، ومكان التسليم {location}، وتاريخ التسليم المخطط {deliveryDate}. تقدم مستندات الشحن وفق اتفاق الطرفين المكتوب.",
      "تنتقل الملكية والمخاطر وفق شرط إنكوترمز المختار والقانون الواجب التطبيق. وعلى الطرفين حسم أي تعارض صراحةً قبل التوقيع.",
      "تقع مسؤولية التأمين وتكاليفه على الطرف المكلف بها بموجب شرط إنكوترمز المختار. ويحدد نطاق التغطية والمستفيد في مستندات المعاملة.",
      "يبلغ المشتري البائع كتابياً بأي عدم مطابقة ظاهرة خلال المهلة المتفق عليها بعد الاستلام. وينبغي تحديد أخذ العينات والفحص قبل التوقيع.",
      "يعد البائع المنتجات المطابقة والمستندات المتفق عليها ويسلمها، ويقدم معلومات صحيحة عن الشحنة.",
      "يدفع المشتري الثمن في موعده، ويقدم بيانات النقل اللازمة، ويحصل على تصاريح الاستيراد والاستخدام المنطبقة.",
      "لا تطبق سبل المعالجة وحدود المسؤولية والاستثناءات إلا بالقدر المتفق عليه صراحةً والمسموح به في القانون الحاكم؛ وهذا البند لا يغني عن المراجعة القانونية.",
      "على الطرف الذي يمنعه حدث خارج عن سيطرته المعقولة من التنفيذ إخطار الطرف الآخر فوراً واتخاذ خطوات معقولة لتخفيف الأثر واستئناف التنفيذ.",
      "يتحمل كل طرف مسؤولية قواعد التصدير والاستيراد والعقوبات والتصاريح المنطبقة عليه وعلى المعاملة. ويجب التحقق من قانونية المعاملة قبل التوقيع.",
      "يستخدم كل طرف المعلومات السرية لغرض تنفيذ الاتفاقية فقط ولا يفصح عنها لطرف ثالث دون موافقة خطية، ما لم يوجب القانون ذلك.",
      "يجب الاتفاق خطياً وبوضوح على أي تعويض تعاقدي وطريقة احتسابه وحده وموعد سداده.",
      "يجب تحديد أسباب الإنهاء والإخطار ومهلة معالجة الإخلال وآثاره خطياً بما يتفق مع القانون الحاكم.",
      "{law}",
      "لغة العقد هي {language}. وإذا أُعدت نسخ مترجمة، فيجب تحديد النسخة المعتمدة وكيفية تفسير الترجمات صراحةً قبل التوقيع.",
      "لا يجوز لأي طرف التنازل عن حقوقه أو التزاماته دون موافقة خطية من الطرف الآخر، ما لم ينص القانون الحاكم على خلاف ذلك.",
      "ترسل الإشعارات إلى العناوين ووسائل الاتصال المبينة في الاتفاقية. ويجب إخطار الطرف الآخر خطياً بأي تغيير في العنوان.",
      "تشكل هذه الاتفاقية وملاحقها الموقعة كامل اتفاق الطرفين بشأن موضوعها. ولا يكون أي تعديل نافذاً إلا كتابةً وبتوقيع الطرفين.",
      "هذه الوثيقة مسودة. يجب على الطرفين مراجعة الشروط والأرقام والملاحق وتوقيع النسخة النهائية قبل التنفيذ.",
      "هذه المسودة غير موقعة ولا تعد عقداً نهائياً أو إذناً بالتسليم حتى إتمام المراجعة وتوقيع الطرفين.",
    ],
  },
  tr: {
    title: "Petrokimya Ürünleri Satış Sözleşmesi", number: "Sözleşme numarası", date: "Tarih", type: "İşlem türü",
    domesticIran: "İran içi satış", domesticIraq: "Irak içi satış", iraqExport: "Irak'a ihracat",
    international: "Uluslararası satış", seller: "Satıcı", buyer: "Alıcı", registration: "Tescil",
    tax: "Vergi numarası", address: "Adres", country: "Ülke", city: "Şehir", postal: "Posta kodu",
    representative: "Temsilci ve unvan", contact: "İletişim bilgileri", website: "İnternet sitesi", customer: "Müşteri",
    grade: "Kalite / standart", tolerance: "Ürün kalite toleransı", packaging: "Ambalaj / taşıma", max: "Azami miktar",
    weightAllowance: "Toplam sipariş fazla ağırlık sınırı",
    weightAllowanceUnknown: "Sözleşmede belirtilmemiş",
    price: "Birim fiyat (IQD)", unit: "birim", quality: "Kalite", quantityPackaging: "Miktar ve ambalaj",
    payment: "Ödeme", priceTitle: "Fiyat", delivery: "Teslimat ve taşıma", incoterm: "Incoterm",
    location: "Teslim yeri", deliveryDate: "Teslim tarihi", law: "Uygulanacak hukuk ve uyuşmazlık çözümü",
    review: "Bu belge taslaktır; kullanılmadan veya imzalanmadan önce yetkin bir hukuk danışmanı tarafından incelenmelidir. Hiçbir hükmün hukuken onaylandığı veya taraflarca kesin olarak kabul edildiği varsayılmaz.",
    signature: "Durum: tarafların incelemesi ve imzası bekleniyor.", sellerSignature: "Satıcı imzası",
    buyerSignature: "Alıcı imzası", paymentDays: "Ödeme süresi", paymentMethod: "Ödeme yöntemi",
    daysSuffix: "gün", terms: ["Tanımlar", "Sözleşmenin konusu", "Kalite ve inceleme", "Miktar ve ambalaj",
      "Toplam sipariş fazla ağırlık sınırı", "Fiyat ve para birimi", "Ödeme yöntemi ve süresi", "Teslimat ve taşıma", "Mülkiyet ve risk", "Sigorta",
      "İnceleme ve ayıp bildirimi", "Satıcının yükümlülükleri", "Alıcının yükümlülükleri", "Garanti ve sorumluluk",
      "Mücbir sebep", "Yaptırımlar ve uyum", "Gizlilik", "Sözleşmesel tazminat", "Fesih",
      "Uygulanacak hukuk ve uyuşmazlıklar", "Sözleşme dili", "Devir", "Bildirimler", "Sözleşmenin bütünü",
      "İnceleme ve imza", "İmza durumu"],
    methods: { advance: "peşinat ve bakiye", lc: "akreditif (LC)", tt: "banka havalesi (TT)", credit: "vadeli satış" },
    clauses: [
      "Bu sözleşmede “Ürün” ve “Sevkiyat” 2. maddede belirtilen kalemleri, “İş Günü” edim yerindeki iş gününü, “COA” ise sevkiyata ait analiz sertifikasını ifade eder.",
      "Satıcı aşağıdaki Ürünleri satmayı, Alıcı ise kararlaştırılan limit ve fiyatlar dahilinde satın almayı kabul eder:\n{items}",
      "Ürünler 2. maddede yer alan özellik ve toleranslara uygun olmalıdır. Satıcı COA sunar; Alıcı sevkiyat öncesinde bağımsız inceleme yaptırabilir.",
      "Her ürün limiti sözleşme kapsamında izin verilen azami miktardır; tamamlanmış önceki siparişler kalan kapasiteden düşülür. Ambalaj 2. maddeye uygun olur.",
      "Sipariş edilen ağırlığa göre siparişin toplam fazla ağırlık sınırı: {weightAllowance}. Bu koşul ürün kalite toleranslarından bağımsızdır.",
      "Satış para birimi Irak dinarıdır (IQD). Birim fiyatlar ve azami miktarlar 2. maddede belirtilmiştir. Her fiyat değişikliği ancak yazılı anlaşmayla geçerlidir.",
      "Ödeme yöntemi {method}, süresi {days} gündür. Taksitler, vadeler ve gerekli teminatlar imzadan önce açıkça kararlaştırılmalıdır.",
      "Seçilen Incoterm {incoterm}, teslim yeri {location}, planlanan teslim tarihi {deliveryDate} şeklindedir. Taşıma belgeleri tarafların yazılı anlaşmasına göre sunulur.",
      "Mülkiyet ve risk seçilen Incoterm ve uygulanabilir hukuka göre devredilir. Farklılıklar imzadan önce açıkça karara bağlanmalıdır.",
      "Sigortayı yaptırma sorumluluğu ve maliyeti seçilen Incoterm uyarınca görevli tarafa aittir. Teminat kapsamı ve lehtar işlem belgelerinde belirtilmelidir.",
      "Alıcı, gözle görülür uygunsuzlukları teslimden sonra yazılı olarak kararlaştırılan süre içinde Satıcıya bildirir. Numune alma ve test usulü imzadan önce belirlenmelidir.",
      "Satıcı, uygun Ürünleri ve kararlaştırılan belgeleri hazırlar ve teslim eder; sevkiyat hakkında doğru bilgileri sağlar.",
      "Alıcı bedeli vadesinde öder, taşıma için gereken bilgileri sağlar ve geçerli ithalat/kullanım izinlerini alır.",
      "Tazmin yolları, sorumluluk sınırları ve istisnalar yalnızca açıkça kararlaştırıldığı ve uygulanacak hukukun izin verdiği ölçüde geçerlidir; bu hüküm hukuki incelemenin yerini tutmaz.",
      "Makul kontrolü dışındaki bir olay nedeniyle edimini yerine getiremeyen taraf diğer tarafa gecikmeksizin bildirimde bulunur ve etkileri azaltıp ifaya dönmek için makul çaba gösterir.",
      "Her taraf kendisine ve işleme uygulanabilen ihracat, ithalat, yaptırım ve izin kurallarına uymaktan sorumludur. İşlemin hukuka uygunluğu imzadan önce doğrulanmalıdır.",
      "Taraflar gizli bilgileri yalnızca sözleşmenin ifası için kullanır; yazılı izin olmadan veya yasal zorunluluk bulunmadıkça üçüncü kişilere açıklamaz.",
      "Sözleşmesel tazminat, hesaplama yöntemi, üst sınır ve vade açıkça yazılı olarak kararlaştırılmalıdır.",
      "Fesih nedenleri, bildirim, ihlali giderme süresi ve fesih sonuçları uygulanacak hukuka uygun biçimde yazılı olarak belirlenmelidir.",
      "{law}",
      "Sözleşme dili {language} dilidir. Çeviriler hazırlanırsa geçerli metin ve çevirilerin yorumlanma usulü imzadan önce açıkça kararlaştırılmalıdır.",
      "Uygulanacak hukuk aksini gerektirmedikçe taraflardan hiçbiri diğer tarafın yazılı onayı olmadan hak veya yükümlülüklerini devredemez.",
      "Bildirimler sözleşmede belirtilen adres ve iletişim kanallarına gönderilir. Adres değişikliği diğer tarafa yazılı olarak bildirilmelidir.",
      "Bu sözleşme ve imzalı ekleri, konusu bakımından tarafların anlaşmasının tamamını oluşturur. Değişiklikler yazılı ve taraflarca imzalı olmalıdır.",
      "Bu belge taslaktır. Taraflar bütün hükümleri, rakamları ve ekleri inceleyip uygulamadan önce nihai metni imzalamalıdır.",
      "Bu taslak imzasızdır; inceleme ve tarafların imzası tamamlanmadan nihai sözleşme veya teslimat izni sayılmamalıdır.",
    ],
  },
} as const;

function languageName(language: ContractDraftLanguage): string {
  return text(language, { fa: "فارسی", ar: "العربية", en: "English", tr: "Türkçe" });
}

function formatDate(value: string, language: ContractDraftLanguage, version: number): string {
  if (version !== 2 || !value.trim()) return filled(value);
  const locale = { fa: "fa-IR-u-ca-persian", ar: "ar-IQ-u-ca-gregory", en: "en-US-u-ca-gregory", tr: "tr-TR-u-ca-gregory" }[language];
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00.000Z`));
}

export function buildContractDraftText(draft: ShopContractDraftData, context: ContractDocumentContext): string {
  const language: ContractDraftLanguage = draft.language || "fa";
  const labels = copy[language];
  const seller = draft.seller;
  const buyer = draft.buyer;
  const dealType = draft.dealType;
  const type = dealType === "iran" ? labels.domesticIran
    : dealType === "iraqLocal" ? labels.domesticIraq
      : dealType === "iraq" ? labels.iraqExport : labels.international;
  const methods = labels.methods;
  const method = methods[draft.payment.method];
  const aggregateWeightAllowance = (draft as ShopContractDraftData & {
    aggregateWeightAllowance?: { basis: "percent"; value: string };
  }).aggregateWeightAllowance;
  const values: Record<string, string> = {
    items: context.items.map((item) => {
      const details = draft.productDetails[String(item.productId)];
      return `• ${item.productName}: ${labels.max} ${filled(item.maxQuantity)} ${labels.unit}, ${labels.price} ${filled(item.unitPrice)}; ${labels.grade}: ${filled(details?.grade)}; ${labels.tolerance}: ${filled(details?.tolerance)}%; ${labels.packaging}: ${filled(details?.packaging)}.`;
    }).join("\n") || "[—]",
    method,
    days: filled(draft.payment.days),
    incoterm: filled(context.deliveryTerm || undefined),
    location: filled(draft.delivery.location),
    deliveryDate: formatDate(draft.delivery.date, language, draft.version),
    language: languageName(language),
    languageLabel: languageName(language),
    weightAllowance: aggregateWeightAllowance?.basis === "percent"
      ? `${aggregateWeightAllowance.value}%`
      : labels.weightAllowanceUnknown,
  };
  const law = dealType === "iran"
    ? text(language, {
      fa: `برای فروش داخلی ایران، قانون حاکم و مرجع صالح برای رسیدگی به اختلافات باید پیش از امضا به‌طور دقیق و کتبی تعیین شود (شهر پیشنهادی: ${filled(draft.disputeCity)}).`,
      ar: `في البيع المحلي داخل إيران، يجب تحديد القانون الحاكم والجهة المختصة بالنزاع بدقة وكتابةً قبل التوقيع (المدينة المقترحة: ${filled(draft.disputeCity)}).`,
      en: `For a domestic sale in Iran, the governing law and competent dispute forum must be specified precisely in writing before signature (proposed city: ${filled(draft.disputeCity)}).`,
      tr: `İran içi satışta uygulanacak hukuk ve uyuşmazlık mercii imzadan önce açık ve yazılı olarak belirlenmelidir (önerilen şehir: ${filled(draft.disputeCity)}).`,
    })
    : dealType === "iraqLocal"
      ? text(language, {
        fa: `برای فروش داخلی عراق، قانون حاکم و مرجع صالح برای رسیدگی به اختلافات باید پیش از امضا به‌طور دقیق و کتبی تعیین شود (شهر پیشنهادی: ${filled(draft.disputeCity)}).`,
        ar: `في البيع المحلي داخل العراق، يجب تحديد القانون الحاكم والجهة المختصة بالنزاع بدقة وكتابةً قبل التوقيع (المدينة المقترحة: ${filled(draft.disputeCity)}).`,
        en: `For a domestic sale in Iraq, the governing law and competent dispute forum must be specified precisely in writing before signature (proposed city: ${filled(draft.disputeCity)}).`,
        tr: `Irak içi satışta uygulanacak hukuk ve uyuşmazlık mercii imzadan önce açık ve yazılı olarak belirlenmelidir (önerilen şehir: ${filled(draft.disputeCity)}).`,
      })
      : dealType === "iraq"
        ? text(language, {
          fa: `برای صادرات به عراق، قانون حاکم و مرجع صالح برای اختلافات فرامرزی باید با مشاور حقوقی تعیین شود (شهر پیشنهادی: ${filled(draft.disputeCity)}).`,
          ar: `في التصدير إلى العراق، يجب تحديد القانون الحاكم والجهة المختصة بالنزاعات العابرة للحدود بالتشاور مع مستشار قانوني (المدينة المقترحة: ${filled(draft.disputeCity)}).`,
          en: `For exports to Iraq, the governing law and competent forum for cross-border disputes must be selected with legal counsel (proposed city: ${filled(draft.disputeCity)}).`,
          tr: `Irak'a ihracatta uygulanacak hukuk ve sınır ötesi uyuşmazlık mercii hukuk danışmanıyla belirlenmelidir (önerilen şehir: ${filled(draft.disputeCity)}).`,
        })
        : text(language, {
          fa: `برای معاملهٔ بین‌المللی، قانون حاکم، مقر داوری و آیین رسیدگی باید پیش از امضا با مشاور حقوقی تعیین شوند (شهر پیشنهادی: ${filled(draft.disputeCity)}).`,
          ar: `في المعاملة الدولية، يجب تحديد القانون الحاكم ومقر التحكيم والقواعد الإجرائية بالتشاور مع مستشار قانوني قبل التوقيع (المدينة المقترحة: ${filled(draft.disputeCity)}).`,
          en: `For an international transaction, governing law, arbitration seat, and procedure must be selected with legal counsel before signature (proposed city: ${filled(draft.disputeCity)}).`,
          tr: `Uluslararası işlemde uygulanacak hukuk, tahkim yeri ve usul imzadan önce hukuk danışmanıyla belirlenmelidir (önerilen şehir: ${filled(draft.disputeCity)}).`,
        });
  values.law = law;
  const clauses = labels.clauses.map((clause) => render(clause, values));
  const sellerContact = [
    filled(seller.contact),
    seller.website ? `${labels.website}: ${filled(seller.website)}` : "",
  ].filter(Boolean).join(" · ");
  const sellerExtra = [
    seller.taxNumber ? `${labels.tax}: ${filled(seller.taxNumber)}` : "",
    seller.city ? `${labels.city}: ${filled(seller.city)}` : "",
    seller.postalCode ? `${labels.postal}: ${filled(seller.postalCode)}` : "",
  ].filter(Boolean).join(" · ");
  const customerNumberLabel = text(language, { fa: "شماره مشتری", en: "Customer number", ar: "رقم العميل", tr: "Müşteri numarası" });
  const customerIdentity = context.customerCode ? ` · ${customerNumberLabel}: ${context.customerCode}` : "";
  const buyerLine = `${labels.buyer}: ${filled(context.customerName)}${customerIdentity} (${labels.country}: ${filled(buyer.country)}؛ ${labels.registration}: ${filled(buyer.registration)}؛ ${labels.address}: ${filled(buyer.address)}؛ ${labels.representative}: ${filled(buyer.representative)}؛ ${labels.contact}: ${filled(buyer.contact)})`;
  const sellerLine = `${labels.seller}: ${filled(seller.name)} (${labels.registration}: ${filled(seller.registration)}؛ ${labels.address}: ${filled(seller.address)}؛ ${labels.representative}: ${filled(seller.representative)}؛ ${labels.contact}: ${sellerContact}${sellerExtra ? `؛ ${sellerExtra}` : ""})`;
  const clauseLines = clauses.map((clause, index) => `${index + 1}. ${labels.terms[index]}: ${clause}${index === 3 && context.packaging ? `\n${packagingTermsText(context.packaging, language)}` : ""}`);
  const signLines = `${labels.sellerSignature}: ${filled(seller.representative)}          ${labels.buyerSignature}: ${filled(buyer.representative)}`;

  return `${labels.title}
${labels.number}: ${filled(context.contractNumber)}
${labels.date}: ${formatDate(draft.date, language, draft.version)}    ${labels.type}: ${type}

${sellerLine}
${labels.customer}: ${buyerLine}

${clauseLines.join("\n\n")}

${labels.review}
${labels.signature}
${signLines}
${labels.date}: ${formatDate(draft.date, language, draft.version)}`;
}