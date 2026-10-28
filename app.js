const C=window.FC_CONFIG||{};const API=(C.supabaseUrl||'').replace(/\/$/,'');const KEY=C.supabaseKey||'';let session=null,siteSettings={},state={role:null,view:'home',data:{}},renderSequence=0;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function toast(msg,type=''){const d=document.createElement('div');d.className='toast '+type;d.textContent=msg;document.querySelector('#toast').appendChild(d);setTimeout(()=>d.remove(),3000)}
async function api(path,opts={}){const h={'apikey':KEY,'Authorization':`Bearer ${session?.access_token||KEY}`,'Content-Type':'application/json',...(opts.headers||{})};const r=await fetch(API+'/rest/v1/'+path,{...opts,headers:h});const text=await r.text();if(!r.ok){let message=text;try{const j=text?JSON.parse(text):null;message=j?.message||j?.details||j?.hint||j?.error_description||text}catch{}throw Error(message||r.statusText||('HTTP '+r.status))}if(!text.trim())return null;try{return JSON.parse(text)}catch{throw Error('استجابة غير متوقعة من الخادم (HTTP '+r.status+')')}}
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
function layout(content,nav=''){return `<div class="shell ${state.role==='student'?'student-shell':''}"><header class="topbar card">${logo()}<nav class="nav desktop-nav">${nav}</nav></header><main class="page">${content}</main><nav class="mobile-bottom-nav" aria-label="التنقل الرئيسي">${nav}</nav></div>`}
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
   <div class="auth-card-title"><span class="auth-title-icon">${isRegister?'♙':'🎓'}</span><div><h2>${isRegister?'إنشاء حساب جديد':'تسجيل الدخول'}</h2><p>${isRegister?'ابدأ رحلتك التعليمية':'أهلًا بك في منصة فيوتشر'}</p></div></div>
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
 <p class="auth-switch">ليس لديك حساب؟ <button type="button" class="text-link strong" onclick="state.view='register';render()">إنشاء حساب جديد</button></p>
 </form>`}
function registerForm(){return `<form class="auth-form register-form" onsubmit="doRegister(event)">
 <label class="auth-field"><span class="field-icon">✉</span><input class="input" id="email" type="email" required autocomplete="email" placeholder="البريد الإلكتروني"></label>
 <label class="auth-field"><span class="field-icon">♙</span><input class="input" id="password" type="password" minlength="8" required autocomplete="new-password" placeholder="كلمة المرور"><button type="button" class="password-toggle" onclick="togglePassword('password',this)" aria-label="إظهار كلمة المرور">◉</button></label>
 <label class="auth-field"><span class="field-icon">♙</span><input class="input" id="confirm_password" type="password" minlength="8" required autocomplete="new-password" placeholder="تأكيد كلمة المرور"><button type="button" class="password-toggle" onclick="togglePassword('confirm_password',this)" aria-label="إظهار كلمة المرور">◉</button></label>
 <p class="muted">بعد إنشاء الحساب، استكشف الكورسات أولًا واستكمل بياناتك الدراسية عند طلب الاشتراك فقط.</p>
 <label class="terms-option"><input type="checkbox" id="terms_accept" required><span>أوافق على الشروط والأحكام وسياسة الخصوصية</span></label>
 <button class="btn primary btn-wide auth-submit">إنشاء الحساب <span aria-hidden="true">♙+</span></button>
 <p class="auth-switch">لديك حساب بالفعل؟ <button type="button" class="text-link strong" onclick="state.view='login';render()">تسجيل الدخول</button></p>
 </form>`}
function togglePassword(id,button){const el=document.getElementById(id);if(!el)return;el.type=el.type==='password'?'text':'password';button.textContent=el.type==='password'?'◉':'◎'}
async function resetPassword(){const el=document.getElementById('email');const email=el?.value?.trim();if(!email){toast('اكتب بريدك الإلكتروني أولًا لإرسال رابط تغيير كلمة المرور','err');el?.focus();return}try{await auth('recover',{email,redirect_to:location.origin+location.pathname});toast('لو البريد مسجل، هيوصلك رابط استعادة كلمة المرور','ok')}catch(e){toast(e.message||'تعذر إرسال رابط الاستعادة','err')}}
function startOAuth(provider){const redirect=encodeURIComponent(location.origin+location.pathname);location.href=API+'/auth/v1/authorize?provider='+encodeURIComponent(provider)+'&redirect_to='+redirect+'&apikey='+encodeURIComponent(KEY)}
async function loadRegisterOptions(){try{const cs=await api('countries?select=id,name&active=eq.true&order=name.asc');document.querySelector('#country_id').innerHTML='<option value="">اختر الدولة</option>'+cs.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}catch(e){toast('تعذر تحميل الدول','err')}}
async function loadUniversities(id){const el=document.querySelector('#university_id'),st=document.querySelector('#stage_id');el.innerHTML='<option>جاري التحميل...</option>';st.innerHTML='<option value="">اختر المرحلة</option>';if(!id)return;try{const x=await api(`universities?select=id,name&country_id=eq.${encodeURIComponent(id)}&active=eq.true&order=name.asc`);el.innerHTML='<option value="">اختر الجامعة</option>'+x.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}catch(e){toast('تعذر تحميل الجامعات','err')}}
async function loadStages(id){const el=document.querySelector('#stage_id');el.innerHTML='<option value="">اختر المرحلة</option>';if(!id)return;try{const x=await api(`stages?select=id,name&university_id=eq.${encodeURIComponent(id)}&active=eq.true&order=name.asc`);el.innerHTML='<option value="">اختر المرحلة</option>'+x.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}catch(e){toast('تعذر تحميل المراحل','err')}}
async function doLogin(e){e.preventDefault();try{const j=await auth('token?grant_type=password',{email:email.value.trim(),password:password.value});saveSession(j);await chooseRole()}catch(x){const m=String(x?.message||'');if(/email not confirmed/i.test(m))toast('حسابك اتعمل لكن البريد محتاج تفعيل مرة واحدة. استخدم رابط إعادة إرسال التفعيل أو راجع إعدادات التسجيل لتسهيل الدخول.','err');else if(/invalid login credentials/i.test(m))toast('البريد أو كلمة المرور غير صحيحة. لو سجلت حالًا، تأكد أن الحساب مفعّل.','err');else toast(m,'err')}}
async function doRegister(e){
 e.preventDefault();
 const emailInput=document.getElementById('email'),passwordInput=document.getElementById('password'),confirmInput=document.getElementById('confirm_password');
 const emailValue=String(emailInput?.value||'').trim().toLowerCase(),passwordValue=String(passwordInput?.value||'');
 if(passwordValue!==String(confirmInput?.value||'')){toast('كلمتا المرور غير متطابقتين','err');return}
 if(passwordValue.length<8){toast('كلمة المرور لازم تكون 8 أحرف على الأقل','err');return}
 const submit=e.submitter||e.target.querySelector('.auth-submit');if(submit)submit.disabled=true;
 try{
  const j=await auth('signup',{email:emailValue,password:passwordValue});
  const user=j.user||(j.id?j:null),authSession=j.session||j;
  if(authSession?.access_token&&user){saveSession({...authSession,user});toast('تم إنشاء الحساب بنجاح','ok');await chooseRole()}
  else{state.view='login';render();toast('تم إنشاء الحساب. افتح رسالة التأكيد على بريدك الإلكتروني، ثم سجّل الدخول.','ok')}
 }catch(x){
  const m=String(x?.message||'');
  if(/email rate limit exceeded|rate limit/i.test(m))toast('وصلنا لحد إرسال الرسائل مؤقتًا. انتظر قليلًا ثم حاول مرة أخرى.','err');
  else if(/already registered|user already registered/i.test(m))toast('البريد مسجل بالفعل. سجّل الدخول أو استخدم «نسيت كلمة المرور».','err');
  else toast(m,'err');
 }finally{if(submit)submit.disabled=false}
}
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
function go(v,id){state.view=v;if(id!==undefined)state.data.id=id;render();}
async function render(){
  const requestId=++renderSequence;
  const root=document.querySelector('#app');
  if(!session){
    root.innerHTML=authView(state.view==='register'?'register':'login');
    
    return;
  }
  const requestedView=state.view, requestedRole=state.role, requestedId=state.data.id;
  let html='';
  try{
    if(requestedRole==='student') html=await studentPage();
    else if(requestedRole==='lecturer') {
      html=await lecturerPage();
      if(requestedView==='lecturerlecture' || requestedView==='lecture') html=await lecturerLecturePage(requestedId);
    } else if(requestedRole==='admin') html=await adminPage();
    else html=await studentPage();
  }catch(error){
    console.error('Future Center render failed',error);
    html='<section class="hero card"><h2>حصلت مشكلة في تحميل الصفحة</h2><p class="muted">راجع اتصال الإنترنت وحاول مرة أخرى.</p><button class="btn primary" onclick="render()">إعادة المحاولة</button></section>';
  }
  // Ignore slower requests from the page the user already left.
  if(requestId!==renderSequence || requestedView!==state.view || requestedRole!==state.role || requestedId!==state.data.id) return;
  root.innerHTML=layout(html,navFor(state.role));
  root.dataset.view=state.view;
}
async function studentPage(){
 if(state.view==='home') return redesignedStudentHome();
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
  <section class="home-section glass-panel"><div class="home-section-head"><div><span class="section-kicker">مسارك الدراسي</span><h2>كورساتك بعد الاشتراك <span class="round-icon">◆</span></h2></div><button class="text-action" onclick="go('courses')">عرض الكل ←</button></div>
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
 if(state.view==='lecturer')return lecturerDetailPage(state.data.id);
 if(state.view==='profile')return profilePage();
 if(state.view==='course')return coursePage(state.data.id);
 if(state.view==='lecture')return lecturePage(state.data.id);
 return '';
}
function filterStudentCourses(q){const v=String(q||'').trim().toLocaleLowerCase();document.querySelectorAll('[data-course-search]').forEach(el=>{el.style.display=el.dataset.courseSearch.toLocaleLowerCase().includes(v)?'':'none'})}
async function lecturerPage(){
 let courses=[],lecturer;
 try{
  const me=await api('lecturers?select=id,full_name,email,active&auth_user_id=eq.'+encodeURIComponent(session.user.id)+'&active=eq.true&limit=1');
  lecturer=me?.[0];
  if(!lecturer)return '<section class="hero card"><h2>حساب المحاضر غير مكتمل</h2><p class="muted">لم يتم ربط حسابك بملف محاضر بعد.</p></section>';
  courses=await api('courses?select=id,name,code,is_public,active,stage_id&lecturer_id=eq.'+encodeURIComponent(lecturer.id)+'&order=name.asc');
  const totalLectures=await countLecturesForCourses(courses);
  const actions='<section class="card panel fc-lecturer-actions"><h3>إدارة المحتوى</h3><p class="muted">ابدأ بإنشاء كورس، ثم أضف محاضراته وارفع الفيديوهات وملفات PDF من جهازك.</p><div class="fc-lecturer-action-grid"><button type="button" class="fc-lecturer-action fc-add-course" onclick="createLecturerCourse()"><span>＋</span><b>إضافة كورس</b><small>إنشاء كورس جديد</small></button><button type="button" class="fc-lecturer-action fc-add-lecture" onclick="createLecturerLecturePrompt()"><span>🎥</span><b>إضافة محاضرة</b><small>داخل أحد كورساتك</small></button><button type="button" class="fc-lecturer-action fc-add-pdf" onclick="openLecturerFilePicker()"><span>📄</span><b>رفع PDF</b><small>إلى محاضرة موجودة</small></button></div></section>';
  if(state.view==='mycourses')return '<section class="hero card"><h2>كورساتي</h2><p class="muted">الكورسات الخاصة بك فقط.</p></section>'+actions+'<section class="grid">'+(courses.length?courses.map(c=>'<article class="course card fc-lecturer-course"><div class="cover">📚</div><div class="body"><span class="tag">'+(c.is_public?'متاح':'مشتركين فقط')+'</span><h3>'+esc(c.name)+'</h3><p class="muted">إدارة محتوى الكورس ومحاضراته.</p><button class="btn primary" onclick="go(\'lecturercourse\',\''+esc(c.id)+'\')">إدارة المحاضرات</button></div></article>').join(''):'<div class="card empty" style="grid-column:1/-1">لسه مفيش كورسات مرتبطة بيك. اضغط «إضافة كورس» للبدء.</div>')+'</section>';
  if(state.view==='lecturercourse'){
   const co=courses.find(x=>String(x.id)===String(state.data.id));if(!co)return '<section class="card empty">هذا الكورس غير متاح لحسابك.</section>';
   const lectures=await api('lectures?select=id,title,description,lecture_number,active,is_public,course_id&course_id=eq.'+encodeURIComponent(co.id)+'&order=lecture_number.asc');
   let pdfsByLecture={};
   if(lectures.length){
    try{
     const ids=lectures.map(x=>x.id).join(',');
     const resources=await api('lecture_files?select=id,title,file_url,file_type,lecture_id,active&lecture_id=in.('+ids+')&active=eq.true');
     const pdfs=resources.filter(f=>/pdf/i.test(String(f.file_type||'')+' '+String(f.title||'')+' '+String(f.file_url||f.url||f.external_url||'')));
     for(const f of pdfs){const href=await resolveLectureFileUrl(f);if(href)(pdfsByLecture[f.lecture_id]||(pdfsByLecture[f.lecture_id]=[])).push({...f,resolved_url:href})}
    }catch(err){console.warn('تعذر تحميل ملفات PDF للمحاضر',err)}
   }
   return '<section class="hero card fc-lecturer-subhero"><button class="link" onclick="go(\'mycourses\')">← رجوع</button><span class="fc-lecturer-eyebrow">COURSE MANAGEMENT</span><h2>'+esc(co.name)+'</h2><p class="muted">كل محاضرة وملفاتها في مكان واحد.</p></section>'+actions+'<section class="card panel fc-lecturer-lectures"><div class="row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><h3>المحاضرات وملفاتها</h3><button class="btn primary" type="button" onclick="createLecturerLecture(\''+esc(co.id)+'\')">＋ إضافة محاضرة</button></div><p class="muted">ملفات PDF هتظهر تحت المحاضرة الخاصة بيها تلقائيًا بعد رفعها.</p><div class="fc-lecturer-lecture-list">'+(lectures.length?lectures.map(x=>'<div class="fc-lecturer-lecture-card"><button class="item lecture" onclick="go(\'lecturerlecture\',\''+esc(x.id)+'\')" type="button"><div class="icon">🎥</div><div class="item-main"><b>'+esc(x.title)+'</b><small>المحاضرة '+esc(x.lecture_number??'—')+'</small></div><span class="tag">'+(x.active?'نشطة':'موقوفة')+'</span></button>'+((pdfsByLecture[x.id]||[]).length?'<div class="fc-lecturer-pdfs">'+pdfsByLecture[x.id].map(f=>'<div class="fc-lecturer-pdf"><div class="fc-pdf-icon">PDF</div><div class="fc-pdf-info"><b>'+esc(f.title||'ملف المحاضرة')+'</b><small>ملف PDF مرفق بالمحاضرة</small></div><a class="fc-pdf-view" href="'+esc(f.resolved_url)+'" target="_blank" rel="noopener">عرض PDF ↗</a></div>').join('')+'</div>':'<div class="fc-lecturer-no-pdf">📄 لا يوجد PDF مضاف لهذه المحاضرة بعد</div>')+'<button type="button" class="fc-lecturer-upload-pdf" onclick="openLectureResourceForm(\''+esc(x.id)+'\',\'file\')">＋ رفع PDF لهذه المحاضرة</button></div>').join(''):'<div class="empty">لا توجد محاضرات. أضف أول محاضرة من الزر بالأعلى.</div>')+'</div></section>';
  }
  return '<section class="hero card fc-lecturer-hero"><span class="fc-lecturer-eyebrow">FUTURE CENTER · LECTURER STUDIO</span><h2>أهلاً بك في لوحة المحاضر 👋</h2><p class="muted">إدارة كورساتك ومحاضراتك من مكان واحد.</p><div class="grid2"><div class="stat card fc-lecturer-stat"><small>كورساتي</small><div class="num">'+courses.length+'</div></div><div class="stat card fc-lecturer-stat"><small>المحاضرات</small><div class="num">'+totalLectures+'</div></div></div><button class="btn primary" onclick="go(\'mycourses\')">عرض كورساتي</button></section>'+actions;
 }catch(e){return '<section class="hero card"><h2>تعذر تحميل لوحة المحاضر</h2><p class="muted">'+esc(e.message)+'</p></section>'}
}
async function createLecturerCourse(){
 const name=prompt('اسم الكورس:');if(name===null)return;if(!name.trim()){toast('اكتب اسم الكورس','err');return}
 const code=prompt('كود الكورس (اختياري):','')||'';
 try{
  const me=await api('lecturers?select=id,active&auth_user_id=eq.'+encodeURIComponent(session.user.id)+'&active=eq.true&limit=1');if(!me.length)throw Error('حساب المحاضر غير مكتمل');
  const stages=await api('stages?select=id,name,active&active=eq.true&order=id.asc');
  if(!stages.length)throw Error('لا توجد مراحل دراسية نشطة. اطلب من الإدارة إضافة مرحلة دراسية أولًا.');
  let stage=stages[0];
  if(stages.length>1){const opts=stages.map((x,i)=>(i+1)+'. '+x.name).join('\\n');const n=Number(prompt('اختار المرحلة الدراسية للكورس:\\n'+opts,'1'));if(!Number.isInteger(n)||n<1||n>stages.length)return;stage=stages[n-1]}
  const body={name:name.trim(),code:code.trim()||null,stage_id:stage.id,lecturer_id:me[0].id,active:true,is_public:false};
  const rows=await api('courses',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});const row=Array.isArray(rows)?rows[0]:rows;
  if(!row?.id)throw Error('لم يتم إرجاع بيانات الكورس؛ راجع صلاحيات إضافة الكورسات');
  toast('تم إنشاء الكورس. يمكنك الآن إضافة المحاضرات.','ok');go('lecturercourse',row.id);
 }catch(e){toast('تعذر إنشاء الكورس: '+(e.message||'خطأ غير معروف'),'err')}
}
async function createLecturerLecturePrompt(){
 try{
  const me=await api('lecturers?select=id&auth_user_id=eq.'+encodeURIComponent(session.user.id)+'&active=eq.true&limit=1');if(!me.length)throw Error('حساب المحاضر غير مكتمل');
  const courses=await api('courses?select=id,name&lecturer_id=eq.'+encodeURIComponent(me[0].id)+'&active=eq.true&order=name.asc');
  if(!courses.length){toast('أضف كورسًا أولًا قبل إنشاء المحاضرة','err');return}
  let choice;
  if(courses.length===1)choice=courses[0];else{const opts=courses.map((x,i)=>(i+1)+'. '+x.name).join('\n');const n=Number(prompt('اختار رقم الكورس:\n'+opts,'1'));if(!Number.isInteger(n)||n<1||n>courses.length)return;choice=courses[n-1]}
  await createLecturerLecture(choice.id);
 }catch(e){toast('تعذر اختيار الكورس: '+(e.message||'خطأ'),'err')}
}
async function openLecturerFilePicker(){
 try{
  const me=await api('lecturers?select=id&auth_user_id=eq.'+encodeURIComponent(session.user.id)+'&active=eq.true&limit=1');if(!me.length)throw Error('حساب المحاضر غير مكتمل');
  const courses=await api('courses?select=id,name&lecturer_id=eq.'+encodeURIComponent(me[0].id)+'&active=eq.true&order=name.asc');
  if(!courses.length){toast('أضف كورسًا أولًا','err');return}
  const all=[];for(const co of courses){const ls=await api('lectures?select=id,title,course_id&course_id=eq.'+encodeURIComponent(co.id)+'&active=eq.true&order=lecture_number.asc');for(const l of ls)all.push({...l,course_name:co.name})}
  if(!all.length){toast('أضف محاضرة أولًا، وبعدها ارفع PDF','err');return}
  let l;if(all.length===1)l=all[0];else{const opts=all.map((x,i)=>(i+1)+'. '+x.course_name+' — '+x.title).join('\n');const n=Number(prompt('اختار المحاضرة لرفع PDF:\n'+opts,'1'));if(!Number.isInteger(n)||n<1||n>all.length)return;l=all[n-1]}
  openLectureResourceForm(l.id,'file');
 }catch(e){toast('تعذر فتح اختيار المحاضرة: '+(e.message||'خطأ'),'err')}
}

async function createLecturerLecture(courseId){
 const title=prompt('اسم المحاضرة:');if(title===null)return;
 if(!title.trim()){toast('اكتب اسم المحاضرة','err');return}
 const numText=prompt('رقم المحاضرة (اختياري):','1');if(numText===null)return;
 const n=numText.trim()===''?null:Number(numText);
 if(n!==null&&(!Number.isInteger(n)||n<1)){toast('رقم المحاضرة لازم يكون رقمًا صحيحًا موجبًا','err');return}
 const description=prompt('وصف المحاضرة (اختياري):','')||'';
 try{
  const me=await api('lecturers?select=id,active&auth_user_id=eq.'+encodeURIComponent(session.user.id)+'&active=eq.true&limit=1');
  if(!me.length)throw Error('حساب المحاضر غير مكتمل');
  const owned=await api('courses?select=id,lecturer_id,is_public&id=eq.'+encodeURIComponent(courseId)+'&lecturer_id=eq.'+encodeURIComponent(me[0].id)+'&active=eq.true&limit=1');
  if(!owned.length)throw Error('الكورس غير مرتبط بحسابك أو غير نشط');
  const body={title:title.trim(),description:description.trim()||null,lecture_number:n,active:true,is_public:owned[0].is_public===true,course_id:Number(courseId),lecturer_id:me[0].id};
  const result=await api('lectures',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
  const created=Array.isArray(result)?result[0]:result;
  if(!created?.id)throw Error('تم إرسال الطلب لكن لم يتم إرجاع المحاضرة؛ حدّث الصفحة وتحقق من القائمة');
  toast('تم إنشاء المحاضرة. افتحها لإضافة الفيديو وملفات PDF.','ok');go('lecturerlecture',created.id);
 }catch(e){toast('تعذر إنشاء المحاضرة: '+(e.message||'خطأ غير معروف'),'err')}
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
    try{const me=await api(`students?select=full_name&auth_user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`);studentName=String(me?.[0]?.full_name||session.user.user_metadata?.full_name||session.user.email||'طالب مشترك').trim()}catch(_){studentName=String(session.user.user_metadata?.full_name||session.user.email||'طالب مشترك').trim()}
    files=await api(`lecture_files?select=*&lecture_id=eq.${encodeURIComponent(id)}&active=eq.true`);files=await Promise.all(files.map(async f=>({...f,resolved_url:await resolveLectureFileUrl(f)})));
  }catch(e){
    return `<section class="hero card"><h2>تعذر تحميل المحاضرة</h2><p class="muted">${esc(e.message)}</p></section>`;
  }
  const video=files.find(f=>/video|youtube|فيديو/i.test(String(f.file_type||'')) && (f.file_url||f.url||f.external_url));
  const resources=files.filter(f=>f!==video);
  return `<section class="hero card"><button class="link" onclick="go('lecturercourse','${esc(l.course_id)}')">← رجوع للمحاضرات</button><h2>${esc(l.title||'المحاضرة')}</h2><p class="muted">المحاضرة ${esc(l.lecture_number||'')}</p></section>
  <section class="card panel"><h3>محتوى المحاضرة</h3><p class="muted">${esc(l.description||'لا يوجد وصف مضاف.')}</p>
  <div class="grid2" style="margin:16px 0"><button class="btn primary" onclick="openLectureResourceForm('${esc(l.id)}','video')">＋ إضافة فيديو</button><button class="btn secondary" onclick="openLectureResourceForm('${esc(l.id)}','file')">＋ رفع ملف / PDF</button></div>
  <div class="video" style="position:relative">${video?renderVideoResource(video):'<span class="muted">لا يوجد فيديو مضاف لهذه المحاضرة حتى الآن.</span>'}</div>
  <h3>الملفات والمرفقات</h3><div class="list">${resources.length?resources.map(f=>{const href=f.resolved_url||f.file_url||f.url||f.external_url||f.storage_path||'';return href?`<a class="item" href="${esc(href)}" target="_blank" rel="noopener"><div class="icon">📄</div><div class="item-main"><b>${esc(f.title||'ملف')}</b><small>${esc(f.file_type||'ملف')}</small></div></a>`:`<div class="item"><div class="icon">📄</div><div class="item-main"><b>${esc(f.title||'ملف')}</b><small>${esc(f.file_type||'ملف')}</small></div></div>`}).join(''):'<div class="empty">لا توجد ملفات مضافة.</div>'}</div></section>`;
}
function renderVideoResource(f,studentName=''){
  const raw=String(f.resolved_url||f.file_url||f.url||f.external_url||'').trim();
  let videoId='';
  try{
    const u=new URL(raw);
    const host=u.hostname.toLowerCase().replace(/^www\\./,'');
    if(host==='youtu.be') videoId=u.pathname.split('/').filter(Boolean)[0]||'';
    else if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(host)){
      const parts=u.pathname.split('/').filter(Boolean);
      if(u.pathname==='/watch') videoId=u.searchParams.get('v')||'';
      else if(['embed','shorts','live','v'].includes(parts[0])) videoId=parts[1]||'';
    }
  }catch{}
  if(/^[A-Za-z0-9_-]{11}$/.test(videoId)) return `<div class="fc-video-frame" style="position:absolute;inset:0;width:100%;height:100%;background:#000"><iframe src="https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0" title="${esc(f.title||'فيديو المحاضرة')}" style="position:absolute;inset:0;width:100%;height:100%;border:0" referrerpolicy="origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe><div aria-hidden="true" style="position:absolute;inset:0;z-index:2;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;overflow:hidden;color:rgba(255,255,255,.38);font-size:clamp(12px,2.4vw,22px);font-weight:800;text-shadow:0 1px 4px #000;transform:rotate(-18deg);user-select:none;-webkit-user-select:none"><span>FUTURE CENTER · محتوى تعليمي خاص</span>${studentName?`<span style="font-size:clamp(11px,2vw,18px)">خاص بالطالب: ${esc(studentName)}</span>`:''}</div></div>`;
  if(/\\.(mp4|webm|ogg)(\\?|$)/i.test(raw)) return `<video controls playsinline controlsList="nodownload noplaybackrate" disablePictureInPicture style="width:100%;height:100%;border-radius:16px" src="${esc(raw)}"></video>`;
  return `<span class="muted">تعذر عرض الفيديو بهذا الرابط. تأكد من نسخ رابط YouTube كاملًا.</span>`;
}
function openLectureResourceForm(lectureId,kind){
 document.querySelector('#resourceModal')?.remove();
 const isVideo=kind==='video';
 const html=`<div class="modal" id="resourceModal"><div class="card"><div class="row"><h2>${isVideo?'رفع فيديو للمحاضرة':'إضافة ملف للمحاضرة'}</h2><button type="button" class="btn secondary" onclick="document.querySelector('#resourceModal')?.remove()">×</button></div><p class="muted">${isVideo?'أضف رابط فيديو YouTube؛ سيظهر الفيديو للطالب داخل صفحة المحاضرة.':'ارفع ملف المحاضرة أو أضف رابطًا للملف.'}</p><form onsubmit="saveLectureResource(event,'${esc(lectureId)}','${kind}')"><div class="field"><label>اسم ${isVideo?'الفيديو':'الملف'}</label><input class="input" name="title" required placeholder="${isVideo?'مثال: المحاضرة الأولى':'مثال: ملخص المحاضرة'}"></div>${isVideo?'<div class="field"><label>رابط فيديو YouTube</label><input class="input" name="video_url" type="url" inputmode="url" placeholder="https://www.youtube.com/watch?v=..." required><small class="muted">ارفع الفيديو على YouTube أولًا، واجعل ظهوره غير مدرج، ثم انسخ الرابط هنا.</small></div>':'<div class="field"><label>رابط الملف (اختياري)</label><input class="input" name="file_url" type="url" placeholder="رابط HTTPS للملف"><div class="field"><label>أو ارفع ملفًا (حد أقصى 100 ميجابايت)</label><input class="input" name="upload_file" type="file" accept=".pdf,.docx,.pptx,.zip,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"></div></div>'}<div id="resourceUploadStatus" class="muted" role="status" style="margin:10px 0;display:none"></div><button class="btn primary btn-wide" id="resourceSaveButton">${isVideo?'رفع الفيديو وحفظه':'حفظ الملف'}</button></form></div></div>`;
 document.body.insertAdjacentHTML('beforeend',html);
}
function uploadPrivateVideoResumable(file,path){
 return new Promise((resolve,reject)=>{
  if(!window.tus?.Upload){reject(new Error('تعذر تحميل مكوّن رفع الفيديو؛ حدّث الصفحة وحاول مرة أخرى'));return}
  const status=document.querySelector('#resourceUploadStatus'),button=document.querySelector('#resourceSaveButton');
  const show=(text)=>{if(status){status.style.display='block';status.textContent=text}};
  const upload=new tus.Upload(file,{endpoint:API+'/storage/v1/upload/resumable',chunkSize:6*1024*1024,retryDelays:[0,1000,3000,5000,10000],headers:{apikey:KEY,Authorization:'Bearer '+session.access_token},metadata:{bucketName:'lecture-assets',objectName:path,contentType:file.type||'video/mp4',cacheControl:'3600'},onError(err){reject(err)},onProgress(bytesUploaded,bytesTotal){const pct=Math.floor(bytesUploaded/bytesTotal*100);show('جاري رفع الفيديو… '+pct+'% ('+Math.round(bytesUploaded/1048576)+' من '+Math.ceil(bytesTotal/1048576)+' ميجابايت)');if(button)button.disabled=true},onSuccess(){show('اكتمل رفع الفيديو، جارٍ حفظ بيانات المحاضرة…');resolve(path)}});
  upload.start();
 });
}
async function saveLectureResource(e,lectureId,kind){
 e.preventDefault();
 const fd=new FormData(e.target),title=String(fd.get('title')||'').trim();let url=String(fd.get('file_url')||'').trim();const upload=fd.get('upload_file');const isVideo=kind==='video';if(isVideo)url=String(fd.get('video_url')||'').trim();
 if(!title){toast('اكتب اسم الملف أو الفيديو','err');return}
 if(isVideo&&!/^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(url)){toast('أضف رابط فيديو صحيحًا من YouTube','err');return}
 if(!isVideo&&!upload?.size&&!/^https:\/\//i.test(url)){toast('أضف رابط HTTPS أو اختر ملفًا للرفع','err');return}
 
 if(!isVideo&&upload?.size>104857600){toast('الحد الأقصى للملف 100 ميجابايت','err');return}
 let uploadedPath='';
 const button=document.querySelector('#resourceSaveButton');if(button)button.disabled=true;
 try{
  const [l]=await api('lectures?select=id,course_id&id=eq.'+encodeURIComponent(lectureId)+'&limit=1');
  if(!l)throw Error('المحاضرة غير موجودة أو لا تملك صلاحية الوصول إليها');
  const me=await api('lecturers?select=id&auth_user_id=eq.'+encodeURIComponent(session.user.id)+'&active=eq.true&limit=1');
  if(!me.length)throw Error('حساب المحاضر غير مكتمل');
  const owned=await api('courses?select=id&lecturer_id=eq.'+encodeURIComponent(me[0].id)+'&id=eq.'+encodeURIComponent(l.course_id)+'&limit=1');
  if(!owned.length)throw Error('لا تملك صلاحية تعديل هذه المحاضرة');
  let fileType=isVideo?'youtube':'file';
  if(upload?.size){
   const safe=upload.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-90)||(isVideo?'lecture.mp4':'file');
   url=l.id+'/'+Date.now()+'-'+safe;uploadedPath=url;
   if(isVideo){throw Error('ارفع فيديو YouTube والصق رابطه بدل رفع الملف مباشرة')}
   else{
    const up=await fetch(API+'/storage/v1/object/lecture-assets/'+url.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':upload.type||'application/octet-stream','x-upsert':'false'},body:upload});
    if(!up.ok)throw Error(await up.text());
    fileType=/\.pdf$/i.test(upload.name)?'pdf':'file';
   }
  }
  const record={lecture_id:l.id,title,file_url:url,file_type:fileType,active:true};
  await api('lecture_files',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(record)});
  uploadedPath='';
  document.querySelector('#resourceModal')?.remove();toast(isVideo?'تم حفظ رابط فيديو YouTube':'تم حفظ الملف','ok');await render();
 }catch(err){
  if(uploadedPath&&session?.access_token){try{await fetch(API+'/storage/v1/object/lecture-assets/'+uploadedPath.split('/').map(encodeURIComponent).join('/'),{method:'DELETE',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token}})}catch{}}
  if(button)button.disabled=false;
  toast('تعذر الحفظ: '+(err.message||'خطأ غير معروف'),'err');
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
async function coursePage(id){
 let c=null,l=[],student=null,subscribed=false,latestRequest=null,pdfsByLecture={};
 try{
  const rows=await api('courses?select=id,name,code,is_public,active,stage_id,image_url&id=eq.'+encodeURIComponent(id)+'&active=eq.true&limit=1');c=rows[0];
  if(!c)return '<section class="hero card"><h2>الكورس غير متاح</h2><button class="btn primary" onclick="go(\'catalog\')">العودة للكورسات</button></section>';
  const me=await api('students?select=id,full_name,email,phone,country_id,university_id,stage_id&auth_user_id=eq.'+encodeURIComponent(session.user.id)+'&limit=1');student=me[0]||null;
  subscribed=Boolean(c.is_public);
  if(!subscribed&&student){
   const subs=await api('student_courses?select=course_id,active,expires_at&student_id=eq.'+encodeURIComponent(student.id)+'&course_id=eq.'+encodeURIComponent(c.id));
   const now=Date.now();subscribed=subs.some(s=>s.active!==false&&(!s.expires_at||new Date(s.expires_at).getTime()>now));
   if(!subscribed){const reqs=await api('course_enrollment_requests?select=id,status,created_at&student_id=eq.'+encodeURIComponent(student.id)+'&course_id=eq.'+encodeURIComponent(c.id)+'&order=created_at.desc&limit=1');latestRequest=reqs[0]||null}
  }
  if(subscribed){
   l=await api('lectures?select=id,title,description,lecture_number,active,is_public&course_id=eq.'+encodeURIComponent(c.id)+'&active=eq.true&order=lecture_number.asc');
   if(l.length){
    const ids=l.map(x=>x.id).join(',');
    const files=await api('lecture_files?select=id,title,file_url,file_type,lecture_id,active&lecture_id=in.('+ids+')&active=eq.true');
    const pdfs=files.filter(f=>/pdf/i.test(String(f.file_type||'')+' '+String(f.title||'')+' '+String(f.file_url||f.url||f.external_url||'')));
    for(const f of pdfs){const href=await resolveLectureFileUrl(f);if(href)(pdfsByLecture[f.lecture_id]||(pdfsByLecture[f.lecture_id]=[])).push({...f,resolved_url:href})}
   }
  }
 }catch(e){console.warn('تعذر تحميل تفاصيل الكورس',e);return '<section class="hero card"><h2>تعذر تحميل الكورس</h2><p class="muted">راجع اتصال الإنترنت أو صلاحيات الحساب وحاول مرة أخرى.</p><button class="btn primary" onclick="render()">إعادة المحاولة</button></section>'}
 let accessPanel='';
 if(!subscribed){
  if(latestRequest&&latestRequest.status==='pending')accessPanel='<section class="card panel"><h3>طلب الاشتراك قيد المراجعة</h3><p class="muted">وصل طلبك لإدارة السنتر. هتظهر المحاضرات بعد مراجعة بياناتك وتفعيل الاشتراك.</p></section>';
  else accessPanel='<section class="card panel"><h3>ابدأ طلب الاشتراك</h3><p class="muted">استكشف الكورس أولًا. عند طلب الاشتراك هنراجع بياناتك الدراسية وشروط الكورس، ثم تراجع الإدارة الطلب قبل فتح المحاضرات.</p>'+(latestRequest&&latestRequest.status==='rejected'?'<p class="muted">الطلب السابق لم تتم الموافقة عليه؛ راجع بياناتك قبل إعادة الإرسال.</p>':'')+'<button class="btn primary" onclick="openCourseEnrollmentForm(\''+esc(c.id)+'\')">طلب الاشتراك ←</button></section>';
 }
 const lectureHtml=subscribed?'<section class="card panel fc-course-lectures"><div class="fc-course-section-heading"><h3>المحاضرات</h3><span class="fc-course-count">'+l.length+' محاضرة</span></div><div class="fc-course-lecture-list">'+(l.length?l.map(x=>'<div class="fc-course-lecture"><button class="item lecture '+(x.is_public?'':'locked')+'" onclick="go(\'lecture\',\''+esc(x.id)+'\')"><div class="icon">'+(x.is_public?'▶':'🔒')+'</div><div class="item-main"><b>'+esc(x.title)+'</b><small>المحاضرة '+esc(x.lecture_number??'—')+'</small></div><span class="fc-lecture-open">فتح المحاضرة ←</span></button>'+((pdfsByLecture[x.id]||[]).length?'<div class="fc-lecture-pdfs">'+pdfsByLecture[x.id].map(f=>'<div class="fc-lecture-pdf"><div class="fc-pdf-icon">PDF</div><div class="fc-pdf-info"><b>'+esc(f.title||'ملف المحاضرة')+'</b><small>ملف PDF خاص بهذه المحاضرة</small></div><a class="fc-pdf-view" href="'+esc(f.resolved_url)+'" target="_blank" rel="noopener">عرض PDF ↗</a></div>').join('')+'</div>':'<div class="fc-lecture-no-pdf"><span>📄</span> لا يوجد PDF مضاف لهذه المحاضرة بعد</div>')+'</div>').join(''):'<div class="empty">لا توجد محاضرات متاحة حالياً.</div>')+'</div></section>':'';
 return '<section class="hero card"><button class="link" onclick="go(\'catalog\')">← رجوع لكل الكورسات</button><h2>'+esc(c.name)+'</h2><p class="muted">'+esc(c.code?'كود الكورس: '+c.code:'استكشف تفاصيل الكورس والمحاضر والمحتوى المتاح.')+'</p><span class="tag">'+(c.is_public?'محاضرات مجانية متاحة':'اشتراك مطلوب للمحاضرات')+'</span></section>'+accessPanel+lectureHtml;
}
async function openCourseEnrollmentForm(courseId){
 try{
  const cs=await api('courses?select=id,name,is_public,active,stage_id&id=eq.'+encodeURIComponent(courseId)+'&active=eq.true&limit=1'),c=cs[0];
  if(!c){toast('الكورس غير متاح حاليًا','err');return}
  if(c.is_public){toast('الكورس متاح للمشاهدة؛ افتحه من صفحة الكورس.','ok');return}
  const students=await api('students?select=id,full_name,email,phone,country_id,university_id,stage_id&auth_user_id=eq.'+encodeURIComponent(session.user.id)+'&limit=1'),me=students[0];
  if(!me){toast('تعذر تجهيز ملف الطالب. سجّل الخروج وادخل مرة أخرى.','err');return}
  const ss=await api('stages?select=id,name,university_id&active=eq.true&id=eq.'+encodeURIComponent(c.stage_id)+'&limit=1'),requiredStage=ss[0];
  if(!requiredStage){toast('شروط المرحلة لهذا الكورس غير مكتملة في قاعدة البيانات. تواصل مع الإدارة.','err');return}
  const us=await api('universities?select=id,name,country_id&active=eq.true&id=eq.'+encodeURIComponent(requiredStage.university_id)+'&limit=1'),requiredUniversity=us[0];
  if(!requiredUniversity){toast('بيانات جامعة الكورس غير مكتملة. تواصل مع الإدارة.','err');return}
  const countries=await api('countries?select=id,name&active=eq.true&order=name.asc');
  const universities=await api('universities?select=id,name,country_id&active=eq.true&order=name.asc');
  const stages=await api('stages?select=id,name,university_id&active=eq.true&order=name.asc');
  const countryOptions='<option value="">اختر الدولة</option>'+countries.map(x=>'<option value="'+esc(x.id)+'" '+(String(me.country_id||'')===String(x.id)?'selected':'')+'>'+esc(x.name)+'</option>').join('');
  const universityOptions='<option value="">اختر الجامعة</option>'+universities.map(x=>'<option value="'+esc(x.id)+'" data-country="'+esc(x.country_id)+'" '+(String(me.university_id||'')===String(x.id)?'selected':'')+'>'+esc(x.name)+'</option>').join('');
  const stageOptions='<option value="">اختر المرحلة الدراسية</option>'+stages.map(x=>'<option value="'+esc(x.id)+'" data-university="'+esc(x.university_id)+'" '+(String(me.stage_id||'')===String(x.id)?'selected':'')+'>'+esc(x.name)+'</option>').join('');
  const form='<div class="modal" id="enrollment-modal"><div class="card"><div class="row"><h2>طلب اشتراك في '+esc(c.name)+'</h2><button type="button" class="btn secondary" onclick="closeEnrollmentForm()">×</button></div><p class="muted">الكورس مخصص لـ <b>'+esc(requiredUniversity.name)+'</b> — <b>'+esc(requiredStage.name)+'</b>. اكتب بياناتك الفعلية؛ الإدارة هتراجع الطلب قبل فتح المحاضرات.</p><form onsubmit="submitCourseEnrollment(event,\''+esc(c.id)+'\',\''+esc(me.id)+'\',\''+esc(requiredStage.id)+'\',\''+esc(requiredUniversity.id)+'\',\''+esc(requiredUniversity.country_id)+'\')"><div class="formgrid"><div class="field full"><label>الاسم بالكامل</label><input class="input" id="enroll_full_name" value="'+esc(me.full_name||'')+'" required></div><div class="field full"><label>البريد الإلكتروني</label><input class="input" value="'+esc(session.user.email||me.email||'')+'" disabled></div><div class="field full"><label>رقم الهاتف</label><input class="input" id="enroll_phone" value="'+esc(me.phone||'')+'" required></div><div class="field full"><label>الدولة</label><select class="select" id="enroll_country_id" onchange="filterEnrollmentUniversities(this.value)" required>'+countryOptions+'</select></div><div class="field full"><label>الجامعة</label><select class="select" id="enroll_university_id" onchange="filterEnrollmentStages(this.value)" required>'+universityOptions+'</select></div><div class="field full"><label>المرحلة الدراسية</label><select class="select" id="enroll_stage_id" required>'+stageOptions+'</select></div></div><button class="btn primary btn-wide" type="submit">إرسال طلب الاشتراك</button></form></div></div>';
  document.body.insertAdjacentHTML('beforeend',form);
  filterEnrollmentUniversities(me.country_id||'');filterEnrollmentStages(me.university_id||'');
 }catch(e){console.error(e);toast('تعذر تجهيز نموذج الاشتراك: '+(e.message||''),'err')}
}
function filterEnrollmentUniversities(countryId){
 const el=document.getElementById('enroll_university_id');if(!el)return;
 for(const o of el.options){if(!o.value){o.hidden=false;continue}o.hidden=Boolean(countryId)&&o.dataset.country!==String(countryId)}
 const selected=el.selectedOptions[0];if(selected&&selected.hidden)el.value='';
 filterEnrollmentStages(el.value);
}
function filterEnrollmentStages(universityId){
 const el=document.getElementById('enroll_stage_id');if(!el)return;
 for(const o of el.options){if(!o.value){o.hidden=false;continue}o.hidden=Boolean(universityId)&&o.dataset.university!==String(universityId)}
 const selected=el.selectedOptions[0];if(selected&&selected.hidden)el.value='';
}
function closeEnrollmentForm(){document.getElementById('enrollment-modal')?.remove()}
async function submitCourseEnrollment(e,courseId,studentId,requiredStageId,requiredUniversityId,requiredCountryId){
 e.preventDefault();
 const fullName=String(document.getElementById('enroll_full_name')?.value||'').trim(),phone=String(document.getElementById('enroll_phone')?.value||'').trim();
 const countryId=document.getElementById('enroll_country_id')?.value||'',universityId=document.getElementById('enroll_university_id')?.value||'',stageId=document.getElementById('enroll_stage_id')?.value||'';
 if(!fullName||!phone||!countryId||!universityId||!stageId){toast('كمّل بياناتك المطلوبة قبل إرسال الطلب.','err');return}
 const uniOption=document.getElementById('enroll_university_id')?.selectedOptions?.[0],stageOption=document.getElementById('enroll_stage_id')?.selectedOptions?.[0];
 if(String(uniOption?.dataset.country||'')!==String(countryId)||String(stageOption?.dataset.university||'')!==String(universityId)){toast('اختار جامعة ومرحلة متوافقتين مع الدولة.','err');return}
 if(String(stageId)!==String(requiredStageId)||String(universityId)!==String(requiredUniversityId)||String(countryId)!==String(requiredCountryId)){toast('الكورس مخصص لجامعة ومرحلة مختلفتين عن البيانات المختارة. راجع شروط الكورس قبل إرسال الطلب.','err');return}
 const submit=e.submitter||e.target.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
 try{
  await api('students?auth_user_id=eq.'+encodeURIComponent(session.user.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({full_name:fullName,phone:phone,email:String(session.user.email||'').trim().toLowerCase(),country_id:countryId,university_id:Number(universityId),stage_id:Number(stageId)})});
  await api('course_enrollment_requests',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({student_id:studentId,course_id:Number(courseId)})});
  closeEnrollmentForm();toast('تم إرسال طلب الاشتراك للإدارة. هتظهر المحاضرات بعد الموافقة وتفعيل الاشتراك.','ok');await render();
 }catch(err){
  const message=String(err?.message||'');
  if(/course_enrollment_requests_one_pending|duplicate key|23505/i.test(message))toast('عندك بالفعل طلب اشتراك قيد المراجعة للكورس ده.','err');
  else if(/42501|row-level security|violates row-level/i.test(message))toast('البيانات غير مطابقة لشروط الكورس أو لا توجد صلاحية لإرسال الطلب.','err');
  else toast('تعذر إرسال الطلب: '+message,'err');
 }finally{if(submit)submit.disabled=false}
}
async function lecturePage(id){
  let l,files=[],studentName='';
  try{
    [l]=await api(`lectures?select=id,title,description,course_id& id=eq.${encodeURIComponent(id)}&limit=1`.replace('& id=','&id='));
    if(!l) return `<section class="hero card"><h2>المحاضرة غير متاحة</h2><p class="muted">قد تكون المحاضرة غير نشطة أو تحتاج إلى اشتراك فعّال في الكورس.</p><button class="btn primary" onclick="go('courses')">العودة للكورسات</button></section>`;
    files=await api(`lecture_files?select=*&lecture_id=eq.${encodeURIComponent(id)}&active=eq.true`);
    files=await Promise.all(files.map(async f=>({...f,resolved_url:await resolveLectureFileUrl(f)})));
  }catch(err){
    return `<section class="hero card"><h2>تعذر فتح المحاضرة</h2><p class="muted">المحتوى غير متاح لحسابك حاليًا، أو حدث خطأ في الاتصال. تأكد من الاشتراك ثم حاول مرة أخرى.</p><button class="btn primary" onclick="go('courses')">العودة للكورسات</button></section>`;
  }
  const isVideoResource=f=>{const u=String(f.file_url||f.url||f.external_url||'').trim();return !!u&&(/video|youtube|فيديو/i.test(String(f.file_type||''))||/youtu\.be|youtube\.com|youtube-nocookie\.com/i.test(u))};
  const videos=files.filter(isVideoResource);
  const video=videos[videos.length-1];
  const resources=files.filter(f=>!isVideoResource(f));
  return `<section class="hero card"><button class="link" onclick="go('course','${l.course_id}')">← رجوع للكورس</button><h2>${esc(l.title||'المحاضرة')}</h2><p class="muted">${esc(l.description||'')}</p></section><section class="card panel"><div class="video" style="position:relative">${video?renderVideoResource(video,studentName):'<span class="muted">سيظهر الفيديو هنا بعد إضافته من المحاضر.</span>'}</div><h3>الملفات</h3><div class="list">${resources.length?resources.map(f=>`<a class="item" href="${esc(f.resolved_url||f.file_url||f.url||f.external_url||'#')}" target="_blank" rel="noopener"><div class="icon">📄</div><div class="item-main"><b>${esc(f.title||'ملف')}</b><small>${esc(f.file_type||'ملف')}</small></div></a>`).join(''):'<div class="empty">لا توجد ملفات.</div>'}</div></section>`}

