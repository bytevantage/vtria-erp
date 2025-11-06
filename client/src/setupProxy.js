const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Use Docker service name in Docker environment, localhost for local development  
  const apiTarget = process.env.DOCKER_ENV === 'true'
    ? 'http://api:3001'
    : '';

  console.log('API Proxy target:', apiTarget);

  // Only proxy API requests, not client-side routes
  app.use(
    '/api',
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
      logLevel: 'debug',
      // Add back the /api prefix that gets stripped by the proxy
      pathRewrite: (path, req) => {
        const newPath = '/api' + path;
        console.log('Path rewrite - original:', path, 'new:', newPath);
        return newPath;
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request from:', req.url, 'to:', proxyReq.path);
      },
    })
  );

  // Proxy health check
  app.use(
    '/health',
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
    })
  );

  // Proxy health endpoint
  app.use(
    '/health',
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
    })
  );

  // Proxy inventory-enhanced endpoints specifically
  app.use(
    '/inventory-enhanced',
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
      logLevel: 'debug',
      pathRewrite: (path, req) => {
        // path will be '/items/enhanced/16' (after /inventory-enhanced is stripped)
        // we want to rewrite it to '/api/inventory-enhanced/items/enhanced/16'
        const newPath = '/api/inventory-enhanced' + path;
        console.log('Inventory proxy - method:', req.method, 'original:', path, 'new:', newPath);
        return newPath;
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Inventory onProxyReq - method:', req.method, 'from:', req.url, 'to:', proxyReq.path);
      },
    })
  );

  // Proxy common endpoints that might be called without /api prefix
  app.use(
    ['/main', '/dashboard', '/enhanced', '/vtria-erp/main', '/vtria-erp/dashboard', '/vtria-erp/enhanced'],
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
      pathRewrite: {
        '^/main': '/api/main',
        '^/dashboard': '/api/dashboard',
        '^/enhanced': '/api/enhanced',
        '^/vtria-erp/main': '/api/main',
        '^/vtria-erp/dashboard': '/api/dashboard',
        '^/vtria-erp/enhanced': '/api/enhanced',
      },
    })
  );
};