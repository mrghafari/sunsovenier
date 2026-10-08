import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertCompleteActiveContractDraft,
  assertContractShippingMode,
  attachContractHold,
  claimContractCart,
  loadContractPricing,
  companyProfileToContractSeller,
  formatContractNumber,
  formatContractAddendumNumber,
  resolveContractShippingMode,
  snapshotContractAddendum,
  snapshotContractAtClaim,
  validateContractAddendumDefinition,
  validateContractDefinition,
} from "./shop-contracts";
import { pool } from "./db";
import { isValidIsoDate, shopContractDraftSchema } from "@shared/contract-draft";
import { buildContractDraftText } from "@shared/contract-document";
import { calculateContractPackaging } from "@shared/contract-packaging";

const validDraft = () => ({
  version: 1 as const,
  dealType: "iran" as const,
  date: " 2026-04-30 ",
  seller: {
    name: " Seller ",
    registration: " 123 ",
    address: " Address ",
    representative: " Representative ",
    contact: " Contact ",
  },
  buyer: {
    country: " Iraq ",
    registration: " 456 ",
    address: " Buyer address ",
    representative: " Buyer representative ",
    contact: " Buyer contact ",
  },
  productDetails: {
    Polymer: { grade: " Grade ", tolerance: " +/- 2% ", packaging: " Bags " },
  },
  payment: { method: "advance" as const, days: " 30 " },
  delivery: { location: " Basra ", date: " 2026-05-20 " },
  disputeCity: " Tehran ",
});

const validV2Draft = (overrides: Record<string, unknown> = {}) => ({
  ...validDraft(),
  version: 2 as const,
  dealType: "iraqLocal" as const,
  language: "fa" as const,
  date: "2026-04-30",
  delivery: { location: " Basra ", date: "2026-05-20" },
  ...overrides,
});

const validContract = () => ({
  number: "C-2026-1",
  customerId: 7,
  terms: "Agreed fixed prices",
  deliveryTerm: "FCA",
  isActive: true,
  items: [
    { productId: 11, maxQuantity: 40, unitPrice: 12000 },
    { productId: 12, maxQuantity: 20, unitPrice: 0 },
  ],
});

test("contract requires a customer, number, terms, delivery term, status, and priced products", () => {
  assert.deepEqual(validateContractDefinition(validContract()), validContract());
  for (const key of ["number", "customerId", "terms", "deliveryTerm", "isActive", "items"] as const) {
    const input: any = validContract();
    delete input[key];
    assert.throws(() => validateContractDefinition(input), { name: "Error" });
  }
});

test("contract packaging validates create/edit/addendum without adding fees to legacy contracts", () => {
  const packaging = {type:"drum",customName:"",costPerTonne:20000,vatRatePercent:4.5};
  assert.deepEqual(validateContractDefinition({...validContract(),packaging}).packaging,packaging);
  assert.equal(validateContractDefinition({...validContract(),packaging:null}).packaging,null);
  assert.equal(validateContractDefinition(validContract()).packaging,undefined);
  assert.deepEqual(validateContractAddendumDefinition({...validContract(),packaging}).packaging,packaging);
  assert.throws(()=>validateContractDefinition({...validContract(),packaging:{...packaging,costPerTonne:-1}}));
});

