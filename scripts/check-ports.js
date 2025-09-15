#!/usr/bin/env node

/**
 * Port Monitoring Utility for VTRIA ERP
 * Checks which ports are in use and provides cleanup options
 */

const net = require('net');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class PortMonitor {
  constructor() {
    this.commonPorts = [3000, 3001, 3002, 3003, 3004, 3005, 5000, 8000];
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
    };
  }

  log(message, color = 'reset') {
    console.log(`${this.colors[color]}${message}${this.colors.reset}`);
  }

  async isPortInUse(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => resolve(false));
      });

      server.on('error', () => resolve(true));
    });
  }

  async getProcessInfo(port) {
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      const pid = stdout.trim();
      
      if (pid) {
        const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o pid,ppid,comm,args --no-headers`);
        return {
          pid,
          info: processInfo.trim(),
        };
      }
    } catch (error) {
      // Process not found or lsof not available
    }
    
    return null;
  }

  async killProcess(port) {
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      const pid = stdout.trim();
      
      if (pid) {
        await execAsync(`kill -9 ${pid}`);
        this.log(`✓ Killed process ${pid} on port ${port}`, 'green');
        return true;
      }
    } catch (error) {
      this.log(`✗ Failed to kill process on port ${port}: ${error.message}`, 'red');
    }
    
    return false;
  }

  async checkAllPorts() {
    this.log('\n🔍 VTRIA ERP Port Status Check', 'bright');
    this.log('=' * 50, 'cyan');

    const results = [];

    for (const port of this.commonPorts) {
      const inUse = await this.isPortInUse(port);
      const processInfo = inUse ? await this.getProcessInfo(port) : null;
      
      results.push({
        port,
        inUse,
        processInfo,
      });
    }

    // Display results
    console.log('\nPort Status:');
    console.log('Port\tStatus\t\tProcess Info');
    console.log('-'.repeat(70));

    for (const result of results) {
      const status = result.inUse ? 'IN USE' : 'FREE';
      const color = result.inUse ? 'red' : 'green';
      const processInfo = result.processInfo ? 
        `PID: ${result.processInfo.pid} - ${result.processInfo.info.substring(0, 40)}...` : 
        '';

      console.log(`${result.port}\t${this.colors[color]}${status}${this.colors.reset}\t\t${processInfo}`);
    }

    return results;
  }

  async cleanupPorts() {
    this.log('\n🧹 Cleaning up VTRIA ERP development ports...', 'yellow');
    
    const results = await this.checkAllPorts();
    const portsInUse = results.filter(r => r.inUse);

    if (portsInUse.length === 0) {
      this.log('✓ All ports are free!', 'green');
      return;
    }

    this.log(`\nFound ${portsInUse.length} ports in use. Attempting cleanup...`, 'yellow');

    for (const result of portsInUse) {
      if (result.processInfo) {
        this.log(`\nCleaning port ${result.port} (PID: ${result.processInfo.pid})...`, 'cyan');
        await this.killProcess(result.port);
      }
    }

    // Wait a moment and check again
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.log('\n📊 Post-cleanup status:', 'bright');
    await this.checkAllPorts();
  }

  async startPortMonitoring() {
    this.log('\n👁️  Starting port monitoring (press Ctrl+C to stop)...', 'blue');
    
    const checkInterval = setInterval(async () => {
      const results = await this.checkAllPorts();
      const timestamp = new Date().toLocaleTimeString();
      
      const portsInUse = results.filter(r => r.inUse).map(r => r.port);
      
      if (portsInUse.length > 0) {
        this.log(`[${timestamp}] Ports in use: ${portsInUse.join(', ')}`, 'yellow');
      } else {
        this.log(`[${timestamp}] All ports free`, 'green');
      }
    }, 10000); // Check every 10 seconds

    // Cleanup on exit
    process.on('SIGINT', () => {
      clearInterval(checkInterval);
      this.log('\n👋 Port monitoring stopped', 'cyan');
      process.exit(0);
    });
  }

  displayHelp() {
    this.log('\n🔧 VTRIA ERP Port Monitor', 'bright');
    this.log('Usage: node check-ports.js [command]', 'cyan');
    this.log('\nCommands:');
    this.log('  check     - Check current port status (default)');
    this.log('  cleanup   - Kill processes on development ports');
    this.log('  monitor   - Continuously monitor port status');
    this.log('  help      - Show this help message');
    this.log('\nCommon VTRIA ERP ports:');
    this.log('  3000 - React development server');
    this.log('  3001 - API server (primary)');
    this.log('  3002-3005 - API server (fallback ports)');
    this.log('  5000 - Alternative API port');
  }
}

// Main execution
async function main() {
  const monitor = new PortMonitor();
  const command = process.argv[2] || 'check';

  try {
    switch (command.toLowerCase()) {
      case 'check':
        await monitor.checkAllPorts();
        break;
      
      case 'cleanup':
        await monitor.cleanupPorts();
        break;
      
      case 'monitor':
        await monitor.startPortMonitoring();
        break;
      
      case 'help':
      case '--help':
      case '-h':
        monitor.displayHelp();
        break;
      
      default:
        monitor.log(`Unknown command: ${command}`, 'red');
        monitor.displayHelp();
        process.exit(1);
    }
  } catch (error) {
    monitor.log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PortMonitor;