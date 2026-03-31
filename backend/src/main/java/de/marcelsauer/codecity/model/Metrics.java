package de.marcelsauer.codecity.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Code metrics for a building.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Metrics {
    private int methodCount;
    private int fieldCount;
    private int constructorCount;
    private double cyclomatic;          // Cyclomatic complexity (simplified)
    private int linesOfCode;
    private double complexity;          // Normalized complexity score
    private int maxMethodParameters;    // Max params on a single method (long parameter list smell)
    private int staticMethodCount;      // Number of static methods (utility/procedural smell)
    private int innerTypeCount;         // Nested type declarations inside this type
    private int commentLineCount;       // Lines occupied by comments (documentation coverage proxy)
}

