<?php

// Quick test harness to print how build_git_cmd forms commands on Windows and POSIX
function is_windows()
{
    return strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
}
function build_git_cmd($git_command, $path)
{
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
    $home_clean = str_replace('"', '', $home);
    $path_clean = str_replace('"', '', $path);
    if (is_windows()) {
        return 'set "HOME='.$home_clean.'" && git -C "'.$path_clean.'" '.$git_command.' 2>&1';
    }

    return 'HOME='.escapeshellarg($home).' git -C '.escapeshellarg($path).' '.$git_command.' 2>&1';
}
$examples = [
    'C:\\Windows\\TEMP',
    'C:\\Program Files\\Git\\my repo',
    '/var/www/html/myrepo',
    'C:\\Users\\Admin\\AppData\\Local\\Temp\\.config\\git',
];
foreach ($examples as $p) {
    echo "Path: $p\n";
    echo 'Windows-style command: '.build_git_cmd('config --local --add safe.directory '.escapeshellarg($p), $p)."\n";
    echo 'POSIX-style command:   '.(function () use ($p) {
        $home = getenv('HOME') ?: getenv('USERPROFILE') ?: sys_get_temp_dir();

        return 'HOME='.escapeshellarg($home).' git -C '.escapeshellarg($p).' config --local --add safe.directory '.escapeshellarg($p).' 2>&1';
    })()."\n";
    echo "---\n";
}
