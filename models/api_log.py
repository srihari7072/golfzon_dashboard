from odoo import models, fields

class ApiLog(models.Model):
    _name = "api.log"
    _description = "API Log"
    _rec_name = "url"  # Display URL in list headers
    _order = "created_at desc"

    api_log_id = fields.Integer(string="Log ID", required=True)
    url = fields.Char(string="Request URL", required=True)
    request = fields.Text(string="Request Data")
    response = fields.Text(string="Response Data")
    response_time = fields.Float(string="Response Time (ms)")
    client_ip = fields.Char(string="Client IP")
    created_at = fields.Datetime(string="Created At", default=fields.Datetime.now)
