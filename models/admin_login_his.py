from odoo import models, fields

class AdminLoginHistory(models.Model):
    _name = "admin_login_his"
    _description = "Admin Login History"

    admin_code = fields.Char(string="Admin Code", required=True)
    account_id = fields.Char(string="Account ID")
    access_ip = fields.Char(string="Access IP")
    login_at = fields.Datetime(string="Login Time")
    logout_at = fields.Datetime(string="Logout Time")
