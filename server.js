const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'lmhost_secret_key_change_in_production';
const JWT_EXPIRES = '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 60 * 1000;

// ==================== 简易 JSON 数据库 ====================
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function readDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch (e) {
        return { users: [], sites: [], apikeys: [] };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

if (!fs.existsSync(DB_PATH)) {
    writeDB({ users: [], sites: [], apikeys: [] });
}

// ==================== 语言列表 ====================
let langListCache = null;
let langListCacheTime = 0;
const LANG_CACHE_TTL = 60000;

function getLangList() {
    const now = Date.now();
    if (langListCache && (now - langListCacheTime) < LANG_CACHE_TTL) {
        return langListCache;
    }
    const langDir = path.join(__dirname, 'public', 'lang');
    const list = [{ code: 'zh-CN', name: '简体中文' }];
    if (fs.existsSync(langDir)) {
        const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
            const code = file.replace('.json', '');
            try {
                const content = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf-8'));
                list.push({ code, name: content._langName || code });
            } catch (e) {
                list.push({ code, name: code });
            }
        }
    }
    langListCache = list;
    langListCacheTime = now;
    return list;
}

// ==================== 中间件 ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    message: { error: '请求过于频繁，请稍后再试', code: 429 },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: '请求过于频繁，请稍后再试', code: 429 },
    standardHeaders: true,
    legacyHeaders: false,
});

const deployLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: '请求过于频繁，请稍后再试', code: 429 },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api/user', apiLimiter);
app.use('/api/sites', apiLimiter);
app.use('/api/keys', apiLimiter);
app.use('/api/deploy', deployLimiter);

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未登录，请先登录' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: '令牌无效或已过期，请重新登录' });
    }
}

function apiKeyAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: '缺少 API Key，请在 X-API-Key 头中提供' });
    }
    const db = readDB();
    const keyRecord = db.apikeys.find(k => k.key === apiKey);
    if (!keyRecord) {
        return res.status(401).json({ error: 'API Key 无效' });
    }
    req.user = { userId: keyRecord.userId, username: keyRecord.userName };
    req.apiKeyRecord = keyRecord;
    next();
}

// Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userDir = path.join(__dirname, 'uploads', req.user.userId);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        const siteId = req.body.siteId || crypto.randomBytes(4).toString('hex');
        cb(null, siteId + '.html');
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.html' || ext === '.htm' || file.mimetype === 'text/html') {
            cb(null, true);
        } else {
            cb(new Error('只允许上传 HTML 文件'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ==================== 万能删除函数 ====================
function forceRemoveDir(dirPath) {
    try {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            if (!fs.existsSync(dirPath)) return true;
        }
    } catch (e) {}
    try {
        if (process.platform === 'win32') {
            execSync(`cmd /c rmdir /s /q "${dirPath}"`, { stdio: 'ignore' });
        } else {
            execSync(`rm -rf "${dirPath}"`, { stdio: 'ignore' });
        }
        return !fs.existsSync(dirPath);
    } catch (e) {
        return false;
    }
}

// ==================== 启动清理 ====================
function cleanOrphanUploads() {
    const db = readDB();
    const validUserIds = new Set(db.users.map(u => u.id));
    if (fs.existsSync(uploadsDir)) {
        const dirs = fs.readdirSync(uploadsDir);
        for (const dir of dirs) {
            const fullPath = path.join(uploadsDir, dir);
            if (fs.statSync(fullPath).isDirectory() && !validUserIds.has(dir)) {
                forceRemoveDir(fullPath);
            }
        }
    }
}
cleanOrphanUploads();

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

function generateSiteId() {
    return crypto.randomBytes(4).toString('hex');
}

function generateApiKey() {
    return 'lm_' + crypto.randomBytes(16).toString('hex');
}

// ==================== 公开路由 ====================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/help', (req, res) => res.sendFile(path.join(__dirname, 'public', 'help.html')));
app.get('/api/lang/list', (req, res) => res.json({ langs: getLangList() }));

app.get('/h/:siteId', (req, res) => {
    const { siteId } = req.params;
    const db = readDB();
    const site = db.sites.find(s => s.id === siteId);
    if (!site) {
        return res.status(404).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>404 - Not Found</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0d1117;color:#c9d1d9;}.box{text-align:center;}h1{font-size:4rem;color:#f85149;margin:0;}p{color:#8b949e;}</style></head><body><div class="box"><h1>404</h1><p>Site not found</p></div></body></html>`);
    }
    site.visitCount = (site.visitCount || 0) + 1;
    writeDB(db);
    const filePath = path.join(uploadsDir, site.userId, siteId + '.html');
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
    res.sendFile(path.resolve(filePath));
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ==================== 认证路由 ====================
app.post('/api/auth/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    if (username.length < 3 || username.length > 20) return res.status(400).json({ error: '用户名长度需要 3-20 个字符' });
    if (password.length < 6) return res.status(400).json({ error: '密码长度不能少于 6 个字符' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: '用户名只能包含字母、数字和下划线' });

    const db = readDB();
    if (db.users.find(u => u.username === username)) return res.status(409).json({ error: '用户名已被注册' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: uuidv4(), username, password: hashedPassword,
        nickname: nickname || username, createdAt: new Date().toISOString(),
        loginAttempts: 0, lockUntil: null
    };
    db.users.push(newUser);
    writeDB(db);

    const token = jwt.sign({ userId: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.status(201).json({ message: '注册成功', token, user: { id: newUser.id, username: newUser.username, nickname: newUser.nickname, createdAt: newUser.createdAt } });
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

    const db = readDB();
    const userIndex = db.users.findIndex(u => u.username === username);
    if (userIndex === -1) return res.status(401).json({ error: '用户名或密码错误' });

    const user = db.users[userIndex];
    if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
        const remain = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 1000);
        return res.status(429).json({ error: `账号已被锁定，请 ${remain} 秒后再试` });
    }

    if (!(await bcrypt.compare(password, user.password))) {
        const newAttempts = (user.loginAttempts || 0) + 1;
        db.users[userIndex].loginAttempts = newAttempts;
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            db.users[userIndex].loginAttempts = 0;
            db.users[userIndex].lockUntil = new Date(Date.now() + LOCK_TIME).toISOString();
            writeDB(db);
            return res.status(429).json({ error: '密码错误次数过多，账号已锁定 1 分钟' });
        }
        writeDB(db);
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    db.users[userIndex].loginAttempts = 0;
    db.users[userIndex].lockUntil = null;
    writeDB(db);

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ message: '登录成功', token, user: { id: user.id, username: user.username, nickname: user.nickname, createdAt: user.createdAt } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    const db = readDB();
    const user = db.users.find(u => u.id === req.user.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ user: { id: user.id, username: user.username, nickname: user.nickname, createdAt: user.createdAt } });
});

// ==================== 用户路由 ====================
app.get('/api/user/profile', authMiddleware, (req, res) => {
    const db = readDB();
    const user = db.users.find(u => u.id === req.user.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const sitesCount = db.sites.filter(s => s.userId === user.id).length;
    res.json({ user: { id: user.id, username: user.username, nickname: user.nickname, createdAt: user.createdAt, sitesCount } });
});

app.put('/api/user/profile', authMiddleware, (req, res) => {
    const { nickname } = req.body;
    if (!nickname || !nickname.trim()) return res.status(400).json({ error: '昵称不能为空' });
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === req.user.userId);
    if (userIndex === -1) return res.status(404).json({ error: '用户不存在' });
    db.users[userIndex].nickname = nickname.trim();
    writeDB(db);
    res.json({ message: '更新成功', user: { id: db.users[userIndex].id, username: db.users[userIndex].username, nickname: db.users[userIndex].nickname } });
});

app.put('/api/user/password', authMiddleware, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: '旧密码和新密码不能为空' });
    if (newPassword.length < 6) return res.status(400).json({ error: '新密码长度不能少于 6 个字符' });
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === req.user.userId);
    if (userIndex === -1) return res.status(404).json({ error: '用户不存在' });
    if (!(await bcrypt.compare(oldPassword, db.users[userIndex].password))) return res.status(400).json({ error: '旧密码不正确' });
    db.users[userIndex].password = await bcrypt.hash(newPassword, 10);
    writeDB(db);
    res.json({ message: '密码修改成功' });
});

