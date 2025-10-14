// SafePark.PRO Authentication Handler
// Include this file in ALL HTML modules

const AUTH_DURATION = 60 * 60 * 1000; // 60 minutes

function getStoredData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error getting stored data:', error);
        return null;
    }
}

// Create global SafeParkAuth object
window.SafeParkAuth = {
    requireAuth: function() {
        try {
            const authData = getStoredData('safePark_auth');
            if (!authData || !authData.user || !authData.timestamp) {
                window.location.href = 'index.html';
                return false;
            }
            
            const now = Date.now();
            if (now - authData.timestamp > AUTH_DURATION) {
                localStorage.removeItem('safePark_auth');
                window.location.href = 'index.html';
                return false;
            }
            
            return true;
        } catch (error) {
            window.location.href = 'index.html';
            return false;
        }
    },
    
    getCurrentUser: function() {
        try {
            const authData = getStoredData('safePark_auth');
            return authData ? authData.user : null;
        } catch (error) {
            return null;
        }
    },
    
    isAuthenticated: function() {
        try {
            const authData = getStoredData('safePark_auth');
            if (!authData || !authData.user || !authData.timestamp) {
                return false;
            }
            const now = Date.now();
            return (now - authData.timestamp) < AUTH_DURATION;
        } catch (error) {
            return false;
        }
    }
};
