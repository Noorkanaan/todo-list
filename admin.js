const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
if (!firebase.apps || (firebase.apps && firebase.apps.length===0)) {
  try { firebase.initializeApp(firebaseConfig); } catch(e){ console.warn('Using Hosting init config'); }
}
const auth = firebase.auth();
const db = firebase.firestore();

const TZ = "Asia/Jerusalem";
const START = new Date("2025-08-13T00:00:00+03:00");
const END   = new Date("2025-09-13T23:59:59+03:00");
function todayKey(){
  const now=new Date();
  return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}

auth.onAuthStateChanged(async (user)=>{
  if(!user){ location.href='./index.html'; return; }
  document.getElementById('logoutBtn').onclick = ()=>auth.signOut();

  // السماح فقط للمسؤول
  const ud = (await db.collection('users').doc(user.uid).get()).data();
  if((ud?.role||'user')!=='admin'){
    alert('هذه الصفحة للمسؤول فقط'); location.href='./app.html'; return;
  }

  // إحصائيات اليوم
  const day = todayKey();

  const usersSnap = await db.collection('users').get();
  const totalUsers = usersSnap.size;
  document.getElementById('totalUsers').textContent = totalUsers;

  let completedCount = 0;
  const tbody = document.querySelector('#delegatesTable tbody');
  tbody.innerHTML='';
  const leaderboard = [];

  for(const doc of usersSnap.docs){
    const u = doc.data(); const uid=doc.id;
    const t = await db.collection('users').doc(uid).collection('tasks').doc(day).get();
    const d = t.data();

    const done = d ? ['morning','noon','evening'].filter(k=>d[k]?.done).length : 0;
    if(done>0) completedCount += done;

    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${u.fullName||''}</td><td>${u.phone||''}</td><td>${u.pageName||''}</td><td>${u.points||0}</td><td>${done}/3</td>`;
    tbody.appendChild(tr);

    leaderboard.push({name:u.fullName||u.phone, points:u.points||0});
  }

  document.getElementById('completedToday').textContent = completedCount;
  const totalPossible = totalUsers*3 || 1;
  document.getElementById('completionRate').textContent = Math.round((completedCount/totalPossible)*100)+'%';

  // ترتيب
  leaderboard.sort((a,b)=>b.points-a.points);
  const lb = document.getElementById('leaderboard'); lb.innerHTML='';
  leaderboard.slice(0,20).forEach((r,i)=>{
    const li=document.createElement('li'); li.textContent=`${i+1}) ${r.name} — ${r.points} نقطة`; lb.appendChild(li);
  });

  // رسوم بيانية (آخر 7 أيام ضمن الفترة)
  async function getDaySummary(key){
    const snaps = await db.collectionGroup('tasks').where('date','==',key).get();
    let sum=0; snaps.forEach(s=>{
      const d=s.data(); sum += ['morning','noon','evening'].filter(k=>d[k]?.done).length;
    });
    return sum;
  }
  const labels=[], data=[];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    if(d<START || d>END) continue;
    const k = new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
    labels.push(k); data.push(await getDaySummary(k));
  }
  new Chart(document.getElementById('dailyChart'),{
    type:'line',
    data:{labels,datasets:[{label:'مجموع المهام المنجزة يوميًا', data}]},
    options:{responsive:true}
  });
  new Chart(document.getElementById('weeklyChart'),{
    type:'bar',
    data:{labels, datasets:[{label:'مجموع يومي (للاطلاع الأسبوعي)', data}]},
    options:{responsive:true}
  });

  // تصدير CSV
  document.getElementById('exportCsv').onclick = ()=>{
    let csv="name,phone,page,points,done_today\n";
    [...tbody.children].forEach(tr=>{
      const t=[...tr.children].map(td=>`"${(td.textContent||'').replace(/"/g,'""')}"`);
      csv+=t.join(',')+"\\n";
    });
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`delegates_${day}.csv`; a.click();
  };

  // إدارة النصائح
  const tipsDocRef = db.collection('config').doc('tips');
  const tDoc = await tipsDocRef.get();
  const tips=tDoc.data()||{};
  document.getElementById('tips_morning').value = (tips.morning||[]).join('\\n');
  document.getElementById('tips_noon').value    = (tips.noon||[]).join('\\n');
  document.getElementById('tips_evening').value = (tips.evening||[]).join('\\n');

  document.getElementById('saveTips').onclick = async ()=>{
    await tipsDocRef.set({
      morning: document.getElementById('tips_morning').value.split('\\n').map(s=>s.trim()).filter(Boolean),
      noon   : document.getElementById('tips_noon').value.split('\\n').map(s=>s.trim()).filter(Boolean),
      evening: document.getElementById('tips_evening').value.split('\\n').map(s=>s.trim()).filter(Boolean),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true});
    alert('تم حفظ النصائح ✅');
  };
});
