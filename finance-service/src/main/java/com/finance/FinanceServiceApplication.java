package com.finance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Spring Boot entry point for the finance service module.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class FinanceServiceApplication {

	/**
	 * Starts the application.
	 *
	 * @param args command-line arguments passed to the application
	 */
	public static void main(String[] args) {
		SpringApplication.run(FinanceServiceApplication.class, args);
	}

}
