# Standard projektowania testów E2E (Playwright + Prisma)

Jesteś inżynierem testów E2E. Tworzysz wyłącznie testy zgodne z poniższymi zasadami. Każde odstępstwo jest błędem.
## Cel
Celem testów E2E jest weryfikacja zachowania systemu z perspektywy użytkownika w sposób:
- deterministyczny,
- izolowany,
- niezależny od kolejności uruchamiania,
- utrzymywalny w długim horyzoncie.
Testy flaky są **niedozwolone**.


## Struktura testu (AAA)

Każdy test:

- **MUSI** stosować metodykę AAA (Arrange – Act – Assert).
- **MUSI** oznaczać sekcje komentarzami:

```ts
// Arrange
// Act
// Assert
```

- **MUSI** być możliwy do uruchomienia w izolacji.
- **NIE MOŻE** polegać na danych wytworzonych przez inne testy.
- **NIE MOŻE** zakładać kolejności wykonywania.

## Dane testowe
### Tworzenie danych

Dane w fazie Arrange:
- **MUSZĄ** być tworzone przez Prisma.
- **NIE MOGĄ** być tworzone przez UI.
- **NIE MOGĄ** być współdzielone między testami.
- **MUSZĄ** być minimalne do realizacji scenariusza.

Do generowania danych:
- **MOŻNA** używać faker.js.

Do tworzenia encji:
- **NALEŻY** używać factory functions.

### Globalne seedy

Globalne seedy:
- **SĄ DOZWOLONE WYŁĄCZNIE** dla danych wymaganych przez każdy test (np. konfiguracja aplikacji, słowniki).
- **NIE MOGĄ** zawierać danych scenariuszowych.

## Assercje

Faza Assert:
- **POWINNA** w pierwszej kolejności sprawdzać UI.
- **MOŻE** weryfikować stan bazy danych przez Prisma jako ostateczność.

Testy:
- **MUSZĄ** oczekiwać jednoznacznych, konkretnych rezultatów.
- **NIE POWINNY** polegać na luźnych dopasowaniach, jeśli wynik jest krytyczny.

## Hermetyzacja względem backendu
Testy E2E **NIE MOGĄ**:
- importować serwisów backendowych,
- wywoływać repozytoriów,
- korzystać z internal API (z wyjątkiem tworzenia użytkowników przez better auth),
- omijać warstwę HTTP.

Testy E2E **MOGĄ** korzystać wyłącznie z:
- publicznego API,
- UI aplikacji.

**WYJĄTKI**:
- Auth tests mające na celu testowanie UI rejestracji/logowania powinny przeprowadzać te testy w oparciu o UI.

## UI i selektory
Interakcja z UI:
- **MUSI** odbywać się wyłącznie przez Page Object Model.

Stabilność selektorów:
- **NALEŻY** dodawać `data-testid`, jeśli struktura DOM jest niestabilna.
- **NIE NALEŻY** używać selektorów strukturalnych (`nth-child`, zależnych od layoutu).

## Timeouty i retry
Testy:
- **NIE POWINNY** polegać na podnoszeniu timeoutów jako rozwiązaniu problemów stabilności.

Podnoszenie timeoutów:
- **WYMAGA** jawnego uzasadnienia.

Retry:
- **SĄ ZABRONIONE** dla błędów logicznych.
- **SĄ DOZWOLONE WYŁĄCZNIE** dla niestabilności infrastrukturalnych (sieć, CI, przeglądarka).

## Cleanup danych
Każdy test:
- **MUSI** generować unikalny `testRunId`.
- **MUSI** oznaczać dane prefiksem `e2e_<uuid>`.
- **MUSI** usuwać wszystkie dane powiązane z tym identyfikatorem po zakończeniu testu.

Cleanup:
- **MUSI** być wykonywany w afterEach.
- **NIE MOŻE** pozostawiać danych "na przyszłość".
- **NIE MOŻE** zakładać, że inne testy wykorzystają te dane.

Antywzorce cleanup:
- zależności między testami,
- współdzielone dane scenariuszowe,
- ręczne usuwanie "bo może się przyda",
- globalne seedy scenariuszowe.

## Determinizm i flaky tests
Testy:
- **MUSZĄ** być deterministyczne.
- **NIE MOGĄ** zależeć od losowości.

## Zasady nadrzędne
- Jeśli test przechodzi tylko czasami — jest błędny.
- Jeśli test wymaga kolejności — jest błędny.
- Jeśli test wymaga seedów scenariuszowych — jest błędny.
- Jeśli podnosisz timeout zamiast naprawić przyczynę — test jest błędny.

## Diagnostyka po failure
- Jeśli rozwiązanie problemu nie jest oczywiste - użyj `claude in chrome` by zbadać DOM wykonując testowany scenariusz 