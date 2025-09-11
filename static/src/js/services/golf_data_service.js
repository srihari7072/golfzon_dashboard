/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";

export class GolfDataService {
  constructor(rpcService) {
    this.rpc = rpcService;
  }

  async fetchGolfInfo(lat = null, lon = null) {
    if (!this.rpc) {
      return this.getDefaultGolfData();
    }

    try {
      const golfData = await this.rpc("/golfzon/dashboard/golf_info", {
        lat: lat,
        lon: lon,
      });

      return {
        reservations: golfData.reservations,
        teeTime: golfData.teeTime,
        reservationDetails: golfData.reservationDetails,
      };
    } catch (error) {
      console.error("Error fetching golf data:", error);
      return this.getDefaultGolfData();
    }
  }

  async fetchPerformanceData() {
    if (!this.rpc) {
      return this.getDefaultPerformanceData();
    }

    try {
      return await this.rpc("/golfzon/dashboard/performance_indicators");
    } catch (error) {
      console.error("Error fetching performance data:", error);
      return this.getDefaultPerformanceData();
    }
  }

  async fetchDashboardData() {
    const defaultData = {
      customer_growth: [60, 40, 20, 80, 50, 70, 90, 30, 40, 55, 75, 85],
      activities: [
        "13 mins ago - New Reservation",
        "1 hour ago - 2 New Leads",
        "Today - 3 SMS Campaigns",
      ],
    };

    if (!this.rpc) {
      return defaultData;
    }

    try {
      return await this.rpc("/golfzon/dashboard/data");
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      return defaultData;
    }
  }

  getDefaultGolfData() {
    const names = [
      _t("John Smith"),
      _t("Sarah Johnson"),
      _t("Mike Wilson"),
      _t("Emily Davis"),
      _t("David Brown"),
      _t("Lisa Anderson"),
      _t("Tom Garcia"),
      _t("Anna Martinez"),
      _t("Chris Lee"),
      _t("Jessica Taylor"),
      _t("Robert Chen"),
      _t("Maria Rodriguez"),
      _t("Kevin Park"),
      _t("Amanda White"),
      _t("Daniel Kim"),
      _t("Rachel Green"),
      _t("James Wilson"),
      _t("Michelle Brown"),
      _t("Steven Clark"),
      _t("Jennifer Lopez"),
    ];

    const reservationDetails = [];
    const today = new Date().toISOString().split("T")[0];

    for (let i = 0; i < 80; i++) {
      const startHour = 6 + i * 0.25;
      const hour = Math.floor(startHour);
      const minute = Math.floor((startHour - hour) * 60);
      const teeTime = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;

      reservationDetails.push({
        id: `R${(i + 1).toString().padStart(3, "0")}`,
        person: names[i % names.length],
        date: today,
        teeTime: teeTime,
        rounds: Math.random() > 0.5 ? 18 : 9,
      });
    }

    return {
      reservations: { current: 78, total: 80 },
      teeTime: {
        part1: { current: 40, total: 50 },
        part2: { current: 25, total: 30 },
        part3: { current: 7, total: 15 },
      },
      reservationDetails: reservationDetails,
    };
  }

  getDefaultPerformanceData() {
    return {
      main_title: _t("Cloud CC Core Performance Indicators"),
      sales_performance: {
        title: _t("Sales Performance Indicators"),
        current_revenue: "120,000,000,000",
        monthly_revenue: "100,000,000",
        current_trend: "+11%",
        monthly_trend: "+11%",
        current_label: _t("Cumulative Sales This Year"),
        monthly_label: _t("Current Monthly Sales"),
        trend_period: _t("(year-over-year)"),
      },
      avg_order_value: {
        title: _t("Average Order Value Performance"),
        current_weekly_value: "200,000",
        monthly_value: "200,000",
        current_trend: "+11%",
        monthly_trend: "+13%",
        current_label: _t("Cumulative Unit Price This Year"),
        monthly_label: _t("Current Monthly Guest Price"),
        trend_period: _t("(year-over-year)"),
      },
      utilization_rate: {
        title: _t("Utilization Rate Performance"),
        current_weekly_capacity: "120,000,000,000",
        monthly_capacity: "100,000,000",
        current_trend: "-5%",
        monthly_trend: "+20%",
        current_label: _t("Cumulative Operation Rate This Year"),
        monthly_label: _t("Current Month Operation Rate"),
        trend_period: _t("(year-over-year)"),
      },
    };
  }
}
