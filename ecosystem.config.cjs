module.exports = {
  apps: [{
    name: "exam-mcp",
    script: "dist/httpServer.js",
    env: {
      DJANGO_API_BASE_URL: "https://api.prepx.app",
      PORT: 3000
    }
  }]
};