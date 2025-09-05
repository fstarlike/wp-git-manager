/**
 * Repo Manager- RTL Support
 * Handles RTL layout, language detection, and dynamic RTL functionality
 */

class GitManagerRTL {
    constructor() {
        this.isRTL = false;
        this.currentLanguage = "en";
        this.init();
    }

    init() {
        this.detectLanguage();
        this.setupRTLSupport();
        this.bindEvents();
    }

    /**
     * Detect current language and set RTL accordingly
     */
    detectLanguage() {
        // Check WordPress locale
        if (typeof wp !== "undefined" && wp.locale) {
            this.currentLanguage = wp.locale;
        } else {
            // Fallback to document language
            this.currentLanguage = document.documentElement.lang || "en";
        }

        // RTL languages list
        const rtlLanguages = [
            "ar",
            "he",
            "fa",
            "ur",
            "ps",
            "sd",
            "yi",
            "ku",
            "dv",
            "ckb",
        ];

        this.isRTL = rtlLanguages.some((lang) =>
            this.currentLanguage.startsWith(lang)
        );

        // Check for explicit RTL setting
        if (document.documentElement.dir === "rtl") {
            this.isRTL = true;
        }
    }

    /**
     * Setup RTL support for the Plugin
     */
    setupRTLSupport() {
        const wrapper = document.querySelector(".repo-manager-wrap");
        if (!wrapper) return;

        if (this.isRTL) {
            wrapper.setAttribute("dir", "rtl");
            wrapper.classList.add("repo-manager-rtl");
            document.body.classList.add("repo-manager-rtl-active");
        } else {
            wrapper.setAttribute("dir", "ltr");
            wrapper.classList.remove("repo-manager-rtl");
            document.body.classList.remove("repo-manager-rtl-active");
        }

        this.updateLayout();
    }

    /**
     * Update layout elements for RTL
     */
    updateLayout() {
        // Always reset to default LTR layout first
        this.resetToLTRLayout();

        // Only apply RTL changes if RTL is active
        if (!this.isRTL) return;

        // Update flex directions
        this.updateFlexDirections();

        // Update margins and paddings
        this.updateSpacing();

        // Update icons
        this.updateIcons();

        // Update text alignment
        this.updateTextAlignment();

        // Update directory selector interface
        this.updateDirectorySelectorLayout();

        // Update troubleshooting interface
        this.updateTroubleshootLayout();
    }

    /**
     * Reset layout to default LTR
     */
    resetToLTRLayout() {
        // Reset flex directions
        const flexContainers = document.querySelectorAll(`
            .repo-manager-header-content,
            .repo-manager-logo,
            .repo-manager-actions,
            .git-repo-sidebar-header,
            .git-repo-card-header,
            .git-repo-card-actions,
            .git-form-actions,
            .git-modal-header,
            .git-btn-group,
            .troubleshoot-title,
            .troubleshoot-progress,
            .step-header,
            .troubleshoot-actions,
            .troubleshoot-summary-content h3,
            .summary-stats,
            .stat-item,
            .summary-recommendation,
            .recommendation-section h4,
            .step-message,
            .solution-content h4
        `);

        flexContainers.forEach((container) => {
            container.style.flexDirection = "";
        });

        // Reset text alignment
        const textElements = document.querySelectorAll(`
            .git-repo-card,
            .git-form-group label,
            .git-form-group input,
            .git-form-group select,
            .git-form-group textarea,
            .git-modal-body,
            .git-nav-item,
            .git-tooltip,
            .git-dropdown-menu,
            .git-dropdown-item,
            .git-table th,
            .git-table td,
            .git-alert,
            .step-info,
            .step-title,
            .step-description,
            .step-content,
            .step-log,
            .step-solution,
            .troubleshoot-summary,
            .troubleshoot-summary-content
        `);

        textElements.forEach((element) => {
            element.style.textAlign = "";
        });

        // Reset margins
        const marginElements = document.querySelectorAll(`
            .repo-manager-logo .repo-manager-title,
            .git-action-btn + .git-action-btn,
            .git-sidebar-add-btn,
            .git-repo-card-actions button,
            .git-form-actions button,
            .git-modal-close,
            .git-btn-group button,
            .git-nav-item svg,
            .git-status-indicator,
            .git-alert-icon,
            .step-icon,
            .step-status,
            .troubleshoot-btn svg,
            .troubleshoot-title svg,
            .troubleshoot-summary-content h3 svg,
            .stat-item svg,
            .summary-recommendation svg,
            .recommendation-section h4 svg,
            .step-message svg,
            .solution-content h4 svg
        `);

        marginElements.forEach((element) => {
            element.style.marginLeft = "";
            element.style.marginRight = "";
        });

        // Reset icon transforms
        const icons = document.querySelectorAll(`
            .git-icon-left,
            .git-icon-right,
            .git-nav-item svg,
            .git-action-btn svg,
            .step-message svg,
            .troubleshoot-btn svg
        `);

        icons.forEach((icon) => {
            icon.style.transform = "";
        });

        // Reset padding
        const paddingElements = document.querySelectorAll(`
            .repo-manager-main,
            .git-repo-sidebar,
            .recommendation-section ul
        `);

        paddingElements.forEach((element) => {
            element.style.paddingLeft = "";
            element.style.paddingRight = "";
        });
    }

