package de.marcelsauer.codecity.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * The complete cityscape model containing all buildings and plateaus.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Cityscape {
    private List<Plateau> plateaus;
    private List<Building> buildings;
    private CityMetrics metrics;
}