async function redesignedStudentHome(){
 const b=siteSettings.brand||{};let name='طالبنا',courses=[],publicCourses=[],recent=[];
 try{const me=await api('students?select=id,full_name&auth_user_id=eq.'+encodeURIComponent(session.user.id)+'&limit=1');if(me.length){name=(me[0].full_name||name).trim().split(/\\s+/)[0];const subs=await api('student_courses?select=course_id,active,expires_at&student_id=eq.'+me[0].id);const now=Date.now();const ids=[...new Set(subs.filter(s=>s.active!==false&&(!s.expires_at||new Date(s.expires_at).getTime()>now)).map(s=>s.course_id).filter(Boolean))];if(ids.length){courses=await api('courses?select=id,name,code,image_url,lecturer_id,is_public&active=eq.true&id=in.('+ids.join(',')+')&order=name.asc');recent=await api('lectures?select=id,title,course_id,created_at&course_id=in.('+ids.join(',')+')&active=eq.true&order=created_at.desc&limit=1')}}}catch(e){console.warn(e)}
 try{publicCourses=await api('courses?select=id,name,code,image_url,lecturer_id,is_public,stage_id&active=eq.true&is_public=eq.true&order=name.asc&limit=8')}catch(e){}
 const cards=list=>list.length?'<div class="real-course-grid">'+list.slice(0,3).map((c,i)=>'<article class="real-course-card fc-vivid-course fc-vivid-course-'+(i+1)+'" data-course-search="'+esc((c.name||'')+' '+(c.code||''))+'"><div class="real-course-cover">'+(c.image_url?'<img loading="lazy" src="'+esc(c.image_url)+'" alt="">':'<span>'+(i===0?'📊':i===1?'📈':'♟')+'</span>')+'<span class="fc-course-chip">'+esc(c.code||'مادة تعليمية')+'</span></div><div class="real-course-info"><h3>'+esc(c.name)+'</h3><p>Future Center · تعلّم على خطوتك</p><button class="btn primary" onclick="go(\'course\',\''+esc(c.id)+'\')">متابعة الكورس ←</button></div></article>').join('')+'</div>':'<div class="empty-state compact"><span class="empty-symbol">📚</span><div><h3>كورساتك هتظهر هنا</h3><p>بعد الاشتراك في كورس، هتلاقي محاضراتك هنا بسهولة.</p><button class="btn primary" onclick="go(\'catalog\')">اكتشف الكورسات</button></div></div>';
 const resume=recent.length?'<section class="home-section glass-panel fc-resume-section"><div class="home-section-head"><div><span class="section-kicker">جاهز تكمل؟</span><h2>آخر محاضرة شاهدتها</h2></div><span>◷</span></div><article class="recent-lecture fc-resume-card"><span class="lecture-play">▶</span><div class="fc-resume-copy"><h3>'+esc(recent[0].title||'آخر محاضرة')+'</h3><p>من كورساتك المسجلة</p></div><button class="btn primary" onclick="go(\'lecture\',\''+esc(recent[0].id)+'\')">استكمال ←</button></article></section>':'';
 return '<section class="fc-home-banner fc-home-banner-v3"><div class="fc-v3-orbit"></div><div class="fc-banner-kicker">✦ FUTURE CENTER · منصتك التعليمية</div><div class="fc-banner-brand"><img src="./icons/future-center-192.png?v=10" alt="شعار Future Center"><div><strong>'+esc(b.name||'Future Center')+'</strong><small>مستقبلك يبدأ بخطوة</small></div></div><div class="fc-v3-hero-art" aria-hidden="true"><div class="fc-v3-halo"></div><div class="fc-v3-cap">🎓</div><div class="fc-v3-book">FUTURE CENTER</div><span class="fc-v3-spark">✦</span></div><div class="fc-banner-copy"><p>أهلاً بيك يا '+esc(name)+' 👋</p><h1>جاهز تكمل <em>مذاكرتك؟</em></h1><span>كل كورساتك ومحاضراتك في مكان واحد. اختار خطوتك الجاية وابدأ.</span></div><div class="fc-banner-actions"><button class="btn primary" onclick="go(\'courses\')">▶ &nbsp; كمّل التعلّم ←</button><button class="btn welcome-secondary" onclick="go(\'catalog\')">اكتشف الكورسات</button></div><div class="fc-v3-footer">✦ تعلّم بطريقتك　•　خطوة أقرب لهدفك</div></section>'+
 '<section class="student-search home-search fc-search-v3"><span>⌕</span><input id="course-search" type="search" placeholder="بتدور على مادة إيه؟" oninput="filterStudentCourses(this.value)"><button type="button" onclick="go(\'catalog\')" aria-label="عرض الكورسات">⌕</button></section>'+
 '<section class="home-section glass-panel fc-v3-courses"><div class="home-section-head"><div><span class="section-kicker">خطوتك الجاية تبدأ هنا</span><h2>كورساتي</h2></div><button class="text-action" onclick="go(\'courses\')">عرض الكل ←</button></div>'+cards(courses)+'</section>'+
 '<section class="home-section glass-panel fc-v3-explore"><div class="home-section-head"><div><span class="section-kicker">وسّع معرفتك</span><h2>تصفّح المواد</h2></div><button class="text-action" onclick="go(\'catalog\')">كل المواد ←</button></div><div class="fc-quick-grid"><button class="fc-quick-card" onclick="go(\'catalog\')"><span>♧</span><b>كل الكورسات</b><small>حسب جامعتك ومستواك</small><i>←</i></button><button class="fc-quick-card" onclick="go(\'courses\')"><span>▷</span><b>المحاضرات</b><small>فيديوهات وملفات PDF</small><i>←</i></button><button class="fc-quick-card" onclick="go(\'catalog\')"><span>▤</span><b>المواد المتاحة</b><small>اكتشف محتوى جديد</small><i>←</i></button></div></section>'+resume+
 '<section class="home-section glass-panel"><div class="home-section-head"><div><span class="section-kicker">ابدأ رحلة جديدة</span><h2>كورسات متاحة ليك</h2></div><button class="text-action" onclick="go(\'catalog\')">عرض الكل ←</button></div>'+cards(publicCourses)+'</section>';
}
async function lecturersPage(){
 let rows=[];try{rows=await api('lecturer_public_profiles?select=id,full_name,bio,image_url&order=full_name.asc')}catch(e){}
 return '<section class="fc-page-intro"><button class="link" onclick="go(\'home\')">← الرئيسية</button><span class="section-kicker">فريق Future Center</span><h1>دكاترتنا ومحاضرونا</h1><p>اتعرف على محاضريك وشوف الكورسات والفيديوهات المجانية قبل ما تختار.</p></section><section class="instructor-directory">'+(rows.length?rows.map(x=>'<button class="instructor-card directory-card" type="button" onclick="go(\'lecturer\',\''+esc(x.id)+'\')"><span class="instructor-photo">'+(x.image_url?'<img loading="lazy" src="'+esc(x.image_url)+'" alt="'+esc(x.full_name)+'">':'<span class="instructor-placeholder">♙</span>')+'</span><span class="instructor-info"><b>'+esc(x.full_name)+'</b><small>'+esc(x.bio||'محاضر في Future Center')+'</small><em>الملف الشخصي والكورسات ←</em></span></button>').join(''):'<div class="empty-state"><span class="empty-symbol">♙</span><div><h3>لا يوجد محاضرون متاحون حاليًا</h3><p>تأكد من تفعيل ملف المحاضر وإضافة صورته من إدارة السنتر.</p></div></div>')+'</section>';
}
async function lecturerDetailPage(id){
 let p,courses=[],free=[];try{const ps=await api('lecturer_public_profiles?select=id,full_name,bio,image_url&id=eq.'+encodeURIComponent(id)+'&limit=1');p=ps[0];if(!p)return '<section class="card empty"><h2>صفحة المحاضر غير متاحة</h2><button class="btn primary" onclick="go(\'lecturers\')">العودة للمحاضرين</button></section>';courses=await api('courses?select=id,name,code,image_url,is_public,active,lecturer_id&lecturer_id=eq.'+encodeURIComponent(id)+'&active=eq.true&order=name.asc');const ids=courses.filter(c=>c.is_public).map(c=>c.id);if(ids.length)free=await api('lectures?select=id,title,description,course_id,lecture_number,created_at&course_id=in.('+ids.join(',')+')&active=eq.true&is_public=eq.true&order=created_at.desc&limit=12')}catch(e){console.warn(e)}
 const cHtml=courses.length?courses.map(c=>'<article class="profile-course"><div class="profile-course-art">'+(c.image_url?'<img loading="lazy" src="'+esc(c.image_url)+'" alt="">':'<span>📚</span>')+'</div><div class="profile-course-copy"><span class="tag">'+(c.is_public?'متاح للمشاهدة':'اشتراك مطلوب')+'</span><h3>'+esc(c.name)+'</h3><p>'+esc(c.description||c.code||'تفاصيل الكورس ومحاضراته')+'</p><button class="btn primary" onclick="go(\'course\',\''+esc(c.id)+'\')">'+(c.is_public?'استكشف الكورس':'تفاصيل وطلب الاشتراك')+' ←</button></div></article>').join(''):'<div class="empty-state"><span class="empty-symbol">📚</span><div><h3>لا توجد كورسات منشورة لهذا المحاضر</h3><p>ستظهر الكورسات هنا بعد ربطها بالمحاضر وتفعيلها من لوحة الإدارة.</p></div></div>';
 const vHtml=free.length?free.map(l=>'<article class="free-video-card"><button class="free-video-thumb" onclick="go(\'lecture\',\''+esc(l.id)+'\')"><span>▶</span><small>مجاني</small></button><div class="free-video-info"><b>'+esc(l.title||'فيديو مجاني')+'</b><small>'+esc(courses.find(c=>String(c.id)===String(l.course_id))?.name||'كورس المحاضر')+'</small><button class="text-action" onclick="go(\'lecture\',\''+esc(l.id)+'\')">شاهد الفيديو ←</button></div></article>').join(''):'<div class="empty-state compact"><span class="empty-symbol">▶</span><div><h3>لا توجد فيديوهات مجانية منشورة</h3><p>الفيديوهات التي يحددها السنتر كمجانية ستظهر هنا.</p></div></div>';
 return '<section class="lecturer-profile-hero"><button class="profile-back" onclick="go(\'lecturers\')">← كل المحاضرين</button><div class="lecturer-profile-main"><div class="lecturer-profile-photo">'+(p.image_url?'<img src="'+esc(p.image_url)+'" alt="'+esc(p.full_name)+'">':'<span>♙</span>')+'</div><div class="lecturer-profile-copy"><span class="section-kicker">محاضر في Future Center</span><h1>'+esc(p.full_name)+'</h1><p>'+esc(p.bio||'أهلًا بيك في صفحة المحاضر. استكشف الكورسات والفيديوهات المجانية المتاحة.')+'</p><div class="profile-quick-stats"><span>📚 '+courses.length+' كورس</span><span>▶ '+free.length+' فيديو مجاني</span></div></div></div></section><section class="home-section glass-panel"><div class="home-section-head"><div><span class="section-kicker">اختار مسارك</span><h2>كورسات المحاضر</h2></div></div><div class="profile-course-list">'+cHtml+'</div></section><section class="home-section glass-panel"><div class="home-section-head"><div><span class="section-kicker">جرّب أسلوب الشرح</span><h2>فيديوهات مجانية</h2></div></div><div class="free-video-grid">'+vHtml+'</div></section>';
}
async function profilePage(){let s=[];try{s=await api(`students?select=full_name,email,phone,country_id,university_id,stage_id&auth_user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`)}catch{}const x=s[0]||{};return `<section class="hero card"><h2>حسابي</h2><p class="muted">بيانات الطالب الأساسية.</p></section><section class="card panel"><div class="grid2"><div class="field"><label>الاسم</label><input class="input" value="${esc(x.full_name)}" disabled></div><div class="field"><label>البريد</label><input class="input" value="${esc(x.email)}" disabled></div><div class="field"><label>الهاتف</label><input class="input" value="${esc(x.phone)}" disabled></div></div><div class="profile-actions"><button class="btn secondary" type="button" onclick="logout()">تسجيل الخروج</button></div></section>`}
async function adminPage(){
 const sections=[['overview','نظرة عامة'],['countries','الدول'],['universities','الجامعات'],['stages','المراحل'],['courses','الكورسات'],['lectures','المحاضرات'],['files','الملفات'],['students','الطلاب'],['subscriptions','الاشتراكات'],['enrollment_requests','طلبات الاشتراك'],['registrations','التسجيلات'],['subjects','الموضوعات']];
 const v=state.view==='home'?'overview':state.view;
 if(v==='overview')return '<section class="hero card"><h2>لوحة تحكم <span class="gold">Future Center</span></h2><p class="muted">إدارة المحتوى والطلاب والاشتراكات من مكان واحد.</p></section><div class="grid">'+sections.slice(1).map(s=>'<button class="card stat" onclick="go(\''+s[0]+'\')"><small>'+s[1]+'</small><div class="num">›</div></button>').join('')+'</div>';
 if(v==='enrollment_requests')return adminEnrollmentRequestsPage();
 return crudPage(v);
}
async function adminEnrollmentRequestsPage(){
 let requests=[],courses=[],students=[],stages=[],universities=[];
 try{
  requests=await api('course_enrollment_requests?select=id,student_id,course_id,status,created_at,reviewed_at&order=created_at.desc&limit=100');
  const courseIds=[...new Set(requests.map(x=>x.course_id).filter(Boolean))],studentIds=[...new Set(requests.map(x=>x.student_id).filter(Boolean))];
  if(courseIds.length)courses=await api('courses?select=id,name,code,stage_id&id=in.('+courseIds.join(',')+')');
  if(studentIds.length)students=await api('students?select=id,full_name,email,university_id,stage_id&id=in.('+studentIds.join(',')+')');
  const stageIds=[...new Set([...courses.map(x=>x.stage_id),...students.map(x=>x.stage_id)].filter(Boolean))];
  if(stageIds.length)stages=await api('stages?select=id,name,university_id&id=in.('+stageIds.join(',')+')');
  const uniIds=[...new Set([...stages.map(x=>x.university_id),...students.map(x=>x.university_id)].filter(Boolean))];
  if(uniIds.length)universities=await api('universities?select=id,name&id=in.('+uniIds.join(',')+')');
 }catch(e){return '<section class="hero card"><h2>طلبات الاشتراك</h2><p class="muted">تعذر تحميل الطلبات: '+esc(e.message)+'</p><button class="btn primary" onclick="render()">إعادة المحاولة</button></section>'}
 const courseById=new Map(courses.map(x=>[String(x.id),x])),studentById=new Map(students.map(x=>[String(x.id),x])),stageById=new Map(stages.map(x=>[String(x.id),x])),uniById=new Map(universities.map(x=>[String(x.id),x]));
 const statusText={pending:'قيد المراجعة',approved:'تمت الموافقة',rejected:'مرفوض'};
 const cards=requests.map(r=>{
  const c=courseById.get(String(r.course_id))||{},s=studentById.get(String(r.student_id))||{},cs=stageById.get(String(c.stage_id))||{},ss=stageById.get(String(s.stage_id))||{},u=uniById.get(String(s.university_id))||{};
  const actions=r.status==='pending'?'<div class="row" style="margin-top:10px"><button class="btn primary" onclick="processEnrollmentRequest(\''+r.id+'\',true)">موافقة وتفعيل</button><button class="btn danger" onclick="processEnrollmentRequest(\''+r.id+'\',false)">رفض الطلب</button></div>':'';
  return '<article class="item" style="align-items:flex-start"><div class="icon">📚</div><div class="item-main"><b>'+esc(c.name||'كورس')+'</b><small>الطالب: '+esc(s.full_name||'اسم غير مكتمل')+' — '+esc(s.email||'')+'</small><small>جامعة الطالب: '+esc(u.name||'غير محددة')+' · المرحلة: '+esc(ss.name||'غير محددة')+'</small><small>مرحلة الكورس: '+esc(cs.name||'غير محددة')+' · الحالة: '+esc(statusText[r.status]||r.status)+'</small><small>تاريخ الطلب: '+esc(r.created_at?new Date(r.created_at).toLocaleString('ar-EG'):'')+'</small>'+actions+'</div></article>';
 }).join('');
 return '<section class="hero card"><h2>طلبات الاشتراك</h2><p class="muted">راجع بيانات الطالب وشروط الكورس قبل تفعيل الوصول للمحاضرات المدفوعة.</p></section><section class="card panel"><div class="list">'+(cards||'<div class="empty">لا توجد طلبات اشتراك حتى الآن.</div>')+'</div></section>';
}
async function processEnrollmentRequest(requestId,approve){
 if(!confirm(approve?'تأكيد الموافقة وتفعيل اشتراك الطالب في هذا الكورس؟':'تأكيد رفض طلب الاشتراك؟'))return;
 try{
  await api('rpc/admin_process_course_enrollment_request',{method:'POST',body:JSON.stringify({p_request_id:Number(requestId),p_approve:Boolean(approve)})});
  toast(approve?'تمت الموافقة وتفعيل الاشتراك.':'تم رفض الطلب.','ok');await render();
 }catch(e){toast('تعذر معالجة الطلب: '+(e.message||''),'err')}
}
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
