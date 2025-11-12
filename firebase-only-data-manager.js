        // Firebase-ONLY Data Management Class - NO localStorage
        class FirebaseDataManager {
            constructor() {
                // NO localStorage prefix - Firebase-only system
                this.firebaseReady = false;
                this.db = null;
                this.initFirebase();
                
                console.log('🔥 Firebase-ONLY Data Manager initialized');
                console.log('🚫 NO localStorage fallback - Firebase is required');
            }
            
            initFirebase() {
                const checkFirebase = () => {
                    if (window.firebaseDb && window.firebaseInitialized) {
                        this.db = window.firebaseDb;
                        this.firebaseReady = true;
                        console.log('✅ Data Manager connected to standardized Firebase');
                    } else if (window.db) {
                        this.db = window.db;
                        this.firebaseReady = true;
                        console.log('✅ Data Manager connected to legacy Firebase reference');
                    } else {
                        setTimeout(checkFirebase, 100);
                    }
                };
                checkFirebase();
            }

            checkFirebaseReady() {
                if (!this.firebaseReady || !this.db) {
                    throw new Error('🔥 Firebase required for SafePark system. NO localStorage fallback available.');
                }
            }

            async saveData(collection, docId, data) {
                this.checkFirebaseReady();
                
                try {
                    await this.db.collection(collection).doc(docId).set({
                        ...data,
                        lastSynced: new Date().toISOString(),
                        source: 'dashboard-firebase-only'
                    });
                    console.log(`✅ Data saved to Firebase: ${collection}/${docId}`);
                    return true;
                } catch (error) {
                    console.error(`❌ Firebase save failed: ${collection}/${docId}`, error);
                    throw error; // NO localStorage fallback - fail fast
                }
            }

            async loadData(collection, docId) {
                this.checkFirebaseReady();
                
                try {
                    const doc = await this.db.collection(collection).doc(docId).get();
                    if (doc.exists) {
                        const firebaseData = doc.data();
                        console.log(`✅ Data loaded from Firebase: ${collection}/${docId}`);
                        return firebaseData;
                    } else {
                        console.log(`ℹ️ Document not found in Firebase: ${collection}/${docId}`);
                        return null;
                    }
                } catch (error) {
                    console.error(`❌ Firebase load failed: ${collection}/${docId}`, error);
                    throw error; // NO localStorage fallback - fail fast
                }
            }

            async syncToFirebase() {
                // This method is now redundant since we only use Firebase
                // But keeping for compatibility with existing code
                console.log('ℹ️ Sync method called - but all data is already in Firebase-only');
                return Promise.resolve();
            }
            
            // REMOVED METHODS (no longer needed):
            // - saveToLocalStorage
            // - loadFromLocalStorage  
            // - Any localStorage operations
        }

        // Initialize Firebase-ONLY Data Manager
        const dataManager = new FirebaseDataManager();

        // FIREBASE-ONLY function to clear SafePark data
        async function clearAllSafeParkData() {
            try {
                console.log('🗑️ Clearing SafePark data from Firebase...');
                
                // Instead of clearing localStorage, we could optionally clear Firebase collections
                // But this is typically not needed in production
                console.log('⚠️ Firebase data clearing not implemented - use Firebase console for admin operations');
                
                // Reset in-memory data only
                dashboardChecks = [];
                equipmentRegistry = {};
                dailyTiles = [];
                complianceModules = [];
                
                console.log('✅ In-memory SafePark data cleared');
                
                if (typeof refreshDashboardChecks === 'function') {
                    refreshDashboardChecks();
                }
            } catch (error) {
                console.error('❌ Error clearing SafePark data:', error);
            }
        }
