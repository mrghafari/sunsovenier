import { db } from './db';
import { 
  advancedShippingRates, 
  shippingFeeConfig, 
  shippingZoneRules,
  shippingCalculationLogs,
  SHIPPING_ZONES,
  SHIPPING_SERVICE_TYPES
} from '@shared/logistics-schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface CartItem {
  productId: number;
  name?: string;
  quantity: number;
  weight: number; // Weight in grams
  dimensions?: {
    length: number; // cm
    width: number;  // cm
    height: number; // cm
  };
  price: number; // Unit price
}

export interface Destination {
  country: string;
  province: string;
  city: string;
  address?: string;
  postalCode?: string;
}

export interface ShippingOptions {
  cod?: boolean;        // Cash on delivery
  insurance?: boolean;  // Package insurance
  express?: boolean;    // Express delivery multiplier
}

export interface ShippingCalculationRequest {
  cartItems: CartItem[];
  destination: Destination;
  serviceType: 'normal' | 'fast' | 'express';
  options?: ShippingOptions;
  customerId?: number;
  orderId?: number;
  sessionId?: string;
  orderValue?: number; // Total order value for insurance calculation
}

export interface WeightBreakdown {
  totalRealWeightGrams: number;
  totalRealWeightKg: number;
  totalVolumetricWeightKg: number;
  chargeableWeightKg: number;
  itemBreakdown: Array<{
    productId: number;
    name?: string;
    quantity: number;
    realWeightKg: number;
    volumetricWeightKg: number | null;
  }>;
}

export interface FeeBreakdown {
  codFee: number;
  insuranceFee: number;
  expressMultiplier: number;
  totalExtraFees: number;
}

export interface ShippingCalculationResponse {
  success: boolean;
  data: {
    zone: string;
    serviceType: string;
    weight: WeightBreakdown;
    pricing: {
      baseShippingCost: number;
      fees: FeeBreakdown;
      totalCost: number;
      currency: string;
    };
    estimatedDelivery: {
      minDays: number;
      maxDays: number;
      description: string;
    };
    breakdown: Array<{
      item: string;
      amount: number;
      description: string;
    }>;
    calculatedAt: string;
    logId?: number;
  };
  message?: string;
}

// =============================================================================
// WEIGHT CALCULATION FUNCTIONS
// =============================================================================

const VOLUMETRIC_DIVISOR = 5000; // Standard divisor for volumetric weight

export function calculateVolumetricWeight(dimensions: { length: number; width: number; height: number }): number {
  const { length, width, height } = dimensions;
  return (length * width * height) / VOLUMETRIC_DIVISOR;
}

export function calculateWeightBreakdown(cartItems: CartItem[]): WeightBreakdown {
  let totalRealWeightGrams = 0;
  let totalVolumetricWeightKg = 0;
  
  const itemBreakdown = cartItems.map(item => {
    const itemRealWeightGrams = item.weight * item.quantity;
    totalRealWeightGrams += itemRealWeightGrams;
    
    let volumetricWeightKg: number | null = null;
    
    if (item.dimensions && item.dimensions.length && item.dimensions.width && item.dimensions.height) {
      const singleItemVolumetric = calculateVolumetricWeight(item.dimensions);
      volumetricWeightKg = singleItemVolumetric * item.quantity;
      totalVolumetricWeightKg += volumetricWeightKg;
    }
    
    return {
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      realWeightKg: itemRealWeightGrams / 1000,
      volumetricWeightKg
    };
  });
  
  const totalRealWeightKg = totalRealWeightGrams / 1000;
  const chargeableWeightKg = Math.max(totalRealWeightKg, totalVolumetricWeightKg);
  
  return {
    totalRealWeightGrams,
    totalRealWeightKg,
    totalVolumetricWeightKg,
    chargeableWeightKg,
    itemBreakdown
  };
}

// =============================================================================
// ZONE DETECTION FUNCTIONS
// =============================================================================

