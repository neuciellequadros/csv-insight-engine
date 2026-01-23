import { useTheme } from "../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Alternar tema"
      title="Alternar tema"
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid var(--stroke)",
        background: "var(--panel)",
        color: "var(--text)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        backdropFilter: "blur(10px)",
      }}
    >
      <span style={{ fontSize: 16 }}>{theme === "dark" ? "🌙" : "☀️"}</span>
      <span style={{ fontSize: 14, color: "var(--muted)" }}>
        {theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}
