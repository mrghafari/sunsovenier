import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomer } from "./useCustomer";
import { apiRequest } from "@/lib/queryClient";

interface WishlistItem {
  id: number;
  customerId: number;
  productId: number;
  createdAt: string;
  product?: {
    id: number;
    name: string;
    price: string;
    imageUrl?: string;
    imageUrls?: string[];
  };
}

export function useWishlist() {
  const { isAuthenticated } = useCustomer();
  const queryClient = useQueryClient();

  const { data: wishlistItems = [], isLoading, error: queryError } = useQuery<WishlistItem[]>({
    queryKey: ["/api/customer/wishlist"],
    enabled: isAuthenticated,
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      if (!isAuthenticated) {
        throw new Error("Please log in to add items to wishlist");
      }
      return apiRequest("/api/customer/wishlist", {
        method: "POST",
        body: JSON.stringify({ productId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/wishlist"] });
    },
    onError: (error: Error) => {
      console.error("Failed to add to wishlist:", error.message);
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      if (!isAuthenticated) {
        throw new Error("Please log in to manage wishlist");
      }
      return apiRequest(`/api/customer/wishlist/${productId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/wishlist"] });
    },
    onError: (error: Error) => {
      console.error("Failed to remove from wishlist:", error.message);
    },
  });

  const isInWishlist = (productId: number): boolean => {
    return wishlistItems.some((item) => item.productId === productId);
  };

  const toggleWishlist = async (productId: number): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: "not_authenticated" };
    }
    try {
      if (isInWishlist(productId)) {
        await removeFromWishlistMutation.mutateAsync(productId);
      } else {
        await addToWishlistMutation.mutateAsync(productId);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  return {
    wishlistItems,
    isLoading,
    isAuthenticated,
    isInWishlist,
    toggleWishlist,
    addToWishlist: addToWishlistMutation.mutate,
    removeFromWishlist: removeFromWishlistMutation.mutate,
    isAdding: addToWishlistMutation.isPending,
    isRemoving: removeFromWishlistMutation.isPending,
    addError: addToWishlistMutation.error,
    removeError: removeFromWishlistMutation.error,
    wishlistCount: wishlistItems.length,
  };
}
