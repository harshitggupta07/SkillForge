/**
 * SkillForge Data Layer - IndexedDB Storage Architecture
 * Database: SkillForgeDB (version 1)
 *
 * Provides persistent browser-side client storage with full CRUD capabilities,
 * indexed queries, automatic ID generation, and seed data initialization.
 */

import {
  SEED_USERS,
  SKILLS_TAXONOMY,
  CURATED_COURSES,
  MARKET_TRENDS
} from './seed-data.js';

/**
 * Constant dictionary of object store names.
 */
export const STORES = Object.freeze({
  USERS: 'users',
  SKILLS_TAXONOMY: 'skills_taxonomy',
  ASSESSMENTS: 'assessments',
  QUIZZES: 'quizzes',
  QUIZ_ATTEMPTS: 'quiz_attempts',
  COURSES: 'courses',
  DOCUMENTS: 'documents',
  MARKET_TRENDS: 'market_trends',
  CV_PROFILES: 'cv_profiles',
  COURSE_PROGRESS: 'course_progress'
});

/**
 * IndexedDB wrapper class for the SkillForge application.
 */
export class SkillForgeDB {
  /**
   * Initializes database parameters.
   * @param {string} dbName - The name of the IndexedDB database.
   * @param {number} dbVersion - The schema version number.
   */
  constructor(dbName = 'SkillForgeDB', dbVersion = 1) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this.db = null;
    this._initPromise = null;
  }

  /**
   * Static helper to generate unique identifiers with a semantic prefix.
   * Format: <prefix>_<timestamp_base36>_<random_hex>
   * @param {string} prefix - Short domain prefix (e.g., 'usr', 'sk', 'crs').
   * @returns {string} Unique ID string.
   */
  static generateId(prefix = 'rec') {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${randomPart}`;
  }

  /**
   * Opens or returns the active IndexedDB connection.
   * Sets up all object stores and secondary indexes on initial creation or upgrade.
   * @returns {Promise<IDBDatabase>} Resolves with the active database instance.
   */
  async open() {
    if (this.db) {
      return this.db;
    }

    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. users store (keyPath: id)
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          const store = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
          store.createIndex('email', 'email', { unique: true });
          store.createIndex('role', 'role', { unique: false });
          store.createIndex('user_type', 'user_type', { unique: false });
        }

        // 2. skills_taxonomy store (keyPath: id)
        if (!db.objectStoreNames.contains(STORES.SKILLS_TAXONOMY)) {
          const store = db.createObjectStore(STORES.SKILLS_TAXONOMY, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('demand_level', 'demand_level', { unique: false });
        }

        // 3. assessments store (keyPath: id)
        if (!db.objectStoreNames.contains(STORES.ASSESSMENTS)) {
          const store = db.createObjectStore(STORES.ASSESSMENTS, { keyPath: 'id' });
          store.createIndex('user_id', 'user_id', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }

        // 4. quizzes store (keyPath: id)
        if (!db.objectStoreNames.contains(STORES.QUIZZES)) {
          const store = db.createObjectStore(STORES.QUIZZES, { keyPath: 'id' });
          store.createIndex('user_id', 'user_id', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }

        // 5. quiz_attempts store (keyPath: id)
        if (!db.objectStoreNames.contains(STORES.QUIZ_ATTEMPTS)) {
          const store = db.createObjectStore(STORES.QUIZ_ATTEMPTS, { keyPath: 'id' });
          store.createIndex('quiz_id', 'quiz_id', { unique: false });
          store.createIndex('user_id', 'user_id', { unique: false });
        }

        // 6. courses store (keyPath: id)
        if (!db.objectStoreNames.contains(STORES.COURSES)) {
          const store = db.createObjectStore(STORES.COURSES, { keyPath: 'id' });
          store.createIndex('provider', 'provider', { unique: false });
          store.createIndex('difficulty', 'difficulty', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }

        // 7. documents store (keyPath: id)
        if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
          const store = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
          store.createIndex('user_id', 'user_id', { unique: false });
          store.createIndex('uploaded_at', 'uploaded_at', { unique: false });
        }

        // 8. market_trends store (keyPath: id)
        if (!db.objectStoreNames.contains(STORES.MARKET_TRENDS)) {
          const store = db.createObjectStore(STORES.MARKET_TRENDS, { keyPath: 'id' });
          store.createIndex('domain', 'domain', { unique: false });
          store.createIndex('trend_direction', 'trend_direction', { unique: false });
        }

        // 9. cv_profiles store (keyPath: id)
        if (!db.objectStoreNames.contains(STORES.CV_PROFILES)) {
          const store = db.createObjectStore(STORES.CV_PROFILES, { keyPath: 'id' });
          store.createIndex('user_id', 'user_id', { unique: false });
        }

        // 10. course_progress store (keyPath: id)
        if (!db.objectStoreNames.contains(STORES.COURSE_PROGRESS)) {
          const store = db.createObjectStore(STORES.COURSE_PROGRESS, { keyPath: 'id' });
          store.createIndex('user_id', 'user_id', { unique: false });
          store.createIndex('course_id', 'course_id', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this._initPromise = null;

        this.db.onversionchange = () => {
          this.db.close();
          this.db = null;
        };

        this.db.onclose = () => {
          this.db = null;
        };

        resolve(this.db);
      };

      request.onerror = (event) => {
        this._initPromise = null;
        reject(new Error(`Failed to open IndexedDB '${this.dbName}': ${event.target.error?.message || 'Unknown error'}`));
      };

      request.onblocked = () => {
        this._initPromise = null;
        reject(new Error(`IndexedDB open request blocked for '${this.dbName}'. Close open tabs using previous database version.`));
      };
    });

    return this._initPromise;
  }

  /**
   * Closes active database connection.
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this._initPromise = null;
  }

  /**
   * Retrieves all records from an object store.
   * @param {string} storeName - Target object store name.
   * @returns {Promise<Array<object>>} Resolves with array of records.
   */
  async getAll(storeName) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to getAll from '${storeName}': ${request.error?.message}`));
    });
  }

  /**
   * Retrieves a single record by primary key id.
   * @param {string} storeName - Target object store name.
   * @param {string} id - Primary key value.
   * @returns {Promise<object|null>} Resolves with record or null if not found.
   */
  async getById(storeName, id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result !== undefined ? request.result : null);
      request.onerror = () => reject(new Error(`Failed to getById '${id}' from '${storeName}': ${request.error?.message}`));
    });
  }

  /**
   * Adds a new record to an object store.
   * Generates a unique id if not already present on the item.
   * @param {string} storeName - Target object store name.
   * @param {object} item - Record data to store.
   * @returns {Promise<string>} Resolves with the primary key id.
   */
  async add(storeName, item) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const record = { ...item };
      if (!record.id) {
        record.id = SkillForgeDB.generateId(storeName.slice(0, 3));
      }

      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(record);

      request.onsuccess = () => resolve(record.id);
      request.onerror = () => reject(new Error(`Failed to add record to '${storeName}': ${request.error?.message}`));
    });
  }

  /**
   * Inserts or replaces a record in an object store.
   * Generates a unique id if not already present on the item.
   * @param {string} storeName - Target object store name.
   * @param {object} item - Record data to store or replace.
   * @returns {Promise<string>} Resolves with the primary key id.
   */
  async put(storeName, item) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const record = { ...item };
      if (!record.id) {
        record.id = SkillForgeDB.generateId(storeName.slice(0, 3));
      }

      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(record);

      request.onsuccess = () => resolve(record.id);
      request.onerror = () => reject(new Error(`Failed to put record into '${storeName}': ${request.error?.message}`));
    });
  }

  /**
   * Updates an existing record by merging partial changes.
   * Throws an error if the record does not exist.
   * @param {string} storeName - Target object store name.
   * @param {string} id - Primary key value of the record to update.
   * @param {object} updates - Key-value map of properties to update.
   * @returns {Promise<object>} Resolves with the updated record.
   */
  async update(storeName, id, updates) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error(`Record with id '${id}' not found in store '${storeName}'.`));
          return;
        }

        const merged = { ...existing, ...updates, id };
        const putRequest = store.put(merged);

        putRequest.onsuccess = () => resolve(merged);
        putRequest.onerror = () => reject(new Error(`Failed to update record '${id}' in '${storeName}': ${putRequest.error?.message}`));
      };

      getRequest.onerror = () => {
        reject(new Error(`Failed to load record '${id}' for update in '${storeName}': ${getRequest.error?.message}`));
      };
    });
  }

  /**
   * Deletes a record by primary key id.
   * @param {string} storeName - Target object store name.
   * @param {string} id - Primary key value.
   * @returns {Promise<boolean>} Resolves true when deletion succeeds.
   */
  async delete(storeName, id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(new Error(`Failed to delete record '${id}' from '${storeName}': ${request.error?.message}`));
    });
  }

  /**
   * Queries records using a secondary index.
   * @param {string} storeName - Target object store name.
   * @param {string} indexName - Name of the index.
   * @param {*} [queryValue] - Value to filter by, or null/undefined to retrieve all indexed items.
   * @returns {Promise<Array<object>>} Resolves with array of matched records.
   */
  async queryByIndex(storeName, indexName, queryValue) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      if (!store.indexNames.contains(indexName)) {
        reject(new Error(`Index '${indexName}' does not exist on store '${storeName}'.`));
        return;
      }

      const index = store.index(indexName);
      const request = (queryValue !== undefined && queryValue !== null)
        ? index.getAll(queryValue)
        : index.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to query index '${indexName}' on '${storeName}': ${request.error?.message}`));
    });
  }

  /**
   * Counts the total number of records in an object store.
   * @param {string} storeName - Target object store name.
   * @returns {Promise<number>} Resolves with total record count.
   */
  async count(storeName) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to count records in '${storeName}': ${request.error?.message}`));
    });
  }

  /**
   * Clears all records from an object store.
   * @param {string} storeName - Target object store name.
   * @returns {Promise<boolean>} Resolves true when cleared.
   */
  async clearStore(storeName) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(new Error(`Failed to clear store '${storeName}': ${request.error?.message}`));
    });
  }

  /**
   * Seeds initial reference data (users, skills taxonomy, courses, market trends)
   * if the database is currently empty.
   * Runs atomically inside a single multi-store readwrite transaction.
   * @returns {Promise<object>} Status report with counts of seeded records.
   */
  async seedInitialDataIfEmpty() {
    await this.open();

    const usersCount = await this.count(STORES.USERS);
    const skillsCount = await this.count(STORES.SKILLS_TAXONOMY);

    if (usersCount > 0 && skillsCount > 0) {
      return {
        seeded: false,
        message: 'Initial data already present in database stores.'
      };
    }

    return new Promise((resolve, reject) => {
      const storesToSeed = [
        STORES.USERS,
        STORES.SKILLS_TAXONOMY,
        STORES.COURSES,
        STORES.MARKET_TRENDS
      ];

      const transaction = this.db.transaction(storesToSeed, 'readwrite');
      const usersStore = transaction.objectStore(STORES.USERS);
      const skillsStore = transaction.objectStore(STORES.SKILLS_TAXONOMY);
      const coursesStore = transaction.objectStore(STORES.COURSES);
      const trendsStore = transaction.objectStore(STORES.MARKET_TRENDS);

      if (usersCount === 0) {
        for (const user of SEED_USERS) {
          usersStore.put(user);
        }
      }

      if (skillsCount === 0) {
        for (const skill of SKILLS_TAXONOMY) {
          skillsStore.put(skill);
        }
        for (const course of CURATED_COURSES) {
          coursesStore.put(course);
        }
        for (const trend of MARKET_TRENDS) {
          trendsStore.put(trend);
        }
      }

      transaction.oncomplete = () => {
        resolve({
          seeded: true,
          counts: {
            users: SEED_USERS.length,
            skills_taxonomy: SKILLS_TAXONOMY.length,
            courses: CURATED_COURSES.length,
            market_trends: MARKET_TRENDS.length
          }
        });
      };

      transaction.onerror = () => {
        reject(new Error(`Database seeding transaction failed: ${transaction.error?.message || 'Unknown error'}`));
      };
    });
  }
}

/**
 * Singleton database service instance.
 */
export const skillForgeDB = new SkillForgeDB();

export default skillForgeDB;
