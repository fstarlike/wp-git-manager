<?php

if (! defined('ABSPATH')) {
    exit;
}

require_once GIT_MANAGER_PATH.'includes/class-git-manager-utils.php';
class Git_Manager_Ajax
{
    /**
     * Manually add current repo path as safe.directory
     */
    public function safe_directory()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_safe_directory');
        $path = $this->get_repo_path();
        if (! is_dir($path)) {
            wp_send_json_error(__('Invalid repository path.', 'git-manager'));
        }
        $home = getenv('USERPROFILE');
        if (! $home) {
            $home = getenv('HOMEPATH');
        }
        if (! $home) {
            $home = sys_get_temp_dir();
        }
        // Use --local only if .git exists
        $gitDir = $path.'/.git';
        if (! is_dir($gitDir)) {
            $debug = 'Checked path: '.$path.' | .git exists: '.(file_exists($gitDir) ? 'yes' : 'no').' | is_dir: '.(is_dir($gitDir) ? 'yes' : 'no');
            wp_send_json_error('This directory is not a git repository (.git not found).<br><small>'.esc_html($debug).'</small>');
        }
        $cmd = $this->build_git_cmd('config --local --add safe.directory '.escapeshellarg($path), $path);
        $output = shell_exec($cmd);
        if (strpos($output, '--local can only be used inside a git repository') !== false) {
            // Try to add directly to .git/config (guarded)
            $configFile = rtrim($path, '/\\').'/.git/config';
            if (is_writable($configFile)) {
                if ($this->auto_fix_enabled()) {
                    $config = file_get_contents($configFile);
                    if (strpos($config, '[safe]') === false) {
                        $config .= "\n[safe]\n\tdirectory = ".$path."\n";
                        file_put_contents($configFile, $config);
                        $output = 'Safe directory added directly to .git/config.';
                    } else {
                        $output = 'Safe directory already set in .git/config.';
                    }
                } else {
                    if ($this->is_windows()) {
                        $output .= "Auto-fix disabled. To add safe.directory manually, run (in Git Bash or PowerShell):\n<pre>cd ".esc_html($path).' && git config --local --add safe.directory "'.esc_html($path).'"</pre>';
                    } else {
                        $output .= "Auto-fix disabled. To add safe.directory manually, run:\n<pre>cd ".esc_html($path)." && git config --local --add safe.directory '".esc_html($path)."'</pre>";
                    }
                }
            } else {
                $output .= "\nCould not write to .git/config. ";
                if ($this->auto_fix_enabled()) {
                    $output .= "Please ensure the webserver user can write to the file or run the command manually:\n<pre>cd ".esc_html($path)." && git config --local --add safe.directory '".esc_html($path)."'</pre>";
                } else {
                    $output .= "Auto-fix disabled. Run manually:\n<pre>cd ".esc_html($path)." && git config --local --add safe.directory '".esc_html($path)."'</pre>";
                }
            }
        } elseif (empty($output)) {
            $output = 'Safe directory added.';
        } else {
            $output .= '<br><small>'.shell_exec('whoami').'</small>';
        }
        wp_send_json_success(nl2br(esc_html($output)));
    }

    /**
     * AJAX: Check for git changes (using git whatchanged or git log)
     */
    public function check_git_changes()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_check_git_changes');
        $path = $this->get_repo_path();
        if (! is_dir($path)) {
            wp_send_json_error(__('Invalid repository path.', 'git-manager'));
        }
        // Use git log --pretty=format:"%H|%ad" -n 1 for last commit hash and date
        $output = $this->run_git_command('log --pretty=format:"%H|%ad" -n 1', $path);
        $output = trim($output);
        if (! $output) {
            wp_send_json_error('No commit found.');
        }
        [$hash, $date] = explode('|', $output, 2);
        wp_send_json_success([
            'hash' => trim($hash),
            'date' => trim($date),
        ]);
    }

    /**
     * AJAX: Troubleshooting - run all checks/fixes and log
     */
    public function troubleshoot()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_troubleshoot');
        $log = '';
        $path = $this->get_repo_path();
        $whoami = trim(shell_exec('whoami'));
        $home = getenv('HOME');
        if (! $home) {
            $home = getenv('USERPROFILE');
        }
        if (! $home) {
            $home = getenv('HOMEPATH');
        }
        if (! $home) {
            $home = sys_get_temp_dir();
        }
        $ssh_dir = rtrim($home, '/\\').'/.ssh';
        $log .= '<b>Troubleshooting started...</b><br>';

        // 1. Safe Directory
        $log .= '<hr><b>Safe Directory:</b><br>';
        $gitDir = $path.'/.git';
        if (! is_dir($gitDir)) {
            $log .= '❌ .git directory not found.<br>';
        } else {
            $cmd1 = $this->build_git_cmd('config --local --add safe.directory '.escapeshellarg($path), $path);
            $out1 = shell_exec($cmd1);
            if (empty($out1)) {
                $log .= '✔️ safe.directory set via git config.<br>';
            } else {
                $log .= '⚠️ git config failed: '.nl2br(esc_html($out1)).'<br>';
                // Try direct .git/config edit (guarded)
                $configFile = rtrim($path, '/\\').'/.git/config';
                if (is_writable($configFile)) {
                    if ($this->auto_fix_enabled()) {
                        $config = file_get_contents($configFile);
                        if (strpos($config, '[safe]') === false) {
                            $config .= "\n[safe]\n\tdirectory = ".$path."\n";
                            file_put_contents($configFile, $config);
                            $log .= '✔️ safe.directory added directly to .git/config.<br>';
                        } else {
                            $log .= 'ℹ️ safe.directory already set in .git/config.<br>';
                        }
                    } else {
                        if ($this->is_windows()) {
                            $log .= '⚠️ Auto-fix disabled: to add safe.directory manually run (in Git Bash or PowerShell):<br><pre>cd '.esc_html($path).' && git config --local --add safe.directory "'.esc_html($path).'"</pre><br>';
                        } else {
                            $log .= '⚠️ Auto-fix disabled: to add safe.directory manually run:\n<pre>cd '.esc_html($path).' && git config --local --add safe.directory "'.esc_html($path).'"</pre><br>';
                        }
                    }
                } else {
                    $log .= '❌ Could not write to .git/config.<br>';
                }
            }
        }

        // 2. Folder Permission
        $log .= '<hr><b>Folder Permission:</b><br>';
        if (! is_dir($path)) {
            $log .= '❌ Repo path not found.<br>';
        } else {
            if ($this->auto_fix_enabled()) {
                if ($this->is_windows()) {
                    $log .= '⚠️ Auto-fix is enabled but chown/chmod are not available on Windows; please run an elevated PowerShell and adjust ACLs if files are not accessible. Example:<br><pre>icacls "'.esc_html($path).'" /grant "%USERNAME%:(OI)(CI)F" /T</pre><br>';
                } else {
                    $cmd2 = 'chown -R '.escapeshellarg($whoami).' '.escapeshellarg($path).' 2>&1';
                    $out2 = shell_exec($cmd2);
                    if (empty($out2)) {
                        $log .= '✔️ Ownership changed to '.$whoami.'.<br>';
                    } else {
                        $log .= '⚠️ chown failed: '.nl2br(esc_html($out2)).'<br>';
                        // Try chmod 755 as fallback
                        $cmd2b = 'chmod -R 755 '.escapeshellarg($path).' 2>&1';
                        $out2b = shell_exec($cmd2b);
                        if (empty($out2b)) {
                            $log .= '✔️ chmod 755 applied as fallback.<br>';
                        } else {
                            $log .= '❌ chmod failed: '.nl2br(esc_html($out2b)).'<br>';
                        }
                    }
                }
            } else {
                if ($this->is_windows()) {
                    $log .= '⚠️ Auto-fix disabled: to fix permissions manually on Windows, run in an elevated PowerShell or use icacls to adjust access:<br><pre>icacls "'.esc_html($path).'" /grant "%USERNAME%:(OI)(CI)F" /T</pre><br>';
                } else {
                    $log .= '⚠️ Auto-fix disabled: to fix permissions manually run as root or via sudo:<br><pre>chown -R '.esc_html($whoami).' '.esc_html($path).'\nchmod -R 755 '.esc_html($path).'</pre><br>';
                }
            }
        }

        // 3. SSH/Host Key
        $log .= '<hr><b>SSH/Host Key:</b><br>';
        // Normalize .ssh path for is_dir check
        $ssh_dir_norm = rtrim($ssh_dir, '/\\');
        $ssh_created = false;
        if (! is_dir($ssh_dir_norm)) {
            if ($this->auto_fix_enabled()) {
                @mkdir($ssh_dir_norm, 0700, true);
                $ssh_created = true;
                $log .= '.ssh directory created.<br>';
            } else {
                $log .= '.ssh directory not found. Auto-create is disabled. Please create '.esc_html($ssh_dir_norm).' with 0700 permissions for the web user.<br>';
            }
        } else {
            $log .= '.ssh directory exists.<br>';
        }
        // Re-check after possible creation
        clearstatcache();
        $ssh_type = file_exists($ssh_dir_norm) ? (is_dir($ssh_dir_norm) ? 'Folder' : 'File') : 'Not exists';
        $ssh_stat = @stat($ssh_dir_norm);
        $ssh_owner = $ssh_stat ? (isset($ssh_stat['uid']) ? $ssh_stat['uid'] : null) : null;
        $current_uid = function_exists('posix_geteuid') ? posix_geteuid() : null;
        if (! $this->is_windows() && $ssh_owner !== null && $current_uid !== null && $ssh_owner !== $current_uid) {
            if ($this->auto_fix_enabled()) {
                @chown($ssh_dir_norm, $current_uid);
                $log .= '<span style="color:red">.ssh directory ownership was incorrect and has been fixed.</span><br>';
            } else {
                $log .= '<span style="color:red">.ssh directory ownership appears incorrect. Auto-fix disabled; run chown manually if needed.</span><br>';
            }
        }
        if (! $this->is_windows() && $this->auto_fix_enabled()) {
            @chmod($ssh_dir_norm, 0700);
        }
        $host = 'github.com';
        $known_hosts = $ssh_dir_norm.'/known_hosts';
        $scan_cmd = 'ssh-keyscan '.escapeshellarg($host).' 2>&1';
        $scan = '';
        if ($this->find_executable('ssh-keyscan')) {
            $scan = shell_exec($scan_cmd);
        } else {
            $log .= 'ssh-keyscan not found in PATH; skipping automatic host key retrieval on this system.<br>';
        }
        if ($scan && (! file_exists($known_hosts) || strpos(@file_get_contents($known_hosts), $host) === false)) {
            if ($this->auto_fix_enabled()) {
                @file_put_contents($known_hosts, $scan."\n", FILE_APPEND | LOCK_EX);
                $log .= 'Host key for '.$host.' added to known_hosts.<br>';
            } else {
                if ($this->is_windows()) {
                    $manualCmd = 'In Git Bash or PowerShell (with OpenSSH): ssh-keyscan '.esc_html($host).' >> "'.str_replace('\\', '\\\\', esc_html($known_hosts)).'"';
                } else {
                    $manualCmd = 'ssh-keyscan '.esc_html($host).' >> '.esc_html($known_hosts);
                }
                $log .= 'Host key for '.$host.' not present. Auto-add disabled; to add manually run:<br><pre>'.$manualCmd.'</pre>';
            }
        } elseif (file_exists($known_hosts) && strpos(@file_get_contents($known_hosts), $host) !== false) {
            $log .= 'Host key for '.$host.' already exists in known_hosts.<br>';
        } else {
            $log .= 'ssh-keyscan failed or not available.<br>';
        }
        if (file_exists($known_hosts)) {
            $kh_stat = @stat($known_hosts);
            $kh_owner = $kh_stat ? (isset($kh_stat['uid']) ? $kh_stat['uid'] : null) : null;
            if (! $this->is_windows() && $kh_owner !== null && $current_uid !== null && $kh_owner !== $current_uid) {
                if ($this->auto_fix_enabled()) {
                    @chown($known_hosts, $current_uid);
                    $log .= '<span style="color:red">known_hosts ownership was incorrect and has been fixed (set to current user).</span><br>';
                } else {
                    $log .= '<span style="color:red">known_hosts ownership appears incorrect. Auto-fix disabled; run chown manually if needed.</span><br>';
                }
            }
            if (! $this->is_windows() && $this->auto_fix_enabled()) {
                @chmod($known_hosts, 0644);
            }
        }
        // Check for private key
        $key_files = is_dir($ssh_dir_norm) ? glob($ssh_dir_norm.'/id_*') : [];
        $log .= $ssh_type.' '.$ssh_dir_norm.' contains: ';
        if ($key_files && is_array($key_files) && count($key_files) > 0) {
            $log .= implode(', ', array_map('basename', $key_files));
        } else {
            $log .= '(empty)';
        }
        $log .= '<br>';
        $has_key = false;
        if ($key_files) {
            foreach ($key_files as $kf) {
                $log .= 'Checking key file: '.basename($kf).'<br>';
                $log .= strpos($kf, '.pub') === false.' '.is_file($kf);
                if (strpos($kf, '.pub') === false && is_file($kf)) {
                    $has_key = true;
                    if ($this->auto_fix_enabled()) {
                        if (! $this->is_windows()) {
                            @chmod($kf, 0600);
                            @chown($kf, $current_uid);
                            $log .= 'SSH private key found: '.basename($kf).' (permissions fixed)<br>';
                        } else {
                            $log .= 'SSH private key found: '.basename($kf).' (on Windows automatic permission fixes are skipped).<br>';
                        }
                    } else {
                        $log .= 'SSH private key found: '.basename($kf).' (auto-permissions disabled).<br>';
                    }
                }
            }
        }
        if (! $has_key) {
            $log .= '<span style="color:red">No SSH private key found in .ssh directory. Please upload or generate one for user '.$whoami.'.</span><br>';
            if ($this->is_windows()) {
                $help = '<div style="color:#444; font-size:13px; background:#f9f9f9; border:1px solid #eee; padding:8px; margin:8px 0 0 0;">'
                    .'To enable SSH access for git on Windows, create or upload a private key (e.g. <b>id_rsa</b> or <b>id_ed25519</b>) in <b>'.esc_html($ssh_dir).'</b> for user <b>'.esc_html($whoami).'</b>.<br>'
                    .'You can do this in two ways:<br>'
                    .'<ol style="margin:0 0 0 18px; padding:0;">'
                        .'<li><b>Generate a new key using Git Bash or OpenSSH</b>:<br>'
                            .'<code>ssh-keygen -t ed25519 -f "'.esc_html($ssh_dir).'/id_ed25519" -N ""</code><br>'
                            .'<small>Run this in Git Bash or PowerShell (with OpenSSH).</small>'
                        .'</li>'
                        .'<li style="margin-top:6px"><b>Or upload your existing private key</b> to <b>'.esc_html($ssh_dir).'</b> and restrict access:<br>'
                            .'<code>icacls "'.esc_html($ssh_dir).'/id_rsa" /inheritance:r</code><br>'
                            .'<code>icacls "'.esc_html($ssh_dir).'/id_rsa" /grant:r "%USERNAME%:F"</code>'
                        .'</li>'
                    .'</ol>'
                    .'After that, copy the content of <code>'.esc_html($ssh_dir).'/id_ed25519.pub</code> (or id_rsa.pub) to your GitHub/GitLab SSH keys section and re-run Troubleshooting.'
                    .'</div>';
            } else {
                if ($this->is_windows()) {
                    $help = '<div style="color:#444; font-size:13px; background:#f9f9f9; border:1px solid #eee; padding:8px; margin:8px 0 0 0;">'
                        .'To enable SSH access for git on Windows, you must create or upload a private key (e.g. <b>id_rsa</b> or <b>id_ed25519</b>) in <b>'.esc_html($ssh_dir).'</b> for user <b>'.esc_html($whoami).'</b>.<br>'
                        .'You can do this in two ways:<br>'
                        .'<ol style="margin:0 0 0 18px; padding:0;">'
                            .'<li><b>Generate a new key using Git Bash or OpenSSH</b>:<br>'
                                .'<code>ssh-keygen -t ed25519 -f "'.esc_html($ssh_dir).'/id_ed25519" -N ""</code><br>'
                                .'<small>Run this in Git Bash or PowerShell (with OpenSSH).</small>'
                            .'</li>'
                            .'<li style="margin-top:6px"><b>Or upload your existing private key</b> (id_rsa or id_ed25519) to <b>'.esc_html($ssh_dir).'</b> and restrict access:<br>'
                                .'<code>icacls "'.esc_html($ssh_dir).'/id_rsa" /inheritance:r</code><br>'
                                .'<code>icacls "'.esc_html($ssh_dir).'/id_rsa" /grant:r "%USERNAME%:F"</code>'
                            .'</li>'
                        .'</ol>'
                        .'After that, copy the content of <code>'.esc_html($ssh_dir).'/id_ed25519.pub</code> (or id_rsa.pub) to your GitHub/GitLab SSH keys section and re-run Troubleshooting.'
                        .'</div>';
                } else {
                    $help = '<div style="color:#444; font-size:13px; background:#f9f9f9; border:1px solid #eee; padding:8px; margin:8px 0 0 0;">'
                        .'To enable SSH access for git, you must create or upload a private key (e.g. <b>id_rsa</b> or <b>id_ed25519</b>) in <b>'.esc_html($ssh_dir).'</b> for user <b>'.esc_html($whoami).'</b>.<br>'
                        .'You can do this in two ways:<br>'
                        .'<ol style="margin:0 0 0 18px; padding:0;">'
                            .($this->is_windows()
                                ? '<li><b>Generate a new key using Git Bash or PowerShell (OpenSSH)</b>:<br><code>ssh-keygen -t rsa -b 4096 -f "'.esc_html($ssh_dir).'/id_rsa" -N ""</code></li>'
                                : '<li><b>Generate a new key on the server</b>:<br><code>sudo -u '.esc_html($whoami).' ssh-keygen -t rsa -b 4096 -f '.esc_html($ssh_dir).'/id_rsa -N ""</code></li>')
                            .($this->is_windows()
                                ? '<li style="margin-top:6px"><b>Or upload your existing private key</b> to <b>'.esc_html($ssh_dir).'</b> and restrict access via icacls:<br><code>icacls "'.esc_html($ssh_dir).'/id_rsa" /inheritance:r</code><br><code>icacls "'.esc_html($ssh_dir).'/id_rsa" /grant:r "%USERNAME%:R"</code></li>'
                                : '<li style="margin-top:6px"><b>Or upload your existing private key</b> (id_rsa or id_ed25519) to <b>'.esc_html($ssh_dir).'</b> and set permissions:<br><code>sudo chown '.esc_html($whoami).':'.esc_html($whoami).' '.esc_html($ssh_dir).'/id_rsa</code><br><code>sudo chmod 600 '.esc_html($ssh_dir).'/id_rsa</code></li>')
                        .'</ol>'
                        .'After that, <b>copy the content of <code>'.esc_html($ssh_dir).'/id_rsa.pub</code> to your GitHub/GitLab SSH keys</b> section.<br>'
                        .'Then run Troubleshooting again to verify the key is detected.'
                        .'</div>';
                }
            }
            $log .= $help;
        }

        $log .= '<hr><b>Summary:</b><br>HOME: '.esc_html($home).'<br>User: '.esc_html($whoami).'<br>.ssh: '.esc_html($ssh_dir_norm).'<br>';
        wp_send_json_success($log);
    }

    /**
     * AJAX: Fix folder permission by chown to web user
     */
    public function fix_permission()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_fix_permission');
        $path = $this->get_repo_path();
        if (! is_dir($path)) {
            wp_send_json_error(__('Invalid repository path.', 'git-manager'));
        }

        // Determine HOME and whoami for debug
        $home = getenv('HOME');
        if (! $home) {
            $home = getenv('USERPROFILE');
        }
        if (! $home) {
            $home = getenv('HOMEPATH');
        }
        if (! $home) {
            $home = sys_get_temp_dir();
        }
        $whoami = trim(shell_exec('whoami'));

        $output = $this->run_git_command('pull', $path);
        $details = '';

        if (strpos($output, 'Already up to date') === false && strpos($output, 'Updating') !== false) {
            $commit_info = $this->run_git_command('log -1 --pretty=format:"%h | %an | %ar | %s"', $path);
            $commit_hash = $this->run_git_command('log -1 --pretty=format:"%H"', $path);
            $changed_files = $this->run_git_command('show --pretty="" --name-only '.escapeshellarg(trim($commit_hash)), $path);
            $details .= '<div style="margin:10px 0 0 0;padding:10px;background:#f6f6f6;border:1px solid #eee;">';
            $details .= '<b>Last Commit:</b><br>';
            $details .= '<span style="color:#333">'.nl2br(esc_html($commit_info)).'</span>';
            if (trim($changed_files)) {
                $details .= '<br><b>Changed files:</b><br><pre style="background:#fff;border:1px solid #ddd;padding:6px;">'.esc_html(trim($changed_files)).'</pre>';
            }
            $details .= '</div>';
        }

        $debug = '<div style="color:#888;font-size:12px;margin-top:10px;">HOME used by git: <b>'.esc_html($home).'</b><br>User: <b>'.esc_html($whoami).'</b><br>.ssh dir: <b>'.esc_html(rtrim($home, '/\\').'/.ssh').'</b></div>';
        wp_send_json_success(nl2br(esc_html($output)).$details.$debug);
        // Always fetch before checking latest commit to sync with remote
        $this->run_git_command('fetch', $path);
        $branch_cmd = 'rev-parse --abbrev-ref HEAD';
        $branch = trim($this->run_git_command($branch_cmd, $path));
        if (empty($branch) || $branch === 'HEAD') {
            // Provide debug output to help diagnosing why branch is empty
            $raw_branch = $this->run_git_command($branch_cmd.' 2>&1', $path);
            $git_dir = rtrim($path, '/\\').'/.git';
            $debug_msg = '<b>Branch detection failed.</b><br>'.
                'Command: git '.esc_html($branch_cmd).'<br>'.
                'Output: <pre>'.esc_html($raw_branch).'</pre>'.
                '.git path checked: <code>'.esc_html($git_dir).'</code>';
            wp_send_json_error($debug_msg);
        }
        $local_hash = trim($this->run_git_command('rev-parse '.escapeshellarg($branch), $path));
        $remote_branch = trim($this->run_git_command('rev-parse --abbrev-ref --symbolic-full-name @{u}', $path));
        $remote_hash = '';
        if ($remote_branch && strpos($remote_branch, '/') !== false) {
            $remote_hash = trim($this->run_git_command('rev-parse '.escapeshellarg($remote_branch), $path));
        }
        // Get last commit info (author, subject)
        $commit_info = $this->run_git_command('log -1 --pretty=format:"%an|%ae|%s"', $path);
        $commit_author = '';
        $commit_email = '';
        $commit_subject = '';
        if ($commit_info && strpos($commit_info, '|') !== false) {
            [$commit_author, $commit_email, $commit_subject] = explode('|', $commit_info, 3);
        }
        wp_send_json_success([
            'branch' => $branch,
            'hash' => $local_hash,
            'remote_branch' => $remote_branch,
            'remote_hash' => $remote_hash,
            'author' => $commit_author,
            'email' => $commit_email,
            'subject' => $commit_subject,
        ]);
    }

    /**
     * AJAX: Check plugin status (shell_exec, git, .git, etc)
     */
    public function status()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_status');
        // Prepare and validate repo path
        $path = $this->get_repo_path();
        if (! is_dir($path)) {
            wp_send_json_error(__('Invalid repository path.', 'git-manager'));
        }

        $status = [];
        $status['shell_exec'] = function_exists('shell_exec') ? 'enabled' : 'disabled';

        // Determine HOME and user for debug
        $home = getenv('HOME');
        if (! $home) {
            $home = getenv('USERPROFILE');
        }
        if (! $home) {
            $home = getenv('HOMEPATH');
        }
        if (! $home) {
            $home = sys_get_temp_dir();
        }
        $whoami = trim(shell_exec('whoami'));

        // Check whether git binary is available
        $git_exists = $this->find_executable('git');
        if (! $git_exists) {
            wp_send_json_error('Git executable not found in PATH. Please install Git or ensure it is available to the webserver user.');
        }

        // Try to pull to check connectivity and show latest changes
        $output = $this->run_git_command('pull', $path);
        $details = '';
        if (strpos($output, 'Already up to date') === false && strpos($output, 'Updating') !== false) {
            $commit_info = $this->run_git_command('log -1 --pretty=format:"%h | %an | %ar | %s"', $path);
            $commit_hash = $this->run_git_command('log -1 --pretty=format:"%H"', $path);
            $changed_files = $this->run_git_command('show --pretty="" --name-only '.escapeshellarg(trim($commit_hash)), $path);
            $details .= '<div style="margin:10px 0 0 0;padding:10px;background:#f6f6f6;border:1px solid #eee;">';
            $details .= '<b>Last Commit:</b><br>';
            $details .= '<span style="color:#333">'.nl2br(esc_html($commit_info)).'</span>';
            if (trim($changed_files)) {
                $details .= '<br><b>Changed files:</b><br><pre style="background:#fff;border:1px solid #ddd;padding:6px;">'.esc_html(trim($changed_files)).'</pre>';
            }
            $details .= '</div>';
        }

        $debug = '<div style="color:#888;font-size:12px;margin-top:10px;">HOME used by git: <b>'.esc_html($home).'</b><br>User: <b>'.esc_html($whoami).'</b><br>.ssh dir: <b>'.esc_html(rtrim($home, '/\\').'/.ssh').'</b></div>';

        // If pull returned empty or only reports 'Already up to date', present a friendly ready message
        $clean_output = trim($output);
        $is_up_to_date = ($clean_output === '') || (strpos($clean_output, 'Already up to date') !== false);
        if ($is_up_to_date && empty($details)) {
            $html = '<div style="color:green"><b>Everything is OK and the plugin is ready to use.</b></div>'.$debug;
            wp_send_json_success($html);
        }

        wp_send_json_success(nl2br(esc_html($output)).$details.$debug);
    }

    /**
     * AJAX: Return latest commit info (local and remote hashes, branch, author, subject)
     */
    public function latest_commit()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_latest_commit');
        $path = $this->get_repo_path();
        if (! is_dir($path)) {
            wp_send_json_error(__('Invalid repository path.', 'git-manager'));
        }

        // Always fetch to ensure remote info is up-to-date
        $this->run_git_command('fetch', $path);

        // Determine current branch
        $branch_cmd = 'rev-parse --abbrev-ref HEAD';
        $branch = trim($this->run_git_command($branch_cmd, $path));
        if (empty($branch) || $branch === 'HEAD') {
            $raw_branch = $this->run_git_command($branch_cmd.' 2>&1', $path);
            $git_dir = rtrim($path, '/\\').'/.git';
            $debug_msg = '<b>Branch detection failed.</b><br>'.
                'Command: git '.esc_html($branch_cmd).'<br>'.
                'Output: <pre>'.esc_html($raw_branch).'</pre>'.
                '.git path checked: <code>'.esc_html($git_dir).'</code>';
            wp_send_json_error($debug_msg);
        }

        $local_hash = trim($this->run_git_command('rev-parse '.escapeshellarg($branch), $path));
        $remote_branch = trim($this->run_git_command('rev-parse --abbrev-ref --symbolic-full-name @{u}', $path));
        $remote_hash = '';
        if ($remote_branch && strpos($remote_branch, '/') !== false) {
            $remote_hash = trim($this->run_git_command('rev-parse '.escapeshellarg($remote_branch), $path));
        }

        // Get last commit info (author, subject)
        $commit_info = trim($this->run_git_command('log -1 --pretty=format:"%an|%ae|%s"', $path));
        $commit_author = '';
        $commit_email = '';
        $commit_subject = '';
        if ($commit_info && strpos($commit_info, '|') !== false) {
            [$commit_author, $commit_email, $commit_subject] = explode('|', $commit_info, 3);
        }

        wp_send_json_success([
            'branch' => $branch,
            'hash' => $local_hash,
            'remote_branch' => $remote_branch,
            'remote_hash' => $remote_hash,
            'author' => $commit_author,
            'email' => $commit_email,
            'subject' => $commit_subject,
        ]);
    }

    public function __construct()
    {
        add_action('wp_ajax_git_manager_save_path', [$this, 'save_path']);
        add_action('wp_ajax_git_manager_fix_permission', [$this, 'fix_permission']);
        add_action('wp_ajax_git_manager_latest_commit', [$this, 'latest_commit']);
        add_action('wp_ajax_git_manager_status', [$this, 'status']);
        add_action('wp_ajax_git_manager_get_branches', [$this, 'get_branches']);
        add_action('wp_ajax_git_manager_fetch', [$this, 'fetch']);
        add_action('wp_ajax_git_manager_pull', [$this, 'pull']);
        add_action('wp_ajax_git_manager_branch', [$this, 'branch']);
        add_action('wp_ajax_git_manager_log', [$this, 'log']);
        add_action('wp_ajax_git_manager_checkout', [$this, 'checkout']);
        add_action('wp_ajax_git_manager_safe_directory', [$this, 'safe_directory']);
        add_action('wp_ajax_git_manager_save_roles', [$this, 'save_roles']);
        add_action('wp_ajax_git_manager_fix_ssh', [$this, 'fix_ssh']);
        add_action('wp_ajax_git_manager_troubleshoot', [$this, 'troubleshoot']);
    }

    /**
     * Check if current user has one of allowed roles or is admin
     *
     * @return bool
     */
    private function require_allowed_role()
    {
        if (current_user_can('manage_options')) {
            return true;
        }
        $allowed = get_option('git_manager_allowed_roles', ['administrator']);
        $user = wp_get_current_user();
        if (! empty($user->roles) && is_array($user->roles)) {
            foreach ($user->roles as $r) {
                if (in_array($r, $allowed, true)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Send access denied JSON and exit if user is not allowed
     */
    private function ensure_allowed()
    {
        if (! $this->require_allowed_role()) {
            wp_send_json_error(__('Access denied.', 'git-manager'));
        }
    }

    /**
     * Verify per-action nonce if provided, fallback to default nonce check already performed by caller
     *
     * @param  string  $action
     */
    private function verify_action_nonce($action)
    {
        // If a per-action nonce is provided, validate it. If it's not provided,
        // fall back to the generic nonce already checked by check_ajax_referer
        // in the caller. This keeps backward compatibility while encouraging
        // clients to send per-action nonces.
        if (isset($_POST['_git_manager_action_nonce']) && ! empty($_POST['_git_manager_action_nonce'])) {
            $nonce = sanitize_text_field($_POST['_git_manager_action_nonce']);
            if (! wp_verify_nonce($nonce, $action)) {
                wp_send_json_error(__('Invalid action nonce.', 'git-manager'));
            }
        }
    }

    /**
     * Return whether auto-fix is enabled either via constant or admin option.
     * Constant `GIT_MANAGER_ALLOW_AUTO_FIX` can still override, but admin option
     * `git_manager_allow_auto_fix` is the preferred way to toggle from settings.
     *
     * @return bool
     */
    private function auto_fix_enabled()
    {
        // Constant takes precedence if explicitly defined true
        if (defined('GIT_MANAGER_ALLOW_AUTO_FIX') && GIT_MANAGER_ALLOW_AUTO_FIX) {
            return true;
        }
        // Otherwise read option (only administrators can change this option)
        $opt = get_option('git_manager_allow_auto_fix', false);

        return (bool) $opt;
    }

    /**
     * Return true when running on Windows
     *
     * @return bool
     */
    private function is_windows()
    {
        return strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    }

    /**
     * Check whether an executable is available in PATH
     *
     * @param  string  $name
     * @return bool
     */
    private function find_executable($name)
    {
        if ($this->is_windows()) {
            $check = @shell_exec('where '.escapeshellarg($name).' 2>&1');
        } else {
            $check = @shell_exec('command -v '.escapeshellarg($name).' 2>&1');
        }

        return ! empty($check);
    }

    /**
     * Build a cross-platform git command that ensures HOME and path are set.
     * Uses git -C on both platforms and sets HOME appropriately per OS.
     *
     * @param  string  $git_command
     * @param  string  $path
     * @return string
     */
    private function build_git_cmd($git_command, $path)
    {
        // Determine HOME in a cross-platform way
        $home = getenv('HOME');
        if (! $home) {
            $home = getenv('USERPROFILE');
        }
        if (! $home) {
            $home = getenv('HOMEPATH');
        }
        if (! $home) {
            $home = sys_get_temp_dir();
        }

        // Normalize path values for safe insertion into commands
        $home_clean = str_replace('"', '', $home);
        $path_clean = str_replace('"', '', $path);

        if ($this->is_windows()) {
            // On Windows use cmd.exe style: set "HOME=..." && git -C "path" <cmd>
            return 'set "HOME='.$home_clean.'" && git -C "'.$path_clean.'" '.$git_command.' 2>&1';
        }

        // POSIX: set HOME env for the command and use git -C with proper escaping
        return 'HOME='.escapeshellarg($home).' git -C '.escapeshellarg($path).' '.$git_command.' 2>&1';
    }

    /**
     * AJAX: Fix SSH/Host Key issues (create .ssh, add known_hosts)
     */
    public function fix_ssh()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_fix_ssh');
        $path = $this->get_repo_path();
        $output = '';
        $whoami = trim(shell_exec('whoami'));
        $home = getenv('HOME');
        if (! $home) {
            $home = getenv('USERPROFILE');
        }
        if (! $home) {
            $home = getenv('HOMEPATH');
        }
        if (! $home) {
            $home = sys_get_temp_dir();
        }
        $ssh_dir = rtrim($home, '/\\').'/.ssh';
        if (! is_dir($ssh_dir)) {
            if ($this->auto_fix_enabled()) {
                @mkdir($ssh_dir, 0700, true);
                $output .= '.ssh directory created.<br>';
            } else {
                if ($this->is_windows()) {
                    $output .= '.ssh directory not found. Auto-create disabled. Please create '.esc_html($ssh_dir).' and restrict access (e.g. run in elevated PowerShell: <code>icacls "'.esc_html($ssh_dir).'" /grant "%USERNAME%:F"</code>).<br>';
                } else {
                    $output .= '.ssh directory not found. Auto-create disabled. Please create '.esc_html($ssh_dir).' with 0700 permissions for the web user.<br>';
                }
            }
        } else {
            $output .= '.ssh directory exists.<br>';
        }
        // Check/fix ownership and permissions
        $ssh_stat = @stat($ssh_dir);
        $ssh_owner = $ssh_stat ? $ssh_stat['uid'] : null;
        $current_uid = function_exists('posix_geteuid') ? posix_geteuid() : null;
        if ($ssh_owner !== null && $current_uid !== null && $ssh_owner !== $current_uid) {
            if ($this->auto_fix_enabled()) {
                @chown($ssh_dir, $current_uid);
                $output .= "<span style='color:red'>.ssh directory ownership was incorrect and has been fixed (set to current user).</span><br>";
            } else {
                if ($this->is_windows()) {
                    $output .= "<span style='color:red'>.ssh directory ownership appears incorrect. Auto-fix disabled; run icacls in an elevated PowerShell to adjust the ACLs if needed.</span><br>";
                } else {
                    $output .= "<span style='color:red'>.ssh directory ownership appears incorrect. Auto-fix disabled; run chown manually if needed.</span><br>";
                }
            }
        }
        if (defined('GIT_MANAGER_ALLOW_AUTO_FIX') && GIT_MANAGER_ALLOW_AUTO_FIX) {
            @chmod($ssh_dir, 0700);
        }
        // Add github.com to known_hosts (or user can change to their git host)
        $host = 'github.com';
        $known_hosts = $ssh_dir.'/known_hosts';
        $scan_cmd = 'ssh-keyscan '.escapeshellarg($host).' 2>&1';
        $scan = shell_exec($scan_cmd);
        if ($scan && (! file_exists($known_hosts) || strpos(@file_get_contents($known_hosts), $host) === false)) {
            if (defined('GIT_MANAGER_ALLOW_AUTO_FIX') && GIT_MANAGER_ALLOW_AUTO_FIX) {
                file_put_contents($known_hosts, $scan."\n", FILE_APPEND | LOCK_EX);
                $output .= "Host key for $host added to known_hosts.<br>";
            } else {
                if ($this->is_windows()) {
                    $manual = 'In Git Bash or PowerShell (with OpenSSH): ssh-keyscan '.esc_html($host).' >> "'.str_replace('\\', '\\\\', esc_html($known_hosts)).'"';
                } else {
                    $manual = 'ssh-keyscan '.esc_html($host).' >> '.esc_html($known_hosts);
                }
                $output .= 'Host key for '.$host.' not present. Auto-add disabled; to add manually run:<br><pre>'.$manual.'</pre>';
            }
        } elseif (file_exists($known_hosts) && strpos(@file_get_contents($known_hosts), $host) !== false) {
            $output .= "Host key for $host already exists in known_hosts.<br>";
        } else {
            $output .= 'ssh-keyscan failed or not available.<br>';
        }
        // Check/fix known_hosts ownership and permissions
        if (file_exists($known_hosts)) {
            $kh_stat = @stat($known_hosts);
            $kh_owner = $kh_stat ? $kh_stat['uid'] : null;
            if ($kh_owner !== null && $current_uid !== null && $kh_owner !== $current_uid) {
                if ($this->auto_fix_enabled()) {
                    @chown($known_hosts, $current_uid);
                    $output .= "<span style='color:red'>known_hosts ownership was incorrect and has been fixed (set to current user).</span><br>";
                } else {
                    $output .= "<span style='color:red'>known_hosts ownership appears incorrect. Auto-fix disabled; run chown manually if needed.</span><br>";
                }
            }
            if ($this->auto_fix_enabled()) {
                @chmod($known_hosts, 0644);
            }
        }
        $output .= "<small>User: $whoami<br>SSH dir: $ssh_dir<br>Current UID: $current_uid<br>SSH dir owner: $ssh_owner</small>";
        wp_send_json_success($output);
    }

    /**
     * AJAX: Save allowed roles (admin only)
     */
    public function save_roles()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        // saving roles requires manage_options intentionally; keep original check
        if (! current_user_can('manage_options')) {
            wp_send_json_error('Access denied.');
        }
        $roles = isset($_POST['git_manager_allowed_roles']) ? (array) $_POST['git_manager_allowed_roles'] : ['administrator'];
        // sanitize roles using main class if available
        if (class_exists('Git_Manager')) {
            $gm = Git_Manager::get_instance();
            $roles = $gm->sanitize_allowed_roles($roles);
        } else {
            // basic sanitization
            $roles = array_values(array_filter(array_map('sanitize_text_field', $roles)));
            if (empty($roles)) {
                $roles = ['administrator'];
            }
        }
        update_option('git_manager_allowed_roles', $roles);
        // Persist auto-fix option (checkbox may be missing when unchecked)
        $allow_auto = isset($_POST['git_manager_allow_auto_fix']) && (int) $_POST['git_manager_allow_auto_fix'] === 1 ? 1 : 0;
        update_option('git_manager_allow_auto_fix', $allow_auto);
        wp_send_json_success('Roles and settings updated.');
    }

    /**
     * Get all branches sorted by last commit date (desc)
     */
    public function get_branches()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_get_branches');
        $path = $this->get_repo_path();
        if (! is_dir($path)) {
            wp_send_json_error(__('Invalid repository path.', 'git-manager'));
        }
        $home = getenv('USERPROFILE');
        if (! $home) {
            $home = getenv('HOMEPATH');
        }
        if (! $home) {
            $home = sys_get_temp_dir();
        }
        // Always fetch before listing branches
        shell_exec($this->build_git_cmd('fetch --all', $path));
        $cmd = $this->build_git_cmd('for-each-ref --sort=-committerdate "refs/heads/" "refs/remotes/" --format="%(refname:short)|%(committerdate:iso8601)|%(objectname)"', $path);
        $output = shell_exec($cmd);
        // Determine default branch (origin HEAD) if possible
        $default_short = '';
        $origin_head_cmd = $this->build_git_cmd('symbolic-ref --quiet --short refs/remotes/origin/HEAD', $path);
        $origin_head = trim(shell_exec($origin_head_cmd));
        if (! empty($origin_head)) {
            // origin_head looks like origin/main; extract part after origin/
            if (strpos($origin_head, '/') !== false) {
                $parts = explode('/', $origin_head, 2);
                if (isset($parts[1])) {
                    $default_short = $parts[1];
                }
            }
        } else {
            // Fallback: try parsing remote show origin
            $remote_show_cmd = $this->build_git_cmd('remote show origin', $path);
            $remote_show = shell_exec($remote_show_cmd);
            if ($remote_show && preg_match('/HEAD branch: (.+)/i', $remote_show, $m)) {
                $default_short = trim($m[1]);
            }
        }
        if (empty($output)) {
            wp_send_json_error('No branches found.');
        }
        $branches = [];
        foreach (explode("\n", trim($output)) as $line) {
            if (strpos($line, '|') !== false) {
                [$name, $date, $hash] = explode('|', $line);
                $short = $name;
                // Normalize short name similar to JS normalize
                $short = preg_replace('#^refs/heads/#', '', $short);
                $parts = explode('/', $short);
                $short_last = end($parts);
                $is_default = ($default_short && $short_last === $default_short);
                $branches[] = [
                    'name' => $name,
                    'date' => $date,
                    'hash' => $hash,
                    'default' => $is_default,
                ];
            }
        }
        wp_send_json_success($branches);
    }

    private function get_repo_path()
    {
        $path = get_option('git_manager_repo_path', '');

        return $path;
    }

    public function save_path()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_save_path');
        $path = isset($_POST['git_repo_path']) ? sanitize_text_field($_POST['git_repo_path']) : '';
        // Remove trailing slashes (both / and \\)
        $path = rtrim($path, '\\/');
        if (! empty($path) && is_dir($path)) {
            update_option('git_manager_repo_path', realpath($path) ?: $path);
            wp_send_json_success(__('Path saved.', 'git-manager'));
        } else {
            wp_send_json_error(__('Invalid path.', 'git-manager'));
        }
    }

    public function fetch()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_fetch');
        $path = $this->get_repo_path();
        if (! is_dir($path)) {
            wp_send_json_error(__('Invalid repository path.', 'git-manager'));
        }
        $output = $this->run_git_command('fetch', $path);
        if (trim($output) === '') {
            $output = __('Fetch completed. No updates.', 'git-manager');
        }
        wp_send_json_success(nl2br(esc_html($output)));
    }

    public function pull()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_pull');
        $path = $this->get_repo_path();
        if (! is_dir($path)) {
            wp_send_json_error(__('Invalid repository path.', 'git-manager'));
        }
        $home = getenv('HOME');
        if (! $home) {
            $home = getenv('HOMEPATH');
        }
        if (! $home) {
            $home = getenv('HOME');
        }
        if (! $home) {
            $home = sys_get_temp_dir();
        }
        $whoami = trim(shell_exec('whoami'));
        $output = $this->run_git_command('pull', $path);
        $details = '';
        // If pull was successful and not 'Already up to date', show last commit info
        if (strpos($output, 'Already up to date') === false && strpos($output, 'Updating') !== false) {
            // Get last commit info
            $commit_info = $this->run_git_command('log -1 --pretty=format:"%h | %an | %ar | %s"', $path);
            $commit_hash = $this->run_git_command('log -1 --pretty=format:"%H"', $path);
            $changed_files = $this->run_git_command('show --pretty="" --name-only '.escapeshellarg(trim($commit_hash)), $path);
            $details .= '<div style="margin:10px 0 0 0;padding:10px;background:#f6f6f6;border:1px solid #eee;">';
            $details .= '<b>Last Commit:</b><br>';
            $details .= '<span style="color:#333">'.nl2br(esc_html($commit_info)).'</span>';
            if (trim($changed_files)) {
                $details .= '<br><b>Changed files:</b><br><pre style="background:#fff;border:1px solid #ddd;padding:6px;">'.esc_html(trim($changed_files)).'</pre>';
            }
            $details .= '</div>';
        }
        $debug = '<div style="color:#888;font-size:12px;margin-top:10px;">HOME used by git: <b>'.esc_html($home).'</b><br>User: <b>'.esc_html($whoami).'</b><br>.ssh dir: <b>'.esc_html(rtrim($home, '/\\').'/.ssh').'</b></div>';
        wp_send_json_success(nl2br(esc_html($output)).$details.$debug);
    }

    public function branch()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_branch');
        $path = $this->get_repo_path();
        if (! is_dir($path)) {
            wp_send_json_error(__('Invalid repository path.', 'git-manager'));
        }
        $output = $this->run_git_command('branch -a', $path);
        wp_send_json_success(nl2br(esc_html($output)));
    }

    public function log()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_log');
        $path = $this->get_repo_path();
        if (! is_dir($path)) {
            wp_send_json_error(__('Invalid repository path.', 'git-manager'));
        }
        // Always fetch before showing log to sync with remote
        $this->run_git_command('fetch', $path);
        // Get last 15 commits with details and changed files
        $git_log_cmd = 'log -n 15 --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso';
        $output = $this->run_git_command($git_log_cmd, $path);
        $commits = [];
        foreach (explode("\n", trim($output)) as $line) {
            if (substr_count($line, '|') >= 4) {
                [$hash, $author, $email, $date, $subject] = explode('|', $line, 5);
                // Get changed files for this commit (cross-platform: grep for Linux, findstr for Windows)
                if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                    $show_cmd = 'show --pretty="" --name-only '.escapeshellarg($hash).' | findstr /V "^$"';
                } else {
                    $show_cmd = 'show --pretty="" --name-only '.escapeshellarg($hash)." | grep -v '^$'";
                }
                $files = $this->run_git_command($show_cmd, $path);
                $file_list = array_filter(array_map('trim', explode("\n", $files)));
                $commits[] = [
                    'hash' => $hash,
                    'author' => $author,
                    'email' => $email,
                    'date' => $date,
                    'subject' => $subject,
                    'files' => $file_list,
                ];
            }
        }
        wp_send_json_success($commits);
    }

    private function run_git_command($command, $path)
    {
        // No user input check here: callers must enforce permissions
        // Build and run the git command cross-platform
        $cmd = $this->build_git_cmd($command, $path);
        $output = shell_exec($cmd);
        // Ensure $output is a string to avoid deprecated warning
        if ($output === false) {
            $output = '';
        }
        // Check for dubious ownership error and auto-fix
        if (strpos($output, 'detected dubious ownership in repository') !== false && preg_match("/'(.*?)' is owned by:/", $output, $matches)) {
            $safe_dir = $matches[1];
            // Build fix command using build_git_cmd for consistency; but if running on Windows, prefer manual instruction
            $fix_cmd = $this->is_windows() ? ('git config --global --add safe.directory '.escapeshellarg($safe_dir)) : $this->build_git_cmd('config --global --add safe.directory '.escapeshellarg($safe_dir), $path);
            if ($this->auto_fix_enabled()) {
                if ($this->is_windows()) {
                    // Avoid making global git config changes automatically on Windows; provide manual instruction
                    $output .= "\nAuto-fix (limited on Windows): run as Administrator to execute:\n<pre>".esc_html($fix_cmd).'</pre>';
                } else {
                    shell_exec($fix_cmd);
                    // Try the original command again
                    $output = shell_exec($cmd);
                    if ($output === false) {
                        $output = '';
                    }
                }
            } else {
                // Append helpful manual instruction to output
                $output .= "\nAuto-fix disabled: to resolve dubious ownership manually run:\n<pre>".esc_html($fix_cmd).'</pre>';
            }
        }
        // Check for committer identity error (git can't auto-detect user.email/name)
        if (strpos($output, 'Please tell me who you are') !== false || strpos($output, 'unable to auto-detect email address') !== false) {
            // Attempt to set repository-local git user.email and user.name using WP info
            $admin_email = get_option('admin_email', 'webmaster@localhost');
            $current_user = wp_get_current_user();
            $user_name = $current_user && $current_user->display_name ? $current_user->display_name : 'WP Git Manager';
            // Build local config commands
            $set_email_cmd = $this->build_git_cmd('config user.email '.escapeshellarg($admin_email), $path);
            $set_name_cmd = $this->build_git_cmd('config user.name '.escapeshellarg($user_name), $path);
            // Try to apply local config
            shell_exec($set_email_cmd);
            shell_exec($set_name_cmd);
            // Re-run original command once
            $retry_output = shell_exec($cmd);
            if ($retry_output === false) {
                $retry_output = '';
            }
            // Append informational note so admin sees what happened
            $output .= "\n\n[git-manager] Detected missing committer identity. Attempted to set local git user.email and user.name.";
            $output .= "\nCommand used to set email: git config user.email '".esc_html($admin_email)."'";
            $output .= "\nCommand used to set name: git config user.name '".esc_html($user_name)."'";
            $output .= "\n--- Retry output ---\n".$retry_output;

            // Return combined output
            return $output;
        }

        return $output;
    }

    public function checkout()
    {
        check_ajax_referer('git_manager_action', '_git_manager_nonce');
        $this->ensure_allowed();
        $this->verify_action_nonce('git_manager_checkout');
        $path = $this->get_repo_path();
        if (! is_dir($path)) {
            wp_send_json_error(__('Invalid repository path.', 'git-manager'));
        }
        $branch = isset($_POST['branch']) ? Git_Manager_Utils::sanitize_branch($_POST['branch']) : '';
        if (! $branch) {
            wp_send_json_error(__('Invalid branch.', 'git-manager'));
        }
        $output = $this->run_git_command('checkout '.escapeshellarg($branch), $path);
        wp_send_json_success(nl2br(esc_html($output)));
    }
}

new Git_Manager_Ajax;
