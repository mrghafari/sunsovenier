import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Key, RefreshCw, Shield, Mail, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { crmDate, crmText } from "@/lib/crm-localization";

interface PasswordManagementProps {
  customerId: number;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
}

interface PasswordStatus {
  customerId: number;
  email: string;
  hasPassword: boolean;
  maskedPassword: string;
  lastPasswordChange: string;
}

export function PasswordManagement({ customerId, customerEmail, customerName, customerPhone }: PasswordManagementProps) {
  const { language, direction } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [sendNotification, setSendNotification] = useState(true);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [generatePasswordOpen, setGeneratePasswordOpen] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<PasswordStatus | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch password status
  const { mutate: fetchPasswordStatus, isPending: fetchingStatus } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/crm/customers/${customerId}/password-status`);
      return response.data;
    },
    onSuccess: (data) => {
      setPasswordStatus(data);
    },
    onError: (error: any) => {
      toast({
        title: crmText(language, "error"),
        description: error.message || crmText(language, "failedFetchPassword"),
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const { mutate: changePassword, isPending: changingPassword } = useMutation({
    mutationFn: async ({ password, notification }: { password: string; notification: boolean }) => {
      return await apiRequest(`/api/crm/customers/${customerId}/change-password`, {
        method: "POST",
        body: { newPassword: password, sendNotification: notification },
      });
    },
    onSuccess: (data) => {
      toast({
        title: crmText(language, "success"),
        description: data.message || crmText(language, "passwordChanged"),
      });
      setChangePasswordOpen(false);
      setNewPassword("");
      fetchPasswordStatus();
      queryClient.invalidateQueries({ queryKey: [`/api/crm/customers/${customerId}`] });
    },
    onError: (error: any) => {
      toast({
        title: crmText(language, "error"),
        description: error.message || crmText(language, "failedChangePassword"),
        variant: "destructive",
      });
    },
  });

  // Generate random password mutation
  const { mutate: generatePassword, isPending: generatingPassword } = useMutation({
    mutationFn: async ({ notification }: { notification: boolean }) => {
      return await apiRequest(`/api/crm/customers/${customerId}/generate-password`, {
        method: "POST",
        body: { sendNotification: notification },
      });
    },
    onSuccess: (data) => {
      toast({
        title: crmText(language, "success"),
        description: data.message || crmText(language, "passwordGenerated"),
      });
      setGeneratePasswordOpen(false);
      fetchPasswordStatus();
      queryClient.invalidateQueries({ queryKey: [`/api/crm/customers/${customerId}`] });
      
      // Show generated password to admin
      if (data.data?.generatedPassword) {
        toast({
          title: crmText(language, "generatedPassword"),
          description: `${crmText(language, "newPassword")}: ${data.data.generatedPassword}`,
          duration: 10000,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: crmText(language, "error"),
        description: error.message || crmText(language, "failedGeneratePassword"),
        variant: "destructive",
      });
    },
  });

  // Load password status on mount
  React.useEffect(() => {
    fetchPasswordStatus();
  }, [customerId]);

  const handleChangePassword = () => {
    if (!newPassword.trim()) {
      toast({
        title: crmText(language, "error"),
        description: crmText(language, "passwordEmpty"),
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: crmText(language, "error"),
        description: crmText(language, "passwordMin"),
        variant: "destructive",
      });
      return;
    }
    
    changePassword({ password: newPassword, notification: sendNotification });
  };

  const handleGeneratePassword = () => {
    generatePassword({ notification: sendNotification });
  };

  return (
    <Card className="w-full" dir={direction}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {crmText(language, "passwordManagement")}
        </CardTitle>
        <CardDescription>
          {crmText(language, "managePassword")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Password Status Display */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-gray-600" />
            <div>
              <p className="font-medium">{crmText(language, "currentPassword")}</p>
              <p className="text-sm text-gray-600">
                {passwordStatus?.hasPassword ? (
                  <span className="flex items-center gap-2">
                    {showPassword ? passwordStatus.maskedPassword : "••••••••"}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </span>
                ) : (
                  crmText(language, "noPassword")
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPasswordStatus()}
            disabled={fetchingStatus}
          >
            {fetchingStatus ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>

        {/* Password Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Change Password */}
          <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Key className="h-4 w-4 mr-2" />
                {crmText(language, "changePassword")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{crmText(language, "changeCustomerPassword")}</DialogTitle>
                <DialogDescription>
                  {crmText(language, "setPasswordFor")} {customerName} ({customerEmail})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-password">{crmText(language, "newPassword")}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={crmText(language, "enterNewPassword")}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="send-notification"
                    checked={sendNotification}
                    onCheckedChange={setSendNotification}
                  />
                  <Label htmlFor="send-notification" className="text-sm">
                    {crmText(language, "sendNotification")}
                  </Label>
                </div>
                
                {sendNotification && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4" />
                      <span>{crmText(language, "emailWillBeSent")}: {customerEmail}</span>
                    </div>
                    {customerPhone && (
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        <span>{crmText(language, "smsWillBeSent")}: {customerPhone}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setChangePasswordOpen(false)}
                  >
                    {crmText(language, "cancel")}
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                  >
                    {changingPassword ? crmText(language, "changing") : crmText(language, "changePassword")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Generate Random Password */}
          <Dialog open={generatePasswordOpen} onOpenChange={setGeneratePasswordOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                {crmText(language, "generateRandomPassword")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{crmText(language, "generateRandomPassword")}</DialogTitle>
                <DialogDescription>
                  {crmText(language, "generateSecurePasswordFor")} {customerName} ({customerEmail})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="send-notification-gen"
                    checked={sendNotification}
                    onCheckedChange={setSendNotification}
                  />
                  <Label htmlFor="send-notification-gen" className="text-sm">
                    {crmText(language, "sendNotification")}
                  </Label>
                </div>
                
                {sendNotification && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4" />
                      <span>{crmText(language, "emailWillBeSent")}: {customerEmail}</span>
                    </div>
                    {customerPhone && (
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        <span>{crmText(language, "smsWillBeSent")}: {customerPhone}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md">
                   <strong>{crmText(language, "note")}:</strong> {crmText(language, "passwordNote")}
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setGeneratePasswordOpen(false)}
                  >
                    {crmText(language, "cancel")}
                  </Button>
                  <Button
                    onClick={handleGeneratePassword}
                    disabled={generatingPassword}
                  >
                    {generatingPassword ? crmText(language, "generating") : crmText(language, "generatePassword")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Password Status Info */}
        {passwordStatus && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            <p><strong>{crmText(language, "customer")}:</strong> {customerName}</p>
            <p><strong>{crmText(language, "email")}:</strong> {customerEmail}</p>
            <p><strong>{crmText(language, "passwordStatus")}:</strong> {passwordStatus.hasPassword ? crmText(language, "set") : crmText(language, "notSet")}</p>
            <p><strong>{crmText(language, "lastUpdated")}:</strong> {crmDate(passwordStatus.lastPasswordChange, language)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}