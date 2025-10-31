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

    // Hot Tub CRUD Methods
    async createHotTub(formData) {
        if (!this.initialized) {
            console.warn('System not initialized, storing locally');
        }

        const data = this.processFormData(formData);
        const hotTub = {
            id: `hottub_${Date.now()}`,
            module: this.moduleName,
            type: 'hot_tub',
            
            // Basic Information
            name: data.hot_tub_name,
            location: data.location,
            hotTubNumber: data.hot_tub_number,
            manufacturer: data.manufacturer,
            model: data.model,
            serialNumber: data.serial_number,
            installationDate: data.installation_date,
            
            // Technical Specifications
            capacity: parseInt(data.capacity) || 0,
            dimensions: {
                length: parseFloat(data.length) || null,
                width: parseFloat(data.width) || null,
                depth: parseFloat(data.depth) || null
            },
            waterCapacity: parseFloat(data.water_capacity) || null,
            
            // Equipment Details
            heatingSystem: data.heating_system,
            filtrationSystem: data.filtration_system,
            jetType: data.jet_type,
            jetCount: parseInt(data.jet_count) || 0,
            
            // Safety Features
            safetyFeatures: data.safety_features || [],
            accessibilityFeatures: data.accessibility_features || [],
            
            // Operational Details
            status: data.status || 'active',
            operatingHours: data.operating_hours,
            maintenanceSchedule: data.maintenance_schedule,
            
            // Chemical Management
            recommendedChemicals: data.recommended_chemicals || [],
            
            // Additional Notes
            notes: data.notes,
            
            // Metadata
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            createdBy: data.created_by
        };

        try {
            // Save to Firebase
            if (this.db) {
                await this.saveToFirebase(this.firebaseCollection, hotTub);
                console.log('✅ Hot tub saved to Firebase');
            }
            
            // Save to localStorage as backup
            this.saveToLocalStorage('hotTubs', hotTub);
            
            return hotTub;
        } catch (error) {
            console.error('Error saving hot tub:', error);
            // Fallback to localStorage
            this.saveToLocalStorage('hotTubs', hotTub);
            throw error;
        }
    }

    async updateHotTub(hotTubId, updateData) {
        try {
            const updatedHotTub = {
                ...updateData,
                lastUpdated: new Date().toISOString()
            };

            // Update in Firebase
            if (this.db) {
                await this.db.collection(this.firebaseCollection).doc(hotTubId).update(updatedHotTub);
                console.log('✅ Hot tub updated in Firebase');
            }
            
            // Update in localStorage
            this.updateInLocalStorage('hotTubs', hotTubId, updatedHotTub);
            
            return updatedHotTub;
        } catch (error) {
            console.error('Error updating hot tub:', error);
            // Fallback to localStorage
            this.updateInLocalStorage('hotTubs', hotTubId, updatedHotTub);
            throw error;
        }
    }

    async removeHotTub(hotTubId) {
        try {
            // Mark as inactive instead of deleting (for audit trail)
            const updateData = {
                status: 'inactive',
                removedDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };

            // Update in Firebase
            if (this.db) {
                await this.db.collection(this.firebaseCollection).doc(hotTubId).update(updateData);
                console.log('✅ Hot tub marked as inactive in Firebase');
            }
            
            // Update in localStorage
            this.updateInLocalStorage('hotTubs', hotTubId, updateData);
            
            return true;
        } catch (error) {
            console.error('Error removing hot tub:', error);
            // Fallback to localStorage
            this.updateInLocalStorage('hotTubs', hotTubId, updateData);
            throw error;
        }
    }

    async loadHotTub(hotTubId) {
        try {
            if (this.db) {
                const doc = await this.db.collection(this.firebaseCollection).doc(hotTubId).get();
                if (doc.exists) {
                    return { id: doc.id, ...doc.data() };
                }
            }
            
            // Fallback to localStorage
            return this.loadFromLocalStorage('hotTubs', hotTubId);
        } catch (error) {
            console.error('Error loading hot tub:', error);
            return this.loadFromLocalStorage('hotTubs', hotTubId);
        }
    }

    async loadAllHotTubs(filters = {}) {
        try {
            let hotTubs = [];
            
            // Try Firebase first
            if (this.db) {
                let query = this.db.collection(this.firebaseCollection);
                
                // Apply filters
                if (filters.location) {
                    query = query.where('location', '==', filters.location);
                }
                if (filters.status) {
                    query = query.where('status', '==', filters.status);
                } else {
                    // Default to active hot tubs only
                    query = query.where('status', '==', 'active');
                }
                
                const snapshot = await query.get();
                snapshot.forEach(doc => {
                    hotTubs.push({ id: doc.id, ...doc.data() });
                });
            }
            
            // Fallback to localStorage
            if (hotTubs.length === 0) {
                hotTubs = this.loadAllFromLocalStorage('hotTubs')
                    .filter(hotTub => {
                        if (filters.location && hotTub.location !== filters.location) return false;
                        if (filters.status && hotTub.status !== filters.status) return false;
                        if (!filters.status && hotTub.status !== 'active') return false;
                        return true;
                    });
            }
            
            return hotTubs;
        } catch (error) {
            console.error('Error loading hot tubs:', error);
            return this.loadAllFromLocalStorage('hotTubs');
        }
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
                await this.saveToFirebase('inspections', inspection);
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
                    description: `Hot tub inspection identified issues at ${inspection.parkLocation}:\n\n${inspection.issuesIdentified}\n\nInspection Date: ${inspection.inspectionDate}\nInspector: ${inspection.inspector}\nPriority: ${inspection.priorityLevel}`,
                    priority: inspection.priorityLevel || 'medium',
                    category: window.MaintenanceSystem.config?.categories?.HOT_TUB_MANAGEMENT || 'Hot Tub Management',
                    location: inspection.parkLocation,
                    hotTubId: inspection.hotTubId,
                    inspectionId: inspection.id,
                    authenticated_user: window.currentUser ? {
                        name: window.currentUser.name,
                        role: window.currentUser.role,
                        park: window.currentUser.park,
                        accessCode: window.currentUser.accessCode ? window.currentUser.accessCode.substring(0, 3) + '***' : 'unknown'
                    } : null,
                    submission_source: 'hot_tub_inspection',
                    submission_timestamp: new Date().toISOString()
                };

                await window.MaintenanceSystem.createMaintenanceRequest(maintenanceRequest);
                console.log('✅ Maintenance request created from inspection');
            }
        } catch (error) {
            console.error('Error creating maintenance request from inspection:', error);
        }
    }

    // Firebase Integration Methods
    async saveToFirebase(collection, data) {
        try {
            if (data.id) {
                await this.db.collection(collection).doc(data.id).set(data);
            } else {
                const docRef = await this.db.collection(collection).add(data);
                data.id = docRef.id;
            }
            console.log(`✅ Data saved to Firebase collection '${collection}'`);
        } catch (error) {
            console.error(`❌ Firebase save error for collection '${collection}':`, error);
            throw error;
        }
    }

    async queryFirebase(collection, filters = {}) {
        try {
            let query = this.db.collection(collection);
            
            Object.entries(filters).forEach(([key, value]) => {
                query = query.where(key, '==', value);
            });
            
            const snapshot = await query.get();
            const results = [];
            snapshot.forEach(doc => {
                results.push({ id: doc.id, ...doc.data() });
            });
            
            return results;
        } catch (error) {
            console.error(`❌ Firebase query error for collection '${collection}':`, error);
            return [];
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

    updateInLocalStorage(key, id, updateData) {
        try {
            const data = JSON.parse(localStorage.getItem(`safepark_${key}`) || '[]');
            const index = data.findIndex(item => item.id === id);
            
            if (index !== -1) {
                data[index] = { ...data[index], ...updateData };
                localStorage.setItem(`safepark_${key}`, JSON.stringify(data));
                console.log(`✅ Data updated in localStorage key 'safepark_${key}'`);
            }
        } catch (error) {
            console.error(`❌ localStorage update error for key 'safepark_${key}':`, error);
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
                inspections = await this.queryFirebase('inspections', filters);
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
                const snapshot = await this.db.collection('inspections')
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
                const snapshot = await this.db.collection('inspections')
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

// Legacy compatibility functions
window.createHotTubMaintenanceTask = async function(taskData) {
    if (window.MaintenanceSystem && window.MaintenanceSystem.createMaintenanceRequest) {
        return await window.MaintenanceSystem.createMaintenanceRequest(taskData);
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HotTubSystem;
}

console.log('🔄 Hot Tub Integration System loaded and ready');
