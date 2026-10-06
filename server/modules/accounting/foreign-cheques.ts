import {sql} from "drizzle-orm";
import type {AccountingTransaction} from "./db";
import type {AccountingAccess} from "@shared/accounting-api";
import {postJournalEntry,type JournalInput} from "./postJournalEntry";
import {lockedWallet,reconciled,account,nativeMoney} from "./wallet";
import {decimal} from "./money";

type Evidence={sourceId:string;entryDate:string;evidenceReference:string;reason:string};
type ProvenLine=NonNullable<JournalInput["lines"]>[number];

// Called only after the receipt manager, cutover, retry and lifecycle checks.
// All money and account choices are derived by the database, not this caller.
export async function transitionForeignCheque(tx:AccountingTransaction,receiptId:number,
  action:"deposited"|"cleared"|"bounced"|"returned",input:Evidence,actor:AccountingAccess) {
  await tx.execute(sql`set constraints accounting_cheque_book_used,accounting_foreign_cheque_status,
    accounting_foreign_cheque_event,accounting_receipt_return_complete,accounting_foreign_ar_parity deferred`);
  const proof=(await tx.execute(sql`insert into accounting_cheque_book_values(receipt_id,action,entry_date,input)
    values(${receiptId},${action},${input.entryDate},${JSON.stringify(input)}::jsonb) returning *`)).rows[0];
  const company=Number(proof.company_id);
  const receipt=(await tx.execute(sql`select * from accounting_customer_receipts where id=${receiptId}`)).rows[0];
  const journalLines=(proof.lines as ProvenLine[]).map(({accountId,currency,debit,credit,partyType,partyId})=>
    ({accountId,currency,debit,credit,partyType,partyId}));
  const {entry}=await postJournalEntry({companyId:company,entryDate:input.entryDate,
    sourceType:action==="returned"?"ReceiptReturned":action==="deposited"?"ChequeDeposited":action==="cleared"?"ChequeCleared":"ChequeBounced",
    sourceId:String(proof.source_id),description:input.reason,lines:journalLines},actor,tx);
  await tx.execute(sql`update accounting_customer_receipts set status=${action} where id=${receiptId}`);
  const recover=String(proof.recovered_native),newDebt=String(proof.new_debt_native);
  if(action==="bounced"||action==="returned"){
    const allocations=(await tx.execute(sql`select * from accounting_receipt_allocations
      where receipt_id=${receiptId} order by receivable_id`)).rows;
    for(const a of allocations){
      await tx.execute(sql`update accounting_receivable_items set settled_amount=settled_amount-${a.amount}::numeric
        where id=${a.receivable_id} and (not ${action==="bounced"} or not accounting_receivable_has_partial_return(id))`);
      await tx.execute(sql`update accounting_receipt_allocations set status='bounced' where id=${a.id}`);
    }
    if(decimal(recover).gt(0)){
      const w=await lockedWallet(tx,Number(receipt.wallet_id),company);
      nativeMoney(w.balance);nativeMoney(recover);
      const after=nativeMoney(decimal(w.balance).minus(recover).toFixed());
      await tx.execute(sql`insert into wallet_transactions(wallet_id,customer_id,transaction_type,amount,currency,
        balance_before,balance_after,description,reference_type,reference_id,status,processed_by,metadata)
        values(${w.id},${w.customer_id},'debit',${recover},${w.currency},${w.balance},${after},${input.reason},
          'accounting_journal',${entry.id},'completed',${actor.actorId},
          ${JSON.stringify({receiptId,verification:"staff_attestation",evidenceReference:input.evidenceReference,chargeback:true})}::json)`);
      await tx.execute(sql`update customer_wallets set balance=${after},last_activity_date=now(),updated_at=now() where id=${w.id}`);
      await reconciled(tx,{...w,balance:after},company,await account(tx,company,"WALLET_LIABILITY"));
    }
    if(decimal(newDebt).gt(0))await tx.execute(sql`insert into accounting_receivable_items(company_id,customer_id,currency,
      invoice_journal_id,invoice_reference,issued_on,due_on,amount) values(${company},${receipt.customer_id},${receipt.currency},
      ${entry.id},${`${action==="returned"?"Receipt":"Cheque"} return ${receiptId}`},${input.entryDate},${input.entryDate},${newDebt})`);
  }
  await tx.execute(sql`insert into accounting_receipt_events(receipt_id,action,source_id,input,journal_id)
    values(${receiptId},${action},${input.sourceId},${JSON.stringify(input)}::jsonb,${entry.id})`);
  const bookValues={baseCurrency:String(proof.base_currency),assetBaseTransferred:String(proof.asset_base),
    walletBaseRecovered:String(proof.wallet_base),receivableBaseRestored:String(proof.restored_ar_base),
    newReceivableBase:String(proof.new_debt_base),lines:proof.lines};
  await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
    values(${company},${actor.actorId},${actor.actorType},${action==="returned"?"receipt_returned":`cheque_${action}`},'customer_receipt',${String(receiptId)},
      ${JSON.stringify({...input,journalId:entry.id,recoveredWalletAmount:recover,newReceivable:newDebt,bookValues})}::jsonb)`);
  await tx.execute(sql`set constraints accounting_cheque_book_used,accounting_foreign_cheque_status,
    accounting_foreign_cheque_event,accounting_receipt_return_complete,accounting_foreign_ar_parity immediate`);
  return {receiptId,status:action,journalId:entry.id,recoveredWalletAmount:recover,newReceivable:newDebt,bookValues,duplicate:false};
}