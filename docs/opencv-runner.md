# OpenCV 教程运行器

这套运行器为公开文章中的匿名练习提供受限的 C++17/Python OpenCV 执行环境。它不保存代码，不接受图片上传，也不是通用在线 IDE。

## 当前发布状态

OpenCV 教程和在线练习已部署到阿里云轻量应用服务器。`aliouswe.com/api/opencv` 由 Nginx 同源代理到私有容器网络中的 runner；生产 Docker runtime 配置为 gVisor `runsc`。本次发布通过 `/healthz/opencv` readiness 检查，并通过线上 Python 与 C++ 示例任务验证，两个任务都返回了处理后的 PNG。

赛场教学图的原图保存在 `src/assets/media/images/opencv/armor-field.jpg`，由 `npm run lock:opencv-asset` 锁定 1280×768 WebP 变体的哈希。部署使用独立 SSH 密钥；阿里云 AccessKey 不写入仓库、文章或发布包。

## 本地运行

```bash
docker build -t aliouswe/opencv-runner:4.5.4 opencv-runner
npm run test:docker --prefix opencv-runner
cp opencv-runner/.env.example opencv-runner/.env
# 在 .env 中把 OPENCV_INPUT_IMAGE 指向构建后的固定 WebP。
set -a; source opencv-runner/.env; set +a
npm start --prefix opencv-runner
```

默认使用本地 runner 端口 `8787`。生产环境由 Nginx 通过私有网络同源代理，runner 不直接暴露公网端口。若主机安装了 gVisor，将 `OPENCV_DOCKER_RUNTIME` 设为 `runsc`；否则只能用于本地开发，不能开放匿名执行。

## 安全边界

- 容器以 UID 65532 运行，移除全部 capabilities，禁止提权和网络访问；
- 根文件系统只读，仅单个临时工作目录可写；
- 每任务限制 1 CPU、512 MiB；C++ 教程所需的固定头文件在镜像构建时预编译，编译阶段最多 128 个进程、10 秒，运行阶段最多 32 个进程并限制为 3 秒；终端输出最多 64 KiB；
- 一次匿名会话只能运行一个任务，同一 IP 最多两个并发；
- 十分钟内第 11 次提交开始要求 Turnstile，第 20 次后拒绝；
- 结果和工作目录十分钟后删除。

Docker 默认 runtime 不是足够强的公网恶意代码安全边界。正式开放前必须启用 gVisor `runsc`，完成网络、fork、文件读取、资源耗尽和逃逸回归测试。

## 容量验收

```bash
OPENCV_API_URL=https://staging.example.com \
OPENCV_SITE_URL=https://staging.example.com \
OPENCV_LOAD_TEST_TOKEN='<与服务端相同的随机密钥>' \
npm run loadtest:opencv
```

脚本依次产生 10、20、30 个集中提交，持续探测文章站点，并输出任务成功率、任务 p50/p95 与页面 p95。20 并发下成功率低于 99%、任务 p95 超过 15 秒或页面探测失败时，脚本以失败状态退出。若未达到容量目标，先调整执行槽和资源配置，复验通过后再开放匿名执行。

## 部署与回滚

网站发布流程见仓库根目录 [`AGENTS.md`](../AGENTS.md)。网站发布到阿里云轻量应用服务器；GitHub 仓库只用于 Git 同步，网站和支持服务均不通过 GitHub Pages 或 GitHub Actions 发布。服务器预先配置了 Nginx、Node.js 24、Docker、gVisor、runner 服务账号和本机环境文件。使用本机私有配置提供 SSH 目标与密钥，不要把服务器地址、SSH 账号、端口、密钥路径或云 API 凭据提交到仓库。本地构建包只包含 `dist/` 和 `opencv-runner/`，由服务器安装器原子切换 release、重建 runner 镜像并检查 readiness。

安装器切换或 runner readiness 失败时会自动把站点链接恢复到之前的 release。手动回滚时，把 `/srv/aliouswe/current` 重新指向 `/srv/aliouswe/releases/<release-id>/dist`，然后重启 `opencv-runner` 并 reload Nginx。DNS 已指向阿里云服务器，普通内容发布无需调整 DNS。
