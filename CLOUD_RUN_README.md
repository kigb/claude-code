# Claude Code Server - Cloud Run 部署指南

这个项目将 Claude Code 包装为 HTTP 服务器，可以在 Google Cloud Run 上运行。

## 功能特性

- 🌐 Web 界面与 Claude Code 交互
- 🚀 在 Google Cloud Run 上运行
- 🔧 支持通过 HTTP API 调用 Claude Code
- 📋 健康检查端点
- 🔐 需要 ANTHROPIC_API_KEY 环境变量

## 部署步骤

### 1. 准备环境

确保你已经安装了：
- Google Cloud SDK
- Docker (可选，用于本地测试)

### 2. 设置环境变量

在 Cloud Run 中设置以下环境变量：

```bash
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 3. 使用 Cloud Build 自动部署

```bash
# 提交代码到 Git 仓库
gcloud builds submit --config cloudbuild.yaml

# 或者手动构建和部署
gcloud builds submit --tag gcr.io/PROJECT_ID/claude-code .
gcloud run deploy claude-code --image gcr.io/PROJECT_ID/claude-code --region us-central1 --allow-unauthenticated
```

### 4. 手动部署

```bash
# 构建镜像
docker build -f Dockerfile.prod -t gcr.io/PROJECT_ID/claude-code .

# 推送镜像
docker push gcr.io/PROJECT_ID/claude-code

# 部署到 Cloud Run
gcloud run deploy claude-code \
  --image gcr.io/PROJECT_ID/claude-code \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --set-env-vars ANTHROPIC_API_KEY="your-api-key"
```

## 使用方法

### Web 界面

访问你的 Cloud Run 服务 URL，例如：
```
https://claude-code-xyz-uc.a.run.app
```

### API 端点

#### POST /api/claude
发送命令给 Claude Code：

```bash
curl -X POST https://your-service-url.run.app/api/claude \
  -H "Content-Type: application/json" \
  -d '{"prompt": "你好，帮我写一个简单的 Python 函数"}'
```

#### GET /health
健康检查端点：

```bash
curl https://your-service-url.run.app/health
```

## 本地开发

### 开发环境

使用 VSCode Dev Containers：

1. 打开项目文件夹
2. 选择 "Reopen in Container"
3. 容器会自动构建并启动开发环境

### 本地测试

```bash
# 安装依赖
npm install

# 设置环境变量
export ANTHROPIC_API_KEY="your-api-key"

# 启动服务器
npm start
```

访问 `http://localhost:8080` 来使用 Web 界面。

## 环境变量说明

| 变量名 | 说明 | 是否必需 |
|--------|------|----------|
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 | 是 |
| `PORT` | 服务器端口 | 否 (默认 8080) |
| `NODE_ENV` | Node.js 环境 | 否 (默认 production) |
| `CLAUDE_CONFIG_DIR` | Claude 配置目录 | 否 (默认 /root/.claude) |

## 故障排除

### 常见问题

1. **容器无法启动**
   - 检查 `ANTHROPIC_API_KEY` 是否正确设置
   - 查看 Cloud Run 日志获取详细错误信息

2. **API 调用失败**
   - 确保 API 密钥有效
   - 检查网络连接
   - 查看服务器日志

3. **超时错误**
   - 增加 Cloud Run 的超时设置
   - 检查 Claude API 的响应时间

### 查看日志

```bash
gcloud logs read --service=claude-code --limit=50
```

## 配置选项

### Cloud Run 配置

- **内存**: 2GB (可根据需要调整)
- **CPU**: 2 vCPU (可根据需要调整)
- **超时**: 300 秒
- **并发**: 10 个请求
- **实例数**: 0-10 个

### 网络配置

- **端口**: 8080
- **协议**: HTTP/HTTPS
- **认证**: 允许未认证访问 (可根据需要修改)

## 安全注意事项

1. **API 密钥安全**
   - 使用 Google Secret Manager 存储 API 密钥
   - 不要在代码中硬编码密钥

2. **访问控制**
   - 考虑启用 Cloud Run 的身份验证
   - 使用 Cloud IAM 控制访问权限

3. **网络安全**
   - 考虑使用 Cloud Armor 进行 DDoS 保护
   - 配置适当的防火墙规则

## 成本优化

- 使用 Cloud Run 的按需计费
- 设置合理的最小和最大实例数
- 监控资源使用情况
- 考虑使用 Cloud Scheduler 在低峰时段减少实例数

## 监控和日志

- 使用 Cloud Monitoring 监控服务性能
- 设置告警通知
- 定期查看 Cloud Logging 中的日志
- 监控 API 调用频率和错误率 