export function Footer() {
  return (
    <footer
      style={{
        marginTop: 24,
        padding: "14px 10px",
        textAlign: "center",
        fontSize: 12,
        color: "var(--muted)",
        borderTop: "1px solid var(--stroke)",
      }}
    >
      © {new Date().getFullYear()} — Desenvolvido por{" "}
      <span
        style={{
          fontWeight: 800,
          color: "var(--text)",
        }}
      >
        Neucielle Quadros
      </span>
    </footer>
  );
}
