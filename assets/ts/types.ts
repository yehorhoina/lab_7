// Фільтр: всі дні або тільки ті, де є записи
export type HabitFilter = "all" | "filled";

export interface HabitEntry {
  id: string;
  dayNumber: number; // Номер дня (1, 2, 3...)
  text: string;      // Текст прогресу
  createdAt: number;
}