    /**
     * Update flex directions for RTL
     */
    updateFlexDirections() {
        const flexContainers = document.querySelectorAll(`
            .repo-manager-header-content,
            .repo-manager-logo,
            .repo-manager-actions,
            .git-repo-sidebar-header,
            .git-repo-card-header,
            .git-repo-card-actions,
            .git-form-actions,
            .git-modal-header,
            .git-btn-group
        `);

        flexContainers.forEach((container) => {
            if (container.style.flexDirection !== "column") {
                container.style.flexDirection = "row-reverse";
            }
        });
    }

    /**
     * Update spacing for RTL
     */
    updateSpacing() {
        // Update margins
        const marginElements = document.querySelectorAll(`
            .repo-manager-logo .repo-manager-title,
            .git-action-btn + .git-action-btn,
            .git-sidebar-add-btn,
            .git-repo-card-actions button,
            .git-form-actions button,
            .git-modal-close,
            .git-btn-group button,
            .git-nav-item svg,
            .git-status-indicator,
            .git-alert-icon
        `);

        marginElements.forEach((element) => {
            const computedStyle = window.getComputedStyle(element);
            const marginRight = computedStyle.marginRight;
            const marginLeft = computedStyle.marginLeft;

            if (marginRight !== "0px") {
                element.style.marginLeft = marginRight;
                element.style.marginRight = "0";
            }
        });

        // Update paddings
        const paddingElements = document.querySelectorAll(`
            .repo-manager-main,
            .git-repo-sidebar
        `);

        paddingElements.forEach((element) => {
            const computedStyle = window.getComputedStyle(element);
            const paddingRight = computedStyle.paddingRight;
            const paddingLeft = computedStyle.paddingLeft;

            if (paddingRight !== "0px") {
                element.style.paddingLeft = paddingRight;
                element.style.paddingRight = "0";
            }
        });
    }

    /**
     * Update icons for RTL
     */
    updateIcons() {
        const icons = document.querySelectorAll(`
            .git-icon-left,
            .git-icon-right,
            .git-nav-item svg,
            .git-action-btn svg
        `);

        icons.forEach((icon) => {
            if (
                icon.classList.contains("git-icon-left") ||
                icon.classList.contains("git-icon-right")
            ) {
                icon.style.transform = "scaleX(-1)";
            }
        });
    }

    /**
     * Update text alignment for RTL
     */
    updateTextAlignment() {
        const textElements = document.querySelectorAll(`
            .git-repo-card,
            .git-form-group label,
            .git-form-group input,
            .git-form-group select,
            .git-form-group textarea,
            .git-modal-body,
            .git-nav-item,
            .git-tooltip,
            .git-dropdown-menu,
            .git-dropdown-item,
            .git-table th,
            .git-table td,
            .git-alert
        `);

        textElements.forEach((element) => {
            // Don't override center alignment
            if (element.style.textAlign !== "center") {
                element.style.textAlign = "right";
            }
        });
    }

