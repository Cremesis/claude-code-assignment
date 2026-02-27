module ApplicationHelper
  def frontend_locale_options
    I18n.available_locales.map do |locale|
      {
        value: locale.to_s,
        label: t("app.locales.#{locale}", default: locale.to_s.upcase)
      }
    end
  end

  def frontend_locale_options_data
    json_escape(frontend_locale_options.to_json)
  end

  def frontend_i18n_data
    json_escape(I18n.t("frontend").to_json)
  end

  def frontend_i18n_strict_mode?
    Rails.env.test?
  end
end
