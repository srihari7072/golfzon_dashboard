from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)

class Person(models.Model):
    _name = "golfzon.person"
    _description = "Person Information"

    person_code = fields.Char(string="Person Code")
    account_id = fields.Char(string="Account")
    member_name = fields.Char(string="Member Name")
    name_eng = fields.Char(string="English Name")
    name_chn = fields.Char(string="Chinese Name")
    file_id = fields.Char(string="File")
    lunar_yn = fields.Char(string="Lunar Calendar?")
    birth_date = fields.Date(string="Birth Date")
    gender_scd = fields.Char(string="Gender")
    nation_scd = fields.Char(string="Nationality")
    nick_name = fields.Char(string="Nickname")
    mobile_phone = fields.Char(string="Mobile Phone")
    mobile_phone_index = fields.Char(string="Mobile Phone Index")
    email = fields.Char(string="Email")
    reg_path_scd = fields.Char(string="Registration Path")
    reg_date = fields.Datetime(string="Registration Date")

    person_agree_yn = fields.Char(string="Person Agree")
    person_agree_date = fields.Datetime(string="Person Agree Date")
    marketing_agree_yn = fields.Char(string="Marketing Agree")
    marketing_agree_date = fields.Datetime(string="Marketing Agree Date")
    marketting_mobile_yn = fields.Char(string="Marketing Mobile")
    marketing_email_yn = fields.Char(string="Marketing Email")

    home_tel = fields.Char(string="Home Telephone")
    home_zip_code = fields.Char(string="Home Zip")
    home_addr = fields.Char(string="Home Address")
    home_addr_detail = fields.Char(string="Home Address Detail")

    company_tel = fields.Char(string="Company Telephone")
    company_zip_code = fields.Char(string="Company Zip")
    company_addr = fields.Char(string="Company Address")
    company_addr_detail = fields.Char(string="Company Address Detail")
    company_name = fields.Char(string="Company Name")
    work_level = fields.Char(string="Work Level")
    fax = fields.Char(string="Fax")
    post_scd = fields.Char(string="Post Code")

    manager = fields.Char(string="Manager")
    manager_tel = fields.Char(string="Manager Telephone")
    manager_email = fields.Char(string="Manager Email")

    person_group_scd = fields.Char(string="Person Group")
    state_scd = fields.Char(string="State")
    ms_num = fields.Char(string="MS Number")
    conn_gz_no = fields.Char(string="Connection GZ No")
    remark = fields.Text(string="Remarks")

    created_id = fields.Char(string="Created By")
    created_at = fields.Datetime(string="Created At")
    updated_id = fields.Char(string="Updated By")
    updated_at = fields.Datetime(string="Updated At")
    deleted_id = fields.Char(string="Deleted By")
    deleted_at = fields.Datetime(string="Deleted At")

    marketing_sms_yn = fields.Char(string="Marketing SMS")
    ci = fields.Char(string="CI")
    di = fields.Char(string="DI")

    biometrics_agree_yn = fields.Char(string="Biometrics Agree")
    biometrics_agree_date = fields.Datetime(string="Biometrics Agree Date")

    