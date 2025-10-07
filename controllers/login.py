from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

HARDCODED_LOGIN = "admin"
HARDCODED_PASSWORD = "admin"
SESSION_KEY = "custom_user"

def force_logout_if_logged_in():
    session = request.session
    _logger.info("🔍 Session contents before logout check: %s", dict(session))

    # Skip logout once after login
    if session.get("just_logged_in"):
        _logger.info("✅ Skipping logout due to recent login")
        session.pop("just_logged_in", None)
        return None

    if session.get(SESSION_KEY):
        _logger.info("❌ Force logging out user on path: %s", request.httprequest.path)
        session.pop(SESSION_KEY, None)
        return request.redirect('/custom/dashboard/login')

    return None


class CustomDashboardController(http.Controller):

    @http.route('/custom/dashboard/login', type='http', auth='public', website=True)
    def login(self, **kwargs):
        return request.render('golfzon_dashboard.custom_login_template', {'error': False})

    @http.route('/custom/dashboard/login/submit', type='http', auth='public', methods=['POST'], website=True)
    def login_submit(self, **post):
        login = post.get('login', '').strip()
        password = post.get('password', '')

        if login == HARDCODED_LOGIN and password == HARDCODED_PASSWORD:
            request.session[SESSION_KEY] = login
            request.session["just_logged_in"] = True
            _logger.info("✅ User logged in successfully: %s", login)
            
            # Redirect using XML ID reference instead of hardcoded action number
            return self.redirect_to_dashboard()

        return request.render('golfzon_dashboard.custom_login_template', {'error': 'Invalid credentials'})

    def redirect_to_dashboard(self):
        """Redirect to dashboard using XML ID reference"""
        try:
            # Get the action by XML ID reference
            action_ref = request.env.ref('golfzon_dashboard.action_golfzon_dashboard')
            dashboard_url = f'/web#action={action_ref.id}'
            _logger.info("🎯 Redirecting to dashboard: %s (Action ID: %d)", dashboard_url, action_ref.id)
            return request.redirect(dashboard_url)
        except Exception as e:
            _logger.error("❌ Failed to find dashboard action: %s", str(e))
            # Fallback to a generic URL if action not found
            return request.redirect('/web#home')

    @http.route('/custom/golfzon/access', type='http', auth='public', website=True)
    def golfzon_access(self, **kw):
        """Direct menu access point for Golfzon Dashboard with authentication"""
        user = request.session.get(SESSION_KEY)
        
        if not user:
            _logger.info("🔒 Menu access without session, redirecting to login")
            return request.redirect('/custom/dashboard/login')
        
        # Check if force logout is needed (except just after login)
        response = force_logout_if_logged_in()
        if response:
            return response
        
        _logger.info("✅ Menu access authenticated, loading dashboard")
        return self.redirect_to_dashboard()

    # Handle direct dashboard access
    @http.route('/custom/dashboard', type='http', auth='public', website=True)
    def dashboard(self, **kw):
        user = request.session.get(SESSION_KEY)
        if not user:
            return request.redirect('/custom/dashboard/login')
            
        response = force_logout_if_logged_in()
        if response:
            return response

        _logger.info("✅ Authenticated user accessing dashboard")
        return self.redirect_to_dashboard()

    @http.route('/custom/logout', type='http', auth='public', website=True)
    def custom_logout(self, **kw):
        """Custom logout that clears session and redirects to login"""
        request.session.pop(SESSION_KEY, None)
        request.session.pop("just_logged_in", None)
        _logger.info("🚪 User logged out, redirecting to login")
        return request.redirect('/custom/dashboard/login')