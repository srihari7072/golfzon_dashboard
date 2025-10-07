/** @odoo-module **/

import { rpc } from "@web/core/network/rpc";

export class ReservationService {
    constructor(rpcFunction) {
        this.rpc = rpcFunction || rpc;
        this.cache = new Map();
    }

    clearCache() {
        this.cache.clear();
    }

    async fetchReservationData(period = "30days") {
        const cacheKey = `reservation_${period}`;

        if (this.cache.has(cacheKey)) {
            console.log(`Using cached reservation data for ${period}`);
            return this.cache.get(cacheKey);
        }

        try {
            console.log(`Fetching reservation data for period: ${period}`);
            const startTime = performance.now();

            const response = await this.rpc("/golfzon/reservation_trend_data", {
                period: period,
            });

            const endTime = performance.now();
            const clientTime = endTime - startTime;

            if (response.success) {
                const data = response.data;
                console.log(`✅ Reservation data fetched - Server: ${data.execution_time_ms}ms, Client: ${clientTime.toFixed(2)}ms`);

                this.cache.set(cacheKey, data);
                return data;
            } else {
                throw new Error(response.error || "Failed to fetch reservation data");
            }
        } catch (error) {
            console.error("Error fetching reservation data:", error);
            return this._getDefaultReservationData(period);
        }
    }

    _getDefaultReservationData(period) {
        const days = period === "7days" ? 7 : 30;
        const today = new Date();
        const defaultData = {
            current_year: [],
            previous_year: [],
            total_reservations: 0,
            percentage_change: 0,
            operation_rate: {
                part1_percentage: 0,
                part2_percentage: 0,
                part3_percentage: 0,
                part1_count: 0,
                part2_count: 0,
                part3_count: 0,
                total_operations: 0,
            },
            date_range: { start: "", end: "" },
        };

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            defaultData.current_year.push({
                date: date.toISOString().split("T")[0],
                count: 0,
            });
            defaultData.previous_year.push({
                date: date.toISOString().split("T")[0],
                count: 0,
            });
        }

        return defaultData;
    }
}
