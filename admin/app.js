/**
 * ============================================================
 *  app.js - Logic หน้า Admin ระบบจดหมายข่าว
 *  ผู้พัฒนา: นายชิติพัทธ์ นิลวรรณ
 * ============================================================
 */

// ===== State =====
const A = {
  token: null,
  user: null,
  categories: [],
  catMap: {},
  list: [],
  pagination: null,
  // filter ของหน้า list
  page: 1, pageSize: 10, search: '', category: 'all', status: 'all',
  // ไฟล์ที่เลือกในฟอร์ม (base64)
  formCover: null, formPdf: null, formGallery: [], formCoverPos: '50% 50%',
  editingId: null
};

const LS_TOKEN = 'nl_admin_token';
const LS_USER = 'nl_admin_user';
// ใช้ sessionStorage: ข้อมูลจะหายทันทีเมื่อปิดแท็บ/เบราว์เซอร์
// (ป้องกันการเข้าหน้าแอดมินได้เองโดยไม่ต้องใส่รหัส)
const SS = window.sessionStorage;

// ============================================================
//  API
// ============================================================
async function apiGet(action, params){
  const url = new URL(CONFIG.API_URL);
  url.searchParams.set('action', action);
  Object.keys(params||{}).forEach(k=>url.searchParams.set(k, params[k]));
  const res = await fetch(url.toString());
  return res.json();
}
async function apiPost(body){
  // Apps Script ต้องส่งแบบ text/plain เพื่อเลี่ยง preflight CORS
  const res = await fetch(CONFIG.API_URL, {
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify(body)
  });
  return res.json();
}

// ============================================================
//  Init
// ============================================================

// ===== โลโก้ =====
// ที่อยู่รูปถูกใส่ไว้ใน HTML แล้ว (src="logo.png") เบราว์เซอร์จึงเริ่มโหลด
// ตั้งแต่วินาทีแรกที่อ่านหน้า - เร็วที่สุด ไม่ต้องรอ JS
// ฟังก์ชันนี้แค่คอยดูแล: โหลดเสร็จ = แสดงผล / โหลดไม่ได้ = ใช้ลิงก์สำรองใน config
function setLogos(ids){
  const remote = CONFIG.LOGO_URL || '';
  ids.forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    // รูปแสดงเองอยู่แล้ว - JS แค่คอยจัดการกรณีโหลดไม่ได้
    const hidePh=()=>{ const ph=el.parentNode&&el.parentNode.querySelector('.logo-ph'); if(ph) ph.style.display='none'; };
    if(el.complete && el.naturalWidth) hidePh();
    el.addEventListener('load', hidePh);
    el.addEventListener('error', function(){
      if(remote && this.src.indexOf('logo.png')!==-1){ this.src=remote; }  // ถอยไปใช้ลิงก์สำรอง
      else { this.style.display='none'; }                                   // ปล่อยให้ 🏫 แสดงแทน
    });
  });
  try{ localStorage.removeItem('nl_logo_cache_v1'); localStorage.removeItem('nl_logo_cache_v2'); }catch(e){}
}

function initConfig(){
  setLogos(['loginLogo','sideLogo','footLogo']);
  const fav=document.getElementById('favIcon'); if(fav && CONFIG.LOGO_URL) fav.href=CONFIG.LOGO_URL;
  document.getElementById('sideSchool').textContent=CONFIG.SCHOOL_NAME;
  document.getElementById('footDev').textContent=CONFIG.DEVELOPER;
  document.getElementById('footRole').innerHTML=CONFIG.DEVELOPER_ROLE+' · '+CONFIG.SCHOOL_DISTRICT;
  document.getElementById('footVer').innerHTML='<i class="ti ti-version"></i> '+CONFIG.VERSION;
  // ปุ่มกลับหน้าสาธารณะ (admin อยู่ใน /admin/ จึงกลับด้วย ../)
  const publicUrl = (CONFIG.PUBLIC_URL) ? CONFIG.PUBLIC_URL : '../';
  const lb=document.getElementById('loginBackPublic'); if(lb) lb.href=publicUrl;
  const nb=document.getElementById('navBackPublic'); if(nb) nb.href=publicUrl;
}

function boot(){
  initConfig();
  // ตรวจ token ที่เก็บไว้
  // ล้าง token เก่าที่เคยเก็บค้างไว้ใน localStorage (จากเวอร์ชันก่อน)
  try{ localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_USER); }catch(e){}
  const t=SS.getItem(LS_TOKEN);
  const u=SS.getItem(LS_USER);
  if(t&&u){
    A.token=t; A.user=JSON.parse(u);
    enterApp();
  }else{
    showLogin();
  }
  bindLogin();
}

// ============================================================
//  Login
// ============================================================
function showLogin(){
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('app').classList.remove('show');
}
function bindLogin(){
  document.getElementById('btnLogin').addEventListener('click', doLogin);
  document.getElementById('loginPass').addEventListener('keydown',e=>{ if(e.key==='Enter') doLogin(); });
}
async function doLogin(){
  const btn=document.getElementById('btnLogin');
  const err=document.getElementById('loginErr');
  const username=document.getElementById('loginUser').value.trim();
  const password=document.getElementById('loginPass').value;
  if(!username||!password){ showLoginErr('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'); return; }

  btn.disabled=true; btn.innerHTML='<i class="ti ti-loader-2"></i> กำลังตรวจสอบ...';
  err.classList.remove('show');
  NL.loading();
  try{
    const r=await apiPost({action:'login',username,password});
    if(r.success){
      A.token=r.token; A.user=r.user;
      SS.setItem(LS_TOKEN,r.token);
      SS.setItem(LS_USER,JSON.stringify(r.user));
      enterApp();
    }else{
      showLoginErr(r.error||'เข้าสู่ระบบไม่สำเร็จ');
    }
  }catch(e){
    showLoginErr('เชื่อมต่อไม่สำเร็จ ตรวจสอบ API_URL ใน config.js');
  }
  NL.close();
  btn.disabled=false; btn.innerHTML='<i class="ti ti-login-2"></i> เข้าสู่ระบบ';
}
function showLoginErr(msg){
  const err=document.getElementById('loginErr');
  err.textContent=msg; err.classList.add('show');
}

