# Aslım Boutique

Referans Ikas mağazasının görsel dilini temel alan, bağımsız yönetim panelli e-ticaret uygulaması.

## Özellikler

- Mobil ve masaüstü uyumlu mağaza vitrini
- Müşteri kayıt, giriş, hesabım, favoriler ve sipariş geçmişi
- Sipariş öncesi e-posta doğrulama zorunluluğu
- Ürün, kategori, stok, fiyat, görsel, logo, duyuru ve site ayarları yönetimi
- Renk/beden kombinasyonlarına özel ürün görselleri
- Yönetim panelinde açık teslimat adresi, sipariş durumu, iptal sebebi ve kargo takip kodu
- Ciro özetleri: 1 hafta, 1 ay, 1 yıl ve tüm zamanlar
- Stokta olmayan ürünlerde şeffaf “stokta yok” etiketi
- Supabase veritabanı ve Supabase Storage görsel yükleme
- PayTR iFrame ödeme altyapısı
- Kapıda ödeme kapalıdır

## Yerel Çalıştırma

Node.js 24 önerilir.

```powershell
npm install
npm run dev
```

- Mağaza: `http://localhost:5173`
- Yönetim paneli: `http://localhost:5173/admin`

İlk yönetici hesabı:

```text
E-posta: aslimboutique@gmail.com
Şifre: iremtetik2346
```

## Ortam Değişkenleri

`.env.example` dosyasını `.env` adıyla çoğaltıp Supabase, SMTP ve PayTR bilgilerini girin.

En kritik değişkenler:

```text
NODE_ENV=production
PUBLIC_SITE_URL=https://alanadiniz.com
SUPABASE_URL=https://proje-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=aslim-boutique
PAYTR_MERCHANT_ID=...
PAYTR_MERCHANT_KEY=...
PAYTR_MERCHANT_SALT=...
```

PayTR bilgileri yoksa ödeme butonu pasif kalır.

## Supabase

Supabase SQL şeması:

```text
supabase/schema.sql
```

Yereldeki SQLite verilerini Supabase'e taşımak için:

```powershell
npm run supabase:migrate
```

Uygulama canlı ortamda verileri Supabase'den okur ve Supabase'e yazar.

## Üretim

```powershell
npm run build
npm start
```

Uygulama varsayılan olarak `http://localhost:3001` adresinde açılır. Farklı port için `PORT` ortam değişkenini kullanabilirsiniz.

## Vercel Yayını

Vercel için `vercel.json` hazırdır. Detaylı yayın sırası:

```text
docs/deploy-supabase-vercel.md
```

PayTR panelinde Bildirim URL:

```text
https://alanadiniz.com/api/paytr/callback
```
