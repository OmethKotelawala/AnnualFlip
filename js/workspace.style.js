/**
 * FlipPage Workspace Studio Style Controller (js/workspace.style.js)
 * Manages sidebar tabs, theme preset selection, color customization,
 * real-time FlipBook preview synchronization, and UI controls.
 */

export const NAV_MAP = {
  'nav-tab-preview': 'panel-preview',
  'nav-tab-import': 'panel-import',
  'nav-tab-design': 'panel-design',
  'nav-tab-themes': 'panel-themes',
  'nav-tab-navigate': 'panel-navigate',
  'nav-tab-logo': 'panel-logo',
  'nav-tab-profile': 'panel-profile',
  'nav-tab-share-social': 'panel-share-social',
  'nav-tab-settings': 'panel-settings',
  'nav-tab-teams': 'panel-teams'
};

export const PANEL_TITLES = {
  'panel-preview': 'Live Preview',
  'panel-import': 'Import PDF URL',
  'panel-design': 'Design Customization',
  'panel-themes': 'Theme Palettes',
  'panel-navigate': 'Navigation Controls',
  'panel-logo': 'Logo & Branding',
  'panel-profile': 'User Profile',
  'panel-share-social': 'Share & Embed',
  'panel-settings': 'Settings',
  'panel-teams': 'Teams & Members'
};

export const THEMES = [
  { id: 'minimal', name: 'Clean Studio', bg: 'linear-gradient(135deg, #F8FAFC, #E2E8F0)', emoji: '⬜', color: '#2563EB', type: 'light' },
  { id: 'dark', name: 'Dark Pro', bg: 'linear-gradient(135deg, #0F172A, #1E3A5F)', emoji: '🌙', color: '#3B82F6', type: 'dark' },
  { id: 'ocean', name: 'Ocean Blue', bg: 'linear-gradient(135deg, #0C4A6E, #0EA5E9)', emoji: '🌊', color: '#0284C7', type: 'ocean' },
  { id: 'forest', name: 'Forest', bg: 'linear-gradient(135deg, #14532D, #16A34A)', emoji: '🌿', color: '#16A34A', type: 'forest' },
  { id: 'sunset', name: 'Sunset', bg: 'linear-gradient(135deg, #7C2D12, #F97316)', emoji: '🌅', color: '#EA580C', type: 'sunset' },
  { id: 'purple', name: 'Purple Haze', bg: 'linear-gradient(135deg, #4C1D95, #8B5CF6)', emoji: '💜', color: '#7C3AED', type: 'purple' },
  { id: 'midnight', name: 'Midnight', bg: 'linear-gradient(135deg, #1C1917, #44403C)', emoji: '🌃', color: '#F59E0B', type: 'midnight' },
  { id: 'coral', name: 'Coral', bg: 'linear-gradient(135deg, #831843, #EC4899)', emoji: '🌸', color: '#DB2777', type: 'coral' },
  { id: 'gold', name: 'Gold Crown', bg: 'linear-gradient(135deg, #78350F, #F59E0B)', emoji: '👑', color: '#D97706', type: 'gold' },
];

export function switchTab(navId) {
  document.querySelectorAll('.sidebar-item-link').forEach(b => {
    b.classList.remove('is-active');
    b.setAttribute('aria-selected', 'false');
  });

  const activeBtn = document.getElementById(navId);
  if (activeBtn) {
    activeBtn.classList.add('is-active');
    activeBtn.setAttribute('aria-selected', 'true');
  }

  const panelId = NAV_MAP[navId];
  if (!panelId) return;

  // Show active tab in Left Pane
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.add('active');
  }

  // Update topbar breadcrumb title
  const titleEl = document.getElementById('current-view-title');
  if (titleEl) {
    titleEl.textContent = PANEL_TITLES[panelId] || 'Studio';
  }
}
window.switchTab = switchTab;

export function updateClock() {
  const el = document.getElementById('topbar-clock');
  if (!el) return;
  const now = new Date();
  const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  el.textContent = now.toLocaleDateString('en-US', options);
}

export function generateThemeColorString(accent = '#2563EB', bg = '#F8FAFC') {
  return `--ws-accent: ${accent}; --ws-accent-hover: #1D4ED8; --canvas-bg: ${bg}; --tb-bg: rgba(255, 255, 255, 0.95); --tb-fg: #475569; --page-bg: #FFFFFF;`;
}

export function updateThemeColorStringUI(accent = '#2563EB', bg = '#F8FAFC') {
  const box = document.getElementById('theme-colors-string-box');
  if (box) {
    const str = generateThemeColorString(accent, bg);
    box.textContent = str;
  }
}

