import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertCompleteActiveContractDraft,
  assertContractShippingMode,
  applyAuthoritativeContractSeller,
  companyProfileToContractSeller,
  formatContractNumber,
  resolveContractShippingMode,
  validateContractDefinition,
} from "./shop-contracts";
import { isValidIsoDate, shopContractDraftSchema } from "@shared/contract-draft";
import { buildContractDraftText } from "@shared/contract-document";

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
  assert.throws(() => assertContractShippingMode("automatic_vehicle", "self_pickup"), /requires automatic vehicle/);
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

test("server overwrites forged seller data on create and preserves or refreshes snapshots on edit", () => {
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
  const forgedDraft = shopContractDraftSchema.parse(validV2Draft({
    language: "en",
    seller: {
      name: "Client forged name",
      registration: "FORGED",
      address: "Fake address",
      representative: "Fake signer",
      contact: "Fake contact",
    },
  }));
  const created = applyAuthoritativeContractSeller(forgedDraft, source, undefined, true);
  assert.equal(created.seller.name, "Authoritative seller");
  assert.equal(created.seller.registration, "OFFICIAL-1");
  assert.notEqual(created.seller.name, "Client forged name");

  const saved = companyProfileToContractSeller(source, "en");
  const changedProfile = { ...source, companyNameEn: "Edited profile name", registrationNumber: "REG-2" };
  const ordinaryEdit = applyAuthoritativeContractSeller(forgedDraft, changedProfile, saved, false);
  assert.equal(ordinaryEdit.seller.name, "Authoritative seller");
  assert.equal(ordinaryEdit.seller.registration, "OFFICIAL-1");
  const refresh = applyAuthoritativeContractSeller(forgedDraft, changedProfile, saved, true);
  assert.equal(refresh.seller.name, "Edited profile name");
  assert.equal(refresh.seller.registration, "REG-2");
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