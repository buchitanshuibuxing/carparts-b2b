<?php
/**
 * 报价单控制器
 */

class QuotationsController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * 获取报价单列表
     */
    public function index() {
        $page = max(1, intval($_GET['page'] ?? 1));
        $pageSize = min(100, max(1, intval($_GET['page_size'] ?? 20)));
        $status = $_GET['status'] ?? '';
        $keyword = $_GET['keyword'] ?? '';

        $where = ['1=1'];
        $params = [];

        if ($status) {
            $where[] = 'q.status = ?';
            $params[] = $status;
        }

        if ($keyword) {
            $where[] = '(q.quotation_number LIKE ? OR q.buyer_company LIKE ?)';
            $params[] = "%$keyword%";
            $params[] = "%$keyword%";
        }

        $whereClause = implode(' AND ', $where);

        $total = $this->db->fetchOne("SELECT COUNT(*) as count FROM quotations q WHERE $whereClause", $params)['count'];

        $offset = ($page - 1) * $pageSize;
        $items = $this->db->fetchAll(
            "SELECT q.*, c.company_name as customer_name
             FROM quotations q
             LEFT JOIN customers c ON q.customer_id = c.id
             WHERE $whereClause
             ORDER BY q.created_at DESC
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
     * 获取单个报价单
     */
    public function show($id) {
        $quotation = $this->db->fetchOne(
            "SELECT q.*, c.company_name as customer_name
             FROM quotations q
             LEFT JOIN customers c ON q.customer_id = c.id
             WHERE q.id = ?",
            [$id]
        );

        if (!$quotation) {
            http_response_code(404);
            echo json_encode(['error' => '报价单不存在']);
            return;
        }

        $items = $this->db->fetchAll(
            "SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY id",
            [$id]
        );

        echo json_encode([
            'quotation' => $quotation,
            'items' => $items,
        ]);
    }

    /**
     * 创建报价单
     */
    public function store() {
        $data = json_decode(file_get_contents('php://input'), true);

        // 生成报价单号
        $quotationNumber = 'QT' . date('Ymd') . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);

        $quotationId = $this->db->insert('quotations', [
            'quotation_number' => $quotationNumber,
            'customer_id' => $data['customer_id'] ?? null,
            'currency' => $data['currency'] ?? 'USD',
            'status' => 'draft',
            'seller_company' => $data['seller_company'] ?? '',
            'seller_contact' => $data['seller_contact'] ?? '',
            'seller_phone' => $data['seller_phone'] ?? '',
            'seller_email' => $data['seller_email'] ?? '',
            'seller_address' => $data['seller_address'] ?? '',
            'buyer_company' => $data['buyer_company'] ?? '',
            'buyer_contact' => $data['buyer_contact'] ?? '',
            'buyer_phone' => $data['buyer_phone'] ?? '',
            'buyer_email' => $data['buyer_email'] ?? '',
            'buyer_address' => $data['buyer_address'] ?? '',
            'trade_terms' => $data['trade_terms'] ?? '',
            'port_loading' => $data['port_loading'] ?? '',
            'port_dest' => $data['port_dest'] ?? '',
            'delivery_time' => $data['delivery_time'] ?? '',
            'valid_until' => $data['valid_until'] ?? null,
            'discount_pct' => $data['discount_pct'] ?? 0,
            'shipping_cost' => $data['shipping_cost'] ?? 0,
            'notes' => $data['notes'] ?? '',
            'created_by' => $this->getUserId(),
        ]);

        // 创建报价单明细
        $subtotal = 0;
        if (!empty($data['items'])) {
            foreach ($data['items'] as $item) {
                $itemSubtotal = ($item['quantity'] ?? 1) * ($item['unit_price'] ?? 0);
                $this->db->insert('quotation_items', [
                    'quotation_id' => $quotationId,
                    'part_id' => $item['part_id'] ?? null,
                    'oe_number' => $item['oe_number'] ?? '',
                    'part_name' => $item['part_name'] ?? '',
                    'brand' => $item['brand'] ?? '',
                    'package_name' => $item['package_name'] ?? '',
                    'quantity' => $item['quantity'] ?? 1,
                    'unit_price' => $item['unit_price'] ?? 0,
                    'subtotal' => $itemSubtotal,
                ]);
                $subtotal += $itemSubtotal;
            }
        }

        // 更新总金额
        $totalAmount = $subtotal * (1 - ($data['discount_pct'] ?? 0) / 100) + ($data['shipping_cost'] ?? 0);
        $this->db->update('quotations', ['total_amount' => $totalAmount], 'id = ?', [$quotationId]);

        $this->show($quotationId);
    }

    /**
     * 更新报价单
     */
    public function update($id) {
        $data = json_decode(file_get_contents('php://input'), true);

        $allowed = ['customer_id', 'currency', 'status', 'seller_company', 'seller_contact',
                     'seller_phone', 'seller_email', 'seller_address', 'buyer_company', 'buyer_contact',
                     'buyer_phone', 'buyer_email', 'buyer_address', 'trade_terms', 'port_loading',
                     'port_dest', 'delivery_time', 'valid_until', 'discount_pct', 'shipping_cost', 'notes'];
        $updateData = [];
        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (!empty($updateData)) {
            $this->db->update('quotations', $updateData, 'id = ?', [$id]);
        }

        // 更新明细
        if (!empty($data['items'])) {
            $this->db->delete('quotation_items', 'quotation_id = ?', [$id]);
            $subtotal = 0;
            foreach ($data['items'] as $item) {
                $itemSubtotal = ($item['quantity'] ?? 1) * ($item['unit_price'] ?? 0);
                $this->db->insert('quotation_items', [
                    'quotation_id' => $id,
                    'part_id' => $item['part_id'] ?? null,
                    'oe_number' => $item['oe_number'] ?? '',
                    'part_name' => $item['part_name'] ?? '',
                    'brand' => $item['brand'] ?? '',
                    'package_name' => $item['package_name'] ?? '',
                    'quantity' => $item['quantity'] ?? 1,
                    'unit_price' => $item['unit_price'] ?? 0,
                    'subtotal' => $itemSubtotal,
                ]);
                $subtotal += $itemSubtotal;
            }

            $quotation = $this->db->fetchOne("SELECT * FROM quotations WHERE id = ?", [$id]);
            $totalAmount = $subtotal * (1 - ($quotation['discount_pct'] ?? 0) / 100) + ($quotation['shipping_cost'] ?? 0);
            $this->db->update('quotations', ['total_amount' => $totalAmount], 'id = ?', [$id]);
        }

        $this->show($id);
    }

    /**
     * 删除报价单
     */
    public function destroy($id) {
        $this->db->delete('quotation_items', 'quotation_id = ?', [$id]);
        $this->db->delete('quotations', 'id = ?', [$id]);
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