test("database pricing computes packaging from net weight and rejects stale terms before holding capacity", async () => {
  const packaging = {type:"drum",customName:"",costPerTonne:20000,vatRatePercent:4.5};
  const expected = calculateContractPackaging(packaging,[{productId:11,quantity:2,netWeight:500}]);
  const statements:string[] = [];
  let currentPackaging = packaging;
  let currentNetWeight = "500";
  const originalConnect = pool.connect;
  (pool as any).connect = async () => ({
    query:async(sql:string)=>{
      statements.push(sql);
      if(sql.startsWith("SELECT id, number, shipping_mode, packaging") || sql.startsWith("SELECT id, packaging"))
        return {rowCount:1,rows:[{id:1,number:"C2609999",shipping_mode:"self_transport",packaging:currentPackaging}]};
      if(sql.startsWith("SELECT ci.product_id"))
        return {rowCount:1,rows:[{product_id:11,max_quantity:10,used_quantity:0,unit_price:10000,net_weight:currentNetWeight,weight_unit:"kg"}]};
      return {rowCount:0,rows:[]};
    }, release(){},
  });
  try {
    const pricing = await loadContractPricing(1,7,{11:2});
    assert.deepEqual(pricing.packagingDetails,expected);
    currentPackaging = {...packaging,costPerTonne:30000};
    await assert.rejects(()=>claimContractCart(1,7,{11:2},{11:10000},expected),/Packaging terms or net weights changed/);
    currentPackaging = packaging; currentNetWeight = "600";
    await assert.rejects(()=>claimContractCart(1,7,{11:2},{11:10000},expected),/Packaging terms or net weights changed/);
    currentNetWeight = "500";
    await assert.rejects(()=>claimContractCart(1,7,{11:2},{11:10000},{...expected!,costAmount:0}),/Packaging terms or net weights changed/);
    assert.equal(statements.some(s=>s.startsWith("UPDATE shop_contract_items SET used_quantity")),false);
    assert.ok(statements.includes("ROLLBACK"));
  }finally{(pool as any).connect=originalConnect;}
});

test("packaging changes in addenda do not mutate a claimed historical snapshot",()=>{
  const packaging = {type:"bulk",customName:"",costPerTonne:0,vatRatePercent:0};
  const contract = {...validContract(),packaging};
  const original = snapshotContractAtClaim(contract);
  contract.packaging.costPerTonne=5000;
  assert.equal(original.packaging.costPerTonne,0);
  assert.equal(snapshotContractAddendum(contract,"C2609999-1").packaging.costPerTonne,5000);
});

test("delivery term accepts only the eleven Incoterms 2020 codes", () => {
  for (const code of ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"]) {
    assert.equal(validateContractDefinition({ ...validContract(), deliveryTerm: code }).deliveryTerm, code);
  }
  for (const value of ["fca", "OTHER", "FOO", "", 123]) {
    assert.throws(() => validateContractDefinition({ ...validContract(), deliveryTerm: value }));
  }
  assert.equal(validateContractDefinition({ ...validContract(), deliveryTerm: null }).deliveryTerm, null);
  assert.throws(() => validateContractDefinition({ ...validContract(), deliveryTerm: null }, true));
});

test("contract prices are fixed whole IQD amounts and product caps are positive integers", () => {
  for (const [field, value] of [
    ["unitPrice", -1], ["unitPrice", 2.5], ["unitPrice", Number.POSITIVE_INFINITY],
    ["maxQuantity", 0], ["maxQuantity", 1.5],
  ] as const) {
    const input = validContract();
    (input.items[0] as any)[field] = value;
    assert.throws(() => validateContractDefinition(input), { name: "Error" });
  }
});

test("contract rejects duplicate product entries", () => {
  const input = validContract();
  input.items[1].productId = input.items[0].productId;
  assert.throws(() => validateContractDefinition(input), { name: "Error" });
});

test("new contract numbers follow the order format with an independent C prefix", () => {
  assert.equal(formatContractNumber(2026, 1111), "C2601111");
  assert.equal(formatContractNumber(2030, 12345), "C3012345");
  assert.throws(() => formatContractNumber(2026, 100000));
  assert.equal(validateContractDefinition({
    ...validContract(),
    number: "ignored",
    shippingMode: "self_transport",
  }, true).number, "");
});

