/* ============================================
   R&D Publication Tracker — Database API (Supabase & Offline)
   ============================================ */

// Attach API methods to the App object
Object.assign(App, {
    // ── Load Environment Variables from config.env File ──
    async loadEnv() {
        let response;
        try {
            response = await fetch('config.env');
            if (!response.ok) throw new Error('Failed to fetch config.env');
        } catch (err) {
            console.warn('Could not fetch config.env, trying .config.env...', err);
            try {
                response = await fetch('.config.env');
                if (!response.ok) throw new Error('Failed to fetch .config.env');
            } catch (err2) {
                console.warn('Could not load config.env or .config.env. Running in Demo/Fallback mode.', err2);
                return;
            }
        }

        try {
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
            console.error('Error parsing environment variables:', err);
        }
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
        this.renderLeaderboard();
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

    // ── Sample Data for Demo ──
    getSampleData() {
        return [];
    },

    async loadReimbursements() {
        if (!supabaseClient) {
            const localData = localStorage.getItem('demo_reimbursements');
            State.reimbursements = localData ? JSON.parse(localData) : this.getSampleReimbursements();
            this.renderReimbursementsTable();
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('reimbursements')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            State.reimbursements = data || [];
            this.renderReimbursementsTable();
        } catch (err) {
            console.error('Failed to load reimbursements:', err);
            Toast.show('error', 'Error', 'Failed to load reimbursement claims');
        }
    },

    async submitReimbursementClaim(claimData) {
        if (!supabaseClient) {
            const localData = localStorage.getItem('demo_reimbursements');
            const list = localData ? JSON.parse(localData) : this.getSampleReimbursements();
            const newClaim = {
                id: crypto.randomUUID(),
                ...claimData,
                status: 'Submitted',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            list.unshift(newClaim);
            localStorage.setItem('demo_reimbursements', JSON.stringify(list));
            State.reimbursements = list;
            return newClaim;
        }

        try {
            const { data, error } = await supabaseClient
                .from('reimbursements')
                .insert([claimData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Failed to submit reimbursement claim:', err);
            throw err;
        }
    },

    async updateClaimStatus(id, newStatus) {
        if (!supabaseClient) {
            const localData = localStorage.getItem('demo_reimbursements');
            let list = localData ? JSON.parse(localData) : this.getSampleReimbursements();
            list = list.map(c => c.id === id ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c);
            localStorage.setItem('demo_reimbursements', JSON.stringify(list));
            State.reimbursements = list;
            this.renderReimbursementsTable();
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('reimbursements')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            Toast.show('success', 'Status Updated', `Claim status changed to ${newStatus}`);
            this.loadReimbursements();
        } catch (err) {
            console.error('Failed to update status:', err);
            Toast.show('error', 'Update Error', 'Failed to update claim status');
        }
    },

    getSampleReimbursements() {
        return [];
    }
});
