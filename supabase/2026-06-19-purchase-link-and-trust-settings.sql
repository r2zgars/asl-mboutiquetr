alter table public.products
  add column if not exists purchase_url text not null default '';

insert into public.settings (key, value) values
  ('trustTitle1', '"Güvenli alışveriş"'::jsonb),
  ('trustText1', '"256 Bit SSL koruması"'::jsonb),
  ('trustTitle2', '"Hızlı gönderim"'::jsonb),
  ('trustText2', '"Özenli ve takipli teslimat"'::jsonb),
  ('trustTitle3', '"Kolay iade"'::jsonb),
  ('trustText3', '"3 iş günü içinde"'::jsonb),
  ('authImage', '"/images/hero-vest.webp"'::jsonb),
  ('authEyebrow', '"ASLIM BOUTIQUE"'::jsonb),
  ('authLoginTitle', '"Tekrar hoş geldiniz."'::jsonb),
  ('authLoginText', '"Hesabınıza giriş yaparak favorilerinize devam edin."'::jsonb),
  ('authRegisterTitle', '"Aramıza katılın."'::jsonb),
  ('authRegisterText', '"Favorilerinizi saklamak için hesabınızı oluşturun."'::jsonb)
on conflict (key) do nothing;
