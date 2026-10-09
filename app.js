const C=window.FC_CONFIG||{};const API=(C.supabaseUrl||'').replace(/\/$/,'');const KEY=C.supabaseKey||'';let session=null,siteSettings={},state={role:null,view:'home',data:{}};
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function toast(msg,type=''){const d=document.createElement('div');d.className='toast '+type;d.textContent=msg;document.querySelector('#toast').appendChild(d);setTimeout(()=>d.remove(),3000)}
async function api(path,opts={}){const h={'apikey':KEY,'Authorization':`Bearer ${session?.access_token||KEY}`,'Content-Type':'application/json',...(opts.headers||{})};const r=await fetch(API+'/rest/v1/'+path,{...opts,headers:h});if(!r.ok){let t=await r.text();throw Error(t||r.statusText)}return r.status===204?null:r.json()}
async function auth(path,body){const r=await fetch(API+'/auth/v1/'+path,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(j.msg||j.error_description||j.message||'حدث خطأ');return j}
function saveSession(s){session=s;localStorage.setItem('fc_session',JSON.stringify(s))}function clearSession(){session=null;localStorage.removeItem('fc_session')}
function logo(){const b=siteSettings.brand||{};return `<div class="brand-mini">${b.logo_url?`<img src="${esc(b.logo_url)}" alt="" style="width:42px;height:42px;object-fit:contain;border-radius:12px">`:'<div class="mark">FC</div>'}<b>${esc(b.name||'Future Center')}</b></div>`}
function layout(content,nav=''){return `<div class="shell"><header class="topbar card">${logo()}<nav class="nav">${nav}</nav><button class="btn secondary" onclick="logout()">خروج</button></header><main class="page">${content}</main></div>`}
function authView(mode='login'){const b=siteSettings.brand||{};return `<div class="auth"><div class="auth-card card"><div class="brand">${b.logo_url?`<img src="${esc(b.logo_url)}" alt="" style="width:76px;height:76px;object-fit:contain;margin:auto">`:'<div class="brand-mark">FC</div>'}<h1>${esc(b.name||'Future Center')}</h1><p>${esc(b.subtitle|| (mode==='login'?'تسجيل الدخول إلى المنصة':'منصتك التعليمية'))}</p></div>${mode==='login'?loginForm():registerForm()}</div></div>`}
function loginForm(){return `<form onsubmit="doLogin(event)"><div class="field"><label>البريد الإلكتروني</label><input class="input" id="email" type="email" required autocomplete="email"></div><div class="field"><label>كلمة المرور</label><input class="input" id="password" type="password" required autocomplete="current-password"></div><button class="btn primary btn-wide">دخول</button><button type="button" class="link" onclick="state.view='register';render()">إنشاء حساب طالب</button></form>`}
function registerForm(){return `<form onsubmit="doRegister(event)"><div class="field"><label>الاسم بالكامل</label><input class="input" id="full_name" required></div><div class="field"><label>البريد الإلكتروني</label><input class="input" id="email" type="email" required></div><div class="field"><label>رقم الهاتف</label><input class="input" id="phone"></div><div class="field"><label>كلمة المرور</label><input class="input" id="password" type="password" minlength="6" required></div><div class="field"><label>الدولة</label><select class="select" id="country_id" onchange="loadUniversities(this.value)" required><option value="">اختر الدولة</option></select></div><div class="field"><label>الجامعة</label><select class="select" id="university_id" onchange="loadStages(this.value)" required><option value="">اختر الجامعة</option></select></div><div class="field"><label>المرحلة</label><select class="select" id="stage_id" required><option value="">اختر المرحلة</option></select></div><button class="btn primary btn-wide">إنشاء الحساب</button><button type="button" class="link" onclick="state.view='login';render()">لدي حساب بالفعل</button></form>`}
async function loadRegisterOptions(){try{const cs=await api('countries?select=id,name&active=eq.true&order=name.asc');document.querySelector('#country_id').innerHTML='<option value="">اختر الدولة</option>'+cs.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}catch(e){toast('تعذر تحميل الدول','err')}}
async function loadUniversities(id){const el=document.querySelector('#university_id'),st=document.querySelector('#stage_id');el.innerHTML='<option>جاري التحميل...</option>';st.innerHTML='<option value="">اختر المرحلة</option>';if(!id)return;try{const x=await api(`universities?select=id,name&country_id=eq.${encodeURIComponent(id)}&active=eq.true&order=name.asc`);el.innerHTML='<option value="">اختر الجامعة</option>'+x.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}catch(e){toast('تعذر تحميل الجامعات','err')}}
async function loadStages(id){const el=document.querySelector('#stage_id');el.innerHTML='<option value="">اختر المرحلة</option>';if(!id)return;try{const x=await api(`stages?select=id,name&university_id=eq.${encodeURIComponent(id)}&active=eq.true&order=name.asc`);el.innerHTML='<option value="">اختر المرحلة</option>'+x.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}catch(e){toast('تعذر تحميل المراحل','err')}}
async function doLogin(e){e.preventDefault();try{const j=await auth('token?grant_type=password',{email:email.value,password:password.value});saveSession(j);await chooseRole();}catch(x){toast(x.message,'err')}}
async function doRegister(e){e.preventDefault();try{const body={email:email.value,password:password.value,data:{full_name:full_name.value,phone:phone.value,country_id:country_id.value,university_id:university_id.value,stage_id:stage_id.value}};const j=await auth('signup',body);const user=j.user||(j.id?j:null);const authSession=j.session||j;if(authSession?.access_token&&user){saveSession({...authSession,user});toast('تم إنشاء الحساب بنجاح','ok');await chooseRole()}else{state.view='login';render();toast('تم إنشاء الحساب. راجع بريدك الإلكتروني لتفعيل الحساب ثم سجّل الدخول.','ok')}}catch(x){toast(x.message,'err')}}
async function chooseRole(){
  state.role='student';
  state.view='home';
  try{
    const roles=await api(`user_roles?select=role&user_id=eq.${encodeURIComponent(session.user.id)}&order=role.asc`);
    const names=(roles||[]).map(x=>String(x.role||'').toLowerCase());
    if(names.includes('admin')) state.role='admin';
    else if(names.includes('lecturer')) state.role='lecturer';
    else {
      try{
        const lp=await api(`lecturers?select=id&auth_user_id=eq.${encodeURIComponent(session.user.id)}&active=eq.true&limit=1`);
        state.role=lp?.length?'lecturer':'student';
      }catch{state.role='student'}
    }
  }catch(e){
    try{
      const lp=await api(`lecturers?select=id&auth_user_id=eq.${encodeURIComponent(session.user.id)}&active=eq.true&limit=1`);
      if(lp?.length) state.role='lecturer';
      else {
        const st=await api(`students?select=id&auth_user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`);
        state.role=st?.length?'student':'student';
      }
    }catch{state.role='student'}
  }
  try{ await render(); }catch(e){ state.role='student'; try{await render()}catch{} }
}
function navFor(role){
  if(role==='student') return `<button class="${state.view==='home'?'active':''}" onclick="go('home')">الرئيسية</button><button class="${state.view==='courses'?'active':''}" onclick="go('courses')">كورساتي</button><button class="${state.view==='catalog'?'active':''}" onclick="go('catalog')">كل الكورسات</button><button class="${state.view==='lecturers'?'active':''}" onclick="go('lecturers')">الدكاترة</button><button class="${state.view==='profile'?'active':''}" onclick="go('profile')">حسابي</button>`;
  if(role==='lecturer') return `<button class="${state.view==='home'?'active':''}" onclick="go('home')">لوحتي</button><button class="${state.view==='mycourses'?'active':''}" onclick="go('mycourses')">كورساتي</button><button class="${state.view==='profile'?'active':''}" onclick="go('profile')">حسابي</button>`;
  return `<button class="active">لوحة الإدارة</button>`;
}
function go(v,id){state.view=v;if(id)state.data.id=id;render()}
async function render(){
  if(!session){
    document.querySelector('#app').innerHTML=authView(state.view==='register'?'register':'login');
    if(state.view==='register') loadRegisterOptions();
    return;
  }
  let html='';
  if(state.role==='student') html=await studentPage();
  else if(state.role==='lecturer') { html=await lecturerPage(); if(state.view==='lecturerlecture' || state.view==='lecture') html=await lecturerLecturePage(state.data.id); }
  else if(state.role==='admin') html=await adminPage();
  else html=await studentPage();
  document.querySelector('#app').innerHTML=layout(html,navFor(state.role));
}
async function studentPage(){if(state.view==='home'){const b=siteSettings.brand||{},h=siteSettings.home||{};return `<section class="hero card"><div class="row" style="align-items:center;gap:18px;flex-wrap:wrap"><div style="flex:1;min-width:220px"><h2>${esc(h.title||('أهلاً بيك في '+(b.name||'Future Center')))}</h2><p class="muted">${esc(h.subtitle||'كل كورساتك ومحاضراتك في مكان واحد.')}</p></div>${h.image_url?`<img src="${esc(h.image_url)}" alt="" style="width:min(220px,100%);max-height:150px;object-fit:contain;border-radius:16px">`:''}</div><div class="grid2"><div class="stat card"><small>كورساتي</small><div class="num">${await count('student_courses')}</div></div><div class="stat card"><small>المحاضرات المتاحة</small><div class="num">${await count('lectures')}</div></div></div></section>`}if(state.view==='courses')return coursesPage(true);if(state.view==='catalog')return coursesPage(false);if(state.view==='lecturers')return lecturersPage();if(state.view==='profile')return profilePage();if(state.view==='course')return coursePage(state.data.id);if(state.view==='lecture')return lecturePage(state.data.id);return ''}
async function lecturerPage(){
  let courses=[];
  try{
    const me=await api(`lecturers?select=id,full_name,email,active&auth_user_id=eq.${encodeURIComponent(session.user.id)}&active=eq.true&limit=1`);
    const lecturer=me?.[0];
    if(!lecturer) return `<section class="hero card"><h2>حساب المحاضر غير مكتمل</h2><p class="muted">لم يتم ربط حسابك بملف محاضر بعد.</p></section>`;
    courses=await api(`courses?select=id,name,code,is_public,active,stage_id&lecturer_id=eq.${lecturer.id}&order=name.asc`);
    if(state.view==='mycourses'){
      return `<section class="hero card"><h2>كورساتي</h2><p class="muted">الكورسات الخاصة بك فقط.</p></section><section class="grid">${courses.length?courses.map(c=>`<article class="course card"><div class="cover">📚</div><div class="body"><span class="tag">${c.is_public?'متاح':'مشتركين فقط'}</span><h3>${esc(c.name)}</h3><p class="muted">إدارة محتوى الكورس ومحاضراته.</p><button class="btn primary" onclick="go('lecturercourse','${c.id}')">إدارة المحاضرات</button></div></article>`).join(''):'<div class="card empty" style="grid-column:1/-1">لا توجد كورسات مرتبطة بحسابك.</div>'}</section>`;
    }
    if(state.view==='lecturercourse'){
      const c=courses.find(x=>String(x.id)===String(state.data.id));
      if(!c) return `<section class="card empty">هذا الكورس غير متاح لحسابك.</section>`;
      const lectures=await api(`lectures?select=id,title,description,lecture_number,active,is_public,course_id&course_id=eq.${c.id}&order=lecture_number.asc`);
      return `<section class="hero card"><button class="link" onclick="go('mycourses')">← رجوع</button><h2>${esc(c.name)}</h2><p class="muted">إدارة محاضرات الكورس.</p></section><section class="card panel"><h3>المحاضرات</h3><div class="list">${lectures.length?lectures.map(x=>`<button class="item lecture" onclick="go('lecturerlecture','${x.id}')" type="button"><div class="icon">🎥</div><div class="item-main"><b>${esc(x.title)}</b><small>المحاضرة ${esc(x.lecture_number)}</small></div><span class="tag">${x.active?'نشطة':'موقوفة'}</span></button>`).join(''):'<div class="empty">لا توجد محاضرات.</div>'}</div></section>`;
    }
    return `<section class="hero card"><h2>أهلاً بك في لوحة المحاضر</h2><p class="muted">إدارة كورساتك ومحاضراتك من مكان واحد.</p><div class="grid2"><div class="stat card"><small>كورساتي</small><div class="num">${courses.length}</div></div><div class="stat card"><small>المحاضرات</small><div class="num">${await countLecturesForCourses(courses)}</div></div></div><button class="btn primary" onclick="go('mycourses')">عرض كورساتي</button></section>`;
  }catch(e){
    return `<section class="hero card"><h2>تعذر تحميل لوحة المحاضر</h2><p class="muted">${esc(e.message)}</p></section>`;
  }
}
async function lecturerLecturePage(id){
  let l,files=[];
  try{
    [l]=await api(`lectures?select=id,title,description,lecture_number,active,is_public,course_id& id=eq.${encodeURIComponent(id)}&limit=1`.replace('& id=','&id='));
    if(!l) return `<section class="card empty">المحاضرة غير موجودة.</section>`;
    // Confirm this lecture belongs to a course assigned to the signed-in lecturer.
    const me=await api(`lecturers?select=id&auth_user_id=eq.${encodeURIComponent(session.user.id)}&active=eq.true&limit=1`);
    if(!me.length) return `<section class="card empty">حساب المحاضر غير مكتمل.</section>`;
    const owned=await api(`courses?select=id&lecturer_id=eq.${encodeURIComponent(me[0].id)}&id=eq.${encodeURIComponent(l.course_id)}&limit=1`);
    if(!owned.length) return `<section class="card empty">لا تملك صلاحية إدارة هذه المحاضرة.</section>`;
    files=await api(`lecture_files?select=*&lecture_id=eq.${encodeURIComponent(id)}`);
  }catch(e){
    return `<section class="hero card"><h2>تعذر تحميل المحاضرة</h2><p class="muted">${esc(e.message)}</p></section>`;
  }
  const video=files.find(f=>/video|youtube|فيديو/i.test(String(f.file_type||'')) && (f.file_url||f.url||f.external_url));
  const resources=files.filter(f=>f!==video);
  return `<section class="hero card"><button class="link" onclick="go('lecturercourse','${esc(l.course_id)}')">← رجوع للمحاضرات</button><h2>${esc(l.title||'المحاضرة')}</h2><p class="muted">المحاضرة ${esc(l.lecture_number||'')}</p></section>
  <section class="card panel"><h3>محتوى المحاضرة</h3><p class="muted">${esc(l.description||'لا يوجد وصف مضاف.')}</p>
  <div class="grid2" style="margin:16px 0"><button class="btn primary" onclick="openLectureResourceForm('${esc(l.id)}','video')">＋ إضافة فيديو</button><button class="btn secondary" onclick="openLectureResourceForm('${esc(l.id)}','file')">＋ إضافة رابط ملف</button></div>
  <div class="video">${video?renderVideoResource(video):'<span class="muted">لا يوجد فيديو مضاف لهذه المحاضرة حتى الآن.</span>'}</div>
  <h3>الملفات والمرفقات</h3><div class="list">${resources.length?resources.map(f=>{const href=f.file_url||f.url||f.external_url||f.storage_path||'';return href?`<a class="item" href="${esc(href)}" target="_blank" rel="noopener"><div class="icon">📄</div><div class="item-main"><b>${esc(f.title||'ملف')}</b><small>${esc(f.file_type||'ملف')}</small></div></a>`:`<div class="item"><div class="icon">📄</div><div class="item-main"><b>${esc(f.title||'ملف')}</b><small>${esc(f.file_type||'ملف')}</small></div></div>`}).join(''):'<div class="empty">لا توجد ملفات مضافة.</div>'}</div></section>`;
}
function renderVideoResource(f){
  const raw=String(f.file_url||f.url||f.external_url||'');
  const m=raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if(m) return `<div style="position:relative;padding-top:56.25%;overflow:hidden;border-radius:16px"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="${esc(f.title||'فيديو المحاضرة')}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  if(/\.(mp4|webm|ogg)(\?|$)/i.test(raw)) return `<video controls playsinline style="width:100%;border-radius:16px" src="${esc(raw)}"></video>`;
  return `<a class="btn secondary" href="${esc(raw)}" target="_blank" rel="noopener">▶ فتح الفيديو</a>`;
}
function openLectureResourceForm(lectureId,kind){
  document.querySelector('#resourceModal')?.remove();
  const isVideo=kind==='video';
  const html=`<div class="modal" id="resourceModal"><div class="card"><div class="row"><h2>${isVideo?'إضافة فيديو للمحاضرة':'إضافة ملف للمحاضرة'}</h2><button type="button" class="btn secondary" onclick="document.querySelector('#resourceModal')?.remove()">×</button></div><p class="muted">${isVideo?'الصق رابط YouTube أو رابط فيديو مباشر.':'الصق رابط PDF أو الملف المرفوع على خدمة تخزين.'} </p><form onsubmit="saveLectureResource(event,'${esc(lectureId)}','${kind}')"><div class="field"><label>اسم ${isVideo?'الفيديو':'الملف'}</label><input class="input" name="title" required placeholder="${isVideo?'مثال: المحاضرة الأولى':'مثال: ملخص المحاضرة'}"></div><div class="field"><label>الرابط</label><input class="input" name="file_url" type="url" required placeholder="https://..."></div><button class="btn primary btn-wide">حفظ</button></form></div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
async function saveLectureResource(e,lectureId,kind){
  e.preventDefault();
  const fd=new FormData(e.target);const title=String(fd.get('title')||'').trim();const url=String(fd.get('file_url')||'').trim();
  if(!/^https:\/\//i.test(url)){toast('استخدم رابط HTTPS صحيح','err');return}
  try{
    // Re-check ownership before writing, and store video links in lecture_files (lectures has no video_url column).
    const [l]=await api(`lectures?select=id,course_id& id=eq.${encodeURIComponent(lectureId)}&limit=1`.replace('& id=','&id='));
    if(!l) throw Error('المحاضرة غير موجودة');
    const me=await api(`lecturers?select=id&auth_user_id=eq.${encodeURIComponent(session.user.id)}&active=eq.true&limit=1`);
    if(!me.length) throw Error('حساب المحاضر غير مكتمل');
    const owned=await api(`courses?select=id&lecturer_id=eq.${encodeURIComponent(me[0].id)}&id=eq.${encodeURIComponent(l.course_id)}&limit=1`);
    if(!owned.length) throw Error('لا تملك صلاحية تعديل هذه المحاضرة');
    const record={lecture_id:l.id,title,file_url:url,file_type:kind==='video'?'video':'pdf',active:true};
    await api('lecture_files',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(record)});
    document.querySelector('#resourceModal')?.remove();toast(kind==='video'?'تم حفظ رابط الفيديو':'تم حفظ رابط الملف','ok');await render();
  }catch(err){toast('تعذر الحفظ: '+err.message,'err')}
}

async function countLecturesForCourses(courses){
  if(!courses.length)return 0;
  try{
    const ids=courses.map(c=>c.id).join(',');
    const rows=await api(`lectures?select=id&course_id=in.(${ids})`);
    return rows.length;
  }catch{return 0}
}

async function count(table){try{const r=await api(`${table}?select=id&limit=1`,{headers:{Prefer:'count=exact'}});return Array.isArray(r)?r.length:'—'}catch{return '—'}}
async function coursesPage(mine){let rows=[];try{if(mine){const me=await api(`students?select=id&auth_user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`);if(me.length){const subs=await api(`student_courses?select=course_id,active,expires_at&student_id=eq.${me[0].id}`);const now=Date.now();const ids=[...new Set(subs.filter(s=>s.active!==false&&(!s.expires_at||new Date(s.expires_at).getTime()>now)).map(s=>s.course_id))];if(ids.length)rows=await api(`courses?select=id,name,code,is_public,active,stage_id,image_url&id=in.(${ids.join(',')})&order=name.asc`)} }else rows=await api('courses?select=id,name,code,is_public,active,stage_id,image_url&active=eq.true&order=name.asc')}catch(e){toast('تعذر تحميل الكورسات','err')}return `<section class="hero card"><div class="row"><div><h2>${mine?'كورساتي':'كل الكورسات'}</h2><p class="muted">${mine?'المحتوى المشترك فيه فقط.':'تصفح المواد المتاحة على المنصة.'}</p></div></div></section><section class="grid">${rows.length?rows.map(c=>`<article class="course card"><div class="cover">${c.image_url?`<img src="${esc(c.image_url)}" alt="" style="width:100%;height:100%;object-fit:cover">`:'📚'}</div><div class="body"><span class="tag">${c.is_public?'متاح':'مشتركين فقط'}</span><h3>${esc(c.name)}</h3><p class="muted">إدارة محتوى الكورس ومحاضراته.</p><button class="btn primary" onclick="go('course','${c.id}')">فتح الكورس</button></div></article>`).join(''):`<div class="card empty" style="grid-column:1/-1">لا توجد كورسات لعرضها حالياً.</div>`}</section>`}
async function coursePage(id){let c,l=[];try{[c]=await api(`courses?select=*&id=eq.${id}&limit=1`);l=await api(`lectures?select=id,title,description,lecture_number,active,is_public&course_id=eq.${id}&active=eq.true&order=lecture_number.asc`)}catch(e){}return `<section class="hero card"><button class="link" onclick="go('courses')">← رجوع</button><h2>${esc(c?.name||'الكورس')}</h2><p class="muted">${esc(c?.code ? 'كود الكورس: '+c.code : 'عرض محاضرات الكورس والمحتوى التعليمي.')}</p></section><section class="card panel"><h3>المحاضرات</h3><div class="list">${l.length?l.map(x=>`<button class="item lecture ${x.is_public?'':'locked'}" onclick="go('lecture','${x.id}')"><div class="icon">${x.is_public?'▶':'🔒'}</div><div class="item-main"><b>${esc(x.title)}</b><small>المحاضرة ${esc(x.lecture_number)}</small></div></button>`).join(''):'<div class="empty">لا توجد محاضرات.</div>'}</div></section>`}
async function lecturePage(id){let l,files=[];try{[l]=await api(`lectures?select=id,title,description,course_id& id=eq.${encodeURIComponent(id)}&limit=1`.replace('& id=','&id='));files=await api(`lecture_files?select=*&lecture_id=eq.${encodeURIComponent(id)}`)}catch{}const video=files.find(f=>/video|youtube|فيديو/i.test(String(f.file_type||''))&&(f.file_url||f.url||f.external_url));const resources=files.filter(f=>f!==video);return `<section class="hero card"><button class="link" onclick="go('course','${l?.course_id||''}')">← رجوع للكورس</button><h2>${esc(l?.title||'المحاضرة')}</h2><p class="muted">${esc(l?.description||'')}</p></section><section class="card panel"><div class="video">${video?renderVideoResource(video):'<span class="muted">سيظهر الفيديو هنا بعد إضافته من المحاضر.</span>'}</div><h3>الملفات</h3><div class="list">${resources.length?resources.map(f=>`<a class="item" href="${esc(f.file_url||f.url||f.external_url||'#')}" target="_blank" rel="noopener"><div class="icon">📄</div><div class="item-main"><b>${esc(f.title||'ملف')}</b><small>${esc(f.file_type||'ملف')}</small></div></a>`).join(''):'<div class="empty">لا توجد ملفات.</div>'}</div></section>`}
async function lecturersPage(){
  let rows=[];
  try{rows=await api('lecturers?select=id,full_name,bio,image_url&active=eq.true&order=full_name.asc')}catch{}
  return `<section class="hero card"><h2>الدكاترة والمحاضرين</h2><p class="muted">تعرف على المحاضرين في Future Center.</p></section><section class="grid">${rows.length?rows.map(x=>`<article class="course card"><div class="cover">👨‍🏫</div><div class="body"><h3>${esc(x.full_name)}</h3><p class="muted">${esc(x.bio||'')}</p></div></article>`).join(''):'<div class="card empty" style="grid-column:1/-1">لا يوجد محاضرون متاحون حالياً.</div>'}</section>`;
}
async function profilePage(){let s=[];try{s=await api(`students?select=full_name,email,phone,country_id,university_id,stage_id&auth_user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`)}catch{}const x=s[0]||{};return `<section class="hero card"><h2>حسابي</h2><p class="muted">بيانات الطالب الأساسية.</p></section><section class="card panel"><div class="grid2"><div class="field"><label>الاسم</label><input class="input" value="${esc(x.full_name)}" disabled></div><div class="field"><label>البريد</label><input class="input" value="${esc(x.email)}" disabled></div><div class="field"><label>الهاتف</label><input class="input" value="${esc(x.phone)}" disabled></div></div></section>`}
async function adminPage(){const sections=[['overview','نظرة عامة'],['countries','الدول'],['universities','الجامعات'],['stages','المراحل'],['courses','الكورسات'],['lectures','المحاضرات'],['files','الملفات'],['students','الطلاب'],['subscriptions','الاشتراكات'],['registrations','التسجيلات'],['subjects','الموضوعات']];const v=state.view==='home'?'overview':state.view; if(v==='overview')return `<section class="hero card"><h2>لوحة تحكم <span class="gold">Future Center</span></h2><p class="muted">إدارة المحتوى والطلاب والاشتراكات من مكان واحد.</p></section><div class="grid">${sections.slice(1,10).map(s=>`<button class="card stat" onclick="go('${s[0]}')"><small>${s[1]}</small><div class="num">›</div></button>`).join('')}</div>`;return crudPage(v)}
const defs={countries:['الدول',['name','code','active']],universities:['الجامعات',['name','code','active','country_id']],stages:['المراحل',['name','code','active','university_id']],courses:['الكورسات',['name','code','active','is_public','stage_id']],lectures:['المحاضرات',['title','description','lecture_number','active','is_public','course_id']],files:['الملفات',['title','file_type','file_url','provider_id','active','lecture_id']],students:['الطلاب',['full_name','phone','email','auth_user_id']],subscriptions:['الاشتراكات',['student_id','course_id','active','expires_at']],registrations:['التسجيلات',['student_name','primary_phone','backup_phone','landline','email','university','level','study_type','group_name','specialization','subjects','notes']],subjects:['الموضوعات',['name','description','image_url']]};
const labels={name:'الاسم',code:'الكود',active:'نشط',is_public:'عام',description:'الوصف',stage_id:'المرحلة',country_id:'الدولة',university_id:'الجامعة',title:'العنوان',lecture_number:'رقم المحاضرة',course_id:'الكورس',video_url:'رابط الفيديو',file_type:'نوع الملف',file_url:'رابط الملف',provider_id:'مزود الفيديو',lecture_id:'المحاضرة',full_name:'الاسم بالكامل',phone:'الهاتف',email:'البريد',auth_user_id:'Auth User ID',student_id:'الطالب',expires_at:'تاريخ الانتهاء',student_name:'اسم الطالب',primary_phone:'الهاتف الأساسي',backup_phone:'هاتف بديل',landline:'الأرضي',university:'الجامعة',level:'المستوى',study_type:'نوع الدراسة',group_name:'المجموعة',specialization:'التخصص',subjects:'المواد',notes:'ملاحظات',image_url:'رابط الصورة'};
async function crudPage(table){const [title,fields]=defs[table]||[];let rows=[];try{rows=await api(`${table}?select=*&limit=100&order=${table==='lectures'?'lecture_number':'created_at'}.desc`)}catch(e){toast('تعذر قراءة '+title,'err')}return `<section class="hero card"><div class="row"><div><h2>${title}</h2><p class="muted">إدارة ${title} من نفس قاعدة البيانات الحالية.</p></div><button class="btn primary" onclick="openForm('${table}')">＋ إضافة</button></div></section><section class="card panel"><div class="list">${rows.length?rows.map(r=>`<div class="item"><div class="icon">${table==='courses'?'📚':table==='lectures'?'🎥':table==='students'?'👨‍🎓':'•'}</div><div class="item-main"><b>${esc(r.name||r.title||r.full_name||r.student_name||r.id)}</b><small>${esc(r.code||r.email||r.description||'')}</small></div><button class="btn secondary" onclick='openForm(${JSON.stringify(table)},${JSON.stringify(r)})'>تعديل</button><button class="btn danger" onclick="del('${table}','${r.id}')">حذف</button></div>`).join(''):'<div class="empty">لا توجد بيانات.</div>'}</div></section>`}
async function openForm(table,row={}){const [title,fields]=defs[table];const html=`<div class="modal" id="modal"><div class="card"><div class="row"><h2>${row.id?'تعديل':'إضافة'} ${title}</h2><button class="btn secondary" onclick="closeModal()">×</button></div><form onsubmit="saveRecord(event,'${table}',${row.id?`'${row.id}'`:'null'})"><div class="formgrid">${fields.map(f=>`<div class="field ${['description','notes','subjects'].includes(f)?'full':''}"><label>${labels[f]||f}</label>${['active','is_public'].includes(f)?`<select class="select" name="${f}"><option value="true" ${row[f]!==false?'selected':''}>نعم</option><option value="false" ${row[f]===false?'selected':''}>لا</option></select>`:['description','notes','subjects'].includes(f)?`<textarea class="textarea" name="${f}">${esc(row[f])}</textarea>`:`<input class="input" name="${f}" value="${esc(row[f])}" ${['name','title','course_id','lecture_id','student_id','stage_id','university_id','file_url','file_type'].includes(f)?'required':''}>`}</div>`).join('')}</div><button class="btn primary btn-wide">حفظ</button></form></div></div>`;document.body.insertAdjacentHTML('beforeend',html)}
function closeModal(){document.querySelector('#modal')?.remove()}
async function saveRecord(e,table,id){e.preventDefault();const o={};new FormData(e.target).forEach((v,k)=>{if(v!=='')o[k]=['active','is_public'].includes(k)?v==='true':v});try{await api(table+(id?`?id=eq.${id}`:''),{method:id?'PATCH':'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(o)});closeModal();toast('تم الحفظ بنجاح','ok');render()}catch(x){toast(x.message,'err')}}
async function del(table,id){if(!confirm('متأكد من الحذف؟'))return;try{await api(`${table}?id=eq.${id}`,{method:'DELETE'});toast('تم الحذف','ok');render()}catch(x){toast(x.message,'err')}}
async function logout(){clearSession();state={role:null,view:'login',data:{}};render()}
async function loadSiteSettings(){try{const rows=await api('site_settings?select=key,value');siteSettings=Object.fromEntries((rows||[]).map(r=>[r.key,r.value||{}]));const theme=siteSettings.theme||{};if(theme.primary)document.documentElement.style.setProperty('--gold',theme.primary);if(theme.background){document.documentElement.style.setProperty('--navy',theme.background);document.body.style.background=`radial-gradient(circle at 20% 0%, #163a61 0, ${theme.background} 42%, #040b14 100%)`}}catch{siteSettings={}}}
(async()=>{await loadSiteSettings();try{const s=JSON.parse(localStorage.getItem('fc_session')||'null');if(s?.access_token){session=s;await chooseRole()}else render()}catch(e){if(session?.access_token){state.role='student';try{await render()}catch{}}else{clearSession();render()}}})();
