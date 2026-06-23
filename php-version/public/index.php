<?php
/**
 * CarParts B2B - 入口文件
 */

// 错误报告
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// 定义路径
define('ROOT_PATH', dirname(__DIR__));
define('PUBLIC_PATH', __DIR__);
define('APP_PATH', ROOT_PATH . '/app');
define('CONFIG_PATH', ROOT_PATH . '/config');
define('VIEW_PATH', ROOT_PATH . '/resources/views');
define('UPLOAD_PATH', PUBLIC_PATH . '/uploads');

// 加载配置
require_once ROOT_PATH . '/config/app.php';
require_once ROOT_PATH . '/config/database.php';

// 自动加载
spl_autoload_register(function ($class) {
    $paths = [
        APP_PATH . '/',
        APP_PATH . '/Controllers/',
        APP_PATH . '/Models/',
        APP_PATH . '/Services/',
        APP_PATH . '/Middleware/',
    ];

    foreach ($paths as $path) {
        $file = $path . $class . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});

// 启动会话
session_start();

// 简单路由器
class Router {
    private static $routes = [];

    public static function get($path, $handler) {
        self::$routes['GET'][$path] = $handler;
    }

    public static function post($path, $handler) {
        self::$routes['POST'][$path] = $handler;
    }

    public static function put($path, $handler) {
        self::$routes['PUT'][$path] = $handler;
    }

    public static function delete($path, $handler) {
        self::$routes['DELETE'][$path] = $handler;
    }

    public static function dispatch() {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $uri = rtrim($uri, '/') ?: '/';

        // 处理 API 路由
        if (strpos($uri, '/api/') === 0) {
            header('Content-Type: application/json');
            self::handleApi($method, $uri);
            return;
        }

        // 处理静态资源
        $file = PUBLIC_PATH . $uri;
        if (file_exists($file) && is_file($file)) {
            return false;
        }

        // 处理页面路由
        self::handlePage($method, $uri);
    }

    private static function handleApi($method, $uri) {
        $routes = self::$routes[$method] ?? [];

        foreach ($routes as $pattern => $handler) {
            $pattern = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $pattern);
            $pattern = '#^' . $pattern . '$#';

            if (preg_match($pattern, $uri, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

                if (is_array($handler)) {
                    [$controller, $action] = $handler;
                    $instance = new $controller();
                    $instance->$action(...array_values($params));
                } else {
                    $handler(...array_values($params));
                }
                return;
            }
        }

        http_response_code(404);
        echo json_encode(['error' => 'Not Found']);
    }

    private static function handlePage($method, $uri) {
        // 默认路由到前端 SPA
        $indexFile = PUBLIC_PATH . '/index.html';
        if (file_exists($indexFile)) {
            readfile($indexFile);
        } else {
            echo '<h1>CarParts B2B</h1><p>Frontend not built yet.</p>';
        }
    }
}

// 加载路由
require_once ROOT_PATH . '/routes/api.php';

// 启动路由
Router::dispatch();
