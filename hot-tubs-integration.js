/**
 * SafePark.PRO - Hot Tubs Integration Module
 * Centralized hot tub management across all parks
 * Version: 1.0
 * Date: January 2025
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const HOT_TUBS_CONFIG = {
    collection: 'hotTubRecords',
    equipmentCollection: 'hotTubEquipment',
    checksCollection: 'hotTubChecks',
    authDuration: 60 * 60 * 1000, // 60 minutes
    checkTypes: {
        DAILY: 'daily',
        CHANGEOVER: 'changeover',
        WEEKLY: 'weekly',
        MONTHLY: 'monthly'
    },
    priorities: {
        CRITICAL: 'critical',
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low'
    },
    statuses: {
        PENDING: 'pending',
        IN_PROGRESS: 'in-progress',
        COMPLETED: 'completed',
        OVERDUE: 'overdue',
        SKIPPED: 'skipped'
    },
    issueCategories: {
        TEMPERATURE: 'Temperature Control',
        CHEMICAL: 'Chemical Balance',
        FILTRATION: 'Filtration System',
        PUMPS: 'Pumps & Motors',
        HEATING: 'Heating System',
        SAFETY: 'Safety Equipment',
        CLEANING: 'Cleaning & Maintenance',
        ELECTRICAL: 'Electrical Issues',
        STRUCTURAL: 'Structural Damage',
        OTHER: 'Other Issues'
    },
    defaultParks: {
        'Ben Nevis Holiday Park': {
            hotTubs: [
                { id: 'BN-HT-001', name: 'Lodge Hot Tub 1', displayName: 'Lodge Hot Tub 1', capacity: 1500 },
                { id: 'BN-HT-002', name: 'Lodge Hot Tub 2', displayName: 'Lodge Hot Tub 2', capacity: 1500 },
                { id: 'BN-HT-003', name: 'Central Hot Tub', displayName: 'Central Hot Tub', capacity: 2000 }
            ]
        },
        'Oban Holiday Park': {
            hotTubs: [
                { id: 'OB-HT-001', name: 'Main Hot Tub', displayName: 'Main Hot Tub', capacity: 1800 },
                { id: 'OB-HT-002', name: 'Family Hot Tub', displayName: 'Family Hot Tub', capacity: 1200 }
            ]
        },
        'Tyndrum Holiday Park': {
            hotTubs: [
                { id: 'TY-HT-001', name: 'Premium Hot Tub', displayName: 'Premium Hot Tub', capacity: 2200 }
            ]
        },
        'Overburns Farm': {
            hotTubs: [
                { id: 'OF-HT-001', name: 'Farm Hot Tub', displayName: 'Farm Hot Tub', capacity: 1600 }
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
        if (now - authData.timestamp > HOT_TUBS_CONFIG.authDuration) {
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
// HOT TUB EQUIPMENT MANAGEMENT
// ============================================================================

/**
 * Register a new hot tub in the system
 * @param {Object} hotTubData - The hot tub data
 * @param {string} hotTubData.id - Unique hot tub ID
 * @param {string} hotTubData.name - Hot tub name
 * @param {string} hotTubData.displayName - Display name for UI
 * @param {number} hotTubData.capacity - Capacity in liters
 * @param {string} hotTubData.park - Holiday park name
 * @param {string} [hotTubData.location] - Specific location within park
 * @param {Object} [hotTubData.specifications] - Technical specifications
 * @returns {Promise<Object>} The registered hot tub record
 */
