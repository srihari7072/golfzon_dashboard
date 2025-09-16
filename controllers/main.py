from odoo import http, _
from odoo.http import request
import requests
import random
from datetime import datetime, timedelta

API_KEY = "cd5743655e1a5d90679cffd3f85fa4fd"  # OpenWeatherMap API Key

class GolfzonDashboardController(http.Controller):
    @http.route('/golfzon/dashboard/set_lang', type='http', auth='user')
    def set_dashboard_lang(self, lang, **kw):
        """Set the user's session language then redirect back to the dashboard action.

        The webclient expects a route that persists the language. We update
        both the session and the current user's lang to persist beyond session.
        """
        # Normalize language code
        lang = (lang or '').strip()
        if not lang:
            lang = request.env.user.lang or request.env.context.get('lang') or 'en_US'

        # Update session language
        request.session.context = dict(request.session.context or {}, lang=lang)

        # Persist on the user preference as well (no error if no rights)
        try:
            request.env.user.sudo().write({'lang': lang})
        except Exception:
            pass

        # Redirect to the dashboard client action with hash
        action = request.env['ir.actions.client'].sudo()._for_xml_id('golfzon_dashboard.action_golfzon_dashboard')
        target = "/web#action=%s" % action.get('id')
        return request.redirect(target)

    @http.route('/golfzon/dashboard', auth='user', website=False)
    def backend_dashboard(self, **kw):
        return request.env['ir.actions.client'].sudo()._for_xml_id('golfzon_dashboard.action_golfzon_dashboard')

    @http.route('/golfzon/dashboard/data', auth='user', type='json')
    def dashboard_data(self):
        return {
            "today_reservations_label": _("Today's Reservations"),
            "revenue_label": _("Revenue"),
            "new_leads_label": _("New Leads"),
            "campaign_engagement_label": _("Campaign Engagement"),
            "revenue_trend_label": _("Revenue Trends"),
            "reservation_donut_label": _("Reservation Patterns"),
            "customer_growth_label": _("Customer Growth"),
            "today_reservations": 28,
            "revenue": 4500,
            "new_leads": 12,
            "campaign_engagement": 5,
            "revenue_trend": [0, 500, 1200, 1800, 2200, 2500],
            "reservation_donut": [40, 30, 20, 10],
            "customer_growth": [25, 20, 30, 18, 35, 22, 40, 28, 25, 50, 20, 45],
            "activities": [
                _("13 mins ago - New Reservation"), 
                _("1 hour ago - 2 New Leads"), 
                _("Today - 3 SMS Campaigns")
            ],
            "recent_activities": [
                {
                    "time": _("13 mins ago"),
                    "action": _("New Reservation"),
                    "type": _("reservation")
                },
                {
                    "time": _("1 hour ago"), 
                    "action": _("2 New Leads"),
                    "type": _("leads")
                },
                {
                    "time": _("Today"),
                    "action": _("3 SMS Campaigns"), 
                    "type": _("campaign")
                }
            ],
            "monthly_stats": {
                "total_customers": 1250,
                "active_campaigns": 8,
                "conversion_rate": 12.5,
                "average_revenue_per_customer": 360
            }
        }

    @http.route('/golfzon/dashboard/golf_info', auth='user', type='json')
    def get_golf_info(self, lat=None, lon=None):
        """Get golf course specific information including weather and reservations"""
        
        # Default coordinates (Mumbai as fallback)
        default_lat = "19.0760"
        default_lon = "72.8777"
        
        # Use provided coordinates or defaults
        lat = lat or default_lat
        lon = lon or default_lon
        
        hourly_weather = []
        location_name = "Unknown Location"
        
        try:
            # Get location name using reverse geocoding
            geocoding_url = f"https://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={API_KEY}"
            geo_response = requests.get(geocoding_url)
            if geo_response.status_code == 200:
                geo_data = geo_response.json()
                if geo_data:
                    location_name = f"{geo_data[0].get('name', 'Unknown')}, {geo_data[0].get('country', '')}"
            
            # Fetch weather data from OpenWeatherMap API
            weather_url = f"https://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lon}&exclude=minutely,daily,alerts&appid={API_KEY}&units=metric"
            response = requests.get(weather_url)
            
            if response.status_code == 200:
                weather_data = response.json()
                
                # Get current weather
                current = weather_data.get('current', {})
                current_temp = int(current.get('temp', 25))
                current_weather = current.get('weather', [{}])[0]
                
                # Generate hourly weather data for next 24 hours
                for i, hour in enumerate(weather_data.get('hourly', [])[:24]):
                    hour_time = datetime.fromtimestamp(hour['dt'])
                    
                    # Weather icon mapping
                    icon_code = hour['weather'][0]['icon']
                    weather_icons = {
                        '01d': '☀️', '01n': '🌙',
                        '02d': '⛅', '02n': '☁️',
                        '03d': '☁️', '03n': '☁️',
                        '04d': '☁️', '04n': '☁️',
                        '09d': '🌧️', '09n': '🌧️',
                        '10d': '🌦️', '10n': '🌧️',
                        '11d': '⛈️', '11n': '⛈️',
                        '13d': '❄️', '13n': '❄️',
                        '50d': '🌫️', '50n': '🌫️'
                    }
                    
                    hourly_weather.append({
                        'time': hour_time.strftime('%H:%M'),
                        'icon': weather_icons.get(icon_code, '☀️'),
                        'temperature': int(hour['temp']),
                        'precipitation': int(hour.get('rain', {}).get('1h', 0) if 'rain' in hour else 0),
                        'chance': int(hour.get('pop', 0) * 100)
                    })
                
                current_weather_data = {
                    'temperature': current_temp,
                    'precipitation': int(current.get('rain', {}).get('1h', 0) if 'rain' in current else 0),
                    'chance': int(current.get('clouds', 0)),
                    'icon': weather_icons.get(current_weather.get('icon', '01d'), '☀️'),
                    'location': location_name
                }
            else:
                raise Exception("Weather API request failed")
                
        except Exception as e:
            print(f"Weather API Error: {e}")
            # Fallback weather data
            current_weather_data = self._get_fallback_weather(location_name)
            hourly_weather = self._get_fallback_hourly_weather()
        
        # Generate reservation details
        reservation_details = self._generate_reservation_details()
        
        return {
            'weather': current_weather_data,
            'reservations': {
                'current': 78,
                'total': 80
            },
            'teeTime': {
                'part1': {'current': 40, 'total': 50},
                'part2': {'current': 25, 'total': 30},
                'part3': {'current': 7, 'total': 15}
            },
            'hourlyWeather': hourly_weather,
            'reservationDetails': reservation_details
        }
    
    def _get_fallback_weather(self, location_name):
        """Fallback weather data when API fails"""
        return {
            'temperature': 25,
            'precipitation': 0,
            'chance': 10,
            'icon': '☀️',
            'location': location_name or "Default Location"
        }
    
    def _get_fallback_hourly_weather(self):
        """Fallback hourly weather data"""
        hourly_weather = []
        base_time = datetime.now().replace(minute=0, second=0, microsecond=0)
        
        for i in range(24):
            time_slot = base_time + timedelta(hours=i)
            temp_variation = random.randint(18, 30)
            precipitation = random.randint(0, 10) if random.random() > 0.7 else 0
            
            # More realistic weather icons based on time
            hour = time_slot.hour
            if hour < 6 or hour > 20:
                icon = '🌙'
            elif hour < 10:
                icon = '🌅'
            elif hour < 16:
                icon = '☀️'
            else:
                icon = '🌇'
            
            hourly_weather.append({
                'time': time_slot.strftime('%H:%M'),
                'icon': icon,
                'temperature': temp_variation,
                'precipitation': precipitation,
                'chance': random.randint(0, 30)
            })
        
        return hourly_weather
    
    def _generate_reservation_details(self):
        """Generate reservation details"""
        names = [
            'John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emily Davis', 
            'David Brown', 'Lisa Anderson', 'Tom Garcia', 'Anna Martinez',
            'Chris Lee', 'Jessica Taylor', 'Robert Chen', 'Maria Rodriguez',
            'Kevin Park', 'Amanda White', 'Daniel Kim', 'Rachel Green',
            'James Wilson', 'Michelle Brown', 'Steven Clark', 'Jennifer Lopez',
            'Michael Davis', 'Ashley Miller', 'Christopher Moore', 'Amanda Taylor',
            'Matthew Anderson', 'Stephanie Thomas', 'Andrew Jackson', 'Nicole White',
            'Joshua Harris', 'Melissa Martin', 'Daniel Thompson', 'Laura Garcia',
            'Ryan Martinez', 'Kimberly Robinson', 'Brandon Lewis', 'Amy Walker',
            'Jason Hall', 'Rebecca Allen', 'Justin Young', 'Samantha King'
        ]
        
        reservation_details = []
        today = datetime.now().strftime('%Y-%m-%d')
        
        for i in range(80):
            start_hour = 6 + (i * 0.25)
            hour = int(start_hour)
            minute = int((start_hour - hour) * 60)
            tee_time = f"{hour:02d}:{minute:02d}"
            
            reservation_details.append({
                'id': f'R{i+1:03d}',
                'person': names[i % len(names)],
                'date': today,
                'teeTime': tee_time,
                'rounds': random.choice([9, 18])
            })
        
        return reservation_details

    @http.route('/golfzon/dashboard/detect_location', auth='user', type='json')
    def detect_location(self, lat, lon):
        """Detect location name from coordinates"""
        try:
            geocoding_url = f"https://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={API_KEY}"
            response = requests.get(geocoding_url)
            if response.status_code == 200:
                data = response.json()
                if data:
                    location = f"{data[0].get('name', 'Unknown')}, {data[0].get('country', '')}"
                    return {'success': True, 'location': location}
        except Exception as e:
            print(f"Location detection error: {e}")
        
        return {'success': False, 'location': 'Unknown Location'}

    @http.route('/golfzon/dashboard/performance_indicators', auth='user', type='json')
    def get_performance_indicators(self):
        """Get performance indicators data"""
        return {
            "sales_performance": {
                "current_revenue": "120,000,000,000",
                "monthly_revenue": "100,000,000", 
                "current_trend": "+11%",
                "monthly_trend": "+11%",
            },
            "avg_order_value": {
                "current_weekly_value": "200,000",
                "monthly_value": "200,000",
                "current_trend": "+11%", 
                "monthly_trend": "+13%",
            },
            "utilization_rate": {
                "current_weekly_capacity": "120,000,000,000",
                "monthly_capacity": "100,000,000",
                "current_trend": "-5%",
                "monthly_trend": "+20%",
            }
        }
