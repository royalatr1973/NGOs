/**
 * NGO Directory India — Main Application JavaScript
 */

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  ngos: [],
  filtered: [],
  currentPage: 1,
  perPage: 9,
  filters: {
    search: '',
    category: '',
    state: '',
    registrationType: '',
    fcra: '',
    verified: '',
    sort: 'name'
  }
};

// ── Data Loading ─────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch('data/ngos.json');
    const data = await res.json();
    state.ngos = data.ngos;
    state.filtered = [...data.ngos];
    return data;
  } catch (e) {
    console.error('Failed to load NGO data:', e);
    return null;
  }
}

// ── Filtering & Sorting ───────────────────────────────────────────────────────
function applyFilters() {
  const { search, category, state: stateFilter, registrationType, fcra, verified, sort } = state.filters;

  let result = [...state.ngos];

  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter(n =>
      n.name.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      n.location.city.toLowerCase().includes(q) ||
      n.location.state.toLowerCase().includes(q) ||
      n.category.some(c => c.toLowerCase().includes(q)) ||
      (n.tagline && n.tagline.toLowerCase().includes(q))
    );
  }

  if (category) {
    result = result.filter(n =>
      n.category.some(c => c.toLowerCase() === category.toLowerCase())
    );
  }

  if (stateFilter) {
    result = result.filter(n =>
      n.location.state === stateFilter ||
      n.operations.statesOfOperation.includes(stateFilter)
    );
  }

  if (registrationType) {
    result = result.filter(n => n.registrationType === registrationType);
  }

  if (fcra === 'yes') result = result.filter(n => n.financials.fcraRegistered);
  if (fcra === 'no') result = result.filter(n => !n.financials.fcraRegistered);

  if (verified === 'yes') result = result.filter(n => n.verified);

  // Sort
  result.sort((a, b) => {
    switch (sort) {
      case 'name': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'rating': return (b.rating || 0) - (a.rating || 0);
      case 'year-asc': return a.yearFounded - b.yearFounded;
      case 'year-desc': return b.yearFounded - a.yearFounded;
      default: return 0;
    }
  });

  state.filtered = result;
  state.currentPage = 1;
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = '';
  for (let i = 0; i < full; i++) stars += '★';
  if (half) stars += '½';
  for (let i = Math.ceil(rating); i < 5; i++) stars += '☆';
  return stars;
}

function renderNGOCard(ngo) {
  const initials = ngo.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const categories = ngo.category.slice(0, 2).map(c =>
    `<span class="ngo-tag">${c}</span>`
  ).join('');

  return `
    <article class="ngo-card animate-fadeInUp" onclick="window.location='ngo-profile.html?id=${ngo.id}'" style="cursor:pointer">
      <div class="ngo-card-header">
        <div class="ngo-logo-placeholder" style="background:${getGradient(ngo.id)}">
          ${initials}
        </div>
        <div class="ngo-card-title-area">
          <h3 class="ngo-name">${ngo.name}${ngo.verified ? ' <span class="ngo-verified" title="Verified NGO">✓</span>' : ''}</h3>
          <div class="ngo-location">
            <span>📍</span>
            <span>${ngo.location.city}, ${ngo.location.state}</span>
          </div>
        </div>
      </div>
      <div class="ngo-card-body">
        <p class="ngo-description">${ngo.description}</p>
        <div class="ngo-tags">${categories}${ngo.financials.fcraRegistered ? '<span class="badge badge-success" style="font-size:0.72rem">FCRA</span>' : ''}</div>
        <div class="ngo-stats-row">
          <div class="ngo-stat-item">
            <span class="ngo-stat-val">${ngo.yearFounded}</span>
            <span class="ngo-stat-key">Founded</span>
          </div>
          <div class="ngo-stat-item">
            <span class="ngo-stat-val">${ngo.operations.statesOfOperation.length}</span>
            <span class="ngo-stat-key">States</span>
          </div>
          <div class="ngo-stat-item">
            <span class="ngo-stat-val">${ngo.impact.totalBeneficiaries}</span>
            <span class="ngo-stat-key">Beneficiaries</span>
          </div>
        </div>
      </div>
      <div class="ngo-card-footer">
        <div class="ngo-rating">
          <span class="stars">${renderStars(ngo.rating)}</span>
          <span>${ngo.rating} (${ngo.reviewCount})</span>
        </div>
        <a href="ngo-profile.html?id=${ngo.id}" class="btn btn-outline btn-sm" onclick="event.stopPropagation()">
          View Details →
        </a>
      </div>
    </article>
  `;
}