async function registerHotTub(hotTubData) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('User must be authenticated to register hot tubs');
    }

    // Validate required fields
    if (!hotTubData.id || !hotTubData.name || !hotTubData.capacity || !hotTubData.park) {
        throw new Error('ID, name, capacity, and park are required');
    }

    // Build hot tub record
    const hotTubRecord = {
        // Required fields
        id: hotTubData.id,
        name: hotTubData.name,
        displayName: hotTubData.displayName || hotTubData.name,
        capacity: hotTubData.capacity,
        park: hotTubData.park,
        
        // Optional fields
        location: hotTubData.location || 'Not specified',
        specifications: hotTubData.specifications || {},
        
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
        changeoverChecksEnabled: true,
        weeklyChecksEnabled: true,
        monthlyChecksEnabled: true,
        
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
            .collection(HOT_TUBS_CONFIG.equipmentCollection)
            .doc(hotTubData.id)
            .set(hotTubRecord);

        console.log('Hot tub registered:', hotTubData.id);

        // Also update local sites data for immediate UI response
        updateLocalSitesData(hotTubData.park, hotTubRecord);

        return hotTubRecord;

    } catch (error) {
        console.error('Error registering hot tub:', error);
        
        // Fallback: Save to localStorage if Firebase fails
        try {
            const localEquipment = JSON.parse(localStorage.getItem('hotTub_equipment_backup') || '{}');
            localEquipment[hotTubData.id] = {
                ...hotTubRecord,
                _isLocal: true
            };
            localStorage.setItem('hotTub_equipment_backup', JSON.stringify(localEquipment));
            console.log('Saved to local backup storage');
            
            // Update local sites data
            updateLocalSitesData(hotTubData.park, hotTubRecord);
            
            return hotTubRecord;
        } catch (localError) {
            console.error('Failed to save to local backup:', localError);
        }

        throw error;
    }
}

/**
 * Get all hot tubs for a specific park
 * @param {string} parkName - Name of the holiday park
 * @returns {Promise<Array>} Array of hot tub records
 */
