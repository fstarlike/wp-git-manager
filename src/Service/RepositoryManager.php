<?php

namespace WPGitManager\Service;

use WPGitManager\Model\Repository;

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Manages persistence and retrieval of repositories.
 */
class RepositoryManager
{
    private const OPTION_KEY = 'git_manager_repositories';

    private const ACTIVE_KEY = 'git_manager_active_repo';

    /** @var Repository[] */
    private array $cache = [];

    private static ?self $instance = null;

    public static function instance(): self
    {
        return self::$instance ??= new self();
    }

    private function __construct()
    {
        $this->load();
    }

    private function load(): void
    {
        $stored = get_option(self::OPTION_KEY, []);
        if (! is_array($stored)) {
            $stored = [];
        }

        $this->cache = [];
        foreach ($stored as $item) {
            if (is_array($item)) {
                $repo = new Repository($item);
                if ('' !== $repo->path && '0' !== $repo->path) {
                    $this->cache[$repo->id] = $repo;
                }
            }
        }
    }

    private function persist(): void
    {
        $out = [];
        foreach ($this->cache as $repo) {
            $out[] = $repo->toArray();
        }

        update_option(self::OPTION_KEY, $out, false);
    }

    /** @return Repository[] */
    public function all(): array
    {
        return array_values($this->cache);
    }

    public function get(string $id): ?Repository
    {
        return $this->cache[$id] ?? null;
    }

    public function getActiveId(): ?string
    {
        $id = get_option(self::ACTIVE_KEY);

        return $id && isset($this->cache[$id]) ? $id : null;
    }

    public function setActive(string $id): bool
    {
        if (! isset($this->cache[$id])) {
            return false;
        }

        update_option(self::ACTIVE_KEY, $id, false);

        return true;
    }

    public function add(array $data): Repository
    {
        $repo                   = new Repository($data);
        $this->cache[$repo->id] = $repo;
        $this->persist();

        return $repo;
    }

    public function update(string $id, array $data): ?Repository
    {
        $repo = $this->get($id);
        if (!$repo instanceof Repository) {
            return null;
        }

        foreach (['name', 'path', 'remoteUrl', 'authType', 'meta'] as $k) {
            if (array_key_exists($k, $data)) {
                $repo->$k = ('path' === $k) ? rtrim((string) $data[$k], '\\/') : $data[$k];
            }
        }

        $this->persist();

        return $repo;
    }

    public function delete(string $id): bool
    {
        if (! isset($this->cache[$id])) {
            return false;
        }

        unset($this->cache[$id]);
        $this->persist();
        $active = $this->getActiveId();
        if ($active === $id) {
            delete_option(self::ACTIVE_KEY);
        }

        return true;
    }

    /** Basic path security: ensure requested path stays inside ABSPATH unless user has manage_options */
    public function validatePath(string $path): bool
    {
        $absolutePath = $path;

        if (0 === strpos($path, '/wp-content') || 0 === strpos($path, '/wp-admin') || 0 === strpos($path, '/wp-includes')) {
            $absolutePath = ABSPATH . ltrim($path, '/');

        } elseif (! path_is_absolute($path)) {
            $absolutePath = ABSPATH . $path;

        } else {

        }

        $real = realpath($absolutePath);

        if ($real) {
            $real = rtrim($real, '\\/');
            $root = rtrim(ABSPATH, '\\/');

            if (current_user_can('manage_options')) {
                return true;
            }

            return 0 === strpos($real, $root);
        } else {
            $parent = dirname($absolutePath);
            $real   = realpath($parent);

            if (! $real) {

                return false;
            }

            $real = rtrim($real, '\\/');
            $root = rtrim(ABSPATH, '\\/');

            if (current_user_can('manage_options')) {
                return true;
            }

            return 0 === strpos($real, $root);
        }
    }

    /**
     * Clean up legacy repositories and options
     */
    public function cleanupLegacyData(): void
    {
        delete_option('git_manager_repo_path');
        delete_option('git_manager_repos');

        $legacyIds = [];
        foreach ($this->cache as $id => $repo) {
            if (false !== strpos($repo->name, 'Legacy')) {
                $legacyIds[] = $id;
            }
        }

        foreach ($legacyIds as $id) {
            $this->delete($id);
        }

        $activeId = $this->getActiveId();
        if ($activeId && ! isset($this->cache[$activeId])) {
            delete_option(self::ACTIVE_KEY);
        }
    }
}
