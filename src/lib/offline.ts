import { openDB, DBSchema, IDBPDatabase } from 'idb';

type OfflineSale = {
  id: string;
  shop_id: string;
  product_id: string;
  customer_id: string | null;
  quantity: number;
  total_price: number;
  payment_method: string;
  sale_date: string;
  synced: boolean;
};

type OfflineProduct = {
  id: string;
  shop_id: string;
  name: string;
  category?: string;
  quantity: number;
  price: number;
  purchase_price: number;
  selling_price: number;
  expiry_date?: string;
  is_regulated: boolean;
  barcode?: string;
  synced: boolean;
};

type OfflineCustomer = {
  id: string;
  shop_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  preferences?: string;
  synced: boolean;
};

interface AgrovetDB extends DBSchema {
  offlineSales: {
    key: string;
    value: OfflineSale;
    indexes: { 'by-shop': string; 'by-synced': boolean };
  };
  offlineProducts: {
    key: string;
    value: OfflineProduct;
    indexes: { 'by-shop': string; 'by-synced': boolean };
  };
  offlineCustomers: {
    key: string;
    value: OfflineCustomer;
    indexes: { 'by-shop': string; 'by-synced': boolean };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<AgrovetDB> | null = null;
  private readonly DB_NAME = 'agrovet-offline';
  private readonly VERSION = 2;

  async init() {
    if (!this.db) {
      this.db = await openDB<AgrovetDB>(this.DB_NAME, this.VERSION, {
        upgrade(db) {
          // Create offline sales store if it doesn't exist
          if (!db.objectStoreNames.contains('offlineSales')) {
            const salesStore = db.createObjectStore('offlineSales', { keyPath: 'id' });
            salesStore.createIndex('by-shop', 'shop_id');
            salesStore.createIndex('by-synced', 'synced');
          }
          // Create offline products store if it doesn't exist
          if (!db.objectStoreNames.contains('offlineProducts')) {
            const productsStore = db.createObjectStore('offlineProducts', { keyPath: 'id' });
            productsStore.createIndex('by-shop', 'shop_id');
            productsStore.createIndex('by-synced', 'synced');
          }
          // Create offline customers store if it doesn't exist
          if (!db.objectStoreNames.contains('offlineCustomers')) {
            const customersStore = db.createObjectStore('offlineCustomers', { keyPath: 'id' });
            customersStore.createIndex('by-shop', 'shop_id');
            customersStore.createIndex('by-synced', 'synced');
          }
        },
      });
    }
    return this.db;
  }

  // Sales methods
  async saveOfflineSale(sale: Omit<OfflineSale, 'synced'>) {
    const db = await this.init();
    
    // Validate the sale data
    if (!sale.id || !sale.shop_id || !sale.product_id || !sale.quantity || 
        typeof sale.total_price !== 'number' || isNaN(sale.total_price)) {
      console.error('Invalid sale data:', sale);
      throw new Error('Invalid sale data: missing required fields or invalid total_price');
    }

    await db.put('offlineSales', { ...sale, synced: false });
  }

  async deleteUnsyncedSales() {
    const db = await this.init();
    const tx = db.transaction('offlineSales', 'readwrite');
    const store = tx.store;
    
    // Get all sales
    const allSales = await store.getAll();
    
    // Filter and delete unsynced sales
    const unsyncedSales = allSales.filter(sale => !sale.synced);
    for (const sale of unsyncedSales) {
      await store.delete(sale.id);
    }
    
    await tx.done;
  }

  async getOfflineSales(shopId: string) {
    const db = await this.init();
    const tx = db.transaction('offlineSales', 'readonly');
    const index = tx.store.index('by-shop');
    return index.getAll(shopId);
  }

  async getUnsyncedSales() {
    const db = await this.init();
    const tx = db.transaction('offlineSales', 'readonly');
    const store = tx.store;
    const allSales = await store.getAll();
    return allSales.filter(sale => !sale.synced);
  }

  async markSaleAsSynced(saleId: string) {
    const db = await this.init();
    const sale = await db.get('offlineSales', saleId);
    if (sale) {
      await db.put('offlineSales', { ...sale, synced: true });
    }
  }

  // Products methods
  async saveOfflineProduct(product: Omit<OfflineProduct, 'synced'>) {
    const db = await this.init();
    await db.put('offlineProducts', { ...product, synced: false });
  }

  async getOfflineProducts(shopId: string) {
    const db = await this.init();
    const tx = db.transaction('offlineProducts', 'readonly');
    const index = tx.store.index('by-shop');
    return index.getAll(shopId);
  }

  async getUnsyncedProducts() {
    const db = await this.init();
    const tx = db.transaction('offlineProducts', 'readonly');
    const store = tx.store;
    const allProducts = await store.getAll();
    return allProducts.filter(product => !product.synced);
  }

  async markProductAsSynced(productId: string) {
    const db = await this.init();
    const product = await db.get('offlineProducts', productId);
    if (product) {
      await db.put('offlineProducts', { ...product, synced: true });
    }
  }

  // Customers methods
  async saveOfflineCustomer(customer: Omit<OfflineCustomer, 'synced'>) {
    const db = await this.init();
    await db.put('offlineCustomers', { ...customer, synced: false });
  }

  async getOfflineCustomers(shopId: string) {
    const db = await this.init();
    const tx = db.transaction('offlineCustomers', 'readonly');
    const index = tx.store.index('by-shop');
    return index.getAll(shopId);
  }

  async getUnsyncedCustomers() {
    const db = await this.init();
    const tx = db.transaction('offlineCustomers', 'readonly');
    const store = tx.store;
    const allCustomers = await store.getAll();
    return allCustomers.filter(customer => !customer.synced);
  }

  async markCustomerAsSynced(customerId: string) {
    const db = await this.init();
    const customer = await db.get('offlineCustomers', customerId);
    if (customer) {
      await db.put('offlineCustomers', { ...customer, synced: true });
    }
  }

  async updateOfflineCustomer(customerId: string, updates: Partial<OfflineCustomer>) {
    const db = await this.init();
    const customer = await db.get('offlineCustomers', customerId);
    if (customer) {
      await db.put('offlineCustomers', { ...customer, ...updates, synced: false });
    }
  }

  async deleteOfflineCustomer(customerId: string) {
    const db = await this.init();
    await db.delete('offlineCustomers', customerId);
  }
}

export const offlineStorage = new OfflineStorage(); 