from odoo import models, fields

class BookingInfo(models.Model):
    _name = "booking.info"
    _description = "Booking Information"

    # Fields WITHOUT column parameter - let Odoo use default naming
    bookg_info_id = fields.Integer("Booking Info ID")
    account_id = fields.Integer("Account ID")
    bookg_type_scd = fields.Char("Booking Type Code")
    bookg_state_scd = fields.Char("Booking State Code")
    main_yn = fields.Selection([("Y", "Yes"), ("N", "No")], string="Main")
    bookg_name = fields.Char("Booking Name")
    person_code = fields.Char("Person Code")
    member_cd_id = fields.Integer("Member Code ID")
    member_no = fields.Char("Member Number")
    bookg_no = fields.Char("Booking Number")
    contact_name = fields.Char("Contact Name")
    contact_mobile_phone = fields.Char("Contact Mobile")
    contact_mobile_index = fields.Char("Mobile Index")
    add_mobile_phone = fields.Char("Additional Mobile")
    bookg_kind_scd = fields.Char("Booking Kind Code")
    chnl_cd_id = fields.Integer("Channel Code ID")
    chnl_detail = fields.Char("Channel Detail")
    play_team_cnt = fields.Integer("Play Team Count")
    play_player_cnt = fields.Integer("Play Player Count")
    group_id = fields.Integer("Group ID")
    reg_path_cd_id = fields.Float("Registration Path Code")
    vendor_id = fields.Integer("Vendor ID")
    remark = fields.Text("Remark")
    org_bookg_info_id = fields.Integer("Original Booking ID")
    created_id = fields.Char("Created By (Ext)")
    created_at = fields.Datetime("Created At (Ext)")
    updated_id = fields.Char("Updated By (Ext)")
    updated_at = fields.Datetime("Updated At (Ext)")
    deleted_id = fields.Char("Deleted By (Ext)")
    deleted_at = fields.Datetime("Deleted At (Ext)")
    sms1_yn = fields.Selection([("Y", "Yes"), ("N", "No")], string="SMS1 Consent")
    sms2_yn = fields.Selection([("Y", "Yes"), ("N", "No")], string="SMS2 Consent")
    pkg_bookg_info_id = fields.Integer("Package Booking Info ID")

    
