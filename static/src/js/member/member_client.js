/** @odoo-module **/

import { Component, useState, onMounted, useRef, onWillUnmount } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";
import { DashboardLoader } from "../utils/dashboard_loader";
import { MemberService } from "./services/member_service";

class MemberView extends Component {
    static template = "golfzon_dashboard.MemberView";
    static components = { DashboardLoader };

    setup() {
        this._t = _t;
        this.menuDrawer = useRef("menuDrawer");
        this.memberService = new MemberService();
        this.notification = useService("notification");
        this.action = useService("action");

        this.state = useState({
            // UI State
            isLoading: false,
            isSearching: false,
            isSavingMemo: false,
            activeMenuItem: 'member',
            currentLanguage: null,
            userName: "username",
            drawerOpen: false,
            currentDate: null,

            // Search Form
            searchForm: {
                memberName: '',
                phoneNumber: ''
            },

            // Selected Member Data
            selectedMember: null,

            // Duplicate Members (Section 1.2)
            showMemberListPopup: false,
            duplicateMembers: [],
            selectedDuplicateMemberId: null,

            // Add to Group Modal (Section 1.3)
            showAddToGroupModal: false,
            groupSearchText: '',
            availableGroups: [],
            selectedGroupIds: [],
            hasMoreGroups: false,
            groupsOffset: 0,

            // Memo Modal (Section 1.3)
            showMemoModal: false,
            memoText: '',
            existingMemos: []
        });

        onMounted(() => this.onMounted());
        onWillUnmount(() => this.onWillUnmount());
    }

    async onMounted() {
        console.log("🚀 Member View mounted");

        try {
            await this.loadCurrentLanguage();
            await this.loadCurrentDate();
        } catch (error) {
            console.error("❌ Error initializing member screen:", error);
        }

        if (document) {
            document.addEventListener("click", this.handleOutsideDrawer.bind(this));
        }
    }

    // ============================================
    // SEARCH FUNCTIONALITY (Section A)
    // ============================================

    async onSearchClick() {
        const { memberName, phoneNumber } = this.state.searchForm;

        if (!memberName && !phoneNumber) {
            this.notification.add(_t("Please enter member name or phone number"), {
                type: "warning"
            });
            return;
        }

        await this.performSearch(memberName, phoneNumber);
    }

    async onEnterSearch(ev) {
        if (ev.key === 'Enter') {
            await this.onSearchClick();
        }
    }

    async performSearch(memberName, phoneNumber) {
        this.state.isSearching = true;

        try {
            const result = await this.memberService.searchMembers(memberName, phoneNumber);

            if (result.status === 'success') {
                if (result.members.length === 0) {
                    this.notification.add(_t("No members found"), {
                        type: "info"
                    });
                    this.state.selectedMember = null;
                } else if (result.has_duplicates) {
                    // Show duplicate member selection popup (Section 1.2)
                    this.showDuplicateMembersPopup(result.members);
                } else {
                    // Single member found - load details
                    await this.loadMemberDetails(result.members[0].id);
                }
            } else {
                this.notification.add(_t("Search failed: ") + result.message, {
                    type: "danger"
                });
            }
        } catch (error) {
            console.error("❌ Search error:", error);
            this.notification.add(_t("An error occurred during search"), {
                type: "danger"
            });
        } finally {
            this.state.isSearching = false;
        }
    }

    // ============================================
    // MEMBER DETAILS (Section B)
    // ============================================

    async loadMemberDetails(memberId) {
        this.state.isLoading = true;

        try {
            const member = await this.memberService.getMemberDetails(memberId);

            if (member) {
                // Format data for display
                member.last_visit_date_formatted = this.memberService.formatDateWithWeekday(
                    member.last_visit_date,
                    this.state.currentLanguage
                );
                member.next_scheduled_visit_formatted = this.memberService.formatDateWithWeekday(
                    member.next_scheduled_visit,
                    this.state.currentLanguage
                );
                member.penalty_status = this.memberService.calculatePenaltyStatus(
                    member.penalty_start_date,
                    member.penalty_end_date
                );
                member.has_active_penalty = member.penalty_status !== 'None';
                member.member_type_label = this.memberService.getMemberTypeLabel(
                    member.last_visit_date,
                    member.visit_count
                );

                this.state.selectedMember = member;
                console.log("✅ Member details loaded:", member.name);
            } else {
                this.notification.add(_t("Failed to load member details"), {
                    type: "danger"
                });
            }
        } catch (error) {
            console.error("❌ Error loading member details:", error);
        } finally {
            this.state.isLoading = false;
        }
    }

    // ============================================
    // DUPLICATE MEMBERS POPUP (Section 1.2)
    // ============================================

    showDuplicateMembersPopup(members) {
        this.state.duplicateMembers = members;
        this.state.selectedDuplicateMemberId = null;
        this.state.showMemberListPopup = true;
    }

    selectDuplicateMember(memberId) {
        this.state.selectedDuplicateMemberId = memberId;
    }

    async confirmMemberSelection() {
        if (!this.state.selectedDuplicateMemberId) {
            this.notification.add(_t("Please select a member"), {
                type: "warning"
            });
            return;
        }

        this.state.showMemberListPopup = false;
        await this.loadMemberDetails(this.state.selectedDuplicateMemberId);
    }

    closeMemberListPopup() {
        this.state.showMemberListPopup = false;
        this.state.duplicateMembers = [];
        this.state.selectedDuplicateMemberId = null;
    }

    // ============================================
    // ADD TO GROUP MODAL (Section 1.3 & D)
    // ============================================

