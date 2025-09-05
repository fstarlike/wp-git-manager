<?php

namespace WPGitManager\View\Components;

use WPGitManager\Infrastructure\RTLSupport;

class Settings
{
    public function render()
    {
        if (! defined('ABSPATH')) {
            exit;
        }

        // Check if user has permission
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('Access denied.', 'repo-manager'));
        }

        ?>
        <div class="wrap">
            <div class="git-settings" <?php echo esc_attr(RTLSupport::getRTLWrapperAttributes()); ?>>
                <!-- Modern Header -->
                <div class="git-settings-header">
                    <div class="git-settings-header-content">
                        <div class="git-settings-brand">
                            <div class="git-settings-logo">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="63.495 58.089 120 120" width="50px" height="50px">
                                    <defs>
                                        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" spreadMethod="pad">
                                        <stop offset="0" stop-color="#2563eb"/>
                                        <stop offset="1" stop-color="#3b82f6"/>
                                        </linearGradient>
                                    </defs>
                                    <rect width="120" height="120" rx="24" x="63.495" y="58.089" style="stroke-width: 1; stroke-miterlimit: 1; stroke-linecap: round;" fill="url(#bg)"/>
                                    <g transform="matrix(3.33299994468689, 0, 0, 3.33299994468689, 85.03018951416016, 80.47609710693361)">
                                        <path stroke="#fff" d="M 9 19 C 5.283 20.115 3.005 19.703 2.068 17.054 C 1.848 16.432 1.085 16.283 0.572 16.155 M 16.558 22.159 L 16 18.13 C 16.076 17.165 15.465 15.854 14.792 15.159 C 17.932 14.809 23.456 15.349 21.5 8.52 C 21.116 7.178 20.963 5.781 20 4.77 C 20.456 3.549 20.853 1.609 20.339 0.411 C 20.339 0.411 18.73 0.65 16 2.48 C 13.708 1.859 11.292 1.859 9 2.48 C 6.27 0.65 4.768 0.464 4.768 0.464 C 4.254 1.662 4.544 3.549 5 4.77 C 4.03 5.789 3.716 7.16 3.5 8.55 C 2.522 14.85 7.019 14.692 10.159 15.082 C 9.494 15.77 8.933 17.176 9 18.13 L 9 22" style="stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.80018px; fill: none;"/>
                                    </g>
                                </svg>
                            </div>
                            <div class="git-settings-title">
                                <h1><?php esc_html_e('Repo Manager Settings', 'repo-manager'); ?></h1>
                                <p><?php esc_html_e('Configure your Repo Manager Experience', 'repo-manager'); ?></p>
                            </div>
                        </div>

                        <div class="git-settings-nav">
                            <a href="<?php echo esc_url(admin_url('admin.php?page=repo-manager')); ?>" class="git-nav-btn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                    <polyline points="9,22 9,12 15,12 15,22"/>
                                </svg>
                                <?php esc_html_e('Dashboard', 'repo-manager'); ?>
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Settings Content -->
                <div class="git-settings-content">
                    <form method="post" action="options.php" class="git-settings-form">
                        <?php settings_fields('git_manager_options'); ?>
                        <?php do_settings_sections('git_manager_options'); ?>

                        <!-- Command Execution (Security) Section -->
                        <div class="git-settings-card">
                            <div class="git-settings-card-header">
                                <div class="git-settings-card-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                        <line x1="12" y1="9" x2="12" y2="13"/>
                                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                                    </svg>
                                </div>
                                <div class="git-settings-card-title">
                                    <h3><?php esc_html_e('Command Execution', 'repo-manager'); ?></h3>
                                    <p><?php esc_html_e('Enable Git command execution via server shell. Use with caution.', 'repo-manager'); ?></p>
                                </div>
                            </div>

                            <div class="git-settings-card-body">
                                <div class="git-settings-toggle">
                                    <label class="git-toggle-switch">
                                        <input type="checkbox" name="git_manager_allow_commands" value="1"
                                               <?php checked(1, get_option('git_manager_allow_commands', 0)); ?>>
                                        <span class="git-toggle-slider"></span>
                                    </label>
                                    <div class="git-toggle-content">
                                        <div class="git-toggle-title"><?php esc_html_e('Enable command execution (shell)', 'repo-manager'); ?></div>
                                        <div class="git-toggle-description">
                                            <?php esc_html_e('Security warning: This runs system commands on your server. Only enable on trusted, single-tenant servers.', 'repo-manager'); ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Automatic Fixes Section -->
                        <div class="git-settings-card">
                            <div class="git-settings-card-header">
                                <div class="git-settings-card-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                                    </svg>
                                </div>
                                <div class="git-settings-card-title">
                                    <h3><?php esc_html_e('Automatic Fixes', 'repo-manager'); ?></h3>
                                    <p><?php esc_html_e('Allow the plugin to automatically resolve common Git issues', 'repo-manager'); ?></p>
                                </div>
                            </div>

                            <div class="git-settings-card-body">
                                <div class="git-settings-toggle">
                                    <label class="git-toggle-switch">
                                        <input type="checkbox" name="git_manager_allow_auto_fix" value="1"
                                               <?php checked(1, get_option('git_manager_allow_auto_fix', 0)); ?>>
                                        <span class="git-toggle-slider"></span>
                                    </label>
                                    <div class="git-toggle-content">
                                        <div class="git-toggle-title"><?php esc_html_e('Enable automatic fixes', 'repo-manager'); ?></div>
                                        <div class="git-toggle-description">
                                            <?php esc_html_e('Automatically fix filesystem and Git issues. Only enable on trusted servers.', 'repo-manager'); ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- User Access Control Section -->
                        <div class="git-settings-card">
                            <div class="git-settings-card-header">
                                <div class="git-settings-card-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                </div>
                                <div class="git-settings-card-title">
                                    <h3><?php esc_html_e('User Access Control', 'repo-manager'); ?></h3>
                                    <p><?php esc_html_e('Control which user roles can access Git Manager', 'repo-manager'); ?></p>
                                </div>
                            </div>

                            <div class="git-settings-card-body">
                                <div class="git-settings-field">
                                    <label class="git-field-label">
                                        <span class="git-field-title"><?php esc_html_e('Allowed User Roles', 'repo-manager'); ?></span>
                                        <span class="git-field-description">
                                            <?php esc_html_e('Select which WordPress roles can use Git Manager. Use Ctrl/Cmd+click for multiple selection.', 'repo-manager'); ?>
                                        </span>
                                    </label>

                                    <div class="git-select-wrapper">
                                        <select name="git_manager_allowed_roles[]" multiple class="git-select">
                                            <?php
                                            global $wp_roles;
        $allowed   = get_option('git_manager_allowed_roles', ['administrator']);
        $all_roles = is_object($wp_roles) ? $wp_roles->roles : [];

        foreach ($all_roles as $role_key => $role_data) {
            $selected = in_array($role_key, $allowed) ? 'selected' : '';
            echo '<option value="' . esc_attr($role_key) . '" ' . esc_attr($selected) . '>' . esc_html($role_data['name']) . '</option>';
        }
        ?>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Troubleshooting & Monitoring Section -->
                        <div class="git-settings-card">
                            <div class="git-settings-card-header">
                                <div class="git-settings-card-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                        <path d="M9 12l2 2 4-4"/>
                                    </svg>
                                </div>
                                <div class="git-settings-card-title">
                                    <h3><?php esc_html_e('Troubleshooting & Monitoring', 'repo-manager'); ?></h3>
                                    <p><?php esc_html_e('Configure troubleshooting features and monitoring behavior', 'repo-manager'); ?></p>
                                </div>
                            </div>

                            <div class="git-settings-card-body">
                                <div class="git-settings-toggle">
                                    <label class="git-toggle-switch">
                                        <input type="checkbox" name="git_manager_troubleshooting_enabled" value="1"
                                               <?php checked(1, get_option('git_manager_troubleshooting_enabled', 1)); ?>>
                                        <span class="git-toggle-slider"></span>
                                    </label>
                                    <div class="git-toggle-content">
                                        <div class="git-toggle-title"><?php esc_html_e('Enable troubleshooting features', 'repo-manager'); ?></div>
                                        <div class="git-toggle-description">
                                            <?php esc_html_e('Allow users to access the troubleshooting interface and run diagnostic checks.', 'repo-manager'); ?>
                                        </div>
                                    </div>
                                </div>

                                <div class="git-settings-field">
                                    <label class="git-field-label">
                                        <span class="git-field-title"><?php esc_html_e('Auto-check Interval', 'repo-manager'); ?></span>
                                        <span class="git-field-description">
                                            <?php esc_html_e('How often to automatically check for new commits and repository status. Set to 0 to disable.', 'repo-manager'); ?>
                                        </span>
                                    </label>

                                    <div class="git-input-wrapper">
                                        <input type="number" name="git_manager_auto_check_interval"
                                               value="<?php echo esc_attr(get_option('git_manager_auto_check_interval', 30)); ?>"
                                               min="0" max="3600" step="5" class="git-input">
                                        <span class="git-input-suffix">seconds</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Floating Widget Settings Section -->
                        <div class="git-settings-card">
                            <div class="git-settings-card-header">
                                <div class="git-settings-card-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                                        <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                                        <path d="M2 17L12 22L22 17"/>
                                        <path d="M2 12L12 17L22 12"/>
                                    </svg>
                                </div>
                                <div class="git-settings-card-title">
                                    <h3><?php esc_html_e('Floating Widget Settings', 'repo-manager'); ?></h3>
                                    <p><?php esc_html_e('Control the floating widget and its notifications behavior', 'repo-manager'); ?></p>
                                </div>
                            </div>

                            <div class="git-settings-card-body">
                                <div class="git-settings-toggle">
                                    <label class="git-toggle-switch">
                                        <input type="checkbox" name="git_manager_floating_widget_enabled" value="1"
                                               <?php checked(1, get_option('git_manager_floating_widget_enabled', 1)); ?>>
                                        <span class="git-toggle-slider"></span>
                                    </label>
                                    <div class="git-toggle-content">
                                        <div class="git-toggle-title"><?php esc_html_e('Enable floating widget', 'repo-manager'); ?></div>
                                        <div class="git-toggle-description">
                                            <?php esc_html_e('Show the floating Repo Manager Widget on all admin pages for quick repository access.', 'repo-manager'); ?>
                                        </div>
                                    </div>
                                </div>

                                <div class="git-settings-toggle">
                                    <label class="git-toggle-switch">
                                        <input type="checkbox" name="git_manager_floating_notifications_enabled" value="1"
                                               <?php checked(1, get_option('git_manager_floating_notifications_enabled', 1)); ?>
                                               <?php echo get_option('git_manager_floating_widget_enabled', 1) ? '' : 'disabled'; ?>>
                                        <span class="git-toggle-slider"></span>
                                    </label>
                                    <div class="git-toggle-content">
                                        <div class="git-toggle-title"><?php esc_html_e('Enable repository status notifications', 'repo-manager'); ?></div>
                                        <div class="git-toggle-description">
                                            <?php esc_html_e('Show notifications for repository updates like new commits, branch changes, and status changes.', 'repo-manager'); ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Save Settings Section -->
                        <div class="git-settings-actions">
                            <div class="git-settings-save">
                                <div class="git-save-info">
                                    <div class="git-save-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                                            <path d="M9 12l2 2 4-4"/>
                                            <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z"/>
                                            <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z"/>
                                            <path d="M12 3c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z"/>
                                            <path d="M12 21c0-1 1-2 2-2s2 1 2 2-1 2-2 2-2-1-2-2z"/>
                                        </svg>
                                    </div>
                                    <div class="git-save-text">
                                        <div class="git-save-title"><?php esc_html_e('Ready to Save', 'repo-manager'); ?></div>
                                        <div class="git-save-description"><?php esc_html_e('Your settings will be applied immediately', 'repo-manager'); ?></div>
                                    </div>
                                </div>

                                <button type="submit" class="git-save-btn">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                        <polyline points="17,21 17,13 7,13 7,21"/>
                                        <polyline points="7,3 7,8 15,8"/>
                                    </svg>
                                    <?php esc_html_e('Save Settings', 'repo-manager'); ?>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <?php
    }
}

// Add JavaScript to handle settings dependency
add_action('admin_footer', function () {
    if (get_current_screen() && 'repo-manager_page_repo-manager-settings' === get_current_screen()->id) {
        ?>
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            const floatingWidgetCheckbox = document.querySelector('input[name="git_manager_floating_widget_enabled"]');
            const notificationsCheckbox = document.querySelector('input[name="git_manager_floating_notifications_enabled"]');

            if (floatingWidgetCheckbox && notificationsCheckbox) {
                // Function to update notifications checkbox state
                function updateNotificationsState() {
                    if (!floatingWidgetCheckbox.checked) {
                        notificationsCheckbox.checked = false;
                        notificationsCheckbox.disabled = true;
                    } else {
                        notificationsCheckbox.disabled = false;
                    }
                }

                // Initial state
                updateNotificationsState();

                // Listen for changes
                floatingWidgetCheckbox.addEventListener('change', updateNotificationsState);
            }
        });
        </script>
        <?php
    }
});
