export type MarketRegionId = 'southeast-asia' | 'middle-east' | 'europe' | 'north-america' | 'latin-america';

export type MarketRegion = {
  id: MarketRegionId;
  nameZh: string;
  nameEn: string;
  countriesZh: string;
  countryNames: string[];
  sourceAliases: string[];
  lat: number;
  lng: number;
};

export type MarketSnapshot = {
  marketId: MarketRegionId;
  exposure: number | null;
  validInquiries: number | null;
  activeLeads: number | null;
  cumulativeDealsCny: number | null;
  dealCount: number | null;
  matchedSourceMarkets: string[];
};

export type MarketDashboardResponse = {
  generatedAt: string;
  windowLabel: string;
  source: {
    databaseStatus: 'connected';
    system: 'D1';
    businessDataStatus: 'verified' | 'needs_configuration' | 'mixed_unverified' | 'unverified';
    metricsEligible: boolean;
    classification: string;
    classificationScope: 'database';
    disclosure: string;
    lastVerifiedAt: string | null;
    activeBusinessConnections: number;
    requiredProviders: string[];
  };
  definitions: {
    exposure: string;
    validInquiries: string;
    activeLeads: string;
    cumulativeDeals: string;
  };
  markets: MarketSnapshot[];
  unmatchedSourceMarkets: string[];
};

export type GlobeFeature = {
  type: 'Feature';
  id?: string;
  properties: {
    name: string;
    [key: string]: unknown;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: unknown;
  };
};

export const GUIZHOU_ORIGIN = {
  lat: 26.647,
  lng: 106.63,
  label: '贵州',
} as const;

/**
 * Geographic and source-name mapping only. Business metrics are always loaded
 * from /api/market-dashboard and must never be hard-coded in this module.
 */
export const MARKET_REGIONS: MarketRegion[] = [
  {
    id: 'southeast-asia',
    nameZh: '东南亚市场',
    nameEn: 'SOUTHEAST ASIA',
    countriesZh: '马来西亚 · 新加坡 · 泰国 · 印尼等',
    countryNames: [
      'Malaysia', 'Singapore', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines',
      'Brunei', 'Cambodia', 'Laos', 'Myanmar', 'East Timor',
    ],
    sourceAliases: [
      '东南亚', '东南亚市场', '马来西亚', 'Malaysia', 'MY', '新加坡', 'Singapore', 'SG',
      '泰国', 'Thailand', 'TH', '印度尼西亚', '印尼', 'Indonesia', 'ID', '越南', 'Vietnam',
      '菲律宾', 'Philippines', 'PH',
    ],
    lat: 10,
    lng: 108,
  },
  {
    id: 'middle-east',
    nameZh: '中东市场',
    nameEn: 'MIDDLE EAST',
    countriesZh: '阿联酋 · 沙特 · 卡塔尔 · 科威特等',
    countryNames: [
      'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman',
      'Jordan', 'Israel', 'Lebanon', 'Iraq', 'Yemen',
    ],
    sourceAliases: [
      '中东', '中东市场', '阿联酋', 'United Arab Emirates', 'UAE', 'AE', '沙特', '沙特阿拉伯',
      'Saudi Arabia', 'SA', '卡塔尔', 'Qatar', 'QA', '科威特', 'Kuwait', 'KW', '阿曼', 'Oman', 'OM',
    ],
    lat: 25,
    lng: 48,
  },
  {
    id: 'europe',
    nameZh: '欧洲市场',
    nameEn: 'EUROPE',
    countriesZh: '德国 · 法国 · 荷兰 · 西班牙等',
    countryNames: ['Germany', 'France', 'Netherlands', 'Spain', 'Italy', 'England', 'Belgium', 'Poland'],
    sourceAliases: [
      '欧洲', '欧洲市场', '德国', 'Germany', 'DE', '法国', 'France', 'FR', '荷兰', 'Netherlands', 'NL',
      '西班牙', 'Spain', 'ES', '意大利', 'Italy', 'IT', '英国', 'England', 'United Kingdom', 'UK', 'GB',
    ],
    lat: 51,
    lng: 12,
  },
  {
    id: 'north-america',
    nameZh: '北美市场',
    nameEn: 'NORTH AMERICA',
    countriesZh: '美国 · 加拿大',
    countryNames: ['USA', 'Canada'],
    sourceAliases: [
      '北美', '北美市场', '美国', '美利坚合众国', 'USA', 'United States', 'US',
      '加拿大', 'Canada', 'CA',
    ],
    lat: 47,
    lng: -104,
  },
  {
    id: 'latin-america',
    nameZh: '拉丁美洲市场',
    nameEn: 'LATIN AMERICA',
    countriesZh: '巴西 · 墨西哥 · 智利 · 哥伦比亚等',
    countryNames: ['Brazil', 'Mexico', 'Chile', 'Colombia', 'Argentina', 'Peru', 'Ecuador', 'Uruguay'],
    sourceAliases: [
      '拉丁美洲', '拉美', '拉丁美洲市场', '巴西', 'Brazil', 'BR', '墨西哥', 'Mexico', 'MX',
      '智利', 'Chile', 'CL', '哥伦比亚', 'Colombia', 'CO', '阿根廷', 'Argentina', 'AR',
    ],
    lat: -12,
    lng: -65,
  },
];

export const MARKET_BY_ID = new Map(
  MARKET_REGIONS.map((market) => [market.id, market]),
);

const MARKET_BY_COUNTRY = new Map(
  MARKET_REGIONS.flatMap((market) => market.countryNames.map((countryName) => [countryName, market] as const)),
);

const MARKET_BY_SOURCE_ALIAS = new Map(
  MARKET_REGIONS.flatMap((market) => (
    [...new Set([...market.sourceAliases, ...market.countryNames])]
      .map((alias) => [alias.toLocaleLowerCase(), market] as const)
  )),
);

export function marketForCountry(countryName: string) {
  return MARKET_BY_COUNTRY.get(countryName) ?? null;
}

export function marketForSourceValue(value: string) {
  return MARKET_BY_SOURCE_ALIAS.get(value.trim().toLocaleLowerCase()) ?? null;
}

export function isGlobeFeature(value: unknown): value is GlobeFeature {
  if (!value || typeof value !== 'object') return false;

  const feature = value as Partial<GlobeFeature>;
  const geometryType = feature.geometry?.type;
  return feature.type === 'Feature'
    && typeof feature.properties?.name === 'string'
    && (geometryType === 'Polygon' || geometryType === 'MultiPolygon')
    && Array.isArray(feature.geometry?.coordinates);
}
