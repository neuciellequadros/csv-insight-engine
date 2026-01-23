import React, { useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import autoTable from "jspdf-autotable";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Footer } from "./components/footer";
import ThemeToggle from "./components/ThemeToggle";

const API_BASE = "http://localhost:8000";

type ColumnInfo = { name: string; dtype: string };

type AnalyzeResponse = {
  filename: string;
  rows: number;
  cols: number;
  columns?: ColumnInfo[];
  numericColumns: string[];
  stats: Record<
    string,
    {
      count: number;
      min: number | null;
      max: number | null;
      mean: number | null;
      sum: number | null;
    }
  >;
  preview: Record<string, any>[];
};

function formatNum(n: number | null | undefined, locale: string) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(n);
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn";
}) {
  const bg =
    tone === "ok"
      ? "rgba(16,185,129,0.18)"
      : tone === "warn"
        ? "rgba(255,77,79,0.18)"
        : "var(--panel2)";

  const bd =
    tone === "ok"
      ? "rgba(16,185,129,0.30)"
      : tone === "warn"
        ? "rgba(255,77,79,0.30)"
        : "var(--stroke)";

  const tx =
    tone === "warn"
      ? "var(--text)"
      : tone === "ok"
        ? "var(--text)"
        : "var(--text)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${bd}`,
        fontSize: 12,
        color: tx,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div style={styles.panelTitle}>{title}</div>
        {right ? <div>{right}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [chartCol, setChartCol] = useState<string>("");

  const { t, i18n } = useTranslation("common");
  const localeForNumbers =
    i18n.language === "en"
      ? "en-US"
      : i18n.language === "es"
        ? "es-ES"
        : "pt-BR";

  const [apiStatus, setApiStatus] = useState<"unknown" | "ok" | "down">(
    "unknown",
  );

  const hasData = !!data;

  const chartData = useMemo(() => {
    if (!data || !chartCol) return [];
    return data.preview
      .map((row, i) => {
        const raw = row[chartCol];
        const num =
          typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
        return { idx: i + 1, value: Number.isFinite(num) ? num : null };
      })
      .filter((p) => p.value !== null) as { idx: number; value: number }[];
  }, [data, chartCol]);

  async function pingApi() {
    try {
      await axios.get(`${API_BASE}/health`, { timeout: 2000 });
      setApiStatus("ok");
    } catch {
      setApiStatus("down");
    }
  }

  async function handleAnalyze() {
    try {
      setErr("");
      setData(null);

      if (!file) {
        setErr(t("errorNoFile"));
        return;
      }

      setLoading(true);
      await pingApi();

      const form = new FormData();
      form.append("file", file);

      const res = await axios.post<AnalyzeResponse>(
        `${API_BASE}/api/analyze`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      setData(res.data);
      setChartCol(res.data.numericColumns?.[0] ?? "");
    } catch (e: any) {
      setErr(e?.response?.data?.detail || t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  function exportPdfOnlyData() {
    if (!data) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(20);
    doc.text(t("pdfTitle"), marginX, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`${t("fileLabel")}: ${data.filename}`, marginX, 66);
    doc.text(
      `${t("rowsLabel")}: ${data.rows}   |   ${t("colsLabel")}: ${data.cols}`,
      marginX,
      82,
    );

    // Linha
    doc.setDrawColor(220);
    doc.line(marginX, 92, pageWidth - marginX, 92);

    // Resumo (cards)
    const cardY = 110;
    const cardH = 54;
    const gap = 10;
    const cardW = (pageWidth - marginX * 2 - gap * 3) / 4;

    const cards = [
      { label: t("fileShort"), value: data.filename },
      { label: t("rowsShort"), value: String(data.rows) },
      { label: t("colsShort"), value: String(data.cols) },
      { label: t("numericShort"), value: String(data.numericColumns.length) },
    ];

    cards.forEach((c, i) => {
      const x = marginX + i * (cardW + gap);
      doc.setDrawColor(230);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(x, cardY, cardW, cardH, 8, 8, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text(c.label, x + 12, cardY + 18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30);

      const value = c.value.length > 26 ? c.value.slice(0, 26) + "…" : c.value;
      doc.text(value, x + 12, cardY + 38);
    });

    let cursorY = cardY + cardH + 18;

    // Título: Estatísticas
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(t("statsTitlePdf"), marginX, cursorY);
    cursorY += 10;

    const statRows = Object.entries(data.stats || {}).map(([col, s]) => [
      col,
      String(s.count),
      formatNum(s.min, localeForNumbers),
      formatNum(s.max, localeForNumbers),
      formatNum(s.mean, localeForNumbers),
      formatNum(s.sum, localeForNumbers),
    ]);

    if (statRows.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(t("noNumericCols"), marginX, cursorY + 18);
      cursorY += 30;
    } else {
      autoTable(doc, {
        startY: cursorY + 8,
        head: [[t("col"), t("count"), t("min"), t("max"), t("mean"), t("sum")]],
        body: statRows,
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 6,
          lineWidth: 0.5,
          lineColor: [230, 230, 230],
          textColor: [30, 30, 30],
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [30, 30, 30],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        margin: { left: marginX, right: marginX },
        tableLineColor: [230, 230, 230],
        tableLineWidth: 0.5,
      });

      // @ts-ignore
      cursorY = doc.lastAutoTable.finalY + 18;
    }

    // Título: Preview
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(t("previewTitlePdf"), marginX, cursorY);
    cursorY += 10;

    const preview = data.preview || [];
    const previewCols =
      data.columns?.map((c) => c.name).slice(0, 6) ??
      Object.keys(preview[0] || {}).slice(0, 6);

    const previewBody = preview.slice(0, 20).map((row) =>
      previewCols.map((c) => {
        const v = row?.[c];
        const txt = v === null || v === undefined ? "" : String(v);
        return txt.length > 28 ? txt.slice(0, 28) + "…" : txt;
      }),
    );

    if (previewCols.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(t("noPreview"), marginX, cursorY + 18);
    } else {
      autoTable(doc, {
        startY: cursorY + 8,
        head: [previewCols],
        body: previewBody,
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 5,
          lineWidth: 0.5,
          lineColor: [230, 230, 230],
          textColor: [30, 30, 30],
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [30, 30, 30],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        margin: { left: marginX, right: marginX },
      });
    }

    // Footer com paginação
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        `${t("page")} ${i} ${t("of")} ${pageCount}`,
        pageWidth - marginX,
        pageHeight - 24,
        { align: "right" },
      );
    }

    doc.save(`insightcsv-report-${i18n.language}.pdf`);
  }

  function clearAll() {
    setFile(null);
    setData(null);
    setErr("");
    setChartCol("");
    setApiStatus("unknown");
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.brandRow}>
            <div style={styles.logoDot} />
            <div style={styles.brand}>{t("appTitle")}</div>

            <Pill
              tone={
                apiStatus === "ok"
                  ? "ok"
                  : apiStatus === "down"
                    ? "warn"
                    : "neutral"
              }
            >
              <span style={{ fontWeight: 800 }}>API</span>
              <span style={{ opacity: 0.9 }}>
                {apiStatus === "ok"
                  ? t("online")
                  : apiStatus === "down"
                    ? t("offline")
                    : t("status")}
              </span>
            </Pill>
          </div>
          <div style={styles.caption}>{t("caption")}</div>
        </div>

        <div style={styles.actionsRow}>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <div style={styles.hero}>
        <div style={styles.heroLeft}>
          <div style={styles.heroTitle}>{t("heroTitle")}</div>
          <div style={styles.heroText}>{t("heroText")}</div>

          <div style={styles.uploadBox}>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={styles.fileInput}
              />
              <Pill>
                {file ? (
                  <>
                    <span style={{ fontWeight: 800 }}>{t("selected")}:</span>
                    <span style={{ opacity: 0.9 }}>{file.name}</span>
                  </>
                ) : (
                  <span style={{ opacity: 0.9 }}>{t("noFileSelected")}</span>
                )}
              </Pill>
            </div>

            {!!err && (
              <div style={styles.errorBox}>
                <b>{t("error")}:</b> {err}
              </div>
            )}
          </div>
        </div>

        <div style={styles.heroRight}>
          <div style={styles.statsGrid}>
            <StatCard
              label={t("fileShort")}
              value={hasData ? data!.filename : "—"}
            />
            <StatCard
              label={t("rowsShort")}
              value={hasData ? data!.rows : "—"}
            />
            <StatCard
              label={t("colsShort")}
              value={hasData ? data!.cols : "—"}
            />
            <StatCard
              label={t("numericShort")}
              value={hasData ? data!.numericColumns.length : "—"}
            />
          </div>
        </div>
      </div>

      <div style={styles.mainGrid}>
        <Panel
          title={t("chartTitle")}
          right={
            hasData && data!.numericColumns.length ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {t("yColumn")}
                </span>
                <select
                  value={chartCol}
                  onChange={(e) => setChartCol(e.target.value)}
                  style={styles.select}
                >
                  {data!.numericColumns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ) : null
          }
        >
          {!hasData ? (
            <div style={styles.empty}>{t("emptyChart")}</div>
          ) : data!.numericColumns.length === 0 ? (
            <div style={styles.empty}>{t("noNumericToPlot")}</div>
          ) : (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" />
                  <XAxis dataKey="idx" stroke="var(--muted)" />
                  <YAxis stroke="var(--muted)" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    dot={false}
                    stroke="var(--text)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title={t("statsTitle")}>
          {!hasData ? (
            <div style={styles.empty}>{t("statsEmpty")}</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{t("col")}</th>
                    <th style={styles.th}>{t("count")}</th>
                    <th style={styles.th}>{t("min")}</th>
                    <th style={styles.th}>{t("max")}</th>
                    <th style={styles.th}>{t("mean")}</th>
                    <th style={styles.th}>{t("sum")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(data!.stats).length === 0 ? (
                    <tr>
                      <td colSpan={6} style={styles.tdEmpty}>
                        {t("noNumericCols")}
                      </td>
                    </tr>
                  ) : (
                    Object.entries(data!.stats).map(([k, s]) => (
                      <tr key={k}>
                        <td style={{ ...styles.td, fontWeight: 800 }}>{k}</td>
                        <td style={styles.td}>{s.count}</td>
                        <td style={styles.td}>
                          {formatNum(s.min, localeForNumbers)}
                        </td>
                        <td style={styles.td}>
                          {formatNum(s.max, localeForNumbers)}
                        </td>
                        <td style={styles.td}>
                          {formatNum(s.mean, localeForNumbers)}
                        </td>
                        <td style={styles.td}>
                          {formatNum(s.sum, localeForNumbers)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* BOTÕES NO FINAL */}
      <div style={styles.footerButtons}>
        <button
          style={styles.primaryBtn}
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? t("analyzing") : t("analyze")}
        </button>

        <button
          style={styles.secondaryBtn}
          onClick={exportPdfOnlyData}
          disabled={!hasData}
        >
          {t("exportPdf")}
        </button>

        <button style={styles.ghostBtn} onClick={clearAll}>
          {t("clear")}
        </button>
      </div>

      <Footer />
    </div>
  );
}

const styles: Record<string, any> = {
  wrap: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "18px 18px 28px",
  },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-start",
    padding: "10px 10px 16px",
  },

  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "rgba(99,102,241,0.95)",
    boxShadow: "0 0 0 6px rgba(99,102,241,0.18)",
  },
  brand: {
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: 0.2,
    color: "var(--text)",
  },
  caption: {
    marginTop: 6,
    fontSize: 13,
    color: "var(--muted)",
  },

  actionsRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  hero: {
    display: "grid",
    gridTemplateColumns: "1.25fr 0.75fr",
    gap: 14,
    padding: 12,
  },

  heroLeft: {
    background: "var(--panel)",
    border: "1px solid var(--stroke)",
    borderRadius: 18,
    padding: 18,
    backdropFilter: "blur(10px)",
  },

  heroTitle: {
    fontSize: 26,
    fontWeight: 950,
    lineHeight: 1.15,
    letterSpacing: -0.2,
    color: "var(--text)",
  },

  heroText: {
    marginTop: 8,
    fontSize: 13,
    color: "var(--muted)",
    lineHeight: 1.5,
    maxWidth: 560,
  },

  uploadBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    background: "var(--panel2)",
    border: "1px solid var(--stroke)",
  },

  fileInput: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid var(--stroke)",
    background: "rgba(0,0,0,0.10)",
    color: "var(--text)",
  },

  errorBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,77,79,0.16)",
    border: "1px solid rgba(255,77,79,0.28)",
    color: "var(--text)",
    fontSize: 13,
  },

  heroRight: {
    background: "var(--panel)",
    border: "1px solid var(--stroke)",
    borderRadius: 18,
    padding: 18,
    backdropFilter: "blur(10px)",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  statCard: {
    padding: 12,
    borderRadius: 16,
    background: "var(--panel2)",
    border: "1px solid var(--stroke)",
  },

  statLabel: {
    fontSize: 11,
    color: "var(--muted)",
  },

  statValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: 900,
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mainGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 14,
  },

  panel: {
    background: "var(--panel)",
    border: "1px solid var(--stroke)",
    borderRadius: 18,
    padding: 14,
    backdropFilter: "blur(10px)",
    minHeight: 320,
  },

  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },

  panelTitle: {
    fontSize: 14,
    fontWeight: 950,
    letterSpacing: 0.2,
    color: "var(--text)",
  },

  empty: {
    padding: 14,
    borderRadius: 14,
    background: "var(--panel2)",
    border: "1px solid var(--stroke)",
    color: "var(--muted)",
    fontSize: 13,
    lineHeight: 1.4,
  },

  select: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid var(--stroke)",
    background: "rgba(0,0,0,0.12)",
    color: "var(--text)",
    outline: "none",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
    overflow: "hidden",
  },

  th: {
    textAlign: "left",
    padding: "10px 10px",
    borderBottom: "1px solid var(--stroke)",
    color: "var(--muted)",
    fontSize: 11,
    letterSpacing: 0.2,
    fontWeight: 900,
  },

  td: {
    padding: "10px 10px",
    borderBottom: "1px solid var(--stroke)",
    color: "var(--text)",
  },

  tdEmpty: {
    textAlign: "center",
    opacity: 0.9,
    padding: 12,
    color: "var(--muted)",
  },

  footerButtons: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid var(--stroke)",
    cursor: "pointer",
    background: "rgba(99,102,241,0.95)",
    color: "rgba(255,255,255,0.95)",
    fontWeight: 900,
  },

  secondaryBtn: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid var(--stroke)",
    cursor: "pointer",
    background: "var(--panel2)",
    color: "var(--text)",
    fontWeight: 900,
  },

  ghostBtn: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid var(--stroke)",
    cursor: "pointer",
    background: "rgba(0,0,0,0.10)",
    color: "var(--text)",
    fontWeight: 800,
  },
};
