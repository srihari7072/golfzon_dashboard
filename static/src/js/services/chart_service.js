/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";

export class ChartService {
  constructor() {
    this.chartInstances = new Map();

    // Initialize Chart.js
    if (window.Chart && window.ChartDataLabels) {
      Chart.register(window.ChartDataLabels);
    }
  }

  destroyChart(chartId) {
    if (this.chartInstances.has(chartId)) {
      this.chartInstances.get(chartId).destroy();
      this.chartInstances.delete(chartId);
    }
  }

  destroyAllCharts() {
    this.chartInstances.forEach((chart) => chart.destroy());
    this.chartInstances.clear();
  }

  // Helper method to validate canvas
  validateCanvas(canvasEl, chartName) {
    if (!canvasEl) {
      console.error(`Canvas element is null for ${chartName}`);
      return false;
    }

    if (!canvasEl.getContext) {
      console.error(`Element is not a canvas for ${chartName}`);
      return false;
    }

    if (canvasEl.clientWidth === 0 || canvasEl.clientHeight === 0) {
      console.warn(
        `Canvas has zero dimensions for ${chartName}:`,
        canvasEl.clientWidth,
        "x",
        canvasEl.clientHeight
      );
      // Set minimum dimensions
      canvasEl.style.minWidth = "400px";
      canvasEl.style.minHeight = "300px";
    }

    return true;
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

  generateRandomData(length, min, max) {
    return Array.from(
      { length },
      () => Math.floor(Math.random() * (max - min + 1)) + min
    );
  }

  createSalesChart(canvasEl, period) {
    if (!this.validateCanvas(canvasEl, "Sales Chart")) return;

    const labels = this.getDateLabels(period);
    const salesData = this.generateRandomData(labels.length, 300, 700);
    const lastYearData = this.generateRandomData(labels.length, 200, 500);

    this.destroyChart("sales");

    try {
      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: _t("Sales"),
              data: salesData,
              backgroundColor: "rgba(4, 109, 236, 1)",
              borderRadius: {
                topLeft: 12,
                topRight: 12,
                bottomLeft: 0,
                bottomRight: 0,
              },
              borderSkipped: "bottom",
              barPercentage: 0.65,
              categoryPercentage: 0.5,
            },
            {
              label: _t("Last Year's Sales (Same Period)"),
              data: lastYearData,
              backgroundColor: "rgba(134, 229, 245, 1)",
              borderRadius: {
                topLeft: 12,
                topRight: 12,
                bottomLeft: 0,
                bottomRight: 0,
              },
              borderSkipped: "bottom",
              barPercentage: 0.65,
              categoryPercentage: 0.5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: { enabled: true },
            legend: {
              display: true,
              position: "bottom",
              labels: {
                usePointStyle: true,
                pointStyle: "circle",
                boxWidth: 4,
                boxHeight: 4,
                padding: 15,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                callback: function (value, index, ticks) {
                  if (index === 0 || index === ticks.length - 1) {
                    return this.getLabelForValue(value);
                  }
                  return "";
                },
                font: { size: 12 },
              },
            },
            y: {
              grid: { display: true, drawBorder: false, color: "#EFEFEF" },
              beginAtZero: true,
              max: 700,
              ticks: { stepSize: 100 },
            },
          },
        },
      });

      this.chartInstances.set("sales", chart);
      console.log("Sales chart created successfully");
      return chart;
    } catch (error) {
      console.error("Error creating sales chart:", error);
    }
  }

  createVisitorChart(canvasEl, period) {
    if (!this.validateCanvas(canvasEl, "Visitor Chart")) return;

    const labels = this.getDateLabels(period);
    const visitorData = this.generateRandomData(labels.length, 200, 600);
    const lastYearData = this.generateRandomData(labels.length, 100, 400);

    this.destroyChart("visitor");

    try {
      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: _t("2025 Visitors"),
              data: visitorData,
              borderColor: "#046DEC",
              backgroundColor: "transparent",
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 0,
              pointBackgroundColor: "white",
              pointBorderColor: "#046DEC",
              pointBorderWidth: 2,
            },
            {
              label: _t("2024 Visitors"),
              data: lastYearData,
              borderColor: "#86E5F5",
              backgroundColor: "transparent",
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 0,
              pointBackgroundColor: "white",
              pointBorderColor: "#86E5F5",
              pointBorderWidth: 2,
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
                boxWidth: 4,
                boxHeight: 4,
                padding: 16,
              },
            },
            tooltip: {
              enabled: true,
              position: "nearest",
              yAlign: "bottom",
              displayColors: false,
              callbacks: {
                label: function (context) {
                  return _t("Visitors") + ": " + context.raw.toLocaleString();
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
              min: 0,
              max: 700,
              ticks: { stepSize: 100 },
              grid: { color: "#e0e0e0" },
            },
          },
        },
      });

      this.chartInstances.set("visitor", chart);
      console.log("Visitor chart created successfully");
      return chart;
    } catch (error) {
      console.error("Error creating visitor chart:", error);
    }
  }

  createReservationChart(canvasEl, period) {
    if (!this.validateCanvas(canvasEl, "Reservation Chart")) return;

    const labels = this.getDateLabels(period);
    const currentYearData = this.generateRandomData(labels.length, 40, 100);
    const lastYearData = this.generateRandomData(labels.length, 30, 80);

    this.destroyChart("reservation");

    try {
      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: _t("Reservations"),
              data: currentYearData,
              borderColor: "#2196f3",
              backgroundColor: "rgba(33, 150, 243, 0.1)",
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 8,
              pointBackgroundColor: "#2196f3",
            },
            {
              label: _t("Reservations (Same period last year)"),
              data: lastYearData,
              borderColor: "#81d4fa",
              backgroundColor: "transparent",
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 8,
              pointBackgroundColor: "#81d4fa",
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
                padding: 20,
              },
            },
            tooltip: {
              enabled: true,
              mode: "nearest",
              intersect: false,
              callbacks: {
                label: function (context) {
                  return `Reservations: ${context.parsed.y}`;
                },
              },
              titleFont: { size: 12, weight: "bold" },
              bodyFont: { size: 11 },
              padding: 12,
              backgroundColor: "rgba(0,0,0,0.8)",
              borderColor: "#2196f3",
              borderWidth: 1,
            },
          },
        },
      });

      this.chartInstances.set("reservation", chart);
      console.log("Reservation chart created successfully");
      return chart;
    } catch (error) {
      console.error("Error creating reservation chart:", error);
    }
  }

  createAgeChart(canvasEl) {
    if (!this.validateCanvas(canvasEl, "Age Chart")) return;

    this.destroyChart("age");

    try {
      // Values in percent; MAX controls the "full bar" length.
      const MAX = 30;
      const labels = ["60+ years", "50s", "40s", "30s", "20s", "Under 10"];
      const values = [22, 27, 20, 20, 9, 2];

      // Plugin draws a rounded, full-length background track behind each bar.
      const barTrackPlugin = {
        id: "barTrack",
        beforeDatasetsDraw(chart) {
          const { ctx, scales } = chart;
          const x = scales.x;
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data) return;

          const trackColor =
            (chart.options.plugins &&
              chart.options.plugins.barTrack &&
              chart.options.plugins.barTrack.color) ||
            "#EEF3FA";
          const radius =
            (chart.options.plugins &&
              chart.options.plugins.barTrack &&
              chart.options.plugins.barTrack.radius) ||
            12;

          const x0 = x.getPixelForValue(0);
          const xMax = x.getPixelForValue(MAX);

          ctx.save();
          ctx.fillStyle = trackColor;

          meta.data.forEach((bar) => {
            // bar.y is the center; bar.height is the rendered height
            const h = bar.height;
            const top = bar.y - h / 2;
            const width = xMax - x0;

            // rounded rectangle path
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
                "#4489DA", // 60+
                "#1958A4", // 50s
                "#4C9CFD", // 40s
                "#4C9CFD", // 30s
                "#3A96D4", // 20s
                "#5AB4F0", // under 10
              ],
              borderRadius: 15,
              barThickness: 25,
            },
          ],
        },
        options: {
          indexAxis: "y", // horizontal bars
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
            // options for the custom track plugin
            barTrack: {
              color: "#EEF3FA",
              radius: 12,
            },
          },
          // Remove gridlines, borders, ticks from x-axis; keep only y labels
          scales: {
            x: {
              min: 0,
              max: MAX,
              ticks: { display: false }, // no % labels
              grid: { display: false }, // no gridlines
              border: { display: false }, // no axis/baseline
            },
            y: {
              ticks: {
                color: "#6f6f6f", // keep age labels
                font: { size: 14, weight: "600" },
              },
              grid: { display: false }, // remove boxes/lines
              border: { display: false }, // remove axis line
            },
          },
        },
        plugins: [barTrackPlugin],
      });

      this.chartInstances.set("age", chart);
      console.log("Age chart created successfully");
      return chart;
    } catch (error) {
      console.error("Error creating age chart:", error);
    }
  }

  createPieChart(canvasEl, chartId, data, colors) {
    if (!this.validateCanvas(canvasEl, `Pie Chart ${chartId}`)) return;

    this.destroyChart(chartId);

    try {
      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "doughnut",
        data: {
          datasets: [
            {
              data: data,
              backgroundColor: colors,
              borderWidth: 0,
              cutout: "60%",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });

      this.chartInstances.set(chartId, chart);
      console.log(`Pie chart created successfully: ${chartId}`);
      return chart;
    } catch (error) {
      console.error(`Error creating pie chart ${chartId}:`, error);
    }
  }

  initializeGenderAnimation() {
    function setGenderPercent(male, female) {
      const maleFill = document.getElementById("maleFill");
      const femaleFill = document.getElementById("femaleFill");

      if (maleFill && femaleFill) {
        maleFill.setAttribute("y", 400 - (400 * male) / 100);
        maleFill.setAttribute("height", (400 * male) / 100);
        femaleFill.setAttribute("y", 400 - (400 * female) / 100);
        femaleFill.setAttribute("height", (400 * female) / 100);

        const malePercent = document.getElementById("malePercent");
        const femalePercent = document.getElementById("femalePercent");
        if (malePercent) malePercent.textContent = male + "%";
        if (femalePercent) femalePercent.textContent = female + "%";

        console.log("Gender animation initialized");
      } else {
        console.warn("Gender animation elements not found");
      }
    }

    setTimeout(() => setGenderPercent(62, 38), 100);
  }
}
