/** Drizzle wraps PostgreSQL failures in `cause`; do not expose SQL or row data. */
export function readyVehicleDatabaseError(error: unknown): { status: number; message: string } {
  let current: any = error;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if (current.code === "23505") {
      if (current.constraint === "ready_vehicles_license_plate_key") {
        return { status: 409, message: "این پلاک قبلاً در ناوگان ثبت شده است. برای انتقال خودرو به ناوگان قراردادی، گروه همان خودرو را در فرم ویرایش تغییر دهید." };
      }
      return { status: 409, message: "شناسهٔ خودرو تکراری است؛ ثبت انجام نشد. شماره‌گذاری خودروها باید بررسی شود." };
    }
    if (current.code === "23503" ||
        (current.code === "23502" && current.column === "vehicle_template_id")) {
      return { status: 422, message: "یک قالب معتبر از فهرست قالب‌های مشترک خودرو انتخاب کنید؛ نوع دلخواه باید ابتدا در بخش قالب‌ها تعریف شود." };
    }
    if (current.code === "23502") {
      return { status: 422, message: "اطلاعات الزامی خودرو، شامل پلاک، نام و تلفن راننده و ظرفیت بار، باید تکمیل شود." };
    }
    if (current.code === "22003" || current.code === "22P02") {
      return { status: 422, message: "ظرفیت بار یا شناسهٔ قالب خودرو معتبر نیست." };
    }
    current = current.cause;
  }
  return { status: 500, message: "ثبت خودرو انجام نشد؛ خطای داخلی سرور رخ داد." };
}