test("contract addendum numbers use the parent's number and positive per-parent sequence", () => {
  assert.equal(formatContractAddendumNumber("C2601111", 1), "C2601111-1");
  assert.equal(formatContractAddendumNumber("C2601111", 8), "C2601111-8");
  assert.throws(() => formatContractAddendumNumber("C2601111", 0));
  assert.throws(() => formatContractAddendumNumber("C2601111", 1.5));
  assert.throws(() => formatContractAddendumNumber("", 1));
});

test("addendum snapshots retain the full versioned contract without mutating the live response", () => {
  const liveContract = {
    id: 5,
    number: "C2601111",
    addendumCount: 1,
    terms: "Updated commercial terms",
    items: [{ productId: 11, maxQuantity: 35, usedQuantity: 7, unitPrice: 12500 }],
  };
  const snapshot = snapshotContractAddendum(liveContract, "C2601111-2");
  assert.deepEqual(snapshot, {
    id: 5,
    number: "C2601111-2",
    addendumCount: 2,
    terms: "Updated commercial terms",
    items: [{ productId: 11, maxQuantity: 35, usedQuantity: 7, unitPrice: 12500 }],
  });
  assert.equal(liveContract.number, "C2601111");
  assert.equal(liveContract.addendumCount, 1);
  assert.notEqual(snapshot.items[0], liveContract.items[0]);
});

test("a claim freezes the current terms so attaching after an addendum preserves the claimed version", async () => {
  const claimed = snapshotContractAtClaim({
    id: 5,
    number: "C2601111",
    terms: "Original terms",
    items: [{ productId: 11, productName: "Resin", maxQuantity: 40, unitPrice: 12000 }],
  });
  const later = snapshotContractAddendum({
    ...claimed,
    terms: "Amended terms",
    items: [{ productId: 11, productName: "Resin", maxQuantity: 60, unitPrice: 11000 }],
  }, "C2601111-1");
  assert.equal(later.terms, "Amended terms");
  assert.equal(claimed.terms, "Original terms");
  const futureClaim = snapshotContractAtClaim(later, { number: later.number, terms: later.terms });
  assert.equal(futureClaim.number, "C2601111-1");
  assert.equal(futureClaim.terms, "Amended terms");

  const originalConnect = pool.connect;
  const statements: Array<{ sql: string; params?: unknown[] }> = [];
  (pool as any).connect = async () => ({
    query: async (sql: string, params?: unknown[]) => {
      statements.push({ sql, params });
      if (sql.startsWith("SELECT id, contract_id, customer_id, contract_snapshot")) {
        return { rowCount: 1, rows: [{ id: "hold-1", contract_id: 5, customer_id: 7, created_at: new Date(), contract_snapshot: claimed }] };
      }
      if (sql.startsWith("UPDATE customer_orders")) return { rowCount: 1, rows: [{ id: 9 }] };
      if (sql.startsWith("INSERT INTO shop_contract_order_snapshots")) return { rowCount: 1, rows: [{ order_id: 9 }] };
      return { rowCount: 1, rows: [] };
    },
    release() {},
  });
  try {
    await attachContractHold("hold-1", 9);
  } finally {
    (pool as any).connect = originalConnect;
  }
  const orderSnapshot = statements.find(({ sql }) => sql.startsWith("INSERT INTO shop_contract_order_snapshots"));
  const holdUpdate = statements.find(({ sql }) => sql.startsWith("UPDATE shop_contract_holds SET order_id"));
  assert.equal(orderSnapshot?.params?.[2], claimed);
  assert.deepEqual(orderSnapshot?.params?.slice(0, 2), [9, 5]);
  assert.equal(holdUpdate?.params?.[2], claimed);
});