const DEFAULT_BASE_CITY = 'بغداد'; // Base city for zone calculation
const DEFAULT_BASE_PROVINCE = 'بغداد'; // Base province for zone calculation

export async function detectZone(destination: Destination): Promise<string> {
  try {
    const rules = await db.select()
      .from(shippingZoneRules)
      .where(eq(shippingZoneRules.isActive, true))
      .orderBy(desc(shippingZoneRules.priority));
    
    for (const rule of rules) {
      const cityMatch = !rule.city || rule.city.toLowerCase() === destination.city.toLowerCase();
      const provinceMatch = !rule.province || rule.province.toLowerCase() === destination.province.toLowerCase();
      const countryMatch = !rule.country || rule.country.toLowerCase() === destination.country.toLowerCase();
      
      if (cityMatch && provinceMatch && countryMatch) {
        return rule.zone;
      }
    }
    
    // Default zone detection based on location comparison
    if (destination.country.toLowerCase() !== 'iraq' && destination.country.toLowerCase() !== 'العراق') {
      return SHIPPING_ZONES.INTERNATIONAL;
    }
    
    if (destination.city.toLowerCase() === DEFAULT_BASE_CITY.toLowerCase()) {
      return SHIPPING_ZONES.CITY;
    }
    
    if (destination.province.toLowerCase() === DEFAULT_BASE_PROVINCE.toLowerCase()) {
      return SHIPPING_ZONES.PROVINCE;
    }
    
    return SHIPPING_ZONES.COUNTRY;
  } catch (error) {
    console.error('[SHIPPING] Zone detection error:', error);
    return SHIPPING_ZONES.COUNTRY; // Default to country zone
  }
}

// =============================================================================
// RATE LOOKUP FUNCTIONS
// =============================================================================

export async function getShippingRate(
  zone: string, 
  serviceType: string, 
  weightKg: number
): Promise<{ price: number; pricePerExtraKg: number; minDays: number; maxDays: number } | null> {
  try {
    const rates = await db.select()
      .from(advancedShippingRates)
      .where(
        and(
          eq(advancedShippingRates.zone, zone),
          eq(advancedShippingRates.serviceType, serviceType),
          eq(advancedShippingRates.isActive, true),
          lte(advancedShippingRates.weightFrom, weightKg.toString()),
          gte(advancedShippingRates.weightTo, weightKg.toString())
        )
      )
      .limit(1);
    
    if (rates.length === 0) {
      // Try to find the highest weight range
      const fallbackRates = await db.select()
        .from(advancedShippingRates)
        .where(
          and(
            eq(advancedShippingRates.zone, zone),
            eq(advancedShippingRates.serviceType, serviceType),
            eq(advancedShippingRates.isActive, true)
          )
        )
        .orderBy(desc(advancedShippingRates.weightTo))
        .limit(1);
      
      if (fallbackRates.length === 0) {
        return null;
      }
      
      const rate = fallbackRates[0];
      const basePrice = parseFloat(rate.price);
      const pricePerExtraKg = parseFloat(rate.pricePerExtraKg || '0');
      const maxWeight = parseFloat(rate.weightTo);
      const extraWeight = Math.max(0, weightKg - maxWeight);
      const extraCost = extraWeight * pricePerExtraKg;
      
      return {
        price: basePrice + extraCost,
        pricePerExtraKg,
        minDays: rate.estimatedDaysMin || 1,
        maxDays: rate.estimatedDaysMax || 3
      };
    }
    
    const rate = rates[0];
    return {
      price: parseFloat(rate.price),
      pricePerExtraKg: parseFloat(rate.pricePerExtraKg || '0'),
      minDays: rate.estimatedDaysMin || 1,
      maxDays: rate.estimatedDaysMax || 3
    };
  } catch (error) {
    console.error('[SHIPPING] Rate lookup error:', error);
    return null;
  }
}

