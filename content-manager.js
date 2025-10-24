/**
 * Comprehensive Content Manager for Holiday Park Training System
 * Contains all risk assessments and training content from the original document
 */

class ContentManager {
    constructor() {
        this.allSections = this.loadAllSections();
    }

    loadAllSections() {
        return {
            // Personal Safety Risk Assessment
            'personal-safety': `
                <div class="section-header">
                    <h2>Personal Safety Risk Assessment</h2>
                    <p>Individual risk factors assessment and control measures</p>
                </div>
                <div class="section-content">
                    <div class="info-box">
                        <p><strong>Site:</strong> Holiday Park - All Staff Activities<br>
                        <strong>Assessment Date:</strong> January 2025<br>
                        <strong>Assessor:</strong> Omnibosh CQR 365<br>
                        <strong>Review Date:</strong> January 2026<br>
                        <strong>Legislative Reference:</strong> MHSWR 1999, Reg 3</p>
                    </div>

                    <h3>Individual Risk Factors Assessment</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Personal Factor</th>
                                    <th>Risk Level</th>
                                    <th>Control Measures</th>
                                    <th>Legal Requirement</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>New/Young Workers</strong></td>
                                    <td><span class="risk-level risk-high">HIGH</span></td>
                                    <td>
                                        <ul>
                                            <li>Enhanced supervision first 6 months</li>
                                            <li>Restricted access to high-risk areas</li>
                                            <li>Mandatory buddy system</li>
                                            <li>Regular competency reviews</li>
                                        </ul>
                                    </td>
                                    <td>MHSWR 1999, Reg 19</td>
                                </tr>
                                <tr>
                                    <td><strong>Lone Working</strong></td>
                                    <td><span class="risk-level risk-medium">MEDIUM</span></td>
                                    <td>
                                        <ul>
                                            <li>Check-in procedures every 2 hours</li>
                                            <li>Mobile communication devices</li>
                                            <li>Emergency alarm systems</li>
                                            <li>Risk-specific procedures</li>
                                        </ul>
                                    </td>
                                    <td>MHSWR 1999, Reg 3</td>
                                </tr>
                                <tr>
                                    <td><strong>Physical Limitations</strong></td>
                                    <td><span class="risk-level risk-medium">VARIABLE</span></td>
                                    <td>
                                        <ul>
                                            <li>Pre-employment health screening</li>
                                            <li>Reasonable adjustments</li>
                                            <li>Alternative task allocation</li>
                                            <li>Regular health surveillance</li>
                                        </ul>
                                    </td>
                                    <td>Equality Act 2010</td>
                                </tr>
                                <tr>
                                    <td><strong>Medical Conditions</strong></td>
                                    <td><span class="risk-level risk-medium">VARIABLE</span></td>
                                    <td>
                                        <ul>
                                            <li>Confidential medical assessment</li>
                                            <li>Medication management procedures</li>
                                            <li>Emergency action plans</li>
                                            <li>Work pattern adjustments</li>
                                        </ul>
                                    </td>
                                    <td>MHSWR 1999, Reg 3</td>
                                </tr>
                                <tr>
                                    <td><strong>Pregnancy</strong></td>
                                    <td><span class="risk-level risk-high">HIGH</span></td>
                                    <td>
                                        <ul>
                                            <li>Specific pregnancy risk assessment</li>
                                            <li>Restricted chemical exposure</li>
                                            <li>Manual handling limitations</li>
                                            <li>Rest facility provision</li>
                                        </ul>
                                    </td>
                                    <td>MHSWR 1999, Reg 16-18</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>General Control Measures</h3>
                    <div class="highlight-box">
                        <h4>Supervision and Communication</h4>
                        <ul>
                            <li>Clear reporting structures and escalation procedures</li>
                            <li>Regular safety briefings and tool box talks</li>
                            <li>Open door policy for safety concerns</li>
                            <li>Anonymous reporting systems available</li>
                        </ul>
                    </div>

                    <div class="warning-box">
                        <h4>Emergency Procedures</h4>
                        <ul>
                            <li>Emergency contact systems and procedures</li>
                            <li>First aid provision and trained personnel</li>
                            <li>Evacuation plans and assembly points</li>
                            <li>Incident reporting and investigation procedures</li>
                        </ul>
                    </div>
                </div>
                <div class="acknowledgment-panel">
                    <h3>Section Acknowledgment</h3>
                    <p>I confirm that I have read and understood the Personal Safety Risk Assessment and my individual responsibilities.</p>
                    
                    <div style="margin: 20px 0;">
                        <label for="user-name-personal-safety" style="display: block; margin-bottom: 8px; font-weight: 500; color: #E8E8E8;">
                            Your Full Name:
                        </label>
                        <input type="text" id="user-name-personal-safety" placeholder="Enter your full name" required style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #404040;
                            border-radius: 5px;
                            background: var(--darker-bg);
                            color: #E8E8E8;
                            font-size: 1rem;
                        ">
                    </div>
                    
                    <div class="acknowledgment-checkbox">
                        <input type="checkbox" id="ack-checkbox-personal-safety" onchange="updateAcknowledgment('personal-safety')">
                        <label for="ack-checkbox-personal-safety">I acknowledge reading this section</label>
                    </div>
                    <button class="acknowledge-btn" id="ack-btn-personal-safety" onclick="submitAcknowledgment('personal-safety')" disabled>
                        Complete Acknowledgment
                    </button>
                </div>
            `,

            // Hot Tub Risk Assessment
            'hot-tub': `
                <div class="section-header">
                    <h2>Hot Tub Risk Assessment</h2>
                    <p>Water safety, chemical handling, and maintenance procedures</p>
                </div>
                <div class="section-content">
                    <div class="info-box">
                        <p><strong>Assessment Reference:</strong> HT-RA-001<br>
                        <strong>Applicable Regulations:</strong> HSG282, PWTAG Guidelines, COSHH 2002</p>
                    </div>

                    <h3>Water Safety Hazards</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Hazard</th>
                                    <th>Risk Level</th>
                                    <th>Control Measures</th>
                                    <th>Monitoring</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Legionella Bacteria</strong></td>
                                    <td><span class="risk-level risk-high">HIGH</span></td>
                                    <td>
                                        <ul>
                                            <li>Temperature control 37-40°C maximum</li>
                                            <li>Daily chlorine testing (1-3mg/l)</li>
                                            <li>Weekly shock chlorination</li>
                                            <li>Monthly professional testing</li>
                                        </ul>
                                    </td>
                                    <td>Daily temperature and chemical logs</td>
                                </tr>
                                <tr>
                                    <td><strong>Chemical Burns</strong></td>
                                    <td><span class="risk-level risk-high">HIGH</span></td>
                                    <td>
                                        <ul>
                                            <li>PPE: gloves, goggles, apron</li>
                                            <li>Chemical storage separation</li>
                                            <li>Emergency eyewash stations</li>
                                            <li>Trained personnel only</li>
                                        </ul>
                                    </td>
                                    <td>Daily PPE checks and chemical inventory</td>
                                </tr>
                                <tr>
                                    <td><strong>Drowning/Slips</strong></td>
                                    <td><span class="risk-level risk-medium">MEDIUM</span></td>
                                    <td>
                                        <ul>
                                            <li>Non-slip surfaces around spa</li>
                                            <li>Adequate lighting provision</li>
                                            <li>Clear sight lines for supervision</li>
                                            <li>Emergency equipment accessible</li>
                                        </ul>
                                    </td>
                                    <td>Daily safety equipment checks</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>Chemical Management Procedures</h3>
                    <div class="phase-container">
                        <h4>Daily Chemical Testing</h4>
                        <ol>
                            <li>Test water temperature (record in log)</li>
                            <li>Test free chlorine levels using DPD test kit</li>
                            <li>Test pH levels (maintain 7.2-7.6)</li>
                            <li>Record all readings in daily log sheet</li>
                            <li>Take corrective action if readings outside parameters</li>
                        </ol>
                    </div>

                    <div class="warning-box">
                        <h4>Emergency Procedures</h4>
                        <ul>
                            <li><strong>Chemical Spillage:</strong> Evacuate area, ventilate, use spill kit, report incident</li>
                            <li><strong>Chemical Exposure:</strong> Remove from exposure, irrigate with water, seek medical attention</li>
                            <li><strong>Equipment Failure:</strong> Isolate area, contact maintenance, record in fault log</li>
                            <li><strong>Water Quality Issues:</strong> Close facility, test water, contact water treatment specialist</li>
                        </ul>
                    </div>

                    <h3>Maintenance Schedule</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Frequency</th>
                                    <th>Task</th>
                                    <th>Responsible Person</th>
                                    <th>Record Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Daily</td>
                                    <td>Water testing, visual inspection, chemical dosing</td>
                                    <td>Trained Operator</td>
                                    <td>Daily Log Book</td>
                                </tr>
                                <tr>
                                    <td>Weekly</td>
                                    <td>Shock chlorination, filter cleaning, equipment check</td>
                                    <td>Senior Operator</td>
                                    <td>Weekly Maintenance Log</td>
                                </tr>
                                <tr>
                                    <td>Monthly</td>
                                    <td>Professional water testing, full system check</td>
                                    <td>External Contractor</td>
                                    <td>Contractor Report File</td>
                                </tr>
                                <tr>
                                    <td>Annually</td>
                                    <td>Full system service and legionella risk assessment</td>
                                    <td>Qualified Engineer</td>
                                    <td>Annual Service Records</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="acknowledgment-panel">
                    <h3>Section Acknowledgment</h3>
                    <p>I confirm that I have read and understood the Hot Tub Risk Assessment and safety procedures.</p>
                    
                    <div style="margin: 20px 0;">
                        <label for="user-name-hot-tub" style="display: block; margin-bottom: 8px; font-weight: 500; color: #E8E8E8;">
                            Your Full Name:
                        </label>
                        <input type="text" id="user-name-hot-tub" placeholder="Enter your full name" required style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #404040;
                            border-radius: 5px;
                            background: var(--darker-bg);
                            color: #E8E8E8;
                            font-size: 1rem;
                        ">
                    </div>
                    
                    <div class="acknowledgment-checkbox">
                        <input type="checkbox" id="ack-checkbox-hot-tub" onchange="updateAcknowledgment('hot-tub')">
                        <label for="ack-checkbox-hot-tub">I acknowledge reading this section</label>
                    </div>
                    <button class="acknowledge-btn" id="ack-btn-hot-tub" onclick="submitAcknowledgment('hot-tub')" disabled>
                        Complete Acknowledgment
                    </button>
                </div>
            `,

            // Legionella Risk Assessment
            'legionella': `
                <div class="section-header">
                    <h2>Legionella Risk Assessment</h2>
                    <p>Water system bacteria control and prevention procedures</p>
                </div>
                <div class="section-content">
                    <div class="warning-box">
                        <h3>Critical Safety Notice</h3>
                        <p>Legionella bacteria can cause severe pneumonia and death. This assessment covers all water systems on site including hot tubs, showers, taps, and cooling systems. All control measures must be strictly followed.</p>
                    </div>

                    <div class="info-box">
                        <p><strong>Legislative Basis:</strong> HSG282 Legionnaires' Disease - The Control of Legionella Bacteria in Water Systems<br>
                        <strong>Risk Assessment Standard:</strong> BS 8580:2010<br>
                        <strong>Review Frequency:</strong> Annual or following significant changes</p>
                    </div>

                    <h3>Water System Risk Assessment</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>System Type</th>
                                    <th>Risk Level</th>
                                    <th>Control Measures</th>
                                    <th>Monitoring Frequency</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Hot Tub/Spa Systems</strong></td>
                                    <td><span class="risk-level risk-high">HIGH</span></td>
                                    <td>
                                        <ul>
                                            <li>Continuous circulation and filtration</li>
                                            <li>Temperature control 37-40°C max</li>
                                            <li>Chlorine 1-3 mg/l free residual</li>
                                            <li>Weekly shock chlorination</li>
                                            <li>Monthly professional testing</li>
                                        </ul>
                                    </td>
                                    <td>Daily testing and logging</td>
                                </tr>
                                <tr>
                                    <td><strong>Shower Systems</strong></td>
                                    <td><span class="risk-level risk-medium">MEDIUM</span></td>
                                    <td>
                                        <ul>
                                            <li>Weekly flushing of little-used outlets</li>
                                            <li>Temperature monitoring 50°C+ at outlets</li>
                                            <li>Descaling and disinfection program</li>
                                            <li>Thermostatic mixing valve maintenance</li>
                                        </ul>
                                    </td>
                                    <td>Weekly temperature checks</td>
                                </tr>
                                <tr>
                                    <td><strong>Cold Water Systems</strong></td>
                                    <td><span class="risk-level risk-low">LOW</span></td>
                                    <td>
                                        <ul>
                                            <li>Temperature below 20°C</li>
                                            <li>Tank cleaning and inspection</li>
                                            <li>Pipework insulation maintenance</li>
                                            <li>Dead leg removal program</li>
                                        </ul>
                                    </td>
                                    <td>Monthly temperature monitoring</td>
                                </tr>
                                <tr>
                                    <td><strong>Cooling Towers (if present)</strong></td>
                                    <td><span class="risk-level risk-high">HIGH</span></td>
                                    <td>
                                        <ul>
                                            <li>Biocide treatment program</li>
                                            <li>Weekly water testing</li>
                                            <li>Drift eliminator maintenance</li>
                                            <li>Regular cleaning and disinfection</li>
                                        </ul>
                                    </td>
                                    <td>Weekly water quality testing</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>Control and Monitoring Procedures</h3>
                    
                    <div class="phase-container">
                        <h4>Daily Monitoring Tasks</h4>
                        <ul>
                            <li>Hot tub temperature and chemical level testing</li>
                            <li>Visual inspection of all water systems</li>
                            <li>Record keeping in water management log</li>
                            <li>Report any unusual conditions immediately</li>
                        </ul>
                    </div>

                    <div class="phase-container">
                        <h4>Weekly Monitoring Tasks</h4>
                        <ul>
                            <li>Temperature monitoring at representative outlets</li>
                            <li>Flushing of little-used water outlets</li>
                            <li>Hot tub shock chlorination procedures</li>
                            <li>Inspection of water storage tanks and systems</li>
                        </ul>
                    </div>

                    <div class="phase-container">
                        <h4>Monthly Monitoring Tasks</h4>
                        <ul>
                            <li>Professional microbiological water testing</li>
                            <li>System performance review and optimization</li>
                            <li>Training compliance verification</li>
                            <li>Documentation review and update</li>
                        </ul>
                    </div>

                    <h3>Emergency Response Procedures</h3>
                    <div class="warning-box">
                        <h4>Suspected Legionella Detection</h4>
                        <ol>
                            <li><strong>Immediate Action:</strong> Isolate affected system, prevent aerosol generation</li>
                            <li><strong>Notification:</strong> Contact HSE (within 24 hours), notify insurance company</li>
                            <li><strong>Investigation:</strong> Engage specialist legionella consultant</li>
                            <li><strong>Remediation:</strong> Follow specialist recommendations for disinfection</li>
                            <li><strong>Testing:</strong> Verify effectiveness before system restart</li>
                            <li><strong>Review:</strong> Update risk assessment based on findings</li>
                        </ol>
                    </div>

                    <h3>Training and Competency Requirements</h3>
                    <div class="highlight-box">
                        <h4>Responsible Person Duties</h4>
                        <p>The duty holder must ensure a responsible person is appointed with sufficient authority, competence and knowledge of the installation to ensure that precautions are properly implemented and maintained.</p>
                        
                        <h4>Training Requirements</h4>
                        <ul>
                            <li>Legionella awareness training for all staff</li>
                            <li>Water treatment competency for operators</li>
                            <li>Emergency response procedure training</li>
                            <li>Annual refresher training and updates</li>
                        </ul>
                    </div>

                    <h3>Record Keeping Requirements</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Record Type</th>
                                    <th>Frequency</th>
                                    <th>Retention Period</th>
                                    <th>Responsible Person</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Water temperature logs</td>
                                    <td>Daily/Weekly</td>
                                    <td>2 years</td>
                                    <td>Trained Operator</td>
                                </tr>
                                <tr>
                                    <td>Chemical treatment records</td>
                                    <td>Daily</td>
                                    <td>2 years</td>
                                    <td>Trained Operator</td>
                                </tr>
                                <tr>
                                    <td>Microbiological test results</td>
                                    <td>Monthly</td>
                                    <td>5 years</td>
                                    <td>Laboratory/Consultant</td>
                                </tr>
                                <tr>
                                    <td>Risk assessment reviews</td>
                                    <td>Annual</td>
                                    <td>5 years</td>
                                    <td>Competent Person</td>
                                </tr>
                                <tr>
                                    <td>Incident reports</td>
                                    <td>As required</td>
                                    <td>Indefinite</td>
                                    <td>Responsible Person</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="acknowledgment-panel">
                    <h3>Section Acknowledgment</h3>
                    <p>I confirm that I have read and understood the Legionella Risk Assessment and control procedures. I understand the serious health risks associated with Legionella bacteria and my responsibilities in prevention.</p>
                    
                    <div style="margin: 20px 0;">
                        <label for="user-name-legionella" style="display: block; margin-bottom: 8px; font-weight: 500; color: #E8E8E8;">
                            Your Full Name:
                        </label>
                        <input type="text" id="user-name-legionella" placeholder="Enter your full name" required style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #404040;
                            border-radius: 5px;
                            background: var(--darker-bg);
                            color: #E8E8E8;
                            font-size: 1rem;
                        ">
                    </div>
                    
                    <div class="acknowledgment-checkbox">
                        <input type="checkbox" id="ack-checkbox-legionella" onchange="updateAcknowledgment('legionella')">
                        <label for="ack-checkbox-legionella">I acknowledge reading this section</label>
                    </div>
                    <button class="acknowledge-btn" id="ack-btn-legionella" onclick="submitAcknowledgment('legionella')" disabled>
                        Complete Acknowledgment
                    </button>
                </div>
            `
        };
    }

