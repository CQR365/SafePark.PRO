// vehicles-integration.js
// SafePark.PRO Vehicle & Plant Machinery Management Integration System
// Follows established pattern from hot-tub-integration.js

class VehicleSystem {
    constructor() {
        this.moduleName = 'Vehicle & Plant Machinery Management';
        this.firebaseCollection = 'vehicles';
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
                console.log('✅ Vehicle System initialized with Firebase');
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkFirebase, 100);
            } else {
                console.warn('⚠️ Vehicle System: Firebase not available, using localStorage only');
                this.initialized = true;
            }
        };
        
        checkFirebase();
    }

    // Vehicle Registration Methods
    async createVehicle(formData) {
        if (!this.initialized) {
            console.warn('System not initialized, storing locally');
        }

        const data = this.processFormData(formData);
        const vehicle = {
            id: `vehicle_${Date.now()}`,
            module: this.moduleName,
            type: 'vehicle_registration',
            
            // Basic Information
            make: data.make,
            model: data.model,
            registration: data.registration,
            vin: data.vin,
            year: data.year,
            colour: data.colour,
            mileage: parseInt(data.mileage) || 0,
            
            // Classification
            vehicleType: data.vehicle_type,
            subCategory: data.sub_category,
            businessArea: data.business_area,
            location: data.location,
            
            // Compliance Information
            motExpiryDate: data.mot_expiry,
            taxExpiryDate: data.tax_expiry,
            insuranceExpiryDate: data.insurance_expiry,
            serviceDate: data.service_date,
            
            // Insurance Documents
            insuranceDocuments: data.insuranceDocuments || [],
            
            // Authorized Operators
            authorizedOperators: data.authorizedOperators || [],
            authorizedUser: data.authorized_user,
            
            // Additional Details
            fuelType: data.fuel_type,
            engineSize: data.engine_size,
            gearbox: data.gearbox,
            towingCapacity: data.towing_capacity,
            specialEquipment: data.special_equipment,
            
            // Metadata
            status: 'active',
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            createdBy: data.authorized_user
        };

        try {
            // Save to Firebase
            if (this.db) {
                await this.saveToFirebase(this.firebaseCollection, vehicle);
                console.log('✅ Vehicle saved to Firebase');
            }
            
            // Save to localStorage as backup
            this.saveToLocalStorage('vehicles', vehicle);
            
            // Create compliance monitoring
            await this.createComplianceMonitoring(vehicle);
            
            return vehicle;
        } catch (error) {
            console.error('Error saving vehicle:', error);
            // Fallback to localStorage
            this.saveToLocalStorage('vehicles', vehicle);
            throw error;
        }
    }

    async updateVehicle(vehicleId, updateData) {
        try {
            const updatedVehicle = {
                ...updateData,
                lastUpdated: new Date().toISOString()
            };

            // Update in Firebase
            if (this.db) {
                await this.db.collection(this.firebaseCollection).doc(vehicleId).update(updatedVehicle);
                console.log('✅ Vehicle updated in Firebase');
            }
            
            // Update in localStorage
            this.updateInLocalStorage('vehicles', vehicleId, updatedVehicle);
            
            return updatedVehicle;
        } catch (error) {
            console.error('Error updating vehicle:', error);
            // Fallback to localStorage
            this.updateInLocalStorage('vehicles', vehicleId, updatedVehicle);
            throw error;
        }
    }

    async removeVehicle(vehicleId) {
        try {
            // Mark as inactive instead of deleting (for audit trail)
            const updateData = {
                status: 'inactive',
                removedDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };

            // Update in Firebase
            if (this.db) {
                await this.db.collection(this.firebaseCollection).doc(vehicleId).update(updateData);
                console.log('✅ Vehicle marked as inactive in Firebase');
            }
            
            // Update in localStorage
            this.updateInLocalStorage('vehicles', vehicleId, updateData);
            
            return true;
        } catch (error) {
            console.error('Error removing vehicle:', error);
            // Fallback to localStorage
            this.updateInLocalStorage('vehicles', vehicleId, updateData);
            throw error;
        }
    }

    async loadVehicle(vehicleId) {
        try {
            if (this.db) {
                const doc = await this.db.collection(this.firebaseCollection).doc(vehicleId).get();
                if (doc.exists) {
                    return { id: doc.id, ...doc.data() };
                }
            }
            
            // Fallback to localStorage
            return this.loadFromLocalStorage('vehicles', vehicleId);
        } catch (error) {
            console.error('Error loading vehicle:', error);
            return this.loadFromLocalStorage('vehicles', vehicleId);
        }
    }

    async loadAllVehicles(filters = {}) {
        try {
            let vehicles = [];
            
            // Try Firebase first
            if (this.db) {
                let query = this.db.collection(this.firebaseCollection);
                
                // Apply filters
                if (filters.location) {
                    query = query.where('location', '==', filters.location);
                }
                if (filters.businessArea) {
                    query = query.where('businessArea', '==', filters.businessArea);
                }
                if (filters.status) {
                    query = query.where('status', '==', filters.status);
                } else {
                    // Default to active vehicles only
                    query = query.where('status', '==', 'active');
                }
                
                const snapshot = await query.get();
                snapshot.forEach(doc => {
                    vehicles.push({ id: doc.id, ...doc.data() });
                });
            }
            
            // Fallback to localStorage
            if (vehicles.length === 0) {
                vehicles = this.loadAllFromLocalStorage('vehicles')
                    .filter(vehicle => {
                        if (filters.location && vehicle.location !== filters.location) return false;
                        if (filters.businessArea && vehicle.businessArea !== filters.businessArea) return false;
                        if (filters.status && vehicle.status !== filters.status) return false;
                        if (!filters.status && vehicle.status !== 'active') return false;
                        return true;
                    });
            }
            
            return vehicles;
        } catch (error) {
            console.error('Error loading vehicles:', error);
            return this.loadAllFromLocalStorage('vehicles');
        }
    }

    // Compliance Monitoring Methods
    async createComplianceMonitoring(vehicle) {
        try {
            const complianceChecks = [];
            
            // MOT Check
            if (vehicle.motExpiryDate) {
                complianceChecks.push({
                    vehicleId: vehicle.id,
                    type: 'MOT',
                    expiryDate: vehicle.motExpiryDate,
                    reminderDays: [30, 14, 7, 1] // Remind at these intervals
                });
            }
            
            // Tax Check
            if (vehicle.taxExpiryDate) {
                complianceChecks.push({
                    vehicleId: vehicle.id,
                    type: 'Road Tax',
                    expiryDate: vehicle.taxExpiryDate,
                    reminderDays: [30, 14, 7, 1]
                });
            }
            
            // Insurance Check
            if (vehicle.insuranceExpiryDate) {
                complianceChecks.push({
                    vehicleId: vehicle.id,
                    type: 'Insurance',
                    expiryDate: vehicle.insuranceExpiryDate,
                    reminderDays: [60, 30, 14, 7, 1] // Earlier reminder for insurance
                });
            }
            
            // Service Check
            if (vehicle.serviceDate) {
                const nextServiceDate = new Date(vehicle.serviceDate);
                nextServiceDate.setFullYear(nextServiceDate.getFullYear() + 1); // Annual service
                
                complianceChecks.push({
                    vehicleId: vehicle.id,
                    type: 'Annual Service',
                    expiryDate: nextServiceDate.toISOString().split('T')[0],
                    reminderDays: [30, 14, 7]
                });
            }

            // Save compliance monitoring
            for (const check of complianceChecks) {
                const complianceRecord = {
                    id: `compliance_${vehicle.id}_${check.type}_${Date.now()}`,
                    module: this.moduleName,
                    type: 'compliance_monitoring',
                    ...check,
                    createdDate: new Date().toISOString(),
                    status: 'active'
                };

                if (this.db) {
                    await this.saveToFirebase('complianceMonitoring', complianceRecord);
                }
                this.saveToLocalStorage('complianceMonitoring', complianceRecord);
            }

            console.log(`✅ Created ${complianceChecks.length} compliance monitors for vehicle ${vehicle.registration}`);
        } catch (error) {
            console.error('Error creating compliance monitoring:', error);
        }
    }

    async checkComplianceAndCreateMaintenanceRequests(vehicleId) {
        try {
            const vehicle = await this.loadVehicle(vehicleId);
            if (!vehicle) return;

            const complianceChecks = this.loadAllFromLocalStorage('complianceMonitoring')
                .filter(check => check.vehicleId === vehicleId && check.status === 'active');

            const notifications = [];

            for (const check of complianceChecks) {
                const expiryDate = new Date(check.expiryDate);
                const today = new Date();
                const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

                let shouldNotify = false;
                let priority = 'low';
                let title = '';
                let description = '';

                if (daysUntilExpiry < 0) {
                    // Expired - CRITICAL
                    shouldNotify = true;
                    priority = 'critical';
                    title = `EXPIRED: ${check.type} - ${vehicle.make} ${vehicle.model}`;
                    description = `${check.type} expired ${Math.abs(daysUntilExpiry)} days ago for ${vehicle.registration}. Immediate action required.`;
                } else if (check.reminderDays.includes(daysUntilExpiry)) {
                    // Due soon
                    shouldNotify = true;
                    priority = daysUntilExpiry <= 7 ? 'high' : 'medium';
                    title = `${check.type} Due Soon - ${vehicle.make} ${vehicle.model}`;
                    description = `${check.type} expires in ${daysUntilExpiry} days for ${vehicle.registration} (${expiryDate.toLocaleDateString()})`;
                }

                if (shouldNotify) {
                    const maintenanceRequest = {
                        title: title,
                        description: description,
                        priority: priority,
                        category: window.MaintenanceSystem?.config?.categories?.VEHICLE_COMPLIANCE || 'Vehicle Compliance',
                        location: vehicle.location,
                        vehicleId: vehicleId,
                        vehicleDetails: `${vehicle.make} ${vehicle.model} (${vehicle.registration})`,
                        complianceType: check.type,
                        expiryDate: check.expiryDate,
                        daysOverdue: daysUntilExpiry < 0 ? Math.abs(daysUntilExpiry) : 0,
                        daysUntilExpiry: daysUntilExpiry > 0 ? daysUntilExpiry : 0,
                        authenticated_user: window.currentUser ? {
                            name: window.currentUser.name,
                            role: window.currentUser.role,
                            park: window.currentUser.park,
                            accessCode: window.currentUser.accessCode ? window.currentUser.accessCode.substring(0, 3) + '***' : 'unknown'
                        } : null,
                        submission_source: 'automated_compliance_check',
                        submission_timestamp: new Date().toISOString(),
                        autoGenerated: true
                    };

                    // Create maintenance request through integration
                    if (window.MaintenanceSystem && window.MaintenanceSystem.createMaintenanceRequest) {
                        await window.MaintenanceSystem.createMaintenanceRequest(maintenanceRequest);
                    }

                    notifications.push(maintenanceRequest);
                }
            }

            return notifications;
        } catch (error) {
            console.error('Error checking compliance:', error);
            return [];
        }
    }

    // Insurance Document Methods
    async addInsuranceDocument(vehicleId, document) {
        try {
            const vehicle = await this.loadVehicle(vehicleId);
            if (!vehicle) throw new Error('Vehicle not found');

            const insuranceDoc = {
                id: `insurance_${Date.now()}`,
                type: document.type,
                provider: document.provider,
                policyNumber: document.policyNumber,
                expiryDate: document.expiryDate,
                uploadDate: new Date().toISOString(),
                fileName: document.fileName || null
            };

            vehicle.insuranceDocuments = vehicle.insuranceDocuments || [];
            vehicle.insuranceDocuments.push(insuranceDoc);

            await this.updateVehicle(vehicleId, { insuranceDocuments: vehicle.insuranceDocuments });
            
            return insuranceDoc;
        } catch (error) {
            console.error('Error adding insurance document:', error);
            throw error;
        }
    }

    async removeInsuranceDocument(vehicleId, documentId) {
        try {
            const vehicle = await this.loadVehicle(vehicleId);
            if (!vehicle) throw new Error('Vehicle not found');

            vehicle.insuranceDocuments = vehicle.insuranceDocuments || [];
            vehicle.insuranceDocuments = vehicle.insuranceDocuments.filter(doc => doc.id !== documentId);

            await this.updateVehicle(vehicleId, { insuranceDocuments: vehicle.insuranceDocuments });
            
            return true;
        } catch (error) {
            console.error('Error removing insurance document:', error);
            throw error;
        }
    }

    // Authorized Operator Methods
    async addAuthorizedOperator(vehicleId, operator) {
        try {
            const vehicle = await this.loadVehicle(vehicleId);
            if (!vehicle) throw new Error('Vehicle not found');

            const authorizedOperator = {
                id: `operator_${Date.now()}`,
                name: operator.name,
                teamMember: operator.teamMember,
                licenseNumber: operator.licenseNumber,
                licenseType: operator.licenseType,
                licenseExpiry: operator.licenseExpiry,
                trainingCompleted: operator.trainingCompleted || [],
                restrictions: operator.restrictions || '',
                addedDate: new Date().toISOString()
            };

            vehicle.authorizedOperators = vehicle.authorizedOperators || [];
            vehicle.authorizedOperators.push(authorizedOperator);

            await this.updateVehicle(vehicleId, { authorizedOperators: vehicle.authorizedOperators });
            
            return authorizedOperator;
        } catch (error) {
            console.error('Error adding authorized operator:', error);
            throw error;
        }
    }

    async removeAuthorizedOperator(vehicleId, operatorId) {
        try {
            const vehicle = await this.loadVehicle(vehicleId);
            if (!vehicle) throw new Error('Vehicle not found');

            vehicle.authorizedOperators = vehicle.authorizedOperators || [];
            vehicle.authorizedOperators = vehicle.authorizedOperators.filter(op => op.id !== operatorId);

            await this.updateVehicle(vehicleId, { authorizedOperators: vehicle.authorizedOperators });
            
            return true;
        } catch (error) {
            console.error('Error removing authorized operator:', error);
            throw error;
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
    async generateVehicleReport(filters = {}) {
        try {
            const vehicles = await this.loadAllVehicles(filters);
            
            const report = {
                generatedAt: new Date().toISOString(),
                totalVehicles: vehicles.length,
                activeVehicles: vehicles.filter(v => v.status === 'active').length,
                inactiveVehicles: vehicles.filter(v => v.status === 'inactive').length,
                
                // Compliance Statistics
                compliance: {
                    motExpired: vehicles.filter(v => v.motExpiryDate && new Date(v.motExpiryDate) < new Date()).length,
                    taxExpired: vehicles.filter(v => v.taxExpiryDate && new Date(v.taxExpiryDate) < new Date()).length,
                    insuranceExpired: vehicles.filter(v => v.insuranceExpiryDate && new Date(v.insuranceExpiryDate) < new Date()).length
                },
                
                // Vehicle Types
                typeBreakdown: this.generateTypeBreakdown(vehicles),
                
                // Location Breakdown
                locationBreakdown: this.generateLocationBreakdown(vehicles),
                
                vehicles: vehicles
            };

            return report;
        } catch (error) {
            console.error('Error generating vehicle report:', error);
            return { error: error.message };
        }
    }

    generateTypeBreakdown(vehicles) {
        const breakdown = {};
        vehicles.forEach(vehicle => {
            const type = vehicle.vehicleType || 'Unknown';
            breakdown[type] = (breakdown[type] || 0) + 1;
        });
        return breakdown;
    }

    generateLocationBreakdown(vehicles) {
        const breakdown = {};
        vehicles.forEach(vehicle => {
            const location = vehicle.location || 'Unknown';
            breakdown[location] = (breakdown[location] || 0) + 1;
        });
        return breakdown;
    }

    // Bulk Operations
    async bulkComplianceCheck() {
        try {
            const vehicles = await this.loadAllVehicles({ status: 'active' });
            let totalNotifications = 0;

            for (const vehicle of vehicles) {
                const notifications = await this.checkComplianceAndCreateMaintenanceRequests(vehicle.id);
                totalNotifications += notifications.length;
            }

            console.log(`✅ Bulk compliance check completed: ${totalNotifications} notifications created`);
            return totalNotifications;
        } catch (error) {
            console.error('Error in bulk compliance check:', error);
            return 0;
        }
    }
}

// Initialize and expose the Vehicle System
window.VehicleSystem = new VehicleSystem();

// Legacy compatibility functions
window.createVehicleMaintenanceTask = async function(taskData) {
    if (window.MaintenanceSystem && window.MaintenanceSystem.createMaintenanceRequest) {
        return await window.MaintenanceSystem.createMaintenanceRequest(taskData);
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VehicleSystem;
}

console.log('🔄 Vehicle Integration System loaded and ready');
