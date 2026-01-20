import { useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
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

function formatNum(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(n);
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
        : "rgba(255,255,255,0.10)";
  const bd =
    tone === "ok"
      ? "rgba(16,185,129,0.30)"
      : tone === "warn"
        ? "rgba(255,77,79,0.30)"
        : "rgba(255,255,255,0.16)";

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
        color: "rgba(255,255,255,0.85)",
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
        setErr("Selecione um arquivo .csv antes de analisar.");
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
      setErr(e?.response?.data?.detail || "Erro ao analisar CSV.");
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
    doc.text("InsightCSV — Relatório", marginX, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`Arquivo: ${data.filename}`, marginX, 66);
    doc.text(`Linhas: ${data.rows}   |   Colunas: ${data.cols}`, marginX, 82);

    // Linha
    doc.setDrawColor(220);
    doc.line(marginX, 92, pageWidth - marginX, 92);

    // Resumo (cards)
    const cardY = 110;
    const cardH = 54;
    const gap = 10;
    const cardW = (pageWidth - marginX * 2 - gap * 3) / 4;

    const cards = [
      { label: "Arquivo", value: data.filename },
      { label: "Linhas", value: String(data.rows) },
      { label: "Colunas", value: String(data.cols) },
      { label: "Numéricas", value: String(data.numericColumns.length) },
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
    doc.text("Estatísticas (colunas numéricas)", marginX, cursorY);
    cursorY += 10;

    const statRows = Object.entries(data.stats || {}).map(([col, s]) => [
      col,
      String(s.count),
      formatNum(s.min),
      formatNum(s.max),
      formatNum(s.mean),
      formatNum(s.sum),
    ]);

    if (statRows.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text("Nenhuma coluna numérica detectada.", marginX, cursorY + 18);
      cursorY += 30;
    } else {
      autoTable(doc, {
        startY: cursorY + 8,
        head: [["Coluna", "Count", "Min", "Max", "Média", "Soma"]],
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
    doc.text("Preview (primeiras linhas)", marginX, cursorY);
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
      doc.text("Sem dados para preview.", marginX, cursorY + 18);
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
        `Página ${i} de ${pageCount}`,
        pageWidth - marginX,
        pageHeight - 24,
        { align: "right" },
      );
    }

    doc.save("relatorio_insightcsv.pdf");
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
            <div style={styles.brand}>InsightCSV AI</div>
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
                  ? "online"
                  : apiStatus === "down"
                    ? "offline"
                    : "status"}
              </span>
            </Pill>
          </div>
          <div style={styles.caption}>
            Upload de CSV → análise → gráfico → PDF (somente dados)
          </div>
        </div>

        <div style={styles.actionsRow}>
          <button style={styles.ghostBtn} onClick={pingApi} disabled={loading}>
            Testar API
          </button>
        </div>
      </div>

      <div style={styles.hero}>
        <div style={styles.heroLeft}>
          <div style={styles.heroTitle}>
            Transforme um CSV em insights em segundos.
          </div>
          <div style={styles.heroText}>
            Faça upload do arquivo, gere estatísticas, visualize o comportamento
            em gráfico e exporte um relatório em PDF com dados.
          </div>

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
                    <span style={{ fontWeight: 800 }}>Selecionado:</span>
                    <span style={{ opacity: 0.9 }}>{file.name}</span>
                  </>
                ) : (
                  <span style={{ opacity: 0.9 }}>
                    Nenhum arquivo selecionado
                  </span>
                )}
              </Pill>
            </div>

            {!!err && (
              <div style={styles.errorBox}>
                <b>Erro:</b> {err}
              </div>
            )}
          </div>
        </div>

        <div style={styles.heroRight}>
          <div style={styles.statsGrid}>
            <StatCard label="Arquivo" value={hasData ? data!.filename : "—"} />
            <StatCard label="Linhas" value={hasData ? data!.rows : "—"} />
            <StatCard label="Colunas" value={hasData ? data!.cols : "—"} />
            <StatCard
              label="Numéricas"
              value={hasData ? data!.numericColumns.length : "—"}
            />
          </div>
        </div>
      </div>

      <div style={styles.mainGrid}>
        <Panel
          title="Gráfico"
          right={
            hasData && data!.numericColumns.length ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Coluna Y</span>
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
            <div style={styles.empty}>
              Envie um CSV e clique em <b>Analisar CSV</b>.
            </div>
          ) : data!.numericColumns.length === 0 ? (
            <div style={styles.empty}>
              Não detectei colunas numéricas para plotar.
            </div>
          ) : (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="idx" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Estatísticas (colunas numéricas)">
          {!hasData ? (
            <div style={styles.empty}>
              As estatísticas aparecem após a análise.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Coluna</th>
                    <th>Count</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Média</th>
                    <th>Soma</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(data!.stats).length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", opacity: 0.85 }}
                      >
                        Nenhuma coluna numérica detectada.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(data!.stats).map(([k, s]) => (
                      <tr key={k}>
                        <td style={{ fontWeight: 800 }}>{k}</td>
                        <td>{s.count}</td>
                        <td>{formatNum(s.min)}</td>
                        <td>{formatNum(s.max)}</td>
                        <td>{formatNum(s.mean)}</td>
                        <td>{formatNum(s.sum)}</td>
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
          {loading ? "Analisando..." : "Analisar CSV"}
        </button>

        <button
          style={styles.secondaryBtn}
          onClick={exportPdfOnlyData}
          disabled={!hasData}
        >
          Gerar PDF (bonito)
        </button>

        <button style={styles.ghostBtn} onClick={clearAll}>
          Limpar
        </button>
      </div>

      <div style={styles.footerNote}>
        Dica: se seu CSV usa <b>;</b> como separador, o backend detecta
        automaticamente.
      </div>
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
  },
  caption: {
    marginTop: 6,
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
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
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 18,
    padding: 18,
    backdropFilter: "blur(10px)",
  },

  heroTitle: {
    fontSize: 26,
    fontWeight: 950,
    lineHeight: 1.15,
    letterSpacing: -0.2,
  },

  heroText: {
    marginTop: 8,
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.5,
    maxWidth: 560,
  },

  uploadBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  fileInput: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.9)",
  },

  errorBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,77,79,0.16)",
    border: "1px solid rgba(255,77,79,0.28)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
  },

  heroRight: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
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
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
  },

  statValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: 900,
    color: "rgba(255,255,255,0.92)",
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
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
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
  },

  empty: {
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 1.4,
  },

  select: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.22)",
    color: "rgba(255,255,255,0.9)",
    outline: "none",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
    overflow: "hidden",
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
    border: "1px solid rgba(255,255,255,0.18)",
    cursor: "pointer",
    background: "rgba(99,102,241,0.95)",
    color: "rgba(255,255,255,0.95)",
    fontWeight: 900,
  },

  secondaryBtn: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    cursor: "pointer",
    background: "rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 900,
  },

  ghostBtn: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    cursor: "pointer",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.9)",
    fontWeight: 800,
  },

  footerNote: {
    marginTop: 10,
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
    padding: "0 2px",
  },
};
