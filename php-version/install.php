<?php
/**
 * CarParts B2B 安装脚本
 * 访问 http://your-domain/install.php 运行安装
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// 检查是否已安装
if (file_exists(__DIR__ . '/.installed')) {
    die('系统已安装。如需重新安装，请删除 .installed 文件');
}

// 检查 PHP 版本
if (version_compare(PHP_VERSION, '8.0', '<')) {
    die('需要 PHP 8.0 或更高版本');
}

// 检查扩展
$requiredExtensions = ['pdo', 'pdo_mysql', 'json', 'mbstring', 'curl', 'openssl'];
$missingExtensions = [];
foreach ($requiredExtensions as $ext) {
    if (!extension_loaded($ext)) {
        $missingExtensions[] = $ext;
    }
}

if (!empty($missingExtensions)) {
    die('缺少必需的 PHP 扩展: ' . implode(', ', $missingExtensions));
}

// 处理表单提交
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $dbHost = $_POST['db_host'] ?? '127.0.0.1';
    $dbPort = $_POST['db_port'] ?? '3306';
    $dbName = $_POST['db_name'] ?? 'carparts';
    $dbUser = $_POST['db_user'] ?? 'root';
    $dbPass = $_POST['db_pass'] ?? '';
    $adminUser = $_POST['admin_user'] ?? 'admin';
    $adminPass = $_POST['admin_pass'] ?? 'admin123';
    $adminEmail = $_POST['admin_email'] ?? 'admin@carparts.com';

    try {
        // 连接数据库
        $pdo = new PDO(
            "mysql:host=$dbHost;port=$dbPort",
            $dbUser,
            $dbPass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );

        // 创建数据库
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `$dbName`");

        // 执行迁移
        $migration = file_get_contents(__DIR__ . '/database/migrations/001_create_tables.sql');
        $pdo->exec($migration);

        // 创建管理员
        $passwordHash = password_hash($adminPass, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash, display_name, role, is_active) VALUES (?, ?, ?, ?, 'admin', 1) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)");
        $stmt->execute([$adminUser, $adminEmail, $passwordHash, 'Administrator']);

        // 保存配置
        $configContent = "<?php\nreturn [\n";
        $configContent .= "    'driver' => 'mysql',\n";
        $configContent .= "    'host' => '$dbHost',\n";
        $configContent .= "    'port' => $dbPort,\n";
        $configContent .= "    'database' => '$dbName',\n";
        $configContent .= "    'username' => '$dbUser',\n";
        $configContent .= "    'password' => '" . addslashes($dbPass) . "',\n";
        $configContent .= "    'charset' => 'utf8mb4',\n";
        $configContent .= "    'collation' => 'utf8mb4_unicode_ci',\n";
        $configContent .= "    'prefix' => '',\n";
        $configContent .= "    'options' => [\n";
        $configContent .= "        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,\n";
        $configContent .= "        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,\n";
        $configContent .= "        PDO::ATTR_EMULATE_PREPARES => false,\n";
        $configContent .= "    ],\n";
        $configContent .= "];\n";

        file_put_contents(__DIR__ . '/config/database.php', $configContent);

        // 创建安装标记
        file_put_contents(__DIR__ . '/.installed', date('Y-m-d H:i:s'));

        $success = '安装成功！<br>管理员: ' . $adminUser . '<br>密码: ' . $adminPass;
    } catch (PDOException $e) {
        $error = '数据库错误: ' . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CarParts B2B - 安装向导</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 40px; max-width: 500px; width: 90%; }
        h1 { text-align: center; color: #1e40af; margin-bottom: 30px; font-size: 24px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; color: #374151; }
        input { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .btn { width: 100%; padding: 14px; background: #1e40af; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; }
        .btn:hover { background: #1e3a8a; }
        .error { color: #dc2626; background: #fef2f2; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
        .success { color: #059669; background: #f0fdf4; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb; }
        .section-title { font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚗 CarParts B2B 安装向导</h1>

        <?php if (isset($error)): ?>
            <div class="error"><?php echo $error; ?></div>
        <?php endif; ?>

        <?php if (isset($success)): ?>
            <div class="success"><?php echo $success; ?></div>
            <a href="/" class="btn" style="display:block;text-align:center;text-decoration:none;">进入系统</a>
        <?php else: ?>
            <form method="POST">
                <div class="section">
                    <div class="section-title">数据库配置</div>
                    <div class="form-group">
                        <label>数据库主机</label>
                        <input type="text" name="db_host" value="127.0.0.1" required>
                    </div>
                    <div class="form-group">
                        <label>数据库端口</label>
                        <input type="text" name="db_port" value="3306" required>
                    </div>
                    <div class="form-group">
                        <label>数据库名称</label>
                        <input type="text" name="db_name" value="carparts" required>
                    </div>
                    <div class="form-group">
                        <label>数据库用户</label>
                        <input type="text" name="db_user" value="root" required>
                    </div>
                    <div class="form-group">
                        <label>数据库密码</label>
                        <input type="password" name="db_pass">
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">管理员设置</div>
                    <div class="form-group">
                        <label>管理员用户名</label>
                        <input type="text" name="admin_user" value="admin" required>
                    </div>
                    <div class="form-group">
                        <label>管理员密码</label>
                        <input type="password" name="admin_pass" value="admin123" required>
                    </div>
                    <div class="form-group">
                        <label>管理员邮箱</label>
                        <input type="email" name="admin_email" value="admin@carparts.com">
                    </div>
                </div>

                <button type="submit" class="btn">开始安装</button>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>
