/** @odoo-module **/

export class VisitorService {
    constructor(rpc) {
        this.rpc = rpc;
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache
    }

    clearCache() {
        this.cache.clear();
    }

    async fetchVisitorData(period = "30days") {
        const cacheKey = `visitor_${period}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log(`Using cached visitor data for ${period}`);
            return cached.data;
        }

        try {
            const startTime = performance.now();
            
            const response = await this.rpc("/golfzon/visitor_data", {
                period: period,
            });

            const endTime = performance.now();
            const clientTime = endTime - startTime;

            if (!response.success) {
                throw new Error(response.error || "Failed to fetch visitor data");
            }

            console.log(
                `✅ Visitor data fetched in ${clientTime.toFixed(2)}ms (Server: ${
                    response.data.execution_time_ms
                }ms)`
            );

            const visitorData = {
                total_visitors: response.data.total_visitors || 0,
                percentage_change: response.data.percentage_change || 0,
                sections: response.data.sections || { part1: 0, part2: 0, part3: 0 },
                gender_ratio: response.data.gender_ratio || {
                    male_percentage: 0,
                    female_percentage: 0,
                },
                current_year: response.data.current_year || [],
                previous_year: response.data.previous_year || [],
                date_range: response.data.date_range || { start: "", end: "" },
            };

            // Cache the data
            this.cache.set(cacheKey, {
                data: visitorData,
                timestamp: Date.now(),
            });

            return visitorData;
        } catch (error) {
            console.error("Error fetching visitor data:", error);
            return this._getDefaultVisitorData(period);
        }
    }

    _getDefaultVisitorData(period) {
        const days = period === "7days" ? 7 : 30;
        const today = new Date();
        const currentYear = [];
        const previousYear = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];
            
            currentYear.push({
                date: dateStr,
                count: 0,
            });
            
            previousYear.push({
                date: dateStr,
                count: 0,
            });
        }

        return {
            total_visitors: 0,
            percentage_change: 0,
            sections: { part1: 0, part2: 0, part3: 0 },
            gender_ratio: { male_percentage: 0, female_percentage: 0 },
            current_year: currentYear,
            previous_year: previousYear,
            date_range: { start: "", end: "" },
        };
    }
}
