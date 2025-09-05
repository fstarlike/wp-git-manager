<?php

namespace WPGitManager\View\Components;

class RepositoryDetail
{
    public function render()
    {
        ?>
        <!-- Repository Details (hidden by default) -->
        <div class="git-repo-details" id="git-repo-details" style="display: none;">
            <!-- Repository Header -->
            <div class="repo-details-header">
                <h2 id="repo-details-name"><?php echo esc_html__('Repository', 'repo-manager'); ?></h2>
                <div class="repo-details-actions">
                    <button class="git-action-btn" data-action="pull" title="<?php echo esc_attr__('Pull changes', 'repo-manager'); ?>">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 17V3"/>
                            <path d="m6 11 6 6 6-6"/>
                            <path d="M19 21H5"/>
                        </svg>
                        <?php echo esc_html__('Pull', 'repo-manager'); ?>
                    </button>
                    <button class="git-action-btn" data-action="push" title="<?php echo esc_attr__('Push changes', 'repo-manager'); ?>">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m18 9-6-6-6 6"/>
                            <path d="M12 3v14"/>
                            <path d="M5 21h14"/>
                        </svg>
                        <?php echo esc_html__('Push', 'repo-manager'); ?>
                    </button>
                    <button class="git-action-btn git-secondary-btn" data-action="fetch" title="<?php echo esc_attr__('Fetch updates', 'repo-manager'); ?>">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                            <path d="M21 3v5h-5"/>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                            <path d="M8 16H3v5"/>
                        </svg>
                        <?php echo esc_html__('Fetch', 'repo-manager'); ?>
                    </button>
                    <button class="git-action-btn git-secondary-btn" data-action="status" title="<?php echo esc_attr__('Check status', 'repo-manager'); ?>">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 16v-4"/>
                            <path d="M12 8h.01"/>
                        </svg>
                        <?php echo esc_html__('Status', 'repo-manager'); ?>
                    </button>
                    <button class="git-action-btn git-secondary-btn" data-action="troubleshoot" title="<?php echo esc_attr__('Professional troubleshooting', 'repo-manager'); ?>">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                        <?php echo esc_html__('Troubleshoot', 'repo-manager'); ?>
                    </button>
                    <button class="git-action-btn git-secondary-btn" data-action="fix-permission" title="<?php echo esc_attr__('Fix permissions', 'repo-manager'); ?>">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <?php echo esc_html__('Fix Permissions', 'repo-manager'); ?>
                    </button>
                </div>
            </div>

            <?php $this->renderRepositoryInfoGrid(); ?>
            <?php $this->renderRepositoryTabs(); ?>
            <?php $this->renderTabContent(); ?>
        </div>
        <?php
    }

    private function renderRepositoryInfoGrid()
    {
        ?>
        <!-- Repository Information Grid -->
        <div class="repo-info-grid">
            <div class="repo-info-item">
                <label><?php echo esc_html__('Repository Name', 'repo-manager'); ?></label>
                <span id="repo-name" class="value">-</span>
                <div class="skeleton skeleton-text skeleton-placeholder"></div>
            </div>
            <div class="repo-info-item">
                <label><?php echo esc_html__('Local Path', 'repo-manager'); ?></label>
                <span id="repo-path" class="value">-</span>
                <div class="skeleton skeleton-text skeleton-placeholder"></div>
            </div>
            <div class="repo-info-item">
                <label><?php echo esc_html__('Current Branch', 'repo-manager'); ?></label>
                <span id="repo-branch" class="value">-</span>
                <div class="skeleton skeleton-text skeleton-placeholder"></div>
            </div>
            <div class="repo-info-item">
                <label><?php echo esc_html__('Status', 'repo-manager'); ?></label>
                <span id="repo-status" class="value">-</span>
                <div class="skeleton skeleton-text skeleton-placeholder"></div>
            </div>
            <div class="repo-info-item">
                <label><?php echo esc_html__('Last Commit', 'repo-manager'); ?></label>
                <span id="repo-last-commit" class="value">-</span>
                <div class="skeleton skeleton-text skeleton-placeholder"></div>
            </div>
            <div class="repo-info-item">
                <label><?php echo esc_html__('Remote URL', 'repo-manager'); ?></label>
                <span id="repo-remote" class="value">-</span>
                <div class="skeleton skeleton-text skeleton-placeholder"></div>
            </div>
        </div>
        <?php
    }

