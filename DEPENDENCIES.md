# Code City Dependencies

This document lists all direct dependencies used in Code City and their licenses. Code City supports analysis of both Java and Kotlin source code.

## Backend Dependencies (Java/Maven)

| Dependency | Version | License | Purpose |
|---|---|---|---|
| Spring Boot Starter Web | 3.2.8 | Apache 2.0 | REST API and web framework |
| Spring Boot Starter JSON | 3.2.8 | Apache 2.0 | JSON serialization |
| Spring Boot Starter Validation | 3.2.8 | Apache 2.0 | Input validation |
| JavaParser | 3.26.1 | Apache 2.0 | Java source code parsing and AST analysis; Kotlin detection |
| Apache Commons Lang3 | 3.15.0 | Apache 2.0 | Utility functions for strings and collections |
| Apache Commons IO | 2.17.0 | Apache 2.0 | File I/O utilities |
| Lombok | 1.18.34 | MIT | Annotation processor for boilerplate reduction |
| Spring Boot Starter Test | 3.2.8 | Apache 2.0 | Testing framework (test scope only) |

## Frontend Dependencies (JavaScript/NPM)

| Dependency | Version | License | Purpose |
|---|---|---|---|
| Three.js | 0.165.0 | MIT | 3D graphics rendering and scene management |
| Vite | 7.1.11+ | MIT | Frontend build tool and dev server |

## Transitive Dependencies

Spring Boot transitively includes:
- Jackson (Apache 2.0) - JSON processing
- Tomcat Embed (Apache 2.0) - Embedded servlet container
- Logback/SLF4J (MIT/Apache 2.0) - Logging

NPM ecosystem may include various MIT and ISC-licensed utilities.

## License Compatibility

All dependencies are **MIT-compatible**:

- **MIT licenses** (Lombok, Three.js, Vite) match Code City's license exactly
- **Apache 2.0 licenses** (Spring Boot, JavaParser, Commons) are permissive and fully compatible with MIT
- **No copyleft dependencies** (GPL/AGPL) are used

Code City can be used for commercial purposes without requiring derivative works to be open-source.

## Known Vulnerabilities

✅ **None** - All known CVEs have been patched.

Previous issue (now fixed):
- **Vite 7.1.5** had CVE-2025-62522 (Windows dev server path bypass, medium severity)
  - Fixed in Vite 7.1.11+
  - Current version: **7.1.11+** ✅

## Upgrade History

### Kotlin language support added (2026-03-31)

- Extended scanner to discover and parse `.kt` (Kotlin) files
- Added Kotlin building types: KOTLIN_CLASS, KOTLIN_INTERFACE, KOTLIN_OBJECT, KOTLIN_DATA_CLASS
- Kotlin metrics extraction: methods (fun), fields (val/var), constructors
- Mixed Java/Kotlin projects now render with distinct color families

### Latest dependency upgrades (2026-03-31)

**Backend:**
- Spring Boot 3.2.3 → 3.2.8
- spring-dependency-management 1.1.4 → 1.1.6
- JavaParser 3.25.4 → 3.26.1
- Commons Lang3 3.14.0 → 3.15.0
- Commons IO 2.11.0 → 2.17.0
- Lombok 1.18.30 → 1.18.34

**Frontend:**
- Vite 7.1.5 → 7.1.11+ (fixes CVE-2025-62522)
- Three.js 0.164.1 → 0.165.0

All upgrades are non-breaking and maintain compatibility.

## License References

- MIT License: https://opensource.org/licenses/MIT
- Apache License 2.0: https://opensource.org/licenses/Apache-2.0
- Spring Boot: https://spring.io/projects/spring-boot
- Three.js: https://threejs.org/
- Vite: https://vitejs.dev/
- JavaParser: https://javaparser.org/

