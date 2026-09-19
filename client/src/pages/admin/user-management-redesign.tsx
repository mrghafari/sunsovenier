import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Shield, 
  Key, 
  UserPlus, 
  Edit, 
  Trash2, 
  Settings,
  Plus,
  Save,
  UserCheck,
  Crown,
  Eye,
  EyeOff,
  MessageSquare,
  Phone,
  Mail,
  Lock,
  Send,
  ShoppingCart,
  Package,
  BarChart3,
  DollarSign,
  Warehouse,
  Truck,
  FileText,
  Database,
  Search,
  Zap,
  Globe,
  Smartphone,
  HardDrive,
  UserCog,
  Calendar,
  QrCode,
  Factory,
  Users2,
  BookOpen,
  TestTube,
  CreditCard,
  Wallet,
  MapPin,
  RefreshCw,
  Edit3,
  Ticket,
  AlertTriangle,
  CheckCircle,
  X,
  Monitor,
  Server,
  LayoutDashboard
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';

const financialApprovalLabels = {
  en: "Financial Approval",
  fa: "تایید مالی",
  ar: "الاعتماد المالي",
  tr: "Mali onay",
} as const;

type Language = keyof typeof financialApprovalLabels;

type TranslationDictionary = {
  authChecking: string;
  restrictedAccess: string;
  loginRequired: string;
  adminLogin: string;
  pageTitle: string;
  pageDescription: string;
  syncedWithSiteManagement: string;
  modulesCount: string;
  sendSms: string;
  users: string;
  roles: string;
  modules: string;
  userList: string;
  addNewUser: string;
  editUser: string;
  fullName: string;
  firstAndLastName: string;
  emailPlaceholder: string;
  phonePlaceholder: string;
  email: string;
  smsLabel: string;
  emailLabel: string;
  phoneNumber: string;
  password: string;
  selectRole: string;
  smsNotifications: string;
  receiveSms: string;
  emailNotifications: string;
  receiveEmails: string;
  cancel: string;
  update: string;
  create: string;
  loading: string;
  noUsers: string;
  user: string;
  role: string;
  contact: string;
  notifications: string;
  status: string;
  actions: string;
  active: string;
  inactive: string;
  deleteUserConfirm: string;
  roleManagement: string;
  addNewRole: string;
  editRole: string;
  systemRoleName: string;
  systemRoleNamePlaceholder: string;
  displayRoleName: string;
  roleDescription: string;
  roleDescriptionPlaceholder: string;
  roleColor: string;
  rolePriority: string;
  moduleAssignment: string;
  assigned: string;
  availableModules: string;
  assignedModules: string;
  allModulesAssigned: string;
  noModulesAssigned: string;
  clickToAssign: string;
  assignCoreOnly: string;
  assignAll: string;
  clearAll: string;
  noRoles: string;
  userCount: string;
  permissions: string;
  deleteRoleConfirm: string;
  systemModulesAccess: string;
  modulesDescription: string;
  syncModules: string;
  siteManagementModules: string;
  assignableModules: string;
  totalModules: string;
  assignmentViaRoles: string;
  howToAssign: string;
  assignmentInstructions: string;
  bulkSms: string;
  recipients: string;
  smsText: string;
  smsPlaceholder: string;
  sendSmsAction: string;
  changePassword: string;
  newPassword: string;
  enterNewPassword: string;
  changePasswordAction: string;
  error: string;
  failedChangePassword: string;
  newRoleCreated: string;
  roleUpdated: string;
  roleDeleted: string;
  newUserCreated: string;
  userUpdated: string;
  userDeleted: string;
  passwordChanged: string;
  smsSent: string;
  syncSuccessful: string;
  modulesSynchronized: string;
  syncError: string;
  syncProblem: string;
  roleNameMin: string;
  displayNameMin: string;
  fullNameMin: string;
  validEmail: string;
  phoneMin: string;
  passwordMin: string;
  roleRequired: string;
  showPassword: string;
  hidePassword: string;
  edit: string;
  changePasswordLabel: string;
  delete: string;
  selectAllUsers: string;
  selectUser: string;
  accessAssignmentTitle: string;
  moduleWord: string;
  moduleLabels: Record<string, string>;
};

