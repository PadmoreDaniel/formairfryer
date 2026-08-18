import { Form, FormExport, Project, ProjectExport } from '../types';
import { generateThemeCSS, generateFormHTML, generateFormJS, getGoogleFontsUrl, getFormConfigVar } from './wpPluginGenerator';
import { resolveEffectiveForm, generateChildId, projectPluginToFormPlugin } from './defaults';

// Analytics ingestion endpoint + write key are provided at build time. When
// the endpoint is empty, analytics is effectively disabled in exports.
const ANALYTICS_ENDPOINT = process.env.REACT_APP_ANALYTICS_ENDPOINT || '';
const ANALYTICS_WRITE_KEY = process.env.REACT_APP_ANALYTICS_WRITE_KEY || '';

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

// ==================== Project (multi-form) export ====================

// A child form resolved against its project, paired with its stable child id.
interface ResolvedChild {
  childId: string;
  form: Form;
  fontsUrl: string;
  configVar: string;
}

// Export a project (with all its child forms) as JSON.
export function exportProjectAsJSON(project: Project, forms: Form[]): string {
  const exportData: ProjectExport = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project,
    forms,
  };
  return JSON.stringify(exportData, null, 2);
}

// Download a project as JSON.
export function downloadProjectJSON(project: Project, forms: Form[]) {
  const json = exportProjectAsJSON(project, forms);
  downloadFile(json, `${project.defaults.plugin.pluginSlug}-project.json`, 'application/json');
}

// Ensure every child has a unique, shortcode-safe id within the project.
function resolveChildren(project: Project, forms: Form[]): ResolvedChild[] {
  const used = new Set<string>();
  return forms.map((form) => {
    const baseId = form.childId || generateChildId(form.name);
    let candidate = baseId;
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = `${baseId}_${suffix++}`;
    }
    used.add(candidate);

    const resolved = resolveEffectiveForm(form, project);
    // A project exports as a single plugin, so every child must share the
    // project's plugin identity (slug/shortcode). This keeps the localized
    // config variable, AJAX action and nonce consistent between the generated
    // PHP and JS — otherwise a child that doesn't inherit the plugin section
    // would look up a mismatched config var and load no styles/config.
    // Build a new object so the original form is never mutated.
    const effective: Form = {
      ...resolved,
      pluginSettings: projectPluginToFormPlugin(project.defaults.plugin),
    };
    return {
      childId: candidate,
      form: effective,
      fontsUrl: getGoogleFontsUrl(effective.theme) || '',
      configVar: getFormConfigVar(project.defaults.plugin.pluginSlug, candidate),
    };
  });
}

// Generate and download a single WordPress plugin containing every child form
// of a project. Forms are addressed with [shortcode id="childId"].
export async function downloadWordPressProjectPlugin(project: Project, forms: Form[]) {
  const { default: JSZip } = await import('jszip');

  const plugin = project.defaults.plugin;
  const pluginSlug = plugin.pluginSlug;
  const children = resolveChildren(project, forms);

  const zip = new JSZip();
  const pluginFolder = zip.folder(pluginSlug);
  if (!pluginFolder) {
    throw new Error('Failed to create plugin folder');
  }

  // Main plugin file + shared includes.
  pluginFolder.file(`${pluginSlug}.php`, generateProjectMainPluginFile(project, children));
  const includesFolder = pluginFolder.folder('includes');
  if (includesFolder) {
    includesFolder.file('class-form-handler.php', generateProjectFormHandlerClass(project));
    includesFolder.file('class-ajax-handler.php', generateProjectAjaxHandlerClass(project));
  }

  // Per-child assets, template and config.
  const formsFolder = pluginFolder.folder('forms');
  if (formsFolder) {
    for (const child of children) {
      const childFolder = formsFolder.folder(child.childId);
      if (!childFolder) continue;
      childFolder.file('form-config.json', exportFormAsJSON(child.form));
      const assets = childFolder.folder('assets');
      if (assets) {
        assets.file('css/form-styles.css', generateThemeCSS(child.form.theme));
        assets.file('js/form-handler.js', generateFormJS(child.form, child.childId));
      }
      const templates = childFolder.folder('templates');
      if (templates) {
        templates.file('form-template.php', generateFormHTML(child.form));
      }
    }
  }

  pluginFolder.file('README.md', generateProjectReadme(project, children));

  const content = await zip.generateAsync({ type: 'blob' });
  downloadFile(content as any, `${pluginSlug}.zip`, 'application/zip');
}

