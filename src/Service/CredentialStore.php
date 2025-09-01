<?php

namespace WPGitManager\Service;

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Lightweight credential store (placeholder). Sensitive data is masked when returned.
 * For production consider integrating with a secure vault or WP core secrets API.
 */
class CredentialStore
{
    private const OPTION_KEY = 'git_manager_repo_credentials';

    public static function set(string $repoId, array $data): void
    {
        $all = get_option(self::OPTION_KEY, []);
        if (! is_array($all)) {
            $all = [];
        }

        if (isset($data['private_key'])) {
            $data['private_key'] = base64_encode($data['private_key']);
        }

        $all[$repoId] = $data;
        update_option(self::OPTION_KEY, $all, false);
    }

    public static function get(string $repoId, bool $raw = false): ?array
    {
        $all = get_option(self::OPTION_KEY, []);
        if (! is_array($all) || ! isset($all[$repoId])) {
            return null;
        }

        $cred = $all[$repoId];
        if (! $raw) {
            if (isset($cred['private_key'])) {
                $cred['private_key'] = '[hidden]';
            }

            if (isset($cred['password'])) {
                $cred['password'] = '[hidden]';
            }

            if (isset($cred['token'])) {
                $cred['token'] = self::mask($cred['token']);
            }
        } elseif (isset($cred['private_key'])) {
            $cred['private_key'] = base64_decode($cred['private_key']);
        }

        return $cred;
    }

    private static function mask(string $value): string
    {
        if (strlen($value) <= 6) {
            return '***';
        }

        return substr($value, 0, 3) . '***' . substr($value, -3);
    }
}
