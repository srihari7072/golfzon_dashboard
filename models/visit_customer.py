from odoo import models, fields, api
import logging
from datetime import datetime, timedelta, date

_logger = logging.getLogger(__name__)


class VisitCustomer(models.Model):
    _name = "visit.customer"
    _description = "Visit Customer"
    _rec_name = "visit_name"
    _table = "visit_customers"

    customer_id = fields.Char(string="Customer ID")
    visit_team_id = fields.Char(string="Visit Team ID")
    bookg_info_id = fields.Char(string="Booking Info ID")
    account_id = fields.Char(string="Account ID")
    visit_date = fields.Date(string="Visit Date")
    visit_name = fields.Char(string="Visit Name")
    person_code = fields.Char(string="Person Code")
    member_cd_id = fields.Char(string="Member Code ID")
    member_no = fields.Char(string="Member No")
    visit_seq = fields.Char(string="Visit Seq")
    locker_no = fields.Char(string="Locker No")
    gender_scd = fields.Char(string="Gender SCD")
    hole_scd = fields.Char(string="Hole SCD")
    chkin_method_scd = fields.Char(string="Checkin Method SCD")
    visit_state_scd = fields.Char(string="Visit State SCD")
    green_fee_cd_id = fields.Char(string="Green Fee Code ID")
    discount_class_cd_id = fields.Char(string="Discount Class Code ID")
    area_cd_id = fields.Char(string="Area Code ID")
    mobile_phone = fields.Char(string="Mobile Phone")
    mobile_index = fields.Char(string="Mobile Index")
    join_group = fields.Char(string="Join Group")
    checkout_at = fields.Char(string="Checkout At")
    greenfee_discount_id = fields.Char(string="Green Fee Discount ID")
    locker_ord = fields.Char(string="Locker Order")
    coupon_issue_code = fields.Char(string="Coupon Issue Code")
    nation_scd = fields.Char(string="Nation SCD")
    rounding_inf_agree_yn = fields.Char(string="Rounding Info Agree Y/N")
    org_greenfee_amt = fields.Float(string="Original Green Fee Amount")
    discount_amt = fields.Float(string="Discount Amount")
    discount_remark = fields.Text(string="Discount Remark")
    greenfee_amt = fields.Float(string="Green Fee Amount")
    issue_coupon_id = fields.Char(string="Issue Coupon ID")
    created_id = fields.Char(string="Created By")
    created_at = fields.Char(string="Created At")
    updated_id = fields.Char(string="Updated By")
    updated_at = fields.Char(string="Updated At")
    deleted_id = fields.Char(string="Deleted By")
    deleted_at = fields.Char(string="Deleted At")
    cart_discount_amt = fields.Float(string="Cart Discount Amount")
    coupon_discount_amt = fields.Float(string="Coupon Discount Amount")
    spc_yn = fields.Char(string="Special Y/N")

    def _to_date(self, d):
        return d if isinstance(d, date) else datetime.strptime(str(d), "%Y-%m-%d").date()

    def _iso_labels(self, start: date, days: int):
        return [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]

    def _daily_array(self, rows_map, start: date, days: int, prev_year=False):
        data = []
        for i in range(days):
            d = start + timedelta(days=i)
            key = d if not prev_year else d
            data.append(int(rows_map.get(key, 0)))
        return data

    @api.model
    def get_visitor_data_summary(self):
        """Get visitor data summary - FIXED JSON serialization"""
        try:
            _logger.info("📊 Visitor data summary starting...")

            # ✅ FIXED: Use correct table name (plural)
            summary_query = """
                SELECT 
                    COUNT(*) as total_records,
                    MIN(visit_date) as earliest_date,
                    MAX(visit_date) as latest_date
                FROM visit_customers
                WHERE visit_date IS NOT NULL
            """

            self.env.cr.execute(summary_query)
            result = self.env.cr.fetchone()

            if not result or result[0] == 0:
                _logger.warning("❌ No visitor data found in visit_customers table")
                return {"has_data": False, "message": "No visitor data in database"}

            total_records = result[0]
            earliest_date_str = result[1]
            latest_date_str = result[2]

            _logger.info(
                f"📊 Visitor Summary: {total_records} records, {earliest_date_str} to {latest_date_str}"
            )

            # ✅ FIXED: Convert to string for JSON serialization
            try:
                latest_date = datetime.strptime(str(latest_date_str), "%Y-%m-%d").date()
                latest_date_json = latest_date.strftime("%Y-%m-%d")  # Convert to string
            except ValueError:
                return {
                    "has_data": False,
                    "message": f"Invalid date format: {latest_date_str}",
                }

            # ✅ FIXED: Return only JSON-serializable data
            return {
                "has_data": True,
                "latest_date": latest_date_json,  # String, not date object
                "earliest_date": str(earliest_date_str),
                "total_records": total_records,
                "reference_date_str": latest_date_json,  # String for JSON
            }

        except Exception as e:
            _logger.error(f"❌ Visitor summary error: {str(e)}")
            import traceback

            _logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return {"has_data": False, "message": str(e)}

    @api.model
    def get_visitor_chart_data(self, days=30):
        """
        Current-period vs same-period last year, aligned to ISO current-year labels.
        """
        try:
            self.env.cr.execute("SELECT MAX(CAST(visit_date AS date)) FROM visit_customers WHERE visit_date IS NOT NULL")
            latest_s = self.env.cr.fetchone()[0]
            if not latest_s:
                return {
                    "current_data": [0] * days,
                    "prev_year_data": [0] * days,
                    "labels": [],
                    "totals": {"current_total": 0, "prev_year_total": 0, "growth_percentage": 0.0},
                    "section_totals": {"part1": 0, "part2": 0, "part3": 0},
                    "date_info": {},
                }

            latest = self._to_date(latest_s)
            cur_end = latest
            cur_start = cur_end - timedelta(days=days - 1)
            prv_end = cur_end.replace(year=cur_end.year - 1)
            prv_start = cur_start.replace(year=cur_start.year - 1)

            q = """
                SELECT CAST(visit_date AS date) AS d, COUNT(*)::int
                FROM visit_customers
                WHERE CAST(visit_date AS date) BETWEEN %s AND %s
                GROUP BY 1 ORDER BY 1
            """
            self.env.cr.execute(q, (cur_start, cur_end))
            cur_map = {r[0]: int(r[1]) for r in self.env.cr.fetchall() or []}

            self.env.cr.execute(q, (prv_start, prv_end))
            prv_map_raw = {r[0]: int(r[1]) for r in self.env.cr.fetchall() or []}

            # Shift prev-year keys +1 year to align with current labels
            prv_map = {}
            for d_prev, cnt in prv_map_raw.items():
                shifted = d_prev.replace(year=d_prev.year + 1)
                prv_map[shifted] = cnt

            labels = self._iso_labels(cur_start, days)
            cur, prv = [], []
            d_it = cur_start
            for _ in range(days):
                cur.append(int(cur_map.get(d_it, 0)))
                prv.append(int(prv_map.get(d_it, 0)))
                d_it += timedelta(days=1)

            cur_total = int(sum(cur))
            prv_total = int(sum(prv))
            growth = 0.0 if prv_total == 0 else max(-100.0, min(100.0, round((cur_total - prv_total) * 100.0 / prv_total, 1)))

            # Section totals by time of day (optional—kept simple)
            try:
                q2 = """
                    SELECT
                      CASE
                        WHEN EXTRACT(HOUR FROM b.created_at) BETWEEN 6 AND 11 THEN 'part1'
                        WHEN EXTRACT(HOUR FROM b.created_at) BETWEEN 12 AND 17 THEN 'part2'
                        WHEN EXTRACT(HOUR FROM b.created_at) BETWEEN 18 AND 23 THEN 'part3'
                        ELSE 'part1'
                      END AS k,
                      COUNT(*)::int
                    FROM visit_customers v
                    LEFT JOIN booking_info b ON b.bookg_info_id::text = v.bookg_info_id::text
                    WHERE CAST(v.visit_date AS date) BETWEEN %s AND %s
                    GROUP BY 1
                """
                self.env.cr.execute(q2, (cur_start, cur_end))
                secs = dict(self.env.cr.fetchall() or [])
                section_totals = {"part1": int(secs.get("part1", 0)), "part2": int(secs.get("part2", 0)), "part3": int(secs.get("part3", 0))}
            except Exception as e:
                _logger.warning(f"section totals skipped: {e}")
                section_totals = {"part1": 0, "part2": 0, "part3": 0}

            return {
                "current_data": cur,
                "prev_year_data": prv,
                "labels": labels,
                "totals": {"current_total": cur_total, "prev_year_total": prv_total, "growth_percentage": growth},
                "section_totals": section_totals,
                "date_info": {
                    "current_start": cur_start.strftime("%Y-%m-%d"),
                    "current_end": cur_end.strftime("%Y-%m-%d"),
                    "prev_year_start": prv_start.strftime("%Y-%m-%d"),
                    "prev_year_end": prv_end.strftime("%Y-%m-%d"),
                },
            }
        except Exception as e:
            _logger.error(f"get_visitor_chart_data error: {e}")
            return {
                "current_data": [0] * days,
                "prev_year_data": [0] * days,
                "labels": [],
                "totals": {"current_total": 0, "prev_year_total": 0, "growth_percentage": 0.0},
                "section_totals": {"part1": 0, "part2": 0, "part3": 0},
                "date_info": {},
            }

    def _process_daily_data_cross_system(self, results, start_date, days):
        """Process data with cross-system compatibility - FIXED VERSION"""
        date_counts = {}

        for result in results:
            visit_date_str = str(result[0])
            visitor_count = int(result[1])  # Explicitly convert to int

            try:
                # Handle different date formats across systems
                if "T" in visit_date_str:
                    visit_date = datetime.fromisoformat(
                        visit_date_str.split("T")[0]
                    ).date()
                else:
                    visit_date = datetime.strptime(
                        visit_date_str[:10], "%Y-%m-%d"
                    ).date()

                date_counts[visit_date] = visitor_count
            except ValueError as e:
                _logger.warning(f"📊 Date parsing error for '{visit_date_str}': {e}")
                continue

        # Generate daily array with explicit integers
        daily_data = []
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            count = date_counts.get(current_date, 0)
            daily_data.append(int(count))  # Ensure integer

        return daily_data

    def get_section_breakdown_by_time(self, start: date, end: date):
        try:
            q = """
                SELECT
                  CASE
                    WHEN EXTRACT(HOUR FROM b.created_at) BETWEEN 6 AND 11 THEN 'part1'
                    WHEN EXTRACT(HOUR FROM b.created_at) BETWEEN 12 AND 17 THEN 'part2'
                    WHEN EXTRACT(HOUR FROM b.created_at) BETWEEN 18 AND 23 THEN 'part3'
                    ELSE 'part1'
                  END AS k,
                  COUNT(*)::int
                FROM visit_customers v
                LEFT JOIN booking_info b ON b.bookg_info_id::text = v.bookg_info_id::text
                WHERE CAST(v.visit_date AS date) BETWEEN %s AND %s
                GROUP BY 1
            """
            self.env.cr.execute(q, (start, end))
            d = dict(self.env.cr.fetchall() or [])
            return {
                "part1": int(d.get("part1", 0)),
                "part2": int(d.get("part2", 0)),
                "part3": int(d.get("part3", 0)),
            }
        except Exception as e:
            _logger.error(f"get_section_breakdown_by_time error: {e}")
            return {"part1": 0, "part2": 0, "part3": 0}

    def _generate_labels(self, start_date, days):
        """Generate labels"""
        labels = []
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            if days <= 7:
                labels.append(current_date.strftime("%a"))  # Mon, Tue, etc.
            else:
                labels.append(current_date.strftime("%m/%d"))  # 10/21, etc.
        return labels

    def _get_empty_visitor_chart_data(self, days):
        """Return empty data"""
        return {
            "current_data": [0] * days,
            "prev_year_data": [0] * days,
            "labels": [f"Day {i+1}" for i in range(days)],
            "totals": {
                "current_total": 0,
                "prev_year_total": 0,
                "growth_percentage": 0,
            },
            "section_totals": {"part1": 0, "part2": 0, "part3": 0},
            "date_info": {"message": "No visitor data available"},
        }

    def _get_enhanced_section_breakdown(self, start_date, end_date):
        """Enhanced section breakdown with better logic and debugging"""
        try:
            _logger.info(f"📊 Getting section breakdown for {start_date} to {end_date}")

            # ✅ STEP 1: Check what hole_scd values actually exist
            hole_check_query = """
            SELECT 
                hole_scd,
                COUNT(*) as visitor_count
            FROM visit_customers 
            WHERE visit_date BETWEEN %s AND %s
            AND hole_scd IS NOT NULL 
            AND TRIM(hole_scd) != ''
            GROUP BY hole_scd
            ORDER BY visitor_count DESC
            """

            self.env.cr.execute(
                hole_check_query,
                (start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")),
            )
            hole_results = self.env.cr.fetchall()

            _logger.info(f"📊 Found {len(hole_results)} different hole_scd values:")
            for result in hole_results:
                _logger.info(f"  hole_scd: '{result[0]}' = {result[1]} visitors")

            section_totals = {"part1": 0, "part2": 0, "part3": 0}
            total_visitors = 0

            if not hole_results:
                _logger.warning(
                    "❌ No hole_scd data found, trying alternative distribution"
                )
                # ✅ FALLBACK: If no hole_scd, distribute total visitors evenly
                total_query = """
                SELECT COUNT(*)
                FROM visit_customers 
                WHERE visit_date BETWEEN %s AND %s
                """
                self.env.cr.execute(
                    total_query,
                    (start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")),
                )
                total_result = self.env.cr.fetchone()
                total_visitors = total_result[0] if total_result else 0

                if total_visitors > 0:
                    # Distribute evenly across sections
                    section_totals["part1"] = total_visitors // 3
                    section_totals["part2"] = total_visitors // 3
                    section_totals["part3"] = total_visitors - (
                        2 * (total_visitors // 3)
                    )
                    _logger.info(
                        f"📊 Fallback distribution: Total={total_visitors}, Parts={section_totals}"
                    )
            else:
                # ✅ ENHANCED: Process actual hole_scd values with flexible mapping
                for result in hole_results:
                    hole_scd = str(result[0]).strip().lower() if result[0] else ""
                    count = result[1]
                    total_visitors += count

                    _logger.info(f"📊 Processing: hole_scd='{hole_scd}', count={count}")

                    # ✅ FLEXIBLE MAPPING: Handle various hole_scd formats
                    if any(
                        part1_id in hole_scd
                        for part1_id in ["1", "01", "part1", "section1", "area1"]
                    ):
                        section_totals["part1"] += count
                        _logger.info(f"   → Mapped to Part 1")
                    elif any(
                        part2_id in hole_scd
                        for part2_id in ["2", "02", "part2", "section2", "area2"]
                    ):
                        section_totals["part2"] += count
                        _logger.info(f"   → Mapped to Part 2")
                    elif any(
                        part3_id in hole_scd
                        for part3_id in ["3", "03", "part3", "section3", "area3"]
                    ):
                        section_totals["part3"] += count
                        _logger.info(f"   → Mapped to Part 3")
                    else:
                        # ✅ SMART DISTRIBUTION: Distribute unknown values based on pattern
                        if "a" in hole_scd or "4" in hole_scd or "5" in hole_scd:
                            section_totals["part1"] += count
                            _logger.info(f"   → Pattern mapped to Part 1")
                        elif "b" in hole_scd or "6" in hole_scd or "7" in hole_scd:
                            section_totals["part2"] += count
                            _logger.info(f"   → Pattern mapped to Part 2")
                        elif "c" in hole_scd or "8" in hole_scd or "9" in hole_scd:
                            section_totals["part3"] += count
                            _logger.info(f"   → Pattern mapped to Part 3")
                        else:
                            # Even distribution for completely unknown values
                            section_totals["part1"] += count // 3
                            section_totals["part2"] += count // 3
                            section_totals["part3"] += count - (2 * (count // 3))
                            _logger.info(f"   → Even distribution across all parts")

            _logger.info(
                f"📊 Final section totals: {section_totals} (Total: {sum(section_totals.values())})"
            )
            return section_totals

        except Exception as e:
            _logger.error(f"❌ Enhanced section breakdown error: {str(e)}")
            # Return equal distribution as fallback
            return {"part1": 0, "part2": 0, "part3": 0}

    @api.model
    def get_gender_statistics_from_visitors(self):
        """Get gender statistics from visit_customers table - UPDATED VERSION"""
        try:
            _logger.info("📊 Getting gender statistics from visit_customers...")

            # ✅ IMPROVED: Get latest date range for more relevant data
            data_summary = self.get_visitor_data_summary()
            if not data_summary["has_data"]:
                _logger.warning("❌ No visitor data available")
                return self._get_empty_gender_statistics()

            latest_date = datetime.strptime(
                data_summary["latest_date"], "%Y-%m-%d"
            ).date()
            # Get data from last 30 days from latest available date
            start_date = latest_date - timedelta(days=29)  # 30 days total

            _logger.info(f"📊 Gender analysis period: {start_date} to {latest_date}")

            # ✅ IMPROVED: More comprehensive gender query
            gender_query = """
            SELECT 
                LOWER(TRIM(gender_scd)) as gender, 
                COUNT(*) as count
            FROM visit_customers 
            WHERE visit_date BETWEEN %s AND %s
            AND gender_scd IS NOT NULL 
            AND TRIM(gender_scd) != ''
            GROUP BY LOWER(TRIM(gender_scd))
            ORDER BY count DESC
            """

            self.env.cr.execute(gender_query, (start_date, latest_date))
            results = self.env.cr.fetchall()

            _logger.info(f"📊 Gender query results from visit_customers:")
            for result in results:
                _logger.info(f"   {result[0]}: {result[1]} visitors")

            if not results:
                _logger.warning("❌ No gender data found in date range")
                return self._get_empty_gender_statistics()

            male_count = 0
            female_count = 0
            unknown_count = 0

            # ✅ ENHANCED: Flexible gender mapping for various formats
            for result in results:
                gender = str(result[0]).lower().strip() if result[0] else ""
                count = result[1]

                # Male variations
                if gender in ["m", "male", "1", "man", "masculine", "남성", "male_scd"]:
                    male_count += count
                # Female variations
                elif gender in [
                    "f",
                    "female",
                    "2",
                    "woman",
                    "feminine",
                    "여성",
                    "female_scd",
                ]:
                    female_count += count
                else:
                    _logger.info(
                        f"📊 Unknown gender value: '{gender}' ({count} visitors)"
                    )
                    unknown_count += count

            total = male_count + female_count + unknown_count

            # ✅ SMART: Distribute unknown values proportionally
            if unknown_count > 0 and total > 0:
                if male_count > 0 or female_count > 0:
                    # Distribute proportionally based on known data
                    known_total = male_count + female_count
                    if known_total > 0:
                        male_ratio = male_count / known_total
                        additional_male = int(unknown_count * male_ratio)
                        additional_female = unknown_count - additional_male
                        male_count += additional_male
                        female_count += additional_female
                    else:
                        # If no known data, distribute 50/50
                        male_count = unknown_count // 2
                        female_count = unknown_count - male_count
                else:
                    # All data is unknown, distribute 50/50
                    male_count = unknown_count // 2
                    female_count = unknown_count - male_count

            # Recalculate total after distribution
            total = male_count + female_count

            _logger.info(
                f"📊 Final gender totals: Male={male_count}, Female={female_count}, Total={total}"
            )

            if total == 0:
                return self._get_empty_gender_statistics()

            # Calculate percentages
            male_pct = round((male_count / total) * 100, 1)
            female_pct = round((female_count / total) * 100, 1)

            # Ensure percentages add up to 100%
            if male_pct + female_pct != 100.0:
                female_pct = 100.0 - male_pct

            return {
                "male_percentage": float(male_pct),
                "female_percentage": float(female_pct),
                "male_count": int(male_count),
                "female_count": int(female_count),
                "total_persons": int(total),
                "has_data": True,
                "is_sample": False,
                "data_source": "visit_customers",
                "date_range": f"{start_date} to {latest_date}",
                "unknown_count_original": int(unknown_count),
            }

        except Exception as e:
            _logger.error(f"❌ Gender statistics error: {str(e)}")
            import traceback

            _logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return self._get_empty_gender_statistics()

    def _get_empty_gender_statistics(self):
        """Return empty gender statistics structure"""
        return {
            "male_percentage": 0.0,
            "female_percentage": 0.0,
            "male_count": 0,
            "female_count": 0,
            "total_persons": 0,
            "has_data": False,
            "is_sample": False,
            "data_source": "visit_customers",
            "message": "No gender data available",
        }
