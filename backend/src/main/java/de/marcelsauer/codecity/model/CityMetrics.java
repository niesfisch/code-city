package de.marcelsauer.codecity.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregate metrics for the entire cityscape.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CityMetrics {
    private int totalClasses;
    private int totalInterfaces;
    private int totalMethods;
    private int totalFields;
    private int totalPackages;
    private int totalLines;
    private double averageComplexity;
    private double maxComplexity;
    private double minComplexity;
    /** Wall-clock time in milliseconds for the full analysis run. */
    private long analysisTimeMs;
}

