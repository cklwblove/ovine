/**
 * load & check site config
 */

import fs from 'fs-extra'
import importFresh from 'import-fresh'
import _ from 'lodash'
import path from 'path'

import { outDirName, configFileName, generatedDirName, srcDirName } from './constants'
import { BuildCliOptions, LoadContext, SiteConfig } from './types'

const requiredFields = ['favicon', 'title']

const optionalFields = [
  'publicPath',
  'envModes',
  'devServer',
  'ui',
  'staticFileExts',
  'template',
  'styledConfig',
  'cacheGroups',
  'splitRoutes',
]

const defaultConfig = {
  publicPath: '/',
  template: {},
  devServer: {},
  ui: {
    defaultTheme: 'default',
    withoutPace: false,
  },
}

function formatFields(fields: string[]): string {
  return fields.map((field) => `'${field}'`).join(', ')
}

export function loadConfig(siteDir: string, options: Partial<BuildCliOptions>): SiteConfig {
  const configPath = path.resolve(siteDir, configFileName)

  if (!fs.existsSync(configPath)) {
    throw new Error(`${configPath} not found! Please check the command line args.`)
  }

  const configFile = importFresh(configPath) as Partial<SiteConfig>

  const loadedConfig = _.isPlainObject(configFile)
    ? configFile
    : _.isFunction(configFile)
    ? configFile(options)
    : {}

  const missingFields = requiredFields.filter((field) => !_.has(loadedConfig, field))

  if (missingFields.length > 0) {
    throw new Error(
      `The required field(s) ${formatFields(missingFields)} are missing from ${configFileName}`
    )
  }

  // Merge default config with loaded config.
  const config = {
    ...defaultConfig,
    ...loadedConfig,
  }

  // Don't allow unrecognized fields.
  const allowedFields = [...requiredFields, ...optionalFields]
  const unrecognizedFields = Object.keys(config).filter((field) => !allowedFields.includes(field))

  const { publicPath = '/', envModes } = config
  // TODO: use json schema for Configuration verification!
  if (unrecognizedFields.length) {
    throw new Error(
      `The field(s) ${formatFields(unrecognizedFields)} are not recognized in ${configFileName}`
    )
  }

  if (typeof publicPath !== 'string' || publicPath.substr(-1) !== '/') {
    throw new Error(
      `publicPath: "${publicPath}" is not allowed. The "publicPath" must be string end with "/". eg: "/subPath/"`
    )
  }

  if (envModes) {
    if (!_.isArray(envModes) || envModes.some((i) => typeof i !== 'string')) {
      throw new Error(
        `envModes: "${envModes}" is not allowed. The "envModes" must be array of string.`
      )
    }
  }

  return config as SiteConfig
}

export function loadContext(siteDir: string, options: Partial<BuildCliOptions>): LoadContext {
  const genDir: string = path.resolve(siteDir, generatedDirName)

  const siteConfig: SiteConfig = loadConfig(siteDir, options)

  const outDir = path.resolve(siteDir, outDirName)
  const srcDir = path.resolve(siteDir, srcDirName)
  const { publicPath } = siteConfig

  return {
    siteDir,
    genDir,
    siteConfig,
    outDir,
    srcDir,
    publicPath,
  }
}
