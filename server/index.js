import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fetch from "node-fetch";
import { z } from "zod";

// Create MCP server
const server = new McpServer({
  name: "direct-api-server",
  version: "1.0.0"
});

// Log server info for debugging
console.log("Server info:", server);

// Add tool to fetch website content
server.tool(
  "fetchWebsite",
  { url: z.string().url() },
  async ({ url }) => {
    try {
      console.log(`Fetching website content from: ${url}`);
      const response = await fetch(url);
      const text = await response.text();
      console.log(`Successfully fetched ${url}, content length: ${text.length} chars`);
      return {
        content: [{ 
          type: "text", 
          text: `Content from ${url}:\n\n${text.substring(0, 4000)}${text.length > 4000 ? '...(truncated)' : ''}` 
        }]
      };
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      return {
        content: [{ 
          type: "text", 
          text: `Error fetching ${url}: ${error.message}` 
        }],
        isError: true
      };
    }
  }
);

// Create Express app
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

// Store active sessions
const sessions = {};

// Simple session registration
app.post("/register", (req, res) => {
  const sessionId = req.body.sessionId;
  
  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId in request body" });
  }
  
  console.log(`Registering new session: ${sessionId}`);
  sessions[sessionId] = {
    id: sessionId,
    created: new Date(),
    initialized: false,
    messages: []
  };
  
  res.json({ 
    status: "success", 
    sessionId,
    message: "Session registered successfully"
  });
});

// Direct message handler
app.post("/api/message", async (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.body.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId parameter" });
    }
    
    if (!sessions[sessionId]) {
      return res.status(404).json({ error: "Session not found. Register first." });
    }
    
    const session = sessions[sessionId];
    const message = req.body;
    
    console.log(`Received message for session ${sessionId}:`, message);
    
    // Handle initialize method specially
    if (message.method === "initialize") {
      session.initialized = true;
      session.clientInfo = message.params.client;
      
      return res.json({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          server: {
            name: "direct-api-server",
            version: "1.0.0"
          },
          capabilities: {}
        }
      });
    }
    
    // All other methods require initialization
    if (!session.initialized) {
      return res.status(400).json({ 
        error: "Session not initialized. Send initialize method first." 
      });
    }
    
    // Handle listTools
    if (message.method === "listTools") {
      return res.json({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          tools: [
            {
              name: "fetchWebsite",
              description: "Fetches the content of a website by URL",
              parameters: {
                type: "object",
                properties: {
                  url: {
                    type: "string",
                    format: "uri",
                    description: "The URL to fetch"
                  }
                },
                required: ["url"]
              }
            }
          ]
        }
      });
    }
    
    // Handle callTool for fetchWebsite
    if (message.method === "callTool" && message.params.name === "fetchWebsite") {
      try {
        const url = message.params.arguments.url;
        
        if (!url) {
          return res.status(400).json({
            jsonrpc: "2.0",
            id: message.id,
            error: {
              code: -32602,
              message: "Invalid params: url is required"
            }
          });
        }
        
        console.log(`Executing fetchWebsite tool with URL: ${url}`);
        
        const response = await fetch(url);
        const text = await response.text();
        
        return res.json({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            content: [
              {
                type: "text",
                text: `Content from ${url}:\n\n${text.substring(0, 4000)}${text.length > 4000 ? '...(truncated)' : ''}`
              }
            ]
          }
        });
      } catch (error) {
        console.error("Error fetching website:", error);
        
        return res.json({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            content: [
              {
                type: "text",
                text: `Error fetching website: ${error.message}`
              }
            ],
            isError: true
          }
        });
      }
    }
    
    // Handle ping
    if (message.method === "ping") {
      return res.json({
        jsonrpc: "2.0",
        id: message.id,
        result: null
      });
    }
    
    // Unsupported method
    return res.status(400).json({
      jsonrpc: "2.0",
      id: message.id,
      error: {
        code: -32601,
        message: "Method not supported"
      }
    });
    
  } catch (error) {
    console.error("Error handling message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Status endpoint
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    sessions: Object.keys(sessions).length,
    server: {
      name: "direct-api-server",
      version: "1.0.0"
    }
  });
});

// Health check
app.get("/health", (req, res) => {
  res.send("OK");
});

// Home page
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Direct API Server</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
          .endpoint { margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Direct API Server</h1>
        <p>This is a simplified direct API server without SSE for easier debugging.</p>
        
        <div class="endpoint">
          <h2>Endpoints:</h2>
          <ul>
            <li><strong>POST /register</strong> - Register a new session</li>
            <li><strong>POST /api/message?sessionId=ID</strong> - Send a message</li>
            <li><strong>GET /status</strong> - Check server status</li>
            <li><strong>GET /health</strong> - Health check</li>
          </ul>
        </div>
        
        <div class="endpoint">
          <h2>Available Tools:</h2>
          <ul>
            <li><strong>fetchWebsite</strong> - Fetches content from a specified URL</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Direct API Server running on http://localhost:${PORT}`);
  console.log(`Register endpoint: http://localhost:${PORT}/register`);
  console.log(`Message endpoint: http://localhost:${PORT}/api/message`);
}); 