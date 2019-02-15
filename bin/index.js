/**
 * gql-gen の設定ファイルに環境変数を使えるように置換し一時ファイルを生成、
 * 生成された一時ファイルを gql-gen コマンドへ与える
 */
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const exec = promisify(require('child_process').exec)
const glob = require('glob')
const findRoot = require('find-root')
const statFile = promisify(fs.stat)
const uuid = require('uuid/v1')

const root = findRoot(__dirname)

const EXEC_FILE = path.resolve(root, '../.bin/gql-gen')
const CACHE_DIR = path.resolve(root, '../.cache')

/**
 * @param {string} filePath
 * @return {Promise<boolean>}
 */
const exists = async filePath => {
  try {
    await statFile(filePath)
  } catch (e) {
    return false
  }
  return true
}

/**
 * @param {string} configPath
 * @return {Promise<void>}
 */
const codegen = async configPath => {
  const tempConfigPath = path.resolve(
    CACHE_DIR,
    `${uuid()}${path.extname(configPath)}`
  )
  const configRaw = fs.readFileSync(configPath, 'utf-8')
  const config = configRaw.replace(/%(.+?)%/, (match, varName) =>
    varName in process.env ? process.env[varName] : match
  )

  if (!(await exists(CACHE_DIR))) {
    fs.mkdirSync(CACHE_DIR)
  }

  fs.writeFileSync(tempConfigPath, config)

  const { stdout, stderr } = await exec(`${EXEC_FILE} -c "${tempConfigPath}"`)
  fs.unlinkSync(tempConfigPath)
  if (stdout) console.log(stdout)
  if (stderr) console.error(stderr)
}

;(async () => {
  const configFiles =
    glob.sync('./src/infra/**/codegen.{yml,json}', {
      absolute: true
    }) || []

  if (!configFiles.length) {
    throw new Error('codegen.yml または codegen.json が存在しません。')
  }

  await Promise.all(configFiles.map(codegen))
})()
