import React, { createContext, useContext } from "react";

const I18nContext = createContext({});

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

export function I18nProvider({ messages = {}, children }) {
  return <I18nContext.Provider value={messages}>{children}</I18nContext.Provider>;
}

export function useT() {
  const messages = useContext(I18nContext);

  return (key, options = {}) => {
    const { defaultValue, ...vars } = options;
    const resolved = lookup(messages, key);
    const value = typeof resolved === "string" ? resolved : defaultValue;

    if (typeof value !== "string") {
      return key;
    }

    return interpolate(value, vars);
  };
}
