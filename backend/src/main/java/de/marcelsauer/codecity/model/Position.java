package de.marcelsauer.codecity.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a 3D position in the cityscape.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Position {
    private double x;
    private double y;
    private double z;
}

