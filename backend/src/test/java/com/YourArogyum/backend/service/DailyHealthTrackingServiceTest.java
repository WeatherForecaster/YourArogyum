package com.YourArogyum.backend.service;

import com.YourArogyum.backend.entity.DailyHealthLog;
import com.YourArogyum.backend.entity.User;
import com.YourArogyum.backend.repository.AssessmentRepository;
import com.YourArogyum.backend.repository.DailyHealthLogRepository;
import com.YourArogyum.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DailyHealthTrackingServiceTest {

    private DailyHealthLogRepository logRepository;
    private UserRepository userRepository;
    private AssessmentRepository assessmentRepository;
    private DailyHealthTrackingService trackingService;

    private User testUser;
    private User otherUser;

    @BeforeEach
    void setUp() {
        logRepository = mock(DailyHealthLogRepository.class);
        userRepository = mock(UserRepository.class);
        assessmentRepository = mock(AssessmentRepository.class);
        trackingService = new DailyHealthTrackingService(logRepository, userRepository, assessmentRepository);

        testUser = new User();
        ReflectionTestUtils.setField(testUser, "id", 1L);
        testUser.setEmail("test@example.com");

        otherUser = new User();
        ReflectionTestUtils.setField(otherUser, "id", 2L);
        otherUser.setEmail("other@example.com");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
    }

    @Test
    @DisplayName("getWeightHistory includes id, date, and weightKg for each entry")
    void testGetWeightHistoryIncludesId() {
        LocalDate d1 = LocalDate.of(2026, 11, 1);
        DailyHealthLog log1 = new DailyHealthLog();
        ReflectionTestUtils.setField(log1, "id", 101L);
        log1.setUser(testUser);
        log1.setLogDate(d1);
        log1.setWeightKg(72.5);

        when(logRepository.findByUserAndLogDateBetweenOrderByLogDateAsc(
                eq(testUser), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(log1));

        List<Map<String, Object>> history = trackingService.getWeightHistory("test@example.com", null, null);

        assertEquals(1, history.size());
        assertEquals(101L, history.get(0).get("id"));
        assertEquals(d1, history.get(0).get("date"));
        assertEquals(72.5, history.get(0).get("weightKg"));
    }

    @Test
    @DisplayName("deleteWeightLog by numeric ID deletes row if no other metrics exist")
    void testDeleteWeightLogDeletesRowWhenOnlyWeight() {
        DailyHealthLog log = new DailyHealthLog();
        ReflectionTestUtils.setField(log, "id", 101L);
        log.setUser(testUser);
        log.setLogDate(LocalDate.of(2026, 11, 10));
        log.setWeightKg(70.0);

        when(logRepository.findById(101L)).thenReturn(Optional.of(log));

        trackingService.deleteWeightLog("test@example.com", "101");

        verify(logRepository, times(1)).delete(log);
        verify(logRepository, never()).save(any());
    }

    @Test
    @DisplayName("deleteWeightLog clears weightKg and preserves row if other metrics exist")
    void testDeleteWeightLogClearsWeightWhenOtherMetricsExist() {
        DailyHealthLog log = new DailyHealthLog();
        ReflectionTestUtils.setField(log, "id", 102L);
        log.setUser(testUser);
        log.setLogDate(LocalDate.of(2026, 11, 10));
        log.setWeightKg(70.0);
        log.setWaterMl(2000); // other metric

        when(logRepository.findById(102L)).thenReturn(Optional.of(log));

        trackingService.deleteWeightLog("test@example.com", "102");

        assertNull(log.getWeightKg());
        assertEquals(2000, log.getWaterMl());
        verify(logRepository, times(1)).save(log);
        verify(logRepository, never()).delete(any());
    }

    @Test
    @DisplayName("deleteWeightLog falls back to date identifier if numeric parse fails")
    void testDeleteWeightLogFallbackToDate() {
        LocalDate logDate = LocalDate.of(2026, 11, 15);
        DailyHealthLog log = new DailyHealthLog();
        ReflectionTestUtils.setField(log, "id", 103L);
        log.setUser(testUser);
        log.setLogDate(logDate);
        log.setWeightKg(68.5);

        when(logRepository.findByUserAndLogDate(testUser, logDate)).thenReturn(Optional.of(log));

        trackingService.deleteWeightLog("test@example.com", "2026-11-15");

        verify(logRepository, times(1)).delete(log);
    }

    @Test
    @DisplayName("deleteWeightLog denies access if entry belongs to another user")
    void testDeleteWeightLogAccessDeniedForOtherUser() {
        DailyHealthLog log = new DailyHealthLog();
        ReflectionTestUtils.setField(log, "id", 104L);
        log.setUser(otherUser);
        log.setLogDate(LocalDate.of(2026, 11, 10));
        log.setWeightKg(75.0);

        when(logRepository.findById(104L)).thenReturn(Optional.of(log));

        assertThrows(AccessDeniedException.class, () ->
                trackingService.deleteWeightLog("test@example.com", "104")
        );
        verify(logRepository, never()).delete(any());
        verify(logRepository, never()).save(any());
    }

    @Test
    @DisplayName("deleteWeightLog throws IllegalArgumentException for missing entry or invalid input")
    void testDeleteWeightLogNotFoundAndInvalidInput() {
        assertThrows(IllegalArgumentException.class, () ->
                trackingService.deleteWeightLog("test@example.com", "")
        );
        assertThrows(IllegalArgumentException.class, () ->
                trackingService.deleteWeightLog("test@example.com", null)
        );

        when(logRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () ->
                trackingService.deleteWeightLog("test@example.com", "999")
        );
    }
}
