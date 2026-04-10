import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createServer } from 'http';
import { exec } from 'child_process';

const PORT = 3800;
const __dirname = process.cwd();

// 운영체제별 브라우저 오픈 명령어
function openBrowser(url) {
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${start} ${url}`);
}

// HTML UI Template
const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Omni Ecosystem Setup</title>
    <style>
        :root { --primary: #2563eb; --bg: #f8fafc; --card: #ffffff; --text: #1e293b; --border: #e2e8f0; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: var(--card); padding: 2.5rem; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); width: 100%; max-width: 500px; border: 1px solid var(--border); }
        h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #0f172a; }
        p { font-size: 0.875rem; color: #64748b; margin-bottom: 2rem; }
        .form-group { margin-bottom: 1.25rem; }
        label { display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.875rem; }
        input, textarea { width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; transition: border-color 0.2s; }
        input:focus, textarea:focus { outline: none; border-color: var(--primary); }
        textarea { height: 120px; font-family: monospace; font-size: 0.8rem; resize: vertical; }
        button { width: 100%; padding: 0.875rem; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background 0.2s; margin-top: 1.5rem; }
        button:hover { background: #1d4ed8; }
        .help { font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem; }
        .help a { color: var(--primary); text-decoration: none; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Omni Ecosystem Setup</h1>
        <p>프로젝트 실행에 필요한 필수 정보를 입력해주세요.</p>
        <form action="/setup" method="POST">
            <div class="form-group">
                <label>Discord Bot Token</label>
                <input type="password" name="DISCORD_TOKEN" required placeholder="예: MTIzNDU2...">
                <div class="help"><a href="https://discord.com/developers/applications" target="_blank">Discord Developer Portal</a>에서 생성된 봇 토큰입니다.</div>
            </div>
            <div class="form-group">
                <label>Discord Client ID</label>
                <input type="text" name="CLIENT_ID" required placeholder="예: 123456789...">
            </div>
            <div class="form-group">
                <label>Firebase SDK Configuration (JSON)</label>
                <textarea name="FIREBASE_CONFIG" required placeholder='const firebaseConfig = { \n  apiKey: "...", \n  ...\n};'></textarea>
                <div class="help">Firebase Console의 "앱 설정"에서 제공하는 config 객체를 통째로 붙여넣으세요.</div>
            </div>
            <button type="submit">저장 및 배포 시작</button>
        </form>
    </div>
</body>
</html>
`;

const server = createServer((req, res) => {
    if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
    } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const config = Object.fromEntries(params.entries());

            // Firebase Config 파싱 (느슨한 파싱 시도)
            let fb = {};
            try {
                const configText = config.FIREBASE_CONFIG;
                const match = configText.match(/{[\s\S]*}/);
                if (match) {
                    const jsonish = match[0]
                        .replace(/(\w+):/g, '"$1":') // 키에 따옴표 추가
                        .replace(/'/g, '"') // 작은따옴표를 큰따옴표로 변경
                        .replace(/,(\s*[}\]])/g, '$1'); // 마지막 쉼표 제거
                    fb = JSON.parse(jsonish);
                }
            } catch (e) {
                console.error('Firebase Config 파싱 실패:', e);
            }

            // 1. omni-bot/.env 생성
            const botEnv = `DISCORD_TOKEN=${config.DISCORD_TOKEN}\nCLIENT_ID=${config.CLIENT_ID}\nFIREBASE_PROJECT_ID=${fb.projectId || ""}\n`;
            writeFileSync(join(__dirname, 'omni-bot', '.env'), botEnv);

            // 2. omni-dashboard/.env 생성
            const dashEnv = `VITE_FIREBASE_API_KEY=${fb.apiKey || ""}\nVITE_FIREBASE_AUTH_DOMAIN=${fb.authDomain || ""}\nVITE_FIREBASE_PROJECT_ID=${fb.projectId || ""}\nVITE_FIREBASE_STORAGE_BUCKET=${fb.storageBucket || ""}\nVITE_FIREBASE_MESSAGING_SENDER_ID=${fb.messagingSenderId || ""}\nVITE_FIREBASE_APP_ID=${fb.appId || ""}\n`;
            writeFileSync(join(__dirname, 'omni-dashboard', '.env'), dashEnv);

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>✅ Configuration saved successfully!</h1><p>The deployment will now continue in your terminal. You may close this window.</p>');
            
            console.log('✅ 설정 파일 생성 완료. 배포 프로세스를 재개합니다...');
            process.exit(0);
        });
    }
});

server.listen(PORT, () => {
    console.log(`🚀 설정 마법사가 http://localhost:${PORT} 에서 실행 중입니다.`);
    openBrowser(`http://localhost:${PORT}`);
});
