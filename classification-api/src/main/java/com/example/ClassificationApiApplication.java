package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Boot entry point for the classification api module.
 */
@SpringBootApplication
public class ClassificationApiApplication {

    /**
     * Starts the application.
     *
     * @param args command-line arguments passed to the application
     */
    public static void main(String[] args) {
        SpringApplication.run(ClassificationApiApplication.class, args);
    }
}
