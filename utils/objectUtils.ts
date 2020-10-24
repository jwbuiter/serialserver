export function mergeConfig(template, config) {
  if (config === undefined)
    return template;
  if (template === undefined)
    return config;

  if (typeof template !== "object")
    return config;

  let result;
  if (Array.isArray(template)) {
    result = [];
    let longest = Math.max(template.length, config.length);
    for (let i = 0; i < longest; i++)
      result[i] = mergeConfig(template[i], config[i]);
  } else {
    result = {};
    for (const key in template) {
      result[key] = mergeConfig(template[key], config[key]);
    }
  }

  return result;
}
