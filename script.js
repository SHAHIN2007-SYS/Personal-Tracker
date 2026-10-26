
const $ = (id) => document.getElementById(id);

const form = $("transaction-form");
const typeInput = $("type");
const descriptionInput = $("description");
const amountInput = $("amount");
const categoryInput = $("category");
const dateInput = $("date");
const filterInput = $("filter");
const monthPicker = $("month-picker");
const goalsForm = $("goals-form");
const budgetInput = $("budget-input");
const goalInput = $("goal-input");
const themeToggle = $("theme-toggle");

const chartCanvas = $("expense-chart");
const chartContext = chartCanvas.getContext("2d");

// ---------- Date and currency helpers ----------

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonth() {
  return getToday().slice(0, 7);
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function getSelectedMonth() {
  return monthPicker.value || getCurrentMonth();
}

// ---------- localStorage ----------

function loadArray(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

let transactions = loadArray("moneyTracker").filter((item) =>
  item &&
  typeof item.id === "string" &&
  typeof item.description === "string" &&
  typeof item.amount === "number" &&
  Number.isFinite(item.amount) &&
  item.amount > 0 &&
  (item.type === "income" || item.type === "expense") &&
  typeof item.category === "string" &&
  typeof item.date === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(item.date)
);

function saveTransactions() {
  try {
    localStorage.setItem("moneyTracker", JSON.stringify(transactions));
    return true;
  } catch {
    alert("Unable to save data. Check your browser storage.");
    return false;
  }
}

// Store a separate budget and goal for each month.
function loadGoals() {
  try {
    const data = JSON.parse(
      localStorage.getItem("moneyTrackerGoals") || "{}"
    );

    return data && typeof data === "object" && !Array.isArray(data)
      ? data
      : {};
  } catch {
    return {};
  }
}

let monthlyGoals = loadGoals();

function saveGoals() {
  try {
    localStorage.setItem(
      "moneyTrackerGoals",
      JSON.stringify(monthlyGoals)
    );
    return true;
  } catch {
    alert("Unable to save goals. Check your browser storage.");
    return false;
  }
}

// ---------- Dark mode ----------

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");

  themeToggle.textContent =
    theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";

  try {
    localStorage.setItem("moneyTrackerTheme", theme);
  } catch {
    // The theme still works for the current page.
  }

  drawExpenseChart();
}

let currentTheme = "light";

try {
  currentTheme =
    localStorage.getItem("moneyTrackerTheme") === "dark"
      ? "dark"
      : "light";
} catch {
  currentTheme = "light";
}

document.body.classList.toggle("dark", currentTheme === "dark");
themeToggle.textContent =
  currentTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";

themeToggle.addEventListener("click", () => {
  currentTheme = currentTheme === "light" ? "dark" : "light";
  applyTheme(currentTheme);
});

// ---------- All-time summary ----------

function updateSummary() {
  const totalIncome = transactions.reduce(
    (sum, item) =>
      item.type === "income" ? sum + item.amount : sum,
    0
  );

  const totalExpense = transactions.reduce(
    (sum, item) =>
      item.type === "expense" ? sum + item.amount : sum,
    0
  );

  $("balance").textContent = formatMoney(totalIncome - totalExpense);
  $("income").textContent = formatMoney(totalIncome);
  $("expense").textContent = formatMoney(totalExpense);
}

// ---------- Monthly dashboard ----------

function getMonthlyTransactions() {
  const month = getSelectedMonth();

  return transactions.filter((item) =>
    item.date.startsWith(month)
  );
}

function updateMonthlyDashboard() {
  const monthTransactions = getMonthlyTransactions();

  const income = monthTransactions.reduce(
    (sum, item) =>
      item.type === "income" ? sum + item.amount : sum,
    0
  );

  const expenses = monthTransactions.reduce(
    (sum, item) =>
      item.type === "expense" ? sum + item.amount : sum,
    0
  );

  $("monthly-income").textContent = formatMoney(income);
  $("monthly-expense").textContent = formatMoney(expenses);
  $("monthly-savings").textContent = formatMoney(income - expenses);

  updateGoals(income, expenses);
}

// ---------- Monthly budget and savings goal ----------

function updateGoals(income, expenses) {
  const month = getSelectedMonth();
  const settings = monthlyGoals[month] || {};

  const budget = Number(settings.budget) || 0;
  const savingsGoal = Number(settings.savingsGoal) || 0;
  const savings = income - expenses;

  budgetInput.value = settings.budget ?? "";
  goalInput.value = settings.savingsGoal ?? "";

  // Budget progress
  const budgetPercent = budget > 0
    ? (expenses / budget) * 100
    : 0;

  $("budget-progress").style.width =
    `${Math.min(budgetPercent, 100)}%`;

  $("budget-percent").textContent =
    budget > 0 ? `${Math.round(budgetPercent)}%` : "Not set";

  const budgetMessage = $("budget-message");
  budgetMessage.classList.remove("over-budget");

  if (budget <= 0) {
    budgetMessage.textContent =
      "Set your monthly budget to start tracking.";
  } else if (expenses > budget) {
    budgetMessage.textContent =
      `Budget exceeded by ${formatMoney(expenses - budget)}.`;
    budgetMessage.classList.add("over-budget");
  } else {
    budgetMessage.textContent =
      `${formatMoney(budget - expenses)} budget remaining.`;
  }

  // Savings goal progress
  const savingsPercent = savingsGoal > 0
    ? (Math.max(savings, 0) / savingsGoal) * 100
    : 0;

  $("savings-progress").style.width =
    `${Math.min(savingsPercent, 100)}%`;

  $("savings-percent").textContent =
    savingsGoal > 0
      ? `${Math.round(savingsPercent)}%`
      : "Not set";

  const savingsMessage = $("savings-message");
  savingsMessage.classList.remove("goal-achieved");

  if (savingsGoal <= 0) {
    savingsMessage.textContent =
      "Set your savings goal to start tracking.";
  } else if (savings >= savingsGoal) {
    savingsMessage.textContent =
      `Goal achieved! You saved ${formatMoney(savings)}.`;
    savingsMessage.classList.add("goal-achieved");
  } else {
    savingsMessage.textContent =
      `${formatMoney(savingsGoal - Math.max(savings, 0))} more to reach your goal.`;
  }
}

goalsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const budget = Number(budgetInput.value);
  const savingsGoal = Number(goalInput.value);

  if (
    budgetInput.value.trim() === "" ||
    goalInput.value.trim() === "" ||
    !Number.isFinite(budget) ||
    !Number.isFinite(savingsGoal) ||
    budget < 0 ||
    savingsGoal < 0 ||
    budget > 1000000000000 ||
    savingsGoal > 1000000000000
  ) {
    alert("Enter valid budget and savings goal amounts.");
    return;
  }

  const month = getSelectedMonth();
  const previous = monthlyGoals[month] || {};

  monthlyGoals[month] = {
    ...previous,
    budget,
    savingsGoal
  };

  if (saveGoals()) {
    updateMonthlyDashboard();
  }
});

