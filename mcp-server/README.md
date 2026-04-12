# ProjexLight MCP Server

**Enables your AI coding assistant to generate code with project-specific guidance.**

---

## What is MCP Server?

The **MCP (Model Context Protocol) Server** connects your AI coding assistant (Claude Code, Cursor, Cline, etc.) to ProjexLight, providing:

- **Project Context** - Your AI assistant knows your requirements, tech stack, and coding standards
- **Task Instructions** - Detailed guidance for each task in your sprint
- **Code Validation** - Automated checks before code is accepted
- **Git Quality Gates** - Duplicate detection and API testing on commit/push

---

## Quick Start

### Step 1: Start MCP Server

The recommended way is to use the **setup-all.sh** script, which handles database, Dev MCP, and Test MCP containers together:

```bash
cd mcp-server
./setup-all.sh
```

This smart script will:
- Detect existing containers and skip what's already running
- Start the database, Dev MCP, and Test MCP containers
- Set up database schema and install git hooks
- Register your project automatically (multi-project aware)

Wait about 30 seconds for services to initialize.

#### Individual Setup Scripts

If you only need specific services, use the individual scripts:

```bash
cd mcp-server

# Database only (PostgreSQL, MySQL, MongoDB, etc.)
./setup-database.sh start

# Dev MCP only (code generation, code review, git hooks)
./setup-dev-mcp.sh start

# Test MCP only (UI and API test execution)
./setup-test-mcp.sh start
```

#### Setup Script Commands

All individual scripts support the same commands:

| Command | Description |
|---------|-------------|
| `start` | Start the service |
| `stop` | Stop the service |
| `restart` | Restart the service |
| `status` | Check service status |
| `logs` | View service logs |
| `update` | Pull latest image and restart |

`setup-all.sh` supports additional flags:

| Flag | Description |
|------|-------------|
| `--status` | Check status of all containers |
| `--register` | Register this project with existing MCP |
| `--install-hooks` | Install git hooks only |
| `--force` | Force restart all containers |

### Step 2: Verify It's Running

```bash
curl http://localhost:8766/health    # Dev MCP
curl http://localhost:8000/health    # Test MCP
```

**Expected Response:**
```json
{
  "status": "healthy",
  "uptime": "...",
  "workspace": "/workspace"
}
```

### Step 3: Configure Your AI Coding Tool

Add the MCP server to your AI coding tool configuration.

**For Claude Code** (`~/.claude/settings.json` or project settings):
```json
{
  "mcpServers": {
    "projexlight": {
      "url": "http://localhost:8766"
    }
  }
}
```

**For Cursor/Cline:** Check their MCP configuration documentation.

### Step 4: Start Coding!

Navigate to your project directory and launch your AI coding assistant.

#### MCP-Enabled Tools (Claude, Goose, Cline, Antigravity)

These tools have native MCP support - instructions are fetched automatically:

```bash
cd your-project
claude  # or goose, cline, etc.
```
> "Read .claude/instructions/bootstrap.md and start"

#### HTTP API Tools (Cursor, Aider, Windsurf)

These tools use curl to fetch instructions from the MCP server:

```bash
cd your-project

# Start MCP server first
cd mcp-server && ./setup-all.sh && cd ..

# Start your tool
cursor  # or aider, windsurf
```
> "Read .cursor/instructions/bootstrap.md and start"

The bootstrap.md contains curl commands to fetch rules and instructions.

---

### Continuing Work (After First Session)

```bash
cd your-project
claude  # or your preferred tool
```
> "Continue from where I left off"

**Or for specific tasks:**
> "Execute tasks 3-5"

---

### What Happens Automatically

1. AI reads bootstrap.md (minimal instructions)
2. Calls MCP server to get rules and task details
3. Generates code following fetched rules
4. Validates code before writing
5. Updates task progress

### Step 5: Initialize Git (When Ready)

```bash
cd ..  # Back to project root
git init
git remote add origin https://github.com/your-repo.git
```

Git hooks are automatically installed to check for duplicates and test APIs.

---

## Project Structure

