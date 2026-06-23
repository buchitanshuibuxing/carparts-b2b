<?php
/**
 * 供应商控制器
 */

class SuppliersController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * 获取供应商列表
     */
    public function index() {
        $page = max(1, intval($_GET['page'] ?? 1));
        $pageSize = min(100, max(1, intval($_GET['page_size'] ?? 20)));
        $keyword = $_GET['keyword'] ?? '';

        $where = ['1=1'];
        $params = [];

        if ($keyword) {
            $where[] = '(company_name LIKE ? OR contact_person LIKE ?)';
            $params[] = "%$keyword%";
            $params[] = "%$keyword%";
        }

        $whereClause = implode(' AND ', $where);

        $total = $this->db->fetchOne("SELECT COUNT(*) as count FROM suppliers WHERE $whereClause", $params)['count'];

        $offset = ($page - 1) * $pageSize;
        $items = $this->db->fetchAll(
            "SELECT * FROM suppliers WHERE $whereClause ORDER BY created_at DESC LIMIT $pageSize OFFSET $offset",
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
     * 获取单个供应商
     */
    public function show($id) {
        $supplier = $this->db->fetchOne("SELECT * FROM suppliers WHERE id = ?", [$id]);

        if (!$supplier) {
            http_response_code(404);
            echo json_encode(['error' => '供应商不存在']);
            return;
        }

        echo json_encode($supplier);
    }

    /**
     * 创建供应商
     */
    public function store() {
        $data = json_decode(file_get_contents('php://input'), true);

        $id = $this->db->insert('suppliers', [
            'company_name' => $data['company_name'] ?? '',
            'contact_person' => $data['contact_person'] ?? '',
            'phone' => $data['phone'] ?? '',
            'email' => $data['email'] ?? '',
            'address' => $data['address'] ?? '',
            'country' => $data['country'] ?? '',
            'main_products' => $data['main_products'] ?? '',
            'payment_terms' => $data['payment_terms'] ?? '',
            'lead_time_days' => $data['lead_time_days'] ?? 0,
            'is_active' => true,
        ]);

        $supplier = $this->db->fetchOne("SELECT * FROM suppliers WHERE id = ?", [$id]);
        echo json_encode($supplier);
    }

    /**
     * 更新供应商
     */
    public function update($id) {
        $data = json_decode(file_get_contents('php://input'), true);

        $allowed = ['company_name', 'contact_person', 'phone', 'email', 'address', 'country',
                     'main_products', 'payment_terms', 'lead_time_days', 'is_active'];
        $updateData = [];
        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (!empty($updateData)) {
            $this->db->update('suppliers', $updateData, 'id = ?', [$id]);
        }

        $supplier = $this->db->fetchOne("SELECT * FROM suppliers WHERE id = ?", [$id]);
        echo json_encode($supplier);
    }

    /**
     * 删除供应商
     */
    public function destroy($id) {
        $this->db->delete('suppliers', 'id = ?', [$id]);
        echo json_encode(['success' => true]);
    }
}
