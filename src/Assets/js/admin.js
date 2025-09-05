/**
 * Repo Manager- Modern JavaScript Framework
 * A comprehensive, modern JavaScript implementation for the Repo Manager Plugin
 */

// Handle unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {});

// Global error handler
window.addEventListener("error", (event) => {});

/**
 * Helper function to safely access WPGitManagerGlobal translations
 * @param {string} key - The translation key
 * @param {string} fallback - Fallback text if translation is not available
 * @returns {string} The translation or fallback
 */
function getTranslation(key, fallback = "") {
    if (
        typeof WPGitManagerGlobal !== "undefined" &&
        WPGitManagerGlobal.translations &&
        WPGitManagerGlobal.translations[key]
    ) {
        return WPGitManagerGlobal.translations[key];
    }
    return fallback;
}

class GitManager {
    constructor() {
        this.currentRepo = null;
        this.detailsRequestSeq = 0;
        this.detailsAbortController = null;
        this.modals = new Map();
        this.notifications = [];
        this.directorySelectorTarget = "#add-repo-path";
        // Initialize theme from storage (defaults handled in getStoredTheme)
        this.theme = this.getStoredTheme();
        this.init();
    }

    init() {
        try {
            // Check if AJAX data is available before proceeding
            if (typeof gitManagerAjax === "undefined") {
                return;
            }

            this.setupEventListeners();
            this.setupTheme();
            this.ensureProperDisplayStates();
            this.loadRepositories();
            this.setupKeyboardShortcuts();
            this.setupAnimations();

            // Ensure buttons are properly functional
            setTimeout(() => {
                this.ensureButtonFunctionality();
            }, 100);

            // Set up periodic button functionality check
            setInterval(() => {
                this.ensureButtonFunctionality();
            }, 5000); // Check every 5 seconds
        } catch (error) {}
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Global event delegation
        document.addEventListener("click", (e) => this.handleGlobalClick(e));
        document.addEventListener("keydown", (e) =>
            this.handleGlobalKeydown(e)
        );

        // Window events
        window.addEventListener(
            "resize",
            this.debounce(() => this.handleResize(), 250)
        );

        // Form submissions
        document.addEventListener("submit", (e) => this.handleFormSubmit(e));

        // Modal backdrop clicks
        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("git-modal-overlay")) {
                this.closeModal(e.target.dataset.modalId);
            }
        });
    }

    /**
     * Handle global click events with delegation
     */
    handleGlobalClick(e) {
        const target = e.target;

        // Clone repository button - improved detection
        const cloneBtn = target.closest(".git-clone-btn, .git-sidebar-add-btn");
        if (cloneBtn) {
            e.preventDefault();
            e.stopPropagation();

            // Add visual feedback
            cloneBtn.style.transform = "scale(0.95)";
            setTimeout(() => {
                cloneBtn.style.transform = "";
            }, 150);

            this.showAddRepositorySection();
            return;
        }

        // Troubleshoot button
        if (target.matches(".git-troubleshoot-btn")) {
            e.preventDefault();
            this.showTroubleshooting();
            return;
        }

        // Theme switcher (support clicks on icon/svg inside the button)
        const themeSwitcher = target.closest(".git-theme-switcher");
        if (themeSwitcher) {
            e.preventDefault();
            this.toggleTheme();
            return;
        }

        // Action buttons - must come before repository card clicks
        const actionBtn = target.closest(".git-action-btn");
        if (actionBtn) {
            const action = actionBtn.dataset.action;
            if (action) {
                e.preventDefault();
                this.handleAction(action, actionBtn);
                return;
            }
        }

        // Modal close buttons
        if (target.matches(".git-modal-close")) {
            e.preventDefault();
            const modal = target.closest(".git-modal-overlay");
            if (modal) {
                this.closeModal(modal.dataset.modalId);
            }
            return;
        }

        // Tab navigation
        if (target.matches(".git-repo-tab")) {
            e.preventDefault();
            this.switchTab(target.dataset.tab);
            return;
        }

        // Repository card clicks - must come after action buttons
        if (target.closest(".git-repo-card")) {
            // Only select repository if clicking on the card itself, not on buttons
            if (!target.matches("button") && !target.closest("button")) {
                const card = target.closest(".git-repo-card");
                const repoId = card.dataset.repoId;

                this.selectRepository(repoId);
                return;
            }
        }

        // Browse path button
        if (target.matches("#browse-path-btn")) {
            e.preventDefault();
            this.browsePath(this.directorySelectorTarget);
            return;
        }

        // Cancel clone button
        if (target.matches("#cancel-clone-btn")) {
            e.preventDefault();
            this.closeModal("clone");
            return;
        }

        // Back to welcome button
        if (target.matches("#back-to-welcome")) {
            e.preventDefault();
            this.hideAddRepositorySection();
            return;
        }

        // Cancel add repository button
        if (target.matches("#cancel-add-repo")) {
            e.preventDefault();
            this.hideAddRepositorySection();
            return;
        }

        // Cancel directory selector button
        if (target.matches("#cancel-directory-selector-btn")) {
            e.preventDefault();
            this.closeModal("directory-selector");
            return;
        }

        // Directory item clicks
        if (target.closest(".directory-item.selectable")) {
            const directoryItem = target.closest(".directory-item.selectable");
            const path = directoryItem.dataset.directoryPath;
            if (path) {
                e.preventDefault();
                this.selectDirectory(path);
                return;
            }
        }
    }

    /**
     * Handle global keyboard shortcuts
     */
    handleGlobalKeydown(e) {
        // Escape key closes modals
        if (e.key === "Escape") {
            this.closeAllModals();
        }

        // Ctrl/Cmd + N for new repository
        if ((e.ctrlKey || e.metaKey) && e.key === "n") {
            e.preventDefault();
            this.showCloneModal();
        }

        // Ctrl/Cmd + K for search (future feature)
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
            e.preventDefault();
            this.focusSearch();
        }

        // Ctrl/Cmd + T for theme toggle
        if ((e.ctrlKey || e.metaKey) && e.key === "t") {
            e.preventDefault();
            this.toggleTheme();
        }
    }

    /**
     * Handle form submissions
     */
    handleFormSubmit(e) {
        const form = e.target;

        if (form.id === "clone-form") {
            e.preventDefault();
            this.handleCloneSubmit(form);
        } else if (form.id === "add-repo-form") {
            e.preventDefault();
            this.handleAddRepositorySubmit(form);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Adjust modal positions and sizes
        this.modals.forEach((modal) => {
            if (modal.isOpen) {
                this.positionModal(modal);
            }
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        // Add keyboard shortcut hints to buttons
        document.querySelectorAll(".git-clone-btn").forEach((btn) => {
            btn.title = WPGitManagerGlobal.translations.addRepositoryTooltip;
        });

        document.querySelectorAll(".git-theme-switcher").forEach((btn) => {
            btn.title = WPGitManagerGlobal.translations.toggleThemeTooltip;
        });
    }

    /**
     * Ensure buttons are properly initialized and clickable
     */
    ensureButtonFunctionality() {
        // Ensure clone and add buttons are properly set up
        const cloneButtons = document.querySelectorAll(
            ".git-clone-btn, .git-sidebar-add-btn"
        );
        cloneButtons.forEach((btn) => {
            // Ensure proper styling
            btn.style.pointerEvents = "auto";
            btn.style.cursor = "pointer";
            btn.style.position = "relative";
            btn.style.zIndex = "10";

            // Remove any conflicting event listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            // Add visual feedback on hover
            newBtn.addEventListener("mouseenter", () => {
                newBtn.style.transform = "translateY(-1px)";
            });

            newBtn.addEventListener("mouseleave", () => {
                newBtn.style.transform = "";
            });

            // Add fallback click handler
            newBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAddRepositorySection();
            });
        });
    }

    /**
     * Setup animations and transitions
     */
    setupAnimations() {
        // Add intersection observer for fade-in animations
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("animate-in");
                    }
                });
            },
            { threshold: 0.1 }
        );

        // Observe elements for animation
        document
            .querySelectorAll(".git-repo-card, .repo-info-item")
            .forEach((el) => {
                observer.observe(el);
            });
    }

    /**
     * Theme Management
     */
    setupTheme() {
        document.documentElement.setAttribute("data-theme", this.theme);
        this.updateThemeUI();
    }

    getStoredTheme() {
        return localStorage.getItem("repo-manager-theme") || "light";
    }

    toggleTheme() {
        this.theme = this.theme === "light" ? "dark" : "light";
        localStorage.setItem("repo-manager-theme", this.theme);
        document.documentElement.setAttribute("data-theme", this.theme);
        this.updateThemeUI();
        this.showNotification(
            WPGitManagerGlobal.translations.themeChanged,
            "success"
        );
    }

    updateThemeUI() {
        const themeSwitchers = document.querySelectorAll(".git-theme-switcher");
        themeSwitchers.forEach((switcher) => {
            const icon = switcher.querySelector("svg");
            if (icon) {
                icon.innerHTML =
                    this.theme === "light"
                        ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'
                        : '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';
            }
        });
    }

    /**
     * Modal Management
     */
    showCloneModal() {
        const modalHTML = this.createCloneModalHTML();
        this.showModal("clone", modalHTML);
    }

    showModal(id, content) {
        // Remove existing modal if present
        this.closeModal(id);

        const modalHTML = `
            <div class="git-modal-overlay" data-modal-id="${id}">
                ${content}
            </div>
        `;

        const modalTemplate = document.createElement("template");
        modalTemplate.innerHTML = modalHTML.trim();
        const modal = modalTemplate.content.firstChild;

        document.body.appendChild(modal);
        this.modals.set(id, { element: modal, isOpen: true });

        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector("input, select, textarea");
            if (firstInput) firstInput.focus();
        }, 100);

        // Prevent body scroll
        document.body.style.overflow = "hidden";

        // Setup URL auto-fill for clone modal
        if (id === "clone") {
            this.setupUrlAutoFill(modal);
            this.setupCloneFormAuthInteractions();
        }

        return modal;
    }

    closeModal(id) {
        const modal = document.querySelector(`[data-modal-id="${id}"]`);
        if (modal) {
            modal.classList.add("closing");
            setTimeout(() => {
                modal.remove();
                this.modals.delete(id);

                // Re-enable body scroll if no modals are open
                if (this.modals.size === 0) {
                    document.body.style.overflow = "";
                }
            }, 200);
        }
    }

    closeAllModals() {
        this.modals.forEach((modal, id) => {
            this.closeModal(id);
        });
    }

    positionModal(modal) {
        // Ensure modal is properly positioned
        const modalElement = modal.element;
        if (modalElement) {
            modalElement.style.display = "flex";
        }
    }

    /**
     * Setup URL auto-fill functionality for clone modal
     */
    setupUrlAutoFill(modal) {
        const urlInput = modal.querySelector("#clone-repo-url");
        const pathInput = modal.querySelector("#clone-repo-path");
        const branchInput = modal.querySelector("#clone-repo-branch");

        if (urlInput) {
            // Add event listener for URL input changes
            urlInput.addEventListener("input", (e) => {
                this.handleUrlInput(e.target.value, pathInput, branchInput);
            });

            // Also handle paste events
            urlInput.addEventListener("paste", (e) => {
                setTimeout(() => {
                    this.handleUrlInput(e.target.value, pathInput, branchInput);
                }, 10);
            });
        }

        // Track manual edits to prevent overwriting user input
        if (pathInput) {
            pathInput.addEventListener("input", (e) => {
                if (e.target.value && e.target.dataset.autoFilled === "true") {
                    e.target.dataset.autoFilled = "false";
                    this.removeAutoFilledIndicator(e.target);
                }
            });
        }

        if (branchInput) {
            branchInput.addEventListener("input", (e) => {
                if (e.target.value && e.target.dataset.autoFilled === "true") {
                    e.target.dataset.autoFilled = "false";
                    this.removeAutoFilledIndicator(e.target);
                }
            });
        }
    }

    /**
     * Handle URL input and auto-populate other fields
     */
    handleUrlInput(url, pathInput, branchInput) {
        if (!url || !url.trim()) {
            return;
        }

        const parsedData = this.parseGitUrl(url.trim());

        if (parsedData) {
            // Auto-populate path if it's empty or user hasn't manually edited it
            if (
                pathInput &&
                (!pathInput.value || pathInput.dataset.autoFilled === "true")
            ) {
                pathInput.value = parsedData.suggestedPath;
                pathInput.dataset.autoFilled = "true";
                this.addAutoFilledIndicator(pathInput);
            }

            // Auto-populate branch if it's empty or user hasn't manually edited it
            if (
                branchInput &&
                (!branchInput.value ||
                    branchInput.dataset.autoFilled === "true")
            ) {
                branchInput.value = parsedData.defaultBranch;
                branchInput.dataset.autoFilled = "true";
                this.addAutoFilledIndicator(branchInput);
            }

            // Show a subtle notification that fields were auto-filled
            if (parsedData.suggestedPath || parsedData.defaultBranch) {
                this.showAutoFillNotification(parsedData);
            }
        } else {
            // URL couldn't be parsed - show helpful message
            this.showUrlParseError(url);
        }
    }

    /**
     * Parse Git repository URL and extract useful information
     */
    parseGitUrl(url) {
        try {
            // Clean the URL first
            url = url.trim();

            // Handle SSH URLs (git@github.com:user/repo.git)
            if (url.startsWith("git@")) {
                return this.parseSshUrl(url);
            }

            // Handle HTTPS URLs (https://github.com/user/repo.git)
            if (url.startsWith("http")) {
                return this.parseHttpsUrl(url);
            }

            // Handle other formats
            return this.parseGenericUrl(url);
        } catch (error) {
            return null;
        }
    }

    /**
     * Parse SSH URL format: git@github.com:user/repo.git
     */
    parseSshUrl(url) {
        const sshPattern = /^git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/;
        const match = url.match(sshPattern);

        if (match) {
            const [, host, user, repo] = match;
            const repoName = repo.replace(/\.git$/, "");

            // Determine suggested path based on host and repo name
            let suggestedPath = `wp-content/plugins/${repoName}`;
            if (host.includes("theme") || repoName.includes("theme")) {
                suggestedPath = `wp-content/themes/${repoName}`;
            } else if (
                host.includes("mu-plugin") ||
                repoName.includes("mu-plugin")
            ) {
                suggestedPath = `wp-content/mu-plugins/${repoName}`;
            } else if (
                repoName.includes("wordpress") ||
                repoName.includes("wp-")
            ) {
                // WordPress core or related repositories
                suggestedPath = `wp-content/plugins/${repoName}`;
            }

            return {
                host: host,
                user: user,
                repo: repoName,
                suggestedPath: suggestedPath,
                defaultBranch: this.getDefaultBranch(host),
                type: "ssh",
            };
        }

        return null;
    }

    /**
     * Parse HTTPS URL format: https://github.com/user/repo.git
     */
    parseHttpsUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split("/").filter((part) => part);

            if (pathParts.length >= 2) {
                const user = pathParts[0];
                const repo = pathParts[1].replace(/\.git$/, "");

                // Determine suggested path based on host and repo name
                let suggestedPath = `wp-content/plugins/${repo}`;
                if (
                    urlObj.hostname.includes("theme") ||
                    repo.includes("theme")
                ) {
                    suggestedPath = `wp-content/themes/${repo}`;
                } else if (
                    urlObj.hostname.includes("mu-plugin") ||
                    repo.includes("mu-plugin")
                ) {
                    suggestedPath = `wp-content/mu-plugins/${repo}`;
                } else if (repo.includes("wordpress") || repo.includes("wp-")) {
                    // WordPress core or related repositories
                    suggestedPath = `wp-content/plugins/${repo}`;
                }

                return {
                    host: urlObj.hostname,
                    user: user,
                    repo: repo,
                    suggestedPath: suggestedPath,
                    defaultBranch: this.getDefaultBranch(urlObj.hostname),
                    type: "https",
                };
            }
        } catch (error) {}

        return null;
    }

    /**
     * Parse generic URL formats
     */
    parseGenericUrl(url) {
        // Try to extract repository name from various formats
        const repoNameMatch = url.match(/([^/]+?)(?:\.git)?$/);
        if (repoNameMatch) {
            const repoName = repoNameMatch[1];

            // Determine suggested path based on repo name
            let suggestedPath = `wp-content/plugins/${repoName}`;
            if (repoName.includes("theme")) {
                suggestedPath = `wp-content/themes/${repoName}`;
            } else if (repoName.includes("mu-plugin")) {
                suggestedPath = `wp-content/mu-plugins/${repoName}`;
            } else if (
                repoName.includes("wordpress") ||
                repoName.includes("wp-")
            ) {
                // WordPress core or related repositories
                suggestedPath = `wp-content/plugins/${repoName}`;
            }

            return {
                repo: repoName,
                suggestedPath: suggestedPath,
                defaultBranch: "main",
                type: "generic",
            };
        }

        return null;
    }

    /**
     * Get default branch based on host
     */
    getDefaultBranch(host) {
        // GitHub, GitLab, Bitbucket typically use 'main' as default now
        const modernHosts = ["github.com", "gitlab.com", "bitbucket.org"];
        return modernHosts.includes(host) ? "main" : "master";
    }

    /**
     * Show notification when fields are auto-filled
     */
    showAutoFillNotification(parsedData) {
        const messages = [];

        if (parsedData.suggestedPath) {
            messages.push(`Path: ${parsedData.suggestedPath}`);
        }

        if (parsedData.defaultBranch) {
            messages.push(`Branch: ${parsedData.defaultBranch}`);
        }

        if (messages.length > 0) {
            this.showNotification(
                `Auto-filled: ${messages.join(", ")}`,
                "info",
                { duration: 3000 }
            );
        }
    }

    /**
     * Show error when URL cannot be parsed
     */
    showUrlParseError(url) {
        // Only show error for URLs that look like they might be Git URLs
        if (
            url.includes("github.com") ||
            url.includes("gitlab.com") ||
            url.includes("bitbucket.org") ||
            url.startsWith("git@")
        ) {
            this.showNotification(
                WPGitManagerGlobal.translations.unableToParseGitURL,
                "warning",
                { duration: 4000 }
            );
        }
    }

    /**
     * Test URL parsing functionality (debugging removed)
     */
    testUrlParsing() {
        const testUrls = [
            "https://github.com/user/my-plugin.git",
            "git@github.com:user/my-theme.git",
            "https://gitlab.com/user/mu-plugin.git",
            "https://bitbucket.org/user/wordpress-plugin.git",
            "https://github.com/user/wp-custom-plugin.git",
        ];

        testUrls.forEach((url) => {
            const result = this.parseGitUrl(url);
        });
    }

    /**
     * Add visual indicator for auto-filled fields
     */
    addAutoFilledIndicator(input) {
        // Add a subtle visual indicator
        input.classList.add("auto-filled");

        // Add a small icon or indicator
        const parent = input.parentElement;
        if (parent && !parent.querySelector(".auto-fill-indicator")) {
            const indicator = document.createElement("span");
            indicator.className = "auto-fill-indicator";
            indicator.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                    <path d="M20 6 9 17l-5-5"/>
                </svg>
            `;
            indicator.title = "Auto-filled from repository URL";
            parent.appendChild(indicator);
        }
    }

    /**
     * Remove auto-filled indicator when user manually edits
     */
    removeAutoFilledIndicator(input) {
        input.classList.remove("auto-filled");
        const parent = input.parentElement;
        if (parent) {
            const indicator = parent.querySelector(".auto-fill-indicator");
            if (indicator) {
                indicator.remove();
            }
        }
    }

    /**
     * Setup URL auto-fill for the existing repository form
     */
    setupExistingFormUrlAutoFill() {
        const urlInput = document.getElementById("add-repo-url");
        const pathInput = document.getElementById("add-repo-path");
        const branchInput = document.getElementById("add-repo-branch");

        if (urlInput) {
            // Add event listener for URL input changes
            urlInput.addEventListener("input", (e) => {
                this.handleUrlInput(e.target.value, pathInput, branchInput);
            });

            // Also handle paste events
            urlInput.addEventListener("paste", (e) => {
                setTimeout(() => {
                    this.handleUrlInput(e.target.value, pathInput, branchInput);
                }, 10);
            });
        }

        // Track manual edits to prevent overwriting user input
        if (pathInput) {
            pathInput.addEventListener("input", (e) => {
                if (e.target.value && e.target.dataset.autoFilled === "true") {
                    e.target.dataset.autoFilled = "false";
                    this.removeAutoFilledIndicator(e.target);
                }
            });
        }

        if (branchInput) {
            branchInput.addEventListener("input", (e) => {
                if (e.target.value && e.target.dataset.autoFilled === "true") {
                    e.target.dataset.autoFilled = "false";
                    this.removeAutoFilledIndicator(e.target);
                }
            });
        }
    }

    /**
     * Setup clone form authentication interactions
     */
    setupCloneFormAuthInteractions() {
        const privateRepoCheckbox =
            document.getElementById("clone-private-repo");
        const authTypeSection = document.getElementById("auth-type-section");
        const authTypeRadios = document.querySelectorAll(
            'input[name="auth_type"]'
        );
        const sshAuthFields = document.getElementById("ssh-auth-fields");
        const httpsAuthFields = document.getElementById("https-auth-fields");
        const tokenInput = document.getElementById("clone-token");
        const toggleTokenBtn = document.getElementById(
            "toggle-token-visibility"
        );

        // Private repository toggle
        if (privateRepoCheckbox) {
            privateRepoCheckbox.addEventListener("change", (e) => {
                if (e.target.checked) {
                    authTypeSection.style.display = "block";
                    this.showAuthFields();
                } else {
                    authTypeSection.style.display = "none";
                    sshAuthFields.style.display = "none";
                    httpsAuthFields.style.display = "none";
                }
            });
        }

        // Authentication type selection
        authTypeRadios.forEach((radio) => {
            radio.addEventListener("change", (e) => {
                this.showAuthFields();
            });
        });

        // Token visibility toggle
        if (toggleTokenBtn && tokenInput) {
            toggleTokenBtn.addEventListener("click", () => {
                const type =
                    tokenInput.type === "password" ? "text" : "password";
                tokenInput.type = type;

                const icon = toggleTokenBtn.querySelector("svg");
                if (type === "text") {
                    icon.innerHTML = `
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                    `;
                } else {
                    icon.innerHTML = `
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    `;
                }
            });
        }
    }

    /**
     * Show appropriate authentication fields based on selected method
     */
    showAuthFields() {
        const selectedAuthType = document.querySelector(
            'input[name="auth_type"]:checked'
        );
        const sshAuthFields = document.getElementById("ssh-auth-fields");
        const httpsAuthFields = document.getElementById("https-auth-fields");

        if (!selectedAuthType) return;

        if (selectedAuthType.value === "ssh") {
            sshAuthFields.style.display = "block";
            httpsAuthFields.style.display = "none";
        } else if (selectedAuthType.value === "https") {
            sshAuthFields.style.display = "none";
            httpsAuthFields.style.display = "block";
        }
    }

    /**
     * Show SSH key generation help modal
     */
    showSSHHelp() {
        const modal = document.createElement("div");
        modal.className = "git-modal-overlay";
        modal.id = "ssh-help-modal";
        modal.innerHTML = `
            <div class="git-modal-content git-modal-large">
                <div class="git-modal-header">
                    <h3>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: relative;top: 2px;margin-right: 5px;"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"></path><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle></svg>
                     SSH Key Generation Guide
                     </h3>
                    <button class="git-modal-close" onclick="closeSSHHelp()">x</button>
                </div>
                <div class="git-modal-body">
                    <div class="help-content">
                        <div class="help-section">
                            <h4>Generate SSH Key</h4>
                            <div class="code-block">
                                <code>ssh-keygen -t ed25519 -C "your_email@example.com"</code>
                            </div>
                            <p>This creates a new SSH key pair. Press Enter to accept the default file location.</p>
                        </div>

                        <div class="help-section">
                            <h4>Add SSH Key to SSH Agent</h4>
                            <div class="code-block">
                                <code>ssh-add ~/.ssh/id_ed25519</code>
                            </div>
                        </div>

                        <div class="help-section">
                            <h4>Copy Public Key</h4>
                            <div class="code-block">
                                <code>cat ~/.ssh/id_ed25519.pub</code>
                            </div>
                            <p>Copy the output and add it to your Git hosting service (GitHub, GitLab, etc.)</p>
                        </div>

                        <div class="help-section">
                            <h4>Copy Private Key</h4>
                            <div class="code-block">
                                <code>cat ~/.ssh/id_ed25519</code>
                            </div>
                            <p>Copy the entire private key content (including BEGIN and END lines) and paste it in the SSH Private Key field above.</p>
                        </div>
                    </div>
                </div>
                <div class="git-modal-footer">
                    <button class="git-action-btn git-secondary-btn" onclick="closeSSHHelp()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Close SSH help modal
     */
    closeSSHHelp() {
        const modal = document.getElementById("ssh-help-modal");
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Import SSH key from file
     */
    importSSHKey() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pem,.key,.txt,text/plain";
        input.style.display = "none";

        input.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    // Try to find SSH key input in both clone modal and add repository form
                    let sshKeyInput = document.getElementById("clone-ssh-key");
                    if (!sshKeyInput) {
                        sshKeyInput = document.getElementById("add-ssh-key");
                    }

                    if (sshKeyInput) {
                        sshKeyInput.value = e.target.result;

                        // Trigger change event to update any validation
                        const event = new Event("input", { bubbles: true });
                        sshKeyInput.dispatchEvent(event);

                        // Show success notification
                        this.showNotification(
                            WPGitManagerGlobal.translations
                                .sshKeyImportedSuccessfully,
                            "success"
                        );
                    } else {
                        this.showNotification(
                            WPGitManagerGlobal.translations.sshKeyInputNotFound,
                            "error"
                        );
                    }
                };

                reader.onerror = () => {
                    this.showNotification(
                        WPGitManagerGlobal.translations.failedToReadSSHKeyFile,
                        "error"
                    );
                };

                reader.readAsText(file);
            }
        });

        // Clean up any existing file input
        const existingInput = document.querySelector(
            'input[type="file"][accept*=".pem"]'
        );
        if (existingInput) {
            existingInput.remove();
        }

        document.body.appendChild(input);
        input.click();

        // Clean up after a delay to ensure the file dialog has opened
        setTimeout(() => {
            if (document.body.contains(input)) {
                document.body.removeChild(input);
            }
        }, 1000);
    }

    /**
     * Show token creation help modal
     */
    showTokenHelp() {
        const modal = document.createElement("div");
        modal.className = "git-modal-overlay";
        modal.id = "token-help-modal";
        modal.innerHTML = `
            <div class="git-modal-content git-modal-large">
                <div class="git-modal-header">
                    <h3><span class="dashicons dashicons-lock"></span> Personal Access Token Guide</h3>
                    <button class="git-modal-close" onclick="GitManager.closeTokenHelp()">x</button>
                </div>
                <div class="git-modal-body">
                    <div class="help-content">
                        <div class="help-section">
                            <h4>GitHub</h4>
                            <ol>
                                <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                                <li>Click "Generate new token". Select scopes (e.g., \`repo\`).</li>
                                <li>Generate the token and copy it.</li>
                            </ol>
                        </div>

                        <div class="help-section">
                            <h4>GitLab</h4>
                            <ol>
                                <li>Go to GitLab User Settings → Access Tokens</li>
                                <li>Create a token with \`read_repository\` and \`write_repository\` scopes.</li>
                                <li>Copy the generated token.</li>
                            </ol>
                        </div>

                        <div class="help-section">
                            <h4>Bitbucket</h4>
                            <ol>
                                <li>Go to Bitbucket Settings → App passwords</li>
                                <li>Create an app password with \`Read\` and \`Write\` permissions for repositories.</li>
                                <li>Copy the generated password.</li>
                            </ol>
                        </div>
                    </div>
                </div>
                <div class="git-modal-footer">
                    <button class="git-action-btn git-secondary-btn" onclick="GitManager.closeTokenHelp()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Close token help modal
     */
    closeTokenHelp() {
        const modal = document.getElementById("token-help-modal");
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Clear SSH key from input fields
     */
    clearSSHKey() {
        // Try to find SSH key input in both clone modal and add repository form
        let sshKeyInput = document.getElementById("clone-ssh-key");
        if (!sshKeyInput) {
            sshKeyInput = document.getElementById("add-ssh-key");
        }

        if (sshKeyInput) {
            sshKeyInput.value = "";

            // Trigger change event to update any validation
            const event = new Event("input", { bubbles: true });
            sshKeyInput.dispatchEvent(event);

            // Show success notification
            this.showNotification(
                WPGitManagerGlobal.translations.sshKeyCleared,
                "success"
            );
        } else {
            this.showNotification(
                WPGitManagerGlobal.translations.sshKeyInputNotFound,
                "error"
            );
        }
    }

    /**
     * Setup add repository form authentication interactions
     */
    setupAddRepositoryAuthInteractions() {
        const privateRepoCheckbox = document.getElementById("add-private-repo");
        const existingRepoCheckbox =
            document.getElementById("add-existing-repo");
        const authTypeSection = document.getElementById(
            "add-auth-type-section"
        );
        const authTypeRadios = document.querySelectorAll(
            'input[name="auth_type"]'
        );
        const sshAuthFields = document.getElementById("add-ssh-auth-fields");
        const httpsAuthFields = document.getElementById(
            "add-https-auth-fields"
        );
        const tokenInput = document.getElementById("add-token");
        const toggleTokenBtn = document.getElementById(
            "toggle-add-token-visibility"
        );
        const urlInput = document.getElementById("add-repo-url");

        // Existing repository toggle
        if (existingRepoCheckbox) {
            existingRepoCheckbox.addEventListener("change", (e) => {
                if (e.target.checked) {
                    // Make URL field optional for existing repositories
                    if (urlInput) {
                        urlInput.removeAttribute("required");
                        urlInput.placeholder =
                            "Optional for existing repositories";
                    }
                } else {
                    // Make URL field required for new repositories
                    if (urlInput) {
                        urlInput.setAttribute("required", "required");
                        urlInput.placeholder =
                            "https://github.com/user/repo.git";
                    }
                }
            });
        }

        // Private repository toggle
        if (privateRepoCheckbox) {
            privateRepoCheckbox.addEventListener("change", (e) => {
                if (e.target.checked) {
                    authTypeSection.style.display = "block";
                    this.showAddAuthFields();
                } else {
                    authTypeSection.style.display = "none";
                    sshAuthFields.style.display = "none";
                    httpsAuthFields.style.display = "none";
                }
            });
        }

        // Authentication type selection
        authTypeRadios.forEach((radio) => {
            radio.addEventListener("change", (e) => {
                this.showAddAuthFields();
            });
        });

        // Token visibility toggle
        if (toggleTokenBtn && tokenInput) {
            toggleTokenBtn.addEventListener("click", () => {
                const type =
                    tokenInput.type === "password" ? "text" : "password";
                tokenInput.type = type;

                const icon = toggleTokenBtn.querySelector("svg");
                if (type === "text") {
                    icon.innerHTML = `
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                    `;
                } else {
                    icon.innerHTML = `
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    `;
                }
            });
        }
    }

    /**
     * Show appropriate authentication fields for add repository form
     */
    showAddAuthFields() {
        const selectedAuthType = document.querySelector(
            'input[name="auth_type"]:checked'
        );
        const sshAuthFields = document.getElementById("add-ssh-auth-fields");
        const httpsAuthFields = document.getElementById(
            "add-https-auth-fields"
        );

        if (!selectedAuthType) return;

        if (selectedAuthType.value === "ssh") {
            sshAuthFields.style.display = "block";
            httpsAuthFields.style.display = "none";
        } else if (selectedAuthType.value === "https") {
            sshAuthFields.style.display = "none";
            httpsAuthFields.style.display = "block";
        }
    }

    /**
     * Create Clone Modal HTML
     */
    createCloneModalHTML() {
        return `
            <div class="git-modal-content git-clone-modal">
                <div class="git-modal-header git-clone-modal-header">
                    <h3>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" style="margin-right: 8px;">
                            <path d="M5 12h14"/>
                            <path d="M12 5v14"/>
                        </svg>
                        Add Repository
                    </h3>
                    <button class="git-modal-close" aria-label="Close modal">x</button>
                </div>

                <div class="git-modal-body">
                    <form id="clone-form" class="git-clone-form">
                        <!-- Repository Information Section -->
                        <div class="form-section">
                            <h4 class="form-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                </svg>
                                Repository Information
                            </h4>

                            <div class="form-group">
                                <label for="clone-repo-url">Repository URL</label>
                                <input
                                    type="text"
                                    id="clone-repo-url"
                                    name="repo_url"
                                    class="form-control"
                                    placeholder="https://github.com/user/repo.git or git@github.com:user/repo.git"
                                    required
                                    autocomplete="off"
                                >
                                <div class="form-help">Enter the Git repository URL (HTTPS or SSH) - fields will auto-populate</div>
                            </div>

                            <div class="form-group">
                                <label for="clone-repo-path">Local Path</label>
                                <div class="input-group">
                                    <input
                                        type="text"
                                        id="clone-repo-path"
                                        name="repo_path"
                                        class="form-control"
                                        placeholder="wp-content/plugins"
                                        required
                                    >
                                    <button type="button" class="git-action-btn git-secondary-btn" id="browse-path-btn">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                                        </svg>
                                        Browse
                                    </button>
                                </div>
                                <div class="form-help">Select the parent directory where the repository will be cloned</div>
                            </div>

                            <div class="form-group">
                                <label for="clone-repo-branch">Branch (Optional)</label>
                                <input
                                    type="text"
                                    id="clone-repo-branch"
                                    name="repo_branch"
                                    class="form-control"
                                    placeholder="main"
                                >
                                <div class="form-help">Specify a branch to checkout (defaults to main/master)</div>
                            </div>
                        </div>

                        <!-- Authentication Section -->
                        <div class="form-section">
                            <h4 class="form-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                    <path d="M15 7h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3"/>
                                    <path d="M10 11l4 4-4 4"/>
                                    <path d="M14 15H9a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h5"/>
                                </svg>
                                Authentication
                            </h4>

                            <div class="form-group">
                                <label class="switch-label">
                                    <span class="switch-text">This is a private repository</span>
                                    <div class="switch-container">
                                        <input type="checkbox" id="clone-private-repo" name="private_repo" class="switch-input">
                                        <span class="switch-slider"></span>
                                    </div>
                                </label>
                                <div class="form-help">Enable if the repository requires authentication</div>
                            </div>

                            <!-- Authentication Type Selection -->
                            <div id="auth-type-section" class="form-group" style="display: none;">
                                <label>Authentication Method</label>
                                <div class="auth-method-selector">
                                    <label class="auth-method-option">
                                        <input type="radio" name="auth_type" value="ssh" checked>
                                        <div class="auth-method-card">
                                            <div class="auth-method-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>
                                            </div>
                                            <div class="auth-method-content">
                                                <h5>SSH Key</h5>
                                                <p>Use SSH private key for authentication</p>
                                            </div>
                                        </div>
                                    </label>

                                    <label class="auth-method-option">
                                        <input type="radio" name="auth_type" value="https">
                                        <div class="auth-method-card">
                                            <div class="auth-method-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.34V5a3 3 0 0 0 3 3"/><path d="M11 21.95V18a2 2 0 0 0-2-2 2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"/><path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"/><path d="M12 2a10 10 0 1 0 9.54 13"/><path d="M20 6V4a2 2 0 1 0-4 0v2"/><rect width="8" height="5" x="14" y="6" rx="1"/></svg>
                                            </div>
                                            <div class="auth-method-content">
                                                <h5>HTTPS Token</h5>
                                                <p>Use username and personal access token</p>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <!-- SSH Authentication Fields -->
                            <div id="ssh-auth-fields" class="auth-fields" style="display: none;">
                                <div class="form-group">
                                    <label for="clone-ssh-key">SSH Private Key</label>
                                    <div class="ssh-key-input-group">
                                        <textarea
                                            id="clone-ssh-key"
                                            name="private_key"
                                            class="form-control"
                                            rows="8"
                                            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;Your SSH private key content here...&#10;-----END OPENSSH PRIVATE KEY-----"
                                        ></textarea>
                                        <div class="ssh-key-actions">
                                            <button type="button" class="ssh-key-action-btn" onclick="importSSHKey()" title="Import SSH key from file">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                    <polyline points="7,10 12,15 17,10"/>
                                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                                </svg>
                                                Import
                                            </button>
                                            <button type="button" class="ssh-key-action-btn" onclick="clearSSHKey()" title="Clear SSH key">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                                                    <path d="M3 6h18"/>
                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                                </svg>
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                    <div class="form-help">
                                        <div class="help-links">
                                            <div onclick="showSSHHelp()" class="help-link">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                                    <path d="M12 17h.01"/>
                                                </svg>
                                                How to generate SSH key
                                            </div>
                                            <div onclick="importSSHKey()" class="help-link import-link">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                    <polyline points="7,10 12,15 17,10"/>
                                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                                </svg>
                                                Import from file
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- HTTPS Authentication Fields -->
                            <div id="https-auth-fields" class="auth-fields" style="display: none;">
                                <div class="form-group">
                                    <label for="clone-username">Username</label>
                                    <input
                                        type="text"
                                        id="clone-username"
                                        name="username"
                                        class="form-control"
                                        placeholder="your-username"
                                    >
                                    <div class="form-help">Your Git hosting service username</div>
                                </div>

                                <div class="form-group">
                                    <label for="clone-token">Personal Access Token</label>
                                    <div class="input-group">
                                        <input
                                            type="password"
                                            id="clone-token"
                                            name="token"
                                            class="form-control"
                                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                        >
                                        <button type="button" class="git-action-btn git-secondary-btn" id="toggle-token-visibility">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                        </button>
                                    </div>
                                    <div class="form-help">
                                        <div class="help-links">
                                            <div onclick="showTokenHelp()" class="help-link">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                                    <path d="M12 17h.01"/>
                                                </svg>
                                                How to create access token
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Repository Type Section -->
                        <div class="form-section">
                            <h4 class="form-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                </svg>
                                Repository Type
                            </h4>

                            <div class="form-group">
                                <label class="switch-label">
                                    <span class="switch-text">This is an existing Git repository</span>
                                    <div class="switch-container">
                                        <input type="checkbox" id="clone-existing-repo" name="existing_repo" class="switch-input">
                                        <span class="switch-slider"></span>
                                    </div>
                                </label>
                                <div class="form-help">Enable if the directory already contains a Git repository</div>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="git-modal-footer git-clone-form-actions">
                    <button type="button" class="git-action-btn git-secondary-btn" id="cancel-clone-btn">
                        Cancel
                    </button>
                    <button type="submit" form="clone-form" class="git-action-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        Add Repository
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show Add Repository Section
     */
    showAddRepositorySection() {
        // Hide welcome screen and repository details
        const welcomeScreen = document.getElementById("git-welcome-screen");
        const repoDetails = document.getElementById("git-repo-details");
        const addRepoSection = document.getElementById("git-add-repository");

        if (welcomeScreen) welcomeScreen.style.display = "none";
        if (repoDetails) repoDetails.style.display = "none";
        if (addRepoSection) addRepoSection.style.display = "block";

        // Set the directory selector target for the add repository form
        this.directorySelectorTarget = "#add-repo-path";

        // Set up form event listeners
        this.setupAddRepositoryForm();
    }

    /**
     * Ensure proper display states for all sections
     */
    ensureProperDisplayStates() {
        const welcomeScreen = document.getElementById("git-welcome-screen");
        const addRepoSection = document.getElementById("git-add-repository");
        const repoDetails = document.getElementById("git-repo-details");

        // Reset all display states
        if (welcomeScreen) {
            welcomeScreen.style.display = "flex";
            welcomeScreen.style.alignItems = "center";
            welcomeScreen.style.justifyContent = "center";
        }
        if (addRepoSection) addRepoSection.style.display = "none";
        if (repoDetails) repoDetails.style.display = "none";
    }

    /**
     * Setup Add Repository Form Event Listeners
     */
    setupAddRepositoryForm() {
        // Back button
        const backBtn = document.getElementById("back-to-welcome");
        if (backBtn) {
            backBtn.onclick = () => this.hideAddRepositorySection();
        }

        // Cancel button
        const cancelBtn = document.getElementById("cancel-add-repo");
        if (cancelBtn) {
            cancelBtn.onclick = () => this.hideAddRepositorySection();
        }

        // Browse path button
        const browseBtn = document.getElementById("browse-path-btn");
        if (browseBtn) {
            browseBtn.onclick = () => {
                // Ensure the target is set correctly for add repository
                this.directorySelectorTarget = "#add-repo-path";
                this.browsePath(this.directorySelectorTarget);
            };
        }

        // Form submission
        const form = document.getElementById("add-repo-form");
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleAddRepositorySubmit(form);
            };
        }

        // Setup URL auto-fill for the existing repository form
        this.setupExistingFormUrlAutoFill();

        // Setup authentication interactions for the add repository form
        this.setupAddRepositoryAuthInteractions();
    }

    /**
     * Hide Add Repository Section
     */
    hideAddRepositorySection() {
        this.ensureProperDisplayStates();
    }

    /**
     * Handle Add Repository Form Submission
     */
    async handleAddRepositorySubmit(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Check if this is an existing repository
        const isExistingRepo = data.existing_repo === "on";

        // Validate form - URL is only required for new repositories
        if (!data.repo_path) {
            this.showNotification(
                "Please fill in the local path field",
                "error"
            );
            return;
        }

        if (!isExistingRepo && !data.repo_url) {
            this.showNotification(
                "Please fill in the repository URL field",
                "error"
            );
            return;
        }

        // Validate private repository authentication
        const isPrivateRepo = data.private_repo === "on";
        if (isPrivateRepo) {
            const authType = data.auth_type;

            if (!authType) {
                this.showNotification(
                    "Please select an authentication method",
                    "error"
                );
                return;
            }

            if (authType === "ssh") {
                if (!data.private_key || !data.private_key.trim()) {
                    // If SSH URL is used but no SSH key provided, suggest switching to HTTPS
                    if (data.repo_url && data.repo_url.startsWith("git@")) {
                        this.showNotification(
                            "SSH URL detected but no SSH key provided. Please either provide an SSH private key or switch to HTTPS authentication.",
                            "error"
                        );
                    } else {
                        this.showNotification(
                            "SSH private key is required for SSH authentication. Please provide a private key or switch to HTTPS authentication.",
                            "error"
                        );
                    }
                    return;
                }

                // Basic SSH key validation
                const sshKeyPattern =
                    /^-----BEGIN (OPENSSH|RSA|DSA|EC) PRIVATE KEY-----/;
                if (!sshKeyPattern.test(data.private_key.trim())) {
                    this.showNotification(
                        "Please enter a valid SSH private key",
                        "error"
                    );
                    return;
                }
            } else if (authType === "https") {
                if (!data.username || !data.username.trim()) {
                    this.showNotification(
                        "Username is required for HTTPS authentication",
                        "error"
                    );
                    return;
                }

                if (!data.token || !data.token.trim()) {
                    this.showNotification(
                        "Personal access token is required for HTTPS authentication",
                        "error"
                    );
                    return;
                }

                // Basic token validation for common patterns
                const tokenPatterns = [
                    /^ghp_[A-Za-z0-9_]{36}$/, // GitHub personal access token
                    /^gho_[A-Za-z0-9_]{36}$/, // GitHub OAuth token
                    /^ghu_[A-Za-z0-9_]{36}$/, // GitHub user-to-server token
                    /^ghr_[A-Za-z0-9_]{36}$/, // GitHub refresh token
                    /^[A-Za-z0-9]{20,}$/, // Generic token pattern
                ];

                const isValidToken = tokenPatterns.some((pattern) =>
                    pattern.test(data.token.trim())
                );
                if (!isValidToken) {
                    this.showNotification(
                        "Please enter a valid personal access token",
                        "error"
                    );
                    return;
                }
            }
        }

        // Show loading state
        const submitBtn = document.getElementById("submit-add-repo");
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `
            <svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Adding Repository...
        `;
        submitBtn.disabled = true;

        try {
            // Auto-convert SSH URL to HTTPS if HTTPS credentials are provided
            let repoUrl = data.repo_url;
            if (
                data.repo_url &&
                data.repo_url.startsWith("git@") &&
                data.auth_type === "https" &&
                data.username &&
                data.token
            ) {
                // Convert git@github.com:user/repo.git to https://github.com/user/repo.git
                repoUrl = data.repo_url.replace(
                    /^git@([^:]+):([^\/]+)\/([^\/]+?)(?:\.git)?$/,
                    "https://$1/$2/$3.git"
                );
            }

            // Prepare the data for AJAX
            const ajaxData = {
                action: "git_manager_add_repository",
                nonce: gitManagerAjax.nonce,
                repo_url: repoUrl,
                repo_path: data.repo_path,
                repo_branch: data.repo_branch || "",
                existing_repo: data.existing_repo === "on" ? "1" : "0",
            };

            // Handle authentication for private repositories
            const isPrivateRepo = data.private_repo === "on";
            if (isPrivateRepo) {
                const authType = data.auth_type || "ssh";
                ajaxData.authType = authType;

                if (authType === "ssh") {
                    const privateKey = data.private_key;
                    if (privateKey && privateKey.trim()) {
                        ajaxData.private_key = privateKey;
                    } else {
                        throw new Error(
                            "SSH private key is required for private repositories"
                        );
                    }
                } else if (authType === "https") {
                    const username = data.username;
                    const token = data.token;

                    if (!username || !token) {
                        throw new Error(
                            "Username and personal access token are required for HTTPS authentication"
                        );
                    }

                    ajaxData.username = username;
                    ajaxData.token = token;
                }
            }

            const response = await fetch(gitManagerAjax.ajaxurl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams(ajaxData),
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(
                    "Repository added successfully!",
                    "success"
                );
                this.hideAddRepositorySection();
                this.loadRepositories(); // Reload the repository list
            } else {
                throw new Error(result.data || "Failed to add repository");
            }
        } catch (error) {
            this.showNotification(
                "Failed to add repository: " + error.message,
                "error"
            );
        } finally {
            // Restore button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    /**
     * Handle clone form submission
     */
    async handleCloneSubmit(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Validate form
        if (!this.validateCloneForm(data)) {
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `
            <div class="progress-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
            Adding Repository...
        `;
        submitBtn.disabled = true;

        try {
            // Real AJAX call to WordPress backend
            const ajaxData = new FormData();
            ajaxData.append("action", gitManagerAjax.actions.repo_clone);
            ajaxData.append("nonce", gitManagerAjax.nonce);

            // Extract repository name from URL
            const urlParts = data.repo_url.split("/");
            const repoName = urlParts[urlParts.length - 1].replace(".git", "");

            ajaxData.append("remote", data.repo_url);
            ajaxData.append("target", data.repo_path);
            ajaxData.append("name", repoName);

            // Handle authentication
            const isPrivateRepo = data.private_repo === "on";
            const authType = data.auth_type || "ssh";

            ajaxData.append("authType", authType);

            if (isPrivateRepo) {
                if (authType === "ssh") {
                    const privateKey = data.private_key;
                    if (privateKey && privateKey.trim()) {
                        ajaxData.append("private_key", privateKey);
                    } else {
                        throw new Error(
                            "SSH private key is required for private repositories"
                        );
                    }
                } else if (authType === "https") {
                    const username = data.username;
                    const token = data.token;

                    if (!username || !token) {
                        throw new Error(
                            "Username and personal access token are required for HTTPS authentication"
                        );
                    }

                    ajaxData.append("username", username);
                    ajaxData.append("token", token);
                }
            }

            const response = await fetch(ajaxurl, {
                method: "POST",
                body: ajaxData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showNotification(
                    "Repository added successfully!",
                    "success"
                );
                this.closeModal("clone");
                this.loadRepositories();
            } else {
                throw new Error(result.data || "Failed to add repository");
            }
        } catch (error) {
            this.showNotification(
                "Failed to add repository: " + error.message,
                "error"
            );
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    validateCloneForm(data) {
        if (!data.repo_url) {
            this.showNotification(
                WPGitManagerGlobal.translations.repositoryURLRequired,
                "error"
            );
            return false;
        }

        if (!data.repo_path) {
            this.showNotification(
                WPGitManagerGlobal.translations.localPathRequired,
                "error"
            );
            return false;
        }

        // Basic URL validation
        const urlPattern = /^(https?:\/\/|git@|ssh:\/\/).+\.git$/;
        if (!urlPattern.test(data.repo_url)) {
            this.showNotification(
                "Please enter a valid Git repository URL",
                "error"
            );
            return false;
        }

        // Validate private repository authentication
        const isPrivateRepo = data.private_repo === "on";
        if (isPrivateRepo) {
            const authType = data.auth_type;

            if (!authType) {
                this.showNotification(
                    "Please select an authentication method",
                    "error"
                );
                return false;
            }

            if (authType === "ssh") {
                if (!data.private_key || !data.private_key.trim()) {
                    this.showNotification(
                        "SSH private key is required for private repositories",
                        "error"
                    );
                    return false;
                }

                // Basic SSH key validation
                const sshKeyPattern =
                    /^-----BEGIN (OPENSSH|RSA|DSA|EC) PRIVATE KEY-----/;
                if (!sshKeyPattern.test(data.private_key.trim())) {
                    this.showNotification(
                        "Please enter a valid SSH private key",
                        "error"
                    );
                    return false;
                }
            } else if (authType === "https") {
                if (!data.username || !data.username.trim()) {
                    this.showNotification(
                        "Username is required for HTTPS authentication",
                        "error"
                    );
                    return false;
                }

                if (!data.token || !data.token.trim()) {
                    this.showNotification(
                        "Personal access token is required for HTTPS authentication",
                        "error"
                    );
                    return false;
                }

                // Basic token validation for common patterns
                const tokenPatterns = [
                    /^ghp_[A-Za-z0-9_]{36}$/, // GitHub personal access token
                    /^gho_[A-Za-z0-9_]{36}$/, // GitHub OAuth token
                    /^ghu_[A-Za-z0-9_]{36}$/, // GitHub user-to-server token
                    /^ghr_[A-Za-z0-9_]{36}$/, // GitHub refresh token
                    /^[A-Za-z0-9]{20,}$/, // Generic token pattern
                ];

                const isValidToken = tokenPatterns.some((pattern) =>
                    pattern.test(data.token.trim())
                );
                if (!isValidToken) {
                    this.showNotification(
                        "Please enter a valid personal access token",
                        "error"
                    );
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Repository Management
     */
    async loadRepositories() {
        // Show repo list skeleton before starting fetch
        if (typeof gitManagerSkeleton !== "undefined") {
            gitManagerSkeleton.showRepoSkeleton();
        }

        try {
            const repos = await this.fetchRepositories();
            this.renderRepositories(repos);
        } catch (error) {
            this.showNotification(
                WPGitManagerGlobal.translations.failedToLoadRepositories,
                "error"
            );
        } finally {
            // Always hide skeleton after we attempted to load
            if (typeof gitManagerSkeleton !== "undefined") {
                gitManagerSkeleton.hideRepoSkeleton();
            }
        }
    }

    async fetchRepositories() {
        // Check if gitManagerAjax is available
        if (typeof gitManagerAjax === "undefined") {
            return [];
        }

        // Real AJAX call to WordPress backend
        const formData = new FormData();
        formData.append("action", gitManagerAjax.actions.repo_list);
        formData.append("nonce", gitManagerAjax.nonce);

        const response = await fetch(gitManagerAjax.ajaxurl, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            return data.data || [];
        } else {
            throw new Error(data.data || "Failed to fetch repositories");
        }
    }

    renderRepositories(repos) {
        const repoList = document.getElementById("git-repo-list");
        if (!repoList) return;

        // Ensure repo skeleton state is cleared before rendering content
        if (typeof gitManagerSkeleton !== "undefined") {
            gitManagerSkeleton.hideRepoSkeleton();
        }

        if (!repos || repos.length === 0) {
            repoList.innerHTML = `
                <div class="git-repo-empty">
                    <p>No repositories found</p>
                    <button class="git-action-btn git-clone-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        Add Your First Repository
                    </button>
                </div>
            `;

            // Ensure welcome screen is shown when no repositories
            const welcomeScreen = document.getElementById("git-welcome-screen");
            const addRepoSection =
                document.getElementById("git-add-repository");
            const repoDetails = document.getElementById("git-repo-details");

            if (welcomeScreen) {
                welcomeScreen.style.display = "flex";
                welcomeScreen.style.alignItems = "center";
                welcomeScreen.style.justifyContent = "center";
            }
            if (addRepoSection) addRepoSection.style.display = "none";
            if (repoDetails) repoDetails.style.display = "none";

            // Ensure buttons are functional in empty state
            setTimeout(() => {
                this.ensureButtonFunctionality();
            }, 50);

            return;
        }

        repoList.innerHTML = repos
            .map((repo) => this.createRepoCardHTML(repo))
            .join("");

        // Ensure buttons are functional after rendering
        this.ensureButtonFunctionality();
    }

    createRepoCardHTML(repo) {
        // Check if repository folder is missing
        if (!repo.folderExists) {
            return this.createMissingFolderCardHTML(repo);
        }

        // Determine status class based on repository state - using same logic as overview tab
        let statusClass = "clean";
        const aheadCount = parseInt(repo.ahead ?? 0, 10) || 0;
        const behindCount = parseInt(repo.behind ?? 0, 10) || 0;

        if (repo.hasChanges) {
            statusClass = "changes";
        } else if (aheadCount > 0 && behindCount > 0) {
            statusClass = "diverged";
        } else if (aheadCount > 0) {
            statusClass = "ahead";
        } else if (behindCount > 0) {
            statusClass = "behind";
        }

        const statusText = this.getCardStatusText(repo.status);

        // Determine badge text based on repository type
        const badgeText =
            repo.repoType === "plugin"
                ? "Plugin"
                : repo.repoType === "theme"
                ? "Theme"
                : "Other";

        return `
            <div class="git-repo-card" data-repo-id="${repo.id}">
                <div class="repo-card-header">
                    <h4 class="repo-name git-repo-name" data-repo-name="${this.escapeHtml(
                        repo.name
                    )}">${this.escapeHtml(repo.name)}</h4>
                    <div class="repo-status ${statusClass}" data-repo-status="${statusClass}">
                        <span class="status-dot"></span>
                    </div>
                </div>
                <div class="repo-card-body">
                    <div class="repo-path git-repo-path" data-repo-path="${this.escapeHtml(
                        repo.path
                    )}">${this.escapeHtml(repo.path)}</div>
                    <div class="repo-branch git-repo-branch" data-repo-branch="${this.escapeHtml(
                        repo.activeBranch
                    )}">${this.escapeHtml(repo.activeBranch)}</div>
                    <span class="repo-hashtag ${
                        repo.repoType || "other"
                    }">#${badgeText}</span>
                </div>

                <div class="repo-card-actions">
                    <div class="repo-action-group">
                        <button class="repo-action-btn" data-action="pull" title="Pull changes" onclick="window.safeGitManagerCall('gitOperation', 'pull', '${
                            repo.id
                        }')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></svg>
                            <span class="commit-count-badge pull-badge">${
                                repo.behind || 0
                            }</span>
                        </button>
                    </div>
                    <div class="repo-action-group">
                        <button class="repo-action-btn" data-action="push" title="Push changes" onclick="window.safeGitManagerCall('gitOperation', 'push', '${
                            repo.id
                        }')">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 9-6-6-6 6"/><path d="M12 3v14"/><path d="M5 21h14"/></svg>
                            <span class="commit-count-badge push-badge">${
                                repo.ahead || 0
                            }</span>
                        </button>
                    </div>
                    <button class="repo-action-btn repo-delete-btn" data-action="delete" title="Delete repository" onclick="window.safeGitManagerCall('deleteRepository', '${
                        repo.id
                    }')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    createMissingFolderCardHTML(repo) {
        // Determine badge text based on repository type
        const badgeText =
            repo.repoType === "plugin"
                ? "Plugin"
                : repo.repoType === "theme"
                ? "Theme"
                : "Other";

        return `
            <div class="git-repo-card git-repo-card-missing" data-repo-id="${
                repo.id
            }">
                <div class="repo-card-header">
                    <h4 class="repo-name">${this.escapeHtml(repo.name)}</h4>
                    <div class="repo-status missing">
                        <span class="status-dot"></span>
                    </div>
                </div>

                <div class="repo-card-body">
                    <div class="repo-path">${this.escapeHtml(repo.path)}</div>
                    <div class="repo-branch missing-folder-warning">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        Repository folder is missing
                    </div>
                    <span class="repo-hashtag ${
                        repo.repoType || "other"
                    }">#${badgeText}</span>
                </div>

                <div class="repo-card-actions">
                    <button class="repo-action-btn repo-reclone-btn" data-action="reclone" title="Re-clone repository to same path" onclick="window.safeGitManagerCall('reCloneRepository', '${
                        repo.id
                    }')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                            <path d="M21 3v5h-5"/>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                            <path d="M3 21v-5h5"/>
                        </svg>
                        Re-clone
                    </button>
                    <button class="repo-action-btn repo-manage-path-btn" data-action="manage-path" title="Manage repository path" onclick="window.safeGitManagerCall('manageRepositoryPath', '${
                        repo.id
                    }')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                        Manage Path
                    </button>
                                            <button class="repo-action-btn repo-delete-btn" data-action="delete" title="Delete repository" onclick="window.safeGitManagerCall('deleteRepository', '${
                                                repo.id
                                            }')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    getCardStatusText(status) {
        const statusMap = {
            clean: "Clean",
            modified: "Modified",
            changes: "Has Changes",
            ahead: "Ahead",
            behind: "Behind",
            diverged: "Diverged",
            unknown: "Unknown",
        };
        return statusMap[status] || "Unknown";
    }

    async selectRepository(repoId) {
        // Hide all skeleton loading states first
        if (typeof gitManagerSkeleton !== "undefined") {
            gitManagerSkeleton.hideAllSkeletons();
        }

        // Remove active class from all cards
        document.querySelectorAll(".git-repo-card").forEach((card) => {
            card.classList.remove("active");
        });

        // Add active class to selected card
        const selectedCard = document.querySelector(
            `[data-repo-id="${repoId}"]`
        );
        if (selectedCard) {
            selectedCard.classList.add("active");
        }

        // Check if this is a missing folder repository
        if (
            selectedCard &&
            selectedCard.classList.contains("git-repo-card-missing")
        ) {
            this.showMissingFolderMessage(repoId);
            return;
        }

        this.currentRepo = repoId;

        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            this.showRepositoryDetails(repoId);
        }, 100);
    }

    showMissingFolderMessage(repoId) {
        // Show a notification about the missing folder
        this.showNotification(
            "This repository folder is missing. Please use the 'Re-clone' button to restore it or 'Delete' to remove the repository entry.",
            "warning",
            { duration: 8000 }
        );
    }

    showRepositoryDetails(repoId) {
        // Hide welcome screen and add repository section
        const welcomeScreen = document.getElementById("git-welcome-screen");
        const addRepoSection = document.getElementById("git-add-repository");

        if (welcomeScreen) {
            welcomeScreen.style.display = "none";
        } else {
        }

        if (addRepoSection) {
            addRepoSection.style.display = "none";
        }

        // Show repository details with enhanced display management
        const detailsScreen = document.getElementById("git-repo-details");
        if (detailsScreen) {
            // Force proper display states
            detailsScreen.style.display = "block";
            detailsScreen.style.visibility = "visible";
            detailsScreen.style.opacity = "1";
            detailsScreen.style.position = "relative";
            detailsScreen.style.zIndex = "1";

            // Ensure the content is properly laid out
            detailsScreen.classList.add("active");

            this.loadRepositoryDetails(repoId);
        } else {
        }
    }

    showLoadingState() {
        // Scope loading state to inner grids to avoid overlapping with other async sections
        const infoGrid = document.querySelector(
            "#git-repo-details .repo-info-grid"
        );
        if (infoGrid) {
            infoGrid.classList.add("is-loading");
        }
        const overviewGrid = document.querySelector(
            "#git-repo-details .repo-overview-grid"
        );
        if (overviewGrid) {
            overviewGrid.classList.add("is-loading");
        }
        // Ensure skeletons are visible without altering DOM
        if (typeof gitManagerSkeleton !== "undefined") {
            gitManagerSkeleton.showRepoDetailsSkeleton();
        }
    }

    hideLoadingState() {
        // Clear loading classes from inner grids only
        const infoGrid = document.querySelector(
            "#git-repo-details .repo-info-grid"
        );
        if (infoGrid) {
            infoGrid.classList.remove("is-loading");
        }
        const overviewGrid = document.querySelector(
            "#git-repo-details .repo-overview-grid"
        );
        if (overviewGrid) {
            overviewGrid.classList.remove("is-loading");
        }
        // Hide any skeleton decorations
        if (typeof gitManagerSkeleton !== "undefined") {
            gitManagerSkeleton.hideRepoDetailsSkeleton();
        }
    }

    loadRepositoryDetails(repoId) {
        if (!repoId) {
            return;
        }

        // Increment sequence and cancel any in-flight request
        this.detailsRequestSeq += 1;
        const requestSeq = this.detailsRequestSeq;
        if (this.detailsAbortController) {
            try {
                this.detailsAbortController.abort();
            } catch (e) {}
        }
        this.detailsAbortController = new AbortController();

        this.showLoadingState();

        const formData = new FormData();
        formData.append("action", gitManagerAjax.actions.get_repo_details);
        formData.append("nonce", gitManagerAjax.nonce);
        formData.append("id", repoId);

        fetch(gitManagerAjax.ajaxurl, {
            method: "POST",
            body: formData,
            signal: this.detailsAbortController.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((result) => {
                // Only process if this is the latest request
                if (requestSeq !== this.detailsRequestSeq) return;
                if (result.success) {
                    this.populateRepositoryDetails(result.data);
                } else {
                    throw new Error(
                        result.data || "Failed to load repository details"
                    );
                }
            })
            .catch((error) => {
                // Ignore AbortError for outdated requests
                if (error && error.name === "AbortError") return;
                // Only report if this is the latest request
                if (requestSeq !== this.detailsRequestSeq) return;

                this.showNotification(
                    "Failed to load repository details: " + error.message,
                    "error"
                );
            })
            .finally(() => {
                // Only hide loading state if this is the latest request
                if (requestSeq === this.detailsRequestSeq) {
                    this.hideLoadingState();
                }
            });
    }

    populateRepositoryDetails(repo) {
        // This function will now reliably find the elements because they are never removed.
        const elements = {
            "repo-name": repo.name || "-",
            "repo-path": repo.path || "-",
            "repo-branch": repo.activeBranch || "Unknown",
            "repo-status": this.getStatusText(repo),
            "repo-remote": repo.remoteUrl || "-",
            "repo-last-commit": repo.lastCommit || "Unknown",
        };

        Object.keys(elements).forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            } else {
            }
        });

        const repoNameHeader = document.getElementById("repo-details-name");
        if (repoNameHeader) {
            repoNameHeader.textContent = repo.name || "Repository";
        }

        this.updateOverviewSection(repo);
        this.loadCommits(repo.id);
        this.loadBranches(repo.id);
    }

    /**
     * Update repository display with new data
     */
    updateRepositoryDisplay(data) {
        // Update repository information display
        const elements = {
            "repo-name": data.name,
            "repo-path": data.path,
            "repo-branch": data.activeBranch,
            "repo-status": data.hasChanges
                ? "Has Changes (Uncommitted)"
                : "Clean",
            "repo-last-commit": data.lastCommit,
            "repo-remote": data.remoteUrl,
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }

        // Update repository header name
        const repoNameHeader = document.querySelector(".git-repo-header h2");
        if (repoNameHeader) {
            repoNameHeader.textContent = data.name || "Repository";
        }

        // Update any other elements that might display repository name
        const repoNameElements = document.querySelectorAll("[data-repo-name]");
        repoNameElements.forEach((element) => {
            element.textContent = data.name || "Repository";
        });

        // Update repository path displays
        const repoPathElements = document.querySelectorAll("[data-repo-path]");
        repoPathElements.forEach((element) => {
            element.textContent = data.path || "";
        });

        // Update remote URL displays
        const repoRemoteElements =
            document.querySelectorAll("[data-repo-remote]");
        repoRemoteElements.forEach((element) => {
            element.textContent = data.remoteUrl || "No remote configured";
        });

        // Update status indicators
        const statusElements = document.querySelectorAll("[data-repo-status]");
        statusElements.forEach((element) => {
            element.textContent = data.hasChanges ? "Modified" : "Clean";
            element.className = data.hasChanges
                ? "status-modified"
                : "status-clean";
        });

        // Update branch displays
        const branchElements = document.querySelectorAll("[data-repo-branch]");
        branchElements.forEach((element) => {
            element.textContent = data.activeBranch || "Unknown";
        });

        // Update last commit displays
        const commitElements = document.querySelectorAll("[data-repo-commit]");
        commitElements.forEach((element) => {
            element.textContent = data.lastCommit || "No commits found";
        });

        // Trigger any custom events for other components that might need to update
        const updateEvent = new CustomEvent("repositoryUpdated", {
            detail: { repository: data },
        });
        document.dispatchEvent(updateEvent);

        // Add visual feedback for updated elements
        this.addUpdateVisualFeedback();
    }

    /**
     * Add visual feedback for updated repository elements
     */
    addUpdateVisualFeedback() {
        // Add flash animation to updated elements
        const updatedElements = document.querySelectorAll(
            "[data-repo-name], [data-repo-path], [data-repo-branch], [data-repo-status]"
        );
        updatedElements.forEach((element) => {
            element.classList.add("repository-updated");
            setTimeout(() => {
                element.classList.remove("repository-updated");
            }, 500);
        });
    }

    /**
     * Search functionality
     */
    focusSearch() {
        const searchInput = document.querySelector(".git-search-input");
        if (searchInput) {
            searchInput.focus();
        }
    }

    /**
     * Git operations (fetch, pull, push)
     */
    async gitOperation(operation, repoId) {
        if (!repoId) {
            this.showNotification(
                WPGitManagerGlobal.translations.noRepositorySelected,
                "warning"
            );
            return;
        }

        this.showProgress(operation);

        try {
            const response = await this.apiCall("git_manager_repo_git", {
                id: repoId,
                op: operation,
            });

            if (response.success) {
                this.showNotification(
                    `${operation} completed successfully`,
                    "success"
                );
                this.loadRepositoryDetails(repoId);
            } else {
                this.showNotification(`Error during ${operation}`, "error");
            }
        } catch (error) {
            this.showNotification(`Error during ${operation}`, "error");
        }

        this.hideProgress();
    }

    /**
     * Show branches tab
     */
    showBranches() {
        const btn = document.querySelector(
            '.git-repo-tab[data-tab="branches"]'
        );
        if (btn) {
            btn.click();
        }
    }

    /**
     * Professional troubleshooting for repositories
     */
    async troubleshootRepo() {
        if (!this.currentRepo) {
            this.showNotification(
                WPGitManagerGlobal.translations.noRepositorySelected,
                "warning"
            );
            return;
        }

        this.showProgress(
            WPGitManagerGlobal.translations.runningProfessionalTroubleshooting
        );

        try {
            const response = await this.apiCall(
                "git_manager_repo_troubleshoot",
                {
                    id: this.currentRepo,
                }
            );

            if (response.success) {
                this.showTroubleshootModal(response.data.html);
            } else {
                this.showNotification(
                    "Troubleshooting failed: " +
                        (response.data ||
                            WPGitManagerGlobal.translations.unknownError),
                    "error"
                );
            }
        } catch (error) {
            this.showNotification(
                "Troubleshooting error: " + error.message,
                "error"
            );
        } finally {
            this.hideProgress();
        }
    }

    /**
     * Show troubleshooting results modal
     */
    showTroubleshootModal(html) {
        const modal = document.createElement("div");
        modal.className = "git-modal-overlay";
        modal.id = "troubleshoot-modal";
        modal.innerHTML = `
            <div class="git-modal-content git-modal-large">
                <div class="git-modal-header">
                    <h3><span class="dashicons dashicons-hammer"></span> Professional Troubleshooting Results</h3>
                    <button class="git-modal-close" onclick="GitManager.closeTroubleshootModal()">x</button>
                </div>
                <div class="git-modal-body">
                    <div class="troubleshoot-results">
                        ${html}
                    </div>
                </div>
                <div class="git-modal-footer">
                    <button class="git-action-btn git-secondary-btn" onclick="GitManager.closeTroubleshootModal()">Close</button>
                    <button class="git-action-btn" onclick="GitManager.fixPermission()">Fix Permissions</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Close troubleshooting modal
     */
    closeTroubleshootModal() {
        const modal = document.getElementById("troubleshoot-modal");
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Fix repository permissions
     */
    async fixPermission() {
        if (!this.currentRepo) {
            this.showNotification(
                WPGitManagerGlobal.translations.noRepositorySelected,
                "warning"
            );
            return;
        }

        // Start notification for Fix Permissions
        this.showNotification(
            WPGitManagerGlobal.translations.requestingPermissionFix,
            "info",
            {
                duration: 4000,
            }
        );

        this.showProgress(
            WPGitManagerGlobal.translations.fixingRepositoryPermissions
        );

        try {
            const response = await this.apiCall("git_manager_fix_permission", {
                id: this.currentRepo,
            });

            if (response.success) {
                this.showNotification(
                    "Permissions fixed successfully!",
                    "success"
                );
                // Refresh repository details
                this.loadRepositoryDetails(this.currentRepo);
            } else {
                this.showNotification(
                    "Permission fix failed: " +
                        (response.data ||
                            WPGitManagerGlobal.translations.unknownError),
                    "error"
                );
            }
        } catch (error) {
            this.showNotification(
                "Permission fix error: " + error.message,
                "error"
            );
        } finally {
            this.hideProgress();
        }
    }

    /**
     * Show progress overlay
     */
    showProgress(message = WPGitManagerGlobal.translations.processing) {
        if (message === "pull") {
            message = WPGitManagerGlobal.translations.pullingRepository;
        }
        if (message === "push") {
            message = WPGitManagerGlobal.translations.pushingRepository;
        }
        if (message === "fetch") {
            message = WPGitManagerGlobal.translations.fetchingRepository;
        }
        try {
            if (
                this._progressToast &&
                document.body.contains(this._progressToast)
            ) {
                // update message
                const msg = this._progressToast.querySelector(
                    ".notification-message"
                );
                if (msg) msg.textContent = message;
                return;
            }
        } catch (e) {}
        this._progressToast = this.showNotification(message, "info", {
            duration: 0,
            showProgress: false,
        });
    }

    /**
     * Hide progress overlay
     */
    hideProgress() {
        if (this._progressToast) {
            const el = this._progressToast;
            try {
                el.classList.add("closing");
                setTimeout(() => el.remove(), 200);
            } catch (e) {
                try {
                    el.remove();
                } catch (e2) {}
            }
            this._progressToast = null;
        }
    }

    /**
     * Update overview section with repository data
     */
    updateOverviewSection(repo) {
        try {
            this.updateRepositoryStatus(repo);
        } catch (error) {}

        try {
            this.updateBranchInformation(repo);
        } catch (error) {}

        try {
            this.updateChangesInformation(repo);
        } catch (error) {}

        try {
            this.updateCommitInformation(repo);
        } catch (error) {}

        try {
            this.updateRecommendations(repo);
        } catch (error) {}
    }

    /**
     * Update repository status
     */
    updateRepositoryStatus(repo) {
        console.log(
            `[Git Manager] Updating status for repo "${repo.name}":`,
            repo
        );

        const statusIndicator = document.getElementById(
            "repo-status-indicator"
        );
        const statusContent = document.getElementById("repo-status-content");
        let statusDot = statusIndicator?.querySelector(".status-dot");
        const statusLabel = document.getElementById("repo-status-label");
        const statusBody = document.getElementById("repo-status-body");

        if (!statusIndicator || !statusContent) {
            console.warn("Repository status elements not found");
            return;
        }

        // Ensure status dot exists
        if (!statusDot) {
            statusDot = document.createElement("span");
            statusDot.className = "status-dot";
            statusIndicator.prepend(statusDot);
        }

        let status = "clean";
        let statusMessage = "Repository is clean and up to date.";
        let statusClass = "clean";

        const aheadCount = parseInt(repo.ahead ?? 0, 10) || 0;
        const behindCount = parseInt(repo.behind ?? 0, 10) || 0;

        if (repo.hasChanges) {
            status = "changes";
            statusMessage = "Repository has uncommitted changes.";
            statusClass = "changes";
        } else if (aheadCount > 0 && behindCount > 0) {
            status = "diverged";
            statusMessage =
                "Repository has diverged from remote. Manual merge needed.";
            statusClass = "diverged";
        } else if (aheadCount > 0) {
            status = "ahead";
            const aheadTpl =
                (typeof WPGitManagerGlobal !== "undefined" &&
                    WPGitManagerGlobal?.translations
                        ?.repositoryIsAheadOfRemote) ||
                "Repository is ahead of remote by {count} commit(s).";
            statusMessage = aheadTpl.replace("{count}", aheadCount);
            statusClass = "ahead";
        } else if (behindCount > 0) {
            status = "behind";
            const behindTpl =
                (typeof WPGitManagerGlobal !== "undefined" &&
                    WPGitManagerGlobal?.translations
                        ?.repositoryIsBehindRemote) ||
                "Repository is behind remote by {count} commit(s).";
            statusMessage = behindTpl.replace("{count}", behindCount);
            statusClass = "behind";
        }

        // Update status dot
        if (statusDot) {
            statusDot.className = `status-dot ${statusClass}`;
        }

        // Update status label and body content
        if (statusLabel) {
            statusLabel.textContent =
                status === "clean"
                    ? "Clean"
                    : status === "changes"
                    ? "Has Changes"
                    : status === "ahead"
                    ? "Ahead"
                    : status === "behind"
                    ? "Behind"
                    : "Diverged";
        }

        if (statusBody) {
            statusBody.innerHTML = `<p class="value">${statusMessage}</p>`;
        } else {
            // fallback
            statusContent.innerHTML = `<p class="value">${statusMessage}</p>`;
        }

        // Remove skeleton loading elements (always try)
        try {
            const skeletons = statusIndicator.querySelectorAll(".skeleton");
            skeletons.forEach((s) => s.remove());
            const contentSkeletons =
                statusContent.querySelectorAll(".skeleton");
            contentSkeletons.forEach((s) => s.remove());
        } catch (e) {}
    }

    /**
     * Update branch information
     */
    updateBranchInformation(repo) {
        const branchName = document.getElementById("branch-name");
        const branchSyncStatus = document.getElementById("branch-sync-status");
        const branchContent = document.getElementById("repo-branch-content");

        if (branchName) {
            branchName.textContent = repo.activeBranch || "Unknown";
        }

        if (branchSyncStatus) {
            let syncHTML = "";

            if (repo.ahead > 0 && repo.behind > 0) {
                syncHTML = `
                    <div class="sync-indicator ahead">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="m18 9-6-6-6 6"/><path d="M12 3v14"/><path d="M5 21h14"/></svg>
                        <span>Ahead by ${repo.ahead}</span>
                    </div>
                    <div class="sync-indicator behind">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></svg>
                        <span>Behind by ${repo.behind}</span>
                    </div>
                `;
            } else if (repo.ahead > 0) {
                syncHTML = `
                    <div class="sync-indicator ahead">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="m18 9-6-6-6 6"/><path d="M12 3v14"/><path d="M5 21h14"/></svg>
                        <span>Ahead by ${repo.ahead} commit(s)</span>
                    </div>
                `;
            } else if (repo.behind > 0) {
                syncHTML = `
                    <div class="sync-indicator behind">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></svg>
                        <span>Behind by ${repo.behind} commit(s)</span>
                    </div>
                `;
            } else {
                syncHTML = `
                    <div class="sync-indicator synced">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Synchronized with remote</span>
                    </div>
                `;
            }

            branchSyncStatus.innerHTML = syncHTML;
        }

        // Remove skeleton loading elements
        if (branchContent) {
            const skeletons = branchContent.querySelectorAll(".skeleton");
            skeletons.forEach((skeleton) => skeleton.remove());
        }
    }

    /**
     * Update changes information
     */
    updateChangesInformation(repo) {
        const changesList = document.getElementById("changes-list");
        const changesContent = document.getElementById("repo-changes-content");
        const changesCount = document.getElementById("changes-count");

        if (!changesList) {
            return;
        }

        // Show skeleton loading for changes with safety check
        if (!gitManagerSkeleton.safeShowSkeleton(changesList, "list", 3)) {
            console.warn(
                "Failed to show skeleton for changes, continuing without skeleton"
            );
        }

        this.loadDetailedStatus(repo.id)
            .then((statusInfo) => {
                if (statusInfo) {
                    this.populateChangesList(statusInfo);
                } else {
                    changesList.innerHTML = `<p class="value" style="text-align: center;">No changes found.</p>`;
                    this.updateChangesCount(0);
                }

                // Remove skeleton loading elements
                if (changesContent) {
                    const skeletons =
                        changesContent.querySelectorAll(".skeleton");
                    skeletons.forEach((skeleton) => skeleton.remove());
                }
                if (changesCount) {
                    const skeletons =
                        changesCount.querySelectorAll(".skeleton");
                    skeletons.forEach((skeleton) => skeleton.remove());
                }
            })
            .catch((error) => {
                gitManagerSkeleton.hideSkeleton(changesList, "list");
                changesList.innerHTML = `<p class="value" style="text-align: center;">Error loading changes.</p>`;
                this.updateChangesCount(0);

                // Remove skeleton loading elements
                if (changesContent) {
                    const skeletons =
                        changesContent.querySelectorAll(".skeleton");
                    skeletons.forEach((skeleton) => skeleton.remove());
                }
                if (changesCount) {
                    const skeletons =
                        changesCount.querySelectorAll(".skeleton");
                    skeletons.forEach((skeleton) => skeleton.remove());
                }
            });
    }

    updateChangesCount(totalChanges) {
        const changesCount = document.getElementById("changes-count");
        if (changesCount) {
            const countBadge = changesCount.querySelector(".count-badge");
            if (countBadge) {
                countBadge.textContent = totalChanges.toString();
                countBadge.className =
                    totalChanges > 0
                        ? "count-badge has-changes"
                        : "count-badge";
            }
        }
    }

    async loadDetailedStatus(repoId) {
        try {
            // Check if gitManagerAjax is available
            if (typeof gitManagerAjax === "undefined") {
                return null;
            }

            const formData = new FormData();
            formData.append("action", gitManagerAjax.actions.status);
            formData.append("nonce", gitManagerAjax.nonce);
            formData.append("id", repoId);

            const response = await fetch(gitManagerAjax.ajaxurl, {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success) {
                    return result.data;
                } else {
                }
            } else {
                const errorText = await response.text();
            }
        } catch (error) {}
        return null;
    }

    populateChangesList(statusInfo) {
        const changesList = document.getElementById("changes-list");
        if (!changesList) {
            return;
        }

        if (!statusInfo) {
            gitManagerSkeleton.hideSkeleton(changesList, "list");
            changesList.innerHTML = "<p>Error loading changes</p>";
            return;
        }

        let changesHTML = "";
        let totalChanges = 0;

        // Staged files
        if (statusInfo.stagedFiles && statusInfo.stagedFiles.length > 0) {
            statusInfo.stagedFiles.forEach((file) => {
                changesHTML += `
                    <div class="change-row change-row--staged">
                        <div class="change-row__left">
                            <span class="change-icon staged" aria-hidden="true">●</span>
                        </div>
                        <div class="change-row__main">
                            <div class="change-file">${this.escapeHtml(
                                file
                            )}</div>
                            <div class="change-meta">Staged</div>
                        </div>
                    </div>
                `;
                totalChanges++;
            });
        }

        // Modified files
        if (statusInfo.modifiedFiles && statusInfo.modifiedFiles.length > 0) {
            statusInfo.modifiedFiles.forEach((file) => {
                changesHTML += `
                    <div class="change-row change-row--modified">
                        <div class="change-row__left"><span class="change-icon modified" aria-hidden="true">●</span></div>
                        <div class="change-row__main"><div class="change-file">${this.escapeHtml(
                            file
                        )}</div><div class="change-meta">Modified</div></div>
                    </div>
                `;
                totalChanges++;
            });
        }

        // Untracked files
        if (statusInfo.untrackedFiles && statusInfo.untrackedFiles.length > 0) {
            statusInfo.untrackedFiles.forEach((file) => {
                changesHTML += `
                    <div class="change-row change-row--untracked">
                        <div class="change-row__left"><span class="change-icon untracked" aria-hidden="true">●</span></div>
                        <div class="change-row__main"><div class="change-file">${this.escapeHtml(
                            file
                        )}</div><div class="change-meta">Untracked</div></div>
                    </div>
                `;
                totalChanges++;
            });
        }

        // Update count badge
        const changesCount = document.getElementById("changes-count");
        if (changesCount) {
            const countBadge = changesCount.querySelector(".count-badge");
            if (countBadge) {
                countBadge.textContent = totalChanges;
                countBadge.className =
                    totalChanges > 0
                        ? "count-badge has-changes"
                        : "count-badge";
            }
        }

        if (changesHTML) {
            gitManagerSkeleton.hideSkeleton(changesList, "list");
            changesList.innerHTML = `<div class="change-rows">${changesHTML}</div>`;
        } else {
            gitManagerSkeleton.hideSkeleton(changesList, "list");
            changesList.innerHTML =
                "<p class='value'>No uncommitted changes</p>";
        }
    }

    /**
     * Update commit information
     */
    updateCommitInformation(repo) {
        const lastCommitInfo = document.getElementById("last-commit-info");
        const commitTime = document.getElementById("commit-time");
        const commitContent = document.getElementById("repo-commit-content");

        if (lastCommitInfo) {
            if (repo.lastCommit && repo.lastCommit !== "No commits found") {
                const parts = repo.lastCommit.split(" - ");
                const hash = parts[0];
                const message = parts.slice(1).join(" - ");

                lastCommitInfo.innerHTML = `
                    <div class="commit-hash">${this.escapeHtml(hash)}</div>
                    <div class="commit-message">${this.escapeHtml(
                        message
                    )}</div>
                `;
            } else {
                lastCommitInfo.innerHTML =
                    "<p class='value'>No commits found</p>";
            }
        }

        if (commitTime) {
            // For now, we'll show a placeholder. In a real implementation,
            // you'd get the commit timestamp from the Git log
            commitTime.innerHTML = "<span class='value'>Recently</span>";
        }

        // Remove skeleton loading elements
        if (commitContent) {
            const skeletons = commitContent.querySelectorAll(".skeleton");
            skeletons.forEach((skeleton) => skeleton.remove());
        }
        if (commitTime) {
            const skeletons = commitTime.querySelectorAll(".skeleton");
            skeletons.forEach((skeleton) => skeleton.remove());
        }
    }

    /**
     * Update recommendations
     */
    updateRecommendations(repo) {
        const recommendationsSection = document.getElementById(
            "repo-recommendations"
        );
        const recommendationsList = document.getElementById(
            "recommendations-list"
        );

        if (!recommendationsSection || !recommendationsList) return;

        const recommendations = [];

        // Check for uncommitted changes
        if (repo.hasChanges) {
            recommendations.push({
                type: "warning",
                title: WPGitManagerGlobal.translations.uncommittedChanges,
                description:
                    WPGitManagerGlobal.translations.youHaveUncommittedChanges,
                icon: "⚠️",
            });
        }

        // Check if behind remote
        if (repo.behind && repo.behind > 0) {
            recommendations.push({
                type: "warning",
                title: WPGitManagerGlobal.translations.behindRemote,
                description:
                    WPGitManagerGlobal.translations.yourLocalBranchIsBehind.replace(
                        "{count}",
                        repo.behind
                    ),
                icon: "⬇️",
            });
        }

        // Check if ahead of remote
        if (repo.ahead && repo.ahead > 0) {
            recommendations.push({
                type: "info",
                title: WPGitManagerGlobal.translations.aheadOfRemote,
                description:
                    WPGitManagerGlobal.translations.yourLocalBranchIsAhead.replace(
                        "{count}",
                        repo.ahead
                    ),
                icon: "⬆️",
            });
        }

        // Check if clean and up to date
        if (
            !repo.hasChanges &&
            (!repo.ahead || repo.ahead === 0) &&
            (!repo.behind || repo.behind === 0)
        ) {
            recommendations.push({
                type: "success",
                title: WPGitManagerGlobal.translations.repositoryStatus,
                description:
                    WPGitManagerGlobal.translations.yourRepositoryIsClean,
                icon: "✅",
            });
        }

        // Show/hide recommendations section
        if (recommendations.length > 0) {
            recommendationsSection.style.display = "block";

            const recommendationsHTML = recommendations
                .map((rec, idx) => {
                    const action = rec.type === "warning" ? "" : "";
                    return `
                        <div class="recommendation-item ${rec.type}" data-rec-index="${idx}">
                            <div class="recommendation-icon">${rec.icon}</div>
                            <div class="recommendation-content">
                                <div class="recommendation-title">${rec.title}</div>
                                <div class="recommendation-description">${rec.description}</div>
                            </div>
                            <div class="recommendation-actions">${action}</div>
                        </div>
                    `;
                })
                .join("");

            recommendationsList.innerHTML = recommendationsHTML;

            // Delegate clicks for recommendation actions
            recommendationsList
                .querySelectorAll("[data-rec-action]")
                ?.forEach((btn) => {
                    btn.addEventListener("click", (e) => {
                        const action = btn.getAttribute("data-rec-action");
                        const item = btn.closest(".recommendation-item");
                        const idx = item?.getAttribute("data-rec-index");
                        if (action === "investigate") {
                            // Trigger a troubleshooting run for the active repo
                            if (
                                typeof gitManager !== "undefined" &&
                                typeof gitManager.runTroubleshoot === "function"
                            ) {
                                gitManager.runTroubleshoot();
                            }
                        }
                    });
                });
        } else {
            recommendationsSection.style.display = "none";
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        // Show skeleton loading for repository details
        gitManagerSkeleton.showRepoDetailsSkeleton();
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        // Hide skeleton loading for repository details
        gitManagerSkeleton.hideRepoDetailsSkeleton();
    }

    /**
     * Load commits
     */
    async loadCommits(repoId) {
        // Show skeleton loading for commits
        gitManagerSkeleton.showCommitsSkeleton();

        try {
            const formData = new FormData();
            formData.append("action", gitManagerAjax.actions.log);
            formData.append("nonce", gitManagerAjax.nonce);
            formData.append("id", repoId);

            const response = await fetch(gitManagerAjax.ajaxurl, {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    gitManagerSkeleton.hideCommitsSkeleton();
                    this.populateCommits(result.data);
                } else {
                    gitManagerSkeleton.hideCommitsSkeleton();
                    const commitsList = document.querySelector(".commits-list");
                    if (commitsList) {
                        commitsList.innerHTML = "<p>Error loading commits.</p>";
                    }
                }
            } else {
                gitManagerSkeleton.hideCommitsSkeleton();
                const commitsList = document.querySelector(".commits-list");
                if (commitsList) {
                    commitsList.innerHTML = "<p>Error loading commits.</p>";
                }
            }
        } catch (error) {
            gitManagerSkeleton.hideCommitsSkeleton();
            const commitsList = document.querySelector(".commits-list");
            if (commitsList) {
                commitsList.innerHTML = "<p>Error loading commits.</p>";
            }
        }
    }

    populateCommits(commits) {
        const commitsList = document.querySelector(".commits-list");
        if (!commitsList) return;

        if (!commits || commits.length === 0) {
            commitsList.innerHTML = "<p>No commits found for this branch.</p>";
            return;
        }

        const commitsHTML = commits
            .map((commit, idx) => {
                const isLatest = idx === 0;
                return `
                <div class="git-commit-item ${isLatest ? "latest" : ""}">
                    <div class="git-avatar-container">
                        <img class="commit-avatar" src="${this.escapeHtml(
                            commit.gravatar_url || ""
                        )}" alt="${this.escapeHtml(commit.author_name)}">
                    </div>
                    <div class="git-commit-content">
                        <div class="git-commit-top">
                            <a class="git-commit-hash" href="#">${this.escapeHtml(
                                commit.hash
                            )}</a>
                            <span class="git-commit-date">${this.escapeHtml(
                                commit.date
                            )}</span>
                        </div>
                        <div class="git-commit-message">${this.escapeHtml(
                            commit.message
                        )}</div>
                        <div class="git-commit-meta">
                            <span class="git-commit-author">${this.escapeHtml(
                                commit.author_name
                            )}</span>
                            <a class="git-commit-view" href="#" data-hash="${this.escapeHtml(
                                commit.hash
                            )}">View</a>
                        </div>
                    </div>
                </div>
            `;
            })
            .join("");

        commitsList.innerHTML = commitsHTML;
    }

    /**
     * Load branches
     */
    async loadBranches(repoId) {
        const branchesList = document.querySelector(".branches-list");
        if (!branchesList) return;

        // Show skeleton loading for branches
        gitManagerSkeleton.showBranchesSkeleton();

        try {
            const formData = new FormData();
            formData.append("action", gitManagerAjax.actions.get_branches);
            formData.append("nonce", gitManagerAjax.nonce);
            formData.append("id", repoId);

            const response = await fetch(gitManagerAjax.ajaxurl, {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    gitManagerSkeleton.hideBranchesSkeleton();
                    this.populateBranches(result.data);
                } else {
                    gitManagerSkeleton.hideBranchesSkeleton();
                    branchesList.innerHTML = `<p>Error loading branches: ${result.data}</p>`;
                }
            } else {
                gitManagerSkeleton.hideBranchesSkeleton();
                branchesList.innerHTML = `<p>Error loading branches.</p>`;
            }
        } catch (error) {
            gitManagerSkeleton.hideBranchesSkeleton();
            branchesList.innerHTML = `<p>Error loading branches.</p>`;
        }
    }

    populateBranches(data) {
        const branchesList = document.querySelector(".branches-list");
        const searchInput = document.getElementById("branch-search-input");
        if (!branchesList || !searchInput) return;

        const { branches, activeBranch } = data;

        if (branches.length === 0) {
            branchesList.innerHTML = "<p>No branches found.</p>";
            return;
        }

        const render = (filter = "") => {
            const filteredBranches = branches.filter((branch) =>
                branch.toLowerCase().includes(filter.toLowerCase())
            );

            if (filteredBranches.length === 0) {
                branchesList.innerHTML = "<p>No matching branches found.</p>";
                return;
            }

            const branchesHTML = filteredBranches
                .map((branch) => {
                    const isCurrent = branch.replace("* ", "") === activeBranch;
                    const branchName = branch.replace("* ", "");
                    const isMain =
                        branchName === "main" || branchName === "master";
                    return `
                <div class="branch-item ${isCurrent ? "active" : ""} ${
                        isMain ? "branch-item-main" : ""
                    }">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="branch-icon"><line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                    <span class="branch-name">${this.escapeHtml(
                        branchName
                    )}</span>
                    <div class="branch-actions">
                        ${
                            isCurrent
                                ? '<span class="current-branch-badge">Current</span>'
                                : `<button class="git-action-btn checkout-btn" data-branch="${this.escapeHtml(
                                      branchName
                                  )}">Checkout</button>`
                        }
                    </div>
                </div>
            `;
                })
                .join("");
            branchesList.innerHTML = branchesHTML;

            // Add event listeners after rendering
            branchesList.querySelectorAll(".checkout-btn").forEach((button) => {
                button.addEventListener("click", (e) => {
                    const branchName = e.target.dataset.branch;
                    this.checkoutBranch(this.currentRepo, branchName);
                });
            });
        };

        render();

        searchInput.addEventListener("input", (e) => {
            render(e.target.value);
        });
    }

    /**
     * Checkout branch
     */
    async checkoutBranch(repoId, branchName) {
        this.showProgress(`Checking out ${branchName}...`);
        try {
            const formData = new FormData();
            formData.append("action", gitManagerAjax.actions.checkout_branch);
            formData.append("nonce", gitManagerAjax.nonce);
            formData.append("id", repoId);
            formData.append("branch", branchName);

            const response = await fetch(gitManagerAjax.ajaxurl, {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(
                    `Successfully checked out to ${branchName}`,
                    "success"
                );
                // Refresh repositories and then restore selection
                await this.loadRepositories();
                // Re-select the current repository after refresh
                this.selectRepository(repoId);
                this.switchTab("overview");
            } else {
                throw new Error(
                    result.data || `Failed to checkout ${branchName}`
                );
            }
        } catch (error) {
            this.showNotification(error.message, "error");
        } finally {
            this.hideProgress();
        }
    }

    /**
     * Action Handlers
     */
    handleAction(action, element) {
        const repoId =
            element.closest(".git-repo-card")?.dataset.repoId ||
            this.currentRepo;

        switch (action) {
            case "pull":
                this.pullRepository(repoId);
                break;
            case "push":
                this.pushRepository(repoId);
                break;
            case "fetch":
                this.fetchRepository(repoId);
                break;
            case "status":
                this.checkStatus(repoId);
                break;
            case "troubleshoot":
                this.showRepositoryTroubleshooting();
                break;
            case "fix-permission":
                this.fixPermission();
                break;
            case "delete":
                this.deleteRepository(repoId);
                break;
            default:
        }
    }

    async pullRepository(repoId) {
        if (!repoId) return;

        this.showNotification(
            WPGitManagerGlobal.translations.pullingChanges,
            "info"
        );
        try {
            const formData = new FormData();
            formData.append("action", gitManagerAjax.actions.repo_git);
            formData.append("nonce", gitManagerAjax.nonce);
            formData.append("id", repoId);
            formData.append("op", "pull");

            const response = await fetch(gitManagerAjax.ajaxurl, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showNotification(
                    "Repository updated successfully",
                    "success"
                );
                this.loadRepositories();
                this.checkStatus(repoId);
            } else {
                throw new Error(result.data || "Failed to pull changes");
            }
        } catch (error) {
            this.showNotification(
                "Failed to pull changes: " + error.message,
                "error"
            );
        }
    }

    async pushRepository(repoId) {
        if (!repoId) return;

        this.showNotification(
            WPGitManagerGlobal.translations.pushingChanges,
            "info"
        );
        try {
            const formData = new FormData();
            formData.append("action", gitManagerAjax.actions.repo_push);
            formData.append("nonce", gitManagerAjax.nonce);
            formData.append("id", repoId);

            const response = await fetch(gitManagerAjax.ajaxurl, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showNotification(
                    WPGitManagerGlobal.translations.changesPushedSuccessfully,
                    "success"
                );
                this.loadRepositories();
                this.checkStatus(repoId);
            } else {
                throw new Error(result.data || "Failed to push changes");
            }
        } catch (error) {
            this.showNotification(
                "Failed to push changes: " + error.message,
                "error"
            );
        }
    }

    async fetchRepository(repoId) {
        if (!repoId) return;

        this.showNotification(
            WPGitManagerGlobal.translations.fetchingUpdates,
            "info"
        );
        try {
            const formData = new FormData();
            formData.append("action", gitManagerAjax.actions.repo_git);
            formData.append("nonce", gitManagerAjax.nonce);
            formData.append("id", repoId);
            formData.append("op", "fetch");

            const response = await fetch(gitManagerAjax.ajaxurl, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showNotification(
                    "Repository fetched successfully",
                    "success"
                );
                this.loadRepositories();
                this.checkStatus(repoId);
            } else {
                throw new Error(result.data || "Failed to fetch updates");
            }
        } catch (error) {
            this.showNotification(
                "Failed to fetch updates: " + error.message,
                "error"
            );
        }
    }

    async checkStatus(repoId) {
        if (!repoId) return;

        this.showNotification(
            WPGitManagerGlobal.translations.checkingStatus,
            "info"
        );
        try {
            const formData = new FormData();
            formData.append("action", gitManagerAjax.actions.repo_status);
            formData.append("nonce", gitManagerAjax.nonce);
            formData.append("id", repoId);

            const response = await fetch(gitManagerAjax.ajaxurl, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showNotification(
                    WPGitManagerGlobal.translations.statusCheckedSuccessfully,
                    "success"
                );
                this.loadRepositories();
            } else {
                throw new Error(result.data || "Failed to check status");
            }
        } catch (error) {
            this.showNotification(
                "Failed to check status: " + error.message,
                "error"
            );
        }
    }

    async deleteRepository(repoId) {
        if (!repoId) return;

        if (
            confirm(
                "Are you sure you want to delete this repository? This action cannot be undone."
            )
        ) {
            this.showNotification(
                WPGitManagerGlobal.translations.deletingRepository,
                "info"
            );
            try {
                const formData = new FormData();
                formData.append("action", gitManagerAjax.actions.repo_delete);
                formData.append("id", repoId);
                formData.append("nonce", gitManagerAjax.nonce);

                const response = await fetch(gitManagerAjax.ajaxurl, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    this.showNotification(
                        "Repository deleted successfully",
                        "success"
                    );
                    this.loadRepositories();
                } else {
                    throw new Error(
                        result.data || "Failed to delete repository"
                    );
                }
            } catch (error) {
                this.showNotification(
                    "Failed to delete repository: " + error.message,
                    "error"
                );
            }
        }
    }

    async reCloneRepository(repoId) {
        if (!repoId) return;

        if (
            confirm(
                "Are you sure you want to re-clone this repository? This will download the repository again from the remote source."
            )
        ) {
            this.showNotification(
                getTranslation(
                    "reCloningRepository",
                    "Re-cloning repository..."
                ),
                "info"
            );
            try {
                const formData = new FormData();
                formData.append("action", gitManagerAjax.actions.repo_reclone);
                formData.append("id", repoId);
                formData.append("nonce", gitManagerAjax.nonce);

                const response = await fetch(gitManagerAjax.ajaxurl, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    this.showNotification(
                        "Repository re-cloned successfully",
                        "success"
                    );
                    this.loadRepositories();
                } else {
                    throw new Error(
                        result.data || "Failed to re-clone repository"
                    );
                }
            } catch (error) {
                this.showNotification(
                    "Failed to re-clone repository: " + error.message,
                    "error"
                );
            }
        }
    }

    /**
     * Utility Functions
     */
    showNotification(message, type = "info", options = {}) {
        const { duration = 5000, showProgress = true } = options;

        let container = document.getElementById("git-notifications");
        if (!container) {
            container = document.createElement("div");
            container.id = "git-notifications";
            document.body.appendChild(container);
        }

        const icons = {
            success:
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="notification-icon"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>',
            error: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="notification-icon"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m14.5 9.5-5 5"></path><path d="m9.5 9.5 5 5"></path></svg>',
            warning:
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="notification-icon"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
            info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="notification-icon"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>',
        };

        const role =
            type === "error" || type === "warning" ? "alert" : "status";

        const notification = document.createElement("div");
        notification.className = `git-notification git-notification-${type}`;
        notification.setAttribute("role", role);
        notification.setAttribute(
            "aria-live",
            type === "error" ? "assertive" : "polite"
        );
        notification.innerHTML = `
            <div class="notification-content">
                ${icons[type] || icons.info}
                <div class="notification-message">${this.escapeHtml(
                    message
                )}</div>
                <button class="notification-close" aria-label="Close notification">x</button>
            </div>
            <div class="notification-progress" style="${
                !showProgress || duration === 0 ? "display:none;" : ""
            }"><div class="notification-progress-fill"></div></div>
        `;

        container.appendChild(notification);

        // Progress handling
        const progress = notification.querySelector(
            ".notification-progress-fill"
        );
        let startTime = Date.now();
        let remaining = duration;
        let timerId = null;
        let rafId = null;

        const update = () => {
            if (duration > 0 && progress) {
                const elapsed = Date.now() - startTime;
                const ratio = Math.max(0, 1 - elapsed / duration);
                progress.style.width = `${Math.max(0, ratio * 100)}%`;
                if (elapsed >= duration) {
                    close();
                    return;
                }
            }
            rafId = requestAnimationFrame(update);
        };

        const start = () => {
            if (duration > 0) {
                startTime = Date.now();
                rafId = requestAnimationFrame(update);
                timerId = window.setTimeout(close, remaining);
            }
        };

        const pause = () => {
            if (rafId) cancelAnimationFrame(rafId);
            if (timerId) clearTimeout(timerId);
            if (duration > 0) remaining -= Date.now() - startTime;
        };

        const close = () => {
            pause();
            notification.classList.add("closing");
            setTimeout(() => notification.remove(), 200);
        };

        notification.addEventListener("mouseenter", pause);
        notification.addEventListener("mouseleave", start);
        notification
            .querySelector(".notification-close")
            .addEventListener("click", close);

        start();

        this.notifications.push(notification);
        return notification;
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Tab Management
     */
    switchTab(tabName) {
        // Remove active class from all tabs
        document.querySelectorAll(".git-repo-tab").forEach((tab) => {
            tab.classList.remove("active");
        });

        // Add active class to selected tab
        const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (selectedTab) {
            selectedTab.classList.add("active");
        }

        // Show corresponding content
        this.showTabContent(tabName);

        // Load data for the selected tab if it hasn't been loaded yet
        if (tabName === "commits" && this.currentRepo) {
            this.loadCommits(this.currentRepo);
        }

        if (tabName === "branches" && this.currentRepo) {
            this.loadBranches(this.currentRepo);
        }

        // Special handling for troubleshooting tab
        if (tabName === "troubleshooting" && this.currentRepo) {
            this.initializeTroubleshootingTab();
        }

        // Special handling for settings tab
        if (tabName === "settings" && this.currentRepo) {
            this.initializeSettingsTab();
        }
    }

    /**
     * Initialize troubleshooting tab when switched to
     */
    initializeTroubleshootingTab() {
        const outputContainer = document.getElementById("repo-manager-output");
        if (!outputContainer) return;

        // Check if troubleshooting is already initialized
        if (
            window.gitTroubleshooter &&
            window.gitTroubleshooter.repoId === this.currentRepo
        ) {
            return; // Already initialized for this repository
        }

        // Clear any existing content
        outputContainer.innerHTML = "";

        // Initialize enhanced troubleshooting for the current repository
        if (typeof GitTroubleshooter !== "undefined") {
            window.gitTroubleshooter = new GitTroubleshooter();
            window.gitTroubleshooter.init(this.currentRepo);
        } else {
            // Show skeleton loading for troubleshooting
            outputContainer.innerHTML = `
                <div class="skeleton-tab-content">
                    <div class="skeleton-tab-header">
                        <div class="skeleton skeleton-tab-title"></div>
                        <div class="skeleton-tab-actions">
                            <div class="skeleton skeleton-tab-action"></div>
                            <div class="skeleton skeleton-tab-action"></div>
                        </div>
                    </div>
                    <div class="skeleton-list">
                        <div class="skeleton-list-item">
                            <div class="skeleton skeleton-list-icon"></div>
                            <div class="skeleton-list-content">
                                <div class="skeleton skeleton-list-title"></div>
                                <div class="skeleton skeleton-list-subtitle"></div>
                            </div>
                        </div>
                        <div class="skeleton-list-item">
                            <div class="skeleton skeleton-list-icon"></div>
                            <div class="skeleton-list-content">
                                <div class="skeleton skeleton-list-title"></div>
                                <div class="skeleton skeleton-list-subtitle"></div>
                            </div>
                        </div>
                        <div class="skeleton-list-item">
                            <div class="skeleton skeleton-list-icon"></div>
                            <div class="skeleton-list-content">
                                <div class="skeleton skeleton-list-title"></div>
                                <div class="skeleton skeleton-list-subtitle"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    showTabContent(tabName) {
        // Hide all tab contents
        document.querySelectorAll(".tab-content").forEach((content) => {
            content.style.display = "none";
        });

        // Show selected tab content
        const selectedContent = document.querySelector(
            `[data-tab-content="${tabName}"]`
        );
        if (selectedContent) {
            selectedContent.style.display = "block";
        }
    }

    /**
     * New Directory Selector
     */
    browsePath(targetInputSelector) {
        this.directorySelectorTarget = targetInputSelector;
        this.showNewDirectorySelector();
    }

    showNewDirectorySelector() {
        const modalHTML = `
            <div class="git-modal-content new-directory-selector-modal">
                <div class="git-modal-header">
                    <h3>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"></path><path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"></path><path d="M3 5a2 2 0 0 0 2 2h3"></path><path d="M3 3v13a2 2 0 0 0 2 2h3"></path></svg>
                        Directory Browser for Repository Manager
                    </h3>
                    <button class="git-modal-close" aria-label="Close modal">x</button>
                </div>

                <div class="git-modal-body">
                    <div class="new-directory-browser">
                        <!-- Enhanced Search Bar -->
                        <div class="new-search-container">
                            <div class="new-search-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="new-search-icon">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                                <input
                                    type="text"
                                    class="new-search-input-enhanced"
                                    placeholder="Search folders by name..."
                                    id="new-search-enhanced"
                                    autocomplete="off"
                                >
                                <button class="new-search-clear" id="new-search-clear" style="display: none;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M18 6 6 18"></path>
                                        <path d="m6 6 12 12"></path>
                                    </svg>
                                </button>
                            </div>
                            <div class="new-search-status" id="new-search-status"></div>
                        </div>

                        <!-- Breadcrumb Navigation -->
                        <div class="new-breadcrumb" id="new-breadcrumb">
                            <button class="new-breadcrumb-item active" data-path="/">Root</button>
                        </div>

                        <!-- Toolbar -->
                        <div class="new-toolbar">
                            <div class="new-actions">
                                <button class="new-back-btn" id="new-back-btn" title="Go Back" style="display: none;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="m15 18-6-6 6-6"/>
                                    </svg>
                                    Back
                                </button>
                                <button class="new-action-btn" id="new-create-folder" title="Create Folder">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                                </button>
                                <button class="new-action-btn" id="new-delete-folder" title="Delete Folder">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4c0-1 1-2 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                                <button class="new-action-btn" id="new-rename" title="Rename">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                </button>
                                <button class="new-action-btn" id="new-refresh" title="Refresh">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                                </button>
                            </div>
                        </div>

                        <!-- Directory List -->
                        <div class="new-directory-list" id="new-directory-list">
                            <!-- Loading skeleton will be shown here -->
                        </div>
                    </div>
                </div>

                <div class="git-modal-footer">
                    <div class="new-selected-path" id="new-selected-path" style="display: none;">
                        <span class="new-selected-label">Selected:</span>
                        <span class="new-selected-value" id="new-selected-value"></span>
                    </div>
                    <div class="new-footer-actions">
                        <button type="button" class="git-action-btn git-secondary-btn" id="new-cancel-btn">
                            Cancel
                        </button>
                        <button type="button" class="git-action-btn" id="new-select-btn" disabled>
                            Select Directory
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modal = this.showModal("new-directory-selector", modalHTML);

        if (!modal) {
            return;
        }

        // Small delay to ensure modal is fully rendered
        setTimeout(() => {
            this.loadNewDirectories("", modal); // Load root directory
            this.setupNewDirectoryEvents(modal);
        }, 50);
    }

    async loadNewDirectories(path, modal) {
        if (!modal) {
            return;
        }
        const directoryList = modal.querySelector("#new-directory-list");
        const breadcrumb = modal.querySelector("#new-breadcrumb");

        if (!directoryList || !breadcrumb) return;

        // Show loading skeleton
        this.showNewDirectorySkeleton(modal);

        try {
            const formData = new FormData();
            formData.append("action", gitManagerAjax.actions.repo_dirs);
            formData.append("nonce", gitManagerAjax.nonce);
            // The backend expects an empty string for the root directory
            formData.append("relative", path);

            const response = await fetch(gitManagerAjax.ajaxurl, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.hideNewDirectorySkeleton(modal);
                this.renderNewDirectories(data.data, path, modal);
                this.updateNewBreadcrumb(path, modal);
            } else {
                throw new Error(data.data || "Failed to load directories");
            }
        } catch (error) {
            this.hideNewDirectorySkeleton(modal);
            if (directoryList) {
                directoryList.innerHTML = `
                    <div class="new-error">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        <span>Failed to load directories: ${error.message}</span>
                    </div>
                `;
            }
        }
    }

    showNewDirectorySkeleton(modal) {
        if (!modal) return;
        const directoryList = modal.querySelector("#new-directory-list");
        if (!directoryList) return;

        directoryList.innerHTML = `
            <div class="new-skeleton">
                ${Array(5)
                    .fill()
                    .map(
                        () => `
                    <div class="new-skeleton-item">
                        <div class="new-skeleton-icon"></div>
                        <div class="new-skeleton-content">
                            <div class="new-skeleton-name"></div>
                            <div class="new-skeleton-info"></div>
                        </div>
                    </div>
                `
                    )
                    .join("")}
            </div>
        `;
    }

    hideNewDirectorySkeleton(modal) {
        if (!modal) return;
        const skeleton = modal.querySelector(".new-skeleton");
        if (skeleton) {
            skeleton.remove();
        }
    }

    renderNewDirectories(directories, currentPath, modal) {
        if (!modal) return;
        const directoryList = modal.querySelector("#new-directory-list");
        if (!directoryList) return;

        const rawItems = Array.isArray(directories)
            ? directories
            : directories && Array.isArray(directories.dirs)
            ? directories.dirs
            : [];

        // Process items to ensure they have the correct structure
        const items = rawItems.map((item) => {
            if (item && (item.type || item.path)) {
                return item;
            }

            // Use the relative path from the backend, or construct from name if needed
            const name = item?.name || "";
            const relativePath = item?.relative || "";

            // If we have a relative path from the backend, use it directly
            if (relativePath) {
                return {
                    type: "directory",
                    writable: true,
                    path: relativePath,
                    name: name,
                    permissions: item?.permissions || "",
                };
            }

            // Fallback: construct path from current path and name
            const basePath = currentPath === "/" ? "" : currentPath || "";
            const normalizedPath = `/${
                basePath ? basePath.replace(/\/$/, "") + "/" : ""
            }${name}`.replace(/\/+/g, "/");

            return {
                type: "directory",
                writable: true,
                path: normalizedPath,
                name: name,
                permissions: item?.permissions || "",
            };
        });

        if (!items || items.length === 0) {
            directoryList.innerHTML = `
                <div class="new-empty">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M3 7h5l2 3h11v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/>
                    </svg>
                    <span>No folders found</span>
                </div>
            `;
            return;
        }

        directoryList.innerHTML = `
            <div class="new-items">
                ${items
                    .map((dir) => this.createNewDirectoryItemHTML(dir))
                    .join("")}
            </div>
        `;
    }

    createNewDirectoryItemHTML(dir) {
        return `
            <div class="new-directory-item" data-path="${dir.path}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                <div class="new-directory-info">
                    <div class="new-directory-name">${this.escapeHtml(
                        dir.name
                    )}</div>
                    <div class="new-directory-path">${dir.path}</div>
                </div>
                <button class="new-item-action" title="Enter folder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                    </svg>
                </button>
            </div>
        `;
    }

    updateNewBreadcrumb(path, modal) {
        if (!modal) return;
        const breadcrumb = modal.querySelector("#new-breadcrumb");
        const backBtn = modal.querySelector("#new-back-btn");
        if (!breadcrumb) return;

        // Add loading state
        breadcrumb.classList.add("loading");

        // Normalize path: ensure it's a string and handle root cases
        const normalizedPath = typeof path === "string" ? path.trim() : "";

        // Handle edge cases: remove leading/trailing slashes and normalize
        const cleanPath = normalizedPath.replace(/^[/\\]+|[/\\]+$/g, "");

        // Split by slash and filter out empty parts and current directory references
        const pathParts = cleanPath
            .split(/[\\/]+/)
            .filter((part) => part && part !== "." && part !== "..");

        // If we're at root, only "Root" should be active
        if (pathParts.length === 0) {
            breadcrumb.innerHTML =
                '<button class="new-breadcrumb-item active" data-path="" aria-current="page">Root</button>';
            if (backBtn) {
                backBtn.style.display = "none";
            }
            breadcrumb.classList.remove("loading");
            return;
        }

        let breadcrumbHTML =
            '<button class="new-breadcrumb-item" data-path="" aria-label="Go to root directory">Root</button>';

        let currentPath = "";
        pathParts.forEach((part, index) => {
            // Build the path step by step, ensuring proper separation
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            const isLast = index === pathParts.length - 1;
            const escapedPart = this.escapeHtml(part);
            const escapedPath = this.escapeHtml(currentPath);

            breadcrumbHTML += `
                <span class="new-breadcrumb-separator" aria-hidden="true">/</span>
                <button class="new-breadcrumb-item ${
                    isLast ? "active" : ""
                }" data-path="${escapedPath}" title="${escapedPart}" ${
                isLast
                    ? 'aria-current="page"'
                    : `aria-label="Go to ${escapedPart} directory"`
            }>
                    ${escapedPart}
                </button>
            `;
        });

        breadcrumb.innerHTML = breadcrumbHTML;

        // Show back button when not at root
        if (backBtn) {
            backBtn.style.display = "flex";
        }

        // Ensure breadcrumb is scrollable if needed
        setTimeout(() => {
            breadcrumb.scrollLeft = breadcrumb.scrollWidth;
            breadcrumb.classList.remove("loading");
        }, 100);
    }

    setupNewDirectoryEvents(modal) {
        if (!modal) {
            return;
        }

        // Breadcrumb navigation
        modal.addEventListener("click", (e) => {
            if (e.target.matches(".new-breadcrumb-item")) {
                e.preventDefault();
                e.stopPropagation();

                const path = e.target.dataset.path;
                const isActive = e.target.classList.contains("active");

                // Don't reload if clicking on already active item
                if (isActive) return;

                // Add visual feedback
                e.target.style.transform = "scale(0.95)";
                setTimeout(() => {
                    e.target.style.transform = "";
                }, 150);

                this.loadNewDirectories(path, modal);
            }
        });

        // Back button navigation
        const backBtn = modal.querySelector("#new-back-btn");
        if (backBtn) {
            backBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const currentActive = modal.querySelector(
                    ".new-breadcrumb-item.active"
                );
                if (!currentActive) return;

                const currentPath = currentActive.dataset.path;
                if (!currentPath) return; // Already at root

                // Get parent path
                const pathParts = currentPath.split("/").filter((part) => part);
                pathParts.pop(); // Remove current folder
                const parentPath = pathParts.join("/");

                // Navigate to parent directory
                this.loadNewDirectories(parentPath, modal);
            });
        }

        // Enhanced Search functionality
        const searchInput = modal.querySelector("#new-search-enhanced");
        const searchClear = modal.querySelector("#new-search-clear");
        const searchStatus = modal.querySelector("#new-search-status");

        if (searchInput) {
            searchInput.addEventListener(
                "input",
                this.debounce((e) => {
                    const query = e.target.value.trim();
                    this.handleSearchInput(
                        query,
                        modal,
                        searchClear,
                        searchStatus
                    );
                }, 300)
            );

            // Focus on search input when modal opens
            searchInput.focus();
        }

        if (searchClear) {
            searchClear.addEventListener("click", () => {
                searchInput.value = "";
                searchClear.style.display = "none";
                if (searchStatus) searchStatus.textContent = "";

                // Return to current directory view
                const currentPath =
                    modal.querySelector(".new-breadcrumb-item.active")?.dataset
                        .path || "/";
                this.loadNewDirectories(currentPath, modal);
            });
        }

        // Refresh button
        const refreshBtn = modal.querySelector("#new-refresh");
        if (refreshBtn) {
            refreshBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const currentPath =
                    modal.querySelector(".new-breadcrumb-item.active")?.dataset
                        .path || "/";

                // Add loading state
                refreshBtn.classList.add("loading");
                refreshBtn.disabled = true;

                try {
                    // Convert breadcrumb path to relative path for the backend
                    const relativePath =
                        currentPath === "/"
                            ? ""
                            : currentPath.replace(/^\//, "");
                    await this.loadNewDirectories(relativePath, modal);
                } finally {
                    // Remove loading state
                    refreshBtn.classList.remove("loading");
                    refreshBtn.disabled = false;
                }
            });
        }

        // Create folder
        const createBtn = modal.querySelector("#new-create-folder");
        if (createBtn) {
            createBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const currentPath =
                    modal.querySelector(".new-breadcrumb-item.active")?.dataset
                        .path || "/";
                const folderName = prompt("Enter folder name:");
                if (!folderName) return;

                try {
                    const formData = new FormData();
                    formData.append(
                        "action",
                        gitManagerAjax.actions.dir_create
                    );
                    formData.append("nonce", gitManagerAjax.nonce);
                    formData.append(
                        "relative",
                        currentPath === "/"
                            ? ""
                            : currentPath.replace(/^\//, "")
                    );
                    formData.append("name", folderName);

                    const res = await fetch(gitManagerAjax.ajaxurl, {
                        method: "POST",
                        body: formData,
                    });

                    const data = await res.json();
                    if (!data.success)
                        throw new Error(data.data || "Create failed");

                    this.loadNewDirectories(currentPath, modal);
                    this.showNotification(
                        "Folder created successfully",
                        "success"
                    );
                } catch (err) {
                    this.showNotification(
                        `Failed to create folder: ${err.message}`,
                        "error"
                    );
                }
            });
        }

        // Delete folder
        const deleteBtn = modal.querySelector("#new-delete-folder");
        if (deleteBtn) {
            deleteBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const selectedPath = modal.querySelector(
                    "#new-selected-value"
                )?.textContent;
                if (!selectedPath) {
                    this.showNotification(
                        "Please select a folder to delete",
                        "warning"
                    );
                    return;
                }

                if (
                    !confirm(
                        `Are you sure you want to delete "${selectedPath}"? It must be empty.`
                    )
                ) {
                    return;
                }

                try {
                    const formData = new FormData();
                    formData.append(
                        "action",
                        gitManagerAjax.actions.dir_delete
                    );
                    formData.append("nonce", gitManagerAjax.nonce);
                    formData.append(
                        "relative",
                        selectedPath === "/" ? "" : selectedPath
                    );

                    const res = await fetch(gitManagerAjax.ajaxurl, {
                        method: "POST",
                        body: formData,
                    });

                    const data = await res.json();
                    if (!data.success)
                        throw new Error(data.data || "Delete failed");

                    const currentPath =
                        modal.querySelector(".new-breadcrumb-item.active")
                            ?.dataset.path || "/";
                    this.loadNewDirectories(currentPath, modal);

                    // Clear selection
                    const selectedDisplay =
                        modal.querySelector("#new-selected-path");
                    const selectBtn = modal.querySelector("#new-select-btn");
                    if (selectedDisplay && selectBtn) {
                        selectedDisplay.style.display = "none";
                        selectBtn.disabled = true;
                    }

                    this.showNotification(
                        "Folder deleted successfully",
                        "success"
                    );
                } catch (err) {
                    this.showNotification(
                        `Failed to delete folder: ${err.message}`,
                        "error"
                    );
                }
            });
        }

        // Rename folder
        const renameBtn = modal.querySelector("#new-rename");
        if (renameBtn) {
            renameBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const selectedPath = modal.querySelector(
                    "#new-selected-value"
                )?.textContent;
                if (!selectedPath) {
                    this.showNotification(
                        "Please select a folder to rename",
                        "warning"
                    );
                    return;
                }

                const currentName = selectedPath.split("/").pop();
                const newName = prompt("Enter new folder name:", currentName);
                if (!newName || newName === currentName) return;

                try {
                    const formData = new FormData();
                    formData.append(
                        "action",
                        gitManagerAjax.actions.dir_rename
                    );
                    formData.append("nonce", gitManagerAjax.nonce);
                    formData.append(
                        "relative",
                        selectedPath === "/" ? "" : selectedPath
                    );
                    formData.append("new_name", newName);

                    const res = await fetch(gitManagerAjax.ajaxurl, {
                        method: "POST",
                        body: formData,
                    });

                    const data = await res.json();
                    if (!data.success)
                        throw new Error(data.data || "Rename failed");

                    const currentPath =
                        modal.querySelector(".new-breadcrumb-item.active")
                            ?.dataset.path || "/";
                    this.loadNewDirectories(currentPath, modal);

                    // Clear selection
                    const selectedDisplay =
                        modal.querySelector("#new-selected-path");
                    const selectBtn = modal.querySelector("#new-select-btn");
                    if (selectedDisplay && selectBtn) {
                        selectedDisplay.style.display = "none";
                        selectBtn.disabled = true;
                    }

                    this.showNotification(
                        "Folder renamed successfully",
                        "success"
                    );
                } catch (err) {
                    this.showNotification(
                        `Failed to rename folder: ${err.message}`,
                        "error"
                    );
                }
            });
        }

        // Directory item clicks - Enhanced navigation
        modal.addEventListener("click", (e) => {
            const item = e.target.closest(".new-directory-item");
            if (!item) return;

            const path = item.dataset.path;
            if (!path) return;

            // Check if we're in search mode
            const isSearchMode = item.classList.contains("new-search-item");
            const searchInput = modal.querySelector("#new-search-enhanced");
            const hasSearchQuery = searchInput && searchInput.value.trim();

            // If clicking on action button
            if (e.target.closest(".new-item-action")) {
                e.preventDefault();
                e.stopPropagation();

                if (isSearchMode || hasSearchQuery) {
                    // In search mode, select the folder instead of navigating
                    this.selectNewDirectory(path, modal);

                    // Clear search and return to normal view
                    if (searchInput) {
                        searchInput.value = "";
                        const searchClear =
                            modal.querySelector("#new-search-clear");
                        const searchStatus =
                            modal.querySelector("#new-search-status");
                        if (searchClear) searchClear.style.display = "none";
                        if (searchStatus) searchStatus.textContent = "";
                    }

                    // Navigate to the parent directory of the selected item
                    const pathParts = path.split("/");
                    pathParts.pop(); // Remove the folder name
                    const parentPath =
                        pathParts.length > 0 ? pathParts.join("/") : "";
                    this.loadNewDirectories(parentPath, modal);
                } else {
                    // Normal navigation mode
                    this.loadNewDirectories(path, modal);
                }
                return;
            }

            // Remove selection from all items
            modal.querySelectorAll(".new-directory-item").forEach((dirItem) => {
                dirItem.classList.remove("selected");
            });

            // Add selection to clicked item
            item.classList.add("selected");

            // Select the folder
            this.selectNewDirectory(path, modal);
        });

        // Double-click to navigate - Fixed
        modal.addEventListener("dblclick", (e) => {
            const item = e.target.closest(".new-directory-item");
            if (item) {
                e.preventDefault();
                e.stopPropagation();
                const path = item.dataset.path;
                if (path) {
                    // Use the relative path for navigation (this is the path relative to WordPress root)
                    this.loadNewDirectories(path, modal);
                }
            }
        });

        // Select button
        const selectBtn = modal.querySelector("#new-select-btn");
        if (selectBtn) {
            const $this = this;
            selectBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const selectedValueElement = modal.querySelector(
                    "#new-selected-value"
                );
                const selectedPath = selectedValueElement?.textContent;

                console.log(
                    "Directory selector target:",
                    $this.directorySelectorTarget
                );

                if (selectedPath && selectedPath.trim()) {
                    if ($this.directorySelectorTarget) {
                        const targetInput = document.querySelector(
                            $this.directorySelectorTarget
                        );

                        if (targetInput) {
                            // Convert backslashes to forward slashes for consistency
                            const normalizedPath = selectedPath.replace(
                                /\\/g,
                                "/"
                            );
                            console.log(
                                "Setting input value to:",
                                normalizedPath
                            );

                            targetInput.value = normalizedPath;

                            // Trigger input event to update any dependent UI
                            targetInput.dispatchEvent(
                                new Event("input", { bubbles: true })
                            );

                            console.log(
                                "Input value after setting:",
                                targetInput.value
                            );
                        } else {
                            console.error(
                                "Directory selector target input not found:",
                                $this.directorySelectorTarget
                            );
                        }
                    } else {
                    }

                    // Small delay to ensure the value is properly set before closing
                    setTimeout(() => {
                        $this.closeModal("new-directory-selector");
                    }, 100);
                } else {
                }
            });
        }

        // Cancel button
        const cancelBtn = modal.querySelector("#new-cancel-btn");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal("new-directory-selector");
            });
        }

        // Close modal when clicking overlay
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                this.closeModal("new-directory-selector");
            }
        });

        // Close modal when clicking close button
        const closeBtn = modal.querySelector(".git-modal-close");
        if (closeBtn) {
            closeBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal("new-directory-selector");
            });
        }
    }

    selectNewDirectory(path, modal) {
        if (!modal) return;
        const selectedDisplay = modal.querySelector("#new-selected-path");
        const selectedValue = modal.querySelector("#new-selected-value");
        const selectBtn = modal.querySelector("#new-select-btn");

        if (selectedDisplay && selectedValue && selectBtn) {
            selectedValue.textContent = path;
            selectedDisplay.style.display = "flex";
            selectBtn.disabled = false;

            console.log(
                "Directory selected successfully. Value set to:",
                selectedValue.textContent
            );
        } else {
            console.error(
                "Failed to find required elements for directory selection"
            );
        }
    }

    handleSearchInput(query, modal, searchClear, searchStatus) {
        if (!modal) return;

        // Show/hide clear button
        if (searchClear) {
            searchClear.style.display = query ? "flex" : "none";
        }

        if (!query) {
            if (searchStatus) searchStatus.textContent = "";
            const currentPath =
                modal.querySelector(".new-breadcrumb-item.active")?.dataset
                    .path || "/";
            this.loadNewDirectories(currentPath, modal);

            // Remove loading state
            const searchWrapper = modal.querySelector(".new-search-wrapper");
            if (searchWrapper) {
                searchWrapper.classList.remove("searching");
            }
            return;
        }

        // Add loading state
        const searchWrapper = modal.querySelector(".new-search-wrapper");
        if (searchWrapper) {
            searchWrapper.classList.add("searching");
        }

        // Update search status
        if (searchStatus) {
            searchStatus.textContent = `Searching for "${query}"...`;
        }

        this.searchNewDirectories(query, modal, searchStatus);
    }

    async searchNewDirectories(query, modal, searchStatus) {
        if (!modal) return;

        if (!query.trim()) {
            const currentPath =
                modal.querySelector(".new-breadcrumb-item.active")?.dataset
                    .path || "/";
            this.loadNewDirectories(currentPath, modal);
            return;
        }

        try {
            // Show loading skeleton for search
            this.showNewDirectorySkeleton(modal);

            const formData = new FormData();
            formData.append("action", gitManagerAjax.actions.repo_dirs);
            formData.append("nonce", gitManagerAjax.nonce);
            formData.append("query", query);

            const response = await fetch(gitManagerAjax.ajaxurl, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.hideNewDirectorySkeleton(modal);
                this.renderSearchResults(data.data, query, modal, searchStatus);

                // Remove loading state
                const searchWrapper = modal.querySelector(
                    ".new-search-wrapper"
                );
                if (searchWrapper) {
                    searchWrapper.classList.remove("searching");
                }
            } else {
                throw new Error(data.data || "Failed to search directories");
            }
        } catch (error) {
            this.hideNewDirectorySkeleton(modal);

            // Remove loading state
            const searchWrapper = modal.querySelector(".new-search-wrapper");
            if (searchWrapper) {
                searchWrapper.classList.remove("searching");
            }

            if (searchStatus) {
                searchStatus.textContent = `Search failed: ${error.message}`;
            }
            if (modal) {
                const directoryList = modal.querySelector(
                    "#new-directory-list"
                );
                if (directoryList) {
                    directoryList.innerHTML = `
                        <div class="new-error">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                            </svg>
                            <span>Search failed: ${error.message}</span>
                        </div>
                    `;
                }
            }
        }
    }

    renderSearchResults(directories, query, modal, searchStatus) {
        if (!modal) return;
        const directoryList = modal.querySelector("#new-directory-list");
        if (!directoryList) return;

        const rawItems = Array.isArray(directories)
            ? directories
            : directories && Array.isArray(directories.dirs)
            ? directories.dirs
            : [];

        // Update search status
        if (searchStatus) {
            if (rawItems.length === 0) {
                searchStatus.textContent = `No folders found matching "${query}"`;
            } else {
                searchStatus.textContent = `Found ${rawItems.length} folder${
                    rawItems.length === 1 ? "" : "s"
                } matching "${query}"`;
            }
        }

        if (!rawItems || rawItems.length === 0) {
            directoryList.innerHTML = `
                <div class="new-empty">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M3 7h5l2 3h11v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/>
                    </svg>
                    <span>No folders found matching "${query}"</span>
                </div>
            `;
            return;
        }

        // Process search results to show full paths
        const items = rawItems.map((item) => {
            const name = item?.name || "";
            const relativePath = item?.relative || "";

            // For search results, we want to show the full path structure
            return {
                type: "directory",
                writable: true,
                path: relativePath,
                name: name,
                fullPath: relativePath, // This will be used for display
                permissions: item?.permissions || "",
            };
        });

        directoryList.innerHTML = `
            <div class="new-items new-search-results">
                ${items
                    .map((dir) => this.createSearchResultItemHTML(dir, query))
                    .join("")}
            </div>
        `;
    }

    createSearchResultItemHTML(dir, query) {
        // Highlight the matching part of the name
        const highlightedName = this.highlightSearchMatch(dir.name, query);

        return `
            <div class="new-directory-item new-search-item" data-path="${dir.path}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                <div class="new-directory-info">
                    <div class="new-directory-name">${highlightedName}</div>
                    <div class="new-directory-path">${dir.fullPath}</div>
                </div>
                <button class="new-item-action" title="Select folder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                    </svg>
                </button>
            </div>
        `;
    }

    highlightSearchMatch(text, query) {
        if (!query) return this.escapeHtml(text);

        const regex = new RegExp(`(${this.escapeRegex(query)})`, "gi");
        return this.escapeHtml(text).replace(
            regex,
            '<mark class="search-highlight">$1</mark>'
        );
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    /**
     * Test directory selector buttons
     */
    testDirectorySelectorButtons() {
        const modal = document.querySelector(
            '[data-modal-id="new-directory-selector"]'
        );
        if (!modal) {
            return;
        }

        const buttons = {
            refresh: modal.querySelector("#new-refresh"),
            create: modal.querySelector("#new-create-folder"),
            delete: modal.querySelector("#new-delete-folder"),
            select: modal.querySelector("#new-select-btn"),
            cancel: modal.querySelector("#new-cancel-btn"),
        };

        // Test if buttons are clickable
        Object.entries(buttons).forEach(([name, button]) => {
            if (button) {
                console.log(
                    `${name} button clickable:`,
                    button.offsetParent !== null
                );
                console.log(
                    `${name} button visible:`,
                    button.offsetWidth > 0 && button.offsetHeight > 0
                );
                console.log(
                    `${name} button z-index:`,
                    window.getComputedStyle(button).zIndex
                );
            } else {
            }
        });
    }

    /**
     * Troubleshooting
     */
    showTroubleshooting() {
        // Check if enhanced troubleshooting is available
        if (typeof GitTroubleshooter !== "undefined") {
            this.showEnhancedTroubleshooting();
        } else {
            this.showNotification(
                "Enhanced troubleshooting system is loading...",
                "info"
            );
        }
    }

    /**
     * Show enhanced troubleshooting interface
     */
    showEnhancedTroubleshooting() {
        // Check if we're in repository context
        if (this.currentRepo) {
            this.showRepositoryTroubleshooting();
            // Show troubleshooting in the repository tab
        }
    }

    /**
     * Show repository-specific troubleshooting in the tab
     */
    showRepositoryTroubleshooting() {
        // Switch to troubleshooting tab (this will also initialize the troubleshooting)
        this.switchTab("troubleshooting");
    }

    /**
     * Professional troubleshooting for repositories
     */
    async troubleshootRepo() {
        if (!this.currentRepo) {
            this.showNotification(
                WPGitManagerGlobal.translations.noRepositorySelected,
                "warning"
            );
            return;
        }

        this.showProgress(
            WPGitManagerGlobal.translations.runningProfessionalTroubleshooting
        );

        try {
            const response = await this.apiCall(
                "git_manager_repo_troubleshoot",
                {
                    id: this.currentRepo,
                }
            );

            if (response.success) {
                this.showTroubleshootModal(response.data.html);
            } else {
                this.showNotification(
                    "Troubleshooting failed: " +
                        (response.data ||
                            WPGitManagerGlobal.translations.unknownError),
                    "error"
                );
            }
        } catch (error) {
            this.showNotification(
                "Troubleshooting error: " + error.message,
                "error"
            );
        } finally {
            this.hideProgress();
        }
    }

    /**
     * Fix repository permissions
     */
    async fixPermission() {
        if (!this.currentRepo) {
            this.showNotification(
                WPGitManagerGlobal.translations.noRepositorySelected,
                "warning"
            );
            return;
        }

        // Start notification for Fix Permissions
        this.showNotification(
            WPGitManagerGlobal.translations.requestingPermissionFix,
            "info",
            {
                duration: 4000,
            }
        );

        this.showProgress(
            WPGitManagerGlobal.translations.fixingRepositoryPermissions
        );

        try {
            const response = await this.apiCall("git_manager_fix_permission", {
                id: this.currentRepo,
            });

            if (response.success) {
                this.showNotification(
                    "Permissions fixed successfully!",
                    "success"
                );
                // Refresh repository details
                this.loadRepositoryDetails(this.currentRepo);
            } else {
                this.showNotification(
                    "Permission fix failed: " +
                        (response.data ||
                            WPGitManagerGlobal.translations.unknownError),
                    "error"
                );
            }
        } catch (error) {
            this.showNotification(
                "Permission fix error: " + error.message,
                "error"
            );
        } finally {
            this.hideProgress();
        }
    }

    /**
     * Show troubleshooting results modal
     */
    showTroubleshootModal(html) {
        const modal = document.createElement("div");
        modal.className = "git-modal-overlay";
        modal.id = "troubleshoot-modal";
        modal.innerHTML = `
            <div class="git-modal-content git-modal-large">
                <div class="git-modal-header">
                    <h3><span class="dashicons dashicons-hammer"></span> Professional Troubleshooting Results</h3>
                    <button class="git-modal-close" onclick="GitManager.closeTroubleshootModal()">x</button>
                </div>
                <div class="git-modal-body">
                    <div class="troubleshoot-results">
                        ${html}
                    </div>
                </div>
                <div class="git-modal-footer">
                    <button class="git-action-btn git-secondary-btn" onclick="GitManager.closeTroubleshootModal()">Close</button>
                    <button class="git-action-btn" onclick="GitManager.fixPermission()">Fix Permissions</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Helper function to make API calls
     */
    async apiCall(action, data = {}) {
        const formData = new FormData();
        formData.append("action", action);
        formData.append("nonce", gitManagerAjax.nonce);

        // Add all data properties to formData
        for (const [key, value] of Object.entries(data)) {
            formData.append(key, value);
        }

        const response = await fetch(gitManagerAjax.ajaxurl, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    getStatusText(repo) {
        if (repo.hasChanges) {
            return "Modified";
        }
        if (repo.ahead && repo.ahead > 0) {
            return `Ahead by ${repo.ahead}`;
        }
        if (repo.behind && repo.behind > 0) {
            return `Behind by ${repo.behind}`;
        }
        return "Clean";
    }

    /**
     * Initialize settings tab when switched to
     */
    initializeSettingsTab() {
        if (!this.currentRepo) {
            this.showNotification(
                WPGitManagerGlobal.translations.noRepositorySelected,
                "warning"
            );
            return;
        }

        console.log(
            "Initializing settings tab for repository:",
            this.currentRepo
        );

        // Load current repository data
        this.loadRepositorySettings();

        // Setup settings form event listeners
        this.setupSettingsFormListeners();
    }

    /**
     * Load repository settings into the settings form
     */
    async loadRepositorySettings() {
        try {
            const response = await this.apiCall("git_manager_repo_details", {
                id: this.currentRepo,
            });

            if (response.success) {
                const repo = response.data;

                // Populate settings form fields
                const nameInput = document.getElementById("repo-name-setting");
                const pathInput = document.getElementById("repo-path-setting");
                const remoteInput = document.getElementById(
                    "repo-remote-setting"
                );

                if (nameInput) nameInput.value = repo.name || "";
                if (pathInput) pathInput.value = repo.path || "";
                if (remoteInput) remoteInput.value = repo.remoteUrl || "";

                // Show success notification
                this.showNotification(
                    getTranslation(
                        "repositorySettingsLoaded",
                        "Repository settings loaded successfully"
                    ),
                    "success",
                    {
                        duration: 2000,
                    }
                );
            } else {
                this.showNotification(
                    "Failed to load repository settings",
                    "error"
                );
            }
        } catch (error) {
            this.showNotification(
                getTranslation(
                    "errorLoadingRepositorySettings",
                    "Error loading repository settings"
                ),
                "error"
            );
        }
    }

    /**
     * Setup event listeners for settings form
     */
    setupSettingsFormListeners() {
        // Save settings button
        const saveButton = document.getElementById("save-settings-btn");
        if (saveButton) {
            saveButton.onclick = (e) => {
                e.preventDefault();
                this.saveRepositorySettings();
            };
        }

        // Auto-save on input changes (optional - for real-time updates)
        const inputs = document.querySelectorAll(
            ".settings-form input, .settings-form textarea, .settings-form select"
        );
        inputs.forEach((input) => {
            input.addEventListener("input", () => {
                // Add visual indicator that changes are pending
                this.markSettingsAsModified();

                // Special handling for path input
                if (input.id === "repo-path-setting") {
                    this.validatePathInput(input);
                }
            });
        });

        // Setup maintenance button event listeners
        const maintenanceButtons = document.querySelectorAll(
            ".settings-section .maintenance-buttons .git-action-btn"
        );
        maintenanceButtons.forEach((button) => {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                const action = button.dataset.action;
                this.handleMaintenanceAction(action);
            });
        });

        // Setup refresh repository list button
        const refreshButton = document.getElementById("refresh-repo-list-btn");
        if (refreshButton) {
            refreshButton.addEventListener("click", (e) => {
                e.preventDefault();
                this.refreshRepositoryList();
            });
        }
    }

    /**
     * Handle maintenance actions in settings
     */
    handleMaintenanceAction(action) {
        if (!this.currentRepo) {
            this.showNotification(
                WPGitManagerGlobal.translations.noRepositorySelected,
                "warning"
            );
            return;
        }

        switch (action) {
            case "troubleshoot":
                this.switchTab("troubleshooting");
                break;
            case "fix-permission":
                this.fixPermission();
                break;
            default:
                this.showNotification(
                    `Unknown maintenance action: ${action}`,
                    "error"
                );
        }
    }

    /**
     * Mark settings as modified (visual feedback)
     */
    markSettingsAsModified() {
        const saveButton = document.getElementById("save-settings-btn");
        if (saveButton) {
            saveButton.classList.add("modified");
            saveButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17,21 17,13 7,13 7,21"/>
                    <polyline points="7,3 7,8 15,8"/>
                </svg>
                Save Settings (Modified)
            `;
        }
    }

    /**
     * Save repository settings
     */
    async saveRepositorySettings() {
        if (!this.currentRepo) {
            this.showNotification(
                WPGitManagerGlobal.translations.noRepositorySelected,
                "warning"
            );
            return;
        }

        // Get form values
        const nameInput = document.getElementById("repo-name-setting");
        const pathInput = document.getElementById("repo-path-setting");
        const remoteInput = document.getElementById("repo-remote-setting");

        if (!nameInput || !pathInput) {
            this.showNotification(
                WPGitManagerGlobal.translations.settingsFormNotFound,
                "error"
            );
            return;
        }

        const settings = {
            id: this.currentRepo,
            name: nameInput.value.trim(),
            path: pathInput.value.trim(),
            remoteUrl: remoteInput ? remoteInput.value.trim() : "",
        };

        // Validate required fields
        if (!settings.name) {
            this.showNotification(
                WPGitManagerGlobal.translations.repositoryNameRequired,
                "error"
            );
            nameInput.focus();
            return;
        }

        if (!settings.path) {
            this.showNotification(
                WPGitManagerGlobal.translations.repositoryPathRequired,
                "error"
            );
            pathInput.focus();
            return;
        }

        // Validate path format
        if (settings.path.includes("..") || settings.path.includes("//")) {
            this.showNotification(
                WPGitManagerGlobal.translations.invalidRepositoryPath,
                "error"
            );
            pathInput.focus();
            return;
        }

        this.showProgress("Saving repository settings...");

        try {
            const response = await this.apiCall(
                "git_manager_repo_update",
                settings
            );

            if (response.success) {
                this.showNotification(
                    "Repository settings saved successfully",
                    "success"
                );

                // Update all UI elements that display repository information
                this.updateRepositoryDisplay(response.data);
                this.updateRepositoryList();
                this.updateRepositoryCard(response.data);

                // Verify the repository still exists in the list
                setTimeout(() => {
                    this.verifyRepositoryExists(response.data.id);
                }, 1000);

                // Check if the new path exists and show appropriate message
                if (response.data.path) {
                    this.checkPathExistenceAndNotify(
                        response.data.path,
                        response.data.name
                    );
                }

                // Reset modified state
                const saveButton = document.getElementById("save-settings-btn");
                if (saveButton) {
                    saveButton.classList.remove("modified");
                    saveButton.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17,21 17,13 7,13 7,21"/>
                            <polyline points="7,3 7,8 15,8"/>
                        </svg>
                        Save Settings
                    `;
                }

                // Log successful update for debugging - removed
            } else {
                const errorMessage =
                    response.data ||
                    WPGitManagerGlobal.translations.unknownError;
                console.error(
                    "Failed to save repository settings:",
                    errorMessage
                );
                this.showNotification(
                    "Failed to save repository settings: " + errorMessage,
                    "error"
                );
            }
        } catch (error) {
            this.showNotification(
                "Error saving repository settings: " + error.message,
                "error"
            );
        }

        this.hideProgress();
    }

    /**
     * Update repository card in the sidebar
     */
    updateRepositoryCard(repoData) {
        const repoCard = document.querySelector(
            `[data-repo-id="${repoData.id}"]`
        );
        if (repoCard) {
            // Update repository name
            const nameElement = repoCard.querySelector(".git-repo-name");
            if (nameElement) {
                nameElement.textContent = repoData.name;
            }

            // Update repository path
            const pathElement = repoCard.querySelector(".git-repo-path");
            if (pathElement) {
                pathElement.textContent = repoData.path;
            }

            // Update any other displayed information
            const statusElement = repoCard.querySelector(".git-repo-status");
            if (statusElement) {
                statusElement.textContent = repoData.hasChanges
                    ? "Modified"
                    : "Clean";
            }
        }
    }

    /**
     * Update repository list (refresh the entire list)
     */
    async updateRepositoryList() {
        try {
            const response = await this.apiCall("git_manager_repo_list");
            if (response.success) {
                this.renderRepositories(response.data);
            }
        } catch (error) {}
    }

    /**
     * Verify that a repository still exists after update
     */
    async verifyRepositoryExists(repoId) {
        try {
            const response = await this.apiCall("git_manager_repo_list");
            if (response.success) {
                const repoExists = response.data.some(
                    (repo) => repo.id === repoId
                );
                if (!repoExists) {
                    console.warn(
                        "Repository not found in list after update:",
                        repoId
                    );
                    this.showNotification(
                        "Warning: Repository may not be visible due to path changes. Please refresh the page.",
                        "warning"
                    );
                } else {
                }
            }
        } catch (error) {}
    }

    /**
     * Validate path input in real-time
     */
    validatePathInput(input) {
        const path = input.value.trim();
        const helpElement = input.parentNode.querySelector(".form-help");

        if (!path) {
            this.clearPathValidation(input, helpElement);
            return;
        }

        // Check for invalid characters
        if (path.includes("..") || path.includes("//")) {
            this.showPathValidationError(
                input,
                helpElement,
                "Invalid path format"
            );
            return;
        }

        // Check if path exists
        this.checkPathExists(path, input, helpElement);
    }

    /**
     * Check if path exists via AJAX
     */
    async checkPathExists(path, input, helpElement) {
        try {
            // For now, we'll do a simple client-side check
            // In a real implementation, you might want to make an AJAX call to check server-side

            // Show loading state
            this.showPathValidationLoading(input, helpElement);

            // Simulate path check (you can replace this with actual AJAX call)
            setTimeout(() => {
                // For demo purposes, assume path is valid if it doesn't contain obvious invalid patterns
                if (
                    path.startsWith("/") ||
                    path.includes("wp-content") ||
                    path.includes("wp-admin")
                ) {
                    this.showPathValidationSuccess(
                        input,
                        helpElement,
                        "Path format looks valid"
                    );
                } else {
                    this.showPathValidationWarning(
                        input,
                        helpElement,
                        "Path may not exist on server"
                    );
                }
            }, 500);
        } catch (error) {
            this.showPathValidationError(
                input,
                helpElement,
                "Error checking path"
            );
        }
    }

    /**
     * Show path validation loading state
     */
    showPathValidationLoading(input, helpElement) {
        if (helpElement) {
            helpElement.innerHTML =
                '<span style="color: var(--gm-info);">Checking path...</span>';
        }
        input.style.borderColor = "var(--gm-info)";
    }

    /**
     * Show path validation success
     */
    showPathValidationSuccess(input, helpElement, message) {
        this.clearPathValidation(input, helpElement);
        input.classList.add("is-valid");
        helpElement.innerHTML = `<span style="color: var(--gm-success);">✓ ${message}</span>`;
    }

    /**
     * Show path validation warning
     */
    showPathValidationWarning(input, helpElement, message) {
        this.clearPathValidation(input, helpElement);
        input.classList.add("is-warning");
        helpElement.innerHTML = `<span style="color: var(--gm-warning);">⚠ ${message}</span>`;
    }

    /**
     * Show path validation error
     */
    showPathValidationError(input, helpElement, message) {
        this.clearPathValidation(input, helpElement);
        input.classList.add("is-invalid");
        helpElement.innerHTML = `<span style="color: var(--gm-error);">✕ ${message}</span>`;
    }

    /**
     * Clear path validation
     */
    clearPathValidation(input, helpElement) {
        if (helpElement) {
            helpElement.innerHTML =
                "The local path where the repository is located";
        }
        input.style.borderColor = "var(--gm-border)";
    }

    /**
     * Check path existence and notify user
     */
    async checkPathExistenceAndNotify(path, repoName) {
        try {
            // Make an AJAX call to check if the path exists on the server
            const response = await this.apiCall("git_manager_repo_dirs", {
                path: path,
            });

            if (response.success) {
                const pathExists = response.data.exists || false;
                if (!pathExists) {
                    this.showNotification(
                        `Repository "${repoName}" updated successfully, but the new path "${path}" does not exist on the server. The repository will appear with a "missing folder" warning.`,
                        "warning",
                        { duration: 8000 }
                    );
                }
            }
        } catch (error) {
            // Don't show error to user as this is just a verification step
        }
    }

    /**
     * Show help message for missing repositories
     */
    showMissingRepositoryHelp() {
        const helpMessage = `
            <div style="padding: 20px; background: var(--gm-bg-secondary); border-radius: var(--gm-radius); border: 1px solid var(--gm-border);">
                <h4 style="margin-top: 0; color: var(--gm-warning);">Repository Not Found?</h4>
                <p>If you recently changed a repository's path and can't find it:</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>The repository may appear with a "missing folder" warning</li>
                    <li>Check the repository list for repositories with warning icons</li>
                    <li>If the path doesn't exist, you can re-clone the repository</li>
                    <li>Or update the path to point to the correct location</li>
                </ul>
                                        <button class="git-action-btn git-secondary-btn" onclick="window.safeGitManagerCall('refreshRepositoryList')">
                    Refresh Repository List
                </button>
            </div>
        `;

        // Show this as a modal or notification
        this.showModal("missing-repo-help", helpMessage);
    }

    /**
     * Refresh repository list with detailed logging
     */
    async refreshRepositoryList() {
        try {
            const response = await this.apiCall("git_manager_repo_list");
            if (response.success) {
                this.renderRepositories(response.data);

                // Count missing folders
                const missingFolders = response.data.filter(
                    (repo) => !repo.folderExists
                );
                if (missingFolders.length > 0) {
                    console.log(
                        "Found repositories with missing folders:",
                        missingFolders
                    );
                    this.showNotification(
                        `Found ${missingFolders.length} repository(ies) with missing folders. Check the list for warning icons.`,
                        { duration: 5000 }
                    );
                }
            }
        } catch (error) {
            this.showNotification(
                WPGitManagerGlobal.translations.errorRefreshingRepositoryList,
                "error"
            );
        }
    }

    /**
     * Manage repository path (unified solution for both re-cloning and fixing path)
     */
    async manageRepositoryPath(repoId) {
        try {
            // Get repository details first
            const response = await this.apiCall("git_manager_repo_details", {
                id: repoId,
            });

            if (!response.success) {
                this.showNotification(
                    "Failed to get repository details: " +
                        (response.data ||
                            WPGitManagerGlobal.translations.unknownError),
                    "error"
                );
                return;
            }

            const repo = response.data;

            // Set the directory selector target for the manage path modal
            this.directorySelectorTarget = "#repo-path-input";

            this.showManagePathModal(repo);
        } catch (error) {
            this.showNotification(
                "Error getting repository details: " + error.message,
                "error"
            );
        }
    }

    /**
     * Show unified modal for managing repository path
     */
    showManagePathModal(repo) {
        const isMissing = !repo.folderExists;
        const modalHTML = `
            <div class="git-modal-content git-manage-path-modal">
                <div class="git-modal-header">
                    <h3>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" style="margin-right: 8px;">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                        Manage Repository Path
                    </h3>
                    <button class="git-modal-close" aria-label="Close modal">x</button>
                </div>

                <div class="git-modal-body">
                    <div class="manage-path-info">
                        <h4>Repository: ${this.escapeHtml(repo.name)}</h4>
                        <p><strong>Current Path:</strong> <span style="color: ${
                            isMissing ? "var(--gm-error)" : "var(--gm-text)"
                        }">${this.escapeHtml(repo.path.replace(/\\/g, "/"))} ${
            isMissing ? "(Missing)" : ""
        }</span></p>
                        <p><strong>Remote URL:</strong> ${this.escapeHtml(
                            repo.remoteUrl || "Not configured"
                        )}</p>
                        <p><strong>Status:</strong> <span style="color: ${
                            isMissing
                                ? "var(--gm-warning)"
                                : "var(--gm-success)"
                        }">${
            isMissing ? "Folder Missing" : "Valid Repository"
        }</span></p>
                    </div>

                    <form id="manage-path-form" class="git-manage-path-form">
                        <div class="form-section">
                            <h4 class="form-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                    <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                                    <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                                    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                                    <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                                </svg>
                                Repository Path
                            </h4>

                            <div class="form-group">
                                <label for="repo-path-input">Repository Path</label>
                                <div class="input-group">
                                    <input
                                        type="text"
                                        id="repo-path-input"
                                        name="repo_path"
                                        class="form-control"
                                        placeholder="wp-content/plugins/my-plugin"
                                        value="${this.escapeHtml(
                                            repo.path.replace(/\\/g, "/")
                                        )}"
                                        required
                                    >
                                    <button type="button" class="git-action-btn git-secondary-btn" id="browse-path-btn">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                                        </svg>
                                        Browse
                                    </button>
                                </div>
                                <div class="form-help">Enter the path where the repository is or should be located</div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h4 class="form-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                    <path d="M15 7h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3"/>
                                    <path d="M10 11l4 4-4 4"/>
                                    <path d="M14 15H9a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h5"/>
                                </svg>
                                Action Options
                            </h4>

                            <div class="form-group">
                                <label class="switch-label">
                                    <span class="switch-text">Update Path Only</span>
                                    <div class="switch-container">
                                        <input type="checkbox" id="update-path-only" name="action_type" value="update_path" class="switch-input" ${
                                            !isMissing ? "checked" : ""
                                        }>
                                        <span class="switch-slider"></span>
                                    </div>
                                </label>
                                <div class="form-help">Update the path in Repo Manager(use if files already exist at new location)</div>
                            </div>

                            <div class="form-group">
                                <label class="switch-label">
                                    <span class="switch-text">Re-clone Repository</span>
                                    <div class="switch-container">
                                        <input type="checkbox" id="reclone-repo" name="action_type" value="reclone" class="switch-input" ${
                                            isMissing ? "checked" : ""
                                        }>
                                        <span class="switch-slider"></span>
                                    </div>
                                </label>
                                <div class="form-help">Clone the repository fresh to the new path (creates new files)</div>
                            </div>

                            <div class="form-group" id="branch-group" style="display: none;">
                                <label for="repo-branch">Branch (Optional)</label>
                                <input
                                    type="text"
                                    id="repo-branch"
                                    name="branch"
                                    class="form-control"
                                    placeholder="main"
                                >
                                <div class="form-help">Specify a branch to checkout (defaults to main/master)</div>
                            </div>

                            <div class="form-group" id="delete-old-group" style="display: none;">
                                <label class="switch-label">
                                    <span class="switch-text">Delete old repository entry</span>
                                    <div class="switch-container">
                                        <input type="checkbox" id="delete-old-entry" name="delete_old" class="switch-input" checked>
                                        <span class="switch-slider"></span>
                                    </div>
                                </label>
                                <div class="form-help">Remove the old repository entry after successful re-clone</div>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="git-modal-footer">
                    <button type="button" class="git-action-btn git-secondary-btn" id="cancel-manage-path-btn">
                        Cancel
                    </button>
                    <button type="submit" form="manage-path-form" class="git-action-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                        Apply Changes
                    </button>
                </div>
            </div>
        `;

        const modal = this.showModal("manage-path", modalHTML);

        if (modal) {
            // Setup event listeners
            this.setupManagePathEventListeners(repo);
        }
    }

    /**
     * Setup event listeners for manage path modal
     */
    setupManagePathEventListeners(repo) {
        // Browse path button
        const browseBtn = document.getElementById("browse-path-btn");
        if (browseBtn) {
            browseBtn.onclick = () => {
                // Ensure the target is set correctly for manage path
                this.directorySelectorTarget = "#repo-path-input";
                this.browsePath(this.directorySelectorTarget);
            };
        }

        // Cancel button
        const cancelBtn = document.getElementById("cancel-manage-path-btn");
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                this.closeModal("manage-path");
            };
        }

        // Action type switches
        const updatePathSwitch = document.getElementById("update-path-only");
        const recloneSwitch = document.getElementById("reclone-repo");

        if (updatePathSwitch) {
            updatePathSwitch.addEventListener("change", () => {
                if (updatePathSwitch.checked) {
                    if (recloneSwitch) recloneSwitch.checked = false;
                }
                this.toggleManagePathOptions();
            });
        }

        if (recloneSwitch) {
            recloneSwitch.addEventListener("change", () => {
                if (recloneSwitch.checked) {
                    if (updatePathSwitch) updatePathSwitch.checked = false;
                }
                this.toggleManagePathOptions();
            });
        }

        // Form submission
        const form = document.getElementById("manage-path-form");
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleManagePathSubmit(repo);
            };
        }

        // Initialize options visibility
        this.toggleManagePathOptions();
    }

    /**
     * Toggle manage path options based on selected action
     */
    toggleManagePathOptions() {
        const recloneSwitch = document.getElementById("reclone-repo");
        const isReclone = recloneSwitch ? recloneSwitch.checked : false;
        const branchGroup = document.getElementById("branch-group");
        const deleteOldGroup = document.getElementById("delete-old-group");

        if (isReclone) {
            if (branchGroup) branchGroup.style.display = "block";
            if (deleteOldGroup) deleteOldGroup.style.display = "block";
        } else {
            if (branchGroup) branchGroup.style.display = "none";
            if (deleteOldGroup) deleteOldGroup.style.display = "none";
        }
    }

    /**
     * Handle manage path form submission
     */
    async handleManagePathSubmit(repo) {
        const newPath = document.getElementById("repo-path-input").value.trim();

        // Get action type from switches
        const recloneSwitch = document.getElementById("reclone-repo");
        const actionType =
            recloneSwitch && recloneSwitch.checked ? "reclone" : "update_path";

        // Safely get branch value with proper null checks
        const branchElement = document.getElementById("repo-branch");
        const branch =
            branchElement && branchElement.value
                ? branchElement.value.trim()
                : "main";

        // Safely get delete old checkbox value
        const deleteOldElement = document.getElementById("delete-old-entry");
        const deleteOld = deleteOldElement ? deleteOldElement.checked : false;

        if (!newPath) {
            this.showNotification(
                WPGitManagerGlobal.translations.repositoryPathRequired,
                "error"
            );
            return;
        }

        if (!actionType) {
            this.showNotification(
                WPGitManagerGlobal.translations.pleaseSelectActionType,
                "error"
            );
            return;
        }

        this.showProgress(
            actionType === "reclone"
                ? "Re-cloning repository..."
                : "Updating repository path..."
        );

        try {
            if (actionType === "update_path") {
                // Update path only
                const response = await this.apiCall("git_manager_repo_update", {
                    id: repo.id,
                    name: repo.name,
                    path: newPath,
                    remoteUrl: repo.remoteUrl,
                    authType: repo.authType,
                    meta: repo.meta,
                });

                if (response.success) {
                    console.log(
                        "Update successful, showing success notification"
                    );
                    this.showNotification(
                        `Repository path updated successfully to: ${newPath}`,
                        "success"
                    );

                    // Close modal and refresh list
                    this.closeModal("manage-path");
                    this.refreshRepositoryList();

                    // Select the updated repository
                    setTimeout(() => {
                        this.selectRepository(repo.id);
                    }, 1000);
                } else {
                    console.log(
                        "Update failed, showing error notification:",
                        response.data
                    );
                    this.showNotification(
                        "Failed to update repository path: " +
                            (response.data ||
                                WPGitManagerGlobal.translations.unknownError),
                        "error"
                    );
                }
            } else if (actionType === "reclone") {
                // Re-clone repository
                const addResponse = await this.apiCall("git_manager_repo_add", {
                    name: repo.name,
                    repo_path: newPath,
                    repo_url: repo.remoteUrl,
                    repo_branch: branch,
                    authType: repo.authType,
                    existing_repo: false,
                });

                if (addResponse.success) {
                    const newRepoId = addResponse.data.id;

                    // If delete old is checked, delete the old repository
                    if (deleteOld) {
                        await this.apiCall("git_manager_repo_delete", {
                            id: repo.id,
                            delete_files: false,
                        });
                    }

                    this.showNotification(
                        `Repository "${repo.name}" successfully re-cloned to new path: ${newPath}`,
                        "success"
                    );

                    // Close modal and refresh list
                    this.closeModal("manage-path");
                    this.refreshRepositoryList();

                    // Select the new repository
                    setTimeout(() => {
                        this.selectRepository(newRepoId);
                    }, 1000);
                } else {
                    this.showNotification(
                        "Failed to re-clone repository: " +
                            (addResponse.data ||
                                WPGitManagerGlobal.translations.unknownError),
                        "error"
                    );
                }
            }
        } catch (error) {
            this.showNotification(
                "Error managing repository path: " + error.message,
                "error"
            );
        }

        this.hideProgress();
    }

    /**
     * Update repository card in the list
     */
    updateRepoCard(repo) {
        const card = document.querySelector(
            `.git-repo-card[data-repo-id="${repo.id}"]`
        );
        if (!card) return;

        const statusElement = card.querySelector(".repo-status");
        if (!statusElement) return;

        const ahead = parseInt(repo.ahead || 0, 10);
        const behind = parseInt(repo.behind || 0, 10);
        let statusClass = "clean";

        // Use same status logic as overview tab and createRepoCardHTML
        if (repo.hasChanges) {
            statusClass = "changes";
        } else if (ahead > 0 && behind > 0) {
            statusClass = "diverged";
        } else if (ahead > 0) {
            statusClass = "ahead";
        } else if (behind > 0) {
            statusClass = "behind";
        }

        statusElement.className = `repo-status ${statusClass}`;
        statusElement.setAttribute("data-repo-status", statusClass);

        // Keep only the status dot, remove any text that might have been added
        const statusDot = statusElement.querySelector(".status-dot");
        if (statusDot) {
            statusElement.innerHTML = `<span class="status-dot"></span>`;
        }

        // Update repository type badge if it exists
        const badgeElement = card.querySelector(".repo-type-badge");
        if (badgeElement && repo.repoType) {
            const badgeText =
                repo.repoType === "plugin"
                    ? "#Plugin"
                    : repo.repoType === "theme"
                    ? "#Theme"
                    : "#Other";
            badgeElement.className = `repo-hashtag ${repo.repoType}`;
            badgeElement.textContent = badgeText;
        }
    }
}

