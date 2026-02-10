import { eq, and, desc, sql } from "drizzle-orm";
import { customerDb } from "./customer-db.js";
import { customerAddresses, type InsertCustomerAddress, type CustomerAddress } from "../shared/customer-schema.js";
import { db } from "./db.js";
import { crmCustomers } from "../shared/schema.js";

export interface ICustomerAddressStorage {
  // Address management
  createAddress(addressData: InsertCustomerAddress): Promise<CustomerAddress>;
  getCustomerAddresses(customerId: number): Promise<CustomerAddress[]>;
  getAddressById(addressId: number): Promise<CustomerAddress | undefined>;
  updateAddress(addressId: number, addressData: Partial<InsertCustomerAddress>): Promise<CustomerAddress>;
  deleteAddress(addressId: number): Promise<void>;
  setDefaultAddress(customerId: number, addressId: number): Promise<void>;
}

export class CustomerAddressStorage implements ICustomerAddressStorage {
  async createAddress(addressData: InsertCustomerAddress): Promise<CustomerAddress> {
    try {
      const [newAddress] = await customerDb
        .insert(customerAddresses)
        .values(addressData)
        .returning();
      
      // Sync to CRM - save as secondary address if it's different from primary
      await this.syncAddressToCrm(addressData.customerId, addressData);
      
      return newAddress;
    } catch (error) {
      console.error('Error creating customer address:', error);
      throw new Error('خطا در ایجاد آدرس جدید');
    }
  }

  // Sync address and phone to CRM table
  private async syncAddressToCrm(customerId: number, addressData: InsertCustomerAddress): Promise<void> {
    try {
      // Get current CRM data
      const [crmCustomer] = await db
        .select()
        .from(crmCustomers)
        .where(eq(crmCustomers.id, customerId))
        .limit(1);
      
      if (!crmCustomer) {
        console.log(`🏠 [CRM SYNC] Customer ${customerId} not found in CRM, skipping sync`);
        return;
      }

      const fullAddress = `${addressData.address}, ${addressData.city}, ${addressData.country}`;
      const updateData: any = {};

      // If this is a different address than primary, save as secondary
      if (crmCustomer.address !== addressData.address || 
          crmCustomer.cityRegion !== addressData.city) {
        updateData.secondaryAddress = fullAddress;
        console.log(`🏠 [CRM SYNC] Saving secondary address for customer ${customerId}: ${fullAddress}`);
      }

      // If phone is different, save as alternate phone
      if (addressData.phone && crmCustomer.phone !== addressData.phone) {
        updateData.alternatePhone = addressData.phone;
        console.log(`📱 [CRM SYNC] Saving alternate phone for customer ${customerId}: ${addressData.phone}`);
      }

      // Update CRM if there are changes
      if (Object.keys(updateData).length > 0) {
        await db
          .update(crmCustomers)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(crmCustomers.id, customerId));
        
        console.log(`✅ [CRM SYNC] Customer ${customerId} CRM updated with:`, updateData);
      }
    } catch (error) {
      console.error('Error syncing address to CRM:', error);
      // Don't throw - just log the error, address creation was successful
    }
  }

  async getCustomerAddresses(customerId: number): Promise<CustomerAddress[]> {
    try {
      const addresses = await customerDb
        .select()
        .from(customerAddresses)
        .where(eq(customerAddresses.customerId, customerId))
        .orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.createdAt));
      
      return addresses;
    } catch (error) {
      console.error('Error fetching customer addresses:', error);
      throw new Error('خطا در دریافت آدرس‌های مشتری');
    }
  }

  async getAddressById(addressId: number): Promise<CustomerAddress | undefined> {
    try {
      const [address] = await customerDb
        .select()
        .from(customerAddresses)
        .where(eq(customerAddresses.id, addressId))
        .limit(1);
      
      return address;
    } catch (error) {
      console.error('Error fetching address by ID:', error);
      throw new Error('خطا در دریافت آدرس');
    }
  }

  async updateAddress(addressId: number, addressData: Partial<InsertCustomerAddress>): Promise<CustomerAddress> {
    try {
      const [updatedAddress] = await customerDb
        .update(customerAddresses)
        .set({ ...addressData, updatedAt: new Date() })
        .where(eq(customerAddresses.id, addressId))
        .returning();
      
      if (!updatedAddress) {
        throw new Error('آدرس یافت نشد');
      }
      
      return updatedAddress;
    } catch (error) {
      console.error('Error updating address:', error);
      throw new Error('خطا در بروزرسانی آدرس');
    }
  }

  async deleteAddress(addressId: number): Promise<void> {
    try {
      await customerDb
        .delete(customerAddresses)
        .where(eq(customerAddresses.id, addressId));
    } catch (error) {
      console.error('Error deleting address:', error);
      throw new Error('خطا در حذف آدرس');
    }
  }

  async setDefaultAddress(customerId: number, addressId: number): Promise<void> {
    try {
      // First, unset all default addresses for this customer
      await customerDb
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.customerId, customerId));
      
      // Then set the specified address as default
      await customerDb
        .update(customerAddresses)
        .set({ isDefault: true })
        .where(and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.customerId, customerId)
        ));
    } catch (error) {
      console.error('Error setting default address:', error);
      throw new Error('خطا در تنظیم آدرس پیش‌فرض');
    }
  }
}

export const customerAddressStorage = new CustomerAddressStorage();