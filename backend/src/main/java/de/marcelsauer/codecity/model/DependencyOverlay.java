package de.marcelsauer.codecity.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Dependency graph data for visual overlays in the city.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DependencyOverlay {
    private List<DependencyEdge> packageEdges;
    private List<DependencyEdge> typeEdges;
}

