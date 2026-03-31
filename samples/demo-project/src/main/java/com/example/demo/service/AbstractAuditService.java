package com.example.demo.service;

public abstract class AbstractAuditService {
    protected int eventCount;

    public void audit(String event) {
        if (event != null && !event.isBlank()) {
            eventCount++;
            write(event);
        }
    }

    protected abstract void write(String event);
}

