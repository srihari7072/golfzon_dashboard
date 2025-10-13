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
      } catch (_) { }
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
    } catch (_) { }
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

  async createSalesChart(canvasEl, period, salesData) {
    if (!this._validateCanvas(canvasEl, "Sales Trends")) return;
    console.log("Creating sales chart with data:", salesData);

    // Prepare labels and data from database
    const labels = [];
    const currentYearValues = [];
    const previousYearValues = [];

    // ✅ FIX: Create separate date indices for current and previous year
    const currentYearDates = [];
    const previousYearDates = [];

    // Process current year data
    salesData.current_year.forEach((day, index) => {
      const date = new Date(day.date);
      let label = `${date.getMonth() + 1}.${date.getDate()}`;
      labels.push(label);
      currentYearValues.push(day.amount / 10000);
      currentYearDates.push(date); // ✅ Store current year dates
    });

    // Process previous year data
    salesData.previous_year.forEach(day => {
      previousYearValues.push(day.amount / 10000);
      previousYearDates.push(new Date(day.date)); // ✅ Store PREVIOUS year dates
    });

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
              data: currentYearValues,
              backgroundColor: COLOR_PRIMARY,
              borderWidth: 0,
              barPercentage: 0.6,
              categoryPercentage: 0.6,
              borderRadius: {
                topLeft: 20,
                topRight: 20,
                bottomLeft: 0,
                bottomRight: 0,
              },
              borderSkipped: "bottom",
            },
            {
              label: _t("Last Year's Sales (Same Period)"),
              data: previousYearValues,
              backgroundColor: COLOR_SECONDARY,
              borderWidth: 0,
              barPercentage: 0.6,
              categoryPercentage: 0.6,
              borderRadius: {
                topLeft: 20,
                topRight: 20,
                bottomLeft: 0,
                bottomRight: 0,
              },
              borderSkipped: "bottom",
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
              grid: { display: false },
              ticks: {
                autoSkip: false,
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
              ticks: {
                stepSize: 10,
                color: AXIS_COLOR,
                font: { size: 12 },
                callback: function (value) {
                  return value;
                },
              },
              grid: { display: true, color: GRID_COLOR, drawBorder: false },
            },
          },
          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: {
                usePointStyle: true,
                pointStyle: "circle", // ✅ CHANGED from "rectRounded"
                boxWidth: 6,
                boxHeight: 6,
                padding: 16,
                font: { size: 12, weight: "600" },
                color: "#1e1e1e",
                generateLabels: function (chart) {
                  const datasets = chart.data.datasets;
                  return datasets.map((dataset, i) => ({
                    text: dataset.label,
                    fillStyle: dataset.backgroundColor,
                    hidden: !chart.isDatasetVisible(i),
                    lineCap: 'butt',
                    lineDash: [],
                    lineDashOffset: 0,
                    lineJoin: 'miter',
                    lineWidth: 0,
                    strokeStyle: dataset.backgroundColor,
                    pointStyle: 'circle', // ✅ CHANGED from "rectRounded"
                    datasetIndex: i
                  }));
                }
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
                // ✅ FIX: Use correct date array based on dataset
                title: (items) => {
                  if (!items || !items[0]) return "";
                  const idx = items[0].dataIndex;
                  const datasetIndex = items[0].datasetIndex;

                  // Use current year dates or previous year dates
                  const date = datasetIndex === 0
                    ? currentYearDates[idx]
                    : previousYearDates[idx];

                  return this._formatFullDate(date) || labels[idx] || "";
                },
                label: (ctx) => {
                  const isCurrentYear = ctx.datasetIndex === 0;
                  const chartValue = ctx.raw ?? 0;
                  const actualAmount = chartValue * 10000;
                  const formattedValue = `${actualAmount.toLocaleString()} won`;

                  if (isCurrentYear) {
                    return `${_t("Sales")}: ${formattedValue}`;
                  } else {
                    const idx = ctx.dataIndex;
                    const date = previousYearDates[idx]; // ✅ Use previous year date
                    const weather = this._getWeatherData(date);
                    return [
                      `${_t("Sales")}: ${formattedValue}`,
                      `${_t("Weather")}: ${weather.condition}`,
                      `${_t("Temperature")}: ${weather.temp}`,
                    ];
                  }
                },
                afterLabel: () => "",
              },
            },
          },
          animation: { duration: 300, easing: "easeOutQuart" },
        },
      });

      this.chartInstances.set("sales", chart);
      console.log("Sales chart created successfully");
      return chart;
    } catch (e) {
      console.error("Error creating Sales Trends chart:", e);
    }
  }

  createVisitorChart(canvasEl, period, visitorData) {
    if (!this._validateCanvas(canvasEl, "Visitor Chart")) return;

    if (!visitorData || !visitorData.current_year) {
      console.warn("No visitor data provided, using default empty data");
      visitorData = {
        current_year: [],
        previous_year: [],
        date_range: { start: "", end: "" }
      };
    }

    console.log("Creating visitor chart with data:", visitorData);

    const labels = [];
    const currentYearValues = [];
    const previousYearValues = [];

    // ✅ FIX: Create separate date indices for current and previous year
    const currentYearDates = [];
    const previousYearDates = [];

    if (visitorData.current_year && visitorData.current_year.length > 0) {
      visitorData.current_year.forEach((day, index) => {
        const date = new Date(day.date);
        let label = `${date.getMonth() + 1}.${date.getDate()}`;
        labels.push(label);
        currentYearValues.push(day.count || 0);
        currentYearDates.push(date); // ✅ Store current year dates
      });
    }

    if (visitorData.previous_year && visitorData.previous_year.length > 0) {
      visitorData.previous_year.forEach(day => {
        previousYearValues.push(day.count || 0);
        previousYearDates.push(new Date(day.date)); // ✅ Store PREVIOUS year dates
      });
    }

    this.destroyChart("visitor");

    const COLOR_PRIMARY = "#046DEC";
    const COLOR_SECONDARY = "#86E5F5";
    const GRID_COLOR = "#EEF3FA";
    const AXIS_COLOR = "#6f6f6f";

    try {
      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: _t("Number of Visitors"),
              data: currentYearValues,
              borderColor: COLOR_PRIMARY,
              backgroundColor: "rgba(4, 109, 236, 0.1)",
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 2,
              usePointStyle: true,
              pointStyle: "circle",
            },
            {
              label: _t("Number of Visitors for the Same Period Last Year"),
              data: previousYearValues,
              borderColor: COLOR_SECONDARY,
              backgroundColor: "transparent",
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 2,
              usePointStyle: true,
              pointStyle: "circle",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "nearest", intersect: false },
          scales: {
            x: {
              ticks: {
                autoSkip: false,
                minRotation: 0,
                maxRotation: 0,
                callback: function (value, index, ticks) {
                  if (index === 0 || index === ticks.length - 1) {
                    return this.getLabelForValue(value);
                  }
                  return "";
                },
                font: { size: 12 },
                color: AXIS_COLOR,
              },
              grid: { display: false },
            },
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 100,
                color: AXIS_COLOR,
                font: { size: 12 },
              },
              grid: { color: GRID_COLOR },
            },
          },
          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: {
                usePointStyle: true,
                pointStyle: "circle", // ✅ CHANGED from "rectRounded"
                boxWidth: 6,
                boxHeight: 6,
                padding: 16,
                font: { size: 12, weight: "600" },
                color: "#1e1e1e",
                generateLabels: function (chart) {
                  const datasets = chart.data.datasets;
                  return datasets.map((dataset, i) => ({
                    text: dataset.label,
                    fillStyle: dataset.borderColor,
                    hidden: !chart.isDatasetVisible(i),
                    lineCap: 'butt',
                    lineDash: [],
                    lineDashOffset: 0,
                    lineJoin: 'miter',
                    lineWidth: 0,
                    strokeStyle: dataset.borderColor,
                    pointStyle: 'circle', // ✅ CHANGED from "rectRounded"
                    datasetIndex: i
                  }));
                }
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
                // ✅ FIX: Use correct date array based on dataset
                title: (items) => {
                  if (!items || !items[0]) return "";
                  const idx = items[0].dataIndex;
                  const datasetIndex = items[0].datasetIndex;

                  // Use current year dates or previous year dates
                  const date = datasetIndex === 0
                    ? currentYearDates[idx]
                    : previousYearDates[idx];

                  return this._formatFullDate(date) || labels[idx] || "";
                },
                label: (ctx) => {
                  const value = ctx.raw ?? 0;
                  const isCurrentYear = ctx.datasetIndex === 0;

                  if (isCurrentYear) {
                    return `${_t("Visitors")}: ${value.toLocaleString()}`;
                  } else {
                    const idx = ctx.dataIndex;
                    const date = previousYearDates[idx]; // ✅ Use previous year date
                    const weather = this._getWeatherData(date);
                    return [
                      `${_t("Visitors")}: ${value.toLocaleString()}`,
                      `${_t("Weather")}: ${weather.condition}`,
                      `${_t("Temperature")}: ${weather.temp}`,
                    ];
                  }
                },
              },
            },
          },
          animation: { duration: 300, easing: "easeOutQuart" },
        },
      });

      this.chartInstances.set("visitor", chart);
      console.log("Visitor chart created successfully");
      return chart;
    } catch (e) {
      console.error("❌ Error creating visitor chart:", e);
    }
  }

  async createReservationChart(canvasEl, period, reservationData) {
    if (!this._validateCanvas(canvasEl, "Reservation Chart")) return;

    if (!reservationData || !reservationData.current_year) {
      console.warn("No reservation data provided, using default empty data");
      reservationData = {
        current_year: [],
        previous_year: [],
        date_range: { start: "", end: "" }
      };
    }

    console.log("Creating reservation chart with data:", reservationData);

    const labels = [];
    const currentYearValues = [];
    const previousYearValues = [];

    // ✅ FIX: Create separate date indices for current and previous year
    const currentYearDates = [];
    const previousYearDates = [];

    if (reservationData.current_year && reservationData.current_year.length > 0) {
      reservationData.current_year.forEach((day, index) => {
        const date = new Date(day.date);
        let label = `${date.getMonth() + 1}.${date.getDate()}`;
        labels.push(label);
        currentYearValues.push(day.count || 0);
        currentYearDates.push(date); // ✅ Store current year dates
      });
    }

    if (reservationData.previous_year && reservationData.previous_year.length > 0) {
      reservationData.previous_year.forEach(day => {
        previousYearValues.push(day.count || 0);
        previousYearDates.push(new Date(day.date)); // ✅ Store PREVIOUS year dates
      });
    }

    this.destroyChart("reservation");

    const COLOR_PRIMARY = "#046DEC";
    const COLOR_SECONDARY = "#86E5F5";
    const GRID_COLOR = "#EEF3FA";
    const AXIS_COLOR = "#6f6f6f";

    try {
      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: _t("Reservation Count"),
              data: currentYearValues,
              borderColor: COLOR_PRIMARY,
              backgroundColor: "rgba(4, 109, 236, 0.1)",
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 2,
              usePointStyle: true,
              pointStyle: "circle",
            },
            {
              label: _t("Reservation Countfor the Same Period Last Year"),
              data: previousYearValues,
              borderColor: COLOR_SECONDARY,
              backgroundColor: "transparent",
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 2,
              usePointStyle: true,
              pointStyle: "circle",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "nearest", intersect: false },
          scales: {
            x: {
              ticks: {
                autoSkip: false,
                minRotation: 0,
                maxRotation: 0,
                callback: function (value, index, ticks) {
                  if (index === 0 || index === ticks.length - 1) {
                    return this.getLabelForValue(value);
                  }
                  return "";
                },
                font: { size: 12 },
                color: AXIS_COLOR,
              },
              grid: { display: false },
            },
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 20,
                color: AXIS_COLOR,
                font: { size: 12 },
              },
              grid: { color: GRID_COLOR },
            },
          },
          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: {
                usePointStyle: true,
                pointStyle: "circle", // ✅ CHANGED from "rectRounded"
                boxWidth: 6,
                boxHeight: 6,
                padding: 16,
                font: { size: 12, weight: "600" },
                color: "#1e1e1e",
                generateLabels: function (chart) {
                  const datasets = chart.data.datasets;
                  return datasets.map((dataset, i) => ({
                    text: dataset.label,
                    fillStyle: dataset.borderColor,
                    hidden: !chart.isDatasetVisible(i),
                    lineCap: 'butt',
                    lineDash: [],
                    lineDashOffset: 0,
                    lineJoin: 'miter',
                    lineWidth: 0,
                    strokeStyle: dataset.borderColor,
                    pointStyle: 'circle', // ✅ CHANGED from "rectRounded"
                    datasetIndex: i
                  }));
                }
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
                // ✅ FIX: Use correct date array based on dataset
                title: (items) => {
                  if (!items || !items[0]) return "";
                  const idx = items[0].dataIndex;
                  const datasetIndex = items[0].datasetIndex;

                  // Use current year dates or previous year dates
                  const date = datasetIndex === 0
                    ? currentYearDates[idx]
                    : previousYearDates[idx];

                  return this._formatFullDate(date) || labels[idx] || "";
                },
                label: (ctx) => {
                  const value = ctx.raw ?? 0;
                  const isCurrentYear = ctx.datasetIndex === 0;

                  if (isCurrentYear) {
                    return `${_t("Reservations")}: ${value}`;
                  } else {
                    const idx = ctx.dataIndex;
                    const date = previousYearDates[idx]; // ✅ Use previous year date
                    const weather = this._getWeatherData(date);
                    return [
                      `${_t("Reservations")}: ${value}`,
                      `${_t("Weather")}: ${weather.condition}`,
                      `${_t("Temperature")}: ${weather.temp}`,
                    ];
                  }
                },
              },
            },
          },
          animation: { duration: 300, easing: "easeOutQuart" },
        },
      });

      this.chartInstances.set("reservation", chart);
      console.log("✅ Reservation chart created successfully");
      return chart;
    } catch (e) {
      console.error("❌ Error creating reservation chart:", e);
    }
  }

  createAgeChart(canvasEl, ageData) {
    if (!this._validateCanvas(canvasEl, "Age Chart")) return;

    if (!ageData || typeof ageData !== 'object' || ageData.total_count === undefined) {
      console.error("Invalid age data provided:", ageData);
      console.warn("Using default age values for display");
      ageData = {
        under_10: { count: 0, percentage: 0 },
        twenties: { count: 0, percentage: 0 },
        thirties: { count: 0, percentage: 0 },
        forties: { count: 0, percentage: 0 },
        fifties: { count: 0, percentage: 0 },
        sixty_plus: { count: 0, percentage: 0 },
        total_count: 0,
      };
    }

    console.log("✅ Creating age chart with validated data:", ageData);

    this.destroyChart("age");

    try {
      const MAX = 60;
      const labels = [
        _t("60+ years"),
        _t("50s"),
        _t("40s"),
        _t("30s"),
        _t("20s"),
        _t("Under 10")
      ];

      const values = [
        ageData.sixty_plus?.percentage || 0,
        ageData.fifties?.percentage || 0,
        ageData.forties?.percentage || 0,
        ageData.thirties?.percentage || 0,
        ageData.twenties?.percentage || 0,
        ageData.under_10?.percentage || 0,
      ];

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

      const percentageLabelsPlugin = {
        id: "percentageLabels",
        afterDatasetsDraw(chart) {
          const { ctx, scales, data } = chart;
          const x = scales.x;
          const meta = chart.getDatasetMeta(0);

          if (!meta || !meta.data) return;

          ctx.save();
          ctx.font = "bold 14px Arial";
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          meta.data.forEach((bar, index) => {
            const value = data.datasets[0].data[index];
            const barEndX = x.getPixelForValue(value);
            const barCenterY = bar.y;

            let textX;
            if (value < 5) {
              const barStartX = x.getPixelForValue(0);
              textX = barStartX + (barEndX - barStartX) / 2;
            } else {
              textX = barEndX - 20;
            }

            const displayValue = value % 1 === 0 ? value : value.toFixed(1);
            const text = `${displayValue}%`;
            ctx.fillText(text, textX, barCenterY);
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
          layout: {
            padding: {
              top: 10,
              right: 50,
              bottom: 10,
              left: 10,
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              callbacks: {
                label: (context) => {
                  const index = context.dataIndex;
                  const ageGroups = ['sixty_plus', 'fifties', 'forties', 'thirties', 'twenties', 'under_10'];
                  const groupKey = ageGroups[index];
                  const count = ageData[groupKey]?.count || 0;
                  const percentage = context.parsed.x;
                  return `${percentage.toFixed(1)}% (${count.toLocaleString()} people)`;
                }
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
              ticks: {
                color: "#6f6f6f",
                font: { size: 14, weight: "600" },
                padding: 10,
              },
              grid: { display: false },
              border: { display: false },
            },
          },
        },
        plugins: [barTrackPlugin, percentageLabelsPlugin],
      });

      this.chartInstances.set("age", chart);
      console.log("✅ Age chart created successfully with database data");
      return chart;
    } catch (e) {
      console.error("❌ Error creating age chart:", e);
    }
  }

  createPieChartWithData(canvasEl, chartId, dataObject, labels, colors) {
    // Use the existing _validateCanvas method (with underscore)
    if (!this._validateCanvas(canvasEl, `Pie Chart ${chartId}`)) return;

    this.destroyChart(chartId);

    // Extract percentage values from dataObject
    let values = [];
    if (typeof dataObject === 'object' && !Array.isArray(dataObject)) {
      values = Object.keys(dataObject).map(key => {
        const item = dataObject[key];
        return typeof item === 'object' ? (item.percentage || 0) : item;
      });
    } else if (Array.isArray(dataObject)) {
      values = dataObject.map(item =>
        typeof item === 'object' ? (item.percentage || 0) : item
      );
    } else {
      console.error('Invalid dataObject format for pie chart');
      return;
    }

    console.log(`Creating pie chart ${chartId} with values:`, values);

    try {
      const ctx = canvasEl.getContext('2d');
      if (!ctx) {
        console.error('Cannot get canvas context');
        return;
      }

      const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderWidth: 0,
            cutout: '40%',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          aspectRatio: 1,
          devicePixelRatio: window.devicePixelRatio || 2,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              enabled: true,
              backgroundColor: '#3C3F44',
              titleColor: '#fff',
              bodyColor: '#fff',
              cornerRadius: 8,
              padding: 12,
              displayColors: false,
              callbacks: {
                label: function (context) {
                  const index = context.dataIndex;
                  const keys = Object.keys(dataObject);
                  if (keys[index]) {
                    const key = keys[index];
                    const item = dataObject[key];
                    if (item && typeof item === 'object' && item.count !== undefined) {
                      return `${item.percentage}% (${item.count})`;
                    }
                  }
                  return `${context.parsed}%`;
                }
              }
            }
          },
          layout: {
            padding: 2
          },
          elements: {
            arc: {
              borderWidth: 0,
              borderRadius: 0
            }
          },
          animation: {
            animateRotate: true,
            animateScale: false,
            duration: 600
          }
        }
      });

      this.chartInstances.set(chartId, chart);
      console.log(`✅ Pie chart ${chartId} created successfully`);
      return chart;

    } catch (e) {
      console.error(`Error creating pie chart ${chartId}:`, e);
    }
  }

  updateGenderRatio(genderData) {
    console.log("🔄 Updating gender ratio WITHOUT animation:", genderData);

    const malePercent = genderData?.male_percentage || 62;
    const femalePercent = genderData?.female_percentage || 38;

    console.log(`Gender percentages - Male: ${malePercent}%, Female: ${femalePercent}%`);

    const maleFill = document.getElementById("maleFill");
    const femaleFill = document.getElementById("femaleFill");
    const malePercentEl = document.getElementById("malePercent");
    const femalePercentEl = document.getElementById("femalePercent");

    if (maleFill && femaleFill) {
      const maxHeight = 400;
      maleFill.setAttribute("y", maxHeight - (maxHeight * malePercent) / 100);
      maleFill.setAttribute("height", (maxHeight * malePercent) / 100);
      femaleFill.setAttribute("y", maxHeight - (maxHeight * femalePercent) / 100);
      femaleFill.setAttribute("height", (maxHeight * femalePercent) / 100);
    }

    if (malePercentEl) {
      malePercentEl.textContent = malePercent + "%";
    }

    if (femalePercentEl) {
      femalePercentEl.textContent = femalePercent + "%";
    }

    console.log("✅ Gender ratio updated instantly (no animation)");
  }

  initializeGenderAnimation(genderData) {
    console.log("🎨 Initializing gender animation with data:", genderData);

    const malePercent = genderData?.male_percentage || 62;
    const femalePercent = genderData?.female_percentage || 38;

    console.log(`Gender percentages - Male: ${malePercent}%, Female: ${femalePercent}%`);

    function setGenderPercent(male, female) {
      const maleFill = document.getElementById("maleFill");
      const femaleFill = document.getElementById("femaleFill");
      const malePercentEl = document.getElementById("malePercent");
      const femalePercentEl = document.getElementById("femalePercent");

      if (maleFill && femaleFill) {
        const maxHeight = 400;
        maleFill.setAttribute("y", maxHeight - (maxHeight * male) / 100);
        maleFill.setAttribute("height", (maxHeight * male) / 100);
        femaleFill.setAttribute("y", maxHeight - (maxHeight * female) / 100);
        femaleFill.setAttribute("height", (maxHeight * female) / 100);
      }

      if (malePercentEl) {
        malePercentEl.textContent = male + "%";
      }

      if (femalePercentEl) {
        femalePercentEl.textContent = female + "%";
      }
    }

    let currentMale = 0;
    let currentFemale = 0;
    const duration = 1000;
    const steps = 60;
    const maleIncrement = malePercent / steps;
    const femaleIncrement = femalePercent / steps;
    const intervalTime = duration / steps;

    const interval = setInterval(() => {
      currentMale = Math.min(currentMale + maleIncrement, malePercent);
      currentFemale = Math.min(currentFemale + femaleIncrement, femalePercent);

      setGenderPercent(Math.round(currentMale), Math.round(currentFemale));

      if (currentMale >= malePercent && currentFemale >= femalePercent) {
        clearInterval(interval);
        setGenderPercent(malePercent, femalePercent);
        console.log("✅ Gender animation complete");
      }
    }, intervalTime);
  }
}
