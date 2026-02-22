// ============================================
// NGO Directory India - Application Logic
// ============================================

(function () {
  'use strict';

  // State
  let currentView = 'grid';
  let currentSection = 'directory';
  let searchQuery = '';
  let selectedSector = '';
  let selectedState = '';
  let selectedSortBy = 'name';
  let currentPage = 1;
  const perPage = 12;

  // DOM references
  const searchInput = document.getElementById('searchInput');
  const sectorFilter = document.getElementById('sectorFilter');
  const stateFilter = document.getElementById('stateFilter');
  const sortSelect = document.getElementById('sortSelect');
  const ngoGrid = document.getElementById('ngoGrid');
  const resultsCount = document.getElementById('resultsCount');
  const pagination = document.getElementById('pagination');
  const modalOverlay = document.getElementById('modalOverlay');
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  const activeFilters = document.getElementById('activeFilters');

  // Initialize
  function init() {
    populateFilters();
    bindEvents();
    renderNGOs();
    renderDashboard();
    updateStats();
  }

  // Populate filter dropdowns
  function populateFilters() {
    ALL_SECTORS.forEach(sector => {
      const opt = document.createElement('option');
      opt.value = sector;
      opt.textContent = sector;
      sectorFilter.appendChild(opt);
    });

    ALL_STATES.forEach(state => {
      const opt = document.createElement('option');
      opt.value = state;
      opt.textContent = state;
      stateFilter.appendChild(opt);
    });
  }

  // Bind events
  function bindEvents() {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    sectorFilter.addEventListener('change', handleFilterChange);
    stateFilter.addEventListener('change', handleFilterChange);
    sortSelect.addEventListener('change', handleSort);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
    window.addEventListener('scroll', handleScroll);
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Debounce utility
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Handle search
  function handleSearch() {
    searchQuery = searchInput.value.trim().toLowerCase();
    currentPage = 1;
    renderNGOs();
    updateActiveFilters();
  }

  // Handle filter change
  function handleFilterChange() {
    selectedSector = sectorFilter.value;
    selectedState = stateFilter.value;
    currentPage = 1;
    renderNGOs();
    updateActiveFilters();
  }

  // Handle sort
  function handleSort() {
    selectedSortBy = sortSelect.value;
    renderNGOs();
  }

  // Handle scroll
  function handleScroll() {
    if (window.scrollY > 500) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }

  // Filter and sort NGOs
  function getFilteredNGOs() {
    let filtered = NGO_DATA.filter(ngo => {
      const matchesSearch = !searchQuery ||
        ngo.name.toLowerCase().includes(searchQuery) ||
        ngo.description.toLowerCase().includes(searchQuery) ||
        ngo.sector.some(s => s.toLowerCase().includes(searchQuery)) ||
        ngo.headquarters.toLowerCase().includes(searchQuery) ||
        ngo.state.toLowerCase().includes(searchQuery) ||
        ngo.founder.toLowerCase().includes(searchQuery);

      const matchesSector = !selectedSector ||
        ngo.sector.includes(selectedSector);

      const matchesState = !selectedState ||
        ngo.state === selectedState;

      return matchesSearch && matchesSector && matchesState;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (selectedSortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'founded-old': return a.founded - b.founded;
        case 'founded-new': return b.founded - a.founded;
        case 'state': return a.state.localeCompare(b.state);
        default: return 0;
      }
    });

    return filtered;
  }

  // Render NGO cards
  function renderNGOs() {
    const filtered = getFilteredNGOs();
    const totalPages = Math.ceil(filtered.length / perPage);
    const start = (currentPage - 1) * perPage;
    const pageItems = filtered.slice(start, start + perPage);

    resultsCount.textContent = `Showing ${pageItems.length} of ${filtered.length} NGOs`;

    if (filtered.length === 0) {
      ngoGrid.innerHTML = `
        <div class="no-results" style="grid-column: 1 / -1;">
          <div class="icon">&#128269;</div>
          <h3>No NGOs found</h3>
          <p>Try adjusting your search or filters</p>
        </div>`;
      pagination.innerHTML = '';
      return;
    }

    ngoGrid.className = `ngo-grid ${currentView === 'list' ? 'list-view' : ''}`;

    ngoGrid.innerHTML = pageItems.map(ngo => `
      <div class="ngo-card" onclick="window.ngoApp.openDetail(${ngo.id})">
        <div class="ngo-card-header">
          <h3>${ngo.name}</h3>
          <span class="founded-badge">Est. ${ngo.founded}</span>
          <div class="location">&#128205; ${ngo.headquarters}, ${ngo.state}</div>
        </div>
        <div class="ngo-card-body">
          <p class="description">${ngo.description}</p>
          <div class="ngo-sectors">
            ${ngo.sector.map(s => `<span class="sector-badge">${s}</span>`).join('')}
          </div>
          <div class="ngo-quick-stats">
            <div class="quick-stat">
              <div class="qs-value">${ngo.employees}</div>
              <div class="qs-label">Employees</div>
            </div>
            <div class="quick-stat">
              <div class="qs-value">${ngo.volunteers}</div>
              <div class="qs-label">Volunteers</div>
            </div>
            <div class="quick-stat">
              <div class="qs-value">${ngo.annualBudget}</div>
              <div class="qs-label">Budget</div>
            </div>
          </div>
        </div>
        <div class="ngo-card-footer">
          <div class="contact-info">&#127760; ${ngo.website.replace('https://', '')}</div>
          <button class="details-btn" onclick="event.stopPropagation(); window.ngoApp.openDetail(${ngo.id})">View Details</button>
        </div>
      </div>
    `).join('');

    renderPagination(totalPages);
  }

  // Render pagination
  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    let html = `<button class="page-btn" onclick="window.ngoApp.goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Prev</button>`;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.ngoApp.goToPage(${i})">${i}</button>`;
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        html += `<span style="padding:0 4px;">...</span>`;
      }
    }

    html += `<button class="page-btn" onclick="window.ngoApp.goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}">Next &raquo;</button>`;

    pagination.innerHTML = html;
  }

  // Go to page
  function goToPage(page) {
    const filtered = getFilteredNGOs();
    const totalPages = Math.ceil(filtered.length / perPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderNGOs();
    document.getElementById('ngoGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Open detail modal
  function openDetail(id) {
    const ngo = NGO_DATA.find(n => n.id === id);
    if (!ngo) return;

    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header">
        <button class="close-btn" onclick="window.ngoApp.closeModal()">&times;</button>
        <h2>${ngo.name}</h2>
        <div class="meta">Founded ${ngo.founded} by ${ngo.founder} | ${ngo.headquarters}, ${ngo.state}</div>
      </div>
      <div class="modal-body">
        <div class="detail-section">
          <h3>&#128220; About</h3>
          <p style="line-height:1.8; color: #555;">${ngo.description}</p>
        </div>

        <div class="detail-grid">
          <div class="detail-card">
            <h4>Legal Status</h4>
            <p>${ngo.legalStatus}</p>
          </div>
          <div class="detail-card">
            <h4>Registration No.</h4>
            <p>${ngo.registrationNumber}</p>
          </div>
          <div class="detail-card">
            <h4>FCRA Number</h4>
            <p>${ngo.fcraNumber}</p>
          </div>
          <div class="detail-card">
            <h4>PAN Number</h4>
            <p>${ngo.panNumber}</p>
          </div>
          <div class="detail-card">
            <h4>Tax Exemption</h4>
            <p>${ngo.taxExemption}</p>
          </div>
          <div class="detail-card">
            <h4>Annual Budget</h4>
            <p>${ngo.annualBudget}</p>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-card">
            <h4>Employees</h4>
            <p>${ngo.employees}</p>
          </div>
          <div class="detail-card">
            <h4>Volunteers</h4>
            <p>${ngo.volunteers}</p>
          </div>
          <div class="detail-card">
            <h4>Beneficiaries</h4>
            <p>${ngo.beneficiaries}</p>
          </div>
        </div>

        <div class="detail-section">
          <h3>&#127919; Sectors</h3>
          <div class="ngo-sectors">
            ${ngo.sector.map(s => `<span class="sector-badge">${s}</span>`).join('')}
          </div>
        </div>

        <div class="detail-section">
          <h3>&#128205; Operational Areas</h3>
          <div class="areas-list">
            ${ngo.areas.map(a => `<span class="area-tag">${a}</span>`).join('')}
          </div>
        </div>

        ${ngo.awards.length ? `
        <div class="detail-section">
          <h3>&#127942; Awards & Recognition</h3>
          <div class="awards-list">
            ${ngo.awards.map(a => `<div class="award-item">${a}</div>`).join('')}
          </div>
        </div>` : ''}

        <div class="detail-section">
          <h3>&#128222; Contact Information</h3>
          <div class="contact-grid">
            <div class="contact-item">
              <span class="icon">&#127760;</span>
              <div class="info">
                <div class="label">Website</div>
                <a href="${ngo.website}" target="_blank" rel="noopener">${ngo.website}</a>
              </div>
            </div>
            <div class="contact-item">
              <span class="icon">&#9993;</span>
              <div class="info">
                <div class="label">Email</div>
                <a href="mailto:${ngo.email}">${ngo.email}</a>
              </div>
            </div>
            <div class="contact-item">
              <span class="icon">&#128222;</span>
              <div class="info">
                <div class="label">Phone</div>
                <span>${ngo.phone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Close modal
  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Update active filter tags
  function updateActiveFilters() {
    let tags = [];
    if (searchQuery) {
      tags.push(`<span class="filter-tag">Search: "${searchQuery}" <span class="remove-filter" onclick="window.ngoApp.clearSearch()">&times;</span></span>`);
    }
    if (selectedSector) {
      tags.push(`<span class="filter-tag">Sector: ${selectedSector} <span class="remove-filter" onclick="window.ngoApp.clearSectorFilter()">&times;</span></span>`);
    }
    if (selectedState) {
      tags.push(`<span class="filter-tag">State: ${selectedState} <span class="remove-filter" onclick="window.ngoApp.clearStateFilter()">&times;</span></span>`);
    }
    if (tags.length) {
      tags.push(`<button class="clear-filters-btn" onclick="window.ngoApp.clearAllFilters()">Clear All</button>`);
    }
    activeFilters.innerHTML = tags.join('');
  }

  // Clear functions
  function clearSearch() {
    searchInput.value = '';
    searchQuery = '';
    currentPage = 1;
    renderNGOs();
    updateActiveFilters();
  }

  function clearSectorFilter() {
    sectorFilter.value = '';
    selectedSector = '';
    currentPage = 1;
    renderNGOs();
    updateActiveFilters();
  }

  function clearStateFilter() {
    stateFilter.value = '';
    selectedState = '';
    currentPage = 1;
    renderNGOs();
    updateActiveFilters();
  }

  function clearAllFilters() {
    searchInput.value = '';
    sectorFilter.value = '';
    stateFilter.value = '';
    searchQuery = '';
    selectedSector = '';
    selectedState = '';
    currentPage = 1;
    renderNGOs();
    updateActiveFilters();
  }

  // View toggle
  function setView(view) {
    currentView = view;
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    renderNGOs();
  }

  // Section switch
  function switchSection(section) {
    currentSection = section;
    document.querySelectorAll('.section-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.section === section);
    });
    document.getElementById('directorySection').style.display = section === 'directory' ? 'block' : 'none';
    document.getElementById('dashboardSection').classList.toggle('active', section === 'dashboard');
    document.getElementById('aboutSection').classList.toggle('active', section === 'about');
  }

  // Update hero stats
  function updateStats() {
    document.getElementById('totalNGOs').textContent = NGO_DATA.length;
    document.getElementById('totalStates').textContent = ALL_STATES.length;
    document.getElementById('totalSectors').textContent = ALL_SECTORS.length;
  }

  // Render dashboard charts
  function renderDashboard() {
    // Sector distribution
    const sectorCounts = {};
    NGO_DATA.forEach(ngo => {
      ngo.sector.forEach(s => {
        sectorCounts[s] = (sectorCounts[s] || 0) + 1;
      });
    });
    const sortedSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxSectorCount = sortedSectors[0]?.[1] || 1;
    const colors = ['c1', 'c2', 'c3', 'c4', 'c5', 'c1', 'c2', 'c3', 'c4', 'c5'];

    document.getElementById('sectorChart').innerHTML = sortedSectors.map(([sector, count], i) => `
      <div class="chart-bar">
        <span class="bar-label">${sector}</span>
        <div class="bar-wrapper">
          <div class="bar-fill ${colors[i]}" style="width: ${(count / maxSectorCount * 100)}%">${count}</div>
        </div>
      </div>
    `).join('');

    // State distribution
    const stateCounts = {};
    NGO_DATA.forEach(ngo => {
      stateCounts[ngo.state] = (stateCounts[ngo.state] || 0) + 1;
    });
    const sortedStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
    const maxStateCount = sortedStates[0]?.[1] || 1;

    document.getElementById('stateChart').innerHTML = sortedStates.map(([state, count], i) => `
      <div class="chart-bar">
        <span class="bar-label">${state}</span>
        <div class="bar-wrapper">
          <div class="bar-fill ${colors[i % 5]}" style="width: ${(count / maxStateCount * 100)}%">${count}</div>
        </div>
      </div>
    `).join('');

    // Founding decade
    const decadeCounts = {};
    NGO_DATA.forEach(ngo => {
      const decade = Math.floor(ngo.founded / 10) * 10;
      const label = `${decade}s`;
      decadeCounts[label] = (decadeCounts[label] || 0) + 1;
    });
    const sortedDecades = Object.entries(decadeCounts).sort((a, b) => a[0].localeCompare(b[0]));
    const maxDecadeCount = Math.max(...sortedDecades.map(d => d[1]));

    document.getElementById('decadeChart').innerHTML = sortedDecades.map(([decade, count], i) => `
      <div class="chart-bar">
        <span class="bar-label">${decade}</span>
        <div class="bar-wrapper">
          <div class="bar-fill ${colors[i % 5]}" style="width: ${(count / maxDecadeCount * 100)}%">${count}</div>
        </div>
      </div>
    `).join('');

    // Top NGOs by age
    const sortedByAge = [...NGO_DATA].sort((a, b) => a.founded - b.founded).slice(0, 5);
    document.getElementById('oldestNGOs').innerHTML = sortedByAge.map(ngo => `
      <div class="chart-bar">
        <span class="bar-label">${ngo.name}</span>
        <div class="bar-wrapper">
          <div class="bar-fill c2" style="width: ${((2026 - ngo.founded) / (2026 - sortedByAge[0].founded) * 100)}%">${ngo.founded} (${2026 - ngo.founded} yrs)</div>
        </div>
      </div>
    `).join('');

    // Summary stats
    const totalSectors = ALL_SECTORS.length;
    const avgAge = Math.round(NGO_DATA.reduce((s, n) => s + (2026 - n.founded), 0) / NGO_DATA.length);
    document.getElementById('summaryTotalNGOs').textContent = NGO_DATA.length;
    document.getElementById('summaryTotalStates').textContent = ALL_STATES.length;
    document.getElementById('summaryTotalSectors').textContent = totalSectors;
    document.getElementById('summaryAvgAge').textContent = avgAge + ' yrs';
  }

  // Public API
  window.ngoApp = {
    openDetail,
    closeModal,
    goToPage,
    setView,
    switchSection,
    clearSearch,
    clearSectorFilter,
    clearStateFilter,
    clearAllFilters,
  };

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
