/**
 * Complete Safety Ecosystem - Standardized Integration System
 * safepark.pro + safeteam.pro + safemanager.pro + safecare.pro
 * Firebase-ONLY - Uses standardized global Firebase reference
 * All Scottish Holiday Parks - Centralized Data Management
 * Version: 3.0 - November 2025
 */

class SafeParkIntegration {
    constructor() {
        this.initialized = false;
        this.firebaseReady = false;
        this.db = null;
        
        // Initialize Firebase connection using STANDARDIZED reference
        this.initFirebase();
        
        // Initialize all modules
        this.incidents = new IncidentsModule(this);
        this.hotTubs = new HotTubModule(this);
        this.playParks = new PlayParksModule(this);
        this.accommodation = new AccommodationModule(this);
        this.vehicles = new VehiclesModule(this);
        this.hpgs = new HpgsModule(this);
        this.library = new LibraryModule(this);
        
        console.log('🏴󠁧󠁢󠁳󠁣󠁴󠁿 Complete Safety Ecosystem Integration - Scottish Holiday Parks');
        console.log('🏢 Modules: safepark.pro + safeteam.pro + safemanager.pro + safecare.pro');
        console.log('🔥 Firebase-ONLY Mode - STANDARDIZED global references');
        console.log('🏢 Centralized data for all parks across entire ecosystem');
    }
    
    async initFirebase() {
        const maxAttempts = 100;
        let attempts = 0;
        
        const checkFirebase = () => {
            attempts++;
            
            // USE STANDARDIZED FIREBASE REFERENCE - PRIMARY METHOD
            if (window.firebaseDb && window.firebaseInitialized) {
                this.db = window.firebaseDb;
                this.initialized = true;
                this.firebaseReady = true;
                console.log('✅ SafePark Integration initialized with STANDARDIZED Firebase (window.firebaseDb)');
                console.log('🎯 Using primary standardized reference');
                this.onFirebaseReady();
                return;
            }
            
            // FALLBACK: Legacy compatibility
            else if (window.db) {
                this.db = window.db;
                this.initialized = true;
                this.firebaseReady = true;
                console.log('✅ SafePark Integration initialized with legacy reference (window.db)');
                console.log('⚠️ Consider updating to use window.firebaseDb');
                this.onFirebaseReady();
                return;
            }
            
            // FALLBACK: Direct Firebase access
            else if (typeof firebase !== 'undefined' && firebase.firestore) {
                this.db = firebase.firestore();
                this.initialized = true;
                this.firebaseReady = true;
                console.log('✅ SafePark Integration initialized with direct Firebase access');
                console.log('⚠️ Using direct access - standardized reference preferred');
                this.onFirebaseReady();
                return;
            }
            
            // LISTEN FOR FIREBASE READY EVENT
            if (attempts === 1) {
                window.addEventListener('firebaseReady', (event) => {
                    console.log('📢 Received firebaseReady event');
                    this.db = event.detail.db;
                    this.initialized = true;
                    this.firebaseReady = true;
                    console.log('✅ SafePark Integration initialized via firebaseReady event');
                    this.onFirebaseReady();
                });
            }
            
            // Debug logging every 10 attempts to reduce noise
            if (attempts % 10 === 0) {
                console.log(`🔍 Firebase check attempt ${attempts}/${maxAttempts}:`);
                console.log('  window.firebaseDb:', typeof window.firebaseDb);
                console.log('  window.firebaseInitialized:', window.firebaseInitialized);
                console.log('  window.db (legacy):', typeof window.db);
                console.log('  firebase:', typeof firebase);
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkFirebase, 100);
            } else {
                console.error('❌ CRITICAL: Standardized Firebase not available - SafePark system will NOT function');
                console.error('❌ NO localStorage fallback - Firebase is REQUIRED');
                console.error('❌ ALL holiday park data must be centralized in Firebase');
                console.error('🎯 Expected: window.firebaseDb to be available from firebase-config.js');
                this.initialized = false;
                this.firebaseReady = false;
            }
        };
        
