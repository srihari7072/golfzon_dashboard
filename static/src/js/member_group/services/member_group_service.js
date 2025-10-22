/** @odoo-module **/

import { rpc } from "@web/core/network/rpc";

export class MemberGroupService {
    constructor(rpcService) {
        this.rpc = rpcService || rpc;
    }

    async searchMemberGroups(startDate, endDate, groupName = '') {
        try {
            console.log('📡 Searching member groups:', { startDate, endDate, groupName });
            
            const response = await this.rpc("/golfzon/member_group/search", {
                start_date: startDate,
                end_date: endDate,
                group_name: groupName,
            });
            
            console.log('✅ Search response:', response);
            return response;
            
        } catch (error) {
            console.error("❌ Error searching member groups:", error);
            return {
                status: 'error',
                message: error.message || 'Unknown error',
                data: []
            };
        }
    }

    async fetchMemberGroups(startDate, endDate, groupName = '') {
        return this.searchMemberGroups(startDate, endDate, groupName);
    }

    async fetchStatistics() {
        try {
            console.log('📊 Fetching statistics...');
            
            const response = await this.rpc("/golfzon/member_group/get_statistics", {});
            
            console.log('📊 Statistics response:', response);
            return response;
            
        } catch (error) {
            console.error("❌ Error fetching statistics:", error);
            return {
                status: 'error',
                message: error.message,
                data: {
                    totalMembers: '0',
                    builtInTimes: '0',
                    totalSales: '0',
                    paymentGreenFee: '0',
                    openGreenFee: '0',
                    avgDiscountRate: '0'
                }
            };
        }
    }

    async fetchMemberList(groupId = null) {
        try {
            console.log('📡 Fetching member list for group:', groupId);
            
            const response = await this.rpc("/golfzon/member_group/get_members", {
                group_id: groupId
            });
            
            console.log('✅ Member list response:', response);
            return response;
            
        } catch (error) {
            console.error("❌ Error fetching member list:", error);
            return {
                status: 'error',
                message: error.message,
                data: []
            };
        }
    }

    async downloadExcel(groupId) {
        try {
            console.log('📥 Downloading Excel for group:', groupId);
            window.location.href = `/golfzon/member_group/download_excel?group_id=${groupId}`;
        } catch (error) {
            console.error("❌ Error downloading Excel:", error);
            throw error;
        }
    }

    async getGroupDetails(groupId) {
        try {
            const response = await this.rpc("/golfzon/member_group/get_group_details", {
                group_id: groupId
            });
            return response;
        } catch (error) {
            console.error("❌ Error fetching group details:", error);
            return {
                status: 'error',
                message: error.message,
                data: null
            };
        }
    }
}
