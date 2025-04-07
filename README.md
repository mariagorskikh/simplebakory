# HTTP Implementation of Model Context Protocol (MCP)

This is a pure HTTP implementation of the Model Context Protocol (MCP) that avoids EventSource/SSE compatibility issues with recent versions of Node.js.

## Features

- Pure HTTP implementation (no SSE dependencies)
- Compatible with Node.js v16+, including v23.x
- Supports all core MCP functionality
- Easy to deploy to platforms like Railway

## Quick Start

### Running the Server

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server will be available at http://localhost:3002

### Testing with the Client

```bash
# Run the test client
npm run client
```

## Available Endpoints

- `/register` - Register a new session
- `/api/message` - Send MCP messages
- `/status` - Check server status
- `/health` - Health check endpoint

## Deployment

See [deployment.md](docs/deployment.md) for detailed deployment instructions.

## License

MIT