function enterApp(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('app').classList.add('show');
  // user info
  document.getElementById('userName').textContent=A.user.name||A.user.username;
  document.getElementById('userAvatar').textContent=(A.user.name||A.user.username).charAt(0);
  bindNav();
  // โหลดพร้อมกัน ไม่ต้องรอทีละอย่าง
  Promise.all([ loadDashboard(), loadListData() ]);
}

function logout(){
  SS.removeItem(LS_TOKEN);
  SS.removeItem(LS_USER);
  try{ localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_USER); }catch(e){}
  A.token=null; A.user=null;
  location.reload();
}

// ============================================================
//  Navigation
// ============================================================
function bindNav(){
  // ไล่ปรากฏเมนูด้านข้าง
  document.querySelectorAll('.sidebar .nav-item').forEach((el,i)=>{ el.style.animationDelay=(i*55)+'ms'; });
  document.querySelectorAll('.nav-item[data-page]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const page=btn.dataset.page;
      // กดเมนู "เพิ่มฉบับใหม่" จากแถบข้าง = สร้างใหม่เสมอ จึงล้าง editingId
      if(page==='form') A.editingId=null;
      switchPage(page);
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('sidebar').classList.remove('open');
    });
  });
  document.getElementById('btnLogout').addEventListener('click',logout);
}

// activatePageMenu: ไฮไลต์เมนูโดยไม่ผ่าน logic ล้างค่า (ใช้ตอนแก้ไข)
function activatePageMenu(page){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const btn=document.querySelector('.nav-item[data-page='+page+']');
  if(btn) btn.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');
}

function switchPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('show'));
  document.getElementById('page-'+page).classList.add('show');
  if(page==='dashboard') loadDashboard();
  if(page==='list') renderListPage();
  if(page==='form') renderFormPage(); // ไม่ล้าง editingId ที่นี่แล้ว
  if(page==='settings') renderSettingsPage();
}

// ============================================================
//  Dashboard
// ============================================================
let _dashLoadedOnce=false;
async function loadDashboard(){
  if(!_dashLoadedOnce) NL.loading();
  const el=document.getElementById('page-dashboard');
  try{
    const r=await apiGet('stats',{token:A.token});
    if(!r.success){
      NL.close();
      if(r.error&&r.error.indexOf('เข้าสู่ระบบ')!==-1){ logout(); return; }
      el.innerHTML='<div class="loading-row">โหลดสถิติไม่สำเร็จ: '+(r.error||'')+'</div>';
      return;
    }
    el.innerHTML=renderDashboard(r.data);
    drawTrendChart(r.data.monthlyTrend);
    animateCounters(el);
    _dashLoadedOnce=true;
    // ตัวเลขกลางวงกลม (SVG) นับขึ้นด้วย
    const dn=document.getElementById('donutNum');
    if(dn){ dn.classList.add('count-up'); dn.dataset.target=r.data.publishedCount; animateCounters(el); }
    NL.close();
  }catch(e){
    NL.close();
    el.innerHTML='<div class="loading-row">เชื่อมต่อไม่สำเร็จ</div>';
  }
}

function renderDashboard(d){
  const featured = d.topItems.find(t=>t.isFeatured); // อาจไม่มี
  const catColors=['#1E40AF','#059669','#B45309','#EC4899','#7C3AED'];
  // donut
  const total=d.byCategory.reduce((s,c)=>s+c.count,0)||1;
  let offset=0;
  const donut=d.byCategory.map((c,i)=>{
    const pct=(c.count/total)*314;
    const seg=`<circle cx="70" cy="70" r="50" fill="transparent" stroke="${c.color}" stroke-width="18" stroke-dasharray="${pct} 314" stroke-dashoffset="${-offset}" transform="rotate(-90 70 70)"/>`;
    offset+=pct; return seg;
  }).join('');
  const legend=d.byCategory.map(c=>`<div class="legend-row"><span><span style="color:${c.color}">●</span> ${esc(c.name)}</span><span class="count-up" data-target="${c.count}">0</span></div>`).join('');

  const topRows=d.topItems.map((t,i)=>{
    const bg=i===0?'linear-gradient(135deg,#F59E0B,#EF4444)':i===1?'linear-gradient(135deg,#3B82F6,#8B5CF6)':'#94A3B8';
    return `<div class="rank-row fade-up" style="animation-delay:${300+i*70}ms"><div class="rank-num" style="background:${bg}">${i+1}</div>
      <div class="rank-info"><div class="rank-title">${esc(t.title)}</div><div class="rank-meta"><span class="count-up" data-target="${t.viewCount}">0</span> ยอดดู · <span class="count-up" data-target="${t.downloadCount}">0</span> ดาวน์โหลด</div></div></div>`;
  }).join('') || '<div style="font-size:12px;color:#94A3B8;padding:8px">ยังไม่มีข้อมูล</div>';

  return `
  <div class="page-head">
    <div>
      <div class="page-title display">ภาพรวมระบบ</div>
      <div class="page-sub"><span style="color:#059669">●</span> ข้อมูลสด · อัพเดตล่าสุดเมื่อสักครู่</div>
    </div>
    <button class="menu-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')"><i class="ti ti-menu-2"></i></button>
  </div>

  <div class="stat-grid">
    ${statCard('#DBEAFE','#1E40AF','ti-news','ทั้งหมด',d.totalNewsletters,'ฉบับ', d.draftCount+' ฉบับเป็นร่าง','#B45309',0)}
    ${statCard('#D1FAE5','#059669','ti-circle-check','เผยแพร่แล้ว',d.publishedCount,'','','',1)}
    ${statCard('#EDE9FE','#7C3AED','ti-eye','ยอดดูรวม',d.totalViews,'','','',2)}
    ${statCard('#FEF3C7','#B45309','ti-download','ดาวน์โหลด',d.totalDownloads,'','','',3)}
  </div>

  <div class="chart-grid">
    <div class="panel fade-up" style="animation-delay:380ms">
      <div class="panel-title">แนวโน้มการเข้าชม (6 เดือนล่าสุด)</div>
      <canvas id="trendChart" height="150"></canvas>
    </div>
    <div class="panel fade-up" style="animation-delay:460ms">
      <div class="panel-title">แยกตามหมวดหมู่</div>
      <svg width="100%" height="130" viewBox="0 0 140 140" style="max-width:140px;margin:0 auto;display:block">
        <circle cx="70" cy="70" r="50" fill="transparent" stroke="#F1F5F9" stroke-width="18"/>
        ${donut}
        <text x="70" y="68" text-anchor="middle" font-size="22" font-weight="600" fill="#0F172A" id="donutNum">0</text>
        <text x="70" y="84" text-anchor="middle" font-size="9" fill="#94A3B8">เผยแพร่</text>
      </svg>
      <div class="legend">${legend}</div>
    </div>
  </div>

  <div class="bottom-grid">
    <div class="panel fade-up" style="animation-delay:540ms">
      <div class="panel-title"><i class="ti ti-flame" style="color:#F59E0B"></i> ฉบับยอดนิยม</div>
      ${topRows}
    </div>
    <div class="panel fade-up" style="animation-delay:620ms">
      <div class="panel-title"><i class="ti ti-bolt" style="color:#3B82F6"></i> เริ่มต้นใช้งาน</div>
      <div style="font-size:12px;color:#475569;line-height:1.9">
        <div style="padding:8px;background:#F8FAFC;border-radius:6px;margin-bottom:6px;cursor:pointer" onclick="goToForm()"><i class="ti ti-plus" style="color:#1E40AF"></i> เพิ่มจดหมายข่าวฉบับใหม่</div>
        <div style="padding:8px;background:#F8FAFC;border-radius:6px;margin-bottom:6px;cursor:pointer" onclick="document.querySelector('[data-page=list]').click()"><i class="ti ti-news" style="color:#059669"></i> จัดการจดหมายข่าวทั้งหมด</div>
        <div style="padding:8px;background:#F8FAFC;border-radius:6px;cursor:pointer" onclick="document.querySelector('[data-page=settings]').click()"><i class="ti ti-key" style="color:#B45309"></i> เปลี่ยนรหัสผ่าน</div>
      </div>
    </div>
  </div>`;
}

