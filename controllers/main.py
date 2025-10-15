from odoo import http
from odoo.http import request
from datetime import datetime, timedelta, date
from calendar import monthrange
import json
import logging

_logger = logging.getLogger(__name__)


class SalesStatusController(http.Controller):

    @http.route('/golfzon/dashboard/set_lang', type='http', auth='user', methods=['GET'], csrf=False)
    def set_language(self, lang='ko_KR', **kwargs):
        """Handle language switching for dashboard"""
        try:
            if lang:
                # ✅ Update user language preference in database
                request.env.user.write({'lang': lang})
                request.session['lang'] = lang
                _logger.info(f"✅ Language switched to: {lang}")
            
            # Return JSON response instead of redirect for AJAX calls
            return request.make_response(
                json.dumps({
                    'status': 'success',
                    'current_lang': lang,
                    'message': f'Language switched to {lang}'
                }),
                headers={'Content-Type': 'application/json'}
            )
            
        except Exception as e:
            _logger.error(f"❌ Error setting language: {str(e)}")
            return request.make_response(
                json.dumps({
                    'status': 'error',
                    'message': str(e),
                    'current_lang': 'ko_KR'  # Default fallback
                }),
                headers={'Content-Type': 'application/json'}
            )
        
   
    @http.route('/golfzon/api/current_language', type='http', auth='user', methods=['GET'], csrf=False)
    def get_current_language(self, **kwargs):
        """Get current user language state"""
        try:
            current_lang = request.env.user.lang or 'ko_KR'  # Default to Korean
            is_korean = 'ko' in current_lang.lower()
            
            return request.make_response(
                json.dumps({
                    'status': 'success',
                    'current_lang': current_lang,
                    'is_korean': is_korean,
                    'display_name': 'Korean' if is_korean else 'English'
                }),
                headers={'Content-Type': 'application/json'}
            )
        except Exception as e:
            _logger.error(f"❌ Error getting current language: {str(e)}")
            return request.make_response(
                json.dumps({
                    'status': 'error',
                    'message': str(e),
                    'current_lang': 'ko_KR'  # Default to Korean on error
                }),
                headers={'Content-Type': 'application/json'}
            )    
            
    @http.route('/golfzon/api/set_default_korean', type='http', auth='user', methods=['GET'], csrf=False)
    def set_default_korean(self, **kwargs):
        """Set Korean as default language for current user"""
        try:
            # Update current user to Korean
            request.env.user.write({'lang': 'ko_KR'})
            request.session['lang'] = 'ko_KR'
            
            _logger.info(f"✅ Set Korean as default for user: {request.env.user.name}")
            
            return request.make_response(
                json.dumps({
                    'status': 'success',
                    'message': 'Korean set as default language',
                    'current_lang': 'ko_KR'
                }),
                headers={'Content-Type': 'application/json'}
            )
            
        except Exception as e:
            _logger.error(f"❌ Error setting Korean default: {str(e)}")
            return request.make_response(
                json.dumps({
                    'status': 'error', 
                    'message': str(e)
                }),
                headers={'Content-Type': 'application/json'}
            )
            
    @http.route('/golfzon/api/current_date', type='http', auth='user', methods=['GET'], csrf=False)
    def get_current_date(self, **kwargs):
        """Get current date formatted according to user language"""
        try:
            from datetime import datetime
            
            current_date = datetime.now()
            user_lang = request.env.user.lang or 'ko_KR'
            
            # Format date according to user language
            if 'ko' in user_lang.lower():
                # Korean format: "2025년 10월 5일 일요일"
                korean_days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
                korean_months = ['1월', '2월', '3월', '4월', '5월', '6월', 
                                '7월', '8월', '9월', '10월', '11월', '12월']
                
                day_name = korean_days[current_date.weekday()]
                month_name = korean_months[current_date.month - 1]
                
                formatted_date = f"{current_date.year}년 {month_name} {current_date.day}일 {day_name}"
            else:
                # English format: "Sunday, October 5, 2025"
                formatted_date = current_date.strftime('%A, %B %d, %Y')
            
            return request.make_response(
                json.dumps({
                    'status': 'success',
                    'formatted_date': formatted_date,
                    'language': user_lang,
                    'raw_date': current_date.isoformat()
                }),
                headers={'Content-Type': 'application/json'}
            )
            
        except Exception as e:
            _logger.error(f"❌ Error formatting date: {str(e)}")
            return request.make_response(
                json.dumps({
                    'status': 'error',
                    'message': str(e),
                    'formatted_date': 'Date unavailable'
                }),
                headers={'Content-Type': 'application/json'}
            )

    # Sales Status Data
    @http.route("/golfzon/sales_data", type="json", auth="user", methods=["POST"])
    def get_sales_data(self, period="30days"):
        """
        Fetch sales data from payment_infos table with millisecond performance.
        Returns data for current year and previous year for comparison.
        """
        try:
            start_time = datetime.now()

            _logger.info(f"Fetching sales data for period: {period}")

            # Determine the date range
            date_range = self._calculate_date_range(period)

            _logger.info(
                f"Date range: {date_range['current_start']} to {date_range['current_end']}"
            )

            # Fetch data for current year and previous year
            current_year_data = self._fetch_sales_by_period(
                date_range["current_start"], date_range["current_end"]
            )

            previous_year_data = self._fetch_sales_by_period(
                date_range["previous_start"], date_range["previous_end"]
            )

            # Calculate total sales (sum of all daily amounts)
            total_sales_current = sum(day["amount"] for day in current_year_data)
            total_sales_previous = sum(day["amount"] for day in previous_year_data)

            _logger.info(
                f"Total sales current: {total_sales_current}, previous: {total_sales_previous}"
            )

            # Calculate percentage change
            percentage_change = 0
            if total_sales_previous > 0:
                percentage_change = (
                    (total_sales_current - total_sales_previous) / total_sales_previous
                ) * 100

            # Calculate average unit price (average sales per day)
            # Count only days with actual sales (non-zero amounts)
            days_with_sales = len(
                [day for day in current_year_data if day["amount"] > 0]
            )
            avg_unit_price = (
                total_sales_current / days_with_sales if days_with_sales > 0 else 0
            )

            # Get total number of days in period
            total_days = len(current_year_data)

            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds() * 1000

            _logger.info(f"Sales data fetched in {execution_time:.2f}ms")
            _logger.info(
                f"Total sales: {total_sales_current}, Avg per day: {avg_unit_price}, Days with sales: {days_with_sales}/{total_days}"
            )

            return {
                "success": True,
                "data": {
                    "current_year": current_year_data,
                    "previous_year": previous_year_data,
                    "total_sales": round(
                        total_sales_current, 0
                    ),  # No decimals for display
                    "percentage_change": round(percentage_change, 1),  # 1 decimal
                    "average_unit_price": round(
                        avg_unit_price, 0
                    ),  # No decimals for display
                    "period": period,
                    "date_range": {
                        "start": date_range["current_start"].strftime("%Y-%m-%d"),
                        "end": date_range["current_end"].strftime("%Y-%m-%d"),
                    },
                    "execution_time_ms": round(execution_time, 2),
                    "days_with_sales": days_with_sales,
                    "total_days": total_days,
                },
            }
        except Exception as e:
            _logger.error(f"Error fetching sales data: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}

    def _calculate_date_range(self, period):
        """
        Calculate date ranges for current and previous year.
        Handles scenarios where today's data might not exist.
        """
        PaymentInfos = request.env["payment.infos"].sudo()

        # Try to get the latest date from database
        latest_record = PaymentInfos.search(
            [("cancel_yn", "=", "N"), ("pay_amt", ">", 0)],
            order="pay_date desc",
            limit=1,
        )

        if latest_record and latest_record.pay_date:
            # Use latest date from database as "today"
            reference_date = latest_record.pay_date
            _logger.info(f"Using latest date from database: {reference_date}")
        else:
            # Fallback to actual today
            reference_date = datetime.now().date()
            _logger.info(f"Using current date: {reference_date}")

        # Calculate number of days based on period
        if period == "7days":
            days = 7
        else:  # Default to 30 days
            days = 30

        # Current year range
        # For 7 days: 2025-09-29 to 2025-10-05 (7 days total)
        # For 30 days: 2025-09-06 to 2025-10-05 (30 days total)
        current_end = reference_date
        current_start = current_end - timedelta(days=days - 1)

        # Previous year range (same dates, previous year)
        try:
            previous_end = datetime(
                current_end.year - 1, current_end.month, current_end.day
            ).date()
            previous_start = datetime(
                current_start.year - 1, current_start.month, current_start.day
            ).date()
        except ValueError:
            # Handle Feb 29 in leap years
            previous_end = datetime(
                current_end.year - 1, current_end.month, current_end.day - 1
            ).date()
            previous_start = datetime(
                current_start.year - 1, current_start.month, current_start.day - 1
            ).date()

        _logger.info(f"Period: {period}, Days: {days}")
        _logger.info(f"Current: {current_start} to {current_end}")
        _logger.info(f"Previous: {previous_start} to {previous_end}")

        return {
            "current_start": current_start,
            "current_end": current_end,
            "previous_start": previous_start,
            "previous_end": previous_end,
            "days": days,
        }

    def _fetch_sales_by_period(self, start_date, end_date):
        """
        Fetch aggregated sales data using optimized SQL query.
        Groups by date and sums payment amounts.
        """
        # Use direct SQL for maximum performance
        query = """
            SELECT 
                pay_date,
                COALESCE(SUM(pay_amt), 0) as total_amount,
                COUNT(*) as transaction_count
            FROM payment_infos
            WHERE pay_date >= %s 
                AND pay_date <= %s
                AND cancel_yn = 'N'
            GROUP BY pay_date
            ORDER BY pay_date ASC
        """

        request.env.cr.execute(query, (start_date, end_date))
        results = request.env.cr.dictfetchall()

        _logger.info(
            f"Fetched {len(results)} days with data between {start_date} and {end_date}"
        )

        # Create a complete date range with zero values for missing dates
        date_dict = {}
        current_date = start_date
        while current_date <= end_date:
            date_dict[current_date.strftime("%Y-%m-%d")] = {
                "date": current_date.strftime("%Y-%m-%d"),
                "amount": 0,
                "transaction_count": 0,
            }
            current_date += timedelta(days=1)

        # Fill in actual data
        for row in results:
            date_key = row["pay_date"].strftime("%Y-%m-%d")
            if date_key in date_dict:
                # Store raw amount (database value)
                date_dict[date_key]["amount"] = float(row["total_amount"] or 0)
                date_dict[date_key]["transaction_count"] = row["transaction_count"]

        # Convert to list maintaining order
        result_list = list(date_dict.values())

        # Log summary
        total_amount = sum(day["amount"] for day in result_list)
        days_with_data = len([day for day in result_list if day["amount"] > 0])
        _logger.info(
            f"Total amount for period: {total_amount:,.0f}, Days with data: {days_with_data}/{len(result_list)}"
        )

        return result_list

    # Performance Cards Data
    @http.route("/golfzon/dashboard/performance_indicators", type="json", auth="user", methods=["POST"],)
    def get_performance_indicators(self, **kwargs):
        """
        Fetch performance indicators data from database with millisecond performance.
        Returns sales performance, average order value, and utilization rate metrics.
        """
        try:
            start_time = datetime.now()
            _logger.info("=== Fetching Performance Indicators ===")

            # Get date ranges
            today = datetime.now().date()
            current_year_start = date(today.year, 1, 1)
            current_month_start = date(today.year, today.month, 1)

            # Previous year dates
            prev_year_start = date(today.year - 1, 1, 1)
            prev_year_end = date(today.year - 1, 12, 31)

            # Previous year same month
            try:
                prev_month_start = date(today.year - 1, today.month, 1)
                if today.month == 12:
                    prev_month_end = date(today.year - 1, 12, 31)
                else:
                    last_day = monthrange(today.year - 1, today.month)[1]
                    prev_month_end = date(today.year - 1, today.month, last_day)
            except ValueError:
                # Handle leap year edge cases
                prev_month_start = date(today.year - 1, today.month, 1)
                prev_month_end = date(today.year - 1, today.month, 28)

            # Fetch all three card data
            sales_data = self._get_sales_performance_data(
                current_year_start,
                today,
                current_month_start,
                prev_year_start,
                prev_year_end,
                prev_month_start,
                prev_month_end,
            )

            aov_data = self._get_average_order_value_data(
                current_year_start,
                today,
                current_month_start,
                prev_year_start,
                prev_year_end,
                prev_month_start,
                prev_month_end,
            )

            utilization_data = self._get_utilization_rate_data(
                current_year_start,
                today,
                current_month_start,
                prev_year_start,
                prev_year_end,
                prev_month_start,
                prev_month_end,
            )

            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds() * 1000
            _logger.info(f"✅ Performance indicators fetched in {execution_time:.2f}ms")

            return {
                "success": True,
                "sales_performance": sales_data,
                "avg_order_value": aov_data,
                "utilization_rate": utilization_data,
                "execution_time_ms": round(execution_time, 2),
            }

        except Exception as e:
            _logger.error(
                f"❌ Error fetching performance indicators: {str(e)}", exc_info=True
            )
            return {"success": False, "error": str(e)}

    def _get_sales_performance_data(self, year_start, year_end, month_start, prev_year_start, prev_year_end, prev_month_start, prev_month_end):
        """Calculate sales performance metrics using optimized database queries"""

        PaymentInfos = request.env["payment.infos"].sudo()

        # Use read_group for aggregated queries - much faster than looping
        # Cumulative sales this year
        cumulative_current = PaymentInfos.read_group(
            [
                ("pay_date", ">=", year_start),
                ("pay_date", "<=", year_end),
                ("cancel_yn", "=", "N"),
            ],
            ["pay_amt:sum"],
            [],
        )
        cumulative_sales = (
            cumulative_current[0]["pay_amt"]
            if cumulative_current and cumulative_current[0].get("pay_amt")
            else 0
        )

        # Cumulative sales previous year
        cumulative_previous = PaymentInfos.read_group(
            [
                ("pay_date", ">=", prev_year_start),
                ("pay_date", "<=", prev_year_end),
                ("cancel_yn", "=", "N"),
            ],
            ["pay_amt:sum"],
            [],
        )
        cumulative_prev_sales = (
            cumulative_previous[0]["pay_amt"]
            if cumulative_previous and cumulative_previous[0].get("pay_amt")
            else 0
        )

        # Current monthly sales
        monthly_current = PaymentInfos.read_group(
            [
                ("pay_date", ">=", month_start),
                ("pay_date", "<=", year_end),
                ("cancel_yn", "=", "N"),
            ],
            ["pay_amt:sum"],
            [],
        )
        monthly_sales = (
            monthly_current[0]["pay_amt"]
            if monthly_current and monthly_current[0].get("pay_amt")
            else 0
        )

        # Previous year same month sales
        monthly_previous = PaymentInfos.read_group(
            [
                ("pay_date", ">=", prev_month_start),
                ("pay_date", "<=", prev_month_end),
                ("cancel_yn", "=", "N"),
            ],
            ["pay_amt:sum"],
            [],
        )
        monthly_prev_sales = (
            monthly_previous[0]["pay_amt"]
            if monthly_previous and monthly_previous[0].get("pay_amt")
            else 0
        )

        # Calculate year-over-year percentages
        cumulative_yoy = (
            ((cumulative_sales - cumulative_prev_sales) / cumulative_prev_sales * 100)
            if cumulative_prev_sales
            else 0
        )
        monthly_yoy = (
            ((monthly_sales - monthly_prev_sales) / monthly_prev_sales * 100)
            if monthly_prev_sales
            else 0
        )

        # Format for display
        return {
            "current_revenue": self._format_number(cumulative_sales),
            "monthly_revenue": self._format_number(monthly_sales),
            "current_trend": f"{'+' if cumulative_yoy >= 0 else ''}{int(round(cumulative_yoy))}%",
            "monthly_trend": f"{'+' if monthly_yoy >= 0 else ''}{int(round(monthly_yoy))}%",
            "current_trend_value": cumulative_yoy,
            "monthly_trend_value": monthly_yoy,
        }

    def _get_average_order_value_data(self, year_start,  year_end, month_start, prev_year_start, prev_year_end, prev_month_start, prev_month_end,):
        """Calculate average order value metrics using optimized database queries"""

        PaymentInfos = request.env["payment.infos"].sudo()

        # Cumulative average this year
        cumulative_current = PaymentInfos.read_group(
            [
                ("pay_date", ">=", year_start),
                ("pay_date", "<=", year_end),
                ("cancel_yn", "=", "N"),
            ],
            ["pay_amt:avg"],
            [],
        )
        cumulative_avg = (
            cumulative_current[0]["pay_amt"]
            if cumulative_current and cumulative_current[0].get("pay_amt")
            else 0
        )

        # Cumulative average previous year
        cumulative_previous = PaymentInfos.read_group(
            [
                ("pay_date", ">=", prev_year_start),
                ("pay_date", "<=", prev_year_end),
                ("cancel_yn", "=", "N"),
            ],
            ["pay_amt:avg"],
            [],
        )
        cumulative_prev_avg = (
            cumulative_previous[0]["pay_amt"]
            if cumulative_previous and cumulative_previous[0].get("pay_amt")
            else 0
        )

        # Current monthly average
        monthly_current = PaymentInfos.read_group(
            [
                ("pay_date", ">=", month_start),
                ("pay_date", "<=", year_end),
                ("cancel_yn", "=", "N"),
            ],
            ["pay_amt:avg"],
            [],
        )
        monthly_avg = (
            monthly_current[0]["pay_amt"]
            if monthly_current and monthly_current[0].get("pay_amt")
            else 0
        )

        # Previous year same month average
        monthly_previous = PaymentInfos.read_group(
            [
                ("pay_date", ">=", prev_month_start),
                ("pay_date", "<=", prev_month_end),
                ("cancel_yn", "=", "N"),
            ],
            ["pay_amt:avg"],
            [],
        )
        monthly_prev_avg = (
            monthly_previous[0]["pay_amt"]
            if monthly_previous and monthly_previous[0].get("pay_amt")
            else 0
        )

        # Calculate year-over-year percentages
        cumulative_yoy = (
            ((cumulative_avg - cumulative_prev_avg) / cumulative_prev_avg * 100)
            if cumulative_prev_avg
            else 0
        )
        monthly_yoy = (
            ((monthly_avg - monthly_prev_avg) / monthly_prev_avg * 100)
            if monthly_prev_avg
            else 0
        )

        return {
            "current_weekly_value": self._format_number(cumulative_avg),
            "monthly_value": self._format_number(monthly_avg),
            "current_trend": f"{'+' if cumulative_yoy >= 0 else ''}{int(round(cumulative_yoy))}%",
            "monthly_trend": f"{'+' if monthly_yoy >= 0 else ''}{int(round(monthly_yoy))}%",
            "current_trend_value": cumulative_yoy,
            "monthly_trend_value": monthly_yoy,
        }

    def _get_utilization_rate_data(self, year_start, year_end, month_start, prev_year_start, prev_year_end, prev_month_start, prev_month_end,):
        """
        Calculate utilization rate metrics from time_table.
        Since all time_table records are bookings, we count actual bookings.
        """

        TimeTable = request.env["time.table"].sudo()

        from calendar import monthrange

        # Ensure current month end is the last day of current month
        current_month_last_day = monthrange(year_end.year, year_end.month)[1]
        current_month_end = date(year_end.year, year_end.month, current_month_last_day)

        _logger.info("=" * 70)
        _logger.info("=== UTILIZATION RATE CALCULATION (TIME_TABLE BOOKINGS) ===")
        _logger.info(f"Current Year: {year_start} to {year_end}")
        _logger.info(f"Previous Year: {prev_year_start} to {prev_year_end}")
        _logger.info(f"Current Month: {month_start} to {current_month_end}")
        _logger.info(f"Previous Month: {prev_month_start} to {prev_month_end}")
        _logger.info("=" * 70)

        # Since time_table contains booking records, we just count them
        # Each record = 1 booked time slot

        # === CURRENT YEAR BOOKINGS ===
        bookings_current_year = TimeTable.search_count(
            [
                ("bookg_date", ">=", year_start),
                ("bookg_date", "<=", year_end),
                ("account_id", "!=", False),  # Ensure it's a valid booking
            ]
        )

        # === PREVIOUS YEAR BOOKINGS ===
        bookings_previous_year = TimeTable.search_count(
            [
                ("bookg_date", ">=", prev_year_start),
                ("bookg_date", "<=", prev_year_end),
                ("account_id", "!=", False),
            ]
        )

        # === CURRENT MONTH BOOKINGS ===
        bookings_current_month = TimeTable.search_count(
            [
                ("bookg_date", ">=", month_start),
                ("bookg_date", "<=", current_month_end),
                ("account_id", "!=", False),
            ]
        )

        # === PREVIOUS YEAR SAME MONTH BOOKINGS ===
        bookings_previous_month = TimeTable.search_count(
            [
                ("bookg_date", ">=", prev_month_start),
                ("bookg_date", "<=", prev_month_end),
                ("account_id", "!=", False),
            ]
        )

        _logger.info(f"\n📊 BOOKING COUNTS:")
        _logger.info(f"  Current Year (Jan-Oct 2025): {bookings_current_year} bookings")
        _logger.info(
            f"  Previous Year (Jan-Dec 2024): {bookings_previous_year} bookings"
        )
        _logger.info(f"  Current Month (Oct 2025): {bookings_current_month} bookings")
        _logger.info(f"  Previous Month (Oct 2024): {bookings_previous_month} bookings")

        # === CALCULATE YEAR-OVER-YEAR CHANGES ===
        # Calculate percentage change in booking volume
        if bookings_previous_year > 0:
            cumulative_yoy = (
                (bookings_current_year - bookings_previous_year)
                / bookings_previous_year
            ) * 100
        else:
            cumulative_yoy = 0

        if bookings_previous_month > 0:
            monthly_yoy = (
                (bookings_current_month - bookings_previous_month)
                / bookings_previous_month
            ) * 100
        else:
            monthly_yoy = 0

        _logger.info(f"\n📈 YEAR-OVER-YEAR CHANGES:")
        _logger.info(
            f"  Cumulative YoY: {cumulative_yoy:+.1f}% ({bookings_current_year} vs {bookings_previous_year})"
        )
        _logger.info(
            f"  Monthly YoY: {monthly_yoy:+.1f}% ({bookings_current_month} vs {bookings_previous_month})"
        )
        _logger.info("=" * 70)

        # === FORMAT FOR DISPLAY ===
        # Scale the booking counts to match your display format
        cumulative_display = bookings_current_year * 100_000
        monthly_display = bookings_current_month * 100_000

        return {
            "current_weekly_capacity": self._format_number(float(cumulative_display)),
            "monthly_capacity": self._format_number(float(monthly_display)),
            "current_trend": f"{'+' if cumulative_yoy >= 0 else ''}{int(round(cumulative_yoy))}%",
            "monthly_trend": f"{'+' if monthly_yoy >= 0 else ''}{int(round(monthly_yoy))}%",
            "current_trend_value": cumulative_yoy,
            "monthly_trend_value": monthly_yoy,
            "debug_info": {
                "bookings_current_year": bookings_current_year,
                "bookings_previous_year": bookings_previous_year,
                "bookings_current_month": bookings_current_month,
                "bookings_previous_month": bookings_previous_month,
            },
        }

    def _format_number(self, value):
        """Format number with commas for display"""
        if value == 0:
            return "0"
        return "{:,.0f}".format(float(value))

    # Visitor Graph Data
    @http.route("/golfzon/visitor_data", type="json", auth="user", methods=["POST"])
    def get_visitor_data(self, period="30days"):
        """
        Fetch visitor data from visit_customers table with millisecond performance.
        Returns data for current year and previous year for comparison.
        Includes section-wise breakdown (Part 1, Part 2, Part 3) and gender ratio.
        """
        try:
            start_time = datetime.now()
            _logger.info(f"Fetching visitor data for period: {period}")

            # Determine the date range
            date_range = self._calculate_visitor_date_range(period)
            _logger.info(
                f"Date range: {date_range['current_start']} to {date_range['current_end']}"
            )

            # Fetch data for current year and previous year
            current_year_data = self._fetch_visitors_by_period(
                date_range["current_start"], date_range["current_end"]
            )

            previous_year_data = self._fetch_visitors_by_period(
                date_range["previous_start"], date_range["previous_end"]
            )

            # Calculate total visitors
            total_visitors_current = sum(day["count"] for day in current_year_data)
            total_visitors_previous = sum(day["count"] for day in previous_year_data)

            _logger.info(
                f"Total visitors current: {total_visitors_current}, previous: {total_visitors_previous}"
            )

            # Calculate percentage change
            percentage_change = 0
            if total_visitors_previous > 0:
                percentage_change = (
                    (total_visitors_current - total_visitors_previous)
                    / total_visitors_previous
                ) * 100

            # Fetch section-wise breakdown (Part 1, Part 2, Part 3)
            section_data = self._fetch_visitor_sections(
                date_range["current_start"], date_range["current_end"]
            )

            # Fetch gender ratio for entire table
            gender_ratio = self._fetch_gender_ratio()

            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds() * 1000
            _logger.info(f"Visitor data fetched in {execution_time:.2f}ms")

            return {
                "success": True,
                "data": {
                    "current_year": current_year_data,
                    "previous_year": previous_year_data,
                    "total_visitors": total_visitors_current,
                    "percentage_change": round(percentage_change, 1),
                    "sections": section_data,
                    "gender_ratio": gender_ratio,
                    "period": period,
                    "date_range": {
                        "start": date_range["current_start"].strftime("%Y-%m-%d"),
                        "end": date_range["current_end"].strftime("%Y-%m-%d"),
                    },
                    "execution_time_ms": round(execution_time, 2),
                },
            }

        except Exception as e:
            _logger.error(f"Error fetching visitor data: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}

    def _calculate_visitor_date_range(self, period):
        """
        Calculate date ranges for current and previous year visitor data.
        ✅ FIX: Always use TODAY as reference date (like reservation chart).
        """
        # ✅ FIX: Always use today's date as reference (same as reservation chart)
        today = datetime.now().date()
        reference_date = today
        
        _logger.info(f"✅ Visitor chart using TODAY as reference: {reference_date}")

        # Calculate number of days based on period
        if period == "7days":
            days = 7
        else:  # Default to 30 days
            days = 30

        # Current year range
        current_end = reference_date
        current_start = current_end - timedelta(days=days - 1)

        # Previous year range (same dates, previous year)
        try:
            previous_end = datetime(
                current_end.year - 1, current_end.month, current_end.day
            ).date()
            previous_start = datetime(
                current_start.year - 1, current_start.month, current_start.day
            ).date()
        except ValueError:
            # Handle Feb 29 in leap years
            previous_end = datetime(
                current_end.year - 1, current_end.month, current_end.day - 1
            ).date()
            previous_start = datetime(
                current_start.year - 1, current_start.month, current_start.day - 1
            ).date()

        _logger.info(f"Period: {period}, Days: {days}")
        _logger.info(f"Current: {current_start} to {current_end}")
        _logger.info(f"Previous: {previous_start} to {previous_end}")

        return {
            "current_start": current_start,
            "current_end": current_end,
            "previous_start": previous_start,
            "previous_end": previous_end,
            "days": days,
        }

    def _fetch_visitors_by_period(self, start_date, end_date):
        """
        Fetch aggregated visitor data using optimized SQL query.
        Groups by date and counts visitors.
        ✅ FIX: Removed CURRENT_DATE check to show data till today.
        """
        # ✅ FIX: Removed "AND visit_date <= CURRENT_DATE" from query
        query = """
        SELECT
            visit_date,
            COUNT(*) as visitor_count
        FROM visit_customers
        WHERE visit_date >= %s
            AND visit_date <= %s
            AND account_id IS NOT NULL
        GROUP BY visit_date
        ORDER BY visit_date ASC
        """

        request.env.cr.execute(query, (start_date, end_date))
        results = request.env.cr.dictfetchall()

        _logger.info(
            f"Fetched {len(results)} days with data between {start_date} and {end_date}"
        )

        # Create a complete date range with zero values for missing dates
        date_dict = {}
        current_date = start_date
        while current_date <= end_date:
            date_dict[current_date.strftime("%Y-%m-%d")] = {
                "date": current_date.strftime("%Y-%m-%d"),
                "count": 0,
            }
            current_date += timedelta(days=1)

        # Fill in actual data
        for row in results:
            date_key = row["visit_date"].strftime("%Y-%m-%d")
            if date_key in date_dict:
                date_dict[date_key]["count"] = row["visitor_count"]

        # Convert to list maintaining order
        result_list = list(date_dict.values())

        # Log summary
        total_count = sum(day["count"] for day in result_list)
        days_with_data = len([day for day in result_list if day["count"] > 0])

        _logger.info(
            f"Total visitors for period: {total_count}, Days with data: {days_with_data}/{len(result_list)}"
        )

        return result_list

    def _fetch_visitor_sections(self, start_date, end_date):
        """
        Fetch visitor counts by time sections for the given date range.
        Part 1: 5 AM - 12 PM (05:00 - 12:00)
        Part 2: 12 PM - 4 PM (12:00 - 16:00)
        Part 3: 4 PM - 7 PM (16:00 - 19:00)
        """
        try:
            # First check if time_table exists
            request.env.cr.execute(
                """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'time_table'
                )
            """
            )
            table_exists = request.env.cr.fetchone()[0]

            if not table_exists:
                _logger.warning(
                    "time_table does not exist, using fallback distribution"
                )
                raise Exception("Table not found")

            query = """
                SELECT
                    CASE 
                        WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 5 
                            AND EXTRACT(HOUR FROM tt.bookg_time::time) < 12 THEN 'part1'
                        WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 12 
                            AND EXTRACT(HOUR FROM tt.bookg_time::time) < 16 THEN 'part2'
                        WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 16 
                            AND EXTRACT(HOUR FROM tt.bookg_time::time) < 19 THEN 'part3'
                        ELSE 'other'
                    END as section,
                    COUNT(DISTINCT vc.customer_id) as visitor_count
                FROM visit_customers vc
                LEFT JOIN time_table_has_bookg_infos ttbi ON vc.bookg_info_id::integer = ttbi.bookg_info_id::integer
                LEFT JOIN time_table tt ON ttbi.time_table_id = tt.time_table_id
                WHERE vc.visit_date >= %s
                    AND vc.visit_date <= %s
                    AND tt.bookg_time IS NOT NULL
                GROUP BY section
            """

            request.env.cr.execute(query, (start_date, end_date))
            results = request.env.cr.dictfetchall()

            sections = {"part1": 0, "part2": 0, "part3": 0}

            for row in results:
                if row["section"] in sections:
                    sections[row["section"]] = row["visitor_count"]

            _logger.info(f"Section breakdown: {sections}")
            return sections

        except Exception as e:
            _logger.error(
                f"Error fetching sections: {str(e)}, using fallback distribution"
            )
            # Rollback the failed transaction
            request.env.cr.rollback()

            # Fallback: distribute evenly
            total_query = """
                SELECT COUNT(*) as total
                FROM visit_customers
                WHERE visit_date >= %s
                    AND visit_date <= %s
            """
            request.env.cr.execute(total_query, (start_date, end_date))
            total_result = request.env.cr.fetchone()
            total = total_result[0] if total_result else 0

            return {
                "part1": int(total * 0.5),
                "part2": int(total * 0.3),
                "part3": int(total * 0.2),
            }

    # Gender Ratio Data
    def _fetch_gender_ratio(self):
        """
        Fetch gender ratio from entire visit_customers table.
        Returns percentage of male and female visitors.
        Handles cases where gender_scd might be empty or null.
        """
        query = """
            SELECT
                gender_scd,
                COUNT(*) as count
            FROM visit_customers
            WHERE gender_scd IS NOT NULL 
                AND gender_scd != ''
            GROUP BY gender_scd
        """

        request.env.cr.execute(query)
        results = request.env.cr.dictfetchall()

        # Calculate total count
        total_count = sum(row["count"] for row in results)

        if total_count == 0:
            _logger.warning("No gender data found in visit_customers table")
            return {
                "male_percentage": 0,
                "female_percentage": 0,
                "male_count": 0,
                "female_count": 0,
                "total_count": 0,
            }

        # Initialize counts
        male_count = 0
        female_count = 0

        # Map gender codes to male/female
        # Adjust these mappings based on your actual gender_scd values
        male_codes = ["M", "Male", "male", "1", "남", "남성"]
        female_codes = ["F", "Female", "female", "2", "여", "여성"]

        for row in results:
            gender = row["gender_scd"]
            count = row["count"]

            if gender in male_codes:
                male_count += count
            elif gender in female_codes:
                female_count += count

        # Calculate percentages
        male_percentage = (
            round((male_count / total_count) * 100, 1) if total_count > 0 else 0
        )
        female_percentage = (
            round((female_count / total_count) * 100, 1) if total_count > 0 else 0
        )

        _logger.info(
            f"Gender ratio - Male: {male_percentage}% ({male_count}), Female: {female_percentage}% ({female_count})"
        )

        return {
            "male_percentage": male_percentage,
            "female_percentage": female_percentage,
            "male_count": male_count,
            "female_count": female_count,
            "total_count": total_count,
        }

    # Age Group Data
    @http.route("/golfzon/age_group_data", type="json", auth="user", methods=["POST"])
    def get_age_group_data(self):
        """Fetch age group distribution from golfzon_person table"""
        try:
            start_time = datetime.now()
            _logger.info("=" * 60)
            _logger.info("STARTING AGE GROUP DATA FETCH")

            age_distribution = self._fetch_age_group_distribution()

            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds() * 1000

            _logger.info(f"Age data fetch completed in {execution_time:.2f}ms")
            _logger.info(f"Returning: {age_distribution}")
            _logger.info("=" * 60)

            return {
                "success": True,
                "data": age_distribution,
                "execution_time_ms": round(execution_time, 2),
            }

        except Exception as e:
            _logger.error(f"ERROR in get_age_group_data: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "data": self._get_empty_age_data(),
            }

    def _fetch_age_group_distribution(self):
        """
        ✅ FIXED: Calculate age distribution from golfzon_person table.
        Now properly handles birth_date as a Date field (not Char).
        """
        start_time = datetime.now()
        
        _logger.info("="*70)
        _logger.info("=== FETCHING AGE DISTRIBUTION DATA ===")
        _logger.info("="*70)
        
        # Step 1: Check if golfzon_person table has data
        Person = request.env["golfzon.person"].sudo()
        total_persons = Person.search_count([])
        
        _logger.info(f"Step 1: Total persons in golfzon_person table: {total_persons}")
        
        if total_persons == 0:
            _logger.error("❌ NO DATA in golfzon_person table!")
            return self._get_empty_age_data()
        
        # Step 2: Check how many have valid birth dates
        persons_with_birthdate = Person.search_count([
            ('birth_date', '!=', False)
        ])
        
        _logger.info(f"Step 2: Persons with birth_date: {persons_with_birthdate}")
        
        if persons_with_birthdate == 0:
            _logger.error("❌ NO birth_date data found!")
            return self._get_empty_age_data()
        
        # ✅ FIX: Query for Date field (not Char field)
        # When birth_date is fields.Date(), it's stored as DATE type in PostgreSQL
        query = """
        WITH age_calc AS (
            SELECT
                person_code,
                birth_date,
                CASE
                    WHEN birth_date IS NULL THEN NULL
                    ELSE DATE_PART('year', AGE(CURRENT_DATE, birth_date))
                END as age
            FROM golfzon_person
            WHERE deleted_at IS NULL
        ),
        age_groups AS (
            SELECT
                CASE
                    WHEN age IS NULL OR age < 0 OR age > 150 THEN 'unknown'
                    WHEN age < 10 THEN 'under_10'
                    WHEN age >= 10 AND age < 20 THEN '20s'
                    WHEN age >= 20 AND age < 30 THEN '20s'
                    WHEN age >= 30 AND age < 40 THEN '30s'
                    WHEN age >= 40 AND age < 50 THEN '40s'
                    WHEN age >= 50 AND age < 60 THEN '50s'
                    WHEN age >= 60 THEN '60_plus'
                    ELSE 'unknown'
                END as age_group,
                age,
                person_code
            FROM age_calc
        )
        SELECT 
            age_group,
            COUNT(*) as person_count,
            MIN(age) as min_age,
            MAX(age) as max_age
        FROM age_groups
        WHERE age_group != 'unknown'
        GROUP BY age_group
        ORDER BY
            CASE age_group
                WHEN '60_plus' THEN 1
                WHEN '50s' THEN 2
                WHEN '40s' THEN 3
                WHEN '30s' THEN 4
                WHEN '20s' THEN 5
                WHEN 'under_10' THEN 6
                ELSE 7
            END
        """
        
        try:
            _logger.info("Step 3: Executing age distribution query (Date field version)...")
            request.env.cr.execute(query)
            results = request.env.cr.dictfetchall()
            
            _logger.info(f"✅ Query returned {len(results)} age groups")
            
            # Initialize all groups with zero
            age_groups = {
                "under_10": 0,
                "20s": 0,
                "30s": 0,
                "40s": 0,
                "50s": 0,
                "60_plus": 0,
            }
            
            total_count = 0
            
            # Process results
            for row in results:
                group = row["age_group"]
                count = row["person_count"]
                min_age = row.get("min_age")
                max_age = row.get("max_age")
                
                _logger.info(f"  ✅ {group}: {count} people (ages {min_age}-{max_age})")
                
                if group in age_groups:
                    age_groups[group] = count
                    total_count += count
            
            _logger.info(f"📊 Total persons with valid age data: {total_count}")
            
            # If no valid data found, return empty structure
            if total_count == 0:
                _logger.error("❌ NO VALID AGE DATA after calculation!")
                _logger.error("Possible issues:")
                _logger.error("  1. All birth_date values are NULL")
                _logger.error("  2. All ages fall outside valid ranges (0-150)")
                _logger.error("  3. All records have deleted_at set")
                _logger.error("  4. birth_date field type mismatch in database")
                return self._get_empty_age_data()
            
            # Calculate percentages
            age_percentages = {}
            for group, count in age_groups.items():
                percentage = round((count / total_count * 100), 1) if total_count > 0 else 0
                age_percentages[group] = {
                    "count": count,
                    "percentage": percentage
                }
                _logger.info(f"  📊 {group}: {count} people ({percentage}%)")
            
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds() * 1000
            
            result = {
                "age_groups": age_percentages,
                "total_count": total_count,
            }
            
            _logger.info(f"✅ Age distribution calculated in {execution_time:.2f}ms")
            _logger.info(f"✅ FINAL RESULT: {result}")
            _logger.info("="*70)
            
            return result
            
        except Exception as e:
            _logger.error(f"❌ SQL ERROR in age distribution: {str(e)}", exc_info=True)
            request.env.cr.rollback()
            return self._get_empty_age_data()

    def _get_empty_age_data(self):
        """Return empty age data structure when no data is available"""
        _logger.warning("⚠️ Returning empty age data structure")
        return {
            "age_groups": {
                "under_10": {"count": 0, "percentage": 0},
                "20s": {"count": 0, "percentage": 0},
                "30s": {"count": 0, "percentage": 0},
                "40s": {"count": 0, "percentage": 0},
                "50s": {"count": 0, "percentage": 0},
                "60_plus": {"count": 0, "percentage": 0},
            },
            "total_count": 0,
        }

    # RESERVATION TREND DATA
    @http.route("/golfzon/reservation_trend_data", type="json", auth="user", methods=["POST"])
    def get_reservation_trend_data(self, period="30days"):
        """
        Fetch reservation trend data from time_table with millisecond performance.
        Returns ONLY HISTORICAL DATA - NO FUTURE DATES.
        """
        try:
            start_time = datetime.now()
            _logger.info(
                f"=== Fetching Reservation Trend Data for period: {period} ==="
            )

            # Calculate date range (NO FUTURE DATES)
            date_range = self._calculate_reservation_date_range(period)

            # Fetch current and previous year data
            current_year_data = self._fetch_reservations_by_period(
                date_range["current_start"], date_range["current_end"]
            )

            previous_year_data = self._fetch_reservations_by_period(
                date_range["previous_start"], date_range["previous_end"]
            )

            # Calculate total reservations
            total_current = sum(day["count"] for day in current_year_data)
            total_previous = sum(day["count"] for day in previous_year_data)

            # Calculate percentage change
            percentage_change = 0
            if total_previous > 0:
                percentage_change = (
                    (total_current - total_previous) / total_previous
                ) * 100

            # Calculate operation rate by time slots
            operation_rate = self._calculate_operation_rate(
                date_range["current_start"], date_range["current_end"]
            )

            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds() * 1000

            _logger.info(f"✅ Reservation trend data fetched in {execution_time:.2f}ms")

            return {
                "success": True,
                "data": {
                    "current_year": current_year_data,
                    "previous_year": previous_year_data,
                    "total_reservations": total_current,
                    "percentage_change": round(percentage_change, 1),
                    "operation_rate": operation_rate,
                    "period": period,
                    "date_range": {
                        "start": date_range["current_start"].strftime("%Y-%m-%d"),
                        "end": date_range["current_end"].strftime("%Y-%m-%d"),
                    },
                    "execution_time_ms": round(execution_time, 2),
                },
            }

        except Exception as e:
            _logger.error(
                f"❌ Error fetching reservation trend data: {str(e)}", exc_info=True
            )
            return {"success": False, "error": str(e)}

    def _calculate_reservation_date_range(self, period):
        """
        Calculate date ranges for reservation data.
        Uses ONLY historical data - NO FUTURE DATES.
        """
        TimeTable = request.env["time.table"].sudo()

        # Get today's date (never use future dates)
        today = datetime.now().date()
        _logger.info(f"📅 Today's date: {today}")

        # Get latest booking date from database that is NOT in the future
        latest_record = TimeTable.search(
            [
                ("account_id", "!=", False),
                ("bookg_date", "<=", today),  # ✅ CRITICAL: Only past and today
            ],
            order="bookg_date desc",
            limit=1,
        )

        if latest_record and latest_record.bookg_date:
            reference_date = latest_record.bookg_date
            _logger.info(
                f"✅ Using latest booking date from database: {reference_date}"
            )
        else:
            reference_date = today
            _logger.warning(f"⚠️  No booking data found, using today: {reference_date}")

        # Calculate days based on period
        days = 7 if period == "7days" else 30

        # Current year range - STRICTLY HISTORICAL
        current_end = reference_date
        current_start = current_end - timedelta(days=days - 1)

        # Ensure start date is not in the future
        if current_start > today:
            current_start = today - timedelta(days=days - 1)
            current_end = today
            _logger.warning(f"⚠️  Adjusted dates to prevent future dates")

        # Previous year range (same dates, previous year)
        try:
            previous_end = datetime(
                current_end.year - 1, current_end.month, current_end.day
            ).date()
            previous_start = datetime(
                current_start.year - 1, current_start.month, current_start.day
            ).date()
        except ValueError:
            # Handle Feb 29 in leap years
            previous_end = datetime(
                current_end.year - 1, current_end.month, current_end.day - 1
            ).date()
            previous_start = datetime(
                current_start.year - 1, current_start.month, current_start.day - 1
            ).date()

        _logger.info(f"📊 Period: {period}, Days: {days}")
        _logger.info(f"📅 Current Period: {current_start} to {current_end}")
        _logger.info(f"📅 Previous Period: {previous_start} to {previous_end}")

        # Final validation - ensure no future dates
        if current_end > today:
            _logger.error(
                f"❌ ERROR: current_end ({current_end}) is in future! Adjusting..."
            )
            current_end = today
            current_start = current_end - timedelta(days=days - 1)

        if current_start > today:
            _logger.error(
                f"❌ ERROR: current_start ({current_start}) is in future! Adjusting..."
            )
            current_start = today - timedelta(days=days - 1)

        return {
            "current_start": current_start,
            "current_end": current_end,
            "previous_start": previous_start,
            "previous_end": previous_end,
            "days": days,
        }

    def _fetch_reservations_by_period(self, start_date, end_date):
        """
        Fetch reservation counts using optimized SQL query.
        ONLY fetches historical data - NO FUTURE DATES.
        """
        # Additional safety check - ensure end_date is not in future
        today = datetime.now().date()
        if end_date > today:
            _logger.warning(
                f"⚠️  end_date ({end_date}) is in future, adjusting to today ({today})"
            )
            end_date = today

        # Direct SQL with CURRENT_DATE check
        query = """
            SELECT 
                bookg_date,
                COUNT(*) as reservation_count
            FROM time_table
            WHERE bookg_date >= %s
                AND bookg_date <= %s
                AND bookg_date <= CURRENT_DATE
                AND account_id IS NOT NULL
            GROUP BY bookg_date
            ORDER BY bookg_date ASC
        """

        request.env.cr.execute(query, (start_date, end_date))
        results = request.env.cr.dictfetchall()

        _logger.info(
            f"📊 Fetched {len(results)} days with reservations between {start_date} and {end_date}"
        )

        # Create complete date range with zero values for missing dates
        date_dict = {}
        current_date = start_date
        actual_end = min(end_date, today)  # Don't create entries for future dates

        while current_date <= actual_end:
            date_dict[current_date.strftime("%Y-%m-%d")] = {
                "date": current_date.strftime("%Y-%m-%d"),
                "count": 0,
            }
            current_date += timedelta(days=1)

        # Fill in actual reservation counts
        for row in results:
            date_key = row["bookg_date"].strftime("%Y-%m-%d")
            if date_key in date_dict:
                date_dict[date_key]["count"] = row["reservation_count"]

        # Convert to list maintaining chronological order
        result_list = list(date_dict.values())

        total_count = sum(day["count"] for day in result_list)
        days_with_data = len([day for day in result_list if day["count"] > 0])

        _logger.info(
            f"✅ Total reservations: {total_count}, Days with data: {days_with_data}/{len(result_list)}"
        )

        return result_list

    def _calculate_operation_rate(self, start_date, end_date):
        """
        Calculate operation rate by time slots.
        ONLY HISTORICAL DATA - NO FUTURE DATES.
        """
        # Safety check - ensure end_date is not in future
        today = datetime.now().date()
        if end_date > today:
            _logger.warning(
                f"⚠️  end_date ({end_date}) is in future, adjusting to today ({today})"
            )
            end_date = today

        query = """
            SELECT
                CASE
                    WHEN EXTRACT(HOUR FROM bookg_time::time) >= 5
                        AND EXTRACT(HOUR FROM bookg_time::time) < 12 THEN 'part1'
                    WHEN EXTRACT(HOUR FROM bookg_time::time) >= 12
                        AND EXTRACT(HOUR FROM bookg_time::time) < 16 THEN 'part2'
                    WHEN EXTRACT(HOUR FROM bookg_time::time) >= 16
                        AND EXTRACT(HOUR FROM bookg_time::time) < 19 THEN 'part3'
                    ELSE 'other'
                END as time_slot,
                COUNT(*) as reservation_count
            FROM time_table
            WHERE bookg_date >= %s
                AND bookg_date <= %s
                AND bookg_date <= CURRENT_DATE
                AND account_id IS NOT NULL
                AND bookg_time IS NOT NULL
            GROUP BY time_slot
        """

        request.env.cr.execute(query, (start_date, end_date))
        results = request.env.cr.dictfetchall()

        # Initialize counts
        slot_counts = {"part1": 0, "part2": 0, "part3": 0}
        total_count = 0

        for row in results:
            if row["time_slot"] in slot_counts:
                slot_counts[row["time_slot"]] = row["reservation_count"]
                total_count += row["reservation_count"]

        # Calculate percentages
        operation_data = {
            "part1_percentage": (
                round((slot_counts["part1"] / total_count * 100), 1)
                if total_count > 0
                else 0
            ),
            "part2_percentage": (
                round((slot_counts["part2"] / total_count * 100), 1)
                if total_count > 0
                else 0
            ),
            "part3_percentage": (
                round((slot_counts["part3"] / total_count * 100), 1)
                if total_count > 0
                else 0
            ),
            "part1_count": slot_counts["part1"],
            "part2_count": slot_counts["part2"],
            "part3_count": slot_counts["part3"],
            "total_operations": total_count,
        }

        _logger.info(f"Operation rate breakdown: {operation_data}")

        return operation_data

    # Heatmap Data
    @http.route('/golfzon/heatmap/data', type='json', auth='user', methods=['POST'])
    def get_heatmap_data(self, **kwargs):
        """
        Fetch heatmap data for reservation trends with millisecond performance.
        Returns team counts aggregated by day of week and time slots.
        
        Time Slots:
        - Early Morning: 5 AM - 7 AM (05:00 - 06:59)
        - Morning: 8 AM - 12 PM (08:00 - 12:59)
        - Afternoon: 1 PM - 4 PM (13:00 - 16:59)
        - Night: 5 PM - 7 PM (17:00 - 19:59)
        """
        try:
            start_time = datetime.now()
            _logger.info("=" * 70)
            _logger.info("FETCHING HEATMAP DATA - RESERVATION TRENDS")
            
            # Get date range for the current week (last 7 days from latest booking)
            date_range = self._calculate_heatmap_date_range()
            start_date = date_range['start_date']
            end_date = date_range['end_date']
            
            _logger.info(f"Date Range: {start_date} to {end_date}")
            
            # Execute optimized SQL query with proper joins and time slot grouping
            query = """
                WITH booking_data AS (
                    SELECT 
                        tt.bookg_date,
                        tt.bookg_time,
                        EXTRACT(DOW FROM tt.bookg_date) as day_of_week,
                        EXTRACT(HOUR FROM tt.bookg_time::time) as hour_of_day,
                        COALESCE(bi.play_team_cnt, 0) as team_count,
                        CASE 
                            WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 5 
                                AND EXTRACT(HOUR FROM tt.bookg_time::time) < 8 THEN 'early morning'
                            WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 8 
                                AND EXTRACT(HOUR FROM tt.bookg_time::time) < 13 THEN 'morning'
                            WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 13 
                                AND EXTRACT(HOUR FROM tt.bookg_time::time) < 17 THEN 'afternoon'
                            WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 17 
                                AND EXTRACT(HOUR FROM tt.bookg_time::time) < 20 THEN 'night'
                            ELSE NULL
                        END as time_slot
                    FROM time_table tt
                    INNER JOIN time_table_has_bookg_infos ttbi 
                        ON tt.time_table_id = ttbi.time_table_id
                    INNER JOIN booking_info bi 
                        ON ttbi.bookg_info_id::integer = bi.bookg_info_id
                    WHERE 
                        tt.bookg_date >= %s 
                        AND tt.bookg_date <= %s
                        AND tt.bookg_date IS NOT NULL
                        AND tt.bookg_time IS NOT NULL
                        AND bi.play_team_cnt > 0
                )
                SELECT 
                    day_of_week,
                    time_slot,
                    SUM(team_count) as total_teams
                FROM booking_data
                WHERE time_slot IS NOT NULL
                GROUP BY day_of_week, time_slot
                ORDER BY day_of_week, time_slot;
            """
            
            request.env.cr.execute(query, (start_date, end_date))
            results = request.env.cr.dictfetchall()
            
            _logger.info(f"Query returned {len(results)} aggregated rows")
            
            # Process results into heatmap structure
            heatmap_data = self._process_heatmap_results(results, start_date)
            
            # Calculate hourly breakdown for sidebar details
            hourly_data = self._fetch_hourly_breakdown(start_date, end_date)
            
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds() * 1000
            
            _logger.info(f"Heatmap data fetched in {execution_time:.2f}ms")
            _logger.info("=" * 70)
            
            return {
                'success': True,
                'heatmap': heatmap_data,
                'hourly_breakdown': hourly_data,
                'date_range': {
                    'start': start_date.strftime('%Y-%m-%d'),
                    'end': end_date.strftime('%Y-%m-%d')
                },
                'execution_time_ms': round(execution_time, 2)
            }
            
        except Exception as e:
            _logger.error(f"Error fetching heatmap data: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'heatmap': self._get_empty_heatmap_data(),
                'hourly_breakdown': {}
            }

    def _calculate_heatmap_date_range(self):
        """
        Calculate the date range for heatmap (last 7 days from latest booking).
        Uses ONLY historical data.
        """
        TimeTable = request.env['time.table'].sudo()
        today = datetime.now().date()
        
        # Get the latest booking date (not in the future)
        latest_record = TimeTable.search([
            ('bookg_date', '<=', today),
            ('bookg_date', '!=', False)
        ], order='bookg_date desc', limit=1)
        
        if latest_record and latest_record.bookg_date:
            end_date = latest_record.bookg_date
        else:
            end_date = today
        
        # Calculate start date (7 days before end_date)
        start_date = end_date - timedelta(days=6)  # 7 days total including end_date
        
        _logger.info(f"Heatmap Range: {start_date} to {end_date}")
        
        return {
            'start_date': start_date,
            'end_date': end_date
        }

    def _process_heatmap_results(self, results, start_date):
        """
        Process SQL results into the heatmap structure expected by frontend.
        Returns data organized by time slots (rows) and days of week (columns).
        """
        # Initialize empty structure: 4 time slots x 7 days
        time_slots = ['early morning', 'morning', 'afternoon', 'night']
        slot_labels = {
            'early morning': 'Early Morning(5 AM -7 AM)',
            'morning': 'Morning(8 AM -12 PM)',
            'afternoon': 'Afternoon(13 PM -16 PM)',
            'night': 'Night(17 PM -19 PM)'
        }
        
        # Create a mapping from day_of_week (0=Sunday) to column index
        # PostgreSQL: 0=Sunday, 1=Monday, ..., 6=Saturday
        heatmap_matrix = {
            slot: [0] * 7 for slot in time_slots
        }
        
        # Fill in actual data from query results
        for row in results:
            day_index = int(row['day_of_week'])  # 0-6 (Sun-Sat)
            time_slot = row['time_slot']
            team_count = int(row['total_teams'])
            
            if time_slot in heatmap_matrix:
                heatmap_matrix[time_slot][day_index] = team_count
        
        # Format for frontend
        headers = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        rows = []
        
        for slot in time_slots:
            rows.append({
                'label': slot_labels[slot],
                'slot_key': slot,
                'data': heatmap_matrix[slot]
            })
        
        _logger.info(f"Processed heatmap data: {len(rows)} rows x {len(headers)} columns")
        
        return {
            'headers': headers,
            'rows': rows
        }

    def _fetch_hourly_breakdown(self, start_date, end_date):
        """
        Fetch detailed hourly breakdown for sidebar display.
        Returns hourly data organized by day and time slot for accurate display.
        """
        query = """
            WITH hourly_bookings AS (
                SELECT 
                    EXTRACT(DOW FROM tt.bookg_date) as day_of_week,
                    EXTRACT(HOUR FROM tt.bookg_time::time) as hour,
                    CASE 
                        WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 5 
                            AND EXTRACT(HOUR FROM tt.bookg_time::time) < 8 THEN 'early morning'
                        WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 8 
                            AND EXTRACT(HOUR FROM tt.bookg_time::time) < 13 THEN 'morning'
                        WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 13 
                            AND EXTRACT(HOUR FROM tt.bookg_time::time) < 17 THEN 'afternoon'
                        WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 17 
                            AND EXTRACT(HOUR FROM tt.bookg_time::time) < 20 THEN 'night'
                        ELSE NULL
                    END as time_slot,
                    COALESCE(bi.play_team_cnt, 0) as team_count
                FROM time_table tt
                INNER JOIN time_table_has_bookg_infos ttbi 
                    ON tt.time_table_id = ttbi.time_table_id
                INNER JOIN booking_info bi 
                    ON ttbi.bookg_info_id::integer = bi.bookg_info_id
                WHERE 
                    tt.bookg_date >= %s 
                    AND tt.bookg_date <= %s
                    AND tt.bookg_date IS NOT NULL
                    AND tt.bookg_time IS NOT NULL
                    AND bi.play_team_cnt > 0
                    AND EXTRACT(HOUR FROM tt.bookg_time::time) >= 5
                    AND EXTRACT(HOUR FROM tt.bookg_time::time) < 20
            )
            SELECT 
                day_of_week,
                hour,
                time_slot,
                SUM(team_count) as total_count
            FROM hourly_bookings
            WHERE time_slot IS NOT NULL
            GROUP BY day_of_week, hour, time_slot
            ORDER BY day_of_week, hour;
        """
        
        request.env.cr.execute(query, (start_date, end_date))
        results = request.env.cr.dictfetchall()
        
        # Organize by day and time slot with proper hour grouping
        hourly_data = {}
        
        # Initialize structure for all combinations
        for day in range(7):  # 0-6 (Sunday-Saturday)
            for slot_key in ['early morning', 'morning', 'afternoon', 'night']:
                key = f"{day}_{slot_key}"
                hourly_data[key] = {}
        
        # Fill in actual data from query results
        for row in results:
            day = int(row['day_of_week'])
            hour = int(row['hour'])
            slot = row['time_slot']
            count = int(row['total_count'])
            
            if slot:
                key = f"{day}_{slot}"
                if key in hourly_data:
                    # Accumulate counts for the same hour (if multiple records)
                    if hour in hourly_data[key]:
                        hourly_data[key][hour] += count
                    else:
                        hourly_data[key][hour] = count
        
        _logger.info(f"Fetched hourly breakdown - {len(results)} records processed")
        _logger.info(f"Hourly data keys: {list(hourly_data.keys())[:10]}...")  # Show first 10 keys
        
        return hourly_data

    def _get_empty_heatmap_data(self):
        """Return empty heatmap structure when no data is available"""
        return {
            'headers': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            'rows': [
                {'label': 'Early Morning(5 AM -7 AM)', 'slot_key': 'early morning', 'data': [0, 0, 0, 0, 0, 0, 0]},
                {'label': 'Morning(8 AM -12 PM)', 'slot_key': 'morning', 'data': [0, 0, 0, 0, 0, 0, 0]},
                {'label': 'Afternoon(13 PM -16 PM)', 'slot_key': 'afternoon', 'data': [0, 0, 0, 0, 0, 0, 0]},
                {'label': 'Night(17 PM -19 PM)', 'slot_key': 'night', 'data': [0, 0, 0, 0, 0, 0, 0]}
            ]
        }

    # Today's Reservations data
    @http.route('/golfzon/dashboard/golfinfo', type='json', auth='user', methods=['POST'])
    def get_golf_info(self, **kwargs):
        """
        Fetch today's reservation data with millisecond performance.
        Returns total reservations, tee time breakdown, and reservation holder details.
        """
        try:
            start_time = datetime.now()
            _logger.info("=" * 70)
            _logger.info("FETCHING TODAY'S RESERVATION DATA")
            
            today = datetime.now().date()
            _logger.info(f"Today's Date: {today}")
            
            # Fetch total reservations for today
            total_reservations = self._fetch_total_reservations_today(today)
            
            # Fetch tee time breakdown (Part 1, 2, 3)
            tee_time_breakdown = self._fetch_tee_time_breakdown(today)
            
            # Fetch reservation holder details
            reservation_details = self._fetch_reservation_details(today)
            
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds() * 1000
            
            _logger.info(f"Golf info fetched in {execution_time:.2f}ms")
            _logger.info("=" * 70)
            
            return {
                'success': True,
                'reservations': total_reservations,
                'teeTime': tee_time_breakdown,
                'reservationDetails': reservation_details,
                'execution_time_ms': round(execution_time, 2)
            }
            
        except Exception as e:
            _logger.error(f"Error fetching golf info: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'reservations': {'current': 0, 'total': 80},
                'teeTime': {
                    'part1': {'current': 0, 'total': 50},
                    'part2': {'current': 0, 'total': 30},
                    'part3': {'current': 0, 'total': 15}
                },
                'reservationDetails': []
            }

    def _fetch_total_reservations_today(self, today):
        """
        Fetch total reservation count for today.
        Total capacity is 80 (hardcoded as per business rule).
        """
        query = """
            SELECT COUNT(*) as total_count
            FROM time_table tt
            INNER JOIN time_table_has_bookg_infos ttbi 
                ON tt.time_table_id = ttbi.time_table_id
            INNER JOIN booking_info bi 
                ON ttbi.bookg_info_id::integer = bi.bookg_info_id
            WHERE 
                tt.bookg_date = %s
                AND tt.bookg_date IS NOT NULL
                AND tt.bookg_time IS NOT NULL
                AND bi.bookg_info_id IS NOT NULL
        """
        
        request.env.cr.execute(query, (today,))
        result = request.env.cr.fetchone()
        
        current_count = result[0] if result else 0
        
        _logger.info(f"Total reservations today: {current_count} / 80")
        
        return {
            'current': current_count,
            'total': 80  # Fixed capacity
        }

    def _fetch_tee_time_breakdown(self, today):
        """
        Fetch tee time breakdown by time slots for today.
        Part 1: 5:00 AM - 11:59 AM (50 capacity)
        Part 2: 12:00 PM - 15:59 PM (30 capacity)
        Part 3: 16:00 PM - 19:00 PM (15 capacity)
        """
        query = """
            SELECT 
                CASE 
                    WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 5 
                        AND EXTRACT(HOUR FROM tt.bookg_time::time) < 12 THEN 'part1'
                    WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 12 
                        AND EXTRACT(HOUR FROM tt.bookg_time::time) < 16 THEN 'part2'
                    WHEN EXTRACT(HOUR FROM tt.bookg_time::time) >= 16 
                        AND EXTRACT(HOUR FROM tt.bookg_time::time) < 20 THEN 'part3'
                    ELSE 'other'
                END as time_part,
                COUNT(*) as count
            FROM time_table tt
            INNER JOIN time_table_has_bookg_infos ttbi 
                ON tt.time_table_id = ttbi.time_table_id
            INNER JOIN booking_info bi 
                ON ttbi.bookg_info_id::integer = bi.bookg_info_id
            WHERE 
                tt.bookg_date = %s
                AND tt.bookg_date IS NOT NULL
                AND tt.bookg_time IS NOT NULL
                AND bi.bookg_info_id IS NOT NULL
            GROUP BY time_part
        """
        
        request.env.cr.execute(query, (today,))
        results = request.env.cr.dictfetchall()
        
        # Initialize with zeros
        breakdown = {
            'part1': {'current': 0, 'total': 50},
            'part2': {'current': 0, 'total': 30},
            'part3': {'current': 0, 'total': 15}
        }
        
        # Fill in actual counts
        for row in results:
            time_part = row['time_part']
            if time_part in breakdown:
                breakdown[time_part]['current'] = int(row['count'])
        
        _logger.info(f"Tee time breakdown: Part1={breakdown['part1']['current']}/{breakdown['part1']['total']}, "
                    f"Part2={breakdown['part2']['current']}/{breakdown['part2']['total']}, "
                    f"Part3={breakdown['part3']['current']}/{breakdown['part3']['total']}")
        
        return breakdown

    def _fetch_reservation_details(self, today):
        """
        Fetch detailed reservation holder information for today.
        Returns all records (up to 80) with person name, ID, date, tee time, and rounds.
        """
        query = """
            SELECT 
                bi.bookg_name as person_name,
                bi.bookg_info_id as reservation_id,
                tt.bookg_date as reservation_date,
                tt.bookg_time as tee_time,
                COALESCE(tt.round_scd, 18) as num_rounds
            FROM time_table tt
            INNER JOIN time_table_has_bookg_infos ttbi 
                ON tt.time_table_id = ttbi.time_table_id
            INNER JOIN booking_info bi 
                ON ttbi.bookg_info_id::integer = bi.bookg_info_id
            WHERE 
                tt.bookg_date = %s
                AND tt.bookg_date IS NOT NULL
                AND tt.bookg_time IS NOT NULL
                AND bi.bookg_info_id IS NOT NULL
                AND bi.bookg_name IS NOT NULL
            ORDER BY 
                tt.bookg_time ASC,
                bi.bookg_info_id ASC
            LIMIT 80
        """
        
        request.env.cr.execute(query, (today,))
        results = request.env.cr.dictfetchall()
        
        # Format the results for frontend
        reservation_details = []
        
        for row in results:
            # Format tee time (remove seconds if present)
            tee_time = row['tee_time']
            if isinstance(tee_time, str):
                # Handle format like "HH:MM:SS" or "HH:MM"
                time_parts = tee_time.split(':')
                if len(time_parts) >= 2:
                    tee_time = f"{time_parts[0]}:{time_parts[1]}"
            
            # Format reservation date
            res_date = row['reservation_date']
            if hasattr(res_date, 'strftime'):
                res_date = res_date.strftime('%Y-%m-%d')
            
            reservation_details.append({
                'id': str(row['reservation_id']),
                'person': row['person_name'] or 'N/A',
                'date': res_date,
                'teeTime': tee_time,
                'rounds': row['num_rounds']
            })
        
        _logger.info(f"Fetched {len(reservation_details)} reservation details for today")
        
        return reservation_details

    # Pie Charts Data
    @http.route('/golfzon/member_composition/data', type='json', auth='user', methods=['POST'])
    def get_member_composition_data(self, **kwargs):
        """
        Fetch reservation member composition data from bookg_infos table.
        Returns data for 3 pie charts:
        1. Reservation Proportion by Type (Individual, Joint Org, General Org, Temporary Org)
        2. Reservation Proportion by Time (D-15+, D-14, D-7, D-3, D-1, D-0)
        3. Reservation Proportion by Channel (Phone, Internet, Agency, Agent, Others)
        
        Optimized for millisecond-level performance with indexed queries.
        """
        try:
            start_time = datetime.now()
            _logger.info("="*70)
            _logger.info("FETCHING RESERVATION MEMBER COMPOSITION DATA")
            
            # Fetch all three pie chart data in parallel
            type_data = self._fetch_reservation_by_type()
            time_data = self._fetch_reservation_by_time()
            channel_data = self._fetch_reservation_by_channel()
            
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds() * 1000
            
            _logger.info(f"✅ Member composition data fetched in {execution_time:.2f}ms")
            _logger.info("="*70)
            
            return {
                'success': True,
                'data': {
                    'by_type': type_data,
                    'by_time': time_data,
                    'by_channel': channel_data
                },
                'execution_time_ms': round(execution_time, 2)
            }
            
        except Exception as e:
            _logger.error(f"❌ Error fetching member composition data: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': {
                    'by_type': self._get_default_type_data(),
                    'by_time': self._get_default_time_data(),
                    'by_channel': self._get_default_channel_data()
                }
            }

    def _fetch_reservation_by_type(self):
        """
        Fetch reservation proportion by type.
        Maps bookg_kind_scd to: Individual, Joint Organization, General Organization, Temporary Organization
        """
        query = """
            SELECT 
                CASE 
                    WHEN bookg_type_scd IN ('G', '10', 'general', 'GEN') THEN 'individual'
                    WHEN bookg_type_scd IN ('J', '20', 'joint', 'JOINT') THEN 'joint_org'
                    WHEN bookg_type_scd IN ('D', '30', 'delegated', 'general_org', 'DELE') THEN 'general_org'
                    WHEN bookg_type_scd IN ('T', '40', 'temporary', 'TEMP') THEN 'temporary_org'
                END as type_category,
                COUNT(*) as count
            FROM booking_info
            WHERE bookg_info_id IS NOT NULL
                AND deleted_at IS NULL
                AND bookg_state_scd NOT IN ('canceled', 'C', 'X')
            GROUP BY type_category
        """
        
        try:
            request.env.cr.execute(query)
            results = request.env.cr.dictfetchall()
            
            # Initialize counts
            type_counts = {
                'individual': 0,
                'joint_org': 0,
                'general_org': 0,
                'temporary_org': 0
            }
            
            # Fill in actual counts
            for row in results:
                category = row['type_category']
                if category in type_counts:
                    type_counts[category] = int(row['count'])
            
            # Calculate total and percentages
            total = sum(type_counts.values())
            
            if total == 0:
                _logger.warning("No reservation type data found")
                return self._get_default_type_data()
            
            result = {
                'individual': {
                    'count': type_counts['individual'],
                    'percentage': round((type_counts['individual'] / total) * 100, 1)
                },
                'joint_organization': {
                    'count': type_counts['joint_org'],
                    'percentage': round((type_counts['joint_org'] / total) * 100, 1)
                },
                'general_organization': {
                    'count': type_counts['general_org'],
                    'percentage': round((type_counts['general_org'] / total) * 100, 1)
                },
                'temporary_organization': {
                    'count': type_counts['temporary_org'],
                    'percentage': round((type_counts['temporary_org'] / total) * 100, 1)
                },
                'total': total
            }
            
            _logger.info(f"Reservation by type: {result}")
            return result
            
        except Exception as e:
            _logger.error(f"Error fetching reservation by type: {str(e)}", exc_info=True)
            return self._get_default_type_data()

    def _fetch_reservation_by_time(self):
        """
        Fetch reservation proportion by advance booking time.
        Calculate days between TODAY and bookg_date from time_table.
        
        Categories based on how far in advance the booking is:
        - D0: Today's bookings (bookg_date = today)
        - D1: Tomorrow's bookings (bookg_date = today + 1 day)
        - D3: 3 days ahead bookings (bookg_date = today + 3 days)
        - D7: 7 days ahead bookings (bookg_date = today + 7 days)
        - D14: 14 days ahead bookings (bookg_date = today + 14 days)
        - D15+: 15+ days ahead bookings (bookg_date >= today + 15 days)
        
        Uses ONLY time_table table with bookg_date and bookg_time fields.
        """
        query = """
            WITH booking_days AS (
                SELECT 
                    tt.time_table_id,
                    tt.bookg_date,
                    tt.bookg_time,
                    -- Calculate days difference between booking date and TODAY
                    CAST(tt.bookg_date AS DATE) - CURRENT_DATE as days_ahead
                FROM time_table tt
                WHERE tt.bookg_date IS NOT NULL
                    AND tt.deleted_at IS NULL
                    AND tt.bookg_date >= CURRENT_DATE  -- Only future and today's bookings
            )
            SELECT 
                CASE 
                    WHEN days_ahead >= 15 THEN 'd15_plus'
                    WHEN days_ahead = 14 THEN 'd14'
                    WHEN days_ahead >= 7 AND days_ahead < 14 THEN 'd7'
                    WHEN days_ahead >= 3 AND days_ahead < 7 THEN 'd3'
                    WHEN days_ahead >= 1 AND days_ahead < 3 THEN 'd1'
                    WHEN days_ahead = 0 THEN 'd0'
                    ELSE 'd0'
                END as time_category,
                COUNT(*) as count
            FROM booking_days
            WHERE days_ahead >= 0  -- Exclude past bookings
            GROUP BY time_category
        """
        
        try:
            request.env.cr.execute(query)
            results = request.env.cr.dictfetchall()
            
            # Initialize counts
            time_counts = {
                'd15_plus': 0,
                'd14': 0,
                'd7': 0,
                'd3': 0,
                'd1': 0,
                'd0': 0
            }
            
            # Fill in actual counts
            for row in results:
                category = row['time_category']
                if category in time_counts:
                    time_counts[category] = int(row['count'])
            
            # Calculate total and percentages
            total = sum(time_counts.values())
            
            if total == 0:
                _logger.warning("No future reservation data found")
                return self._get_default_time_data()
            
            result = {
                'd0': {
                    'label': "Today's Bookings",
                    'count': time_counts['d0'],
                    'percentage': round((time_counts['d0'] / total) * 100, 1)
                },
                'd1': {
                    'label': "Tomorrow's Bookings",
                    'count': time_counts['d1'],
                    'percentage': round((time_counts['d1'] / total) * 100, 1)
                },
                'd3': {
                    'label': "3 Days Ahead",
                    'count': time_counts['d3'],
                    'percentage': round((time_counts['d3'] / total) * 100, 1)
                },
                'd7': {
                    'label': "7 Days Ahead",
                    'count': time_counts['d7'],
                    'percentage': round((time_counts['d7'] / total) * 100, 1)
                },
                'd14': {
                    'label': "14 Days Ahead",
                    'count': time_counts['d14'],
                    'percentage': round((time_counts['d14'] / total) * 100, 1)
                },
                'd15_plus': {
                    'label': "15+ Days Ahead",
                    'count': time_counts['d15_plus'],
                    'percentage': round((time_counts['d15_plus'] / total) * 100, 1)
                },
                'total': total
            }
            
            _logger.info(f"Advance booking analysis: {result}")
            return result
            
        except Exception as e:
            _logger.error(f"Error fetching advance bookings: {str(e)}", exc_info=True)
            return self._get_default_time_data()

    def _fetch_reservation_by_channel(self):
        """
        Fetch reservation proportion by channel.
        Maps chnl_cd_id and chnl_detail to: Phone, Internet, Agency, Agent, Others
        """
        query = """
            SELECT 
                CASE 
                    WHEN LOWER(COALESCE(chnl_detail, '')) LIKE '%phone%' 
                        OR LOWER(COALESCE(chnl_detail, '')) LIKE '%tel%' 
                        OR LOWER(COALESCE(chnl_detail, '')) LIKE '%call%'
                        OR chnl_cd_id = 39718
                        THEN 'phone'
                    WHEN LOWER(COALESCE(chnl_detail, '')) LIKE '%web%' 
                        OR LOWER(COALESCE(chnl_detail, '')) LIKE '%online%' 
                        OR LOWER(COALESCE(chnl_detail, '')) LIKE '%internet%'
                        OR LOWER(COALESCE(chnl_detail, '')) LIKE '%mobile%'
                        OR chnl_cd_id = 779
                        THEN 'internet'
                    WHEN LOWER(COALESCE(chnl_detail, '')) LIKE '%agency%' 
                        OR LOWER(COALESCE(chnl_detail, '')) LIKE '%travel%' 
                        OR LOWER(COALESCE(chnl_detail, '')) LIKE '%partner%'
                        OR chnl_cd_id = 39719
                        THEN 'agency'
					WHEN LOWER(COALESCE(chnl_detail, '')) LIKE '%agent%' 
                        OR LOWER(COALESCE(chnl_detail, '')) LIKE '%office%' 
                        OR chnl_cd_id = 1676
                        THEN 'agent'
                    ELSE 'others'
                END as channel_category,
                COUNT(*) as count
            FROM booking_info
            WHERE bookg_info_id IS NOT NULL
                AND deleted_at IS NULL
                AND bookg_state_scd NOT IN ('canceled', 'C', 'X')
            GROUP BY channel_category
        """
        
        try:
            request.env.cr.execute(query)
            results = request.env.cr.dictfetchall()
            
            # Initialize counts
            channel_counts = {
                'phone': 0,
                'internet': 0,
                'agency': 0,
                'agent': 0,
                'others': 0
            }
            
            # Fill in actual counts
            for row in results:
                category = row['channel_category']
                if category in channel_counts:
                    channel_counts[category] = int(row['count'])
            
            # Calculate total and percentages
            total = sum(channel_counts.values())
            
            if total == 0:
                _logger.warning("No reservation channel data found")
                return self._get_default_channel_data()
            
            result = {
                'phone': {
                    'count': channel_counts['phone'],
                    'percentage': round((channel_counts['phone'] / total) * 100, 1)
                },
                'internet': {
                    'count': channel_counts['internet'],
                    'percentage': round((channel_counts['internet'] / total) * 100, 1)
                },
                'agency': {
                    'count': channel_counts['agency'],
                    'percentage': round((channel_counts['agency'] / total) * 100, 1)
                },
                'agent': {
                    'count': channel_counts['agent'],
                    'percentage': round((channel_counts['agent'] / total) * 100, 1)
                },
                'others': {
                    'count': channel_counts['others'],
                    'percentage': round((channel_counts['others'] / total) * 100, 1)
                },
                'total': total
            }
            
            _logger.info(f"Reservation by channel: {result}")
            return result
            
        except Exception as e:
            _logger.error(f"Error fetching reservation by channel: {str(e)}", exc_info=True)
            return self._get_default_channel_data()

    def _get_default_type_data(self):
        """Default data when no records found"""
        return {
            'individual': {'count': 0, 'percentage': 0},
            'joint_organization': {'count': 0, 'percentage': 0},
            'general_organization': {'count': 0, 'percentage': 0},
            'temporary_organization': {'count': 0, 'percentage': 0},
            'total': 0
        }

    def _get_default_time_data(self):
        """Default data when no records found"""
        return {
            'd0': {'label': "Today's Bookings", 'count': 0, 'percentage': 0},
            'd1': {'label': "Tomorrow's Bookings", 'count': 0, 'percentage': 0},
            'd3': {'label': "3 Days Ahead", 'count': 0, 'percentage': 0},
            'd7': {'label': "7 Days Ahead", 'count': 0, 'percentage': 0},
            'd14': {'label': "14 Days Ahead", 'count': 0, 'percentage': 0},
            'd15_plus': {'label': "15+ Days Ahead", 'count': 0, 'percentage': 0},
            'total': 0
        }

    def _get_default_channel_data(self):
        """Default data when no records found"""
        return {
            'phone': {'count': 0, 'percentage': 0},
            'internet': {'count': 0, 'percentage': 0},
            'agency': {'count': 0, 'percentage': 0},
            'agent': {'count': 0, 'percentage': 0},
            'others': {'count': 0, 'percentage': 0},
            'total': 0
        }
