import type { HabitEntry, HabitFilter } from "./types.js";

declare const rxjs: typeof import("rxjs");
const { BehaviorSubject, combineLatest, fromEvent, map } = rxjs;

const habitForm = document.getElementById("habit-form") as HTMLFormElement | null;
const habitInput = document.getElementById("habit-input") as HTMLInputElement | null;
const filterButtons = document.getElementById("filter-buttons") as HTMLElement | null;
const habitList = document.getElementById("habit-list") as HTMLElement | null;
const streakContainer = document.getElementById("streak-container") as HTMLElement | null;

const STORAGE_KEY = "habit_tracker_data";

function loadFromStorage(): HabitEntry[] {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(data) && data.every(isHabitEntry)) {
      return data;
    }
  } catch (e) {
    console.error("Помилка читання з localStorage", e);
  }
  return [];
}

function isHabitEntry(obj: any): obj is HabitEntry {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "string" &&
    typeof obj.dayNumber === "number" &&
    typeof obj.text === "string" &&
    typeof obj.createdAt === "number"
  );
}

const entries$ = new BehaviorSubject<HabitEntry[]>(loadFromStorage());
const filter$ = new BehaviorSubject<HabitFilter>("all");

function init(): void {
  if (!habitForm || !habitInput || !filterButtons || !habitList || !streakContainer) return;
  bindAddEntry();
  bindFilters();
  bindListActions();
  bindRendering();
  bindPersistence();
}

function bindAddEntry() {
  fromEvent(habitForm!, "submit").subscribe((event) => {
    event.preventDefault();
    const text = habitInput!.value.trim();
    
    const currentEntries = entries$.getValue();
    const nextDay = currentEntries.length > 0 
      ? Math.max(...currentEntries.map(e => e.dayNumber)) + 1 
      : 1;

    // Якщо поле пусте - ставимо хрестик. Якщо є текст - ставимо галочку і текст.
    const entryText = text ? `✅ ${text}` : `❌ Без вчинків`;

    const newEntry: HabitEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      dayNumber: nextDay,
      text: entryText,
      createdAt: Date.now()
    };

    entries$.next([...currentEntries, newEntry]);
    habitInput!.value = "";
  });
}

function bindFilters() {
  fromEvent<MouseEvent>(filterButtons!, "click")
    .pipe(
      map((event) => {
        const target = event.target as HTMLElement | null;
        const button = target?.closest<HTMLButtonElement>("button[data-filter]");
        return button?.dataset.filter as HabitFilter | undefined;
      }),
      map((value) => (value === "all" || value === "filled" ? value : null))
    )
    .subscribe((filter) => {
      if (!filter) return;
      filter$.next(filter);
      
      document.querySelectorAll("#filter-buttons button").forEach(btn => 
        btn.classList.remove("active")
      );
      document.querySelector(`button[data-filter="${filter}"]`)?.classList.add("active");
    });
}

function bindListActions() {
  fromEvent<MouseEvent>(habitList!, "click").subscribe((event) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button[data-action]");
    if (!button) return;

    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    const currentEntries = entries$.getValue();

    if (action === "delete") {
      entries$.next(currentEntries.filter(e => e.id !== id));
    } else if (action === "edit") {
      const entry = currentEntries.find(e => e.id === id);
      if (entry) {
        // Прибираємо значки для зручного редагування
        const cleanText = entry.text.replace("✅ ", "").replace("❌ Без вчинків", "");
        const newText = window.prompt("Відредагуйте ваш вчинок:", cleanText);
        
        if (newText !== null) {
          const finalTrimmedText = newText.trim();
          const finalEntryText = finalTrimmedText ? `✅ ${finalTrimmedText}` : `❌ Без вчинків`;
          
          const updated = currentEntries.map(e => 
            e.id === id ? { ...e, text: finalEntryText } : e
          );
          entries$.next(updated);
        }
      }
    }
  });
}

function bindRendering() {
  combineLatest([entries$, filter$]).subscribe(([entries, filter]) => {
    
    // Фільтрація: показуємо тільки хороші вчинки (з галочкою), якщо вибрано відповідний фільтр
    const filtered = entries.filter(e => filter === "all" ? true : e.text.startsWith("✅"));

    if (filtered.length === 0) {
      habitList!.innerHTML = `<p class="empty">Записів не знайдено.</p>`;
    } else {
      habitList!.innerHTML = filtered.map(e => `
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

    // ЛОГІКА СТРІКУ (Рахуємо безперервні успішні дні з кінця)
    let currentStreak = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].text.startsWith("✅")) {
        currentStreak++;
      } else {
        break; // Якщо зустріли хрестик - стрік обривається
      }
    }

    // Показуємо стрік тільки якщо є хоча б 3 дні підряд
    if (currentStreak >= 3) {
      streakContainer!.style.display = "flex";
      streakContainer!.innerHTML = `
        <h3>Стрік</h3>
        <div class="streak-box">${currentStreak}</div>
      `;
    } else {
      streakContainer!.style.display = "none";
    }
  });
}

function bindPersistence() {
  entries$.subscribe((entries) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  });
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

init();