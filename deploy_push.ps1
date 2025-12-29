# deploy_push.ps1
# 一键初始化 git、提交并推送到远程仓库（PowerShell）
# 使用前请检查并替换 $remoteUrl 为你的仓库地址（已默认填入你提供的仓库）

$ErrorActionPreference = 'Stop'

# 远程仓库 URL（已填）
$remoteUrl = 'https://github.com/Magetutor/GTEx_gene_pathways_cor.git'

Write-Host "当前路径：" (Get-Location).Path

if (-not (Test-Path ".git")) {
    Write-Host "未检测到 .git，正在初始化仓库..."
    git init
} else {
    Write-Host ".git 已存在，跳过 git init"
}

Write-Host "添加常规忽略文件（.gitignore 已存在则无影响）"

git add .

try{
    git commit -m "Initial commit — GTEx webapp"
} catch {
    Write-Host "提交失败（可能无改动或已有提交），继续..." -ForegroundColor Yellow
}

git branch -M main 2>$null || Write-Host "已在 main 分支或无法重命名分支，继续..."

# 设置或更新远程 origin
$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0 -and $existing) {
    Write-Host "检测到已有 remote origin： $existing"
    if ($existing -ne $remoteUrl) {
        Write-Host "更新 origin 为： $remoteUrl"
        git remote remove origin
        git remote add origin $remoteUrl
    } else {
        Write-Host "origin 已指向目标仓库"
    }
} else {
    Write-Host "添加 origin -> $remoteUrl"
    git remote add origin $remoteUrl
}

Write-Host "正在推送到远程 main（可能需要输入 GitHub 凭据或使用已配置的 SSH/凭据）..."
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "推送成功。GitHub Actions 会自动开始部署（如果 workflow 已添加）。" -ForegroundColor Green
    Write-Host "请前往 https://github.com/Magetutor/GTEx_gene_pathways_cor/settings/pages 检查 Pages 设置。"
} else {
    Write-Host "推送失败，请根据错误信息处理（例如先拉取并合并远端改动）" -ForegroundColor Red
}

Write-Host "脚本完成。"