function statCard(bg,fg,ico,label,num,unit,sub,subColor,idx){
  return `<div class="stat-card fade-up" style="animation-delay:${(idx||0)*90}ms">
    <div class="stat-card-top"><div class="stat-ico" style="background:${bg};color:${fg}"><i class="ti ${ico}"></i></div><div class="stat-card-label">${label}</div></div>
    <div class="stat-card-val"><span class="count-up" data-target="${num||0}">0</span>${unit?`<span class="stat-unit"> ${unit}</span>`:''}</div>
    ${sub?`<div class="stat-card-sub" style="color:${subColor}">${sub}</div>`:''}
  </div>`;
}

// ===== ตัวเลขนับขึ้นแบบนุ่มนวล (count-up) =====
function animateCounters(root){
  const els=(root||document).querySelectorAll('.count-up:not([data-done])');
  els.forEach(el=>{
    const target=parseFloat(el.dataset.target)||0;
    el.setAttribute('data-done','1');
    if(target===0){ el.textContent='0'; return; }
    const dur=1200, t0=performance.now();
    function step(now){
      const p=Math.min(1,(now-t0)/dur);
      const eased=1-Math.pow(1-p,3);           // ease-out cubic
      el.textContent=Math.round(target*eased).toLocaleString();
      if(p<1) requestAnimationFrame(step);
      else el.textContent=target.toLocaleString();
    }
    requestAnimationFrame(step);
  });
}

// วาดกราฟเส้นด้วย canvas (ไม่ต้องพึ่ง library)
function drawTrendChart(trend){
  const cv=document.getElementById('trendChart');
  if(!cv||!trend) return;
  const ctx=cv.getContext('2d');
  const W=cv.width=cv.offsetWidth, H=cv.height=150;
  ctx.clearRect(0,0,W,H);
  const pad=24;
  const maxV=Math.max(1,...trend.map(t=>Math.max(t.views,t.downloads)));
  // เส้น grid
  ctx.strokeStyle='#F1F5F9'; ctx.lineWidth=1;
  for(let i=0;i<=3;i++){ const y=pad+(H-pad*2)*i/3; ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }
  const px=i=>pad+(W-pad*2)*i/(trend.length-1||1);
  const py=v=>H-pad-(H-pad*2)*(v/maxV);
  // views
  drawLine(ctx,trend.map((t,i)=>[px(i),py(t.views)]),'#3B82F6',true);
  // downloads
  drawLine(ctx,trend.map((t,i)=>[px(i),py(t.downloads)]),'#F59E0B',false);
  // labels
  ctx.fillStyle='#94A3B8'; ctx.font='9px Sarabun'; ctx.textAlign='center';
  trend.forEach((t,i)=>ctx.fillText(t.label,px(i),H-6));
}
function drawLine(ctx,pts,color,fill){
  ctx.strokeStyle=color; ctx.lineWidth=2; ctx.beginPath();
  pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.stroke();
  pts.forEach(p=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(p[0],p[1],3,0,7);ctx.fill();});
}

function goToForm(){ document.querySelector('[data-page=form]').click(); }

// ============================================================
//  List page
// ============================================================
async function loadListData(){
  try{
    const r=await apiGet('list',{token:A.token,page:A.page,pageSize:A.pageSize,search:A.search,category:A.category,status:A.status});
    if(r.success){
      A.list=r.data; A.pagination=r.pagination;
      const nc=document.getElementById('navCount');
      nc.classList.add('count-up'); nc.dataset.target=r.pagination.totalItems;
      nc.removeAttribute('data-done'); animateCounters(nc.parentNode);
    }
    return r;
  }catch(e){ return {success:false}; }
}

