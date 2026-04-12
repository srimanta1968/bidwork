import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  is_onboarded: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserResponse {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_onboarded: boolean;
  created_at?: Date;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ContractorProfile {
  id: string;
  user_id: string;
  business_name: string | null;
  office_address: string | null;
  phone: string | null;
  license_number: string | null;
  license_type: string | null;
  category: string;
  skills: string[] | null;
  years_experience: number | null;
  bio: string | null;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OnboardingPayload {
  business_name?: string;
  office_address?: string;
  phone: string;
  license_number?: string;
  license_type?: string;
  category: string;
  skills?: string[];
  years_experience?: number;
  bio?: string;
}

export const VALID_ROLES = ['homeowner', 'contractor', 'skilled_labor'] as const;
export type UserRole = typeof VALID_ROLES[number];

export const CONTRACTOR_CATEGORIES = [
  'General Contractor',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Roofing',
  'Painting',
  'Flooring',
  'Remodeling',
  'Carpentry',
  'Masonry',
] as const;

export const SKILLED_LABOR_CATEGORIES = [
  'Landscaping',
  'Cleaning',
  'Moving',
  'Handyman',
  'Pressure Washing',
  'Gutter Cleaning',
  'Fence Repair',
  'Demolition',
  'Hauling',
  'Assembly',
] as const;
