# Supabase + Vercel Yayın Planı

Bu proje canlıya alınırken kalıcı veriler Supabase'de, frontend/API ise Vercel'de çalışacak şekilde hazırlandı.

## 1. Supabase

1. Supabase'de proje oluşturun.
2. `supabase/schema.sql` dosyasındaki SQL'i SQL Editor'da çalıştırın.
3. Storage bölümünde `aslim-boutique` bucket'ının public olduğunu kontrol edin.
4. Project Settings > API ekranından şu değerleri alın:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` sadece server/Vercel ortam değişkenlerinde tutulur. Frontend koduna yazılmaz.

Yereldeki SQLite verilerini Supabase'e taşımak için:

```powershell
npm run supabase:migrate
```

## 2. Vercel Environment Variables

Vercel Project Settings > Environment Variables bölümüne şunları girin:

```text
NODE_ENV=production
PUBLIC_SITE_URL=https://alanadiniz.com

SUPABASE_URL=https://proje-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=aslim-boutique

SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="Aslim Boutique <mail@alanadiniz.com>"

PAYTR_MERCHANT_ID=...
PAYTR_MERCHANT_KEY=...
PAYTR_MERCHANT_SALT=...
PAYTR_TEST_MODE=1
PAYTR_DEBUG_ON=1
PAYTR_NO_INSTALLMENT=0
PAYTR_MAX_INSTALLMENT=0
PAYTR_TIMEOUT_LIMIT=30
PAYTR_CURRENCY=TL
```

PayTR bilgileri gelmeden deploy yapılabilir; bu durumda ödeme butonu pasif görünür. PayTR bilgileri eklenince ödeme ekranı açılır.

## 3. PayTR Panel Ayarları

PayTR panelinde Bildirim URL:

```text
https://alanadiniz.com/api/paytr/callback
```

Testler tamamlanana kadar:

```text
PAYTR_TEST_MODE=1
PAYTR_DEBUG_ON=1
```

Canlıya geçerken:

```text
PAYTR_TEST_MODE=0
PAYTR_DEBUG_ON=0
```

## 4. Kontrol Listesi

- Supabase SQL şeması çalıştırıldı.
- SQLite verileri Supabase'e aktarıldı.
- Vercel env değişkenleri girildi.
- `PUBLIC_SITE_URL` canlı alan adıyla güncellendi.
- PayTR callback URL PayTR paneline eklendi.
- İlk test siparişi PayTR test modunda denendi.
