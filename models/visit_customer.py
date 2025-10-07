from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)


class VisitCustomer(models.Model):
    _name = "visit.customer"
    _description = "Visit Customer"

    customer_id = fields.Char(string="Customer ID")
    visit_team_id = fields.Char(string="Visit Team ID")
    bookg_info_id = fields.Char(string="Booking Info ID")
    account_id = fields.Char(string="Account ID")
    visit_date = fields.Date(
        string="Visit Date", index=True
    )  # Add index for date queries
    visit_name = fields.Char(string="Visit Name")
    person_code = fields.Char(string="Person Code")
    member_cd_id = fields.Char(string="Member Code ID")
    member_no = fields.Char(string="Member No")
    visit_seq = fields.Char(string="Visit Seq")
    locker_no = fields.Char(string="Locker No")
    gender_scd = fields.Char(
        string="Gender SCD", index=True
    )  # Add index for gender queries
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

    _sql_constraints = []

    def init(self):
        """Create custom database indexes for optimal query performance"""
        super(VisitCustomer, self).init()

        # Create composite index for date range queries (most important for performance)
        self._cr.execute(
            """
            CREATE INDEX IF NOT EXISTS visit_customer_visit_date_idx 
            ON visit_customers(visit_date DESC)
        """
        )

        # Create index for gender-based queries
        self._cr.execute(
            """
            CREATE INDEX IF NOT EXISTS visit_customer_gender_idx 
            ON visit_customers(gender_scd)
        """
        )

        # Create composite index for date + gender queries (optimal for combined filtering)
        self._cr.execute(
            """
            CREATE INDEX IF NOT EXISTS visit_customer_date_gender_idx 
            ON visit_customers(visit_date DESC, gender_scd)
        """
        )

        _logger.info("✅ Visit customer indexes created successfully")
