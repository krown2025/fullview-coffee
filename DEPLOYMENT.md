# دليل النشر على Railway

هذا الدليل يشرح خطوات نشر FullView Coffee System على Railway.

## لماذا Railway؟

✅ دعم كامل لـ Node.js  
✅ قاعدة بيانات MySQL مدمجة  
✅ دعم WebSockets (Socket.IO)  
✅ دعم رفع الملفات  
✅ SSL مجاني  
✅ خطة مجانية للبدء  

---

## الخطوة 1: إعداد حساب Railway

1. اذهب إلى [railway.app](https://railway.app)
2. سجل دخول باستخدام حساب GitHub
3. اربط حساب GitHub الخاص بك

---

## الخطوة 2: إنشاء مشروع جديد

1. اضغط على **"New Project"**
2. اختر **"Deploy from GitHub repo"**
3. اختر مستودع `fullview-coffee`
4. Railway سيبدأ في نشر التطبيق تلقائياً

---

## الخطوة 3: إضافة قاعدة بيانات MySQL

1. في صفحة المشروع، اضغط **"New"** → **"Database"** → **"Add MySQL"**
2. Railway سينشئ قاعدة بيانات MySQL تلقائياً
3. انسخ بيانات الاتصال:
   - `MYSQL_HOST`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`
   - `MYSQL_PORT`

---

## الخطوة 4: استيراد قاعدة البيانات

### الطريقة 1: باستخدام MySQL Workbench

1. افتح MySQL Workbench
2. أنشئ اتصال جديد باستخدام بيانات Railway:
   - Hostname: `[MYSQL_HOST from Railway]`
   - Port: `[MYSQL_PORT]`
   - Username: `[MYSQL_USER]`
   - Password: `[MYSQL_PASSWORD]`
3. افتح ملف `schema.sql`
4. نفذ الملف على قاعدة البيانات

### الطريقة 2: باستخدام سطر الأوامر

```bash
mysql -h [MYSQL_HOST] -u [MYSQL_USER] -p[MYSQL_PASSWORD] -P [MYSQL_PORT] [MYSQL_DATABASE] < schema.sql
```

---

## الخطوة 5: إعداد متغيرات البيئة

في Railway، اذهب إلى **Variables** واضف المتغيرات التالية:

```
PORT=3000
DB_HOST=${{MYSQL_HOST}}
DB_USER=${{MYSQL_USER}}
DB_PASS=${{MYSQL_PASSWORD}}
DB_NAME=${{MYSQL_DATABASE}}
DB_PORT=${{MYSQL_PORT}}
SESSION_SECRET=your_random_secret_key_here
MOYASAR_PUBLISHABLE_KEY=pk_test_...
MOYASAR_SECRET_KEY=sk_test_...
```

### ملاحظات مهمة:

- **SESSION_SECRET**: أنشئ مفتاح عشوائي قوي (يمكنك استخدام: `openssl rand -base64 32`)
- **MOYASAR Keys**: استخدم مفاتيح Moyasar الحقيقية للإنتاج
- Railway يوفر متغيرات `${{MYSQL_*}}` تلقائياً

---

## الخطوة 6: إعداد Database Connection

تأكد من أن ملف `config/database.js` يدعم PORT:

```javascript
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,  // أضف هذا السطر
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
```

---

## الخطوة 7: النشر

1. Railway ينشر التطبيق تلقائياً عند كل push إلى GitHub
2. راقب سجلات النشر (Deployment Logs) للتأكد من عدم وجود أخطاء
3. عند النجاح، ستحصل على رابط مثل: `https://your-project.up.railway.app`

---

## الخطوة 8: إعداد Domain مخصص (اختياري)

### للدومين الرئيسي:

1. في Railway، اذهب إلى **Settings** → **Domains**
2. اضغط **"Custom Domain"**
3. أدخل دومينك: `yourdomain.com`
4. أضف سجلات DNS التالية في Hostinger:

```
Type: CNAME
Name: @
Value: [Railway domain shown]
TTL: Auto
```

### لدعم Wildcard Subdomains:

```
Type: CNAME
Name: *
Value: [Railway domain shown]
TTL: Auto
```

انتظر حتى ينتشر DNS (قد يستغرق 24-48 ساعة)

---

## الخطوة 9: إنشاء حساب Super Admin

بعد النشر الناجح:

1. اتصل بقاعدة البيانات Railway
2. قم بتشغيل السكريبت التالي لإنشاء حساب admin:

```bash
# في مجلد المشروع المحلي
node add_password_plain.js
```

أو قم بإدراج مباشرة في قاعدة البيانات:

```sql
INSERT INTO admins (email, password, name, role, created_at) 
VALUES ('admin@fullview.com', '$2b$10$...', 'Super Admin', 'super_admin', NOW());
```

---

## الخطوة 10: اختبار التطبيق

### اختبر الوظائف التالية:

✅ **صفحة Super Admin**
- الوصول: `https://your-domain.com/admin`
- تسجيل الدخول
- إدارة الفروع

✅ **إنشاء فرع**
- أنشئ فرع جديد (مثلاً: subdomain = "riyadh")
- أضف منتجات للفرع

✅ **Subdomain**
- الوصول: `https://riyadh.your-domain.com`
- يجب أن تظهر القائمة

✅ **Checkout & Payment**
- أضف منتج للسلة
- اذهب للـ checkout
- اختبر الدفع (استخدم بطاقة اختبار Moyasar)

✅ **KDS Dashboard**
- الوصول: `https://riyadh.your-domain.com/kds`
- يجب أن تظهر الطلبات فوراً

✅ **Order Tracking**
- بعد الدفع، تأكد من:
  - ظهور صفحة التتبع للعميل
  - ظهور الطلب في KDS
  - التحديثات الفورية تعمل

✅ **Socket.IO**
- تأكد من أن الإشعارات الفورية تعمل
- افتح KDS في نافذة
- اطلب من نافذة أخرى (كعميل)
- يجب أن يظهر الطلب فوراً في KDS

---

## حل المشاكل الشائعة

### 1. Database Connection Error

**الخطأ**: `Error: connect ECONNREFUSED`

**الحل**: تأكد من أن متغيرات البيئة صحيحة:
```bash
echo $DB_HOST
echo $DB_PORT
```

### 2. Socket.IO لا يعمل

**الخطأ**: `Socket connection failed`

**الحل**: Railway يدعم WebSockets افتراضياً، لكن تأكد من:
- لا يوجد Proxy يمنع WebSockets
- استخدم HTTPS (Railway يوفره تلقائياً)

### 3. File Upload لا يعمل

**الخطأ**: الصور لا تُحفظ بعد إعادة النشر

**الحل**: Railway يحذف الملفات بعد كل deploy. الحلول:
1. استخدم **Railway Volumes** (مساحة تخزين ثابتة)
2. أو استخدم **Cloudinary** أو **AWS S3** لتخزين الصور

#### إضافة Cloudinary (موصى به):

```bash
npm install cloudinary multer-storage-cloudinary
```

عدّل `multer` config لاستخدام Cloudinary بدلاً من التخزين المحلي.

### 4. Subdomain لا يعمل

**المشكلة**: `riyadh.yourdomain.com` تعطي خطأ 404

**الحل**:
1. تأكد من إضافة CNAME wildcard في DNS
2. انتظر حتى ينتشر DNS (قد يستغرق وقتاً)
3. اختبر محلياً باستخدام `riyadh.localhost:3000`

---

## الصيانة والتحديثات

### كيفية تحديث التطبيق:

1. قم بتعديل الكود محلياً
2. اعمل commit:
```bash
git add .
git commit -m "تحديث: وصف التحديث"
```
3. ارفع إلى GitHub:
```bash
git push origin main
```
4. Railway سينشر تلقائياً!

### عمل نسخة احتياطية لقاعدة البيانات:

```bash
mysqldump -h [MYSQL_HOST] -u [MYSQL_USER] -p[MYSQL_PASSWORD] -P [MYSQL_PORT] [MYSQL_DATABASE] > backup.sql
```

---

## الأمان في الإنتاج

### ✅ قائمة مراجعة الأمان:

- [ ] غيّر `SESSION_SECRET` إلى قيمة عشوائية قوية
- [ ] استخدم مفاتيح Moyasar الحقيقية (ليس test keys)
- [ ] غيّر كلمة مرور Super Admin بعد أول تسجيل دخول
- [ ] فعّل HTTPS (Railway يوفره تلقائياً)
- [ ] لا تشارك متغيرات البيئة علناً
- [ ] راقب سجلات الأخطاء بانتظام

---

## الدعم

إذا واجهت أي مشكلة:

1. راجع [Railway Docs](https://docs.railway.app)
2. تحقق من Deployment Logs في Railway
3. أنشئ Issue في GitHub

---

✨ **مبروك! تطبيقك الآن على Railway!** ☕
