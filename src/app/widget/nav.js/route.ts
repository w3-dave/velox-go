import { NextResponse } from "next/server";

const widgetScript = `
(function() {
  'use strict';

  const VELOX_GO_URL = '${process.env.NEXTAUTH_URL || "https://velox-go-q6j3v.ondigitalocean.app"}';
  const THEME_KEY = 'velox-theme';
  const USER_KEY = 'velox-user';

  // Widget configuration
  const config = {
    position: document.currentScript?.getAttribute('data-position') || 'left',
    collapsed: document.currentScript?.getAttribute('data-collapsed') === 'true',
  };

  // Theme management
  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    updateThemeIcon();
  }

  function toggleTheme() {
    const currentTheme = getTheme();
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  function updateThemeIcon() {
    const themeBtn = document.getElementById('velox-nav-theme');
    if (themeBtn) {
      const isDark = getTheme() === 'dark';
      themeBtn.innerHTML = isDark
        ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 8 1zm0 11a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5zm7-4a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1 0-1h1a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1 0-1h1A.5.5 0 0 1 3 8zm9.354-3.354a.5.5 0 0 1 0 .708l-.708.707a.5.5 0 1 1-.707-.707l.707-.708a.5.5 0 0 1 .708 0zM5.06 11.06a.5.5 0 0 1 0 .708l-.707.707a.5.5 0 1 1-.708-.707l.708-.708a.5.5 0 0 1 .707 0zm7.88.708a.5.5 0 0 1-.708 0l-.707-.708a.5.5 0 0 1 .707-.707l.708.707a.5.5 0 0 1 0 .708zM5.06 4.94a.5.5 0 0 1-.708 0l-.707-.708a.5.5 0 1 1 .708-.707l.707.708a.5.5 0 0 1 0 .707zM8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>';
      themeBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }

  // Initialize theme
  const initialTheme = getTheme();
  document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  document.documentElement.classList.toggle('light', initialTheme === 'light');

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
      background: var(--velox-widget-bg, #1a1a1a);
      border: 1px solid var(--velox-widget-border, #333);
      border-radius: \${config.position === 'left' ? '0 8px 8px 0' : '8px 0 0 8px'};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--velox-widget-muted, #888);
      transition: all 0.2s;
    }

    .velox-nav-toggle:hover {
      background: var(--velox-widget-hover, #252525);
      color: var(--velox-widget-text, #fff);
    }

    .velox-nav-sidebar {
      height: 100%;
      width: 64px;
      background: var(--velox-widget-sidebar, #0a0a0a);
      border-\${config.position === 'left' ? 'right' : 'left'}: 1px solid var(--velox-widget-border, #222);
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
      background: var(--velox-widget-border, #333);
      margin: 8px 0;
    }

    .velox-nav-user {
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid var(--velox-widget-border, #222);
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
      text-decoration: none;
    }

    .velox-nav-avatar:hover {
      background: #3b82f630;
    }

    .velox-nav-icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: transparent;
      border: none;
      color: var(--velox-widget-muted, #888);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }

    .velox-nav-icon-btn:hover {
      background: var(--velox-widget-hover, #252525);
      color: var(--velox-widget-text, #fff);
    }

    .velox-nav-icon-btn.signout:hover {
      background: #ef444420;
      color: #ef4444;
    }

    .velox-nav-login {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: #3b82f620;
      border: none;
      color: #3b82f6;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }

    .velox-nav-login:hover {
      background: #3b82f630;
      transform: scale(1.05);
    }

    .velox-nav-username {
      font-size: 10px;
      color: var(--velox-widget-muted, #888);
      max-width: 56px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;
      margin-top: -4px;
    }

    .velox-nav-tooltip {
      position: absolute;
      \${config.position === 'left' ? 'left' : 'right'}: calc(100% + 12px);
      top: 50%;
      transform: translateY(-50%);
      background: var(--velox-widget-bg, #1a1a1a);
      border: 1px solid var(--velox-widget-border, #333);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      color: var(--velox-widget-text, #fff);
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }

    .velox-nav-app:hover .velox-nav-tooltip {
      opacity: 1;
    }

    /* Light theme widget variables */
    :root.light {
      --velox-widget-sidebar: #f5f5f5;
      --velox-widget-bg: #ffffff;
      --velox-widget-border: #e0e0e0;
      --velox-widget-hover: #f0f0f0;
      --velox-widget-text: #1a1a1a;
      --velox-widget-muted: #666;
    }

    /* Dark theme widget variables */
    :root.dark, :root:not(.light) {
      --velox-widget-sidebar: #0a0a0a;
      --velox-widget-bg: #1a1a1a;
      --velox-widget-border: #333;
      --velox-widget-hover: #252525;
      --velox-widget-text: #fff;
      --velox-widget-muted: #888;
    }
  \`;
  document.head.appendChild(styles);

  // Create widget container
  const widget = document.createElement('div');
  widget.className = 'velox-nav-widget';
  widget.innerHTML = \`
    <div class="velox-nav-sidebar \${config.collapsed ? 'collapsed' : ''}">
      <a href="\${VELOX_GO_URL}/dashboard" class="velox-nav-logo" title="Velox Labs">
        <svg viewBox="0 0 32 32" width="32" height="32">
          <rect width="32" height="32" rx="6" fill="var(--velox-widget-sidebar, #0a0a0a)"/>
          <path d="M8 8 L16 24 L24 8" stroke="#3b82f6" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
      <div class="velox-nav-apps" id="velox-nav-apps">
        <a href="https://velox-nota-c5iy9.ondigitalocean.app" class="velox-nav-app" style="background: #f59e0b20" title="Velox Nota">
          📝
          <span class="velox-nav-tooltip">Velox Nota</span>
        </a>
        <a href="#" class="velox-nav-app locked" style="background: #3b82f620" title="Velox Contacts">
          👥
          <span class="velox-nav-tooltip">Velox Contacts</span>
        </a>
        <a href="#" class="velox-nav-app locked" style="background: #10b98120" title="Velox Inventory">
          📦
          <span class="velox-nav-tooltip">Velox Inventory</span>
        </a>
        <a href="#" class="velox-nav-app locked" style="background: #8b5cf620" title="Velox Projects">
          🎯
          <span class="velox-nav-tooltip">Velox Projects</span>
        </a>
      </div>
      <div class="velox-nav-user" id="velox-nav-user">
        <a href="\${VELOX_GO_URL}/login" class="velox-nav-login" title="Sign in">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
        </a>
        <span class="velox-nav-username">Sign in</span>
        <button id="velox-nav-theme" class="velox-nav-icon-btn" title="Toggle theme">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 8 1zm0 11a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5zm7-4a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1 0-1h1a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1 0-1h1A.5.5 0 0 1 3 8zm9.354-3.354a.5.5 0 0 1 0 .708l-.708.707a.5.5 0 1 1-.707-.707l.707-.708a.5.5 0 0 1 .708 0zM5.06 11.06a.5.5 0 0 1 0 .708l-.707.707a.5.5 0 1 1-.708-.707l.708-.708a.5.5 0 0 1 .707 0zm7.88.708a.5.5 0 0 1-.708 0l-.707-.708a.5.5 0 0 1 .707-.707l.708.707a.5.5 0 0 1 0 .708zM5.06 4.94a.5.5 0 0 1-.708 0l-.707-.708a.5.5 0 1 1 .708-.707l.707.708a.5.5 0 0 1 0 .707zM8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
          </svg>
        </button>
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

  // Theme toggle
  const themeBtn = widget.querySelector('#velox-nav-theme');
  themeBtn.addEventListener('click', toggleTheme);
  updateThemeIcon();

  // User cache helpers
  function getCachedUser() {
    try {
      const cached = localStorage.getItem(USER_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is still valid (24 hours)
        if (data.cachedAt && Date.now() - data.cachedAt < 24 * 60 * 60 * 1000) {
          return data.user;
        }
      }
    } catch (e) {}
    return null;
  }

  function setCachedUser(user) {
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify({ user, cachedAt: Date.now() }));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch (e) {}
  }

  // Fetch nav data
  async function loadNavData() {
    try {
      const res = await fetch(\`\${VELOX_GO_URL}/api/nav\`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Not authenticated - check cache for cross-domain case
          const cachedUser = getCachedUser();
          if (cachedUser) {
            renderNav({ apps: [], user: cachedUser, subscriptions: [] });
          }
          return;
        }
        throw new Error('Failed to load nav data');
      }

      const data = await res.json();

      // Cache user data for cross-domain access
      if (data.user) {
        setCachedUser(data.user);
      }

      // If API returns no user but we have cache, use cache (cross-domain case)
      if (!data.user) {
        const cachedUser = getCachedUser();
        if (cachedUser) {
          data.user = cachedUser;
        }
      }

      renderNav(data);
    } catch (error) {
      console.error('[Velox Nav]', error);
      // Try to render with cached data on error
      const cachedUser = getCachedUser();
      if (cachedUser) {
        renderNav({ apps: [], user: cachedUser, subscriptions: [] });
      }
    }
  }

  function renderNav(data) {
    const appsContainer = document.getElementById('velox-nav-apps');
    const userContainer = document.getElementById('velox-nav-user');

    // Render apps (only if we have data, otherwise keep defaults)
    if (data.apps && data.apps.length > 0) {
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

    // Render user section
    if (data.user) {
      const initial = (data.user.name?.[0] || data.user.email[0]).toUpperCase();
      const displayName = data.user.name || data.user.email.split('@')[0];
      userContainer.innerHTML = \`
        <a href="\${VELOX_GO_URL}/account" class="velox-nav-avatar" title="\${data.user.name || data.user.email}">
          \${initial}
        </a>
        <span class="velox-nav-username" title="\${data.user.name || data.user.email}">\${displayName}</span>
        <a href="\${VELOX_GO_URL}/dashboard" class="velox-nav-icon-btn" title="Dashboard">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </a>
        <button id="velox-nav-theme" class="velox-nav-icon-btn" title="Toggle theme">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 8 1z"/>
          </svg>
        </button>
        <button id="velox-nav-signout" class="velox-nav-icon-btn signout" title="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      \`;
      // Re-attach theme toggle handler
      const newThemeBtn = document.getElementById('velox-nav-theme');
      newThemeBtn.addEventListener('click', toggleTheme);
      updateThemeIcon();

      // Sign out handler
      const signoutBtn = document.getElementById('velox-nav-signout');
      signoutBtn.addEventListener('click', () => {
        setCachedUser(null); // Clear user cache
        window.location.href = \`\${VELOX_GO_URL}/signout?callbackUrl=\${encodeURIComponent(window.location.href)}\`;
      });
    } else {
      // Not logged in - show login button
      userContainer.innerHTML = \`
        <a href="\${VELOX_GO_URL}/login?callbackUrl=\${encodeURIComponent(window.location.href)}" class="velox-nav-login" title="Sign in">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
        </a>
        <span class="velox-nav-username">Sign in</span>
        <button id="velox-nav-theme" class="velox-nav-icon-btn" title="Toggle theme">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 8 1z"/>
          </svg>
        </button>
      \`;
      // Re-attach theme toggle handler
      const newThemeBtn = document.getElementById('velox-nav-theme');
      newThemeBtn.addEventListener('click', toggleTheme);
      updateThemeIcon();
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
