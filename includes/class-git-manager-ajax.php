<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once GIT_MANAGER_PATH . 'includes/class-git-manager-utils.php';
class Git_Manager_Ajax {
	/**
	 * Manually add current repo path as safe.directory
	 */
	public function safe_directory() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$path = $this->get_repo_path();
		if ( ! is_dir( $path ) ) {
			wp_send_json_error( __( 'Invalid repository path.', 'git-manager' ) );
		}
		$home = getenv('USERPROFILE');
		if (!$home) {
			$home = getenv('HOMEPATH');
		}
		if (!$home) {
			$home = sys_get_temp_dir();
		}
		// Use --local only if .git exists
		$gitDir = $path . '/.git';
		if (!is_dir($gitDir)) {
			$debug = 'Checked path: ' . $path . ' | .git exists: ' . (file_exists($gitDir) ? 'yes' : 'no') . ' | is_dir: ' . (is_dir($gitDir) ? 'yes' : 'no');
			wp_send_json_error('This directory is not a git repository (.git not found).<br><small>' . esc_html($debug) . '</small>');
		}
		$cmd = 'set HOME=' . $home . '&& cd ' . escapeshellarg($path) . ' && git config --local --add safe.directory ' . escapeshellarg($path) . ' 2>&1';
		$output = shell_exec( $cmd );
		if (strpos($output, '--local can only be used inside a git repository') !== false) {
			// Try to add directly to .git/config
			$configFile = rtrim($path, '/\\') . '/.git/config';
			if (is_writable($configFile)) {
				$config = file_get_contents($configFile);
				if (strpos($config, '[safe]') === false) {
					$config .= "\n[safe]\n\tdirectory = " . $path . "\n";
					file_put_contents($configFile, $config);
					$output = 'Safe directory added directly to .git/config.';
				} else {
					$output = 'Safe directory already set in .git/config.';
				}
			} else {
				$output .= "\nCould not write to .git/config. Please run this command manually in terminal:\n<pre>cd " . $path . " && git config --local --add safe.directory '" . $path . "'</pre>";
			}
		} elseif (empty($output)) {
			$output = 'Safe directory added.';
		} else {
			$output .= '<br><small>' . shell_exec( 'whoami' ) . '</small>';
		}
		wp_send_json_success( nl2br( esc_html( $output ) ) );
	}

	/**
	 * AJAX: Check for git changes (using git whatchanged or git log)
	 */
	public function check_git_changes() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$path = $this->get_repo_path();
		if ( ! is_dir( $path ) ) {
			wp_send_json_error( __( 'Invalid repository path.', 'git-manager' ) );
		}
		// Use git log --pretty=format:"%H|%ad" -n 1 for last commit hash and date
		$output = $this->run_git_command('log --pretty=format:"%H|%ad" -n 1', $path);
		$output = trim($output);
		if (!$output) {
			wp_send_json_error('No commit found.');
		}
		list($hash, $date) = explode('|', $output, 2);
		wp_send_json_success([
			'hash' => trim($hash),
			'date' => trim($date),
		]);
	}

	/**
	 * AJAX: Troubleshooting - run all checks/fixes and log
	 */
	public function troubleshoot() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$log = '';
		$path = $this->get_repo_path();
		$whoami = trim(shell_exec('whoami'));
		$home = getenv('HOME');
		if (!$home) { $home = getenv('USERPROFILE'); }
		if (!$home) { $home = getenv('HOMEPATH'); }
		if (!$home) { $home = sys_get_temp_dir(); }
		$ssh_dir = rtrim($home, '/\\') . '/.ssh';
		$log .= '<b>Troubleshooting started...</b><br>';

		// 1. Safe Directory
		$log .= '<hr><b>Safe Directory:</b><br>';
		$gitDir = $path . '/.git';
		if (!is_dir($gitDir)) {
			$log .= '❌ .git directory not found.<br>';
		} else {
			$cmd1 = 'set HOME=' . $home . '&& cd ' . escapeshellarg($path) . ' && git config --local --add safe.directory ' . escapeshellarg($path) . ' 2>&1';
			$out1 = shell_exec($cmd1);
			if (empty($out1)) {
				$log .= '✔️ safe.directory set via git config.<br>';
			} else {
				$log .= '⚠️ git config failed: ' . nl2br(esc_html($out1)) . '<br>';
				// Try direct .git/config edit
				$configFile = rtrim($path, '/\\') . '/.git/config';
				if (is_writable($configFile)) {
					$config = file_get_contents($configFile);
					if (strpos($config, '[safe]') === false) {
						$config .= "\n[safe]\n\tdirectory = " . $path . "\n";
						file_put_contents($configFile, $config);
						$log .= '✔️ safe.directory added directly to .git/config.<br>';
					} else {
						$log .= 'ℹ️ safe.directory already set in .git/config.<br>';
					}
				} else {
					$log .= '❌ Could not write to .git/config.<br>';
				}
			}
		}

		// 2. Folder Permission
		$log .= '<hr><b>Folder Permission:</b><br>';
		if (!is_dir($path)) {
			$log .= '❌ Repo path not found.<br>';
		} else {
			$cmd2 = 'chown -R ' . escapeshellarg($whoami) . ' ' . escapeshellarg($path) . ' 2>&1';
			$out2 = shell_exec($cmd2);
			if (empty($out2)) {
				$log .= '✔️ Ownership changed to ' . $whoami . '.<br>';
			} else {
				$log .= '⚠️ chown failed: ' . nl2br(esc_html($out2)) . '<br>';
				// Try chmod 755 as fallback
				$cmd2b = 'chmod -R 755 ' . escapeshellarg($path) . ' 2>&1';
				$out2b = shell_exec($cmd2b);
				if (empty($out2b)) {
					$log .= '✔️ chmod 755 applied as fallback.<br>';
				} else {
					$log .= '❌ chmod failed: ' . nl2br(esc_html($out2b)) . '<br>';
				}
			}
		}

		// 3. SSH/Host Key
		$log .= '<hr><b>SSH/Host Key:</b><br>';
		// Normalize .ssh path for is_dir check
		$ssh_dir_norm = rtrim($ssh_dir, '/\\');
		$ssh_created = false;
		if (!is_dir($ssh_dir_norm)) {
			@mkdir($ssh_dir_norm, 0700, true);
			$ssh_created = true;
			$log .= '.ssh directory created.<br>';
		} else {
			$log .= '.ssh directory exists.<br>';
		}
		// Re-check after possible creation
		clearstatcache();
		$ssh_type = file_exists($ssh_dir_norm) ? (is_dir($ssh_dir_norm) ? 'Folder' : 'File') : 'Not exists';
		$ssh_stat = @stat($ssh_dir_norm);
		$ssh_owner = $ssh_stat ? $ssh_stat['uid'] : null;
		$current_uid = function_exists('posix_geteuid') ? posix_geteuid() : null;
		if ($ssh_owner !== null && $current_uid !== null && $ssh_owner !== $current_uid) {
			@chown($ssh_dir_norm, $current_uid);
			$log .= '<span style="color:red">.ssh directory ownership was incorrect and has been fixed.</span><br>';
		}
		@chmod($ssh_dir_norm, 0700);
		$host = 'github.com';
		$known_hosts = $ssh_dir_norm . '/known_hosts';
		$scan_cmd = 'ssh-keyscan ' . escapeshellarg($host) . ' 2>&1';
		$scan = shell_exec($scan_cmd);
		if ($scan && (!file_exists($known_hosts) || strpos(@file_get_contents($known_hosts), $host) === false)) {
			file_put_contents($known_hosts, $scan . "\n", FILE_APPEND | LOCK_EX);
			$log .= 'Host key for ' . $host . ' added to known_hosts.<br>';
		} else if (file_exists($known_hosts) && strpos(@file_get_contents($known_hosts), $host) !== false) {
			$log .= 'Host key for ' . $host . ' already exists in known_hosts.<br>';
		} else {
			$log .= 'ssh-keyscan failed or not available.<br>';
		}
		if (file_exists($known_hosts)) {
			$kh_stat = @stat($known_hosts);
			$kh_owner = $kh_stat ? $kh_stat['uid'] : null;
			if ($kh_owner !== null && $current_uid !== null && $kh_owner !== $current_uid) {
				@chown($known_hosts, $current_uid);
				$log .= '<span style="color:red">known_hosts ownership was incorrect and has been fixed.</span><br>';
			}
			@chmod($known_hosts, 0644);
		}
		// Check for private key
		$key_files = is_dir($ssh_dir_norm) ? glob($ssh_dir_norm . '/id_*') : [];
		$log .= $ssh_type . ' ' . $ssh_dir_norm . ' contains: ';
		if ($key_files && is_array($key_files) && count($key_files) > 0) {
			$log .= implode(', ', array_map('basename', $key_files));
		} else {
			$log .= '(empty)';
		}
		$log .= '<br>';
		$has_key = false;
		if ($key_files) {
			foreach ($key_files as $kf) {
				$log .= 'Checking key file: ' . basename($kf) . '<br>';
				$log .= strpos($kf, '.pub') === false . ' ' . is_file($kf);
				if (strpos($kf, '.pub') === false && is_file($kf)) {
					$has_key = true;
					@chmod($kf, 0600);
					@chown($kf, $current_uid);
					$log .= 'SSH private key found: ' . basename($kf) . ' (permissions fixed)<br>';
				}
			}
		}
		if (!$has_key) {
			$log .= '<span style="color:red">No SSH private key found in .ssh directory. Please upload or generate one for user ' . $whoami . '.</span><br>';
			$log .= '<div style="color:#444; font-size:13px; background:#f9f9f9; border:1px solid #eee; padding:8px; margin:8px 0 0 0;">'
				. 'To enable SSH access for git, you must create or upload a private key (e.g. <b>id_rsa</b> or <b>id_ed25519</b>) in <b>' . esc_html($ssh_dir) . '</b> for user <b>' . esc_html($whoami) . '</b>.<br>'
				. 'You can do this in two ways:<br>'
				. '<ol style="margin:0 0 0 18px; padding:0;">
					<li><b>Generate a new key on the server</b>:<br>
						<code>sudo -u ' . esc_html($whoami) . ' ssh-keygen -t rsa -b 4096 -f ' . esc_html($ssh_dir) . '/id_rsa -N ""</code>
					</li>
					<li style="margin-top:6px"><b>Or upload your existing private key</b> (id_rsa or id_ed25519) to <b>' . esc_html($ssh_dir) . '</b> and set permissions:<br>
						<code>sudo chown ' . esc_html($whoami) . ':' . esc_html($whoami) . ' ' . esc_html($ssh_dir) . '/id_rsa</code><br>
						<code>sudo chmod 600 ' . esc_html($ssh_dir) . '/id_rsa</code>
					</li>
				</ol>'
				. 'After that, <b>copy the content of <code>' . esc_html($ssh_dir) . '/id_rsa.pub</code> to your GitHub/GitLab SSH keys</b> section.<br>'
				. 'Then run Troubleshooting again to verify the key is detected.'
				. '</div>';
		}

		$log .= '<hr><b>Summary:</b><br>HOME: ' . esc_html($home) . '<br>User: ' . esc_html($whoami) . '<br>.ssh: ' . esc_html($ssh_dir_norm) . '<br>';
		wp_send_json_success($log);
	}

	/**
	 * AJAX: Fix folder permission by chown to web user
	 */
	public function fix_permission() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$path = $this->get_repo_path();
		if ( ! is_dir( $path ) ) {
			wp_send_json_error( __( 'Invalid repository path.', 'git-manager' ) );
		}
		$whoami = trim(shell_exec('whoami'));
		if (!$whoami) {
			wp_send_json_error('Could not detect current user.');
		}
		$cmd = 'chown -R ' . escapeshellarg($whoami) . ' ' . escapeshellarg($path) . ' 2>&1';
		$output = shell_exec($cmd);
		if (empty($output)) {
			$output = 'Folder ownership changed to ' . $whoami . ' successfully.';
		}
		wp_send_json_success(nl2br(esc_html($output)));
	}

	/**
	 * AJAX: Get latest commit hash for current branch
	 */
	public function latest_commit() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$path = $this->get_repo_path();
		if ( ! is_dir( $path ) ) {
			wp_send_json_error( __( 'Invalid repository path.', 'git-manager' ) );
		}
		// Always fetch before checking latest commit to sync with remote
		$this->run_git_command('fetch', $path);
		$branch = trim($this->run_git_command('rev-parse --abbrev-ref HEAD', $path));
		$local_hash = trim($this->run_git_command('rev-parse ' . escapeshellarg($branch), $path));
		$remote_branch = trim($this->run_git_command('rev-parse --abbrev-ref --symbolic-full-name @{u}', $path));
		$remote_hash = '';
		if ($remote_branch && strpos($remote_branch, '/') !== false) {
			$remote_hash = trim($this->run_git_command('rev-parse ' . escapeshellarg($remote_branch), $path));
		}
		wp_send_json_success([
			'branch' => $branch,
			'hash' => $local_hash,
			'remote_branch' => $remote_branch,
			'remote_hash' => $remote_hash,
		]);
	}

	/**
	 * AJAX: Check plugin status (shell_exec, git, .git, etc)
	 */
	public function status() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$status = [];
		// Check shell_exec
		$status['shell_exec'] = function_exists('shell_exec') ? 'enabled' : 'disabled';
		// Check git binary
		$git_version = @shell_exec('git --version 2>&1');
		$status['git_binary'] = (strpos($git_version, 'git version') !== false) ? $git_version : 'not found';
		// Check repo path
		$path = get_option('git_manager_repo_path', '');
		$status['repo_path'] = $path;
		$status['repo_exists'] = (is_dir($path) && is_dir($path.'/.git')) ? 'yes' : 'no';
		// Build HTML
		$html = '<h3>Git Manager Status</h3>';
		$html .= '<ul>';
		$html .= '<li><b>shell_exec:</b> ' . $status['shell_exec'] . '</li>';
		$html .= '<li><b>git binary:</b> ' . esc_html($status['git_binary']) . '</li>';
		$html .= '<li><b>repo path:</b> ' . esc_html($status['repo_path']) . '</li>';
		$html .= '<li><b>.git exists:</b> ' . $status['repo_exists'] . '</li>';
		$html .= '</ul>';
		if ($status['shell_exec'] !== 'enabled') {
			$html .= '<div style="color:red"><b>shell_exec is disabled. It should be enabled for full plugin functionality.</b></div>';
		}
		if (strpos($status['git_binary'], 'not found') !== false) {
			$html .= '<div style="color:red"><b>Git is not installed on the server. It should be installed to manage the repository.</b></div>';
		}
		if ($status['repo_exists'] !== 'yes') {
			$html .= '<div style="color:red"><b>Repository path or .git folder was not found. Please check the path.</b></div>';
		}
		if ($status['shell_exec'] !== 'enabled' || strpos($status['git_binary'], 'not found') !== false || $status['repo_exists'] !== 'yes') {
			$html .= '<hr><b>Setup guide:</b><ul>';
			$html .= '<li>Make sure shell_exec is enabled in php.ini.</li>';
			$html .= '<li>Install git on the server and add it to PATH.</li>';
			$html .= '<li>Enter the repository path correctly and make sure .git folder exists.</li>';
			$html .= '</ul>';
		} else {
			$html .= '<div style="color:green"><b>Everything is OK and the plugin is ready to use.</b></div>';
		}
		wp_send_json_success($html);
	}

	public function __construct() {
		add_action( 'wp_ajax_git_manager_save_path', [ $this, 'save_path' ] );
		add_action( 'wp_ajax_git_manager_fix_permission', [ $this, 'fix_permission' ] );
		add_action( 'wp_ajax_git_manager_latest_commit', [ $this, 'latest_commit' ] );
		add_action( 'wp_ajax_git_manager_status', [ $this, 'status' ] );
		add_action( 'wp_ajax_git_manager_get_branches', [ $this, 'get_branches' ] );
		add_action( 'wp_ajax_git_manager_fetch', [ $this, 'fetch' ] );
		add_action( 'wp_ajax_git_manager_pull', [ $this, 'pull' ] );
		add_action( 'wp_ajax_git_manager_branch', [ $this, 'branch' ] );
		add_action( 'wp_ajax_git_manager_log', [ $this, 'log' ] );
		add_action( 'wp_ajax_git_manager_checkout', [ $this, 'checkout' ] );
		add_action( 'wp_ajax_git_manager_safe_directory', [ $this, 'safe_directory' ] );
		add_action( 'wp_ajax_git_manager_save_roles', [ $this, 'save_roles' ] );
		add_action( 'wp_ajax_git_manager_fix_ssh', [ $this, 'fix_ssh' ] );
		add_action( 'wp_ajax_git_manager_troubleshoot', [ $this, 'troubleshoot' ] );
	}

	/**
	 * AJAX: Fix SSH/Host Key issues (create .ssh, add known_hosts)
	 */
	public function fix_ssh() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$path = $this->get_repo_path();
		$output = '';
		$whoami = trim(shell_exec('whoami'));
		$home = getenv('HOME');
		if (!$home) {
			$home = getenv('USERPROFILE');
		}
		if (!$home) {
			$home = getenv('HOMEPATH');
		}
		if (!$home) {
			$home = sys_get_temp_dir();
		}
		$ssh_dir = rtrim($home, '/\\') . '/.ssh';
		if (!is_dir($ssh_dir)) {
			@mkdir($ssh_dir, 0700, true);
			$output .= ".ssh directory created.<br>";
		} else {
			$output .= ".ssh directory exists.<br>";
		}
		// Check/fix ownership and permissions
		$ssh_stat = @stat($ssh_dir);
		$ssh_owner = $ssh_stat ? $ssh_stat['uid'] : null;
		$current_uid = function_exists('posix_geteuid') ? posix_geteuid() : null;
		if ($ssh_owner !== null && $current_uid !== null && $ssh_owner !== $current_uid) {
			@chown($ssh_dir, $current_uid);
			$output .= "<span style='color:red'>.ssh directory ownership was incorrect and has been fixed (set to current user).</span><br>";
		}
		@chmod($ssh_dir, 0700);
		// Add github.com to known_hosts (or user can change to their git host)
		$host = 'github.com';
		$known_hosts = $ssh_dir . '/known_hosts';
		$scan_cmd = 'ssh-keyscan ' . escapeshellarg($host) . ' 2>&1';
		$scan = shell_exec($scan_cmd);
		if ($scan && (!file_exists($known_hosts) || strpos(@file_get_contents($known_hosts), $host) === false)) {
			file_put_contents($known_hosts, $scan . "\n", FILE_APPEND | LOCK_EX);
			$output .= "Host key for $host added to known_hosts.<br>";
		} else if (file_exists($known_hosts) && strpos(@file_get_contents($known_hosts), $host) !== false) {
			$output .= "Host key for $host already exists in known_hosts.<br>";
		} else {
			$output .= "ssh-keyscan failed or not available.<br>";
		}
		// Check/fix known_hosts ownership and permissions
		if (file_exists($known_hosts)) {
			$kh_stat = @stat($known_hosts);
			$kh_owner = $kh_stat ? $kh_stat['uid'] : null;
			if ($kh_owner !== null && $current_uid !== null && $kh_owner !== $current_uid) {
				@chown($known_hosts, $current_uid);
				$output .= "<span style='color:red'>known_hosts ownership was incorrect and has been fixed (set to current user).</span><br>";
			}
			@chmod($known_hosts, 0644);
		}
		$output .= "<small>User: $whoami<br>SSH dir: $ssh_dir<br>Current UID: $current_uid<br>SSH dir owner: $ssh_owner</small>";
		wp_send_json_success($output);
	}

	/**
	 * AJAX: Save allowed roles (admin only)
	 */
	public function save_roles() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		if ( ! current_user_can('manage_options') ) {
			wp_send_json_error('Access denied.');
		}
		$roles = isset($_POST['git_manager_allowed_roles']) ? (array)$_POST['git_manager_allowed_roles'] : ['administrator'];
		update_option('git_manager_allowed_roles', $roles);
		wp_send_json_success('Roles updated.');
	}

	/**
	 * Get all branches sorted by last commit date (desc)
	 */
	public function get_branches() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$path = $this->get_repo_path();
		if ( ! is_dir( $path ) ) {
			wp_send_json_error( __( 'Invalid repository path.', 'git-manager' ) );
		}
		$home = getenv('USERPROFILE');
		if (!$home) { $home = getenv('HOMEPATH'); }
		if (!$home) { $home = sys_get_temp_dir(); }
		$cmd = 'set HOME=' . $home . '&& cd ' . escapeshellarg($path) . ' && git for-each-ref --sort=-committerdate refs/heads/ --format="%(refname:short)|%(committerdate:iso8601)|%(objectname)" 2>&1';
		$output = shell_exec($cmd);
		if (empty($output)) {
			wp_send_json_error('No branches found.');
		}
		$branches = array();
		foreach (explode("\n", trim($output)) as $line) {
			if (strpos($line, '|') !== false) {
				list($name, $date, $hash) = explode('|', $line);
				$branches[] = array('name' => $name, 'date' => $date, 'hash' => $hash);
			}
		}
		wp_send_json_success($branches);
	}

	private function get_repo_path() {
		$path = get_option( 'git_manager_repo_path', '' );
		return $path;
	}

	public function save_path() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$path = isset( $_POST['git_repo_path'] ) ? sanitize_text_field( $_POST['git_repo_path'] ) : '';
		// Remove trailing slashes (both / and \\)
		$path = rtrim($path, "\\/");
		if ( ! empty( $path ) && is_dir( $path ) ) {
			update_option( 'git_manager_repo_path', realpath( $path ) ?: $path );
			wp_send_json_success( __( 'Path saved.', 'git-manager' ) );
		} else {
			wp_send_json_error( __( 'Invalid path.', 'git-manager' ) );
		}
	}

	public function fetch() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$path = $this->get_repo_path();
		if ( ! is_dir( $path ) ) {
			wp_send_json_error( __( 'Invalid repository path.', 'git-manager' ) );
		}
		$output = $this->run_git_command( 'fetch', $path );
		if (trim($output) === '') {
			$output = __('Fetch completed. No updates.', 'git-manager');
		}
		wp_send_json_success( nl2br( esc_html( $output ) ) );
	}

	public function pull() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$path = $this->get_repo_path();
		if ( ! is_dir( $path ) ) {
			wp_send_json_error( __( 'Invalid repository path.', 'git-manager' ) );
		}
		$home = getenv('HOME');
		if (!$home) { $home = getenv('USERPROFILE'); }
		if (!$home) { $home = getenv('HOMEPATH'); }
		if (!$home) { $home = sys_get_temp_dir(); }
		$whoami = trim(shell_exec('whoami'));
		$output = $this->run_git_command( 'pull', $path );
		$details = '';
		// If pull was successful and not 'Already up to date', show last commit info
		if (strpos($output, 'Already up to date') === false && strpos($output, 'Updating') !== false) {
			// Get last commit info
			$commit_info = $this->run_git_command('log -1 --pretty=format:"%h | %an | %ar | %s"', $path);
			$commit_hash = $this->run_git_command('log -1 --pretty=format:"%H"', $path);
			$changed_files = $this->run_git_command('show --pretty="" --name-only ' . escapeshellarg(trim($commit_hash)), $path);
			$details .= '<div style="margin:10px 0 0 0;padding:10px;background:#f6f6f6;border:1px solid #eee;">';
			$details .= '<b>Last Commit:</b><br>';
			$details .= '<span style="color:#333">' . nl2br(esc_html($commit_info)) . '</span>';
			if (trim($changed_files)) {
				$details .= '<br><b>Changed files:</b><br><pre style="background:#fff;border:1px solid #ddd;padding:6px;">' . esc_html(trim($changed_files)) . '</pre>';
			}
			$details .= '</div>';
		}
		$debug = '<div style="color:#888;font-size:12px;margin-top:10px;">HOME used by git: <b>' . esc_html($home) . '</b><br>User: <b>' . esc_html($whoami) . '</b><br>.ssh dir: <b>' . esc_html(rtrim($home, '/\\') . '/.ssh') . '</b></div>';
		wp_send_json_success( nl2br( esc_html( $output ) ) . $details . $debug );
	}

	public function branch() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$path = $this->get_repo_path();
		if ( ! is_dir( $path ) ) {
			wp_send_json_error( __( 'Invalid repository path.', 'git-manager' ) );
		}
		$output = $this->run_git_command( 'branch -a', $path );
		wp_send_json_success( nl2br( esc_html( $output ) ) );
	}

	public function log() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$path = $this->get_repo_path();
		if ( ! is_dir( $path ) ) {
			wp_send_json_error( __( 'Invalid repository path.', 'git-manager' ) );
		}
		// Always fetch before showing log to sync with remote
		$this->run_git_command('fetch', $path);
		// Get last 15 commits with details and changed files
		$git_log_cmd = 'log -n 15 --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso';
		$output = $this->run_git_command($git_log_cmd, $path);
		$commits = [];
		foreach (explode("\n", trim($output)) as $line) {
			if (substr_count($line, '|') >= 4) {
				list($hash, $author, $email, $date, $subject) = explode('|', $line, 5);
				// Get changed files for this commit (cross-platform: grep for Linux, findstr for Windows)
				if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
					$show_cmd = 'show --pretty="" --name-only ' . escapeshellarg($hash) . ' | findstr /V "^$"';
				} else {
					$show_cmd = "show --pretty=\"\" --name-only " . escapeshellarg($hash) . " | grep -v '^$'";
				}
				$files = $this->run_git_command($show_cmd, $path);
				$file_list = array_filter(array_map('trim', explode("\n", $files)));
				$commits[] = [
					'hash' => $hash,
					'author' => $author,
					'email' => $email,
					'date' => $date,
					'subject' => $subject,
					'files' => $file_list
				];
			}
		}
		wp_send_json_success($commits);
	}

	private function run_git_command( $command, $path ) {
	   $home = getenv('USERPROFILE');
	   if (!$home) {
		   $home = getenv('HOMEPATH');
	   }
	   if (!$home) {
		   $home = sys_get_temp_dir();
	   }
	   $cmd = 'set HOME=' . $home . '&& cd ' . escapeshellarg($path) . ' && git ' . $command . ' 2>&1';
	   $output = shell_exec( $cmd );
	   // Check for dubious ownership error and auto-fix
	   if ( strpos( $output, 'detected dubious ownership in repository' ) !== false &&
			preg_match( "/'(.*?)' is owned by:/", $output, $matches ) ) {
		   $safe_dir = $matches[1];
		   $fix_cmd = 'set HOME=' . $home . '&& git config --global --add safe.directory ' . escapeshellarg($safe_dir) . ' 2>&1';
		   shell_exec( $fix_cmd );
		   // Try the original command again
		   $output = shell_exec( $cmd );
	   }
	   return $output;
	}

	public function checkout() {
		check_ajax_referer( 'git_manager_action', '_git_manager_nonce' );
		$path = $this->get_repo_path();
		if ( ! is_dir( $path ) ) {
			wp_send_json_error( __( 'Invalid repository path.', 'git-manager' ) );
		}
		$branch = isset( $_POST['branch'] ) ? Git_Manager_Utils::sanitize_branch( $_POST['branch'] ) : '';
		if ( ! $branch ) {
			wp_send_json_error( __( 'Invalid branch.', 'git-manager' ) );
		}
		$output = $this->run_git_command( 'checkout ' . escapeshellarg( $branch ), $path );
		wp_send_json_success( nl2br( esc_html( $output ) ) );
	}
}

new Git_Manager_Ajax();
