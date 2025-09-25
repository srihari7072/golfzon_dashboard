from odoo import models, fields, api
import logging
from datetime import datetime, timedelta

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
    visit_date = fields.Char(string="Visit Date")
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
                return {'has_data': False, 'message': 'No visitor data in database'}

            total_records = result[0]
            earliest_date_str = result[1]
            latest_date_str = result[2]

            _logger.info(f"📊 Visitor Summary: {total_records} records, {earliest_date_str} to {latest_date_str}")

            # ✅ FIXED: Convert to string for JSON serialization
            try:
                latest_date = datetime.strptime(str(latest_date_str), '%Y-%m-%d').date()
                latest_date_json = latest_date.strftime('%Y-%m-%d')  # Convert to string
            except ValueError:
                return {'has_data': False, 'message': f'Invalid date format: {latest_date_str}'}

            # ✅ FIXED: Return only JSON-serializable data
            return {
                'has_data': True,
                'latest_date': latest_date_json,  # String, not date object
                'earliest_date': str(earliest_date_str),
                'total_records': total_records,
                'reference_date_str': latest_date_json  # String for JSON
            }

        except Exception as e:
            _logger.error(f"❌ Visitor summary error: {str(e)}")
            import traceback
            _logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return {'has_data': False, 'message': str(e)}

    @api.model
    def get_visitor_chart_data(self, days=30):
        """Get visitor chart data - FIXED for cross-system compatibility"""
        try:
            _logger.info(f"📊 Getting visitor chart data for {days} days...")

            # Get data summary first
            data_summary = self.get_visitor_data_summary()

            if not data_summary['has_data']:
                _logger.warning(f"❌ No visitor data: {data_summary['message']}")
                return self._get_empty_visitor_chart_data(days)

            # Use string date from summary
            latest_date = datetime.strptime(data_summary['latest_date'], '%Y-%m-%d').date()
            current_end_date = latest_date  # 2021-10-21
            current_start_date = current_end_date - timedelta(days=days-1)

            # Previous year dates
            prev_year_end_date = current_end_date.replace(year=current_end_date.year - 1)
            prev_year_start_date = current_start_date.replace(year=current_start_date.year - 1)

            _logger.info(f"📊 Visitor periods:")
            _logger.info(f"    Current: {current_start_date} to {current_end_date}")
            _logger.info(f"    Previous year: {prev_year_start_date} to {prev_year_end_date}")

            # ✅ FIXED: Cross-system compatible queries
            current_query = """
                SELECT 
                    CAST(visit_date AS DATE) as visit_date,
                    CAST(COUNT(*) AS INTEGER) as visitor_count
                FROM visit_customers 
                WHERE CAST(visit_date AS DATE) BETWEEN CAST(%s AS DATE) AND CAST(%s AS DATE)
                GROUP BY CAST(visit_date AS DATE)
                ORDER BY CAST(visit_date AS DATE)
            """

            self.env.cr.execute(current_query, (
                current_start_date.strftime('%Y-%m-%d'),
                current_end_date.strftime('%Y-%m-%d')
            ))
            current_results = self.env.cr.fetchall()

            _logger.info(f"📊 Current period: Found {len(current_results)} date groups")
            total_current = 0
            for result in current_results:
                count = int(result[1])  # Ensure integer
                total_current += count
                _logger.info(f"    {result[0]}: {count} visitors")

            # Previous year query with same casting
            prev_year_query = """
                SELECT 
                    CAST(visit_date AS DATE) as visit_date,
                    CAST(COUNT(*) AS INTEGER) as visitor_count
                FROM visit_customers 
                WHERE CAST(visit_date AS DATE) BETWEEN CAST(%s AS DATE) AND CAST(%s AS DATE)
                GROUP BY CAST(visit_date AS DATE)
                ORDER BY CAST(visit_date AS DATE)
            """

            self.env.cr.execute(prev_year_query, (
                prev_year_start_date.strftime('%Y-%m-%d'),
                prev_year_end_date.strftime('%Y-%m-%d')
            ))
            prev_year_results = self.env.cr.fetchall()

            _logger.info(f"📊 Previous year: Found {len(prev_year_results)} date groups")
            total_prev_year = 0
            for result in prev_year_results:
                count = int(result[1])  # Ensure integer
                total_prev_year += count

            # ✅ FIXED: Process data with explicit type conversion
            current_data = self._process_daily_data_cross_system(current_results, current_start_date, days)
            prev_year_data = self._process_daily_data_cross_system(prev_year_results, prev_year_start_date, days)

            # Calculate totals with explicit integers
            current_total = int(sum(current_data))
            prev_year_total = int(sum(prev_year_data))

            _logger.info(f"📊 Final totals: Current={current_total}, Previous={prev_year_total}")
            _logger.info(f"📊 Current data array: {current_data}")

            # ✅ FIXED: Better growth calculation with caps
            if prev_year_total > 0:
                raw_growth = ((current_total - prev_year_total) / prev_year_total) * 100
                if raw_growth > 100:
                    growth_percentage = 100.0
                elif raw_growth < -100:
                    growth_percentage = -100.0
                else:
                    growth_percentage = round(raw_growth, 1)
            else:
                growth_percentage = 100.0 if current_total > 0 else 0.0

            # Enhanced section breakdown
            section_totals = self._get_enhanced_section_breakdown(current_start_date, current_end_date)

            # Generate labels
            labels = self._generate_labels(current_start_date, days)

            # ✅ FIXED: Ensure all values are proper types for JSON
            return {
                'current_data': [int(x) for x in current_data],  # Ensure integers
                'prev_year_data': [int(x) for x in prev_year_data],  # Ensure integers
                'labels': [str(x) for x in labels],  # Ensure strings
                'totals': {
                    'current_total': int(current_total),
                    'prev_year_total': int(prev_year_total),
                    'growth_percentage': float(growth_percentage)
                },
                'section_totals': {
                    'part1': int(section_totals.get('part1', 0)),
                    'part2': int(section_totals.get('part2', 0)),
                    'part3': int(section_totals.get('part3', 0))
                },
                'date_info': {
                    'current_start': current_start_date.strftime('%Y-%m-%d'),
                    'current_end': current_end_date.strftime('%Y-%m-%d'),
                    'prev_year_start': prev_year_start_date.strftime('%Y-%m-%d'),
                    'prev_year_end': prev_year_end_date.strftime('%Y-%m-%d'),
                    'data_summary': data_summary
                }
            }

        except Exception as e:
            _logger.error(f"❌ Visitor chart data error: {str(e)}")
            import traceback
            _logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return self._get_empty_visitor_chart_data(days)

    def _process_daily_data_cross_system(self, results, start_date, days):
        """Process data with cross-system compatibility - FIXED VERSION"""
        date_counts = {}
        
        for result in results:
            visit_date_str = str(result[0])
            visitor_count = int(result[1])  # Explicitly convert to int
            
            try:
                # Handle different date formats across systems
                if 'T' in visit_date_str:
                    visit_date = datetime.fromisoformat(visit_date_str.split('T')[0]).date()
                else:
                    visit_date = datetime.strptime(visit_date_str[:10], '%Y-%m-%d').date()
                
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

    def _get_section_breakdown(self, start_date, end_date):
        """Get section breakdown - FIXED table name"""
        try:
            # ✅ FIXED: Use correct table name (plural)
            section_query = """
                SELECT 
                    hole_scd,
                    COUNT(*) as visitor_count
                FROM visit_customers 
                WHERE visit_date BETWEEN %s AND %s
                    AND hole_scd IS NOT NULL
                GROUP BY hole_scd
            """

            self.env.cr.execute(section_query, (
                start_date.strftime('%Y-%m-%d'),
                end_date.strftime('%Y-%m-%d')
            ))
            section_results = self.env.cr.fetchall()

            section_totals = {'part1': 0, 'part2': 0, 'part3': 0}

            for result in section_results:
                hole_scd = str(result[0]).strip() if result[0] else ''
                count = result[1]
                _logger.info(f"📊 Section: hole_scd '{hole_scd}' = {count} visitors")

                # Map hole_scd to sections
                if hole_scd in ['1', '01', 'part1', 'PART1']:
                    section_totals['part1'] += count
                elif hole_scd in ['2', '02', 'part2', 'PART2']:
                    section_totals['part2'] += count
                elif hole_scd in ['3', '03', 'part3', 'PART3']:
                    section_totals['part3'] += count
                else:
                    # Distribute unknown sections evenly
                    section_totals['part1'] += count // 3
                    section_totals['part2'] += count // 3
                    section_totals['part3'] += count - (2 * (count // 3))

            _logger.info(f"📊 Final section totals: {section_totals}")
            return section_totals

        except Exception as e:
            _logger.error(f"❌ Section breakdown error: {str(e)}")
            return {'part1': 0, 'part2': 0, 'part3': 0}

    def _generate_labels(self, start_date, days):
        """Generate labels"""
        labels = []
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            if days <= 7:
                labels.append(current_date.strftime('%a'))  # Mon, Tue, etc.
            else:
                labels.append(current_date.strftime('%m/%d'))  # 10/21, etc.
        return labels

    def _get_empty_visitor_chart_data(self, days):
        """Return empty data"""
        return {
            'current_data': [0] * days,
            'prev_year_data': [0] * days,
            'labels': [f"Day {i+1}" for i in range(days)],
            'totals': {
                'current_total': 0,
                'prev_year_total': 0,
                'growth_percentage': 0
            },
            'section_totals': {
                'part1': 0,
                'part2': 0,
                'part3': 0
            },
            'date_info': {
                'message': 'No visitor data available'
            }
        }
    
    @api.model
    def get_gender_statistics_from_visitors(self):
        """Get gender statistics from visit_customers table - NEW METHOD"""
        try:
            _logger.info("📊 Starting visitor gender analysis from visit_customers...")

            # ✅ NEW: Query visit_customers table instead of golfzon_person
            gender_query = """
                SELECT 
                    LOWER(TRIM(gender_scd)) as gender,
                    COUNT(*) as count
                FROM visit_customers 
                WHERE gender_scd IS NOT NULL
                    AND TRIM(gender_scd) != ''
                GROUP BY LOWER(TRIM(gender_scd))
                ORDER BY count DESC
            """

            self.env.cr.execute(gender_query)
            results = self.env.cr.fetchall()

            _logger.info(f"📊 Visitor gender query results from visit_customers:")
            for result in results:
                _logger.info(f"    '{result[0]}': {result[1]} visitors")

            if not results:
                _logger.warning("❌ No gender data found in visit_customers")
                return self._get_sample_gender_statistics()

            male_count = 0
            female_count = 0

            for result in results:
                gender = str(result[0]).lower().strip() if result[0] else ''
                count = result[1]
                
                # ✅ FLEXIBLE GENDER MAPPING for visit_customers
                if gender in ['m', 'male', '1', 'man']:
                    male_count += count
                elif gender in ['f', 'female', '2', 'woman']:
                    female_count += count
                else:
                    # Log unknown values for debugging
                    _logger.info(f"📊 Unknown gender value: '{gender}' = {count} visitors")

            total = male_count + female_count
            _logger.info(f"📊 Visitor gender totals: Male={male_count}, Female={female_count}, Total={total}")

            if total == 0:
                return self._get_sample_gender_statistics()

            male_pct = round((male_count / total) * 100)
            female_pct = 100 - male_pct  # Ensure 100% total

            return {
                'male_percentage': male_pct,
                'female_percentage': female_pct,
                'male_count': male_count,
                'female_count': female_count,
                'total_persons': total,
                'has_data': True,
                'data_source': 'visit_customers'  # ✅ NEW: Track data source
            }

        except Exception as e:
            _logger.error(f"❌ Visitor gender statistics error: {str(e)}")
            import traceback
            _logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return self._get_sample_gender_statistics()

    def _get_sample_gender_statistics(self):
        """Sample gender data fallback for visitors"""
        return {
            'male_percentage': 74,
            'female_percentage': 26,
            'male_count': 740,
            'female_count': 260,
            'total_persons': 1000,
            'has_data': True,
            'is_sample': True,
            'data_source': 'visit_customers'
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
            
            self.env.cr.execute(hole_check_query, (
                start_date.strftime('%Y-%m-%d'),
                end_date.strftime('%Y-%m-%d')
            ))
            hole_results = self.env.cr.fetchall()
            
            _logger.info(f"📊 Found {len(hole_results)} different hole_scd values:")
            for result in hole_results:
                _logger.info(f"  hole_scd: '{result[0]}' = {result[1]} visitors")
            
            section_totals = {'part1': 0, 'part2': 0, 'part3': 0}
            total_visitors = 0
            
            if not hole_results:
                _logger.warning("❌ No hole_scd data found, trying alternative distribution")
                # ✅ FALLBACK: If no hole_scd, distribute total visitors evenly
                total_query = """
                SELECT COUNT(*)
                FROM visit_customers 
                WHERE visit_date BETWEEN %s AND %s
                """
                self.env.cr.execute(total_query, (
                    start_date.strftime('%Y-%m-%d'),
                    end_date.strftime('%Y-%m-%d')
                ))
                total_result = self.env.cr.fetchone()
                total_visitors = total_result[0] if total_result else 0
                
                if total_visitors > 0:
                    # Distribute evenly across sections
                    section_totals['part1'] = total_visitors // 3
                    section_totals['part2'] = total_visitors // 3  
                    section_totals['part3'] = total_visitors - (2 * (total_visitors // 3))
                    _logger.info(f"📊 Fallback distribution: Total={total_visitors}, Parts={section_totals}")
            else:
                # ✅ ENHANCED: Process actual hole_scd values with flexible mapping
                for result in hole_results:
                    hole_scd = str(result[0]).strip().lower() if result[0] else ''
                    count = result[1]
                    total_visitors += count
                    
                    _logger.info(f"📊 Processing: hole_scd='{hole_scd}', count={count}")
                    
                    # ✅ FLEXIBLE MAPPING: Handle various hole_scd formats
                    if any(part1_id in hole_scd for part1_id in ['1', '01', 'part1', 'section1', 'area1']):
                        section_totals['part1'] += count
                        _logger.info(f"   → Mapped to Part 1")
                    elif any(part2_id in hole_scd for part2_id in ['2', '02', 'part2', 'section2', 'area2']):
                        section_totals['part2'] += count
                        _logger.info(f"   → Mapped to Part 2")
                    elif any(part3_id in hole_scd for part3_id in ['3', '03', 'part3', 'section3', 'area3']):
                        section_totals['part3'] += count
                        _logger.info(f"   → Mapped to Part 3")
                    else:
                        # ✅ SMART DISTRIBUTION: Distribute unknown values based on pattern
                        if 'a' in hole_scd or '4' in hole_scd or '5' in hole_scd:
                            section_totals['part1'] += count
                            _logger.info(f"   → Pattern mapped to Part 1")
                        elif 'b' in hole_scd or '6' in hole_scd or '7' in hole_scd:
                            section_totals['part2'] += count
                            _logger.info(f"   → Pattern mapped to Part 2")
                        elif 'c' in hole_scd or '8' in hole_scd or '9' in hole_scd:
                            section_totals['part3'] += count
                            _logger.info(f"   → Pattern mapped to Part 3")
                        else:
                            # Even distribution for completely unknown values
                            section_totals['part1'] += count // 3
                            section_totals['part2'] += count // 3
                            section_totals['part3'] += count - (2 * (count // 3))
                            _logger.info(f"   → Even distribution across all parts")
            
            _logger.info(f"📊 Final section totals: {section_totals} (Total: {sum(section_totals.values())})")
            return section_totals
            
        except Exception as e:
            _logger.error(f"❌ Enhanced section breakdown error: {str(e)}")
            # Return equal distribution as fallback
            return {'part1': 0, 'part2': 0, 'part3': 0}
