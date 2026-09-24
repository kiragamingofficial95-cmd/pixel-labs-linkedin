"use client";

interface FilterTabsProps {
  filter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  { id: "all", label: "All" },
  { id: "VALUE", label: "Value" },
  { id: "PROMO", label: "Promo" },
  { id: "draft", label: "Draft" },
  { id: "posted", label: "Posted" },
];

export function FilterTabs({ filter, onFilterChange }: FilterTabsProps) {
  return (
    <div className="flex gap-1 bg-navy-800 rounded-lg p-1 inline-flex">
      {filters.map((f) => (
        <button
          key={f.id}
          onClick={() => onFilterChange(f.id)}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            filter === f.id
              ? "bg-lime-400 text-navy-900"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
