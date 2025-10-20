/**
 * SafePark.PRO - Maintenance Integration Module
 * Centralized maintenance request management across all modules
 * Version: 1.0
 * Date: January 2025
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAINTENANCE_CONFIG = {
    collection: 'maintenanceRecords',
    authDuration: 60 * 60 * 1000, // 60 minutes
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
        CANCELLED: 'cancelled'
    },
    categories: {
        PLAY_PARKS: 'Play Parks',
        HOT_TUBS: 'Hot Tubs',
        ACCOMMODATION: 'Accommodation',
        GROUNDS: 'Grounds & Equipment',
        FOOD_BEVERAGE: 'Food & Beverage',
        VEHICLES: 'Vehicles',
        ELECTRICAL: 'Electrical',
        GAS: 'Gas Safety',
        FIRE: 'Fire Safety',
        GENERAL: 'General Maintenance'
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
        if (now - authData.timestamp > MAINTENANCE_CONFIG.authDuration) {
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
// MAINTENANCE REQUEST CREATION
// ============================================================================

/**
 * Create a new maintenance request
 * @param {Object} requestData - The maintenance request data
 * @param {string} requestData.title - Short title of the issue
 * @param {string} requestData.description - Detailed description
 * @param {string} requestData.priority - Priority level (use MAINTENANCE_CONFIG.priorities)
 * @param {string} requestData.category - Category (use MAINTENANCE_CONFIG.categories)
 * @param {string} requestData.location - Specific location within the park
 * @param {string} [requestData.assignedTo] - Optional: Who to assign to
 * @param {Date} [requestData.dueDate] - Optional: Due date for completion
 * @param {Array} [requestData.images] - Optional: Array of image URLs/base64
 * @returns {Promise<Object>} The created maintenance record with ID
 */
async function createMaintenanceRequest(requestData) {
    // Validate authentication
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('User must be authenticated to create maintenance requests');
    }

    // Validate required fields
    if (!requestData.title || !requestData.description) {
        throw new Error('Title and description are required');
    }

    if (!requestData.priority || !Object.values(MAINTENANCE_CONFIG.priorities).includes(requestData.priority)) {
        throw new Error('Valid priority is required');
    }

    if (!requestData.category) {
        throw new Error('Category is required');
    }

    // Build maintenance record
    const maintenanceRecord = {
        // Required fields
        title: requestData.title,
        description: requestData.description,
        priority: requestData.priority,
        category: requestData.category,
        location: requestData.location || 'Not specified',
        
        // User/Park info from authentication
        createdBy: currentUser.name,
        createdByRole: currentUser.role,
        holidayPark: currentUser.park,
        
        // Status tracking
        status: MAINTENANCE_CONFIG.statuses.PENDING,
        createdAt: new Date().toISOString(),
        
        // Optional fields
        assignedTo: requestData.assignedTo || 'Unassigned',
        dueDate: requestData.dueDate ? requestData.dueDate.toISOString() : null,
        images: requestData.images || [],
        
        // Completion tracking
        completedAt: null,
        completedBy: null,
        completionNotes: null,
        
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
            .collection(MAINTENANCE_CONFIG.collection)
            .add(maintenanceRecord);

        console.log('Maintenance request created:', docRef.id);

        // Return the record with ID
        return {
            id: docRef.id,
            ...maintenanceRecord
        };

    } catch (error) {
        console.error('Error creating maintenance request:', error);
        
        // Fallback: Save to localStorage if Firebase fails
        try {
            const localRecords = JSON.parse(localStorage.getItem('maintenance_backup') || '[]');
            const recordWithId = {
                id: 'local_' + Date.now(),
                ...maintenanceRecord,
                _isLocal: true
            };
            localRecords.push(recordWithId);
            localStorage.setItem('maintenance_backup', JSON.stringify(localRecords));
            console.log('Saved to local backup storage');
            return recordWithId;
        } catch (localError) {
            console.error('Failed to save to local backup:', localError);
        }

        throw error;
    }
}

// ============================================================================
// MAINTENANCE DATA QUERIES
// ============================================================================

/**
 * Get all maintenance records with optional filters
 * @param {Object} filters - Optional filters
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.priority] - Filter by priority
 * @param {string} [filters.category] - Filter by category
 * @param {string} [filters.holidayPark] - Filter by park
 * @param {number} [filters.limit] - Limit number of results
 * @returns {Promise<Array>} Array of maintenance records
 */
