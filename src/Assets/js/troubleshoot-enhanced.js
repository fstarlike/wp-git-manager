/**
 * Enhanced Troubleshooting System for Git Manager
 * Provides step-by-step checks with visual feedback and solutions
 */

class GitTroubleshooter {
    constructor() {
        this.currentStep = 0;
        this.totalSteps = 0;
        this.results = [];
        this.isRunning = false;
    }

    /**
     * Initialize the troubleshooting interface
     */
    async init(repoId = null) {
        this.repoId = repoId;
        this.createTroubleshootUI();
        this.renderSteps();
        this.bindEvents();
        this.updateProgress(
            0,
            this.totalSteps,
            WPGitManagerTroubleshoot.translations.readyToStart
        );

        // Apply RTL support if available
        this.applyRTLSupport();

        // Get current repository path and update the first step description
        try {
            if (this.repoId) {
                // Get repository-specific information
                const response = await this.makeAjaxRequest(
                    "git_manager_get_repo_details",
                    { id: this.repoId }
                );
                if (response.success && response.data) {
                    const repoPath =
                        response.data.path ||
                        WPGitManagerTroubleshoot.translations.unknown;
                    const repoName =
                        response.data.name ||
                        WPGitManagerTroubleshoot.translations.unknown;
                    const firstStep = document.querySelector(
                        '[data-step-id="repo-path"] .step-description'
                    );
                    if (firstStep) {
                        firstStep.innerHTML = `${WPGitManagerTroubleshoot.translations.verifyingRepositoryPath}<br><small style="color: #666;">${WPGitManagerTroubleshoot.translations.repository}: ${repoName}<br>${WPGitManagerTroubleshoot.translations.currentPath}: ${repoPath}</small>`;
                    }
                }
            } else {
                // Get global repository path
                const response = await this.makeAjaxRequest(
                    "git_manager_status",
                    {}
                );
                if (response.success && response.data) {
                    const pathMatch = response.data.match(
                        /Repository path:\s*(.+)/
                    );
                    if (pathMatch) {
                        const currentPath = pathMatch[1].trim();
                        const firstStep = document.querySelector(
                            '[data-step-id="repo-path"] .step-description'
                        );
                        if (firstStep) {
                            firstStep.innerHTML = `${WPGitManagerTroubleshoot.translations.verifyingRepositoryPath}<br><small style="color: #666;">${WPGitManagerTroubleshoot.translations.currentPath}: ${currentPath}</small>`;
                        }
                    }
                }
            }
        } catch (error) {}
    }

    /**
     * Create the enhanced troubleshooting UI
     */
    createTroubleshootUI() {
        const outputContainer = document.getElementById("git-manager-output");
        if (!outputContainer) return;

        // Create the troubleshooting interface
        const troubleshootHTML = `
            <div id="troubleshoot-enhanced" class="troubleshoot-enhanced-container">
                <div class="troubleshoot-header">
                    <div class="troubleshoot-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                        <span>${WPGitManagerTroubleshoot.translations.gitManagerTroubleshooting}</span>
                    </div>
                    <div class="troubleshoot-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="troubleshoot-progress-fill"></div>
                        </div>
                        <span class="progress-text" id="troubleshoot-progress-text">${WPGitManagerTroubleshoot.translations.readyToStart}</span>
                    </div>
                </div>

                <div class="troubleshoot-steps" id="troubleshoot-steps">
                    <!-- Steps will be populated here -->
                </div>

                <div class="troubleshoot-actions">
                    <button id="troubleshoot-start" class="btn btn-primary troubleshoot-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        ${WPGitManagerTroubleshoot.translations.startTroubleshooting}
                    </button>
                    <button id="troubleshoot-stop" class="btn btn-secondary troubleshoot-btn" style="display: none;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg>
                        ${WPGitManagerTroubleshoot.translations.stop}
                    </button>
                    <button id="troubleshoot-reset" class="btn btn-outline troubleshoot-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                        ${WPGitManagerTroubleshoot.translations.reset}
                    </button>
                </div>

                <div class="troubleshoot-summary" id="troubleshoot-summary" style="display: none;">
                    <!-- Summary will be shown here -->
                </div>
            </div>
        `;

        outputContainer.innerHTML = troubleshootHTML;
        outputContainer.classList.add("troubleshoot-enhanced-mode");
    }

