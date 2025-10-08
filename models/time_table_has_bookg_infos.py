from odoo import models, fields

class TimeTableHasBookgInfos(models.Model):
    _name = 'time.table.has.bookg.infos'
    _description = 'Time Table Has Booking Infos'
    _table = 'time_table_has_bookg_infos'  # actual DB table

    time_table_has_bookg_info_id = fields.Char(string='Time Table Has Bookg Info ID')
    time_table_id = fields.Char(string='Time Table ID')
    bookg_info_id = fields.Char(string='Booking Info ID')
    green_fee_cd_id = fields.Char(string='Green Fee Code ID')
    green_fee_cd_id_2 = fields.Char(string='Green Fee Code ID 2')
    green_fee_cd_id_3 = fields.Char(string='Green Fee Code ID 3')
    greenfee_discount_id = fields.Char(string='Greenfee Discount ID')
    apply_greenfee_amt = fields.Char(string='Apply Greenfee Amount')
    play_persons = fields.Char(string='Play Persons')
    caddie_s_yn = fields.Char(string='Caddie Service?')
    prepayed_amt = fields.Char(string='Prepaid Amount')
    prepayments_id = fields.Char(string='Prepayments ID')
    package_id = fields.Char(string='Package ID')
    rain_cancel_yn = fields.Char(string='Rain Cancel?')
    bookg_method_scd = fields.Char(string='Booking Method')
    created_id = fields.Char(string='Created By')
    created_at = fields.Char(string='Created At')
    updated_id = fields.Char(string='Updated By')
    updated_at = fields.Char(string='Updated At')
    kiosk_pay_yn = fields.Char(string='Kiosk Pay?')
    org_greenfee_amt = fields.Char(string='Org Greenfee Amount')
    agent_preamt = fields.Char(string='Agent Pre-Amount')
    sms_yn = fields.Char(string='SMS Sent?')
    no_show_yn = fields.Char(string='No Show?')
    member_has_packages_id = fields.Char(string='Member Packages ID')
