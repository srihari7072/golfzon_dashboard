from odoo import models, fields

class GroupMember(models.Model):
    _name = 'golf.group.member'
    _description = 'Group Members'

    group_member_id = fields.Integer('Group Member ID', required=True)
    group_id = fields.Integer('Group ID', required=True)
    position_scd = fields.Char('Position SCD')
    group_member_name = fields.Char('Member Name', required=True)
    person_code = fields.Char('Person Code')
    member_cd_id = fields.Integer('Member CD ID')
    slim_in = fields.Char('slim_in')  # e.g., 'N'
    mobile_phone = fields.Char('Mobile Phone')
    mobile_phone_idx = fields.Char('Mobile Phone Index')
    email = fields.Char('Email')
    sms_in = fields.Char('SMS IN')  # e.g., 'Y'
    remark = fields.Text('Remark')
    created_id = fields.Char('Created ID')
    created_at = fields.Datetime('Created At')
    updated_id = fields.Char('Updated ID')
    updated_at = fields.Datetime('Updated At')
    deleted_id = fields.Char('Deleted ID')
    deleted_at = fields.Datetime('Deleted At')