test("attaching an order never overwrites its existing contract snapshot", async () => {
  const snapshot = { number: "C2601111", terms: "Previously attached terms" };
  const originalConnect = pool.connect;
  const statements: Array<{ sql: string; params?: unknown[] }> = [];
  (pool as any).connect = async () => ({
    query: async (sql: string, params?: unknown[]) => {
      statements.push({ sql, params });
      if (sql.startsWith("SELECT id, contract_id, customer_id, contract_snapshot")) {
        return { rowCount: 1, rows: [{ id: "hold-2", contract_id: 5, customer_id: 7, created_at: new Date(), contract_snapshot: snapshot }] };
      }
      if (sql.startsWith("UPDATE customer_orders")) return { rowCount: 1, rows: [{ id: 9 }] };
      if (sql.startsWith("INSERT INTO shop_contract_order_snapshots")) return { rowCount: 0, rows: [] };
      if (sql.startsWith("SELECT contract_id FROM shop_contract_order_snapshots")) {
        return { rowCount: 1, rows: [{ contract_id: 5 }] };
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  });
  try {
    await attachContractHold("hold-2", 9);
  } finally {
    (pool as any).connect = originalConnect;
  }
  const insert = statements.find(({ sql }) => sql.startsWith("INSERT INTO shop_contract_order_snapshots"));
  assert.match(insert?.sql || "", /ON CONFLICT \(order_id\) DO NOTHING/);
  assert.equal(
    statements.some(({ sql }) => sql.startsWith("UPDATE shop_contract_order_snapshots")),
    false,
  );
});

test("addendum payloads may omit the base contract number", () => {
  const { number: _number, ...payload } = validContract();
  const result = validateContractAddendumDefinition(payload);
  assert.equal(result.customerId, 7);
  assert.equal(result.items[0].maxQuantity, 40);
  assert.equal(result.number, "server-generated-addendum");
  assert.throws(() => validateContractAddendumDefinition({ ...payload, number: 123 }), /Contract number is required/);
});

test("new contracts require an explicit shipping mode while legacy edits preserve null/omitted mode", () => {
  assert.throws(
    () => validateContractDefinition({ ...validContract(), number: "ignored" }, true),
    /Choose a contract shipping mode/,
  );
  for (const mode of ["automatic_vehicle", "self_transport"] as const) {
    const created = validateContractDefinition({
      ...validContract(),
      number: "ignored",
      shippingMode: mode,
    }, true);
    assert.equal(created.shippingMode, mode);
  }
  assert.throws(() => validateContractDefinition({
    ...validContract(),
    number: "ignored",
    shippingMode: "courier",
  }, true), /Choose automatic vehicle or self transport/);
  assert.equal(validateContractDefinition(validContract()).shippingMode, undefined);
  assert.equal(validateContractDefinition({ ...validContract(), shippingMode: null }).shippingMode, null);
  assert.equal(resolveContractShippingMode(undefined, "automatic_vehicle"), "automatic_vehicle");
  assert.equal(resolveContractShippingMode(undefined, "self_transport"), "self_transport");
  assert.equal(resolveContractShippingMode(undefined, null), null);
  assert.equal(resolveContractShippingMode("self_transport", "automatic_vehicle"), "self_transport");
  assert.equal(resolveContractShippingMode(null, "automatic_vehicle"), null);
});

test("contract shipping mode requires its canonical delivery method and leaves legacy modes unrestricted", () => {
  assert.doesNotThrow(() => assertContractShippingMode("automatic_vehicle", "smart_vehicle"));
  assert.throws(() => assertContractShippingMode("automatic_vehicle", "courier"), /requires automatic vehicle/);
  assert.doesNotThrow(() => assertContractShippingMode("automatic_vehicle", "self_pickup"));
  assert.doesNotThrow(() => assertContractShippingMode("self_transport", "self_pickup"));
  assert.throws(() => assertContractShippingMode("self_transport", "pickup"), /requires customer-arranged/);
  assert.throws(() => assertContractShippingMode("self_transport", "smart_vehicle"), /requires customer-arranged/);
  assert.doesNotThrow(() => assertContractShippingMode(null, "courier"));
  assert.doesNotThrow(() => assertContractShippingMode(null, "smart_vehicle"));
});

test("an inactive contract may have its last product removed", () => {
  assert.deepEqual(validateContractDefinition({ ...validContract(), items: [], isActive: false }).items, []);
  assert.throws(() => validateContractDefinition({ ...validContract(), items: [] }));
  assert.throws(() => validateContractDefinition({ ...validContract(), items: [], isActive: false }, true));
});

test("structured contract drafts validate, trim text, and enforce size and product limits", () => {
  const parsed = shopContractDraftSchema.parse(validDraft());
  assert.equal(parsed.seller.name, "Seller");
  assert.equal(parsed.productDetails.Polymer.grade, "Grade");
  assert.equal(parsed.payment.days, "30");
  for (const invalid of [
    { ...validDraft(), version: 2 },
    { ...validDraft(), dealType: "unknown" },
    { ...validDraft(), payment: { method: "cash", days: "30" } },
    { ...validDraft(), productDetails: Object.fromEntries(
      Array.from({ length: 101 }, (_, index) => [`Product ${index}`, { grade: "", tolerance: "", packaging: "" }]),
    ) },
    { ...validDraft(), productDetails: Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [
        `Product ${index}`,
        { grade: "g".repeat(500), tolerance: "t".repeat(500), packaging: "p".repeat(500) },
      ]),
    ) },
  ]) {
    assert.equal(shopContractDraftSchema.safeParse(invalid).success, false);
  }
});

