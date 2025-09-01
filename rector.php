<?php

declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\Set\ValueObject\LevelSetList;
use Rector\Set\ValueObject\SetList;

return static function (RectorConfig $rectorConfig): void {
    $rectorConfig->paths([
        __DIR__ . '/src',
        __DIR__ . '/wp-git-manager.php',
    ]);

    $rectorConfig->sets([
        LevelSetList::UP_TO_PHP_74,

        SetList::CODE_QUALITY,
        SetList::DEAD_CODE,
        SetList::CODING_STYLE,
    ]);

    $rectorConfig->importNames(true);
    $rectorConfig->importShortClasses(false);

    $rectorConfig->skip([
        __DIR__ . '/vendor',
        __DIR__ . '/node_modules',
        __DIR__ . '/phpstan-cache',
        __DIR__ . '/languages',
        __DIR__ . '/rector.php',
    ]);
};
