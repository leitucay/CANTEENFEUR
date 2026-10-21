(function() {
    "use strict";

    const DATABASE_NAME = "feuCanteenRentalReceipts";
    const STORE_NAME = "receipts";
    let databasePromise;

    function openDatabase() {
        if (!window.indexedDB) {
            return Promise.reject(new Error("Receipt storage is unavailable in this browser."));
        }
        if (!databasePromise) {
            databasePromise = new Promise(function(resolve, reject) {
                const request = window.indexedDB.open(DATABASE_NAME, 1);
                request.onupgradeneeded = function() {
                    request.result.createObjectStore(STORE_NAME);
                };
                request.onsuccess = function() { resolve(request.result); };
                request.onerror = function() { reject(request.error || new Error("Could not open receipt storage.")); };
            }).catch(function(error) {
                databasePromise = null;
                throw error;
            });
        }
        return databasePromise;
    }

    function receiptKey(ownerId, month) {
        return String(ownerId) + ":" + String(month);
    }

    function save(ownerId, month, file) {
        return openDatabase().then(function(database) {
            return new Promise(function(resolve, reject) {
                const transaction = database.transaction(STORE_NAME, "readwrite");
                transaction.objectStore(STORE_NAME).put({
                    blob: file,
                    fileName: file.name,
                    mimeType: file.type,
                    uploadedAt: new Date().toISOString()
                }, receiptKey(ownerId, month));
                transaction.oncomplete = resolve;
                transaction.onerror = function() { reject(transaction.error || new Error("Could not save the receipt.")); };
                transaction.onabort = function() { reject(transaction.error || new Error("Could not save the receipt.")); };
            });
        });
    }

    function get(ownerId, month) {
        return openDatabase().then(function(database) {
            return new Promise(function(resolve, reject) {
                const request = database.transaction(STORE_NAME, "readonly")
                    .objectStore(STORE_NAME)
                    .get(receiptKey(ownerId, month));
                request.onsuccess = function() { resolve(request.result || null); };
                request.onerror = function() { reject(request.error || new Error("Could not load the receipt.")); };
            });
        });
    }

    function remove(ownerId, month) {
        return openDatabase().then(function(database) {
            return new Promise(function(resolve, reject) {
                const transaction = database.transaction(STORE_NAME, "readwrite");
                transaction.objectStore(STORE_NAME).delete(receiptKey(ownerId, month));
                transaction.oncomplete = resolve;
                transaction.onerror = function() { reject(transaction.error || new Error("Could not remove the receipt.")); };
                transaction.onabort = function() { reject(transaction.error || new Error("Could not remove the receipt.")); };
            });
        });
    }

    function removeOwner(ownerId) {
        const prefix = String(ownerId) + ":";
        return openDatabase().then(function(database) {
            return new Promise(function(resolve, reject) {
                const transaction = database.transaction(STORE_NAME, "readwrite");
                const cursorRequest = transaction.objectStore(STORE_NAME).openCursor();
                cursorRequest.onsuccess = function() {
                    const cursor = cursorRequest.result;
                    if (!cursor) return;
                    if (String(cursor.key).startsWith(prefix)) cursor.delete();
                    cursor.continue();
                };
                transaction.oncomplete = resolve;
                transaction.onerror = function() { reject(transaction.error || new Error("Could not remove the owner's receipts.")); };
                transaction.onabort = function() { reject(transaction.error || new Error("Could not remove the owner's receipts.")); };
            });
        });
    }

    window.RentPaymentReceipts = {save:save, get:get, remove:remove, removeOwner:removeOwner};
})();
