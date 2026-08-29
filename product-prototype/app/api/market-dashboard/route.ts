import {
  MARKET_REGIONS,
  type MarketDashboardResponse,
} from '../../components/home-globe-data';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get('days') ?? '30');
  const days = Number.isInteger(requestedDays) && requestedDays >= 7 && requestedDays <= 365
    ? requestedDays
    : 30;

  const payload: MarketDashboardResponse = {
    generatedAt: new Date().toISOString(),
    windowLabel: `最近 ${days} 天`,
    source: {
      databaseStatus: 'connected',
      system: 'D1',
      businessDataStatus: 'needs_configuration',
      metricsEligible: false,
      classification: 'production_connectors_required',
      classificationScope: 'database',
      disclosure: '当前工作副本没有可验证的生产经营数据连接。接口已建立，Meta、Google Ads 与 ERP/CRM 完成授权后才会展示真实指标。',
      lastVerifiedAt: null,
      activeBusinessConnections: 0,
      requiredProviders: ['Meta', 'Google Ads', 'ERP / CRM'],
    },
    definitions: {
      exposure: '广告平台在所选时间范围内返回的已验证曝光量。',
      validInquiries: '通过企业有效性与联系方式校验的新增询盘。',
      activeLeads: '当前仍在推进且最近 30 天存在跟进记录的商机。',
      cumulativeDeals: '已成交订单的不含税人民币累计金额。',
    },
    markets: MARKET_REGIONS.map((market) => ({
      marketId: market.id,
      exposure: null,
      validInquiries: null,
      activeLeads: null,
      cumulativeDealsCny: null,
      dealCount: null,
      matchedSourceMarkets: [],
    })),
    unmatchedSourceMarkets: [],
  };

  return Response.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
