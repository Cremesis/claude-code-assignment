require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  CHROME_BINARY = ENV.fetch("CHROME_BINARY") {
    %w[/usr/bin/chromium /usr/bin/chromium-browser /usr/bin/google-chrome /usr/bin/google-chrome-stable]
      .find { |p| File.executable?(p) }
  }

  driven_by :selenium, using: :headless_chrome, screen_size: [1400, 900] do |driver_options|
    driver_options.binary = CHROME_BINARY if CHROME_BINARY
    driver_options.add_argument("--no-sandbox")
    driver_options.add_argument("--disable-dev-shm-usage")
    driver_options.add_argument("--disable-gpu")
  end

  private

  def ui_t(key, **options)
    I18n.t("frontend.#{key}", **options)
  end
end
