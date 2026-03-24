/**
 * Centralized Configuration
 * Single source of truth for all ports and URLs
 */

const CONFIG = {
  // Backend Configuration
  server: {
    port: process.env.PORT || 5000,
    host: 'localhost',
  },

  // Frontend Configuration
  client: {
    port: process.env.CLIENT_PORT || 5173,
    host: 'localhost',
  },

  // URLs
  urls: {
    get serverUrl() {
      return `http://${this.serverHost}:${this.serverPort}`;
    },
    get clientUrl() {
      return `http://${this.clientHost}:${this.clientPort}`;
    },
    serverHost: process.env.SERVER_HOST || 'localhost',
    serverPort: process.env.SERVER_PORT || 5000,
    clientHost: process.env.CLIENT_HOST || 'localhost',
    clientPort: process.env.CLIENT_PORT || 5173,
  },
};

module.exports = CONFIG;
