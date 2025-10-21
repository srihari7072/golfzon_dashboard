// Check and sync language state on dashboard load
odoo.define('golfzon_dashboard.LanguageSync', function (require) {
    'use strict';
    
    var ajax = require('web.ajax');
    
    function syncLanguageState() {
        // Get current user language from backend
        ajax.rpc('/web/session/get_session_info', {}).then(function(session) {
            var currentLang = session.user_context.lang || 'en_US';
            var isKorean = currentLang.includes('ko');
            
            // Update navbar highlight to match actual language
            var engBtn = document.querySelector('[data-lang="en_US"]');
            var korBtn = document.querySelector('[data-lang="ko_KR"]');
            
            if (isKorean) {
                if (engBtn) engBtn.classList.remove('active');
                if (korBtn) korBtn.classList.add('active');
            } else {
                if (korBtn) korBtn.classList.remove('active'); 
                if (engBtn) engBtn.classList.add('active');
            }
        });
    }
    
    // Run on dashboard load
    $(document).ready(function() {
        syncLanguageState();
    });
});