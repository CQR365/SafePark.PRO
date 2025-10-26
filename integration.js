/**
 * Holiday Park Safety Documentation Suite - Library Integration
 * Omnibosh CQR 365 - Safety & Compliance Solutions
 * Version 2.1 - January 2025
 */

class LibraryIntegration {
    constructor() {
        this.completedUsers = 0;
        this.totalUsers = 0;
        this.initializeLibraryButtons();
        this.setupEventListeners();
        this.loadSectionContent();
    }

    updateStats(completed, total) {
        this.completedUsers = completed;
        this.totalUsers = total;
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        // Update any stats displays in modals or panels
        const statsElements = document.querySelectorAll('.completion-stats');
        statsElements.forEach(element => {
            element.innerHTML = `
                <p><strong>Training Completion:</strong> ${this.completedUsers} / ${this.totalUsers} employees (${Math.round((this.completedUsers / this.totalUsers) * 100) || 0}%)</p>
            `;
        });
    }

    initializeLibraryButtons() {
        // Create floating library panel
        const libraryPanel = document.createElement('div');
        libraryPanel.id = 'library-panel';
        libraryPanel.className = 'library-panel';
        libraryPanel.innerHTML = `
            <div class="library-header">
                <h3>Documentation Library</h3>
                <button class="toggle-library" onclick="toggleLibraryPanel()">×</button>
            </div>
            <div class="library-buttons">
                <button class="library-btn risk-safety-btn" onclick="openRiskSafetyDocs()">
                    Risk & Safety Documentation
                </button>
                <button class="library-btn training-suit-btn" onclick="openTrainingSuit()">
                    Training Suit
                </button>
                <button class="library-btn policies-btn" onclick="openPolicies()">
                    Policies
                </button>
                <button class="library-btn insurance-btn" onclick="openInsurance()">
                    Insurance
                </button>
                <button class="library-btn sops-btn" onclick="openSOPs()">
                    SOPs
                </button>
            </div>
            <div class="library-footer">
                <button class="quick-access-btn" onclick="showQuickAccess()">Quick Access Menu</button>
            </div>
        `;

        // Add CSS styles for library panel
        const libraryStyles = document.createElement('style');
        libraryStyles.textContent = `
            .library-panel {
                position: fixed;
                top: 50%;
                right: -320px;
                transform: translateY(-50%);
                width: 300px;
                background: linear-gradient(135deg, var(--smart-dark-grey) 0%, var(--content-background) 100%);
                border-radius: 15px 0 0 15px;
                box-shadow: -5px 0 20px rgba(0,0,0,0.3);
                z-index: 1000;
                transition: right 0.3s ease;
                color: #E8E8E8;
                border: 1px solid #404040;
            }
            
            .library-panel.active {
                right: 0;
            }
            
            .library-header {
                background: linear-gradient(135deg, var(--primary-orange) 0%, var(--dark-orange) 100%);
                padding: 15px;
                border-radius: 15px 0 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .library-header h3 {
                margin: 0;
                font-size: 1.1rem;
                color: var(--white);
                font-weight: 600;
            }
            
            .toggle-library {
                background: var(--danger);
                color: var(--white);
                border: none;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            }
            
            .library-buttons {
                padding: 20px 15px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .library-btn {
                background: linear-gradient(135deg, var(--primary-orange) 0%, var(--dark-orange) 100%);
                color: var(--white);
                border: none;
                padding: 12px 15px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 600;
                transition: all 0.3s ease;
                text-align: left;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .library-btn:hover {
                transform: translateX(-5px);
                box-shadow: 5px 5px 15px rgba(0,0,0,0.2);
            }
            
            .risk-safety-btn { background: linear-gradient(135deg, var(--danger) 0%, #c0392b 100%); }
            .training-suit-btn { background: linear-gradient(135deg, var(--warning) 0%, #e67e22 100%); color: var(--black); }
            .policies-btn { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
            .insurance-btn { background: linear-gradient(135deg, var(--success) 0%, #229954 100%); }
            .sops-btn { background: linear-gradient(135deg, var(--tile-bg) 0%, var(--smart-dark-grey) 100%); }
            
            .library-footer {
                padding: 15px;
                border-top: 1px solid #404040;
            }
            
            .quick-access-btn {
                width: 100%;
                background: transparent;
                color: #E8E8E8;
                border: 2px solid var(--primary-orange);
                padding: 10px;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: 500;
            }
            
            .quick-access-btn:hover {
                background: var(--primary-orange);
                color: var(--white);
            }
            
            .library-trigger {
                position: fixed;
                top: 50%;
                right: 10px;
                transform: translateY(-50%);
                background: linear-gradient(135deg, var(--primary-orange) 0%, var(--dark-orange) 100%);
                color: var(--white);
                border: none;
                padding: 15px 8px;
                border-radius: 25px 0 0 25px;
                cursor: pointer;
                font-size: 1.2rem;
                z-index: 999;
                box-shadow: -3px 0 10px rgba(0,0,0,0.2);
                writing-mode: vertical-rl;
                text-orientation: mixed;
                font-weight: 600;
            }
            
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 2000;
                display: none;
                align-items: center;
                justify-content: center;
            }
            
            .modal-content {
                background: var(--content-background);
                color: #E8E8E8;
                border-radius: 15px;
                padding: 30px;
                max-width: 90%;
                max-height: 90%;
                overflow-y: auto;
                position: relative;
                animation: modalSlideIn 0.3s ease;
                border: 1px solid #404040;
                box-shadow: var(--shadow-heavy);
            }
            
            @keyframes modalSlideIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
            
            .modal-close {
                position: absolute;
                top: 15px;
                right: 20px;
                background: var(--danger);
                color: var(--white);
                border: none;
                border-radius: 50%;
                width: 35px;
                height: 35px;
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
            }
            
            .search-container {
                background: var(--tile-bg);
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                border: 1px solid #404040;
            }
            
            .search-input {
                width: 100%;
                padding: 12px;
                border: 2px solid #404040;
                border-radius: 5px;
                font-size: 1rem;
                background: var(--darker-bg);
                color: #E8E8E8;
            }
            
            .search-input:focus {
                outline: none;
                border-color: var(--primary-orange);
            }
            
            .document-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }
            
            .document-card {
                background: var(--tile-bg);
                border: 2px solid #404040;
                border-radius: 10px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: var(--shadow-light);
            }
            
            .document-card:hover {
                border-color: var(--primary-orange);
                transform: translateY(-3px);
                box-shadow: var(--shadow-medium);
            }
            
            .document-title {
                font-weight: 600;
                color: var(--white);
                margin-bottom: 10px;
                font-size: 1.1rem;
            }
            
            .document-description {
                color: #C8C8C8;
                font-size: 0.9rem;
                line-height: 1.4;
            }
            
            .document-status {
                display: inline-block;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 0.8rem;
                font-weight: 600;
                margin-top: 10px;
            }
            
            .status-required { background: var(--danger); color: var(--white); }
            .status-optional { background: var(--warning); color: var(--black); }
            .status-completed { background: var(--success); color: var(--white); }
        `;
        
        document.head.appendChild(libraryStyles);
        document.body.appendChild(libraryPanel);

        // Add trigger button
        const triggerButton = document.createElement('button');
        triggerButton.className = 'library-trigger';
        triggerButton.textContent = 'LIBRARY';
        triggerButton.onclick = () => toggleLibraryPanel();
        document.body.appendChild(triggerButton);
    }

