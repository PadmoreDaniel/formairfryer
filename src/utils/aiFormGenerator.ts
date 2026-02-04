import { Form, Step, Question, QuestionType, QuestionOption, Theme } from '../types';
import { createForm, createStep, createQuestion, generateId, createDefaultTheme } from './defaults';

/**
 * OpenAI API Configuration - uses environment variables
 */
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const OPENAI_MODEL = process.env.REACT_APP_OPENAI_MODEL || 'gpt-4';

/**
 * Parsed form structure from AI response
 */
interface ParsedFormStructure {
  name: string;
  description?: string;
  steps: ParsedStep[];
  theme?: ParsedTheme;
}

interface ParsedStep {
  title: string;
  description?: string;
  questions: ParsedQuestion[];
}

interface ParsedQuestion {
  type: QuestionType;
  label: string;
  fieldName?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: string[];
}

interface ParsedTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  fontFamily?: string;
}

/**
 * Check if OpenAI API is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!OPENAI_API_KEY;
}

/**
 * Generate a form using OpenAI based on user prompt
 */
export async function generateFormWithAI(prompt: string): Promise<Form> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Please add REACT_APP_OPENAI_API_KEY to your .env file.');
  }

  const systemPrompt = buildSystemPrompt();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return parseAIResponseToForm(content);
}

/**
 * Build system prompt for AI
 */
function buildSystemPrompt(): string {
  return `You are a form builder AI assistant. When given a description of a form, you generate a JSON structure for that form.

Available question types:
- text: Single line text input
- textarea: Multi-line text input
- email: Email address input with validation
- phone: Phone number input
- number: Numeric input
- radio: Single choice from options
- checkbox: Multiple choice from options
- select: Dropdown selection
- multiselect: Multiple dropdown selection
- date: Date picker
- time: Time picker
- datetime: Date and time picker
- file: File upload
- rating: Star rating (1-5)
- slider: Range slider
- eircode: Irish postcode
- numberplate: Vehicle registration

Respond ONLY with a valid JSON object in this exact format:
{
  "name": "Form Name",
  "description": "Form description",
  "theme": {
    "primaryColor": "#3b82f6",
    "secondaryColor": "#10b981",
    "backgroundColor": "#ffffff",
    "textColor": "#1f2937",
    "borderRadius": 8,
    "fontFamily": "Inter, sans-serif"
  },
  "steps": [
    {
      "title": "Step Title",
      "description": "Step description",
      "questions": [
        {
          "type": "text",
          "label": "Question Label",
          "fieldName": "field_name_snake_case",
          "placeholder": "Placeholder text",
          "helpText": "Help text",
          "required": true,
          "options": ["Option 1", "Option 2"]
        }
      ]
    }
  ]
}

Guidelines:
1. Group related questions into logical steps
2. Use appropriate question types for the data being collected
3. Keep step titles concise but descriptive
4. Add helpful placeholders and help text
5. Mark essential fields as required
6. For choice questions, provide relevant options
7. ALWAYS include fieldName for each question using snake_case (e.g., "full_name", "email_address", "phone_number")
8. If the user mentions colors, styling, or themes, set the theme object accordingly
9. Common fieldNames: full_name, first_name, last_name, email, phone, address, city, country, message, comments, company, job_title, date_of_birth, etc.`;
}

/**
 * Parse AI response content to Form object
 */
function parseAIResponseToForm(content: string): Form {
  // Extract JSON from response (handle markdown code blocks)
  let jsonString = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1];
  }
  
  const parsed: ParsedFormStructure = JSON.parse(jsonString.trim());
  return buildFormFromParsed(parsed);
}

/**
 * Build Form object from parsed structure
 */
