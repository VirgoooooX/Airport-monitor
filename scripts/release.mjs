import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

/**
 * 解析命令行参数
 */
function parseArgs(argv) {
  const options = {
    changelogCount: 30,
    bump: 'patch',
    version: undefined,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--version' || arg === '-v') {
      options.version = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--bump') {
      options.bump = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--changelog-count') {
      options.changelogCount = Number(argv[i + 1])
      i += 1
      continue
    }
  }
  return options
}

/**
 * 运行命令并实时输出
 */
function runStreaming(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32'
    const needsShell = isWindows && command === 'npm'
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: needsShell })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code: code ?? 1 }))
  })
}

/**
 * 运行命令并捕获输出
 */
async function runCapture(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32'
    const needsShell = isWindows && command === 'npm'
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: needsShell })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`${command} 失败(${code}): ${stderr || stdout}`))
    })
  })
}

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

function safeTsString(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${')
}

/**
 * 获取 Git 变更日志
 */
async function getGitChangelog(count) {
  const { stdout: head } = await runCapture('git', ['rev-parse', '--short', 'HEAD'], repoRoot)
  const { stdout: log } = await runCapture(
    'git',
    ['log', '-n', String(count), '--date=short', '--pretty=format:%h|%ad|%s'],
    repoRoot
  )

  const entries = log
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash = '', date = '', ...rest] = line.split('|')
      return { hash, date, message: rest.join('|') }
    })

  return { head: head.trim(), entries }
}

function buildInfoModule({ version, commit, builtAt, changelog }) {
  const changelogJson = JSON.stringify(changelog, null, 2)
  const escaped = safeTsString(changelogJson)
  return `export type ChangelogEntry = { hash: string; date: string; message: string }

export type BuildInfo = {
  version: string
  commit: string
  builtAt: string
  changelog: ChangelogEntry[]
}

export const buildInfo: BuildInfo = {
  version: '${safeTsString(version)}',
  commit: '${safeTsString(commit)}',
  builtAt: '${safeTsString(builtAt)}',
  changelog: JSON.parse(\`${escaped}\`) as ChangelogEntry[],
}
`
}

/**
 * 更新 buildInfo.ts
 */
async function writeBuildInfo(version, changelogCount) {
  const builtAt = new Date().toISOString()
  const { head, entries } = await getGitChangelog(changelogCount)
  const moduleContent = buildInfoModule({ version, commit: head, builtAt, changelog: entries })
  const outPath = path.join(repoRoot, 'src', 'buildInfo.ts')
  await writeFile(outPath, moduleContent, 'utf8')
  console.log(`✅ 已更新 buildInfo: ${outPath}`)
}

/**
 * 等待用户输入
 */
function waitForKey(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(message, () => {
      rl.close()
      resolve()
    })
  })
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const rootPkgPath = path.join(repoRoot, 'package.json')
  
  console.log('\n' + '='.repeat(70))
  console.log('🚀 Airport Monitor 发布流程')
  console.log('='.repeat(70) + '\n')

  // 1. 检查工作区是否干净
  try {
    const { stdout: status } = await runCapture('git', ['status', '--porcelain'], repoRoot)
    if (status.trim()) {
      console.log('⚠️  警告: 工作区有未提交的更改')
      console.log(status)
      await waitForKey('\n按回车键继续，或按 Ctrl+C 取消...')
    }
  } catch (e) {
    console.warn('无法检查 Git 状态:', e.message)
  }

  // 2. 获取当前版本
  const rootPkg = await readJson(rootPkgPath)
  const currentVersion = rootPkg.version
  console.log(`📦 当前版本: ${currentVersion}`)

  // 3. 确定目标版本
  let targetVersion = options.version
  if (!targetVersion) {
    console.log(`\n🔢 正在执行 npm version ${options.bump}...`)
    await runStreaming('npm', ['version', options.bump, '--no-git-tag-version'], repoRoot)
    targetVersion = (await readJson(rootPkgPath)).version
  } else {
    console.log(`\n🔢 设置版本为: ${targetVersion}`)
    await runStreaming('npm', ['version', targetVersion, '--no-git-tag-version'], repoRoot)
  }

  console.log(`✅ 新版本: ${targetVersion}`)

  // 4. 更新 buildInfo
  console.log('\n📝 正在更新 buildInfo.ts...')
  await writeBuildInfo(targetVersion, options.changelogCount)

  // 5. Git Add
  console.log('\n📂 正在暂存所有变更...')
  await runStreaming('git', ['add', '.'], repoRoot)

  // 6. 提示用户提交
  console.log('\n' + '='.repeat(70))
  console.log('✨ 版本变更已就绪！现在需要提交代码')
  console.log('='.repeat(70))
  console.log('\n选项 1: 使用 Kiro AI 生成提交信息')
  console.log('  1. 打开 Kiro 的"源代码管理"面板')
  console.log('  2. 点击提交框旁边的 [AI 图标] 生成提交信息')
  console.log('  3. 点击"提交 (Commit)"按钮')
  console.log('\n选项 2: 手动提交')
  console.log(`  git commit -m "chore: release v${targetVersion}"`)
  console.log('='.repeat(70) + '\n')

  await waitForKey('✅ 确认已完成提交后，按回车键继续发布流程...')

  // 7. 创建 Tag 并推送
  const tagName = `v${targetVersion}`
  console.log(`\n🏷️  正在创建标签: ${tagName}`)
  
  // 检查 tag 是否已存在
  try {
    await runCapture('git', ['rev-parse', tagName], repoRoot)
    console.log(`⚠️  标签 ${tagName} 已存在，正在删除...`)
    await runStreaming('git', ['tag', '-d', tagName], repoRoot)
  } catch (e) {
    // Tag 不存在，继续
  }

  await runStreaming('git', ['tag', '-a', tagName, '-m', `Release ${targetVersion}`], repoRoot)

  // 8. 推送到远程
  console.log('\n📤 正在推送代码和标签到 GitHub...')
  
  // 获取当前分支
  const { stdout: branch } = await runCapture('git', ['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot)
  const currentBranch = branch.trim()
  
  await runStreaming('git', ['push', 'origin', currentBranch], repoRoot)
  await runStreaming('git', ['push', 'origin', tagName], repoRoot)

  // 9. 完成
  console.log('\n' + '='.repeat(70))
  console.log('🎉 发布完成！')
  console.log('='.repeat(70))
  console.log(`\n📦 版本: ${targetVersion}`)
  console.log(`🏷️  标签: ${tagName}`)
  console.log(`🌿 分支: ${currentBranch}`)
  console.log('\n🐳 GitHub Actions 将自动构建并推送 Docker 镜像到:')
  console.log(`   ghcr.io/${process.env.GITHUB_REPOSITORY || 'your-username/airport-monitor'}:${targetVersion}`)
  console.log(`   ghcr.io/${process.env.GITHUB_REPOSITORY || 'your-username/airport-monitor'}:latest`)
  console.log('\n📊 查看构建进度:')
  console.log(`   https://github.com/${process.env.GITHUB_REPOSITORY || 'your-username/airport-monitor'}/actions`)
  console.log('='.repeat(70) + '\n')
}

main().catch((err) => {
  console.error(`\n❌ 发布失败: ${err.message}`)
  console.error(err.stack)
  process.exit(1)
})
