from odoo import http
from odoo.http import request, Response
import json
import io
import xlsxwriter
from datetime import datetime
from typing import Any, List, Dict, Optional

class MemberGroupController(http.Controller):

    @http.route("/golfzon/member_group/search", type="json", auth="user")
    def search_member_groups(self, start_date, end_date, group_name="", **kwargs):
        """
        Search member groups based on date range and group name

        Args:
            start_date (str): Start date in YYYY-MM-DD format
            end_date (str): End date in YYYY-MM-DD format
            group_name (str): Optional group name filter

        Returns:
            dict: JSON response with status and data
        """
        try:
            # Build search domain for golf.group.info
            domain = [
                ("created_at", ">=", f"{start_date} 00:00:00"),
                ("created_at", "<=", f"{end_date} 23:59:59"),
            ]

            # Add group name filter if provided
            if group_name and group_name.strip():
                domain.append(("group_name", "ilike", group_name))

            # Search for member groups
            GroupInfo = request.env["golf.group.info"].sudo()
            groups = GroupInfo.search(domain, order="created_at desc")

            # Format data for frontend
            data = []
            for group in groups:
                # Determine division based on group_scd or state_scd
                division = self._get_division_label(group.group_scd or group.state_scd)

                data.append(
                    {
                        "id": group.id,
                        "group_id": group.group_id,
                        "division": division,
                        "group_name": group.group_name or "N/A",
                        "member_count": self._format_number(group.member_count or 0),
                        "creation_date": (
                            group.created_at.strftime("%Y.%m.%d")
                            if group.created_at
                            else ""
                        ),
                        "revision_date": (
                            group.updated_at.strftime("%Y.%m.%d")
                            if group.updated_at
                            else ""
                        ),
                        "group_code": group.group_code or "",
                        "state_scd": group.state_scd or "",
                    }
                )

            return {"status": "success", "data": data, "count": len(data)}

        except Exception as e:
            import traceback

            error_trace = traceback.format_exc()
            print("❌ Error in search_member_groups:", error_trace)

            return {"status": "error", "message": str(e), "data": []}

    @http.route("/golfzon/member_group/download_excel", type="http", auth="user", csrf=False)
    def download_excel(self, group_id=None, **kwargs):
        """
        Download Excel file for member group data

        Args:
            group_id: Group identifier

        Returns:
            Response: Excel file download
        """
        try:
            from urllib.parse import quote  # ✅ Import for URL encoding

            print(f"📥 Download Excel Request - Group ID: {group_id}")

            # Create Excel file in memory
            output = io.BytesIO()
            workbook = xlsxwriter.Workbook(output, {"in_memory": True})
            worksheet = workbook.add_worksheet("Group List")

            # Define formats
            header_format = workbook.add_format(
                {
                    "bold": True,
                    "bg_color": "#4A90E2",
                    "color": "white",
                    "align": "center",
                    "valign": "vcenter",
                    "border": 1,
                    "font_size": 12,
                }
            )

            cell_format = workbook.add_format(
                {"align": "left", "valign": "vcenter", "border": 1, "font_size": 11}
            )

            cell_format_center = workbook.add_format(
                {"align": "center", "valign": "vcenter", "border": 1, "font_size": 11}
            )

            # Write headers
            headers = [
                "Division",
                "Member Group Name",
                "Number of Members",
                "Creation Date",
                "Date of Revision",
            ]

            # Set column widths
            worksheet.set_column(0, 0, 15)
            worksheet.set_column(1, 1, 30)
            worksheet.set_column(2, 2, 20)
            worksheet.set_column(3, 3, 18)
            worksheet.set_column(4, 4, 18)

            for col, header in enumerate(headers):
                worksheet.write(0, col, header, header_format)

            # Fetch group data
            GroupInfo = request.env["golf.group.info"].sudo()
            GroupDetails = request.env["golf.group.details"].sudo()

            groups = None
            group_name_for_file = "group_list"

            if group_id:
                try:
                    group_id_int = int(group_id)
                    groups = GroupInfo.search([("id", "=", group_id_int)])

                    if not groups:
                        groups = GroupInfo.search([("group_id", "=", group_id_int)])

                    if groups:
                        group_name_for_file = groups[0].group_name or "group"
                        print(f"✅ Found group: {group_name_for_file}")
                    else:
                        print(f"⚠️ Group {group_id} not found")
                        groups = GroupInfo.search([], order="created_at desc", limit=1)

                except ValueError:
                    groups = GroupInfo.search([("group_code", "=", str(group_id))])
                    if groups:
                        group_name_for_file = groups[0].group_name or "group"
            else:
                groups = GroupInfo.search([], order="created_at desc", limit=100)
                group_name_for_file = "all_groups"

            if not groups:
                print("❌ No groups found")
                worksheet.merge_range(1, 0, 1, 4, "No data found", cell_format_center)
            else:
                print(f"✅ Found {len(groups)} group(s) to export")

                # Write data rows
                row = 1
                for group in groups:
                    # Get division
                    division_name = "-"
                    if hasattr(group, "division") and group.division:
                        division_name = str(group.division)

                    # Write row data
                    worksheet.write(row, 0, division_name, cell_format_center)
                    worksheet.write(row, 1, group.group_name or "-", cell_format)
                    worksheet.write(
                        row, 2, str(group.member_count or 0), cell_format_center
                    )
                    worksheet.write(
                        row,
                        3,
                        (
                            group.created_at.strftime("%Y.%m.%d")
                            if group.created_at
                            else "-"
                        ),
                        cell_format_center,
                    )
                    worksheet.write(
                        row,
                        4,
                        (
                            group.updated_at.strftime("%Y.%m.%d")
                            if group.updated_at
                            else "-"
                        ),
                        cell_format_center,
                    )
                    row += 1

            # Close workbook
            workbook.close()
            output.seek(0)

            # Generate filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            # ✅ FIX: Use simple ASCII filename
            filename_ascii = f"member_group_{timestamp}.xlsx"

            # ✅ FIX: URL-encode the Korean filename for Content-Disposition
            group_name_clean = (
                "".join(
                    c
                    for c in group_name_for_file
                    if c.isalnum() or c in (" ", "-", "_")
                ).strip()
                or "group"
            )

            filename_utf8 = f"{group_name_clean}_{timestamp}.xlsx"
            filename_encoded = quote(filename_utf8.encode("utf-8"))

            print(f"✅ Excel file generated: {filename_utf8}")

            # ✅ FIX: Use RFC 5987 encoding for non-ASCII filenames
            return request.make_response(
                output.getvalue(),
                headers=[
                    (
                        "Content-Type",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    ),
                    (
                        "Content-Disposition",
                        f"attachment; filename=\"{filename_ascii}\"; filename*=UTF-8''{filename_encoded}",
                    ),
                    ("Content-Length", str(len(output.getvalue()))),
                ],
            )

        except Exception as e:
            import traceback

            error_trace = traceback.format_exc()
            print("=" * 80)
            print("❌ ERROR IN EXCEL DOWNLOAD:")
            print(error_trace)
            print("=" * 80)

            return request.make_response(
                f"Error generating Excel file: {str(e)}",
                headers=[("Content-Type", "text/plain")],
                status=500,
            )

    @http.route("/golfzon/member_group/get_statistics", type="json", auth="user")
    def get_statistics(self, **kwargs):
        """
        Get member group statistics

        Returns:
            dict: Statistics data
        """
        try:
            GroupInfo = request.env["golf.group.info"].sudo()
            GroupMember = request.env["golf.group.member"].sudo()

            total_groups = GroupInfo.search_count([])
            total_members = GroupMember.search_count([])

            # Get groups created this month
            today = datetime.now()
            first_day = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            groups_this_month = GroupInfo.search_count(
                [("created_at", ">=", first_day)]
            )

            return {
                "status": "success",
                "data": {
                    "total_groups": total_groups,
                    "total_members": total_members,
                    "groups_this_month": groups_this_month,
                },
            }

        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _format_number(self, number):
        """
        Format number with thousand separators
        """
        try:
            return "{:,}".format(int(number))
        except:
            return str(number)

    def _get_division_label(self, code):
        """
        Get human-readable division label from code
        """
        divisions = {
            "condition": "Condition-based generation",
            "register": "Register member list",
            "manual": "Manual selection",
        }
        return divisions.get(code, code or "N/A")

    @http.route("/golfzon/member_group/upload_member_list", type="http", auth="user", methods=["POST"], csrf=False)
    def upload_member_list(self, group_title: Optional[str] = None, member_list_file: Optional[Any] = None, **kwargs) -> Response:
        """
        Upload member list Excel file with correct header validation
        """
        try:
            try:
                import openpyxl
                from io import BytesIO
            except ImportError:
                return request.make_response(
                    json.dumps(
                        {"status": "error", "message": "openpyxl library not installed"}
                    ),
                    headers=[("Content-Type", "application/json")],
                )

            print(f"📤 Upload Request - Group Title: {group_title}")

            if not group_title or not member_list_file:
                return request.make_response(
                    json.dumps(
                        {
                            "status": "error",
                            "message": "Group title and file are required",
                        }
                    ),
                    headers=[("Content-Type", "application/json")],
                )

            # Read Excel file
            file_content = member_list_file.read()
            workbook = openpyxl.load_workbook(BytesIO(file_content))
            sheet = workbook.active

            if sheet is None:
                return request.make_response(
                    json.dumps(
                        {"status": "error", "message": "Unable to read Excel file"}
                    ),
                    headers=[("Content-Type", "application/json")],
                )

            # ✅ FIX: Validate headers match template
            required_headers = [
                "Membership number",
                "name",
                "Date of joining",
                "contact",
                "email",
                "Residence",
                "Number of times built-in",
                "Recent interior date",
            ]

            actual_headers = [cell.value for cell in sheet[1]]

            missing_headers = [h for h in required_headers if h not in actual_headers]
            if missing_headers:
                return request.make_response(
                    json.dumps(
                        {
                            "status": "error",
                            "message": f'Missing required columns: {", ".join(missing_headers)}',
                        }
                    ),
                    headers=[("Content-Type", "application/json")],
                )

            # Parse member data
            members: List[Dict[str, Any]] = []
            for row in sheet.iter_rows(min_row=2, values_only=True):
                if row[0]:  # Check if membership number exists
                    members.append(
                        {
                            "membership_number": row[0],
                            "name": row[1],
                            "date_of_joining": row[2],
                            "contact": row[3],
                            "email": row[4],
                            "residence": row[5],
                            "built_in_times": row[6],
                            "recent_date": row[7],
                        }
                    )

            if not members:
                return request.make_response(
                    json.dumps(
                        {"status": "error", "message": "No member data found in file"}
                    ),
                    headers=[("Content-Type", "application/json")],
                )

            # Create member group
            GroupInfo = request.env["golf.group.info"].sudo()

            new_group = GroupInfo.create(
                {
                    "group_name": group_title,
                    "member_count": len(members),
                    "group_scd": "register",
                    "state_scd": "active",
                    "created_at": datetime.now(),
                }
            )

            # Create member records
            GroupMember = request.env["golf.group.member"].sudo()
            for member in members:
                GroupMember.create(
                    {
                        "group_id": new_group.id,
                        "person_code": member["membership_number"],
                        "group_member_name": member["name"],
                        "mobile_phone": member["contact"],
                        "email": member["email"],
                        "created_at": datetime.now(),
                    }
                )

            print(f"✅ Created group '{group_title}' with {len(members)} members")

            return request.make_response(
                json.dumps(
                    {
                        "status": "success",
                        "message": f"Successfully registered {len(members)} members",
                        "group_id": new_group.id,
                    }
                ),
                headers=[("Content-Type", "application/json")],
            )

        except Exception as e:
            import traceback

            print("❌ Error uploading:", traceback.format_exc())
            return request.make_response(
                json.dumps({"status": "error", "message": str(e)}),
                headers=[("Content-Type", "application/json")],
            )

    @http.route("/golfzon/member_group/download_template", type="http", auth="user", csrf=False)
    def download_template(self, **kwargs) -> Response:
        """
        Download Excel template for member registration with correct headers
        """
        try:
            print("📥 Generating Excel template...")

            output = io.BytesIO()
            workbook = xlsxwriter.Workbook(output, {"in_memory": True})
            worksheet = workbook.add_worksheet("Member List")

            # ✅ FIX: Header format matching your design
            header_format = workbook.add_format(
                {
                    "bold": True,
                    "bg_color": "#FFFFFF",
                    "color": "#000000",
                    "align": "center",
                    "valign": "vcenter",
                    "border": 1,
                    "font_size": 11,
                    "font_name": "Arial",
                }
            )

            # Sample data format
            data_format = workbook.add_format(
                {"align": "center", "valign": "vcenter", "border": 1, "font_size": 10}
            )

            # ✅ FIX: Correct headers from your image (attached_image:4)
            headers = [
                "Membership number",
                "name",
                "Date of joining",
                "contact",
                "email",
                "Residence",
                "Number of times built-in",
                "Recent interior date",
            ]

            # Set column widths
            column_widths = [20, 15, 18, 18, 25, 18, 25, 22]
            for col, width in enumerate(column_widths):
                worksheet.set_column(col, col, width)

            # Write headers
            for col, header in enumerate(headers):
                worksheet.write(0, col, header, header_format)

            # ✅ FIX: Sample data matching the format
            sample_data = [
                [
                    "M001",
                    "John Doe",
                    "2025-01-15",
                    "010-1234-5678",
                    "john@example.com",
                    "Seoul",
                    "10",
                    "2025-03-01",
                ],
                [
                    "M002",
                    "Jane Smith",
                    "2025-02-20",
                    "010-8765-4321",
                    "jane@example.com",
                    "Busan",
                    "5",
                    "2025-03-10",
                ],
                [
                    "M003",
                    "김철수",
                    "2025-03-05",
                    "010-5555-6666",
                    "kim@example.com",
                    "Incheon",
                    "8",
                    "2025-03-15",
                ],
            ]

            for row_num, data_row in enumerate(sample_data, start=1):
                for col_num, value in enumerate(data_row):
                    worksheet.write(row_num, col_num, value, data_format)

            # Add some notes/instructions
            notes_format = workbook.add_format(
                {"italic": True, "font_color": "#666666", "font_size": 9}
            )

            worksheet.write(
                5, 0, "Note: Please fill in all required columns", notes_format
            )
            worksheet.write(6, 0, "* Date format: YYYY-MM-DD", notes_format)
            worksheet.write(7, 0, "* Contact format: 010-XXXX-XXXX", notes_format)

            workbook.close()
            output.seek(0)

            print("✅ Template generated successfully")

            return request.make_response(
                output.getvalue(),
                headers=[
                    (
                        "Content-Type",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    ),
                    (
                        "Content-Disposition",
                        'attachment; filename="member_registration_template.xlsx"',
                    ),
                    ("Content-Length", str(len(output.getvalue()))),
                ],
            )

        except Exception as e:
            import traceback

            print("❌ Error generating template:", traceback.format_exc())
            return request.make_response(
                "Error generating template. Please contact administrator.", status=500
            )

    @http.route('/golfzon/member_group/condition_inquiry', type='json', auth='user')
    def condition_inquiry(self, **kwargs) -> Dict[str, Any]:
        """
        ✅ FIXED: Resolve ambiguous column references
        ✅ Empty fields stay empty (not "N/A")
        """
        try:
            print("=" * 80)
            print("🔍 CONDITION INQUIRY REQUEST")
            print("=" * 80)
            print(json.dumps(kwargs, indent=2, default=str))
            
            group_title = kwargs.get('group_title', '')
            gender = kwargs.get('gender', 'all')
            age_group = kwargs.get('age_group', 'unselected')
            membership_start_date = kwargs.get('membership_start_date', '')
            membership_end_date = kwargs.get('membership_end_date', '')
            
            # ✅ FIXED: Specify table aliases to avoid ambiguous columns
            query = """
                SELECT DISTINCT
                    mm.member_no,
                    COALESCE(vc.visit_name, '') as group_member_name,
                    mm.entry_date,
                    COALESCE(vc.mobile_phone, gm.mobile_phone, '') as mobile_phone,
                    COALESCE(gm.email, '') as email,
                    COALESCE(vc.nation_scd, '') as nation_scd,
                    COALESCE(vc.person_code, mm.person_code) as person_code,
                    COUNT(DISTINCT vc.customer_id) as visit_count,
                    MAX(vc.visit_date) as last_visit_date,
                    COALESCE(SUM(vc.org_greenfee_amt), 0) as total_greenfee,
                    COALESCE(SUM(vc.discount_amt), 0) as total_discount
                FROM 
                    members_members mm
                LEFT JOIN 
                    golf_group_member gm ON mm.person_code = gm.person_code
                LEFT JOIN 
                    visit_customers vc ON mm.person_code = vc.person_code
                WHERE 
                    mm.deleted_at IS NULL
                    AND mm.person_code IS NOT NULL
            """
            
            params = []
            
            # Gender Filter
            if gender and gender != 'all':
                query += " AND vc.gender_scd = %s"
                params.append(gender)
            
            # Age Group Filter
            if age_group and age_group != 'unselected':
                today = datetime.now()
                
                if age_group == '20s_under':
                    birth_year = today.year - 20
                    query += " AND CAST(mm.entry_date AS INTEGER) > %s"
                    params.append(birth_year * 10000)
                elif age_group == '20s':
                    query += " AND CAST(mm.entry_date AS INTEGER) BETWEEN %s AND %s"
                    params.append((today.year - 29) * 10000)
                    params.append((today.year - 20) * 10000 + 1231)
                elif age_group == '30s':
                    query += " AND CAST(mm.entry_date AS INTEGER) BETWEEN %s AND %s"
                    params.append((today.year - 39) * 10000)
                    params.append((today.year - 30) * 10000 + 1231)
                elif age_group == '40s':
                    query += " AND CAST(mm.entry_date AS INTEGER) BETWEEN %s AND %s"
                    params.append((today.year - 49) * 10000)
                    params.append((today.year - 40) * 10000 + 1231)
                elif age_group == '50s_more':
                    birth_year = today.year - 50
                    query += " AND CAST(mm.entry_date AS INTEGER) < %s"
                    params.append(birth_year * 10000)
            
            # Membership Period Filter
            if membership_start_date:
                formatted_start = membership_start_date.replace('-', '')
                query += " AND mm.entry_date >= %s"
                params.append(formatted_start)
            
            if membership_end_date:
                formatted_end = membership_end_date.replace('-', '')
                query += " AND mm.entry_date <= %s"
                params.append(formatted_end)
            
            # ✅ FIXED: Use qualified column names in GROUP BY
            query += """
                GROUP BY 
                    mm.member_no, 
                    vc.visit_name,
                    mm.entry_date, 
                    vc.mobile_phone,
                    gm.mobile_phone,
                    gm.email,
                    vc.nation_scd, 
                    vc.person_code,
                    mm.person_code
                ORDER BY mm.entry_date DESC 
                LIMIT 1000
            """
            
            print("\n📊 SQL QUERY:")
            print(query)
            print("\n📦 PARAMS:", params)
            
            # Execute query
            request.cr.execute(query, tuple(params))
            member_records = request.cr.dictfetchall()
            
            print(f"\n✅ Found {len(member_records)} members")
            
            # Calculate Key Indicators
            member_count = len(member_records)
            total_visits = sum(m.get('visit_count', 0) or 0 for m in member_records)
            total_greenfee = sum(m.get('total_greenfee', 0) or 0 for m in member_records)
            total_discount = sum(m.get('total_discount', 0) or 0 for m in member_records)
            
            # Calculate average discount rate
            avg_discount_rate = 0
            if total_greenfee > 0:
                avg_discount_rate = (total_discount / total_greenfee) * 100
            
            indicators = {
                'number_of_members': f"{member_count:,} people",
                'number_of_times_builtin': f"{total_visits:,} times",
                'total_sales': f"{int(total_greenfee):,} won",
                'payment_green_fee': f"{int(total_greenfee):,} won",
                'open_green_fee': "0 won",
                'average_discount_rate': f"{avg_discount_rate:.1f}%"
            }
            
            # ✅ Format member list - Keep empty fields as empty
            members = []
            for member in member_records:
                # ✅ FIX: Determine residence from nation_scd
                residence = ''
                nation_scd = member.get('nation_scd', '')
                if nation_scd:
                    nation_str = str(nation_scd).strip()
                    # Check for actual location data
                    if nation_str and nation_str.lower() != 'none':
                        residence = nation_str  # Use the actual value
                
                # ✅ FIX: Parse entry_date (format: YYYYMMDD string or integer)
                entry_date_str = str(member.get('entry_date', '')).strip()
                formatted_entry_date = ''
                if entry_date_str and entry_date_str != 'None' and entry_date_str != '0':
                    try:
                        # Handle both string and integer formats
                        if len(entry_date_str) >= 8:
                            entry_date_obj = datetime.strptime(entry_date_str[:8], '%Y%m%d')
                            formatted_entry_date = entry_date_obj.strftime('%B %d, %Y')
                    except Exception as e:
                        print(f"⚠️ Date parsing error for {entry_date_str}: {e}")
                        formatted_entry_date = entry_date_str  # Use as-is if parsing fails
                
                # Format last visit date
                last_visit = ''
                if member.get('last_visit_date'):
                    try:
                        last_visit = member.get('last_visit_date').strftime('%B %d, %Y')
                    except:
                        pass
                
                members.append({
                    'membership_number': member.get('member_no', ''),
                    'name': member.get('group_member_name', ''),
                    'date_of_joining': formatted_entry_date,  # ✅ Now properly formatted
                    'contact': member.get('mobile_phone', ''),
                    'email': member.get('email', ''),
                    'residence': residence,  # ✅ Now properly mapped
                    'number_of_times_builtin': str(member.get('visit_count', 0) or 0),
                    'recent_interior_date': last_visit
                })
            
            # Create group
            group_id = None
            if member_count > 0 and group_title:
                GroupInfo = request.env['golf.group.info'].sudo()
                
                new_group = GroupInfo.create({
                    'group_name': group_title,
                    'member_count': str(member_count),
                    'group_scd': 'condition',
                    'state_scd': 'active',
                    'reg_date': datetime.now().strftime('%Y%m%d'),
                    'created_at': datetime.now()
                })
                
                group_id = new_group.id
                
                # Add members
                GroupMember = request.env['golf.group.member'].sudo()
                
                member_added_count = 0
                for idx, member in enumerate(member_records, 1):
                    person_code = member.get('person_code')
                    member_name = member.get('group_member_name', '')
                    
                    # Skip if no person_code
                    if not person_code:
                        print(f"⚠️ Skipping member {idx}: No person_code")
                        continue
                    
                    # Use member_no as fallback for empty names
                    if not member_name:
                        member_name = member.get('member_no', f'Member_{idx}')
                    
                    try:
                        GroupMember.create({
                            'group_member_id': int(f"{group_id}{idx:04d}"),
                            'group_id': group_id,
                            'person_code': str(person_code),
                            'group_member_name': str(member_name),
                            'mobile_phone': str(member.get('mobile_phone', '')),
                            'email': str(member.get('email', '')),
                            'created_at': datetime.now()
                        })
                        member_added_count += 1
                    except Exception as member_error:
                        print(f"❌ Error adding member {idx}: {member_error}")
                        continue
                
                print(f"✅ Created group ID: {group_id} with {member_added_count}/{member_count} members")
            
            print("\n" + "=" * 80)
            print("✅ INQUIRY COMPLETED SUCCESSFULLY")
            print("=" * 80)
            
            return {
                'status': 'success',
                'message': f'Found {member_count} members',
                'member_count': member_count,
                'group_id': group_id,
                'indicators': indicators,
                'members': members
            }
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print("\n" + "=" * 80)
            print("❌ ERROR IN CONDITION INQUIRY")
            print("=" * 80)
            print(error_trace)
            print("=" * 80)
            
            return {
                'status': 'error',
                'message': str(e),
                'member_count': 0,
                'indicators': {
                    'number_of_members': '0 people',
                    'number_of_times_builtin': '0 times',
                    'total_sales': '0 won',
                    'payment_green_fee': '0 won',
                    'open_green_fee': '0 won',
                    'average_discount_rate': '0%'
                },
                'members': []
            }

    @http.route('/golfzon/member_group/get_members', type='json', auth='user')
    def get_members(self, group_id=None, offset=0, limit=10, **kwargs) -> Dict[str, Any]:
        """
        Get member list with CORRECT data mapping and pagination
        - name from golf_group_member.group_member_name
        - entry_date from members_members.entry_date
        - nation_scd from visit_customers.nation_scd
        """
        try:
            print("=" * 80)
            print(f"🔍 GET MEMBERS REQUEST - Group ID: {group_id}, Offset: {offset}, Limit: {limit}")
            print("=" * 80)
            
            # ✅ FIXED: Proper JOIN to get all required fields
            query = """
                SELECT DISTINCT
                    mm.member_no,
                    COALESCE(gm.group_member_name,  mm.member_no) as member_name,
                    mm.entry_date,
                    COALESCE(vc.mobile_phone, gm.mobile_phone, '') as mobile_phone,
                    COALESCE(gm.email, '') as email,
                    COALESCE(vc.nation_scd, '') as nation_scd,
                    mm.person_code,
                    COUNT(DISTINCT vc.customer_id) as visit_count,
                    MAX(vc.visit_date) as last_visit_date
                FROM 
                    members_members mm
                LEFT JOIN 
                    golf_group_member gm ON mm.person_code = gm.person_code
                LEFT JOIN 
                    visit_customers vc ON mm.person_code = vc.person_code
                WHERE 
                    mm.deleted_at IS NULL
            """
            
            params = []
            
            # Filter by group_id if provided
            if group_id:
                query += " AND gm.group_id = %s"
                params.append(int(group_id))
            
            # Add GROUP BY
            query += """
                GROUP BY 
                    mm.member_no,
                    gm.group_member_name,
                    
                    mm.entry_date,
                    vc.mobile_phone,
                    gm.mobile_phone,
                    gm.email,
                    vc.nation_scd,
                    mm.person_code
                ORDER BY mm.entry_date DESC
                LIMIT %s OFFSET %s
            """
            
            params.extend([limit, offset])
            
            print(f"\n📊 SQL QUERY:")
            print(query)
            print(f"\n📦 PARAMS: {params}")
            
            # Execute query
            request.cr.execute(query, tuple(params))
            member_records = request.cr.dictfetchall()
            
            print(f"\n✅ Found {len(member_records)} members")
            
            # Get total count for pagination
            count_query = """
                SELECT COUNT(DISTINCT mm.person_code)
                FROM members_members mm
                LEFT JOIN golf_group_member gm ON mm.person_code = gm.person_code
                WHERE mm.deleted_at IS NULL
            """
            
            count_params = []
            if group_id:
                count_query += " AND gm.group_id = %s"
                count_params.append(int(group_id))
            
            request.cr.execute(count_query, tuple(count_params))
            total_count = request.cr.fetchone()[0] or 0
            
            # Format member list
            members = []
            for member in member_records:
                # Map nation_scd to residence
                residence = ''
                nation_scd = member.get('nation_scd', '')
                if nation_scd:
                    nation_lower = str(nation_scd).lower()
                    if 'seoul' in nation_lower or '서울' in nation_lower:
                        residence = 'seoul'
                    elif 'busan' in nation_lower or '부산' in nation_lower:
                        residence = 'busan'
                    elif 'incheon' in nation_lower or '인천' in nation_lower:
                        residence = 'incheon'
                    else:
                        residence = nation_scd  # Show original if not matched
                
                # Parse entry_date (format: YYYYMMDD string)
                entry_date_str = member.get('entry_date', '')
                formatted_entry_date = ''
                if entry_date_str and len(str(entry_date_str)) == 8:
                    try:
                        entry_date_obj = datetime.strptime(str(entry_date_str), '%Y%m%d')
                        formatted_entry_date = entry_date_obj.strftime('%B %d, %Y')
                    except:
                        pass
                
                # Format last visit date
                last_visit = ''
                if member.get('last_visit_date'):
                    try:
                        last_visit = member['last_visit_date'].strftime('%B %d, %Y')
                    except:
                        pass
                
                members.append({
                    'membership_number': member.get('member_no', ''),
                    'name': member.get('member_name', ''),  # ✅ Now correctly populated
                    'date_of_joining': formatted_entry_date,  # ✅ Now correctly formatted
                    'contact': member.get('mobile_phone', ''),
                    'email': member.get('email', ''),
                    'residence': residence,  # ✅ Now correctly mapped
                    'number_of_times_builtin': str(member.get('visit_count', 0) or 0),
                    'recent_interior_date': last_visit
                })
            
            has_more = (offset + limit) < total_count
            
            print("\n" + "=" * 80)
            print(f"✅ GET MEMBERS COMPLETED - Returned {len(members)}/{total_count} members")
            print("=" * 80)
            
            return {
                'status': 'success',
                'data': members,
                'count': len(members),
                'total': total_count,
                'has_more': has_more,
                'offset': offset,
                'limit': limit
            }
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print("\n" + "=" * 80)
            print("❌ ERROR IN GET MEMBERS")
            print("=" * 80)
            print(error_trace)
            print("=" * 80)
            
            return {
                'status': 'error',
                'message': str(e),
                'data': [],
                'count': 0,
                'total': 0,
                'has_more': False
            }

    def _calculate_key_indicators(self, member_records: List[Dict]) -> Dict[str, Any]:
        """
        Calculate key performance indicators from member data
        """
        try:
            member_count = len(member_records)
            
            # Get usage/transaction data for additional metrics
            person_codes = [m['person_code'] for m in member_records]
            
            if not person_codes:
                return {
                    'number_of_members': 0,
                    'number_of_times_builtin': 0,
                    'total_sales': 0,
                    'payment_green_fee': 0,
                    'open_green_fee': 0,
                    'average_discount_rate': 0
                }
            
            # ✅ Query usage statistics (adjust table names as per your schema)
            usage_query = """
                SELECT 
                    COUNT(*) as usage_count,
                    COALESCE(SUM(total_amount), 0) as total_sales,
                    COALESCE(SUM(CASE WHEN fee_type = 'green_fee' THEN amount ELSE 0 END), 0) as green_fee_payment,
                    COALESCE(SUM(CASE WHEN fee_type = 'open_green_fee' THEN amount ELSE 0 END), 0) as open_green_fee,
                    COALESCE(AVG(discount_rate), 0) as avg_discount_rate
                FROM 
                    booking_bookings
                WHERE 
                    person_code IN %s
                    AND deleted_at IS NULL
            """
            
            try:
                request.cr.execute(usage_query, (tuple(person_codes),))
                usage_data = request.cr.dictfetchone()
            except Exception as e:
                print(f"⚠️ Usage query failed: {e}")
                usage_data = {
                    'usage_count': 0,
                    'total_sales': 0,
                    'green_fee_payment': 0,
                    'open_green_fee': 0,
                    'avg_discount_rate': 0
                }
            
            return {
                'number_of_members': f"{member_count:,} people",
                'number_of_times_builtin': f"{usage_data['usage_count']:,} times",
                'total_sales': f"{int(usage_data['total_sales']):,} won",
                'payment_green_fee': f"{int(usage_data['green_fee_payment']):,} won",
                'open_green_fee': f"{int(usage_data['open_green_fee']):,} won",
                'average_discount_rate': f"{float(usage_data['avg_discount_rate']):.1f}%"
            }
            
        except Exception as e:
            print(f"❌ Error calculating indicators: {e}")
            return {
                'number_of_members': '0 people',
                'number_of_times_builtin': '0 times',
                'total_sales': '0 won',
                'payment_green_fee': '0 won',
                'open_green_fee': '0 won',
                'average_discount_rate': '0%'
            }
    
    def _format_member_list(self, member_records: List[Dict]) -> List[Dict]:
        """
        Format member list for display
        """
        formatted_list = []
        
        for member in member_records:
            # Get usage count for each member
            usage_count_query = """
                SELECT COUNT(*) as count 
                FROM booking_bookings 
                WHERE person_code = %s AND deleted_at IS NULL
            """
            
            try:
                request.cr.execute(usage_count_query, (member['person_code'],))
                usage_result = request.cr.fetchone()
                usage_count = usage_result[0] if usage_result else 0
            except:
                usage_count = 0
            
            # Get most recent usage date
            recent_date_query = """
                SELECT MAX(booking_date) as recent_date 
                FROM booking_bookings 
                WHERE person_code = %s AND deleted_at IS NULL
            """
            
            try:
                request.cr.execute(recent_date_query, (member['person_code'],))
                recent_result = request.cr.fetchone()
                recent_date = recent_result[0] if recent_result and recent_result[0] else member['updated_at']
            except:
                recent_date = member['updated_at']
            
            # Format address for residence
            residence = 'seoul'  # Default
            if member.get('home_addr'):
                if '서울' in member['home_addr'] or 'Seoul' in member['home_addr']:
                    residence = 'seoul'
                elif '부산' in member['home_addr'] or 'Busan' in member['home_addr']:
                    residence = 'busan'
                elif '인천' in member['home_addr'] or 'Incheon' in member['home_addr']:
                    residence = 'incheon'
            
            # Safely format entry_date
            entry_date = member.get('entry_date')
            if entry_date and hasattr(entry_date, 'strftime'):
                date_of_joining = entry_date.strftime('%B %d, %Y')
            else:
                date_of_joining = 'N/A'

            # Safely format recent_date (which may be None or already a string)
            if recent_date and hasattr(recent_date, 'strftime'):
                recent_interior_date = recent_date.strftime('%B %d, %Y')
            else:
                recent_interior_date = 'N/A'

            formatted_list.append({
                'membership_number': member.get('member_no', 'N/A'),
                'name': member.get('member_name', 'N/A'),
                'date_of_joining': date_of_joining,
                'contact': member.get('mobile_phone', 'N/A'),
                'email': member.get('email', 'N/A'),
                'residence': residence,
                'number_of_times_builtin': str(usage_count),
                'recent_interior_date': recent_interior_date
            })
        
        return formatted_list
    
    def _create_member_group(self, group_title: str, member_records: List[Dict]) -> int:
        """
        Create member group in database
        """
        try:
            GroupInfo = request.env['golf.group.info'].sudo()
            
            new_group = GroupInfo.create({
                'group_name': group_title,
                'member_count': len(member_records),
                'group_scd': 'condition',
                'state_scd': 'active',
                'created_at': datetime.now()
            })
            
            # Add members to group
            GroupMember = request.env['golf.group.member'].sudo()
            
            for member in member_records:
                GroupMember.create({
                    'group_id': new_group.id,
                    'person_code': member.get('person_code'),
                    'group_member_name': member.get('member_name'),
                    'mobile_phone': member.get('mobile_phone'),
                    'email': member.get('email'),
                    'created_at': datetime.now()
                })
            
            print(f"✅ Created group ID: {new_group.id}")
            return new_group.id
            
        except Exception as e:
            print(f"❌ Error creating group: {e}")
            return 0 