// Initialize Repo Manager when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    try {
        if (typeof gitManagerAjax !== "undefined") {
            window.GitManager = new GitManager();

            // Add safety wrapper for inline onclick handlers
            window.safeGitManagerCall = (method, ...args) => {
                if (
                    window.GitManager &&
                    typeof window.GitManager[method] === "function"
                ) {
                    return window.GitManager[method](...args);
                } else {
                    console.warn(
                        `GitManager method ${method} not available yet`
                    );
                    return Promise.resolve();
                }
            };

            // Expose methods globally for inline onclick handlers
            window.importSSHKey = () => {
                if (window.GitManager && window.GitManager.importSSHKey) {
                    window.GitManager.importSSHKey();
                } else {
                }
            };

            window.clearSSHKey = () => {
                if (window.GitManager && window.GitManager.clearSSHKey) {
                    window.GitManager.clearSSHKey();
                } else {
                }
            };

            window.showSSHHelp = () => {
                if (window.GitManager && window.GitManager.showSSHHelp) {
                    window.GitManager.showSSHHelp();
                } else {
                }
            };

            window.closeSSHHelp = () => {
                if (window.GitManager && window.GitManager.closeSSHHelp) {
                    window.GitManager.closeSSHHelp();
                } else {
                }
            };

            window.showTokenHelp = () => {
                if (window.GitManager && window.GitManager.showTokenHelp) {
                    window.GitManager.showTokenHelp();
                } else {
                }
            };

            window.closeTokenHelp = () => {
                if (window.GitManager && window.GitManager.closeTokenHelp) {
                    window.GitManager.closeTokenHelp();
                } else {
                }
            };

            window.loadRepositories = () => {
                if (window.GitManager) {
                    window.GitManager.loadRepositories();
                } else {
                }
            };

            window.selectRepo = (repoId) => {
                if (window.GitManager) {
                    window.GitManager.selectRepository(repoId);
                } else {
                }
            };
        } else {
        }
    } catch (error) {}
});

