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
    inspectionsCollection: 'daily_inspections', // Updated to match our system
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
        VERY_HIGH: 'very-high',
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
    // Comprehensive 8-point inspection checklist
    inspectionChecklist: {
        VISUAL_INSPECTION: 'visualInspection',
        SURFACE_CHECK: 'surfaceCheck',
        EQUIPMENT_CHECK: 'equipmentCheck',
        FENCING_CHECK: 'fencingCheck',
        GATE_CHECK: 'gateCheck',
        SIGNAGE_CHECK: 'signageCheck',
        HAZARD_CHECK: 'hazardCheck',
        ACCESS_CHECK: 'accessCheck'
    },
    // Safety infrastructure requirements
    safetyInfrastructure: {
        PERIMETER_FENCING: 'perimeter_fencing',
        SECURITY_GATES: 'security_gates',
        SAFETY_SIGNAGE: 'safety_signage',
        EMERGENCY_SIGNAGE: 'emergency_signage',
        COMPLIANCE_SIGNAGE: 'compliance_signage',
        SECURITY_LIGHTING: 'lighting',
        CCTV_MONITORING: 'cctv'
    },
    // Access control system - Highland Holidays specific
    accessCodes: {
        OBAN: { pattern: '1020', park: 'Oban Holiday Park' },
        TYNDRUM: { pattern: '1030', park: 'Tyndrum Holiday Park' },
        BEN_NEVIS: { pattern: '1010', park: 'Ben Nevis Holiday Park' },
        ADMIN: { code: 'CQR365SPP25', access: 'all' }
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
                    id: 'Play Park 2', 
                    name: 'Ben Nevis Holiday Park', 
                    ageGroup: 'Mixed Age Groups',
                    surfaceType: 'Pour-in-place rubber',
                    installDate: '2023-01-01',
                    equipmentType: 'full',
                    lastInspection: null,
                    safetyInfrastructure: ['perimeter_fencing', 'security_gates', 'safety_signage', 'emergency_signage', 'compliance_signage']
                }
            ]
        },
        'Oban Holiday Park': {
            playAreas: [
                { 
                    id: 'Play Park 1', 
                    name: 'Oban Holiday Park', 
                    ageGroup: 'Mixed Age Groups',
                    surfaceType: 'Pour-in-place rubber',
                    installDate: '2024-01-01',
                    equipmentType: 'full',
                    lastInspection: null,
                    safetyInfrastructure: ['perimeter_fencing', 'security_gates', 'safety_signage', 'emergency_signage', 'compliance_signage']
                }
            ]
        },
        'Tyndrum Holiday Park': {
            playAreas: [
                { 
                    id: 'Play Park 3', 
                    name: 'Tyndrum Holiday Park', 
                    ageGroup: 'Under 13 only',
                    surfaceType: 'Bark chip + rubber',
                    installDate: '2015-01-01',
                    equipmentType: 'limited',
                    lastInspection: null,
                    safetyInfrastructure: ['perimeter_fencing', 'security_gates', 'safety_signage', 'emergency_signage', 'compliance_signage']
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
// HIGHLAND HOLIDAYS ACCESS CONTROL SYSTEM
// ============================================================================

/**
 * Get user access level based on access code
 * @param {string} accessCode - User's access code
 * @returns {Object|null} Access information or null if invalid
 */
function getUserAccessLevel(accessCode) {
    if (!accessCode) return null;
    
    // Admin access
    if (accessCode === PLAY_PARKS_CONFIG.accessCodes.ADMIN.code) {
        return {
            level: 'admin',
            description: 'Administrator',
            parks: ['Oban Holiday Park', 'Ben Nevis Holiday Park', 'Tyndrum Holiday Park'],
            accessibleParks: ['Oban Holiday Park', 'Ben Nevis Holiday Park', 'Tyndrum Holiday Park'],
            canModifyAll: true
        };
    }
    
    // Park-specific access codes
    const codePrefix = accessCode.substring(0, 4);
    
    if (codePrefix === PLAY_PARKS_CONFIG.accessCodes.OBAN.pattern) {
        return {
            level: 'park-manager',
            description: 'Oban Holiday Park Manager',
            parks: ['Oban Holiday Park'],
            accessibleParks: ['Oban Holiday Park'],
            canModifyAll: false
        };
    }
    
    if (codePrefix === PLAY_PARKS_CONFIG.accessCodes.TYNDRUM.pattern) {
        return {
            level: 'park-manager', 
            description: 'Tyndrum Holiday Park Manager',
            parks: ['Tyndrum Holiday Park'],
            accessibleParks: ['Tyndrum Holiday Park'],
            canModifyAll: false
        };
    }
    
    if (codePrefix === PLAY_PARKS_CONFIG.accessCodes.BEN_NEVIS.pattern) {
        return {
            level: 'park-manager',
            description: 'Ben Nevis Holiday Park Manager', 
            parks: ['Ben Nevis Holiday Park'],
            accessibleParks: ['Ben Nevis Holiday Park'],
            canModifyAll: false
        };
    }
    
    return null; // Invalid access code
}

/**
 * Check if user has access to specific park
 * @param {string} parkName - Name of the park
 * @param {string} accessCode - User's access code
 * @returns {boolean} True if user has access
 */
function hasAccessToPark(parkName, accessCode) {
    const accessLevel = getUserAccessLevel(accessCode);
    return accessLevel && accessLevel.accessibleParks.includes(parkName);
}

/**
 * Get current user access from localStorage (compatible with our system)
 * @returns {Object|null} Current user access information
 */
function getCurrentUserAccess() {
    try {
        const authData = JSON.parse(localStorage.getItem('safePark_auth'));
        if (!authData || !authData.user) return null;
        
        const userAccess = getUserAccessLevel(authData.user.accessCode);
        if (userAccess) {
            userAccess.user = authData.user;
            userAccess.accessCode = authData.user.accessCode;
        }
        
        return userAccess;
    } catch (error) {
        console.error('Error getting current user access:', error);
        return null;
    }
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
 * Create a new play park inspection with comprehensive 8-point checklist
 * @param {Object} inspectionData - The inspection data
 * @param {string} inspectionData.parkName - Park name
 * @param {string} inspectionData.date - Inspection date (YYYY-MM-DD)
 * @param {string} inspectionData.inspector - Inspector name
 * @param {Object} inspectionData.checklist - 8-point checklist results
 * @param {string} [inspectionData.weather] - Weather conditions
 * @param {string} [inspectionData.notes] - Additional notes
 * @param {string} [inspectionData.issues] - Issues identified
 * @returns {Promise<Object>} The created inspection record
 */
async function createPlayParkInspection(inspectionData) {
    const currentUser = getCurrentUser();
    const userAccess = getCurrentUserAccess();
    
    if (!currentUser || !userAccess) {
        throw new Error('User must be authenticated to create inspections');
    }
    
    // Check access to this park
    if (!hasAccessToPark(inspectionData.parkName, userAccess.accessCode)) {
        throw new Error(`Access denied: Cannot create inspection for ${inspectionData.parkName}`);
    }

    // Validate required fields
    if (!inspectionData.parkName || !inspectionData.date) {
        throw new Error('Park name and date are required');
    }

    // Validate 8-point checklist
    const requiredChecks = Object.values(PLAY_PARKS_CONFIG.inspectionChecklist);
    const providedChecks = inspectionData.checklist || {};
    
    for (const checkKey of requiredChecks) {
        if (typeof providedChecks[checkKey] !== 'boolean') {
            throw new Error(`Missing or invalid checklist item: ${checkKey}`);
        }
    }

    // Use our system's document key structure: inspection_{parkName}_{date}
    const documentKey = `inspection_${inspectionData.parkName}_${inspectionData.date}`;
    
    // Build comprehensive inspection record
    const inspectionRecord = {
        // Basic information
        parkName: inspectionData.parkName,
        date: inspectionData.date,
        timestamp: inspectionData.timestamp || new Date().toISOString(),
        inspector: inspectionData.inspector || currentUser.name,
        completed: true,
        
        // Comprehensive 8-point checklist
        checklist: {
            visualInspection: providedChecks.visualInspection || false,
            surfaceCheck: providedChecks.surfaceCheck || false,
            equipmentCheck: providedChecks.equipmentCheck || false,
            fencingCheck: providedChecks.fencingCheck || false,
            gateCheck: providedChecks.gateCheck || false,
            signageCheck: providedChecks.signageCheck || false,
            hazardCheck: providedChecks.hazardCheck || false,
            accessCheck: providedChecks.accessCheck || false
        },
        
        // Additional information
        weather: inspectionData.weather || 'Fair',
        notes: inspectionData.notes || '',
        issues: inspectionData.issues || 'None reported',
        
        // Risk assessment
        overallRiskLevel: calculateInspectionRisk(providedChecks, inspectionData.issues),
        
        // Compliance tracking
        inspectionType: PLAY_PARKS_CONFIG.inspectionTypes.DAILY,
        status: PLAY_PARKS_CONFIG.statuses.COMPLETED,
        
        // User tracking
        createdBy: currentUser.name,
        createdByRole: currentUser.role || userAccess.description,
        accessLevel: userAccess.level,
        
        // Update tracking
        lastUpdated: new Date().toISOString()
    };

    try {
        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.error('Firebase not initialized');
            throw new Error('Database connection not available');
        }

        // Save to Firebase with our document key structure
        await firebase.firestore()
            .collection(PLAY_PARKS_CONFIG.inspectionsCollection)
            .doc(documentKey)
            .set(inspectionRecord);

        console.log('Play park inspection created:', documentKey);

        // Also save to localStorage as backup (compatible with our system)
        localStorage.setItem(documentKey, JSON.stringify(inspectionRecord));

        return inspectionRecord;

    } catch (error) {
        console.error('Error creating inspection:', error);
        
        // Fallback to localStorage if Firebase fails
        localStorage.setItem(documentKey, JSON.stringify(inspectionRecord));
        console.log('Inspection saved to localStorage as fallback');
        
        throw error;
    }
}

/**
 * Calculate overall risk level based on inspection results
 * @param {Object} checklist - Checklist results
 * @param {string} issues - Issues reported
 * @returns {string} Risk level
 */
function calculateInspectionRisk(checklist, issues) {
    const failedChecks = Object.values(checklist).filter(check => !check).length;
    const hasIssues = issues && issues !== 'None reported' && issues.trim().length > 0;
    const hasCriticalIssues = issues && issues.toUpperCase().includes('MAINTENANCE REQUIRED');
    
    if (hasCriticalIssues || failedChecks >= 4) {
        return PLAY_PARKS_CONFIG.riskLevels.CRITICAL;
    } else if (failedChecks >= 2 || hasIssues) {
        return PLAY_PARKS_CONFIG.riskLevels.HIGH;
    } else if (failedChecks === 1) {
        return PLAY_PARKS_CONFIG.riskLevels.MEDIUM;
    } else {
        return PLAY_PARKS_CONFIG.riskLevels.LOW;
    }
}

/**
 * Calculate overall risk level from issues (legacy compatibility)
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
 * Set up real-time listener for play park statistics (Compatible with our system)
 * @param {Function} callback - Function to call when data changes
 * @param {string} [parkName] - Optional: Filter by specific park
 * @returns {Function} Unsubscribe function
 */
function listenToPlayParkStats(callback, parkName = null) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.error('Firebase not initialized');
            // Fallback to localStorage monitoring
            return listenToLocalStorageStats(callback, parkName);
        }

        const today = new Date().toISOString().split('T')[0];
        
        // Listen to our daily_inspections collection
        let query = firebase.firestore()
            .collection(PLAY_PARKS_CONFIG.inspectionsCollection);

        // For our system, we filter by document keys that match our pattern
        const unsubscribe = query.onSnapshot(snapshot => {
            const stats = {
                inspectionsToday: 0,
                dailyInspections: 0,
                weeklyInspections: 0,
                issues: 0,
                pending: 0,
                critical: 0,
                parkStats: {}
            };

            snapshot.forEach(doc => {
                const data = doc.data();
                const docId = doc.id;
                
                // Check if this is today's inspection using our document key pattern
                if (docId.includes(`_${today}`)) {
                    stats.inspectionsToday++;
                    
                    if (data.inspectionType === PLAY_PARKS_CONFIG.inspectionTypes.DAILY) {
                        stats.dailyInspections++;
                    }
                    
                    // Park filter
                    if (parkName && data.parkName !== parkName) {
                        return;
                    }
                    
                    // Count issues
                    if (data.issues && data.issues !== 'None reported' && data.issues.trim().length > 0) {
                        stats.issues++;
                    }
                    
                    // Count failed checklist items as issues
                    if (data.checklist) {
                        const failedChecks = Object.values(data.checklist).filter(check => !check).length;
                        if (failedChecks > 0) {
                            stats.issues += failedChecks;
                        }
                    }
                    
                    // Status tracking
                    if (data.status === PLAY_PARKS_CONFIG.statuses.PENDING) {
                        stats.pending++;
                    }
                    
                    // Risk level tracking
                    if (data.overallRiskLevel === PLAY_PARKS_CONFIG.riskLevels.CRITICAL) {
                        stats.critical++;
                    }
                    
                    // Park-specific stats
                    if (!stats.parkStats[data.parkName]) {
                        stats.parkStats[data.parkName] = {
                            inspections: 0,
                            issues: 0,
                            completed: 0
                        };
                    }
                    
                    stats.parkStats[data.parkName].inspections++;
                    if (data.completed) {
                        stats.parkStats[data.parkName].completed++;
                    }
                    if (data.issues && data.issues !== 'None reported') {
                        stats.parkStats[data.parkName].issues++;
                    }
                }
            });

            callback(stats);
        }, error => {
            console.error('Error in real-time listener:', error);
            // Fallback to localStorage
            listenToLocalStorageStats(callback, parkName);
        });

        return unsubscribe;

    } catch (error) {
        console.error('Error setting up listener:', error);
        return listenToLocalStorageStats(callback, parkName);
    }
}

