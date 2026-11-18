package com.YourArogyum.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "workout_progress",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_workout_progress_user_date",
                        columnNames = {"user_id", "log_date"}
                )
        }
)
public class WorkoutProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    @Column(
            name = "completed_exercises_json",
            nullable = false,
            columnDefinition = "TEXT"
    )
    private String completedExercisesJson = "[]";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public WorkoutProgress() {
        // Required by JPA.
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        updatedAt = now;

        if (logDate == null) {
            logDate = LocalDate.now();
        }

        if (completedExercisesJson == null) {
            completedExercisesJson = "[]";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDate getLogDate() {
        return logDate;
    }

    public void setLogDate(LocalDate logDate) {
        this.logDate = logDate;
    }

    public String getCompletedExercisesJson() {
        return completedExercisesJson;
    }

    public void setCompletedExercisesJson(String completedExercisesJson) {
        this.completedExercisesJson = completedExercisesJson;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
