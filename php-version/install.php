<?php
/**
 * CarParts B2B 安装向导
 * 访问 http://your-domain/ 自动跳转到此页面
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// 检查是否已安装
if (file_exists(__DIR__ . '/.installed')) {
    header('Location: /');
    exit;
}

// 检查 PHP 版本
$phpOk = version_compare(PHP_VERSION, '8.0', '>=');

// 检查扩展
$requiredExtensions = ['pdo', 'pdo_mysql', 'json', 'mbstring', 'curl', 'openssl'];
$missingExtensions = [];
foreach ($requiredExtensions as $ext) {
    if (!extension_loaded($ext)) {
        $missingExtensions[] = $ext;
    }
}

// 检查目录权限
$writableDirs = [];
foreach (['config', 'public/uploads'] as $dir) {
    $path = __DIR__ . '/' . $dir;
    if (is_dir($path) && !is_writable($path)) {
        $writableDirs[] = $dir;
    }
}

// 处理表单提交
$step = intval($_GET['step'] ?? 1);
$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'test_db') {
        $dbHost = $_POST['db_host'] ?? '127.0.0.1';
        $dbPort = $_POST['db_port'] ?? '3306';
        $dbUser = $_POST['db_user'] ?? 'root';
        $dbPass = $_POST['db_pass'] ?? '';

        try {
            $pdo = new PDO(
                "mysql:host=$dbHost;port=$dbPort",
                $dbUser,
                $dbPass,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            $success = '数据库连接成功！';
            $step = 2;
        } catch (PDOException $e) {
            $error = '数据库连接失败: ' . $e->getMessage();
        }
    }

    if ($action === 'install') {
        $dbHost = $_POST['db_host'] ?? '127.0.0.1';
        $dbPort = $_POST['db_port'] ?? '3306';
        $dbName = $_POST['db_name'] ?? 'carparts';
        $dbUser = $_POST['db_user'] ?? 'root';
        $dbPass = $_POST['db_pass'] ?? '';
        $adminUser = $_POST['admin_user'] ?? 'admin';
        $adminPass = $_POST['admin_pass'] ?? 'admin123';
        $adminEmail = $_POST['admin_email'] ?? 'admin@carparts.com';
        $siteName = $_POST['site_name'] ?? 'CarParts B2B';

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

            // 保存设置
            $stmt = $pdo->prepare("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
            $stmt->execute(['company_name', $siteName]);
            $stmt->execute(['admin_email', $adminEmail]);

            // 保存数据库配置
            $configContent = "<?php\nreturn [\n";
            $configContent .= "    'driver' => 'mysql',\n";
            $configContent .= "    'host' => '" . addslashes($dbHost) . "',\n";
            $configContent .= "    'port' => $dbPort,\n";
            $configContent .= "    'database' => '" . addslashes($dbName) . "',\n";
            $configContent .= "    'username' => '" . addslashes($dbUser) . "',\n";
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

            $step = 3;
            $success = '安装成功！';
        } catch (PDOException $e) {
            $error = '安装失败: ' . $e->getMessage();
        }
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .container { background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 40px; max-width: 600px; width: 100%; }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { font-size: 28px; color: #1e40af; margin-bottom: 8px; }
        .logo p { color: #6b7280; font-size: 14px; }
        .steps { display: flex; justify-content: center; gap: 20px; margin-bottom: 30px; }
        .step { display: flex; align-items: center; gap: 8px; color: #9ca3af; }
        .step.active { color: #1e40af; font-weight: 600; }
        .step.done { color: #10b981; }
        .step-number { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; border: 2px solid currentColor; }
        .step.active .step-number { background: #1e40af; color: white; }
        .step.done .step-number { background: #10b981; color: white; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; color: #374151; font-size: 14px; }
        input, select { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; transition: all 0.2s; }
        input:focus, select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .btn { width: 100%; padding: 14px; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #1e40af; color: white; }
        .btn-primary:hover { background: #1e3a8a; }
        .btn-success { background: #10b981; color: white; }
        .btn-success:hover { background: #059669; }
        .btn-secondary { background: #6b7280; color: white; }
        .btn-secondary:hover { background: #4b5563; }
        .error { color: #dc2626; background: #fef2f2; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .success { color: #059669; background: #f0fdf4; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .info { color: #1e40af; background: #eff6ff; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
        .check-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; font-size: 14px; }
        .check-item.ok { color: #10b981; }
        .check-item.error { color: #dc2626; }
        .check-icon { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; }
        .check-item.ok .check-icon { background: #d1fae5; color: #10b981; }
        .check-item.error .check-icon { background: #fee2e2; color: #dc2626; }
        .result-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-top: 20px; }
        .result-card h3 { font-size: 16px; color: #1e40af; margin-bottom: 12px; }
        .result-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
        .result-item:last-child { border-bottom: none; }
        .result-label { color: #6b7280; }
        .result-value { font-weight: 500; color: #1f2937; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🚗 CarParts B2B</h1>
            <p>汽车配件管理系统安装向导</p>
        </div>

        <!-- 步骤指示器 -->
        <div class="steps">
            <div class="step <?php echo $step >= 1 ? ($step > 1 ? 'done' : 'active') : ''; ?>">
                <div class="step-number"><?php echo $step > 1 ? '✓' : '1'; ?></div>
                <span>环境检查</span>
            </div>
            <div class="step <?php echo $step >= 2 ? ($step > 2 ? 'done' : 'active') : ''; ?>">
                <div class="step-number"><?php echo $step > 2 ? '✓' : '2'; ?></div>
                <span>数据库配置</span>
            </div>
            <div class="step <?php echo $step >= 3 ? 'active' : ''; ?>">
                <div class="step-number">3</div>
                <span>完成安装</span>
            </div>
        </div>

        <?php if ($error): ?>
            <div class="error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <?php if ($success): ?>
            <div class="success"><?php echo htmlspecialchars($success); ?></div>
        <?php endif; ?>

        <!-- 步骤 1：环境检查 -->
        <?php if ($step === 1): ?>
            <div class="section">
                <div class="section-title">环境检查</div>

                <div class="check-item <?php echo $phpOk ? 'ok' : 'error'; ?>">
                    <div class="check-icon"><?php echo $phpOk ? '✓' : '✗'; ?></div>
                    <span>PHP 版本: <?php echo PHP_VERSION; ?> (需要 8.0+)</span>
                </div>

                <?php foreach ($requiredExtensions as $ext): ?>
                    <div class="check-item <?php echo extension_loaded($ext) ? 'ok' : 'error'; ?>">
                        <div class="check-icon"><?php echo extension_loaded($ext) ? '✓' : '✗'; ?></div>
                        <span>PHP 扩展: <?php echo $ext; ?></span>
                    </div>
                <?php endforeach; ?>

                <?php foreach (['config', 'public/uploads'] as $dir): ?>
                    <?php $path = __DIR__ . '/' . $dir; ?>
                    <div class="check-item <?php echo (is_dir($path) && is_writable($path)) ? 'ok' : 'error'; ?>">
                        <div class="check-icon"><?php echo (is_dir($path) && is_writable($path)) ? '✓' : '✗'; ?></div>
                        <span>目录可写: <?php echo $dir; ?></span>
                    </div>
                <?php endforeach; ?>
            </div>

            <?php if ($phpOk && empty($missingExtensions) && empty($writableDirs)): ?>
                <form method="POST">
                    <input type="hidden" name="action" value="next">
                    <button type="button" class="btn btn-primary" onclick="location.href='?step=2'">下一步</button>
                </form>
            <?php else: ?>
                <div class="info">请解决上述问题后刷新页面继续安装</div>
            <?php endif; ?>
        <?php endif; ?>

        <!-- 步骤 2：数据库配置 -->
        <?php if ($step === 2): ?>
            <form method="POST">
                <input type="hidden" name="action" value="install">
                <input type="hidden" name="db_host" value="<?php echo htmlspecialchars($_POST['db_host'] ?? '127.0.0.1'); ?>">
                <input type="hidden" name="db_port" value="<?php echo htmlspecialchars($_POST['db_port'] ?? '3306'); ?>">
                <input type="hidden" name="db_user" value="<?php echo htmlspecialchars($_POST['db_user'] ?? 'root'); ?>">
                <input type="hidden" name="db_pass" value="<?php echo htmlspecialchars($_POST['db_pass'] ?? ''); ?>">

                <div class="section">
                    <div class="section-title">数据库配置</div>
                    <div class="form-group">
                        <label>数据库主机</label>
                        <input type="text" name="db_host" value="<?php echo htmlspecialchars($_POST['db_host'] ?? '127.0.0.1'); ?>" required>
                    </div>
                    <div class="form-group">
                        <label>数据库端口</label>
                        <input type="text" name="db_port" value="<?php echo htmlspecialchars($_POST['db_port'] ?? '3306'); ?>" required>
                    </div>
                    <div class="form-group">
                        <label>数据库名称</label>
                        <input type="text" name="db_name" value="<?php echo htmlspecialchars($_POST['db_name'] ?? 'carparts'); ?>" required>
                    </div>
                    <div class="form-group">
                        <label>数据库用户</label>
                        <input type="text" name="db_user" value="<?php echo htmlspecialchars($_POST['db_user'] ?? 'root'); ?>" required>
                    </div>
                    <div class="form-group">
                        <label>数据库密码</label>
                        <input type="password" name="db_pass" value="<?php echo htmlspecialchars($_POST['db_pass'] ?? ''); ?>">
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">管理员设置</div>
                    <div class="form-group">
                        <label>网站名称</label>
                        <input type="text" name="site_name" value="<?php echo htmlspecialchars($_POST['site_name'] ?? 'CarParts B2B'); ?>">
                    </div>
                    <div class="form-group">
                        <label>管理员用户名</label>
                        <input type="text" name="admin_user" value="<?php echo htmlspecialchars($_POST['admin_user'] ?? 'admin'); ?>" required>
                    </div>
                    <div class="form-group">
                        <label>管理员密码</label>
                        <input type="password" name="admin_pass" value="admin123" required>
                    </div>
                    <div class="form-group">
                        <label>管理员邮箱</label>
                        <input type="email" name="admin_email" value="<?php echo htmlspecialchars($_POST['admin_email'] ?? 'admin@carparts.com'); ?>">
                    </div>
                </div>

                <button type="submit" class="btn btn-primary">开始安装</button>
            </form>
        <?php endif; ?>

        <!-- 步骤 3：安装完成 -->
        <?php if ($step === 3): ?>
            <div class="success" style="text-align: center; padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
                <h2 style="margin-bottom: 8px;">安装成功！</h2>
                <p>CarParts B2B 已成功安装</p>
            </div>

            <div class="result-card">
                <h3>登录信息</h3>
                <div class="result-item">
                    <span class="result-label">管理员账号</span>
                    <span class="result-value"><?php echo htmlspecialchars($_POST['admin_user'] ?? 'admin'); ?></span>
                </div>
                <div class="result-item">
                    <span class="result-label">管理员密码</span>
                    <span class="result-value"><?php echo htmlspecialchars($_POST['admin_pass'] ?? 'admin123'); ?></span>
                </div>
            </div>

            <div style="margin-top: 20px;">
                <a href="/" class="btn btn-success" style="display: block; text-align: center; text-decoration: none;">进入系统</a>
            </div>

            <div class="info" style="margin-top: 16px;">
                <strong>安全提示：</strong>请在首次登录后立即修改管理员密码，并删除 <code>install.php</code> 文件。
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
