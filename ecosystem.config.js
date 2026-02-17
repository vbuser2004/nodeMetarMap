/**
 * PM2 Ecosystem Configuration for Node METAR Map
 * Manages the application as a background service with automatic restarts
 */

module.exports = {
  apps: [{
    name: 'metar-map',
    script: './dist/index.js',
    
    // Instance configuration
    instances: 1,
    exec_mode: 'fork',
    
    // Restart configuration
    autorestart: false,  // Don't auto-restart on exit (we use cron_restart instead)
    max_restarts: 3,
    min_uptime: '10s',
    
    // Cron-based restart (every 10 minutes to fetch new METAR data)
    cron_restart: '*/10 * * * *',
    
    // Memory management
    max_memory_restart: '200M',
    
    // Logging
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Environment
    env: {
      NODE_ENV: 'production'
    },
    
    // Additional options
    kill_timeout: 5000,  // Wait 5 seconds for graceful shutdown
    listen_timeout: 3000,
    
    // Don't watch files for changes in production
    watch: false,
    
    // Ignore watch patterns
    ignore_watch: [
      'node_modules',
      'logs',
      '.git'
    ]
  }]
};
