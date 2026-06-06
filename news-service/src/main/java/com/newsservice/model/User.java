package com.newsservice.model;

import com.newsservice.dto.NewsTopic;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

/**
 * Domain model that represents user data.
 */
@Entity
@Table(name = "users")
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class User {

    @Id
    private String id;
    private String name;

    @Column(name = "user_name", unique = true)
    private String username;

    @Column(unique = true)
    private String email;

    @ElementCollection
    @CollectionTable(
            name = "user_favorite_topics",
            joinColumns = @JoinColumn(name = "user_id")
    )
    @Column(name = "favorite_topic")
    @Enumerated(EnumType.STRING)
    private List<NewsTopic> favoriteTopics;
}
