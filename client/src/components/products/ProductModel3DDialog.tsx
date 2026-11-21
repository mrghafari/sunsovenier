import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ProductModel3DViewer from "@/components/ProductModel3DViewer";
import { useLanguage } from "@/contexts/LanguageContext";

export type ProductModelSelection = { key: string; name: string };

export default function ProductModel3DDialog({
  model,
  onClose,
}: { model: ProductModelSelection | null; onClose: () => void }) {
  const { t, direction } = useLanguage();
  return (
    <Dialog open={!!model} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="w-[95vw] max-w-5xl" dir={direction}>
        <DialogHeader>
          <DialogTitle>{model?.name}</DialogTitle>
          <DialogDescription>{t.productManagement.viewModel3d}</DialogDescription>
        </DialogHeader>
        {model && <ProductModel3DViewer
          key={model.key}
          model3dKey={model.key}
          productName={model.name}
          className="h-[55dvh] min-h-40 w-full"
        />}
      </DialogContent>
    </Dialog>
  );
}
