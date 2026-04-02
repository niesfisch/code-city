package de.marcelsauer.codecity.service;

import de.marcelsauer.codecity.api.DirectoryBrowserResponse;
import de.marcelsauer.codecity.api.DirectoryEntry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/**
 * Service for browsing the file system and finding Java/Kotlin projects.
 */
@Slf4j
@Service
public class DirectoryBrowserService {

    /**
     * Browse a directory and return its contents.
     * Only directories are shown to help users navigate to their project folder.
     */
    public DirectoryBrowserResponse browseDirectory(String pathString) {
        try {
            Path path = pathString == null || pathString.isBlank()
                ? Paths.get(System.getProperty("user.home"))
                : Paths.get(pathString).toAbsolutePath();

            if (!Files.isDirectory(path)) {
                return new DirectoryBrowserResponse(
                    path.toString(),
                    List.of(),
                    "Path is not a directory"
                );
            }

            File[] files = path.toFile().listFiles();
            if (files == null) {
                return new DirectoryBrowserResponse(
                    path.toString(),
                    List.of(),
                    "Cannot read directory"
                );
            }

            List<DirectoryEntry> entries = new ArrayList<>();

            // Add parent directory link (if not at root)
            if (path.getParent() != null) {
                entries.add(new DirectoryEntry(
                    "..",
                    path.getParent().toString(),
                    true,
                    0
                ));
            }

            // Add subdirectories and mark those with Java/Kotlin sources
            Arrays.stream(files)
                .filter(File::isDirectory)
                .filter(f -> !f.getName().startsWith(".")) // hide hidden dirs
                .sorted(Comparator.comparing(File::getName, String.CASE_INSENSITIVE_ORDER))
                .forEach(f -> entries.add(new DirectoryEntry(
                    f.getName(),
                    f.getAbsolutePath(),
                    true,
                    0
                )));

            log.info("Browsed directory: {} - found {} entries", path, entries.size());
            return new DirectoryBrowserResponse(path.toString(), entries);
        } catch (Exception e) {
            log.error("Error browsing directory", e);
            return new DirectoryBrowserResponse(
                pathString,
                List.of(),
                e.getMessage()
            );
        }
    }
}

