module.exports = {
  apps: [{
    name: 'banf-email-reader',
    script: 'bosonto-email-reader-agent.js',
    args: '--poll --interval=5',
    cwd: 'c:\\projects\\banf',
    restart_delay: 10000,       // 10s between restarts
    max_restarts: 50,           // max 50 restarts before stopping
    min_uptime: 30000,          // must run 30s to count as "started"
    autorestart: true,
    watch: false,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'logs/email-reader-error.log',
    out_file: 'logs/email-reader-out.log',
    merge_logs: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