// =============================================================================
// FEE CALCULATION FUNCTIONS
// =============================================================================

export async function calculateFees(
  options: ShippingOptions,
  baseShippingCost: number,
  orderValue: number = 0
): Promise<FeeBreakdown> {
  const result: FeeBreakdown = {
    codFee: 0,
    insuranceFee: 0,
    expressMultiplier: 1,
    totalExtraFees: 0
  };
  
  try {
    const feeConfigs = await db.select()
      .from(shippingFeeConfig)
      .where(eq(shippingFeeConfig.isActive, true));
    
    for (const config of feeConfigs) {
      const feeValue = parseFloat(config.feeValue);
      const minValue = config.minValue ? parseFloat(config.minValue) : 0;
      const maxValue = config.maxValue ? parseFloat(config.maxValue) : Infinity;
      
      switch (config.feeType) {
        case 'cod':
          if (options.cod) {
            if (config.feeMode === 'fixed') {
              result.codFee = feeValue;
            } else if (config.feeMode === 'percentage') {
              result.codFee = Math.min(Math.max(orderValue * feeValue / 100, minValue), maxValue);
            }
          }
          break;
          
        case 'insurance':
          if (options.insurance) {
            if (config.feeMode === 'fixed') {
              result.insuranceFee = feeValue;
            } else if (config.feeMode === 'percentage') {
              result.insuranceFee = Math.min(Math.max(orderValue * feeValue / 100, minValue), maxValue);
            }
          }
          break;
          
        case 'express_multiplier':
          if (options.express && config.feeMode === 'multiplier') {
            result.expressMultiplier = feeValue;
          }
          break;
      }
    }
    
    result.totalExtraFees = result.codFee + result.insuranceFee;
    
  } catch (error) {
    console.error('[SHIPPING] Fee calculation error:', error);
  }
  
  return result;
}

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

