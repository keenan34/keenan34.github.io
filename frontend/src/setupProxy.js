const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      // Docker resolves the API container by service name; local `npm start`
      // continues to use localhost without any extra configuration.
      target: process.env.DEV_PROXY_TARGET || "http://localhost:4000",
      changeOrigin: true,
    })
  );
};
