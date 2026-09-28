/**
 * FlipPage Workspace Style Controller (js/workspace.style.js)
 * Handles sidebar tab navigation, view switching, theme palettes,
 * UI toggle controls, modal state, and floating assistant drawer.
 */

export const NAV_MAP = {
  'nav-tab-preview': 'panel-preview',
  'nav-tab-pubs': 'panel-pubs',
  'nav-tab-import': 'panel-import',
  'nav-tab-design': 'panel-design',
  'nav-tab-themes': 'panel-themes',
  'nav-tab-navigate': 'panel-navigate',
  'nav-tab-logo': 'panel-logo',
  'nav-tab-profile': 'panel-profile',
  'nav-tab-share-social': 'panel-share-social',
  'nav-tab-analytics': 'panel-analytics',
  'nav-tab-settings': 'panel-settings',
  'nav-tab-teams': 'panel-teams'
};

export const PANEL_TITLES = {
  'panel-preview': 'Live Preview',
  'panel-pubs': 'My Flipbooks',
  'panel-import': 'Import PDF URL',
  'panel-design': 'Design Customization',
  'panel-themes': 'Theme Palettes',
  'panel-navigate': 'Navigation Controls',
  'panel-logo': 'Logo & Branding',
  'panel-profile': 'Author Profile',
  'panel-share-social': 'Share & Embed',
  'panel-analytics': 'Reader Analytics',
  'panel-settings': 'Settings',
  'panel-teams': 'Teams & Members'
};

export const THEMES = [
  { id: 'dark', name: 'Dark Pro', bg: 'linear-gradient(135deg, #0F172A, #1E3A5F)', emoji: '🌙' },
  { id: 'ocean', name: 'Ocean Blue', bg: 'linear-gradient(135deg, #0C4A6E, #0EA5E9)', emoji: '🌊' },
  { id: 'forest', name: 'Forest', bg: 'linear-gradient(135deg, #14532D, #16A34A)', emoji: '🌿' },
  { id: 'sunset', name: 'Sunset', bg: 'linear-gradient(135deg, #7C2D12, #F97316)', emoji: '🌅' },
  { id: 'purple', name: 'Purple Haze', bg: 'linear-gradient(135deg, #4C1D95, #8B5CF6)', emoji: '💜' },
  { id: 'minimal', name: 'Minimal', bg: 'linear-gradient(135deg, #F1F5F9, #E2E8F0)', emoji: '⬜' },
  { id: 'midnight', name: 'Midnight', bg: 'linear-gradient(135deg, #1C1917, #44403C)', emoji: '🌃' },
  { id: 'coral', name: 'Coral', bg: 'linear-gradient(135deg, #831843, #EC4899)', emoji: '🌸' },
  { id: 'gold', name: 'Gold Crown', bg: 'linear-gradient(135deg, #78350F, #F59E0B)', emoji: '👑' },
];

export function switchTab(navId) {
  // Update sidebar active state
  document.querySelectorAll('.sidebar-item-link').forEach(b => {
    b.classList.remove('is-active');
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });

  const activeBtn = document.getElementById(navId);
  if (activeBtn) {
    activeBtn.classList.add('is-active');
    activeBtn.classList.add('active');
    activeBtn.setAttribute('aria-selected', 'true');
  }

  const panelId = NAV_MAP[navId];
  if (!panelId) return;

  // Show correct panel
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.add('active');
  }

  // Update title
  const titleEl = document.getElementById('current-view-title');
  if (titleEl) titleEl.textContent = PANEL_TITLES[panelId] || 'Workspace';
}
window.switchTab = switchTab;

export function updateClock() {
  const el = document.getElementById('topbar-clock');
  if (!el) return;
  const now = new Date();
  el.innerHTML = `${now.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'})} <strong>${now.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</strong>`;
}