async function renderListPage(){
  const el=document.getElementById('page-list');
  el.innerHTML=`
  <div class="page-head">
    <div><div class="page-title display">จัดการจดหมายข่าว</div><div class="page-sub">เพิ่ม แก้ไข ลบ และตั้งฉบับเด่น</div></div>
    <button class="btn btn-primary" onclick="goToForm()"><i class="ti ti-plus"></i> เพิ่มฉบับใหม่</button>
  </div>
  <div class="toolbar2">
    <input type="text" id="listSearch" placeholder="ค้นหาด้วยชื่อ หรือ แท็ก..." value="${esc(A.search)}">
    <select id="listCat"><option value="all">หมวดหมู่: ทั้งหมด</option>${A.categories.map(c=>`<option value="${c.id}" ${A.category===c.id?'selected':''}>${c.name}</option>`).join('')}</select>
    <select id="listStatus">
      <option value="all" ${A.status==='all'?'selected':''}>สถานะ: ทั้งหมด</option>
      <option value="published" ${A.status==='published'?'selected':''}>เผยแพร่</option>
      <option value="draft" ${A.status==='draft'?'selected':''}>ร่าง</option>
      <option value="archived" ${A.status==='archived'?'selected':''}>ถังเก็บ</option>
    </select>
  </div>
  <div class="table-wrap" id="listTableWrap"><div class="loading-row"><div class="spinner"></div>กำลังโหลด...</div></div>`;

  // bind filter
  let t;
  document.getElementById('listSearch').addEventListener('input',e=>{clearTimeout(t);t=setTimeout(()=>{A.search=e.target.value;A.page=1;refreshList();},400);});
  document.getElementById('listCat').addEventListener('change',e=>{A.category=e.target.value;A.page=1;refreshList();});
  document.getElementById('listStatus').addEventListener('change',e=>{A.status=e.target.value;A.page=1;refreshList();});

  refreshList();
}

async function refreshList(){
  const wrap=document.getElementById('listTableWrap');
  if(!wrap) return;
  const r=await loadListData();
  if(!r.success){ wrap.innerHTML='<div class="loading-row">โหลดไม่สำเร็จ</div>'; return; }
  if(r.data.length===0){ wrap.innerHTML='<div class="loading-row"><i class="ti ti-inbox" style="font-size:32px"></i><br>ไม่พบจดหมายข่าว</div>'; return; }

  const rows=r.data.map((it,i)=>renderListRow(it,i)).join('');
  wrap.innerHTML=`<table>
    <thead><tr><th style="width:38%">หัวข้อ</th><th>หมวดหมู่</th><th>สถานะ</th><th style="text-align:right">ยอดดู</th><th style="text-align:right">วันที่</th><th style="text-align:center">จัดการ</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>${renderListPagination(r.pagination)}`;
}

function renderListRow(it,idx){
  const cat=A.catMap[it.category]||{name:it.category,color:'#64748B'};
  const statusMap={published:['#059669','เผยแพร่'],draft:['#B45309','ร่าง'],archived:['#94A3B8','ถังเก็บ']};
  const st=statusMap[it.status]||['#94A3B8',it.status];
  const cover=it.coverImageUrl?`<img src="${it.coverImageUrl}" alt="">`:`<i class="ti ti-photo" style="color:${cat.color};font-size:13px"></i>`;
  const coverBg=it.coverImageUrl?'':`background:${tint(cat.color)}`;
  const star=it.isFeatured?` · <i class="ti ti-star-filled" style="color:#F59E0B;font-size:9px"></i> เด่น`:'';
  // ปุ่มจัดการ: ถ้าอยู่ในถังเก็บ แสดงปุ่มกู้คืน + ลบถาวร; ปกติแสดงปุ่มเด่น/แก้ไข/ลบ
  let actions;
  if(it.status==='archived'){
    actions=`
      <i class="ti ti-refresh actions-restore" title="กู้คืน" onclick="restoreItem('${it.id}')"></i>
      <i class="ti ti-trash-x actions-purge" title="ลบถาวร" onclick="confirmPurge('${it.id}','${esc(it.title)}')"></i>`;
  }else{
    actions=`
      <i class="ti ti-star${it.isFeatured?'-filled':''} actions-star" title="ตั้งเด่น" onclick="toggleFeatured('${it.id}',${!it.isFeatured})"></i>
      <i class="ti ti-edit actions-edit" title="แก้ไข" onclick="editItem('${it.id}')"></i>
      <i class="ti ti-trash actions-del" title="ย้ายไปถังเก็บ" onclick="confirmDelete('${it.id}','${esc(it.title)}')"></i>`;
  }
  return `<tr style="animation-delay:${(idx||0)*45}ms">
    <td><div class="t-title"><div class="t-cover" style="${coverBg}">${cover}</div>
      <div style="min-width:0"><div class="t-name">${esc(it.title)}</div><div class="t-sub">${it.hasPdf?'<i class="ti ti-file"></i> PDF':'ไม่มี PDF'}${star}</div></div></div></td>
    <td><span class="cat-pill" style="background:${tint(cat.color)};color:${cat.color}">${esc(cat.name)}</span></td>
    <td><span class="status-dot" style="color:${st[0]}">● ${st[1]}</span></td>
    <td style="text-align:right">${it.status==='draft'?'—':it.viewCount}</td>
    <td style="text-align:right;color:#94A3B8;font-size:10px">${it.publishedAtThai||'—'}</td>
    <td style="text-align:center" class="t-actions">${actions}</td>
  </tr>`;
}

function renderListPagination(pg){
  if(!pg) return '';
  const start=pg.totalItems?(pg.currentPage-1)*pg.pageSize+1:0;
  const end=Math.min(pg.currentPage*pg.pageSize,pg.totalItems);
  const range=pageRange(pg.currentPage,pg.totalPages);
  let btns=`<button class="pg2-btn" ${!pg.hasPrev?'disabled':''} onclick="goListPage(${pg.currentPage-1})"><i class="ti ti-chevron-left"></i></button>`;
  range.forEach(p=>{ btns+= p==='...'?'<span style="padding:0 4px;color:#94A3B8">...</span>':`<button class="pg2-btn ${p===pg.currentPage?'active':''}" onclick="goListPage(${p})">${p}</button>`; });
  btns+=`<button class="pg2-btn" ${!pg.hasNext?'disabled':''} onclick="goListPage(${pg.currentPage+1})"><i class="ti ti-chevron-right"></i></button>`;
  return `<div class="pagination2">
    <div class="pg-info">แสดง <b>${start}-${end}</b> จาก <b>${pg.totalItems}</b> รายการ
      <select onchange="A.pageSize=+this.value;A.page=1;refreshList()">
        ${[10,25,50,100].map(n=>`<option ${pg.pageSize===n?'selected':''}>${n}</option>`).join('')}
      </select></div>
    <div class="pg-btns">${btns}</div>
  </div>`;
}
function goListPage(p){ A.page=p; refreshList(); }