    /**
     * Define all troubleshooting steps
     */
    getTroubleshootSteps() {
        return [
            {
                id: "repo-path",
                title: WPGitManagerTroubleshoot.translations
                    .repositoryPathCheck,
                description:
                    WPGitManagerTroubleshoot.translations
                        .verifyingRepositoryPath,
                icon: "fa-folder",
                category: "basic",
            },
            {
                id: "git-binary",
                title: WPGitManagerTroubleshoot.translations.gitBinaryCheck,
                description:
                    WPGitManagerTroubleshoot.translations.checkingGitInstalled,
                icon: "fa-code-branch",
                category: "basic",
            },
            {
                id: "git-directory",
                title: WPGitManagerTroubleshoot.translations.gitDirectoryCheck,
                description:
                    WPGitManagerTroubleshoot.translations.verifyingGitDirectory,
                icon: "fa-git-alt",
                category: "basic",
            },
            {
                id: "safe-directory",
                title: WPGitManagerTroubleshoot.translations
                    .safeDirectoryConfiguration,
                description:
                    WPGitManagerTroubleshoot.translations.checkingSafeDirectory,
                icon: "fa-shield-halved",
                category: "security",
            },
            {
                id: "permissions",
                title: WPGitManagerTroubleshoot.translations.filePermissions,
                description:
                    WPGitManagerTroubleshoot.translations.checkingPermissions,
                icon: "fa-key",
                category: "security",
            },
            {
                id: "ssh-directory",
                title: WPGitManagerTroubleshoot.translations.sshDirectorySetup,
                description:
                    WPGitManagerTroubleshoot.translations.verifyingSSHDirectory,
                icon: "fa-terminal",
                category: "ssh",
            },
            {
                id: "ssh-keys",
                title: WPGitManagerTroubleshoot.translations.sshKeyDetection,
                description:
                    WPGitManagerTroubleshoot.translations.checkingSSHKeys,
                icon: "fa-key",
                category: "ssh",
            },
            {
                id: "host-keys",
                title: WPGitManagerTroubleshoot.translations
                    .hostKeyVerification,
                description:
                    WPGitManagerTroubleshoot.translations.checkingHostKeys,
                icon: "fa-server",
                category: "ssh",
            },
            {
                id: "git-config",
                title: WPGitManagerTroubleshoot.translations.gitConfiguration,
                description:
                    WPGitManagerTroubleshoot.translations.verifyingGitConfig,
                icon: "fa-cog",
                category: "config",
            },
            {
                id: "remote-test",
                title: WPGitManagerTroubleshoot.translations
                    .remoteConnectionTest,
                description:
                    WPGitManagerTroubleshoot.translations
                        .testingRemoteConnection,
                icon: "fa-wifi",
                category: "network",
            },
        ];
    }

    /**
     * Render all steps in the UI
     */
    renderSteps() {
        const stepsContainer = document.getElementById("troubleshoot-steps");
        const steps = this.getTroubleshootSteps();
        this.totalSteps = steps.length;

        let stepsHTML = "";
        steps.forEach((step, index) => {
            stepsHTML += `
                <div class="troubleshoot-step" data-step="${index}" data-step-id="${
                step.id
            }">
                    <div class="step-header">
                                                 <div class="step-icon" data-icon="${
                                                     step.icon
                                                 }">
                             ${this.getLucideIcon(step.icon)}
                         </div>
                        <div class="step-info">
                            <div class="step-title">${step.title}</div>
                            <div class="step-description">${
                                step.description
                            }</div>
                        </div>
                        <div class="step-status">
                                                     <div class="status-icon" id="status-${
                                                         step.id
                                                     }">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                         </div>
                        </div>
                    </div>
                    <div class="step-content" id="content-${
                        step.id
                    }" style="display: none;">
                        <div class="step-log" id="log-${step.id}"></div>
                        <div class="step-solution" id="solution-${
                            step.id
                        }" style="display: none;"></div>
                    </div>
                </div>
            `;
        });

        stepsContainer.innerHTML = stepsHTML;
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Start troubleshooting
        document
            .getElementById("troubleshoot-start")
            ?.addEventListener("click", () => {
                this.startTroubleshooting();
            });

        // Stop troubleshooting
        document
            .getElementById("troubleshoot-stop")
            ?.addEventListener("click", () => {
                this.stopTroubleshooting();
            });

        // Reset troubleshooting
        document
            .getElementById("troubleshoot-reset")
            ?.addEventListener("click", () => {
                this.resetTroubleshooting();
            });

        // Step click to expand/collapse
        document.addEventListener("click", (e) => {
            if (e.target.closest(".step-header")) {
                const step = e.target.closest(".troubleshoot-step");
                const stepId = step.dataset.stepId;
                const content = document.getElementById(`content-${stepId}`);
                if (content) {
                    content.style.display =
                        content.style.display === "none" ? "block" : "none";
                    step.classList.toggle("expanded");
                }
            }
        });
    }

