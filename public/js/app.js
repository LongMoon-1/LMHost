// ========== Cookie 工具 ==========
function setCookie(name, value, days = 365) {
    if (!getCookie('lmhost_cookie_accepted')) return;
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

function delCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax`;
}

function clearAllCookies() {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
        const name = c.split('=')[0].trim();
        if (name) delCookie(name);
    }
}

const memoryOnly = { token: null, theme: 'auto', lang: 'zh-CN' };

const API = '';
let token = null;
let currentUser = null;
let selectedFile = null;
let currentPage = 'auth';
let langData = {};
let currentLang = 'zh-CN';
let cookiesAccepted = false;

function initCookiesAccepted() {
    cookiesAccepted = !!getCookie('lmhost_cookie_accepted');
    token = cookiesAccepted ? (getCookie('lmhost_token') || null) : memoryOnly.token;
    currentLang = cookiesAccepted ? (getCookie('lmhost_lang') || 'zh-CN') : (memoryOnly.lang || 'zh-CN');
}

const defaultLang = {
    'drawer.title': '导航',
    'nav.create': '创建网站', 'nav.sites': '我的网站', 'nav.apikey': 'API Key', 'nav.settings': '设置', 'nav.logout': '退出登录',
    'nav.help': '帮助',
    'header.logout': '退出',
    'auth.login': '登录', 'auth.register': '注册',
    'auth.loginTitle': '登录到 LMHost', 'auth.loginUsername': '用户名', 'auth.loginPassword': '密码',
    'auth.loginPlaceholder': '用户名', 'auth.passwordPlaceholder': '密码', 'auth.loginBtn': '登录',
    'auth.registerTitle': '注册新账号', 'auth.regUsername': '用户名', 'auth.regNickname': '昵称', 'auth.regPassword': '密码',
    'auth.regUsernamePlaceholder': '3-20位字母数字下划线', 'auth.regNicknamePlaceholder': '选填', 'auth.regPasswordPlaceholder': '至少6位',
    'auth.registerBtn': '注册',
    'create.upload': '上传文件', 'create.paste': '粘贴代码',
    'create.dropText': '点击或拖拽 HTML 文件', 'create.dropHint': '.html 文件，最大 5MB',
    'create.name': '网站名称', 'create.untitled': '未命名网站', 'create.namePlaceholder': '未命名网站',
    'create.customId': '自定义标识（可选）', 'create.customIdPlaceholder': '留空自动生成',
    'create.deployBtn': '部署网站', 'create.deploySuccess': '部署成功：',
    'create.clearFile': '清除', 'create.fileSelected': '已选择：',
    'create.pasteCode': 'HTML 代码', 'create.pastePlaceholder': '粘贴你的 HTML 代码...',
    'create.pasteName': '网站名称', 'create.pasteNamePlaceholder': '未命名网站',
    'create.pasteSiteId': '自定义标识（可选）', 'create.pasteSiteIdPlaceholder': '留空自动生成',
    'sites.title': '我的网站', 'sites.refresh': '刷新', 'sites.empty': '还没有部署任何网站',
    'sites.createFirst': '开始创建', 'sites.noDesc': '暂无描述', 'sites.loadError': '加载失败',
    'apikey.title': 'API Key',
    'apikey.desc': '使用 API Key 可以通过命令行或脚本部署网站，无需登录。请妥善保管您的 Key。',
    'apikey.empty': '暂无 API Key',
    'apikey.create': '创建',
    'apikey.namePlaceholder': '输入 Key 名称',
    'apikey.created': '创建于',
    'apikey.reveal': '查看',
    'apikey.copyKey': '复制',
    'apikey.rename': '重命名',
    'apikey.delete': '删除',
    'apikey.renameTitle': '重命名 Key',
    'confirm.deleteKey': '确定要删除此 API Key 吗？使用该 Key 的脚本将立即失效。',
    'toast.keyCreated': 'API Key 已创建',
    'toast.keyRenamed': '已重命名',
    'toast.keyDeleted': 'API Key 已删除',
    'settings.general': '通用设置', 'settings.theme': '主题颜色',
    'settings.themeAuto': '跟随系统', 'settings.themeDark': '深色', 'settings.themeLight': '浅色',
    'settings.language': '语言设置',
    'settings.cookie': 'Cookie', 'settings.cookieHint': '重置 Cookie 将清除所有本地数据，下次进入需重新授权。',
    'settings.resetCookie': '重置 Cookie',
    'settings.profile': '个人设置', 'settings.nickname': '昵称', 'settings.saveNickname': '保存昵称',
    'settings.password': '修改密码', 'settings.oldPassword': '旧密码', 'settings.newPassword': '新密码',
    'settings.newPasswordPlaceholder': '至少6位', 'settings.updatePassword': '修改密码',
    'settings.danger': '危险区域', 'settings.dangerHint': '以下操作不可撤销',
    'settings.deleteAllSites': '删除所有网站', 'settings.deleteAccount': '注销账号',
    'settings.logout': '退出登录',
    'edit.title': '编辑网站', 'edit.id': '标识', 'edit.visits': '访问次数',
    'edit.created': '创建时间', 'edit.updated': '更新时间', 'edit.link': '链接',
    'edit.copy': '复制', 'edit.visit': '访问', 'edit.name': '网站名称',
    'edit.preview': '实时预览', 'edit.delete': '删除', 'edit.updateHtml': '更新 HTML',
    'edit.save': '保存修改', 'edit.codeTitle': '更新 HTML 代码', 'edit.codeLabel': 'HTML 代码',
    'edit.cancel': '取消', 'edit.apply': '应用',
    'confirm.cancel': '取消', 'confirm.ok': '确认',
    'cookie.title': 'Cookie 偏好',
    'cookie.text': '我们使用 Cookie 来保存您的登录状态、主题偏好和语言设置，以提供更好的体验。',
    'cookie.accept': '接受所有 Cookie',
    'cookie.reject': '拒绝',
    'cookie.learnMore': '了解更多请查看帮助中心',
    'toast.copied': '链接已复制', 'toast.copyFailed': '复制失败，请手动复制',
    'toast.loggedIn': '登录成功', 'toast.registered': '注册成功', 'toast.loggedOut': '已退出登录',
    'toast.saved': '修改已保存', 'toast.deleted': '网站已删除', 'toast.deploySuccess': '部署成功！',
    'toast.passwordChanged': '密码已修改', 'toast.nicknameUpdated': '已更新',
    'toast.allDeleted': '已全部删除', 'toast.accountDeleted': '账号已注销',
    'toast.fileOnly': '仅支持 HTML 文件', 'toast.fileSize': '文件需小于 5MB',
    'toast.loadFailed': '加载失败', 'toast.cookieReset': 'Cookie 已重置',
    'confirm.deleteSite': '确定要删除此网站吗？此操作不可撤销。',
    'confirm.deleteAllSites': '确定要删除所有网站吗？此操作不可撤销。',
    'confirm.deleteAccount': '确定要注销账号吗？所有数据将被永久删除！',
    'confirm.logout': '确定退出登录吗？',
    'confirm.resetCookie': '确定要重置所有 Cookie 吗？需要重新登录。',
    'error.required': '请填写完整', 'error.userPassRequired': '请填写用户名和密码',
    'error.selectFile': '请选择文件', 'error.enterCode': '请输入代码',
    'error.nicknameRequired': '昵称不能为空', 'error.passwordRequired': '请填写密码',
    'error.sessionExpired': '登录已过期',
    'time.justNow': '刚刚', 'time.minutesAgo': ' 分钟前', 'time.hoursAgo': ' 小时前'
};

function t(key) { return langData[key] || defaultLang[key] || key; }
function $(s) { return document.querySelector(s); }
function $$(s) { return document.querySelectorAll(s); }

// ========== 加载遮罩 ==========
function showLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'globalLoading';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
}
function hideLoading() {
    const el = document.getElementById('globalLoading');
    if (el) el.remove();
}

// ========== 全界面文本渲染 ==========
function applyAllTexts() {
    $('#drawerTitle').textContent = t('drawer.title');
    $('#navCreate span').textContent = t('nav.create');
    $('#navSites span').textContent = t('nav.sites');
    $('#navApikey span').textContent = t('nav.apikey');
    $('#navHelp span').textContent = t('nav.help');
    $('#navSettings span').textContent = t('nav.settings');
    $('#drawerLogout span').textContent = t('nav.logout');
    $('#btnLogout').innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> ' + t('header.logout');
    $('#tabLogin').textContent = t('auth.login');
    $('#tabRegister').textContent = t('auth.register');
    $('#loginTitle').textContent = t('auth.loginTitle');
    $('#lblLoginUsername').textContent = t('auth.loginUsername');
    $('#loginUsername').placeholder = t('auth.loginPlaceholder');
    $('#lblLoginPassword').textContent = t('auth.loginPassword');
    $('#loginPassword').placeholder = t('auth.passwordPlaceholder');
    $('#btnLogin').textContent = t('auth.loginBtn');
    $('#registerTitle').textContent = t('auth.registerTitle');
    $('#lblRegUsername').textContent = t('auth.regUsername');
    $('#regUsername').placeholder = t('auth.regUsernamePlaceholder');
    $('#lblRegNickname').textContent = t('auth.regNickname');
    $('#regNickname').placeholder = t('auth.regNicknamePlaceholder');
    $('#lblRegPassword').textContent = t('auth.regPassword');
    $('#regPassword').placeholder = t('auth.regPasswordPlaceholder');
    $('#btnRegister').textContent = t('auth.registerBtn');
    $('#ctabUpload span').textContent = t('create.upload');
    $('#ctabPaste span').textContent = t('create.paste');
    $('#dropText').textContent = t('create.dropText');
    $('#dropHint').textContent = t('create.dropHint');
    $('#lblUploadName').textContent = t('create.name');
    $('#uploadName').placeholder = t('create.namePlaceholder');
    $('#lblUploadSiteId').textContent = t('create.customId');
    $('#uploadSiteId').placeholder = t('create.customIdPlaceholder');
    $('#btnUploadDeploy span').textContent = t('create.deployBtn');
    $('#deploySuccessText').textContent = t('create.deploySuccess');
    $('#btnClearFile span').textContent = t('create.clearFile');
    $('#lblPasteCode').textContent = t('create.pasteCode');
    $('#pasteCode').placeholder = t('create.pastePlaceholder');
    $('#lblPasteName').textContent = t('create.pasteName');
    $('#pasteName').placeholder = t('create.pasteNamePlaceholder');
    $('#lblPasteSiteId').textContent = t('create.pasteSiteId');
    $('#pasteSiteId').placeholder = t('create.pasteSiteIdPlaceholder');
    $('#btnPasteDeploy span').textContent = t('create.deployBtn');
    $('#pasteSuccessText').textContent = t('create.deploySuccess');
    $('#sitesTitle').textContent = t('sites.title');
    $('#btnRefreshSites span').textContent = t('sites.refresh');
    $('#emptyText').textContent = t('sites.empty');
    $('#btnGoCreate span').textContent = t('sites.createFirst');
    $('#apikeyTitle').textContent = t('apikey.title');
    $('#apikeyDesc').textContent = t('apikey.desc');
    $('#emptyApikeyText').textContent = t('apikey.empty');
    $('#apikeyName').placeholder = t('apikey.namePlaceholder');
    $('#btnCreateKey span').textContent = t('apikey.create');
    $('#settingsGeneral').textContent = t('settings.general');
    $('#lblTheme').textContent = t('settings.theme');
    $('#themeSelect option[value="auto"]').textContent = t('settings.themeAuto');
    $('#themeSelect option[value="dark"]').textContent = t('settings.themeDark');
    $('#themeSelect option[value="light"]').textContent = t('settings.themeLight');
    $('#lblLang').textContent = t('settings.language');
    $('#settingsCookie').textContent = t('settings.cookie');
    $('#cookieHint').textContent = t('settings.cookieHint');
    $('#btnResetCookie span').textContent = t('settings.resetCookie');
    $('#settingsProfile').textContent = t('settings.profile');
    $('#lblNickname').textContent = t('settings.nickname');
    $('#btnSaveNickname span').textContent = t('settings.saveNickname');
    $('#settingsPassword').textContent = t('settings.password');
    $('#lblOldPassword').textContent = t('settings.oldPassword');
    $('#lblNewPassword').textContent = t('settings.newPassword');
    $('#newPassword').placeholder = t('settings.newPasswordPlaceholder');
    $('#btnChangePassword span').textContent = t('settings.updatePassword');
    $('#settingsDanger').textContent = t('settings.danger');
    $('#dangerHint').textContent = t('settings.dangerHint');
    $('#btnDeleteAllSites span').textContent = t('settings.deleteAllSites');
    $('#btnDeleteAccount span').textContent = t('settings.deleteAccount');
    $('#btnSettingsLogout span').textContent = t('settings.logout');
}

async function api(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API + url, { ...options, headers });
    if (res.status === 401 && token) { logout(true); throw new Error(t('error.sessionExpired')); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
}

function showToast(msg, type = 'info') {
    const container = $('#toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function showConfirm(message, type = 'warning', confirmText = null) {
    return new Promise((resolve) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'confirm-modal';
        const iconClass = type === 'danger' ? 'fa-triangle-exclamation danger' : 'fa-circle-exclamation warning';
        const okText = confirmText || t('confirm.ok');
        wrapper.innerHTML = `<div class="modal-overlay" id="confirmOverlay"><div class="modal"><div class="modal-body"><div class="confirm-icon ${type}"><i class="fa-solid ${iconClass}"></i></div><div class="confirm-message">${message}</div></div><div class="modal-footer"><button class="btn btn-outline" id="confirmCancel">${t('confirm.cancel')}</button><button class="btn ${type==='danger'?'btn-danger':'btn-primary'}" id="confirmOk">${okText}</button></div></div></div>`;
        document.body.appendChild(wrapper);
        const okBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');
        const overlay = document.getElementById('confirmOverlay');
        let resolved = false;
        const close = (result) => { if (resolved) return; resolved = true; wrapper.remove(); resolve(result); };
        okBtn.onclick = () => { okBtn.disabled = true; okBtn.innerHTML = '<span class="spinner"></span> ' + okText; resolve(true); };
        cancelBtn.onclick = () => close(false);
        overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    });
}

function closeConfirmModal() {
    const wrapper = document.querySelector('.confirm-modal');
    if (wrapper) wrapper.remove();
}

function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast(t('toast.copied'), 'success')).catch(() => fallbackCopy(text));
    } else fallbackCopy(text);
}
function fallbackCopy(text) {
    const ta = document.createElement('textarea'); ta.value = text;
    ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast(t('toast.copied'), 'success'); }
    catch(e) { showToast(t('toast.copyFailed'), 'error'); }
    document.body.removeChild(ta);
}

function logout(silent = false) {
    token = null;
    cookiesAccepted ? delCookie('lmhost_token') : (memoryOnly.token = null);
    currentUser = null; selectedFile = null;
    if (!silent) showToast(t('toast.loggedOut'), 'info');
    switchPage('auth'); updateUI();
}

function updateUI() {
    const loggedIn = !!token;
    $('#menuBtn').style.display = (loggedIn && window.innerWidth < 768) ? 'flex' : 'none';
    $('#headerUser').style.display = loggedIn ? 'flex' : 'none';
    $('#btnLogout').style.display = loggedIn ? 'inline-flex' : 'none';
    if (loggedIn && currentUser) $('#headerNickname').textContent = currentUser.nickname || currentUser.username;
    if (!loggedIn) switchPage('auth');
    document.body.classList.toggle('logged-in', loggedIn);
}

async function checkAuth() {
    if (!token) return updateUI();
    try { currentUser = (await api('/api/auth/me')).user; updateUI(); if (currentPage === 'auth') switchPage('create'); }
    catch { logout(true); }
}

function switchPage(page) {
    currentPage = page;
    $$('.page').forEach(p => p.classList.remove('active'));
    const pg = $(`#page-${page}`);
    if (pg) pg.classList.add('active');
    $$('.drawer-item[data-page]').forEach(i => i.classList.toggle('active', i.dataset.page === page));
    if (page === 'sites') loadSites();
    if (page === 'apikey') loadApiKeys();
    if (page === 'settings') loadSettingsContent();
    if (window.innerWidth < 768) closeDrawer();
}

