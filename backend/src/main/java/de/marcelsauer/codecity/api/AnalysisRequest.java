package de.marcelsauer.codecity.api;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for analysis.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisRequest {
    @NotBlank(message = "Project path is required")
    private String path;
    private String includePattern;
    private String excludePattern;

    /**
     * When true (the default), files under src/test/java and files whose names
     * match common test naming conventions (e.g. Test*.java, *Test.java, *IT.java)
     * are skipped.
     */
    private boolean excludeTests = true;
}

