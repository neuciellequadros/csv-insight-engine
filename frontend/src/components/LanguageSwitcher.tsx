import i18n, { setAppLanguage } from "../i18n";

type Lang = "pt" | "en" | "es";

const activeStyles: Record<Lang, React.CSSProperties> = {
  pt: {
    background: "linear-gradient(90deg, #009C3B 50%, #FFDF00 50%)",
    border: "1px solid #009C3B",
  },
  es: {
    background:
      "linear-gradient(90deg, #AA151B 40%, #F1BF00 40%, #F1BF00 70%, #AA151B 70%)",
    border: "1px solid #AA151B",
  },
  en: {
    background: "linear-gradient(90deg, #3C3B6E 50%, #B22234 50%)",
    border: "1px solid #3C3B6E",
    color: "#ffffff",
  },
};

const inactiveStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.85)",
  border: "1px solid rgba(0,0,0,0.15)",
  opacity: 0.7,
};

export function LanguageSwitcher() {
  const current = i18n.language as Lang;

  function btn(lang: Lang, flag: string) {
    const active = current === lang;

    return (
      <button
        onClick={() => setAppLanguage(lang)}
        style={{
          fontSize: 20,
          padding: "6px 12px",
          borderRadius: 12,
          cursor: "pointer",
          transition: "all 0.25s ease",
          lineHeight: 1,
          ...(active ? activeStyles[lang] : inactiveStyle),
        }}
        title={
          lang === "pt" ? "Português" : lang === "en" ? "English" : "Español"
        }
      >
        {flag}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {btn("pt", "🇧🇷")}
      {btn("en", "🇺🇸")}
      {btn("es", "🇪🇸")}
    </div>
  );
}
