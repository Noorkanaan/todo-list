// ====== إعداد Firebase (استبدل القيم بقيم مشروعك) ======
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ====== تواريخ الحملة المسموح بها ======
const TZ = "Asia/Jerusalem";
const START = new Date("2025-08-13T00:00:00+03:00");
const END   = new Date("2025-09-13T23:59:59+03:00");

function todayKey() {
  const now = new Date();
  const iso = new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  return iso; // YYYY-MM-DD
}

function withinCampaign(d) {
  return d >= START && d <= END;
}

function qsel(id){return document.getElementById(id)}
function toastPraise(){ const p=qsel('praise'); if(p){p.classList.remove('hidden'); setTimeout(()=>p.classList.add('hidden'),1800);} }

// ====== صفحة index.html (OTP) ======
window.addEventListener('load', ()=>{
  const path = location.pathname;
  const isLoginPage = path.endsWith('/index.html') || path === '/' || path === '';

  if(isLoginPage){
    // reCAPTCHA
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { size: 'invisible' });
    const appVerifier = window.recaptchaVerifier;

    const startSignUp = qsel('startSignUp');
    if(startSignUp){
      startSignUp.onclick = async ()=>{
        const fullName = qsel('fullName').value.trim();
        const phone = qsel('phone').value.trim();
        const pageName = qsel('pageName').value.trim();
        if(!fullName || !phone || !pageName) return alert('يرجى تعبئة جميع الحقول');

        try{
          const confirmationResult = await auth.signInWithPhoneNumber(phone, appVerifier);
          window._pending = {isSignup:true, fullName, phone, pageName, confirmationResult};
          alert('تم إرسال كود التحقق عبر SMS. أدخلي الكود في خانة تسجيل الدخول.');
        }catch(e){ console.error(e); alert('تعذر إرسال الكود: '+e.message); }
      };
    }

    const sendOtp = qsel('sendOtp');
    if(sendOtp){
      sendOtp.onclick = async ()=>{
        const phone = qsel('loginPhone').value.trim();
        if(!phone) return alert('أدخلي رقم الهاتف');
        try{
          const confirmationResult = await auth.signInWithPhoneNumber(phone, appVerifier);
          window._pending = {isSignup:false, phone, confirmationResult};
          alert('أرسلنا الكود. أدخلي الكود ثم اضغطي "تأكيد".');
        }catch(e){ console.error(e); alert('تعذر إرسال الكود: '+e.message); }
      };
    }

    const verifyOtp = qsel('verifyOtp');
    if(verifyOtp){
      verifyOtp.onclick = async ()=>{
        const code = qsel('otpCode').value.trim();
        if(!window._pending || !code) return alert('أدخلي الكود أولاً');
        try{
          const result = await window._pending.confirmationResult.confirm(code);
          const user = result.user;

          // إن كان تسجيل أول مرة: خزّن ملف المستخدم
          if(window._pending.isSignup){
            const {fullName, phone, pageName} = window._pending;
            await db.collection('users').doc(user.uid).set({
              fullName, phone, pageName,
              points: 0,
              role: 'user',
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, {merge:true});
            // إشعار المسؤول سيتم عبر Cloud Function
          }
          location.href = './app.html';
        }catch(e){ console.error(e); alert('فشل التحقق: '+e.message); }
      };
    }
    return;
  }
  let appVerifier;
async function ensureRecaptcha(mode='visible'){
  if(window.recaptchaVerifier) { try { window.recaptchaVerifier.clear(); } catch(_){} }
  window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
    size: mode === 'visible' ? 'normal' : 'invisible'
  });
  appVerifier = window.recaptchaVerifier;
  if(mode==='visible'){ await appVerifier.render(); }
}
// استدعاء أولي مرئي:
ensureRecaptcha('visible');

qsel('sendOtp').onclick = async ()=>{
  const phone = qsel('loginPhone').value.trim();
  if(!phone) return alert('أدخلي رقم الهاتف');

  try{
    const confirmationResult = await auth.signInWithPhoneNumber(phone, appVerifier);
    window._pending = {isSignup:false, phone, confirmationResult};
    alert('أرسلنا الكود. أدخلي الكود ثم اضغطي "تأكيد".');
  }catch(e){
    console.error(e);
    // إعادة تهيئة وإعادة المحاولة
    await ensureRecaptcha('visible');
    alert('تعذر إرسال الكود: '+e.message);
  }
};

