// SafePark.PRO Authentication Handler - Compatible with Park-Reactive Dashboard
// This version provides realistic test users that match the ACCESS_CODES system

window.SafeParkAuth = {
    // Test users that match the ACCESS_CODES in index.html
    testUsers: {
        // Ben Nevis Holiday Park Users
        'bennevis_manager': {
            name: 'Lesleyanne',
            role: 'Park Manager', 
            park: 'Ben Nevis Holiday Park',
            accessCode: '1010',
            type: 'park'
        },
        'bennevis_staff': {
            name: 'David',
            role: 'Grounds & Maintenance Manager',
            park: 'Ben Nevis Holiday Park', 
            accessCode: '1010001',
            type: 'individual'
        },
        
        // Oban Holiday Park Users
        'oban_manager': {
            name: 'Siobhan',
            role: 'Park Manager',
            park: 'Oban Holiday Park',
            accessCode: '1020', 
            type: 'park'
        },
        'oban_staff': {
            name: 'Murray',
            role: 'Grounds & Maintenance Manager',
            park: 'Oban Holiday Park',
            accessCode: '1020001',
            type: 'individual'
        },
        
        // Tyndrum Holiday Park Users
        'tyndrum_manager': {
            name: 'Tyndrum Holiday Park Manager',
            role: 'Park Manager',
            park: 'Tyndrum Holiday Park',
            accessCode: '1030',
            type: 'park'
        },
        'tyndrum_staff': {
            name: 'Alasdair Fraser', 
            role: 'Assistant Manager',
            park: 'Tyndrum Holiday Park',
            accessCode: '1030001',
            type: 'individual'
        },
        
        // Overburns Farm Users
        'overburns_manager': {
            name: 'Overburns Farm Manager',
            role: 'Manager',
            park: 'Overburns Farm',
            accessCode: '365',
            type: 'park'
        },
        'overburns_staff': {
            name: 'John Smith',
            role: 'Maintenance Supervisor', 
            park: 'Overburns Farm',
            accessCode: '365001',
            type: 'individual'
        },
        
        // System Administrator
        'admin': {
            name: 'SafePark.PRO System Administrator',
            role: 'System Administrator',
            park: 'All Highland Holidays Parks',
            accessCode: 'CQR365SPP25',
            type: 'master'
        }
    },
    
    // Current test user (change this to test different scenarios)
    currentTestUser: 'bennevis_manager', // Change this to test different users
    
    requireAuth: function() {
        console.log('Authentication handler active - providing test user data');
        return true; // Always return true for testing
    },
    
    getCurrentUser: function() {
        const user = this.testUsers[this.currentTestUser];
        if (!user) {
            console.error('Invalid test user specified:', this.currentTestUser);
            return this.testUsers['admin']; // Fallback to admin
        }
        
        console.log(`Auth Handler: Providing user data for ${user.name} at ${user.park}`);
        return user;
    },
    
    isAuthenticated: function() {
        return true; // Always authenticated for testing
    },
    
    // Helper function to simulate different user logins during testing
    switchTestUser: function(userKey) {
        if (this.testUsers[userKey]) {
            this.currentTestUser = userKey;
            console.log(`Switched to test user: ${this.testUsers[userKey].name} at ${this.testUsers[userKey].park}`);
            
            // Trigger a reload to see the new user's dashboard
            if (window.location && window.location.reload) {
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } else {
            console.error('Invalid user key:', userKey);
            console.log('Available users:', Object.keys(this.testUsers));
        }
    },
    
    // Get available test users for debugging
    getAvailableUsers: function() {
        return Object.keys(this.testUsers).map(key => ({
            key: key,
            name: this.testUsers[key].name,
            park: this.testUsers[key].park,
            role: this.testUsers[key].role
        }));
    }
};

// Initialize the authentication state for the index.html
if (typeof window.authState !== 'undefined') {
    const currentUser = window.SafeParkAuth.getCurrentUser();
    window.authState = {
        isAuthenticated: true,
        currentUser: currentUser,
        sessionExpiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    console.log('AuthState initialized with:', currentUser);
}

// Console helpers for testing different users
console.log('SafePark Authentication Handler loaded (PARK-REACTIVE MODE)');
console.log('Current test user:', window.SafeParkAuth.getCurrentUser().name);
console.log('Available test users:', window.SafeParkAuth.getAvailableUsers());
console.log('To switch users, use: SafeParkAuth.switchTestUser("user_key")');
console.log('Example: SafeParkAuth.switchTestUser("oban_manager")');
