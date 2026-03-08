import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import { getDecryptedCredentials } from './_shared/data-pull-utils';
import type { SourceType } from '../../src/shared/schemas/credentials';
import type { FilterOption } from '../../src/shared/schemas/filters';
import type { Context } from '@netlify/functions';

const META_API_VERSION = 'v21.0';
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

async function discoverMetaCampaigns(credentials: Record<string, string>): Promise<FilterOption[]> {
  const { access_token, ad_account_id } = credentials;
  const acctId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;

  const res = await fetch(
    `${META_BASE}/${acctId}/campaigns?fields=id,name,status&limit=200`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Meta API error: ${res.status}`);
  }
  const data = await res.json();

  return (data.data || []).map((c: any) => ({
    filter_type: 'campaign',
    filter_value: c.id,
    label: `${c.name} (${c.status})`,
  }));
}

async function discoverGoogleAdsCampaigns(credentials: Record<string, string>): Promise<FilterOption[]> {
  const { GoogleAdsApi } = await import('google-ads-api');
  const { client_id, client_secret, developer_token, refresh_token, customer_id, manager_account_id } = credentials;

  const client = new GoogleAdsApi({
    client_id,
    client_secret,
    developer_token,
  });

  const customer = client.Customer({
    customer_id: customer_id.replace(/-/g, ''),
    login_customer_id: manager_account_id.replace(/-/g, ''),
    refresh_token,
  });

  const rows = await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status
    FROM campaign
    ORDER BY campaign.name
  `);

  return rows.map((r: any) => ({
    filter_type: 'campaign',
    filter_value: String(r.campaign.id),
    label: `${r.campaign.name} (${r.campaign.status})`,
  }));
}

async function discoverServiceTitanCampaigns(credentials: Record<string, string>): Promise<FilterOption[]> {
  const { api_key, tenant_id, client_id, client_secret } = credentials;
  const ST_BASE = 'https://api.servicetitan.io';

  // Get access token
  const tokenRes = await fetch(`${ST_BASE}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id,
      client_secret,
    }),
  });
  if (!tokenRes.ok) throw new Error('Failed to get ServiceTitan access token');
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Fetch campaigns
  const res = await fetch(
    `${ST_BASE}/marketing/v2/tenant/${tenant_id}/campaigns?pageSize=200`,
    {
      headers: {
        Authorization: accessToken,
        'ST-App-Key': api_key,
      },
    }
  );
  if (!res.ok) throw new Error(`ServiceTitan API error: ${res.status}`);
  const data = await res.json();

  return (data.data || []).map((c: any) => ({
    filter_type: 'campaign',
    filter_value: String(c.id),
    label: c.name || `Campaign ${c.id}`,
  }));
}

async function discoverLSACampaigns(credentials: Record<string, string>): Promise<FilterOption[]> {
  const { GoogleAdsApi } = await import('google-ads-api');
  const { client_id, client_secret, developer_token, refresh_token, customer_id, manager_account_id } = credentials;

  const client = new GoogleAdsApi({
    client_id,
    client_secret,
    developer_token,
  });

  const customer = client.Customer({
    customer_id: customer_id.replace(/-/g, ''),
    login_customer_id: manager_account_id.replace(/-/g, ''),
    refresh_token,
  });

  const rows = await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status
    FROM campaign
    WHERE campaign.advertising_channel_type = 'LOCAL_SERVICES'
    ORDER BY campaign.name
  `);

  return rows.map((r: any) => ({
    filter_type: 'campaign',
    filter_value: String(r.campaign.id),
    label: `${r.campaign.name} (${r.campaign.status})`,
  }));
}

const discoverFunctions: Partial<Record<SourceType, (creds: Record<string, string>) => Promise<FilterOption[]>>> = {
  meta: discoverMetaCampaigns,
  google_ads: discoverGoogleAdsCampaigns,
  servicetitan: discoverServiceTitanCampaigns,
  lsa: discoverLSACampaigns,
};

export default async (request: Request, _context: Context) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const token = getTokenFromHeaders(
    Object.fromEntries(request.headers.entries())
  );
  if (!token) return unauthorized();

  const payload = verifyToken(token);
  if (!payload) return unauthorized('Invalid or expired token');
  if (payload.role !== 'admin') return forbidden();

  const body = await request.json();
  const { clientSlug, source } = body as { clientSlug: string; source: SourceType };

  if (!clientSlug || !source) {
    return jsonResponse({ error: 'clientSlug and source are required' }, 400);
  }

  const discoverFn = discoverFunctions[source];
  if (!discoverFn) {
    return jsonResponse({ error: `Source "${source}" does not support filter discovery` }, 400);
  }

  // LSA uses Google Ads credentials
  const credSource = source === 'lsa' ? 'google_ads' : source;
  const creds = await getDecryptedCredentials(clientSlug, credSource as SourceType);
  if (!creds) {
    const hint = source === 'lsa' ? 'Google Ads credentials required for LSA' : 'No credentials configured for this source';
    return jsonResponse({ error: hint }, 400);
  }

  try {
    const options = await discoverFn(creds);

    // Also fetch the data_source_id for the frontend to use with upsert
    const ds = await sql`
      SELECT cds.id FROM client_data_sources cds
      JOIN clients c ON cds.client_id = c.id
      WHERE c.slug = ${clientSlug} AND cds.source = ${source}
    `;

    return jsonResponse({
      dataSourceId: ds[0]?.id || null,
      options,
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Discovery failed' }, 500);
  }
};
