package de.marcelsauer.codecity.api;

import de.marcelsauer.codecity.model.Cityscape;
import de.marcelsauer.codecity.parser.JavaAnalysisService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}

