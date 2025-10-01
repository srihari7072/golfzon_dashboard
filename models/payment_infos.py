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

    @api.model
    def get_database_date_ranges(self):
        try:
            q = """
                SELECT MIN(pay_date) AS min_date, MAX(pay_date) AS max_date, COUNT(*) AS total_records
                FROM payment_infos
                WHERE cancel_yn = 'N' AND pay_amt > 0
            """
            self.env.cr.execute(q)
            r = self.env.cr.fetchone()
            if not r or not r[0] or not r[1]:
                return None
            min_date = r[0] if isinstance(r[0], date) else datetime.strptime(str(r[0]), "%Y-%m-%d").date()
            max_date = r[1] if isinstance(r[1], date) else datetime.strptime(str(r[1]), "%Y-%m-%d").date()
            return {"min_date": min_date, "max_date": max_date, "total_records": int(r[2] or 0)}
        except Exception as e:
            _logger.error(f"get_database_date_ranges error: {e}")
            return None
        
    def _generate_iso_labels(self, start_date: date, days: int):
        return [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]

    @api.model
    def get_sales_trends_data(self, days=30):
        try:
            info = self.get_database_date_ranges()
            if not info:
                return self._get_empty_sales_data(days)

            end_date = info["max_date"]
            start_date = end_date - timedelta(days=days - 1)
            prev_end = end_date.replace(year=end_date.year - 1)
            prev_start = start_date.replace(year=start_date.year - 1)

            q = """
                SELECT pay_date::date, SUM(COALESCE(pay_amt,0))::numeric
                FROM payment_infos
                WHERE cancel_yn = 'N' AND pay_amt > 0 AND pay_date BETWEEN %s AND %s
                GROUP BY 1 ORDER BY 1
            """
            self.env.cr.execute(q, (start_date, end_date))
            cur_rows = {r[0]: float(r[1]) for r in self.env.cr.fetchall() or []}
            self.env.cr.execute(q, (prev_start, prev_end))
            prev_rows = {r[0]: float(r[1]) for r in self.env.cr.fetchall() or []}

            cur = []
            prv = []
            d = start_date
            for _ in range(days):
                cur.append(cur_rows.get(d, 0.0))
                prv.append(prev_rows.get(d.replace(year=d.year - 1), 0.0))
                d += timedelta(days=1)

            cur_total = int(round(sum(cur)))
            prev_total = int(round(sum(prv)))
            growth = 0.0 if prev_total == 0 else max(-100.0, min(100.0, round((cur_total - prev_total) * 100.0 / prev_total, 1)))

            labels = self._generate_iso_labels(start_date, days)

            avg_q = """
                SELECT AVG(COALESCE(pay_amt,0))::numeric
                FROM payment_infos
                WHERE cancel_yn = 'N' AND pay_amt > 0 AND pay_date BETWEEN %s AND %s
            """
            self.env.cr.execute(avg_q, (start_date, end_date))
            avg_unit = int(float(self.env.cr.fetchone()[0] or 0))

            return {
                "current_data": cur,
                "prev_year_data": prv,
                "labels": labels,
                "totals": {
                    "current_total": cur_total,
                    "prev_year_total": prev_total,
                    "growth_percentage": growth,
                    "average_unit_price": avg_unit,
                },
                "date_info": {
                    "current_start": start_date.strftime("%Y-%m-%d"),
                    "current_end": end_date.strftime("%Y-%m-%d"),
                    "prev_year_start": prev_start.strftime("%Y-%m-%d"),
                    "prev_year_end": prev_end.strftime("%Y-%m-%d"),
                    "database_max_date": end_date.strftime("%Y-%m-%d"),
                    "total_records": info["total_records"],
                },
            }
        except Exception as e:
            _logger.error(f"get_sales_trends_data error: {e}")
            return self._get_empty_sales_data(days)

    @api.model 
    def get_performance_indicators(self):
        """Get performance indicators using database-driven date ranges"""
        try:
            # Get actual database date ranges
            date_info = self.get_database_date_ranges()
            if not date_info:
                return self._get_empty_performance_data()
            
            max_date = date_info['max_date']
            max_year = max_date.year
            max_month = max_date.month
            
            _logger.info(f"📊 Performance indicators for year {max_year}, month {max_month}")
            
            # Define date ranges for year (cumulative YTD)
            current_year_start = date(max_year, 1, 1)
            current_year_end = max_date
            prev_year_start = current_year_start.replace(year=max_year - 1)
            prev_year_end = max_date.replace(year=max_year - 1)
            
            # Sum query for sales
            sum_query = """
                SELECT SUM(CAST(pay_amt AS DECIMAL(15,2)))
                FROM payment_infos 
                WHERE cancel_yn = 'N' 
                AND pay_date >= %s AND pay_date <= %s
                AND pay_amt > 0
            """
            
            self.env.cr.execute(sum_query, (current_year_start, current_year_end))
            cumulative_sales_year = self.env.cr.fetchone()[0] or 0
            
            self.env.cr.execute(sum_query, (prev_year_start, prev_year_end))
            prev_year_sales = self.env.cr.fetchone()[0] or 0
            
            year_growth = 0
            if prev_year_sales > 0:
                year_growth = round(((cumulative_sales_year - prev_year_sales) / prev_year_sales) * 100, 1)
                year_growth = max(-100, min(100, year_growth))
            
            # Define date ranges for month (partial current month based on max_date)
            current_month_start = max_date.replace(day=1)
            current_month_end = max_date
            prev_month_start = current_month_start.replace(year=max_year - 1)
            prev_month_end = max_date.replace(year=max_year - 1)
            
            self.env.cr.execute(sum_query, (current_month_start, current_month_end))
            current_month_sales = self.env.cr.fetchone()[0] or 0
            
            self.env.cr.execute(sum_query, (prev_month_start, prev_month_end))
            prev_month_sales = self.env.cr.fetchone()[0] or 0
            
            month_growth = 0
            if prev_month_sales > 0:
                month_growth = round(((current_month_sales - prev_month_sales) / prev_month_sales) * 100, 1)
                month_growth = max(-100, min(100, month_growth))
            
            # Average query
            avg_query = """
                SELECT AVG(CAST(pay_amt AS DECIMAL(15,2)))
                FROM payment_infos 
                WHERE cancel_yn = 'N' 
                AND pay_date >= %s AND pay_date <= %s
                AND pay_amt > 0
            """
            
            # Year average
            self.env.cr.execute(avg_query, (current_year_start, current_year_end))
            year_avg_price = self.env.cr.fetchone()[0] or 0
            
            self.env.cr.execute(avg_query, (prev_year_start, prev_year_end))
            prev_year_avg = self.env.cr.fetchone()[0] or 0
            
            year_avg_growth = 0
            if prev_year_avg > 0:
                year_avg_growth = round(((year_avg_price - prev_year_avg) / prev_year_avg) * 100, 1)
                year_avg_growth = max(-100, min(100, year_avg_growth))
            
            # Month average
            self.env.cr.execute(avg_query, (current_month_start, current_month_end))
            month_avg_price = self.env.cr.fetchone()[0] or 0
            
            self.env.cr.execute(avg_query, (prev_month_start, prev_month_end))
            prev_month_avg = self.env.cr.fetchone()[0] or 0
            
            month_avg_growth = 0
            if prev_month_avg > 0:
                month_avg_growth = round(((month_avg_price - prev_month_avg) / prev_month_avg) * 100, 1)
                month_avg_growth = max(-100, min(100, month_avg_growth))
            
            _logger.info(f"📊 Performance results:")
            _logger.info(f"    Year sales: {cumulative_sales_year:,.0f} (growth: {year_growth}%)")
            _logger.info(f"    Month sales: {current_month_sales:,.0f} (growth: {month_growth}%)")
            _logger.info(f"    Year avg: {year_avg_price:,.0f} (growth: {year_avg_growth}%), Month avg: {month_avg_price:,.0f} (growth: {month_avg_growth}%)")
            
            return {
                'sales_performance': {
                    'cumulative_sales_year': int(cumulative_sales_year),
                    'year_growth': year_growth,
                    'current_month_sales': int(current_month_sales),
                    'month_growth': month_growth
                },
                'average_order_performance': {
                    'cumulative_unit_price_year': int(year_avg_price),
                    'year_growth': year_avg_growth,
                    'current_monthly_guest_price': int(month_avg_price),
                    'month_growth': month_avg_growth
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
    
