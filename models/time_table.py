from odoo import models, fields

class TimeTable(models.Model):
    _name = "time.table"
    _description = "Time Table"

    time_table_id = fields.Char(string="Time Table ID")
    work_calendar_id = fields.Char(string="Work Calendar ID")
    account_id = fields.Char(string="Account ID")
    bookg_date = fields.Date(string="Booking Date")
    bookg_time = fields.Char(string="Booking Time")
    course_cd_id = fields.Char(string="Course Code ID")
    hole_scd = fields.Char(string="Hole SCD")
    time_part_scd = fields.Char(string="Time Part SCD")
    flag_scd = fields.Char(string="Flag SCD")
    round_scd = fields.Integer(string="Round SCD")
    time_scd = fields.Char(string="Time SCD")
    min_person = fields.Char(string="Min Person")
    caddie_s_scd = fields.Char(string="Caddie S SCD")
    prepay_time_yn = fields.Char(string="Prepay Time Y/N")
    member_time_yn = fields.Char(string="Member Time Y/N")
    green_fee_cd_id = fields.Char(string="Green Fee Code ID")
    green_fee_cd_id_2 = fields.Char(string="Green Fee Code ID 2")
    green_fee_cd_id_3 = fields.Char(string="Green Fee Code ID 3")
    green_fee_discount_id = fields.Char(string="Green Fee Discount ID")
    course_cd_id_start = fields.Char(string="Course Code ID Start")
    hole_scd_start = fields.Char(string="Hole SCD Start")
    start_seq = fields.Char(string="Start Seq")
    remark = fields.Char(string="Remark")
    created_id = fields.Char(string="Created By")
    created_at = fields.Char(string="Created At")
    updated_id = fields.Char(string="Updated By")
    updated_at = fields.Char(string="Updated At")
    deleted_id = fields.Char(string="Deleted By")
    deleted_at = fields.Char(string="Deleted At")
    reserving_id = fields.Char(string="Reserving ID")
    reserving_at = fields.Char(string="Reserving At")
    time_base_amt_id = fields.Char(string="Time Base Amount ID")
    time_base_amt_id_old = fields.Char(string="Time Base Amount ID Old")

    
