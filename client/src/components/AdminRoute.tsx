import AuthGuard from "./AuthGuard";

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  return (
    <AuthGuard requireAuth={true} redirectTo="/mrg/login">
      {children}
    </AuthGuard>
  );
}
