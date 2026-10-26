# Experiment 5: Pima Indians Diabetes (n=768, prevalence 0.349); sha256 698c203a14aa…
zeros treated as missing: {'Glucose': 5, 'BloodPressure': 35, 'SkinThickness': 227, 'Insulin': 374, 'BMI': 11}

## A_overlap_age_bmi - repeated 5-fold CV x20 (100 folds), mean±SD
- logistic_regression: AUC 0.734±0.035 | acc 0.657 | F1(pos) 0.570 | bal.acc 0.655
- random_forest: AUC 0.727±0.035 | acc 0.671 | F1(pos) 0.584 | bal.acc 0.669
- majority_class: AUC 0.500±0.000 | acc 0.651 | F1(pos) 0.000 | bal.acc 0.500
- RF-LR AUC diff -0.0074, corrected t=-0.52, p=0.606
- held-out logistic_regression: AUC 0.707 [0.626,0.785] acc 0.610 (n=154)
- held-out random_forest: AUC 0.745 [0.655,0.822] acc 0.669 (n=154)

## B_age_bmi_pedigree - repeated 5-fold CV x20 (100 folds), mean±SD
- logistic_regression: AUC 0.748±0.036 | acc 0.687 | F1(pos) 0.608 | bal.acc 0.689
- random_forest: AUC 0.757±0.038 | acc 0.691 | F1(pos) 0.589 | bal.acc 0.678
- majority_class: AUC 0.500±0.000 | acc 0.651 | F1(pos) 0.000 | bal.acc 0.500
- RF-LR AUC diff +0.0086, corrected t=0.60, p=0.548
- held-out logistic_regression: AUC 0.718 [0.634,0.794] acc 0.656 (n=154)
- held-out random_forest: AUC 0.777 [0.701,0.848] acc 0.708 (n=154)

## C_all_clinical_reference - repeated 5-fold CV x20 (100 folds), mean±SD
- logistic_regression: AUC 0.837±0.027 | acc 0.756 | F1(pos) 0.673 | bal.acc 0.748
- random_forest: AUC 0.838±0.028 | acc 0.764 | F1(pos) 0.676 | bal.acc 0.751
- majority_class: AUC 0.500±0.000 | acc 0.651 | F1(pos) 0.000 | bal.acc 0.500
- RF-LR AUC diff +0.0006, corrected t=0.07, p=0.944
- held-out logistic_regression: AUC 0.813 [0.743,0.877] acc 0.734 (n=154)
- held-out random_forest: AUC 0.821 [0.751,0.884] acc 0.760 (n=154)

Partial app rule (age/BMI points) AUC: 0.644 on 757 rows