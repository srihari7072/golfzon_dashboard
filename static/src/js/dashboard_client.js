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
import { LoaderManager } from "./utils/loader_manager";
import { DashboardLoader } from "./utils/dashboard_loader";

class GolfzonDashboard extends Component {
    static template = "golfzon_dashboard.Dashboard";

    setup() {
        this.loaderManager = new LoaderManager();

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
            isLoading: true,
            activeMenuItem: "dashboard",
            currentLanguage: null,
            userName: "username",
            drawerOpen: false,
            showWeatherDetails: false,
            currentDate: null,
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
            salesPeriod: '30days',
            visitorPeriod: '30days',
            reservationPeriod: '30days',
            showReservationDetails: false,
            selectedSlot: { day: "", period: "", count: 0 },
            earlyMorningData: [0, 0, 0, 0, 0, 0, 0],
            morningData: [0, 0, 0, 0, 0, 0, 0],
            afternoonData: [0, 0, 0, 0, 0, 0, 0],
            nightData: [0, 0, 0, 0, 0, 0, 0],
            hourlyBreakdownData: {},
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

    async loadCurrentLanguage() {
        try {
            const response = await fetch('/golfzon/api/current_language');
            const data = await response.json();

            if (data.status === 'success') {
                this.state.currentLanguage = data.current_lang;
                localStorage.setItem("dashboard_lang", data.current_lang);
                sessionStorage.setItem("current_language", data.current_lang);
                console.log('✅ Current language loaded:', data.current_lang);
            } else {
                this.state.currentLanguage = 'ko_KR';
                localStorage.setItem("dashboard_lang", 'ko_KR');
                sessionStorage.setItem("current_language", 'ko_KR');
            }
        } catch (error) {
            console.error('❌ Error loading current language:', error);
            this.state.currentLanguage = 'ko_KR';
            localStorage.setItem("dashboard_lang", 'ko_KR');
            sessionStorage.setItem("current_language", 'ko_KR');
        }
    }
    getKoreanDateFallback() {
        const date = new Date();
        const koreanDays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        const koreanMonths = ['1월', '2월', '3월', '4월', '5월', '6월',
            '7월', '8월', '9월', '10월', '11월', '12월'];

        const dayName = koreanDays[date.getDay()];
        const monthName = koreanMonths[date.getMonth()];
        const year = date.getFullYear();
        const day = date.getDate();

        return `${year}년 ${monthName} ${day}일 ${dayName}`;
    }

    async loadCurrentDate() {
        try {
            const response = await fetch('/golfzon/api/current_date');
            const data = await response.json();

            if (data.status === 'success') {
                this.state.currentDate = data.formatted_date;
                console.log('✅ Korean date loaded from backend:', data.formatted_date);
            } else {
                const lang = this.state.currentLanguage || 'ko_KR';
                this.state.currentDate = this.getKoreanDateFallback();
            }
        } catch (error) {
            console.error('❌ Error loading current date:', error);
            this.state.currentDate = this.getKoreanDateFallback();
        }
    }

    getKoreanDateFallback() {
        const date = new Date();
        const koreanDays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        const koreanMonths = ['1월', '2월', '3월', '4월', '5월', '6월',
            '7월', '8월', '9월', '10월', '11월', '12월'];

        const dayName = koreanDays[date.getDay()];
        const monthName = koreanMonths[date.getMonth()];
        const year = date.getFullYear();
        const day = date.getDate();

        return `${year}년 ${monthName} ${day}일 ${dayName}`;
    }

    async switchLanguage(lang) {
        try {
            console.log(`🔄 Switching language to: ${lang}`);

            localStorage.setItem("dashboard_lang", lang);
            sessionStorage.setItem("current_language", lang);

            const oldLang = this.state.currentLanguage;
            this.state.currentLanguage = lang;

            const response = await fetch(`/golfzon/dashboard/set_lang?lang=${lang}`);

            if (response.ok) {
                console.log('✅ Language switched successfully');
                await this.loadCurrentDate();
                if (this.chartService && typeof this.chartService.refreshChartsForLanguage === 'function') {
                    this.chartService.refreshChartsForLanguage();
                }

                window.location.reload();
            } else {
                this.state.currentLanguage = oldLang;
                localStorage.setItem("dashboard_lang", oldLang || 'ko_KR');
                sessionStorage.setItem("current_language", oldLang || 'ko_KR');
                console.error('❌ Failed to switch language');
            }
        } catch (error) {
            console.error('❌ Error switching language:', error);
            this.state.currentLanguage = oldLang;
            localStorage.setItem("dashboard_lang", oldLang || 'ko_KR');
            sessionStorage.setItem("current_language", oldLang || 'ko_KR');
        }
    }

    updateCurrentDate() {
        this.state.currentDate = DateUtils.formatCurrentDate();
        console.log('✅ Date updated:', this.state.currentDate);
    }

    isKorean() {
        return this.state.currentLanguage && this.state.currentLanguage.includes('ko');
    }

    isEnglish() {
        return this.state.currentLanguage && this.state.currentLanguage.includes('en');
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
        console.log("🚀 Dashboard mounted - initializing...");
        this.loaderManager.startLoading();

        try {
            await this.loadCurrentLanguage();
            this.loaderManager.logProgress("Language loaded");

            await this.loadCurrentDate();
            this.loaderManager.logProgress("Date initialized");

            console.log("📡 Fetching all dashboard data in parallel...");

            const results = await Promise.allSettled([
                this.initializeLocation(),
                this.loadPerformanceData(),
                this.loadSalesData(),
                this.loadVisitorData(),
                this.loadAgeData(),
                this.loadHeatmapData(),
                this.loadMemberCompositionData()
            ]);

            const names = ['Location', 'Performance', 'Sales', 'Visitor', 'Age', 'Heatmap', 'Member'];
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    this.loaderManager.logProgress(`${names[index]} data loaded ✅`);
                } else {
                    console.error(`❌ ${names[index]} data failed:`, result.reason);
                }
            });