async function getMaintenanceRecords(filters = {}) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase not initialized');
        }

        let query = firebase.firestore().collection(MAINTENANCE_CONFIG.collection);

        // Apply filters
        if (filters.status) {
            query = query.where('status', '==', filters.status);
        }
        if (filters.priority) {
            query = query.where('priority', '==', filters.priority);
        }
        if (filters.category) {
            query = query.where('category', '==', filters.category);
        }
        if (filters.holidayPark) {
            query = query.where('holidayPark', '==', filters.holidayPark);
        }

        // Order by creation date (newest first)
        query = query.orderBy('createdAt', 'desc');

        // Apply limit
        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const snapshot = await query.get();
        const records = [];

        snapshot.forEach(doc => {
            records.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return records;

    } catch (error) {
        console.error('Error getting maintenance records:', error);
        
        // Fallback to localStorage
        try {
            const localRecords = JSON.parse(localStorage.getItem('maintenance_backup') || '[]');
            return localRecords;
        } catch (localError) {
            console.error('Error reading local backup:', localError);
            return [];
        }
    }
}

/**
 * Get pending maintenance count
 * @param {string} [holidayPark] - Optional: Filter by specific park
 * @returns {Promise<number>} Count of pending maintenance tasks
 */
async function getPendingMaintenanceCount(holidayPark = null) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase not initialized');
        }

        let query = firebase.firestore()
            .collection(MAINTENANCE_CONFIG.collection)
            .where('status', 'in', [
                MAINTENANCE_CONFIG.statuses.PENDING,
                MAINTENANCE_CONFIG.statuses.IN_PROGRESS
            ]);

        if (holidayPark) {
            query = query.where('holidayPark', '==', holidayPark);
        }

        const snapshot = await query.get();
        return snapshot.size;

    } catch (error) {
        console.error('Error getting pending count:', error);
        return 0;
    }
}

/**
 * Get maintenance statistics
 * @param {string} [holidayPark] - Optional: Filter by specific park
 * @returns {Promise<Object>} Statistics object
 */
async function getMaintenanceStats(holidayPark = null) {
    try {
        const allRecords = await getMaintenanceRecords({ holidayPark });

        const stats = {
            total: allRecords.length,
            pending: 0,
            inProgress: 0,
            completed: 0,
            critical: 0,
            high: 0,
            byCategory: {}
        };

        allRecords.forEach(record => {
            // Count by status
            if (record.status === MAINTENANCE_CONFIG.statuses.PENDING) stats.pending++;
            if (record.status === MAINTENANCE_CONFIG.statuses.IN_PROGRESS) stats.inProgress++;
            if (record.status === MAINTENANCE_CONFIG.statuses.COMPLETED) stats.completed++;

            // Count by priority
            if (record.priority === MAINTENANCE_CONFIG.priorities.CRITICAL) stats.critical++;
            if (record.priority === MAINTENANCE_CONFIG.priorities.HIGH) stats.high++;

            // Count by category
            if (!stats.byCategory[record.category]) {
                stats.byCategory[record.category] = 0;
            }
            stats.byCategory[record.category]++;
        });

        return stats;

    } catch (error) {
        console.error('Error getting maintenance stats:', error);
        return {
            total: 0,
            pending: 0,
            inProgress: 0,
            completed: 0,
            critical: 0,
            high: 0,
            byCategory: {}
        };
    }
}

// ============================================================================
// MAINTENANCE RECORD UPDATES
// ============================================================================

/**
 * Update maintenance record status
 * @param {string} recordId - The maintenance record ID
 * @param {string} newStatus - New status (use MAINTENANCE_CONFIG.statuses)
 * @param {string} [notes] - Optional notes about the update
 * @returns {Promise<void>}
 */
