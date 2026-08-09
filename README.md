# Aliouswe’s Nonsense

Aliouswe 的个人博客前端。项目把原 Hexo/NexT 静态站迁移到 Astro，保留原文章、收藏数据、媒体文件和历史文章 URL，并加入一套渐进增强的 2D 物理交互。

## 本地运行

需要 Node.js 24。

```bash
npm ci
npm run dev
```

首次启动会从 `src/assets/media/` 自动生成适合网页的响应式图片。完整校验：

```bash
npm test
npm run build
```

`npm run build` 会依次校验迁移清单、同步 GitHub 头像、压缩图片、检查 Astro/TypeScript、生成静态站点与 Pagefind 搜索索引。

## 内容

- 文章：`src/content/posts/*.mdx`
- Jazz / Anime / Coffee：`src/data/*.json`
- 原始媒体：`src/assets/media/`
- 迁移核对：`src/data/migration-manifest.json`
- 旧站可回滚基线：Git 分支 `legacy-static`

文章的 `date` 是 Markdown 中设置的写作日期，也是页面显示日期；`publishedAt` 只保留发布记录，不用于主日期展示。

## 图片策略

构建脚本会自动纠正 EXIF 方向、移除元数据、限制基线图最长边为 2560px，并按原图尺寸生成最高到 480 / 960 / 1600 / 2560 档位及实际源图宽度的 WebP，以及 960px 以上的 AVIF，不会为小图制造重复的放大版本。页面通过 `srcset`、懒加载和异步解码选择合适版本。生成物位于 `public/media/`，不提交到 Git。

## 可选外部服务

复制 `.env.example` 为 `.env` 后填写：

- Waline：文章底部的站内评论，以文章 ID 稳定映射评论线程；客户端滚动接近评论区时才加载。
- Formspree：联系表单，目标邮箱设为 `alec.timison@gmail.com`。
- Umami Cloud：隐私友好的访问统计。

未填写时，对应功能会明确显示“尚未配置”，不会连接第三方服务。部署时在 GitHub Actions repository variables 中配置同名变量。

Waline 的评论 API 单独部署到 Vercel，使用 Neon PostgreSQL、Resend 邮件和 Cloudflare Turnstile。完整配置见 [`docs/comments.md`](docs/comments.md)。访客无需登录，昵称和邮箱必填，邮箱不公开；新评论和直接回复通过邮件通知。

未配置 Formspree 时，联系页会把填写内容带入本机邮件应用，收件人为 `alec.timison@gmail.com`；配置后则在页面内直接提交并显示成功或失败回执。

## 部署

`.github/workflows/deploy.yml` 在 `main` 分支更新后构建并部署 GitHub Pages。首次部署前，在仓库 Pages 设置中选择 **GitHub Actions** 作为来源，并保持自定义域名 `aliouswe.com` 的 DNS 配置。

当前阶段不包含 3D、About 页面、CMS、PWA、推荐文章或第三方监控。
