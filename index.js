const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const { DateTime } = require('luxon');

admin.initializeApp();
const db = admin.firestore();

// إعدادات من Config
// firebase functions:config:set twilio.sid="..." twilio.token="..." twilio.from="+1..." sendgrid.key="..." admin.phone="0584400164" admin.email="noorkanaan16@gmail.com" timezone="Asia/Jerusalem"
const cfg = functions.config();
const tz = (cfg.timezone && cfg.timezone.value) || 'Asia/Jerusalem';
const client = (cfg.twilio && cfg.twilio.sid) ? twilio(cfg.twilio.sid, cfg.twilio.token) : null;
if(cfg.sendgrid && cfg.sendgrid.key) sgMail.setApiKey(cfg.sendgrid.key);

// نافذة الحملة
const START = DateTime.fromISO('2025-08-13', {zone: tz}).startOf('day');
const END   = DateTime.fromISO('2025-09-13', {zone: tz}).endOf('day');

function withinCampaign(dtLuxon){ return dtLuxon >= START && dtLuxon <= END; }

// إشعار المسؤول عند تسجيل مستخدم جديد
exports.onUserDocCreate = functions.firestore
  .document('users/{uid}')
  .onCreate(async (snap, ctx)=>{
    const u = snap.data();
    const text = `مستخدم جديد: ${u.fullName||''} - ${u.phone||''} - صفحة: ${u.pageName||''}`;
    // SMS
    if(client && cfg.admin && cfg.admin.phone){
      try{ await client.messages.create({to: cfg.admin.phone, from: cfg.twilio.from, body: text}); }catch(e){ console.error('twilio sms error',e.message); }
    }
    // Email
    if(cfg.admin && cfg.admin.email && cfg.sendgrid && cfg.sendgrid.key){
      try{ await sgMail.send({to: cfg.admin.email, from: cfg.admin.email, subject:'مستخدم جديد', text}); }
      catch(e){ console.error('sendgrid error',e.message); }
    }
  });

// منطق النقاط + إشعار عند إنجاز مهمة
exports.onTaskWrite = functions.firestore
  .document('users/{uid}/tasks/{day}')
  .onWrite(async (change, ctx)=>{
    const {uid, day} = ctx.params;
    const after = change.after.exists ? change.after.data() : null;
    if(!after) return;
    const dayLuxon = DateTime.fromFormat(day, 'yyyy-LL-dd', {zone: tz});
    if(!withinCampaign(dayLuxon)) return;

    const completed = ['morning','noon','evening'].filter(k=>after[k]?.done).length;
    const before = change.before.exists ? change.before.data() : {};
    const beforeCount = ['morning','noon','evening'].filter(k=>before[k]?.done).length;

    if(completed > beforeCount){
      const delta = completed - beforeCount;
      await db.runTransaction(async (tx)=>{
        const uref = db.collection('users').doc(uid);
        const udoc = await tx.get(uref);
        const pts = (udoc.data()?.points || 0) + delta;
        tx.update(uref,{points: pts});
      });
      const udoc = await db.collection('users').doc(uid).get();
      const u = udoc.data()||{};
      const text = `إنجاز مهمة: ${u.fullName||u.phone} - يوم ${day} - مجموع اليوم ${completed}/3`;
      if(client && cfg.admin && cfg.admin.phone){
        try{ await client.messages.create({to: cfg.admin.phone, from: cfg.twilio.from, body: text}); }catch(e){ console.error('twilio sms error',e.message); }
      }
      if(cfg.admin && cfg.admin.email && cfg.sendgrid && cfg.sendgrid.key){
        try{ await sgMail.send({to: cfg.admin.email, from: cfg.admin.email, subject:'إنجاز مهمة', text}); }catch(e){ console.error('sendgrid error',e.message); }
      }
    }
  });

// تذكيرات تلقائية
async function sendReminderForBucket(bucket){
  const now = DateTime.now().setZone(tz);
  if(!withinCampaign(now)) return;
  const day = now.toFormat('yyyy-LL-dd');
  const usersSnap = await db.collection('users').get();

  for(const udoc of usersSnap.docs){
    const u = udoc.data(); const uid=udoc.id;
    const tdoc = await db.collection('users').doc(uid).collection('tasks').doc(day).get();

    let need = true;
    if(tdoc.exists){
      const t = tdoc.data();
      need = !(t[bucket]?.done);
    }
    if(!need) continue;

    const msg = `تذكير ${bucket==='morning'?'صباحي':bucket==='noon'?'وسط النهار':'مسائي'}: لم يتم إنجاز مهمة ${bucket}. يرجى إتمامها الآن.`;
    if(client && u.phone){
      try{ await client.messages.create({to: u.phone, from: cfg.twilio.from, body: msg}); }
      catch(e){ console.error('twilio user sms error', e.message); }
    }
    if(cfg.sendgrid && cfg.sendgrid.key && cfg.admin && cfg.admin.email){
      try{
        await sgMail.send({ to: (u.email || cfg.admin.email), from: cfg.admin.email, subject: 'تذكير مهمة نشر', text: `${u.fullName||u.phone}: ${msg} (${day})` });
      }catch(e){ console.error('sendgrid user email error', e.message); }
    }
  }
}

exports.reminderMorning = functions.pubsub.schedule('0 10 * * *').timeZone(tz).onRun(()=>sendReminderForBucket('morning'));
exports.reminderNoon    = functions.pubsub.schedule('0 15 * * *').timeZone(tz).onRun(()=>sendReminderForBucket('noon'));
exports.reminderEvening = functions.pubsub.schedule('0 20 * * *').timeZone(tz).onRun(()=>sendReminderForBucket('evening'));