async function updateMaintenanceStatus(recordId, newStatus, notes = '') {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('User must be authenticated');
    }

    if (!Object.values(MAINTENANCE_CONFIG.statuses).includes(newStatus)) {
        throw new Error('Invalid status');
    }

    try {
        const updateData = {
            status: newStatus,
            lastUpdated: new Date().toISOString()
        };

        // If completing, add completion info
        if (newStatus === MAINTENANCE_CONFIG.statuses.COMPLETED) {
            updateData.completedAt = new Date().toISOString();
            updateData.completedBy = currentUser.name;
            updateData.completionNotes = notes;
        }

        // Add to update history
        const historyEntry = {
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            action: `Status changed to ${newStatus}`,
            notes: notes
        };

        await firebase.firestore()
            .collection(MAINTENANCE_CONFIG.collection)
            .doc(recordId)
            .update({
                ...updateData,
                updateHistory: firebase.firestore.FieldValue.arrayUnion(historyEntry)
            });

        console.log('Maintenance record updated:', recordId);

    } catch (error) {
        console.error('Error updating maintenance status:', error);
        throw error;
    }
}

/**
 * Assign maintenance task to someone
 * @param {string} recordId - The maintenance record ID
 * @param {string} assignedTo - Who to assign to
 * @returns {Promise<void>}
 */
async function assignMaintenanceTask(recordId, assignedTo) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('User must be authenticated');
    }

    try {
        const historyEntry = {
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            action: `Assigned to ${assignedTo}`,
            notes: ''
        };

        await firebase.firestore()
            .collection(MAINTENANCE_CONFIG.collection)
            .doc(recordId)
            .update({
                assignedTo: assignedTo,
                lastUpdated: new Date().toISOString(),
                updateHistory: firebase.firestore.FieldValue.arrayUnion(historyEntry)
            });

        console.log('Task assigned:', recordId);

    } catch (error) {
        console.error('Error assigning task:', error);
        throw error;
    }
}

// ============================================================================
// REAL-TIME UPDATES FOR DASHBOARD
// ============================================================================

/**
 * Set up real-time listener for maintenance statistics
 * @param {Function} callback - Function to call when data changes
 * @param {string} [holidayPark] - Optional: Filter by specific park
 * @returns {Function} Unsubscribe function
 */
function listenToMaintenanceStats(callback, holidayPark = null) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.error('Firebase not initialized');
            return () => {};
        }

        let query = firebase.firestore()
            .collection(MAINTENANCE_CONFIG.collection);

        if (holidayPark) {
            query = query.where('holidayPark', '==', holidayPark);
        }

        const unsubscribe = query.onSnapshot(snapshot => {
            const stats = {
                total: snapshot.size,
                pending: 0,
                inProgress: 0,
                completed: 0,
                critical: 0,
                high: 0
            };

            snapshot.forEach(doc => {
                const data = doc.data();
                
                if (data.status === MAINTENANCE_CONFIG.statuses.PENDING) stats.pending++;
                if (data.status === MAINTENANCE_CONFIG.statuses.IN_PROGRESS) stats.inProgress++;
                if (data.status === MAINTENANCE_CONFIG.statuses.COMPLETED) stats.completed++;
                if (data.priority === MAINTENANCE_CONFIG.priorities.CRITICAL) stats.critical++;
                if (data.priority === MAINTENANCE_CONFIG.priorities.HIGH) stats.high++;
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
 * Get priority badge HTML
 * @param {string} priority - Priority level
 * @returns {string} HTML for priority badge
 */
function getPriorityBadgeHTML(priority) {
    const colors = {
        critical: '#DC3545',
        high: '#FFC107',
        medium: '#17A2B8',
        low: '#28A745'
    };

    const color = colors[priority] || colors.medium;
    
    return `<span style="
        background: ${color};
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
    ">${priority}</span>`;
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
window.MaintenanceSystem = {
    // Configuration
    config: MAINTENANCE_CONFIG,
    
    // Auth functions
    getCurrentUser,
    isAuthenticated,
    requireAuth,
    
    // Create requests
    createMaintenanceRequest,
    
    // Query data
    getMaintenanceRecords,
    getPendingMaintenanceCount,
    getMaintenanceStats,
    
    // Update records
    updateMaintenanceStatus,
    assignMaintenanceTask,
    
    // Real-time updates
    listenToMaintenanceStats,
    
    // UI helpers
    getPriorityBadgeHTML,
    getStatusBadgeHTML,
    formatDate
};

console.log('✅ Maintenance Integration Module Loaded');
console.log('Access via: window.MaintenanceSystem');