app.delete('/api/user/account', authMiddleware, (req, res) => {
    const db = readDB();
    const userId = req.user.userId;
    const userDir = path.join(uploadsDir, userId);
    forceRemoveDir(userDir);
    db.sites = db.sites.filter(s => s.userId !== userId);
    db.apikeys = db.apikeys.filter(k => k.userId !== userId);
    db.users = db.users.filter(u => u.id !== userId);
    writeDB(db);
    if (fs.existsSync(uploadsDir)) {
        const validIds = new Set(db.users.map(u => u.id));
        const dirs = fs.readdirSync(uploadsDir);
        for (const dir of dirs) {
            const full = path.join(uploadsDir, dir);
            if (fs.statSync(full).isDirectory() && !validIds.has(dir)) forceRemoveDir(full);
        }
    }
    res.json({ message: '账号已注销' });
});

// ==================== API Key 路由 ====================
app.post('/api/keys', authMiddleware, (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Key 名称不能为空' });
    const db = readDB();
    const key = generateApiKey();
    const record = {
        id: uuidv4(),
        userId: req.user.userId,
        userName: req.user.username,
        name: name.trim(),
        key,
        createdAt: new Date().toISOString()
    };
    db.apikeys.push(record);
    writeDB(db);
    res.status(201).json({ message: 'API Key 创建成功', key: record });
});

app.get('/api/keys', authMiddleware, (req, res) => {
    const db = readDB();
    const keys = db.apikeys.filter(k => k.userId === req.user.userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ keys });
});

app.put('/api/keys/:keyId', authMiddleware, (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '名称不能为空' });
    const db = readDB();
    const idx = db.apikeys.findIndex(k => k.id === req.params.keyId && k.userId === req.user.userId);
    if (idx === -1) return res.status(404).json({ error: 'API Key 未找到' });
    db.apikeys[idx].name = name.trim();
    writeDB(db);
    res.json({ message: '重命名成功', key: db.apikeys[idx] });
});

app.delete('/api/keys/:keyId', authMiddleware, (req, res) => {
    const db = readDB();
    const idx = db.apikeys.findIndex(k => k.id === req.params.keyId && k.userId === req.user.userId);
    if (idx === -1) return res.status(404).json({ error: 'API Key 未找到' });
    db.apikeys.splice(idx, 1);
    writeDB(db);
    res.json({ message: 'API Key 已删除' });
});

// ==================== API 部署（Key 鉴权） ====================
app.post('/api/deploy', apiKeyAuth, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '请选择 HTML 文件' });
    const siteId = req.body.siteId || generateSiteId();
    const name = req.body.name || '未命名网站';
    const description = req.body.description || '';
    const db = readDB();
    if (db.sites.find(s => s.id === siteId)) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(409).json({ error: '该标识已被占用，请更换' });
    }
    const newPath = path.join(uploadsDir, req.user.userId, siteId + '.html');
    fs.renameSync(req.file.path, newPath);
    const site = { id: siteId, userId: req.user.userId, name, description, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 };
    db.sites.push(site);
    writeDB(db);
    res.status(201).json({ message: '部署成功', site, url: `/h/${siteId}` });
});

app.post('/api/deploy/paste', apiKeyAuth, (req, res) => {
    const { code, name, description, siteId } = req.body;
    if (!code || !code.trim()) return res.status(400).json({ error: '代码不能为空' });
    const finalSiteId = siteId || generateSiteId();
    const db = readDB();
    if (db.sites.find(s => s.id === finalSiteId)) return res.status(409).json({ error: '该标识已被占用，请更换' });
    const userDir = path.join(uploadsDir, req.user.userId);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    fs.writeFileSync(path.join(userDir, finalSiteId + '.html'), code.trim());
    const site = { id: finalSiteId, userId: req.user.userId, name: name || '未命名网站', description: description || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 };
    db.sites.push(site);
    writeDB(db);
    res.status(201).json({ message: '部署成功', site, url: `/h/${finalSiteId}` });
});

