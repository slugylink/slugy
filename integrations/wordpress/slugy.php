<?php
/**
 * Plugin Name: Slugy — Shorten & Track Links
 * Description: Auto-shorten post links with Slugy
 * Version: 0.1.0
 * Author: Slugy
 */

if (!defined('ABSPATH')) exit;

define('SLUGY_VERSION', '0.1.0');
define('SLUGY_OPTION_KEY', 'slugy_settings');

function slugy_get_settings() {
  $defaults = array('api_key' => '', 'api_base' => 'https://app.slugy.co', 'auto_shorten' => 0);
  $saved = get_option(SLUGY_OPTION_KEY, array());
  return is_array($saved) ? array_merge($defaults, $saved) : $defaults;
}

add_action('admin_menu', function () {
  add_options_page('Slugy', 'Slugy', 'manage_options', 'slugy', 'slugy_render_settings');
});

function slugy_render_settings() {
  if (isset($_POST['slugy_save']) && check_admin_referer('slugy_save')) {
    update_option(SLUGY_OPTION_KEY, array(
      'api_key' => sanitize_text_field($_POST['slugy_api_key'] ?? ''),
      'api_base' => esc_url_raw($_POST['slugy_api_base'] ?? 'https://app.slugy.co'),
      'auto_shorten' => !empty($_POST['slugy_auto']) ? 1 : 0,
    ));
    echo '<div class="updated"><p>Saved.</p></div>';
  }
  $s = slugy_get_settings();
  ?>
  <div class="wrap"><h1>Slugy</h1>
    <p>Paste a <strong>Links-write</strong> API key from Slugy → Settings → API Keys.</p>
    <form method="post">
      <?php wp_nonce_field('slugy_save'); ?>
      <table class="form-table">
        <tr><th>API key</th><td><input name="slugy_api_key" type="password" value="<?php echo esc_attr($s['api_key']); ?>" class="regular-text" /></td></tr>
        <tr><th>API base</th><td><input name="slugy_api_base" type="url" value="<?php echo esc_attr($s['api_base']); ?>" class="regular-text" /></td></tr>
        <tr><th>Auto-shorten on publish</th><td><input name="slugy_auto" type="checkbox" value="1" <?php checked($s['auto_shorten'], 1); ?> /></td></tr>
      </table>
      <p><input name="slugy_save" type="submit" class="button button-primary" value="Save" /></p>
    </form>
  </div>
  <?php
}

function slugy_create_link($url) {
  $s = slugy_get_settings();
  if (empty($s['api_key']) || empty($url)) return null;
  $res = wp_remote_post(trailingslashit($s['api_base']) . 'api/v1/link', array(
    'headers' => array('Content-Type' => 'application/json', 'Authorization' => 'Bearer ' . $s['api_key']),
    'body' => wp_json_encode(array('url' => $url)),
    'timeout' => 10,
  ));
  if (is_wp_error($res)) return null;
  $data = json_decode(wp_remote_retrieve_body($res), true);
  return $data['data']['shortUrl'] ?? $data['shortUrl'] ?? null;
}

// Meta box showing the short link for the current post.
add_action('add_meta_boxes', function () {
  add_meta_box('slugy_box', 'Slugy Short Link', function ($post) {
    $short = get_post_meta($post->ID, '_slugy_short', true);
    echo $short ? '<p><a href="' . esc_url($short) . '">' . esc_html($short) . '</a></p>'
      : '<p>No short link yet — publish with auto-shorten on.</p>';
  }, null, 'side');
});

add_action('transition_post_status', function ($new, $old, $post) {
  if ($new !== 'publish') return;
  $s = slugy_get_settings();
  if (empty($s['auto_shorten']) || get_post_meta($post->ID, '_slugy_short', true)) return;
  $short = slugy_create_link(get_permalink($post->ID));
  if ($short) update_post_meta($post->ID, '_slugy_short', esc_url_raw($short));
}, 10, 3);