test("version-one drafts preserve export-to-Iraq meaning and accept a safe optional language", () => {
  const legacy = shopContractDraftSchema.parse({ ...validDraft(), dealType: "iraq" });
  assert.equal(legacy.version, 1);
  assert.equal(legacy.dealType, "iraq");
  assert.equal(legacy.language, undefined);
  assert.equal(shopContractDraftSchema.parse({ ...validDraft(), dealType: "iraq", language: "tr" }).language, "tr");
  assert.equal(shopContractDraftSchema.safeParse({ ...validDraft(), language: "fr" }).success, false);
  const text = buildContractDraftText(
    shopContractDraftSchema.parse({ ...validDraft(), dealType: "iraq", language: "en" }),
    { customerName: "Buyer", contractNumber: "C2601111", deliveryTerm: "FCA", items: [] },
  );
  assert.match(text, /Petrochemical Products Sales Agreement/);
  assert.match(text, /Export to Iraq/);
  assert.match(text, /2026-04-30/);
});

test("version-two drafts require one of three transaction types and real ISO dates", () => {
  assert.equal(shopContractDraftSchema.parse(validV2Draft()).version, 2);
  for (const dealType of ["iran", "iraqLocal", "intl"]) {
    assert.equal(shopContractDraftSchema.safeParse(validV2Draft({ dealType })).success, true);
  }
  assert.equal(shopContractDraftSchema.safeParse(validV2Draft({ dealType: "iraq" })).success, false);
  assert.equal(shopContractDraftSchema.safeParse(validV2Draft({ language: "ku" })).success, false);
  for (const date of ["2026-02-29", "2026-04-31", "04/30/2026", "2026-1-01"]) {
    assert.equal(shopContractDraftSchema.safeParse(validV2Draft({ date })).success, false);
    assert.equal(isValidIsoDate(date), false);
  }
  assert.equal(isValidIsoDate("2028-02-29"), true);
  assert.equal(shopContractDraftSchema.safeParse(validV2Draft({
    delivery: { location: "Basra", date: "2026-02-30" },
  })).success, false);
});

