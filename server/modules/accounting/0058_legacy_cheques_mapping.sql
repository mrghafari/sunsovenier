-- Add the omitted template setting to older Iraqi charts only.
-- No balances, journals, approval identities, fiscal periods or cutovers change.
INSERT INTO accounting_accounts(company_id,code,name_fa,name_ar,name_en,type)
SELECT c.id,'1115','چک‌های دریافت‌شده','شيكات مستلمة','Cheques on hand','asset'
FROM accounting_companies c
WHERE c.country_code='IQ'
  AND NOT EXISTS(SELECT 1 FROM accounting_posting_rules p
    WHERE p.company_id=c.id AND p.key='CHEQUES_ON_HAND')
ON CONFLICT(company_id,code) DO NOTHING;

-- Never overwrite a staff-assigned mapping or reinterpret a custom account.
WITH added AS (
  INSERT INTO accounting_posting_rules(company_id,key,account_id)
  SELECT c.id,'CHEQUES_ON_HAND',a.id
  FROM accounting_companies c JOIN accounting_accounts a ON a.company_id=c.id
  WHERE c.country_code='IQ' AND a.code='1115' AND a.type='asset'
    AND a.is_active AND a.is_posting AND a.name_en='Cheques on hand'
  ON CONFLICT(company_id,key) DO NOTHING
  RETURNING company_id,key,account_id
)
INSERT INTO accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,"after")
SELECT company_id,0,'system','legacy_template_mapping_completed','posting_rule',account_id::text,
  jsonb_build_object('key',key,'accountId',account_id,
    'source','0058_legacy_cheques_mapping','financialActivation',false)
FROM added;
