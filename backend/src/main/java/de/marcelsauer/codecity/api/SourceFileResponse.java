package de.marcelsauer.codecity.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response containing source file content for quick browsing.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SourceFileResponse {
    private String name;           // Class/type name
    private String fullName;       // Fully qualified name
    private String packageName;    // Package
    private String sourceFileName; // Source file name (e.g., Foo.java)
    private String content;        // File content
    private String language;       // "java" or "kotlin"
}

