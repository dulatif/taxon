document.addEventListener('DOMContentLoaded', () => {
  // Theme Toggle Logic
  const themeToggle = document.getElementById('theme-toggle');
  const htmlEl = document.documentElement;
  
  const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
  
  const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;

  // Check local storage or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    htmlEl.setAttribute('data-theme', savedTheme);
    updateIcon(savedTheme);
  } else {
    updateIcon(prefersDark ? 'dark' : 'light');
  }

  function updateIcon(theme) {
    if (themeToggle) {
      themeToggle.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      let currentTheme = htmlEl.getAttribute('data-theme');
      if (!currentTheme) {
        currentTheme = prefersDark ? 'dark' : 'light';
      }
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      htmlEl.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateIcon(newTheme);
    });
  }

  // Mobile Menu Toggle
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // Smooth Scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        if (navLinks) {
          navLinks.classList.remove('active'); // Close mobile menu if open
        }
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  // Scroll Animations
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-in-up').forEach(el => {
    observer.observe(el);
  });

  // =========================================================================
  // --- Interactive Workflow DAG & AI Agent Live Sync Simulation Engine ---
  // =========================================================================
  
  const scenarios = {
    workflow: {
      name: "Sprint 4: Workflow Engine",
      modules: [
        { id: "mod-arch", title: "Architecture & Schemas", x: 15, y: 15, w: 220, h: 240 },
        { id: "mod-ui", title: "DAG Canvas & UI Integration", x: 255, y: 15, w: 225, h: 420 }
      ],
      nodes: [
        {
          id: "wf0101",
          rawId: "TASK-wf0101",
          title: "Setup Schema & Dagre",
          moduleGroup: "Architecture",
          status: "done",
          priority: "High",
          x: 28,
          y: 50,
          dependsOn: [],
          description: "Initialize Task schema with dependsOn array and integrate Dagre layout dependency."
        },
        {
          id: "wf0102",
          rawId: "TASK-wf0102",
          title: "Agent Sync Serialization",
          moduleGroup: "Architecture",
          status: "done",
          priority: "High",
          x: 28,
          y: 155,
          dependsOn: ["wf0101"],
          description: "Update markdown frontmatter parser to serialize and deserialize workflow DAG metadata."
        },
        {
          id: "wf0104",
          rawId: "TASK-wf0104",
          title: "Dagre Auto-Layout Engine",
          moduleGroup: "Layout Engine",
          status: "in-progress",
          priority: "Critical",
          x: 270,
          y: 50,
          dependsOn: ["wf0101"],
          description: "Build topological node positioner with bounding box clustering for module groups."
        },
        {
          id: "wf0105",
          rawId: "TASK-wf0105",
          title: "WorkflowView Canvas",
          moduleGroup: "UI Canvas",
          status: "todo",
          priority: "Critical",
          x: 270,
          y: 170,
          dependsOn: ["wf0104"],
          description: "Interactive canvas component rendering custom module nodes, task badges, and curved edges."
        },
        {
          id: "wf0107",
          rawId: "TASK-wf0107",
          title: "ProjectView Sub-Tab",
          moduleGroup: "UI Canvas",
          status: "todo",
          priority: "Critical",
          x: 270,
          y: 290,
          dependsOn: ["wf0105", "wf0102"],
          description: "Integrate third view mode (List, Board, Workflow) in ProjectDetailView."
        }
      ],
      steps: [
        {
          activeNodeId: "wf0104",
          activeEdges: ["wf0101->wf0104"],
          nodeUpdates: { wf0104: "in-progress" },
          log: { tag: "tag-agent", tagText: "[AI AGENT]", text: "Reading .taxon/tasks/TASK-wf0104.md (dependsOn: TASK-wf0101 verified complete)." }
        },
        {
          activeNodeId: "wf0104",
          activeEdges: ["wf0101->wf0104"],
          nodeUpdates: { wf0104: "in-progress" },
          log: { tag: "tag-agent", tagText: "[AI AGENT]", text: "Generating Dagre hierarchical layout engine in src/components/Workflow/workflowLayout.ts." }
        },
        {
          activeNodeId: "wf0104",
          activeEdges: ["wf0101->wf0104"],
          nodeUpdates: { wf0104: "in-progress" },
          log: { tag: "tag-test", tagText: "[TEST]", text: "npx vitest run workflowLayout.test.ts -> 6 passed (98ms)." }
        },
        {
          activeNodeId: "wf0104",
          activeEdges: ["wf0101->wf0104"],
          nodeUpdates: { wf0104: "need-to-test" },
          log: { tag: "tag-git", tagText: "[GIT]", text: "git commit -m 'feat(workflow): implement Dagre auto-layout (TASK-wf0104)'." }
        },
        {
          activeNodeId: "wf0104",
          activeEdges: [],
          nodeUpdates: { wf0104: "need-to-test" },
          log: { tag: "tag-sync", tagText: "[TAXON SYNC]", text: "Git post-commit hook: Auto-synced TASK-wf0104 status -> 'Need to Test'." }
        },
        {
          activeNodeId: "wf0104",
          activeEdges: [],
          nodeUpdates: { wf0104: "done" },
          log: { tag: "tag-success", tagText: "[SUCCESS]", text: "TASK-wf0104 marked Done. Unblocking dependent task TASK-wf0105..." }
        },
        {
          activeNodeId: "wf0105",
          activeEdges: ["wf0104->wf0105"],
          nodeUpdates: { wf0105: "in-progress" },
          log: { tag: "tag-agent", tagText: "[AI AGENT]", text: "Starting TASK-wf0105: Implementing WorkflowView canvas component." }
        },
        {
          activeNodeId: "wf0105",
          activeEdges: ["wf0104->wf0105"],
          nodeUpdates: { wf0105: "need-to-test" },
          log: { tag: "tag-git", tagText: "[GIT]", text: "git commit -m 'feat(ui): implement WorkflowView canvas component (TASK-wf0105)'." }
        },
        {
          activeNodeId: "wf0105",
          activeEdges: [],
          nodeUpdates: { wf0105: "done" },
          log: { tag: "tag-sync", tagText: "[TAXON SYNC]", text: "TASK-wf0105 verified. All dependencies for TASK-wf0107 satisfied!" }
        },
        {
          activeNodeId: "wf0107",
          activeEdges: ["wf0105->wf0107", "wf0102->wf0107"],
          nodeUpdates: { wf0107: "in-progress" },
          log: { tag: "tag-agent", tagText: "[AI AGENT]", text: "Implementing ProjectDetailView sub-tab toggle (TASK-wf0107)..." }
        },
        {
          activeNodeId: "wf0107",
          activeEdges: [],
          nodeUpdates: { wf0107: "done" },
          log: { tag: "tag-success", tagText: "[SUCCESS]", text: "Sprint 4 Workflow Engine DAG successfully completed & synced." }
        }
      ]
    },
    shortcuts: {
      name: "Sprint 5: Live Sync & Hooks",
      modules: [
        { id: "mod-sync", title: "Live Sync Engine", x: 15, y: 15, w: 220, h: 260 },
        { id: "mod-keys", title: "Global Shortcuts & Hotkeys", x: 255, y: 15, w: 225, h: 320 }
      ],
      nodes: [
        {
          id: "550539",
          rawId: "TASK-550539",
          title: "Fix Live Sync State Lock",
          moduleGroup: "Agent Sync",
          status: "in-progress",
          priority: "Critical",
          x: 28,
          y: 50,
          dependsOn: [],
          description: "Resolve background file watching conflict during rapid frontend status updates."
        },
        {
          id: "612213",
          rawId: "TASK-612213",
          title: "Redesign Focus Mode Screen",
          moduleGroup: "Focus UI",
          status: "done",
          priority: "Medium",
          x: 28,
          y: 155,
          dependsOn: [],
          description: "Minimalist OLED focus mode with auto-start breaks and global timer hotkeys."
        },
        {
          id: "684926",
          rawId: "TASK-684926",
          title: "Filter Cycle Hotkey (F)",
          moduleGroup: "Shortcuts",
          status: "todo",
          priority: "Medium",
          x: 270,
          y: 50,
          dependsOn: [],
          description: "Add F / Alt+F hotkey to cycle through To Do, In Progress, Need to Test, and Done."
        },
        {
          id: "065722",
          rawId: "TASK-065722",
          title: "Sprint Switch Hotkey (S)",
          moduleGroup: "Shortcuts",
          status: "todo",
          priority: "Medium",
          x: 270,
          y: 170,
          dependsOn: ["684926"],
          description: "Add S / Alt+S shortcut to cycle active sprints and backlogs."
        }
      ],
      steps: [
        {
          activeNodeId: "550539",
          activeEdges: [],
          nodeUpdates: { "550539": "in-progress" },
          log: { tag: "tag-agent", tagText: "[AI AGENT]", text: "Analyzing race condition in src/services/agentSync.ts..." }
        },
        {
          activeNodeId: "550539",
          activeEdges: [],
          nodeUpdates: { "550539": "need-to-test" },
          log: { tag: "tag-git", tagText: "[GIT]", text: "git commit -m 'fix(sync): debounced sync watcher to prevent state lock (TASK-550539)'." }
        },
        {
          activeNodeId: "550539",
          activeEdges: [],
          nodeUpdates: { "550539": "done" },
          log: { tag: "tag-sync", tagText: "[TAXON SYNC]", text: "Live sync daemon reconciled lockfile. TASK-550539 complete." }
        },
        {
          activeNodeId: "684926",
          activeEdges: [],
          nodeUpdates: { "684926": "in-progress" },
          log: { tag: "tag-agent", tagText: "[AI AGENT]", text: "Implementing 'F' key event listener in useAppNavigation.ts." }
        },
        {
          activeNodeId: "684926",
          activeEdges: [],
          nodeUpdates: { "684926": "done" },
          log: { tag: "tag-git", tagText: "[GIT]", text: "git commit -m 'feat(shortcuts): add F shortcut to cycle task status filter (TASK-684926)'." }
        },
        {
          activeNodeId: "065722",
          activeEdges: ["684926->065722"],
          nodeUpdates: { "065722": "in-progress" },
          log: { tag: "tag-agent", tagText: "[AI AGENT]", text: "Implementing 'S' sprint switching hotkey for active & planned sprints." }
        },
        {
          activeNodeId: "065722",
          activeEdges: [],
          nodeUpdates: { "065722": "done" },
          log: { tag: "tag-success", tagText: "[SUCCESS]", text: "All Sprint 5 shortcuts & sync fixes completed and tested." }
        }
      ]
    }
  };

  let currentScenarioKey = 'workflow';
  let currentStepIndex = -1;
  let isPlaying = false;
  let playInterval = null;
  let selectedNodeId = 'wf0104';
  let currentNodesState = {};

  const nodesLayer = document.getElementById('dag-nodes-layer');
  const edgesGroup = document.getElementById('dag-edges-group');
  const logsContainer = document.getElementById('terminal-logs');
  const frontmatterContainer = document.getElementById('task-frontmatter-content');
  const playBtn = document.getElementById('sim-play-btn');
  const stepBtn = document.getElementById('sim-step-btn');
  const resetBtn = document.getElementById('sim-reset-btn');
  const presetTabs = document.querySelectorAll('.preset-tab');
  const terminalTabs = document.querySelectorAll('.terminal-tab');

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'done': return { badgeClass: 'badge-done', label: 'Done', nodeClass: 'done' };
      case 'need-to-test': return { badgeClass: 'badge-needtest', label: 'Need to Test', nodeClass: 'need-to-test' };
      case 'in-progress': return { badgeClass: 'badge-inprogress', label: 'In Progress', nodeClass: 'in-progress' };
      default: return { badgeClass: 'badge-todo', label: 'To Do', nodeClass: 'todo' };
    }
  }

  function formatTime() {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  }

  function addLog(tagClass, tagText, message) {
    if (!logsContainer) return;
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `
      <span class="log-time">${formatTime()}</span>
      <span class="log-tag ${tagClass}">${tagText}</span>
      <span class="log-msg">${message}</span>
    `;
    logsContainer.appendChild(line);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  function renderFrontmatter(node) {
    if (!frontmatterContainer || !node) return;
    const dependsYaml = node.dependsOn && node.dependsOn.length > 0
      ? node.dependsOn.map(d => `  - <span class="val">${d}</span>`).join('\n')
      : '  []';

    frontmatterContainer.innerHTML = `
<div class="comment"># .taxon/tasks/${node.rawId}.md</div>
<div><span class="keyword">---</span></div>
<div><span class="prop">id:</span> <span class="val">${node.id}</span></div>
<div><span class="prop">title:</span> <span class="string">"${node.title}"</span></div>
<div><span class="prop">priority:</span> <span class="val">${node.priority}</span></div>
<div><span class="prop">status:</span> <span class="string">"${getStatusBadgeClass(node.status).label}"</span></div>
<div><span class="prop">moduleGroup:</span> <span class="string">"${node.moduleGroup}"</span></div>
<div><span class="prop">dependsOn:</span></div>
<div>${dependsYaml}</div>
<div><span class="keyword">---</span></div>
<br/>
<div class="prop">## Description</div>
<div class="comment">${node.description}</div>
<br/>
<div class="prop">## AI Agent Metadata</div>
<div><span class="prop">workspacePath:</span> <span class="string">"/mnt/Linux/Projects/taxon"</span></div>
<div><span class="prop">lastSyncedAt:</span> <span class="val">${new Date().toISOString()}</span></div>
    `;
  }

  function renderDAG(scenarioKey, activeEdges = []) {
    const scenario = scenarios[scenarioKey];
    if (!scenario || !nodesLayer || !edgesGroup) return;

    nodesLayer.innerHTML = '';
    edgesGroup.innerHTML = '';

    // Render Module Cluster Backgrounds
    scenario.modules.forEach(mod => {
      const cluster = document.createElement('div');
      cluster.className = 'module-cluster';
      cluster.style.left = `${mod.x}px`;
      cluster.style.top = `${mod.y}px`;
      cluster.style.width = `${mod.w}px`;
      cluster.style.height = `${mod.h}px`;

      const label = document.createElement('div');
      label.className = 'module-cluster-label';
      label.textContent = mod.title;
      cluster.appendChild(label);

      nodesLayer.appendChild(cluster);
    });

    // Render Nodes
    const nodeMap = {};
    scenario.nodes.forEach(n => {
      const currentStatus = currentNodesState[n.id] || n.status;
      const { badgeClass, label, nodeClass } = getStatusBadgeClass(currentStatus);
      const isSelected = n.id === selectedNodeId;

      const nodeEl = document.createElement('div');
      nodeEl.className = `dag-node ${nodeClass} ${isSelected ? 'selected' : ''}`;
      nodeEl.id = `node-${n.id}`;
      nodeEl.style.left = `${n.x}px`;
      nodeEl.style.top = `${n.y}px`;

      nodeEl.innerHTML = `
        <div class="dag-node-header">
          <span class="dag-node-id">${n.rawId}</span>
          <span class="dag-node-badge ${badgeClass}">${label}</span>
        </div>
        <div class="dag-node-title">${n.title}</div>
      `;

      nodeEl.addEventListener('click', () => {
        selectedNodeId = n.id;
        document.querySelectorAll('.dag-node').forEach(el => el.classList.remove('selected'));
        nodeEl.classList.add('selected');
        renderFrontmatter({ ...n, status: currentNodesState[n.id] || n.status });
      });

      nodesLayer.appendChild(nodeEl);
      nodeMap[n.id] = { ...n, el: nodeEl, currentStatus };
    });

    // Render Edges
    const nodeWidth = 190;
    const nodeHeight = 65;

    scenario.nodes.forEach(targetNode => {
      if (targetNode.dependsOn && targetNode.dependsOn.length > 0) {
        targetNode.dependsOn.forEach(sourceId => {
          const sourceNode = nodeMap[sourceId];
          if (!sourceNode) return;

          const x1 = sourceNode.x + nodeWidth;
          const y1 = sourceNode.y + (nodeHeight / 2);
          const x2 = targetNode.x;
          const y2 = targetNode.y + (nodeHeight / 2);

          const dx = Math.max(40, (x2 - x1) / 2);
          const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

          const edgeKey = `${sourceId}->${targetNode.id}`;
          const isActive = activeEdges.includes(edgeKey);

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', pathD);
          path.setAttribute('class', `dag-edge-path ${isActive ? 'active' : ''}`);
          path.setAttribute('marker-end', isActive ? 'url(#arrow-active)' : 'url(#arrow)');

          edgesGroup.appendChild(path);
        });
      }
    });

    // Update frontmatter view for currently selected node
    const activeNodeData = nodeMap[selectedNodeId] || scenario.nodes[0];
    if (activeNodeData) {
      renderFrontmatter(activeNodeData);
    }
  }

  function initScenario(scenarioKey) {
    currentScenarioKey = scenarioKey;
    const scenario = scenarios[scenarioKey];
    currentNodesState = {};
    scenario.nodes.forEach(n => {
      currentNodesState[n.id] = n.status;
    });
    selectedNodeId = scenario.nodes.find(n => n.status === 'in-progress')?.id || scenario.nodes[0].id;
    currentStepIndex = -1;
    pauseSimulation();

    if (logsContainer) {
      logsContainer.innerHTML = '';
      addLog('tag-sync', '[TAXON DAEMON]', `Initialized workspace environment for ${scenario.name}.`);
      addLog('tag-agent', '[AI AGENT]', `Loaded .taxon/project.md metadata. Ready for autonomous task execution.`);
    }

    renderDAG(scenarioKey);
  }

  function stepSimulation() {
    const scenario = scenarios[currentScenarioKey];
    if (!scenario || !scenario.steps) return;

    currentStepIndex++;
    if (currentStepIndex >= scenario.steps.length) {
      currentStepIndex = 0; // Loop or finish
    }

    const step = scenario.steps[currentStepIndex];

    // Apply status updates to nodes
    if (step.nodeUpdates) {
      Object.keys(step.nodeUpdates).forEach(nodeId => {
        currentNodesState[nodeId] = step.nodeUpdates[nodeId];
      });
    }

    if (step.activeNodeId) {
      selectedNodeId = step.activeNodeId;
    }

    renderDAG(currentScenarioKey, step.activeEdges || []);

    if (step.log) {
      addLog(step.log.tag, step.log.tagText, step.log.text);
    }
  }

  function playSimulation() {
    if (isPlaying) return;
    isPlaying = true;
    if (playBtn) {
      playBtn.querySelector('.play-icon').style.display = 'none';
      playBtn.querySelector('.pause-icon').style.display = 'inline-block';
      playBtn.querySelector('.sim-btn-text').textContent = 'Pause Simulation';
    }
    stepSimulation();
    playInterval = setInterval(stepSimulation, 1800);
  }

  function pauseSimulation() {
    isPlaying = false;
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
    if (playBtn) {
      playBtn.querySelector('.play-icon').style.display = 'inline-block';
      playBtn.querySelector('.pause-icon').style.display = 'none';
      playBtn.querySelector('.sim-btn-text').textContent = 'Simulate Agent Run';
    }
  }

  // Setup Event Listeners for Playground Controls
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (isPlaying) {
        pauseSimulation();
      } else {
        playSimulation();
      }
    });
  }

  if (stepBtn) {
    stepBtn.addEventListener('click', () => {
      pauseSimulation();
      stepSimulation();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      initScenario(currentScenarioKey);
    });
  }

  presetTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      presetTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const scenarioKey = tab.getAttribute('data-scenario');
      initScenario(scenarioKey);
    });
  });

  terminalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      terminalTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabKey = tab.getAttribute('data-tab');

      const streamTab = document.getElementById('terminal-stream-tab');
      const frontmatterTab = document.getElementById('terminal-frontmatter-tab');

      if (tabKey === 'stream') {
        if (streamTab) streamTab.style.display = 'block';
        if (frontmatterTab) frontmatterTab.style.display = 'none';
      } else {
        if (streamTab) streamTab.style.display = 'none';
        if (frontmatterTab) frontmatterTab.style.display = 'block';
      }
    });
  });

  // Initialize initial scenario on page load
  initScenario('workflow');
});

