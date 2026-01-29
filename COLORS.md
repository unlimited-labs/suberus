# Color Guidelines

## NIGDY nie używaj hardcoded kolorów w Tailwind

### ❌ BŁĄD - Hardcoded kolory
```tsx
// Te klasy powodują problemy w light/dark theme:
className="text-white"      // ❌
className="bg-black"        // ❌
className="text-gray-500"   // ❌
className="border-slate-200" // ❌
```

### ✅ POPRAWNIE - Theme colors
```tsx
// Użyj zmiennych theme z tailwind.config:
className="text-foreground"           // Główny kolor tekstu
className="text-muted-foreground"     // Przyciemniony tekst
className="text-primary"              // Kolor primary (brand)
className="text-primary-foreground"   // Tekst na primary bg
className="text-destructive"          // Kolor błędu

className="bg-background"             // Główne tło
className="bg-card"                   // Tło kart
className="bg-muted"                  // Przyciemnione tło
className="bg-primary"                // Tło primary
className="bg-destructive"            // Tło błędu

className="border-border"             // Kolor bordera
```

## Dostępne theme colors

### Text colors
- `text-foreground` - główny kolor tekstu
- `text-muted-foreground` - przyciemniony tekst (pomocniczy)
- `text-primary` - kolor primary (brand)
- `text-primary-foreground` - tekst na primary background
- `text-secondary` - kolor secondary
- `text-secondary-foreground` - tekst na secondary background
- `text-destructive` - kolor błędu/usuwania
- `text-destructive-foreground` - tekst na destructive background
- `text-accent` - kolor accent
- `text-accent-foreground` - tekst na accent background

### Background colors
- `bg-background` - główne tło aplikacji
- `bg-card` - tło kart
- `bg-popover` - tło popoverów
- `bg-muted` - przyciemnione tło
- `bg-primary` - tło primary
- `bg-secondary` - tło secondary
- `bg-destructive` - tło błędu
- `bg-accent` - tło accent

### Border colors
- `border-border` - główny kolor bordera
- `border-input` - border inputów

### Ring colors
- `ring-ring` - kolor focus ring

## Wyjątki

Jedyne miejsca gdzie można użyć hardcoded kolorów:
1. **Ikony Tabler** - mają własny kolor
2. **Status badges** - jeśli używasz custom kolorów (np. `bg-green-500` dla sukcesu)
3. **Gradienty** - jeśli nie można użyć theme colors

Ale nawet w tych przypadkach **zawsze preferuj theme colors**.

## Przykład: Timeline indicator

### ❌ ŹLE
```tsx
<div className="bg-blue-500 text-white">
  <Icon />
</div>
```

### ✅ DOBRZE
```tsx
<div className="bg-primary text-primary-foreground">
  <Icon />
</div>
```

## Sprawdzanie

Przed commit zawsze:
```bash
# Sprawdź czy nie ma hardcoded kolorów:
grep -r "text-white\|bg-white\|text-black\|bg-black" src/

# Jeśli coś znajdziesz - napraw używając theme colors
```

## Dlaczego?

- ✅ Automatyczna obsługa light/dark theme
- ✅ Spójne kolory w całej aplikacji
- ✅ Łatwa zmiana theme
- ✅ Accessibility