            await new Promise((resolve) => setTimeout(resolve, 100));

            const chartStartTime = performance.now();
            this.initializeAllCharts();
            const chartTime = performance.now() - chartStartTime;

            console.log(`✅ Charts rendered in ${chartTime.toFixed(0)}ms`);
            console.log(`🎯 TOTAL LOAD TIME: ${this.loaderManager.getLoadingDuration().toFixed(0)}ms`);

            await this.loaderManager.stopLoading(() => {
                this.state.isLoading = false;
            });

        } catch (error) {
            console.error("❌ Error loading dashboard:", error);
            await this.loaderManager.stopLoading(() => {
                this.state.isLoading = false;
            });
        }

        document.addEventListener("click", this.handleOutsideDrawer.bind(this));
    }

    async loadSalesData(period = this.state.salesPeriod) {
        try {
            console.log(`Loading sales data for period: ${period}`);
            this.salesService.clearCache();
            const salesData = await this.salesService.fetchSalesData(period);
            console.log('Sales data received:', salesData);
            this.state.salesData = salesData;
            console.log('Sales data loaded successfully');
        } catch (error) {
            console.error('Error loading sales data:', error);
            this.state.salesData = this.salesService.getDefaultSalesData(period);
        }
    }

    async loadVisitorData(period = this.state.visitorPeriod) {
        try {
            console.log(`Loading visitor data for period: ${period}`);
            this.visitorService.clearCache();
            const visitorData = await this.visitorService.fetchVisitorData(period);
            console.log('Visitor data received:', visitorData);
            this.state.visitorData = visitorData;
            console.log('Visitor data loaded successfully');
        } catch (error) {
            console.error('Error loading visitor data:', error);
            this.state.visitorData = this.visitorService.getDefaultVisitorData(period);
        }
    }

    async loadReservationData(period = this.state.reservationPeriod) {
        try {
            console.log(`Loading reservation data for period: ${period}`);
            const reservationData = await this.reservationService.fetchReservationData(period);
            this.state.reservationData = reservationData;
            console.log('Reservation data loaded successfully');
        } catch (error) {
            console.error('Error loading reservation data:', error);
            this.state.reservationData = this.reservationService.getDefaultReservationData(period);
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
                // Transform the data into the new format
                const data = response.heatmap;

                data.rows.forEach((row) => {
                    switch (row.slot_key) {
                        case 'early morning':
                            this.state.earlyMorningData = [...row.data];
                            break;
                        case 'morning':
                            this.state.morningData = [...row.data];
                            break;
                        case 'afternoon':
                            this.state.afternoonData = [...row.data];
                            break;
                        case 'night':
                            this.state.nightData = [...row.data];
                            break;
                    }
                });

                this.state.hourlyBreakdownData = response.hourly_breakdown || {};
                console.log('Heatmap data loaded successfully');
            } else {
                console.error('Failed to load heatmap:', response.error);
                // Reset to default zeros
                this.state.earlyMorningData = [0, 0, 0, 0, 0, 0, 0];
                this.state.morningData = [0, 0, 0, 0, 0, 0, 0];
                this.state.afternoonData = [0, 0, 0, 0, 0, 0, 0];
                this.state.nightData = [0, 0, 0, 0, 0, 0, 0];
                this.state.hourlyBreakdownData = {};
            }
        } catch (error) {
            console.error('Error loading heatmap data:', error);
            // Reset to default zeros on error
            this.state.earlyMorningData = [0, 0, 0, 0, 0, 0, 0];
            this.state.morningData = [0, 0, 0, 0, 0, 0, 0];
            this.state.afternoonData = [0, 0, 0, 0, 0, 0, 0];
            this.state.nightData = [0, 0, 0, 0, 0, 0, 0];
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
                agent: { count: 0, percentage: 0 },
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

            if (this.regionalChart && this.regionalChart.el) {
                const channelData = {
                    phone: data.by_channel.phone,
                    internet: data.by_channel.internet,
                    agency: data.by_channel.agency,
                    agent: data.by_channel.agent,
                    others: data.by_channel.others
                };

                const channelLabels = [
                    _t("Phone"),
                    _t("Internet"),
                    _t("Agency"),
                    _t("Agent"),
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

    async initializeLocation() {
        try {
            console.log("🌍 Initializing location detection...");

            const locationData = await this.weatherService.detectUserLocation();

            this.state.userLocation = {
                lat: locationData.lat,
                lon: locationData.lon,
                accuracy: locationData.accuracy,
                source: locationData.source
            };

            this.state.weather.location = locationData.locationName;

            // Log location source
            if (locationData.source === 'GPS') {
                console.log(`✅ Using GPS location: ${locationData.locationName}`);
                console.log(`📍 Coordinates: ${locationData.lat}, ${locationData.lon}`);
                console.log(`🎯 Accuracy: ${locationData.accuracy.toFixed(0)} meters`);
            } else {
                console.log(`✅ Using default location: ${locationData.locationName}`);
            }

            await this.loadWeatherAndGolfData(locationData.lat, locationData.lon);

        } catch (error) {
            console.error("❌ Location initialization failed:", error.message);
            this.state.weather.location = "Seoul, KR (default)";

            // Still try to load weather for Seoul
            await this.loadWeatherAndGolfData("37.5665", "126.9780");
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

    async updateSalesChart(period) {
        console.log(`📊 Updating SALES chart only for period: ${period}`);
        const startTime = performance.now();
        try {
            this.state.salesPeriod = period;
            await this.loadSalesData();
            if (this.canvasRef.el) {
                this.chartService.createSalesChart(
                    this.canvasRef.el,
                    period,
                    this.state.salesData
                );
            }
            const duration = performance.now() - startTime;
            console.log(`✅ Sales chart updated in ${duration.toFixed(0)}ms`);
        } catch (error) {
            console.error("❌ Error updating sales chart:", error);
        }
    }

    async updateVisitorChart(period) {
        console.log(`📊 Updating VISITOR chart only for period: ${period}`);
        const startTime = performance.now();

        try {
            this.state.visitorPeriod = period;
            await this.loadVisitorData();
            if (this.visitorRef.el) {
                this.chartService.createVisitorChart(
                    this.visitorRef.el,
                    period,
                    this.state.visitorData
                );
            }
            const duration = performance.now() - startTime;
            console.log(`✅ Visitor chart updated in ${duration.toFixed(0)}ms`);
        } catch (error) {
            console.error("❌ Error updating visitor chart:", error);
        }
    }

    updateGenderRatioDisplay() {
        console.log(`👥 Updating Gender Ratio display`);

        try {
            if (this.state.visitorData?.gender_ratio) {
                // Update gender ratio WITHOUT animation
                this.chartService.updateGenderRatio(this.state.visitorData.gender_ratio);
            } else {
                console.warn('⚠️ Gender ratio data not available');
            }
        } catch (error) {
            console.error("❌ Error updating gender ratio:", error);
        }
    }

    async updateReservationChart(period) {
        console.log(`📊 Updating RESERVATION chart only for period: ${period}`);
        const startTime = performance.now();
        try {
            this.state.reservationPeriod = period;
            await this.loadReservationData();
            if (this.reservationTrendChart.el) {
                this.chartService.createReservationChart(
                    this.reservationTrendChart.el,
                    period,
                    this.state.reservationData
                );
            }
            const duration = performance.now() - startTime;
            console.log(`✅ Reservation chart updated in ${duration.toFixed(0)}ms`);
        } catch (error) {
            console.error("❌ Error updating reservation chart:", error);
        }
    }

    initializeAllCharts() {
        console.log("Initializing all charts...");
        this.updateAllCharts();

        if (this.ageRef?.el) {
            if (this.state.ageData && this.state.ageData.total_count !== undefined) {
                console.log("Creating age chart with state data:", this.state.ageData);
                this.chartService.createAgeChart(this.ageRef.el, this.state.ageData);
            } else {
                console.log("Age chart skipped - waiting for data to load");
            }
        } else {
            console.log("Age chart element not found - likely on different page");
        }

        setTimeout(() => {
            if (this.state.visitorData?.gender_ratio) {
                console.log("Initializing gender animation with data:", this.state.visitorData.gender_ratio);
                this.chartService.initializeGenderAnimation(this.state.visitorData.gender_ratio);
            }
        }, 200);
    }

    async updateAllCharts() {
        console.log('Updating ALL charts with their respective periods');

        await Promise.all([
            this.loadSalesData(this.state.salesPeriod),
            this.loadVisitorData(this.state.visitorPeriod),
            this.loadReservationData(this.state.reservationPeriod)
        ]);

        // Render all charts
        if (this.canvasRef.el) {
            this.chartService.createSalesChart(
                this.canvasRef.el,
                this.state.salesPeriod,
                this.state.salesData
            );
        }

        if (this.visitorRef.el) {
            this.chartService.createVisitorChart(
                this.visitorRef.el,
                this.state.visitorPeriod,
                this.state.visitorData
            );
        }

        if (this.reservationTrendChart.el) {
            this.chartService.createReservationChart(
                this.reservationTrendChart.el,
                this.state.reservationPeriod,
                this.state.reservationData
            );
        }

        if (this.ageRef.el && this.state.ageData && this.state.ageData.totalcount !== undefined) {
            this.chartService.createAgeChart(this.ageRef.el, this.state.ageData);
        }
    }

    navigateToDashboard(menuItem, event) {
        event.preventDefault();
        event.stopPropagation();

        console.log(`📍 Menu item clicked: ${menuItem}`);

        // ✅ Set active menu item
        this.state.activeMenuItem = menuItem;

        // ✅ Close the menu drawer
        this.state.drawerOpen = false;
        if (this.menuDrawer.el) {
            this.menuDrawer.el.classList.remove("open");
        }
        console.log(`✅ Active menu item set to: ${menuItem}, drawer closed`);
    }

    navigateToMemberGroup(event) {
        event.preventDefault();
        event.stopPropagation();
        console.log('📍 Navigating to Member Group');

        this.state.activeMenuItem = 'membergroup';
        this.state.drawerOpen = false;

        if (this.menuDrawer.el) {
            this.menuDrawer.el.classList.remove("open");
        }

        // Navigate to member group action
        this.env.services.action.doAction({
            type: 'ir.actions.client',
            tag: 'golfzon.member_group',
            target: 'main',
        });
    }

    navigateToMember(event) {
        event.preventDefault();
        event.stopPropagation();
        console.log('📍 Navigating to Member');

        this.state.activeMenuItem = 'member';
        this.state.drawerOpen = false;

        if (this.menuDrawer.el) {
            this.menuDrawer.el.classList.remove("open");
        }

        // Navigate to member action
        this.env.services.action.doAction({
            type: 'ir.actions.client',
            tag: 'golfzon.member',
            target: 'main',
        });
    }

    setActiveMenuItem(item) {
        this.state.activeMenuItem = item;
    }

    async setPeriod(period) {
        console.warn("⚠️ setPeriod() is deprecated. Use individual chart update methods instead.");
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
        const allValues = [
            ...this.state.earlyMorningData,
            ...this.state.morningData,
            ...this.state.afternoonData,
            ...this.state.nightData
        ].filter(value => typeof value === "number" && value > 0);
        return allValues;
    }

    selectHeatmapBox(box, event) {
        event.stopPropagation();
        document.querySelectorAll('.heatmap-box.selected').forEach(el => el.classList.remove('selected'));
        event.target.closest('.heatmap-box').classList.add('selected');

        const slotKey = ['early morning', 'morning', 'afternoon', 'night'][box.timeIndex];
        const key = `${box.dayIndex}_${slotKey}`;

        const hourlyData = this.state.hourlyBreakdownData?.[key];
        const hourlyBreakdown = this.generateHourlyBreakdownBySlot(hourlyData, slotKey);

        const allValues = this.getAllHeatmapValues();
        const maxValue = Math.max(...allValues);
        const minValue = Math.min(...allValues.filter(v => v > 0));

        const combinedTitle = this.generateDayTimeSlotTitle(box.day, box.timeSlot);

        this.state.selectedHeatmapBox = {
            ...box,
            hourlyBreakdown: hourlyBreakdown,
            isHighest: box.value === maxValue && box.value > 0,
            isLowest: box.value === minValue && box.value > 0,
            displayDay: this.formatDayDisplay(box.day),
            displayTime: this.formatTimeSlotDisplay(box.timeSlot),
            combinedTitle: combinedTitle,
            isVisible: true
        };
    }

    // ✅ FIXED: Generate Day + Time Slot Title with Full Day Names
    generateDayTimeSlotTitle(day, timeSlot) {
        // Map single-character days to FULL day names
        const dayMap = {
            // English short to full
            'Sun': this.isKorean() ? '일요일' : 'Sunday',
            'Mon': this.isKorean() ? '월요일' : 'Monday',
            'Tue': this.isKorean() ? '화요일' : 'Tuesday',
            'Wed': this.isKorean() ? '수요일' : 'Wednesday',
            'Thu': this.isKorean() ? '목요일' : 'Thursday',
            'Fri': this.isKorean() ? '금요일' : 'Friday',
            'Sat': this.isKorean() ? '토요일' : 'Saturday',
            // Korean short to full
            '일': '일요일',
            '월': '월요일',
            '화': '화요일',
            '수': '수요일',
            '목': '목요일',
            '금': '금요일',
            '토': '토요일'
        };

        // Map time slots (remove time ranges, keep just period name)
        const timeSlotMap = {
            // English versions with time ranges
            'Early Morning(5 AM -7 AM)': this.isKorean() ? '새벽' : 'Early Morning',
            'Morning(8 AM -12 PM)': this.isKorean() ? '오전' : 'Morning',
            'Afternoon(13 PM -16 PM)': this.isKorean() ? '오후' : 'Afternoon',
            'Night(17 PM -19 PM)': this.isKorean() ? '야간' : 'Night',
            // Korean versions with time
            '새벽(5~7시)': '새벽',
            '오전(8~12시)': '오전',
            '오후(13~16시)': '오후',
            '야간(17~19시)': '야간',
            // Already clean versions
            'Early Morning': this.isKorean() ? '새벽' : 'Early Morning',
            'Morning': this.isKorean() ? '오전' : 'Morning',
            'Afternoon': this.isKorean() ? '오후' : 'Afternoon',
            'Night': this.isKorean() ? '야간' : 'Night',
            '새벽': '새벽',
            '오전': '오전',
            '오후': '오후',
            '야간': '야간'
        };

        const fullDay = dayMap[day] || day;
        const cleanTimeSlot = timeSlotMap[timeSlot] || timeSlot;

        // Return format: "Sunday Morning" or "일요일 오전"
        return `${fullDay} ${cleanTimeSlot}`;
    }

    // ✅ FIXED: Format Hour Display with Proper Translation
    formatHourDisplay(hour) {
        const hourLabels = {
            5: this.isKorean() ? '5시' : '5AM',
            6: this.isKorean() ? '6시' : '6AM',
            7: this.isKorean() ? '7시' : '7AM',
            8: this.isKorean() ? '8시' : '8AM',
            9: this.isKorean() ? '9시' : '9AM',
            10: this.isKorean() ? '10시' : '10AM',
            11: this.isKorean() ? '11시' : '11AM',
            12: this.isKorean() ? '12시' : '12PM',
            13: this.isKorean() ? '13시' : '13PM',
            14: this.isKorean() ? '14시' : '14PM',
            15: this.isKorean() ? '15시' : '15PM',
            16: this.isKorean() ? '16시' : '16PM',
            17: this.isKorean() ? '17시' : '17PM',
            18: this.isKorean() ? '18시' : '18PM',
            19: this.isKorean() ? '19시' : '19PM'
        };

        return hourLabels[hour] || `${hour}:00`;
    }

    // ✅ FIXED: Generate Hourly Breakdown with Proper Team Text
    generateHourlyBreakdownBySlot(hourlyData, slotKey) {
        // Normalize slot key
        const normalizedSlotKey = slotKey.toLowerCase().replace(/\s+/g, '');

        // Define hour ranges for each time slot
        const slotHourRanges = {
            'earlymorning': [5, 6, 7],
            'morning': [8, 9, 10, 11, 12],
            'afternoon': [13, 14, 15, 16],
            'night': [17, 18, 19]
        };

        // Get hours for the selected slot
        let hoursToDisplay = slotHourRanges[normalizedSlotKey];
        if (!hoursToDisplay) {
            hoursToDisplay = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        }

        console.log('Filtering hours for slot:', normalizedSlotKey, hoursToDisplay);

        // Generate breakdown only for relevant hours
        const breakdown = hoursToDisplay.map(hour => {
            const count = hourlyData?.[hour] || 0;
            const formattedHour = this.formatHourDisplay(hour);

            // Format team text based on language
            let teamText;
            if (this.isKorean()) {
                teamText = `${count}팀`;
            } else {
                if (count === 0) {
                    teamText = '0team';
                } else if (count === 1) {
                    teamText = '1team';
                } else {
                    teamText = `${count}team`;
                }
            }

            return {
                hour: formattedHour,
                team: teamText,
                count: count
            };
        });

        console.log('Generated hourly breakdown:', breakdown);
        return breakdown;
    }

    formatDayDisplay(day) {
        const dayMap = {
            "Sunday": _t("Sunday"), "Monday": _t("Monday"), "Tuesday": _t("Tuesday"),
            "Wednesday": _t("Wednesday"), "Thursday": _t("Thursday"), "Friday": _t("Friday"),
            "Saturday": _t("Saturday"),
        };
        return dayMap[day] || day;
    }

    formatTimeSlotDisplay(timeSlotLabel) {
        return timeSlotLabel;
    }

    willDestroy() {
        super.willDestroy();
        this.chartService.destroyAllCharts();
        document.removeEventListener("click", this.handleOutsideDrawer.bind(this));
    }
}

GolfzonDashboard.components = { DashboardLoader };
registry.category("actions").add("golfzon.dashboard", GolfzonDashboard);
export default GolfzonDashboard;
