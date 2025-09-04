<div align="center">

# Refined Elective

[![GitHub license](https://img.shields.io/github/license/ha0xin/ElectiveHelper)](https://github.com/ha0xin/ElectiveHelper)
[![Greasy Fork](https://img.shields.io/badge/install-Greasy_Fork-green)](https://greasyfork.org/zh-CN/scripts/525548)

北京大学选课系统增强脚本

全方位优化选课体验，选课效率++！

![示例截图](https://github.com/user-attachments/assets/12f1d786-d503-4358-99a6-1dc089e5be12)

</div>

## ✨ 功能特性

### 🌈 课程冲突高亮
- 自动检测并高亮显示课程时间冲突
- 跨页面数据同步（已选课程自动记忆）
- 智能时间解析支持
  - ✅ 单双周处理
  - ✅ 连续课时识别
  - ✅ 多时间段课程
- 鼠标悬停显示具体冲突课程详情

### 📊 课程容量进度条
- 可视化显示课程选课进度
- 颜色编码显示选课状态
  - 🟢 绿色：低占用率 (<70%)
  - 🟡 黄色：中等占用率 (70-85%)
  - 🟠 橙色：高占用率 (85-100%)
  - 🔴 红色：已满员或超额
- 支持进度条溢出显示（显示真实超额情况）

### 📋 表格排序功能
- 点击表头对课程列表进行排序
- 支持多种排序方式（姓名、时间、容量等）

### 🔄 批量加载功能
- 一键查看完整课程列表，减少翻页操作，提高浏览效率

### 🎯 支持页面范围
- ✅ 已选课程列表页面
- ✅ 课程查询页面
- ✅ 选课计划页面
- ✅ 预选页面
- ✅ 补退选页面

## 🚀 安装使用

### 1. 安装用户脚本管理器
- [Tampermonkey (Chrome)](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Tampermonkey (Firefox)](https://addons.mozilla.org/firefox/addon/tampermonkey/)

### 2. 安装脚本
[📥 点击此处安装最新版本](https://greasyfork.org/zh-CN/scripts/525548)

### 3. 使用步骤
1. **初始化数据**：首先访问**已选课程页面**保存课程数据
2. **查看冲突**：在其他选课页面自动显示冲突状态
   - 🟩 **绿色**：无时间冲突
   - 🟥 **红色**：存在时间冲突
3. **功能配置**：TamperMonkey 菜单可开启/关闭各项功能

## ⚙️ 功能配置

脚本提供菜单选项，可单独控制各项功能：
- ✅/❌ 课程冲突高亮
- ✅/❌ 容量进度条
- ✅/❌ 进度条溢出显示
- ✅/❌ 表格排序

<p align="center">
  <img src="https://github.com/user-attachments/assets/eaa85967-52ab-4afe-9fc8-86fe2628e2c4" alt="TamperMonkey 菜单" width="50%" height="auto" style="display: block; margin: 0 auto;">
</p>

## 📋 使用提示

1. **首次使用**：必须先访问"已选课程"页面进行数据初始化
2. **冲突查看**：鼠标悬停在冲突课程上可查看具体冲突详情
3. **功能切换**：修改功能配置后需刷新页面生效
4. **数据更新**：选课状态变更后，重新访问"已选课程"页面更新数据
