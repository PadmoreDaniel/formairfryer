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
  | 'year'
  | 'file'
  | 'rating'
  | 'slider'
  | 'hidden'
  | 'eircode'
  | 'numberplate'
  | 'privacy_policy'
  | 'helper_text';

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  imageUrl?: string;
  allowCustomInput?: boolean; // For radio: selecting this option reveals a free-text input whose value is submitted
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
  hideLabel?: boolean; // Option to hide label even if label text exists
  fieldName?: string; // Custom field name for form output (defaults to id if not set)
  valuePrefix?: string; // Custom text to prepend to the answer value on submission (e.g., "How can your advisor best help you? ")
  placeholder?: string;
  helpText?: string;
  imageUrl?: string; // Image URL to display with the question (above or below label)
  imagePosition?: 'above' | 'below'; // Position of the image relative to the label
  defaultValue?: string;
  options?: QuestionOption[]; // For radio, checkbox, select
  validation: QuestionValidation;
  privacyPolicyUrl?: string; // URL for privacy policy link (for privacy_policy type)
  privacyPolicyText?: string; // Text displayed next to the checkbox (for privacy_policy type)
  booleanValue?: boolean; // For privacy_policy type: submit as true/false instead of ["accepted"]
  useDateInputMask?: boolean; // For date fields: use text input with mask instead of date picker (better for mobile)
  yearInputStyle?: 'dropdown' | 'text'; // For year fields: render a dropdown or a free-text input
  minYear?: number; // For year fields (dropdown): earliest selectable year
  maxYear?: number; // For year fields (dropdown): latest selectable year
  maxYearCurrent?: boolean; // For year fields (dropdown): use the current year as the maximum (resolved dynamically)
  textAlignment?: 'left' | 'center' | 'right'; // For helper_text type: text alignment
  helperContent?: string; // For helper_text type: the display text content
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
  | 'age_greater_than'
  | 'age_less_than'
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

export type ButtonStyle = 'contained' | 'outlined' | 'text';

export interface ButtonConfig {
  enabled: boolean;
  label: string;
  style?: ButtonStyle;
  showIf?: Condition; // Condition to show the button
  enableIf?: Condition; // Condition to enable the button (if shown but might be disabled)
  customClass?: string;
  icon?: string;
}

// ==================== Step ====================
export type ContentAlignment = 'left' | 'center' | 'right';

export type BackgroundSize = 'cover' | 'contain' | 'auto';
export type BackgroundPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface StepBackgroundImage {
  url: string;
  size: BackgroundSize;
  position: BackgroundPosition;
  opacity: number; // 0-1
  overlay?: string; // Optional color overlay (e.g. 'rgba(0,0,0,0.5)')
}

