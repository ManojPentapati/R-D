/* ============================================
   R&D Publication Tracker — Bulk Excel / CSV Upload
   ============================================ */

Object.assign(App, {
    // ── Bulk File Upload and Parsing ──
    async handleBulkFileSelect(file) {
        const fileNameIndicator = document.getElementById('fileNameIndicator');
        if (fileNameIndicator) {
            fileNameIndicator.textContent = file.name;
            fileNameIndicator.style.display = 'inline-block';
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length <= 1) {
                    Toast.show('error', 'Empty File', 'The uploaded file contains no data.');
                    return;
                }

                const headers = jsonData[0].map(h => (h || '').toString().trim().toLowerCase());
                const rows = jsonData.slice(1);

                const keyMap = {
                    'roll_no': ['roll no', 'roll number', 'rollno', 'paper id', 'id'],
                    'name': ['student name', 'name', 'studentname'],
                    'program': ['program', 'ug/pg', 'ug_pg'],
                    'branch': ['branch', 'department', 'dept'],
                    'article_title': ['article title', 'paper title', 'title', 'article_title'],
                    'publication_type': ['publication type', 'type', 'publication_type', 'journal/conference'],
                    'indexing': ['indexing', 'indexed'],
                    'journal_conference_title': ['journal/conference title', 'journal name', 'conference name', 'journal_conference_title'],
                    'sponsorship': ['sponsorship', 'sponsor'],
                    'mentor_name': ['mentor name', 'mentor', 'guide name', 'guide', 'mentor_name'],
                    'paper_link': ['paper link', 'link', 'doi', 'paper_link'],
                    'funding_amount': ['funding amount', 'funding', 'registration fee', 'funding_amount'],
                    'journal_tier': ['journal tier', 'q-rank', 'q rank', 'tier', 'journal_tier'],
                    'impact_factor': ['impact factor', 'impact', 'if', 'impact_factor']
                };

                const headerIndices = {};
                for (const [key, aliases] of Object.entries(keyMap)) {
                    const idx = headers.findIndex(h => aliases.includes(h) || aliases.some(alias => h.includes(alias)));
                    headerIndices[key] = idx;
                }

                const recordsToInsert = [];
                const errors = [];

                rows.forEach((row, rowIndex) => {
                    const getVal = (key) => {
                        const idx = headerIndices[key];
                        return idx !== -1 && row[idx] !== undefined ? row[idx].toString().trim() : '';
                    };

                    const record = {
                        roll_no: getVal('roll_no'),
                        name: getVal('name'),
                        program: getVal('program').toUpperCase(),
                        branch: getVal('branch').toUpperCase(),
                        article_title: getVal('article_title'),
                        publication_type: getVal('publication_type'),
                        indexing: getVal('indexing'),
                        journal_conference_title: getVal('journal_conference_title'),
                        sponsorship: getVal('sponsorship') || null,
                        mentor_name: getVal('mentor_name'),
                        paper_link: getVal('paper_link') || null,
                        funding_amount: parseFloat(getVal('funding_amount')) || 0,
                        journal_tier: getVal('journal_tier') || null,
                        impact_factor: parseFloat(getVal('impact_factor')) || null
                    };

                    if (record.publication_type) {
                        const t = record.publication_type.toLowerCase();
                        if (t.includes('journal') || t === 'j') record.publication_type = 'Journal';
                        else if (t.includes('conf') || t === 'c') record.publication_type = 'Conference';
                    }

                    if (!record.roll_no && !record.name && !record.article_title) {
                        return; // skip empty rows
                    }

                    const lineNum = rowIndex + 2;
                    if (!record.roll_no) errors.push(`Line ${lineNum}: Roll number is missing.`);
                    if (!record.name) errors.push(`Line ${lineNum}: Student name is missing.`);
                    if (!['UG', 'PG'].includes(record.program)) errors.push(`Line ${lineNum}: Program must be 'UG' or 'PG'.`);
                    if (!record.branch) errors.push(`Line ${lineNum}: Branch is missing.`);
                    if (!record.article_title) errors.push(`Line ${lineNum}: Article title is missing.`);
                    if (!['Journal', 'Conference'].includes(record.publication_type)) errors.push(`Line ${lineNum}: Publication Type must be 'Journal' or 'Conference'.`);
                    if (!record.indexing) errors.push(`Line ${lineNum}: Indexing is missing.`);
                    if (!record.journal_conference_title) errors.push(`Line ${lineNum}: Journal/Conference name is missing.`);
                    if (!record.mentor_name) errors.push(`Line ${lineNum}: Mentor/Guide name is missing.`);

                    recordsToInsert.push(record);
                });

                if (errors.length > 0) {
                    alert(`Import Validation Failed:\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ''}`);
                    return;
                }

                if (recordsToInsert.length === 0) {
                    Toast.show('warning', 'No Records', 'No valid records found to import.');
                    return;
                }

                // Store in state and display preview modal
                State.pendingImports = recordsToInsert;

                const previewStatus = document.getElementById('importPreviewStatus');
                if (previewStatus) {
                    previewStatus.innerHTML = `You are about to import <strong>${recordsToInsert.length}</strong> publication records from the spreadsheet. Please verify the mapped columns in the preview below before confirming.`;
                }

                const previewBody = document.getElementById('importPreviewBody');
                if (previewBody) {
                    // Preview up to 8 rows
                    const previewRows = recordsToInsert.slice(0, 8);
                    previewBody.innerHTML = previewRows.map(p => `
                        <tr>
                            <td><strong>${this.escapeHtml(p.roll_no)}</strong></td>
                            <td>${this.escapeHtml(p.name)}</td>
                            <td><span class="badge badge-${p.program.toLowerCase()}">${p.program}</span></td>
                            <td>${this.escapeHtml(p.branch)}</td>
                            <td title="${this.escapeHtml(p.article_title)}">${this.escapeHtml(this.truncate(p.article_title, 30))}</td>
                            <td><span class="badge badge-${p.publication_type.toLowerCase()}">${p.publication_type}</span></td>
                            <td><span class="badge badge-indexing">${this.escapeHtml(p.indexing || '—')}</span></td>
                            <td>${this.escapeHtml(p.mentor_name || '—')}</td>
                        </tr>
                    `).join('');
                }

                this.openModal('importPreviewModal');

            } catch (err) {
                console.error(err);
                Toast.show('error', 'Import Failed', err.message || 'An error occurred during file parsing.');
            }
        };

        reader.readAsArrayBuffer(file);
    },

    async confirmBulkImport() {
        const recordsToInsert = State.pendingImports;
        if (!recordsToInsert || recordsToInsert.length === 0) return;

        this.closeModal('importPreviewModal');

        const progressContainer = document.getElementById('uploadProgress');
        const progressBarFill = document.getElementById('progressBarFill');
        const progressStatus = document.getElementById('progressStatus');

        if (progressContainer) {
            progressContainer.style.display = 'block';
            progressBarFill.style.width = '20%';
            progressStatus.textContent = `Importing ${recordsToInsert.length} records...`;
        }

        try {
            let successCount = 0;
            if (supabaseClient) {
                progressBarFill.style.width = '50%';
                const { data, error } = await supabaseClient
                    .from('publications')
                    .insert(recordsToInsert)
                    .select();

                if (error) {
                    if (error.message && error.message.includes('row-level security')) {
                        throw new Error('Supabase RLS Error: Row-Level Security prevents anonymous uploads. Please log in with valid admin credentials.');
                    }
                    throw error;
                }
                successCount = data.length;
            } else {
                recordsToInsert.forEach(rec => {
                    rec.id = 'demo-' + Math.random().toString(36).substr(2, 9);
                    rec.created_at = new Date().toISOString();
                    State.publications.unshift(rec);
                });
                successCount = recordsToInsert.length;
                this.saveLocalData();
            }

            progressBarFill.style.width = '100%';
            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
                Toast.show('success', 'Import Successful', `Successfully registered ${successCount} student publications.`);
                this.loadData();
                this.switchView('publications');

                const fileInput = document.getElementById('bulkUploadFile');
                if (fileInput) fileInput.value = '';
                const fileNameIndicator = document.getElementById('fileNameIndicator');
                if (fileNameIndicator) {
                    fileNameIndicator.textContent = '';
                    fileNameIndicator.style.display = 'none';
                }
            }, 500);

        } catch (err) {
            console.error(err);
            if (progressContainer) progressContainer.style.display = 'none';
            Toast.show('error', 'Import Failed', err.message || 'An error occurred during file upload.');
        } finally {
            State.pendingImports = [];
        }
    },

    downloadImportTemplate(e) {
        if (e) e.preventDefault();
        try {
            const headers = ['Roll No', 'Student Name', 'Program', 'Branch', 'Article Title', 'Type', 'Indexing', 'Journal/Conference Name', 'Sponsorship', 'Mentor / Guide', 'Paper Link', 'Funding Amount'];
            const sampleData = [
                ['21CSE001', 'John Doe', 'UG', 'CSE', 'A Study on AI Agents', 'Journal', 'Scopus', 'International Journal of AI', 'N/A', 'Dr. Ramesh Kumar', 'https://doi.org/12.3456/789', 5000],
                ['22ECE102', 'Jane Smith', 'PG', 'ECE', 'IoT Smart Farming System', 'Conference', 'IEEE', 'IEEE IoT Conference 2026', 'Department Funded', 'Dr. Priya Sharma', 'https://ieeexplore.ieee.org/document/xyz', 3500]
            ];

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
            XLSX.utils.book_append_sheet(wb, ws, "Template");
            XLSX.writeFile(wb, "Vignan_Publications_Template.xlsx");
            Toast.show('success', 'Template Downloaded', 'Spreadsheet template ready for use.');
        } catch (err) {
            console.error('Error generating template:', err);
            Toast.show('error', 'Template Failed', 'Failed to generate spreadsheet template.');
        }
    },

    saveLocalData() {
        try {
            localStorage.setItem('vignan_publications', JSON.stringify(State.publications));
        } catch (e) {
            console.error('Error saving local data:', e);
        }
    }
});
