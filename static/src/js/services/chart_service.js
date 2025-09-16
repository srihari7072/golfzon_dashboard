/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";

export class ChartService {
  constructor() {
    this.chartInstances = new Map();

    // Initialize Chart.js
    if (window.Chart && window.ChartDataLabels) {
      window.Chart.register(window.ChartDataLabels);
    }
  }

  destroyChart(chartId) {
    if (this.chartInstances.has(chartId)) {
      try {
        this.chartInstances.get(chartId).destroy();
      } catch (e) {
        console.warn("Chart destroy error:", e);
      }
      this.chartInstances.delete(chartId);
    }
  }

  destroyAllCharts() {
    this.chartInstances.forEach((c) => {
      try {
        c.destroy();
      } catch (_) {}
    });
    this.chartInstances.clear();
  }

  _validateCanvas(canvasEl, chartName) {
    if (!canvasEl || !canvasEl.getContext) {
      console.error(`Invalid canvas for ${chartName}`);
      return false;
    }
    return true;
  }

  _getStoredLocale() {
    try {
      const stored = localStorage.getItem("dashboard_lang");
      if (stored === "ko_KR") return "ko-KR";
    } catch (_) {}
    return "en-US";
  }

  _formatFullDate(d) {
    if (!(d instanceof Date)) return "";
    try {
      const locale = this._getStoredLocale();
      return d.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });
    } catch (_) {
      return "";
    }
  }

  // Helper function to get weather data for a specific date
  _getWeatherData(date) {
    // Sample weather data - replace with actual API call if needed
    const weatherOptions = [
      { condition: "Rain, 30mm", temp: "18°C / 25°C" },
      { condition: "Sunny", temp: "22°C / 28°C" },
      { condition: "Cloudy", temp: "16°C / 23°C" },
      { condition: "Clear", temp: "20°C / 26°C" },
    ];
    // Use date to generate consistent weather (in real app, this would be an API call)
    const weatherIndex = date.getDate() % weatherOptions.length;
    return weatherOptions[weatherIndex];
  }

  // Helper function to format sales amount
  _formatSalesAmount(value) {
    return `${(value * 10000).toLocaleString()} won`;
  }

  getDateLabels(period) {
    const today = new Date();
    const days = period === "7days" ? 7 : 30;
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      let label = `${date.getMonth() + 1}.${date.getDate()}`;
      if (i === 0) label += " (Today)";
      labels.push(label);
    }
    return labels;
  }

  _generateRandomData(n, min, max) {
    return Array.from(
      { length: n },
      () => Math.floor(Math.random() * (max - min + 1)) + min
    );
  }

  createSalesChart(canvasEl, period) {
    if (!this._validateCanvas(canvasEl, "Sales Trends")) return;

    const labels = this.getDateLabels(period);
    const days = period === "7days" ? 7 : 30;

    // Build an indexed Date[] perfectly aligned with labels
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));
    const dateIndex = Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

    const current = this._generateRandomData(labels.length, 200, 700);
    const lastYear = this._generateRandomData(labels.length, 150, 550);

    this.destroyChart("sales");

    const COLOR_PRIMARY = "#046DEC";
    const COLOR_SECONDARY = "#86E5F5";
    const GRID_COLOR = "#EEF3FA";
    const AXIS_COLOR = "#6f6f6f";

    try {
      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: _t("Sales"),
              data: current,
              backgroundColor: COLOR_PRIMARY,
              borderWidth: 0,
              barPercentage: 0.55,
              categoryPercentage: 0.6,
            },
            {
              label: _t("Last Year's Sales (Same Period)"),
              data: lastYear,
              backgroundColor: COLOR_SECONDARY,
              borderWidth: 0,
              barPercentage: 0.55,
              categoryPercentage: 0.6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { left: 8, right: 8, top: 8, bottom: 8 } },
          interaction: { mode: "nearest", intersect: true },
          scales: {
            x: {
              grid: { display: false, color: GRID_COLOR, drawBorder: false },
              ticks: {
                autoSkip: period === "30days" ? true : false,
                maxTicksLimit: period === "30days" ? 6 : 7,
                minRotation: 0,
                maxRotation: 0,
                color: AXIS_COLOR,
                font: { size: 12 },
                callback: function (value, index, ticks) {
                  if (index === 0 || index === ticks.length - 1) {
                    return this.getLabelForValue(value);
                  }
                  return "";
                },
              },
            },
            y: {
              beginAtZero: true,
              suggestedMax: 700,
              ticks: { stepSize: 100, color: AXIS_COLOR, font: { size: 12 } },
              grid: { color: GRID_COLOR, drawBorder: false },
            },
          },
          datasets: [
            {
              barThickness: 10,
              borderRadius: {
                topLeft: 5,
                topRight: 5,
              },
            },
          ],
          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: {
                usePointStyle: true,
                pointStyle: "circle",
                boxWidth: 6,
                boxHeight: 6,
                padding: 16,
                font: { size: 12, weight: "600" },
                color: "#1e1e1e",
              },
            },
            tooltip: {
              enabled: true,
              displayColors: false,
              backgroundColor: "#3C3F44",
              titleColor: "#fff",
              bodyColor: "#fff",
              padding: 12,
              cornerRadius: 8,
              caretSize: 6,
              titleFont: { size: 14, weight: "600" },
              bodyFont: { size: 13 },
              callbacks: {
                title: (items) => {
                  if (!items || !items[0]) return "";
                  const idx = items[0].dataIndex;
                  const d = dateIndex[idx];
                  return this._formatFullDate(d) || labels[idx] || "";
                },
                label: (ctx) => {
                  const isCurrentYear = ctx.datasetIndex === 0;
                  const value = ctx.raw ?? 0;
                  const formattedValue = this._formatSalesAmount(value);

                  if (isCurrentYear) {
                    // For current year: simple format
                    return `Sales: ${formattedValue}`;
                  } else {
                    // For last year: add weather and temperature
                    const idx = ctx.dataIndex;
                    const date = dateIndex[idx];
                    const weather = this._getWeatherData(date);
                    return [
                      `Sales: ${formattedValue}`,
                      `Weather: ${weather.condition}`,
                      `Temperature: ${weather.temp}`,
                    ];
                  }
                },
                afterLabel: (ctx) => {
                  // Return empty string to avoid extra spacing
                  return "";
                },
              },
            },
          },
          animation: { duration: 300, easing: "easeOutQuart" },
        },
      });

      this.chartInstances.set("sales", chart);
      return chart;
    } catch (e) {
      console.error("Error creating Sales Trends chart:", e);
    }
  }

  createVisitorChart(canvasEl, period) {
    if (!this._validateCanvas(canvasEl, "Visitor Chart")) return;

    const labels = this.getDateLabels(period);
    const days = period === "7days" ? 7 : 30;

    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));
    const dateIndex = Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

    const visitorData = this._generateRandomData(labels.length, 200, 600);
    const lastYearData = this._generateRandomData(labels.length, 100, 400);

    this.destroyChart("visitor");

    try {
      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: _t("Number of Guests"),
              data: visitorData,
              borderColor: "#046DEC",
              backgroundColor: "rgba(33, 150, 243, 0.1)",
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointStyle: "circle", // Ensure point style is applied to data points
            },
            {
              label: _t("Number of Guests (Same period last year)"),
              data: lastYearData,
              borderColor: "#86E5F5",
              backgroundColor: "transparent",
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 0,
              pointStyle: "circle", // Ensure point style is applied to data points
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "nearest", intersect: false },
          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: {
                usePointStyle: true,
                pointStyle: "circle",
                boxWidth: 6,
                boxHeight: 6,
                padding: 16,
                font: { size: 12, weight: "600" },
                color: "#1e1e1e",
                generateLabels: function (chart) {
                  const data = chart.data;
                  if (data.datasets.length) {
                    return data.datasets.map((dataset, i) => ({
                      text: dataset.label,
                      fillStyle: dataset.borderColor,
                      strokeStyle: dataset.borderColor,
                      lineWidth: 1,
                      pointStyle: "circle",
                      hidden: !chart.isDatasetVisible(i),
                      datasetIndex: i,
                    }));
                  }
                  return [];
                },
              },
            },
            tooltip: {
              enabled: true,
              displayColors: false,
              backgroundColor: "#3C3F44",
              titleColor: "#fff",
              bodyColor: "#fff",
              padding: 12,
              cornerRadius: 8,
              caretSize: 6,
              titleFont: { size: 14, weight: "600" },
              bodyFont: { size: 13 },
              callbacks: {
                title: (items) => {
                  if (!items || !items[0]) return "";
                  const idx = items[0].dataIndex;
                  const d = dateIndex[idx];
                  return this._formatFullDate(d) || labels[idx] || "";
                },
                label: (ctx) => {
                  const value = ctx.raw ?? 0;
                  const isCurrentYear = ctx.datasetIndex === 0;
                  if (isCurrentYear) {
                    return `Visitors: ${value.toLocaleString()}`;
                  } else {
                    const idx = ctx.dataIndex;
                    const date = dateIndex[idx];
                    const weather = this._getWeatherData(date);
                    return [
                      `Visitors: ${value.toLocaleString()}`,
                      `Weather: ${weather.condition}`,
                      `Temperature: ${weather.temp}`,
                    ];
                  }
                },
              },
            },
          },
          scales: {
            x: {
              ticks: {
                callback: function (value, index, ticks) {
                  if (index === 0 || index === ticks.length - 1) {
                    return this.getLabelForValue(value);
                  }
                  return "";
                },
                font: { size: 12 },
              },
              grid: { display: false },
            },
            y: {
              beginAtZero: true,
              max: 700,
              ticks: { stepSize: 100 },
              grid: { color: "#e0e0e0" },
            },
          },
        },
      });

      this.chartInstances.set("visitor", chart);
      return chart;
    } catch (e) {
      console.error("Error creating Visitor chart:", e);
    }
  }

  createReservationChart(canvasEl, period) {
    if (!this._validateCanvas(canvasEl, "Reservation Chart")) return;

    const labels = this.getDateLabels(period);
    const days = period === "7days" ? 7 : 30;

    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));
    const dateIndex = Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

    const currentYearData = this._generateRandomData(labels.length, 40, 100);
    const lastYearData = this._generateRandomData(labels.length, 30, 80);

    this.destroyChart("reservation");

    try {
      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: _t("Reservations"),
              data: currentYearData,
              borderColor: "#046DEC",
              backgroundColor: "rgba(33, 150, 243, 0.1)",
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointStyle: "circle", // Ensure point style is applied to data points
            },
            {
              label: _t("Reservations (Same period last year)"),
              data: lastYearData,
              borderColor: "#86E5F5",
              backgroundColor: "transparent",
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 4,
              pointStyle: "circle", // Ensure point style is applied to data points
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "nearest", intersect: false },
          scales: {
            y: {
              beginAtZero: true,
              max: 120,
              ticks: { stepSize: 20 },
              grid: { color: "#e0e0e0" },
            },
            x: {
              ticks: {
                callback: function (value, index, ticks) {
                  if (index === 0 || index === ticks.length - 1) {
                    return this.getLabelForValue(value);
                  }
                  return "";
                },
                font: { size: 12 },
              },
              grid: { display: false },
            },
          },
          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: {
                usePointStyle: true,
                pointStyle: "circle",
                boxWidth: 6,
                boxHeight: 6,
                padding: 16,
                font: { size: 12, weight: "600" },
                color: "#1e1e1e",
                generateLabels: function (chart) {
                  const data = chart.data;
                  if (data.datasets.length) {
                    return data.datasets.map((dataset, i) => ({
                      text: dataset.label,
                      fillStyle: dataset.borderColor,
                      strokeStyle: dataset.borderColor,
                      lineWidth: 1,
                      pointStyle: "circle",
                      hidden: !chart.isDatasetVisible(i),
                      datasetIndex: i,
                    }));
                  }
                  return [];
                },
              },
            },
            tooltip: {
              enabled: true,
              displayColors: false,
              backgroundColor: "#3C3F44",
              titleColor: "#fff",
              bodyColor: "#fff",
              padding: 12,
              cornerRadius: 8,
              caretSize: 6,
              titleFont: { size: 14, weight: "600" },
              bodyFont: { size: 13 },
              callbacks: {
                title: (items) => {
                  if (!items || !items[0]) return "";
                  const idx = items[0].dataIndex;
                  const d = dateIndex[idx];
                  return this._formatFullDate(d) || labels[idx] || "";
                },
                label: (ctx) => {
                  const value = ctx.parsed.y;
                  const isCurrentYear = ctx.datasetIndex === 0;
                  if (isCurrentYear) {
                    return `Reservations: ${value}`;
                  } else {
                    const idx = ctx.dataIndex;
                    const date = dateIndex[idx];
                    const weather = this._getWeatherData(date);
                    return [
                      `Reservations: ${value}`,
                      `Weather: ${weather.condition}`,
                      `Temperature: ${weather.temp}`,
                    ];
                  }
                },
              },
            },
          },
        },
      });

      this.chartInstances.set("reservation", chart);
      return chart;
    } catch (e) {
      console.error("Error creating reservation chart:", e);
    }
  }

  createAgeChart(canvasEl) {
    if (!this._validateCanvas(canvasEl, "Age Chart")) return;

    this.destroyChart("age");

    try {
      const MAX = 60;
      const labels = ["60+ years", "50s", "40s", "30s", "20s", "Under 10"];
      const values = [22, 27, 20, 20, 9, 2];

      const barTrackPlugin = {
        id: "barTrack",
        beforeDatasetsDraw(chart) {
          const { ctx, scales } = chart;
          const x = scales.x;
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data) return;

          const trackColor = "#EEF3FA";
          const radius = 12;
          const x0 = x.getPixelForValue(0);
          const xMax = x.getPixelForValue(MAX);

          ctx.save();
          ctx.fillStyle = trackColor;

          meta.data.forEach((bar) => {
            const h = bar.height;
            const top = bar.y - h / 2;
            const width = xMax - x0;
            const r = Math.min(radius, h / 2, width / 2);
            ctx.beginPath();
            ctx.moveTo(x0 + r, top);
            ctx.lineTo(x0 + width - r, top);
            ctx.quadraticCurveTo(x0 + width, top, x0 + width, top + r);
            ctx.lineTo(x0 + width, top + h - r);
            ctx.quadraticCurveTo(x0 + width, top + h, x0 + width - r, top + h);
            ctx.lineTo(x0 + r, top + h);
            ctx.quadraticCurveTo(x0, top + h, x0, top + h - r);
            ctx.lineTo(x0, top + r);
            ctx.quadraticCurveTo(x0, top, x0 + r, top);
            ctx.closePath();
            ctx.fill();
          });

          ctx.restore();
        },
      };

      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: _t("Visitor Ratio"),
              data: values,
              backgroundColor: [
                "#4489DA",
                "#1958A4",
                "#4C9CFD",
                "#4C9CFD",
                "#3A96D4",
                "#5AB4F0",
              ],
              borderRadius: 15,
              barThickness: 25,
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              backgroundColor: "#3C3F44",
              titleColor: "#fff",
              bodyColor: "#fff",
              cornerRadius: 8,
              padding: 12,
              displayColors: false,
              callbacks: {
                title: () => "",
                label: (ctx) => `${ctx.label}: ${ctx.parsed.x}%`,
              },
            },
            barTrack: { color: "#EEF3FA", radius: 12 },
          },
          scales: {
            x: {
              min: 0,
              max: MAX,
              ticks: { display: false },
              grid: { display: false },
              border: { display: false },
            },
            y: {
              ticks: { color: "#6f6f6f", font: { size: 14, weight: "600" } },
              grid: { display: false },
              border: { display: false },
            },
          },
        },
        plugins: [barTrackPlugin],
      });

      this.chartInstances.set("age", chart);
      return chart;
    } catch (e) {
      console.error("Error creating age chart:", e);
    }
  }

  createPieChart(canvasEl, chartId, data, colors) {
    if (!this._validateCanvas(canvasEl, `Pie Chart ${chartId}`)) return;

    this.destroyChart(chartId);

    try {
      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "doughnut",
        data: {
          datasets: [
            {
              data,
              backgroundColor: colors,
              borderWidth: 0,
              cutout: "40%",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          aspectRatio: 1, // Force square aspect ratio
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              backgroundColor: "#3C3F44",
              titleColor: "#fff",
              bodyColor: "#fff",
              cornerRadius: 8,
              padding: 12,
              displayColors: false,
            },
          },
          layout: {
            padding: 0,
          },
        },
      });

      this.chartInstances.set(chartId, chart);
      return chart;
    } catch (e) {
      console.error(`Error creating pie chart ${chartId}:`, e);
    }
  }

  initializeGenderAnimation() {
    function setGenderPercent(male, female) {
      const maleFill = document.getElementById("maleFill");
      const femaleFill = document.getElementById("femaleFill");

      if (maleFill && femaleFill) {
        const maxHeight : 400; // SVG viewBox height
        maleFill.setAttribute("y", maxHeight - (maxHeight * male) / 100);
        maleFill.setAttribute("height", (maxHeight * male) / 100);
        femaleFill.setAttribute("y", maxHeight - (maxHeight * female) / 100);
        femaleFill.setAttribute("height", (maxHeight * female) / 100);

        const malePercent = document.getElementById("malePercent");
        const femalePercent = document.getElementById("femalePercent");
        if (malePercent) malePercent.textContent = male + "%";
        if (femalePercent) femalePercent.textContent = female + "%";
      } else {
        console.warn("Gender animation elements not found");
      }
    }
    setTimeout(() => setGenderPercent(62, 38), 100);
  }
}
