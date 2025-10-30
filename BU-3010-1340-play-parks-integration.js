/**
 * SafePark.PRO - Play Parks Integration Module
 * Centralized play park safety management across all parks
 * Version: 1.0
 * Date: January 2025
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const PLAY_PARKS_CONFIG = {
    collection: 'playParkRecords',
    equipmentCollection: 'playParkEquipment',
    inspectionsCollection: 'playParkInspections',
    authDuration: 60 * 60 * 1000, // 60 minutes
    inspectionTypes: {
        DAILY: 'daily',
        WEEKLY: 'weekly',
        MONTHLY: 'monthly',
        ANNUAL: 'annual',
        POST_INCIDENT: 'post-incident'
    },
    riskLevels: {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        CRITICAL: 'critical'
    },
    statuses: {
        PENDING: 'pending',
        IN_PROGRESS: 'in-progress',
        COMPLETED: 'completed',
        OVERDUE: 'overdue',
        CANCELLED: 'cancelled'
    },
    equipmentTypes: {
        SWINGS: 'Swings',
        SLIDES: 'Slides',
        CLIMBING: 'Climbing Equipment',
        MULTIPLAY: 'Multi-Play Units',
        SPRINGERS: 'Spring Riders',
        ROUNDABOUTS: 'Roundabouts',
        SEESAWS: 'See-Saws',
        SURFACE: 'Safety Surface',
        FENCING: 'Fencing/Gates',
        SIGNAGE: 'Signage',
        BENCHES: 'Seating/Benches',
        BINS: 'Waste Bins',
        OTHER: 'Other Equipment'
    },
    safetyStandards: {
        EN1176: 'EN 1176 - Playground Equipment',
        EN1177: 'EN 1177 - Impact Absorbing Surfaces',
        BS5696: 'BS 5696 - Play Area Surfacing'
    },
    ageGroups: {
        TODDLER: 'Toddler (18 months - 3 years)',
        INFANT: 'Infant (3 - 8 years)',
        JUNIOR: 'Junior (8 - 14 years)',
        MIXED: 'Mixed Age Groups'
    },
    defaultParks: {
        'Ben Nevis Holiday Park': {
            playAreas: [
                { 
                    id: 'BN-PA-001', 
                    name: 'Main Adventure Playground', 
                    ageGroup: 'Mixed Age Groups',
                    surfaceType: 'Wet Pour Rubber',
                    lastInspection: null
                },
                { 
                    id: 'BN-PA-002', 
                    name: 'Toddler Play Area', 
                    ageGroup: 'Toddler (18 months - 3 years)',
                    surfaceType: 'Rubber Mulch',
                    lastInspection: null
                }
            ]
        },
        'Oban Holiday Park': {
            playAreas: [
                { 
                    id: 'OB-PA-001', 
                    name: 'Central Play Park', 
                    ageGroup: 'Mixed Age Groups',
                    surfaceType: 'Wet Pour Rubber',
                    lastInspection: null
                }
            ]
        },
        'Tyndrum Holiday Park': {
            playAreas: [
                { 
                    id: 'TY-PA-001', 
                    name: 'Forest Adventure Area', 
                    ageGroup: 'Junior (8 - 14 years)',
                    surfaceType: 'Bark Mulch',
                    lastInspection: null
                }
            ]
        },
        'Overburns Farm': {
            playAreas: [
                { 
                    id: 'OF-PA-001', 
                    name: 'Farm Play Area', 
                    ageGroup: 'Infant (3 - 8 years)',
                    surfaceType: 'Grass',
                    lastInspection: null
                }
            ]
        }
    }
};

// ============================================================================
// AUTHENTICATION & USER MANAGEMENT
// ============================================================================

/**
 * Get current authenticated user from localStorage
 * @returns {Object|null} User object or null if not authenticated
 */
