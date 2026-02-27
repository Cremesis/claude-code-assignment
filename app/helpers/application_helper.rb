module ApplicationHelper
  def frontend_i18n_data
    json_escape(I18n.t("frontend").to_json)
  end

  def frontend_i18n_strict_mode?
    Rails.env.test?
  end
end