```
your-project/
├── README.md                     # Project README
├── .claude/
│   └── instructions/
│       └── bootstrap.md          # Instructions for your AI assistant
├── .projexlight/
│   └── context/
│       ├── requirements.md       # Project requirements
│       ├── sprint-context.json   # Sprint configuration
│       └── task-list.json        # Tasks to complete
├── init-scripts/                 # Database initialization scripts
├── mcp-server/                   # MCP Server (this folder)
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── mcp-server               # Compiled server executable
│   └── README.md                # This file
└── src/                         # Your generated code goes here
```

---

## Git Hooks (Automatic)

When you run `git init`, the MCP server automatically installs quality gates:

| Hook | What It Does |
|------|--------------|
| **Pre-commit** | Scans for duplicate APIs and blocks if found |
| **Pre-push** | Tests your APIs and reports results |

### Bypass Hooks (Emergency Only)

```bash
git commit --no-verify -m "Emergency fix"
git push --no-verify
```

---

## Monitoring & Logs

### Health Check
```bash
curl http://localhost:8766/health
```

### View Logs

**Option 1: Via HTTP API (Recommended)**
```bash
# Get log directory and file locations
curl http://localhost:8766/logs

# View server logs (last 100 lines)
curl http://localhost:8766/logs/server

# View error logs (last 200 lines)
curl http://localhost:8766/logs/errors?lines=200

# View all logs combined
curl http://localhost:8766/logs/all?lines=100
```

**Option 2: Via Docker**
```bash
# View container stdout logs
docker logs projexlight-mcp

# Follow logs in real-time
docker logs -f projexlight-mcp
```

**Option 3: Direct File Access**

Logs are stored in your project's `.mcp-logs/` directory (accessible in your workspace):
```bash
# List log files
ls -la .mcp-logs/

# View main server log
cat .mcp-logs/mcp-server-YYYYMMDD-HHMMSS.log

# View latest server log (symlink)
cat .mcp-logs/latest-server.log
```

### Log Types

| Log Type | Description | HTTP Endpoint |
|----------|-------------|---------------|
| `server` | Main server activity | `/logs/server` |
| `activity` | File change detection | `/logs/activity` |
| `reviews` | Code review results | `/logs/reviews` |
| `errors` | Error messages | `/logs/errors` |

---

## System Requirements

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Git** for version control
- **AI Coding Tool** with MCP support (Claude Code, Cursor, Cline, etc.)

---

## Troubleshooting

### MCP Server Won't Start

```bash
# Check Docker is running
docker ps

# View logs for errors
./setup-dev-mcp.sh logs      # Dev MCP logs
./setup-test-mcp.sh logs     # Test MCP logs

# Restart
./setup-all.sh --force       # Force restart all
./setup-dev-mcp.sh restart   # Or restart individually
```

### AI Assistant Can't Connect

1. Verify MCP server is running: `curl http://localhost:8766/health`
2. Check your AI tool's MCP configuration
3. Restart your AI coding tool after config changes

### Git Hooks Not Working

```bash
# Check hooks status
curl http://localhost:8766/hooks/status

# Manually install hooks
curl -X POST http://localhost:8766/hooks/install
```

---

## Stopping Services

```bash
cd mcp-server

# Stop all services
./setup-dev-mcp.sh stop
./setup-test-mcp.sh stop
./setup-database.sh stop

# Or stop individually
./setup-dev-mcp.sh stop     # Dev MCP only
./setup-test-mcp.sh stop    # Test MCP only
./setup-database.sh stop    # Database only
```

To remove data volumes too:
```bash
./setup-database.sh reset   # Stop database, remove data, restart
```

---

## Additional Documentation

- **[docs/DEV_MCP.md](docs/DEV_MCP.md)** - Dev MCP: code generation, git hooks, API testing, debugging
- **[docs/TEST_MCP.md](docs/TEST_MCP.md)** - Test MCP: UI and API test execution
- **[docs/SUT_SETUP_GUIDE.md](docs/SUT_SETUP_GUIDE.md)** - Framework-specific SUT setup (binding to 0.0.0.0)

---

## Support

1. Check **[docs/DEV_MCP.md](docs/DEV_MCP.md)** for troubleshooting and debugging
2. View logs: `docker logs projexlight-mcp`
3. Contact ProjexLight support through the platform