function openDrawer() { $('#drawer').classList.add('open'); $('#overlay').classList.add('open'); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#overlay').classList.remove('open'); }
window.addEventListener('resize', updateUI);

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    cookiesAccepted ? setCookie('lmhost_theme', theme) : (memoryOnly.theme = theme);
    if ($('#themeSelect')) $('#themeSelect').value = theme;
}
function initTheme() { applyTheme(cookiesAccepted ? (getCookie('lmhost_theme') || 'auto') : memoryOnly.theme); }

async function loadLangList() {
    try {
        const data = await api('/api/lang/list');
        const select = $('#langSelect');
        select.innerHTML = data.langs.map(l => `<option value="${l.code}" ${l.code===currentLang?'selected':''}>${l.name}</option>`).join('');
        select.value = currentLang;
    } catch(e) {}
}

async function loadLang(code) {
    if (code === 'zh-CN') { langData = {}; }
    else {
        try { const r = await fetch(`/lang/${code}.json`); langData = r.ok ? await r.json() : {}; }
        catch(e) { langData = {}; }
    }
    currentLang = code;
    cookiesAccepted ? setCookie('lmhost_lang', code) : (memoryOnly.lang = code);
    applyAllTexts();
    if (currentPage === 'sites') loadSites();
    if (currentPage === 'apikey') loadApiKeys();
}

