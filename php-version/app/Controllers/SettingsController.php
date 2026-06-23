<?php
/**
 * 设置控制器
 */

class SettingsController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * 获取所有设置
     */
    public function index() {
        $settings = $this->db->fetchAll("SELECT `key`, `value` FROM settings");
        $result = [];
        foreach ($settings as $setting) {
            $result[$setting['key']] = $setting['value'];
        }
        echo json_encode($result);
    }

    /**
     * 更新设置
     */
    public function update($key) {
        $data = json_decode(file_get_contents('php://input'), true);
        $value = $data['value'] ?? '';

        $existing = $this->db->fetchOne("SELECT * FROM settings WHERE `key` = ?", [$key]);

        if ($existing) {
            $this->db->update('settings', ['value' => $value], '`key` = ?', [$key]);
        } else {
            $this->db->insert('settings', ['key' => $key, 'value' => $value]);
        }

        echo json_encode(['success' => true, 'key' => $key, 'value' => $value]);
    }
}