function getCurrentUser() {
    try {
        const authData = JSON.parse(localStorage.getItem('safePark_auth'));
        
        if (!authData || !authData.user) {
            console.warn('No authenticated user found');
            return null;
        }

        // Check if auth is still valid
        const now = Date.now();
        if (now - authData.timestamp > PLAY_PARKS_CONFIG.authDuration) {
            console.warn('Authentication expired');
            localStorage.removeItem('safePark_auth');
            return null;
        }

        return authData.user;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
    return getCurrentUser() !== null;
}

/**
 * Redirect to login if not authenticated
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ============================================================================
// PLAY AREA EQUIPMENT MANAGEMENT
// ============================================================================

/**
 * Register a new play area in the system
 * @param {Object} playAreaData - The play area data
 * @param {string} playAreaData.id - Unique play area ID
 * @param {string} playAreaData.name - Play area name
 * @param {string} playAreaData.park - Holiday park name
 * @param {string} playAreaData.ageGroup - Target age group
 * @param {string} playAreaData.surfaceType - Safety surface type
 * @param {string} [playAreaData.location] - Specific location within park
 * @param {Array} [playAreaData.equipment] - List of equipment
 * @returns {Promise<Object>} The registered play area record
 */
async function registerPlayArea(playAreaData) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('User must be authenticated to register play areas');
    }

    // Validate required fields
    if (!playAreaData.id || !playAreaData.name || !playAreaData.park) {
        throw new Error('ID, name, and park are required');
    }

    // Build play area record
    const playAreaRecord = {
        // Required fields
        id: playAreaData.id,
        name: playAreaData.name,
        park: playAreaData.park,
        ageGroup: playAreaData.ageGroup || PLAY_PARKS_CONFIG.ageGroups.MIXED,
        surfaceType: playAreaData.surfaceType || 'Unknown',
        
        // Optional fields
        location: playAreaData.location || 'Main area',
        equipment: playAreaData.equipment || [],
        
        // Registration info
        registeredBy: currentUser.name,
        registeredByRole: currentUser.role,
        registeredAt: new Date().toISOString(),
        
        // Status tracking
        isActive: true,
        lastInspection: null,
        lastMaintenance: null,
        
        // Compliance tracking
        dailyChecksEnabled: true,
        weeklyChecksEnabled: true,
        monthlyChecksEnabled: true,
        annualChecksEnabled: true,
        
        // Safety standards
        complianceStandards: [
            PLAY_PARKS_CONFIG.safetyStandards.EN1176,
            PLAY_PARKS_CONFIG.safetyStandards.EN1177
        ],
        
        // Update tracking
        lastUpdated: new Date().toISOString(),
        updateHistory: []
    };

    try {
        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.error('Firebase not initialized');
            throw new Error('Database connection not available');
        }

        // Add to Firebase
        const docRef = await firebase.firestore()
            .collection(PLAY_PARKS_CONFIG.equipmentCollection)
            .doc(playAreaData.id)
            .set(playAreaRecord);

        console.log('Play area registered:', playAreaData.id);

        // Also update local sites data for immediate UI response
        updateLocalSitesData(playAreaData.park, playAreaRecord);

        return playAreaRecord;

    } catch (error) {
        console.error('Error registering play area:', error);
        
        // Fallback: Save to localStorage if Firebase fails
        try {
            const localEquipment = JSON.parse(localStorage.getItem('playPark_equipment_backup') || '{}');
            localEquipment[playAreaData.id] = {
                ...playAreaRecord,
                _isLocal: true
            };
            localStorage.setItem('playPark_equipment_backup', JSON.stringify(localEquipment));
            console.log('Saved to local backup storage');
            
            // Update local sites data
            updateLocalSitesData(playAreaData.park, playAreaRecord);
            
            return playAreaRecord;
        } catch (localError) {
            console.error('Failed to save to local backup:', localError);
        }

        throw error;
    }
}

/**
 * Get all play areas for a specific park
 * @param {string} parkName - Name of the holiday park
 * @returns {Promise<Array>} Array of play area records
 */
