from odoo import models, fields

class SalesInfos(models.Model):
    _name = "sales.infos"
    _description = "Sales Information"
    _table = "sales_infos"  # Use existing database table
    _order = "sales_info_id desc"  # Order by latest first

    # Map to existing database columns
    sales_info_id = fields.Integer("Sales Info ID", required=True, index=True)
    customer_id = fields.Integer("Customer ID")
    account_id = fields.Integer("Account ID")
    sale_date = fields.Date("Sale Date", required=True, index=True)
    slip_no = fields.Char("Slip Number", size=50)
    sale_div_scd = fields.Char("Sale Division Code", size=10)
    store_cd_id = fields.Integer("Store Code ID")
    store_table_id = fields.Integer("Store Table ID")
    pos_no = fields.Char("POS Number", size=20)
    person_cnt = fields.Integer("Person Count", default=1)
    table_clear_yn = fields.Selection([("Y", "Yes"), ("N", "No")], string="Table Cleared", default="N")
    gc_gubun_scd = fields.Char("GC Division Code", size=10)
    created_id = fields.Integer("Created By")
    created_at = fields.Datetime("Created At")
    updated_id = fields.Integer("Updated By")
    updated_at = fields.Datetime("Updated At")
    deleted_id = fields.Integer("Deleted By")
    deleted_at = fields.Datetime("Deleted At")
