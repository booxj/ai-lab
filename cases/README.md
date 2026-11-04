# 题面（cases）

这里只放**题面**，不放成品。成品一律进 `results/`，路径见 `docs/CONVENTIONS.md`。

## 四类能力

| 目录 | 能力 | case-id 前缀 | 对应展厅门 |
|---|---|---|---|
| `c1/` | 网页 | `c1-` | 网页门（II / WEB） |
| `c2/` | HTML PPT | `c2-` | 幻灯片门（III / DECK） |
| `c3/` | HTML 短片 | `c3-` | 影像门（I / VIDEO） |
| `c4/` | 游戏 | `c4-` | 游戏门（IV / GAME） |

## 命名

- case-id：`<cN>-<topic-slug>-<001>`，例如 `c1-editorial-001`。
- 一个 case-id 只对应一个题面；重跑用 `results/.../v01`、`v02`，不要改 case-id。
- 新题面先进本目录，再建结果目录。

## 题面文件最低内容

每个 `TASK.md` 至少写清：目标、受众、硬约束、交付物、验收点、禁止项、示例 case-id。