        checkFirebase();
    }
    
    onFirebaseReady() {
        console.log('🚀 SafePark Integration System READY');
        console.log(`📊 Using Firebase reference: ${this.db ? 'Connected' : 'Not Connected'}`);
        
        // Notify all modules that Firebase is ready
        Object.values(this).forEach(module => {
            if (module && typeof module.onFirebaseReady === 'function') {
                module.onFirebaseReady();
            }
        });
        
        // Test Firebase connection
        this.testFirebaseConnection();
    }
    
    async testFirebaseConnection() {
        try {
            // Simple test to verify Firebase is working
            await this.db.collection('system').doc('test').set({
                timestamp: new Date().toISOString(),
                source: 'safepark-integration',
                version: '3.0'
            });
            console.log('✅ Firebase connection test successful');
        } catch (error) {
            console.error('❌ Firebase connection test failed:', error);
        }
    }
    
    checkFirebaseAvailable() {
        if (!this.firebaseReady || !this.db) {
            console.error('🔥 FIREBASE CHECK FAILED:');
            console.error('  firebaseReady:', this.firebaseReady);
            console.error('  db reference:', !!this.db);
            console.error('  window.firebaseDb:', typeof window.firebaseDb);
            console.error('  window.firebaseInitialized:', window.firebaseInitialized);
            throw new Error('🔥 Firebase is required for SafePark system. NO localStorage fallback available.');
        }
        return true;
    }
    
    async saveToFirebase(collection, data) {
        this.checkFirebaseAvailable();
        
        try {
            const timestamp = new Date().toISOString();
            const saveData = {
                ...data,
                lastUpdated: timestamp,
                source: 'safepark-integration'
            };
            
            if (data.id) {
                await this.db.collection(collection).doc(data.id).set(saveData);
                console.log(`✅ Updated in Firebase: ${collection}/${data.id}`);
            } else {
                const docRef = await this.db.collection(collection).add(saveData);
                console.log(`✅ Created in Firebase: ${collection}/${docRef.id}`);
                return docRef.id;
            }
        } catch (error) {
            console.error(`❌ Error saving to Firebase collection ${collection}:`, error);
            console.error('🔥 CRITICAL: Data not saved - Firebase write failed');
            throw error;
        }
    }
    
    async loadFromFirebase(collection, id) {
        this.checkFirebaseAvailable();
        
        try {
            const doc = await this.db.collection(collection).doc(id).get();
            if (doc.exists) {
                const data = { id: doc.id, ...doc.data() };
                console.log(`✅ Loaded from Firebase: ${collection}/${id}`);
                return data;
            }
            console.log(`ℹ️ Document not found in Firebase: ${collection}/${id}`);
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
            
            console.log(`✅ Query completed: ${collection} (${results.length} results)`);
            return results;
        } catch (error) {
            console.error(`❌ Error querying Firebase collection ${collection}:`, error);
            throw error;
        }
    }
    
    // Get Firebase reference for other modules
    getFirebaseRef() {
        this.checkFirebaseAvailable();
        return this.db;
    }
    
    // Check system status
    getStatus() {
        return {
            initialized: this.initialized,
            firebaseReady: this.firebaseReady,
            dbReference: !!this.db,
            standardizedGlobals: !!window.firebaseDb,
            firebaseInitialized: !!window.firebaseInitialized
        };
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
            lastUpdated: new Date().toISOString()
        };
        
        try {
            await this.parent.saveToFirebase(this.firebaseCollection, incident);
            console.log('✅ Incident saved to Firebase (STANDARDIZED)');
            return incident;
        } catch (error) {
            console.error('❌ CRITICAL: Incident save failed:', error);
            throw new Error('Failed to save incident - Firebase REQUIRED');
        }
    }
    
    processFormData(formData) {
        if (typeof formData === 'string') {
            try {
                return JSON.parse(formData);
            } catch (error) {
                throw new Error('Invalid incident data format');
            }
        }
        return formData;
    }
}