test("inactive v2 drafts may omit dates, but activation requires real ISO dates", () => {
  const partial = validV2Draft({
    date: "",
    delivery: { location: "Basra", date: "" },
  });
  const parsed = shopContractDraftSchema.parse(partial);
  assert.doesNotThrow(() => validateContractDefinition({
    ...validContract(),
    isActive: false,
    draftData: parsed,
  }));
  assert.throws(() => assertCompleteActiveContractDraft(parsed), /Contract date must be a real YYYY-MM-DD date/);

  const validDateMissingDelivery = shopContractDraftSchema.parse(validV2Draft({
    delivery: { location: "Basra", date: "" },
  }));
  assert.throws(() => assertCompleteActiveContractDraft(validDateMissingDelivery), /Delivery date must be a real YYYY-MM-DD date/);
  for (const date of ["not-a-date", "2026-02-30"]) {
    assert.equal(shopContractDraftSchema.safeParse(validV2Draft({ date })).success, false);
    assert.equal(shopContractDraftSchema.safeParse(validV2Draft({
      delivery: { location: "Basra", date },
    })).success, false);
  }
});

test("server maps company management profile language exactly without fallback", () => {
  const profile = {
    tradeName: "نام تجاری",
    companyNameEn: "Company English",
    companyNameAr: "اسم عربي",
    companyNameTr: "Türkçe şirket",
    registrationNumber: "REG-1",
    taxNumber: "TAX-1",
    mainAddress: "Main street",
    city: "Basra",
    country: "Iraq",
    postalCode: "10001",
    phonePrimary: "+964-1",
    emailPrimary: "legal@example.test",
    websiteUrl: "https://example.test",
    contactPersonName: "Jane Doe",
    contactPersonTitle: "Director",
    contactPersonPhone: "+964-2",
    contactPersonEmail: "jane@example.test",
  };
  const persian = companyProfileToContractSeller(profile, "fa");
  assert.equal(persian.name, "نام تجاری");
  assert.equal(persian.registration, "REG-1");
  assert.equal(persian.taxNumber, "TAX-1");
  assert.equal(persian.address, "Main street, Basra, Iraq, 10001");
  assert.equal(persian.representative, "Jane Doe — Director");
  assert.equal(persian.contact, "+964-1 · legal@example.test · +964-2 · jane@example.test");
  assert.equal(persian.website, "https://example.test");
  assert.equal(companyProfileToContractSeller(profile, "en").name, "Company English");
  assert.equal(companyProfileToContractSeller(profile, "ar").name, "اسم عربي");
  assert.equal(companyProfileToContractSeller(profile, "tr").name, "Türkçe şirket");
  assert.equal(companyProfileToContractSeller({ ...profile, companyNameTr: "" }, "tr").name, "");
});

test("company seller mapper accepts raw pg snake_case rows and includes contact-person channels", () => {
  const pgRow = {
    trade_name: "نام تجاری",
    company_name_en: "Company English",
    company_name_ar: "اسم عربي",
    company_name_tr: "Türkçe şirket",
    registration_number: "REG-1",
    tax_number: "TAX-1",
    main_address: "Main street",
    city: "Basra",
    country: "Iraq",
    postal_code: "10001",
    phone_primary: "+964-1",
    phone_secondary: "+964-3",
    email_primary: "legal@example.test",
    email_secondary: "office@example.test",
    website_url: "https://example.test",
    contact_person_name: "Jane Doe",
    contact_person_title: "Director",
    contact_person_phone: "+964-2",
    contact_person_email: "jane@example.test",
  };
  const seller = companyProfileToContractSeller(pgRow, "en");
  assert.equal(seller.name, "Company English");
  assert.equal(seller.registration, "REG-1");
  assert.equal(seller.taxNumber, "TAX-1");
  assert.equal(seller.address, "Main street, Basra, Iraq, 10001");
  assert.equal(seller.representative, "Jane Doe — Director");
  assert.equal(seller.contact, "+964-1 · legal@example.test · +964-3 · office@example.test · +964-2 · jane@example.test");
  assert.equal(seller.website, "https://example.test");
});

