Status Page Dashboard

# A comprehensive status monitoring dashboard built with Express.js 

- Multi-Service Monitoring: Monitor URLs, Minecraft servers, and general host connectivity
- Real-time Status Updates: Automatic checks every 5 minutes with manual refresh option
- Minecraft Server Integration: Get detailed Minecraft server info including player count and version
- Response Time Tracking: Monitor performance with response time metrics
- Uptime Statistics: Track service availability over time
- JSON Configuration: Simple file-based service management
- Responsive Design: Clean, dark-themed interface that works on all devices

## Installation

### Setup Steps
- `git clone https://github.com/WinniePatGG/StatusWebsite`
- `cd StatusWebsite`

### Install dependencies
`npm install`

### Configure services
Edit the services.json file to add your services (see Configuration section below)

### Start the server
`npm start`

### Access the dashboard
Open your browser and navigate to http://localhost:3000

## Configuration
### Services are configured in the services.json file. Here's the structure:

```json
[
    {
    "id": "1",
    "type": "url",
    "name": "Google",
    "url": "https://www.google.com",
    "description": "Google Search Engine",
    "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
    "id": "2",
    "type": "minecraft",
    "name": "My Minecraft Server",
    "host": "mc.example.com",
    "port": 25565,
    "description": "Our main Minecraft server",
    "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
    "id": "3",
    "type": "ping",
    "name": "Router",
    "host": "192.168.1.1",
    "description": "Home network router",
    "createdAt": "2024-01-01T00:00:00.000Z"
    }
]
```

###  Types
1. URL Monitoring (type: "url")

   Required Fields: url

   Description: Monitors HTTP/HTTPS endpoints

   Checks: HTTP status codes and response time

2. Minecraft Server (type: "minecraft")

   Required Fields: host

   Optional Fields: port (default: 25565)

   Description: Monitors Minecraft server status

   Provides: Player count, version, MOTD, and online status

3. Host Connectivity (type: "ping")

   Required Fields: host

   Description: Checks basic host connectivity

   Method: TCP port checks on common ports (80, 443, 22, 21)

## Troubleshooting
### Common Issues
#### Minecraft Server Not Showing Details

`Ensure the server has query enabled in server.properties`

`Check that the port is correct and not blocked by firewall`

`Verify the server is running and accessible`

#### URL Monitoring Fails

`Verify the URL is correct and accessible`

`Check if the site has CORS restrictions`

`Ensure the URL includes the protocol (http:// or https://)`

#### Host Connectivity Shows Offline

`The system checks common ports (80, 443, 22, 21)`

`For custom ports, use Minecraft server type instead`

`Check firewall settings and network connectivity`

#### Server Crashes on Startup

`Ensure services.json has valid JSON syntax`

`Check that all required fields are present for each service`

`Verify no duplicate service IDs exist`

#### Port Requirements

`The dashboard runs on port 3000 by default`

`Minecraft servers typically use port 25565`

`Ensure firewall allows outgoing connections to monitored services`

Available Scripts

`npm start` - Start the production server

## License

### This project is licensed under the MIT License - see the LICENSE file for details.
## Support

#### If you encounter any issues or have questions:

    Check the troubleshooting section above

    Ensure your services.json file is properly formatted

    Verify network connectivity to your monitored services

    Check the server console for error messages
