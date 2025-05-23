'use client'

import { offlineStorage } from './offline';
import { createBrowserClient } from '@supabase/ssr';

class SyncService {
  private isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private isDev = process.env.NODE_ENV === 'development';
  private isSyncing = false;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    this.startPeriodicSync = this.startPeriodicSync.bind(this);
    this.stopPeriodicSync = this.stopPeriodicSync.bind(this);
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.startPeriodicSync();
    this.startSyncProcess();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.stopPeriodicSync();
  };

  startPeriodicSync() {
    if (this.syncInterval) {
      return;
    }

    // In development mode, sync more frequently
    const interval = this.isDev ? 10000 : 30000; // 10s in dev, 30s in prod
    this.syncInterval = setInterval(() => {
      this.startSyncProcess();
    }, interval);
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async startSyncProcess() {
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    this.retryCount = 0;

    try {
      const unsyncedSales = await offlineStorage.getUnsyncedSales();

      // Filter out invalid sales
      const validSales = unsyncedSales.filter(sale => {
        const isValid = sale.id && 
                       sale.shop_id && 
                       sale.product_id && 
                       sale.quantity && 
                       typeof sale.total_price === 'number' && 
                       !isNaN(sale.total_price);
        return isValid;
      });

      for (const sale of validSales) {
        try {
          await this.syncSale(sale);
        } catch {
          if (this.retryCount < this.MAX_RETRIES) {
            this.retryCount++;
            await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
            continue;
          }
          break;
        }
      }
    } catch {
      // Silent error handling
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncSale(sale: {
    id: string;
    shop_id: string;
    product_id: string;
    customer_id: string | null;
    quantity: number;
    total_price: number;
    payment_method: string;
    sale_date: string;
  }) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
      // Validate required fields
      if (!sale.id || !sale.shop_id || !sale.product_id || !sale.quantity || typeof sale.total_price !== 'number') {
        throw new Error('Invalid sale data: missing required fields');
      }

      // First check if the sale already exists
      const { data: existingSale, error: checkError } = await supabase
        .from('sales')
        .select('id')
        .eq('id', sale.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingSale) {
        await offlineStorage.markSaleAsSynced(sale.id);
        return;
      }

      // Prepare sale data with required fields and proper types
      const saleData = {
        id: sale.id,
        shop_id: sale.shop_id,
        product_id: sale.product_id,
        customer_id: sale.customer_id || null,
        quantity: Number(sale.quantity),
        total_price: Number(sale.total_price),
        payment_method: sale.payment_method || 'cash',
        sale_date: sale.sale_date || new Date().toISOString().split('T')[0]
      };

      // If sale doesn't exist, insert it
      const { data: insertedSale, error: insertError } = await supabase
        .from('sales')
        .insert([saleData])  // Wrap in array as per Supabase requirements
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          await offlineStorage.markSaleAsSynced(sale.id);
          return;
        }
        throw insertError;
      }

      if (!insertedSale) {
        throw new Error('No data returned after successful insert');
      }

      // Update product quantity
      const { data: newQuantity, error: rpcError } = await supabase
        .rpc('decrement_quantity', {
          p_product_id: sale.product_id,
          p_quantity: sale.quantity
        });

      if (rpcError) {
        throw rpcError;
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('id', sale.product_id);

      if (updateError) {
        throw updateError;
      }

      // Mark sale as synced
      await offlineStorage.markSaleAsSynced(sale.id);
    } catch (error) {
      throw error;
    }
  }

  // Add method to clean up invalid sales
  async cleanupInvalidSales() {
    try {
      await offlineStorage.deleteUnsyncedSales();
    } catch (error) {
      throw error;
    }
  }

  isConnected() {
    return this.isOnline;
  }
}

export const syncService = new SyncService(); 