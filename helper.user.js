// ==UserScript==
// @name         Refined Elective
// @namespace    https://greasyfork.org/users/1429968
// @version      1.3.0
// @description  选课网体验增强（按百分比排序容量，进度条溢出显示）
// @author       ha0xin & Gemini
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
  const CONFIG_TABLE_SORTER_ENABLED = "tableSorterEnabled";
  const CONFIG_PROGRESS_OVERFLOW_ENABLED = "progressOverflowEnabled";

  // =========================================================================
  // 功能一：课程冲突高亮
  // =========================================================================
  const conflictHighlighter = {
    // ... (This object's code is unchanged) ...
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
        if (
          timeSegments.length > 0 &&
          statusCell &&
          (statusCell.textContent.trim() === "已选上" || statusCell.textContent.trim() === "待抽签")
        ) {
          selectedCourses.push({
            element: row,
            name: cells[0].textContent.trim(),
            timeSegments: timeSegments,
          });
        }
      });
      return selectedCourses;
    },
    highlightConflicts(allCourses, conflictElements, courseNameColumnIndex) {
      allCourses.forEach((course) => {
        const courseElement = course.element.querySelector(`td:nth-child(${courseNameColumnIndex + 1})`);
        if (!courseElement) return;
        if (conflictElements.has(course.element)) {
          courseElement.style.backgroundColor = "#ffcccc";
          const conflictingCourses = conflictElements.get(course.element).join(", ");
          courseElement.title = `与以下已选课程冲突: ${conflictingCourses}`;
        } else {
          courseElement.style.backgroundColor = "#ccffcc";
          courseElement.title = "无时间冲突";
        }
      });
    },
    run() {
      const href = window.location.href;
      const isResultPage = href.includes("showResults.do");
      const isQueryPage =
        href.includes("courseQuery/") ||
        href.includes("getCurriculmByForm.do") ||
        href.includes("engGridFilter.do") ||
        href.includes("addToPlan.do");
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
      let courseNameColumnIndex,
        courseTimeColumnIndex,
        parent = document;
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
          return;
        }
      } else {
        return;
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
    // ... (This object's code is unchanged) ...
    COLORS: {
      LOW: "hsl(120, 70%, 80%)",
      MEDIUM: "hsl(55, 85%, 75%)",
      HIGH: "hsl(30, 90%, 80%)",
      FULL: "hsl(0, 100%, 90%)",
      OVERFLOW: "hsl(15, 100%, 85%)",
      EMPTY_BG: "hsl(0, 0%, 95%)",
      ZERO_LIMIT: "hsl(0, 0%, 88%)",
    },
    COLUMN_WIDTH: "120px",
    run() {
      console.log("课程容量进度条: 正在渲染...");
      const overflowEnabled = GM_getValue(CONFIG_PROGRESS_OVERFLOW_ENABLED, false);
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
          cell.style.position = "relative";

          // 为溢出功能重置相关样式
          if (overflowEnabled) {
            cell.style.overflow = "visible";
            cell.style.zIndex = "1";
            cell.style.position = "relative"; // 确保定位上下文正确
          } else {
            cell.style.overflow = "hidden";
            cell.style.zIndex = "auto";
          }

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

          const actualPercentage = (selected / limit) * 100;
          const displayPercentage = overflowEnabled ? actualPercentage : Math.min(actualPercentage, 100);
          cell.title = `已选: ${selected}, 限额: ${limit}, 占用率: ${actualPercentage.toFixed(1)}%`;

          let barColor;
          if (selected >= limit) {
            barColor = actualPercentage > 100 ? this.COLORS.OVERFLOW : this.COLORS.FULL;
          } else if (actualPercentage < 70) {
            barColor = this.COLORS.LOW;
          } else if (actualPercentage < 90) {
            barColor = this.COLORS.MEDIUM;
          } else {
            barColor = this.COLORS.HIGH;
          }

          if (overflowEnabled && actualPercentage > 100) {
            // 创建溢出的进度条效果
            const backgroundDiv = document.createElement("div");
            backgroundDiv.style.position = "absolute";
            backgroundDiv.style.top = "0";
            backgroundDiv.style.left = "0";
            backgroundDiv.style.width = `${displayPercentage}%`;
            backgroundDiv.style.height = "100%";
            backgroundDiv.style.backgroundColor = barColor;
            backgroundDiv.style.opacity = "0.6"; // 添加半透明效果
            backgroundDiv.style.zIndex = "-1"; // 确保在文字后面
            backgroundDiv.style.pointerEvents = "none";

            // 清除之前的背景div（如果存在）
            const existingDiv = cell.querySelector(".overflow-progress-bar");
            if (existingDiv) {
              existingDiv.remove();
            }

            backgroundDiv.className = "overflow-progress-bar";
            cell.appendChild(backgroundDiv);
            cell.style.background = this.COLORS.EMPTY_BG;
            cell.style.position = "relative"; // 确保文字内容显示在前面
            cell.style.zIndex = "1"; // 确保单元格内容在前面
          } else {
            // 移除可能存在的溢出div
            const existingDiv = cell.querySelector(".overflow-progress-bar");
            if (existingDiv) {
              existingDiv.remove();
            }

            // 使用原来的渐变背景方式
            cell.style.background = `linear-gradient(to right, ${barColor} ${displayPercentage}%, ${this.COLORS.EMPTY_BG} ${displayPercentage}%)`;
          }
        });
      });
    },
  };

  // =========================================================================
  // 功能三：为课程列表添加排序功能
  // =========================================================================
  const tableSorter = {
    run() {
      console.log("表格排序: 正在初始化...");
      document.querySelectorAll("table.datagrid").forEach((table) => {
        const headerRow = table.querySelector("tr.datagrid-header");
        if (!headerRow) return;

        headerRow.querySelectorAll("th").forEach((header, index) => {
          if (header.querySelector("form, input, button")) return;

          header.style.cursor = "pointer";
          header.title = "点击排序";
          header.addEventListener("click", () => this.sort(table, index));
        });
      });
    },

    // --- MODIFIED SECTION START ---
    sort(table, colIndex) {
      const tbody = table.querySelector("tbody");
      const tablerows = Array.from(tbody.querySelectorAll("tr:is(.datagrid-odd, .datagrid-even)"));
      console.log(tablerows);
      const headerItem = table.querySelector(`tr.datagrid-header th:nth-child(${colIndex + 1})`);
      const headerText = headerItem.textContent.trim();

      // 确定排序方向
      const currentDir = headerItem.dataset.sortDir || "desc";
      const newDir = currentDir === "desc" ? "asc" : "desc";
      headerItem.dataset.sortDir = newDir;

      // 更新表头视觉提示
      table
        .querySelectorAll("tr.datagrid-header th")
        .forEach((th) => (th.innerHTML = th.innerHTML.replace(/ [▲▼]$/, "")));
      headerItem.innerHTML += newDir === "asc" ? " ▲" : " ▼";

      // 检查是否为“限数/已选”列，如果是，则按百分比排序
      const isCapacityColumn = headerText.startsWith("限数/已选");

      tablerows.sort((a, b) => {
        const cellA = a.cells[colIndex];
        const cellB = b.cells[colIndex];
        let valA, valB;

        if (isCapacityColumn) {
          // 自定义函数，从 "100 / 85" 这样的文本中计算百分比
          const getPercentage = (cell) => {
            if (!cell) return 0;
            const text = cell.textContent.trim();
            if (!text.includes("/")) return -1; // 将格式不符的排在最前面
            const [limitStr, selectedStr] = text.split("/");
            const limit = parseInt(limitStr.trim(), 10);
            const selected = parseInt(selectedStr.trim(), 10);

            // 如果限额为0或数据无效，则认为占用率为0，避免除零错误
            if (isNaN(limit) || isNaN(selected) || limit === 0) {
              return 0;
            }
            return (selected / limit) * 100;
          };
          valA = getPercentage(cellA);
          valB = getPercentage(cellB);
        } else {
          // 其他列的原始排序逻辑
          valA = cellA.textContent.trim();
          valB = cellB.textContent.trim();
          const isNumeric = !isNaN(parseFloat(valA)) && isFinite(valA) && !isNaN(parseFloat(valB)) && isFinite(valB);

          if (isNumeric) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
          }
        }

        // 比较值
        if (valA < valB) return newDir === "asc" ? -1 : 1;
        if (valA > valB) return newDir === "asc" ? 1 : -1;
        return 0;
      });

      // 重新插入排好序的行并更新样式
      tablerows.forEach((row, i) => {
        tbody.appendChild(row);
        row.className = i % 2 === 0 ? "datagrid-odd" : "datagrid-even";
      });
    },
    // --- MODIFIED SECTION END ---
  };

  // =========================================================================
  // 脚本菜单注册与主执行逻辑
  // =========================================================================
  function setupMenu() {
    // ... (This function's code is unchanged) ...
    let highlightEnabled = GM_getValue(CONFIG_HIGHLIGHT_ENABLED, true);
    let progressBarEnabled = GM_getValue(CONFIG_PROGRESS_BAR_ENABLED, true);
    let tableSorterEnabled = GM_getValue(CONFIG_TABLE_SORTER_ENABLED, true);
    let progressOverflowEnabled = GM_getValue(CONFIG_PROGRESS_OVERFLOW_ENABLED, false);

    GM_registerMenuCommand(`${highlightEnabled ? "✅ 禁用" : "❌ 启用"} 课程冲突高亮`, () => {
      const newState = !highlightEnabled;
      GM_setValue(CONFIG_HIGHLIGHT_ENABLED, newState);
      alert(`课程冲突高亮功能已${newState ? "启用" : "禁用"}。\n请刷新页面以应用更改。`);
      location.reload();
    });
    GM_registerMenuCommand(`${progressBarEnabled ? "✅ 禁用" : "❌ 启用"} 容量进度条`, () => {
      const newState = !progressBarEnabled;
      GM_setValue(CONFIG_PROGRESS_BAR_ENABLED, newState);
      alert(`课程容量进度条功能已${newState ? "启用" : "禁用"}。\n请刷新页面以应用更改。`);
      location.reload();
    });
    GM_registerMenuCommand(`${progressOverflowEnabled ? "✅ 禁用" : "❌ 启用"} 进度条溢出显示`, () => {
      const newState = !progressOverflowEnabled;
      GM_setValue(CONFIG_PROGRESS_OVERFLOW_ENABLED, newState);
      alert(
        `进度条溢出显示功能已${
          newState ? "启用" : "禁用"
        }。\n启用后，选课人数超过限额的课程进度条会向右溢出显示真实长度。\n请刷新页面以应用更改。`
      );
      location.reload();
    });
    GM_registerMenuCommand(`${tableSorterEnabled ? "✅ 禁用" : "❌ 启用"} 表格排序`, () => {
      const newState = !tableSorterEnabled;
      GM_setValue(CONFIG_TABLE_SORTER_ENABLED, newState);
      alert(`表格排序功能已${newState ? "启用" : "禁用"}。\n请刷新页面以应用更改。`);
      location.reload();
    });
  }

  function main() {
    // ... (This function's code is unchanged) ...
    if (GM_getValue(CONFIG_HIGHLIGHT_ENABLED, true)) {
      conflictHighlighter.run();
    }
    if (GM_getValue(CONFIG_PROGRESS_BAR_ENABLED, true)) {
      progressBar.run();
    }
    if (GM_getValue(CONFIG_TABLE_SORTER_ENABLED, true)) {
      tableSorter.run();
    }
  }

  // --- 脚本启动 ---
  setupMenu();
  if (document.readyState === "complete" || document.readyState === "interactive") {
    main();
  } else {
    window.addEventListener("load", main);
  }
})();
