from odoo import models, fields

class Members(models.Model):
    _name = 'members.members'
    _description = 'Members'
    _order = 'created_at desc'

    member_id = fields.Char(string='Member ID', required=True)
    person_code = fields.Char(string='Person Code')
    account_id = fields.Char(string='Account ID')
    member_no = fields.Char(string='Member No')
    member_class_cd_id = fields.Char(string='Member Class Code ID')
    member_cd_id = fields.Char(string='Member Code ID')
    corp_scd = fields.Char(string='Corp SCD')
    acquisition_cd_id = fields.Char(string='Acquisition Code ID')
    acquisition_amt = fields.Char(string='Acquisition Amount')
    company_name = fields.Char(string='Company Name')
    bsu_no = fields.Char(string='BSU No')
    innumber = fields.Char(string='In Number')
    entry_cd_id = fields.Char(string='Entry Code ID')
    entry_date = fields.Char(string='Entry Date')
    entry_amt = fields.Char(string='Entry Amount')
    due_date = fields.Char(string='Due Date')
    benefits_gpclass_scd = fields.Char(string='Benefits GP Class SCD')
    benefits_class_code = fields.Char(string='Benefits Class Code')
    restrict_yn = fields.Char(string='Restrict Y/N')
    acquisition_date = fields.Char(string='Acquisition Date')
    remark = fields.Text(string='Remark')

    created_id = fields.Char(string='Created ID')
    created_at = fields.Char(string='Created At')
    updated_id = fields.Char(string='Updated Id')
    updated_at = fields.Char(string='Updated At')
    deleted_id = fields.Char(string='Deleted ID')
    deleted_at = fields.Char(string='Deleted At')
    ref_member_id = fields.Char(string='Ref Member ID')
