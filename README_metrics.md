# Code City — Metrics Reference

> A detailed explanation of every metric collected, how it maps to the visual cityscape,
> what healthy values look like, and what red flags to watch for.

## Table of Contents

- [The City as a Metaphor](#the-city-as-a-metaphor)
- [Building-Level Metrics](#building-level-metrics)
- [City-Level (Project) Metrics](#city-level-project-metrics)
- [Dependency Arches (Hybrid Overlay)](#dependency-arches-hybrid-overlay)
- [Building Color Legend](#building-color-legend)
- [Plateau Nesting and Package Hierarchy](#plateau-nesting-and-package-hierarchy)
- [ASCII City Example - Small Project](#ascii-city-example--small-project)
- [ASCII City Example - Medium Project (~140 types)](#ascii-city-example--medium-project-140-types)
- [Red-Flag Patterns to Watch in the Cityscape](#red-flag-patterns-to-watch-in-the-cityscape)
- [Interpreting the Metrics Together](#interpreting-the-metrics-together)
- [References](#references)

---

## The City as a Metaphor

```
                         ___
                        |   |
              ___       |   |___
             |   |  _   |       |
      ___    | C |_| |  | Abstr |
     |   |   | L |   |  |  act  |
     | I |   | A |   |  |       |
     | N |   | S |   |  |_______|
     | T |   | S |   |
     |   |   |   |   |
 ____|___|___|___|___|____________
|                                 |
|   <<  com.example.service  >>   |   <-- plateau (package)
|_________________________________|
       |                  |
       |  com.example.api  |         <-- sibling plateau
       |___________________|
              |
  +-----------+-----------+
  |                       |
  |   com.example (root)  |         <-- base plateau
  |                       |
  +-----------------------+
```

Each **plateau** is a package.  
Each **building** on a plateau is a Java/Kotlin type (class, interface, enum, record, object, data class).  
The **shape** of each building encodes three metrics simultaneously:

| Dimension | Metric        | Rationale |
|-----------|---------------|-----------|
| Height    | NOM           | More methods → taller skyscraper |
| Width     | NOA           | More fields → wider footprint |
| Depth     | LOC           | More lines → deeper block |

This mapping follows the **CodeCity** metaphor by Richard Wettel (ICSE 2009).

---

## Building-Level Metrics

These are computed per type (class, interface, enum, record, Kotlin class/object/data class).

---

### NOM — Number of Methods

```
Low NOM          Medium NOM        High NOM (smell!)
  ___              _____              _______
 |   |            |     |            |       |
 |   |            |     |            |       |
 |___|            |     |            |       |
                  |_____|            |       |
                                     |       |
                                     |_______|
```

**What it is:** The raw count of all methods declared directly in the type (excluding constructors).

**Visual mapping:** Drives building **height**. A single-story bungalow vs. a skyscraper.

**Healthy range:** 1–10 for most types. Beyond 20 is a strong signal to refactor.

**Why it matters:**  
- High NOM correlates with the *God Class* anti-pattern — the class is doing too much.
- Methods are the primary surface area for bugs and test coverage.
- In the Wettel model, NOM is the single most important complexity indicator.

**Example:**
```
// NOM = 3 -> medium-height building
public class UserService {
    public User findById(Long id) { ... }
    public User save(User user) { ... }
    public void delete(Long id) { ... }
}

// NOM = 0 -> flat slab (marker interface / pure data)
public interface Serializable {}
```

---

### NOA — Number of Attributes (Fields)

```
Narrow building    Wide building (many fields)
   +--+            +--------------------+
   |  |            |                    |
   |  |            |                    |
   +--+            +--------------------+
```

**What it is:** The count of all field declarations (instance and static) in the type.

**Visual mapping:** Drives building **width**. Wide buildings have many state variables.

**Healthy range:** 0–7. Beyond 10 suggests the class is holding too much state.

**Why it matters:**  
- Wide, tall buildings are the most dangerous: many fields + many methods = *God Class*.
- Purely functional types (stateless services) should appear as narrow pillars.
- Data classes (DTOs, records) will naturally be wide and short — that's expected.

**Example:**
```
// NOA = 5 -> medium-width building
public class OrderEntity {
    private Long id;
    private String status;
    private BigDecimal amount;
    private Instant createdAt;
    private User customer;
}
```

---

### LOC — Lines of Code

```
Shallow depth       Deep depth
+--+               +--+
|  |....           |  |.............
+--+               +--+
```

**What it is:** The number of source lines inside the type body (opening brace to closing brace).
Blank lines, import declarations, and the package declaration are excluded.

**Visual mapping:** Drives building **depth** (the Z-axis). Deeper blocks have more code.

**Healthy range:** Under 200 LOC for a single class. Beyond 500 is almost always a design smell.

**Why it matters:**  
- LOC is an imperfect but fast proxy for size and effort.
- Long files are harder to navigate, review, and test.
- A building that is simultaneously tall, wide, *and* deep is the cityscape equivalent of a mega-mall — an almost certain refactoring candidate.

---

### Cyclomatic Complexity

```
Simple path (CC = 1)      Branchy path (CC = 8)

  START                     START
    |                         |
   END                      if A
                            /    \
                           Y      N
                          /        \
                        loop      if B
                       / \        / \
                      ...  \     Y   N
                            \   /     \
                            catch    switch
                              |      / | \
                             END    1  2  3
```

**What it is:** Cyclomatic complexity (McCabe, 1976) counts the number of linearly independent
paths through a method's control-flow graph.

**Formula per method:**
```
CC = 1
   + count(if)
   + count(for) + count(forEach)
   + count(while) + count(do-while)
   + count(catch)
   + count(switch-cases - 1)
```

The per-type value shown in Code City is the **sum** over all methods and constructors.

**Healthy range:** CC ≤ 10 per method (low risk). 11–20 moderate. > 20 high risk.

**Why it matters:**  
- Each branch is a path that must be tested separately.
- CC directly correlates with the minimum number of test cases needed for full branch coverage.
- High CC → hard to read, hard to test, high defect probability.

---

### Composite Complexity Score

**What it is:** A weighted, normalized score that combines all individual metrics into a
single comparable number. It is **not** used for building dimensions — that's purely
NOM/NOA/LOC — but it drives the color intensity in the selection panel and aggregate stats.

**Formula (internal, subject to change):**
```
weighted = (NOM * 1.5)
         + (NOA * 0.8)
         + (constructors * 1.1)
         + cyclomatic
         + max(1, LOC) / 12.0

score = round((1.5 + weighted / 6.5) * 100) / 100
```

**Healthy range:** 1–4 is average. Values above 8 indicate a type worth investigating.

---

### Max Method Parameters

**What it is:** The highest parameter count found on any single method in the type.

**Healthy range:** ≤ 4. Values ≥ 5 trigger the *Long Parameter List* smell indicator.

**Why it matters:**  
- Long parameter lists are hard to call correctly, especially when types are similar.
- They often hide a missing abstraction: the parameters should be a value object or DTO.
- Can indicate that a method is doing too many separate things.

**Example (smell):**
```
// maxMethodParameters = 7 -> red flag
public Order createOrder(
    String userId, String productId, int qty,
    String couponCode, String shippingAddress,
    String billingAddress, boolean isPriority) { ... }

// Better: wrap in a CreateOrderRequest object
public Order createOrder(CreateOrderRequest req) { ... }
```

---

### Static Method Count

**What it is:** The number of `static` methods declared in the type.

**Healthy range:** 0–2 for domain objects. Utility classes may have more but should be
intentional (and final, not instantiable).

**Why it matters:**  
- Static methods cannot be overridden, making them harder to mock in tests.
- High static method counts in non-utility classes often indicate procedural code
  that was placed inside a class only for namespace reasons.
- They break polymorphism and make dependency injection harder.

**Example:**
```
// staticMethodCount = 6 -> potential utility/procedural smell
public class DateUtils {
    public static LocalDate parse(String s) { ... }
    public static boolean isWeekend(LocalDate d) { ... }
    public static LocalDate firstOfMonth(LocalDate d) { ... }
    // ... more static helpers
}
```

---

### Inner Type Count

**What it is:** The number of nested type declarations (classes, interfaces, enums) declared
*inside* the outer type.

**Healthy range:** 0–1. More than 2 is a code smell.

**Why it matters:**  
- Inner types add cognitive load — the reader must keep two type scopes in mind simultaneously.
- Non-static inner classes hold a hidden reference to the outer instance, causing subtle
  memory and serialization bugs.
- They often signal that the outer class is doing too many things and should be split.

**Example:**
```
// innerTypeCount = 3 -> candidate for extraction
public class CacheManager {
    private class CacheEntry { ... }   // inner 1
    private enum EvictionPolicy { ... } // inner 2
    static class Stats { ... }          // inner 3
}
```

---

### Comment Line Count

**What it is:** The number of source lines occupied by comments (single-line `//`,
block `/* */`, and Javadoc `/** */` blocks).

**Healthy range:** Aim for ~10–20% of LOC as comments. Very low values may mean
the code is undocumented; very high values sometimes indicate the code needs comments
because it is too complex to be self-explanatory.

**Why it matters:**  
- Acts as a documentation coverage proxy.
- Very low comment density on a complex, public-API type is a red flag for maintainability.
- Zero comments on a public interface is almost always wrong.

**Example:**
```
// commentLineCount = 0, LOC = 120 -> undocumented complex type
public class PaymentProcessor {
    public Result process(Payment p) {
        // ... 120 lines of uncommented business logic
    }
}
```

---

## City-Level (Project) Metrics

These aggregate the building metrics into a bird's-eye view of the whole project.

| Metric              | Description |
|---------------------|-------------|
| **Total packages**  | Number of unique package plateaus on the map. High counts may indicate an over-fragmented structure. |
| **Total classes**   | All concrete and abstract class buildings. |
| **Total interfaces**| All interface buildings (Java + Kotlin). |
| **Total methods**   | Sum of NOM across all types. Large projects will be in the thousands. |
| **Total fields**    | Sum of NOA across all types. |
| **Total lines**     | Approximate total lines of code in the scanned scope. |
| **Avg complexity**  | Mean composite complexity score. Use this as a health baseline; watch it grow sprint by sprint. |
| **Max complexity**  | The single highest complexity score in the project — look at `mostComplexClass`. |
| **Min complexity**  | Lowest complexity score (usually a marker interface or empty record). |
| **Total cyclomatic**| Sum of cyclomatic complexity over the entire project. Useful for tracking test-coverage debt. |
| **Avg LOC/class**   | Average lines of code per type. A rising trend indicates growing class sizes. |
| **Avg methods/class**| Average NOM per type. Values above 10 across the board suggest the domain model needs splitting. |
| **Most complex**    | Fully qualified name of the type with the highest composite complexity. First refactoring candidate. |
| **Largest class**   | Fully qualified name of the type with the most lines of code. |
| **Files scanned**   | Total source files discovered (Java + Kotlin) before any parsing. |
| **Files parsed**    | Files that contained at least one type matching the include/exclude filters. |
| **Java files**      | Source files with `.java` extension. |
| **Kotlin files**    | Source files with `.kt` extension. |
| **Analysis time**   | Wall-clock milliseconds for the full scan, parse, layout, and metric computation. |

---

## Dependency Arches (Hybrid Overlay)

The arch overlay adds relationship context on top of shape metrics.

- **Package arches (highways)**: global package-to-package links across the whole city
- **Building arches (local streets)**: focused type-level links for your current selection
- **Hybrid mode**: both at once (global map + local detail)

### Data semantics

Each edge has two values:

- **weight**: how many references were observed from source to target
- **complexity**: average complexity of the source-side types contributing to that edge

Type edges are collected from in-project references (imports, extends/implements, and Kotlin equivalents).
Package edges are aggregated from type edges (`source package -> target package`).

### Visual encoding

| Visual cue | Meaning |
|------------|---------|
| Arc count | More arcs around one area usually means stronger coupling |
| Arc color tint | Greener to warmer means higher source-side complexity |
| Highway opacity/height | Heavier package links render a bit stronger and higher |
| Local outgoing/incoming color split | For single-type selection: outgoing vs incoming dependencies |

### How to interpret quickly

- **Many highways between the same two districts** -> package boundaries may be too chatty
- **A type with many local streets in and out** -> likely orchestration hub, facade, or god object
- **Mostly incoming local streets** -> likely shared service/abstraction used by many others
- **Mostly outgoing local streets** -> likely integration-heavy coordinator
- **Warm-colored arch clusters** -> dependency flow originates in already-complex types

### Practical caveats

- This is a **lightweight static dependency view**, not a full semantic graph.
- Edges only include types discovered in the analyzed scope (no external jars/modules).
- Kotlin dependency extraction is pattern-based, so some references can be missed.
- Rendering is intentionally capped for readability/performance:
  - package highways: top ~220 edges
  - local streets (single type): top ~120 edges
  - local streets (package selection): top ~140 edges
- Local streets require a selection; if nothing is selected, `Bld arches` can be `0` by design.

---

## Building Color Legend

Colors are fixed per type to give an at-a-glance language distribution:

```
  [#4A90E2]  CLASS           Blue         — concrete Java class
  [#FFB347]  ABSTRACT        Orange       — abstract Java class
  [#7B68EE]  INTERFACE       Purple       — Java interface
  [#FF6B6B]  ENUM            Red          — Java enum
  [#50C878]  RECORD          Green        — Java record (immutable DTO)
  [#20B2AA]  KOTLIN CLASS    Teal         — Kotlin class
  [#3FA9A3]  KOTLIN DATA     Dark teal    — Kotlin data class
  [#48D1CC]  KOTLIN IFACE    Turquoise    — Kotlin interface
  [#5F9EA0]  KOTLIN OBJECT   Cadet blue   — Kotlin singleton object
```

---

## Plateau Nesting and Package Hierarchy

```
  com.example                          <-- base plateau (depth 1)
  +-----------------------------------------+
  |                                         |
  |  com.example.service                    |  <-- child plateau (depth 2)
  |  +--------------------+                 |
  |  | [A] [B] [C]        |                 |
  |  | [D] [E]            |                 |
  |  +--------------------+                 |
  |                                         |
  |  com.example.api                        |  <-- sibling child plateau
  |  +----------------+                     |
  |  | [F] [G]        |                     |
  |  +----------------+                     |
  |                                         |
  |  com.example.domain                     |
  |  +----------------------------+         |
  |  |  com.example.domain.model  |         |  <-- grandchild plateau (depth 3)
  |  |  +----------------+        |         |
  |  |  | [H] [I] [J]    |        |         |
  |  |  +----------------+        |         |
  |  +----------------------------+         |
  +-----------------------------------------+

  [A..J] = individual type buildings
```

- The **vertical elevation** of a plateau increases with package depth.
- Sibling packages sit **next to each other** on the same elevation level.
- The root plateau is always at ground level (Y = 0).
- Buildings inside a plateau are laid out in a **square grid** sorted by complexity.

---

## ASCII City Example — Small Project

Imagine a project with three packages and ~10 types:

```
          Top-down view (XZ plane)
          ========================

  +--------------------------------------------------+
  |              com.example (base)                  |
  |                                                  |
  |  +------------------+  +--------------------+   |
  |  | com.example.api  |  | com.example.service|   |
  |  |                  |  |                    |   |
  |  |  [F]  [G]        |  |  [A]  [B]  [C]    |   |
  |  |  ctrl  err       |  |  svc  svc2  util  |   |
  |  +------------------+  |                    |   |
  |                         |  [D]  [E]          |   |
  |                         |  repo  model       |   |
  |                         +--------------------+   |
  +--------------------------------------------------+

  Side view (XY plane) — height = NOM
  =====================================

          [C]
         _____
        |     |          <- 12 methods, very tall
        |     |
        |     |
  [A]   |     |   [B]
  ___   |     |   ___
 |   |  |     |  |   |   <- 5 and 4 methods
 |   |  |_____|  |___|
 |___|
  svc   util2    svc2
```

---

## ASCII City Example — Medium Project (~140 types)

```
  Bird's-eye view of a medium-sized backend service

  +---------------------------------------------------------------------+
  |                          com.acme (root)                            |
  |                                                                     |
  | +-------------------+  +------------------+  +------------------+  |
  | | com.acme.api      |  | com.acme.domain   |  | com.acme.infra   |  |
  | |                   |  |                  |  |                  |  |
  | | [ctrl][ctrl][err] |  | [ent][ent][ent]  |  | [repo][repo]     |  |
  | | [req ][res ][adv] |  | [vo ][vo ][agg]  |  | [client][client] |  |
  | |                   |  | [evt][evt]       |  | [cfg][cfg][cfg]  |  |
  | +-------------------+  |                  |  +------------------+  |
  |                         | +------------+  |                         |
  |                         | | domain.svc |  |  +------------------+  |
  |                         | | [svc][svc] |  |  | com.acme.common  |  |
  |                         | | [port]     |  |  | [util][exc][log] |  |
  |                         | +------------+  |  +------------------+  |
  |                         +------------------+                        |
  +---------------------------------------------------------------------+

  Skyline from the south (tallest buildings = most methods):

             _
            | |
       _    | |    _
      | |   | |   | |
    _ | | _ | | _ | | _
   | || || || || || || |
   |_||_||_||_||_||_||_|
   api  svc  dom  inf  cmt
```

---

## Red-Flag Patterns to Watch in the Cityscape

```
SKYSCRAPER               MEGALITH               HAUNTED HOUSE
(tall + narrow)          (tall+wide+deep)       (wide + flat + zero comment)
      _                   #######                 _______________
     | |                 ########                |               |
     | |                 #######                 |   just data   |
     | |                 ########                |    no docs    |
     | |                 #######                 |_______________|
     | |                 ########
     |_|

-> God Class             -> Must refactor NOW     -> Undocumented DTO

GHOST TOWN               UNIFORM BLOCKS
(many tiny sheds)        (all same height = generated?)
  _ _ _ _ _ _ _          __ __ __ __ __ __
 |_|_|_|_|_|_|_|        |  ||  ||  ||  ||  ||  |
                         |  ||  ||  ||  ||  ||  |
-> Over-fragmentation    |__||__||__||__||__||__|
   or too many           
   value objects         -> Check if truly generated
```

---

## Interpreting the Metrics Together

| Pattern                            | Likely Cause                      | Action |
|------------------------------------|-----------------------------------|--------|
| High NOM + High CC                 | God Method / God Class            | Extract methods, split class |
| High NOA + High NOM                | God Class                         | Apply Single Responsibility Principle |
| Many static methods                | Procedural utility blob           | Consider making it a proper service bean |
| Many inner types                   | Class doing too many things       | Extract inner types to top-level |
| Near-zero comment count + high LOC | Undocumented complex code         | Add Javadoc / KDoc |
| High max params on methods         | Missing parameter object          | Introduce a request/command DTO |
| Very high LOC, low NOM             | Long methods                      | Extract method refactoring |
| City plateau with 1 building       | Package with single responsibility| Good — keep it |
| City plateau with 40+ buildings    | Flat package structure            | Add sub-packages |

---

## References

- McCabe, T. J. (1976). *A Complexity Measure.* IEEE Transactions on Software Engineering.
- Wettel, R., Lanza, M. (2007). *Visualizing Software Systems as Cities.* VISSOFT.
- Wettel, R. (2009). *Software Systems as Cities.* ICSE Doctoral Symposium.  
  https://wettel.github.io/download/Wettel09a-icse-doctoral.pdf
- Lanza, M., Marinescu, R. (2006). *Object-Oriented Metrics in Practice.* Springer.

