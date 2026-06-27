import { Plugin, MarkdownView, Platform, WorkspaceLeaf } from 'obsidian';

export default class MobileTabBar extends Plugin {
  onload() {
    if (Platform.isMobile) this.setupTabBar();
  }

  private setupTabBar() {
    const bar = createEl('div', { cls: 'mtb-tab-bar' });
    const dot = createEl('span', { cls: 'mtb-save-dot' });
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;

    const cancelLongPress = () => {
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const getLeafPath = (leaf: WorkspaceLeaf): string | undefined => {
      return (leaf.view as any)?.file?.path || leaf.getViewState()?.state?.file;
    };

    const getLeafName = (leaf: WorkspaceLeaf): string | undefined => {
      const file = (leaf.view as any)?.file;
      if (file) return file.basename;
      const path = leaf.getViewState()?.state?.file as string | undefined;
      return path ? path.split('/').pop()?.replace(/\.md$/, '') : undefined;
    };

    const getLeaves = () => {
      const seen = new Set<string>();
      const leaves: WorkspaceLeaf[] = [];
      const root = this.app.workspace.rootSplit;
      this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
        if (root && leaf.getRoot() !== root) return;
        const path = getLeafPath(leaf);
        if (path && !seen.has(path)) {
          seen.add(path);
          leaves.push(leaf);
        }
      });
      return leaves;
    };

    // optional: reads autosave-control plugin's DOM class to show save state
    // dot hidden by default, only shown once autosave-control state is known
    const syncDot = () => {
      const icon = document.querySelector('.save-status-icon');
      if (icon) {
        const pending = icon.classList.contains('asc-pending');
        dot.classList.toggle('mtb-save-pending', pending);
        dot.classList.toggle('mtb-save-ok', !pending);
      }
    };

    const rebuild = () => {
      bar.empty();
      const active = this.app.workspace.getMostRecentLeaf();
      const leaves = getLeaves();

      for (const leaf of leaves) {
        const name = getLeafName(leaf);
        if (!name) continue;
        const tab = createEl('span', { cls: 'mtb-tab', text: name });
        if (leaf === active) {
          tab.addClass('mtb-tab-active');
          tab.appendChild(dot);
          syncDot();
        }

        tab.addEventListener('touchstart', () => {
          cancelLongPress();
          longPressTimer = setTimeout(() => {
            longPressTimer = null;
            leaf.detach();
            rebuild();
          }, 500);
        });
        tab.addEventListener('touchend', () => {
          if (longPressTimer !== null) {
            cancelLongPress();
            this.app.workspace.setActiveLeaf(leaf);
          }
        });
        tab.addEventListener('touchmove', cancelLongPress);

        bar.appendChild(tab);
      }

      const activeTab = bar.querySelector('.mtb-tab-active');
      if (activeTab) setTimeout(() => activeTab.scrollIntoView({ inline: 'center', block: 'nearest' }), 0);
    };

    const attachBar = () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) return;
      const container = view.containerEl;
      const titleContainer = container.querySelector('.view-header-title-container');
      if (titleContainer) {
        titleContainer.classList.add('mtb-hidden');
        const header = container.querySelector('.view-header');
        if (header && !header.contains(bar)) {
          if (bar.parentElement) bar.remove();
          const actions = header.querySelector('.view-actions');
          if (actions) header.insertBefore(bar, actions);
          else header.appendChild(bar);
        }
      }
    };

    const refresh = () => { attachBar(); rebuild(); };

    const obs = new MutationObserver(syncDot);
    const startObserving = (retries = 10) => {
      const icon = document.querySelector('.save-status-icon');
      if (icon) {
        obs.observe(icon, { attributes: true, attributeFilter: ['class'] });
        syncDot();
      } else if (retries > 0) {
        setTimeout(() => startObserving(retries - 1), 500);
      }
    };

    this.registerEvent(this.app.workspace.on('active-leaf-change', refresh));
    this.registerEvent(this.app.workspace.on('layout-change', refresh));
    this.registerEvent(this.app.workspace.on('file-open', refresh));

    this.app.workspace.onLayoutReady(() => {
      setTimeout(refresh, 500);
      startObserving();
    });

    this.register(() => {
      obs.disconnect();
      bar.remove();
      document.querySelectorAll('.mtb-hidden').forEach(el => el.classList.remove('mtb-hidden'));
    });
  }
}
