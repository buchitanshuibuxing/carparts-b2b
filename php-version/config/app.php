<?php
/**
 * 应用配置
 */

return [
    // 应用名称
    'name' => 'CarParts B2B',

    // 应用版本
    'version' => '1.0.0',

    // 时区
    'timezone' => 'Asia/Shanghai',

    // 调试模式
    'debug' => true,

    // 密钥
    'key' => 'your-secret-key-change-this',

    // JWT 密钥
    'jwt_secret' => 'your-jwt-secret-change-this',

    // JWT 过期时间（秒）
    'jwt_expires' => 86400,

    // 上传配置
    'upload' => [
        'max_size' => 50 * 1024 * 1024, // 50MB
        'allowed_types' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'],
        'path' => 'uploads',
    ],
];
