// ==UserScript==
// @name         Refined Elective
// @namespace    https://greasyfork.org/users/1429968
// @version      1.0.0
// @description  选课网体验增强
// @author       ha0xin
// @match        https://elective.pku.edu.cn/elective2008/edu/pku/stu/elective/controller/*
// @exclude      https://elective.pku.edu.cn/elective2008/edu/pku/stu/elective/controller/courseQuery/goNested.do*
// @license      MIT License
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  "use strict";

  // --- 配置项：用于存储功能开关状态的键名 ---
  const CONFIG_HIGHLIGHT_ENABLED = "conflictHighlightEnabled";
  const CONFIG_PROGRESS_BAR_ENABLED = "progressBarEnabled";

  // =========================================================================
  // 功能一：课程冲突高亮
  // =========================================================================
  const conflictHighlighter = {
    // --- 工具函数 ---
    parseTimeSegment(text) {
      const weekTypeMatch = text.match(/(每周|单周|双周)/);
      const weekType = weekTypeMatch ? weekTypeMatch[1] : "每周";
      const dayMatch = text.match(/周([一二三四五六日])/);
      const dayMap = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7 };
      const day = dayMap[dayMatch?.[1]] || null;
      const sectionMatch = text.match(/(\d+)~(\d+)节/);
      const sections = [];
      if (sectionMatch) {
        const start = parseInt(sectionMatch[1], 10);
        const end = parseInt(sectionMatch[2], 10);
        for (let i = start; i <= end; i++) sections.push(i);
      }
      return { weekType, day, sections };
    },

    parseCourseTime(cell) {
      const timeSegments = [];
      if (!cell) return timeSegments;
      const html = cell.innerHTML.replace(/<br\s*\/?>/g, "|");
      const texts = html.split("|").filter((t) => t.trim());
      texts.forEach((text) => {
        const cleanText = text.replace(/周数信息.*?节/g, "");
        const segment = this.parseTimeSegment(cleanText);
        if (segment.day && segment.sections.length > 0) {
          timeSegments.push(segment);
        }
      });
      return timeSegments;
    },

    isConflict(seg1, seg2) {
      const weekConflict = seg1.weekType === "每周" || seg2.weekType === "每周" || seg1.weekType === seg2.weekType;
      return weekConflict && seg1.day === seg2.day && seg1.sections.some((s) => seg2.sections.includes(s));
    },

    checkCoursesConflict(courses, selectedCourses) {
      const conflicts = new Map();
      courses.forEach((course) => {
        selectedCourses.forEach((selectedCourse) => {
          course.timeSegments.forEach((seg1) => {
            selectedCourse.timeSegments.forEach((seg2) => {
              if (this.isConflict(seg1, seg2)) {
                if (!conflicts.has(course.element)) {
                  conflicts.set(course.element, []);
                }
                // 避免重复添加同一个冲突课程名
                if (!conflicts.get(course.element).includes(selectedCourse.name)) {
                  conflicts.get(course.element).push(selectedCourse.name);
                }
              }
            });
          });
        });
      });
      return conflicts;
    },

    // --- 数据获取与处理 ---
    extractCoursesFromPage(parent, timeColumnIndex, nameColumnIndex) {
      const rows = parent.querySelectorAll("table.datagrid tr:is(.datagrid-odd, .datagrid-even)");
      const allCourses = [];
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length > timeColumnIndex && cells.length > nameColumnIndex) {
          const timeCell = cells[timeColumnIndex];
          const timeSegments = this.parseCourseTime(timeCell);
          if (timeSegments.length > 0) {
            allCourses.push({
              element: row,
              name: cells[nameColumnIndex].textContent.trim(),
              timeSegments: timeSegments,
            });
          }
        }
      });
      return allCourses;
    },

    extractSelectedCourses() {
      const rows = document.querySelectorAll("table.datagrid tr:is(.datagrid-odd, .datagrid-even)");
      const selectedCourses = [];
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 10) return;
        const timeCell = cells[7];
        const statusCell = cells[9];
        const timeSegments = this.parseCourseTime(timeCell);
        if (timeSegments.length > 0 && statusCell && (statusCell.textContent.trim() === "已选上" || statusCell.textContent.trim() === "待抽签")) {
          selectedCourses.push({
            element: row,
            name: cells[0].textContent.trim(),
            timeSegments: timeSegments,
          });
        }
      });
      return selectedCourses;
    },

    // --- 高亮显示 ---
    highlightConflicts(allCourses, conflictElements, courseNameColumnIndex) {
      allCourses.forEach((course) => {
        const courseElement = course.element.querySelector(`td:nth-child(${courseNameColumnIndex + 1})`);
        if (!courseElement) return;
        if (conflictElements.has(course.element)) {
          courseElement.style.backgroundColor = "#ffcccc"; // 红色背景
          const conflictingCourses = conflictElements.get(course.element).join(", ");
          courseElement.title = `与以下已选课程冲突: ${conflictingCourses}`;
        } else {
          courseElement.style.backgroundColor = "#ccffcc"; // 绿色背景
          courseElement.title = "无时间冲突";
        }
      });
    },

    // --- 主逻辑 ---
    run() {
      const href = window.location.href;
      const isResultPage = href.includes("showResults.do");
      const isQueryPage = href.includes("courseQuery/") || href.includes("getCurriculmByForm.do") || href.includes("engGridFilter.do") || href.includes("addToPlan.do");
      const isPlanPage = href.includes("electivePlan/");
      const isWorkPage = href.includes("electiveWork/");
      const isSupplyCancelPage = href.includes("supplement/");

      if (isResultPage) {
        console.log("课程冲突高亮: 正在已选课程页面提取数据...");
        const selectedCourses = this.extractSelectedCourses();
        GM_setValue("selectedCourses", JSON.stringify(selectedCourses));
        console.log("课程冲突高亮: 已选课程数据已存储", selectedCourses);
        alert("已成功更新已选课程列表！现在可以去其他页面查看冲突情况。");
        return;
      }

      const selectedCourses = JSON.parse(GM_getValue("selectedCourses", "[]"));
      if (selectedCourses.length === 0) {
        console.log("课程冲突高亮: 未找到已选课程数据，请先访问“已选课程”页面以同步数据。");
        return;
      }

      let courseNameColumnIndex, courseTimeColumnIndex, parent = document;
      let pageType = "";

      if (isQueryPage) {
        pageType = "添加课程页面";
        const tableHeader = document.querySelector("table.datagrid tr[class*='datagrid-']");
        const isEngQueryPage = tableHeader && tableHeader.querySelector("th > form#engfilterForm") !== null;
        courseNameColumnIndex = 1;
        courseTimeColumnIndex = isEngQueryPage ? 10 : 9;
      } else if (isPlanPage) {
        pageType = "选课计划页面";
        courseNameColumnIndex = 1;
        courseTimeColumnIndex = 8;
      } else if (isWorkPage || isSupplyCancelPage) {
        pageType = isWorkPage ? "预选页面" : "补退选页面";
        const scopeSelector = isWorkPage ? "#scopeOneSpan" : "body";
        const container = document.querySelector(scopeSelector);
        if (!container) return;

        const allTrs = container.querySelectorAll("table > tbody > tr");
        const targetTr = Array.from(allTrs).find((tr) => tr.textContent.includes("选课计划中本学期可选列表"));

        if (targetTr && targetTr.nextElementSibling) {
          parent = targetTr.nextElementSibling;
          courseNameColumnIndex = 0;
          courseTimeColumnIndex = 8;
        } else {
            return; // 找不到目标表格，直接退出
        }
      } else {
        return; // 不是需要处理的页面
      }

      console.log(`课程冲突高亮: 正在分析 ${pageType}`);
      const allCourses = this.extractCoursesFromPage(parent, courseTimeColumnIndex, courseNameColumnIndex);
      const conflictElements = this.checkCoursesConflict(allCourses, selectedCourses);
      this.highlightConflicts(allCourses, conflictElements, courseNameColumnIndex);
    },
  };

  // =========================================================================
  // 功能二：课程空余及满员高亮显示（进度条版）
  // =========================================================================
  const progressBar = {
    // --- 可配置项 ---
    COLORS: {
      LOW: 'hsl(120, 70%, 80%)',      // 绿色 (占用率 < 70%)
      MEDIUM: 'hsl(55, 85%, 75%)',   // 黄色 (70% <= 占用率 < 90%)
      HIGH: 'hsl(30, 90%, 80%)',       // 橙色 (90% <= 占用率 < 100%)
      FULL: 'hsl(0, 100%, 90%)',       // 红色 (占用率 >= 100%)
      EMPTY_BG: 'hsl(0, 0%, 95%)',   // 进度条背景色
      ZERO_LIMIT: 'hsl(0, 0%, 88%)', // 限额为0时的背景色
    },
    COLUMN_WIDTH: '120px',

    run() {
      console.log("课程容量进度条: 正在渲染...");
      const tables = document.querySelectorAll("table.datagrid");
      tables.forEach((table) => {
        const headers = table.querySelectorAll("tr.datagrid-header th");
        if (headers.length === 0) return;

        const limitColumnIndex = Array.from(headers).findIndex((header) => header.textContent.trim() === "限数/已选");
        if (limitColumnIndex === -1) return;

        const limitHeader = headers[limitColumnIndex];
        if (limitHeader) {
          limitHeader.style.width = this.COLUMN_WIDTH;
        }

        const rows = table.querySelectorAll("tbody tr[class*='datagrid-']");
        rows.forEach((row) => {
          const cell = row.cells[limitColumnIndex];
          if (!cell) return;

          cell.style.textAlign = "center";
          cell.style.fontWeight = "500";
          cell.style.position = "relative"; // 为伪元素定位

          const text = cell.textContent.trim();
          if (!text.includes("/")) return;

          const [limitStr, selectedStr] = text.split("/");
          const limit = parseInt(limitStr.trim(), 10);
          const selected = parseInt(selectedStr.trim(), 10);

          if (isNaN(limit) || isNaN(selected)) return;

          if (limit === 0) {
            cell.style.backgroundColor = this.COLORS.ZERO_LIMIT;
            cell.title = "无名额限制";
            return;
          }

          const percentage = Math.min((selected / limit) * 100, 100);
          cell.title = `已选: ${selected}, 限额: ${limit}, 占用率: ${((selected / limit) * 100).toFixed(1)}%`;

          let barColor;
          if (selected >= limit) {
             barColor = this.COLORS.FULL;
          } else if (percentage < 70) {
            barColor = this.COLORS.LOW;
          } else if (percentage < 90) {
            barColor = this.COLORS.MEDIUM;
          } else {
            barColor = this.COLORS.HIGH;
          }
           cell.style.background = `linear-gradient(to right, ${barColor} ${percentage}%, ${this.COLORS.EMPTY_BG} ${percentage}%)`;
        });
      });
    },
  };

  // =========================================================================
  // 脚本菜单注册与主执行逻辑
  // =========================================================================
  function setupMenu() {
    // 读取当前配置，默认为true（启用）
    let highlightEnabled = GM_getValue(CONFIG_HIGHLIGHT_ENABLED, true);
    let progressBarEnabled = GM_getValue(CONFIG_PROGRESS_BAR_ENABLED, true);

    const updateMenuState = () => {
        // 这个函数可以用来在未来动态更新菜单文本，但GM_registerMenuCommand不支持动态更新，
        // 所以我们通过重新注册（在页面刷新后）来实现状态更新。
    };

    // 注册冲突高亮功能的开关
    GM_registerMenuCommand(
      `${highlightEnabled ? "✅ 禁用" : "❌ 启用"} 课程冲突高亮`,
      () => {
        const newState = !highlightEnabled;
        GM_setValue(CONFIG_HIGHLIGHT_ENABLED, newState);
        alert(`课程冲突高亮功能已${newState ? "启用" : "禁用"}。\n请刷新页面以应用更改。`);
        location.reload();
      }
    );

    // 注册进度条功能的开关
    GM_registerMenuCommand(
      `${progressBarEnabled ? "✅ 禁用" : "❌ 启用"} 容量进度条`,
      () => {
        const newState = !progressBarEnabled;
        GM_setValue(CONFIG_PROGRESS_BAR_ENABLED, newState);
        alert(`课程容量进度条功能已${newState ? "启用" : "禁用"}。\n请刷新页面以应用更改。`);
        location.reload();
      }
    );
  }

  function main() {
    // 检查并执行各项功能
    if (GM_getValue(CONFIG_HIGHLIGHT_ENABLED, true)) {
      conflictHighlighter.run();
    }
    if (GM_getValue(CONFIG_PROGRESS_BAR_ENABLED, true)) {
      progressBar.run();
    }
  }

  // --- 脚本启动 ---
  setupMenu(); // 注册菜单

  // 等待页面加载完成后执行主函数
  if (document.readyState === "complete" || document.readyState === "interactive") {
    main();
  } else {
    window.addEventListener("load", main);
  }
})();
