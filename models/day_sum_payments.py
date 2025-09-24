from odoo import models, fields

class DaySumPayments(models.Model):
    _name = "day.sum.payments"
    _description = "Day Sum Payments"
    _table = "day_sum_payments"  # Use existing database table
    _order = "pay_date desc, account_id desc"  # Order by latest first

    # Map to existing database columns
    account_id = fields.Integer("Account ID", required=True, index=True)
    pay_date = fields.Date("Payment Date", required=True, index=True)
    store_cd_id = fields.Integer("Store Code ID", required=True)
    payment_cd_id = fields.Integer("Payment Code ID", required=True)
    pay_group = fields.Char("Payment Group", size=20)
    pay_amt = fields.Float("Payment Amount", digits=(16, 2))
    course_group_cd_id = fields.Integer("Course Group Code ID")
    created_id = fields.Integer("Created By")
    created_at = fields.Datetime("Created At")