    getSection(sectionId) {
        return this.allSections[sectionId] || this.getDefaultSection(sectionId);
    }

    getDefaultSection(sectionId) {
        // Generate default content for sections not explicitly defined
        const sectionTitles = {
            'water-supply': 'Private Water Supply Risk Assessment',
            'hand-tools': 'Hand Tools Risk Assessment', 
            'power-tools': 'Power Tools Risk Assessment',
            'ride-on-mowers': 'Ride-on Mowers Risk Assessment',
            'grass-strimmers': 'Grass Strimmers Risk Assessment',
            'waste-management': 'Human Waste Management Risk Assessment',
            'fire-safety': 'Fire Safety Risk Assessment',
            'electrical-safety': 'Electrical Safety Risk Assessment',
            'chemical-storage': 'Chemical Storage & Handling Risk Assessment',
            'manual-handling': 'Manual Handling Risk Assessment',
            'rental-units': 'Rental Units Risk Assessment',
            'safe-work-procedures': 'Safe Work Procedures',
            'professional-support': 'Professional Support & Industry Liaison'
        };

        const title = sectionTitles[sectionId] || 'Documentation Section';
        
        return `
            <div class="section-header">
                <h2>${title}</h2>
                <p>Comprehensive safety procedures and risk controls</p>
            </div>
            <div class="section-content">
                <div class="info-box">
                    <h3>Section Overview</h3>
                    <p>This section contains detailed risk assessment and safety procedures for ${title.toLowerCase()}. All staff must read, understand, and acknowledge these procedures before performing related work activities.</p>
                </div>
                
                <div class="warning-box">
                    <h3>Safety Requirements</h3>
                    <p>Failure to follow these procedures may result in serious injury, regulatory enforcement action, or criminal prosecution. If you have any questions about these procedures, speak with your supervisor immediately.</p>
                </div>
                
                <h3>Key Safety Requirements</h3>
                <ul>
                    <li>Complete training before performing any work activities</li>
                    <li>Use appropriate personal protective equipment (PPE)</li>
                    <li>Follow all established procedures and work instructions</li>
                    <li>Report hazards, incidents, and near misses immediately</li>
                    <li>Maintain competency through ongoing training and assessment</li>
                </ul>
                
                <h3>Legislative Compliance</h3>
                <p>This assessment ensures compliance with:</p>
                <ul>
                    <li>Health and Safety at Work etc. Act 1974</li>
                    <li>Management of Health and Safety at Work Regulations 1999</li>
                    <li>Relevant specific regulations for this activity</li>
                </ul>
                
                <div class="highlight-box">
                    <h3>Emergency Contacts</h3>
                    <ul>
                        <li><strong>Emergency Services:</strong> 999</li>
                        <li><strong>Site Manager:</strong> [Contact Details]</li>
                        <li><strong>First Aid:</strong> [Contact Details]</li>
                        <li><strong>HSE Incident Hotline:</strong> 0845 300 9923</li>
                    </ul>
                </div>
            </div>
            <div class="acknowledgment-panel">
                <h3>Section Acknowledgment</h3>
                <p>I confirm that I have read and understood the ${title} procedures and requirements.</p>
                
                <div style="margin: 20px 0;">
                    <label for="user-name-${sectionId}" style="display: block; margin-bottom: 8px; font-weight: 500; color: #E8E8E8;">
                        Your Full Name:
                    </label>
                    <input type="text" id="user-name-${sectionId}" placeholder="Enter your full name" required style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #404040;
                        border-radius: 5px;
                        background: var(--darker-bg);
                        color: #E8E8E8;
                        font-size: 1rem;
                    ">
                </div>
                
                <div class="acknowledgment-checkbox">
                    <input type="checkbox" id="ack-checkbox-${sectionId}" onchange="updateAcknowledgment('${sectionId}')">
                    <label for="ack-checkbox-${sectionId}">I acknowledge reading this section</label>
                </div>
                <button class="acknowledge-btn" id="ack-btn-${sectionId}" onclick="submitAcknowledgment('${sectionId}')" disabled>
                    Complete Acknowledgment
                </button>
            </div>
        `;
    }
}

// Enhanced content loading function
function loadContentDynamically(contentId) {
    const contentManager = new ContentManager();
    const content = contentManager.getSection(contentId);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content-section active';
    contentDiv.id = contentId;
    contentDiv.innerHTML = content;
    
    document.querySelector('.content').appendChild(contentDiv);
}

// Initialize content manager
document.addEventListener('DOMContentLoaded', function() {
    window.contentManager = new ContentManager();
});
