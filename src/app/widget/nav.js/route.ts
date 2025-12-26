import { NextResponse } from "next/server";

const widgetScript = `
(function() {
  'use strict';

  const VELOX_GO_URL = '${process.env.NEXTAUTH_URL || "https://go.veloxlabs.app"}';

  // Widget configuration
  const config = {
    position: document.currentScript?.getAttribute('data-position') || 'left',
    collapsed: document.currentScript?.getAttribute('data-collapsed') === 'true',
  };

  // Inject styles
  const styles = document.createElement('style');
  styles.textContent = \`
    .velox-nav-widget {
      position: fixed;
      top: 0;
      \${config.position}: 0;
      height: 100vh;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .velox-nav-toggle {
      position: absolute;
      top: 50%;
      \${config.position === 'left' ? 'right' : 'left'}: -12px;
      transform: translateY(-50%);
      width: 24px;
      height: 48px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: \${config.position === 'left' ? '0 8px 8px 0' : '8px 0 0 8px'};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #888;
      transition: all 0.2s;
    }

    .velox-nav-toggle:hover {
      background: #252525;
      color: #fff;
    }

    .velox-nav-sidebar {
      height: 100%;
      width: 64px;
      background: #0a0a0a;
      border-\${config.position === 'left' ? 'right' : 'left'}: 1px solid #222;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 0;
      transition: transform 0.2s, opacity 0.2s;
    }

    .velox-nav-sidebar.collapsed {
      transform: translateX(\${config.position === 'left' ? '-100%' : '100%'});
      opacity: 0;
      pointer-events: none;
    }

    .velox-nav-logo {
      width: 40px;
      height: 40px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .velox-nav-apps {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      padding: 0 12px;
    }

    .velox-nav-app {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      position: relative;
    }

    .velox-nav-app:hover {
      transform: scale(1.1);
    }

    .velox-nav-app.active {
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .velox-nav-app.locked {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .velox-nav-app.locked::after {
      content: '🔒';
      position: absolute;
      bottom: -4px;
      right: -4px;
      font-size: 10px;
    }

    .velox-nav-divider {
      width: 32px;
      height: 1px;
      background: #333;
      margin: 8px 0;
    }

    .velox-nav-user {
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid #222;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .velox-nav-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #3b82f620;
      color: #3b82f6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .velox-nav-avatar:hover {
      background: #3b82f630;
    }

    .velox-nav-settings {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: transparent;
      color: #888;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .velox-nav-settings:hover {
      background: #252525;
      color: #fff;
    }

    .velox-nav-tooltip {
      position: absolute;
      \${config.position === 'left' ? 'left' : 'right'}: calc(100% + 12px);
      top: 50%;
      transform: translateY(-50%);
      background: #1a1a1a;
      border: 1px solid #333;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      color: #fff;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }

    .velox-nav-app:hover .velox-nav-tooltip {
      opacity: 1;
    }
  \`;
  document.head.appendChild(styles);

  // Create widget container
  const widget = document.createElement('div');
  widget.className = 'velox-nav-widget';
  widget.innerHTML = \`
    <div class="velox-nav-sidebar \${config.collapsed ? 'collapsed' : ''}">
      <a href="\${VELOX_GO_URL}/dashboard" class="velox-nav-logo" title="Velox Go">
        <svg viewBox="0 0 32 32" width="32" height="32">
          <rect width="32" height="32" rx="6" fill="#0a0a0a"/>
          <path d="M8 8 L16 24 L24 8" stroke="#3b82f6" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
      <div class="velox-nav-apps" id="velox-nav-apps">
        <!-- Apps loaded dynamically -->
      </div>
      <div class="velox-nav-user" id="velox-nav-user">
        <a href="\${VELOX_GO_URL}/login" class="velox-nav-avatar" title="Sign in">?</a>
      </div>
    </div>
    <button class="velox-nav-toggle" id="velox-nav-toggle">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <path d="\${config.position === 'left' ? 'M8 2 L4 6 L8 10' : 'M4 2 L8 6 L4 10'}" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>
    </button>
  \`;
  document.body.appendChild(widget);

  // Toggle sidebar
  let isCollapsed = config.collapsed;
  const sidebar = widget.querySelector('.velox-nav-sidebar');
  const toggleBtn = widget.querySelector('#velox-nav-toggle');

  toggleBtn.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    sidebar.classList.toggle('collapsed', isCollapsed);
    toggleBtn.querySelector('svg path').setAttribute('d',
      isCollapsed
        ? (config.position === 'left' ? 'M4 2 L8 6 L4 10' : 'M8 2 L4 6 L8 10')
        : (config.position === 'left' ? 'M8 2 L4 6 L8 10' : 'M4 2 L8 6 L4 10')
    );
  });

  // Fetch nav data
  async function loadNavData() {
    try {
      const res = await fetch(\`\${VELOX_GO_URL}/api/nav\`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Not authenticated - show login prompt
          return;
        }
        throw new Error('Failed to load nav data');
      }

      const data = await res.json();
      renderNav(data);
    } catch (error) {
      console.error('[Velox Nav]', error);
    }
  }

  function renderNav(data) {
    const appsContainer = document.getElementById('velox-nav-apps');
    const userContainer = document.getElementById('velox-nav-user');

    // Render apps
    if (data.apps) {
      const currentHost = window.location.hostname;

      appsContainer.innerHTML = data.apps.map(app => {
        const isActive = currentHost.includes(app.slug);
        const isSubscribed = data.subscriptions?.includes(app.slug);
        const isLocked = !isSubscribed && app.status === 'available';

        return \`
          <a href="\${isLocked ? VELOX_GO_URL + '/billing/checkout/' + app.slug : app.url}"
             class="velox-nav-app \${isActive ? 'active' : ''} \${isLocked ? 'locked' : ''}"
             style="background: \${app.color}20"
             title="\${app.name}">
            \${app.icon}
            <span class="velox-nav-tooltip">\${app.name}</span>
          </a>
        \`;
      }).join('');
    }

    // Render user
    if (data.user) {
      const initial = (data.user.name?.[0] || data.user.email[0]).toUpperCase();
      userContainer.innerHTML = \`
        <a href="\${VELOX_GO_URL}/account" class="velox-nav-avatar" title="\${data.user.name || data.user.email}">
          \${initial}
        </a>
        <a href="\${VELOX_GO_URL}/dashboard" class="velox-nav-settings" title="Dashboard">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </a>
      \`;
    }
  }

  // Load data on init
  loadNavData();

  // Listen for auth changes via postMessage
  window.addEventListener('message', (event) => {
    if (event.origin !== VELOX_GO_URL) return;
    if (event.data?.type === 'velox:auth-change') {
      loadNavData();
    }
  });
})();
`;

export async function GET() {
  return new NextResponse(widgetScript, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
