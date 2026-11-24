import { Route, Routes } from "react-router-dom";

import { ComponentesDevPage } from "@/pages/ComponentesDevPage";
import { HolaPage } from "@/pages/HolaPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HolaPage />} />
      <Route path="/dev/componentes" element={<ComponentesDevPage />} />
    </Routes>
  );
}
