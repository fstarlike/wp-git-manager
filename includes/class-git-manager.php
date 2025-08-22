<?php

/**
 * Main class for Git Manager plugin
 *
 * @package GitManager
 */

if (! defined('ABSPATH')) {
    exit;
}

class Git_Manager
{
    /**
     * Singleton instance
     * @var Git_Manager
     */
    private static $instance = null;

    /**
     * Constructor
     */
    private function __construct()
    {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
    }

    /**
     * Get singleton instance
     * @return Git_Manager
     */
    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
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
            array($this, 'admin_page'),
            'dashicons-admin-generic',
            56
        );
    }

    /**
     * Enqueue admin assets
     */
    public function enqueue_assets($hook)
    {
        // Always enqueue global checker for allowed users on all admin pages
        $allowed    = get_option('git_manager_allowed_roles', array('administrator'));
        $user       = wp_get_current_user();
        $has_access = false;
        foreach ($user->roles as $role) {
            if (in_array($role, $allowed)) {
                $has_access = true;
                break;
            }
        }
        if ($has_access) {
            wp_enqueue_script('git-manager-global', GIT_MANAGER_URL . 'admin/git-manager-global.js', array('wp-i18n'), GIT_MANAGER_VERSION, true);
            wp_localize_script('git-manager-global', 'WPGitManagerGlobal', array(
                'beepUrl' => GIT_MANAGER_URL . 'admin/beep.mp3',
                'ajaxurl' => admin_url('admin-ajax.php'),
                'action_nonces' => array(
                    'git_manager_latest_commit' => wp_create_nonce('git_manager_latest_commit'),
                    'git_manager_fetch' => wp_create_nonce('git_manager_fetch'),
                    'git_manager_pull' => wp_create_nonce('git_manager_pull'),
                    'git_manager_get_branches' => wp_create_nonce('git_manager_get_branches'),
                    'git_manager_status' => wp_create_nonce('git_manager_status'),
                ),
            ));
            wp_localize_script('git-manager-global', 'gitManagerNonce', array('nonce' => wp_create_nonce('git_manager_action')));
            if (function_exists('wp_set_script_translations')) {
                wp_set_script_translations('git-manager-global', 'git-manager', GIT_MANAGER_PATH . 'languages');
            }
        }
        // Only enqueue admin assets on plugin page
        if ('toplevel_page_git-manager' !== $hook) {
            return;
        }

        wp_enqueue_style('git-manager-admin', GIT_MANAGER_URL . 'admin/admin.css', array(), GIT_MANAGER_VERSION);
        wp_enqueue_script('git-manager-admin', GIT_MANAGER_URL . 'admin/admin.js', array('jquery', 'wp-i18n'), GIT_MANAGER_VERSION, true);
        wp_localize_script('git-manager-admin', 'WPGitManager', array(
            'nonce'   => wp_create_nonce('git_manager_action'),
            'ajaxurl' => admin_url('admin-ajax.php'),
            'beepUrl' => GIT_MANAGER_URL . 'admin/beep.mp3',
            'action_nonces' => array(
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
            ),
        ));

        if (function_exists('wp_set_script_translations')) {
            wp_set_script_translations('git-manager-admin', 'git-manager', GIT_MANAGER_PATH . 'languages');
        }
        wp_enqueue_script('git-manager-admin-extra', GIT_MANAGER_URL . 'admin/admin-extra.js', array('jquery', 'wp-i18n'), GIT_MANAGER_VERSION, true);
        if (function_exists('wp_set_script_translations')) {
            wp_set_script_translations('git-manager-admin-extra', 'git-manager', GIT_MANAGER_PATH . 'languages');
        }
    }

    /**
     * Render admin page
     */
    public function admin_page()
    {
        // Check allowed roles
        $allowed    = get_option('git_manager_allowed_roles', array('administrator'));
        $user       = wp_get_current_user();
        $has_access = false;
        foreach ($user->roles as $role) {
            if (in_array($role, $allowed)) {
                $has_access = true;
                break;
            }
        }
        if (!$has_access) {
            echo '<div class="notice notice-error"><b>You don\'t have access to this section.</b></div>';
            return;
        }
        include GIT_MANAGER_PATH . 'admin/admin-page.php';
    }
}