    private function renderRepositoryTabs()
    {
        ?>
        <!-- Repository Tabs -->
        <div class="git-repo-tabs">
            <button class="git-repo-tab active" data-tab="overview"><?php echo esc_html__('Overview', 'repo-manager'); ?></button>
            <button class="git-repo-tab" data-tab="commits"><?php echo esc_html__('Recent Commits', 'repo-manager'); ?></button>
            <button class="git-repo-tab" data-tab="branches"><?php echo esc_html__('Branches', 'repo-manager'); ?></button>
            <button class="git-repo-tab" data-tab="troubleshooting"><?php echo esc_html__('Troubleshooting', 'repo-manager'); ?></button>
            <button class="git-repo-tab" data-tab="settings"><?php echo esc_html__('Settings', 'repo-manager'); ?></button>
        </div>
        <?php
    }

    private function renderTabContent()
    {
        ?>
        <!-- Tab Content -->
        <div class="tab-content" data-tab-content="overview" style="display: block;">
            <?php $this->renderOverviewTab(); ?>
        </div>

        <div class="tab-content" data-tab-content="commits" style="display: none;">
            <?php $this->renderCommitsTab(); ?>
        </div>

        <div class="tab-content" data-tab-content="branches" style="display: none;">
            <?php $this->renderBranchesTab(); ?>
        </div>

        <div class="tab-content" data-tab-content="troubleshooting" style="display: none;">
            <?php $this->renderTroubleshootingTab(); ?>
        </div>

        <div class="tab-content" data-tab-content="settings" style="display: none;">
            <?php $this->renderSettingsTab(); ?>
        </div>
        <?php
    }

