/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";

export class GolfDataService {
  constructor(rpcService) {
    this.rpc = rpcService;
  }

  async fetchGolfInfo(lat = null, lon = null) {
    console.log("🔄 Fetching booking info from database...");

    if (!this.rpc) {
      console.warn("⚠️ RPC not available, trying HTTP endpoint...");
      return await this.fetchViaHTTP();
    }

    try {
      const golfData = await this.rpc("/golfzon/dashboard/golf_info", {
        lat: lat,
        lon: lon,
      });

      if (golfData.status === "success") {
        console.log(
          "✅ Successfully fetched booking data from database via RPC:",
          {
            reservations: golfData.reservations,
            reservationCount: golfData.reservationDetails.length,
          }
        );

        return {
          reservations: golfData.reservations,
          teeTime: golfData.teeTime,
          reservationDetails: golfData.reservationDetails,
        };
      } else {
        console.warn("⚠️ RPC failed:", golfData.message);
        return await this.fetchViaHTTP();
      }
    } catch (error) {
      console.error("❌ RPC error, trying HTTP fallback:", error);
      return await this.fetchViaHTTP();
    }
  }

  async fetchViaHTTP() {
    try {
      const response = await fetch("/golfzon/api/bookings");
      const data = await response.json();

      if (data.status === "success") {
        console.log("✅ Successfully fetched booking data via HTTP:", {
          count: data.count,
        });

        return {
          reservations: { current: data.count, total: 80 },
          teeTime: {
            part1: { current: Math.floor(data.count * 0.4), total: 50 },
            part2: { current: Math.floor(data.count * 0.35), total: 30 },
            part3: { current: Math.floor(data.count * 0.25), total: 15 },
          },
          reservationDetails: data.reservations,
        };
      } else {
        console.error("❌ HTTP fetch failed:", data.message);
        return this.getEmptyGolfData();
      }
    } catch (error) {
      console.error("❌ HTTP fetch also failed:", error);
      return this.getEmptyGolfData();
    }
  }

  async fetchDashboardData() {
    console.log("🔄 Fetching dashboard data...");

    if (!this.rpc) {
      console.warn(
        "⚠️ RPC service not available, using default dashboard data"
      );
      return this.getDefaultDashboardData();
    }

    try {
      const data = await this.rpc("/golfzon/dashboard/data");
      console.log("✅ Dashboard data fetched:", data);
      return data;
    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error);
      return this.getDefaultDashboardData();
    }
  }

  getEmptyGolfData() {
    return {
      reservations: { current: 0, total: 80 },
      teeTime: {
        part1: { current: 0, total: 50 },
        part2: { current: 0, total: 30 },
        part3: { current: 0, total: 15 },
      },
      reservationDetails: [],
    };
  }

  getDefaultDashboardData() {
    return {
      customer_growth: [60, 40, 20, 80, 50, 70, 90, 30, 40, 55, 75, 85],
      activities: [
        "13 mins ago - New Reservation",
        "1 hour ago - 2 New Leads",
        "Today - 3 SMS Campaigns",
      ],
    };
  }

  async fetchPerformanceData() {
    console.log("🔄 Fetching performance data from database...");

    try {
      const url =
        window.location.origin + "/golfzon/api/performance_indicators";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("✅ Performance data fetched from database:", data);

      if (data.status === "success" && data.data) {
        return {
          sales_performance: {
            current_revenue:
              data.data.sales_performance.cumulative_sales_year.toLocaleString(),
            monthly_revenue:
              data.data.sales_performance.current_month_sales.toLocaleString(),
            current_trend: `${
              data.data.sales_performance.year_growth >= 0 ? "+" : ""
            }${data.data.sales_performance.year_growth}%`,
            monthly_trend: `${
              data.data.sales_performance.month_growth >= 0 ? "+" : ""
            }${data.data.sales_performance.month_growth}%`,
          },
          avg_order_value: {
            current_weekly_value:
              data.data.average_order_performance.cumulative_unit_price_year.toLocaleString(),
            monthly_value:
              data.data.average_order_performance.current_monthly_guest_price.toLocaleString(),
            current_trend: `${
              data.data.average_order_performance.year_growth >= 0 ? "+" : ""
            }${data.data.average_order_performance.year_growth}%`,
            monthly_trend: `${
              data.data.average_order_performance.month_growth >= 0 ? "+" : ""
            }${data.data.average_order_performance.month_growth}%`,
          },
          utilization_rate: {
            current_weekly_capacity:
              data.data.utilization_performance.cumulative_operation_year.toLocaleString(),
            monthly_capacity:
              data.data.utilization_performance.current_month_operation.toLocaleString(),
            current_trend: `${
              data.data.utilization_performance.year_growth >= 0 ? "+" : ""
            }${data.data.utilization_performance.year_growth}%`,
            monthly_trend: `${
              data.data.utilization_performance.month_growth >= 0 ? "+" : ""
            }${data.data.utilization_performance.month_growth}%`,
          },
        };
      } else {
        console.warn("⚠️ Performance data incomplete, using defaults");
        return this.getDefaultPerformanceData();
      }
    } catch (error) {
      console.error("❌ Error fetching performance data:", error);
      return this.getDefaultPerformanceData();
    }
  }

  getDefaultPerformanceData() {
    return {
      sales_performance: {
        current_revenue: "0",
        monthly_revenue: "0",
        current_trend: "+0%", // ✅ FIXED: Ensure proper + sign
        monthly_trend: "+0%",
      },
      avg_order_value: {
        current_weekly_value: "0",
        monthly_value: "0",
        current_trend: "+0%", // ✅ FIXED: Ensure proper + sign
        monthly_trend: "+0%",
      },
      utilization_rate: {
        current_weekly_capacity: "0",
        monthly_capacity: "0",
        current_trend: "+0%", // ✅ FIXED: Ensure proper + sign
        monthly_trend: "+0%",
      },
    };
  }
}
