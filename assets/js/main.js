const { BehaviorSubject, combineLatest, fromEvent, map } = rxjs;
const habitForm = document.getElementById("habit-form");
const habitInput = document.getElementById("habit-input");
const filterButtons = document.getElementById("filter-buttons");
const habitList = document.getElementById("habit-list");
const streakContainer = document.getElementById("streak-container");
const STORAGE_KEY = "habit_tracker_data";
function loadFromStorage() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (Array.isArray(data) && data.every(isHabitEntry)) {
            return data;
        }
    }
    catch (e) {
        console.error("Помилка читання з localStorage", e);
    }
    return [];
}
function isHabitEntry(obj) {
    return (typeof obj === "object" &&
        obj !== null &&
        typeof obj.id === "string" &&
        typeof obj.dayNumber === "number" &&
        typeof obj.text === "string" &&
        typeof obj.createdAt === "number");
}
const entries$ = new BehaviorSubject(loadFromStorage());
const filter$ = new BehaviorSubject("all");
function init() {
    if (!habitForm || !habitInput || !filterButtons || !habitList || !streakContainer)
        return;
    bindAddEntry();
    bindFilters();
    bindListActions();
    bindRendering();
    bindPersistence();
}
function bindAddEntry() {
    fromEvent(habitForm, "submit").subscribe((event) => {
        event.preventDefault();
        const text = habitInput.value.trim();
        const currentEntries = entries$.getValue();
        const nextDay = currentEntries.length > 0
            ? Math.max(...currentEntries.map(e => e.dayNumber)) + 1
            : 1;
        const entryText = text ? `✅ ${text}` : `❌ Без вчинків`;
        const newEntry = {
            id: Date.now().toString() + Math.random().toString(36).substring(2),
            dayNumber: nextDay,
            text: entryText,
            createdAt: Date.now()
        };
        entries$.next([...currentEntries, newEntry]);
        habitInput.value = "";
    });
}
function bindFilters() {
    fromEvent(filterButtons, "click")
        .pipe(map((event) => {
        const target = event.target;
        const button = target === null || target === void 0 ? void 0 : target.closest("button[data-filter]");
        return button === null || button === void 0 ? void 0 : button.dataset.filter;
    }), map((value) => (value === "all" || value === "filled" ? value : null)))
        .subscribe((filter) => {
        var _a;
        if (!filter)
            return;
        filter$.next(filter);
        document.querySelectorAll("#filter-buttons button").forEach(btn => btn.classList.remove("active"));
        (_a = document.querySelector(`button[data-filter="${filter}"]`)) === null || _a === void 0 ? void 0 : _a.classList.add("active");
    });
}
function bindListActions() {
    fromEvent(habitList, "click").subscribe((event) => {
        const target = event.target;
        const button = target.closest("button[data-action]");
        if (!button)
            return;
        const action = button.getAttribute("data-action");
        const id = button.getAttribute("data-id");
        const currentEntries = entries$.getValue();
        if (action === "delete") {
            entries$.next(currentEntries.filter(e => e.id !== id));
        }
        else if (action === "edit") {
            const entry = currentEntries.find(e => e.id === id);
            if (entry) {
                const cleanText = entry.text.replace("✅ ", "").replace("❌ Без вчинків", "");
                const newText = window.prompt("Відредагуйте ваш вчинок:", cleanText);
                if (newText !== null) {
                    const finalTrimmedText = newText.trim();
                    const finalEntryText = finalTrimmedText ? `✅ ${finalTrimmedText}` : `❌ Без вчинків`;
                    const updated = currentEntries.map(e => e.id === id ? Object.assign(Object.assign({}, e), { text: finalEntryText }) : e);
                    entries$.next(updated);
                }
            }
        }
    });
}
function bindRendering() {
    combineLatest([entries$, filter$]).subscribe(([entries, filter]) => {
        const filtered = entries.filter(e => filter === "all" ? true : e.text.startsWith("✅"));
        if (filtered.length === 0) {
            habitList.innerHTML = `<p class="empty">Записів не знайдено.</p>`;
        }
        else {
            habitList.innerHTML = filtered.map(e => `
        <div class="habit-card">
          <div class="habit-day">День ${e.dayNumber}</div>
          <div class="habit-text">${escapeHtml(e.text)}</div>
          <div class="actions">
            <button class="btn-edit" data-action="edit" data-id="${e.id}">Редагувати</button>
            <button class="btn-delete" data-action="delete" data-id="${e.id}">Видалити</button>
          </div>
        </div>
      `).join("");
        }
        let currentStreak = 0;
        for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i].text.startsWith("✅")) {
                currentStreak++;
            }
            else {
                break;
            }
        }
        if (currentStreak >= 3) {
            streakContainer.style.display = "flex";
            streakContainer.innerHTML = `
        <h3>Стрік</h3>
        <div class="streak-box">${currentStreak}</div>
      `;
        }
        else {
            streakContainer.style.display = "none";
        }
    });
}
function bindPersistence() {
    entries$.subscribe((entries) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    });
}
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
init();
export {};