export function initWorkspaceStyleControls() {
  // 1. Clock
  updateClock();
  setInterval(updateClock, 30000);
  const aiBubbleTime = document.getElementById('ai-bubble-time');
  if (aiBubbleTime) aiBubbleTime.textContent = new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});

  // 2. Tab switcher clicks
  Object.keys(NAV_MAP).forEach(navId => {
    const btn = document.getElementById(navId);
    if (btn) btn.addEventListener('click', () => switchTab(navId));
  });

  const gotoBtn = document.getElementById('btn-goto-pubs-from-preview');
  if (gotoBtn) gotoBtn.addEventListener('click', () => switchTab('nav-tab-pubs'));

  // 3. View toggle (Grid vs List)
  const viewGridBtn = document.getElementById('view-grid-btn');
  const viewListBtn = document.getElementById('view-list-btn');
  const pubGrid = document.getElementById('publications-grid-container');

  if (viewGridBtn && viewListBtn && pubGrid) {
    viewGridBtn.addEventListener('click', () => {
      pubGrid.classList.remove('list-view');
      viewGridBtn.classList.add('active');
      viewListBtn.classList.remove('active');
    });
    viewListBtn.addEventListener('click', () => {
      pubGrid.classList.add('list-view');
      viewListBtn.classList.add('active');
      viewGridBtn.classList.remove('active');
    });
  }

  // 4. Sidebar user popup
  const sidebarCard = document.getElementById('sidebar-user-card');
  const switchPopup = document.getElementById('switch-accounts-popup');
  if (sidebarCard && switchPopup) {
    sidebarCard.addEventListener('click', (e) => {
      e.stopPropagation();
      switchPopup.hidden = !switchPopup.hidden;
    });
    document.addEventListener('click', () => { if (switchPopup) switchPopup.hidden = true; });
  }

  // 5. Pro plan upgrade modals
  const closeProBtn = document.getElementById('close-pro-modal-btn');
  const closeProBtn2 = document.getElementById('btn-close-pro-modal');
  const proModal = document.getElementById('pro-modal');
  [closeProBtn, closeProBtn2].forEach(b => b?.addEventListener('click', () => { if (proModal) proModal.hidden = true; }));
  
  const navBtnUpgrade = document.getElementById('nav-btn-upgrade-plan');
  if (navBtnUpgrade) navBtnUpgrade.addEventListener('click', () => { if (proModal) proModal.hidden = false; });
  
  const btnActivatePro = document.getElementById('btn-activate-pro-workspace');
  if (btnActivatePro) {
    btnActivatePro.addEventListener('click', () => {
      if (window.showToast) window.showToast('Redirecting to Pro plan checkout...');
      setTimeout(() => window.open('pricing.html', '_blank'), 800);
    });
  }

  // 6. Floating AI drawer
  const aiLauncher = document.getElementById('btn-floating-ai-launcher');
  const aiDrawer = document.getElementById('floating-ai-drawer');
  const aiClose = document.getElementById('btn-close-floating-drawer');
  if (aiLauncher && aiDrawer) {
    aiLauncher.addEventListener('click', () => aiDrawer.classList.toggle('open'));
  }
  if (aiClose) aiClose.addEventListener('click', () => aiDrawer?.classList.remove('open'));

  // Quick pills AI responses
  const quickPills = document.querySelectorAll('.ai-question-pill');
  const chatStream = document.getElementById('floating-chat-stream');
  quickPills.forEach(pill => {
    pill.addEventListener('click', () => {
      if (!chatStream) return;
      const prompt = pill.dataset.prompt;
      const userBubble = document.createElement('div');
      userBubble.style.cssText = 'background:#2563EB; color:#fff; border-radius:12px 12px 2px 12px; padding:10px 14px; max-width:80%; align-self:flex-end; font-size:0.8rem; font-weight:600; margin-left:auto;';
      userBubble.textContent = prompt;
      chatStream.appendChild(userBubble);

      const responses = {
        'How do I import a PDF by URL?': 'Go to "Import URL" in the sidebar, paste your PDF URL and click "Create Flipbook". Supports Google Drive, Dropbox, OneDrive and any direct PDF link!',
        'How do I customize my flipbook theme?': 'Click "Design" in the sidebar to customize colors, fonts, and page turn effects. Click "Themes" for one-click premium presets!',
        'What is the Pro plan?': 'Pro gives you 4K vector zoom, custom branding, zero watermarks, analytics, password protection and team collaboration. Click "Upgrade to PRO" at the top!'
      };

      setTimeout(() => {
        const botBubble = document.createElement('div');
        botBubble.className = 'ai-bot-bubble';
        botBubble.textContent = responses[prompt] || 'I\'m here to help! Please check our help docs for more details.';
        chatStream.appendChild(botBubble);
        chatStream.scrollTop = chatStream.scrollHeight;
      }, 600);
      chatStream.scrollTop = chatStream.scrollHeight;
    });
  });

  // Chat form submit
  const chatForm = document.getElementById('floating-chat-form');
  const chatInput = document.getElementById('floating-chat-input');
  if (chatForm && chatInput && chatStream) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = chatInput.value.trim();
      if (!msg) return;

      const userBubble = document.createElement('div');
      userBubble.style.cssText = 'background:#2563EB; color:#fff; border-radius:12px 12px 2px 12px; padding:10px 14px; max-width:80%; align-self:flex-end; font-size:0.8rem; font-weight:600; margin-left:auto;';
      userBubble.textContent = msg;
      chatStream.appendChild(userBubble);
      chatInput.value = '';

      setTimeout(() => {
        const botBubble = document.createElement('div');
        botBubble.className = 'ai-bot-bubble';
        botBubble.textContent = '👋 Thanks for your question! Our FlipPage team will get back to you shortly. In the meantime, visit our Help Center for instant answers.';
        chatStream.appendChild(botBubble);
        chatStream.scrollTop = chatStream.scrollHeight;
      }, 800);
      chatStream.scrollTop = chatStream.scrollHeight;
    });
  }

  // 7. Themes Grid
  const themesGrid = document.getElementById('themes-grid');
  if (themesGrid && themesGrid.children.length === 0) {
    THEMES.forEach(t => {
      const card = document.createElement('div');
      card.className = 'theme-card';
      card.innerHTML = `<div class="theme-preview" style="background:${t.bg};">${t.emoji}</div><div class="theme-label">${t.name}</div>`;
      card.addEventListener('click', () => {
        themesGrid.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (window.showToast) window.showToast(`✨ Theme "${t.name}" applied to reader!`);
      });
      themesGrid.appendChild(card);
    });
  }

  // 8. Design Apply Full
  const btnApplyDesign = document.getElementById('btn-apply-design-full');
  if (btnApplyDesign) {
    btnApplyDesign.addEventListener('click', () => {
      if (window.showToast) window.showToast('✨ Design settings applied! Opening live preview...');
      setTimeout(() => switchTab('nav-tab-preview'), 600);
    });
  }

  // 9. Toggle switches
  document.querySelectorAll('.toggle-switch').forEach(sw => {
    sw.addEventListener('click', () => {
      sw.classList.toggle('on');
    });
  });

  // 10. Color Pickers Sync
  function syncColorPicker(colorInputId, hexInputId) {
    const colorInput = document.getElementById(colorInputId);
    const hexInput = document.getElementById(hexInputId);
    if (!colorInput || !hexInput) return;
    colorInput.addEventListener('input', () => { hexInput.value = colorInput.value; });
    hexInput.addEventListener('input', () => {
      if (/^#[0-9A-F]{6}$/i.test(hexInput.value)) colorInput.value = hexInput.value;
    });
  }
  syncColorPicker('design-bg-color', 'design-bg-color-hex');
  syncColorPicker('design-accent-color', 'design-accent-color-hex');
  syncColorPicker('design-text-color', 'design-text-color-hex');
}

// Auto-initialize when loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWorkspaceStyleControls);
} else {
  initWorkspaceStyleControls();
}
