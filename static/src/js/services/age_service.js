/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";

export class AgeService {
    constructor(rpc) {
        this.rpc = rpc;
        this.cache = null;
        this.cacheTimeout = 300000; // 5 minutes
        this.cacheTimestamp = null;
    }

    clearCache() {
        this.cache = null;
        this.cacheTimestamp = null;
        console.log("✅ Age data cache cleared");
    }

    async fetchAgeGroupData() {
        if (this.cache && this.cacheTimestamp &&
            (Date.now() - this.cacheTimestamp < this.cacheTimeout)) {
            console.log("✅ Using cached age group data");
            return this.cache;
        }

        try {
            const startTime = performance.now();

            console.log("🔍 Fetching age group data from server...");
            const response = await this.rpc("/golfzon/age_group_data", {});

            const endTime = performance.now();
            const clientTime = endTime - startTime;

            console.log("📥 Server response:", response);

            if (!response.success) {
                console.error("❌ Server returned error:", response.error);
                throw new Error(response.error || "Failed to fetch age group data");
            }

            console.log(
                `✅ Age data fetched in ${clientTime.toFixed(2)}ms (Server: ${response.execution_time_ms
                }ms)`
            );

            console.log("📊 Raw age data from server:", response.data);

            // Transform data
            const ageData = {
                under_10: response.data.age_groups?.under_10 || { count: 0, percentage: 0 },
                twenties: response.data.age_groups?.["20s"] || { count: 0, percentage: 0 },
                thirties: response.data.age_groups?.["30s"] || { count: 0, percentage: 0 },
                forties: response.data.age_groups?.["40s"] || { count: 0, percentage: 0 },
                fifties: response.data.age_groups?.["50s"] || { count: 0, percentage: 0 },
                sixty_plus: response.data.age_groups?.["60_plus"] || { count: 0, percentage: 0 },
                total_count: response.data.total_count || 0,
            };

            console.log("📊 Transformed age data:", ageData);
            console.log("📊 Percentages:", {
                "Under 10": ageData.under_10.percentage + "%",
                "20s": ageData.twenties.percentage + "%",
                "30s": ageData.thirties.percentage + "%",
                "40s": ageData.forties.percentage + "%",
                "50s": ageData.fifties.percentage + "%",
                "60+": ageData.sixty_plus.percentage + "%",
            });

            this.cache = ageData;
            this.cacheTimestamp = Date.now();

            return ageData;
        } catch (error) {
            console.error("❌ Error fetching age group data:", error);
            return this._getDefaultAgeData();
        }
    }

    _getDefaultAgeData() {
        console.warn("⚠️ Using default/empty age data");
        return {
            under_10: { count: 0, percentage: 0 },
            twenties: { count: 0, percentage: 0 },
            thirties: { count: 0, percentage: 0 },
            forties: { count: 0, percentage: 0 },
            fifties: { count: 0, percentage: 0 },
            sixty_plus: { count: 0, percentage: 0 },
            total_count: 0,
        };
    }

    getAgeLabels() {
        return [
            _t("60+ years"),
            _t("50s"),
            _t("40s"),
            _t("30s"),
            _t("20s"),
            _t("Under 10")
        ];
    }
}