// ---------- Expense chart ----------

const chartColors = [
  "#16a34a",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#64748b",
  "#84cc16"
];

function drawExpenseChart() {
  const rect = chartCanvas.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  const pixelRatio = window.devicePixelRatio || 1;

  chartCanvas.width = Math.round(rect.width * pixelRatio);
  chartCanvas.height = Math.round(rect.height * pixelRatio);

  chartContext.setTransform(
    pixelRatio, 0, 0, pixelRatio, 0, 0
  );

  const width = rect.width;
  const height = rect.height;
  const ctx = chartContext;

  ctx.clearRect(0, 0, width, height);

  const expenses = getMonthlyTransactions().filter(
    (item) => item.type === "expense"
  );

  const categoryTotals = {};

  expenses.forEach((item) => {
    categoryTotals[item.category] =
      (categoryTotals[item.category] || 0) + item.amount;
  });

  const entries = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);

  const legend = $("chart-legend");
  legend.replaceChildren();

  const message = $("chart-message");

  if (entries.length === 0) {
    message.textContent =
      "No expenses recorded for this month yet.";
    return;
  }

  message.textContent = "";

  const total = entries.reduce((sum, item) => sum + item[1], 0);

  let startAngle = -Math.PI / 2;

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width * 0.31, height * 0.39, 110);
  const innerRadius = radius * 0.59;

  entries.forEach(([category, amount], index) => {
    const sliceAngle = (amount / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const color = chartColors[index % chartColors.length];

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    const legendItem = document.createElement("div");
    legendItem.className = "legend-item";

    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.backgroundColor = color;

    const label = document.createElement("span");
    const percentage = ((amount / total) * 100).toFixed(1);

    label.textContent =
      `${category}: ${formatMoney(amount)} (${percentage}%)`;

    legendItem.append(dot, label);
    legend.appendChild(legendItem);

    startAngle = endAngle;
  });

  // Total expense in the middle of the donut chart.
  ctx.fillStyle = getComputedStyle(document.body)
    .getPropertyValue("--text").trim();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 12px Arial";
  ctx.fillText("TOTAL EXPENSE", centerX, centerY - 11);

  let totalLabel = formatMoney(total);
  ctx.font = "bold 14px Arial";

  // Prevent the amount from overflowing the donut.
  while (
    ctx.measureText(totalLabel).width > innerRadius * 1.8 &&
    ctx.font !== "bold 10px Arial"
  ) {
    const currentSize = Number(ctx.font.match(/\d+/)?.[0] || 14);

    if (currentSize <= 10) break;

    ctx.font = `bold ${currentSize - 1}px Arial`;
  }

  ctx.fillText(totalLabel, centerX, centerY + 12);
}

