// hot-tub-integration.js
// SafePark.PRO Hot Tub Management Integration System
// Follows established pattern from play-parks-integration.js

class HotTubSystem {
    constructor() {
        this.moduleName = 'Hot Tub Management';
        this.firebaseCollection = 'hotTubs';
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
                console.log('✅ Hot Tub System initialized with Firebase');
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkFirebase, 100);
            } else {
                console.warn('⚠️ Hot Tub System: Firebase not available, using localStorage only');
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
            equipment: data.equipment || [],
            hazards: data.hazards || [],
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
            dailyProcedures: data.daily_procedures || [],
            weeklyProcedures: data.weekly_procedures || [],
            monthlyProcedures: data.monthly_procedures || [],
            emergencyProcedures: data.emergency_procedures,
            author: data.author,
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
            hotTubId: data.hottub_id,
            inspectionDate: data.inspection_date,
            inspectionTime: data.inspection_time,
            inspector: data.team_member,
            
            // Water Quality Data
            waterQuality: {
                temperature: parseFloat(data.water_temp) || null,
                pH: parseFloat(data.ph_level) || null,
                chlorine: parseFloat(data.chlorine_level) || null,
                totalAlkalinity: parseFloat(data.total_alkalinity) || null
            },
            
            // Safety Checks
            safetyChecks: data.safety_checks || [],
            equipmentChecks: data.equipment_checks || [],
            
            // Issues and Assessment
            issuesIdentified: data.issues_identified,
            priorityLevel: data.priority_level,
            overallAssessment: data.overall_assessment,
            
            // Metadata
            createdBy: data.team_member,
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        try {
            // Save to Firebase
            if (this.db) {
                await this.saveToFirebase(this.firebaseCollection, inspection);
                console.log('✅ Inspection saved to Firebase');
            }
            
            // Save to localStorage as backup
            this.saveToLocalStorage('inspections', inspection);
            
            // Create maintenance request if issues identified
            if (data.issues_identified && data.issues_identified.trim()) {
                await this.createMaintenanceFromInspection(inspection);
            }
            
            return inspection;
        } catch (error) {
            console.error('Error saving inspection:', error);
            // Fallback to localStorage
            this.saveToLocalStorage('inspections', inspection);
            throw error;
        }
    }

    async createMaintenanceFromInspection(inspection) {
        try {
            if (window.MaintenanceSystem && window.MaintenanceSystem.createMaintenanceRequest) {
                const maintenanceRequest = {
                    title: `Hot Tub Inspection Issue: ${inspection.hotTubId || 'Hot Tub'} - ${inspection.issuesIdentified.substring(0, 50)}...`,
                    description: `Issue identified during inspection at ${inspection.parkLocation}: ${inspection.issuesIdentified}`,
                    priority: inspection.priorityLevel || 'medium',
                    category: 'HOT_TUB_MANAGEMENT',
                    location: inspection.parkLocation,
                    dueDate: this.calculateDueDate(inspection.priorityLevel),
                    sourceInspection: inspection.id,
                    authenticated_user: window.currentUser ? {
                        name: window.currentUser.name,
                        role: window.currentUser.role,
                        park: window.currentUser.park
                    } : null,
                    submission_source: 'hot_tub_inspection',
                    submission_timestamp: new Date().toISOString()
                };

                await window.MaintenanceSystem.createMaintenanceRequest(maintenanceRequest);
                console.log('✅ Maintenance request created from inspection');
            }
        } catch (error) {
            console.error('Error creating maintenance request:', error);
        }
    }

    calculateDueDate(priority) {
        const now = new Date();
        switch (priority) {
            case 'urgent':
                return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
            case 'high':
                return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
            case 'medium':
                return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days
            case 'low':
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
            default:
                return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days default
        }
    }

    generateInspectionCriteria(riskData, procData) {
        const criteria = {
            waterQuality: [
                'Temperature check (38-40°C)',
                'pH level test (7.2-7.6)',
                'Free chlorine test (3-5 ppm)',
                'Water clarity inspection'
            ],
            safety: [
                'Safety covers functional',
                'Area cleanliness',
                'Emergency equipment present',
                'Signage visible and clear',
                'Lighting adequate'
            ],
            equipment: [
                'Filtration system operational',
                'Heating system working',
                'Chemical dosing correct',
                'Jets functioning',
                'No visible leaks or damage'
            ]
        };

        // Customize based on risk assessment
        if (riskData && riskData.hazards) {
            if (riskData.hazards.includes('Legionella Risk')) {
                criteria.waterQuality.push('Legionella prevention measures check');
            }
            if (riskData.hazards.includes('Chemical Exposure')) {
                criteria.safety.push('Chemical storage area inspection');
            }
        }

        // Customize based on procedures
        if (procData && procData.dailyProcedures) {
            procData.dailyProcedures.forEach(proc => {
                if (!criteria.waterQuality.some(item => item.toLowerCase().includes(proc.toLowerCase()))) {
                    criteria.waterQuality.push(proc);
                }
            });
        }

        return criteria;
    }

    // Firebase Integration Methods
    async saveToFirebase(collection, data) {
        if (!this.db) {
            throw new Error('Firebase not available');
        }

        try {
            const docRef = await this.db.collection(collection).add({
                ...data,
                lastUpdated: new Date().toISOString()
            });
            
            console.log(`✅ Data saved to Firebase collection '${collection}' with ID: ${docRef.id}`);
            return docRef.id;
        } catch (error) {
            console.error(`❌ Firebase save error for collection '${collection}':`, error);
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
            } else {
                throw new Error('Document not found');
            }
        } catch (error) {
            console.error(`❌ Firebase load error for collection '${collection}', ID '${id}':`, error);
            throw error;
        }
    }

    async queryFirebase(collection, filters = {}) {
        if (!this.db) {
            throw new Error('Firebase not available');
        }

        try {
            let query = this.db.collection(collection);
            
            // Apply filters
            Object.entries(filters).forEach(([field, value]) => {
                query = query.where(field, '==', value);
            });

            const snapshot = await query.get();
            const results = [];
            
            snapshot.forEach(doc => {
                results.push({ id: doc.id, ...doc.data() });
            });

            return results;
        } catch (error) {
            console.error(`❌ Firebase query error for collection '${collection}':`, error);
            throw error;
        }
    }

    // localStorage Integration Methods
    saveToLocalStorage(key, data) {
        try {
            const existingData = JSON.parse(localStorage.getItem(`safepark_${key}`) || '[]');
            existingData.push(data);
            localStorage.setItem(`safepark_${key}`, JSON.stringify(existingData));
            console.log(`✅ Data saved to localStorage key 'safepark_${key}'`);
        } catch (error) {
            console.error(`❌ localStorage save error for key 'safepark_${key}':`, error);
        }
    }

    loadFromLocalStorage(key, id) {
        try {
            const data = JSON.parse(localStorage.getItem(`safepark_${key}`) || '[]');
            return data.find(item => item.id === id);
        } catch (error) {
            console.error(`❌ localStorage load error for key 'safepark_${key}':`, error);
            return null;
        }
    }

    loadAllFromLocalStorage(key) {
        try {
            return JSON.parse(localStorage.getItem(`safepark_${key}`) || '[]');
        } catch (error) {
            console.error(`❌ localStorage load error for key 'safepark_${key}':`, error);
            return [];
        }
    }

    // Utility Methods
    processFormData(formData) {
        const data = {};
        
        if (formData instanceof FormData) {
            // Handle FormData object
            for (let [key, value] of formData.entries()) {
                if (data[key]) {
                    // Handle multiple values (like checkboxes)
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
            // Handle regular object
            Object.assign(data, formData);
        }
        
        return data;
    }

    // Report Generation Methods
    async generateInspectionReport(filters = {}) {
        try {
            let inspections = [];
            
            // Try Firebase first
            if (this.db) {
                inspections = await this.queryFirebase(this.firebaseCollection, filters);
            }
            
            // Fallback to localStorage
            if (inspections.length === 0) {
                inspections = this.loadAllFromLocalStorage('inspections')
                    .filter(inspection => {
                        return Object.entries(filters).every(([key, value]) => 
                            inspection[key] === value
                        );
                    });
            }

            return this.formatInspectionReport(inspections);
        } catch (error) {
            console.error('Error generating inspection report:', error);
            return { error: error.message };
        }
    }

    formatInspectionReport(inspections) {
        const report = {
            generatedAt: new Date().toISOString(),
            totalInspections: inspections.length,
            safeCount: inspections.filter(i => i.overallAssessment === 'safe').length,
            unsafeCount: inspections.filter(i => i.overallAssessment === 'unsafe').length,
            issuesCount: inspections.filter(i => i.issuesIdentified && i.issuesIdentified.trim()).length,
            
            // Water quality statistics
            waterQuality: {
                avgTemperature: this.calculateAverage(inspections, 'waterQuality.temperature'),
                avgPH: this.calculateAverage(inspections, 'waterQuality.pH'),
                avgChlorine: this.calculateAverage(inspections, 'waterQuality.chlorine')
            },
            
            // Recent inspections
            recentInspections: inspections
                .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
                .slice(0, 10),
                
            inspections: inspections
        };

        return report;
    }

    calculateAverage(array, path) {
        const values = array
            .map(item => this.getNestedValue(item, path))
            .filter(val => val !== null && val !== undefined && !isNaN(val));
        
        if (values.length === 0) return null;
        
        return (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(2);
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    // Hot Tub Specific Methods
    async getHotTubInspections(hotTubId, limit = 10) {
        try {
            let inspections = [];
            
            if (this.db) {
                const snapshot = await this.db.collection(this.firebaseCollection)
                    .where('hotTubId', '==', hotTubId)
                    .orderBy('createdDate', 'desc')
                    .limit(limit)
                    .get();
                
                snapshot.forEach(doc => {
                    inspections.push({ id: doc.id, ...doc.data() });
                });
            }
            
            // Fallback to localStorage
            if (inspections.length === 0) {
                inspections = this.loadAllFromLocalStorage('inspections')
                    .filter(inspection => inspection.hotTubId === hotTubId)
                    .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
                    .slice(0, limit);
            }
            
            return inspections;
        } catch (error) {
            console.error('Error getting hot tub inspections:', error);
            return [];
        }
    }

    async getParkInspections(parkName, limit = 20) {
        try {
            let inspections = [];
            
            if (this.db) {
                const snapshot = await this.db.collection(this.firebaseCollection)
                    .where('parkLocation', '==', parkName)
                    .orderBy('createdDate', 'desc')
                    .limit(limit)
                    .get();
                
                snapshot.forEach(doc => {
                    inspections.push({ id: doc.id, ...doc.data() });
                });
            }
            
            // Fallback to localStorage
            if (inspections.length === 0) {
                inspections = this.loadAllFromLocalStorage('inspections')
                    .filter(inspection => inspection.parkLocation === parkName)
                    .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
                    .slice(0, limit);
            }
            
            return inspections;
        } catch (error) {
            console.error('Error getting park inspections:', error);
            return [];
        }
    }

    // Integration with Maintenance System
    async syncWithMaintenanceSystem() {
        try {
            if (!window.MaintenanceSystem) {
                console.warn('Maintenance system not available');
                return;
            }

            const recentInspections = this.loadAllFromLocalStorage('inspections')
                .filter(inspection => {
                    const inspectionDate = new Date(inspection.createdDate);
                    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    return inspectionDate > dayAgo && inspection.issuesIdentified && inspection.issuesIdentified.trim();
                });

            for (const inspection of recentInspections) {
                await this.createMaintenanceFromInspection(inspection);
            }

            console.log(`✅ Synced ${recentInspections.length} inspections with maintenance system`);
        } catch (error) {
            console.error('Error syncing with maintenance system:', error);
        }
    }
}

// Initialize and expose the Hot Tub System
window.HotTubSystem = new HotTubSystem();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HotTubSystem;
}

console.log('🔄 Hot Tub Integration System loaded and ready');
