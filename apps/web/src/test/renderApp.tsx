import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { App } from "@/App";
import { AuthProvider } from "@/auth/AuthProvider";

/** Renders the whole app at `path` and waits for the initial session restore. */
export async function renderApp(path: string) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );
  });
  return result;
}
