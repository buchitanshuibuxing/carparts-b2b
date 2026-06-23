<?php
/**
 * 库存控制器
 */

class InventoryController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * 获取库存列表
     */
    public function index() {
        $page = max(1, intval($_GET['page'] ?? 1));
        $pageSize = min(100, max(1, intval($_GET['page_size'] ?? 20)));
        $keyword = $_GET['keyword'] ?? '';
        $isLowStock = $_GET['is_low_stock'] ?? '';

        $where = ['1=1'];
        $params = [];

        if ($keyword) {
            $where[] = '(p.oe_number LIKE ? OR p.part_name_cn LIKE ?)';
            $params[] = "%$keyword%";
            $params[] = "%$keyword%";
        }

        if ($isLowStock === 'true') {
            $where[] = 'i.quantity <= i.min_stock AND i.min_stock > 0';
        }

        $whereClause = implode(' AND ', $where);

        $total = $this->db->fetchOne(
            "SELECT COUNT(*) as count FROM inventory i JOIN parts p ON i.part_id = p.id WHERE $whereClause",
            $params
        )['count'];

        $offset = ($page - 1) * $pageSize;
        $items = $this->db->fetchAll(
            "SELECT i.*, p.oe_number, p.part_name_cn, p.part_name_en, p.brand
             FROM inventory i
             JOIN parts p ON i.part_id = p.id
             WHERE $whereClause
             ORDER BY i.updated_at DESC
             LIMIT $pageSize OFFSET $offset",
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
     * 获取低库存预警
     */
    public function lowStock() {
        $limit = min(100, max(1, intval($_GET['limit'] ?? 10)));

        $items = $this->db->fetchAll(
            "SELECT i.*, p.oe_number, p.part_name_cn, p.brand
             FROM inventory i
             JOIN parts p ON i.part_id = p.id
             WHERE i.quantity <= i.min_stock AND i.min_stock > 0
             ORDER BY (i.quantity::float / NULLIF(i.min_stock, 0)) ASC
             LIMIT ?",
            [$limit]
        );

        echo json_encode($items);
    }

    /**
     * 调整库存
     */
    public function adjust() {
        $data = json_decode(file_get_contents('php://input'), true);
        $partId = $data['part_id'] ?? null;
        $delta = $data['delta'] ?? 0;
        $reason = $data['reason'] ?? '';

        if (!$partId) {
            http_response_code(400);
            echo json_encode(['error' => '配件ID不能为空']);
            return;
        }

        $inventory = $this->db->fetchOne("SELECT * FROM inventory WHERE part_id = ?", [$partId]);

        if (!$inventory) {
            // 创建库存记录
            $this->db->insert('inventory', [
                'part_id' => $partId,
                'quantity' => max(0, $delta),
            ]);
        } else {
            $newQuantity = max(0, $inventory['quantity'] + $delta);
            $this->db->update('inventory', ['quantity' => $newQuantity], 'id = ?', [$inventory['id']]);
        }

        echo json_encode(['success' => true]);
    }
}
