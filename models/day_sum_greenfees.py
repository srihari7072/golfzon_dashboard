from odoo import models, fields

class DaySumGreenfees(models.Model):
    _name = "day.sum.greenfees"
    _description = "Day Sum Greenfees"

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
