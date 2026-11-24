import { Route, Routes } from "react-router-dom";

import { LOGIN_PATH, RequireAuth } from "@/auth/RequireAuth";
import { ComponentesDevPage } from "@/pages/ComponentesDevPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage, RECOVER_PATH } from "@/pages/LoginPage";
import { RecoverPasswordPage } from "@/pages/RecoverPasswordPage";

export function App() {
  return (
    <Routes>
      <Route path={LOGIN_PATH} element={<LoginPage />} />
      <Route path={RECOVER_PATH} element={<RecoverPasswordPage />} />
      <Route path="/dev/componentes" element={<ComponentesDevPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
      </Route>
    </Routes>
  );
}