// ============================================================
//  Featured / Delete actions
// ============================================================
async function toggleFeatured(id,makeFeatured){
  const r=await apiPost({action:'setFeatured',token:A.token,id:makeFeatured?id:null});
  if(r.success){ toast(makeFeatured?'ตั้งเป็นฉบับเด่นแล้ว':'ยกเลิกฉบับเด่นแล้ว','success'); refreshList(); }
  else toast(r.error||'ไม่สำเร็จ','error');
}

function confirmDelete(id,title){
  showDialog(`
    <div class="dialog-title"><i class="ti ti-trash" style="color:#DC2626"></i> ยืนยันการลบ</div>
    <div class="dialog-text">ต้องการลบ "<b>${title}</b>" ใช่หรือไม่?<br><span style="font-size:11px;color:#94A3B8">ระบบจะย้ายไปถังเก็บ (สามารถกู้คืนได้)</span></div>
    <div class="dialog-actions">
      <button class="btn btn-outline" onclick="closeDialog()">ยกเลิก</button>
      <button class="btn btn-danger" onclick="doDelete('${id}')"><i class="ti ti-trash"></i> ลบ</button>
    </div>`);
}
async function doDelete(id){
  closeDialog();
  const r=await apiPost({action:'delete',token:A.token,id:id});
  NL.close();
  if(r.success){ toast('ย้ายไปถังเก็บแล้ว','success'); refreshList(); loadListData(); }
  else toast(r.error||'ลบไม่สำเร็จ','error');
}

// กู้คืนจากถังเก็บ (เปลี่ยนสถานะกลับเป็น draft)
async function restoreItem(id){
  const r=await apiPost({action:'update',token:A.token,id:id,status:'draft'});
  NL.close();
  if(r.success){ toast('กู้คืนเรียบร้อย (เป็นสถานะร่าง)','success'); refreshList(); loadListData(); }
  else toast(r.error||'กู้คืนไม่สำเร็จ','error');
}

// ยืนยันลบถาวร
function confirmPurge(id,title){
  showDialog(`
    <div class="dialog-title"><i class="ti ti-trash-x" style="color:#991B1B"></i> ลบถาวร</div>
    <div class="dialog-text">ต้องการลบ "<b>${title}</b>" <b style="color:#991B1B">ออกถาวร</b> ใช่หรือไม่?<br><span style="font-size:11px;color:#94A3B8">⚠️ การลบถาวรจะลบทั้งข้อมูลและไฟล์ (รูป + PDF) ออกจาก Drive และ<b>กู้คืนไม่ได้</b></span></div>
    <div class="dialog-actions">
      <button class="btn btn-outline" onclick="closeDialog()">ยกเลิก</button>
      <button class="btn btn-danger" onclick="doPurge('${id}')"><i class="ti ti-trash-x"></i> ลบถาวร</button>
    </div>`);
}
async function doPurge(id){
  closeDialog();
  const r=await apiPost({action:'delete',token:A.token,id:id,hard:true});
  NL.close();
  if(r.success){ toast('ลบถาวรเรียบร้อย','success'); refreshList(); loadListData(); }
  else toast(r.error||'ลบไม่สำเร็จ','error');
}

// ============================================================
//  Form (create / edit)
// ============================================================
async function editItem(id){
  A.editingId=id;
  switchPage('form');          // เรียกตรง ไม่ผ่าน .click() ที่จะล้าง editingId
  activatePageMenu('form');    // ไฮไลต์เมนูเฉย ๆ
  // โหลดข้อมูลเดิม
  const r=await apiGet('get',{id:id});
  if(r.success) fillForm(r.data);
}

