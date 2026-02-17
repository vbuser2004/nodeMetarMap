/**
 * PM2 Ecosystem Configuration for Node METAR Map
 * Manages the application as a background service with automatic restarts
 * 
 * The app now runs continuously and fetches METAR data at configured intervals.
 * PM2 will auto-restart on crashes or excessive memory usage.
 */

module.exports = {
  apps: [{
    name: 'metar-map',
    script: './dist/index.js',
    
    // Instance configuration
    instances: 1,
    exec_mode: 'fork',
    
    // Restart configuration
    autorestart: true,   // Auto-restart on crashes
    max_restarts: 10,    // Allow more restarts (continuous mode)
    min_uptime: '30s',   // Must run for 30s to be considered stable
    restart_delay: 5000, // Wait 5s before restarting after crash
    
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
