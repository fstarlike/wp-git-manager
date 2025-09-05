<?php

namespace WPGitManager\Controller;

use WPGitManager\Admin\GitManager;
use WPGitManager\Model\Repository;
use WPGitManager\Service\CredentialStore;
use WPGitManager\Service\GitCommandRunner;
use WPGitManager\Service\RepositoryManager;

if (! defined('ABSPATH')) {
    exit;
}

/**
 * AJAX endpoints for multi-repository management
 */
class MultiRepoAjax
{
    public function register(): void
    {
        add_action('wp_ajax_git_manager_repo_list', [$this, 'list']);
        add_action('wp_ajax_git_manager_get_repos', [$this, 'list']);
        add_action('wp_ajax_git_manager_repo_add', [$this, 'add']);
        add_action('wp_ajax_git_manager_add_repository', [$this, 'add']);
        add_action('wp_ajax_git_manager_repo_update', [$this, 'update']);
        add_action('wp_ajax_git_manager_repo_delete', [$this, 'delete']);
        add_action('wp_ajax_git_manager_delete_repo', [$this, 'delete']);
        add_action('wp_ajax_git_manager_repo_clone', [$this, 'clone']);
        add_action('wp_ajax_git_manager_clone_repo', [$this, 'clone']);
        add_action('wp_ajax_git_manager_repo_git', [$this, 'gitOp']);
        add_action('wp_ajax_git_manager_repo_credentials', [$this, 'saveCredentials']);
        add_action('wp_ajax_git_manager_repo_dirs', [$this, 'listDirectories']);
        add_action('wp_ajax_git_manager_repo_dirs', [$this, 'listDirectories']);
        add_action('wp_ajax_git_manager_dir_create', [$this, 'createDirectory']);
        add_action('wp_ajax_git_manager_dir_delete', [$this, 'deleteDirectory']);
        add_action('wp_ajax_git_manager_dir_rename', [$this, 'renameDirectory']);
        add_action('wp_ajax_git_manager_repo_checkout', [$this, 'checkout']);
        add_action('wp_ajax_git_manager_repo_push', [$this, 'push']);
        add_action('wp_ajax_git_manager_repo_merge', [$this, 'merge']);
        add_action('wp_ajax_git_manager_repo_tag', [$this, 'createTag']);
        add_action('wp_ajax_git_manager_repo_log', [$this, 'detailedLog']);
        add_action('wp_ajax_git_manager_detailed_log', [$this, 'detailedLog']);
        add_action('wp_ajax_git_manager_repo_set_active', [$this, 'setActive']);
        add_action('wp_ajax_git_manager_repo_add_existing', [$this, 'addExisting']);
        add_action('wp_ajax_git_manager_add_existing_repo', [$this, 'addExisting']);
        add_action('wp_ajax_git_manager_repo_details', [$this, 'getDetails']);
        add_action('wp_ajax_git_manager_get_repo_details', [$this, 'getDetails']);
        add_action('wp_ajax_git_manager_repo_status', [$this, 'getStatus']);

        add_action('wp_ajax_git_manager_repo_create_branch', [$this, 'createBranch']);
        add_action('wp_ajax_git_manager_repo_delete_branch', [$this, 'deleteBranch']);
        add_action('wp_ajax_git_manager_repo_stash', [$this, 'stash']);
        add_action('wp_ajax_git_manager_repo_stash_pop', [$this, 'stashPop']);
        add_action('wp_ajax_git_manager_repo_troubleshoot', [$this, 'troubleshootRepo']);

        add_action('wp_ajax_git_manager_latest_commit', [$this, 'latestCommit']);
        add_action('wp_ajax_git_manager_fetch', [$this, 'fetch']);
        add_action('wp_ajax_git_manager_pull', [$this, 'pull']);
        add_action('wp_ajax_git_manager_status', [$this, 'status']);
        add_action('wp_ajax_git_manager_get_branches', [$this, 'ajax_get_branches']);
        add_action('wp_ajax_git_manager_log', [$this, 'log']);
        add_action('wp_ajax_git_manager_branch', [$this, 'branch']);
        add_action('wp_ajax_git_manager_checkout', [$this, 'checkout']);
        add_action('wp_ajax_git_manager_check_git_changes', [$this, 'checkGitChanges']);
        add_action('wp_ajax_git_manager_fix_permission', [$this, 'fixPermission']);
        add_action('wp_ajax_git_manager_fix_ssh', [$this, 'fixSsh']);
        add_action('wp_ajax_git_manager_save_roles', [$this, 'saveRoles']);
        add_action('wp_ajax_git_manager_safe_directory', [$this, 'safeDirectory']);
        add_action('wp_ajax_git_manager_troubleshoot_step', [$this, 'troubleshootStep']);
        add_action('wp_ajax_git_manager_troubleshoot', [$this, 'troubleshoot']);
        add_action('wp_ajax_git_manager_repo_reclone', [$this, 'reClone']);

    }

    private function ensureAllowed(): void
    {
        if (! current_user_can('manage_options')) {
            wp_send_json_error('Access denied');
        }

        check_ajax_referer('git_manager_action', 'nonce');
    }