function renderNGOGrid(container) {
  if (!container) return;
  const start = (state.currentPage - 1) * state.perPage;
  const pageItems = state.filtered.slice(start, start + state.perPage);

  if (pageItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <h3>No NGOs Found</h3>
        <p>Try adjusting your search or filter criteria.</p>
        <button class="btn btn-outline mt-4" onclick="clearFilters()">Clear All Filters</button>
      </div>
    `;
    return;
  }

  container.innerHTML = pageItems.map(renderNGOCard).join('');
  updateResultCount();
  renderPagination();
}

function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container) return;
  const totalPages = Math.ceil(state.filtered.length / state.perPage);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  if (state.currentPage > 1) {
    html += `<button class="page-btn" onclick="goToPage(${state.currentPage - 1})">‹</button>`;
  }
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - state.currentPage) <= 1) {
      html += `<button class="page-btn${i === state.currentPage ? ' active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (Math.abs(i - state.currentPage) === 2) {
      html += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
    }
  }
  if (state.currentPage < totalPages) {
    html += `<button class="page-btn" onclick="goToPage(${state.currentPage + 1})">›</button>`;
  }
  container.innerHTML = html;
}

function goToPage(page) {
  state.currentPage = page;
  renderNGOGrid(document.getElementById('ngo-grid'));
  window.scrollTo({ top: document.getElementById('ngo-grid')?.offsetTop - 120, behavior: 'smooth' });
}

function updateResultCount() {
  const el = document.getElementById('result-count');
  if (el) el.textContent = `Showing ${state.filtered.length} NGO${state.filtered.length !== 1 ? 's' : ''}`;
}

// ── Utility ──────────────────────────────────────────────────────────────────
function getGradient(id) {
  const gradients = [
    'linear-gradient(135deg,#2563eb,#0891b2)',
    'linear-gradient(135deg,#dc2626,#ea580c)',
    'linear-gradient(135deg,#7c3aed,#2563eb)',
    'linear-gradient(135deg,#059669,#0891b2)',
    'linear-gradient(135deg,#d97706,#dc2626)',
    'linear-gradient(135deg,#0891b2,#059669)',
    'linear-gradient(135deg,#7c3aed,#db2777)',
    'linear-gradient(135deg,#16a34a,#0891b2)',
    'linear-gradient(135deg,#1d4ed8,#7c3aed)',
    'linear-gradient(135deg,#b91c1c,#7c3aed)',
    'linear-gradient(135deg,#f59e0b,#ea580c)',
    'linear-gradient(135deg,#15803d,#16a34a)',
  ];
  const num = parseInt(id.replace('NGO', '')) - 1;
  return gradients[num % gradients.length];
}

