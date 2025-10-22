/** @odoo-module **/

import { rpc } from "@web/core/network/rpc";

export class MemberService {
    constructor() {
        this.cache = {};
    }

    /**
     * Search members by name or phone number
     * Handles duplicate member names with popup selection
     */
    async searchMembers(searchText, phoneNumber = '') {
        try {
            console.log('🔍 Searching members:', { searchText, phoneNumber });
            
            const response = await rpc('/golfzon/api/member_search', {
                search_text: searchText,
                phone_number: phoneNumber,
            });

            if (response && response.status === 'success') {
                console.log(`✅ Found ${response.members.length} member(s)`);
                return {
                    members: response.members || [],
                    has_duplicates: response.members.length > 1,
                    status: 'success'
                };
            } else {
                console.error('❌ Search error:', response.message);
                return {
                    members: [],
                    has_duplicates: false,
                    status: 'error',
                    message: response.message
                };
            }
        } catch (error) {
            console.error('❌ Exception in searchMembers:', error);
            return {
                members: [],
                has_duplicates: false,
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Fetch detailed member information
     */
    async getMemberDetails(memberId) {
        try {
            console.log('📋 Fetching member details for ID:', memberId);
            
            const response = await rpc('/golfzon/api/member_details', {
                member_id: memberId
            });

            if (response && response.status === 'success') {
                console.log('✅ Member details loaded');
                return response.member;
            } else {
                console.error('❌ Failed to load member details');
                return null;
            }
        } catch (error) {
            console.error('❌ Exception in getMemberDetails:', error);
            return null;
        }
    }

    /**
     * Fetch available member groups for "Add to Group" functionality
     */
    async getAvailableGroups(searchText = '', offset = 0, limit = 10) {
        try {
            const response = await rpc('/golfzon/api/member_groups_available', {
                search_text: searchText,
                offset: offset,
                limit: limit
            });

            if (response && response.status === 'success') {
                return {
                    groups: response.groups || [],
                    total_count: response.total_count || 0,
                    has_more: response.has_more || false
                };
            } else {
                return {
                    groups: [],
                    total_count: 0,
                    has_more: false
                };
            }
        } catch (error) {
            console.error('❌ Error fetching available groups:', error);
            return {
                groups: [],
                total_count: 0,
                has_more: false
            };
        }
    }

    /**
     * Add member to selected groups
     */
    async addMemberToGroups(memberId, groupIds) {
        try {
            console.log('➕ Adding member to groups:', { memberId, groupIds });
            
            const response = await rpc('/golfzon/api/add_member_to_groups', {
                member_id: memberId,
                group_ids: groupIds
            });

            if (response && response.status === 'success') {
                console.log('✅ Member added to groups successfully');
                return {
                    status: 'success',
                    message: response.message,
                    added_count: response.added_count
                };
            } else {
                console.error('❌ Failed to add member to groups');
                return {
                    status: 'error',
                    message: response.message || 'Failed to add member to groups'
                };
            }
        } catch (error) {
            console.error('❌ Exception in addMemberToGroups:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get member memos
     */
    async getMemberMemos(memberId) {
        try {
            const response = await rpc('/golfzon/api/member_memos', {
                member_id: memberId
            });

            if (response && response.status === 'success') {
                return response.memos || [];
            } else {
                return [];
            }
        } catch (error) {
            console.error('❌ Error fetching memos:', error);
            return [];
        }
    }

    /**
     * Save member memo
     */
    async saveMemberMemo(memberId, memoText) {
        try {
            console.log('💾 Saving memo for member:', memberId);
            
            const response = await rpc('/golfzon/api/save_member_memo', {
                member_id: memberId,
                memo_text: memoText
            });

            if (response && response.status === 'success') {
                console.log('✅ Memo saved successfully');
                return {
                    status: 'success',
                    message: response.message
                };
            } else {
                return {
                    status: 'error',
                    message: response.message || 'Failed to save memo'
                };
            }
        } catch (error) {
            console.error('❌ Exception in saveMemberMemo:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Format date with weekday
     */
    formatDateWithWeekday(dateString, locale = 'ko-KR') {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            weekday: 'short'
        };
        
        return date.toLocaleDateString(locale, options);
    }

    /**
     * Calculate penalty status
     */
    calculatePenaltyStatus(startDate, endDate) {
        if (!startDate || !endDate) return 'None';
        
        const today = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (today >= start && today <= end) {
            return `Penalty(${startDate} ~ ${endDate})`;
        } else {
            return 'None';
        }
    }

    /**
     * Get member type label based on activity
     */
    getMemberTypeLabel(lastVisitDate, visitCount) {
        // This would typically be calculated based on business logic
        if (!lastVisitDate) return 'New Member';
        
        const daysSinceVisit = Math.floor((new Date() - new Date(lastVisitDate)) / (1000 * 60 * 60 * 24));
        
        if (daysSinceVisit <= 30 && visitCount >= 10) {
            return 'VIP Member';
        } else if (daysSinceVisit <= 30) {
            return 'Active Member';
        } else if (daysSinceVisit <= 90) {
            return 'Regular Member';
        } else {
            return 'Inactive Member';
        }
    }

    /**
     * Clear service cache
     */
    clearCache() {
        this.cache = {};
        console.log('🗑️ Member service cache cleared');
    }
}
