const net = require('net');

/**
 * Port Management Utility
 * Handles port checking, cleanup, and automatic fallback
 */
class PortManager {
  constructor() {
    this.preferredPort = process.env.PORT || 3001;
    this.maxRetries = 10;
    this.portRange = { min: 3001, max: 3010 };
  }

  /**
   * Check if a port is available
   * @param {number} port 
   * @returns {Promise<boolean>}
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => {
          resolve(true);
        });
      });

      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Kill process using a specific port
   * @param {number} port 
   */
  async killProcessOnPort(port) {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      
      // Try to find and kill process on macOS/Linux
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (!error && stdout) {
          const pid = stdout.trim();
          exec(`kill -9 ${pid}`, (killError) => {
            if (!killError) {
              console.log(`✓ Killed process ${pid} on port ${port}`);
              // Wait a bit for port to be released
              setTimeout(() => resolve(true), 1000);
            } else {
              console.log(`✗ Failed to kill process on port ${port}`);
              resolve(false);
            }
          });
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Find an available port, starting with preferred
   * @returns {Promise<number>}
   */
  async findAvailablePort() {
    // First, try to clean up the preferred port
    if (!(await this.isPortAvailable(this.preferredPort))) {
      console.log(`⚠️  Port ${this.preferredPort} is occupied. Attempting cleanup...`);
      await this.killProcessOnPort(this.preferredPort);
      
      // Wait and check again
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (await this.isPortAvailable(this.preferredPort)) {
        console.log(`✓ Successfully freed port ${this.preferredPort}`);
        return this.preferredPort;
      }
    } else {
      return this.preferredPort;
    }

    // If preferred port is still not available, find an alternative
    console.log(`⚠️  Port ${this.preferredPort} still occupied. Looking for alternatives...`);
    
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (await this.isPortAvailable(port)) {
        console.log(`✓ Found available port: ${port}`);
        return port;
      }
    }

    throw new Error(`No available ports found in range ${this.portRange.min}-${this.portRange.max}`);
  }

  /**
   * Graceful server shutdown with port cleanup
   * @param {object} server - HTTP server instance
   */
  setupGracefulShutdown(server, port) {
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      // Close server
      server.close(async () => {
        console.log('✓ HTTP server closed');
        
        // Additional cleanup if needed
        await this.cleanup(port);
        
        console.log('✓ Cleanup completed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon restart
  }

  /**
   * Additional cleanup operations
   * @param {number} port 
   */
  async cleanup(port) {
    try {
      // Force kill any remaining processes on this port
      await this.killProcessOnPort(port);
      
      // Close any database connections, etc.
      // Add your cleanup logic here
      
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  }

  /**
   * Update client configuration with new port
   * @param {number} port 
   */
  updateClientConfig(port) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Update client .env file if it exists
      const clientEnvPath = path.join(__dirname, '../../../client/.env');
      
      if (fs.existsSync(clientEnvPath)) {
        let content = fs.readFileSync(clientEnvPath, 'utf8');
        
        // Update API URL
        const apiUrlRegex = /REACT_APP_API_URL=.*/;
        const newApiUrl = `REACT_APP_API_URL=http://localhost:${port}`;
        
        if (apiUrlRegex.test(content)) {
          content = content.replace(apiUrlRegex, newApiUrl);
        } else {
          content += `\n${newApiUrl}\n`;
        }
        
        fs.writeFileSync(clientEnvPath, content);
        console.log(`✓ Updated client API URL to port ${port}`);
      }
    } catch (error) {
      console.error('Failed to update client config:', error.message);
    }
  }

  /**
   * Create port lock file to track active ports
   * @param {number} port 
   */
  createPortLock(port) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const lockDir = path.join(__dirname, '../../../.port-locks');
      if (!fs.existsSync(lockDir)) {
        fs.mkdirSync(lockDir, { recursive: true });
      }
      
      const lockFile = path.join(lockDir, `port-${port}.lock`);
      fs.writeFileSync(lockFile, JSON.stringify({
        port,
        pid: process.pid,
        timestamp: new Date().toISOString(),
        service: 'vtria-erp-api'
      }));
      
      // Clean up lock file on exit
      process.on('exit', () => {
        try {
          fs.unlinkSync(lockFile);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      
    } catch (error) {
      console.error('Failed to create port lock:', error.message);
    }
  }
}

module.exports = new PortManager();