package de.marcelsauer.codecity.model;

/**
 * Types of buildings in the cityscape.
 */
public enum BuildingType {
    // Java types
    CLASS("#4A90E2"),      // Blue
    INTERFACE("#7B68EE"),  // Purple
    ENUM("#FF6B6B"),       // Red
    RECORD("#50C878"),     // Green
    ABSTRACT("#FFB347"),   // Orange

    // Kotlin types (teal family to differentiate from Java)
    KOTLIN_CLASS("#20B2AA"),      // Light sea green
    KOTLIN_INTERFACE("#48D1CC"),  // Medium turquoise
    KOTLIN_OBJECT("#5F9EA0"),     // Cadet blue
    KOTLIN_DATA_CLASS("#3FA9A3"); // Teal

    private final String defaultColor;

    BuildingType(String defaultColor) {
        this.defaultColor = defaultColor;
    }

    public String getDefaultColor() {
        return defaultColor;
    }
}



