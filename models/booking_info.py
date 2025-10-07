from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)

class BookingInfo(models.Model):
    _name = "booking.info"
    _description = "Booking Information"

    # Fields WITHOUT column parameter - let Odoo use default naming
    bookg_info_id = fields.Integer("Booking Info ID")
    account_id = fields.Integer("Account ID")
    bookg_type_scd = fields.Char("Booking Type Code")
    bookg_state_scd = fields.Char("Booking State Code")
    main_yn = fields.Selection([("Y", "Yes"), ("N", "No")], string="Main")
    bookg_name = fields.Char("Booking Name")
    person_code = fields.Char("Person Code")
    member_cd_id = fields.Integer("Member Code ID")
    member_no = fields.Char("Member Number")
    bookg_no = fields.Char("Booking Number")
    contact_name = fields.Char("Contact Name")
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
    def init(self):
        """
        Create database indexes for millisecond-level query performance.
        This method runs automatically when the module is installed or upgraded.
        """
        _logger.info("Creating indexes for booking_info table...")
        
        try:
            # Index for bookg_info_id (primary lookup and joins)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_booking_info_id
                ON booking_info(bookg_info_id)
                WHERE bookg_info_id IS NOT NULL;
            """)
            
            # Index for bookg_name (used in reservation list)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_booking_info_name
                ON booking_info(bookg_name)
                WHERE bookg_name IS NOT NULL;
            """)
            
            # Composite index for reservation queries
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_booking_info_lookup
                ON booking_info(bookg_info_id, bookg_name)
                WHERE bookg_info_id IS NOT NULL;
            """)
            
            # Index for play_team_cnt aggregation (heatmap queries)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_booking_info_team_cnt
                ON booking_info(play_team_cnt)
                WHERE play_team_cnt > 0;
            """)
            
            # Composite index for heatmap and reservation queries
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_booking_info_full_lookup
                ON booking_info(bookg_info_id, bookg_name, play_team_cnt)
                WHERE bookg_info_id IS NOT NULL;
            """)

            # Index for bookg_kind_scd (reservation type)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_booking_info_kind
                ON booking_info(bookg_kind_scd)
                WHERE bookg_kind_scd IS NOT NULL AND deleted_at IS NULL;
            """)
            
            # Index for channel queries
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_booking_info_channel
                ON booking_info(chnl_cd_id, chnl_detail)
                WHERE deleted_at IS NULL;
            """)
            
            # Index for created_at (for time-based calculations)
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_booking_info_created
                ON booking_info(created_at, bookg_state_scd)
                WHERE created_at IS NOT NULL AND deleted_at IS NULL;
            """)
            
            # Composite index for member composition queries
            self.env.cr.execute("""
                CREATE INDEX IF NOT EXISTS idx_booking_info_composition
                ON booking_info(bookg_info_id, bookg_kind_scd, chnl_cd_id, bookg_state_scd, deleted_at)
                WHERE bookg_info_id IS NOT NULL;
            """)
            
            _logger.info("✅ booking_info indexes created successfully")
            
        except Exception as e:
            _logger.error(f"❌ Error creating booking_info indexes: {str(e)}")
            raise
