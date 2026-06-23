<?php
/**
 * 素材控制器
 */

class AssetsController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * 获取素材列表
     */
    public function index() {
        $page = max(1, intval($_GET['page'] ?? 1));
        $pageSize = min(100, max(1, intval($_GET['page_size'] ?? 20)));
        $keyword = $_GET['keyword'] ?? '';
        $type = $_GET['type'] ?? '';

        $where = ['1=1'];
        $params = [];

        if ($keyword) {
            $where[] = '(file_name LIKE ? OR recognized_oe_number LIKE ?)';
            $params[] = "%$keyword%";
            $params[] = "%$keyword%";
        }

        if ($type) {
            $where[] = 'type = ?';
            $params[] = $type;
        }

        $whereClause = implode(' AND ', $where);

        $total = $this->db->fetchOne("SELECT COUNT(*) as count FROM image_assets WHERE $whereClause", $params)['count'];

        $offset = ($page - 1) * $pageSize;
        $items = $this->db->fetchAll(
            "SELECT * FROM image_assets WHERE $whereClause ORDER BY created_at DESC LIMIT $pageSize OFFSET $offset",
            $params
        );

        echo json_encode([
            'items' => $items,
            'total' => (int)$total,
            'page' => $page,
            'page_size' => $pageSize,
        ]);
    }

    /**
     * 上传素材
     */
    public function upload() {
        if (empty($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(['error' => '请选择文件']);
            return;
        }

        $file = $_FILES['file'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
        $maxSize = 50 * 1024 * 1024; // 50MB

        // 检查文件类型
        if (!in_array($file['type'], $allowedTypes)) {
            http_response_code(400);
            echo json_encode(['error' => '不支持的文件类型']);
            return;
        }

        // 检查文件大小
        if ($file['size'] > $maxSize) {
            http_response_code(400);
            echo json_encode(['error' => '文件太大']);
            return;
        }

        // 生成文件路径
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid() . '.' . $ext;
        $datePath = date('Y/m');
        $relativePath = "images/$datePath/$filename";
        $absolutePath = UPLOAD_PATH . '/' . $relativePath;

        // 创建目录
        $dir = dirname($absolutePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        // 保存文件
        if (!move_uploaded_file($file['tmp_name'], $absolutePath)) {
            http_response_code(500);
            echo json_encode(['error' => '文件保存失败']);
            return;
        }

        // 获取图片尺寸
        $width = null;
        $height = null;
        if (strpos($file['type'], 'image/') === 0) {
            $imageInfo = getimagesize($absolutePath);
            if ($imageInfo) {
                $width = $imageInfo[0];
                $height = $imageInfo[1];
            }
        }

        // 保存到数据库
        $id = $this->db->insert('image_assets', [
            'file_path' => $relativePath,
            'file_name' => $file['name'],
            'file_size' => $file['size'],
            'file_md5' => md5_file($absolutePath),
            'width' => $width,
            'height' => $height,
            'mime_type' => $file['type'],
            'type' => strpos($file['type'], 'video/') === 0 ? 'video' : 'image',
            'ocr_status' => 'pending',
            'recognition_status' => 'pending',
            'uploaded_by' => $this->getUserId(),
        ]);

        $asset = $this->db->fetchOne("SELECT * FROM image_assets WHERE id = ?", [$id]);
        echo json_encode($asset);
    }

    /**
     * 删除素材
     */
    public function destroy($id) {
        $asset = $this->db->fetchOne("SELECT * FROM image_assets WHERE id = ?", [$id]);
        if (!$asset) {
            http_response_code(404);
            echo json_encode(['error' => '素材不存在']);
            return;
        }

        // 删除文件
        $filePath = UPLOAD_PATH . '/' . $asset['file_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        // 删除缩略图
        foreach (['thumbnail_small_path', 'thumbnail_medium_path', 'thumbnail_large_path'] as $field) {
            if ($asset[$field]) {
                $thumbPath = UPLOAD_PATH . '/' . $asset[$field];
                if (file_exists($thumbPath)) {
                    unlink($thumbPath);
                }
            }
        }

        $this->db->delete('image_assets', 'id = ?', [$id]);
        echo json_encode(['success' => true]);
    }

    /**
     * 获取当前用户 ID
     */
    private function getUserId() {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            $parts = explode('.', $matches[1]);
            if (count($parts) === 3) {
                $payload = json_decode(base64_decode($parts[1]), true);
                return $payload['sub'] ?? null;
            }
        }
        return null;
    }
}