// Global error handler
window.addEventListener("error", function (event) {});

window.addEventListener("unhandledrejection", function (event) {});

class GitManagerSkeleton {
    constructor() {
        this.skeletonTemplates = {
            // Repository card skeleton
            repoCard: `
                <div class="skeleton-repo-card">
                    <div class="skeleton-repo-header">
                        <div class="skeleton skeleton-repo-name"></div>
                        <div class="skeleton skeleton-repo-status"></div>
                    </div>
                    <div class="skeleton skeleton-repo-path"></div>
                    <div class="skeleton skeleton-repo-branch"></div>
                </div>
            `,

            // Commit item skeleton
            commitItem: `
                <div class="skeleton-commit-item">
                    <div class="skeleton skeleton-commit-avatar"></div>
                    <div class="skeleton-commit-content">
                        <div class="skeleton skeleton-commit-author"></div>
                        <div class="skeleton skeleton-commit-message"></div>
                    </div>
                </div>
            `,

            // Branch item skeleton
            branchItem: `
                <div class="skeleton-branch-item">
                    <div class="skeleton skeleton-branch-icon"></div>
                    <div class="skeleton skeleton-branch-name"></div>
                </div>
            `,

            // Info grid skeleton
            infoGrid: `
                <div class="skeleton-info-grid">
                    <div class="skeleton-info-item">
                        <div class="skeleton skeleton-info-label"></div>
                        <div class="skeleton skeleton-info-value"></div>
                    </div>
                    <div class="skeleton-info-item">
                        <div class="skeleton skeleton-info-label"></div>
                        <div class="skeleton skeleton-info-value"></div>
                    </div>
                    <div class="skeleton-info-item">
                        <div class="skeleton skeleton-info-label"></div>
                        <div class="skeleton skeleton-info-value"></div>
                    </div>
                    <div class="skeleton-info-item">
                        <div class="skeleton skeleton-info-label"></div>
                        <div class="skeleton skeleton-info-value"></div>
                    </div>
                </div>
            `,

            // Overview cards skeleton
            overviewGrid: `
                <div class="skeleton-overview-grid">
                    <div class="skeleton-overview-card">
                        <div class="skeleton-overview-header">
                            <div class="skeleton skeleton-overview-title"></div>
                            <div class="skeleton skeleton-overview-indicator"></div>
                        </div>
                        <div class="skeleton-overview-content">
                            <div class="skeleton skeleton-text"></div>
                            <div class="skeleton skeleton-text"></div>
                        </div>
                    </div>
                    <div class="skeleton-overview-card">
                        <div class="skeleton-overview-header">
                            <div class="skeleton skeleton-overview-title"></div>
                            <div class="skeleton skeleton-overview-indicator"></div>
                        </div>
                        <div class="skeleton-overview-content">
                            <div class="skeleton skeleton-text"></div>
                            <div class="skeleton skeleton-text"></div>
                        </div>
                    </div>
                    <div class="skeleton-overview-card">
                        <div class="skeleton-overview-header">
                            <div class="skeleton skeleton-overview-title"></div>
                            <div class="skeleton skeleton-overview-indicator"></div>
                        </div>
                        <div class="skeleton-overview-content">
                            <div class="skeleton skeleton-text"></div>
                            <div class="skeleton skeleton-text"></div>
                        </div>
                    </div>
                    <div class="skeleton-overview-card">
                        <div class="skeleton-overview-header">
                            <div class="skeleton skeleton-overview-title"></div>
                            <div class="skeleton skeleton-overview-indicator"></div>
                        </div>
                        <div class="skeleton-overview-content">
                            <div class="skeleton skeleton-text"></div>
                            <div class="skeleton skeleton-text"></div>
                        </div>
                    </div>
                </div>
            `,

            // Directory item skeleton
            directoryItem: `
                <div class="skeleton-directory-item">
                    <div class="skeleton skeleton-directory-icon"></div>
                    <div class="skeleton-directory-info">
                        <div class="skeleton skeleton-directory-name"></div>
                        <div class="skeleton skeleton-directory-permissions"></div>
                    </div>
                </div>
            `,

            // Welcome screen skeleton
            welcome: `
                <div class="skeleton-welcome">
                    <div class="skeleton-welcome-content">
                        <div class="skeleton skeleton-welcome-icon"></div>
                        <div class="skeleton skeleton-welcome-title"></div>
                        <div class="skeleton skeleton-welcome-description"></div>
                        <div class="skeleton-welcome-actions">
                            <div class="skeleton skeleton-welcome-button"></div>
                            <div class="skeleton skeleton-welcome-button"></div>
                        </div>
                    </div>
                </div>
            `,

            // Tab content skeleton
            tabContent: `
                <div class="skeleton-tab-content">
                    <div class="skeleton-tab-header">
                        <div class="skeleton skeleton-tab-title"></div>
                        <div class="skeleton-tab-actions">
                            <div class="skeleton skeleton-tab-action"></div>
                            <div class="skeleton skeleton-tab-action"></div>
                        </div>
                    </div>
                    <div class="skeleton-list">
                        <div class="skeleton-list-item">
                            <div class="skeleton skeleton-list-icon"></div>
                            <div class="skeleton-list-content">
                                <div class="skeleton skeleton-list-title"></div>
                                <div class="skeleton skeleton-list-subtitle"></div>
                            </div>
                        </div>
                        <div class="skeleton-list-item">
                            <div class="skeleton skeleton-list-icon"></div>
                            <div class="skeleton-list-content">
                                <div class="skeleton skeleton-list-title"></div>
                                <div class="skeleton skeleton-list-subtitle"></div>
                            </div>
                        </div>
                        <div class="skeleton-list-item">
                            <div class="skeleton skeleton-list-icon"></div>
                            <div class="skeleton-list-content">
                                <div class="skeleton skeleton-list-title"></div>
                                <div class="skeleton skeleton-list-subtitle"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `,

            // Progress overlay skeleton
            progressOverlay: `
                <div class="skeleton-progress-overlay">
                    <div class="skeleton-progress-content">
                        <div class="skeleton skeleton-progress-spinner"></div>
                        <div class="skeleton skeleton-progress-text"></div>
                    </div>
                </div>
            `,
        };
    }

