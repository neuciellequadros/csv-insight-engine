export function Footer() {
  return (
    <footer
      style={{
        marginTop: 24,
        padding: "14px 10px",
        textAlign: "center",
        fontSize: 12,
        color: "rgba(255,255,255,0.6)",
        borderTop: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      © {new Date().getFullYear()} — Desenvolvido por{" "}
      <span
        style={{
          fontWeight: 800,
          color: "rgba(255,255,255,0.9)",
        }}
      >
        Neucielle Quadros
      </span>
    </footer>
  );
}
