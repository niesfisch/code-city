package de.marcelsauer.codecity.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents dimensions of a building (class/interface).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Dimensions {
    private double width;
    private double height;  // Complexity-based
    private double depth;
}

