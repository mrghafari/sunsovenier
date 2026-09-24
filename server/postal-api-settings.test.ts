import assert from "node:assert/strict";
import test from "node:test";
import {
  getPostalApiSettings,
  POSTAL_API_SETTING_CATEGORY,
  PostalApiSettingsValidationError,
  updatePostalApiSettings,
  validatePostalApiSettingsUpdate,
  type PostalSettingsQuery,
} from "./postal-api-settings";

class MemorySettings implements PostalSettingsQuery {
  readonly values = new Map<string, string>();
  readonly statements: Array<{ text: string; params: any[] }> = [];

  async query(text: string, params: any[] = []) {
    this.statements.push({ text, params });
    if (text.includes("SELECT setting_key")) {
      return {
        rows: [...this.values.entries()].map(([setting_key, setting_value]) => ({
          setting_key,
          setting_value,
        })),
      };
    }
    this.values.set(params[0], params[1]);
    return { rows: [] };
  }
}

test("postal settings GET returns only three providers and secret configuration metadata", async () => {
  const settings = new MemorySettings();
  settings.values.set("postal_api_iran_post_base_url", "https://api.iranpost.example.invalid");
  settings.values.set("postal_api_tipax_account_reference", "acct-123");
  settings.values.set("unrelated_secret", "must never be returned");
  const env = {
    IRAN_POST_API_TOKEN: "secret-value",
    MAHEX_API_TOKEN: "",
    TIPAX_API_TOKEN: "another-secret-value",
  };

  const data = await getPostalApiSettings(settings, env);

  assert.deepEqual(data.map((row) => row.providerKey), ["iran_post", "mahex", "tipax"]);
  assert.deepEqual(data.map(({ credentialsConfigured, secretName }) => [credentialsConfigured, secretName]), [
    [true, "IRAN_POST_API_TOKEN"],
    [false, "MAHEX_API_TOKEN"],
    [true, "TIPAX_API_TOKEN"],
  ]);
  assert.equal(data[0].status, "configuration_only");
  assert.equal(data[0].baseUrl, "https://api.iranpost.example.invalid");
  assert.equal(data[2].accountReference, "acct-123");
  assert.equal(JSON.stringify(data).includes("secret-value"), false);
  assert.match(settings.statements[0].text, /category = \$1/);
  assert.equal(settings.statements[0].params[0], POSTAL_API_SETTING_CATEGORY);
});

test("postal settings update persists only provider-scoped non-secret configuration", async () => {
  const settings = new MemorySettings();
  settings.values.set("postal_api_tipax_account_reference", "existing");

  const result = await updatePostalApiSettings(settings, "tipax", {
    baseUrl: "https://api.tipax.example.org/v2",
    accountReference: "merchant-42",
  }, { TIPAX_API_TOKEN: "not-returned" });

  assert.equal(result.baseUrl, "https://api.tipax.example.org/v2");
  assert.equal(result.accountReference, "merchant-42");
  assert.equal(result.credentialsConfigured, true);
  assert.equal(result.secretName, "TIPAX_API_TOKEN");
  assert.equal(JSON.stringify(result).includes("not-returned"), false);
  const writes = settings.statements.filter(({ text }) => text.includes("INSERT INTO shop_settings"));
  assert.equal(writes.length, 2);
  assert.ok(writes.every(({ params, text }) =>
    params[3] === POSTAL_API_SETTING_CATEGORY
    && text.includes("ON CONFLICT (setting_key)")
    && !text.includes("api_token")
  ));
  assert.equal(settings.values.get("postal_api_tipax_base_url"), "https://api.tipax.example.org/v2");
  assert.equal(settings.values.get("postal_api_tipax_account_reference"), "merchant-42");
});

test("postal setting validation requires HTTPS public DNS hosts and bounded account references", () => {
  assert.deepEqual(validatePostalApiSettingsUpdate({
    baseUrl: "https://carrier.example.com/api",
    accountReference: "reference-1",
  }), {
    baseUrl: "https://carrier.example.com/api",
    accountReference: "reference-1",
  });
  for (const baseUrl of [
    "http://carrier.example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://10.0.0.1",
    "https://carrier.local",
    "https://user:password@carrier.example.com",
    "https://carrier.example.com?token=secret",
  ]) {
    assert.throws(
      () => validatePostalApiSettingsUpdate({ baseUrl }),
      PostalApiSettingsValidationError,
      baseUrl,
    );
  }
  assert.throws(
    () => validatePostalApiSettingsUpdate({ accountReference: "x".repeat(129) }),
    PostalApiSettingsValidationError,
  );
  assert.throws(
    () => validatePostalApiSettingsUpdate({ accountReference: "valid", apiToken: "nope" }),
    PostalApiSettingsValidationError,
  );
  assert.deepEqual(validatePostalApiSettingsUpdate({ baseUrl: null }), { baseUrl: null });
  assert.deepEqual(validatePostalApiSettingsUpdate({ accountReference: "" }), { accountReference: null });
});

test("provider allowlist prevents writes for unsupported keys", async () => {
  const settings = new MemorySettings();
  await assert.rejects(
    updatePostalApiSettings(settings, "unknown", { baseUrl: "https://carrier.example.com" }),
    PostalApiSettingsValidationError,
  );
  assert.equal(settings.statements.length, 0);
});