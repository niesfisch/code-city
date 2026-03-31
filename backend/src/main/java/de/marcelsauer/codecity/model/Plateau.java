package de.marcelsauer.codecity.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a package as a plateau in the cityscape.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Plateau {
    private String name;               // Package name
    private Position position;
    private Dimensions dimensions;
    private int buildingCount;         // Number of classes in package
    private double averageHeight;      // Average complexity
    private String color;              // Hex color
}

