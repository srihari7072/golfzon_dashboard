from odoo import models, fields

class BookgInfoHistory(models.Model):
    _name = 'bookg.info.his'
    _description = 'Booking Info History'
    _rec_name = 'bookg_info_his_id'  # display name
    _order = 'created_at desc'

    bookg_info_his_id = fields.Char(string='History ID', required=True)
    bookg_info_id = fields.Char(string='Booking Info ID')
    table_nm = fields.Char(string='Table Name')
    table_pk = fields.Char(string='Table Primary Key')
    field = fields.Char(string='Field Name')
    modify_scd = fields.Char(string='Modify SCD')
    before_value = fields.Text(string='Before Value')
    after_value = fields.Text(string='After Value')
    created_id = fields.Char(string='Created By')
    created_at = fields.Datetime(string='Created At', default=fields.Datetime.now)
