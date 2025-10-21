/** @odoo-module **/

export class DateRangeUtils {
    /**
     * Format date to YYYY-MM-DD
     */
    static formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get default date range (current month)
     */
    static getDefaultDateRange() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        return {
            startDate: this.formatDate(firstDay),
            endDate: this.formatDate(lastDay)
        };
    }

    /**
     * Format display date (Korean format)
     */
    static formatDisplayDate(dateStr) {
        const date = new Date(dateStr);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[date.getDay()];
        
        return `${dateStr} (${dayName})`;
    }
}