    private function renderOverviewTab()
    {
        ?>
        <div class="repo-overview-grid repo-recommendations">
            <!-- Repository Status Card -->
            <div class="repo-status-card overview-card" data-card="status">
                <div class="overview-card-header repo-status-header">
                    <div class="overview-card-title-wrap">
                        <span class="overview-card-icon" aria-hidden="true">
                            <!-- Shield / status icon -->
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>
                        </span>
                        <h3 class="overview-card-title"><?php echo esc_html__('Repository Status', 'repo-manager'); ?></h3>
                    </div>
                        <div class="repo-status-indicator" id="repo-status-indicator">
                            <span class="status-dot" aria-hidden="true"></span>
                            <div class="skeleton skeleton-text skeleton-placeholder" style="width:16px;height:16px;border-radius:99px;margin-left:8px;"></div>
                        </div>
                </div>
                <div class="repo-status-content overview-card-body" id="repo-status-content">
                        <div class="status-label-wrap">
                            <span class="status-label value" id="repo-status-label"><?php echo esc_html__('Loading...', 'repo-manager'); ?></span>
                        </div>
                        <div class="status-body" id="repo-status-body">
                    <p class="value"><?php echo esc_html__('Loading repository status...', 'repo-manager'); ?></p>
                    <div class="skeleton skeleton-text skeleton-placeholder"></div>
                    <div class="skeleton skeleton-text skeleton-placeholder" style="width: 80%;"></div>
                        </div>
                </div>
            </div>

            <!-- Branch Information Card -->
            <div class="repo-branch-card overview-card" data-card="branch">
                <div class="overview-card-header repo-branch-header">
                    <div class="overview-card-title-wrap">
                        <span class="overview-card-icon" aria-hidden="true">
                            <!-- Git branch icon -->
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                        </span>
                        <h3 class="overview-card-title"><?php echo esc_html__('Branch Information', 'repo-manager'); ?></h3>
                    </div>
                </div>
                <div class="repo-branch-content overview-card-body" id="repo-branch-content">
                    <div class="branch-topline">
                        <span class="branch-name value" id="branch-name"><?php echo esc_html__('Loading...', 'repo-manager'); ?></span>
                        <div class="skeleton skeleton-text skeleton-placeholder" style="width:100px;height:1.4em;border-radius:99px;"></div>
                    </div>
                    <div class="branch-sync-status" id="branch-sync-status">
                        <p class="value"><?php echo esc_html__('Loading branch information...', 'repo-manager'); ?></p>
                        <div class="skeleton skeleton-text skeleton-placeholder" style="margin-top:6px;"></div>
                        <div class="skeleton skeleton-text skeleton-placeholder" style="width:70%;"></div>
                    </div>
                </div>
            </div>

            <!-- Recent Changes Card -->
            <div class="repo-changes-card overview-card" data-card="changes">
                <div class="overview-card-header repo-changes-header">
                    <div class="overview-card-title-wrap">
                        <span class="overview-card-icon" aria-hidden="true">
                            <!-- Diff icon -->
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="3"/><path d="M5 9v6"/><circle cx="5" cy="18" r="3"/><path d="M12 3v18"/><circle cx="19" cy="6" r="3"/><path d="M16 15.7A9 9 0 0 0 19 9"/></svg>
                        </span>
                        <h3 class="overview-card-title"><?php echo esc_html__('Recent Changes', 'repo-manager'); ?></h3>
                    </div>
                    <div class="changes-count" id="changes-count">
                        <span class="count-badge value">0</span>
                        <div class="skeleton skeleton-avatar skeleton-placeholder" style="width:24px;height:24px;"></div>
                    </div>
                </div>
                <div class="repo-changes-content overview-card-body" id="repo-changes-content">
                    <div class="changes-list" id="changes-list">
                        <p class="value"><?php echo esc_html__('Loading changes...', 'repo-manager'); ?></p>
                        <div class="skeleton-list skeleton-placeholder">
                            <div class="skeleton-list-item"><div class="skeleton skeleton-list-icon"></div><div class="skeleton-list-content"><div class="skeleton skeleton-list-title"></div></div></div>
                            <div class="skeleton-list-item"><div class="skeleton skeleton-list-icon"></div><div class="skeleton-list-content"><div class="skeleton skeleton-list-title"></div></div></div>
                            <div class="skeleton-list-item"><div class="skeleton skeleton-list-icon"></div><div class="skeleton-list-content"><div class="skeleton skeleton-list-title"></div></div></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Last Commit Card -->
            <div class="repo-commit-card overview-card" data-card="commit">
                <div class="overview-card-header repo-commit-header">
                    <div class="overview-card-title-wrap">
                        <span class="overview-card-icon" aria-hidden="true">
                            <!-- Commit icon -->
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><line x1="3" x2="9" y1="12" y2="12"/><line x1="15" x2="21" y1="12" y2="12"/></svg>
                        </span>
                        <h3 class="overview-card-title"><?php echo esc_html__('Last Commit', 'repo-manager'); ?></h3>
                    </div>
                    <div class="commit-time" id="commit-time">
                        <span class="value"><?php echo esc_html__('Loading...', 'repo-manager'); ?></span>
                        <div class="skeleton skeleton-text skeleton-placeholder" style="width:60px;"></div>
                    </div>
                </div>
                <div class="repo-commit-content overview-card-body" id="repo-commit-content">
                    <div class="last-commit-info" id="last-commit-info">
                        <p class="value"><?php echo esc_html__('Loading commit information...', 'repo-manager'); ?></p>
                        <div class="skeleton skeleton-text skeleton-placeholder"></div>
                        <div class="skeleton skeleton-text skeleton-placeholder" style="width:80%;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Recommendations Section (redesigned) -->
        <div class="repo-recommendations overview-card" id="repo-recommendations" style="display: none;" data-card="recommendations">
            <div class="overview-card-header">
                <div class="overview-card-title-wrap">
                    <span class="overview-card-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </span>
                    <h3 class="overview-card-title"><?php echo esc_html__('Recommendations', 'repo-manager'); ?></h3>
                </div>
            </div>
            <div class="overview-card-body recommendations-body" id="recommendations-list">
                <!-- Recommendations will be populated here -->
            </div>
        </div>
        <?php
    }