function renderFormPage(){
  A.formCover=null; A.formPdf=null; A.formGallery=[]; A.formCoverPos='50% 50%';
  const isEdit=!!A.editingId;
  const el=document.getElementById('page-form');
  el.innerHTML=`
  <div class="page-head">
    <div><div class="page-title display">${isEdit?'แก้ไขจดหมายข่าว':'เพิ่มจดหมายข่าวใหม่'}</div>
      <div class="page-sub">${isEdit?'แก้ไขข้อมูลแล้วกดบันทึก':'กรอกข้อมูลเพื่อสร้างจดหมายข่าว'}</div></div>
  </div>
  <div class="form-card">
    <div class="form-field">
      <label>หัวข้อ <span class="req">*</span></label>
      <input type="text" id="fTitle" placeholder="เช่น ประกาศวันหยุดประจำเดือน...">
    </div>
    <div class="form-row">
      <div class="form-field" style="margin-bottom:0">
        <label>หมวดหมู่</label>
        <select id="fCategory">${A.categories.map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select>
      </div>
      <div class="form-field" style="margin-bottom:0">
        <label>สถานะ</label>
        <select id="fStatus"><option value="published">เผยแพร่ทันที</option><option value="draft">บันทึกเป็นร่าง</option></select>
      </div>
    </div>
    <div class="form-field">
      <label>เนื้อหา <span class="req">*</span></label>
      <textarea id="fContent" placeholder="เนื้อหาจดหมายข่าว..."></textarea>
    </div>
    <div class="form-row">
      <div class="form-field" style="margin-bottom:0">
        <label><i class="ti ti-photo"></i> ภาพอินโฟกราฟิก</label>
        <div class="upload-zone" id="zoneCover" onclick="document.getElementById('inpCover').click()">
          <div class="upload-hint"><i class="ti ti-cloud-upload"></i> คลิกเพื่อเลือกรูป</div>
          <div class="upload-sub">JPG, PNG · ระบบบีบขนาดอัตโนมัติ</div>
          <div id="coverPreview"></div>
        </div>
        <input type="file" id="inpCover" accept="image/*" style="display:none">
      </div>
      <div class="form-field" style="margin-bottom:0">
        <label><i class="ti ti-file-text"></i> ไฟล์ PDF แนบ</label>
        <div class="upload-zone" id="zonePdf" onclick="document.getElementById('inpPdf').click()">
          <div class="upload-hint"><i class="ti ti-cloud-upload"></i> คลิกเพื่อเลือก PDF</div>
          <div class="upload-sub">PDF · สูงสุด 8 MB</div>
          <div id="pdfPreview"></div>
        </div>
        <input type="file" id="inpPdf" accept="application/pdf" style="display:none">
      </div>
    </div>
    <div class="form-field">
      <label><i class="ti ti-photo-scan"></i> รายละเอียดเพิ่มเติม (รูปภาพ สูงสุด 6 รูป)</label>
      <div class="upload-zone" id="zoneGallery" onclick="document.getElementById('inpGallery').click()">
        <div class="upload-hint"><i class="ti ti-photo-plus"></i> คลิกเพื่อเลือกรูปหลายรูป</div>
        <div class="upload-sub">JPG, PNG · เลือกได้ครั้งละหลายรูป · ระบบบีบขนาดอัตโนมัติ</div>
      </div>
      <input type="file" id="inpGallery" accept="image/*" multiple style="display:none">
      <div id="galleryPreview" class="gallery-preview"></div>
    </div>
    <div class="form-field">
      <label>แท็ก (คั่นด้วยเครื่องหมาย ,)</label>
      <input type="text" id="fTags" placeholder="วันหยุด, ประกาศ, พฤษภาคม">
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="document.querySelector('[data-page=list]').click()">ยกเลิก</button>
      <button class="btn btn-primary" id="btnSave"><i class="ti ti-device-floppy"></i> ${isEdit?'บันทึกการแก้ไข':'บันทึกและเผยแพร่'}</button>
    </div>
  </div>`;

  // bind upload
  document.getElementById('inpCover').addEventListener('change',handleCoverSelect);
  document.getElementById('inpPdf').addEventListener('change',handlePdfSelect);
  document.getElementById('inpGallery').addEventListener('change',handleGallerySelect);
  document.getElementById('btnSave').addEventListener('click',saveForm);
}

function fillForm(d){
  document.getElementById('fTitle').value=d.title||'';
  document.getElementById('fCategory').value=d.category||'general';
  document.getElementById('fStatus').value=d.status==='draft'?'draft':'published';
  document.getElementById('fContent').value=d.content||'';
  document.getElementById('fTags').value=d.tags||'';
  if(d.coverImageUrl){
    A.formCoverPos = d.coverPos || '50% 50%';
    renderCoverAdjuster(d.coverImageUrl);
  }
  if(d.hasPdf){
    document.getElementById('pdfPreview').innerHTML=`<div class="upload-preview"><i class="ti ti-file-type-pdf" style="color:#DC2626;font-size:24px"></i><span style="font-size:11px;color:#059669">${esc(d.pdfFileName||'มีไฟล์เดิม')}</span></div>`;
  }
  // แสดงรูปแกลเลอรีเดิม (ถ้ามี) - เป็นเพียงตัวอย่าง ถ้าอัปใหม่จะแทนที่ทั้งชุด
  if(d.gallery && d.gallery.length){
    const el=document.getElementById('galleryPreview');
    el.innerHTML=`<div style="font-size:11px;color:#64748B;width:100%;margin-bottom:6px"><i class="ti ti-info-circle"></i> มีรูปเดิม ${d.gallery.length} รูป — เลือกรูปใหม่เพื่อแทนที่ทั้งชุด</div>`+
      d.gallery.map(g=>`<div class="gp-item"><img src="${g.thumb}" alt=""></div>`).join('');
  }
}

