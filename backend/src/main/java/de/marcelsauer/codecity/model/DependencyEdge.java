package de.marcelsauer.codecity.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A directed dependency edge between two packages or two types.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DependencyEdge {
    private String source;
    private String target;
    private int weight;
    private double complexity;
}

