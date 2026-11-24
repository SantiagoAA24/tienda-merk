export function HolaPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
        background: "var(--surface-page)",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "46px",
          lineHeight: "53px",
          fontWeight: 800,
          color: "var(--green-900)",
        }}
      >
        Hola
      </h1>
    </main>
  );
}
