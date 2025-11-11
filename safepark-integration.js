/**
 * SafePark.PRO - Complete Integration System
 * Firebase-ONLY - NO localStorage for business-critical operations
 * All Scottish Holiday Parks - Centralized Data Management
 * Version: 2.0 - January 2025
 */

class SafeParkIntegration {
    constructor() {
        this.initialized = false;
        this.firebaseReady = false;
        this.db = null;
        
        // Initialize Firebase connection shared by all modules
        this.initFirebase();
        
        // Initialize all modules
        this.incidents = new IncidentsModule(this);
        this.hotTubs = new HotTubModule(this);
        this.playParks = new PlayParksModule(this);
        this.accommodation = new AccommodationModule(this);
        this.vehicles = new VehiclesModule(this);
        this.hpgs = new HpgsModule(this);
        this.library = new LibraryModule(this);
        
        console.log('🏴󠁧󠁢󠁳󠁣󠁴󠁿 SafePark.PRO Integration System - Scottish Holiday Parks');
        console.log('🔥 Firebase-ONLY Mode - NO localStorage usage');
        console.log('🏢 Centralized data for all parks');
    }
    
    async initFirebase() {
        const maxAttempts = 100;
        let attempts = 0;
        
        const checkFirebase = () => {
            attempts++;
            
            // Check multiple ways Firebase might be available - FIXED variable names
            if (window.firebaseDb) {
                // Use global firebaseDb instance (from Firebase config)
                this.db = window.firebaseDb;
                this.initialized = true;
                this.firebaseReady = true;
                console.log('✅ SafePark Integration initialized with global Firebase db');
                console.log('🔥 Firebase integration ready for ALL modules');
                this.onFirebaseReady();
                return;
            } else if (window.db) {
                // Fallback to window.db if available
                this.db = window.db;
                this.initialized = true;
                this.firebaseReady = true;
                console.log('✅ SafePark Integration initialized with window.db');
                console.log('🔥 Firebase integration ready for ALL modules');
                this.onFirebaseReady();
                return;
            } else if (typeof firebase !== 'undefined' && firebase.firestore) {
                this.db = firebase.firestore();
                this.initialized = true;
                this.firebaseReady = true;
                console.log('✅ SafePark Integration initialized with Firebase');
                console.log('🔥 Firebase integration ready for ALL modules');
                this.onFirebaseReady();
                return;
            } else if (window.firebaseInitialized && typeof firebase !== 'undefined') {
                // Firebase config says it's ready, try again
                this.db = firebase.firestore();
                this.initialized = true;
                this.firebaseReady = true;
                console.log('✅ SafePark Integration initialized with Firebase (retry)');
                console.log('🔥 Firebase integration ready for ALL modules');
                this.onFirebaseReady();
                return;
            }
            
            // Debug logging
            console.log(`🔍 Firebase check attempt ${attempts}/${maxAttempts}:`);
            console.log('  window.firebaseDb:', typeof window.firebaseDb);
            console.log('  window.db:', typeof window.db);
            console.log('  firebase:', typeof firebase);
            console.log('  firebase.firestore:', typeof firebase !== 'undefined' ? typeof firebase.firestore : 'N/A');
            console.log('  window.firebaseInitialized:', window.firebaseInitialized);
            
            if (attempts < maxAttempts) {
                setTimeout(checkFirebase, 100);
            } else {
                console.error('❌ CRITICAL: Firebase not available - SafePark system will NOT function');
                console.error('❌ NO localStorage fallback - Firebase is REQUIRED');
                console.error('❌ ALL holiday park data must be centralized in Firebase');
                this.initialized = false;
                this.firebaseReady = false;
            }
        };
        
        checkFirebase();
    }
    
    onFirebaseReady() {
        // Notify all modules that Firebase is ready
        Object.values(this).forEach(module => {
            if (module && typeof module.onFirebaseReady === 'function') {
                module.onFirebaseReady();
            }
        });
    }
    
    checkFirebaseAvailable() {
        if (!this.firebaseReady || !this.db) {
            throw new Error('Firebase is required for SafePark system. NO localStorage fallback available.');
        }
    }
    
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
    
    async queryFirebase(collection, filters = {}) {
        this.checkFirebaseAvailable();
        
        try {
            let query = this.db.collection(collection);
            
            // Apply filters
            Object.entries(filters).forEach(([field, value]) => {
                if (value !== null && value !== undefined) {
                    query = query.where(field, '==', value);
                }
            });
            
            const snapshot = await query.get();
            const results = [];
            snapshot.forEach(doc => {
                results.push({ id: doc.id, ...doc.data() });
            });
            
            return results;
        } catch (error) {
            console.error(`❌ Error querying Firebase collection ${collection}:`, error);
            throw error;
        }
    }
}

