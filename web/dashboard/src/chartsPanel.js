/**
 * chartsPanel.js — the dashboard's "Gráficas" panel.
 *
 * This is a PRESENTATION module: it renders a set of ECharts visualizations
 * from the LIVE guest data (per-group invitation + RSVP breakdown, attendance
 * by day, RSVP level distribution, and identity readiness). It contains no
 * Firestore access and no business rules — all data is injected by the
 * dashboard adapter (`renderChartsPanel` in dashboard.js).
 *
 * ECharts is imported modularly (only the chart types + components we use) to
 * keep the bundle lean.
 */

import * as echarts from "echarts/core";
import { BarChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
]);

/** The dashboard's "sharp & airy" palette (matches _tokens.scss). */
const PALETTE = ["#8a5a44", "#c98a5e", "#e0b48c", "#6b8f71", "#a3b18a", "#5b7a9d", "#9a8fb0", "#d9a5a0"];

/** A small helper to build a chart container div. */
function chartContainer(id, height = "320px") {
  return `<div class="dashboard-chart" id="${id}" style="height:${height}"></div>`;
}

/**
 * Render the charts panel into `[data-charts-panel]`.
 *
 * @param {object} data - injected live data:
 *   - `groupInvitation`   { [group]: { total, notSent, sentByLevel: [6] } }
 *   - `dayConfirmations`  { friday, saturday, sunday } counts (confirmed ≥ 4)
 *   - `dayDistributions`  { friday, saturday, sunday } arrays of level counts
 *   - `readiness`         { total, ready, missingName, missingPhoto, missingContact }
 *   - `groups`            array of group names
 */