// Helper to broadcast custom configuration to live reader iframe
export function broadcastCustomization() {
  const bgType = document.getElementById('design-bg-type')?.value || 'light';
  const bgColor = document.getElementById('design-bg-color')?.value || '#F8FAFC';
  const accentColor = document.getElementById('design-accent-color')?.value || '#2563EB';
  const soundEnabled = document.getElementById('design-sound-toggle')?.classList.contains('on') ?? true;
  const logoUrl = document.getElementById('design-logo-url')?.value || '';
  const brandName = document.getElementById('detail-book-title')?.value || '';

  const cfg = {
    bgType,
    bgColor,
    accentColor,
    soundEnabled,
    logoUrl,
    brandName,
    themeColors: generateThemeColorString(accentColor, bgColor)
  };

  updateThemeColorStringUI(accentColor, bgColor);

  try {
    localStorage.setItem('fp_global_custom', JSON.stringify(cfg));
  } catch (_) {}

  const iframe = document.getElementById('preview-reader-frame');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({ type: 'APPLY_CUSTOMIZATION', config: cfg }, '*');
  }

  // Also notify workspace.js if needed
  window.dispatchEvent(new CustomEvent('workspace:theme-changed', { detail: cfg }));
}

export function initStudioControls() {
  // 1. Clock
  updateClock();
  setInterval(updateClock, 30000);

  // 2. Sidebar tab click handlers
  Object.keys(NAV_MAP).forEach(navId => {
    const btn = document.getElementById(navId);
    if (btn) btn.addEventListener('click', () => switchTab(navId));
  });

  // 3. Theme Presets Grid
  const themesGrid = document.getElementById('themes-grid');
  if (themesGrid && themesGrid.children.length === 0) {
    THEMES.forEach((t, i) => {
      const card = document.createElement('div');
      card.className = `theme-card ${i === 0 ? 'selected' : ''}`;
      card.innerHTML = `<div class="theme-preview" style="background:${t.bg};">${t.emoji}</div><div class="theme-label">${t.name}</div>`;
      card.addEventListener('click', () => {
        themesGrid.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        // Update live preview iframe background/theme
        const iframe = document.getElementById('preview-reader-frame');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'CHANGE_THEME', theme: t.type, color: t.color }, '*');
        }
        if (window.showToast) window.showToast(`✨ Applied theme "${t.name}" to FlipBook!`);
      });
      themesGrid.appendChild(card);
    });
  }

  // 4. Design Customizer live apply
  const btnApplyDesign = document.getElementById('btn-apply-design-full');
  if (btnApplyDesign) {
    btnApplyDesign.addEventListener('click', () => {
      broadcastCustomization();
      if (window.showToast) window.showToast('✨ All customizations applied to live FlipBook reader!');
    });
  }

  // 5. Color picker input synchronization & live broadcast
  function syncColorPicker(colorInputId, hexInputId) {
    const colorInput = document.getElementById(colorInputId);
    const hexInput = document.getElementById(hexInputId);
    if (!colorInput || !hexInput) return;
    
    colorInput.addEventListener('input', () => {
      hexInput.value = colorInput.value;
      broadcastCustomization();
    });
    hexInput.addEventListener('input', () => {
      if (/^#[0-9A-F]{6}$/i.test(hexInput.value)) {
        colorInput.value = hexInput.value;
        broadcastCustomization();
      }
    });
  }
  syncColorPicker('design-bg-color', 'design-bg-color-hex');
  syncColorPicker('design-accent-color', 'design-accent-color-hex');

  const designBgType = document.getElementById('design-bg-type');
  if (designBgType) {
    designBgType.addEventListener('change', () => {
      broadcastCustomization();
    });
  }

  const designLogoUrl = document.getElementById('design-logo-url');
  if (designLogoUrl) {
    designLogoUrl.addEventListener('input', () => {
      broadcastCustomization();
    });
  }

  const detailTitle = document.getElementById('detail-book-title');
  if (detailTitle) {
    detailTitle.addEventListener('input', () => {
      broadcastCustomization();
    });
  }

  // 6. Toggle switch clicks with instant customization broadcast
  document.querySelectorAll('.toggle-switch').forEach(sw => {
    sw.addEventListener('click', () => {
      sw.classList.toggle('on');
      broadcastCustomization();
    });
  });

  // 7. Modals
  const uploadModal = document.getElementById('upload-modal');
  const btnOpenCreate = document.getElementById('btn-open-create-modal');
  const btnCloseCreate = document.getElementById('close-modal-btn');
  const btnCancelCreate = document.getElementById('btn-cancel-create');

  if (btnOpenCreate && uploadModal) {
    btnOpenCreate.addEventListener('click', () => uploadModal.hidden = false);
  }
  [btnCloseCreate, btnCancelCreate].forEach(b => b?.addEventListener('click', () => {
    if (uploadModal) uploadModal.hidden = true;
  }));

  const proModal = document.getElementById('pro-modal');
  const btnClosePro = document.getElementById('close-pro-modal-btn');
  const btnClosePro2 = document.getElementById('btn-close-pro-modal');

  [btnClosePro, btnClosePro2].forEach(b => b?.addEventListener('click', () => {
    if (proModal) proModal.hidden = true;
  }));
}

// Auto-initialize when loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStudioControls);
} else {
  initStudioControls();
}
