/** @odoo-module **/

import { Component, useRef, onMounted, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";

// Import services
import { WeatherService } from "./services/weather_service";
import { GolfDataService } from "./services/golf_data_service";
import { ChartService } from "./services/chart_service";

// Import utilities
import { DateUtils } from "./utils/date_utils";
import { LocalizationUtils } from "./utils/localization_utils";

class GolfzonDashboard extends Component {
  static template = "golfzon_dashboard.Dashboard";

  setup() {

    this._t = _t;
    // Initialize services
    try {
      this.rpc = useService("rpc");
      console.log("✅ RPC Service available");
    } catch (e) {
      console.warn("⚠️ RPC Service not available, using HTTP fallback");
      this.rpc = null;
    }
    this.weatherService = new WeatherService(this.rpc);
    this.golfDataService = new GolfDataService(this.rpc);
    this.chartService = new ChartService();

    // Chart references
    this.canvasRef = useRef("salesChart");
    this.visitorRef = useRef("visitorChart");
    this.ageRef = useRef("ageChart");
    this.menuDrawer = useRef("menuDrawer");
    this.reservationTrendChart = useRef("reservationTrendChart");
    this.memberTypeChart = useRef("memberTypeChart");
    this.advanceBookingChart = useRef("advanceBookingChart");
    this.regionalChart = useRef("regionalChart");
    this.heatmapCellDetails = {};

    this.state = useState({
      activeMenuItem: "dashboard",
      currentLanguage: LocalizationUtils.getStoredLanguage(),
      userName: "username",
      drawerOpen: false,
      showWeatherDetails: false,
      currentDate: DateUtils.formatCurrentDate(), // e.g., "Tuesday, September 16, 2025"
      userLocation: null,
      weather: {
        temperature: 27,
        precipitation: 0,
        chance: 0,
        icon: "☀️",
        location: "Detecting location...",
      },
      reservations: { current: 78, total: 80 },
      teeTime: {
        part1: { current: 40, total: 50 },
        part2: { current: 25, total: 30 },
        part3: { current: 7, total: 15 },
      },
      hourlyWeather: [],
      reservationDetails: [],
      performanceData: this.golfDataService.getDefaultPerformanceData(),
      activities: [],
      customer_growth: [],
      forecastData: {
        forecast_chart: [],
        calendar_data: [],
        pie_charts: {},
        summary_stats: {
          total_reservations: 2926,
          utilization_rate: 78.5,
          month_comparison: { month1: 82.4, month2: 76.2, month3: 75.3 },
          yearly_growth: 10,
        },
        analysis_period: DateUtils.generateAnalysisPeriod(),
      },
      selectedPeriod: "30days",
      showReservationDetails: false,
      selectedSlot: { day: "", period: "", count: 0 },
      heatmapData: this.getInitialHeatmapData(),
      selectedHeatmapBox: this.getDefaultHeatmapBox(),

      visitorData: {
        totalVisitors: 0,
        growthPercentage: 0,
        sectionTotals: { part1: 0, part2: 0, part3: 0 },
        isGrowthPositive: true,
      },
      salesData: {
        totals: {
          current_total: 0,
          growth_percentage: 0,
          average_unit_price: 0,
        },
        current_data: [],
        prev_year_data: [],
        labels: [],
      },
      hasTrendDown: false,

      ...DateUtils.generatePeriodLabels(),
    });

    this.setPeriod = this.setPeriod.bind(this);

    onMounted(() => this.onMounted());
  }

  getInitialHeatmapData() {
    return {
      headers: [
        this._t("Sunday"),
        this._t("Monday"),
        this._t("Tuesday"),
        this._t("Wednesday"),
        this._t("Thursday"),
        this._t("Friday"),
        this._t("Saturday")
      ],
      rows: [
        { "label": this._t("Early Morning(5 AM -7 AM)"), "data": [0, 0, 0, 0, 0, 0, 0] },
        { "label": this._t("Morning(8 AM -12 PM)"), "data": [0, 0, 0, 0, 0, 0, 0] },
        { "label": this._t("Afternoon(1 PM -4 PM)"), "data": [0, 0, 0, 0, 0, 0, 0] },
        { "label": this._t("Night(5 PM -7 PM)"), "data": [0, 0, 0, 0, 0, 0, 0] }
      ],
      date_range: this._t("No data available")
    };
  }

  getDefaultHeatmapBox() {
    return {
      dayIndex: null,
      timeIndex: null,
      value: null,
      day: null,
      timeSlot: null,
      displayDay: "",
      displayTime: "",
      hourlyBreakdown: [],
      isHighest: false,
      isLowest: false,
      isVisible: false,
    };
  }

  async onMounted() {
    console.log("Dashboard mounted - initializing...");

    this.state.visitorData = {
      totalVisitors: 0,
      growthPercentage: 0,
      sectionTotals: { part1: 0, part2: 0, part3: 0 },
      isGrowthPositive: true,
    };
    this.state.hasTrendDown = false;

    await this.loadHeatmapData();
    await this.loadSalesData(this.state.selectedPeriod);

    // Initialize all data
    await Promise.all([
      this.initializeLocation(),
      this.loadDashboardData(),
      this.loadPerformanceData(),
    ]);

    // Wait for DOM to render
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Initialize charts after DOM is ready
    await this.initializeAllCharts();

    // Event listeners
    document.addEventListener("click", this.handleOutsideDrawer.bind(this));
  }

  async initializeLocation() {
    try {
      const locationData = await this.weatherService.detectUserLocation();
      this.state.userLocation = {
        lat: locationData.lat,
        lon: locationData.lon,
      };
      this.state.weather.location = locationData.locationName;
      await this.loadWeatherAndGolfData(locationData.lat, locationData.lon);
    } catch (error) {
      console.error("Location initialization failed:", error);
      await this.loadWeatherAndGolfData();
    }
  }

  async loadWeatherAndGolfData(lat = null, lon = null) {
    try {
      const [weatherData, golfData] = await Promise.all([
        this.weatherService.fetchWeatherData(lat, lon),
        this.golfDataService.fetchGolfInfo(lat, lon),
      ]);

      this.state.weather = { ...this.state.weather, ...weatherData.current };
      this.state.hourlyWeather = weatherData.hourly;
      this.state.reservations = golfData.reservations;
      this.state.teeTime = golfData.teeTime;
      this.state.reservationDetails = golfData.reservationDetails;
    } catch (error) {
      console.error("Error loading weather and golf data:", error);
    }
  }

  async loadDashboardData() {
    try {
      const data = await this.golfDataService.fetchDashboardData();
      this.state.activities = data.activities;
      this.state.customer_growth = data.customer_growth;
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  }

  async loadPerformanceData() {
    console.log("🔄 Loading performance data...");

    try {
      const url =
        window.location.origin + "/golfzon/api/performance_indicators";
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.status === "success" && data.data) {
          // ✅ ENHANCED: Process trend values to ensure correct +/- symbols
          const processedData = {
            sales_performance: {
              current_revenue:
                data.data.sales_performance.cumulative_sales_year.toLocaleString(),
              monthly_revenue:
                data.data.sales_performance.current_month_sales.toLocaleString(),
              current_trend: this.formatTrendValue(
                data.data.sales_performance.year_growth
              ),
              monthly_trend: this.formatTrendValue(
                data.data.sales_performance.month_growth
              ),
            },
            avg_order_value: {
              current_weekly_value:
                data.data.average_order_performance.cumulative_unit_price_year.toLocaleString(),
              monthly_value:
                data.data.average_order_performance.current_monthly_guest_price.toLocaleString(),
              current_trend: "+11%", // You can calculate from database if available
              monthly_trend: "+13%", // You can calculate from database if available
            },
            utilization_rate: {
              current_weekly_capacity: data.data.utilization_performance
                ? data.data.utilization_performance.cumulative_operation_year.toLocaleString()
                : "0",
              monthly_capacity: data.data.utilization_performance
                ? data.data.utilization_performance.current_month_operation.toLocaleString()
                : "0",
              current_trend: data.data.utilization_performance
                ? this.formatTrendValue(
                  data.data.utilization_performance.year_growth
                )
                : "0%",
              monthly_trend: data.data.utilization_performance
                ? this.formatTrendValue(
                  data.data.utilization_performance.month_growth
                )
                : "0%",
            },
          };

          this.state.performanceData = processedData;
          console.log(
            "✅ Performance data loaded:",
            this.state.performanceData
          );
        }
      }
    } catch (error) {
      console.error("❌ Error loading performance data:", error);
      // Keep default values with proper formatting
    }
  }

  // ✅ NEW: Helper method to format trend values correctly
  formatTrendValue(value) {
    if (typeof value !== "number") return "0%";

    // Ensure proper sign display
    const sign = value >= 0 ? "+" : ""; // Negative numbers already have minus sign
    return `${sign}${value}%`;
  }

  async initializeAllCharts() {
    console.log("Initializing all charts with data...");

    // Wait for DOM to render
    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvasElements = [
      { name: "salesChart", ref: this.canvasRef },
      { name: "visitorChart", ref: this.visitorRef },
      { name: "ageChart", ref: this.ageRef },
      { name: "reservationTrendChart", ref: this.reservationTrendChart },
      { name: "memberTypeChart", ref: this.memberTypeChart },
      { name: "advanceBookingChart", ref: this.advanceBookingChart },
      { name: "regionalChart", ref: this.regionalChart },
    ];

    canvasElements.forEach(({ name, ref }) => {
      if (!ref.el) {
        console.warn(`Canvas element not found: ${name}`);
      } else {
        console.log(`✅ Canvas element found: ${name}`);
      }
    });

    await this.updateAllCharts();

    if (this.ageRef.el) {
      try {
        console.log("🔄 Creating age chart with database data...");
        await this.chartService.createAgeChart(this.ageRef.el);
      } catch (error) {
        console.error("❌ Error creating age chart:", error);
      }
    } else {
      console.warn("❌ Age chart canvas not found");
    }

    this.initializePieCharts();

    setTimeout(async () => {
      try {
        console.log("🔄 Initializing gender animation with database data...");

        // Check if chart service is available
        if (!this.chartService) {
          console.error("❌ ChartService not available for gender animation");
          return;
        }

        // Check if the method exists
        if (typeof this.chartService.initializeGenderAnimation !== "function") {
          console.error(
            "❌ initializeGenderAnimation method not found in ChartService"
          );
          return;
        }

        await this.chartService.initializeGenderAnimation();
      } catch (error) {
        console.error("❌ Error initializing gender animation:", error);
        console.log(
          "📋 Available chartService methods:",
          Object.getOwnPropertyNames(Object.getPrototypeOf(this.chartService))
        );
      }
    }, 500);
  }

  initializePieCharts() {
    const pieChartConfigs = [
      {
        ref: this.memberTypeChart,
        id: "memberType",
        data: [76, 13, 2, 8, 1],
        colors: ["#1958a4", "#4489da", "#4c9cfd", "#3a96d4"],
      },
      {
        ref: this.advanceBookingChart,
        id: "advanceBooking",
        data: [43, 17, 26, 7, 6, 1],
        colors: [
          "#1958a4",
          "#4489da",
          "#4c9cfd",
          "#3a96d4",
          "#5ab4f0",
          "#91d3ff",
        ],
      },
      {
        ref: this.regionalChart,
        id: "regional",
        data: [48, 19, 8, 7, 18],
        colors: ["#1958a4", "#4489da", "#4c9cfd", "#3a96d4", "#5ab4f0"],
      },
    ];

    pieChartConfigs.forEach((config) => {
      if (config.ref.el) {
        this.chartService.createPieChart(
          config.ref.el,
          config.id,
          config.data,
          config.colors
        );
      }
    });
  }

  // ✅ ADD/UPDATE this method in your GolfzonDashboard class:

  async loadSalesData(period = "30days") {
    console.log(`🔄 Loading sales data for period: ${period}`);

    try {
      const url =
        window.location.origin + `/golfzon/api/sales_trends?period=${period}`;
      console.log(`📞 Fetching sales data from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const salesResponse = await response.json();
      console.log("📊 Sales response received:", salesResponse);

      if (salesResponse.status === "success" && salesResponse.data) {
        // ✅ UPDATE SALES DATA in state
        this.state.salesData = {
          totals: {
            current_total: salesResponse.data.totals.current_total || 0,
            growth_percentage: salesResponse.data.totals.growth_percentage || 0,
            average_unit_price:
              salesResponse.data.totals.average_unit_price || 0,
          },
          current_data: salesResponse.data.current_data || [],
          prev_year_data: salesResponse.data.prev_year_data || [],
          labels: salesResponse.data.labels || [],
        };

        console.log("✅ Sales data loaded successfully:", {
          totalSales: this.state.salesData.totals.current_total,
          growth: this.state.salesData.totals.growth_percentage,
          avgPrice: this.state.salesData.totals.average_unit_price,
        });

        // ✅ REPLACE WITH THIS CODE:
        const currentDate = new Date();
        const days = period === '7days' ? 7 : 30;
        const endDate = new Date(currentDate);
        const startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - days - 1);

        const currentLang = this.state.currentLanguage || 'en_US';
        const locale = currentLang === 'ko_KR' ? 'ko-KR' : 'en-US';

        // Format dates: "August 29, 2025 – September 27, 2025"
        const startFormatted = startDate.toLocaleDateString(locale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const endFormatted = endDate.toLocaleDateString(locale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const daysLabel = period === '7days' ? '7' : '30';
        const periodPrefix = this._t("Analysis period: The Last");
        const daysSuffix = this._t(" days");

        const periodText = `${periodPrefix} ${daysLabel} ${daysSuffix} (${startFormatted} – ${endFormatted})`;

        this.state.forecastData.analysis_period = periodText;
      } else {
        console.error(
          "❌ Sales data fetch failed:",
          salesResponse.message || "Unknown error"
        );
        // Keep default zero values
      }
    } catch (error) {
      console.error("❌ Error loading sales data:", error);
      // Keep default zero values
    }
  }

  async setPeriod(period) {
    console.log(`🔄 Setting period to: ${period}`);
    if (this.state.selectedPeriod !== period) {
      this.state.selectedPeriod = period;

      // ✅ Reload sales data for new period
      await this.loadSalesData(period);

      // Update charts and visitor data
      await this.updateAllCharts();
    }
  }

  async updateAllCharts() {
    try {
      console.log("🔄 Dashboard: Updating all charts with database data...");

      if (this.canvasRef.el) {
        this.chartService.createSalesChart(
          this.canvasRef.el,
          this.state.selectedPeriod
        );
      }

      if (this.visitorRef.el) {
        console.log("🔄 Dashboard: Creating visitor chart via HTTP");
        await this.chartService.createVisitorChart(
          this.visitorRef.el,
          this.state.selectedPeriod
        );
      }
      await this.updateVisitorCards(this.state.selectedPeriod);

      if (this.reservationTrendChart.el) {
        console.log("🔄 Dashboard: Creating reservation chart via HTTP");

        await this.chartService.createReservationChart(
          this.reservationTrendChart.el,
          this.state.selectedPeriod,
          null // Pass null
        );
      }

      this.updateChartStatistics();
    } catch (error) {
      console.error("❌ Dashboard: Error updating charts:", error);
    }
  }

  updateChartStatistics() {
    // Update the statistics shown below the chart
    const stats = this.chartService.getChartStatistics();
    const breakdown = this.chartService.getOperationBreakdown();

    // Update state for template display
    this.state.forecastData.summary_stats = {
      total_reservations: stats.current_total,
      utilization_rate: stats.operation_rate,
      growth_percentage: stats.growth_percentage,
      month_comparison: {
        month1: breakdown.part1,
        month2: breakdown.part2,
        month3: breakdown.part3,
      },
    };
  }

  async updateVisitorCards(period) {
    console.log(`🔄 Dashboard: Updating visitor cards for ${period}...`);

    try {
      const url =
        window.location.origin + `/golfzon/api/visitor_data?period=${period}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "success") {
        const visitorData = data.data;

        console.log("✅ Dashboard: Visitor cards data loaded:", {
          currentTotal: visitorData.totals.current_total,
          growth: visitorData.totals.growth_percentage,
          sections: visitorData.section_totals,
        });

        // ✅ FIXED: Set hasTrendDown as state property, not getter
        this.state.visitorData = {
          totalVisitors: visitorData.totals.current_total,
          growthPercentage: visitorData.totals.growth_percentage,
          sectionTotals: visitorData.section_totals,
          isGrowthPositive: visitorData.totals.growth_percentage >= 0,
        };

        // ✅ FIXED: Set hasTrendDown as state property for XML template
        this.state.hasTrendDown = visitorData.totals.growth_percentage < 0;
      } else {
        console.error("❌ Dashboard: Failed to load visitor cards data");
        // Set default values
        this.state.visitorData = {
          totalVisitors: 0,
          growthPercentage: 0,
          sectionTotals: { part1: 0, part2: 0, part3: 0 },
          isGrowthPositive: true,
        };
        this.state.hasTrendDown = false;
      }
    } catch (error) {
      console.error("❌ Dashboard: Error updating visitor cards:", error);
      // Set default values on error
      this.state.visitorData = {
        totalVisitors: 0,
        growthPercentage: 0,
        sectionTotals: { part1: 0, part2: 0, part3: 0 },
        isGrowthPositive: true,
      };
      this.state.hasTrendDown = false;
    }
  }

  setActiveMenuItem(item) {
    this.state.activeMenuItem = item;
  }

  async setPeriod(period) {
    if (this.state.selectedPeriod !== period) {
      this.state.selectedPeriod = period;
      console.log(`📊 Period changed to: ${period}`);

      // Update both charts and visitor data
      await this.updateAllCharts();
    }
  }

  toggleWeatherDetails() {
    this.state.showWeatherDetails = !this.state.showWeatherDetails;
  }

  toggleDrawer(ev) {
    ev.stopPropagation();
    this.state.drawerOpen = !this.state.drawerOpen;
    if (this.menuDrawer.el) {
      this.menuDrawer.el.classList.toggle("open", this.state.drawerOpen);
    }
  }

  handleOutsideDrawer(ev) {
    if (
      this.state.drawerOpen &&
      this.menuDrawer.el &&
      !ev.target.closest(".menu-drawer") &&
      !ev.target.closest(".menu-btn")
    ) {
      this.state.drawerOpen = false;
      this.menuDrawer.el.classList.remove("open");
    }
  }

  switchLanguage(lang) {
    this.state.currentLanguage = lang;
    LocalizationUtils.switchLanguage(lang);
  }

  logout() {
    window.location.href = "/custom/logout";
  }

  getHeatmapCellClass(value) {
    if (typeof value !== "number" || value === 0) return "bottom-20";

    const allValues = this.getAllHeatmapValues().filter((v) => v > 0);
    if (allValues.length === 0) return "bottom-20";

    allValues.sort((a, b) => b - a);

    const total = allValues.length;
    const top20Index = Math.ceil(total * 0.2);
    const top40Index = Math.ceil(total * 0.4);
    const top60Index = Math.ceil(total * 0.6);
    const top80Index = Math.ceil(total * 0.8);

    const valueRank = allValues.indexOf(value) + 1;

    if (valueRank <= top20Index) return "top-20";
    if (valueRank <= top40Index) return "top-20-40";
    if (valueRank <= top60Index) return "median-20";
    if (valueRank <= top80Index) return "bottom-20-40";
    return "bottom-20";
  }

  getAllHeatmapValues() {
    const allValues = [];
    if (this.state.heatmapData && this.state.heatmapData.rows) {
      this.state.heatmapData.rows.forEach((row) => {
        if (row.data && Array.isArray(row.data)) {
          row.data.forEach((cellValue) => {
            if (typeof cellValue === "number" && cellValue > 0) {
              allValues.push(cellValue);
            }
          });
        }
      });
    }
    return allValues;
  }

  async loadHeatmapData() {
    console.log("🔄 Loading heatmap data with Korean translation support...");
    try {
      const response = await fetch('/golfzon/api/heatmap_data');
      const data = await response.json();

      console.log('📊 Heatmap API response:', {
        status: data.status,
        hasData: data.data ? true : false,
        headersCount: data.data?.headers?.length,
        rowsCount: data.data?.rows?.length,
        cellDetailsCount: Object.keys(data.data?.cell_details || {}).length
      });

      // ✅ CRITICAL: Log the raw data from backend
      if (data.data && data.data.rows) {
        console.log('📊 Raw heatmap data from backend:');
        data.data.rows.forEach((row, idx) => {
          console.log(`   Row ${idx} (${row.label}):`, row.data);
        });
      }

      if (data.status === 'success' && data.data) {
        // ✅ FIX: Apply Korean translations to headers WITHOUT breaking data
        const translatedHeaders = (data.data.headers || []).map(header => {
          const translations = {
            'Sunday': this._t("Sunday"),
            'Monday': this._t("Monday"),
            'Tuesday': this._t("Tuesday"),
            'Wednesday': this._t("Wednesday"),
            'Thursday': this._t("Thursday"),
            'Friday': this._t("Friday"),
            'Saturday': this._t("Saturday")
          };
          return translations[header] || header;
        });

        // ✅ FIX: Apply Korean translations to time slot labels WITHOUT breaking data
        const translatedRows = (data.data.rows || []).map(row => {
          const labelTranslations = {
            'Early Morning (5 AM - 7 AM)': this._t("Early Morning(5 AM -7 AM)"),
            'Morning (8 AM - 12 PM)': this._t("Morning(8 AM -12 PM)"),
            'Afternoon (1 PM - 4 PM)': this._t("Afternoon(1 PM -4 PM)"),
            'Night (5 PM - 7 PM)': this._t("Night(5 PM -7 PM)")
          };

          // ✅ CRITICAL: Preserve original data array exactly as received
          return {
            label: labelTranslations[row.label] || row.label,
            data: Array.isArray(row.data) ? [...row.data] : [0, 0, 0, 0, 0, 0, 0]
          };
        });

        // ✅ CRITICAL: Verify data preservation
        console.log('📊 Translated data verification:');
        translatedRows.forEach((row, idx) => {
          console.log(`   Row ${idx} (${row.label}):`, row.data);
        });

        // ✅ FIX: Store translated data with original numeric values preserved
        this.state.heatmapData = {
          headers: translatedHeaders,
          rows: translatedRows,
          date_range: data.data.date_range || "No data available"
        };

        // ✅ FIX: STORE PRE-CALCULATED DETAILS for instant access
        this.heatmapCellDetails = data.data.cell_details || {};

        console.log('✅ Heatmap data loaded successfully!', {
          headers: translatedHeaders,
          rowsCount: translatedRows.length,
          totalCells: translatedRows.reduce((sum, row) => sum + row.data.reduce((a, b) => a + b, 0), 0),
          cellDetailsKeys: Object.keys(this.heatmapCellDetails).length
        });
      } else {
        console.error('❌ Failed to load heatmap data:', data.message);
        this.state.heatmapData = this.getInitialHeatmapData();
        this.heatmapCellDetails = {};
      }
    } catch (error) {
      console.error('❌ Error loading heatmap data:', error);
      this.state.heatmapData = this.getInitialHeatmapData();
      this.heatmapCellDetails = {};
    }
  }


  selectHeatmapBox(boxData, event) {
    console.log("🎯 Heatmap box selected:", boxData);

    if (event) {
      event.stopPropagation();
    }

    const cellKey = `${boxData.dayIndex}_${boxData.timeIndex}`;
    const cellDetails = this.heatmapCellDetails[cellKey];

    let hourlyBreakdown = [];

    if (cellDetails && cellDetails.hourly_breakdown) {
      // ✅ FIX: Apply translations
      hourlyBreakdown = cellDetails.hourly_breakdown.map(item => {
        let hourText = item.hour;
        let teamsText = item.teams;

        // Translate AM/PM → 오전/오후
        if (hourText.includes('AM')) {
          hourText = hourText.replace('AM', this._t('AM'));
        } else if (hourText.includes('PM')) {
          hourText = hourText.replace('PM', this._t('PM'));
        }

        // Translate teams → 팀
        teamsText = teamsText.replace('teams', this._t('teams'))
          .replace('team', this._t('team'));

        return {
          hour: hourText,
          teams: teamsText
        };
      });
    }

    // ✅ FIX: Translate day name
    const dayTranslations = {
      'Sunday': this._t('Sunday'),
      'Monday': this._t('Monday'),
      'Tuesday': this._t('Tuesday'),
      'Wednesday': this._t('Wednesday'),
      'Thursday': this._t('Thursday'),
      'Friday': this._t('Friday'),
      'Saturday': this._t('Saturday')
    };

    const displayDay = dayTranslations[boxData.day] || boxData.day;

    // Find highest/lowest
    const allValues = this.state.heatmapData.rows
      .flatMap(row => row.data)
      .filter(val => val > 0);

    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);

    this.state.selectedHeatmapBox = {
      isVisible: true,
      dayIndex: boxData.dayIndex,
      timeIndex: boxData.timeIndex,
      value: boxData.value,
      day: boxData.day,
      displayDay: displayDay,  // ✅ Translated day
      timeSlot: boxData.timeSlot,
      hourlyBreakdown: hourlyBreakdown,  // ✅ Translated breakdown
      isHighest: boxData.value === maxValue && boxData.value > 0,
      isLowest: boxData.value === minValue && boxData.value > 0
    };
  }


  formatDayDisplayOnly(day) {
    const dayMap = {
      Mon: this._t("Monday"),
      Tue: this._t("Tuesday"),
      Wed: this._t("Wednesday"),
      Thu: this._t("Thursday"),
      Fri: this._t("Friday"),
      Sat: this._t("Saturday"),
      Sun: this._t("Sunday"),
    };
    return dayMap[day] || day;
  }

  willDestroy() {
    super.willDestroy();
    this.chartService.destroyAllCharts();
    document.removeEventListener("click", this.handleOutsideDrawer.bind(this));
  }
}

registry.category("actions").add("golfzon.dashboard", GolfzonDashboard);
export default GolfzonDashboard;
