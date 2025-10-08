from odoo import models, fields, api
from datetime import datetime, date, timedelta
import logging

_logger = logging.getLogger(__name__)

class DaySumGreenfees(models.Model):
    _name = "day.sum.greenfees"
    _description = "Day Sum Greenfees"
    _table = "day_sum_greenfees"  # Use existing database table
    _order = "visit_date desc, account_id desc"  # Order by latest first

    # Map to existing database columns
    account_id = fields.Integer("Account ID", required=True, index=True)
    visit_date = fields.Date("Visit Date", required=True, index=True)
    hole_scd = fields.Char("Hole Code", size=10, required=True)
    member_cd_id = fields.Integer("Member Code ID", required=True)
    green_fee_cd_id = fields.Integer("Green Fee Code ID", required=True)
    gender_scd = fields.Char("Gender Code", size=5)
    visit_cnt = fields.Integer("Visit Count", default=1)
    tot_amt = fields.Float("Total Amount", digits=(16, 2))
    net_amt = fields.Float("Net Amount", digits=(16, 2))
    vat_amt = fields.Float("VAT Amount", digits=(16, 2))
    etc_amt = fields.Float("Other Amount", digits=(16, 2))
    created_id = fields.Integer("Created By")
    created_at = fields.Datetime("Created At")

    @api.model
    def get_database_date_ranges(self):
        """Get actual min/max dates from greenfees database"""
        try:
            date_range_query = """
                SELECT 
                    MIN(visit_date) as min_date,
                    MAX(visit_date) as max_date,
                    COUNT(*) as total_records
                FROM day_sum_greenfees 
                WHERE tot_amt > 0
            """
            
            self.env.cr.execute(date_range_query)
            result = self.env.cr.fetchone()
            
            if result and result[0] and result[1]:
                min_date = result[0]
                max_date = result[1]
                total_records = result[2]
                
                # Convert string dates to date objects if needed
                if isinstance(min_date, str):
                    min_date = datetime.strptime(min_date, '%Y-%m-%d').date()
                if isinstance(max_date, str):
                    max_date = datetime.strptime(max_date, '%Y-%m-%d').date()
                
                _logger.info(f"📊 Greenfees date range: {min_date} to {max_date} ({total_records} records)")
                
                return {
                    'min_date': min_date,
                    'max_date': max_date,
                    'total_records': total_records
                }
            else:
                _logger.warning("❌ No greenfee data found in database")
                return None
                
        except Exception as e:
            _logger.error(f"❌ Error getting greenfee date ranges: {str(e)}")
            return None

    @api.model
    def get_utilization_performance_data(self):
        """Get utilization performance data using database-driven date ranges"""
        try:
            # Get actual database date ranges
            date_info = self.get_database_date_ranges()
            if not date_info:
                return self._get_empty_utilization_data()
            
            max_date = date_info['max_date']
            max_year = max_date.year
            max_month = max_date.month
            
            _logger.info(f"📊 Greenfee utilization for year {max_year}, month {max_month}")
            
            # Define date ranges for year (cumulative YTD)
            current_year_start = date(max_year, 1, 1)
            current_year_end = max_date
            prev_year_start = current_year_start.replace(year=max_year - 1)
            prev_year_end = max_date.replace(year=max_year - 1)
            
            # Year sum query
            year_sum_query = """
                SELECT 
                    SUM(CAST(tot_amt AS DECIMAL(15,2))) as year_operation_amount,
                    SUM(CAST(visit_cnt AS INTEGER)) as year_total_visits,
                    COUNT(DISTINCT hole_scd) as active_holes
                FROM day_sum_greenfees 
                WHERE visit_date >= %s AND visit_date <= %s
                AND tot_amt > 0
            """
            
            self.env.cr.execute(year_sum_query, (current_year_start, current_year_end))
            year_stats = self.env.cr.fetchone()
            
            self.env.cr.execute(year_sum_query, (prev_year_start, prev_year_end))
            prev_year_stats = self.env.cr.fetchone()
            
            # Calculate year growth
            year_growth = 0
            current_year_amount = year_stats[0] or 0
            prev_year_amount = prev_year_stats[0] or 0
            
            if prev_year_amount > 0:
                year_growth = round(((current_year_amount - prev_year_amount) / prev_year_amount) * 100, 1)
                year_growth = max(-100, min(100, year_growth))
            
            # Define date ranges for month (partial current month based on max_date)
            current_month_start = max_date.replace(day=1)
            current_month_end = max_date
            prev_month_start = current_month_start.replace(year=max_year - 1)
            prev_month_end = max_date.replace(year=max_year - 1)
            
            # Month sum query (no active_holes for month)
            month_sum_query = """
                SELECT 
                    SUM(CAST(tot_amt AS DECIMAL(15,2))) as month_operation_amount,
                    SUM(CAST(visit_cnt AS INTEGER)) as month_total_visits
                FROM day_sum_greenfees 
                WHERE visit_date >= %s AND visit_date <= %s
                AND tot_amt > 0
            """
            
            self.env.cr.execute(month_sum_query, (current_month_start, current_month_end))
            month_stats = self.env.cr.fetchone()
            
            self.env.cr.execute(month_sum_query, (prev_month_start, prev_month_end))
            prev_month_stats = self.env.cr.fetchone()
            
            # Calculate month growth
            month_growth = 0
            current_month_amount = month_stats[0] or 0
            prev_month_amount = prev_month_stats[0] or 0
            
            if prev_month_amount > 0:
                month_growth = round(((current_month_amount - prev_month_amount) / prev_month_amount) * 100, 1)
                month_growth = max(-100, min(100, month_growth))
            
            _logger.info(f"📊 Utilization results:")
            _logger.info(f"    Year operation: {current_year_amount:,.0f} (growth: {year_growth}%)")
            _logger.info(f"    Month operation: {current_month_amount:,.0f} (growth: {month_growth}%)")
            _logger.info(f"    Year visits: {year_stats[1] or 0}, Active holes: {year_stats[2] or 0}")
            
            return {
                'utilization_performance': {
                    'cumulative_operation_year': int(current_year_amount),
                    'year_growth': year_growth,
                    'current_month_operation': int(current_month_amount),
                    'month_growth': month_growth,
                    'total_visits_year': year_stats[1] or 0,
                    'active_holes': year_stats[2] or 0
                },
                'data_info': {
                    'max_date': max_date.strftime('%Y-%m-%d'),
                    'year': max_year,
                    'month': max_month,
                    'total_records': date_info['total_records']
                }
            }
            
        except Exception as e:
            _logger.error(f"❌ Utilization performance error: {str(e)}")
            return self._get_empty_utilization_data()

    def _get_empty_utilization_data(self):
        """Return empty utilization data structure"""
        return {
            'utilization_performance': {
                'cumulative_operation_year': 0,
                'year_growth': 0,
                'current_month_operation': 0,
                'month_growth': 0,
                'total_visits_year': 0,
                'active_holes': 0
            }
        }
    