s# 评论系统部署清单

文章页使用仓库内打包的 Waline 客户端。评论 API 位于 `waline-server/`，计划部署到 Vercel；评论保存在 Neon PostgreSQL，通知邮件通过 Resend SMTP 发送，提交由 Cloudflare Turnstile 验证。

未完成全部配置时，文章页只显示“评论服务尚未完成配置”，不会连接半配置的服务。

## 1. Cloudflare Turnstile

1. 在 Cloudflare Dashboard 创建一个 Turnstile widget。
2. Widget mode 选择 **Managed**。
3. Hostname 添加 `aliouswe.com`；如果 `www.aliouswe.com` 会对外使用，也一并添加。
4. 保存 Site Key 和 Secret Key。Site Key 可以公开，Secret Key 只能放进 Vercel。

## 2. Resend

1. 在 Resend 添加发送域名 `notify.aliouswe.com`。
2. 将 Resend 提供的 SPF、DKIM 等记录原样添加到阿里云 DNS；记录值由 Resend 为当前账号生成，不要复制其他项目的示例值。
3. 验证域名后创建只用于评论通知的 API Key。
4. 发件地址使用 `comments@notify.aliouswe.com`，发件人名称使用 `Aliouswe’s Nonsense`。

Resend SMTP 固定配置：

```text
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_SECURE=true
SMTP_PASS=<Resend API Key>
```

## 3. Vercel 与 Neon

1. 在 Vercel 导入当前 GitHub 仓库。
2. 新项目名称可设为 `aliouswe-comments`，Root Directory 选择 `waline-server`。
3. 在项目的 Storage 中创建 Neon PostgreSQL，并让 Vercel 注入 `POSTGRES_*` 环境变量。
4. 在 Neon SQL Editor 执行 Waline 官方的 [`waline.pgsql`](https://github.com/walinejs/waline/blob/main/assets/waline.pgsql) 建表脚本。
5. 在 Vercel 项目中添加下列环境变量，作用域选择 Production、Preview 和 Development：

```text
SITE_NAME=Aliouswe's Nonsense
SITE_URL=https://aliouswe.com
SERVER_URL=https://comments.aliouswe.com
JWT_TOKEN=<openssl rand -hex 32 的输出>

POSTGRES_SSL=true

TURNSTILE_KEY=<Turnstile Site Key>
TURNSTILE_SECRET=<Turnstile Secret Key>

SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=<Resend API Key>
SMTP_SECURE=true
SENDER_NAME=Aliouswe's Nonsense
SENDER_EMAIL=comments@notify.aliouswe.com
AUTHOR_EMAIL=alec.timison@gmail.com

DISABLE_USERAGENT=true
DISABLE_REGION=true
COMMENT_AUDIT=false
IPQPS=60
AKISMET_KEY=false
AVATAR_PROXY=false
MARKDOWN_TEX=false
```

Neon 应同时提供 `POSTGRES_DATABASE`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_HOST` 和 `POSTGRES_PORT`。服务端缺少数据库、Turnstile 或邮件配置时会拒绝启动。

本项目固定使用 PostgreSQL，并以本地安全桩替代 Waline 中未使用的 CloudBase、LeanCloud 和旧 Akismet 客户端，从生产依赖树中移除这些驱动的已知漏洞。`AKISMET_KEY=false` 是必填项；反垃圾由 Turnstile、IP 限流、重复内容检测和服务端内容规则承担。

6. 在 Vercel 为项目添加自定义域名 `comments.aliouswe.com`。
7. 按 Vercel 当前显示的目标，在阿里云 DNS 添加 `comments` 的 CNAME 记录。通常目标为 `cname.vercel-dns.com`，但应以项目面板给出的值为准。
8. 重新部署并打开 `https://comments.aliouswe.com/ui/register`。第一个注册用户会成为管理员；注册完成后不要开放分享该地址。

## 4. GitHub Pages 构建变量

在博客仓库的 **Settings → Secrets and variables → Actions → Variables** 添加：

```text
PUBLIC_WALINE_SERVER_URL=https://comments.aliouswe.com
PUBLIC_TURNSTILE_SITE_KEY=<Turnstile Site Key>
```

这两个值都是公开的构建变量。不要把 Turnstile Secret、Resend API Key、Neon 密码或 JWT Token 放进 GitHub Pages 的 `PUBLIC_*` 变量。

推送并完成 GitHub Pages 部署后，打开任意文章并滚动到底部。评论区会在进入视口前约 600px 自动载入。

## 5. 验收

- 未滚动到底部时，不应请求 `comments.aliouswe.com`。
- 表单要求昵称和邮箱，网站选填，不显示登录按钮。
- 超过 2,000 字符或包含 Markdown/HTML 图片的评论会被服务端拒绝。
- 新评论立即出现，一级评论按最新优先排列，嵌套回复按时间正序排列。
- 新评论会通知 `alec.timison@gmail.com`；管理员回复后，原评论者收到邮件。
- 评论页面不显示地区、浏览器、操作系统或邮箱。
- 访客头像由昵称生成；管理员使用 `/avatar.webp`。
- Vercel、Neon、Resend 或 Turnstile 故障时，文章正文仍正常显示，并提供邮件联系入口。

## 6. 中国大陆访问说明

当前阶段接受 Vercel 在中国大陆可能出现延迟或不可用。绑定 `comments.aliouswe.com` 能降低 `.vercel.app` 域名本身受限的概率，但不能提供硬性可用性保证。域名完成 ICP 备案后，可把 `waline-server` 迁移到中国内地节点；文章评论键使用稳定文章 ID，迁移服务不会改变评论归属。
