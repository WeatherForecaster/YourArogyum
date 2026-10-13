package com.YourArogyum.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "assessments")
public class Assessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String age;

    @Column(nullable = false)
    private String sex;

    @Column(nullable = false)
    private String height;

    @Column(nullable = false)
    private String weight;

    // Long text fields use TEXT to avoid excessive row size.

    @Column(name = "full_name", columnDefinition = "TEXT")
    private String fullName;

    @Column(columnDefinition = "TEXT")
    private String conditions;

    @Column(name = "health_concerns", columnDefinition = "TEXT")
    private String healthConcerns;

    @Column(columnDefinition = "TEXT")
    private String medications;

    @Column(name = "family_history", columnDefinition = "TEXT")
    private String familyHistory;

    @Column(columnDefinition = "TEXT")
    private String allergies;

    @Column(name = "food_allergies", columnDefinition = "TEXT")
    private String foodAllergies;

    @Column(name = "foods_to_avoid", columnDefinition = "TEXT")
    private String foodsToAvoid;

    @Column(name = "food_preferences", columnDefinition = "TEXT")
    private String foodPreferences;

    @Column(name = "daily_activity", columnDefinition = "TEXT")
    private String dailyActivity;

    @Column(name = "work_lifestyle", columnDefinition = "TEXT")
    private String workLifestyle;

    // Regular assessment fields

    private String goal;

    private String targetWeight;

    private String fitnessLevel;

    private String bmi;

    @Column(nullable = false)
    private String sleep;

    @Column(nullable = false)
    private String activity;

    @Column(nullable = false)
    private String water;

    private String stress;

    @Column(nullable = false)
    private String diet;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getAge() {
        return age;
    }

    public void setAge(String age) {
        this.age = age;
    }

    public String getSex() {
        return sex;
    }

    public void setSex(String sex) {
        this.sex = sex;
    }

    public String getHeight() {
        return height;
    }

    public void setHeight(String height) {
        this.height = height;
    }

    public String getWeight() {
        return weight;
    }

    public void setWeight(String weight) {
        this.weight = weight;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getConditions() {
        return conditions;
    }

    public void setConditions(String conditions) {
        this.conditions = conditions;
    }

    public String getHealthConcerns() {
        return healthConcerns;
    }

    public void setHealthConcerns(String healthConcerns) {
        this.healthConcerns = healthConcerns;
    }

    public String getMedications() {
        return medications;
    }

    public void setMedications(String medications) {
        this.medications = medications;
    }

    public String getFamilyHistory() {
        return familyHistory;
    }

    public void setFamilyHistory(String familyHistory) {
        this.familyHistory = familyHistory;
    }

    public String getAllergies() {
        return allergies;
    }

    public void setAllergies(String allergies) {
        this.allergies = allergies;
    }

    public String getSleep() {
        return sleep;
    }

    public void setSleep(String sleep) {
        this.sleep = sleep;
    }

    public String getActivity() {
        return activity;
    }

    public void setActivity(String activity) {
        this.activity = activity;
    }

    public String getWater() {
        return water;
    }

    public void setWater(String water) {
        this.water = water;
    }

    public String getStress() {
        return stress;
    }

    public void setStress(String stress) {
        this.stress = stress;
    }

    public String getDiet() {
        return diet;
    }

    public void setDiet(String diet) {
        this.diet = diet;
    }

    public String getFoodAllergies() {
        return foodAllergies;
    }

    public void setFoodAllergies(String foodAllergies) {
        this.foodAllergies = foodAllergies;
    }

    public String getFoodsToAvoid() {
        return foodsToAvoid;
    }

    public void setFoodsToAvoid(String foodsToAvoid) {
        this.foodsToAvoid = foodsToAvoid;
    }

    public String getFoodPreferences() {
        return foodPreferences;
    }

    public void setFoodPreferences(String foodPreferences) {
        this.foodPreferences = foodPreferences;
    }

    public String getDailyActivity() {
        return dailyActivity;
    }

    public void setDailyActivity(String dailyActivity) {
        this.dailyActivity = dailyActivity;
    }

    public String getWorkLifestyle() {
        return workLifestyle;
    }

    public void setWorkLifestyle(String workLifestyle) {
        this.workLifestyle = workLifestyle;
    }

    public String getGoal() {
        return goal;
    }

    public void setGoal(String goal) {
        this.goal = goal;
    }

    public String getTargetWeight() {
        return targetWeight;
    }

    public void setTargetWeight(String targetWeight) {
        this.targetWeight = targetWeight;
    }

    public String getFitnessLevel() {
        return fitnessLevel;
    }

    public void setFitnessLevel(String fitnessLevel) {
        this.fitnessLevel = fitnessLevel;
    }

    public String getBmi() {
        return bmi;
    }

    public void setBmi(String bmi) {
        this.bmi = bmi;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}