/**
 * Fallback localStorage-based stats monitoring
 * @param {Function} callback - Callback function
 * @param {string} [parkName] - Optional park filter
 * @returns {Function} Cleanup function
 */
function listenToLocalStorageStats(callback, parkName = null) {
    const today = new Date().toISOString().split('T')[0];
    
    function updateStats() {
        const stats = {
            inspectionsToday: 0,
            dailyInspections: 0,
            weeklyInspections: 0,
            issues: 0,
            pending: 0,
            critical: 0,
            parkStats: {}
        };
        
        // Check localStorage for inspection data using our key pattern
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`inspection_`) && key.includes(`_${today}`)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    
                    if (parkName && data.parkName !== parkName) {
                        continue;
                    }
                    
                    stats.inspectionsToday++;
                    stats.dailyInspections++;
                    
                    if (data.issues && data.issues !== 'None reported' && data.issues.trim().length > 0) {
                        stats.issues++;
                    }
                    
                    if (data.checklist) {
                        const failedChecks = Object.values(data.checklist).filter(check => !check).length;
                        if (failedChecks > 0) {
                            stats.issues += failedChecks;
                        }
                    }
                    
                    if (data.overallRiskLevel === PLAY_PARKS_CONFIG.riskLevels.CRITICAL) {
                        stats.critical++;
                    }
                    
                    // Park-specific stats
                    if (!stats.parkStats[data.parkName]) {
                        stats.parkStats[data.parkName] = {
                            inspections: 0,
                            issues: 0,
                            completed: 0
                        };
                    }
                    
                    stats.parkStats[data.parkName].inspections++;
                    if (data.completed) {
                        stats.parkStats[data.parkName].completed++;
                    }
                    
                } catch (error) {
                    console.error('Error parsing localStorage inspection data:', error);
                }
            }
        }
        
        callback(stats);
    }
    
    // Initial update
    updateStats();
    
    // Set up interval to check for updates
    const interval = setInterval(updateStats, 5000); // Check every 5 seconds
    
    // Return cleanup function
    return () => clearInterval(interval);
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
    
    // Highland Holidays Access Control
    getUserAccessLevel,
    hasAccessToPark,
    getCurrentUserAccess,
    
    // Equipment management
    registerPlayArea,
    getPlayAreasForPark,
    getAllPlayAreas,
    updateLocalSitesData,
    
    // Inspection management (Enhanced)
    createPlayParkInspection,
    getPlayParkInspections,
    calculateInspectionRisk,
    
    // Statistics (Enhanced)
    getPlayParkStats,
    
    // Real-time updates (Enhanced)
    listenToPlayParkStats,
    listenToLocalStorageStats,
    
    // Initialization
    initializeDefaultPlayAreas,
    
    // Initialize method for compatibility with our system
    initialize: async function() {
        console.log('🚀 Initializing Enhanced Play Parks System...');
        try {
            // Check authentication using our system's method
            const userAccess = getCurrentUserAccess();
            if (!userAccess) {
                console.log('⚠️ User not authenticated, skipping Firebase initialization');
                return;
            }
            
            console.log(`✅ Authenticated: ${userAccess.description} (${userAccess.accessibleParks.join(', ')})`);
            
            // Initialize default play areas if needed
            await initializeDefaultPlayAreas();
            
            // Set up real-time listeners if on dashboard
            if (document.getElementById('dashboard') || document.getElementById('play-parks-dashboard')) {
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
                    
                    // Update park-specific stats if available
                    Object.keys(stats.parkStats || {}).forEach(parkName => {
                        const parkStats = stats.parkStats[parkName];
                        const parkElement = document.querySelector(`[data-park="${parkName}"]`);
                        if (parkElement && parkStats) {
                            // Update park-specific display elements
                            const completedElement = parkElement.querySelector('.inspections-completed');
                            const issuesElement = parkElement.querySelector('.issues-count');
                            
                            if (completedElement) {
                                completedElement.textContent = parkStats.completed || 0;
                            }
                            if (issuesElement) {
                                issuesElement.textContent = parkStats.issues || 0;
                            }
                        }
                    });
                });
                
                // Store unsubscribe function for cleanup
                window.playParksUnsubscribe = unsubscribe;
            }
            
            // Set up inspection form integration if present
            if (window.completeDailyInspection) {
                console.log('🔗 Linking with existing inspection system...');
                
                // Override the existing completeDailyInspection to use our enhanced system
                const originalComplete = window.completeDailyInspection;
                window.completeDailyInspection = async function(parkName) {
                    try {
                        const today = new Date().toISOString().split('T')[0];
                        const userAccess = getCurrentUserAccess();
                        
                        if (!userAccess || !userAccess.accessibleParks.includes(parkName)) {
                            console.error('Access denied: Cannot complete inspection for this park');
                            return;
                        }
                        
                        // Get inspection form data
                        const inspectionData = {
                            parkName: parkName,
                            date: today,
                            timestamp: new Date().toISOString(),
                            inspector: userAccess.user?.name || userAccess.accessCode,
                            checklist: {
                                visualInspection: document.getElementById('visual-inspection')?.checked || false,
                                surfaceCheck: document.getElementById('surface-check')?.checked || false,
                                equipmentCheck: document.getElementById('equipment-check')?.checked || false,
                                fencingCheck: document.getElementById('fencing-check')?.checked || false,
                                gateCheck: document.getElementById('gate-check')?.checked || false,
                                signageCheck: document.getElementById('signage-check')?.checked || false,
                                hazardCheck: document.getElementById('hazard-check')?.checked || false,
                                accessCheck: document.getElementById('access-check')?.checked || false
                            },
                            notes: document.getElementById('inspection-notes')?.value || '',
                            weather: document.getElementById('inspection-weather')?.value || 'Fair',
                            issues: document.getElementById('inspection-issues')?.value || 'None reported'
                        };
                        
                        // Use our enhanced inspection creation
                        await createPlayParkInspection(inspectionData);
                        
                        // Call original function for UI updates
                        if (originalComplete) {
                            originalComplete(parkName);
                        }
                        
                        console.log(`✅ Enhanced inspection completed for ${parkName}`);
                        
                    } catch (error) {
                        console.error('Error in enhanced inspection completion:', error);
                        // Fallback to original function
                        if (originalComplete) {
                            originalComplete(parkName);
                        }
                    }
                };
            }
            
            console.log('✅ Enhanced Play Parks System initialized successfully');
            console.log('🔒 Access Control: Active for Highland Holidays parks');
            console.log('📋 Comprehensive 8-point inspection checklist: Enabled');
            console.log('🔧 Signage & Fencing Integration: Complete');
            
        } catch (error) {
            console.error('❌ Error initializing Enhanced Play Parks System:', error);
        }
    },
    
    // UI helpers
    getInspectionTypeBadgeHTML,
    getRiskLevelBadgeHTML,
    getStatusBadgeHTML,
    formatDate,
    calculateOverallRisk
};

console.log('✅ Enhanced Play Parks Integration Module Loaded');
console.log('🔒 Highland Holidays Access Control System Active');
console.log('📋 Comprehensive 8-Point Inspection Checklist Enabled'); 
console.log('🔧 Signage & Fencing Safety Infrastructure Integrated');
console.log('Access via: window.PlayParksSystem');
