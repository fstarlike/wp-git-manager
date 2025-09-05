<?php

namespace WPGitManager\Admin;

use WPGitManager\Infrastructure\RTLSupport;
use WPGitManager\View\Admin\Dashboard;
use WPGitManager\View\Components\Settings;

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Main class for Repo Manager Plugin (PSR-4 namespaced).
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
            __('Repo Manager', 'repo-manager'),
            __('Repo Manager', 'repo-manager'),
            'manage_options',
            'repo-manager',
            [$this, 'admin_page'],
            'dashicons-admin-generic',
            56
        );
        add_submenu_page(
            'repo-manager',
            __('Repo Manager Settings', 'repo-manager'),
            __('Settings', 'repo-manager'),
            'manage_options',
            'repo-manager-settings',
            [$this, 'settings_page']
        );
    }

    public function register_settings()
    {
        register_setting('git_manager_options', 'git_manager_allow_auto_fix', ['type' => 'boolean', 'sanitize_callback' => 'absint']);
        register_setting('git_manager_options', 'git_manager_allow_commands', ['type' => 'boolean', 'sanitize_callback' => 'absint']);
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
     * Check if executing system commands (git) is enabled
     */
    public static function are_commands_enabled(): bool
    {
        return (bool) get_option('git_manager_allow_commands', 0);
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
            wp_die(esc_html__('Access denied.', 'repo-manager'));
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
            // Enqueue the admin script first so we can localize it
            $admin_modern_deps = ['jquery'];
            if (RTLSupport::isRTL()) {
                $admin_modern_deps[] = 'repo-manager-rtl-support';
            }

            wp_enqueue_script('repo-manager-admin', GIT_MANAGER_URL . 'src/Assets/js/admin.js', $admin_modern_deps, GIT_MANAGER_VERSION, true);

            // Localize WPGitManagerGlobal to the admin script with full translations
            wp_localize_script('repo-manager-admin', 'WPGitManagerGlobal', [
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
                    'startTroubleshooting'               => __('Start Troubleshooting', 'repo-manager'),
                    'stop'                               => __('Stop', 'repo-manager'),
                    'reset'                              => __('Reset', 'repo-manager'),
                    'gitManagerTroubleshooting'          => __('Repo Manager Troubleshooting', 'repo-manager'),
                    'readyToStart'                       => __('Ready to start', 'repo-manager'),
                    'troubleshootingCompleted'           => __('Troubleshooting completed', 'repo-manager'),
                    'repositoryPathCheck'                => __('Repository Path Check', 'repo-manager'),
                    'verifyingRepositoryPath'            => __('Verifying repository path exists and is accessible', 'repo-manager'),
                    'gitBinaryCheck'                     => __('Git Binary Check', 'repo-manager'),
                    'checkingGitInstalled'               => __('Checking if Git is installed and accessible', 'repo-manager'),
                    'gitDirectoryCheck'                  => __('Git Directory Check', 'repo-manager'),
                    'verifyingGitDirectory'              => __('Verifying .git directory exists and is valid', 'repo-manager'),
                    'safeDirectoryConfiguration'         => __('Safe Directory Configuration', 'repo-manager'),
                    'checkingSafeDirectory'              => __('Checking and fixing Git safe.directory settings', 'repo-manager'),
                    'filePermissions'                    => __('File Permissions', 'repo-manager'),
                    'checkingPermissions'                => __('Checking repository file permissions and ownership', 'repo-manager'),
                    'sshDirectorySetup'                  => __('SSH Directory Setup', 'repo-manager'),
                    'verifyingSSHDirectory'              => __('Verifying SSH directory exists and has correct permissions', 'repo-manager'),
                    'sshKeyDetection'                    => __('SSH Key Detection', 'repo-manager'),
                    'checkingSSHKeys'                    => __('Checking for SSH private keys and their permissions', 'repo-manager'),
                    'hostKeyVerification'                => __('Host Key Verification', 'repo-manager'),
                    'checkingHostKeys'                   => __('Checking known_hosts for GitHub/GitLab host keys', 'repo-manager'),
                    'gitConfiguration'                   => __('Git Configuration', 'repo-manager'),
                    'verifyingGitConfig'                 => __('Verifying Git user configuration', 'repo-manager'),
                    'remoteConnectionTest'               => __('Remote Connection Test', 'repo-manager'),
                    'testingRemoteConnection'            => __('Testing connection to remote repository', 'repo-manager'),
                    'failedToCheckPath'                  => __('Failed to check repository path', 'repo-manager'),
                    'verifyPathInSettings'               => __('Please verify the repository path in settings', 'repo-manager'),
                    'failedToCheckGit'                   => __('Failed to check Git binary', 'repo-manager'),
                    'ensureGitInstalled'                 => __('Please ensure Git is installed on the server', 'repo-manager'),
                    'failedToCheckDirectory'             => __('Failed to check Git directory', 'repo-manager'),
                    'ensureValidRepository'              => __('Please ensure this is a valid Git repository', 'repo-manager'),
                    'failedToCheckSafeDirectory'         => __('Failed to check safe directory', 'repo-manager'),
                    'checkGitConfigManually'             => __('Please check Git configuration manually', 'repo-manager'),
                    'failedToCheckPermissions'           => __('Failed to check permissions', 'repo-manager'),
                    'checkPermissionsManually'           => __('Please check file permissions manually', 'repo-manager'),
                    'failedToCheckSSH'                   => __('Failed to check SSH directory', 'repo-manager'),
                    'checkSSHManually'                   => __('Please check SSH directory manually', 'repo-manager'),
                    'sshKeyImportedSuccessfully'         => __('SSH key imported successfully', 'repo-manager'),
                    'themeChanged'                       => __('Theme changed', 'repo-manager'),
                    'unknown'                            => __('Unknown', 'repo-manager'),
                    'repository'                         => __('Repository', 'repo-manager'),
                    'currentPath'                        => __('Current path', 'repo-manager'),
                    'addRepository'                      => __('Add Repository', 'repo-manager'),
                    'cancel'                             => __('Cancel', 'repo-manager'),
                    'browse'                             => __('Browse', 'repo-manager'),
                    'import'                             => __('Import', 'repo-manager'),
                    'clear'                              => __('Clear', 'repo-manager'),
                    'saveSettings'                       => __('Save Settings', 'repo-manager'),
                    'loading'                            => __('Loading...', 'repo-manager'),
                    'loadingRepositories'                => __('Loading repositories...', 'repo-manager'),
                    'loadingCommits'                     => __('Loading commits...', 'repo-manager'),
                    'loadingBranches'                    => __('Loading branches...', 'repo-manager'),
                    'searchBranches'                     => __('Search branches...', 'repo-manager'),
                    'overview'                           => __('Overview', 'repo-manager'),
                    'recentCommits'                      => __('Recent Commits', 'repo-manager'),
                    'branches'                           => __('Branches', 'repo-manager'),
                    'troubleshooting'                    => __('Troubleshooting', 'repo-manager'),
                    'settings'                           => __('Settings', 'repo-manager'),
                    'branchInformation'                  => __('Branch Information', 'repo-manager'),
                    'recentChanges'                      => __('Recent Changes', 'repo-manager'),
                    'recommendations'                    => __('Recommendations', 'repo-manager'),
                    'loadingRepositoryStatus'            => __('Loading repository status...', 'repo-manager'),
                    'loadingBranchInformation'           => __('Loading branch information...', 'repo-manager'),
                    'loadingChanges'                     => __('Loading changes...', 'repo-manager'),
                    'loadingCommitInformation'           => __('Loading commit information...', 'repo-manager'),
                    'basicInformation'                   => __('Basic Information', 'repo-manager'),
                    'actions'                            => __('Actions', 'repo-manager'),
                    'repositoryName'                     => __('Repository Name', 'repo-manager'),
                    'repositoryPath'                     => __('Repository Path', 'repo-manager'),
                    'displayNameForRepository'           => __('The display name for this repository', 'repo-manager'),
                    'localPathToRepository'              => __('The local path to this repository', 'repo-manager'),
                    'remoteRepositoryURL'                => __('The remote repository URL (optional)', 'repo-manager'),
                    'repositoryNamePlaceholder'          => __('Repository name', 'repo-manager'),
                    'repositoryPathPlaceholder'          => __('Repository path', 'repo-manager'),
                    'remoteURLPlaceholder'               => __('https://github.com/user/repo.git', 'repo-manager'),
                    'pullChanges'                        => __('Pull changes', 'repo-manager'),
                    'pushChanges'                        => __('Push changes', 'repo-manager'),
                    'fetchUpdates'                       => __('Fetch updates', 'repo-manager'),
                    'checkStatus'                        => __('Check status', 'repo-manager'),
                    'professionalTroubleshooting'        => __('Professional troubleshooting', 'repo-manager'),
                    'pull'                               => __('Pull', 'repo-manager'),
                    'push'                               => __('Push', 'repo-manager'),
                    'fetch'                              => __('Fetch', 'repo-manager'),
                    'status'                             => __('Status', 'repo-manager'),
                    'troubleshoot'                       => __('Troubleshoot', 'repo-manager'),
                    'currentBranch'                      => __('Current Branch', 'repo-manager'),
                    'lastCommit'                         => __('Last Commit', 'repo-manager'),
                    'remoteURL'                          => __('Remote URL', 'repo-manager'),
                    'backToWelcome'                      => __('Back to Welcome', 'repo-manager'),
                    'addNewRepository'                   => __('Add New Repository', 'repo-manager'),
                    'repositoryInformation'              => __('Repository Information', 'repo-manager'),
                    'repositoryURL'                      => __('Repository URL', 'repo-manager'),
                    'localPath'                          => __('Local Path', 'repo-manager'),
                    'branchOptional'                     => __('Branch (Optional)', 'repo-manager'),
                    'enterGitRepositoryURL'              => __('Enter the Git repository URL (HTTPS or SSH) - fields will auto-populate', 'repo-manager'),
                    'selectParentDirectory'              => __('Select the parent directory where the repository will be cloned', 'repo-manager'),
                    'specifyBranchToCheckout'            => __('Specify a branch to checkout (defaults to main/master)', 'repo-manager'),
                    'authentication'                     => __('Authentication', 'repo-manager'),
                    'thisIsPrivateRepository'            => __('This is a private repository', 'repo-manager'),
                    'enableIfRepositoryRequiresAuth'     => __('Enable if the repository requires authentication', 'repo-manager'),
                    'authenticationMethod'               => __('Authentication Method', 'repo-manager'),
                    'sshKey'                             => __('SSH Key', 'repo-manager'),
                    'useSSHPrivateKey'                   => __('Use SSH private key for authentication', 'repo-manager'),
                    'httpsToken'                         => __('HTTPS Token', 'repo-manager'),
                    'useUsernameAndToken'                => __('Use username and personal access token', 'repo-manager'),
                    'sshPrivateKey'                      => __('SSH Private Key', 'repo-manager'),
                    'importSSHKeyFromFile'               => __('Import SSH key from file', 'repo-manager'),
                    'clearSSHKey'                        => __('Clear SSH key', 'repo-manager'),
                    'howToGenerateSSHKey'                => __('How to generate SSH key', 'repo-manager'),
                    'importFromFile'                     => __('Import from file', 'repo-manager'),
                    'username'                           => __('Username', 'repo-manager'),
                    'personalAccessToken'                => __('Personal Access Token', 'repo-manager'),
                    'yourGitHostingUsername'             => __('Your Git hosting service username', 'repo-manager'),
                    'howToCreateAccessToken'             => __('How to create access token', 'repo-manager'),
                    'repositoryType'                     => __('Repository Type', 'repo-manager'),
                    'thisIsExistingRepository'           => __('This is an existing Git repository', 'repo-manager'),
                    'enableIfDirectoryContainsGit'       => __('Enable if the directory already contains a Git repository', 'repo-manager'),
                    'welcomeToGitManager'                => __('Welcome to Git Manager', 'repo-manager'),
                    'manageMultipleRepositories'         => __('Manage multiple Git repositories with a professional interface inspired by GitHub Desktop and GitLab.', 'repo-manager'),
                    'addYourFirstRepository'             => __('Add Your First Repository', 'repo-manager'),
                    'buyMeACoffee'                       => __('Buy me a coffee', 'repo-manager'),
                    'repositories'                       => __('Repositories', 'repo-manager'),
                    'professionalTroubleshootingTool'    => __('Professional Git troubleshooting tool that will diagnose and fix common issues with your Git setup.', 'repo-manager'),
                    'runTroubleshooting'                 => __('Run Troubleshooting', 'repo-manager'),
                    'troubleshootingResults'             => __('Troubleshooting Results', 'repo-manager'),
                    'copyResults'                        => __('Copy Results', 'repo-manager'),
                    'sshKeyCleared'                      => __('SSH key cleared', 'repo-manager'),
                    'sshKeyInputNotFound'                => __('SSH key input field not found', 'repo-manager'),
                    'repositoryURLRequired'              => __('Repository URL is required', 'repo-manager'),
                    'localPathRequired'                  => __('Local path is required', 'repo-manager'),
                    'failedToLoadRepositories'           => __('Failed to load repositories', 'repo-manager'),
                    'noRepositorySelected'               => __('No repository selected', 'repo-manager'),
                    'requestingPermissionFix'            => __('Requesting permission fix...', 'repo-manager'),
                    'pullingChanges'                     => __('Pulling changes...', 'repo-manager'),
                    'pushingChanges'                     => __('Pushing changes...', 'repo-manager'),
                    'changesPushedSuccessfully'          => __('Changes pushed successfully', 'repo-manager'),
                    'fetchingUpdates'                    => __('Fetching updates...', 'repo-manager'),
                    'checkingStatus'                     => __('Checking status...', 'repo-manager'),
                    'statusCheckedSuccessfully'          => __('Status checked successfully', 'repo-manager'),
                    'deletingRepository'                 => __('Deleting repository...', 'repo-manager'),
                    'reCloningRepository'                => __('Re-cloning repository...', 'repo-manager'),
                    'repositorySettingsLoaded'           => __('Repository settings loaded', 'repo-manager'),
                    'errorLoadingRepositorySettings'     => __('Error loading repository settings', 'repo-manager'),
                    'settingsFormNotFound'               => __('Settings form not found', 'repo-manager'),
                    'repositoryNameRequired'             => __('Repository name is required', 'repo-manager'),
                    'repositoryPathRequired'             => __('Repository path is required', 'repo-manager'),
                    'invalidRepositoryPath'              => __('Invalid repository path', 'repo-manager'),
                    'errorRefreshingRepositoryList'      => __('Error refreshing repository list', 'repo-manager'),
                    'pleaseSelectActionType'             => __('Please select an action type', 'repo-manager'),
                    'failedToReadSSHKeyFile'             => __('Failed to read SSH key file', 'repo-manager'),
                    'runningProfessionalTroubleshooting' => __('Running professional troubleshooting...', 'repo-manager'),
                    'troubleshootingFailed'              => __('Troubleshooting failed', 'repo-manager'),
                    'troubleshootingError'               => __('Troubleshooting error', 'repo-manager'),
                    'professionalTroubleshootingResults' => __('Professional Troubleshooting Results', 'repo-manager'),
                    'close'                              => __('Close', 'repo-manager'),
                    'fixPermissions'                     => __('Fix Permissions', 'repo-manager'),
                    'fixingRepositoryPermissions'        => __('Fixing repository permissions...', 'repo-manager'),
                    'permissionsFixedSuccessfully'       => __('Permissions fixed successfully!', 'repo-manager'),
                    'permissionFixFailed'                => __('Permission fix failed', 'repo-manager'),
                    'permissionFixError'                 => __('Permission fix error', 'repo-manager'),
                    'processing'                         => __('Processing...', 'repo-manager'),
                    'pullingRepository'                  => __('Pulling repository...', 'repo-manager'),
                    'pushingRepository'                  => __('Pushing repository...', 'repo-manager'),
                    'fetchingRepository'                 => __('Fetching repository...', 'repo-manager'),
                    'personalAccessTokenGuide'           => __('Personal Access Token Guide', 'repo-manager'),
                    'github'                             => __('GitHub', 'repo-manager'),
                    'gitlab'                             => __('GitLab', 'repo-manager'),
                    'bitbucket'                          => __('Bitbucket', 'repo-manager'),
                    'unknownError'                       => __('Unknown error', 'repo-manager'),
                    'unableToParseGitURL'                => __('Unable to parse Git URL. Please check the format and try again.', 'repo-manager'),
                    'uncommittedChanges'                 => __('Uncommitted Changes', 'repo-manager'),
                    'youHaveUncommittedChanges'          => __('You have uncommitted changes. Consider committing them to keep your repository clean.', 'repo-manager'),
                    'behindRemote'                       => __('Behind Remote', 'repo-manager'),
                    'yourLocalBranchIsBehind'            => __('Your local branch is {count} commit(s) behind the remote. Consider pulling the latest changes.', 'repo-manager'),
                    'aheadOfRemote'                      => __('Ahead of Remote', 'repo-manager'),
                    'yourLocalBranchIsAhead'             => __('Your local branch is {count} commit(s) ahead of the remote. Consider pushing your changes.', 'repo-manager'),
                    'repositoryStatus'                   => __('Repository Status', 'repo-manager'),
                    'yourRepositoryIsClean'              => __('Your repository is clean and up to date with the remote.', 'repo-manager'),
                    'repositoryIsBehindRemote'           => __('Repository is behind remote by {count} commit(s).', 'repo-manager'),
                    'repositoryIsAheadOfRemote'          => __('Repository is ahead of remote by {count} commit(s).', 'repo-manager'),
                    'addRepositoryTooltip'               => __('Add Repository (Ctrl+N)', 'repo-manager'),
                    'toggleThemeTooltip'                 => __('Toggle Theme (Ctrl+T)', 'repo-manager'),
                ],
            ]);
            wp_localize_script('repo-manager-global', 'gitManagerNonce', ['nonce' => wp_create_nonce('git_manager_action')]);
            if (function_exists('wp_set_script_translations')) {
                wp_set_script_translations('repo-manager-global', 'repo-manager', GIT_MANAGER_PATH . 'languages');
            }

            wp_localize_script('repo-manager-global', 'gitManagerLanguage', [
                'locale'           => get_locale(),
                'textdomain'       => 'repo-manager',
                'textdomainLoaded' => is_textdomain_loaded('repo-manager'),
                'rtl'              => is_rtl(),
                'languageFiles'    => glob(GIT_MANAGER_PATH . 'languages/repo-manager-*.mo'),
            ]);
        }

        if ('toplevel_page_repo-manager' !== $hook && 'repo-manager_page_repo-manager-troubleshooting' !== $hook && 'repo-manager_page_repo-manager-settings' !== $hook) {
            return;
        }

        wp_enqueue_style('repo-manager-troubleshoot-enhanced', GIT_MANAGER_URL . 'src/Assets/css/troubleshoot.css', [], GIT_MANAGER_VERSION);
        wp_enqueue_script('repo-manager-troubleshoot-enhanced', GIT_MANAGER_URL . 'src/Assets/js/troubleshoot.js', ['jquery', 'repo-manager-admin'], GIT_MANAGER_VERSION, true);

        wp_localize_script('repo-manager-troubleshoot-enhanced', 'WPGitManagerTroubleshoot', [
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
                'startTroubleshooting'       => __('Start Troubleshooting', 'repo-manager'),
                'stop'                       => __('Stop', 'repo-manager'),
                'reset'                      => __('Reset', 'repo-manager'),
                'gitManagerTroubleshooting'  => __('Repo Manager Troubleshooting', 'repo-manager'),
                'readyToStart'               => __('Ready to start', 'repo-manager'),
                'troubleshootingCompleted'   => __('Troubleshooting completed', 'repo-manager'),
                'repositoryPathCheck'        => __('Repository Path Check', 'repo-manager'),
                'verifyingRepositoryPath'    => __('Verifying repository path exists and is accessible', 'repo-manager'),
                'gitBinaryCheck'             => __('Git Binary Check', 'repo-manager'),
                'checkingGitInstalled'       => __('Checking if Git is installed and accessible', 'repo-manager'),
                'gitDirectoryCheck'          => __('Git Directory Check', 'repo-manager'),
                'verifyingGitDirectory'      => __('Verifying .git directory exists and is valid', 'repo-manager'),
                'safeDirectoryConfiguration' => __('Safe Directory Configuration', 'repo-manager'),
                'checkingSafeDirectory'      => __('Checking and fixing Git safe.directory settings', 'repo-manager'),
                'filePermissions'            => __('File Permissions', 'repo-manager'),
                'checkingPermissions'        => __('Checking repository file permissions and ownership', 'repo-manager'),
                'sshDirectorySetup'          => __('SSH Directory Setup', 'repo-manager'),
                'verifyingSSHDirectory'      => __('Verifying SSH directory exists and has correct permissions', 'repo-manager'),
                'sshKeyDetection'            => __('SSH Key Detection', 'repo-manager'),
                'checkingSSHKeys'            => __('Checking for SSH private keys and their permissions', 'repo-manager'),
                'hostKeyVerification'        => __('Host Key Verification', 'repo-manager'),
                'checkingHostKeys'           => __('Checking known_hosts for GitHub/GitLab host keys', 'repo-manager'),
                'gitConfiguration'           => __('Git Configuration', 'repo-manager'),
                'verifyingGitConfig'         => __('Verifying Git user configuration', 'repo-manager'),
                'remoteConnectionTest'       => __('Remote Connection Test', 'repo-manager'),
                'testingRemoteConnection'    => __('Testing connection to remote repository', 'repo-manager'),
                'failedToCheckPath'          => __('Failed to check repository path', 'repo-manager'),
                'verifyPathInSettings'       => __('Please verify the repository path in settings', 'repo-manager'),
                'failedToCheckGit'           => __('Failed to check Git binary', 'repo-manager'),
                'ensureGitInstalled'         => __('Please ensure Git is installed on the server', 'repo-manager'),
                'failedToCheckDirectory'     => __('Failed to check Git directory', 'repo-manager'),
                'ensureValidRepository'      => __('Please ensure this is a valid Git repository', 'repo-manager'),
                'failedToCheckSafeDirectory' => __('Failed to check safe directory', 'repo-manager'),
                'checkGitConfigManually'     => __('Please check Git configuration manually', 'repo-manager'),
                'failedToCheckPermissions'   => __('Failed to check permissions', 'repo-manager'),
                'checkPermissionsManually'   => __('Please check file permissions manually', 'repo-manager'),
                'failedToCheckSSH'           => __('Failed to check SSH directory', 'repo-manager'),
                'checkSSHManually'           => __('Please check SSH directory manually', 'repo-manager'),
                'sshKeyImportedSuccessfully' => __('SSH key imported successfully', 'repo-manager'),
                'themeChanged'               => __('Theme changed', 'repo-manager'),
                'unknown'                    => __('Unknown', 'repo-manager'),
                'repository'                 => __('Repository', 'repo-manager'),
                'currentPath'                => __('Current path', 'repo-manager'),
            ],
        ]);

        // Add fallback to ensure WPGitManagerGlobal is available globally
        wp_add_inline_script('repo-manager-admin', '
            if (typeof WPGitManagerGlobal === "undefined") {
                window.WPGitManagerGlobal = {
                    beepUrl: "' . GIT_MANAGER_URL . 'src/Assets/audio/beep.mp3",
                    ajaxurl: "' . admin_url('admin-ajax.php') . '",
                    action_nonces: {},
                    translations: {}
                };
            }
        ');

        wp_enqueue_style('repo-manager-admin', GIT_MANAGER_URL . 'src/Assets/css/admin.css', [], GIT_MANAGER_VERSION);

        // Only enqueue RTL assets if WordPress settings indicate RTL environment
        if (RTLSupport::isRTL()) {
            wp_enqueue_style('repo-manager-rtl-support', GIT_MANAGER_URL . 'src/Assets/css/rtl-support.css', ['repo-manager-admin'], GIT_MANAGER_VERSION);
            wp_enqueue_style('repo-manager-rtl-components', GIT_MANAGER_URL . 'src/Assets/css/rtl-components.css', ['repo-manager-rtl-support'], GIT_MANAGER_VERSION);
            wp_enqueue_script('repo-manager-rtl-support', GIT_MANAGER_URL . 'src/Assets/js/rtl-support.js', ['jquery'], GIT_MANAGER_VERSION, true);
        }

        wp_localize_script('repo-manager-admin', 'gitManagerAjax', [
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
            echo '<div class="notice notice-error"><b>' . esc_html__("You don't have access to this section.", 'repo-manager') . '</b></div>';

            return;
        }

        $dashboard = new Dashboard();
        $dashboard->render();
    }
}
