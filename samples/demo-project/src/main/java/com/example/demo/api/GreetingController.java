package com.example.demo.api;

import com.example.demo.service.GreetingService;

public class GreetingController {
    private final GreetingService greetingService;

    public GreetingController(GreetingService greetingService) {
        this.greetingService = greetingService;
    }

    public String greet(String name) {
        if (name == null || name.isBlank()) {
            return greetingService.greet("world");
        }
        return greetingService.greet(name.trim());
    }
}

