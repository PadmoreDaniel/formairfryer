import { Form } from '../types';
import { createForm, createStep, createQuestion, generateId, defaultTheme } from './defaults';

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'contact' | 'feedback' | 'registration' | 'business' | 'survey';
  generate: () => Form;
}

/**
 * Pre-built form templates
 */
export const formTemplates: FormTemplate[] = [
  {
    id: 'contact-simple',
    name: 'Simple Contact',
    description: 'Basic contact form with name, email, and message',
    icon: '📧',
    category: 'contact',
    generate: generateSimpleContactForm,
  },
  {
    id: 'contact-detailed',
    name: 'Detailed Contact',
    description: 'Contact form with subject selection and phone',
    icon: '📞',
    category: 'contact',
    generate: generateDetailedContactForm,
  },
  {
    id: 'feedback-survey',
    name: 'Feedback Survey',
    description: 'Customer satisfaction survey with ratings',
    icon: '⭐',
    category: 'feedback',
    generate: generateFeedbackSurvey,
  },
  {
    id: 'newsletter',
    name: 'Newsletter Signup',
    description: 'Simple email subscription form',
    icon: '📰',
    category: 'contact',
    generate: generateNewsletterForm,
  },
  {
    id: 'event-registration',
    name: 'Event Registration',
    description: 'Register attendees for events',
    icon: '🎫',
    category: 'registration',
    generate: generateEventRegistrationForm,
  },
  {
    id: 'job-application',
    name: 'Job Application',
    description: 'Collect job applications with resume upload',
    icon: '💼',
    category: 'business',
    generate: generateJobApplicationForm,
  },
  {
    id: 'quote-request',
    name: 'Quote Request',
    description: 'Request quotes for services',
    icon: '💰',
    category: 'business',
    generate: generateQuoteRequestForm,
  },
  {
    id: 'booking',
    name: 'Appointment Booking',
    description: 'Schedule appointments with date/time',
    icon: '📅',
    category: 'business',
    generate: generateBookingForm,
  },
];

// Helper function to create questions
function createQ(
  type: Parameters<typeof createQuestion>[0],
  label: string,
  fieldName: string,
  row: number,
  required: boolean = false,
  options?: string[],
  placeholder?: string
) {
  const q = createQuestion(type, row);
  q.label = label;
  q.fieldName = fieldName;
  q.placeholder = placeholder || '';
  q.validation.required = required;
  if (options && ['radio', 'checkbox', 'select', 'multiselect'].includes(type)) {
    q.options = options.map(opt => ({
      id: generateId(),
      label: opt,
      value: opt.toLowerCase().replace(/\s+/g, '_'),
    }));
  }
  return q;
}

function generateSimpleContactForm(): Form {
  const form = createForm();
  form.name = 'Contact Form';
  form.description = 'Get in touch with us';
  
  const step = createStep(0);
  step.title = 'Contact Us';
  step.description = "We'd love to hear from you";
  step.backButton.enabled = false;
  step.continueButton.label = 'Send Message';
  
  step.questions = [
    createQ('text', 'Full Name', 'full_name', 1, true, undefined, 'Enter your full name'),
    createQ('email', 'Email Address', 'email', 2, true, undefined, 'your@email.com'),
    createQ('textarea', 'Your Message', 'message', 3, true, undefined, 'How can we help you?'),
  ];
  
  form.steps = [step];
  updateFormSettings(form);
  return form;
}

function generateDetailedContactForm(): Form {
  const form = createForm();
  form.name = 'Contact Form';
  form.description = 'Get in touch with our team';
  
  const step = createStep(0);
  step.title = 'Contact Information';
  step.description = 'Please fill out the form below';
  step.backButton.enabled = false;
  step.continueButton.label = 'Submit';
  
  step.questions = [
    createQ('text', 'Full Name', 'full_name', 1, true, undefined, 'John Smith'),
    createQ('email', 'Email Address', 'email', 2, true, undefined, 'john@example.com'),
    createQ('phone', 'Phone Number', 'phone', 3, false, undefined, '+1 (555) 123-4567'),
    createQ('select', 'Subject', 'subject', 4, true, [
      'General Inquiry',
      'Support Request',
      'Sales Question',
      'Partnership',
      'Other',
    ], 'Select a subject'),
    createQ('textarea', 'Your Message', 'message', 5, true, undefined, 'Tell us how we can help...'),
  ];
  
  form.steps = [step];
  updateFormSettings(form);
  return form;
}

