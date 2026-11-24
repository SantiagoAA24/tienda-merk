import { Route, Routes } from "react-router-dom";

import { HolaPage } from "@/pages/HolaPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HolaPage />} />
    </Routes>
  );
}
