# Aslım Boutique

Referans Ikas mağazasının görsel dilini temel alan, bağımsız yönetim panelli butik vitrini.

## Özellikler

- Mobil ve masaüstü uyumlu mağaza vitrini
- Müşteri kayıt, giriş, hesabım ve favoriler
- Ürün, kategori, stok, fiyat, görsel, logo, duyuru ve site ayarları yönetimi
- Renk/beden kombinasyonlarına özel ürün görselleri
- Stokta olmayan ürünlerde şeffaf "stokta yok" etiketi
- Ürün sayfasında Sepete Ekle yerine WhatsApp'a yönlendiren Satın Al butonu
- Supabase veritabanı ve Supabase Storage görsel yükleme

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

`.env.example` dosyasını `.env` adıyla çoğaltıp Supabase bilgilerini girin.

En kritik değişkenler:

```text
NODE_ENV=production
PUBLIC_SITE_URL=https://alanadiniz.com
SUPABASE_URL=https://proje-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=aslim-boutique
```

## Satın Alma Akışı

Sitede ödeme altyapısı ve sepet akışı yoktur. Kullanıcı ürün detayına girer, `Satın Al` butonuna basar ve WhatsApp görüşmesine ürün linkiyle yönlendirilir.

Örnek otomatik mesaj:

```text
https://aslimboutique.vercel.app/kategori/alt-giyim/yelek Ürünü hakkında bilgi almak istiyorum.
```

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
