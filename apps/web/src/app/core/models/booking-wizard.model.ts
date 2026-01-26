export interface BookingWizardData {
  carId: string;
  startDate: Date | null;
  endDate: Date | null;
  pickupLocation: { address: string; lat: number; lng: number } | null;
  dropoffLocation: { address: string; lat: number; lng: number } | null;
  insuranceLevel: 'basic' | 'standard' | 'premium' | null;
  extras: {
    id: string;
    type: 'gps' | 'child_seat' | 'additional_driver' | 'toll_pass' | 'fuel_prepaid' | 'delivery';
    quantity: number;
    dailyRate: number;
  }[];
  driverLicense: {
    number: string;
    expirationDate: Date | null;
    frontPhoto: string | null;
    backPhoto: string | null;
  } | null;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  } | null;
  paymentMethod: 'wallet' | 'card' | 'bank_transfer' | 'split' | null;
  paymentPlan: 'full' | 'split_50_50' | 'deposit_20' | 'installments' | null;
  promoCode: string | null;
  termsAccepted: boolean;
  cancellationPolicyAccepted: boolean;
}
