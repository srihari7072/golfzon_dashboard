// /** @odoo-module **/

import { _t } from "@web/core/l10n/translation";

export class DateUtils {

  static getCurrentLocale() {
    let lang = "ko-KR"; // FIXED: Default to Korean (not ko_KR)
    try {
      const stored = localStorage.getItem("dashboard_lang");
      if (stored === "ko_KR") lang = "ko-KR";
      else if (stored === "en_US") lang = "en-US";
    } catch (e) {
      console.warn("Could not get locale from localStorage:", e);
    }
    return lang; // FIXED: Added missing return
  }

  static formatCurrentDate() {
    const today = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    try {
      return today.toLocaleDateString(this.getCurrentLocale(), options);
    } catch (error) {
      console.error("Error formatting current date:", error);
      // Fallback to default formatting
      return today.toLocaleDateString();
    }
  }

  static generateAnalysisPeriod() {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29); // 30 days total including today

    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    const locale = this.getCurrentLocale();

    try {
      const startDateStr = startDate.toLocaleDateString(locale, options);
      const endDateStr = endDate.toLocaleDateString(locale, options);

      return `${_t("Analysis period:")} ${_t("The last 30 days")} (${startDateStr} - ${endDateStr})`;
    } catch (error) {
      console.error("Error generating analysis period:", error);
      return `${_t("Analysis period:")} ${_t("The last 30 days")}`;
    }
  }

  static generatePeriodLabels() {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29);

    const fmt = { year: "numeric", month: "long", day: "numeric" };
    const locale = this.getCurrentLocale();

    try {
      const startStr = startDate.toLocaleDateString(locale, fmt);
      const endStr = endDate.toLocaleDateString(locale, fmt);

      return {
        last30DaysLabel: `${_t("Last 30 Days")} (${startStr} - ${endStr})`,
        simpleLast30DaysLabel: `(${_t("Last 30 Days")})`,
        last30DaysTitle: _t("Last 30 Days"),
      };
    } catch (error) {
      console.error("Error generating period labels:", error);
      return {
        last30DaysLabel: _t("Last 30 Days"),
        simpleLast30DaysLabel: `(${_t("Last 30 Days")})`,
        last30DaysTitle: _t("Last 30 Days"),
      };
    }
  }

  static formatDateWithLocale(date, options = null) {
    if (!options) {
      options = {
        year: "numeric",
        month: "long",
        day: "numeric",
      };
    }

    try {
      return date.toLocaleDateString(this.getCurrentLocale(), options);
    } catch (error) {
      console.error("Error formatting date with locale:", error);
      return date.toLocaleDateString();
    }
  }

  static getDateLabels(period) {
    const today = new Date();
    const days = period === "7days" ? 7 : 30;
    const labels = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      let label = `${date.getMonth() + 1}.${date.getDate()}`;

      if (i === 0) {
        label += ` (${_t("Today")})`;
      }

      labels.push(label);
    }

    return labels;
  }

  static getStoredLanguage() {
    try {
      const stored = localStorage.getItem("dashboard_lang");
      return stored || 'ko_KR'; // Default to Korean
    } catch (_) {
      return 'ko_KR';
    }
  }
}
