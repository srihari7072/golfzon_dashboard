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

  async fetchPerformanceData() {
    console.log("🔄 Fetching performance data...");

    if (!this.rpc) {
      console.warn(
        "⚠️ RPC service not available, using default performance data"
      );
      return this.getDefaultPerformanceData();
    }

    try {
      const data = await this.rpc("/golfzon/dashboard/performance_indicators");
      console.log("✅ Performance data fetched:", data);

      if (
        data &&
        data.sales_performance &&
        data.avg_order_value &&
        data.utilization_rate
      ) {
        return data;
      } else {
        console.warn("⚠️ Performance data incomplete, using defaults");
        return this.getDefaultPerformanceData();
      }
    } catch (error) {
      console.error("❌ Error fetching performance data:", error);
      return this.getDefaultPerformanceData();
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

  // Required default data structures
  getDefaultPerformanceData() {
    return {
      sales_performance: {
        current_revenue: "120,000,000,000",
        monthly_revenue: "100,000,000",
        current_trend: "+11%",
        monthly_trend: "+11%",
      },
      avg_order_value: {
        current_weekly_value: "200,000",
        monthly_value: "200,000",
        current_trend: "+11%",
        monthly_trend: "+13%",
      },
      utilization_rate: {
        current_weekly_capacity: "120,000,000,000",
        monthly_capacity: "100,000,000",
        current_trend: "-5%",
        monthly_trend: "+20%",
      },
    };
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
}
