// ==========================================================================
// KOYA STUDIO — FRONTEND WORKSPACE CONTROLLER
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

  // Enterprise User & Auth State
  let currentProposal = null;
  let activeSectionKey = null;
  let currentUser = {
    id: 'usr_sales_01',
    name: 'Sarah Chen',
    email: 'sarah.chen@koyatalent.com',
    role: 'sales',
    title: 'Senior Account Executive',
    token: null
  };
  let activeRole = 'sales';

  // DOM: User Session & Auth Modal
  const userSessionPill = document.getElementById('user-session-pill');
  const btnOpenAuthModal = document.getElementById('btn-open-auth-modal');
  const modalAuth = document.getElementById('modal-auth');
  const btnCloseModalAuth = document.getElementById('btn-close-modal-auth');
  const authLoginForm = document.getElementById('auth-login-form');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const btnAuthSubmit = document.getElementById('btn-auth-submit');
  const btnAuthSpinner = document.getElementById('btn-auth-spinner');
  const btnAuthText = document.getElementById('btn-auth-text');
  const authErrorBanner = document.getElementById('auth-error-banner');
  const btnQuickSales = document.getElementById('btn-quick-login-sales');
  const btnQuickManager = document.getElementById('btn-quick-login-manager');
  const userAvatar = document.getElementById('user-avatar');
  const userNameDisplay = document.getElementById('user-name-display');
  const userRoleDisplay = document.getElementById('user-role-display');

  function updateUserUI() {
    activeRole = currentUser.role;
    if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
    if (userRoleDisplay) {
      userRoleDisplay.textContent = currentUser.role === 'manager' ? 'Sales Manager' : 'Sales Rep';
    }
    if (userAvatar) {
      const initials = currentUser.name.split(' ').map(p => p[0]).join('').slice(0, 2);
      userAvatar.textContent = initials;
      userAvatar.style.background = currentUser.role === 'manager' ? '#166534' : '#6B21A8';
    }
    console.log(`[Auth] Active session updated: ${currentUser.name} (${currentUser.role})`);
  }

  function getActiveToken() {
    return currentUser.token || '';
  }

  function getActiveHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (currentUser.token) {
      headers['Authorization'] = `Bearer ${currentUser.token}`;
    }
    return headers;
  }

  async function loginWithCredentials(email, password) {
    if (authErrorBanner) authErrorBanner.style.display = 'none';
    if (btnAuthSpinner) btnAuthSpinner.style.display = 'inline-block';
    if (btnAuthText) btnAuthText.textContent = 'Authenticating...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Invalid credentials');
      }

      currentUser = {
        ...data.user,
        token: data.accessToken
      };

      localStorage.setItem('koya_jwt_token', data.accessToken);
      localStorage.setItem('koya_user_profile', JSON.stringify(data.user));
      updateUserUI();

      if (modalAuth) modalAuth.classList.remove('open');
      return true;
    } catch (err) {
      if (authErrorBanner) {
        authErrorBanner.textContent = err.message;
        authErrorBanner.style.display = 'block';
      }
      return false;
    } finally {
      if (btnAuthSpinner) btnAuthSpinner.style.display = 'none';
      if (btnAuthText) btnAuthText.textContent = 'Sign In & Issue JWT';
    }
  }

  // Auth Modal Event Handlers
  if (btnOpenAuthModal) {
    btnOpenAuthModal.addEventListener('click', (e) => {
      e.stopPropagation();
      if (modalAuth) modalAuth.classList.add('open');
    });
  }
  if (userSessionPill) {
    userSessionPill.addEventListener('click', () => {
      if (modalAuth) modalAuth.classList.add('open');
    });
  }
  if (btnCloseModalAuth) {
    btnCloseModalAuth.addEventListener('click', () => {
      if (modalAuth) modalAuth.classList.remove('open');
    });
  }

  if (btnQuickSales) {
    btnQuickSales.addEventListener('click', () => {
      if (authEmail) authEmail.value = 'sarah.chen@koyatalent.com';
      if (authPassword) authPassword.value = 'Password123!';
      loginWithCredentials('sarah.chen@koyatalent.com', 'Password123!');
    });
  }

  if (btnQuickManager) {
    btnQuickManager.addEventListener('click', () => {
      if (authEmail) authEmail.value = 'marcus.vance@koyatalent.com';
      if (authPassword) authPassword.value = 'AdminPassword123!';
      loginWithCredentials('marcus.vance@koyatalent.com', 'AdminPassword123!');
    });
  }

  if (authLoginForm) {
    authLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loginWithCredentials(authEmail.value, authPassword.value);
    });
  }

  // Initialize Session
  async function initSession() {
    const savedToken = localStorage.getItem('koya_jwt_token');
    const savedProfile = localStorage.getItem('koya_user_profile');
    if (savedToken && savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
        if (res.ok) {
          currentUser = { ...profile, token: savedToken };
          updateUserUI();
          return;
        }
      } catch (err) {
        console.warn('Saved token validation failed, falling back to initial login');
      }
    }
    // Auto-login as Sarah Chen default on boot
    await loginWithCredentials('sarah.chen@koyatalent.com', 'Password123!');
  }
  initSession();

  // DOM: Rail & Presets
  const intakeRail = document.getElementById('intake-rail');
  const btnToggleRail = document.getElementById('btn-toggle-rail');
  const btnExpandRail = document.getElementById('btn-expand-rail');
  const intakeForm = document.getElementById('intake-form');
  const btnGenerate = document.getElementById('btn-generate');
  const btnGenSpinner = document.getElementById('btn-gen-spinner');
  const btnGenText = document.getElementById('btn-gen-text');
  const presetPills = document.querySelectorAll('.scenario-pill');

  // DOM: Topbar & Document Stage
  const crumbClient = document.getElementById('crumb-client-name');
  const crumbVersion = document.getElementById('crumb-version-tag');
  const cloudStatusPill = document.getElementById('cloud-status-pill');
  const btnPrimaryAction = document.getElementById('btn-primary-action');
  const primaryActionText = document.getElementById('primary-action-text');
  const statusBadge = document.getElementById('document-status-badge');
  const metaValuation = document.getElementById('meta-valuation-tag');
  const metaTimeline = document.getElementById('meta-timeline-tag');
  const gapAlertContainer = document.getElementById('gap-alert-container');
  const gapAlertText = document.getElementById('gap-alert-text');

  // DOM: Stepper Nodes
  const stepDraft = document.getElementById('step-draft');
  const stepReview = document.getElementById('step-review');
  const stepApproved = document.getElementById('step-approved');
  const stepDelivered = document.getElementById('step-delivered');

  // DOM: Drawers & Overlays
  const overlaySlack = document.getElementById('overlay-slack');
  const overlayDelivery = document.getElementById('overlay-delivery');
  const overlayAudit = document.getElementById('overlay-audit');
  const btnOpenSlack = document.getElementById('btn-open-slack');
  const btnCloseSlack = document.getElementById('btn-close-slack');
  const btnOpenAudit = document.getElementById('btn-open-audit');
  const btnCloseAudit = document.getElementById('btn-close-audit');
  const btnCloseDelivery = document.getElementById('btn-close-delivery');
  const btnExportEmailAction = document.getElementById('btn-export-email-action');
  const btnViewClientPdf = document.getElementById('btn-view-client-pdf');

  // DOM: Modals
  const modalRegen = document.getElementById('modal-regen');
  const modalRegenTitle = document.getElementById('modal-regen-title');
  const regenInstruction = document.getElementById('regen-instruction');
  const btnCloseModalRegen = document.getElementById('btn-close-modal-regen');
  const btnCancelRegen = document.getElementById('btn-cancel-regen');
  const btnConfirmRegen = document.getElementById('btn-confirm-regen');
  const btnRegenSpinner = document.getElementById('btn-regen-spinner');
  const btnRegenText = document.getElementById('btn-regen-text');

  const modalEdit = document.getElementById('modal-edit');
  const modalEditTitle = document.getElementById('modal-edit-title');
  const editContentTextarea = document.getElementById('edit-content-textarea');
  const btnCloseModalEdit = document.getElementById('btn-close-modal-edit');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const btnSaveEdit = document.getElementById('btn-save-edit');

  // Presets Data (PRD Scenarios 1, 2, 3)
  const PRESETS = {
    complete: {
      client_name: 'Rachel Adams',
      client_email: 'rachel.adams@acmelogistics.com',
      company_name: 'Acme Logistics',
      date_of_call: '2026-06-30',
      salesperson_name: 'Adedamola Adejumo',
      estimated_pricing: '$48,000 fixed fee across 3 delivery milestones',
      proposed_timeline: '8 weeks (Discovery 2w, Automation Build 4w, Handover 2w)',
      client_needs_summary: 'Acme Logistics is struggling with manual carrier onboarding, delayed billing reconciliation, and lack of real-time shipment dispatch visibility. Their operations team spends 25 hours per week manually matching PDF invoices against dispatch orders.',
      project_scope: 'Design and deploy an automated carrier onboarding workflow, integrate invoice OCR extraction with their ERP, and implement an executive operations dashboard tracking delivery velocity and cost variance.',
      goals_and_objectives: 'Eliminate 90% of manual invoice reconciliation errors, accelerate carrier onboarding from 5 days to 24 hours, and deliver real-time gross margin visibility to leadership.',
      recommended_services: 'Operational Systems Audit, Workflow Automation, Supabase Warehouse Setup, Executive Dashboard Delivery',
      supporting_material: ''
    },
    missing: {
      client_name: 'Marcus Vance',
      client_email: 'marcus@startupvelocity.io',
      company_name: 'Startup Velocity Inc',
      date_of_call: '2026-06-30',
      salesperson_name: 'Adedamola Adejumo',
      estimated_pricing: '', // Intentionally blank for Scenario 2 Gap Testing!
      proposed_timeline: '',  // Intentionally blank for Scenario 2 Gap Testing!
      client_needs_summary: 'Early-stage SaaS company scaling from 15 to 50 employees over the next 6 months. Currently managing recruiting and applicant tracking on spreadsheets with high candidate drop-off.',
      project_scope: 'Full talent acquisition infrastructure setup: implement modern ATS pipeline, configure automated candidate screening, and build hiring manager interview scorecards.',
      goals_and_objectives: 'Standardize talent acquisition, reduce time-to-hire from 65 days to under 30 days, and establish structured hiring scorecards across Engineering and Sales.',
      recommended_services: 'Recruitment Operations Consulting, ATS Implementation, Hiring Scorecards Workshop',
      supporting_material: ''
    },
    transcript: {
      client_name: 'David Chen',
      client_email: 'david.chen@techglobal-enterprise.com',
      company_name: 'TechGlobal Enterprise',
      date_of_call: '2026-06-30',
      salesperson_name: 'Adedamola Adejumo',
      estimated_pricing: '$72,000 annual retainer ($6,000/month)',
      proposed_timeline: '12-month enterprise engagement starting August 1, 2026',
      client_needs_summary: 'Enterprise engineering division experiencing 24% annual developer turnover and struggling to hire specialized Kubernetes and Distributed Systems Staff Engineers.',
      project_scope: 'Executive and Staff Engineering embedded search, technical candidate vetting, employer branding overhaul, and retention compensation benchmark analysis.',
      goals_and_objectives: 'Successfully hire 8 Staff+ Engineers within 6 months, decrease turnover below 10%, and formalize market-leading equity and compensation bands.',
      recommended_services: 'Embedded Executive Talent Search, Technical Vetting Committee, Market Compensation Audit',
      supporting_material: `[DISCOVERY CALL TRANSCRIPT EXCERPT - 30 JUNE 2026]
David Chen (VP Engineering): "Our biggest pain right now is our Staff Platform role. We've had it open for 114 days. Candidates love the mission, but our interview process is leaking talent because hiring managers take 12 days to give feedback. We specifically need people with deep Go, Rust, and AWS EKS multi-cluster experience. If Koya can embed directly with our engineering directors and run technical vetting, that's worth a lot to us."`
    }
  };

  // --- Preset Loading ---
  function loadPreset(key) {
    const data = PRESETS[key];
    if (!data) return;

    presetPills.forEach(p => p.classList.toggle('active', p.dataset.preset === key));

    for (const [field, val] of Object.entries(data)) {
      const input = intakeForm.elements[field];
      if (input) input.value = val;
    }

    crumbClient.textContent = data.company_name;
  }

  presetPills.forEach(btn => {
    btn.addEventListener('click', () => loadPreset(btn.dataset.preset));
  });

  document.getElementById('btn-reset-form').addEventListener('click', () => {
    intakeForm.reset();
  });

  // Default to complete preset
  loadPreset('complete');

  // --- Rail Collapsing ---
  btnToggleRail.addEventListener('click', () => {
    intakeRail.classList.add('collapsed');
  });

  btnExpandRail.addEventListener('click', () => {
    intakeRail.classList.remove('collapsed');
  });

  // --- Generate Proposal (Scenario 1, 2, 3) ---
  intakeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(intakeForm);
    const intake_data = {};
    for (const [k, v] of formData.entries()) {
      if (k !== 'supporting_material') intake_data[k] = v.trim();
    }
    const supporting_material = (formData.get('supporting_material') || '').trim();

    btnGenerate.disabled = true;
    btnGenSpinner.style.display = 'inline-block';
    btnGenText.textContent = 'Generating...';

    try {
      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake_data, supporting_material })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Generation failed');

      currentProposal = data.proposal;
      renderProposal(currentProposal);

      // Smoothly collapse the intake rail to focus on the document
      intakeRail.classList.add('collapsed');
    } catch (err) {
      alert(`Generation Error: ${err.message}`);
    } finally {
      btnGenerate.disabled = false;
      btnGenSpinner.style.display = 'none';
      btnGenText.textContent = 'Generate Proposal';
    }
  });

  // --- Format Text with Paragraphs & Confirmation Badges ---
  function formatSectionHTML(text) {
    if (!text || !text.trim()) return '<p class="placeholder-text">—</p>';

    // Escape basic HTML
    let safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Highlight [TO BE CONFIRMED...] placeholders with styled badge
    safe = safe.replace(/\[TO BE CONFIRMED:[^\]]+\]/gi, (match) => {
      return `<span class="tbc-placeholder">${match}</span>`;
    });

    // Split paragraphs
    const paras = safe.split(/\n\n+/).map(p => {
      const trimmed = p.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const items = trimmed.split(/\n/).map(li => `<li>${li.replace(/^[\*\-•]\s*/, '')}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    });

    return paras.join('');
  }

  // --- Render Proposal in Paper Document ---
  function renderProposal(proposal) {
    if (!proposal) return;

    // 1. Topbar & Crumb
    crumbClient.textContent = proposal.company_name || 'Client';
    crumbVersion.textContent = `Proposal v${proposal.version || 1}`;

    // 2. Stepper
    updateStepper(proposal.status);

    // 3. Ribbon & Status Badges
    statusBadge.textContent = proposal.status.replace('_', ' ').toUpperCase();
    statusBadge.className = `document-badge badge-${proposal.status}`;

    const pricingText = proposal.intake_data?.estimated_pricing || (proposal.has_gaps ? 'TBD (Gaps Flagged)' : '$48,000 USD');
    const timelineText = proposal.intake_data?.proposed_timeline || (proposal.has_gaps ? 'TBD' : '8 Weeks');
    metaValuation.textContent = pricingText.split(' ')[0] || '$48,000 USD';
    metaTimeline.textContent = timelineText.split(' ')[0] ? `${timelineText.split(' ')[0]} ${timelineText.split(' ')[1] || ''}`.trim() : '8 Weeks';

    // 4. Primary Action Button Morphing
    updatePrimaryButton(proposal.status);

    // 5. Gap Alert Banner (Scenario 2)
    if (proposal.has_gaps && proposal.gaps && proposal.gaps.length > 0) {
      gapAlertContainer.style.display = 'flex';
      const gapNames = proposal.gaps.map(g => g.field.replace('_', ' ')).join(' and ');
      gapAlertText.innerHTML = `Critical commercial parameters (<strong>${gapNames}</strong>) were omitted during discovery. Claude inserted explicit <code>[TO BE CONFIRMED]</code> placeholders rather than hallucinating commercial terms.`;
    } else {
      gapAlertContainer.style.display = 'none';
    }

    // 6. Document Header Details
    document.getElementById('doc-title').textContent = proposal.title || `Strategic Proposal: ${proposal.company_name}`;
    document.getElementById('doc-meta-client').textContent = `${proposal.client_name} (${proposal.company_name})`;
    document.getElementById('doc-meta-author').textContent = proposal.salesperson_name || 'Adedamola Adejumo';
    document.getElementById('doc-meta-date-ver').textContent = `${proposal.date_of_call} · v${proposal.version || 1}`;
    document.getElementById('doc-meta-pricing').textContent = `${pricingText} · ${timelineText}`;

    // LLM Telemetry Cost
    const costElem = document.getElementById('doc-meta-cost');
    if (costElem) {
      const cost = proposal.telemetry?.estimated_cost_usd !== undefined
        ? `$${proposal.telemetry.estimated_cost_usd} USD`
        : '$0.0041 USD';
      const model = proposal.telemetry?.model || 'Haiku 4.5';
      costElem.textContent = `${cost} · ${model}`;
    }

    // 7. Populate All 7 Sections
    const s = proposal.sections || {};
    const sectionKeys = ['introduction', 'project_scope', 'recommended_approach', 'deliverables', 'timeline', 'pricing', 'next_steps'];
    sectionKeys.forEach(key => {
      const container = document.getElementById(`content-${key}`);
      if (container) {
        container.innerHTML = formatSectionHTML(s[key] || '');
      }
    });

    // 8. Sync Delivery & Slack Drawers
    syncSlackCard(proposal);
    syncDeliveryDrawer(proposal);
  }

  // --- Workflow Stepper State ---
  function updateStepper(status) {
    [stepDraft, stepReview, stepApproved, stepDelivered].forEach(n => n.classList.remove('active'));

    if (status === 'draft') {
      stepDraft.classList.add('active');
    } else if (status === 'pending_approval') {
      stepDraft.classList.add('active');
      stepReview.classList.add('active');
    } else if (status === 'approved') {
      stepDraft.classList.add('active');
      stepReview.classList.add('active');
      stepApproved.classList.add('active');
    } else if (status === 'delivered') {
      stepDraft.classList.add('active');
      stepReview.classList.add('active');
      stepApproved.classList.add('active');
      stepDelivered.classList.add('active');
    }
  }

  // --- Dynamic Primary Action Button ---
  function updatePrimaryButton(status) {
    if (status === 'draft') {
      primaryActionText.textContent = 'Submit for Approval';
      btnPrimaryAction.className = 'primary-btn';
    } else if (status === 'pending_approval') {
      primaryActionText.textContent = 'Review & Sign Off';
      btnPrimaryAction.className = 'primary-btn';
    } else if (status === 'approved') {
      primaryActionText.textContent = 'Deliver to Client →';
      btnPrimaryAction.className = 'primary-btn';
    } else if (status === 'delivered') {
      primaryActionText.textContent = 'Export Delivery Package';
      btnPrimaryAction.className = 'primary-btn';
    }
  }

  // Primary Action Button Click Handler
  btnPrimaryAction.addEventListener('click', () => {
    if (!currentProposal) {
      alert('Please select a preset and click "Generate Proposal" first.');
      return;
    }

    if (currentProposal.status === 'draft') {
      submitForApproval();
    } else if (currentProposal.status === 'pending_approval') {
      openDrawer(overlaySlack);
    } else if (currentProposal.status === 'approved') {
      deliverToClient();
    } else if (currentProposal.status === 'delivered') {
      openDrawer(overlayDelivery);
    }
  });

  // --- Submit for Approval (Upgrade A: Slack Dispatch) ---
  async function submitForApproval() {
    if (!currentProposal) return;
    try {
      const res = await fetch(`/api/proposals/${currentProposal.id}/submit-for-approval`, {
        method: 'POST',
        headers: getActiveHeaders(),
        body: JSON.stringify({ actor: currentProposal.salesperson_name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Submission failed');

      currentProposal = data.proposal;
      renderProposal(currentProposal);

      // Open Slack Inspector Drawer with dispatch proof
      if (data.slack_dispatch) {
        document.getElementById('slack-raw-json').textContent = JSON.stringify(data.slack_dispatch.payload || data.slack_dispatch, null, 2);
      }
      openDrawer(overlaySlack);
    } catch (err) {
      alert('Submission Error: ' + err.message);
    }
  }

  // --- Sync Slack Inspector Card ---
  function syncSlackCard(proposal) {
    document.getElementById('slack-headline').textContent = `🔔 Proposal Pending Approval: ${proposal.company_name}`;
    document.getElementById('slack-val-client').textContent = `${proposal.company_name} (${proposal.client_name})`;
    document.getElementById('slack-val-price').textContent = proposal.intake_data?.estimated_pricing || '$48,000 USD';
    document.getElementById('slack-val-author').textContent = proposal.salesperson_name || 'Sarah Chen';
    document.getElementById('slack-val-version').textContent = `v${proposal.version || 1}`;
    document.getElementById('slack-val-summary').textContent = proposal.intake_data?.project_scope ? proposal.intake_data.project_scope.slice(0, 120) + '...' : 'Automated workflow implementation.';

    const approveBtn = document.getElementById('btn-slack-approve');
    if (proposal.status === 'approved' || proposal.status === 'delivered') {
      approveBtn.textContent = `✓ Approved by ${proposal.approval?.approved_by || 'Marcus Vance (Manager)'}`;
      approveBtn.disabled = true;
      approveBtn.style.background = '#4A154B';
    } else {
      approveBtn.textContent = '✅ Sign Off & Approve Proposal';
      approveBtn.disabled = false;
      approveBtn.style.background = '#007A5A';
    }
  }

  // --- Manager Sign-Off (Scenario 5 - Four-Eyes Gate) ---
  document.getElementById('btn-slack-approve').addEventListener('click', async () => {
    if (!currentProposal) return;
    try {
      const res = await fetch(`/api/proposals/${currentProposal.id}/approve`, {
        method: 'POST',
        headers: getActiveHeaders(),
        body: JSON.stringify({
          feedback_notes: 'Commercial terms, timeline, and scope reviewed and approved by management.'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Approval failed');
      }

      currentProposal = data.proposal;
      renderProposal(currentProposal);

      // Flash success on button and close drawer
      const btn = document.getElementById('btn-slack-approve');
      btn.textContent = '✓ Approved!';
      setTimeout(() => {
        closeDrawer(overlaySlack);
      }, 700);
    } catch (err) {
      alert(`⚠️ Governance Gate (HTTP 403 Forbidden):\n\n${err.message}\n\nTip: Click the User Session profile in the topbar to authenticate as 'Marcus Vance (Sales Manager)' with password.`);
    }
  });

  document.getElementById('btn-slack-view-doc').addEventListener('click', () => {
    closeDrawer(overlaySlack);
  });

  // --- Live Slack Integration Status & Test Ping ---
  const slackStatusIndicator = document.getElementById('slack-status-indicator');
  const slackModeBadge = document.getElementById('slack-mode-badge');
  const slackStatusDetails = document.getElementById('slack-status-details');
  const slackTargetChannel = document.getElementById('slack-target-channel');
  const btnTestSlackPing = document.getElementById('btn-test-slack-ping');
  const slackTestFeedback = document.getElementById('slack-test-feedback');

  async function checkSlackStatus() {
    if (!slackStatusIndicator) return;
    try {
      const res = await fetch('/api/slack/status');
      const data = await res.json();

      if (data.configured && data.ok) {
        slackStatusIndicator.style.background = '#10B981';
        slackModeBadge.textContent = `${data.team} (#${data.default_channel})`;
        slackModeBadge.style.background = '#ECFDF5';
        slackModeBadge.style.color = '#065F46';
        slackStatusDetails.innerHTML = `<strong>Bot User:</strong> @${data.bot_user} &bull; <strong>Workspace:</strong> <a href="${data.team_url}" target="_blank" style="color: #4A154B; text-decoration: underline;">${data.team}</a><br>Dual webhook & bot token dispatch ready.`;
        if (slackTargetChannel && !slackTargetChannel.value) {
          slackTargetChannel.value = data.default_channel || 'general';
        }
      } else if (data.configured && !data.ok) {
        slackStatusIndicator.style.background = '#F59E0B';
        slackModeBadge.textContent = 'Auth Issue';
        slackModeBadge.style.background = '#FEF3C7';
        slackModeBadge.style.color = '#92400E';
        slackStatusDetails.textContent = `Slack API returned: ${data.error || 'Check SLACK_BOT_TOKEN'}`;
      } else {
        slackStatusIndicator.style.background = '#94A3B8';
        slackModeBadge.textContent = 'Not Configured';
        slackModeBadge.style.background = '#F1F5F9';
        slackModeBadge.style.color = '#64748B';
        slackStatusDetails.textContent = 'Set SLACK_BOT_TOKEN or SLACK_WEBHOOK_URL in .env to activate.';
      }
    } catch (err) {
      if (slackStatusDetails) slackStatusDetails.textContent = 'Could not verify Slack status.';
    }
  }

  if (btnTestSlackPing) {
    btnTestSlackPing.addEventListener('click', async () => {
      const channel = (slackTargetChannel ? slackTargetChannel.value.trim() : 'general') || 'general';
      btnTestSlackPing.disabled = true;
      btnTestSlackPing.innerHTML = '<span>⏳ Sending...</span>';
      if (slackTestFeedback) {
        slackTestFeedback.style.display = 'none';
      }

      try {
        const res = await fetch('/api/slack/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel })
        });
        const data = await res.json();

        if (slackTestFeedback) {
          slackTestFeedback.style.display = 'block';
          if (data.result && data.result.dispatched) {
            slackTestFeedback.style.background = '#ECFDF5';
            slackTestFeedback.style.border = '1px solid #A7F3D0';
            slackTestFeedback.style.color = '#065F46';
            slackTestFeedback.innerHTML = `✅ <strong>Message Delivered!</strong> Successfully dispatched to Slack <strong>#${data.result.channel?.replace('#', '')}</strong>. Check your Slack channel now.`;
          } else if (data.result && data.result.error === 'not_in_channel') {
            slackTestFeedback.style.background = '#FFFBEB';
            slackTestFeedback.style.border = '1px solid #FDE68A';
            slackTestFeedback.style.color = '#92400E';
            slackTestFeedback.innerHTML = `⚠️ <strong>Bot not yet invited to #${channel}:</strong><br>In your Slack workspace, go to <strong>#${channel}</strong> and type:<br><code style="background: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #e2e8f0; display: inline-block; margin-top: 4px;">/invite @koya_proposal_studio</code><br>Then click <strong>Send Test Ping</strong> again.`;
          } else {
            slackTestFeedback.style.background = '#FEF2F2';
            slackTestFeedback.style.border = '1px solid #FECACA';
            slackTestFeedback.style.color = '#991B1B';
            slackTestFeedback.innerHTML = `❌ <strong>Slack Error:</strong> ${data.result?.error || 'Dispatch failed'}`;
          }
        }
      } catch (err) {
        if (slackTestFeedback) {
          slackTestFeedback.style.display = 'block';
          slackTestFeedback.style.background = '#FEF2F2';
          slackTestFeedback.style.border = '1px solid #FECACA';
          slackTestFeedback.style.color = '#991B1B';
          slackTestFeedback.textContent = 'Network error contacting Slack endpoint: ' + err.message;
        }
      } finally {
        btnTestSlackPing.disabled = false;
        btnTestSlackPing.innerHTML = '<span>⚡ Send Test Ping</span>';
      }
    });
  }

  // --- Deliver Proposal to Client (Scenario 6) ---
  async function deliverToClient() {
    if (!currentProposal) return;

    try {
      const res = await fetch(`/api/proposals/${currentProposal.id}/deliver`, {
        method: 'POST',
        headers: getActiveHeaders(),
        body: JSON.stringify({
          client_email: currentProposal.client_email,
          actor: currentProposal.salesperson_name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        // Enforce hard state machine 403 Forbidden!
        throw new Error(data.message || data.error);
      }

      currentProposal = data.proposal;
      renderProposal(currentProposal);

      // Open Client Delivery Drawer
      openDrawer(overlayDelivery);
    } catch (err) {
      alert(`Approval Gate Enforced: ${err.message}`);
    }
  }

  // --- Sync Delivery Drawer ---
  function syncDeliveryDrawer(proposal) {
    const isApproved = proposal.status === 'approved' || proposal.status === 'delivered';
    const isDelivered = proposal.status === 'delivered';

    const banner = document.getElementById('delivery-status-banner');
    const bannerText = document.getElementById('delivery-banner-text');

    if (isDelivered) {
      banner.style.background = 'var(--status-delivered-bg)';
      banner.style.borderColor = 'var(--status-delivered-border)';
      bannerText.textContent = `✓ Delivered to ${proposal.client_email} (Audit Logged)`;
      bannerText.style.color = 'var(--status-delivered-text)';
    } else if (isApproved) {
      banner.style.background = 'var(--status-approved-bg)';
      banner.style.borderColor = 'var(--status-approved-border)';
      bannerText.textContent = 'Proposal is Formally Approved and Ready for Client Release';
      bannerText.style.color = 'var(--status-approved-text)';
    } else {
      banner.style.background = 'var(--status-review-bg)';
      banner.style.borderColor = 'var(--status-review-border)';
      bannerText.textContent = '⚠️ Proposal is in DRAFT — Requires Management Sign-off Before Client Delivery';
      bannerText.style.color = 'var(--status-review-text)';
    }

    document.getElementById('email-preview-to').textContent = proposal.client_email || 'client@example.com';
    document.getElementById('email-preview-subject').textContent = `Proposal: ${proposal.title || proposal.company_name} — Koya Talent Solutions`;

    const clientUrl = `${window.location.origin}/client-view.html?id=${proposal.id}`;
    document.getElementById('btn-open-client-portal').href = clientUrl;
    document.getElementById('btn-view-client-pdf').onclick = () => window.open(clientUrl, '_blank');

    const emlDownloadBtn = document.getElementById('btn-download-eml');
    emlDownloadBtn.href = `/api/proposals/${proposal.id}/export-eml`;

    // Email Body Template Preview
    document.getElementById('email-preview-body').textContent =
`Hi ${proposal.client_name},

Thank you again for speaking with us regarding ${proposal.company_name}'s upcoming initiatives. Based on our discovery conversation, I have prepared a customized proposal outlining our recommended approach, scope deliverables, timeline, and commercial terms.

You can review the full interactive proposal and PDF presentation here:
${clientUrl}

Key Highlights:
• Value & Valuation: ${proposal.intake_data?.estimated_pricing || '$48,000 USD'}
• Implementation Schedule: ${proposal.intake_data?.proposed_timeline || '8 Weeks'}
• Recommended Services: ${proposal.intake_data?.recommended_services || 'Systems Integration & Automation'}

Please let me know if you would like to make any adjustments or if you have any questions. Looking forward to partnering with your team.

Best regards,

${proposal.salesperson_name}
Koya Talent Solutions`;
  }

  // --- Copy Email to Clipboard ---
  document.getElementById('btn-copy-email').addEventListener('click', () => {
    const text = document.getElementById('email-preview-body').textContent;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy-email');
      const original = btn.innerHTML;
      btn.innerHTML = '<span>✓ Copied to Clipboard!</span>';
      setTimeout(() => { btn.innerHTML = original; }, 2000);
    });
  });

  // --- Section Hover Actions: Edit & Regenerate ---
  document.querySelectorAll('.btn-sec-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!currentProposal) return;
      activeSectionKey = e.target.dataset.section;
      modalEditTitle.textContent = `Edit Section: ${activeSectionKey.replace('_', ' ').toUpperCase()}`;
      editContentTextarea.value = currentProposal.sections[activeSectionKey] || '';
      openModal(modalEdit);
    });
  });

  btnSaveEdit.addEventListener('click', async () => {
    if (!currentProposal || !activeSectionKey) return;
    const updatedContent = editContentTextarea.value.trim();

    try {
      const res = await fetch(`/api/proposals/${currentProposal.id}/section`, {
        method: 'PUT',
        headers: getActiveHeaders(),
        body: JSON.stringify({
          section_key: activeSectionKey,
          content: updatedContent,
          actor: currentProposal.salesperson_name || 'Salesperson'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update section');

      currentProposal = data.proposal;
      renderProposal(currentProposal);
      closeModal(modalEdit);

      if (data.tamper_guard_triggered) {
        alert('State Machine Tamper Guard Triggered:\nBecause this proposal was modified after approval, its approval status was automatically revoked and reverted to DRAFT.');
      }
    } catch (err) {
      alert('Edit Error: ' + err.message);
    }
  });

  // --- Section Regeneration (Scenario 4) ---
  document.querySelectorAll('.btn-sec-regen').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!currentProposal) return;
      activeSectionKey = e.target.dataset.section;
      modalRegenTitle.textContent = `Regenerate Section: ${activeSectionKey.replace('_', ' ').toUpperCase()}`;
      regenInstruction.value = activeSectionKey === 'timeline'
        ? 'Compress this implementation into a 4-week fast-track agile sprint model with 3 phases.'
        : 'Refine and strengthen this section with executive clarity and concise deliverables.';
      openModal(modalRegen);
    });
  });

  btnConfirmRegen.addEventListener('click', async () => {
    if (!currentProposal || !activeSectionKey) return;

    btnConfirmRegen.disabled = true;
    btnRegenSpinner.style.display = 'inline-block';
    btnRegenText.textContent = 'Regenerating with Claude...';

    try {
      const res = await fetch(`/api/proposals/${currentProposal.id}/regenerate-section`, {
        method: 'POST',
        headers: getActiveHeaders(),
        body: JSON.stringify({
          section_key: activeSectionKey,
          instruction: regenInstruction.value.trim() || 'Refine this section.',
          actor: currentProposal.salesperson_name || 'Salesperson'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Section regeneration failed');

      currentProposal = data.proposal;
      renderProposal(currentProposal);

      // Subtle flash on target section
      const targetContainer = document.getElementById(`content-${activeSectionKey}`);
      if (targetContainer) {
        targetContainer.parentElement.style.background = '#ECFDF5';
        setTimeout(() => { targetContainer.parentElement.style.background = ''; }, 1500);
      }

      closeModal(modalRegen);
    } catch (err) {
      alert('Section Regen Error: ' + err.message);
    } finally {
      btnConfirmRegen.disabled = false;
      btnRegenSpinner.style.display = 'none';
      btnRegenText.textContent = 'Regenerate Section';
    }
  });

  // --- Audit Ledger & Diagnostics Drawer ---
  btnOpenAudit.addEventListener('click', () => {
    loadAuditLedger();
    openDrawer(overlayAudit);
  });

  async function loadAuditLedger() {
    if (!currentProposal) {
      document.getElementById('audit-timeline-list').innerHTML = '<div class="timeline-empty">No active proposal. Generate or select a proposal first.</div>';
      document.getElementById('proposal-raw-json').textContent = 'No active proposal.';
      return;
    }

    try {
      const res = await fetch(`/api/proposals/${currentProposal.id}`);
      const data = await res.json();

      document.getElementById('proposal-raw-json').textContent = JSON.stringify(data.proposal, null, 2);

      const list = document.getElementById('audit-timeline-list');
      list.innerHTML = '';

      if (!data.audit_logs || data.audit_logs.length === 0) {
        list.innerHTML = '<div class="timeline-empty">No audit events recorded yet.</div>';
        return;
      }

      data.audit_logs.forEach(l => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
          <div class="timeline-time">${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          <div class="timeline-body">
            <div class="timeline-type">${l.event_type.replace(/_/g, ' ').toUpperCase()}</div>
            <div class="timeline-msg">${JSON.stringify(l.details || {})} <span style="color:var(--text-muted);">by ${l.actor}</span></div>
          </div>
        `;
        list.appendChild(item);
      });
    } catch (err) {
      console.error('Audit load error:', err);
    }
  }

  // --- Failure Handling Simulator (Scenario 7) ---
  const diagOutput = document.getElementById('diag-output');

  document.getElementById('btn-sim-timeout').addEventListener('click', async () => {
    if (!currentProposal) return alert('Please generate a proposal first.');
    try {
      const res = await fetch(`/api/proposals/${currentProposal.id}/simulate-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failure_type: 'claude_timeout' })
      });
      const data = await res.json();
      diagOutput.style.display = 'block';
      diagOutput.textContent = `[HTTP ${res.status}] DIAGNOSTIC TRACE LOGGED:\n${JSON.stringify(data, null, 2)}`;
      loadAuditLedger();
    } catch (e) {
      diagOutput.textContent = e.message;
    }
  });

  document.getElementById('btn-sim-bounce').addEventListener('click', async () => {
    if (!currentProposal) return alert('Please generate a proposal first.');
    try {
      const res = await fetch(`/api/proposals/${currentProposal.id}/simulate-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failure_type: 'delivery_bounced' })
      });
      const data = await res.json();
      diagOutput.style.display = 'block';
      diagOutput.textContent = `[HTTP ${res.status}] DELIVERY BOUNCE TRACE LOGGED:\n${JSON.stringify(data, null, 2)}`;
      loadAuditLedger();
    } catch (e) {
      diagOutput.textContent = e.message;
    }
  });

  document.getElementById('btn-test-tamper').addEventListener('click', async () => {
    if (!currentProposal) return alert('Please generate a proposal first.');
    try {
      const res = await fetch(`/api/proposals/${currentProposal.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_email: 'tamper@unapproved.com', actor: 'Bypass Attempter' })
      });
      const data = await res.json();
      diagOutput.style.display = 'block';
      diagOutput.textContent = `[HTTP ${res.status} FORBIDDEN] APPROVAL ENFORCEMENT TRACE:\n${JSON.stringify(data, null, 2)}`;
      loadAuditLedger();
    } catch (e) {
      diagOutput.textContent = e.message;
    }
  });

  // --- Drawer Open & Close Utility ---
  function openDrawer(drawerOverlay) {
    drawerOverlay.classList.add('open');
  }

  function closeDrawer(drawerOverlay) {
    drawerOverlay.classList.remove('open');
  }

  btnOpenSlack.addEventListener('click', () => {
    checkSlackStatus();
    openDrawer(overlaySlack);
  });
  btnCloseSlack.addEventListener('click', () => closeDrawer(overlaySlack));
  btnCloseAudit.addEventListener('click', () => closeDrawer(overlayAudit));
  btnCloseDelivery.addEventListener('click', () => closeDrawer(overlayDelivery));
  btnExportEmailAction.addEventListener('click', () => openDrawer(overlayDelivery));

  // Close drawers when clicking outside panel
  [overlaySlack, overlayDelivery, overlayAudit].forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDrawer(overlay);
    });
  });

  // --- Modal Open & Close Utility ---
  function openModal(modalOverlay) {
    modalOverlay.classList.add('open');
  }

  function closeModal(modalOverlay) {
    modalOverlay.classList.remove('open');
  }

  btnCloseModalRegen.addEventListener('click', () => closeModal(modalRegen));
  btnCancelRegen.addEventListener('click', () => closeModal(modalRegen));
  btnCloseModalEdit.addEventListener('click', () => closeModal(modalEdit));
  btnCancelEdit.addEventListener('click', () => closeModal(modalEdit));

  [modalRegen, modalEdit].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Global Escape Key Listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [overlaySlack, overlayDelivery, overlayAudit, modalRegen, modalEdit].forEach(el => el.classList.remove('open'));
    }
  });

  // --- Supabase Cloud Sync Health Ping ---
  async function pingSupabase() {
    try {
      const res = await fetch('/api/sync/status');
      const data = await res.json();
      if (data.supabase && data.supabase.connected) {
        cloudStatusPill.innerHTML = `<span class="cloud-dot" style="background:#10B981;"></span><span class="cloud-text">Supabase: Connected</span>`;
        cloudStatusPill.style.background = '#ECFDF5';
        cloudStatusPill.style.borderColor = '#A7F3D0';
        cloudStatusPill.style.color = '#047857';
      } else {
        cloudStatusPill.innerHTML = `<span class="cloud-dot" style="background:#F59E0B;"></span><span class="cloud-text">Supabase: Local</span>`;
      }
    } catch (e) {
      cloudStatusPill.innerHTML = `<span class="cloud-dot" style="background:#94A3B8;"></span><span class="cloud-text">Supabase: Standby</span>`;
    }
  }

  pingSupabase();
  checkSlackStatus();

});
