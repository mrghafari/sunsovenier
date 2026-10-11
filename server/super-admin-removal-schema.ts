import { pool } from "./db";
import type { CleanupClient } from "./super-admin-cleanup-policy";

/** Administrative withdrawal, not evidence destruction. Install before routes serve. */
export async function ensureRemovalSchema(client: CleanupClient = pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS super_admin_removals (
      kind text NOT NULL CHECK (kind IN ('orders','contract')),
      target_id integer NOT NULL,
      source_number text NOT NULL,
      actor_namespace text NOT NULL CHECK (actor_namespace IN ('admin','custom')),
      actor_id text NOT NULL,
      removed_at timestamptz NOT NULL DEFAULT now(),
      details jsonb NOT NULL,
      PRIMARY KEY (kind,target_id)
    );
    CREATE OR REPLACE FUNCTION super_admin_removed_source_guard() RETURNS trigger
    LANGUAGE plpgsql AS $guard$
    DECLARE source_id integer;
    BEGIN
      IF TG_TABLE_NAME='customer_orders' THEN
        IF TG_OP='INSERT' THEN
          IF NEW.contract_id IS NOT NULL AND EXISTS(SELECT 1 FROM super_admin_removals WHERE kind='contract' AND target_id=NEW.contract_id) THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Contract has been administratively removed.';
          END IF;
          RETURN NEW;
        END IF;
        IF EXISTS(SELECT 1 FROM super_admin_removals WHERE kind='orders' AND target_id=OLD.id) THEN
          IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Removed order financial evidence must be retained.'; END IF;
          IF NEW.status IS DISTINCT FROM 'deleted' OR
            (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN
            RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Removed order cannot be paid, shipped or reactivated.';
          END IF;
        END IF;
      ELSIF TG_TABLE_NAME='order_management' THEN
        IF EXISTS(SELECT 1 FROM super_admin_removals WHERE kind='orders' AND target_id=NEW.customer_order_id) THEN
          IF TG_OP='INSERT' OR NEW IS DISTINCT FROM OLD THEN
            RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Removed order cannot re-enter workflow.';
          END IF;
        END IF;
      ELSIF TG_TABLE_NAME='shop_contracts' THEN
        IF EXISTS(SELECT 1 FROM super_admin_removals WHERE kind='contract' AND target_id=OLD.id) THEN
          IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Removed contract and signed evidence must be retained.'; END IF;
          IF NEW.is_active OR NEW IS DISTINCT FROM OLD THEN
            RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Removed contract cannot be changed or reactivated.';
          END IF;
        END IF;
      ELSIF TG_TABLE_NAME='shop_contract_holds' THEN
        PERFORM id FROM shop_contracts WHERE id=NEW.contract_id FOR KEY SHARE;
        IF EXISTS(SELECT 1 FROM super_admin_removals WHERE kind='contract' AND target_id=NEW.contract_id)
          AND NEW.status<>'released' THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Removed contract cannot reserve new capacity.';
        END IF;
      ELSE
        source_id:=NULLIF(to_jsonb(NEW)->>TG_ARGV[0],'')::integer;
        IF TG_TABLE_NAME='wallet_transactions' AND COALESCE(to_jsonb(NEW)->>'reference_type','') NOT IN
          ('order','customer_order','payment_completion','cancellation_refund','refund','order_refund','order_return','overpayment') THEN RETURN NEW; END IF;
        IF TG_TABLE_NAME='wallet_transactions' AND source_id IS NULL THEN
          SELECT o.id INTO source_id FROM customer_orders o
          WHERE o.customer_id=(to_jsonb(NEW)->>'customer_id')::integer AND
            o.order_number=COALESCE(to_jsonb(NEW)->'metadata'->>'orderNumber',
              (regexp_match(COALESCE(to_jsonb(NEW)->>'description','')||' '||COALESCE(to_jsonb(NEW)->>'notes',''),
                '(?<![A-Za-z0-9])M[0-9]{7}(?![A-Za-z0-9])'))[1]);
        END IF;
        IF source_id IS NOT NULL THEN
          PERFORM id FROM customer_orders WHERE id=source_id FOR KEY SHARE;
          IF EXISTS(SELECT 1 FROM super_admin_removals WHERE kind='orders' AND target_id=source_id) THEN
            RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Removed order does not accept late payment or dispatch evidence.';
          END IF;
        END IF;
      END IF;
      RETURN NEW;
    END $guard$;
    DROP TRIGGER IF EXISTS super_admin_removed_source ON customer_orders;
    CREATE TRIGGER super_admin_removed_source BEFORE INSERT OR UPDATE OR DELETE ON customer_orders
      FOR EACH ROW EXECUTE FUNCTION super_admin_removed_source_guard();
    DROP TRIGGER IF EXISTS super_admin_removed_source ON order_management;
    CREATE TRIGGER super_admin_removed_source BEFORE INSERT OR UPDATE ON order_management
      FOR EACH ROW EXECUTE FUNCTION super_admin_removed_source_guard();
    DROP TRIGGER IF EXISTS super_admin_removed_source ON shop_contracts;
    CREATE TRIGGER super_admin_removed_source BEFORE UPDATE OR DELETE ON shop_contracts
      FOR EACH ROW EXECUTE FUNCTION super_admin_removed_source_guard();
    DROP TRIGGER IF EXISTS super_admin_removed_source ON shop_contract_holds;
    CREATE TRIGGER super_admin_removed_source BEFORE INSERT OR UPDATE ON shop_contract_holds
      FOR EACH ROW EXECUTE FUNCTION super_admin_removed_source_guard();
  `);
  const columns = (await client.query(`SELECT table_name,column_name FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name IN
    ('wallet_transactions','payment_receipts','fib_payments','vehicle_delivery_history','logistics_orders','gps_delivery_confirmations',
      'accounting_receivable_items','accounting_operational_facts')`)).rows;
  for (const table of [...new Set<string>(columns.map((row: any) => row.table_name))]) {
    const available = new Set(columns.filter((row: any) => row.table_name === table).map((row: any) => row.column_name));
    const column = table === "wallet_transactions" ? "reference_id"
      : available.has("customer_order_id") ? "customer_order_id" : "order_id";
    if (!available.has(column)) continue;
    await client.query(`DROP TRIGGER IF EXISTS super_admin_removed_source ON "${table}";
      CREATE TRIGGER super_admin_removed_source BEFORE INSERT OR UPDATE ON "${table}"
      FOR EACH ROW EXECUTE FUNCTION super_admin_removed_source_guard('${column}')`);
  }
  // Keep the native GL-parity guard intact; permit only this new evidenced
  // customer-credit source, validated by an additional deferred proof trigger.
  const existing = (await client.query(`SELECT p.oid AS fn FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname=current_schema() AND p.proname='accounting_wallet_native_guard' AND p.pronargs=0`)).rows[0]?.fn;
  if (existing) {
    await client.query(`CREATE TABLE IF NOT EXISTS super_admin_credit_books(
      company_id integer NOT NULL,order_id integer NOT NULL,
      valuation jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(company_id,order_id))`);
    await client.query(`CREATE TABLE IF NOT EXISTS super_admin_invoice_reversal_books(
      company_id integer NOT NULL,receivable_id integer NOT NULL,invoice_journal_id integer NOT NULL,
      order_id integer NOT NULL,native_paid numeric NOT NULL CHECK(native_paid>=0),
      PRIMARY KEY(company_id,receivable_id));
      CREATE OR REPLACE FUNCTION super_admin_authorized_invoice_reversal(cid integer,stype text,sid text,original integer)
      RETURNS boolean LANGUAGE sql STABLE AS $authorize$
        SELECT EXISTS(SELECT 1 FROM super_admin_invoice_reversal_books b
          JOIN accounting_receivable_items r ON r.id=b.receivable_id AND r.company_id=b.company_id
            AND r.order_id=b.order_id AND r.invoice_journal_id=b.invoice_journal_id
          JOIN accounting_journal_entries e ON e.id=b.invoice_journal_id AND e.company_id=b.company_id
          WHERE cid=b.company_id AND stype='OrderCancellationReversal' AND sid='cleanup-invoice:'||b.receivable_id::text
            AND original=b.invoice_journal_id AND e.status='posted' AND e.source_type IN('SalesInvoice','LoadingCompleted'))
      $authorize$;
      CREATE OR REPLACE FUNCTION super_admin_invoice_reversal_completion() RETURNS trigger LANGUAGE plpgsql AS $complete$
      DECLARE b super_admin_invoice_reversal_books; p jsonb; posted accounting_journal_entries;
      BEGIN
        SELECT * INTO posted FROM accounting_journal_entries WHERE id=NEW.id;
        SELECT * INTO b FROM super_admin_invoice_reversal_books
          WHERE company_id=posted.company_id AND invoice_journal_id=posted.reversal_of_id;
        SELECT details INTO p FROM super_admin_removals WHERE kind='orders' AND target_id=b.order_id;
        IF posted.status<>'posted' OR b.order_id IS NULL OR p IS NULL
          OR (p->>'creditAmount')::numeric<b.native_paid
          OR NOT EXISTS(SELECT 1 FROM customer_orders WHERE id=b.order_id AND status='deleted')
          OR ((p->>'creditAmount')::numeric>0 AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries
            WHERE id=(p->>'creditJournalId')::integer AND company_id=b.company_id
              AND status='posted' AND source_type='OrderCancellationCredit'
              AND source_id='cleanup-order:'||b.order_id::text)) THEN
          RAISE EXCEPTION 'Invoice withdrawal requires its completed, evidenced customer-credit operation.';
        END IF;
        RETURN NEW;
      END $complete$;
      DROP TRIGGER IF EXISTS super_admin_invoice_reversal_completion ON accounting_journal_entries;
      CREATE CONSTRAINT TRIGGER super_admin_invoice_reversal_completion AFTER INSERT ON accounting_journal_entries
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN(NEW.source_type='OrderCancellationReversal')
        EXECUTE FUNCTION super_admin_invoice_reversal_completion();
    `);
    for (const name of ["accounting_assert_receipt_book_journal","accounting_assert_wallet_book_journal"]) {
      const original = (await client.query(`SELECT pg_get_functiondef(p.oid) AS body FROM pg_proc p
        JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=current_schema() AND p.proname=$1
          AND p.pronargs=0`,[name])).rows[0]?.body;
      if (!original || String(original).includes("super_admin_authorized_invoice_reversal")) continue;
      const changed = String(original).replace(/IF NEW\.reversal_of_id IS NOT NULL AND/i,
        `IF NEW.reversal_of_id IS NOT NULL AND NOT super_admin_authorized_invoice_reversal(
          NEW.company_id,NEW.source_type,NEW.source_id,NEW.reversal_of_id) AND`);
      if (changed !== original) await client.query(changed);
    }
    const chequeUsed = (await client.query(`SELECT pg_get_functiondef(p.oid) AS body FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=current_schema()
        AND p.proname='accounting_cheque_book_used' AND p.pronargs=0`)).rows[0]?.body;
    if (chequeUsed && !String(chequeUsed).includes("super_admin_invoice_reversal_books")) {
      // Closed invoices cannot be valued as collectible debt. Keep every
      // receipt/cheque proof check, excluding only our fully completed withdrawal.
      const changed = String(chequeUsed).replace(/FROM\s+accounting_receipt_allocations\s+a\s+WHERE\s+a\.receipt_id\s*=\s*rid/ig,
        `FROM accounting_receipt_allocations a WHERE a.receipt_id=rid AND NOT EXISTS(
          SELECT 1 FROM super_admin_invoice_reversal_books b JOIN super_admin_removals m
            ON m.kind='orders' AND m.target_id=b.order_id
          WHERE b.receivable_id=a.receivable_id AND b.company_id=r.company_id)`);
      if (changed === chequeUsed) throw new Error("Receipt carrying-proof validation needs reconciliation before order withdrawal.");
      await client.query(changed);
    }
    const definition = String((await client.query("SELECT pg_get_functiondef($1::oid) AS body",[existing])).rows[0].body);
    if (!definition.includes("'OrderCancellationCredit'")) {
      const changed = definition.replace(/e\.source_type\s+IN\s*\(\s*'WalletTopUp'([^)]*)\)/i,
        "e.source_type IN ('WalletTopUp'$1,'OrderCancellationCredit')");
      if (changed === definition) throw new Error("Financial wallet guard needs its current receipt migrations before administrative removal.");
      await client.query(changed);
    }
    const historical = (await client.query(`SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname=current_schema() AND p.proname='accounting_wallet_historical_line' AND p.pronargs=15`)).rows[0]?.prosrc;
    if (historical && !String(historical).includes("super_admin_credit_books")) {
      // Add a tightly matched proof branch without replacing any existing FX,
      // receipt, cheque, return or settlement valuation branch.
      await client.query(`CREATE OR REPLACE FUNCTION accounting_wallet_historical_line(
        cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
        bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text)
        RETURNS boolean LANGUAGE sql STABLE AS $removal_book$
        SELECT COALESCE((${String(historical).trim().replace(/;$/, "")}),false) OR EXISTS(
          SELECT 1 FROM super_admin_credit_books b CROSS JOIN LATERAL jsonb_array_elements(b.valuation->'lines') x
          WHERE stype='OrderCancellationCredit' AND basis='historical_carrying'
            AND cid=b.company_id AND sid='cleanup-order:'||b.order_id::text
            AND dated=(b.valuation->>'entryDate')::date AND ptype='customer' AND cc IS NULL
            AND aid=(x->>'accountId')::integer AND cur=x->>'currency' AND pid=(x->>'partyId')::integer
            AND dr=(x->>'debit')::numeric AND cr=(x->>'credit')::numeric
            AND bdr=(x->>'baseDebit')::numeric AND bcr=(x->>'baseCredit')::numeric AND fx=(x->>'exchangeRate')::numeric
        ) $removal_book$`);
    }
    await client.query(`
      CREATE OR REPLACE FUNCTION super_admin_removed_receivable_guard() RETURNS trigger LANGUAGE plpgsql AS $receivable$
      DECLARE source_id integer;
      BEGIN
        SELECT order_id INTO source_id FROM accounting_receivable_items WHERE id=NEW.receivable_id;
        IF source_id IS NULL THEN RETURN NEW; END IF;
        PERFORM id FROM customer_orders WHERE id=source_id FOR KEY SHARE;
        IF EXISTS(SELECT 1 FROM super_admin_removals WHERE kind='orders' AND target_id=source_id) THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Removed order cannot receive late collection or settlement.';
        END IF;
        RETURN NEW;
      END $receivable$;
      DROP TRIGGER IF EXISTS super_admin_removed_receivable ON accounting_receipt_allocations;
      CREATE TRIGGER super_admin_removed_receivable BEFORE INSERT OR UPDATE ON accounting_receipt_allocations
        FOR EACH ROW EXECUTE FUNCTION super_admin_removed_receivable_guard();
      DROP TRIGGER IF EXISTS super_admin_removed_receivable ON accounting_wallet_settlements;
      CREATE TRIGGER super_admin_removed_receivable BEFORE INSERT OR UPDATE ON accounting_wallet_settlements
        FOR EACH ROW EXECUTE FUNCTION super_admin_removed_receivable_guard();
      CREATE OR REPLACE FUNCTION super_admin_cancellation_credit_proof() RETURNS trigger LANGUAGE plpgsql AS $proof$
      DECLARE e accounting_journal_entries; o customer_orders; p jsonb;
      BEGIN
        IF NEW.reference_type IS DISTINCT FROM 'accounting_journal' THEN RETURN NEW; END IF;
        SELECT * INTO e FROM accounting_journal_entries WHERE id=NEW.reference_id;
        IF e.source_type IS DISTINCT FROM 'OrderCancellationCredit' THEN RETURN NEW; END IF;
        SELECT details INTO p FROM super_admin_removals
          WHERE kind='orders' AND target_id=substring(e.source_id FROM '^cleanup-order:([0-9]+)$')::integer;
        SELECT * INTO o FROM customer_orders WHERE id=(p->>'orderId')::integer;
        IF p IS NULL OR o.id IS NULL OR o.status<>'deleted' OR o.customer_id<>NEW.customer_id
          OR o.currency<>NEW.currency OR NEW.transaction_type<>'credit'
          OR (p->>'creditAmount')::numeric<>NEW.amount OR (p->>'creditJournalId')::integer<>e.id
          THEN RAISE EXCEPTION 'Administrative customer credit requires retained removal evidence.'; END IF;
        RETURN NEW;
      END $proof$;
      DROP TRIGGER IF EXISTS super_admin_cancellation_credit_proof ON wallet_transactions;
      CREATE CONSTRAINT TRIGGER super_admin_cancellation_credit_proof AFTER INSERT ON wallet_transactions
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION super_admin_cancellation_credit_proof();
    `);
  }
}
