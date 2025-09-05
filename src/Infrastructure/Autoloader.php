<?php

/**
 * Simple PSR-4 Autoloader for the Plugin (fallback if Composer not used)
 */

namespace WPGitManager\Infrastructure;

if (! defined('ABSPATH')) {
    exit;
}

class Autoloader
{
    private string $baseNamespace = 'WPGitManager\\';

    private string $baseDir;

    public function __construct(string $baseDir)
    {
        $this->baseDir = rtrim($baseDir, '/\\') . DIRECTORY_SEPARATOR;
    }

    public function register(): void
    {
        spl_autoload_register([$this, 'load']);
    }

    private function load(string $class): void
    {
        if (0 !== strpos($class, $this->baseNamespace)) {
            return;
        }

        $relative = substr($class, strlen($this->baseNamespace));
        $relative = str_replace('\\', DIRECTORY_SEPARATOR, $relative);

        $file = $this->baseDir . $relative . '.php';
        if (is_file($file)) {
            require_once $file;
        }
    }
}
