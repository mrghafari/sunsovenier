import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import nodemailer from "nodemailer";
import { pool } from "./db";
import { getAwsS3Service } from "./aws-s3-service";
import { ensureContractSigningSchema } from "./contract-signing-schema";
import { customerDocuments, createSigningChallenge, completeSigning } from "./contract-signing-service";
import { deliverSignedCopy, drainSignedContractEmails, signedPdf } from "./contract-signing-delivery";
import { sendContractMail } from "./contract-signing-email";

// All SQL runs in an isolated schema inside one rollback-only transaction.
// SMTP and S3 are intercepted: no real customer, email, file or signature is created.
test("signing lifecycle, immutable evidence, OTP limits, ownership and recoverable email delivery", { timeout: 90000 }, async () => {
  const connection = await pool.connect();
  const realQuery = connection.query.bind(connection);
  const savedQuery = pool.query, savedConnect = pool.connect;
  const savedTransport = nodemailer.createTransport;
  const storage = getAwsS3Service();
  const savedStorage = {
    configured: storage.isPrivateStorageConfigured, upload: storage.uploadPrivateFileToKey,
    get: storage.getFile, remove: storage.deleteFile,
  };
  const schema = `signing_probe_${randomUUID().replace(/-/g, "")}`;
  const files = new Map<string, Buffer>();
  const mail: any[] = [];
  let storageFails = false, mailFails = false, savepoint = 0;
  const transactionNames: string[] = [];
  const fixtureQuery = async (sql: any, params?: any[]) => {
    if (sql === "BEGIN") {
      const name = `operation_${++savepoint}`; transactionNames.push(name);
      return realQuery(`SAVEPOINT ${name}`);
    }
    if (sql === "COMMIT") return realQuery(`RELEASE SAVEPOINT ${transactionNames.pop()}`);
    if (sql === "ROLLBACK") {
      const name = transactionNames.pop();
      await realQuery(`ROLLBACK TO SAVEPOINT ${name}`);
      return realQuery(`RELEASE SAVEPOINT ${name}`);
    }
    return realQuery(sql, params);
  };
  try {
    await realQuery("BEGIN");
    await realQuery(`CREATE SCHEMA ${schema}; SET LOCAL search_path TO ${schema}, public;
      CREATE TABLE users(id integer PRIMARY KEY,is_active boolean);
      CREATE TABLE crm_customers(id integer PRIMARY KEY,email text,first_name text,last_name text,preferred_language text,is_active boolean);
      CREATE TABLE shop_contracts(id integer PRIMARY KEY,customer_id integer,number text,terms text,draft_data jsonb,is_active boolean,
        ended_at timestamptz,original_contract_snapshot jsonb);
      CREATE TABLE shop_contract_addenda(id integer PRIMARY KEY,parent_contract_id integer,sequence integer,number text,contract_snapshot jsonb);
      CREATE TABLE email_categories(id integer PRIMARY KEY,category_name text,is_active boolean);
      CREATE TABLE smtp_settings(id integer PRIMARY KEY,category_id integer,host text,port integer,secure boolean,username text,password text,
        from_name text,from_email text,is_active boolean);
      CREATE TABLE email_templates(id serial PRIMARY KEY,name text,category text,subject text,html_content text,text_content text,variables json,
        is_active boolean,language text,created_by integer,usage_count integer DEFAULT 0,last_used timestamptz);
      INSERT INTO users VALUES(1,true);
      INSERT INTO crm_customers VALUES(1,'signer@example.invalid','Synthetic','Signer','fa',true),
        (2,'other@example.invalid','Other','Customer','en',true);
      INSERT INTO smtp_settings VALUES
        (1,NULL,'smtp.example.invalid',587,false,'fixture','fixture','Legal','legal@example.invalid',true),
        (2,NULL,'smtp.example.invalid',587,false,'fixture','fixture','Other','other@example.invalid',true);
      INSERT INTO shop_contracts VALUES
        (1,1,'TEST-C','Latest parent terms','{"language":"en"}',true,NULL,'{"terms":"متن اصلی توافق و شرایط پرداخت","draftData":{"language":"fa"}}'),
        (2,1,'TEST-C2','Original text for change detection','{"language":"en"}',true,NULL,NULL),
        (3,1,'TEST-C3','Expiry evidence','{"language":"en"}',true,NULL,NULL),
        (4,1,'TEST-C4','Attempt limit evidence','{"language":"en"}',true,NULL,NULL),
        (5,1,'TEST-C5','Recoverable storage and email evidence','{"language":"en"}',true,NULL,NULL),
        (6,1,'TEST-C6','Email change evidence','{"language":"en"}',true,NULL,NULL);
      INSERT INTO shop_contract_addenda VALUES(1,1,1,'TEST-C-1','{"terms":"متن مستقل متمم قرارداد","draftData":{"language":"fa"}}');
    `);
    (pool as any).query = fixtureQuery;
    (pool as any).connect = async () => ({ query: fixtureQuery, release() {} });
    (nodemailer as any).createTransport = () => ({
      async sendMail(options: any) {
        if (mailFails) throw new Error("Synthetic provider failure");
        mail.push(options); return { accepted: [options.to] };
      }, close() {},
    });
    storage.isPrivateStorageConfigured = () => true;
    storage.uploadPrivateFileToKey = async (buffer, key) => {
      if (storageFails) return false;
      files.set(key, Buffer.from(buffer)); return true;
    };
    storage.getFile = async key => files.get(key) ?? null;
    storage.deleteFile = async key => { files.delete(key); };
    await ensureContractSigningSchema(pool);
    assert.equal((await fixtureQuery("SELECT count(*)::int AS n FROM email_templates")).rows[0].n, 8);
    await ensureContractSigningSchema(pool);
    assert.equal((await fixtureQuery("SELECT count(*)::int AS n FROM email_templates")).rows[0].n, 8, "startup preserves editable templates");
    await fixtureQuery("UPDATE legal_contract_signing_settings SET sender_id=1");
    const documents = await customerDocuments(1);
    assert.equal(documents.find(d => d.key === "contract:1")!.terms, "متن اصلی توافق و شرایط پرداخت");
    assert.equal(documents.find(d => d.key === "addendum:1")!.number, "TEST-C-1");
    assert.equal((await customerDocuments(2)).length, 0);
    const ink = [[{ x: .1, y: .2 }, { x: .4, y: .7 }, { x: .8, y: .3 }]];
    const challengeFor = async (key: string) => {
      await fixtureQuery("UPDATE contract_signing_challenges SET created_at=now()-interval '2 hours'");
      const doc = (await customerDocuments(1)).find(d => d.key === key)!;
      const challenge = await createSigningChallenge(1, {
        documentKey: key, versionHash: doc.versionHash, signerName: "Synthetic Signer", consent: true, strokes: ink,
      });
      const code = mail.at(-1).text.match(/(?<!\d)\d{6}(?!\d)/)[0];
      assert.equal("code" in challenge, false);
      return { ...challenge, code, doc };
    };
    const first = await challengeFor("contract:1");
    const error = (code: string) => (value: any) => value.code === code;
    await assert.rejects(createSigningChallenge(2, {
      documentKey: first.doc.key, versionHash: first.doc.versionHash, signerName: "Other Signer", consent: true, strokes: ink,
    }), error("DOCUMENT_NOT_FOUND"));
    await assert.rejects(createSigningChallenge(1, {
      documentKey: first.doc.key, versionHash: first.doc.versionHash, signerName: "Synthetic Signer", consent: true, strokes: ink,
    }), error("OTP_RATE_LIMIT"));
    const audit = { ip: "127.0.0.1", userAgent: "isolated test fixture" };
    await assert.rejects(completeSigning(2, first.challengeId, first.code, audit), error("CHALLENGE_NOT_FOUND"));
    const wrong = first.code === "000000" ? "000001" : "000000";
    await assert.rejects(completeSigning(1, first.challengeId, wrong, audit), error("OTP_INVALID"));
    assert.equal((await fixtureQuery("SELECT attempts FROM contract_signing_challenges WHERE id=$1", [first.challengeId])).rows[0].attempts, 1);
    const signed = await completeSigning(1, first.challengeId, first.code, audit);
    assert.equal(signed.document_snapshot.terms, first.doc.terms);
    assert.ok((await signedPdf(signed)).subarray(0, 5).equals(Buffer.from("%PDF-")));
    const replay = await completeSigning(1, first.challengeId, wrong, audit);
    assert.equal(replay.id, signed.id);
    assert.equal(files.size, 1, "replay cannot create another signature or PDF");
    await deliverSignedCopy(signed.id);
    assert.equal((await fixtureQuery("SELECT email_status FROM electronic_contract_signatures WHERE id=$1", [signed.id])).rows[0].email_status, "accepted");
    assert.equal(mail.at(-1).from.address, "legal@example.invalid");
    assert.ok(mail.at(-1).attachments[0].content.equals(await signedPdf(signed)));
    const mailCount = mail.length;
    await deliverSignedCopy(signed.id);
    assert.equal(mail.length, mailCount, "an accepted queue item must not be sent twice");
    await fixtureQuery("SAVEPOINT immutable_probe");
    await assert.rejects(fixtureQuery("UPDATE electronic_contract_signatures SET signer_name='Changed' WHERE id=$1", [signed.id]), /immutable/);
    await fixtureQuery("ROLLBACK TO SAVEPOINT immutable_probe");
    await fixtureQuery("RELEASE SAVEPOINT immutable_probe");
    const changed = await challengeFor("contract:2");
    await fixtureQuery("UPDATE shop_contracts SET terms='Changed agreement' WHERE id=2");
    await assert.rejects(completeSigning(1, changed.challengeId, changed.code, audit), error("DOCUMENT_CHANGED"));
    const expired = await challengeFor("contract:3");
    await fixtureQuery("UPDATE contract_signing_challenges SET expires_at=now()-interval '1 second' WHERE id=$1", [expired.challengeId]);
    await assert.rejects(completeSigning(1, expired.challengeId, expired.code, audit), error("OTP_EXPIRED"));
    const guesses = await challengeFor("contract:4");
    for (let i = 0; i < 5; i++) await assert.rejects(completeSigning(1, guesses.challengeId, guesses.code === "111111" ? "222222" : "111111", audit), error("OTP_INVALID"));
    await assert.rejects(completeSigning(1, guesses.challengeId, guesses.code, audit), error("OTP_ATTEMPTS_EXCEEDED"));
    const retryable = await challengeFor("contract:5");
    storageFails = true;
    await assert.rejects(completeSigning(1, retryable.challengeId, retryable.code, audit), error("STORAGE_UNAVAILABLE"));
    assert.equal((await fixtureQuery("SELECT consumed_at FROM contract_signing_challenges WHERE id=$1", [retryable.challengeId])).rows[0].consumed_at, null);
    storageFails = false;
    const second = await completeSigning(1, retryable.challengeId, retryable.code, audit);
    mailFails = true;
    await deliverSignedCopy(second.id);
    assert.equal((await fixtureQuery("SELECT email_status FROM electronic_contract_signatures WHERE id=$1", [second.id])).rows[0].email_status, "failed");
    assert.equal((await fixtureQuery("SELECT count(*)::int AS n FROM electronic_contract_signatures")).rows[0].n, 2, "mail failure must not undo signatures");
    mailFails = false;
    await fixtureQuery("UPDATE electronic_contract_signatures SET next_email_attempt_at=now() WHERE id=$1", [second.id]);
    await drainSignedContractEmails();
    assert.equal((await fixtureQuery("SELECT email_status FROM electronic_contract_signatures WHERE id=$1", [second.id])).rows[0].email_status, "accepted");
    await fixtureQuery("UPDATE smtp_settings SET is_active=false WHERE id=1");
    await assert.rejects(sendContractMail("otp", "signer@example.invalid", "en", {
      customerName: "Synthetic", contractNumber: "TEST", code: "000000", expiresMinutes: "10",
    }), error("SENDER_UNAVAILABLE"));
    await fixtureQuery("UPDATE legal_contract_signing_settings SET sender_id=2");
    await fixtureQuery("UPDATE email_templates SET text_content='Edited OTP {{code}}' WHERE name='Contract signing OTP' AND language='en'");
    const changedEmail = await challengeFor("contract:6");
    assert.equal(mail.at(-1).from.address, "other@example.invalid");
    assert.ok(mail.at(-1).text.startsWith("Edited OTP"), "the editable email template must actually be used");
    await fixtureQuery("UPDATE crm_customers SET email='changed@example.invalid' WHERE id=1");
    await assert.rejects(completeSigning(1, changedEmail.challengeId, changedEmail.code, audit), error("CUSTOMER_EMAIL_CHANGED"));
  } finally {
    pool.query = savedQuery; pool.connect = savedConnect;
    nodemailer.createTransport = savedTransport;
    storage.isPrivateStorageConfigured = savedStorage.configured;
    storage.uploadPrivateFileToKey = savedStorage.upload;
    storage.getFile = savedStorage.get; storage.deleteFile = savedStorage.remove;
    await realQuery("ROLLBACK");
    connection.release();
    await pool.end();
  }
});
