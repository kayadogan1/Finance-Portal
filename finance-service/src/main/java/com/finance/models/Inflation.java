package com.finance.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@Builder
@Data
@Table(name = "inflation")
@NoArgsConstructor
@AllArgsConstructor
public class Inflation {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    private Double rate;

    @Column(name = "associated_country",nullable = false)
    private String associatedCountry;

    private LocalDate timestamp;


}
