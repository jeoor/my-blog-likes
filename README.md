# WorkerDemo（点赞计数：Cloudflare Worker + KV）

一个“就一份 JS 文件”的点赞计数后端，给本仓库的 LikeButton 用。

接口：

- `GET /api/:key` → `{ value }`
- `POST /api/:key` → `{ value }`（计数 +1）

说明：前端会把文章 canonical URL 做 base64url 编码当作 `:key`。

## 文件

- `index.js` Worker 源码（单文件）
- `wrangler.toml` wrangler 部署配置（需要填 KV id）
- `package.json` 仅用于运行 `wrangler`（可选）

## 三步开始使用（手动部署）

### 1) 创建 Worker

Cloudflare Dashboard → Workers & Pages → Create Worker，新建一个 Worker。

把 [index.js](index.js) 的内容粘贴进去并保存。

### 2) 创建并绑定 KV

在 Cloudflare Dashboard 创建一个 KV Namespace，名字随意。

然后在该 Worker 的 Settings → Bindings 里绑定 KV：

- Binding name：`LIKES`
- KV namespace：选择你刚创建的

### 3)（推荐）配置 CORS 白名单

为了避免别的网站盗刷你的点赞接口，建议在 Worker 的 Settings → Variables 添加：

- `ALLOW_ORIGINS` = `https://你的域名,http://localhost:4321`

不设置 `ALLOW_ORIGINS` 时，会允许任意来源（`Access-Control-Allow-Origin: *`），开发方便但不建议长期生产使用。

## 使用 wrangler（可选，本地调试/部署）

```bash
cd WorkerDemo
npm i
```

创建 KV：

```bash
npx wrangler kv:namespace create "LIKES"
```

把输出的 `id` 填入 [wrangler.toml](wrangler.toml)：

```toml
[[kv_namespaces]]
binding = "LIKES"
id = "REPLACE_WITH_YOUR_KV_NAMESPACE_ID"
```

本地调试：

```bash
npm run dev
```

部署：

```bash
npm run deploy
```

## 接入 Astro 站点

在站点的 `src/site.config.ts` 配置：

```ts
likes: {
  endpoint: 'https://你的-worker.workers.dev',
  dailyLimit: 5,
},
```

## 已知限制（KV）

KV 不是原子自增；高并发同一 key 的 `POST` 可能丢增量。个人博客通常够用；想严格准确建议改 Durable Objects。