    /**
     * Show skeleton loading for repository list
     */
    showRepoSkeleton() {
        const repoList = document.querySelector(".git-repo-list");
        if (repoList) {
            repoList.classList.add("skeleton-loading-repos");
            const skeletonHTML = this.skeletonTemplates.repoCard.repeat(5);
            repoList.innerHTML = skeletonHTML;
        }
    }

    /**
     * Hide skeleton loading for repository list
     */
    hideRepoSkeleton() {
        const repoList = document.querySelector(".git-repo-list");
        if (repoList) {
            repoList.classList.remove("skeleton-loading-repos");
        }
    }

    /**
     * Show skeleton loading for commits
     */
    showCommitsSkeleton() {
        const commitsList = document.querySelector(".commits-list");
        if (commitsList) {
            commitsList.classList.add("skeleton-loading-commits");
            const skeletonHTML = this.skeletonTemplates.commitItem.repeat(3);
            commitsList.innerHTML = skeletonHTML;
        }
    }

    /**
     * Hide skeleton loading for commits
     */
    hideCommitsSkeleton() {
        const commitsList = document.querySelector(".commits-list");
        if (commitsList) {
            commitsList.classList.remove("skeleton-loading-commits");
        }
    }

    /**
     * Show skeleton loading for branches
     */
    showBranchesSkeleton() {
        const branchesList = document.querySelector(".branches-list");
        if (branchesList) {
            branchesList.classList.add("skeleton-loading-branches");
            const skeletonHTML = this.skeletonTemplates.branchItem.repeat(4);
            branchesList.innerHTML = skeletonHTML;
        }
    }

