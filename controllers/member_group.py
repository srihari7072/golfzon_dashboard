from odoo import http
from odoo.http import request, Response
import json
import io
import xlsxwriter
from datetime import datetime


class MemberGroupController(http.Controller):
    """
    Controller for Member Group functionality
    Works with golf.group.info, golf.group.details, and golf.group.member models
    """

    @http.route('/golfzon/member_group/search', type='json', auth='user')
    def search_member_groups(self, start_date, end_date, group_name='', **kwargs):
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
                ('created_at', '>=', f"{start_date} 00:00:00"),
                ('created_at', '<=', f"{end_date} 23:59:59"),
            ]
            
            # Add group name filter if provided
            if group_name and group_name.strip():
                domain.append(('group_name', 'ilike', group_name))
            
            # Search for member groups
            GroupInfo = request.env['golf.group.info'].sudo()
            groups = GroupInfo.search(domain, order='created_at desc')
            
            # Format data for frontend
            data = []
            for group in groups:
                # Determine division based on group_scd or state_scd
                division = self._get_division_label(group.group_scd or group.state_scd)
                
                data.append({
                    'id': group.id,
                    'group_id': group.group_id,
                    'division': division,
                    'group_name': group.group_name or 'N/A',
                    'member_count': self._format_number(group.member_count or 0),
                    'creation_date': group.created_at.strftime('%Y.%m.%d') if group.created_at else '',
                    'revision_date': group.updated_at.strftime('%Y.%m.%d') if group.updated_at else '',
                    'group_code': group.group_code or '',
                    'state_scd': group.state_scd or '',
                })
            
            return {
                'status': 'success',
                'data': data,
                'count': len(data)
            }
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print("❌ Error in search_member_groups:", error_trace)
            
            return {
                'status': 'error',
                'message': str(e),
                'data': []
            }

    @http.route('/golfzon/member_group/download_excel', type='http', auth='user', csrf=False)
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
            workbook = xlsxwriter.Workbook(output, {'in_memory': True})
            worksheet = workbook.add_worksheet('Group List')

            # Define formats
            header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#4A90E2',
                'color': 'white',
                'align': 'center',
                'valign': 'vcenter',
                'border': 1,
                'font_size': 12
            })

            cell_format = workbook.add_format({
                'align': 'left',
                'valign': 'vcenter',
                'border': 1,
                'font_size': 11
            })
            
            cell_format_center = workbook.add_format({
                'align': 'center',
                'valign': 'vcenter',
                'border': 1,
                'font_size': 11
            })

            # Write headers
            headers = [
                'Division',
                'Member Group Name',
                'Number of Members',
                'Creation Date',
                'Date of Revision'
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
            GroupInfo = request.env['golf.group.info'].sudo()
            GroupDetails = request.env['golf.group.details'].sudo()
            
            groups = None
            group_name_for_file = 'group_list'
            
            if group_id:
                try:
                    group_id_int = int(group_id)
                    groups = GroupInfo.search([('id', '=', group_id_int)])
                    
                    if not groups:
                        groups = GroupInfo.search([('group_id', '=', group_id_int)])
                    
                    if groups:
                        group_name_for_file = groups[0].group_name or 'group'
                        print(f"✅ Found group: {group_name_for_file}")
                    else:
                        print(f"⚠️ Group {group_id} not found")
                        groups = GroupInfo.search([], order='created_at desc', limit=1)
                        
                except ValueError:
                    groups = GroupInfo.search([('group_code', '=', str(group_id))])
                    if groups:
                        group_name_for_file = groups[0].group_name or 'group'
            else:
                groups = GroupInfo.search([], order='created_at desc', limit=100)
                group_name_for_file = 'all_groups'
            
            if not groups:
                print("❌ No groups found")
                worksheet.merge_range(1, 0, 1, 4, 'No data found', cell_format_center)
            else:
                print(f"✅ Found {len(groups)} group(s) to export")
                
                # Write data rows
                row = 1
                for group in groups:
                    # Get division
                    division_name = '-'
                    if hasattr(group, 'division') and group.division:
                        division_name = str(group.division)
                    
                    # Write row data
                    worksheet.write(row, 0, division_name, cell_format_center)
                    worksheet.write(row, 1, group.group_name or '-', cell_format)
                    worksheet.write(row, 2, str(group.member_count or 0), cell_format_center)
                    worksheet.write(row, 3, 
                        group.created_at.strftime('%Y.%m.%d') if group.created_at else '-',
                        cell_format_center
                    )
                    worksheet.write(row, 4,
                        group.updated_at.strftime('%Y.%m.%d') if group.updated_at else '-',
                        cell_format_center
                    )
                    row += 1

            # Close workbook
            workbook.close()
            output.seek(0)

            # Generate filename with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            # ✅ FIX: Use simple ASCII filename
            filename_ascii = f"member_group_{timestamp}.xlsx"
            
            # ✅ FIX: URL-encode the Korean filename for Content-Disposition
            group_name_clean = "".join(
                c for c in group_name_for_file 
                if c.isalnum() or c in (' ', '-', '_')
            ).strip() or 'group'
            
            filename_utf8 = f"{group_name_clean}_{timestamp}.xlsx"
            filename_encoded = quote(filename_utf8.encode('utf-8'))
            
            print(f"✅ Excel file generated: {filename_utf8}")

            # ✅ FIX: Use RFC 5987 encoding for non-ASCII filenames
            return request.make_response(
                output.getvalue(),
                headers=[
                    ('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
                    ('Content-Disposition', 
                    f"attachment; filename=\"{filename_ascii}\"; filename*=UTF-8''{filename_encoded}"),
                    ('Content-Length', str(len(output.getvalue())))
                ]
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
                headers=[('Content-Type', 'text/plain')],
                status=500
            )


    @http.route('/golfzon/member_group/get_statistics', type='json', auth='user')
    def get_statistics(self, **kwargs):
        """
        Get member group statistics
        
        Returns:
            dict: Statistics data
        """
        try:
            GroupInfo = request.env['golf.group.info'].sudo()
            GroupMember = request.env['golf.group.member'].sudo()
            
            total_groups = GroupInfo.search_count([])
            total_members = GroupMember.search_count([])
            
            # Get groups created this month
            today = datetime.now()
            first_day = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            groups_this_month = GroupInfo.search_count([
                ('created_at', '>=', first_day)
            ])
            
            return {
                'status': 'success',
                'data': {
                    'total_groups': total_groups,
                    'total_members': total_members,
                    'groups_this_month': groups_this_month,
                }
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }

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
            'condition': 'Condition-based generation',
            'register': 'Register member list',
            'manual': 'Manual selection',
        }
        return divisions.get(code, code or 'N/A')

    @http.route('/golfzon/member_group/get_members', type='json', auth='user')
    def get_members(self, group_id=None, **kwargs):
        """
        Get member list for a specific group or all members
        
        Args:
            group_id (int): Optional group ID to filter members
            
        Returns:
            dict: JSON response with member data
        """
        try:
            GroupMember = request.env['golf.group.member'].sudo()
            
            # Build domain
            domain = []
            if group_id:
                domain.append(('group_id', '=', int(group_id)))
            
            # Search members
            members = GroupMember.search(domain, limit=100, order='group_member_id desc')
            
            # Format data
            data = []
            for member in members:
                data.append({
                    'id': member.id,
                    'membership_number': member.person_code or 'N/A',
                    'name': member.group_member_name or '',
                    'join_date': member.created_at.strftime('%B %d, %Y') if member.created_at else '',
                    'contact': member.mobile_phone or '',
                    'email': member.email or '',
                    'residence': 'seoul',  # Add actual field if available
                    'built_in_times': '10',  # Add actual field if available
                    'recent_date': member.updated_at.strftime('%B %d, %Y') if member.updated_at else '',
                })
            
            return {
                'status': 'success',
                'data': data,
                'count': len(data)
            }
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print("❌ Error in get_members:", error_trace)
            
            return {
                'status': 'error',
                'message': str(e),
                'data': []
            }