function clearFilters() {
  state.filters = { search: '', category: '', state: '', registrationType: '', fcra: '', verified: '', sort: 'name' };
  // Reset UI elements
  ['search-input', 'filter-category', 'filter-state', 'filter-type', 'filter-fcra', 'sort-select'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  applyFilters();
  renderNGOGrid(document.getElementById('ngo-grid'));
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
}

// ── Search & Filter Event Bindings ─────────────────────────────────────────
function bindFilters() {
  // Search
  const searchInput = document.getElementById('search-input');
  const heroSearchInput = document.getElementById('hero-search-input');

  if (searchInput) {
    searchInput.addEventListener('input', debounce(e => {
      state.filters.search = e.target.value;
      applyFilters();
      renderNGOGrid(document.getElementById('ngo-grid'));
    }, 300));
  }

  if (heroSearchInput) {
    heroSearchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        window.location.href = `directory.html?search=${encodeURIComponent(e.target.value)}`;
      }
    });
  }

  ['filter-category', 'filter-state', 'filter-type', 'filter-fcra'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', e => {
      const key = id.replace('filter-', '');
      state.filters[key === 'type' ? 'registrationType' : key] = e.target.value;
      applyFilters();
      renderNGOGrid(document.getElementById('ngo-grid'));
    });
  });

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', e => {
      state.filters.sort = e.target.value;
      applyFilters();
      renderNGOGrid(document.getElementById('ngo-grid'));
    });
  }

  // Category chips
  document.querySelectorAll('.filter-chip[data-cat]').forEach(chip => {
    chip.addEventListener('click', () => {
      const isActive = chip.classList.toggle('active');
      state.filters.category = isActive ? chip.dataset.cat : '';
      document.querySelectorAll('.filter-chip[data-cat]').forEach(c => {
        if (c !== chip) c.classList.remove('active');
      });
      if (!isActive) state.filters.category = '';
      applyFilters();
      renderNGOGrid(document.getElementById('ngo-grid'));
    });
  });
}

