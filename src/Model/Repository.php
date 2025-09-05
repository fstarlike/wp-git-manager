<?php

namespace WPGitManager\Model;

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Value object representing a Git repository managed by the Plugin.
 */
class Repository
{
    public string $id;

    public string $name;

    public string $path;

    public ?string $remoteUrl;

    public string $authType;

    public array $meta;

    public ?string $activeBranch = null;

    public function __construct(array $data)
    {
        $this->id        = $data['id'] ?? wp_generate_uuid4();
        $this->name      = $data['name'] ?? 'Repository';
        $this->path      = rtrim($data['path'] ?? '', '\\/');
        $this->remoteUrl = $data['remoteUrl'] ?? null;
        $this->authType  = $data['authType'] ?? 'ssh';
        $this->meta      = is_array($data['meta'] ?? null) ? $data['meta'] : [];
    }

    public function toArray(): array
    {
        $resolvedPath = realpath($this->path);
        if (false === $resolvedPath) {
            $resolvedPath = $this->path;
        }

        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'path'         => $resolvedPath,
            'remoteUrl'    => $this->remoteUrl,
            'authType'     => $this->authType,
            'meta'         => $this->meta,
            'activeBranch' => $this->activeBranch,
        ];
    }
}