qsel('startSignUp').onclick = async ()=>{
  const fullName = qsel('fullName').value.trim();
  const phone = qsel('phone').value.trim();
  const pageName = qsel('pageName').value.trim();
  if(!fullName || !phone || !pageName) return alert('يرجى تعبئة جميع الحقول');

  try{
    const confirmationResult = await auth.signInWithPhoneNumber(phone, appVerifier);
    window._pending = {isSignup:true, fullName, phone, pageName, confirmationResult};
    alert('تم إرسال كود التحقق عبر SMS. أدخلي الكود في خانة تسجيل الدخول.');
  }catch(e){
    console.error(e);
    await ensureRecaptcha('visible');
    alert('تعذر إرسال الكود: '+e.message);
  }
};

  // ====== باقي الصفحات: تحقق من الجلسة ======
  auth.onAuthStateChanged(async (user)=>{
    if(!user){ location.href = './index.html'; return; }

    // اظهار معلومات المستخدم في الهيدر
    if(qsel('userInfo')){
      const udoc = await db.collection('users').doc(user.uid).get();
      const u = udoc.data() || {};
      qsel('userInfo').textContent = u.fullName ? `${u.fullName} (${u.points||0} نقطة)` : (user.phoneNumber||'مستخدم');
      const role = u.role||'user';
      if(role==='admin' && qsel('adminLink')) qsel('adminLink').classList.remove('hidden');
    }
    if(qsel('logoutBtn')) qsel('logoutBtn').onclick = ()=>auth.signOut();

    // ====== صفحة المندوبة app.html ======
    if(location.pathname.endsWith('/app.html')){
      const now = new Date();
      if(!withinCampaign(now)){
        alert('خارج فترة الحملة. سيتم توجيهك لصفحة الدخول.');
        location.href='./index.html'; return;
      }
      const dayKey = todayKey();
      if(qsel('todayLabel')) qsel('todayLabel').textContent = dayKey;

      const taskDocRef = db.collection('users').doc(user.uid).collection('tasks').doc(dayKey);
      const base = {
        morning:{done:false,note:""}, noon:{done:false,note:""}, evening:{done:false,note:""},
        date: dayKey, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // أنشئ وثيقة اليوم إن لم توجد
      const snap = await taskDocRef.get();
      if(!snap.exists){ await taskDocRef.set(base); }

      // اربط الواجهـة
      const tMorning = qsel('task_morning'), tNoon = qsel('task_noon'), tEven = qsel('task_evening');
      const nMorning = qsel('note_morning'), nNoon = qsel('note_noon'), nEven = qsel('note_evening');

      // استمع للتغييرات الحية
      taskDocRef.onSnapshot(s=>{
        const d=s.data();
        if(!d) return;
        tMorning.checked = !!d.morning?.done;
        tNoon.checked    = !!d.noon?.done;
        tEven.checked    = !!d.evening?.done;
        nMorning.value = d.morning?.note||"";
        nNoon.value    = d.noon?.note||"";
        nEven.value    = d.evening?.note||"";
      });

      // عند تغيير checkbox
      async function toggle(name, checked){
        const path = {}; path[`${name}.done`] = checked;
        await taskDocRef.set(path,{merge:true});
        if(checked){ toastPraise(); }
      }
      tMorning.addEventListener('change', e=>toggle('morning', e.target.checked));
      tNoon.addEventListener('change', e=>toggle('noon', e.target.checked));
      tEven.addEventListener('change', e=>toggle('evening', e.target.checked));

      // حفظ الملاحظات
      const saveNotes = qsel('saveNotes');
      if(saveNotes){
        saveNotes.onclick = async ()=>{
          await taskDocRef.set({
            morning:{note:nMorning.value, done:tMorning.checked},
            noon   :{note:nNoon.value,    done:tNoon.checked},
            evening:{note:nEven.value,    done:tEven.checked},
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          },{merge:true});
          alert('تم حفظ الملاحظات ✅');
        };
      }

      // نصائح حسب الوقت (عشوائية من إعدادات لوحة التحكم)
      async function showTip(){
        const hour = new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',hour12:false}).format(new Date());
        let bucket = 'morning';
        if(+hour>=15 && +hour<20) bucket='noon';
        else if(+hour>=20 || +hour<5) bucket='evening';

        const tipsDoc = await db.collection('config').doc('tips').get();
        const tips = tipsDoc.data()||{};
        const arr = (tips[bucket] || []).filter(Boolean);
        const tip = arr.length ? arr[Math.floor(Math.random()*arr.length)] : 'نصيحة اليوم غير متاحة حالياً.';
        if(qsel('tipText')) qsel('tipText').textContent = tip;
      }
      showTip();

      // سجل إنجازاتي (آخر 7 أيام)
      const histUL = qsel('history');
      db.collection('users').doc(user.uid).collection('tasks')
        .orderBy('date','desc').limit(7).onSnapshot(q=>{
          histUL.innerHTML='';
          q.docs.forEach(d=>{
            const v=d.data();
            const done = ['morning','noon','evening'].filter(k=>v[k]?.done).length;
            const li=document.createElement('li');
            li.textContent = `${d.id}: ${done}/3 مهام منجزة`;
            histUL.appendChild(li);
          })
        });
    }
  });
});
