import { Link, useLocation } from 'wouter';
import { Home, ShoppingBag, Search, User, ShoppingCart } from 'lucide-react';
import { usePersistentCart } from '@/hooks/usePersistentCart';
import { useCustomer } from '@/hooks/useCustomer';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { getTotalItems } = usePersistentCart();
  const { isAuthenticated } = useCustomer();
  const { direction, t } = useLanguage();

  const totalItems = getTotalItems();

  // Hide on admin / department routes
  const isAdminRoute =
    location.startsWith('/admin') ||
    location.startsWith('/financial') ||
    location.startsWith('/warehouse') ||
    location.startsWith('/logistics') ||
    location.startsWith('/vendor/dashboard') ||
    location.startsWith('/vendor/products');

  if (isAdminRoute) return null;

  const isActive = (href: string) =>
    href === '/' ? location === '/' : location.startsWith(href);

  const tabs = [
    {
      href: '/',
      label: t.home,
      icon: Home,
    },
    {
      href: '/shop',
      label: t.shop.title,
      icon: ShoppingBag,
    },
    {
      href: '/shop-search',
      label: t.search,
      icon: Search,
    },
    {
      href: '/shop',
      label: t.cart,
      icon: ShoppingCart,
      badge: totalItems > 0 ? totalItems : null,
    },
    {
      href: isAuthenticated ? '/customer/profile' : '/customer/login',
      label: t.myAccount,
      icon: User,
      dot: !isAuthenticated,
    },
  ];

  // For cart tab: detect active when in /shop
  const getActive = (tab: (typeof tabs)[0], idx: number) => {
    if (idx === 3) {
      // Cart: active when in /shop AND totalItems > 0
      return location.startsWith('/shop') && totalItems > 0;
    }
    if (idx === 1) {
      // Shop tab: active only when not also matching cart condition
      return location.startsWith('/shop') && !(totalItems > 0);
    }
    return isActive(tab.href);
  };

  return (
    <nav
      dir={direction}
      className="fixed bottom-0 left-0 right-0 z-[990] md:hidden bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid h-16 w-full grid-cols-5 items-stretch overflow-hidden">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const active = getActive(tab, idx);

          return (
            <Link
              key={idx}
              href={tab.href}
              onClick={(event) => {
                if (idx !== 4) return;
                event.preventDefault();
                setLocation(isAuthenticated ? '/customer/profile' : '/customer/login');
              }}
              className="relative flex min-w-0 items-stretch overflow-hidden"
            >
              <div
                className={cn(
                  'flex w-full min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-2 transition-colors duration-150',
                  active ? 'text-blue-600' : 'text-gray-500 active:text-gray-800'
                )}
              >
                {/* Active indicator bar at top */}
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-blue-600 rounded-b-full" />
                )}

                {/* Icon with badge */}
                <div className="relative">
                  <Icon
                    className={cn('w-[22px] h-[22px] transition-transform duration-150', active && 'scale-110')}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {tab.badge != null && (
                    <span className="absolute -top-[6px] -right-[7px] min-w-[17px] h-[17px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-[3px] leading-none border-2 border-white">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                  {tab.dot && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 rounded-full border border-white" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'block w-full truncate whitespace-nowrap px-0.5 text-center text-[9px] font-medium leading-none mt-0.5',
                    active ? 'text-blue-600' : 'text-gray-500'
                  )}
                >
                  {tab.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