// ---------- Transaction history ----------

function displayTransactions() {
  const list = $("transaction-list");
  list.replaceChildren();

  const selectedMonth = getSelectedMonth();
  const selectedFilter = filterInput.value;

  const filtered = transactions
    .filter((item) => item.date.startsWith(selectedMonth))
    .filter((item) =>
      selectedFilter === "all" || item.type === selectedFilter
    )
    .slice()
    .sort((a, b) =>
      b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    );

  if (filtered.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent =
      "No transactions found for this month and filter.";

    list.appendChild(message);
    return;
  }

  filtered.forEach((item) => {
    const row = document.createElement("div");
    row.className = "transaction";

    const info = document.createElement("div");
    info.className = "transaction-info";

    const title = document.createElement("h3");
    title.textContent = item.description;

    const details = document.createElement("p");
    details.textContent = `${item.category} · ${item.date}`;

    info.append(title, details);

    const right = document.createElement("div");
    right.className = "transaction-right";

    const amount = document.createElement("span");
    amount.className = `transaction-amount ${item.type}`;
    amount.textContent =
      `${item.type === "income" ? "+" : "-"}${formatMoney(item.amount)}`;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
      deleteTransaction(item.id);
    });

    right.append(amount, deleteButton);
    row.append(info, right);
    list.appendChild(row);
  });
}

// ---------- Add transaction ----------

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const type = typeInput.value;
  const category = categoryInput.value;
  const date = dateInput.value;

  if (!description) {
    alert("Please enter a description.");
    return;
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1000000000000
  ) {
    alert("Enter a valid amount greater than zero.");
    return;
  }

  if (
    !date ||
    date > getToday() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    alert("Please select a valid date.");
    return;
  }

  const transaction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    description,
    amount,
    category,
    date
  };

  transactions.push(transaction);

  if (!saveTransactions()) {
    transactions.pop();
    return;
  }

  updateSummary();
  updateMonthlyDashboard();
  drawExpenseChart();
  displayTransactions();

  form.reset();
  dateInput.value = getToday();
  dateInput.max = getToday();
  typeInput.value = "income";
});

// ---------- Delete transaction ----------

function deleteTransaction(id) {
  if (!confirm("Do you want to delete this transaction?")) {
    return;
  }

  const previous = transactions;

  transactions = transactions.filter((item) => item.id !== id);

  if (!saveTransactions()) {
    transactions = previous;
    return;
  }

  updateSummary();
  updateMonthlyDashboard();
  drawExpenseChart();
  displayTransactions();
}

// ---------- Month and filter controls ----------

monthPicker.value = getCurrentMonth();
dateInput.value = getToday();
dateInput.max = getToday();

monthPicker.addEventListener("change", () => {
  if (!monthPicker.value) {
    monthPicker.value = getCurrentMonth();
  }

  updateMonthlyDashboard();
  drawExpenseChart();
  displayTransactions();
});

filterInput.addEventListener("change", displayTransactions);

// ---------- Initial render ----------

updateSummary();
updateMonthlyDashboard();
displayTransactions();

requestAnimationFrame(drawExpenseChart);

window.addEventListener("resize", drawExpenseChart);