// Build the PHP `$forms` registry literal used by the main plugin class.
function buildFormsRegistryPhp(children: ResolvedChild[]): string {
  return children
    .map((c) => {
      const ac = c.form.analyticsConfig;
      const anEnabled = !!(ac && ac.enabled) && !!ANALYTICS_ENDPOINT;
      const sampleRate = ac && typeof ac.sampleRate === 'number' ? ac.sampleRate : 1;
      return `        '${c.childId}' => array(
            'name' => '${escapePhp(c.form.name)}',
            'configVar' => '${c.configVar}',
            'fontsUrl' => '${c.fontsUrl}',
            'analyticsEnabled' => ${anEnabled ? 'true' : 'false'},
            'analyticsFormId' => '${escapePhp(c.form.id)}',
            'analyticsProjectId' => '${escapePhp(c.form.projectId || '')}',
            'analyticsFormVersion' => '${escapePhp(c.form.version || '')}',
            'analyticsSampleRate' => ${sampleRate},
        ),`;
    })
    .join('\n');
}

function escapePhp(str: string): string {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Generate the main plugin PHP file for a project (multi-form) plugin.
function generateProjectMainPluginFile(project: Project, children: ResolvedChild[]): string {
  const plugin = project.defaults.plugin;
  const CONST = plugin.pluginSlug.toUpperCase().replace(/-/g, '_');
  const pascal = toPascalCase(plugin.pluginSlug);
  const registry = buildFormsRegistryPhp(children);

  return `<?php
/**
 * Plugin Name: ${plugin.pluginName}
 * Description: ${plugin.pluginDescription}
 * Version: ${plugin.pluginVersion}
 * Author: ${plugin.pluginAuthor}
 * License: GPL v2 or later
 * Text Domain: ${plugin.pluginSlug}
 *
 * This plugin hosts multiple forms belonging to the "${escapePhp(project.name)}" project.
 * Embed a specific form with: [${plugin.shortcode} id="child_id"]
 */

if (!defined('ABSPATH')) {
    exit;
}

define('${CONST}_VERSION', '${plugin.pluginVersion}');
define('${CONST}_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('${CONST}_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once ${CONST}_PLUGIN_DIR . 'includes/class-form-handler.php';
require_once ${CONST}_PLUGIN_DIR . 'includes/class-ajax-handler.php';

class ${pascal}_Plugin {

    private static $instance = null;

    // Registry of child forms keyed by their shortcode id.
    private $forms = array(
${registry}
    );

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_shortcode('${plugin.shortcode}', array($this, 'render_form_shortcode'));
        new ${pascal}_Ajax_Handler();
    }

    public function init() {
        load_plugin_textdomain('${plugin.pluginSlug}', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    /**
     * Enqueue the script, styles and localized config for a single child form.
     * Registers a unique handle per child so multiple forms can coexist on one page.
     */
    private function enqueue_form_scripts($child_id) {
        if (!isset($this->forms[$child_id])) {
            return;
        }
        $form = $this->forms[$child_id];
        $handle = '${plugin.pluginSlug}-handler-' . $child_id;
        $base_url = ${CONST}_PLUGIN_URL . 'forms/' . $child_id . '/';

        if (!wp_script_is($handle, 'registered')) {
${plugin.sentryDsn ? `            if (!wp_script_is('${plugin.pluginSlug}-sentry', 'registered')) {
                wp_register_script('${plugin.pluginSlug}-sentry', 'https://browser.sentry-cdn.com/8.49.0/bundle.min.js', array(), '8.49.0', true);
            }
` : ''}            wp_register_script(
                $handle,
                $base_url . 'assets/js/form-handler.js',
                array('jquery'${plugin.sentryDsn ? `, '${plugin.pluginSlug}-sentry'` : ''}),
                ${CONST}_VERSION . '.' . time(),
                true
            );
        }

        if (!empty($form['fontsUrl'])) {
            $fonts_handle = '${plugin.pluginSlug}-fonts-' . $child_id;
            if (!wp_style_is($fonts_handle, 'registered')) {
                wp_register_style($fonts_handle, $form['fontsUrl'], array(), null);
            }
            wp_enqueue_style($fonts_handle);
        }

        wp_enqueue_script($handle);

        $form_config = $this->get_form_config($child_id);
        $css_url = $base_url . 'assets/css/form-styles.css';

        $localize_data = array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('${plugin.pluginSlug}_nonce'),
            'formConfig' => $form_config,
            'cssUrl' => $css_url,
            'pluginSlug' => '${plugin.pluginSlug}',
            'childId' => $child_id,
            'analyticsEnabled' => !empty($form['analyticsEnabled']),
            'analyticsEndpoint' => '${escapePhp(ANALYTICS_ENDPOINT)}',
            'analyticsWriteKey' => '${escapePhp(ANALYTICS_WRITE_KEY)}',
            'analyticsFormId' => isset($form['analyticsFormId']) ? $form['analyticsFormId'] : '',
            'analyticsProjectId' => isset($form['analyticsProjectId']) ? $form['analyticsProjectId'] : '',
            'analyticsChildId' => $child_id,
            'analyticsFormVersion' => isset($form['analyticsFormVersion']) ? $form['analyticsFormVersion'] : '',
            'analyticsSampleRate' => isset($form['analyticsSampleRate']) ? $form['analyticsSampleRate'] : 1,
            'debug' => true${plugin.sentryDsn ? `,
            'sentryDsn' => '${escapePhp(plugin.sentryDsn)}'` : ''}
        );

        $css_file = ${CONST}_PLUGIN_DIR . 'forms/' . $child_id . '/assets/css/form-styles.css';
        if (file_exists($css_file)) {
            $css_content = file_get_contents($css_file);
            if ($css_content !== false && strlen($css_content) < 50000) {
                $localize_data['cssContent'] = $css_content;
            }
        }

        wp_localize_script($handle, $form['configVar'], $localize_data);
    }

    public function add_admin_menu() {
        ${generateAdminMenuCode(project.defaults.plugin as unknown as Form['pluginSettings'])}
    }

    public function render_admin_page() {
        echo '<div class="wrap"><h1>${escapePhp(plugin.pluginName)}</h1><p>Available forms:</p><ul>';
        foreach ($this->forms as $id => $form) {
            echo '<li><code>[${plugin.shortcode} id="' . esc_attr($id) . '"]</code> &mdash; ' . esc_html($form['name']) . '</li>';
        }
        echo '</ul></div>';
    }

    /**
     * Shortcode handler. Requires an "id" attribute identifying the child form.
     * An unknown or missing id renders nothing.
     */
    public function render_form_shortcode($atts) {
        $atts = shortcode_atts(array('id' => ''), $atts, '${plugin.shortcode}');
        $child_id = sanitize_key($atts['id']);

        if (empty($child_id) || !isset($this->forms[$child_id])) {
            return '';
        }

        $this->enqueue_form_scripts($child_id);

        ob_start();
        include ${CONST}_PLUGIN_DIR . 'forms/' . $child_id . '/templates/form-template.php';
        return ob_get_clean();
    }

    private function get_form_config($child_id) {
        $config_file = ${CONST}_PLUGIN_DIR . 'forms/' . $child_id . '/form-config.json';
        if (!file_exists($config_file)) {
            return array('error' => 'Config file not found', 'path' => $config_file);
        }
        $json = file_get_contents($config_file);
        if ($json === false) {
            return array('error' => 'Could not read config file');
        }
        $data = json_decode($json, true);
        if ($data === null) {
            return array('error' => 'Invalid JSON', 'message' => json_last_error_msg());
        }
        if (isset($data['form'])) {
            return $data['form'];
        }
        return $data;
    }
}

${pascal}_Plugin::get_instance();
`;
}

// Generate the shared form handler class for a project plugin. Instances are
// constructed with a child id and load that child's configuration.
function generateProjectFormHandlerClass(project: Project): string {
  const plugin = project.defaults.plugin;
  const CONST = plugin.pluginSlug.toUpperCase().replace(/-/g, '_');
  const pascal = toPascalCase(plugin.pluginSlug);
  const tablePrefix = plugin.pluginSlug.replace(/-/g, '_');

  return `<?php
/**
 * Form Handler Class (project / multi-form)
 */

if (!defined('ABSPATH')) {
    exit;
}

class ${pascal}_Form_Handler {

    private $form_config;
    private $child_id;

    public function __construct($child_id) {
        $this->child_id = $child_id;
        $this->form_config = $this->load_config($child_id);
    }

    private function load_config($child_id) {
        $config_file = ${CONST}_PLUGIN_DIR . 'forms/' . $child_id . '/form-config.json';
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
            $validation = isset($question['validation']) ? $question['validation'] : array();

            if (!empty($validation['required']) && empty($value)) {
                $errors[$question['id']] = 'This field is required';
                continue;
            }

            if (!empty($value)) {
                if (!empty($validation['minLength']) && strlen($value) < $validation['minLength']) {
                    $errors[$question['id']] = sprintf('Minimum %d characters required', $validation['minLength']);
                }
                if (!empty($validation['maxLength']) && strlen($value) > $validation['maxLength']) {
                    $errors[$question['id']] = sprintf('Maximum %d characters allowed', $validation['maxLength']);
                }
                if (!empty($validation['pattern'])) {
                    if (!preg_match('/' . $validation['pattern'] . '/', $value)) {
                        $errors[$question['id']] = !empty($validation['patternMessage'])
                            ? $validation['patternMessage']
                            : 'Invalid format';
                    }
                }
            }
        }

        return array('valid' => empty($errors), 'errors' => $errors);
    }

    public function process_submission($data) {
        $submission_config = $this->form_config['form']['submissionConfig'];

        $submit_data = array();
        foreach ($this->form_config['form']['steps'] as $step) {
            foreach ($step['questions'] as $question) {
                if (isset($data[$question['id']])) {
                    $submit_data[$question['id']] = sanitize_text_field($data[$question['id']]);
                }
            }
        }

        if (isset($data['referrer'])) {
            $submit_data['referrer'] = sanitize_text_field($data['referrer']);
        }
        if (isset($data['lastInternalPage'])) {
            $submit_data['lastInternalPage'] = sanitize_text_field($data['lastInternalPage']);
        }

        if (!empty($submission_config['url'])) {
            $response = wp_remote_post($submission_config['url'], array(
                'method' => $submission_config['method'],
                'headers' => $submission_config['headers'],
                'body' => json_encode($submit_data),
                'timeout' => 30
            ));

            if (is_wp_error($response)) {
                return array('success' => false, 'message' => $submission_config['errorMessage']);
            }
        }

        $this->save_submission($submit_data);

        return array(
            'success' => true,
            'message' => $submission_config['successMessage'],
            'redirect' => isset($submission_config['redirectOnSuccess']) ? $submission_config['redirectOnSuccess'] : ''
        );
    }

    private function save_submission($data) {
        global $wpdb;
        $table_name = $wpdb->prefix . '${tablePrefix}_submissions';
        $wpdb->insert($table_name, array(
            'child_id' => $this->child_id,
            'form_data' => json_encode($data),
            'submitted_at' => current_time('mysql'),
            'ip_address' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : ''
        ));
    }
}
`;
}

// Generate the AJAX handler class for a project plugin. A single pair of
// actions handles all child forms; the child is identified by the childId
// field in the request payload.
function generateProjectAjaxHandlerClass(project: Project): string {
  const plugin = project.defaults.plugin;
  const pascal = toPascalCase(plugin.pluginSlug);
  const action = plugin.pluginSlug.replace(/-/g, '_');

  return `<?php
/**
 * AJAX Handler Class (project / multi-form)
 */

if (!defined('ABSPATH')) {
    exit;
}

class ${pascal}_Ajax_Handler {

    public function __construct() {
        add_action('wp_ajax_${action}_submit', array($this, 'handle_submission'));
        add_action('wp_ajax_nopriv_${action}_submit', array($this, 'handle_submission'));
        add_action('wp_ajax_${action}_validate', array($this, 'handle_validation'));
        add_action('wp_ajax_nopriv_${action}_validate', array($this, 'handle_validation'));
    }

    private function resolve_child_id() {
        return isset($_POST['childId']) ? sanitize_key($_POST['childId']) : '';
    }

    public function handle_submission() {
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], '${plugin.pluginSlug}_nonce')) {
            wp_send_json_error(array('message' => 'Security check failed'));
        }

        $child_id = $this->resolve_child_id();
        if (empty($child_id)) {
            wp_send_json_error(array('message' => 'Missing form id'));
        }

        $form_handler = new ${pascal}_Form_Handler($child_id);

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
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], '${plugin.pluginSlug}_nonce')) {
            wp_send_json_error(array('message' => 'Security check failed'));
        }

        $child_id = $this->resolve_child_id();
        if (empty($child_id)) {
            wp_send_json_error(array('message' => 'Missing form id'));
        }

        $form_handler = new ${pascal}_Form_Handler($child_id);
        $step_index = isset($_POST['stepIndex']) ? intval($_POST['stepIndex']) : 0;

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

// Generate a README documenting the project's shortcodes.
function generateProjectReadme(project: Project, children: ResolvedChild[]): string {
  const plugin = project.defaults.plugin;
  const rows = children
    .map((c) => `- \`[${plugin.shortcode} id="${c.childId}"]\` — ${c.form.name}`)
    .join('\n');

  return `# ${plugin.pluginName}

${plugin.pluginDescription}

This plugin hosts multiple forms from the **${project.name}** project. Each form
is embedded with the shared shortcode and a form id:

\`\`\`
[${plugin.shortcode} id="child_id"]
\`\`\`

## Available forms

${rows}

## Installation

1. Upload the \`${plugin.pluginSlug}\` folder to \`/wp-content/plugins/\`.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Place a shortcode from the list above on any page or post.

Multiple forms from this project can be placed on the same page; each is
isolated and submits independently. An unknown or missing \`id\` renders nothing.

## Version

${plugin.pluginVersion}

## Author

${plugin.pluginAuthor}
`;
}

