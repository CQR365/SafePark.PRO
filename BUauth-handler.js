// SafePark.PRO Authentication Handler - Complete Version
// This includes ALL users from the ACCESS_CODES system

window.SafeParkAuth = {
    // Complete test users matching ALL ACCESS_CODES in index.html
    testUsers: {
        // Park Management Users
        'overburns_manager': {
            name: 'Overburns Farm Manager',
            role: 'Manager',
            park: 'Overburns Farm',
            accessCode: '365',
            type: 'park'
        },
        'bennevis_manager': {
            name: 'Lesleyanne',
            role: 'Park Manager', 
            park: 'Ben Nevis Holiday Park',
            accessCode: '1010',
            type: 'park'
        },
        'oban_manager': {
            name: 'Siobhan',
            role: 'Park Manager',
            park: 'Oban Holiday Park',
            accessCode: '1020', 
            type: 'park'
        },
        'tyndrum_manager': {
            name: 'Tyndrum Holiday Park Manager',
            role: 'Park Manager',
            park: 'Tyndrum Holiday Park',
            accessCode: '1030',
            type: 'park'
        },
        
        // Overburns Farm Individual Team Members (365xxx)
        'overburns_john': {
            name: 'John Smith',
            role: 'Maintenance Supervisor', 
            park: 'Overburns Farm',
            accessCode: '365001',
            type: 'individual'
        },
        'overburns_sarah': {
            name: 'Sarah Wilson',
            role: 'Reception Manager',
            park: 'Overburns Farm',
            accessCode: '365002',
            type: 'individual'
        },
        'overburns_mike': {
            name: 'Mike Davis',
            role: 'Groundskeeper',
            park: 'Overburns Farm',
            accessCode: '365003',
            type: 'individual'
        },
        'overburns_emma': {
            name: 'Emma Thompson',
            role: 'Cleaner',
            park: 'Overburns Farm',
            accessCode: '365004',
            type: 'individual'
        },
        'overburns_david': {
            name: 'David Brown',
            role: 'Security',
            park: 'Overburns Farm',
            accessCode: '365005',
            type: 'individual'
        },
        
        // Ben Nevis Individual Team Members (1010xxx)
        'bennevis_david': {
            name: 'David',
            role: 'Grounds & Maintenance Manager',
            park: 'Ben Nevis Holiday Park', 
            accessCode: '1010001',
            type: 'individual'
        },
        'bennevis_kelly': {
            name: 'Kelly',
            role: 'Team BN',
            park: 'Ben Nevis Holiday Park',
            accessCode: '1010002',
            type: 'individual'
        },
        'bennevis_rik': {
            name: 'Rik',
            role: 'Team BN',
            park: 'Ben Nevis Holiday Park',
            accessCode: '1010003',
            type: 'individual'
        },
        'bennevis_sam': {
            name: 'Sam',
            role: 'Team BN',
            park: 'Ben Nevis Holiday Park',
            accessCode: '1010004',
            type: 'individual'
        },
        'bennevis_vinny': {
            name: 'Vinny',
            role: 'Team BN',
            park: 'Ben Nevis Holiday Park',
            accessCode: '1010005',
            type: 'individual'
        },
        'bennevis_cooper': {
            name: 'Cooper',
            role: 'Team BN',
            park: 'Ben Nevis Holiday Park',
            accessCode: '1010007',
            type: 'individual'
        },
        'bennevis_ewa': {
            name: 'Ewa',
            role: 'Team BN',
            park: 'Ben Nevis Holiday Park',
            accessCode: '1010008',
            type: 'individual'
        },
        
        // Oban Individual Team Members (1020xxx)
        'oban_murray': {
            name: 'Murray',
            role: 'Grounds & Maintenance Manager',
            park: 'Oban Holiday Park',
            accessCode: '1020001',
            type: 'individual'
        },
        'oban_allan': {
            name: 'Allan',
            role: 'Team OBN',
            park: 'Oban Holiday Park',
            accessCode: '1020002',
            type: 'individual'
        },
        'oban_nathan': {
            name: 'Nathan',
            role: 'Team OBN',
            park: 'Oban Holiday Park',
            accessCode: '1020003',
            type: 'individual'
        },
        
        // Tyndrum Individual Team Members (1030xxx)
        'tyndrum_alasdair': {
            name: 'Alasdair Fraser', 
            role: 'Assistant Manager',
            park: 'Tyndrum Holiday Park',
            accessCode: '1030001',
            type: 'individual'
        },
        
        // Master Access
        'admin': {
            name: 'SafePark.PRO System Administrator',
            role: 'System Administrator',
            park: 'All Highland Holidays Parks',
            accessCode: 'CQR365SPP25',
            type: 'master'
        }
    },
    
    // Current test user (change this to test different scenarios)
    currentTestUser: 'bennevis_manager', // Default to Lesleyanne
    
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
            const newUser = this.testUsers[userKey];
            console.log(`Switched to test user: ${newUser.name} at ${newUser.park}`);
            
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
            role: this.testUsers[key].role,
            accessCode: this.testUsers[key].accessCode
        }));
    },
    
    // Find user by access code (useful for testing)
    getUserByAccessCode: function(accessCode) {
        for (const [key, user] of Object.entries(this.testUsers)) {
            if (user.accessCode === accessCode) {
                return user;
            }
        }
        return null;
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
console.log('SafePark Authentication Handler loaded (COMPLETE VERSION)');
console.log('Current test user:', window.SafeParkAuth.getCurrentUser().name);
console.log(`Total users available: ${Object.keys(window.SafeParkAuth.testUsers).length}`);
console.log('Available test users:', window.SafeParkAuth.getAvailableUsers());
console.log('To switch users, use: SafeParkAuth.switchTestUser("user_key")');
console.log('Example: SafeParkAuth.switchTestUser("oban_murray")');
