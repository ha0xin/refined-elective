<div align="center">

# Elective Helper

[![GitHub license](https://img.shields.io/github/license/ha0xin/ElectiveHelper)](https://github.com/yourname/pku-elective-helper)
[![Greasy Fork](https://img.shields.io/badge/install-Greasy_Fork-green)](https://greasyfork.org/zh-CN/scripts/525548)

北京大学选课系统课程冲突高亮脚本，自动分析已选课程与候选课程的时间冲突。

![示例截图](https://github.com/user-attachments/assets/12f1d786-d503-4358-99a6-1dc089e5be12)

</div>

## 功能特性

- 🌈 自动高亮显示课程时间冲突
- 💾 跨页面数据同步（已选课程自动记忆）
- 🎯 支持多个选课界面：
  - [x] 已选课程列表
  - [x] 课程查询页面
  - [x] 选课计划页面
  - [x] 预选页面
- 📌 智能时间解析支持：
  - [x] 单双周处理
  - [x] 连续课时识别
  - [x] 多时间段课程

## 安装使用

1. 安装Tampermonkey浏览器扩展
   - [Chrome版](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox版](https://addons.mozilla.org/firefox/addon/tampermonkey/)

2. 安装脚本：
   [点击此处安装最新版本](https://greasyfork.org/zh-CN/scripts/525548)

3. 使用流程：
   1. 首先访问**已选课程页面**保存课程数据
   2. 在其他选课页面会自动显示冲突提示
      - 🟩 绿色：无冲突课程
      - 🟥 红色：存在时间冲突

## 注意事项

1. 首次使用时必须**先访问已选课程页面**
2. 鼠标悬停可查看具体冲突课程