test("authorized contract payloads retain seller edits without changing the company profile or older snapshots", () => {
  const source = {
    tradeName: "Authoritative seller",
    companyNameEn: "Authoritative seller",
    companyNameAr: "البائع",
    companyNameTr: "Satıcı",
    registrationNumber: "OFFICIAL-1",
    mainAddress: "Official address",
    contactPersonName: "Company representative",
    contactPersonTitle: "Director",
    phonePrimary: "+1 555 123",
  };
  const editedDraft = shopContractDraftSchema.parse(validV2Draft({
    language: "en",
    seller: {
      name: "Contract-specific seller",
      registration: "CONTRACT-123",
      address: "Contract address",
      representative: "Contract signer",
      contact: "Contract contact",
      taxNumber: "TAX-123", country: "Iraq", city: "Basra", postalCode: "12345", website: "https://contract.example.test",
    },
  }));
  const saved = companyProfileToContractSeller(source, "en");
  for (const refreshSeller of [false, true]) {
    const definition = validateContractDefinition({ ...validContract(), draftData: editedDraft, refreshSeller });
    assert.deepEqual(definition.draftData?.seller, editedDraft.seller);
    assert.doesNotThrow(() => assertCompleteActiveContractDraft(definition.draftData!));
    const text = buildContractDraftText(definition.draftData!, {
      customerName: "Buyer", contractNumber: "C2612345", deliveryTerm: "FCA", items: [],
    });
    assert.match(text, /Contract-specific seller/);
    assert.match(text, /Contract signer/);
  }
  assert.equal(source.companyNameEn, "Authoritative seller");
  assert.equal(saved.name, "Authoritative seller");
  assert.equal(saved.registration, "OFFICIAL-1");
});

test("v2 contract text is localized in all four languages with the selected transaction type", () => {
  const titleByLanguage = {
    fa: /قرارداد فروش محصولات پتروشیمی/,
    ar: /اتفاقية بيع المنتجات البتروكيماوية/,
    en: /Petrochemical Products Sales Agreement/,
    tr: /Petrokimya Ürünleri Satış Sözleşmesi/,
  } as const;
  const definitionByLanguage = {
    fa: /تعاریف/,
    ar: /التعريفات/,
    en: /Definitions/,
    tr: /Tanımlar/,
  } as const;
  const formattedDateByLanguage = {
    fa: /۱۰ اردیبهشت ۱۴۰۵/,
    ar: /٣٠ نيسان ٢٠٢٦/,
    en: /April 30, 2026/,
    tr: /30 Nisan 2026/,
  } as const;
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const draft = shopContractDraftSchema.parse(validV2Draft({ language, dealType: "iran" }));
    const result = buildContractDraftText(draft, {
      customerName: "CRM Buyer",
      contractNumber: "C2601111",
      deliveryTerm: "FCA",
      items: [{ productId: 11, productName: "Polyethylene", maxQuantity: 40, unitPrice: 12000 }],
    });
    assert.match(result, titleByLanguage[language]);
    assert.match(result, /C2601111/);
    assert.match(result, /Polyethylene/);
    assert.match(result, /12000/);
    assert.match(result, formattedDateByLanguage[language]);
    assert.match(result, definitionByLanguage[language]);
    assert.match(result, /پیش‌نویس|draft|مسودة|taslaktır/);
    assert.match(result, /pending|بانتظار|bekleniyor|در انتظار/);
    assert.doesNotMatch(result, /[آ]رای داوری قطعی|محکوم است|با اعتبار کامل حقوقی/);
  }
  const iraqDomestic = buildContractDraftText(shopContractDraftSchema.parse(validV2Draft({
    language: "en", dealType: "iraqLocal",
  })), { customerName: "Buyer", contractNumber: "C2601111", deliveryTerm: "FCA", items: [] });
  assert.match(iraqDomestic, /Domestic sale in Iraq/);
  const international = buildContractDraftText(shopContractDraftSchema.parse(validV2Draft({
    language: "tr", dealType: "intl",
  })), { customerName: "Buyer", contractNumber: "C2601111", deliveryTerm: "FCA", items: [] });
  assert.match(international, /Uluslararası satış/);
});

