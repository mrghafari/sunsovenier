import { isIP } from "node:net";

export const POSTAL_API_SETTING_CATEGORY = "postal_provider_api";

export const POSTAL_API_PROVIDERS = {
  iran_post: {
    secretName: "IRAN_POST_API_TOKEN",
    baseUrlKey: "postal_api_iran_post_base_url",
    accountReferenceKey: "postal_api_iran_post_account_reference",
  },
  mahex: {
    secretName: "MAHEX_API_TOKEN",
    baseUrlKey: "postal_api_mahex_base_url",
    accountReferenceKey: "postal_api_mahex_account_reference",
  },
  tipax: {
    secretName: "TIPAX_API_TOKEN",
    baseUrlKey: "postal_api_tipax_base_url",
    accountReferenceKey: "postal_api_tipax_account_reference",
  },
} as const;

export type PostalApiProviderKey = keyof typeof POSTAL_API_PROVIDERS;

export interface PostalApiSetting {
  providerKey: PostalApiProviderKey;
  baseUrl: string | null;
  accountReference: string | null;
  credentialsConfigured: boolean;
  secretName: string;
  status: "configuration_only";
}

interface QueryResult {
  rows: Array<{ setting_key: string; setting_value: string | null }>;
}

export interface PostalSettingsQuery {
  query(text: string, params?: any[]): Promise<QueryResult>;
}

export class PostalApiSettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostalApiSettingsValidationError";
  }
}

const providers = Object.keys(POSTAL_API_PROVIDERS) as PostalApiProviderKey[];

export function isPostalApiProviderKey(value: string): value is PostalApiProviderKey {
  return Object.prototype.hasOwnProperty.call(POSTAL_API_PROVIDERS, value);
}

function validatePublicHttpsUrl(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048 || value.trim() !== value) {
    throw new PostalApiSettingsValidationError("baseUrl must be an HTTPS URL with a public host.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PostalApiSettingsValidationError("baseUrl must be an HTTPS URL with a public host.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const isIpAddress = isIP(hostname) !== 0;
  const labels = hostname.split(".");
  const forbiddenSuffixes = [
    ".localhost", ".local", ".internal", ".test", ".invalid", ".example",
    ".home", ".lan", ".corp", ".intranet", ".private", ".onion", ".arpa",
  ];
  const isForbiddenName = hostname === "localhost"
    || forbiddenSuffixes.some((suffix) => hostname.endsWith(suffix));
  const topLevelLabel = labels.at(-1) ?? "";
  const hasValidDnsLabels = labels.length >= 2
    && (/^[a-z]{2,63}$/i.test(topLevelLabel) || /^xn--[a-z0-9-]{2,59}$/i.test(topLevelLabel))
    && labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));

  if (
    url.protocol !== "https:"
    || !hostname
    || url.username
    || url.password
    || url.search
    || url.hash
    || isIpAddress
    || isForbiddenName
    || !hasValidDnsLabels
  ) {
    throw new PostalApiSettingsValidationError("baseUrl must be an HTTPS URL with a public host.");
  }

  return url.toString().replace(/\/$/, "");
}

function validateAccountReference(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (
    typeof value !== "string"
    || value.trim() !== value
    || value.length > 128
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new PostalApiSettingsValidationError(
      "accountReference must be a plain string of at most 128 characters.",
    );
  }
  return value;
}

export function validatePostalApiSettingsUpdate(body: unknown): {
  baseUrl?: string | null;
  accountReference?: string | null;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new PostalApiSettingsValidationError("Request body must be an object.");
  }
  const input = body as Record<string, unknown>;
  const allowedKeys = new Set(["baseUrl", "accountReference"]);
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
    throw new PostalApiSettingsValidationError("Only baseUrl and accountReference may be updated.");
  }
  if (!Object.keys(input).length) {
    throw new PostalApiSettingsValidationError("At least one setting must be provided.");
  }

  const baseUrl = input.baseUrl === undefined ? undefined : validatePublicHttpsUrl(input.baseUrl);
  const accountReference = validateAccountReference(input.accountReference);
  return {
    ...(baseUrl !== undefined ? { baseUrl } : {}),
    ...(accountReference !== undefined ? { accountReference } : {}),
  };
}

function configuredSecret(secretName: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return typeof env[secretName] === "string" && env[secretName]!.trim().length > 0;
}

export async function getPostalApiSettings(
  queryable: PostalSettingsQuery,
  env: NodeJS.ProcessEnv = process.env,
): Promise<PostalApiSetting[]> {
  const settingKeys = providers.flatMap((providerKey) => {
    const provider = POSTAL_API_PROVIDERS[providerKey];
    return [provider.baseUrlKey, provider.accountReferenceKey];
  });
  const result = await queryable.query(
    `SELECT setting_key, setting_value
     FROM shop_settings
     WHERE category = $1 AND setting_key = ANY($2::text[])`,
    [POSTAL_API_SETTING_CATEGORY, settingKeys],
  );
  const values = new Map(result.rows.map((row) => [row.setting_key, row.setting_value]));

  return providers.map((providerKey) => {
    const provider = POSTAL_API_PROVIDERS[providerKey];
    return {
      providerKey,
      baseUrl: values.get(provider.baseUrlKey) ?? null,
      accountReference: values.get(provider.accountReferenceKey) ?? null,
      credentialsConfigured: configuredSecret(provider.secretName, env),
      secretName: provider.secretName,
      status: "configuration_only",
    };
  });
}

export async function updatePostalApiSettings(
  queryable: PostalSettingsQuery,
  providerKey: string,
  body: unknown,
  env: NodeJS.ProcessEnv = process.env,
): Promise<PostalApiSetting> {
  if (!isPostalApiProviderKey(providerKey)) {
    throw new PostalApiSettingsValidationError("Unsupported postal provider.");
  }
  const update = validatePostalApiSettingsUpdate(body);
  const provider = POSTAL_API_PROVIDERS[providerKey];

  const settings = [
    ...(update.baseUrl !== undefined
      ? [[provider.baseUrlKey, update.baseUrl, "Base URL"] as const]
      : []),
    ...(update.accountReference !== undefined
      ? [[provider.accountReferenceKey, update.accountReference, "Account Reference"] as const]
      : []),
  ];

  for (const [settingKey, settingValue, label] of settings) {
    await queryable.query(
      `INSERT INTO shop_settings (
        setting_key, setting_value, setting_type, display_name, category, is_public, updated_at
      ) VALUES ($1, $2, 'text', $3, $4, false, NOW())
      ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        category = EXCLUDED.category,
        is_public = false,
        updated_at = NOW()`,
      [settingKey, settingValue ?? "", `${providerKey} ${label}`, POSTAL_API_SETTING_CATEGORY],
    );
  }

  const allSettings = await getPostalApiSettings(queryable, env);
  return allSettings.find((setting) => setting.providerKey === providerKey)!;
}