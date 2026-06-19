# Supabase + Vercel Yayın Notları

Bu proje ödeme altyapısı kullanmaz. Satın alma akışı ürün sayfasındaki `Satın Al` butonuyla WhatsApp'a yönlenir.

## 1. Supabase

1. Supabase projesini açın.
2. SQL Editor bölümünde `supabase/schema.sql` içeriğini çalıştırın.
3. Storage bucket adı: `aslim-boutique`.

## 2. Vercel Environment Variables

Vercel > Project > Settings > Environment Variables alanına şu değişkenleri ekleyin:

```text
NODE_ENV=production
PUBLIC_SITE_URL=https://alanadiniz.com
SUPABASE_URL=https://proje-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=aslim-boutique
```


## 3. Deploy

1. GitHub'a `.env` dosyasını yüklemeyin.
2. Vercel'de repo import edin.
3. Framework preset: Vite.
4. Root directory: `./`.
5. Deploy butonuna basın.

## 4. Canlı Kontrol

- Ana sayfa açılıyor.
- Ürün kartları ürün detayına gidiyor.
- Ürün detayında `Satın Al` WhatsApp'a ürün linkli mesajla yönlendiriyor.
- Yönetim panelinde görsel yükleme Supabase Storage'a çalışıyor.
- Kullanıcı kayıt/giriş ve favoriler çalışıyor.
