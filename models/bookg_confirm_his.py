from odoo import models, fields

class BookgConfirmHis(models.Model):
    _name = "bookg.confirm.his"
    _description = "Booking Confirmation History"
    _rec_name = "reserve_id"
    _order = "created_at desc"

    bookg_confirm_his_id = fields.Integer(string="Confirm History ID", required=True)
    bookg_info_id = fields.Integer(string="Booking Info ID")
    time_table_id = fields.Integer(string="Time Table ID")
    res_modify_scd = fields.Char(string="Reservation Modify Code")
    green_fee_cd_id = fields.Integer(string="Green Fee Code ID")
    greenfee_discount_id = fields.Integer(string="Green Fee Discount ID")
    apply_greenfee_amt = fields.Float(string="Applied Green Fee Amount")
    play_persons = fields.Integer(string="Play Persons")
    caddie_s_yn = fields.Char(string="Caddie Service (Y/N)")
    prepayed_amt = fields.Float(string="Prepaid Amount")
    prepayments_id = fields.Integer(string="Prepayments ID")
    package_id = fields.Integer(string="Package ID")
    cancel_cd_id = fields.Float(string="Cancel Code ID")
    cancel_remarks = fields.Text(string="Cancel Remarks")
    created_id = fields.Char(string="Created By ID")
    created_at = fields.Datetime(string="Created At", default=fields.Datetime.now)
    reserve_id = fields.Char(string="Reserve ID")
    reserve_at = fields.Datetime(string="Reserve At")