async function getPlayAreasForPark(parkName) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase not initialized');
        }

        const snapshot = await firebase.firestore()
            .collection(PLAY_PARKS_CONFIG.equipmentCollection)
            .where('park', '==', parkName)
            .where('isActive', '==', true)
            .get();

        const playAreas = [];
        snapshot.forEach(doc => {
            playAreas.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return playAreas;

    } catch (error) {
        console.error('Error loading play areas for park:', error);
        
        // Fallback to local data
        try {
            const localEquipment = JSON.parse(localStorage.getItem('playPark_equipment_backup') || '{}');
            return Object.values(localEquipment).filter(area => 
                area.park === parkName && area.isActive
            );
        } catch (localError) {
            console.error('Error loading local backup:', localError);
            return [];
        }
    }
}

/**
 * Update local sites data structure used by the HTML
 * @param {string} parkName - Park name
 * @param {Object} playAreaRecord - Play area record to add
 */
function updateLocalSitesData(parkName, playAreaRecord) {
    try {
        // Get existing sites data
        const sitesData = JSON.parse(localStorage.getItem('safePark_playParksData') || '{}');
        
        // Initialize park if it doesn't exist
        if (!sitesData[parkName]) {
            sitesData[parkName] = { playAreas: [] };
        }
        
        // Add or update play area
        const existingIndex = sitesData[parkName].playAreas.findIndex(area => area.id === playAreaRecord.id);
        if (existingIndex >= 0) {
            sitesData[parkName].playAreas[existingIndex] = playAreaRecord;
        } else {
            sitesData[parkName].playAreas.push(playAreaRecord);
        }
        
        // Save back to localStorage
        localStorage.setItem('safePark_playParksData', JSON.stringify(sitesData));
        
        console.log('Local sites data updated for:', parkName);
    } catch (error) {
        console.error('Error updating local sites data:', error);
    }
}

// ============================================================================
// PLAY PARK INSPECTIONS
// ============================================================================

/**
 * Create a play park inspection record
 * @param {Object} inspectionData - The inspection data
 * @param {string} inspectionData.playAreaId - Play area ID
 * @param {string} inspectionData.park - Holiday park name
 * @param {string} inspectionData.inspectionType - Type of inspection
 * @param {Object} inspectionData.checklist - Inspection checklist results
 * @param {string} [inspectionData.inspector] - Inspector name
 * @param {Array} [inspectionData.issues] - Array of issues identified
 * @param {string} [inspectionData.notes] - Additional notes
 * @param {Array} [inspectionData.photos] - Array of photo URLs
 * @returns {Promise<Object>} The created inspection record
 */