export function renderChartsPanel(data) {
  const root = document.querySelector("[data-charts-panel]");
  if (!root) return;

  const {
    groupInvitation = {},
    dayConfirmations = { friday: 0, saturday: 0, sunday: 0 },
    dayDistributions = { friday: [], saturday: [], sunday: [] },
    readiness = { total: 0, ready: 0, missingName: 0, missingPhoto: 0, missingContact: 0 },
    groups = [],
  } = data;

  const DAY_LABELS = ["Viernes", "Sábado", "Domingo"];
  const dayKeys = ["friday", "saturday", "sunday"];

  root.innerHTML = `
    <div class="dashboard-charts-grid">
      <div class="dashboard-chart-card">
        <h3 class="dashboard-chart-title">Invitación y respuesta por grupo</h3>
        ${chartContainer("chart-groups", "380px")}
      </div>
      <div class="dashboard-chart-card">
        <h3 class="dashboard-chart-title">Confirmados por día</h3>
        ${chartContainer("chart-attendance")}
      </div>
      <div class="dashboard-chart-card">
        <h3 class="dashboard-chart-title">Nivel de asistencia</h3>
        ${chartContainer("chart-levels")}
      </div>
      <div class="dashboard-chart-card">
        <h3 class="dashboard-chart-title">Identidad de invitados</h3>
        ${chartContainer("chart-readiness")}
      </div>
    </div>
  `;

  // ── 1. Invitation + RSVP response per group (stacked horizontal bar) ──
  // Each bar = the group's TOTAL guest count. It is split into:
  //   - "No enviada"  (one color) = guests whose invitation has NOT been sent.
  //   - "Enviada"     (subdivided into 6 segments) = guests whose invitation
  //     HAS been sent, bucketed by their RSVP level (0 = no answer, 5 = fully
  //     confirmed). The RSVP level used is the guest's SATURDAY answer.
  const groupNames = groups.length ? groups : Object.keys(groupInvitation);
  const LEVEL_LABELS = ["Sin respuesta", "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4", "Nivel 5"];

  // Colors: "No enviada" is a muted gray; the 6 sent levels go from amber
  // (low) to green (confirmed).
  const NOT_SENT_COLOR = "#c9c2b4";
  const SENT_LEVEL_COLORS = ["#e8dcc8", "#e0b48c", "#d9a05f", "#c98a5e", "#8a5a44", "#6b8f71"];

  const groupChart = echarts.init(document.getElementById("chart-groups"));
  groupChart.setOption({
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter(params) {
        const group = params[0]?.name || "";
        const entry = groupInvitation[group] || { total: 0, notSent: 0, sentByLevel: [0, 0, 0, 0, 0, 0] };
        const lines = [`<strong>${group}</strong> — ${entry.total} invitados`];
        params.forEach((p) => {
          if (p.value > 0) lines.push(`${p.marker} ${p.seriesName}: ${p.value}`);
        });
        return lines.join("<br/>");
      },
    },
    legend: {
      bottom: 0,
      textStyle: { color: "#6b5d4f" },
      data: ["No enviada", ...LEVEL_LABELS],
    },
    grid: { left: 90, right: 30, top: 20, bottom: 60 },
    xAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: "#6b5d4f" },
      splitLine: { lineStyle: { color: "#efe6d8" } },
    },
    yAxis: {
      type: "category",
      data: groupNames,
      axisLabel: { color: "#6b5d4f" },
      axisLine: { lineStyle: { color: "#d8cbb8" } },
    },
    series: [
      {
        name: "No enviada",
        type: "bar",
        stack: "total",
        data: groupNames.map((g) => (groupInvitation[g] || {}).notSent || 0),
        itemStyle: { color: NOT_SENT_COLOR },
        barWidth: "55%",
      },
      ...LEVEL_LABELS.map((label, i) => ({
        name: label,
        type: "bar",
        stack: "total",
        data: groupNames.map((g) => (groupInvitation[g] || {}).sentByLevel?.[i] || 0),
        itemStyle: { color: SENT_LEVEL_COLORS[i] },
      })),
    ],
  });

  // ── 2. Attendance by day (bar) ──
  const attendanceChart = echarts.init(document.getElementById("chart-attendance"));
  attendanceChart.setOption({
    color: PALETTE,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: "category",
      data: DAY_LABELS,
      axisLabel: { color: "#6b5d4f" },
      axisLine: { lineStyle: { color: "#d8cbb8" } },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: "#6b5d4f" },
      splitLine: { lineStyle: { color: "#efe6d8" } },
    },
    series: [
      {
        name: "Confirmados",
        type: "bar",
        data: dayKeys.map((k) => dayConfirmations[k] || 0),
        barWidth: "45%",
        itemStyle: { borderRadius: [6, 6, 0, 0] },
      },
    ],
  });

  // ── 3. RSVP level distribution (donut) ──
  // Aggregate the level counts across all three days into a single distribution.
  const levelTotals = [0, 0, 0, 0, 0];
  dayKeys.forEach((k) => {
    (dayDistributions[k] || []).forEach((count, i) => {
      if (i < levelTotals.length) levelTotals[i] += count || 0;
    });
  });
  const levelChart = echarts.init(document.getElementById("chart-levels"));
  levelChart.setOption({
    color: PALETTE,
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, textStyle: { color: "#6b5d4f" } },
    series: [
      {
        name: "Nivel",
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
        label: { show: false },
        data: ["No", "Poco", "Quizá", "Probable", "Sí"].map((label, i) => ({
          name: label,
          value: levelTotals[i],
        })),
      },
    ],
  });

  // ── 4. Identity readiness (donut) ──
  const ready = readiness.ready || 0;
  const notReady = Math.max(0, (readiness.total || 0) - ready);
  const readinessChart = echarts.init(document.getElementById("chart-readiness"));
  readinessChart.setOption({
    color: ["#6b8f71", "#e0b48c"],
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, textStyle: { color: "#6b5d4f" } },
    series: [
      {
        name: "Identidad",
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "45%"],
        itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
        label: { show: false },
        data: [
          { name: "Completos", value: ready },
          { name: "Por completar", value: notReady },
        ],
      },
    ],
  });

  // Resize charts when the window resizes.
  const onResize = () => {
    groupChart.resize();
    attendanceChart.resize();
    levelChart.resize();
    readinessChart.resize();
  };
  window.addEventListener("resize", onResize);

  // Dispose charts when the panel is removed (best-effort; the dashboard is SPA).
  const observer = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      groupChart.dispose();
      attendanceChart.dispose();
      levelChart.dispose();
      readinessChart.dispose();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
