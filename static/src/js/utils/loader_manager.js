/** @odoo-module **/

export class LoaderManager {
    constructor() {
        this.loadingStartTime = null;
        this.minDisplayTime = 500;
    }

    startLoading() {
        this.loadingStartTime = performance.now();
        console.log("⏳ Dashboard loading started...");
    }

    async stopLoading(callback) {
        if (!this.loadingStartTime) {
            if (callback) callback();
            return;
        }

        const elapsedTime = performance.now() - this.loadingStartTime;
        const remainingTime = Math.max(0, this.minDisplayTime - elapsedTime);

        console.log(`⏱️ Loading took ${elapsedTime.toFixed(0)}ms`);

        if (remainingTime > 0) {
            console.log(`⏳ Waiting ${remainingTime.toFixed(0)}ms for smooth transition...`);
            await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        if (callback) {
            callback();
        }

        console.log("✅ Loader hidden - dashboard ready");
        this.loadingStartTime = null;
    }

    getLoadingDuration() {
        if (!this.loadingStartTime) return 0;
        return performance.now() - this.loadingStartTime;
    }

    isLoading() {
        return this.loadingStartTime !== null;
    }

    logProgress(message) {
        const duration = this.getLoadingDuration();
        console.log(`📊 [${duration.toFixed(0)}ms] ${message}`);
    }
}