async function createPlayParkInspection(inspectionData) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('User must be authenticated to create play park inspections');
    }

    // Validate required fields
    if (!inspectionData.playAreaId || !inspectionData.park || !inspectionData.inspectionType) {
        throw new Error('Play area ID, park, and inspection type are required');
    }

    // Build inspection record
    const inspectionRecord = {
        // Required fields
        playAreaId: inspectionData.playAreaId,
        park: inspectionData.park,
        inspectionType: inspectionData.inspectionType,
        
        // Inspection data
        checklist: inspectionData.checklist || {},
        issues: inspectionData.issues || [],
        notes: inspectionData.notes || '',
        photos: inspectionData.photos || [],
        
        // User/Park info from authentication
        inspector: inspectionData.inspector || currentUser.name,
        inspectorRole: currentUser.role,
        
        // Timing
        inspectionDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        inspectionTime: new Date().toTimeString().split(' ')[0], // HH:MM:SS
        timestamp: new Date().toISOString(),
        
        // Risk assessment
        overallRiskLevel: calculateOverallRisk(inspectionData.issues || []),
        
        // Status
        status: inspectionData.issues && inspectionData.issues.length > 0 ? 
                PLAY_PARKS_CONFIG.statuses.PENDING : 
                PLAY_PARKS_CONFIG.statuses.COMPLETED,
        
        // Weather conditions
        weatherConditions: inspectionData.weatherConditions || 'Not recorded',
        
        // Metadata
        source: 'web_interface',
        version: '1.0'
    };

    try {
        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.error('Firebase not initialized');
            throw new Error('Database connection not available');
        }

        // Add to Firebase
        const docRef = await firebase.firestore()
            .collection(PLAY_PARKS_CONFIG.inspectionsCollection)
            .add(inspectionRecord);

        console.log('Play park inspection created:', docRef.id);

        // If there are issues, create maintenance requests
        if (inspectionData.issues && inspectionData.issues.length > 0) {
            await createMaintenanceRequestsFromIssues(inspectionData, inspectionRecord);
        }

        // Update equipment last inspection date
        await updatePlayAreaLastInspection(inspectionData.playAreaId);

        return {
            id: docRef.id,
            ...inspectionRecord
        };

    } catch (error) {
        console.error('Error creating play park inspection:', error);
        
        // Fallback: Save to localStorage if Firebase fails
        try {
            const localInspections = JSON.parse(localStorage.getItem('playPark_inspections_backup') || '[]');
            const recordWithId = {
                id: 'local_' + Date.now(),
                ...inspectionRecord,
                _isLocal: true
            };
            localInspections.push(recordWithId);
            localStorage.setItem('playPark_inspections_backup', JSON.stringify(localInspections));
            console.log('Saved to local backup storage');
            return recordWithId;
        } catch (localError) {
            console.error('Failed to save to local backup:', localError);
        }

        throw error;
    }
}

/**
 * Calculate overall risk level from issues
 * @param {Array} issues - Array of issues
 * @returns {string} Overall risk level
 */
function calculateOverallRisk(issues) {
    if (!issues || issues.length === 0) return PLAY_PARKS_CONFIG.riskLevels.LOW;
    
    const riskLevels = issues.map(issue => issue.riskLevel || issue.priority);
    
    if (riskLevels.includes('critical')) return PLAY_PARKS_CONFIG.riskLevels.CRITICAL;
    if (riskLevels.includes('high')) return PLAY_PARKS_CONFIG.riskLevels.HIGH;
    if (riskLevels.includes('medium')) return PLAY_PARKS_CONFIG.riskLevels.MEDIUM;
    return PLAY_PARKS_CONFIG.riskLevels.LOW;
}

/**
 * Create maintenance requests from identified issues
 * @param {Object} inspectionData - Original inspection data
 * @param {Object} inspectionRecord - Created inspection record
 */
async function createMaintenanceRequestsFromIssues(inspectionData, inspectionRecord) {
    if (!window.MaintenanceSystem || !window.MaintenanceSystem.createMaintenanceRequest) {
        console.warn('Maintenance system not available for issue tracking');
        return;
    }

    try {
        for (const issue of inspectionData.issues) {
            await window.MaintenanceSystem.createMaintenanceRequest({
                title: `Play Park ${inspectionData.playAreaId}: ${issue.equipment || 'Safety Issue'}`,
                description: `Issue identified during ${inspectionData.inspectionType} inspection: ${issue.description || issue.title}. Location: ${inspectionData.park}`,
                priority: issue.riskLevel || issue.priority || PLAY_PARKS_CONFIG.riskLevels.MEDIUM,
                category: window.MaintenanceSystem.config.categories.PLAY_PARKS || 'Play Parks',
                location: `${inspectionData.park} - ${inspectionData.playAreaId}`,
                dueDate: issue.urgent ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null // 24 hours if urgent
            });
        }
        console.log('Maintenance requests created for issues');
    } catch (error) {
        console.error('Error creating maintenance requests from issues:', error);
    }
}

/**
 * Update play area last inspection date
 * @param {string} playAreaId - Play area ID
 */
async function updatePlayAreaLastInspection(playAreaId) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            return; // Skip if Firebase not available
        }

        await firebase.firestore()
            .collection(PLAY_PARKS_CONFIG.equipmentCollection)
            .doc(playAreaId)
            .update({
                lastInspection: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            });

        console.log('Play area last inspection updated:', playAreaId);
    } catch (error) {
        console.error('Error updating play area last inspection:', error);
    }
}

