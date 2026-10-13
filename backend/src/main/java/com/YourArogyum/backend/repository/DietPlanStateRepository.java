package com.YourArogyum.backend.repository;

import com.YourArogyum.backend.entity.DietPlanState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DietPlanStateRepository extends JpaRepository<DietPlanState, Long> {
    Optional<DietPlanState> findByUser_Id(Long userId);
}
