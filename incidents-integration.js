// incidents-integration.js
// SafePark.PRO Incident Management Integration System
// Follows established pattern from play-parks-integration.js

class IncidentsSystem {
    constructor() {
        this.moduleName = 'Incident Management';
        this.firebaseCollection = 'incidents';
        this.initialized = false;
        
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
                console.log('✅ Incidents System initialized with Firebase');
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkFirebase, 100);
            } else {
                console.warn('⚠️ Incidents System: Firebase not available, using localStorage only');
                this.initialized = true;
            }
        };
        
        checkFirebase();
    }

    // Risk Assessment Methods
    async createRiskAssessment(formData) {
        if (!this.initialized) {
            console.warn('System not initialized, storing locally');
        }

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
            // Save to Firebase
            if (this.db) {
                await this.saveToFirebase('riskAssessments', riskAssessment);
                console.log('✅ Risk assessment saved to Firebase');
            }
            
            // Save to localStorage as backup
            this.saveToLocalStorage('riskAssessments', riskAssessment);
            
            return riskAssessment;
        } catch (error) {
            console.error('Error saving risk assessment:', error);
            // Fallback to localStorage
            this.saveToLocalStorage('riskAssessments', riskAssessment);
            throw error;
        }
    }

    async loadRiskAssessment(id) {
        try {
            if (this.db) {
                const doc = await this.db.collection('riskAssessments').doc(id).get();
                if (doc.exists) {
                    return { id: doc.id, ...doc.data() };
                }
            }
            
            // Fallback to localStorage
            return this.loadFromLocalStorage('riskAssessments', id);
        } catch (error) {
            console.error('Error loading risk assessment:', error);
            return this.loadFromLocalStorage('riskAssessments', id);
        }
    }

    // Procedures Methods
    async createProcedures(formData) {
        if (!this.initialized) {
            console.warn('System not initialized, storing locally');
        }

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
            // Save to Firebase
            if (this.db) {
                await this.saveToFirebase('procedures', procedures);
                console.log('✅ Procedures saved to Firebase');
            }
            
            // Save to localStorage as backup
            this.saveToLocalStorage('procedures', procedures);
            
            return procedures;
        } catch (error) {
            console.error('Error saving procedures:', error);
            // Fallback to localStorage
            this.saveToLocalStorage('procedures', procedures);
            throw error;
        }
    }

    async loadProcedures(id) {
        try {
            if (this.db) {
                const doc = await this.db.collection('procedures').doc(id).get();
                if (doc.exists) {
                    return { id: doc.id, ...doc.data() };
                }
            }
            
            // Fallback to localStorage
            return this.loadFromLocalStorage('procedures', id);
        } catch (error) {
            console.error('Error loading procedures:', error);
            return this.loadFromLocalStorage('procedures', id);
        }
    }

    // Inspection Methods
    async createInspection(formData) {
        if (!this.initialized) {
            console.warn('System not initialized, storing locally');
        }

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
            // Save to Firebase
            if (this.db) {
                await this.saveToFirebase('inspections', inspection);
                console.log('✅ Inspection saved to Firebase');
            }
            
            // Save to localStorage as backup
            this.saveToLocalStorage('inspections', inspection);
            
            // Create maintenance requests if corrective actions required
            if (data.corrective_actions && window.MaintenanceSystem) {
                await this.createMaintenanceRequest(inspection);
            }
            
            return inspection;
        } catch (error) {
            console.error('Error saving inspection:', error);
            // Fallback to localStorage
            this.saveToLocalStorage('inspections', inspection);
            throw error;
        }
    }

    async loadInspection(id) {
        try {
            if (this.db) {
                const doc = await this.db.collection('inspections').doc(id).get();
                if (doc.exists) {
                    return { id: doc.id, ...doc.data() };
                }
            }
            
            // Fallback to localStorage
            return this.loadFromLocalStorage('inspections', id);
        } catch (error) {
            console.error('Error loading inspection:', error);
            return this.loadFromLocalStorage('inspections', id);
        }
    }

    // Incident Methods (Core functionality for incidents module)
    async createIncident(incidentData) {
        if (!this.initialized) {
            console.warn('System not initialized, storing locally');
        }

        const incident = {
            id: incidentData.id || `incident_${Date.now()}`,
            module: this.moduleName,
            type: 'incident',
            ...incidentData,
            createdDate: incidentData.createdAt || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        try {
            // Save to Firebase
            if (this.db) {
                await this.saveToFirebase('incidents', incident);
                console.log('✅ Incident saved to Firebase');
            }
            
            // Save to localStorage as backup
            this.saveToLocalStorage('incidents', incident);
            
            // Create maintenance request if needed
            if (incident.incident_severity === 'high' || incident.incident_severity === 'critical') {
                if (window.MaintenanceSystem) {
                    await this.createMaintenanceFromIncident(incident);
                }
            }
            
            return incident;
        } catch (error) {
            console.error('Error saving incident:', error);
            // Fallback to localStorage
            this.saveToLocalStorage('incidents', incident);
            throw error;
        }
    }

    async loadIncident(id) {
        try {
            if (this.db) {
                const doc = await this.db.collection('incidents').doc(id).get();
                if (doc.exists) {
                    return { id: doc.id, ...doc.data() };
                }
            }
            
            // Fallback to localStorage
            return this.loadFromLocalStorage('incidents', id);
        } catch (error) {
            console.error('Error loading incident:', error);
            return this.loadFromLocalStorage('incidents', id);
        }
    }

    async getAllIncidents() {
        try {
            const incidents = [];
            
            if (this.db) {
                const snapshot = await this.db.collection('incidents').get();
                snapshot.forEach(doc => {
                    incidents.push({ id: doc.id, ...doc.data() });
                });
            }
            
            // Also get from localStorage
            const localIncidents = JSON.parse(localStorage.getItem('safepark_incidents') || '[]');
            
            // Merge and deduplicate
            const allIncidents = [...incidents, ...localIncidents];
            const uniqueIncidents = allIncidents.filter((incident, index, self) => 
                index === self.findIndex(i => i.id === incident.id)
            );
            
            return uniqueIncidents;
        } catch (error) {
            console.error('Error loading all incidents:', error);
            return JSON.parse(localStorage.getItem('safepark_incidents') || '[]');
        }
    }

    async updateIncident(id, updates) {
        try {
            const updatedData = {
                ...updates,
                lastUpdated: new Date().toISOString()
            };

            if (this.db) {
                await this.db.collection('incidents').doc(id).update(updatedData);
            }
            
            // Update localStorage
            const localIncidents = JSON.parse(localStorage.getItem('safepark_incidents') || '[]');
            const index = localIncidents.findIndex(incident => incident.id === id);
            if (index >= 0) {
                localIncidents[index] = { ...localIncidents[index], ...updatedData };
                localStorage.setItem('safepark_incidents', JSON.stringify(localIncidents));
            }
            
            return updatedData;
        } catch (error) {
            console.error('Error updating incident:', error);
            throw error;
        }
    }

    async createMaintenanceFromIncident(incident) {
        try {
            const priority = incident.incident_severity === 'critical' ? 'emergency' : 'high';
            const maintenanceRequest = {
                source: 'incident_report',
                sourceId: incident.id,
                title: `Incident Follow-up - ${incident.incident_type}`,
                description: `Incident Reference: ${incident.incident_reference}\n\nDescription: ${incident.incident_description}\n\nImmediate Action Taken: ${incident.immediate_actions}`,
                priority: priority,
                location: incident.incident_location,
                parkLocation: incident.holiday_park,
                reportedBy: incident.reported_by,
                category: 'safety',
                status: 'pending'
            };

            await window.MaintenanceSystem.createRequest(maintenanceRequest);
            console.log('✅ Maintenance request created from incident');
        } catch (error) {
            console.error('Error creating maintenance request:', error);
        }
    }

    // Firebase Integration
    async saveToFirebase(collection, data) {
        if (!this.db) {
            throw new Error('Firebase not available');
        }

        try {
            if (data.id) {
                await this.db.collection(collection).doc(data.id).set(data);
            } else {
                const docRef = await this.db.collection(collection).add(data);
                data.id = docRef.id;
            }
            return data;
        } catch (error) {
            console.error(`Error saving to Firebase collection ${collection}:`, error);
            throw error;
        }
    }

    async loadFromFirebase(collection, id) {
        if (!this.db) {
            throw new Error('Firebase not available');
        }

        try {
            const doc = await this.db.collection(collection).doc(id).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error(`Error loading from Firebase collection ${collection}:`, error);
            throw error;
        }
    }

    // LocalStorage Integration
    saveToLocalStorage(collection, data) {
        try {
            const key = `safepark_${collection}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            
            // Update existing or add new
            const index = existing.findIndex(item => item.id === data.id);
            if (index >= 0) {
                existing[index] = data;
            } else {
                existing.push(data);
            }
            
            localStorage.setItem(key, JSON.stringify(existing));
            console.log(`✅ Saved to localStorage: ${collection}`);
        } catch (error) {
            console.error(`Error saving to localStorage ${collection}:`, error);
        }
    }

    loadFromLocalStorage(collection, id) {
        try {
            const key = `safepark_${collection}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            return existing.find(item => item.id === id) || null;
        } catch (error) {
            console.error(`Error loading from localStorage ${collection}:`, error);
            return null;
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
            console.error('Error generating incident report:', error);
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
            console.error('Error updating dashboard stats:', error);
        }
    }
}

// Initialize the Incidents System
window.IncidentsSystem = new IncidentsSystem();

console.log('📋 Incidents Integration System loaded');