const translations: Record<Language, TranslationDictionary> = {
  en: {
    authChecking: 'Checking authentication...',
    restrictedAccess: 'Restricted access',
    loginRequired: 'You must log in to access user management.',
    adminLogin: 'Log in to admin',
    pageTitle: 'User and Role Management',
    pageDescription: 'Manage users, roles, and permissions',
    syncedWithSiteManagement: '✓ Synced with Site Management',
    modulesCount: '{count} modules',
    sendSms: 'Send SMS ({count})',
    users: 'Users ({count})',
    roles: 'Roles ({count})',
    modules: 'Modules ({count})',
    userList: 'User List',
    addNewUser: 'Add New User',
    editUser: 'Edit User',
    fullName: 'Full Name',
    firstAndLastName: 'First and Last Name',
    emailPlaceholder: 'user@example.com',
    phonePlaceholder: '+1234567890',
    email: 'Email',
    smsLabel: 'SMS',
    emailLabel: 'Email',
    phoneNumber: 'Phone Number',
    password: 'Password',
    selectRole: 'Select a role',
    smsNotifications: 'SMS Notifications',
    receiveSms: 'Receive SMS messages',
    emailNotifications: 'Email Notifications',
    receiveEmails: 'Receive emails',
    cancel: 'Cancel',
    update: 'Update',
    create: 'Create',
    loading: 'Loading...',
    noUsers: 'No users found',
    user: 'User',
    role: 'Role',
    contact: 'Contact',
    notifications: 'Notifications',
    status: 'Status',
    actions: 'Actions',
    active: 'Active',
    inactive: 'Inactive',
    deleteUserConfirm: 'Are you sure you want to delete this user?',
    roleManagement: 'Role Management',
    addNewRole: 'Add New Role',
    editRole: 'Edit Role',
    systemRoleName: 'System Role Name',
    systemRoleNamePlaceholder: 'manager_role',
    displayRoleName: 'Display Name',
    roleDescription: 'Role Description',
    roleDescriptionPlaceholder: 'Describe the role and responsibilities...',
    roleColor: 'Role Color',
    rolePriority: 'Role Priority',
    moduleAssignment: 'Module Assignment',
    assigned: '{count} assigned',
    availableModules: 'Available Modules',
    assignedModules: 'Assigned Modules',
    allModulesAssigned: 'All modules assigned',
    noModulesAssigned: 'No modules assigned',
    clickToAssign: 'Click modules from the Available list to assign',
    assignCoreOnly: 'Assign Core Only',
    assignAll: 'Assign All',
    clearAll: 'Clear All',
    noRoles: 'No roles defined',
    userCount: 'Users:',
    permissions: 'Permissions:',
    deleteRoleConfirm: 'Are you sure you want to delete this role?',
    systemModulesAccess: 'System Modules and Access',
    modulesDescription: 'Manage user access to the different system modules',
    syncModules: 'Sync Modules',
    siteManagementModules: 'Site Management Modules',
    assignableModules: 'Total modules available for user assignment',
    totalModules: 'Total modules',
    assignmentViaRoles: 'Access can be assigned through Role Management',
    howToAssign: 'How to assign permissions',
    assignmentInstructions: 'To assign these modules to users, go to “Roles” and create or edit a role with specific permissions. You can then assign each user a role that controls access to these {count} modules.',
    bulkSms: 'Bulk SMS',
    recipients: 'Recipients ({count} users)',
    smsText: 'SMS text',
    smsPlaceholder: 'Enter your SMS text...',
    sendSmsAction: 'Send SMS',
    changePassword: 'Change Password',
    newPassword: 'New Password',
    enterNewPassword: 'Enter new password',
    changePasswordAction: 'Change Password',
    error: 'Error',
    failedChangePassword: 'Failed to change password',
    newRoleCreated: 'New role created successfully',
    roleUpdated: 'Role updated successfully',
    roleDeleted: 'Role deleted successfully',
    newUserCreated: 'New user created successfully',
    userUpdated: 'User updated successfully',
    userDeleted: 'User deleted successfully',
    passwordChanged: 'Password changed successfully',
    smsSent: 'SMS sent successfully',
    syncSuccessful: 'Sync Successful',
    modulesSynchronized: 'Modules synchronized with Site Management',
    syncError: 'Sync Error',
    syncProblem: 'Problem occurred during module synchronization',
    roleNameMin: 'Role name must be at least 2 characters',
    displayNameMin: 'Display name must be at least 2 characters',
    fullNameMin: 'Full name must be at least 2 characters',
    validEmail: 'Please enter a valid email',
    phoneMin: 'Phone number must be at least 10 digits',
    passwordMin: 'Password must be at least 6 characters',
    roleRequired: 'Please select a role',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    edit: 'Edit',
    changePasswordLabel: 'Change password',
    delete: 'Delete',
    selectAllUsers: 'Select all users',
    selectUser: 'Select user',
    accessAssignmentTitle: 'Permission assignment',
    moduleWord: 'Module',
    moduleLabels: {
      kpi_dashboard: 'KPI Dashboard', management_dashboard: 'Management Dashboard', syncing_shop: 'Syncing Shop',
      shop_management: 'Shop Management', product_management: 'Product Management', order_management: 'Order Management',
      warehouse_management: 'Warehouse Management', logistics_management: 'Logistics Management', delivery_confirmation: 'Courier / Carrier Delivery Confirmation', inquiries: 'Inquiries',
      crm: 'CRM', barcode: 'Barcode Management', email_settings: 'Email Settings', database_backup: 'Database Backup',
      seo: 'SEO Management', categories: 'Categories', sms: 'SMS Management', factory: 'Factory Management',
      user_management: 'User Management', procedures: 'Procedures', payment_management: 'Payment Management',
      accounting_management: 'Accounting Management', finance: 'Financial Approval', wallet_management: 'Wallet Management',
      geography_analytics: 'Geography Analytics', ai_settings: 'AI Settings', refresh_control: 'Refresh Control',
      content_management: 'Content Management', ticketing_system: 'Ticketing System', remote_desktop: 'Remote Desktop',
      server_config: 'Server Config', company_information: 'Company Information', user_guide: 'User Guide',
      marketing_module: 'Marketing Module', aws_s3_settings: 'AWS S3 Settings', whatsapp_crm: 'WhatsApp CRM'
    }
  },
  fa: {
    authChecking: 'در حال بررسی احراز هویت...',
    restrictedAccess: 'دسترسی محدود',
    loginRequired: 'برای دسترسی به مدیریت کاربران باید ابتدا وارد سیستم شوید.',
    adminLogin: 'ورود به سیستم مدیریت',
    pageTitle: 'مدیریت کاربران و نقش‌ها',
    pageDescription: 'مدیریت کامل کاربران، نقش‌ها و دسترسی‌ها',
    syncedWithSiteManagement: '✓ همگام با مدیریت سایت',
    modulesCount: '{count} ماژول',
    sendSms: 'ارسال SMS ({count})',
    users: 'کاربران ({count})',
    roles: 'نقش‌ها ({count})',
    modules: 'ماژول‌ها ({count})',
    userList: 'فهرست کاربران',
    addNewUser: 'افزودن کاربر جدید',
    editUser: 'ویرایش کاربر',
    fullName: 'نام کامل',
    firstAndLastName: 'نام و نام خانوادگی',
    emailPlaceholder: 'user@example.com',
    phonePlaceholder: '+1234567890',
    email: 'ایمیل',
    smsLabel: 'SMS',
    emailLabel: 'ایمیل',
    phoneNumber: 'شماره تلفن',
    password: 'رمز عبور',
    selectRole: 'یک نقش انتخاب کنید',
    smsNotifications: 'اعلان‌های SMS',
    receiveSms: 'دریافت پیامک',
    emailNotifications: 'اعلان‌های ایمیل',
    receiveEmails: 'دریافت ایمیل',
    cancel: 'لغو',
    update: 'به‌روزرسانی',
    create: 'ایجاد',
    loading: 'در حال بارگذاری...',
    noUsers: 'هیچ کاربری یافت نشد',
    user: 'کاربر',
    role: 'نقش',
    contact: 'اطلاعات تماس',
    notifications: 'اعلان‌ها',
    status: 'وضعیت',
    actions: 'عملیات',
    active: 'فعال',
    inactive: 'غیرفعال',
    deleteUserConfirm: 'آیا مطمئن هستید که می‌خواهید این کاربر را حذف کنید؟',
    roleManagement: 'مدیریت نقش‌ها',
    addNewRole: 'افزودن نقش جدید',
    editRole: 'ویرایش نقش',
    systemRoleName: 'نام سیستمی نقش',
    systemRoleNamePlaceholder: 'manager_role',
    displayRoleName: 'نام نمایشی نقش',
    roleDescription: 'توضیحات نقش',
    roleDescriptionPlaceholder: 'توضیح کامل نقش و وظایف...',
    roleColor: 'رنگ نقش',
    rolePriority: 'اولویت نقش',
    moduleAssignment: 'تخصیص ماژول',
    assigned: '{count} تخصیص‌یافته',
    availableModules: 'ماژول‌های موجود',
    assignedModules: 'ماژول‌های تخصیص‌یافته',
    allModulesAssigned: 'همه ماژول‌ها تخصیص یافته‌اند',
    noModulesAssigned: 'هیچ ماژولی تخصیص نیافته است',
    clickToAssign: 'برای تخصیص، روی ماژول‌های فهرست موجود کلیک کنید',
    assignCoreOnly: 'تخصیص فقط اصلی‌ها',
    assignAll: 'تخصیص همه',
    clearAll: 'حذف همه',
    noRoles: 'هیچ نقشی تعریف نشده است',
    userCount: 'تعداد کاربران:',
    permissions: 'دسترسی‌ها:',
    deleteRoleConfirm: 'آیا مطمئن هستید که می‌خواهید این نقش را حذف کنید؟',
    systemModulesAccess: 'ماژول‌های سیستم و دسترسی‌ها',
    modulesDescription: 'مدیریت دسترسی کاربران به ماژول‌های مختلف سیستم',
    syncModules: 'همگام‌سازی ماژول‌ها',
    siteManagementModules: 'ماژول‌های مدیریت سایت',
    assignableModules: 'مجموع ماژول‌های قابل تخصیص برای کاربران',
    totalModules: 'کل ماژول‌ها',
    assignmentViaRoles: 'تخصیص دسترسی از طریق مدیریت نقش‌ها امکان‌پذیر است',
    howToAssign: 'نحوه تخصیص دسترسی‌ها',
    assignmentInstructions: 'برای تخصیص این ماژول‌ها به کاربران، به بخش «نقش‌ها» بروید و نقش‌هایی با دسترسی‌های خاص ایجاد یا ویرایش کنید. سپس هر کاربر را می‌توانید به نقشی تخصیص دهید که دسترسی او به این {count} ماژول را تعیین می‌کند.',
    bulkSms: 'ارسال پیامک جمعی',
    recipients: 'گیرندگان ({count} کاربر)',
    smsText: 'متن پیامک',
    smsPlaceholder: 'متن پیامک خود را وارد کنید...',
    sendSmsAction: 'ارسال پیامک',
    changePassword: 'تغییر رمز عبور',
    newPassword: 'رمز عبور جدید',
    enterNewPassword: 'رمز عبور جدید را وارد کنید',
    changePasswordAction: 'تغییر رمز عبور',
    error: 'خطا',
    failedChangePassword: 'تغییر رمز عبور ناموفق بود',
    newRoleCreated: 'نقش جدید با موفقیت ایجاد شد',
    roleUpdated: 'نقش با موفقیت به‌روزرسانی شد',
    roleDeleted: 'نقش با موفقیت حذف شد',
    newUserCreated: 'کاربر جدید با موفقیت ایجاد شد',
    userUpdated: 'کاربر با موفقیت به‌روزرسانی شد',
    userDeleted: 'کاربر با موفقیت حذف شد',
    passwordChanged: 'رمز عبور با موفقیت تغییر کرد',
    smsSent: 'پیامک با موفقیت ارسال شد',
    syncSuccessful: 'همگام‌سازی موفق',
    modulesSynchronized: 'ماژول‌ها با مدیریت سایت همگام شدند',
    syncError: 'خطای همگام‌سازی',
    syncProblem: 'در همگام‌سازی ماژول‌ها مشکلی رخ داد',
    roleNameMin: 'نام نقش باید حداقل ۲ نویسه باشد',
    displayNameMin: 'نام نمایشی باید حداقل ۲ نویسه باشد',
    fullNameMin: 'نام کامل باید حداقل ۲ نویسه باشد',
    validEmail: 'لطفاً یک ایمیل معتبر وارد کنید',
    phoneMin: 'شماره تلفن باید حداقل ۱۰ رقم باشد',
    passwordMin: 'رمز عبور باید حداقل ۶ نویسه باشد',
    roleRequired: 'لطفاً یک نقش انتخاب کنید',
    showPassword: 'نمایش رمز عبور',
    hidePassword: 'پنهان کردن رمز عبور',
    edit: 'ویرایش', changePasswordLabel: 'تغییر رمز عبور', delete: 'حذف',
    selectAllUsers: 'انتخاب همه کاربران', selectUser: 'انتخاب کاربر',
    accessAssignmentTitle: 'تخصیص دسترسی', moduleWord: 'ماژول',
    moduleLabels: {
      kpi_dashboard: 'داشبورد شاخص‌های کلیدی', management_dashboard: 'داشبورد مدیریت', syncing_shop: 'همگام‌سازی فروشگاه',
      shop_management: 'مدیریت فروشگاه', product_management: 'مدیریت محصولات', order_management: 'مدیریت سفارش‌ها',
      warehouse_management: 'مدیریت انبار', logistics_management: 'مدیریت لجستیک', delivery_confirmation: 'تأیید تحویل پیک / حمل‌کننده', inquiries: 'استعلام‌ها', crm: 'CRM',
      barcode: 'مدیریت بارکد', email_settings: 'تنظیمات ایمیل', database_backup: 'پشتیبان‌گیری پایگاه داده',
      seo: 'مدیریت SEO', categories: 'دسته‌بندی‌ها', sms: 'مدیریت SMS', factory: 'مدیریت کارخانه',
      user_management: 'مدیریت کاربران', procedures: 'رویه‌ها', payment_management: 'مدیریت پرداخت',
      accounting_management: 'مدیریت حسابداری', finance: 'تایید مالی', wallet_management: 'مدیریت کیف پول',
      geography_analytics: 'تحلیل جغرافیا', ai_settings: 'تنظیمات هوش مصنوعی', refresh_control: 'کنترل به‌روزرسانی',
      content_management: 'مدیریت محتوا', ticketing_system: 'سامانه تیکت', remote_desktop: 'دسکتاپ راه دور',
      server_config: 'پیکربندی سرور', company_information: 'اطلاعات شرکت', user_guide: 'راهنمای کاربر',
      marketing_module: 'ماژول بازاریابی', aws_s3_settings: 'تنظیمات AWS S3', whatsapp_crm: 'CRM واتساپ'
    }
  },
  ar: {
    authChecking: 'جارٍ التحقق من المصادقة...',
    restrictedAccess: 'وصول مقيّد',
    loginRequired: 'يجب تسجيل الدخول للوصول إلى إدارة المستخدمين.',
    adminLogin: 'تسجيل الدخول إلى الإدارة',
    pageTitle: 'إدارة المستخدمين والأدوار',
    pageDescription: 'إدارة المستخدمين والأدوار والصلاحيات',
    syncedWithSiteManagement: '✓ متزامن مع إدارة الموقع',
    modulesCount: '{count} وحدة',
    sendSms: 'إرسال SMS ({count})',
    users: 'المستخدمون ({count})', roles: 'الأدوار ({count})', modules: 'الوحدات ({count})',
    userList: 'قائمة المستخدمين', addNewUser: 'إضافة مستخدم جديد', editUser: 'تعديل المستخدم',
    fullName: 'الاسم الكامل', firstAndLastName: 'الاسم الأول والأخير', emailPlaceholder: 'user@example.com',
    phonePlaceholder: '+1234567890', email: 'البريد الإلكتروني', smsLabel: 'SMS', emailLabel: 'البريد الإلكتروني',
    phoneNumber: 'رقم الهاتف', password: 'كلمة المرور', selectRole: 'اختر دوراً',
    smsNotifications: 'إشعارات SMS', receiveSms: 'استقبال رسائل SMS', emailNotifications: 'إشعارات البريد',
    receiveEmails: 'استقبال رسائل البريد', cancel: 'إلغاء', update: 'تحديث', create: 'إنشاء',
    loading: 'جارٍ التحميل...', noUsers: 'لم يتم العثور على مستخدمين', user: 'المستخدم', role: 'الدور',
    contact: 'جهة الاتصال', notifications: 'الإشعارات', status: 'الحالة', actions: 'الإجراءات',
    active: 'نشط', inactive: 'غير نشط', deleteUserConfirm: 'هل أنت متأكد من حذف هذا المستخدم؟',
    roleManagement: 'إدارة الأدوار', addNewRole: 'إضافة دور جديد', editRole: 'تعديل الدور',
    systemRoleName: 'اسم الدور النظامي', systemRoleNamePlaceholder: 'manager_role', displayRoleName: 'الاسم المعروض', roleDescription: 'وصف الدور',
    roleDescriptionPlaceholder: 'صف الدور ومسؤولياته...', roleColor: 'لون الدور', rolePriority: 'أولوية الدور',
    moduleAssignment: 'تعيين الوحدات', assigned: 'تم تعيين {count}', availableModules: 'الوحدات المتاحة',
    assignedModules: 'الوحدات المعينة', allModulesAssigned: 'تم تعيين جميع الوحدات',
    noModulesAssigned: 'لم يتم تعيين وحدات', clickToAssign: 'انقر على الوحدات من القائمة المتاحة لتعيينها',
    assignCoreOnly: 'تعيين الأساسية فقط', assignAll: 'تعيين الكل', clearAll: 'مسح الكل',
    noRoles: 'لم يتم تعريف أدوار', userCount: 'المستخدمون:', permissions: 'الصلاحيات:',
    deleteRoleConfirm: 'هل أنت متأكد من حذف هذا الدور؟', systemModulesAccess: 'وحدات النظام والصلاحيات',
    modulesDescription: 'إدارة وصول المستخدمين إلى وحدات النظام المختلفة', syncModules: 'مزامنة الوحدات',
    siteManagementModules: 'وحدات إدارة الموقع', assignableModules: 'إجمالي الوحدات المتاحة لتعيين المستخدمين',
    totalModules: 'إجمالي الوحدات', assignmentViaRoles: 'يمكن تعيين الصلاحيات من خلال إدارة الأدوار',
    howToAssign: 'كيفية تعيين الصلاحيات',
    assignmentInstructions: 'لتعيين هذه الوحدات للمستخدمين، انتقل إلى «الأدوار» وأنشئ أو عدّل دوراً بصلاحيات محددة. ثم يمكنك تعيين كل مستخدم إلى دور يحدد وصوله إلى هذه الوحدات وعددها {count}.',
    bulkSms: 'إرسال رسائل SMS جماعية', recipients: 'المستلمون ({count} مستخدم)', smsText: 'نص الرسالة',
    smsPlaceholder: 'أدخل نص الرسالة...', sendSmsAction: 'إرسال الرسالة', changePassword: 'تغيير كلمة المرور',
    newPassword: 'كلمة المرور الجديدة', enterNewPassword: 'أدخل كلمة المرور الجديدة',
    changePasswordAction: 'تغيير كلمة المرور', error: 'خطأ', failedChangePassword: 'فشل تغيير كلمة المرور',
    newRoleCreated: 'تم إنشاء الدور الجديد بنجاح', roleUpdated: 'تم تحديث الدور بنجاح', roleDeleted: 'تم حذف الدور بنجاح',
    newUserCreated: 'تم إنشاء المستخدم الجديد بنجاح', userUpdated: 'تم تحديث المستخدم بنجاح', userDeleted: 'تم حذف المستخدم بنجاح',
    passwordChanged: 'تم تغيير كلمة المرور بنجاح', smsSent: 'تم إرسال الرسالة بنجاح',
    syncSuccessful: 'تمت المزامنة بنجاح', modulesSynchronized: 'تمت مزامنة الوحدات مع إدارة الموقع',
    syncError: 'خطأ في المزامنة', syncProblem: 'حدثت مشكلة أثناء مزامنة الوحدات',
    roleNameMin: 'يجب أن يتكون اسم الدور من حرفين على الأقل', displayNameMin: 'يجب أن يتكون الاسم المعروض من حرفين على الأقل',
    fullNameMin: 'يجب أن يتكون الاسم الكامل من حرفين على الأقل', validEmail: 'يرجى إدخال بريد إلكتروني صالح',
    phoneMin: 'يجب أن يتكون رقم الهاتف من 10 أرقام على الأقل', passwordMin: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل',
    roleRequired: 'يرجى اختيار دور', showPassword: 'إظهار كلمة المرور', hidePassword: 'إخفاء كلمة المرور',
    edit: 'تعديل', changePasswordLabel: 'تغيير كلمة المرور', delete: 'حذف', selectAllUsers: 'تحديد جميع المستخدمين', selectUser: 'تحديد المستخدم', accessAssignmentTitle: 'تعيين الصلاحيات', moduleWord: 'وحدة',
    moduleLabels: {
      kpi_dashboard: 'لوحة مؤشرات الأداء', management_dashboard: 'لوحة الإدارة', syncing_shop: 'مزامنة المتجر',
      shop_management: 'إدارة المتجر', product_management: 'إدارة المنتجات', order_management: 'إدارة الطلبات',
      warehouse_management: 'إدارة المستودعات', logistics_management: 'إدارة الخدمات اللوجستية', delivery_confirmation: 'تأكيد تسليم المندوب / الناقل', inquiries: 'الاستفسارات',
      crm: 'CRM', barcode: 'إدارة الباركود', email_settings: 'إعدادات البريد', database_backup: 'نسخ قاعدة البيانات',
      seo: 'إدارة SEO', categories: 'الفئات', sms: 'إدارة SMS', factory: 'إدارة المصنع', user_management: 'إدارة المستخدمين',
      procedures: 'الإجراءات', payment_management: 'إدارة المدفوعات', accounting_management: 'إدارة المحاسبة',
      finance: 'الاعتماد المالي', wallet_management: 'إدارة المحفظة', geography_analytics: 'تحليلات جغرافية',
      ai_settings: 'إعدادات الذكاء الاصطناعي', refresh_control: 'التحكم بالتحديث', content_management: 'إدارة المحتوى',
      ticketing_system: 'نظام التذاكر', remote_desktop: 'سطح المكتب البعيد', server_config: 'إعدادات الخادم',
      company_information: 'معلومات الشركة', user_guide: 'دليل المستخدم', marketing_module: 'وحدة التسويق',
      aws_s3_settings: 'إعدادات AWS S3', whatsapp_crm: 'CRM واتساب'
    }
  },
  tr: {
    authChecking: 'Kimlik doğrulama denetleniyor...',
    restrictedAccess: 'Kısıtlı erişim', loginRequired: 'Kullanıcı yönetimine erişmek için giriş yapmalısınız.',
    adminLogin: 'Yönetici olarak giriş yap', pageTitle: 'Kullanıcı ve Rol Yönetimi',
    pageDescription: 'Kullanıcıları, rolleri ve izinleri yönetin', syncedWithSiteManagement: '✓ Site Yönetimi ile senkronize',
    modulesCount: '{count} modül', sendSms: 'SMS gönder ({count})', users: 'Kullanıcılar ({count})',
    roles: 'Roller ({count})', modules: 'Modüller ({count})', userList: 'Kullanıcı Listesi',
    addNewUser: 'Yeni Kullanıcı Ekle', editUser: 'Kullanıcıyı Düzenle', fullName: 'Ad Soyad',
    firstAndLastName: 'Ad ve soyad', emailPlaceholder: 'user@example.com', phonePlaceholder: '+1234567890',
    email: 'E-posta', smsLabel: 'SMS', emailLabel: 'E-posta', phoneNumber: 'Telefon numarası', password: 'Şifre',
    selectRole: 'Bir rol seçin', smsNotifications: 'SMS bildirimleri', receiveSms: 'SMS mesajlarını al',
    emailNotifications: 'E-posta bildirimleri', receiveEmails: 'E-posta al', cancel: 'İptal', update: 'Güncelle',
    create: 'Oluştur', loading: 'Yükleniyor...', noUsers: 'Kullanıcı bulunamadı', user: 'Kullanıcı', role: 'Rol',
    contact: 'İletişim', notifications: 'Bildirimler', status: 'Durum', actions: 'İşlemler', active: 'Aktif',
    inactive: 'Pasif', deleteUserConfirm: 'Bu kullanıcıyı silmek istediğinizden emin misiniz?',
    roleManagement: 'Rol Yönetimi', addNewRole: 'Yeni Rol Ekle', editRole: 'Rolü Düzenle',
    systemRoleName: 'Sistem rol adı', systemRoleNamePlaceholder: 'manager_role', displayRoleName: 'Görünen rol adı', roleDescription: 'Rol açıklaması',
    roleDescriptionPlaceholder: 'Rolü ve sorumluluklarını açıklayın...', roleColor: 'Rol rengi', rolePriority: 'Rol önceliği',
    moduleAssignment: 'Modül Atama', assigned: '{count} atandı', availableModules: 'Kullanılabilir Modüller',
    assignedModules: 'Atanan Modüller', allModulesAssigned: 'Tüm modüller atandı', noModulesAssigned: 'Modül atanmadı',
    clickToAssign: 'Atamak için Kullanılabilir listesinden modüllere tıklayın', assignCoreOnly: 'Yalnızca Temel Modülleri Ata',
    assignAll: 'Tümünü Ata', clearAll: 'Tümünü Temizle', noRoles: 'Tanımlı rol yok', userCount: 'Kullanıcılar:',
    permissions: 'İzinler:', deleteRoleConfirm: 'Bu rolü silmek istediğinizden emin misiniz?',
    systemModulesAccess: 'Sistem Modülleri ve Erişim', modulesDescription: 'Kullanıcıların farklı sistem modüllerine erişimini yönetin',
    syncModules: 'Modülleri Senkronize Et', siteManagementModules: 'Site Yönetimi Modülleri',
    assignableModules: 'Kullanıcı ataması için kullanılabilir toplam modül', totalModules: 'Toplam modül',
    assignmentViaRoles: 'Erişim, Rol Yönetimi üzerinden atanabilir', howToAssign: 'İzinler nasıl atanır?',
    assignmentInstructions: 'Bu modülleri kullanıcılara atamak için “Roller” bölümüne gidip belirli izinlere sahip bir rol oluşturun veya düzenleyin. Ardından her kullanıcıya, bu {count} modüle erişimini belirleyen bir rol atayabilirsiniz.',
    bulkSms: 'Toplu SMS', recipients: 'Alıcılar ({count} kullanıcı)', smsText: 'SMS metni',
    smsPlaceholder: 'SMS metninizi girin...', sendSmsAction: 'SMS gönder', changePassword: 'Şifre Değiştir',
    newPassword: 'Yeni şifre', enterNewPassword: 'Yeni şifreyi girin', changePasswordAction: 'Şifreyi Değiştir',
    error: 'Hata', failedChangePassword: 'Şifre değiştirilemedi', newRoleCreated: 'Yeni rol başarıyla oluşturuldu',
    roleUpdated: 'Rol başarıyla güncellendi', roleDeleted: 'Rol başarıyla silindi', newUserCreated: 'Yeni kullanıcı başarıyla oluşturuldu',
    userUpdated: 'Kullanıcı başarıyla güncellendi', userDeleted: 'Kullanıcı başarıyla silindi', passwordChanged: 'Şifre başarıyla değiştirildi',
    smsSent: 'SMS başarıyla gönderildi', syncSuccessful: 'Senkronizasyon başarılı', modulesSynchronized: 'Modüller Site Yönetimi ile senkronize edildi',
    syncError: 'Senkronizasyon hatası', syncProblem: 'Modül senkronizasyonu sırasında sorun oluştu',
    roleNameMin: 'Rol adı en az 2 karakter olmalıdır', displayNameMin: 'Görünen ad en az 2 karakter olmalıdır',
    fullNameMin: 'Ad soyad en az 2 karakter olmalıdır', validEmail: 'Lütfen geçerli bir e-posta girin',
    phoneMin: 'Telefon numarası en az 10 hane olmalıdır', passwordMin: 'Şifre en az 6 karakter olmalıdır',
    roleRequired: 'Lütfen bir rol seçin', showPassword: 'Şifreyi göster', hidePassword: 'Şifreyi gizle',
    edit: 'Düzenle', changePasswordLabel: 'Şifreyi değiştir', delete: 'Sil', selectAllUsers: 'Tüm kullanıcıları seç', selectUser: 'Kullanıcıyı seç', accessAssignmentTitle: 'İzin atama', moduleWord: 'Modül',
    moduleLabels: {
      kpi_dashboard: 'KPI Panosu', management_dashboard: 'Yönetim Panosu', syncing_shop: 'Mağaza Senkronizasyonu',
      shop_management: 'Mağaza Yönetimi', product_management: 'Ürün Yönetimi', order_management: 'Sipariş Yönetimi',
      warehouse_management: 'Depo Yönetimi', logistics_management: 'Lojistik Yönetimi', delivery_confirmation: 'Kurye / Taşıyıcı Teslimat Onayı', inquiries: 'Sorgular', crm: 'CRM',
      barcode: 'Barkod Yönetimi', email_settings: 'E-posta Ayarları', database_backup: 'Veritabanı Yedekleme',
      seo: 'SEO Yönetimi', categories: 'Kategoriler', sms: 'SMS Yönetimi', factory: 'Fabrika Yönetimi',
      user_management: 'Kullanıcı Yönetimi', procedures: 'Prosedürler', payment_management: 'Ödeme Yönetimi',
      accounting_management: 'Muhasebe Yönetimi', finance: 'Mali onay', wallet_management: 'Cüzdan Yönetimi',
      geography_analytics: 'Coğrafi Analiz', ai_settings: 'Yapay Zekâ Ayarları', refresh_control: 'Yenileme Kontrolü',
      content_management: 'İçerik Yönetimi', ticketing_system: 'Bilet Sistemi', remote_desktop: 'Uzak Masaüstü',
      server_config: 'Sunucu Yapılandırması', company_information: 'Şirket Bilgileri', user_guide: 'Kullanıcı Rehberi',
      marketing_module: 'Pazarlama Modülü', aws_s3_settings: 'AWS S3 Ayarları', whatsapp_crm: 'WhatsApp CRM'
    }
  }
};

