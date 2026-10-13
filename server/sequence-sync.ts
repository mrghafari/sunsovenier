import { db } from "./db";
import { sql } from "drizzle-orm";

interface SequenceInfo {
  tableName: string;
  sequenceName: string;
  idColumn: string;
}

const CRITICAL_SEQUENCES: SequenceInfo[] = [
  { tableName: 'customer_orders', sequenceName: 'customer_orders_id_seq', idColumn: 'id' },
  { tableName: 'customer_addresses', sequenceName: 'customer_addresses_id_seq', idColumn: 'id' },
  { tableName: 'vehicle_selection_history', sequenceName: 'vehicle_selection_history_id_seq', idColumn: 'id' },
  { tableName: 'order_management', sequenceName: 'order_management_id_seq', idColumn: 'id' },
  { tableName: 'customer_activities', sequenceName: 'customer_activities_id_seq', idColumn: 'id' },
  { tableName: 'financial_transactions', sequenceName: 'financial_transactions_id_seq', idColumn: 'id' },
  { tableName: 'wallet_transactions', sequenceName: 'wallet_transactions_id_seq', idColumn: 'id' },
  { tableName: 'customer_wallets', sequenceName: 'customer_wallets_id_seq', idColumn: 'id' },
  { tableName: 'fib_payments', sequenceName: 'fib_payments_id_seq', idColumn: 'id' },
  { tableName: 'order_items', sequenceName: 'order_items_id_seq', idColumn: 'id' },
  { tableName: 'contacts', sequenceName: 'contacts_id_seq', idColumn: 'id' },
];

export async function syncSequence(tableName: string, sequenceName: string, idColumn: string = 'id'): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT setval(
        ${sequenceName}::regclass, 
        COALESCE((SELECT MAX(${sql.identifier(idColumn)}) FROM ${sql.identifier(tableName)}), 0) + 1,
        false
      ) as new_val
    `);
    
    const newVal = (result.rows[0] as any)?.new_val;
    console.log(`✅ [SEQUENCE SYNC] ${sequenceName} synced to ${newVal}`);
    return newVal;
  } catch (error) {
    console.error(`❌ [SEQUENCE SYNC] Failed to sync ${sequenceName}:`, error);
    throw error;
  }
}

export async function syncAllSequences(): Promise<void> {
  console.log('🔄 [SEQUENCE SYNC] Starting sequence synchronization for all critical tables...');
  
  for (const seq of CRITICAL_SEQUENCES) {
    try {
      await syncSequence(seq.tableName, seq.sequenceName, seq.idColumn);
    } catch (error) {
      console.error(`⚠️ [SEQUENCE SYNC] Warning: Failed to sync ${seq.sequenceName}, table may not exist`);
    }
  }
  
  console.log('✅ [SEQUENCE SYNC] All sequences synchronized successfully');
}

export async function ensureSequenceSafe(tableName: string, sequenceName: string): Promise<void> {
  await syncSequence(tableName, sequenceName, 'id');
}

export const sequenceSyncService = {
  syncSequence,
  syncAllSequences,
  ensureSequenceSafe,
  CRITICAL_SEQUENCES,
};