function generateFeedbackSurvey(): Form {
  const form = createForm();
  form.name = 'Feedback Survey';
  form.description = 'Help us improve our service';
  
  const step1 = createStep(0);
  step1.title = 'Your Experience';
  step1.description = 'Rate your overall experience';
  step1.backButton.enabled = false;
  
  step1.questions = [
    createQ('rating', 'Overall Satisfaction', 'satisfaction_rating', 1, true),
    createQ('radio', 'Would you recommend us?', 'would_recommend', 2, true, [
      'Definitely Yes',
      'Probably Yes',
      'Not Sure',
      'Probably No',
      'Definitely No',
    ]),
    createQ('checkbox', 'What did you like?', 'liked_features', 3, false, [
      'Product Quality',
      'Customer Service',
      'Pricing',
      'Ease of Use',
      'Speed',
    ]),
  ];
  
  const step2 = createStep(1);
  step2.title = 'Additional Feedback';
  step2.description = 'Tell us more';
  step2.continueButton.label = 'Submit Feedback';
  
  step2.questions = [
    createQ('textarea', 'What could we improve?', 'improvements', 1, false, undefined, 'Your suggestions...'),
    createQ('textarea', 'Any other comments?', 'additional_comments', 2, false, undefined, 'Additional feedback...'),
    createQ('email', 'Email (optional)', 'email', 3, false, undefined, 'For follow-up'),
  ];
  
  form.steps = [step1, step2];
  setupNavigation(form);
  updateFormSettings(form);
  return form;
}

function generateNewsletterForm(): Form {
  const form = createForm();
  form.name = 'Newsletter Signup';
  form.description = 'Stay updated with our latest news';
  
  const step = createStep(0);
  step.title = 'Subscribe';
  step.description = 'Join our mailing list';
  step.backButton.enabled = false;
  step.continueButton.label = 'Subscribe';
  
  step.questions = [
    createQ('text', 'First Name', 'first_name', 1, true, undefined, 'Your first name'),
    createQ('email', 'Email Address', 'email', 2, true, undefined, 'your@email.com'),
    createQ('checkbox', 'Interests', 'interests', 3, false, [
      'Product Updates',
      'Industry News',
      'Tips & Tutorials',
      'Special Offers',
    ]),
  ];
  
  form.steps = [step];
  updateFormSettings(form);
  return form;
}

function generateEventRegistrationForm(): Form {
  const form = createForm();
  form.name = 'Event Registration';
  form.description = 'Register for our upcoming event';
  
  const step1 = createStep(0);
  step1.title = 'Personal Details';
  step1.description = 'Your information';
  step1.backButton.enabled = false;
  
  step1.questions = [
    createQ('text', 'Full Name', 'full_name', 1, true, undefined, 'John Smith'),
    createQ('email', 'Email Address', 'email', 2, true, undefined, 'john@example.com'),
    createQ('phone', 'Phone Number', 'phone', 3, false, undefined, '+1 (555) 123-4567'),
    createQ('text', 'Organization', 'organization', 4, false, undefined, 'Company name'),
  ];
  
  const step2 = createStep(1);
  step2.title = 'Event Options';
  step2.description = 'Select your preferences';
  step2.continueButton.label = 'Register';
  
  step2.questions = [
    createQ('select', 'Ticket Type', 'ticket_type', 1, true, [
      'General Admission',
      'VIP',
      'Student',
      'Group (5+)',
    ]),
    createQ('checkbox', 'Sessions', 'sessions', 2, false, [
      'Morning Keynote',
      'Afternoon Workshops',
      'Evening Networking',
    ]),
    createQ('textarea', 'Dietary Requirements', 'dietary_requirements', 3, false, undefined, 'Any allergies or preferences?'),
  ];
  
  form.steps = [step1, step2];
  setupNavigation(form);
  updateFormSettings(form);
  return form;
}

function generateJobApplicationForm(): Form {
  const form = createForm();
  form.name = 'Job Application';
  form.description = 'Apply for a position';
  
  const step1 = createStep(0);
  step1.title = 'Personal Information';
  step1.description = 'Your contact details';
  step1.backButton.enabled = false;
  
  step1.questions = [
    createQ('text', 'Full Name', 'full_name', 1, true, undefined, 'Enter your full name'),
    createQ('email', 'Email Address', 'email', 2, true, undefined, 'your@email.com'),
    createQ('phone', 'Phone Number', 'phone', 3, true, undefined, '+1 (555) 123-4567'),
    createQ('text', 'Location', 'location', 4, false, undefined, 'City, Country'),
  ];
  
  const step2 = createStep(1);
  step2.title = 'Experience';
  step2.description = 'Your professional background';
  
  step2.questions = [
    createQ('select', 'Years of Experience', 'experience_years', 1, true, [
      '0-1 years',
      '1-3 years',
      '3-5 years',
      '5-10 years',
      '10+ years',
    ]),
    createQ('text', 'Current Job Title', 'current_title', 2, true, undefined, 'e.g., Software Engineer'),
    createQ('textarea', 'Experience Summary', 'experience_summary', 3, true, undefined, 'Briefly describe your relevant experience...'),
  ];
  
  const step3 = createStep(2);
  step3.title = 'Additional Info';
  step3.description = 'Complete your application';
  step3.continueButton.label = 'Submit Application';
  
  step3.questions = [
    createQ('file', 'Upload Resume/CV', 'resume', 1, true),
    createQ('text', 'LinkedIn Profile', 'linkedin', 2, false, undefined, 'https://linkedin.com/in/...'),
    createQ('textarea', 'Why this role?', 'motivation', 3, true, undefined, 'What interests you about this position?'),
    createQ('radio', 'Work Authorization', 'work_auth', 4, true, [
      'Yes, authorized',
      'No, need sponsorship',
    ]),
  ];
  
  form.steps = [step1, step2, step3];
  setupNavigation(form);
  updateFormSettings(form);
  return form;
}

