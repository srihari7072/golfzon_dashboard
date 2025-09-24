{
    "name": "Golfzon Dashboard",
    "version": "2.1.0",
    "category": "Custom/Dashboard",
    "summary": "Professional Golfzon Dashboard with Fully Modular Architecture",
    "description": """
    Enhanced Golfzon Dashboard featuring:
    
    🏗️ Architecture:
    - Completely modular service-based architecture
    - Separated XML templates by functionality
    - Modular SCSS components for better maintainability
    - Professional utility classes and mixins
    
    📊 Features:
    - Enhanced heatmap design with detail modal
    - Interactive charts with Chart.js integration
    - Location-based weather integration
    - Real-time KPI performance indicators
    - Responsive design with mobile support
    
    🛠️ Technical:
    - OWL 2.0 components with modern hooks
    - Service layer for data management
    - Utility layer for common operations
    - Modular SCSS with component separation
    - Professional error handling and logging
    """,
    "author": "Golfzon",
    "depends": ["web", "base"],
    "data": [
        "security/ir.model.access.csv",
        "views/menu.xml", 
        "views/templates.xml",
        "data/dummy_data.xml",
        "views/booking_info_views.xml",
        "views/account_info.xml",
        "views/accounts.xml",
        "views/admin_login_his.xml",
        "views/admin_privacy_his.xml",
        "views/api_log.xml",
        "views/bookg_confirm_his.xml",
        "views/persons.xml",
        "views/visit_customer.xml",
        "views/payment_infos_views.xml",
        "views/sales_infos_views.xml",
        "views/day_sum_payments_views.xml",
        "views/day_sum_greenfees_views.xml",
    ],

    "assets": {
        "web.assets_backend": [
            # Main SCSS file (imports all components)
            "golfzon_dashboard/static/src/scss/dashboard.scss",
            
            # External Libraries
            "golfzon_dashboard/static/lib/chartjs/Chart.min.js",
            
            # XML Templates
            "golfzon_dashboard/static/src/xml/dashboard_templates.xml",
            "golfzon_dashboard/static/src/xml/components/navigation.xml",
            "golfzon_dashboard/static/src/xml/components/weather_widget.xml",
            "golfzon_dashboard/static/src/xml/components/performance_indicators.xml",
            "golfzon_dashboard/static/src/xml/components/chart_widgets.xml",
            "golfzon_dashboard/static/src/xml/components/reservation_forecast.xml",
            "golfzon_dashboard/static/src/xml/components/visitor_status.xml",
            "golfzon_dashboard/static/src/xml/components/sales_status.xml",
            
            # JavaScript Utilities
            "golfzon_dashboard/static/src/js/utils/date_utils.js",
            "golfzon_dashboard/static/src/js/utils/localization_utils.js",
            
            # JavaScript Services
            "golfzon_dashboard/static/src/js/services/weather_service.js",
            "golfzon_dashboard/static/src/js/services/golf_data_service.js",
            "golfzon_dashboard/static/src/js/services/chart_service.js",
            
            # Main JavaScript Component
            "golfzon_dashboard/static/src/js/dashboard_client.js",
        ],
    },
    "installable": True,
    "application": True,
    "auto_install": False,
    "license": "LGPL-3",
} # type: ignore
