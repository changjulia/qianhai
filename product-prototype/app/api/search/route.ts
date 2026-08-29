const JSON_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? url.searchParams.get('query') ?? '').trim().slice(0, 300);

  return Response.json({
    ok: false,
    supported: false,
    status: 'unsupported',
    mode: 'seeded_data',
    error: 'search_not_implemented',
    query,
    results: [],
    networkAttempted: false,
    capabilities: {
      serverIndex: false,
      remoteSearch: false,
      seededDataOnly: true,
    },
    message: '服务端搜索尚未实现；当前界面如展示搜索结果，仅可使用已加载的种子数据，未执行联网检索。',
  }, { status: 501, headers: JSON_HEADERS });
}