// บีบรูปในเบราว์เซอร์ก่อนอัปโหลด
function handleCoverSelect(e){
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const img=new Image();
    img.onload=()=>{
      const maxW=1600;
      let w=img.width,h=img.height;
      if(w>maxW){ h=h*maxW/w; w=maxW; }
      const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      const dataUrl=cv.toDataURL('image/jpeg',0.72);
      A.formCover={base64:dataUrl.split(',')[1],mimeType:'image/jpeg',fileName:(file.name.replace(/\.[^.]+$/,''))+'.jpg',dataUrl:dataUrl};
      A.formCoverPos='50% 50%'; // รีเซ็ตตำแหน่งเมื่อเลือกรูปใหม่
      document.getElementById('zoneCover').classList.add('has-file');
      renderCoverAdjuster(dataUrl);
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
}

// แสดงตัวปรับตำแหน่งรูปปก - ลากจุดโฟกัสได้อิสระ
function renderCoverAdjuster(imgUrl){
  const el=document.getElementById('coverPreview');
  if(!el) return;
  el.innerHTML=`
    <div class="cover-adjust-wrap">
      <div class="cover-adjust-label"><i class="ti ti-drag-drop"></i> ลากจุดสีขาวเพื่อเลือกตำแหน่งรูปที่จะแสดง</div>
      <div class="cover-adjust-frame" id="coverFrame">
        <img src="${imgUrl}" alt="" id="coverAdjImg" style="object-position:${A.formCoverPos}">
        <div class="cover-focus-dot" id="coverDot"></div>
      </div>
      <div class="cover-adjust-hint">ตัวอย่างนี้คือกรอบที่จะแสดงบนหน้าเว็บ (16:6) · <span id="coverPosText">${A.formCoverPos}</span></div>
    </div>`;
  bindCoverDrag();
}

// ระบบลากจุดโฟกัส
function bindCoverDrag(){
  const frame=document.getElementById('coverFrame');
  const dot=document.getElementById('coverDot');
  const img=document.getElementById('coverAdjImg');
  const posText=document.getElementById('coverPosText');
  if(!frame||!dot) return;

  // ตั้งตำแหน่งจุดเริ่มต้นจาก formCoverPos
  const parts=A.formCoverPos.split(' ');
  let px=parseFloat(parts[0])||50, py=parseFloat(parts[1])||50;
  function placeDot(){ dot.style.left=px+'%'; dot.style.top=py+'%'; }
  placeDot();

  let dragging=false;
  function update(clientX,clientY){
    const rect=frame.getBoundingClientRect();
    px=Math.max(0,Math.min(100,((clientX-rect.left)/rect.width)*100));
    py=Math.max(0,Math.min(100,((clientY-rect.top)/rect.height)*100));
    A.formCoverPos=Math.round(px)+'% '+Math.round(py)+'%';
    img.style.objectPosition=A.formCoverPos;
    placeDot();
    if(posText) posText.textContent=A.formCoverPos;
  }
  const start=e=>{dragging=true; const t=e.touches?e.touches[0]:e; update(t.clientX,t.clientY); e.preventDefault();};
  const move=e=>{if(!dragging)return; const t=e.touches?e.touches[0]:e; update(t.clientX,t.clientY);};
  const end=()=>{dragging=false;};
  frame.addEventListener('mousedown',start);
  frame.addEventListener('touchstart',start,{passive:false});
  window.addEventListener('mousemove',move);
  window.addEventListener('touchmove',move,{passive:false});
  window.addEventListener('mouseup',end);
  window.addEventListener('touchend',end);
}

function handlePdfSelect(e){
  const file=e.target.files[0]; if(!file) return;
  if(file.size>8*1024*1024){ toast('ไฟล์ PDF ใหญ่เกิน 8 MB','error'); e.target.value=''; return; }
  const reader=new FileReader();
  reader.onload=ev=>{
    A.formPdf={base64:ev.target.result.split(',')[1],mimeType:'application/pdf',fileName:file.name};
    document.getElementById('zonePdf').classList.add('has-file');
    document.getElementById('pdfPreview').innerHTML=`<div class="upload-preview"><i class="ti ti-file-type-pdf" style="color:#DC2626;font-size:24px"></i><span style="font-size:11px;color:#059669"><i class="ti ti-check"></i> ${esc(file.name)} (${(file.size/1048576).toFixed(1)} MB)</span></div>`;
  };
  reader.readAsDataURL(file);
}

// บีบรูป 1 ไฟล์ คืน Promise ของ {base64,mimeType,fileName,dataUrl}
function compressImage_(file){
  return new Promise((resolve)=>{
    const reader=new FileReader();
    reader.onload=ev=>{
      const img=new Image();
      img.onload=()=>{
        const maxW=1600; let w=img.width,h=img.height;
        if(w>maxW){ h=h*maxW/w; w=maxW; }
        const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
        cv.getContext('2d').drawImage(img,0,0,w,h);
        const dataUrl=cv.toDataURL('image/jpeg',0.72);
        resolve({base64:dataUrl.split(',')[1],mimeType:'image/jpeg',fileName:(file.name.replace(/\.[^.]+$/,''))+'.jpg',dataUrl:dataUrl});
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// เลือกรูปแกลเลอรีหลายรูป (สูงสุด 6)
async function handleGallerySelect(e){
  const files=Array.from(e.target.files); if(!files.length) return;
  const remain=6-A.formGallery.length;
  if(remain<=0){ toast('เพิ่มรูปได้สูงสุด 6 รูป','error'); return; }
  const toAdd=files.slice(0,remain);
  if(files.length>remain) toast('เพิ่มได้อีก '+remain+' รูป (จำกัด 6 รูป)','error');
  for(const f of toAdd){
    const img=await compressImage_(f);
    A.formGallery.push(img);
  }
  renderGalleryPreview();
  e.target.value=''; // เคลียร์เพื่อให้เลือกซ้ำได้
}

function renderGalleryPreview(){
  const el=document.getElementById('galleryPreview');
  if(!el) return;
  if(!A.formGallery.length){ el.innerHTML=''; document.getElementById('zoneGallery').classList.remove('has-file'); return; }
  document.getElementById('zoneGallery').classList.add('has-file');
  el.innerHTML=A.formGallery.map((g,i)=>
    `<div class="gp-item"><img src="${g.dataUrl||g.thumb}" alt=""><button class="gp-remove" onclick="removeGalleryImg(${i})" title="ลบรูปนี้"><i class="ti ti-x"></i></button></div>`
  ).join('') + `<div class="gp-count">${A.formGallery.length}/6 รูป</div>`;
}

function removeGalleryImg(i){
  A.formGallery.splice(i,1);
  renderGalleryPreview();
}

async function saveForm(){
  const title=document.getElementById('fTitle').value.trim();
  const content=document.getElementById('fContent').value.trim();
  if(!title||!content){ toast('กรุณากรอกหัวข้อและเนื้อหา','error'); return; }

  const btn=document.getElementById('btnSave');
  btn.disabled=true; btn.innerHTML='<i class="ti ti-loader-2"></i> กำลังบันทึก...';
  NL.loading();

  const body={
    action: A.editingId?'update':'create',
    token: A.token,
    title, content,
    category: document.getElementById('fCategory').value,
    status: document.getElementById('fStatus').value,
    tags: document.getElementById('fTags').value.trim()
  };
  if(A.editingId) body.id=A.editingId;
  if(A.formCover) body.coverImage=A.formCover;
  body.coverPos=A.formCoverPos;
  if(A.formPdf) body.pdf=A.formPdf;
  // ส่งแกลเลอรี: ถ้ามีรูปใหม่ส่ง array (แทนที่ทั้งชุด)
  if(A.formGallery && A.formGallery.length){
    body.gallery=A.formGallery.map(g=>({base64:g.base64,mimeType:g.mimeType,fileName:g.fileName}));
  }

  try{
    const r=await apiPost(body);
    NL.close();
    if(r.success){
      toast(A.editingId?'แก้ไขเรียบร้อย':'สร้างจดหมายข่าวเรียบร้อย','success');
      A.editingId=null;
      document.querySelector('[data-page=list]').click();
      loadListData();
    }else{
      toast(r.error||'บันทึกไม่สำเร็จ','error');
      btn.disabled=false; btn.innerHTML='<i class="ti ti-device-floppy"></i> บันทึก';
    }
  }catch(e){
    NL.close();
    toast('เชื่อมต่อไม่สำเร็จ','error');
    btn.disabled=false; btn.innerHTML='<i class="ti ti-device-floppy"></i> บันทึก';
  }
}

// ============================================================
//  Settings
// ============================================================
function renderSettingsPage(){
  const el=document.getElementById('page-settings');
  el.innerHTML=`
  <div class="page-head"><div><div class="page-title display">ตั้งค่า</div><div class="page-sub">จัดการบัญชีผู้ดูแล</div></div></div>
  <div class="form-card">
    <div class="panel-title"><i class="ti ti-key"></i> เปลี่ยนรหัสผ่าน</div>
    <div class="form-field"><label>รหัสผ่านเดิม</label><input type="password" id="oldPass"></div>
    <div class="form-field"><label>รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label><input type="password" id="newPass"></div>
    <div class="form-field"><label>ยืนยันรหัสผ่านใหม่</label><input type="password" id="newPass2"></div>
    <div class="form-actions"><button class="btn btn-primary" id="btnChangePass"><i class="ti ti-check"></i> เปลี่ยนรหัสผ่าน</button></div>
  </div>`;
  document.getElementById('btnChangePass').addEventListener('click',changePassword);
}
async function changePassword(){
  const oldP=document.getElementById('oldPass').value;
  const newP=document.getElementById('newPass').value;
  const newP2=document.getElementById('newPass2').value;
  if(!oldP||!newP){ toast('กรุณากรอกข้อมูลให้ครบ','error'); return; }
  if(newP!==newP2){ toast('รหัสผ่านใหม่ไม่ตรงกัน','error'); return; }
  if(newP.length<6){ toast('รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัว','error'); return; }
  const r=await apiPost({action:'changePassword',token:A.token,oldPassword:oldP,newPassword:newP});
  if(r.success){ toast('เปลี่ยนรหัสผ่านเรียบร้อย','success'); document.getElementById('oldPass').value='';document.getElementById('newPass').value='';document.getElementById('newPass2').value=''; }
  else toast(r.error||'ไม่สำเร็จ','error');
}

// ============================================================
//  Dialog / Toast / Utils
// ============================================================
function showDialog(html){ document.getElementById('dialog').innerHTML=html; document.getElementById('overlay').classList.add('show'); }
function closeDialog(){ document.getElementById('overlay').classList.remove('show'); }
// ===== ระบบแจ้งเตือน / โหลด (SweetAlert2 + วงแหวนฟ้า-แดง) =====
function ringHtml(){
  return `
  <div class="nl-ring">
    <svg viewBox="0 0 120 120">
      <defs>
        <linearGradient id="nlgrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1E40AF"/>
          <stop offset="45%" stop-color="#3B82F6"/>
          <stop offset="75%" stop-color="#EF4444"/>
          <stop offset="100%" stop-color="#DC2626"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="none" stroke="#EEF2F7" stroke-width="9"/>
      <circle cx="60" cy="60" r="52" fill="none" stroke="url(#nlgrad)" stroke-width="9"
        stroke-linecap="round" stroke-dasharray="215 327"/>
    </svg>
    <div class="nl-ring-logo">
      <img src="${CONFIG.LOGO_URL}" alt="โลโก้" onerror="this.parentNode.innerHTML='<span class=&quot;fallback&quot;>🏫</span>'">
    </div>
  </div>`;
}

const NL = {
  _timer: null,
  _shown: false,
  // แสดงวงแหวนโหลด - ขึ้นก็ต่อเมื่อโหลดนานเกิน 200ms
  loading(){
    if(!window.Swal) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(()=>{
      if(Swal.isVisible()) return;
      this._shown = true;
      Swal.fire({
        html: ringHtml(),
        customClass:{popup:'nl-plain', container:'nl-blur'},
        background:'transparent',
        backdrop:false,
        allowOutsideClick:false, allowEscapeKey:false, showConfirmButton:false,
        showClass:{popup:'', backdrop:''},
        hideClass:{popup:'', backdrop:''}
      });
    }, 200);
  },
  close(){
    clearTimeout(this._timer);
    if(window.Swal && this._shown){ Swal.close(); this._shown=false; }
    else if(window.Swal && Swal.isVisible()){ Swal.close(); }
  }
};

// toast แบบเดิม แต่ใช้ SweetAlert2
function toast(msg,type){
  if(!window.Swal){ alert(msg); return; }
  if(type==='error'){
    Swal.fire({icon:'error',title:'ไม่สำเร็จ',text:msg,confirmButtonColor:'#1E40AF',customClass:{popup:'nl-swal'}});
  }else{
    Swal.fire({toast:true,position:'bottom',timer:2600,showConfirmButton:false,icon:type||'success',title:msg,customClass:{popup:'nl-swal'}});
  }
}
function esc(s){ return (s||'').toString().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function tint(hex){ const m={'#1E40AF':'#EFF6FF','#059669':'#F0FDF4','#B45309':'#FFFBEB','#BE185D':'#FDF2F8','#EC4899':'#FDF2F8','#7C3AED':'#F5F3FF'}; return m[hex]||'#F1F5F9'; }
function pageRange(cur,total){ const r=[];const d=1; for(let i=1;i<=total;i++){ if(i===1||i===total||(i>=cur-d&&i<=cur+d))r.push(i); else if(r[r.length-1]!=='...')r.push('...'); } return r; }

// โหลดหมวดหมู่ตอนเริ่ม (ใช้ทั้ง list และ form)
async function loadCategoriesOnce(){
  const r=await apiGet('categories');
  if(r.success){ A.categories=r.data; r.data.forEach(c=>A.catMap[c.id]={name:c.name,color:c.color,icon:c.icon}); }
}

// ===== เริ่มทำงาน =====
(async function(){
  await loadCategoriesOnce();
  boot();
  // ปิด dialog เมื่อคลิกพื้นหลัง
  document.getElementById('overlay').addEventListener('click',e=>{if(e.target.id==='overlay')closeDialog();});
})();
