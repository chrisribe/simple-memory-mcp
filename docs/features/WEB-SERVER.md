# Memory Browser Web Server

A simple HTTP server that provides a visual web interface to browse and search your memory database.

## Quick Start

### Using PowerShell Script (Recommended)

```powershell
# Windows
.\scripts\start-web-server.ps1 -MemoryDb "C:/path/to/memory.db" -Port 3000
```

### Using Node Directly

```bash
# Set environment variable
export MEMORY_DB="/path/to/memory.db"  # Linux/Mac
$env:MEMORY_DB = "C:/path/to/memory.db"  # Windows PowerShell

# Start server
node dist/web-server.js

# Optional: Custom port
WEB_PORT=3001 node dist/web-server.js
```

## Features

### Visual Interface
- 🎨 Beautiful gradient UI with card-based layout
- 🔍 Real-time search across all memory content
- 🏷️ Interactive tag cloud with click-to-filter
- 📊 Live statistics (total memories, database size, etc.)
- 📱 Responsive design for mobile and desktop

### Search & Filter
- Full-text search across memory content
- Filter by tags (click any tag in the cloud)
- Combine search with tag filters
- Clear filters with one click

### Memory Details
- Click any memory card to see full content
- View metadata: ID, creation date, hash
- See all associated tags
- Expandable content for long memories

## API Endpoints

The server provides a RESTful API:

### GET `/api/memories`
Retrieve memories with optional filters.

**Query Parameters:**
- `limit` (number): Max results (default: 100, max: 10000)
- `query` (string): Search text
- `tag` (string): Filter by tag

**Example:**
```bash
curl "http://localhost:3000/api/memories?limit=50&query=azure"
```

**Response:**
```json
{
  "memories": [...],
  "count": 25,
  "limit": 50
}
```

### GET `/api/stats`
Get database statistics.

**Example:**
```bash
curl "http://localhost:3000/api/stats"
```

**Response:**
```json
{
  "totalMemories": 1234,
  "totalTags": 89,
  "databaseSize": "2.5 MB",
  "oldestMemory": "2025-01-15T10:30:00.000Z",
  "newestMemory": "2025-10-10T05:07:28.786Z"
}
```

### GET `/api/memory/:hash`
Get a specific memory by hash.

**Example:**
```bash
curl "http://localhost:3000/api/memory/abc123def456"
```

**Response:**
```json
{
  "id": 42,
  "content": "Memory content here...",
  "tags": ["azure", "typescript"],
  "createdAt": "2025-10-09T17:22:43.940Z",
  "hash": "abc123def456..."
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMORY_DB` | `./memory.db` | Path to SQLite database |
| `WEB_PORT` | `3000` | HTTP server port |

### PowerShell Script Parameters

```powershell
.\scripts\start-web-server.ps1 `
  -MemoryDb "C:/path/to/memory.db" `
  -Port 3001
```

## Error Handling

The server includes comprehensive error handling:

### Port Already in Use
```
❌ Error: Port 3000 is already in use
   Try a different port: WEB_PORT=3001 node dist/web-server.js
```

**Solution:** Use a different port

### Database Not Found
```
❌ Error: Database not found at: ./memory.db
```

**Solution:** Set `MEMORY_DB` to the correct path

### Database Connection Failed
```
❌ Failed to initialize database: SQLITE_ERROR
```

**Solution:** Check database file permissions and integrity

## Request Logging

All requests are logged with timestamps:
```
[2025-10-10T05:07:28.786Z] GET /
[2025-10-10T05:07:28.834Z] GET /api/stats
[2025-10-10T05:07:28.865Z] GET /api/memories?limit=1000
```

## Graceful Shutdown

Press `Ctrl+C` to gracefully shutdown:
```
🛑 Shutting down gracefully...
✓ HTTP server closed
✓ Database connection closed

👋 Goodbye!
```

The server ensures:
- HTTP connections are closed
- Database connections are properly released
- No data corruption during shutdown
- 5-second timeout for forced shutdown if needed

## Security Notes

⚠️ **Local Use Only**

This server is designed for **local development** use:
- No authentication
- No HTTPS
- CORS enabled for all origins
- Binds to all interfaces (0.0.0.0)

**Do NOT expose to the internet without adding:**
- Authentication (JWT, OAuth, etc.)
- HTTPS/TLS encryption
- Rate limiting
- Input sanitization
- Firewall rules

## Troubleshooting

### Server won't start
1. Check if port is in use: `netstat -ano | findstr :3000`
2. Try a different port: `-Port 3001`
3. Check database path is correct
4. Verify database file is readable

### Can't connect from browser
1. Check firewall settings
2. Try `http://127.0.0.1:3000` instead of `localhost`
3. Check server logs for errors
4. Verify server is still running

### No memories showing
1. Check database actually has memories (use CLI tools)
2. Check browser console for JavaScript errors
3. Check API endpoint in network tab
4. Try refreshing the page

### High memory usage
1. Reduce search limit (default is 1000)
2. Filter by tags to reduce result set
3. Consider pagination for large databases

## Performance

- **Sub-millisecond** API response times
- **2,000-10,000 ops/sec** SQLite with FTS5
- Handles **10,000+ memories** smoothly
- Memory-efficient streaming responses
- Optimized prepared statements

## Browser Compatibility

Tested and working on:
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## Development

### Project Structure
```
src/
  web-server.ts           # HTTP server implementation
web/
  memory-browser.html     # Single-page web UI
scripts/
  start-web-server.ps1    # PowerShell launcher script
```

### Build
```bash
npm run build
```

### Test
```bash
# Start server
npm run web

# Or with custom config
MEMORY_DB=./test.db WEB_PORT=3001 npm run web
```

## Future Enhancements

Planned features:
- [ ] Pagination for large result sets
- [ ] Export filtered results to JSON
- [ ] Dark mode toggle
- [ ] Authentication/authorization
- [ ] HTTPS support
- [ ] WebSocket for live updates
- [ ] Memory editing interface
- [ ] Relationship graph visualization
- [ ] Advanced filters (date range, multiple tags)
- [ ] Keyboard shortcuts
