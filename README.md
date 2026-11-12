# 速算练习（PWA）

一个可以"装"进安卓手机的网页应用。首次通过电脑局域网加载一次，之后**完全离线可用**，从手机主屏幕图标点开即用，不依赖任何网络。

## 项目结构

```
train/
├── index.html            主页面（模块选择 / 答题 / 结算）
├── manifest.json         PWA 配置（名称、图标、全屏显示）
├── sw.js                 Service Worker（离线缓存核心）
├── css/style.css         样式
├── js/
│   ├── app.js            应用外壳（界面调度、两种答题方式、结算）
│   └── modules/          练习模块（每个模块一个文件，自行注册）
│       ├── registry.js   模块注册表 + 出题共享工具（rand/pick/shuffle/makeChoiceOptions）
│       ├── multiadd.js   多数相加（设置屏选个数 + 竖式/横式，键盘输入型示例）
│       ├── baihuafen.js  百化分背诵（查表示例）
│       └── baihuafen-est.js  百化分估算（精确模式/区间判题示例）
├── icons/                应用图标（192 / 512 / maskable）
├── scripts/gen-icons.ps1 图标重新生成脚本
├── start.bat             【双击这个】启动本地服务
└── start.ps1             启动脚本主体
```

## 新增一个练习模块（三步）

1. 在 `js/modules/` 下新建 `xxx.js`，调用 `registerModule({...})` 定义模块
   （接口：`id/name/icon/desc/total` + `makeQuestion()`，返回 `type:'keypad'` 或 `type:'choice'` 的题目）
2. 在 `index.html` 底部加一行 `<script src="js/modules/xxx.js"></script>`
3. 在 `sw.js` 的 `ASSETS` 里加一行并升级 `CACHE_NAME` 版本号

模板可参考 `js/modules/multiadd.js`（键盘输入型）或 `js/modules/baihuafen.js`（查表型）。

## 安装到手机（只需做一次）

### 方式一：公网安装源（推荐）

应用托管在 GitHub Pages：**https://gcman1234.github.io/speedmath/**

1. 手机浏览器打开上面的地址（任意网络，流量也行）
2. 点浏览器 **⋮ 菜单 →「添加到主屏幕」**（或地址栏右侧"安装应用"图标）
3. 主屏幕出现"速算练习"图标 ✅ 完成

从此离线可用；万一缓存丢失，任何有网的地方再打开一次该地址即可自愈。

### 方式二：局域网（开发调试用）

**前提**：手机和电脑连接**同一个 WiFi**。

1. 双击运行 `start.bat`，窗口会显示一个地址，例如 `http://192.168.3.11:8000`
2. 手机浏览器打开该地址，按上面同样方式添加到主屏幕
3. 此方式用于开发期快速预览，日常使用以方式一为准

## 日常使用

- 直接点主屏幕上的图标打开，**断网、飞行模式都能用**
- 想更新应用：双击 `start.bat`，手机联网打开一次地址，缓存会自动更新；主屏幕图标不受影响

## 卸载

长按主屏幕图标 → 移除/卸载。手机上的成绩记录会一并清除。

## 电脑端预览

双击 `start.bat` 后，在电脑浏览器打开 `http://localhost:8000`，实体键盘数字键 + 回车即可试玩。

## 后续扩展

练习规则（难度、计时闯关、错题本、统计图表等）随时可以在 `js/app.js` 中扩展；改完后手机联网打开一次即完成更新。
