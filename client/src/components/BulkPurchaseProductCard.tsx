import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Edit3, Package, DollarSign, Plus, Trash2, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DiscountTier {
  minQty: number;
  discount: number;
}

interface BulkPurchaseProductCardProps {
  product: any;
  onUpdate: () => void;
}

export default function BulkPurchaseProductCard({ product, onUpdate }: BulkPurchaseProductCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bulkEnabled, setBulkEnabled] = useState(product.bulk_purchase_enabled || false);
  const [minimumQuantity, setMinimumQuantity] = useState(product.bulk_purchase_minimum_quantity || "");
  const [description, setDescription] = useState(product.bulk_purchase_description || "");
  const { toast } = useToast();

  const parseBulkDiscounts = (): DiscountTier[] => {
    let discounts = product.bulk_purchase_discounts;
    if (typeof discounts === 'string') {
      try { discounts = JSON.parse(discounts); } catch { discounts = []; }
    }
    if (Array.isArray(discounts) && discounts.length > 0) return discounts;
    return [{ minQty: 10, discount: 0.05 }];
  };

  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>(parseBulkDiscounts());

  const addDiscountTier = () => {
    const lastTier = discountTiers[discountTiers.length - 1];
    setDiscountTiers([...discountTiers, { 
      minQty: lastTier ? lastTier.minQty + 10 : 10, 
      discount: lastTier ? Math.min(lastTier.discount + 0.05, 0.5) : 0.05 
    }]);
  };

  const removeDiscountTier = (index: number) => {
    if (discountTiers.length <= 1) return;
    setDiscountTiers(discountTiers.filter((_, i) => i !== index));
  };

  const updateDiscountTier = (index: number, field: keyof DiscountTier, value: number) => {
    const updated = [...discountTiers];
    updated[index] = { ...updated[index], [field]: value };
    setDiscountTiers(updated);
  };

  const updateBulkPurchaseMutation = useMutation({
    mutationFn: async (data: {
      productId: number;
      bulk_purchase_enabled: boolean;
      bulk_purchase_minimum_quantity: number | null;
      bulk_purchase_description: string;
      bulk_purchase_discounts: DiscountTier[] | null;
    }) => {
      return await apiRequest(`/api/shop/products/${data.productId}/bulk-purchase`, {
        method: 'PUT',
        body: {
          bulk_purchase_enabled: data.bulk_purchase_enabled,
          bulk_purchase_minimum_quantity: data.bulk_purchase_minimum_quantity,
          bulk_purchase_description: data.bulk_purchase_description,
          bulk_purchase_discounts: data.bulk_purchase_discounts,
        },
      });
    },
    onSuccess: () => {
      setIsEditing(false);
      onUpdate();
      toast({
        title: "Success",
        description: "Bulk purchase settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bulk purchase settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const quantity = minimumQuantity ? parseInt(minimumQuantity) : null;
    
    if (bulkEnabled && (!quantity || quantity < 1)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid minimum quantity for bulk purchases",
        variant: "destructive",
      });
      return;
    }

    for (const tier of discountTiers) {
      if (tier.minQty < 1 || tier.discount <= 0 || tier.discount > 1) {
        toast({
          title: "Validation Error",
          description: "Discount tiers must have valid quantity (>0) and discount (1-100%)",
          variant: "destructive",
        });
        return;
      }
    }

    const sortedTiers = [...discountTiers].sort((a, b) => a.minQty - b.minQty);

    updateBulkPurchaseMutation.mutate({
      productId: product.id,
      bulk_purchase_enabled: bulkEnabled,
      bulk_purchase_minimum_quantity: quantity,
      bulk_purchase_description: description,
      bulk_purchase_discounts: bulkEnabled ? sortedTiers : null,
    });
  };

  const handleCancel = () => {
    setBulkEnabled(product.bulk_purchase_enabled || false);
    setMinimumQuantity(product.bulk_purchase_minimum_quantity || "");
    setDescription(product.bulk_purchase_description || "");
    setDiscountTiers(parseBulkDiscounts());
    setIsEditing(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-semibold">{product.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={bulkEnabled ? "default" : "secondary"}>
              {bulkEnabled ? "Bulk Enabled" : "Bulk Disabled"}
            </Badge>
            {!isEditing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <Label className="text-xs text-gray-500">SKU</Label>
            <p className="text-sm font-medium">{product.sku}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Unit Price</Label>
            <p className="text-sm font-medium flex items-center">
              <DollarSign className="w-3 h-3 mr-1" />
              {product.unitPrice || product.price}
            </p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Stock</Label>
            <p className="text-sm font-medium">{product.stockQuantity || product.stock_quantity}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Category</Label>
            <p className="text-sm font-medium">{product.category || "N/A"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor={`bulk-enabled-${product.id}`} className="text-sm font-medium">
                Enable Bulk Purchases
              </Label>
              <p className="text-xs text-gray-500 mt-0.5">
                When enabled, general discounts will NOT apply. Only bulk-specific discounts below will be used.
              </p>
            </div>
            <Switch
              id={`bulk-enabled-${product.id}`}
              checked={bulkEnabled}
              onCheckedChange={setBulkEnabled}
              disabled={!isEditing}
            />
          </div>

          {bulkEnabled && (
            <>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor={`min-quantity-${product.id}`} className="text-sm font-medium">
                    Minimum Quantity *
                  </Label>
                  <Input
                    id={`min-quantity-${product.id}`}
                    type="number"
                    min="1"
                    placeholder="e.g., 10"
                    value={minimumQuantity}
                    onChange={(e) => setMinimumQuantity(e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Percent className="w-4 h-4 text-purple-600" />
                    Bulk Discount Tiers
                  </Label>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addDiscountTier}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Tier
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  These discounts replace the general discount system for this product.
                </p>

                <div className="space-y-2">
                  {discountTiers.map((tier, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500">Min Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={tier.minQty}
                          onChange={(e) => updateDiscountTier(index, 'minQty', parseInt(e.target.value) || 0)}
                          disabled={!isEditing}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500">Discount %</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={Math.round(tier.discount * 100)}
                          onChange={(e) => updateDiscountTier(index, 'discount', (parseFloat(e.target.value) || 0) / 100)}
                          disabled={!isEditing}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-shrink-0 pt-4">
                        {isEditing && discountTiers.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDiscountTier(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor={`description-${product.id}`} className="text-sm font-medium">
                  Bulk Purchase Description
                </Label>
                <Textarea
                  id={`description-${product.id}`}
                  placeholder="Describe bulk purchase benefits, discounts, or special terms..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isEditing}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        {isEditing && (
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={updateBulkPurchaseMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {updateBulkPurchaseMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateBulkPurchaseMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        )}

        {!isEditing && product.bulk_purchase_enabled && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
            <p className="text-sm font-medium text-green-800">
              Bulk purchases enabled with minimum quantity: {product.bulk_purchase_minimum_quantity || product.bulk_purchase_min_quantity}
            </p>
            {discountTiers.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-green-700">Bulk Discount Tiers:</p>
                {discountTiers.map((tier, i) => (
                  <p key={i} className="text-xs text-green-600">
                    {tier.minQty}+ units: {Math.round(tier.discount * 100)}% off
                  </p>
                ))}
              </div>
            )}
            {product.bulk_purchase_description && (
              <p className="text-xs text-green-600 mt-1">
                {product.bulk_purchase_description}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
