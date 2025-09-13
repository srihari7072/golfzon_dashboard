/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";

export class DateUtils {
  static getCurrentLocale() {
    let lang = "en-US";
    try {
      const stored = localStorage.getItem("dashboard_lang");
      if (stored === "ko_KR") lang = "ko-KR";
      else if (stored === "en_US") lang = "en-US";
    } catch (e) {}
    return lang;
  }

  static formatCurrentDate() {
    const today = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return today.toLocaleDateString(this.getCurrentLocale(), options);
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
    const startDateStr = startDate.toLocaleDateString(locale, options);
    const endDateStr = endDate.toLocaleDateString(locale, options);

    return `${_t("Analysis period:")} ${_t(
      "The last 30 days"
    )} (${startDateStr} - ${endDateStr})`;
  }

  static generatePeriodLabels() {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29);
    const fmt = { year: "numeric", month: "long", day: "numeric" };
    const locale = this.getCurrentLocale();
    const startStr = startDate.toLocaleDateString(locale, fmt);
    const endStr = endDate.toLocaleDateString(locale, fmt);

    return {
      last30DaysLabel: `${_t("Last 30 Days")} (${startStr} - ${endStr})`,
      simpleLast30DaysLabel: `(${_t("Last 30 Days")})`,
      last30DaysTitle: _t("Last 30 Days"),
    };
  }
}

