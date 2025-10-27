// incidents-integration.js
// SafePark.PRO Incident Management Integration System
// FIREBASE-ONLY VERSION - ZERO localStorage usage

class IncidentsSystem {
    constructor() {
        this.moduleName = 'Incident Management';
        this.firebaseCollection = 'incidents';
        this.initialized = false;
        this.firebaseReady = false;
        
        // Wait for Firebase to be available
        this.initWhenReady();
    }
    
    async initWhenReady() {
        const maxAttempts = 50;
        let attempts = 0;
        
        const checkFirebase = () => {
            attempts++;
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                this.db = firebase.firestore();
                this.initialized = true;
                this.firebaseReady = true;
                console.log('✅ Incidents System initialized with Firebase-ONLY mode');
                console.log('🔥 Firebase integration ready!');
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkFirebase, 100);
            } else {
                console.error('❌ Firebase not available - Incidents System will not function');
                console.error('❌ NO localStorage fallback - Firebase is required');
                this.initialized = false;
                this.firebaseReady = false;
            }
        };
        
        checkFirebase();
    }

    // Firebase availability check
    checkFirebaseAvailable() {
        if (!this.firebaseReady || !this.db) {
            throw new Error('Firebase is required for this system to function. No localStorage fallback available.');
        }
    }

    // Risk Assessment Methods
    async createRiskAssessment(formData) {
        this.checkFirebaseAvailable();

        const data = this.processFormData(formData);
        const riskAssessment = {
            id: `risk_assessment_${Date.now()}`,
            module: this.moduleName,
            type: 'risk_assessment',
            parkLocation: data.park_name,
            areaName: data.area_name,
            riskCategories: data.risk_categories || [],
            hazards: data.hazards || '',
            riskLevel: data.risk_level,
            mitigationMeasures: data.mitigation_measures,
            assessor: data.assessor,
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        try {
            await this.saveToFirebase('riskAssessments', riskAssessment);
            console.log('✅ Risk assessment saved to Firebase (ONLY)');
            return riskAssessment;
        } catch (error) {
            console.error('❌ Error saving risk assessment to Firebase:', error);
            throw new Error('Failed to save risk assessment - Firebase error');
        }
    }

    async loadRiskAssessment(id) {
        this.checkFirebaseAvailable();
        
        try {
            const doc = await this.db.collection('riskAssessments').doc(id).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('❌ Error loading risk assessment from Firebase:', error);
            throw new Error('Failed to load risk assessment - Firebase error');
        }
    }

    // Procedures Methods
    async createProcedures(formData) {
        this.checkFirebaseAvailable();

        const data = this.processFormData(formData);
        const procedures = {
            id: `procedures_${Date.now()}`,
            module: this.moduleName,
            type: 'procedures',
            parkLocation: data.park_name,
            areaName: data.area_name,
            procedures: {
                daily: data.daily_procedures || '',
                weekly: data.weekly_procedures || '',
                monthly: data.monthly_procedures || '',
                emergency: data.emergency_procedures || '',
                reporting: data.reporting_procedures || ''
            },
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        try {
            await this.saveToFirebase('procedures', procedures);
            console.log('✅ Procedures saved to Firebase (ONLY)');
            return procedures;
        } catch (error) {
            console.error('❌ Error saving procedures to Firebase:', error);
            throw new Error('Failed to save procedures - Firebase error');
        }
    }

    async loadProcedures(id) {
        this.checkFirebaseAvailable();
        
        try {
            const doc = await this.db.collection('procedures').doc(id).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('❌ Error loading procedures from Firebase:', error);
            throw new Error('Failed to load procedures - Firebase error');
        }
    }

    // Inspection Methods
    async createInspection(formData) {
        this.checkFirebaseAvailable();

        const data = this.processFormData(formData);
        const inspection = {
            id: `inspection_${Date.now()}`,
            module: this.moduleName,
            type: 'inspection',
            parkLocation: data.park_name,
            areaName: data.area_name,
            inspectionType: data.inspection_type,
            findings: data.findings || '',
            correctiveActions: data.corrective_actions || '',
            inspector: data.inspector,
            completedDate: new Date().toISOString(),
            status: 'completed'
        };

        try {
            await this.saveToFirebase('inspections', inspection);
            console.log('✅ Inspection saved to Firebase (ONLY)');
            
            // Create maintenance requests if corrective actions required
            if (data.corrective_actions && window.MaintenanceSystem) {
                await this.createMaintenanceRequest(inspection);
            }
            
            return inspection;
        } catch (error) {
            console.error('❌ Error saving inspection to Firebase:', error);
            throw new Error('Failed to save inspection - Firebase error');
        }
    }

    async loadInspection(id) {
        this.checkFirebaseAvailable();
        
        try {
            const doc = await this.db.collection('inspections').doc(id).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('❌ Error loading inspection from Firebase:', error);
            throw new Error('Failed to load inspection - Firebase error');
        }
    }

    // Incident Methods (Core functionality for incidents module)
    async createIncident(formData) {
        this.checkFirebaseAvailable();

        const data = this.processFormData(formData);
        const incident = {
            id: `incident_${Date.now()}`,
            module: this.moduleName,
            type: 'incident',
            holiday_park: data.holiday_park,
            area_name: data.area_name,
            incident_type: data.incident_type,
            incident_severity: data.incident_severity,
            incident_description: data.incident_description,
            immediate_action: data.immediate_action,
            reporter_name: data.reporter_name,
            reporter_contact: data.reporter_contact,
            incident_date: data.incident_date,
            incident_time: data.incident_time,
            witness_details: data.witness_details,
            medical_attention: data.medical_attention === 'yes',
            police_involved: data.police_involved === 'yes',
            status: 'open',
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        try {
            await this.saveToFirebase('incidents', incident);
            console.log('✅ Incident saved to Firebase (ONLY)');
            
            // Update dashboard stats
            await this.updateDashboardStats();
            
            return incident;
        } catch (error) {
            console.error('❌ Error saving incident to Firebase:', error);
            throw new Error('Failed to save incident - Firebase error');
        }
    }

    async loadIncident(id) {
        this.checkFirebaseAvailable();
        
        try {
            const doc = await this.db.collection('incidents').doc(id).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('❌ Error loading incident from Firebase:', error);
            throw new Error('Failed to load incident - Firebase error');
        }
    }

    async getAllIncidents() {
        this.checkFirebaseAvailable();
        
        try {
            const snapshot = await this.db.collection('incidents').get();
            const incidents = [];
            snapshot.forEach(doc => {
                incidents.push({ id: doc.id, ...doc.data() });
            });
            return incidents;
        } catch (error) {
            console.error('❌ Error loading all incidents from Firebase:', error);
            throw new Error('Failed to load incidents - Firebase error');
        }
    }

    // Cross-module integration
    async createMaintenanceRequest(inspection) {
        if (!window.MaintenanceSystem) {
            console.warn('MaintenanceSystem not available');
            return;
        }

        const maintenanceRequest = {
            id: `maint_${Date.now()}`,
            title: `Corrective Action Required - ${inspection.areaName}`,
            description: `Inspection findings require corrective action:\n\nFindings: ${inspection.findings}\n\nActions needed: ${inspection.correctiveActions}`,
            priority: 'high',
            category: 'safety',
            location: inspection.parkLocation,
            area: inspection.areaName,
            sourceType: 'inspection',
            sourceId: inspection.id,
            requestedBy: inspection.inspector,
            dateCreated: new Date().toISOString(),
            status: 'open'
        };

        try {
            await window.MaintenanceSystem.createRequest(maintenanceRequest);
            console.log('✅ Maintenance request created from inspection');
        } catch (error) {
            console.error('Error creating maintenance request:', error);
        }
    }

    // Firebase operations (ONLY - no localStorage)
    async saveToFirebase(collection, data) {
        this.checkFirebaseAvailable();

        try {
            if (data.id) {
                await this.db.collection(collection).doc(data.id).set(data);
            } else {
                await this.db.collection(collection).add(data);
            }
            console.log(`✅ Saved to Firebase collection: ${collection}`);
        } catch (error) {
            console.error(`❌ Error saving to Firebase collection ${collection}:`, error);
            throw error;
        }
    }

    async loadFromFirebase(collection, id) {
        this.checkFirebaseAvailable();

        try {
            const doc = await this.db.collection(collection).doc(id).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error(`❌ Error loading from Firebase collection ${collection}:`, error);
            throw error;
        }
    }

    // Utility Methods
    processFormData(formData) {
        const data = {};
        
        if (formData instanceof FormData) {
            // Handle FormData object
            for (const [key, value] of formData.entries()) {
                if (data[key]) {
                    // Handle multiple values (checkboxes)
                    if (Array.isArray(data[key])) {
                        data[key].push(value);
                    } else {
                        data[key] = [data[key], value];
                    }
                } else {
                    data[key] = value;
                }
            }
        } else {
            // Handle plain object
            Object.assign(data, formData);
        }
        
        return data;
    }

    generateInspectionCriteria(riskData, procData) {
        const criteria = [];
        
        // Generate criteria based on risk assessment
        if (riskData && riskData.riskCategories) {
            riskData.riskCategories.forEach(category => {
                switch (category) {
                    case 'slip-trip-fall':
                        criteria.push('Check for wet surfaces, obstacles, and proper signage');
                        criteria.push('Verify non-slip surfaces are in good condition');
                        break;
                    case 'equipment-failure':
                        criteria.push('Inspect equipment for signs of wear or malfunction');
                        criteria.push('Verify maintenance schedules are up to date');
                        break;
                    case 'security':
                        criteria.push('Check security systems and access controls');
                        criteria.push('Verify lighting is adequate and functioning');
                        break;
                    case 'medical':
                        criteria.push('Verify first aid supplies are stocked and accessible');
                        criteria.push('Check emergency contact information is displayed');
                        break;
                    case 'fire':
                        criteria.push('Inspect fire safety equipment and exits');
                        criteria.push('Verify gas safety systems and detectors');
                        break;
                    case 'environmental':
                        criteria.push('Check for environmental hazards or spills');
                        criteria.push('Verify waste disposal procedures are followed');
                        break;
                }
            });
        }
        
        // Add general safety criteria
        criteria.push('Check that safety procedures are being followed');
        criteria.push('Verify emergency procedures are clearly posted');
        criteria.push('Confirm staff are aware of safety protocols');
        
        return criteria;
    }

    // Report Generation
    async generateIncidentReport(filters = {}) {
        this.checkFirebaseAvailable();
        
        try {
            const incidents = await this.getAllIncidents();
            let filteredIncidents = incidents;
            
            // Apply filters
            if (filters.severity) {
                filteredIncidents = filteredIncidents.filter(i => i.incident_severity === filters.severity);
            }
            if (filters.park) {
                filteredIncidents = filteredIncidents.filter(i => i.holiday_park === filters.park);
            }
            if (filters.status) {
                filteredIncidents = filteredIncidents.filter(i => i.status === filters.status);
            }
            if (filters.dateFrom) {
                filteredIncidents = filteredIncidents.filter(i => 
                    new Date(i.incident_date || i.createdDate) >= new Date(filters.dateFrom)
                );
            }
            if (filters.dateTo) {
                filteredIncidents = filteredIncidents.filter(i => 
                    new Date(i.incident_date || i.createdDate) <= new Date(filters.dateTo)
                );
            }
            
            return {
                total: filteredIncidents.length,
                incidents: filteredIncidents,
                summary: this.generateIncidentSummary(filteredIncidents)
            };
        } catch (error) {
            console.error('❌ Error generating incident report:', error);
            throw error;
        }
    }

    generateIncidentSummary(incidents) {
        const summary = {
            bySeverity: {},
            byType: {},
            byLocation: {},
            byStatus: {},
            trends: {}
        };
        
        incidents.forEach(incident => {
            // By severity
            summary.bySeverity[incident.incident_severity] = (summary.bySeverity[incident.incident_severity] || 0) + 1;
            
            // By type
            summary.byType[incident.incident_type] = (summary.byType[incident.incident_type] || 0) + 1;
            
            // By location
            summary.byLocation[incident.holiday_park] = (summary.byLocation[incident.holiday_park] || 0) + 1;
            
            // By status
            summary.byStatus[incident.status] = (summary.byStatus[incident.status] || 0) + 1;
        });
        
        return summary;
    }

    // Dashboard stats update
    async updateDashboardStats() {
        this.checkFirebaseAvailable();
        
        try {
            const incidents = await this.getAllIncidents();
            
            const stats = {
                total: incidents.length,
                open: incidents.filter(i => i.status === 'open').length,
                investigation: incidents.filter(i => i.status === 'under-investigation').length,
                closed: incidents.filter(i => i.status === 'closed').length
            };
            
            // Update DOM elements if they exist
            const totalElement = document.getElementById('totalIncidentsCount');
            const openElement = document.getElementById('openIncidentsCount');
            const investigationElement = document.getElementById('investigationIncidentsCount');
            const closedElement = document.getElementById('closedIncidentsCount');
            
            if (totalElement) totalElement.textContent = stats.total;
            if (openElement) openElement.textContent = stats.open;
            if (investigationElement) investigationElement.textContent = stats.investigation;
            if (closedElement) closedElement.textContent = stats.closed;
            
            return stats;
        } catch (error) {
            console.error('❌ Error updating dashboard stats:', error);
            throw error;
        }
    }
}

// Initialize the Incidents System
window.IncidentsSystem = new IncidentsSystem();

console.log('📋 Incidents Integration System loaded - FIREBASE ONLY MODE');
console.log('🚫 localStorage Usage: ZERO');
console.log('🔥 Firebase is the ONLY source of truth');
