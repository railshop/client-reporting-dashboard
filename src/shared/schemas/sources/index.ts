import { ga4SectionSchema } from './ga4';
import { gscSectionSchema } from './gsc';
import { googleAdsSectionSchema } from './google-ads';
import { metaSectionSchema } from './meta';
import { lsaSectionSchema } from './lsa';
import { servicetitanSectionSchema } from './servicetitan';
import { gbpSectionSchema } from './gbp';

export const sectionSchemaMap = {
  ga4: ga4SectionSchema,
  gsc: gscSectionSchema,
  google_ads: googleAdsSectionSchema,
  meta: metaSectionSchema,
  lsa: lsaSectionSchema,
  servicetitan: servicetitanSectionSchema,
  gbp: gbpSectionSchema,
} as const;

export type SourceType = keyof typeof sectionSchemaMap;

export const SOURCE_LABELS: Record<SourceType, string> = {
  ga4: 'Website',
  gsc: 'SEO',
  google_ads: 'Google Ads',
  meta: 'Meta',
  lsa: 'LSA',
  servicetitan: 'ServiceTitan',
  gbp: 'Google Business',
};

export {
  ga4SectionSchema,
  gscSectionSchema,
  googleAdsSectionSchema,
  metaSectionSchema,
  lsaSectionSchema,
  servicetitanSectionSchema,
  gbpSectionSchema,
};
