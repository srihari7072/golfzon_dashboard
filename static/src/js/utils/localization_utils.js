/** @odoo-module **/

export class LocalizationUtils {
  static saveLanguage(lang) {
    try {
      localStorage.setItem("dashboard_lang", lang);
    } catch (e) {
      console.warn("Could not save language preference:", e);
    }
  }

  static getStoredLanguage() {
    try {
      const stored = localStorage.getItem("dashboard_lang");
      if (stored && (stored === "ko_KR" || stored === "en_US")) {
        return stored;
      }
    } catch (e) {}
    return "en_US";
  }

  static switchLanguage(lang) {
    this.saveLanguage(lang);
    const target = `/golfzon/dashboard/set_lang?lang=${encodeURIComponent(
      lang
    )}`;
    window.location.assign(target);
  }
}

