
package com.YourArogyum.backend.repository;

import com.YourArogyum.backend.entity.DailyHealthLog;
import com.YourArogyum.backend.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyHealthLogRepository
        extends JpaRepository<DailyHealthLog, Long> {

    Optional<DailyHealthLog> findByUserAndLogDate(
            User user, LocalDate logDate);

    List<DailyHealthLog> findByUserAndLogDateBetweenOrderByLogDateAsc(
            User user, LocalDate from, LocalDate to);
}
