/** @odoo-module **/

import { Component, useRef, onMounted, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { _t } from "@web/core/l10n/translation";
import { rpc } from "@web/core/network/rpc";

// Import services
import { WeatherService } from "./services/weather_service";
import { GolfDataService } from "./services/golf_data_service";
import { ChartService } from "./services/chart_service";
import { SalesService } from "./services/sales_service";
import { VisitorService } from "./services/visitor_service";
import { ReservationService } from "./services/reservation_service";
import { AgeService } from "./services/age_service";

// Import utilities
import { DateUtils } from "./utils/date_utils";
import { LocalizationUtils } from "./utils/localization_utils";

class GolfzonDashboard extends Component {
    static template = "golfzon_dashboard.Dashboard";

    setup() {
        // Initialize services with rpc function
        this.rpc = rpc;
        this.weatherService = new WeatherService(this.rpc);
        this.golfDataService = new GolfDataService(this.rpc);
        this.chartService = new ChartService();
        this.salesService = new SalesService(this.rpc);
        this.visitorService = new VisitorService(this.rpc);
        this.reservationService = new ReservationService(this.rpc);
        this.ageService = new AgeService(this.rpc);

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
            currentLanguage: null, // Default to Korean
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
            performanceData: {
                sales_performance: {
                    current_revenue: "...",
                    monthly_revenue: "...",
                    current_trend: "...",
                    monthly_trend: "...",
                    current_trend_value: 0,
                    monthly_trend_value: 0
                },
                avg_order_value: {
                    current_weekly_value: "...",
                    monthly_value: "...",
                    current_trend: "...",
                    monthly_trend: "...",
                    current_trend_value: 0,
                    monthly_trend_value: 0
                },
                utilization_rate: {
                    current_weekly_capacity: "...",
                    monthly_capacity: "...",
                    current_trend: "...",
                    monthly_trend: "...",
                    current_trend_value: 0,
                    monthly_trend_value: 0
                }
            },
            activities: [],
            customer_growth: [],
            forecastData: {
                forecast_chart: [],
                calendar_data: [],
                pie_charts: {},
                summary_stats: {
                    total_reservations: 0,
                    utilization_rate: 0,
                    month_comparison: { month1: 0, month2: 0, month3: 0 },
                    yearly_growth: 0,
                },
                analysis_period: DateUtils.generateAnalysisPeriod(),
            },
            selectedPeriod: "30days",
            showReservationDetails: false,
            selectedSlot: { day: "", period: "", count: 0 },
            heatmapData: this.getInitialHeatmapData(),
            selectedHeatmapBox: this.getDefaultHeatmapBox(),
            salesData: {
                total_sales: 0,
                percentage_change: 0,
                average_unit_price: 0,
                current_year: [],
                previous_year: [],
                date_range: { start: "", end: "" },
            },
            visitorData: {
                total_visitors: 0,
                percentage_change: 0,
                sections: { part1: 0, part2: 0, part3: 0 },
                gender_ratio: { male_percentage: 0, female_percentage: 0 },
                current_year: [],
                previous_year: [],
                date_range: { start: "", end: "" },
            },
            reservationData: {
                total_reservations: 0,
                percentage_change: 0,
                operation_rate: {
                    part1_percentage: 0,
                    part2_percentage: 0,
                    part3_percentage: 0,
                },
                current_year: [],
                previous_year: [],
                date_range: { start: "", end: "" },
            },
            ageData: {
                under_10: { count: 0, percentage: 0 },
                twenties: { count: 0, percentage: 0 },
                thirties: { count: 0, percentage: 0 },
                forties: { count: 0, percentage: 0 },
                fifties: { count: 0, percentage: 0 },
                sixty_plus: { count: 0, percentage: 0 },
                total_count: 0,
            },
            ...DateUtils.generatePeriodLabels(),
        });

        onMounted(() => this.onMounted());
    }

    // ✅ NEW: Language switching methods
    async loadCurrentLanguage() {
        try {
            const response = await fetch('/golfzon/api/current_language');
            const data = await response.json();

            if (data.status === 'success') {
                this.state.currentLanguage = data.current_lang;
                console.log('✅ Current language loaded:', data.current_lang);
            } else {
                // ✅ Default to Korean
                this.state.currentLanguage = 'ko_KR';
            }
        } catch (error) {
            console.error('❌ Error loading current language:', error);
            // ✅ Default to Korean on error
            this.state.currentLanguage = 'ko_KR';
        }
    }

    async switchLanguage(lang) {
        let oldLang = this.state.currentLanguage;

        try {
            console.log(`🔄 Switching language to: ${lang}`);

            // Update current language
            this.state.currentLanguage = lang;

            // Store language preference
            localStorage.setItem("dashboard_lang", lang);

            // Call backend to switch language
            const response = await fetch(`/golfzon/dashboard/set_lang?lang=${lang}`);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Language switched successfully:', data);

                // FIXED: Update the date immediately before reload
                this.updateCurrentDate();

                // Force page reload to apply new language
                window.location.reload();
            } else {
                // Revert if failed
                this.state.currentLanguage = oldLang;
                console.error('❌ Failed to switch language');
            }
        } catch (error) {
            console.error('❌ Error switching language:', error);
            // Revert on error (oldLang is now accessible here)
            this.state.currentLanguage = oldLang;
        }
    }

    updateCurrentDate() {
        this.state.currentDate = DateUtils.formatCurrentDate();
        console.log('✅ Date updated:', this.state.currentDate);
    }

    // Helper method to check if current language is Korean
    isKorean() {
        return this.state.currentLanguage && this.state.currentLanguage.includes('ko');
    }

    // Helper method to check if current language is English
    isEnglish() {
        return this.state.currentLanguage && this.state.currentLanguage.includes('en');
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
                {
                    label: _t("Early Morning(5 AM -7 AM)"),
                    slot_key: 'early morning',
                    data: [0, 0, 0, 0, 0, 0, 0]
                },
                {
                    label: _t("Morning(8 AM -12 PM)"),
                    slot_key: 'morning',
                    data: [0, 0, 0, 0, 0, 0, 0]
                },
                {
                    label: _t("Afternoon(1 PM -4 PM)"),
                    slot_key: 'afternoon',
                    data: [0, 0, 0, 0, 0, 0, 0]
                },
                {
                    label: _t("Night(5 PM -7 PM)"),
                    slot_key: 'night',
                    data: [0, 0, 0, 0, 0, 0, 0]
                },
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

        // ✅ Load current language first
        await this.loadCurrentLanguage();

        // FIXED: Update date after language is loaded
        this.updateCurrentDate();

        // Initialize all data
        await Promise.all([
            this.initializeLocation(),
            this.loadPerformanceData(),
            this.loadSalesData(),
            this.loadVisitorData(),
            this.loadAgeData(),
            this.loadHeatmapData(),
            this.loadMemberCompositionData()
        ]);

        // Wait for DOM to render
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Initialize charts after DOM is ready
        this.initializeAllCharts();

        // Event listeners
        document.addEventListener("click", this.handleOutsideDrawer.bind(this));
    }

    async loadSalesData() {
        try {
            console.log("=== Loading sales data for period:", this.state.selectedPeriod, "===");
            this.salesService.clearCache();
            const salesData = await this.salesService.fetchSalesData(this.state.selectedPeriod);
            console.log("Sales data received:", salesData);
            this.state.salesData = salesData;
            console.log("=== Sales data loaded successfully ===");
        } catch (error) {
            console.error("Error loading sales data:", error);
            this.state.salesData = this.salesService._getDefaultSalesData(this.state.selectedPeriod);
        }
    }

    async loadVisitorData() {
        try {
            console.log("=== Loading visitor data for period:", this.state.selectedPeriod, "===");
            this.visitorService.clearCache();
            const visitorData = await this.visitorService.fetchVisitorData(
                this.state.selectedPeriod
            );
            console.log("Visitor data received:", visitorData);
            this.state.visitorData = visitorData;
            console.log("=== Visitor data loaded successfully ===");
        } catch (error) {
            console.error("Error loading visitor data:", error);
            this.state.visitorData = this.visitorService._getDefaultVisitorData(
                this.state.selectedPeriod
            );
        }
    }

    async loadReservationData() {
        try {
            console.log("Loading reservation data for period:", this.state.selectedPeriod);
            const reservationData = await this.reservationService.fetchReservationData(
                this.state.selectedPeriod
            );
            this.state.reservationData = reservationData;
            console.log("Reservation data loaded successfully");
        } catch (error) {
            console.error("Error loading reservation data:", error);
            this.state.reservationData = this.reservationService._getDefaultReservationData(
                this.state.selectedPeriod
            );
        }
    }

    async loadAgeData() {
        try {
            console.log("=== Loading age group data ===");
            this.ageService.clearCache();
            const ageData = await this.ageService.fetchAgeGroupData();
            console.log("Age data received:", ageData);
            this.state.ageData = ageData;
            console.log("=== Age data loaded successfully ===");
        } catch (error) {
            console.error("Error loading age data:", error);
            this.state.ageData = this.ageService.getDefaultAgeData();
        }
    }

    async loadHeatmapData() {
        try {
            console.log('Loading heatmap data from database...');
            const response = await this.rpc('/golfzon/heatmap/data', {});

            if (response.success) {
                console.log('Heatmap data received:', response);

                // Update heatmap structure - ensure slot_key exists and translate labels
                if (response.heatmap && response.heatmap.rows) {
                    response.heatmap.rows = response.heatmap.rows.map(row => ({
                        ...row,
                        label: this.getTranslatedTimeSlotLabel(row.slot_key || this.getSlotKeyFromLabel(row.label)),
                        slot_key: row.slot_key || this.getSlotKeyFromLabel(row.label)
                    }));

                    // Translate headers
                    response.heatmap.headers = [
                        _t("Sun"),
                        _t("Mon"),
                        _t("Tue"),
                        _t("Wed"),
                        _t("Thu"),
                        _t("Fri"),
                        _t("Sat"),
                    ];
                }

                this.state.heatmapData = response.heatmap;
                // Store hourly breakdown for sidebar
                this.state.hourlyBreakdownData = response.hourly_breakdown || {};
                console.log('Heatmap structure:', this.state.heatmapData);
                console.log('Hourly breakdown keys:', Object.keys(this.state.hourlyBreakdownData));
                console.log(`Heatmap loaded in ${response.execution_time_ms}ms`);
            } else {
                console.error('Failed to load heatmap:', response.error);
                this.state.heatmapData = this.getInitialHeatmapData();
                this.state.hourlyBreakdownData = {};
            }
        } catch (error) {
            console.error('Error loading heatmap data:', error);
            this.state.heatmapData = this.getInitialHeatmapData();
            this.state.hourlyBreakdownData = {};
        }
    }

    async loadMemberCompositionData() {
        try {
            console.log("=== Loading Member Composition Data ===");

            const response = await this.rpc('/golfzon/member_composition/data', {});

            if (response && response.success) {
                console.log("Member composition data received:", response.data);

                this.state.memberCompositionData = response.data;

                console.log(`✅ Member composition loaded in ${response.execution_time_ms}ms`);

                // Update pie charts after data is loaded
                await this.updatePieCharts();
            } else {
                console.error("Failed to load member composition:", response ? response.error : 'No response');
                this.state.memberCompositionData = this.getDefaultMemberCompositionData();
            }

        } catch (error) {
            console.error("Error loading member composition data:", error);
            this.state.memberCompositionData = this.getDefaultMemberCompositionData();
        }
    }

    getDefaultMemberCompositionData() {
        return {
            by_type: {
                individual: { count: 0, percentage: 0 },
                joint_organization: { count: 0, percentage: 0 },
                general_organization: { count: 0, percentage: 0 },
                temporary_organization: { count: 0, percentage: 0 },
                total: 0
            },
            by_time: {
                d15_plus: { count: 0, percentage: 0 },
                d14: { count: 0, percentage: 0 },
                d7: { count: 0, percentage: 0 },
                d3: { count: 0, percentage: 0 },
                d1: { count: 0, percentage: 0 },
                d0: { count: 0, percentage: 0 },
                total: 0
            },
            by_channel: {
                phone: { count: 0, percentage: 0 },
                internet: { count: 0, percentage: 0 },
                agency: { count: 0, percentage: 0 },
                others: { count: 0, percentage: 0 },
                total: 0
            }
        };
    }

    async updatePieCharts() {
        if (!this.state.memberCompositionData) {
            console.warn("No member composition data available");
            return;
        }

        const data = this.state.memberCompositionData;

        try {
            // Chart 1: Reservation by Type
            if (this.memberTypeChart && this.memberTypeChart.el) {
                const typeData = {
                    individual: data.by_type.individual,
                    joint_organization: data.by_type.joint_organization,
                    general_organization: data.by_type.general_organization,
                    temporary_organization: data.by_type.temporary_organization
                };

                const typeLabels = [
                    _t("Individual"),
                    _t("Joint Organization"),
                    _t("General Organization"),
                    _t("Temporary Organization")
                ];

                const typeColors = ["#1958a4", "#4489da", "#4c9cfd", "#3a96d4"];

                this.chartService.createPieChartWithData(
                    this.memberTypeChart.el,
                    "memberType",
                    typeData,
                    typeLabels,
                    typeColors
                );
            }

            // Chart 2: Reservation by Time
            if (this.advanceBookingChart && this.advanceBookingChart.el) {
                const timeData = {
                    d15_plus: data.by_time.d15_plus,
                    d14: data.by_time.d14,
                    d7: data.by_time.d7,
                    d3: data.by_time.d3,
                    d1: data.by_time.d1,
                    d0: data.by_time.d0
                };

                const timeLabels = ["D-15+", "D-14", "D-7", "D-3", "D-1", "D-0"];
                const timeColors = ["#1958a4", "#4489da", "#4c9cfd", "#3a96d4", "#5ab4f0", "#91d3ff"];

                this.chartService.createPieChartWithData(
                    this.advanceBookingChart.el,
                    "advanceBooking",
                    timeData,
                    timeLabels,
                    timeColors
                );
            }

            // Chart 3: Reservation by Channel
            if (this.regionalChart && this.regionalChart.el) {
                const channelData = {
                    phone: data.by_channel.phone,
                    internet: data.by_channel.internet,
                    agency: data.by_channel.agency,
                    others: data.by_channel.others
                };

                const channelLabels = [
                    _t("Phone"),
                    _t("Internet"),
                    _t("Agency"),
                    _t("Others")
                ];

                const channelColors = ["#1958a4", "#4489da", "#4c9cfd", "#3a96d4"];

                this.chartService.createPieChartWithData(
                    this.regionalChart.el,
                    "regional",
                    channelData,
                    channelLabels,
                    channelColors
                );
            }

            console.log("✅ Pie charts updated successfully");

        } catch (error) {
            console.error("Error updating pie charts:", error);
        }
    }

    // Get translated time slot label
    getTranslatedTimeSlotLabel(slotKey) {
        const labelMap = {
            'early morning': _t("Early Morning(5 AM -7 AM)"),
            'morning': _t("Morning(8 AM -12 PM)"),
            'afternoon': _t("Afternoon(1 PM -4 PM)"),
            'night': _t("Night(5 PM -7 PM)")
        };
        return labelMap[slotKey] || slotKey;
    }

    // Helper method to extract slot_key from label if needed
    getSlotKeyFromLabel(label) {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('early morning') || lowerLabel.includes('5 am') || lowerLabel.includes('새벽')) return 'early morning';
        if (lowerLabel.includes('morning') || lowerLabel.includes('8 am') || lowerLabel.includes('오전')) return 'morning';
        if (lowerLabel.includes('afternoon') || lowerLabel.includes('1 pm') || lowerLabel.includes('오후')) return 'afternoon';
        if (lowerLabel.includes('night') || lowerLabel.includes('5 pm') || lowerLabel.includes('야간')) return 'night';
        return 'morning'; // default
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

            // Update weather state
            this.state.weather = { ...this.state.weather, ...weatherData.current };
            this.state.hourlyWeather = weatherData.hourly;

            // Update golf/reservation state from database
            this.state.reservations = golfData.reservations;
            this.state.teeTime = golfData.teeTime;
            this.state.reservationDetails = golfData.reservationDetails;

            console.log('Updated reservation state:', {
                reservations: this.state.reservations,
                teeTime: this.state.teeTime,
                detailsCount: this.state.reservationDetails.length
            });
        } catch (error) {
            console.error('Error loading weather and golf data:', error);
        }
    }

    async loadPerformanceData() {
        try {
            console.log("=== Loading Performance Data from Database ===");
            const data = await this.golfDataService.fetchPerformanceData();
            this.state.performanceData = data;
            console.log("✅ Performance data loaded:", data);
        } catch (error) {
            console.error("❌ Error loading performance data:", error);
            this.state.performanceData = this.golfDataService.getDefaultPerformanceData();
        }
    }

    initializeAllCharts() {
        console.log("Initializing all charts...");
        this.updateAllCharts();

        if (this.ageRef.el && this.state.ageData && this.state.ageData.total_count !== undefined) {
            console.log("Creating age chart with state data:", this.state.ageData);
            this.chartService.createAgeChart(this.ageRef.el, this.state.ageData);
        } else {
            console.warn("Age chart not created - missing data or element", {
                hasElement: !!this.ageRef.el,
                hasData: !!this.state.ageData,
                ageData: this.state.ageData
            });
        }
        // this.initializePieCharts();

        setTimeout(() => {
            console.log("Initializing gender animation with data:", this.state.visitorData.gender_ratio);
            this.chartService.initializeGenderAnimation(this.state.visitorData.gender_ratio);
        }, 200);
    }

    async updateAllCharts() {
        console.log("Updating all charts with period:", this.state.selectedPeriod);

        await Promise.all([
            this.loadSalesData(),
            this.loadVisitorData(),
            this.loadReservationData()
        ]);

        if (this.canvasRef.el) {
            this.chartService.createSalesChart(
                this.canvasRef.el,
                this.state.selectedPeriod,
                this.state.salesData
            );
        }

        if (this.visitorRef.el) {
            this.chartService.createVisitorChart(
                this.visitorRef.el,
                this.state.selectedPeriod,
                this.state.visitorData
            );
        }

        if (this.reservationTrendChart.el) {
            this.chartService.createReservationChart(
                this.reservationTrendChart.el,
                this.state.selectedPeriod,
                this.state.reservationData
            );
        }

        if (this.ageRef.el && this.state.ageData && this.state.ageData.total_count !== undefined) {
            this.chartService.createAgeChart(this.ageRef.el, this.state.ageData);
        }

        setTimeout(() => {
            console.log("Updating gender animation with new data:", this.state.visitorData.gender_ratio);
            this.chartService.initializeGenderAnimation(this.state.visitorData.gender_ratio);
        }, 200);
    }

    // Event handlers
    setActiveMenuItem(item) {
        this.state.activeMenuItem = item;
    }

    async setPeriod(period) {
        this.state.selectedPeriod = period;
        await this.updateAllCharts();
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

    selectHeatmapBox(box, event) {
        event.stopPropagation();

        // Remove previous selection
        document.querySelectorAll('.heatmap-box.selected').forEach(el =>
            el.classList.remove('selected')
        );
        event.target.closest('.heatmap-box').classList.add('selected');

        // Validate that we have the necessary data
        if (!this.state.heatmapData ||
            !this.state.heatmapData.rows ||
            !this.state.heatmapData.rows[box.timeIndex]) {
            console.error('Heatmap data structure is invalid');
            return;
        }

        const row = this.state.heatmapData.rows[box.timeIndex];
        const slotKey = row.slot_key;

        if (!slotKey) {
            console.error('Slot key is undefined for row:', row);
            return;
        }

        // Get hourly breakdown from stored data
        const key = `${box.dayIndex}_${slotKey}`;
        const hourlyData = this.state.hourlyBreakdownData?.[key] || {};

        console.log('=== Heatmap Box Clicked ===');
        console.log('Selected Box:', box);
        console.log('Day Index:', box.dayIndex);
        console.log('Time Index:', box.timeIndex);
        console.log('Slot Key:', slotKey);
        console.log('Lookup Key:', key);
        console.log('Hourly Data for this slot:', hourlyData);

        // Generate TOP 10 hourly breakdown with most bookings
        const hourlyBreakdown = this.generateTop10HourlyBreakdown(hourlyData);
        console.log('Generated Breakdown:', hourlyBreakdown);

        // Calculate if this is highest/lowest
        const allValues = this.getAllHeatmapValues();
        const maxValue = Math.max(...allValues);
        const minValue = Math.min(...allValues.filter(v => v > 0));

        this.state.selectedHeatmapBox = {
            ...box,
            hourlyBreakdown: hourlyBreakdown,
            isHighest: box.value === maxValue && box.value > 0,
            isLowest: box.value === minValue && box.value > 0,
            displayDay: this.formatDayDisplay(box.day), // FIXED: Use formatDayDisplay, not formatDayDisplayOnly
            displayTime: this.formatTimeSlotDisplay(row.label),
            isVisible: true
        };

        console.log('Final Selected Heatmap Box State:', this.state.selectedHeatmapBox);
        console.log('=========================');
    }

    generateTop10HourlyBreakdown(hourlyData) {

        // All possible hours from 5 AM to 7 PM
        const allHours = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

        // Create array with hour and count
        const hourDataArray = allHours.map(hour => ({
            hour: hour,
            count: hourlyData[hour] || 0
        }));

        // Separate hours with bookings and hours without bookings
        const hoursWithBookings = hourDataArray.filter(item => item.count > 0);
        const hoursWithoutBookings = hourDataArray.filter(item => item.count === 0);

        // Sort hours with bookings by count (descending)
        hoursWithBookings.sort((a, b) => b.count - a.count);

        // Combine: prioritize hours with bookings, then add empty slots to reach 10
        let top10Hours = [];

        // Add all hours with bookings (up to 10)
        top10Hours = top10Hours.concat(hoursWithBookings.slice(0, 10));

        // If we have less than 10, add some empty slots
        if (top10Hours.length < 10) {
            const remainingSlots = 10 - top10Hours.length;
            top10Hours = top10Hours.concat(hoursWithoutBookings.slice(0, remainingSlots));
        }

        // Sort by hour for chronological display
        top10Hours.sort((a, b) => a.hour - b.hour);

        // Format for display with translations
        const breakdown = top10Hours.map(item => {
            const formattedHour = this.formatHourDisplay(item.hour);
            let teamText;

            if (item.count === 0) {
                teamText = _t("0 teams");
            } else if (item.count === 1) {
                teamText = _t("1 team");
            } else {
                teamText = `${item.count} ${_t("teams")}`;
            }

            return {
                hour: formattedHour,
                teams: teamText,
                count: item.count
            };
        });

        console.log('Generated hourly breakdown:', breakdown);
        return breakdown;
    }

    formatHourDisplay(hour) {
        // Use translated hour labels
        const hourLabels = {
            5: _t("5 AM"),
            6: _t("6 AM"),
            7: _t("7 AM"),
            8: _t("8 AM"),
            9: _t("9 AM"),
            10: _t("10 AM"),
            11: _t("11 AM"),
            12: _t("12 PM"),
            13: _t("1 PM"),
            14: _t("2 PM"),
            15: _t("3 PM"),
            16: _t("4 PM"),
            17: _t("5 PM"),
            18: _t("6 PM"),
            19: _t("7 PM"),
        };

        return hourLabels[hour] || `${hour}:00`;
    }

    formatDayDisplay(day) {
        const dayMap = {
            "Sun": _t("Sunday"),
            "Mon": _t("Monday"),
            "Tue": _t("Tuesday"),
            "Wed": _t("Wednesday"),
            "Thu": _t("Thursday"),
            "Fri": _t("Friday"),
            "Sat": _t("Saturday"),
        };
        return dayMap[day] || day;
    }

    formatTimeSlotDisplay(timeSlotLabel) {
        // Already translated from getTranslatedTimeSlotLabel
        return timeSlotLabel;
    }

    willDestroy() {
        super.willDestroy();
        this.chartService.destroyAllCharts();
        document.removeEventListener("click", this.handleOutsideDrawer.bind(this));
    }
}

registry.category("actions").add("golfzon.dashboard", GolfzonDashboard);
export default GolfzonDashboard;
