<?php

/**
 * Main class for Git Manager plugin
 */
if (! defined('ABSPATH')) {
    exit;
}

class Git_Manager
{
    /**
     * Singleton instance
     *
     * @var Git_Manager
     */
    private static $instance = null;

    /**
     * Constructor
     */
    private function __construct()
    {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('admin_init', [$this, 'register_settings']);
    }

    /**
     * Get singleton instance
     *
     * @return Git_Manager
     */
    public static function get_instance()
    {
        if (self::$instance === null) {
            self::$instance = new self;
        }

        return self::$instance;
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu()
    {
        add_menu_page(
            __('Git Manager', 'git-manager'),
            __('Git Manager', 'git-manager'),
            'manage_options',
            'git-manager',
            [$this, 'admin_page'],
            'dashicons-admin-generic',
            56
        );
        // Add a dedicated settings submenu under the plugin for easier access
        add_submenu_page(
            'git-manager',
            __('Git Manager Settings', 'git-manager'),
            __('Settings', 'git-manager'),
            'manage_options',
            'git-manager-settings',
            [$this, 'settings_page']
        );
    }

    public function register_settings()
    {
        // Register the option so it appears in WP options and can be sanitized
        register_setting('git_manager_options', 'git_manager_allow_auto_fix', ['type' => 'boolean', 'sanitize_callback' => 'absint']);
        // Register allowed roles as an option and sanitize it with a dedicated callback
        register_setting('git_manager_options', 'git_manager_allowed_roles', ['type' => 'array', 'sanitize_callback' => [$this, 'sanitize_allowed_roles']]);
    }

    /**
     * Sanitize allowed roles option - ensure it's an array of existing role keys
     *
     * @param  mixed  $input
     * @return array
     */
    public function sanitize_allowed_roles($input)
    {
        if (! is_array($input)) {
            return ['administrator'];
        }
        global $wp_roles;
        $valid = [];
        $all_roles = is_object($wp_roles) ? $wp_roles->roles : [];
        foreach ($input as $role_key) {
            $role_key = sanitize_text_field($role_key);
            if (isset($all_roles[$role_key])) {
                $valid[] = $role_key;
            }
        }
        if (empty($valid)) {
            // fallback to administrator to avoid locking everyone out
            return ['administrator'];
        }

        return array_values(array_unique($valid));
    }

    public function settings_page()
    {
        if (! current_user_can('manage_options')) {
            wp_die(__('Access denied.'));
        }
        ?>
        <div class="wrap">
            <h1><?php _e('Git Manager Settings', 'git-manager'); ?></h1>
            <div id="git-manager-settings-panel">
            <form method="post" action="options.php">
                <?php settings_fields('git_manager_options'); ?>
                <?php do_settings_sections('git_manager_options'); ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row"><?php _e('Allow automatic fixes', 'git-manager'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="git_manager_allow_auto_fix" value="1" <?php checked(1, get_option('git_manager_allow_auto_fix', 0)); ?> />
                                <?php _e('Enable automatic filesystem and git fixes (use only on trusted servers).', 'git-manager'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row"><?php _e('Allowed User Roles', 'git-manager'); ?></th>
                        <td>
                            <div class="mb-3">
                                <div class="form-text" style="margin-bottom:6px;">
                                    <?php _e('Select which WP roles are allowed to use the Git Manager interface. Use Ctrl/Cmd+click to select multiple.', 'git-manager'); ?>
                                </div>
                                <select name="git_manager_allowed_roles[]" class="form-select" multiple style="min-height:100px;">
                                    <?php
                                    global $wp_roles;
        $roles = $wp_roles->roles;
        $allowed = get_option('git_manager_allowed_roles', ['administrator']);
        foreach ($roles as $role_key => $role) {
            echo '<option value="'.esc_attr($role_key).'"'.(in_array($role_key, $allowed) ? ' selected' : '').'>'.esc_html($role['name']).'</option>';
        }
        ?>
                                </select>
                            </div>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            </div>
        </div>
        <?php
    }

    /**
     * Enqueue admin assets
     */
    public function enqueue_assets($hook)
    {
        // Always enqueue global checker for allowed users on all admin pages
        $allowed = get_option('git_manager_allowed_roles', ['administrator']);
        $user = wp_get_current_user();
        $has_access = false;
        foreach ($user->roles as $role) {
            if (in_array($role, $allowed)) {
                $has_access = true;
                break;
            }
        }
        if ($has_access) {
            wp_enqueue_script('git-manager-global', GIT_MANAGER_URL.'admin/git-manager-global.js', ['wp-i18n'], GIT_MANAGER_VERSION, true);
            wp_localize_script('git-manager-global', 'WPGitManagerGlobal', [
                'beepUrl' => GIT_MANAGER_URL.'admin/beep.mp3',
                'ajaxurl' => admin_url('admin-ajax.php'),
                'action_nonces' => [
                    'git_manager_latest_commit' => wp_create_nonce('git_manager_latest_commit'),
                    'git_manager_fetch' => wp_create_nonce('git_manager_fetch'),
                    'git_manager_pull' => wp_create_nonce('git_manager_pull'),
                    'git_manager_get_branches' => wp_create_nonce('git_manager_get_branches'),
                    'git_manager_status' => wp_create_nonce('git_manager_status'),
                ],
            ]);
            wp_localize_script('git-manager-global', 'gitManagerNonce', ['nonce' => wp_create_nonce('git_manager_action')]);
            if (function_exists('wp_set_script_translations')) {
                wp_set_script_translations('git-manager-global', 'git-manager', GIT_MANAGER_PATH.'languages');
            }
        }
        // Only enqueue admin assets on plugin page
        if ($hook !== 'toplevel_page_git-manager') {
            return;
        }

        wp_enqueue_style('git-manager-admin', GIT_MANAGER_URL.'admin/admin.css', [], GIT_MANAGER_VERSION);
        wp_enqueue_script('git-manager-admin', GIT_MANAGER_URL.'admin/admin.js', ['jquery', 'wp-i18n'], GIT_MANAGER_VERSION, true);
        wp_localize_script('git-manager-admin', 'WPGitManager', [
            'nonce' => wp_create_nonce('git_manager_action'),
            'ajaxurl' => admin_url('admin-ajax.php'),
            'beepUrl' => GIT_MANAGER_URL.'admin/beep.mp3',
            'action_nonces' => [
                'git_manager_latest_commit' => wp_create_nonce('git_manager_latest_commit'),
                'git_manager_fetch' => wp_create_nonce('git_manager_fetch'),
                'git_manager_pull' => wp_create_nonce('git_manager_pull'),
                'git_manager_checkout' => wp_create_nonce('git_manager_checkout'),
                'git_manager_get_branches' => wp_create_nonce('git_manager_get_branches'),
                'git_manager_troubleshoot' => wp_create_nonce('git_manager_troubleshoot'),
                'git_manager_save_path' => wp_create_nonce('git_manager_save_path'),
                'git_manager_fetch' => wp_create_nonce('git_manager_fetch'),
                'git_manager_status' => wp_create_nonce('git_manager_status'),
                // additional nonces for other AJAX endpoints
                'git_manager_log' => wp_create_nonce('git_manager_log'),
                'git_manager_branch' => wp_create_nonce('git_manager_branch'),
                'git_manager_check_git_changes' => wp_create_nonce('git_manager_check_git_changes'),
                'git_manager_fix_permission' => wp_create_nonce('git_manager_fix_permission'),
                'git_manager_fix_ssh' => wp_create_nonce('git_manager_fix_ssh'),
                'git_manager_save_roles' => wp_create_nonce('git_manager_save_roles'),
                'git_manager_safe_directory' => wp_create_nonce('git_manager_safe_directory'),
            ],
        ]);

        if (function_exists('wp_set_script_translations')) {
            wp_set_script_translations('git-manager-admin', 'git-manager', GIT_MANAGER_PATH.'languages');
        }
        wp_enqueue_script('git-manager-admin-extra', GIT_MANAGER_URL.'admin/admin-extra.js', ['jquery', 'wp-i18n'], GIT_MANAGER_VERSION, true);
        if (function_exists('wp_set_script_translations')) {
            wp_set_script_translations('git-manager-admin-extra', 'git-manager', GIT_MANAGER_PATH.'languages');
        }
    }

    /**
     * Render admin page
     */
    public function admin_page()
    {
        // Check allowed roles
        $allowed = get_option('git_manager_allowed_roles', ['administrator']);
        $user = wp_get_current_user();
        $has_access = false;
        foreach ($user->roles as $role) {
            if (in_array($role, $allowed)) {
                $has_access = true;
                break;
            }
        }
        if (! $has_access) {
            echo '<div class="notice notice-error"><b>You don\'t have access to this section.</b></div>';

            return;
        }
        include GIT_MANAGER_PATH.'admin/admin-page.php';
    }
}