// ============================================================================
// INCIDENTS MODULE
// ============================================================================

class IncidentsModule {
    constructor(parent) {
        this.parent = parent;
        this.moduleName = 'Incident Management';
        this.firebaseCollection = 'incidents';
    }
    
    onFirebaseReady() {
        console.log('✅ Incidents Module ready - Firebase connected');
    }
    
    async createIncident(incidentData) {
        this.parent.checkFirebaseAvailable();
        
        // If it's already a structured object (from HTML form), use it directly
        const data = incidentData.id ? incidentData : this.processFormData(incidentData);
        
        const incident = {
            id: data.id || data.incident_reference || `incident_${Date.now()}`,
            incident_reference: data.incident_reference || data.id,
            module: this.moduleName,
            type: 'incident',
            holiday_park: data.holiday_park,
            business_area: data.business_area,
            incident_type: data.incident_type,
            incident_severity: data.incident_severity,
            incident_description: data.incident_description,
            immediate_actions: data.immediate_actions,
            reported_by: data.reported_by,
            reporter_role: data.reporter_role,
            incident_location: data.incident_location,
            incident_date: data.incident_date,
            incident_time: data.incident_time,
            witnesses_info: data.witnesses_info,
            status: data.status || 'open',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            authenticated_user: data.authenticated_user,
            submission_source: data.submission_source
        };
        
        try {
            await this.parent.saveToFirebase(this.firebaseCollection, incident);
            console.log('✅ Incident saved to Firebase (ONLY) - NO localStorage');
            
            // Update dashboard stats
            await this.updateDashboardStats();
            
            return incident;
        } catch (error) {
            console.error('❌ CRITICAL: Incident save failed - Firebase error:', error);
            throw new Error('Failed to save incident - Firebase REQUIRED');
        }
    }
    
