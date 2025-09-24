from odoo import models, fields

class AdminPrivacyHis(models.Model):
    _name = "admin.privacy.his"
    _description = "Admin Privacy History"
    _table = "admin_privacy_his"   # explicitly set DB table name

    admin_privacy_his_id = fields.Integer(string="History ID")
    person_code = fields.Char(string="Person Code")
    admin_code = fields.Char(string="Admin Code")
    modify_scd = fields.Char(string="Modify SCD")
    before_value = fields.Text(string="Before Value")
    after_value = fields.Text(string="After Value")
    program_group_code = fields.Char(string="Program Group Code")
    client_ip = fields.Char(string="Client IP")
    Account_id = fields.Char(string="Account_id")
    created_at = fields.Datetime(string="Created At", default=fields.Datetime.now)
    process_cnt = fields.Char(string="Process Count")
