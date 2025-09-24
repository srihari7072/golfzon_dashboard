from odoo import http, _
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)

class GolfzonDashboardController(http.Controller):
    
    @http.route('/golfzon/dashboard/set_lang', type='http', auth='user', methods=['GET'], csrf=False)
    def set_language(self, lang=None, **kwargs):
        """Handle language switching for dashboard"""
        try:
            if lang:
                request.env.user.lang = lang
                request.session['lang'] = lang
                _logger.info(f"✅ Language switched to: {lang}")
            
            redirect_url = kwargs.get('redirect', '/web#action=golfzon_dashboard.action_golfzon_dashboard')
            return request.redirect(redirect_url)
            
        except Exception as e:
            _logger.error(f"❌ Error setting language: {str(e)}")
            return request.redirect('/web#action=golfzon_dashboard.action_golfzon_dashboard')
    
    @http.route('/golfzon/dashboard/golf_info', type='json', auth='user', methods=['POST'])
    def get_golf_info(self, lat=None, lon=None, **kwargs):
        """Get golf info from database ONLY"""
        try:
            booking_model = request.env['booking.info']
            summary_data = booking_model.get_booking_summary()
            booking_details = booking_model.get_booking_details(limit=80)
            
            _logger.info(f"📊 Database golf info: {len(booking_details)} bookings")
            
            return {
                'reservations': summary_data['reservations'],
                'teeTime': summary_data['teeTime'],
                'reservationDetails': booking_details,
                'status': 'success'
            }
            
        except Exception as e:
            _logger.error(f"❌ Database golf info error: {str(e)}")
            return {
                'reservations': {'current': 0, 'total': 80},
                'teeTime': {
                    'part1': {'current': 0, 'total': 50},
                    'part2': {'current': 0, 'total': 30},
                    'part3': {'current': 0, 'total': 15}
                },
                'reservationDetails': [],
                'status': 'error',
                'message': str(e)
            }

    @http.route('/golfzon/api/bookings', type='http', auth='user', methods=['GET'], csrf=False)
    def get_bookings_http(self, **kwargs):
        """HTTP endpoint for database bookings only"""
        try:
            booking_model = request.env['booking.info']
            bookings = booking_model.get_booking_details(limit=80)
            
            return request.make_response(
                json.dumps({
                    'status': 'success',
                    'reservations': bookings,
                    'count': len(bookings)
                }),
                headers={'Content-Type': 'application/json'}
            )
            
        except Exception as e:
            _logger.error(f"❌ HTTP bookings error: {str(e)}")
            return request.make_response(
                json.dumps({
                    'status': 'error',
                    'message': str(e),
                    'reservations': [],
                    'count': 0
                }),
                headers={'Content-Type': 'application/json'}
            )
        
    # In your controllers/main.py - wherever you handle reservation data
    @http.route('/golfzon/api/reservation_data', type='http', auth='user', methods=['GET'], csrf=False, website=True)
    def get_reservation_data_http(self, period='30days', **kwargs):
        """Reservation data endpoint - FIXED for cross-system compatibility"""
        try:
            booking_model = request.env['booking.info']
            days = 7 if period == '7days' else 30
            
            # Get reservation list data
            reservation_query = """
                SELECT 
                    CAST(bookg_info_id AS INTEGER) as id,  -- ✅ FIXED: Cast to INTEGER to remove decimals
                    reservation_person,
                    reservation_date,
                    tee_time,
                    rounds
                FROM booking_info 
                WHERE reservation_date IS NOT NULL
                ORDER BY reservation_date DESC, tee_time DESC
                LIMIT 20
            """
            
            booking_model.env.cr.execute(reservation_query)
            results = booking_model.env.cr.fetchall()
            
            # ✅ FIXED: Format data with proper integer IDs
            reservations = []
            for result in results:
                reservations.append({
                    'id': int(result[0]) if result[0] else 0,  # Ensure integer format
                    'reservation_person': str(result[1]) if result[1] else '',
                    'reservation_date': str(result[2]) if result[2] else '',
                    'tee_time': str(result[3]) if result[3] else '',
                    'rounds': int(result[4]) if result[4] else 0
                })
            
            response_data = {
                'status': 'success',
                'reservations': reservations
            }
            
            return request.make_response(
                json.dumps(response_data),
                headers={'Content-Type': 'application/json'}
            )
            
        except Exception as e:
            _logger.error(f"❌ Reservation data error: {str(e)}")
            return request.make_response(
                json.dumps({
                    'status': 'error',
                    'message': str(e),
                    'reservations': []
                }),
                headers={'Content-Type': 'application/json'}
            )

    @http.route('/golfzon/dashboard/chart_data', type='json', auth='user', methods=['POST'])
    def get_chart_data(self, chart_type='reservation', period='30days', **kwargs):
        """Get chart data using intelligent date range detection"""
        try:
            booking_model = request.env['booking.info']
            
            if chart_type == 'reservation':
                days = 7 if period == '7days' else 30
                
                # First get data summary to understand what's available
                data_summary = booking_model.get_data_summary()
                _logger.info(f"📊 Database Summary: {data_summary}")
                
                if not data_summary['has_data']:
                    _logger.warning("❌ No booking data found in database")
                    return {
                        'status': 'success',
                        'chart_type': chart_type,
                        'period': period,
                        'data': {
                            'current_reservations': [0] * days,
                            'prev_year_reservations': [0] * days,
                            'labels': [f"Day {i+1}" for i in range(days)],
                            'totals': {
                                'current_total': 0,
                                'prev_year_total': 0,
                                'growth_percentage': 0,
                                'operation_rate': 0
                            },
                            'operation_breakdown': {'part1': 0, 'part2': 0, 'part3': 0},
                            'date_info': {
                                'message': 'No data available in database'
                            }
                        }
                    }
                
                # Get smart chart data using available data period
                chart_data = booking_model.get_reservation_chart_data(days)
                operation_breakdown = booking_model.get_operation_breakdown()
                
                _logger.info(f"📊 Smart Chart Data: Period {chart_data['date_info']['current_start']} to {chart_data['date_info']['current_end']}")
                _logger.info(f"📊 Chart Totals: Current={chart_data['totals']['current_total']}, Prev Year={chart_data['totals']['prev_year_total']}")
                
                return {
                    'status': 'success',
                    'chart_type': chart_type,
                    'period': period,
                    'data': {
                        'current_reservations': chart_data['current_data'],
                        'prev_year_reservations': chart_data['prev_year_data'],
                        'labels': chart_data['labels'],
                        'totals': chart_data['totals'],
                        'operation_breakdown': operation_breakdown,
                        'date_info': chart_data['date_info'],
                        'data_summary': data_summary
                    }
                }
            else:
                return {
                    'status': 'error',
                    'message': f'Chart type {chart_type} not supported'
                }
                
        except Exception as e:
            _logger.error(f"❌ Smart chart data error: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }

    @http.route('/golfzon/api/chart_data', type='http', auth='user', methods=['GET'], csrf=False)
    def get_chart_data_http(self, chart_type='reservation', period='30days', **kwargs):
        """HTTP endpoint for chart data (no RPC required)"""
        try:
            booking_model = request.env['booking.info']
            
            if chart_type == 'reservation':
                days = 7 if period == '7days' else 30
                
                # Get data summary
                data_summary = booking_model.get_data_summary()
                _logger.info(f"📊 HTTP Chart API - Database Summary: {data_summary}")
                
                if not data_summary['has_data']:
                    response_data = {
                        'status': 'success',
                        'chart_type': chart_type,
                        'period': period,
                        'data': {
                            'current_reservations': [0] * days,
                            'prev_year_reservations': [0] * days,
                            'labels': [f"Day {i+1}" for i in range(days)],
                            'totals': {
                                'current_total': 0,
                                'prev_year_total': 0,
                                'growth_percentage': 0,
                                'operation_rate': 0
                            },
                            'operation_breakdown': {'part1': 0, 'part2': 0, 'part3': 0},
                            'date_info': {
                                'message': 'No data available in database'
                            }
                        }
                    }
                else:
                    # Get smart chart data
                    chart_data = booking_model.get_reservation_chart_data(days)
                    operation_breakdown = booking_model.get_operation_breakdown()
                    
                    _logger.info(f"📊 HTTP Chart API - Success: Period {chart_data['date_info']['current_start']} to {chart_data['date_info']['current_end']}")
                    
                    response_data = {
                        'status': 'success',
                        'chart_type': chart_type,
                        'period': period,
                        'data': {
                            'current_reservations': chart_data['current_data'],
                            'prev_year_reservations': chart_data['prev_year_data'],
                            'labels': chart_data['labels'],
                            'totals': chart_data['totals'],
                            'operation_breakdown': operation_breakdown,
                            'date_info': chart_data['date_info'],
                            'data_summary': data_summary
                        }
                    }
                
                return request.make_response(
                    json.dumps(response_data),
                    headers={'Content-Type': 'application/json'}
                )
            else:
                error_response = {
                    'status': 'error',
                    'message': f'Chart type {chart_type} not supported'
                }
                return request.make_response(
                    json.dumps(error_response),
                    headers={'Content-Type': 'application/json'}
                )
                
        except Exception as e:
            _logger.error(f"❌ HTTP Chart API error: {str(e)}")
            error_response = {
                'status': 'error',
                'message': str(e)
            }
            return request.make_response(
                json.dumps(error_response),
                headers={'Content-Type': 'application/json'}
            )

    @http.route('/golfzon/api/heatmap_data', type='http', auth='user', methods=['GET'], csrf=False)
    def get_heatmap_data_http(self, **kwargs):
        """HTTP endpoint for heatmap data WITH pre-calculated details"""
        try:
            booking_model = request.env['booking.info']
            heatmap_data = booking_model.get_heatmap_data_with_details()
            
            _logger.info(f"📊 Heatmap API Success with pre-calculated details:")
            _logger.info(f"    Date Range: {heatmap_data['date_range']}")
            _logger.info(f"    Pre-calculated cells: {len(heatmap_data['cell_details'])}")
            
            response_data = {
                'status': 'success',
                'data': heatmap_data
            }
            
            return request.make_response(
                json.dumps(response_data),
                headers={'Content-Type': 'application/json'}
            )
            
        except Exception as e:
            _logger.error(f"❌ Heatmap API error: {str(e)}")
            # Return empty but valid structure
            booking_model = request.env['booking.info']
            empty_data = booking_model._get_empty_heatmap_with_details()
            
            error_response = {
                'status': 'error',
                'message': str(e),
                'data': empty_data
            }
            return request.make_response(
                json.dumps(error_response),
                headers={'Content-Type': 'application/json'}
            )

    @http.route('/golfzon/api/visitor_data', type='http', auth='user', methods=['GET'], csrf=False, website=True)
    def get_visitor_data_http(self, period='30days', **kwargs):
        """HTTP endpoint for visitor chart data - SAME PATTERN AS RESERVATION"""
        try:
            # ✅ COPY EXACT PATTERN from your working reservation chart
            visitor_model = request.env['visit.customer']
            days = 7 if period == '7days' else 30
            
            # Get data summary first (same as reservation)
            data_summary = visitor_model.get_visitor_data_summary()
            _logger.info(f"📊 HTTP Visitor API - Database Summary: {data_summary}")
            
            if not data_summary['has_data']:
                response_data = {
                    'status': 'success',
                    'chart_type': 'visitor',
                    'period': period,
                    'data': {
                        'current_visitors': [0] * days,
                        'prev_year_visitors': [0] * days,
                        'labels': [f"Day {i+1}" for i in range(days)],
                        'totals': {
                            'current_total': 0,
                            'prev_year_total': 0,
                            'growth_percentage': 0
                        },
                        'section_totals': {'part1': 0, 'part2': 0, 'part3': 0},
                        'date_info': {
                            'message': 'No data available in database'
                        }
                    }
                }
            else:
                # ✅ COPY EXACT PATTERN: Get chart data
                chart_data = visitor_model.get_visitor_chart_data(days)
                _logger.info(f"📊 HTTP Visitor API - Success: Period {chart_data['date_info']['current_start']} to {chart_data['date_info']['current_end']}")
                
                response_data = {
                    'status': 'success',
                    'chart_type': 'visitor',
                    'period': period,
                    'data': {
                        'current_visitors': chart_data['current_data'],
                        'prev_year_visitors': chart_data['prev_year_data'],
                        'labels': chart_data['labels'],
                        'totals': chart_data['totals'],
                        'section_totals': chart_data['section_totals'],
                        'date_info': chart_data['date_info'],
                        'data_summary': data_summary
                    }
                }
            
            return request.make_response(
                json.dumps(response_data),
                headers={'Content-Type': 'application/json'}
            )
            
        except Exception as e:
            _logger.error(f"❌ HTTP Visitor API error: {str(e)}")
            error_response = {
                'status': 'error',
                'message': str(e),
                'chart_type': 'visitor',
                'period': period
            }
            
            return request.make_response(
                json.dumps(error_response),
                headers={'Content-Type': 'application/json'}
            )

    @http.route('/golfzon/api/debug/hole_data', type='http', auth='user', methods=['GET'], csrf=False, website=True)
    def debug_hole_data(self, **kwargs):
        """Debug what hole_scd values exist"""
        try:
            visitor_model = request.env['visit.customer']
            
            # Check hole_scd values for last 7 days from max date
            debug_query = """
                SELECT 
                    hole_scd,
                    COUNT(*) as count,
                    MIN(visit_date) as first_date,
                    MAX(visit_date) as last_date
                FROM visit_customers 
                WHERE visit_date >= (
                    SELECT DATE(MAX(visit_date), '-7 days') 
                    FROM visit_customers
                )
                AND hole_scd IS NOT NULL
                GROUP BY hole_scd
                ORDER BY count DESC
            """
            
            visitor_model.env.cr.execute(debug_query)
            results = visitor_model.env.cr.fetchall()
            
            return request.make_response(
                json.dumps({
                    'status': 'success',
                    'hole_scd_values': [
                        {
                            'hole_scd': r[0],
                            'count': r[1],
                            'first_date': str(r[2]),
                            'last_date': str(r[3])
                        } for r in results
                    ],
                    'total_different_values': len(results)
                }),
                headers={'Content-Type': 'application/json'}
            )
            
        except Exception as e:
            return request.make_response(
                json.dumps({'status': 'error', 'message': str(e)}),
                headers={'Content-Type': 'application/json'}
            )

    @http.route('/golfzon/api/debug/visitor_gender', type='http', auth='user', methods=['GET'], csrf=False, website=True)
    def debug_visitor_gender(self, **kwargs):
        """Debug visitor gender values in visit_customers table"""
        try:
            visitor_model = request.env['visit.customer']
            
            # Check what gender_scd values exist
            debug_query = """
                SELECT 
                    gender_scd,
                    COUNT(*) as count
                FROM visit_customers 
                WHERE gender_scd IS NOT NULL
                    AND TRIM(gender_scd) != ''
                GROUP BY gender_scd
                ORDER BY count DESC
            """
            
            visitor_model.env.cr.execute(debug_query)
            results = visitor_model.env.cr.fetchall()
            
            return request.make_response(
                json.dumps({
                    'status': 'success',
                    'gender_values': [
                        {
                            'gender_scd': r[0],
                            'count': r[1]
                        } for r in results
                    ],
                    'total_different_values': len(results),
                    'table_used': 'visit_customers'
                }),
                headers={'Content-Type': 'application/json'}
            )
            
        except Exception as e:
            return request.make_response(
                json.dumps({'status': 'error', 'message': str(e)}),
                headers={'Content-Type': 'application/json'}
            )

    @http.route('/golfzon/api/debug/system_info', type='http', auth='user', methods=['GET'], csrf=False, website=True)
    def debug_system_info(self, **kwargs):
        """Debug system compatibility information"""
        try:
            visitor_model = request.env['visit.customer']
            
            # Test data types
            test_query = """
                SELECT 
                    bookg_info_id,
                    CAST(bookg_info_id AS INTEGER) as id_as_int,
                    visit_date,
                    CAST(visit_date AS DATE) as date_as_date
                FROM visit_customers 
                LIMIT 5
            """
            
            visitor_model.env.cr.execute(test_query)
            results = visitor_model.env.cr.fetchall()
            
            return request.make_response(
                json.dumps({
                    'status': 'success',
                    'system_info': {
                        'database_type': visitor_model.env.cr._cnx.dsn if hasattr(visitor_model.env.cr._cnx, 'dsn') else 'unknown',
                        'sample_data': [
                            {
                                'original_id': str(r[0]),
                                'cast_id': int(r[1]) if r[1] else 0,
                                'original_date': str(r[2]),
                                'cast_date': str(r[3])
                            } for r in results
                        ]
                    }
                }),
                headers={'Content-Type': 'application/json'}
            )
            
        except Exception as e:
            return request.make_response(
                json.dumps({'status': 'error', 'message': str(e)}),
                headers={'Content-Type': 'application/json'}
            )
