/**
 * 单文件 Cloudflare Worker：点赞计数（KV）
 *
 * 路由：
 * - GET  /api/:key  -> { value }
 * - POST /api/:key  -> { value } (计数 +1)
 *
 * 环境绑定：
 * - env.LIKES: KVNamespace
 * - env.ALLOW_ORIGINS?: string (可选，逗号分隔白名单)
 */

function json(body, init = {}) {
    return new Response(JSON.stringify(body), {
        ...init,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            ...(init.headers || {}),
        },
    });
}

function corsHeaders(origin, env) {
    const allowList = String(env.ALLOW_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const allowOrigin =
        allowList.length === 0 ? '*' : origin && allowList.includes(origin) ? origin : allowList[0];

    return {
        'access-control-allow-origin': allowOrigin,
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '86400',
    };
}

function isValidKey(key) {
    // 前端使用 base64url(canonicalUrl) 后只会包含 A-Z a-z 0-9 _ -
    return /^[A-Za-z0-9_-]{1,512}$/.test(key);
}

async function getValue(env, key) {
    const raw = await env.LIKES.get(key);
    const num = raw ? Number(raw) : 0;
    return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin');
        const cors = corsHeaders(origin, env);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }

        const match = url.pathname.match(/^\/api\/([^/]+)$/);
        if (!match) {
            return json({ error: 'Not Found' }, { status: 404, headers: cors });
        }

        const key = match[1];
        if (!isValidKey(key)) {
            return json({ error: 'Invalid key' }, { status: 400, headers: cors });
        }

        if (request.method === 'GET') {
            const value = await getValue(env, key);
            return json({ value }, { status: 200, headers: cors });
        }

        if (request.method === 'POST') {
            // 注意：KV 不是原子自增。高并发下可能丢增量（通常个人博客可接受）。
            const current = await getValue(env, key);
            const next = current + 1;
            await env.LIKES.put(key, String(next));
            return json({ value: next }, { status: 200, headers: cors });
        }

        return json({ error: 'Method Not Allowed' }, { status: 405, headers: cors });
    },
};
