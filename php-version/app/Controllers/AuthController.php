<?php
/**
 * 认证控制器
 */

class AuthController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * 登录
     */
    public function login() {
        $data = json_decode(file_get_contents('php://input'), true);
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => '用户名和密码不能为空']);
            return;
        }

        $user = $this->db->fetchOne(
            "SELECT * FROM users WHERE username = ? AND is_active = 1",
            [$username]
        );

        if (!$user || !password_verify($password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => '用户名或密码错误']);
            return;
        }

        // 更新最后登录时间
        $this->db->update('users', ['last_login_at' => date('Y-m-d H:i:s')], 'id = ?', [$user['id']]);

        // 生成 token
        $token = $this->generateToken($user);

        echo json_encode([
            'access_token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'displayName' => $user['display_name'],
                'role' => $user['role'],
                'avatarUrl' => $user['avatar_url'],
            ],
        ]);
    }

    /**
     * 注册
     */
    public function register() {
        $data = json_decode(file_get_contents('php://input'), true);
        $username = $data['username'] ?? '';
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        $displayName = $data['display_name'] ?? $username;

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => '用户名和密码不能为空']);
            return;
        }

        // 检查用户名是否已存在
        $existing = $this->db->fetchOne(
            "SELECT id FROM users WHERE username = ?",
            [$username]
        );

        if ($existing) {
            http_response_code(409);
            echo json_encode(['error' => '用户名已存在']);
            return;
        }

        // 创建用户
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $userId = $this->db->insert('users', [
            'username' => $username,
            'email' => $email,
            'password_hash' => $passwordHash,
            'display_name' => $displayName,
            'role' => 'viewer',
            'is_active' => true,
        ]);

        $user = $this->db->fetchOne("SELECT * FROM users WHERE id = ?", [$userId]);
        $token = $this->generateToken($user);

        echo json_encode([
            'access_token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'displayName' => $user['display_name'],
                'role' => $user['role'],
            ],
        ]);
    }

    /**
     * 刷新 token
     */
    public function refresh() {
        $data = json_decode(file_get_contents('php://input'), true);
        $refreshToken = $data['refresh_token'] ?? '';

        if (empty($refreshToken)) {
            http_response_code(400);
            echo json_encode(['error' => '刷新令牌不能为空']);
            return;
        }

        $payload = $this->validateToken($refreshToken);
        if (!$payload) {
            http_response_code(401);
            echo json_encode(['error' => '刷新令牌无效']);
            return;
        }

        $user = $this->db->fetchOne("SELECT * FROM users WHERE id = ? AND is_active = 1", [$payload['sub']]);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => '用户不存在或已禁用']);
            return;
        }

        $token = $this->generateToken($user);

        echo json_encode([
            'access_token' => $token,
            'refresh_token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'displayName' => $user['display_name'],
                'role' => $user['role'],
            ],
        ]);
    }

    /**
     * 获取当前用户
     */
    public function me() {
        $user = $this->getCurrentUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => '未授权']);
            return;
        }

        echo json_encode([
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'displayName' => $user['display_name'],
            'role' => $user['role'],
            'avatarUrl' => $user['avatar_url'],
        ]);
    }

    /**
     * 获取当前登录用户
     */
    private function getCurrentUser() {
        $token = $this->getBearerToken();
        if (!$token) return null;

        $payload = $this->validateToken($token);
        if (!$payload) return null;

        return $this->db->fetchOne("SELECT * FROM users WHERE id = ? AND is_active = 1", [$payload['sub']]);
    }

    /**
     * 获取 Bearer Token
     */
    private function getBearerToken() {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /**
     * 生成 JWT Token
     */
    private function generateToken($user) {
        $config = require CONFIG_PATH . '/app.php';
        $secret = $config['jwt_secret'];
        $expires = $config['jwt_expires'];

        $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = base64_encode(json_encode([
            'sub' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'iat' => time(),
            'exp' => time() + $expires,
        ]));

        $signature = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));

        return "$header.$payload.$signature";
    }

    /**
     * 验证 JWT Token
     */
    private function validateToken($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$header, $payload, $signature] = $parts;

        $config = require CONFIG_PATH . '/app.php';
        $secret = $config['jwt_secret'];

        $expectedSignature = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));

        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $payloadData = json_decode(base64_decode($payload), true);

        if ($payloadData['exp'] < time()) {
            return null;
        }

        return $payloadData;
    }
}
