import DeliveryPage from "@/pages/delivery";
import { LanguageProvider } from "@/contexts/LanguageContext";

export default function DeliveryApp() {
  return (
    <LanguageProvider>
      <DeliveryPage />
    </LanguageProvider>
  );
}