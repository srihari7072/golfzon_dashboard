/** @odoo-module **/

import { Component, useState, onMounted, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { _t } from "@web/core/l10n/translation";
import { rpc } from "@web/core/network/rpc";
import { MemberGroupService } from "./services/member_group_service";
import { DateRangeUtils } from "./utils/date_range_utils";
import { DashboardLoader } from "../utils/dashboard_loader";

class MemberGroupView extends Component {
    static template = "golfzon_dashboard.MemberGroupView";

    setup() {
        this.rpc = rpc;
        this._t = _t;
        this.menuDrawer = useRef("menuDrawer");
        this.memberGroupService = new MemberGroupService();
        const defaultDates = DateRangeUtils.getDefaultDateRange();
        this.fileInput = useRef("fileInput");

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
            memberOffset: 0,
            memberDisplayLimit: 10,
            memberTotal: 0,
            hasMoreMembers: false,
            selectedGroupId: null,

            groupList: [],
            isSubmittingInquiry: false,

            conditionForm: {
                groupTitle: '',

                // Membership Conditions
                gender: 'all',
                ageGroup: 'unselected',
                marketingConsent: '',
                membershipType: 'member',
                residence1: '',
                residence2: '',
                residence3: '',
                membershipStartDate: '',
                membershipEndDate: '',
                builtInStartDate: '',
                builtInEndDate: '',

                // Subdivision Conditions
                daysOfUse: 'entire',
                usageTimeZone: 'entire',
                inflowChannel: 'entire',
                organization: 'entire',
                numberOfRounds: 'entire',
                rainyRound: 'entire',
                selfRounding: 'entire',
                useGreenFee: 'entire'
            },

            // Inquiry Results State
            inquiryResults: {
                indicators: {
                    number_of_members: '0 people',
                    number_of_times_builtin: '0 times',
                    total_sales: '0 won',
                    payment_green_fee: '0 won',
                    open_green_fee: '0 won',
                    average_discount_rate: '0%'
                },
                members: [],
                group_id: null
            },
            showInquiryResults: false,

            // Register Form State
            registerForm: {
                groupTitle: '',
                file: null,
                fileName: '',
                uploadStatus: '',
                statusMessage: ''
            },
            isUploading: false
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

    // Add this method to load more members in inquiry results
    loadMoreInquiryMembers() {
        console.log('📊 Loading more inquiry members');
        const increment = 10;
        const currentLimit = this.state.memberDisplayLimit || 10;
        const totalMembers = this.state.inquiryResults.members.length;

        if (currentLimit < totalMembers) {
            this.state.memberDisplayLimit = Math.min(currentLimit + increment, totalMembers);
            console.log(`✅ Displaying ${this.state.memberDisplayLimit} of ${totalMembers} members`);
        }
    }

    // ✅ NEW: Load member list with pagination
    async loadMemberList(groupId = null, loadMore = false) {
        try {
            // If not loading more, reset pagination
            if (!loadMore) {
                this.state.memberOffset = 0;
                this.state.memberList = [];
                this.state.selectedGroupId = groupId;
            }

            this.state.isLoadingMembers = true;

            console.log(`📡 Fetching member list for group: ${groupId}, offset: ${this.state.memberOffset}`);

            const response = await this.rpc('/golfzon/member_group/get_members', {
                group_id: groupId,
                offset: this.state.memberOffset,
                limit: this.state.memberLimit
            });

            console.log('✅ Member list response:', response);

            if (response.status === 'success') {
                // Append new members if loading more, otherwise replace
                if (loadMore) {
                    this.state.memberList = [...this.state.memberList, ...response.data];
                } else {
                    this.state.memberList = response.data;
                }

                this.state.memberTotal = response.total;
                this.state.hasMoreMembers = response.has_more;
                this.state.memberOffset += response.data.length;

                console.log(`✅ Loaded ${this.state.memberList.length}/${this.state.memberTotal} members`);
            } else {
                console.error('Failed to load members:', response.message);
                this.state.memberList = [];
            }
        } catch (error) {
            console.error('Error loading member list:', error);
            this.state.memberList = [];
        } finally {
            this.state.isLoadingMembers = false;
        }
    }

    // ✅ NEW: Load more members
    async loadMoreMembers() {
        if (!this.state.hasMoreMembers || this.state.isLoadingMembers) {
            return;
        }

        await this.loadMemberList(this.state.selectedGroupId, true);
    }

    // ✅ UPDATE: When clicking on a group, load its members
    async selectGroup(groupId) {
        console.log('Selected group:', groupId);
        await this.loadMemberList(groupId, false);

        // Scroll to member list
        setTimeout(() => {
            const memberSection = document.querySelector('.member-list-section');
            if (memberSection) {
                memberSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
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

    triggerFileSelect() {
        console.log('📁 Triggering file select');

        // Check if fileInput ref exists
        if (this.fileInput && this.fileInput.el) {
            this.fileInput.el.click();
            console.log('✅ File input clicked');
        } else {
            console.error('❌ File input ref not found');

            // Fallback: Try to find by ID
            const fileInput = document.getElementById('member-file-input');
            if (fileInput) {
                fileInput.click();
                console.log('✅ File input found by ID and clicked');
            } else {
                console.error('❌ File input element not found in DOM');
            }
        }
    }

    onFileSelected(event) {
        const file = event.target.files[0];

        if (!file) {
            console.log('⚠️ No file selected');
            return;
        }

        console.log('📁 File selected:', file.name, 'Size:', file.size, 'bytes', 'Type:', file.type);

        // Validate file type
        const validExtensions = ['.xls', '.xlsx'];
        const fileName = file.name.toLowerCase();
        const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

        if (!isValidExtension) {
            this.state.registerForm.uploadStatus = 'error';
            this.state.registerForm.statusMessage = this.isKorean()
                ? '엑셀 파일만 업로드 가능합니다 (.xls, .xlsx)'
                : 'Only Excel files are allowed (.xls, .xlsx)';
            this.state.registerForm.file = null;
            this.state.registerForm.fileName = '';
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.state.registerForm.uploadStatus = 'error';
            this.state.registerForm.statusMessage = this.isKorean()
                ? '파일 크기는 10MB 이하여야 합니다'
                : 'File size must be less than 10MB';
            this.state.registerForm.file = null;
            this.state.registerForm.fileName = '';
            return;
        }

        // Store file
        this.state.registerForm.file = file;
        this.state.registerForm.fileName = file.name;
        this.state.registerForm.uploadStatus = 'success';
        this.state.registerForm.statusMessage = this.isKorean()
            ? '파일이 성공적으로 선택되었습니다'
            : 'File selected successfully';

        console.log('✅ File validation passed');
    }

    // ✅ FIX: Download template with correct headers
    async downloadTemplate() {
        console.log('📥 Downloading member registration template');

        try {
            // Create a link element
            const link = document.createElement('a');
            link.href = '/golfzon/member_group/download_template';
            link.download = 'member_registration_template.xlsx';

            // Add to DOM, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('✅ Template download initiated');

            // Show success message
            setTimeout(() => {
                alert(this.isKorean()
                    ? '템플릿 다운로드가 시작되었습니다.'
                    : 'Template download started.');
            }, 100);

        } catch (error) {
            console.error('❌ Error downloading template:', error);
            alert(this.isKorean()
                ? '템플릿 다운로드 실패. 다시 시도해주세요.'
                : 'Failed to download template. Please try again.');
        }
    }

    // ✅ FIX: Confirm registration
    async confirmRegistration() {
        if (!this.state.registerForm.groupTitle) {
            alert(this.isKorean()
                ? '그룹명을 입력해주세요'
                : 'Please enter a group name');
            return;
        }

        if (!this.state.registerForm.file) {
            alert(this.isKorean()
                ? '파일을 선택해주세요'
                : 'Please select a file');
            return;
        }

        this.state.isUploading = true;
        this.state.registerForm.uploadStatus = 'uploading';
        this.state.registerForm.statusMessage = this.isKorean()
            ? '업로드 중입니다...'
            : 'Uploading...';

        try {
            console.log('📤 Uploading member group registration');

            // Create FormData
            const formData = new FormData();
            formData.append('group_title', this.state.registerForm.groupTitle);
            formData.append('member_list_file', this.state.registerForm.file);

            // Upload file
            const response = await fetch('/golfzon/member_group/upload_member_list', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.status === 'success') {
                console.log('✅ Registration successful');

                this.state.registerForm.uploadStatus = 'success';
                this.state.registerForm.statusMessage = result.message || (this.isKorean()
                    ? '회원 그룹이 성공적으로 등록되었습니다'
                    : 'Member group registered successfully');

                // Reset form after delay
                setTimeout(() => {
                    this.resetRegisterForm();
                    this.searchMemberGroups(); // Refresh list
                }, 2000);
            } else {
                console.error('❌ Registration failed:', result.message);

                this.state.registerForm.uploadStatus = 'error';
                this.state.registerForm.statusMessage = result.message || (this.isKorean()
                    ? '등록 실패. 다시 시도해주세요.'
                    : 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('❌ Error during registration:', error);

            this.state.registerForm.uploadStatus = 'error';
            this.state.registerForm.statusMessage = this.isKorean()
                ? '오류가 발생했습니다. 다시 시도해주세요.'
                : 'An error occurred. Please try again.';
        } finally {
            this.state.isUploading = false;
        }
    }

    resetRegisterForm() {
        this.state.registerForm = {
            groupTitle: '',
            file: null,
            fileName: '',
            uploadStatus: '',
            statusMessage: ''
        };

        // Reset file input
        if (this.fileInput && this.fileInput.el) {
            this.fileInput.el.value = '';
        }
    }


    /**
      * Toggle filter selection
      */
    toggleFilter(filterName, value) {
        console.log(`🔄 Toggle filter: ${filterName} = ${value}`);
        this.state.conditionForm[filterName] = value;
    }

    /**
     * Set quick date period
     */
    setQuickPeriod(periodType, range) {
        console.log(`📅 Set quick period: ${periodType} - ${range}`);

        const today = new Date();
        let startDate, endDate;

        switch (range) {
            case 'this_month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case '1_month':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                endDate = today;
                break;
            case '3_months':
                startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
                endDate = today;
                break;
            case '6_months':
                startDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
                endDate = today;
                break;
            default:
                return;
        }

        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (periodType === 'membership') {
            this.state.conditionForm.membershipStartDate = formatDate(startDate);
            this.state.conditionForm.membershipEndDate = formatDate(endDate);
        } else if (periodType === 'builtin') {
            this.state.conditionForm.builtInStartDate = formatDate(startDate);
            this.state.conditionForm.builtInEndDate = formatDate(endDate);
        }

        console.log(`✅ Period set: ${formatDate(startDate)} ~ ${formatDate(endDate)}`);
    }

    async submitMemberInquiry() {
        try {
            console.log('='.repeat(80));
            console.log('🔍 SUBMITTING MEMBER INQUIRY');
            console.log('='.repeat(80));

            // Get all conditions from state
            const conditions = this.state.conditionForm;
            console.log('Conditions:', conditions);

            // Validate group title
            if (!conditions.groupTitle || conditions.groupTitle.trim() === '') {
                alert('Please enter a group title');
                return;
            }

            // ✅ Set loading state
            this.state.isSubmittingInquiry = true;

            // Prepare payload
            const payload = {
                group_title: conditions.groupTitle,
                gender: conditions.gender,
                age_group: conditions.ageGroup,
                marketing_consent: conditions.marketingConsent,
                membership_type: conditions.membershipType,
                residence_1: conditions.residence1,
                residence_2: conditions.residence2,
                residence_3: conditions.residence3,
                membership_start_date: conditions.membershipStartDate,
                membership_end_date: conditions.membershipEndDate,
                builtin_start_date: conditions.builtinStartDate,
                builtin_end_date: conditions.builtinEndDate,
                days_of_use: conditions.daysOfUse,
                usage_time_zone: conditions.usageTimeZone,
                inflow_channel: conditions.inflowChannel,
                organization: conditions.organization,
                number_of_rounds: conditions.numberOfRounds,
                rainy_round: conditions.rainyRound,
                self_rounding: conditions.selfRounding,
                use_green_fee: conditions.useGreenFee,
            };

            console.log('📤 Sending payload:', payload);

            // Make API call
            const response = await this.rpc('/golfzon/member_group/condition_inquiry', payload);

            console.log('📥 Response:', response);

            // ✅ ALWAYS reset loading state in try block
            this.state.isSubmittingInquiry = false;

            // Handle response
            if (response.status === 'success') {
                // Update inquiry results
                let indicators = response.indicators || {};
                indicators.number_of_members = (response.member_count ?? response.number_of_members ?? 0) + ' people';
                this.state.inquiryResults = {
                    indicators: indicators,
                    members: response.members,
                    memberCount: response.member_count,
                    groupId: response.group_id,
                };
                this.state.showInquiryResults = true;

                // Scroll to results
                setTimeout(() => {
                    const resultsSection = document.querySelector('.inquiry-results-section');
                    if (resultsSection) {
                        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);

                // Show success message
                alert(`Successfully created group with ${response.member_count} members!`);

                // Refresh group list
                await this.searchMemberGroups();

            } else {
                console.error('❌ INQUIRY FAILED:', response.message);
                alert('Error: ' + (response.message || 'Failed to create group'));
            }

        } catch (error) {
            // ✅ ALWAYS reset loading state in catch block
            this.state.isSubmittingInquiry = false;

            console.error('❌ Error submitting member inquiry:', error);
            alert('Error creating group: ' + (error.message || 'Unknown error'));
        }
    }

    /**
     * Confirm group creation from inquiry results
     */
    async confirmGroupCreation() {
        if (!this.state.inquiryResults.group_id) {
            this.notification.add(
                this.isKorean()
                    ? '생성할 그룹 정보가 없습니다.'
                    : 'No group information to create.',
                { type: 'warning' }
            );
            return;
        }

        const confirmed = confirm(
            this.isKorean()
                ? `조회된 ${this.state.inquiryResults.member_count}명의 회원으로 그룹을 등록하시겠습니까?`
                : `Would you like to register a group with ${this.state.inquiryResults.member_count} members?`
        );

        if (!confirmed) {
            return;
        }

        try {
            console.log('📝 Confirming group creation:', this.state.inquiryResults.group_id);

            // Refresh group list
            await this.searchMemberGroups();

            // Reset forms and hide results
            this.resetConditionForm();
            this.state.showInquiryResults = false;

            this.notification.add(
                this.isKorean()
                    ? '그룹이 성공적으로 등록되었습니다.'
                    : 'Group registered successfully.',
                { type: 'success' }
            );

        } catch (error) {
            console.error('❌ Error confirming group:', error);

            this.notification.add(
                this.isKorean()
                    ? '그룹 등록 중 오류가 발생했습니다.'
                    : 'An error occurred during group registration.',
                { type: 'danger' }
            );
        }
    }

    /**
     * Reset condition form
     */
    resetConditionForm() {
        this.state.conditionForm = {
            groupTitle: '',
            gender: 'all',
            ageGroup: 'unselected',
            marketingConsent: '',
            membershipType: 'member',
            residence1: '',
            residence2: '',
            residence3: '',
            membershipStartDate: '',
            membershipEndDate: '',
            builtInStartDate: '',
            builtInEndDate: '',
            daysOfUse: 'entire',
            usageTimeZone: 'entire',
            inflowChannel: 'entire',
            organization: 'entire',
            numberOfRounds: 'entire',
            rainyRound: 'entire',
            selfRounding: 'entire',
            useGreenFee: 'entire'
        };

        this.state.inquiryResults = {
            indicators: {
                number_of_members: '0 people',
                number_of_times_builtin: '0 times',
                total_sales: '0 won',
                payment_green_fee: '0 won',
                open_green_fee: '0 won',
                average_discount_rate: '0%'
            },
            members: [],
            group_id: null
        };

        console.log('🔄 Condition form reset');
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
            target: 'main',
        });
    }

    navigateToMember(event) {
        event.preventDefault();
        event.stopPropagation();
        this.state.activeMenuItem = 'member';
        this.state.drawerOpen = false;
        if (this.menuDrawer.el) this.menuDrawer.el.classList.remove("open");
        this.env.services.action.doAction({
            type: 'ir.actions.client',
            tag: 'golfzon.member',
            target: 'main',
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
