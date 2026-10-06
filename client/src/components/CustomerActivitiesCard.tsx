import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Activity, UserCheck, UserX, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { crmLocale, crmText } from "@/lib/crm-localization";

interface CustomerActivity {
  type: "login" | "logout";
  customerName: string;
  phone: string;
  email: string;
  timestamp: string;
}

const CustomerActivitiesCard = () => {
  const { language, direction } = useLanguage();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: activities, isLoading, refetch } = useQuery({
    queryKey: ['/api/management/customer-activities', lastRefresh.getTime()],
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return crmText(language, "now");
    if (diffInMinutes < 60) return new Intl.RelativeTimeFormat(crmLocale(language), { numeric: "auto" }).format(-diffInMinutes, "minute");
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return new Intl.RelativeTimeFormat(crmLocale(language), { numeric: "auto" }).format(-diffInHours, "hour");
    
    const diffInDays = Math.floor(diffInHours / 24);
    return new Intl.RelativeTimeFormat(crmLocale(language), { numeric: "auto" }).format(-diffInDays, "day");
  };

  const handleRefresh = () => {
    setLastRefresh(new Date());
    refetch();
  };

  return (
    <Card dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 ml-2 text-blue-500" />
            {crmText(language, "customerActivities")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-sm text-gray-600">{crmText(language, "latestLoginActivities")}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            <span className="mr-3 text-sm">{crmText(language, "loading")}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {(activities as any)?.data?.map((activity: CustomerActivity, index: number) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 border rounded-lg ${
                  activity.type === 'login' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                {activity.type === 'login' ? (
                  <UserCheck className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <UserX className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {activity.type === 'login' ? crmText(language, "customerLogin") : crmText(language, "customerLogout")}
                  </p>
                  <div className="text-sm text-gray-700 space-y-1">
                     <p><span className="font-medium">{crmText(language, "name")}:</span> {activity.customerName}</p>
                     <p><span className="font-medium">{crmText(language, "phone")}:</span> {activity.phone}</p>
                     <p><span className="font-medium">{crmText(language, "email")}:</span> {activity.email}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {(!(activities as any)?.data || (activities as any).data?.length === 0) && (
              <div className="text-center py-6 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                 <p>{crmText(language, "noActivities")}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerActivitiesCard;