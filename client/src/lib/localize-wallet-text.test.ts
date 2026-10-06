import assert from 'node:assert/strict';
import test from 'node:test';
import { localizeFinanceNote, localizeWalletText, localizeWalletTransactionDescription } from './localize-wallet-text';

test('localized wallet debit preserves the amount and unrelated staff notes', () => {
  const note = 'بررسی مالی - مبلغ ۹ دینار از کیف پول کسر شد';
  assert.equal(localizeWalletText(note, 'en'), 'بررسی مالی - ۹ IQD was deducted from the wallet');
  assert.equal(localizeWalletText(note, 'ar'), 'بررسی مالی - تم خصم ۹ دينار عراقي من المحفظة');
  assert.equal(localizeWalletText(note, 'tr'), 'بررسی مالی - Cüzdandan ۹ IQD düşüldü');
  assert.equal(localizeWalletText(note, 'fa'), note);
  assert.equal(localizeWalletText('متن دستی: مبلغ 9 دینار کم است', 'en'), 'متن دستی: مبلغ 9 دینار کم است');
});

test('wallet credit and payment completion descriptions follow site language', () => {
  assert.equal(localizeWalletText('مبلغ اضافی 1,000 دینار به کیف پول اضافه شد', 'en'), '1,000 IQD was added to the wallet');
  assert.equal(localizeWalletTransactionDescription('تکمیل پرداخت سفارش M2601296 - کسر از کیف پول', 'en'), 'Order M2601296 payment completed using wallet');
  assert.equal(localizeWalletTransactionDescription('تکمیل پرداخت سفارش M2601296 - کسر از کیف پول', 'tr'), 'M2601296 numaralı siparişin ödemesi cüzdandan tamamlandı');
  assert.equal(localizeWalletTransactionDescription('اضافه پرداخت سفارش M2601296 - اعتبار به کیف پول', 'ar'), 'إضافة المبلغ الزائد للطلب M2601296 إلى المحفظة');
  assert.equal(localizeWalletTransactionDescription('یادداشت دستی', 'en'), 'یادداشت دستی');
});

test('automatic finance approval notes follow the site language without changing custom notes', () => {
  const note = 'Payment approved by financial department - moving to warehouse - مبلغ 9 دینار از کیف پول کسر شد';
  assert.equal(localizeFinanceNote(note, 'fa'), 'پرداخت توسط واحد مالی تأیید شد - انتقال به انبار - مبلغ 9 دینار از کیف پول کسر شد');
  assert.equal(localizeFinanceNote(note, 'en'), 'Payment approved by financial department - moving to warehouse - 9 IQD was deducted from the wallet');
  assert.equal(localizeFinanceNote(note, 'ar'), 'تمت الموافقة على الدفع من القسم المالي - جارٍ النقل إلى المستودع - تم خصم 9 دينار عراقي من المحفظة');
  assert.equal(localizeFinanceNote(note, 'tr'), 'Ödeme finans birimi tarafından onaylandı - depoya aktarılıyor - Cüzdandan 9 IQD düşüldü');
  assert.equal(localizeFinanceNote('Grace period payment approved by financial department - awaiting manual warehouse transfer', 'fa'), 'پرداخت سفارش مهلت‌دار توسط واحد مالی تأیید شد - در انتظار انتقال دستی به انبار');
  assert.equal(localizeFinanceNote('Please review payment - مبلغ 9 دینار از کیف پول کسر شد', 'en'), 'Please review payment - 9 IQD was deducted from the wallet');
  assert.equal(localizeFinanceNote('Please review payment', 'fa'), 'Please review payment');
});