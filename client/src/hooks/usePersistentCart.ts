import { useState, useEffect, useRef } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useCustomerAuth } from './useCustomerAuth';

interface CartItem {
  productId: number;
  quantity: number;
  unitPrice?: string;
}

export function usePersistentCart() {
  const { isAuthenticated, user } = useCustomerAuth();
  const [localCart, setLocalCart] = useState<{[key: number]: number}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [previousAuth, setPreviousAuth] = useState<boolean>(false);
  const [cartLoaded, setCartLoaded] = useState<boolean>(false);
  
  // Add ref to track mount status
  const mounted = useRef(true);

  type CartReservationError = Error & {
    status?: number;
    details?: { productId?: number; requested?: number; available?: number; acceptedCart?: Record<string, number> };
  };

  // The server is the source of truth for both guest and authenticated cart
  // quantities. The owner is derived from the server session cookie.
  const reconcileCartSnapshot = async (nextCart: {[key: number]: number}) => {
    const response = await fetch('/api/cart/inventory-reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cart: nextCart }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      const error = Object.assign(
        new Error(payload.message || 'موجودی کافی نیست'),
        { status: response.status, details: payload },
      ) as CartReservationError;
      throw error;
    }
    return payload;
  };
  
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // Preserve the cart when authentication expires or the user logs out.
  // The same browser session can continue checkout as a guest, so losing
  // customer authentication must not erase the active cart.
  useEffect(() => {
    if (previousAuth && !isAuthenticated) {
      console.log('🔐 Customer authentication ended, preserving cart for guest checkout');
      if (Object.keys(localCart).length > 0) {
        localStorage.setItem('cart', JSON.stringify(localCart));
      }
      setCartLoaded(false);
    }
    
    // If user is not authenticated, load from localStorage (guest cart)
    if (!isAuthenticated) {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          console.log('🛒 Loading guest cart from localStorage:', parsedCart);
          setLocalCart(parsedCart);
        } catch (error) {
          console.error('Error loading local cart:', error);
          setLocalCart({});
        }
      }
    }
    
    // If user just logged in, reset cart loaded flag to force reload
    if (!previousAuth && isAuthenticated) {
      console.log('🔐 User just logged in, resetting cart loaded flag');
      setCartLoaded(false);
    }
    
    setPreviousAuth(isAuthenticated);
  }, [isAuthenticated]);

  // Load persistent cart from database when user logs in
  useEffect(() => {
    const loadPersistentCart = async () => {
      if (isAuthenticated && user && user.id && !cartLoaded) {
        setIsLoading(true);
        setCartLoaded(true);
        try {
          console.log('🛒 Loading persistent cart for customer:', user.id);
          
          // First sync any local cart items to database
          if (Object.keys(localCart).length > 0) {
            console.log('🔄 Syncing local cart to database:', localCart);
            await apiRequest('/api/customers/persistent-cart/sync', {
              method: 'POST',
              body: { cartData: localCart },
            });
          }
          
          // Then load the updated cart from database
          const response = await apiRequest('/api/customers/persistent-cart', {
            method: 'GET'
          });
          
          if (response.success && mounted.current) {
            // Handle different response formats
            const cartData = response.data?.cartData || response.cart || {};
            console.log('🛒 Loaded cart from database:', cartData);
            setLocalCart(cartData);
            // Clear localStorage after successful sync
            localStorage.removeItem('cart');
          } else {
            console.log('⚠️ Failed to load persistent cart, using local cart');
          }
        } catch (error) {
          console.error('❌ Error loading persistent cart:', error);
          // Keep local cart if database load fails
        } finally {
          if (mounted.current) {
            setIsLoading(false);
          }
        }
      }
    };

    // Load cart whenever user authentication state changes or user data becomes available
    if (isAuthenticated && user && user.id && !cartLoaded) {
      // Add a small delay to ensure authentication is fully settled
      const timeoutId = setTimeout(() => {
        loadPersistentCart();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, user?.id, cartLoaded, localCart]);

  // ذخیره سبد محلی در localStorage
  const saveLocalCart = (cart: {[key: number]: number}) => {
    if (!isAuthenticated) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
    setLocalCart(cart);
  };

  // Add product to cart
  const addToCart = async (productId: number, quantity: number = 1, unitPrice?: string) => {
    const newCart = { ...localCart };
    const currentQuantity = newCart[productId] || 0;
    newCart[productId] = currentQuantity + quantity;

    // Reconcile before changing local state. A 409 leaves the old local cart
    // untouched and is propagated to the caller.
    await reconcileCartSnapshot(newCart);

    if (isAuthenticated && user) {
      try {
        console.log(`🛒 Saving product ${productId} to database for customer ${user.id}`);
        await apiRequest('/api/customers/persistent-cart/save', {
          method: 'POST',
          body: { productId, quantity: newCart[productId], unitPrice },
        });
        console.log(`✅ Product ${productId} saved to database`);
      } catch (error) {
        console.error('❌ Error saving to database after reservation:', error);
        throw error;
      }
    }

    saveLocalCart(newCart);
  };

  // Update product quantity
  const updateQuantity = async (productId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    const newCart = { ...localCart };
    newCart[productId] = quantity;

    await reconcileCartSnapshot(newCart);

    if (isAuthenticated && user) {
      try {
        console.log(`🛒 Updating quantity for product ${productId} to ${quantity} for customer ${user.id}`);
        await apiRequest('/api/customers/persistent-cart/update', {
          method: 'PUT',
          body: { productId, quantity },
        });
        console.log(`✅ Product ${productId} quantity updated`);
      } catch (error) {
        console.error('❌ Error updating quantity in database:', error);
        throw error;
      }
    }

    saveLocalCart(newCart);
  };

  // Remove product from cart
  const removeFromCart = async (productId: number) => {
    const newCart = { ...localCart };
    delete newCart[productId];

    await reconcileCartSnapshot(newCart);

    if (isAuthenticated && user) {
      try {
        console.log(`🛒 Removing product ${productId} from database for customer ${user.id}`);
        await apiRequest('/api/customers/persistent-cart/remove', {
          method: 'DELETE',
          body: { productId },
        });
        console.log(`✅ Product ${productId} removed from database`);
      } catch (error) {
        console.error('❌ Error removing from database:', error);
        throw error;
      }
    }

    saveLocalCart(newCart);
  };

  // Clear entire cart
  const clearCart = async () => {
    console.log('🗑️ Clearing cart..., authenticated:', isAuthenticated);
    
    await reconcileCartSnapshot({});

    // Wait a bit to ensure we're actually logged out
    if (isAuthenticated && user) {
      try {
        console.log(`🛒 Clearing cart in database for customer ${user.id}`);
        await apiRequest('/api/customers/persistent-cart/clear', {
          method: 'DELETE',
        });
        console.log('✅ Cart cleared from database');
      } catch (error) {
        console.error('❌ Error clearing cart from database:', error);
        throw error;
      }
    } else {
      console.log('🔄 User not authenticated, clearing only localStorage');
    }

    setLocalCart({});
    setCartLoaded(false); // Reset cart loaded flag
    localStorage.removeItem('cart');
    console.log('✅ Local cart cleared');
  };

  // دریافت تعداد کل آیتم‌ها در سبد
  const getTotalItems = () => {
    return Object.values(localCart).reduce((total, quantity) => total + quantity, 0);
  };

  // دریافت آیتم‌های سبد
  const getCartItems = () => {
    return Object.entries(localCart).map(([productId, quantity]) => ({
      productId: parseInt(productId),
      quantity
    }));
  };

  return {
    cart: localCart,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalItems,
    getCartItems,
    isEmpty: Object.keys(localCart).length === 0
  };
}