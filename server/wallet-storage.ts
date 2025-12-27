import { customerDb } from "./customer-db";
import { 
  customers,
  customerWallets, 
  walletTransactions, 
  walletRechargeRequests,
  type CustomerWallet,
  type InsertCustomerWallet,
  type WalletTransaction,
  type InsertWalletTransaction,
  type WalletRechargeRequest,
  type InsertWalletRechargeRequest
} from "@shared/customer-schema";
import { eq, desc, sum, and } from "drizzle-orm";

export interface IWalletStorage {
  // Wallet management
  createWallet(walletData: InsertCustomerWallet): Promise<CustomerWallet>;
  getWalletByCustomerId(customerId: number): Promise<CustomerWallet | undefined>;
  updateWalletBalance(walletId: number, newBalance: number): Promise<CustomerWallet>;
  getWalletBalance(customerId: number): Promise<number>;
  
  // Transaction management
  createTransaction(transactionData: InsertWalletTransaction): Promise<WalletTransaction>;
  getTransactionsByWallet(walletId: number, limit?: number): Promise<WalletTransaction[]>;
  getTransactionsByCustomer(customerId: number, limit?: number): Promise<WalletTransaction[]>;
  getTransactionById(transactionId: number): Promise<WalletTransaction | undefined>;
  
  // Credit/Debit operations
  creditWallet(customerId: number, amount: number, description: string, referenceType?: string, referenceId?: number, processedBy?: number): Promise<WalletTransaction>;
  debitWallet(customerId: number, amount: number, description: string, referenceType?: string, referenceId?: number, processedBy?: number): Promise<WalletTransaction>;
  
  // Recharge requests
  createRechargeRequest(requestData: InsertWalletRechargeRequest): Promise<WalletRechargeRequest>;
  getRechargeRequestById(requestId: number): Promise<WalletRechargeRequest | undefined>;
  getRechargeRequestsByCustomer(customerId: number): Promise<WalletRechargeRequest[]>;
  getAllPendingRechargeRequests(): Promise<WalletRechargeRequest[]>;
  getAllRechargeRequests(): Promise<WalletRechargeRequest[]>;
  updateRechargeRequestStatus(requestId: number, status: string, adminNotes?: string, approvedBy?: number): Promise<WalletRechargeRequest>;
  processRechargeRequest(requestId: number, approvedBy: number): Promise<{ request: WalletRechargeRequest; transaction: WalletTransaction }>;
  
  // Analytics and reporting
  getWalletStatistics(): Promise<{
    totalWallets: number;
    totalBalance: number;
    activeWallets: number;
    pendingRecharges: number;
    totalTransactions: number;
  }>;
  
  getCustomerWalletSummary(customerId: number): Promise<{
    wallet: CustomerWallet | undefined;
    recentTransactions: WalletTransaction[];
    pendingRecharges: WalletRechargeRequest[];
    totalSpent: number;
    totalRecharged: number;
  }>;
  
  // Get all wallet holders with their details
  getAllWalletHolders(): Promise<Array<{
    customerId: number;
    customerName: string;
    customerEmail: string;
    walletId: number;
    balance: number;
    lastActivityDate: Date | null;
    isActive: boolean;
  }>>;
}

export class WalletStorage implements IWalletStorage {
  // Wallet management
  async createWallet(walletData: InsertCustomerWallet): Promise<CustomerWallet> {
    const [wallet] = await customerDb
      .insert(customerWallets)
      .values(walletData)
      .returning();
    return wallet;
  }

