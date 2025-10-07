from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)

class TimeTable(models.Model):
    _name = "time.table"
    _description = "Time Table"

    time_table_id = fields.Char(string="Time Table ID")
    work_calendar_id = fields.Char(string="Work Calendar ID")
    account_id = fields.Char(string="Account ID")
    bookg_date = fields.Date(string="Booking Date")
    bookg_time = fields.Char(string="Booking Time")
    course_cd_id = fields.Char(string="Course Code ID")
    hole_scd = fields.Char(string="Hole SCD")
    time_part_scd = fields.Char(string="Time Part SCD")
    flag_scd = fields.Char(string="Flag SCD")
    round_scd = fields.Integer(string="Round SCD")
    time_scd = fields.Char(string="Time SCD")
    min_person = fields.Char(string="Min Person")
    caddie_s_scd = fields.Char(string="Caddie S SCD")
    prepay_time_yn = fields.Char(string="Prepay Time Y/N")
    member_time_yn = fields.Char(string="Member Time Y/N")
    green_fee_cd_id = fields.Char(string="Green Fee Code ID")
    green_fee_cd_id_2 = fields.Char(string="Green Fee Code ID 2")
    green_fee_cd_id_3 = fields.Char(string="Green Fee Code ID 3")
    green_fee_discount_id = fields.Char(string="Green Fee Discount ID")
    course_cd_id_start = fields.Char(string="Course Code ID Start")
    hole_scd_start = fields.Char(string="Hole SCD Start")
    start_seq = fields.Char(string="Start Seq")
    remark = fields.Char(string="Remark")
    created_id = fields.Char(string="Created By")
    created_at = fields.Char(string="Created At")
    updated_id = fields.Char(string="Updated By")
    updated_at = fields.Char(string="Updated At")
    deleted_id = fields.Char(string="Deleted By")
    deleted_at = fields.Char(string="Deleted At")
    reserving_id = fields.Char(string="Reserving ID")
    reserving_at = fields.Char(string="Reserving At")
    time_base_amt_id = fields.Char(string="Time Base Amount ID")
    time_base_amt_id_old = fields.Char(string="Time Base Amount ID Old")

    @api.model
    def init(self):
        """
        Create database indexes for millisecond-level query performance.
        This method runs automatically when the module is installed or upgraded.
        """
        _logger.info("Creating indexes for time_table table...")
        
        try:
            # Index for time_table_id (primary lookup and joins)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_time_table_id
                ON time_table(time_table_id)
                WHERE time_table_id IS NOT NULL;
            """)
            
            # Index for bookg_date (most common filter - today's reservations)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_time_table_bookg_date
                ON time_table(bookg_date)
                WHERE bookg_date IS NOT NULL;
            """)
            
            # Index for bookg_time (tee time queries)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_time_table_bookg_time
                ON time_table(bookg_time)
                WHERE bookg_time IS NOT NULL;
            """)
            
            # Composite index for date + time queries (reservation list)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_time_table_date_time
                ON time_table(bookg_date, bookg_time)
                WHERE bookg_date IS NOT NULL AND bookg_time IS NOT NULL;
            """)
            
            # Composite index for date + time + id (full reservation lookup)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_time_table_date_time_lookup
                ON time_table(bookg_date, bookg_time, time_table_id)
                WHERE bookg_date IS NOT NULL AND bookg_time IS NOT NULL;
            """)
            
            # Composite index for heatmap queries (date + time + id)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_time_table_heatmap
                ON time_table(bookg_date, bookg_time, time_table_id)
                WHERE bookg_date IS NOT NULL;
            """)
            
            # Index for round_scd (used in reservation details)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_time_table_round_scd
                ON time_table(round_scd)
                WHERE round_scd IS NOT NULL;
            """)
            
            # Composite index for complete reservation query
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_time_table_full_reservation
                ON time_table(bookg_date, bookg_time, time_table_id, round_scd)
                WHERE bookg_date IS NOT NULL AND bookg_time IS NOT NULL;
            """)
            
            # Index for account filtering (if needed)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_time_table_account
                ON time_table(account_id)
                WHERE account_id IS NOT NULL;
            """)
            
            _logger.info("✅ time_table indexes created successfully")
            
        except Exception as e:
            _logger.error(f"❌ Error creating time_table indexes: {str(e)}")
            raise