    setupEventListeners() {
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey) {
                switch(e.key) {
                    case 'L':
                        e.preventDefault();
                        toggleLibraryPanel();
                        break;
                    case 'R':
                        e.preventDefault();
                        openRiskSafetyDocs();
                        break;
                    case 'T':
                        e.preventDefault();
                        openTrainingSuit();
                        break;
                    case 'P':
                        e.preventDefault();
                        openPolicies();
                        break;
                    case 'I':
                        e.preventDefault();
                        openInsurance();
                        break;
                    case 'S':
                        e.preventDefault();
                        openSOPs();
                        break;
                }
            }
        });
    }

    loadSectionContent() {
        // This method loads comprehensive content for each major section
        this.sectionData = {
            riskSafety: this.getRiskSafetyDocuments(),
            training: this.getTrainingDocuments(),
            policies: this.getPolicyDocuments(),
            insurance: this.getInsuranceDocuments(),
            sops: this.getSOPDocuments()
        };
    }

    getRiskSafetyDocuments() {
        return [
            {
                id: 'personal-safety-ra',
                title: 'Personal Safety Risk Assessment',
                description: 'Individual risk factors assessment including new workers, lone working, physical limitations, and medical conditions.',
                status: 'required',
                section: 'personal-safety'
            },
            {
                id: 'hot-tub-ra',
                title: 'Hot Tub Risk Assessment',
                description: 'Water safety, chemical handling, temperature control, and maintenance procedures for spa facilities.',
                status: 'required',
                section: 'hot-tub'
            },
            {
                id: 'water-supply-ra',
                title: 'Private Water Supply Risk Assessment',
                description: 'Water quality management, testing procedures, and contamination prevention protocols.',
                status: 'required',
                section: 'water-supply'
            },
            {
                id: 'hand-tools-ra',
                title: 'Hand Tools Risk Assessment',
                description: 'Safe use, maintenance, and storage of manual tools and equipment.',
                status: 'required',
                section: 'hand-tools'
            },
            {
                id: 'power-tools-ra',
                title: 'Power Tools Risk Assessment',
                description: 'Electrical tool safety, PAT testing, and operational procedures.',
                status: 'required',
                section: 'power-tools'
            },
            {
                id: 'ride-on-mowers-ra',
                title: 'Ride-on Mowers Risk Assessment',
                description: 'Grounds maintenance equipment safety and operational procedures.',
                status: 'required',
                section: 'ride-on-mowers'
            },
            {
                id: 'grass-strimmers-ra',
                title: 'Grass Strimmers Risk Assessment',
                description: 'Handheld cutting equipment safety and protective measures.',
                status: 'required',
                section: 'grass-strimmers'
            },
            {
                id: 'waste-management-ra',
                title: 'Human Waste Management Risk Assessment',
                description: 'Sanitation procedures, biological hazard control, and hygiene protocols.',
                status: 'required',
                section: 'waste-management'
            },
            {
                id: 'legionella-ra',
                title: 'Legionella Risk Assessment',
                description: 'Water system bacteria control and prevention procedures.',
                status: 'required',
                section: 'legionella'
            },
            {
                id: 'fire-safety-ra',
                title: 'Fire Safety Risk Assessment',
                description: 'Fire prevention, detection, and emergency evacuation procedures.',
                status: 'required',
                section: 'fire-safety'
            },
            {
                id: 'electrical-safety-ra',
                title: 'Electrical Safety Risk Assessment',
                description: 'Electrical systems safety and maintenance procedures.',
                status: 'required',
                section: 'electrical-safety'
            },
            {
                id: 'chemical-storage-ra',
                title: 'Chemical Storage & Handling Risk Assessment',
                description: 'COSHH compliance, chemical safety, and storage procedures.',
                status: 'required',
                section: 'chemical-storage'
            },
            {
                id: 'manual-handling-ra',
                title: 'Manual Handling Risk Assessment',
                description: 'Safe lifting techniques and ergonomic procedures.',
                status: 'required',
                section: 'manual-handling'
            },
            {
                id: 'rental-units-ra',
                title: 'Rental Units Risk Assessment',
                description: 'Guest accommodation safety and maintenance procedures.',
                status: 'required',
                section: 'rental-units'
            }
        ];
    }

    getTrainingDocuments() {
        return [
            {
                id: 'team-induction-plan',
                title: 'Team Induction Training Plan',
                description: 'Comprehensive 5-phase training program for all new staff members.',
                status: 'required',
                section: 'team-induction'
            },
            {
                id: 'phase1-pre-employment',
                title: 'Phase 1: Pre-Employment Training',
                description: '2-hour online learning covering health & safety policy, site familiarization, PPE, and basic risk awareness.',
                status: 'required',
                section: 'team-induction'
            },
            {
                id: 'phase2-orientation',
                title: 'Phase 2: First Day Orientation',
                description: '4-hour on-site training including safety tour and practical demonstrations.',
                status: 'required',
                section: 'team-induction'
            },
            {
                id: 'phase3-role-specific',
                title: 'Phase 3: Role-Specific Training',
                description: 'Specialized training for maintenance, housekeeping, and grounds maintenance roles.',
                status: 'required',
                section: 'team-induction'
            },
            {
                id: 'phase4-assessment',
                title: 'Phase 4: Competency Assessment',
                description: 'Written and practical assessment with certification requirements.',
                status: 'required',
                section: 'team-induction'
            },
            {
                id: 'phase5-ongoing',
                title: 'Phase 5: Ongoing Development',
                description: 'Continuous professional development and refresher training.',
                status: 'required',
                section: 'team-induction'
            }
        ];
    }

    getPolicyDocuments() {
        return [
            {
                id: 'health-safety-policy',
                title: 'Health & Safety Policy',
                description: 'Comprehensive health and safety policy framework and procedures.',
                status: 'required',
                section: 'policies'
            },
            {
                id: 'ppe-policy',
                title: 'Personal Protective Equipment Policy',
                description: 'PPE requirements, provision, and maintenance procedures.',
                status: 'required',
                section: 'policies'
            },
            {
                id: 'incident-reporting-policy',
                title: 'Incident Reporting Policy',
                description: 'RIDDOR compliance and incident management procedures.',
                status: 'required',
                section: 'policies'
            },
            {
                id: 'emergency-procedures',
                title: 'Emergency Procedures Policy',
                description: 'Emergency response plans and evacuation procedures.',
                status: 'required',
                section: 'policies'
            },
            {
                id: 'training-policy',
                title: 'Training & Competency Policy',
                description: 'Staff training requirements and competency management.',
                status: 'required',
                section: 'policies'
            }
        ];
    }

    getInsuranceDocuments() {
        return [
            {
                id: 'public-liability',
                title: 'Public Liability Insurance',
                description: '£5 million coverage for guest injury claims and legal defense costs.',
                status: 'required',
                section: 'insurance'
            },
            {
                id: 'employers-liability',
                title: 'Employers Liability Insurance',
                description: 'Statutory minimum £5 million coverage for occupational injuries.',
                status: 'required',
                section: 'insurance'
            },
            {
                id: 'professional-indemnity',
                title: 'Professional Indemnity Insurance',
                description: 'Coverage for negligent advice and regulatory investigation costs.',
                status: 'required',
                section: 'insurance'
            },
            {
                id: 'risk-management-integration',
                title: 'Risk Management Integration',
                description: 'Insurance requirements and premium optimization strategies.',
                status: 'required',
                section: 'insurance'
            }
        ];
    }

    getSOPDocuments() {
        return [
            {
                id: 'safe-work-procedures',
                title: 'Safe Work Procedures',
                description: 'Standard operating procedures for all work activities.',
                status: 'required',
                section: 'safe-work-procedures'
            },
            {
                id: 'maintenance-sops',
                title: 'Maintenance SOPs',
                description: 'Equipment maintenance and inspection procedures.',
                status: 'required',
                section: 'safe-work-procedures'
            },
            {
                id: 'housekeeping-sops',
                title: 'Housekeeping SOPs',
                description: 'Cleaning and sanitation standard operating procedures.',
                status: 'required',
                section: 'safe-work-procedures'
            },
            {
                id: 'grounds-maintenance-sops',
                title: 'Grounds Maintenance SOPs',
                description: 'Landscaping and grounds care procedures.',
                status: 'required',
                section: 'safe-work-procedures'
            },
            {
                id: 'emergency-response-sops',
                title: 'Emergency Response SOPs',
                description: 'Emergency situation response procedures.',
                status: 'required',
                section: 'safe-work-procedures'
            }
        ];
    }
}

