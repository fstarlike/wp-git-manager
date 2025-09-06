<?php

namespace WPGitManager\View\Components;

class AddRepository
{
    public function render()
    {
        ?>
        <!-- Add Repository Section -->
        <div class="git-add-repository" id="git-add-repository" style="display: none;">
            <div class="add-repo-header">
                <button class="git-back-btn" id="back-to-welcome">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <path d="M19 12H5"/>
                        <path d="M12 19l-7-7 7-7"/>
                    </svg>
                    <?php echo esc_html__('Back to Welcome', 'repo-manager'); ?>
                </button>
                <h2>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" style="margin-right: 12px;">
                        <path d="M5 12h14"/>
                        <path d="M12 5v14"/>
                    </svg>
                    <?php echo esc_html__('Add New Repository', 'repo-manager'); ?>
                </h2>
            </div>

            <div class="add-repo-content">
                <form id="add-repo-form" class="git-add-repo-form">
                    <?php $this->renderRepositoryTypeSection(); ?>
                    <?php $this->renderRepositoryInfoSection(); ?>
                    <?php $this->renderAuthenticationSection(); ?>
                    <?php $this->renderFormActions(); ?>
                </form>
            </div>
        </div>
        <?php
    }

    private function renderRepositoryInfoSection()
    {
        ?>
        <div class="form-section">
            <h3><?php echo esc_html__('Repository Information', 'repo-manager'); ?></h3>

            <div class="form-group">
                <label for="add-repo-path"><?php echo esc_html__('Local Path', 'repo-manager'); ?></label>
                <div class="input-group">
                    <input
                        type="text"
                        id="add-repo-path"
                        name="repo_path"
                        class="form-control"
                        placeholder="<?php echo esc_attr__('wp-content/plugins', 'repo-manager'); ?>"
                        required
                    >
                    <button type="button" class="git-action-btn git-secondary-btn" id="browse-path-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                        </svg>
                        <?php echo esc_html__('Browse', 'repo-manager'); ?>
                    </button>
                </div>
                <div class="form-help"><?php echo esc_html__('Select the parent directory where the repository will be cloned', 'repo-manager'); ?></div>
            </div>

            <div class="form-group">
                <label for="add-repo-url"><?php echo esc_html__('Repository URL', 'repo-manager'); ?></label>
                <input
                    type="text"
                    id="add-repo-url"
                    name="repo_url"
                    class="form-control"
                    placeholder="<?php echo esc_attr__('https://github.com/user/repo.git', 'repo-manager'); ?>"
                    required
                    autocomplete="off"
                >
                <div class="form-help"><?php echo esc_html__('Enter the Git repository URL (HTTPS or SSH) - fields will auto-populate', 'repo-manager'); ?></div>
            </div>

            <div class="form-group">
                <label for="add-repo-branch"><?php echo esc_html__('Branch (Optional)', 'repo-manager'); ?></label>
                <input
                    type="text"
                    id="add-repo-branch"
                    name="repo_branch"
                    class="form-control"
                    placeholder="<?php echo esc_attr__('main', 'repo-manager'); ?>"
                >
                <div class="form-help"><?php echo esc_html__('Specify a branch to checkout (defaults to main/master)', 'repo-manager'); ?></div>
            </div>
        </div>
        <?php
    }

    private function renderAuthenticationSection()
    {
        ?>
        <div class="form-section">
            <h3><?php echo esc_html__('Authentication', 'repo-manager'); ?></h3>

            <div class="form-group">
                <label class="switch-label">
                    <span class="switch-text"><?php echo esc_html__('This is a private repository', 'repo-manager'); ?></span>
                    <div class="switch-container">
                        <input type="checkbox" id="add-private-repo" name="private_repo" class="switch-input">
                        <span class="switch-slider"></span>
                    </div>
                </label>
                <div class="form-help"><?php echo esc_html__('Enable if the repository requires authentication', 'repo-manager'); ?></div>
            </div>

            <!-- Authentication Type Selection -->
            <div id="add-auth-type-section" class="form-group" style="display: none;">
                <label><?php echo esc_html__('Authentication Method', 'repo-manager'); ?></label>
                <div class="auth-method-selector">
                    <label class="auth-method-option">
                        <input type="radio" name="auth_type" value="ssh" checked>
                        <div class="auth-method-card">
                            <div class="auth-method-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/>
                                    <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>
                                </svg>
                            </div>
                            <div class="auth-method-content">
                                <h5><?php echo esc_html__('SSH Key', 'repo-manager'); ?></h5>
                                <p><?php echo esc_html__('Use SSH private key for authentication', 'repo-manager'); ?></p>
                            </div>
                        </div>
                    </label>

                    <label class="auth-method-option">
                        <input type="radio" name="auth_type" value="https">
                        <div class="auth-method-card">
                            <div class="auth-method-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M7 3.34V5a3 3 0 0 0 3 3"/>
                                    <path d="M11 21.95V18a2 2 0 0 0-2-2 2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"/>
                                    <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"/>
                                    <path d="M12 2a10 10 0 1 0 9.54 13"/>
                                    <path d="M20 6V4a2 2 0 1 0-4 0v2"/>
                                    <rect width="8" height="5" x="14" y="6" rx="1"/>
                                </svg>
                            </div>
                            <div class="auth-method-content">
                                <h5><?php echo esc_html__('HTTPS Token', 'repo-manager'); ?></h5>
                                <p><?php echo esc_html__('Use username and personal access token', 'repo-manager'); ?></p>
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            <?php $this->renderSSHAuthFields(); ?>
            <?php $this->renderHTTPSAuthFields(); ?>
        </div>
        <?php
    }

