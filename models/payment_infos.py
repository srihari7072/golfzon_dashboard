from odoo import models, fields, api
from datetime import datetime, date, timedelta
import logging

_logger = logging.getLogger(__name__)

class PaymentInfos(models.Model):
    _name = "payment.infos"
    _description = "Payment Information"
    _table = "payment_infos"  # Use existing database table
    _order = "pay_id desc"  # Order by latest first

    # Map to existing database columns
    pay_id = fields.Integer("Payment ID", required=True, index=True)
    customer_id = fields.Integer("Customer ID")
    account_id = fields.Integer("Account ID")
    sales_info_id = fields.Integer("Sales Info ID")
    payment_cd_id = fields.Integer("Payment Code ID")
    store_cd_id = fields.Integer("Store Code ID")
    cal_type_cd_id = fields.Integer("Calculation Type Code ID")
    org_pay_id = fields.Integer("Original Payment ID")
    org_customer_id = fields.Integer("Original Customer ID")
    pay_date = fields.Date("Payment Date", required=True, index=True)
    cancel_date = fields.Date("Cancel Date")
    pay_amt = fields.Float("Payment Amount", digits=(16, 2))
    tax_amt = fields.Float("Tax Amount", digits=(16, 2))
    free_amt = fields.Float("Free Amount", digits=(16, 2))
    vat_amt = fields.Float("VAT Amount", digits=(16, 2))
    order_no = fields.Char("Order Number", size=50)
    remark = fields.Text("Remark")
    cancel_remark = fields.Text("Cancel Remark")
    kiosk_pay_type_scd = fields.Char("Kiosk Payment Type Code", size=10)
    etc_info1 = fields.Char("Additional Info 1", size=100)
    etc_info2 = fields.Char("Additional Info 2", size=100)
    etc_info3 = fields.Char("Additional Info 3", size=100)
    cancel_yn = fields.Selection([("Y", "Yes"), ("N", "No")], string="Cancelled", default="N")
    created_id = fields.Integer("Created By")
    created_at = fields.Datetime("Created At")
    updated_id = fields.Integer("Updated By")
    updated_at = fields.Datetime("Updated At")
    deleted_id = fields.Integer("Deleted By")
    deleted_at = fields.Datetime("Deleted At")


        # ✅ NEW: Get actual database date ranges
    @api.model
    def get_database_date_ranges(self):
        """Get actual min/max dates from database"""
        try:
            date_range_query = """
                SELECT 
                    MIN(pay_date) as min_date,
                    MAX(pay_date) as max_date,
                    COUNT(*) as total_records
                FROM payment_infos 
                WHERE cancel_yn = 'N' AND pay_amt > 0
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
                
                _logger.info(f"📊 Database date range: {min_date} to {max_date} ({total_records} records)")
                
                return {
                    'min_date': min_date,
                    'max_date': max_date,
                    'total_records': total_records
                }
            else:
                _logger.warning("❌ No payment data found in database")
                return None
                
        except Exception as e:
            _logger.error(f"❌ Error getting database date ranges: {str(e)}")
            return None

    # ✅ UPDATED: Smart sales trends based on actual data
    @api.model
    def get_sales_trends_data(self, days=30):
        """Get sales trends data using database-driven date ranges"""
        try:
            _logger.info(f"📊 Getting sales trends for {days} days...")
            
            # Get actual database date ranges
            date_info = self.get_database_date_ranges()
            if not date_info:
                return self._get_empty_sales_data(days)
            
            # Use last available date as end date instead of today
            end_date = date_info['max_date']  # 2025-08-26
            start_date = end_date - timedelta(days=days-1)  # 2025-07-27 for 30 days
            
            # Previous year dates (same logic but one year back)
            prev_year_end = end_date.replace(year=end_date.year - 1)  # 2024-08-26
            prev_year_start = start_date.replace(year=start_date.year - 1)  # 2024-07-27
            
            _logger.info(f"📊 Using date ranges:")
            _logger.info(f"    Current: {start_date} to {end_date}")
            _logger.info(f"    Previous year: {prev_year_start} to {prev_year_end}")
            
            # Current period daily sales
            current_query = """
                SELECT 
                    pay_date,
                    SUM(CAST(pay_amt AS DECIMAL(15,2))) as daily_sales
                FROM payment_infos 
                WHERE cancel_yn = 'N' 
                  AND pay_date BETWEEN %s AND %s
                  AND pay_amt > 0
                GROUP BY pay_date
                ORDER BY pay_date
            """
            
            self.env.cr.execute(current_query, (start_date, end_date))
            current_results = self.env.cr.fetchall()
            
            # Previous year daily sales
            self.env.cr.execute(current_query, (prev_year_start, prev_year_end))
            prev_year_results = self.env.cr.fetchall()
            
            _logger.info(f"📊 Found {len(current_results)} current records, {len(prev_year_results)} previous year records")
            
            # Process data into arrays
            current_data = self._process_daily_data(current_results, start_date, days)
            prev_year_data = self._process_daily_data(prev_year_results, prev_year_start, days)
            
            # Calculate totals
            current_total = sum(current_data)
            prev_year_total = sum(prev_year_data)
            
            _logger.info(f"📊 Totals: Current={current_total:,.0f}, Previous={prev_year_total:,.0f}")
            
            # Calculate growth percentage
            growth_percentage = 0
            if prev_year_total > 0:
                growth_percentage = round(((current_total - prev_year_total) / prev_year_total) * 100, 1)
                growth_percentage = max(-100, min(100, growth_percentage))  # Cap at ±100%
            
            # Average unit price for current period
            avg_price_query = """
                SELECT AVG(CAST(pay_amt AS DECIMAL(15,2))) as avg_price
                FROM payment_infos 
                WHERE cancel_yn = 'N' 
                  AND pay_date BETWEEN %s AND %s
                  AND pay_amt > 0
            """
            
            self.env.cr.execute(avg_price_query, (start_date, end_date))
            avg_unit_price = self.env.cr.fetchone()[0] or 0
            
            # Generate labels
            labels = self._generate_date_labels(start_date, days)
            
            return {
                'current_data': current_data,
                'prev_year_data': prev_year_data,
                'labels': labels,
                'totals': {
                    'current_total': int(current_total),
                    'prev_year_total': int(prev_year_total),
                    'growth_percentage': growth_percentage,
                    'average_unit_price': int(avg_unit_price)
                },
                'date_info': {
                    'current_start': start_date.strftime('%Y-%m-%d'),
                    'current_end': end_date.strftime('%Y-%m-%d'),
                    'prev_year_start': prev_year_start.strftime('%Y-%m-%d'),
                    'prev_year_end': prev_year_end.strftime('%Y-%m-%d'),
                    'database_max_date': end_date.strftime('%Y-%m-%d'),
                    'total_records': date_info['total_records']
                }
            }
            
        except Exception as e:
            _logger.error(f"❌ Sales trends error: {str(e)}")
            return self._get_empty_sales_data(days)

    # ✅ UPDATED: Smart performance indicators based on actual data
    @api.model 
    def get_performance_indicators(self):
        """Get performance indicators using database-driven date ranges"""
        try:
            # Get actual database date ranges
            date_info = self.get_database_date_ranges()
            if not date_info:
                return self._get_empty_performance_data()
            
            max_date = date_info['max_date']  # 2025-08-26
            max_year = max_date.year  # 2025
            max_month = max_date.month  # 8 (August)
            
            _logger.info(f"📊 Performance indicators for year {max_year}, month {max_month}")
            
            # Cumulative sales this year up to max_date
            year_sales_query = """
                SELECT SUM(CAST(pay_amt AS DECIMAL(15,2))) as year_sales
                FROM payment_infos 
                WHERE cancel_yn = 'N' 
                  AND EXTRACT(YEAR FROM pay_date) = %s
                  AND pay_date <= %s
                  AND pay_amt > 0
            """
            
            self.env.cr.execute(year_sales_query, (max_year, max_date))
            cumulative_sales_year = self.env.cr.fetchone()[0] or 0
            
            # Previous year same period for comparison
            prev_year_end = max_date.replace(year=max_year - 1)
            self.env.cr.execute(year_sales_query, (max_year - 1, prev_year_end))
            prev_year_sales = self.env.cr.fetchone()[0] or 0
            
            # Year growth
            year_growth = 0
            if prev_year_sales > 0:
                year_growth = round(((cumulative_sales_year - prev_year_sales) / prev_year_sales) * 100, 1)
                year_growth = max(-100, min(100, year_growth))
            
            # Current month sales (last month with data)
            month_sales_query = """
                SELECT SUM(CAST(pay_amt AS DECIMAL(15,2))) as month_sales
                FROM payment_infos 
                WHERE cancel_yn = 'N' 
                  AND EXTRACT(YEAR FROM pay_date) = %s
                  AND EXTRACT(MONTH FROM pay_date) = %s
                  AND pay_amt > 0
            """
            
            self.env.cr.execute(month_sales_query, (max_year, max_month))
            current_month_sales = self.env.cr.fetchone()[0] or 0
            
            # Previous month for comparison
            if max_month > 1:
                prev_month = max_month - 1
                prev_month_year = max_year
            else:
                prev_month = 12
                prev_month_year = max_year - 1
            
            self.env.cr.execute(month_sales_query, (prev_month_year, prev_month))
            prev_month_sales = self.env.cr.fetchone()[0] or 0
            
            # Month growth
            month_growth = 0
            if prev_month_sales > 0:
                month_growth = round(((current_month_sales - prev_month_sales) / prev_month_sales) * 100, 1)
                month_growth = max(-100, min(100, month_growth))
            
            # Average order values for this year
            year_avg_query = """
                SELECT AVG(CAST(pay_amt AS DECIMAL(15,2))) as year_avg
                FROM payment_infos 
                WHERE cancel_yn = 'N' 
                  AND EXTRACT(YEAR FROM pay_date) = %s
                  AND pay_date <= %s
                  AND pay_amt > 0
            """
            
            self.env.cr.execute(year_avg_query, (max_year, max_date))
            year_avg_price = self.env.cr.fetchone()[0] or 0
            
            # Monthly average
            self.env.cr.execute(month_sales_query.replace('SUM', 'AVG'), (max_year, max_month))
            month_avg_price = self.env.cr.fetchone()[0] or 0
            
            _logger.info(f"📊 Performance results:")
            _logger.info(f"    Year sales: {cumulative_sales_year:,.0f} (growth: {year_growth}%)")
            _logger.info(f"    Month sales: {current_month_sales:,.0f} (growth: {month_growth}%)")
            _logger.info(f"    Year avg: {year_avg_price:,.0f}, Month avg: {month_avg_price:,.0f}")
            
            return {
                'sales_performance': {
                    'cumulative_sales_year': int(cumulative_sales_year),
                    'year_growth': year_growth,
                    'current_month_sales': int(current_month_sales),
                    'month_growth': month_growth
                },
                'average_order_performance': {
                    'cumulative_unit_price_year': int(year_avg_price),
                    'current_monthly_guest_price': int(month_avg_price)
                },
                'data_info': {
                    'max_date': max_date.strftime('%Y-%m-%d'),
                    'year': max_year,
                    'month': max_month,
                    'total_records': date_info['total_records']
                }
            }
            
        except Exception as e:
            _logger.error(f"❌ Performance indicators error: {str(e)}")
            return self._get_empty_performance_data()

    def _process_daily_data(self, results, start_date, days):
        """Process daily sales data into array"""
        date_amounts = {}
        for result in results:
            pay_date = result[0]
            amount = float(result[1]) if result[1] else 0
            if isinstance(pay_date, str):
                pay_date = datetime.strptime(pay_date, '%Y-%m-%d').date()
            date_amounts[pay_date] = amount
        
        # Generate daily array
        daily_data = []
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            amount = date_amounts.get(current_date, 0)
            daily_data.append(amount)
        
        return daily_data

    def _generate_date_labels(self, start_date, days):
        """Generate date labels for chart"""
        labels = []
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            if days <= 7:
                labels.append(current_date.strftime('%a'))  # Mon, Tue, etc.
            else:
                labels.append(current_date.strftime('%m/%d'))  # 07/27, 08/26, etc.
        return labels

    def _get_empty_sales_data(self, days):
        """Return empty sales data structure"""
        return {
            'current_data': [0] * days,
            'prev_year_data': [0] * days,
            'labels': [f"Day {i+1}" for i in range(days)],
            'totals': {
                'current_total': 0,
                'prev_year_total': 0,
                'growth_percentage': 0,
                'average_unit_price': 0
            },
            'date_info': {
                'message': 'No sales data available'
            }
        }

    def _get_empty_performance_data(self):
        """Return empty performance data structure"""
        return {
            'sales_performance': {
                'cumulative_sales_year': 0,
                'year_growth': 0,
                'current_month_sales': 0,
                'month_growth': 0
            },
            'average_order_performance': {
                'cumulative_unit_price_year': 0,
                'current_monthly_guest_price': 0
            }
        }