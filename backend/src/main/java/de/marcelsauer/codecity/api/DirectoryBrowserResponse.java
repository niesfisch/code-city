package de.marcelsauer.codecity.api;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * Response for directory browsing operations.
 */
@Data
@AllArgsConstructor
public class DirectoryBrowserResponse {
    private String currentPath;
    private List<DirectoryEntry> entries;
    private String error;

    public DirectoryBrowserResponse(String currentPath, List<DirectoryEntry> entries) {
        this.currentPath = currentPath;
        this.entries = entries;
        this.error = null;
    }
}

