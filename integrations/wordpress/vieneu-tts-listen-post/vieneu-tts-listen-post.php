<?php
/**
 * Plugin Name: TTS - Nghe bài viết
 * Description: Thêm nút "Nghe bài viết" trên single post, gọi API TTS để phát audio.
 * Version: 0.1.0
 * Author: TTS SaaS
 */

if (!defined('ABSPATH')) exit;

define('VIENEU_TTS_VERSION', '0.1.0');
define('VIENEU_TTS_PLUGIN_DIR', plugin_dir_path(__FILE__));

class VieNeu_TTS_Listen_Post {

    public static function init() {
        add_action('admin_menu', [__CLASS__, 'add_menu']);
        add_action('admin_init', [__CLASS__, 'register_settings']);
        add_action('wp_ajax_vieneu_tts_synthesize', [__CLASS__, 'ajax_synthesize']);
        add_action('wp_ajax_nopriv_vieneu_tts_synthesize', [__CLASS__, 'ajax_synthesize']);
        add_action('wp_ajax_vieneu_tts_job_status', [__CLASS__, 'ajax_job_status']);
        add_action('wp_ajax_nopriv_vieneu_tts_job_status', [__CLASS__, 'ajax_job_status']);
        add_filter('the_content', [__CLASS__, 'inject_button'], 20);
        add_action('wp_enqueue_scripts', [__CLASS__, 'enqueue_scripts']);
    }

    public static function add_menu() {
        add_options_page(
            'TTS - Cấu hình',
            'TTS',
            'manage_options',
            'vieneu-tts',
            [__CLASS__, 'render_settings_page']
        );
    }

    public static function register_settings() {
        register_setting('vieneu_tts', 'vieneu_tts_api_url', [
            'sanitize_callback' => 'esc_url_raw',
        ]);
        register_setting('vieneu_tts', 'vieneu_tts_api_key', [
            'sanitize_callback' => 'sanitize_text_field',
        ]);
        register_setting('vieneu_tts', 'vieneu_tts_voice_id', [
            'sanitize_callback' => 'sanitize_text_field',
        ]);
        register_setting('vieneu_tts', 'vieneu_tts_enabled', [
            'type' => 'boolean',
            'default' => true,
        ]);
    }

    public static function render_settings_page() {
        if (!current_user_can('manage_options')) return;
        ?>
        <div class="wrap">
            <h1>TTS - Cấu hình</h1>
            <form method="post" action="options.php">
                <?php settings_fields('vieneu_tts'); ?>
                <table class="form-table">
                    <tr>
                        <th>API Base URL</th>
                        <td>
                            <input type="url" name="vieneu_tts_api_url" value="<?php echo esc_attr(get_option('vieneu_tts_api_url', '')); ?>" class="regular-text" placeholder="https://your-vps.com/api" />
                        </td>
                    </tr>
                    <tr>
                        <th>API Key (Tenant)</th>
                        <td>
                            <input type="password" name="vieneu_tts_api_key" value="<?php echo esc_attr(get_option('vieneu_tts_api_key', '')); ?>" class="regular-text" />
                        </td>
                    </tr>
                    <tr>
                        <th>Voice ID (mặc định)</th>
                        <td>
                            <input type="text" name="vieneu_tts_voice_id" value="<?php echo esc_attr(get_option('vieneu_tts_voice_id', '')); ?>" class="regular-text" placeholder="Để trống = mặc định" />
                        </td>
                    </tr>
                    <tr>
                        <th>Bật nút</th>
                        <td>
                            <label><input type="checkbox" name="vieneu_tts_enabled" value="1" <?php checked(get_option('vieneu_tts_enabled', true)); ?> /> Hiển thị nút "Nghe bài viết"</label>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public static function ajax_forbidden() {
        wp_send_json_error(['message' => 'Unauthorized'], 403);
    }

    public static function ajax_synthesize() {
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vieneu_tts_synth')) {
            wp_send_json_error(['message' => 'Invalid nonce'], 403);
        }
        $request_id = sanitize_text_field($_POST['request_id'] ?? ('wp_' . wp_generate_uuid4()));
        $text = sanitize_text_field($_POST['text'] ?? '');
        if (empty($text)) {
            wp_send_json_error(['message' => 'Text trống']);
        }
        $api_url = rtrim(get_option('vieneu_tts_api_url', ''), '/');
        $api_key = get_option('vieneu_tts_api_key', '');
        $voice_id = get_option('vieneu_tts_voice_id', '');
        if (empty($api_url) || empty($api_key)) {
            wp_send_json_error(['message' => 'Chưa cấu hình API']);
        }
        $body = json_encode([
            'text' => $text,
            'voiceId' => $voice_id ?: null,
            'idempotencyKey' => 'wp_' . uniqid('', true),
        ]);
        $res = wp_remote_post($api_url . '/v1/tts/synthesize', [
            'headers' => [
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $api_key,
                'X-Request-Id' => $request_id,
            ],
            'body' => $body,
            'timeout' => 30,
        ]);
        if (is_wp_error($res)) {
            wp_send_json_error(['message' => $res->get_error_message()]);
        }
        $code = wp_remote_retrieve_response_code($res);
        $data = json_decode(wp_remote_retrieve_body($res), true);
        if ($code >= 400) {
            wp_send_json_error($data ?: ['message' => 'API lỗi'], $code);
        }
        wp_send_json_success($data);
    }

    public static function ajax_job_status() {
        $job_id = sanitize_text_field($_GET['job_id'] ?? '');
        $request_id = sanitize_text_field($_GET['request_id'] ?? ('wp_' . wp_generate_uuid4()));
        if (empty($job_id)) {
            wp_send_json_error(['message' => 'Missing job_id']);
        }
        $api_url = rtrim(get_option('vieneu_tts_api_url', ''), '/');
        $api_key = get_option('vieneu_tts_api_key', '');
        if (empty($api_url) || empty($api_key)) {
            wp_send_json_error(['message' => 'Chưa cấu hình API']);
        }
        $res = wp_remote_get($api_url . '/v1/tts/jobs/' . urlencode($job_id), [
            'headers' => [
                'Authorization' => 'Bearer ' . $api_key,
                'X-Request-Id' => $request_id,
            ],
            'timeout' => 10,
        ]);
        if (is_wp_error($res)) {
            wp_send_json_error(['message' => $res->get_error_message()]);
        }
        $data = json_decode(wp_remote_retrieve_body($res), true);
        if (isset($data['error'])) {
            wp_send_json_error($data);
        }
        wp_send_json($data);
    }

    public static function inject_button($content) {
        if (!is_singular('post') || !get_option('vieneu_tts_enabled', true)) {
            return $content;
        }
        $btn = '<div class="vieneu-tts-wrap" style="margin:1em 0"><button type="button" class="vieneu-tts-btn" data-nonce="' . esc_attr(wp_create_nonce('vieneu_tts_synth')) . '">Nghe bài viết</button><div class="vieneu-tts-audio"></div><div class="vieneu-tts-error"></div></div>';
        return $btn . $content;
    }

    public static function enqueue_scripts() {
        if (!is_singular('post') || !get_option('vieneu_tts_enabled', true)) return;
        wp_enqueue_script(
            'vieneu-tts',
            plugins_url('assets/tts.js', __FILE__),
            [],
            VIENEU_TTS_VERSION,
            true
        );
        wp_localize_script('vieneu-tts', 'vieneuTts', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
        ]);
    }
}

VieNeu_TTS_Listen_Post::init();
