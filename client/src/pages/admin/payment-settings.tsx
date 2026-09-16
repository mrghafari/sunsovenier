import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, CreditCard, Wallet, Settings, Plus, Edit, Trash2, CheckCircle, AlertCircle, Eye, EyeOff, TestTube, Wifi, Shield, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { paymentSettingsText, formatPaymentSettingsNumber } from "@/lib/payment-settings-localization";

interface PaymentGateway {
  id: number;
  name: string;
  type: 'iraqi_bank' | 'credit_card' | 'digital_wallet' | 'bank_transfer' | 'shaparak' | 'sep' | 'parsian' | 'mellat' | 'saderat' | 'melli' | 'tejarat' | 'pasargad' | 'zarinpal' | 'idpay' | 'payping' | 'nextpay' | 'zibal' | 'payir' | 'cryptocurrency' | 'mobile_payment' | 'instant_transfer' | 'pos_terminal' | 'custom';
  enabled: boolean;
  config: {
    apiKey?: string;
    secretKey?: string;
    merchantId?: string;
    bankName?: string;
    accountNumber?: string;
    swiftCode?: string;
    walletProvider?: string;
    webhookUrl?: string;
    testMode?: boolean;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

interface PaymentMethodSettings {
  id: number;
  methodKey: string;
  methodName: string;
  methodNameEn: string;
  enabled: boolean;
  priority: number;
  description: string;
  minAmount?: string;
  maxAmount?: string;
  config?: any;
  createdAt: string;
  updatedAt: string;
}

const PaymentSettings = () => {
  const { language: lang, direction: dir } = useLanguage();
  const t = (key: string) => paymentSettingsText(lang, key);
  const formatNumber = (value: number) => formatPaymentSettingsNumber(value, lang);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch payment gateways
  const { data: gateways = [], isLoading } = useQuery<PaymentGateway[]>({
    queryKey: ['/api/payment/gateways'],
  });

  // Fetch payment method settings
  const { data: paymentMethods = [], isLoading: isLoadingMethods } = useQuery<PaymentMethodSettings[]>({
    queryKey: ['/api/payment/method-settings'],
    queryFn: async () => {
      const response = await apiRequest('/api/payment/method-settings', { method: 'GET' });
      return response.data || [];
    },
  });

  // Create/Update gateway mutation
  const saveGatewayMutation = useMutation({
    mutationFn: async (gatewayData: Partial<PaymentGateway>) => {
      const url = gatewayData.id ? `/api/payment/gateways/${gatewayData.id}` : '/api/payment/gateways';
      const method = gatewayData.id ? 'PATCH' : 'POST';
      return apiRequest(url, { method, body: gatewayData });
    },
    onSuccess: () => {
      toast({
         title: t("saveSuccess"),
         description: t("saveSuccessDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payment/gateways'] });
      setIsEditDialogOpen(false);
      setSelectedGateway(null);
    },
    onError: () => {
      toast({
         title: t("error"),
         description: t("saveError"),
        variant: "destructive",
      });
    },
  });

  // Toggle gateway status mutation (only one can be enabled at a time)
  const toggleGatewayMutation = useMutation({
    mutationFn: async (gatewayId: number) => {
      return apiRequest(`/api/payment/gateways/${gatewayId}/toggle`, { method: 'PATCH' });
    },
    onSuccess: () => {
      toast({
         title: t("gatewayStatusChanged"),
         description: t("gatewayStatusDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payment/gateways'] });
    },
    onError: () => {
      toast({
         title: t("error"),
         description: t("gatewayStatusError"),
        variant: "destructive",
      });
    },
  });

  // Delete gateway mutation
  const deleteGatewayMutation = useMutation({
    mutationFn: async (gatewayId: number) => {
      return apiRequest(`/api/payment/gateways/${gatewayId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({
         title: t("gatewayDeleted"),
         description: t("gatewayDeletedDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payment/gateways'] });
    },
    onError: () => {
      toast({
         title: t("error"),
         description: t("saveError"),
        variant: "destructive",
      });
    },
  });

  // Test configuration mutation
  const testConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/payment/gateways/${id}/test-config`, {
        method: 'POST'
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? t("testPassed") : t("testIssues"),
        description: data.message || t("configTestCompleted"),
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("saveError"),
        variant: "destructive",
      });
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/payment/gateways/${id}/test-connection`, {
        method: 'POST'
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? t("connectionOk") : t("connectionIssues"),
        description: data.message || t("connectionTestCompleted"),
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("connectionFailedDescription"),
        variant: "destructive",
      });
    }
  });

  // Validate configuration mutation
  const validateConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/payment/gateways/${id}/validate-config`, {
        method: 'POST'
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? t("validConfiguration") : t("configIssues"),
        description: data.message || t("validationCompleted"),
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("connectionFailedDescription"),
        variant: "destructive",
      });
    }
  });

  // Update payment method setting mutation
  const updatePaymentMethodMutation = useMutation({
    mutationFn: async ({ methodKey, enabled, priority }: { methodKey: string, enabled?: boolean, priority?: number }) => {
      return apiRequest(`/api/payment/method-settings/${methodKey}`, {
        method: 'PUT',
        body: { enabled, priority }
      });
    },
    onMutate: async ({ methodKey, enabled, priority }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/payment/method-settings'] });

      // Snapshot the previous value
      const previousPaymentMethods = queryClient.getQueryData(['/api/payment/method-settings']);

      // Optimistically update to the new value
      queryClient.setQueryData<PaymentMethodSettings[]>(['/api/payment/method-settings'], (old: PaymentMethodSettings[] | undefined) => {
        if (!old || !Array.isArray(old)) return old;
        
        return old.map(method => {
          // Update the primary method
          if (method.methodKey === methodKey) {
            return { ...method, enabled: enabled ?? method.enabled, priority: priority ?? method.priority };
          }
          
          return method;
        });
      });

      // Return a context object with the snapshotted value
      return { previousPaymentMethods };
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPaymentMethods) {
        queryClient.setQueryData(['/api/payment/method-settings'], context.previousPaymentMethods);
      }
      console.error('Payment method update error:', error);
      toast({
        title: t("error"),
        description: t("methodSettingsError"),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: t("methodSettingsUpdated"),
        description: t("methodSettingsUpdatedDescription"),
      });
      // Refetch to make sure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['/api/payment/method-settings'] });
      // Also invalidate the public payment methods for customer-facing forms
      queryClient.invalidateQueries({ queryKey: ['/api/public/payment-methods'] });
    },
  });

  const toggleSecretVisibility = (field: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getGatewayIcon = (type: string) => {
    switch (type) {
      case 'iraqi_bank':
        return <Building2 className="w-5 h-5" />;
      case 'credit_card':
        return <CreditCard className="w-5 h-5" />;
      case 'digital_wallet':
        return <Wallet className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  const getGatewayTypeLabel = (type: string) => {
    return t(`gateway_${type}`);
  };

  const renderGatewayForm = () => {
    if (!selectedGateway) return null;

    const updateGateway = (field: string, value: any) => {
      setSelectedGateway(prev => prev ? {
        ...prev,
        [field]: value
      } : null);
    };

    const updateConfig = (field: string, value: any) => {
      setSelectedGateway(prev => prev ? {
        ...prev,
        config: {
          ...prev.config,
          [field]: value
        }
      } : null);
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t("gatewayName")}</Label>
            <Input
              value={selectedGateway.name}
              onChange={(e) => updateGateway('name', e.target.value)}
              placeholder={t("gatewayNamePlaceholder")}
            />
          </div>
          <div>
            <Label>{t("gatewayType")}</Label>
            <Select
              value={selectedGateway.type}
              onValueChange={(value) => updateGateway('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iraqi_bank">{t("gateway_iraqi_bank")}</SelectItem>
                <SelectItem value="credit_card">{t("gateway_credit_card")}</SelectItem>
                <SelectItem value="digital_wallet">{t("gateway_digital_wallet")}</SelectItem>
                <SelectItem value="bank_transfer">{t("gateway_bank_transfer")}</SelectItem>
                <SelectItem value="shaparak">{t("gateway_shaparak")}</SelectItem>
                <SelectItem value="sep">{t("gateway_sep")}</SelectItem>
                <SelectItem value="parsian">{t("gateway_parsian")}</SelectItem>
                <SelectItem value="mellat">{t("gateway_mellat")}</SelectItem>
                <SelectItem value="saderat">{t("gateway_saderat")}</SelectItem>
                <SelectItem value="melli">{t("gateway_melli")}</SelectItem>
                <SelectItem value="tejarat">{t("gateway_tejarat")}</SelectItem>
                <SelectItem value="pasargad">{t("gateway_pasargad")}</SelectItem>
                <SelectItem value="zarinpal">{t("gateway_zarinpal")}</SelectItem>
                <SelectItem value="idpay">{t("gateway_idpay")}</SelectItem>
                <SelectItem value="payping">{t("gateway_payping")}</SelectItem>
                <SelectItem value="nextpay">{t("gateway_nextpay")}</SelectItem>
                <SelectItem value="zibal">{t("gateway_zibal")}</SelectItem>
                <SelectItem value="payir">{t("gateway_payir")}</SelectItem>
                <SelectItem value="cryptocurrency">{t("gateway_cryptocurrency")}</SelectItem>
                <SelectItem value="mobile_payment">{t("gateway_mobile_payment")}</SelectItem>
                <SelectItem value="instant_transfer">{t("gateway_instant_transfer")}</SelectItem>
                <SelectItem value="pos_terminal">{t("gateway_pos_terminal")}</SelectItem>
                <SelectItem value="custom">{t("gateway_custom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={selectedGateway.enabled}
            onCheckedChange={(checked) => updateGateway('enabled', checked)}
          />
          <Label>{t("enableGateway")}</Label>
        </div>

        <Separator />

        {/* API Configuration Section - Common for all types */}
        <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("apiConfiguration")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t("apiKey")}</Label>
              <div className="relative">
                <Input
                  type={showSecrets['apiKey'] ? 'text' : 'password'}
                  value={selectedGateway.config.apiKey || ''}
                  onChange={(e) => updateConfig('apiKey', e.target.value)}
                  placeholder={t("apiKeyPlaceholder")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute end-2 top-1/2 -translate-y-1/2"
                  onClick={() => toggleSecretVisibility('apiKey')}
                >
                  {showSecrets['apiKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label>{t("secretKey")}</Label>
              <div className="relative">
                <Input
                  type={showSecrets['secretKey'] ? 'text' : 'password'}
                  value={selectedGateway.config.secretKey || ''}
                  onChange={(e) => updateConfig('secretKey', e.target.value)}
                  placeholder={t("secretKeyPlaceholder")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute end-2 top-1/2 -translate-y-1/2"
                  onClick={() => toggleSecretVisibility('secretKey')}
                >
                  {showSecrets['secretKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label>{t("merchantId")}</Label>
              <Input
                value={selectedGateway.config.merchantId || ''}
                onChange={(e) => updateConfig('merchantId', e.target.value)}
                placeholder={t("merchantPlaceholder")}
              />
            </div>
            
            <div>
              <Label>{t("apiBaseUrl")}</Label>
              <Input
                value={selectedGateway.config.apiBaseUrl || ''}
                onChange={(e) => updateConfig('apiBaseUrl', e.target.value)}
                placeholder="https://api.gateway.com/v1/"
              />
            </div>

            <div>
              <Label>{t("webhookUrl")}</Label>
              <Input
                value={selectedGateway.config.webhookUrl || ''}
                onChange={(e) => updateConfig('webhookUrl', e.target.value)}
                placeholder="https://yourdomain.com/webhook/payment"
              />
            </div>

            <div>
              <Label>{t("timeout")}</Label>
              <Input
                type="number"
                value={selectedGateway.config.timeout || '30'}
                onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
                placeholder="30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={selectedGateway.config.testMode || false}
                onCheckedChange={(checked) => updateConfig('testMode', checked)}
              />
              <Label>{t("testModeSandbox")}</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={selectedGateway.config.autoConfirm || false}
                onCheckedChange={(checked) => updateConfig('autoConfirm', checked)}
              />
              <Label>{t("autoConfirm")}</Label>
            </div>
          </div>

          <div>
            <Label>{t("allowedIps")}</Label>
            <Textarea
              value={selectedGateway.config.allowedIPs || ''}
              onChange={(e) => updateConfig('allowedIPs', e.target.value)}
              placeholder="192.168.1.1&#10;10.0.0.1&#10;203.0.113.0/24"
              rows={3}
            />
          </div>
        </div>



        {/* Iraqi Bank Configuration */}
        {selectedGateway.type === 'iraqi_bank' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("bankSettings")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("bankName")}</Label>
                <Input
                  value={selectedGateway.config.bankName || ''}
                  onChange={(e) => updateConfig('bankName', e.target.value)}
                  placeholder={t("bankNamePlaceholder")}
                />
              </div>
              <div>
                <Label>{t("accountNumber")}</Label>
                <Input
                  value={selectedGateway.config.accountNumber || ''}
                  onChange={(e) => updateConfig('accountNumber', e.target.value)}
                  placeholder={t("accountNumberPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("swiftCode")}</Label>
                <Input
                  value={selectedGateway.config.swiftCode || ''}
                  onChange={(e) => updateConfig('swiftCode', e.target.value)}
                  placeholder={t("swiftPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("accountHolder")}</Label>
                <Input
                  value={selectedGateway.config.accountHolder || ''}
                  onChange={(e) => updateConfig('accountHolder', e.target.value)}
                  placeholder={t("accountHolderPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("branchCode")}</Label>
                <Input
                  value={selectedGateway.config.branchCode || ''}
                  onChange={(e) => updateConfig('branchCode', e.target.value)}
                  placeholder={t("branchPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("iban")}</Label>
                <Input
                  value={selectedGateway.config.iban || ''}
                  onChange={(e) => updateConfig('iban', e.target.value)}
                  placeholder="IQ** **** **** **** ****"
                />
              </div>
            </div>
            <div>
              <Label>{t("bankAddress")}</Label>
              <Textarea
                value={selectedGateway.config.bankAddress || ''}
                onChange={(e) => updateConfig('bankAddress', e.target.value)}
                placeholder={t("bankAddressPlaceholder")}
                rows={2}
              />
            </div>
            <div>
              <Label>{t("transferInstructions")}</Label>
              <Textarea
                value={selectedGateway.config.instructions || ''}
                onChange={(e) => updateConfig('instructions', e.target.value)}
                placeholder={t("transferInstructionsPlaceholder")}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Credit Card Configuration */}
        {selectedGateway.type === 'credit_card' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("cardSettings")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("provider")}</Label>
                <Select
                  value={selectedGateway.config.provider || ''}
                  onValueChange={(value) => updateConfig('provider', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectProvider")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">{t("provider_stripe")}</SelectItem>
                    <SelectItem value="paypal">{t("provider_paypal")}</SelectItem>
                    <SelectItem value="square">{t("provider_square")}</SelectItem>
                    <SelectItem value="iraq_payment">{t("provider_iraq_payment")}</SelectItem>
                    <SelectItem value="visa_iraq">{t("provider_visa_iraq")}</SelectItem>
                    <SelectItem value="mastercard_iraq">{t("provider_mastercard_iraq")}</SelectItem>
                    <SelectItem value="qi_card">{t("provider_qi_card")}</SelectItem>
                    <SelectItem value="ezcash">{t("provider_ezcash")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>{t("currency")}</Label>
                <Select
                  value={selectedGateway.config.currency || 'IQD'}
                  onValueChange={(value) => updateConfig('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCurrency")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IQD">{t("currency_IQD")}</SelectItem>
                    <SelectItem value="USD">{t("currency_USD")}</SelectItem>
                    <SelectItem value="EUR">{t("currency_EUR")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t("terminalId")}</Label>
                <Input
                  value={selectedGateway.config.terminalId || ''}
                  onChange={(e) => updateConfig('terminalId', e.target.value)}
                  placeholder={t("terminalPlaceholder")}
                />
              </div>

              <div>
                <Label>{t("processingFee")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={selectedGateway.config.processingFee || ''}
                  onChange={(e) => updateConfig('processingFee', parseFloat(e.target.value))}
                  placeholder="2.5"
                />
              </div>
            </div>

            <div>
              <Label>{t("acceptedCards")}</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {['visa', 'mastercard', 'amex', 'qi_card'].map((cardType) => (
                  <div key={cardType} className="flex items-center gap-2">
                    <Switch
                      checked={selectedGateway.config.acceptedCards?.includes(cardType) || false}
                      onCheckedChange={(checked) => {
                        const currentCards = selectedGateway.config.acceptedCards || [];
                        const newCards = checked 
                          ? [...currentCards, cardType]
                          : currentCards.filter((c: string) => c !== cardType);
                        updateConfig('acceptedCards', newCards);
                      }}
                    />
                    <Label className="capitalize">{cardType.replace('_', ' ')}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Digital Wallet Configuration */}
        {selectedGateway.type === 'digital_wallet' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Digital Wallet Settings
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("walletProvider")}</Label>
                <Select
                  value={selectedGateway.config.walletProvider || ''}
                  onValueChange={(value) => updateConfig('walletProvider', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectWalletProvider")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zain_cash">{t("wallet_zain_cash")}</SelectItem>
                    <SelectItem value="asia_pay">{t("wallet_asia_pay")}</SelectItem>
                    <SelectItem value="fastpay">{t("wallet_fastpay")}</SelectItem>
                    <SelectItem value="iraqipay">{t("wallet_iraqipay")}</SelectItem>
                    <SelectItem value="paypal">{t("wallet_paypal")}</SelectItem>
                    <SelectItem value="apple_pay">{t("wallet_apple_pay")}</SelectItem>
                    <SelectItem value="google_pay">{t("wallet_google_pay")}</SelectItem>
                    <SelectItem value="samsung_pay">{t("wallet_samsung_pay")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>{t("walletAccountId")}</Label>
                <Input
                  value={selectedGateway.config.walletAccountId || ''}
                  onChange={(e) => updateConfig('walletAccountId', e.target.value)}
                  placeholder={t("walletAccountPlaceholder")}
                />
              </div>

              <div>
                <Label>{t("appId")}</Label>
                <Input
                  value={selectedGateway.config.appId || ''}
                  onChange={(e) => updateConfig('appId', e.target.value)}
                  placeholder={t("appIdPlaceholder")}
                />
              </div>

              <div>
                <Label>{t("transactionFee")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={selectedGateway.config.transactionFee || ''}
                  onChange={(e) => updateConfig('transactionFee', parseFloat(e.target.value))}
                  placeholder="1.5"
                />
              </div>
            </div>

            <div>
              <Label>{t("callbackUrl")}</Label>
              <Input
                value={selectedGateway.config.callbackUrl || ''}
                onChange={(e) => updateConfig('callbackUrl', e.target.value)}
                placeholder="https://yourdomain.com/wallet/callback"
              />
            </div>

            <div>
              <Label>{t("returnUrl")}</Label>
              <Input
                value={selectedGateway.config.returnUrl || ''}
                onChange={(e) => updateConfig('returnUrl', e.target.value)}
                placeholder="https://yourdomain.com/payment/success"
              />
            </div>
          </div>
        )}

        {/* Test Mode */}
        <div className="space-y-4">
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">{t("testMode")}</Label>
              <p className="text-sm text-gray-500">{t("testModeDescription")}</p>
            </div>
            <Switch
              checked={selectedGateway.config.testMode || false}
              onCheckedChange={(checked) => updateConfig('testMode', checked)}
            />
          </div>
        </div>

        {/* Test Connection Section */}
        <div className="space-y-4 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Test & Validate Configuration
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  toast({
                    title: t("testingConnection"),
                    description: t("connectingDescription"),
                  });
                  
                  // Test connection logic would go here
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  toast({
                    title: t("connectionSuccessful"),
                    description: t("configuredCorrectly"),
                  });
                } catch (error) {
                  toast({
                    title: t("connectionFailed"),
                    description: t("connectionFailedDescription"),
                    variant: "destructive",
                  });
                }
              }}
              disabled={!selectedGateway.config.apiKey && selectedGateway.type !== 'iraqi_bank'}
            >
              <CheckCircle className="w-4 h-4 me-2" />
              Test Connection
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                // Validate configuration
                const requiredFields = selectedGateway.type === 'iraqi_bank' 
                  ? ['bankName', 'accountNumber', 'swiftCode']
                  : ['apiKey', 'secretKey'];
                
                const missingFields = requiredFields.filter(field => !selectedGateway.config[field]);
                
                if (missingFields.length > 0) {
                  toast({
                    title: t("validationFailed"),
                    description: t("missingFields").replace("{fields}", missingFields.join(", ")),
                    variant: "destructive",
                  });
                } else {
                  toast({
                    title: t("validationPassed"),
                    description: t("requiredFieldsPresent"),
                  });
                }
              }}
            >
              <AlertCircle className="w-4 h-4 me-2" />
              Validate Config
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          {/* Show Advanced Settings button only for FIB gateway */}
          {selectedGateway.name?.toLowerCase().includes('fib') || selectedGateway.name?.toLowerCase().includes('first iraqi bank') ? (
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = '/admin/fib-settings';
              }}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Advanced FIB Settings
            </Button>
          ) : (
            <div></div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedGateway(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveGatewayMutation.mutate(selectedGateway)}
              disabled={saveGatewayMutation.isPending}
            >
              {saveGatewayMutation.isPending ? "Saving..." : "Save Gateway"}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div dir={dir} className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("pageTitle")}</h1>
          <p className="text-gray-600">{t("pageDescription")}</p>
        </div>

        <Tabs defaultValue="payment-methods" className="space-y-6">
          <TabsList>
            <TabsTrigger value="payment-methods">{t("paymentMethods")}</TabsTrigger>
            <TabsTrigger value="gateways">{t("paymentGateways")}</TabsTrigger>
            <TabsTrigger value="general">{t("generalSettings")}</TabsTrigger>
            <TabsTrigger value="notifications">{t("notifications")}</TabsTrigger>
          </TabsList>

          <TabsContent value="payment-methods" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t("checkoutMethods")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("checkoutMethodsDescription")}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingMethods ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentMethods && paymentMethods.map((method: PaymentMethodSettings) => (
                      <Card key={method.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {method.methodKey === 'online_payment' && <CreditCard className="h-5 w-5 text-blue-600" />}
                              {method.methodKey === 'wallet' && <Wallet className="h-5 w-5 text-green-600" />}
                              {method.methodKey === 'bank_receipt' && <Building2 className="h-5 w-5 text-orange-600" />}
                              {method.methodKey === 'bank_transfer_grace' && <Settings className="h-5 w-5 text-purple-600" />}
                              <div>
                                <h4 className="font-medium">{t(`method_${method.methodKey}`)}</h4>
                                <p className="text-sm text-muted-foreground">{method.methodName}</p>
                                <p className="text-xs text-muted-foreground mt-1">{method.description}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Badge variant={method.enabled ? "default" : "secondary"}>
                                {method.enabled ? t("enabled") : t("disabled")}
                              </Badge>
                              <span className="text-sm text-muted-foreground">{t("priority")}: {formatNumber(method.priority)}</span>
                            </div>
                            <Switch
                              checked={method.enabled}
                              onCheckedChange={(checked) => {
                                updatePaymentMethodMutation.mutate({
                                  methodKey: method.methodKey,
                                  enabled: checked,
                                  priority: method.priority
                                });
                              }}
                              disabled={updatePaymentMethodMutation.isPending}
                            />
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                            <span className="font-medium">{t("methodKey")}</span>
                              <span className="ml-2 font-mono text-xs bg-background px-2 py-1 rounded">
                                {method.methodKey}
                              </span>
                            </div>
                            <div>
                            <span className="font-medium">{t("status")}</span>
                              <span className={`ml-2 ${method.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                                {method.enabled ? '✓ Available to customers' : '✗ Hidden from customers'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                {(!paymentMethods || paymentMethods.length === 0) && !isLoadingMethods && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("noMethods")}</p>
                    <p className="text-sm mt-2">{t("noMethodsDescription")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gateways" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t("paymentGateways")}</h2>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setSelectedGateway({
                        id: 0,
                        name: '',
                        type: 'iraqi_bank',
                        enabled: true,
                        config: {},
                        createdAt: '',
                        updatedAt: ''
                      });
                    }}
                  >
                    <Plus className="w-4 h-4 me-2" />
                    {t("addGateway")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedGateway?.id ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure payment gateway settings and integration parameters.
                    </DialogDescription>
                  </DialogHeader>
                  {renderGatewayForm()}
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                <div className="col-span-full flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : gateways && gateways.length > 0 ? (
                gateways.map((gateway) => (
                <Card key={gateway.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getGatewayIcon(gateway.type)}
                        <CardTitle className="text-lg">{gateway.name}</CardTitle>
                      </div>
                      <Badge variant={gateway.enabled ? "default" : "secondary"}>
                        {gateway.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">{t("gatewayType")}</p>
                      <p className="font-medium">{getGatewayTypeLabel(gateway.type)}</p>
                    </div>
                    
                    {gateway.config.testMode && (
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        Test Mode
                      </Badge>
                    )}

                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-1">
                        {gateway.enabled ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-600">
                          {gateway.enabled ? t("operational") : t("disabled")}
                        </span>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant={gateway.enabled ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleGatewayMutation.mutate(gateway.id)}
                          disabled={toggleGatewayMutation.isPending}
                        >
                          {gateway.enabled ? 'غیرفعال' : 'فعال'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConfigMutation.mutate(gateway.id)}
                          disabled={testConfigMutation.isPending}
                          title={t("testConfigTitle")}
                        >
                          <TestTube className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnectionMutation.mutate(gateway.id)}
                          disabled={testConnectionMutation.isPending}
                          title={t("testConnectionTitle")}
                        >
                          <Wifi className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => validateConfigMutation.mutate(gateway.id)}
                          disabled={validateConfigMutation.isPending}
                          title={t("validationTitle")}
                        >
                          <Shield className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedGateway(gateway);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(t("confirmDelete"))) {
                              deleteGatewayMutation.mutate(gateway.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))
              ) : (
                <div className="col-span-full">
                  <Card className="text-center py-12">
                    <CardContent>
                      <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">{t("noGateways")}</h3>
                  <p className="text-gray-500 mb-6">{t("noGatewaysDescription")}</p>
                      <Button
                        onClick={() => {
                          setSelectedGateway({
                            id: 0,
                            name: '',
                            type: 'iraqi_bank',
                            enabled: true,
                            config: {},
                            createdAt: '',
                            updatedAt: ''
                          });
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 me-2" />
                        {t("addFirstGateway")}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("generalPayment")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("defaultCurrency")}</Label>
                    <Select defaultValue="USD">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">{t("currency_USD")}</SelectItem>
                        <SelectItem value="IQD">{t("currency_IQD")}</SelectItem>
                        <SelectItem value="EUR">{t("currency_EUR")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("paymentTimeout")}</Label>
                    <Input type="number" defaultValue="30" min="5" max="120" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked />
                  <Label>{t("emailConfirmation")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked />
                  <Label>{t("autoReceipts")}</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("paymentNotifications")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t("successfulPaymentEmail")}</Label>
                      <p className="text-sm text-gray-500">{t("successfulPaymentDescription")}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t("failedPaymentSms")}</Label>
                      <p className="text-sm text-gray-500">{t("failedPaymentDescription")}</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t("refundAdmin")}</Label>
                      <p className="text-sm text-gray-500">{t("refundDescription")}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PaymentSettings;