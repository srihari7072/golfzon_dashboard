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

    // Expose _t to the template context
    this._t = _t;

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
      hasTrendDown: false,

      ...DateUtils.generatePeriodLabels(),
    });

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
        this._t("Saturday"),
      ],
      rows: [
        {
          label: this._t("Early Morning(5 AM -7 AM)"),
          data: [0, 0, 0, 0, 0, 0, 0],
        },
        { label: this._t("Morning(8 AM -12 PM)"), data: [0, 0, 0, 0, 0, 0, 0] },
        {
          label: this._t("Afternoon(1 PM -4 PM)"),
          data: [0, 0, 0, 0, 0, 0, 0],
        },
        { label: this._t("Night(5 PM -7 PM)"), data: [0, 0, 0, 0, 0, 0, 0] },
      ],
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
    try {
      const data = await this.golfDataService.fetchPerformanceData();
      this.state.performanceData = data;
    } catch (error) {
      console.error("Error loading performance data:", error);
    }
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
      await this.chartService.createAgeChart(this.ageRef.el);
    }

    this.initializePieCharts();

    setTimeout(async () => {
      await this.chartService.initializeGenderAnimation();
    }, 200);
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
        this.state.hasTrendDown = false; // ✅ Default value
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
      this.state.hasTrendDown = false; // ✅ Default value
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
    window.location.href = "/web/session/logout";
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
    console.log("🔄 Loading heatmap data with pre-calculated details...");

    try {
      const response = await fetch("/golfzon/api/heatmap_data");
      const data = await response.json();

      if (data.status === "success") {
        console.log("✅ Heatmap data with details loaded:", {
          dateRange: data.data.date_range,
          headers: data.data.headers,
          rowsCount: data.data.rows.length,
          preCalculatedCells: Object.keys(data.data.cell_details).length,
        });

        // Store both heatmap data AND pre-calculated details
        this.state.heatmapData = {
          headers: data.data.headers,
          rows: data.data.rows,
          date_range: data.data.date_range,
        };

        // ✅ STORE PRE-CALCULATED DETAILS for instant access
        this.heatmapCellDetails = data.data.cell_details;

        console.log("📊 Heatmap ready for instant interactions");
      } else {
        console.error("❌ Failed to load heatmap data:", data.message);
        // Even on error, we have empty but valid structure
        if (data.data && data.data.cell_details) {
          this.heatmapCellDetails = data.data.cell_details;
        }
      }
    } catch (error) {
      console.error("❌ Error loading heatmap data:", error);
      // Initialize empty details to prevent errors
      this.heatmapCellDetails = {};
    }
  }

  selectHeatmapBox(box, event) {
    event.stopPropagation();

    console.log("🔄 Box clicked - instant response:", {
      day: box.day,
      dayIndex: box.dayIndex,
      timeIndex: box.timeIndex,
      boxValue: box.value,
    });

    // Visual selection
    document.querySelectorAll(".heatmap-box.selected").forEach((el) => {
      el.classList.remove("selected");
    });
    event.target.closest(".heatmap-box").classList.add("selected");

    // ✅ INSTANT ACCESS to pre-calculated details
    const cellKey = `${box.dayIndex}_${box.timeIndex}`;
    const cellDetails = this.heatmapCellDetails[cellKey];

    if (cellDetails) {
      console.log("✅ Instant cell details:", {
        dayName: cellDetails.day_name,
        date: cellDetails.date,
        totalTeams: cellDetails.total_teams,
        hourlyItems: cellDetails.hourly_breakdown.length,
      });

      // Determine if highest/lowest
      const allValues = this.getAllHeatmapValues();
      const maxValue = Math.max(...allValues);
      const minValue = Math.min(...allValues.filter((v) => v > 0));

      // ✅ INSTANT UPDATE - no waiting, no loading
      this.state.selectedHeatmapBox = {
        ...box,
        displayDay: cellDetails.day_name,
        date: cellDetails.date,
        hourlyBreakdown: cellDetails.hourly_breakdown,
        isHighest: box.value === maxValue && box.value > 0,
        isLowest:
          box.value === minValue &&
          box.value > 0 &&
          allValues.filter((v) => v > 0).length > 1,
        isVisible: true,
        hasData: cellDetails.has_data,
      };

      console.log("📊 Sidebar updated instantly!");
    } else {
      console.warn("⚠️ No pre-calculated details found for cell:", cellKey);

      // Show basic info
      this.state.selectedHeatmapBox = {
        ...box,
        displayDay: this.formatDayDisplayOnly(box.day),
        hourlyBreakdown: [{ hour: "No data", teams: this._t("teams") }],
        isHighest: false,
        isLowest: false,
        isVisible: true,
        hasData: false,
      };
    }
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
