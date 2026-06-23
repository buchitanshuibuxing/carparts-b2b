<?php
/**
 * 数据库配置
 */

return [
    // 数据库类型
    'driver' => 'mysql',

    // 主机
    'host' => '127.0.0.1',

    // 端口
    'port' => 3306,

    // 数据库名
    'database' => 'carparts',

    // 用户名
    'username' => 'root',

    // 密码
    'password' => '',

    // 字符集
    'charset' => 'utf8mb4',

    // 排序规则
    'collation' => 'utf8mb4_unicode_ci',

    // 前缀
    'prefix' => '',

    // 连接选项
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ],
];
