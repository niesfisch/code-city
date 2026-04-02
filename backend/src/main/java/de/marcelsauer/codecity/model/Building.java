package de.marcelsauer.codecity.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a single building (class or interface) in the cityscape.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Building {
    private String name;           // Class name
    private String fullName;       // Fully qualified name
    private String packageName;    // Package
    private String sourceFileName; // Source file basename (e.g. Foo.java, Bar.kt)
    private BuildingType type;     // CLASS, INTERFACE, ENUM, RECORD
    private Position position;
    private Dimensions dimensions;
    private Metrics metrics;
    private String color;          // Hex color based on type or metrics
}
