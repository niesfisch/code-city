package de.marcelsauer.codecity.api;

import de.marcelsauer.codecity.model.Cityscape;
import de.marcelsauer.codecity.parser.JavaAnalysisService;
import de.marcelsauer.codecity.service.DirectoryBrowserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.MalformedInputException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

/**
 * REST API for analyzing Java projects and generating cityscape models.
 */
@Slf4j
@RestController
@RequestMapping("/api/analyze")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AnalysisController {

    private final JavaAnalysisService analysisService;
    private final DirectoryBrowserService directoryBrowserService;

    @PostMapping
    public ResponseEntity<Cityscape> analyze(@Valid @RequestBody AnalysisRequest request) throws Exception {
        log.info("Analyzing path: {} with include: {} and exclude: {}",
                request.getPath(), request.getIncludePattern(), request.getExcludePattern());

        long start = System.currentTimeMillis();
        Cityscape cityscape = analysisService.analyzePath(
                request.getPath(),
                request.getIncludePattern(),
                request.getExcludePattern(),
                request.isExcludeTests()
        );
        cityscape.getMetrics().setAnalysisTimeMs(System.currentTimeMillis() - start);

        log.info("Analysis complete in {} ms. Scanned {} files ({} Java, {} Kotlin), parsed {} files. " +
                "Found {} packages and {} buildings",
                cityscape.getMetrics().getAnalysisTimeMs(),
                cityscape.getMetrics().getFilesScanned(),
                cityscape.getMetrics().getJavaFilesScanned(),
                cityscape.getMetrics().getKotlinFilesScanned(),
                cityscape.getMetrics().getFilesParsed(),
                cityscape.getPlateaus().size(),
                cityscape.getBuildings().size());

        return ResponseEntity.ok(cityscape);
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Code City is running");
    }

    @GetMapping("/browse")
    public ResponseEntity<DirectoryBrowserResponse> browseDirectory(@RequestParam(required = false) String path) {
        DirectoryBrowserResponse response = directoryBrowserService.browseDirectory(path);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/source")
    public ResponseEntity<SourceFileResponse> getSourceFile(
            @RequestParam String projectPath,
            @RequestParam String sourceFileName,
            @RequestParam String fullName,
            @RequestParam(required = false) String packageName,
            @RequestParam String name) {
        try {
            SourceFileResponse response = fetchSourceFile(
                    projectPath,
                    sourceFileName,
                    fullName,
                    packageName,
                    name
            );
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            log.warn("Security violation in source file request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            log.warn("Error fetching source file: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    private SourceFileResponse fetchSourceFile(
            String projectPath,
            String sourceFileName,
            String fullName,
            String packageName,
            String name) throws IOException {

        if (sourceFileName == null || sourceFileName.isEmpty()) {
            throw new IllegalArgumentException("Source file name required");
        }
        if (sourceFileName.contains("/") || sourceFileName.contains("\\") || sourceFileName.contains("..")) {
            throw new SecurityException("Invalid source file name");
        }
        if (packageName != null && (packageName.contains("/") || packageName.contains("\\") || packageName.contains(".."))) {
            throw new SecurityException("Invalid package name");
        }

        Path projectRoot = Path.of(projectPath).toAbsolutePath().normalize();
        if (!Files.isDirectory(projectRoot)) {
            throw new IllegalArgumentException("Project path is not a directory: " + projectRoot);
        }

        Path canonicalRoot = projectRoot.toRealPath();
        String packagePath = packageName != null && !packageName.isEmpty()
                ? packageName.replace('.', '/')
                : "";
        Path relativePath = packagePath.isEmpty()
                ? Path.of(sourceFileName)
                : Path.of(packagePath).resolve(sourceFileName);

        Path filePath = resolveSourceFilePath(canonicalRoot, relativePath);

        String content = readSourceContent(filePath);
        String language = sourceFileName.endsWith(".kt") ? "kotlin" : "java";

        return SourceFileResponse.builder()
                .name(name)
                .fullName(fullName)
                .packageName(packageName)
                .sourceFileName(sourceFileName)
                .content(content)
                .language(language)
                .build();
    }

    /**
     * Reads file content as UTF-8, falling back to Latin-1 for legacy source
     * files that contain non-UTF-8 bytes (e.g., special chars in comments).
     */
    private String readSourceContent(Path filePath) throws IOException {
        try {
            return Files.readString(filePath, StandardCharsets.UTF_8);
        } catch (MalformedInputException e) {
            log.debug("File {} is not valid UTF-8, retrying with Latin-1: {}", filePath.getFileName(), e.getMessage());
            return Files.readString(filePath, StandardCharsets.ISO_8859_1);
        }
    }

    private static final List<String> COMMON_SOURCE_ROOTS = List.of(
            "src/main/java",
            "src/main/kotlin",
            "src/test/java",
            "src/test/kotlin"
    );

    /**
     * Resolves a source file within a project tree.
     *
     * Phase 1 (fast): checks the project root itself and standard
     * {@code src/main/java} source-root patterns up to one module level deep.
     *
     * Phase 2 (fallback): walks the full tree and locates any regular file
     * whose path ends with {@code relativePath} (i.e. package/File.java).
     * This handles arbitrary multi-module and flat-workspace layouts.
     */
    private Path resolveSourceFilePath(Path canonicalProjectRoot, Path relativePath) throws IOException {
        // -- Phase 1: fast path via known source-root patterns ----------------
        for (Path candidate : buildCandidatePaths(canonicalProjectRoot, relativePath)) {
            if (!candidate.startsWith(canonicalProjectRoot)) continue;
            if (!Files.isRegularFile(candidate)) continue;
            return safeRealPath(candidate, canonicalProjectRoot);
        }

        // -- Phase 2: full tree walk, match by relative tail ------------------
        try (Stream<Path> walk = Files.walk(canonicalProjectRoot)) {
            Optional<Path> found = walk
                    .filter(Files::isRegularFile)
                    .filter(p -> p.endsWith(relativePath))
                    .findFirst();
            if (found.isPresent()) {
                return safeRealPath(found.get(), canonicalProjectRoot);
            }
        }

        throw new IllegalArgumentException("Source file not found: "
                + canonicalProjectRoot.resolve(relativePath).normalize());
    }

    /** Resolves {@code candidate} to its canonical path and blocks traversal escapes. */
    private Path safeRealPath(Path candidate, Path canonicalProjectRoot) throws IOException {
        Path real = candidate.toRealPath();
        if (!real.startsWith(canonicalProjectRoot)) {
            throw new SecurityException("Path traversal blocked");
        }
        return real;
    }

    /**
     * Builds an ordered list of concrete candidate paths to check in Phase 1.
     * Covers: project-root-flat, standard single-module layout, and one level
     * of sub-module directories (e.g. {@code project/module/src/main/java/...}).
     */
    private List<Path> buildCandidatePaths(Path root, Path relativePath) {
        List<Path> candidates = new ArrayList<>();
        // flat / already at source root
        candidates.add(root.resolve(relativePath).normalize());
        // single-module: root/src/main/java/...
        for (String srcRoot : COMMON_SOURCE_ROOTS) {
            candidates.add(root.resolve(srcRoot).resolve(relativePath).normalize());
        }
        // multi-module: root/<module>/src/main/java/...
        try (Stream<Path> children = Files.list(root)) {
            children.filter(Files::isDirectory).forEach(module -> {
                for (String srcRoot : COMMON_SOURCE_ROOTS) {
                    candidates.add(module.resolve(srcRoot).resolve(relativePath).normalize());
                }
            });
        } catch (IOException e) {
            log.debug("Could not list top-level dirs under {}: {}", root, e.getMessage());
        }
        return candidates;
    }
}
