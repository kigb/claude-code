const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = process.env.PORT || 8080;

// 基本的中间件
app.use(express.json());
app.use(express.text());

// 记录请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 根路径
app.get('/', (req, res) => {
  res.html(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Claude Code Server</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
            textarea { width: 100%; height: 200px; margin: 10px 0; }
            button { padding: 10px 20px; background: #007cba; color: white; border: none; cursor: pointer; }
            button:hover { background: #005a8a; }
            .output { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .loading { color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Claude Code Server</h1>
            <p>这是一个运行在 Cloud Run 上的 Claude Code 服务器</p>
            
            <div>
                <h3>发送命令给 Claude Code:</h3>
                <textarea id="prompt" placeholder="输入你的问题或命令..."></textarea>
                <button onclick="sendCommand()">发送</button>
            </div>
            
            <div>
                <h3>响应:</h3>
                <div id="output" class="output">等待命令...</div>
            </div>
        </div>

        <script>
            async function sendCommand() {
                const prompt = document.getElementById('prompt').value;
                const output = document.getElementById('output');
                
                if (!prompt.trim()) {
                    output.innerHTML = '<span style="color: red;">请输入一个问题或命令</span>';
                    return;
                }
                
                output.innerHTML = '<span class="loading">正在处理...</span>';
                
                try {
                    const response = await fetch('/api/claude', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ prompt: prompt })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        output.innerHTML = '<pre>' + result.output + '</pre>';
                    } else {
                        output.innerHTML = '<span style="color: red;">错误: ' + result.error + '</span>';
                    }
                } catch (error) {
                    output.innerHTML = '<span style="color: red;">请求失败: ' + error.message + '</span>';
                }
            }
            
            // 允许按 Enter 键提交
            document.getElementById('prompt').addEventListener('keydown', function(event) {
                if (event.key === 'Enter' && event.ctrlKey) {
                    sendCommand();
                }
            });
        </script>
    </body>
    </html>
  `);
});

// API 端点用于执行 claude 命令
app.post('/api/claude', (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ success: false, error: '缺少 prompt 参数' });
  }

  console.log(`执行 Claude 命令: ${prompt.substring(0, 100)}...`);

  // 检查是否有必要的环境变量
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ 
      success: false, 
      error: '未配置 ANTHROPIC_API_KEY 环境变量' 
    });
  }

  // 执行 claude 命令
  const claudeProcess = spawn('claude', ['--print', prompt], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { 
      ...process.env, 
      CLAUDE_CONFIG_DIR: '/root/.claude',
      HOME: '/root'
    }
  });

  let output = '';
  let error = '';
  let isTimedOut = false;

  claudeProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  claudeProcess.stderr.on('data', (data) => {
    error += data.toString();
  });

  claudeProcess.on('close', (code) => {
    if (isTimedOut) return; // 防止超时后的重复响应
    
    if (code === 0) {
      console.log('Claude 命令执行成功');
      res.json({ success: true, output: output });
    } else {
      console.error('Claude 命令执行失败:', error);
      res.json({ success: false, error: error || '命令执行失败' });
    }
  });

  claudeProcess.on('error', (err) => {
    if (isTimedOut) return;
    console.error('Claude 进程错误:', err);
    res.json({ success: false, error: `进程错误: ${err.message}` });
  });

  // 超时处理
  const timeout = setTimeout(() => {
    isTimedOut = true;
    claudeProcess.kill('SIGTERM');
    res.json({ success: false, error: '命令执行超时 (30秒)' });
  }, 30000); // 30秒超时

  // 清理超时定时器
  claudeProcess.on('close', () => {
    clearTimeout(timeout);
  });
});

// 简单的 WebSocket 支持（可选）
app.get('/ws', (req, res) => {
  res.json({ message: 'WebSocket 支持可以在这里实现' });
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
  console.log(`Claude Code Server 运行在端口 ${port}`);
  console.log(`访问 http://localhost:${port} 来使用 Web 界面`);
});

// 修复 res.html 方法
app.response.html = function(html) {
  this.setHeader('Content-Type', 'text/html');
  this.send(html);
}; 