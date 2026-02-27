class ApplicationController < ActionController::Base
  before_action :set_locale
  protect_from_forgery with: :null_session

  private

  def set_locale
    requested_locale = params[:locale].presence || session[:locale]
    locale = resolve_locale(requested_locale) || I18n.default_locale

    I18n.locale = locale
    session[:locale] = locale.to_s
  end

  def resolve_locale(locale)
    return if locale.blank?

    locale_code = locale.to_s
    return unless I18n.available_locales.map(&:to_s).include?(locale_code)

    locale_code.to_sym
  end
end
