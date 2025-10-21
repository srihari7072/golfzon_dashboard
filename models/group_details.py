from odoo import models, fields

class GroupDetails(models.Model):
    _name = 'golf.group.details'
    _description = 'Group Details (Scheduling)'

    group_id = fields.Integer('Group ID')
    # Monthly flags (YN as Boolean for simplicity)
    month_01_yn = fields.Char('January')
    month_02_yn = fields.Char('February')
    month_03_yn = fields.Char('March')
    month_04_yn = fields.Char('April')
    month_05_yn = fields.Char('May')
    month_06_yn = fields.Char('June')
    month_07_yn = fields.Char('July')
    month_08_yn = fields.Char('August')
    month_09_yn = fields.Char('September')
    month_10_yn = fields.Char('October')
    month_11_yn = fields.Char('November')
    month_12_yn = fields.Char('December')
    # Weekly flags
    week_01_yn = fields.Char('Week 1')
    week_02_yn = fields.Char('Week 2')
    week_03_yn = fields.Char('Week 3')
    week_04_yn = fields.Char('Week 4')
    # Day flags
    mon_yn = fields.Char('Monday')
    tue_yn = fields.Char('Tuesday')
    wed_yn = fields.Char('Wednesday')
    thu_yn = fields.Char('Thursday')
    fri_yn = fields.Char('Friday')
    sat_yn = fields.Char('Saturday')
    sun_yn = fields.Char('Sunday')
    created_at = fields.Datetime('Created At')
    updated_at = fields.Datetime('Updated At')