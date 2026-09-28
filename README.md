# 冬日三城旅行计划

2026-12-25 至 2027-01-03，三位朋友从巴塞罗那、多伦多、香港／深圳出发的协作行程。网站：[gessiegulugulu.github.io/travel](https://gessiegulugulu.github.io/travel/)。本项目位于**独立仓库** `gessiegulugulu/travel`，与个人博客仓库分开。

## 路线

布拉格 2 晚（12/26、12/27）→ 维也纳 4 晚（12/28 至 12/31）→ 布达佩斯 2 晚（1/1、1/2）；12/25 出发、1/3 返程。火车：12/28 Praha hl.n. → Wien Hbf；1/1 Wien Hbf → Budapest。维也纳停留最长；香港出发者持中国普通护照，签证受理资格取决于有效港澳居留证明及领馆要求。

逐日卡片含建议时段、交通动线、预订与天气备选；“景点准备”含七张可在线修改的景点卡片和官网参考。布拉格城堡的周日主教座堂安排在中午后；塞切尼温泉安排 1/2，避免元旦火车延误影响入场。建议时段不是已订车次或门票。

## 部署 GitHub Pages

1. 在 `gessiegulugulu` 账户下创建**公开**仓库 `travel`，将此目录中的文件放到仓库根目录，默认分支为 `main`。
2. 进入 `Settings → Pages → Build and deployment`，选择 `Deploy from a branch`、`main`、`/(root)`，保存。根目录中的 `.nojekyll` 会让这些静态文件原样发布。
3. 打开 `https://gessiegulugulu.github.io/travel/`。如果个人主页已设置自定义域名，GitHub Pages 项目站点可能沿用该域名；请核对 Pages 设置。

## 免输入密钥的共享编辑

页面仍由 GitHub Pages 托管；行程数据放在独立的 Supabase 数据表。朋友无需 GitHub 仓库权限、账号或手动输入密钥，打开页面修改并点击“保存到共享计划”即可同步。浏览器先保存本机草稿；保存时按数据库版本号原子更新，若他人抢先保存会提示冲突并保留草稿。网页上的公开配置只用 Supabase **publishable key**，绝不可填写 secret / service role key。

首次启用需要仓库主人完成这三步：

1. 新建一个 Supabase 项目，在项目的 **SQL Editor** 中运行 [`setup.sql`](setup.sql)。脚本建立仅含一条公开行程记录的数据表，并导入当前 `trip.json`。重复运行不会覆盖行程数据。
2. 在项目的 **Connect** 或 **Settings → API Keys** 找到 Project URL 和 `sb_publishable_...`，填写到 [`config.js`](config.js) 的 `url` 和 `publishableKey`。这两项是公开的网页配置，不是私人密钥。
3. 将改动提交到 `travel` 仓库 `main`，等 GitHub Pages 发布后，在两个不同浏览器分别修改并刷新核对。若 `config.js` 仍为空，页面只显示内置行程，允许本机草稿和下载备份，但共享保存会暂停并显示明确提示。

这个方案对**所有访问者开放写入**。知道网址的人可以改公开行程，不能证明是谁修改；不要写护照号、签证资料、预订确认号或联系方式。数据库 `travel_plan_history` 会保存被替换的旧版本，仅项目主人可在 SQL Editor 中查看和恢复。若以后需要仅限朋友修改，可加登录限制。

### 恢复旧版

在 Supabase SQL Editor 查看 `select revision, replaced_at from public.travel_plan_history order by revision desc;`，选定版本后运行：

```sql
update public.travel_plan
set data = (select data from public.travel_plan_history where revision = 1),
    revision = revision + 1
where id = 'main';
```

将示例中的 `1` 换成要恢复的版本号。当前版在恢复前也会自动存入历史表。

## 本地预览

在此目录运行 `python3 -m http.server 8000`，打开 `http://localhost:8000/`。未填公开配置前，网页读取内置 `trip.json`，可保存本机草稿和下载备份；完成数据表及 `config.js` 后才会启用共享保存。

## 数据与估算

- `trip.json`：详细逐日安排、景点准备卡片、航班报价、预算、待办和官方参考链接。逐日安排及景点卡片均可通过网页编辑。
- `index.html` / `styles.css` / `app.js` / `config.js`：无构建依赖的静态网页；`setup.sql` 是一次性数据库安装脚本。
- 预算起始数字是规划假设，不是可订价格；活动门票基数 €145／人按城堡、宫殿、一座美术馆和温泉大致预留，实际票价及取舍可在网页修改。国际机票、签证费和个人购物未计入。
- A/B 仅比较三人机票报价；备选路线的住宿与火车仍需分别计算。
- 2026 年 9 月 28 日核对的官方来源列在网页末尾；票价、节日营业时间和签证规则在付款前再次核对。