    /**
     * Start the troubleshooting process
     */
    async startTroubleshooting() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.currentStep = 0;
        this.results = [];

        // Update UI
        document.getElementById("troubleshoot-start").style.display = "none";
        document.getElementById("troubleshoot-stop").style.display =
            "inline-flex";
        document.getElementById("troubleshoot-summary").style.display = "none";

        // Render steps
        this.renderSteps();

        // Start processing steps
        await this.processSteps();
    }

    /**
     * Process all troubleshooting steps
     */
    async processSteps() {
        const steps = this.getTroubleshootSteps();

        for (let i = 0; i < steps.length; i++) {
            if (!this.isRunning) break; // Check if stopped

            this.currentStep = i;
            const step = steps[i];

            // Update progress
            this.updateProgress(i + 1, steps.length, `Running: ${step.title}`);

            // Update step status to running
            this.updateStepStatus(step.id, "running");

            try {
                // Execute step
                const result = await this.executeStep(step);
                this.results.push(result);

                // Update step status based on result
                this.updateStepStatus(step.id, result.status);

                // Show step content
                this.showStepContent(step.id, result);

                // Small delay for better UX
                await this.delay(500);
            } catch (error) {
                this.updateStepStatus(step.id, "error");
                this.results.push({
                    stepId: step.id,
                    status: "error",
                    message: error.message,
                    solution: "An unexpected error occurred. Please try again.",
                });
            }
        }

        // Show summary
        this.showSummary();

        // Reset UI
        this.isRunning = false;
        document.getElementById("troubleshoot-start").style.display =
            "inline-flex";
        document.getElementById("troubleshoot-stop").style.display = "none";
        this.updateProgress(
            0,
            0,
            WPGitManagerTroubleshoot.translations.troubleshootingCompleted
        );
    }

    /**
     * Execute a single troubleshooting step
     */
    async executeStep(step) {
        const stepId = step.id;

        try {
            switch (stepId) {
                case "repo-path":
                    return await this.checkRepoPath();
                case "git-binary":
                    return await this.checkGitBinary();
                case "git-directory":
                    return await this.checkGitDirectory();
                case "safe-directory":
                    return await this.checkSafeDirectory();
                case "permissions":
                    return await this.checkPermissions();
                case "ssh-directory":
                    return await this.checkSshDirectory();
                case "ssh-keys":
                    return await this.checkSshKeys();
                case "host-keys":
                    return await this.checkHostKeys();
                case "git-config":
                    return await this.checkGitConfig();
                case "remote-test":
                    return await this.testRemoteConnection();
                default:
                    throw new Error(`Unknown step: ${stepId}`);
            }
        } catch (error) {
            return {
                stepId: stepId,
                status: "error",
                message: `Failed to execute ${step.title}: ${error.message}`,
                solution:
                    "Please check the browser console for more details and try again.",
                details: error.stack || error.message,
            };
        }
    }

    /**
     * Check repository path
     */
    async checkRepoPath() {
        try {
            const requestData = {
                step: "repo-path",
            };

            // Add repository ID if available
            if (this.repoId) {
                requestData.repo_id = this.repoId;
            }

            const response = await this.makeAjaxRequest(
                "git_manager_troubleshoot_step",
                requestData
            );

            return {
                stepId: "repo-path",
                status:
                    response.data.status ||
                    (response.success ? "success" : "error"),
                message: response.data.message,
                solution: response.data.solution || null,
                details: response.data.details || null,
            };
        } catch (error) {
            return {
                stepId: "repo-path",
                status: "error",
                message:
                    WPGitManagerTroubleshoot.translations.failedToCheckPath,
                solution:
                    WPGitManagerTroubleshoot.translations.verifyPathInSettings,
            };
        }
    }

    /**
     * Check Git binary
     */
    async checkGitBinary() {
        try {
            const requestData = {
                step: "git-binary",
            };

            // Add repository ID if available
            if (this.repoId) {
                requestData.repo_id = this.repoId;
            }

            const response = await this.makeAjaxRequest(
                "git_manager_troubleshoot_step",
                requestData
            );

            return {
                stepId: "git-binary",
                status:
                    response.data.status ||
                    (response.success ? "success" : "error"),
                message: response.data.message,
                solution: response.data.solution || null,
                details: response.data.details || null,
            };
        } catch (error) {
            return {
                stepId: "git-binary",
                status: "error",
                message: WPGitManagerTroubleshoot.translations.failedToCheckGit,
                solution:
                    WPGitManagerTroubleshoot.translations.ensureGitInstalled,
            };
        }
    }

    /**
     * Check Git directory
     */
    async checkGitDirectory() {
        try {
            const requestData = {
                step: "git-directory",
            };

            // Add repository ID if available
            if (this.repoId) {
                requestData.repo_id = this.repoId;
            }

            const response = await this.makeAjaxRequest(
                "git_manager_troubleshoot_step",
                requestData
            );

            return {
                stepId: "git-directory",
                status:
                    response.data.status ||
                    (response.success ? "success" : "error"),
                message: response.data.message,
                solution: response.data.solution || null,
                details: response.data.details || null,
            };
        } catch (error) {
            return {
                stepId: "git-directory",
                status: "error",
                message:
                    WPGitManagerTroubleshoot.translations
                        .failedToCheckDirectory,
                solution:
                    WPGitManagerTroubleshoot.translations.ensureValidRepository,
            };
        }
    }

    /**
     * Check safe directory configuration
     */
    async checkSafeDirectory() {
        try {
            const requestData = {
                step: "safe-directory",
            };

            // Add repository ID if available
            if (this.repoId) {
                requestData.repo_id = this.repoId;
            }

            const response = await this.makeAjaxRequest(
                "git_manager_troubleshoot_step",
                requestData
            );

            return {
                stepId: "safe-directory",
                status:
                    response.data.status ||
                    (response.success ? "success" : "warning"),
                message: response.data.message,
                solution: response.data.solution || null,
                details: response.data.details || null,
            };
        } catch (error) {
            return {
                stepId: "safe-directory",
                status: "error",
                message:
                    WPGitManagerTroubleshoot.translations
                        .failedToCheckSafeDirectory,
                solution:
                    WPGitManagerTroubleshoot.translations
                        .checkGitConfigManually,
            };
        }
    }

    /**
     * Check file permissions
     */
    async checkPermissions() {
        try {
            const requestData = {
                step: "permissions",
            };

            // Add repository ID if available
            if (this.repoId) {
                requestData.repo_id = this.repoId;
            }

            const response = await this.makeAjaxRequest(
                "git_manager_troubleshoot_step",
                requestData
            );

            return {
                stepId: "permissions",
                status:
                    response.data.status ||
                    (response.success ? "success" : "warning"),
                message: response.data.message,
                solution: response.data.solution || null,
                details: response.data.details || null,
            };
        } catch (error) {
            return {
                stepId: "permissions",
                status: "error",
                message:
                    WPGitManagerTroubleshoot.translations
                        .failedToCheckPermissions,
                solution:
                    WPGitManagerTroubleshoot.translations
                        .checkPermissionsManually,
            };
        }
    }

    /**
     * Check SSH directory
     */
    async checkSshDirectory() {
        try {
            const requestData = {
                step: "ssh-directory",
            };

            // Add repository ID if available
            if (this.repoId) {
                requestData.repo_id = this.repoId;
            }

            const response = await this.makeAjaxRequest(
                "git_manager_troubleshoot_step",
                requestData
            );

            return {
                stepId: "ssh-directory",
                status:
                    response.data.status ||
                    (response.success ? "success" : "warning"),
                message: response.data.message,
                solution: response.data.solution || null,
                details: response.data.details || null,
            };
        } catch (error) {
            return {
                stepId: "ssh-directory",
                status: "error",
                message: WPGitManagerTroubleshoot.translations.failedToCheckSSH,
                solution:
                    WPGitManagerTroubleshoot.translations.checkSSHManually,
            };
        }
    }

    /**
     * Check SSH keys
     */
    async checkSshKeys() {
        try {
            const requestData = {
                step: "ssh-keys",
            };

            // Add repository ID if available
            if (this.repoId) {
                requestData.repo_id = this.repoId;
            }

            const response = await this.makeAjaxRequest(
                "git_manager_troubleshoot_step",
                requestData
            );

            return {
                stepId: "ssh-keys",
                status:
                    response.data.status ||
                    (response.success ? "success" : "warning"),
                message: response.data.message,
                solution: response.data.solution || null,
                details: response.data.details || null,
            };
        } catch (error) {
            return {
                stepId: "ssh-keys",
                status: "error",
                message: "Failed to check SSH keys",
                solution: "Please check SSH keys manually",
            };
        }
    }

    /**
     * Check host keys
     */
    async checkHostKeys() {
        try {
            const requestData = {
                step: "host-keys",
            };

            // Add repository ID if available
            if (this.repoId) {
                requestData.repo_id = this.repoId;
            }

            const response = await this.makeAjaxRequest(
                "git_manager_troubleshoot_step",
                requestData
            );

            return {
                stepId: "host-keys",
                status:
                    response.data.status ||
                    (response.success ? "success" : "warning"),
                message: response.data.message,
                solution: response.data.solution || null,
                details: response.data.details || null,
            };
        } catch (error) {
            return {
                stepId: "host-keys",
                status: "error",
                message: "Failed to check host keys",
                solution: "Please check host keys manually",
            };
        }
    }

    /**
     * Check Git configuration
     */
    async checkGitConfig() {
        try {
            const requestData = {
                step: "git-config",
            };

            // Add repository ID if available
            if (this.repoId) {
                requestData.repo_id = this.repoId;
            }

            const response = await this.makeAjaxRequest(
                "git_manager_troubleshoot_step",
                requestData
            );

            return {
                stepId: "git-config",
                status:
                    response.data.status ||
                    (response.success ? "success" : "warning"),
                message: response.data.message,
                solution: response.data.solution || null,
                details: response.data.details || null,
            };
        } catch (error) {
            return {
                stepId: "git-config",
                status: "error",
                message: "Failed to check Git configuration",
                solution: "Please check Git configuration manually",
            };
        }
    }

    /**
     * Test remote connection
     */
    async testRemoteConnection() {
        try {
            const requestData = {
                step: "remote-test",
            };

            // Add repository ID if available
            if (this.repoId) {
                requestData.repo_id = this.repoId;
            }

            const response = await this.makeAjaxRequest(
                "git_manager_troubleshoot_step",
                requestData
            );

            return {
                stepId: "remote-test",
                status:
                    response.data.status ||
                    (response.success ? "success" : "warning"),
                message: response.data.message,
                solution: response.data.solution || null,
                details: response.data.details || null,
            };
        } catch (error) {
            return {
                stepId: "remote-test",
                status: "error",
                message: "Failed to test remote connection",
                solution: "Please check network connectivity and remote URL",
            };
        }
    }

    /**
     * Get Lucide icon by Font Awesome class name
     */
    getLucideIcon(faClass) {
        const iconMap = {
            "fa-folder":
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10.5 8 13l2 2.5"/><path d="m14 10.5 2 2.5-2 2.5"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>',
            "fa-code-branch":
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><line x1="3" x2="9" y1="12" y2="12"/><line x1="15" x2="21" y1="12" y2="12"/></svg>',
            "fa-git-alt":
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5"/><circle cx="13" cy="12" r="2"/><path d="M18 19c-2.8 0-5-2.2-5-5v8"/><circle cx="20" cy="19" r="2"/></svg>',
            "fa-shield-halved":
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>',
            "fa-key":
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v6"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><circle cx="4" cy="16" r="2"/><path d="m10 10-4.5 4.5"/><path d="m9 11 1 1"/></svg>',
            "fa-terminal":
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19h8"/><path d="m4 17 6-6-6-6"/></svg>',
            "fa-server":
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>',
            "fa-cog":
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 10.27 7 3.34"/><path d="m11 13.73-4 6.93"/><path d="M12 22v-2"/><path d="M12 2v2"/><path d="M14 12h8"/><path d="m17 20.66-1-1.73"/><path d="m17 3.34-1 1.73"/><path d="M2 12h2"/><path d="m20.66 17-1.73-1"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m3.34 7 1.73 1"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="8"/></svg>',
            "fa-wifi":
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 19a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1z"/><path d="M17 21v-2"/><path d="M19 14V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V10"/><path d="M21 21v-2"/><path d="M3 5V3"/><path d="M4 10a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2z"/><path d="M7 5V3"/></svg>',
        };
        return (
            iconMap[faClass] ||
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9.09 9 3.83 3.83L16.91 9"/></svg>'
        );
    }

    /**
     * Update step status with visual feedback
     */
    updateStepStatus(stepId, status) {
        const statusIcon = document.getElementById(`status-${stepId}`);
        if (!statusIcon) return;

        // Remove all status classes
        statusIcon.className = "status-icon";

        // Add appropriate status class and icon
        switch (status) {
            case "running":
                statusIcon.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>';
                statusIcon.classList.add("status-running");
                break;
            case "success":
                statusIcon.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>';
                statusIcon.classList.add("status-success");
                break;
            case "warning":
                statusIcon.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" x2="16" y1="15" y2="15"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>';
                statusIcon.classList.add("status-warning");
                break;
            case "error":
                statusIcon.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>';
                statusIcon.classList.add("status-error");
                break;
            default:
                statusIcon.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>';
                statusIcon.classList.add("status-pending");
        }
    }

    /**
     * Show step content with results
     */
    showStepContent(stepId, result) {
        const logContainer = document.getElementById(`log-${stepId}`);
        const solutionContainer = document.getElementById(`solution-${stepId}`);
        const contentContainer = document.getElementById(`content-${stepId}`);

        if (!logContainer || !solutionContainer || !contentContainer) return;

        // Show log
        logContainer.innerHTML = `
             <div class="step-message ${result.status}">
                 ${this.getStatusIcon(result.status)}
                 <span>${result.message}</span>
             </div>
             ${
                 result.details
                     ? `<div class="step-details">${result.details}</div>`
                     : ""
             }
         `;

        // Show solution if available
        if (result.solution) {
            solutionContainer.innerHTML = `
                 <div class="solution-content">
                     <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9"/></svg> Solution</h4>
                     <div class="solution-text">${result.solution}</div>
                 </div>
             `;
            solutionContainer.style.display = "block";
        }

        // Show content
        contentContainer.style.display = "block";

        // Apply RTL support to newly added content
        this.applyRTLToNewContent();
    }

    /**
     * Show troubleshooting summary
     */
    showSummary() {
        const summaryContainer = document.getElementById(
            "troubleshoot-summary"
        );
        if (!summaryContainer) return;

        const successCount = this.results.filter(
            (r) => r.status === "success"
        ).length;
        const warningCount = this.results.filter(
            (r) => r.status === "warning"
        ).length;
        const errorCount = this.results.filter(
            (r) => r.status === "error"
        ).length;

        const summaryHTML = `
             <div class="troubleshoot-summary-content">
                 <h3><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5h13"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="M3 10a2 2 0 0 0 2 2h3"/><path d="M3 5v12a2 2 0 0 0 2 2h3"/></svg> Troubleshooting Summary</h3>
                 <div class="summary-stats">
                     <div class="stat-item success">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="m9 10 2 2 4-4"/><rect x="3" y="4" width="18" height="12" rx="2"/></svg>
                         <span>${successCount} Passed</span>
                     </div>
                     <div class="stat-item warning">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                         <span>${warningCount} Warnings</span>
                     </div>
                     <div class="stat-item danger">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 9-6 6"/><path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688-4.688A2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"/><path d="m9 9 6 6"/></svg>
                         <span>${errorCount} Failed</span>
                     </div>
                 </div>
                 ${this.generateSummaryRecommendations()}
             </div>
         `;

        summaryContainer.innerHTML = summaryHTML;
        summaryContainer.style.display = "block";

        // Apply RTL support to newly added summary content
        this.applyRTLToNewContent();
    }

    /**
     * Generate summary recommendations
     */
    generateSummaryRecommendations() {
        const errors = this.results.filter((r) => r.status === "error");
        const warnings = this.results.filter((r) => r.status === "warning");

        if (errors.length === 0 && warnings.length === 0) {
            return `
                 <div class="summary-recommendation success">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 4.01v3"/><path d="M15 19.01v-3"/><path d="M15 4.01c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/><path d="M7 10c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/></svg>
                     <div>
                         <strong>All checks passed!</strong>
                         <p>Your Git setup appears to be working correctly. You should be able to use all Git Manager features.</p>
                     </div>
                 </div>
             `;
        }

        let recommendations = '<div class="summary-recommendations">';

        if (errors.length > 0) {
            recommendations += `
                 <div class="recommendation-section">
                     <h4><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/></svg> Critical Issues (${
                         errors.length
                     })</h4>
                     <ul>
                         ${errors
                             .map(
                                 (error) =>
                                     `<li>${this.getStepTitle(error.stepId)}: ${
                                         error.message
                                     }</li>`
                             )
                             .join("")}
                     </ul>
                 </div>
             `;
        }

        if (warnings.length > 0) {
            recommendations += `
                 <div class="recommendation-section">
                     <h4><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/></svg> Recommendations (${
                         warnings.length
                     })</h4>
                     <ul>
                         ${warnings
                             .map(
                                 (warning) =>
                                     `<li>${this.getStepTitle(
                                         warning.stepId
                                     )}: ${warning.message}</li>`
                             )
                             .join("")}
                     </ul>
                 </div>
             `;
        }

        recommendations += "</div>";
        return recommendations;
    }

    /**
     * Get step title by ID
     */
    getStepTitle(stepId) {
        const steps = this.getTroubleshootSteps();
        const step = steps.find((s) => s.id === stepId);
        return step ? step.title : stepId;
    }

    /**
     * Stop troubleshooting
     */
    stopTroubleshooting() {
        this.isRunning = false;
        this.updateProgress(0, 0, "Troubleshooting stopped");

        // Reset UI
        document.getElementById("troubleshoot-start").style.display =
            "inline-flex";
        document.getElementById("troubleshoot-stop").style.display = "none";
    }

    /**
     * Reset troubleshooting
     */
    resetTroubleshooting() {
        this.isRunning = false;
        this.currentStep = 0;
        this.results = [];

        // Reset UI
        document.getElementById("troubleshoot-start").style.display =
            "inline-flex";
        document.getElementById("troubleshoot-stop").style.display = "none";
        document.getElementById("troubleshoot-summary").style.display = "none";
        this.updateProgress(0, 0, "Ready to start");

        // Reset all step statuses
        const steps = this.getTroubleshootSteps();
        steps.forEach((step) => {
            this.updateStepStatus(step.id, "pending");
            const content = document.getElementById(`content-${step.id}`);
            if (content) {
                content.style.display = "none";
            }
        });
    }

    /**
     * Apply RTL support to the troubleshooting interface
     */
    applyRTLSupport() {
        // Check if RTL support is available and active
        if (window.gitManagerRTL && window.gitManagerRTL.isRTLActive()) {
            // Apply RTL styles to the troubleshooting container
            const troubleshootContainer = document.querySelector(
                ".troubleshoot-enhanced-container"
            );
            if (troubleshootContainer) {
                troubleshootContainer.setAttribute("dir", "rtl");
                troubleshootContainer.classList.add("git-manager-rtl");
            }

            // Update layout for RTL
            this.updateRTLayout();
        } else {
            // Ensure LTR layout for troubleshooting container
            const troubleshootContainer = document.querySelector(
                ".troubleshoot-enhanced-container"
            );
            if (troubleshootContainer) {
                troubleshootContainer.setAttribute("dir", "ltr");
                troubleshootContainer.classList.remove("git-manager-rtl");
            }
        }
    }

    /**
     * Update layout for RTL support
     */
    updateRTLayout() {
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
     * Apply RTL support to newly added content
     */
    applyRTLToNewContent() {
        // Check if RTL support is available and active
        if (window.gitManagerRTL && window.gitManagerRTL.isRTLActive()) {
            // Apply RTL to step messages
            const stepMessages = document.querySelectorAll(".step-message");
            stepMessages.forEach((message) => {
                message.style.flexDirection = "row-reverse";
                const icon = message.querySelector("svg");
                if (icon) {
                    icon.style.marginRight = "0";
                    icon.style.marginLeft = "12px";
                }
            });

            // Apply RTL to solution content
            const solutionHeaders = document.querySelectorAll(
                ".solution-content h4"
            );
            solutionHeaders.forEach((header) => {
                header.style.flexDirection = "row-reverse";
                const icon = header.querySelector("svg");
                if (icon) {
                    icon.style.marginRight = "0";
                    icon.style.marginLeft = "8px";
                }
            });

            // Apply RTL to summary content
            const summaryTitle = document.querySelector(
                ".troubleshoot-summary-content h3"
            );
            if (summaryTitle) {
                summaryTitle.style.flexDirection = "row-reverse";
                const icon = summaryTitle.querySelector("svg");
                if (icon) {
                    icon.style.marginRight = "0";
                    icon.style.marginLeft = "12px";
                }
            }

            // Apply RTL to stat items
            const statItems = document.querySelectorAll(".stat-item");
            statItems.forEach((item) => {
                item.style.flexDirection = "row-reverse";
                const icon = item.querySelector("svg");
                if (icon) {
                    icon.style.marginRight = "0";
                    icon.style.marginLeft = "8px";
                }
            });

            // Apply RTL to summary recommendations
            const summaryRecommendations = document.querySelectorAll(
                ".summary-recommendation"
            );
            summaryRecommendations.forEach((rec) => {
                rec.style.flexDirection = "row-reverse";
                const icon = rec.querySelector("svg");
                if (icon) {
                    icon.style.marginRight = "0";
                    icon.style.marginLeft = "16px";
                }
            });

            // Apply RTL to recommendation sections
            const recommendationSections = document.querySelectorAll(
                ".recommendation-section h4"
            );
            recommendationSections.forEach((section) => {
                section.style.flexDirection = "row-reverse";
                const icon = section.querySelector("svg");
                if (icon) {
                    icon.style.marginRight = "0";
                    icon.style.marginLeft = "8px";
                }
            });

            // Apply RTL to recommendation lists
            const recommendationLists = document.querySelectorAll(
                ".recommendation-section ul"
            );
            recommendationLists.forEach((list) => {
                list.style.paddingLeft = "0";
                list.style.paddingRight = "24px";
            });
        }
    }

    /**
     * Get status icon
     */
    getStatusIcon(status) {
        switch (status) {
            case "success":
                return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
            case "warning":
                return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8L22 12L18 16"/><path d="M2 12H22"/></svg>';
            case "error":
                return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16h.01"/><path d="M12 8v4"/><path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688A2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"/></svg>';
            default:
                return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9.09 9 3.83 3.83L16.91 9"/></svg>';
        }
    }

    /**
     * Update progress bar
     */
    updateProgress(current, total, text) {
        const progressFill = document.getElementById(
            "troubleshoot-progress-fill"
        );
        const progressText = document.getElementById(
            "troubleshoot-progress-text"
        );

        if (progressFill && progressText) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = text;
        }
    }

    /**
     * Make AJAX request
     */
    async makeAjaxRequest(action, data = {}) {
        const formData = new FormData();
        formData.append("action", action);

        // Get nonce from various possible sources
        let nonce = "";
        if (
            typeof WPGitManagerGlobal !== "undefined" &&
            WPGitManagerGlobal.action_nonces &&
            WPGitManagerGlobal.action_nonces[action]
        ) {
            nonce = WPGitManagerGlobal.action_nonces[action];
        } else if (
            typeof WPGitManagerGlobal !== "undefined" &&
            WPGitManagerGlobal.nonce
        ) {
            nonce = WPGitManagerGlobal.nonce;
        } else if (
            typeof gitManagerAjax !== "undefined" &&
            gitManagerAjax.nonce
        ) {
            nonce = gitManagerAjax.nonce;
        } else if (document.getElementById("git_manager_nonce")) {
            nonce = document.getElementById("git_manager_nonce").value;
        } else if (typeof wpAjax !== "undefined" && wpAjax.nonce) {
            nonce = wpAjax.nonce;
        }

        if (!nonce) {
            console.error(`No nonce found for action: ${action}`);
        }

        formData.append("nonce", nonce);

        // Add additional data
        Object.keys(data).forEach((key) => {
            formData.append(key, data[key]);
        });

        // Get AJAX URL
        let ajaxUrl = "";
        if (typeof ajaxurl !== "undefined") {
            ajaxUrl = ajaxurl;
        } else if (
            typeof gitManagerAjax !== "undefined" &&
            gitManagerAjax.ajaxurl
        ) {
            ajaxUrl = gitManagerAjax.ajaxurl;
        } else if (typeof wpAjax !== "undefined" && wpAjax.ajaxurl) {
            ajaxUrl = wpAjax.ajaxurl;
        } else {
            // Fallback to WordPress admin-ajax.php
            ajaxUrl = window.location.origin + "/wp-admin/admin-ajax.php";
        }

        try {
            console.log(`Making AJAX request to: ${ajaxUrl}`, {
                action: action,
                data: data,
                repoId: this.repoId,
            });

            const response = await fetch(ajaxUrl, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Debug information removed
            console.log(`Troubleshoot AJAX - Action: ${action}`, {
                success: result.success,
                data: result.data,
                repoId: this.repoId,
            });

            return result;
        } catch (error) {
            // Return a structured error response
            return {
                success: false,
                data: {
                    status: "error",
                    message: `AJAX request failed: ${error.message}`,
                    solution:
                        "Please check your network connection and try again. If the problem persists, contact your administrator.",
                    details: error.toString(),
                },
            };
        }
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// Make GitTroubleshooter globally available
window.GitTroubleshooter = GitTroubleshooter;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
    // Only initialize if we're on the troubleshooting page or in repository context
    if (document.getElementById("git-manager-output")) {
        // Check if we're in repository context (GitManager is available and has currentRepo)
        if (window.GitManager && window.GitManager.currentRepo) {
            window.gitTroubleshooter = new GitTroubleshooter();
            window.gitTroubleshooter.init(window.GitManager.currentRepo);
        } else if (
            window.location.href.includes("git-manager-troubleshooting")
        ) {
            // Global troubleshooting page
            window.gitTroubleshooter = new GitTroubleshooter();
            window.gitTroubleshooter.init();
        }
    }
});