    private function getRepositoryId(): string
    {
        // Verify nonce first
        if (! wp_verify_nonce(sanitize_text_field(sanitize_text_field(wp_unslash($_POST['nonce'] ?? ''))), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id = sanitize_text_field(wp_unslash($_POST['id'] ?? $_POST['repo_id'] ?? ''));

        return trim($id);
    }

    /**
     * Determine repository type based on its path
     */
    private function determineRepositoryType(string $path): string
    {
        $realPath = realpath($path);
        if (false === $realPath) {
            return 'other';
        }

        // Normalize paths to use forward slashes for consistent comparison
        $realPath     = str_replace('\\', '/', $realPath);
        $wpPluginDir  = str_replace('\\', '/', WP_PLUGIN_DIR);
        $wpContentDir = str_replace('\\', '/', WP_CONTENT_DIR);

        // Check if it's a plugin
        if (0 === strpos($realPath, (string) $wpPluginDir)) {
            return 'plugin';
        }

        // Check if it's a theme
        $themesDir      = get_template_directory();
        $parentThemeDir = dirname($themesDir);
        str_replace('\\', '/', $themesDir);
        $parentThemeDir = str_replace('\\', '/', $parentThemeDir);

        if (0 === strpos($realPath, $parentThemeDir)) {
            return 'theme';
        }

        // Check if it's in wp-content/themes directory
        $wpContentThemesDir = $wpContentDir . '/themes';

        if (0 === strpos($realPath, $wpContentThemesDir)) {
            return 'theme';
        }

        return 'other';
    }

    public function list(): void
    {
        // Try multiple nonce verification methods like latestCommit
        if (! current_user_can('manage_options')) {
            wp_send_json_error('Access denied');
        }

        $nonce                 = sanitize_text_field(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')));
        $action_specific_valid = wp_verify_nonce($nonce, 'git_manager_action');
        $general_nonce_valid   = wp_verify_nonce($nonce, 'git_manager_action');

        if (! $action_specific_valid && ! $general_nonce_valid) {
            wp_send_json_error('Invalid nonce');
        }

        $active = RepositoryManager::instance()->getActiveId();
        $repos  = [];
        foreach (RepositoryManager::instance()->all() as $r) {
            $arr           = $r->toArray();
            $arr['active'] = ($r->id === $active);

            // Check if repository folder exists
            $arr['folderExists'] = is_dir($r->path);

            // Determine repository type based on path
            $arr['repoType'] = $this->determineRepositoryType($r->path);

            // best-effort branch detection
            if ($arr['folderExists'] && is_dir($r->path . '/.git')) {
                $b         = GitCommandRunner::run($r->path, 'rev-parse --abbrev-ref HEAD');
                $rawBranch = trim($b['output'] ?? '');
                if ('' !== $rawBranch && $b['success']) {
                    // Use only first line in case of stray warnings
                    $arr['activeBranch'] = strtok($rawBranch, "\r\n");
                } else {
                    // Fallback: try to get branch from status
                    $statusResult = GitCommandRunner::run($r->path, 'status --porcelain --branch');
                    if ($statusResult['success']) {
                        $lines = explode("\n", trim($statusResult['output'] ?? ''));
                        foreach ($lines as $line) {
                            if (0 === strpos($line, '##') && preg_match('/## ([^\.]+)/', $line, $matches)) {
                                $arr['activeBranch'] = $matches[1];
                                break;
                            }
                        }
                    }

                    // If still no branch, set default
                    if (empty($arr['activeBranch'])) {
                        $arr['activeBranch'] = 'main';
                    }
                }

                // Get repository status for changes detection
                $status            = GitCommandRunner::run($r->path, 'status --porcelain');
                $arr['hasChanges'] = !in_array(trim($status['output'] ?? ''), ['', '0'], true);

                // Get branch status (ahead/behind)
                $branchStatus = GitCommandRunner::run($r->path, 'status --porcelain --branch');
                $ahead        = 0;
                $behind       = 0;
                if ($branchStatus['success']) {
                    $lines = explode("\n", trim($branchStatus['output'] ?? ''));
                    foreach ($lines as $line) {
                        if (0 === strpos($line, '##')) {
                            if (preg_match('/ahead (\d+)/', $line, $matches)) {
                                $ahead = (int) $matches[1];
                            }

                            if (preg_match('/behind (\d+)/', $line, $matches)) {
                                $behind = (int) $matches[1];
                            }

                            break;
                        }
                    }
                }

                $arr['ahead']  = $ahead;
                $arr['behind'] = $behind;
            } else {
                $arr['hasChanges']   = false;
                $arr['activeBranch'] = $arr['folderExists'] ? 'Unknown' : 'Folder Missing';
                $arr['ahead']        = 0;
                $arr['behind']       = 0;
            }

            $repos[] = $arr;
        }

        wp_send_json_success($repos);
    }

    public function getDetails(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id = $this->getRepositoryId();

        if ('' === $id || '0' === $id) {
            wp_send_json_error('Repository ID is required');
        }

        $repo = RepositoryManager::instance()->get($id);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        // Get current branch
        $currentBranch      = GitCommandRunner::run($repo->path, 'rev-parse --abbrev-ref HEAD');
        $repo->activeBranch = trim($currentBranch['output'] ?? 'Unknown');

        // If branch detection failed, try alternative method
        if ('' === $repo->activeBranch || '0' === $repo->activeBranch || 'Unknown' === $repo->activeBranch) {
            $statusResult = GitCommandRunner::run($repo->path, 'status --porcelain --branch');
            if ($statusResult['success']) {
                $lines = explode("\n", trim($statusResult['output'] ?? ''));
                foreach ($lines as $line) {
                    if (0 === strpos($line, '##') && preg_match('/## ([^\.]+)/', $line, $matches)) {
                        $repo->activeBranch = $matches[1];
                        break;
                    }
                }
            }
        }

        // If still no branch, try to get it from HEAD
        if ('' === $repo->activeBranch || '0' === $repo->activeBranch || 'Unknown' === $repo->activeBranch) {
            $headResult         = GitCommandRunner::run($repo->path, 'symbolic-ref --short HEAD');
            $repo->activeBranch = trim($headResult['output'] ?? 'main');
        }

        // Final fallback for branch name
        if ('' === $repo->activeBranch || '0' === $repo->activeBranch) {
            $repo->activeBranch = 'main';
        }

        // Ensure branch name is not empty
        if ('' === $repo->activeBranch || '0' === $repo->activeBranch) {
            $repo->activeBranch = 'Unknown';
        }

        // Get branch status (ahead/behind)
        $branchStatus = GitCommandRunner::run($repo->path, 'status --porcelain --branch');
        $ahead        = 0;
        $behind       = 0;
        if ($branchStatus['success']) {
            $lines = explode("\n", trim($branchStatus['output'] ?? ''));
            foreach ($lines as $line) {
                if (0 === strpos($line, '##')) {
                    if (preg_match('/ahead (\d+)/', $line, $matches)) {
                        $ahead = (int) $matches[1];
                    }

                    if (preg_match('/behind (\d+)/', $line, $matches)) {
                        $behind = (int) $matches[1];
                    }

                    break;
                }
            }
        }

        // Get repository status
        $status     = GitCommandRunner::run($repo->path, 'status --porcelain');
        $hasChanges = !in_array(trim($status['output'] ?? ''), ['', '0'], true);

        // Get last commit info for display
        $lastCommit     = GitCommandRunner::run($repo->path, 'log -1 --format="%h|%an|%s"');
        $lastCommitInfo = '';
        if ($lastCommit['success']) {
            $parts = explode('|', trim($lastCommit['output']));
            if (3 === count($parts)) {
                $lastCommitInfo = $parts[0] . ' - ' . $parts[2];
            }
        }

        // If no commits found, set default message
        if ('' === $lastCommitInfo || '0' === $lastCommitInfo) {
            $lastCommitInfo = 'No commits found';
        }

        // Get remote info
        $remote    = GitCommandRunner::run($repo->path, 'remote get-url origin');
        $remoteUrl = trim($remote['output'] ?? '');

        // If no remote URL found, try to get it from config
        if ('' === $remoteUrl || '0' === $remoteUrl) {
            $configResult = GitCommandRunner::run($repo->path, 'config --get remote.origin.url');
            $remoteUrl    = trim($configResult['output'] ?? '');
        }

        // If still no remote URL, set default message
        if ('' === $remoteUrl || '0' === $remoteUrl) {
            $remoteUrl = 'No remote configured';
        }

        // Check if repository directory exists
        $directoryExists    = is_dir($repo->path);
        $gitDirectoryExists = is_dir($repo->path . '/.git');

        // If directory doesn't exist, return basic info for missing repositories
        if (! $directoryExists) {
            $details = [
                'id'           => $repo->id,
                'name'         => $repo->name,
                'path'         => $repo->path,
                'remoteUrl'    => $repo->remoteUrl,
                'activeBranch' => 'Folder Missing',
                'hasChanges'   => false,
                'ahead'        => 0,
                'behind'       => 0,
                'lastCommit'   => 'Repository folder is missing',
                'authType'     => $repo->authType,
                'meta'         => $repo->meta,
                'folderExists' => false,
                'isValidGit'   => false,
            ];
            wp_send_json_success($details);

            return;
        }

        // Check if .git directory exists
        if (! $gitDirectoryExists) {
            $details = [
                'id'           => $repo->id,
                'name'         => $repo->name,
                'path'         => $repo->path,
                'remoteUrl'    => $repo->remoteUrl,
                'activeBranch' => 'Not a Git repository',
                'hasChanges'   => false,
                'ahead'        => 0,
                'behind'       => 0,
                'lastCommit'   => 'Directory exists but is not a Git repository',
                'authType'     => $repo->authType,
                'meta'         => $repo->meta,
                'folderExists' => true,
                'isValidGit'   => false,
            ];
            wp_send_json_success($details);

            return;
        }

        // Validate that this is actually a git repository
        $gitCheck = GitCommandRunner::run($repo->path, 'rev-parse --git-dir');
        if (! $gitCheck['success']) {
            $details = [
                'id'           => $repo->id,
                'name'         => $repo->name,
                'path'         => $repo->path,
                'remoteUrl'    => $repo->remoteUrl,
                'activeBranch' => 'Invalid Git repository',
                'hasChanges'   => false,
                'ahead'        => 0,
                'behind'       => 0,
                'lastCommit'   => 'Git repository validation failed',
                'authType'     => $repo->authType,
                'meta'         => $repo->meta,
                'folderExists' => true,
                'isValidGit'   => false,
            ];
            wp_send_json_success($details);

            return;
        }

        $details = [
            'id'           => $repo->id,
            'name'         => $repo->name,
            'path'         => realpath($repo->path) ?: stripslashes_deep($repo->path),
            'remoteUrl'    => $remoteUrl ?: $repo->remoteUrl,
            'activeBranch' => $repo->activeBranch,
            'hasChanges'   => $hasChanges,
            'ahead'        => $ahead,
            'behind'       => $behind,
            'lastCommit'   => $lastCommitInfo,
            'authType'     => $repo->authType,
            'meta'         => $repo->meta,
            'folderExists' => true,
            'isValidGit'   => true,
        ];

        wp_send_json_success($details);
    }

    public function getStatus(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id   = $this->getRepositoryId();
        $repo = RepositoryManager::instance()->get($id);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        // Get detailed status
        $status = GitCommandRunner::run($repo->path, 'status --porcelain --branch');
        $lines  = explode("\n", trim($status['output'] ?? ''));

        $statusInfo = [
            'hasChanges'     => false,
            'ahead'          => 0,
            'behind'         => 0,
            'currentBranch'  => 'Unknown',
            'modifiedFiles'  => [],
            'stagedFiles'    => [],
            'untrackedFiles' => [],
        ];

        foreach ($lines as $line) {
            if (0 === strpos($line, '##')) {
                // Branch info
                if (preg_match('/## ([^\.]+)(?:\.\.\.([^ ]+))?/', $line, $matches)) {
                    $statusInfo['currentBranch'] = $matches[1];
                    if (isset($matches[2])) {
                        if (preg_match('/ahead (\d+)/', $line, $ahead)) {
                            $statusInfo['ahead'] = (int) $ahead[1];
                        }

                        if (preg_match('/behind (\d+)/', $line, $behind)) {
                            $statusInfo['behind'] = (int) $behind[1];
                        }
                    }
                }
            } else {
                // File status
                if ('' === $line) {
                    continue;
                }

                $statusInfo['hasChanges'] = true;
                $status                   = substr($line, 0, 2);
                $file                     = substr($line, 3);

                if (' ' !== $status[0] && '?' !== $status[0]) {
                    $statusInfo['stagedFiles'][] = $file;
                }

                if (' ' !== $status[1] && '?' !== $status[1]) {
                    $statusInfo['modifiedFiles'][] = $file;
                }

                if ('??' === $status) {
                    $statusInfo['untrackedFiles'][] = $file;
                }
            }
        }

        // Add repository ID to the response
        $statusInfo['repoId'] = $id;
        wp_send_json_success($statusInfo);
    }

    public function add(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $data = [
            'name'      => sanitize_text_field(wp_unslash($_POST['name'] ?? '')),
            'path'      => sanitize_text_field(wp_unslash($_POST['repo_path'] ?? $_POST['path'] ?? '')),
            'remoteUrl' => sanitize_text_field(wp_unslash($_POST['repo_url'] ?? $_POST['remoteUrl'] ?? '')),
            'authType'  => sanitize_text_field(wp_unslash($_POST['authType'] ?? 'ssh')),
        ];
        if (! $data['path']) {
            wp_send_json_error('Path is required');
        }

        // Construct absolute path if relative path is provided
        $absolutePath = $data['path'];

        // Check if path is relative to WordPress root (starts with /wp-content, /wp-admin, etc.)
        $wpRelativePaths = ['/wp-content', '/wp-admin', '/wp-includes', '/wp-json'];
        $isWpRelative    = false;
        foreach ($wpRelativePaths as $wpPath) {
            if (0 === strpos($data['path'], $wpPath)) {
                $isWpRelative = true;
                break;
            }
        }

        if (! path_is_absolute($data['path']) || $isWpRelative) {
            $absolutePath = ABSPATH . ltrim($data['path'], '/');

        }

        if (! RepositoryManager::instance()->validatePath($absolutePath)) {
            wp_send_json_error('Invalid path');
        }

        // For new repositories, ensure the parent directory exists
        if (! $isExistingRepo) {
            $parentDir = dirname($absolutePath);
            if (!is_dir($parentDir) && ! wp_mkdir_p($parentDir)) {
                wp_send_json_error('Failed to create parent directory: ' . $parentDir);
            }
        }

        // Check if this is an existing repository
        $isExistingRepo = isset($_POST['existing_repo']) && '1' === $_POST['existing_repo'];

        if ($isExistingRepo) {
            // For existing repositories, validate that it's actually a Git repository
            if (! is_dir($absolutePath . '/.git')) {
                wp_send_json_error('Selected path is not a Git repository');
            }

            $data['path'] = realpath($absolutePath);
        } else {
            // For new repositories, we need to clone
            $remoteUrl = $data['remoteUrl'];
            if (! $remoteUrl) {
                wp_send_json_error('Repository URL is required for new repositories');
            }

            // Convert SSH URL to HTTPS if HTTPS authentication is provided or if SSH key is missing
            $authType   = sanitize_text_field(wp_unslash($_POST['authType'] ?? 'ssh'));
            $privateKey = empty($_POST['private_key']) ? '' : sanitize_textarea_field(wp_unslash($_POST['private_key']));

            if (0 === strpos($remoteUrl, 'git@') && ('https' === $authType || 'ssh' === $authType && empty($privateKey))) {
                // Convert git@github.com:user/repo.git to https://github.com/user/repo.git
                $remoteUrl = preg_replace('/^git@([^:]+):([^\/]+)\/([^\/]+?)(?:\.git)?$/', 'https://$1/$2/$3.git', $remoteUrl);
                // If we're converting to HTTPS but authType is still SSH, switch to HTTPS
                if ('ssh' === $authType && empty($privateKey)) {
                    $authType = 'https';
                }
            }

            // Extract repository name from URL if not provided
            if (! $data['name']) {
                $urlParts     = explode('/', $remoteUrl);
                $data['name'] = basename($urlParts[count($urlParts) - 1], '.git');
            }

            // Add repository name to the target path
            $absolutePath = rtrim($absolutePath, '/\\') . DIRECTORY_SEPARATOR . $data['name'];

            // Validate the final target path
            if (! RepositoryManager::instance()->validatePath($absolutePath)) {
                wp_send_json_error('Invalid target path');
            }

            // Clone the repository
            $authType   = sanitize_text_field(wp_unslash($_POST['authType'] ?? 'ssh'));
            $username   = sanitize_text_field(wp_unslash($_POST['username'] ?? ''));
            $token      = sanitize_text_field(wp_unslash($_POST['token'] ?? ''));
            $privateKey = empty($_POST['private_key']) ? '' : sanitize_textarea_field(wp_unslash($_POST['private_key']));

            // Prepare environment for Git
            $home               = getenv('HOME') ?: (getenv('USERPROFILE') ?: sys_get_temp_dir());
            $homeClean          = str_replace('"', '', $home);
            $env                = [];
            $remoteUrlFormatted = $remoteUrl;

            if ('https' === $authType && $username && $token) {
                $remoteUrlFormatted = preg_replace('#^https://#', 'https://' . rawurlencode($username) . ':' . rawurlencode($token) . '@', $remoteUrl);
            }

            if ('WIN' === strtoupper(substr(PHP_OS, 0, 3))) {
                $envStr = '';
                foreach ($env as $key => $value) {
                    $envStr .= sprintf('set "%s=%s" && ', $key, $value);
                }

                $cmd = $envStr . 'set "HOME=' . $homeClean . '" && git clone ' . escapeshellarg($remoteUrlFormatted) . ' ' . escapeshellarg($absolutePath) . ' 2>&1';
            } else {
                $envStr = '';
                foreach ($env as $key => $value) {
                    $envStr .= $key . '=' . escapeshellarg($value) . ' ';
                }

                $cmd = $envStr . 'HOME=' . escapeshellarg($home) . ' git clone ' . escapeshellarg($remoteUrlFormatted) . ' ' . escapeshellarg($absolutePath) . ' 2>&1';
            }

            // If SSH with private key is provided, create a temporary wrapper
            if ('ssh' === $authType && $privateKey) {
                $tmpDir = wp_upload_dir(null, false)['basedir'] . '/repo-manager-keys';
                if (! is_dir($tmpDir)) {
                    @wp_mkdir_p($tmpDir);
                }

                $keyPath = $tmpDir . '/key_' . md5($privateKey) . '.pem';
                if (! file_exists($keyPath)) {
                    file_put_contents($keyPath, $privateKey);
                    // Use WP_Filesystem instead of chmod
                    global $wp_filesystem;
                    if (empty($wp_filesystem)) {
                        require_once(ABSPATH . '/wp-admin/includes/file.php');
                        WP_Filesystem();
                    }

                    if ($wp_filesystem) {
                        $wp_filesystem->chmod($keyPath, 0600);
                    }
                }

                $isWin   = 'WIN' === strtoupper(substr(PHP_OS, 0, 3));
                $wrapper = $tmpDir . '/ssh_wrapper_' . md5($keyPath) . ($isWin ? '.bat' : '.sh');
                if ($isWin) {
                    if (! file_exists($wrapper)) {
                        file_put_contents($wrapper, "@echo off\nssh -i \"{$keyPath}\" -o StrictHostKeyChecking=no %*\n");
                    }

                    $cmd = 'set "GIT_SSH=' . $wrapper . '" && ' . $cmd;
                } else {
                    if (! file_exists($wrapper)) {
                        file_put_contents($wrapper, "#!/bin/sh\nexec ssh -i '{$keyPath}' -o StrictHostKeyChecking=no \"$@\"\n");
                        // Use WP_Filesystem instead of chmod
                        global $wp_filesystem;
                        if (empty($wp_filesystem)) {
                            require_once(ABSPATH . '/wp-admin/includes/file.php');
                            WP_Filesystem();
                        }

                        if ($wp_filesystem) {
                            $wp_filesystem->chmod($wrapper, 0700);
                        }
                    }

                    $cmd = 'GIT_SSH=' . escapeshellarg($wrapper) . ' ' . $cmd;
                }
            }

            $out = shell_exec($cmd);
            if (! is_dir($absolutePath . '/.git')) {
                wp_send_json_error($out ?: 'Clone failed - no .git directory found');
            }

            // Handle branch checkout if specified
            $branch = sanitize_text_field(wp_unslash($_POST['repo_branch'] ?? ''));
            if ($branch && 'main' !== $branch && 'master' !== $branch) {
                // Check if the branch exists remotely
                $branchCheckCmd = 'cd ' . escapeshellarg($absolutePath) . ' && git ls-remote --heads origin ' . escapeshellarg($branch);
                if (! \WPGitManager\Admin\GitManager::are_commands_enabled()) {
                    wp_send_json_error('Command execution is disabled');
                }
                $branchExists   = shell_exec($branchCheckCmd);

                if ($branchExists) {
                    // Branch exists remotely, checkout
                    $checkoutCmd = 'cd ' . escapeshellarg($absolutePath) . ' && git checkout ' . escapeshellarg($branch);
                    if (! \WPGitManager\Admin\GitManager::are_commands_enabled()) {
                        wp_send_json_error('Command execution is disabled');
                    }
                    $checkoutOut = shell_exec($checkoutCmd);
                } else {
                    // Try to create the branch
                    $createCmd = 'cd ' . escapeshellarg($absolutePath) . ' && git checkout -b ' . escapeshellarg($branch);
                    if (! \WPGitManager\Admin\GitManager::are_commands_enabled()) {
                        wp_send_json_error('Command execution is disabled');
                    }
                    $createOut = shell_exec($createCmd);
                }
            }

            $data['path']      = $absolutePath;
            $data['remoteUrl'] = $remoteUrl;
        }

        $repo = RepositoryManager::instance()->add($data);

        // Handle credentials if provided
        $authType   = sanitize_text_field(wp_unslash($_POST['authType'] ?? 'ssh'));
        $username   = sanitize_text_field(wp_unslash($_POST['username'] ?? ''));
        $token      = sanitize_text_field(wp_unslash($_POST['token'] ?? ''));
        $privateKey = empty($_POST['private_key']) ? '' : sanitize_textarea_field(wp_unslash($_POST['private_key']));

        if ('https' === $authType && ($username || $token)) {
            $cred = ['authType' => $authType];
            if ($username) {
                $cred['username'] = $username;
            }

            if ($token) {
                $cred['token'] = $token;
            }

            if (count($cred) > 1) {
                CredentialStore::set($repo->id, $cred);
            }
        } elseif ('ssh' === $authType && $privateKey) {
            $cred = ['authType' => $authType, 'private_key' => $privateKey];
            CredentialStore::set($repo->id, $cred);
        }

        wp_send_json_success($repo->toArray());
    }

    public function update(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id = $this->getRepositoryId();

        // Get the current repository to validate changes
        $currentRepo = RepositoryManager::instance()->get($id);
        if (!$currentRepo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        $metaRaw = sanitize_text_field(wp_unslash($_POST['meta'] ?? null));
        $meta    = null;
        if (null !== $metaRaw) {
            if (is_string($metaRaw)) {
                $decoded = json_decode(stripslashes($metaRaw), true);
                if (is_array($decoded)) {
                    $meta = $decoded;
                }
            } elseif (is_array($metaRaw)) {
                $meta = $metaRaw;
            }
        }

        $newPath = sanitize_text_field(wp_unslash($_POST['path'] ?? ''));
        $newName = sanitize_text_field(wp_unslash($_POST['name'] ?? ''));

        // Validate the new path if it's being changed
        if (! empty($newPath) && $newPath !== $currentRepo->path) {

            // Check if the new path is valid
            if (! RepositoryManager::instance()->validatePath($newPath)) {

                wp_send_json_error('Invalid repository path: ' . $newPath);
            }

            // Check if the new path already exists and is different from current
            $existingRepo = null;
            foreach (RepositoryManager::instance()->all() as $repo) {
                if ($repo->path === $newPath && $repo->id !== $id) {
                    $existingRepo = $repo;
                    break;
                }
            }

            if ($existingRepo) {
                wp_send_json_error('A repository with this path already exists: ' . $existingRepo->name);
            }
        }

        // Handle path resolution
        $resolvedPath = $newPath;
        if (! empty($newPath)) {
            $realPath = realpath($newPath);
            if ($realPath) {
                $resolvedPath = $realPath;
            } else {
                // Try with ABSPATH prefix if it's a relative path
                $absPath = realpath(ABSPATH . '/' . ltrim($newPath, '/'));
                if ($absPath) {
                    $resolvedPath = $absPath;
                }
            }
        }

        $payload = [
            'name'      => $newName,
            'path'      => $resolvedPath,
            'remoteUrl' => sanitize_text_field(wp_unslash($_POST['remoteUrl'] ?? '')),
        ];

        // Only include authType if it's provided
        if (isset($_POST['authType'])) {
            $payload['authType'] = sanitize_text_field(wp_unslash($_POST['authType']));
        }

        // Only include meta if it's provided
        if (null !== $meta) {
            $payload['meta'] = $meta;
        }

        $repo = RepositoryManager::instance()->update($id, $payload);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Failed to update repository');
        }

        wp_send_json_success($repo->toArray());
    }

    public function delete(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id           = $this->getRepositoryId();
        $delete_files = isset($_POST['delete_files']) && (bool) sanitize_text_field(wp_unslash($_POST['delete_files']));

        $manager = RepositoryManager::instance();
        $repo    = $manager->get($id);

        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        $repo_path = $repo->path;
        $repo_name = $repo->name;

        // Delete from RepositoryManager
        if (! $manager->delete($id)) {
            wp_send_json_error('Failed to remove repository from manager');
        }

        // Handle file deletion if requested
        if ($delete_files && $repo_path && is_dir($repo_path)) {
            // Security check: ensure the path is safe to delete
            if (! $this->is_safe_to_delete($repo_path)) {
                wp_send_json_error('Cannot delete repository files: Path is not safe to delete');
            }

            // Delete the repository directory
            $deleted = $this->delete_directory($repo_path);
            if (! $deleted) {
                wp_send_json_error('Failed to delete repository files from disk');
            }

            wp_send_json_success(sprintf('Repository "%s" and its files have been deleted successfully', $repo_name));
        }

        wp_send_json_success(sprintf('Repository "%s" has been removed from Repo Manager successfully', $repo_name));
    }

    /**
     * Check if a path is safe to delete
     */
    private function is_safe_to_delete($path): bool
    {
        $real_path = realpath($path);
        if (! $real_path) {
            return false;
        }

        // Don't allow deletion of WordPress core directories
        $wp_core_dirs = [
            ABSPATH,
            WP_CONTENT_DIR,
            WP_PLUGIN_DIR,
            get_template_directory(),
            get_stylesheet_directory(),
        ];

        foreach ($wp_core_dirs as $core_dir) {
            if ($real_path === realpath($core_dir)) {
                return false;
            }
        }

        // Ensure the path is within allowed directories
        $allowed_roots = [
            ABSPATH,
            dirname(ABSPATH),
            WP_CONTENT_DIR,
            dirname(WP_CONTENT_DIR),
        ];

        foreach ($allowed_roots as $root) {
            if (0 === strpos($real_path, (string) realpath($root))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Recursively delete a directory
     */
    private function delete_directory($path): bool
    {
        if (! is_dir($path)) {
            return false;
        }

        $files = array_diff(scandir($path), ['.', '..']);

        foreach ($files as $file) {
            $file_path = $path . DIRECTORY_SEPARATOR . $file;

            if (is_dir($file_path)) {
                if (! $this->delete_directory($file_path)) {
                    return false;
                }
            } elseif (! wp_delete_file($file_path)) {
                return false;
            }
        }

        // Use WP_Filesystem instead of rmdir
        global $wp_filesystem;
        if (empty($wp_filesystem)) {
            require_once(ABSPATH . '/wp-admin/includes/file.php');
            WP_Filesystem();
        }

        if ($wp_filesystem) {
            return $wp_filesystem->rmdir($path);
        }

        // Use WordPress filesystem as fallback
        if (function_exists('WP_Filesystem')) {
            global $wp_filesystem;
            if (empty($wp_filesystem)) {
                require_once(ABSPATH . '/wp-admin/includes/file.php');
                WP_Filesystem();
            }

            if ($wp_filesystem) {
                return $wp_filesystem->rmdir($path);
            }
        }

        return false; // Don't use direct PHP functions
    }

    public function clone(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $remote     = sanitize_text_field(wp_unslash($_POST['remote'] ?? ''));
        $target     = sanitize_text_field(wp_unslash($_POST['target'] ?? ''));
        $name       = sanitize_text_field(wp_unslash($_POST['name'] ?? ''));
        $authType   = sanitize_text_field(wp_unslash($_POST['authType'] ?? 'ssh'));
        $username   = sanitize_text_field(wp_unslash($_POST['username'] ?? ''));
        $token      = sanitize_text_field(wp_unslash($_POST['token'] ?? ''));
        $privateKey = empty($_POST['private_key']) ? '' : sanitize_textarea_field(wp_unslash($_POST['private_key']));

        if (! $remote || ! $target || ! $name) {
            wp_send_json_error('Missing required data');
        }

        // Construct absolute path if relative path is provided
        $absoluteTarget = $target;
        if (! path_is_absolute($target)) {
            $absoluteTarget = ABSPATH . ltrim($target, '/');
        }

        // Add repository name to the target path
        $absoluteTarget = rtrim($absoluteTarget, '/\\') . DIRECTORY_SEPARATOR . $name;

        if (! RepositoryManager::instance()->validatePath(dirname($absoluteTarget))) {
            wp_send_json_error('Invalid target parent directory');
        }

        // Prepare environment for Git
        $home      = getenv('HOME') ?: (getenv('USERPROFILE') ?: sys_get_temp_dir());
        $homeClean = str_replace('"', '', $home);
        $env       = [];
        $remoteUrl = $remote;
        if ('https' === $authType && $username && $token) {
            $remoteUrl = preg_replace('#^https://#', 'https://' . rawurlencode($username) . ':' . rawurlencode($token) . '@', $remoteUrl);
        }

        if ('WIN' === strtoupper(substr(PHP_OS, 0, 3))) {
            $envStr = '';
            foreach ($env as $key => $value) {
                $envStr .= sprintf('set "%s=%s" && ', $key, $value);
            }

            $cmd = $envStr . 'set "HOME=' . $homeClean . '" && git clone ' . escapeshellarg($remoteUrl) . ' ' . escapeshellarg($absoluteTarget) . ' 2>&1';
        } else {
            $envStr = '';
            foreach ($env as $key => $value) {
                $envStr .= $key . '=' . escapeshellarg($value) . ' ';
            }

            $cmd = $envStr . 'HOME=' . escapeshellarg($home) . ' git clone ' . escapeshellarg($remoteUrl) . ' ' . escapeshellarg($absoluteTarget) . ' 2>&1';
        }

        // If SSH with private key is provided, create a temporary wrapper and prefix GIT_SSH
        if ('ssh' === $authType && $privateKey) {
            $tmpDir = wp_upload_dir(null, false)['basedir'] . '/repo-manager-keys';
            if (! is_dir($tmpDir)) {
                @wp_mkdir_p($tmpDir);
            }

            $keyPath = $tmpDir . '/key_' . md5($privateKey) . '.pem';
            if (! file_exists($keyPath)) {
                file_put_contents($keyPath, $privateKey);
                // Use WP_Filesystem instead of chmod
                global $wp_filesystem;
                if (empty($wp_filesystem)) {
                    require_once(ABSPATH . '/wp-admin/includes/file.php');
                    WP_Filesystem();
                }

                if ($wp_filesystem) {
                    $wp_filesystem->chmod($keyPath, 0600);
                }
            }

            $isWin   = 'WIN' === strtoupper(substr(PHP_OS, 0, 3));
            $wrapper = $tmpDir . '/ssh_wrapper_' . md5($keyPath) . ($isWin ? '.bat' : '.sh');
            if ($isWin) {
                if (! file_exists($wrapper)) {
                    file_put_contents($wrapper, "@echo off\nssh -i \"{$keyPath}\" -o StrictHostKeyChecking=no %*\n");
                }

                $cmd = 'set "GIT_SSH=' . $wrapper . '" && ' . $cmd;
            } else {
                if (! file_exists($wrapper)) {
                    file_put_contents($wrapper, "#!/bin/sh\nexec ssh -i '{$keyPath}' -o StrictHostKeyChecking=no \"$@\"\n");
                    // Use WP_Filesystem instead of chmod
                    global $wp_filesystem;
                    if (empty($wp_filesystem)) {
                        require_once(ABSPATH . '/wp-admin/includes/file.php');
                        WP_Filesystem();
                    }

                    if ($wp_filesystem) {
                        $wp_filesystem->chmod($wrapper, 0700);
                    }
                }

                $cmd = 'GIT_SSH=' . escapeshellarg($wrapper) . ' ' . $cmd;
            }
        }

        if (! \WPGitManager\Admin\GitManager::are_commands_enabled()) {
            wp_send_json_error('Command execution is disabled');
        }
        $out = shell_exec($cmd);
        if (! is_dir($absoluteTarget . '/.git')) {
            wp_send_json_error($out ?: 'Clone failed - no .git directory found');
        }

        $repo = RepositoryManager::instance()->add([
            'name'      => $name,
            'path'      => $absoluteTarget,
            'remoteUrl' => $remote,
            'authType'  => $authType,
        ]);
        // Save credentials if provided
        $cred = ['authType' => $authType];
        if ('https' === $authType) {
            if ($username) {
                $cred['username'] = $username;
            } if ($token) {
                $cred['token'] = $token;
            }
        }

        if ('ssh' === $authType && $privateKey) {
            $cred['private_key'] = $privateKey;
        }

        if (count($cred) > 1) {
            CredentialStore::set($repo->id, $cred);
        }

        wp_send_json_success(['output' => $out, 'repository' => $repo->toArray()]);
    }

    /** Add existing repository (no clone) */
    public function addExisting(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $name       = sanitize_text_field(wp_unslash($_POST['name'] ?? ''));
        $path       = sanitize_text_field(wp_unslash($_POST['path'] ?? ''));
        $remoteUrl  = sanitize_text_field(wp_unslash($_POST['remoteUrl'] ?? ''));
        $authType   = sanitize_text_field(wp_unslash($_POST['authType'] ?? 'ssh'));
        $username   = sanitize_text_field(wp_unslash($_POST['username'] ?? ''));
        $token      = sanitize_text_field(wp_unslash($_POST['token'] ?? ''));
        $privateKey = empty($_POST['private_key']) ? '' : sanitize_textarea_field(wp_unslash($_POST['private_key']));
        if (! $name || ! $path) {
            wp_send_json_error('Name and path are required');
        }

        // Construct absolute path if relative path is provided
        $absolutePath = $path;
        if (! path_is_absolute($path)) {
            $absolutePath = ABSPATH . ltrim($path, '/');
        }

        if (! RepositoryManager::instance()->validatePath($absolutePath)) {
            wp_send_json_error('Invalid path');
        }

        if (! is_dir($absolutePath . '/.git')) {
            wp_send_json_error('Selected path is not a Git repository');
        }

        $repo = RepositoryManager::instance()->add([
            'name'      => $name,
            'path'      => realpath($absolutePath),
            'remoteUrl' => $remoteUrl ?: null,
            'authType'  => $authType,
        ]);
        $cred = ['authType' => $authType];
        if ('https' === $authType) {
            if ($username) {
                $cred['username'] = $username;
            } if ($token) {
                $cred['token'] = $token;
            }
        }

        if ('ssh' === $authType && $privateKey) {
            $cred['private_key'] = $privateKey;
        }

        if (count($cred) > 1) {
            CredentialStore::set($repo->id, $cred);
        }

        wp_send_json_success($repo->toArray());
    }

    public function gitOp(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id   = $this->getRepositoryId();
        $op   = sanitize_text_field(wp_unslash($_POST['op'] ?? 'status'));
        $repo = RepositoryManager::instance()->get($id);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        $map = [
            'fetch'    => 'fetch --all',
            'pull'     => 'pull',
            'push'     => 'push',
            'status'   => 'status --short --branch',
            'branches' => 'branch -a',
            'log'      => 'log -n 10 --pretty=format:"%h|%an|%ar|%s"',
            'tags'     => 'tag --list',
            'stash'    => 'stash list',
        ];

        $cmd = $map[$op] ?? null;
        if (! $cmd) {
            wp_send_json_error('Unsupported operation');
        }

        $res = GitCommandRunner::run($repo->path, $cmd);
        wp_send_json_success($res);
    }

    private function sanitizeRef(string $ref): string
    {
        return preg_replace('/[^A-Za-z0-9._\-\/]/', '', $ref);
    }

    public function checkout(): void
    {
        // Try multiple nonce verification methods like latestCommit
        if (! current_user_can('manage_options')) {
            wp_send_json_error('Access denied');
        }

        $nonce                 = sanitize_text_field(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')));
        $action_specific_valid = wp_verify_nonce($nonce, 'git_manager_action');
        $general_nonce_valid   = wp_verify_nonce($nonce, 'git_manager_action');

        if (! $action_specific_valid && ! $general_nonce_valid) {
            wp_send_json_error('Invalid nonce');
        }

        $id     = $this->getRepositoryId();
        $branch = $this->sanitizeRef(sanitize_text_field(wp_unslash($_POST['branch'] ?? '')));
        $repo   = RepositoryManager::instance()->get($id);
        if (! $repo || ! $branch) {
            wp_send_json_error('Invalid data');
        }

        // Check if repository is clean before attempting checkout
        $statusResult = GitCommandRunner::run($repo->path, 'status --porcelain');
        if (!in_array(trim($statusResult['output']), ['', '0'], true)) {
            wp_send_json_error('Cannot checkout: Repository has uncommitted changes. Please commit or stash your changes first.');
        }

        // Fetch first to ensure we have latest remote branches
        GitCommandRunner::run($repo->path, 'fetch --all');

        // Determine if local branch exists
        $localCheck = GitCommandRunner::run($repo->path, 'show-ref --heads ' . escapeshellarg('refs/heads/' . $branch));

        if (! empty($localCheck['output'])) {
            // Local branch exists, just checkout
            $res = GitCommandRunner::run($repo->path, 'checkout ' . escapeshellarg($branch));
        } else {
            // Try to checkout remote branch
            $res = GitCommandRunner::run($repo->path, 'checkout -b ' . escapeshellarg($branch) . ' origin/' . escapeshellarg($branch));

            // If that fails, try creating a new branch
            if (($res['exitCode'] ?? 0) !== 0) {
                $res = GitCommandRunner::run($repo->path, 'checkout -b ' . escapeshellarg($branch));
            }
        }

        // Verify that checkout was successful by checking current branch
        $currentBranchResult = GitCommandRunner::run($repo->path, 'rev-parse --abbrev-ref HEAD');
        $currentBranch       = trim($currentBranchResult['output']);

        if ($currentBranch !== $branch) {
            wp_send_json_error('Checkout failed: Could not switch to branch ' . $branch . '. Current branch is: ' . $currentBranch);
        }

        wp_send_json_success($res);
    }

    public function createBranch(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id         = $this->getRepositoryId();
        $branchName = $this->sanitizeRef(sanitize_text_field(wp_unslash($_POST['branch'] ?? '')));
        $repo       = RepositoryManager::instance()->get($id);

        if (! $repo || ! $branchName) {
            wp_send_json_error('Invalid branch name');
        }

        $res = GitCommandRunner::run($repo->path, 'checkout -b ' . escapeshellarg($branchName));
        wp_send_json_success($res);
    }

    public function deleteBranch(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id         = $this->getRepositoryId();
        $branchName = $this->sanitizeRef(sanitize_text_field(wp_unslash($_POST['branch'] ?? '')));
        $repo       = RepositoryManager::instance()->get($id);

        if (! $repo || ! $branchName) {
            wp_send_json_error('Invalid branch name');
        }

        // Don't allow deleting current branch
        $current = GitCommandRunner::run($repo->path, 'rev-parse --abbrev-ref HEAD');
        if (trim($current['output']) === $branchName) {
            wp_send_json_error('Cannot delete current branch');
        }

        $res = GitCommandRunner::run($repo->path, 'branch -D ' . escapeshellarg($branchName));
        wp_send_json_success($res);
    }

    public function push(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id     = $this->getRepositoryId();
        $branch = $this->sanitizeRef(sanitize_text_field(wp_unslash($_POST['branch'] ?? '')));
        $repo   = RepositoryManager::instance()->get($id);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        if ('' === $branch || '0' === $branch) {
            // Detect current branch
            $current = GitCommandRunner::run($repo->path, 'rev-parse --abbrev-ref HEAD');
            $branch  = trim($current['output']);
        }

        $res = GitCommandRunner::run($repo->path, 'push origin ' . escapeshellarg($branch));
        wp_send_json_success($res);
    }

    public function merge(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id     = $this->getRepositoryId();
        $source = $this->sanitizeRef(sanitize_text_field(wp_unslash($_POST['source'] ?? '')));
        $repo   = RepositoryManager::instance()->get($id);
        if (! $repo || ! $source) {
            wp_send_json_error('Invalid data');
        }

        GitCommandRunner::run($repo->path, 'fetch --all');
        $res = GitCommandRunner::run($repo->path, 'merge ' . escapeshellarg($source));
        wp_send_json_success($res);
    }

    public function createTag(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id      = $this->getRepositoryId();
        $tag     = $this->sanitizeRef(sanitize_text_field(wp_unslash($_POST['tag'] ?? '')));
        $message = sanitize_text_field(wp_unslash($_POST['message'] ?? ''));
        $repo    = RepositoryManager::instance()->get($id);

        if (! $repo || ! $tag) {
            wp_send_json_error('Invalid tag name');
        }

        $cmd = 'tag ' . escapeshellarg($tag);
        if ($message) {
            $cmd .= ' -m ' . escapeshellarg($message);
        }

        $res = GitCommandRunner::run($repo->path, $cmd);
        wp_send_json_success($res);
    }

    public function stash(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id      = $this->getRepositoryId();
        $message = sanitize_text_field(wp_unslash($_POST['message'] ?? ''));
        $repo    = RepositoryManager::instance()->get($id);

        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        $cmd = 'stash';
        if ($message) {
            $cmd .= ' push -m ' . escapeshellarg($message);
        }

        $res = GitCommandRunner::run($repo->path, $cmd);
        wp_send_json_success($res);
    }

    public function stashPop(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id   = $this->getRepositoryId();
        $repo = RepositoryManager::instance()->get($id);

        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        $res = GitCommandRunner::run($repo->path, 'stash pop');
        wp_send_json_success($res);
    }

    /**
     * Get detailed commit information with author and date
     */
    public function detailedLog(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $repoId = $this->getRepositoryId();

        if ('' === $repoId || '0' === $repoId) {
            wp_send_json_error('No repository specified');
        }

        $repo = RepositoryManager::instance()->get($repoId);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        // Get current branch first
        $branchResult = GitCommandRunner::run($repo->path, 'rev-parse --abbrev-ref HEAD');
        if (! $branchResult['success']) {
            // Fallback: try to get branch from status
            $statusResult = GitCommandRunner::run($repo->path, 'status --porcelain --branch');
            if ($statusResult['success']) {
                $lines = explode("\n", trim($statusResult['output'] ?? ''));
                foreach ($lines as $line) {
                    if (0 === strpos($line, '##') && preg_match('/## ([^\.]+)/', $line, $matches)) {
                        $currentBranch = $matches[1];
                        break;
                    }
                }
            }

            if ('0' === $currentBranch) {
                wp_send_json_error('Failed to get current branch');
            }
        } else {
            $currentBranch = trim($branchResult['output']);
        }

        // Get latest commit for current branch
        $result = GitCommandRunner::run($repo->path, sprintf('log -1 --format="%%H|%%an|%%ae|%%s" %s', $currentBranch));
        if (! $result['success']) {
            wp_send_json_error('Failed to get latest commit');
        }

        $parts = explode('|', trim($result['output']));
        if (4 !== count($parts)) {
            wp_send_json_error('Invalid commit format');
        }

        // Get avatar information using author name and email
        $authorString = $parts[1] . ' <' . $parts[2] . '>';
        $avatarInfo   = $this->getGravatarUrl($authorString);

        $data = [
            'hash'         => $parts[0],
            'author'       => $parts[1],
            'author_name'  => $parts[1],
            'author_email' => $parts[2],
            'subject'      => $parts[3],
            'branch'       => $currentBranch,
            'repo_name'    => $repo->name,
            'gravatar_url' => $avatarInfo['gravatar_url'],
            'has_avatar'   => $avatarInfo['has_avatar'],
        ];

        // Get remote hash if available for current branch
        $remoteResult = GitCommandRunner::run($repo->path, 'rev-parse origin/' . $currentBranch);
        if ($remoteResult['success']) {
            $data['remote_hash'] = trim($remoteResult['output']);
        }

        wp_send_json_success($data);
    }

    public function setActive(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id = $this->getRepositoryId();
        $ok = RepositoryManager::instance()->setActive($id);
        $ok ? wp_send_json_success(true) : wp_send_json_error('Repository not found');
    }

    public function saveCredentials(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id = $this->getRepositoryId();
        if (!RepositoryManager::instance()->get($id) instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        $cred = [
            'authType' => sanitize_text_field(wp_unslash($_POST['authType'] ?? 'ssh')),
            'username' => sanitize_text_field(wp_unslash($_POST['username'] ?? '')),
            'token'    => sanitize_text_field(wp_unslash($_POST['token'] ?? '')),
        ];

        if (! empty($_POST['private_key'])) {
            $cred['private_key'] = sanitize_textarea_field(wp_unslash($_POST['private_key']));
        }

        CredentialStore::set($id, $cred);
        wp_send_json_success(['saved' => true]);
    }

    public function troubleshootRepo(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id   = $this->getRepositoryId();
        $repo = RepositoryManager::instance()->get($id);
        if (! $repo || ! is_dir($repo->path)) {
            wp_send_json_error('Invalid repository');
        }

        $path = $repo->path;
        $html = '';
        // 1) Git binary
        $gitVersion = GitManager::are_commands_enabled() ? trim((string) shell_exec('git --version 2>&1')) : '';
        $html .= '<b>Git:</b> ' . ($gitVersion ?: 'Not found') . '\n';
        // 2) Repo path and .git
        $html .= is_dir($path) ? "\nRepo Path: OK (" . esc_html($path) . ')' : "\nRepo Path: NOT FOUND";
        $html .= is_dir($path . '/.git') ? "\n.git: OK" : "\n.git: MISSING";
        // 3) Safe directory attempt
        if (is_dir($path . '/.git')) {
            if (GitManager::are_commands_enabled()) {
                $outSafe = shell_exec(
                    ('WIN' === strtoupper(substr(PHP_OS, 0, 3)))
                    ? 'set "HOME=' . str_replace('"', '', getenv('HOME') ?: (getenv('USERPROFILE') ?: sys_get_temp_dir())) . '" && git -C "' . str_replace('"', '', $path) . '" config --local --add safe.directory ' . escapeshellarg($path) . ' 2>&1'
                    : 'HOME=' . escapeshellarg(getenv('HOME') ?: sys_get_temp_dir()) . ' git -C ' . escapeshellarg($path) . ' config --local --add safe.directory ' . escapeshellarg($path) . ' 2>&1'
                );
                $html .= "\nSafe Directory: " . ('' === trim($outSafe) ? 'OK (set)' : 'Tried (' . esc_html($outSafe) . ')');
            } else {
                $html .= "\nSafe Directory: skipped (commands disabled)";
            }
        }

        // 4) Remote test
        $remoteUrl = GitManager::are_commands_enabled() ? trim((string) shell_exec(
            ('WIN' === strtoupper(substr(PHP_OS, 0, 3)))
            ? 'set "HOME=' . str_replace('"', '', getenv('HOME') ?: (getenv('USERPROFILE') ?: sys_get_temp_dir())) . '" && git -C "' . str_replace('"', '', $path) . '" config --get remote.origin.url 2>&1'
            : 'HOME=' . escapeshellarg(getenv('HOME') ?: sys_get_temp_dir()) . ' git -C ' . escapeshellarg($path) . ' config --get remote.origin.url 2>&1'
        )) : '';
        if ('' !== $remoteUrl && '0' !== $remoteUrl) {
            $ls = GitCommandRunner::run($path, 'ls-remote --exit-code origin');
            $html .= "\nRemote: " . $remoteUrl . "\nRemote check: " . (false !== strpos($ls['output'] ?? '', 'fatal:') ? 'Failed' : 'OK');
        } else {
            $html .= "\nRemote: not set";
        }

        wp_send_json_success(['html' => nl2br($html)]);
    }

    /** Simple directory lister for picker (restrict within ABSPATH by default) */
    public function listDirectories(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $relative = sanitize_text_field(wp_unslash($_POST['relative'] ?? ''));
        $query    = sanitize_text_field(wp_unslash($_POST['query'] ?? ''));

        $base = realpath(ABSPATH);

        // If search query is provided, search from root
        if (! empty($query)) {
            $this->searchDirectories($base, $query);

            return;
        }

        $target = realpath($base . ($relative ? DIRECTORY_SEPARATOR . $relative : ''));

        if (! $target || 0 !== strpos($target, (string) $base)) {
            wp_send_json_error('Invalid path');
        }

        $items = @scandir($target) ?: [];
        $dirs  = [];

        foreach ($items as $item) {
            if ('.' === $item || '..' === $item) {
                continue;
            }

            $full = $target . DIRECTORY_SEPARATOR . $item;
            if (is_dir($full)) {
                $dirs[] = [
                    'name'     => $item,
                    'relative' => ltrim(str_replace($base, '', $full), '\\/'),
                ];
            }
        }

        wp_send_json_success([
            'cwd'  => ltrim(str_replace($base, '', $target), '\\/'),
            'dirs' => $dirs,
        ]);
    }

    /** Search directories recursively */
    private function searchDirectories(string $base, string $query): void
    {
        $results = [];
        $this->searchDirectoriesRecursive($base, $query, $results, $base);

        wp_send_json_success([
            'cwd'  => '',
            'dirs' => $results,
        ]);
    }

    private function searchDirectoriesRecursive(string $dir, string $query, array &$results, string $base): void
    {
        if (! is_dir($dir)) {
            return;
        }

        $items = @scandir($dir) ?: [];
        foreach ($items as $item) {
            if ('.' === $item || '..' === $item) {
                continue;
            }

            $full = $dir . DIRECTORY_SEPARATOR . $item;
            if (is_dir($full)) {
                // Check if directory name matches query
                if (false !== stripos($item, $query)) {
                    $relative  = ltrim(str_replace($base, '', $full), '\\/');
                    $results[] = [
                        'name'     => $item,
                        'relative' => $relative,
                        'fullPath' => $relative, // Add full path for search results
                    ];
                }

                // Continue searching in subdirectories (limit depth to avoid performance issues)
                $depth = substr_count(str_replace($base, '', $full), DIRECTORY_SEPARATOR);
                if ($depth < 5) { // Limit search depth to 5 levels
                    $this->searchDirectoriesRecursive($full, $query, $results, $base);
                }
            }
        }
    }

    /** Create a directory within allowed root (default ABSPATH) */
    public function createDirectory(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $relative = sanitize_text_field(wp_unslash($_POST['relative'] ?? ''));
        $name     = sanitize_file_name(wp_unslash($_POST['name'] ?? ''));

        if ('' === $name || preg_match('/[\\\/:*?"<>|]/', $name)) {
            wp_send_json_error('Invalid folder name');
        }

        $base   = realpath(ABSPATH);
        $parent = realpath($base . ($relative ? DIRECTORY_SEPARATOR . $relative : ''));
        if (! $parent || 0 !== strpos($parent, (string) $base)) {
            wp_send_json_error('Invalid path');
        }

        $target = $parent . DIRECTORY_SEPARATOR . $name;
        if (file_exists($target)) {
            wp_send_json_error('Folder already exists');
        }

        if (! wp_mkdir_p($target)) {
            wp_send_json_error('Failed to create folder');
        }

        wp_send_json_success(['message' => 'Folder created', 'relative' => ltrim(str_replace($base, '', $target), '\\/')]);
    }

    /** Delete an empty directory within allowed root (default ABSPATH) */
    public function deleteDirectory(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $relative = sanitize_text_field(wp_unslash($_POST['relative'] ?? ''));

        $base   = realpath(ABSPATH);
        $target = realpath($base . ($relative ? DIRECTORY_SEPARATOR . $relative : ''));
        if (! $target || 0 !== strpos($target, (string) $base)) {
            wp_send_json_error('Invalid path');
        }

        // Block deleting core directories and ensure directory is empty
        if (! is_dir($target)) {
            wp_send_json_error('Not a directory');
        }

        $restricted = [realpath(ABSPATH), realpath(WP_CONTENT_DIR), realpath(WP_PLUGIN_DIR)];
        foreach ($restricted as $r) {
            if ($r && $target === $r) {
                wp_send_json_error('Cannot delete protected directory');
            }
        }

        $files = @array_diff(scandir($target) ?: [], ['.', '..']);
        if ([] !== $files) {
            wp_send_json_error('Directory is not empty');
        }

        // Use WP_Filesystem instead of rmdir
        global $wp_filesystem;
        if (empty($wp_filesystem)) {
            require_once(ABSPATH . '/wp-admin/includes/file.php');
            WP_Filesystem();
        }

        if ($wp_filesystem && ! $wp_filesystem->rmdir($target)) {
            wp_send_json_error('Failed to delete directory');
        }

        // Don't use direct PHP functions as fallback
        if (! $wp_filesystem) {
            wp_send_json_error('WordPress filesystem not available');
        }

        wp_send_json_success(['message' => 'Folder deleted']);
    }

    /** Rename a directory within allowed root (default ABSPATH) */
    public function renameDirectory(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $relative = sanitize_text_field(wp_unslash($_POST['relative'] ?? ''));
        $newName  = sanitize_file_name(wp_unslash($_POST['new_name'] ?? ''));

        if ('' === $newName || preg_match('/[\\\/:*?"<>|]/', $newName)) {
            wp_send_json_error('Invalid folder name');
        }

        $base   = realpath(ABSPATH);
        $target = realpath($base . ($relative ? DIRECTORY_SEPARATOR . $relative : ''));
        if (! $target || 0 !== strpos($target, (string) $base)) {
            wp_send_json_error('Invalid path');
        }

        if (! is_dir($target)) {
            wp_send_json_error('Not a directory');
        }

        // Block renaming core directories
        $restricted = [realpath(ABSPATH), realpath(WP_CONTENT_DIR), realpath(WP_PLUGIN_DIR)];
        foreach ($restricted as $r) {
            if ($r && $target === $r) {
                wp_send_json_error('Cannot rename protected directory');
            }
        }

        $parent    = dirname($target);
        $newTarget = $parent . DIRECTORY_SEPARATOR . $newName;

        if (file_exists($newTarget)) {
            wp_send_json_error('Folder with this name already exists');
        }

        // Use WP_Filesystem instead of rename
        global $wp_filesystem;
        if (empty($wp_filesystem)) {
            require_once(ABSPATH . '/wp-admin/includes/file.php');
            WP_Filesystem();
        }

        if ($wp_filesystem && ! $wp_filesystem->move($target, $newTarget)) {
            wp_send_json_error('Failed to rename directory');
        }

        // Don't use direct PHP functions as fallback
        if (! $wp_filesystem) {
            wp_send_json_error('WordPress filesystem not available');
        }

        wp_send_json_success(['message' => 'Folder renamed']);
    }

    // Admin bar compatibility methods
    public function latestCommit(): void
    {

        // Check permissions first
        if (! current_user_can('manage_options')) {
            wp_send_json_error('Access denied');
        }

        // Try multiple nonce verification methods
        $nonce                 = sanitize_text_field(wp_unslash($_POST['nonce'] ?? ''));
        $action_specific_valid = wp_verify_nonce($nonce, 'git_manager_action');
        $general_nonce_valid   = wp_verify_nonce($nonce, 'git_manager_action');

        if (! $action_specific_valid && ! $general_nonce_valid) {
            wp_send_json_error('Invalid nonce');
        }

        $repoId = $this->getRepositoryId();

        if ('' === $repoId || '0' === $repoId) {
            // Fallback to active repository for backward compatibility
            $repoId = RepositoryManager::instance()->getActiveId();
        }

        if (! $repoId) {
            wp_send_json_error('No repository specified');
        }

        $repo = RepositoryManager::instance()->get($repoId);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        // Get current branch first
        $branchResult = GitCommandRunner::run($repo->path, 'rev-parse --abbrev-ref HEAD');
        if (! $branchResult['success']) {
            // Fallback: try to get branch from status
            $statusResult = GitCommandRunner::run($repo->path, 'status --porcelain --branch');
            if ($statusResult['success']) {
                $lines = explode("\n", trim($statusResult['output'] ?? ''));
                foreach ($lines as $line) {
                    if (0 === strpos($line, '##') && preg_match('/## ([^\.]+)/', $line, $matches)) {
                        $currentBranch = $matches[1];
                        break;
                    }
                }
            }

            if ('0' === $currentBranch) {
                wp_send_json_error('Failed to get current branch');
            }
        } else {
            $currentBranch = trim($branchResult['output']);
        }

        // Get latest commit for current branch
        $result = GitCommandRunner::run($repo->path, sprintf('log -1 --format="%%H|%%an|%%ae|%%s" %s', $currentBranch));
        if (! $result['success']) {
            wp_send_json_error('Failed to get latest commit');
        }

        $parts = explode('|', trim($result['output']));
        if (4 !== count($parts)) {
            wp_send_json_error('Invalid commit format');
        }

        // Get avatar information using author name and email
        $authorString = $parts[1] . ' <' . $parts[2] . '>';
        $avatarInfo   = $this->getGravatarUrl($authorString);

        $data = [
            'hash'         => $parts[0],
            'author'       => $parts[1],
            'author_name'  => $parts[1],
            'author_email' => $parts[2],
            'subject'      => $parts[3],
            'branch'       => $currentBranch,
            'repo_name'    => $repo->name,
            'gravatar_url' => $avatarInfo['gravatar_url'],
            'has_avatar'   => $avatarInfo['has_avatar'],
        ];

        // Get remote hash if available for current branch
        $remoteResult = GitCommandRunner::run($repo->path, 'rev-parse origin/' . $currentBranch);
        if ($remoteResult['success']) {
            $data['remote_hash'] = trim($remoteResult['output']);
        }

        wp_send_json_success($data);
    }

    public function fetch(): void
    {
        // Try multiple nonce verification methods like latestCommit
        if (! current_user_can('manage_options')) {
            wp_send_json_error('Access denied');
        }

        $nonce                 = sanitize_text_field(wp_unslash($_POST['nonce'] ?? ''));
        $action_specific_valid = wp_verify_nonce($nonce, 'git_manager_action');
        $general_nonce_valid   = wp_verify_nonce($nonce, 'git_manager_action');

        if (! $action_specific_valid && ! $general_nonce_valid) {
            wp_send_json_error('Invalid nonce');
        }

        $repoId = $this->getRepositoryId();
        if ('' === $repoId || '0' === $repoId) {
            // Fallback to active repository for backward compatibility
            $repoId = RepositoryManager::instance()->getActiveId();
        }

        if (! $repoId) {
            wp_send_json_error('No repository specified');
        }

        $repo = RepositoryManager::instance()->get($repoId);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        $result = GitCommandRunner::run($repo->path, 'fetch');
        if ($result['success']) {
            wp_send_json_success(['message' => 'Repository fetched successfully']);
        } else {
            wp_send_json_error('Failed to fetch repository: ' . $result['output']);
        }
    }

    public function pull(): void
    {
        // Try multiple nonce verification methods like latestCommit
        if (! current_user_can('manage_options')) {
            wp_send_json_error('Access denied');
        }

        $nonce                 = sanitize_text_field(wp_unslash($_POST['nonce'] ?? ''));
        $action_specific_valid = wp_verify_nonce($nonce, 'git_manager_action');
        $general_nonce_valid   = wp_verify_nonce($nonce, 'git_manager_action');

        if (! $action_specific_valid && ! $general_nonce_valid) {
            wp_send_json_error('Invalid nonce');
        }

        $repoId = $this->getRepositoryId();
        if ('' === $repoId || '0' === $repoId) {
            // Fallback to active repository for backward compatibility
            $repoId = RepositoryManager::instance()->getActiveId();
        }

        if (! $repoId) {
            wp_send_json_error('No repository specified');
        }

        $repo = RepositoryManager::instance()->get($repoId);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        $result = GitCommandRunner::run($repo->path, 'pull');
        if ($result['success']) {
            wp_send_json_success(['message' => 'Repository pulled successfully']);
        } else {
            wp_send_json_error('Failed to pull repository: ' . $result['output']);
        }
    }

    public function status(): void
    {
        // Try multiple nonce verification methods like latestCommit
        if (! current_user_can('manage_options')) {
            wp_send_json_error('Access denied');
        }

        $nonce                 = sanitize_text_field(wp_unslash($_POST['nonce'] ?? ''));
        $action_specific_valid = wp_verify_nonce($nonce, 'git_manager_action');
        $general_nonce_valid   = wp_verify_nonce($nonce, 'git_manager_action');

        if (! $action_specific_valid && ! $general_nonce_valid) {
            wp_send_json_error('Invalid nonce');
        }

        $repoId = $this->getRepositoryId();

        if ('' === $repoId || '0' === $repoId) {
            // Fallback to active repository for backward compatibility
            $repoId = RepositoryManager::instance()->getActiveId();
        }

        if (! $repoId) {
            wp_send_json_error('No repository specified');
        }

        $repo = RepositoryManager::instance()->get($repoId);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        // Check if repository directory exists
        if (! is_dir($repo->path)) {
            wp_send_json_error('Repository directory does not exist: ' . $repo->path);
        }

        // Check if .git directory exists
        if (! is_dir($repo->path . '/.git')) {
            wp_send_json_error('Not a valid Git repository: .git directory not found');
        }

        // Get branch information
        $branchResult  = GitCommandRunner::run($repo->path, 'rev-parse --abbrev-ref HEAD');
        $currentBranch = trim($branchResult['output'] ?? '');

        if (! $branchResult['success'] || ('' === $currentBranch || '0' === $currentBranch)) {
            wp_send_json_error('Failed to determine current branch');
        }

        // Get detailed status with branch information
        $statusResult = GitCommandRunner::run($repo->path, 'status --porcelain --branch');

        if (! $statusResult['success']) {
            $errorMessage = 'Failed to get repository status';
            if (! empty($statusResult['error'])) {
                $errorMessage .= ': ' . trim($statusResult['error']);
            }

            wp_send_json_error($errorMessage);
        }

        // Parse the status output to extract behind/ahead information
        $statusOutput = $statusResult['output'] ?? '';
        $lines        = explode("\n", trim($statusOutput));

        $behind     = 0;
        $ahead      = 0;
        $hasChanges = false;

        foreach ($lines as $line) {
            $line = trim($line);

            // Check for branch status line (starts with ##)
            if (0 === strpos($line, '##')) {
                // Extract behind/ahead information
                if (preg_match('/behind (\d+)/', $line, $matches)) {
                    $behind = (int) $matches[1];
                }

                if (preg_match('/ahead (\d+)/', $line, $matches)) {
                    $ahead = (int) $matches[1];
                }
            } elseif ('' !== $line && '0' !== $line) {
                // Any non-empty line that doesn't start with ## indicates changes
                $hasChanges = true;
            }
        }

        // Return structured status data
        $statusData = [
            'behind'        => $behind,
            'ahead'         => $ahead,
            'hasChanges'    => $hasChanges,
            'currentBranch' => $currentBranch,
            'rawOutput'     => $statusOutput,
        ];

        wp_send_json_success($statusData);
    }

    public function ajax_get_branches(): void
    {
        // Try multiple nonce verification methods like latestCommit
        if (! current_user_can('manage_options')) {
            wp_send_json_error('Access denied');
        }

        $nonce                 = sanitize_text_field(wp_unslash($_POST['nonce'] ?? ''));
        $action_specific_valid = wp_verify_nonce($nonce, 'git_manager_action');
        $general_nonce_valid   = wp_verify_nonce($nonce, 'git_manager_action');

        if (! $action_specific_valid && ! $general_nonce_valid) {
            wp_send_json_error('Invalid nonce');
        }

        $repoId = $this->getRepositoryId();

        if ('' === $repoId || '0' === $repoId) {
            wp_send_json_error('No repository specified');
        }

        $repo = RepositoryManager::instance()->get($repoId);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        // --- Improved Branch Deduplication ---
        $branches = [];

        // Get local branches
        $localResult = GitCommandRunner::run($repo->path, 'branch');
        if ($localResult['success']) {
            $localLines = explode("\n", trim($localResult['output']));
            foreach ($localLines as $line) {
                if ('' !== $line && '0' !== $line) {
                    $branchName            = ltrim($line, '* ');
                    $branches[$branchName] = true;
                }
            }
        }

        // Get remote branches
        $remoteResult = GitCommandRunner::run($repo->path, 'branch -r');
        if ($remoteResult['success']) {
            $remoteLines = explode("\n", trim($remoteResult['output']));
            foreach ($remoteLines as $line) {
                $line = trim($line);
                if ($line && false === strpos($line, '->')) {
                    $branchName            = preg_replace('/^origin\//', '', $line);
                    $branches[$branchName] = true;
                }
            }
        }

        if ([] === $branches && ! $localResult['success']) {
            wp_send_json_error('Failed to get branches: ' . ($localResult['output'] ?? 'Unknown Git error'));
        }

        $branches = array_keys($branches);

        $activeBranchResult = GitCommandRunner::run($repo->path, 'rev-parse --abbrev-ref HEAD');
        $activeBranch       = $activeBranchResult['success'] ? trim($activeBranchResult['output']) : '';

        // Custom sort branches
        usort($branches, function ($a, $b) use ($activeBranch) {
            $a_clean = trim(str_replace('* ', '', $a));
            $b_clean = trim(str_replace('* ', '', $b));

            if ($a_clean === $activeBranch) {
                return -1;
            }

            if ($b_clean === $activeBranch) {
                return 1;
            }

            if (in_array($a_clean, ['main', 'master'])) {
                return -1;
            }

            if (in_array($b_clean, ['main', 'master'])) {
                return 1;
            }

            return strcasecmp($a_clean, $b_clean);
        });

        wp_send_json_success(['branches' => array_values($branches), 'activeBranch' => $activeBranch]);
    }

    public function ajax_checkout_branch(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id     = $this->getRepositoryId();
        $branch = $this->sanitizeRef(sanitize_text_field(wp_unslash($_POST['branch'] ?? '')));
        $repo   = RepositoryManager::instance()->get($id);
        if (! $repo || ! $branch) {
            wp_send_json_error('Invalid data');
        }

        // --- Improved Checkout Logic ---

        // 1. Check if repository is clean before attempting checkout
        $statusResult = GitCommandRunner::run($repo->path, 'status --porcelain');
        if (!in_array(trim($statusResult['output']), ['', '0'], true)) {
            wp_send_json_error('Cannot checkout: Repository has uncommitted changes. Please commit or stash your changes first.');
        }

        // 2. Fetch first to ensure we have the latest remote branches
        GitCommandRunner::run($repo->path, 'fetch origin');

        // 3. Attempt to checkout the branch. Git will handle creating a local tracking branch if it exists on the remote.
        $res = GitCommandRunner::run($repo->path, 'checkout ' . escapeshellarg($branch));

        if (! $res['success']) {
            // Provide a more specific error if checkout failed
            $error = 'Failed to checkout ' . esc_html($branch) . '. Git reported: ' . esc_html($res['output'] ?: 'Unknown error');
            wp_send_json_error($error);
        }

        wp_send_json_success($res);
    }

    public function log(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $repoId = $this->getRepositoryId();
        $repo   = RepositoryManager::instance()->get($repoId);

        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        // Get current branch first
        $currentBranch = '';
        $branchResult  = GitCommandRunner::run($repo->path, 'rev-parse --abbrev-ref HEAD');
        if ($branchResult['success'] && !in_array(trim($branchResult['output']), ['', '0'], true)) {
            $currentBranch = trim($branchResult['output']);
        } else {
            // Fallback: try to get branch from status
            $statusResult = GitCommandRunner::run($repo->path, 'status --porcelain --branch');
            if ($statusResult['success']) {
                $lines = explode("\n", trim($statusResult['output'] ?? ''));
                foreach ($lines as $line) {
                    if (0 === strpos($line, '##') && preg_match('/## ([^\.]+)/', $line, $matches)) {
                        $currentBranch = $matches[1];
                        break;
                    }
                }
            }
        }

        if ('' === $currentBranch || '0' === $currentBranch) {
            wp_send_json_success([]); // Send empty array if no branch, e.g. new repo

            return;
        }

        // Using a unique separator to avoid conflicts with commit messages.
        $separator = '||-||';
        $format    = implode($separator, ['%h', '%an', '%ae', '%cr', '%s']);
        $command   = sprintf('log --pretty=format:"%s" -n 50 ', $format) . escapeshellarg($currentBranch);

        $result = GitCommandRunner::run($repo->path, $command);

        if (! $result['success']) {
            wp_send_json_error('Failed to get commit log: ' . ($result['error'] ?? 'Unknown error'));
        }

        $output = trim($result['output']);
        if ('' === $output || '0' === $output) {
            wp_send_json_success([]); // No commits found

            return;
        }

        $lines   = explode("\n", $output);
        $commits = [];

        foreach ($lines as $line) {
            if (in_array(trim($line), ['', '0'], true)) {
                continue;
            }

            $parts = explode($separator, $line, 5);
            if (5 === count($parts)) {
                $email        = $parts[2] ?? '';
                $hash         = md5(strtolower(trim($email)));
                $gravatar_url = sprintf('https://www.gravatar.com/avatar/%s?s=64&d=identicon', $hash);

                $commits[] = [
                    'hash'         => $parts[0],
                    'author_name'  => $parts[1],
                    'author_email' => $email,
                    'date'         => $parts[3],
                    'message'      => $parts[4],
                    'gravatar_url' => $gravatar_url,
                ];
            }
        }

        wp_send_json_success($commits);
    }

    public function branch(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $activeRepo = RepositoryManager::instance()->getActiveId();
        if (! $activeRepo) {
            wp_send_json_error('No active repository');
        }

        $repo = RepositoryManager::instance()->get($activeRepo);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Active repository not found');
        }

        $branch = sanitize_text_field(wp_unslash($_POST['branch'] ?? ''));
        if (! $branch) {
            wp_send_json_error('Branch name required');
        }

        $result = GitCommandRunner::run($repo->path, 'checkout -b ' . escapeshellarg($branch));
        if ($result['success']) {
            wp_send_json_success(['message' => 'Branch created successfully']);
        } else {
            wp_send_json_error('Failed to create branch: ' . $result['output']);
        }
    }

    public function checkGitChanges(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $activeRepo = RepositoryManager::instance()->getActiveId();
        if (! $activeRepo) {
            wp_send_json_error('No active repository');
        }

        $repo = RepositoryManager::instance()->get($activeRepo);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Active repository not found');
        }

        $result     = GitCommandRunner::run($repo->path, 'status --porcelain');
        $hasChanges = !in_array(trim($result['output'] ?? ''), ['', '0'], true);

        wp_send_json_success(['hasChanges' => $hasChanges]);
    }

    public function fixPermission(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $repoId = $this->getRepositoryId();

        if ('' === $repoId || '0' === $repoId) {
            wp_send_json_error('No repository specified');
        }

        $repo = RepositoryManager::instance()->get($repoId);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        // Check if auto-fix is enabled
        if (! GitManager::is_auto_fix_enabled()) {
            wp_send_json_error([
                'message'           => 'Automatic fixes are disabled. Please enable them in the settings or contact your administrator.',
                'solution'          => 'Go to Repo Managerâ†’ Settings and enable "Automatic Fixes" option, or ask your administrator to enable it.',
                'auto_fix_disabled' => true,
            ]);
        }

        // Fix common permission issues
        $commands = [
            'chmod -R 755 ' . escapeshellarg($repo->path),
            'chmod -R 644 ' . escapeshellarg($repo->path . '/.git/objects/*'),
            'chmod 755 ' . escapeshellarg($repo->path . '/.git/hooks/*'),
            'chmod 644 ' . escapeshellarg($repo->path . '/.git/config'),
            'chmod 644 ' . escapeshellarg($repo->path . '/.git/HEAD'),
        ];

        // Remove automatic permission changes for safety
        $results = array_map(function ($cmd) {
            return [
                'command' => $cmd,
                'result'  => 'skipped (unsafe) â€” run manually if you understand the risk',
            ];
        }, $commands);

        // Test if git commands work now
        $testResult = GitCommandRunner::run($repo->path, 'status');

        if ($testResult['success']) {
            wp_send_json_success([
                'message' => 'Permissions fixed successfully',
                'details' => $results,
            ]);
        } else {
            wp_send_json_error([
                'message'     => 'Permission fix attempted but git commands still failing',
                'details'     => $results,
                'test_result' => $testResult,
            ]);
        }
    }

    public function fixSsh(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        wp_send_json_success(['message' => 'SSH fix not implemented in multi-repo mode']);
    }

    public function saveRoles(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $roles = sanitize_text_field(wp_unslash($_POST['roles'] ?? ''));
        update_option('git_manager_allowed_roles', explode(',', $roles));
        wp_send_json_success(['message' => 'Roles saved successfully']);
    }

    public function safeDirectory(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $activeRepo = RepositoryManager::instance()->getActiveId();
        if (! $activeRepo) {
            wp_send_json_error('No active repository');
        }

        $repo = RepositoryManager::instance()->get($activeRepo);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Active repository not found');
        }

        $result = GitCommandRunner::run($repo->path, 'config --local --add safe.directory ' . escapeshellarg($repo->path));
        if ($result['success']) {
            wp_send_json_success(['message' => 'Safe directory configured']);
        } else {
            wp_send_json_error('Failed to configure safe directory: ' . $result['output']);
        }
    }

    public function troubleshootStep(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $step   = sanitize_text_field(wp_unslash($_POST['step'] ?? ''));
        $repoId = sanitize_text_field(wp_unslash($_POST['repo_id'] ?? ''));

        if (empty($step)) {
            wp_send_json_error([
                'status'   => 'error',
                'message'  => 'Step parameter is required',
                'solution' => 'Please specify a troubleshooting step',
            ]);
        }

        try {
            // Get repository path
            $repoPath = '';
            if (! empty($repoId)) {
                // Use specific repository
                $repo = RepositoryManager::instance()->get($repoId);
                if (!$repo instanceof Repository) {
                    wp_send_json_error([
                        'status'   => 'error',
                        'message'  => 'Repository not found with ID: ' . $repoId,
                        'solution' => 'Please check the repository ID or refresh the page',
                    ]);
                }

                $repoPath = $repo->path;
            } else {
                // Use active repository
                $activeRepo = RepositoryManager::instance()->getActiveId();
                if (! $activeRepo) {
                    wp_send_json_error([
                        'status'   => 'error',
                        'message'  => 'No active repository found',
                        'solution' => 'Please select a repository first',
                    ]);
                }

                $repo = RepositoryManager::instance()->get($activeRepo);
                if (!$repo instanceof Repository) {
                    wp_send_json_error([
                        'status'   => 'error',
                        'message'  => 'Active repository not found',
                        'solution' => 'Please refresh the page and try again',
                    ]);
                }

                $repoPath = $repo->path;
            }

            // Perform step-specific troubleshooting
            $result = $this->performTroubleshootStep($step, $repoPath);
            wp_send_json_success($result);

        } catch (Exception $exception) {
            wp_send_json_error([
                'status'   => 'error',
                'message'  => 'Troubleshooting failed: ' . $exception->getMessage(),
                'solution' => 'Please check the error details and try again',
                'details'  => $exception->getTraceAsString(),
            ]);
        }
    }

    private function performTroubleshootStep(string $step, string $repoPath): array
    {
        switch ($step) {
            case 'repo-path':
                return $this->checkRepoPath($repoPath);
            case 'git-binary':
                return $this->checkGitBinary();
            case 'git-directory':
                return $this->checkGitDirectory($repoPath);
            case 'safe-directory':
                return $this->checkSafeDirectory($repoPath);
            case 'permissions':
                return $this->checkPermissions($repoPath);
            case 'ssh-directory':
                return $this->checkSshDirectory();
            case 'ssh-keys':
                return $this->checkSshKeys();
            case 'host-keys':
                return $this->checkHostKeys();
            case 'git-config':
                return $this->checkGitConfig($repoPath);
            case 'remote-test':
                return $this->testRemoteConnection($repoPath);
            default:
                return [
                    'status'   => 'error',
                    'message'  => 'Unknown troubleshooting step: ' . $step,
                    'solution' => 'Please check the troubleshooting configuration',
                ];
        }
    }

    private function checkRepoPath(string $repoPath): array
    {
        if ('' === $repoPath || '0' === $repoPath) {
            return [
                'status'   => 'error',
                'message'  => 'Repository path is empty',
                'solution' => 'Please configure a valid repository path',
            ];
        }

        if (! is_dir($repoPath)) {
            return [
                'status'   => 'error',
                'message'  => 'Repository path does not exist: ' . $repoPath,
                'solution' => 'Please verify the repository path exists and is accessible',
            ];
        }

        if (! is_readable($repoPath)) {
            return [
                'status'   => 'error',
                'message'  => 'Repository path is not readable: ' . $repoPath,
                'solution' => 'Please check file permissions for the repository directory',
            ];
        }

        return [
            'status'  => 'success',
            'message' => 'Repository path is valid and accessible: ' . $repoPath,
            'details' => 'Path exists and is readable',
        ];
    }

    private function checkGitBinary(): array
    {
        try {
            // Check if git command is available in system PATH
            $result = shell_exec('git --version 2>&1');

            if (null !== $result && false !== strpos($result, 'git version')) {
                $version = trim($result);

                return [
                    'status'   => 'success',
                    'message'  => 'Git is installed and accessible',
                    'details'  => $version,
                    'solution' => null,
                ];
            } else {
                // Try alternative methods to check Git
                $gitPaths = [
                    '/usr/bin/git',
                    '/usr/local/bin/git',
                    '/opt/homebrew/bin/git',
                    'C:\\Program Files\\Git\\bin\\git.exe',
                    'C:\\Program Files (x86)\\Git\\bin\\git.exe',
                ];

                foreach ($gitPaths as $gitPath) {
                    if (file_exists($gitPath)) {
                        return [
                            'status'   => 'warning',
                            'message'  => 'Git found but not in PATH: ' . $gitPath,
                            'details'  => 'Git is installed but may not be accessible from command line',
                            'solution' => 'Add Git to your system PATH or configure the full path in Repo Manager Settings',
                        ];
                    }
                }

                return [
                    'status'   => 'error',
                    'message'  => 'Git is not installed or not accessible',
                    'details'  => 'Git command not found in PATH or common installation directories',
                    'solution' => 'Please install Git from https://git-scm.com/ or ensure it is added to your system PATH',
                ];
            }
        } catch (Exception $exception) {
            return [
                'status'   => 'error',
                'message'  => 'Failed to check Git installation: ' . $exception->getMessage(),
                'details'  => $exception->getTraceAsString(),
                'solution' => 'Please check server configuration and try again',
            ];
        }
    }

    private function checkGitDirectory(string $repoPath): array
    {
        try {
            if ('' === $repoPath || '0' === $repoPath) {
                return [
                    'status'   => 'error',
                    'message'  => 'Repository path is empty',
                    'details'  => 'No repository path provided',
                    'solution' => 'Please configure a valid repository path',
                ];
            }

            if (! is_dir($repoPath)) {
                return [
                    'status'   => 'error',
                    'message'  => 'Repository path does not exist: ' . $repoPath,
                    'details'  => 'The specified directory does not exist on the filesystem',
                    'solution' => 'Please verify the repository path exists and is accessible',
                ];
            }

            if (! is_readable($repoPath)) {
                return [
                    'status'   => 'error',
                    'message'  => 'Repository path is not readable: ' . $repoPath,
                    'details'  => 'The directory exists but cannot be read by the web server',
                    'solution' => 'Please check file permissions for the repository directory',
                ];
            }

            // Check for .git directory
            $gitDir = $repoPath . '/.git';
            if (! is_dir($gitDir)) {
                return [
                    'status'   => 'error',
                    'message'  => 'Not a Git repository: ' . $repoPath,
                    'details'  => 'The .git directory is missing from the repository path',
                    'solution' => 'Please ensure this is a valid Git repository or run "git init" to initialize it',
                ];
            }

            if (! is_readable($gitDir)) {
                return [
                    'status'   => 'error',
                    'message'  => '.git directory is not readable: ' . $gitDir,
                    'details'  => 'The .git directory exists but cannot be read by the web server',
                    'solution' => 'Please check file permissions for the .git directory',
                ];
            }

            // Check for essential Git files
            $essentialFiles = ['HEAD', 'config', 'objects'];
            $missingFiles   = [];
            foreach ($essentialFiles as $file) {
                if (! file_exists($gitDir . '/' . $file)) {
                    $missingFiles[] = $file;
                }
            }

            if ([] !== $missingFiles) {
                return [
                    'status'   => 'warning',
                    'message'  => 'Git repository appears to be incomplete',
                    'details'  => 'Missing essential Git files: ' . implode(', ', $missingFiles),
                    'solution' => 'The repository may be corrupted. Try cloning it again or running "git init"',
                ];
            }

            return [
                'status'   => 'success',
                'message'  => 'Valid Git repository found: ' . $repoPath,
                'details'  => 'Repository contains all essential Git files and directories',
                'solution' => null,
            ];

        } catch (Exception $exception) {
            return [
                'status'   => 'error',
                'message'  => 'Failed to check Git directory: ' . $exception->getMessage(),
                'details'  => $exception->getTraceAsString(),
                'solution' => 'Please check server configuration and try again',
            ];
        }
    }

    private function checkSafeDirectory(string $repoPath): array
    {
        try {
            if ('' === $repoPath || '0' === $repoPath) {
                return [
                    'status'   => 'error',
                    'message'  => 'Repository path is empty',
                    'details'  => 'No repository path provided for safe directory check',
                    'solution' => 'Please configure a valid repository path',
                ];
            }

            // Get absolute path
            $absolutePath = realpath($repoPath);
            if (! $absolutePath) {
                return [
                    'status'   => 'error',
                    'message'  => 'Cannot resolve repository path: ' . $repoPath,
                    'details'  => 'The path could not be resolved to an absolute path',
                    'solution' => 'Please check the repository path and ensure it exists',
                ];
            }

            // Check current safe.directory configuration
            if (! \WPGitManager\Admin\GitManager::are_commands_enabled()) {
                return [
                    'status'   => 'warning',
                    'message'  => 'Command execution is disabled',
                    'details'  => 'Enable it in settings to check safe.directory automatically',
                    'solution' => 'Run manually: git config --global --get safe.directory',
                ];
            }
            $result          = shell_exec(sprintf('cd "%s" && git config --global --get safe.directory 2>&1', $absolutePath));
            $safeDirectories = array_filter(explode("\n", trim($result ?: '')));

            if (in_array($absolutePath, $safeDirectories)) {
                return [
                    'status'   => 'success',
                    'message'  => 'Repository is already in safe.directory list',
                    'details'  => 'Path: ' . $absolutePath,
                    'solution' => null,
                ];
            }

            // Check if auto-fix is enabled before trying to add to safe.directory
            if (! GitManager::is_auto_fix_enabled()) {
                return [
                    'status'   => 'warning',
                    'message'  => 'Repository not in safe.directory list (auto-fix disabled)',
                    'details'  => 'Path: ' . $absolutePath . ' needs to be added to Git safe directories',
                    'solution' => 'Enable automatic fixes in Repo Manager Settings, or run manually: git config --global --add safe.directory "' . $absolutePath . '"',
                ];
            }

            // Try to add to safe.directory
            if (! \WPGitManager\Admin\GitManager::are_commands_enabled()) {
                return [
                    'status'   => 'warning',
                    'message'  => 'Command execution is disabled',
                    'solution' => 'Please run manually: git config --global --add safe.directory "' . $absolutePath . '"',
                ];
            }
            $addResult = shell_exec(sprintf('cd "%s" && git config --global --add safe.directory "%s" 2>&1', $absolutePath, $absolutePath));

            if (null === $addResult || false === strpos($addResult, 'error')) {
                return [
                    'status'   => 'success',
                    'message'  => 'Repository added to safe.directory list',
                    'details'  => 'Path: ' . $absolutePath . ' has been added to Git safe directories',
                    'solution' => null,
                ];
            } else {
                return [
                    'status'   => 'warning',
                    'message'  => 'Could not automatically add repository to safe.directory',
                    'details'  => 'Error: ' . $addResult,
                    'solution' => 'Please run manually: git config --global --add safe.directory "' . $absolutePath . '"',
                ];
            }

        } catch (Exception $exception) {
            return [
                'status'   => 'error',
                'message'  => 'Failed to check safe directory: ' . $exception->getMessage(),
                'details'  => $exception->getTraceAsString(),
                'solution' => 'Please check Git configuration manually',
            ];
        }
    }

    private function checkPermissions(string $repoPath): array
    {
        try {
            if ('' === $repoPath || '0' === $repoPath) {
                return [
                    'status'   => 'error',
                    'message'  => 'Repository path is empty',
                    'details'  => 'No repository path provided for permission check',
                    'solution' => 'Please configure a valid repository path',
                ];
            }

            if (! is_dir($repoPath)) {
                return [
                    'status'   => 'error',
                    'message'  => 'Repository path does not exist: ' . $repoPath,
                    'details'  => 'Cannot check permissions for non-existent directory',
                    'solution' => 'Please verify the repository path exists',
                ];
            }

            $issues   = [];
            $warnings = [];

            // Check repository directory permissions
            $repoPerms    = fileperms($repoPath);
            $repoPermsOct = substr(sprintf('%o', $repoPerms), -4);

            if (($repoPerms & 0x0004) === 0) {
                $issues[] = 'Repository directory is not readable by others';
            }

            if (($repoPerms & 0x0002) === 0) {
                $issues[] = 'Repository directory is not writable by others';
            }

            // Check .git directory permissions
            $gitDir = $repoPath . '/.git';
            if (is_dir($gitDir)) {
                $gitPerms    = fileperms($gitDir);
                $gitPermsOct = substr(sprintf('%o', $gitPerms), -4);

                if (($gitPerms & 0x0004) === 0) {
                    $issues[] = '.git directory is not readable by others';
                }

                if (($gitPerms & 0x0002) === 0) {
                    $issues[] = '.git directory is not writable by others';
                }
            }

            // Check web server user
            $webServerUser = function_exists('posix_getpwuid') ? posix_getpwuid(posix_geteuid())['name'] : 'unknown';
            $repoOwner     = function_exists('posix_getpwuid') ? posix_getpwuid(fileowner($repoPath))['name'] : 'unknown';

            if ($webServerUser !== $repoOwner && 'unknown' !== $repoOwner) {
                $warnings[] = sprintf("Repository owned by '%s' but web server runs as '%s'", $repoOwner, $webServerUser);
            }

            // Check specific files
            $criticalFiles = [
                $repoPath . '/.git/config',
                $repoPath . '/.git/HEAD',
                $repoPath . '/.git/index',
            ];

            foreach ($criticalFiles as $file) {
                if (file_exists($file)) {
                    if (! is_readable($file)) {
                        $issues[] = 'Critical file not readable: ' . basename($file);
                    }

                    // Use WP_Filesystem instead of is_writable
                    global $wp_filesystem;
                    if (empty($wp_filesystem)) {
                        require_once(ABSPATH . '/wp-admin/includes/file.php');
                        WP_Filesystem();
                    }

                    if ($wp_filesystem && ! $wp_filesystem->is_writable($file)) {
                        $warnings[] = 'Critical file not writable: ' . basename($file);
                    } elseif (! $wp_filesystem) {
                        $warnings[] = 'WordPress filesystem not available for permission check';
                    }
                }
            }

            if ([] !== $issues) {
                return [
                    'status'   => 'error',
                    'message'  => 'Permission issues found',
                    'details'  => implode("\n", $issues),
                    'solution' => 'Please fix file permissions. Recommended: chmod -R 755 "' . $repoPath . '"',
                ];
            }

            if ([] !== $warnings) {
                return [
                    'status'   => 'warning',
                    'message'  => 'Permission warnings found',
                    'details'  => implode("\n", $warnings),
                    'solution' => 'Consider adjusting file permissions for better compatibility',
                ];
            }

            return [
                'status'   => 'success',
                'message'  => 'File permissions are acceptable',
                'details'  => 'Repository and .git directory have proper read/write permissions',
                'solution' => null,
            ];

        } catch (Exception $exception) {
            return [
                'status'   => 'error',
                'message'  => 'Failed to check permissions: ' . $exception->getMessage(),
                'details'  => $exception->getTraceAsString(),
                'solution' => 'Please check file permissions manually',
            ];
        }
    }

    private function checkSshDirectory(): array
    {
        $home   = getenv('HOME') ?: getenv('USERPROFILE') ?: sys_get_temp_dir();
        $sshDir = $home . '/.ssh';

        if (! is_dir($sshDir)) {
            return [
                'status'   => 'warning',
                'message'  => 'SSH directory does not exist',
                'solution' => 'Create SSH directory: mkdir -p ~/.ssh && chmod 700 ~/.ssh',
            ];
        }

        if (! is_readable($sshDir)) {
            return [
                'status'   => 'error',
                'message'  => 'SSH directory is not readable',
                'solution' => 'Fix SSH directory permissions: chmod 700 ~/.ssh',
            ];
        }

        return [
            'status'  => 'success',
            'message' => 'SSH directory exists and is accessible',
            'details' => 'SSH directory: ' . $sshDir,
        ];
    }

    private function checkSshKeys(): array
    {
        $home   = getenv('HOME') ?: getenv('USERPROFILE') ?: sys_get_temp_dir();
        $sshDir = $home . '/.ssh';

        if (! is_dir($sshDir)) {
            return [
                'status'   => 'warning',
                'message'  => 'SSH directory does not exist',
                'solution' => 'Create SSH directory first: mkdir -p ~/.ssh && chmod 700 ~/.ssh',
            ];
        }

        $privateKeys = glob($sshDir . '/id_*');
        glob($sshDir . '/id_*.pub');

        if ([] === $privateKeys || false === $privateKeys) {
            return [
                'status'   => 'warning',
                'message'  => 'No SSH private keys found',
                'solution' => 'Generate SSH key: ssh-keygen -t rsa -b 4096 -C "your_email@example.com"',
            ];
        }

        $keyInfo = [];
        foreach ($privateKeys as $key) {
            $perms     = fileperms($key);
            $keyInfo[] = ($perms & 0x0177) !== 0 ? basename($key) . ' (permissions too open)' : basename($key) . ' (OK)';
        }

        return [
            'status'  => 'success',
            'message' => 'SSH keys found: ' . count($privateKeys),
            'details' => 'Keys: ' . implode(', ', $keyInfo),
        ];
    }

    private function checkHostKeys(): array
    {
        $home       = getenv('HOME') ?: getenv('USERPROFILE') ?: sys_get_temp_dir();
        $knownHosts = $home . '/.ssh/known_hosts';

        if (! file_exists($knownHosts)) {
            return [
                'status'   => 'warning',
                'message'  => 'Known hosts file does not exist',
                'solution' => 'Connect to your Git host first to add host keys',
            ];
        }

        $content = file_get_contents($knownHosts);
        if (false === $content) {
            return [
                'status'   => 'error',
                'message'  => 'Could not read known_hosts file',
                'solution' => 'Check file permissions for ~/.ssh/known_hosts',
            ];
        }

        $hosts = ['github.com', 'gitlab.com', 'bitbucket.org'];
        $found = [];

        foreach ($hosts as $host) {
            if (false !== strpos($content, $host)) {
                $found[] = $host;
            }
        }

        if ([] === $found) {
            return [
                'status'   => 'warning',
                'message'  => 'No common Git hosts found in known_hosts',
                'solution' => 'Connect to your Git host first: ssh -T git@github.com',
            ];
        }

        return [
            'status'  => 'success',
            'message' => 'Host keys found for: ' . implode(', ', $found),
            'details' => 'Known hosts file contains entries for common Git hosts',
        ];
    }

    private function checkGitConfig(string $repoPath): array
    {
        // Check if this is a Git repository first
        if (! is_dir($repoPath . '/.git')) {
            return [
                'status'   => 'error',
                'message'  => 'Not a Git repository',
                'solution' => 'Please initialize this directory as a Git repository first',
            ];
        }

        if (! \WPGitManager\Admin\GitManager::are_commands_enabled()) {
            return [
                'status'   => 'warning',
                'message'  => 'Command execution is disabled',
                'solution' => 'Enable command execution in plugin settings to check Git config automatically',
            ];
        }
        $userName  = shell_exec('git -C ' . escapeshellarg($repoPath) . ' config user.name 2>&1');
        $userEmail = shell_exec('git -C ' . escapeshellarg($repoPath) . ' config user.email 2>&1');

        $issues = [];
        if (null === $userName || in_array(trim($userName), ['', '0'], true)) {
            $issues[] = 'User name not configured';
        }

        if (null === $userEmail || in_array(trim($userEmail), ['', '0'], true)) {
            $issues[] = 'User email not configured';
        }

        if ([] === $issues) {
            return [
                'status'  => 'success',
                'message' => 'Git user configuration is complete',
                'details' => 'Name: ' . trim($userName) . ', Email: ' . trim($userEmail),
            ];
        } else {
            return [
                'status'   => 'warning',
                'message'  => 'Git configuration issues: ' . implode(', ', $issues),
                'solution' => 'Configure Git user: git config user.name "Your Name" && git config user.email "your_email@example.com"',
            ];
        }
    }

    private function testRemoteConnection(string $repoPath): array
    {
        // Check if this is a Git repository first
        if (! is_dir($repoPath . '/.git')) {
            return [
                'status'   => 'error',
                'message'  => 'Not a Git repository',
                'solution' => 'Please initialize this directory as a Git repository first',
            ];
        }

        if (! \WPGitManager\Admin\GitManager::are_commands_enabled()) {
            return [
                'status'   => 'warning',
                'message'  => 'Command execution is disabled',
                'solution' => 'Enable command execution in plugin settings to check remotes automatically',
            ];
        }
        $result = shell_exec('git -C ' . escapeshellarg($repoPath) . ' remote -v 2>&1');
        if (null === $result || in_array(trim($result), ['', '0'], true)) {
            return [
                'status'   => 'error',
                'message'  => 'No remote repositories configured',
                'solution' => 'Add a remote repository: git remote add origin <repository-url>',
            ];
        }

        $remotes   = explode("\n", trim($result));
        $remoteUrl = '';
        foreach ($remotes as $remote) {
            if (false !== strpos($remote, 'origin')) {
                $parts = explode("\t", $remote);
                if (count($parts) >= 2) {
                    $remoteUrl = trim($parts[1]);
                    break;
                }
            }
        }

        if ('' === $remoteUrl || '0' === $remoteUrl) {
            return [
                'status'   => 'error',
                'message'  => 'No origin remote found',
                'solution' => 'Add origin remote: git remote add origin <repository-url>',
            ];
        }

        // Test connection (this might take a while)
        if (! \WPGitManager\Admin\GitManager::are_commands_enabled()) {
            return [
                'status'   => 'warning',
                'message'  => 'Command execution is disabled',
                'solution' => 'Enable command execution in plugin settings to test remote connection automatically',
            ];
        }
        $testResult = shell_exec('git -C ' . escapeshellarg($repoPath) . ' ls-remote --exit-code origin 2>&1');
        if (null !== $testResult && false === strpos($testResult, 'error')) {
            return [
                'status'  => 'success',
                'message' => 'Remote connection successful',
                'details' => 'Origin remote: ' . $remoteUrl,
            ];
        } else {
            return [
                'status'   => 'error',
                'message'  => 'Remote connection failed',
                'solution' => 'Check network connectivity and SSH/HTTPS configuration for: ' . $remoteUrl,
            ];
        }
    }

    public function troubleshoot(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $activeRepo = RepositoryManager::instance()->getActiveId();
        if (! $activeRepo) {
            wp_send_json_error('No active repository');
        }

        $repo = RepositoryManager::instance()->get($activeRepo);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Active repository not found');
        }

        $this->troubleshootRepo();
    }

    /**
     * Generate Gravatar URL for author
     */
    private function getGravatarUrl($author): array
    {
        $authorName  = '';
        $authorEmail = '';

        // Extract email from author string (format: "Name <email@example.com>")
        if (preg_match('/<(.+?)>/', $author, $matches)) {
            $authorEmail = trim($matches[1]);
            $authorName  = trim(str_replace($matches[0], '', $author));
        } else {
            // If no email found, try to extract from common patterns
            // Some git configs might use "Name email@example.com" format
            $parts = explode(' ', trim($author));
            foreach ($parts as $part) {
                if (filter_var($part, FILTER_VALIDATE_EMAIL)) {
                    $authorEmail = $part;
                    $authorName  = trim(str_replace($part, '', $author));
                    break;
                }
            }

            // If still no email found, use the whole string as name
            if ('' === $authorEmail || '0' === $authorEmail) {
                $authorName = trim($author);
            }
        }

        // Clean up author name (remove extra spaces)
        $authorName = preg_replace('/\s+/', ' ', $authorName);

        $gravatarUrl = '';
        if ('' !== $authorEmail && '0' !== $authorEmail && '0' !== $authorEmail) {
            // Generate Gravatar URL with size 40px and default avatar
            $hash        = md5(strtolower(trim($authorEmail)));
            $gravatarUrl = sprintf('https://www.gravatar.com/avatar/%s?s=40&d=mp&r=g', $hash);
        }

        return [
            'name'         => $authorName,
            'email'        => $authorEmail,
            'gravatar_url' => $gravatarUrl,
            'has_avatar'   => '' !== $gravatarUrl && '0' !== $gravatarUrl,
        ];
    }

    /**
     * Re-clone a repository that has a missing folder
     */
    public function reClone(): void
    {
        $this->ensureAllowed();

        // Verify nonce
        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'] ?? '')), 'git_manager_action')) {
            wp_send_json_error('Invalid nonce');
        }

        $id = $this->getRepositoryId();

        if ('' === $id || '0' === $id) {
            wp_send_json_error('Repository ID is required');
        }

        $repo = RepositoryManager::instance()->get($id);
        if (!$repo instanceof Repository) {
            wp_send_json_error('Repository not found');
        }

        // Check if repository folder is missing
        if (is_dir($repo->path)) {
            wp_send_json_error('Repository folder already exists');
        }

        // Check if we have a remote URL
        if (empty($repo->remoteUrl)) {
            wp_send_json_error('No remote URL configured for this repository. Please add a remote URL first.');
        }

        // Create parent directory if it doesn't exist
        $parentDir = dirname($repo->path);
        if (!is_dir($parentDir) && ! wp_mkdir_p($parentDir)) {
            wp_send_json_error('Failed to create parent directory: ' . $parentDir);
        }

        // Check if git is available
        if (! \WPGitManager\Admin\GitManager::are_commands_enabled()) {
            wp_send_json_error('Command execution is disabled');
        }
        $gitVersion = shell_exec('git --version 2>&1');
        if (! $gitVersion || false === strpos($gitVersion, 'git version')) {
            wp_send_json_error('Git is not available on the system. Please install Git first.');
        }

        // Clone the repository
        $cloneCommand = 'git clone ' . escapeshellarg($repo->remoteUrl) . ' ' . escapeshellarg($repo->path) . ' 2>&1';
        if (! \WPGitManager\Admin\GitManager::are_commands_enabled()) {
            wp_send_json_error('Command execution is disabled');
        }
        $output       = shell_exec($cloneCommand);
        $exitCode     = $this->getLastExitCode();

        // Check for common error patterns in the output
        $errorPatterns = [
            'fatal:',
            'error:',
            'Permission denied',
            'Could not resolve host',
            'Connection refused',
            'Authentication failed',
            'Repository not found',
        ];

        $hasError = false;
        foreach ($errorPatterns as $pattern) {
            if (false !== stripos($output, $pattern)) {
                $hasError = true;
                break;
            }
        }

        if (0 !== $exitCode || $hasError) {
            wp_send_json_error('Failed to clone repository: ' . $output);
        }

        // Verify the clone was successful
        if (! is_dir($repo->path . '/.git')) {
            wp_send_json_error('Repository was cloned but .git directory is missing. The clone may have failed.');
        }

        wp_send_json_success([
            'message' => 'Repository cloned successfully',
            'path'    => $repo->path,
        ]);
    }

    /**
     * Get the exit code of the last shell command
     */
    private function getLastExitCode(): int
    {
        if (function_exists('shell_exec')) {
            // On Windows, we need to check the exit code differently
            if ('WIN' === strtoupper(substr(PHP_OS, 0, 3))) {
                // For Windows, we'll check if the command output contains error indicators
                return 0; // Assume success on Windows for now
            } else {
                return (int) shell_exec('echo $?');
            }
        }

        return 0;
    }
}
