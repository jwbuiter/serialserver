export function mergeConfig(template, config) {
  if (config === undefined)
    return template;

  if (typeof template !== "object")
    return config;

  let result = Array.isArray(template) ? [] : {};

  for (const key in template) {
    result[key] = mergeConfig(template[key], config[key]);
  }

  return result;
}