function createModal(title, bodyHTML, footerHTML, extraClass = '') {
    const existing = document.getElementById('dynamicModal');
    if (existing) existing.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'dynamicModal';
    if (extraClass) wrapper.className = extraClass;
    wrapper.innerHTML = `<div class="modal-overlay" id="dynamicModalOverlay"><div class="modal"><div class="modal-header"><h3>${title}</h3><button class="modal-close-btn" id="dynamicModalClose"><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body">${bodyHTML}</div><div class="modal-footer">${footerHTML}</div></div></div>`;
    document.body.appendChild(wrapper);
    const close = () => wrapper.remove();
    $('#dynamicModalClose').onclick = close;
    $('#dynamicModalOverlay').onclick = (e) => { if (e.target === $('#dynamicModalOverlay')) close(); };
    return { close, wrapper };
}

// ========== Cookie 弹窗 ==========
function showCookieBanner() {
    if (getCookie('lmhost_cookie_accepted')) return;
    const overlay = document.createElement('div');
    overlay.className = 'cookie-banner-overlay';
    overlay.id = 'cookieBannerOverlay';
    overlay.innerHTML = `<div class="cookie-banner"><div class="cookie-header"><i class="fa-solid fa-cookie-bite cookie-icon"></i><span class="cookie-title">${t('cookie.title')}</span></div><div class="cookie-text">${t('cookie.text')}</div><div class="cookie-actions"><button class="btn btn-outline" id="btnCookieReject">${t('cookie.reject')}</button><button class="btn btn-primary" id="btnCookieAccept">${t('cookie.accept')}</button></div><div class="cookie-link"><a onclick="window.location.href='/help'">${t('cookie.learnMore')}</a></div></div>`;
    document.body.appendChild(overlay);
    $('#btnCookieAccept').onclick = () => { document.cookie = `lmhost_cookie_accepted=1;expires=${new Date(Date.now()+365*24*60*60*1000).toUTCString()};path=/;SameSite=Lax`; overlay.remove(); initAfterCookie(true); };
    $('#btnCookieReject').onclick = () => { overlay.remove(); memoryOnly.theme = 'auto'; memoryOnly.lang = 'zh-CN'; initAfterCookie(false); };
}