// ── NGO Profile Page ──────────────────────────────────────────────────────────
function renderProfile(ngoId) {
  const ngo = state.ngos.find(n => n.id === ngoId);
  if (!ngo) {
    document.getElementById('profile-content').innerHTML = `
      <div class="empty-state section">
        <div class="empty-icon">😕</div>
        <h3>NGO Not Found</h3>
        <p>The requested NGO profile could not be found.</p>
        <a href="directory.html" class="btn btn-primary mt-4">Browse Directory</a>
      </div>
    `;
    return;
  }

  document.title = `${ngo.name} — NGO Directory India`;

  const initials = ngo.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  // Breadcrumb
  const bc = document.getElementById('profile-breadcrumb');
  if (bc) bc.innerHTML = `
    <a href="index.html">Home</a>
    <span class="breadcrumb-sep">›</span>
    <a href="directory.html">Directory</a>
    <span class="breadcrumb-sep">›</span>
    <span class="breadcrumb-current">${ngo.name}</span>
  `;

  // Header
  const header = document.getElementById('profile-header');
  if (header) header.innerHTML = `
    <div class="profile-logo-placeholder" style="background:${getGradient(ngo.id)}">${initials}</div>
    <div style="flex:1">
      <h1 class="profile-title">${ngo.name} ${ngo.verified ? '<span title="Verified" style="font-size:1.2rem">✓</span>' : ''}</h1>
      <p class="profile-tagline">${ngo.tagline || ''}</p>
      <div class="profile-badges">
        ${ngo.category.map(c => `<span class="profile-badge">${c}</span>`).join('')}
        ${ngo.financials.fcraRegistered ? '<span class="profile-badge">FCRA Registered</span>' : ''}
        ${ngo.financials.registration80G ? '<span class="profile-badge">80G Approved</span>' : ''}
        <span class="profile-badge">${ngo.registrationType}</span>
        <span class="profile-badge">Est. ${ngo.yearFounded}</span>
      </div>
    </div>
    <div style="text-align:center;color:#fff">
      <div style="font-size:2rem;font-weight:800;font-family:'Poppins',sans-serif">${ngo.rating}</div>
      <div style="color:rgba(255,255,255,0.8);font-size:0.85rem;margin-top:4px">★ Rating (${ngo.reviewCount} reviews)</div>
    </div>
  `;

  // Main content
  const main = document.getElementById('profile-main');
  if (main) main.innerHTML = `
    <!-- About -->
    <div class="info-card">
      <h3 class="info-card-title">📋 About the Organization</h3>
      <p style="color:var(--text-medium);line-height:1.8;font-size:0.95rem">${ngo.description}</p>
    </div>

    <!-- Key Stats -->
    <div class="info-card">
      <h3 class="info-card-title">📊 Key Statistics</h3>
      <div class="stat-blocks">
        <div class="stat-block">
          <div class="stat-block-value">${ngo.impact.totalBeneficiaries}</div>
          <div class="stat-block-label">Total Beneficiaries</div>
        </div>
        <div class="stat-block">
          <div class="stat-block-value">${ngo.impact.yearlyBeneficiaries}</div>
          <div class="stat-block-label">Annual Beneficiaries</div>
        </div>
        <div class="stat-block">
          <div class="stat-block-value">${ngo.operations.statesOfOperation.length}</div>
          <div class="stat-block-label">States Covered</div>
        </div>
        <div class="stat-block">
          <div class="stat-block-value">${ngo.operations.projectsCount}</div>
          <div class="stat-block-label">Active Projects</div>
        </div>
        <div class="stat-block">
          <div class="stat-block-value">${(ngo.operations.volunteersCount || 0).toLocaleString()}</div>
          <div class="stat-block-label">Volunteers</div>
        </div>
        <div class="stat-block">
          <div class="stat-block-value">${(ngo.operations.staffCount || 0).toLocaleString()}</div>
          <div class="stat-block-label">Staff Members</div>
        </div>
        <div class="stat-block">
          <div class="stat-block-value">${ngo.operations.districtsReached || 'N/A'}</div>
          <div class="stat-block-label">Districts Reached</div>
        </div>
        <div class="stat-block">
          <div class="stat-block-value">${ngo.yearFounded}</div>
          <div class="stat-block-label">Year Founded</div>
        </div>
      </div>
    </div>

    <!-- Key Achievements -->
    <div class="info-card">
      <h3 class="info-card-title">🏆 Key Achievements & Impact</h3>
      <ul class="achievement-list">
        ${ngo.impact.keyAchievements.map(a => `<li class="achievement-item">${a}</li>`).join('')}
      </ul>
    </div>

    <!-- Areas of Operation -->
    <div class="info-card">
      <h3 class="info-card-title">⚙️ Areas of Operation</h3>
      <div class="ngo-tags" style="gap:8px">
        ${ngo.operations.areasOfOperation.map(a => `<span class="badge badge-primary" style="font-size:0.82rem;padding:6px 14px">${a}</span>`).join('')}
      </div>
    </div>

    <!-- States -->
    <div class="info-card">
      <h3 class="info-card-title">🗺️ States of Operation</h3>
      <div class="state-grid">
        ${ngo.operations.statesOfOperation.map(s => `<span class="state-chip">${s}</span>`).join('')}
      </div>
    </div>

    <!-- SDG Goals -->
    <div class="info-card">
      <h3 class="info-card-title">🌍 UN Sustainable Development Goals</h3>
      <div class="sdg-grid">
        ${(ngo.sdgGoals || []).map(g => `<span class="sdg-badge" style="background:${getSDGColor(g)}">SDG ${g}</span>`).join('')}
      </div>
      <p class="mt-4" style="font-size:0.82rem;color:var(--text-light)">This organization contributes to the above UN SDGs.</p>
    </div>

    <!-- Leadership -->
    <div class="info-card">
      <h3 class="info-card-title">👤 Leadership</h3>
      <div class="info-row">
        <span class="info-label">Founder</span>
        <span class="info-value">${ngo.leadership.founderName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">CEO / Head</span>
        <span class="info-value">${ngo.leadership.ceoName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Founder Bio</span>
        <span class="info-value" style="color:var(--text-light)">${ngo.leadership.founderBio}</span>
      </div>
      ${ngo.leadership.boardMembers && ngo.leadership.boardMembers.length ? `
      <div class="info-row">
        <span class="info-label">Board Members</span>
        <span class="info-value">${ngo.leadership.boardMembers.join(', ')}</span>
      </div>` : ''}
    </div>

    <!-- Awards -->
    ${ngo.awards && ngo.awards.length ? `
    <div class="info-card">
      <h3 class="info-card-title">🥇 Awards & Recognition</h3>
      <ul class="achievement-list">
        ${ngo.awards.map(a => `<li class="achievement-item">${a}</li>`).join('')}
      </ul>
    </div>` : ''}

    <!-- Certifications -->
    ${ngo.certifications && ngo.certifications.length ? `
    <div class="info-card">
      <h3 class="info-card-title">📜 Certifications</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${ngo.certifications.map(c => `<span class="badge badge-success" style="font-size:0.82rem;padding:6px 14px">${c}</span>`).join('')}
      </div>
    </div>` : ''}
  `;

  // Sidebar
  const sidebar = document.getElementById('profile-sidebar');
  if (sidebar) sidebar.innerHTML = `
    <!-- Donate CTA -->
    <div class="donate-card">
      <h4>Support ${ngo.name.split(' ')[0]}</h4>
      <p>Your contribution directly benefits ${ngo.operations.beneficiaries}.</p>
      <a href="${ngo.contact.website}" target="_blank" rel="noopener" class="btn btn-white btn-lg" style="width:100%;justify-content:center">Donate Now</a>
    </div>

    <!-- Registration Info -->
    <div class="sidebar-widget">
      <div class="sidebar-widget-title">🏛️ Registration Details</div>
      <div class="contact-item">
        <span class="contact-icon">📋</span>
        <div><strong>Type:</strong> ${ngo.registrationType}</div>
      </div>
      <div class="contact-item">
        <span class="contact-icon">#</span>
        <div><strong>Reg. No.:</strong> ${ngo.registrationNumber}</div>
      </div>
      <div class="contact-item">
        <span class="contact-icon">📅</span>
        <div><strong>Founded:</strong> ${ngo.yearFounded}</div>
      </div>
      <div class="contact-item">
        <span class="contact-icon">✅</span>
        <div><strong>Status:</strong> <span style="color:var(--secondary);font-weight:600">${ngo.status}</span></div>
      </div>
    </div>

    <!-- Financial Info -->
    <div class="sidebar-widget">
      <div class="sidebar-widget-title">💰 Financial & Legal</div>
      <div class="contact-item">
        <span class="contact-icon">💵</span>
        <div><strong>Annual Budget:</strong> ${ngo.financials.annualBudget}</div>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${ngo.financials.fcraRegistered ? '✅' : '❌'}</span>
        <div>
          <strong>FCRA:</strong> ${ngo.financials.fcraRegistered ? 'Registered' : 'Not Registered'}
          ${ngo.financials.fcraRegistered && ngo.financials.fcraNumber !== 'N/A' ? `<br><small style="color:var(--text-light)">No. ${ngo.financials.fcraNumber}</small>` : ''}
        </div>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${ngo.financials.registration12A ? '✅' : '❌'}</span>
        <div><strong>12A:</strong> ${ngo.financials.registration12A ? 'Registered' : 'Not Registered'}</div>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${ngo.financials.registration80G ? '✅' : '❌'}</span>
        <div><strong>80G:</strong> ${ngo.financials.registration80G ? 'Approved (Tax Deductible Donations)' : 'Not Approved'}</div>
      </div>
      <div class="contact-item">
        <span class="contact-icon">📊</span>
        <div><strong>Accountability:</strong> <span style="color:var(--secondary);font-weight:600">${ngo.financials.accountabilityRating}</span></div>
      </div>
    </div>

    <!-- Contact -->
    <div class="sidebar-widget">
      <div class="sidebar-widget-title">📞 Contact Information</div>
      <div class="contact-item">
        <span class="contact-icon">📍</span>
        <div>${ngo.location.address}, ${ngo.location.city}, ${ngo.location.state} – ${ngo.location.pincode}</div>
      </div>
      ${ngo.contact.phone ? `
      <div class="contact-item">
        <span class="contact-icon">📱</span>
        <a href="tel:${ngo.contact.phone}" style="color:var(--primary)">${ngo.contact.phone}</a>
      </div>` : ''}
      ${ngo.contact.email ? `
      <div class="contact-item">
        <span class="contact-icon">✉️</span>
        <a href="mailto:${ngo.contact.email}" style="color:var(--primary)">${ngo.contact.email}</a>
      </div>` : ''}
      ${ngo.contact.website ? `
      <div class="contact-item">
        <span class="contact-icon">🌐</span>
        <a href="${ngo.contact.website}" target="_blank" rel="noopener" style="color:var(--primary)">${ngo.contact.website.replace('https://', '')}</a>
      </div>` : ''}
    </div>

    <!-- Social Media -->
    ${ngo.contact.socialMedia ? `
    <div class="sidebar-widget">
      <div class="sidebar-widget-title">🔗 Social Media</div>
      <div class="social-links">
        ${ngo.contact.socialMedia.facebook ? `<a href="#" class="social-link">Facebook</a>` : ''}
        ${ngo.contact.socialMedia.twitter ? `<a href="#" class="social-link">Twitter</a>` : ''}
        ${ngo.contact.socialMedia.instagram ? `<a href="#" class="social-link">Instagram</a>` : ''}
        ${ngo.contact.socialMedia.linkedin ? `<a href="#" class="social-link">LinkedIn</a>` : ''}
      </div>
    </div>` : ''}

    <!-- Beneficiaries -->
    <div class="sidebar-widget">
      <div class="sidebar-widget-title">👥 Beneficiaries</div>
      <p style="font-size:0.875rem;color:var(--text-medium);line-height:1.6">${ngo.operations.beneficiaries}</p>
    </div>

    <!-- Documents -->
    <div class="sidebar-widget">
      <div class="sidebar-widget-title">📁 Documents</div>
      <div class="contact-item">
        <span class="contact-icon">${ngo.documents.annualReport ? '✅' : '❌'}</span>
        <div>Annual Report: ${ngo.documents.annualReport || 'Not Available'}</div>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${ngo.documents.auditedAccounts ? '✅' : '❌'}</span>
        <div>Audited Accounts: ${ngo.documents.auditedAccounts ? 'Available' : 'Not Available'}</div>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${ngo.documents.fcraReturns ? '✅' : '❌'}</span>
        <div>FCRA Returns: ${ngo.documents.fcraReturns ? 'Filed' : 'N/A'}</div>
      </div>
    </div>
  `;
}

