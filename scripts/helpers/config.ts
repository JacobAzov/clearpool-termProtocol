import * as dotenv from 'dotenv'
const parsedEnv = dotenv.config()

function checkForEmptyObjectValues(obj: Record<string, any>) {
  return Object.entries(obj).every(([_, v]) => String(v).length > 0)
}

function getFilteredValuesfromObject(
  obj: Record<string, any>,
  filterFn: ([k, v]: [string, any]) => boolean,
) {
  const asArray = Object.entries(obj)
  const filtered = asArray.filter(filterFn)
  const asObject = Object.fromEntries(filtered)
  return asObject
}

function getEnvValue(name: string) {
  const envs = parsedEnv as Record<string, any>
  try {
    return envs.parsed[name] as string
  } catch (error) {
    throw 'Missing value for' + name
  }
}

export {
  checkForEmptyObjectValues,
  getFilteredValuesfromObject,
  getEnvValue,
}
