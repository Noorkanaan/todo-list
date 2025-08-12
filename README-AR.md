# منصة مهام المندوبات (13/08/2025 → 13/09/2025)

## المتطلبات
- Firebase (Auth/Firestore/Functions/Hosting)
- Twilio (SMS/WhatsApp) + SendGrid (Email)
- Node 18 في Functions

## الإعداد السريع
1) حدّث مفاتيح Firebase في `public/app.js` و `public/admin.js`.
2) ثبّتي الحزم داخل `functions/`:  
   ```bash
   cd functions && npm i
   ```
3) اضبطي إعدادات Secrets (بدون تخزينها في الكود):  
   ```bash
   firebase functions:config:set      twilio.sid="TWILIO_SID"      twilio.token="TWILIO_TOKEN"      twilio.from="+1XXXXXXXXXX"      sendgrid.key="SENDGRID_API_KEY"      admin.phone="0584400164"      admin.email="noorkanaan16@gmail.com"      timezone="Asia/Jerusalem"
   ```
   > لو أردتِ واتساب استخدمي: `twilio.from="whatsapp:+1XXXXXXXXXX"` وأرقام المستلمين بصيغة واتساب.

4) النشر:  
   ```bash
   firebase deploy --only functions,hosting,firestore:rules
   ```

5) اجعلي حسابك مسؤولًا عبر Firestore: `users/{yourUID}` → `role: "admin"`.

## الاستخدام
- تسجيل أول مرة عبر الهاتف → OTP → إنشاء مستخدم.
- واجهة اليوم فقط (3 مهام + ملاحظات) ونصائح وقتية عشوائية.
- لوحة تحكم: إحصائيات، ترتيب، تصدير CSV، إدارة النصائح.
- إشعارات المسؤول عند التسجيل والإنجاز (SMS + Email).
- تذكيرات تلقائية: 10:00 / 15:00 / 20:00 بتوقيت Asia/Jerusalem.

## ملاحظات
- لا تضعي أي مفاتيح داخل ملفات الواجهة.
- لتبديل القناة إلى واتساب؛ يكفي تغيير صيغة `twilio.from` ورقم المستلم.