function getSDGColor(num) {
  const colors = {
    1:'#E5243B',2:'#DDA63A',3:'#4C9F38',4:'#C5192D',5:'#FF3A21',
    6:'#26BDE2',7:'#FCC30B',8:'#A21942',9:'#FD6925',10:'#DD1367',
    11:'#FD9D24',12:'#BF8B2E',13:'#3F7E44',14:'#0A97D9',15:'#56C02B',
    16:'#00689D',17:'#19486A'
  };
  return colors[num] || '#6b7280';
}

// ── Utility ──────────────────────────────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ── Navbar scroll effect ──────────────────────────────────────────────────────
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  });

  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
  }
}

// ── Counter Animation ─────────────────────────────────────────────────────────
function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  counters.forEach(el => {
    const target = parseInt(el.dataset.count);
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current).toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 16);
  });
}

// ── Category Cards on Index ───────────────────────────────────────────────────
function initCategoryCards() {
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.category;
      window.location.href = `directory.html?category=${encodeURIComponent(cat)}`;
    });
  });
}

// ── Featured NGOs on Index ────────────────────────────────────────────────────
function renderFeaturedNGOs() {
  const container = document.getElementById('featured-grid');
  if (!container || state.ngos.length === 0) return;
  const featured = state.ngos.slice(0, 6);
  container.innerHTML = featured.map(renderNGOCard).join('');
}

// ── Page Initialisation ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  const data = await loadData();
  if (!data) return;

  const page = document.body.dataset.page;

  if (page === 'index') {
    renderFeaturedNGOs();
    initCategoryCards();
    animateCounters();
  }

  if (page === 'directory') {
    // Pick up URL params
    const searchParam = getQueryParam('search');
    const categoryParam = getQueryParam('category');
    if (searchParam) { state.filters.search = searchParam; document.getElementById('search-input').value = searchParam; }
    if (categoryParam) {
      state.filters.category = categoryParam;
      const el = document.getElementById('filter-category');
      if (el) el.value = categoryParam;
    }
    applyFilters();
    renderNGOGrid(document.getElementById('ngo-grid'));
    bindFilters();
  }

  if (page === 'profile') {
    const id = getQueryParam('id');
    renderProfile(id);
  }
});
