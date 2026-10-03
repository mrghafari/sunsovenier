-- Reference data/localized labels only; no activation, conversion or financial backfill.
ALTER TABLE accounting_accounts ADD COLUMN name_fa text NOT NULL DEFAULT '';
ALTER TABLE accounting_cost_centers ADD COLUMN name_fa text NOT NULL DEFAULT '';
ALTER TABLE accounting_accounts ADD CONSTRAINT accounting_account_localized_name
  CHECK (length(trim(name_fa))>0 OR length(trim(name_ar))>0 OR length(trim(name_en))>0);
ALTER TABLE accounting_cost_centers ADD CONSTRAINT accounting_center_localized_name
  CHECK (length(trim(name_fa))>0 OR length(trim(name_ar))>0 OR length(trim(name_en))>0);

INSERT INTO accounting_currencies(code,name,decimals,is_active)
  VALUES('IRR','Iranian rial',0,true) ON CONFLICT(code) DO NOTHING;

-- Translate only exact, unchanged template rows; never rename staff-authored accounts.
UPDATE accounting_accounts a SET name_fa=v.fa
FROM (VALUES
  ('1100','البنك','Bank','بانک'),
  ('1130','مستحقات بوابة الدفع','Payment gateway clearing','حساب واسط درگاه پرداخت'),
  ('1110','الصندوق','Cash','صندوق'),
  ('1115','شيكات مستلمة','Cheques on hand','چک‌های دریافت‌شده'),
  ('1120','شيكات قيد التحصيل','Cheques in clearing','چک‌های در جریان وصول'),
  ('1200','الذمم المدينة','Accounts receivable','حساب‌های دریافتنی'),
  ('1300','مخزون المنتجات النهائية','Finished goods inventory','موجودی محصولات آماده'),
  ('1310','مخزون المواد الخام','Raw materials','مواد اولیه'),
  ('1320','الإنتاج تحت التشغيل','Work in progress','تولید در جریان'),
  ('1500','الأصول الثابتة','Fixed assets','دارایی‌های ثابت'),
  ('2100','أرصدة العملاء المدفوعة مقدماً','Customer wallet liability','پیش‌دریافت و مانده حساب مشتریان'),
  ('2110','الضرائب المستحقة','Tax payable','مالیات پرداختنی'),
  ('2200','مستحقات الناقلين','Carrier payable','حساب‌های پرداختنی حمل‌کنندگان'),
  ('2210','الذمم الدائنة','Accounts payable','حساب‌های پرداختنی'),
  ('3100','رأس المال','Share capital','سرمایه'),
  ('3200','الأرباح المحتجزة','Retained earnings','سود انباشته'),
  ('3900','مقابل الأرصدة الافتتاحية','Opening balance equity','طرف مقابل مانده افتتاحیه'),
  ('4100','إيرادات المبيعات','Sales revenue','درآمد فروش'),
  ('4200','إيرادات الشحن','Shipping revenue','درآمد حمل'),
  ('4300','أرباح فروق العملة','Foreign exchange gain','سود تسعیر ارز'),
  ('5100','تكلفة البضاعة المباعة','Cost of goods sold','بهای تمام‌شده کالای فروش‌رفته'),
  ('5200','مصروف الشحن','Shipping expense','هزینه حمل'),
  ('5210','تكلفة الأسطول المحملة','Fleet cost absorbed','هزینه جذب‌شده ناوگان'),
  ('5300','رسوم البنك','Bank fees','کارمزد بانکی'),
  ('5400','خسائر فروق العملة','Foreign exchange loss','زیان تسعیر ارز'),
  ('5500','وقود الأسطول','Fleet fuel','سوخت ناوگان'),
  ('5510','أجور السائقين','Driver wages','دستمزد رانندگان'),
  ('5520','استهلاك الأسطول','Fleet depreciation','استهلاک ناوگان')
) AS v(code,ar,en,fa)
WHERE a.code=v.code AND a.name_ar=v.ar AND a.name_en=v.en AND a.name_fa='';
UPDATE accounting_cost_centers SET name_fa='ناوگان'
  WHERE code='FLEET' AND name_ar='الأسطول' AND name_en='Fleet' AND name_fa='';