const C=window.FC_CONFIG||{};const API=(C.supabaseUrl||'').replace(/\/$/,'');const KEY=C.supabaseKey||'';let session=null,siteSettings={},state={role:null,view:'home',data:{}};
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function toast(msg,type=''){const d=document.createElement('div');d.className='toast '+type;d.textContent=msg;document.querySelector('#toast').appendChild(d);setTimeout(()=>d.remove(),3000)}
async function api(path,opts={}){const h={'apikey':KEY,'Authorization':`Bearer ${session?.access_token||KEY}`,'Content-Type':'application/json',...(opts.headers||{})};const r=await fetch(API+'/rest/v1/'+path,{...opts,headers:h});if(!r.ok){let t=await r.text();throw Error(t||r.statusText)}return r.status===204?null:r.json()}
async function storageRequest(path,opts={}){const r=await fetch(API+'/storage/v1/'+path,{...opts,headers:{apikey:KEY,Authorization:'Bearer '+(session?.access_token||KEY),...(opts.headers||{})}});const t=await r.text();if(!r.ok)throw Error(t||r.statusText);return t?JSON.parse(t):null}
async function resolveLectureFileUrl(file){const raw=String(file.file_url||file.url||file.external_url||'');if(!raw||/^https:\/\//i.test(raw))return raw;if(!session?.access_token)return '';try{const r=await storageRequest('object/sign/lecture-assets/'+raw.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});const p=r.signedURL||r.signedUrl||'';return p.startsWith('http')?p:API+'/storage/v1'+(p.startsWith('/')?p:'/'+p)}catch{return ''}}
async function auth(path,body){const r=await fetch(API+'/auth/v1/'+path,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(j.msg||j.error_description||j.message||'حدث خطأ');return j}
function saveSession(s){session=s;localStorage.setItem('fc_session',JSON.stringify(s))}
function clearSession(){session=null;localStorage.removeItem('fc_session')}
async function restoreSession(){
  let saved;try{saved=JSON.parse(localStorage.getItem('fc_session')||'null')}catch{}
  if(!saved?.access_token){clearSession();return false}
  if(saved.refresh_token){
    try{
      const fresh=await auth('token?grant_type=refresh_token',{refresh_token:saved.refresh_token});
      saveSession(fresh);return true;
    }catch(e){
      if(saved.expires_at && saved.expires_at*1000>Date.now()){session=saved;return true}
      clearSession();return false;
    }
  }
  session=saved;return true;
}
function logo(){const b=siteSettings.brand||{};return `<div class="brand-mini">${b.logo_url?`<img src="${esc(b.logo_url)}" alt="" style="width:46px;height:46px;object-fit:contain;border-radius:13px">`:'<img class="brand-logo" src="./icons/future-center-192.png?v=8" alt="Future Center" width="46" height="46">'}<b>${esc(b.name||'Future Center')}</b></div>`}
function layout(content,nav=''){return `<div class="shell ${state.role==='student'?'student-shell':''}"><header class="topbar card">${logo()}<nav class="nav desktop-nav">${nav}</nav><button class="btn secondary" onclick="logout()">خروج</button></header><main class="page">${content}</main><nav class="mobile-bottom-nav" aria-label="التنقل الرئيسي">${nav}</nav></div>`}
function authView(mode='login'){
 const b=siteSettings.brand||{},isRegister=mode==='register';
 return `<div class="auth-page ${isRegister?'register-page':'login-page'}">
  <div class="auth-backdrop" aria-hidden="true"></div>
  <header class="auth-brandbar">
   <div class="auth-logo">${b.logo_url?`<img src="${esc(b.logo_url)}" alt="Future Center">`:'<img src="./icons/future-center-192.png?v=8" alt="Future Center">'}
    <div><strong>FUTURE</strong><span>CENTER</span></div>
   </div>
  </header>
  <section class="auth-intro">
   <h1>${isRegister?'إنشاء حساب جديد':'مرحبًا بعودتك'}</h1>
   <p>${isRegister?'ابدأ رحلتك التعليمية مع منصة فيوتشر':'سجّل الدخول إلى منصتك التعليمية مع فيوتشر'}</p>
  </section>
  <section class="auth-card card">
   <div class="auth-card-title"><span class="auth-title-icon">${isRegister?'♙':'◆'}</span><div><h2>${isRegister?'إنشاء حساب جديد':'تسجيل الدخول'}</h2><p>${isRegister?'ابدأ رحلتك التعليمية':'أهلًا بك في منصة فيوتشر'}</p></div></div>
   ${isRegister?registerForm():loginForm()}
  </section>
  <p class="auth-footer">FUTURE CENTER <span>•</span> منصتك التعليمية</p>
 </div>`;
}
function loginForm(){return `<form class="auth-form" onsubmit="doLogin(event)">
 <label class="auth-field"><span class="field-icon">♙</span><input class="input" id="email" type="email" required autocomplete="username" placeholder="البريد الإلكتروني"></label>
 <label class="auth-field"><span class="field-icon">♙</span><input class="input" id="password" type="password" required autocomplete="current-password" placeholder="كلمة المرور"><button type="button" class="password-toggle" onclick="togglePassword('password',this)" aria-label="إظهار كلمة المرور">◉</button></label>
 <div class="auth-options"><label class="remember-option"><input type="checkbox" checked> <span>تذكرني</span></label><button type="button" class="text-link" onclick="resetPassword()">نسيت كلمة المرور؟</button></div>
 <button class="btn primary btn-wide auth-submit">تسجيل الدخول <span aria-hidden="true">↪</span></button>
 <div class="auth-divider"><span>أو</span></div>
 <div class="oauth-row"><button type="button" class="oauth-btn" onclick="startOAuth('google')"><span class="google-mark">G</span> الدخول باستخدام Google</button><button type="button" class="oauth-btn" onclick="startOAuth('apple')"><span class="apple-mark">●</span> الدخول باستخدام Apple</button></div>
 <p class="auth-switch">ليس لديك حساب؟ <button type="button" class="text-link strong" onclick="state.view='register';render()">إنشاء حساب جديد</button></p>
 </form>`}
function registerForm(){return `<form class="auth-form register-form" onsubmit="doRegister(event)">
 <h3 class="form-section-title"><span>♙</span> البيانات الشخصية</h3>
 <label class="auth-field"><span class="field-icon">♙</span><input class="input" id="full_name" required autocomplete="name" placeholder="الاسم الكامل"></label>
 <label class="auth-field"><span class="field-icon">✉</span><input class="input" id="email" type="email" required autocomplete="email" placeholder="البريد الإلكتروني"></label>
 <label class="auth-field"><span class="field-icon">☎</span><input class="input" id="phone" type="tel" autocomplete="tel" placeholder="رقم الهاتف"></label>
 <label class="auth-field"><span class="field-icon">♙</span><input class="input" id="password" type="password" minlength="6" required autocomplete="new-password" placeholder="كلمة المرور"><button type="button" class="password-toggle" onclick="togglePassword('password',this)" aria-label="إظهار كلمة المرور">◉</button></label>
 <label class="auth-field"><span class="field-icon">♙</span><input class="input" id="confirm_password" type="password" minlength="6" required autocomplete="new-password" placeholder="تأكيد كلمة المرور"><button type="button" class="password-toggle" onclick="togglePassword('confirm_password',this)" aria-label="إظهار كلمة المرور">◉</button></label>
 <h3 class="form-section-title"><span>◆</span> معلومات الدراسة</h3>
 <label class="auth-field select-field"><span class="field-icon">▤</span><select class="select" id="country_id" onchange="loadUniversities(this.value)" required><option value="">اختر الدولة</option></select></label>
 <label class="auth-field select-field"><span class="field-icon">⌂</span><select class="select" id="university_id" onchange="loadStages(this.value)" required><option value="">اختر الجامعة</option></select></label>
 <label class="auth-field select-field"><span class="field-icon">▥</span><select class="select" id="stage_id" required><option value="">اختر المرحلة الدراسية</option></select></label>
 <label class="terms-option"><input type="checkbox" id="terms_accept" required><span>أوافق على الشروط والأحكام وسياسة الخصوصية</span></label>
 <button class="btn primary btn-wide auth-submit">إنشاء الحساب <span aria-hidden="true">♙+</span></button>
 <div class="auth-divider"><span>أو</span></div>
 <div class="oauth-row"><button type="button" class="oauth-btn" onclick="startOAuth('google')"><span class="google-mark">G</span> التسجيل باستخدام Google</button><button type="button" class="oauth-btn" onclick="startOAuth('apple')"><span class="apple-mark">●</span> التسجيل باستخدام Apple</button></div>
 <p class="auth-switch">لديك حساب بالفعل؟ <button type="button" class="text-link strong" onclick="state.view='login';render()">تسجيل الدخول</button></p>
 </form>`}
function togglePassword(id,button){const el=document.getElementById(id);if(!el)return;el.type=el.type==='password'?'text':'password';button.textContent=el.type==='password'?'◉':'◎'}
async function resetPassword(){const el=document.getElementById('email');const email=el?.value?.trim();if(!email){toast('اكتب بريدك الإلكتروني أولًا لإرسال رابط تغيير كلمة المرور','err');el?.focus();return}try{await auth('recover',{email,redirect_to:location.origin+location.pathname});toast('لو البريد مسجل، هيوصلك رابط استعادة كلمة المرور','ok')}catch(e){toast(e.message||'تعذر إرسال رابط الاستعادة','err')}}
function startOAuth(provider){const redirect=encodeURIComponent(location.origin+location.pathname);location.href=API+'/auth/v1/authorize?provider='+encodeURIComponent(provider)+'&redirect_to='+redirect+'&apikey='+encodeURIComponent(KEY)}
async function loadRegisterOptions(){try{const cs=await api('countries?select=id,name&active=eq.true&order=name.asc');document.querySelector('#country_id').innerHTML='<option value="">اختر الدولة</option>'+cs.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}catch(e){toast('تعذر تحميل الدول','err')}}
async function loadUniversities(id){const el=document.querySelector('#university_id'),st=document.querySelector('#stage_id');el.innerHTML='<option>جاري التحميل...</option>';st.innerHTML='<option value="">اختر المرحلة</option>';if(!id)return;try{const x=await api(`universities?select=id,name&country_id=eq.${encodeURIComponent(id)}&active=eq.true&order=name.asc`);el.innerHTML='<option value="">اختر الجامعة</option>'+x.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}catch(e){toast('تعذر تحميل الجامعات','err')}}
async function loadStages(id){const el=document.querySelector('#stage_id');el.innerHTML='<option value="">اختر المرحلة</option>';if(!id)return;try{const x=await api(`stages?select=id,name&university_id=eq.${encodeURIComponent(id)}&active=eq.true&order=name.asc`);el.innerHTML='<option value="">اختر المرحلة</option>'+x.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}catch(e){toast('تعذر تحميل المراحل','err')}}
async function doLogin(e){e.preventDefault();try{const j=await auth('token?grant_type=password',{email:email.value.trim(),password:password.value});saveSession(j);await chooseRole()}catch(x){const m=String(x?.message||'');if(/email not confirmed/i.test(m))toast('حسابك اتعمل لكن البريد محتاج تفعيل مرة واحدة. استخدم رابط إعادة إرسال التفعيل أو راجع إعدادات التسجيل لتسهيل الدخول.','err');else if(/invalid login credentials/i.test(m))toast('البريد أو كلمة المرور غير صحيحة. لو سجلت حالًا، تأكد أن الحساب مفعّل.','err');else toast(m,'err')}}
async function doRegister(e){e.preventDefault();if(password.value!==document.getElementById('confirm_password')?.value){toast('كلمتا المرور غير متطابقتين','err');return}try{const body={email:email.value.trim(),password:password.value,data:{full_name:full_name.value.trim(),phone:phone.value.trim(),country_id:country_id.value,university_id:university_id.value,stage_id:stage_id.value}};const j=await auth('signup',body);const user=j.user||(j.id?j:null);const authSession=j.session||j;if(authSession?.access_token&&user){saveSession({...authSession,user});toast('تم إنشاء الحساب بنجاح','ok');await chooseRole()}else{state.view='login';render();toast('تم إنشاء الحساب. لو طلب النظام تأكيد البريد، افتح رابط التأكيد مرة واحدة فقط.','ok')}}catch(x){const m=String(x?.message||'');if(/email rate limit exceeded|rate limit/i.test(m))toast('انتظر قليلًا قبل إعادة المحاولة، أو سجّل الدخول إذا كان الحساب قد أُنشئ بالفعل.','err');else toast(m,'err')}}
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
  if(state.role==='student'){try{await ensureStudentProfile()}catch(e){toast('تم تسجيل الدخول لكن تعذر إنشاء ملف الطالب: '+e.message,'err')}}
  try{ await render(); }catch(e){ state.role='student'; try{await render()}catch{} }
}
async function ensureStudentProfile(){
  if(!session?.user?.id) return;
  const existing=await api(`students?select=id&auth_user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`);
  if(existing?.length) return;
  const meta=session.user.user_metadata||{};
  const payload={
    auth_user_id:session.user.id,
    full_name:String(meta.full_name||session.user.email||'طالب جديد').trim(),
    email:String(session.user.email||'').trim().toLowerCase(),
    phone:meta.phone||null,
    country_id:meta.country_id||null,
    university_id:meta.university_id||null,
    stage_id:meta.stage_id||null
  };
  await api('students',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
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
async function studentPage(){
 if(state.view==='home'){
  const b=siteSettings.brand||{},h=siteSettings.home||{};
  let studentName='',myCourseCount=0,myLectureCount=0,myCourses=[],recentLectures=[];
  try{
   const me=await api(`students?select=id,full_name&auth_user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`);
   if(me.length){
    studentName=me[0].full_name||'';
    const subs=await api(`student_courses?select=course_id,active,expires_at&student_id=eq.${me[0].id}`);
    const now=Date.now(),ids=[...new Set(subs.filter(s=>s.active!==false&&(!s.expires_at||new Date(s.expires_at).getTime()>now)).map(s=>s.course_id).filter(Boolean))];
    myCourseCount=ids.length;
    if(ids.length){
     myCourses=await api(`courses?select=id,name,code,image_url&active=eq.true&id=in.(${ids.join(',')})&order=name.asc`);
     const lectures=await api(`lectures?select=id,title,course_id,created_at&course_id=in.(${ids.join(',')})&order=created_at.desc&limit=3`);
     recentLectures=lectures||[];myLectureCount=recentLectures.length;
    }
   }
  }catch(e){console.warn('تعذر تحميل بيانات الطالب',e)}
  let publicCourses=[];
  try{publicCourses=await api('courses?select=id,name,code,image_url&active=eq.true&is_public=eq.true&order=name.asc&limit=8')}catch(e){}
  const displayName=studentName?studentName.split(/\s+/)[0]:'طالبنا';
  return `<section class="student-hero"><div class="student-hero-copy"><span class="eyebrow">FUTURE CENTER · منصتك التعليمية</span><h1>مرحبًا بك</h1><strong class="student-name">${esc(displayName)}</strong><p>تابع محاضراتك واستمر في رحلتك التعليمية مع فيوتشر.</p></div><div class="student-hero-mark">${b.logo_url?`<img src="${esc(b.logo_url)}" alt="Future Center">`:'<img src="./icons/future-center-192.png?v=8" alt="Future Center">'}<span>FUTURE CENTER</span></div></section>
  <section class="student-search"><span>⌕</span><input id="course-search" type="search" placeholder="ابحث عن كورس أو مادة..." oninput="filterStudentCourses(this.value)"><button type="button" onclick="go('catalog')" aria-label="بحث">⌕</button></section>
  <section class="discovery-shortcuts">
   <button class="shortcut-card" onclick="go('catalog')"><span>▱</span><b>جميع الكورسات</b><small>تصفح المتاح</small></button>
   <button class="shortcut-card" onclick="go('catalog')"><span>⌂</span><b>الكلية</b><small>اختر كليتك</small></button>
   <button class="shortcut-card" onclick="go('catalog')"><span>⌖</span><b>الجامعة</b><small>اختر جامعتك</small></button>
   <button class="shortcut-card" onclick="go('catalog')"><span>♟</span><b>الفرقة الدراسية</b><small>حسب مرحلتك</small></button>
  </section>
  <section class="home-section glass-panel"><div class="home-section-head"><div><span class="section-kicker">مسارك الدراسي</span><h2>كورساتي المسجلة <span class="round-icon">◆</span></h2></div><button class="text-action" onclick="go('courses')">عرض الكل ←</button></div>
   ${myCourses.length?`<div class="real-course-grid">${myCourses.slice(0,4).map(x=>`<article class="real-course-card" data-course-search="${esc((x.name||'')+' '+(x.code||''))}"><div class="real-course-cover">${x.image_url?`<img src="${esc(x.image_url)}" alt="">`:'<span>▤</span>'}</div><div class="real-course-info"><h3>${esc(x.name)}</h3><p>${esc(x.code||'كورس مسجل')}</p><button class="btn primary" onclick="go('course','${x.id}')">متابعة الكورس ▶</button></div></article>`).join('')}</div>`:`<div class="empty-state"><span class="empty-symbol">▤</span><div><h3>كورساتك هتظهر هنا</h3><p>لسه مفيش كورسات مرتبطة بحسابك. أول ما يتم تسجيلك في كورس، هتلاقيه هنا تلقائيًا.</p><button class="btn secondary" onclick="go('catalog')">استكشف الكورسات</button></div></div>`}
  </section>
  <section class="home-section glass-panel"><div class="home-section-head"><div><span class="section-kicker">تابع من حيث توقفت</span><h2>أحدث المحاضرات <span class="round-icon">▶</span></h2></div><button class="text-action" onclick="go('courses')">محاضراتي ←</button></div>
   ${recentLectures.length?`<div class="recent-lecture-list">${recentLectures.map(l=>`<article class="recent-lecture"><span class="lecture-play">▶</span><div><h3>${esc(l.title||'محاضرة')}</h3><p>محاضرة من كورساتك</p></div><button class="btn primary" onclick="go('lecture','${l.id}')">مشاهدة الآن</button></article>`).join('')}</div>`:`<div class="empty-state compact"><span class="empty-symbol">▶</span><div><h3>المحاضرات هتظهر هنا</h3><p>لما يتم نشر المحاضرات وربطها بكورساتك، هتقدر توصل لها من هنا مباشرة.</p></div></div>`}
  </section>
  <section class="home-section glass-panel"><div class="home-section-head"><div><span class="section-kicker">اكتشف محتوى جديد</span><h2>جميع الكورسات <span class="round-icon">▤</span></h2></div><button class="text-action" onclick="go('catalog')">عرض الكل ←</button></div>
   ${publicCourses.length?`<div class="real-course-grid catalog-grid">${publicCourses.slice(0,4).map(x=>`<article class="real-course-card" data-course-search="${esc((x.name||'')+' '+(x.code||''))}"><div class="real-course-cover">${x.image_url?`<img src="${esc(x.image_url)}" alt="">`:'<span>▤</span>'}</div><div class="real-course-info"><h3>${esc(x.name)}</h3><p>${esc(x.code||'كورس متاح')}</p><button class="btn primary" onclick="go('course','${x.id}')">تفاصيل الكورس</button></div></article>`).join('')}</div>`:`<div class="empty-state"><span class="empty-symbol">✦</span><div><h3>بنجهّزلك محتوى يليق بطموحك</h3><p>الكورسات هتظهر هنا فور نشرها. مفيش محتوى تجريبي أو كورسات وهمية؛ هتشوف الكورسات الحقيقية المتاحة فقط.</p></div></div>`}
  </section>`;
 }
 if(state.view==='courses')return coursesPage(true);
 if(state.view==='catalog')return coursesPage(false);
 if(state.view==='lecturers')return lecturersPage();
 if(state.view==='profile')return profilePage();
 if(state.view==='course')return coursePage(state.data.id);
 if(state.view==='lecture')return lecturePage(state.data.id);
 return '';
}
function filterStudentCourses(q){const v=String(q||'').trim().toLocaleLowerCase();document.querySelectorAll('[data-course-search]').forEach(el=>{el.style.display=el.dataset.courseSearch.toLocaleLowerCase().includes(v)?'':'none'})}
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
    files=await api(`lecture_files?select=*&lecture_id=eq.${encodeURIComponent(id)}&active=eq.true`);files=await Promise.all(files.map(async f=>({...f,resolved_url:await resolveLectureFileUrl(f)})));
  }catch(e){
    return `<section class="hero card"><h2>تعذر تحميل المحاضرة</h2><p class="muted">${esc(e.message)}</p></section>`;
  }
  const video=files.find(f=>/video|youtube|فيديو/i.test(String(f.file_type||'')) && (f.file_url||f.url||f.external_url));
  const resources=files.filter(f=>f!==video);
  return `<section class="hero card"><button class="link" onclick="go('lecturercourse','${esc(l.course_id)}')">← رجوع للمحاضرات</button><h2>${esc(l.title||'المحاضرة')}</h2><p class="muted">المحاضرة ${esc(l.lecture_number||'')}</p></section>
  <section class="card panel"><h3>محتوى المحاضرة</h3><p class="muted">${esc(l.description||'لا يوجد وصف مضاف.')}</p>
  <div class="grid2" style="margin:16px 0"><button class="btn primary" onclick="openLectureResourceForm('${esc(l.id)}','video')">＋ إضافة فيديو</button><button class="btn secondary" onclick="openLectureResourceForm('${esc(l.id)}','file')">＋ إضافة رابط ملف</button></div>
  <div class="video">${video?renderVideoResource(video):'<span class="muted">لا يوجد فيديو مضاف لهذه المحاضرة حتى الآن.</span>'}</div>
  <h3>الملفات والمرفقات</h3><div class="list">${resources.length?resources.map(f=>{const href=f.resolved_url||f.file_url||f.url||f.external_url||f.storage_path||'';return href?`<a class="item" href="${esc(href)}" target="_blank" rel="noopener"><div class="icon">📄</div><div class="item-main"><b>${esc(f.title||'ملف')}</b><small>${esc(f.file_type||'ملف')}</small></div></a>`:`<div class="item"><div class="icon">📄</div><div class="item-main"><b>${esc(f.title||'ملف')}</b><small>${esc(f.file_type||'ملف')}</small></div></div>`}).join(''):'<div class="empty">لا توجد ملفات مضافة.</div>'}</div></section>`;
}
function renderVideoResource(f){
  const raw=String(f.resolved_url||f.file_url||f.url||f.external_url||'');
  const m=raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if(m) return `<div style="position:relative;padding-top:56.25%;overflow:hidden;border-radius:16px"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="${esc(f.title||'فيديو المحاضرة')}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  if(/\.(mp4|webm|ogg)(\?|$)/i.test(raw)) return `<video controls playsinline style="width:100%;border-radius:16px" src="${esc(raw)}"></video>`;
  return `<a class="btn secondary" href="${esc(raw)}" target="_blank" rel="noopener">▶ فتح الفيديو</a>`;
}
function openLectureResourceForm(lectureId,kind){
  document.querySelector('#resourceModal')?.remove();
  const isVideo=kind==='video';
  const html=`<div class="modal" id="resourceModal"><div class="card"><div class="row"><h2>${isVideo?'إضافة فيديو للمحاضرة':'إضافة ملف للمحاضرة'}</h2><button type="button" class="btn secondary" onclick="document.querySelector('#resourceModal')?.remove()">×</button></div><p class="muted">${isVideo?'الصق رابط YouTube أو رابط فيديو مباشر.':'الصق رابط PDF أو الملف المرفوع على خدمة تخزين.'} </p><form onsubmit="saveLectureResource(event,'${esc(lectureId)}','${kind}')"><div class="field"><label>اسم ${isVideo?'الفيديو':'الملف'}</label><input class="input" name="title" required placeholder="${isVideo?'مثال: المحاضرة الأولى':'مثال: ملخص المحاضرة'}"></div><div class="field"><label>الرابط</label><input class="input" name="file_url" type="url" placeholder="رابط HTTPS (اختياري)"><div class="field"><label>أو ارفع ملفًا (حد أقصى 100 ميجابايت)</label><input class="input" name="upload_file" type="file" accept=".pdf,.docx,.pptx,.zip,.mp4,.webm,application/pdf,video/mp4,video/webm"></div></div><button class="btn primary btn-wide">حفظ</button></form></div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
async function saveLectureResource(e,lectureId,kind){
  e.preventDefault();
  const fd=new FormData(e.target);const title=String(fd.get('title')||'').trim();let url=String(fd.get('file_url')||'').trim();const upload=fd.get('upload_file');
  if(!title){toast('اكتب اسم الملف أو الفيديو','err');return}
  if(!upload?.size&&!/^https:\/\//i.test(url)){toast('أضف رابط HTTPS أو اختر ملفًا للرفع','err');return}
  if(upload?.size>104857600){toast('الحد الأقصى لحجم الملف 100 ميجابايت','err');return}
  let uploadedPath='';
  try{
    // Re-check ownership before writing, and store video links in lecture_files (lectures has no video_url column).
    const [l]=await api(`lectures?select=id,course_id& id=eq.${encodeURIComponent(lectureId)}&limit=1`.replace('& id=','&id='));
    if(!l) throw Error('المحاضرة غير موجودة أو لا تملك صلاحية الوصول إليها');
    const me=await api(`lecturers?select=id&auth_user_id=eq.${encodeURIComponent(session.user.id)}&active=eq.true&limit=1`);
    if(!me.length) throw Error('حساب المحاضر غير مكتمل');
    const owned=await api(`courses?select=id&lecturer_id=eq.${encodeURIComponent(me[0].id)}&id=eq.${encodeURIComponent(l.course_id)}&limit=1`);
    if(!owned.length) throw Error('لا تملك صلاحية تعديل هذه المحاضرة');
    let fileType=kind==='video'?'video':'pdf';
    if(upload?.size){
      const safe=upload.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-90)||'file';
      url=l.id+'/'+Date.now()+'-'+safe;uploadedPath=url;
      const up=await fetch(API+'/storage/v1/object/lecture-assets/'+url.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':upload.type||'application/octet-stream','x-upsert':'false'},body:upload});
      if(!up.ok)throw Error(await up.text());
      fileType=kind==='video'?'video':(/\.pdf$/i.test(upload.name)?'pdf':'file');
    }
    const record={lecture_id:l.id,title,file_url:url,file_type:fileType,active:true};
    await api('lecture_files',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(record)});
    uploadedPath='';
    document.querySelector('#resourceModal')?.remove();toast(kind==='video'?'تم حفظ رابط الفيديو':'تم حفظ رابط الملف','ok');await render();
  }catch(err){
    // If storage upload succeeded but metadata insert failed, remove the orphaned object.
    if(uploadedPath&&session?.access_token){
      try{await fetch(API+'/storage/v1/object/lecture-assets/'+uploadedPath.split('/').map(encodeURIComponent).join('/'),{method:'DELETE',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token}})}catch{}
    }
    toast('تعذر الحفظ: '+err.message,'err')
  }
}

async function countLecturesForCourses(courses){
  if(!courses.length)return 0;
  try{
    const ids=courses.map(c=>c.id).join(',');
    const rows=await api(`lectures?select=id&course_id=in.(${ids})`);
    return rows.length;
  }catch{return 0}
}

async function count(table){try{const r=await api(`${table}?select=id`);return Array.isArray(r)?r.length:'—'}catch{return '—'}}
async function coursesPage(mine){let rows=[];try{if(mine){const me=await api(`students?select=id&auth_user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`);if(me.length){const subs=await api(`student_courses?select=course_id,active,expires_at&student_id=eq.${me[0].id}`);const now=Date.now();const ids=[...new Set(subs.filter(s=>s.active!==false&&(!s.expires_at||new Date(s.expires_at).getTime()>now)).map(s=>s.course_id))];if(ids.length)rows=await api(`courses?select=id,name,code,is_public,active,stage_id,image_url&id=in.(${ids.join(',')})&active=eq.true&order=name.asc`)} }else rows=await api('courses?select=id,name,code,is_public,active,stage_id,image_url&active=eq.true&order=name.asc')}catch(e){toast('تعذر تحميل الكورسات','err')}return `<section class="hero card"><div class="row"><div><h2>${mine?'كورساتي':'كل الكورسات'}</h2><p class="muted">${mine?'المحتوى المشترك فيه فقط.':'تصفح المواد المتاحة على المنصة.'}</p></div></div></section><section class="grid">${rows.length?rows.map(c=>`<article class="course card"><div class="cover">${c.image_url?`<img src="${esc(c.image_url)}" alt="" style="width:100%;height:100%;object-fit:cover">`:'📚'}</div><div class="body"><span class="tag">${c.is_public?'متاح':'مشتركين فقط'}</span><h3>${esc(c.name)}</h3><p class="muted">إدارة محتوى الكورس ومحاضراته.</p><button class="btn primary" onclick="go('course','${c.id}')">فتح الكورس</button></div></article>`).join(''):`<div class="card empty" style="grid-column:1/-1">لا توجد كورسات لعرضها حالياً.</div>`}</section>`}
async function coursePage(id){let c,l=[],subscribed=false;try{[c]=await api(`courses?select=*&id=eq.${encodeURIComponent(id)}&active=eq.true&limit=1`);if(!c)return `<section class="hero card"><h2>الكورس غير متاح</h2><button class="btn primary" onclick="go('catalog')">العودة للكورسات</button></section>`;if(c.is_public){subscribed=true}else{const me=await api(`students?select=id&auth_user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`);if(me.length){const subs=await api(`student_courses?select=course_id,active,expires_at&student_id=eq.${me[0].id}&course_id=eq.${encodeURIComponent(id)}`);const now=Date.now();subscribed=subs.some(s=>s.active!==false&&(!s.expires_at||new Date(s.expires_at).getTime()>now))}}if(subscribed)l=await api(`lectures?select=id,title,description,lecture_number,active,is_public&course_id=eq.${encodeURIComponent(id)}&active=eq.true&order=lecture_number.asc`)}catch(e){toast('تعذر تحميل تفاصيل الكورس','err')}return `<section class="hero card"><button class="link" onclick="go('catalog')">← رجوع لكل الكورسات</button><h2>${esc(c?.name||'الكورس')}</h2><p class="muted">${esc(c?.code ? 'كود الكورس: '+c.code : 'عرض محاضرات الكورس والمحتوى التعليمي.')}</p><span class="tag">${c?.is_public?'كورس مجاني':'كورس باشتراك'}</span></section>${!subscribed?`<section class="card panel"><h3>هذا الكورس متاح للمشتركين فقط</h3><p class="muted">تقدر تتصفح بيانات الكورس، لكن المحاضرات والملفات بتظهر بعد تفعيل اشتراكك من إدارة السنتر.</p><button class="btn secondary" onclick="go('catalog')">العودة لكل الكورسات</button></section>`:`<section class="card panel"><h3>المحاضرات</h3><div class="list">${l.length?l.map(x=>`<button class="item lecture ${x.is_public?'':'locked'}" onclick="go('lecture','${x.id}')"><div class="icon">${x.is_public?'▶':'🔒'}</div><div class="item-main"><b>${esc(x.title)}</b><small>المحاضرة ${esc(x.lecture_number)}</small></div></button>`).join(''):'<div class="empty">لا توجد محاضرات متاحة حالياً.</div>'}</div></section>`}`}
async function lecturePage(id){
  let l,files=[];
  try{
    [l]=await api(`lectures?select=id,title,description,course_id& id=eq.${encodeURIComponent(id)}&limit=1`.replace('& id=','&id='));
    if(!l) return `<section class="hero card"><h2>المحاضرة غير متاحة</h2><p class="muted">قد تكون المحاضرة غير نشطة أو تحتاج إلى اشتراك فعّال في الكورس.</p><button class="btn primary" onclick="go('courses')">العودة للكورسات</button></section>`;
    files=await api(`lecture_files?select=*&lecture_id=eq.${encodeURIComponent(id)}&active=eq.true`);
    files=await Promise.all(files.map(async f=>({...f,resolved_url:await resolveLectureFileUrl(f)})));
  }catch(err){
    return `<section class="hero card"><h2>تعذر فتح المحاضرة</h2><p class="muted">المحتوى غير متاح لحسابك حاليًا، أو حدث خطأ في الاتصال. تأكد من الاشتراك ثم حاول مرة أخرى.</p><button class="btn primary" onclick="go('courses')">العودة للكورسات</button></section>`;
  }
  const video=files.find(f=>/video|youtube|فيديو/i.test(String(f.file_type||''))&&(f.file_url||f.url||f.external_url));
  const resources=files.filter(f=>f!==video);
  return `<section class="hero card"><button class="link" onclick="go('course','${l.course_id}')">← رجوع للكورس</button><h2>${esc(l.title||'المحاضرة')}</h2><p class="muted">${esc(l.description||'')}</p></section><section class="card panel"><div class="video">${video?renderVideoResource(video):'<span class="muted">سيظهر الفيديو هنا بعد إضافته من المحاضر.</span>'}</div><h3>الملفات</h3><div class="list">${resources.length?resources.map(f=>`<a class="item" href="${esc(f.resolved_url||f.file_url||f.url||f.external_url||'#')}" target="_blank" rel="noopener"><div class="icon">📄</div><div class="item-main"><b>${esc(f.title||'ملف')}</b><small>${esc(f.file_type||'ملف')}</small></div></a>`).join(''):'<div class="empty">لا توجد ملفات.</div>'}</div></section>`}
async function lecturersPage(){
  let rows=[];
  try{rows=await api('lecturer_public_profiles?select=id,full_name,bio,image_url&order=full_name.asc')}catch{}
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
(async()=>{await loadSiteSettings();try{const hash=new URLSearchParams(location.hash.replace(/^#/, ''));const at=hash.get('access_token'),rt=hash.get('refresh_token');if(at&&rt){const ur=await fetch(API+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+at}});if(ur.ok){const user=await ur.json();saveSession({access_token:at,refresh_token:rt,user,expires_at:Number(hash.get('expires_at')||0)});history.replaceState(null,'',location.pathname+location.search);}}if(await restoreSession())await chooseRole();else render()}catch(e){clearSession();render()}})();
