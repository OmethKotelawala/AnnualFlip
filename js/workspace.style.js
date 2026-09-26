// ==========================================================================
// WORKSPACE STYLE CONTROLLER - FlipPage
// Handles left-side sidebar tab navigation, custom SVG icon states & view routing
// ==========================================================================

export function initWorkspaceSidebarTabs() {
  const sidebarLinks = document.querySelectorAll('.sidebar-item-link');
  const viewTitle = document.getElementById('current-view-title');
  const pubGridSection = document.getElementById('pub-grid');

  const tabConfig = {
    'nav-tab-preview': { title: 'Digital Flipbooks Preview', toast: 'Switched to Flipbook Preview & Workspace' },
    'nav-tab-design': { title: 'Design & Visual Styling', toast: 'Opening Design & Layout customizer' },
    'nav-tab-themes': { title: 'Themes & Color Palettes', toast: 'Theme selector active' },
    'nav-tab-navigate': { title: 'Navigation & Spread Controls', toast: 'Navigation toolbar & page curl settings' },
    'nav-tab-logo': { title: 'Branding & Logo Configuration', toast: 'Custom Logo & Watermark settings' },
    'nav-tab-profile': { title: 'Account & Workspace Profile', toast: 'Managing Workspace Profile' },
    'nav-tab-share-social': { title: 'Social Sharing & Embeds', toast: 'Social distribution & iFrame embed generator' },
    'nav-tab-settings': { title: 'Workspace Settings', toast: 'Workspace preferences & security' },
    'nav-tab-teams': { title: 'Team Collaboration & Members', toast: 'Team access & permissions' }
  };

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.id;
      if (!targetId || !tabConfig[targetId]) return;

      // Update active styling
      sidebarLinks.forEach(l => l.classList.remove('is-active'));
      link.classList.add('is-active');

      const config = tabConfig[targetId];
      if (viewTitle) {
        viewTitle.textContent = config.title;
      }

      // Action triggers for specific tabs
      if (targetId === 'nav-tab-share-social') {
        const shareModal = document.getElementById('share-modal');
        if (shareModal) shareModal.hidden = false;
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