function generateQuoteRequestForm(): Form {
  const form = createForm();
  form.name = 'Quote Request';
  form.description = 'Get a personalized quote';
  
  const step1 = createStep(0);
  step1.title = 'Service Details';
  step1.description = 'Tell us what you need';
  step1.backButton.enabled = false;
  
  step1.questions = [
    createQ('select', 'Service Type', 'service_type', 1, true, [
      'Basic Package',
      'Standard Package',
      'Premium Package',
      'Custom Solution',
    ]),
    createQ('textarea', 'Project Description', 'project_description', 2, true, undefined, 'Describe your project or requirements...'),
    createQ('select', 'Budget Range', 'budget_range', 3, false, [
      'Under $1,000',
      '$1,000 - $5,000',
      '$5,000 - $10,000',
      '$10,000+',
    ]),
    createQ('select', 'Timeline', 'timeline', 4, true, [
      'ASAP',
      'Within 1 week',
      'Within 1 month',
      'Flexible',
    ]),
  ];
  
  const step2 = createStep(1);
  step2.title = 'Contact Information';
  step2.description = "We'll send your quote here";
  step2.continueButton.label = 'Request Quote';
  
  step2.questions = [
    createQ('text', 'Full Name', 'full_name', 1, true, undefined, 'Your name'),
    createQ('text', 'Company', 'company', 2, false, undefined, 'Company name'),
    createQ('email', 'Email Address', 'email', 3, true, undefined, 'your@email.com'),
    createQ('phone', 'Phone Number', 'phone', 4, false, undefined, '+1 (555) 123-4567'),
  ];
  
  form.steps = [step1, step2];
  setupNavigation(form);
  updateFormSettings(form);
  return form;
}

function generateBookingForm(): Form {
  const form = createForm();
  form.name = 'Appointment Booking';
  form.description = 'Schedule your appointment';
  
  const step1 = createStep(0);
  step1.title = 'Select Service';
  step1.description = 'Choose your appointment type';
  step1.backButton.enabled = false;
  
  step1.questions = [
    createQ('select', 'Service Type', 'service_type', 1, true, [
      'Consultation',
      'Follow-up',
      'Initial Assessment',
      'Other',
    ]),
    createQ('date', 'Preferred Date', 'preferred_date', 2, true),
    createQ('time', 'Preferred Time', 'preferred_time', 3, true),
    createQ('radio', 'Duration', 'duration', 4, true, [
      '30 minutes',
      '1 hour',
      '2 hours',
    ]),
  ];
  
  const step2 = createStep(1);
  step2.title = 'Your Details';
  step2.description = 'Contact information';
  step2.continueButton.label = 'Book Appointment';
  
  step2.questions = [
    createQ('text', 'Full Name', 'full_name', 1, true, undefined, 'Your name'),
    createQ('email', 'Email Address', 'email', 2, true, undefined, 'your@email.com'),
    createQ('phone', 'Phone Number', 'phone', 3, true, undefined, '+1 (555) 123-4567'),
    createQ('textarea', 'Additional Notes', 'notes', 4, false, undefined, 'Any special requirements?'),
  ];
  
  form.steps = [step1, step2];
  setupNavigation(form);
  updateFormSettings(form);
  return form;
}

// Helper functions
function setupNavigation(form: Form): void {
  form.steps.forEach((step, index) => {
    if (index > 0) {
      step.defaultPrevStep = form.steps[index - 1].id;
    }
    if (index < form.steps.length - 1) {
      step.defaultNextStep = form.steps[index + 1].id;
    }
  });
}

function updateFormSettings(form: Form): void {
  const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  form.pluginSettings.pluginName = form.name;
  form.pluginSettings.pluginSlug = slug || 'custom-form';
  form.pluginSettings.shortcode = slug.replace(/-/g, '_') || 'custom_form';
  form.pluginSettings.pluginDescription = form.description || `Form: ${form.name}`;
}
