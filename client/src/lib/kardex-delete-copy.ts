export const kardexDeleteCopy = {
  en: {
    batches: "This permanently deletes all {count} Kardex rows for this product, including its batches.",
    scopeChanged: "The product’s batches have changed. Refresh the list and confirm the deletion again.",
    referenced: "The product is linked to an existing contract or record and could not be deleted. Nothing was deleted.",
    notFound: "The product is no longer available in Kardex.",
  },
  fa: {
    batches: "با این کار، هر {count} ردیف این محصول در کاردکس، از جمله بچ‌های آن، برای همیشه حذف می‌شوند.",
    scopeChanged: "بچ‌های این محصول تغییر کرده‌اند. فهرست را به‌روز کنید و دوباره حذف را تأیید کنید.",
    referenced: "محصول به یک قرارداد یا سابقهٔ ثبت‌شده وابسته است و قابل حذف نیست. هیچ ردیفی حذف نشد.",
    notFound: "این محصول دیگر در کاردکس موجود نیست.",
  },
  ar: {
    batches: "سيتم حذف جميع سجلات هذا المنتج في الكاردكس ({count}) نهائيًا، بما فيها الدُفعات.",
    scopeChanged: "تغيّرت دُفعات المنتج. حدّث القائمة ثم أكّد الحذف مرة أخرى.",
    referenced: "المنتج مرتبط بعقد أو سجل قائم ولا يمكن حذفه. لم يُحذف أي سجل.",
    notFound: "هذا المنتج لم يعد موجودًا في الكاردكس.",
  },
  tr: {
    batches: "Partiler dahil, bu ürünün {count} Kardex kaydının tamamı kalıcı olarak silinecek.",
    scopeChanged: "Ürünün partileri değişti. Listeyi yenileyip silme işlemini tekrar onaylayın.",
    referenced: "Ürün mevcut bir sözleşmeye veya kayda bağlı olduğu için silinemedi. Hiçbir kayıt silinmedi.",
    notFound: "Ürün artık Kardex'te bulunmuyor.",
  },
} as const;
