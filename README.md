# GTEx_gene_pathways_cor

静态前端应用：Gene → Pathway correlation explorer

说明（简体中文）：

- 已包含 `index.html`、`css/`、`js/`、`data/` 文件夹，基于 Plotly 和 PapaParse。
- 你可以把本项目部署到 GitHub Pages（步骤见下）。

快速部署步骤（在项目目录运行）：

```powershell
git init
git add .
git commit -m "Initial commit — GTEx webapp"
git branch -M main
git remote add origin https://github.com/Magetutor/GTEx_gene_pathways_cor.git
git push -u origin main
```

注意：如果远端仓库已有提交，可能需要先 `git pull --rebase origin main` 或协调合并策略。

自动部署（已添加 GitHub Actions workflow）
- 本仓库包含 `.github/workflows/deploy.yml`，会在 `main` push 时将站点发布到 `gh-pages` 分支（使用内置 `GITHUB_TOKEN`）。
- 在仓库 Settings → Pages 中，选择 Source 为 `gh-pages` 分支，或等待 Actions 首次运行后在 Pages 设置中选择对应分支。

如果需要，我可以：
- 帮你生成 PR 或直接在本地提交 workflow 文件（已生成），
- 或指导你完成首次 push（我可以生成精确命令）。

