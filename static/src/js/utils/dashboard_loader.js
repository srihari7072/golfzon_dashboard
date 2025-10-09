/** @odoo-module **/

import { Component } from "@odoo/owl";

export class DashboardLoader extends Component {
    static template = "golfzon_dashboard.LoaderComponent";
    
    static props = {
        isLoading: { type: Boolean, optional: false },
    };

    setup() {
        // Component setup
        console.log("🎨 Loader component initialized");
    }

    onMounted() {
        console.log("🎨 Loader component mounted");
    }

    onWillUnmount() {
        console.log("🎨 Loader component will unmount");
    }
}
