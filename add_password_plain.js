const db = require('./config/database');

(async () => {
    try {
        console.log('جاري تحديث قاعدة البيانات لإضافة حقل password_plain...\n');

        // إضافة حقل password_plain إلى جدول users
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_plain VARCHAR(255) DEFAULT NULL`);

        console.log('✅ تم إضافة حقل password_plain بنجاح!\n');
        console.log('ملاحظة: كلمات المرور القديمة لن تظهر. فقط الموظفين الجدد أو الذين تم تحديث كلمة مرورهم ستظهر كلمات مرورهم.\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ خطأ:', err);
        process.exit(1);
    }
})();
