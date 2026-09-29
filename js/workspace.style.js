// ==========================================================================
// WORKSPACE STYLE CONTROLLER - FlipPage
// Handles left-side sidebar tab navigation, custom SVG icon states & view routing
// ==========================================================================

export function initWorkspaceSidebarTabs() {
  const sidebarLinks = document.querySelectorAll('.sidebar-item-link');
  const viewTitle = document.getElementById('current-view-title');

  const tabConfig = {
    'nav-tab-preview': { title: 'Digital Flipbooks Preview', toast: 'Switched to Flipbook Preview', viewId: 'tab-view-pubs' },
    'nav-tab-design': { title: 'Design & Visual Styling', toast: 'Opening Design & Layout Customizer', viewId: 'tab-view-design' },
    'nav-tab-themes': { title: 'Themes & Color Palettes', toast: 'Theme selector active', viewId: 'tab-view-themes' },
    'nav-tab-navigate': { title: 'Navigation & Spread Controls', toast: 'Navigation toolbar & page curl settings', viewId: 'tab-view-navigate' },
    'nav-tab-logo': { title: 'Branding & Logo Configuration', toast: 'Custom Logo & Watermark settings', viewId: 'tab-view-logo' },
    'nav-tab-profile': { title: 'Account & Workspace Profile', toast: 'Managing Workspace Profile', viewId: 'tab-view-profile' },
    'nav-tab-share-social': { title: 'Social Sharing & Embeds', toast: 'Opening Share & Social distribution', modalId: 'share-modal' },
    'nav-tab-settings': { title: 'Workspace Settings', toast: 'Workspace Preferences & Configuration', viewId: 'tab-view-settings' },
    'nav-tab-teams': { title: 'Team Collaboration & Members', toast: 'Team access & permissions', viewId: 'tab-view-users' }
  };

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.id;
      if (!targetId || !tabConfig[targetId]) return;

      // Update active styling
      sidebarLinks.forEach(l => l.classList.remove('is-active'));
      link.classList.add('is-active');

      const config = tabConfig[targetId];
      if (viewTitle && config.title) {
        viewTitle.textContent = config.title;
      }

      // Switch views if viewId is specified
      if (config.viewId) {
        const allViews = [
          'tab-view-pubs',
          'tab-view-design',
          'tab-view-themes',
          'tab-view-navigate',
          'tab-view-logo',
          'tab-view-profile',
          'tab-view-collections',
          'tab-view-users',
          'tab-view-reported',
          'tab-view-calls',
          'tab-view-activity',
          'tab-view-usage',
          'tab-view-settings',
          'tab-view-lab',
          'tab-view-templates',
          'tab-view-analytics'
        ];
        allViews.forEach(vId => {
          const v = document.getElementById(vId);
          if (v) v.style.display = (vId === config.viewId) ? 'block' : 'none';
        });
      }

      // Open modal if modalId is specified
      if (config.modalId) {
        const modal = document.getElementById(config.modalId);
        if (modal) modal.hidden = false;
      }

      // Show toast confirmation
      const toast = document.getElementById('ws-toast');
      const toastMsg = document.getElementById('ws-toast-msg');
      if (toast && toastMsg && config.toast) {
        toastMsg.textContent = config.toast;
        toast.style.display = 'flex';
        setTimeout(() => { toast.style.display = 'none'; }, 2200);
      }
    });
  });
}

// Auto bootstrap when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWorkspaceSidebarTabs);
} else {
  initWorkspaceSidebarTabs();
}
