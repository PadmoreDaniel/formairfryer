import { Form, FormExport } from '../types';
import { generateThemeCSS, generateFormHTML, generateFormJS } from './wpPluginGenerator';

// Export form as JSON
export function exportFormAsJSON(form: Form): string {
  const exportData: FormExport = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    form,
  };
  return JSON.stringify(exportData, null, 2);
}

// Import form from JSON
export function importFormFromJSON(jsonString: string): Form | null {
  try {
    const data = JSON.parse(jsonString);
    
    // Check if it's a FormExport or direct Form
    const form = data.form || data;
    
    // Basic validation
    if (!form.id || !form.steps || !form.theme) {
      throw new Error('Invalid form structure');
    }
    
    return form as Form;
  } catch (error) {
    console.error('Failed to import form:', error);
    return null;
  }
}

// Download a file
export function downloadFile(content: string, filename: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download form as JSON
export function downloadFormJSON(form: Form) {
  const json = exportFormAsJSON(form);
  const filename = `${form.pluginSettings.pluginSlug}-form.json`;
  downloadFile(json, filename, 'application/json');
}

// Generate and download WordPress plugin as ZIP
export async function downloadWordPressPlugin(form: Form) {
  const { default: JSZip } = await import('jszip');
  
  const zip = new JSZip();
  const pluginSlug = form.pluginSettings.pluginSlug;
  const pluginFolder = zip.folder(pluginSlug);
  
  if (!pluginFolder) {
    throw new Error('Failed to create plugin folder');
  }
  
  // Main plugin file
  pluginFolder.file(`${pluginSlug}.php`, generateMainPluginFile(form));
  
  // Assets folder
  const assetsFolder = pluginFolder.folder('assets');
  if (assetsFolder) {
    assetsFolder.file('css/form-styles.css', generateThemeCSS(form.theme));
    assetsFolder.file('js/form-handler.js', generateFormJS(form));
  }
  
  // Includes folder
  const includesFolder = pluginFolder.folder('includes');
  if (includesFolder) {
    includesFolder.file('class-form-handler.php', generateFormHandlerClass(form));
    includesFolder.file('class-ajax-handler.php', generateAjaxHandlerClass(form));
  }
  
  // Templates folder
  const templatesFolder = pluginFolder.folder('templates');
  if (templatesFolder) {
    templatesFolder.file('form-template.php', generateFormTemplate(form));
  }
  
  // Form configuration JSON
  pluginFolder.file('form-config.json', exportFormAsJSON(form));
  
  // README
  pluginFolder.file('README.md', generateReadme(form));
  
  // Generate ZIP
  const content = await zip.generateAsync({ type: 'blob' });
  downloadFile(content as any, `${pluginSlug}.zip`, 'application/zip');
}

// Generate main plugin PHP file
function generateMainPluginFile(form: Form): string {
  const { pluginSettings } = form;
  
  return `<?php
/**
 * Plugin Name: ${pluginSettings.pluginName}
 * Plugin URI: 
 * Description: ${pluginSettings.pluginDescription}
 * Version: ${pluginSettings.pluginVersion}
 * Author: ${pluginSettings.pluginAuthor}
 * License: GPL v2 or later
 * Text Domain: ${pluginSettings.pluginSlug}
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_VERSION', '${pluginSettings.pluginVersion}');
define('${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include required files
require_once ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR . 'includes/class-form-handler.php';
require_once ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR . 'includes/class-ajax-handler.php';

/**
 * Main Plugin Class
 */
class ${toPascalCase(pluginSettings.pluginSlug)}_Plugin {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Register shortcode
        add_shortcode('${pluginSettings.shortcode}', array($this, 'render_form_shortcode'));
        
        // Initialize AJAX handler
        new ${toPascalCase(pluginSettings.pluginSlug)}_Ajax_Handler();
    }
    
    public function init() {
        // Load text domain
        load_plugin_textdomain('${pluginSettings.pluginSlug}', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    public function enqueue_scripts() {
        // CSS is injected into Shadow DOM via JavaScript, not enqueued globally
        // This prevents WordPress theme conflicts completely
        
        wp_enqueue_script(
            '${pluginSettings.pluginSlug}-handler',
            ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_URL . 'assets/js/form-handler.js',
            array('jquery'),
            ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_VERSION . '.' . time(),
            true
        );
        
        $form_config = $this->get_form_config();
        
        // Load CSS content for Shadow DOM injection
        $css_file = ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR . 'assets/css/form-styles.css';
        $css_content = file_exists($css_file) ? file_get_contents($css_file) : '';
        
        // Debug: log what we're passing to JS
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('WP Form Config: ' . print_r($form_config, true));
        }
        
        wp_localize_script('${pluginSettings.pluginSlug}-handler', '${toCamelCase(pluginSettings.pluginSlug)}Config', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('${pluginSettings.pluginSlug}_nonce'),
            'formConfig' => $form_config,
            'cssContent' => $css_content,
            'pluginSlug' => '${pluginSettings.pluginSlug}',
            'debug' => true,
            'configPath' => ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR . 'form-config.json'
        ));
    }
    
    public function add_admin_menu() {
        ${generateAdminMenuCode(pluginSettings)}
    }
    
    public function render_admin_page() {
        include ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR . 'templates/admin-page.php';
    }
    
    public function render_form_shortcode($atts) {
        ob_start();
        include ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR . 'templates/form-template.php';
        return ob_get_clean();
    }
    
    private function get_form_config() {
        $config_file = ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR . 'form-config.json';
        
        // Debug: Check if file exists
        if (!file_exists($config_file)) {
            error_log('WP Form Builder: Config file not found at ' . $config_file);
            return array('error' => 'Config file not found', 'path' => $config_file);
        }
        
        $json = file_get_contents($config_file);
        if ($json === false) {
            error_log('WP Form Builder: Could not read config file');
            return array('error' => 'Could not read config file');
        }
        
        $data = json_decode($json, true);
        if ($data === null) {
            error_log('WP Form Builder: Invalid JSON in config file: ' . json_last_error_msg());
            return array('error' => 'Invalid JSON', 'message' => json_last_error_msg());
        }
        
        // The JSON has structure {version, exportedAt, form: {...}}
        // Return just the form object so JavaScript gets direct access to steps, progressConfig, etc.
        if (isset($data['form'])) {
            return $data['form'];
        }
        
        return $data;
    }
}

// Initialize plugin
${toPascalCase(pluginSettings.pluginSlug)}_Plugin::get_instance();
`;
}

// Generate Form Handler Class
function generateFormHandlerClass(form: Form): string {
  const { pluginSettings } = form;
  
  return `<?php
/**
 * Form Handler Class
 */

if (!defined('ABSPATH')) {
    exit;
}

class ${toPascalCase(pluginSettings.pluginSlug)}_Form_Handler {
    
    private $form_config;
    
    public function __construct() {
        $this->form_config = $this->load_config();
    }
    
    private function load_config() {
        $config_file = ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR . 'form-config.json';
        if (file_exists($config_file)) {
            $json = file_get_contents($config_file);
            return json_decode($json, true);
        }
        return array();
    }
    
    public function validate_step($step_index, $data) {
        $errors = array();
        
        if (!isset($this->form_config['form']['steps'][$step_index])) {
            return array('valid' => false, 'errors' => array('Invalid step'));
        }
        
        $step = $this->form_config['form']['steps'][$step_index];
        
        foreach ($step['questions'] as $question) {
            $value = isset($data[$question['id']]) ? $data[$question['id']] : '';
            $validation = $question['validation'];
            
            // Required validation
            if (!empty($validation['required']) && empty($value)) {
                $errors[$question['id']] = 'This field is required';
                continue;
            }
            
            if (!empty($value)) {
                // Min length
                if (!empty($validation['minLength']) && strlen($value) < $validation['minLength']) {
                    $errors[$question['id']] = sprintf('Minimum %d characters required', $validation['minLength']);
                }
                
                // Max length
                if (!empty($validation['maxLength']) && strlen($value) > $validation['maxLength']) {
                    $errors[$question['id']] = sprintf('Maximum %d characters allowed', $validation['maxLength']);
                }
                
                // Pattern
                if (!empty($validation['pattern'])) {
                    if (!preg_match('/' . $validation['pattern'] . '/', $value)) {
                        $errors[$question['id']] = !empty($validation['patternMessage']) 
                            ? $validation['patternMessage'] 
                            : 'Invalid format';
                    }
                }
            }
        }
        
        return array(
            'valid' => empty($errors),
            'errors' => $errors
        );
    }
    
    public function process_submission($data) {
        $submission_config = $this->form_config['form']['submissionConfig'];
        
        // Prepare data
        $submit_data = array();
        foreach ($this->form_config['form']['steps'] as $step) {
            foreach ($step['questions'] as $question) {
                if (isset($data[$question['id']])) {
                    $submit_data[$question['id']] = sanitize_text_field($data[$question['id']]);
                }
            }
        }
        
        // Send to external URL if configured
        if (!empty($submission_config['url'])) {
            $response = wp_remote_post($submission_config['url'], array(
                'method' => $submission_config['method'],
                'headers' => $submission_config['headers'],
                'body' => json_encode($submit_data),
                'timeout' => 30
            ));
            
            if (is_wp_error($response)) {
                return array(
                    'success' => false,
                    'message' => $submission_config['errorMessage']
                );
            }
        }
        
        // Store in database (optional)
        $this->save_submission($submit_data);
        
        return array(
            'success' => true,
            'message' => $submission_config['successMessage'],
            'redirect' => $submission_config['redirectOnSuccess']
        );
    }
    
    private function save_submission($data) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . '${pluginSettings.pluginSlug.replace(/-/g, '_')}_submissions';
        
        $wpdb->insert($table_name, array(
            'form_data' => json_encode($data),
            'submitted_at' => current_time('mysql'),
            'ip_address' => $_SERVER['REMOTE_ADDR']
        ));
    }
}
`;
}

// Generate AJAX Handler Class
function generateAjaxHandlerClass(form: Form): string {
  const { pluginSettings } = form;
  
  return `<?php
/**
 * AJAX Handler Class
 */

if (!defined('ABSPATH')) {
    exit;
}

class ${toPascalCase(pluginSettings.pluginSlug)}_Ajax_Handler {
    
    public function __construct() {
        add_action('wp_ajax_${pluginSettings.pluginSlug.replace(/-/g, '_')}_submit', array($this, 'handle_submission'));
        add_action('wp_ajax_nopriv_${pluginSettings.pluginSlug.replace(/-/g, '_')}_submit', array($this, 'handle_submission'));
        
        add_action('wp_ajax_${pluginSettings.pluginSlug.replace(/-/g, '_')}_validate', array($this, 'handle_validation'));
        add_action('wp_ajax_nopriv_${pluginSettings.pluginSlug.replace(/-/g, '_')}_validate', array($this, 'handle_validation'));
    }
    
    public function handle_submission() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], '${pluginSettings.pluginSlug}_nonce')) {
            wp_send_json_error(array('message' => 'Security check failed'));
        }
        
        $form_handler = new ${toPascalCase(pluginSettings.pluginSlug)}_Form_Handler();
        
        // Parse JSON data - it comes as a JSON string from the JS
        $raw_data = isset($_POST['formData']) ? $_POST['formData'] : '{}';
        $data = is_string($raw_data) ? json_decode(stripslashes($raw_data), true) : $raw_data;
        
        if ($data === null) {
            wp_send_json_error(array('message' => 'Invalid form data'));
        }
        
        $result = $form_handler->process_submission($data);
        
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }
    
    public function handle_validation() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], '${pluginSettings.pluginSlug}_nonce')) {
            wp_send_json_error(array('message' => 'Security check failed'));
        }
        
        $form_handler = new ${toPascalCase(pluginSettings.pluginSlug)}_Form_Handler();
        $step_index = isset($_POST['stepIndex']) ? intval($_POST['stepIndex']) : 0;
        
        // Parse JSON data
        $raw_data = isset($_POST['formData']) ? $_POST['formData'] : '{}';
        $data = is_string($raw_data) ? json_decode(stripslashes($raw_data), true) : $raw_data;
        
        if ($data === null) {
            $data = array();
        }
        
        $result = $form_handler->validate_step($step_index, $data);
        
        wp_send_json($result);
    }
}
`;
}

// Generate Form Template
function generateFormTemplate(form: Form): string {
  return generateFormHTML(form);
}

// Generate README
function generateReadme(form: Form): string {
  const { pluginSettings } = form;
  
  return `# ${pluginSettings.pluginName}

${pluginSettings.pluginDescription}

## Installation

1. Upload the \`${pluginSettings.pluginSlug}\` folder to the \`/wp-content/plugins/\` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Use the shortcode \`[${pluginSettings.shortcode}]\` in any page or post to display the form

## Shortcode

\`\`\`
[${pluginSettings.shortcode}]
\`\`\`

## Configuration

The form configuration is stored in \`form-config.json\`. You can modify this file to adjust form settings.

## Customization

### CSS

Custom styles can be added to \`assets/css/form-styles.css\`.

### JavaScript

Form behavior can be modified in \`assets/js/form-handler.js\`.

## Version

${pluginSettings.pluginVersion}

## Author

${pluginSettings.pluginAuthor}
`;
}

// Helper functions
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('_');
}

function toCamelCase(str: string): string {
  return str
    .split('-')
    .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function generateAdminMenuCode(pluginSettings: Form['pluginSettings']): string {
  switch (pluginSettings.menuLocation) {
    case 'settings':
      return `add_options_page(
            '${pluginSettings.pluginName}',
            '${pluginSettings.pluginName}',
            'manage_options',
            '${pluginSettings.pluginSlug}',
            array($this, 'render_admin_page')
        );`;
    case 'tools':
      return `add_management_page(
            '${pluginSettings.pluginName}',
            '${pluginSettings.pluginName}',
            'manage_options',
            '${pluginSettings.pluginSlug}',
            array($this, 'render_admin_page')
        );`;
    case 'toplevel':
      return `add_menu_page(
            '${pluginSettings.pluginName}',
            '${pluginSettings.pluginName}',
            'manage_options',
            '${pluginSettings.pluginSlug}',
            array($this, 'render_admin_page'),
            '${pluginSettings.menuIcon || 'dashicons-feedback'}',
            30
        );`;
    default:
      return '';
  }
}
