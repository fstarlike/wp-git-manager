<?php

namespace WPGitManager\Admin;

use WPGitManager\Infrastructure\RTLSupport;
use WPGitManager\View\Admin\Dashboard;
use WPGitManager\View\Components\Settings;

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Main class for Git Manager plugin (PSR-4 namespaced).
 * Functionality remains the same as legacy \Git_Manager.
 */
class GitManager
{
    private static $instance;

    private function __construct()
    {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('admin_init', [$this, 'register_settings']);
    }

    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }

        return self::$instance;
    }

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
        register_setting('git_manager_options', 'git_manager_allow_auto_fix', ['type' => 'boolean', 'sanitize_callback' => 'absint']);
        register_setting('git_manager_options', 'git_manager_allowed_roles', ['type' => 'array', 'sanitize_callback' => [$this, 'sanitize_allowed_roles']]);
        register_setting('git_manager_options', 'git_manager_troubleshooting_enabled', ['type' => 'boolean', 'sanitize_callback' => 'absint']);
        register_setting('git_manager_options', 'git_manager_auto_check_interval', ['type' => 'integer', 'sanitize_callback' => 'absint']);
        register_setting('git_manager_options', 'git_manager_floating_widget_enabled', ['type' => 'boolean', 'sanitize_callback' => 'absint']);
        register_setting('git_manager_options', 'git_manager_floating_notifications_enabled', ['type' => 'boolean', 'sanitize_callback' => 'absint']);
    }

    /**
     * Sanitize allowed roles option - ensure it's an array of existing role keys
     *
     * @param mixed $input
     *
     * @return array
     */
    public function sanitize_allowed_roles($input)
    {
        if (! is_array($input)) {
            return ['administrator'];
        }

        global $wp_roles;
        $valid     = [];
        $all_roles = is_object($wp_roles) ? $wp_roles->roles : [];
        foreach ($input as $role_key) {
            $role_key = sanitize_text_field($role_key);
            if (isset($all_roles[$role_key])) {
                $valid[] = $role_key;
            }
        }

        if ([] === $valid) {
            return ['administrator'];
        }

        return array_values(array_unique($valid));
    }

    /**
     * Check if automatic fixes are enabled
     *
     * @return bool
     */
    public static function is_auto_fix_enabled()
    {
        $setting_enabled = get_option('git_manager_allow_auto_fix', 0);

        if ($setting_enabled) {
            return defined('GIT_MANAGER_ALLOW_AUTO_FIX') && GIT_MANAGER_ALLOW_AUTO_FIX;
        }

        return false;
    }

    /**
     * Check if floating widget is enabled
     *
     * @return bool
     */
    public static function is_floating_widget_enabled()
    {
        return (bool) get_option('git_manager_floating_widget_enabled', 1);
    }

    /**
     * Check if floating widget notifications are enabled
     *
     * @return bool
     */
    public static function is_floating_notifications_enabled()
    {
        // If floating widget is disabled, notifications are automatically disabled
        if (!self::is_floating_widget_enabled()) {
            return false;
        }

        return (bool) get_option('git_manager_floating_notifications_enabled', 1);
    }

    public function settings_page()
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('Access denied.', 'git-manager'));
        }

        $settings = new Settings();
        $settings->render();
    }

    public function enqueue_assets($hook)
    {
        $allowed    = get_option('git_manager_allowed_roles', ['administrator']);
        $user       = wp_get_current_user();
        $has_access = false;
        foreach ($user->roles as $role) {
            if (in_array($role, $allowed)) {
                $has_access = true;
                break;
            }
        }

        if ($has_access) {
            // Enqueue the admin-modern script first so we can localize it
            $admin_modern_deps = ['jquery'];
            if (RTLSupport::isRTL()) {
                $admin_modern_deps[] = 'git-manager-rtl-support';
            }

            wp_enqueue_script('git-manager-admin-modern', GIT_MANAGER_URL . 'src/Assets/js/admin.js', $admin_modern_deps, GIT_MANAGER_VERSION, true);

            // Localize WPGitManagerGlobal to the admin-modern script with full translations
            wp_localize_script('git-manager-admin-modern', 'WPGitManagerGlobal', [
                'beepUrl'       => GIT_MANAGER_URL . 'src/Assets/audio/beep.mp3',
                'ajaxurl'       => admin_url('admin-ajax.php'),
                'nonce'         => wp_create_nonce('git_manager_action'),
                'action_nonces' => [
                    'git_manager_latest_commit'      => wp_create_nonce('git_manager_action'),
                    'git_manager_fetch'              => wp_create_nonce('git_manager_action'),
                    'git_manager_pull'               => wp_create_nonce('git_manager_action'),
                    'git_manager_get_branches'       => wp_create_nonce('git_manager_action'),
                    'git_manager_status'             => wp_create_nonce('git_manager_action'),
                    'git_manager_troubleshoot_step'  => wp_create_nonce('git_manager_action'),
                    'git_manager_get_repos'          => wp_create_nonce('git_manager_action'),
                    'git_manager_get_repo_details'   => wp_create_nonce('git_manager_action'),
                    'git_manager_clone_repo'         => wp_create_nonce('git_manager_action'),
                    'git_manager_add_existing_repo'  => wp_create_nonce('git_manager_action'),
                    'git_manager_delete_repo'        => wp_create_nonce('git_manager_action'),
                    'git_manager_checkout'           => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_list'          => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_clone'         => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_delete'        => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_dirs'          => wp_create_nonce('git_manager_action'),
                    'git_manager_dir_create'         => wp_create_nonce('git_manager_action'),
                    'git_manager_dir_delete'         => wp_create_nonce('git_manager_action'),
                    'git_manager_dir_rename'         => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_git'           => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_push'          => wp_create_nonce('git_manager_action'),
                    'git_manager_log'                => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_troubleshoot'  => wp_create_nonce('git_manager_action'),
                    'git_manager_fix_permission'     => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_status'        => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_checkout'      => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_add'           => wp_create_nonce('git_manager_action'),
                    'git_manager_add_repository'     => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_update'        => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_credentials'   => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_merge'         => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_tag'           => wp_create_nonce('git_manager_action'),
                    'git_manager_detailed_log'       => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_set_active'    => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_add_existing'  => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_create_branch' => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_delete_branch' => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_stash'         => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_stash_pop'     => wp_create_nonce('git_manager_action'),
                    'git_manager_branch'             => wp_create_nonce('git_manager_action'),
                    'git_manager_check_git_changes'  => wp_create_nonce('git_manager_action'),
                    'git_manager_fix_ssh'            => wp_create_nonce('git_manager_action'),
                    'git_manager_save_roles'         => wp_create_nonce('git_manager_action'),
                    'git_manager_safe_directory'     => wp_create_nonce('git_manager_action'),
                    'git_manager_troubleshoot'       => wp_create_nonce('git_manager_action'),
                    'git_manager_repo_reclone'       => wp_create_nonce('git_manager_action'),
                ],
                'translations' => [
                    'startTroubleshooting'               => __('Start Troubleshooting', 'git-manager'),
                    'stop'                               => __('Stop', 'git-manager'),
                    'reset'                              => __('Reset', 'git-manager'),
                    'gitManagerTroubleshooting'          => __('Git Manager Troubleshooting', 'git-manager'),
                    'readyToStart'                       => __('Ready to start', 'git-manager'),
                    'troubleshootingCompleted'           => __('Troubleshooting completed', 'git-manager'),
                    'repositoryPathCheck'                => __('Repository Path Check', 'git-manager'),
                    'verifyingRepositoryPath'            => __('Verifying repository path exists and is accessible', 'git-manager'),
                    'gitBinaryCheck'                     => __('Git Binary Check', 'git-manager'),
                    'checkingGitInstalled'               => __('Checking if Git is installed and accessible', 'git-manager'),
                    'gitDirectoryCheck'                  => __('Git Directory Check', 'git-manager'),
                    'verifyingGitDirectory'              => __('Verifying .git directory exists and is valid', 'git-manager'),
                    'safeDirectoryConfiguration'         => __('Safe Directory Configuration', 'git-manager'),
                    'checkingSafeDirectory'              => __('Checking and fixing Git safe.directory settings', 'git-manager'),
                    'filePermissions'                    => __('File Permissions', 'git-manager'),
                    'checkingPermissions'                => __('Checking repository file permissions and ownership', 'git-manager'),
                    'sshDirectorySetup'                  => __('SSH Directory Setup', 'git-manager'),
                    'verifyingSSHDirectory'              => __('Verifying SSH directory exists and has correct permissions', 'git-manager'),
                    'sshKeyDetection'                    => __('SSH Key Detection', 'git-manager'),
                    'checkingSSHKeys'                    => __('Checking for SSH private keys and their permissions', 'git-manager'),
                    'hostKeyVerification'                => __('Host Key Verification', 'git-manager'),
                    'checkingHostKeys'                   => __('Checking known_hosts for GitHub/GitLab host keys', 'git-manager'),
                    'gitConfiguration'                   => __('Git Configuration', 'git-manager'),
                    'verifyingGitConfig'                 => __('Verifying Git user configuration', 'git-manager'),
                    'remoteConnectionTest'               => __('Remote Connection Test', 'git-manager'),
                    'testingRemoteConnection'            => __('Testing connection to remote repository', 'git-manager'),
                    'failedToCheckPath'                  => __('Failed to check repository path', 'git-manager'),
                    'verifyPathInSettings'               => __('Please verify the repository path in settings', 'git-manager'),
                    'failedToCheckGit'                   => __('Failed to check Git binary', 'git-manager'),
                    'ensureGitInstalled'                 => __('Please ensure Git is installed on the server', 'git-manager'),
                    'failedToCheckDirectory'             => __('Failed to check Git directory', 'git-manager'),
                    'ensureValidRepository'              => __('Please ensure this is a valid Git repository', 'git-manager'),
                    'failedToCheckSafeDirectory'         => __('Failed to check safe directory', 'git-manager'),
                    'checkGitConfigManually'             => __('Please check Git configuration manually', 'git-manager'),
                    'failedToCheckPermissions'           => __('Failed to check permissions', 'git-manager'),
                    'checkPermissionsManually'           => __('Please check file permissions manually', 'git-manager'),
                    'failedToCheckSSH'                   => __('Failed to check SSH directory', 'git-manager'),
                    'checkSSHManually'                   => __('Please check SSH directory manually', 'git-manager'),
                    'sshKeyImportedSuccessfully'         => __('SSH key imported successfully', 'git-manager'),
                    'themeChanged'                       => __('Theme changed', 'git-manager'),
                    'unknown'                            => __('Unknown', 'git-manager'),
                    'repository'                         => __('Repository', 'git-manager'),
                    'currentPath'                        => __('Current path', 'git-manager'),
                    'addRepository'                      => __('Add Repository', 'git-manager'),
                    'cancel'                             => __('Cancel', 'git-manager'),
                    'browse'                             => __('Browse', 'git-manager'),
                    'import'                             => __('Import', 'git-manager'),
                    'clear'                              => __('Clear', 'git-manager'),
                    'saveSettings'                       => __('Save Settings', 'git-manager'),
                    'loading'                            => __('Loading...', 'git-manager'),
                    'loadingRepositories'                => __('Loading repositories...', 'git-manager'),
                    'loadingCommits'                     => __('Loading commits...', 'git-manager'),
                    'loadingBranches'                    => __('Loading branches...', 'git-manager'),
                    'searchBranches'                     => __('Search branches...', 'git-manager'),
                    'overview'                           => __('Overview', 'git-manager'),
                    'recentCommits'                      => __('Recent Commits', 'git-manager'),
                    'branches'                           => __('Branches', 'git-manager'),
                    'troubleshooting'                    => __('Troubleshooting', 'git-manager'),
                    'settings'                           => __('Settings', 'git-manager'),
                    'branchInformation'                  => __('Branch Information', 'git-manager'),
                    'recentChanges'                      => __('Recent Changes', 'git-manager'),
                    'recommendations'                    => __('Recommendations', 'git-manager'),
                    'loadingRepositoryStatus'            => __('Loading repository status...', 'git-manager'),
                    'loadingBranchInformation'           => __('Loading branch information...', 'git-manager'),
                    'loadingChanges'                     => __('Loading changes...', 'git-manager'),
                    'loadingCommitInformation'           => __('Loading commit information...', 'git-manager'),
                    'basicInformation'                   => __('Basic Information', 'git-manager'),
                    'actions'                            => __('Actions', 'git-manager'),
                    'repositoryName'                     => __('Repository Name', 'git-manager'),
                    'repositoryPath'                     => __('Repository Path', 'git-manager'),
                    'displayNameForRepository'           => __('The display name for this repository', 'git-manager'),
                    'localPathToRepository'              => __('The local path to this repository', 'git-manager'),
                    'remoteRepositoryURL'                => __('The remote repository URL (optional)', 'git-manager'),
                    'repositoryNamePlaceholder'          => __('Repository name', 'git-manager'),
                    'repositoryPathPlaceholder'          => __('Repository path', 'git-manager'),
                    'remoteURLPlaceholder'               => __('https://github.com/user/repo.git', 'git-manager'),
                    'pullChanges'                        => __('Pull changes', 'git-manager'),
                    'pushChanges'                        => __('Push changes', 'git-manager'),
                    'fetchUpdates'                       => __('Fetch updates', 'git-manager'),
                    'checkStatus'                        => __('Check status', 'git-manager'),
                    'professionalTroubleshooting'        => __('Professional troubleshooting', 'git-manager'),
                    'pull'                               => __('Pull', 'git-manager'),
                    'push'                               => __('Push', 'git-manager'),
                    'fetch'                              => __('Fetch', 'git-manager'),
                    'status'                             => __('Status', 'git-manager'),
                    'troubleshoot'                       => __('Troubleshoot', 'git-manager'),
                    'currentBranch'                      => __('Current Branch', 'git-manager'),
                    'lastCommit'                         => __('Last Commit', 'git-manager'),
                    'remoteURL'                          => __('Remote URL', 'git-manager'),
                    'backToWelcome'                      => __('Back to Welcome', 'git-manager'),
                    'addNewRepository'                   => __('Add New Repository', 'git-manager'),
                    'repositoryInformation'              => __('Repository Information', 'git-manager'),
                    'repositoryURL'                      => __('Repository URL', 'git-manager'),
                    'localPath'                          => __('Local Path', 'git-manager'),
                    'branchOptional'                     => __('Branch (Optional)', 'git-manager'),
                    'enterGitRepositoryURL'              => __('Enter the Git repository URL (HTTPS or SSH) - fields will auto-populate', 'git-manager'),
                    'selectParentDirectory'              => __('Select the parent directory where the repository will be cloned', 'git-manager'),
                    'specifyBranchToCheckout'            => __('Specify a branch to checkout (defaults to main/master)', 'git-manager'),
                    'authentication'                     => __('Authentication', 'git-manager'),
                    'thisIsPrivateRepository'            => __('This is a private repository', 'git-manager'),
                    'enableIfRepositoryRequiresAuth'     => __('Enable if the repository requires authentication', 'git-manager'),
                    'authenticationMethod'               => __('Authentication Method', 'git-manager'),
                    'sshKey'                             => __('SSH Key', 'git-manager'),
                    'useSSHPrivateKey'                   => __('Use SSH private key for authentication', 'git-manager'),
                    'httpsToken'                         => __('HTTPS Token', 'git-manager'),
                    'useUsernameAndToken'                => __('Use username and personal access token', 'git-manager'),
                    'sshPrivateKey'                      => __('SSH Private Key', 'git-manager'),
                    'importSSHKeyFromFile'               => __('Import SSH key from file', 'git-manager'),
                    'clearSSHKey'                        => __('Clear SSH key', 'git-manager'),
                    'howToGenerateSSHKey'                => __('How to generate SSH key', 'git-manager'),
                    'importFromFile'                     => __('Import from file', 'git-manager'),
                    'username'                           => __('Username', 'git-manager'),
                    'personalAccessToken'                => __('Personal Access Token', 'git-manager'),
                    'yourGitHostingUsername'             => __('Your Git hosting service username', 'git-manager'),
                    'howToCreateAccessToken'             => __('How to create access token', 'git-manager'),
                    'repositoryType'                     => __('Repository Type', 'git-manager'),
                    'thisIsExistingRepository'           => __('This is an existing Git repository', 'git-manager'),
                    'enableIfDirectoryContainsGit'       => __('Enable if the directory already contains a Git repository', 'git-manager'),
                    'welcomeToGitManager'                => __('Welcome to Git Manager', 'git-manager'),
                    'manageMultipleRepositories'         => __('Manage multiple Git repositories with a professional interface inspired by GitHub Desktop and GitLab.', 'git-manager'),
                    'addYourFirstRepository'             => __('Add Your First Repository', 'git-manager'),
                    'buyMeACoffee'                       => __('Buy me a coffee', 'git-manager'),
                    'repositories'                       => __('Repositories', 'git-manager'),
                    'professionalTroubleshootingTool'    => __('Professional Git troubleshooting tool that will diagnose and fix common issues with your Git setup.', 'git-manager'),
                    'runTroubleshooting'                 => __('Run Troubleshooting', 'git-manager'),
                    'troubleshootingResults'             => __('Troubleshooting Results', 'git-manager'),
                    'copyResults'                        => __('Copy Results', 'git-manager'),
                    'sshKeyCleared'                      => __('SSH key cleared', 'git-manager'),
                    'sshKeyInputNotFound'                => __('SSH key input field not found', 'git-manager'),
                    'repositoryURLRequired'              => __('Repository URL is required', 'git-manager'),
                    'localPathRequired'                  => __('Local path is required', 'git-manager'),
                    'failedToLoadRepositories'           => __('Failed to load repositories', 'git-manager'),
                    'noRepositorySelected'               => __('No repository selected', 'git-manager'),
                    'requestingPermissionFix'            => __('Requesting permission fix...', 'git-manager'),
                    'pullingChanges'                     => __('Pulling changes...', 'git-manager'),
                    'pushingChanges'                     => __('Pushing changes...', 'git-manager'),
                    'changesPushedSuccessfully'          => __('Changes pushed successfully', 'git-manager'),
                    'fetchingUpdates'                    => __('Fetching updates...', 'git-manager'),
                    'checkingStatus'                     => __('Checking status...', 'git-manager'),
                    'statusCheckedSuccessfully'          => __('Status checked successfully', 'git-manager'),
                    'deletingRepository'                 => __('Deleting repository...', 'git-manager'),
                    'reCloningRepository'                => __('Re-cloning repository...', 'git-manager'),
                    'repositorySettingsLoaded'           => __('Repository settings loaded', 'git-manager'),
                    'errorLoadingRepositorySettings'     => __('Error loading repository settings', 'git-manager'),
                    'settingsFormNotFound'               => __('Settings form not found', 'git-manager'),
                    'repositoryNameRequired'             => __('Repository name is required', 'git-manager'),
                    'repositoryPathRequired'             => __('Repository path is required', 'git-manager'),
                    'invalidRepositoryPath'              => __('Invalid repository path', 'git-manager'),
                    'errorRefreshingRepositoryList'      => __('Error refreshing repository list', 'git-manager'),
                    'pleaseSelectActionType'             => __('Please select an action type', 'git-manager'),
                    'failedToReadSSHKeyFile'             => __('Failed to read SSH key file', 'git-manager'),
                    'runningProfessionalTroubleshooting' => __('Running professional troubleshooting...', 'git-manager'),
                    'troubleshootingFailed'              => __('Troubleshooting failed', 'git-manager'),
                    'troubleshootingError'               => __('Troubleshooting error', 'git-manager'),
                    'professionalTroubleshootingResults' => __('Professional Troubleshooting Results', 'git-manager'),
                    'close'                              => __('Close', 'git-manager'),
                    'fixPermissions'                     => __('Fix Permissions', 'git-manager'),
                    'fixingRepositoryPermissions'        => __('Fixing repository permissions...', 'git-manager'),
                    'permissionsFixedSuccessfully'       => __('Permissions fixed successfully!', 'git-manager'),
                    'permissionFixFailed'                => __('Permission fix failed', 'git-manager'),
                    'permissionFixError'                 => __('Permission fix error', 'git-manager'),
                    'processing'                         => __('Processing...', 'git-manager'),
                    'pullingRepository'                  => __('Pulling repository...', 'git-manager'),
                    'pushingRepository'                  => __('Pushing repository...', 'git-manager'),
                    'fetchingRepository'                 => __('Fetching repository...', 'git-manager'),
                    'personalAccessTokenGuide'           => __('Personal Access Token Guide', 'git-manager'),
                    'github'                             => __('GitHub', 'git-manager'),
                    'gitlab'                             => __('GitLab', 'git-manager'),
                    'bitbucket'                          => __('Bitbucket', 'git-manager'),
                    'unknownError'                       => __('Unknown error', 'git-manager'),
                    'unableToParseGitURL'                => __('Unable to parse Git URL. Please check the format and try again.', 'git-manager'),
                    'uncommittedChanges'                 => __('Uncommitted Changes', 'git-manager'),
                    'youHaveUncommittedChanges'          => __('You have uncommitted changes. Consider committing them to keep your repository clean.', 'git-manager'),
                    'behindRemote'                       => __('Behind Remote', 'git-manager'),
                    'yourLocalBranchIsBehind'            => __('Your local branch is {count} commit(s) behind the remote. Consider pulling the latest changes.', 'git-manager'),
                    'aheadOfRemote'                      => __('Ahead of Remote', 'git-manager'),
                    'yourLocalBranchIsAhead'             => __('Your local branch is {count} commit(s) ahead of the remote. Consider pushing your changes.', 'git-manager'),
                    'repositoryStatus'                   => __('Repository Status', 'git-manager'),
                    'yourRepositoryIsClean'              => __('Your repository is clean and up to date with the remote.', 'git-manager'),
                    'repositoryIsBehindRemote'           => __('Repository is behind remote by {count} commit(s).', 'git-manager'),
                    'repositoryIsAheadOfRemote'          => __('Repository is ahead of remote by {count} commit(s).', 'git-manager'),
                    'addRepositoryTooltip'               => __('Add Repository (Ctrl+N)', 'git-manager'),
                    'toggleThemeTooltip'                 => __('Toggle Theme (Ctrl+T)', 'git-manager'),
                ],
            ]);
            wp_localize_script('git-manager-global', 'gitManagerNonce', ['nonce' => wp_create_nonce('git_manager_action')]);
            if (function_exists('wp_set_script_translations')) {
                wp_set_script_translations('git-manager-global', 'git-manager', GIT_MANAGER_PATH . 'languages');
            }

            wp_localize_script('git-manager-global', 'gitManagerLanguage', [
                'locale'           => get_locale(),
                'textdomain'       => 'git-manager',
                'textdomainLoaded' => is_textdomain_loaded('git-manager'),
                'rtl'              => is_rtl(),
                'languageFiles'    => glob(GIT_MANAGER_PATH . 'languages/git-manager-*.mo'),
            ]);
        }

        if ('toplevel_page_git-manager' !== $hook && 'git-manager_page_git-manager-troubleshooting' !== $hook && 'git-manager_page_git-manager-settings' !== $hook) {
            return;
        }

        wp_enqueue_style('git-manager-troubleshoot-enhanced', GIT_MANAGER_URL . 'src/Assets/css/troubleshoot.css', [], GIT_MANAGER_VERSION);
        wp_enqueue_script('git-manager-troubleshoot-enhanced', GIT_MANAGER_URL . 'src/Assets/js/troubleshoot.js', ['jquery', 'git-manager-admin-modern'], GIT_MANAGER_VERSION, true);

        wp_localize_script('git-manager-troubleshoot-enhanced', 'WPGitManagerTroubleshoot', [
            'ajaxurl'       => admin_url('admin-ajax.php'),
            'action_nonces' => [
                'git_manager_latest_commit'     => wp_create_nonce('git_manager_action'),
                'git_manager_fetch'             => wp_create_nonce('git_manager_action'),
                'git_manager_pull'              => wp_create_nonce('git_manager_action'),
                'git_manager_get_branches'      => wp_create_nonce('git_manager_action'),
                'git_manager_status'            => wp_create_nonce('git_manager_action'),
                'git_manager_troubleshoot_step' => wp_create_nonce('git_manager_action'),
                'git_manager_get_repos'         => wp_create_nonce('git_manager_action'),
                'git_manager_get_repo_details'  => wp_create_nonce('git_manager_action'),
                'git_manager_clone_repo'        => wp_create_nonce('git_manager_action'),
                'git_manager_add_existing_repo' => wp_create_nonce('git_manager_action'),
                'git_manager_delete_repo'       => wp_create_nonce('git_manager_action'),
            ],
            'translations' => [
                'startTroubleshooting'       => __('Start Troubleshooting', 'git-manager'),
                'stop'                       => __('Stop', 'git-manager'),
                'reset'                      => __('Reset', 'git-manager'),
                'gitManagerTroubleshooting'  => __('Git Manager Troubleshooting', 'git-manager'),
                'readyToStart'               => __('Ready to start', 'git-manager'),
                'troubleshootingCompleted'   => __('Troubleshooting completed', 'git-manager'),
                'repositoryPathCheck'        => __('Repository Path Check', 'git-manager'),
                'verifyingRepositoryPath'    => __('Verifying repository path exists and is accessible', 'git-manager'),
                'gitBinaryCheck'             => __('Git Binary Check', 'git-manager'),
                'checkingGitInstalled'       => __('Checking if Git is installed and accessible', 'git-manager'),
                'gitDirectoryCheck'          => __('Git Directory Check', 'git-manager'),
                'verifyingGitDirectory'      => __('Verifying .git directory exists and is valid', 'git-manager'),
                'safeDirectoryConfiguration' => __('Safe Directory Configuration', 'git-manager'),
                'checkingSafeDirectory'      => __('Checking and fixing Git safe.directory settings', 'git-manager'),
                'filePermissions'            => __('File Permissions', 'git-manager'),
                'checkingPermissions'        => __('Checking repository file permissions and ownership', 'git-manager'),
                'sshDirectorySetup'          => __('SSH Directory Setup', 'git-manager'),
                'verifyingSSHDirectory'      => __('Verifying SSH directory exists and has correct permissions', 'git-manager'),
                'sshKeyDetection'            => __('SSH Key Detection', 'git-manager'),
                'checkingSSHKeys'            => __('Checking for SSH private keys and their permissions', 'git-manager'),
                'hostKeyVerification'        => __('Host Key Verification', 'git-manager'),
                'checkingHostKeys'           => __('Checking known_hosts for GitHub/GitLab host keys', 'git-manager'),
                'gitConfiguration'           => __('Git Configuration', 'git-manager'),
                'verifyingGitConfig'         => __('Verifying Git user configuration', 'git-manager'),
                'remoteConnectionTest'       => __('Remote Connection Test', 'git-manager'),
                'testingRemoteConnection'    => __('Testing connection to remote repository', 'git-manager'),
                'failedToCheckPath'          => __('Failed to check repository path', 'git-manager'),
                'verifyPathInSettings'       => __('Please verify the repository path in settings', 'git-manager'),
                'failedToCheckGit'           => __('Failed to check Git binary', 'git-manager'),
                'ensureGitInstalled'         => __('Please ensure Git is installed on the server', 'git-manager'),
                'failedToCheckDirectory'     => __('Failed to check Git directory', 'git-manager'),
                'ensureValidRepository'      => __('Please ensure this is a valid Git repository', 'git-manager'),
                'failedToCheckSafeDirectory' => __('Failed to check safe directory', 'git-manager'),
                'checkGitConfigManually'     => __('Please check Git configuration manually', 'git-manager'),
                'failedToCheckPermissions'   => __('Failed to check permissions', 'git-manager'),
                'checkPermissionsManually'   => __('Please check file permissions manually', 'git-manager'),
                'failedToCheckSSH'           => __('Failed to check SSH directory', 'git-manager'),
                'checkSSHManually'           => __('Please check SSH directory manually', 'git-manager'),
                'sshKeyImportedSuccessfully' => __('SSH key imported successfully', 'git-manager'),
                'themeChanged'               => __('Theme changed', 'git-manager'),
                'unknown'                    => __('Unknown', 'git-manager'),
                'repository'                 => __('Repository', 'git-manager'),
                'currentPath'                => __('Current path', 'git-manager'),
            ],
        ]);

        // Add fallback to ensure WPGitManagerGlobal is available globally
        wp_add_inline_script('git-manager-admin-modern', '
            if (typeof WPGitManagerGlobal === "undefined") {
                window.WPGitManagerGlobal = {
                    beepUrl: "' . GIT_MANAGER_URL . 'src/Assets/audio/beep.mp3",
                    ajaxurl: "' . admin_url('admin-ajax.php') . '",
                    action_nonces: {},
                    translations: {}
                };
            }
        ');

        wp_enqueue_style('git-manager-admin-modern', GIT_MANAGER_URL . 'src/Assets/css/admin.css', [], GIT_MANAGER_VERSION);

        // Only enqueue RTL assets if WordPress settings indicate RTL environment
        if (RTLSupport::isRTL()) {
            wp_enqueue_style('git-manager-rtl-support', GIT_MANAGER_URL . 'src/Assets/css/rtl-support.css', ['git-manager-admin-modern'], GIT_MANAGER_VERSION);
            wp_enqueue_style('git-manager-rtl-components', GIT_MANAGER_URL . 'src/Assets/css/rtl-components.css', ['git-manager-rtl-support'], GIT_MANAGER_VERSION);
            wp_enqueue_script('git-manager-rtl-support', GIT_MANAGER_URL . 'src/Assets/js/rtl-support.js', ['jquery'], GIT_MANAGER_VERSION, true);
        }

        wp_localize_script('git-manager-admin-modern', 'gitManagerAjax', [
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('git_manager_action'),
            'actions' => [
                'repo_list'          => 'git_manager_repo_list',
                'repo_clone'         => 'git_manager_repo_clone',
                'repo_delete'        => 'git_manager_repo_delete',
                'repo_reclone'       => 'git_manager_repo_reclone',
                'repo_dirs'          => 'git_manager_repo_dirs',
                'dir_create'         => 'git_manager_dir_create',
                'dir_delete'         => 'git_manager_dir_delete',
                'dir_rename'         => 'git_manager_dir_rename',
                'get_repo_details'   => 'git_manager_get_repo_details',
                'repo_git'           => 'git_manager_repo_git',
                'repo_push'          => 'git_manager_repo_push',
                'log'                => 'git_manager_log',
                'get_branches'       => 'git_manager_get_branches',
                'repo_troubleshoot'  => 'git_manager_repo_troubleshoot',
                'fix_permission'     => 'git_manager_fix_permission',
                'repo_status'        => 'git_manager_repo_status',
                'status'             => 'git_manager_repo_status',
                'troubleshoot_step'  => 'git_manager_troubleshoot_step',
                'checkout_branch'    => 'git_manager_repo_checkout',
                'repo_add'           => 'git_manager_repo_add',
                'add_repository'     => 'git_manager_add_repository',
                'repo_update'        => 'git_manager_repo_update',
                'repo_credentials'   => 'git_manager_repo_credentials',
                'repo_merge'         => 'git_manager_repo_merge',
                'repo_tag'           => 'git_manager_repo_tag',
                'detailed_log'       => 'git_manager_detailed_log',
                'repo_set_active'    => 'git_manager_repo_set_active',
                'repo_add_existing'  => 'git_manager_repo_add_existing',
                'repo_create_branch' => 'git_manager_repo_create_branch',
                'repo_delete_branch' => 'git_manager_repo_delete_branch',
                'repo_stash'         => 'git_manager_repo_stash',
                'repo_stash_pop'     => 'git_manager_repo_stash_pop',
                'branch'             => 'git_manager_branch',
                'check_git_changes'  => 'git_manager_check_git_changes',
                'fix_ssh'            => 'git_manager_fix_ssh',
                'save_roles'         => 'git_manager_save_roles',
                'safe_directory'     => 'git_manager_safe_directory',
                'troubleshoot'       => 'git_manager_troubleshoot',
                'latest_commit'      => 'git_manager_latest_commit',
                'fetch'              => 'git_manager_fetch',
                'pull'               => 'git_manager_pull',
                'checkout'           => 'git_manager_checkout',
                'get_repos'          => 'git_manager_get_repos',
                'clone_repo'         => 'git_manager_clone_repo',
                'add_existing_repo'  => 'git_manager_add_existing_repo',
                'delete_repo'        => 'git_manager_delete_repo',
            ],
        ]);
    }

    public function admin_page()
    {
        $allowed    = get_option('git_manager_allowed_roles', ['administrator']);
        $user       = wp_get_current_user();
        $has_access = false;
        foreach ($user->roles as $role) {
            if (in_array($role, $allowed)) {
                $has_access = true;
                break;
            }
        }

        if (! $has_access) {
            echo '<div class="notice notice-error"><b>' . esc_html__("You don't have access to this section.", 'git-manager') . '</b></div>';

            return;
        }

        $dashboard = new Dashboard();
        $dashboard->render();
    }
}
