
package com.YourArogyum.backend.repository;

import com.YourArogyum.backend.entity.User;
import com.YourArogyum.backend.entity.WorkoutProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface WorkoutProgressRepository
        extends JpaRepository<WorkoutProgress, Long> {

    Optional<WorkoutProgress> findByUserAndLogDate(
            User user,
            LocalDate logDate
    );
}
