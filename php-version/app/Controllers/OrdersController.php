<?php
/**
 * 订单控制器
 */

class OrdersController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * 获取订单列表
     */
    public function index() {
        $page = max(1, intval($_GET['page'] ?? 1));
        $pageSize = min(100, max(1, intval($_GET['page_size'] ?? 20)));
        $status = $_GET['status'] ?? '';
        $keyword = $_GET['keyword'] ?? '';

        $where = ['1=1'];
        $params = [];

        if ($status) {
            $where[] = 'o.status = ?';
            $params[] = $status;
        }

        if ($keyword) {
            $where[] = '(o.order_number LIKE ? OR c.company_name LIKE ?)';
            $params[] = "%$keyword%";
            $params[] = "%$keyword%";
        }

        $whereClause = implode(' AND ', $where);

        $total = $this->db->fetchOne(
            "SELECT COUNT(*) as count FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE $whereClause",
            $params
        )['count'];

        $offset = ($page - 1) * $pageSize;
        $items = $this->db->fetchAll(
            "SELECT o.*, c.company_name as customer_name
             FROM orders o
             LEFT JOIN customers c ON o.customer_id = c.id
             WHERE $whereClause
             ORDER BY o.created_at DESC
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
     * 获取订单统计
     */
    public function stats() {
        $stats = $this->db->fetchOne("
            SELECT
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
                SUM(total_amount) as total_amount
            FROM orders
        ");

        // 本月订单
        $monthStart = date('Y-m-01');
        $monthStats = $this->db->fetchOne("
            SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
            FROM orders WHERE created_at >= ? AND status != 'cancelled'
        ", [$monthStart]);

        echo json_encode([
            'total_orders' => (int)$stats['total_orders'],
            'pending_orders' => (int)$stats['pending_orders'],
            'confirmed_orders' => (int)$stats['confirmed_orders'],
            'completed_orders' => (int)$stats['completed_orders'],
            'cancelled_orders' => (int)$stats['cancelled_orders'],
            'total_amount' => (float)$stats['total_amount'],
            'current_month_total' => (int)$monthStats['count'],
            'current_month_revenue' => (float)$monthStats['amount'],
        ]);
    }

    /**
     * 获取单个订单
     */
    public function show($id) {
        $order = $this->db->fetchOne(
            "SELECT o.*, c.company_name as customer_name, c.contact_person as customer_contact
             FROM orders o
             LEFT JOIN customers c ON o.customer_id = c.id
             WHERE o.id = ?",
            [$id]
        );

        if (!$order) {
            http_response_code(404);
            echo json_encode(['error' => '订单不存在']);
            return;
        }

        // 获取订单明细
        $items = $this->db->fetchAll(
            "SELECT * FROM order_items WHERE order_id = ? ORDER BY id",
            [$id]
        );

        echo json_encode([
            'order' => $order,
            'items' => $items,
        ]);
    }

    /**
     * 创建订单
     */
    public function store() {
        $data = json_decode(file_get_contents('php://input'), true);

        // 生成订单号
        $orderNumber = 'ORD' . date('Ymd') . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

        $orderId = $this->db->insert('orders', [
            'order_number' => $orderNumber,
            'customer_id' => $data['customer_id'] ?? null,
            'currency' => $data['currency'] ?? 'USD',
            'status' => 'pending',
            'total_amount' => $data['total_amount'] ?? 0,
            'shipping_cost' => $data['shipping_cost'] ?? 0,
            'shipping_address' => $data['shipping_address'] ?? '',
            'notes' => $data['notes'] ?? '',
            'created_by' => $this->getUserId(),
        ]);

        // 创建订单明细
        if (!empty($data['items'])) {
            foreach ($data['items'] as $item) {
                $this->db->insert('order_items', [
                    'order_id' => $orderId,
                    'part_id' => $item['part_id'] ?? null,
                    'oe_number' => $item['oe_number'] ?? '',
                    'part_name' => $item['part_name'] ?? '',
                    'brand' => $item['brand'] ?? '',
                    'package_name' => $item['package_name'] ?? '',
                    'quantity' => $item['quantity'] ?? 1,
                    'unit_price' => $item['unit_price'] ?? 0,
                    'subtotal' => ($item['quantity'] ?? 1) * ($item['unit_price'] ?? 0),
                ]);
            }
        }

        $this->show($orderId);
    }

    /**
     * 更新订单
     */
    public function update($id) {
        $data = json_decode(file_get_contents('php://input'), true);

        $allowed = ['customer_id', 'currency', 'status', 'shipping_cost', 'shipping_address', 'shipping_method', 'tracking_number', 'notes'];
        $updateData = [];
        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (!empty($updateData)) {
            $this->db->update('orders', $updateData, 'id = ?', [$id]);
        }

        $this->show($id);
    }

    /**
     * 删除订单
     */
    public function destroy($id) {
        // 删除订单明细
        $this->db->delete('order_items', 'order_id = ?', [$id]);
        // 删除订单
        $this->db->delete('orders', 'id = ?', [$id]);
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
