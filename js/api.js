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
        return [
            {
                id: 'claim-1',
                paper_title: 'Optimized Convolutional Neural Networks for Disease Detection',
                host_inst: 'Vignan University',
                conf_name: 'IEEE International Conference on AI',
                conf_dates: '2026-05-10 to 2026-05-12',
                fee_paid: 8500,
                roll_no: '211FA04001',
                student_name: 'V. Mahendra',
                branch: 'CSE',
                dept: 'CSE',
                bank_acc_holder: 'V. Mahendra',
                bank_acc_no: '30459203945',
                bank_name: 'State Bank of India',
                bank_branch: 'Vignan Vadlamudi',
                ifsc: 'SBIN0012345',
                status: 'Approved',
                created_at: new Date(Date.now() - 5 * 86400000).toISOString()
            },
            {
                id: 'claim-2',
                paper_title: 'A Decentralized Blockchain Framework for Electronic Health Records',
                host_inst: 'NIT Trichy',
                conf_name: 'National Conference on Cyber Security',
                conf_dates: '2026-06-15 to 2026-06-16',
                fee_paid: 5000,
                roll_no: '211FA04002',
                student_name: 'K. Rakesh',
                branch: 'CSE',
                dept: 'CSE',
                bank_acc_holder: 'K. Rakesh',
                bank_acc_no: '10928374656',
                bank_name: 'Union Bank',
                bank_branch: 'Tenali Main',
                ifsc: 'UBIN0532145',
                status: 'Under Review',
                created_at: new Date(Date.now() - 2 * 86400000).toISOString()
            }
        ];
    }
});