// Global functions for button actions
function toggleLibraryPanel() {
    const panel = document.getElementById('library-panel');
    panel.classList.toggle('active');
}

function openRiskSafetyDocs() {
    showModal('Risk & Safety Documentation', library.sectionData.riskSafety, 'risk-safety');
}

function openTrainingSuit() {
    showModal('Training Suit', library.sectionData.training, 'training');
}

function openPolicies() {
    showModal('Policies', library.sectionData.policies, 'policies');
}

function openInsurance() {
    showModal('Insurance Documentation', library.sectionData.insurance, 'insurance');
}

function openSOPs() {
    showModal('Standard Operating Procedures (SOPs)', library.sectionData.sops, 'sops');
}

function showModal(title, documents, categoryId) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('document-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'document-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeModal()">×</button>
                <div id="modal-body"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h2>${title}</h2>
        <div class="search-container">
            <input type="text" class="search-input" placeholder="Search documents..." onkeyup="filterDocuments('${categoryId}')">
        </div>
        <div class="document-grid" id="document-grid-${categoryId}">
            ${documents.map(doc => `
                <div class="document-card" onclick="openDocumentSection('${doc.section}')">
                    <div class="document-title">${doc.title}</div>
                    <div class="document-description">${doc.description}</div>
                    <div class="document-status status-${doc.status}">${doc.status.toUpperCase()}</div>
                </div>
            `).join('')}
        </div>
    `;

    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('document-modal').style.display = 'none';
}

function filterDocuments(categoryId) {
    const searchTerm = event.target.value.toLowerCase();
    const cards = document.querySelectorAll(`#document-grid-${categoryId} .document-card`);
    
    cards.forEach(card => {
        const title = card.querySelector('.document-title').textContent.toLowerCase();
        const description = card.querySelector('.document-description').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function openDocumentSection(sectionId) {
    closeModal();
    toggleLibraryPanel();
    
    // Navigate to the specific section
    if (typeof showContent === 'function') {
        showContent(sectionId);
    } else {
        // Fallback: scroll to section if showContent is not available
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

function showQuickAccess() {
    const quickAccessContent = `
        <h2>Quick Access Menu</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">
            <button class="library-btn" onclick="openDocumentSection('team-induction')">
                Start Training Program
            </button>
            <button class="library-btn" onclick="openDocumentSection('personal-safety')">
                Personal Safety Assessment
            </button>
            <button class="library-btn" onclick="openDocumentSection('legionella')">
                Legionella Risk Assessment
            </button>
            <button class="library-btn" onclick="openDocumentSection('fire-safety')">
                Fire Safety Procedures
            </button>
            <button class="library-btn" onclick="openDocumentSection('chemical-storage')">
                Chemical Handling
            </button>
            <button class="library-btn" onclick="openDocumentSection('manual-handling')">
                Manual Handling Training
            </button>
        </div>
        <div style="margin-top: 30px; padding: 20px; background: var(--tile-bg); border: 1px solid #404040; border-radius: 10px; color: #E8E8E8;">
            <h3>System Status</h3>
            <p><strong>Total Documents:</strong> ${getTotalDocumentCount()}</p>
            <p><strong>Your Acknowledged Sections:</strong> ${getAcknowledgedCount()}</p>
            <p><strong>Your Completion Rate:</strong> ${getCompletionRate()}%</p>
            <div class="completion-stats" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #404040;">
                <p><strong>Training Completion:</strong> ${library.completedUsers} / ${library.totalUsers} employees (${Math.round((library.completedUsers / library.totalUsers) * 100) || 0}%)</p>
            </div>
        </div>
        <div style="margin-top: 20px; padding: 15px; background: var(--content-background); border: 1px solid var(--primary-orange); border-radius: 10px; color: #E8E8E8;">
            <h4>Keyboard Shortcuts</h4>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li><kbd>Ctrl + Shift + L</kbd> - Toggle Library Panel</li>
                <li><kbd>Ctrl + Shift + R</kbd> - Risk & Safety Docs</li>
                <li><kbd>Ctrl + Shift + T</kbd> - Training Suit</li>
                <li><kbd>Ctrl + Shift + P</kbd> - Policies</li>
                <li><kbd>Ctrl + Shift + I</kbd> - Insurance</li>
                <li><kbd>Ctrl + Shift + S</kbd> - SOPs</li>
            </ul>
        </div>
    `;

    let modal = document.getElementById('document-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'document-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeModal()">×</button>
                <div id="modal-body"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('modal-body').innerHTML = quickAccessContent;
    modal.style.display = 'flex';
}

function getTotalDocumentCount() {
    return library.sectionData.riskSafety.length + 
           library.sectionData.training.length + 
           library.sectionData.policies.length + 
           library.sectionData.insurance.length + 
           library.sectionData.sops.length;
}

function getAcknowledgedCount() {
    if (typeof acknowledgedSections !== 'undefined') {
        return acknowledgedSections.size;
    }
    return 0;
}

function getCompletionRate() {
    const total = 16; // Total sections requiring acknowledgment
    const completed = getAcknowledgedCount();
    return Math.round((completed / total) * 100);
}

// Initialize the library system
let library;
document.addEventListener('DOMContentLoaded', function() {
    library = new LibraryIntegration();
    
    // Add help tooltip
    const helpTooltip = document.createElement('div');
    helpTooltip.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #34495e;
        color: white;
        padding: 10px 15px;
        border-radius: 20px;
        font-size: 0.9rem;
        z-index: 1001;
        cursor: pointer;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
    `;
    helpTooltip.textContent = 'Press Ctrl+Shift+L for Library';
    helpTooltip.onclick = () => showQuickAccess();
    document.body.appendChild(helpTooltip);
    
    // Auto-hide help tooltip after 10 seconds
    setTimeout(() => {
        helpTooltip.style.opacity = '0.7';
    }, 10000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LibraryIntegration;
}