  async getWalletByCustomerId(customerId: number): Promise<CustomerWallet | undefined> {
    const [wallet] = await customerDb
      .select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, customerId));
    return wallet;
  }

  async updateWalletBalance(walletId: number, newBalance: number): Promise<CustomerWallet> {
    const [wallet] = await customerDb
      .update(customerWallets)
      .set({ 
        balance: newBalance.toString(),
        lastActivityDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(customerWallets.id, walletId))
      .returning();
    return wallet;
  }

  async getWalletBalance(customerId: number): Promise<number> {
    const wallet = await this.getWalletByCustomerId(customerId);
    return wallet ? parseFloat(wallet.balance) : 0;
  }

  // Transaction management
  async createTransaction(transactionData: InsertWalletTransaction): Promise<WalletTransaction> {
    const [transaction] = await customerDb
      .insert(walletTransactions)
      .values(transactionData)
      .returning();
    return transaction;
  }

  async getTransactionsByWallet(walletId: number, limit: number = 50): Promise<WalletTransaction[]> {
    return await customerDb
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);
  }

  async getTransactionsByCustomer(customerId: number, limit: number = 50): Promise<WalletTransaction[]> {
    return await customerDb
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.customerId, customerId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);
  }

  async getTransactionById(transactionId: number): Promise<WalletTransaction | undefined> {
    const [transaction] = await customerDb
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.id, transactionId));
    return transaction;
  }

  // Credit/Debit operations
  async creditWallet(
    customerId: number, 
    amount: number, 
    description: string, 
    referenceType?: string, 
    referenceId?: number,
    processedBy?: number
  ): Promise<WalletTransaction> {
    // Get or create wallet
    let wallet = await this.getWalletByCustomerId(customerId);
    if (!wallet) {
      wallet = await this.createWallet({
        customerId,
        balance: "0",
        currency: "IQD",
        status: "active"
      });
    }

    const currentBalance = parseFloat(wallet.balance);
    const newBalance = currentBalance + amount;

    // Create transaction record
    const transaction = await this.createTransaction({
      walletId: wallet.id,
      customerId,
      transactionType: "credit",
      amount: amount.toString(),
      currency: wallet.currency,
      balanceBefore: currentBalance.toString(),
      balanceAfter: newBalance.toString(),
      description,
      referenceType,
      referenceId,
      status: "completed",
      processedBy
    });

    // Update wallet balance
    await this.updateWalletBalance(wallet.id, newBalance);

    return transaction;
  }

  async debitWallet(
    customerId: number, 
    amount: number, 
    description: string, 
    referenceType?: string, 
    referenceId?: number,
    processedBy?: number
  ): Promise<WalletTransaction> {
    const wallet = await this.getWalletByCustomerId(customerId);
    if (!wallet) {
      throw new Error("Customer wallet not found");
    }

    const currentBalance = parseFloat(wallet.balance);
    const reservedBalance = parseFloat(wallet.reservedBalance || "0");
    const creditLimit = parseFloat(wallet.creditLimit || "0");
    // موجودی قابل استفاده = موجودی کل - موجودی رزرو شده + سقف اعتبار
    const availableAmount = currentBalance - reservedBalance + creditLimit;

    if (amount > availableAmount) {
      throw new Error(`Insufficient funds. Available: ${availableAmount}, Required: ${amount}. Reserved: ${reservedBalance}`);
    }

    const newBalance = currentBalance - amount;

    // Create transaction record
    const transaction = await this.createTransaction({
      walletId: wallet.id,
      customerId,
      transactionType: "debit",
      amount: amount.toString(),
      currency: wallet.currency,
      balanceBefore: currentBalance.toString(),
      balanceAfter: newBalance.toString(),
      description,
      referenceType,
      referenceId,
      status: "completed",
      processedBy
    });

    // Update wallet balance
    await this.updateWalletBalance(wallet.id, newBalance);

    return transaction;
  }

  // رزرو مبلغ برای سفارش در انتظار
  async reserveBalance(customerId: number, amount: number, orderId?: number): Promise<void> {
    const wallet = await this.getWalletByCustomerId(customerId);
    if (!wallet) {
      throw new Error("Customer wallet not found");
    }

    const currentBalance = parseFloat(wallet.balance);
    const currentReserved = parseFloat(wallet.reservedBalance || "0");
    const creditLimit = parseFloat(wallet.creditLimit || "0");
    const availableAmount = currentBalance - currentReserved + creditLimit;

    if (amount > availableAmount) {
      throw new Error(`Insufficient funds to reserve. Available: ${availableAmount}, Required: ${amount}`);
    }

    const newReserved = currentReserved + amount;

    await customerDb
      .update(customerWallets)
      .set({
        reservedBalance: newReserved.toString(),
        lastActivityDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(customerWallets.id, wallet.id));

    console.log(`✅ Reserved ${amount} from wallet for customer ${customerId}. Total reserved: ${newReserved}`);
  }

  // آزاد کردن مبلغ رزرو شده (لغو سفارش یا تکمیل پرداخت)
  async releaseReservedBalance(customerId: number, amount: number, orderId?: number): Promise<void> {
    const wallet = await this.getWalletByCustomerId(customerId);
    if (!wallet) {
      throw new Error("Customer wallet not found");
    }

    const currentReserved = parseFloat(wallet.reservedBalance || "0");
    const newReserved = Math.max(0, currentReserved - amount);

    await customerDb
      .update(customerWallets)
      .set({
        reservedBalance: newReserved.toString(),
        lastActivityDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(customerWallets.id, wallet.id));

    console.log(`✅ Released ${amount} reserved balance for customer ${customerId}. Remaining reserved: ${newReserved}`);
  }

  // دریافت موجودی قابل استفاده (بدون رزرو)
  async getAvailableBalance(customerId: number): Promise<number> {
    const wallet = await this.getWalletByCustomerId(customerId);
    if (!wallet) return 0;
    
    const balance = parseFloat(wallet.balance);
    const reserved = parseFloat(wallet.reservedBalance || "0");
    const creditLimit = parseFloat(wallet.creditLimit || "0");
    
    return balance - reserved + creditLimit;
  }

  // Recharge requests
  async createRechargeRequest(requestData: InsertWalletRechargeRequest): Promise<WalletRechargeRequest> {
    // Generate unique request number
    const requestNumber = `WR${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const [request] = await customerDb
      .insert(walletRechargeRequests)
      .values({
        ...requestData,
        requestNumber
      })
      .returning();
    return request;
  }

  async getRechargeRequestById(requestId: number): Promise<WalletRechargeRequest | undefined> {
    const [request] = await customerDb
      .select()
      .from(walletRechargeRequests)
      .where(eq(walletRechargeRequests.id, requestId));
    return request;
  }

  async getRechargeRequestsByCustomer(customerId: number): Promise<WalletRechargeRequest[]> {
    return await customerDb
      .select()
      .from(walletRechargeRequests)
      .where(eq(walletRechargeRequests.customerId, customerId))
      .orderBy(desc(walletRechargeRequests.createdAt));
  }

  async getAllPendingRechargeRequests(): Promise<WalletRechargeRequest[]> {
    return await customerDb
      .select()
      .from(walletRechargeRequests)
      .where(eq(walletRechargeRequests.status, "pending"))
      .orderBy(desc(walletRechargeRequests.createdAt));
  }

  async getAllRechargeRequests(): Promise<WalletRechargeRequest[]> {
    return await customerDb
      .select()
      .from(walletRechargeRequests)
      .orderBy(desc(walletRechargeRequests.createdAt));
  }

  async updateRechargeRequestStatus(
    requestId: number, 
    status: string, 
    adminNotes?: string, 
    approvedBy?: number
  ): Promise<WalletRechargeRequest> {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (adminNotes) updateData.adminNotes = adminNotes;
    if (approvedBy) updateData.approvedBy = approvedBy;
    if (status === "approved") updateData.approvedAt = new Date();
    if (status === "completed") updateData.processedAt = new Date();

    const [request] = await customerDb
      .update(walletRechargeRequests)
      .set(updateData)
      .where(eq(walletRechargeRequests.id, requestId))
      .returning();
    return request;
  }

  async processRechargeRequest(
    requestId: number, 
    approvedBy: number
  ): Promise<{ request: WalletRechargeRequest; transaction: WalletTransaction }> {
    const request = await this.getRechargeRequestById(requestId);
    if (!request) {
      throw new Error("Recharge request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Recharge request is not pending");
    }

    // Credit the wallet
    const transaction = await this.creditWallet(
      request.customerId,
      parseFloat(request.amount),
      `Wallet recharge - Request #${request.requestNumber}`,
      "recharge_request",
      request.id,
      approvedBy
    );

    // Update request status
    const updatedRequest = await this.updateRechargeRequestStatus(
      requestId,
      "completed",
      `Processed by admin ID: ${approvedBy}`,
      approvedBy
    );

    return { request: updatedRequest, transaction };
  }

  // Analytics and reporting
  async getWalletStatistics(): Promise<{
    totalWallets: number;
    totalBalance: number;
    activeWallets: number;
    pendingRecharges: number;
    totalTransactions: number;
  }> {
    const [walletsCount] = await customerDb
      .select({ count: sum(customerWallets.id) })
      .from(customerWallets);

    const [activeWalletsCount] = await customerDb
      .select({ count: sum(customerWallets.id) })
      .from(customerWallets)
      .where(eq(customerWallets.status, "active"));

    const [totalBalanceResult] = await customerDb
      .select({ total: sum(customerWallets.balance) })
      .from(customerWallets);

    const [pendingRechargesCount] = await customerDb
      .select({ count: sum(walletRechargeRequests.id) })
      .from(walletRechargeRequests)
      .where(eq(walletRechargeRequests.status, "pending"));

    const [transactionsCount] = await customerDb
      .select({ count: sum(walletTransactions.id) })
      .from(walletTransactions);

    return {
      totalWallets: Number(walletsCount?.count || 0),
      totalBalance: parseFloat(totalBalanceResult?.total || "0"),
      activeWallets: Number(activeWalletsCount?.count || 0),
      pendingRecharges: Number(pendingRechargesCount?.count || 0),
      totalTransactions: Number(transactionsCount?.count || 0)
    };
  }

  async getCustomerWalletSummary(customerId: number): Promise<{
    wallet: CustomerWallet | undefined;
    recentTransactions: WalletTransaction[];
    pendingRecharges: WalletRechargeRequest[];
    totalSpent: number;
    totalRecharged: number;
  }> {
    const wallet = await this.getWalletByCustomerId(customerId);
    const recentTransactions = await this.getTransactionsByCustomer(customerId, 10);
    const pendingRecharges = await customerDb
      .select()
      .from(walletRechargeRequests)
      .where(and(
        eq(walletRechargeRequests.customerId, customerId),
        eq(walletRechargeRequests.status, "pending")
      ));

    // Calculate totals
    const [spentResult] = await customerDb
      .select({ total: sum(walletTransactions.amount) })
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.customerId, customerId),
        eq(walletTransactions.transactionType, "debit")
      ));

    const [rechargedResult] = await customerDb
      .select({ total: sum(walletTransactions.amount) })
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.customerId, customerId),
        eq(walletTransactions.transactionType, "credit")
      ));

    return {
      wallet,
      recentTransactions,
      pendingRecharges,
      totalSpent: parseFloat(spentResult?.total || "0"),
      totalRecharged: parseFloat(rechargedResult?.total || "0")
    };
  }
  
  // =====================================================================
  // WALLET RESERVATION SYSTEM (for hybrid payments: wallet + bank)
  // =====================================================================

  /**
   * Reserve wallet funds without immediately deducting from balance.
   * Used for hybrid payments where bank confirmation is required first.
   * Creates a transaction with status="reserved".
   */
  async reserveWallet(
    customerId: number, 
    amount: number, 
    description: string, 
    referenceType?: string, 
    referenceId?: number,
    orderNumber?: string
  ): Promise<WalletTransaction> {
    const wallet = await this.getWalletByCustomerId(customerId);
    if (!wallet) {
      throw new Error("Customer wallet not found");
    }

    const currentBalance = parseFloat(wallet.balance);
    const creditLimit = parseFloat(wallet.creditLimit || "0");
    const availableAmount = currentBalance + creditLimit;

    // Check if there are existing reservations for this customer
    const existingReservations = await this.getPendingReservations(customerId);
    const totalReserved = existingReservations.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const effectiveAvailable = availableAmount - totalReserved;

    if (amount > effectiveAvailable) {
      throw new Error(`Insufficient funds. Available: ${effectiveAvailable}, Required: ${amount}, Reserved: ${totalReserved}`);
    }

    // Create reservation transaction (NOT deducting balance yet)
    const transaction = await this.createTransaction({
      walletId: wallet.id,
      customerId,
      transactionType: "debit",
      amount: amount.toString(),
      currency: wallet.currency,
      balanceBefore: currentBalance.toString(),
      balanceAfter: currentBalance.toString(), // Balance unchanged until confirmation
      description: `[RESERVED] ${description}`,
      referenceType: referenceType || "order",
      referenceId,
      status: "reserved", // Key: reserved status means funds are held but not deducted
      notes: orderNumber ? `Order: ${orderNumber}` : undefined,
      metadata: { reservedAt: new Date().toISOString(), orderNumber }
    });

    console.log(`🔒 [WALLET RESERVE] Reserved ${amount} IQD for customer ${customerId}, Order: ${orderNumber || referenceId}`);

    return transaction;
  }

  /**
   * Confirm a reservation and actually deduct the funds from wallet.
   * Called after bank payment is successfully verified.
   */
  async confirmReservation(
    reservationId: number,
    processedBy?: number
  ): Promise<WalletTransaction> {
    const reservation = await this.getTransactionById(reservationId);
    if (!reservation) {
      throw new Error("Reservation transaction not found");
    }

    if (reservation.status !== "reserved") {
      throw new Error(`Cannot confirm reservation with status: ${reservation.status}`);
    }

    const wallet = await this.getWalletByCustomerId(reservation.customerId);
    if (!wallet) {
      throw new Error("Customer wallet not found");
    }

    const currentBalance = parseFloat(wallet.balance);
    const amount = parseFloat(reservation.amount);
    const newBalance = currentBalance - amount;

    // Update the reservation transaction to completed
    await customerDb
      .update(walletTransactions)
      .set({
        status: "completed",
        balanceBefore: currentBalance.toString(),
        balanceAfter: newBalance.toString(),
        description: reservation.description.replace("[RESERVED] ", "[CONFIRMED] "),
        processedBy,
        updatedAt: new Date()
      })
      .where(eq(walletTransactions.id, reservationId));

    // Actually deduct from wallet balance
    await this.updateWalletBalance(wallet.id, newBalance);

    const updatedTransaction = await this.getTransactionById(reservationId);
    console.log(`✅ [WALLET CONFIRM] Confirmed reservation ${reservationId}: ${amount} IQD deducted from customer ${reservation.customerId}`);

    return updatedTransaction!;
  }

  /**
   * Release a reservation without deducting funds (e.g., bank payment failed/cancelled).
   */
  async releaseReservation(
    reservationId: number,
    reason?: string
  ): Promise<WalletTransaction> {
    const reservation = await this.getTransactionById(reservationId);
    if (!reservation) {
      throw new Error("Reservation transaction not found");
    }

    if (reservation.status !== "reserved") {
      throw new Error(`Cannot release reservation with status: ${reservation.status}`);
    }

    // Update the reservation transaction to cancelled
    await customerDb
      .update(walletTransactions)
      .set({
        status: "cancelled",
        description: reservation.description.replace("[RESERVED] ", "[RELEASED] "),
        notes: reason || "Reservation released - bank payment not completed",
        updatedAt: new Date()
      })
      .where(eq(walletTransactions.id, reservationId));

    const updatedTransaction = await this.getTransactionById(reservationId);
    console.log(`🔓 [WALLET RELEASE] Released reservation ${reservationId}: ${reservation.amount} IQD for customer ${reservation.customerId}. Reason: ${reason || 'Bank payment not completed'}`);

    return updatedTransaction!;
  }

  /**
   * Get all pending reservations for a customer
   */
  async getPendingReservations(customerId: number): Promise<WalletTransaction[]> {
    return await customerDb
      .select()
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.customerId, customerId),
        eq(walletTransactions.status, "reserved")
      ))
      .orderBy(desc(walletTransactions.createdAt));
  }

  /**
   * Get reservation by order reference (order ID, order number in notes, or customer ID + order ID)
   */
  async getReservationByOrder(referenceId: number, orderNumber?: string, customerId?: number): Promise<WalletTransaction | undefined> {
    // First try to find by referenceId
    const [byRefId] = await customerDb
      .select()
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.referenceId, referenceId),
        eq(walletTransactions.referenceType, "order"),
        eq(walletTransactions.status, "reserved")
      ));
    
    if (byRefId) return byRefId;
    
    // Get all pending reservations for searching
    const allReserved = await customerDb
      .select()
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.referenceType, "order"),
        eq(walletTransactions.status, "reserved"),
        ...(customerId ? [eq(walletTransactions.customerId, customerId)] : [])
      ));
    
    // If orderNumber provided, search by notes containing order number
    if (orderNumber) {
      const byOrderNumber = allReserved.find(t => 
        (t.notes && t.notes.includes(orderNumber)) || 
        (t.description && t.description.includes(orderNumber))
      );
      
      if (byOrderNumber) return byOrderNumber;
    }
    
    // If customerId provided and only one pending reservation exists, return it
    if (customerId && allReserved.length === 1) {
      console.log(`🔍 [WALLET] Found single pending reservation ${allReserved[0].id} for customer ${customerId}`);
      return allReserved[0];
    }
    
    return undefined;
  }
  
  /**
   * Update reservation reference ID after order is created
   */
  async updateReservationReferenceId(reservationId: number, orderId: number): Promise<void> {
    await customerDb
      .update(walletTransactions)
      .set({ referenceId: orderId, updatedAt: new Date() })
      .where(eq(walletTransactions.id, reservationId));
    
    console.log(`🔗 [WALLET] Updated reservation ${reservationId} with order ID ${orderId}`);
  }

  async getAllWalletHolders(): Promise<Array<{
    customerId: number;
    customerName: string;
    customerEmail: string;
    walletId: number;
    balance: number;
    lastActivityDate: Date | null;
    isActive: boolean;
  }>> {
    const walletHolders = await customerDb
      .select({
        customerId: customerWallets.customerId,
        customerName: customers.firstName,
        customerEmail: customers.email,
        walletId: customerWallets.id,
        balance: customerWallets.balance,
        lastActivityDate: customerWallets.lastActivityDate,
        isActive: customerWallets.status,
        firstName: customers.firstName,
        lastName: customers.lastName
      })
      .from(customerWallets)
      .innerJoin(customers, eq(customerWallets.customerId, customers.id))
      .orderBy(desc(customerWallets.balance));
      
    return walletHolders.map(holder => ({
      customerId: holder.customerId,
      customerName: `${holder.firstName || ''} ${holder.lastName || ''}`.trim(),
      customerEmail: holder.customerEmail,
      walletId: holder.walletId,
      balance: parseFloat(holder.balance),
      lastActivityDate: holder.lastActivityDate,
      isActive: holder.isActive === 'active'
    }));
  }
}

export const walletStorage = new WalletStorage();