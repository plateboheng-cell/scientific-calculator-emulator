# 第三方组件与审查 / Third-party notices and review

核对日期：2026-10-21（Asia/Shanghai），依据当前 `package-lock.json` 和 `npm ci` 安装包。原创源码使用 MIT；第三方组件继续适用各自许可证。该清单是工程审查记录，不替代上游许可原文，也不代表依赖绝对安全。

Reviewed against this checkout's lockfile and installed packages on 2026-10-21. Project source is MIT; dependencies retain their own terms. This inventory does not guarantee that dependencies are vulnerability-free.

## 应用依赖 / Application dependencies

| 组件 / Component | 已安装版本 / Installed version | 许可 / License | 用途 / Use |
| --- | --- | --- | --- |
| MathLive | 0.111.1 | MIT | 二维公式编辑与随包数学字体 |
| Cortex Compute Engine | 0.154.0 | MIT | MathJSON/LaTeX 解析转换 |
| mathjs | 15.2.0 | Apache-2.0 | 数值类型、解析、矩阵及数学运算；保留 LICENSE 和 NOTICE |
| KaTeX | 0.16.47 | MIT | 结果公式显示与随包数学字体 |
| Electron | 44.8.0 | MIT；Chromium 等另附第三方声明 | Windows 桌面运行时；保留 LICENSE 与 LICENSES.chromium.html |

生产依赖树另包含 `@arnog/colors`、`@babel/runtime`、`complex.js`、`decimal.js`、`escape-latex`、`fraction.js`、`javascript-natural-sort`、`commander`、`seedrandom`、`tiny-emitter` 和 `typed-function`，当前包声明均为 MIT。`seedrandom` 的许可存在源码头而非独立 LICENSE 文件，收集脚本包含其原始头注释；`javascript-natural-sort` 提供 MIT/作者声明头注释。数学字体原样分发，保留上游软件包通知；KaTeX 字体来源的 [MIT 声明](https://github.com/KaTeX/katex-fonts/blob/master/LICENSE)也应随分发审查。

运行 `node scripts/dependency-licenses.mjs`，离线生成：

- `.verification/dependency-licenses.json`：安装的锁定依赖元数据、运行/开发分类、许可文件及缺失通知。
- `.verification/THIRD-PARTY-LICENSES.txt`：生产依赖和 Electron 软件包许可/NOTICE 文本及源码通知，供打包保留。

当前环境发现 312 个已安装依赖节点，15 个生产依赖节点加 Electron 的通知段。各平台未安装的 optional 节点会不同，因此该数量不能作为跨平台固定断言。工具只收集已安装包，不联网或推断缺失版权归属。Electron 原生运行目录的 Chromium 声明须另外保留，不能仅用本脚本文本替代。

The script inventories installed lockfile nodes and collects upstream notices without networking. Platform-specific optional packages can change the count. Retain Electron's original Chromium notices alongside the application.

开发依赖的声明另含 ISC、BSD、Apache-2.0、BlueOak-1.0.0、Python-2.0、0BSD 与 WTFPL/双许可。`lightningcss` 和对应本机二进制为 MPL-2.0，仅作为当前构建工具依赖；若将来修改或单独再分发这些组件，应另行检查其文件级源码义务。不要把应用的 MIT 许可扩展到所有开发工具。

### 仍需核实的许可元数据 / Remaining upstream metadata gap

`@arnog/colors@0.7.3` 在 package.json 中声明 MIT，但本次安装包没有附许可全文或版权行；其 package.json 所列仓库地址核对时返回 404。脚本明确发出警告并在 `missingRuntimeNotices` 记录它，生成文本保留“仅有包声明”的说明，未编造权利人。公开分发前应从上游核实并补足通知。本次未发布新 Release。

`@arnog/colors@0.7.3` declares MIT but ships no license/copyright text in the installed package, and its declared repository was unavailable during review. This is recorded rather than assigned invented attribution. Resolve the upstream notice before a new public distribution.

## npm 审计 / npm audit

本次 `npm ci` 的原始 audit 报告保存在本机 `.verification/dependency-audit.json`。报告统计 **9 个受影响包：1 low、8 moderate、0 high、0 critical**，涉及两个根源 advisory；9 不表示九个独立漏洞。

| 报告 / Advisory | 分类 / Scope | 实际含义 / Assessment |
| --- | --- | --- |
| [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) — KaTeX trust 检查可被已有原型污染绕过 | low；应用渲染依赖 | 依赖被报告受影响。本项目使用受限公式渲染，不能据此认定该 advisory 已在应用复现，也不能宣称无风险；需验证兼容升级 |
| [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) — sprintf-js 无上限精度参数可导致拒绝服务 | moderate；electron-builder 开发/打包依赖链 | 8 个包为同一链的传播：sprintf-js → roarr → global-agent → @electron/get → app-builder-lib / 相关 builder 包 → electron-builder；不是八个独立利用点 |

未执行 `npm audit fix --force`。当前建议修复涉及主版本/构建工具变动，必须在单独的兼容升级中验证数学显示、锁文件、Electron UI 和 Windows 打包。开发依赖不直接进入渲染器 bundle，仍影响安装及构建过程；不能以离线运行忽略依赖问题。CI 生成独立 audit 报告，审计步骤作为报告，不伪装成“零漏洞”门槛。

The audit is reported rather than force-fixed. The low finding affects KaTeX; the moderate entries propagate from a packaging-tool dependency chain. Neither an audit finding alone nor offline operation establishes exploitability or immunity. Validate compatible upgrades separately.

## 商标与素材 / Trademarks and assets

厂商型号名称用于功能研究和识别。项目未包含计算器固件、厂商 Logo、官方机身照片或说明书图片；原创 CSS 机身、图标及项目截图不表示原厂认证。用户提交的新素材也应有明确授权，不得把网页可下载理解为可以随开源包分发。

Casio、ClassWiz 及其型号名称属于其相应权利人；Texas Instruments、TI、MathPrint 及 TI-36X Pro 名称属于其相应权利人。本项目独立开发，与上述厂商无隶属、授权认证或背书关系。研究资料链接仅用于说明参考依据。
