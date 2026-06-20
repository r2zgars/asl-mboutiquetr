import { Route, Routes } from "react-router-dom";
import {
  CategoryPage,
  CustomerAccountPage,
  CustomerAuthPage,
  HomePage,
  InfoPage,
  NotFound,
  ProductPage,
  SearchPage,
  StoreLayout
} from "./storefront";
import {
  AdminCategories,
  AdminDashboard,
  AdminLayout,
  AdminLogin,
  AdminProducts,
  AdminSettings
} from "./admin";

export default function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="kategori/:slug" element={<CategoryPage />} />
        <Route path="kategori/:categorySlug/:productSlug" element={<ProductPage />} />
        <Route path="urun/:slug" element={<ProductPage />} />
        <Route path="arama" element={<SearchPage />} />
        <Route path="iletisim" element={<InfoPage type="contact" />} />
        <Route path="sss" element={<InfoPage type="faq" />} />
        <Route path="giris" element={<CustomerAuthPage mode="login" />} />
        <Route path="kayit-ol" element={<CustomerAuthPage mode="register" />} />
        <Route path="hesabim" element={<CustomerAccountPage />} />
      </Route>

      <Route path="/admin/giris" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="urunler" element={<AdminProducts />} />
        <Route path="kategoriler" element={<AdminCategories />} />
        <Route path="ayarlar" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
