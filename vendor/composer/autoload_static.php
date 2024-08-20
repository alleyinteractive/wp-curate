<?php

// autoload_static.php @generated by Composer

namespace Composer\Autoload;

class ComposerStaticInit0c1fa4f8feb61bcb8545498da42e58c6
{
    public static $files = array (
        'c9d07b32a2e02bc0fc582d4f0c1b56cc' => __DIR__ . '/..' . '/laminas/laminas-servicemanager/src/autoload.php',
        '22177d82d05723dff5b1903f4496520e' => __DIR__ . '/..' . '/alleyinteractive/wordpress-autoloader/src/class-autoloader.php',
        'd0b4d9ff2237dcc1a532ae9d039c0c2c' => __DIR__ . '/..' . '/alleyinteractive/composer-wordpress-autoloader/src/autoload.php',
        'b4c1393590946316912f1825c4d559f0' => __DIR__ . '/..' . '/alleyinteractive/wp-match-blocks/src/alley/wp/match-blocks.php',
        '34b197430e01f74411146b5dd772055d' => __DIR__ . '/..' . '/alleyinteractive/wp-match-blocks/src/alley/wp/internals/internals.php',
        'ed33d19cba977f2a7e321f120d94a872' => __DIR__ . '/..' . '/spatie/once/src/functions.php',
        '18ea4761fe239e693375d30a01936633' => __DIR__ . '/..' . '/alleyinteractive/traverse-reshape/src/Alley/reshape.php',
        '3e170268241fa56c275e43aec546ca42' => __DIR__ . '/..' . '/alleyinteractive/traverse-reshape/src/Alley/traverse.php',
    );

    public static $prefixLengthsPsr4 = array (
        'S' => 
        array (
            'Spatie\\Once\\' => 12,
        ),
        'P' => 
        array (
            'Psr\\Http\\Message\\' => 17,
            'Psr\\Container\\' => 14,
        ),
        'L' => 
        array (
            'Laminas\\Validator\\' => 18,
            'Laminas\\Stdlib\\' => 15,
            'Laminas\\ServiceManager\\' => 23,
        ),
        'C' => 
        array (
            'ComposerWordPressAutoloader\\' => 28,
        ),
        'A' => 
        array (
            'Alley\\' => 6,
        ),
    );

    public static $prefixDirsPsr4 = array (
        'Spatie\\Once\\' => 
        array (
            0 => __DIR__ . '/..' . '/spatie/once/src',
        ),
        'Psr\\Http\\Message\\' => 
        array (
            0 => __DIR__ . '/..' . '/psr/http-message/src',
        ),
        'Psr\\Container\\' => 
        array (
            0 => __DIR__ . '/..' . '/psr/container/src',
        ),
        'Laminas\\Validator\\' => 
        array (
            0 => __DIR__ . '/..' . '/laminas/laminas-validator/src',
        ),
        'Laminas\\Stdlib\\' => 
        array (
            0 => __DIR__ . '/..' . '/laminas/laminas-stdlib/src',
        ),
        'Laminas\\ServiceManager\\' => 
        array (
            0 => __DIR__ . '/..' . '/laminas/laminas-servicemanager/src',
        ),
        'ComposerWordPressAutoloader\\' => 
        array (
            0 => __DIR__ . '/..' . '/alleyinteractive/composer-wordpress-autoloader/src',
        ),
        'Alley\\' => 
        array (
            0 => __DIR__ . '/..' . '/alleyinteractive/traverse-reshape/src/Alley',
            1 => __DIR__ . '/..' . '/alleyinteractive/laminas-validator-extensions/src/Alley',
        ),
    );

    public static $classMap = array (
        'Composer\\InstalledVersions' => __DIR__ . '/..' . '/composer/InstalledVersions.php',
    );

    public static function getInitializer(ClassLoader $loader)
    {
        return \Closure::bind(function () use ($loader) {
            $loader->prefixLengthsPsr4 = ComposerStaticInit0c1fa4f8feb61bcb8545498da42e58c6::$prefixLengthsPsr4;
            $loader->prefixDirsPsr4 = ComposerStaticInit0c1fa4f8feb61bcb8545498da42e58c6::$prefixDirsPsr4;
            $loader->classMap = ComposerStaticInit0c1fa4f8feb61bcb8545498da42e58c6::$classMap;

        }, null, ClassLoader::class);
    }
}
