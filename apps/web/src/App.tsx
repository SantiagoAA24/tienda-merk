import { Route, Routes } from "react-router-dom";

import { LOGIN_PATH, RequireAuth } from "@/auth/RequireAuth";
import { ComponentesDevPage } from "@/pages/ComponentesDevPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage, RECOVER_PATH } from "@/pages/LoginPage";
import { ProductFormPage } from "@/pages/products/ProductFormPage";
import { ProductsPage } from "@/pages/products/ProductsPage";
import { RecoverPasswordPage } from "@/pages/RecoverPasswordPage";
import { CheckoutPage } from "@/pages/sale/CheckoutPage";
import { CustomerPage } from "@/pages/sale/CustomerPage";
import { SaleDonePage } from "@/pages/sale/SaleDonePage";
import { SalePage } from "@/pages/sale/SalePage";
import { WeightPage } from "@/pages/sale/WeightPage";

export function App() {
  return (
    <Routes>
      <Route path={LOGIN_PATH} element={<LoginPage />} />
      <Route path={RECOVER_PATH} element={<RecoverPasswordPage />} />
      <Route path="/dev/componentes" element={<ComponentesDevPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/productos" element={<ProductsPage />} />
        <Route
          path="/productos/nuevo"
          element={<ProductFormPage mode="create" />}
        />
        <Route
          path="/productos/:id/editar"
          element={<ProductFormPage mode="edit" />}
        />
        <Route path="/venta" element={<SalePage />} />
        <Route path="/venta/peso/:productId" element={<WeightPage />} />
        <Route path="/venta/cobrar" element={<CheckoutPage />} />
        <Route path="/venta/cliente" element={<CustomerPage />} />
        <Route path="/venta/lista/:saleId" element={<SaleDonePage />} />
      </Route>
    </Routes>
  );
}
