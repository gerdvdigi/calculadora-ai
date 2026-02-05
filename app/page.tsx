"use client";

import React, { useMemo, useState } from "react";

type PriceRow = {
  model: string;
  inputPer1M: number; // USD per 1M input tokens
  outputPer1M?: number; // USD per 1M output tokens (optional for embeddings)
  kind: "openai" | "cohere-embed";
};

function toNum(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatUSD(n: number): string {
  // Keep it readable for small numbers
  if (!Number.isFinite(n)) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function costLLM(params: {
  inputTokens: number;
  outputTokens: number;
  inputPer1M: number;
  outputPer1M: number;
}): number {
  const { inputTokens, outputTokens, inputPer1M, outputPer1M } = params;
  return (inputTokens / 1_000_000) * inputPer1M + (outputTokens / 1_000_000) * outputPer1M;
}

function costEmbeddings(params: { embedTokens: number; inputPer1M: number }): number {
  const { embedTokens, inputPer1M } = params;
  return (embedTokens / 1_000_000) * inputPer1M;
}

export default function Page() {
  // Defaults = tu consumo promedio
  const [openAIInputTokens, setOpenAIInputTokens] = useState<number>(31085);
  const [openAIOutputTokens, setOpenAIOutputTokens] = useState<number>(1407);
  const [cohereEmbedTokens, setCohereEmbedTokens] = useState<number>(96);
  const [requestsPerMonth, setRequestsPerMonth] = useState<number>(10000);

  // Default price tables (podés editarlas en UI)
  const [prices, setPrices] = useState<PriceRow[]>([
    // OpenAI
    { kind: "openai", model: "gpt-4o-mini", inputPer1M: 0.3, outputPer1M: 1.2 },
    { kind: "openai", model: "gpt-4.1-nano", inputPer1M: 0.2, outputPer1M: 0.8 },
    { kind: "openai", model: "gpt-4.1-mini", inputPer1M: 0.8, outputPer1M: 3.2 },
    { kind: "openai", model: "gpt-4.1", inputPer1M: 3.0, outputPer1M: 12.0 },
    { kind: "openai", model: "gpt-4o", inputPer1M: 3.75, outputPer1M: 15.0 },

    // Cohere embeddings
    { kind: "cohere-embed", model: "embed-english-v3.0", inputPer1M: 0.1 },
  ]);

  const openAIModels = useMemo(
    () => prices.filter((p) => p.kind === "openai" && typeof p.outputPer1M === "number"),
    [prices]
  );
  const cohereEmbedModels = useMemo(
    () => prices.filter((p) => p.kind === "cohere-embed"),
    [prices]
  );

  const [selectedOpenAIModel, setSelectedOpenAIModel] = useState<string>("gpt-4o-mini");
  const [selectedCohereEmbedModel, setSelectedCohereEmbedModel] = useState<string>("embed-english-v3.0");

  const selectedOpenAI = useMemo(() => {
    return openAIModels.find((m) => m.model === selectedOpenAIModel) ?? openAIModels[0];
  }, [openAIModels, selectedOpenAIModel]);

  const selectedEmbed = useMemo(() => {
    return cohereEmbedModels.find((m) => m.model === selectedCohereEmbedModel) ?? cohereEmbedModels[0];
  }, [cohereEmbedModels, selectedCohereEmbedModel]);

  const openAICostPerRun = useMemo(() => {
    if (!selectedOpenAI || selectedOpenAI.outputPer1M == null) return 0;
    return costLLM({
      inputTokens: openAIInputTokens,
      outputTokens: openAIOutputTokens,
      inputPer1M: selectedOpenAI.inputPer1M,
      outputPer1M: selectedOpenAI.outputPer1M,
    });
  }, [openAIInputTokens, openAIOutputTokens, selectedOpenAI]);

  const embedCostPerRun = useMemo(() => {
    if (!selectedEmbed) return 0;
    return costEmbeddings({
      embedTokens: cohereEmbedTokens,
      inputPer1M: selectedEmbed.inputPer1M,
    });
  }, [cohereEmbedTokens, selectedEmbed]);

  const totalPerRun = openAICostPerRun + embedCostPerRun;
  const monthlyCost = totalPerRun * requestsPerMonth;

  function updatePriceRow(index: number, patch: Partial<PriceRow>) {
    setPrices((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow(kind: PriceRow["kind"]) {
    setPrices((prev) => [
      ...prev,
      kind === "openai"
        ? { kind, model: "new-openai-model", inputPer1M: 0, outputPer1M: 0 }
        : { kind, model: "new-embed-model", inputPer1M: 0 },
    ]);
  }

  function removeRow(index: number) {
    setPrices((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <main style={{ maxWidth: 1050, margin: "0 auto", padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>AI Cost Calculator (OpenAI + Cohere)</h1>
      <p style={{ marginTop: 0, color: "#4b5563" }}>
        Fórmula: costo = (input_tokens/1M × $/1M input) + (output_tokens/1M × $/1M output)
      </p>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 650, marginTop: 0 }}>Inputs</h2>

          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>OpenAI model</span>
              <select
                value={selectedOpenAIModel}
                onChange={(e) => setSelectedOpenAIModel(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              >
                {openAIModels.map((m) => (
                  <option key={m.model} value={m.model}>
                    {m.model}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>OpenAI input tokens (prompt)</span>
              <input
                value={openAIInputTokens}
                onChange={(e) => setOpenAIInputTokens(toNum(e.target.value))}
                type="number"
                min={0}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>OpenAI output tokens (completion)</span>
              <input
                value={openAIOutputTokens}
                onChange={(e) => setOpenAIOutputTokens(toNum(e.target.value))}
                type="number"
                min={0}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
            </label>

            <hr style={{ border: 0, borderTop: "1px solid #e5e7eb" }} />

            <label style={{ display: "grid", gap: 6 }}>
              <span>Cohere embeddings model</span>
              <select
                value={selectedCohereEmbedModel}
                onChange={(e) => setSelectedCohereEmbedModel(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              >
                {cohereEmbedModels.map((m) => (
                  <option key={m.model} value={m.model}>
                    {m.model}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Cohere embed tokens</span>
              <input
                value={cohereEmbedTokens}
                onChange={(e) => setCohereEmbedTokens(toNum(e.target.value))}
                type="number"
                min={0}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
            </label>

            <hr style={{ border: 0, borderTop: "1px solid #e5e7eb" }} />

            <label style={{ display: "grid", gap: 6 }}>
              <span>Requests per month</span>
              <input
                value={requestsPerMonth}
                onChange={(e) => setRequestsPerMonth(toNum(e.target.value))}
                type="number"
                min={0}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
            </label>
          </div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 650, marginTop: 0 }}>Outputs</h2>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 12, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <div style={{ color: "#374151", fontSize: 13 }}>OpenAI cost per run</div>
              <div style={{ fontSize: 22, fontWeight: 750, color: "#111827" }}>{formatUSD(openAICostPerRun)}</div>
              {selectedOpenAI?.outputPer1M != null && (
                <div style={{ color: "#4b5563", fontSize: 12, marginTop: 6 }}>
                  Pricing: in {selectedOpenAI.inputPer1M}/1M · out {selectedOpenAI.outputPer1M}/1M
                </div>
              )}
            </div>

            <div style={{ padding: 14, borderRadius: 12, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <div style={{ color: "#374151", fontSize: 13 }}>Cohere embeddings cost per run</div>
              <div style={{ fontSize: 22, fontWeight: 750, color: "#111827" }}>{formatUSD(embedCostPerRun)}</div>
              {selectedEmbed && (
                <div style={{ color: "#4b5563", fontSize: 12, marginTop: 6 }}>
                  Pricing: in {selectedEmbed.inputPer1M}/1M
                </div>
              )}
            </div>

            <div style={{ padding: 14, borderRadius: 12, background: "#ffffff", border: "1px solid #e5e7eb" }}>
              <div style={{ color: "#374151", fontSize: 13 }}>Total cost per run</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>{formatUSD(totalPerRun)}</div>
            </div>

            <div style={{ padding: 14, borderRadius: 12, background: "#ffffff", border: "1px solid #e5e7eb" }}>
              <div style={{ color: "#374151", fontSize: 13 }}>Monthly cost</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>{formatUSD(monthlyCost)}</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 22, border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 650, margin: 0 }}>Price tables (editable)</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => addRow("openai")}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#111827" }}
            >
              + OpenAI row
            </button>
            <button
              onClick={() => addRow("cohere-embed")}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#111827" }}
            >
              + Cohere embed row
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h3 style={{ margin: "0 0 10px 0" }}>OpenAI</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: 8 }}>Model</th>
                  <th style={{ padding: 8 }}>$ / 1M Input</th>
                  <th style={{ padding: 8 }}>$ / 1M Output</th>
                  <th style={{ padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {prices.map((row, idx) => {
                  if (row.kind !== "openai") return null;
                  return (
                    <tr key={`${row.kind}-${idx}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 8 }}>
                        <input
                          value={row.model}
                          onChange={(e) => updatePriceRow(idx, { model: e.target.value })}
                          style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #d1d5db" }}
                        />
                      </td>
                      <td style={{ padding: 8 }}>
                        <input
                          value={row.inputPer1M}
                          onChange={(e) => updatePriceRow(idx, { inputPer1M: toNum(e.target.value) })}
                          type="number"
                          step="0.01"
                          min={0}
                          style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #d1d5db" }}
                        />
                      </td>
                      <td style={{ padding: 8 }}>
                        <input
                          value={row.outputPer1M ?? 0}
                          onChange={(e) => updatePriceRow(idx, { outputPer1M: toNum(e.target.value) })}
                          type="number"
                          step="0.01"
                          min={0}
                          style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #d1d5db" }}
                        />
                      </td>
                      <td style={{ padding: 8, width: 1, whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => removeRow(idx)}
                          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#111827" }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px 0" }}>Cohere embeddings</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: 8 }}>Model</th>
                  <th style={{ padding: 8 }}>$ / 1M Input</th>
                  <th style={{ padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {prices.map((row, idx) => {
                  if (row.kind !== "cohere-embed") return null;
                  return (
                    <tr key={`${row.kind}-${idx}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 8 }}>
                        <input
                          value={row.model}
                          onChange={(e) => updatePriceRow(idx, { model: e.target.value })}
                          style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #d1d5db" }}
                        />
                      </td>
                      <td style={{ padding: 8 }}>
                        <input
                          value={row.inputPer1M}
                          onChange={(e) => updatePriceRow(idx, { inputPer1M: toNum(e.target.value) })}
                          type="number"
                          step="0.01"
                          min={0}
                          style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #d1d5db" }}
                        />
                      </td>
                      <td style={{ padding: 8, width: 1, whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => removeRow(idx)}
                          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#111827" }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ marginTop: 12, color: "#4b5563", fontSize: 13 }}>
              Tip: si querés que esto quede “persistente”, lo guardamos en <code>localStorage</code> en 10 líneas.
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
