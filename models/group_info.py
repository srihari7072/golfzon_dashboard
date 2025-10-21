from odoo import models, fields, api


class GroupInfo(models.Model):
    _name = "golf.group.info"
    _description = "Group Information"

    group_id = fields.Integer("Group ID")
    account_id = fields.Integer("Account ID")
    group_name = fields.Char("Group Name")
    group_code = fields.Char(
        "Group Code",
    )
    group_scd = fields.Char("Group SCD")
    state_scd = fields.Char("State SCD")
    week_scd = fields.Char("Week SCD")
    course_cd_id = fields.Integer("Course CD ID")
    time_part_scd = fields.Integer("Time Part SCD")
    team_count = fields.Char("Team Count")
    member_count = fields.Char("Member Count")
    nomember_count = fields.Char("No Member Count")
    reg_date = fields.Char("Registration Date")  # e.g., '20110720'
    expire_at = fields.Datetime("Expire At")
    group_psnlty = fields.Char("Group Penalty")
    remark = fields.Text("Remark")
    created_at = fields.Datetime("Created At")
    updated_at = fields.Datetime("Updated At")
    deleted_at = fields.Datetime("Deleted At")

    # Optional: Link to details
    details_ids = fields.One2many(
        "golf.group.details", "group_id", string="Group Details"
    )
