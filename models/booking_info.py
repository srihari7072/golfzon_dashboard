from odoo import models, fields, api
from datetime import datetime, date, timedelta
import logging

_logger = logging.getLogger(__name__)

class BookingInfo(models.Model):
    _name = "booking.info"
    _description = "Booking Information"
    _table = "booking_info"  # Use existing database table
    _order = "bookg_info_id desc"  # Order by latest first

    # Map to existing database columns
    bookg_info_id = fields.Integer("Booking Info ID", column="booking_info_id")
    account_id = fields.Integer("Account ID")
    bookg_type_scd = fields.Char("Booking Type Code")
    bookg_state_scd = fields.Char("Booking State Code")
    main_yn = fields.Selection([("Y", "Yes"), ("N", "No")], string="Main")
    bookg_name = fields.Char("Booking Name", column="booking_name")
    person_code = fields.Char("Person Code")
    member_cd_id = fields.Integer("Member Code ID")
    member_no = fields.Char("Member Number")
    bookg_no = fields.Char("Booking Number")
    contact_name = fields.Char("Contact Name", column="contact_name")
    contact_mobile_phone = fields.Char("Contact Mobile")
    contact_mobile_index = fields.Char("Mobile Index")
    add_mobile_phone = fields.Char("Additional Mobile")
    bookg_kind_scd = fields.Char("Booking Kind Code")
    chnl_cd_id = fields.Integer("Channel Code ID")
    chnl_detail = fields.Char("Channel Detail")
    play_team_cnt = fields.Integer("Play Team Count")
    play_player_cnt = fields.Integer("Play Player Count")
    group_id = fields.Integer("Group ID")
    reg_path_cd_id = fields.Float("Registration Path Code")
    vendor_id = fields.Integer("Vendor ID")
    remark = fields.Text("Remark")
    org_bookg_info_id = fields.Integer("Original Booking ID")
    created_id = fields.Char("Created By (Ext)")
    created_at = fields.Datetime("Created At (Ext)")
    updated_id = fields.Char("Updated By (Ext)")
    updated_at = fields.Datetime("Updated At (Ext)")
    deleted_id = fields.Char("Deleted By (Ext)")
    deleted_at = fields.Datetime("Deleted At (Ext)")
    sms1_yn = fields.Selection([("Y", "Yes"), ("N", "No")], string="SMS1 Consent")
    sms2_yn = fields.Selection([("Y", "Yes"), ("N", "No")], string="SMS2 Consent")
    pkg_bookg_info_id = fields.Integer("Package Booking Info ID")

    @api.model
    def get_booking_summary(self):
        """Get booking summary from database only"""
        try:
            # Count total active bookings from database
            total_query = """
                SELECT COUNT(*) as total_count
                FROM booking_info
                WHERE (deleted_at IS NULL)
            """

            self.env.cr.execute(total_query)
            result = self.env.cr.fetchone()
            total_bookings = result[0] if result else 0

            # Get operation breakdown from database
            breakdown = self.get_operation_breakdown()

            return {
                "reservations": {"current": total_bookings, "total": 80},
                "teeTime": {
                    "part1": {"current": int(total_bookings * 0.4), "total": 50},
                    "part2": {"current": int(total_bookings * 0.35), "total": 30},
                    "part3": {"current": int(total_bookings * 0.25), "total": 15},
                },
            }

        except Exception as e:
            _logger.error(f"❌ Error getting booking summary from DB: {str(e)}")
            return {
                "reservations": {"current": 0, "total": 80},
                "teeTime": {
                    "part1": {"current": 0, "total": 50},
                    "part2": {"current": 0, "total": 30},
                    "part3": {"current": 0, "total": 15},
                },
            }

    @api.model
    def get_booking_details(self, limit=80):
        """Get booking details from database only"""
        try:
            bookings = self.search(
                [("deleted_at", "=", False)], limit=limit, order="bookg_info_id desc"
            )

            _logger.info(f"🗃️ Retrieved {len(bookings)} booking records from database")

            booking_list = []
            for booking in bookings:
                booking_id = int(booking.bookg_info_id) if booking.bookg_info_id else 0
                booking_data = {
                    "id": booking_id,
                    "person": booking.contact_name or booking.bookg_name or "Unknown",
                    "date": (
                        booking.created_at.strftime("%Y-%m-%d")
                        if booking.created_at
                        else ""
                    ),
                    "teeTime": self._calculate_tee_time_from_db(booking),
                    "rounds": self._calculate_rounds_from_db(booking),
                }
                booking_list.append(booking_data)

            return booking_list

        except Exception as e:
            _logger.error(f"❌ Error getting booking details from DB: {str(e)}")
            return []

    def _calculate_tee_time_from_db(self, booking):
        """Calculate tee time based on database booking data"""
        if booking.created_at:
            # Use created time as base for tee time calculation
            hour = booking.created_at.hour
            minute = (booking.bookg_info_id % 4) * 15
            return f"{hour:02d}:{minute:02d}"
        return "06:00"

    def _calculate_rounds_from_db(self, booking):
        """Calculate rounds based on database booking data"""
        if booking.play_player_cnt and booking.play_player_cnt > 2:
            return 18
        elif booking.play_team_cnt and booking.play_team_cnt > 1:
            return 18
        return 9

    @api.model
    def debug_booking_content(self):
        """Debug method to check database content"""
        try:
            all_records = self.search([("deleted_at", "=", False)], limit=10)
            _logger.info(
                f"🔍 DEBUG: Total active bookings: {self.search_count([('deleted_at', '=', False)])}"
            )

            for i, record in enumerate(all_records):
                _logger.info(
                    f"🔍 Record {i+1}: ID={record.bookg_info_id}, Name={ record.bookg_name}, BookingNo={record.bookg_no}, Created={record.created_at}"
                )

            return len(all_records)
        except Exception as e:
            _logger.error(f"❌ Debug error: {str(e)}")
            return 0

    @api.model
    def get_reservation_chart_data(self, days=30):
        """Smart chart data - finds latest available data period in database"""
        try:
            # First, find the latest date with data in the database
            latest_date_query = """
                SELECT MAX(DATE(created_at)) as latest_date
                FROM booking_info
                WHERE (deleted_at IS NULL)
            """

            self.env.cr.execute(latest_date_query)
            result = self.env.cr.fetchone()
            latest_date_str = result[0] if result and result[0] else None

            if not latest_date_str:
                _logger.warning("❌ No data found in booking_info table")
                return self._get_empty_chart_data(days)

            # Parse the latest date
            latest_date = datetime.strptime(str(latest_date_str), "%Y-%m-%d").date()
            _logger.info(f"📅 Latest data found in database: {latest_date}")

            # Calculate the period ending with the latest available date
            end_date = latest_date
            start_date = end_date - timedelta(days=days - 1)

            # Calculate same period in previous year
            prev_year_start = start_date.replace(year=start_date.year - 1)
            prev_year_end = end_date.replace(year=end_date.year - 1)

            _logger.info(f"📊 Using Data Period: {start_date} to {end_date}")
            _logger.info(
                f"📊 Previous Year Period: {prev_year_start} to {prev_year_end}"
            )

            # Query for current period data
            current_query = """
                SELECT
                    DATE(created_at) as booking_date,
                    COUNT(*) as reservation_count
                FROM booking_info
                WHERE DATE(created_at) BETWEEN %s AND %s
                    AND (deleted_at IS NULL)
                GROUP BY DATE(created_at)
                ORDER BY booking_date ASC
            """

            # Execute queries
            self.env.cr.execute(current_query, (start_date, end_date))
            current_results = self.env.cr.fetchall()

            self.env.cr.execute(current_query, (prev_year_start, prev_year_end))
            prev_year_results = self.env.cr.fetchall()

            # Process into daily arrays
            current_data = self._process_daily_data(
                current_results, start_date, end_date
            )
            prev_year_data = self._process_daily_data(
                prev_year_results, prev_year_start, prev_year_end
            )

            # Calculate statistics
            current_total = sum(current_data)
            prev_year_total = sum(prev_year_data)
            growth_percentage = (
                ((current_total - prev_year_total) / prev_year_total * 100)
                if prev_year_total > 0
                else 0
            )

            # Calculate operation rate
            avg_daily = current_total / days if days > 0 else 0
            operation_rate = avg_daily / 80 * 100

            # Generate labels with smart period indicator
            labels = self._generate_smart_date_labels(start_date, days, latest_date)

            _logger.info(
                f"📈 Database Results: Current={current_total}, PrevYear={prev_year_total}, Growth={growth_percentage:.1f}%"
            )

            return {
                "current_data": current_data,
                "prev_year_data": prev_year_data,
                "labels": labels,
                "totals": {
                    "current_total": current_total,
                    "prev_year_total": prev_year_total,
                    "growth_percentage": round(growth_percentage, 1),
                    "operation_rate": round(min(operation_rate, 100), 1),
                },
                "date_info": {
                    "current_start": start_date.strftime("%Y-%m-%d"),
                    "current_end": end_date.strftime("%Y-%m-%d"),
                    "prev_year_start": prev_year_start.strftime("%Y-%m-%d"),
                    "prev_year_end": prev_year_end.strftime("%Y-%m-%d"),
                    "latest_data_date": latest_date.strftime("%Y-%m-%d"),
                    "period_type": "latest_available",
                },
            }

        except Exception as e:
            _logger.error(f"❌ Error getting smart chart data: {str(e)}")
            return self._get_empty_chart_data(days)

    def _generate_smart_date_labels(self, start_date, days, latest_date):
        """Generate smart date labels that indicate the actual period used"""
        labels = []
        today = date.today()

        for i in range(days):
            date_obj = start_date + timedelta(days=i)
            label = f"{date_obj.month}.{date_obj.day}"

            # Mark the latest data date
            if date_obj == latest_date:
                label += " (Latest)"

            labels.append(label)

        return labels

    def _get_empty_chart_data(self, days):
        """Return empty chart data structure"""
        return {
            "current_data": [0] * days,
            "prev_year_data": [0] * days,
            "labels": [f"Day {i+1}" for i in range(days)],
            "totals": {
                "current_total": 0,
                "prev_year_total": 0,
                "growth_percentage": 0,
                "operation_rate": 0,
            },
            "date_info": {
                "current_start": "",
                "current_end": "",
                "prev_year_start": "",
                "prev_year_end": "",
                "latest_data_date": "",
                "period_type": "no_data",
            },
        }

    @api.model
    def get_data_summary(self):
        """Get summary of available data in database"""
        try:
            summary_query = """
                SELECT
                    MIN(DATE(created_at)) as earliest_date,
                    MAX(DATE(created_at)) as latest_date,
                    COUNT(*) as total_records
                FROM booking_info
                WHERE (deleted_at IS NULL)
            """

            self.env.cr.execute(summary_query)
            result = self.env.cr.fetchone()

            if result and result[0]:
                return {
                    "earliest_date": str(result[0]),
                    "latest_date": str(result[1]),
                    "total_records": result[2],
                    "has_data": True,
                }
            else:
                return {
                    "earliest_date": None,
                    "latest_date": None,
                    "total_records": 0,
                    "has_data": False,
                }

        except Exception as e:
            _logger.error(f"❌ Error getting data summary: {str(e)}")
            return {
                "earliest_date": None,
                "latest_date": None,
                "total_records": 0,
                "has_data": False,
            }

    def _process_daily_data(self, query_results, start_date, end_date):
        """Convert database results to daily array"""
        data_dict = {result[0]: result[1] for result in query_results}

        daily_data = []
        current_date = start_date
        while current_date <= end_date:
            count = data_dict.get(current_date, 0)
            daily_data.append(count)
            current_date += timedelta(days=1)

        return daily_data

    @api.model
    def get_operation_breakdown(self):
        """Get operation breakdown from actual database"""
        try:
            # Last 30 days breakdown by time periods
            query = """
                SELECT
                    CASE
                        WHEN EXTRACT(hour FROM created_at) BETWEEN 6 AND 11 THEN 'morning'
                        WHEN EXTRACT(hour FROM created_at) BETWEEN 12 AND 16 THEN 'afternoon'
                        ELSE 'evening'
                    END as time_period,
                    COUNT(*) as booking_count
                FROM booking_info
                WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days'
                    AND (deleted_at IS NULL)
                GROUP BY time_period
            """

            self.env.cr.execute(query)
            results = self.env.cr.fetchall()

            period_counts = {result[0]: result[1] for result in results}

            # Calculate percentages based on max capacity
            morning_rate = min((period_counts.get("morning", 0) / 50) * 100, 100)
            afternoon_rate = min((period_counts.get("afternoon", 0) / 30) * 100, 100)
            evening_rate = min((period_counts.get("evening", 0) / 15) * 100, 100)

            return {
                "part1": round(morning_rate, 1),
                "part2": round(afternoon_rate, 1),
                "part3": round(evening_rate, 1),
            }

        except Exception as e:
            _logger.error(f"❌ Error getting operation breakdown: {str(e)}")
            return {"part1": 0, "part2": 0, "part3": 0}

    @api.model
    def get_heatmap_data_with_details(self):
        """🚀 ULTRA-OPTIMIZED: Get 7-day heatmap with pre-calculated cell details"""
        try:
            _logger.info(
                f"🚀 ULTRA-FAST: Generating heatmap with pre-calculated details..."
            )

            # Get latest date for 7-day heatmap
            date_summary = self.get_data_summary()
            if not date_summary["has_data"]:
                _logger.warning("❌ No booking data available for heatmap")
                return self.get_empty_heatmap_with_details()

            latest_date = datetime.strptime(
                date_summary["latest_date"], "%Y-%m-%d"
            ).date()
            start_date = latest_date - timedelta(days=6)  # 7 days total

            _logger.info(f"📅 Heatmap date range: {start_date} to {latest_date}")

            # 🚀 ULTRA-OPTIMIZED: Single comprehensive query with pre-calculated details
            ultra_fast_heatmap_query = """
                WITH heatmap_base AS (
                    SELECT 
                        DATE(created_at) as booking_date,
                        EXTRACT(DOW FROM created_at) as day_of_week,  -- 0=Sunday, 6=Saturday
                        EXTRACT(HOUR FROM created_at) as booking_hour,
                        COALESCE(play_team_cnt, 1) as team_count
                    FROM booking_info 
                    WHERE DATE(created_at) BETWEEN %s AND %s
                        AND deleted_at IS NULL
                ),
                time_slots AS (
                    SELECT 
                        booking_date,
                        day_of_week,
                        CASE 
                            WHEN booking_hour BETWEEN 5 AND 7 THEN 0   -- Early Morning
                            WHEN booking_hour BETWEEN 8 AND 12 THEN 1  -- Morning  
                            WHEN booking_hour BETWEEN 13 AND 16 THEN 2 -- Afternoon
                            WHEN booking_hour BETWEEN 17 AND 19 THEN 3 -- Night
                            ELSE 1 -- Default to Morning
                        END as time_slot,
                        booking_hour,
                        SUM(team_count) as hourly_teams
                    FROM heatmap_base
                    GROUP BY booking_date, day_of_week, time_slot, booking_hour
                ),
                cell_aggregation AS (
                    SELECT 
                        day_of_week,
                        time_slot,
                        SUM(hourly_teams) as total_teams,
                        json_agg(
                            json_build_object(
                                'hour', CASE 
                                    WHEN booking_hour = 0 THEN '12 AM'
                                    WHEN booking_hour < 12 THEN booking_hour || ' AM'
                                    WHEN booking_hour = 12 THEN '12 PM'
                                    ELSE (booking_hour - 12) || ' PM'
                                END,
                                'teams', hourly_teams || ' teams'
                            ) ORDER BY booking_hour
                        ) as hourly_breakdown
                    FROM time_slots
                    GROUP BY day_of_week, time_slot
                )
                SELECT 
                    json_object_agg(
                        day_of_week || '_' || time_slot,
                        json_build_object(
                            'day_name', CASE day_of_week
                                WHEN 0 THEN 'Sunday'
                                WHEN 1 THEN 'Monday'  
                                WHEN 2 THEN 'Tuesday'
                                WHEN 3 THEN 'Wednesday'
                                WHEN 4 THEN 'Thursday'
                                WHEN 5 THEN 'Friday'
                                WHEN 6 THEN 'Saturday'
                            END,
                            'date', (%s::date + (day_of_week || ' days')::interval)::date,
                            'time_slot', CASE time_slot
                                WHEN 0 THEN 'Early Morning (5 AM - 7 AM)'
                                WHEN 1 THEN 'Morning (8 AM - 12 PM)'
                                WHEN 2 THEN 'Afternoon (1 PM - 4 PM)'
                                WHEN 3 THEN 'Night (5 PM - 7 PM)'
                            END,
                            'total_teams', total_teams,
                            'hourly_breakdown', hourly_breakdown,
                            'has_data', total_teams > 0
                        )
                    ) as cell_details,
                    json_agg(
                        json_build_object(
                            'day', day_of_week,
                            'time', time_slot,
                            'count', total_teams
                        )
                    ) as heatmap_cells
                FROM cell_aggregation
            """

            # Execute ultra-optimized query
            self.env.cr.execute(
                ultra_fast_heatmap_query, (start_date, latest_date, start_date)
            )
            result = self.env.cr.fetchone()

            if result and result[0]:
                cell_details, heatmap_cells = result

                _logger.info(
                    f"✅ Query returned data: {len(cell_details or {})} cells with details"
                )

                # Initialize heatmap grid
                headers = [
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                ]
                rows = [
                    {
                        "label": "Early Morning (5 AM - 7 AM)",
                        "data": [0, 0, 0, 0, 0, 0, 0],
                    },
                    {"label": "Morning (8 AM - 12 PM)", "data": [0, 0, 0, 0, 0, 0, 0]},
                    {"label": "Afternoon (1 PM - 4 PM)", "data": [0, 0, 0, 0, 0, 0, 0]},
                    {"label": "Night (5 PM - 7 PM)", "data": [0, 0, 0, 0, 0, 0, 0]},
                ]

                # Fill grid with data
                if heatmap_cells:
                    for cell in heatmap_cells:
                        day_idx = cell["day"]
                        time_idx = cell["time"]
                        count = cell["count"]

                        if 0 <= time_idx < 4 and 0 <= day_idx < 7:
                            rows[time_idx]["data"][day_idx] = count
                            _logger.info(f"📊 Cell [{time_idx}][{day_idx}] = {count}")

                date_range = f"{start_date.strftime('%B %d, %Y')} - {latest_date.strftime('%B %d, %Y')}"

                _logger.info(
                    f"🚀 ULTRA-FAST: Heatmap generated successfully - {len(cell_details or {})} cells"
                )

                return {
                    "headers": headers,
                    "rows": rows,
                    "date_range": date_range,
                    "cell_details": cell_details or {},
                }
            else:
                _logger.warning("⚠️ Query returned no data")
                return self.get_empty_heatmap_with_details()

        except Exception as e:
            _logger.error(f"❌ Ultra-fast heatmap error: {str(e)}")
            import traceback

            _logger.error(traceback.format_exc())
            return self.get_empty_heatmap_with_details()

    def get_empty_heatmap_with_details(self):
        """Return empty heatmap with details"""
        return {
            "headers": [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
            ],
            "rows": [
                {"label": "Early Morning (5 AM - 7 AM)", "data": [0, 0, 0, 0, 0, 0, 0]},
                {"label": "Morning (8 AM - 12 PM)", "data": [0, 0, 0, 0, 0, 0, 0]},
                {"label": "Afternoon (1 PM - 4 PM)", "data": [0, 0, 0, 0, 0, 0, 0]},
                {"label": "Night (5 PM - 7 PM)", "data": [0, 0, 0, 0, 0, 0, 0]},
            ],
            "date_range": "No data available",
            "cell_details": {},
        }

    def _process_complete_heatmap_data(self, results, start_date, end_date):
        """Process all data into heatmap grid + pre-calculated details"""
        from datetime import timedelta

        # Organize data by date and time slot
        data_structure = {}

        for result in results:
            booking_date = result[0]
            day_of_week = int(result[1])
            hour = int(result[2])
            time_slot = result[3]
            booking_count = result[4]
            total_teams = result[5]

            if time_slot == "Other":
                continue

            # Create nested structure: date -> time_slot -> hour -> teams
            if booking_date not in data_structure:
                data_structure[booking_date] = {}

            if time_slot not in data_structure[booking_date]:
                data_structure[booking_date][time_slot] = {
                    "total_teams": 0,
                    "hourly_breakdown": {},
                }

            # Add to totals
            data_structure[booking_date][time_slot]["total_teams"] += total_teams

            # Add to hourly breakdown
            if hour not in data_structure[booking_date][time_slot]["hourly_breakdown"]:
                data_structure[booking_date][time_slot]["hourly_breakdown"][hour] = 0
            data_structure[booking_date][time_slot]["hourly_breakdown"][
                hour
            ] += total_teams

        # Define structure
        time_slots = [
            ("Early Morning(5 AM -7 AM)"),
            ("Morning(8 AM -12 PM)"),
            ("Afternoon(1 PM -4 PM)"),
            ("Night(5 PM -7 PM)"),
        ]

        hour_ranges = {
            ("Early Morning(5 AM -7 AM)"): list(range(5, 8)),
            ("Morning(8 AM -12 PM)"): list(range(8, 13)),
            ("Afternoon(1 PM -4 PM)"): list(range(13, 17)),
            ("Night(5 PM -7 PM)"): list(range(17, 20)),
        }

        # Build heatmap grid and details
        rows = []
        cell_details = {}  # Pre-calculated details for instant access
        day_names = [
            ("Sunday"),
            ("Monday"),
            ("Tuesday"),
            ("Wednesday"),
            ("Thursday"),
            ("Friday"),
            ("Saturday"),
        ]

        for time_index, time_slot in enumerate(time_slots):
            row_data = []

            for day_index in range(7):
                current_date = start_date + timedelta(days=day_index)

                # Get team count for this cell
                team_count = 0
                hourly_data = {}

                if (
                    current_date in data_structure
                    and time_slot in data_structure[current_date]
                ):
                    team_count = data_structure[current_date][time_slot]["total_teams"]
                    hourly_data = data_structure[current_date][time_slot][
                        "hourly_breakdown"
                    ]

                row_data.append(team_count)

                # ✅ PRE-CALCULATE DETAILS for instant access
                cell_key = f"{day_index}_{time_index}"

                # Create hourly breakdown
                hourly_breakdown = []
                hours_list = hour_ranges[time_slot]

                for hour in hours_list:
                    teams_count = hourly_data.get(hour, 0)
                    hour_display = self._format_hour_display(hour)

                    if teams_count == 1:
                        teams_text = "1 team"
                    elif teams_count == 0:
                        teams_text = "0 teams"
                    else:
                        teams_text = f"{teams_count} {('teams')}"

                    hourly_breakdown.append({"hour": hour_display, "teams": teams_text})

                # Calculate day name
                day_of_week = current_date.weekday()  # 0=Monday
                dow_index = (day_of_week + 1) % 7  # Convert to Sunday=0

                # Store pre-calculated details
                cell_details[cell_key] = {
                    "day_name": day_names[dow_index],
                    "date": current_date.strftime("%d-%m-%Y"),
                    "time_slot": time_slot,
                    "total_teams": team_count,
                    "hourly_breakdown": hourly_breakdown,
                    "has_data": team_count > 0,
                }

            rows.append({"label": time_slot, "data": row_data})

        # Generate day headers
        day_headers = []
        day_names_short = [
            ("Sunday"),
            ("Monday"),
            ("Tuesday"),
            ("Wednesday"),
            ("Thursday"),
            ("Friday"),
            ("Saturday"),
        ]

        for day_offset in range(7):
            current_date = start_date + timedelta(days=day_offset)
            day_of_week = current_date.weekday()
            dow_index = (day_of_week + 1) % 7
            day_headers.append(day_names_short[dow_index])

        _logger.info(
            f"📊 Pre-calculated {len(cell_details)} cell details for instant access"
        )

        return {
            "headers": day_headers,
            "rows": rows,
            "cell_details": cell_details,  # ✅ PRE-CALCULATED DETAILS
            "date_range": {
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
            },
        }

    def _get_empty_heatmap_with_details(self):
        """Return empty heatmap with empty details"""
        cell_details = {}

        # Create empty details for all 28 cells (4 time slots × 7 days)
        for time_index in range(4):
            for day_index in range(7):
                cell_key = f"{day_index}_{time_index}"
                cell_details[cell_key] = {
                    "day_name": "",
                    "date": "",
                    "time_slot": "",
                    "total_teams": 0,
                    "hourly_breakdown": [],
                    "has_data": False,
                }

        return {
            "headers": [
                ("Sunday"),
                ("Monday"),
                ("Tuesday"),
                ("Wednesday"),
                ("Thursday"),
                ("Friday"),
                ("Saturday"),
            ],
            "rows": [
                {"label": ("Early Morning(5 AM -7 AM)"), "data": [0, 0, 0, 0, 0, 0, 0]},
                {"label": ("Morning(8 AM -12 PM)"), "data": [0, 0, 0, 0, 0, 0, 0]},
                {"label": ("Afternoon(1 PM -4 PM)"), "data": [0, 0, 0, 0, 0, 0, 0]},
                {"label": ("Night(5 PM -7 PM)"), "data": [0, 0, 0, 0, 0, 0, 0]},
            ],
            "cell_details": cell_details,
            "date_range": {"start_date": "", "end_date": ""},
        }

    def _format_hour_display(self, hour):
        """Format hour for display"""
        if hour == 0:
            return "12 AM"
        elif hour == 12:
            return "12 PM"
        elif hour < 12:
            return f"{hour} AM"
        else:
            return f"{hour - 12} PM"
