/**
 * Repo Manager floating Widget - Redesigned
 * Modern, minimal, and user-friendly floating widget for Git operations
 */

(function () {
    "use strict";

    const { __ } = wp.i18n;

    class GitManagerFloatingWidget {
        constructor() {
            this.currentRepo = null;
            this.currentBranch = null;
            this.repositories = [];
            this.isLoading = false;
            this.notificationQueue = [];
            this.isProcessingNotifications = false;
            this.isPanelOpen = false;
            this.shownStatusNotifications = new Set(); // Track shown status notifications
            this.sessionDismissals = new Set(); // Hide-until-refresh dismissals (not persisted)

            // Add notification dismissal system
            this.notificationDismissals = this.loadNotificationDismissals();

            // Beep URL for notifications
            this.beepUrl =
                typeof WPGitManagerGlobal !== "undefined" &&
                WPGitManagerGlobal?.beepUrl
                    ? WPGitManagerGlobal.beepUrl
                    : "";

            this.init();
        }

        init() {
            this.bindEvents();
            this.loadRepositories();
            this.startPolling();

            // Clean up expired dismissals on initialization
            this.cleanupExpiredDismissals();
        }

        bindEvents() {
            // Floating trigger button
            const trigger = document.getElementById(
                "repo-manager-floating-trigger"
            );
            if (trigger) {
                trigger.addEventListener("click", () => this.togglePanel());
            }

            // Panel close button
            const closeBtn = document.getElementById(
                "repo-manager-panel-close"
            );
            if (closeBtn) {
                closeBtn.addEventListener("click", () => this.closePanel());
            }

            // Close panel when clicking outside
            document.addEventListener("click", (e) => {
                if (!e.target.closest("#repo-manager-floating-widget")) {
                    this.closePanel();
                }
            });

            // Repository selector
            const repoSelect = document.getElementById(
                "repo-manager-repo-select"
            );
            if (repoSelect) {
                repoSelect.addEventListener("change", (e) => {
                    this.selectRepository(e.target.value);
                });
            }

            // Action buttons
            const fetchBtn = document.getElementById("repo-manager-fetch-btn");
            const pullBtn = document.getElementById("repo-manager-pull-btn");
            const pushBtn = document.getElementById("repo-manager-push-btn");
            const branchSelect = document.getElementById(
                "repo-manager-branch-select"
            );
            const checkoutBtn = document.getElementById(
                "repo-manager-branch-checkout-btn"
            );

            if (fetchBtn) {
                fetchBtn.addEventListener("click", () =>
                    this.fetchRepository()
                );
            }

            if (pullBtn) {
                pullBtn.addEventListener("click", () => this.pullRepository());
            }

            if (pushBtn) {
                pushBtn.addEventListener("click", () => this.pushRepository());
            }

            if (checkoutBtn) {
                checkoutBtn.addEventListener("click", () =>
                    this.checkoutSelectedBranch()
                );
            }

            // Close notification on click
            document.addEventListener("click", (e) => {
                if (e.target.closest(".repo-manager-notification-close")) {
                    const notification = e.target.closest(
                        ".repo-manager-notification"
                    );
                    if (notification) {
                        // Check if this is a status notification
                        const notificationKey =
                            notification.dataset.notificationKey;
                        if (
                            notificationKey &&
                            (notificationKey.startsWith("status-") ||
                                notificationKey.startsWith(
                                    "background-status" // Check for both old and new prefixes
                                ))
                        ) {
                            if (notificationKey.includes("::")) {
                                // New format: background-status::repoId::branch::status
                                const parts = notificationKey.split("::");
                                if (parts.length === 4) {
                                    const repoId = parts[1];
                                    const branchName = parts[2];
                                    const statusType = parts[3];

                                    // Show dismissal options popup
                                    this.showDismissalOptionsPopup(
                                        notification,
                                        branchName,
                                        statusType
                                    );
                                } else {
                                    // Fallback to direct removal for malformed new keys
                                    this.removeNotification(notification);
                                }
                            } else {
                                // Fallback for old format: background-status-repoId-branch-status
                                // This can be removed after a transition period
                                const withoutPrefix =
                                    notificationKey.startsWith(
                                        "background-status-"
                                    )
                                        ? notificationKey.substring(
                                              "background-status-".length
                                          )
                                        : notificationKey.substring(
                                              "status-".length
                                          );

                                const lastDashIndex =
                                    withoutPrefix.lastIndexOf("-");
                                if (lastDashIndex !== -1) {
                                    const statusType = withoutPrefix.substring(
                                        lastDashIndex + 1
                                    );
                                    const beforeStatus =
                                        withoutPrefix.substring(
                                            0,
                                            lastDashIndex
                                        );
                                    const firstDashIndex =
                                        beforeStatus.indexOf("-");

                                    if (firstDashIndex !== -1) {
                                        const branchName =
                                            beforeStatus.substring(
                                                firstDashIndex + 1
                                            );
                                        this.showDismissalOptionsPopup(
                                            notification,
                                            branchName,
                                            statusType
                                        );
                                    } else {
                                        this.removeNotification(notification);
                                    }
                                } else {
                                    this.removeNotification(notification);
                                }
                            }
                        } else {
                            this.removeNotification(notification);
                        }
                    }
                }
            });

            // Keyboard navigation
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && this.isPanelOpen) {
                    this.closePanel();
                }
            });
        }

        togglePanel() {
            if (this.isPanelOpen) {
                this.closePanel();
            } else {
                this.openPanel();
            }
        }

        openPanel() {
            const panel = document.getElementById(
                "repo-manager-floating-panel"
            );
            if (panel) {
                panel.classList.add("active");
                this.isPanelOpen = true;

                // Focus management
                setTimeout(() => {
                    const repoSelect = document.getElementById(
                        "repo-manager-repo-select"
                    );
                    if (repoSelect) {
                        repoSelect.focus();
                    }
                }, 100);
            }
        }

        closePanel() {
            const panel = document.getElementById(
                "repo-manager-floating-panel"
            );
            if (panel) {
                panel.classList.remove("active");
                this.isPanelOpen = false;
            }
        }

        async loadRepositories() {
            try {
                this.showLoading();

                const response = await this.makeAjaxRequest(
                    "git_manager_get_repos",
                    {}
                );

                if (response.success && response.data) {
                    this.repositories = response.data;
                    this.populateRepositorySelect();
                    this.checkAllRepositoriesForUpdates();

                    // Auto-select first repository if available
                    if (this.repositories.length > 0) {
                        const firstRepo = this.repositories[0];
                        this.selectRepository(firstRepo.id);

                        // Update the select element to show the selected repository
                        const repoSelect = document.getElementById(
                            "repo-manager-repo-select"
                        );
                        if (repoSelect) {
                            repoSelect.value = firstRepo.id;
                        }
                    }
                }
            } catch (error) {
                this.showError(
                    __("Failed to load repositories", "repo-manager")
                );
            } finally {
                this.hideLoading();
            }
        }

        populateRepositorySelect() {
            const select = document.getElementById("repo-manager-repo-select");
            if (!select) return;

            // Clear existing options except the first one
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }

            this.repositories.forEach((repo) => {
                const option = document.createElement("option");
                option.value = repo.id;
                option.textContent = repo.name || repo.path.split("/").pop();
                select.appendChild(option);
            });
        }

        async selectRepository(repoId) {
            if (!repoId) {
                this.hideBranchInfo();
                return;
            }

            this.currentRepo = this.repositories.find(
                (repo) => repo.id === repoId
            );
            if (!this.currentRepo) return;

            try {
                this.showLoading();

                // Get branches and active branch
                const branchResponse = await this.makeAjaxRequest(
                    "git_manager_get_branches",
                    { id: repoId }
                );
                if (branchResponse.success && branchResponse.data) {
                    const { branches = [], activeBranch = "" } =
                        branchResponse.data;
                    // Fallbacks if API returned empty arrays
                    const normalizedBranches = Array.isArray(branches)
                        ? branches.filter(Boolean)
                        : [];
                    this.currentBranch =
                        activeBranch || normalizedBranches[0] || "";
                    this.populateBranchDropdown(
                        normalizedBranches,
                        this.currentBranch
                    );
                    this.updateBranchInfo();
                }

                // Get repository status without showing notifications
                await this.updateRepositoryStatusSilent();
            } catch (error) {
                this.showError(
                    __("Failed to load repository information", "repo-manager")
                );
            } finally {
                this.hideLoading();
            }
        }

        populateBranchDropdown(branches, activeBranch) {
            const select = document.getElementById(
                "repo-manager-branch-select"
            );
            if (!select) return;
            // reset options except placeholder
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            branches.forEach((b) => {
                const opt = document.createElement("option");
                opt.value = b;
                opt.textContent = b;
                if (b === activeBranch) opt.selected = true;
                select.appendChild(opt);
            });
            // If nothing selected yet, and we have branches, select first
            if (!select.value && branches.length > 0) {
                select.value = branches[0];
            }
        }

        async checkoutSelectedBranch() {
            if (!this.currentRepo) return;
            const select = document.getElementById(
                "repo-manager-branch-select"
            );
            if (!select || !select.value) return;
            const branch = select.value;
            try {
                this.showLoading();
                const res = await this.makeAjaxRequest("git_manager_checkout", {
                    id: this.currentRepo.id,
                    branch,
                });
                if (res.success) {
                    this.currentBranch = branch;
                    this.updateBranchInfo();
                    await this.updateRepositoryStatus();
                    this.showSuccess(
                        `${this.currentRepo.name || ""}: ${__(
                            "Switched to",
                            "repo-manager"
                        )} ${branch}`
                    );
                    // Notify other tabs (dashboard) to refresh
                    try {
                        localStorage.setItem(
                            "git_manager_last_checkout",
                            String(Date.now())
                        );
                    } catch (e) {}
                } else {
                    this.showError(
                        res.data || __("Checkout failed", "repo-manager")
                    );
                }
            } catch (e) {
                this.showError(
                    e?.message || __("Checkout error", "repo-manager")
                );
            } finally {
                this.hideLoading();
            }
        }

        updateBranchInfo() {
            const branchName = document.getElementById(
                "repo-manager-current-branch-name"
            );
            const branchSection = document.getElementById(
                "repo-manager-branch-section"
            );
            const emptyState = document.getElementById(
                "repo-manager-empty-state"
            );

            if (branchName && this.currentBranch) {
                branchName.textContent = this.currentBranch;
                if (branchSection) branchSection.style.display = "block";
                if (emptyState) emptyState.style.display = "none";
            }
        }

        async updateRepositoryStatus() {
            if (!this.currentRepo) return;

            try {
                const response = await this.makeAjaxRequest(
                    "git_manager_status",
                    {
                        id: this.currentRepo.id,
                    }
                );

                if (response.success && response.data) {
                    this.updateStatusIndicator(response.data);
                }
            } catch (error) {
                // Silent error handling
            }
        }

        async updateRepositoryStatusSilent() {
            if (!this.currentRepo) return;

            try {
                const response = await this.makeAjaxRequest(
                    "git_manager_status",
                    {
                        id: this.currentRepo.id,
                    }
                );

                if (response.success && response.data) {
                    this.updateStatusIndicatorSilent(response.data);
                }
            } catch (error) {
                // Silent error handling
            }
        }

        updateStatusIndicator(statusData) {
            const statusDot = document.getElementById(
                "repo-manager-status-dot"
            );
            const statusText = document.getElementById(
                "repo-manager-status-text"
            );
            const triggerStatus = document.getElementById(
                "repo-manager-trigger-status"
            );

            if (!statusDot || !statusText) return;

            // Handle both old string format and new object format
            let behind = 0;
            let ahead = 0;
            let hasChanges = false;

            if (typeof statusData === "string") {
                // Old format - parse the string
                const lines = statusData.split("\n");
                lines.forEach((line) => {
                    line = line.trim();
                    if (line.startsWith("##")) {
                        if (line.includes("behind")) {
                            const match = line.match(/behind (\d+)/);
                            if (match) behind = parseInt(match[1]);
                        }
                        if (line.includes("ahead")) {
                            const match = line.match(/ahead (\d+)/);
                            if (match) ahead = parseInt(match[1]);
                        }
                    } else if (line) {
                        hasChanges = true;
                    }
                });
            } else if (typeof statusData === "object") {
                // New format - use object properties
                behind = statusData.behind || 0;
                ahead = statusData.ahead || 0;
                hasChanges = statusData.hasChanges || false;
            }

            // Remove existing status classes
            statusDot.classList.remove("behind", "ahead", "diverged", "clean");
            if (triggerStatus) {
                triggerStatus.classList.remove(
                    "status-behind",
                    "status-ahead",
                    "status-diverged",
                    "status-clean"
                );
            }

            let status = "clean";
            let text = __("Up to date", "repo-manager");

            // Check for behind commits (need to pull)
            if (behind > 0) {
                status = "behind";
                text = __("Behind remote", "repo-manager");
            }
            // Check for ahead commits (need to push)
            else if (ahead > 0) {
                status = "ahead";
                text = __("Ahead of remote", "repo-manager");
            }
            // Check for diverged (both behind and ahead)
            else if (behind > 0 && ahead > 0) {
                status = "diverged";
                text = __("Diverged", "repo-manager");
            }

            statusDot.classList.add(status);
            statusText.textContent = text;

            // Update trigger status indicator
            if (triggerStatus) {
                triggerStatus.classList.add(`status-${status}`);
            }
        }

        updateStatusIndicatorSilent(statusData) {
            const statusDot = document.getElementById(
                "repo-manager-status-dot"
            );
            const statusText = document.getElementById(
                "repo-manager-status-text"
            );
            const triggerStatus = document.getElementById(
                "repo-manager-trigger-status"
            );

            if (!statusDot || !statusText) return;

            // Handle both old string format and new object format
            let behind = 0;
            let ahead = 0;
            let hasChanges = false;

            if (typeof statusData === "string") {
                // Old format - parse the string
                const lines = statusData.split("\n");
                lines.forEach((line) => {
                    line = line.trim();
                    if (line.startsWith("##")) {
                        if (line.includes("behind")) {
                            const match = line.match(/behind (\d+)/);
                            if (match) behind = parseInt(match[1]);
                        }
                        if (line.includes("ahead")) {
                            const match = line.match(/ahead (\d+)/);
                            if (match) ahead = parseInt(match[1]);
                        }
                    } else if (line) {
                        hasChanges = true;
                    }
                });
            } else if (typeof statusData === "object") {
                // New format - use object properties
                behind = statusData.behind || 0;
                ahead = statusData.ahead || 0;
                hasChanges = statusData.hasChanges || false;
            }

            // Remove existing status classes
            statusDot.classList.remove("behind", "ahead", "diverged", "clean");
            if (triggerStatus) {
                triggerStatus.classList.remove(
                    "status-behind",
                    "status-ahead",
                    "status-diverged",
                    "status-clean"
                );
            }

            let status = "clean";
            let text = __("Up to date", "repo-manager");

            // Check for behind commits (need to pull)
            if (behind > 0) {
                status = "behind";
                text = __("Behind remote", "repo-manager");
            }
            // Check for ahead commits (need to push)
            else if (ahead > 0) {
                status = "ahead";
                text = __("Ahead of remote", "repo-manager");
            }
            // Check for diverged (both behind and ahead)
            else if (behind > 0 && ahead > 0) {
                status = "diverged";
                text = __("Diverged", "repo-manager");
            }

            statusDot.classList.add(status);
            statusText.textContent = text;

            // Update trigger status indicator
            if (triggerStatus) {
                triggerStatus.classList.add(`status-${status}`);
            }

            // Don't show notifications in silent mode
            // Only clear existing notifications if status is clean
            if (status === "clean" && this.currentRepo) {
                this.clearStatusNotification(this.currentRepo.id);
            }
        }

        clearStatusNotification(repoId = null) {
            const targetRepoId =
                repoId || (this.currentRepo ? this.currentRepo.id : null);
            if (!targetRepoId) return;

            // Remove all status notifications for this repository
            const notifications = document.querySelectorAll(
                ".repo-manager-notification"
            );
            notifications.forEach((notification) => {
                const notificationKey = notification.dataset.notificationKey;
                if (
                    notificationKey &&
                    (notificationKey.startsWith(`status-${targetRepoId}-`) ||
                        notificationKey.startsWith(
                            `background-status-${targetRepoId}-`
                        ) ||
                        notificationKey.startsWith(
                            `background-status::${targetRepoId}::`
                        ))
                ) {
                    this.removeNotification(notification);
                }
            });
        }

        async fetchRepository() {
            if (!this.currentRepo || this.isLoading) return;

            try {
                this.isLoading = true;
                this.disableButtons();

                const response = await this.makeAjaxRequest(
                    "git_manager_fetch",
                    {
                        id: this.currentRepo.id,
                    }
                );

                if (response.success) {
                    this.showSuccess(
                        `${this.currentRepo.name}: ${__(
                            "Repository fetched successfully",
                            "repo-manager"
                        )}`
                    );
                    await this.updateRepositoryStatus();
                    // Clear status notifications after successful fetch
                    this.clearStatusNotification(this.currentRepo.id);
                } else {
                    this.showError(
                        `${this.currentRepo.name}: ${
                            response.data?.message ||
                            response.data ||
                            __("Fetch failed", "repo-manager")
                        }`
                    );
                }
            } catch (error) {
                this.showError(
                    `${this.currentRepo.name}: ${__(
                        "Fetch operation failed",
                        "repo-manager"
                    )}`
                );
            } finally {
                this.isLoading = false;
                this.enableButtons();
            }
        }

        async pullRepository() {
            if (!this.currentRepo || this.isLoading) return;

            try {
                this.isLoading = true;
                this.disableButtons();

                const response = await this.makeAjaxRequest(
                    "git_manager_repo_push",
                    {
                        id: this.currentRepo.id,
                    }
                );

                if (response.success) {
                    this.showSuccess(
                        `${this.currentRepo.name}: ${__(
                            "Repository pulled successfully",
                            "repo-manager"
                        )}`
                    );
                    await this.updateRepositoryStatus();
                    // Clear status notifications after successful pull
                    this.clearStatusNotification(this.currentRepo.id);
                } else {
                    this.showError(
                        `${this.currentRepo.name}: ${
                            response.data?.message ||
                            response.data ||
                            __("Pull failed", "repo-manager")
                        }`
                    );
                }
            } catch (error) {
                this.showError(
                    `${this.currentRepo.name}: ${__(
                        "Pull operation failed",
                        "repo-manager"
                    )}`
                );
            } finally {
                this.isLoading = false;
                this.enableButtons();
            }
        }

        async pushRepository() {
            if (!this.currentRepo || this.isLoading) return;

            try {
                this.isLoading = true;
                this.disableButtons();

                const response = await this.makeAjaxRequest(
                    "git_manager_repo_push",
                    {
                        id: this.currentRepo.id,
                    }
                );

                if (response.success) {
                    this.showSuccess(
                        `${this.currentRepo.name}: ${__(
                            "Repository pushed successfully",
                            "repo-manager"
                        )}`
                    );
                    await this.updateRepositoryStatus();
                    // Clear status notifications after successful push
                    this.clearStatusNotification(this.currentRepo.id);
                } else {
                    this.showError(
                        `${this.currentRepo.name}: ${
                            response.data?.message ||
                            response.data ||
                            __("Push failed", "repo-manager")
                        }`
                    );
                }
            } catch (error) {
                this.showError(
                    `${this.currentRepo.name}: ${__(
                        "Push operation failed",
                        "repo-manager"
                    )}`
                );
            } finally {
                this.isLoading = false;
                this.enableButtons();
            }
        }

        hideBranchInfo() {
            const branchSection = document.getElementById(
                "repo-manager-branch-section"
            );
            const emptyState = document.getElementById(
                "repo-manager-empty-state"
            );

            if (branchSection) branchSection.style.display = "none";
            if (emptyState) emptyState.style.display = "block";
        }

        showLoading() {
            const loading = document.getElementById(
                "repo-manager-loading-state"
            );
            const branchSection = document.getElementById(
                "repo-manager-branch-section"
            );
            const emptyState = document.getElementById(
                "repo-manager-empty-state"
            );

            if (loading) loading.style.display = "flex";
            if (branchSection) branchSection.style.display = "none";
            if (emptyState) emptyState.style.display = "none";
        }

        hideLoading() {
            const loading = document.getElementById(
                "repo-manager-loading-state"
            );
            if (loading) loading.style.display = "none";
        }

        disableButtons() {
            const buttons = document.querySelectorAll(
                ".repo-manager-action-btn"
            );
            buttons.forEach((btn) => (btn.disabled = true));
        }

        enableButtons() {
            const buttons = document.querySelectorAll(
                ".repo-manager-action-btn"
            );
            buttons.forEach((btn) => (btn.disabled = false));
        }

        showSuccess(message) {
            this.showNotification(message, "success");
        }

        showError(message) {
            this.showNotification(message, "error");
        }

        showNotification(message, type = "info", data = {}) {
            // Check if notifications are enabled
            if (!this.areNotificationsEnabled()) {
                return; // Notifications are disabled
            }

            const notification = {
                id: Date.now() + Math.random(),
                message,
                type,
                data,
                timestamp: Date.now(),
            };

            this.notificationQueue.push(notification);
            this.processNotificationQueue();
        }

        async processNotificationQueue() {
            if (
                this.isProcessingNotifications ||
                this.notificationQueue.length === 0
            ) {
                return;
            }

            this.isProcessingNotifications = true;

            while (this.notificationQueue.length > 0) {
                const notification = this.notificationQueue.shift();
                await this.displayNotification(notification);

                // Wait a bit between notifications
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            this.isProcessingNotifications = false;
        }

        async displayNotification(notification) {
            const container = document.getElementById(
                "repo-manager-notification-container"
            );
            if (!container) {
                return;
            }

            const notificationEl = document.createElement("div");
            notificationEl.className = `repo-manager-notification repo-manager-notification-${notification.type}`;
            notificationEl.dataset.notificationId = notification.id;

            // Add notification key for status notifications
            if (notification.data.notificationKey) {
                notificationEl.dataset.notificationKey =
                    notification.data.notificationKey;
            }

            // Get avatar URL if available
            let avatarHtml = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g><path stroke="var(--repo-manager-success)" d="M 9 19 C 5.283 20.115 3.005 19.703 2.068 17.054 C 1.848 16.432 1.085 16.283 0.572 16.155 M 16.558 22.159 L 16 18.13 C 16.076 17.165 15.465 15.854 14.792 15.159 C 17.932 14.809 23.456 15.349 21.5 8.52 C 21.116 7.178 20.963 5.781 20 4.77 C 20.456 3.549 20.853 1.609 20.339 0.411 C 20.339 0.411 18.73 0.65 16 2.48 C 13.708 1.859 11.292 1.859 9 2.48 C 6.27 0.65 4.768 0.464 4.768 0.464 C 4.254 1.662 4.544 3.549 5 4.77 C 4.03 5.789 3.716 7.16 3.5 8.55 C 2.522 14.85 7.019 14.692 10.159 15.082 C 9.494 15.77 8.933 17.176 9 18.13 L 9 22" style="stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.80018px; fill: none;"></path></g>
                </svg>
            `;

            // Use backend-provided avatar URL if available
            if (notification.data.gravatar_url) {
                avatarHtml = `<img src="${notification.data.gravatar_url}" alt="Avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;"><path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            } else if (notification.data.author_email) {
                // Fallback to frontend MD5 generation if backend doesn't provide URL
                const avatarUrl = this.getGravatarUrl(
                    notification.data.author_email
                );
                avatarHtml = `<img src="${avatarUrl}" alt="Avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;"><path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            }

            // Use different icon for status notifications
            if (notification.data.isStatusNotification) {
                // Show author avatar if available, otherwise use default icon
                if (notification.data.gravatar_url) {
                    avatarHtml = `<img src="${notification.data.gravatar_url}" alt="Avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                } else if (notification.data.author_email) {
                    // Fallback to frontend MD5 generation
                    const avatarUrl = this.getGravatarUrl(
                        notification.data.author_email
                    );
                    avatarHtml = `<img src="${avatarUrl}" alt="Avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                } else {
                    avatarHtml = `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    `;
                }
            }

            // Format message for better display
            let formattedMessage = notification.message;
            if (
                notification.data.isStatusNotification &&
                notification.data.latest_commit
            ) {
                // Split message into main message and commit info
                const lines = notification.message.split("\n");
                if (lines.length > 1) {
                    const mainMessage = lines[0];
                    const commitInfo = lines.slice(1).join("\n");
                    formattedMessage = `
                        <div class="repo-manager-notification-main-message">${this.escapeHtml(
                            mainMessage
                        )}</div>
                        <div class="repo-manager-notification-commit-info">${this.escapeHtml(
                            commitInfo
                        )}</div>
                    `;
                }
            } else {
                formattedMessage = this.escapeHtml(notification.message);
            }

            notificationEl.innerHTML = `
                <div class="repo-manager-notification-avatar">
                    ${avatarHtml}
                </div>
                <div class="repo-manager-notification-content">
                    <div class="repo-manager-notification-title">
                        ${this.escapeHtml(
                            notification.data.author ||
                                (notification.data.isStatusNotification
                                    ? __("Branch Status", "repo-manager")
                                    : __("Git Update", "repo-manager"))
                        )}
                    </div>
                    <div class="repo-manager-notification-message">
                        ${formattedMessage}
                    </div>
                    <div class="repo-manager-notification-meta">
                        ${
                            notification.data.repo_name
                                ? `<span class="repo-manager-notification-repo">${this.escapeHtml(
                                      notification.data.repo_name
                                  )}</span>`
                                : ""
                        }
                        ${
                            notification.data.branch
                                ? `<span class="repo-manager-notification-branch">${this.escapeHtml(
                                      notification.data.branch
                                  )}</span>`
                                : ""
                        }
                        ${
                            notification.data.status
                                ? `<span class="repo-manager-notification-status repo-manager-notification-status-${
                                      notification.data.status
                                  }">${this.escapeHtml(
                                      notification.data.status
                                  )}</span>`
                                : ""
                        }
                        ${
                            notification.data.behind &&
                            notification.data.behind > 0
                                ? `<span class="repo-manager-notification-count repo-manager-notification-count-behind">${
                                      notification.data.behind
                                  } ${
                                      notification.data.behind === 1
                                          ? __("commit", "repo-manager")
                                          : __("commits", "repo-manager")
                                  } ${__("behind", "repo-manager")}</span>`
                                : ""
                        }
                        ${
                            notification.data.ahead &&
                            notification.data.ahead > 0
                                ? `<span class="repo-manager-notification-count repo-manager-notification-count-ahead">${
                                      notification.data.ahead
                                  } ${
                                      notification.data.ahead === 1
                                          ? __("commit", "repo-manager")
                                          : __("commits", "repo-manager")
                                  } ${__("ahead", "repo-manager")}</span>`
                                : ""
                        }
                    </div>
                    ${
                        notification.data.isStatusNotification &&
                        notification.data.repo_id
                            ? `<div class="repo-manager-notification-actions">
                                ${
                                    notification.data.status === "behind" ||
                                    notification.data.status === "diverged"
                                        ? `<button class="repo-manager-notification-btn repo-manager-notification-btn-pull" data-repo-id="${
                                              notification.data.repo_id
                                          }" title="${__(
                                              "Pull changes",
                                              "repo-manager"
                                          )}">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                            ${__("Pull", "repo-manager")}
                                        </button>`
                                        : ""
                                }
                                ${
                                    notification.data.status === "ahead" ||
                                    notification.data.status === "diverged"
                                        ? `<button class="repo-manager-notification-btn repo-manager-notification-btn-push" data-repo-id="${
                                              notification.data.repo_id
                                          }" title="${__(
                                              "Push changes",
                                              "repo-manager"
                                          )}">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <polyline points="17,8 12,3 7,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                            ${__("Push", "repo-manager")}
                                        </button>`
                                        : ""
                                }
                            </div>`
                            : ""
                    }
                </div>
                <button class="repo-manager-notification-close" aria-label="${__(
                    "Close notification",
                    "repo-manager"
                )}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            `;

            // Add card stacking functionality
            this.setupCardStacking(notificationEl, container);

            container.appendChild(notificationEl);

            // Apply stacking after the element is in the DOM
            this.updateNotificationStacking(container);

            // Add event listeners for pull/push buttons
            if (
                notification.data.isStatusNotification &&
                notification.data.repo_id
            ) {
                const pullBtn = notificationEl.querySelector(
                    ".repo-manager-notification-btn-pull"
                );
                const pushBtn = notificationEl.querySelector(
                    ".repo-manager-notification-btn-push"
                );

                if (pullBtn) {
                    pullBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.handleNotificationPull(
                            notification.data.repo_id,
                            notificationEl
                        );
                    });
                }

                if (pushBtn) {
                    pushBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.handleNotificationPush(
                            notification.data.repo_id,
                            notificationEl
                        );
                    });
                }
            }

            // Auto-remove after 8 seconds (only for non-status notifications)
            if (!notification.data.isStatusNotification) {
                setTimeout(() => {
                    this.removeNotification(notificationEl);
                }, 8000);
            }
        }

        /**
         * Setup card stacking functionality for notifications
         */
        setupCardStacking(notificationEl, container) {
            // Add click handler to bring notification to front
            notificationEl.addEventListener("click", (e) => {
                // Don't trigger if clicking on close button or action buttons
                if (
                    e.target.closest(".repo-manager-notification-close") ||
                    e.target.closest(".repo-manager-notification-btn")
                ) {
                    return;
                }

                // If this is already the top-most notification, do nothing
                if (
                    container &&
                    container.lastElementChild === notificationEl
                ) {
                    return;
                }

                // Add visual feedback for click
                notificationEl.style.transform = "scale(0.98)";
                setTimeout(() => {
                    notificationEl.style.transform = "";
                    this.bringNotificationToFront(notificationEl, container);
                }, 100);
            });

            // Add hover effect to indicate clickability
            notificationEl.style.cursor = "pointer";

            // Initial stacking is applied after append in displayNotification
        }

        /**
         * Bring a notification to the front of the stack
         */
        bringNotificationToFront(notificationEl, container) {
            // Store current transform for smooth transition
            const currentTransform = notificationEl.style.transform;
            const currentOpacity = notificationEl.style.opacity;

            // Remove the notification from its current position
            if (notificationEl.parentNode) {
                notificationEl.parentNode.removeChild(notificationEl);
            }

            // Add it back to the top
            container.appendChild(notificationEl);

            // Reset to current position for smooth animation
            notificationEl.style.transform = currentTransform;
            notificationEl.style.opacity = currentOpacity;

            // Force reflow
            notificationEl.offsetHeight;

            // Add enhanced animation to indicate the card was brought to front
            notificationEl.classList.add("processing");
            notificationEl.style.animation =
                "cardBringToFront 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)";

            // Wait for animation to complete before updating stacking
            setTimeout(() => {
                notificationEl.style.animation = "";
                notificationEl.classList.remove("processing");
                // Update stacking for all notifications after animation completes
                this.updateNotificationStacking(container);
            }, 500);
        }

        /**
         * Update the stacking order and visual effects for all notifications
         */
        updateNotificationStacking(container) {
            const notifications = container.querySelectorAll(
                ".repo-manager-notification"
            );
            const maxStackedNotifications = 5; // Maximum number of notifications to show stacked
            const isRTL = document.documentElement.dir === "rtl";

            notifications.forEach((notification, index) => {
                const isTopCard = index === notifications.length - 1;
                const isStacked =
                    index >= notifications.length - maxStackedNotifications &&
                    !isTopCard;

                if (isStacked) {
                    // Apply stacking effect with CSS custom properties for smoother animations
                    const stackIndex = notifications.length - index - 1;
                    const offsetY = 0; // 25px offset per stacked card
                    const offsetX = isRTL
                        ? +(stackIndex * 25)
                        : -(stackIndex * 25); // 25px horizontal offset
                    const scale = 0.95; // Slightly smaller scale
                    const opacity = 1 - stackIndex * 0.15; // Gradually more transparent

                    // Set CSS custom properties for smooth animations
                    notification.style.setProperty(
                        "--stack-offset-x",
                        `${offsetX}px`
                    );
                    notification.style.setProperty(
                        "--stack-offset-y",
                        `${offsetY}px`
                    );
                    notification.style.setProperty(
                        "--stack-opacity",
                        opacity.toString()
                    );

                    notification.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
                    notification.style.opacity = opacity;
                    notification.style.zIndex = 10000 - stackIndex;
                    notification.style.pointerEvents = "auto";
                    notification.classList.add(
                        "repo-manager-notification-stacked"
                    );
                } else if (isTopCard) {
                    // Top card - full visibility with smooth transition
                    notification.style.removeProperty("--stack-offset-x");
                    notification.style.removeProperty("--stack-offset-y");
                    notification.style.removeProperty("--stack-opacity");

                    notification.style.transform =
                        "translate(0, 0) scale(0.95)";
                    notification.style.opacity = "1";
                    notification.style.zIndex = 10000 + maxStackedNotifications;
                    notification.style.pointerEvents = "auto";
                    notification.classList.remove(
                        "repo-manager-notification-stacked"
                    );
                } else {
                    // Hidden cards - move them out of view but keep them in DOM
                    notification.style.removeProperty("--stack-offset-x");
                    notification.style.removeProperty("--stack-offset-y");
                    notification.style.removeProperty("--stack-opacity");

                    notification.style.transform =
                        "translate(0, -100px) scale(0.8)";
                    notification.style.opacity = "0";
                    notification.style.zIndex = "10000";
                    notification.style.pointerEvents = "none";
                    notification.classList.add(
                        "repo-manager-notification-hidden"
                    );
                }
            });
        }

        removeNotification(notificationEl) {
            if (notificationEl && notificationEl.parentNode) {
                // Check if this is a status notification and clean up tracking
                const notificationKey = notificationEl.dataset.notificationKey;
                if (
                    notificationKey &&
                    (notificationKey.startsWith("status-") ||
                        notificationKey.startsWith("background-status-"))
                ) {
                    this.shownStatusNotifications.delete(notificationKey);

                    // Also clean up general branch-status tracking
                    if (notificationKey.includes("::")) {
                        const parts = notificationKey.split("::");
                        if (parts.length === 4) {
                            const branch = parts[2];
                            const status = parts[3];
                            const generalKey = `${branch}:${status}`;
                            this.shownStatusNotifications.delete(generalKey);
                        }
                    } else if (
                        notificationKey.startsWith("background-status-")
                    ) {
                        // Fallback for old format
                        const withoutPrefix = notificationKey.substring(
                            "background-status-".length
                        );
                        const lastDashIndex = withoutPrefix.lastIndexOf("-");
                        if (lastDashIndex !== -1) {
                            const status = withoutPrefix.substring(
                                lastDashIndex + 1
                            );
                            const beforeStatus = withoutPrefix.substring(
                                0,
                                lastDashIndex
                            );
                            const firstDashIndex = beforeStatus.indexOf("-");
                            if (firstDashIndex !== -1) {
                                const branch = beforeStatus.substring(
                                    firstDashIndex + 1
                                );
                                const generalKey = `${branch}:${status}`;
                                this.shownStatusNotifications.delete(
                                    generalKey
                                );
                            }
                        }
                    } else if (notificationKey.startsWith("status-")) {
                        // Fallback for oldest format
                        const withoutPrefix = notificationKey.substring(
                            "status-".length
                        );
                        const lastDashIndex = withoutPrefix.lastIndexOf("-");
                        if (lastDashIndex !== -1) {
                            const status = withoutPrefix.substring(
                                lastDashIndex + 1
                            );
                            const branchElement = notificationEl.querySelector(
                                ".repo-manager-notification-branch"
                            );
                            if (branchElement) {
                                const branch = branchElement.textContent;
                                const generalKey = `${branch}:${status}`;
                                this.shownStatusNotifications.delete(
                                    generalKey
                                );
                            }
                        }
                    }
                }

                // Get the container to update stacking after removal
                const container = notificationEl.parentNode;

                // Use enhanced slide-out animation
                notificationEl.style.animation =
                    "notificationSlideOut 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards";
                setTimeout(() => {
                    if (notificationEl.parentNode) {
                        notificationEl.parentNode.removeChild(notificationEl);

                        // Update stacking for remaining notifications
                        if (container) {
                            this.updateNotificationStacking(container);
                        }
                    }
                }, 400);
            }
        }

        getGravatarUrl(email, size = 32) {
            const hash = this.md5(email.toLowerCase().trim());
            return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
        }

        md5(string) {
            // Simple MD5 implementation for Gravatar
            function md5cycle(x, k) {
                let a = x[0],
                    b = x[1],
                    c = x[2],
                    d = x[3];

                a = ff(a, b, c, d, k[0], 7, -680876936);
                d = ff(d, a, b, c, k[1], 12, -389564586);
                c = ff(c, d, a, b, k[2], 17, 606105819);
                b = ff(b, c, d, a, k[3], 22, -1044525330);
                a = ff(a, b, c, d, k[4], 7, -176418897);
                d = ff(d, a, b, c, k[5], 12, 1200080426);
                c = ff(c, d, a, b, k[6], 17, -1473231341);
                b = ff(b, c, d, a, k[7], 22, -45705983);
                a = ff(a, b, c, d, k[8], 7, 1770035416);
                d = ff(d, a, b, c, k[9], 12, -1958414417);
                c = ff(c, d, a, b, k[10], 17, -42063);
                b = ff(b, c, d, a, k[11], 22, -1990404162);
                a = ff(a, b, c, d, k[12], 7, 1804603682);
                d = ff(d, a, b, c, k[13], 12, -40341101);
                c = ff(c, d, a, b, k[14], 17, -1502002290);
                b = ff(b, c, d, a, k[15], 22, 1236535329);

                a = gg(a, b, c, d, k[1], 5, -165796510);
                d = gg(d, a, b, c, k[6], 9, -1069501632);
                c = gg(c, d, a, b, k[11], 14, 643717713);
                b = gg(b, c, d, a, k[0], 20, -373897302);
                a = gg(a, b, c, d, k[5], 5, -701558691);
                d = gg(d, a, b, c, k[10], 9, 38016083);
                c = gg(c, d, a, b, k[15], 14, -660478335);
                b = gg(b, c, d, a, k[4], 20, -405537848);
                a = gg(a, b, c, d, k[9], 5, 568446438);
                d = gg(d, a, b, c, k[14], 9, -1019803690);
                c = gg(c, d, a, b, k[3], 14, -187363961);
                b = gg(b, c, d, a, k[8], 20, 1163531501);
                a = gg(a, b, c, d, k[13], 5, -1444681467);
                d = gg(d, a, b, c, k[2], 9, -51403784);
                c = gg(c, d, a, b, k[7], 14, 1735328473);
                b = gg(b, c, d, a, k[12], 20, -1926607734);

                a = hh(a, b, c, d, k[5], 4, -378558);
                d = hh(d, a, b, c, k[8], 11, -2022574463);
                c = hh(c, d, a, b, k[11], 16, 1839030562);
                b = hh(b, c, d, a, k[14], 23, -35309556);
                a = hh(a, b, c, d, k[1], 4, -1530992060);
                d = hh(d, a, b, c, k[4], 11, 1272893353);
                c = hh(c, d, a, b, k[7], 16, -155497632);
                b = hh(b, c, d, a, k[10], 23, -1094730640);
                a = hh(a, b, c, d, k[13], 4, 681279174);
                d = hh(d, a, b, c, k[0], 11, -358537222);
                c = hh(c, d, a, b, k[3], 16, -722521979);
                b = hh(b, c, d, a, k[6], 23, 76029189);
                a = hh(a, b, c, d, k[9], 4, -640364487);
                d = hh(d, a, b, c, k[12], 11, -421815835);
                c = hh(c, d, a, b, k[15], 16, 530742520);
                b = hh(b, c, d, a, k[2], 23, -995338651);

                a = ii(a, b, c, d, k[0], 6, -198630844);
                d = ii(d, a, b, c, k[7], 10, 1126891415);
                c = ii(c, d, a, b, k[14], 15, -1416354905);
                b = ii(b, c, d, a, k[5], 21, -57434055);
                a = ii(a, b, c, d, k[12], 6, 1700485571);
                d = ii(d, a, b, c, k[3], 10, -1894986606);
                c = ii(c, d, a, b, k[10], 15, -1051523);
                b = ii(b, c, d, a, k[1], 21, -2054922799);
                a = ii(a, b, c, d, k[8], 6, 1873313359);
                d = ii(d, a, b, c, k[15], 10, -30611744);
                c = ii(c, d, a, b, k[6], 15, -1560198380);
                b = ii(b, c, d, a, k[13], 21, 1309151649);
                a = ii(a, b, c, d, k[4], 6, -145523070);
                d = ii(d, a, b, c, k[11], 10, -1120210379);
                c = ii(c, d, a, b, k[2], 15, 718787259);
                b = ii(b, c, d, a, k[9], 21, -343485551);

                x[0] = add32(a, x[0]);
                x[1] = add32(b, x[1]);
                x[2] = add32(c, x[2]);
                x[3] = add32(d, x[3]);
            }

            function cmn(q, a, b, x, s, t) {
                a = add32(add32(a, q), add32(x, t));
                return add32((a << s) | (a >>> (32 - s)), b);
            }

            function ff(a, b, c, d, x, s, t) {
                return cmn((b & c) | (~b & d), a, b, x, s, t);
            }

            function gg(a, b, c, d, x, s, t) {
                return cmn((b & d) | (c & ~d), a, b, x, s, t);
            }

            function hh(a, b, c, d, x, s, t) {
                return cmn(b ^ c ^ d, a, b, x, s, t);
            }

            function ii(a, b, c, d, x, s, t) {
                return cmn(c ^ (b | ~d), a, b, x, s, t);
            }

            function md51(s) {
                const n = s.length;
                const state = [1732584193, -271733879, -1732584194, 271733878];
                let i;

                for (i = 64; i <= s.length; i += 64) {
                    md5cycle(state, md5blk(s.substring(i - 64, i)));
                }

                s = s.substring(i - 64);
                const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                for (i = 0; i < s.length; i++) {
                    tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3);
                }
                tail[i >> 2] |= 0x80 << (i % 4 << 3);
                if (i > 55) {
                    md5cycle(state, tail);
                    for (i = 0; i < 16; i++) tail[i] = 0;
                }
                tail[14] = n * 8;
                md5cycle(state, tail);
                return state;
            }

            function md5blk(s) {
                const md5blks = [];
                for (let i = 0; i < 64; i += 4) {
                    md5blks[i >> 2] =
                        s.charCodeAt(i) +
                        (s.charCodeAt(i + 1) << 8) +
                        (s.charCodeAt(i + 2) << 16) +
                        (s.charCodeAt(i + 3) << 24);
                }
                return md5blks;
            }

            function add32(a, b) {
                return (a + b) & 0xffffffff;
            }

            const hex_chr = "0123456789abcdef".split("");
            function rhex(n) {
                let s = "",
                    j = 0;
                for (; j < 4; j++) {
                    s +=
                        hex_chr[(n >> (j * 8 + 4)) & 0x0f] +
                        hex_chr[(n >> (j * 8)) & 0x0f];
                }
                return s;
            }

            function hex(x) {
                let i;
                for (i = 0; i < x.length; i++) {
                    x[i] = rhex(x[i]);
                }
                return x.join("");
            }

            return hex(md51(string));
        }

        escapeHtml(text) {
            const div = document.createElement("div");
            div.textContent = text;
            return div.innerHTML;
        }

        async makeAjaxRequest(action, data = {}) {
            const formData = new FormData();
            formData.append("action", action);

            const nonce = this.getNonce(action);
            formData.append("nonce", nonce);

            // Add additional data
            Object.keys(data).forEach((key) => {
                formData.append(key, data[key]);
            });

            const response = await fetch(
                typeof WPGitManagerGlobal !== "undefined" &&
                    WPGitManagerGlobal?.ajaxurl
                    ? WPGitManagerGlobal.ajaxurl
                    : typeof ajaxurl !== "undefined"
                    ? ajaxurl
                    : "/wp-admin/admin-ajax.php",
                {
                    method: "POST",
                    credentials: "same-origin",
                    body: formData,
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `HTTP error! status: ${response.status} - ${errorText}`
                );
            }

            return await response.json();
        }

        getNonce(action) {
            // Use the same pattern as the existing global JavaScript
            return (
                (typeof WPGitManagerGlobal !== "undefined" &&
                    WPGitManagerGlobal?.action_nonces?.[action]) ||
                (typeof WPGitManagerGlobal !== "undefined" &&
                    WPGitManagerGlobal?.nonce) ||
                (typeof gitManagerAjax !== "undefined" &&
                    gitManagerAjax?.action_nonces?.[action]) ||
                (typeof gitManagerAjax !== "undefined" &&
                    gitManagerAjax?.nonce) ||
                (typeof window.gitManagerNonce !== "undefined" &&
                    window.gitManagerNonce?.nonce) ||
                ""
            );
        }

        startPolling() {
            // Poll for new commits every 15 seconds
            setInterval(() => {
                this.checkAllRepositoriesForUpdates();
            }, 15000);

            // Clean up expired dismissals every 5 minutes
            setInterval(() => {
                this.cleanupExpiredDismissals();
            }, 5 * 60 * 1000);

            // Immediate check instead of waiting
            setTimeout(() => {
                this.checkAllRepositoriesForUpdates();
            }, 1000); // Check after 1 second instead of waiting
        }

        clearAllBackgroundStatusNotifications() {
            // Remove all background status notifications
            const notifications = document.querySelectorAll(
                ".repo-manager-notification"
            );
            notifications.forEach((notification) => {
                const notificationKey = notification.dataset.notificationKey;
                if (
                    notificationKey &&
                    (notificationKey.startsWith("background-status-") ||
                        notificationKey.startsWith("background-status::"))
                ) {
                    this.removeNotification(notification);
                }
            });
        }

        async checkAllRepositoriesForUpdates() {
            if (this.repositories.length === 0) return;

            try {
                // Check all repositories for updates and status
                for (const repo of this.repositories) {
                    await this.checkRepositoryForUpdates(repo);
                    await this.checkRepositoryStatus(repo);
                }
            } catch (error) {
                // Silent error handling
            }
        }

        async checkRepositoryForUpdates(repo) {
            try {
                const response = await this.makeAjaxRequest(
                    "git_manager_latest_commit",
                    {
                        id: repo.id,
                    }
                );

                if (response.success && response.data) {
                    this.handleRepositoryUpdate(repo, response.data);
                }
            } catch (error) {
                // Silent error handling
            }
        }

        async checkRepositoryStatus(repo) {
            try {
                const response = await this.makeAjaxRequest(
                    "git_manager_status",
                    {
                        id: repo.id,
                    }
                );

                if (response.success && response.data) {
                    // Also get latest commit information
                    const commitResponse = await this.makeAjaxRequest(
                        "git_manager_latest_commit",
                        {
                            id: repo.id,
                        }
                    );

                    const commitData = commitResponse.success
                        ? commitResponse.data
                        : null;
                    this.handleRepositoryStatusCheck(
                        repo,
                        response.data,
                        commitData
                    );
                }
            } catch (error) {
                // Silent error handling
            }
        }

        handleRepositoryStatusCheck(repo, statusData, commitData = null) {
            // Handle both old string format and new object format
            let behind = 0;
            let ahead = 0;
            let hasChanges = false;
            let currentBranch = "";

            if (typeof statusData === "string") {
                // Old format - parse the string
                const lines = statusData.split("\n");
                lines.forEach((line) => {
                    line = line.trim();
                    if (line.startsWith("##")) {
                        if (line.includes("behind")) {
                            const match = line.match(/behind (\d+)/);
                            if (match) behind = parseInt(match[1]);
                        }
                        if (line.includes("ahead")) {
                            const match = line.match(/ahead (\d+)/);
                            if (match) ahead = parseInt(match[1]);
                        }
                        // Extract branch name
                        const branchMatch = line.match(/## ([^.]*)/);
                        if (branchMatch) currentBranch = branchMatch[1];
                    } else if (line) {
                        hasChanges = true;
                    }
                });
            } else if (typeof statusData === "object") {
                // New format - use object properties
                behind = statusData.behind || 0;
                ahead = statusData.ahead || 0;
                hasChanges = statusData.hasChanges || false;
                currentBranch = statusData.currentBranch || "";
            }

            // Determine status and show notification if needed
            let status = "clean";
            let message = "";
            let type = "info";

            if (behind > 0 && ahead > 0) {
                status = "diverged";
                message = `${repo.name}: ${__(
                    "Branch has diverged from remote. Manual merge needed.",
                    "repo-manager"
                )}`;
                type = "error";
            } else if (behind > 0) {
                status = "behind";
                message = `${repo.name}: ${__(
                    "Branch is behind remote. Pull needed.",
                    "repo-manager"
                )}`;
                type = "warning";
            } else if (ahead > 0) {
                status = "ahead";
                message = `${repo.name}: ${__(
                    "Branch is ahead of remote. Push needed.",
                    "repo-manager"
                )}`;
                type = "info";
            }

            // If repository status is now clean (resolved externally or branch changed),
            // clear any previously shown status notifications for this repository
            if (status === "clean") {
                this.clearStatusNotification(repo.id);
            }

            // Show notification only for behind or diverged; skip ahead (own commits)
            if (
                (status === "behind" ||
                    status === "diverged" ||
                    status === "ahead") &&
                message
            ) {
                // Create unique keys based on branch and status, not just repo and status
                const backgroundNotificationKey = `background-status::${repo.id}::${currentBranch}::${status}`;
                const manualNotificationKey = `status-${repo.id}-${currentBranch}-${status}`;

                // Also create a general key for this specific branch-status combination
                const generalNotificationKey = `${currentBranch}:${status}`;

                // Check if we've already shown this background notification
                if (
                    !this.shownStatusNotifications.has(
                        backgroundNotificationKey
                    )
                ) {
                    // Also check if there's already a manual notification for this status
                    // If there is, don't show the background notification to avoid duplicates
                    if (
                        this.shownStatusNotifications.has(manualNotificationKey)
                    ) {
                        return;
                    }

                    // Check if this notification should be dismissed based on user preferences
                    if (this.shouldDismissNotification(currentBranch, status)) {
                        return;
                    }

                    // Check if a similar notification is already shown
                    if (
                        this.isSimilarNotificationShown(currentBranch, status)
                    ) {
                        return;
                    }

                    // Enhance message with commit counts
                    let enhancedMessage = message;
                    if (behind > 0) {
                        enhancedMessage += ` (${behind} ${
                            behind === 1
                                ? __("commit", "repo-manager")
                                : __("commits", "repo-manager")
                        } ${__("behind", "repo-manager")})`;
                    }
                    if (ahead > 0) {
                        enhancedMessage += ` (${ahead} ${
                            ahead === 1
                                ? __("commit", "repo-manager")
                                : __("commits", "repo-manager")
                        } ${__("ahead", "repo-manager")})`;
                    }

                    // Add latest commit information if available
                    if (
                        commitData &&
                        (commitData.author_name || commitData.author)
                    ) {
                        const authorName =
                            commitData.author_name || commitData.author;
                        enhancedMessage += `\n${__(
                            "Latest commit:",
                            "repo-manager"
                        )} ${authorName}: ${commitData.subject}`;
                    }

                    // Check if notifications are enabled before showing status notification
                    if (!this.areNotificationsEnabled()) {
                        return;
                    }

                    this.showNotification(enhancedMessage, type, {
                        repo_name: repo.name,
                        repo_id: repo.id,
                        branch: currentBranch,
                        status: status,
                        isStatusNotification: true,
                        notificationKey: backgroundNotificationKey,
                        isBackgroundCheck: true,
                        // Include commit data for avatar
                        author: commitData ? commitData.author_name : null,
                        author_email: commitData
                            ? commitData.author_email
                            : null,
                        gravatar_url: commitData
                            ? commitData.gravatar_url
                            : null,
                        has_avatar: commitData ? commitData.has_avatar : false,
                        behind: behind,
                        ahead: ahead,
                        latest_commit: commitData,
                    });

                    // Mark this notification as shown
                    this.shownStatusNotifications.add(
                        backgroundNotificationKey
                    );

                    // Also track the general branch-status combination to prevent duplicates
                    this.shownStatusNotifications.add(generalNotificationKey);
                }
            }

            // Update status indicator if this is the currently selected repository
            if (this.currentRepo && this.currentRepo.id === repo.id) {
                this.updateStatusIndicator(statusData);
            }
        }

        handleRepositoryUpdate(repo, data) {
            // Check if notifications are enabled before showing repository update notifications
            if (!this.areNotificationsEnabled()) {
                return;
            }

            // Initialize seen remote hashes store
            this._seenRemoteHashes = this._seenRemoteHashes || new Set();

            // Read current WP user identity from DOM dataset if available
            const widgetRoot = document.getElementById(
                "repo-manager-floating-widget"
            );
            const currentUserEmail =
                widgetRoot?.dataset?.currentUserEmail || "";
            const currentUserName = widgetRoot?.dataset?.currentUserName || "";

            // Check if there are new commits for the current branch
            if (data.remote_hash && data.remote_hash !== data.hash) {
                // Suppress if the latest remote commit appears authored by current user
                const isOwnCommit =
                    (currentUserEmail &&
                        data.author_email &&
                        data.author_email.toLowerCase() ===
                            currentUserEmail.toLowerCase()) ||
                    (currentUserName &&
                        data.author_name &&
                        data.author_name.toLowerCase() ===
                            currentUserName.toLowerCase());
                if (isOwnCommit) {
                    return;
                }

                // Dedupe by remote hash so we don't spam on each poll
                if (this._seenRemoteHashes.has(data.remote_hash)) {
                    return;
                }

                const message = this.formatUpdateMessage(data);
                this.showNotification(message, "info", {
                    author: data.author_name,
                    author_email: data.author_email,
                    gravatar_url: data.gravatar_url,
                    has_avatar: data.has_avatar,
                    repo_name: repo.name,
                    branch: data.branch,
                    remote_hash: data.remote_hash,
                });
                this._seenRemoteHashes.add(data.remote_hash);

                // Update status indicator if this is the currently selected repository
                if (this.currentRepo && this.currentRepo.id === repo.id) {
                    this.updateRepositoryStatus();
                }
            }
        }

        formatUpdateMessage(data) {
            if (data.author_name && data.subject) {
                return `${data.author_name}: ${data.subject}`;
            } else if (data.author && data.subject) {
                return `${data.author}: ${data.subject}`;
            }
            return __("New commits detected on remote!", "repo-manager");
        }

        async handleNotificationPull(repoId, notificationEl) {
            try {
                // Disable the button and show loading state
                const pullBtn = notificationEl.querySelector(
                    ".repo-manager-notification-btn-pull"
                );
                if (pullBtn) {
                    pullBtn.disabled = true;
                    pullBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
                        ${__("Pulling...", "repo-manager")}
                    `;
                }

                const response = await this.makeAjaxRequest(
                    "git_manager_repo_push",
                    {
                        id: repoId,
                    }
                );

                if (response.success) {
                    this.showSuccess(
                        `${__(
                            "Repository pulled successfully",
                            "repo-manager"
                        )}`
                    );
                    // Clear status notifications for this repository
                    this.clearStatusNotification(repoId);
                    // Remove the notification
                    this.removeNotification(notificationEl);
                } else {
                    this.showError(
                        `${
                            response.data?.message ||
                            response.data ||
                            __("Pull failed", "repo-manager")
                        }`
                    );
                    // Re-enable the button
                    if (pullBtn) {
                        pullBtn.disabled = false;
                        pullBtn.innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            ${__("Pull", "repo-manager")}
                        `;
                    }
                }
            } catch (error) {
                this.showError(__("Pull operation failed", "repo-manager"));
                // Re-enable the button
                const pullBtn = notificationEl.querySelector(
                    ".repo-manager-notification-btn-pull"
                );
                if (pullBtn) {
                    pullBtn.disabled = false;
                    pullBtn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${__("Pull", "repo-manager")}
                    `;
                }
            }
        }

        async handleNotificationPush(repoId, notificationEl) {
            try {
                // Disable the button and show loading state
                const pushBtn = notificationEl.querySelector(
                    ".repo-manager-notification-btn-push"
                );
                if (pushBtn) {
                    pushBtn.disabled = true;
                    pushBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
                        ${__("Pushing...", "repo-manager")}
                    `;
                }

                const response = await this.makeAjaxRequest(
                    "git_manager_repo_push",
                    {
                        id: repoId,
                    }
                );

                if (response.success) {
                    this.showSuccess(
                        `${__(
                            "Repository pushed successfully",
                            "repo-manager"
                        )}`
                    );
                    // Clear status notifications for this repository
                    this.clearStatusNotification(repoId);
                    // Remove the notification
                    this.removeNotification(notificationEl);
                } else {
                    this.showError(
                        `${
                            response.data?.message ||
                            response.data ||
                            __("Push failed", "repo-manager")
                        }`
                    );
                    // Re-enable the button
                    if (pushBtn) {
                        pushBtn.disabled = false;
                        pushBtn.innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="17,8 12,3 7,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            ${__("Push", "repo-manager")}
                        `;
                    }
                }
            } catch (error) {
                this.showError(__("Push operation failed", "repo-manager"));
                // Re-enable the button
                const pushBtn = notificationEl.querySelector(
                    ".repo-manager-notification-btn-push"
                );
                if (pushBtn) {
                    pushBtn.disabled = false;
                    pushBtn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <polyline points="17,8 12,3 7,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${__("Push", "repo-manager")}
                    `;
                }
            }
        }

        /**
         * Load notification dismissals from localStorage
         */
        loadNotificationDismissals() {
            try {
                const stored = localStorage.getItem(
                    "repo-manager-notification-dismissals"
                );
                const dismissals = stored ? JSON.parse(stored) : {};
                return dismissals;
            } catch (error) {
                return {};
            }
        }

        /**
         * Save notification dismissals to localStorage
         */
        saveNotificationDismissals() {
            try {
                const dataToSave = JSON.stringify(this.notificationDismissals);
                localStorage.setItem(
                    "repo-manager-notification-dismissals",
                    dataToSave
                );
            } catch (error) {
                // Silent error handling
            }
        }

        /**
         * Check if notification should be dismissed based on user preferences
         */
        shouldDismissNotification(branchName, statusType) {
            // Normalize strings for consistency
            const normalizedBranchName = (branchName || "")
                .trim()
                .toLowerCase();
            const normalizedStatusType = (statusType || "")
                .trim()
                .toLowerCase();
            const key = `${normalizedBranchName}:${normalizedStatusType}`;

            // Session (hide just once) dismissals: hide until refresh
            if (this.sessionDismissals.has(key)) {
                return true;
            }

            const dismissal = this.notificationDismissals[key];

            if (!dismissal) {
                return false;
            }

            const now = Math.floor(Date.now() / 1000);

            if (dismissal.ignoreUntil === Infinity) {
                return true; // Permanent dismissal
            }

            if (dismissal.ignoreUntil > now) {
                return true; // Still within dismissal period
            }

            // Dismissal period has expired, remove it
            delete this.notificationDismissals[key];
            this.saveNotificationDismissals();
            return false;
        }

        /**
         * Create and show dismissal options popup
         */
        showDismissalOptionsPopup(notificationEl, branchName, statusType) {
            // Create popup overlay
            const overlay = document.createElement("div");
            overlay.className = "repo-manager-dismissal-overlay";
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9999999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            // Create popup dialog
            const popup = document.createElement("div");
            popup.className = "repo-manager-dismissal-popup";
            popup.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 20px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                animation: slideInDown 0.3s ease;
            `;

            // Add CSS animations
            const style = document.createElement("style");
            style.textContent = `
                @keyframes slideInDown {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes fadeOut {
                    from {
                        opacity: 1;
                    }
                    to {
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);

            // Create popup content
            popup.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">
                        ${__("Notification Dismissal Options", "repo-manager")}
                    </h3>
                    <p style="margin: 0; color: #666; font-size: 14px;">
                        ${__(
                            "Choose how long to hide this notification:",
                            "repo-manager"
                        )}
                    </p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button class="repo-manager-dismissal-option" data-action="once" style="
                        padding: 10px 15px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        background: white;
                        cursor: pointer;
                        text-align: left;
                        transition: all 0.2s;
                        font-size: 14px;
                    ">
                        <strong>${__("Hide just once", "repo-manager")}</strong>
                        <br><span style="color: #666; font-size: 12px;">${__(
                            "Hide until you refresh the page",
                            "repo-manager"
                        )}</span>
                    </button>
                    <button class="repo-manager-dismissal-option" data-action="permanent" style="
                        padding: 10px 15px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        background: white;
                        cursor: pointer;
                        text-align: left;
                        transition: all 0.2s;
                        font-size: 14px;
                    ">
                        <strong>${__(
                            "Don't show for this status again",
                            "repo-manager"
                        )}</strong>
                        <br><span style="color: #666; font-size: 12px;">${__(
                            "Permanently hide notifications for this branch and status",
                            "repo-manager"
                        )}</span>
                    </button>
                    <button class="repo-manager-dismissal-option" data-action="10min" style="
                        padding: 10px 15px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        background: white;
                        cursor: pointer;
                        text-align: left;
                        transition: all 0.2s;
                        font-size: 14px;
                    ">
                        <strong>${__(
                            "Hide for 10 minutes",
                            "repo-manager"
                        )}</strong>
                        <br><span style="color: #666; font-size: 12px;">${__(
                            "Notifications will reappear after 10 minutes",
                            "repo-manager"
                        )}</span>
                    </button>
                    <button class="repo-manager-dismissal-option" data-action="1day" style="
                        padding: 10px 15px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        background: white;
                        cursor: pointer;
                        text-align: left;
                        transition: all 0.2s;
                        font-size: 14px;
                    ">
                        <strong>${__("Hide for 1 day", "repo-manager")}</strong>
                        <br><span style="color: #666; font-size: 12px;">${__(
                            "Notifications will reappear after 24 hours",
                            "repo-manager"
                        )}</span>
                    </button>
                    <button class="repo-manager-dismissal-cancel" style="
                        padding: 10px 15px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        background: #f8f9fa;
                        cursor: pointer;
                        text-align: center;
                        transition: all 0.2s;
                        font-size: 14px;
                        margin-top: 10px;
                    ">
                        ${__("Cancel", "repo-manager")}
                    </button>
                </div>
            `;

            // Add hover effects
            const options = popup.querySelectorAll(
                ".repo-manager-dismissal-option"
            );
            options.forEach((option) => {
                option.addEventListener("mouseenter", () => {
                    option.style.backgroundColor = "#f8f9fa";
                    option.style.borderColor = "#007cba";
                });
                option.addEventListener("mouseleave", () => {
                    option.style.backgroundColor = "white";
                    option.style.borderColor = "#ddd";
                });
            });

            // Add event listeners
            options.forEach((option) => {
                option.addEventListener("click", () => {
                    const action = option.dataset.action;
                    this.handleDismissalAction(
                        action,
                        branchName,
                        statusType,
                        notificationEl
                    );
                    this.closeDismissalPopup(overlay);
                });
            });

            const cancelBtn = popup.querySelector(
                ".repo-manager-dismissal-cancel"
            );
            cancelBtn.addEventListener("click", () => {
                this.closeDismissalPopup(overlay);
            });

            // Close on overlay click
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    this.closeDismissalPopup(overlay);
                }
            });

            // Close on Escape key
            const handleEscape = (e) => {
                if (e.key === "Escape") {
                    this.closeDismissalPopup(overlay);
                    document.removeEventListener("keydown", handleEscape);
                }
            };
            document.addEventListener("keydown", handleEscape);

            overlay.appendChild(popup);
            document.body.appendChild(overlay);

            // Focus first option for accessibility
            setTimeout(() => {
                const firstOption = popup.querySelector(
                    ".repo-manager-dismissal-option"
                );
                if (firstOption) {
                    firstOption.focus();
                }
            }, 100);
        }

        /**
         * Handle dismissal action selection
         */
        handleDismissalAction(action, branchName, statusType, notificationEl) {
            // Normalize strings for consistency
            const normalizedBranchName = (branchName || "")
                .trim()
                .toLowerCase();
            const normalizedStatusType = (statusType || "")
                .trim()
                .toLowerCase();
            const key = `${normalizedBranchName}:${normalizedStatusType}`;
            const now = Math.floor(Date.now() / 1000);

            let ignoreUntil;

            switch (action) {
                case "once":
                    // Session-only: store in memory Set, not persisted
                    this.sessionDismissals.add(key);
                    // Remove just this notification without saving to storage
                    this.removeNotification(notificationEl);
                    // Informational toast
                    this.showNotification(
                        __("Notification hidden until refresh", "repo-manager"),
                        "info",
                        {
                            repo_name: notificationEl.querySelector(
                                ".repo-manager-notification-repo"
                            )?.textContent,
                            branch: branchName,
                        }
                    );
                    return;
                case "permanent":
                    ignoreUntil = Infinity;
                    break;
                case "10min":
                    ignoreUntil = now + 10 * 60; // 10 minutes
                    break;
                case "1day":
                    ignoreUntil = now + 24 * 60 * 60; // 24 hours
                    break;
                default:
                    return;
            }

            // Save dismissal preference
            this.notificationDismissals[key] = {
                ignoreUntil: ignoreUntil,
                dismissedAt: now,
                action: action,
            };
            this.saveNotificationDismissals();

            // Remove the notification
            this.removeNotification(notificationEl);

            // Show confirmation message
            let message;
            switch (action) {
                case "permanent":
                    message = __(
                        "Notification dismissed permanently",
                        "repo-manager"
                    );
                    break;
                case "10min":
                    message = __(
                        "Notification hidden for 10 minutes",
                        "repo-manager"
                    );
                    break;
                case "1day":
                    message = __(
                        "Notification hidden for 1 day",
                        "repo-manager"
                    );
                    break;
            }

            this.showNotification(message, "info", {
                repo_name: notificationEl.querySelector(
                    ".repo-manager-notification-repo"
                )?.textContent,
                branch: branchName,
            });
        }

        /**
         * Close dismissal popup
         */
        closeDismissalPopup(overlay) {
            if (overlay && overlay.parentNode) {
                overlay.style.animation = "fadeOut 0.2s ease forwards";
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                }, 200);
            }
        }

        /**
         * Clean up expired dismissals
         */
        cleanupExpiredDismissals() {
            const now = Math.floor(Date.now() / 1000);
            let hasChanges = false;

            Object.keys(this.notificationDismissals).forEach((key) => {
                const dismissal = this.notificationDismissals[key];
                if (
                    dismissal.ignoreUntil !== Infinity &&
                    dismissal.ignoreUntil <= now
                ) {
                    delete this.notificationDismissals[key];
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                this.saveNotificationDismissals();
            }
        }

        /**
         * Get dismissal statistics
         */
        getDismissalStats() {
            const now = Math.floor(Date.now() / 1000);
            const stats = {
                total: Object.keys(this.notificationDismissals).length,
                permanent: 0,
                temporary: 0,
                expired: 0,
            };

            Object.values(this.notificationDismissals).forEach((dismissal) => {
                if (dismissal.ignoreUntil === Infinity) {
                    stats.permanent++;
                } else if (dismissal.ignoreUntil > now) {
                    stats.temporary++;
                } else {
                    stats.expired++;
                }
            });

            return stats;
        }

        /**
         * Check if a similar notification is already shown
         */
        isSimilarNotificationShown(branchName, statusType) {
            // Check for exact branch-status combination
            const generalKey = `${branchName}:${statusType}`;
            if (this.shownStatusNotifications.has(generalKey)) {
                return true;
            }

            // Check for any notification with the same branch and status
            for (const key of this.shownStatusNotifications) {
                if (key.includes(branchName) && key.includes(statusType)) {
                    return true;
                }
            }

            return false;
        }

        /**
         * Get all active notifications
         */
        getActiveNotifications() {
            const notifications = document.querySelectorAll(
                ".repo-manager-notification"
            );
            const activeNotifications = [];

            notifications.forEach((notification) => {
                const notificationKey = notification.dataset.notificationKey;
                const branchElement = notification.querySelector(
                    ".repo-manager-notification-branch"
                );
                const branch = branchElement
                    ? branchElement.textContent
                    : "unknown";

                activeNotifications.push({
                    element: notification,
                    key: notificationKey,
                    branch: branch,
                    isShown: this.shownStatusNotifications.has(notificationKey),
                });
            });

            return activeNotifications;
        }

        /**
         * Play beep sound for notifications
         */
        playBeep() {
            try {
                if (this.beepUrl) {
                    const audio = new Audio(this.beepUrl);
                    const playPromise = audio.play();
                    if (playPromise && playPromise.catch) {
                        playPromise.catch(() => {});
                    }
                }
            } catch (e) {
                // Ignore audio errors
            }
        }

        /**
         * Check if notifications are enabled
         * @returns {boolean}
         */
        areNotificationsEnabled() {
            const floatingWidget = document.getElementById(
                "repo-manager-floating-widget"
            );
            return (
                floatingWidget &&
                floatingWidget.dataset.notificationsEnabled === "1"
            );
        }
    }

    // Initialize the floating widget when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            new GitManagerFloatingWidget();
        });
    } else {
        new GitManagerFloatingWidget();
    }
})();