test("contract draft is optional for legacy payloads and supports explicit clearing", () => {
  const legacy = validateContractDefinition(validContract());
  assert.equal(Object.prototype.hasOwnProperty.call(legacy, "draftData"), false);

  const withDraft = validateContractDefinition({ ...validContract(), draftData: validDraft() });
  assert.equal(withDraft.draftData?.seller.name, "Seller");
  const clearDraft = validateContractDefinition({ ...validContract(), draftData: null });
  assert.equal(clearDraft.draftData, null);

  for (const draftData of [{ version: 9 }, "not a draft", 12]) {
    assert.throws(() => validateContractDefinition({ ...validContract(), draftData }), /Invalid contract draft data/);
  }
});

test("canonical document includes the server contract number and all authoritative item values", () => {
  const text = buildContractDraftText(validDraft() as any, {
    customerName: "CRM Customer",
    contractNumber: "C2601111",
    deliveryTerm: "FCA",
    items: [
      { productId: 11, productName: "Polyethylene", maxQuantity: 40, unitPrice: 12000 },
      { productId: 12, productName: "Polypropylene", maxQuantity: 20, unitPrice: 0 },
    ],
  });
  assert.match(text, /شماره قرارداد: C2601111/);
  assert.match(text, /CRM Customer/);
  assert.match(text, /Polyethylene: حداکثر تعداد 40 واحد, قیمت واحد \(IQD\) 12000/);
  assert.match(text, /Polypropylene: حداکثر تعداد 20 واحد, قیمت واحد \(IQD\) 0/);
  assert.match(text, /اینکوترم FCA/);
  assert.match(text, /در انتظار بازبینی و امضای طرفین/);
  assert.doesNotMatch(text, /به تأیید نهایی طرفین رسید|معادل امضای دستی و دارای اعتبار کامل حقوقی/);
});

test("structured drafts ignore client terms and require material fields only when active", () => {
  const submitted = {
    ...validContract(),
    terms: { attacker: "client-authored terms" },
    draftData: validDraft(),
  };
  const validated = validateContractDefinition(submitted);
  assert.equal(validated.terms, "");
  assert.doesNotThrow(() => assertCompleteActiveContractDraft(validated.draftData!));

  const incomplete = validDraft();
  incomplete.seller.address = "";
  assert.throws(() => assertCompleteActiveContractDraft(incomplete as any), /seller\.address/);
  const invalidDays = validDraft();
  invalidDays.payment.days = "thirty";
  assert.throws(() => assertCompleteActiveContractDraft(invalidDays as any), /Payment days/);
  assert.doesNotThrow(() => validateContractDefinition({
    ...validContract(),
    isActive: false,
    draftData: incomplete,
  }));
});

test("legacy terms remain authoritative when structured draft data is absent or cleared", () => {
  const legacy = validateContractDefinition(validContract());
  assert.equal(legacy.terms, "Agreed fixed prices");
  const cleared = validateContractDefinition({ ...validContract(), draftData: null });
  assert.equal(cleared.terms, "Agreed fixed prices");
  assert.equal(cleared.draftData, null);
});

test("generated contracts include the CRM name and business customer number in every document language", () => {
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const draft = shopContractDraftSchema.parse(validV2Draft({ language }));
    const context = { customerName: "Synthetic Buyer", customerCode: "9123456", contractNumber: "C2601111", deliveryTerm: "FCA" as const, items: [] };
    const document = buildContractDraftText(draft, context);
    assert.match(document, /Synthetic Buyer/);
    assert.match(document, /9123456/);
    assert.match(document, /شماره مشتری|رقم العميل|Customer number|Müşteri numarası/);
    const legacy = buildContractDraftText(draft, { ...context, customerCode: null });
    assert.doesNotMatch(legacy, /9123456/);
    assert.doesNotMatch(legacy, /شماره مشتری|رقم العميل|Customer number|Müşteri numarası/);
  }
});