// ============================================================================
// PLAY PARK DATA QUERIES
// ============================================================================

/**
 * Get play park inspections with optional filters
 * @param {Object} filters - Optional filters
 * @param {string} [filters.park] - Filter by park
 * @param {string} [filters.playAreaId] - Filter by play area ID
 * @param {string} [filters.inspectionType] - Filter by inspection type
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.dateFrom] - Filter from date (YYYY-MM-DD)
 * @param {string} [filters.dateTo] - Filter to date (YYYY-MM-DD)
 * @param {number} [filters.limit] - Limit number of results
 * @returns {Promise<Array>} Array of inspection records
 */
async function getPlayParkInspections(filters = {}) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase not initialized');
        }

        let query = firebase.firestore().collection(PLAY_PARKS_CONFIG.inspectionsCollection);

        // Apply filters
        if (filters.park) {
            query = query.where('park', '==', filters.park);
        }
        if (filters.playAreaId) {
            query = query.where('playAreaId', '==', filters.playAreaId);
        }
        if (filters.inspectionType) {
            query = query.where('inspectionType', '==', filters.inspectionType);
        }
        if (filters.status) {
            query = query.where('status', '==', filters.status);
        }
        if (filters.dateFrom) {
            query = query.where('inspectionDate', '>=', filters.dateFrom);
        }
        if (filters.dateTo) {
            query = query.where('inspectionDate', '<=', filters.dateTo);
        }

        // Order by timestamp (newest first)
        query = query.orderBy('timestamp', 'desc');

        // Apply limit
        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const snapshot = await query.get();
        const inspections = [];

        snapshot.forEach(doc => {
            inspections.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return inspections;

    } catch (error) {
        console.error('Error loading play park inspections:', error);
        
        // Fallback to local data
        try {
            const localInspections = JSON.parse(localStorage.getItem('playPark_inspections_backup') || '[]');
            
            // Apply basic filtering to local data
            return localInspections.filter(inspection => {
                if (filters.park && inspection.park !== filters.park) return false;
                if (filters.playAreaId && inspection.playAreaId !== filters.playAreaId) return false;
                if (filters.inspectionType && inspection.inspectionType !== filters.inspectionType) return false;
                if (filters.status && inspection.status !== filters.status) return false;
                return true;
            }).slice(0, filters.limit || 50);
        } catch (localError) {
            console.error('Error loading local backup inspections:', localError);
            return [];
        }
    }
}

/**
 * Get play park statistics for dashboard
 * @param {string} [parkName] - Optional: Filter by specific park
 * @returns {Promise<Object>} Statistics object
 */
async function getPlayParkStats(parkName = null) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const filters = { inspectionDate: today };
        if (parkName) filters.park = parkName;

        const todayInspections = await getPlayParkInspections(filters);
        
        // Get total play areas count
        const allPlayAreas = parkName ? 
            await getPlayAreasForPark(parkName) : 
            await getAllPlayAreas();

        const stats = {
            totalPlayAreas: allPlayAreas.length,
            inspectionsToday: todayInspections.length,
            dailyInspections: todayInspections.filter(i => i.inspectionType === PLAY_PARKS_CONFIG.inspectionTypes.DAILY).length,
            weeklyInspections: todayInspections.filter(i => i.inspectionType === PLAY_PARKS_CONFIG.inspectionTypes.WEEKLY).length,
            issuesIdentified: todayInspections.reduce((sum, inspection) => sum + (inspection.issues ? inspection.issues.length : 0), 0),
            pendingIssues: todayInspections.filter(i => i.status === PLAY_PARKS_CONFIG.statuses.PENDING).length,
            criticalIssues: todayInspections.reduce((sum, inspection) => {
                if (!inspection.issues) return sum;
                return sum + inspection.issues.filter(issue => 
                    issue.riskLevel === 'critical' || issue.priority === 'critical'
                ).length;
            }, 0)
        };

        return stats;

    } catch (error) {
        console.error('Error getting play park stats:', error);
        return {
            totalPlayAreas: 0,
            inspectionsToday: 0,
            dailyInspections: 0,
            weeklyInspections: 0,
            issuesIdentified: 0,
            pendingIssues: 0,
            criticalIssues: 0
        };
    }
}

