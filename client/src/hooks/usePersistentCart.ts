import { useState, useEffect, useRef } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useCustomerAuth } from './useCustomerAuth';
import { keepContractCartItems } from '@/lib/contract-cart';

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
  const confirmedCart = useRef<{[key: number]: number}>({});
  const cartMutationQueue = useRef<Promise<void>>(Promise.resolve());
  const authCartLoad = useRef<Promise<void> | null>(null);
  
  // Add ref to track mount status
  const mounted = useRef(true);

  type CartReservationError = Error & {
    status?: number;
    details?: { productId?: number; requested?: number; available?: number; acceptedCart?: Record<string, number> };
  };

  // The server is the source of truth for both guest and authenticated cart
  // quantities. The owner is derived from the server session cookie.
  const reconcileCartSnapshot = async (nextCart: {[key: number]: number}, persistCart = false) => {
    const response = await fetch('/api/cart/inventory-reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cart: nextCart, persistCart, includeAvailability: false }),
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
          confirmedCart.current = parsedCart;
          setLocalCart(parsedCart);
        } catch (error) {
          console.error('Error loading local cart:', error);
          confirmedCart.current = {};
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
            confirmedCart.current = cartData;
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
      let started = false;
      let finishPending = () => {};
      const pending = new Promise<void>(resolve => {
        finishPending = resolve;
      });
      const timeoutId = setTimeout(() => {
        started = true;
        void loadPersistentCart().finally(finishPending);
      }, 100);
      authCartLoad.current = pending;
      void pending.finally(() => {
        if (authCartLoad.current === pending) authCartLoad.current = null;
      });
      return () => {
        clearTimeout(timeoutId);
        if (!started) finishPending();
      };
    }
  }, [isAuthenticated, user?.id, cartLoaded, localCart]);

  // ذخیره سبد محلی در localStorage
  const saveLocalCart = (cart: {[key: number]: number}) => {
    if (!isAuthenticated) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
    confirmedCart.current = cart;
    if (mounted.current) setLocalCart(cart);
  };

  // Queue cart changes so rapid clicks on different products cannot overwrite
  // each other's snapshots. The server reserves and persists in one transaction.
  const changeCart = (update: (cart: {[key: number]: number}) => {[key: number]: number}) => {
    const task = cartMutationQueue.current.then(async () => {
      if (authCartLoad.current) await authCartLoad.current;
      const newCart = update({ ...confirmedCart.current });
      await reconcileCartSnapshot(newCart, !!(isAuthenticated && user));
      saveLocalCart(newCart);
    });
    cartMutationQueue.current = task.catch(() => {});
    return task;
  };

  // Add product to cart
  const addToCart = (productId: number, quantity: number = 1, _unitPrice?: string) =>
    changeCart(cart => ({ ...cart, [productId]: (cart[productId] || 0) + quantity }));

  // Update product quantity
  const updateQuantity = async (productId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    await changeCart(cart => ({ ...cart, [productId]: quantity }));
  };

  // Remove product from cart
  const removeFromCart = (productId: number) => changeCart(cart => {
    delete cart[productId];
    return cart;
  });

  // Persist one filtered snapshot so the removed items release their reservations together.
  const keepOnlyProducts = (allowedProductIds: readonly number[]) =>
    changeCart(cart => keepContractCartItems(cart, allowedProductIds));

  // Clear entire cart
  const clearCart = async () => {
    console.log('🗑️ Clearing cart..., authenticated:', isAuthenticated);
    
    await changeCart(() => ({}));
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
    keepOnlyProducts,
    clearCart,
    getTotalItems,
    getCartItems,
    isEmpty: Object.keys(localCart).length === 0
  };
}