// ========== 登录/注册 ==========
$('#btnLogin').onclick = async () => {
    const username = $('#loginUsername').value.trim(), password = $('#loginPassword').value;
    const errEl = $('#loginError');
    if (!username || !password) { errEl.style.display='block'; errEl.textContent=t('error.userPassRequired'); return; }
    errEl.style.display='none'; setLoadingBtn('#btnLogin', true, t('auth.loginBtn') + '...');
    try {
        const data = await api('/api/auth/login', { method:'POST', body: JSON.stringify({username, password}) });
        token = data.token; currentUser = data.user;
        cookiesAccepted ? setCookie('lmhost_token', token) : (memoryOnly.token = token);
        showToast(t('toast.loggedIn'), 'success'); updateUI(); switchPage('create');
    } catch(e) { errEl.style.display='block'; errEl.textContent = e.message; }
    finally { resetBtn('#btnLogin', t('auth.loginBtn')); }
};
$('#btnRegister').onclick = async () => {
    const username = $('#regUsername').value.trim(), password = $('#regPassword').value, nickname = $('#regNickname').value.trim();
    const errEl = $('#regError');
    if (!username || !password) { errEl.style.display='block'; errEl.textContent=t('error.userPassRequired'); return; }
    errEl.style.display='none'; setLoadingBtn('#btnRegister', true, t('auth.registerBtn') + '...');
    try {
        const data = await api('/api/auth/register', { method:'POST', body: JSON.stringify({username, password, nickname: nickname||undefined}) });
        token = data.token; currentUser = data.user;
        cookiesAccepted ? setCookie('lmhost_token', token) : (memoryOnly.token = token);
        showToast(t('toast.registered'), 'success'); updateUI(); switchPage('create');
    } catch(e) { errEl.style.display='block'; errEl.textContent = e.message; }
    finally { resetBtn('#btnRegister', t('auth.registerBtn')); }
};

