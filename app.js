/* ============================================
   R&D Publication Tracker — Application Logic
   ============================================ */

// ─── Supabase Configuration ───
// Replace these with your actual Supabase credentials
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

let supabaseClient = null;
let isConnected = false;

// ─── App State ───
const State = {
    publications: [],
    filteredData: [],
    currentPage: 1,
    pageSize: 10,
    sortField: 'created_at',
    sortOrder: 'desc',
    searchQuery: '',
    filters: {
        program: '',
        branch: '',
        type: '',
        indexing: ''
    },
    charts: {},
    editingId: null,
    deletingId: null,
    session: null,
    userRole: null // 'super_admin', 'admin', or null
};

// ─── Initialize App ───
const App = {
    async init() {
        await this.loadEnv();
        this.initSupabase();
        this.bindEvents();
        this.initSlideshow();
        this.checkHashRoute();
        this.setupInputValidation();
        if (!supabaseClient) {
            await this.loadData();
        }
        this.hideLoading();
    },

    // ── Load Environment Variables from config.env File ──
    async loadEnv() {
        try {
            const response = await fetch('config.env');
            if (!response.ok) throw new Error('Failed to fetch config.env file');
            const text = await response.text();
            const lines = text.split('\n');
            lines.forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const val = parts.slice(1).join('=').trim();
                    if (key === 'SUPABASE_URL') SUPABASE_URL = val;
                    if (key === 'SUPABASE_ANON_KEY') SUPABASE_ANON_KEY = val;
                }
            });
        } catch (err) {
            console.warn('Could not load config.env file. Running in Demo/Fallback mode.', err);
        }
    },

    // ── Background Slideshow for College Campus Pictures ──
    initSlideshow() {
        const images = [
            'assets/Ablock.jpg.jpeg',
            'assets/H block.jpg.jpeg',
            'assets/u block.jpg.jpeg'
        ];
        let currentIndex = 0;
        const bg1 = document.getElementById('hero-bg-1');
        const bg2 = document.getElementById('hero-bg-2');
        if (!bg1 || !bg2) return;

        // Change background every 5 seconds
        setInterval(() => {
            const nextIndex = (currentIndex + 1) % images.length;
            const activeBg = bg1.style.opacity === '0' ? bg2 : bg1;
            const nextBg = bg1.style.opacity === '0' ? bg1 : bg2;

            // Load and switch
            nextBg.src = images[nextIndex];
            nextBg.style.opacity = '1';
            activeBg.style.opacity = '0';

            currentIndex = nextIndex;
        }, 5000);
    },

    // ── Supabase Init ──
    initSupabase() {
        try {
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
                console.warn('⚠️ Supabase credentials not configured. Using demo mode.');
                this.updateConnectionStatus('error', 'Not Configured');
                Toast.show('warning', 'Setup Required', 'Please configure your Supabase credentials in app.js');
                return;
            }
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            this.updateConnectionStatus('connecting', 'Connecting...');

            // Auth listener
            supabaseClient.auth.onAuthStateChange(async (event, session) => {
                State.session = session;
                if (session) {
                    await this.fetchUserRole(session.user.id);
                } else {
                    State.userRole = null;
                }
                this.updateUIForRole();
                await this.loadData();
            });
        } catch (err) {
            console.error('Supabase init error:', err);
            this.updateConnectionStatus('error', 'Connection Failed');
            Toast.show('error', 'Connection Error', 'Failed to initialize Supabase');
        }
    },

    async fetchUserRole(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();
            if (error) throw error;
            State.userRole = data ? data.role : null;
        } catch (err) {
            console.warn('Could not fetch user role, defaulting to public:', err);
            State.userRole = null;
        }
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
                this.switchView('publications');
            } else if (viewId === 'manage-admins' && role !== 'super_admin') {
                this.switchView('publications');
            } else if (viewId === 'add' && !role) {
                this.switchView('publications');
            } else if (viewId === 'export' && !role) {
                this.switchView('publications');
            }
        }
    },

    updateConnectionStatus(status, text) {
        const el = document.getElementById('connectionStatus');
        const dot = el.querySelector('.conn-dot');
        const span = el.querySelector('span');
        dot.className = 'conn-dot';
        if (status === 'connected') {
            dot.classList.add('connected');
            isConnected = true;
        } else if (status === 'error') {
            dot.classList.add('error');
            isConnected = false;
        }
        span.textContent = text;
    },

    // ── Data Operations ──
    async loadData() {
        if (!supabaseClient) {
            // Demo mode — load sample data
            State.publications = this.getSampleData();
            this.onDataLoaded();
            return;
        }

        try {
            // If logged in, fetch all columns from publications table.
            // If not logged in (public user), fetch columns from public_publications view (excludes funding).
            const sourceTable = State.session ? 'publications' : 'public_publications';
            const { data, error } = await supabaseClient
                .from(sourceTable)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            State.publications = data || [];
            this.updateConnectionStatus('connected', State.session ? 'Connected (Admin)' : 'Connected');
            this.onDataLoaded();
        } catch (err) {
            console.error('Load error:', err);
            this.updateConnectionStatus('error', 'Load Failed');
            Toast.show('error', 'Load Error', err.message || 'Failed to load publications');
            // Fallback to sample data
            State.publications = this.getSampleData();
            this.onDataLoaded();
        }
    },

    onDataLoaded() {
        this.applyFilters();
        this.updateDashboard();
        this.renderCharts();
        this.renderRecentTable();
    },

    async addPublication(formData) {
        const submitBtn = document.getElementById('formSubmitBtn');
        const loader = submitBtn ? submitBtn.querySelector('.btn-spinner') : null;
        const icon = submitBtn ? submitBtn.querySelector('i') : null;

        if (submitBtn) submitBtn.disabled = true;
        if (loader) loader.style.display = 'block';
        if (icon) icon.style.display = 'none';

        try {
            if (!supabaseClient) {
                // Demo mode
                const newPub = {
                    id: crypto.randomUUID(),
                    ...formData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                State.publications.unshift(newPub);
                this.onDataLoaded();
                Toast.show('success', 'Publication Added!', `${formData.name}'s publication has been recorded.`);
                document.getElementById('publicationForm').reset();
                this.resetToggles();
                return;
            }

            const { data, error } = await supabaseClient
                .from('publications')
                .insert([formData])
                .select();

            if (error) throw error;

            State.publications.unshift(data[0]);
            this.onDataLoaded();
            Toast.show('success', 'Publication Added!', `${formData.name}'s publication has been saved to database.`);
            document.getElementById('publicationForm').reset();
            this.resetToggles();
        } catch (err) {
            console.error('Add error:', err);
            let msg = err.message || 'Failed to save publication';
            if (msg.includes('row-level security') || msg.includes('RLS')) {
                msg = 'Access Denied: You are logged in with offline demo credentials. Please log in using a real account registered in your Supabase Auth panel.';
            }
            Toast.show('error', 'Save Failed', msg);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
            if (loader) loader.style.display = 'none';
            if (icon) icon.style.display = '';
        }
    },

    async updatePublication(id, formData) {
        try {
            if (!supabaseClient) {
                const idx = State.publications.findIndex(p => p.id === id);
                if (idx !== -1) {
                    State.publications[idx] = { ...State.publications[idx], ...formData, updated_at: new Date().toISOString() };
                }
                this.onDataLoaded();
                this.closeModal('editModal');
                Toast.show('success', 'Updated!', 'Publication record has been updated.');
                return;
            }

            const { error } = await supabaseClient
                .from('publications')
                .update({ ...formData, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            const idx = State.publications.findIndex(p => p.id === id);
            if (idx !== -1) {
                State.publications[idx] = { ...State.publications[idx], ...formData, updated_at: new Date().toISOString() };
            }
            this.onDataLoaded();
            this.closeModal('editModal');
            Toast.show('success', 'Updated!', 'Publication record has been updated in database.');
        } catch (err) {
            console.error('Update error:', err);
            let msg = err.message || 'Failed to update publication';
            if (msg.includes('row-level security') || msg.includes('RLS')) {
                msg = 'Access Denied: Please log in using a real account registered in your Supabase Auth panel.';
            }
            Toast.show('error', 'Update Failed', msg);
        }
    },

    async deletePublication(id) {
        try {
            if (!supabaseClient) {
                State.publications = State.publications.filter(p => p.id !== id);
                this.onDataLoaded();
                this.closeModal('deleteModal');
                Toast.show('success', 'Deleted', 'Publication record has been removed.');
                return;
            }

            const { error } = await supabaseClient
                .from('publications')
                .delete()
                .eq('id', id);

            if (error) throw error;

            State.publications = State.publications.filter(p => p.id !== id);
            this.onDataLoaded();
            this.closeModal('deleteModal');
            Toast.show('success', 'Deleted', 'Publication record has been removed from database.');
        } catch (err) {
            console.error('Delete error:', err);
            let msg = err.message || 'Failed to delete publication';
            if (msg.includes('row-level security') || msg.includes('RLS')) {
                msg = 'Access Denied: Please log in using a real account registered in your Supabase Auth panel.';
            }
            Toast.show('error', 'Delete Failed', msg);
        }
    },

    resetToggles() {
        // Reset toggle buttons to default
        document.querySelectorAll('#programToggle .pill').forEach(b => b.classList.remove('active'));
        document.querySelector('#programToggle .pill[data-value="UG"]').classList.add('active');
        document.querySelectorAll('#typeToggle .pill').forEach(b => b.classList.remove('active'));
        document.querySelector('#typeToggle .pill[data-value="Journal"]').classList.add('active');
    },

    // ── Dashboard ──
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

    // ── Charts ──
    renderCharts() {
        const data = State.publications;
        this.renderTypeChart(data);
        this.renderBranchChart(data);
        this.renderIndexingChart(data);
    },

    renderTypeChart(data) {
        const ctx = document.getElementById('chartType');
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

    // ── Recent Table ──
    renderRecentTable() {
        const tbody = document.getElementById('recentTableBody');
        const empty = document.getElementById('recentEmpty');
        const recent = State.publications.slice(0, 5);

        if (recent.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
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

    // ── Publications Table ──
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
    },

    renderPublicationsTable() {
        const tbody = document.getElementById('pubTableBody');
        const empty = document.getElementById('pubEmpty');
        const table = document.getElementById('pubTable');
        const countEl = document.getElementById('pubCount');

        const data = State.filteredData;
        const totalPages = Math.max(1, Math.ceil(data.length / State.pageSize));
        const start = (State.currentPage - 1) * State.pageSize;
        const end = start + State.pageSize;
        const pageData = data.slice(start, end);

        countEl.textContent = `${data.length} publication${data.length !== 1 ? 's' : ''} found`;

        if (pageData.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            table.style.display = 'none';
        } else {
            empty.style.display = 'none';
            table.style.display = '';
            tbody.innerHTML = pageData.map(p => {
                const titleHtml = p.paper_link 
                    ? `<a href="${p.paper_link}" target="_blank" style="color: var(--accent-light, #2196f3); text-decoration: none; font-weight: 500;" class="paper-link" title="View Publication">${this.escapeHtml(this.truncate(p.article_title, 35))} <i class="ri-external-link-line" style="font-size: 11px;"></i></a>`
                    : this.escapeHtml(this.truncate(p.article_title, 35));
                return `
                    <tr>
                        <td class="clickable-copy" onclick="App.copyToClipboard('${p.roll_no}', 'Paper ID')" title="Click to copy Paper ID"><strong>${this.escapeHtml(p.roll_no)}</strong> <i class="ri-file-copy-line copy-ico"></i></td>
                        <td class="admin-only">${this.escapeHtml(p.name)}</td>
                        <td class="admin-only"><span class="badge badge-${p.program.toLowerCase()}">${p.program}</span></td>
                        <td class="admin-only">${this.escapeHtml(p.branch)}</td>
                        <td title="${this.escapeHtml(p.article_title)}">${titleHtml}</td>
                        <td class="admin-only"><span class="badge badge-${p.publication_type.toLowerCase()}">${p.publication_type}</span></td>
                        <td class="admin-only"><span class="badge badge-indexing">${this.escapeHtml(p.indexing || '—')}</span></td>
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
        document.getElementById('pageInfo').textContent = `Page ${State.currentPage} of ${totalPages}`;
        document.getElementById('prevPage').disabled = State.currentPage <= 1;
        document.getElementById('nextPage').disabled = State.currentPage >= totalPages;
    },

    // ── Modals ──
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
        document.getElementById(modalId).classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        document.body.style.overflow = '';
    },

    // ── View Switching ──
    switchView(viewName) {
        // Update nav
        document.querySelectorAll('.nav-link').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`view-${viewName}`).classList.add('active');

        // Hide/Show Hero Section (only show on Dashboard)
        const heroSection = document.getElementById('heroSection');
        const mainWrapper = document.querySelector('.main-wrapper');
        if (viewName === 'dashboard') {
            if (heroSection) heroSection.style.display = 'block';
            if (mainWrapper) mainWrapper.style.paddingTop = '32px';
        } else {
            if (heroSection) heroSection.style.display = 'none';
            if (mainWrapper) mainWrapper.style.paddingTop = 'calc(var(--nav-height) + 32px)';
        }

        // Refresh data when switching to publications
        if (viewName === 'publications') {
            this.applyFilters();
        }

        // Close mobile nav links
        document.getElementById('navLinks').classList.remove('open');
    },

    // ── Export ──
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

    // ── Event Bindings ──
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(item.dataset.view);
            });
        });

        // Logo click handler
        const navBrand = document.querySelector('.nav-brand');
        if (navBrand) {
            navBrand.addEventListener('click', (e) => {
                e.preventDefault();
                if (State.userRole === 'super_admin') {
                    this.switchView('dashboard');
                } else {
                    this.switchView('publications');
                }
            });
        }

        // Mobile nav toggle
        document.getElementById('navToggle').addEventListener('click', () => {
            document.getElementById('navLinks').classList.toggle('open');
        });

        // Toggle pills (Program & Type)
        document.querySelectorAll('.toggle-pills').forEach(group => {
            group.querySelectorAll('.pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    group.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        });

        // Add Publication Form
        document.getElementById('publicationForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;

            const formData = {
                roll_no: document.getElementById('rollNo').value.trim(),
                name: document.getElementById('studentName').value.trim(),
                program: document.querySelector('#programToggle .pill.active').dataset.value,
                branch: document.getElementById('branch').value,
                article_title: document.getElementById('articleTitle').value.trim(),
                publication_type: document.querySelector('#typeToggle .pill.active').dataset.value,
                indexing: document.getElementById('indexing').value,
                journal_conference_title: document.getElementById('journalTitle').value.trim(),
                sponsorship: document.getElementById('sponsorship').value.trim() || null,
                mentor_name: document.getElementById('mentorName').value.trim(),
                paper_link: document.getElementById('paperLink').value.trim() || null,
                funding_amount: parseFloat(document.getElementById('fundingAmount').value) || 0
            };

            await this.addPublication(formData);
        });

        // Edit Form
        document.getElementById('editForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                roll_no: document.getElementById('editRollNo').value.trim(),
                name: document.getElementById('editName').value.trim(),
                program: document.getElementById('editProgram').value,
                branch: document.getElementById('editBranch').value,
                article_title: document.getElementById('editArticleTitle').value.trim(),
                publication_type: document.getElementById('editType').value,
                indexing: document.getElementById('editIndexing').value,
                journal_conference_title: document.getElementById('editJournalTitle').value.trim(),
                sponsorship: document.getElementById('editSponsorship').value.trim() || null,
                mentor_name: document.getElementById('editMentorName').value.trim(),
                paper_link: document.getElementById('editPaperLink').value.trim() || null,
                funding_amount: parseFloat(document.getElementById('editFundingAmount').value) || 0
            };

            await this.updatePublication(State.editingId, formData);
        });

        // Modal close buttons
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal('editModal'));
        document.getElementById('modalCancelBtn').addEventListener('click', () => this.closeModal('editModal'));
        document.getElementById('deleteModalClose').addEventListener('click', () => this.closeModal('deleteModal'));
        document.getElementById('deleteCancelBtn').addEventListener('click', () => this.closeModal('deleteModal'));

        // Delete confirm
        document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
            if (State.deletingId) this.deletePublication(State.deletingId);
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeModal(overlay.id);
            });
        });

        // Search
        const searchInput = document.getElementById('searchInput');
        const searchClear = document.getElementById('searchClear');
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                State.searchQuery = searchInput.value.trim();
                searchClear.style.display = State.searchQuery ? 'flex' : 'none';
                this.applyFilters();
            }, 300);
        });
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            State.searchQuery = '';
            searchClear.style.display = 'none';
            this.applyFilters();
        });

        // Filter selects
        ['filterProgram', 'filterBranch', 'filterType', 'filterIndexing'].forEach(filterId => {
            document.getElementById(filterId).addEventListener('change', (e) => {
                const key = filterId.replace('filter', '').toLowerCase();
                // Map 'type' filter key properly
                const filterKey = key === 'type' ? 'type' : key;
                State.filters[filterKey] = e.target.value;
                this.applyFilters();
            });
        });

        // Sorting
        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sort;
                if (State.sortField === field) {
                    State.sortOrder = State.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    State.sortField = field;
                    State.sortOrder = 'asc';
                }
                this.applyFilters();
            });
        });

        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => {
            if (State.currentPage > 1) {
                State.currentPage--;
                this.renderPublicationsTable();
            }
        });
        document.getElementById('nextPage').addEventListener('click', () => {
            const totalPages = Math.ceil(State.filteredData.length / State.pageSize);
            if (State.currentPage < totalPages) {
                State.currentPage++;
                this.renderPublicationsTable();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal('editModal');
                this.closeModal('deleteModal');
                this.closeModal('loginModal');
            }
        });

        // Login Form submit
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const submitBtn = document.getElementById('loginSubmitBtn');

            submitBtn.disabled = true;
            try {
                const isDemoAdmin = email === 'admin@vignan.ac.in' && password === 'admin123';
                const isDemoSuperAdmin = email === 'superadmin@vignan.ac.in' && password === 'super123';

                if (!supabaseClient || isDemoAdmin || isDemoSuperAdmin) {
                    if (isDemoAdmin) {
                        State.session = { user: { id: 'demo-admin-id' } };
                        State.userRole = 'admin';
                        Toast.show('success', 'Logged In', 'Welcome (Demo Admin)!');
                    } else if (isDemoSuperAdmin) {
                        State.session = { user: { id: 'demo-super-id' } };
                        State.userRole = 'super_admin';
                        Toast.show('success', 'Logged In', 'Welcome (Demo Super Admin)!');
                    } else {
                        throw new Error('Invalid demo credentials. Use admin@vignan.ac.in / admin123 or superadmin@vignan.ac.in / super123.');
                    }
                    this.updateUIForRole();
                    this.closeModal('loginModal');
                    await this.loadData();
                    return;
                }

                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;

                Toast.show('success', 'Login Successful', 'Welcome back!');
                this.closeModal('loginModal');
                document.getElementById('loginEmail').value = '';
                document.getElementById('loginPassword').value = '';
            } catch (err) {
                console.error('Login error:', err);
                Toast.show('error', 'Login Failed', err.message);
            } finally {
                submitBtn.disabled = false;
            }
        });

        // Hash change routing
        window.addEventListener('hashchange', () => this.checkHashRoute());

        // Create Admin Form Submit
        const createAdminForm = document.getElementById('createAdminForm');
        if (createAdminForm) {
            createAdminForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('adminEmail').value.trim();
                const password = document.getElementById('adminPassword').value;
                const submitBtn = document.getElementById('createAdminSubmitBtn');
                
                submitBtn.disabled = true;
                try {
                    if (!supabaseClient) {
                        Toast.show('success', 'Admin Created (Demo)', `New admin account registered: ${email}`);
                        createAdminForm.reset();
                        return;
                    }

                    const { error } = await supabaseClient.rpc('create_admin_user', {
                        new_email: email,
                        new_password: password
                    });

                    if (error) throw error;

                    Toast.show('success', 'Success!', `Registered admin: ${email}`);
                    createAdminForm.reset();
                } catch (err) {
                    console.error('Error creating admin:', err);
                    Toast.show('error', 'Registration Failed', err.message || 'Failed to create admin');
                } finally {
                    submitBtn.disabled = false;
                }
            });
        }
    },

    async handleAuthClick() {
        if (State.session) {
            try {
                if (supabaseClient) {
                    const { error } = await supabaseClient.auth.signOut();
                    if (error) throw error;
                } else {
                    State.session = null;
                    State.userRole = null;
                    this.updateUIForRole();
                    await this.loadData();
                }
                window.location.hash = ''; // Clear the admin hash to hide the button
                Toast.show('success', 'Logged Out', 'Successfully logged out.');
            } catch (err) {
                console.error('Logout error:', err);
                Toast.show('error', 'Logout Failed', err.message);
            }
        } else {
            this.openModal('loginModal');
        }
    },

    checkHashRoute() {
        const hash = window.location.hash;
        if (hash === '#admin' || hash === '#login') {
            document.body.classList.add('show-auth-trigger');
            if (!State.session) {
                this.openModal('loginModal');
            }
        } else {
            document.body.classList.remove('show-auth-trigger');
        }
    },

    setupInputValidation() {
        const validateRoll = (el) => {
            const val = el.value.trim();
            if (val === '') {
                el.classList.remove('is-valid', 'is-invalid');
                return;
            }
            // Vignan roll numbers are alphanumeric, between 8 and 10 chars
            const pattern = /^[a-zA-Z0-9]{8,10}$/;
            if (pattern.test(val)) {
                el.classList.add('is-valid');
                el.classList.remove('is-invalid');
            } else {
                el.classList.add('is-invalid');
                el.classList.remove('is-valid');
            }
        };

        const rollInput = document.getElementById('rollNo');
        const editRollInput = document.getElementById('editRollNo');
        if (rollInput) {
            rollInput.addEventListener('input', () => validateRoll(rollInput));
        }
        if (editRollInput) {
            editRollInput.addEventListener('input', () => validateRoll(editRollInput));
        }

        // Email validation for Admin registration
        const adminEmail = document.getElementById('adminEmail');
        if (adminEmail) {
            adminEmail.addEventListener('input', () => {
                const email = adminEmail.value.trim();
                if (email === '') {
                    adminEmail.classList.remove('is-valid', 'is-invalid');
                    return;
                }
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailPattern.test(email) && email.toLowerCase().endsWith('@vignan.ac.in')) {
                    adminEmail.classList.add('is-valid');
                    adminEmail.classList.remove('is-invalid');
                } else {
                    adminEmail.classList.add('is-invalid');
                    adminEmail.classList.remove('is-valid');
                }
            });
        }

        // Indexing Helper Tooltips
        const indexingGuides = {
            'SCI': 'Science Citation Index — Highest quality, recommended for international research journals.',
            'Scopus': 'Scopus Index — Widely recognized indexing for premium international journals & IEEE conferences.',
            'UGC': 'UGC Care List — Recommended for national journals and Indian research publications.',
            'Web of Science': 'Clarivate Web of Science — Elite indexing standard matching global metrics.',
            'IEEE': 'IEEE Xplore — Highly recommended for Computer Science & Engineering conferences/publications.',
            'Springer': 'Springer Link — Prestigious publisher with high citation index.',
            'Elsevier': 'Elsevier ScienceDirect — Renowned international scientific publisher.',
            'Google Scholar': 'Google Scholar — Free indexing, good for citation tracking but verify with faculty advisor.',
            'Others': 'Non-listed indexing — Choose if your index is not in the list.'
        };

        const setupIndexingGuide = (selectId, helperId) => {
            const select = document.getElementById(selectId);
            const helper = document.getElementById(helperId);
            if (select && helper) {
                select.addEventListener('change', () => {
                    const guide = indexingGuides[select.value] || '';
                    helper.textContent = guide;
                });
            }
        };

        setupIndexingGuide('indexing', 'indexingHelper');
        setupIndexingGuide('editIndexing', 'editIndexingHelper');
    },

    // ── Utility ──
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
    },

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('active');
    },

    // ── Sample Data for Demo ──
    getSampleData() {
        return [
            {
                id: crypto.randomUUID(), roll_no: '21CSE001', name: 'Aarav Sharma', program: 'UG', branch: 'CSE',
                article_title: 'Deep Learning Approaches for Natural Language Processing in Healthcare',
                publication_type: 'Journal', indexing: 'Scopus', journal_conference_title: 'International Journal of AI in Medicine',
                sponsorship: 'AICTE Funded', created_at: '2026-07-10T10:00:00Z', updated_at: '2026-07-10T10:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '21ECE045', name: 'Priya Reddy', program: 'UG', branch: 'ECE',
                article_title: 'IoT-Based Smart Agriculture Monitoring System using LoRaWAN',
                publication_type: 'Conference', indexing: 'IEEE', journal_conference_title: 'IEEE International Conference on IoT',
                sponsorship: null, created_at: '2026-07-08T09:00:00Z', updated_at: '2026-07-08T09:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '22MCA012', name: 'Rohan Patel', program: 'PG', branch: 'MCA',
                article_title: 'Blockchain-Based Decentralized Identity Management Framework',
                publication_type: 'Journal', indexing: 'SCI', journal_conference_title: 'Journal of Distributed Systems & Technology',
                sponsorship: 'UGC Fellowship', created_at: '2026-07-05T14:00:00Z', updated_at: '2026-07-05T14:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '21AI&ML008', name: 'Sneha Gupta', program: 'UG', branch: 'AI&ML',
                article_title: 'Transformer-Based Models for Low-Resource Language Translation',
                publication_type: 'Conference', indexing: 'Springer', journal_conference_title: 'Springer LNCS AI Conference 2026',
                sponsorship: null, created_at: '2026-06-28T11:00:00Z', updated_at: '2026-06-28T11:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '22ME034', name: 'Vikram Singh', program: 'PG', branch: 'ME',
                article_title: 'Optimization of 3D Printing Parameters for Biocompatible Materials',
                publication_type: 'Journal', indexing: 'Web of Science', journal_conference_title: 'Materials Today: Proceedings',
                sponsorship: 'DST-SERB Grant', created_at: '2026-06-20T08:00:00Z', updated_at: '2026-06-20T08:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '21CSE078', name: 'Ananya Krishnan', program: 'UG', branch: 'CSE',
                article_title: 'Federated Learning for Privacy-Preserving Medical Image Analysis',
                publication_type: 'Journal', indexing: 'Scopus', journal_conference_title: 'Elsevier Journal of Biomedical Informatics',
                sponsorship: 'ICMR Funded', created_at: '2026-06-15T16:00:00Z', updated_at: '2026-06-15T16:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '22DS005', name: 'Karthik Nair', program: 'PG', branch: 'DS',
                article_title: 'Real-Time Anomaly Detection in Financial Transactions using Graph Neural Networks',
                publication_type: 'Conference', indexing: 'IEEE', journal_conference_title: 'IEEE Big Data Conference 2026',
                sponsorship: null, created_at: '2026-06-10T12:00:00Z', updated_at: '2026-06-10T12:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '21EEE022', name: 'Divya Menon', program: 'UG', branch: 'EEE',
                article_title: 'Solar PV MPPT Controller Design using Reinforcement Learning',
                publication_type: 'Journal', indexing: 'UGC', journal_conference_title: 'Indian Journal of Renewable Energy',
                sponsorship: 'MNRE Sponsorship', created_at: '2026-06-05T10:00:00Z', updated_at: '2026-06-05T10:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '21CSE100', name: 'Sai Kumar', program: 'PG', branch: 'CSE',
                article_title: 'Real-time Analysis of Deep Neural Networks in Edge Computing',
                publication_type: 'Journal', indexing: 'Scopus', journal_conference_title: 'IEEE Transactions on Pattern Analysis',
                sponsorship: 'DST Funded', created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '21ECE089', name: 'Meghana Rao', program: 'UG', branch: 'ECE',
                article_title: 'Automated Weed Detection using Convolutional Neural Networks on UAVs',
                publication_type: 'Conference', indexing: 'IEEE', journal_conference_title: 'IEEE Drone Application Conference',
                sponsorship: null, created_at: '2026-05-28T09:00:00Z', updated_at: '2026-05-28T09:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '22MCA045', name: 'Kiran Kumar', program: 'PG', branch: 'MCA',
                article_title: 'Predictive Analytics for Student Academic Performance using Machine Learning',
                publication_type: 'Journal', indexing: 'UGC', journal_conference_title: 'Journal of Indian Education & Research',
                sponsorship: null, created_at: '2026-05-25T14:00:00Z', updated_at: '2026-05-25T14:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '21AI&ML015', name: 'Harsha Vardhan', program: 'UG', branch: 'AI&ML',
                article_title: 'A Comparative Analysis of Optimizers in Generative Adversarial Networks',
                publication_type: 'Conference', indexing: 'Springer', journal_conference_title: 'International Conference on ML & Optimization',
                sponsorship: 'College Funded', created_at: '2026-05-20T11:00:00Z', updated_at: '2026-05-20T11:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '22ME012', name: 'Tarun Teja', program: 'PG', branch: 'ME',
                article_title: 'Design and Finite Element Analysis of Light-Weight Automotive Chassis',
                publication_type: 'Journal', indexing: 'SCI', journal_conference_title: 'Journal of Mechanical Design & Engineering',
                sponsorship: 'DST Grant', created_at: '2026-05-15T08:00:00Z', updated_at: '2026-05-15T08:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '21CSE105', name: 'Yamini Krishna', program: 'UG', branch: 'CSE',
                article_title: 'Enhancing Cyber-Security in Smart Grids using Anomaly Detection',
                publication_type: 'Journal', indexing: 'Scopus', journal_conference_title: 'IEEE Transactions on Smart Grid',
                sponsorship: 'AICTE Grant', created_at: '2026-05-10T16:00:00Z', updated_at: '2026-05-10T16:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '22DS018', name: 'Pranavi Reddy', program: 'PG', branch: 'DS',
                article_title: 'Customer Churn Prediction in Telecom Industry using Ensemble Learning',
                publication_type: 'Conference', indexing: 'IEEE', journal_conference_title: 'IEEE Data Science Workshop 2026',
                sponsorship: null, created_at: '2026-05-05T12:00:00Z', updated_at: '2026-05-05T12:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '21EEE040', name: 'Nithin Kumar', program: 'UG', branch: 'EEE',
                article_title: 'Development of Battery Management System for Electric Vehicles',
                publication_type: 'Journal', indexing: 'Web of Science', journal_conference_title: 'Journal of Power Sources & Energy',
                sponsorship: 'NTPC Sponsored', created_at: '2026-05-01T10:00:00Z', updated_at: '2026-05-01T10:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '21CSE110', name: 'Sandeep Varma', program: 'UG', branch: 'CSE',
                article_title: 'Decentralized Voting System based on Ethereum Smart Contracts',
                publication_type: 'Conference', indexing: 'Others', journal_conference_title: 'International Conference on Blockchain Tech',
                sponsorship: null, created_at: '2026-04-25T10:00:00Z', updated_at: '2026-04-25T10:00:00Z'
            },
            {
                id: crypto.randomUUID(), roll_no: '22DS022', name: 'Manasa Devi', program: 'PG', branch: 'DS',
                article_title: 'Sentiment Analysis on Multilingual Social Media Posts using BERT',
                publication_type: 'Journal', indexing: 'SCI', journal_conference_title: 'Journal of Computational Linguistics',
                sponsorship: 'UGC NET Fellowship', created_at: '2026-04-20T10:00:00Z', updated_at: '2026-04-20T10:00:00Z'
            }
        ];
    }
};

// ─── Toast Notification System ───
const Toast = {
    show(type, title, message) {
        const container = document.getElementById('toastContainer');
        const icons = {
            success: 'ri-check-double-line',
            error: 'ri-error-warning-line',
            warning: 'ri-alarm-warning-line',
            info: 'ri-information-line'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="toast-icon ${icons[type]}"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="Toast.dismiss(this)">
                <i class="ri-close-line"></i>
            </button>
        `;

        container.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            this.remove(toast);
        }, 4000);
    },

    dismiss(btn) {
        this.remove(btn.closest('.toast'));
    },

    remove(toast) {
        if (!toast || toast.classList.contains('removing')) return;
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }
};

// Expose App and Toast globally for inline HTML events
window.App = App;
window.Toast = Toast;

// ─── Initialize on DOM Ready ───
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});