    private function renderSSHAuthFields()
    {
        ?>
        <!-- SSH Authentication Fields -->
        <div id="add-ssh-auth-fields" class="auth-fields" style="display: none;">
            <div class="form-group">
                <label for="add-ssh-key"><?php echo esc_html__('SSH Private Key', 'repo-manager'); ?></label>
                <div class="ssh-key-input-group">
                    <textarea
                        id="add-ssh-key"
                        name="private_key"
                        class="form-control"
                        rows="8"
                        placeholder="<?php echo esc_attr__('-----BEGIN OPENSSH PRIVATE KEY-----&#10;Your SSH private key content here...&#10;-----END OPENSSH PRIVATE KEY-----', 'repo-manager'); ?>"
                    ></textarea>
                    <div class="ssh-key-actions">
                        <button type="button" class="ssh-key-action-btn" onclick="importSSHKey()" title="<?php echo esc_attr__('Import SSH key from file', 'repo-manager'); ?>">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            <?php echo esc_html__('Import', 'repo-manager'); ?>
                        </button>
                        <button type="button" class="ssh-key-action-btn" onclick="clearSSHKey()" title="<?php echo esc_attr__('Clear SSH key', 'repo-manager'); ?>">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                                <path d="M3 6h18"/>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                            <?php echo esc_html__('Clear', 'repo-manager'); ?>
                        </button>
                    </div>
                </div>
                <div class="form-help">
                    <div class="help-links">
                        <div onclick="showSSHHelp()" class="help-link">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                <path d="M12 17h.01"/>
                            </svg>
                            <?php echo esc_html__('How to generate SSH key', 'repo-manager'); ?>
                        </div>
                        <div onclick="importSSHKey()" class="help-link import-link">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            <?php echo esc_html__('Import from file', 'repo-manager'); ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    private function renderHTTPSAuthFields()
    {
        ?>
        <!-- HTTPS Authentication Fields -->
        <div id="add-https-auth-fields" class="auth-fields" style="display: none;">
            <div class="form-group">
                <label for="add-username"><?php echo esc_html__('Username', 'repo-manager'); ?></label>
                <input
                    type="text"
                    id="add-username"
                    name="username"
                    class="form-control"
                    placeholder="<?php echo esc_attr__('your-username', 'repo-manager'); ?>"
                >
                <div class="form-help"><?php echo esc_html__('Your Git hosting service username', 'repo-manager'); ?></div>
            </div>

            <div class="form-group">
                <label for="add-token"><?php echo esc_html__('Personal Access Token', 'repo-manager'); ?></label>
                <div class="input-group">
                    <input
                        type="password"
                        id="add-token"
                        name="token"
                        class="form-control"
                        placeholder="<?php echo esc_attr__('ghp_xxxxxxxxxxxxxxxxxxxx', 'repo-manager'); ?>"
                    >
                    <button type="button" class="git-action-btn git-secondary-btn" id="toggle-add-token-visibility">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                </div>
                <div class="form-help">
                    <div class="help-links">
                        <div onclick="showTokenHelp()" class="help-link">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                <path d="M12 17h.01"/>
                            </svg>
                            <?php echo esc_html__('How to create access token', 'repo-manager'); ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    private function renderRepositoryTypeSection()
    {
        ?>
        <div class="form-section">
            <h3><?php echo esc_html__('Repository Type', 'repo-manager'); ?></h3>

            <div class="form-group">
                <label class="switch-label">
                    <span class="switch-text"><?php echo esc_html__('This is an existing Git repository', 'repo-manager'); ?></span>
                    <div class="switch-container">
                        <input type="checkbox" id="add-existing-repo" name="existing_repo" class="switch-input">
                        <span class="switch-slider"></span>
                    </div>
                </label>
                <div class="form-help"><?php echo esc_html__('Enable if the directory already contains a Git repository', 'repo-manager'); ?></div>
            </div>
        </div>
        <?php
    }

    private function renderFormActions()
    {
        ?>
        <div class="form-actions">
            <button type="button" class="git-action-btn git-secondary-btn" id="cancel-add-repo">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                <?php echo esc_html__('Cancel', 'repo-manager'); ?>
            </button>
            <button type="submit" class="git-action-btn" id="submit-add-repo">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <?php echo esc_html__('Add Repository', 'repo-manager'); ?>
            </button>
        </div>
        <?php
    }
}