export async function calculateShipping(
  request: ShippingCalculationRequest
): Promise<ShippingCalculationResponse> {
  try {
    // Step 1: Calculate weights
    const weightBreakdown = calculateWeightBreakdown(request.cartItems);
    
    // Step 2: Detect zone
    const zone = await detectZone(request.destination);
    
    // Step 3: Get shipping rate
    const rate = await getShippingRate(zone, request.serviceType, weightBreakdown.chargeableWeightKg);
    
    if (!rate) {
      return {
        success: false,
        data: {
          zone,
          serviceType: request.serviceType,
          weight: weightBreakdown,
          pricing: {
            baseShippingCost: 0,
            fees: { codFee: 0, insuranceFee: 0, expressMultiplier: 1, totalExtraFees: 0 },
            totalCost: 0,
            currency: 'IQD'
          },
          estimatedDelivery: { minDays: 0, maxDays: 0, description: 'غیر موجود' },
          breakdown: [],
          calculatedAt: new Date().toISOString()
        },
        message: 'نرخ حمل‌ونقل برای این مقصد و وزن یافت نشد'
      };
    }
    
    // Step 4: Calculate base cost
    let baseShippingCost = rate.price;
    
    // Apply express multiplier to base cost if express service requested
    const options = request.options || {};
    const orderValue = request.orderValue || 
      request.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Step 5: Calculate fees
    const fees = await calculateFees(options, baseShippingCost, orderValue);
    
    // Apply express multiplier
    if (options.express) {
      baseShippingCost *= fees.expressMultiplier;
    }
    
    // Step 6: Calculate total
    const totalCost = baseShippingCost + fees.totalExtraFees;
    
    // Step 7: Build breakdown for accounting
    const breakdown: Array<{ item: string; amount: number; description: string }> = [
      {
        item: 'هزینه پایه حمل',
        amount: rate.price,
        description: `منطقه: ${zone} | سرویس: ${request.serviceType} | وزن: ${weightBreakdown.chargeableWeightKg.toFixed(2)} کیلوگرم`
      }
    ];
    
    if (options.express && fees.expressMultiplier > 1) {
      breakdown.push({
        item: 'ضریب ارسال فوری',
        amount: rate.price * (fees.expressMultiplier - 1),
        description: `ضریب ${fees.expressMultiplier}x`
      });
    }
    
    if (fees.codFee > 0) {
      breakdown.push({
        item: 'هزینه پرداخت در محل',
        amount: fees.codFee,
        description: 'کارمزد دریافت وجه از مشتری'
      });
    }
    
    if (fees.insuranceFee > 0) {
      breakdown.push({
        item: 'بیمه محموله',
        amount: fees.insuranceFee,
        description: `بیمه به ارزش ${orderValue.toLocaleString()} دینار`
      });
    }
    
    // Step 8: Log calculation
    let logId: number | undefined;
    try {
      const logResult = await db.insert(shippingCalculationLogs).values({
        sessionId: request.sessionId,
        customerId: request.customerId,
        orderId: request.orderId,
        destination: request.destination,
        cartItems: request.cartItems,
        serviceType: request.serviceType,
        options: options,
        totalRealWeight: weightBreakdown.totalRealWeightKg.toString(),
        totalVolumetricWeight: weightBreakdown.totalVolumetricWeightKg.toString(),
        chargeableWeight: weightBreakdown.chargeableWeightKg.toString(),
        detectedZone: zone,
        baseShippingCost: baseShippingCost.toString(),
        codFee: fees.codFee.toString(),
        insuranceFee: fees.insuranceFee.toString(),
        expressMultiplier: fees.expressMultiplier.toString(),
        totalCost: totalCost.toString(),
        responseData: { breakdown }
      }).returning({ id: shippingCalculationLogs.id });
      
      logId = logResult[0]?.id;
    } catch (logError) {
      console.error('[SHIPPING] Failed to log calculation:', logError);
    }
    
    // Step 9: Return response
    return {
      success: true,
      data: {
        zone,
        serviceType: request.serviceType,
        weight: weightBreakdown,
        pricing: {
          baseShippingCost,
          fees,
          totalCost,
          currency: 'IQD'
        },
        estimatedDelivery: {
          minDays: rate.minDays,
          maxDays: rate.maxDays,
          description: `${rate.minDays}-${rate.maxDays} روز کاری`
        },
        breakdown,
        calculatedAt: new Date().toISOString(),
        logId
      }
    };
    
  } catch (error) {
    console.error('[SHIPPING] Calculation error:', error);
    return {
      success: false,
      data: {
        zone: 'unknown',
        serviceType: request.serviceType,
        weight: {
          totalRealWeightGrams: 0,
          totalRealWeightKg: 0,
          totalVolumetricWeightKg: 0,
          chargeableWeightKg: 0,
          itemBreakdown: []
        },
        pricing: {
          baseShippingCost: 0,
          fees: { codFee: 0, insuranceFee: 0, expressMultiplier: 1, totalExtraFees: 0 },
          totalCost: 0,
          currency: 'IQD'
        },
        estimatedDelivery: { minDays: 0, maxDays: 0, description: 'خطا' },
        breakdown: [],
        calculatedAt: new Date().toISOString()
      },
      message: 'خطا در محاسبه هزینه حمل‌ونقل'
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS FOR ADMIN
// =============================================================================

export async function seedDefaultRates(): Promise<void> {
  try {
    const existingRates = await db.select().from(advancedShippingRates).limit(1);
    
    if (existingRates.length > 0) {
      console.log('[SHIPPING] Rates already exist, skipping seed');
      return;
    }
    
    const defaultRates = [
      // City zone rates (Baghdad)
      { zone: 'city', serviceType: 'normal', weightFrom: '0', weightTo: '5', price: '5000', pricePerExtraKg: '500', estimatedDaysMin: 1, estimatedDaysMax: 2 },
      { zone: 'city', serviceType: 'fast', weightFrom: '0', weightTo: '5', price: '8000', pricePerExtraKg: '750', estimatedDaysMin: 1, estimatedDaysMax: 1 },
      { zone: 'city', serviceType: 'express', weightFrom: '0', weightTo: '5', price: '15000', pricePerExtraKg: '1000', estimatedDaysMin: 0, estimatedDaysMax: 1 },
      
      // Province zone rates
      { zone: 'province', serviceType: 'normal', weightFrom: '0', weightTo: '5', price: '10000', pricePerExtraKg: '1000', estimatedDaysMin: 2, estimatedDaysMax: 3 },
      { zone: 'province', serviceType: 'fast', weightFrom: '0', weightTo: '5', price: '15000', pricePerExtraKg: '1250', estimatedDaysMin: 1, estimatedDaysMax: 2 },
      { zone: 'province', serviceType: 'express', weightFrom: '0', weightTo: '5', price: '25000', pricePerExtraKg: '1500', estimatedDaysMin: 1, estimatedDaysMax: 1 },
      
      // Country zone rates
      { zone: 'country', serviceType: 'normal', weightFrom: '0', weightTo: '5', price: '20000', pricePerExtraKg: '2000', estimatedDaysMin: 3, estimatedDaysMax: 5 },
      { zone: 'country', serviceType: 'fast', weightFrom: '0', weightTo: '5', price: '30000', pricePerExtraKg: '2500', estimatedDaysMin: 2, estimatedDaysMax: 3 },
      { zone: 'country', serviceType: 'express', weightFrom: '0', weightTo: '5', price: '50000', pricePerExtraKg: '3000', estimatedDaysMin: 1, estimatedDaysMax: 2 },
      
      // International zone rates
      { zone: 'international', serviceType: 'normal', weightFrom: '0', weightTo: '5', price: '100000', pricePerExtraKg: '10000', estimatedDaysMin: 7, estimatedDaysMax: 14 },
      { zone: 'international', serviceType: 'fast', weightFrom: '0', weightTo: '5', price: '150000', pricePerExtraKg: '15000', estimatedDaysMin: 5, estimatedDaysMax: 7 },
      { zone: 'international', serviceType: 'express', weightFrom: '0', weightTo: '5', price: '250000', pricePerExtraKg: '25000', estimatedDaysMin: 3, estimatedDaysMax: 5 }
    ];
    
    await db.insert(advancedShippingRates).values(defaultRates);
    console.log('[SHIPPING] Default rates seeded successfully');
    
  } catch (error) {
    console.error('[SHIPPING] Failed to seed default rates:', error);
  }
}

export async function seedDefaultFees(): Promise<void> {
  try {
    const existingFees = await db.select().from(shippingFeeConfig).limit(1);
    
    if (existingFees.length > 0) {
      console.log('[SHIPPING] Fee configs already exist, skipping seed');
      return;
    }
    
    const defaultFees = [
      {
        feeType: 'cod',
        feeMode: 'fixed',
        feeValue: '5000',
        labelFa: 'پرداخت در محل',
        labelEn: 'Cash on Delivery',
        description: 'هزینه ثابت برای دریافت وجه از مشتری'
      },
      {
        feeType: 'insurance',
        feeMode: 'percentage',
        feeValue: '2',
        labelFa: 'بیمه محموله',
        labelEn: 'Package Insurance',
        description: '2% از ارزش سفارش',
        minValue: '2000',
        maxValue: '50000'
      },
      {
        feeType: 'express_multiplier',
        feeMode: 'multiplier',
        feeValue: '1.3',
        labelFa: 'ضریب ارسال فوری',
        labelEn: 'Express Multiplier',
        description: 'ضریب 1.3x برای ارسال فوری'
      }
    ];
    
    await db.insert(shippingFeeConfig).values(defaultFees);
    console.log('[SHIPPING] Default fee configs seeded successfully');
    
  } catch (error) {
    console.error('[SHIPPING] Failed to seed default fees:', error);
  }
}
