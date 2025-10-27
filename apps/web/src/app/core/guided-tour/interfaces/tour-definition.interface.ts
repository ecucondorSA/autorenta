/**
 * Core interfaces for Guided Tour System
 */

export enum TourId {
  Welcome = 'welcome',
  GuidedBooking = 'guided-booking',
  Renter = 'renter',
  Owner = 'owner',
  CarDetail = 'car-detail',
}

export enum TourPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Critical = 3,
}

export type TourTriggerType = 'manual' | 'route' | 'event' | 'auto';

export interface TourTrigger {
  type: TourTriggerType;
  condition?: () => boolean | Promise<boolean>;
  routePattern?: RegExp;
  eventName?: string;
}

export interface TourGuard {
  name: string;
  check: () => boolean | Promise<boolean>;
}

export interface StepTarget {
  selector: string;
  required?: boolean;
  altSelectors?: string[];
  waitForCondition?: () => boolean | Promise<boolean>;
}

export interface StepContent {
  title?: string;
  text: string;
  html?: string;
}

export interface AnalyticsPayload {
  [key: string]: unknown;
}

export type StepHook = () => void | Promise<void>;

export interface ResponsiveStepConfig {
  desktop?: Partial<StepDefinition>;
  tablet?: Partial<StepDefinition>;
  mobile?: Partial<StepDefinition>;
}

export interface StepDefinition {
  id: string;
  content: StepContent;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  target?: StepTarget;
  onBefore?: StepHook;
  onAfter?: StepHook;
  analytics?: AnalyticsPayload;
  responsive?: ResponsiveStepConfig;
  buttons?: StepButton[];
}

export interface StepButton {
  text: string;
  action: 'next' | 'back' | 'skip' | 'complete' | 'custom';
  customAction?: () => void;
  classes?: string;
}

export interface TourDefinition {
  id: TourId;
  name: string;
  description: string;
  priority?: TourPriority;
  autoStart?: boolean;
  throttleHours?: number;
  steps: StepDefinition[];
  triggers?: TourTrigger[];
  guards?: TourGuard[];
  version?: string;
}

export interface TourRequestOptions {
  id: TourId;
  mode?: 'user-triggered' | 'auto';
  reason?: string;
  force?: boolean;
}

export interface TourState {
  activeTourId: TourId | null;
  currentStepIndex: number;
  isRunning: boolean;
  isPaused: boolean;
  completedTours: Set<string>;
}

export interface TourEvent {
  type: 'started' | 'step_shown' | 'step_completed' | 'completed' | 'cancelled' | 'error';
  tourId: TourId;
  stepId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
