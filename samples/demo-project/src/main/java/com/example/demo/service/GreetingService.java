package com.example.demo.service;

import java.util.List;

public class GreetingService {
    private final List<String> supportedGreetings = List.of("Hello", "Ahoy", "Howdy");

    public String greet(String name) {
        String normalized = name == null ? "world" : name.trim();
        String prefix = supportedGreetings.getFirst();

        if (normalized.length() > 20) {
            prefix = supportedGreetings.get(2);
        } else if (normalized.length() > 12) {
            prefix = supportedGreetings.get(1);
        }

        for (char current : normalized.toCharArray()) {
            if (!Character.isLetter(current) && current != ' ') {
                throw new IllegalArgumentException("Unsupported character: " + current);
            }
        }

        return prefix + ", " + normalized + "!";
    }
}