function buildFormFromParsed(parsed: ParsedFormStructure): Form {
  const form = createForm();
  form.name = parsed.name || 'AI Generated Form';
  form.description = parsed.description || '';
  
  // Apply theme if provided
  if (parsed.theme) {
    const defaultTheme = createDefaultTheme();
    form.theme = {
      ...defaultTheme,
      colors: {
        ...defaultTheme.colors,
        primary: parsed.theme.primaryColor || defaultTheme.colors.primary,
        secondary: parsed.theme.secondaryColor || defaultTheme.colors.secondary,
        background: parsed.theme.backgroundColor || defaultTheme.colors.background,
        text: parsed.theme.textColor || defaultTheme.colors.text,
      },
      typography: {
        ...defaultTheme.typography,
        fontFamily: parsed.theme.fontFamily || defaultTheme.typography.fontFamily,
      },
      borders: {
        ...defaultTheme.borders,
        radius: parsed.theme.borderRadius !== undefined ? parsed.theme.borderRadius : defaultTheme.borders.radius,
      },
    };
  }
  
  // Clear default steps
  form.steps = [];
  
  // Validate steps exist
  if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    // Create a default step if none provided
    const defaultStep = createStep(0);
    defaultStep.title = 'Step 1';
    defaultStep.backButton.enabled = false;
    defaultStep.continueButton.label = 'Submit';
    form.steps = [defaultStep];
    return form;
  }
  
  // Build steps
  parsed.steps.forEach((parsedStep, stepIndex) => {
    const step = createStep(stepIndex);
    step.title = parsedStep.title || `Step ${stepIndex + 1}`;
    step.description = parsedStep.description || '';
    step.questions = [];
    
    // Build questions (skip if no questions)
    if (parsedStep.questions && Array.isArray(parsedStep.questions)) {
      parsedStep.questions.forEach((parsedQuestion, questionIndex) => {
        // Skip invalid questions
        if (!parsedQuestion || !parsedQuestion.type) return;
        
        const question = createQuestion(parsedQuestion.type, questionIndex + 1);
        question.label = parsedQuestion.label || 'Question';
        question.placeholder = parsedQuestion.placeholder || '';
        question.helpText = parsedQuestion.helpText || '';
        question.validation.required = parsedQuestion.required || false;
        
        // Set fieldName - generate from label if not provided
        if (parsedQuestion.fieldName) {
          question.fieldName = parsedQuestion.fieldName;
        } else {
          // Generate fieldName from label
          question.fieldName = (parsedQuestion.label || 'field')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/(^_|_$)/g, '');
        }
      
        // Handle options for choice questions
        if (parsedQuestion.options && Array.isArray(parsedQuestion.options) && ['radio', 'checkbox', 'select', 'multiselect'].includes(parsedQuestion.type)) {
          question.options = parsedQuestion.options
            .filter(opt => opt && typeof opt === 'string')
            .map((opt) => ({
              id: generateId(),
              label: opt,
              value: opt.toLowerCase().replace(/\s+/g, '_'),
            }));
        }
        
        step.questions.push(question);
      });
    }
    
    // Set up navigation
    if (stepIndex > 0) {
      step.backButton.enabled = true;
      step.defaultPrevStep = form.steps[stepIndex - 1]?.id;
    }
    if (stepIndex < parsed.steps.length - 1) {
      step.continueButton.label = 'Continue';
    } else {
      step.continueButton.label = 'Submit';
    }
    
    form.steps.push(step);
  });
  
  // Update navigation references
  form.steps.forEach((step, index) => {
    if (index > 0) {
      step.defaultPrevStep = form.steps[index - 1].id;
    }
    if (index < form.steps.length - 1) {
      step.defaultNextStep = form.steps[index + 1].id;
    }
  });
  
  // Update plugin settings based on form name
  const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  form.pluginSettings.pluginName = form.name;
  form.pluginSettings.pluginSlug = slug || 'ai-generated-form';
  form.pluginSettings.shortcode = slug.replace(/-/g, '_') || 'ai_form';
  form.pluginSettings.pluginDescription = parsed.description || `A form for ${form.name}`;
  
  return form;
}

/**
 * Get example prompts for UI hints
 */
export function getExamplePrompts(): string[] {
  return [
    'Create a contact form with name, email, and message fields',
    'Build a customer feedback survey with rating and comments',
    'Generate a job application form with resume upload',
    'Make a booking form for appointments with date and time selection',
    'Create a newsletter subscription form',
    'Build a support ticket form with priority levels',
    'Generate a registration form for an event',
    'Create a quote request form for services',
  ];
}