async function getHotTubsForPark(parkName) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase not initialized');
        }

        const snapshot = await firebase.firestore()
            .collection(HOT_TUBS_CONFIG.equipmentCollection)
            .where('park', '==', parkName)
            .where('isActive', '==', true)
            .get();

        const hotTubs = [];
        snapshot.forEach(doc => {
            hotTubs.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return hotTubs;

    } catch (error) {
        console.error('Error loading hot tubs for park:', error);
        
        // Fallback to local data
        try {
            const localEquipment = JSON.parse(localStorage.getItem('hotTub_equipment_backup') || '{}');
            return Object.values(localEquipment).filter(tub => 
                tub.park === parkName && tub.isActive
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
 * @param {Object} hotTubRecord - Hot tub record to add
 */
function updateLocalSitesData(parkName, hotTubRecord) {
    try {
        // Get existing sites data
        const sitesData = JSON.parse(localStorage.getItem('safePark_hotTubData') || '{}');
        
        // Initialize park if it doesn't exist
        if (!sitesData[parkName]) {
            sitesData[parkName] = { hotTubs: [] };
        }
        
        // Add or update hot tub
        const existingIndex = sitesData[parkName].hotTubs.findIndex(tub => tub.id === hotTubRecord.id);
        if (existingIndex >= 0) {
            sitesData[parkName].hotTubs[existingIndex] = hotTubRecord;
        } else {
            sitesData[parkName].hotTubs.push(hotTubRecord);
        }
        
        // Save back to localStorage
        localStorage.setItem('safePark_hotTubData', JSON.stringify(sitesData));
        
        console.log('Local sites data updated for:', parkName);
    } catch (error) {
        console.error('Error updating local sites data:', error);
    }
}

// ============================================================================
// HOT TUB CHECKS & INSPECTIONS
// ============================================================================

/**
 * Create a hot tub check record
 * @param {Object} checkData - The check data
 * @param {string} checkData.hotTubId - Hot tub ID
 * @param {string} checkData.park - Holiday park name
 * @param {string} checkData.checkType - Type of check (daily, changeover, etc.)
 * @param {Object} checkData.readings - Check readings and observations
 * @param {string} [checkData.teamMember] - Team member performing check
 * @param {Array} [checkData.issues] - Array of issues identified
 * @param {string} [checkData.notes] - Additional notes
 * @returns {Promise<Object>} The created check record
 */
async function createHotTubCheck(checkData) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('User must be authenticated to create hot tub checks');
    }

    // Validate required fields
    if (!checkData.hotTubId || !checkData.park || !checkData.checkType) {
        throw new Error('Hot tub ID, park, and check type are required');
    }

    // Build check record
    const checkRecord = {
        // Required fields
        hotTubId: checkData.hotTubId,
        park: checkData.park,
        checkType: checkData.checkType,
        
        // Check data
        readings: checkData.readings || {},
        issues: checkData.issues || [],
        notes: checkData.notes || '',
        
        // User/Park info from authentication
        performedBy: checkData.teamMember || currentUser.name,
        performedByRole: currentUser.role,
        
        // Timing
        checkDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        checkTime: new Date().toTimeString().split(' ')[0], // HH:MM:SS
        timestamp: new Date().toISOString(),
        
        // Status
        status: checkData.issues && checkData.issues.length > 0 ? 
                HOT_TUBS_CONFIG.statuses.PENDING : 
                HOT_TUBS_CONFIG.statuses.COMPLETED,
        
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
            .collection(HOT_TUBS_CONFIG.checksCollection)
            .add(checkRecord);

        console.log('Hot tub check created:', docRef.id);

        // If there are issues, create maintenance requests
        if (checkData.issues && checkData.issues.length > 0) {
            await createMaintenanceRequestsFromIssues(checkData, checkRecord);
        }

        // Update equipment last inspection date
        await updateHotTubLastInspection(checkData.hotTubId);

        return {
            id: docRef.id,
            ...checkRecord
        };

    } catch (error) {
        console.error('Error creating hot tub check:', error);
        
        // Fallback: Save to localStorage if Firebase fails
        try {
            const localChecks = JSON.parse(localStorage.getItem('hotTub_checks_backup') || '[]');
            const recordWithId = {
                id: 'local_' + Date.now(),
                ...checkRecord,
                _isLocal: true
            };
            localChecks.push(recordWithId);
            localStorage.setItem('hotTub_checks_backup', JSON.stringify(localChecks));
            console.log('Saved to local backup storage');
            return recordWithId;
        } catch (localError) {
            console.error('Failed to save to local backup:', localError);
        }

        throw error;
    }
}

/**
 * Create maintenance requests from identified issues
 * @param {Object} checkData - Original check data
 * @param {Object} checkRecord - Created check record
 */
async function createMaintenanceRequestsFromIssues(checkData, checkRecord) {
    if (!window.MaintenanceSystem || !window.MaintenanceSystem.createMaintenanceRequest) {
        console.warn('Maintenance system not available for issue tracking');
        return;
    }

    try {
        for (const issue of checkData.issues) {
            await window.MaintenanceSystem.createMaintenanceRequest({
                title: `Hot Tub ${checkData.hotTubId}: ${issue.category || 'Issue'}`,
                description: `Issue identified during ${checkData.checkType} check: ${issue.description || issue}. Location: ${checkData.park}`,
                priority: issue.priority || HOT_TUBS_CONFIG.priorities.MEDIUM,
                category: window.MaintenanceSystem.config.categories.HOT_TUBS || 'Hot Tubs',
                location: `${checkData.park} - ${checkData.hotTubId}`,
                dueDate: issue.urgent ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null // 24 hours if urgent
            });
        }
        console.log('Maintenance requests created for issues');
    } catch (error) {
        console.error('Error creating maintenance requests from issues:', error);
    }
}

/**
 * Update hot tub last inspection date
 * @param {string} hotTubId - Hot tub ID
 */
async function updateHotTubLastInspection(hotTubId) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            return; // Skip if Firebase not available
        }

        await firebase.firestore()
            .collection(HOT_TUBS_CONFIG.equipmentCollection)
            .doc(hotTubId)
            .update({
                lastInspection: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            });

        console.log('Hot tub last inspection updated:', hotTubId);
    } catch (error) {
        console.error('Error updating hot tub last inspection:', error);
    }
}

