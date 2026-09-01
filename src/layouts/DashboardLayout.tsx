import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import AppSidebar from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { logActivity } from "@/lib/tracking";

const DashboardLayout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user) logActivity(user.id, "page_view", location.pathname);
  }, [location.pathname, user?.id]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className={`flex-1 overflow-x-hidden ${isMobile ? "pt-14" : "overflow-auto"}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