/**
 * Get all play areas across all parks
 * @returns {Promise<Array>} Array of all play area records
 */
async function getAllPlayAreas() {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase not initialized');
        }

        const snapshot = await firebase.firestore()
            .collection(PLAY_PARKS_CONFIG.equipmentCollection)
            .where('isActive', '==', true)
            .get();

        const playAreas = [];
        snapshot.forEach(doc => {
            playAreas.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return playAreas;

    } catch (error) {
        console.error('Error loading all play areas:', error);
        
        // Fallback to local data
        try {
            const localEquipment = JSON.parse(localStorage.getItem('playPark_equipment_backup') || '{}');
            return Object.values(localEquipment).filter(area => area.isActive);
        } catch (localError) {
            console.error('Error loading local backup:', localError);
            return [];
        }
    }
}

// ============================================================================
// INITIALIZATION & SETUP
// ============================================================================

/**
 * Initialize default play areas for parks if not exists
 */
async function initializeDefaultPlayAreas() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        for (const [parkName, parkData] of Object.entries(PLAY_PARKS_CONFIG.defaultParks)) {
            const existingPlayAreas = await getPlayAreasForPark(parkName);
            
            if (existingPlayAreas.length === 0) {
                console.log(`Initializing default play areas for ${parkName}`);
                
                for (const playArea of parkData.playAreas) {
                    await registerPlayArea({
                        ...playArea,
                        park: parkName,
                        location: 'Main area'
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error initializing default play areas:', error);
    }
}

// ============================================================================
// REAL-TIME UPDATES FOR DASHBOARD
// ============================================================================

/**
 * Set up real-time listener for play park statistics
 * @param {Function} callback - Function to call when data changes
 * @param {string} [parkName] - Optional: Filter by specific park
 * @returns {Function} Unsubscribe function
 */
function listenToPlayParkStats(callback, parkName = null) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.error('Firebase not initialized');
            return () => {};
        }

        let query = firebase.firestore()
            .collection(PLAY_PARKS_CONFIG.inspectionsCollection);

        if (parkName) {
            query = query.where('park', '==', parkName);
        }

        const today = new Date().toISOString().split('T')[0];
        query = query.where('inspectionDate', '==', today);

        const unsubscribe = query.onSnapshot(snapshot => {
            const stats = {
                inspectionsToday: snapshot.size,
                dailyInspections: 0,
                weeklyInspections: 0,
                issues: 0,
                pending: 0,
                critical: 0
            };

            snapshot.forEach(doc => {
                const data = doc.data();
                
                if (data.inspectionType === PLAY_PARKS_CONFIG.inspectionTypes.DAILY) stats.dailyInspections++;
                if (data.inspectionType === PLAY_PARKS_CONFIG.inspectionTypes.WEEKLY) stats.weeklyInspections++;
                if (data.issues && data.issues.length > 0) stats.issues += data.issues.length;
                if (data.status === PLAY_PARKS_CONFIG.statuses.PENDING) stats.pending++;
                if (data.overallRiskLevel === 'critical') stats.critical++;
            });

            callback(stats);
        }, error => {
            console.error('Error in real-time listener:', error);
        });

        return unsubscribe;

    } catch (error) {
        console.error('Error setting up listener:', error);
        return () => {};
    }
}

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

/**
 * Get inspection type badge HTML
 * @param {string} inspectionType - Inspection type
 * @returns {string} HTML for inspection type badge
 */