// Generate main plugin PHP file
function generateMainPluginFile(form: Form): string {
  const { pluginSettings } = form;
  const googleFontsUrl = getGoogleFontsUrl(form.theme);
  
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
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Register shortcode
        add_shortcode('${pluginSettings.shortcode}', array($this, 'render_form_shortcode'));
        
        // Register scripts early (does NOT load them — just makes them available)
        add_action('wp_enqueue_scripts', array($this, 'register_scripts'));
        
        // Initialize AJAX handler
        new ${toPascalCase(pluginSettings.pluginSlug)}_Ajax_Handler();
    }
    
    public function init() {
        // Load text domain
        load_plugin_textdomain('${pluginSettings.pluginSlug}', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    /**
     * Register scripts early but don't enqueue yet.
     * This only tells WP about the script — it won't be loaded until wp_enqueue_script() is called.
     */
    public function register_scripts() {
${googleFontsUrl ? `        // Register Google Fonts
        wp_register_style(
            '${pluginSettings.pluginSlug}-google-fonts',
            '${googleFontsUrl}',
            array(),
            null
        );
` : ''}${pluginSettings.sentryDsn ? `        // Register Sentry Browser SDK
        wp_register_script(
            '${pluginSettings.pluginSlug}-sentry',
            'https://browser.sentry-cdn.com/8.49.0/bundle.min.js',
            array(),
            '8.49.0',
            true
        );
` : ''}        wp_register_script(
            '${pluginSettings.pluginSlug}-handler',
            ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_URL . 'assets/js/form-handler.js',
            array('jquery'${pluginSettings.sentryDsn ? `, '${pluginSettings.pluginSlug}-sentry'` : ''}),
            ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_VERSION . '.' . time(),
            true
        );
    }
    
    /**
     * Enqueue scripts and localize config data.
     * Called from render_form_shortcode() — only runs on pages that actually use the shortcode.
     * Since the script was registered with $in_footer = true, WordPress handles late enqueuing.
     */
    private function enqueue_form_scripts() {
        wp_enqueue_script('${pluginSettings.pluginSlug}-handler');
${googleFontsUrl ? `        wp_enqueue_style('${pluginSettings.pluginSlug}-google-fonts');
` : ''}        
        $form_config = $this->get_form_config();
        
        // CSS file URL for <link> loading in Shadow DOM (preferred - avoids wp_localize_script encoding issues)
        $css_url = ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_URL . 'assets/css/form-styles.css';
        
        // Debug: log what we're passing to JS
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('WP Form Config: ' . print_r($form_config, true));
        }
        
        $localize_data = array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('${pluginSettings.pluginSlug}_nonce'),
            'formConfig' => $form_config,
            'cssUrl' => $css_url,
            'pluginSlug' => '${pluginSettings.pluginSlug}',
            'analyticsEnabled' => ${(!!(form.analyticsConfig && form.analyticsConfig.enabled) && !!ANALYTICS_ENDPOINT) ? 'true' : 'false'},
            'analyticsEndpoint' => '${escapePhp(ANALYTICS_ENDPOINT)}',
            'analyticsWriteKey' => '${escapePhp(ANALYTICS_WRITE_KEY)}',
            'analyticsFormId' => '${escapePhp(form.id)}',
            'analyticsProjectId' => '${escapePhp(form.projectId || '')}',
            'analyticsChildId' => '${escapePhp(form.childId || '')}',
            'analyticsFormVersion' => '${escapePhp(form.version || '')}',
            'analyticsSampleRate' => ${form.analyticsConfig && typeof form.analyticsConfig.sampleRate === 'number' ? form.analyticsConfig.sampleRate : 1},
            'debug' => true,
            'configPath' => ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR . 'form-config.json'${pluginSettings.sentryDsn ? `,
            'sentryDsn' => '${pluginSettings.sentryDsn.replace(/\\/g, '\\\\\\\\').replace(/'/g, "\\\\'")}'` : ''}
        );
        
        // Only include inline CSS content as fallback if URL approach might fail
        // Passing large CSS through wp_localize_script can cause JSON encoding issues
        // that break the entire config object (killing autoAdvance, colors, etc.)
        $css_file = ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR . 'assets/css/form-styles.css';
        if (file_exists($css_file)) {
            $css_content = file_get_contents($css_file);
            if ($css_content !== false && strlen($css_content) < 50000) {
                $localize_data['cssContent'] = $css_content;
            }
        }
        
        wp_localize_script('${pluginSettings.pluginSlug}-handler', '${toCamelCase(pluginSettings.pluginSlug)}Config', $localize_data);
    }
    
    public function add_admin_menu() {
        ${generateAdminMenuCode(pluginSettings)}
    }
    
    public function render_admin_page() {
        include ${pluginSettings.pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR . 'templates/admin-page.php';
    }
    
    /**
     * Shortcode handler — enqueues scripts only when the shortcode is actually rendered.
     */
    public function render_form_shortcode($atts) {
        // Enqueue scripts and config ONLY on pages that use this shortcode
        $this->enqueue_form_scripts();
        
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
        
        // Preserve page-history tracking values (wp-react-page-history-tracking)
        if (isset($data['referrer'])) {
            $submit_data['referrer'] = sanitize_text_field($data['referrer']);
        }
        if (isset($data['lastInternalPage'])) {
            $submit_data['lastInternalPage'] = sanitize_text_field($data['lastInternalPage']);
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
