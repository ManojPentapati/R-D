/* ============================================
   R&D Publication Tracker — Fee Reimbursement Form Generator
   ============================================ */

Object.assign(App, {
    // ── Fee Reimbursement Draft Auto-save ──
    saveReimbursementDraft() {
        const authors = [];
        const nameInputs = document.querySelectorAll('.reimb-author-name');
        const roleSelects = document.querySelectorAll('.reimb-author-role');
        const deptInputs = document.querySelectorAll('.reimb-author-dept');
        const rollInputs = document.querySelectorAll('.reimb-author-roll');
        const branchInputs = document.querySelectorAll('.reimb-author-branch');
        const empcodeInputs = document.querySelectorAll('.reimb-author-empcode');

        let studentIndex = 0;
        let facultyIndex = 0;

        nameInputs.forEach((input, index) => {
            const name = input.value.trim();
            const role = roleSelects[index].value;
            const dept = deptInputs[index] ? deptInputs[index].value.trim() : '';
            let rollNo = '';
            let branch = '';
            let empCode = '';

            if (role === 'student') {
                rollNo = rollInputs[studentIndex] ? rollInputs[studentIndex].value.trim() : '';
                branch = branchInputs[studentIndex] ? branchInputs[studentIndex].value.trim() : '';
                studentIndex++;
            } else {
                empCode = empcodeInputs[facultyIndex] ? empcodeInputs[facultyIndex].value.trim() : '';
                facultyIndex++;
            }

            authors.push({ name, role, dept, rollNo, branch, empCode });
        });

        const draft = {
            paperTitle: document.getElementById('reimbPaperTitle')?.value.trim() || '',
            pubType: document.getElementById('reimbPubType')?.value || 'Conference',
            hostInst: document.getElementById('reimbHostInst')?.value.trim() || '',
            confName: document.getElementById('reimbConfName')?.value.trim() || '',
            confDates: document.getElementById('reimbConfDates')?.value.trim() || '',
            paperDoi: document.getElementById('reimbPaperDoi')?.value.trim() || '',
            studentCount: document.getElementById('reimbStudentCount')?.value || '0',
            facultyCount: document.getElementById('reimbFacultyCount')?.value || '0',
            feePaid: document.getElementById('reimbFeePaid')?.value || '',
            accHolder: document.getElementById('reimbAccHolder')?.value.trim() || '',
            accNo: document.getElementById('reimbAccNo')?.value.trim() || '',
            bankName: document.getElementById('reimbBankName')?.value.trim() || '',
            branchName: document.getElementById('reimbBankBranch')?.value.trim() || '',
            ifsc: document.getElementById('reimbIFSC')?.value.trim() || '',
            authors: authors
        };

        localStorage.setItem('reimbursement_draft', JSON.stringify(draft));
    },

    loadReimbursementDraft() {
        const raw = localStorage.getItem('reimbursement_draft');
        if (!raw) return;

        try {
            const draft = JSON.parse(raw);
            if (document.getElementById('reimbPaperTitle')) document.getElementById('reimbPaperTitle').value = draft.paperTitle;
            if (document.getElementById('reimbPubType')) {
                document.getElementById('reimbPubType').value = draft.pubType || 'Conference';
                this.handlePubTypeChange();
            }
            if (document.getElementById('reimbHostInst')) document.getElementById('reimbHostInst').value = draft.hostInst;
            if (document.getElementById('reimbConfName')) document.getElementById('reimbConfName').value = draft.confName;
            if (document.getElementById('reimbConfDates')) document.getElementById('reimbConfDates').value = draft.confDates;
            if (document.getElementById('reimbPaperDoi')) document.getElementById('reimbPaperDoi').value = draft.paperDoi || '';
            if (document.getElementById('reimbStudentCount')) document.getElementById('reimbStudentCount').value = draft.studentCount;
            if (document.getElementById('reimbFacultyCount')) document.getElementById('reimbFacultyCount').value = draft.facultyCount;
            if (document.getElementById('reimbFeePaid')) document.getElementById('reimbFeePaid').value = draft.feePaid;
            if (document.getElementById('reimbAccHolder')) document.getElementById('reimbAccHolder').value = draft.accHolder;
            if (document.getElementById('reimbAccNo')) document.getElementById('reimbAccNo').value = draft.accNo;
            if (document.getElementById('reimbBankName')) document.getElementById('reimbBankName').value = draft.bankName;
            if (document.getElementById('reimbBankBranch')) document.getElementById('reimbBankBranch').value = draft.branchName;
            if (document.getElementById('reimbIFSC')) document.getElementById('reimbIFSC').value = draft.ifsc;

            // Generate author rows first
            this.generateAuthorInputs();

            // Populate author rows
            const nameInputs = document.querySelectorAll('.reimb-author-name');
            const deptInputs = document.querySelectorAll('.reimb-author-dept');
            const rollInputs = document.querySelectorAll('.reimb-author-roll');
            const branchInputs = document.querySelectorAll('.reimb-author-branch');
            const empcodeInputs = document.querySelectorAll('.reimb-author-empcode');

            let studentIndex = 0;
            let facultyIndex = 0;

            draft.authors.forEach((author, index) => {
                if (index < nameInputs.length) {
                    nameInputs[index].value = author.name;
                    if (deptInputs[index]) deptInputs[index].value = author.dept;
                    if (author.role === 'student') {
                        if (rollInputs[studentIndex]) rollInputs[studentIndex].value = author.rollNo;
                        if (branchInputs[studentIndex]) branchInputs[studentIndex].value = author.branch;
                        studentIndex++;
                    } else {
                        if (empcodeInputs[facultyIndex]) empcodeInputs[facultyIndex].value = author.empCode;
                        facultyIndex++;
                    }
                }
            });
        } catch (e) {
            console.error('Error loading reimbursement draft:', e);
        }
    },

    clearReimbursementDraft() {
        localStorage.removeItem('reimbursement_draft');
    },

    handleReimbursementReset() {
        this.clearReimbursementDraft();

        const receiptLabel = document.getElementById('reimbReceiptFileLabel');
        if (receiptLabel) receiptLabel.textContent = 'Choose Fee Receipt';

        const proofLabel = document.getElementById('reimbPaperProofFileLabel');
        if (proofLabel) proofLabel.textContent = 'Choose Paper Proof';

        const receiptPreview = document.getElementById('reimbReceiptPreview');
        const receiptImg = document.getElementById('reimbReceiptImg');
        if (receiptPreview) receiptPreview.style.display = 'none';
        if (receiptImg) receiptImg.src = '';

        const proofPreview = document.getElementById('reimbPaperProofPreview');
        const proofImg = document.getElementById('reimbPaperProofImg');
        if (proofPreview) proofPreview.style.display = 'none';
        if (proofImg) proofImg.src = '';

        const studentCount = document.getElementById('reimbStudentCount');
        if (studentCount) studentCount.value = '0';

        const facultyCount = document.getElementById('reimbFacultyCount');
        if (facultyCount) facultyCount.value = '0';

        this.generateAuthorInputs();
    },

    handlePubTypeChange() {
        const pubType = document.getElementById('reimbPubType')?.value;
        const nameLabel = document.querySelector('label[for="reimbConfName"]');
        const nameInput = document.getElementById('reimbConfName');
        const datesLabel = document.querySelector('label[for="reimbConfDates"]');
        const datesInput = document.getElementById('reimbConfDates');
        const hostLabel = document.querySelector('label[for="reimbHostInst"]');
        const hostInput = document.getElementById('reimbHostInst');

        if (pubType === 'Journal') {
            if (nameLabel) nameLabel.innerHTML = `Name of Journal <span class="req">*</span>`;
            if (nameInput) nameInput.placeholder = 'e.g. IEEE Transactions on Medical Imaging';
            if (datesLabel) datesLabel.innerHTML = `Date of Publication <span class="req">*</span>`;
            if (datesInput) datesInput.placeholder = 'e.g. June 2026';
            if (hostLabel) hostLabel.innerHTML = `Publisher / Host Institute <span class="req">*</span>`;
            if (hostInput) hostInput.placeholder = 'e.g. IEEE or Elsevier';
        } else {
            if (nameLabel) nameLabel.innerHTML = `Name of Conference <span class="req">*</span>`;
            if (nameInput) nameInput.placeholder = 'e.g. IEEE SPICES 2026';
            if (datesLabel) datesLabel.innerHTML = `Dates of Conference <span class="req">*</span>`;
            if (datesInput) datesInput.placeholder = 'e.g. June 15-17, 2026';
            if (hostLabel) hostLabel.innerHTML = `Host Institute / Organizer <span class="req">*</span>`;
            if (hostInput) hostInput.placeholder = 'e.g. IIT Madras or IEEE Madras Section';
        }
    },

    // ── Fee Reimbursement Logic ──
    generateAuthorInputs() {
        const studentSelect = document.getElementById('reimbStudentCount');
        const facultySelect = document.getElementById('reimbFacultyCount');
        if (!studentSelect || !facultySelect) return;

        const studentCount = parseInt(studentSelect.value) || 0;
        const facultyCount = parseInt(facultySelect.value) || 0;
        const container = document.getElementById('authorInputsContainer');
        if (!container) return;

        let html = '';
        let totalIndex = 1;

        // Generate student inputs
        for (let i = 1; i <= studentCount; i++) {
            html += `
                <div class="card author-row" style="background: var(--bg-dark-card); border: 1px solid var(--border); padding: 16px; border-radius: 8px; display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px 20px; align-items: end;">
                    <input type="hidden" class="reimb-author-role" value="student">
                    
                    <div class="field" style="margin: 0; padding: 0;">
                        <label style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px;">Author ${totalIndex} Name (Student) <span class="req">*</span></label>
                        <div class="field-input">
                            <i class="ri-user-line"></i>
                            <input type="text" class="reimb-author-name" required placeholder="Full Name">
                        </div>
                    </div>
                    
                    <div class="field" style="margin: 0; padding: 0;">
                        <label style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px;">Registration Number <span class="req">*</span></label>
                        <div class="field-input">
                            <i class="ri-id-card-line"></i>
                            <input type="text" class="reimb-author-roll" required placeholder="e.g. 22DS022">
                        </div>
                    </div>

                    <div class="field" style="margin: 0; padding: 0;">
                        <label style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px;">Branch <span class="req">*</span></label>
                        <div class="field-input">
                            <i class="ri-graduation-cap-line"></i>
                            <input type="text" class="reimb-author-branch" required placeholder="e.g. B.Tech (CSE)">
                        </div>
                    </div>
                    
                    <div class="field" style="margin: 0; padding: 0;">
                        <label style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px;">Department <span class="req">*</span></label>
                        <div class="field-input">
                            <i class="ri-building-4-line"></i>
                            <input type="text" class="reimb-author-dept" required placeholder="e.g. CSE">
                        </div>
                    </div>
                </div>
            `;
            totalIndex++;
        }

        // Generate faculty inputs
        for (let i = 1; i <= facultyCount; i++) {
            html += `
                <div class="card author-row" style="background: var(--bg-dark-card); border: 1px solid var(--border); padding: 16px; border-radius: 8px; display: grid; grid-template-columns: 2fr 1.2fr 1.2fr; gap: 12px; align-items: end;">
                    <input type="hidden" class="reimb-author-role" value="faculty">
                    
                    <div class="field" style="margin: 0; padding: 0;">
                        <label style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px;">Author ${totalIndex} Name (Faculty Guide) <span class="req">*</span></label>
                        <div class="field-input">
                            <i class="ri-user-star-line"></i>
                            <input type="text" class="reimb-author-name" required placeholder="Full Name">
                        </div>
                    </div>
                    
                    <div class="field" style="margin: 0; padding: 0;">
                        <label style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px;">Employee Code <span class="req">*</span></label>
                        <div class="field-input">
                            <i class="ri-id-card-line"></i>
                            <input type="text" class="reimb-author-empcode" required placeholder="e.g. EMP1234">
                        </div>
                    </div>
                    
                    <div class="field" style="margin: 0; padding: 0;">
                        <label style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px;">Department <span class="req">*</span></label>
                        <div class="field-input">
                            <i class="ri-building-4-line"></i>
                            <input type="text" class="reimb-author-dept" required placeholder="e.g. CSE">
                        </div>
                    </div>
                </div>
            `;
            totalIndex++;
        }

        container.innerHTML = html;
    },

    handleAuthorRoleChange(selectEl) {
        const row = selectEl.closest('.author-row');
        if (!row) return;
        const deptField = row.querySelector('.reimb-dept-field');
        const deptInput = row.querySelector('.reimb-author-dept');
        if (selectEl.value === 'student') {
            deptField.style.display = 'block';
            if (deptInput) deptInput.required = true;
        } else {
            deptField.style.display = 'none';
            if (deptInput) {
                deptInput.required = false;
                deptInput.value = '';
            }
        }
    },

    renderAndOpenPrintModal(formData, receiptDataUrl, proofDataUrl) {
        State.currentReimbursementData = formData;

        const printBtn = document.getElementById('reimbPrintBtn');
        if (printBtn) printBtn.style.setProperty('display', 'none', 'important');

        const checkbox = document.getElementById('claimDeclarationCheckbox');
        if (checkbox) checkbox.checked = false;

        const submitBtn = document.getElementById('reimbRDSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="ri-send-plane-line"></i> Submit to R&D';
        }

        const preSubmit = document.getElementById('reimbPreSubmitActions');
        const postSubmit = document.getElementById('reimbPostSubmitActions');
        if (preSubmit) preSubmit.style.display = 'flex';
        if (postSubmit) postSubmit.style.display = 'none';

        const previewContent = document.getElementById('print-preview-content');
        if (!previewContent) return;

        const today = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const students = formData.authors.filter(a => a.role === 'student');
        const firstStudentDept = students.length > 0 ? students[0].dept : 'R&D Cell';

        // 1. Cover Letter Page
        let coverLetterHtml = `
            <div class="print-page cover-letter-page" style="page-break-after: always; padding: 20px; color: #000; font-family: 'Times New Roman', Times, serif; font-size: 15px; line-height: 1.6;">
                <div style="text-align: right; margin-bottom: 30px;">
                    <strong>Date:</strong> ${today}
                </div>
                
                <div style="margin-bottom: 30px;">
                    <strong>From:</strong><br>
                    ${students.map(s => `${s.name} (Regd. No: ${s.rollNo || ''}, ${s.branch || ''}, Dept. of ${s.dept || ''})`).join('<br>')}<br>
                    Vignan's Foundation for Science, Technology & Research<br>
                    Vadlamudi, Guntur (Dist.), AP
                </div>

                <div style="margin-bottom: 30px;">
                    <strong>To:</strong><br>
                    The Head of the Department,<br>
                    Department of ${firstStudentDept},<br>
                    Vignan's Foundation for Science, Technology & Research<br>
                    Vadlamudi, Guntur (Dist.), AP
                </div>

                <div style="margin-bottom: 20px;">
                    <strong>Through:</strong> Faculty Guide
                </div>

                <div style="margin-bottom: 25px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 10px 0; font-weight: bold; text-transform: uppercase; font-size: 14px;">
                    SUBJECT: Request for registration fee reimbursement for publication of paper - Reg.
                </div>

                <p>Respected Sir/Madam,</p>
                
                <p>
                    We, the student(s) of the Department of ${firstStudentDept}, ${formData.branch} program, have successfully published and presented our research paper. The details of the publication are as follows:
                </p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                    <tr>
                        <td style="width: 30%; font-weight: bold; padding: 8px; border: 1px solid #000; background: #fcfcfc;">Paper Title:</td>
                        <td style="padding: 8px; border: 1px solid #000;">${formData.paperTitle}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; padding: 8px; border: 1px solid #000; background: #fcfcfc;">Publication Type:</td>
                        <td style="padding: 8px; border: 1px solid #000;">${formData.pubType}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; padding: 8px; border: 1px solid #000; background: #fcfcfc;">${formData.pubType === 'Journal' ? 'Journal Name' : 'Conference Name'}:</td>
                        <td style="padding: 8px; border: 1px solid #000;">${formData.confName}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; padding: 8px; border: 1px solid #000; background: #fcfcfc;">${formData.pubType === 'Journal' ? 'Publisher' : 'Host Institute / Organizer'}:</td>
                        <td style="padding: 8px; border: 1px solid #000;">${formData.hostInst}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; padding: 8px; border: 1px solid #000; background: #fcfcfc;">${formData.pubType === 'Journal' ? 'Date of Publication' : 'Dates of Conference'}:</td>
                        <td style="padding: 8px; border: 1px solid #000;">${formData.confDates}</td>
                    </tr>
                    ${formData.paperDoi ? `
                    <tr>
                        <td style="font-weight: bold; padding: 8px; border: 1px solid #000; background: #fcfcfc;">DOI Link:</td>
                        <td style="padding: 8px; border: 1px solid #000;"><a href="${formData.paperDoi}" target="_blank" style="color: #000; text-decoration: none;">${formData.paperDoi}</a></td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="font-weight: bold; padding: 8px; border: 1px solid #000; background: #fcfcfc;">Registration Fee Paid:</td>
                        <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">₹${parseFloat(formData.feePaid).toLocaleString()}</td>
                    </tr>
                </table>

                <p>
                    We have successfully presented our work and paid the registration fee. The fee payment receipt, copy of the paper, and bank passbook first page are attached with this application for your reference. 
                    We kindly request you to recommend this application for reimbursement of the registration fee amount.
                </p>

                <p style="margin-top: 40px;">Thanking you,</p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; margin-top: 60px; gap: 40px;">
                    <div>
                        <div style="height: 40px;"></div>
                        <p style="border-top: 1px solid #000; display: inline-block; width: 220px; margin: 0; padding-top: 4px;">Signature of Student(s)</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="height: 40px;"></div>
                        <p style="border-top: 1px solid #000; display: inline-block; width: 220px; margin: 0; text-align: left; padding-top: 4px;">Signature of Faculty Guide</p>
                    </div>
                </div>
            </div>
        `;

        // 2. Claim Form Page
        let formHtml = `
            <div class="print-page reimbursement-form-page" style="page-break-after: always; padding: 20px; color: #000; font-family: 'Arial', sans-serif; font-size: 13px; line-height: 1.5;">
                <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
                    <h2 style="margin: 0; text-transform: uppercase; font-size: 16px; font-weight: bold;">VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY & RESEARCH</h2>
                    <p style="margin: 3px 0 0 0; font-size: 11px;">(Deemed to be University, Estd u/s 3 of UGC Act 1956) | Vadlamudi, Guntur District</p>
                    <h3 style="margin: 8px 0 0 0; background: #f2f2f2; padding: 5px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; border: 1px solid #ccc; font-weight: bold;">R&D Cell — Registration Fee Reimbursement Claim Form</h3>
                </div>

                <h4 style="margin: 0 0 6px 0; border-bottom: 1px solid #000; padding-bottom: 2px; font-size: 12px; font-weight: bold; text-transform: uppercase;">A. PUBLICATION & EVENT DETAILS</h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <tr>
                        <td style="width: 25%; border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">Title of the Paper:</td>
                        <td style="border: 1px solid #000; padding: 5px;" colspan="3">${formData.paperTitle}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">Publication Type:</td>
                        <td style="border: 1px solid #000; padding: 5px;" colspan="3">${formData.pubType}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">${formData.pubType === 'Journal' ? 'Journal Name' : 'Conference Name'}:</td>
                        <td style="border: 1px solid #000; padding: 5px;" colspan="3">${formData.confName}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">${formData.pubType === 'Journal' ? 'Publisher' : 'Host Institute'}:</td>
                        <td style="border: 1px solid #000; padding: 5px; width: 30%;">${formData.hostInst}</td>
                        <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9; width: 15%;">${formData.pubType === 'Journal' ? 'Publication Date' : 'Dates'}:</td>
                        <td style="border: 1px solid #000; padding: 5px; width: 30%;">${formData.confDates}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">DOI Link:</td>
                        <td style="border: 1px solid #000; padding: 5px;" colspan="3">${formData.paperDoi || '—'}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">Branch / Program:</td>
                        <td style="border: 1px solid #000; padding: 5px;">${formData.branch}</td>
                        <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">Fee Paid:</td>
                        <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">₹${parseFloat(formData.feePaid).toLocaleString()}</td>
                    </tr>
                </table>

                <h4 style="margin: 0 0 6px 0; border-bottom: 1px solid #000; padding-bottom: 2px; font-size: 12px; font-weight: bold; text-transform: uppercase;">B. AUTHOR(S) DETAILS</h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; text-align: center; font-size: 12px;">
                    <thead>
                        <tr style="background: #f2f2f2; font-weight: bold;">
                            <th style="border: 1px solid #000; padding: 5px; width: 6%;">S.No</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 32%; text-align: left;">Full Name</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 18%;">Regd. No / Emp Code</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 14%;">Role</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 15%; text-align: left;">Branch</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 15%; text-align: left;">Department</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${formData.authors.map((author, index) => `
                            <tr>
                                <td style="border: 1px solid #000; padding: 5px;">${index + 1}</td>
                                <td style="border: 1px solid #000; padding: 5px; text-align: left;">${author.name}</td>
                                <td style="border: 1px solid #000; padding: 5px;">${author.role === 'faculty' ? (author.empCode || '—') : (author.rollNo || '—')}</td>
                                <td style="border: 1px solid #000; padding: 5px;">${author.role === 'faculty' ? 'Faculty Guide' : 'Student'}</td>
                                <td style="border: 1px solid #000; padding: 5px; text-align: left;">${author.role === 'faculty' ? '—' : (author.branch || '—')}</td>
                                <td style="border: 1px solid #000; padding: 5px; text-align: left;">${author.dept || '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <h4 style="margin: 0 0 6px 0; border-bottom: 1px solid #000; padding-bottom: 2px; font-size: 12px; font-weight: bold; text-transform: uppercase;">C. BANK ACCOUNT DETAILS (FOR CREDIT)</h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <tr>
                        <td style="width: 25%; border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">Account Holder Name:</td>
                        <td style="border: 1px solid #000; padding: 5px; width: 25%;">${formData.bank.accHolder}</td>
                        <td style="width: 25%; border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">Bank Name:</td>
                        <td style="border: 1px solid #000; padding: 5px; width: 25%;">${formData.bank.bankName}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">Account Number:</td>
                        <td style="border: 1px solid #000; padding: 5px;">${formData.bank.accNo}</td>
                        <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">Branch & IFSC:</td>
                        <td style="border: 1px solid #000; padding: 5px;">${formData.bank.branchName} (${formData.bank.ifsc})</td>
                    </tr>
                </table>

                <div style="background: #fafafa; border: 1px dashed #000; padding: 10px; margin-bottom: 25px; font-size: 11px; border-radius: 4px; line-height: 1.4;">
                    <strong>Required Attachments (Enclose the following in order):</strong>
                    <ol style="margin: 4px 0 0 0; padding-left: 18px;">
                        <li>Copy of the published paper (first page / with authors lists).</li>
                        <li>Original Registration Fee Receipt (must show date and amount).</li>
                        <li>First page of Bank Passbook / Cancelled Cheque (with IFSC & Account details).</li>
                    </ol>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; font-size: 12px; text-align: center; margin-top: 30px;">
                    <div>
                        <div style="height: 35px;"></div>
                        <p style="border-top: 1px solid #000; margin: 0; padding-top: 3px;">Signature of Candidate</p>
                    </div>
                    <div>
                        <div style="height: 35px;"></div>
                        <p style="border-top: 1px solid #000; margin: 0; padding-top: 3px;">Signature of Faculty Guide</p>
                    </div>
                    <div>
                        <div style="height: 35px;"></div>
                        <p style="border-top: 1px solid #000; margin: 0; padding-top: 3px;">Signature of HOD</p>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 12px; text-align: center; margin-top: 40px;">
                    <div>
                        <div style="height: 35px;"></div>
                        <p style="border-top: 1px solid #000; margin: 0; padding-top: 3px;">R&D Cell Coordinator</p>
                    </div>
                    <div>
                        <div style="height: 35px;"></div>
                        <p style="border-top: 1px solid #000; margin: 0; padding-top: 3px;">Dean R&D / Principal / Registrar</p>
                    </div>
                </div>
            </div>
        `;

        // 3. Receipt Attachment Page
        let receiptHtml = `
            <div class="print-page receipt-attachment-page" style="padding: 20px; color: #000; font-family: 'Arial', sans-serif; font-size: 13px;">
                <div style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #000; padding-bottom: 8px;">
                    <h3 style="margin: 0; text-transform: uppercase; font-size: 14px; font-weight: bold;">Attachment: Registration Fee Receipt</h3>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #555;">Candidate: ${formData.bank.accHolder} | Amount: ₹${parseFloat(formData.feePaid).toLocaleString()}</p>
                </div>
                
                ${receiptDataUrl ? `
                    <div style="text-align: center; margin-top: 20px; border: 1px solid #ccc; padding: 10px; border-radius: 6px; background: #fff;">
                        <img src="${receiptDataUrl}" style="max-width: 100%; max-height: 70vh; height: auto; object-fit: contain; box-shadow: 0 1px 5px rgba(0,0,0,0.1);">
                    </div>
                ` : `
                    <div style="border: 2px dashed #999; height: 450px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 30px; background: #fbfbfb; border-radius: 6px; text-align: center; color: #555; padding: 20px;">
                        <i class="ri-attachment-line" style="font-size: 40px; color: #888; margin-bottom: 10px;"></i>
                        <h4 style="margin: 0 0 6px 0; color: #222; font-weight: bold;">Staple / Paste Original Fee Receipt Here</h4>
                        <p style="margin: 0; font-size: 12px; line-height: 1.4;">(Please attach the payment confirmation receipt or invoice generated from the conference / journal portal)</p>
                    </div>
                `}
            </div>
        `;

        // 4. Proof Attachment Page
        let proofHtml = `
            <div class="print-page proof-attachment-page" style="padding: 20px; color: #000; font-family: 'Arial', sans-serif; font-size: 13px; page-break-before: always;">
                <div style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #000; padding-bottom: 8px;">
                    <h3 style="margin: 0; text-transform: uppercase; font-size: 14px; font-weight: bold;">Attachment: First Page of Paper (Proof)</h3>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #555;">Title: ${formData.paperTitle}</p>
                </div>
                
                ${proofDataUrl ? `
                    <div style="text-align: center; margin-top: 20px; border: 1px solid #ccc; padding: 10px; border-radius: 6px; background: #fff;">
                        <img src="${proofDataUrl}" style="max-width: 100%; max-height: 70vh; height: auto; object-fit: contain; box-shadow: 0 1px 5px rgba(0,0,0,0.1);">
                    </div>
                ` : `
                    <div style="border: 2px dashed #999; height: 450px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 30px; background: #fbfbfb; border-radius: 6px; text-align: center; color: #555; padding: 20px;">
                        <i class="ri-article-line" style="font-size: 40px; color: #888; margin-bottom: 10px;"></i>
                        <h4 style="margin: 0 0 6px 0; color: #222; font-weight: bold;">Staple / Paste First Page of Paper Here</h4>
                        <p style="margin: 0; font-size: 12px; line-height: 1.4;">(Please attach the first page of the published journal or conference paper showing title and authors list)</p>
                    </div>
                `}
            </div>
        `;

        previewContent.innerHTML = coverLetterHtml + formHtml + receiptHtml + proofHtml;
        this.openModal('printPreviewModal');
    },

    printApplication() {
        window.print();
    },

    handleDeclarationChange() {
        const checkbox = document.getElementById('claimDeclarationCheckbox');
        const submitBtn = document.getElementById('reimbRDSubmitBtn');
        if (checkbox && submitBtn) {
            submitBtn.disabled = !checkbox.checked;
        }
    },

    async handleReimbursementRDSubmit() {
        const formData = State.currentReimbursementData;
        if (!formData) {
            Toast.show('error', 'Error', 'No reimbursement data found.');
            return;
        }

        const submitBtn = document.getElementById('reimbRDSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Submitting...';
        }

        const primaryStudent = formData.authors.find(a => a.role === 'student');
        const claimData = {
            paper_title: formData.paperTitle,
            host_inst: formData.hostInst,
            conf_name: formData.confName,
            conf_dates: formData.confDates,
            fee_paid: formData.feePaid,
            roll_no: primaryStudent ? primaryStudent.rollNo : '',
            student_name: primaryStudent ? primaryStudent.name : '',
            branch: primaryStudent ? primaryStudent.branch : '',
            dept: primaryStudent ? primaryStudent.dept : '',
            bank_acc_holder: formData.bank.accHolder,
            bank_acc_no: formData.bank.accNo,
            bank_name: formData.bank.bankName,
            bank_branch: formData.bank.branchName,
            ifsc: formData.bank.ifsc,
            status: 'Submitted'
        };

        try {
            await this.submitReimbursementClaim(claimData);

            // Hide pre-submit and show post-submit UI
            const preSubmit = document.getElementById('reimbPreSubmitActions');
            const postSubmit = document.getElementById('reimbPostSubmitActions');
            if (preSubmit) preSubmit.style.display = 'none';
            if (postSubmit) postSubmit.style.display = 'flex';

            // Show Print/Save PDF button in the header
            const printBtn = document.getElementById('reimbPrintBtn');
            if (printBtn) printBtn.style.setProperty('display', 'flex', 'important');

            // Force rendering of the admin claims table to reflect the new submission
            this.renderReimbursementsTable();

            Toast.show('success', 'Claim Submitted', 'Your fee reimbursement application has been registered.');
        } catch (err) {
            console.error('Submission failed:', err);
            Toast.show('error', 'Submission Failed', err.message || 'Could not register reimbursement claim.');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="ri-send-plane-line"></i> Submit to R&D';
            }
        }
    }
});
