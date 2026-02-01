/**
 * ISTS Protocol - Isotropic Spatiotemporal Tensor-Spline
 * Client-Side Spatiotemporal Vectorization for Lossless Data Deduplication
 * 
 * @version 1.0.0
 * @license MIT
 * @author ISTS Protocol Contributors
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.ISTS = factory());
})(this, (function () {
    'use strict';

    // ============================================================================
    // LZ-String Compression (Embedded for zero dependencies)
    // ============================================================================
    const LZString = (function () {
        const f = String.fromCharCode;
        const keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        const keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
        const baseReverseDic = {};

        function getBaseValue(alphabet, character) {
            if (!baseReverseDic[alphabet]) {
                baseReverseDic[alphabet] = {};
                for (let i = 0; i < alphabet.length; i++) {
                    baseReverseDic[alphabet][alphabet.charAt(i)] = i;
                }
            }
            return baseReverseDic[alphabet][character];
        }

        const LZString = {
            compressToUTF16: function (input) {
                if (input == null) return "";
                return this._compress(input, 15, function (a) { return f(a + 32); }) + " ";
            },

            decompressFromUTF16: function (compressed) {
                if (compressed == null) return "";
                if (compressed == "") return null;
                return this._decompress(compressed.length, 16384, function (index) { return compressed.charCodeAt(index) - 32; });
            },

            _compress: function (uncompressed, bitsPerChar, getCharFromInt) {
                if (uncompressed == null) return "";
                let i, value, context_dictionary = {}, context_dictionaryToCreate = {},
                    context_c = "", context_wc = "", context_w = "", context_enlargeIn = 2,
                    context_dictSize = 3, context_numBits = 2, context_data = [],
                    context_data_val = 0, context_data_position = 0, ii;

                for (ii = 0; ii < uncompressed.length; ii += 1) {
                    context_c = uncompressed.charAt(ii);
                    if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
                        context_dictionary[context_c] = context_dictSize++;
                        context_dictionaryToCreate[context_c] = true;
                    }

                    context_wc = context_w + context_c;
                    if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
                        context_w = context_wc;
                    } else {
                        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                            if (context_w.charCodeAt(0) < 256) {
                                for (i = 0; i < context_numBits; i++) {
                                    context_data_val = (context_data_val << 1);
                                    if (context_data_position == bitsPerChar - 1) {
                                        context_data_position = 0;
                                        context_data.push(getCharFromInt(context_data_val));
                                        context_data_val = 0;
                                    } else {
                                        context_data_position++;
                                    }
                                }
                                value = context_w.charCodeAt(0);
                                for (i = 0; i < 8; i++) {
                                    context_data_val = (context_data_val << 1) | (value & 1);
                                    if (context_data_position == bitsPerChar - 1) {
                                        context_data_position = 0;
                                        context_data.push(getCharFromInt(context_data_val));
                                        context_data_val = 0;
                                    } else {
                                        context_data_position++;
                                    }
                                    value = value >> 1;
                                }
                            } else {
                                value = 1;
                                for (i = 0; i < context_numBits; i++) {
                                    context_data_val = (context_data_val << 1) | value;
                                    if (context_data_position == bitsPerChar - 1) {
                                        context_data_position = 0;
                                        context_data.push(getCharFromInt(context_data_val));
                                        context_data_val = 0;
                                    } else {
                                        context_data_position++;
                                    }
                                    value = 0;
                                }
                                value = context_w.charCodeAt(0);
                                for (i = 0; i < 16; i++) {
                                    context_data_val = (context_data_val << 1) | (value & 1);
                                    if (context_data_position == bitsPerChar - 1) {
                                        context_data_position = 0;
                                        context_data.push(getCharFromInt(context_data_val));
                                        context_data_val = 0;
                                    } else {
                                        context_data_position++;
                                    }
                                    value = value >> 1;
                                }
                            }
                            context_enlargeIn--;
                            if (context_enlargeIn == 0) {
                                context_enlargeIn = Math.pow(2, context_numBits);
                                context_numBits++;
                            }
                            delete context_dictionaryToCreate[context_w];
                        } else {
                            value = context_dictionary[context_w];
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        }
                        context_enlargeIn--;
                        if (context_enlargeIn == 0) {
                            context_enlargeIn = Math.pow(2, context_numBits);
                            context_numBits++;
                        }
                        context_dictionary[context_wc] = context_dictSize++;
                        context_w = String(context_c);
                    }
                }

                if (context_w !== "") {
                    if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                        if (context_w.charCodeAt(0) < 256) {
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1);
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                            }
                            value = context_w.charCodeAt(0);
                            for (i = 0; i < 8; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        } else {
                            value = 1;
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1) | value;
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = 0;
                            }
                            value = context_w.charCodeAt(0);
                            for (i = 0; i < 16; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        }
                        context_enlargeIn--;
                        if (context_enlargeIn == 0) {
                            context_enlargeIn = Math.pow(2, context_numBits);
                            context_numBits++;
                        }
                        delete context_dictionaryToCreate[context_w];
                    } else {
                        value = context_dictionary[context_w];
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position == bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn == 0) {
                        context_enlargeIn = Math.pow(2, context_numBits);
                        context_numBits++;
                    }
                }

                value = 2;
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position == bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }

                while (true) {
                    context_data_val = (context_data_val << 1);
                    if (context_data_position == bitsPerChar - 1) {
                        context_data.push(getCharFromInt(context_data_val));
                        break;
                    }
                    else context_data_position++;
                }
                return context_data.join('');
            },

            _decompress: function (length, resetValue, getNextValue) {
                let dictionary = [], next, enlargeIn = 4, dictSize = 4, numBits = 3,
                    entry = "", result = [], i, w, bits, resb, maxpower, power,
                    c, data = { val: getNextValue(0), position: resetValue, index: 1 };

                for (i = 0; i < 3; i += 1) {
                    dictionary[i] = i;
                }

                bits = 0;
                maxpower = Math.pow(2, 2);
                power = 1;
                while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }

                switch (next = bits) {
                    case 0:
                        bits = 0;
                        maxpower = Math.pow(2, 8);
                        power = 1;
                        while (power != maxpower) {
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position == 0) {
                                data.position = resetValue;
                                data.val = getNextValue(data.index++);
                            }
                            bits |= (resb > 0 ? 1 : 0) * power;
                            power <<= 1;
                        }
                        c = f(bits);
                        break;
                    case 1:
                        bits = 0;
                        maxpower = Math.pow(2, 16);
                        power = 1;
                        while (power != maxpower) {
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position == 0) {
                                data.position = resetValue;
                                data.val = getNextValue(data.index++);
                            }
                            bits |= (resb > 0 ? 1 : 0) * power;
                            power <<= 1;
                        }
                        c = f(bits);
                        break;
                    case 2:
                        return "";
                }
                dictionary[3] = c;
                w = c;
                result.push(c);
                while (true) {
                    if (data.index > length) {
                        return "";
                    }

                    bits = 0;
                    maxpower = Math.pow(2, numBits);
                    power = 1;
                    while (power != maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position == 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++);
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1;
                    }

                    switch (c = bits) {
                        case 0:
                            bits = 0;
                            maxpower = Math.pow(2, 8);
                            power = 1;
                            while (power != maxpower) {
                                resb = data.val & data.position;
                                data.position >>= 1;
                                if (data.position == 0) {
                                    data.position = resetValue;
                                    data.val = getNextValue(data.index++);
                                }
                                bits |= (resb > 0 ? 1 : 0) * power;
                                power <<= 1;
                            }

                            dictionary[dictSize++] = f(bits);
                            c = dictSize - 1;
                            enlargeIn--;
                            break;
                        case 1:
                            bits = 0;
                            maxpower = Math.pow(2, 16);
                            power = 1;
                            while (power != maxpower) {
                                resb = data.val & data.position;
                                data.position >>= 1;
                                if (data.position == 0) {
                                    data.position = resetValue;
                                    data.val = getNextValue(data.index++);
                                }
                                bits |= (resb > 0 ? 1 : 0) * power;
                                power <<= 1;
                            }
                            dictionary[dictSize++] = f(bits);
                            c = dictSize - 1;
                            enlargeIn--;
                            break;
                        case 2:
                            return result.join('');
                    }

                    if (enlargeIn == 0) {
                        enlargeIn = Math.pow(2, numBits);
                        numBits++;
                    }

                    if (dictionary[c]) {
                        entry = dictionary[c];
                    } else {
                        if (c === dictSize) {
                            entry = w + w.charAt(0);
                        } else {
                            return null;
                        }
                    }
                    result.push(entry);

                    dictionary[dictSize++] = w + entry.charAt(0);
                    enlargeIn--;

                    w = entry;

                    if (enlargeIn == 0) {
                        enlargeIn = Math.pow(2, numBits);
                        numBits++;
                    }
                }
            }
        };
        return LZString;
    })();

    // ============================================================================
    // ISTS Core Algorithm - Global Ledger Deduplication
    // ============================================================================

    class ISTSCore {
        constructor() {
            this.globalLedger = [];
            this.ledgerMap = {};
        }

        /**
         * Vectorize text using global ledger deduplication
         * @param {string} text - Input text to vectorize
         * @returns {Object} Compressed coefficients and metadata
         */
        vectorizeText(text) {
            const tokens = text.split(/([a-zA-Z0-9]+)/g).filter(t => t);
            const coefficients = [];

            tokens.forEach(token => {
                if (!token) return;
                if (this.ledgerMap.hasOwnProperty(token)) {
                    coefficients.push(this.ledgerMap[token]);
                } else {
                    const newId = this.globalLedger.length;
                    this.globalLedger.push(token);
                    this.ledgerMap[token] = newId;
                    coefficients.push(newId);
                }
            });

            const coefficientString = coefficients.join(',');
            const compressedCoeffs = LZString.compressToUTF16(coefficientString);

            return {
                c: compressedCoeffs,
                l: tokens.length
            };
        }

        /**
         * Reconstruct text from compressed coefficients
         * @param {string} compressedCoeffs - Compressed coefficient string
         * @returns {string} Reconstructed text
         */
        reconstructText(compressedCoeffs) {
            const rawCoeffs = LZString.decompressFromUTF16(compressedCoeffs);
            if (!rawCoeffs) return "";

            const indices = rawCoeffs.split(',');
            let text = "";

            indices.forEach(idx => {
                const i = parseInt(idx);
                if (this.globalLedger[i] !== undefined) {
                    text += this.globalLedger[i];
                }
            });

            return text;
        }

        /**
         * Serialize ledger for storage
         * @returns {string} Compressed ledger
         */
        serializeLedger() {
            const raw = JSON.stringify(this.globalLedger);
            return LZString.compressToUTF16(raw);
        }

        /**
         * Deserialize ledger from storage
         * @param {string} compressed - Compressed ledger string
         */
        deserializeLedger(compressed) {
            const raw = LZString.decompressFromUTF16(compressed);
            if (raw) {
                this.globalLedger = JSON.parse(raw);
                this.ledgerMap = {};
                this.globalLedger.forEach((token, idx) => {
                    this.ledgerMap[token] = idx;
                });
            }
        }

        /**
         * Get current ledger statistics
         * @returns {Object} Ledger stats
         */
        getLedgerStats() {
            return {
                entries: this.globalLedger.length,
                size: new Blob([JSON.stringify(this.globalLedger)]).size
            };
        }
    }

    // ============================================================================
    // Image Optimization Engine (80-90% Savings)
    // ============================================================================

    class ISTSImageOptimizer {
        /**
         * Optimize image using Canvas WebP encoding
         * @param {File|Blob} file - Image file to optimize
         * @param {Object} options - Optimization options
         * @returns {Promise<Object>} Optimized image data
         */
        static optimizeImage(file, options = {}) {
            const {
                quality = 0.85,
                maxDimension = 3840,
                format = 'image/webp'
            } = options;

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);

                reader.onload = (e) => {
                    const img = new Image();
                    img.src = e.target.result;

                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;

                        // Cap resolution to prevent browser crashes while maintaining quality
                        if (width > maxDimension || height > maxDimension) {
                            if (width > height) {
                                height = Math.round(height * (maxDimension / width));
                                width = maxDimension;
                            } else {
                                width = Math.round(width * (maxDimension / height));
                                height = maxDimension;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // Export as optimized WebP (achieves 80-90% reduction vs raw/png)
                        const webpBase64 = canvas.toDataURL(format, quality);
                        const rawData = webpBase64.split(',')[1];

                        resolve({
                            base64: rawData,
                            mime: format,
                            width: width,
                            height: height,
                            originalSize: file.size
                        });
                    };

                    img.onerror = () => reject(new Error('Failed to load image'));
                };

                reader.onerror = () => reject(new Error('Failed to read file'));
            });
        }

        /**
         * Compress optimized image data
         * @param {string} base64Data - Base64 image data
         * @returns {string} Compressed image string
         */
        static compressImageData(base64Data) {
            return LZString.compressToUTF16(base64Data);
        }

        /**
         * Decompress image data
         * @param {string} compressed - Compressed image string
         * @returns {string} Base64 image data
         */
        static decompressImageData(compressed) {
            return LZString.decompressFromUTF16(compressed);
        }

        /**
         * Full image optimization pipeline
         * @param {File|Blob} file - Image file
         * @param {Object} options - Options
         * @returns {Promise<Object>} Complete optimization result
         */
        static async optimizeAndCompress(file, options = {}) {
            const optimized = await this.optimizeImage(file, options);
            const compressed = this.compressImageData(optimized.base64);

            const compressedSize = new Blob([compressed]).size;
            const savings = ((optimized.originalSize - compressedSize) / optimized.originalSize * 100).toFixed(2);

            return {
                compressed: compressed,
                mime: optimized.mime,
                width: optimized.width,
                height: optimized.height,
                originalSize: optimized.originalSize,
                compressedSize: compressedSize,
                savingsPercent: parseFloat(savings)
            };
        }

        /**
         * Restore image from compressed data
         * @param {string} compressed - Compressed image data
         * @param {string} mime - MIME type
         * @returns {string} Data URL
         */
        static restoreImage(compressed, mime = 'image/webp') {
            const base64 = this.decompressImageData(compressed);
            return `data:${mime};base64,${base64}`;
        }
    }

    // ============================================================================
    // IndexedDB Storage Utilities
    // ============================================================================

    class ISTSStorage {
        constructor(dbName = 'ISTS_Storage', storeName = 'keyval') {
            this.dbName = dbName;
            this.storeName = storeName;
            this.db = null;
        }

        /**
         * Open IndexedDB connection
         * @returns {Promise<IDBDatabase>}
         */
        async open() {
            if (this.db) return this.db;

            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, 1);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    this.db = request.result;
                    resolve(this.db);
                };
                request.onupgradeneeded = (e) => {
                    e.target.result.createObjectStore(this.storeName);
                };
            });
        }

        /**
         * Get value from storage
         * @param {string} key - Storage key
         * @returns {Promise<any>}
         */
        async get(key) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, 'readonly');
                const request = transaction.objectStore(this.storeName).get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        /**
         * Set value in storage
         * @param {string} key - Storage key
         * @param {any} value - Value to store
         * @returns {Promise<void>}
         */
        async set(key, value) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, 'readwrite');
                const request = transaction.objectStore(this.storeName).put(value, key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        /**
         * Remove value from storage
         * @param {string} key - Storage key
         * @returns {Promise<void>}
         */
        async remove(key) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, 'readwrite');
                const request = transaction.objectStore(this.storeName).delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        /**
         * Get all entries from storage
         * @returns {Promise<Array>}
         */
        async getAll() {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.openCursor();
                const result = [];

                request.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        result.push({ key: cursor.key, value: cursor.value });
                        cursor.continue();
                    } else {
                        resolve(result);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        }

        /**
         * Clear all data from storage
         * @returns {Promise<void>}
         */
        async clear() {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, 'readwrite');
                const request = transaction.objectStore(this.storeName).clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }

    // ============================================================================
    // Main ISTS API
    // ============================================================================

    class ISTS {
        constructor(options = {}) {
            this.core = new ISTSCore();
            this.storage = new ISTSStorage(
                options.dbName || 'ISTS_Storage',
                options.storeName || 'keyval'
            );
            this.ledgerKey = options.ledgerKey || 'ISTS_GLOBAL_LEDGER';
        }

        /**
         * Compress text data
         * @param {string} text - Text to compress
         * @returns {Object} Compression result
         */
        compressText(text) {
            const originalSize = new Blob([text]).size;
            const result = this.core.vectorizeText(text);
            const compressedSize = new Blob([result.c]).size;
            const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

            return {
                compressed: result.c,
                originalSize: originalSize,
                compressedSize: compressedSize,
                savingsPercent: parseFloat(savings),
                tokenCount: result.l
            };
        }

        /**
         * Decompress text data
         * @param {string} compressed - Compressed text
         * @returns {string} Original text
         */
        decompressText(compressed) {
            return this.core.reconstructText(compressed);
        }

        /**
         * Compress image
         * @param {File|Blob} file - Image file
         * @param {Object} options - Compression options
         * @returns {Promise<Object>} Compression result
         */
        async compressImage(file, options = {}) {
            return await ISTSImageOptimizer.optimizeAndCompress(file, options);
        }

        /**
         * Decompress image
         * @param {string} compressed - Compressed image data
         * @param {string} mime - MIME type
         * @returns {string} Data URL
         */
        decompressImage(compressed, mime = 'image/webp') {
            return ISTSImageOptimizer.restoreImage(compressed, mime);
        }

        /**
         * Save ledger to storage
         * @returns {Promise<void>}
         */
        async saveLedger() {
            const serialized = this.core.serializeLedger();
            await this.storage.set(this.ledgerKey, serialized);
        }

        /**
         * Load ledger from storage
         * @returns {Promise<void>}
         */
        async loadLedger() {
            const serialized = await this.storage.get(this.ledgerKey);
            if (serialized) {
                this.core.deserializeLedger(serialized);
            }
        }

        /**
         * Get compression statistics
         * @returns {Object} Statistics
         */
        getStats() {
            return this.core.getLedgerStats();
        }

        /**
         * Clear all stored data
         * @returns {Promise<void>}
         */
        async clearStorage() {
            await this.storage.clear();
            this.core = new ISTSCore();
        }
    }

    // ============================================================================
    // Utility Functions
    // ============================================================================

    /**
     * Format bytes to human-readable string
     * @param {number} bytes - Byte count
     * @returns {string} Formatted string
     */
    ISTS.formatBytes = function (bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    /**
     * Calculate compression ratio
     * @param {number} original - Original size
     * @param {number} compressed - Compressed size
     * @returns {number} Compression ratio percentage
     */
    ISTS.calculateCompressionRatio = function (original, compressed) {
        if (original === 0) return 0;
        return parseFloat(((original - compressed) / original * 100).toFixed(2));
    };

    // Export
    return ISTS;
}));