$$('.tab[data-tab]').forEach(tab => tab.onclick = () => {
    const name = tab.dataset.tab;
    $$('#page-auth .tab').forEach(t => t.classList.remove('active')); tab.classList.add('active');
    $('#tab-login').style.display = name==='login'?'block':'none';
    $('#tab-register').style.display = name==='register'?'block':'none';
});
$$('.tab[data-ctab]').forEach(tab => tab.onclick = () => {
    const name = tab.dataset.ctab;
    $$('#page-create .tab').forEach(t => t.classList.remove('active')); tab.classList.add('active');
    $('#ctab-upload').style.display = name==='upload'?'block':'none';
    $('#ctab-paste').style.display = name==='paste'?'block':'none';
});

// ========== 文件处理 ==========
$('#dropZone').onclick = () => $('#fileInput').click();
$('#dropZone').ondragover = e => { e.preventDefault(); $('#dropZone').classList.add('drag-over'); };
$('#dropZone').ondragleave = () => $('#dropZone').classList.remove('drag-over');
$('#dropZone').ondrop = e => { e.preventDefault(); $('#dropZone').classList.remove('drag-over'); handleFile(e.dataTransfer.files[0]); };
$('#fileInput').onchange = e => { if(e.target.files[0]) handleFile(e.target.files[0]); };

function handleFile(file) {
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) { showToast(t('toast.fileOnly'), 'error'); return; }
    if (file.size > 5*1024*1024) { showToast(t('toast.fileSize'), 'error'); return; }
    selectedFile = file;
    $('#fileInfo').style.display = 'flex';
    $('#fileName').textContent = t('create.fileSelected') + `${file.name} (${(file.size/1024).toFixed(1)} KB)`;
    $('#uploadError').style.display = 'none';
}
$('#btnClearFile').onclick = () => { selectedFile=null; $('#fileInput').value=''; $('#fileInfo').style.display='none'; };

// ========== 部署 ==========
$('#btnUploadDeploy').onclick = async () => {
    if (!selectedFile) { $('#uploadError').style.display='block'; $('#uploadError').textContent=t('error.selectFile'); return; }
    const formData = new FormData(); formData.append('file', selectedFile);
    formData.append('name', $('#uploadName').value.trim() || t('create.untitled'));
    const sid = $('#uploadSiteId').value.trim(); if(sid) formData.append('siteId', sid);
    $('#uploadError').style.display='none'; setLoadingBtn('#btnUploadDeploy', true);
    try {
        const res = await fetch('/api/sites/upload', { method:'POST', headers:{'Authorization':`Bearer ${token}`}, body:formData });
        const data = await res.json(); if(!res.ok) throw new Error(data.error);
        $('#uploadResult').classList.add('show'); $('#uploadResultUrl').textContent = `${location.origin}/h/${data.site.id}`;
        showToast(t('toast.deploySuccess'), 'success');
        selectedFile=null; $('#fileInput').value=''; $('#fileInfo').style.display='none'; $('#uploadName').value=''; $('#uploadSiteId').value='';
    } catch(e) { $('#uploadError').style.display='block'; $('#uploadError').textContent = e.message; }
    finally { resetBtn('#btnUploadDeploy', '<i class="fa-solid fa-rocket"></i> ' + t('create.deployBtn')); }
};
$('#btnPasteDeploy').onclick = async () => {
    const code = $('#pasteCode').value.trim();
    if(!code) { $('#pasteError').style.display='block'; $('#pasteError').textContent=t('error.enterCode'); return; }
    $('#pasteError').style.display='none'; setLoadingBtn('#btnPasteDeploy', true);
    try {
        const data = await api('/api/sites/paste', { method:'POST', body: JSON.stringify({ code, name: $('#pasteName').value.trim()||t('create.untitled'), siteId: $('#pasteSiteId').value.trim()||undefined })});
        $('#pasteResult').classList.add('show'); $('#pasteResultUrl').textContent = `${location.origin}/h/${data.site.id}`;
        showToast(t('toast.deploySuccess'), 'success'); $('#pasteCode').value=''; $('#pasteName').value=''; $('#pasteSiteId').value='';
    } catch(e) { $('#pasteError').style.display='block'; $('#pasteError').textContent = e.message; }
    finally { resetBtn('#btnPasteDeploy', '<i class="fa-solid fa-rocket"></i> ' + t('create.deployBtn')); }
};

