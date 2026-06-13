# CarParts B2B 部署指南

## 🚀 一键部署（推荐）

### 系统要求

- **操作系统**: CentOS 7+ / Ubuntu 18+ / Debian 10+
- **内存**: 2GB+
- **硬盘**: 20GB+
- **网络**: 需要公网IP和域名

### 部署步骤

#### 1. 登录服务器

```bash
ssh root@你的服务器IP
```

#### 2. 下载安装脚本

```bash
curl -sSL https://raw.githubusercontent.com/buchitanshuibuxing/carparts-b2b/main/deploy/install.sh -o install.sh
chmod +x install.sh
```

#### 3. 运行安装脚本

```bash
./install.sh
```

#### 4. 按提示输入信息

```
========================================
  CarParts B2B 一键部署脚本
========================================

请输入域名: example.com
请输入管理员密码: ********
请输入数据库密码 (留空自动生成): 
是否启用HTTPS？(y/n，默认y): y

确认安装？(y/n): y
```

#### 5. 等待安装完成

安装过程约5-10分钟，完成后会显示：

```
========================================
  🎉 安装完成！
========================================

访问地址: https://example.com
管理员账号: admin
管理员密码: 您设置的密码
```

---

## 🔧 管理命令

安装完成后，可以使用 `carparts` 命令管理服务：

```bash
carparts
```

显示管理菜单：

```
========================================
  CarParts B2B 管理面板
========================================

  1. 启动服务
  2. 停止服务
  3. 重启服务
  4. 查看状态
  5. 查看日志
  6. 备份数据库
  7. 恢复数据库
  8. 修改管理员密码
  9. 修改域名
 10. 更新系统
 11. 卸载系统
 12. 查看系统信息
 13. 申请/续期SSL证书
  0. 退出

========================================
请输入命令编号 [0-13]:
```

---

## 📋 常用操作

### 启动服务

```bash
carparts
# 输入 1
```

### 停止服务

```bash
carparts
# 输入 2
```

### 重启服务

```bash
carparts
# 输入 3
```

### 查看状态

```bash
carparts
# 输入 4
```

### 备份数据库

```bash
carparts
# 输入 6
```

### 恢复数据库

```bash
carparts
# 输入 7
```

### 修改密码

```bash
carparts
# 输入 8
```

### 更新系统

```bash
carparts
# 输入 10
```

### 卸载系统

```bash
carparts
# 输入 11
```

---

## 🔒 安全建议

### 1. 修改SSH端口

```bash
# 编辑SSH配置
sudo vi /etc/ssh/sshd_config

# 修改端口
Port 2222

# 重启SSH
sudo systemctl restart sshd
```

### 2. 配置防火墙

```bash
# 只开放必要端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 2222/tcp
sudo ufw enable
```

### 3. 定期备份

建议配置定时备份：

```bash
# 编辑crontab
crontab -e

# 添加每天凌晨3点备份
0 3 * * * /usr/local/bin/carparts backup
```

### 4. 定期更新

```bash
# 每周更新一次
carparts
# 输入 10
```

---

## ❓ 常见问题

### Q: 忘记管理员密码怎么办？

```bash
carparts
# 输入 8 重置密码
```

### Q: 如何修改域名？

```bash
carparts
# 输入 9 修改域名
```

### Q: 如何查看日志？

```bash
carparts
# 输入 5 查看日志
```

### Q: 如何备份数据？

```bash
carparts
# 输入 6 备份数据库
```

### Q: 如何恢复数据？

```bash
carparts
# 输入 7 恢复数据库
```

### Q: 服务启动失败怎么办？

```bash
# 查看日志
pm2 logs carparts-api

# 检查端口占用
lsof -i :3000

# 重启服务
carparts
# 输入 3
```

### Q: Nginx配置错误怎么办？

```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### Q: 数据库连接失败怎么办？

```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 重启PostgreSQL
sudo systemctl restart postgresql
```

---

## 📞 技术支持

如有问题，请在GitHub提交Issue：

https://github.com/buchitanshuibuxing/carparts-b2b/issues

---

## 📄 许可证

MIT License
