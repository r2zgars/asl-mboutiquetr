insert into public.settings (key, value) values
  ('trustTitle1', '"GÃ¼venli alÄ±ÅŸveriÅŸ"'::jsonb),
  ('trustText1', '"256 Bit SSL korumasÄ±"'::jsonb),
  ('trustTitle2', '"HÄ±zlÄ± gÃ¶nderim"'::jsonb),
  ('trustText2', '"Ã–zenli ve takipli teslimat"'::jsonb),
  ('trustTitle3', '"Kolay iade"'::jsonb),
  ('trustText3', '"3 iÅŸ gÃ¼nÃ¼ iÃ§inde"'::jsonb),
  ('authImage', '"/images/hero-vest.webp"'::jsonb),
  ('authEyebrow', '"ASLIM BOUTIQUE"'::jsonb),
  ('authLoginTitle', '"Tekrar hoÅŸ geldiniz."'::jsonb),
  ('authLoginText', '"HesabÄ±nÄ±za giriÅŸ yaparak favorilerinize devam edin."'::jsonb),
  ('authRegisterTitle', '"AramÄ±za katÄ±lÄ±n."'::jsonb),
  ('authRegisterText', '"Favorilerinizi saklamak iÃ§in hesabÄ±nÄ±zÄ± oluÅŸturun."'::jsonb)
on conflict (key) do nothing;
