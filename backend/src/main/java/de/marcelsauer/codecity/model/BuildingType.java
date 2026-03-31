package de.marcelsauer.codecity.model;

/**
 * Types of buildings in the cityscape.
 */
public enum BuildingType {
    CLASS("#4A90E2"),      // Blue
    INTERFACE("#7B68EE"),  // Purple
    ENUM("#FF6B6B"),       // Red
    RECORD("#50C878"),     // Green
    ABSTRACT("#FFB347");   // Orange

    private final String defaultColor;

    BuildingType(String defaultColor) {
        this.defaultColor = defaultColor;
    }

    public String getDefaultColor() {
        return defaultColor;
    }
}

