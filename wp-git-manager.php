<?php

/**
 * Plugin Name: WP Git Manager
 * Description: Professional Git repository management from WordPress admin panel with features like displaying commits, pull, fetch, branch switching and ...
 * Version: 1.4.0
 * Author: Farzad Hoseinzadeh
 * Author URI: https://github.com/fstarlike
 * Text Domain: git-manager
 * Domain Path: /languages
 */

if (! defined('ABSPATH')) {
    exit;
}

define('GIT_MANAGER_PATH', plugin_dir_path(__FILE__));
define('GIT_MANAGER_URL', plugin_dir_url(__FILE__));
define('GIT_MANAGER_VERSION', '1.4.0');

// Enqueue modern admin styles and FontAwesome for plugin admin pages

/**
 * Enqueue the global commit checker on all admin pages for allowed roles.
 */
function git_manager_enqueue_global_checker() {
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
        wp_enqueue_script('git-manager-global', plugin_dir_url(__FILE__) . 'admin/git-manager-global.js', array('wp-i18n'), GIT_MANAGER_VERSION, true);
        wp_localize_script('git-manager-global', 'WPGitManagerGlobal', array(
            'beepUrl' => plugin_dir_url(__FILE__) . 'admin/beep.mp3',
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
    }
}
add_action('admin_enqueue_scripts', 'git_manager_enqueue_global_checker', 1);

function git_manager_enqueue_admin_assets($hook)
{
    // Adjust admin menu icon size
    wp_add_inline_style('admin-menu', '
		.toplevel_page_git-manager > .wp-menu-image > img {
			width: 25px !important;
			height: auto !important;
			padding: 0 !important;
			padding-top: 5px !important;
		}
	');

    if (false === strpos($hook, 'git-manager')) {
        return;
    }
    // Ensure modern global checker is available on all admin pages for allowed users
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
        wp_enqueue_script('git-manager-global', plugin_dir_url(__FILE__) . 'admin/git-manager-global.js', array('wp-i18n'), GIT_MANAGER_VERSION, true);
        wp_localize_script('git-manager-global', 'WPGitManagerGlobal', array(
            'beepUrl' => plugin_dir_url(__FILE__) . 'admin/beep.mp3',
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
    }
    wp_enqueue_style('git-manager-modern', plugin_dir_url(__FILE__) . 'admin/admin-modern.css', array(), GIT_MANAGER_VERSION);
    wp_enqueue_style('fontawesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', array(), '6.4.0');
    // Bootstrap JS (for modal, etc)
    wp_enqueue_script('bootstrap-js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js', array('jquery'), '5.3.0', true);
    // Enqueue logo.svg as a resource (for menu icon)
    wp_register_style('git-manager-logo', false);
    wp_enqueue_style('git-manager-logo');
}
add_action('admin_enqueue_scripts', 'git_manager_enqueue_admin_assets');

// Add logo.svg to admin menu
add_action('admin_menu', function () {
    global $menu;
    foreach ($menu as $k => $item) {
        if (isset($item[2]) && false !== strpos($item[2], 'git-manager')) {
            $menu[$k][6] = plugin_dir_url(__FILE__) . 'admin/logo.svg';
        }
    }
}, 100);

// Load plugin textdomain for translations
function git_manager_load_textdomain()
{
    load_plugin_textdomain('git-manager', false, dirname(plugin_basename(__FILE__)) . '/languages');
}
add_action('plugins_loaded', 'git_manager_load_textdomain');

require_once GIT_MANAGER_PATH . 'includes/class-git-manager.php';
require_once GIT_MANAGER_PATH . 'includes/class-git-manager-ajax.php';

// Register AJAX endpoint for git change check
add_action('wp_ajax_git_manager_check_git_changes', function () {
    $ajax = new Git_Manager_Ajax();
    $ajax->check_git_changes();
});

function git_manager_init()
{
    return Git_Manager::get_instance();
}
git_manager_init();

// Add Git Manager dropdown to WP admin bar
add_action('admin_bar_menu', function ($wp_admin_bar) {
    if (!current_user_can('manage_options')) {
        return;
    }
    $wp_admin_bar->add_node(array(
        'id'    => 'git_manager_bar',
        'title' => '<span id="git-manager-bar-title"><i class="fa-solid fa-code-branch"></i> Git-Manager <span id="git-manager-bar-badge" style="display:none;background:#d00;color:#fff;border-radius:10px;padding:2px 7px;font-size:11px;margin-left:6px;">New</span></span>',
        'href'  => '#',
        'meta'  => array('title' => __('Git Manager', 'git-manager'), 'html' => '', 'class' => 'git-manager-bar-root'),
    ));
    $wp_admin_bar->add_node(array(
        'id'     => 'git_manager_bar_fetch',
        'parent' => 'git_manager_bar',
        'title'  => '<i class="fa-solid fa-download"></i> ' . __('Fetch', 'git-manager'),
        'href'   => '#',
        'meta'   => array('class' => 'git-manager-bar-fetch'),
    ));
    $wp_admin_bar->add_node(array(
        'id'     => 'git_manager_bar_pull',
        'parent' => 'git_manager_bar',
        'title'  => '<i class="fa-solid fa-arrow-down"></i> ' . __('Pull', 'git-manager'),
        'href'   => '#',
        'meta'   => array('class' => 'git-manager-bar-pull'),
    ));
}, 100);

// Enqueue admin bar script and style
add_action('admin_enqueue_scripts', function () {
    if (!is_admin_bar_showing()) {
        return;
    }
    wp_enqueue_script('git-manager-bar', GIT_MANAGER_URL . 'admin/git-manager-bar.js', array('jquery'), GIT_MANAGER_VERSION, true);
    wp_localize_script('git-manager-bar', 'WPGitManagerBar', array(
        'ajaxurl'  => admin_url('admin-ajax.php'),
        'nonce'    => wp_create_nonce('git_manager_action'),
            // per-action nonces used by admin bar scripts
            'action_nonces' => array(
                'git_manager_status' => wp_create_nonce('git_manager_status'),
                'git_manager_pull' => wp_create_nonce('git_manager_pull'),
                'git_manager_fetch' => wp_create_nonce('git_manager_fetch'),
                'git_manager_latest_commit' => wp_create_nonce('git_manager_latest_commit'),
                'git_manager_get_branches' => wp_create_nonce('git_manager_get_branches'),
                'git_manager_log' => wp_create_nonce('git_manager_log'),
                'git_manager_branch' => wp_create_nonce('git_manager_branch'),
                'git_manager_check_git_changes' => wp_create_nonce('git_manager_check_git_changes'),
                'git_manager_fix_permission' => wp_create_nonce('git_manager_fix_permission'),
                'git_manager_fix_ssh' => wp_create_nonce('git_manager_fix_ssh'),
                'git_manager_save_roles' => wp_create_nonce('git_manager_save_roles'),
                'git_manager_safe_directory' => wp_create_nonce('git_manager_safe_directory'),
            ),
        // per-action nonces to add extra CSRF binding
        'action_nonces' => array(
            'git_manager_latest_commit' => wp_create_nonce('git_manager_latest_commit'),
            'git_manager_fetch' => wp_create_nonce('git_manager_fetch'),
            'git_manager_pull' => wp_create_nonce('git_manager_pull'),
            'git_manager_checkout' => wp_create_nonce('git_manager_checkout'),
            'git_manager_get_branches' => wp_create_nonce('git_manager_get_branches'),
            'git_manager_troubleshoot' => wp_create_nonce('git_manager_troubleshoot'),
            'git_manager_status' => wp_create_nonce('git_manager_status'),
        ),
        'pullText' => __('Repository pulled successfully.', 'git-manager'),
    ));
    wp_enqueue_style('git-manager-bar', GIT_MANAGER_URL . 'admin/git-manager-bar.css', array(), GIT_MANAGER_VERSION);
});
