import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Direct client implementation that works around SSE issues
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3002';

async function runDirectClient() {
  console.log('Starting direct MCP client...');
  console.log(`Server URL: ${SERVER_URL}`);
  
  // Generate a unique client ID
  const sessionId = uuidv4();
  console.log(`Session ID: ${sessionId}`);
  
  try {
    // 1. First check if server is running
    console.log('Checking server status...');
    const statusResponse = await fetch(`${SERVER_URL}/status`);
    if (!statusResponse.ok) {
      throw new Error(`Server returned ${statusResponse.status}: ${await statusResponse.text()}`);
    }
    
    const statusData = await statusResponse.json();
    console.log('Server status:', statusData);
    
    if (statusData.status !== 'online') {
      throw new Error('Server is not online');
    }
    
    // 2. Register a session
    console.log('\nRegistering session...');
    const registerResponse = await fetch(`${SERVER_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId })
    });
    
    if (!registerResponse.ok) {
      throw new Error(`Registration failed with status ${registerResponse.status}: ${await registerResponse.text()}`);
    }
    
    const registerData = await registerResponse.json();
    console.log('Registration response:', registerData);
    
    // 3. Initialize the session
    console.log('\nInitializing session...');
    const initResponse = await fetch(`${SERVER_URL}/api/message?sessionId=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          client: {
            name: 'direct-mcp-client',
            version: '1.0.0'
          },
          capabilities: {}
        }
      })
    });
    
    if (!initResponse.ok) {
      throw new Error(`Initialization failed with status ${initResponse.status}: ${await initResponse.text()}`);
    }
    
    const initData = await initResponse.json();
    console.log('Initialization response:', initData);
    
    // 4. List available tools
    console.log('\nListing available tools...');
    const toolsResponse = await fetch(`${SERVER_URL}/api/message?sessionId=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'listTools',
        params: {}
      })
    });
    
    if (!toolsResponse.ok) {
      throw new Error(`Listing tools failed with status ${toolsResponse.status}: ${await toolsResponse.text()}`);
    }
    
    const toolsData = await toolsResponse.json();
    console.log('Available tools:', toolsData.result.tools);
    
    // 5. Call the fetchWebsite tool
    const url = 'https://modelcontextprotocol.io';
    console.log(`\nCalling fetchWebsite tool with URL: ${url}`);
    const toolCallResponse = await fetch(`${SERVER_URL}/api/message?sessionId=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'callTool',
        params: {
          name: 'fetchWebsite',
          arguments: {
            url
          }
        }
      })
    });
    
    if (!toolCallResponse.ok) {
      throw new Error(`Tool call failed with status ${toolCallResponse.status}: ${await toolCallResponse.text()}`);
    }
    
    const toolCallData = await toolCallResponse.json();
    console.log('Tool call successful!');
    
    if (toolCallData.result.content && toolCallData.result.content[0]) {
      const content = toolCallData.result.content[0];
      console.log('Content type:', content.type);
      if (content.text) {
        console.log('First 100 characters of content:', 
          content.text.substring(0, 100) + '...');
      }
    }
    
    console.log('\nAll operations completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

runDirectClient().catch(console.error); 