export interface Step {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  // Grid configuration
  gridColumns: number; // Number of columns (1-12)
  gridGap: number; // Gap in pixels
  // Content alignment (title, description, buttons — not questions)
  contentAlignment?: ContentAlignment;
  // Background image
  backgroundImage?: StepBackgroundImage;
  // Layout
  minHeight?: number; // Optional minimum height in pixels
  // Navigation
  backButton: ButtonConfig;
  continueButton: ButtonConfig;
  conditionalNavigation: ConditionalNavigation[]; // For conditional step skipping
  defaultNextStep?: string; // Default next step ID if no conditions match
  defaultPrevStep?: string; // Default previous step ID
  // Validation
  validateOnContinue: boolean;
  scrollOnError?: boolean; // Scroll to first error on validation failure (default: true)
  // Auto-advance for single question steps
  autoAdvance?: boolean; // Automatically navigate to next step when question is answered
  autoAdvanceExcludeValues?: string[]; // Option values that should not auto-advance on single-question radio/select steps
  enterKeyAdvance?: boolean; // Allow Enter key to advance to next step in single question steps
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
export interface CustomField {
  id: string;
  key: string;
  value: string;
}

export interface SubmissionConfig {
  method: 'POST' | 'GET';
  url: string;
  appendWPCidParamsToSubmissionUrl?: boolean; // Exported WP runtime: append stored CID/UTM params to custom submission URL
  headers: Record<string, string>;
  includeFields: 'all' | string[]; // 'all' or specific question IDs
  transformData?: string; // JavaScript function to transform data before sending
  successMessage: string;
  errorMessage: string;
  redirectOnSuccess?: string;
  redirectOnError?: string;
  skipThankYouPage?: boolean; // If true, redirect immediately without showing thank you page
  // Custom fields to include in the POST body
  customFields?: CustomField[];
  // Success screen customization
  successIcon?: string; // Emoji or icon for success screen
  successBackgroundColor?: string; // Background color for success screen
  successTextColor?: string; // Text color for success message
  // Data Layer tracking
  dataLayerEventName?: string; // Optional: Google Tag Manager data layer event name to fire on submission
  // Conditional post-submission redirects
  postSubmissionRules?: PostSubmissionRedirectRule[];
}

// ==================== Post-Submission Redirect Rules ====================
export interface ApiResponseRedirectMapping {
  value: string; // Response value to match (e.g. "Declined")
  url: string; // Redirect URL for this value
}

export interface PostSubmissionRedirectTarget {
  type: 'url' | 'api';
  url: string; // Direct redirect URL (for 'url' type) or API endpoint (for 'api' type)
  apiConfig?: {
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    bodyTemplate?: string; // JSON template with {{fieldName}} placeholders
    redirectField: string; // JSON path to extract value from response (e.g. "risk")
    responseRedirectMap?: ApiResponseRedirectMapping[]; // Map response values to redirect URLs
    defaultRedirectUrl?: string; // Fallback URL if no mapping matches
  };
}

export interface PostSubmissionRedirectRule {
  id: string;
  priority: number;
  condition: Condition;
  target: PostSubmissionRedirectTarget;
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
  // ==================== Project linkage (v2) ====================
  // Current schema version for migration handling.
  schemaVersion?: number;
  // Owning project id (undefined for legacy standalone forms).
  projectId?: string;
  // Stable identifier used by the project shortcode: [project_shortcode id="childId"].
  childId?: string;
  // Per-section inheritance flags. When true, the section is taken from the
  // owning project's defaults; when false, the form's own values are used.
  inheritance?: FormInheritance;
}

// ==================== Project & Inheritance (v2) ====================
// Current schema version for forms and projects. Bump when the persisted
// shape changes so migration transforms can upgrade older records.
export const CURRENT_SCHEMA_VERSION = 2;

// Sections of a form that can be inherited from a project.
export type InheritableSection =
  | 'theme'
  | 'layout'
  | 'progress'
  | 'submission'
  | 'plugin';

// Per-section inherit vs override toggles for a child form.
export interface FormInheritance {
  theme: boolean;
  layout: boolean;
  progress: boolean;
  submission: boolean;
  plugin: boolean;
}

// Layout defaults applied to new steps and inherited by child forms.
export interface LayoutDefaults {
  gridColumns: number;
  gridGap: number;
  minHeight?: number;
  contentAlignment: ContentAlignment;
}

// Project-level plugin/export settings. The shortcode here is the plugin's
// shortcode tag; individual child forms are addressed via the id attribute.
export interface ProjectPluginSettings {
  pluginName: string;
  pluginSlug: string;
  pluginVersion: string;
  pluginAuthor: string;
  pluginDescription: string;
  shortcode: string;
  menuLocation: 'settings' | 'tools' | 'toplevel';
  menuIcon?: string;
  sentryDsn?: string;
  showSkeleton?: boolean;
}

// Shared defaults that child forms inherit unless they override a section.
export interface ProjectDefaults {
  theme: Theme;
  layout: LayoutDefaults;
  progress: ProgressConfig;
  submission: SubmissionConfig;
  plugin: ProjectPluginSettings;
}

// A Project houses multiple child forms and owns shared design/behavior
// defaults, and is the unit of WordPress plugin export.
export interface Project {
  id: string;
  name: string;
  description?: string;
  schemaVersion: number;
  defaults: ProjectDefaults;
  // Ordered list of child form ids belonging to this project.
  formIds: string[];
  createdAt: string;
  updatedAt: string;
  author?: string;
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
  sentryDsn?: string;
  showSkeleton?: boolean;
}

// ==================== Builder State ====================
export interface BuilderState {
  form: Form;
  // Owning project of the current form, if any. Holds shared defaults that
  // inherited sections resolve against.
  currentProject: Project | null;
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

// Project JSON export bundles the project and all of its child forms so the
// package is fully self-contained and can be re-imported later.
export interface ProjectExport {
  version: string;
  exportedAt: string;
  project: Project;
  forms: Form[];
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
