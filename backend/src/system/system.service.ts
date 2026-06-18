import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { execSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';

@Injectable()
export class SystemService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // 系统健康检查
  async getHealth() {
    const cpu = this.getCpuInfo();
    const memory = this.getMemoryInfo();
    const disk = this.getDiskInfo();
    const database = await this.getDatabaseStatus();
    const pm2 = this.getPm2Status();
    const server = this.getServerInfo();

    return { cpu, memory, disk, database, pm2, server };
  }

  private getCpuInfo() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const usage = Math.round((loadAvg[0] / cpus.length) * 100);
    return {
      usage: Math.min(usage, 100),
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      loadAvg: loadAvg.map(l => l.toFixed(2)),
    };
  }

  private getMemoryInfo() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return {
      total: Math.round(total / 1024 / 1024),
      used: Math.round(used / 1024 / 1024),
      free: Math.round(free / 1024 / 1024),
      percent: Math.round((used / total) * 100),
    };
  }

  private getDiskInfo() {
    try {
      const output = execSync('df -h / | tail -1', { encoding: 'utf-8' });
      const parts = output.trim().split(/\s+/);
      const total = parts[1];
      const used = parts[2];
      const free = parts[3];
      const percent = parseInt(parts[4]);
      return { total, used, free, percent };
    } catch {
      return { total: 'N/A', used: 'N/A', free: 'N/A', percent: 0 };
    }
  }

  private async getDatabaseStatus() {
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - start;
      return { status: 'connected', responseTime };
    } catch {
      return { status: 'disconnected', responseTime: 0 };
    }
  }

  private getPm2Status() {
    try {
      const output = execSync('pm2 jlist', { encoding: 'utf-8' });
      const processes = JSON.parse(output);
      const carparts = processes.find((p: any) => p.name === 'carparts-api');
      if (!carparts) return { status: 'not found', uptime: 'N/A', memory: 'N/A', restarts: 0 };

      const uptimeMs = carparts.pm2_env?.pm_uptime || 0;
      const uptime = this.formatUptime(Date.now() - uptimeMs);
      const memory = Math.round((carparts.monit?.memory || 0) / 1024 / 1024);
      const restarts = carparts.pm2_env?.restart_time || 0;

      return {
        status: carparts.pm2_env?.status || 'unknown',
        uptime,
        memory: `${memory}MB`,
        restarts,
        pid: carparts.pid,
      };
    } catch {
      return { status: 'error', uptime: 'N/A', memory: 'N/A', restarts: 0 };
    }
  }

  private getServerInfo() {
    const uptime = os.uptime();
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: this.formatUptime(uptime * 1000),
      nodeVersion: process.version,
    };
  }

  private formatUptime(ms: number): string {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    const parts: string[] = [];
    if (days > 0) parts.push(days + '天');
    if (hours > 0) parts.push(hours + '小时');
    if (minutes > 0) parts.push(minutes + '分钟');
    return parts.join('') || '刚刚';
  }

  // 服务管理 - 重启后端
  async restartService(): Promise<{ success: boolean; message: string }> {
    try {
      execSync('pm2 restart carparts-api', { encoding: 'utf-8' });
      return { success: true, message: '后端服务已重启' };
    } catch (err: any) {
      return { success: false, message: `重启失败: ${err.message}` };
    }
  }

  // 服务管理 - 获取日志
  getLogs(type: 'out' | 'error' | 'all', lines: number = 50): any[] {
    try {
      const logFile = type === 'error'
        ? '/home/zfb/.pm2/logs/carparts-api-error.log'
        : '/home/zfb/.pm2/logs/carparts-api-out.log';

      if (!fs.existsSync(logFile)) return [{ raw: '日志文件不存在' }];

      // 读取更多行以便过滤后仍有足够内容
      const fetchLines = lines * 5;
      const content = execSync(`tail -n ${fetchLines} "${logFile}"`, { encoding: 'utf-8' });

      // 去掉 ANSI 颜色代码
      const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '').replace(/\[[\d;]*m/g, '');

      const parsed = content
        .split('\n')
        .map(line => stripAnsi(line).trim())
        .filter(line => {
          if (!line) return false;
          // 过滤掉 TypeORM 的 SQL 查询日志
          if (line.startsWith('query:')) return false;
          if (line.startsWith('query (')) return false;
          if (line.startsWith('query: SELECT')) return false;
          if (line.startsWith('query: INSERT')) return false;
          if (line.startsWith('query: UPDATE')) return false;
          if (line.startsWith('query: DELETE')) return false;
          if (line.startsWith('query: CREATE')) return false;
          if (line.startsWith('query: ALTER')) return false;
          if (line.startsWith('query: DROP')) return false;
          // 过滤 PARAMETERS 行
          if (line.startsWith('-- PARAMETERS:')) return false;
          // 过滤空的 SQL 片段
          if (/^\s*(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|AND|OR|SET|VALUES|INTO|JOIN|ON|LIMIT|ORDER BY|GROUP BY)\s/.test(line)) return false;
          if (/^\s*\d+\s*$/.test(line)) return false;
          return true;
        })
        .slice(-lines) // 取最后 N 行
        .map(line => this.parseLogLine(line));

      return parsed;
    } catch (err: any) {
      return [{ raw: `读取日志失败: ${err.message}`, level: 'error' }];
    }
  }

  private parseLogLine(line: string): any {
    // NestJS 日志格式: [Nest] PID  - MM/DD/YYYY, HH:MM:SS AM/PM     LOG/ERROR/WARN  [Module]  Message
    const nestMatch = line.match(/\[Nest\]\s+(\d+)\s+-\s+([\d/]+,\s+[\d:]+\s+[AP]M)\s+(LOG|ERROR|WARN|DEBUG)\s+\[([^\]]+)\]\s+(.*)/);
    if (nestMatch) {
      return {
        pid: nestMatch[1],
        time: nestMatch[2],
        level: nestMatch[3].toLowerCase(),
        module: nestMatch[4],
        message: nestMatch[5].trim(),
      };
    }

    // 错误日志格式
    if (line.includes('ERROR') || line.includes('Error:') || line.includes('error:')) {
      return { raw: line, level: 'error' };
    }

    // 警告日志格式
    if (line.includes('WARN') || line.includes('Warning:')) {
      return { raw: line, level: 'warn' };
    }

    return { raw: line, level: 'info' };
  }

  // 清理日志
  clearLogs(): { success: boolean; message: string } {
    try {
      execSync('pm2 flush carparts-api', { encoding: 'utf-8' });
      return { success: true, message: '日志已清理' };
    } catch (err: any) {
      return { success: false, message: `清理失败: ${err.message}` };
    }
  }
}