// ==================== 网站路由 ====================
app.post('/api/sites/upload', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '请选择 HTML 文件' });
    const siteId = req.body.siteId || generateSiteId();
    const name = req.body.name || '未命名网站';
    const description = req.body.description || '';
    const db = readDB();
    if (db.sites.find(s => s.id === siteId)) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(409).json({ error: '该标识已被占用，请更换' });
    }
    const newPath = path.join(uploadsDir, req.user.userId, siteId + '.html');
    fs.renameSync(req.file.path, newPath);
    const site = { id: siteId, userId: req.user.userId, name, description, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 };
    db.sites.push(site);
    writeDB(db);
    res.status(201).json({ message: '部署成功', site, url: `/h/${siteId}` });
});

app.post('/api/sites/paste', authMiddleware, (req, res) => {
    const { code, name, description, siteId } = req.body;
    if (!code || !code.trim()) return res.status(400).json({ error: '代码不能为空' });
    const finalSiteId = siteId || generateSiteId();
    const db = readDB();
    if (db.sites.find(s => s.id === finalSiteId)) return res.status(409).json({ error: '该标识已被占用，请更换' });
    const userDir = path.join(uploadsDir, req.user.userId);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    fs.writeFileSync(path.join(userDir, finalSiteId + '.html'), code.trim());
    const site = { id: finalSiteId, userId: req.user.userId, name: name || '未命名网站', description: description || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 };
    db.sites.push(site);
    writeDB(db);
    res.status(201).json({ message: '部署成功', site, url: `/h/${finalSiteId}` });
});

app.get('/api/sites', authMiddleware, (req, res) => {
    const db = readDB();
    const sites = db.sites.filter(s => s.userId === req.user.userId).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json({ sites });
});

app.get('/api/sites/:siteId', authMiddleware, (req, res) => {
    const db = readDB();
    const site = db.sites.find(s => s.id === req.params.siteId && s.userId === req.user.userId);
    if (!site) return res.status(404).json({ error: '网站未找到' });
    const filePath = path.join(uploadsDir, req.user.userId, site.id + '.html');
    let code = '';
    if (fs.existsSync(filePath)) code = fs.readFileSync(filePath, 'utf-8');
    res.json({ site, code });
});

app.put('/api/sites/:siteId', authMiddleware, upload.single('file'), (req, res) => {
    const db = readDB();
    const idx = db.sites.findIndex(s => s.id === req.params.siteId && s.userId === req.user.userId);
    if (idx === -1) return res.status(404).json({ error: '网站未找到' });
    const name = req.body.name || db.sites[idx].name;
    const description = req.body.description !== undefined ? req.body.description : db.sites[idx].description;
    if (req.body.code) {
        const filePath = path.join(uploadsDir, req.user.userId, db.sites[idx].id + '.html');
        fs.writeFileSync(filePath, req.body.code.trim());
    }
    db.sites[idx].name = name;
    db.sites[idx].description = description;
    db.sites[idx].updatedAt = new Date().toISOString();
    writeDB(db);
    res.json({ message: '更新成功', site: db.sites[idx] });
});

app.delete('/api/sites/:siteId', authMiddleware, (req, res) => {
    const db = readDB();
    const idx = db.sites.findIndex(s => s.id === req.params.siteId && s.userId === req.user.userId);
    if (idx === -1) return res.status(404).json({ error: '网站未找到' });
    const filePath = path.join(uploadsDir, req.user.userId, req.params.siteId + '.html');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.sites.splice(idx, 1);
    writeDB(db);
    res.json({ message: '删除成功' });
});

app.delete('/api/sites', authMiddleware, (req, res) => {
    const db = readDB();
    const userDir = path.join(uploadsDir, req.user.userId);
    forceRemoveDir(userDir);
    db.sites = db.sites.filter(s => s.userId !== req.user.userId);
    writeDB(db);
    res.json({ message: '所有网站已删除' });
});

// ==================== 错误处理 ====================
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: '文件大小不能超过 5MB' });
        return res.status(400).json({ error: '文件上传错误: ' + err.message });
    }
    if (err.message === '只允许上传 HTML 文件') return res.status(400).json({ error: err.message });
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║         LMHost 已启动                 ║
║         http://localhost:${PORT}         ║
║         前端部署平台                  ║
╚═══════════════════════════════════════╝`);
});