const formatTranslation = (value: string, values: Record<string, string | number> = {}) =>
  Object.entries(values).reduce((result, [key, replacement]) => result.replace(`{${key}}`, String(replacement)), value);

// Schema definitions
const createRoleSchema = (t: TranslationDictionary) => z.object({
  name: z.string().min(2, t.roleNameMin),
  displayName: z.string().min(2, t.displayNameMin),
  description: z.string().optional(),
  color: z.string().default('#3b82f6'),
  priority: z.number().default(1)
});

const createUserSchema = (t: TranslationDictionary) => z.object({
  fullName: z.string().min(2, t.fullNameMin),
  email: z.string().email(t.validEmail),
  phone: z.string().min(10, t.phoneMin),
  password: z.string().min(6, t.passwordMin),
  roleId: z.string().min(1, t.roleRequired),
  isActive: z.boolean().default(true),
  smsNotifications: z.boolean().default(true),
  emailNotifications: z.boolean().default(true)
});

type Role = {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  color: string;
  priority: number;
  permissions: string[];
  permissionCount?: number;
  userCount?: number;
  isActive: boolean;
  createdAt: string;
};

const systemRoleDescriptions: Partial<Record<Language, Record<string, string>>> = {
  en: {
    'sales manager': 'Manage sales operations and customer relationships',
    'warehouse supervisor': 'Manage warehouse operations and product inventory',
    'customer support': 'Respond to customers and handle support requests',
    'content editor': 'Manage website content and SEO',
  },
  ar: {
    'sales manager': 'إدارة عمليات المبيعات وعلاقات العملاء',
    'warehouse supervisor': 'إدارة عمليات المستودع ومخزون المنتجات',
    'customer support': 'الرد على العملاء ومعالجة طلبات الدعم',
    'content editor': 'إدارة محتوى الموقع وتحسين محركات البحث',
  },
  tr: {
    'sales manager': 'Satış operasyonlarını ve müşteri ilişkilerini yönetir',
    'warehouse supervisor': 'Depo operasyonlarını ve ürün stoklarını yönetir',
    'customer support': 'Müşterilere yanıt verir ve destek taleplerini yönetir',
    'content editor': 'Web sitesi içeriğini ve SEO çalışmalarını yönetir',
  },
};

