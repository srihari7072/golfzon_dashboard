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
    const rpcService = this.tryGetService("rpc");
    this.weatherService = new WeatherService(rpcService);
    this.golfDataService = new GolfDataService(rpcService);
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

    this.state = useState({
      activeMenuItem: "dashboard",
      currentLanguage: LocalizationUtils.getStoredLanguage(),
      userName: "username",
      drawerOpen: false,
      showWeatherDetails: false,
      currentDate: DateUtils.formatCurrentDate(),
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

      // 🆕 FIXED: Always-visible sidebar state
      selectedHeatmapBox: this.getDefaultHeatmapBox(),

      ...DateUtils.generatePeriodLabels(),
    });

    onMounted(() => this.onMounted());
  }

  tryGetService(serviceName) {
    try {
      return useService(serviceName);
    } catch (e) {
      console.warn(
        `${serviceName} service not available, using fallback behavior`
      );
      return null;
    }
  }

  getInitialHeatmapData() {
    return {
      headers: [
        _t("Sun"),
        _t("Mon"),
        _t("Tue"),
        _t("Wed"),
        _t("Thu"),
        _t("Fri"),
        _t("Sat"),
      ],
      rows: [
        { label: _t("Dawn (5 AM -7 AM)"), data: [0, 0, 0, 0, 0, 0, 0] },
        { label: _t("Morning (8 AM - 12 PM)"), data: [0, 0, 0, 0, 0, 0, 0] },
        { label: _t("Afternoon (1 PM - 4 PM)"), data: [0, 0, 0, 0, 0, 0, 0] },
        { label: _t("Night (5 PM - 7 PM)"), data: [0, 0, 0, 0, 0, 0, 0] },
      ],
    };
  }

  // 🆕 NEW: Default sidebar content
  getDefaultHeatmapBox() {
    return {
      dayIndex: 4, // Friday
      timeIndex: 1, // Morning
      value: 8,
      day: _t("Fri"),
      timeSlot: _t("Morning (8am-12pm)"),
      displayDay: "friday",
      displayTime: "morning",
      hourlyBreakdown: [
        { hour: "8 o'clock", count: 0, teams: "0 teams" },
        { hour: "9 o'clock", count: 1, teams: "1 team" },
        { hour: "10 o'clock", count: 3, teams: "3 teams" },
        { hour: "11 o'clock", count: 3, teams: "3 teams" },
        { hour: "12 o'clock", count: 1, teams: "1 team" },
      ],
      isHighest: false,
      isLowest: false,
    };
  }

  async onMounted() {
    console.log("Dashboard mounted - initializing...");

    // Initialize heatmap data
    this.setDefaultForecastData();

    // Initialize all data
    await Promise.all([
      this.initializeLocation(),
      this.loadDashboardData(),
      this.loadPerformanceData(),
    ]);

    // Wait for DOM to render
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Initialize charts after DOM is ready
    this.initializeAllCharts();

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

  initializeAllCharts() {
    console.log("Initializing all charts...");

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
      }
    });

    this.updateAllCharts();

    if (this.ageRef.el) {
      this.chartService.createAgeChart(this.ageRef.el);
    }

    this.initializePieCharts();

    setTimeout(() => {
      this.chartService.initializeGenderAnimation();
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

  updateAllCharts() {
    if (this.canvasRef.el) {
      this.chartService.createSalesChart(
        this.canvasRef.el,
        this.state.selectedPeriod
      );
    }

    if (this.visitorRef.el) {
      this.chartService.createVisitorChart(
        this.visitorRef.el,
        this.state.selectedPeriod
      );
    }

    if (this.reservationTrendChart.el) {
      this.chartService.createReservationChart(
        this.reservationTrendChart.el,
        this.state.selectedPeriod
      );
    }
  }

  // Event handlers
  setActiveMenuItem(item) {
    this.state.activeMenuItem = item;
  }

  setPeriod(period) {
    this.state.selectedPeriod = period;
    this.updateAllCharts();
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

  // 🆕 ENHANCED: Utility methods for heatmap
  getHeatmapCellClass(value) {
    if (typeof value !== "number") return "heatmap-cell bottom-20";

    const allValues = this.getAllHeatmapValues();
    if (allValues.length === 0) return "heatmap-cell bottom-20";

    allValues.sort((a, b) => a - b);

    const p80 = this.calculatePercentile(allValues, 80);
    const p60 = this.calculatePercentile(allValues, 60);
    const p50 = this.calculatePercentile(allValues, 50);
    const p40 = this.calculatePercentile(allValues, 40);

    if (value >= p80) return "heatmap-cell top-20";
    if (value >= p60) return "heatmap-cell top-20-40";
    if (value >= p50) return "heatmap-cell median-20";
    if (value >= p40) return "heatmap-cell bottom-20-40";
    return "heatmap-cell bottom-20";
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

  calculatePercentile(sortedArray, percentile) {
    const index = (percentile / 100) * (sortedArray.length - 1);
    if (Math.floor(index) === index) {
      return sortedArray[index];
    } else {
      const i = Math.floor(index);
      const fraction = index - i;
      return sortedArray[i] + (sortedArray[i + 1] - sortedArray[i]) * fraction;
    }
  }

  // 🆕 FIXED: Box selection updates sidebar content only
  selectHeatmapBox(box, event) {
    event.stopPropagation();

    // Clear previous selections
    document.querySelectorAll(".heatmap-cell.selected").forEach((el) => {
      el.classList.remove("selected");
    });

    // Select current box
    event.target.closest(".heatmap-cell").classList.add("selected");

    // Generate detailed breakdown
    const hourlyBreakdown = this.generateHourlyBreakdown(
      box.timeSlot,
      box.value
    );
    const allValues = this.getAllHeatmapValues();
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues.filter((v) => v > 0));

    // Update sidebar content only (no layout shift)
    this.state.selectedHeatmapBox = {
      ...box,
      hourlyBreakdown: hourlyBreakdown,
      isHighest: box.value === maxValue,
      isLowest: box.value === minValue,
      displayDay: box.day.toLowerCase(),
      displayTime: this.formatTimeDisplay(box.timeSlot),
    };
  }

  formatTimeDisplay(timeSlot) {
    const timeMap = {
      "Dawn (5 AM - 7 AM)": "morning",
      "Morning (8 AM - 12 PM)": "morning",
      "Afternoon (1 PM - 4 PM)": "afternoon",
      "Night (5 PM - 7 PM)": "evening",
    };
    return timeMap[timeSlot] || "morning";
  }

  generateHourlyBreakdown(timeSlot, totalValue) {
    const timeRanges = {
      "Dawn (5 AM -7 AM)": [5, 6, 7],
      "Morning (8 AM -12 PM)": [8, 9, 10, 11, 12],
      "Afternoon (1 PM - 4 PM)": [13, 14, 15, 16],
      "Night (5 PM - 7 PM)": [17, 18, 19],
    };

    const hours = timeRanges[timeSlot] || [8, 9, 10, 11, 12];
    const breakdown = [];
    let remaining = totalValue;

    hours.forEach((hour, index) => {
      let count;
      if (index === hours.length - 1) {
        count = remaining;
      } else {
        const maxCount = Math.ceil(totalValue / hours.length);
        count = Math.min(remaining, Math.floor(Math.random() * maxCount) + 1);
        remaining = Math.max(0, remaining - count);
      }

      breakdown.push({
        hour: `${hour} o'clock`,
        count: count,
        teams:
          count === 0 ? "0 teams" : count === 1 ? "1 team" : `${count} teams`,
      });
    });

    return breakdown;
  }

  // Backward compatibility
  showReservationDetails(timePeriod, dayIndex, count, event) {
    const days = [
      _t("Sun"),
      _t("Mon"),
      _t("Tue"),
      _t("Wed"),
      _t("Thu"),
      _t("Fri"),
      _t("Sat"),
    ];

    this.selectHeatmapBox(
      {
        dayIndex: dayIndex,
        timeIndex: 0,
        value: count,
        day: days[dayIndex],
        timeSlot: timePeriod,
      },
      event
    );
  }

  setDefaultForecastData() {
    // Use exact data from reference image
    const daysOfWeek = [
      _t("Sun"),
      _t("Mon"),
      _t("Tue"),
      _t("Wed"),
      _t("Thu"),
      _t("Fri"),
      _t("Sat"),
    ];

    const heatmapData = {
      headers: daysOfWeek,
      rows: [
        { label: _t("Dawn (5 AM -7 AM)"), data: [23, 10, 12, 10, 16, 13, 1] },
        { label: _t("Morning (8 AM -12 PM)"), data: [12, 5, 5, 6, 5, 8, 2] },
        { label: _t("Afternoon (1 PM -4 PM)"), data: [18, 13, 5, 3, 5, 6, 3] },
        { label: _t("Night (5 PM -7 PM)"), data: [0, 18, 10, 15, 22, 28, 10] },
      ],
    };

    this.state.heatmapData = heatmapData;
  }

  willDestroy() {
    super.willDestroy();
    this.chartService.destroyAllCharts();
    document.removeEventListener("click", this.handleOutsideDrawer.bind(this));
  }
}

registry.category("actions").add("golfzon.dashboard", GolfzonDashboard);
export default GolfzonDashboard;