function getInspectionTypeBadgeHTML(inspectionType) {
    const colors = {
        daily: '#17A2B8',
        weekly: '#28A745',
        monthly: '#FFC107',
        annual: '#DC3545',
        'post-incident': '#6C757D'
    };

    const color = colors[inspectionType] || colors.daily;
    
    return `<span style="
        background: ${color};
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
    ">${inspectionType.replace('-', ' ')}</span>`;
}

/**
 * Get risk level badge HTML
 * @param {string} riskLevel - Risk level
 * @returns {string} HTML for risk level badge
 */
function getRiskLevelBadgeHTML(riskLevel) {
    const colors = {
        low: '#28A745',
        medium: '#FFC107',
        high: '#FF6347',
        critical: '#DC3545'
    };

    const color = colors[riskLevel] || colors.medium;
    
    return `<span style="
        background: ${color};
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
    ">${riskLevel}</span>`;
}

/**
 * Get status badge HTML
 * @param {string} status - Status
 * @returns {string} HTML for status badge
 */
function getStatusBadgeHTML(status) {
    const colors = {
        pending: '#FFC107',
        'in-progress': '#17A2B8',
        completed: '#28A745',
        overdue: '#DC3545',
        cancelled: '#6C757D'
    };

    const color = colors[status] || colors.pending;
    
    return `<span style="
        background: ${color};
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
    ">${status.replace('-', ' ').toUpperCase()}</span>`;
}

/**
 * Format date for display
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(isoDate) {
    if (!isoDate) return 'Not set';
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make functions globally available
window.PlayParksSystem = {
    // Configuration
    config: PLAY_PARKS_CONFIG,
    
    // Auth functions
    getCurrentUser,
    isAuthenticated,
    requireAuth,
    
    // Equipment management
    registerPlayArea,
    getPlayAreasForPark,
    getAllPlayAreas,
    updateLocalSitesData,
    
    // Inspection management
    createPlayParkInspection,
    getPlayParkInspections,
    
    // Statistics
    getPlayParkStats,
    
    // Real-time updates
    listenToPlayParkStats,
    
    // Initialization
    initializeDefaultPlayAreas,
    
    // Initialize method for compatibility
    initialize: async function() {
        console.log('🚀 Initializing Play Parks System...');
        try {
            // Check authentication
            if (!isAuthenticated()) {
                console.log('⚠️ User not authenticated, skipping Firebase initialization');
                return;
            }
            
            // Initialize default play areas if needed
            await initializeDefaultPlayAreas();
            
            // Set up real-time listeners if on dashboard
            if (document.getElementById('dashboard')) {
                console.log('📊 Setting up real-time dashboard updates...');
                const unsubscribe = listenToPlayParkStats((stats) => {
                    // Update dashboard stats in real-time
                    if (document.getElementById('inspectionsToday')) {
                        document.getElementById('inspectionsToday').textContent = stats.inspectionsToday || 0;
                    }
                    if (document.getElementById('dailyInspections')) {
                        document.getElementById('dailyInspections').textContent = stats.dailyInspections || 0;
                    }
                    if (document.getElementById('weeklyInspections')) {
                        document.getElementById('weeklyInspections').textContent = stats.weeklyInspections || 0;
                    }
                    if (document.getElementById('issuesIdentified')) {
                        document.getElementById('issuesIdentified').textContent = stats.issues || 0;
                    }
                    if (document.getElementById('criticalIssues')) {
                        document.getElementById('criticalIssues').textContent = stats.critical || 0;
                    }
                });
                
                // Store unsubscribe function for cleanup
                window.playParksUnsubscribe = unsubscribe;
            }
            
            console.log('✅ Play Parks System initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing Play Parks System:', error);
        }
    },
    
    // UI helpers
    getInspectionTypeBadgeHTML,
    getRiskLevelBadgeHTML,
    getStatusBadgeHTML,
    formatDate,
    calculateOverallRisk
};

console.log('✅ Play Parks Integration Module Loaded');
console.log('Access via: window.PlayParksSystem');
