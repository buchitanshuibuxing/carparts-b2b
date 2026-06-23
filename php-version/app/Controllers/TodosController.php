<?php
/**
 * 待办控制器
 */

class TodosController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * 获取待办列表
     */
    public function index() {
        $user = $this->getCurrentUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => '未授权']);
            return;
        }

        $priority = $_GET['priority'] ?? null;

        $where = ['user_id = ?'];
        $params = [$user['id']];

        if ($priority) {
            $where[] = 'priority = ?';
            $params[] = $priority;
        }

        $whereClause = implode(' AND ', $where);

        $todos = $this->db->fetchAll(
            "SELECT * FROM todos WHERE $whereClause ORDER BY is_done ASC, created_at DESC",
            $params
        );

        echo json_encode($todos);
    }

    /**
     * 创建待办
     */
    public function store() {
        $user = $this->getCurrentUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => '未授权']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $content = $data['content'] ?? '';

        if (empty($content)) {
            http_response_code(400);
            echo json_encode(['error' => '内容不能为空']);
            return;
        }

        $id = $this->db->insert('todos', [
            'content' => $content,
            'priority' => $data['priority'] ?? 'normal',
            'user_id' => $user['id'],
            'tag' => $data['tag'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'is_done' => false,
        ]);

        $todo = $this->db->fetchOne("SELECT * FROM todos WHERE id = ?", [$id]);
        echo json_encode($todo);
    }

    /**
     * 更新待办
     */
    public function update($id) {
        $user = $this->getCurrentUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => '未授权']);
            return;
        }

        $todo = $this->db->fetchOne("SELECT * FROM todos WHERE id = ? AND user_id = ?", [$id, $user['id']]);
        if (!$todo) {
            http_response_code(404);
            echo json_encode(['error' => '待办不存在']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $allowed = ['content', 'priority', 'is_done', 'tag', 'due_date'];
        $updateData = [];
        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (!empty($updateData)) {
            $this->db->update('todos', $updateData, 'id = ?', [$id]);
        }

        $todo = $this->db->fetchOne("SELECT * FROM todos WHERE id = ?", [$id]);
        echo json_encode($todo);
    }

    /**
     * 删除待办
     */
    public function destroy($id) {
        $user = $this->getCurrentUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => '未授权']);
            return;
        }

        $todo = $this->db->fetchOne("SELECT * FROM todos WHERE id = ? AND user_id = ?", [$id, $user['id']]);
        if (!$todo) {
            http_response_code(404);
            echo json_encode(['error' => '待办不存在']);
            return;
        }

        $this->db->delete('todos', 'id = ?', [$id]);
        echo json_encode(['success' => true]);
    }

    /**
     * 获取当前用户
     */
    private function getCurrentUser() {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (!preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            return null;
        }

        $token = $matches[1];
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        $payload = json_decode(base64_decode($parts[1]), true);
        if (!$payload || $payload['exp'] < time()) return null;

        return $this->db->fetchOne("SELECT * FROM users WHERE id = ? AND is_active = 1", [$payload['sub']]);
    }
}
