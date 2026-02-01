// Type definitions for ists-protocol
// Project: https://github.com/yourusername/ists-protocol
// Definitions by: ISTS Protocol Contributors

export = ISTS;
export as namespace ISTS;

declare class ISTS {
    constructor(options?: ISTS.ISTSOptions);

    /**
     * Compress text data using global ledger deduplication
     */
    compressText(text: string): ISTS.TextCompressionResult;

    /**
     * Decompress text data
     */
    decompressText(compressed: string): string;

    /**
     * Compress image file
     */
    compressImage(
        file: File | Blob,
        options?: ISTS.ImageCompressionOptions
    ): Promise<ISTS.ImageCompressionResult>;

    /**
     * Decompress image data to Data URL
     */
    decompressImage(compressed: string, mime?: string): string;

    /**
     * Save global ledger to IndexedDB
     */
    saveLedger(): Promise<void>;

    /**
     * Load global ledger from IndexedDB
     */
    loadLedger(): Promise<void>;

    /**
     * Get compression statistics
     */
    getStats(): ISTS.CompressionStats;

    /**
     * Clear all stored data and reset ledger
     */
    clearStorage(): Promise<void>;

    /**
     * Storage interface for direct IndexedDB access
     */
    storage: ISTS.ISTSStorage;

    /**
     * Core compression engine
     */
    core: ISTS.ISTSCore;

    /**
     * Format bytes to human-readable string
     */
    static formatBytes(bytes: number): string;

    /**
     * Calculate compression ratio percentage
     */
    static calculateCompressionRatio(original: number, compressed: number): number;
}

declare namespace ISTS {
    interface ISTSOptions {
        /**
         * IndexedDB database name
         * @default 'ISTS_Storage'
         */
        dbName?: string;

        /**
         * IndexedDB object store name
         * @default 'keyval'
         */
        storeName?: string;

        /**
         * Key for storing global ledger
         * @default 'ISTS_GLOBAL_LEDGER'
         */
        ledgerKey?: string;
    }

    interface TextCompressionResult {
        /**
         * Compressed data string
         */
        compressed: string;

        /**
         * Original size in bytes
         */
        originalSize: number;

        /**
         * Compressed size in bytes
         */
        compressedSize: number;

        /**
         * Compression savings percentage
         */
        savingsPercent: number;

        /**
         * Number of tokens in text
         */
        tokenCount: number;
    }

    interface ImageCompressionOptions {
        /**
         * WebP quality (0-1)
         * @default 0.85
         */
        quality?: number;

        /**
         * Maximum dimension (width or height)
         * @default 3840
         */
        maxDimension?: number;

        /**
         * Output image format
         * @default 'image/webp'
         */
        format?: string;
    }

    interface ImageCompressionResult {
        /**
         * Compressed image data
         */
        compressed: string;

        /**
         * MIME type
         */
        mime: string;

        /**
         * Image width
         */
        width: number;

        /**
         * Image height
         */
        height: number;

        /**
         * Original file size in bytes
         */
        originalSize: number;

        /**
         * Compressed size in bytes
         */
        compressedSize: number;

        /**
         * Compression savings percentage
         */
        savingsPercent: number;
    }

    interface CompressionStats {
        /**
         * Number of entries in global ledger
         */
        entries: number;

        /**
         * Ledger size in bytes
         */
        size: number;
    }

    interface ISTSStorage {
        /**
         * Get value from IndexedDB
         */
        get(key: string): Promise<any>;

        /**
         * Set value in IndexedDB
         */
        set(key: string, value: any): Promise<void>;

        /**
         * Remove value from IndexedDB
         */
        remove(key: string): Promise<void>;

        /**
         * Get all entries from IndexedDB
         */
        getAll(): Promise<Array<{ key: string; value: any }>>;

        /**
         * Clear all data from IndexedDB
         */
        clear(): Promise<void>;
    }

    interface ISTSCore {
        /**
         * Global token ledger
         */
        globalLedger: string[];

        /**
         * Token to index mapping
         */
        ledgerMap: { [token: string]: number };

        /**
         * Vectorize text using global ledger
         */
        vectorizeText(text: string): { c: string; l: number };

        /**
         * Reconstruct text from coefficients
         */
        reconstructText(compressedCoeffs: string): string;

        /**
         * Serialize ledger for storage
         */
        serializeLedger(): string;

        /**
         * Deserialize ledger from storage
         */
        deserializeLedger(compressed: string): void;

        /**
         * Get ledger statistics
         */
        getLedgerStats(): CompressionStats;
    }
}
