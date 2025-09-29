/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";

export class ChartService {
  constructor() {
    this.chartInstances = new Map();

    // Initialize Chart.js
    if (window.Chart && window.ChartDataLabels) {
      window.Chart.register(window.ChartDataLabels);
    }

    this.setGenderPercent = this.setGenderPercent.bind(this);
    this.initializeGenderAnimation = this.initializeGenderAnimation.bind(this);
    this.fetchGenderDemographics = this.fetchGenderDemographics.bind(this);
    this.fetchAgeDemographics = this.fetchAgeDemographics.bind(this);
    this.createAgeChart = this.createAgeChart.bind(this);

    console.log("✅ ChartService initialized with bound methods");
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

  getWeatherDataForDate(dateLabel) {
    try {
      const date = new Date(dateLabel);

      // Sample weather data based on date patterns
      const weatherOptions = [
        { condition: "Partly Cloudy", temp: "19°C / 24°C" },
        { condition: "Rain, 30mm", temp: "18°C / 25°C" },
        { condition: "Sunny", temp: "22°C / 28°C" },
        { condition: "Cloudy", temp: "16°C / 23°C" },
        { condition: "Clear", temp: "20°C / 26°C" },
      ];

      // Use date to generate consistent weather
      const weatherIndex = date.getDate() % weatherOptions.length;
      return weatherOptions[weatherIndex];
    } catch (error) {
      console.error("Error getting weather data:", error);
      return { condition: "Partly Cloudy", temp: "19°C / 24°C" };
    }
  }

  getWeatherDataForDate(dateLabel) {
    try {
      // Parse the date label
      const date = new Date(dateLabel);

      // Sample weather data - replace with actual API call or database lookup
      const weatherOptions = [
        { condition: "Rain, 30mm", temp: "18°C / 25°C" },
        { condition: "Sunny", temp: "22°C / 28°C" },
        { condition: "Cloudy", temp: "16°C / 23°C" },
        { condition: "Clear", temp: "20°C / 26°C" },
        { condition: "Partly Cloudy", temp: "19°C / 24°C" },
      ];

      // Use date to generate consistent weather (in real app, this would be an API call)
      const weatherIndex = date.getDate() % weatherOptions.length;
      return weatherOptions[weatherIndex];
    } catch (error) {
      console.error("Error getting weather data:", error);
      return { condition: "Clear", temp: "20°C / 25°C" };
    }
  }

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

  async createSalesChart(canvasEl, period) {
    if (!this._validateCanvas(canvasEl, "Sales Trends")) return;

    console.log(
      `🔄 ChartService: Creating sales chart with database data for ${period}...`
    );

    try {
      // ✅ REMOVE HARDCODED DATA - Fetch from database
      const url =
        window.location.origin + `/golfzon/api/sales_trends?period=${period}`;
      console.log(`📞 Fetching sales data from: ${url}`);

      const response = await fetch(url);
      console.log(`📞 Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const salesResponse = await response.json();
      console.log("📊 Raw sales response:", salesResponse);

      if (salesResponse.status !== "success") {
        console.error(
          "❌ ChartService: Sales data fetch failed:",
          salesResponse.message
        );
        this._showChartError(
          canvasEl,
          `Failed to load sales data: ${salesResponse.message}`
        );
        return;
      }

      const data = salesResponse.data;
      const labels = data.labels || [];

      // ✅ USE DATABASE DATA instead of _generateRandomData
      const currentData = data.current_data || [];
      const lastYearData = data.prev_year_data || [];

      console.log("✅ ChartService: Creating sales chart with database data:", {
        labels: labels.length,
        currentTotal: data.totals ? data.totals.current_total : 0,
        prevYearTotal: data.totals ? data.totals.prev_year_total : 0,
        currentData: currentData,
        lastYearData: lastYearData,
      });

      // ✅ Validate data arrays
      if (!currentData.length || currentData.every((x) => x === 0)) {
        console.warn(
          "⚠️ ChartService: All sales data is zero, showing empty state"
        );
      }

      this.destroyChart("sales");

      const COLOR_PRIMARY = "#046DEC";
      const COLOR_SECONDARY = "#86E5F5";
      const GRID_COLOR = "#EEF3FA";
      const AXIS_COLOR = "#6f6f6f";

      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: _t("Sales"),
              data: currentData, // ✅ DATABASE DATA
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
              data: lastYearData, // ✅ DATABASE DATA
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
                maxTicksLimit: period === "30days" ? 8 : 7,
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
              // ✅ DYNAMIC MAX based on data
              suggestedMax: Math.max(...currentData, ...lastYearData, 100),
              ticks: {
                stepSize: Math.max(
                  Math.ceil(Math.max(...currentData, ...lastYearData) / 8),
                  10
                ),
                color: AXIS_COLOR,
                font: { size: 12 },
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
              padding: 16,
              cornerRadius: 12,
              caretSize: 8,
              titleFont: { size: 16, weight: "600" },
              bodyFont: { size: 14 },
              callbacks: {
                title: (items) => {
                  if (!items || !items[0]) return "";
                  const idx = items[0].dataIndex;
                  const datasetIndex = items[0].datasetIndex;

                  const labelDate = labels[idx];
                  const date = new Date(labelDate);

                  let displayYear = date.getFullYear();
                  if (datasetIndex === 1) {
                    displayYear = displayYear - 1;
                  }

                  const weekdays = [
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ];
                  const months = [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ];

                  return `${weekdays[date.getDay()]}, ${
                    months[date.getMonth()]
                  } ${date.getDate()}, ${displayYear}`;
                },

                label: (ctx) => {
                  const value = ctx.raw ?? 0;
                  const formattedValue = value.toLocaleString() + " won";
                  return `Sales: ${formattedValue}`;
                },

                afterLabel: (ctx) => {
                  const datasetIndex = ctx.datasetIndex;

                  if (datasetIndex === 1) {
                    const idx = ctx.dataIndex;
                    const weatherData = this.getWeatherDataForDate(labels[idx]);

                    return [
                      `Weather: ${weatherData.condition}`,
                      `Temperature: ${weatherData.temp}`,
                    ];
                  }

                  return [];
                },
              },
            },
          },
          animation: { duration: 300, easing: "easeOutQuart" },
        },
      });

      this.chartInstances.set("sales", chart);
      console.log(
        "✅ ChartService: Sales chart created successfully with database data"
      );
      return chart;
    } catch (e) {
      console.error("❌ ChartService: Error creating sales chart:", e);
      this._showChartError(canvasEl, `Error loading sales data: ${e.message}`);
    }
  }

  async fetchVisitorData(period) {
    console.log(`🔄 ChartService: Fetching visitor data for ${period}...`);

    try {
      const url =
        window.location.origin + `/golfzon/api/visitor_data?period=${period}`;
      const response = await fetch(url);

      console.log(`📞 Visitor API: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === "success") {
        console.log("✅ Visitor data fetched:", {
          period: data.period,
          currentTotal: data.data.totals.current_total,
          prevYearTotal: data.data.totals.prev_year_total,
          growth: data.data.totals.growth_percentage,
          dataPoints: data.data.current_visitors.length,
        });

        return data;
      } else {
        console.error("❌ Visitor data fetch failed:", data.message);
        return null;
      }
    } catch (error) {
      console.error("❌ Error fetching visitor data:", error);
      return null;
    }
  }

  async createVisitorChart(canvasEl, period) {
    if (!this._validateCanvas(canvasEl, "Visitor Chart")) return;

    console.log(`🔄 ChartService: Creating visitor chart for ${period}...`);

    try {
      const url =
        window.location.origin + `/golfzon/api/visitor_data?period=${period}`;
      console.log(`📞 Fetching visitor data from: ${url}`);

      const response = await fetch(url);
      console.log(`📞 Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const visitorResponse = await response.json();
      console.log("📊 Raw visitor response:", visitorResponse);

      if (visitorResponse.status !== "success") {
        console.error(
          "❌ ChartService: Visitor data fetch failed:",
          visitorResponse.message
        );
        this._showChartError(
          canvasEl,
          `Failed to load visitor data: ${visitorResponse.message}`
        );
        return;
      }

      const data = visitorResponse.data;
      const labels = data.labels || [];
      const visitorData = (
        data.current_visitors ||
        data.current_data ||
        []
      ).map((x) => parseInt(x) || 0); // ✅ FIXED: Ensure integers
      const lastYearData = (
        data.prev_year_visitors ||
        data.prev_year_data ||
        []
      ).map((x) => parseInt(x) || 0); // ✅ FIXED: Ensure integers

      console.log(
        "✅ ChartService: Creating visitor chart with database data:",
        {
          labels: labels.length,
          currentTotal: data.totals ? data.totals.current_total : 0,
          prevYearTotal: data.totals ? data.totals.prev_year_total : 0,
          currentData: visitorData,
          lastYearData: lastYearData,
        }
      );

      // ✅ FIXED: Validate data arrays
      if (!visitorData.length || visitorData.every((x) => x === 0)) {
        console.warn(
          "⚠️ ChartService: All visitor data is zero, showing empty state"
        );
      }

      this.destroyChart("visitor");

      const maxValue = Math.max(...visitorData, ...lastYearData, 10); // Minimum 10
      const chartMax = Math.max(Math.ceil(maxValue * 1.2), 10);

      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: _t("Number of Visitors"),
              data: visitorData,
              borderColor: "#046DEC",
              backgroundColor: "transparent",
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointStyle: "circle",
              pointBackgroundColor: "#046DEC",
              pointBorderColor: "#046DEC",
            },
            {
              label: _t("Number of Visitors for the Same Period Last Year"),
              data: lastYearData,
              borderColor: "#86E5F5",
              backgroundColor: "transparent",
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointStyle: "circle",
              pointBackgroundColor: "#86E5F5",
              pointBorderColor: "#86E5F5",
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
              },
            },
            tooltip: {
              enabled: true,
              displayColors: false,
              backgroundColor: "#3C3F44",
              titleColor: "#fff",
              bodyColor: "#fff",
              padding: 16,
              cornerRadius: 12,
              caretSize: 8,
              titleFont: { size: 16, weight: "600" },
              bodyFont: { size: 14 },
              callbacks: {
                title: (items) => {
                  if (!items || !items[0]) return "";
                  const idx = items[0].dataIndex;
                  const datasetIndex = items[0].datasetIndex;

                  const labelDate = labels[idx];
                  const date = new Date(labelDate);

                  let displayYear = date.getFullYear();
                  if (datasetIndex === 1) {
                    displayYear = displayYear - 1;
                  }

                  const weekdays = [
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ];
                  const months = [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ];

                  return `${weekdays[date.getDay()]}, ${
                    months[date.getMonth()]
                  } ${date.getDate()}, ${displayYear}`;
                },

                label: (ctx) => {
                  const value = parseInt(ctx.raw) || 0;
                  return `Number of guests: ${value.toLocaleString()}`;
                },

                afterLabel: (ctx) => {
                  const datasetIndex = ctx.datasetIndex;

                  if (datasetIndex === 1) {
                    const idx = ctx.dataIndex;
                    const weatherData = this.getWeatherDataForDate(labels[idx]);

                    return [
                      `Weather: ${weatherData.condition}`,
                      `Temperature: ${weatherData.temp}`,
                    ];
                  }

                  return [];
                },
              },
            },
          },
          scales: {
            x: {
              ticks: {
                callback: function (value, index, ticks) {
                  if (
                    period === "7days" ||
                    index === 0 ||
                    index === ticks.length - 1
                  ) {
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
              max: chartMax,
              ticks: {
                stepSize: Math.max(Math.ceil(chartMax / 8), 1),
                callback: function (value) {
                  return parseInt(value).toLocaleString(); // ✅ FIXED: Integer display
                },
              },
              grid: { color: "#e0e0e0" },
            },
          },
        },
      });

      this.chartInstances.set("visitor", chart);

      console.log("✅ ChartService: Visitor chart created successfully");

      return chart;
    } catch (e) {
      console.error("❌ ChartService: Error creating visitor chart:", e);
      this._showChartError(
        canvasEl,
        `Error loading visitor data: ${e.message}`
      );
    }
  }

  async fetchChartDataViaHTTP(chartType = "reservation", period = "30days") {
    console.log(
      `🔄 ChartService: Fetching ${chartType} data via HTTP for ${period}...`
    );

    try {
      const url = `/golfzon/api/chart_data?chart_type=${chartType}&period=${period}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.status === "success") {
        console.log("✅ ChartService: Chart data fetched via HTTP:", {
          chartType: data.chart_type,
          period: data.period,
          currentTotal: data.data.totals?.current_total || 0,
          prevYearTotal: data.data.totals?.prev_year_total || 0,
          dataPoints: data.data.current_reservations?.length || 0,
          dateRange: data.data.date_info
            ? `${data.data.date_info.current_start} to ${data.data.date_info.current_end}`
            : "Unknown",
        });

        return data.data;
      } else {
        console.error(
          "❌ ChartService: HTTP fetch failed:",
          data?.message || "Unknown error"
        );
        return null;
      }
    } catch (error) {
      console.error("❌ ChartService: HTTP fetch error:", error);
      return null;
    }
  }

  async createReservationChart(canvasEl, period, rpcService) {
    if (!this._validateCanvas(canvasEl, "Reservation Chart")) return;

    console.log(
      `🔄 ChartService: Creating clean reservation chart for ${period}...`
    );

    try {
      // Fetch data via HTTP
      const chartData = await this.fetchChartDataViaHTTP("reservation", period);

      if (!chartData) {
        console.error("❌ ChartService: No chart data received");
        this._showChartError(canvasEl, "Failed to fetch database chart data");
        return;
      }

      const labels = chartData.labels || [];
      const currentData = chartData.current_reservations || [];
      const prevYearData = chartData.prev_year_reservations || [];
      const dateInfo = chartData.date_info || {};

      console.log("✅ ChartService: Creating clean chart design:", {
        labels: labels.length,
        currentData: currentData.length,
        prevYearData: prevYearData.length,
        currentTotal: chartData.totals?.current_total || 0,
      });

      // Check if we have any data
      const hasCurrentData = currentData.some((val) => val > 0);
      const hasPrevYearData = prevYearData.some((val) => val > 0);

      if (!hasCurrentData && !hasPrevYearData) {
        const message = "No reservation data available for selected period";
        this._showChartError(canvasEl, message);
        this.lastChartData = chartData;
        return;
      }

      this.destroyChart("reservation");

      const maxValue = Math.max(...currentData, ...prevYearData, 10);

      // ✅ CLEAN LABELS - No date ranges, simple names only
      const currentLabel = _t("Reservation Count");
      const prevYearLabel = _t(
        "Reservation Countfor the Same Period Last Year"
      );

      const chart = new Chart(canvasEl.getContext("2d"), {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: currentLabel,
              data: currentData,
              borderColor: "#046DEC",
              backgroundColor: "transparent", // ✅ REMOVED: No background fill
              borderWidth: 2,
              fill: false, // ✅ CRITICAL: No fill area
              tension: 0.4,
              pointRadius: 4,
              pointStyle: "circle",
              pointBackgroundColor: "#046DEC",
              pointBorderColor: "#046DEC",
            },
            {
              label: prevYearLabel,
              data: prevYearData,
              borderColor: "#86E5F5",
              backgroundColor: "transparent", // ✅ REMOVED: No background fill
              borderWidth: 2,
              fill: false, // ✅ CRITICAL: No fill area
              tension: 0.4,
              pointRadius: 4,
              pointStyle: "circle",
              pointBackgroundColor: "#86E5F5",
              pointBorderColor: "#86E5F5",
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
              max: Math.ceil(maxValue * 1.1),
              ticks: {
                stepSize: Math.max(Math.ceil(maxValue / 8), 5),
                font: { size: 11 },
                color: "#666",
              },
              grid: {
                color: "#f0f0f0",
                lineWidth: 1,
              },
              border: { display: false },
            },
            x: {
              ticks: {
                callback: function (value, index, ticks) {
                  // Show fewer labels for cleaner look
                  const totalTicks = ticks.length;
                  if (period === "7days") {
                    // Show every other label for 7 days
                    return index % 2 === 0 || index === totalTicks - 1
                      ? this.getLabelForValue(value)
                      : "";
                  } else {
                    // Show every 6th label for 30 days
                    return index % 6 === 0 || index === totalTicks - 1
                      ? this.getLabelForValue(value)
                      : "";
                  }
                },
                font: { size: 11 },
                color: "#666",
                maxRotation: 0,
              },
              grid: { display: false },
              border: { display: false },
            },
          },
          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: {
                usePointStyle: true,
                pointStyle: "circle",
                boxWidth: 8,
                boxHeight: 8,
                padding: 20,
                font: { size: 12, weight: "normal" }, // ✅ Normal weight, not bold
                color: "#333",
                generateLabels: function (chart) {
                  // ✅ CLEAN LEGEND - Simple labels only
                  return chart.data.datasets.map((dataset, i) => ({
                    text: dataset.label,
                    fillStyle: dataset.borderColor,
                    strokeStyle: dataset.borderColor,
                    lineWidth: 2,
                    pointStyle: "circle",
                    hidden: !chart.isDatasetVisible(i),
                    datasetIndex: i,
                  }));
                },
              },
            },
            tooltip: {
              enabled: true,
              displayColors: false,
              backgroundColor: "#333",
              titleColor: "#fff",
              bodyColor: "#fff",
              padding: 16,
              cornerRadius: 12,
              caretSize: 8,
              titleFont: { size: 16, weight: "600" },
              bodyFont: { size: 14 },
              callbacks: {
                title: (items) => {
                  if (!items || !items[0]) return "";
                  const idx = items[0].dataIndex;
                  const datasetIndex = items[0].datasetIndex;

                  const labelDate = labels[idx];
                  const date = new Date(labelDate);

                  // ✅ ENHANCED: Different year based on dataset
                  let displayYear = date.getFullYear();
                  if (datasetIndex === 1) {
                    displayYear = displayYear - 1; // Previous year data
                  }

                  const weekdays = [
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ];
                  const months = [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ];

                  return `${weekdays[date.getDay()]}, ${
                    months[date.getMonth()]
                  } ${date.getDate()}, ${displayYear}`;
                },

                label: (ctx) => {
                  const value = parseInt(ctx.parsed.y) || 0;
                  return `Reservations: ${value.toLocaleString()}`;
                },

                afterLabel: (ctx) => {
                  const datasetIndex = ctx.datasetIndex;

                  // ✅ Only show weather for previous year (dataset 1)
                  if (datasetIndex === 1) {
                    const idx = ctx.dataIndex;
                    const weatherData = this.getWeatherDataForDate(labels[idx]);

                    return [
                      `Weather: ${weatherData.condition}`,
                      `Temperature: ${weatherData.temp}`,
                    ];
                  }

                  return [];
                },
              },
            },
          },
          elements: {
            line: {
              borderWidth: 2,
            },
            point: {
              radius: 4,
              hoverRadius: 6,
            },
          },
        },
      });

      this.chartInstances.set("reservation", chart);

      // Store chart data for statistics
      this.lastChartData = chartData;

      console.log(
        "✅ ChartService: Clean reservation chart created successfully"
      );

      return chart;
    } catch (e) {
      console.error(
        "❌ ChartService: Error creating clean reservation chart:",
        e
      );
      this._showChartError(canvasEl, "Error creating chart");
    }
  }

  _showChartError(canvasEl, message) {
    try {
      const ctx = canvasEl.getContext("2d");
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      // Set canvas size if not set
      if (canvasEl.width === 0) {
        canvasEl.width = 400;
        canvasEl.height = 200;
      }

      ctx.fillStyle = "#ff6b6b";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Split long messages
      const words = message.split(" ");
      const lines = [];
      let currentLine = "";

      words.forEach((word) => {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        if (testLine.length > 40 && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);

      const lineHeight = 20;
      const startY =
        canvasEl.height / 2 - ((lines.length - 1) * lineHeight) / 2;

      lines.forEach((line, index) => {
        ctx.fillText(line, canvasEl.width / 2, startY + index * lineHeight);
      });
    } catch (e) {
      console.error("Error showing chart error message:", e);
    }
  }

  getChartStatistics() {
    return (
      this.lastChartData?.totals || {
        current_total: 0,
        prev_year_total: 0,
        growth_percentage: 0,
        operation_rate: 0,
      }
    );
  }

  getOperationBreakdown() {
    return (
      this.lastChartData?.operation_breakdown || {
        part1: 0,
        part2: 0,
        part3: 0,
      }
    );
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
              cutout: "40%", // Further reduced for thicker donut
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          aspectRatio: 1,
          devicePixelRatio: window.devicePixelRatio || 2,
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
                label: function (context) {
                  return context.parsed + "%";
                },
              },
            },
          },
          layout: {
            padding: 2, // Minimal padding for maximum chart size
          },
          elements: {
            arc: {
              borderWidth: 0,
              borderRadius: 0,
            },
          },
          animation: {
            animateRotate: true,
            animateScale: false,
            duration: 600,
          },
        },
      });

      this.chartInstances.set(chartId, chart);
      return chart;
    } catch (e) {
      console.error(`Error creating pie chart ${chartId}:`, e);
    }
  }

  async fetchAgeDemographics() {
    console.log("🔄 ChartService: Fetching age demographics from database...");
    try {
      const url = window.location.origin + "/golfzon/api/demographics/age";
      const response = await fetch(url);
      console.log(`📞 Age API: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status === "success" && data.data && data.data.has_data) {
        console.log("✅ Age demographics fetched from database:", {
          totalPersons: data.data.total_persons,
          hasData: data.data.has_data,
          isSample: data.data.is_sample || false,
        });
        return data.data;
      } else {
        console.error("❌ Age demographics fetch failed:", data.message);
        return null;
      }
    } catch (error) {
      console.error("❌ Error fetching age demographics:", error);
      return null;
    }
  }

  async createAgeChart(canvasEl) {
    if (!this._validateCanvas(canvasEl, "Age Chart")) return;
    console.log("🔄 ChartService: Creating age chart with database data...");

    try {
      // ✅ FETCH REAL DATA from database
      const ageData = await this.fetchAgeDemographics();

      if (!ageData || !ageData.has_data) {
        console.warn("⚠️ ChartService: No age data available");
        this._showChartError(canvasEl, "No age demographics data available");
        return;
      }

      const labels = ageData.labels;
      const values = ageData.percentages;
      const counts = ageData.counts;

      console.log("✅ ChartService: Creating age chart with database data:", {
        labels: labels.length,
        values: values,
        totalPersons: ageData.total_persons,
      });

      this.destroyChart("age");

      const MAX = Math.max(...values) + 10; // Dynamic max based on data

      // Track background plugin
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

      // Percentage labels plugin with database data
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

            const text = `${value}%`;
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
              label: "Visitor Ratio",
              data: values, // ✅ Using database percentages
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
                  const percentage = values[index];
                  const count = counts[index];
                  return [`${percentage}% of total`, `${count} persons`];
                },
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
      console.log(
        "✅ ChartService: Age chart created successfully with database data"
      );
      return chart;
    } catch (e) {
      console.error("❌ ChartService: Error creating age chart:", e);
      this._showChartError(canvasEl, "Error loading age demographics");
    }
  }

  checkGenderElements() {
    const elements = {
      malePercent: document.querySelector(
        "#malePercent, [data-male-percent], .male-percentage"
      ),
      femalePercent: document.querySelector(
        "#femalePercent, [data-female-percent], .female-percentage"
      ),
      maleFill: document.querySelector(
        "#maleFill, [data-male-fill], .male-fill"
      ),
      femaleFill: document.querySelector(
        "#femaleFill, [data-female-fill], .female-fill"
      ),
      genderContainer: document.querySelector(
        "[data-gender-display], .gender-ratio-container"
      ),
    };

    console.log("🔍 Gender elements check:", {
      malePercent: !!elements.malePercent,
      femalePercent: !!elements.femalePercent,
      maleFill: !!elements.maleFill,
      femaleFill: !!elements.femaleFill,
      genderContainer: !!elements.genderContainer,
    });

    return elements;
  }

  async fetchGenderDemographics() {
    console.log(
      "📊 ChartService: Fetching gender demographics from database..."
    );
    try {
      const url = `${window.location.origin}/golfzon/api/demographics/gender`;
      const response = await fetch(url);

      console.log(
        "📊 Gender API response.status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === "success" && data.data && data.data.has_data) {
        console.log("📊 Gender demographics fetched from database:", {
          malePercentage: data.data.male_percentage,
          femalePercentage: data.data.female_percentage,
          totalPersons: data.data.total_persons,
          dateRange: data.data.date_range,
          dataSource: data.data.data_source,
          isSample: data.data.is_sample,
        });
        return data.data;
      } else {
        console.warn("📊 No gender data available from database");
        return null; // ✅ CHANGED: Return null instead of sample data
      }
    } catch (error) {
      console.error("❌ Error fetching gender demographics:", error);
      return null; // ✅ CHANGED: Return null instead of sample data
    }
  }

  async initializeGenderAnimation() {
    console.log(
      "📊 ChartService: Initializing gender animation with database data..."
    );
    try {
      // Wait for DOM to be ready
      await new Promise((resolve) => setTimeout(resolve, 200));

      // ✅ FETCH REAL DATA from database
      const genderData = await this.fetchGenderDemographics();

      if (!genderData || !genderData.has_data) {
        console.warn(
          "📊 ChartService: No gender data available - showing empty state"
        );
        // ✅ SHOW EMPTY STATE instead of sample data
        this.setGenderPercent(0, 0);
        return;
      }

      console.log(
        "📊 ChartService: Setting gender animation with database data:",
        {
          male: Math.round(genderData.male_percentage),
          female: Math.round(genderData.female_percentage),
          totalPersons: genderData.total_persons,
        }
      );

      // ✅ SET REAL DATA from database
      this.setGenderPercent(
        Math.round(genderData.male_percentage),
        Math.round(genderData.female_percentage)
      );
    } catch (error) {
      console.error(
        "❌ ChartService: Error initializing gender animation:",
        error
      );
      // ✅ EMPTY STATE on error
      this.setGenderPercent(0, 0);
    }
  }

  setGenderPercent(male, female) {
    console.log(
      `📊 ChartService: Setting gender percentages - Male: ${male}%, Female: ${female}%`
    );
    try {
      // Find gender display elements
      const malePercent = document.querySelector(
        "#malePercent, [data-male-percent], .male-percentage"
      );
      const femalePercent = document.querySelector(
        "#femalePercent, [data-female-percent], .female-percentage"
      );

      // Find SVG fill elements
      const maleFill = document.querySelector(
        "#maleFill, [data-male-fill], .male-fill"
      );
      const femaleFill = document.querySelector(
        "#femaleFill, [data-female-fill], .female-fill"
      );

      // ✅ HANDLE EMPTY STATE
      if (male === 0 && female === 0) {
        if (malePercent) malePercent.textContent = "0%";
        if (femalePercent) femalePercent.textContent = "0%";

        if (maleFill) {
          maleFill.setAttribute("height", "0");
          maleFill.setAttribute("y", "400");
        }
        if (femaleFill) {
          femaleFill.setAttribute("height", "0");
          femaleFill.setAttribute("y", "400");
        }

        console.log("📊 Gender display set to empty state");
        return;
      }

      // Update percentage text display
      if (malePercent) {
        malePercent.textContent = `${male}%`;
        console.log("✅ Updated male percentage display:", `${male}%`);
      } else {
        console.warn("⚠️ Male percentage element not found");
      }

      if (femalePercent) {
        femalePercent.textContent = `${female}%`;
        console.log("✅ Updated female percentage display:", `${female}%`);
      } else {
        console.warn("⚠️ Female percentage element not found");
      }

      // Update SVG fill heights if available
      if (maleFill && femaleFill) {
        const maxHeight = 400; // Default SVG viewBox height

        // Calculate fill heights based on percentages
        const maleHeight = (maxHeight * male) / 100;
        const femaleHeight = (maxHeight * female) / 100;

        // Update male fill
        maleFill.setAttribute("y", maxHeight - maleHeight);
        maleFill.setAttribute("height", maleHeight);

        // Update female fill
        femaleFill.setAttribute("y", maxHeight - femaleHeight);
        femaleFill.setAttribute("height", femaleHeight);

        console.log(
          `✅ Updated SVG fills - Male: ${maleHeight}px, Female: ${femaleHeight}px`
        );
      } else {
        console.log(
          "ℹ️ SVG fill elements not found (this is normal if using different display method)"
        );
      }

      // Update data attributes for other display methods
      const genderContainer = document.querySelector(
        "[data-gender-display], .gender-ratio-container"
      );
      if (genderContainer) {
        genderContainer.setAttribute("data-male-percent", male);
        genderContainer.setAttribute("data-female-percent", female);
      }

      console.log(
        `✅ Gender percentages set successfully - Male: ${male}%, Female: ${female}%`
      );
    } catch (error) {
      console.error("❌ Error setting gender percentages:", error);
      console.warn("⚠️ Gender animation may not work - DOM elements not found");
    }
  }
}
