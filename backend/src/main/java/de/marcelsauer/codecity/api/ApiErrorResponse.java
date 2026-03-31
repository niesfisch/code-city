package de.marcelsauer.codecity.api;

import java.time.Instant;

/**
 * Error response returned by the API.
 */
public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path
) {
}