    async openAddToGroupModal() {
        if (!this.state.selectedMember) {
            this.notification.add(_t("Please select a member first"), {
                type: "warning"
            });
            return;
        }

        this.state.showAddToGroupModal = true;
        this.state.groupSearchText = '';
        this.state.selectedGroupIds = [];
        this.state.groupsOffset = 0;

        await this.loadAvailableGroups();
    }

    async loadAvailableGroups(append = false) {
        try {
            const result = await this.memberService.getAvailableGroups(
                this.state.groupSearchText,
                this.state.groupsOffset,
                10
            );

            if (append) {
                this.state.availableGroups = [...this.state.availableGroups, ...result.groups];
            } else {
                this.state.availableGroups = result.groups;
            }

            this.state.hasMoreGroups = result.has_more;
            console.log(`✅ Loaded ${result.groups.length} groups`);
        } catch (error) {
            console.error("❌ Error loading groups:", error);
        }
    }

    async searchGroups() {
        this.state.groupsOffset = 0;
        await this.loadAvailableGroups(false);
    }

    async loadMoreGroups() {
        this.state.groupsOffset += 10;
        await this.loadAvailableGroups(true);
    }

    onGroupSearchChange() {
        // Debounce search if needed
    }

    toggleGroupSelection(groupId) {
        const index = this.state.selectedGroupIds.indexOf(groupId);
        if (index > -1) {
            this.state.selectedGroupIds.splice(index, 1);
        } else {
            this.state.selectedGroupIds.push(groupId);
        }
    }

    async confirmAddToGroups() {
        if (this.state.selectedGroupIds.length === 0) {
            this.notification.add(_t("Please select at least one group"), {
                type: "warning"
            });
            return;
        }

        try {
            const result = await this.memberService.addMemberToGroups(
                this.state.selectedMember.id,
                this.state.selectedGroupIds
            );

            if (result.status === 'success') {
                this.notification.add(
                    _t("Member has been added to ") + result.added_count + _t(" group(s)"),
                    { type: "success" }
                );
                this.closeAddToGroupModal();
            } else {
                this.notification.add(_t("Failed to add member to groups: ") + result.message, {
                    type: "danger"
                });
            }
        } catch (error) {
            console.error("❌ Error adding to groups:", error);
            this.notification.add(_t("An error occurred"), {
                type: "danger"
            });
        }
    }

    closeAddToGroupModal() {
        this.state.showAddToGroupModal = false;
        this.state.availableGroups = [];
        this.state.selectedGroupIds = [];
    }

    // ============================================
    // MEMO MODAL (Section 1.3 & E)
    // ============================================

    async openMemoModal() {
        if (!this.state.selectedMember) {
            this.notification.add(_t("Please select a member first"), {
                type: "warning"
            });
            return;
        }

        this.state.showMemoModal = true;
        this.state.memoText = '';

        // Load existing memos
        try {
            const memos = await this.memberService.getMemberMemos(this.state.selectedMember.id);
            this.state.existingMemos = memos;
        } catch (error) {
            console.error("❌ Error loading memos:", error);
        }
    }

    async saveMemo() {
        if (!this.state.memoText.trim()) {
            this.notification.add(_t("Please enter memo text"), {
                type: "warning"
            });
            return;
        }

        this.state.isSavingMemo = true;

        try {
            const result = await this.memberService.saveMemberMemo(
                this.state.selectedMember.id,
                this.state.memoText
            );

            if (result.status === 'success') {
                this.notification.add(_t("Memo saved successfully"), {
                    type: "success"
                });
                this.state.memoText = '';

                // Refresh memos
                const memos = await this.memberService.getMemberMemos(this.state.selectedMember.id);
                this.state.existingMemos = memos;
            } else {
                this.notification.add(_t("Failed to save memo: ") + result.message, {
                    type: "danger"
                });
            }
        } catch (error) {
            console.error("❌ Error saving memo:", error);
            this.notification.add(_t("An error occurred"), {
                type: "danger"
            });
        } finally {
            this.state.isSavingMemo = false;
        }
    }

    closeMemoModal() {
        this.state.showMemoModal = false;
        this.state.memoText = '';
        this.state.existingMemos = [];
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    async loadCurrentLanguage() {
        try {
            const response = await fetch('/golfzon/api/current_language');
            const data = await response.json();
            this.state.currentLanguage = data.status === 'success' ? data.current_lang : 'ko_KR';
        } catch (error) {
            console.error('Error loading language:', error);
            this.state.currentLanguage = 'ko_KR';
        }
    }

    async loadCurrentDate() {
        try {
            const response = await fetch('/golfzon/api/current_date');
            const data = await response.json();
            this.state.currentDate = data.status === 'success' ? data.formatted_date : this.getKoreanDateFallback();
        } catch (error) {
            console.error('Error loading date:', error);
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

    // Navigation methods
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
        this.action.doAction({
            type: 'ir.actions.client',
            tag: 'golfzon.dashboard',
            target: 'main',
        });
    }

    navigateToMemberGroup(event) {
        event.preventDefault();
        event.stopPropagation();
        this.action.doAction({
            type: 'ir.actions.client',
            tag: 'golfzon.member_group',
            target: 'main',
        });
    }

    navigateToMember(event) {
        event.preventDefault();
        event.stopPropagation();
        console.log('📍 Already on Member screen');
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

    onWillUnmount() {
        document.removeEventListener("click", this.handleOutsideDrawer.bind(this));
    }
}

registry.category("actions").add("golfzon.member", MemberView);

export default MemberView;
