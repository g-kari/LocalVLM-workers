// Cloudflare Pages Functions: API Proxy
// 外部VLMサーバーへのプロキシ（CORS処理）

interface Env {
  VLM_API_URL?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiUrl = context.env.VLM_API_URL;
  if (!apiUrl) {
    return new Response(
      JSON.stringify({ error: 'VLM_API_URL が設定されていません' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  const body = await context.request.text();
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      ...CORS_HEADERS,
    },
  });
};
