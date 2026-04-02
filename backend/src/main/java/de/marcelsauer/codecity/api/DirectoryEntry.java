package de.marcelsauer.codecity.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Represents a file system entry (file or directory) for browsing.
 */
@Data
@AllArgsConstructor
public class DirectoryEntry {
    private String name;
    private String path;
    @JsonProperty("isDirectory")
    private boolean isDirectory;
    private long size;
}

