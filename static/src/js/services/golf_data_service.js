/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";

export class GolfDataService {
  constructor(rpcFunction) {
    this.rpc = rpcFunction;
  }

  async fetchGolfInfo(lat = null, lon = null) {
    try {
      console.log('Fetching golf info from database...');

      const response = await this.rpc('/golfzon/dashboard/golfinfo', {});

      if (response && response.success) {
        console.log('Golf data received from database:', response);
        console.log(`Golf data loaded in ${response.execution_time_ms}ms`);

        return {
          reservations: response.reservations,
          teeTime: response.teeTime,
          reservationDetails: response.reservationDetails
        };
      } else {
        console.error('Failed to load golf data:', response?.error);
        return this.getDefaultGolfData();
      }
    } catch (error) {
      console.error('Error fetching golf data:', error);
      return this.getDefaultGolfData();
    }
  }

  getDefaultGolfData() {
    // Fallback data structure (empty)
    return {
      reservations: { current: 0, total: 80 },
      teeTime: {
        part1: { current: 0, total: 50 },
        part2: { current: 0, total: 30 },
        part3: { current: 0, total: 15 }
      },
      reservationDetails: []
    };
  }


  async fetchPerformanceData() {
    try {
      console.log("📊 Fetching performance data from database...");
      const response = await this.rpc("/golfzon/dashboard/performance_indicators", {});

      console.log("✅ Database response:", response);

      if (response && response.success) {
        console.log("✅ Performance data loaded successfully from database");
        return {
          sales_performance: response.sales_performance,
          avg_order_value: response.avg_order_value,
          utilization_rate: response.utilization_rate
        };
      } else {
        console.error("❌ Error in performance data response:", response?.error);
        return this.getDefaultPerformanceData();
      }
    } catch (error) {
      console.error("❌ Error fetching performance data:", error);
      return this.getDefaultPerformanceData();
    }
  }

  getDefaultPerformanceData() {
    console.warn("⚠️ Using fallback performance data (no database data available)");
    return {
      sales_performance: {
        current_revenue: "0",
        monthly_revenue: "0",
        current_trend: "+0%",
        monthly_trend: "+0%",
        current_trend_value: 0,
        monthly_trend_value: 0
      },
      avg_order_value: {
        current_weekly_value: "0",
        monthly_value: "0",
        current_trend: "+0%",
        monthly_trend: "+0%",
        current_trend_value: 0,
        monthly_trend_value: 0
      },
      utilization_rate: {
        current_weekly_capacity: "0",
        monthly_capacity: "0",
        current_trend: "+0%",
        monthly_trend: "+0%",
        current_trend_value: 0,
        monthly_trend_value: 0
      },
    };
  }
}