// ============================================================================
// HOT TUB DATA QUERIES
// ============================================================================

/**
 * Get hot tub checks with optional filters
 * @param {Object} filters - Optional filters
 * @param {string} [filters.park] - Filter by park
 * @param {string} [filters.hotTubId] - Filter by hot tub ID
 * @param {string} [filters.checkType] - Filter by check type
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.dateFrom] - Filter from date (YYYY-MM-DD)
 * @param {string} [filters.dateTo] - Filter to date (YYYY-MM-DD)
 * @param {number} [filters.limit] - Limit number of results
 * @returns {Promise<Array>} Array of check records
 */
async function getHotTubChecks(filters = {}) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase not initialized');
        }

        let query = firebase.firestore().collection(HOT_TUBS_CONFIG.checksCollection);

        // Apply filters
        if (filters.park) {
            query = query.where('park', '==', filters.park);
        }
        if (filters.hotTubId) {
            query = query.where('hotTubId', '==', filters.hotTubId);
        }
        if (filters.checkType) {
            query = query.where('checkType', '==', filters.checkType);
        }
        if (filters.status) {
            query = query.where('status', '==', filters.status);
        }
        if (filters.dateFrom) {
            query = query.where('checkDate', '>=', filters.dateFrom);
        }
        if (filters.dateTo) {
            query = query.where('checkDate', '<=', filters.dateTo);
        }

        // Order by timestamp (newest first)
        query = query.orderBy('timestamp', 'desc');

        // Apply limit
        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const snapshot = await query.get();
        const checks = [];

        snapshot.forEach(doc => {
            checks.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return checks;

    } catch (error) {
        console.error('Error loading hot tub checks:', error);
        
        // Fallback to local data
        try {
            const localChecks = JSON.parse(localStorage.getItem('hotTub_checks_backup') || '[]');
            
            // Apply basic filtering to local data
            return localChecks.filter(check => {
                if (filters.park && check.park !== filters.park) return false;
                if (filters.hotTubId && check.hotTubId !== filters.hotTubId) return false;
                if (filters.checkType && check.checkType !== filters.checkType) return false;
                if (filters.status && check.status !== filters.status) return false;
                return true;
            }).slice(0, filters.limit || 50);
        } catch (localError) {
            console.error('Error loading local backup checks:', localError);
            return [];
        }
    }
}

/**
 * Get hot tub statistics for dashboard
 * @param {string} [parkName] - Optional: Filter by specific park
 * @returns {Promise<Object>} Statistics object
 */
async function getHotTubStats(parkName = null) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const filters = { checkDate: today };
        if (parkName) filters.park = parkName;

        const todayChecks = await getHotTubChecks(filters);
        
        // Get total hot tubs count
        const allHotTubs = parkName ? 
            await getHotTubsForPark(parkName) : 
            await getAllHotTubs();

        const stats = {
            totalHotTubs: allHotTubs.length,
            checksToday: todayChecks.length,
            dailyChecksCompleted: todayChecks.filter(c => c.checkType === HOT_TUBS_CONFIG.checkTypes.DAILY).length,
            changeoversCompleted: todayChecks.filter(c => c.checkType === HOT_TUBS_CONFIG.checkTypes.CHANGEOVER).length,
            issuesIdentified: todayChecks.reduce((sum, check) => sum + (check.issues ? check.issues.length : 0), 0),
            pendingIssues: todayChecks.filter(c => c.status === HOT_TUBS_CONFIG.statuses.PENDING).length
        };

        return stats;

    } catch (error) {
        console.error('Error getting hot tub stats:', error);
        return {
            totalHotTubs: 0,
            checksToday: 0,
            dailyChecksCompleted: 0,
            changeoversCompleted: 0,
            issuesIdentified: 0,
            pendingIssues: 0
        };
    }
}

/**
 * Get all hot tubs across all parks
 * @returns {Promise<Array>} Array of all hot tub records
 */