    /**
     * Hide skeleton loading for branches
     */
    hideBranchesSkeleton() {
        const branchesList = document.querySelector(".branches-list");
        if (branchesList) {
            branchesList.classList.remove("skeleton-loading-branches");
        }
    }

    /**
     * Show skeleton loading for repository details
     */
    showRepoDetailsSkeleton() {
        const repoDetails = document.querySelector(".git-repo-details");
        if (!repoDetails) {
            return;
        }

        // Never replace innerHTML for containers that include persistent IDs.
        // Instead, toggle lightweight skeleton classes that do not remove children.
        const infoGrid = repoDetails.querySelector(".repo-info-grid");
        if (infoGrid) {
            infoGrid.classList.add("skeleton-loading-info-grid");
        }

        const overviewGrid = repoDetails.querySelector(".repo-overview-grid");
        if (overviewGrid) {
            overviewGrid.classList.add("skeleton-loading-overview-grid");
        }
    }

    /**
     * Hide skeleton loading for repository details
     */
    hideRepoDetailsSkeleton() {
        const repoDetails = document.querySelector(".git-repo-details");
        if (!repoDetails) {
            return;
        }
        const infoGrid = repoDetails.querySelector(".repo-info-grid");
        if (infoGrid) {
            infoGrid.classList.remove("skeleton-loading-info-grid");
        }
        const overviewGrid = repoDetails.querySelector(".repo-overview-grid");
        if (overviewGrid) {
            overviewGrid.classList.remove("skeleton-loading-overview-grid");
        }
    }

