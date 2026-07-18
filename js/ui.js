/* ============================================
   R&D Publication Tracker — UI Renderer & Controllers
   ============================================ */

Object.assign(App, {
    // ── Loader Overlay Toggles ──
    showLoading(text = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const span = overlay ? overlay.querySelector('.loader span') : null;
        if (span) span.textContent = text;
        if (overlay) overlay.classList.add('active');
    },

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('active');
    },

    // ── Animate Dashboard Metrics ──
    animateNumber(elementId, target) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const start = parseInt(el.textContent) || 0;
        const duration = 600;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = Math.round(start + (target - start) * eased);
            el.textContent = current;
            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    },

    updateDashboard() {
        const data = State.publications;
        const total = data.length;
        const ug = data.filter(p => p.program === 'UG').length;
        const pg = data.filter(p => p.program === 'PG').length;
        const journals = data.filter(p => p.publication_type === 'Journal').length;
        const conferences = data.filter(p => p.publication_type === 'Conference').length;

        this.animateNumber('statTotal', total);
        this.animateNumber('statUG', ug);
        this.animateNumber('statPG', pg);
        this.animateNumber('statJournal', journals);
        this.animateNumber('statConference', conferences);
    },

    // ── Charts Rendering ──
    renderCharts() {
        const data = State.publications;
        this.renderTypeChart(data);
        this.renderBranchChart(data);
        this.renderIndexingChart(data);
    },

    renderTypeChart(data) {
        const ctx = document.getElementById('chartType');
        if (!ctx) return;
        if (State.charts.type) State.charts.type.destroy();

        const journals = data.filter(p => p.publication_type === 'Journal').length;
        const conferences = data.filter(p => p.publication_type === 'Conference').length;

        State.charts.type = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Journals', 'Conferences'],
                datasets: [{
                    data: [journals, conferences],
                    backgroundColor: [
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(236, 72, 153, 0.8)'
                    ],
                    borderColor: [
                        'rgba(249, 115, 22, 1)',
                        'rgba(236, 72, 153, 1)'
                    ],
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255,255,255,0.85)',
                            padding: 16,
                            font: { family: 'Inter', size: 12, weight: '500' },
                            usePointStyle: true,
                            pointStyleWidth: 10
                        }
                    }
                }
            }
        });
    },

    renderBranchChart(data) {
        const ctx = document.getElementById('chartBranch');
        if (!ctx) return;
        if (State.charts.branch) State.charts.branch.destroy();

        const branchCounts = {};
        data.forEach(p => {
            branchCounts[p.branch] = (branchCounts[p.branch] || 0) + 1;
        });

        const labels = Object.keys(branchCounts);
        const values = Object.values(branchCounts);

        const colors = [
            'rgba(124, 58, 237, 0.7)',
            'rgba(6, 214, 160, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(249, 115, 22, 0.7)',
            'rgba(236, 72, 153, 0.7)',
            'rgba(6, 182, 212, 0.7)',
            'rgba(139, 92, 246, 0.7)',
            'rgba(34, 197, 94, 0.7)',
            'rgba(244, 63, 94, 0.7)',
            'rgba(251, 146, 60, 0.7)',
            'rgba(168, 85, 247, 0.7)',
            'rgba(56, 189, 248, 0.7)',
            'rgba(250, 204, 21, 0.7)'
        ];

        State.charts.branch = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Publications',
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: colors.slice(0, labels.length).map(c => c.replace('0.7', '1')),
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.75)', font: { family: 'Inter', size: 11 } },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgba(255,255,255,0.75)',
                            font: { family: 'Inter', size: 11 },
                            stepSize: 1
                        },
                        grid: { color: 'rgba(255,255,255,0.08)' }
                    }
                }
            }
        });
    },

    renderIndexingChart(data) {
        const ctx = document.getElementById('chartIndexing');
        if (!ctx) return;
        if (State.charts.indexing) State.charts.indexing.destroy();

        const indexCounts = {};
        data.forEach(p => {
            if (p.indexing) {
                indexCounts[p.indexing] = (indexCounts[p.indexing] || 0) + 1;
            }
        });

        const labels = Object.keys(indexCounts);
        const values = Object.values(indexCounts);

        const colors = [
            'rgba(124, 58, 237, 0.8)',
            'rgba(6, 214, 160, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(6, 182, 212, 0.8)',
            'rgba(250, 204, 21, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(34, 197, 94, 0.8)'
        ];

        State.charts.indexing = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255,255,255,0.85)',
                            padding: 12,
                            font: { family: 'Inter', size: 11 },
                            usePointStyle: true,
                            pointStyleWidth: 8
                        }
                    }
                },
                scales: {
                    r: {
                        ticks: { display: false },
                        grid: { color: 'rgba(255,255,255,0.08)' },
                        angleLines: { color: 'rgba(255,255,255,0.08)' }
                    }
                }
            }
        });
    },

    // ── Table Rendering ──
    renderRecentTable() {
        const tbody = document.getElementById('recentTableBody');
        const empty = document.getElementById('recentEmpty');
        if (!tbody) return;
        const recent = State.publications.slice(0, 5);

        if (recent.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';
        tbody.innerHTML = recent.map(p => `
            <tr>
                <td>${this.escapeHtml(p.roll_no)}</td>
                <td><strong>${this.escapeHtml(p.name)}</strong></td>
                <td><span class="badge badge-${p.program.toLowerCase()}">${p.program}</span></td>
                <td title="${this.escapeHtml(p.article_title)}">${this.escapeHtml(this.truncate(p.article_title, 40))}</td>
                <td><span class="badge badge-${p.publication_type.toLowerCase()}">${p.publication_type}</span></td>
                <td><span class="badge badge-indexing">${this.escapeHtml(p.indexing || '—')}</span></td>
            </tr>
        `).join('');
    },

    applyFilters() {
        let data = [...State.publications];

        // Search
        if (State.searchQuery) {
            const q = State.searchQuery.toLowerCase();
            data = data.filter(p =>
                (p.roll_no || '').toLowerCase().includes(q) ||
                (p.name || '').toLowerCase().includes(q) ||
                (p.article_title || '').toLowerCase().includes(q) ||
                (p.journal_conference_title || '').toLowerCase().includes(q) ||
                (p.branch || '').toLowerCase().includes(q)
            );
        }

        // Filters
        if (State.filters.program) data = data.filter(p => p.program === State.filters.program);
        if (State.filters.branch) data = data.filter(p => p.branch === State.filters.branch);
        if (State.filters.type) data = data.filter(p => p.publication_type === State.filters.type);
        if (State.filters.indexing) data = data.filter(p => p.indexing === State.filters.indexing);

        // Sort
        data.sort((a, b) => {
            const aVal = (a[State.sortField] || '').toString().toLowerCase();
            const bVal = (b[State.sortField] || '').toString().toLowerCase();
            if (State.sortOrder === 'asc') return aVal.localeCompare(bVal);
            return bVal.localeCompare(aVal);
        });

        State.filteredData = data;
        State.currentPage = 1;
        this.renderPublicationsTable();
        this.renderActiveFilterBadges();
    },

    renderActiveFilterBadges() {
        const container = document.getElementById('activeFilters');
        if (!container) return;

        const filters = [
            { id: 'searchInput', label: 'Search', value: document.getElementById('searchInput').value },
            { id: 'filterProgram', label: 'Program', value: document.getElementById('filterProgram').value },
            { id: 'filterBranch', label: 'Branch', value: document.getElementById('filterBranch').value },
            { id: 'filterType', label: 'Type', value: document.getElementById('filterType').value },
            { id: 'filterIndexing', label: 'Indexing', value: document.getElementById('filterIndexing').value }
        ];

        const activeFilters = filters.filter(f => f.value && f.value.trim() !== '');

        if (activeFilters.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        activeFilters.forEach(f => {
            const displayValue = f.id === 'searchInput' ? `"${f.value}"` : f.value;
            html += `
                <div class="filter-badge">
                    <span>${f.label}: ${displayValue}</span>
                    <span class="filter-badge-close" onclick="App.clearSingleFilter('${f.id}')">✕</span>
                </div>
            `;
        });

        html += `<button class="clear-all-filters-btn" onclick="App.clearAllFilters()">Clear All</button>`;
        container.innerHTML = html;
    },

    clearSingleFilter(id) {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
            if (id === 'searchInput') {
                const clearBtn = document.getElementById('searchClear');
                if (clearBtn) clearBtn.style.display = 'none';
                State.searchQuery = '';
            } else {
                const key = id.replace('filter', '').toLowerCase();
                State.filters[key] = '';
            }
            this.applyFilters();
        }
    },

    clearAllFilters() {
        ['searchInput', 'filterProgram', 'filterBranch', 'filterType', 'filterIndexing'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const clearBtn = document.getElementById('searchClear');
        if (clearBtn) clearBtn.style.display = 'none';

        State.searchQuery = '';
        State.filters.program = '';
        State.filters.branch = '';
        State.filters.type = '';
        State.filters.indexing = '';

        this.applyFilters();
    },

    renderPublicationsTable() {
        const tbody = document.getElementById('pubTableBody');
        const empty = document.getElementById('pubEmpty');
        const table = document.getElementById('pubTable');
        const countEl = document.getElementById('pubCount');
        if (!tbody) return;

        const data = State.filteredData;
        const totalPages = Math.max(1, Math.ceil(data.length / State.pageSize));
        const start = (State.currentPage - 1) * State.pageSize;
        const end = start + State.pageSize;
        const pageData = data.slice(start, end);

        if (countEl) countEl.textContent = `${data.length} publication${data.length !== 1 ? 's' : ''} found`;

        if (pageData.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.style.display = 'block';
            if (table) table.style.display = 'none';
        } else {
            if (empty) empty.style.display = 'none';
            if (table) table.style.display = '';
            tbody.innerHTML = pageData.map(p => {
                const titleHtml = p.paper_link
                    ? `<a href="${p.paper_link}" target="_blank" style="color: var(--accent-light, #2196f3); text-decoration: none; font-weight: 500;" class="paper-link" title="View Publication">${this.escapeHtml(this.truncate(p.article_title, 35))} <i class="ri-external-link-line" style="font-size: 11px;"></i></a>`
                    : this.escapeHtml(this.truncate(p.article_title, 35));

                // Quality badges
                let qualityBadges = '';
                if (p.journal_tier) {
                    let tierClass = 'tier-badge';
                    if (p.journal_tier === 'Q1') tierClass += ' q1';
                    else if (p.journal_tier === 'Q2') tierClass += ' q2';
                    else if (p.journal_tier === 'Q3') tierClass += ' q3';
                    else if (p.journal_tier === 'Q4') tierClass += ' q4';
                    qualityBadges += `<span class="badge ${tierClass}" title="Journal Tier">${p.journal_tier}</span>`;
                }
                if (p.impact_factor) {
                    qualityBadges += ` <span class="badge badge-impact" title="Impact Factor">IF: ${p.impact_factor}</span>`;
                }

                return `
                    <tr>
                        <td class="clickable-copy" onclick="App.copyToClipboard('${p.roll_no}', 'Paper ID')" title="Click to copy Paper ID"><strong>${this.escapeHtml(p.roll_no)}</strong> <i class="ri-file-copy-line copy-ico"></i></td>
                        <td class="admin-only">${this.escapeHtml(p.name)}</td>
                        <td class="admin-only"><span class="badge badge-${p.program.toLowerCase()}">${p.program}</span></td>
                        <td class="admin-only">${this.escapeHtml(p.branch)}</td>
                        <td title="${this.escapeHtml(p.article_title)}">${titleHtml}</td>
                        <td class="admin-only"><span class="badge badge-${p.publication_type.toLowerCase()}">${p.publication_type}</span></td>
                        <td class="admin-only">
                            <span class="badge badge-indexing">${this.escapeHtml(p.indexing || '—')}</span>
                            ${qualityBadges}
                        </td>
                        <td class="admin-only" title="${this.escapeHtml(p.journal_conference_title || '')}">${this.escapeHtml(this.truncate(p.journal_conference_title || '—', 25))}</td>
                        <td class="admin-only">${this.escapeHtml(p.sponsorship || '—')}</td>
                        <td class="admin-only clickable-copy" onclick="App.copyToClipboard('${this.escapeHtml(p.mentor_name || '')}', 'Mentor Name')" title="Click to copy Mentor Name">${this.escapeHtml(p.mentor_name || '—')} <i class="ri-file-copy-line copy-ico"></i></td>
                        <td class="super-admin-only">₹${parseFloat(p.funding_amount || 0).toLocaleString()}</td>
                        <td class="admin-only">
                            <div class="actions-cell">
                                <button class="act-btn edit" onclick="App.openEditModal('${p.id}')" title="Edit">
                                    <i class="ri-edit-line"></i>
                                </button>
                                <button class="act-btn delete" onclick="App.openDeleteModal('${p.id}')" title="Delete">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Pagination
        const pageInfo = document.getElementById('pageInfo');
        const prevPage = document.getElementById('prevPage');
        const nextPage = document.getElementById('nextPage');
        if (pageInfo) pageInfo.textContent = `Page ${State.currentPage} of ${totalPages}`;
        if (prevPage) prevPage.disabled = State.currentPage <= 1;
        if (nextPage) nextPage.disabled = State.currentPage >= totalPages;
    },

    // ── Modals & View Switches ──
    openEditModal(id) {
        const pub = State.publications.find(p => p.id === id);
        if (!pub) return;

        State.editingId = id;
        document.getElementById('editId').value = id;
        document.getElementById('editRollNo').value = pub.roll_no;
        document.getElementById('editName').value = pub.name;
        document.getElementById('editProgram').value = pub.program;
        document.getElementById('editBranch').value = pub.branch;
        document.getElementById('editArticleTitle').value = pub.article_title;
        document.getElementById('editType').value = pub.publication_type;
        const editIndexingSelect = document.getElementById('editIndexing');
        if (editIndexingSelect) {
            editIndexingSelect.value = pub.indexing || '';
            editIndexingSelect.dispatchEvent(new Event('change'));
        }
        document.getElementById('editJournalTitle').value = pub.journal_conference_title || '';
        document.getElementById('editSponsorship').value = pub.sponsorship || '';
        document.getElementById('editMentorName').value = pub.mentor_name || '';
        document.getElementById('editPaperLink').value = pub.paper_link || '';
        document.getElementById('editFundingAmount').value = pub.funding_amount || 0;
        document.getElementById('editJournalTier').value = pub.journal_tier || '';
        document.getElementById('editImpactFactor').value = pub.impact_factor || '';

        this.openModal('editModal');
    },

    openDeleteModal(id) {
        const pub = State.publications.find(p => p.id === id);
        if (!pub) return;

        State.deletingId = id;
        document.getElementById('deleteInfo').innerHTML = `
            <strong>${this.escapeHtml(pub.name)}</strong> — ${this.escapeHtml(pub.article_title)}
        `;
        this.openModal('deleteModal');
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    },

    switchView(viewName) {
        // Update nav active classes
        document.querySelectorAll('.nav-link').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        const activeViewId = viewName === 'home' ? 'publications' : viewName;

        // Toggle active views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        const targetView = document.getElementById(`view-${activeViewId}`);
        if (targetView) targetView.classList.add('active');

        // Hide/Show Hero Slideshow Section
        const heroSection = document.getElementById('heroSection');
        const mainWrapper = document.querySelector('.main-wrapper');
        const viewPublications = document.getElementById('view-publications');

        const shouldShowHero = (viewName === 'dashboard') || (viewName === 'home');

        if (shouldShowHero) {
            if (heroSection) heroSection.style.display = 'block';
            if (mainWrapper) mainWrapper.style.paddingTop = '32px';
            if (viewPublications) viewPublications.classList.remove('centered-layout');
        } else {
            if (heroSection) heroSection.style.display = 'none';
            if (mainWrapper) mainWrapper.style.paddingTop = 'calc(var(--nav-height) + 32px)';
            if (activeViewId === 'publications' && viewPublications) {
                viewPublications.classList.add('centered-layout');
            }
        }

        if (activeViewId === 'publications') {
            this.applyFilters();
        }

        // Close mobile drawer menu
        const navLinks = document.getElementById('navLinks');
        if (navLinks) navLinks.classList.remove('open');
    },

    // ── Export Triggers ──
    exportCSV() {
        if (State.publications.length === 0) {
            Toast.show('warning', 'No Data', 'There are no publications to export.');
            return;
        }

        const isSuperAdmin = State.userRole === 'super_admin';
        const headers = ['Roll No', 'Name', 'Program', 'Branch', 'Article Title', 'Type (J/C)', 'Indexing', 'Journal/Conference Title', 'Sponsorship', 'Mentor / Guide', 'Paper Link / DOI'];
        if (isSuperAdmin) headers.push('Funding Amount (₹)');

        const rows = State.publications.map(p => {
            const row = [
                p.roll_no,
                p.name,
                p.program,
                p.branch,
                p.article_title,
                p.publication_type,
                p.indexing || '',
                p.journal_conference_title || '',
                p.sponsorship || '',
                p.mentor_name || '',
                p.paper_link || ''
            ];
            if (isSuperAdmin) row.push(p.funding_amount || 0);
            return row;
        });

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });

        this.downloadFile(csv, 'publications_export.csv', 'text/csv');
        Toast.show('success', 'CSV Exported', `${State.publications.length} records exported successfully.`);
    },

    exportToXLSX(data, filename) {
        try {
            const isSuperAdmin = State.userRole === 'super_admin';
            const wsData = data.map(p => {
                const item = {
                    'Roll No': p.roll_no,
                    'Student Name': p.name,
                    'Program': p.program,
                    'Branch': p.branch,
                    'Article Title': p.article_title,
                    'Type': p.publication_type,
                    'Indexing': p.indexing || '',
                    'Journal/Conference Title': p.journal_conference_title || '',
                    'Sponsorship': p.sponsorship || '',
                    'Mentor / Guide': p.mentor_name || '',
                    'Paper Link / DOI': p.paper_link || ''
                };
                if (isSuperAdmin) {
                    item['Funding Amount (₹)'] = p.funding_amount || 0;
                }
                return item;
            });
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, "Publications");
            XLSX.writeFile(wb, filename);
        } catch (err) {
            console.error('Error generating Excel file:', err);
            Toast.show('error', 'Export Failed', 'An error occurred while generating Excel file.');
        }
    },

    exportXLSX() {
        if (State.publications.length === 0) {
            Toast.show('warning', 'No Data', 'There are no publications to export.');
            return;
        }
        this.exportToXLSX(State.publications, 'Vignan_Publications_All.xlsx');
        Toast.show('success', 'Excel Exported', `${State.publications.length} records exported successfully.`);
    },

    exportFilteredXLSX() {
        if (State.filteredData.length === 0) {
            Toast.show('warning', 'No Data', 'There is no filtered data to export.');
            return;
        }
        this.exportToXLSX(State.filteredData, 'Vignan_Publications_Filtered.xlsx');
        Toast.show('success', 'Excel Exported', `${State.filteredData.length} filtered records exported.`);
    },

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    updateUIForRole() {
        const role = State.userRole;
        const body = document.body;

        body.classList.remove('super-admin-mode', 'admin-mode');
        if (role === 'super_admin') {
            body.classList.add('super-admin-mode');
        } else if (role === 'admin') {
            body.classList.add('admin-mode');
        }

        // Toggle display of public-only elements dynamically based on user role
        document.querySelectorAll('.public-only').forEach(el => {
            if (role) {
                el.style.setProperty('display', 'none', 'important');
            } else {
                el.style.display = '';
            }
        });

        const authBtnText = document.getElementById('authBtnText');
        const authBtnIcon = document.querySelector('#authBtn i');
        if (State.session) {
            if (authBtnText) authBtnText.textContent = 'Logout';
            if (authBtnIcon) {
                authBtnIcon.className = 'ri-logout-box-r-line';
            }
        } else {
            if (authBtnText) authBtnText.textContent = 'Admin Login';
            if (authBtnIcon) {
                authBtnIcon.className = 'ri-login-box-line';
            }
        }

        // Adjust view based on role
        const currentView = document.querySelector('.view.active');
        if (currentView) {
            const viewId = currentView.id.replace('view-', '');
            if (viewId === 'dashboard' && role !== 'super_admin') {
                this.switchView('home');
            } else if (viewId === 'manage-admins' && role !== 'super_admin') {
                this.switchView('home');
            } else if (viewId === 'add' && !role) {
                this.switchView('home');
            } else if (viewId === 'export' && !role) {
                this.switchView('home');
            } else if (viewId === 'reimbursement' && role) {
                this.switchView(role === 'super_admin' ? 'dashboard' : 'home');
            }
        }
    },

    updateConnectionStatus(status, text) {
        const el = document.getElementById('connectionStatus');
        if (!el) return;
        const dot = el.querySelector('.conn-dot');
        const span = el.querySelector('span');
        if (dot) dot.className = 'conn-dot';
        if (status === 'connected') {
            if (dot) dot.classList.add('connected');
            isConnected = true;
        } else if (status === 'error') {
            if (dot) dot.classList.add('error');
            isConnected = false;
        }
        if (span) span.textContent = text;
    },

    // ── Utility Helpers ──
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    copyToClipboard(text, label) {
        if (!text || text === '—') return;
        navigator.clipboard.writeText(text).then(() => {
            Toast.show('success', 'Copied!', `${label} copied to clipboard.`);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    },

    truncate(text, maxLen) {
        if (!text) return '';
        return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    }
});
