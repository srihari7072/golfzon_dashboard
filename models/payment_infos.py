from odoo import models, fields

class PaymentInfos(models.Model):
    _name = "payment.infos"
    _description = "Payment Information"
    _table = "payment_infos"  # Use existing database table
    _order = "pay_id desc"  # Order by latest first

    # Map to existing database columns
    pay_id = fields.Integer("Payment ID", required=True, index=True)
    customer_id = fields.Integer("Customer ID")
    account_id = fields.Integer("Account ID")
    sales_info_id = fields.Integer("Sales Info ID")
    payment_cd_id = fields.Integer("Payment Code ID")
    store_cd_id = fields.Integer("Store Code ID")
    cal_type_cd_id = fields.Integer("Calculation Type Code ID")
    org_pay_id = fields.Integer("Original Payment ID")
    org_customer_id = fields.Integer("Original Customer ID")
    pay_date = fields.Date("Payment Date", required=True, index=True)
    cancel_date = fields.Date("Cancel Date")
    pay_amt = fields.Float("Payment Amount", digits=(16, 2))
    tax_amt = fields.Float("Tax Amount", digits=(16, 2))
    free_amt = fields.Float("Free Amount", digits=(16, 2))
    vat_amt = fields.Float("VAT Amount", digits=(16, 2))
    order_no = fields.Char("Order Number", size=50)
    remark = fields.Text("Remark")
    cancel_remark = fields.Text("Cancel Remark")
    kiosk_pay_type_scd = fields.Char("Kiosk Payment Type Code", size=10)
    etc_info1 = fields.Char("Additional Info 1", size=100)
    etc_info2 = fields.Char("Additional Info 2", size=100)
    etc_info3 = fields.Char("Additional Info 3", size=100)
    cancel_yn = fields.Selection([("Y", "Yes"), ("N", "No")], string="Cancelled", default="N")
    created_id = fields.Integer("Created By")
    created_at = fields.Datetime("Created At")
    updated_id = fields.Integer("Updated By")
    updated_at = fields.Datetime("Updated At")
    deleted_id = fields.Integer("Deleted By")
    deleted_at = fields.Datetime("Deleted At")
