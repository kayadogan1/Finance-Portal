package com.newsservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Spring Boot entry point for the news service module.
 */
@EnableScheduling
@SpringBootApplication
public class NewsServiceApplication {

	/**
	 * Starts the application.
	 *
	 * @param args command-line arguments passed to the application
	 */
	public static void main(String[] args) {
		SpringApplication.run(NewsServiceApplication.class, args);
	}

}
