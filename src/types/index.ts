// Core type definitions for WordPress Form Builder

// ==================== Question Types ====================
export type QuestionType = 
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'currency'
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'time'
  | 'datetime'
  | 'file'
  | 'rating'
  | 'slider'
  | 'hidden'
  | 'eircode'
  | 'numberplate'
  | 'privacy_policy';

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface QuestionValidation {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  customValidation?: string; // JavaScript expression
}

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  fieldName?: string; // Custom field name for form output (defaults to id if not set)
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  options?: QuestionOption[]; // For radio, checkbox, select
  validation: QuestionValidation;
  privacyPolicyUrl?: string; // URL for privacy policy link (for privacy_policy type)
  privacyPolicyText?: string; // Text displayed next to the checkbox (for privacy_policy type)
  // Grid positioning
  gridColumn: number; // 1-12 grid system
  gridColumnSpan: number; // How many columns to span
  gridRow: number;
  // Conditional display
  conditionalDisplay?: Condition;
}

// ==================== Conditions ====================
export type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'
  | 'starts_with'
  | 'ends_with';

export interface ConditionRule {
  id: string;
  questionId: string; // Reference to the question being evaluated
  operator: ConditionOperator;
  value: string;
}

export type ConditionLogic = 'AND' | 'OR';

export interface Condition {
  id: string;
  logic: ConditionLogic;
  rules: ConditionRule[];
}

// ==================== Navigation ====================
export interface NavigationTarget {
  type: 'next' | 'previous' | 'specific' | 'submit' | 'url';
  stepId?: string; // For 'specific' type
  url?: string; // For 'url' type
}

export interface ConditionalNavigation {
  id: string;
  condition: Condition;
  target: NavigationTarget;
  priority: number; // Higher priority rules are evaluated first
}

export interface ButtonConfig {
  enabled: boolean;
  label: string;
  showIf?: Condition; // Condition to show the button
  enableIf?: Condition; // Condition to enable the button (if shown but might be disabled)
  customClass?: string;
  icon?: string;
}

// ==================== Step ====================
export interface Step {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  // Grid configuration
  gridColumns: number; // Number of columns (1-12)
  gridGap: number; // Gap in pixels
  // Navigation
  backButton: ButtonConfig;
  continueButton: ButtonConfig;
  conditionalNavigation: ConditionalNavigation[]; // For conditional step skipping
  defaultNextStep?: string; // Default next step ID if no conditions match
  defaultPrevStep?: string; // Default previous step ID
  // Validation
  validateOnContinue: boolean;
  // Auto-advance for single question steps
  autoAdvance?: boolean; // Automatically navigate to next step when question is answered
}

// ==================== Progress Bar ====================
export type ProgressMode = 
  | 'linear' // Equal progress per step
  | 'step_based' // Based on current step number
  | 'weighted' // Custom weight per step
  | 'exponential' // Exponential progress
  | 'question_based'; // Based on questions answered

export type ProgressBarPosition = 
  | 'top' // Above the form
  | 'bottom' // Below the form
  | 'card-top' // Border top of the card (like CI form)
  | 'card-bottom' // Border bottom of the card
  | 'inline'; // Inside step header

export interface ProgressConfig {
  enabled: boolean;
  mode: ProgressMode;
  position: ProgressBarPosition;
  stepWeights?: Record<string, number>; // For weighted mode
  exponentialBase?: number; // For exponential mode (default 2)
  showPercentage: boolean;
  showStepIndicator: boolean;
  showStepLabels: boolean;
  animationDuration: number; // ms
}

// ==================== Theme ====================
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}

export interface ThemeTypography {
  fontFamily: string;
  headingFontFamily: string;
  baseFontSize: number;
  headingScale: number;
  lineHeight: number;
}

export interface ThemeSpacing {
  unit: number; // Base spacing unit in pixels
  formPadding: number;
  questionGap: number;
  sectionGap: number;
}

export interface ThemeBorders {
  radius: number;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface ThemeButtons {
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  fontSize: number;
  fontWeight: number;
  textTransform: 'none' | 'uppercase' | 'capitalize';
}

export interface ThemeInputs {
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  fontSize: number;
  focusRingWidth: number;
  focusRingColor: string;
}

export interface ThemeProgressBar {
  height: number;
  borderRadius: number;
  backgroundColor: string;
  fillColor: string;
  animationType: 'ease' | 'linear' | 'ease-in-out' | 'bounce';
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borders: ThemeBorders;
  buttons: ThemeButtons;
  inputs: ThemeInputs;
  progressBar: ThemeProgressBar;
  customCSS?: string;
}

// ==================== Form Submission ====================
export interface SubmissionConfig {
  method: 'POST' | 'GET';
  url: string;
  headers: Record<string, string>;
  includeFields: 'all' | string[]; // 'all' or specific question IDs
  transformData?: string; // JavaScript function to transform data before sending
  successMessage: string;
  errorMessage: string;
  redirectOnSuccess?: string;
  redirectOnError?: string;
  // Success screen customization
  successIcon?: string; // Emoji or icon for success screen
  successBackgroundColor?: string; // Background color for success screen
  successTextColor?: string; // Text color for success message
}

// ==================== Form ====================
export interface Form {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: Step[];
  theme: Theme;
  progressConfig: ProgressConfig;
  submissionConfig: SubmissionConfig;
  // Metadata
  createdAt: string;
  updatedAt: string;
  author?: string;
  // Plugin settings
  pluginSettings: PluginSettings;
}

export interface PluginSettings {
  pluginName: string;
  pluginSlug: string;
  pluginVersion: string;
  pluginAuthor: string;
  pluginDescription: string;
  shortcode: string;
  menuLocation: 'settings' | 'tools' | 'toplevel';
  menuIcon?: string;
}

// ==================== Builder State ====================
export interface BuilderState {
  form: Form;
  selectedStepId: string | null;
  selectedQuestionId: string | null;
  previewMode: boolean;
  isDirty: boolean;
  history: Form[];
  historyIndex: number;
}

// ==================== JSON Export Format ====================
export interface FormExport {
  version: string;
  exportedAt: string;
  form: Form;
}

// ==================== Utility Types ====================
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface DragItem {
  type: 'question' | 'step';
  id: string;
  index: number;
}

export interface GridPosition {
  column: number;
  row: number;
  columnSpan: number;
}
