/** @odoo-module **/

import { Component, useState, onMounted, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { _t } from "@web/core/l10n/translation";
import { MemberGroupService } from "./services/member_group_service";
import { DateRangeUtils } from "./utils/date_range_utils";
import { DashboardLoader } from "../utils/dashboard_loader";

class MemberGroupView extends Component {
    static template = "golfzon_dashboard.MemberGroupView";

    setup() {
        this._t = _t;
        this.menuDrawer = useRef("menuDrawer");
        this.memberGroupService = new MemberGroupService();
        const defaultDates = DateRangeUtils.getDefaultDateRange();

        this.state = useState({
            activeMenuItem: 'membergroup',
            currentLanguage: null,
            userName: "username",
            drawerOpen: false,
            currentDate: null,

            // Member Group specific state
            searchForm: {
                startDate: defaultDates.startDate,
                endDate: defaultDates.endDate,
                groupName: '',
            },

            memberGroups: [],
            isLoading: false,
            sortBy: 'creation_date',
            sortOrder: 'desc',

            statistics: {
                totalMembers: '656,351',
                builtInTimes: '4,906,127',
                totalSales: '10,000,000',
                paymentGreenFee: '116,443',
                openGreenFee: '132,781',
                avgDiscountRate: '12.3'
            },

            memberList: [],
            isLoadingMembers: false,
            memberSortBy: 'membership_number',
            memberSortOrder: 'asc',

            groupList: [],
        });

        onMounted(() => this.onMounted());
    }

    async onMounted() {
        console.log("🚀 Member Group View mounted");
        await this.loadCurrentLanguage();
        await this.loadCurrentDate();
        await this.searchMemberGroups();
        await this.loadStatistics();
        await this.loadMemberList();
        document.addEventListener("click", this.handleOutsideDrawer.bind(this));
    }

    // ✅ FIXED: Complete performSearch method
    async performSearch() {
        console.log('🔍 Performing search with:', this.state.searchForm);

        try {
            this.state.isLoading = true;
            const { startDate, endDate, groupName } = this.state.searchForm;

            // Validate dates
            if (!startDate || !endDate) {
                alert('Please select both start and end dates');
                this.state.isLoading = false;
                return;
            }

            if (new Date(startDate) > new Date(endDate)) {
                alert('Start date must be before end date');
                this.state.isLoading = false;
                return;
            }

            // Call backend search
            const response = await this.memberGroupService.searchMemberGroups(
                startDate,
                endDate,
                groupName
            );

            console.log('✅ Search results:', response);

            if (response.status === 'success') {
                this.state.memberGroups = response.data || [];

                if (this.state.memberGroups.length === 0) {
                    alert('No member groups found for the selected criteria');
                }
            } else {
                console.error('❌ Search failed:', response.message);
                alert('Search failed: ' + (response.message || 'Unknown error'));
                this.state.memberGroups = [];
            }

        } catch (error) {
            console.error('❌ Error performing search:', error);
            alert('An error occurred while searching. Please try again.');
            this.state.memberGroups = [];
        } finally {
            this.state.isLoading = false;
        }
    }

    // Search member groups
    async searchMemberGroups() {
        try {
            this.state.isLoading = true;
            const { startDate, endDate, groupName } = this.state.searchForm;

            const response = await this.memberGroupService.searchMemberGroups(
                startDate,
                endDate,
                groupName
            );

            if (response.status === 'success') {
                this.state.memberGroups = response.data || [];
                console.log(`✅ Loaded ${this.state.memberGroups.length} member groups`);
            } else {
                this.state.memberGroups = [];
            }
        } catch (error) {
            console.error('Error searching member groups:', error);
            this.state.memberGroups = [];
        } finally {
            this.state.isLoading = false;
        }
    }

    // Handle search button click
    onSearchClick() {
        console.log('🔍 Searching member groups...', this.state.searchForm);
        this.performSearch();
    }

    // Handle input changes
    onInputChange(field, event) {
        this.state.searchForm[field] = event.target.value;
    }

    // Sort table
    sortTable(column) {
        if (this.state.sortBy === column) {
            this.state.sortOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.sortBy = column;
            this.state.sortOrder = 'asc';
        }

        this.state.memberGroups.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];
            if (this.state.sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    // Download Excel file for a specific group
    async downloadExcel(groupId, groupName, event) {
        console.log('📥 Downloading Excel - Group ID:', groupId, 'Name:', groupName);

        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        try {
            const button = event ? event.target.closest('button') : null;
            let originalHTML = '↓';

            if (button) {
                originalHTML = button.innerHTML;
                button.innerHTML = '⏳';
                button.disabled = true;
            }

            const url = `/golfzon/member_group/download_excel?group_id=${groupId}`;
            console.log('📥 Download URL:', url);

            window.location.href = url;

            setTimeout(() => {
                if (button) {
                    button.innerHTML = originalHTML;
                    button.disabled = false;
                }
            }, 2000);

            console.log('✅ Excel download initiated');

        } catch (error) {
            console.error('❌ Error downloading Excel:', error);
            alert('Failed to download Excel file. Please try again.');

            if (event && event.target) {
                const button = event.target.closest('button');
                if (button) {
                    button.innerHTML = '↓';
                    button.disabled = false;
                }
            }
        }
    }

    // Load statistics data
    async loadStatistics() {
        try {
            const response = await this.memberGroupService.fetchStatistics();
            if (response.status === 'success') {
                this.state.statistics = response.data;
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    // Load current language
    async loadCurrentLanguage() {
        try {
            const response = await fetch('/golfzon/api/current_language');
            const data = await response.json();
            this.state.currentLanguage = data.status === 'success' ? data.current_lang : 'ko_KR';
        } catch (error) {
            this.state.currentLanguage = 'ko_KR';
        }
    }

    // Load member list for selected group
    async loadMemberList(groupId = null) {
        this.state.isLoadingMembers = true;
        try {
            const response = await this.memberGroupService.fetchMemberList(groupId);
            if (response.status === 'success') {
                this.state.memberList = response.data || [];
                console.log(`✅ Loaded ${this.state.memberList.length} members`);
            } else {
                this.state.memberList = [];
            }
        } catch (error) {
            console.error('Error loading member list:', error);
            this.state.memberList = [];
        } finally {
            this.state.isLoadingMembers = false;
        }
    }

    // Sort member table
    sortMemberTable(column) {
        if (this.state.memberSortBy === column) {
            this.state.memberSortOrder = this.state.memberSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.memberSortBy = column;
            this.state.memberSortOrder = 'asc';
        }

        this.state.memberList.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];
            if (this.state.memberSortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    async loadCurrentDate() {
        try {
            const response = await fetch('/golfzon/api/current_date');
            const data = await response.json();
            this.state.currentDate = data.status === 'success' ? data.formatted_date : this.getKoreanDateFallback();
        } catch (error) {
            this.state.currentDate = this.getKoreanDateFallback();
        }
    }

    getKoreanDateFallback() {
        const date = new Date();
        const koreanDays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        const koreanMonths = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        return `${date.getFullYear()}년 ${koreanMonths[date.getMonth()]} ${date.getDate()}일 ${koreanDays[date.getDay()]}`;
    }

    async switchLanguage(lang) {
        try {
            this.state.currentLanguage = lang;
            const response = await fetch(`/golfzon/dashboard/set_lang?lang=${lang}`);
            if (response.ok) window.location.reload();
        } catch (error) {
            console.error('Error switching language:', error);
        }
    }

    isKorean() {
        return this.state.currentLanguage && this.state.currentLanguage.includes('ko');
    }

    isEnglish() {
        return this.state.currentLanguage && this.state.currentLanguage.includes('en');
    }

    handleMenuItemClick(menuItem, event) {
        event.preventDefault();
        event.stopPropagation();
        this.state.activeMenuItem = menuItem;
        this.state.drawerOpen = false;
        if (this.menuDrawer.el) this.menuDrawer.el.classList.remove("open");
    }

    navigateToDashboard(event) {
        event.preventDefault();
        event.stopPropagation();
        this.state.activeMenuItem = 'dashboard';
        this.state.drawerOpen = false;
        if (this.menuDrawer.el) this.menuDrawer.el.classList.remove("open");
        this.env.services.action.doAction({
            type: 'ir.actions.client',
            tag: 'golfzon.dashboard',
            target: 'fullscreen',
        });
    }

    navigateToMemberGroup(event) {
        event.preventDefault();
        event.stopPropagation();
        this.state.activeMenuItem = 'membergroup';
        this.state.drawerOpen = false;
        if (this.menuDrawer.el) this.menuDrawer.el.classList.remove("open");
    }

    toggleDrawer(ev) {
        ev.stopPropagation();
        this.state.drawerOpen = !this.state.drawerOpen;
        if (this.menuDrawer.el) {
            this.menuDrawer.el.classList.toggle("open", this.state.drawerOpen);
        }
    }

    handleOutsideDrawer(ev) {
        if (this.state.drawerOpen && this.menuDrawer.el &&
            !ev.target.closest(".sidebar") && !ev.target.closest(".menu-btn")) {
            this.state.drawerOpen = false;
            this.menuDrawer.el.classList.remove("open");
        }
    }

    logout() {
        window.location.href = "/web/session/logout";
    }

    willDestroy() {
        document.removeEventListener("click", this.handleOutsideDrawer.bind(this));
    }
}

MemberGroupView.components = { DashboardLoader };
registry.category("actions").add("golfzon.member_group", MemberGroupView);
export default MemberGroupView;
