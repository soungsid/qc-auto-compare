const http = require('http');

class MCPClient {
  constructor(port = 8932) {
    this.port = port;
    this.sessionId = null;
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: this.port,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response);
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      const requestBody = {
        jsonrpc: '2.0',
        method,
        id: Date.now(),
        params
      };

      req.write(JSON.stringify(requestBody));
      req.end();
    });
  }

  async initialize() {
    const response = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'Playwright MCP Test',
        version: '1.0.0'
      }
    });
    console.log('Initialized:', response.result);
    return response.result;
  }

  async listTools() {
    const response = await this.sendRequest('tools/list');
    console.log('Tools:', JSON.stringify(response.result, null, 2));
    return response.result;
  }

  async callTool(toolName, arguments_) {
    const response = await this.sendRequest('tools/call', {
      name: toolName,
      arguments: arguments_
    });
    console.log(`Tool ${toolName} result:`, JSON.stringify(response.result, null, 2));
    return response.result;
  }
}

async function main() {
  try {
    console.log('Connecting to Playwright MCP server...');
    const client = new MCPClient();
    
    // Step 1: Initialize
    await client.initialize();
    
    // Step 2: List available tools
    const tools = await client.listTools();
    
    // Step 3: Navigate to the website
    console.log('\nNavigating to https://auto.canadaquebec.ca...');
    const navigateResult = await client.callTool('browser_navigate', {
      url: 'https://auto.canadaquebec.ca'
    });
    
    // Step 4: Take a snapshot
    console.log('\nTaking page snapshot...');
    const snapshotResult = await client.callTool('browser_snapshot', {});
    
    // Step 5: Take a screenshot
    console.log('\nTaking screenshot...');
    const screenshotResult = await client.callTool('browser_take_screenshot', {
      type: 'png',
      filename: 'auto-canadaquebec-ca.png'
    });
    
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();