async function getAllHotTubs() {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase not initialized');
        }

        const snapshot = await firebase.firestore()
            .collection(HOT_TUBS_CONFIG.equipmentCollection)
            .where('isActive', '==', true)
            .get();

        const hotTubs = [];
        snapshot.forEach(doc => {
            hotTubs.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return hotTubs;

    } catch (error) {
        console.error('Error loading all hot tubs:', error);
        
        // Fallback to local data
        try {
            const localEquipment = JSON.parse(localStorage.getItem('hotTub_equipment_backup') || '{}');
            return Object.values(localEquipment).filter(tub => tub.isActive);
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
 * Initialize default hot tub data for parks if not exists
 */
async function initializeDefaultHotTubs() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        for (const [parkName, parkData] of Object.entries(HOT_TUBS_CONFIG.defaultParks)) {
            const existingHotTubs = await getHotTubsForPark(parkName);
            
            if (existingHotTubs.length === 0) {
                console.log(`Initializing default hot tubs for ${parkName}`);
                
                for (const hotTub of parkData.hotTubs) {
                    await registerHotTub({
                        ...hotTub,
                        park: parkName,
                        location: 'Default Location'
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error initializing default hot tubs:', error);
    }
}

// ============================================================================
// REAL-TIME UPDATES FOR DASHBOARD
// ============================================================================

/**
 * Set up real-time listener for hot tub statistics
 * @param {Function} callback - Function to call when data changes
 * @param {string} [parkName] - Optional: Filter by specific park
 * @returns {Function} Unsubscribe function
 */
function listenToHotTubStats(callback, parkName = null) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.error('Firebase not initialized');
            return () => {};
        }

        let query = firebase.firestore()
            .collection(HOT_TUBS_CONFIG.checksCollection);

        if (parkName) {
            query = query.where('park', '==', parkName);
        }

        const today = new Date().toISOString().split('T')[0];
        query = query.where('checkDate', '==', today);

        const unsubscribe = query.onSnapshot(snapshot => {
            const stats = {
                checksToday: snapshot.size,
                dailyChecks: 0,
                changeovers: 0,
                issues: 0,
                pending: 0
            };

            snapshot.forEach(doc => {
                const data = doc.data();
                
                if (data.checkType === HOT_TUBS_CONFIG.checkTypes.DAILY) stats.dailyChecks++;
                if (data.checkType === HOT_TUBS_CONFIG.checkTypes.CHANGEOVER) stats.changeovers++;
                if (data.issues && data.issues.length > 0) stats.issues += data.issues.length;
                if (data.status === HOT_TUBS_CONFIG.statuses.PENDING) stats.pending++;
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
 * Get check type badge HTML
 * @param {string} checkType - Check type
 * @returns {string} HTML for check type badge
 */
function getCheckTypeBadgeHTML(checkType) {
    const colors = {
        daily: '#17A2B8',
        changeover: '#FFC107',
        weekly: '#28A745',
        monthly: '#DC3545'
    };

    const color = colors[checkType] || colors.daily;
    
    return `<span style="
        background: ${color};
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
    ">${checkType}</span>`;
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
        skipped: '#6C757D'
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
window.HotTubSystem = {
    // Configuration
    config: HOT_TUBS_CONFIG,
    
    // Auth functions
    getCurrentUser,
    isAuthenticated,
    requireAuth,
    
    // Equipment management
    registerHotTub,
    getHotTubsForPark,
    getAllHotTubs,
    updateLocalSitesData,
    
    // Check management
    createHotTubCheck,
    getHotTubChecks,
    
    // Statistics
    getHotTubStats,
    
    // Real-time updates
    listenToHotTubStats,
    
    // Initialization
    initializeDefaultHotTubs,
    
    // UI helpers
    getCheckTypeBadgeHTML,
    getStatusBadgeHTML,
    formatDate
};

console.log('✅ Hot Tubs Integration Module Loaded');
console.log('Access via: window.HotTubSystem');
