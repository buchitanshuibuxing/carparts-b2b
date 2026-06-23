<?php
/**
 * 配件控制器
 */

class PartsController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * 获取配件列表
     */
    public function index() {
        $page = max(1, intval($_GET['page'] ?? 1));
        $pageSize = min(100, max(1, intval($_GET['page_size'] ?? 20)));
        $keyword = $_GET['keyword'] ?? '';
        $category = $_GET['category'] ?? '';
        $brand = $_GET['brand'] ?? '';

        $where = ['1=1'];
        $params = [];

        if ($keyword) {
            $where[] = '(oe_number LIKE ? OR part_name_cn LIKE ? OR part_name_en LIKE ?)';
            $params[] = "%$keyword%";
            $params[] = "%$keyword%";
            $params[] = "%$keyword%";
        }

        if ($category) {
            $where[] = 'category = ?';
            $params[] = $category;
        }

        if ($brand) {
            $where[] = 'brand = ?';
            $params[] = $brand;
        }

        $whereClause = implode(' AND ', $where);

        // 获取总数
        $total = $this->db->fetchOne("SELECT COUNT(*) as count FROM parts WHERE $whereClause", $params)['count'];

        // 获取数据
        $offset = ($page - 1) * $pageSize;
        $items = $this->db->fetchAll(
            "SELECT * FROM parts WHERE $whereClause ORDER BY id DESC LIMIT $pageSize OFFSET $offset",
            $params
        );

        echo json_encode([
            'items' => $items,
            'total' => (int)$total,
            'page' => $page,
            'page_size' => $pageSize,
            'total_pages' => ceil($total / $pageSize),
        ]);
    }

    /**
     * 获取单个配件
     */
    public function show($id) {
        $part = $this->db->fetchOne("SELECT * FROM parts WHERE id = ?", [$id]);

        if (!$part) {
            http_response_code(404);
            echo json_encode(['error' => '配件不存在']);
            return;
        }

        echo json_encode($part);
    }

    /**
     * 创建配件
     */
    public function store() {
        $data = json_decode(file_get_contents('php://input'), true);

        $id = $this->db->insert('parts', [
            'oe_number' => $data['oe_number'] ?? '',
            'part_name_cn' => $data['part_name_cn'] ?? '',
            'part_name_en' => $data['part_name_en'] ?? '',
            'brand' => $data['brand'] ?? '',
            'category' => $data['category'] ?? '',
            'is_active' => true,
        ]);

        $part = $this->db->fetchOne("SELECT * FROM parts WHERE id = ?", [$id]);
        echo json_encode($part);
    }

    /**
     * 更新配件
     */
    public function update($id) {
        $data = json_decode(file_get_contents('php://input'), true);

        $allowed = ['oe_number', 'part_name_cn', 'part_name_en', 'brand', 'category', 'is_active'];
        $updateData = [];
        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (empty($updateData)) {
            http_response_code(400);
            echo json_encode(['error' => '没有要更新的数据']);
            return;
        }

        $this->db->update('parts', $updateData, 'id = ?', [$id]);
        $part = $this->db->fetchOne("SELECT * FROM parts WHERE id = ?", [$id]);

        echo json_encode($part);
    }

    /**
     * 删除配件
     */
    public function destroy($id) {
        $this->db->delete('parts', 'id = ?', [$id]);
        echo json_encode(['success' => true]);
    }

    /**
     * 批量翻译
     */
    public function batchTranslate() {
        $data = json_decode(file_get_contents('php://input'), true);
        $ids = $data['ids'] ?? [];

        // 获取百度翻译配置
        $appid = $this->db->fetchOne("SELECT value FROM settings WHERE key = 'translate_api_appid'")['value'] ?? '';
        $key = $this->db->fetchOne("SELECT value FROM settings WHERE key = 'translate_api_key'")['value'] ?? '';

        if (empty($appid) || empty($key)) {
            http_response_code(400);
            echo json_encode(['error' => '请先配置百度翻译API']);
            return;
        }

        // 获取需要翻译的配件
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $parts = $this->db->fetchAll(
            "SELECT * FROM parts WHERE id IN ($placeholders) AND part_name_cn IS NOT NULL AND part_name_cn != ''",
            $ids
        );

        $translated = 0;
        $failed = 0;

        foreach ($parts as $part) {
            $result = $this->baiduTranslate($part['part_name_cn'], $appid, $key);
            if ($result) {
                $this->db->update('parts', ['part_name_en' => $result], 'id = ?', [$part['id']]);
                $translated++;
            } else {
                $failed++;
            }
        }

        echo json_encode([
            'total' => count($parts),
            'translated' => $translated,
            'failed' => $failed,
        ]);
    }

    /**
     * 百度翻译
     */
    private function baiduTranslate($text, $appid, $key) {
        $salt = rand(10000, 99999);
        $sign = md5($appid . $text . $salt . $key);

        $url = 'https://fanyi-api.baidu.com/api/trans/vip/translate';
        $params = [
            'q' => $text,
            'from' => 'zh',
            'to' => 'en',
            'appid' => $appid,
            'salt' => $salt,
            'sign' => $sign,
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $response = curl_exec($ch);
        curl_close($ch);

        $result = json_decode($response, true);

        if (isset($result['trans_result'][0]['dst'])) {
            return $result['trans_result'][0]['dst'];
        }

        return null;
    }
}
