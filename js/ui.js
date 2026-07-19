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

    renderLeaderboard() {
        const data = State.publications || [];
        
        // 1. Top Branches Calculation
        const branchCounts = {};
        data.forEach(p => {
            if (p.branch) {
                const branch = p.branch.trim().toUpperCase();
                branchCounts[branch] = (branchCounts[branch] || 0) + 1;
            }
        });
        const sortedBranches = Object.entries(branchCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const branchesEl = document.getElementById('leaderboardBranches');
        if (branchesEl) {
            if (sortedBranches.length === 0) {
                branchesEl.innerHTML = `<li style="color: var(--text-muted); text-align: center; padding: 20px 0;">No publications recorded yet.</li>`;
            } else {
                branchesEl.innerHTML = sortedBranches.map(([branch, count], index) => `
                    <li style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: 500; font-size: 14px;">
                        <span style="color: var(--navy); display: flex; align-items: center; gap: 8px;">
                            <span style="background: rgba(0, 119, 182, 0.1); color: var(--blue); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">${index + 1}</span>
                            ${this.escapeHtml(branch)}
                        </span>
                        <span class="badge" style="background: rgba(0, 119, 182, 0.1); color: var(--blue); font-weight: 600; padding: 4px 8px; border-radius: 4px;">${count} Pubs</span>
                    </li>
                `).join('');
            }
        }

        // 2. Star Student Researchers Calculation
        const studentCounts = {};
        data.forEach(p => {
            if (p.roll_no && p.name) {
                const key = `${p.roll_no.trim()}|${p.name.trim()}|${p.branch || ''}`;
                studentCounts[key] = (studentCounts[key] || 0) + 1;
            }
        });
        const sortedStudents = Object.entries(studentCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const studentsEl = document.getElementById('leaderboardStudents');
        if (studentsEl) {
            if (sortedStudents.length === 0) {
                studentsEl.innerHTML = `<li style="color: var(--text-muted); text-align: center; padding: 20px 0;">No student researchers recorded yet.</li>`;
            } else {
                studentsEl.innerHTML = sortedStudents.map(([key, count], index) => {
                    const [rollNo, name, branch] = key.split('|');
                    return `
                        <li style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: 500; font-size: 14px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="background: rgba(240, 180, 41, 0.1); color: #b48500; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">${index + 1}</span>
                                <div>
                                    <div style="color: var(--navy); font-weight: 600; text-align: left;">${this.escapeHtml(name)}</div>
                                    <div style="font-size: 11px; color: var(--text-muted); text-align: left;">${this.escapeHtml(rollNo)} (${this.escapeHtml(branch)})</div>
                                </div>
                            </div>
                            <span class="badge" style="background: rgba(240, 180, 41, 0.1); color: #b48500; font-weight: 600; padding: 4px 8px; border-radius: 4px;">${count} Pubs</span>
                        </li>
                    `;
                }).join('');
            }
        }

        // 3. Distinguished Mentors Calculation
        const mentorCounts = {};
        data.forEach(p => {
            if (p.mentor_name) {
                const mentor = p.mentor_name.trim();
                mentorCounts[mentor] = (mentorCounts[mentor] || 0) + 1;
            }
        });
        const sortedMentors = Object.entries(mentorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const mentorsEl = document.getElementById('leaderboardMentors');
        if (mentorsEl) {
            if (sortedMentors.length === 0) {
                mentorsEl.innerHTML = `<li style="color: var(--text-muted); text-align: center; padding: 20px 0;">No mentors recorded yet.</li>`;
            } else {
                mentorsEl.innerHTML = sortedMentors.map(([mentor, count], index) => `
                    <li style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: 500; font-size: 14px;">
                        <span style="color: var(--navy); display: flex; align-items: center; gap: 8px;">
                            <span style="background: rgba(36, 180, 126, 0.1); color: #1e8a60; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">${index + 1}</span>
                            ${this.escapeHtml(mentor)}
                        </span>
                        <span class="badge" style="background: rgba(36, 180, 126, 0.1); color: #1e8a60; font-weight: 600; padding: 4px 8px; border-radius: 4px;">${count} Pubs</span>
                    </li>
                `).join('');
            }
        }
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

        // Public search (visible to all users)
        const publicSearchEl = document.getElementById('publicSearchInput');
        const publicQuery = publicSearchEl ? publicSearchEl.value.trim().toLowerCase() : '';
        if (publicQuery) {
            data = data.filter(p =>
                (p.roll_no || '').toLowerCase().includes(publicQuery) ||
                (p.article_title || '').toLowerCase().includes(publicQuery) ||
                (p.mentor_name || '').toLowerCase().includes(publicQuery) ||
                (p.name || '').toLowerCase().includes(publicQuery)
            );
        }

        // Admin search
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
        if (State.filters.tier) data = data.filter(p => p.journal_tier === State.filters.tier);

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

        const searchEl = document.getElementById('searchInput');
        const publicSearchEl = document.getElementById('publicSearchInput');
        const filters = [
            { id: 'publicSearchInput', label: 'Search', value: publicSearchEl ? publicSearchEl.value : '' },
            { id: 'searchInput', label: 'Admin Search', value: searchEl ? searchEl.value : '' },
            { id: 'filterProgram', label: 'Program', value: document.getElementById('filterProgram') ? document.getElementById('filterProgram').value : '' },
            { id: 'filterBranch', label: 'Branch', value: document.getElementById('filterBranch') ? document.getElementById('filterBranch').value : '' },
            { id: 'filterType', label: 'Type', value: document.getElementById('filterType') ? document.getElementById('filterType').value : '' },
            { id: 'filterIndexing', label: 'Indexing', value: document.getElementById('filterIndexing') ? document.getElementById('filterIndexing').value : '' },
            { id: 'filterTier', label: 'Tier', value: document.getElementById('filterTier') ? document.getElementById('filterTier').value : '' }
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
            } else if (id === 'publicSearchInput') {
                const clearBtn = document.getElementById('publicSearchClear');
                if (clearBtn) clearBtn.style.display = 'none';
            } else {
                const key = id.replace('filter', '').toLowerCase();
                State.filters[key] = '';
            }
            this.applyFilters();
        }
    },

    clearAllFilters() {
        ['searchInput', 'publicSearchInput', 'filterProgram', 'filterBranch', 'filterType', 'filterIndexing', 'filterTier'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const clearBtn = document.getElementById('searchClear');
        if (clearBtn) clearBtn.style.display = 'none';
        const publicClearBtn = document.getElementById('publicSearchClear');
        if (publicClearBtn) publicClearBtn.style.display = 'none';

        State.searchQuery = '';
        State.filters.program = '';
        State.filters.branch = '';
        State.filters.type = '';
        State.filters.indexing = '';
        State.filters.tier = '';

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

        const activeViewId = viewName;

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
        const footer = document.querySelector('.site-footer');

        if (viewName === 'home') {
            document.body.classList.add('home-layout');
            if (heroSection) {
                heroSection.style.display = 'block';
                heroSection.style.height = '70vh';
            }
            if (mainWrapper) {
                mainWrapper.style.display = 'block';
                mainWrapper.style.paddingTop = '32px';
            }
            if (footer) footer.style.display = 'block';
        } else if (viewName === 'dashboard') {
            document.body.classList.remove('home-layout');
            if (heroSection) {
                heroSection.style.display = 'block';
                heroSection.style.height = '';
            }
            if (mainWrapper) {
                mainWrapper.style.display = 'block';
                mainWrapper.style.paddingTop = '32px';
            }
            if (footer) footer.style.display = '';
        } else {
            document.body.classList.remove('home-layout');
            if (heroSection) heroSection.style.display = 'none';
            if (mainWrapper) {
                mainWrapper.style.display = 'block';
                mainWrapper.style.paddingTop = 'calc(var(--nav-height) + 32px)';
            }
            if (footer) footer.style.display = '';
            if (activeViewId === 'publications' && viewPublications) {
                viewPublications.classList.add('centered-layout');
            }
        }

        if (activeViewId === 'publications') {
            this.applyFilters();
        } else if (activeViewId === 'manage-claims') {
            this.loadReimbursements();
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
            } else if (viewId === 'manage-claims' && !role) {
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

    renderReimbursementsTable() {
        const tbody = document.getElementById('reimbursementsTableBody');
        if (!tbody) return;

        const data = State.reimbursements || [];
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 40px 0;">No reimbursement claims submitted yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(c => {
            const dateStr = new Date(c.created_at).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric'
            });

            let statusClass = 'pending';
            if (c.status === 'Approved') statusClass = 'ug';
            else if (c.status === 'Under Review') statusClass = 'pg';
            else if (c.status === 'Rejected') statusClass = 'rejected';

            return `
                <tr>
                    <td>
                        <div style="font-weight: 600; color: var(--navy); text-align: left;">${this.escapeHtml(c.student_name)}</div>
                        <div style="font-size: 12px; color: var(--text-muted); text-align: left;">${this.escapeHtml(c.roll_no)} (${this.escapeHtml(c.branch)})</div>
                        <div style="font-size: 11px; color: var(--text-muted); text-align: left;">Dept: ${this.escapeHtml(c.dept)}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500; font-size: 13px; color: var(--navy); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;" title="${this.escapeHtml(c.paper_title)}">${this.escapeHtml(c.paper_title)}</div>
                        <div style="font-size: 11px; color: var(--text-muted); text-align: left;">${this.escapeHtml(c.conf_name)}</div>
                        <div style="font-size: 11px; color: var(--text-muted); text-align: left;">${this.escapeHtml(c.conf_dates)}</div>
                    </td>
                    <td style="font-weight: 600; color: var(--navy);">₹${parseFloat(c.fee_paid || 0).toLocaleString()}</td>
                    <td style="font-size: 12px; line-height: 1.4; text-align: left;">
                        <div><strong>Holder:</strong> ${this.escapeHtml(c.bank_acc_holder)}</div>
                        <div><strong>A/C:</strong> ${this.escapeHtml(c.bank_acc_no)}</div>
                        <div><strong>Bank:</strong> ${this.escapeHtml(c.bank_name)} (${this.escapeHtml(c.bank_branch)})</div>
                        <div><strong>IFSC:</strong> ${this.escapeHtml(c.ifsc)}</div>
                    </td>
                    <td style="font-size: 12px; color: var(--text-muted);">${dateStr}</td>
                    <td>
                        <span class="badge badge-${statusClass}">${this.escapeHtml(c.status)}</span>
                    </td>
                    <td>
                        <div style="display: flex; gap: 8px; align-items: center; justify-content: center;">
                            <select class="form-input" style="padding: 4px 8px; font-size: 12px; margin-bottom: 0; width: 120px;" onchange="App.updateClaimStatus('${c.id}', this.value)">
                                <option value="Submitted" ${c.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
                                <option value="Under Review" ${c.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                                <option value="Approved" ${c.status === 'Approved' ? 'selected' : ''}>Approved</option>
                                <option value="Rejected" ${c.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                            </select>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    trackReimbursementStatus() {
        const rollInput = document.getElementById('trackerRollNo');
        const resultsEl = document.getElementById('trackerResults');
        if (!rollInput || !resultsEl) return;

        const rollNo = rollInput.value.trim().toUpperCase();
        if (!rollNo) {
            Toast.show('warning', 'Input Required', 'Please enter a Roll Number to track.');
            return;
        }

        // Search through State.reimbursements (if empty, load first from localstorage/DB)
        const runTrack = () => {
            const matches = State.reimbursements.filter(c => c.roll_no.trim().toUpperCase() === rollNo);

            resultsEl.style.display = 'block';
            if (matches.length === 0) {
                resultsEl.innerHTML = `
                    <div style="text-align: center; padding: 24px; background: rgba(240, 180, 41, 0.05); border: 1px dashed rgba(240, 180, 41, 0.3); border-radius: 8px; color: var(--navy); font-weight: 500;">
                        <i class="ri-alert-line" style="font-size: 24px; color: #f0b429; display: block; margin-bottom: 8px;"></i>
                        No fee reimbursement claims found for Roll Number <strong>${this.escapeHtml(rollNo)}</strong>.
                    </div>
                `;
                return;
            }

            resultsEl.innerHTML = `
                <h4 style="margin-bottom: 16px; color: var(--navy); border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
                    Claims Found for ${this.escapeHtml(rollNo)} (${matches.length})
                </h4>
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    ${matches.map(c => {
                        const dateStr = new Date(c.created_at).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric'
                        });

                        const isSubmitted = true;
                        const isUnderReview = c.status === 'Under Review' || c.status === 'Approved' || c.status === 'Rejected';
                        const isApproved = c.status === 'Approved';
                        const isRejected = c.status === 'Rejected';

                        let step3Label = 'Approved';
                        let step3Icon = 'ri-checkbox-circle-line';
                        let step3Color = 'var(--emerald, #24b47e)';

                        if (isRejected) {
                            step3Label = 'Rejected';
                            step3Icon = 'ri-close-circle-line';
                            step3Color = '#c62828';
                        }

                        return `
                            <div style="background: var(--bg-light); border: 1px solid var(--border-light); border-radius: 8px; padding: 16px;">
                                <div style="font-weight: 600; color: var(--navy); margin-bottom: 4px; font-size: 14px; text-align: left;">${this.escapeHtml(c.paper_title)}</div>
                                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 24px; text-align: left;">
                                    <strong>Organizer:</strong> ${this.escapeHtml(c.conf_name)} | <strong>Submitted on:</strong> ${dateStr}
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; position: relative; margin-top: 10px; padding: 0 10px;">
                                    <div style="position: absolute; top: 14px; left: 40px; right: 40px; height: 3px; background: var(--border-light); z-index: 1;">
                                        <div style="width: ${isApproved || isRejected ? '100%' : (isUnderReview ? '50%' : '0%')}; height: 100%; background: var(--blue); transition: width 0.3s ease;"></div>
                                    </div>
                                    
                                    <div style="display: flex; flex-direction: column; align-items: center; z-index: 2; width: 80px; text-align: center;">
                                        <div style="width: 30px; height: 30px; border-radius: 50%; background: ${isSubmitted ? 'var(--blue)' : 'var(--border-light)'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; margin-bottom: 4px;">
                                            <i class="ri-send-plane-line"></i>
                                        </div>
                                        <span style="font-size: 11px; font-weight: 600; color: ${isSubmitted ? 'var(--navy)' : 'var(--text-muted)'};">Submitted</span>
                                    </div>

                                    <div style="display: flex; flex-direction: column; align-items: center; z-index: 2; width: 80px; text-align: center;">
                                        <div style="width: 30px; height: 30px; border-radius: 50%; background: ${isUnderReview ? 'var(--blue)' : 'var(--border-light)'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; margin-bottom: 4px;">
                                            <i class="ri-eye-line"></i>
                                        </div>
                                        <span style="font-size: 11px; font-weight: 600; color: ${isUnderReview ? 'var(--navy)' : 'var(--text-muted)'};">Under Review</span>
                                    </div>

                                    <div style="display: flex; flex-direction: column; align-items: center; z-index: 2; width: 80px; text-align: center;">
                                        <div style="width: 30px; height: 30px; border-radius: 50%; background: ${isApproved || isRejected ? step3Color : 'var(--border-light)'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; margin-bottom: 4px;">
                                            <i class="${step3Icon}"></i>
                                        </div>
                                        <span style="font-size: 11px; font-weight: 600; color: ${isApproved || isRejected ? step3Color : 'var(--text-muted)'};">${step3Label}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        };

        if (State.reimbursements.length === 0) {
            // Lazy load first
            if (!supabaseClient) {
                const localData = localStorage.getItem('demo_reimbursements');
                State.reimbursements = localData ? JSON.parse(localData) : this.getSampleReimbursements();
                runTrack();
            } else {
                supabaseClient
                    .from('reimbursements')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .then(({ data }) => {
                        State.reimbursements = data || [];
                        runTrack();
                    });
            }
        } else {
            runTrack();
        }
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