    async getAllIncidents() {
        this.parent.checkFirebaseAvailable();
        
        try {
            const snapshot = await this.parent.db.collection(this.firebaseCollection).get();
            const incidents = [];
            snapshot.forEach(doc => {
                incidents.push({ id: doc.id, ...doc.data() });
            });
            return incidents;
        } catch (error) {
            console.error('❌ Error loading incidents from Firebase:', error);
            throw new Error('Failed to load incidents - Firebase error');
        }
    }
    
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
            console.error('❌ Error updating dashboard stats:', error);
            throw error;
        }
    }
    
    processFormData(formData) {
        const data = {};
        
        if (formData instanceof FormData) {
            for (const [key, value] of formData.entries()) {
                if (data[key]) {
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
            Object.assign(data, formData);
        }
        
        return data;
    }
}

// ============================================================================
// HOT TUB MODULE
// ============================================================================

class HotTubModule {
    constructor(parent) {
        this.parent = parent;
        this.moduleName = 'Hot Tub Management';
        this.firebaseCollection = 'hotTubData';
    }
    
    onFirebaseReady() {
        console.log('✅ Hot Tub Module ready - Firebase connected');
    }
    
    async createHotTub(formData) {
        this.parent.checkFirebaseAvailable();
        
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
            
            notes: data.notes,
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            createdBy: data.created_by
        };
        
        try {
            await this.parent.saveToFirebase(this.firebaseCollection, hotTub);
            console.log('✅ Hot tub saved to Firebase (ONLY) - NO localStorage');
            return hotTub;
        } catch (error) {
            console.error('❌ CRITICAL: Hot tub save failed - Firebase error:', error);
            throw new Error('Failed to save hot tub - Firebase REQUIRED');
        }
    }
    
    async createInspection(inspectionData) {
        this.parent.checkFirebaseAvailable();
        
        const inspection = {
            id: `hotTubInspection_${Date.now()}`,
            module: this.moduleName,
            type: 'hot_tub_inspection',
            hotTubId: inspectionData.hotTubId,
            inspector: inspectionData.inspector,
            inspectionDate: inspectionData.inspectionDate,
            inspectionTime: inspectionData.inspectionTime,
            waterQuality: inspectionData.waterQuality,
            safetyChecks: inspectionData.safetyChecks,
            overallAssessment: inspectionData.overallAssessment,
            issuesIdentified: inspectionData.issuesIdentified,
            correctiveActions: inspectionData.correctiveActions,
            createdDate: new Date().toISOString(),
            status: 'completed'
        };
        
        try {
            await this.parent.saveToFirebase('hotTubInspections', inspection);
            console.log('✅ Hot tub inspection saved to Firebase (ONLY)');
            return inspection;
        } catch (error) {
            console.error('❌ CRITICAL: Hot tub inspection save failed:', error);
            throw new Error('Failed to save inspection - Firebase REQUIRED');
        }
    }
    
    processFormData(formData) {
        const data = {};
        
        if (formData instanceof FormData) {
            for (let [key, value] of formData.entries()) {
                if (data[key]) {
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
            Object.assign(data, formData);
        }
        
        return data;
    }
}

// ============================================================================
// PLAY PARKS MODULE
// ============================================================================

class PlayParksModule {
    constructor(parent) {
        this.parent = parent;
        this.moduleName = 'Play Parks Management';
        this.firebaseCollection = 'playParkRecords';
    }
    
    onFirebaseReady() {
        console.log('✅ Play Parks Module ready - Firebase connected');
    }
    
    async createInspection(inspectionData) {
        this.parent.checkFirebaseAvailable();
        
        const inspection = {
            id: `playpark_inspection_${Date.now()}`,
            module: this.moduleName,
            type: 'play_park_inspection',
            parkName: inspectionData.parkName,
            equipmentId: inspectionData.equipmentId,
            equipmentType: inspectionData.equipmentType,
            inspector: inspectionData.inspector,
            inspectionDate: inspectionData.inspectionDate,
            inspectionType: inspectionData.inspectionType || 'daily',
            safetyChecks: inspectionData.safetyChecks,
            riskLevel: inspectionData.riskLevel,
            issuesFound: inspectionData.issuesFound,
            actionRequired: inspectionData.actionRequired,
            status: inspectionData.status || 'completed',
            createdDate: new Date().toISOString()
        };
        
        try {
            await this.parent.saveToFirebase('playParkInspections', inspection);
            console.log('✅ Play park inspection saved to Firebase (ONLY)');
            return inspection;
        } catch (error) {
            console.error('❌ CRITICAL: Play park inspection save failed:', error);
            throw new Error('Failed to save inspection - Firebase REQUIRED');
        }
    }
    
    async createEquipment(equipmentData) {
        this.parent.checkFirebaseAvailable();
        
        const equipment = {
            id: `equipment_${Date.now()}`,
            module: this.moduleName,
            type: 'play_equipment',
            name: equipmentData.name,
            equipmentType: equipmentData.equipmentType,
            manufacturer: equipmentData.manufacturer,
            installDate: equipmentData.installDate,
            location: equipmentData.location,
            safetyStandards: equipmentData.safetyStandards || [],
            maintenanceSchedule: equipmentData.maintenanceSchedule,
            status: equipmentData.status || 'active',
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        try {
            await this.parent.saveToFirebase('playParkEquipment', equipment);
            console.log('✅ Play equipment saved to Firebase (ONLY)');
            return equipment;
        } catch (error) {
            console.error('❌ CRITICAL: Play equipment save failed:', error);
            throw new Error('Failed to save equipment - Firebase REQUIRED');
        }
    }
}

// ============================================================================
// ACCOMMODATION MODULE
// ============================================================================

class AccommodationModule {
    constructor(parent) {
        this.parent = parent;
        this.moduleName = 'Accommodation Management';
        this.firebaseCollection = 'accommodation';
    }
    
    onFirebaseReady() {
        console.log('✅ Accommodation Module ready - Firebase connected');
    }
    
    async createBooking(bookingData) {
        this.parent.checkFirebaseAvailable();
        
        const booking = {
            id: `booking_${Date.now()}`,
            module: this.moduleName,
            type: 'accommodation_booking',
            guestName: bookingData.guestName,
            accommodationType: bookingData.accommodationType,
            checkIn: bookingData.checkIn,
            checkOut: bookingData.checkOut,
            guests: bookingData.guests,
            specialRequests: bookingData.specialRequests,
            status: bookingData.status || 'confirmed',
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        try {
            await this.parent.saveToFirebase(this.firebaseCollection, booking);
            console.log('✅ Accommodation booking saved to Firebase (ONLY)');
            return booking;
        } catch (error) {
            console.error('❌ CRITICAL: Accommodation booking save failed:', error);
            throw new Error('Failed to save booking - Firebase REQUIRED');
        }
    }
}

// ============================================================================
// VEHICLES MODULE
// ============================================================================

class VehiclesModule {
    constructor(parent) {
        this.parent = parent;
        this.moduleName = 'Vehicle Management';
        this.firebaseCollection = 'vehicles';
    }
    
    onFirebaseReady() {
        console.log('✅ Vehicles Module ready - Firebase connected');
    }
    
    async createVehicle(vehicleData) {
        this.parent.checkFirebaseAvailable();
        
        const vehicle = {
            id: `vehicle_${Date.now()}`,
            module: this.moduleName,
            type: 'vehicle',
            registration: vehicleData.registration,
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year,
            vehicleType: vehicleData.vehicleType,
            fuelType: vehicleData.fuelType,
            motExpiry: vehicleData.motExpiry,
            insuranceExpiry: vehicleData.insuranceExpiry,
            status: vehicleData.status || 'active',
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        try {
            await this.parent.saveToFirebase(this.firebaseCollection, vehicle);
            console.log('✅ Vehicle saved to Firebase (ONLY)');
            return vehicle;
        } catch (error) {
            console.error('❌ CRITICAL: Vehicle save failed:', error);
            throw new Error('Failed to save vehicle - Firebase REQUIRED');
        }
    }
}

// ============================================================================
// HPGS MODULE
// ============================================================================

class HpgsModule {
    constructor(parent) {
        this.parent = parent;
        this.moduleName = 'Holiday Park Guidance System';
        this.firebaseCollection = 'hpgs';
    }
    
    onFirebaseReady() {
        console.log('✅ HPGS Module ready - Firebase connected');
    }
    
    async createGuidance(guidanceData) {
        this.parent.checkFirebaseAvailable();
        
        const guidance = {
            id: `guidance_${Date.now()}`,
            module: this.moduleName,
            type: 'guidance',
            title: guidanceData.title,
            category: guidanceData.category,
            content: guidanceData.content,
            applicableTo: guidanceData.applicableTo || [],
            priority: guidanceData.priority || 'medium',
            status: guidanceData.status || 'active',
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        try {
            await this.parent.saveToFirebase(this.firebaseCollection, guidance);
            console.log('✅ HPGS guidance saved to Firebase (ONLY)');
            return guidance;
        } catch (error) {
            console.error('❌ CRITICAL: HPGS guidance save failed:', error);
            throw new Error('Failed to save guidance - Firebase REQUIRED');
        }
    }
}

// ============================================================================
// LIBRARY MODULE
// ============================================================================

class LibraryModule {
    constructor(parent) {
        this.parent = parent;
        this.moduleName = 'Documentation Library';
        this.completedUsers = 0;
        this.totalUsers = 0;
    }
    
    onFirebaseReady() {
        console.log('✅ Library Module ready - Firebase connected');
    }
    
    updateStats(completed, total) {
        this.completedUsers = completed;
        this.totalUsers = total;
        this.updateStatsDisplay();
    }
    
    updateStatsDisplay() {
        const statsElements = document.querySelectorAll('.completion-stats');
        statsElements.forEach(element => {
            element.innerHTML = `
                <p><strong>Training Completion:</strong> ${this.completedUsers} / ${this.totalUsers} employees (${Math.round((this.completedUsers / this.totalUsers) * 100) || 0}%)</p>
            `;
        });
    }
    
    async saveTrainingRecord(trainingData) {
        this.parent.checkFirebaseAvailable();
        
        const record = {
            id: `training_${Date.now()}`,
            module: this.moduleName,
            type: 'training_record',
            employeeId: trainingData.employeeId,
            courseName: trainingData.courseName,
            completionDate: trainingData.completionDate,
            score: trainingData.score,
            certificateId: trainingData.certificateId,
            status: 'completed',
            createdDate: new Date().toISOString()
        };
        
        try {
            await this.parent.saveToFirebase('trainingRecords', record);
            console.log('✅ Training record saved to Firebase (ONLY)');
            return record;
        } catch (error) {
            console.error('❌ CRITICAL: Training record save failed:', error);
            throw new Error('Failed to save training record - Firebase REQUIRED');
        }
    }
}

// ============================================================================
// INITIALIZE AND EXPOSE GLOBAL SYSTEM
// ============================================================================

// Initialize the complete SafePark integration system
window.SafePark = new SafeParkIntegration();

// Maintain backward compatibility with existing code
window.IncidentsSystem = window.SafePark.incidents;
window.HotTubSystem = window.SafePark.hotTubs;
window.PlayParksSystem = window.SafePark.playParks;
window.AccommodationSystem = window.SafePark.accommodation;
window.VehiclesSystem = window.SafePark.vehicles;
window.HpgsSystem = window.SafePark.hpgs;
window.LibrarySystem = window.SafePark.library;

// Legacy compatibility functions
window.createHotTubMaintenanceTask = async function(taskData) {
    if (window.MaintenanceSystem && window.MaintenanceSystem.createMaintenanceRequest) {
        return await window.MaintenanceSystem.createMaintenanceRequest(taskData);
    }
};

console.log('🏴󠁧󠁢󠁳󠁣󠁴󠁿 SafePark.PRO Complete Integration System Loaded');
console.log('🔥 ALL modules using Firebase-ONLY - NO localStorage');
console.log('🏢 Centralized data management for Scottish Holiday Parks');
console.log('✅ All modules: Incidents, Hot Tubs, Play Parks, Accommodation, Vehicles, HPGS, Library');
