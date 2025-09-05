<?php

namespace WPGitManager\Service;

use WPGitManager\Admin\GitManager;

if (! defined('ABSPATH')) {
    exit;
}

class GitCommandRunner
{
    public static function run(string $repoPath, string $gitArgs, array $opts = []): array
    {
        if (! GitManager::are_commands_enabled()) {
            return ['success' => false, 'output' => 'Command execution is disabled', 'cmd' => $gitArgs];
        }
        $repoPath = rtrim($repoPath, '\\/');
        if (! is_dir($repoPath . '/.git')) {
            return ['success' => false, 'output' => 'Not a git repository'];
        }

        $home           = getenv('HOME') ?: (getenv('USERPROFILE') ?: sys_get_temp_dir());
        $homeClean      = str_replace('"', '', $home);
        $pathClean      = str_replace('"', '', $repoPath);
        $envPrefix      = '';
        $sshWrapperFile = null;
        if (! empty($opts['ssh_key'])) {
            $keyContent = $opts['ssh_key'];
            $tmpDir     = wp_upload_dir(null, false)['basedir'] . '/repo-manager-keys';
            if (! is_dir($tmpDir)) {
                @wp_mkdir_p($tmpDir);
            }

            $keyPath = $tmpDir . '/key_' . md5($keyContent) . '.pem';
            if (! file_exists($keyPath)) {
                file_put_contents($keyPath, $keyContent);
            }

            $wrapper = $tmpDir . '/ssh_wrapper_' . md5($keyPath) . ('WIN' === strtoupper(substr(PHP_OS, 0, 3)) ? '.bat' : '.sh');
            if ('WIN' === strtoupper(substr(PHP_OS, 0, 3))) {
                if (! file_exists($wrapper)) {
                    file_put_contents($wrapper, "@echo off\nssh -i \"{$keyPath}\" -o StrictHostKeyChecking=no %*\n");
                }
            } elseif (! file_exists($wrapper)) {
                file_put_contents($wrapper, "#!/bin/sh\nexec ssh -i '{$keyPath}' -o StrictHostKeyChecking=no \"$@\"\n");
            }

            $sshWrapperFile = $wrapper;
        }

        if ($sshWrapperFile) {
            if ('WIN' === strtoupper(substr(PHP_OS, 0, 3))) {
                $envPrefix .= 'set "GIT_SSH=' . $sshWrapperFile . '" && ';
            } else {
                $envPrefix .= 'GIT_SSH=' . escapeshellarg($sshWrapperFile) . ' ';
            }
        }

        if ('WIN' === strtoupper(substr(PHP_OS, 0, 3))) {
            $cmd = 'set "HOME=' . $homeClean . '" && ' . $envPrefix . 'git -C "' . $pathClean . '" ' . $gitArgs . ' 2>&1';
        } else {
            $cmd = $envPrefix . 'HOME=' . escapeshellarg($home) . ' git -C ' . escapeshellarg($repoPath) . ' ' . $gitArgs . ' 2>&1';
        }

        $out = shell_exec($cmd);
        if (null !== $out) {
            $out = preg_replace('/(ghp_\w{36})/', '[masked]', $out);
            $out = preg_replace('/(gho_\w{36})/', '[masked]', $out);
            $out = preg_replace('/(ghu_\w{36})/', '[masked]', $out);
            $out = preg_replace('/(ghr_\w{36})/', '[masked]', $out);
            $out = preg_replace('/([A-Za-z0-9]{40})/', '[masked]', $out);
            $out = preg_replace('/([A-Za-z0-9]{64})/', '[masked]', $out);
            $out = preg_replace('#(https?://)([^:@\s]{2,}):([^@\s]{2,})@#', '$1$2:[masked]@', $out);
        }

        return ['success' => true, 'output' => $out, 'cmd' => $gitArgs];
    }
}
