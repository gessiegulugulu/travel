# 冬日三城旅行计划

2026-12-25 至 2027-01-03，三位朋友从巴塞罗那、多伦多、香港／深圳出发的协作行程。目标网址：[gessiegulugulu.github.io/travel](https://gessiegulugulu.github.io/travel/)。本项目应放在**独立的新仓库** `gessiegulugulu/travel`，与个人博客仓库完全分开。

## 路线

布拉格 2 晚（12/26、12/27）→ 维也纳 4 晚（12/28 至 12/31）→ 布达佩斯 2 晚（1/1、1/2）；12/25 出发、1/3 返程。火车：12/28 Praha hl.n. → Wien Hbf；1/1 Wien Hbf → Budapest。维也纳停留最长；香港出发者持中国普通护照，签证受理资格取决于有效港澳居留证明及领馆要求。

## 部署 GitHub Pages

1. 在 `gessiegulugulu` 账户下创建**公开**仓库 `travel`，将此目录中的文件放到仓库根目录，默认分支为 `main`。
2. 进入 `Settings → Pages → Build and deployment`，选择 `Deploy from a branch`、`main`、`/(root)`，保存。根目录中的 `.nojekyll` 会让这些静态文件原样发布。
3. 打开 `https://gessiegulugulu.github.io/travel/`。如果个人主页已设置自定义域名，GitHub Pages 项目站点可能沿用该域名；请核对 Pages 设置。

## 在线编辑（共享密钥）

网页公开读取 GitHub 仓库的 `trip.json`。用户输入密钥后，网页用 GitHub REST API 检查文件的当前 SHA，随后只对 `trip.json` 发出更新请求。保存成功后，其他朋友刷新网页即可读取最新版本；如果在线文件已被别人修改，网页会拒绝覆盖并提示先下载备份。修改前后会在本机保存草稿，密钥仅在当前页面的 JavaScript 内存中使用，不写入 localStorage、仓库或 URL。

仓库主人需要自行创建一串 **fine-grained personal access token**：

- Resource owner: `gessiegulugulu`
- Repository access: **Only select repositories → travel**
- Repository permissions: **Contents → Read and write**（Metadata 为默认只读）
- Expiration: 尽量短，例如旅行结束后到期

通过可信的私下渠道分享给两位朋友。朋友**无需成为仓库协作者或拥有个人 GitHub 仓库权限**，但持有此令牌的人实际拥有 `travel` 仓库内容的写入权，且 GitHub 不支持把该令牌进一步限制到 `trip.json` 一个文件。若密钥泄露，立即在 GitHub 撤销并重新生成。不要把密钥放在公开仓库、URL 或群公告里。不要在公开行程写护照号、签证材料、预订确认号、个人联系方式。

可选的更严格方案是另建带密码验证的后端，只放行 `trip.json` 更新；那需要额外服务器或云服务及部署凭据。

## 本地预览

在此目录运行 `python3 -m http.server 8000`，打开 `http://localhost:8000/`。新仓库建立前，GitHub API 读取会失败，网页退回到本地 `trip.json`，在线保存不可用；仓库发布后将自动使用在线版本。

## 数据与估算

- `trip.json`：行程、航班报价、预算、待办和官方参考链接。
- `index.html` / `styles.css` / `app.js`：无构建依赖的静态网页。
- 预算起始数字是规划假设，不是可订价格；国际机票、签证费和个人购物未计入。
- A/B 仅比较三人机票报价；备选路线的住宿与火车仍需分别计算。
- 2026 年 9 月 28 日核对的官方来源列在网页末尾；票价、节日营业时间和签证规则在付款前再次核对。
