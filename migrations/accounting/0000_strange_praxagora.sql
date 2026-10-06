CREATE TABLE "accounting_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"type" text NOT NULL,
	"parent_id" integer,
	"is_posting" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "accounting_account_type" CHECK ("accounting_accounts"."type" in ('asset','liability','equity','revenue','expense'))
);
--> statement-breakpoint
CREATE TABLE "accounting_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"actor_id" integer NOT NULL,
	"actor_type" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country_code" text NOT NULL,
	"timezone" text NOT NULL,
	"base_currency" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_cost_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_currencies" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"decimals" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "accounting_currency_decimals" CHECK ("accounting_currencies"."decimals" between 0 and 8)
);
--> statement-breakpoint
CREATE TABLE "accounting_exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"currency" text NOT NULL,
	"effective_on" date NOT NULL,
	"rate" numeric(38, 12) NOT NULL,
	"source" text DEFAULT 'central_bank' NOT NULL,
	"reference" text NOT NULL,
	CONSTRAINT "accounting_exchange_rate_positive" CHECK ("accounting_exchange_rates"."rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "accounting_fiscal_years" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	CONSTRAINT "accounting_fiscal_year_dates" CHECK ("accounting_fiscal_years"."starts_on" <= "accounting_fiscal_years"."ends_on"),
	CONSTRAINT "accounting_fiscal_year_status" CHECK ("accounting_fiscal_years"."status" in ('open','closed'))
);
--> statement-breakpoint
CREATE TABLE "accounting_journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"fiscal_year_id" integer NOT NULL,
	"entry_date" date NOT NULL,
	"description" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"source_hash" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"reversal_of_id" integer,
	"created_by" integer NOT NULL,
	"actor_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounting_journal_status" CHECK ("accounting_journal_entries"."status" in ('draft','posted'))
);
--> statement-breakpoint
CREATE TABLE "accounting_journal_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"currency" text NOT NULL,
	"exchange_rate" numeric(38, 12) NOT NULL,
	"debit" numeric(38, 8) DEFAULT '0' NOT NULL,
	"credit" numeric(38, 8) DEFAULT '0' NOT NULL,
	"base_debit" numeric(38, 8) DEFAULT '0' NOT NULL,
	"base_credit" numeric(38, 8) DEFAULT '0' NOT NULL,
	"party_type" text,
	"party_id" integer,
	"cost_center_id" integer,
	"description" text DEFAULT '' NOT NULL,
	CONSTRAINT "accounting_line_amounts" CHECK (("accounting_journal_lines"."debit" > 0 and "accounting_journal_lines"."credit" = 0 and "accounting_journal_lines"."base_debit" > 0 and "accounting_journal_lines"."base_credit" = 0)
    or ("accounting_journal_lines"."credit" > 0 and "accounting_journal_lines"."debit" = 0 and "accounting_journal_lines"."base_credit" > 0 and "accounting_journal_lines"."base_debit" = 0)),
	CONSTRAINT "accounting_line_rate" CHECK ("accounting_journal_lines"."exchange_rate" > 0),
	CONSTRAINT "accounting_line_party" CHECK (("accounting_journal_lines"."party_type" is null and "accounting_journal_lines"."party_id" is null) or ("accounting_journal_lines"."party_type" in ('customer','carrier') and "accounting_journal_lines"."party_id" > 0))
);
--> statement-breakpoint
CREATE TABLE "accounting_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"source_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "accounting_posting_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"key" text NOT NULL,
	"account_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"weight_tolerance_percent" numeric(12, 8) DEFAULT '0' NOT NULL,
	"fleet_rate" numeric(38, 8) DEFAULT '0' NOT NULL,
	"fleet_rate_basis" text DEFAULT 'per_ton' NOT NULL,
	"fleet_cost_center_id" integer,
	CONSTRAINT "accounting_settings_company_id_unique" UNIQUE("company_id"),
	CONSTRAINT "accounting_settings_tolerance" CHECK ("accounting_settings"."weight_tolerance_percent" between 0 and 100),
	CONSTRAINT "accounting_settings_fleet_rate" CHECK ("accounting_settings"."fleet_rate" >= 0),
	CONSTRAINT "accounting_settings_fleet_basis" CHECK ("accounting_settings"."fleet_rate_basis" in ('per_ton','per_km'))
);
--> statement-breakpoint
CREATE TABLE "accounting_tax_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"country_code" text NOT NULL,
	"product_group" text NOT NULL,
	"rate_percent" numeric(12, 8) NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "accounting_tax_percent" CHECK ("accounting_tax_rules"."rate_percent" between 0 and 100),
	CONSTRAINT "accounting_tax_dates" CHECK ("accounting_tax_rules"."valid_to" is null or "accounting_tax_rules"."valid_to" >= "accounting_tax_rules"."valid_from")
);
--> statement-breakpoint
ALTER TABLE "accounting_accounts" ADD CONSTRAINT "accounting_accounts_company_id_accounting_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."accounting_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_accounts" ADD CONSTRAINT "accounting_accounts_parent_id_accounting_accounts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."accounting_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_audit_logs" ADD CONSTRAINT "accounting_audit_logs_company_id_accounting_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."accounting_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_companies" ADD CONSTRAINT "accounting_companies_base_currency_accounting_currencies_code_fk" FOREIGN KEY ("base_currency") REFERENCES "public"."accounting_currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_cost_centers" ADD CONSTRAINT "accounting_cost_centers_company_id_accounting_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."accounting_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_exchange_rates" ADD CONSTRAINT "accounting_exchange_rates_company_id_accounting_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."accounting_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_exchange_rates" ADD CONSTRAINT "accounting_exchange_rates_currency_accounting_currencies_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."accounting_currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_fiscal_years" ADD CONSTRAINT "accounting_fiscal_years_company_id_accounting_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."accounting_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_journal_entries" ADD CONSTRAINT "accounting_journal_entries_company_id_accounting_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."accounting_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_journal_entries" ADD CONSTRAINT "accounting_journal_entries_fiscal_year_id_accounting_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."accounting_fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_journal_entries" ADD CONSTRAINT "accounting_journal_entries_reversal_of_id_accounting_journal_entries_id_fk" FOREIGN KEY ("reversal_of_id") REFERENCES "public"."accounting_journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_journal_lines" ADD CONSTRAINT "accounting_journal_lines_entry_id_accounting_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."accounting_journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_journal_lines" ADD CONSTRAINT "accounting_journal_lines_account_id_accounting_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounting_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_journal_lines" ADD CONSTRAINT "accounting_journal_lines_currency_accounting_currencies_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."accounting_currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_journal_lines" ADD CONSTRAINT "accounting_journal_lines_cost_center_id_accounting_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."accounting_cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_outbox" ADD CONSTRAINT "accounting_outbox_company_id_accounting_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."accounting_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_posting_rules" ADD CONSTRAINT "accounting_posting_rules_company_id_accounting_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."accounting_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_posting_rules" ADD CONSTRAINT "accounting_posting_rules_account_id_accounting_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounting_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_company_id_accounting_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."accounting_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_fleet_cost_center_id_accounting_cost_centers_id_fk" FOREIGN KEY ("fleet_cost_center_id") REFERENCES "public"."accounting_cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_tax_rules" ADD CONSTRAINT "accounting_tax_rules_company_id_accounting_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."accounting_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_accounts_company_code" ON "accounting_accounts" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_cost_centers_company_code" ON "accounting_cost_centers" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_exchange_rate_date" ON "accounting_exchange_rates" USING btree ("company_id","currency","effective_on");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_fiscal_year_company_name" ON "accounting_fiscal_years" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_journal_idempotency" ON "accounting_journal_entries" USING btree ("company_id","source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_journal_one_reversal" ON "accounting_journal_entries" USING btree ("reversal_of_id");--> statement-breakpoint
CREATE INDEX "accounting_journal_company_date" ON "accounting_journal_entries" USING btree ("company_id","entry_date");--> statement-breakpoint
CREATE INDEX "accounting_lines_entry" ON "accounting_journal_lines" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "accounting_lines_account" ON "accounting_journal_lines" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_outbox_event_identity" ON "accounting_outbox" USING btree ("company_id","event_type","source_id");--> statement-breakpoint
CREATE INDEX "accounting_outbox_pending" ON "accounting_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_posting_rule_company_key" ON "accounting_posting_rules" USING btree ("company_id","key");