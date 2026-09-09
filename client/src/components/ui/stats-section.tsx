import { useLanguage } from "@/contexts/LanguageContext";

const StatsSection = () => {
  const { language, direction } = useLanguage();
  const labels = language === 'fa'
    ? ['سال تجربه', 'کشور تحت پوشش', 'خط محصول', 'کیفیت تأییدشده']
    : ['Years Experience', 'Countries Served', 'Product Lines', 'Certified Quality'];
  const stats = [
    { value: "25+", label: labels[0] },
    { value: "40+", label: labels[1] },
    { value: "200+", label: labels[2] },
    { value: "ISO", label: labels[3] },
  ];

  return (
    <section className="py-16 bg-white" dir={direction}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`text-4xl font-bold mb-2 ${
                index === 0 ? 'primary-blue' :
                index === 1 ? 'primary-green' :
                index === 2 ? 'accent-orange' : 'primary-blue'
              }`}>
                {stat.value}
              </div>
              <div className="text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