    /**
     * Update directory selector interface layout for RTL
     */
    updateDirectorySelectorLayout() {
        // Update search container
        const searchContainer = document.querySelector(".new-search-container");
        if (searchContainer) {
            searchContainer.style.textAlign = "right";
        }

        // Update search wrapper
        const searchWrapper = document.querySelector(".new-search-wrapper");
        if (searchWrapper) {
            searchWrapper.style.flexDirection = "row-reverse";
        }

        // Update search icon position
        const searchIcon = document.querySelector(".new-search-icon");
        if (searchIcon) {
            const computedStyle = window.getComputedStyle(searchIcon);
            const left = computedStyle.left;
            if (left !== "auto") {
                searchIcon.style.right = left;
                searchIcon.style.left = "auto";
            }
        }

        // Update search clear button position
        const searchClear = document.querySelector(".new-search-clear");
        if (searchClear) {
            const computedStyle = window.getComputedStyle(searchClear);
            const right = computedStyle.right;
            if (right !== "auto") {
                searchClear.style.left = right;
                searchClear.style.right = "auto";
            }
        }

        // Update search input padding
        const searchInput = document.querySelector(
            ".new-search-input-enhanced"
        );
        if (searchInput) {
            const computedStyle = window.getComputedStyle(searchInput);
            const paddingLeft = computedStyle.paddingLeft;
            const paddingRight = computedStyle.paddingRight;
            if (paddingLeft !== "0px" || paddingRight !== "0px") {
                searchInput.style.paddingLeft = paddingRight;
                searchInput.style.paddingRight = paddingLeft;
            }
        }

        // Update search status
        const searchStatus = document.querySelector(".new-search-status");
        if (searchStatus) {
            searchStatus.style.textAlign = "right";
        }

        // Update toolbar actions
        const toolbarActions = document.querySelector(".new-actions");
        if (toolbarActions) {
            toolbarActions.style.flexDirection = "row-reverse";
        }

        // Update directory items
        const directoryItems = document.querySelectorAll(".new-directory-item");
        directoryItems.forEach((item) => {
            item.style.flexDirection = "row-reverse";
        });

        // Update directory info
        const directoryInfos = document.querySelectorAll(".new-directory-info");
        directoryInfos.forEach((info) => {
            info.style.textAlign = "right";
        });

        // Update breadcrumb
        const breadcrumb = document.querySelector(".new-breadcrumb");
        if (breadcrumb) {
            breadcrumb.style.flexDirection = "row-reverse";
        }

        // Update breadcrumb separators
        const breadcrumbSeparators = document.querySelectorAll(
            ".new-breadcrumb-separator"
        );
        breadcrumbSeparators.forEach((separator) => {
            separator.style.transform = "scaleX(-1)";
        });
    }

    /**
     * Update troubleshooting interface layout for RTL
     */
    updateTroubleshootLayout() {
        // Update troubleshooting header
        const troubleshootTitle = document.querySelector(".troubleshoot-title");
        if (troubleshootTitle) {
            troubleshootTitle.style.flexDirection = "row-reverse";
        }

        const troubleshootProgress = document.querySelector(
            ".troubleshoot-progress"
        );
        if (troubleshootProgress) {
            troubleshootProgress.style.flexDirection = "row-reverse";
        }

        // Update step headers
        const stepHeaders = document.querySelectorAll(".step-header");
        stepHeaders.forEach((header) => {
            header.style.flexDirection = "row-reverse";
        });

        // Update step icons
        const stepIcons = document.querySelectorAll(".step-icon");
        stepIcons.forEach((icon) => {
            const computedStyle = window.getComputedStyle(icon);
            const marginRight = computedStyle.marginRight;
            if (marginRight !== "0px") {
                icon.style.marginLeft = marginRight;
                icon.style.marginRight = "0";
            }
        });

        // Update step status
        const stepStatuses = document.querySelectorAll(".step-status");
        stepStatuses.forEach((status) => {
            const computedStyle = window.getComputedStyle(status);
            const marginLeft = computedStyle.marginLeft;
            if (marginLeft !== "0px") {
                status.style.marginRight = marginLeft;
                status.style.marginLeft = "0";
            }
        });

        // Update step info text alignment
        const stepInfos = document.querySelectorAll(".step-info");
        stepInfos.forEach((info) => {
            info.style.textAlign = "right";
        });

        // Update step messages
        const stepMessages = document.querySelectorAll(".step-message");
        stepMessages.forEach((message) => {
            message.style.flexDirection = "row-reverse";
        });

        // Update troubleshooting actions
        const troubleshootActions = document.querySelector(
            ".troubleshoot-actions"
        );
        if (troubleshootActions) {
            troubleshootActions.style.flexDirection = "row-reverse";
        }

        const troubleshootBtns = document.querySelectorAll(".troubleshoot-btn");
        troubleshootBtns.forEach((btn) => {
            btn.style.flexDirection = "row-reverse";
        });

        // Update summary elements
        const summaryContent = document.querySelector(
            ".troubleshoot-summary-content"
        );
        if (summaryContent) {
            summaryContent.style.textAlign = "right";
        }

        const summaryTitle = document.querySelector(
            ".troubleshoot-summary-content h3"
        );
        if (summaryTitle) {
            summaryTitle.style.flexDirection = "row-reverse";
        }

        const summaryStats = document.querySelector(".summary-stats");
        if (summaryStats) {
            summaryStats.style.flexDirection = "row-reverse";
        }

        const statItems = document.querySelectorAll(".stat-item");
        statItems.forEach((item) => {
            item.style.flexDirection = "row-reverse";
        });

        const summaryRecommendations = document.querySelectorAll(
            ".summary-recommendation"
        );
        summaryRecommendations.forEach((rec) => {
            rec.style.flexDirection = "row-reverse";
        });

        const recommendationSections = document.querySelectorAll(
            ".recommendation-section h4"
        );
        recommendationSections.forEach((section) => {
            section.style.flexDirection = "row-reverse";
        });

        // Update recommendation lists
        const recommendationLists = document.querySelectorAll(
            ".recommendation-section ul"
        );
        recommendationLists.forEach((list) => {
            list.style.paddingLeft = "0";
            list.style.paddingRight = "24px";
        });
    }