    /**
     * Show skeleton loading for directory browser
     */
    showDirectorySkeleton() {
        const directoryList = document.querySelector(".directory-list");
        if (directoryList) {
            directoryList.classList.add("skeleton-loading-directories");
            const skeletonHTML = this.skeletonTemplates.directoryItem.repeat(6);
            directoryList.innerHTML = skeletonHTML;
        }
    }

    /**
     * Hide skeleton loading for directory browser
     */
    hideDirectorySkeleton() {
        const directoryList = document.querySelector(".directory-list");
        if (directoryList) {
            directoryList.classList.remove("skeleton-loading-directories");
        }
    }

    /**
     * Show skeleton loading for welcome screen
     */
    showWelcomeSkeleton() {
        const welcomeScreen = document.querySelector(".git-repo-welcome");
        if (welcomeScreen) {
            welcomeScreen.innerHTML = this.skeletonTemplates.welcome;
        }
    }

    /**
     * Show skeleton loading for tab content
     */
    showTabSkeleton() {
        const tabContent = document.querySelector(".git-repo-content");
        if (tabContent) {
            tabContent.innerHTML = this.skeletonTemplates.tabContent;
        }
    }

    /**
     * Show skeleton progress overlay
     */
    showProgressSkeleton(message = WPGitManagerGlobal.translations.processing) {
        let overlay = document.getElementById("git-progress-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "git-progress-overlay";
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="skeleton-progress-content">
                <div class="skeleton skeleton-progress-spinner"></div>
                <div class="skeleton skeleton-progress-text"></div>
            </div>
        `;
        overlay.style.display = "flex";

        // Update message if provided
        const textElement = overlay.querySelector(".skeleton-progress-text");
        if (textElement) {
            textElement.textContent = message;
        }
    }

    /**
     * Hide skeleton progress overlay
     */
    hideProgressSkeleton() {
        const overlay = document.getElementById("git-progress-overlay");
        if (overlay) {
            overlay.style.display = "none";
        }
    }

    /**
     * Show skeleton loading for any container
     */
    showSkeleton(container, type, count = 1) {
        if (!container) {
            return;
        }

        const template = this.skeletonTemplates[type];
        if (template) {
            container.innerHTML = template.repeat(count);
            container.classList.add(`skeleton-loading-${type}`);
        } else {
        }
    }

    /**
     * Hide skeleton loading for any container
     */
    hideSkeleton(container, type) {
        if (!container) {
            console.warn(
                `Container not found for hiding skeleton type: ${type}`
            );
            return;
        }

        container.classList.remove(`skeleton-loading-${type}`);
        // Also remove any skeleton elements that might be left
        const skeletonElements = container.querySelectorAll(".skeleton");
        skeletonElements.forEach((el) => el.remove());
    }

    /**
     * Hide all skeleton loading states
     */
    hideAllSkeletons() {
        // Hide repository skeleton
        this.hideRepoSkeleton();

        // Hide commits skeleton
        this.hideCommitsSkeleton();

        // Hide branches skeleton
        this.hideBranchesSkeleton();

        // Hide repository details skeleton
        this.hideRepoDetailsSkeleton();

        // Hide directory skeleton
        this.hideDirectorySkeleton();

        // Hide progress skeleton
        this.hideProgressSkeleton();

        // Remove any remaining skeleton elements, but be careful not to remove actual content
        document.querySelectorAll(".skeleton").forEach((el) => {
            // Only remove skeleton elements that are not part of actual content
            if (
                el.classList.contains("skeleton") &&
                !el.closest(".repo-info-item") &&
                !el.closest(".repo-status-content") &&
                !el.closest(".repo-branch-content") &&
                !el.closest(".repo-changes-content") &&
                !el.closest(".repo-commit-content")
            ) {
                el.remove();
            }
        });
    }

    /**
     * Create custom skeleton element
     */
    createSkeletonElement(className, width = "100%", height = "1em") {
        const element = document.createElement("div");
        element.className = `skeleton ${className}`;
        element.style.width = width;
        element.style.height = height;
        return element;
    }

    /**
     * Check if required elements exist before showing skeletons
     */
    checkRequiredElements() {
        // Only require elements relevant to currently used skeletons; avoid hard failing on optional sections
        const requiredElements = [
            ".git-repo-list",
            ".commits-list",
            ".branches-list",
            ".git-repo-details",
            "#changes-list",
        ];

        const missingElements = [];
        requiredElements.forEach((selector) => {
            const element = document.querySelector(selector);
            if (!element) {
                missingElements.push(selector);
            }
        });

        if (missingElements.length > 0) {
            console.warn(
                "Missing required elements for skeleton loading:",
                missingElements
            );
            return false;
        }

        return true;
    }

    /**
     * Safe method to show skeleton with element existence check
     */
    safeShowSkeleton(container, type, count = 1) {
        if (!container) {
            return false;
        }

        if (!this.checkRequiredElements()) {
            console.warn(
                "Required elements not found, skipping skeleton display"
            );
            return false;
        }

        this.showSkeleton(container, type, count);
        return true;
    }
}

// Initialize skeleton utility
const gitManagerSkeleton = new GitManagerSkeleton();

// Global error handler to hide skeletons on errors
window.addEventListener("error", () => {
    gitManagerSkeleton.hideAllSkeletons();
});

// Hide skeletons when page is unloaded
window.addEventListener("beforeunload", () => {
    gitManagerSkeleton.hideAllSkeletons();
});

// Hide skeletons on DOM content loaded to ensure clean state
document.addEventListener("DOMContentLoaded", () => {
    gitManagerSkeleton.hideAllSkeletons();
});
