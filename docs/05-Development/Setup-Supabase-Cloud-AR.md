# إعداد Supabase Cloud لـ TravelOS

## 1) متغيرات البيئة (تم ضبطها محلياً)

```env
NEXT_PUBLIC_SUPABASE_URL=https://ndomcfohwnvbyufnrxek.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=...  # من Dashboard → Settings → API
```

## 2) إنشاء الجداول (مرة واحدة)

1. افتح [SQL Editor](https://supabase.com/dashboard/project/ndomcfohwnvbyufnrxek/sql/new)
2. انسخ محتوى الملف: `database/scripts/RUN_IN_SUPABASE_SQL_EDITOR.sql`
3. اضغط **Run** وانتظر حتى ينتهي بدون أخطاء

أو من الطرفية (بعد `npx supabase login`):

```powershell
npx supabase link --project-ref ndomcfohwnvbyufnrxek
npm run db:push
```

## 3) تفعيل Auth Hook

Dashboard → **Authentication** → **Hooks** → **Custom Access Token**  
Function: `public.custom_access_token_hook`

## 4) مستخدم الأدمن

```powershell
npm run admin:create
```

## 5) تشغيل الموقع

```powershell
npm run dev
```

- http://localhost:3000 — الصفحة الرئيسية
- http://localhost:3000/login — تسجيل الدخول