    /**
     * Toggle RTL mode manually
     */
    toggleRTL() {
        this.isRTL = !this.isRTL;
        this.setupRTLSupport();
        this.saveRTLSettings();
    }

    /**
     * Save RTL settings to localStorage
     */
    saveRTLSettings() {
        localStorage.setItem("repo-manager-rtl", this.isRTL.toString());
        localStorage.setItem("repo-manager-language", this.currentLanguage);
    }

    /**
     * Load RTL settings from localStorage
     */
    loadRTLSettings() {
        const savedRTL = localStorage.getItem("repo-manager-rtl");
        const savedLanguage = localStorage.getItem("repo-manager-language");

        if (savedRTL !== null) {
            this.isRTL = savedRTL === "true";
        }

        if (savedLanguage) {
            this.currentLanguage = savedLanguage;
        }
    }

    /**
     * Bind events for RTL functionality
     */
    bindEvents() {
        // RTL toggle button (if exists)
        const rtlToggle = document.querySelector(".git-rtl-toggle");
        if (rtlToggle) {
            rtlToggle.addEventListener("click", () => {
                this.toggleRTL();
            });
        }

        // Handle dynamic content loading
        this.observeDOMChanges();

        // Handle window resize
        window.addEventListener("resize", () => {
            this.updateLayout();
        });

        // Handle troubleshooting interface initialization
        this.observeTroubleshootInterface();

        // Handle directory selector interface initialization
        this.observeDirectorySelectorInterface();
    }

    /**
     * Observe DOM changes for dynamic content
     */
    observeDOMChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "childList" &&
                    mutation.addedNodes.length > 0
                ) {
                    // Check if new Repo Manager content was added
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (
                                node.classList &&
                                node.classList.contains("repo-manager-wrap")
                            ) {
                                this.updateLayout();
                            } else if (
                                node.querySelector &&
                                node.querySelector(".repo-manager-wrap")
                            ) {
                                this.updateLayout();
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    /**
     * Observe troubleshooting interface for dynamic updates
     */
    observeTroubleshootInterface() {
        const troubleshootObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "childList" &&
                    mutation.addedNodes.length > 0
                ) {
                    // Check if troubleshooting interface was added or updated
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (
                                node.classList &&
                                (node.classList.contains(
                                    "troubleshoot-container"
                                ) ||
                                    node.classList.contains(
                                        "troubleshoot-step"
                                    ))
                            ) {
                                this.updateTroubleshootLayout();
                            } else if (
                                node.querySelector &&
                                node.querySelector(".troubleshoot-container")
                            ) {
                                this.updateTroubleshootLayout();
                            }
                        }
                    });
                }
            });
        });

        // Observe the entire document for troubleshooting interface changes
        troubleshootObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    /**
     * Observe directory selector interface for dynamic updates
     */
    observeDirectorySelectorInterface() {
        const directorySelectorObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "childList" &&
                    mutation.addedNodes.length > 0
                ) {
                    // Check if directory selector interface was added or updated
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (
                                node.classList &&
                                (node.classList.contains(
                                    "new-directory-selector-modal"
                                ) ||
                                    node.classList.contains(
                                        "new-directory-browser"
                                    ))
                            ) {
                                this.updateDirectorySelectorLayout();
                            } else if (
                                node.querySelector &&
                                node.querySelector(
                                    ".new-directory-selector-modal"
                                )
                            ) {
                                this.updateDirectorySelectorLayout();
                            }
                        }
                    });
                }
            });
        });

        // Observe the entire document for directory selector interface changes
        directorySelectorObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    /**
     * Get current RTL status
     */
    isRTLActive() {
        return this.isRTL;
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Set specific language and RTL
     */
    setLanguage(language) {
        this.currentLanguage = language;
        this.detectLanguage();
        this.setupRTLSupport();
        this.saveRTLSettings();
    }
}

// Initialize RTL support when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    window.gitManagerRTL = new GitManagerRTL();
});

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = GitManagerRTL;
}
