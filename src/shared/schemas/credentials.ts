import { z } from 'zod';

// Credential schemas per source type
export const ga4CredentialsSchema = z.object({
  service_account_json: z.string().min(1),
  property_id: z.string().min(1),
});

export const gscCredentialsSchema = z.object({
  service_account_json: z.string().min(1),
  site_url: z.string().min(1),
});

export const googleAdsCredentialsSchema = z.object({
  developer_token: z.string().min(1),
  refresh_token: z.string().min(1),
  customer_id: z.string().min(1),
  manager_account_id: z.string().min(1),
});

export const metaCredentialsSchema = z.object({
  access_token: z.string().min(1),
  ad_account_id: z.string().min(1),
});

export const lsaCredentialsSchema = z.object({});

export const servicetitanCredentialsSchema = z.object({
  api_key: z.string().min(1),
  tenant_id: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

export const gbpCredentialsSchema = z.object({
  service_account_json: z.string().min(1),
  account_id: z.string().min(1),
  location_id: z.string().min(1),
});

export const credentialSchemaMap = {
  ga4: ga4CredentialsSchema,
  gsc: gscCredentialsSchema,
  google_ads: googleAdsCredentialsSchema,
  meta: metaCredentialsSchema,
  lsa: lsaCredentialsSchema,
  servicetitan: servicetitanCredentialsSchema,
  gbp: gbpCredentialsSchema,
} as const;

export type SourceType = keyof typeof credentialSchemaMap;

// Describes each field: whether it's a secret (masked in UI) or a display identifier
interface FieldDef {
  label: string;
  secret: boolean;
  multiline?: boolean;
}

export const CREDENTIAL_FIELDS: Record<SourceType, Record<string, FieldDef>> = {
  ga4: {
    service_account_json: { label: 'Service Account JSON', secret: true, multiline: true },
    property_id: { label: 'Property ID', secret: false },
  },
  gsc: {
    service_account_json: { label: 'Service Account JSON', secret: true, multiline: true },
    site_url: { label: 'Site URL', secret: false },
  },
  google_ads: {
    developer_token: { label: 'Developer Token', secret: true },
    refresh_token: { label: 'Refresh Token', secret: true },
    customer_id: { label: 'Customer ID', secret: false },
    manager_account_id: { label: 'Manager Account ID', secret: false },
  },
  meta: {
    access_token: { label: 'Access Token', secret: true },
    ad_account_id: { label: 'Ad Account ID', secret: false },
  },
  lsa: {},
  servicetitan: {
    api_key: { label: 'API Key', secret: true },
    tenant_id: { label: 'Tenant ID', secret: false },
    client_id: { label: 'Client ID', secret: false },
    client_secret: { label: 'Client Secret', secret: true },
  },
  gbp: {
    service_account_json: { label: 'Service Account JSON', secret: true, multiline: true },
    account_id: { label: 'Account ID', secret: false },
    location_id: { label: 'Location ID', secret: false },
  },
};