// ============================================================================
// HOT TUB MODULE
// ============================================================================

class HotTubModule {
    constructor(parent) {
        this.parent = parent;
        this.moduleName = 'Hot Tub Management';
        this.firebaseCollection = 'hottubs';
    }
    
    onFirebaseReady() {
        console.log('✅ Hot Tub Module ready - Firebase connected');
    }
    
    async createMaintenanceTask(taskData) {
        this.parent.checkFirebaseAvailable();
        
        const task = {
            id: `hottub_task_${Date.now()}`,
            module: this.moduleName,
            type: 'maintenance_task',
            hotTubId: taskData.hotTubId,
            taskType: taskData.taskType,
            description: taskData.description,
            priority: taskData.priority || 'medium',
            assignedTo: taskData.assignedTo,
            dueDate: taskData.dueDate,
            status: taskData.status || 'pending',
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        try {
            await this.parent.saveToFirebase(this.firebaseCollection, task);
            console.log('✅ Hot tub maintenance task saved to Firebase (STANDARDIZED)');
            return task;
        } catch (error) {
            console.error('❌ CRITICAL: Hot tub task save failed:', error);
            throw new Error('Failed to save hot tub task - Firebase REQUIRED');
        }
    }
}

// ============================================================================
// PLAY PARKS MODULE
// ============================================================================

class PlayParksModule {
    constructor(parent) {
        this.parent = parent;
        this.moduleName = 'Play Parks Safety';
        this.firebaseCollection = 'playparks';
    }
    
    onFirebaseReady() {
        console.log('✅ Play Parks Module ready - Firebase connected');
    }
    
    async createInspection(inspectionData) {
        this.parent.checkFirebaseAvailable();
        
        const inspection = {
            id: `playpark_inspection_${Date.now()}`,
            module: this.moduleName,
            type: 'safety_inspection',
            playParkId: inspectionData.playParkId,
            inspectorName: inspectionData.inspectorName,
            inspectionDate: inspectionData.inspectionDate,
            equipmentChecked: inspectionData.equipmentChecked,
            issues: inspectionData.issues || [],
            overallStatus: inspectionData.overallStatus,
            recommendations: inspectionData.recommendations,
            status: 'completed',
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        try {
            await this.parent.saveToFirebase(this.firebaseCollection, inspection);
            console.log('✅ Play park inspection saved to Firebase (STANDARDIZED)');
            return inspection;
        } catch (error) {
            console.error('❌ CRITICAL: Play park inspection save failed:', error);
            throw new Error('Failed to save inspection - Firebase REQUIRED');
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
            console.log('✅ Accommodation booking saved to Firebase (STANDARDIZED)');
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
            console.log('✅ Vehicle saved to Firebase (STANDARDIZED)');
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
            console.log('✅ HPGS guidance saved to Firebase (STANDARDIZED)');
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
            console.log('✅ Training record saved to Firebase (STANDARDIZED)');
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

// Global status check function
window.checkSafeParkStatus = function() {
    const status = window.SafePark.getStatus();
    console.log('🔍 SafePark System Status:', status);
    return status;
};

console.log('🏴󠁧󠁢󠁳󠁣󠁴󠁿 Complete Safety Ecosystem - Standardized Integration System Loaded');
console.log('🏢 Ecosystem: safepark.pro + safeteam.pro + safemanager.pro + safecare.pro');
console.log('🎯 ALL modules using standardized Firebase reference (window.firebaseDb)');
console.log('🚫 NO localStorage usage - Firebase is the single source of truth');
console.log('🏢 Centralized data management for Scottish Holiday Parks across all safety modules');
console.log('✅ All modules: Incidents, Hot Tubs, Play Parks, Accommodation, Vehicles, HPGS, Library');
console.log('💡 Use: checkSafeParkStatus() to verify system status');
console.log('🔗 Ready for integration with safeteam.pro, safemanager.pro, and safecare.pro');
