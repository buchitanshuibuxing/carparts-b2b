<?php
/**
 * 系统控制器
 */

class SystemController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * 系统健康检查
     */
    public function health() {
        // CPU 使用率
        $cpuUsage = 0;
        if (function_exists('sys_getloadavg')) {
            $load = sys_getloadavg();
            $cpuUsage = min(100, round($load[0] / shell_exec('nproc') * 100));
        }

        // 内存使用率
        $memoryInfo = $this->getMemoryInfo();

        // 磁盘使用率
        $diskInfo = $this->getDiskInfo();

        // 数据库状态
        $dbStatus = 'connected';
        $dbResponseTime = 0;
        try {
            $start = microtime(true);
            $this->db->fetchOne("SELECT 1");
            $dbResponseTime = round((microtime(true) - $start) * 1000);
        } catch (Exception $e) {
            $dbStatus = 'disconnected';
        }

        echo json_encode([
            'cpu' => ['usage' => $cpuUsage, 'cores' => (int)shell_exec('nproc')],
            'memory' => $memoryInfo,
            'disk' => $diskInfo,
            'database' => ['status' => $dbStatus, 'responseTime' => $dbResponseTime],
            'server' => [
                'hostname' => gethostname(),
                'php_version' => PHP_VERSION,
                'uptime' => $this->getUptime(),
            ],
        ]);
    }

    /**
     * 获取系统日志
     */
    public function logs() {
        $type = $_GET['type'] ?? 'out';
        $lines = min(500, max(1, intval($_GET['lines'] ?? 50)));

        $logFile = $type === 'error'
            ? '/var/log/nginx/error.log'
            : '/var/log/nginx/access.log';

        if (!file_exists($logFile)) {
            echo json_encode([]);
            return;
        }

        $content = shell_exec("tail -n $lines $logFile 2>/dev/null");
        $logs = array_filter(explode("\n", $content));
        echo json_encode($logs);
    }

    /**
     * 数据库备份
     */
    public function backup() {
        $config = require CONFIG_PATH . '/database.php';
        $backupDir = ROOT_PATH . '/backups';

        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $filename = 'carparts_' . date('Ymd_His') . '.sql';
        $filepath = $backupDir . '/' . $filename;

        $cmd = sprintf(
            'mysqldump -h %s -P %s -u %s -p%s %s > %s 2>&1',
            escapeshellarg($config['host']),
            escapeshellarg($config['port']),
            escapeshellarg($config['username']),
            escapeshellarg($config['password']),
            escapeshellarg($config['database']),
            escapeshellarg($filepath)
        );

        exec($cmd, $output, $returnCode);

        if ($returnCode !== 0) {
            http_response_code(500);
            echo json_encode(['error' => '备份失败: ' . implode("\n", $output)]);
            return;
        }

        $size = filesize($filepath);
        echo json_encode([
            'success' => true,
            'message' => "备份成功: $filename",
            'file' => $filename,
            'size' => $this->formatSize($size),
        ]);
    }

    /**
     * 获取内存信息
     */
    private function getMemoryInfo() {
        $total = memory_get_usage(true);
        $used = memory_get_usage(false);
        return [
            'total' => round($total / 1024 / 1024),
            'used' => round($used / 1024 / 1024),
            'free' => round(($total - $used) / 1024 / 1024),
            'percent' => round(($used / $total) * 100),
        ];
    }

    /**
     * 获取磁盘信息
     */
    private function getDiskInfo() {
        $total = disk_total_space('/');
        $free = disk_free_space('/');
        $used = $total - $free;
        return [
            'total' => $this->formatSize($total),
            'used' => $this->formatSize($used),
            'free' => $this->formatSize($free),
            'percent' => round(($used / $total) * 100),
        ];
    }

    /**
     * 获取系统运行时间
     */
    private function getUptime() {
        if (PHP_OS_FAMILY === 'Linux') {
            $uptime = file_get_contents('/proc/uptime');
            $seconds = (int)explode(' ', $uptime)[0];
            $days = floor($seconds / 86400);
            $hours = floor(($seconds % 86400) / 3600);
            $minutes = floor(($seconds % 3600) / 60);
            return "{$days}天{$hours}小时{$minutes}分钟";
        }
        return '未知';
    }

    /**
     * 格式化文件大小
     */
    private function formatSize($bytes) {
        if ($bytes < 1024) return $bytes . ' B';
        if ($bytes < 1024 * 1024) return round($bytes / 1024, 1) . ' KB';
        if ($bytes < 1024 * 1024 * 1024) return round($bytes / 1024 / 1024, 1) . ' MB';
        return round($bytes / 1024 / 1024 / 1024, 1) . ' GB';
    }
}
