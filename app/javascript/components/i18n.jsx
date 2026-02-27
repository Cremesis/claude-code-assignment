import React, { createContext, useContext } from "react";

const I18nContext = createContext({ messages: {}, strict: false });

const lookup = (messages, key) => {
  return key.split(".").reduce((current, segment) => {
    if (
      current &&
      typeof current === "object" &&
      Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return current[segment];
    }
    return undefined;
  }, messages);
};

const interpolate = (template, vars) => {
  return template.replace(/%\{(\w+)\}/g, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return String(vars[name]);
    }
    return match;
  });
};

export function I18nProvider({ messages = {}, strict = false, children }) {
  return (
    <I18nContext.Provider value={{ messages, strict }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const { messages, strict } = useContext(I18nContext);

  return (key, options = {}) => {
    const { defaultValue, ...vars } = options;
    const resolved = lookup(messages, key);
    const hasStringValue = typeof resolved === "string";
    const value = hasStringValue ? resolved : defaultValue;

    if (!hasStringValue && strict) {
      throw new Error(`[i18n] Missing translation for key: ${key}`);
    }

    if (typeof value !== "string") {
      return key;
    }

    return interpolate(value, vars);
  };
}