    private function renderCommitsTab()
    {
        ?>
        <div class="commits-section">
            <div class="commits-list">
                <div class="loading-commits">
                    <div class="progress-spinner"></div>
                    <span><?php echo esc_html__('Loading commits...', 'repo-manager'); ?></span>
                </div>
            </div>
        </div>
        <?php
    }

    private function renderBranchesTab()
    {
        ?>
        <div class="branches-section">
            <div class="branches-header">
                <h3><?php echo esc_html__('Branches', 'repo-manager'); ?></h3>
                <div class="branch-search-container">
                    <input type="text" id="branch-search-input" placeholder="<?php echo esc_attr__('Search branches...', 'repo-manager'); ?>">
                </div>
            </div>
            <div class="branches-list">
                <div class="loading-branches">
                    <div class="progress-spinner"></div>
                    <span><?php echo esc_html__('Loading branches...', 'repo-manager'); ?></span>
                </div>
            </div>
        </div>
        <?php
    }

    private function renderTroubleshootingTab()
    {
        ?>
        <div class="troubleshooting-section">
            <div class="troubleshooting-content">
                <div id="repo-manager-output">
                    <!-- Enhanced troubleshooting will be loaded here -->
                </div>
            </div>
        </div>
        <?php
    }

    private function renderSettingsTab()
    {
        ?>
        <div class="settings-section">
            <div class="settings-form repository-settings-form">
                <div class="form-section">
                    <h4 class="form-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                            <polyline points="14,2 14,8 20,8"/>
                        </svg>
                        <?php echo esc_html__('Basic Information', 'repo-manager'); ?>
                    </h4>

                    <div class="form-group">
                        <label for="repo-name-setting"><?php echo esc_html__('Repository Name', 'repo-manager'); ?></label>
                        <input type="text" id="repo-name-setting" class="form-control" placeholder="<?php echo esc_attr__('Repository name', 'repo-manager'); ?>" required>
                        <div class="form-help"><?php echo esc_html__('The display name for this repository', 'repo-manager'); ?></div>
                    </div>

                    <div class="form-group">
                        <label for="repo-path-setting"><?php echo esc_html__('Repository Path', 'repo-manager'); ?></label>
                        <input type="text" id="repo-path-setting" class="form-control" placeholder="<?php echo esc_attr__('Repository path', 'repo-manager'); ?>" required>
                        <div class="form-help"><?php echo esc_html__('The local path to this repository', 'repo-manager'); ?></div>
                    </div>

                    <div class="form-group">
                        <label for="repo-remote-setting"><?php echo esc_html__('Remote URL', 'repo-manager'); ?></label>
                        <input type="text" id="repo-remote-setting" class="form-control" placeholder="<?php echo esc_attr__('https://github.com/user/repo.git', 'repo-manager'); ?>">
                        <div class="form-help"><?php echo esc_html__('The remote repository URL (optional)', 'repo-manager'); ?></div>
                    </div>
                </div>

                <div class="form-section">
                    <h4 class="form-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                        <?php echo esc_html__('Actions', 'repo-manager'); ?>
                    </h4>

                    <div class="form-actions">
                        <button type="button" id="save-settings-btn" class="git-action-btn git-primary-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                <polyline points="17,21 17,13 7,13 7,21"/>
                                <polyline points="7,3 7,8 15,8"/>
                            </svg>
                            <?php echo esc_html__('Save Settings', 'repo-manager'); ?>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
}
