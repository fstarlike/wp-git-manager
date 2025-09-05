<?php

namespace WPGitManager\View\Components;

if (!defined('ABSPATH')) {
    exit;
}

class FloatingWidget
{
    public static function render(): void
    {
        // Check if floating widget is enabled
        if (!\WPGitManager\Admin\GitManager::is_floating_widget_enabled()) {
            return;
        }

        // Check if we're on the Repo Manager admin page
        if (self::isGitManagerAdminPage()) {
            return;
        }

        $allowed    = get_option('git_manager_allowed_roles', ['administrator']);
        $user       = wp_get_current_user();
        $has_access = false;

        foreach ($user->roles as $role) {
            if (in_array($role, $allowed)) {
                $has_access = true;
                break;
            }
        }

        if (!$has_access) {
            return;
        }

        ?>
        <!-- Repo Manager Floating Widget - Redesigned -->
        <div id="repo-manager-floating-widget" class="repo-manager-floating-widget"
             data-notifications-enabled="<?php echo \WPGitManager\Admin\GitManager::is_floating_notifications_enabled() ? '1' : '0'; ?>"
             data-current-user-email="<?php echo esc_attr($user->user_email ?? ''); ?>"
             data-current-user-name="<?php echo esc_attr($user->display_name ?? ''); ?>">
            <!-- Main Floating Button -->
            <div class="repo-manager-floating-trigger" id="repo-manager-floating-trigger">
                <div class="repo-manager-trigger-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="63.495 58.089 120 120" width="20px" height="20px" class="repo-manager-floating-logo-icon">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" spreadMethod="pad">
                <stop offset="0" stop-color="#2563eb"></stop>
                <stop offset="1" stop-color="#3b82f6"></stop>
                </linearGradient>
            </defs>
            <rect width="120" height="120" rx="24" x="63.495" y="58.089" style="stroke-width: 1; stroke-miterlimit: 1; stroke-linecap: round;" fill="url(#bg)"></rect>
            <g transform="matrix(3.33299994468689, 0, 0, 3.33299994468689, 85.03018951416016, 80.47609710693361)">
                <path stroke="#fff" d="M 9 19 C 5.283 20.115 3.005 19.703 2.068 17.054 C 1.848 16.432 1.085 16.283 0.572 16.155 M 16.558 22.159 L 16 18.13 C 16.076 17.165 15.465 15.854 14.792 15.159 C 17.932 14.809 23.456 15.349 21.5 8.52 C 21.116 7.178 20.963 5.781 20 4.77 C 20.456 3.549 20.853 1.609 20.339 0.411 C 20.339 0.411 18.73 0.65 16 2.48 C 13.708 1.859 11.292 1.859 9 2.48 C 6.27 0.65 4.768 0.464 4.768 0.464 C 4.254 1.662 4.544 3.549 5 4.77 C 4.03 5.789 3.716 7.16 3.5 8.55 C 2.522 14.85 7.019 14.692 10.159 15.082 C 9.494 15.77 8.933 17.176 9 18.13 L 9 22" style="stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.80018px; fill: none;"></path>
            </g>
        </svg>
                </div>
                <div class="repo-manager-trigger-status" id="repo-manager-trigger-status"></div>
            </div>

            <!-- Expanded Panel -->
            <div class="repo-manager-floating-panel" id="repo-manager-floating-panel">
                <!-- Panel Header -->
                <div class="repo-manager-panel-header">
                    <div class="repo-manager-panel-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g><path stroke="white" d="M 9 19 C 5.283 20.115 3.005 19.703 2.068 17.054 C 1.848 16.432 1.085 16.283 0.572 16.155 M 16.558 22.159 L 16 18.13 C 16.076 17.165 15.465 15.854 14.792 15.159 C 17.932 14.809 23.456 15.349 21.5 8.52 C 21.116 7.178 20.963 5.781 20 4.77 C 20.456 3.549 20.853 1.609 20.339 0.411 C 20.339 0.411 18.73 0.65 16 2.48 C 13.708 1.859 11.292 1.859 9 2.48 C 6.27 0.65 4.768 0.464 4.768 0.464 C 4.254 1.662 4.544 3.549 5 4.77 C 4.03 5.789 3.716 7.16 3.5 8.55 C 2.522 14.85 7.019 14.692 10.159 15.082 C 9.494 15.77 8.933 17.176 9 18.13 L 9 22" style="stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.80018px; fill: none;"></path></g>
                    </svg>
                        <span><?php esc_html_e('Repo Manager', 'repo-manager'); ?></span>
                    </div>
                    <button class="repo-manager-panel-close" id="repo-manager-panel-close" aria-label="<?php esc_attr_e('Close', 'repo-manager'); ?>">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>

                <!-- Panel Content -->
                <div class="repo-manager-panel-content">
                    <!-- Repository Selector -->
                    <div class="repo-manager-repo-section">
                        <label class="repo-manager-label" for="repo-manager-repo-select">
                            <?php esc_html_e('Repository', 'repo-manager'); ?>
                        </label>
                        <select id="repo-manager-repo-select" class="repo-manager-select">
                            <option value=""><?php esc_html_e('Select Repository', 'repo-manager'); ?></option>
                        </select>
                    </div>

                    <!-- Branch Information -->
                    <div class="repo-manager-branch-section" id="repo-manager-branch-section" style="display: none;">
                        <div class="repo-manager-branch-header">
                            <div class="repo-manager-branch-name" id="repo-manager-branch-name">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                                <span id="repo-manager-current-branch-name"></span>
                            </div>
                            <div class="repo-manager-branch-status" id="repo-manager-branch-status">
                                <div class="repo-manager-status-dot" id="repo-manager-status-dot"></div>
                                <span id="repo-manager-status-text"></span>
                            </div>
                        </div>

                        <!-- Quick Actions -->
                        <div class="repo-manager-quick-actions">
                            <button class="repo-manager-action-btn repo-manager-action-fetch" id="repo-manager-fetch-btn" title="<?php esc_attr_e('Fetch latest changes', 'repo-manager'); ?>">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                                <span><?php esc_html_e('Fetch', 'repo-manager'); ?></span>
                            </button>
                            <button class="repo-manager-action-btn repo-manager-action-pull" id="repo-manager-pull-btn" title="<?php esc_attr_e('Pull latest changes', 'repo-manager'); ?>">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></svg>
                                <span><?php esc_html_e('Pull', 'repo-manager'); ?></span>
                            </button>
                            <button class="repo-manager-action-btn repo-manager-action-push" id="repo-manager-push-btn" title="<?php esc_attr_e('Push changes', 'repo-manager'); ?>">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 9-6-6-6 6"/><path d="M12 3v14"/><path d="M5 21h14"/></svg>
                                <span><?php esc_html_e('Push', 'repo-manager'); ?></span>
                            </button>
                        </div>

                        <!-- Dashboard Button -->
                        <div class="repo-manager-dashboard-section">
                            <a href="<?php echo esc_url(admin_url('admin.php?page=repo-manager')); ?>" class="repo-manager-dashboard-btn" title="<?php esc_attr_e('Open Repo Manager dashboard', 'repo-manager'); ?>">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                                <span><?php esc_html_e('Open Dashboard', 'repo-manager'); ?></span>
                            </a>
                        </div>
                    </div>

                    <!-- Loading State -->
                    <div class="repo-manager-loading-state" id="repo-manager-loading-state" style="display: none;">
                        <div class="repo-manager-loading-spinner"></div>
                        <span><?php esc_html_e('Loading...', 'repo-manager'); ?></span>
                    </div>

                    <!-- Empty State -->
                    <div class="repo-manager-empty-state" id="repo-manager-empty-state">
                        <div class="repo-manager-empty-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <p><?php esc_html_e('Select a repository to get started', 'repo-manager'); ?></p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Notification System -->
        <div id="repo-manager-notification-container" class="repo-manager-notification-container"></div>
        <?php
    }

    /**
     * Check if we're on the Repo Manager admin page
     */
    private static function isGitManagerAdminPage(): bool
    {
        // Check if we're in admin area
        if (!is_admin()) {
            return false;
        }

        // Check current screen
        $screen = get_current_screen();
        if ($screen && 'toplevel_page_repo-manager' === $screen->id) {
            return true;
        }

        // Check if the body has a specific class that indicates we're on the Repo Manager page
        return function_exists('get_body_class') && in_array('repo-manager-admin', get_body_class());
    }
}
