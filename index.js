// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const net = require('net');
const app = express();

app.use(cors());
app.use(express.json());

// File path for services storage
const SERVICES_FILE = path.join(__dirname, 'services.json');

// Load services from JSON file
async function loadServices() {
    try {
        const data = await fs.readFile(SERVICES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, create it with empty array
        if (error.code === 'ENOENT') {
            await saveServices([]);
            return [];
        }
        console.error('Error loading services:', error);
        return [];
    }
}

// Save services to JSON file
async function saveServices(services) {
    try {
        await fs.writeFile(SERVICES_FILE, JSON.stringify(services, null, 2));
    } catch (error) {
        console.error('Error saving services:', error);
    }
}

let statusHistory = [];

// Utility function to check URL status
async function checkURL(url) {
    try {
        const start = Date.now();
        const response = await axios.get(url, { timeout: 10000 });
        const responseTime = Date.now() - start;

        return {
            status: response.status,
            online: response.status >= 200 && response.status < 400,
            responseTime,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: error.response?.status || 0,
            online: false,
            responseTime: 0,
            timestamp: new Date().toISOString(),
            error: error.message
        };
    }
}

// Simple TCP port check
function checkPort(host, port, timeout = 5000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const start = Date.now();

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            const responseTime = Date.now() - start;
            socket.destroy();
            resolve({
                online: true,
                responseTime,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({
                online: false,
                responseTime: 0,
                timestamp: new Date().toISOString(),
                error: 'Connection timeout'
            });
        });

        socket.on('error', () => {
            socket.destroy();
            resolve({
                online: false,
                responseTime: 0,
                timestamp: new Date().toISOString(),
                error: 'Connection failed'
            });
        });

        socket.connect(port, host);
    });
}

// Utility function to check Minecraft server status
async function checkMinecraftServer(host, port = 25565) {
    try {
        const start = Date.now();

        // First, check if the port is open using TCP
        const portCheck = await checkPort(host, port, 10000);

        if (!portCheck.online) {
            return {
                online: false,
                players: 0,
                maxPlayers: 0,
                version: null,
                responseTime: 0,
                timestamp: new Date().toISOString(),
                error: portCheck.error
            };
        }

        // Try to get Minecraft server status using minecraft-server-util
        try {
            const { status } = await import('minecraft-server-util');
            const result = await status(host, parseInt(port), {
                timeout: 10000,
                enableSRV: true
            });

            return {
                online: true,
                players: result.players.online,
                maxPlayers: result.players.max,
                version: result.version.name,
                motd: result.motd.clean,
                responseTime: Date.now() - start,
                timestamp: new Date().toISOString()
            };
        } catch (mcError) {
            // If minecraft-server-util fails but port is open, assume it's a Minecraft server
            return {
                online: true,
                players: 0,
                maxPlayers: 0,
                version: 'Unknown',
                responseTime: portCheck.responseTime,
                timestamp: new Date().toISOString(),
                error: 'Cannot retrieve server details'
            };
        }
    } catch (error) {
        return {
            online: false,
            players: 0,
            maxPlayers: 0,
            version: null,
            responseTime: 0,
            timestamp: new Date().toISOString(),
            error: error.message
        };
    }
}

// Simple ping check using TCP
async function checkPing(host) {
    // For ping type, we'll just check common ports or do a simple TCP connection test
    const commonPorts = [80, 443, 22, 21];

    for (const port of commonPorts) {
        try {
            const result = await checkPort(host, port, 5000);
            if (result.online) {
                return {
                    online: true,
                    responseTime: result.responseTime,
                    timestamp: new Date().toISOString(),
                    port: port
                };
            }
        } catch (error) {
            continue;
        }
    }

    // If no common ports are open, try a DNS lookup as a fallback
    try {
        const dns = await import('dns');
        const start = Date.now();
        await dns.promises.lookup(host);
        const responseTime = Date.now() - start;

        return {
            online: true,
            responseTime,
            timestamp: new Date().toISOString(),
            note: 'Host resolved but no open ports found'
        };
    } catch (dnsError) {
        return {
            online: false,
            responseTime: 0,
            timestamp: new Date().toISOString(),
            error: 'Host unreachable'
        };
    }
}

// Check all services
async function checkAllServices() {
    const services = await loadServices();
    const checks = [];

    for (const service of services) {
        let checkPromise;

        switch (service.type) {
            case 'url':
                checkPromise = checkURL(service.url);
                break;
            case 'minecraft':
                checkPromise = checkMinecraftServer(service.host, service.port);
                break;
            case 'ping':
                checkPromise = checkPing(service.host);
                break;
            default:
                continue;
        }

        checks.push(
            checkPromise.then(result => ({
                serviceId: service.id,
                ...result
            })).catch(error => ({
                serviceId: service.id,
                online: false,
                error: error.message,
                timestamp: new Date().toISOString()
            }))
        );
    }

    const results = await Promise.allSettled(checks);
    const statusUpdates = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

    statusHistory.push({
        timestamp: new Date().toISOString(),
        checks: statusUpdates
    });

    // Keep only last 100 status updates
    if (statusHistory.length > 100) {
        statusHistory = statusHistory.slice(-100);
    }

    return statusUpdates;
}

// Routes

// Get all services
app.get('/api/services', async (req, res) => {
    try {
        const services = await loadServices();
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load services' });
    }
});

// Get current status of all services
app.get('/api/status', async (req, res) => {
    try {
        const status = await checkAllServices();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: 'Failed to check services status' });
    }
});

// Get status history
app.get('/api/status/history', (req, res) => {
    res.json(statusHistory);
});

// Get service uptime statistics
app.get('/api/stats/:serviceId', (req, res) => {
    const { serviceId } = req.params;
    const serviceChecks = statusHistory.flatMap(update =>
        update.checks.filter(check => check.serviceId === serviceId)
    );

    if (serviceChecks.length === 0) {
        return res.status(404).json({ error: 'No data found for service' });
    }

    const totalChecks = serviceChecks.length;
    const onlineChecks = serviceChecks.filter(check => check.online).length;
    const uptimePercentage = (onlineChecks / totalChecks * 100).toFixed(2);

    const responseTimes = serviceChecks
        .map(check => check.responseTime)
        .filter(time => time > 0);

    const avgResponseTime = responseTimes.length > 0
        ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)
        : 0;

    res.json({
        serviceId,
        totalChecks,
        onlineChecks,
        offlineChecks: totalChecks - onlineChecks,
        uptimePercentage: parseFloat(uptimePercentage),
        averageResponseTime: parseFloat(avgResponseTime),
        lastChecked: serviceChecks[serviceChecks.length - 1]?.timestamp
    });
});

// Public endpoint to check a specific URL (for external use)
app.get('/api/public/check-url', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const result = await checkURL(url);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to check URL' });
    }
});

// Public endpoint to check Minecraft server (for external use)
app.get('/api/public/check-minecraft', async (req, res) => {
    const { host, port = 25565 } = req.query;

    if (!host) {
        return res.status(400).json({ error: 'Host parameter is required' });
    }

    try {
        const result = await checkMinecraftServer(host, parseInt(port));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to check Minecraft server' });
    }
});

// Public endpoint to check host connectivity (for external use)
app.get('/api/public/check-host', async (req, res) => {
    const { host } = req.query;

    if (!host) {
        return res.status(400).json({ error: 'Host parameter is required' });
    }

    try {
        const result = await checkPing(host);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to check host' });
    }
});

// Serve static status page
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Status page server running on port ${PORT}`);
});

// Auto-check services every 5 minutes
setInterval(checkAllServices, 5 * 60 * 1000);