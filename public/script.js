let services = [];
let currentStatus = [];

// Load services and status
async function loadData() {
    try {
        const [servicesRes, statusRes] = await Promise.all([
            fetch('/api/services'),
            fetch('/api/status')
        ]);

        services = await servicesRes.json();
        currentStatus = await statusRes.json();

        renderServices();
        updateStats();
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Render service cards
function renderServices() {
    const grid = document.getElementById('serviceGrid');

    if (services.length === 0) {
        grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #9ca3af;">
                        <h3>No services configured</h3>
                        <p>Add services to the services.json file to start monitoring</p>
                    </div>
                `;
        return;
    }

    grid.innerHTML = '';

    services.forEach(service => {
        const status = currentStatus.find(s => s.serviceId === service.id);
        const card = document.createElement('div');
        card.className = 'service-card';

        const statusClass = status?.online ? 'status-online' : 'status-offline';
        const statusText = status?.online ? 'Online' : 'Offline';

        card.innerHTML = `
                    <div class="service-header">
                        <div class="service-name">${service.name}</div>
                        <div>
                            <span class="status-indicator ${statusClass}"></span>
                            ${statusText}
                        </div>
                    </div>
                    <div class="service-details">
                        <div><strong>Type:</strong> ${service.type}</div>
                        ${service.url ? `<div><strong>URL:</strong> ${service.url}</div>` : ''}
                        ${service.host ? `<div><strong>Host:</strong> ${service.host}</div>` : ''}
                        ${service.port ? `<div><strong>Port:</strong> ${service.port}</div>` : ''}
                        ${service.description ? `<div><strong>Description:</strong> ${service.description}</div>` : ''}
                        ${status?.responseTime ? `<div><strong>Response Time:</strong> ${status.responseTime}ms</div>` : ''}
                        ${status?.players !== undefined ? `<div><strong>Players:</strong> ${status.players}/${status.maxPlayers}</div>` : ''}
                        ${status?.version ? `<div><strong>Version:</strong> ${status.version}</div>` : ''}
                    </div>
                `;

        grid.appendChild(card);
    });
}

// Update statistics
function updateStats() {
    const statsContainer = document.getElementById('stats');
    const totalServices = services.length;
    const onlineServices = currentStatus.filter(s => s.online).length;
    const uptimePercentage = totalServices > 0 ? ((onlineServices / totalServices) * 100).toFixed(1) : 0;

    statsContainer.innerHTML = `
                <div class="stat-card">
                    <div>Total Services</div>
                    <div class="stat-value">${totalServices}</div>
                </div>
                <div class="stat-card">
                    <div>Online Services</div>
                    <div class="stat-value" style="color: var(--online)">${onlineServices}</div>
                </div>
                <div class="stat-card">
                    <div>Uptime</div>
                    <div class="stat-value">${uptimePercentage}%</div>
                </div>
            `;
}

// Update last updated time
function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdatedTime').textContent = now.toLocaleString();
}

// Refresh status
async function refreshStatus() {
    try {
        const response = await fetch('/api/status');
        currentStatus = await response.json();
        renderServices();
        updateStats();
        updateLastUpdated();
    } catch (error) {
        console.error('Error refreshing status:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    // Auto-refresh every 30 seconds
    setInterval(refreshStatus, 30000);
});