const getVisibleRoleDescription = (role: Role, language: Language): string => {
  const description = role.description?.trim() || '';
  if (language === 'fa' || !/[\u0600-\u06FF]/.test(description)) {
    return description;
  }

  const localizedDescriptions = systemRoleDescriptions[language];
  return localizedDescriptions?.[role.name.trim().toLowerCase()]
    || localizedDescriptions?.[role.displayName.trim().toLowerCase()]
    || '';
};

type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  roleColor: string;
  isActive: boolean;
  smsNotifications: boolean;
  emailNotifications: boolean;
  lastLogin?: string;
  createdAt: string;
};

type Module = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  isCore: boolean;
  icon?: any;
  color?: string;
  moduleId?: string;
};

// Function to extract modules dynamically from Site Management configuration
const extractSiteManagementModules = (
  financialApprovalLabel: string,
  moduleLabels: Record<string, string>,
  moduleWord: string
): Module[] => {
  // Complete synchronized list with ALL 35 modules from Site Management - using original English names
  const siteManagementModules = [
    { moduleId: 'kpi_dashboard', label: 'KPI Dashboard', icon: BarChart3, color: 'bg-purple-600' },
    { moduleId: 'management_dashboard', label: 'Management Dashboard', icon: LayoutDashboard, color: 'bg-indigo-600' },
    { moduleId: 'syncing_shop', label: 'Syncing Shop', icon: Database, color: 'bg-blue-500' },
    { moduleId: 'shop_management', label: 'Shop Management', icon: ShoppingCart, color: 'bg-purple-500' },
    { moduleId: 'product_management', label: 'Product Management', icon: Package, color: 'bg-violet-500' },
    { moduleId: 'order_management', label: 'Order Management', icon: Truck, color: 'bg-orange-500' },
    { moduleId: 'warehouse_management', label: 'Warehouse Management', icon: Warehouse, color: 'bg-emerald-500' },
    { moduleId: 'logistics_management', label: 'Logistics Management', icon: Truck, color: 'bg-indigo-500' },
    { moduleId: 'delivery_confirmation', label: 'Courier / Carrier Delivery Confirmation', icon: CheckCircle, color: 'bg-teal-500' },
    { moduleId: 'inquiries', label: 'Inquiries', icon: BarChart3, color: 'bg-amber-500' },
    { moduleId: 'crm', label: 'CRM', icon: Users, color: 'bg-pink-500' },
    { moduleId: 'barcode', label: 'Barcode Management', icon: QrCode, color: 'bg-rose-500' },
    { moduleId: 'email_settings', label: 'Email Settings', icon: Mail, color: 'bg-cyan-500' },
    { moduleId: 'database_backup', label: 'Database Backup', icon: HardDrive, color: 'bg-stone-500' },
    { moduleId: 'seo', label: 'SEO Management', icon: Globe, color: 'bg-emerald-500' },
    { moduleId: 'categories', label: 'Categories', icon: Package, color: 'bg-violet-500' },
    { moduleId: 'sms', label: 'SMS Management', icon: Smartphone, color: 'bg-gray-500' },
    { moduleId: 'factory', label: 'Factory Management', icon: Factory, color: 'bg-neutral-500' },
    { moduleId: 'user_management', label: 'User Management', icon: UserCog, color: 'bg-slate-500' },
    { moduleId: 'procedures', label: 'Procedures', icon: BookOpen, color: 'bg-zinc-500' },
    { moduleId: 'payment_management', label: 'Payment Management', icon: CreditCard, color: 'bg-green-600' },
    { moduleId: 'accounting_management', label: 'Accounting Management', icon: DollarSign, color: 'bg-blue-600' },
    { moduleId: 'finance', label: financialApprovalLabel, icon: DollarSign, color: 'bg-emerald-600' },
    { moduleId: 'wallet_management', label: 'Wallet Management', icon: Wallet, color: 'bg-yellow-500' },
    { moduleId: 'geography_analytics', label: 'Geography Analytics', icon: MapPin, color: 'bg-teal-500' },
    { moduleId: 'ai_settings', label: 'AI Settings', icon: Zap, color: 'bg-sky-500' },
    { moduleId: 'refresh_control', label: 'Refresh Control', icon: RefreshCw, color: 'bg-green-500' },
    { moduleId: 'content_management', label: 'Content Management', icon: Edit3, color: 'bg-lime-500' },
    { moduleId: 'ticketing_system', label: 'Ticketing System', icon: Ticket, color: 'bg-rose-500' },
    { moduleId: 'remote_desktop', label: 'Remote Desktop', icon: Monitor, color: 'bg-slate-600' },
    { moduleId: 'server_config', label: 'Server Config', icon: Server, color: 'bg-gray-600' },
    { moduleId: 'company_information', label: 'Company Information', icon: FileText, color: 'bg-cyan-600' },
    { moduleId: 'user_guide', label: 'User Guide', icon: BookOpen, color: 'bg-amber-600' },
    { moduleId: 'marketing_module', label: 'Marketing Module', icon: Send, color: 'bg-pink-600' },
    { moduleId: 'aws_s3_settings', label: 'AWS S3 Settings', icon: HardDrive, color: 'bg-orange-600' },
    { moduleId: 'whatsapp_crm', label: 'WhatsApp CRM', icon: MessageSquare, color: 'bg-green-600' }
  ];

  return siteManagementModules.map(module => ({
    id: module.moduleId.replace('_', '-'),
    name: module.moduleId,
    displayName: module.moduleId === 'finance' ? financialApprovalLabel : (moduleLabels[module.moduleId] || module.label),
    description: `${moduleLabels[module.moduleId] || module.label} ${moduleWord}`,
    category: 'system',
    isCore: ['syncing_shop', 'shop_management', 'product_management', 'order_management', 'warehouse_management', 'crm', 'user_management', 'finance', 'accounting_management'].includes(module.moduleId),
    icon: module.icon,
    color: module.color
  }));
};

