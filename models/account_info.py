from odoo import models, fields

class AccountInfos(models.Model):
    _name = "account.infos"
    _description = "Account Infos"

    account_id = fields.Char(string="Account ID", required=True)
    membership_yn = fields.Boolean(string="Membership Active?")
    round_term_cd_id = fields.Many2one("golfzon.round.term", string="Round Term Code")
    hole_count = fields.Integer(string="Hole Count")
    average_time = fields.Float(string="Average Time")
    transfer_fee = fields.Float(string="Transfer Fee")
    annual_fee = fields.Float(string="Annual Fee")
    club_code = fields.Char(string="Club Code")
    remarks = fields.Text(string="Remarks")
    created_at = fields.Datetime(string="Created At")
    updated_at = fields.Datetime(string="Updated At")
    deleted_at = fields.Datetime(string="Deleted At")
