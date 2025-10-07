from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)

class TimeTableHasBookgInfos(models.Model):
    _name = 'time.table.has.bookg.infos'
    _description = 'Time Table Has Booking Infos'
    _table = 'time_table_has_bookg_infos'  # actual DB table

    time_table_has_bookg_info_id = fields.Char(string='Time Table Has Bookg Info ID')
    time_table_id = fields.Char(string='Time Table ID')
    bookg_info_id = fields.Char(string='Booking Info ID')
    green_fee_cd_id = fields.Char(string='Green Fee Code ID')
    green_fee_cd_id_2 = fields.Char(string='Green Fee Code ID 2')
    green_fee_cd_id_3 = fields.Char(string='Green Fee Code ID 3')
    greenfee_discount_id = fields.Char(string='Greenfee Discount ID')
    apply_greenfee_amt = fields.Char(string='Apply Greenfee Amount')
    play_persons = fields.Char(string='Play Persons')
    caddie_s_yn = fields.Char(string='Caddie Service?')
    prepayed_amt = fields.Char(string='Prepaid Amount')
    prepayments_id = fields.Char(string='Prepayments ID')
    package_id = fields.Char(string='Package ID')
    rain_cancel_yn = fields.Char(string='Rain Cancel?')
    bookg_method_scd = fields.Char(string='Booking Method')
    created_id = fields.Char(string='Created By')
    created_at = fields.Char(string='Created At')
    updated_id = fields.Char(string='Updated By')
    updated_at = fields.Char(string='Updated At')
    kiosk_pay_yn = fields.Char(string='Kiosk Pay?')
    org_greenfee_amt = fields.Char(string='Org Greenfee Amount')
    agent_preamt = fields.Char(string='Agent Pre-Amount')
    sms_yn = fields.Char(string='SMS Sent?')
    no_show_yn = fields.Char(string='No Show?')
    member_has_packages_id = fields.Char(string='Member Packages ID')

    @api.model
    def init(self):
        """
        Create database indexes for millisecond-level query performance.
        This method runs automatically when the module is installed or upgraded.
        """
        _logger.info("Creating indexes for time_table_has_bookg_infos table...")
        
        try:
            # Index for time_table_id (foreign key to time_table)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_junction_time_table_id
                ON time_table_has_bookg_infos(time_table_id)
                WHERE time_table_id IS NOT NULL;
            """)
            
            # Index for bookg_info_id (foreign key to booking_info)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_junction_bookg_info_id
                ON time_table_has_bookg_infos(bookg_info_id)
                WHERE bookg_info_id IS NOT NULL;
            """)
            
            # Composite index for joining both tables efficiently (most important!)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_junction_time_bookg
                ON time_table_has_bookg_infos(time_table_id, bookg_info_id)
                WHERE time_table_id IS NOT NULL AND bookg_info_id IS NOT NULL;
            """)
            
            # Reverse composite index for different join orders
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_junction_bookg_time
                ON time_table_has_bookg_infos(bookg_info_id, time_table_id)
                WHERE bookg_info_id IS NOT NULL AND time_table_id IS NOT NULL;
            """)
            
            # Index on primary key (if exists)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_junction_primary_id
                ON time_table_has_bookg_infos(time_table_has_bookg_info_id)
                WHERE time_table_has_bookg_info_id IS NOT NULL;
            """)
            
            _logger.info("✅ time_table_has_bookg_infos indexes created successfully")
            
        except Exception as e:
            _logger.error(f"❌ Error creating time_table_has_bookg_infos indexes: {str(e)}")
            raise
