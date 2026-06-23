<?php
/**
 * 客户控制器
 */

class CustomersController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * 获取客户列表
     */
    public function index() {
        $page = max(1, intval($_GET['page'] ?? 1));
        $pageSize = min(100, max(1, intval($_GET['page_size'] ?? 20)));
        $keyword = $_GET['keyword'] ?? '';
        $isActive = $_GET['is_active'] ?? null;

        $where = ['1=1'];
        $params = [];

        if ($keyword) {
            $where[] = '(company_name LIKE ? OR contact_person LIKE ? OR phone LIKE ?)';
            $params[] = "%$keyword%";
            $params[] = "%$keyword%";
            $params[] = "%$keyword%";
        }

        if ($isActive !== null && $isActive !== '') {
            $where[] = 'is_active = ?';
            $params[] = $isActive === 'true' ? 1 : 0;
        }

        $whereClause = implode(' AND ', $where);

        $total = $this->db->fetchOne("SELECT COUNT(*) as count FROM customers WHERE $whereClause", $params)['count'];

        $offset = ($page - 1) * $pageSize;
        $items = $this->db->fetchAll(
            "SELECT * FROM customers WHERE $whereClause ORDER BY created_at DESC LIMIT $pageSize OFFSET $offset",
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
     * 获取单个客户
     */
    public function show($id) {
        $customer = $this->db->fetchOne("SELECT * FROM customers WHERE id = ?", [$id]);

        if (!$customer) {
            http_response_code(404);
            echo json_encode(['error' => '客户不存在']);
            return;
        }

        echo json_encode($customer);
    }

    /**
     * 创建客户
     */
    public function store() {
        $data = json_decode(file_get_contents('php://input'), true);

        $id = $this->db->insert('customers', [
            'company_name' => $data['company_name'] ?? '',
            'contact_person' => $data['contact_person'] ?? '',
            'phone' => $data['phone'] ?? '',
            'email' => $data['email'] ?? '',
            'address' => $data['address'] ?? '',
            'country' => $data['country'] ?? '',
            'customer_type' => $data['customer_type'] ?? '',
            'customer_level' => $data['customer_level'] ?? '',
            'credit_limit' => $data['credit_limit'] ?? 0,
            'payment_terms' => $data['payment_terms'] ?? '',
            'currency' => $data['currency'] ?? 'USD',
            'is_active' => true,
        ]);

        $customer = $this->db->fetchOne("SELECT * FROM customers WHERE id = ?", [$id]);
        echo json_encode($customer);
    }

    /**
     * 更新客户
     */
    public function update($id) {
        $data = json_decode(file_get_contents('php://input'), true);

        $allowed = ['company_name', 'contact_person', 'phone', 'email', 'address', 'country',
                     'customer_type', 'customer_level', 'credit_limit', 'payment_terms', 'currency', 'is_active'];
        $updateData = [];
        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (!empty($updateData)) {
            $this->db->update('customers', $updateData, 'id = ?', [$id]);
        }

        $customer = $this->db->fetchOne("SELECT * FROM customers WHERE id = ?", [$id]);
        echo json_encode($customer);
    }

    /**
     * 删除客户
     */
    public function destroy($id) {
        // 检查是否有关联订单
        $orderCount = $this->db->fetchOne("SELECT COUNT(*) as count FROM orders WHERE customer_id = ?", [$id])['count'];
        if ($orderCount > 0) {
            http_response_code(400);
            echo json_encode(['error' => '该客户有关联订单，无法删除']);
            return;
        }

        $this->db->delete('customers', 'id = ?', [$id]);
        echo json_encode(['success' => true]);
    }

    /**
     * 切换状态
     */
    public function toggle($id) {
        $customer = $this->db->fetchOne("SELECT * FROM customers WHERE id = ?", [$id]);
        if (!$customer) {
            http_response_code(404);
            echo json_encode(['error' => '客户不存在']);
            return;
        }

        $this->db->update('customers', ['is_active' => !$customer['is_active']], 'id = ?', [$id]);
        $customer = $this->db->fetchOne("SELECT * FROM customers WHERE id = ?", [$id]);
        echo json_encode($customer);
    }
}