document.addEventListener('click', e => {
    if (e.target.closest('.copy-btn') && !e.target.closest('#dynamicModal')) {
        const url = e.target.closest('.deploy-result')?.querySelector('.url')?.textContent;
        if(url) copyText(url);
    }
});

// ========== 我的网站 ==========
async function loadSites() {
    try {
        const data = await api('/api/sites');
        const grid = $('#sitesGrid'), empty = $('#emptySites');
        if(data.sites.length === 0) { grid.innerHTML=''; empty.style.display='block'; }
        else {
            empty.style.display='none';
            grid.innerHTML = data.sites.map(s => `<div class="site-card" data-id="${s.id}"><div class="site-card-name"><span>${escHtml(s.name)}</span><span class="site-card-id">${s.id}</span></div><div class="site-card-desc">${escHtml(s.description||t('sites.noDesc'))}</div><div class="site-card-meta"><span><i class="fa-solid fa-eye"></i> ${s.visitCount||0}</span><span><i class="fa-solid fa-clock"></i> ${formatDate(s.updatedAt)}</span></div></div>`).join('');
        }
    } catch(e) { showToast(t('sites.loadError'), 'error'); }
}
function escHtml(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function formatDate(iso) {
    if(!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    if(diff<60000) return t('time.justNow');
    if(diff<3600000) return Math.floor(diff/60000) + t('time.minutesAgo');
    if(diff<86400000) return Math.floor(diff/3600000) + t('time.hoursAgo');
    return new Date(iso).toLocaleDateString('zh-CN');
}
$('#btnRefreshSites').onclick = loadSites;
$('#btnGoCreate').onclick = () => switchPage('create');

// ========== API Key ==========
async function loadApiKeys() {
    try {
        const data = await api('/api/keys');
        const list = $('#apikeyList'), empty = $('#emptyApikey');
        if (data.keys.length === 0) { list.innerHTML = ''; empty.style.display = 'block'; }
        else {
            empty.style.display = 'none';
            list.innerHTML = data.keys.map(k => `
                <li class="apikey-item" data-keyid="${k.id}">
                    <div class="key-info">
                        <div class="key-name">${escHtml(k.name)}</div>
                        <div class="key-meta">${t('apikey.created')} ${formatDate(k.createdAt)}</div>
                        <div class="key-reveal" id="keyReveal-${k.id}">${k.key}</div>
                    </div>
                    <div class="key-actions">
                        <button class="btn btn-outline btn-sm key-reveal-btn" data-keyid="${k.id}">${t('apikey.reveal')}</button>
                        <button class="btn btn-outline btn-sm key-copy-btn" data-keyid="${k.id}">${t('apikey.copyKey')}</button>
                        <button class="btn btn-outline btn-sm key-rename-btn" data-keyid="${k.id}" data-name="${escHtml(k.name)}">${t('apikey.rename')}</button>
                        <button class="btn btn-danger btn-sm key-delete-btn" data-keyid="${k.id}">${t('apikey.delete')}</button>
                    </div>
                </li>
            `).join('');
        }
        bindKeyEvents();
    } catch(e) { showToast('加载 API Key 失败', 'error'); }
}

function bindKeyEvents() {
    $$('.key-reveal-btn').forEach(btn => {
        btn.onclick = () => {
            const reveal = document.getElementById(`keyReveal-${btn.dataset.keyid}`);
            if (reveal) reveal.classList.toggle('show');
        };
    });
    $$('.key-copy-btn').forEach(btn => {
        btn.onclick = () => {
            const reveal = document.getElementById(`keyReveal-${btn.dataset.keyid}`);
            if (reveal) copyText(reveal.textContent);
        };
    });
    $$('.key-rename-btn').forEach(btn => {
        btn.onclick = () => {
            const newName = prompt(t('apikey.renameTitle'), btn.dataset.name);
            if (newName && newName.trim()) renameKey(btn.dataset.keyid, newName.trim());
        };
    });
    $$('.key-delete-btn').forEach(btn => {
        btn.onclick = async () => {
            const confirmed = await showConfirm(t('confirm.deleteKey'), 'danger', t('apikey.delete'));
            if (!confirmed) return;
            try {
                await api(`/api/keys/${btn.dataset.keyid}`, { method: 'DELETE' });
                showToast(t('toast.keyDeleted'), 'info');
                closeConfirmModal();
                loadApiKeys();
            } catch(e) { showToast(e.message, 'error'); closeConfirmModal(); }
        };
    });
}

async function renameKey(keyId, newName) {
    try {
        await api(`/api/keys/${keyId}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
        showToast(t('toast.keyRenamed'), 'success');
        loadApiKeys();
    } catch(e) { showToast(e.message, 'error'); }
}

$('#btnCreateKey').onclick = async () => {
    const name = $('#apikeyName').value.trim();
    if (!name) return showToast('请输入 Key 名称', 'error');
    setLoadingBtn('#btnCreateKey', true);
    try {
        const data = await api('/api/keys', { method: 'POST', body: JSON.stringify({ name }) });
        showToast(t('toast.keyCreated'), 'success');
        $('#apikeyName').value = '';
        loadApiKeys();
        setTimeout(() => {
            const reveal = document.getElementById(`keyReveal-${data.key.id}`);
            if (reveal) reveal.classList.add('show');
        }, 200);
    } catch(e) { showToast(e.message, 'error'); }
    finally { resetBtn('#btnCreateKey', '<i class="fa-solid fa-plus"></i> ' + t('apikey.create')); }
};

// ========== 编辑面板 ==========
$('#sitesGrid').onclick = e => { const card = e.target.closest('.site-card'); if(card) openConfigModal(card.dataset.id); };
let activeModal = null;
let editContext = { siteId: null, siteName: '', siteCode: '', url: '', visitCount: 0, createdAt: '', updatedAt: '' };

async function openConfigModal(siteId) {
    showLoading();
    try {
        const data = await api(`/api/sites/${siteId}`); const site = data.site;
        editContext = { siteId: site.id, siteName: site.name, siteCode: data.code||'', url: `${location.origin}/h/${site.id}`, visitCount: site.visitCount||0, createdAt: site.createdAt, updatedAt: site.updatedAt };
        renderConfigView();
    } catch(e) { showToast(t('toast.loadFailed')+': '+e.message, 'error'); }
    finally { hideLoading(); }
}
function renderConfigView() {
    const ctx = editContext;
    const bodyHTML = `<div class="modal-info"><div><strong>${t('edit.id')}：</strong><code style="color:var(--accent)">${ctx.siteId}</code></div><div><strong>${t('edit.visits')}：</strong>${ctx.visitCount}</div><div><strong>${t('edit.created')}：</strong>${formatDate(ctx.createdAt)}</div><div><strong>${t('edit.updated')}：</strong>${formatDate(ctx.updatedAt)}</div><div class="url-row mt-8"><strong>${t('edit.link')}：</strong><span class="url-text">${ctx.url}</span><button class="btn btn-outline btn-sm" id="cfgCopyLink"><i class="fa-solid fa-copy"></i> ${t('edit.copy')}</button><button class="btn btn-outline btn-sm" onclick="window.open('${ctx.url}','_blank')"><i class="fa-solid fa-up-right-from-square"></i> ${t('edit.visit')}</button></div></div><div class="form-group"><label>${t('edit.name')}</label><input class="input" id="cfgName" value="${escHtml(ctx.siteName)}"></div><div class="form-group"><label>${t('edit.preview')}</label><div class="preview-frame"><iframe id="cfgPreviewIframe" srcdoc="${escAttr(ctx.siteCode)}"></iframe></div></div>`;
    const footerHTML = `<button class="btn btn-danger btn-sm" id="cfgDelete"><i class="fa-solid fa-trash"></i> ${t('edit.delete')}</button><button class="btn btn-outline btn-sm" id="cfgEditCode"><i class="fa-solid fa-pen-to-square"></i> ${t('edit.updateHtml')}</button><button class="btn btn-primary" id="cfgSave"><i class="fa-solid fa-floppy-disk"></i> ${t('edit.save')}</button>`;
    if (activeModal) activeModal.close();
    activeModal = createModal(t('edit.title'), bodyHTML, footerHTML);
    $('#cfgCopyLink').onclick = (e) => { e.preventDefault(); copyText(ctx.url); };
    $('#cfgEditCode').onclick = () => renderCodeEditorView();
    $('#cfgSave').onclick = async () => {
        const newName = $('#cfgName').value.trim() || ctx.siteName;
        setLoadingBtn('#cfgSave', true, '保存中...');
        try { await api(`/api/sites/${ctx.siteId}`, { method:'PUT', body: JSON.stringify({ name: newName, code: ctx.siteCode }) }); showToast(t('toast.saved'), 'success'); activeModal.close(); activeModal=null; loadSites(); }
        catch(e) { showToast(e.message, 'error'); resetBtn('#cfgSave', '<i class="fa-solid fa-floppy-disk"></i> ' + t('edit.save')); }
    };
    $('#cfgDelete').onclick = async () => {
        const confirmed = await showConfirm(t('confirm.deleteSite'), 'danger', t('edit.delete'));
        if (!confirmed) return;
        try { await api(`/api/sites/${ctx.siteId}`, { method:'DELETE' }); showToast(t('toast.deleted'), 'info'); activeModal.close(); activeModal = null; closeConfirmModal(); loadSites(); }
        catch(e) { showToast(e.message, 'error'); closeConfirmModal(); }
    };
}
function renderCodeEditorView() {
    const ctx = editContext;
    const bodyHTML = `<div class="form-group"><label>${t('edit.codeLabel')} - ${escHtml(ctx.siteName)}</label><textarea class="input" id="codeEditorTextarea" style="min-height:350px;font-family:'SF Mono','Fira Code','Cascadia Code',monospace;font-size:0.82rem;">${ctx.siteCode}</textarea></div>`;
    const footerHTML = `<button class="btn btn-outline btn-sm" id="codeCancel"><i class="fa-solid fa-arrow-left"></i> ${t('edit.cancel')}</button><button class="btn btn-primary" id="codeApply"><i class="fa-solid fa-check"></i> ${t('edit.apply')}</button>`;
    if (activeModal) activeModal.close();
    activeModal = createModal(t('edit.codeTitle'), bodyHTML, footerHTML, 'code-editor-modal');
    $('#codeCancel').onclick = () => renderConfigView();
    $('#codeApply').onclick = () => { editContext.siteCode = $('#codeEditorTextarea').value; renderConfigView(); };
}
function escAttr(s) { return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ========== 设置 ==========
async function loadSettingsContent() {
    try { const d = await api('/api/user/profile'); $('#settingsNickname').value = d.user.nickname || ''; } catch(e){}
}
$('#btnSaveNickname').onclick = async () => {
    const nn = $('#settingsNickname').value.trim();
    if(!nn) return showToast(t('error.nicknameRequired'),'error');
    setLoadingBtn('#btnSaveNickname', true, '保存中...');
    try { const d = await api('/api/user/profile', { method:'PUT', body: JSON.stringify({nickname:nn}) }); currentUser = d.user; updateUI(); showToast(t('toast.nicknameUpdated'),'success'); }
    catch(e) { showToast(e.message,'error'); }
    finally { resetBtn('#btnSaveNickname', '<i class="fa-solid fa-floppy-disk"></i> ' + t('settings.saveNickname')); }
};
$('#btnChangePassword').onclick = async () => {
    const op = $('#oldPassword').value, np = $('#newPassword').value;
    if(!op||!np) return showToast(t('error.passwordRequired'),'error');
    setLoadingBtn('#btnChangePassword', true, '修改中...');
    try { await api('/api/user/password', { method:'PUT', body: JSON.stringify({oldPassword:op, newPassword:np}) }); showToast(t('toast.passwordChanged'),'success'); $('#oldPassword').value=''; $('#newPassword').value=''; }
    catch(e) { showToast(e.message,'error'); }
    finally { resetBtn('#btnChangePassword', '<i class="fa-solid fa-key"></i> ' + t('settings.updatePassword')); }
};
$('#btnDeleteAllSites').onclick = async () => {
    const confirmed = await showConfirm(t('confirm.deleteAllSites'), 'danger', t('settings.deleteAllSites'));
    if (!confirmed) return;
    try { await api('/api/sites', { method:'DELETE' }); showToast(t('toast.allDeleted'), 'success'); closeConfirmModal(); loadSites(); }
    catch(e) { showToast(e.message, 'error'); closeConfirmModal(); }
};
$('#btnDeleteAccount').onclick = async () => {
    const confirmed = await showConfirm(t('confirm.deleteAccount'), 'danger', t('settings.deleteAccount'));
    if (!confirmed) return;
    try { await api('/api/user/account', { method:'DELETE' }); showToast(t('toast.accountDeleted'), 'info'); closeConfirmModal(); logout(true); }
    catch(e) { showToast(e.message, 'error'); closeConfirmModal(); }
};
$('#btnSettingsLogout').onclick = async () => {
    const confirmed = await showConfirm(t('confirm.logout'), 'warning', t('nav.logout'));
    if (!confirmed) return;
    closeConfirmModal();
    logout();
};
$('#btnResetCookie').onclick = async () => {
    const confirmed = await showConfirm(t('confirm.resetCookie'), 'warning', t('settings.resetCookie'));
    if (!confirmed) return;
    clearAllCookies();
    cookiesAccepted = false; token = null; currentUser = null; memoryOnly.token = null;
    showToast(t('toast.cookieReset'), 'success');
    closeConfirmModal();
    updateUI();
    showCookieBanner();
};

$('#themeSelect').onchange = (e) => applyTheme(e.target.value);
$('#langSelect').onchange = async (e) => { await loadLang(e.target.value); };

// ========== 导航 ==========
$('#menuBtn').onclick = openDrawer;
$('#overlay').onclick = closeDrawer;
$('#drawerClose').onclick = closeDrawer;
$$('.drawer-item[data-page]').forEach(item => item.onclick = () => switchPage(item.dataset.page));
$('#navHelp').onclick = () => { window.location.href = '/help'; };
$('#drawerLogout').onclick = async () => {
    const confirmed = await showConfirm(t('confirm.logout'), 'warning', t('nav.logout'));
    if (!confirmed) return;
    closeConfirmModal();
    logout();
};
$('#btnLogout').onclick = async () => {
    const confirmed = await showConfirm(t('confirm.logout'), 'warning', t('nav.logout'));
    if (!confirmed) return;
    closeConfirmModal();
    logout();
};
document.onkeydown = e => { if(e.key==='Escape') { if (activeModal) { activeModal.close(); activeModal = null; } closeDrawer(); } };

function setLoadingBtn(selector, loading, text = '') {
    const btn = $(selector);
    if (loading) { btn.disabled = true; btn.dataset.originalHtml = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> ' + (text || '处理中...'); }
}
function resetBtn(selector, originalHtml = null) {
    const btn = $(selector); btn.disabled = false;
    if (originalHtml) btn.innerHTML = originalHtml;
    else if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
}

function initAfterCookie(accepted) {
    initCookiesAccepted();
    initTheme();
    loadLang(currentLang);
    loadLangList();
    checkAuth();
}

showCookieBanner();
if (getCookie('lmhost_cookie_accepted')) {
    initAfterCookie(true);
} else if (!document.getElementById('cookieBannerOverlay')) {
    initCookiesAccepted();
    initTheme();
    loadLang('zh-CN');
    loadLangList();
    checkAuth();
}