// This will be populated dynamically from the API
let availableModules: Module[] = [];

function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const direction = language === 'fa' || language === 'ar' ? 'rtl' : 'ltr';
  const financialApprovalLabel = financialApprovalLabels[language];
  
  // Dialog states
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  
  // Editing states
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  
  // Permission selection
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  
  // Forms
  const roleSchema = React.useMemo(() => createRoleSchema(t), [t]);
  const userSchema = React.useMemo(() => createUserSchema(t), [t]);
  const roleForm = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
      color: '#3b82f6',
      priority: 1
    }
  });

  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      roleId: '',
      isActive: true,
      smsNotifications: true,
      emailNotifications: true
    }
  });

  // Data fetching
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/admin/custom-roles'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/custom-roles', undefined);
      return response.data || [];
    },
    staleTime: 0 // Force fresh data to see permission count fix
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/custom-users'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/custom-users', undefined);
      return response.data || [];
    }
  });

  // Get refresh interval from global settings for CRM modules
  const getCrmRefreshInterval = () => {
    const globalSettings = localStorage.getItem('global-refresh-settings');
    if (globalSettings) {
      const settings = JSON.parse(globalSettings);
      const crmSettings = settings.departments.crm;
      
      if (crmSettings?.autoRefresh) {
        const refreshInterval = settings.syncEnabled 
          ? settings.globalInterval 
          : crmSettings.interval;
        return refreshInterval * 1000; // Convert seconds to milliseconds
      }
    }
    return 300000; // Default 5 minutes if no settings found
  };

  // Fetch modules directly from the synchronized API endpoint
  const { data: modulesData, isLoading: modulesLoading } = useQuery({
    queryKey: ['/api/custom-modules'],
    queryFn: async () => {
      const response = await apiRequest('/api/custom-modules', undefined);
      return response;
    },
    staleTime: 0, // Always fetch fresh data to stay synchronized
    refetchInterval: getCrmRefreshInterval()
  });

  // Also fetch Site Management modules for comparison
  const { data: siteManagementModules = [], isLoading: siteModulesLoading } = useQuery({
    queryKey: ['/api/site-management/modules'],
    queryFn: async () => {
      const response = await apiRequest('/api/site-management/modules', undefined);
      return response.modules || [];
    },
    staleTime: 0,
    refetchInterval: getCrmRefreshInterval()
  });

  // Build availableModules from the synchronized API
  const availableModules = React.useMemo(() => {
    if (!modulesData?.modules) return [];
    
    return modulesData.modules.map((module: any) => {
      const staticModule = extractSiteManagementModules(
         financialApprovalLabel,
         t.moduleLabels,
         t.moduleWord
      ).find(m => m.name === module.id);
      return {
        id: module.id,
        name: module.id,
        displayName: staticModule?.displayName || t.moduleLabels[module.id] || module.id,
        description: staticModule?.description || `${t.moduleLabels[module.id] || module.id} ${t.moduleWord}`,
        category: module.category,
        isCore: true,
        icon: staticModule?.icon || Package,
        color: staticModule?.color || 'bg-gray-500',
        moduleId: module.id
      };
    });
  }, [modulesData, financialApprovalLabel, t]);


  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/admin/custom-roles', {
        method: 'POST',
        body: { ...data, permissions: selectedPermissions }
      });
    },
    onSuccess: () => {
      toast({ title: t.newRoleCreated });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-roles'] });
      setRoleDialogOpen(false);
      roleForm.reset();
      setSelectedPermissions([]);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, data }: { roleId: string; data: any }) => {
      return apiRequest(`/api/admin/custom-roles/${roleId}`, {
        method: 'PATCH',
        body: { ...data, permissions: selectedPermissions }
      });
    },
    onSuccess: () => {
      toast({ title: t.roleUpdated });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-roles'] });
      setRoleDialogOpen(false);
      setEditingRole(null);
      roleForm.reset();
      setSelectedPermissions([]);
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      return apiRequest(`/api/admin/custom-roles/${roleId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({ title: t.roleDeleted });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-roles'] });
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/admin/custom-users', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      toast({ title: t.newUserCreated });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-users'] });
      setUserDialogOpen(false);
      userForm.reset();
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      return apiRequest(`/api/admin/custom-users/${userId}`, {
        method: 'PATCH',
        body: data
      });
    },
    onSuccess: () => {
      toast({ title: t.userUpdated });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-users'] });
      setUserDialogOpen(false);
      setEditingUser(null);
      userForm.reset();
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/admin/custom-users/${userId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({ title: t.userDeleted });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-users'] });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      return apiRequest(`/api/admin/users/${userId}/password`, {
        method: 'PUT',
        body: { newPassword }
      });
    },
    onSuccess: () => {
      toast({ title: t.passwordChanged });
      setPasswordDialogOpen(false);
      setPasswordUserId(null);
      setNewPassword('');
    },
    onError: (error: any) => {
      toast({ 
        title: t.error,
        description: error.message || t.failedChangePassword,
        variant: 'destructive' 
      });
    }
  });

  const sendSmsMutation = useMutation({
    mutationFn: async ({ userIds, message }: { userIds: string[]; message: string }) => {
      return apiRequest('/api/admin/send-sms', {
        method: 'POST',
        body: { userIds, message }
      });
    },
    onSuccess: () => {
      toast({ title: t.smsSent });
      setSmsDialogOpen(false);
      setSelectedUsers([]);
    }
  });


  // Sync modules mutation
  const syncModulesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/user-management/sync-modules', { method: 'POST' });
    },
    onSuccess: () => {
      toast({ 
        title: t.syncSuccessful,
        description: t.modulesSynchronized
      });
      // Refresh data if needed
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-roles'] });
      // Force refresh of the modules display based on global settings
      const getCrmRefreshInterval = () => {
        const globalSettings = localStorage.getItem('global-refresh-settings');
        if (globalSettings) {
          const settings = JSON.parse(globalSettings);
          const crmSettings = settings.departments.crm;
          
          if (crmSettings?.autoRefresh) {
            const refreshInterval = settings.syncEnabled 
              ? settings.globalInterval 
              : crmSettings.interval;
            return refreshInterval * 1000; // Convert seconds to milliseconds
          }
        }
        return 300000; // Default 5 minutes if no settings found
      };

      const delayMs = Math.min(getCrmRefreshInterval() / 10, 2000); // Maximum 2 seconds delay
      setTimeout(() => {
        window.location.reload();
      }, delayMs);
    },
    onError: () => {
      toast({ 
        title: t.syncError,
        description: t.syncProblem
      });
    }
  });

  // Helper functions
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      sales: 'bg-green-100 text-green-800',
      customer: 'bg-blue-100 text-blue-800',
      operations: 'bg-yellow-100 text-yellow-800',
      finance: 'bg-purple-100 text-purple-800',
      analytics: 'bg-indigo-100 text-indigo-800',
      content: 'bg-pink-100 text-pink-800',
      marketing: 'bg-orange-100 text-orange-800',
      communication: 'bg-cyan-100 text-cyan-800',
      system: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getModulesByCategory = () => {
    return availableModules.reduce((acc: Record<string, Module[]>, module: Module) => {
      if (!acc[module.category]) acc[module.category] = [];
      acc[module.category].push(module);
      return acc;
    }, {} as Record<string, Module[]>);
  };

  // Authentication check
  if (authLoading) {
    return (
      <div className="container mx-auto p-6 text-center" dir={direction}>
        <div className="py-12">
          <div className="text-lg">{t.authChecking}</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6" dir={direction}>
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <Lock className="h-6 w-6" />
              {t.restrictedAccess}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {t.loginRequired}
            </p>
            <Button 
              onClick={() => window.location.href = '/admin/login'} 
              className="w-full"
            >
              {t.adminLogin}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir={direction}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.pageTitle}</h1>
          <p className="text-muted-foreground">
            {t.pageDescription}
            {siteManagementModules.length > 0 && (
              <span className="text-green-600 mr-2">
                {t.syncedWithSiteManagement} ({formatTranslation(t.modulesCount, { count: siteManagementModules.length })})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setSmsDialogOpen(true)} disabled={selectedUsers.length === 0}>
            <MessageSquare className="h-4 w-4 mr-2" />
            {formatTranslation(t.sendSms, { count: selectedUsers.length })}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {formatTranslation(t.users, { count: users.length })}
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {formatTranslation(t.roles, { count: roles.length })}
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            {formatTranslation(t.modules, { count: availableModules.length })}
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t.userList}
                </CardTitle>
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t.addNewUser}
                    </Button>
                  </DialogTrigger>
                   <DialogContent className="sm:max-w-lg" dir={direction}>
                    <DialogHeader>
                      <DialogTitle>
                        {editingUser ? t.editUser : t.addNewUser}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...userForm}>
                      <form onSubmit={userForm.handleSubmit((data) => {
                        console.log('Form submitted with data:', data);
                        console.log('Form errors:', userForm.formState.errors);
                        if (editingUser) {
                          updateUserMutation.mutate({ userId: editingUser.id, data });
                        } else {
                          createUserMutation.mutate(data);
                        }
                      })} className="space-y-4">
                        <FormField
                          control={userForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.fullName}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t.firstAndLastName} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={userForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t.email}</FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" placeholder={t.emailPlaceholder} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={userForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t.phoneNumber}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t.phonePlaceholder} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={userForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.password}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder={t.password}
                                    className="pl-10" 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? t.hidePassword : t.showPassword}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={userForm.control}
                          name="roleId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.role}</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  console.log('Role selected:', value);
                                  field.onChange(value);
                                }} 
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t.selectRole} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded-full" 
                                          style={{ backgroundColor: role.color }}
                                        />
                                        {role.displayName}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={userForm.control}
                            name="smsNotifications"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">{t.smsNotifications}</FormLabel>
                                  <div className="text-sm text-muted-foreground">
                                    {t.receiveSms}
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={userForm.control}
                            name="emailNotifications"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">{t.emailNotifications}</FormLabel>
                                  <div className="text-sm text-muted-foreground">
                                    {t.receiveEmails}
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => {
                            setUserDialogOpen(false);
                            setEditingUser(null);
                            userForm.reset();
                          }}>
                            {t.cancel}
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createUserMutation.isPending || updateUserMutation.isPending}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {editingUser ? t.update : t.create}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">{t.loading}</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t.noUsers}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Checkbox
                          aria-label={t.selectAllUsers}
                          checked={selectedUsers.length === users.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(users.map(u => u.id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                        />
                      </TableHead>
                       <TableHead>{t.user}</TableHead>
                       <TableHead>{t.role}</TableHead>
                       <TableHead>{t.contact}</TableHead>
                       <TableHead>{t.notifications}</TableHead>
                       <TableHead>{t.status}</TableHead>
                       <TableHead>{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            aria-label={t.selectUser}
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers(prev => [...prev, user.id]);
                              } else {
                                setSelectedUsers(prev => prev.filter(id => id !== user.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.fullName}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            style={{ backgroundColor: user.roleColor, color: 'white' }}
                            className="font-medium"
                          >
                            {user.roleDisplayName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.smsNotifications && (
                              <Badge variant="outline" className="text-xs">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                 {t.smsLabel}
                              </Badge>
                            )}
                            {user.emailNotifications && (
                              <Badge variant="outline" className="text-xs">
                                <Mail className="h-3 w-3 mr-1" />
                                 {t.emailLabel}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                             {user.isActive ? t.active : t.inactive}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={t.edit}
                              title={t.edit}
                              onClick={() => {
                                setEditingUser(user);
                                userForm.setValue('fullName', user.fullName);
                                userForm.setValue('email', user.email);
                                userForm.setValue('phone', user.phone);
                                userForm.setValue('roleId', user.roleId);
                                userForm.setValue('smsNotifications', user.smsNotifications);
                                userForm.setValue('emailNotifications', user.emailNotifications);
                                setUserDialogOpen(true);
                              }}
                            >
                                 <Edit className="h-4 w-4" aria-label={t.edit} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={t.changePasswordLabel}
                              title={t.changePasswordLabel}
                              onClick={() => {
                                setPasswordUserId(user.id);
                                setPasswordDialogOpen(true);
                              }}
                            >
                               <Key className="h-4 w-4" aria-label={t.changePasswordLabel} />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              aria-label={t.delete}
                              title={t.delete}
                              onClick={() => {
                                 if (confirm(t.deleteUserConfirm)) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                            >
                               <Trash2 className="h-4 w-4" aria-label={t.delete} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t.roleManagement}
                </CardTitle>
                <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t.addNewRole}
                    </Button>
                  </DialogTrigger>
                   <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir={direction}>
                    <DialogHeader>
                      <DialogTitle>
                        {editingRole ? t.editRole : t.addNewRole}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...roleForm}>
                      <form onSubmit={roleForm.handleSubmit((data) => {
                        if (editingRole) {
                          updateRoleMutation.mutate({
                            roleId: editingRole.id,
                            data: { ...data, permissions: selectedPermissions }
                          });
                        } else {
                          createRoleMutation.mutate({ ...data, permissions: selectedPermissions });
                        }
                      })} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={roleForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                               <FormLabel>{t.systemRoleName}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t.systemRoleNamePlaceholder} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={roleForm.control}
                            name="displayName"
                            render={({ field }) => (
                              <FormItem>
                               <FormLabel>{t.displayRoleName}</FormLabel>
                                <FormControl>
                                 <Input {...field} placeholder={t.displayRoleName} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={roleForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.roleDescription}</FormLabel>
                              <FormControl>
                                 <Textarea {...field} placeholder={t.roleDescriptionPlaceholder} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={roleForm.control}
                            name="color"
                            render={({ field }) => (
                              <FormItem>
                                 <FormLabel>{t.roleColor}</FormLabel>
                                <FormControl>
                                  <Input {...field} type="color" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={roleForm.control}
                            name="priority"
                            render={({ field }) => (
                              <FormItem>
                                 <FormLabel>{t.rolePriority}</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="1" max="10" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {/* Drag and Drop Module Assignment Interface */}
                        <div className="space-y-4">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <Key className="h-4 w-4" />
                             {t.moduleAssignment}
                            <Badge variant="outline" className="text-xs">
                               {formatTranslation(t.assigned, { count: selectedPermissions.length })}
                            </Badge>
                          </label>
                          
                          <div className="grid grid-cols-2 gap-6 min-h-[400px]">
                            {/* Available Modules Section */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <Package className="h-4 w-4 text-blue-600" />
                                 <h3 className="font-medium text-blue-800">{t.availableModules}</h3>
                                <Badge variant="secondary" className="ml-auto">
                                  {availableModules.filter((m: Module) => !selectedPermissions.includes(m.name)).length}
                                </Badge>
                              </div>
                              
                              <div className="max-h-80 overflow-y-auto p-3 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                                <div className="space-y-2">
                                  {availableModules
                                    .filter((module: Module) => !selectedPermissions.includes(module.name))
                                    .map((module: Module) => {
                                      const IconComponent = module.icon || Settings;
                                      return (
                                        <div 
                                          key={`available-${module.id}`}
                                          className="flex items-center gap-3 p-2 bg-white rounded border hover:border-blue-300 transition-colors cursor-pointer group"
                                          onClick={() => {
                                            setSelectedPermissions(prev => [...prev, module.name]);
                                          }}
                                        >
                                          <div className={`p-1.5 rounded ${module.color || 'bg-gray-500'} text-white`}>
                                            <IconComponent className="h-3 w-3" />
                                          </div>
                                          <div className="flex-1">
                                            <div className="text-sm font-medium">{module.displayName}</div>
                                            <div className="text-xs text-gray-500">{module.id}</div>
                                          </div>
                                          <Plus className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                      );
                                    })}
                                </div>
                                {availableModules.filter((m: Module) => !selectedPermissions.includes(m.name)).length === 0 && (
                                  <div className="text-center text-gray-500 py-8">
                                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                     <p className="text-sm">{t.allModulesAssigned}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Assigned Modules Section */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                 <h3 className="font-medium text-green-800">{t.assignedModules}</h3>
                                <Badge variant="secondary" className="ml-auto">
                                  {selectedPermissions.length}
                                </Badge>
                              </div>
                              
                              <div className="max-h-80 overflow-y-auto p-3 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                                <div className="space-y-2">
                                  {selectedPermissions.map((permissionName) => {
                                    const module = availableModules.find((m: Module) => m.name === permissionName);
                                    if (!module) return null;
                                    
                                    const IconComponent = module.icon || Settings;
                                    return (
                                      <div 
                                        key={`assigned-${module.id}`}
                                        className="flex items-center gap-3 p-2 bg-white rounded border hover:border-red-300 transition-colors cursor-pointer group"
                                        onClick={() => {
                                          setSelectedPermissions(prev => prev.filter(p => p !== module.name));
                                        }}
                                      >
                                        <div className={`p-1.5 rounded ${module.color || 'bg-gray-500'} text-white`}>
                                          <IconComponent className="h-3 w-3" />
                                        </div>
                                        <div className="flex-1">
                                          <div className="text-sm font-medium">{module.displayName}</div>
                                          <div className="text-xs text-gray-500">{module.id}</div>
                                        </div>
                                        {module.isCore && (
                                          <Crown className="h-3 w-3 text-yellow-500" />
                                        )}
                                        <X className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                                      </div>
                                    );
                                  })}
                                </div>
                                {selectedPermissions.length === 0 && (
                                  <div className="text-center text-gray-500 py-8">
                                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                     <p className="text-sm">{t.noModulesAssigned}</p>
                                     <p className="text-xs mt-1">{t.clickToAssign}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Quick Actions */}
                          <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const coreModules = availableModules.filter((m: Module) => m.isCore).map((m: Module) => m.name);
                                  setSelectedPermissions(coreModules);
                                }}
                                className="text-xs"
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                 {t.assignCoreOnly}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPermissions(availableModules.map((m: Module) => m.name));
                                }}
                                className="text-xs"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                 {t.assignAll}
                              </Button>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPermissions([])}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              <X className="h-3 w-3 mr-1" />
                               {t.clearAll}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => {
                            setRoleDialogOpen(false);
                            setEditingRole(null);
                            setSelectedPermissions([]);
                            roleForm.reset();
                          }}>
                             {t.cancel}
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {editingRole ? t.update : t.create}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="text-center py-8">{t.loading}</div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                   {t.noRoles}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map((role) => {
                    const visibleDescription = getVisibleRoleDescription(role, language);

                    return (
                    <Card key={role.id} className="border-2" style={{ borderColor: role.color }}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: role.color }}
                            />
                            <CardTitle className="text-lg">{role.displayName}</CardTitle>
                          </div>
                          <Badge variant="outline">#{role.priority}</Badge>
                        </div>
                        {visibleDescription && (
                          <p className="text-sm text-muted-foreground">{visibleDescription}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                           <span className="text-sm">{t.userCount}</span>
                          <Badge>{role.userCount || 0}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-sm">{t.permissions}</span>
                          <Badge variant="outline">{role.permissionCount || role.permissions?.length || 0}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-sm">{t.status}:</span>
                          <Badge variant={role.isActive ? "default" : "secondary"}>
                             {role.isActive ? t.active : t.inactive}
                          </Badge>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={t.edit}
                            title={t.edit}
                            onClick={() => {
                              setEditingRole(role);
                              setSelectedPermissions(role.permissions);
                              roleForm.setValue('name', role.name);
                              roleForm.setValue('displayName', role.displayName);
                              roleForm.setValue('description', role.description || '');
                              roleForm.setValue('color', role.color);
                              roleForm.setValue('priority', role.priority);
                              setRoleDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            aria-label={t.delete}
                            title={t.delete}
                            onClick={() => {
                                 if (confirm(t.deleteRoleConfirm)) {
                                deleteRoleMutation.mutate(role.id);
                              }
                            }}
                          >
                             <Trash2 className="h-4 w-4" aria-label={t.delete} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                     {t.systemModulesAccess}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                     {t.modulesDescription}
                  </p>
                </div>
                <Button
                  onClick={() => syncModulesMutation.mutate()}
                  disabled={syncModulesMutation.isPending}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <RefreshCw className={`h-4 w-4 ${syncModulesMutation.isPending ? 'animate-spin' : ''}`} />
                   {t.syncModules}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Display total count of modules */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800">{t.siteManagementModules}</h3>
                    <p className="text-blue-600 text-sm">{t.assignableModules}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-800">{availableModules.length}</div>
                    <div className="text-sm text-blue-600">{t.totalModules}</div>
                  </div>
                </div>
              </div>

              {/* Display all modules in a simple grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {availableModules.map((module: Module) => {
                  const IconComponent = module.icon || Settings;
                  return (
                    <div key={module.id} className="flex items-center space-x-3 p-3 bg-white rounded border hover:shadow-sm transition-all">
                      <span className="text-lg">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{module.displayName}</div>
                        <div className="text-xs text-gray-500">{module.id}</div>
                      </div>
                      <Checkbox 
                        disabled
                        className="opacity-50"
                         title={t.assignmentViaRoles}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Note about permission assignment */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="text-yellow-600">💡</div>
                  <div>
                     <h4 className="font-medium text-yellow-800">{t.howToAssign}</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                       {formatTranslation(t.assignmentInstructions, { count: availableModules.length })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* SMS Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent className="sm:max-w-md" dir={direction}>
          <DialogHeader>
            <DialogTitle>{t.bulkSms}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{formatTranslation(t.recipients, { count: selectedUsers.length })}</label>
              <div className="mt-2 space-y-1">
                {selectedUsers.map(userId => {
                  const user = users.find(u => u.id === userId);
                  return user ? (
                    <div key={userId} className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3" />
                      {user.fullName} - {user.phone}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
            
            <div>
              <label htmlFor="sms-message" className="text-sm font-medium">{t.smsText}</label>
              <Textarea
                id="sms-message"
                placeholder={t.smsPlaceholder}
                className="mt-2"
                rows={4}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSmsDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button 
                onClick={() => {
                  const message = (document.getElementById('sms-message') as HTMLTextAreaElement)?.value;
                  if (message && selectedUsers.length > 0) {
                    sendSmsMutation.mutate({ userIds: selectedUsers, message });
                  }
                }}
                disabled={sendSmsMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {t.sendSmsAction}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md" dir={direction}>
          <DialogHeader>
            <DialogTitle>{t.changePassword}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-password" className="text-sm font-medium">{t.newPassword}</label>
              <Input
                id="new-password"
                type="password"
                placeholder={t.enterNewPassword}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-2"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setPasswordDialogOpen(false);
                setNewPassword('');
                setPasswordUserId(null);
              }}>
                {t.cancel}
              </Button>
              <Button 
                onClick={() => {
                  if (newPassword && passwordUserId) {
                    changePasswordMutation.mutate({ userId: passwordUserId, newPassword });
                  }
                }}
                disabled={changePasswordMutation.isPending || !newPassword}
              >
                <Key className="h-4 w-4 mr-2" />
                {t.changePasswordAction}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UserManagement;